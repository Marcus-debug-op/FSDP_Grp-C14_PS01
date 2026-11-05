import pool from "../db.js";

function toCentre(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    isActive: row.is_active,
    activeClasses: Number(row.active_classes || 0),
  };
}

const centreSelect = `
  SELECT ce.id, ce.name, ce.address, ce.is_active,
         (SELECT COUNT(*) FROM classes c WHERE c.centre_id = ce.id AND c.is_active) AS active_classes
  FROM centres ce`;

export async function listCentres() {
  const result = await pool.query(`${centreSelect} ORDER BY ce.is_active DESC, ce.name`);
  return result.rows.map(toCentre);
}

export async function findCentreById(id) {
  const result = await pool.query(`${centreSelect} WHERE ce.id = $1`, [id]);
  return result.rows[0] ? toCentre(result.rows[0]) : undefined;
}

export async function findCentreByName(name, excludeId) {
  const result = await pool.query(
    "SELECT id FROM centres WHERE LOWER(name) = LOWER($1) AND id IS DISTINCT FROM $2::int",
    [name, excludeId ?? null]
  );
  return result.rows[0];
}

export async function createCentre({ name, address }) {
  const result = await pool.query("INSERT INTO centres (name, address) VALUES ($1, $2) RETURNING id", [name, address]);
  return findCentreById(result.rows[0].id);
}

export async function updateCentre(id, { name, address }) {
  const result = await pool.query("UPDATE centres SET name = $2, address = $3 WHERE id = $1 RETURNING id", [id, name, address]);
  return result.rows[0] ? findCentreById(id) : undefined;
}

export async function setCentreActive(id, isActive) {
  const result = await pool.query("UPDATE centres SET is_active = $2 WHERE id = $1 RETURNING id", [id, isActive]);
  return result.rows[0] ? findCentreById(id) : undefined;
}

export async function listInstructors() {
  const result = await pool.query("SELECT id, full_name FROM users WHERE role = 'instructor' ORDER BY full_name");
  return result.rows.map((row) => ({ id: row.id, fullName: row.full_name }));
}

const scheduleSql = `
  WITH days AS (
    SELECT d::date AS day FROM generate_series($1::date, $2::date, interval '1 day') AS d
  ),
  items AS (
    SELECT 'session-' || cs.id AS key, c.id AS class_id, c.title, cs.session_date AS day,
           cs.start_time, cs.end_time, c.centre_id, cs.instructor_id, cs.status, c.capacity,
           c.min_belt_id, c.max_belt_id
    FROM class_sessions cs
    JOIN classes c ON c.id = cs.class_id
    WHERE cs.session_date BETWEEN $1::date AND $2::date
    UNION ALL
    SELECT 'class-' || c.id || '-' || days.day, c.id, c.title, days.day,
           c.start_time, c.end_time, c.centre_id, c.instructor_id, 'scheduled', c.capacity,
           c.min_belt_id, c.max_belt_id
    FROM classes c
    JOIN days ON c.day_of_week % 7 = EXTRACT(DOW FROM days.day)
    WHERE c.is_active
      AND NOT EXISTS (SELECT 1 FROM class_sessions cs WHERE cs.class_id = c.id AND cs.session_date = days.day)
  )
  SELECT i.key, i.class_id, i.title, i.status, i.capacity, i.centre_id,
         to_char(i.day, 'YYYY-MM-DD') AS date,
         to_char(i.start_time, 'HH24:MI') AS start_time,
         to_char(i.end_time, 'HH24:MI') AS end_time,
         ce.name AS centre_name, u.id AS instructor_id, u.full_name AS instructor_name,
         minb.name AS min_belt_name, maxb.name AS max_belt_name
  FROM items i
  JOIN centres ce ON ce.id = i.centre_id
  LEFT JOIN users u ON u.id = i.instructor_id
  LEFT JOIN belt_ranks minb ON minb.id = i.min_belt_id
  LEFT JOIN belt_ranks maxb ON maxb.id = i.max_belt_id
  WHERE ($3::int IS NULL OR i.centre_id = $3::int)
    AND ($4::int IS NULL OR i.instructor_id = $4::int)
    AND ($5::boolean OR i.status <> 'cancelled')
  ORDER BY i.day, i.start_time, ce.name, i.title`;

export async function listSchedule({ from, to, centreId, instructorId, includeCancelled }) {
  const result = await pool.query(scheduleSql, [from, to, centreId ?? null, instructorId ?? null, Boolean(includeCancelled)]);
  return result.rows.map((row) => ({
    id: row.key,
    classId: row.class_id,
    title: row.title,
    status: row.status,
    capacity: row.capacity,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    centreId: row.centre_id,
    centreName: row.centre_name,
    instructorId: row.instructor_id,
    instructorName: row.instructor_name,
    minBeltName: row.min_belt_name,
    maxBeltName: row.max_belt_name,
  }));
}

export async function getOverview({ from, to }) {
  const [schedule, counts] = await Promise.all([
    listSchedule({ from, to }),
    pool.query(`
      SELECT
        (SELECT COUNT(*) FROM classes WHERE is_active) AS active_classes,
        (SELECT COUNT(*) FROM centres WHERE is_active) AS active_centres,
        (SELECT COUNT(*) FROM users WHERE role = 'instructor') AS instructors`),
  ]);
  const row = counts.rows[0];
  return {
    lessonsThisWeek: schedule.length,
    activeClasses: Number(row.active_classes),
    activeCentres: Number(row.active_centres),
    instructors: Number(row.instructors),
  };
}
