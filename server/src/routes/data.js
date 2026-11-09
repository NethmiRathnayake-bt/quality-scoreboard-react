// Pages that read and write audit data: overview, score sheet, leaderboard, analysis, my scores.
import { Router } from 'express';
import { pool, q } from '../db.js';
import { auth, staff, leaderOnly, wrap } from '../auth.js';
import { validDate, addDays, today, weekRange } from '../lib/dates.js';
import { weeklyLeaders, weeklyEmployees } from '../lib/ranking.js';

const router = Router();
router.use(auth);

const pad2 = (n) => String(n).padStart(2, '0');
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const shortDate = (s) =>
  new Date(s + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

async function getMeta() {
  const areas = await q('SELECT id, name FROM areas ORDER BY name');
  const categories = await q('SELECT id, name FROM categories ORDER BY id');
  const criteria = await q('SELECT id, name, max_marks AS maxMarks FROM criteria WHERE is_active = 1 ORDER BY sort_order, id');
  const maxTotal = criteria.reduce((s, c) => s + c.maxMarks, 0);
  return { areas, categories, criteria, maxTotal };
}

router.get('/meta', wrap(async (req, res) => res.json(await getMeta())));

// ---------------- Overview ----------------
router.get('/overview', staff, wrap(async (req, res) => {
  const { maxTotal } = await getMeta();
  const [{ latest }] = await q('SELECT MAX(audit_date) AS latest FROM audits');
  const date = validDate(req.query.date) ? req.query.date : (latest || today());

  const rows = await q(
    `SELECT a.area_id AS areaId, ar.name AS area, ca.name AS category, c.cell_number AS cellNumber,
            l.employee_number AS leader, SUM(s.marks) AS total
     FROM audits a
     JOIN areas ar ON ar.id = a.area_id
     JOIN audit_scores s ON s.audit_id = a.id
     JOIN cells c ON c.id = s.cell_id
     JOIN categories ca ON ca.id = c.category_id
     LEFT JOIN audit_cells ac ON ac.audit_id = a.id AND ac.cell_id = c.id
     LEFT JOIN leaders l ON l.id = ac.leader_id
     WHERE a.audit_date = ?
     GROUP BY a.area_id, ar.name, ca.id, ca.name, c.id, c.cell_number, l.employee_number
     HAVING COUNT(s.marks) > 0
     ORDER BY total DESC, ar.name, ca.id, c.cell_number`,
    [date]
  );
  const dates = (await q('SELECT DISTINCT audit_date FROM audits ORDER BY audit_date DESC LIMIT 7')).map((r) => r.audit_date);
  res.json({ date, maxTotal, rows, dates });
}));

// ---------------- Score sheet ----------------
async function sheetCells(areaId) {
  return q(
    `SELECT c.id, c.cell_number AS cellNumber, ca.name AS category, l.employee_number AS defaultEmp
     FROM cells c
     JOIN categories ca ON ca.id = c.category_id
     LEFT JOIN leaders l ON l.id = c.leader_id
     WHERE c.area_id = ? AND c.is_active = 1
     ORDER BY c.category_id, c.cell_number`,
    [areaId]
  );
}

router.get('/sheet', staff, wrap(async (req, res) => {
  const date = validDate(req.query.date) ? req.query.date : today();
  const areaId = Number(req.query.area_id) || 0;
  if (!areaId) return res.json({ date, areaId: 0, cells: [], criteria: [], info: {}, scores: {} });

  const { criteria } = await getMeta();
  const cells = await sheetCells(areaId);
  const [audit] = await q('SELECT id FROM audits WHERE audit_date = ? AND area_id = ?', [date, areaId]);

  const info = {};
  const scores = {};
  cells.forEach((c) => { info[c.id] = { leader: '', remarks: '', employees: '' }; });

  if (audit) {
    for (const r of await q(
      `SELECT ac.cell_id, ac.remarks, l.employee_number FROM audit_cells ac
       LEFT JOIN leaders l ON l.id = ac.leader_id WHERE ac.audit_id = ?`, [audit.id])) {
      if (info[r.cell_id]) info[r.cell_id] = { ...info[r.cell_id], leader: r.employee_number || '', remarks: r.remarks || '' };
    }
    for (const r of await q('SELECT cell_id, criterion_id, marks FROM audit_scores WHERE audit_id = ?', [audit.id])) {
      (scores[r.cell_id] ||= {})[r.criterion_id] = r.marks;
    }
    for (const r of await q(
      `SELECT ace.cell_id, e.employee_number FROM audit_cell_employees ace
       JOIN employees e ON e.id = ace.employee_id WHERE ace.audit_id = ? ORDER BY e.employee_number`, [audit.id])) {
      if (info[r.cell_id]) info[r.cell_id].employees = (info[r.cell_id].employees + ' ' + r.employee_number).trim();
    }
  } else {
    // Suggest the leader who was last entered for each cell before this date.
    const last = {};
    for (const r of await q(
      `SELECT ac.cell_id, l.employee_number FROM audit_cells ac
       JOIN audits a ON a.id = ac.audit_id JOIN leaders l ON l.id = ac.leader_id
       WHERE a.area_id = ? AND a.audit_date < ? ORDER BY a.audit_date ASC`, [areaId, date])) {
      last[r.cell_id] = r.employee_number;
    }
    cells.forEach((c) => { info[c.id].leader = last[c.id] || c.defaultEmp || ''; });
  }
  res.json({ date, areaId, existing: !!audit, cells, criteria, info, scores });
}));

router.post('/sheet', staff, wrap(async (req, res) => {
  const date = req.body.date;
  const areaId = Number(req.body.areaId) || 0;
  if (!validDate(date) || !areaId) return res.status(400).json({ errors: ['Please choose a date and an area.'] });

  const { criteria } = await getMeta();
  const cells = await sheetCells(areaId);
  const input = req.body.cells || {};
  const errors = [];
  const clean = {};

  for (const c of cells) {
    const label = `${c.category} cell ${pad2(c.cellNumber)}`;
    const i = input[c.id] || {};

    const leader = String(i.leader || '').trim();
    if (leader !== '' && !/^\d{6}$/.test(leader)) errors.push(`${label}: leader employee number must be exactly 6 digits.`);

    const emps = new Set();
    for (const n of String(i.employees || '').split(/\D+/).filter(Boolean)) {
      if (n.length !== 6) errors.push(`${label}: employee number "${n}" must be exactly 6 digits.`);
      else emps.add(n);
    }
    if (emps.size > 40) errors.push(`${label}: too many employee numbers (maximum 40).`);

    const marks = {};
    for (const cr of criteria) {
      const raw = String((i.marks || {})[cr.id] ?? '').trim();
      if (raw === '') marks[cr.id] = null;
      else if (/^\d+$/.test(raw) && Number(raw) <= cr.maxMarks) marks[cr.id] = Number(raw);
      else { errors.push(`${label}: marks for "${cr.name}" must be 0 to ${cr.maxMarks}.`); marks[cr.id] = null; }
    }
    clean[c.id] = { leader, remarks: String(i.remarks || '').trim().slice(0, 255), emps: [...emps], marks };
  }
  if (errors.length) return res.status(400).json({ errors });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let [[audit]] = await conn.query('SELECT id FROM audits WHERE audit_date = ? AND area_id = ?', [date, areaId]);
    let auditId = audit?.id;
    if (!auditId) {
      const [ins] = await conn.query('INSERT INTO audits (audit_date, area_id, auditor_id) VALUES (?,?,?)', [date, areaId, req.user.id]);
      auditId = ins.insertId;
    }

    // find a leader / employee by number, or create it
    const idFor = async (table, num) => {
      const [[row]] = await conn.query(`SELECT id FROM ${table} WHERE employee_number = ?`, [num]);
      if (row) return row.id;
      const [ins] = await conn.query(`INSERT INTO ${table} (employee_number) VALUES (?)`, [num]);
      return ins.insertId;
    };

    for (const c of cells) {
      const d = clean[c.id];
      const leaderId = d.leader ? await idFor('leaders', d.leader) : null;
      await conn.query(
        `INSERT INTO audit_cells (audit_id, cell_id, leader_id, remarks) VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE leader_id = VALUES(leader_id), remarks = VALUES(remarks)`,
        [auditId, c.id, leaderId, d.remarks || null]);
      for (const cr of criteria) {
        await conn.query(
          `INSERT INTO audit_scores (audit_id, cell_id, criterion_id, marks) VALUES (?,?,?,?)
           ON DUPLICATE KEY UPDATE marks = VALUES(marks)`,
          [auditId, c.id, cr.id, d.marks[cr.id]]);
      }
      await conn.query('DELETE FROM audit_cell_employees WHERE audit_id = ? AND cell_id = ?', [auditId, c.id]);
      for (const num of d.emps) {
        const empId = await idFor('employees', num);
        await conn.query('INSERT IGNORE INTO audit_cell_employees (audit_id, cell_id, employee_id) VALUES (?,?,?)', [auditId, c.id, empId]);
      }
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

// ---------------- Leaderboard ----------------
async function leaderboardData(query) {
  const { areas, categories } = await getMeta();
  const date = validDate(query.date) ? query.date : today();
  const areaId = Number(query.area_id) || (areas[0] ? areas[0].id : 0);
  const [start, end] = weekRange(date);
  const boards = [];
  const empBoards = [];
  for (const cat of categories) {
    boards.push({ name: cat.name, rows: await weeklyLeaders(areaId, cat.id, start, end) });
    empBoards.push({ name: cat.name, rows: await weeklyEmployees(areaId, cat.id, start, end) });
  }
  return { date, areaId, start, end, prev: addDays(start, -7), next: addDays(start, 7), boards, empBoards };
}

router.get('/leaderboard', wrap(async (req, res) => res.json(await leaderboardData(req.query))));

router.get('/leaderboard.csv', wrap(async (req, res) => {
  const d = await leaderboardData(req.query);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [['Type', 'Category', 'Rank', 'Employee no.', 'Cells', 'Days audited', 'Total marks'].map(esc).join(',')];
  for (const [type, list] of [['Leader', d.boards], ['Employee', d.empBoards]]) {
    for (const b of list) {
      for (const r of b.rows) lines.push([type, b.name, r.rank, r.employee_number, r.cells, r.days, r.total].map(esc).join(','));
    }
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="leaderboard_${d.start}_to_${d.end}.csv"`);
  res.send(lines.join('\n'));
}));

// ---------------- Analysis (for managers) ----------------
router.get('/analysis', staff, wrap(async (req, res) => {
  const { areas, maxTotal } = await getMeta();
  const [{ latest }] = await q('SELECT MAX(audit_date) AS latest FROM audits');
  const defTo = latest || today();
  const defFrom = addDays(defTo, -29);
  let from = validDate(req.query.from) ? req.query.from : defFrom;
  let to = validDate(req.query.to) ? req.query.to : defTo;
  if (from > to) [from, to] = [to, from];
  const areaId = Number(req.query.area_id) || 0;
  const catId = Number(req.query.category_id) || 0;

  let where = 'a.audit_date BETWEEN ? AND ?';
  const params = [from, to];
  if (areaId) { where += ' AND a.area_id = ?'; params.push(areaId); }
  if (catId) { where += ' AND c.category_id = ?'; params.push(catId); }

  const rows = await q(
    `SELECT a.audit_date AS date, ar.name AS area, ca.name AS category, c.cell_number AS cellNumber,
            l.employee_number AS leader, SUM(s.marks) AS total
     FROM audits a
     JOIN areas ar ON ar.id = a.area_id
     JOIN audit_scores s ON s.audit_id = a.id
     JOIN cells c ON c.id = s.cell_id
     JOIN categories ca ON ca.id = c.category_id
     LEFT JOIN audit_cells ac ON ac.audit_id = a.id AND ac.cell_id = c.id
     LEFT JOIN leaders l ON l.id = ac.leader_id
     WHERE ${where}
     GROUP BY a.id, a.audit_date, ar.name, ca.id, ca.name, c.id, c.cell_number, l.employee_number
     HAVING COUNT(s.marks) > 0
     ORDER BY a.audit_date`, params);
  rows.forEach((r) => { r.pct = maxTotal ? (r.total / maxTotal) * 100 : 0; });

  const critRows = await q(
    `SELECT cr.name, AVG(s.marks) / cr.max_marks * 100 AS pct
     FROM audit_scores s
     JOIN audits a ON a.id = s.audit_id
     JOIN cells c ON c.id = s.cell_id
     JOIN criteria cr ON cr.id = s.criterion_id
     WHERE ${where} AND s.marks IS NOT NULL
     GROUP BY cr.id, cr.name, cr.max_marks
     ORDER BY pct ASC`, params);

  const base = { from, to, areaId, categoryId: catId, maxTotal, defTo, count: rows.length };
  if (!rows.length) return res.json(base);

  const push = (obj, key, v) => { (obj[key] ||= []).push(v); };
  const byDate = {}, byDateCat = {}, byWeek = {}, byCell = {}, byArea = {}, byLeader = {};
  for (const r of rows) {
    push(byDate, r.date, r.pct);
    byDateCat[r.category] ||= {};
    push(byDateCat[r.category], r.date, r.pct);
    push(byWeek, weekRange(r.date)[0], r.pct);
    push(byCell, `${r.area}|${r.category}|${r.cellNumber}`, r.pct);
    push(byArea, r.area, r.pct);
    if (r.leader) push(byLeader, r.leader, r.pct);
  }
  const dates = Object.keys(byDate).sort();
  const dayAvg = Object.fromEntries(dates.map((d) => [d, avg(byDate[d])]));
  const bestDay = dates.reduce((a, b) => (dayAvg[b] > dayAvg[a] ? b : a));
  const lowDay = dates.reduce((a, b) => (dayAvg[b] < dayAvg[a] ? b : a));
  const overall = avg(rows.map((r) => r.pct));
  const excellent = rows.filter((r) => r.pct >= 90).length;
  const good = rows.filter((r) => r.pct >= 70 && r.pct < 90).length;
  const needs = rows.length - excellent - good;

  // daily lines: one per category (when there are several) + overall
  const series = {};
  const catNames = Object.keys(byDateCat).sort();
  if (catNames.length > 1) {
    for (const cat of catNames) series[cat] = dates.map((d) => (byDateCat[cat][d] ? avg(byDateCat[cat][d]) : null));
  }
  series.Overall = dates.map((d) => dayAvg[d]);

  const weekKeys = Object.keys(byWeek).sort();
  const multiArea = !areaId && areas.length > 1;
  const cellAvg = Object.entries(byCell).map(([key, list]) => {
    const [ar, cat, num] = key.split('|');
    return { label: `${multiArea ? ar + ' · ' : ''}${cat} ${pad2(num)}`, pct: avg(list), note: `${list.length} day(s)` };
  }).sort((a, b) => b.pct - a.pct);
  const cells = cellAvg.length > 20 ? [...cellAvg.slice(0, 10), null, ...cellAvg.slice(-10)] : cellAvg;

  const leaders = Object.entries(byLeader)
    .map(([emp, list]) => ({ label: emp, pct: avg(list), note: `${list.length} day(s)` }))
    .sort((a, b) => b.pct - a.pct).slice(0, 8);
  const areaList = Object.entries(byArea).map(([ar, list]) => ({ label: ar, pct: avg(list), note: `${list.length} results` }));

  const r1 = (n) => Math.round(n * 10) / 10;
  const insights = [
    `Overall average is ${r1(overall)}% across ${rows.length} cell results between ${from} and ${to}.`,
    `Best day: ${bestDay} (${r1(dayAvg[bestDay])}%). Lowest day: ${lowDay} (${r1(dayAvg[lowDay])}%).`,
  ];
  if (cellAvg.length) {
    const w = cellAvg[cellAvg.length - 1];
    insights.push(`Strongest cell: ${cellAvg[0].label} (${Math.round(cellAvg[0].pct)}%). Weakest cell: ${w.label} (${Math.round(w.pct)}%).`);
  }
  if (critRows.length) {
    insights.push(`Weakest criterion: "${critRows[0].name}" averages only ${Math.round(critRows[0].pct)}%. This is where most marks are lost.`);
  }
  if (dates.length >= 4) {
    const half = Math.floor(dates.length / 2);
    const vals = dates.map((d) => dayAvg[d]);
    const diff = avg(vals.slice(half)) - avg(vals.slice(0, half));
    insights.push(Math.abs(diff) < 1
      ? 'Performance is stable: the second half of the period is about the same as the first half.'
      : `Compared with the first half of the period, the second half ${diff > 0 ? 'improved' : 'dropped'} by ${r1(Math.abs(diff))} percentage points.`);
  }

  res.json({
    ...base,
    overall,
    days: dates.length,
    bestDay: { date: bestDay, pct: dayAvg[bestDay] },
    lowDay: { date: lowDay, pct: dayAvg[lowDay] },
    excellent, good, needs,
    insights,
    daily: { labels: dates.map(shortDate), series },
    weekly: { labels: weekKeys.map(shortDate), values: weekKeys.map((k) => avg(byWeek[k])) },
    criteria: critRows,
    cells, leaders, areaAvg: areaList,
  });
}));

// ---------------- My scores (team leaders) ----------------
router.get('/my-scores', leaderOnly, wrap(async (req, res) => {
  const leaderId = req.user.leader_id;
  const [leader] = await q('SELECT employee_number FROM leaders WHERE id = ?', [leaderId]);
  const empNo = leader ? leader.employee_number : req.user.username;
  const { maxTotal } = await getMeta();

  // weekly history: each week is its own row
  const weeks = await q(
    `SELECT DATE_FORMAT(DATE_SUB(a.audit_date, INTERVAL WEEKDAY(a.audit_date) DAY), '%Y-%m-%d') AS weekStart,
            COUNT(DISTINCT a.audit_date) AS days, SUM(s.marks) AS total
     FROM audit_scores s
     JOIN audits a       ON a.id = s.audit_id
     JOIN audit_cells ac ON ac.audit_id = s.audit_id AND ac.cell_id = s.cell_id
     WHERE ac.leader_id = ? AND s.marks IS NOT NULL
     GROUP BY weekStart ORDER BY weekStart DESC`, [leaderId]);

  const pick = validDate(req.query.week) ? req.query.week : (weeks[0] ? weeks[0].weekStart : today());
  const [start, end] = weekRange(pick);

  const daily = await q(
    `SELECT a.audit_date AS date, a.area_id AS areaId, c.category_id AS categoryId, ar.name AS area, ca.name AS category,
            c.cell_number AS cellNumber, ac.remarks, SUM(s.marks) AS total
     FROM audit_scores s
     JOIN audits a       ON a.id = s.audit_id
     JOIN audit_cells ac ON ac.audit_id = s.audit_id AND ac.cell_id = s.cell_id
     JOIN cells c        ON c.id = s.cell_id
     JOIN areas ar       ON ar.id = a.area_id
     JOIN categories ca  ON ca.id = c.category_id
     WHERE ac.leader_id = ? AND a.audit_date BETWEEN ? AND ?
     GROUP BY a.audit_date, a.area_id, c.category_id, ar.name, ca.name, c.id, c.cell_number, ac.remarks
     HAVING COUNT(s.marks) > 0
     ORDER BY a.audit_date, ar.name, ca.name, c.cell_number`, [leaderId, start, end]);

  const weekTotal = daily.reduce((s, d) => s + d.total, 0);
  const dayCount = new Set(daily.map((d) => d.date)).size;
  const avgPct = daily.length && maxTotal ? Math.round((weekTotal / daily.length / maxTotal) * 100) : 0;

  const ranks = [];
  const seen = new Set();
  for (const d of daily) {
    const key = `${d.areaId}-${d.categoryId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const board = await weeklyLeaders(d.areaId, d.categoryId, start, end);
    const mine = board.find((r) => r.employee_number === empNo);
    if (mine) ranks.push({ label: `${d.area} · ${d.category}`, rank: mine.rank, of: board.length });
  }

  // criteria detail for one day
  let detail = null;
  const day = req.query.day;
  if (validDate(day) && day >= start && day <= end) {
    const dr = await q(
      `SELECT cr.id AS critId, cr.name AS crit, cr.max_marks AS max, c.cell_number AS cellNumber, ca.name AS category, s.marks
       FROM audit_scores s
       JOIN audits a       ON a.id = s.audit_id
       JOIN audit_cells ac ON ac.audit_id = s.audit_id AND ac.cell_id = s.cell_id
       JOIN cells c        ON c.id = s.cell_id
       JOIN categories ca  ON ca.id = c.category_id
       JOIN criteria cr    ON cr.id = s.criterion_id
       WHERE ac.leader_id = ? AND a.audit_date = ?
       ORDER BY cr.sort_order, cr.id, ca.id, c.cell_number`, [leaderId, day]);
    const cols = [];
    const rowsById = {};
    for (const r of dr) {
      const col = `${r.category} ${pad2(r.cellNumber)}`;
      if (!cols.includes(col)) cols.push(col);
      (rowsById[r.critId] ||= { name: r.crit, max: r.max, cells: {} }).cells[col] = r.marks;
    }
    detail = { day, cols, rows: Object.values(rowsById) };
  }

  res.json({ empNo, maxTotal, weeks, start, end, daily, weekTotal, dayCount, avgPct, ranks, detail });
}));

export default router;
