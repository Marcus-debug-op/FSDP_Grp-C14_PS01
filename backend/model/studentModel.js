// MODEL: SQL for the student dashboard. Tables come from
// database/migrations/001_shared_schema.sql (see database/DATABASE.md).
import pool from "../db.js";
import { CANCEL_NOTICE_HOURS } from "./lessonModel.js";

// "Today" in Singapore, not in the database server's UTC.
const TODAY = "(NOW() AT TIME ZONE 'Asia/Singapore')::date";

// Current belt, the belts either side of it, and how long it has been held.
export async function getRank(studentId) {
  const result = await pool.query(
    `SELECT cb.name AS current_belt, cb.colour AS current_colour,
            pb.name AS previous_belt, nb.name AS next_belt,
            nb.min_months_at_rank, nb.min_classes_at_rank,
            to_char(sp.belt_awarded_on, 'YYYY-MM-DD') AS belt_awarded_on,
            (EXTRACT(YEAR FROM age(${TODAY}, sp.belt_awarded_on)) * 12
             + EXTRACT(MONTH FROM age(${TODAY}, sp.belt_awarded_on)))::int AS months_at_rank,
            ce.name AS home_centre, sp.home_centre_id, cb.rank_order
     FROM student_profiles sp
     JOIN belt_ranks cb ON cb.id = sp.current_belt_id
     LEFT JOIN belt_ranks pb ON pb.rank_order = cb.rank_order - 1
     LEFT JOIN belt_ranks nb ON nb.rank_order = cb.rank_order + 1
     LEFT JOIN centres ce ON ce.id = sp.home_centre_id
     WHERE sp.user_id = $1`,
    [studentId]
  );
  return result.rows[0];
}

// Classes attended (present or late) since a date.
export async function countClassesSince(studentId, sinceDate) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM attendance a
     JOIN class_sessions cs ON cs.id = a.session_id
     WHERE a.student_id = $1 AND a.status IN ('present', 'late')
       AND cs.session_date >= $2`,
    [studentId, sinceDate]
  );
  return result.rows[0].count;
}

// The next lesson the student has booked that hasn't started yet, plus
// whether cancelling it now would give the credit back (FSDP-55).
export async function getNextBookedClass(studentId) {
  const result = await pool.query(
    `SELECT cs.id AS session_id, cl.title, ce.name AS centre, u.full_name AS instructor,
            to_char(cs.session_date, 'YYYY-MM-DD') AS session_date,
            to_char(cs.start_time, 'HH24:MI') AS start_time,
            ((cs.session_date + cs.start_time - make_interval(hours => $2::int))
              AT TIME ZONE 'Asia/Singapore' > NOW()) AS free_cancel,
            to_char(cs.session_date + cs.start_time - make_interval(hours => $2::int), 'YYYY-MM-DD') AS cancel_by_date,
            to_char(cs.session_date + cs.start_time - make_interval(hours => $2::int), 'HH24:MI') AS cancel_by_time
     FROM bookings b
     JOIN class_sessions cs ON cs.id = b.session_id
     JOIN classes cl ON cl.id = cs.class_id
     JOIN centres ce ON ce.id = cl.centre_id
     JOIN users u ON u.id = cs.instructor_id
     WHERE b.student_id = $1 AND b.status = 'booked'
       AND cs.status = 'scheduled' AND cs.session_date >= ${TODAY}
       AND ((cs.session_date + cs.start_time) AT TIME ZONE 'Asia/Singapore') > NOW()
     ORDER BY cs.session_date, cs.start_time
     LIMIT 1`,
    [studentId, CANCEL_NOTICE_HOURS]
  );
  return result.rows[0] || null;
}

// Sessions attended this month, plus the overall rate:
// attended / booked lessons that have already happened.
export async function getAttendanceSummary(studentId) {
  const result = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM attendance a
          JOIN class_sessions cs ON cs.id = a.session_id
         WHERE a.student_id = $1 AND a.status IN ('present', 'late')
           AND date_trunc('month', cs.session_date) = date_trunc('month', ${TODAY})) AS this_month,
       (SELECT COUNT(*)::int FROM attendance a
         WHERE a.student_id = $1 AND a.status IN ('present', 'late')) AS attended,
       (SELECT COUNT(*)::int FROM bookings b
          JOIN class_sessions cs ON cs.id = b.session_id
         WHERE b.student_id = $1 AND b.status = 'booked'
           AND cs.session_date < ${TODAY}) AS past_booked`,
    [studentId]
  );
  return result.rows[0];
}

// The membership in force today (or the most recent one if none is).
export async function getMembership(studentId) {
  const result = await pool.query(
    `SELECT mp.name AS plan, m.status,
            to_char(m.end_date, 'YYYY-MM-DD') AS end_date,
            (m.end_date - ${TODAY})::int AS days_left
     FROM memberships m
     JOIN membership_plans mp ON mp.id = m.plan_id
     WHERE m.student_id = $1 AND m.status IN ('active', 'expired')
     ORDER BY (m.status = 'active' AND m.end_date >= ${TODAY}) DESC, m.end_date DESC
     LIMIT 1`,
    [studentId]
  );
  return result.rows[0] || null;
}

// Credit balance = sum of the ledger.
export async function getCreditBalance(studentId) {
  const result = await pool.query(
    "SELECT COALESCE(SUM(change), 0)::int AS balance FROM credit_transactions WHERE student_id = $1",
    [studentId]
  );
  return result.rows[0].balance;
}

// Classes that suit the student's belt, each with its next open session.
// Classes made for the student's level come before open-to-all classes.
export async function getRecommendedClasses(studentId, rankOrder, limit = 3) {
  const result = await pool.query(
    `SELECT cl.id, cl.title, ce.name AS centre,
            to_char(ns.session_date, 'YYYY-MM-DD') AS session_date,
            to_char(cl.start_time, 'HH24:MI') AS start_time,
            (cl.min_belt_id IS NULL AND cl.max_belt_id IS NULL) AS open_to_all
     FROM classes cl
     JOIN centres ce ON ce.id = cl.centre_id
     LEFT JOIN belt_ranks minb ON minb.id = cl.min_belt_id
     LEFT JOIN belt_ranks maxb ON maxb.id = cl.max_belt_id
     JOIN LATERAL (
       SELECT cs.id, cs.session_date FROM class_sessions cs
       WHERE cs.class_id = cl.id AND cs.status = 'scheduled' AND cs.session_date >= ${TODAY}
         AND NOT EXISTS (SELECT 1 FROM bookings b
                         WHERE b.session_id = cs.id AND b.student_id = $1 AND b.status = 'booked')
       ORDER BY cs.session_date LIMIT 1
     ) ns ON TRUE
     WHERE cl.is_active
       AND (minb.rank_order IS NULL OR minb.rank_order <= $2)
       AND (maxb.rank_order IS NULL OR maxb.rank_order >= $2)
     ORDER BY open_to_all, ns.session_date, cl.start_time
     LIMIT $3`,
    [studentId, rankOrder, limit]
  );
  return result.rows;
}

// Most recent payments, successful or not.
export async function getRecentPayments(studentId, limit = 5) {
  const result = await pool.query(
    `SELECT id, purpose, amount_cents, currency, status,
            to_char(created_at AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD') AS paid_on
     FROM payments
     WHERE student_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [studentId, limit]
  );
  return result.rows;
}

// Next grading session still taking applications (home centre first),
// and whether the student has already applied to it.
export async function getOpenGrading(studentId, homeCentreId) {
  const result = await pool.query(
    `SELECT gs.id, ce.name AS centre,
            to_char(gs.grading_date, 'YYYY-MM-DD') AS grading_date,
            to_char(gs.registration_closes_on, 'YYYY-MM-DD') AS closes_on,
            ga.status AS application_status
     FROM grading_sessions gs
     JOIN centres ce ON ce.id = gs.centre_id
     LEFT JOIN grading_applications ga ON ga.grading_session_id = gs.id AND ga.student_id = $1
     WHERE gs.status = 'scheduled' AND gs.registration_closes_on >= ${TODAY}
     ORDER BY (gs.centre_id = $2) DESC NULLS LAST, gs.grading_date
     LIMIT 1`,
    [studentId, homeCentreId]
  );
  return result.rows[0] || null;
}

// Read-only onboarding profile for the authenticated student; never expose photo bytes here.
export async function getStudentProfile(userId) {
  const result = await pool.query(
    `SELECT u.id, u.full_name, u.email,
            to_char(o.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
            o.gender, o.experience_level, o.previous_rank, o.experience_notes,
            o.evidence_filename, o.membership_plan, o.membership_status,
            o.phone, o.training_goal,
            (o.photo_data IS NOT NULL) AS has_photo,
            to_char(o.created_at AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD') AS joined_on
     FROM users u
     LEFT JOIN student_onboarding o ON o.user_id = u.id
     WHERE u.id = $1 AND u.role = 'student'`,
    [userId]
  );
  return result.rows[0] || null;
}
