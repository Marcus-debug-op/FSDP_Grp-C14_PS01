// New member activation — only after BOTH Shihan approval and a verified, linked payment.
// This service is safe to call from either the admin decision or the webhook.
import pool from "../db.js";

const TODAY = "(NOW() AT TIME ZONE 'Asia/Singapore')::date";

async function activateLockedApplication(client, application) {
  // application is locked FOR UPDATE by the caller.
  if (application.approval_status !== 'approved' ||
      application.photo_review_status !== 'accepted' ||
      !application.registration_payment_id) return { activated: false, reason: 'not_ready' };

  const { rows: payments } = await client.query(
    `SELECT p.id, p.status, p.student_id, p.amount_cents, p.currency, p.purpose,
            mp.price_cents, mp.duration_months, mp.name
     FROM payments p
     JOIN membership_plans mp ON mp.id = $2
     WHERE p.id = $1 FOR UPDATE OF p`,
    [application.registration_payment_id, application.plan_id]
  );
  const payment = payments[0];
  if (!payment || payment.status !== 'succeeded' || payment.purpose !== 'membership' ||
      payment.currency !== 'sgd' || payment.student_id !== application.student_id ||
      payment.amount_cents !== payment.price_cents || payment.name !== 'Registration (New Member)') {
    return { activated: false, reason: 'unverified_payment' };
  }

  // payment_id is UNIQUE in memberships. ON CONFLICT makes this idempotent.
  // We require matching existing membership if another call already inserted it.
  const existing = await client.query(
    'SELECT id, student_id, plan_id FROM memberships WHERE payment_id=$1',
    [payment.id]
  );
  if (existing.rowCount) {
    const row = existing.rows[0];
    if (row.student_id !== application.student_id || row.plan_id !== application.plan_id) {
      throw new Error('Payment already linked to an unexpected membership');
    }
    return { activated: false, reason: 'already_active', membershipId: row.id };
  }

  // ASK rule: a new membership lasts until 31 December of the year it starts
  // (join in March -> ends in December that year, not next March).
  const inserted = await client.query(
    `INSERT INTO memberships (student_id, plan_id, start_date, end_date, status, payment_id)
     VALUES ($1, $2, ${TODAY}, make_date(EXTRACT(YEAR FROM ${TODAY})::int, 12, 31), 'active', $3)
     ON CONFLICT (payment_id) WHERE payment_id IS NOT NULL DO NOTHING RETURNING id`,
    [application.student_id, application.plan_id, payment.id]
  );
  if (!inserted.rowCount) return { activated: false, reason: 'already_active' };

  await client.query(
    "UPDATE student_onboarding SET membership_status = 'active' WHERE user_id=$1",
    [application.student_id]
  );

  // Give the new member a starting belt so the belt and grading pages work.
  // Children (12 and under) start on the first children's belt, everyone else
  // on "Ungraded". A previous rank from another dojo is NOT copied here: it
  // stays pending until an admin/instructor confirms it.
  // Skipped if the student already has a belt, or if no belt ladder exists.
  await client.query(
    `INSERT INTO student_profiles (user_id, current_belt_id, belt_awarded_on, home_centre_id)
     SELECT o.user_id, start_belt.id, ${TODAY}, $2
     FROM student_onboarding o
     CROSS JOIN LATERAL (
       SELECT br.id FROM belt_ranks br
       WHERE br.ladder = CASE WHEN date_part('year', age(${TODAY}, o.date_of_birth)) <= 12
                              THEN 'children' ELSE 'adult' END
       ORDER BY br.rank_order LIMIT 1
     ) start_belt
     WHERE o.user_id = $1
     ON CONFLICT (user_id) DO NOTHING`,
    [application.student_id, application.centre_id]
  );
  return { activated: true, membershipId: inserted.rows[0].id };
}

// Payment webhook calls this AFTER its own transaction has committed.
export async function activateApplicationAfterPayment(paymentId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT * FROM membership_applications
       WHERE registration_payment_id=$1 FOR UPDATE`, [paymentId]
    );
    if (!result.rowCount) {
      await client.query('COMMIT');
      return { activated: false, reason: 'no_linked_application' };
    }
    const outcome = await activateLockedApplication(client, result.rows[0]);
    await client.query('COMMIT');
    return outcome;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

// Admin controller calls this INSTEAD of the old decideApplication() SQL.
// Keeps approval + activation atomic (if payment already succeeded).
export async function recordDecisionAndMaybeActivate({ applicationId, reviewerId, decision, rejectionReason }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query(
      `SELECT * FROM membership_applications WHERE id=$1 FOR UPDATE`, [applicationId]
    );
    const app = locked.rows[0];
    if (!app || app.approval_status !== 'pending' ||
        (decision === 'approved' && app.photo_review_status !== 'accepted')) {
      await client.query('ROLLBACK');
      return null;
    }
    const updated = await client.query(
      `UPDATE membership_applications
       SET approval_status=$2::varchar, approved_by=$3, reviewed_at=NOW(),
           rejection_reason=CASE WHEN $2::varchar='rejected' THEN $4 ELSE NULL END
       WHERE id=$1 RETURNING *`,
      [applicationId, decision, reviewerId, rejectionReason || null]
    );
    const application = updated.rows[0];
    const activation = decision === 'approved'
      ? await activateLockedApplication(client, application)
      : { activated: false, reason: 'rejected' };
    await client.query('COMMIT');
    return { application: {
      id: application.id, student_id: application.student_id,
      approval_status: application.approval_status, reviewed_at: application.reviewed_at,
    }, activation };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
