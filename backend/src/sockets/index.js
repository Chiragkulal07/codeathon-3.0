import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Room from '../models/Room.js';
import { registerCollab } from './collab.js';

let io = null;
export const getIO = () => io;

export function initSockets(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
    maxHttpBufferSize: 5e6, // room for 1 MB of text plus overhead
  });

  // every connection must send a valid access token: io(url, { auth: { token } })
  io.use(async (socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      if (payload.type !== 'access') throw new Error('bad token');
      const user = await User.findById(payload.id);
      if (!user) throw new Error('no user');
      socket.userId = payload.id;
      socket.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    socket.join(`user:${socket.userId}`); // personal channel for notifications
    registerCollab(io, socket); // register handlers first so early events aren't lost

    try {
      // one channel per room the user belongs to, for live updates
      const rooms = await Room.find({ 'members.userId': socket.userId }).select('_id');
      rooms.forEach((r) => socket.join(`room:${r._id}`));
    } catch (err) {
      console.error('room join on connect failed:', err.message);
    }
  });

  return io;
}