-- =====================================================================
-- dev_sample_data.sql  – DEV / TEST BRANCHES ONLY, never production.
-- Run after 001 and 002. Uses the first instructor and first student
-- in public.users, so it works on any branch copied from production.
-- =====================================================================

BEGIN;

-- Student profile for the first student user
INSERT INTO student_profiles (user_id, current_belt_id, belt_awarded_on, home_centre_id)
SELECT u.id,
       (SELECT id FROM belt_ranks WHERE name = '6th Kyu'),
       CURRENT_DATE - INTERVAL '4 months',
       (SELECT id FROM centres WHERE name = 'Bishan')
FROM users u WHERE u.role = 'student'
ORDER BY u.id LIMIT 1;

-- Weekly classes
INSERT INTO classes (title, centre_id, instructor_id, day_of_week, start_time, end_time, min_belt_id, max_belt_id, capacity)
SELECT c.title,
       (SELECT id FROM centres WHERE name = c.centre),
       (SELECT id FROM users WHERE role = 'instructor' ORDER BY id LIMIT 1),
       c.dow, c.st::time, c.et::time,
       (SELECT id FROM belt_ranks WHERE name = c.min_belt),
       (SELECT id FROM belt_ranks WHERE name = c.max_belt),
       c.cap
FROM (VALUES
    ('Beginner Fundamentals', 'Bishan',      2, '19:00', '20:30', 'Ungraded', '5th Kyu', 20),
    ('Intermediate Class',    'Bishan',      4, '19:30', '21:00', '5th Kyu',  '2nd Kyu', 16),
    ('Weekend Open Mat',      'Jurong East', 6, '10:00', '12:00', NULL,       NULL,      25),
    ('Advanced Weapons',      'Jurong East', 0, '14:00', '15:30', '3rd Kyu',  NULL,      12)
) AS c(title, centre, dow, st, et, min_belt, max_belt, cap);

-- Sessions: every matching day from 3 weeks ago to 3 weeks ahead
INSERT INTO class_sessions (class_id, session_date, start_time, end_time, instructor_id, status)
SELECT cl.id, d::date, cl.start_time, cl.end_time, cl.instructor_id,
       CASE WHEN d::date < CURRENT_DATE THEN 'completed' ELSE 'scheduled' END
FROM classes cl
CROSS JOIN generate_series(CURRENT_DATE - 21, CURRENT_DATE + 21, INTERVAL '1 day') AS d
WHERE EXTRACT(DOW FROM d) = cl.day_of_week;

-- Student: active monthly membership + credits
WITH s AS (SELECT id FROM users WHERE role = 'student' ORDER BY id LIMIT 1)
INSERT INTO memberships (student_id, plan_id, start_date, end_date, status)
SELECT s.id, (SELECT id FROM membership_plans WHERE name = 'Monthly'),
       CURRENT_DATE - 20, CURRENT_DATE + 10, 'active'
FROM s;

WITH s AS (SELECT id FROM users WHERE role = 'student' ORDER BY id LIMIT 1)
INSERT INTO credit_transactions (student_id, change, reason, note)
SELECT s.id, 8, 'membership_grant', 'Monthly plan credits' FROM s;

-- Student booked the past Beginner sessions (and attended all but one) plus the next one
WITH s AS (SELECT id FROM users WHERE role = 'student' ORDER BY id LIMIT 1),
     picked AS (
        SELECT cs.id, cs.session_date
        FROM class_sessions cs JOIN classes cl ON cl.id = cs.class_id
        WHERE cl.title = 'Beginner Fundamentals'
          AND cs.session_date <= CURRENT_DATE + 7
     )
INSERT INTO bookings (session_id, student_id)
SELECT picked.id, s.id FROM picked, s;

INSERT INTO credit_transactions (student_id, change, reason, booking_id)
SELECT b.student_id, -1, 'booking', b.id FROM bookings b;

INSERT INTO attendance (session_id, student_id, status, method, checked_in_at)
SELECT b.session_id, b.student_id,
       CASE WHEN ROW_NUMBER() OVER (ORDER BY cs.session_date) = 1 THEN 'absent' ELSE 'present' END,
       CASE WHEN ROW_NUMBER() OVER (ORDER BY cs.session_date) = 1 THEN 'manual' ELSE 'qr' END,
       cs.session_date + cs.start_time
FROM bookings b JOIN class_sessions cs ON cs.id = b.session_id
WHERE cs.session_date < CURRENT_DATE;

-- A sample failed and a successful payment
WITH s AS (SELECT id FROM users WHERE role = 'student' ORDER BY id LIMIT 1)
INSERT INTO payments (student_id, purpose, amount_cents, status, stripe_payment_intent_id, failure_reason, created_at)
SELECT s.id, p.purpose, p.amt, p.st, p.pi, p.fr, NOW() - p.ago::interval
FROM s, (VALUES
    ('membership', 8000, 'failed',    'pi_test_seed_failed_1', 'Your card was declined.', '21 days'),
    ('membership', 8000, 'succeeded', 'pi_test_seed_ok_1',     NULL,                      '20 days')
) AS p(purpose, amt, st, pi, fr, ago);

UPDATE memberships SET payment_id = (SELECT id FROM payments WHERE stripe_payment_intent_id = 'pi_test_seed_ok_1');

-- Upcoming grading
INSERT INTO grading_sessions (centre_id, grading_date, start_time, examiner_id, registration_closes_on)
SELECT (SELECT id FROM centres WHERE name = 'Bishan'),
       CURRENT_DATE + 30, '10:00',
       (SELECT id FROM users WHERE role = 'instructor' ORDER BY id LIMIT 1),
       CURRENT_DATE + 16;

COMMIT;
