import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { q } from '../db.js';
import { auth, signToken, wrap } from '../auth.js';

const router = Router();

const publicUser = (u) => ({ id: u.id, username: u.username, role: u.role, leader_id: u.leader_id });

// Sign in
router.post('/login', wrap(async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const [user] = await q('SELECT * FROM users WHERE username = ?', [username]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Wrong username or password.' });
  }
  if (!user.is_active) {
    return res.status(403).json({ error: 'Your account is waiting for admin approval.' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
}));

// Team leader sign-up. An admin has to approve the account before it can be used.
router.post('/join', wrap(async (req, res) => {
  const emp = String(req.body.employee_number || '').trim();
  const pass = String(req.body.password || '');
  if (!/^\d{6}$/.test(emp)) return res.status(400).json({ error: 'Employee number must be exactly 6 digits.' });
  if (pass.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const [leader] = await q('SELECT id FROM leaders WHERE employee_number = ? AND is_active = 1', [emp]);
  if (!leader) {
    return res.status(400).json({ error: 'This employee number is not registered as a team leader. Please ask your supervisor.' });
  }
  const [exists] = await q('SELECT id FROM users WHERE username = ?', [emp]);
  if (exists) return res.status(400).json({ error: 'An account for this employee number already exists. Try signing in.' });

  await q('INSERT INTO users (username, password_hash, role, leader_id, is_active) VALUES (?,?,?,?,0)',
    [emp, bcrypt.hashSync(pass, 10), 'leader', leader.id]);
  res.json({ ok: true });
}));

// Who am I? (used when the page is reloaded)
router.get('/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

export default router;
