-- Run ONCE in your Neon SQL editor BEFORE testing the new signup.
-- Safe to run more than once; does not change your existing users table.
CREATE TABLE IF NOT EXISTS student_onboarding (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  experience_level VARCHAR(20) NOT NULL CHECK (experience_level IN ('beginner', 'experienced')),
  previous_rank VARCHAR(100) NOT NULL DEFAULT '',
  experience_notes VARCHAR(1000) NOT NULL DEFAULT '',
  evidence_filename VARCHAR(255),
  evidence_mime VARCHAR(50),
  evidence_data BYTEA,
  membership_status VARCHAR(30) NOT NULL DEFAULT 'pending_payment'
    CHECK (membership_status IN ('pending_payment', 'active', 'expired')),
  membership_plan VARCHAR(30) NOT NULL DEFAULT 'annual',
  preferred_name VARCHAR(100) NOT NULL DEFAULT '',
  phone VARCHAR(30) NOT NULL DEFAULT '',
  training_goal VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Also supports databases where student_onboarding already existed
-- before date of birth was added.
ALTER TABLE student_onboarding ADD COLUMN IF NOT EXISTS date_of_birth DATE;
