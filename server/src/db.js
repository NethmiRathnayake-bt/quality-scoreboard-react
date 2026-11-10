// MySQL connection pool, shared by every route.
import mysql from 'mysql2/promise';
import 'dotenv/config';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  // Online databases (for example TiDB Cloud) need an encrypted connection: set DB_SSL=true
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'quality_scoreboard',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL) || 5,
  dateStrings: true,     // DATE columns come back as 'YYYY-MM-DD' text
  decimalNumbers: true,  // SUM() / AVG() come back as numbers, not text
});

// Run a query and return only the rows.
export async function q(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
