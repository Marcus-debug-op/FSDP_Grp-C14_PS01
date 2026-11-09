// =====================================================================
import pool from "../db.js";

// "Today" in Singapore, not the database server's UTC. Same helper the other
// models use, so every date boundary in the app agrees.
const SGT_TODAY = "(NOW() AT TIME ZONE 'Asia/Singapore')::date";

// Attendance that counts toward grading. 'late' counts -- the student trained.
// 'absent' and 'excused' do not.
const COUNTS_AS_ATTENDED = "('present', 'late')";

// Hours come from internal sessions only. external_attendance records a date
// but no times, so there is nothing to measure; the UI says so rather than
// inventing a nominal duration.
//
// The window is strictly AFTER belt_awarded_on: a class on the day a belt was
// awarded belongs to the cycle that earned it, not the next one.
//
// Returns one row even when the student has no profile or no attendance, with
// zeroes, so callers never have to special-case an empty result.
export async function findTrainingSinceBelt(userId) {
  const result = await pool.query(
    `WITH me AS (
       SELECT p.user_id, p.belt_awarded_on
       FROM student_profiles p
       WHERE p.user_id = $1
     ),
     internal AS (
       SELECT
         COUNT(*)::int AS classes,
         COALESCE(SUM(
           (cs.end_time - cs.start_time)
           -- A session that ends "before" it starts has run past midnight.
           + CASE WHEN cs.end_time < cs.start_time THEN INTERVAL '24 hours' ELSE INTERVAL '0' END
         ), INTERVAL '0') AS trained
       FROM attendance a
       JOIN class_sessions cs ON cs.id = a.session_id
       JOIN me ON a.student_id = me.user_id
       WHERE a.status IN ${COUNTS_AS_ATTENDED}
         AND cs.status <> 'cancelled'
         AND cs.session_date > me.belt_awarded_on
     ),
     external AS (
       SELECT COUNT(*)::int AS classes
       FROM external_attendance e
       JOIN me ON e.student_id = me.user_id
       WHERE e.attended_on > me.belt_awarded_on
     )
     SELECT
       i.classes                                            AS internal_classes,
       x.classes                                            AS external_classes,
       (i.classes + x.classes)                              AS classes_attended,
       ROUND((EXTRACT(EPOCH FROM i.trained) / 3600.0)::numeric, 1) AS hours_attended
     FROM internal i CROSS JOIN external x`,
    [userId]
  );
  return result.rows[0];
}

// The belt immediately above the student's current one, with the thresholds
// needed to attain it (see the note at the top of this file).
// Returns undefined when the student is already at the highest recorded belt,
// or has no profile row -- the controller tells those two apart using
// beltModel.findCurrentBelt.
export async function findNextBelt(userId) {
  const result = await pool.query(
    `SELECT n.id, n.name, n.colour, n.rank_order,
            n.min_months_at_rank, n.min_classes_at_rank
     FROM student_profiles p
     JOIN belt_ranks current ON current.id = p.current_belt_id
     JOIN belt_ranks n ON n.rank_order > current.rank_order
     WHERE p.user_id = $1
     ORDER BY n.rank_order
     LIMIT 1`,
    [userId]
  );
  return result.rows[0];
}

// The soonest grading session a student could still be assessed at.
//
// Only 'scheduled' sessions on or after today: a completed or cancelled one is
// not something to apply for. Sessions whose registration has already closed
// are still returned, with registration_open false, because "the deadline has
// passed" is more useful to show than an empty panel.
export async function findNextGradingSession() {
  const result = await pool.query(
    `SELECT gs.id,
            to_char(gs.grading_date, 'YYYY-MM-DD')            AS grading_date,
            to_char(gs.start_time, 'HH24:MI')                 AS start_time,
            to_char(gs.registration_closes_on, 'YYYY-MM-DD')  AS registration_closes_on,
            (gs.registration_closes_on >= ${SGT_TODAY})       AS registration_open,
            (gs.registration_closes_on - ${SGT_TODAY})::int   AS days_to_deadline,
            (gs.grading_date - ${SGT_TODAY})::int             AS days_to_grading,
            c.name                                            AS centre_name,
            c.address                                         AS centre_address
     FROM grading_sessions gs
     LEFT JOIN centres c ON c.id = gs.centre_id
     WHERE gs.status = 'scheduled'
       AND gs.grading_date >= ${SGT_TODAY}
     ORDER BY gs.grading_date, gs.start_time
     LIMIT 1`
  );
  return result.rows[0];
}

// The student's application for one grading session, if any.
// has already applied, and FSDP-65 to enforce "can't apply twice" server-side.
// 'withdrawn' and 'rejected' applications are returned too -- the caller
// decides whether those should block a fresh attempt.
export async function findApplicationForSession(userId, gradingSessionId) {
  const result = await pool.query(
    `SELECT ga.id, ga.status, ga.target_belt_id, ga.payment_id,
            to_char(ga.applied_at AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD') AS applied_on
     FROM grading_applications ga
     WHERE ga.student_id = $1 AND ga.grading_session_id = $2`,
    [userId, gradingSessionId]
  );
  return result.rows[0];
}

// The syllabus a student has to demonstrate for a given belt. Reference text,
// not eligibility rules -- belt_requirements holds descriptions such as
// "Shomen-uchi ikkyo (omote and ura)", keyed to the belt being attained.
export async function findSyllabusFor(beltRankId) {
  const result = await pool.query(
    `SELECT description
     FROM belt_requirements
     WHERE belt_rank_id = $1
     ORDER BY sort_order, id`,
    [beltRankId]
  );
  return result.rows.map((row) => row.description);
}
