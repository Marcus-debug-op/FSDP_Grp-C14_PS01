-- =====================================================================
-- dev_personal_settings_sample_data.sql
-- DEV / TEST BRANCHES ONLY, never production.   FSDP-42
--
-- Run after migration 005_timely_personal_settings.sql.
--
-- Two jobs:
--
--  1. Give every student a student_onboarding row. The sign-up form always
--     creates one (userModel.createStudent does both inserts in one
--     transaction), but students added straight to `users` by SQL -- Tester1,
--     Tester2 and the Sample Student rows -- never got one. Without a row
--     there is nothing for the settings page to read or write.
--
--     Migration 005 deliberately does NOT do this, because date_of_birth,
--     gender and experience_level are NOT NULL with no default, and
--     backfilling them on production would mean inventing a date of birth for
--     a real person and then showing it back to them as their own. Here the
--     values are obviously fake and the branch is disposable, so it is fine.
--
--  2. Fill in sample contact details, so the nearby-dojo suggestions can be
--     demonstrated without typing an address in first. The six sample
--     addresses sit in six different postal districts (Bishan, Tampines,
--     Jurong West, Woodlands, Marine Parade, Toa Payoh) and are handed out in
--     user-id order, so different students really do get different
--     suggestions. Addresses are invented; the postal codes are valid sectors.
--
-- Safe to run more than once.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. A placeholder onboarding row for any student missing one.
--    1 Jan 2000 / prefer_not_to_say / beginner are placeholders, not data.
-- ---------------------------------------------------------------------
INSERT INTO student_onboarding (user_id, date_of_birth, gender, experience_level)
SELECT u.id, DATE '2000-01-01', 'prefer_not_to_say', 'beginner'
FROM users u
WHERE u.role = 'student'
  AND NOT EXISTS (SELECT 1 FROM student_onboarding o WHERE o.user_id = u.id);

-- ---------------------------------------------------------------------
-- 2. Sample contact details, cycled across students in user-id order.
-- ---------------------------------------------------------------------
UPDATE student_onboarding o
SET phone                          = s.phone,
    address                        = s.address,
    postal_code                    = s.postal,
    emergency_contact_name         = s.ec_name,
    emergency_contact_phone        = s.ec_phone,
    emergency_contact_relationship = s.ec_rel,
    updated_at                     = NOW()
FROM (
    SELECT r.id AS user_id, v.*
    FROM (
        SELECT u.id, ROW_NUMBER() OVER (ORDER BY u.id) AS n
        FROM users u
        WHERE u.role = 'student'
    ) r
    JOIN (VALUES
        -- The unit number is part of the address now, written the way a
        -- student would type it, so these double as examples of the format.
        -- n, address (unit included),                       postal,   phone,      emergency name, emergency phone, relationship
        (1, 'Blk 123 Bishan Street 12, #08-34',              '570123', '81110001', 'Mei Ling Tan', '81110002',      'Mother'),
        (2, 'Blk 455 Tampines Street 42, #11-07',            '520455', '81110003', 'Arun Raj',     '81110004',      'Father'),
        (3, 'Blk 678 Jurong West Street 65, #04-12',         '641678', '81110005', 'Siti Noor',    '81110006',      'Spouse'),
        (4, 'Blk 12 Woodlands Crescent',                     '738012', '81110007', 'Kumar Selvam', '81110008',      'Brother'),
        (5, 'Blk 90 Marine Parade Road, #15-02',             '440090', '81110009', 'Grace Lim',    '81110010',      'Sister'),
        (6, 'Blk 7 Toa Payoh Lorong 7, #03-18',              '310007', '81110011', 'Daniel Wong',  '81110012',      'Friend')
    ) AS v(n, address, postal, phone, ec_name, ec_phone, ec_rel)
      ON v.n = ((r.n - 1) % 6) + 1
) s
WHERE o.user_id = s.user_id;

COMMIT;

-- ---------------------------------------------------------------------
-- Check it worked: every student should have a row, a 6-digit postal code,
-- and an emergency contact.
-- ---------------------------------------------------------------------
-- SELECT u.id, u.full_name, o.phone, o.address, o.postal_code,
--        o.emergency_contact_name, o.emergency_contact_relationship
-- FROM users u
-- LEFT JOIN student_onboarding o ON o.user_id = u.id
-- WHERE u.role = 'student'
-- ORDER BY u.id;
