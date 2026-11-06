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

const attendanceSessionsSql = `
  SELECT cs.id, to_char(cs.session_date, 'YYYY-MM-DD') AS date,
         to_char(cs.start_time, 'HH24:MI') AS start_time, to_char(cs.end_time, 'HH24:MI') AS end_time,
         cs.status, c.title, c.capacity, ce.id AS centre_id, ce.name AS centre_name,
         u.id AS instructor_id, u.full_name AS instructor_name,
         COALESCE(b.booked, 0) AS booked,
         COALESCE(a.present, 0) AS present, COALESCE(a.late, 0) AS late,
         COALESCE(a.absent, 0) AS absent, COALESCE(a.excused, 0) AS excused
  FROM class_sessions cs
  JOIN classes c ON c.id = cs.class_id
  JOIN centres ce ON ce.id = c.centre_id
  JOIN users u ON u.id = cs.instructor_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS booked FROM bookings bk WHERE bk.session_id = cs.id AND bk.status = 'booked'
  ) b ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE at.status = 'present')::int AS present,
           COUNT(*) FILTER (WHERE at.status = 'late')::int AS late,
           COUNT(*) FILTER (WHERE at.status = 'absent')::int AS absent,
           COUNT(*) FILTER (WHERE at.status = 'excused')::int AS excused
    FROM attendance at WHERE at.session_id = cs.id
  ) a ON true
  WHERE cs.session_date BETWEEN $1::date AND $2::date
    AND ($3::int IS NULL OR c.centre_id = $3::int)
    AND ($4::int IS NULL OR cs.instructor_id = $4::int)
    AND ($5::text IS NULL OR EXISTS (
      SELECT 1 FROM users s
      WHERE (s.full_name ILIKE '%' || $5::text || '%' OR s.email ILIKE '%' || $5::text || '%')
        AND (EXISTS (SELECT 1 FROM attendance x WHERE x.session_id = cs.id AND x.student_id = s.id)
          OR EXISTS (SELECT 1 FROM bookings y WHERE y.session_id = cs.id AND y.student_id = s.id AND y.status = 'booked'))
    ))
  ORDER BY cs.session_date DESC, cs.start_time DESC, ce.name, c.title`;

export async function listAttendanceSessions({ from, to, centreId, instructorId, student }) {
  const result = await pool.query(attendanceSessionsSql, [from, to, centreId ?? null, instructorId ?? null, student || null]);
  return result.rows.map((row) => ({
    id: row.id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    title: row.title,
    capacity: row.capacity,
    centreId: row.centre_id,
    centreName: row.centre_name,
    instructorId: row.instructor_id,
    instructorName: row.instructor_name,
    booked: row.booked,
    present: row.present,
    late: row.late,
    absent: row.absent,
    excused: row.excused,
  }));
}

export async function findAttendanceSession(id) {
  const result = await pool.query(
    `SELECT cs.id, to_char(cs.session_date, 'YYYY-MM-DD') AS date,
            to_char(cs.start_time, 'HH24:MI') AS start_time, to_char(cs.end_time, 'HH24:MI') AS end_time,
            cs.status, c.title, ce.name AS centre_name, u.full_name AS instructor_name
     FROM class_sessions cs
     JOIN classes c ON c.id = cs.class_id
     JOIN centres ce ON ce.id = c.centre_id
     JOIN users u ON u.id = cs.instructor_id
     WHERE cs.id = $1`,
    [id]
  );
  const row = result.rows[0];
  if (!row) return undefined;
  return {
    id: row.id, date: row.date, startTime: row.start_time, endTime: row.end_time, status: row.status,
    title: row.title, centreName: row.centre_name, instructorName: row.instructor_name,
  };
}

export async function listSessionStudents(sessionId) {
  const result = await pool.query(
    `WITH people AS (
       SELECT student_id FROM bookings WHERE session_id = $1 AND status = 'booked'
       UNION
       SELECT student_id FROM attendance WHERE session_id = $1
     )
     SELECT s.id, s.full_name, s.email, br.name AS belt_name,
            a.status, a.method, a.checked_in_at, r.full_name AS recorded_by_name,
            (bk.id IS NOT NULL) AS booked
     FROM people p
     JOIN users s ON s.id = p.student_id
     LEFT JOIN attendance a ON a.session_id = $1 AND a.student_id = p.student_id
     LEFT JOIN bookings bk ON bk.session_id = $1 AND bk.student_id = p.student_id AND bk.status = 'booked'
     LEFT JOIN student_profiles sp ON sp.user_id = s.id
     LEFT JOIN belt_ranks br ON br.id = sp.current_belt_id
     LEFT JOIN users r ON r.id = a.recorded_by
     ORDER BY s.full_name`,
    [sessionId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    beltName: row.belt_name,
    status: row.status || "not_checked_in",
    method: row.method,
    checkedInAt: row.checked_in_at,
    recordedByName: row.recorded_by_name,
    booked: row.booked,
  }));
}

const attendanceTotalsSql = `
  SELECT
    COUNT(DISTINCT cs.id) FILTER (WHERE cs.status <> 'cancelled')::int AS sessions,
    COUNT(a.id) FILTER (WHERE a.status IN ('present', 'late'))::int AS attended,
    COUNT(a.id) FILTER (WHERE a.status = 'late')::int AS late,
    COUNT(a.id) FILTER (WHERE a.status = 'absent')::int AS absent,
    COUNT(DISTINCT a.student_id) FILTER (WHERE a.status IN ('present', 'late'))::int AS students
  FROM class_sessions cs
  LEFT JOIN attendance a ON a.session_id = cs.id
  WHERE cs.session_date BETWEEN $1::date AND $2::date`;

function withRate(row) {
  const marked = row.attended + row.absent;
  return { ...row, rate: marked ? Math.round((row.attended / marked) * 100) : null };
}

export async function getAttendanceTotals({ from, to }) {
  const result = await pool.query(attendanceTotalsSql, [from, to]);
  return withRate(result.rows[0]);
}

export async function getDailyAttendance({ from, to }) {
  const result = await pool.query(
    `WITH days AS (SELECT d::date AS day FROM generate_series($1::date, $2::date, interval '1 day') AS d),
     stats AS (
       SELECT cs.session_date AS day,
              COUNT(DISTINCT cs.id) FILTER (WHERE cs.status <> 'cancelled')::int AS sessions,
              COUNT(a.id) FILTER (WHERE a.status IN ('present', 'late'))::int AS attended,
              COUNT(a.id) FILTER (WHERE a.status = 'absent')::int AS absent
       FROM class_sessions cs
       LEFT JOIN attendance a ON a.session_id = cs.id
       WHERE cs.session_date BETWEEN $1::date AND $2::date
       GROUP BY cs.session_date
     )
     SELECT to_char(days.day, 'YYYY-MM-DD') AS period,
            COALESCE(stats.sessions, 0) AS sessions, COALESCE(stats.attended, 0) AS attended, COALESCE(stats.absent, 0) AS absent
     FROM days LEFT JOIN stats ON stats.day = days.day
     ORDER BY days.day`,
    [from, to]
  );
  return result.rows.map(withRate);
}

export async function getMonthlyAttendance({ from, to }) {
  const result = await pool.query(
    `WITH months AS (
       SELECT m::date AS month
       FROM generate_series(date_trunc('month', $1::date), date_trunc('month', $2::date), interval '1 month') AS m
     ),
     stats AS (
       SELECT date_trunc('month', cs.session_date)::date AS month,
              COUNT(DISTINCT cs.id) FILTER (WHERE cs.status <> 'cancelled')::int AS sessions,
              COUNT(a.id) FILTER (WHERE a.status IN ('present', 'late'))::int AS attended,
              COUNT(a.id) FILTER (WHERE a.status = 'absent')::int AS absent
       FROM class_sessions cs
       LEFT JOIN attendance a ON a.session_id = cs.id
       WHERE cs.session_date BETWEEN $1::date AND $2::date
       GROUP BY 1
     )
     SELECT to_char(months.month, 'YYYY-MM') AS period,
            COALESCE(stats.sessions, 0) AS sessions, COALESCE(stats.attended, 0) AS attended, COALESCE(stats.absent, 0) AS absent
     FROM months LEFT JOIN stats ON stats.month = months.month
     ORDER BY months.month`,
    [from, to]
  );
  return result.rows.map(withRate);
}

export async function getCentreAttendance({ from, to }) {
  const result = await pool.query(
    `SELECT ce.id, ce.name,
            COUNT(DISTINCT cs.id) FILTER (WHERE cs.status <> 'cancelled')::int AS sessions,
            COUNT(a.id) FILTER (WHERE a.status IN ('present', 'late'))::int AS attended,
            COUNT(a.id) FILTER (WHERE a.status = 'absent')::int AS absent
     FROM class_sessions cs
     JOIN classes c ON c.id = cs.class_id
     JOIN centres ce ON ce.id = c.centre_id
     LEFT JOIN attendance a ON a.session_id = cs.id
     WHERE cs.session_date BETWEEN $1::date AND $2::date
     GROUP BY ce.id, ce.name
     HAVING COUNT(a.id) > 0
     ORDER BY attended DESC, ce.name`,
    [from, to]
  );
  return result.rows.map((row) => withRate({ ...row, centreId: row.id, centreName: row.name }));
}
