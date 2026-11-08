-- 005_marcus_membership_applications.sql
-- Apply once on the SAME Neon branch as the running backend, after 001_shared_schema.sql.
-- Does not touch existing payments or memberships.
-- One initial membership application per student. Renewals continue using memberships.
CREATE TABLE IF NOT EXISTS membership_applications (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES membership_plans(id),
    centre_id INTEGER NOT NULL REFERENCES centres(id),
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'
       CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    book_status VARCHAR(20) NOT NULL DEFAULT 'not_prepared'
       CHECK (book_status IN ('not_prepared', 'prepared', 'issued')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT application_review_consistency CHECK (
      (approval_status = 'pending' AND approved_by IS NULL AND reviewed_at IS NULL)
      OR (approval_status <> 'pending' AND reviewed_at IS NOT NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_membership_applications_approval
    ON membership_applications(approval_status, created_at);
