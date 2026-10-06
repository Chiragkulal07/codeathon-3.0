import Notification from '../models/Notification.js';
import DownloadLog from '../models/DownloadLog.js';
import File from '../models/File.js';
import Room from '../models/Room.js';
import { getMembership, hasRole } from '../services/permissions.js';
import { notificationDto } from '../services/notify.js';

export async function listNotifications(req, res, next) {
  try {
    const [items, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ userId: req.user._id, read: false }),
    ]);
    res.json({ notifications: items.map(notificationDto), unreadCount });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req, res, next) {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    res.json({ notification: notificationDto(n) });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req, res, next) {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

export async function fileActivity(req, res, next) {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });

    const room = await Room.findById(file.roomId);
    const membership = room && getMembership(room, req.user._id);
    if (!hasRole(membership, 'admin'))
      return res.status(403).json({ message: 'Requires admin role or higher' });

    const logs = await DownloadLog.find({ fileId: file._id }).sort({ at: -1 }).limit(100);
    res.json({
      logs: logs.map((l) => ({ id: l._id, email: l.email, source: l.source, at: l.at, ip: l.ip })),
    });
  } catch (err) {
    next(err);
  }
}