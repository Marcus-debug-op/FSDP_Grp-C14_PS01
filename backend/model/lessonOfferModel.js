import pool from "../db.js";
import { notify } from "./notificationModel.js";
import { longDate, clock } from "../utils/notices.js";

export const OFFER_STATUSES = ["pending", "accepted", "declined", "withdrawn"];

export async function createOffer({ sessionId = null, privateLessonId = null, instructorId, adminId }, db = pool) {
  if (Boolean(sessionId) === Boolean(privateLessonId)) {
    throw new Error("createOffer needs either sessionId or privateLessonId.");
  }
  await db.query(
    `UPDATE lesson_offers SET status = 'withdrawn', responded_at = NOW()
     WHERE status = 'pending'
       AND (($1::int IS NOT NULL AND session_id = $1::int) OR ($2::int IS NOT NULL AND private_lesson_id = $2::int))`,
    [sessionId, privateLessonId]
  );
  const result = await db.query(
    `INSERT INTO lesson_offers (session_id, private_lesson_id, instructor_id, offered_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, session_id, private_lesson_id, instructor_id, status`,
    [sessionId, privateLessonId, instructorId, adminId]
  );
  return result.rows[0];
}

export async function withdrawPendingOffers({ sessionId = null, privateLessonId = null }, db = pool) {
  await db.query(
    `UPDATE lesson_offers SET status = 'withdrawn', responded_at = NOW()
     WHERE status = 'pending'
       AND (($1::int IS NOT NULL AND session_id = $1::int) OR ($2::int IS NOT NULL AND private_lesson_id = $2::int))`,
    [sessionId, privateLessonId]
  );
}

export async function sendOfferNotice(offerId) {
  const result = await pool.query(
    `SELECT lo.id, lo.instructor_id,
            COALESCE(c.title, 'Private lesson with ' || st.full_name) AS title,
            to_char(COALESCE(cs.session_date, pl.lesson_date), 'YYYY-MM-DD') AS date,
            to_char(COALESCE(cs.start_time, pl.start_time), 'HH24:MI') AS start_time,
            to_char(COALESCE(cs.end_time, pl.end_time), 'HH24:MI') AS end_time,
            ce.name AS centre
     FROM lesson_offers lo
     LEFT JOIN class_sessions cs ON cs.id = lo.session_id
     LEFT JOIN classes c ON c.id = cs.class_id
     LEFT JOIN private_lessons pl ON pl.id = lo.private_lesson_id
     LEFT JOIN users st ON st.id = pl.student_id
     LEFT JOIN centres ce ON ce.id = COALESCE(cs.centre_id, c.centre_id, pl.centre_id)
     WHERE lo.id = $1`,
    [offerId]
  );
  const offer = result.rows[0];
  if (!offer) return null;
  const when = `${longDate(offer.date)}, ${clock(offer.start_time)} to ${clock(offer.end_time)}`;
  return notify({
    userId: offer.instructor_id,
    type: "lesson_offer",
    title: `Can you take this lesson? ${longDate(offer.date)}`,
    body: `${offer.title} on ${when} at ${offer.centre}. Please accept or decline.`,
    dedupeKey: `lesson-offer:${offer.id}`,
    email: {
      subject: `Lesson offer: ${offer.title}, ${longDate(offer.date)}`,
      paragraphs: [
        "The dojo would like you to take this lesson.",
        `Lesson: ${offer.title}`,
        `When: ${when}`,
        `Where: ${offer.centre}`,
        "Please accept or decline it as soon as you can.",
      ],
      button: { label: "Open my dashboard", path: "/dashboard" },
    },
  });
}
