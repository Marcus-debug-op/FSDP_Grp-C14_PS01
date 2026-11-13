// progress toward grading & grading eligibility, and applying for a grading.
//
// GET  /eligibility   read-only: progress, eligibility, next grading, fee
// POST /applications  start paying the exam fee for a grading
//
// One function, assess(), works out where a student stands. The page reads it
// through GET, and POST runs the very same function again before taking any
// money -- hiding a button is not a gate; the server has to decide, and it has
// to decide with the same code that drew the button.
//
// POST never creates a grading application. It only opens a Stripe Checkout.
// The application is written by paymentModel.markSucceeded when Stripe's
// webhook confirms the fee, so an unpaid or abandoned checkout leaves nothing
// behind.
import * as Grading from "../model/gradingModel.js";
import * as Payment from "../model/paymentModel.js";
import { findCurrentBelt } from "../model/beltModel.js";
import { getStripe } from "../stripe.js";

const FRONTEND_URL = () => (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

// An application in one of these states no longer counts: the student may
// apply for the same grading again. Matches LIVE_APPLICATION in instructorModel.
const DEAD_APPLICATION = ["withdrawn", "rejected"];

// How far along a requirement the student is, as a percentage for the bar.
// A requirement of 0 is already satisfied, so it shows as full rather than
// dividing by zero.
function percentOf(done, required) {
  if (!required || required <= 0) return 100;
  return Math.min(100, Math.round((done / required) * 100));
}

// Everything known about one student's standing for their next grading.
// Returns the exact object GET /eligibility sends.
async function assess(userId) {
  const [belt, nextBelt, training, nextGrading] = await Promise.all([
    findCurrentBelt(userId),
    Grading.findNextBelt(userId),
    Grading.findTrainingSinceBelt(userId),
    Grading.findNextGradingSession(userId),
  ]);

  // No student_profiles row: the front desk hasn't recorded a belt yet, so
  // there is no belt to grade from and nothing to measure. Same shape as the
  // other student endpoints so the page can render a single notice.
  if (!belt) {
    return {
      profileReady: false,
      currentBelt: null, nextBelt: null, atHighestBelt: false,
      progress: null, eligible: false, unmet: [], canApply: false,
      nextGrading: null, application: null, fee: null, syllabus: [],
    };
  }

  const classesAttended = Number(training.classes_attended) || 0;
  const hoursAttended = Number(training.hours_attended) || 0;
  const externalClasses = Number(training.external_classes) || 0;
  const monthsAtBelt = Number(belt.months_at_belt) || 0;

  // At the top of the recorded ladder there is nothing to be eligible for.
  // Still returns the counts, so the page can show what they've trained.
  if (!nextBelt) {
    return {
      profileReady: true,
      currentBelt: {
        name: belt.name, colour: belt.colour, awardedOn: belt.belt_awarded_on,
        monthsAtBelt, daysAtBelt: Number(belt.days_at_belt) || 0,
      },
      nextBelt: null,
      atHighestBelt: true,
      progress: {
        classes: { attended: classesAttended, required: null, met: true, remaining: 0, percent: 100 },
        timeAtBelt: { months: monthsAtBelt, requiredMonths: null, met: true, remainingMonths: 0, percent: 100 },
        hours: { attended: hoursAttended, externalClasses },
      },
      eligible: false, unmet: [], canApply: false,
      nextGrading: null, application: null, fee: null, syllabus: [],
    };
  }

  const requiredClasses = Number(nextBelt.min_classes_at_rank) || 0;
  const requiredMonths = Number(nextBelt.min_months_at_rank) || 0;

  const classesMet = classesAttended >= requiredClasses;
  const monthsMet = monthsAtBelt >= requiredMonths;
  const eligible = classesMet && monthsMet;

  // Worded the way the story asks for ("12 more classes needed"), so the page
  // can list these without rephrasing them.
  const unmet = [];
  if (!classesMet) {
    const short = requiredClasses - classesAttended;
    unmet.push(`${short} more ${short === 1 ? "class" : "classes"} needed`);
  }
  if (!monthsMet) {
    const short = requiredMonths - monthsAtBelt;
    unmet.push(`${short} more ${short === 1 ? "month" : "months"} at this belt needed`);
  }

  // Only look for an application once there is a session to apply to.
  const [application, fee, syllabus] = await Promise.all([
    nextGrading ? Grading.findApplicationForSession(userId, nextGrading.id) : undefined,
    Grading.findExamFee(nextBelt.id),
    Grading.findSyllabusFor(nextBelt.id),
  ]);

  // A withdrawn or rejected application shouldn't block a fresh attempt at
  // the same session; anything else means they've already applied.
  const blockingApplication = Boolean(application && !DEAD_APPLICATION.includes(application.status));

  return {
    profileReady: true,
    currentBelt: {
      name: belt.name, colour: belt.colour, awardedOn: belt.belt_awarded_on,
      monthsAtBelt, daysAtBelt: Number(belt.days_at_belt) || 0,
    },
    nextBelt: { id: nextBelt.id, name: nextBelt.name, colour: nextBelt.colour },
    atHighestBelt: false,
    progress: {
      classes: {
        attended: classesAttended,
        required: requiredClasses,
        met: classesMet,
        remaining: Math.max(0, requiredClasses - classesAttended),
        percent: percentOf(classesAttended, requiredClasses),
      },
      timeAtBelt: {
        months: monthsAtBelt,
        requiredMonths,
        met: monthsMet,
        remainingMonths: Math.max(0, requiredMonths - monthsAtBelt),
        percent: percentOf(monthsAtBelt, requiredMonths),
      },
      // No min_hours_at_rank exists on belt_ranks, so hours are reported
      // without a target and never gate eligibility. externalClasses says how
      // many of the counted classes contributed no hours, because
      // external_attendance records a date but no times.
      hours: { attended: hoursAttended, externalClasses },
    },
    eligible,
    unmet,
    nextGrading: nextGrading
      ? {
          id: nextGrading.id,
          gradingDate: nextGrading.grading_date,
          startTime: nextGrading.start_time,
          registrationClosesOn: nextGrading.registration_closes_on,
          registrationOpen: nextGrading.registration_open,
          daysToDeadline: nextGrading.days_to_deadline,
          daysToGrading: nextGrading.days_to_grading,
          centreName: nextGrading.centre_name,
          centreAddress: nextGrading.centre_address,
          ladder: nextGrading.ladder,
        }
      : null,
    application: application
      ? { id: application.id, status: application.status, appliedOn: application.applied_on }
      : null,
    // The exam fee for the belt being graded for, or null when the SOP fee
    // table has no single matching row (or migration 006 hasn't been run).
    fee: fee ? { amountCents: fee.amountCents } : null,
    // The one condition both the Apply button and POST /applications use.
    // No fee means no button: an application can't be paid for at a price
    // nobody has set.
    canApply: Boolean(
      eligible && nextGrading && nextGrading.registration_open && !blockingApplication && fee
    ),
    syllabus,
  };
}

// GET /api/grading/eligibility
export async function getEligibility(req, res, next) {
  try {
    res.json(await assess(req.user.id));
  } catch (err) {
    next(err);
  }
}

// POST /api/grading/applications   body: { gradingSessionId }
//
// The student has decided to apply. Checks everything again, then sends them
// to Stripe to pay the exam fee. Answers with { url } to redirect to.
export async function applyForGrading(req, res, next) {
  try {
    const userId = req.user.id;
    const gradingSessionId = Number(req.body?.gradingSessionId);
    if (!Number.isInteger(gradingSessionId) || gradingSessionId < 1) {
      return res.status(400).json({ message: "Please choose a grading session." });
    }

    const standing = await assess(userId);

    // Each refusal says why, so the page never has to guess. They are checked
    // in the order a student would want to hear them.
    if (!standing.profileReady) {
      return res.status(409).json({ message: "Your belt hasn't been recorded yet. Please ask the front desk." });
    }
    if (standing.atHighestBelt) {
      return res.status(409).json({ message: "You're at the highest recorded belt, so there's nothing to apply for." });
    }
    // The only session a student may apply to is the one their own page
    // offers: scheduled, not yet held, and covering the belt they'd grade for.
    // Checking the id against it stops a hand-written request from naming a
    // cancelled, past, or wrong-ladder session.
    if (!standing.nextGrading || standing.nextGrading.id !== gradingSessionId) {
      return res.status(409).json({ message: "That grading session isn't open to you. Please refresh the page and try again." });
    }
    if (!standing.eligible) {
      return res.status(403).json({
        message: `You're not eligible for ${standing.nextBelt.name} yet: ${standing.unmet.join(", ")}.`,
      });
    }
    if (!standing.nextGrading.registrationOpen) {
      return res.status(403).json({ message: "Registration for this grading has closed." });
    }
    if (standing.application && !DEAD_APPLICATION.includes(standing.application.status)) {
      return res.status(409).json({ message: "You've already applied for this grading." });
    }
    if (!standing.fee) {
      return res.status(409).json({
        message: `The exam fee for ${standing.nextBelt.name} hasn't been set up yet. Please ask the front desk.`,
      });
    }
    // The grading page is only shown to active members; this is the same rule
    // enforced where it counts.
    if (!(await Payment.hasActiveMembership(userId))) {
      return res.status(403).json({ message: "You need an active membership to apply for grading." });
    }
    // Belt and braces: if assess() ever gains a condition the checks above
    // don't spell out, this still refuses.
    if (!standing.canApply) {
      return res.status(403).json({ message: "You can't apply for this grading right now." });
    }

    const amountCents = standing.fee.amountCents;

    // Pressing Apply twice, or coming back from Stripe and pressing it again,
    // must not open a second checkout the student could also pay. If one of
    // theirs is still open for this same grading and price, send them back to it.
    for (const pending of await Grading.findRecentPendingFeePayments(userId)) {
      try {
        const existing = await getStripe().checkout.sessions.retrieve(pending.stripe_checkout_session_id);
        if (
          existing.status === "open" && existing.url
          && existing.metadata?.kind === "grading"
          && Number(existing.metadata.itemId) === gradingSessionId
          && existing.amount_total === amountCents
        ) {
          return res.json({ url: existing.url, reused: true });
        }
      } catch (err) {
        // Stripe couldn't find or return it. Fall through and open a new one.
        console.error("Couldn't re-open grading checkout", pending.id, err.message);
      }
    }

    // From here on this follows paymentController.createCheckout: save a
    // pending payment, open Checkout, remember the session id.
    const paymentId = await Payment.createPendingPayment({
      studentId: userId,
      purpose: "grading_fee",
      amountCents,
    });

    // kind "grading" is what paymentModel.markSucceeded looks for. itemId is
    // the grading session and targetBeltId the belt, both decided here on the
    // server -- the browser never supplies a price or a belt.
    const metadata = {
      paymentId: String(paymentId),
      kind: "grading",
      itemId: String(gradingSessionId),
      targetBeltId: String(standing.nextBelt.id),
    };

    let session;
    try {
      const customer = await Payment.findStripeCustomer(userId);
      session = await getStripe().checkout.sessions.create({
        mode: "payment",
        line_items: [{
          quantity: 1,
          price_data: {
            currency: "sgd",
            unit_amount: amountCents,
            product_data: {
              name: `Aikido Shinju-kai · Grading exam fee · ${standing.nextBelt.name}`,
              description: `Grading on ${standing.nextGrading.gradingDate}${standing.nextGrading.centreName ? ` at ${standing.nextGrading.centreName}` : ""}`,
            },
          },
        }],
        ...(customer ? { customer } : { customer_creation: "always" }),
        client_reference_id: String(userId),
        metadata,
        payment_intent_data: { metadata },             // lets the webhook record declined cards
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60, // unpaid checkouts expire after ~30 min
        success_url: `${FRONTEND_URL()}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_URL()}/grading?cancelled=1`,
      });
    } catch (err) {
      // Checkout never opened, so don't leave a payment sitting at "pending".
      await Payment.markFailed(paymentId, "Checkout could not be started.");
      throw err;
    }

    await Payment.attachCheckoutSession(paymentId, session.id);
    res.status(201).json({ url: session.url });
  } catch (err) {
    next(err);
  }
}
