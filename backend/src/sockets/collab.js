import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import File from '../models/File.js';
import Room from '../models/Room.js';
import { getMembership, hasRole, canAccessFile } from '../services/permissions.js';
import { UPLOAD_DIR } from '../config/paths.js';

const MAX_BYTES = 1024 * 1024; // 1 MB edit limit
const TEXT_EXT = new Set([
  '.txt', '.md', '.json', '.csv', '.js', '.html', '.css', '.xml', '.yml', '.yaml', '.log',
]);

const isTextFile = (file) =>
  file.mimeType?.startsWith('text/') ||
  file.mimeType === 'application/json' ||
  TEXT_EXT.has(path.extname(file.originalName).toLowerCase());

// admins always edit; a per-file grant decides for granted people; otherwise room editors+
function canEditFile(membership, file, user) {
  if (!canAccessFile(membership, file, user)) return false;
  if (hasRole(membership, 'admin')) return true;
  const grant = file.accessGrants.find((g) => g.email === user.email);
  if (grant) return grant.role === 'editor';
  return hasRole(membership, 'editor');
}

async function loadForUser(fileId, user) {
  if (!mongoose.isValidObjectId(fileId)) return { error: 'File not found' };
  const file = await File.findById(fileId);
  if (!file) return { error: 'File not found' };
  const room = await Room.findById(file.roomId);
  const membership = room && getMembership(room, user._id);
  if (!membership || !canAccessFile(membership, file, user))
    return { error: 'You do not have access to this file' };
  return { file, room, membership };
}

// ---- presence: fileId -> Map(socketId -> viewer) ----
const presence = new Map();

function viewersOf(fileId) {
  const byUser = new Map(); // same person in two tabs counts once
  for (const v of presence.get(fileId)?.values() ?? []) byUser.set(String(v.userId), v);
  return [...byUser.values()];
}

function broadcastPresence(io, fileId) {
  io.to(`file:${fileId}`).emit('presence:update', { fileId, viewers: viewersOf(fileId) });
}

// ---- one edit at a time per file, so disk writes never interleave ----
const locks = new Map();
function withLock(key, fn) {
  const prev = locks.get(key) ?? Promise.resolve();
  const run = prev.then(fn);
  const tail = run.catch(() => {});
  locks.set(key, tail);
  tail.then(() => {
    if (locks.get(key) === tail) locks.delete(key);
  });
  return run;
}

export function registerCollab(io, socket) {
  const user = socket.user;

  const leave = (key) => {
    socket.leave(`file:${key}`);
    const m = presence.get(key);
    if (!m) return;
    m.delete(socket.id);
    if (!m.size) presence.delete(key);
    broadcastPresence(io, key);
  };

  // join a room channel after being added to a room while already connected
  socket.on('room:join', async ({ roomId } = {}, ack = () => {}) => {
    try {
      const room = mongoose.isValidObjectId(roomId) && (await Room.findById(roomId));
      if (!room || !getMembership(room, user._id))
        return ack({ ok: false, error: 'Not a member of this room' });
      socket.join(`room:${room._id}`);
      ack({ ok: true });
    } catch {
      ack({ ok: false, error: 'Server error' });
    }
  });

  // open a file: returns content, version, permissions and who else is here
  socket.on('file:join', async ({ fileId } = {}, ack = () => {}) => {
    try {
      const { file, membership, error } = await loadForUser(fileId, user);
      if (error) return ack({ ok: false, error });
      if (!isTextFile(file))
        return ack({ ok: false, error: 'Only text files can be opened for editing' });
      if (file.size > MAX_BYTES)
        return ack({ ok: false, error: 'File is too large to edit (1 MB max)' });

      const content = await fs.promises.readFile(path.join(UPLOAD_DIR, file.storageName), 'utf8');
      const canEdit = canEditFile(membership, file, user);
      const key = String(file._id);

      socket.join(`file:${key}`);
      if (!presence.has(key)) presence.set(key, new Map());
      presence.get(key).set(socket.id, {
        userId: user._id, name: user.name, email: user.email, canEdit,
      });
      broadcastPresence(io, key);

      ack({ ok: true, content, version: file.version, canEdit, viewers: viewersOf(key) });
    } catch (err) {
      ack({
        ok: false,
        error: err.code === 'ENOENT' ? 'File is missing from storage' : 'Server error',
      });
    }
  });

  socket.on('file:leave', ({ fileId } = {}) => leave(String(fileId)));

  // save an edit. If baseVersion is stale the edit still wins (last write wins)
  // but the ack says conflict:true so the client can warn the user
  socket.on('file:edit', async ({ fileId, baseVersion, content } = {}, ack = () => {}) => {
    const key = String(fileId);
    if (!socket.rooms.has(`file:${key}`))
      return ack({ ok: false, error: 'Open the file first (file:join)' });
    if (typeof content !== 'string' || Buffer.byteLength(content) > MAX_BYTES)
      return ack({ ok: false, error: 'Content must be text up to 1 MB' });

    try {
      const result = await withLock(key, async () => {
        const { file, membership, error } = await loadForUser(key, user);
        if (error) return { ok: false, error };
        if (!canEditFile(membership, file, user))
          return { ok: false, error: 'You do not have edit permission' };

        const conflict = Number(baseVersion) !== file.version;
        await fs.promises.writeFile(path.join(UPLOAD_DIR, file.storageName), content, 'utf8');
        file.size = Buffer.byteLength(content);
        file.version += 1;
        await file.save();
        return { ok: true, version: file.version, conflict };
      });

      if (result.ok) {
        socket.to(`file:${key}`).emit('file:updated', {
          fileId: key,
          content,
          version: result.version,
          by: { id: user._id, name: user.name, email: user.email },
        });
      }
      ack(result);
    } catch (err) {
      console.error('file:edit failed:', err.message);
      ack({ ok: false, error: 'Server error' });
    }
  });

  socket.on('disconnecting', () => {
    for (const r of [...socket.rooms]) if (r.startsWith('file:')) leave(r.slice(5));
  });
}