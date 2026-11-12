// MODEL: the student's side of 1-on-1 sessions (FSDP-54).
// The student sends a request with a preferred date, time of day and dojo.
// An admin schedules it (Matthew's privateLessonModel.scheduleLesson), which
// is when the credits are taken. Table: private_lessons.
import pool from "../db.js";

const TODAY = "(NOW() AT TIME ZONE 'Asia/Singapore')::date";

// Credits a 1-on-1 session costs. Matches private_lessons.credit_cost's
// default and what the admin page charges when it schedules one.
export const PRIVATE_LESSON_CREDITS = 3;
// How far ahead a student can ask for a session.
export const REQUEST_DAYS_AHEAD = 60;
// How many requests a student can have waiting at once.
export const MAX_OPEN_REQUESTS = 2;

// Times of day a student can pick. Saved as text in preferred_time.
export const TIME_CHOICES = [
  "Morning (before 12pm)",
  "Afternoon (12pm to 5pm)",
  "Evening (after 5pm)",
  "Any time",
];

export class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const LESSON_FIELDS = `
  pl.id, pl.status, pl.credit_cost, pl.preferred_time, pl.student_note, pl.admin_note,
  to_char(pl.preferred_date, 'YYYY-MM-DD') AS preferred_date,
  to_char(pl.lesson_date, 'YYYY-MM-DD') AS lesson_date,
  to_char(pl.start_time, 'HH24:MI') AS start_time,
  to_char(pl.end_time, 'HH24:MI') AS end_time,
  to_char(pl.requested_at AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD') AS requested_on,
  ce.id AS centre_id, ce.name AS centre, i.full_name AS instructor`;

function toLesson(r) {
  return {
    id: r.id,
    status: r.status,
    creditCost: r.credit_cost,
    preferredDate: r.preferred_date,
    preferredTime: r.preferred_time,
    note: r.student_note,
    dojoNote: r.admin_note,
    date: r.lesson_date,
    startTime: r.start_time,
    endTime: r.end_time,
    requestedOn: r.requested_on,
    centreId: r.centre_id,
    centre: r.centre,
    instructor: r.instructor,
  };
}

// All of the student's 1-on-1 requests and sessions:
// waiting requests first, then upcoming sessions, then everything else.
export async function listForStudent(studentId) {
  const result = await pool.query(
    `SELECT ${LESSON_FIELDS}
     FROM private_lessons pl
     JOIN centres ce ON ce.id = pl.centre_id
     LEFT JOIN users i ON i.id = pl.instructor_id
     WHERE pl.student_id = $1
     ORDER BY CASE pl.status WHEN 'requested' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
              CASE WHEN pl.status IN ('requested', 'scheduled')
                   THEN COALESCE(pl.lesson_date, pl.preferred_date) END,
              COALESCE(pl.lesson_date, pl.preferred_date) DESC, pl.id DESC
     LIMIT 50`,
    [studentId]
  );
  return result.rows.map(toLesson);
}

// The student's scheduled 1-on-1 sessions in the booking window, shaped like
// the group lessons on the Book Lessons page. filters = { centreId, dayOfWeek, date }
export async function listUpcomingForStudent(studentId, daysAhead, filters = {}) {
  const result = await pool.query(
    `SELECT ${LESSON_FIELDS}
     FROM private_lessons pl
     JOIN centres ce ON ce.id = pl.centre_id
     LEFT JOIN users i ON i.id = pl.instructor_id
     WHERE pl.student_id = $1 AND pl.status = 'scheduled'
       AND pl.lesson_date BETWEEN ${TODAY} AND ${TODAY} + ($2::int - 1)
       AND ((pl.lesson_date + pl.start_time) AT TIME ZONE 'Asia/Singapore') > NOW()
       AND ($3::int IS NULL OR pl.centre_id = $3)
       AND ($4::int IS NULL OR EXTRACT(DOW FROM pl.lesson_date) = $4)
       AND ($5::date IS NULL OR pl.lesson_date = $5)
     ORDER BY pl.lesson_date, pl.start_time`,
    [studentId, daysAhead, filters.centreId ?? null, filters.dayOfWeek ?? null, filters.date ?? null]
  );
  return result.rows.map((r) => ({
    type: "private",
    id: r.id,
    title: "1-on-1 session",
    centreId: r.centre_id,
    centre: r.centre,
    instructor: r.instructor,
    date: r.lesson_date,
    startTime: r.start_time,
    endTime: r.end_time,
    creditCost: r.credit_cost,
  }));
}

// Dojos a student can ask for a 1-on-1 at.
export async function listOpenCentres() {
  const result = await pool.query("SELECT id, name FROM centres WHERE is_active ORDER BY name");
  return result.rows;
}

// Saves a new request, as one transaction. Checks: the dojo is open, the date
// is from tomorrow up to REQUEST_DAYS_AHEAD days away, the student has an
// active membership and enough credits, and hasn't too many requests waiting.
// The credits are only taken when the dojo schedules the session.
export async function requestLesson(studentId, { centreId, preferredDate, preferredTime, note }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Same lock the admin page uses for this student, so a request and a
    // scheduling at the same moment can't clash.
    await client.query("SELECT pg_advisory_xact_lock(7102, $1)", [studentId]);

    const centre = await client.query("SELECT name FROM centres WHERE id = $1 AND is_active", [centreId]);
    if (centre.rowCount === 0) throw new RequestError(400, "Please choose an open dojo.");

    const dateCheck = await client.query(
      `SELECT $1::date > ${TODAY} AS after_today, $1::date <= ${TODAY} + $2::int AS in_range`,
      [preferredDate, REQUEST_DAYS_AHEAD]
    );
    if (!dateCheck.rows[0].after_today) throw new RequestError(400, "Please pick a date from tomorrow onwards.");
    if (!dateCheck.rows[0].in_range) {
      throw new RequestError(400, `Please pick a date within the next ${REQUEST_DAYS_AHEAD} days.`);
    }

    const membership = await client.query(
      `SELECT 1 FROM memberships
       WHERE student_id = $1 AND status = 'active' AND start_date <= $2::date AND end_date >= $2::date
       LIMIT 1`,
      [studentId, preferredDate]
    );
    if (membership.rowCount === 0) {
      throw new RequestError(403, "You need an active membership on that date. You can renew it on the Payments page.");
    }

    const open = await client.query(
      "SELECT COUNT(*)::int AS count FROM private_lessons WHERE student_id = $1 AND status = 'requested'",
      [studentId]
    );
    if (open.rows[0].count >= MAX_OPEN_REQUESTS) {
      throw new RequestError(
        409,
        `You already have ${MAX_OPEN_REQUESTS} requests waiting. Please wait for the dojo to reply, or withdraw one.`
      );
    }

    const balance = await client.query(
      "SELECT COALESCE(SUM(change), 0)::int AS credits FROM credit_transactions WHERE student_id = $1",
      [studentId]
    );
    const credits = balance.rows[0].credits;
    if (credits < PRIVATE_LESSON_CREDITS) {
      throw new RequestError(
        409,
        `A 1-on-1 session needs ${PRIVATE_LESSON_CREDITS} credits and you have ${credits}. You can top up on the Payments page.`
      );
    }

    const inserted = await client.query(
      `INSERT INTO private_lessons (student_id, centre_id, preferred_date, preferred_time, student_note, credit_cost, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'requested')
       RETURNING id`,
      [studentId, centreId, preferredDate, preferredTime, note, PRIVATE_LESSON_CREDITS]
    );

    await client.query("COMMIT");
    return { id: inserted.rows[0].id, centre: centre.rows[0].name, preferredDate };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// Withdraws a request the dojo hasn't scheduled yet. Saved as 'declined'
// (the table's status for a request that was closed without a session).
// No credits were taken for a request, so there's nothing to give back.
export async function withdrawRequest(studentId, lessonId) {
  const result = await pool.query(
    `UPDATE private_lessons
     SET status = 'declined', admin_note = 'Withdrawn by the student.', cancelled_at = NOW()
     WHERE id = $1 AND student_id = $2 AND status = 'requested'
     RETURNING id`,
    [lessonId, studentId]
  );
  if (result.rowCount === 0) {
    const found = await pool.query("SELECT status FROM private_lessons WHERE id = $1 AND student_id = $2", [lessonId, studentId]);
    if (found.rowCount === 0) throw new RequestError(404, "That request couldn't be found.");
    throw new RequestError(
      409,
      found.rows[0].status === "scheduled"
        ? "The dojo has already scheduled this session. Please contact the dojo to change it."
        : "This request has already been closed."
    );
  }
}
