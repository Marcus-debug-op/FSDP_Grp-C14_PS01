-- =====================================================================
-- dev_grading_apply_sample_data.sql
-- DEV / TEST BRANCHES ONLY, never production.   FSDP-65
--
-- Run after migration 006_confirmed_grading_fees_2025.sql.
--
-- Why this exists: applying for a grading needs a student who is BOTH
-- eligible for their next belt AND an active member (the /grading page is
-- only shown to active members, and the server checks the same thing).
-- On the Playground branch no student is both: Sample Student Ada and Ben
-- have the classes and the months but no membership, and the testers who
-- are members have not trained enough. So there was nobody to demonstrate
-- "Apply and pay the exam fee" with.
--
-- This gives Ada and Ben an active membership, and nothing else. It does not
-- touch their attendance, belts, or the applications they already have for
-- the 13 Dec grading -- the next grading (6 Dec) is a different session, so
-- they can still apply for it.
--
-- Safe to run more than once.
-- =====================================================================

BEGIN;

INSERT INTO memberships (student_id, plan_id, start_date, end_date, status)
SELECT u.id,
       -- Any ordinary plan; never the one-off registration package.
       (SELECT id FROM membership_plans
        WHERE is_active AND name <> 'Registration (New Member)'
        ORDER BY price_cents LIMIT 1),
       (NOW() AT TIME ZONE 'Asia/Singapore')::date,
       ((NOW() AT TIME ZONE 'Asia/Singapore')::date + INTERVAL '1 year' - INTERVAL '1 day')::date,
       'active'
FROM users u
WHERE u.email IN ('sample.ada@ask-sample.test', 'sample.ben@ask-sample.test')
  AND u.role = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.student_id = u.id AND m.status = 'active'
      AND m.end_date >= (NOW() AT TIME ZONE 'Asia/Singapore')::date
  );

-- Keeps the sign-up record in step, the same way a real payment does
-- (see paymentModel.markSucceeded).
UPDATE student_onboarding o
SET membership_status = 'active'
FROM users u
WHERE u.id = o.user_id
  AND u.email IN ('sample.ada@ask-sample.test', 'sample.ben@ask-sample.test');

COMMIT;

-- ---------------------------------------------------------------------
-- Check it worked: both should show active_member = true.
-- ---------------------------------------------------------------------
-- SELECT u.full_name,
--        EXISTS (SELECT 1 FROM memberships m WHERE m.student_id = u.id AND m.status = 'active'
--                AND m.end_date >= (NOW() AT TIME ZONE 'Asia/Singapore')::date) AS active_member
-- FROM users u
-- WHERE u.email IN ('sample.ada@ask-sample.test', 'sample.ben@ask-sample.test');
