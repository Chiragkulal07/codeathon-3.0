import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import File from '../models/File.js';
import Room from '../models/Room.js';
import ShareLink from '../models/ShareLink.js';
import { getMembership, hasRole } from '../services/permissions.js';
import { linkStatus } from '../services/linkStatus.js';
import { UPLOAD_DIR } from '../config/paths.js';
import { recordDownload } from '../services/downloads.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const linkDto = (l) => ({
    id: l._id,
    fileId: l.fileId,
    code: l.code,
    path: `/s/${l.code}`,
    status: linkStatus(l),
    expiresAt: l.expiresAt,
    passwordProtected: l.hasPassword,
    maxDownloads: l.maxDownloads,
    downloadCount: l.downloadCount,
    allowedEmails: l.allowedEmails,
    allowEdit: l.allowEdit,
    createdAt: l.createdAt,
});

async function loadFileAsAdmin(req, res) {
    const file = await File.findById(req.params.fileId);
    if (!file) {
        res.status(404).json({ message: 'File not found' });
        return null;
    }
    const room = await Room.findById(file.roomId);
    const membership = room && getMembership(room, req.user._id);
    if (!membership) {
        res.status(403).json({ message: 'You do not have access to this file' });
        return null;
    }
    if (!hasRole(membership, 'admin')) {
        res.status(403).json({ message: 'Requires admin role or higher' });
        return null;
    }
    return file;
}

export async function createLink(req, res, next) {
    try {
        const file = await loadFileAsAdmin(req, res);
        if (!file) return;

        const { expiresInMinutes, password, maxDownloads, allowedEmails, allowEdit } = req.body;

        const mins = Number(expiresInMinutes);
        if (!mins || mins <= 0 || mins > 43200)
            return res.status(400).json({ message: 'expiresInMinutes must be above 0 and at most 43200 (30 days)' });
        if (password && String(password).length < 4)
            return res.status(400).json({ message: 'Password must be at least 4 characters' });
        if (maxDownloads != null && (!Number.isInteger(maxDownloads) || maxDownloads < 1))
            return res.status(400).json({ message: 'maxDownloads must be a whole number of 1 or more' });

        let emails = [];
        if (allowedEmails != null) {
            if (!Array.isArray(allowedEmails))
                return res.status(400).json({ message: 'allowedEmails must be a list' });
            emails = allowedEmails.map((e) => String(e).trim().toLowerCase());
            if (emails.some((e) => !EMAIL_RE.test(e)))
                return res.status(400).json({ message: 'allowedEmails contains an invalid email' });
        }

        const link = await ShareLink.create({
            fileId: file._id,
            roomId: file.roomId,
            createdBy: req.user._id,
            code: crypto.randomBytes(9).toString('base64url'),
            expiresAt: new Date(Date.now() + mins * 60 * 1000),
            hasPassword: !!password,
            passwordHash: password ? await bcrypt.hash(String(password), 10) : undefined,
            maxDownloads: maxDownloads ?? null,
            allowedEmails: emails,
            allowEdit: !!allowEdit,
        });
        res.status(201).json({ link: linkDto(link) });
    } catch (err) {
        next(err);
    }
}

export async function listFileLinks(req, res, next) {
    try {
        const file = await loadFileAsAdmin(req, res);
        if (!file) return;
        const links = await ShareLink.find({ fileId: file._id }).sort({ createdAt: -1 });
        res.json({ links: links.map(linkDto) });
    } catch (err) {
        next(err);
    }
}

export async function revokeLink(req, res, next) {
    try {
        const link = await ShareLink.findById(req.params.linkId);
        if (!link) return res.status(404).json({ message: 'Link not found' });

        const room = await Room.findById(link.roomId);
        const membership = room && getMembership(room, req.user._id);
        const isCreator = String(link.createdBy) === String(req.user._id);
        if (!membership || (!isCreator && !hasRole(membership, 'admin')))
            return res.status(403).json({ message: 'Only the creator or an admin can revoke this link' });

        link.status = 'revoked';
        await link.save();
        res.json({ link: linkDto(link) });
    } catch (err) {
        next(err);
    }
}

// ---------- public side (/api/s/:code) ----------

async function loadLink(req, res) {
    const link = await ShareLink.findOne({ code: req.params.code }).select('+passwordHash');
    if (!link) {
        res.status(404).json({ message: 'Link not found' });
        return null;
    }
    const status = linkStatus(link);
    if (status !== 'active') {
        res.status(410).json({ message: `This link is ${status}`, status });
        return null;
    }
    return link;
}

export async function resolveLink(req, res, next) {
    try {
        const link = await loadLink(req, res);
        if (!link) return;
        const file = await File.findById(link.fileId);
        if (!file) return res.status(404).json({ message: 'File no longer exists' });

        // Check if caller is allowed (allowedEmails restriction)
        let callerAllowed = true;
        if (link.allowedEmails.length > 0) {
            if (!req.user) callerAllowed = false;
            else callerAllowed = link.allowedEmails.includes(req.user.email);
        }

        res.json({
            file: {
                name: file.originalName,
                size: file.size,
                mimeType: file.mimeType,
            },
            status: 'active',
            expiresAt: link.expiresAt,
            requiresPassword: link.hasPassword,
            requiresLogin: link.allowedEmails.length > 0,
            downloadsLeft: link.maxDownloads == null ? null : link.maxDownloads - link.downloadCount,
            allowEdit: link.allowEdit,
            callerAllowed,
        });
    } catch (err) {
        next(err);
    }
}

// Returns raw text content of the file for inline preview/editing via link
export async function readViaLink(req, res, next) {
    try {
        const link = await loadLink(req, res);
        if (!link) return;

        if (link.allowedEmails.length > 0) {
            if (!req.user) return res.status(401).json({ message: 'Login required for this link' });
            if (!link.allowedEmails.includes(req.user.email))
                return res.status(403).json({ message: 'This link was not shared with you' });
        }

        if (link.passwordHash) {
            const pw = req.body?.password || req.headers['x-link-password'];
            if (!pw) return res.status(401).json({ message: 'Password required' });
            if (!(await bcrypt.compare(String(pw), link.passwordHash)))
                return res.status(401).json({ message: 'Wrong password' });
        }

        const file = await File.findById(link.fileId);
        if (!file) return res.status(404).json({ message: 'File no longer exists' });
        const fullPath = path.join(UPLOAD_DIR, file.storageName);
        if (!fs.existsSync(fullPath))
            return res.status(404).json({ message: 'File is missing from storage' });

        const content = await fs.promises.readFile(fullPath, 'utf8');
        res.json({
            content,
            allowEdit: link.allowEdit,
            file: { name: file.originalName, mimeType: file.mimeType, id: file._id },
        });
    } catch (err) {
        next(err);
    }
}

export async function saveViaLink(req, res, next) {
    try {
        const link = await loadLink(req, res);
        if (!link) return;

        if (!link.allowEdit) {
            return res.status(403).json({ message: 'Editing is not allowed on this share link' });
        }

        if (link.allowedEmails.length > 0) {
            if (!req.user) return res.status(401).json({ message: 'Login required for this link' });
            if (!link.allowedEmails.includes(req.user.email))
                return res.status(403).json({ message: 'This link was not shared with you' });
        }

        if (link.passwordHash) {
            const pw = req.body?.password || req.headers['x-link-password'];
            if (!pw) return res.status(401).json({ message: 'Password required' });
            if (!(await bcrypt.compare(String(pw), link.passwordHash)))
                return res.status(401).json({ message: 'Wrong password' });
        }

        const file = await File.findById(link.fileId);
        if (!file) return res.status(404).json({ message: 'File no longer exists' });
        const fullPath = path.join(UPLOAD_DIR, file.storageName);

        const newContent = req.body.content ?? '';
        await fs.promises.writeFile(fullPath, newContent, 'utf8');
        file.size = Buffer.byteLength(newContent, 'utf8');
        await file.save();

        res.json({ message: 'File saved successfully', size: file.size });
    } catch (err) {
        next(err);
    }
}

export async function downloadViaLink(req, res, next) {
    try {
        const link = await loadLink(req, res);
        if (!link) return;

        if (link.allowedEmails.length) {
            if (!req.user) return res.status(401).json({ message: 'Login required for this link' });
            if (!link.allowedEmails.includes(req.user.email))
                return res.status(403).json({ message: 'This link was not shared with you' });
        }

        if (link.passwordHash) {
            const pw = req.body?.password || req.headers['x-link-password'];
            if (!pw) return res.status(401).json({ message: 'Password required' });
            if (!(await bcrypt.compare(String(pw), link.passwordHash)))
                return res.status(401).json({ message: 'Wrong password' });
        }

        const file = await File.findById(link.fileId);
        if (!file) return res.status(404).json({ message: 'File no longer exists' });
        const fullPath = path.join(UPLOAD_DIR, file.storageName);
        if (!fs.existsSync(fullPath))
            return res.status(404).json({ message: 'File is missing from storage' });

        // atomic check-and-increment so the download limit can't be beaten by parallel requests
        const updated = await ShareLink.findOneAndUpdate(
            {
                _id: link._id,
                status: 'active',
                expiresAt: { $gt: new Date() },
                $or: [{ maxDownloads: null }, { $expr: { $lt: ['$downloadCount', '$maxDownloads'] } }],
            },
            { $inc: { downloadCount: 1 } }
        );
        if (!updated)
            return res.status(410).json({ message: 'This link has expired or reached its download limit' });

        res.on('finish', () => recordDownload({ file, link, user: req.user, req, source: 'link' }));
        res.download(fullPath, file.originalName);
    } catch (err) {
        next(err);
    }
}