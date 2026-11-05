// MODEL: talks to the database. Only SQL lives here, no request/response code.
// Tables used:
//   student_profiles(user_id, current_belt_id -> belt_ranks.id, belt_awarded_on date)
//   belt_ranks(id, name, colour, rank_order, min_months_at_rank, min_classes_at_rank)
//   grading_applications(student_id, grading_session_id, target_belt_id, status)
//   grading_sessions(id, grading_date)
import pool from "../db.js";

// "Today" in Singapore, not the database server's UTC (it would be a day behind between
// midnight and 8am local). Dates go out as YYYY-MM-DD text so the browser can't shift them.
const SGT_TODAY = "(NOW() AT TIME ZONE 'Asia/Singapore')::date";

// FSDP-9: the student's current belt, from their profile.
// Returns undefined if the student has no profile row yet (e.g. a brand-new sign-up).
export async function findCurrentBelt(userId) {
  const result = await pool.query(
    `SELECT
       r.id,
       r.name,
       r.colour,
       r.rank_order,
       r.min_months_at_rank,
       r.min_classes_at_rank,
       to_char(p.belt_awarded_on, 'YYYY-MM-DD') AS belt_awarded_on,
       (
         EXTRACT(YEAR  FROM age(${SGT_TODAY}, p.belt_awarded_on)) * 12 +
         EXTRACT(MONTH FROM age(${SGT_TODAY}, p.belt_awarded_on))
       )::int AS months_at_belt,
       (${SGT_TODAY} - p.belt_awarded_on)::int AS days_at_belt
     FROM student_profiles p
     JOIN belt_ranks r ON r.id = p.current_belt_id
     WHERE p.user_id = $1`,
    [userId]
  );
  return result.rows[0];
}

// the student's REAL belt history, newest first.
// Combines two real, dated sources and keeps one row per belt:
//   1. passed gradings  -> target_belt_id awarded on the grading session's date
//   2. the profile belt -> current_belt_id awarded on belt_awarded_on
//      (covers a student's entry belt, or a promotion not recorded as a grading)
// When a belt appears in both, the grading row wins (it has the real exam date).
export async function findBeltHistory(userId) {
  const result = await pool.query(
    `WITH awarded AS (
       SELECT ga.target_belt_id AS belt_id, gs.grading_date AS achieved_on, TRUE AS from_grading
       FROM grading_applications ga
       JOIN grading_sessions gs ON gs.id = ga.grading_session_id
       WHERE ga.student_id = $1 AND ga.status = 'passed'
       UNION ALL
       SELECT sp.current_belt_id, sp.belt_awarded_on, FALSE
       FROM student_profiles sp
       WHERE sp.user_id = $1
     ),
     one_per_belt AS (
       SELECT DISTINCT ON (a.belt_id) a.belt_id, a.achieved_on, a.from_grading
       FROM awarded a
       ORDER BY a.belt_id, a.from_grading DESC   -- prefer the grading row for a belt
     )
     SELECT r.id, r.name, r.colour, r.rank_order,
            to_char(d.achieved_on, 'YYYY-MM-DD') AS achieved_on,
            d.from_grading
     FROM one_per_belt d
     JOIN belt_ranks r ON r.id = d.belt_id
     ORDER BY d.achieved_on DESC, r.rank_order DESC`,
    [userId]
  );
  return result.rows;
}
