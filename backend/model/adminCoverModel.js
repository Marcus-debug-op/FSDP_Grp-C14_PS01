import pool from "../db.js";
import { createOffer, withdrawPendingOffers } from "./lessonOfferModel.js";
import { LessonError, assertInstructorFree } from "./privateLessonModel.js";
import * as Change from "./sessionChangeModel.js";

const HAS_STARTED = "((cs.session_date + cs.start_time) AT TIME ZONE 'Asia/Singapore') <= NOW()";

const COVER_SELECT = `
  SELECT cr.id, cr.status, cr.reason, cr.requested_at, cr.resolved_at,
         cs.id AS session_id, cs.status AS session_status,
         to_char(cs.session_date, 'YYYY-MM-DD') AS session_date,
         to_char(cs.start_time, 'HH24:MI') AS start_time,
         to_char(cs.end_time, 'HH24:MI') AS end_time,
         ${HAS_STARTED} AS has_started,
         c.title, ce.id AS centre_id, ce.name AS centre_name,
         oi.id AS original_id, oi.full_name AS original_name,
         ti.id AS teaching_id, ti.full_name AS teaching_name,
         (SELECT COUNT(*)::int FROM bookings b WHERE b.session_id = cs.id AND b.status = 'booked') AS booked,
         rb.full_name AS resolved_by_name,
         lo.id AS offer_id, lo.status AS offer_status, lo.response_note AS offer_note,
         lo.instructor_id AS offer_instructor_id, lo.instructor_name AS offer_instructor_name,
         lo.offered_at AS offer_offered_at, lo.responded_at AS offer_responded_at,
         (SELECT COALESCE(json_agg(json_build_object('id', d.instructor_id, 'name', du.full_name, 'note', d.response_note)
                                   ORDER BY d.responded_at), '[]'::json)
          FROM lesson_offers d JOIN users du ON du.id = d.instructor_id
          WHERE d.session_id = cs.id AND d.status = 'declined' AND d.offered_at >= cr.requested_at) AS declined
  FROM cover_requests cr
  JOIN class_sessions cs ON cs.id = cr.session_id
  JOIN classes c ON c.id = cs.class_id
  JOIN centres ce ON ce.id = COALESCE(cs.centre_id, c.centre_id)
  JOIN users oi ON oi.id = cr.instructor_id
  JOIN users ti ON ti.id = cs.instructor_id
  LEFT JOIN users rb ON rb.id = cr.resolved_by
  LEFT JOIN LATERAL (
    SELECT lo.id, lo.status, lo.response_note, lo.instructor_id, u.full_name AS instructor_name,
           lo.offered_at, lo.responded_at
    FROM lesson_offers lo
    JOIN users u ON u.id = lo.instructor_id
    WHERE lo.session_id = cs.id AND lo.status <> 'withdrawn' AND lo.offered_at >= cr.requested_at
    ORDER BY lo.offered_at DESC, lo.id DESC
    LIMIT 1
  ) lo ON TRUE`;

const VIEWS = {
  open: { where: "cr.status = 'open'", order: "cs.session_date, cs.start_time, cr.id" },
  recent: {
    where: "cr.status <> 'open' AND cr.resolved_at >= NOW() - INTERVAL '14 days'",
    order: "cr.resolved_at DESC, cr.id DESC",
  },
};

export const COVER_VIEWS = Object.keys(VIEWS);

function toCover(row) {
  return {
    id: row.id,
    status: row.status,
    reason: row.reason,
    requestedAt: row.requested_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by_name,
    session: {
      id: row.session_id,
      status: row.session_status,
      title: row.title,
      date: row.session_date,
      startTime: row.start_time,
      endTime: row.end_time,
      hasStarted: row.has_started,
      booked: row.booked,
      centre: { id: row.centre_id, name: row.centre_name },
    },
    originalInstructor: { id: row.original_id, name: row.original_name },
    teachingInstructor: { id: row.teaching_id, name: row.teaching_name },
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
    declined: row.declined,
  };
}

export async function listCoverRequests(view) {
  const filter = VIEWS[view];
  const [rows, counts] = await Promise.all([
    pool.query(`${COVER_SELECT} WHERE ${filter.where} ORDER BY ${filter.order} LIMIT 200`),
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE cr.status = 'open')::int AS open,
              COUNT(*) FILTER (WHERE cr.status = 'open' AND NOT EXISTS (
                SELECT 1 FROM lesson_offers lo
                WHERE lo.session_id = cr.session_id AND lo.status = 'pending'))::int AS needs_action
       FROM cover_requests cr`
    ),
  ]);
  return { requests: rows.rows.map(toCover), counts: counts.rows[0] };
}

export async function findCoverRequest(id, db = pool) {
  const result = await db.query(`${COVER_SELECT} WHERE cr.id = $1`, [id]);
  return result.rows[0] ? toCover(result.rows[0]) : null;
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

async function lockOpenRequest(client, requestId) {
  const result = await client.query(
    `SELECT cr.id, cr.status, cr.instructor_id AS original_id, cr.requested_at,
            cs.id AS session_id, cs.status AS session_status, cs.instructor_id AS teaching_id,
            COALESCE(cs.centre_id, c.centre_id) AS centre_id,
            to_char(cs.session_date, 'YYYY-MM-DD') AS session_date,
            to_char(cs.start_time, 'HH24:MI') AS start_time,
            to_char(cs.end_time, 'HH24:MI') AS end_time,
            ${HAS_STARTED} AS has_started
     FROM cover_requests cr
     JOIN class_sessions cs ON cs.id = cr.session_id
     JOIN classes c ON c.id = cs.class_id
     WHERE cr.id = $1
     FOR UPDATE OF cr`,
    [requestId]
  );
  const request = result.rows[0];
  if (!request) throw new LessonError(404, "Cover request not found.");
  if (request.status !== "open") throw new LessonError(409, "This cover request has already been closed.");
  return request;
}

export async function offerCover({ requestId, instructorId, adminId }) {
  const offerId = await withTransaction(async (client) => {
    const request = await lockOpenRequest(client, requestId);
    if (request.session_status !== "scheduled") throw new LessonError(409, "This lesson is no longer scheduled.");
    if (request.has_started) throw new LessonError(409, "This lesson has already started.");
    if (instructorId === request.original_id || instructorId === request.teaching_id) {
      throw new LessonError(409, "Please pick a different instructor from the one who asked for cover.");
    }

    const instructor = await client.query("SELECT full_name FROM users WHERE id = $1 AND role = 'instructor'", [instructorId]);
    if (instructor.rowCount === 0) throw new LessonError(400, "Please choose an instructor.");
    const name = instructor.rows[0].full_name;

    const declined = await client.query(
      `SELECT 1 FROM lesson_offers
       WHERE session_id = $1 AND instructor_id = $2 AND status = 'declined' AND offered_at >= $3`,
      [request.session_id, instructorId, request.requested_at]
    );
    if (declined.rowCount > 0) throw new LessonError(409, `${name} already declined this lesson. Please pick someone else.`);

    await client.query("SELECT pg_advisory_xact_lock(7101, $1)", [instructorId]);
    await assertInstructorFree(client, {
      instructorId,
      instructorName: name,
      centreId: request.centre_id,
      date: request.session_date,
      startTime: request.start_time,
      endTime: request.end_time,
      sessionId: request.session_id,
    });

    const offer = await createOffer({ sessionId: request.session_id, instructorId, adminId }, client);
    return offer.id;
  });
  return { offerId, request: await findCoverRequest(requestId) };
}

export async function cancelCoverLesson({ requestId, user, reason }) {
  const request = await withTransaction((client) => lockOpenRequest(client, requestId));

  let result = { session: null, affected: [] };
  if (request.session_status !== "cancelled") {
    try {
      result = await Change.cancelSession(request.session_id, user, reason);
    } catch (err) {
      if (err instanceof Change.ChangeError) throw new LessonError(err.status, err.message);
      throw err;
    }
  }

  await withTransaction(async (client) => {
    await withdrawPendingOffers({ sessionId: request.session_id }, client);
    await client.query(
      `UPDATE cover_requests SET status = 'cancelled', resolved_at = NOW(), resolved_by = $2
       WHERE id = $1 AND status = 'open'`,
      [requestId, user.id]
    );
  });

  return { ...result, request: await findCoverRequest(requestId) };
}
