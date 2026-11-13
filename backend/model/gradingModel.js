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
     JOIN belt_ranks n ON n.rank_order = current.rank_order + 1
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
export async function findNextGradingSession(userId) {
  const result = await pool.query(
    `WITH next_belt AS (
       SELECT n.rank_order
       FROM student_profiles p
       JOIN belt_ranks c ON c.id = p.current_belt_id
       JOIN belt_ranks n ON n.rank_order = c.rank_order + 1
       WHERE p.user_id = $1
     )
     SELECT gs.id,
            to_char(gs.grading_date, 'YYYY-MM-DD')            AS grading_date,
            to_char(gs.start_time, 'HH24:MI')                 AS start_time,
            to_char(gs.registration_closes_on, 'YYYY-MM-DD')  AS registration_closes_on,
            (gs.registration_closes_on >= ${SGT_TODAY})       AS registration_open,
            (gs.registration_closes_on - ${SGT_TODAY})::int   AS days_to_deadline,
            (gs.grading_date - ${SGT_TODAY})::int             AS days_to_grading,
            c.name                                            AS centre_name,
            c.address                                         AS centre_address,
            COALESCE(minb.ladder, maxb.ladder)                AS ladder
     FROM grading_sessions gs
     LEFT JOIN centres c ON c.id = gs.centre_id
     LEFT JOIN belt_ranks minb ON minb.id = gs.min_target_belt_id
     LEFT JOIN belt_ranks maxb ON maxb.id = gs.max_target_belt_id
     WHERE gs.status = 'scheduled'
       AND gs.grading_date >= ${SGT_TODAY}
       AND (
         (minb.id IS NULL AND maxb.id IS NULL)
         OR EXISTS (
           SELECT 1 FROM next_belt nb
           WHERE (minb.id IS NULL OR nb.rank_order >= minb.rank_order)
             AND (maxb.id IS NULL OR nb.rank_order <= maxb.rank_order)
         )
       )
     ORDER BY gs.grading_date, gs.start_time
     LIMIT 1`,
    [userId]
  );
  return result.rows[0];
}

// The student's application for one grading session, if any.
// has already applied, and to enforce "can't apply twice" server-side.
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

// ---------------------------------------------------------------------
// apply for grading and pay the exam fee
// ---------------------------------------------------------------------

// The exam fee for grading TO a belt, in cents, from the ASK Grading SOP rows
// in grading_fee_schedule (migration 006).
//
// That table is keyed by text (category, grade_name, belt_colour), not by
// belt_ranks.id, so the two are matched by name here:
//   children's kyu  belt "Children Kyu 12 Red"  = "Children " + grade + " " + colour
//   dan grades      belt "Shodan" / "Junior Dan" = grade name, ignoring case
//   adult kyu       belt "6th Kyu"               = grade "Kyu 6"
// Checked against every seeded belt: each gradeable belt matches exactly one
// fee row, the two Ungraded belts match none, and no fee row is left over.
//
// Returns undefined unless there is exactly ONE match. A renamed belt, or a
// missing or duplicated fee row, must stop an application rather than charge a
// guess. Also returns undefined when the table itself is missing (migration
// 006 not run on this database) so the grading page still loads there.
export async function findExamFee(targetBeltId) {
  let result;
  try {
    result = await pool.query(
      `SELECT f.fee_cents, f.category, f.grade_name
       FROM belt_ranks b
       JOIN grading_fee_schedule f ON (
            (b.ladder = 'children' AND f.category = 'children_kyu'
               AND b.name = 'Children ' || f.grade_name || ' ' || f.belt_colour)
         OR (f.category = 'yudansha' AND lower(b.name) = lower(f.grade_name))
         OR (b.ladder = 'adult' AND f.category = 'adult_kyu'
               AND b.name ~ '^[0-9]+(st|nd|rd|th) Kyu$'
               AND f.grade_name = 'Kyu ' || substring(b.name from '^[0-9]+'))
       )
       WHERE b.id = $1`,
      [targetBeltId]
    );
  } catch (err) {
    if (err.code === "42P01") return undefined; // undefined_table
    throw err;
  }
  if (result.rows.length !== 1) return undefined;
  return { amountCents: result.rows[0].fee_cents };
}

// Grading-fee checkouts this student started recently and hasn't finished.
// Stripe checkouts expire after about 30 minutes (see paymentController), so
// anything older can't still be open. Used to hand back the SAME checkout if
// the student presses Apply twice, instead of opening a second one they could
// also pay.
export async function findRecentPendingFeePayments(userId) {
  const result = await pool.query(
    `SELECT id, stripe_checkout_session_id, amount_cents
     FROM payments
     WHERE student_id = $1
       AND purpose = 'grading_fee'
       AND status = 'pending'
       AND stripe_checkout_session_id IS NOT NULL
       AND created_at > NOW() - INTERVAL '35 minutes'
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

// Creates the grading application. Called ONLY from paymentModel.markSucceeded,
// inside its transaction, once Stripe has confirmed the exam fee -- which is
// what makes "the application is only created once the fee is paid" true.
// `client` is that transaction's client, so the application and the payment
// succeed or fail together.
//
// The row starts as 'pending' with no instructor approval, which is the state
// the instructor's approval screen and the admin's list both expect.
//
// grading_applications has UNIQUE (student_id, grading_session_id), so a
// student who withdrew or was rejected and applies again cannot get a second
// row. Their old row is brought back to 'pending' instead, with the new
// payment and any earlier approval cleared. A row in any other state is left
// alone and `created` comes back false: the student already has a live
// application, so this payment is a duplicate and must not disturb it.
export async function createApplicationFromPayment(client, { studentId, gradingSessionId, targetBeltId, paymentId }) {
  const result = await client.query(
    `INSERT INTO grading_applications (student_id, grading_session_id, target_belt_id, status, payment_id)
     VALUES ($1, $2, $3, 'pending', $4)
     ON CONFLICT (student_id, grading_session_id) DO UPDATE
       SET status = 'pending',
           target_belt_id = EXCLUDED.target_belt_id,
           payment_id = EXCLUDED.payment_id,
           applied_at = NOW(),
           decided_at = NULL,
           remarks = NULL,
           instructor_approved_by = NULL,
           instructor_approved_at = NULL
       WHERE grading_applications.status IN ('withdrawn', 'rejected')
     RETURNING id`,
    [studentId, gradingSessionId, targetBeltId, paymentId]
  );
  return result.rowCount === 1
    ? { created: true, applicationId: result.rows[0].id }
    : { created: false, applicationId: null };
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
