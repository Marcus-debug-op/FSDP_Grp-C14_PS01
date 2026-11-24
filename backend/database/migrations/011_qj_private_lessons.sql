-- =====================================================================
-- 011_qj_private_lessons.sql
-- Creates the private_lessons table (1-on-1 lesson requests and bookings)
-- and links credit_transactions to it.
--
-- This table already exists on the shared Neon branches (it was created by
-- hand), but no migration created it, so a fresh database failed at
-- 012_lesson_offers_and_cover_requests.sql, which references it.
-- Must run before 012. Matches the existing table exactly.
-- Safe to run on branches that already have it (IF NOT EXISTS).
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS private_lessons (
    id             SERIAL PRIMARY KEY,
    student_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    centre_id      INTEGER NOT NULL REFERENCES centres(id),
    preferred_date DATE NOT NULL,
    preferred_time VARCHAR(100),
    student_note   TEXT,
    instructor_id  INTEGER REFERENCES users(id),
    lesson_date    DATE,
    start_time     TIME,
    end_time       TIME,
    credit_cost    INTEGER NOT NULL DEFAULT 3 CHECK (credit_cost >= 0),
    status         VARCHAR(20) NOT NULL DEFAULT 'requested'
                   CHECK (status IN ('requested', 'scheduled', 'completed', 'no_show', 'cancelled', 'declined')),
    admin_note     TEXT,
    scheduled_by   INTEGER REFERENCES users(id),
    requested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scheduled_at   TIMESTAMPTZ,
    cancelled_at   TIMESTAMPTZ,
    -- A scheduled (or later) lesson must have an instructor, date and times.
    CHECK (status IN ('requested', 'declined')
           OR (instructor_id IS NOT NULL AND lesson_date IS NOT NULL
               AND start_time IS NOT NULL AND end_time IS NOT NULL)),
    CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_private_lessons_instructor_date ON private_lessons (instructor_id, lesson_date);
CREATE INDEX IF NOT EXISTS idx_private_lessons_status ON private_lessons (status);

-- Credits spent or refunded on a private lesson point back to it
-- (also only ever added by hand before this migration).
ALTER TABLE credit_transactions
    ADD COLUMN IF NOT EXISTS private_lesson_id INTEGER REFERENCES private_lessons(id);

COMMIT;
