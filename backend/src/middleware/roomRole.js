import Room from '../models/Room.js';
import { getMembership, hasRole } from '../services/permissions.js';

export default function roomRole(minRole = 'viewer') {
  return async (req, res, next) => {
    try {
      const room = await Room.findById(req.params.roomId);
      if (!room) return res.status(404).json({ message: 'Room not found' });

      const membership = getMembership(room, req.user._id);
      if (!membership)
        return res.status(403).json({ message: 'You are not a member of this room' });
      if (!hasRole(membership, minRole))
        return res.status(403).json({ message: `Requires ${minRole} role or higher` });

      req.room = room;
      req.membership = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
}