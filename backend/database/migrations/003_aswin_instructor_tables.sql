-- =====================================================================
-- 003_aswin_instructor_tables.sql
-- Tables the instructor side needs on top of 001_shared_schema.sql.
-- Run after 001 and 002. Follows the rules in DATABASE.md.
--
-- Owners:  [ASWIN]   grading assessments, external attendance
--          [SHARED]  notifications, any feature can insert a row
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- [ASWIN] Grading assessments
-- ---------------------------------------------------------------------

-- One assessment per grading application. It ends at 'submitted':
-- processing results and approving belts is out of scope in the brief,
-- so this table never changes student_profiles.current_belt_id.
CREATE TABLE grading_assessments (
    id              SERIAL PRIMARY KEY,
    application_id  INTEGER NOT NULL UNIQUE REFERENCES grading_applications(id),
    instructor_id   INTEGER NOT NULL REFERENCES users(id),
    result          VARCHAR(20) CHECK (result IN ('pass', 'fail', 'deferred')),
    months_at_rank  INTEGER CHECK (months_at_rank >= 0),   -- snapshot on the grading day
    feedback        TEXT,
    signature_data  TEXT,                                  -- signature image as a data URL
    signed_at       TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'submitted')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (status = 'draft'
           OR (result IS NOT NULL AND signature_data IS NOT NULL AND signed_at IS NOT NULL))
);

-- ---------------------------------------------------------------------
-- [ASWIN] External attendance
-- ---------------------------------------------------------------------

-- Sessions outside the timetable, such as seminars. class_sessions must
-- belong to a class, so these are recorded here instead of in attendance.
CREATE TABLE external_attendance (
    id           SERIAL PRIMARY KEY,
    student_id   INTEGER NOT NULL REFERENCES users(id),
    event_name   VARCHAR(100) NOT NULL,
    location     VARCHAR(255),
    attended_on  DATE NOT NULL,
    recorded_by  INTEGER NOT NULL REFERENCES users(id),
    note         TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, event_name, attended_on)
);

-- ---------------------------------------------------------------------
-- [SHARED] Notifications
-- ---------------------------------------------------------------------

-- In-app notifications. email_status tracks the matching email, if any.
CREATE TABLE notifications (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type          VARCHAR(20) NOT NULL
                  CHECK (type IN ('welcome', 'booking_confirmed', 'payment_received',
                                  'grading_eligible', 'grading_update', 'attendance_follow_up')),
    title         VARCHAR(100) NOT NULL,
    body          TEXT,
    dedupe_key    VARCHAR(255) UNIQUE,    -- e.g. grading-eligible:12:5, stops repeat alerts
    email_status  VARCHAR(20) NOT NULL DEFAULT 'none'
                  CHECK (email_status IN ('none', 'pending', 'sent', 'failed')),
    read_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Indexes for the queries the dashboard runs most
-- ---------------------------------------------------------------------
CREATE INDEX idx_grading_assessments_instructor ON grading_assessments (instructor_id);
CREATE INDEX idx_external_attendance_student    ON external_attendance (student_id, attended_on DESC);
CREATE INDEX idx_notifications_user             ON notifications (user_id, read_at);

COMMIT;
