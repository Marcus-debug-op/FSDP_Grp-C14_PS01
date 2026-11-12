-- dev_children_grading_sample_data.sql  – DEV / TEST BRANCHES ONLY, never production.
-- Run after 011_children_belt_ladder.sql and dev_grading_admin_sample_data.sql.
-- Safe to run more than once. Every student here is made up.
--
-- Makes the 6 Dec grading the children's grading, adds three sample children
-- and has all of them apply with instructor approval:
--   Mei (10) is eligible, Leo needs more months and turns 13,
--   Ken has met every requirement but turns 13, so he needs an adult belt.
-- Needs student_onboarding (000_marcus_onboarding_migration.sql) for ages.

BEGIN;

UPDATE grading_sessions g
SET min_target_belt_id = (SELECT id FROM belt_ranks WHERE name = 'Children Kyu 12 Red'),
    max_target_belt_id = (SELECT id FROM belt_ranks WHERE name = 'Junior Dan')
WHERE g.grading_date = '2026-12-06' AND g.min_target_belt_id IS NULL;

INSERT INTO users (full_name, email, password_hash, role) VALUES
    ('Sample Child Mei', 'sample.mei@ask-sample.test', '!', 'student'),
    ('Sample Child Leo', 'sample.leo@ask-sample.test', '!', 'student'),
    ('Sample Child Ken', 'sample.ken@ask-sample.test', '!', 'student')
ON CONFLICT (email) DO NOTHING;

INSERT INTO student_profiles (user_id, current_belt_id, belt_awarded_on, home_centre_id)
SELECT u.id, b.id, (NOW() AT TIME ZONE 'Asia/Singapore')::date - v.days_ago, c.id
FROM (VALUES
    ('sample.mei@ask-sample.test', 'Children Kyu 10 Yellow', 150),
    ('sample.leo@ask-sample.test', 'Children Kyu 12 Red', 60),
    ('sample.ken@ask-sample.test', 'Children Kyu 4 Brown', 330)
) AS v(email, belt, days_ago)
JOIN users u ON u.email = v.email
JOIN belt_ranks b ON b.name = v.belt
JOIN centres c ON c.name = 'ASK Headquarters Dojo'
WHERE NOT EXISTS (SELECT 1 FROM student_profiles p WHERE p.user_id = u.id);

INSERT INTO student_onboarding (user_id, date_of_birth, gender, experience_level)
SELECT u.id, v.dob::date, 'prefer_not_to_say', 'beginner'
FROM (VALUES
    ('sample.mei@ask-sample.test', '2016-03-15'),
    ('sample.leo@ask-sample.test', '2013-11-20'),
    ('sample.ken@ask-sample.test', '2013-08-02')
) AS v(email, dob)
JOIN users u ON u.email = v.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO memberships (student_id, plan_id, start_date, end_date, status)
SELECT u.id, p.id, (NOW() AT TIME ZONE 'Asia/Singapore')::date - 150, (NOW() AT TIME ZONE 'Asia/Singapore')::date + 210, 'active'
FROM users u
CROSS JOIN LATERAL (SELECT id FROM membership_plans ORDER BY id LIMIT 1) p
WHERE u.email IN ('sample.mei@ask-sample.test', 'sample.leo@ask-sample.test', 'sample.ken@ask-sample.test')
  AND NOT EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.student_id = u.id AND m.status = 'active'
        AND m.end_date >= (NOW() AT TIME ZONE 'Asia/Singapore')::date
  );

INSERT INTO grading_applications (student_id, grading_session_id, target_belt_id, instructor_approved_by, instructor_approved_at)
SELECT u.id, g.id, nb.id,
       (SELECT id FROM users WHERE email = 'nicholas.lee@ask-sample.test'),
       NOW() - INTERVAL '1 day'
FROM users u
JOIN student_profiles sp ON sp.user_id = u.id
JOIN belt_ranks cb ON cb.id = sp.current_belt_id
JOIN belt_ranks nb ON nb.rank_order = cb.rank_order + 1
JOIN grading_sessions g ON g.grading_date = '2026-12-06'
WHERE u.email IN ('sample.mei@ask-sample.test', 'sample.leo@ask-sample.test', 'sample.ken@ask-sample.test')
ON CONFLICT (student_id, grading_session_id) DO NOTHING;

COMMIT;
