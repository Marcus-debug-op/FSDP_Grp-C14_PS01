import pool from '../db.js';
export async function getOpenHQAlerts() {
 const result=await pool.query(
   `SELECT n.id, n.application_id, n.event_type, n.created_at,
           a.approval_status, u.full_name, u.email,
           o.phone, o.experience_level, c.name AS centre_name
    FROM hq_application_alerts n
    JOIN membership_applications a ON a.id=n.application_id
    JOIN users u ON u.id=a.student_id
    LEFT JOIN student_onboarding o ON o.user_id=u.id
    JOIN centres c ON c.id=a.centre_id
    WHERE n.acknowledged_at IS NULL
    ORDER BY n.created_at DESC LIMIT 100`
 );return result.rows;
}
export async function acknowledgeHQAlert(alertId,adminId) {
 const result=await pool.query(
  `UPDATE hq_application_alerts
   SET acknowledged_at=NOW(),acknowledged_by=$2
   WHERE id=$1 AND acknowledged_at IS NULL RETURNING id`,[alertId,adminId]
 );return result.rows[0] || null;
}
