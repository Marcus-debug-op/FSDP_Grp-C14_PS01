-- 010_matthew_grading_admin.sql
-- Run once after 001 to 009. Safe to run more than once.
-- Only adds nullable columns, so existing rows and queries keep working.
--
-- grading_sessions: which belts a grading assesses (target belts, from and to).
-- grading_applications: the instructor who approved the student to grade.
--   An application is shown to the admin only once this is filled in.

BEGIN;

ALTER TABLE grading_sessions
    ADD COLUMN IF NOT EXISTS min_target_belt_id INTEGER REFERENCES belt_ranks(id),
    ADD COLUMN IF NOT EXISTS max_target_belt_id INTEGER REFERENCES belt_ranks(id);

ALTER TABLE grading_applications
    ADD COLUMN IF NOT EXISTS instructor_approved_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS instructor_approved_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grading_applications_instructor_approval_pair') THEN
        ALTER TABLE grading_applications
            ADD CONSTRAINT grading_applications_instructor_approval_pair
            CHECK ((instructor_approved_by IS NULL) = (instructor_approved_at IS NULL));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_grading_applications_session
    ON grading_applications (grading_session_id);

COMMIT;
