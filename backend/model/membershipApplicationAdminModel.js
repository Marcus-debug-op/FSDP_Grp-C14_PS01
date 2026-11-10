import pool from "../db.js";
import { recordDecisionAndMaybeActivate } from "./registrationActivationModel.js";

// Read-only payment summary, matched by student, purpose and the selected plan's
// CURRENT amount. This is for staff visibility, NOT proof of which specific
// application a payment belongs to. Do not use this result to activate membership.
const paymentSummary = `
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE p.status = 'succeeded')::int AS succeeded_count,
           COUNT(*) FILTER (WHERE p.status = 'pending')::int AS pending_count,
           MAX(p.updated_at) FILTER (WHERE p.status = 'succeeded') AS last_paid_at
    FROM payments p
    JOIN membership_plans mp ON mp.id = a.plan_id
    WHERE p.student_id = a.student_id
      AND p.purpose = 'membership'
      AND p.currency = 'sgd'
      AND p.amount_cents = mp.price_cents
  ) pay ON TRUE`;

const selectFields = `
 SELECT a.id, a.student_id, a.plan_id, a.centre_id AS preferred_centre_id,
        a.approval_status, a.book_status, a.approved_by AS reviewed_by, a.reviewed_at,
        a.photo_review_status, a.photo_review_note, a.photo_requested_at, a.photo_resubmitted_at, a.photo_accepted_at,
        a.rejection_reason, a.created_at,
        u.full_name, u.email,
        mp.name AS plan_name, mp.price_cents,
        ce.name AS centre_name,
        COALESCE(pay.succeeded_count,0) AS succeeded_count,
        COALESCE(pay.pending_count,0) AS pending_count,
        pay.last_paid_at
 FROM membership_applications a
 JOIN users u ON u.id = a.student_id AND u.role = 'student'
 JOIN membership_plans mp ON mp.id = a.plan_id
 JOIN centres ce ON ce.id = a.centre_id
 ${paymentSummary}`;

export async function listApplications(status = 'pending') {
  const result = await pool.query(
    `${selectFields} WHERE ($1::text = 'all' OR a.approval_status = $1)
     ORDER BY CASE WHEN a.approval_status='pending' THEN 0 ELSE 1 END, a.created_at DESC LIMIT 200`,
    [status]
  );
  return result.rows;
}

export async function findApplication(id) {
  const result = await pool.query(
    `${selectFields}
      WHERE a.id = $1`, [id]
  );
  // Personal/experience details are fetched independently to avoid duplicate columns
  // and never return photo_data or evidence_data bytes.
  const row = result.rows[0];
  if (!row) return null;
  const details = await pool.query(
    `SELECT to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
            gender, experience_level, previous_rank, experience_notes,
            evidence_filename, phone, training_goal,
            (photo_data IS NOT NULL) AS has_photo
     FROM student_onboarding WHERE user_id = $1`, [row.student_id]
  );
  return { ...row, onboarding: details.rows[0] || null };
}


export async function decideApplication({
  applicationId,
  reviewerId,
  decision,
  rejectionReason
}) {
  return recordDecisionAndMaybeActivate({
    applicationId,
    reviewerId,
    decision,
    rejectionReason
  });
}


// Retrieve the photo only when an admin explicitly opens an application.
// Join through the application ID, never accept a student ID from the browser.
export async function findApplicationPhoto(applicationId) {
  const result = await pool.query(
    `SELECT o.photo_mime, o.photo_data
     FROM membership_applications a
     JOIN users u ON u.id = a.student_id AND u.role = 'student'
     JOIN student_onboarding o ON o.user_id = a.student_id
     WHERE a.id = $1`,
    [applicationId]
  );
  return result.rows[0] || null;
}

// Request a replacement photo, without rejecting the entire membership application.
export async function requestPhotoResubmission({ applicationId, adminId, reason }) {
  const result = await pool.query(
    `UPDATE membership_applications
     SET photo_review_status = 'resubmission_requested',
         photo_review_note = $2,
         photo_requested_by = $3,
         photo_requested_at = NOW(),
         photo_resubmitted_at = NULL,
         photo_accepted_at = NULL
     WHERE id = $1 AND approval_status = 'pending'
       AND photo_review_status IN ('pending_review','resubmitted')
     RETURNING id, photo_review_status, photo_review_note`,
    [applicationId, reason, adminId]
  );
  return result.rows[0] || null;
}

// Review completion is deliberately separate from Shihan membership approval.
export async function acceptApplicationPhoto(applicationId) {
  const result = await pool.query(
    `UPDATE membership_applications SET photo_review_status = 'accepted',
         photo_review_note = NULL, photo_accepted_at = NOW()
     WHERE id = $1 AND approval_status = 'pending'
       AND photo_review_status IN ('pending_review','resubmitted')
       AND EXISTS (SELECT 1 FROM student_onboarding o
                   WHERE o.user_id = membership_applications.student_id
                     AND o.photo_data IS NOT NULL)
     RETURNING id, photo_review_status`, [applicationId]
  );
  return result.rows[0] || null;
}
