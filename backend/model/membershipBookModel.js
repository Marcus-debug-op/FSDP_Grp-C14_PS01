import pool from "../db.js";

// No direct updates to membership activation, application approval or payments.
// A book can only progress for an active, approved, paid registration.
const nextStatus = {
  not_prepared: "preparing",
  preparing: "ready",
  ready: "issued",
};

export async function advanceBookStatus({ applicationId, next, adminId }) {
  const current = Object.keys(nextStatus).find((s) => nextStatus[s] === next);
  if (!current || !Number.isSafeInteger(adminId) || adminId < 1) {
    return null;
  }
  const result = await pool.query(
    `UPDATE membership_applications a
        SET book_status = $2::varchar
      WHERE a.id = $1
        AND a.approval_status = 'approved'
        AND COALESCE(a.book_status, 'not_prepared') = $3::varchar
        AND EXISTS (
          SELECT 1
            FROM payments p
            JOIN memberships m ON m.payment_id = p.id
           WHERE p.id = a.registration_payment_id
             AND p.student_id = a.student_id
             AND p.status = 'succeeded'
             AND m.student_id = a.student_id
             AND m.status = 'active'
        )
      RETURNING a.id, a.student_id, a.book_status`,
    [applicationId, next, current]
  );
  return result.rows[0] || null;
}
