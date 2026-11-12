-- dev_grading_admin_sample_data.sql  – DEV / TEST BRANCHES ONLY, never production.
-- Run after 010_matthew_grading_admin.sql and dev_instructor_sample_data.sql.
-- Safe to run more than once. Only touches @ask-sample.test students.
--
-- Gives the 13 Dec adult grading a belt range, adds applications for the
-- other sample students, and marks all but one as instructor-approved, so the
-- admin applications page shows eligible, not eligible and hidden cases.

BEGIN;

UPDATE grading_sessions g
SET min_target_belt_id = (SELECT id FROM belt_ranks WHERE name = '6th Kyu'),
    max_target_belt_id = (SELECT id FROM belt_ranks WHERE name = '1st Kyu')
WHERE g.grading_date = '2026-12-13' AND g.min_target_belt_id IS NULL;

INSERT INTO grading_applications (student_id, grading_session_id, target_belt_id)
SELECT u.id, g.id, nb.id
FROM users u
JOIN student_profiles sp ON sp.user_id = u.id
JOIN belt_ranks cb ON cb.id = sp.current_belt_id
JOIN belt_ranks nb ON nb.rank_order = cb.rank_order + 1
JOIN grading_sessions g ON g.grading_date = '2026-12-13'
WHERE u.email IN (
    'sample.ada@ask-sample.test', 'sample.ben@ask-sample.test', 'sample.dev@ask-sample.test',
    'sample.hari@ask-sample.test', 'sample.ivy@ask-sample.test', 'sample.kavya@ask-sample.test'
)
ON CONFLICT (student_id, grading_session_id) DO NOTHING;

UPDATE grading_applications ga
SET instructor_approved_by = (SELECT id FROM users WHERE email = 'robin.tan@ask-sample.test'),
    instructor_approved_at = NOW() - INTERVAL '2 days'
FROM users u, grading_sessions g
WHERE ga.student_id = u.id AND ga.grading_session_id = g.id
  AND g.grading_date = '2026-12-13'
  AND u.email IN (
      'sample.ada@ask-sample.test', 'sample.ben@ask-sample.test', 'sample.dev@ask-sample.test',
      'sample.hari@ask-sample.test', 'sample.ivy@ask-sample.test'
  )
  AND ga.instructor_approved_at IS NULL;

INSERT INTO memberships (student_id, plan_id, start_date, end_date, status)
SELECT u.id, p.id, (NOW() AT TIME ZONE 'Asia/Singapore')::date - 120, (NOW() AT TIME ZONE 'Asia/Singapore')::date + 240, 'active'
FROM users u
CROSS JOIN LATERAL (SELECT id FROM membership_plans ORDER BY id LIMIT 1) p
WHERE u.email IN ('sample.ada@ask-sample.test', 'sample.ben@ask-sample.test', 'sample.dev@ask-sample.test')
  AND NOT EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.student_id = u.id AND m.status = 'active'
        AND m.end_date >= (NOW() AT TIME ZONE 'Asia/Singapore')::date
  );

COMMIT;
