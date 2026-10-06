import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// attaches req.user when a valid token is sent, otherwise carries on anonymously
export default async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      if (payload.type === 'access') req.user = await User.findById(payload.id);
    }
  } catch {
    /* anonymous */
  }
  next();
}