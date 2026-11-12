import pool from "../db.js";

const SGT_TODAY = "(NOW() AT TIME ZONE 'Asia/Singapore')::date";

const SESSION_SELECT = `
  SELECT gs.id, gs.status,
         to_char(gs.grading_date, 'YYYY-MM-DD') AS grading_date,
         to_char(gs.start_time, 'HH24:MI') AS start_time,
         to_char(gs.registration_closes_on, 'YYYY-MM-DD') AS registration_closes_on,
         (gs.registration_closes_on >= ${SGT_TODAY}) AS registration_open,
         (gs.status = 'scheduled' AND gs.grading_date >= ${SGT_TODAY}) AS is_upcoming,
         ce.id AS centre_id, ce.name AS centre_name,
         ex.id AS examiner_id, ex.full_name AS examiner_name,
         minb.id AS min_belt_id, minb.name AS min_belt_name, minb.rank_order AS min_belt_rank,
         maxb.id AS max_belt_id, maxb.name AS max_belt_name, maxb.rank_order AS max_belt_rank,
         COUNT(ga.id) FILTER (WHERE ga.instructor_approved_at IS NOT NULL AND ga.status <> 'withdrawn')::int AS approved_count,
         COUNT(ga.id) FILTER (WHERE ga.instructor_approved_at IS NULL AND ga.status <> 'withdrawn')::int AS awaiting_count
  FROM grading_sessions gs
  JOIN centres ce ON ce.id = gs.centre_id
  LEFT JOIN users ex ON ex.id = gs.examiner_id
  LEFT JOIN belt_ranks minb ON minb.id = gs.min_target_belt_id
  LEFT JOIN belt_ranks maxb ON maxb.id = gs.max_target_belt_id
  LEFT JOIN grading_applications ga ON ga.grading_session_id = gs.id`;

const SESSION_GROUP = "GROUP BY gs.id, ce.id, ex.id, minb.id, maxb.id";

function toSession(row) {
  return {
    id: row.id,
    status: row.status,
    gradingDate: row.grading_date,
    startTime: row.start_time,
    registrationClosesOn: row.registration_closes_on,
    registrationOpen: row.registration_open,
    isUpcoming: row.is_upcoming,
    centre: { id: row.centre_id, name: row.centre_name },
    examiner: row.examiner_id ? { id: row.examiner_id, name: row.examiner_name } : null,
    minBelt: row.min_belt_id ? { id: row.min_belt_id, name: row.min_belt_name, rankOrder: row.min_belt_rank } : null,
    maxBelt: row.max_belt_id ? { id: row.max_belt_id, name: row.max_belt_name, rankOrder: row.max_belt_rank } : null,
    approvedCount: row.approved_count,
    awaitingCount: row.awaiting_count,
  };
}

export async function listSessions() {
  const result = await pool.query(`${SESSION_SELECT} ${SESSION_GROUP} ORDER BY gs.grading_date, gs.start_time`);
  return result.rows.map(toSession);
}

export async function findSession(id) {
  const result = await pool.query(`${SESSION_SELECT} WHERE gs.id = $1 ${SESSION_GROUP}`, [id]);
  return result.rows[0] ? toSession(result.rows[0]) : null;
}

export async function findActiveCentre(id) {
  const result = await pool.query("SELECT id, name FROM centres WHERE id = $1 AND is_active", [id]);
  return result.rows[0] || null;
}

export async function findInstructor(id) {
  const result = await pool.query("SELECT id, full_name FROM users WHERE id = $1 AND role = 'instructor'", [id]);
  return result.rows[0] || null;
}

export async function findBelt(id) {
  const result = await pool.query("SELECT id, name, rank_order, ladder FROM belt_ranks WHERE id = $1", [id]);
  return result.rows[0] || null;
}

export async function findClashingSession({ centreId, gradingDate, startTime }) {
  const result = await pool.query(
    `SELECT id FROM grading_sessions
     WHERE centre_id = $1 AND grading_date = $2::date AND start_time = $3::time AND status <> 'cancelled'
     LIMIT 1`,
    [centreId, gradingDate, startTime]
  );
  return result.rows[0] || null;
}

export async function createSession({ centreId, gradingDate, startTime, registrationClosesOn, examinerId, minBeltId, maxBeltId }) {
  const result = await pool.query(
    `INSERT INTO grading_sessions
       (centre_id, grading_date, start_time, registration_closes_on, examiner_id, min_target_belt_id, max_target_belt_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [centreId, gradingDate, startTime, registrationClosesOn, examinerId, minBeltId, maxBeltId]
  );
  return findSession(result.rows[0].id);
}

export async function listApprovedApplications(sessionId) {
  const result = await pool.query(
    `SELECT ga.id, ga.status,
            to_char(ga.applied_at AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD') AS applied_on,
            to_char(ga.instructor_approved_at AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD') AS approved_on,
            ap.full_name AS approved_by,
            u.id AS student_id, u.full_name AS student_name, u.email AS student_email,
            cb.id AS current_belt_id, cb.name AS current_belt_name,
            nb.id AS next_belt_id, nb.name AS next_belt_name,
            nb.min_months_at_rank, nb.min_classes_at_rank,
            tb.id AS target_belt_id, tb.name AS target_belt_name, tb.rank_order AS target_belt_rank, tb.ladder AS target_ladder,
            EXTRACT(YEAR FROM age(gs.grading_date, so.date_of_birth))::int AS age_on_grading_date,
            (EXTRACT(YEAR FROM age(${SGT_TODAY}, sp.belt_awarded_on)) * 12
              + EXTRACT(MONTH FROM age(${SGT_TODAY}, sp.belt_awarded_on)))::int AS months_at_belt,
            (SELECT COUNT(*)::int
               FROM attendance a
               JOIN class_sessions cs ON cs.id = a.session_id
              WHERE a.student_id = u.id AND a.status IN ('present', 'late')
                AND cs.status <> 'cancelled' AND cs.session_date > sp.belt_awarded_on)
            + (SELECT COUNT(*)::int
                 FROM external_attendance e
                WHERE e.student_id = u.id AND e.attended_on > sp.belt_awarded_on) AS classes_since_belt,
            EXISTS (
              SELECT 1 FROM memberships m
              WHERE m.student_id = u.id AND m.status = 'active'
                AND m.start_date <= gs.grading_date AND m.end_date >= gs.grading_date
            ) AS member_on_grading_date
     FROM grading_applications ga
     JOIN grading_sessions gs ON gs.id = ga.grading_session_id
     JOIN users u ON u.id = ga.student_id
     JOIN belt_ranks tb ON tb.id = ga.target_belt_id
     LEFT JOIN users ap ON ap.id = ga.instructor_approved_by
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN student_onboarding so ON so.user_id = u.id
     LEFT JOIN belt_ranks cb ON cb.id = sp.current_belt_id
     LEFT JOIN belt_ranks nb ON nb.rank_order = cb.rank_order + 1
     WHERE ga.grading_session_id = $1
       AND ga.instructor_approved_at IS NOT NULL
       AND ga.status <> 'withdrawn'
     ORDER BY u.full_name`,
    [sessionId]
  );
  return result.rows;
}
