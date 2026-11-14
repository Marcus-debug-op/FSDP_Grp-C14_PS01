// MODEL: SQL for the instructor side. Tables come from
// database/migrations/001_shared_schema.sql (see database/DATABASE.md).
import pool from "../db.js";

// "Today" in Singapore, not in the database server's UTC.
const TODAY = "(NOW() AT TIME ZONE 'Asia/Singapore')::date";

// Attendance closes 24 hours after the class ends.
const ATTENDANCE_CLOSED =
  "NOW() > ((cs.session_date + cs.end_time) AT TIME ZONE 'Asia/Singapore' + INTERVAL '24 hours')";

// The instructor's classes on a date, or today if no date is given.
export async function listClassesOn(instructorId, date) {
  const result = await pool.query(
    `SELECT cs.id, cl.title, ce.name AS centre,
            to_char(cs.session_date, 'YYYY-MM-DD') AS session_date,
            to_char(cs.start_time, 'HH24:MI') AS start_time,
            to_char(cs.end_time, 'HH24:MI') AS end_time,
            cs.status,
            ${ATTENDANCE_CLOSED} AS attendance_closed,
            (SELECT COUNT(*)::int FROM bookings b
             WHERE b.session_id = cs.id AND b.status = 'booked') AS booked,
            (SELECT COUNT(*)::int FROM attendance a WHERE a.session_id = cs.id) AS marked
     FROM class_sessions cs
     JOIN classes cl ON cl.id = cs.class_id
     JOIN centres ce ON ce.id = cl.centre_id
     WHERE cs.instructor_id = $1
       AND cs.session_date = COALESCE($2::date, ${TODAY})
       AND cs.status <> 'cancelled'
     ORDER BY cs.start_time, cs.id`,
    [instructorId, date]
  );
  return result.rows;
}

// The instructor's classes between two dates, for the calendar.
export async function listClassesBetween(instructorId, from, to) {
  const result = await pool.query(
    `SELECT cs.id, cl.title, ce.name AS centre,
            to_char(cs.session_date, 'YYYY-MM-DD') AS session_date,
            to_char(cs.start_time, 'HH24:MI') AS start_time,
            to_char(cs.end_time, 'HH24:MI') AS end_time,
            cs.status,
            ${ATTENDANCE_CLOSED} AS attendance_closed,
            (SELECT COUNT(*)::int FROM bookings b
             WHERE b.session_id = cs.id AND b.status = 'booked') AS booked,
            (SELECT COUNT(*)::int FROM attendance a WHERE a.session_id = cs.id) AS marked
     FROM class_sessions cs
     JOIN classes cl ON cl.id = cs.class_id
     JOIN centres ce ON ce.id = cl.centre_id
     WHERE cs.instructor_id = $1
       AND cs.session_date BETWEEN $2::date AND $3::date
       AND cs.status <> 'cancelled'
     ORDER BY cs.session_date, cs.start_time, cs.id`,
    [instructorId, from, to]
  );
  return result.rows;
}

// The instructor's private (1-on-1) lessons between two dates, for the
// calendar and today's classes. A lesson counts once they've accepted the
// admin's offer; lessons scheduled before offers existed have none and count too.
// Pending offers show in the requests bell instead.
const PRIVATE_ACCEPTED = `
  COALESCE((SELECT lo.status FROM lesson_offers lo
            WHERE lo.private_lesson_id = pl.id AND lo.status <> 'withdrawn'
            ORDER BY lo.offered_at DESC, lo.id DESC LIMIT 1), 'accepted') = 'accepted'`;

// Attendance for a private lesson follows the group class rule: from the day of
// the lesson until 24 hours after it ends.
const PRIVATE_CAN_MARK = `(pl.lesson_date <= ${TODAY}
  AND NOW() <= ((pl.lesson_date + pl.end_time) AT TIME ZONE 'Asia/Singapore' + INTERVAL '24 hours'))`;

const PRIVATE_LESSON_FIELDS = `
  pl.id, pl.status, st.full_name AS student_name, ce.name AS centre,
  to_char(pl.lesson_date, 'YYYY-MM-DD') AS lesson_date,
  to_char(pl.start_time, 'HH24:MI') AS start_time,
  to_char(pl.end_time, 'HH24:MI') AS end_time,
  pl.student_note,
  ${PRIVATE_CAN_MARK} AS can_mark`;

export async function listPrivateLessonsBetween(instructorId, from, to) {
  const result = await pool.query(
    `SELECT ${PRIVATE_LESSON_FIELDS}
     FROM private_lessons pl
     JOIN users st ON st.id = pl.student_id
     JOIN centres ce ON ce.id = pl.centre_id
     WHERE pl.instructor_id = $1
       AND pl.status IN ('scheduled', 'completed', 'no_show')
       AND pl.lesson_date BETWEEN $2::date AND $3::date
       AND ${PRIVATE_ACCEPTED}
     ORDER BY pl.lesson_date, pl.start_time`,
    [instructorId, from, to]
  );
  return result.rows;
}

// Records whether the student came to a private lesson (FSDP-15 for 1-on-1s).
// It's saved as the lesson's status, the same values the admin's Completed /
// No-show buttons use: 'completed' (present), 'no_show' (absent), or back to
// 'scheduled' to clear a mistake. Returns the lesson, or a reason it can't change.
export async function markPrivateLesson(lessonId, instructorId, status) {
  const result = await pool.query(
    `UPDATE private_lessons pl SET status = $3
     WHERE pl.id = $1 AND pl.instructor_id = $2
       AND pl.status IN ('scheduled', 'completed', 'no_show')
       AND ${PRIVATE_ACCEPTED}
       AND ${PRIVATE_CAN_MARK}
     RETURNING pl.id`,
    [lessonId, instructorId, status]
  );
  const found = await pool.query(
    `SELECT ${PRIVATE_LESSON_FIELDS}, pl.instructor_id, ${PRIVATE_ACCEPTED} AS accepted,
            pl.lesson_date > ${TODAY} AS is_future
     FROM private_lessons pl
     JOIN users st ON st.id = pl.student_id
     JOIN centres ce ON ce.id = pl.centre_id
     WHERE pl.id = $1`,
    [lessonId]
  );
  const lesson = found.rows[0];
  if (!lesson || lesson.instructor_id !== instructorId || !lesson.accepted) return { error: "not_found" };
  if (result.rowCount === 0) {
    if (!["scheduled", "completed", "no_show"].includes(lesson.status)) return { error: "closed" };
    return { error: lesson.is_future ? "future" : "window_closed" };
  }
  return { lesson };
}

// Gradings this instructor is examining between two dates.
export async function listGradingsBetween(instructorId, from, to) {
  const result = await pool.query(
    `SELECT gs.id, ce.name AS centre,
            to_char(gs.grading_date, 'YYYY-MM-DD') AS grading_date,
            to_char(gs.start_time, 'HH24:MI') AS start_time
     FROM grading_sessions gs
     JOIN centres ce ON ce.id = gs.centre_id
     WHERE gs.examiner_id = $1
       AND gs.grading_date BETWEEN $2::date AND $3::date
       AND gs.status <> 'cancelled'
     ORDER BY gs.grading_date, gs.start_time`,
    [instructorId, from, to]
  );
  return result.rows;
}

// "My students": everyone who trained in, or booked, the instructor ($1)
// classes in the last 3 months.
const MY_STUDENTS = `
  SELECT a.student_id
  FROM attendance a
  JOIN class_sessions cs ON cs.id = a.session_id
  WHERE cs.instructor_id = $1 AND cs.session_date >= ${TODAY} - INTERVAL '3 months'
  UNION
  SELECT b.student_id
  FROM bookings b
  JOIN class_sessions cs ON cs.id = b.session_id
  WHERE cs.instructor_id = $1 AND b.status = 'booked'
    AND cs.session_date >= ${TODAY} - INTERVAL '3 months'`;

// Attendance at the instructor's classes for each of the last 8 weeks
// (FSDP-71). Week 0 is the 7 days up to yesterday, week 7 the oldest. Today is
// left out because its classes may not be marked yet. "Expected" is everyone on
// the roster: booked, or already marked. "Attended" is present or late.
export async function listWeeklyAttendance(instructorId) {
  const result = await pool.query(
    `WITH weeks AS (
       SELECT k, ${TODAY} - 7 * (k + 1) AS from_date, ${TODAY} - 7 * k - 1 AS to_date
       FROM generate_series(0, 7) AS k
     ),
     my_sessions AS (
       SELECT cs.id, cs.session_date
       FROM class_sessions cs
       WHERE cs.instructor_id = $1 AND cs.status <> 'cancelled'
         AND cs.session_date BETWEEN ${TODAY} - 56 AND ${TODAY} - 1
     ),
     expected AS (
       SELECT s.session_date, a.status
       FROM my_sessions s
       JOIN LATERAL (
         SELECT b.student_id FROM bookings b WHERE b.session_id = s.id AND b.status = 'booked'
         UNION
         SELECT a.student_id FROM attendance a WHERE a.session_id = s.id
       ) x ON TRUE
       LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = x.student_id
     )
     SELECT w.k,
            to_char(w.from_date, 'YYYY-MM-DD') AS from_date,
            to_char(w.to_date, 'YYYY-MM-DD') AS to_date,
            (SELECT COUNT(*)::int FROM my_sessions s WHERE s.session_date BETWEEN w.from_date AND w.to_date) AS classes,
            (SELECT COUNT(*)::int FROM expected e WHERE e.session_date BETWEEN w.from_date AND w.to_date) AS expected,
            (SELECT COUNT(*)::int FROM expected e
             WHERE e.session_date BETWEEN w.from_date AND w.to_date AND e.status IN ('present', 'late')) AS attended
     FROM weeks w
     ORDER BY w.k DESC`,
    [instructorId]
  );
  return result.rows;
}

// Classes each of the instructor's students attended (at any dojo) in the last
// 28 days and the 28 days before that, to spot anyone dropping off (FSDP-71).
export async function listStudentAttendanceChange(instructorId) {
  const result = await pool.query(
    `WITH my_students AS (${MY_STUDENTS})
     SELECT u.id, u.full_name, hc.name AS home_dojo,
            COUNT(cs.id) FILTER (WHERE cs.session_date BETWEEN ${TODAY} - 28 AND ${TODAY} - 1)::int AS recent,
            COUNT(cs.id) FILTER (WHERE cs.session_date BETWEEN ${TODAY} - 56 AND ${TODAY} - 29)::int AS previous,
            to_char(MAX(cs.session_date), 'YYYY-MM-DD') AS last_attended
     FROM my_students s
     JOIN users u ON u.id = s.student_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN centres hc ON hc.id = sp.home_centre_id
     LEFT JOIN attendance a ON a.student_id = u.id AND a.status IN ('present', 'late')
     LEFT JOIN class_sessions cs ON cs.id = a.session_id AND cs.status <> 'cancelled' AND cs.session_date < ${TODAY}
     GROUP BY u.id, u.full_name, hc.name`,
    [instructorId]
  );
  return result.rows;
}

// Applications that still count. Withdrawn and rejected ones do not.
const LIVE_APPLICATION = "ga.status NOT IN ('withdrawn', 'rejected')";

// Grading progress for the instructor's students. Classes are counted the same
// way as the student's own grading page (gradingModel.findTrainingSinceBelt):
// present or late, after the belt was awarded, plus external sessions, plus
// private (1-on-1) lessons the instructor marked Present (status 'completed').
export async function listGradingProgress(instructorId) {
  const result = await pool.query(
    `WITH my_students AS (${MY_STUDENTS})
     SELECT u.id, u.full_name, hc.name AS home_dojo,
            cb.name AS current_belt, nb.name AS next_belt,
            to_char(sp.belt_awarded_on, 'YYYY-MM-DD') AS belt_awarded_on,
            nb.min_months_at_rank, nb.min_classes_at_rank,
            (EXTRACT(YEAR FROM age(${TODAY}, sp.belt_awarded_on)) * 12
             + EXTRACT(MONTH FROM age(${TODAY}, sp.belt_awarded_on)))::int AS months_at_belt,
            (SELECT COUNT(*)::int
             FROM attendance a
             JOIN class_sessions cs ON cs.id = a.session_id
             WHERE a.student_id = u.id AND a.status IN ('present', 'late')
               AND cs.status <> 'cancelled' AND cs.session_date > sp.belt_awarded_on)
            + (SELECT COUNT(*)::int
               FROM external_attendance e
               WHERE e.student_id = u.id AND e.attended_on > sp.belt_awarded_on)
            + (SELECT COUNT(*)::int
               FROM private_lessons pl
               WHERE pl.student_id = u.id AND pl.status = 'completed'
                 AND pl.lesson_date > sp.belt_awarded_on) AS classes_since_belt,
            EXISTS (SELECT 1 FROM memberships m
                    WHERE m.student_id = u.id AND m.status = 'active'
                      AND m.end_date >= ${TODAY}) AS membership_active,
            (SELECT (EXTRACT(YEAR FROM age(${TODAY}, MIN(m.start_date))) * 12
                     + EXTRACT(MONTH FROM age(${TODAY}, MIN(m.start_date))))::int
             FROM memberships m
             WHERE m.student_id = u.id AND m.status IN ('active', 'expired')) AS months_as_member
     FROM my_students s
     JOIN users u ON u.id = s.student_id
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN centres hc ON hc.id = sp.home_centre_id
     LEFT JOIN belt_ranks cb ON cb.id = sp.current_belt_id
     LEFT JOIN belt_ranks nb ON nb.rank_order = cb.rank_order + 1
     ORDER BY u.full_name`,
    [instructorId]
  );
  return result.rows;
}

// Upcoming gradings, with how many of this instructor's students applied.
export async function listUpcomingGradings(instructorId) {
  const result = await pool.query(
    `WITH my_students AS (${MY_STUDENTS})
     SELECT gs.id, ce.name AS centre,
            to_char(gs.grading_date, 'YYYY-MM-DD') AS grading_date,
            to_char(gs.start_time, 'HH24:MI') AS start_time,
            to_char(gs.registration_closes_on, 'YYYY-MM-DD') AS closes_on,
            gs.registration_closes_on >= ${TODAY} AS registration_open,
            (SELECT COUNT(*)::int FROM grading_applications ga
             WHERE ga.grading_session_id = gs.id AND ${LIVE_APPLICATION}
               AND ga.student_id IN (SELECT student_id FROM my_students)) AS my_applicants,
            (SELECT COUNT(*)::int FROM grading_applications ga
             WHERE ga.grading_session_id = gs.id AND ${LIVE_APPLICATION}
               AND ga.instructor_approved_at IS NULL
               AND ga.student_id IN (SELECT student_id FROM my_students)) AS my_awaiting
     FROM grading_sessions gs
     JOIN centres ce ON ce.id = gs.centre_id
     WHERE gs.status = 'scheduled' AND gs.grading_date >= ${TODAY}
     ORDER BY gs.grading_date, gs.start_time`,
    [instructorId]
  );
  return result.rows;
}

// One grading session, upcoming or past.
export async function findGrading(gradingId) {
  const result = await pool.query(
    `SELECT gs.id, gs.status, ce.name AS centre,
            to_char(gs.grading_date, 'YYYY-MM-DD') AS grading_date,
            to_char(gs.start_time, 'HH24:MI') AS start_time,
            to_char(gs.registration_closes_on, 'YYYY-MM-DD') AS closes_on,
            gs.registration_closes_on >= ${TODAY} AS registration_open,
            (gs.status = 'scheduled' AND gs.grading_date >= ${TODAY}) AS is_upcoming
     FROM grading_sessions gs
     JOIN centres ce ON ce.id = gs.centre_id
     WHERE gs.id = $1`,
    [gradingId]
  );
  return result.rows[0];
}

// This instructor's students who applied for one grading.
export async function listMyApplicants(instructorId, gradingId) {
  const result = await pool.query(
    `WITH my_students AS (${MY_STUDENTS})
     SELECT ga.id, ga.student_id, ga.status, tb.name AS target_belt,
            to_char(ga.applied_at AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD') AS applied_on,
            ga.instructor_approved_by AS approved_by_id, ap.full_name AS approved_by,
            to_char(ga.instructor_approved_at AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD') AS approved_on
     FROM grading_applications ga
     JOIN belt_ranks tb ON tb.id = ga.target_belt_id
     LEFT JOIN users ap ON ap.id = ga.instructor_approved_by
     WHERE ga.grading_session_id = $2 AND ${LIVE_APPLICATION}
       AND ga.student_id IN (SELECT student_id FROM my_students)
     ORDER BY ga.applied_at`,
    [instructorId, gradingId]
  );
  return result.rows;
}

// Records or clears the instructor's approval on one application. The admin's
// grading page (adminGradingModel) only lists applications once approved.
export async function setApplicationApproval(applicationId, instructorId) {
  await pool.query(
    `UPDATE grading_applications
     SET instructor_approved_by = $2::int,
         instructor_approved_at = CASE WHEN $2::int IS NULL THEN NULL ELSE NOW() END
     WHERE id = $1`,
    [applicationId, instructorId]
  );
}

// Cover requests (FSDP-69): an instructor who can't teach a class must ask at
// least this many hours before it starts, so the admin has time to find someone.
export const COVER_NOTICE_HOURS = 12;
const COVER_STILL_ALLOWED = `(((cs.session_date + cs.start_time) AT TIME ZONE 'Asia/Singapore')
  - INTERVAL '${COVER_NOTICE_HOURS} hours' > NOW())`;

// Asks the admin to find someone to cover one of the instructor's classes.
// Saved in cover_requests (Matthew's migration 012), which the admin's Cover
// Requests page lists. The lesson stays on for students. Returns the new
// request id, or null if the class can't take a request (the caller says why):
// not theirs, not scheduled, too close to the start, or already asked.
export async function createCoverRequest(sessionId, instructorId, reason) {
  const result = await pool.query(
    `INSERT INTO cover_requests (session_id, instructor_id, reason)
     SELECT cs.id, $2, $3
     FROM class_sessions cs
     WHERE cs.id = $1 AND cs.instructor_id = $2 AND cs.status = 'scheduled'
       AND ${COVER_STILL_ALLOWED}
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [sessionId, instructorId, reason]
  );
  return result.rows[0]?.id ?? null;
}

// Everyone who should hear about a new cover request.
export async function listAdminIds() {
  const result = await pool.query("SELECT id FROM users WHERE role = 'admin'");
  return result.rows.map((row) => row.id);
}

export async function findUserName(userId) {
  const result = await pool.query("SELECT full_name FROM users WHERE id = $1", [userId]);
  return result.rows[0]?.full_name ?? "An instructor";
}

// One session, only if this instructor teaches it.
export async function findSession(sessionId, instructorId) {
  const result = await pool.query(
    `SELECT cs.id, cl.title, ce.name AS centre,
            to_char(cs.session_date, 'YYYY-MM-DD') AS session_date,
            to_char(cs.start_time, 'HH24:MI') AS start_time,
            to_char(cs.end_time, 'HH24:MI') AS end_time,
            cs.status,
            ${ATTENDANCE_CLOSED} AS attendance_closed,
            cs.session_date > ${TODAY} AS is_future,
            ${COVER_STILL_ALLOWED} AS can_request_cover,
            ((cs.session_date + cs.start_time) AT TIME ZONE 'Asia/Singapore') > NOW() AS not_started,
            (SELECT cr.status FROM cover_requests cr
             WHERE cr.session_id = cs.id AND cr.instructor_id = $2
             ORDER BY cr.requested_at DESC, cr.id DESC LIMIT 1) AS cover_status
     FROM class_sessions cs
     JOIN classes cl ON cl.id = cs.class_id
     JOIN centres ce ON ce.id = cl.centre_id
     WHERE cs.id = $1 AND cs.instructor_id = $2`,
    [sessionId, instructorId]
  );
  return result.rows[0];
}

// Everyone expected in a session: students who booked, plus any who
// already have an attendance record (such as a QR check-in).
export async function getRoster(sessionId) {
  const result = await pool.query(
    `SELECT u.id, u.full_name, br.name AS belt, a.status, a.method
     FROM users u
     LEFT JOIN attendance a ON a.student_id = u.id AND a.session_id = $1
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN belt_ranks br ON br.id = sp.current_belt_id
     WHERE a.id IS NOT NULL
        OR EXISTS (SELECT 1 FROM bookings b
                   WHERE b.session_id = $1 AND b.student_id = u.id AND b.status = 'booked')
     ORDER BY u.full_name`,
    [sessionId]
  );
  return result.rows;
}

// Saves a list of { studentId, status } in one statement, so either all
// of them are saved or none are. Marking a student again replaces their status,
// and a null status removes their mark.
export async function saveAttendance(sessionId, instructorId, records) {
  const marked = records.filter((r) => r.status !== null);
  const cleared = records.filter((r) => r.status === null).map((r) => r.studentId);
  await pool.query(
    `WITH cleared AS (
       DELETE FROM attendance WHERE session_id = $1 AND student_id = ANY($5::int[])
     )
     INSERT INTO attendance (session_id, student_id, status, method, recorded_by)
     SELECT $1, r.student_id, r.status, 'manual', $2
     FROM unnest($3::int[], $4::text[]) AS r(student_id, status)
     ON CONFLICT (session_id, student_id)
     DO UPDATE SET status = EXCLUDED.status, method = 'manual', recorded_by = EXCLUDED.recorded_by`,
    [sessionId, instructorId, marked.map((r) => r.studentId), marked.map((r) => r.status), cleared]
  );
}

// ---------------------------------------------------------------------
// Lesson offers (FSDP-69). The admin offers the instructor a lesson in
// lesson_offers (Matthew's migration 012): a private lesson they scheduled, or
// a group class whose usual instructor asked for cover. The instructor
// accepts or declines it from the bell in the navbar.
// ---------------------------------------------------------------------

// When the offered lesson starts, as a timestamp.
const OFFER_STARTS_AT = `((COALESCE(cs.session_date, pl.lesson_date) + COALESCE(cs.start_time, pl.start_time))
                          AT TIME ZONE 'Asia/Singapore')`;

const OFFER_FROM = `
  FROM lesson_offers lo
  LEFT JOIN class_sessions cs ON cs.id = lo.session_id
  LEFT JOIN classes cl ON cl.id = cs.class_id
  LEFT JOIN private_lessons pl ON pl.id = lo.private_lesson_id`;

// Offers waiting for this instructor's answer, for lessons that are still going
// ahead and haven't started yet. Soonest lesson first.
export async function listPendingOffers(instructorId) {
  const result = await pool.query(
    `SELECT lo.id,
            CASE WHEN lo.session_id IS NULL THEN 'private' ELSE 'cover' END AS kind,
            COALESCE(cl.title, 'Private lesson') AS title,
            st.full_name AS student_name,
            orig.full_name AS covering_for,
            ce.name AS centre,
            to_char(COALESCE(cs.session_date, pl.lesson_date), 'YYYY-MM-DD') AS lesson_date,
            to_char(COALESCE(cs.start_time, pl.start_time), 'HH24:MI') AS start_time,
            to_char(COALESCE(cs.end_time, pl.end_time), 'HH24:MI') AS end_time,
            to_char(lo.offered_at AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD') AS offered_on
     ${OFFER_FROM}
     LEFT JOIN users st ON st.id = pl.student_id
     -- A moved class keeps its own dojo for the day.
     LEFT JOIN centres ce ON ce.id = COALESCE(cs.centre_id, cl.centre_id, pl.centre_id)
     LEFT JOIN cover_requests cr ON cr.session_id = cs.id AND cr.status = 'open'
     LEFT JOIN users orig ON orig.id = cr.instructor_id
     WHERE lo.instructor_id = $1 AND lo.status = 'pending'
       AND COALESCE(cs.status, pl.status) = 'scheduled'
       AND ${OFFER_STARTS_AT} > NOW()
     ORDER BY ${OFFER_STARTS_AT}, lo.id`,
    [instructorId]
  );
  return result.rows;
}

export class OfferError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Accepts or declines one offer, as one transaction.
// Accepting a private lesson only records the answer: the admin already put the
// instructor on it when they offered it. Accepting a cover moves that one class
// to this instructor and closes the cover request, as migration 012 asks the
// instructor side to do. Declining sends it back to the admin to offer to
// someone else (their Private Lessons and Cover Requests pages show the reason).
export async function respondToOffer(offerId, instructorId, accept, note) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query(
      `SELECT lo.id, lo.status, lo.session_id, lo.offered_by,
              COALESCE(cs.status, pl.status) AS lesson_status,
              pl.instructor_id AS private_instructor_id,
              ${OFFER_STARTS_AT} > NOW() AS is_upcoming
       ${OFFER_FROM}
       WHERE lo.id = $1 AND lo.instructor_id = $2
       FOR UPDATE OF lo`,
      [offerId, instructorId]
    );
    const offer = found.rows[0];
    if (!offer) throw new OfferError(404, "Request not found.");
    if (offer.status === "withdrawn") throw new OfferError(409, "The admin has withdrawn this request.");
    if (offer.status !== "pending") throw new OfferError(409, "You've already answered this request.");
    if (offer.lesson_status !== "scheduled") throw new OfferError(409, "This lesson is no longer going ahead.");
    if (!offer.is_upcoming) throw new OfferError(409, "This lesson has already started.");
    if (!offer.session_id && offer.private_instructor_id !== instructorId) {
      throw new OfferError(409, "The admin has given this lesson to another instructor.");
    }

    await client.query(
      `UPDATE lesson_offers SET status = $2, response_note = $3, responded_at = NOW() WHERE id = $1`,
      [offerId, accept ? "accepted" : "declined", note]
    );

    if (accept && offer.session_id) {
      await client.query("UPDATE class_sessions SET instructor_id = $2 WHERE id = $1", [offer.session_id, instructorId]);
      await client.query(
        `UPDATE cover_requests SET status = 'covered', resolved_at = NOW(), resolved_by = $2
         WHERE session_id = $1 AND status = 'open'`,
        [offer.session_id, offer.offered_by]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------
// Student training progress (FSDP-21)
// ---------------------------------------------------------------------

// A student's most recent lessons with this instructor, newest first: group
// classes they booked or were marked for, and private lessons that were marked.
// status: present / late / absent / excused, or not_marked for a booked class
// nobody marked.
export async function listRecentLessonsWithMe(instructorId, studentId, limit = 10) {
  const result = await pool.query(
    `SELECT * FROM (
       SELECT 'class' AS kind, cs.id, cl.title, ce.name AS centre,
              cs.session_date AS day, to_char(cs.session_date, 'YYYY-MM-DD') AS lesson_date,
              to_char(cs.start_time, 'HH24:MI') AS start_time,
              COALESCE(a.status, 'not_marked') AS status
       FROM class_sessions cs
       JOIN classes cl ON cl.id = cs.class_id
       -- A class moved to another dojo for the day keeps its own centre_id.
       JOIN centres ce ON ce.id = COALESCE(cs.centre_id, cl.centre_id)
       LEFT JOIN attendance a ON a.session_id = cs.id AND a.student_id = $2
       WHERE cs.instructor_id = $1 AND cs.status <> 'cancelled' AND cs.session_date < ${TODAY}
         AND (a.id IS NOT NULL OR EXISTS (SELECT 1 FROM bookings b
              WHERE b.session_id = cs.id AND b.student_id = $2 AND b.status = 'booked'))
       UNION ALL
       SELECT 'private', pl.id, 'Private lesson', ce.name,
              pl.lesson_date, to_char(pl.lesson_date, 'YYYY-MM-DD'),
              to_char(pl.start_time, 'HH24:MI'),
              CASE pl.status WHEN 'completed' THEN 'present' ELSE 'absent' END
       FROM private_lessons pl
       JOIN centres ce ON ce.id = pl.centre_id
       WHERE pl.instructor_id = $1 AND pl.student_id = $2 AND pl.status IN ('completed', 'no_show')
     ) lessons
     ORDER BY day DESC, start_time DESC
     LIMIT $3`,
    [instructorId, studentId, limit]
  );
  return result.rows;
}
