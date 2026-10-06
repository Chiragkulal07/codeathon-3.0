import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { signAccessToken, signRefreshToken } from '../services/token.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email });

const tokensFor = (user) => ({
  accessToken: signAccessToken(user._id),
  refreshToken: signRefreshToken(user._id),
});

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });
    if (!EMAIL_RE.test(email.trim()))
      return res.status(400).json({ message: 'Invalid email address' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const normalized = email.trim().toLowerCase();
    if (await User.findOne({ email: normalized }))
      return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: normalized, passwordHash });

    res.status(201).json({ user: publicUser(user), ...tokensFor(user) });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
      '+passwordHash'
    );
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    res.json({ user: publicUser(user), ...tokensFor(user) });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ message: 'Refresh token is required' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      if (payload.type !== 'refresh') throw new Error('Wrong token type');
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'User no longer exists' });

    res.json(tokensFor(user));
  } catch (err) {
    next(err);
  }
}

export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}