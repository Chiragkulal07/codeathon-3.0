import ShareLink from '../models/ShareLink.js';
import File from '../models/File.js';
import { linkStatus } from '../services/linkStatus.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// turns a computed status into a database filter
function statusFilter(status, now) {
  if (status === 'revoked') return { status: 'revoked' };
  if (status === 'expired')
    return {
      status: 'active',
      $or: [
        { expiresAt: { $lte: now } },
        { $expr: { $and: [{ $ne: ['$maxDownloads', null] }, { $gte: ['$downloadCount', '$maxDownloads'] }] } },
      ],
    };
  return {
    status: 'active',
    expiresAt: { $gt: now },
    $or: [{ maxDownloads: null }, { $expr: { $lt: ['$downloadCount', '$maxDownloads'] } }],
  };
}

export async function listMyLinks(req, res, next) {
  try {
    const { q, status, roomId, from, to } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

    const filter = { createdBy: req.user._id };

    if (status) {
      if (!['active', 'expired', 'revoked'].includes(status))
        return res.status(400).json({ message: 'status must be active, expired or revoked' });
      Object.assign(filter, statusFilter(status, new Date()));
    }
    if (roomId) filter.roomId = roomId;

    if (from || to) {
      filter.createdAt = {};
      for (const [key, op] of [['from', '$gte'], ['to', '$lte']]) {
        if (!req.query[key]) continue;
        const d = new Date(req.query[key]);
        if (isNaN(d)) return res.status(400).json({ message: `Invalid ${key} date` });
        filter.createdAt[op] = d;
      }
    }

    if (q) {
      const ids = await File.find({ originalName: new RegExp(escapeRegex(String(q).trim()), 'i') }).distinct('_id');
      filter.fileId = { $in: ids };
    }

    const total = await ShareLink.countDocuments(filter);
    const links = await ShareLink.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('fileId', 'originalName size')
      .populate('roomId', 'name');

    res.json({
      links: links.map((l) => ({
        id: l._id,
        code: l.code,
        path: `/s/${l.code}`,
        status: linkStatus(l),
        expiresAt: l.expiresAt,
        file: l.fileId ? { id: l.fileId._id, name: l.fileId.originalName, size: l.fileId.size } : null,
        room: l.roomId ? { id: l.roomId._id, name: l.roomId.name } : null,
        downloadCount: l.downloadCount,
        maxDownloads: l.maxDownloads,
        passwordProtected: l.hasPassword,
        allowedEmails: l.allowedEmails,
        createdAt: l.createdAt,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
}