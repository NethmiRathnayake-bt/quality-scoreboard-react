// MySQL connection pool, shared by every route.
import mysql from 'mysql2/promise';
import 'dotenv/config';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'quality_scoreboard',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,     // DATE columns come back as 'YYYY-MM-DD' text
  decimalNumbers: true,  // SUM() / AVG() come back as numbers, not text
});

// Run a query and return only the rows.
export async function q(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
