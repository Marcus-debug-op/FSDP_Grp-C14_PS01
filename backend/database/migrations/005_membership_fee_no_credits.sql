-- =====================================================================
-- 005_membership_fee_no_credits.sql
-- The membership fee no longer includes lesson credits. Students pay the
-- membership fee to be a member, and buy lesson credits separately
-- (1 credit = 1 lesson). Booking needs an active membership AND credits.
--
-- Credits students already received from earlier memberships are kept.
-- Safe for production and safe to run more than once.
-- =====================================================================

BEGIN;

UPDATE membership_plans SET included_credits = 0 WHERE included_credits <> 0;

COMMIT;
