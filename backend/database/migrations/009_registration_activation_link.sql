-- Run once in the shared Neon development branch AFTER 005 and 008.
-- Explicitly link a new member application to ONE verified payment.
-- Does not overwrite existing applications, prices or payment statuses.
ALTER TABLE membership_applications
  ADD COLUMN IF NOT EXISTS registration_payment_id INTEGER
    REFERENCES payments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_registration_payment
  ON membership_applications(registration_payment_id)
  WHERE registration_payment_id IS NOT NULL;

-- Prevent a single payment from granting a membership more than once.
-- Before applying this on an existing shared DB, run the duplicate check in README.
CREATE UNIQUE INDEX IF NOT EXISTS uq_memberships_payment_id
  ON memberships(payment_id)
  WHERE payment_id IS NOT NULL;
