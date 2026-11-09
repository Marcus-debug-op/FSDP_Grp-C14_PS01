// CONTROLLER: Stripe Checkout for memberships and credit top-ups (test mode).
// Flow: student picks an item -> we save a "pending" payment -> Stripe Checkout
// -> Stripe calls our webhook -> payment marked succeeded/failed -> membership
// or credits added. The success page only reads what the webhook saved.
// The membership fee is only the fee to be a member. It never includes lesson
// credits: students buy credits separately, and 1 credit = 1 lesson.
import { getStripe } from "../stripe.js";
import * as Payment from "../model/paymentModel.js";

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

    const purpose = kind === "membership" ? "membership" : "credit_topup";
    const description = kind === "membership"
      ? `${item.duration_months}-month membership fee · lesson credits sold separately`
      : `${item.credits} lesson credits · 1 credit = 1 lesson`;

    const paymentId = await Payment.createPendingPayment({
      studentId: req.user.id,
      purpose,
      amountCents: item.price_cents,
    });

    const metadata = { paymentId: String(paymentId), kind, itemId: String(itemId) };
    const customer = await Payment.findStripeCustomer(req.user.id);

    const session = await getStripe().checkout.sessions.create({
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

    await Payment.attachCheckoutSession(paymentId, session.id);
    res.status(201).json({ url: session.url });
  } catch (err) {
    next(err);
  }
}

// GET /api/payments/session/:sessionId   (used by the success page)
export async function getSessionStatus(req, res, next) {
  try {
    const payment = await Payment.findBySession(req.user.id, req.params.sessionId);
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    res.json({
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
        if (paymentId && obj.payment_status === "paid") {
          await Payment.markSucceeded({
            paymentId,
            paymentIntentId: obj.payment_intent,
            customerId: obj.customer,
            item: { kind: obj.metadata.kind, itemId: Number(obj.metadata.itemId) },
          });
        }
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
