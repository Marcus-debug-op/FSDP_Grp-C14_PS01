  -- Additional review state for photos. Shared database: coordinate before applying.
  -- Does not change Shihan approval or payments.
  ALTER TABLE membership_applications
    ADD COLUMN IF NOT EXISTS photo_review_status VARCHAR(30) NOT NULL DEFAULT 'pending_review',
    ADD COLUMN IF NOT EXISTS photo_review_note TEXT,
    ADD COLUMN IF NOT EXISTS photo_requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS photo_requested_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS photo_resubmitted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS photo_accepted_at TIMESTAMPTZ;

  ALTER TABLE membership_applications
    DROP CONSTRAINT IF EXISTS membership_applications_photo_review_status_check;
  ALTER TABLE membership_applications
    ADD CONSTRAINT membership_applications_photo_review_status_check
    CHECK (photo_review_status IN ('pending_review', 'resubmission_requested', 'resubmitted', 'accepted'));
