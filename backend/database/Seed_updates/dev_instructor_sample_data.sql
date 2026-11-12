-- =====================================================================
-- dev_instructor_sample_data.sql  – DEV / TEST BRANCHES ONLY, never production.
-- Run after 001 to 004. Safe to run more than once.
--
-- REAL: the HQ timetable (from frontend/src/data/hqClasses.js) and the
--       times of the other dojos' classes (Our Dojos page).
-- SAMPLE: everything about students. Every student here is made up.
--       The site names no instructors for other dojos, so the first
--       seeded instructor account teaches those classes.
-- Accounts ending in @ask-sample.test cannot sign in ('!' is not a valid hash).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- HQ instructors: classes.instructor_id needs a real users row
-- ---------------------------------------------------------------------
INSERT INTO users (full_name, email, password_hash, role) VALUES
    ('Instructor Elaine Ong', 'elaine.ong@ask-sample.test', '!', 'instructor'),
    ('Instructor Nicholas Lee', 'nicholas.lee@ask-sample.test', '!', 'instructor'),
    ('Sensei Alexander Lee', 'alexander.lee@ask-sample.test', '!', 'instructor'),
    ('Sensei Aloyseus Lee', 'aloyseus.lee@ask-sample.test', '!', 'instructor'),
    ('Sensei Annie Goh', 'annie.goh@ask-sample.test', '!', 'instructor'),
    ('Sensei Bob Tan', 'bob.tan@ask-sample.test', '!', 'instructor'),
    ('Sensei James Tan', 'james.tan@ask-sample.test', '!', 'instructor'),
    ('Sensei Mark Lim', 'mark.lim@ask-sample.test', '!', 'instructor'),
    ('Sensei Mun Kit', 'mun.kit@ask-sample.test', '!', 'instructor'),
    ('Sensei Robin Tan', 'robin.tan@ask-sample.test', '!', 'instructor'),
    ('Sensei Ronald Tan', 'ronald.tan@ask-sample.test', '!', 'instructor'),
    ('Sensei Tan Kok Hiang', 'tan.kok.hiang@ask-sample.test', '!', 'instructor'),
    ('Shihan Philip Lee', 'philip.lee@ask-sample.test', '!', 'instructor')
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------
-- HQ weekly timetable (0 = Sunday)
-- ---------------------------------------------------------------------
INSERT INTO classes (title, centre_id, instructor_id, day_of_week, start_time, end_time, min_belt_id)
SELECT v.title,
       (SELECT id FROM centres WHERE name = 'ASK Headquarters Dojo'),
       (SELECT id FROM users WHERE email = v.email),
       v.dow, v.st::time, v.et::time,
       (SELECT id FROM belt_ranks WHERE name = v.min_belt)
FROM (VALUES
    ('Adult Class', 'aloyseus.lee@ask-sample.test', 1, '07:15', '08:15', NULL),
    ('Adult Class', 'nicholas.lee@ask-sample.test', 1, '15:00', '16:00', NULL),
    ('Children Juniors Class', 'nicholas.lee@ask-sample.test', 1, '17:00', '18:00', NULL),
    ('Adult Class', 'mark.lim@ask-sample.test', 1, '18:00', '19:00', NULL),
    ('Adult Class', 'mark.lim@ask-sample.test', 1, '19:15', '20:15', NULL),
    ('Adult Class', 'alexander.lee@ask-sample.test', 1, '20:30', '21:30', NULL),
    ('Adult Class', 'philip.lee@ask-sample.test', 2, '07:15', '08:15', NULL),
    ('Children Beginners Class', 'robin.tan@ask-sample.test', 2, '17:00', '18:00', NULL),
    ('Children Beginners Class', 'robin.tan@ask-sample.test', 2, '18:00', '19:00', NULL),
    ('Adult Class', 'robin.tan@ask-sample.test', 2, '18:00', '19:00', NULL),
    ('Adult Class', 'james.tan@ask-sample.test', 2, '19:15', '20:15', NULL),
    ('Weapons Class', 'robin.tan@ask-sample.test', 2, '20:30', '21:30', NULL),
    ('Adult Class', 'elaine.ong@ask-sample.test', 3, '10:00', '11:00', NULL),
    ('Adult Class', 'elaine.ong@ask-sample.test', 3, '11:00', '12:00', NULL),
    ('Adult Class', 'nicholas.lee@ask-sample.test', 3, '12:15', '13:15', NULL),
    ('Children Beginners Class', 'robin.tan@ask-sample.test', 3, '16:00', '17:00', NULL),
    ('Children Beginners Class', 'robin.tan@ask-sample.test', 3, '17:00', '18:00', NULL),
    ('Adult Class', 'robin.tan@ask-sample.test', 3, '18:00', '19:00', NULL),
    ('Adult Class', 'aloyseus.lee@ask-sample.test', 3, '19:15', '20:15', NULL),
    ('Advanced Class', 'philip.lee@ask-sample.test', 3, '20:30', '21:30', '1st Kyu'),
    ('Adult Class', 'alexander.lee@ask-sample.test', 4, '07:15', '08:15', NULL),
    ('Adult Class', 'alexander.lee@ask-sample.test', 4, '11:00', '12:00', NULL),
    ('Adult Class', 'nicholas.lee@ask-sample.test', 4, '12:15', '13:15', NULL),
    ('Children Beginners Class', 'nicholas.lee@ask-sample.test', 4, '16:00', '17:00', NULL),
    ('Children Beginners Class', 'nicholas.lee@ask-sample.test', 4, '17:00', '18:00', NULL),
    ('Adult Class', 'nicholas.lee@ask-sample.test', 4, '18:00', '19:00', NULL),
    ('Adult Class', 'philip.lee@ask-sample.test', 4, '19:15', '20:15', NULL),
    ('Intermediate Class', 'bob.tan@ask-sample.test', 4, '20:30', '21:30', '4th Kyu'),
    ('Adult Class', 'tan.kok.hiang@ask-sample.test', 5, '11:00', '12:00', NULL),
    ('Adult Class', 'nicholas.lee@ask-sample.test', 5, '12:15', '13:15', NULL),
    ('Children Beginners Class', 'robin.tan@ask-sample.test', 5, '16:00', '17:00', NULL),
    ('Children Beginners Class', 'robin.tan@ask-sample.test', 5, '17:00', '18:00', NULL),
    ('Children Beginners Class', 'nicholas.lee@ask-sample.test', 5, '18:00', '19:00', NULL),
    ('Adult Class', 'elaine.ong@ask-sample.test', 5, '18:00', '19:00', NULL),
    ('Adult Class', 'elaine.ong@ask-sample.test', 5, '19:15', '20:15', NULL),
    ('Adult Class', 'robin.tan@ask-sample.test', 5, '20:30', '21:30', NULL),
    ('Adult Class', 'philip.lee@ask-sample.test', 6, '08:00', '09:00', NULL),
    ('Adult Class', 'mark.lim@ask-sample.test', 6, '09:15', '10:15', NULL),
    ('Children Beginners Class', 'robin.tan@ask-sample.test', 6, '09:15', '10:15', NULL),
    ('Children Beginners Class', 'robin.tan@ask-sample.test', 6, '10:30', '11:30', NULL),
    ('Children Beginners Class', 'nicholas.lee@ask-sample.test', 6, '11:45', '12:45', NULL),
    ('Adult Class', 'alexander.lee@ask-sample.test', 6, '11:45', '12:45', NULL),
    ('Adult Class', 'robin.tan@ask-sample.test', 6, '13:00', '14:00', NULL),
    ('Children Beginners Class', 'nicholas.lee@ask-sample.test', 6, '14:15', '15:15', NULL),
    ('Adult Class', 'bob.tan@ask-sample.test', 6, '14:15', '15:15', NULL),
    ('Children Beginners Class', 'nicholas.lee@ask-sample.test', 6, '15:30', '16:30', NULL),
    ('Mixed/Family Class', 'mun.kit@ask-sample.test', 6, '15:30', '16:30', NULL),
    ('Mixed/Family Class', 'annie.goh@ask-sample.test', 6, '16:45', '17:45', NULL),
    ('Adult Class', 'robin.tan@ask-sample.test', 6, '18:00', '19:00', NULL),
    ('Children Beginners Class', 'nicholas.lee@ask-sample.test', 0, '09:15', '10:15', NULL),
    ('Senior SG50 Class', 'philip.lee@ask-sample.test', 0, '09:15', '10:15', NULL),
    ('Children Beginners Class', 'nicholas.lee@ask-sample.test', 0, '10:30', '11:30', NULL),
    ('Adult Class', 'ronald.tan@ask-sample.test', 0, '10:30', '11:30', NULL),
    ('Children Beginners Class', 'nicholas.lee@ask-sample.test', 0, '11:45', '12:45', NULL),
    ('Adult Class', 'alexander.lee@ask-sample.test', 0, '11:45', '12:45', NULL),
    ('Adult Class', 'mark.lim@ask-sample.test', 0, '13:00', '14:00', NULL),
    ('Children Beginners Class', 'annie.goh@ask-sample.test', 0, '14:15', '15:15', NULL),
    ('Adult Class', 'mark.lim@ask-sample.test', 0, '14:15', '15:15', NULL),
    ('Children Beginners Class', 'nicholas.lee@ask-sample.test', 0, '15:30', '16:30', NULL),
    ('Mixed/Family Class', 'robin.tan@ask-sample.test', 0, '15:30', '16:30', NULL),
    ('Children Beginners Class', 'robin.tan@ask-sample.test', 0, '16:45', '17:45', NULL),
    ('Ladies Class', 'robin.tan@ask-sample.test', 0, '16:45', '17:45', NULL)
) AS v(title, email, dow, st, et, min_belt)
WHERE NOT EXISTS (
    SELECT 1 FROM classes c
    JOIN users u ON u.id = c.instructor_id
    WHERE c.title = v.title AND u.email = v.email
      AND c.day_of_week = v.dow AND c.start_time = v.st::time
);

-- ---------------------------------------------------------------------
-- Other dojos: real times, taught by the seeded instructor so that
-- signing in as that account shows classes every day of the week
-- ---------------------------------------------------------------------
CREATE TEMP TABLE demo_instructor ON COMMIT DROP AS
SELECT id FROM users
WHERE role = 'instructor' AND email NOT LIKE '%@ask-sample.test'
ORDER BY id LIMIT 1;

INSERT INTO classes (title, centre_id, instructor_id, day_of_week, start_time, end_time)
SELECT v.title, c.id, d.id, v.dow, v.st::time, v.et::time
FROM (VALUES
    ('Mixed Class', 'ActiveSG Bishan Dojo',                  1, '18:00', '19:00'),
    ('Adult Class', 'Our Tampines Hub Dojo',                 1, '20:30', '21:30'),
    ('Mixed Class', 'Thomson Dojo',                          2, '19:00', '20:15'),
    ('Adult Class', 'Rivervale Dojo',                        3, '20:00', '21:00'),
    ('Mixed Class', 'ActiveSG Bishan Dojo',                  4, '19:30', '20:30'),
    ('Adult Class', 'The Frontier Dojo',                     5, '20:00', '21:15'),
    ('Adult Class', 'Cheng San Dojo',                        6, '10:00', '11:15'),
    ('Adult Class', 'Civil Service Club (Bukit Batok) Dojo', 0, '11:00', '12:15')
) AS v(title, centre, dow, st, et)
JOIN centres c ON c.name = v.centre
CROSS JOIN demo_instructor d
WHERE NOT EXISTS (
    SELECT 1 FROM classes x
    WHERE x.centre_id = c.id AND x.day_of_week = v.dow AND x.start_time = v.st::time
);

-- ---------------------------------------------------------------------
-- Sessions, in Singapore time like the rest of the app. Dojo classes go
-- 8 weeks back (the attendance trend compares 2 x 28 days). HQ classes
-- have no sample attendance, so they start today. Both run 3 weeks ahead.
-- ---------------------------------------------------------------------
CREATE TEMP TABLE demo_today ON COMMIT DROP AS
SELECT (NOW() AT TIME ZONE 'Asia/Singapore')::date AS d;

INSERT INTO class_sessions (class_id, session_date, start_time, end_time, instructor_id, status)
SELECT cl.id, g::date, cl.start_time, cl.end_time, cl.instructor_id,
       CASE WHEN g::date < t.d THEN 'completed' ELSE 'scheduled' END
FROM classes cl
CROSS JOIN demo_today t
CROSS JOIN LATERAL generate_series(
    CASE WHEN cl.instructor_id IN (SELECT id FROM demo_instructor) THEN t.d - 56 ELSE t.d END,
    t.d + 21, INTERVAL '1 day') AS g
WHERE EXTRACT(DOW FROM g) = cl.day_of_week
ON CONFLICT (class_id, session_date) DO NOTHING;

-- ---------------------------------------------------------------------
-- Made-up students. pattern decides their attendance below:
--   ready     attends everything, enough to grade
--   regular   misses about 1 in 5
--   declining came every time, then dropped off in the last 28 days
--   new       only joined 3 weeks ago
-- ---------------------------------------------------------------------
CREATE TEMP TABLE demo_students ON COMMIT DROP AS
SELECT * FROM (VALUES
    (1,  'Sample Student Ada',    'sample.ada@ask-sample.test',    '6th Kyu',  5, 'ActiveSG Bishan Dojo',  'ready'),
    (2,  'Sample Student Ben',    'sample.ben@ask-sample.test',    'Ungraded', 4, 'Thomson Dojo',          'ready'),
    (4,  'Sample Student Dev',    'sample.dev@ask-sample.test',    '4th Kyu',  7, 'The Frontier Dojo',     'regular'),
    (8,  'Sample Student Hari',   'sample.hari@ask-sample.test',   '5th Kyu',  6, 'Thomson Dojo',          'declining'),
    (9,  'Sample Student Ivy',    'sample.ivy@ask-sample.test',    '4th Kyu',  9, 'ActiveSG Bishan Dojo',  'declining'),
    (11, 'Sample Student Kavya',  'sample.kavya@ask-sample.test',  'Ungraded', 0, 'The Frontier Dojo',     'new')
) AS v(n, full_name, email, belt, months_ago, centre, pattern);

INSERT INTO users (full_name, email, password_hash, role)
SELECT full_name, email, '!', 'student' FROM demo_students
ON CONFLICT (email) DO NOTHING;

INSERT INTO student_profiles (user_id, current_belt_id, belt_awarded_on, home_centre_id)
SELECT u.id, b.id,
       CASE WHEN s.pattern = 'new' THEN t.d - 21 ELSE (t.d - make_interval(months => s.months_ago))::date END,
       c.id
FROM demo_students s
JOIN users u ON u.email = s.email
JOIN belt_ranks b ON b.name = s.belt
JOIN centres c ON c.name = s.centre
CROSS JOIN demo_today t
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- Each student trains in 3 of the 8 dojo classes, which also gives
-- attendance across several centres
-- ---------------------------------------------------------------------
CREATE TEMP TABLE demo_sessions ON COMMIT DROP AS
WITH dojo_classes AS (
    SELECT cl.id, ROW_NUMBER() OVER (ORDER BY cl.id) - 1 AS pos
    FROM classes cl
    JOIN demo_instructor d ON d.id = cl.instructor_id
)
SELECT s.pattern, u.id AS student_id, cs.id AS session_id, cs.session_date, cs.start_time, cs.instructor_id,
       ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY cs.session_date, cs.id) AS visit
FROM demo_students s
JOIN users u ON u.email = s.email
JOIN dojo_classes dc ON dc.pos IN (s.n % 8, (s.n + 2) % 8, (s.n + 5) % 8)
JOIN class_sessions cs ON cs.class_id = dc.id
CROSS JOIN demo_today t
WHERE s.pattern <> 'new' OR cs.session_date >= t.d - 21;

-- Only the coming week: bookings fill the rosters, past visits are in attendance.
INSERT INTO bookings (session_id, student_id)
SELECT ds.session_id, ds.student_id
FROM demo_sessions ds
CROSS JOIN demo_today t
WHERE ds.session_date BETWEEN t.d AND t.d + 7
ON CONFLICT (session_id, student_id) DO NOTHING;

INSERT INTO attendance (session_id, student_id, status, method, checked_in_at, recorded_by)
SELECT a.session_id, a.student_id, a.status,
       CASE WHEN a.status = 'present' THEN 'qr' ELSE 'manual' END,
       (a.session_date + a.start_time) AT TIME ZONE 'Asia/Singapore',
       CASE WHEN a.status = 'present' THEN NULL ELSE a.instructor_id END
FROM (
    SELECT ds.*,
           CASE
             WHEN ds.pattern = 'ready' AND ds.visit % 7 = 0 THEN 'late'
             WHEN ds.pattern = 'regular' AND ds.visit % 5 = 0 THEN 'absent'
             WHEN ds.pattern = 'declining' AND ds.session_date > t.d - 28 AND ds.visit % 4 <> 0 THEN 'absent'
             ELSE 'present'
           END AS status
    FROM demo_sessions ds
    CROSS JOIN demo_today t
    WHERE ds.session_date < t.d
) a
ON CONFLICT (session_id, student_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- Gradings: the seeded instructor examines, and two students have applied
-- ---------------------------------------------------------------------
UPDATE grading_sessions g
SET examiner_id = d.id
FROM demo_instructor d
WHERE g.examiner_id IS NULL AND g.status = 'scheduled';

INSERT INTO grading_applications (student_id, grading_session_id, target_belt_id)
SELECT u.id, g.id, nb.id
FROM demo_students s
JOIN users u ON u.email = s.email
JOIN belt_ranks cb ON cb.name = s.belt
JOIN belt_ranks nb ON nb.rank_order = cb.rank_order + 1
JOIN grading_sessions g ON g.grading_date = '2026-12-13'
WHERE s.n IN (1, 2)
ON CONFLICT (student_id, grading_session_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- External sessions
-- ---------------------------------------------------------------------
INSERT INTO external_attendance (student_id, event_name, location, attended_on, recorded_by, note)
SELECT u.id, 'Sample External Seminar', 'Sample venue', t.d - 14, d.id, 'Made-up record for testing'
FROM demo_students s
JOIN users u ON u.email = s.email
CROSS JOIN demo_today t
CROSS JOIN demo_instructor d
WHERE s.n = 1
ON CONFLICT (student_id, event_name, attended_on) DO NOTHING;

COMMIT;
