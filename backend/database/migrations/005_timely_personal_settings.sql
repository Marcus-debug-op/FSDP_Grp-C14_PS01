-- =====================================================================
-- 005_timely_personal_settings.sql
-- FSDP-42 "Manage personal settings"  (parent: FSDP-7 Student-Dashboard)
--
-- Lets a student keep their own contact details correct.
--
-- The editable fields live on student_onboarding, next to the phone
-- number the sign-up form already collects. That table gets a row in the
-- same transaction as the account itself (see userModel.createStudent),
-- so a student can fix their details the moment they sign up.
-- student_profiles is only filled in later, when the front desk records a
-- belt and a home dojo, so it would be the wrong home for these fields.
--
-- Belt and membership stay view-only: nothing here grants write access to
-- student_profiles, belt_ranks or memberships. The one thing the student
-- may change outside this table is student_profiles.home_centre_id, after
-- confirming a suggested nearby dojo -- that is an existing column, not a
-- schema change, and the student always confirms it explicitly.
--
-- Additive only, and safe to run more than once.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Step 4 (profile setup): home address and emergency contact
--
-- The whole address, unit number included, goes in one `address` column.
-- VARCHAR(255) for an address is the rule in DATABASE.md section 1, and it
-- matches centres.address, so a student address and a dojo address are
-- stored the same way.
--
-- Same idiom as the optional text already on this table (previous_rank,
-- experience_notes, phone, training_goal): VARCHAR ... NOT NULL DEFAULT '',
-- so "not filled in yet" is an empty string and never NULL. Every column
-- is additive with a default, so existing rows and existing code are
-- unaffected.
-- ---------------------------------------------------------------------
ALTER TABLE student_onboarding
    ADD COLUMN IF NOT EXISTS address                        VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS postal_code                    VARCHAR(6)   NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS emergency_contact_name         VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS emergency_contact_phone        VARCHAR(30)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50)  NOT NULL DEFAULT '';

-- Rows on this table are edited now, not just inserted at sign-up, so it
-- needs updated_at (DATABASE.md section 1). Existing rows get NOW(), which
-- is wrong in spirit but harmless: nothing reads it for those rows yet.
ALTER TABLE student_onboarding
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ---------------------------------------------------------------------
-- A Singapore postal code is exactly 6 digits. '' means "not given yet".
-- The nearby-dojo suggestions read this column, so a malformed value here
-- would silently produce no suggestions rather than an obvious error.
-- ---------------------------------------------------------------------
ALTER TABLE student_onboarding
    DROP CONSTRAINT IF EXISTS student_onboarding_postal_code_check;

ALTER TABLE student_onboarding
    ADD  CONSTRAINT student_onboarding_postal_code_check
    CHECK (postal_code = '' OR postal_code ~ '^[0-9]{6}$');

-- ---------------------------------------------------------------------
-- Tidy-up for dev branches only.
--
-- An earlier draft of this migration, before it was merged, split the
-- address into address_line1 + address_line2. Anyone who ran that draft on
-- their own Neon branch still has those two columns. Dropping them keeps a
-- dev branch matching this file, which is the source of truth.
--
-- On production both lines are a no-op with a notice, because those columns
-- were never created there. Once every branch is clean these two lines can
-- be deleted.
-- ---------------------------------------------------------------------
ALTER TABLE student_onboarding
    DROP COLUMN IF EXISTS address_line1,
    DROP COLUMN IF EXISTS address_line2;

COMMIT;

-- =====================================================================
-- NOTE FOR THE TEAM
--
-- This migration does NOT create student_onboarding rows for students who
-- do not have one. date_of_birth, gender and experience_level are NOT NULL
-- with no default, so backfilling would mean inventing a date of birth for
-- a real person, and that fake value would then be shown back to them as
-- their own.
--
-- Students created by SQL rather than by the sign-up form (Tester1,
-- Tester2 and the Sample Student rows) therefore have no row on this table
-- and cannot save contact details. That is a test-data gap, not a
-- production one: dev_personal_settings_sample_data.sql now inserts
-- placeholder rows for them, with obviously fake personal details, on dev
-- branches only.
--
-- If an admin-created-student path is ever added for production, it must
-- insert a student_onboarding row too, exactly as createStudent does.
-- =====================================================================
