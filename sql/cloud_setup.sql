-- ONE file for an online database (TiDB Cloud etc.): structure + starter data.
-- Run it ONCE, inside the database you were given (TiDB: the database named 'test').
-- Default login after this: admin / Admin@123  (change it right after the first sign-in)

-- Daily Audit Scoring System: database schema

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

-- Default login: username admin / password Admin@123 (change it after first sign-in)
INSERT INTO users (username, password_hash, role) VALUES ('admin', '$2y$10$c.RQPVO.NpZdQxgC7wDigusjlM3NsFYOcfGRr/O5uWEmoKms9wKbG', 'admin');

INSERT INTO areas (name) VALUES ('EWA'), ('Voltex');
INSERT INTO categories (name) VALUES ('Gangs'), ('Socket');

INSERT INTO criteria (name, max_marks, sort_order) VALUES
('Supervisor approved first of sample', 10, 1),
('Proper components used', 10, 2),
('SOP displayed properly', 10, 3),
('Proper material placement', 10, 4),
('Workstation cleanliness at shift start/end', 10, 5),
('Test machines arranged properly and calibrated on due date', 10, 6),
('Rejection bin available and identified', 10, 7),
('Proper labeling on bins/racks (Travel card)', 10, 8),
('No unnecessary items at workstation', 10, 9),
('Line discipline maintained', 10, 10);

-- Fake sample data for testing only. Replace with real cells and leaders.
INSERT INTO leaders (employee_number) VALUES ('100001'),('100002'),('100003'),('100004');
INSERT INTO cells (area_id, category_id, cell_number, leader_id) VALUES
(2, 1, 1, 1), (2, 1, 2, 2), (2, 2, 1, 3), (2, 2, 2, 4);
