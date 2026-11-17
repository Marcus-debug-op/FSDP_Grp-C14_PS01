-- =====================================================================
-- 016_qj_real_lesson_packages.sql
-- Replaces the placeholder lesson credit packs with the club's real adult
-- passes (from the Shinju-Kai "Training Fees" page). 1 credit = 1 lesson.
--
-- Old packs are switched off, not deleted, so past purchases still make
-- sense. Credits students already bought are kept.
-- Safe for production and safe to run more than once.
-- =====================================================================

BEGIN;

UPDATE credit_packages SET is_active = FALSE
WHERE name NOT IN ('10 Lessons', '25 Lessons', '50 Lessons');

INSERT INTO credit_packages (name, credits, price_cents, is_active) VALUES
    ('10 Lessons', 10, 27000, TRUE),   -- S$270, S$27.00 per lesson
    ('25 Lessons', 25, 60000, TRUE),   -- S$600, S$24.00 per lesson
    ('50 Lessons', 50, 98000, TRUE)    -- S$980, S$19.60 per lesson
ON CONFLICT (name) DO UPDATE
SET credits = EXCLUDED.credits, price_cents = EXCLUDED.price_cents, is_active = TRUE;

COMMIT;
