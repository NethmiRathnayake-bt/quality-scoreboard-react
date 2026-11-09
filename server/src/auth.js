// Login tokens (JWT) and role checks.
import jwt from 'jsonwebtoken';
import { q } from './db.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(user) {
  return jwt.sign({ id: user.id }, SECRET, { expiresIn: '12h' });
}

// Every protected route runs this first. It reads the token, then loads the user from the
// database, so a disabled account or a changed role takes effect immediately.
export async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Please sign in.' });
    const { id } = jwt.verify(token, SECRET);
    const [user] = await q('SELECT id, username, role, leader_id, is_active FROM users WHERE id = ?', [id]);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Please sign in.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in.' });
  }
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Access denied.' });

export const staff = requireRole('admin', 'auditor');
export const adminOnly = requireRole('admin');
export const leaderOnly = requireRole('leader');

// Lets route functions be async without try/catch everywhere.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
