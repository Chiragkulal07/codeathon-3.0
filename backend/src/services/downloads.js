import DownloadLog from '../models/DownloadLog.js';
import { notifyUser } from './notify.js';

// called after a download finished; never throws, so a logging problem can't crash the server
export async function recordDownload({ file, room, link, user, req, source }) {
  try {
    const email = user?.email || 'anonymous';

    await DownloadLog.create({
      fileId: file._id,
      roomId: file.roomId,
      linkId: link?._id,
      userId: user?._id,
      email,
      source,
      ip: req.ip,
    });

    // who to tell: the admin who granted this person access, or whoever created the link
    let notifyId;
    if (source === 'link') {
      notifyId = link.createdBy;
    } else {
      const grant = file.accessGrants.find((g) => g.email === email);
      notifyId = grant?.grantedBy ?? room.ownerId;
    }
    if (!notifyId || (user && String(notifyId) === String(user._id))) return;

    await notifyUser(notifyId, {
      type: 'FILE_DOWNLOADED',
      fileName: file.originalName,
      email,
      meta: { fileId: file._id, roomId: file.roomId, linkId: link?._id },
    });
  } catch (err) {
    console.error('recordDownload failed:', err.message);
  }
}