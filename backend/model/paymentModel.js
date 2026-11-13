// MODEL: SQL for buying memberships and credit top-ups.
// Tables come from database/migrations/001_shared_schema.sql.
import pool from "../db.js";
// a paid grading exam fee creates the grading application.
import { createApplicationFromPayment } from "./gradingModel.js";

const TODAY = "(NOW() AT TIME ZONE 'Asia/Singapore')::date";


export async function hasMembershipHistory(studentId) {
  const result = await pool.query(
    "SELECT EXISTS (SELECT 1 FROM memberships WHERE student_id = $1) AS has_history",
    [studentId]
  );
  return result.rows[0].has_history;
}

export async function hasActiveMembership(studentId) {
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM memberships WHERE student_id = $1
        AND status = 'active' AND end_date >= ${TODAY}
    ) AS active`,
    [studentId]
  );
  return result.rows[0].active;
}


// Everything a student can buy. Prices always come from here, never from the browser.
export async function getOptions() {
  const [plans, packages] = await Promise.all([
    pool.query(
      `SELECT id, name, duration_months, price_cents
       FROM membership_plans WHERE is_active ORDER BY price_cents`
    ),
    pool.query(
      `SELECT id, name, credits, price_cents
       FROM credit_packages WHERE is_active ORDER BY price_cents`
    ),
  ]);
  return { plans: plans.rows, packages: packages.rows };
}

export async function hasPendingApplicationForPlan(studentId, planId) {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM membership_applications
       -- 'approved' too: Shihan may approve before the student pays. Rejected
       -- applications still cannot pay (they must request reconsideration first).
       WHERE student_id = $1 AND plan_id = $2 AND approval_status IN ('pending', 'approved')
     ) AS is_pending`,
    [studentId, planId]
  );
  return result.rows[0].is_pending;
}

export async function findPlan(id) {
  const result = await pool.query(
    "SELECT id, name, duration_months, price_cents FROM membership_plans WHERE id = $1 AND is_active",
    [id]
  );
  return result.rows[0];
}

export async function findPackage(id) {
  const result = await pool.query(
    "SELECT id, name, credits, price_cents FROM credit_packages WHERE id = $1 AND is_active",
    [id]
  );
  return result.rows[0];
}

// Saved Stripe customer, so returning students see their saved card.
// Students without a profile row yet simply get NULL.
export async function findStripeCustomer(studentId) {
  const result = await pool.query(
    "SELECT stripe_customer_id FROM student_profiles WHERE user_id = $1",
    [studentId]
  );
  return result.rows[0]?.stripe_customer_id || null;
}

export async function createPendingPayment({ studentId, purpose, amountCents }) {

  const result = await pool.query(
    `INSERT INTO payments (student_id, purpose, amount_cents, currency, status)
     VALUES ($1, $2, $3, 'sgd', 'pending') RETURNING id`,
    [studentId, purpose, amountCents]
  );
  return result.rows[0].id;
}

export async function attachCheckoutSession(paymentId, sessionId) {
  await pool.query(
    "UPDATE payments SET stripe_checkout_session_id = $2, updated_at = NOW() WHERE id = $1",
    [paymentId, sessionId]
  );
}


export async function linkRegistrationPayment(studentId, planId, paymentId) {
  const result = await pool.query(
    `UPDATE membership_applications a
     SET registration_payment_id = $3
     WHERE a.student_id = $1
       AND a.plan_id = $2
       AND a.approval_status IN ('pending', 'approved')
       AND (
         a.registration_payment_id IS NULL
         OR NOT EXISTS (
           SELECT 1
           FROM payments old
           WHERE old.id = a.registration_payment_id
             AND old.status = 'succeeded'
         )
       )
       AND EXISTS (
         SELECT 1
         FROM payments p
         WHERE p.id = $3
           AND p.student_id = $1
           AND p.purpose = 'membership'
           AND p.status = 'pending'
           AND p.currency = 'sgd'
           AND p.amount_cents = (
             SELECT price_cents
             FROM membership_plans
             WHERE id = $2
           )
       )
     RETURNING a.id`,
    [studentId, planId, paymentId]
  );

  return result.rowCount === 1;
}

// Registration only: the payment this student's application is currently
// waiting on, if it is still pending. Lets checkout send the student back to
// the same Stripe page instead of creating a second payment.
export async function findLinkedPendingRegistrationPayment(studentId, planId) {
  const result = await pool.query(
    `SELECT p.id, p.stripe_checkout_session_id
     FROM membership_applications a
     JOIN payments p ON p.id = a.registration_payment_id
     WHERE a.student_id = $1
       AND a.plan_id = $2
       AND a.approval_status IN ('pending', 'approved')
       AND p.student_id = $1
       AND p.purpose = 'membership'
       AND p.status = 'pending'`,
    [studentId, planId]
  );
  return result.rows[0] || null;
}


// True when this payment is the one linked to a new-member application.
// Lets the success page say "awaiting approval" instead of "membership active".
export async function isRegistrationPayment(paymentId) {
  const result = await pool.query(
    "SELECT EXISTS (SELECT 1 FROM membership_applications WHERE registration_payment_id = $1) AS is_registration",
    [paymentId]
  );
  return result.rows[0].is_registration;
}

// Used by the success page: only the student's own payment is returned.
export async function findBySession(studentId, sessionId) {
  const result = await pool.query(
    `SELECT id, purpose, amount_cents, status, failure_reason
     FROM payments WHERE student_id = $1 AND stripe_checkout_session_id = $2`,
    [studentId, sessionId]
  );
  return result.rows[0];
}

// A card was declined. The student may still retry and succeed in the same
// checkout, in which case markSucceeded overwrites this.
export async function markFailed(paymentId, reason) {
  await pool.query(
    `UPDATE payments SET status = 'failed', failure_reason = $2, updated_at = NOW()
     WHERE id = $1 AND status <> 'succeeded'`,
    [paymentId, reason]
  );
}

// Called from the Stripe webhook once the money is confirmed.
// Runs as one transaction and only once per payment, even if Stripe
// sends the same event twice.
// item = { kind: 'membership' | 'credits', itemId }
//     or { kind: 'grading', itemId: gradingSessionId, targetBeltId }   (FSDP-65)
export async function markSucceeded({ paymentId, paymentIntentId, customerId, item }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updated = await client.query(
      `UPDATE payments
       SET status = 'succeeded', stripe_payment_intent_id = $2, failure_reason = NULL, updated_at = NOW()
       WHERE id = $1 AND status <> 'succeeded'
       RETURNING student_id`,
      [paymentId, paymentIntentId]
    );
    if (updated.rowCount === 0) {
      // Already handled (duplicate webhook) or unknown payment.
      await client.query("ROLLBACK");
      return { alreadyDone: true };
    }
    const studentId = updated.rows[0].student_id;
    // set when a grading fee was paid twice for the same grading.
    let duplicateGradingPayment = false;

    if (item.kind === "membership") {
      const plan = (await client.query(
        "SELECT id, name, duration_months, included_credits FROM membership_plans WHERE id = $1",
        [item.itemId]
      )).rows[0];
      if (!plan) throw new Error("Paid membership plan no longer exists.");

      // New student registration is an APPLICATION payment, not membership activation.
      // Admin/Shihan approval and payment verification will activate it in Step 5.
      const isRegistration = plan.name === "Registration (New Member)";
      
      if (isRegistration) {
        const application = await client.query(
          `SELECT id
          FROM membership_applications
          WHERE student_id = $1
            AND plan_id = $2
            AND registration_payment_id = $3`,
          [studentId, plan.id, paymentId]
        );

        if (application.rowCount !== 1) {
          // Safety net: the student paid on an older Stripe page. Link THIS paid
          // payment, but only if the application is not already linked to a
          // successful one, so no one can be activated or charged twice.
          // Rejected applications are left for staff to handle.
          const relinked = await client.query(
            `UPDATE membership_applications a
             SET registration_payment_id = $3
             WHERE a.student_id = $1
               AND a.plan_id = $2
               AND a.approval_status IN ('pending', 'approved')
               AND NOT EXISTS (
                 SELECT 1 FROM payments old
                 WHERE old.id = a.registration_payment_id
                   AND old.status = 'succeeded'
               )
             RETURNING a.id`,
            [studentId, plan.id, paymentId]
          );
          if (relinked.rowCount !== 1) {
            console.warn(
              "Paid registration is not linked to current application",
              paymentId
            );
          }
        }
        } else {
      // Existing membership purchase / renewal: preserve the original behaviour.
      // A renewal starts the day after the current membership ends; otherwise today.
      await client.query(
        `WITH start AS (
           SELECT GREATEST(${TODAY}, COALESCE(MAX(end_date) + 1, ${TODAY})) AS d
           FROM memberships
           WHERE student_id = $1 AND status = 'active' AND end_date >= ${TODAY}
         )
         INSERT INTO memberships (student_id, plan_id, start_date, end_date, status, payment_id)
         SELECT $1, $2, start.d, (start.d + make_interval(months => $3) - INTERVAL '1 day')::date, 'active', $4
         FROM start`,
        [studentId, plan.id, plan.duration_months, paymentId]
      );


      // Keep signup onboarding status aligned with successful Stripe payment.
      await client.query(
        "UPDATE student_onboarding SET membership_status = 'active' WHERE user_id = $1",
        [studentId]
      );


      if (plan.included_credits > 0) {
        await client.query(
          `INSERT INTO credit_transactions (student_id, change, reason, payment_id, note)
           VALUES ($1, $2, 'membership_grant', $3, 'Credits included with membership')`,
          [studentId, plan.included_credits, paymentId]
        );
      }
      } // End non-registration membership purchases
      // The membership fee doesn't include lesson credits. Students buy those
      // separately as a credit top-up (1 credit = 1 lesson).
    } else if (item.kind === "grading") {
      // the exam fee is paid, so the grading application is created
      // now, in this same transaction. item.itemId is the grading session and
      // item.targetBeltId the belt, both set by gradingController on the server.
      // This branch must stay ABOVE the credits one below: without it a grading
      // payment would fall through and be treated as a credit pack.
      const application = await createApplicationFromPayment(client, {
        studentId,
        gradingSessionId: item.itemId,
        targetBeltId: item.targetBeltId,
        paymentId,
      });
      if (!application.created) {
        // The student already has a live application for this grading, so this
        // is a second payment for the same thing. The money was taken, so the
        // payment still counts as succeeded; it needs refunding by hand.
        console.warn("Duplicate grading fee payment, needs a refund:", paymentId, "student", studentId);
        duplicateGradingPayment = true;
      }
    } else {
      const pack = (await client.query(
        "SELECT credits FROM credit_packages WHERE id = $1",
        [item.itemId]
      )).rows[0];
      await client.query(
        `INSERT INTO credit_transactions (student_id, change, reason, payment_id, note)
         VALUES ($1, $2, 'topup', $3, 'Credit top-up')`,
        [studentId, pack.credits, paymentId]
      );
    }

    // Remember the Stripe customer so "change payment method" and future
    // checkouts can use the saved card (only if the student has a profile row).
    if (customerId) {
      await client.query(
        `UPDATE student_profiles SET stripe_customer_id = $2, updated_at = NOW()
         WHERE user_id = $1 AND stripe_customer_id IS NULL`,
        [studentId, customerId]
      );
    }

    await client.query("COMMIT");
    return { alreadyDone: false, studentId, duplicateGradingPayment };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
