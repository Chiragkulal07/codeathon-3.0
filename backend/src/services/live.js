import { getIO } from '../sockets/index.js';

// push an event to everyone currently connected to a room
export const emitToRoom = (roomId, event, payload) =>
  getIO()?.to(`room:${roomId}`).emit(event, payload);