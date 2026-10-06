import Notification from '../models/Notification.js';
import { getIO } from '../sockets/index.js';

export const notificationDto = (n) => ({
  id: n._id,
  type: n.type,
  message: n.message,
  meta: n.meta,
  read: n.read,
  createdAt: n.createdAt,
});

export async function notifyUser(userId, { type, fileName, email, meta }) {
  // same person downloading the same file within a minute collapses into one notification
  const since = new Date(Date.now() - 60 * 1000);
  let n = await Notification.findOne({
    userId, type, read: false,
    'meta.fileId': meta.fileId, 'meta.email': email,
    createdAt: { $gte: since },
  });

  if (n) {
    n.meta.count = (n.meta.count || 1) + 1;
    n.message = `${email} downloaded "${fileName}" (${n.meta.count} times)`;
    n.markModified('meta');
    await n.save();
  } else {
    n = await Notification.create({
      userId, type,
      message: `${email} downloaded "${fileName}"`,
      meta: { ...meta, email, count: 1 },
    });
  }

  getIO()?.to(`user:${userId}`).emit('notification', notificationDto(n));
}