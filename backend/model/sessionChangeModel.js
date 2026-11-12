// MODEL: an admin, or the instructor teaching it, cancels a session or moves
// it to another dojo for the day (FSDP-56). Students who booked it get their
// credits back (if cancelled) and a notice; see utils/notices.js.
// Columns centre_id, change_note and changed_at come from migration 011.
import pool from "../db.js";

export class ChangeError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const SESSION_FIELDS = `
  cs.id, cs.status, cs.instructor_id, cs.change_note, cl.title, cl.centre_id AS usual_centre_id,
  to_char(cs.session_date, 'YYYY-MM-DD') AS date,
  to_char(cs.start_time, 'HH24:MI') AS start_time,
  to_char(cs.end_time, 'HH24:MI') AS end_time,
  ce.id AS centre_id, ce.name AS centre, ce.address,
  ((cs.session_date + cs.start_time) AT TIME ZONE 'Asia/Singapore') <= NOW() AS has_started`;

const FROM_SESSION = `
  FROM class_sessions cs
  JOIN classes cl ON cl.id = cs.class_id
  JOIN centres ce ON ce.id = COALESCE(cs.centre_id, cl.centre_id)`;

// Admins can change any session; instructors only the ones they teach.
function checkAllowed(session, user) {
  if (!session) throw new ChangeError(404, "That lesson couldn't be found.");
  if (user.role === "instructor" && session.instructor_id !== user.id) {
    throw new ChangeError(403, "You can only change lessons you teach.");
  }
}

// Details for the change panel: the session, how many students booked it,
// and the dojos it could move to.
export async function getSession(sessionId, user) {
  const result = await pool.query(
    `SELECT ${SESSION_FIELDS},
            (SELECT COUNT(*)::int FROM bookings b WHERE b.session_id = cs.id AND b.status = 'booked') AS booked
     ${FROM_SESSION}
     WHERE cs.id = $1`,
    [sessionId]
  );
  const s = result.rows[0];
  checkAllowed(s, user);
  const centres = await pool.query("SELECT id, name FROM centres WHERE is_active ORDER BY name");
  return {
    session: {
      id: s.id,
      title: s.title,
      date: s.date,
      startTime: s.start_time,
      endTime: s.end_time,
      status: s.status,
      centreId: s.centre_id,
      centre: s.centre,
      movedFromUsual: s.centre_id !== s.usual_centre_id,
      changeNote: s.change_note,
      hasStarted: s.has_started,
      canChange: s.status === "scheduled" && !s.has_started,
      booked: s.booked,
    },
    centres: centres.rows,
  };
}

// Locks the session row for the rest of the transaction and checks it can still change.
async function lockForChange(client, sessionId, user) {
  const result = await client.query(
    `SELECT ${SESSION_FIELDS} ${FROM_SESSION} WHERE cs.id = $1 FOR UPDATE OF cs`,
    [sessionId]
  );
  const s = result.rows[0];
  checkAllowed(s, user);
  if (s.status === "cancelled") throw new ChangeError(409, "This lesson has already been cancelled.");
  if (s.status === "completed" || s.has_started) {
    throw new ChangeError(409, "This lesson has already started, so it can't be changed.");
  }
  return s;
}

// Students currently booked on the session, locked so a booking or cancel
// can't happen halfway through the change.
async function lockBookings(client, sessionId) {
  const result = await client.query(
    "SELECT id, student_id FROM bookings WHERE session_id = $1 AND status = 'booked' FOR UPDATE",
    [sessionId]
  );
  return result.rows;
}

// Cancels the session for everyone, as one transaction.
// Bookings stay 'booked' so students still see the lesson on their timetable
// marked "Cancelled", but every credit they paid for it comes back as a
// 'booking_refund' row. Returns the students to tell.
export async function cancelSession(sessionId, user, reason) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const s = await lockForChange(client, sessionId, user);
    const bookings = await lockBookings(client, sessionId);

    await client.query(
      "UPDATE class_sessions SET status = 'cancelled', change_note = $2, changed_at = NOW() WHERE id = $1",
      [sessionId, reason]
    );

    const affected = [];
    for (const b of bookings) {
      // Credits this booking still holds: charged minus anything already returned.
      const held = await client.query(
        `SELECT GREATEST(COALESCE(-SUM(change), 0), 0)::int AS held
         FROM credit_transactions
         WHERE booking_id = $1 AND reason IN ('booking', 'booking_refund')`,
        [b.id]
      );
      const refunded = held.rows[0].held;
      if (refunded > 0) {
        await client.query(
          `INSERT INTO credit_transactions (student_id, change, reason, booking_id, note)
           VALUES ($1, $2, 'booking_refund', $3, $4)`,
          [b.student_id, refunded, b.id, `Dojo cancelled ${s.title} on ${s.date}`]
        );
      }
      affected.push({ studentId: b.student_id, refunded });
    }

    await client.query("COMMIT");
    return {
      session: { id: s.id, title: s.title, date: s.date, startTime: s.start_time, centre: s.centre, note: reason },
      affected,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Moves the session to another dojo for that day only, as one transaction.
// Moving it back to the class's usual dojo clears the override.
// Bookings and credits don't change. Returns the students to tell.
export async function moveSession(sessionId, user, centreId, note) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const s = await lockForChange(client, sessionId, user);

    const target = await client.query("SELECT id, name, address FROM centres WHERE id = $1 AND is_active", [centreId]);
    if (target.rowCount === 0) throw new ChangeError(400, "Please choose an open dojo.");
    if (centreId === s.centre_id) throw new ChangeError(400, `This lesson is already at ${s.centre}.`);

    const bookings = await lockBookings(client, sessionId);
    const updated = await client.query(
      `UPDATE class_sessions
       SET centre_id = CASE WHEN $2::int = $3::int THEN NULL ELSE $2::int END,
           change_note = $4, changed_at = NOW()
       WHERE id = $1
       RETURNING (EXTRACT(EPOCH FROM changed_at) * 1000)::bigint AS changed_at_ms`,
      [sessionId, centreId, s.usual_centre_id, note]
    );

    await client.query("COMMIT");
    const to = target.rows[0];
    return {
      session: {
        id: s.id,
        title: s.title,
        date: s.date,
        startTime: s.start_time,
        centre: to.name,
        address: to.address,
        previousCentre: s.centre,
        note,
        changedAtMs: Number(updated.rows[0].changed_at_ms),
      },
      affected: bookings.map((b) => ({ studentId: b.student_id })),
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
