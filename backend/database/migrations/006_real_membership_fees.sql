-- =====================================================================
-- 006_real_membership_fees.sql
-- Replaces the placeholder membership plans with the club's real fees
-- (from the Shinju-Kai "Registration and Membership Matters" page).
-- The fee only makes someone a member. It includes no lesson credits:
-- students buy credits separately (1 credit = 1 lesson).
--
-- Old plans are switched off, not deleted, because past memberships
-- still point at them.
-- Safe for production and safe to run more than once.
-- =====================================================================

BEGIN;

UPDATE membership_plans SET is_active = FALSE
WHERE name NOT IN ('Registration (New Member)', 'Annual Renewal', '5-Year Renewal');

INSERT INTO membership_plans (name, duration_months, price_cents, included_credits, is_active)
SELECT v.name, v.months, v.cents, 0, TRUE
FROM (VALUES
    ('Registration (New Member)', 12, 6000),   -- S$60, includes registration/material fees
    ('Annual Renewal',            12, 4800),   -- S$48, existing members
    ('5-Year Renewal',            60, 24000)   -- S$240, existing members
) AS v(name, months, cents)
WHERE NOT EXISTS (SELECT 1 FROM membership_plans p WHERE p.name = v.name);

COMMIT;
