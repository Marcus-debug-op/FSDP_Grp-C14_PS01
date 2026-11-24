// Read-only application progress for the signed-in student.
// Do not use this status display to grant authorization to member-only features.
import pool from '../db.js';

export async function findStudentApplicationStatus(studentId) {
  const result = await pool.query(
    `SELECT a.id AS application_id,
            a.approval_status,
            a.plan_id,
            a.photo_review_status,
            a.photo_review_note,
            a.rejection_reason,
            a.created_at AS submitted_at,
            a.reviewed_at,
            mp.name AS plan_name,
            ce.name AS preferred_centre,
            p.status AS linked_payment_status,
            (p.id IS NOT NULL) AS has_linked_payment,
            m.id AS membership_id,
            m.status AS membership_status,
            to_char(m.start_date, 'YYYY-MM-DD') AS membership_start_date,
            to_char(m.end_date, 'YYYY-MM-DD') AS membership_end_date,
            (m.status = 'active' AND m.start_date <= (NOW() AT TIME ZONE 'Asia/Singapore')::date
             AND m.end_date >= (NOW() AT TIME ZONE 'Asia/Singapore')::date) AS membership_currently_active
     FROM membership_applications a
     JOIN membership_plans mp ON mp.id = a.plan_id
     LEFT JOIN centres ce ON ce.id = a.centre_id
     LEFT JOIN payments p ON p.id = a.registration_payment_id
                         AND p.student_id = a.student_id
     LEFT JOIN memberships m ON m.payment_id = p.id
                             AND m.student_id = a.student_id
                             AND m.plan_id = a.plan_id
     WHERE a.student_id = $1
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT 1`,
    [studentId]
  );
  return result.rows[0] ?? null;
}

// The membership in force today, from ANY source (registration, renewal, or an
// existing member added by an admin), so access never depends on the application.
export async function findCurrentMembership(studentId) {
  const result = await pool.query(
    `SELECT m.id, mp.name AS plan_name,
            to_char(m.start_date, 'YYYY-MM-DD') AS start_date,
            to_char(m.end_date, 'YYYY-MM-DD') AS end_date
     FROM memberships m
     JOIN membership_plans mp ON mp.id = m.plan_id
     WHERE m.student_id = $1 AND m.status = 'active'
       AND m.start_date <= (NOW() AT TIME ZONE 'Asia/Singapore')::date
       AND m.end_date >= (NOW() AT TIME ZONE 'Asia/Singapore')::date
     ORDER BY m.end_date DESC, m.id DESC
     LIMIT 1`,
    [studentId]
  );
  return result.rows[0] ?? null;
}
