// Weekly winner logic (same rules as the PHP version).
import { q } from '../db.js';

// Equal totals share the same rank (a tie).
function addRanks(rows) {
  let rank = 0;
  let prev = null;
  rows.forEach((r, i) => {
    if (r.total !== prev) {
      rank = i + 1;
      prev = r.total;
    }
    r.rank = rank;
  });
  return rows;
}

// Total marks per LEADER (employee number) for one area + category.
export async function weeklyLeaders(areaId, categoryId, start, end) {
  const rows = await q(
    `SELECT l.employee_number,
            GROUP_CONCAT(DISTINCT c.cell_number ORDER BY c.cell_number SEPARATOR ', ') AS cells,
            SUM(s.marks) AS total,
            COUNT(DISTINCT a.audit_date) AS days
     FROM audit_scores s
     JOIN audits a       ON a.id = s.audit_id
     JOIN cells c        ON c.id = s.cell_id
     JOIN audit_cells ac ON ac.audit_id = s.audit_id AND ac.cell_id = s.cell_id
     JOIN leaders l      ON l.id = ac.leader_id
     WHERE a.audit_date BETWEEN ? AND ?
       AND a.area_id = ? AND c.category_id = ?
       AND s.marks IS NOT NULL
     GROUP BY l.id, l.employee_number
     ORDER BY total DESC, l.employee_number ASC`,
    [start, end, areaId, categoryId]
  );
  return addRanks(rows);
}

// Total marks per EMPLOYEE: each employee gets the score of the cell they worked in that day.
export async function weeklyEmployees(areaId, categoryId, start, end) {
  const rows = await q(
    `SELECT e.employee_number,
            GROUP_CONCAT(DISTINCT c.cell_number ORDER BY c.cell_number SEPARATOR ', ') AS cells,
            SUM(t.cell_total) AS total,
            COUNT(DISTINCT a.audit_date) AS days
     FROM audit_cell_employees ace
     JOIN employees e ON e.id = ace.employee_id
     JOIN audits a    ON a.id = ace.audit_id
     JOIN cells c     ON c.id = ace.cell_id
     JOIN (SELECT audit_id, cell_id, SUM(marks) AS cell_total
           FROM audit_scores WHERE marks IS NOT NULL
           GROUP BY audit_id, cell_id) t
          ON t.audit_id = ace.audit_id AND t.cell_id = ace.cell_id
     WHERE a.audit_date BETWEEN ? AND ?
       AND a.area_id = ? AND c.category_id = ?
     GROUP BY e.id, e.employee_number
     ORDER BY total DESC, e.employee_number ASC`,
    [start, end, areaId, categoryId]
  );
  return addRanks(rows);
}
