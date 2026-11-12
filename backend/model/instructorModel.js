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

// Applications that still count. Withdrawn and rejected ones do not.
const LIVE_APPLICATION = "ga.status NOT IN ('withdrawn', 'rejected')";

// Grading progress for the instructor's students. Classes are counted the same
// way as the student's own grading page (gradingModel.findTrainingSinceBelt):
// present or late, after the belt was awarded, plus external sessions.
export async function listGradingProgress(instructorId) {
  const result = await pool.query(
    `WITH my_students AS (${MY_STUDENTS})
     SELECT u.id, u.full_name, hc.name AS home_dojo,
            cb.name AS current_belt, nb.name AS next_belt,
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
               WHERE e.student_id = u.id AND e.attended_on > sp.belt_awarded_on) AS classes_since_belt,
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
               AND ga.student_id IN (SELECT student_id FROM my_students)) AS my_applicants
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
            gs.registration_closes_on >= ${TODAY} AS registration_open
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
     SELECT ga.student_id, ga.status, tb.name AS target_belt,
            to_char(ga.applied_at AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD') AS applied_on
     FROM grading_applications ga
     JOIN belt_ranks tb ON tb.id = ga.target_belt_id
     WHERE ga.grading_session_id = $2 AND ${LIVE_APPLICATION}
       AND ga.student_id IN (SELECT student_id FROM my_students)
     ORDER BY ga.applied_at`,
    [instructorId, gradingId]
  );
  return result.rows;
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
            cs.session_date > ${TODAY} AS is_future
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
