import fs from 'fs';
import path from 'path';
import Room from '../models/Room.js';
import Invite from '../models/Invite.js';
import File from '../models/File.js';
import { getMembership, hasRole } from '../services/permissions.js';
import { UPLOAD_DIR } from '../config/paths.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ASSIGNABLE = ['admin', 'editor', 'viewer'];

const roomDto = (room, userId) => ({
  id: room._id,
  name: room.name,
  ownerId: room.ownerId,
  members: room.members.map((m) => ({ userId: m.userId, email: m.email, role: m.role })),
  myRole: userId ? getMembership(room, userId)?.role : undefined,
  createdAt: room.createdAt,
});

const inviteDto = (i) => ({
  id: i._id,
  roomId: i.roomId,
  email: i.email,
  role: i.role,
  status: i.status,
  invitedBy: i.invitedBy,
  createdAt: i.createdAt,
});

export async function createRoom(req, res, next) {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Room name is required' });

    const room = await Room.create({
      name,
      ownerId: req.user._id,
      members: [{ userId: req.user._id, email: req.user.email, role: 'owner' }],
    });
    res.status(201).json({ room: roomDto(room, req.user._id) });
  } catch (err) {
    next(err);
  }
}

export async function listRooms(req, res, next) {
  try {
    const rooms = await Room.find({ 'members.userId': req.user._id }).sort({ updatedAt: -1 });
    res.json({ rooms: rooms.map((r) => roomDto(r, req.user._id)) });
  } catch (err) {
    next(err);
  }
}

export function getRoom(req, res) {
  res.json({ room: roomDto(req.room, req.user._id) });
}

export async function updateRoom(req, res, next) {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Room name is required' });
    req.room.name = name;
    await req.room.save();
    res.json({ room: roomDto(req.room, req.user._id) });
  } catch (err) {
    next(err);
  }
}

export async function deleteRoom(req, res, next) {
  try {
    const files = await File.find({ roomId: req.room._id });
    await Promise.all(
      files.map((f) => fs.promises.unlink(path.join(UPLOAD_DIR, f.storageName)).catch(() => {}))
    );
    await File.deleteMany({ roomId: req.room._id });
    await Invite.deleteMany({ roomId: req.room._id });
    await req.room.deleteOne();
    res.json({ message: 'Room deleted' });
  } catch (err) {
    next(err);
  }
}

import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from '../sockets/index.js';

export async function inviteMember(req, res, next) {
  try {
    const { email, role } = req.body;
    if (!email || !EMAIL_RE.test(email.trim()))
      return res.status(400).json({ message: 'Valid email is required' });
    if (!ASSIGNABLE.includes(role))
      return res.status(400).json({ message: 'Invalid role (admin, editor or viewer)' });
    if (role === 'admin' && req.membership.role !== 'owner')
      return res.status(403).json({ message: 'Only the owner can invite admins' });

    const normalized = email.trim().toLowerCase();
    if (req.room.members.some((m) => m.email === normalized))
      return res.status(409).json({ message: 'User is already a member' });
    if (await Invite.findOne({ roomId: req.room._id, email: normalized, status: 'pending' }))
      return res.status(409).json({ message: 'An invite is already pending for this email' });

    const invite = await Invite.create({
      roomId: req.room._id,
      email: normalized,
      role,
      invitedBy: req.user._id,
    });

    // Send real-time socket notification to recipient if registered
    const targetUser = await User.findOne({ email: normalized });
    if (targetUser) {
      const notif = await Notification.create({
        userId: targetUser._id,
        type: 'invite',
        message: `${req.user.name || req.user.email} invited you to join "${req.room.name}" as ${role}`,
        meta: { roomId: req.room._id, inviteId: invite._id, role },
      });
      getIO()?.to(`user:${targetUser._id}`).emit('notification', {
        id: notif._id,
        type: 'invite',
        message: notif.message,
        meta: notif.meta,
        createdAt: notif.createdAt,
      });
      getIO()?.to(`user:${targetUser._id}`).emit('invite:received', {
        id: invite._id,
        room: { id: req.room._id, name: req.room.name },
        role: invite.role,
        invitedBy: { name: req.user.name, email: req.user.email },
        createdAt: invite.createdAt,
      });
    }

    res.status(201).json({ invite: inviteDto(invite) });
  } catch (err) {
    next(err);
  }
}

export async function listRoomInvites(req, res, next) {
  try {
    const invites = await Invite.find({ roomId: req.room._id, status: 'pending' });
    res.json({ invites: invites.map(inviteDto) });
  } catch (err) {
    next(err);
  }
}

export async function myInvites(req, res, next) {
  try {
    const userEmail = (req.user.email || '').toLowerCase();
    const invites = await Invite.find({ email: userEmail, status: 'pending' })
      .populate('roomId', 'name')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      invites: invites
        .filter((i) => i.roomId)
        .map((i) => ({
          id: i._id,
          room: { id: i.roomId._id, name: i.roomId.name },
          role: i.role,
          invitedBy: { name: i.invitedBy?.name || 'Workspace Admin', email: i.invitedBy?.email },
          createdAt: i.createdAt,
        })),
    });
  } catch (err) {
    next(err);
  }
}

async function loadMyInvite(req, res) {
  const invite = await Invite.findById(req.params.inviteId);
  if (!invite) {
    res.status(404).json({ message: 'Invite not found' });
    return null;
  }
  if ((invite.email || '').toLowerCase() !== (req.user.email || '').toLowerCase()) {
    res.status(403).json({ message: 'This invite is not for you' });
    return null;
  }
  if (invite.status !== 'pending') {
    res.status(409).json({ message: `Invite already ${invite.status}` });
    return null;
  }
  return invite;
}

export async function acceptInvite(req, res, next) {
  try {
    const invite = await loadMyInvite(req, res);
    if (!invite) return;

    const room = await Room.findById(invite.roomId);
    if (!room) return res.status(404).json({ message: 'Room no longer exists' });

    if (!getMembership(room, req.user._id)) {
      room.members.push({ userId: req.user._id, email: req.user.email, role: invite.role });
      await room.save();
    }
    invite.status = 'accepted';
    await invite.save();
    res.json({ room: roomDto(room, req.user._id) });
  } catch (err) {
    next(err);
  }
}

export async function declineInvite(req, res, next) {
  try {
    const invite = await loadMyInvite(req, res);
    if (!invite) return;
    invite.status = 'declined';
    await invite.save();
    res.json({ message: 'Invite declined' });
  } catch (err) {
    next(err);
  }
}

export async function changeRole(req, res, next) {
  try {
    const { role } = req.body;
    const { userId } = req.params;

    if (!ASSIGNABLE.includes(role))
      return res.status(400).json({ message: 'Invalid role (admin, editor or viewer)' });

    const target = getMembership(req.room, userId);
    if (!target) return res.status(404).json({ message: 'Member not found' });
    if (target.role === 'owner')
      return res.status(400).json({ message: "Cannot change the owner's role" });
    if (String(userId) === String(req.user._id))
      return res.status(400).json({ message: 'You cannot change your own role' });
    if ((role === 'admin' || target.role === 'admin') && req.membership.role !== 'owner')
      return res.status(403).json({ message: 'Only the owner can manage admins' });

    target.role = role;
    await req.room.save();
    res.json({ room: roomDto(req.room, req.user._id) });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req, res, next) {
  try {
    const { userId } = req.params;
    const target = getMembership(req.room, userId);
    if (!target) return res.status(404).json({ message: 'Member not found' });
    if (target.role === 'owner')
      return res
        .status(400)
        .json({ message: 'The owner cannot leave or be removed. Delete the room instead.' });

    const isSelf = String(userId) === String(req.user._id);
    if (!isSelf) {
      if (!hasRole(req.membership, 'admin'))
        return res.status(403).json({ message: 'Requires admin role or higher' });
      if (target.role === 'admin' && req.membership.role !== 'owner')
        return res.status(403).json({ message: 'Only the owner can remove admins' });
    }

    req.room.members = req.room.members.filter((m) => String(m.userId) !== String(userId));
    await req.room.save();
    res.json({ message: isSelf ? 'You left the room' : 'Member removed' });
  } catch (err) {
    next(err);
  }
}

export async function joinRoomById(req, res, next) {
  try {
    const { roomId } = req.body;
    if (!roomId || !String(roomId).trim())
      return res.status(400).json({ message: 'Room ID is required' });

    const room = await Room.findById(String(roomId).trim());
    if (!room)
      return res.status(404).json({ message: 'Room not found. Check the Room ID and try again.' });

    const existing = room.members.find((m) => String(m.userId) === String(req.user._id));
    if (existing) {
      return res.json({ message: 'You are already a member of this room', room: roomDto(room, req.user._id) });
    }

    const invite = await Invite.findOne({
      roomId: room._id,
      email: (req.user.email || '').toLowerCase(),
      status: 'pending',
    });

    const roleToAssign = invite ? invite.role : 'editor';

    room.members.push({
      userId: req.user._id,
      email: (req.user.email || '').toLowerCase(),
      role: roleToAssign,
    });
    await room.save();

    if (invite) {
      invite.status = 'accepted';
      await invite.save();
    }

    getIO()?.to(`room:${room._id}`).emit('room:member-joined', {
      roomId: room._id,
      user: { id: req.user._id, email: req.user.email, name: req.user.name },
      role: roleToAssign,
    });

    res.json({ message: `Successfully joined "${room.name}"!`, room: roomDto(room, req.user._id) });
  } catch (err) {
    next(err);
  }
}