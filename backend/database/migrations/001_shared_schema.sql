-- =====================================================================
-- 001_shared_schema.sql
-- Aikido Shinjukai SMS – shared schema for the student portal
--
-- Conventions follow the existing public.users table (see DATABASE.md):
--   SERIAL ids, snake_case, plural table names, VARCHAR(100) names,
--   VARCHAR(255) emails/urls/external ids, VARCHAR(20) status values with
--   a CHECK list, TEXT for free text, TIMESTAMPTZ NOT NULL DEFAULT NOW().
--
-- Owners:  [SHARED]  everyone reads, change only after team agreement
--          [QJ]      lessons, attendance, payments
--          [MBG]     membership, belt progress, grading (teammate)
-- Never edit this file after it has been run on production.
-- Add a new numbered migration instead.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- [SHARED] Reference data
-- ---------------------------------------------------------------------

CREATE TABLE centres (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    address     VARCHAR(255),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE belt_ranks (
    id                   SERIAL PRIMARY KEY,
    name                 VARCHAR(100) NOT NULL UNIQUE,   -- e.g. '5th Kyu'
    colour               VARCHAR(20),
    rank_order           INTEGER NOT NULL UNIQUE,        -- 1 = lowest, next belt = rank_order + 1
    min_months_at_rank   INTEGER NOT NULL DEFAULT 0,     -- months at the PREVIOUS belt before grading for this one
    min_classes_at_rank  INTEGER NOT NULL DEFAULT 0,     -- classes attended at the PREVIOUS belt
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per student user. Holds the student-only fields that do not
-- belong on public.users (which is shared by all roles).
CREATE TABLE student_profiles (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_belt_id     INTEGER NOT NULL REFERENCES belt_ranks(id),
    belt_awarded_on     DATE NOT NULL DEFAULT CURRENT_DATE,   -- "time at current belt"
    home_centre_id      INTEGER REFERENCES centres(id),
    phone               VARCHAR(20),
    stripe_customer_id  VARCHAR(255) UNIQUE,                  -- written by [QJ] payments
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- [QJ] Lessons
-- ---------------------------------------------------------------------

-- The recurring weekly class (template).
CREATE TABLE classes (
    id             SERIAL PRIMARY KEY,
    title          VARCHAR(100) NOT NULL,
    centre_id      INTEGER NOT NULL REFERENCES centres(id),
    instructor_id  INTEGER NOT NULL REFERENCES users(id),     -- user with role 'instructor'
    day_of_week    SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0 = Sunday (matches JS getDay())
    start_time     TIME NOT NULL,
    end_time       TIME NOT NULL,
    min_belt_id    INTEGER REFERENCES belt_ranks(id),          -- NULL = no lower limit
    max_belt_id    INTEGER REFERENCES belt_ranks(id),          -- NULL = no upper limit
    capacity       INTEGER NOT NULL DEFAULT 20 CHECK (capacity > 0),
    credit_cost    INTEGER NOT NULL DEFAULT 1 CHECK (credit_cost >= 0),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time)
);

-- One dated occurrence of a class. Bookings, attendance and progress
-- notes all point here, never at classes.
CREATE TABLE class_sessions (
    id             SERIAL PRIMARY KEY,
    class_id       INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    session_date   DATE NOT NULL,
    start_time     TIME NOT NULL,
    end_time       TIME NOT NULL,
    instructor_id  INTEGER NOT NULL REFERENCES users(id),     -- copied from class, can be a substitute
    status         VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (class_id, session_date)
);

CREATE TABLE bookings (
    id            SERIAL PRIMARY KEY,
    session_id    INTEGER NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    student_id    INTEGER NOT NULL REFERENCES users(id),
    status        VARCHAR(20) NOT NULL DEFAULT 'booked'
                  CHECK (status IN ('booked', 'cancelled')),
    booked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at  TIMESTAMPTZ,
    UNIQUE (session_id, student_id)              -- re-booking flips status back to 'booked'
);

-- ---------------------------------------------------------------------
-- [QJ + instructor roster] Attendance
-- ---------------------------------------------------------------------

CREATE TABLE attendance (
    id             SERIAL PRIMARY KEY,
    session_id     INTEGER NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    student_id     INTEGER NOT NULL REFERENCES users(id),
    status         VARCHAR(20) NOT NULL DEFAULT 'present'
                   CHECK (status IN ('present', 'late', 'absent', 'excused')),
    method         VARCHAR(20) NOT NULL
                   CHECK (method IN ('qr', 'manual')),
    checked_in_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_by    INTEGER REFERENCES users(id),             -- instructor for 'manual', NULL for 'qr'
    UNIQUE (session_id, student_id)
);

-- ---------------------------------------------------------------------
-- [QJ] Payments – every Stripe charge in the system lands here,
-- including membership renewals and credit top-ups from [MBG].
-- ---------------------------------------------------------------------

CREATE TABLE payments (
    id                          SERIAL PRIMARY KEY,
    student_id                  INTEGER NOT NULL REFERENCES users(id),
    purpose                     VARCHAR(20) NOT NULL
                                CHECK (purpose IN ('membership', 'credit_topup', 'grading_fee', 'other')),
    amount_cents                INTEGER NOT NULL CHECK (amount_cents >= 0),   -- 12000 = S$120.00
    currency                    VARCHAR(3) NOT NULL DEFAULT 'sgd',
    status                      VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    stripe_checkout_session_id  VARCHAR(255) UNIQUE,
    stripe_payment_intent_id    VARCHAR(255) UNIQUE,
    failure_reason              TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- [MBG] Membership & credits
-- ---------------------------------------------------------------------

CREATE TABLE membership_plans (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(100) NOT NULL UNIQUE,
    duration_months   INTEGER NOT NULL CHECK (duration_months > 0),
    price_cents       INTEGER NOT NULL CHECK (price_cents >= 0),
    included_credits  INTEGER NOT NULL DEFAULT 0 CHECK (included_credits >= 0),
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- History of memberships. Current one = status 'active' AND end_date >= today.
CREATE TABLE memberships (
    id          SERIAL PRIMARY KEY,
    student_id  INTEGER NOT NULL REFERENCES users(id),
    plan_id     INTEGER NOT NULL REFERENCES membership_plans(id),
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
    payment_id  INTEGER REFERENCES payments(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

CREATE TABLE credit_packages (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL UNIQUE,
    credits      INTEGER NOT NULL CHECK (credits > 0),
    price_cents  INTEGER NOT NULL CHECK (price_cents >= 0),
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credit LEDGER. There is deliberately no "balance" column anywhere:
-- balance = SUM(change) for the student. Both owners only INSERT rows,
-- so nobody overwrites anybody else's update.
--   [MBG] writes: topup (+), membership_grant (+), adjustment (+/-)
--   [QJ]  writes: booking (-), booking_refund (+)
CREATE TABLE credit_transactions (
    id          SERIAL PRIMARY KEY,
    student_id  INTEGER NOT NULL REFERENCES users(id),
    change      INTEGER NOT NULL CHECK (change <> 0),
    reason      VARCHAR(20) NOT NULL
                CHECK (reason IN ('topup', 'membership_grant', 'booking', 'booking_refund', 'adjustment')),
    booking_id  INTEGER REFERENCES bookings(id),
    payment_id  INTEGER REFERENCES payments(id),
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- [MBG] Belt progress
-- ---------------------------------------------------------------------

-- Technique / syllabus items required to grade INTO a belt.
CREATE TABLE belt_requirements (
    id            SERIAL PRIMARY KEY,
    belt_rank_id  INTEGER NOT NULL REFERENCES belt_ranks(id) ON DELETE CASCADE,
    description   VARCHAR(255) NOT NULL,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student's own notes after a lesson. session_id links to [QJ]'s
-- class_sessions; NULL allowed for notes from outside a class.
CREATE TABLE progress_notes (
    id          SERIAL PRIMARY KEY,
    student_id  INTEGER NOT NULL REFERENCES users(id),
    session_id  INTEGER REFERENCES class_sessions(id) ON DELETE SET NULL,
    note        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- [MBG] Grading
-- ---------------------------------------------------------------------

CREATE TABLE grading_sessions (
    id                      SERIAL PRIMARY KEY,
    centre_id               INTEGER NOT NULL REFERENCES centres(id),
    grading_date            DATE NOT NULL,
    start_time              TIME NOT NULL,
    examiner_id             INTEGER REFERENCES users(id),
    registration_closes_on  DATE NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                            CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (registration_closes_on <= grading_date)
);

CREATE TABLE grading_applications (
    id                  SERIAL PRIMARY KEY,
    student_id          INTEGER NOT NULL REFERENCES users(id),
    grading_session_id  INTEGER NOT NULL REFERENCES grading_sessions(id),
    target_belt_id      INTEGER NOT NULL REFERENCES belt_ranks(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn', 'passed', 'failed')),
    remarks             TEXT,
    payment_id          INTEGER REFERENCES payments(id),         -- if a grading fee is charged
    applied_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at          TIMESTAMPTZ,
    UNIQUE (student_id, grading_session_id)
);

-- ---------------------------------------------------------------------
-- Indexes for the queries the dashboard runs most
-- ---------------------------------------------------------------------
CREATE INDEX idx_class_sessions_date        ON class_sessions (session_date);
CREATE INDEX idx_bookings_student           ON bookings (student_id);
CREATE INDEX idx_attendance_student         ON attendance (student_id);
CREATE INDEX idx_payments_student           ON payments (student_id, created_at DESC);
CREATE INDEX idx_memberships_student        ON memberships (student_id, end_date DESC);
CREATE INDEX idx_credit_transactions_student ON credit_transactions (student_id);
CREATE INDEX idx_progress_notes_student     ON progress_notes (student_id, created_at DESC);
CREATE INDEX idx_grading_sessions_date      ON grading_sessions (grading_date);
CREATE INDEX idx_grading_applications_student ON grading_applications (student_id);

COMMIT;
