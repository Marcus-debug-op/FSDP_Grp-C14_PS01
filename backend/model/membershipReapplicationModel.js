import pool from '../db.js';

// Reconsider the existing application, not a second account/application/payment.
// Holds row lock. Audit previous reason. Successful payment is reused only if explicitly linked.
export async function reapplyMembership(studentId, note) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM membership_applications WHERE student_id=$1 FOR UPDATE`, [studentId]
    );
    const app = rows[0];
    if (!app || app.approval_status !== 'rejected') {
      await client.query('ROLLBACK');
      return { allowed:false, reason:'Only a rejected application can be reconsidered.' };
    }
    const active = await client.query(
      `SELECT 1 FROM memberships WHERE student_id=$1 AND status='active'
       AND start_date<=CURRENT_DATE AND end_date>=CURRENT_DATE LIMIT 1`, [studentId]
    );
    if (active.rowCount) {
      await client.query('ROLLBACK');
      return { allowed:false, reason:'This account already has an active membership.' };
    }
    const { rows: payments } = await client.query(
      `SELECT id, status FROM payments WHERE student_id=$1 AND purpose='membership'
       AND amount_cents=(SELECT price_cents FROM membership_plans WHERE id=$2)
       ORDER BY id DESC`, [studentId,app.plan_id]
    );
    // Never silently re-charge a rejected paid applicant or relink an arbitrary historical payment.
    if (payments.some(p => p.status === 'succeeded' && p.id !== app.registration_payment_id)) {
      await client.query('ROLLBACK');
      return { allowed:false, reason:'A successful payment needs staff verification before reconsideration. Contact an administrator.' };
    }
    if (payments.some(p => p.id === app.registration_payment_id && p.status === 'refunded')) {
      await client.query('ROLLBACK');
      return { allowed:false, reason:'This application has a refunded payment. Contact an administrator.' };
    }
    await client.query(
      `INSERT INTO membership_reapplication_history
       (application_id, student_id, prior_rejection_reason, reapply_note)
       VALUES ($1,$2,$3,$4)`,
      [app.id,studentId,app.rejection_reason,note]
    );
    const updated=await client.query(
      `UPDATE membership_applications
       SET approval_status='pending', approved_by=NULL, reviewed_at=NULL, rejection_reason=NULL,
           photo_review_status='pending_review', photo_review_note=NULL,
           photo_requested_by=NULL, photo_requested_at=NULL,
           photo_resubmitted_at=NULL, photo_accepted_at=NULL
       WHERE id=$1 AND approval_status='rejected'
       RETURNING id,approval_status,registration_payment_id`,[app.id]
    );
    await client.query('COMMIT');
    return { allowed:true, application: updated.rows[0] };
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
