
-- Student signup and onboarding information
-- Run in Neon SQL Editor after creating the users table.

CREATE TABLE student_onboarding (
    user_id INTEGER PRIMARY KEY
        REFERENCES users(id) ON DELETE CASCADE,

    -- Step 1: Personal information
    date_of_birth DATE NOT NULL,
    gender VARCHAR(30) NOT NULL
        CHECK (gender IN (
            'male',
            'female',
            'other',
            'prefer_not_to_say'
        )),

    -- Step 2: Aikido experience
    experience_level VARCHAR(20) NOT NULL
        CHECK (experience_level IN ('beginner', 'experienced')),
    previous_rank VARCHAR(100) NOT NULL DEFAULT '',
    experience_notes VARCHAR(1000) NOT NULL DEFAULT '',

    -- Optional experience certificate
    evidence_filename VARCHAR(255),
    evidence_mime VARCHAR(50),
    evidence_data BYTEA,

    -- Step 3: Membership
    membership_plan VARCHAR(30) NOT NULL DEFAULT 'annual',
    membership_status VARCHAR(30) NOT NULL DEFAULT 'pending_payment'
        CHECK (membership_status IN (
            'pending_payment',
            'active',
            'expired'
        )),

    -- Step 4: Profile setup
    photo_mime VARCHAR(30),
    photo_data BYTEA,
    phone VARCHAR(30) NOT NULL DEFAULT '',
    training_goal VARCHAR(500) NOT NULL DEFAULT '',

    -- Record creation
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
