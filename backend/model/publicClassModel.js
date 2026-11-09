import pool from "../db.js";

// Read-only weekly schedule. Class instructors come from users, not frontend constants.
export async function listPublicClasses() {
  const result = await pool.query(`
    SELECT c.id, c.title, c.day_of_week,
           to_char(c.start_time, 'HH24:MI') AS start_time,
           to_char(c.end_time, 'HH24:MI') AS end_time,
           ce.name AS dojo, ce.address AS dojo_address,
           u.id AS instructor_id, u.full_name AS instructor_name
    FROM classes c
    JOIN centres ce ON ce.id = c.centre_id
    JOIN users u ON u.id = c.instructor_id AND u.role = 'instructor'
    WHERE c.is_active = TRUE AND ce.is_active = TRUE
    ORDER BY CASE WHEN c.day_of_week = 0 THEN 7 ELSE c.day_of_week END,
             c.start_time, c.id
  `);
  return result.rows;
}
