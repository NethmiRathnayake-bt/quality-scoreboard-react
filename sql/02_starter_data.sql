USE quality_scoreboard;

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
