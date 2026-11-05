// MODEL: SQL for the instructor side. Tables come from
// database/migrations/001_shared_schema.sql (see database/DATABASE.md).
import pool from "../db.js";

// "Today" in Singapore, not in the database server's UTC.
const TODAY = "(NOW() AT TIME ZONE 'Asia/Singapore')::date";

// The instructor's classes on a date, or today if no date is given.
export async function listClassesOn(instructorId, date) {
  const result = await pool.query(
    `SELECT cs.id, cl.title, ce.name AS centre,
            to_char(cs.session_date, 'YYYY-MM-DD') AS session_date,
            to_char(cs.start_time, 'HH24:MI') AS start_time,
            to_char(cs.end_time, 'HH24:MI') AS end_time,
            cs.status,
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

// One session, only if this instructor teaches it.
export async function findSession(sessionId, instructorId) {
  const result = await pool.query(
    `SELECT cs.id, cl.title, ce.name AS centre,
            to_char(cs.session_date, 'YYYY-MM-DD') AS session_date,
            to_char(cs.start_time, 'HH24:MI') AS start_time,
            to_char(cs.end_time, 'HH24:MI') AS end_time,
            cs.status,
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
// of them are saved or none are. Marking a student again replaces their status.
export async function saveAttendance(sessionId, instructorId, records) {
  await pool.query(
    `INSERT INTO attendance (session_id, student_id, status, method, recorded_by)
     SELECT $1, r.student_id, r.status, 'manual', $2
     FROM unnest($3::int[], $4::text[]) AS r(student_id, status)
     ON CONFLICT (session_id, student_id)
     DO UPDATE SET status = EXCLUDED.status, method = 'manual', recorded_by = EXCLUDED.recorded_by`,
    [sessionId, instructorId, records.map((r) => r.studentId), records.map((r) => r.status)]
  );
}
