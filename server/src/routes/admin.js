// Admin pages: team leaders, work cells, accounts.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { q } from '../db.js';
import { auth, adminOnly, wrap } from '../auth.js';

const router = Router();
router.use(auth, adminOnly);

const bad = (res, msg) => res.status(400).json({ error: msg });

// find a leader by employee number, or create it
async function leaderIdFor(emp) {
  const [row] = await q('SELECT id FROM leaders WHERE employee_number = ?', [emp]);
  if (row) return row.id;
  const r = await q('INSERT INTO leaders (employee_number) VALUES (?)', [emp]);
  return r.insertId;
}

// ---------- team leaders ----------
router.get('/leaders', wrap(async (req, res) =>
  res.json(await q('SELECT id, employee_number, is_active FROM leaders ORDER BY employee_number'))));

router.post('/leaders', wrap(async (req, res) => {
  const emp = String(req.body.employee_number || '').trim();
  if (!/^\d{6}$/.test(emp)) return bad(res, 'Employee number must be exactly 6 digits.');
  const [exists] = await q('SELECT id FROM leaders WHERE employee_number = ?', [emp]);
  if (exists) return bad(res, 'That employee number already exists.');
  await q('INSERT INTO leaders (employee_number) VALUES (?)', [emp]);
  res.json({ ok: true, message: `Leader ${emp} added.` });
}));

router.post('/leaders/:id/toggle', wrap(async (req, res) => {
  await q('UPDATE leaders SET is_active = 1 - is_active WHERE id = ?', [Number(req.params.id)]);
  res.json({ ok: true, message: 'Leader updated.' });
}));

// ---------- work cells ----------
router.get('/cells', wrap(async (req, res) => res.json(await q(
  `SELECT c.id, c.cell_number AS cellNumber, c.is_active, ar.name AS area, ca.name AS category, l.employee_number AS leader
   FROM cells c
   JOIN areas ar ON ar.id = c.area_id
   JOIN categories ca ON ca.id = c.category_id
   LEFT JOIN leaders l ON l.id = c.leader_id
   ORDER BY ar.name, ca.id, c.cell_number`))));

router.post('/cells', wrap(async (req, res) => {
  const areaId = Number(req.body.area_id) || 0;
  const catId = Number(req.body.category_id) || 0;
  const from = Number(req.body.cell_from) || 0;
  let to = Number(req.body.cell_to) || from;
  if (to < from) to = from;
  if (!areaId || !catId || from < 1) return bad(res, 'Area, category and cell number are required.');
  if (to - from > 99) return bad(res, 'Please add at most 100 cells at a time.');
  let added = 0;
  for (let n = from; n <= to; n++) {
    const r = await q('INSERT IGNORE INTO cells (area_id, category_id, cell_number) VALUES (?,?,?)', [areaId, catId, n]);
    added += r.affectedRows;
  }
  res.json({ ok: true, message: `${added} cell(s) added.` + (added < to - from + 1 ? ' Some already existed.' : '') });
}));

router.post('/cells/:id/toggle', wrap(async (req, res) => {
  await q('UPDATE cells SET is_active = 1 - is_active WHERE id = ?', [Number(req.params.id)]);
  res.json({ ok: true, message: 'Cell updated.' });
}));

router.post('/cells/:id/leader', wrap(async (req, res) => {
  const emp = String(req.body.employee_number || '').trim();
  if (!/^\d{6}$/.test(emp)) return bad(res, 'Employee number must be exactly 6 digits.');
  await q('UPDATE cells SET leader_id = ? WHERE id = ?', [await leaderIdFor(emp), Number(req.params.id)]);
  res.json({ ok: true, message: 'Cell leader updated.' });
}));

// ---------- accounts ----------
router.get('/accounts', wrap(async (req, res) => res.json(await q(
  'SELECT id, username, role, is_active, created_at FROM users ORDER BY is_active, role, username'))));

router.post('/accounts', wrap(async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const role = req.body.role || 'auditor';
  let leaderId = null;

  if (!['admin', 'auditor', 'leader'].includes(role)) return bad(res, 'Invalid role.');
  if (password.length < 6) return bad(res, 'Password must be at least 6 characters.');
  if (role === 'leader') {
    // a leader account uses the 6-digit employee number as the username
    const [l] = await q('SELECT id FROM leaders WHERE employee_number = ?', [username]);
    if (!/^\d{6}$/.test(username) || !l) return bad(res, 'For a leader, the username must be a registered 6-digit employee number.');
    leaderId = l.id;
  } else if (!/^[A-Za-z0-9_.-]{3,50}$/.test(username)) {
    return bad(res, 'Username: 3 to 50 characters (letters, numbers, . _ -).');
  }
  const [exists] = await q('SELECT id FROM users WHERE username = ?', [username]);
  if (exists) return bad(res, 'That username is already taken.');
  await q('INSERT INTO users (username, password_hash, role, leader_id, is_active) VALUES (?,?,?,?,1)',
    [username, bcrypt.hashSync(password, 10), role, leaderId]);
  res.json({ ok: true, message: `Account ${username} created.` });
}));

router.post('/accounts/:id/password', wrap(async (req, res) => {
  const password = String(req.body.password || '');
  if (password.length < 6) return bad(res, 'Password must be at least 6 characters.');
  await q('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(password, 10), Number(req.params.id)]);
  res.json({ ok: true, message: 'Password changed.' });
}));

router.post('/accounts/:id/toggle', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return bad(res, 'You cannot disable your own account.');
  await q('UPDATE users SET is_active = 1 - is_active WHERE id = ?', [id]);
  res.json({ ok: true, message: 'Account updated.' });
}));

export default router;
