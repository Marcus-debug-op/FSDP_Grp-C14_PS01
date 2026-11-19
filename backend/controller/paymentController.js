// CONTROLLER: Stripe Checkout for memberships and credit top-ups (test mode).
// Flow: student picks an item -> we save a "pending" payment -> Stripe Checkout
// -> Stripe calls our webhook -> payment marked succeeded/failed -> membership
// or credits added. If the webhook never arrives, the success page and the
// payment history ask Stripe directly instead (syncWithStripe).
// The membership fee is only the fee to be a member. It never includes lesson
// credits: students buy credits separately, and 1 credit = 1 lesson.
import { getStripe } from "../stripe.js";
import * as Payment from "../model/paymentModel.js";
import { activateApplicationAfterPayment } from "../model/registrationActivationModel.js";
import { paymentReceived } from "../utils/notices.js";

// Registration only: record a Checkout that Stripe itself says is paid, in case
// the webhook never arrived (e.g. the Stripe CLI listener was not running).
// Does exactly what the webhook does; markSucceeded only works once per payment,
// so the webhook and this check can never both count the same payment.
// `session` must come from getStripe() (our secret key), never from the browser.
async function recordPaidRegistrationSession(session, studentId) {
  const paymentId = Number(session.metadata?.paymentId);
  const itemId = Number(session.metadata?.itemId);
  if (!paymentId || session.payment_status !== "paid" || session.metadata?.kind !== "membership") return false;
  if (String(session.client_reference_id) !== String(studentId)) return false;
  const plan = await Payment.findPlan(itemId);
  if (!plan || plan.name !== "Registration (New Member)") return false;

  const item = { kind: "membership", itemId };
  const outcome = await Payment.markSucceeded({
    paymentId,
    paymentIntentId: session.payment_intent,
    customerId: session.customer,
    item,
  });
  if (!outcome.alreadyDone) {
    paymentReceived(paymentId, session.payment_intent, item);
    console.log("Registration payment recorded from Stripe check (no webhook)", paymentId);
  }
  const activation = await activateApplicationAfterPayment(paymentId);
  console.log("Registration activation check", paymentId, activation);
  return true;
}

// Records a Checkout that Stripe says is paid: marks the payment succeeded and
// adds what was bought (membership, lesson credits or grading application).
// Used by the webhook and by syncWithStripe below. markSucceeded only works
// once per payment, so the same payment can never be counted twice.
// `session` must come from Stripe (webhook or getStripe()), never from the browser.
async function recordPaidSession(session) {
  const paymentId = Number(session.metadata?.paymentId);
  if (!paymentId || session.payment_status !== "paid") return false;

  const item = {
    kind: session.metadata.kind,
    itemId: Number(session.metadata.itemId),
    // only grading checkouts carry this (set in
    // gradingController.applyForGrading). null for everything else.
    targetBeltId: Number(session.metadata.targetBeltId) || null,
  };
  const outcome = await Payment.markSucceeded({
    paymentId,
    paymentIntentId: session.payment_intent,
    customerId: session.customer,
    item,
  });

  // FSDP-47: one confirmation email per payment, sent only the first time
  // this payment succeeds. Not awaited, so callers get their answer straight away.
  if (!outcome.alreadyDone) paymentReceived(paymentId, session.payment_intent, item);

  if (item.kind === "membership") {
    const activation = await activateApplicationAfterPayment(paymentId);
    console.log("Registration activation check", paymentId, activation);
  }
  return true;
}

// Asks Stripe how a pending checkout ended and records it, in case the webhook
// never arrived (e.g. the Stripe CLI listener wasn't running):
// - paid    -> succeeded, and what was bought is added
// - expired -> failed (nothing was charged)
// - open    -> left as pending (the student may still be paying)
// A payment with no Stripe page after 5 minutes never got one, so it fails too.
async function syncWithStripe(studentId, payment) {
  if (!payment.stripe_checkout_session_id) {
    if (payment.is_stale) await Payment.markFailed(payment.id, "Checkout page was never created.");
    return;
  }

  const session = await getStripe().checkout.sessions.retrieve(payment.stripe_checkout_session_id);
  // Only act on the checkout this payment row actually started.
  if (Number(session.metadata?.paymentId) !== Number(payment.id)) return;
  if (String(session.client_reference_id) !== String(studentId)) return;

  if (session.status === "complete" && session.payment_status === "paid") {
    if (await recordPaidSession(session)) console.log("Payment recorded from Stripe check (no webhook)", payment.id);
  } else if (session.status === "expired") {
    await Payment.markFailed(payment.id, "Checkout expired before payment.");
  }
}

// Settles all of a student's pending payments with Stripe before their payment
// history is shown. Never throws: if Stripe can't be reached, the payments
// simply stay pending and are checked again next time.
export async function settlePendingPayments(studentId) {
  try {
    const pending = await Payment.findPendingForStudent(studentId);
    const results = await Promise.allSettled(pending.map((p) => syncWithStripe(studentId, p)));
    results.forEach((r, i) => {
      if (r.status === "rejected") console.error("Could not check payment with Stripe", pending[i].id, r.reason?.message);
    });
  } catch (err) {
    console.error("Could not check pending payments with Stripe", err.message);
  }
}

const FRONTEND_URL = () => (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

// GET /api/payments/options
export async function getOptions(req, res, next) {
  try {
    const options = await Payment.getOptions();
    const active = await Payment.hasActiveMembership(req.user.id);
    const hasHistory = await Payment.hasMembershipHistory(req.user.id);

    // A new student sees registration only; members see renewal plans.
    // Credit top-ups are offered only to active members.
    res.json({
      plans: options.plans.filter(p => hasHistory
        ? p.name !== "Registration (New Member)"
        : p.name === "Registration (New Member)"),
      packages: active ? options.packages : [],
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/checkout   body: { kind: "membership" | "credits", itemId }
export async function createCheckout(req, res, next) {
  try {
    const kind = req.body.kind;
    const itemId = Number(req.body.itemId);
    if (!["membership", "credits"].includes(kind) || !Number.isInteger(itemId)) {
      return res.status(400).json({ message: "Please choose a plan or credit package." });
    }

    // Look the price up ourselves so nobody can change it in the browser.
    const item = kind === "membership" ? await Payment.findPlan(itemId) : await Payment.findPackage(itemId);
    if (!item) return res.status(404).json({ message: "That option is no longer available." });

    // New registrations must use the dedicated registration plan rather than credit top-ups.
    // The registration price is selected in signup, not by untrusted client metadata.
    const hasMembership = await Payment.hasActiveMembership(req.user.id);
    const hasHistory = await Payment.hasMembershipHistory(req.user.id);

    if (kind === "credits" && !hasMembership) {
      return res.status(403).json({ message: "Activate your membership before purchasing credits." });
    }

    if (kind === "membership" && !hasHistory && item.name !== "Registration (New Member)") {
      return res.status(403).json({ message: "New students must choose the initial registration package." });
    }

    if (kind === "membership" && hasHistory && item.name === "Registration (New Member)") {
      return res.status(403).json({ message: "This registration package is for new students only." });
    }

    // Registration checkout must belong to the student who submitted that application.
    if (kind === "membership" && item.name === "Registration (New Member)") {
      const pendingApplication = await Payment.hasPendingApplicationForPlan(req.user.id, item.id);
      if (!pendingApplication) {
        return res.status(403).json({ message: "Submit your membership application before paying." });
      }
    }

    const isRegistration = kind === "membership" && item.name === "Registration (New Member)";

    // Registration only: if the student already has an unpaid checkout, reuse it
    // instead of creating another payment (prevents paying on an old page that
    // is no longer linked to the application).
    if (isRegistration) {
      const existing = await Payment.findLinkedPendingRegistrationPayment(req.user.id, item.id);
      if (existing && !existing.stripe_checkout_session_id) {
        // Stripe never created a page for this one, so it can never be paid.
        await Payment.markFailed(existing.id, "Checkout page was never created.");
      } else if (existing) {
        let previous;
        try {
          previous = await getStripe().checkout.sessions.retrieve(existing.stripe_checkout_session_id);
        } catch (err) {
          console.error("Could not check previous registration checkout", existing.id, err.message);
          return res.status(503).json({ message: "Could not reach the payment provider. Please try again in a moment." });
        }
        if (previous.status === "open" && previous.url) {
          return res.status(200).json({ url: previous.url });
        }
        if (previous.status === "complete") {
          // Paid but not recorded yet (webhook missed): record it now.
          await recordPaidRegistrationSession(previous, req.user.id);
          return res.status(409).json({ message: "Your payment is being confirmed. Please refresh your application status in a minute." });
        }
        // Expired: record it even if the webhook listener was not running.
        await Payment.markFailed(existing.id, "Checkout expired before payment.");
      }
    }

    const purpose = kind === "membership" ? "membership" : "credit_topup";
    const description = kind === "membership"
      ? `${item.duration_months}-month membership fee · lesson credits sold separately`
      : `${item.credits} lesson credits · 1 credit = 1 lesson`;

    const paymentId = await Payment.createPendingPayment({

      studentId: req.user.id,
      purpose,
      amountCents: item.price_cents,
    });


    if (
      kind === "membership" &&
      item.name === "Registration (New Member)"
    ) {
      const linked = await Payment.linkRegistrationPayment(
        req.user.id,
        item.id,
        paymentId
      );

      if (!linked) {
        // Don't leave an unusable pending payment behind.
        await Payment.markFailed(paymentId, "Registration checkout could not be linked to the application.");
        return res.status(409).json({
          message:
            "Registration payment already recorded or application unavailable."
        });
      }
    }

    
    const metadata = { paymentId: String(paymentId), kind, itemId: String(itemId) };
    const customer = await Payment.findStripeCustomer(req.user.id);

    let session;
    try {
    session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "sgd",
          unit_amount: item.price_cents,
          product_data: { name: `Aikido Shinju-kai · ${item.name}`, description },
        },
      }],
      ...(customer ? { customer } : { customer_creation: "always" }),
      client_reference_id: String(req.user.id),
      metadata,
      payment_intent_data: { metadata },             // lets us record declined cards
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60, // unpaid checkouts expire after ~30 min
      success_url: `${FRONTEND_URL()}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: item.name === "Registration (New Member)"
        ? `${FRONTEND_URL()}/registration/checkout?cancelled=1`
        : `${FRONTEND_URL()}/payments?cancelled=1`,
    });
    } catch (err) {
      // Registration only: Stripe failed, so mark this payment failed. The next
      // attempt then starts cleanly. Other purchases keep their original behaviour.
      if (isRegistration) {
        await Payment.markFailed(paymentId, "Checkout page could not be created.").catch(() => {});
      }
      throw err;
    }

    await Payment.attachCheckoutSession(paymentId, session.id);
    res.status(201).json({ url: session.url });
  } catch (err) {
    next(err);
  }
}

// GET /api/payments/session/:sessionId   (used by the success page)
export async function getSessionStatus(req, res, next) {
  try {
    let payment = await Payment.findBySession(req.user.id, req.params.sessionId);
    if (!payment) return res.status(404).json({ message: "Payment not found." });

    // Still pending: ask Stripe directly how the checkout ended, so the page
    // doesn't wait forever when the webhook never arrives.
    if (payment.status === "pending") {
      try {
        await syncWithStripe(req.user.id, { id: payment.id, stripe_checkout_session_id: req.params.sessionId });
        payment = await Payment.findBySession(req.user.id, req.params.sessionId);
      } catch (err) {
        // Not fatal: the page keeps checking and the webhook may still arrive.
        console.error("Could not check payment with Stripe", payment.id, err.message);
      }
    }

    res.json({
      isRegistration: await Payment.isRegistrationPayment(payment.id),
      status: payment.status,
      purpose: payment.purpose,
      amountCents: payment.amount_cents,
      failureReason: payment.failure_reason,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments/webhook   (called by Stripe, not the browser)
// server.js mounts this with express.raw() so the signature can be checked.
export async function stripeWebhook(req, res) {
  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Stripe webhook signature check failed:", err.message);
    return res.status(400).send("Invalid signature");
  }

  try {
    const obj = event.data.object;
    const paymentId = Number(obj.metadata?.paymentId);

    switch (event.type) {
      
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await recordPaidSession(obj);
      break;


      case "checkout.session.async_payment_failed":
        if (paymentId) await Payment.markFailed(paymentId, "The payment could not be completed.");
        break;

      case "checkout.session.expired":
        if (paymentId) await Payment.markFailed(paymentId, "Checkout expired before payment.");
        break;

      case "payment_intent.payment_failed":
        if (paymentId) {
          await Payment.markFailed(paymentId, obj.last_payment_error?.message || "The card was declined.");
        }
        break;

      default:
        break; // other events are ignored
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook handling failed:", err);
    res.status(500).send("Webhook handler error"); // Stripe will retry
  }
}
