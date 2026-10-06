import fs from 'fs';
import path from 'path';
import File from '../models/File.js';
import Room from '../models/Room.js';
import ShareLink from '../models/ShareLink.js';
import { getMembership, hasRole, canAccessFile } from '../services/permissions.js';
import { UPLOAD_DIR } from '../config/paths.js';
import { recordDownload } from '../services/downloads.js';
import { emitToRoom } from '../services/live.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fileDto = (f) => {
  const u = f.uploaderId;
  const populated = u && u._id;
  return {
    id: f._id,
    roomId: f.roomId,
    originalName: f.originalName,
    size: f.size,
    mimeType: f.mimeType,
    restricted: f.accessGrants.length > 0,
    uploader: populated ? { id: u._id, name: u.name, email: u.email } : { id: u },
    createdAt: f.createdAt,
  };
};

export async function uploadFile(req, res, next) {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'No file uploaded (field name must be "file")' });

    const file = await File.create({
      roomId: req.room._id,
      uploaderId: req.user._id,
      originalName: req.file.originalname,
      storageName: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
    emitToRoom(file.roomId, 'file:uploaded', { file: fileDto(file) });
    res.status(201).json({ file: fileDto(file) });
  } catch (err) {
    next(err);
  }
}

export async function listFiles(req, res, next) {
  try {
    const files = await File.find({ roomId: req.room._id })
      .sort({ createdAt: -1 })
      .populate('uploaderId', 'name email');
    const visible = files.filter((f) => canAccessFile(req.membership, f, req.user));
    res.json({ files: visible.map(fileDto) });
  } catch (err) {
    next(err);
  }
}

// loads the file plus the caller's membership; sends the error response itself
async function loadFile(req, res) {
  const file = await File.findById(req.params.fileId);
  if (!file) {
    res.status(404).json({ message: 'File not found' });
    return {};
  }
  const room = await Room.findById(file.roomId);
  const membership = room && getMembership(room, req.user._id);
  if (!membership) {
    res.status(403).json({ message: 'You do not have access to this file' });
    return {};
  }
  return { file, room, membership };
}

export async function downloadFile(req, res, next) {
  try {
    const { file, room, membership } = await loadFile(req, res);
    if (!file) return;
    if (!canAccessFile(membership, file, req.user))
      return res.status(403).json({ message: 'You do not have access to this file' });

    const fullPath = path.join(UPLOAD_DIR, file.storageName);
    if (!fs.existsSync(fullPath))
      return res.status(404).json({ message: 'File is missing from storage' });

    res.on('finish', () => recordDownload({ file, room, user: req.user, req, source: 'room' }));
    res.download(fullPath, file.originalName);
  } catch (err) {
    next(err);
  }
}

export async function deleteFile(req, res, next) {
  try {
    const { file, membership } = await loadFile(req, res);
    if (!file) return;

    const isUploader = String(file.uploaderId) === String(req.user._id);
    if (!isUploader && !hasRole(membership, 'admin'))
      return res.status(403).json({ message: 'Only the uploader or an admin can delete this file' });

    await fs.promises.unlink(path.join(UPLOAD_DIR, file.storageName)).catch(() => {});
    await ShareLink.deleteMany({ fileId: file._id });
    await file.deleteOne();
    emitToRoom(file.roomId, 'file:deleted', { fileId: file._id });
    res.json({ message: 'File deleted' });
  } catch (err) {
    next(err);
  }
}

export async function listAccess(req, res, next) {
  try {
    const { file, membership } = await loadFile(req, res);
    if (!file) return;
    if (!hasRole(membership, 'admin'))
      return res.status(403).json({ message: 'Requires admin role or higher' });
    res.json({ accessGrants: file.accessGrants });
  } catch (err) {
    next(err);
  }
}

export async function grantAccess(req, res, next) {
  try {
    const { file, room, membership } = await loadFile(req, res);
    if (!file) return;
    if (!hasRole(membership, 'admin'))
      return res.status(403).json({ message: 'Requires admin role or higher' });

    const email = (req.body.email || '').trim().toLowerCase();
    const role = req.body.role || 'viewer';
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Valid email is required' });
    if (!['viewer', 'editor'].includes(role))
      return res.status(400).json({ message: 'Role must be viewer or editor' });
    if (!room.members.some((m) => m.email === email))
      return res
        .status(400)
        .json({ message: 'That email is not a member of this room. Invite them to the room first.' });

    const existing = file.accessGrants.find((g) => g.email === email);
    if (existing) existing.role = role;
    else file.accessGrants.push({ email, role, grantedBy: req.user._id });

    await file.save();
    emitToRoom(file.roomId, 'file:access-changed', {
      fileId: file._id, restricted: file.accessGrants.length > 0,
    });
    res.json({ accessGrants: file.accessGrants });
  } catch (err) {
    next(err);
  }
}

export async function revokeAccess(req, res, next) {
  try {
    const { file, membership } = await loadFile(req, res);
    if (!file) return;
    if (!hasRole(membership, 'admin'))
      return res.status(403).json({ message: 'Requires admin role or higher' });

    const email = req.params.email.trim().toLowerCase();
    if (!file.accessGrants.some((g) => g.email === email))
      return res.status(404).json({ message: 'No access grant for that email' });

    file.accessGrants = file.accessGrants.filter((g) => g.email !== email);
    await file.save();
    emitToRoom(file.roomId, 'file:access-changed', {
      fileId: file._id, restricted: file.accessGrants.length > 0,
    });
    res.json({ accessGrants: file.accessGrants });
  } catch (err) {
    next(err);
  }
}