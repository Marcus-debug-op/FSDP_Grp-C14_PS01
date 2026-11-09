// MODEL: SQL for browsing and booking group lessons (FSDP-50, FSDP-53).
// Tables come from database/migrations/001_shared_schema.sql (see database/DATABASE.md).
import pool from "../db.js";

// "Today" in Singapore, not in the database server's UTC.
const TODAY = "(NOW() AT TIME ZONE 'Asia/Singapore')::date";

// When a session starts, as a real point in time (the times are Singapore times).
const SESSION_START = "((cs.session_date + cs.start_time) AT TIME ZONE 'Asia/Singapore')";

// How far ahead students can see and book lessons.
export const DAYS_AHEAD = 14;

// Thrown when a booking breaks a rule. The controller sends `status` and
// `message` straight back to the browser.
export class BookingError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// The student's belt position, used to tag lessons that suit their level.
// NULL if the student has no profile yet.
export async function getRankOrder(studentId) {
  const result = await pool.query(
    `SELECT br.rank_order
     FROM student_profiles sp
     JOIN belt_ranks br ON br.id = sp.current_belt_id
     WHERE sp.user_id = $1`,
    [studentId]
  );
  return result.rows[0]?.rank_order ?? null;
}

// Upcoming sessions for the next DAYS_AHEAD days, across every dojo.
// filters = { centreId, dayOfWeek, instructorId, suitsBelt } (all optional)
export async function listUpcoming(studentId, rankOrder, filters = {}) {
  const result = await pool.query(
    `SELECT * FROM (
       SELECT cs.id, cl.title, cl.credit_cost, cl.capacity,
              ce.id AS centre_id, ce.name AS centre,
              u.id AS instructor_id, u.full_name AS instructor,
              to_char(cs.session_date, 'YYYY-MM-DD') AS session_date,
              to_char(cs.start_time, 'HH24:MI') AS start_time,
              to_char(cs.end_time, 'HH24:MI') AS end_time,
              EXTRACT(DOW FROM cs.session_date)::int AS day_of_week,
              minb.name AS min_belt, maxb.name AS max_belt,
              (cl.min_belt_id IS NULL AND cl.max_belt_id IS NULL) AS open_to_all,
              CASE
                WHEN $2::int IS NULL THEN (cl.min_belt_id IS NULL AND cl.max_belt_id IS NULL)
                ELSE (minb.rank_order IS NULL OR minb.rank_order <= $2)
                 AND (maxb.rank_order IS NULL OR maxb.rank_order >= $2)
              END AS suits_belt,
              (SELECT COUNT(*)::int FROM bookings b
               WHERE b.session_id = cs.id AND b.status = 'booked') AS booked,
              EXISTS (SELECT 1 FROM bookings b
                      WHERE b.session_id = cs.id AND b.student_id = $1 AND b.status = 'booked') AS booked_by_me
       FROM class_sessions cs
       JOIN classes cl ON cl.id = cs.class_id
       JOIN centres ce ON ce.id = cl.centre_id
       JOIN users u ON u.id = cs.instructor_id
       LEFT JOIN belt_ranks minb ON minb.id = cl.min_belt_id
       LEFT JOIN belt_ranks maxb ON maxb.id = cl.max_belt_id
       WHERE cs.status = 'scheduled' AND cl.is_active AND ce.is_active
         AND cs.session_date BETWEEN ${TODAY} AND ${TODAY} + ($3::int - 1)
         AND ${SESSION_START} > NOW()
         AND ($4::int IS NULL OR ce.id = $4)
         AND ($5::int IS NULL OR EXTRACT(DOW FROM cs.session_date) = $5)
         AND ($6::int IS NULL OR cs.instructor_id = $6)
     ) lessons
     WHERE NOT $7::boolean OR suits_belt
     ORDER BY session_date, start_time, title`,
    [
      studentId,
      rankOrder,
      DAYS_AHEAD,
      filters.centreId ?? null,
      filters.dayOfWeek ?? null,
      filters.instructorId ?? null,
      Boolean(filters.suitsBelt),
    ]
  );
  return result.rows;
}

// Dojos and instructors that have lessons in the booking window,
// so the filter dropdowns never offer a choice with nothing in it.
export async function getFilterOptions() {
  const where = `cs.status = 'scheduled' AND cl.is_active AND ce.is_active
                 AND cs.session_date BETWEEN ${TODAY} AND ${TODAY} + ($1::int - 1)
                 AND ${SESSION_START} > NOW()`;
  const [centres, instructors] = await Promise.all([
    pool.query(
      `SELECT DISTINCT ce.id, ce.name
       FROM class_sessions cs
       JOIN classes cl ON cl.id = cs.class_id
       JOIN centres ce ON ce.id = cl.centre_id
       WHERE ${where}
       ORDER BY ce.name`,
      [DAYS_AHEAD]
    ),
    pool.query(
      `SELECT DISTINCT u.id, u.full_name AS name
       FROM class_sessions cs
       JOIN classes cl ON cl.id = cs.class_id
       JOIN centres ce ON ce.id = cl.centre_id
       JOIN users u ON u.id = cs.instructor_id
       WHERE ${where}
       ORDER BY name`,
      [DAYS_AHEAD]
    ),
  ]);
  return { centres: centres.rows, instructors: instructors.rows };
}

// Books one group lesson and takes its credits, as one transaction.
// Checks, in order: the lesson can still be booked, the student has a
// membership on that day, hasn't booked it already, it isn't full, and
// they have enough credits.
export async function bookSession(studentId, sessionId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the student so two bookings at the same moment can't both
    // spend the same last credit.
    await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [studentId]);

    // Lock the session so two students can't both take the last spot.
    const sessionResult = await client.query(
      `SELECT cs.id, cs.status, cl.title, cl.capacity, cl.credit_cost, cl.is_active,
              ce.name AS centre,
              to_char(cs.session_date, 'YYYY-MM-DD') AS session_date,
              to_char(cs.start_time, 'HH24:MI') AS start_time,
              ${SESSION_START} <= NOW() AS has_started
       FROM class_sessions cs
       JOIN classes cl ON cl.id = cs.class_id
       JOIN centres ce ON ce.id = cl.centre_id
       WHERE cs.id = $1
       FOR UPDATE OF cs`,
      [sessionId]
    );
    const session = sessionResult.rows[0];
    if (!session || !session.is_active || session.status === "cancelled") {
      throw new BookingError(404, "This lesson isn't available any more.");
    }
    if (session.status === "completed" || session.has_started) {
      throw new BookingError(409, "This lesson has already started, so it can't be booked.");
    }

    const membership = await client.query(
      `SELECT 1 FROM memberships
       WHERE student_id = $1 AND status = 'active'
         AND start_date <= $2::date AND end_date >= $2::date
       LIMIT 1`,
      [studentId, session.session_date]
    );
    if (membership.rowCount === 0) {
      throw new BookingError(
        403,
        "You need an active membership on the day of this lesson. You can renew it on the Payments page."
      );
    }

    const existing = await client.query(
      "SELECT status FROM bookings WHERE session_id = $1 AND student_id = $2",
      [sessionId, studentId]
    );
    if (existing.rows[0]?.status === "booked") {
      throw new BookingError(409, "You've already booked this lesson.");
    }

    const taken = await client.query(
      "SELECT COUNT(*)::int AS count FROM bookings WHERE session_id = $1 AND status = 'booked'",
      [sessionId]
    );
    if (taken.rows[0].count >= session.capacity) {
      throw new BookingError(409, "Sorry, this lesson is full.");
    }

    const balanceResult = await client.query(
      "SELECT COALESCE(SUM(change), 0)::int AS balance FROM credit_transactions WHERE student_id = $1",
      [studentId]
    );
    const balance = balanceResult.rows[0].balance;
    const cost = session.credit_cost;
    if (balance < cost) {
      throw new BookingError(
        409,
        `This lesson needs ${cost} credit${cost === 1 ? "" : "s"} and you have ${balance}. You can top up on the Payments page.`
      );
    }

    // A student who cancelled this lesson before gets their old booking back
    // (bookings has one row per student per session).
    const booking = await client.query(
      `INSERT INTO bookings (session_id, student_id, status, booked_at)
       VALUES ($1, $2, 'booked', NOW())
       ON CONFLICT (session_id, student_id)
       DO UPDATE SET status = 'booked', booked_at = NOW(), cancelled_at = NULL
       RETURNING id`,
      [sessionId, studentId]
    );
    const bookingId = booking.rows[0].id;

    if (cost > 0) {
      await client.query(
        `INSERT INTO credit_transactions (student_id, change, reason, booking_id, note)
         VALUES ($1, $2, 'booking', $3, $4)`,
        [studentId, -cost, bookingId, `Booked ${session.title} on ${session.session_date}`]
      );
    }

    await client.query("COMMIT");
    return {
      bookingId,
      creditsLeft: balance - cost,
      lesson: {
        id: session.id,
        title: session.title,
        centre: session.centre,
        date: session.session_date,
        startTime: session.start_time,
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
