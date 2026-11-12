// MODEL: the student's own lessons, week by week (FSDP-41 My timetable) and
// looking back (FSDP-59 Lesson history).
// Group lessons come from bookings and attendance, 1-on-1 sessions from
// private_lessons, and outside events from external_attendance.
import pool from "../db.js";
import { CANCEL_NOTICE_HOURS, VENUE_JOIN } from "./lessonModel.js";

const NOW_SGT = "(NOW() AT TIME ZONE 'Asia/Singapore')";

// Instructors can record attendance until 24 hours after a lesson ends.
// Until then, a lesson with no record is "not marked yet" rather than missed.
const MARKING_HOURS = 24;

// Everything the student has on in one week (Monday to Sunday):
// - group lessons they booked, including ones the dojo cancelled or moved
// - their 1-on-1 sessions
// Past items also say whether the student attended.
export async function getWeek(studentId, weekStart) {
  const result = await pool.query(
    `SELECT * FROM (
       SELECT 'group' AS type, cs.id, cl.title,
              to_char(cs.session_date, 'YYYY-MM-DD') AS date,
              to_char(cs.start_time, 'HH24:MI') AS start_time,
              to_char(cs.end_time, 'HH24:MI') AS end_time,
              ce.id AS centre_id, ce.name AS centre, ce.address,
              usual.name AS usual_centre,
              (cs.centre_id IS NOT NULL AND cs.centre_id <> cl.centre_id) AS venue_changed,
              cs.status AS session_status, cs.change_note,
              u.full_name AS instructor, cl.credit_cost,
              ((cs.session_date + cs.start_time) AT TIME ZONE 'Asia/Singapore') <= NOW() AS has_started,
              ((cs.session_date + cs.start_time - make_interval(hours => $3::int))
                 AT TIME ZONE 'Asia/Singapore') > NOW() AS free_cancel,
              to_char(cs.session_date + cs.start_time - make_interval(hours => $3::int), 'YYYY-MM-DD') AS cancel_by_date,
              to_char(cs.session_date + cs.start_time - make_interval(hours => $3::int), 'HH24:MI') AS cancel_by_time,
              a.status AS attendance,
              (cs.session_date + cs.end_time + make_interval(hours => ${MARKING_HOURS})) > ${NOW_SGT} AS can_still_mark
       FROM bookings b
       JOIN class_sessions cs ON cs.id = b.session_id
       JOIN classes cl ON cl.id = cs.class_id
       ${VENUE_JOIN}
       JOIN centres usual ON usual.id = cl.centre_id
       JOIN users u ON u.id = cs.instructor_id
       LEFT JOIN attendance a ON a.session_id = cs.id AND a.student_id = b.student_id
       WHERE b.student_id = $1 AND b.status = 'booked'
         AND cs.session_date BETWEEN $2::date AND $2::date + 6

       UNION ALL

       SELECT 'private', pl.id, '1-on-1 session',
              to_char(pl.lesson_date, 'YYYY-MM-DD'),
              to_char(pl.start_time, 'HH24:MI'),
              to_char(pl.end_time, 'HH24:MI'),
              ce.id, ce.name, ce.address, ce.name, FALSE,
              CASE pl.status WHEN 'cancelled' THEN 'cancelled'
                             WHEN 'scheduled' THEN 'scheduled' ELSE 'completed' END,
              pl.admin_note, i.full_name, pl.credit_cost,
              ((pl.lesson_date + pl.start_time) AT TIME ZONE 'Asia/Singapore') <= NOW(),
              FALSE, NULL, NULL,
              CASE pl.status WHEN 'completed' THEN 'present' WHEN 'no_show' THEN 'absent' END,
              pl.status = 'scheduled'
       FROM private_lessons pl
       JOIN centres ce ON ce.id = pl.centre_id
       LEFT JOIN users i ON i.id = pl.instructor_id
       WHERE pl.student_id = $1 AND pl.lesson_date IS NOT NULL
         AND pl.status IN ('scheduled', 'completed', 'no_show', 'cancelled')
         AND pl.lesson_date BETWEEN $2::date AND $2::date + 6
     ) items
     ORDER BY date, start_time, title`,
    [studentId, weekStart, CANCEL_NOTICE_HOURS]
  );

  return result.rows.map((r) => {
    let status = "booked";
    if (r.session_status === "cancelled") status = "cancelled";
    else if (r.has_started) {
      status = ["present", "late"].includes(r.attendance) ? "attended"
        : r.attendance ? "missed"
        : r.can_still_mark ? "awaiting" // finished, attendance not recorded yet
        : "missed";
    } else if (r.venue_changed) status = "moved";

    return {
      type: r.type,
      id: r.id,
      title: r.title,
      date: r.date,
      startTime: r.start_time,
      endTime: r.end_time,
      centreId: r.centre_id,
      centre: r.centre,
      address: r.address,
      usualCentre: r.venue_changed ? r.usual_centre : null,
      instructor: r.instructor,
      status,
      changeNote: r.change_note,
      creditCost: r.credit_cost,
      // Only group lessons that haven't started can be cancelled by the student.
      canCancel: r.type === "group" && status !== "cancelled" && !r.has_started,
      freeCancel: r.free_cancel,
      cancelBy: r.cancel_by_date ? { date: r.cancel_by_date, time: r.cancel_by_time } : null,
    };
  });
}

// Every past lesson in one list, newest first. Each row has a status:
// attended, missed, cancelled (by the student or by the dojo), or awaiting
// (finished in the last day and attendance not recorded yet).
// Sources:
// - group lessons the student booked or has an attendance record for
//   (QR check-ins can exist without a booking)
// - 1-on-1 sessions that have happened or were cancelled
// - outside events (seminars, gradings elsewhere) from external_attendance
const HISTORY = `
  SELECT 'group' AS type, cs.id, cl.title,
         cs.session_date AS day,
         to_char(cs.start_time, 'HH24:MI') AS start_time,
         to_char(cs.end_time, 'HH24:MI') AS end_time,
         ce.id AS centre_id, ce.name AS centre, u.full_name AS instructor,
         CASE
           WHEN a.status IN ('present', 'late') THEN 'attended'
           WHEN cs.status = 'cancelled' THEN 'cancelled'
           WHEN b.status = 'cancelled' AND a.id IS NULL THEN 'cancelled'
           WHEN a.id IS NULL AND (cs.session_date + cs.end_time + make_interval(hours => ${MARKING_HOURS})) > ${NOW_SGT}
             THEN 'awaiting'
           ELSE 'missed'
         END AS status,
         CASE
           WHEN a.status IS NULL AND cs.status = 'cancelled' THEN 'dojo'
           WHEN a.status IS NULL AND b.status = 'cancelled' THEN 'you'
         END AS cancelled_by,
         CASE a.status WHEN 'late' THEN 'Arrived late' WHEN 'excused' THEN 'Excused'
                       ELSE CASE WHEN a.method = 'qr' THEN 'Checked in by QR' END END AS note
  FROM class_sessions cs
  JOIN classes cl ON cl.id = cs.class_id
  ${VENUE_JOIN}
  JOIN users u ON u.id = cs.instructor_id
  LEFT JOIN bookings b ON b.session_id = cs.id AND b.student_id = $1
  LEFT JOIN attendance a ON a.session_id = cs.id AND a.student_id = $1
  WHERE (b.id IS NOT NULL OR a.id IS NOT NULL)
    AND (cs.session_date + cs.start_time) < ${NOW_SGT}

  UNION ALL

  SELECT 'private', pl.id, '1-on-1 session',
         pl.lesson_date,
         to_char(pl.start_time, 'HH24:MI'), to_char(pl.end_time, 'HH24:MI'),
         ce.id, ce.name, i.full_name,
         CASE pl.status WHEN 'completed' THEN 'attended' WHEN 'cancelled' THEN 'cancelled'
                        WHEN 'scheduled' THEN 'awaiting' ELSE 'missed' END,
         CASE WHEN pl.status = 'cancelled' THEN 'dojo' END,
         NULL
  FROM private_lessons pl
  JOIN centres ce ON ce.id = pl.centre_id
  LEFT JOIN users i ON i.id = pl.instructor_id
  WHERE pl.student_id = $1 AND pl.lesson_date IS NOT NULL
    AND pl.status IN ('completed', 'no_show', 'cancelled', 'scheduled')
    AND (pl.lesson_date + pl.start_time) < ${NOW_SGT}

  UNION ALL

  SELECT 'external', ea.id, ea.event_name,
         ea.attended_on, NULL, NULL,
         NULL, ea.location, NULL,
         'attended', NULL, 'Outside event'
  FROM external_attendance ea
  WHERE ea.student_id = $1 AND ea.attended_on <= ${NOW_SGT}::date`;

// filters = { month: "YYYY-MM", centreId } (both optional).
// Outside events have no dojo, so they're left out when a dojo is picked.
export async function getHistory(studentId, filters = {}) {
  const [rows, options] = await Promise.all([
    pool.query(
      `SELECT type, id, title, to_char(day, 'YYYY-MM-DD') AS date, start_time, end_time,
              centre_id, centre, instructor, status, cancelled_by, note
       FROM (${HISTORY}) h
       WHERE ($2::text IS NULL OR to_char(day, 'YYYY-MM') = $2)
         AND ($3::int IS NULL OR centre_id = $3)
       ORDER BY day DESC, start_time DESC NULLS LAST
       LIMIT 300`,
      [studentId, filters.month ?? null, filters.centreId ?? null]
    ),
    pool.query(
      `SELECT
         COALESCE((SELECT json_agg(m ORDER BY m DESC) FROM
           (SELECT DISTINCT to_char(day, 'YYYY-MM') AS m FROM (${HISTORY}) h) months), '[]') AS months,
         COALESCE((SELECT json_agg(json_build_object('id', centre_id, 'name', centre) ORDER BY centre) FROM
           (SELECT DISTINCT centre_id, centre FROM (${HISTORY}) h WHERE centre_id IS NOT NULL) c), '[]') AS centres`,
      [studentId]
    ),
  ]);

  const items = rows.rows.map((r) => ({
    type: r.type,
    id: r.id,
    title: r.title,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    centreId: r.centre_id,
    centre: r.centre,
    instructor: r.instructor,
    status: r.status,
    cancelledBy: r.cancelled_by,
    note: r.note,
  }));

  const count = (s) => items.filter((i) => i.status === s).length;
  return {
    items,
    summary: { attended: count("attended"), missed: count("missed"), cancelled: count("cancelled") },
    options: options.rows[0],
  };
}
