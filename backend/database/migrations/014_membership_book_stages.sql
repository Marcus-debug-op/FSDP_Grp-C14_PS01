-- 014: Membership book stages (Marcus)
-- Admin tracks the physical membership book in 4 stages:
-- not_prepared -> preparing -> ready -> issued
-- Safe to re-run.

BEGIN;

ALTER TABLE membership_applications
  DROP CONSTRAINT IF EXISTS membership_applications_book_status_check;

-- Old value 'prepared' is renamed to 'preparing'.
UPDATE membership_applications SET book_status = 'preparing' WHERE book_status = 'prepared';

ALTER TABLE membership_applications
  ADD CONSTRAINT membership_applications_book_status_check
  CHECK (book_status IN ('not_prepared', 'preparing', 'ready', 'issued'));

COMMIT;