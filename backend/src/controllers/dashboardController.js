import Room from '../models/Room.js';
import File from '../models/File.js';
import ShareLink from '../models/ShareLink.js';
import DownloadLog from '../models/DownloadLog.js';
import Notification from '../models/Notification.js';
import { getMembership, hasRole, canAccessFile } from '../services/permissions.js';
import { linkStatus } from '../services/linkStatus.js';

export async function getDashboard(req, res, next) {
  try {
    const user = req.user;
    const days = Math.min(Math.max(parseInt(req.query.days) || 14, 1), 90);

    const rooms = await Room.find({ 'members.userId': user._id });
    const roomById = new Map(rooms.map((r) => [String(r._id), r]));

    const allFiles = await File.find({ roomId: { $in: rooms.map((r) => r._id) } }).select(
      'roomId uploaderId originalName size accessGrants createdAt'
    );

    // visible = files this user may open; managed = files whose stats they may see
    const visible = [];
    const managed = [];
    for (const f of allFiles) {
      const membership = getMembership(roomById.get(String(f.roomId)), user._id);
      if (!canAccessFile(membership, f, user)) continue;
      visible.push(f);
      if (String(f.uploaderId) === String(user._id) || hasRole(membership, 'admin')) managed.push(f);
    }
    const managedIds = managed.map((f) => f._id);
    const nameById = new Map(managed.map((f) => [String(f._id), f.originalName]));

    const links = await ShareLink.find({ createdBy: user._id });
    const linkCounts = { active: 0, expired: 0, revoked: 0 };
    for (const l of links) {
      const s = linkStatus(l);
      linkCounts[s] = (linkCounts[s] || 0) + 1;
    }

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));
    const match = { fileId: { $in: managedIds }, at: { $gte: since } };

    const [perDay, top, recent, unread] = await Promise.all([
      DownloadLog.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$at' } }, count: { $sum: 1 } } },
      ]),
      DownloadLog.aggregate([
        { $match: match },
        { $group: { _id: '$fileId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      DownloadLog.find({ fileId: { $in: managedIds } }).sort({ at: -1 }).limit(10),
      Notification.countDocuments({ userId: user._id, read: false }),
    ]);

    // fill days with no downloads so charts get a continuous series
    const counts = new Map(perDay.map((d) => [d._id, d.count]));
    const series = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const date = d.toISOString().slice(0, 10);
      series.push({ date, count: counts.get(date) || 0 });
    }

    res.json({
      totals: {
        rooms: rooms.length,
        files: visible.length,
        storageBytes: visible.reduce((sum, f) => sum + f.size, 0),
        myStorageBytes: visible
          .filter((f) => String(f.uploaderId) === String(user._id))
          .reduce((sum, f) => sum + f.size, 0),
        unreadNotifications: unread,
      },
      links: { total: links.length, ...linkCounts },
      downloads: {
        days,
        total: series.reduce((sum, d) => sum + d.count, 0),
        perDay: series,
        topFiles: top.map((t) => ({
          fileId: t._id, name: nameById.get(String(t._id)) ?? null, count: t.count,
        })),
      },
      recentActivity: recent.map((l) => ({
        id: l._id,
        file: nameById.get(String(l.fileId)) ?? null,
        email: l.email,
        source: l.source,
        at: l.at,
      })),
    });
  } catch (err) {
    next(err);
  }
}