-- Daily Audit Scoring System: database schema
CREATE DATABASE IF NOT EXISTS quality_scoreboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quality_scoreboard;

-- Leaders are identified only by a 6-digit employee number.
CREATE TABLE leaders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_number CHAR(6) NOT NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,      -- leaders sign in with their 6-digit employee number
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','auditor','leader') NOT NULL DEFAULT 'auditor',
  leader_id INT NULL,                        -- set only for leader accounts
  is_active TINYINT(1) NOT NULL DEFAULT 1,   -- 0 = waiting for admin approval
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (leader_id) REFERENCES leaders(id)
);

CREATE TABLE areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE criteria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  max_marks TINYINT UNSIGNED NOT NULL DEFAULT 10,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE cells (
  id INT AUTO_INCREMENT PRIMARY KEY,
  area_id INT NOT NULL,
  category_id INT NOT NULL,
  cell_number SMALLINT UNSIGNED NOT NULL,
  leader_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_cell (area_id, category_id, cell_number),
  FOREIGN KEY (area_id) REFERENCES areas(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (leader_id) REFERENCES leaders(id)
);

-- One audit = one date + one area (the whole paper sheet).
CREATE TABLE audits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  audit_date DATE NOT NULL,
  area_id INT NOT NULL,
  auditor_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_audit (audit_date, area_id),
  FOREIGN KEY (area_id) REFERENCES areas(id),
  FOREIGN KEY (auditor_id) REFERENCES users(id)
);

-- Per-day info for each cell: which leader was there that day, plus remarks.
CREATE TABLE audit_cells (
  id INT AUTO_INCREMENT PRIMARY KEY,
  audit_id INT NOT NULL,
  cell_id INT NOT NULL,
  leader_id INT NULL,
  remarks VARCHAR(255) NULL,
  UNIQUE KEY uq_audit_cell (audit_id, cell_id),
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE,
  FOREIGN KEY (cell_id) REFERENCES cells(id),
  FOREIGN KEY (leader_id) REFERENCES leaders(id)
);

-- Every box in the grid. marks NULL = left blank.
CREATE TABLE audit_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  audit_id INT NOT NULL,
  cell_id INT NOT NULL,
  criterion_id INT NOT NULL,
  marks TINYINT UNSIGNED NULL,
  UNIQUE KEY uq_score (audit_id, cell_id, criterion_id),
  CHECK (marks IS NULL OR marks BETWEEN 0 AND 10),
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE,
  FOREIGN KEY (cell_id) REFERENCES cells(id),
  FOREIGN KEY (criterion_id) REFERENCES criteria(id)
);

-- Employees working under a leader (optional, for employee winners)
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_number CHAR(6) NOT NULL UNIQUE
);

-- Which employees worked in which cell on which audit day.
CREATE TABLE audit_cell_employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  audit_id INT NOT NULL,
  cell_id INT NOT NULL,
  employee_id INT NOT NULL,
  UNIQUE KEY uq_ace (audit_id, cell_id, employee_id),
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE,
  FOREIGN KEY (cell_id) REFERENCES cells(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);
