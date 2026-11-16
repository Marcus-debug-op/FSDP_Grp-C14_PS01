-- 015: Backfill starting belts (Marcus)
-- Gives a starting belt to members who have paid and have an active membership
-- but no belt record yet, so the belt and grading pages work for them.
-- Children (12 and under) start on the first children's belt; everyone else on "Ungraded".
-- A previous rank from another dojo is NOT copied: it stays pending until confirmed.
-- New members get this automatically on activation (registrationActivationModel.js).
-- Safe to re-run: members who already have a belt are skipped.

BEGIN;

INSERT INTO student_profiles (user_id, current_belt_id, belt_awarded_on, home_centre_id)
SELECT u.id,
       (SELECT br.id FROM belt_ranks br
         WHERE br.ladder = CASE WHEN date_part('year', age(CURRENT_DATE, o.date_of_birth)) <= 12
                                THEN 'children' ELSE 'adult' END
         ORDER BY br.rank_order LIMIT 1),
       CURRENT_DATE,
       a.centre_id
FROM users u
JOIN student_onboarding o ON o.user_id = u.id
LEFT JOIN membership_applications a ON a.student_id = u.id
WHERE u.role = 'student'
  AND EXISTS (SELECT 1 FROM memberships m
              JOIN payments p ON p.id = m.payment_id AND p.status = 'succeeded'
              WHERE m.student_id = u.id AND m.status = 'active'
                AND CURRENT_DATE BETWEEN m.start_date AND m.end_date)
  AND NOT EXISTS (SELECT 1 FROM student_profiles sp WHERE sp.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
