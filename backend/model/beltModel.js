// MODEL: talks to the database. Only SQL lives here, no request/response code.
//   student_profiles(user_id, current_belt_id -> belt_ranks.id, belt_awarded_on date)
//   belt_ranks(id, name, colour, rank_order, min_months_at_rank, min_classes_at_rank)
//   belt_requirements(belt_rank_id -> belt_ranks.id, description, sort_order)
import pool from "../db.js";

// between midnight and 8am local time. Dates go out as YYYY-MM-DD text so the browser
// cannot shift them by a timezone.
const SGT_TODAY = "(NOW() AT TIME ZONE 'Asia/Singapore')::date";

// student has no profile row yet (e.g. a brand-new sign-up).
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

// The full belt ladder with each rank's grading requirements, lowest rank first.
export async function findBeltLadder() {
  const result = await pool.query(
    `SELECT
       r.id,
       r.name,
       r.colour,
       r.rank_order,
       r.min_months_at_rank,
       r.min_classes_at_rank,
       COALESCE(
         json_agg(br.description ORDER BY br.sort_order) FILTER (WHERE br.id IS NOT NULL),
         '[]'
       ) AS requirements
     FROM belt_ranks r
     LEFT JOIN belt_requirements br ON br.belt_rank_id = r.id
     GROUP BY r.id
     ORDER BY r.rank_order`
  );
  return result.rows;
}

// The student's current rank_order and the date it was awarded, used to mark the ladder.
// Returns undefined if the student has no profile row yet.
export async function findCurrentRank(userId) {
  const result = await pool.query(
    `SELECT r.rank_order, to_char(p.belt_awarded_on, 'YYYY-MM-DD') AS belt_awarded_on
       FROM student_profiles p
       JOIN belt_ranks r ON r.id = p.current_belt_id
      WHERE p.user_id = $1`,
    [userId]
  );
  return result.rows[0];
}
