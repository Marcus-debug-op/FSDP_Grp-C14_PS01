// MODEL: QR check-in for class sessions.
// Students check themselves in by scanning the QR code their instructor shows.
import pool from "../db.js";

const NOW_SG = "(NOW() AT TIME ZONE 'Asia/Singapore')";
const TODAY_SG = `${NOW_SG}::date`;

// Check-in opens 30 minutes before the class starts and closes when it ends.
const CHECKIN_OPEN = `${NOW_SG} BETWEEN (cs.session_date + cs.start_time - INTERVAL '30 minutes')
                                    AND (cs.session_date + cs.end_time)`;

export async function findSessionForCheckIn(sessionId) {
  const result = await pool.query(
    `SELECT cs.id, cs.instructor_id, cs.status, cl.title, ce.name AS centre,
            to_char(cs.session_date, 'YYYY-MM-DD') AS session_date,
            to_char(cs.start_time, 'HH24:MI') AS start_time,
            to_char(cs.end_time, 'HH24:MI') AS end_time,
            ${CHECKIN_OPEN} AS checkin_open
     FROM class_sessions cs
     JOIN classes cl ON cl.id = cs.class_id
     -- A session moved to another dojo for the day keeps its own centre_id.
     JOIN centres ce ON ce.id = COALESCE(cs.centre_id, cl.centre_id)
     WHERE cs.id = $1`,
    [sessionId]
  );
  return result.rows[0];
}

// Marks the student present (method 'qr') if they booked this class and are an
// active member. Never overwrites a mark the instructor already made.
// Returns { ok: true } or { ok: false, reason: 'not_member' | 'not_booked' | 'already' }.
export async function recordQrCheckIn(sessionId, studentId) {
  const member = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM memberships
       WHERE student_id = $1 AND status = 'active'
         AND start_date <= ${TODAY_SG} AND end_date >= ${TODAY_SG}) AS ok`,
    [studentId]
  );
  if (!member.rows[0].ok) return { ok: false, reason: "not_member" };

  const booked = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM bookings
       WHERE session_id = $1 AND student_id = $2 AND status = 'booked') AS ok`,
    [sessionId, studentId]
  );
  if (!booked.rows[0].ok) return { ok: false, reason: "not_booked" };

  const inserted = await pool.query(
    `INSERT INTO attendance (session_id, student_id, status, method, checked_in_at, recorded_by)
     VALUES ($1, $2, 'present', 'qr', NOW(), NULL)
     ON CONFLICT (session_id, student_id) DO NOTHING
     RETURNING id`,
    [sessionId, studentId]
  );
  return inserted.rowCount ? { ok: true } : { ok: false, reason: "already" };
}
