import pool from "../db.js";
import { createOffer, withdrawPendingOffers } from "./lessonOfferModel.js";

const SGT_TODAY = "(NOW() AT TIME ZONE 'Asia/Singapore')::date";

const LESSON_SELECT = `
  SELECT pl.id, pl.status, pl.credit_cost, pl.student_note, pl.admin_note, pl.preferred_time,
         to_char(pl.preferred_date, 'YYYY-MM-DD') AS preferred_date,
         to_char(pl.lesson_date, 'YYYY-MM-DD') AS lesson_date,
         to_char(pl.start_time, 'HH24:MI') AS start_time,
         to_char(pl.end_time, 'HH24:MI') AS end_time,
         pl.requested_at, pl.scheduled_at, pl.cancelled_at,
         (pl.lesson_date IS NOT NULL AND pl.lesson_date <= ${SGT_TODAY}) AS is_due,
         s.id AS student_id, s.full_name AS student_name, s.email AS student_email,
         ce.id AS centre_id, ce.name AS centre_name,
         i.id AS instructor_id, i.full_name AS instructor_name,
         lo.id AS offer_id, lo.status AS offer_status, lo.response_note AS offer_note,
         lo.instructor_id AS offer_instructor_id, lo.instructor_name AS offer_instructor_name,
         lo.offered_at AS offer_offered_at, lo.responded_at AS offer_responded_at,
         (SELECT COALESCE(SUM(ct.change), 0)::int FROM credit_transactions ct WHERE ct.student_id = s.id) AS student_credits
  FROM private_lessons pl
  JOIN users s ON s.id = pl.student_id
  JOIN centres ce ON ce.id = pl.centre_id
  LEFT JOIN users i ON i.id = pl.instructor_id
  LEFT JOIN LATERAL (
    SELECT lo.id, lo.status, lo.response_note, lo.instructor_id, oi.full_name AS instructor_name,
           lo.offered_at, lo.responded_at
    FROM lesson_offers lo
    JOIN users oi ON oi.id = lo.instructor_id
    WHERE lo.private_lesson_id = pl.id AND lo.status <> 'withdrawn'
    ORDER BY lo.offered_at DESC, lo.id DESC
    LIMIT 1
  ) lo ON TRUE`;

const VIEW_FILTERS = {
  requests: { where: "pl.status = 'requested'", order: "pl.preferred_date, pl.requested_at" },
  upcoming: { where: "pl.status = 'scheduled'", order: "pl.lesson_date, pl.start_time" },
  past: {
    where: "pl.status IN ('completed', 'no_show', 'cancelled', 'declined')",
    order: "COALESCE(pl.lesson_date, pl.preferred_date) DESC, pl.id DESC",
  },
};

function toLesson(row) {
  return {
    id: row.id,
    status: row.status,
    creditCost: row.credit_cost,
    studentNote: row.student_note,
    adminNote: row.admin_note,
    preferredDate: row.preferred_date,
    preferredTime: row.preferred_time,
    date: row.lesson_date,
    startTime: row.start_time,
    endTime: row.end_time,
    isDue: row.is_due,
    student: { id: row.student_id, name: row.student_name, email: row.student_email, credits: row.student_credits },
    centre: { id: row.centre_id, name: row.centre_name },
    instructor: row.instructor_id ? { id: row.instructor_id, name: row.instructor_name } : null,
    offer: row.offer_id
      ? {
          id: row.offer_id,
          status: row.offer_status,
          note: row.offer_note,
          instructor: { id: row.offer_instructor_id, name: row.offer_instructor_name },
          offeredAt: row.offer_offered_at,
          respondedAt: row.offer_responded_at,
        }
      : null,
  };
}

export async function listLessons(view) {
  const filter = VIEW_FILTERS[view];
  const result = await pool.query(`${LESSON_SELECT} WHERE ${filter.where} ORDER BY ${filter.order} LIMIT 200`);
  return result.rows.map(toLesson);
}

export async function countLessons() {
  const result = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE status = 'requested')::int AS requests,
            COUNT(*) FILTER (WHERE status = 'scheduled')::int AS upcoming
     FROM private_lessons`
  );
  return result.rows[0];
}

export async function findLesson(id, db = pool) {
  const result = await db.query(`${LESSON_SELECT} WHERE pl.id = $1`, [id]);
  return result.rows[0] ? toLesson(result.rows[0]) : null;
}

const LATEST_PRIVATE_OFFER = `
  SELECT lo.status FROM lesson_offers lo
  WHERE lo.private_lesson_id = pl.id AND lo.status <> 'withdrawn'
  ORDER BY lo.offered_at DESC, lo.id DESC LIMIT 1`;

export const TRAVEL_GAP_HOURS = 3;

function clashRule(centre, start, end) {
  const overlaps = `${start} < $3::time AND ${end} > $2::time`;
  const tooClose = `($1::date + ${start}) < ($1::date + $3::time) + INTERVAL '${TRAVEL_GAP_HOURS} hours'
      AND ($1::date + ${end}) > ($1::date + $2::time) - INTERVAL '${TRAVEL_GAP_HOURS} hours'`;
  return {
    where: `CASE WHEN ${centre} = $6::int THEN ${overlaps} ELSE ${tooClose} END`,
    travel: `NOT (${overlaps}) AS travel_only`,
  };
}

const SESSION_RULE = clashRule("ce.id", "cs.start_time", "cs.end_time");
const CLASS_RULE = clashRule("ce.id", "c.start_time", "c.end_time");
const PRIVATE_RULE = clashRule("ce.id", "pl.start_time", "pl.end_time");

const INSTRUCTOR_CONFLICTS = `
  SELECT cs.instructor_id, 'class' AS kind, c.title AS label, ce.name AS centre_name,
         to_char(cs.start_time, 'HH24:MI') AS start_time, to_char(cs.end_time, 'HH24:MI') AS end_time,
         ${SESSION_RULE.travel}
  FROM class_sessions cs
  JOIN classes c ON c.id = cs.class_id
  JOIN centres ce ON ce.id = COALESCE(cs.centre_id, c.centre_id)
  WHERE cs.session_date = $1::date AND cs.status <> 'cancelled'
    AND ${SESSION_RULE.where}
  UNION ALL
  SELECT c.instructor_id, 'class', c.title, ce.name,
         to_char(c.start_time, 'HH24:MI'), to_char(c.end_time, 'HH24:MI'),
         ${CLASS_RULE.travel}
  FROM classes c
  JOIN centres ce ON ce.id = c.centre_id
  WHERE c.is_active AND c.day_of_week % 7 = EXTRACT(DOW FROM $1::date)
    AND ${CLASS_RULE.where}
    AND NOT EXISTS (SELECT 1 FROM class_sessions cs2 WHERE cs2.class_id = c.id AND cs2.session_date = $1::date)
  UNION ALL
  SELECT pl.instructor_id, 'private', 'Private lesson', ce.name,
         to_char(pl.start_time, 'HH24:MI'), to_char(pl.end_time, 'HH24:MI'),
         ${PRIVATE_RULE.travel}
  FROM private_lessons pl
  JOIN centres ce ON ce.id = pl.centre_id
  WHERE pl.status = 'scheduled' AND pl.lesson_date = $1::date
    AND pl.id IS DISTINCT FROM $4::int
    AND ${PRIVATE_RULE.where}
    AND COALESCE((${LATEST_PRIVATE_OFFER}), 'accepted') <> 'declined'
  UNION ALL
  SELECT lo.instructor_id, 'cover', 'Cover offer: ' || c.title, ce.name,
         to_char(cs.start_time, 'HH24:MI'), to_char(cs.end_time, 'HH24:MI'),
         ${SESSION_RULE.travel}
  FROM lesson_offers lo
  JOIN class_sessions cs ON cs.id = lo.session_id
  JOIN classes c ON c.id = cs.class_id
  JOIN centres ce ON ce.id = COALESCE(cs.centre_id, c.centre_id)
  WHERE lo.status = 'pending' AND cs.session_date = $1::date AND cs.status <> 'cancelled'
    AND cs.id IS DISTINCT FROM $5::int
    AND ${SESSION_RULE.where}`;

function toConflict(row) {
  return { kind: row.kind, travelOnly: row.travel_only, label: row.label, centreName: row.centre_name, startTime: row.start_time, endTime: row.end_time };
}

export async function listInstructorAvailability({ date, startTime, endTime, centreId, excludeLessonId = null, excludeSessionId = null }) {
  const [instructors, conflicts] = await Promise.all([
    pool.query("SELECT id, full_name FROM users WHERE role = 'instructor' ORDER BY full_name"),
    pool.query(INSTRUCTOR_CONFLICTS, [date, startTime, endTime, excludeLessonId, excludeSessionId, centreId]),
  ]);
  return instructors.rows.map((row) => {
    const busy = conflicts.rows.filter((c) => c.instructor_id === row.id).map(toConflict);
    return { id: row.id, name: row.full_name, isFree: busy.length === 0, conflicts: busy };
  });
}

export class LessonError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function describeClash(clash) {
  if (clash.kind === "private") return "a private lesson";
  if (clash.kind === "cover") return `an unanswered cover offer for ${clash.label.replace("Cover offer: ", "")}`;
  return clash.label;
}

export async function findInstructorClash(db, { instructorId, centreId, date, startTime, endTime, lessonId = null, sessionId = null }) {
  const busy = await db.query(
    `SELECT * FROM (${INSTRUCTOR_CONFLICTS}) conflicts WHERE instructor_id = $7 ORDER BY travel_only LIMIT 1`,
    [date, startTime, endTime, lessonId, sessionId, centreId, instructorId]
  );
  return busy.rows[0] || null;
}

export async function assertInstructorFree(db, { instructorId, instructorName, centreId, date, startTime, endTime, lessonId = null, sessionId = null }) {
  const clash = await findInstructorClash(db, { instructorId, centreId, date, startTime, endTime, lessonId, sessionId });
  if (clash?.travel_only) {
    throw new LessonError(
      409,
      `${instructorName} has ${describeClash(clash)} at ${clash.centre_name}, ${formatClock(clash.start_time)} to ${formatClock(clash.end_time)}. Lessons at different dojos need at least ${TRAVEL_GAP_HOURS} hours between them.`
    );
  }
  if (clash) {
    throw new LessonError(
      409,
      `${instructorName} is not free then. They have ${describeClash(clash)} at ${clash.centre_name}, ${formatClock(clash.start_time)} to ${formatClock(clash.end_time)}.`
    );
  }
}

function formatClock(value) {
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${suffix}`;
}

export async function scheduleLesson({ lessonId = null, studentId, centreId, instructorId, date, startTime, endTime, adminNote, adminId }) {
  return withTransaction(async (client) => {
    let creditCost = 3;

    if (lessonId) {
      const existing = await client.query(
        "SELECT student_id, status, credit_cost FROM private_lessons WHERE id = $1 FOR UPDATE",
        [lessonId]
      );
      if (existing.rowCount === 0) throw new LessonError(404, "Private lesson not found.");
      if (existing.rows[0].status !== "requested") throw new LessonError(409, "This request has already been handled.");
      studentId = existing.rows[0].student_id;
      creditCost = existing.rows[0].credit_cost;
    }

    const student = await client.query("SELECT full_name FROM users WHERE id = $1 AND role = 'student'", [studentId]);
    if (student.rowCount === 0) throw new LessonError(404, "Student not found.");
    const studentName = student.rows[0].full_name;

    const centre = await client.query("SELECT 1 FROM centres WHERE id = $1 AND is_active", [centreId]);
    if (centre.rowCount === 0) throw new LessonError(400, "Please choose an open dojo.");

    const instructor = await client.query("SELECT full_name FROM users WHERE id = $1 AND role = 'instructor'", [instructorId]);
    if (instructor.rowCount === 0) throw new LessonError(400, "Please choose an instructor.");
    const instructorName = instructor.rows[0].full_name;

    await client.query("SELECT pg_advisory_xact_lock(7101, $1)", [instructorId]);
    await client.query("SELECT pg_advisory_xact_lock(7102, $1)", [studentId]);

    await assertInstructorFree(client, { instructorId, instructorName, centreId, date, startTime, endTime, lessonId });

    const studentClash = await client.query(
      `SELECT 'a private lesson' AS label FROM private_lessons
       WHERE student_id = $1 AND status = 'scheduled' AND lesson_date = $2::date
         AND id IS DISTINCT FROM $5::int AND start_time < $4::time AND end_time > $3::time
       UNION ALL
       SELECT c.title FROM bookings b
       JOIN class_sessions cs ON cs.id = b.session_id
       JOIN classes c ON c.id = cs.class_id
       WHERE b.student_id = $1 AND b.status = 'booked' AND cs.status <> 'cancelled'
         AND cs.session_date = $2::date AND cs.start_time < $4::time AND cs.end_time > $3::time
       LIMIT 1`,
      [studentId, date, startTime, endTime, lessonId]
    );
    if (studentClash.rowCount > 0) {
      throw new LessonError(409, `${studentName} already has ${studentClash.rows[0].label} booked at that time.`);
    }

    const balance = await client.query(
      "SELECT COALESCE(SUM(change), 0)::int AS credits FROM credit_transactions WHERE student_id = $1",
      [studentId]
    );
    const credits = balance.rows[0].credits;
    if (credits < creditCost) {
      throw new LessonError(
        409,
        `${studentName} has ${credits} credit${credits === 1 ? "" : "s"}. A private lesson needs ${creditCost}.`
      );
    }

    let id = lessonId;
    if (lessonId) {
      await client.query(
        `UPDATE private_lessons
         SET centre_id = $2, instructor_id = $3, lesson_date = $4, start_time = $5, end_time = $6,
             admin_note = $7, status = 'scheduled', scheduled_by = $8, scheduled_at = NOW()
         WHERE id = $1`,
        [lessonId, centreId, instructorId, date, startTime, endTime, adminNote, adminId]
      );
    } else {
      const inserted = await client.query(
        `INSERT INTO private_lessons
           (student_id, centre_id, preferred_date, instructor_id, lesson_date, start_time, end_time,
            credit_cost, status, admin_note, scheduled_by, scheduled_at)
         VALUES ($1, $2, $3, $4, $3, $5, $6, $7, 'scheduled', $8, $9, NOW())
         RETURNING id`,
        [studentId, centreId, date, instructorId, startTime, endTime, creditCost, adminNote, adminId]
      );
      id = inserted.rows[0].id;
    }

    await client.query(
      `INSERT INTO credit_transactions (student_id, change, reason, private_lesson_id, note)
       VALUES ($1, $2, 'booking', $3, 'Private lesson')`,
      [studentId, -creditCost, id]
    );

    await createOffer({ privateLessonId: id, instructorId, adminId }, client);
    return findLesson(id, client);
  });
}

export async function changeInstructor({ lessonId, instructorId, adminId }) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT pl.status, pl.instructor_id, pl.centre_id, to_char(pl.lesson_date, 'YYYY-MM-DD') AS lesson_date,
              to_char(pl.start_time, 'HH24:MI') AS start_time, to_char(pl.end_time, 'HH24:MI') AS end_time,
              pl.lesson_date < ${SGT_TODAY} AS is_past,
              (${LATEST_PRIVATE_OFFER.replaceAll("pl.id", "$1")}) AS offer_status
       FROM private_lessons pl WHERE pl.id = $1 FOR UPDATE`,
      [lessonId]
    );
    if (existing.rowCount === 0) throw new LessonError(404, "Private lesson not found.");
    const lesson = existing.rows[0];
    if (lesson.status !== "scheduled") throw new LessonError(409, "Only upcoming lessons can change instructor.");
    if (lesson.is_past) throw new LessonError(409, "This lesson has already passed.");
    if (lesson.instructor_id === instructorId && lesson.offer_status !== "declined") {
      throw new LessonError(409, "This instructor already has the lesson.");
    }

    const instructor = await client.query("SELECT full_name FROM users WHERE id = $1 AND role = 'instructor'", [instructorId]);
    if (instructor.rowCount === 0) throw new LessonError(400, "Please choose an instructor.");
    if (lesson.instructor_id === instructorId) {
      throw new LessonError(409, `${instructor.rows[0].full_name} already declined this lesson. Please pick someone else.`);
    }

    await client.query("SELECT pg_advisory_xact_lock(7101, $1)", [instructorId]);
    await assertInstructorFree(client, {
      instructorId,
      instructorName: instructor.rows[0].full_name,
      centreId: lesson.centre_id,
      date: lesson.lesson_date,
      startTime: lesson.start_time,
      endTime: lesson.end_time,
      lessonId,
    });

    await client.query("UPDATE private_lessons SET instructor_id = $2 WHERE id = $1", [lessonId, instructorId]);
    await createOffer({ privateLessonId: lessonId, instructorId, adminId }, client);
    return findLesson(lessonId, client);
  });
}

export async function cancelLesson({ lessonId, adminNote }) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      "SELECT student_id, status FROM private_lessons WHERE id = $1 FOR UPDATE",
      [lessonId]
    );
    if (existing.rowCount === 0) throw new LessonError(404, "Private lesson not found.");
    const { student_id: studentId, status } = existing.rows[0];
    if (status !== "requested" && status !== "scheduled") {
      throw new LessonError(409, "Only requests and upcoming lessons can be cancelled.");
    }

    const nextStatus = status === "requested" ? "declined" : "cancelled";
    await client.query(
      `UPDATE private_lessons
       SET status = $2, admin_note = COALESCE($3, admin_note), cancelled_at = NOW()
       WHERE id = $1`,
      [lessonId, nextStatus, adminNote]
    );
    await withdrawPendingOffers({ privateLessonId: lessonId }, client);

    const charged = await client.query(
      "SELECT COALESCE(SUM(change), 0)::int AS total FROM credit_transactions WHERE private_lesson_id = $1",
      [lessonId]
    );
    const refund = -charged.rows[0].total;
    if (refund > 0) {
      await client.query(
        `INSERT INTO credit_transactions (student_id, change, reason, private_lesson_id, note)
         VALUES ($1, $2, 'booking_refund', $3, 'Private lesson cancelled')`,
        [studentId, refund, lessonId]
      );
    }

    return { lesson: await findLesson(lessonId, client), refunded: refund > 0 ? refund : 0 };
  });
}

export async function recordOutcome({ lessonId, outcome }) {
  const result = await pool.query(
    `UPDATE private_lessons SET status = $2
     WHERE id = $1 AND status = 'scheduled' AND lesson_date <= ${SGT_TODAY}
     RETURNING id`,
    [lessonId, outcome]
  );
  if (result.rowCount === 0) {
    const lesson = await findLesson(lessonId);
    if (!lesson) throw new LessonError(404, "Private lesson not found.");
    if (lesson.status !== "scheduled") throw new LessonError(409, "This lesson has already been closed.");
    throw new LessonError(409, "You can only mark a lesson on or after its date.");
  }
  return findLesson(lessonId);
}
