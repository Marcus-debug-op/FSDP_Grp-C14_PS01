// MODEL: SQL for buying memberships and credit top-ups.
// Tables come from database/migrations/001_shared_schema.sql.
import pool from "../db.js";

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
      `SELECT id, name, duration_months, price_cents, included_credits
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
       WHERE student_id = $1 AND plan_id = $2 AND approval_status = 'pending'
     ) AS is_pending`,
    [studentId, planId]
  );
  return result.rows[0].is_pending;
}

export async function findPlan(id) {
  const result = await pool.query(
    "SELECT id, name, duration_months, price_cents, included_credits FROM membership_plans WHERE id = $1 AND is_active",
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
          `SELECT id FROM membership_applications
           WHERE student_id = $1 AND plan_id = $2 AND approval_status = 'pending'
           FOR UPDATE`,
          [studentId, plan.id]
        );
        if (application.rowCount !== 1) {
          throw new Error("Registration payment has no pending application to review.");
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
    return { alreadyDone: false, studentId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
