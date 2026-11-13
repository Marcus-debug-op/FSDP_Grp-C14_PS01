// What each notice and email says. Every function here saves an in-app notice
// through notificationModel.notify, and most also send an email.
// None of them throw, so a booking or payment that worked is never undone
// because a notice couldn't be sent.
import pool from "../db.js";
import { notify } from "../model/notificationModel.js";
import { getStripe } from "../stripe.js";

// "2026-11-13" -> "Thu, 13 Nov 2026"
export function longDate(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-SG", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

// "19:15" -> "7:15pm"
export function clock(hm) {
  const [h, m] = hm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
// Ends a sentence typed by staff with a full stop if it doesn't have one.
const sentence = (s) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const money = (cents) => `S$${(cents / 100).toFixed(2)}`;

// FSDP-53: after a group lesson is booked.
// booking = result of lessonModel.bookSession
export function bookingConfirmed(studentId, booking) {
  const { lesson } = booking;
  const when = `${longDate(lesson.date)} at ${clock(lesson.startTime)}`;
  return notify({
    userId: studentId,
    type: "booking_confirmed",
    title: `Booked: ${lesson.title}, ${longDate(lesson.date)}`,
    body: `${lesson.title} on ${when} at ${lesson.centre}. You have ${plural(booking.creditsLeft, "credit")} left.`,
    dedupeKey: `booking:${booking.bookingId}:${booking.bookedAtMs}`,
    email: {
      subject: `Booking confirmed: ${lesson.title}, ${longDate(lesson.date)}`,
      paragraphs: [
        `You're booked for ${lesson.title} on ${when} at ${lesson.centre}.`,
        `This used ${plural(booking.creditUsed, "credit")}. You have ${plural(booking.creditsLeft, "credit")} left.`,
        `If you can't make it, cancel at least ${booking.cancelNoticeHours} hours before the lesson to get your credit back. There are no make-up lessons.`,
      ],
      button: { label: "View my timetable", path: "/timetable" },
    },
  });
}

// FSDP-47: once Stripe confirms a payment. Only one email per payment.
// item = { kind: 'membership' | 'credits', itemId }
//     or { kind: 'grading', itemId: gradingSessionId, targetBeltId }   (FSDP-65)
export async function paymentReceived(paymentId, paymentIntentId, item) {
  try {
    const result = await pool.query(
      `SELECT p.student_id, p.amount_cents, p.purpose,
              to_char(p.updated_at AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD') AS paid_on,
              CASE WHEN $2 = 'membership'
                   THEN (SELECT name FROM membership_plans WHERE id = $3)
                   -- FSDP-65: a grading fee is named after the belt being graded
                   -- for. Without this case it fell into the ELSE below and the
                   -- receipt named whichever credit pack shared the session's id.
                   WHEN $2 = 'grading'
                   THEN (SELECT name || ' grading' FROM belt_ranks WHERE id = $4)
                   ELSE (SELECT name FROM credit_packages WHERE id = $3) END AS item_name
       FROM payments p
       WHERE p.id = $1 AND p.status = 'succeeded'`,
      [paymentId, item.kind, item.itemId, item.targetBeltId ?? null]
    );
    const p = result.rows[0];
    if (!p) return null;

    // Stripe's own receipt page, if Stripe can give us one.
    let receiptUrl = null;
    try {
      if (paymentIntentId) {
        const intent = await getStripe().paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
        receiptUrl = intent.latest_charge?.receipt_url || null;
      }
    } catch (err) {
      console.error("Couldn't get Stripe receipt link", paymentId, err.message);
    }

    const isGrading = item.kind === "grading";
    const what = item.kind === "membership"
      ? `${p.item_name || "Membership"} (membership fee)`
      : isGrading
        ? `${p.item_name || "Grading"} (exam fee)`
        : `${p.item_name || "Lesson credits"} (lesson credits)`;
    const amount = money(p.amount_cents);

    return notify({
      userId: p.student_id,
      type: "payment_received",
      title: `Payment received: ${amount}`,
      body: `${what}, paid on ${longDate(p.paid_on)}.`,
      dedupeKey: `payment:${paymentId}`,
      email: {
        subject: `Payment received: ${amount} for ${p.item_name || "your purchase"}`,
        paragraphs: [
          isGrading
            ? "Thank you, your payment went through and your grading application has been submitted."
            : "Thank you, your payment went through.",
          `Item: ${what}`,
          `Amount: ${amount}`,
          `Date: ${longDate(p.paid_on)}`,
          `Reference: payment #${paymentId}`,
          receiptUrl ? `Receipt: ${receiptUrl}` : "You can see this payment any time under Payments on the website.",
        ],
        button: isGrading
          ? { label: "View my grading", path: "/grading" }
          : { label: "View my payments", path: "/payments" },
      },
    });
  } catch (err) {
    console.error("Couldn't send payment confirmation", paymentId, err.message);
    return null;
  }
}

// FSDP-56: a session the student booked was cancelled by the dojo.
export function lessonCancelled(studentId, session, refunded) {
  const when = `${longDate(session.date)} at ${clock(session.startTime)}`;
  const credit = refunded > 0
    ? `${plural(refunded, "credit")} ${refunded === 1 ? "has" : "have"} been returned to your account.`
    : "No credit was used for this booking, so there's nothing to return.";
  return notify({
    userId: studentId,
    type: "lesson_cancelled",
    title: `Cancelled: ${session.title}, ${longDate(session.date)}`,
    body: `${session.title} on ${when} at ${session.centre} has been cancelled.${session.note ? ` Reason: ${sentence(session.note)}` : ""} ${credit}`,
    dedupeKey: `session-cancelled:${session.id}:${studentId}`,
    email: {
      subject: `Lesson cancelled: ${session.title}, ${longDate(session.date)}`,
      paragraphs: [
        `Sorry, ${session.title} on ${when} at ${session.centre} has been cancelled.`,
        ...(session.note ? [`Reason: ${sentence(session.note)}`] : []),
        credit,
      ],
      button: { label: "Book another lesson", path: "/lessons" },
    },
  });
}

// FSDP-56: a session the student booked moved to another dojo for the day.
export function lessonMoved(studentId, session) {
  const when = `${longDate(session.date)} at ${clock(session.startTime)}`;
  return notify({
    userId: studentId,
    type: "lesson_moved",
    title: `Venue changed: ${session.title}, ${longDate(session.date)}`,
    body: `${session.title} on ${when} is now at ${session.centre} (was ${session.previousCentre}).${session.note ? ` ${sentence(session.note)}` : ""}`,
    dedupeKey: `session-moved:${session.id}:${session.changedAtMs}:${studentId}`,
    email: {
      subject: `Venue changed: ${session.title}, ${longDate(session.date)}`,
      paragraphs: [
        `${session.title} on ${when} has moved to a different dojo.`,
        `New venue: ${session.centre}${session.address ? `, ${session.address}` : ""}`,
        `Previous venue: ${session.previousCentre}`,
        ...(session.note ? [sentence(session.note)] : []),
        "Your booking still stands. If you can't make it to the new venue, you can cancel it on the website.",
      ],
      button: { label: "View my timetable", path: "/timetable" },
    },
  });
}

// FSDP-54: the student asked for a 1-on-1 session (website notice only).
export function privateLessonRequested(studentId, request) {
  return notify({
    userId: studentId,
    type: "private_lesson",
    title: "1-on-1 request sent",
    body: `We've got your request for a 1-on-1 session around ${longDate(request.preferredDate)} at ${request.centre}. You'll hear from us once it's scheduled.`,
    dedupeKey: `private-requested:${request.id}`,
  });
}

// FSDP-54: the dojo scheduled a 1-on-1 session for the student.
// lesson = privateLessonModel's lesson shape
export function privateLessonScheduled(lesson) {
  const when = `${longDate(lesson.date)}, ${clock(lesson.startTime)} to ${clock(lesson.endTime)}`;
  return notify({
    userId: lesson.student.id,
    type: "private_lesson",
    title: `1-on-1 booked: ${longDate(lesson.date)}`,
    body: `Your 1-on-1 session with ${lesson.instructor?.name} is on ${when} at ${lesson.centre.name}. It uses ${plural(lesson.creditCost, "credit")}.`,
    dedupeKey: `private-scheduled:${lesson.id}`,
    email: {
      subject: `1-on-1 session confirmed: ${longDate(lesson.date)}`,
      paragraphs: [
        "Your 1-on-1 session is booked.",
        `When: ${when}`,
        `Where: ${lesson.centre.name}`,
        `Instructor: ${lesson.instructor?.name}`,
        `This used ${plural(lesson.creditCost, "credit")}.`,
      ],
      button: { label: "View my timetable", path: "/timetable" },
    },
  });
}

// FSDP-54: the dojo declined a request, or cancelled a booked 1-on-1.
export function privateLessonClosed(lesson, refunded) {
  const declined = lesson.status === "declined";
  const when = lesson.date ? `${longDate(lesson.date)} at ${clock(lesson.startTime)}` : longDate(lesson.preferredDate);
  const reason = lesson.adminNote ? ` Note from the dojo: ${sentence(lesson.adminNote)}` : "";
  const credit = refunded > 0 ? ` ${plural(refunded, "credit")} returned to your account.` : "";
  return notify({
    userId: lesson.student.id,
    type: "private_lesson",
    title: declined ? "1-on-1 request not accepted" : `1-on-1 cancelled: ${longDate(lesson.date)}`,
    body: declined
      ? `Your 1-on-1 request for ${when} couldn't be scheduled.${reason}`
      : `Your 1-on-1 session on ${when} has been cancelled.${reason}${credit}`,
    dedupeKey: `private-closed:${lesson.id}`,
    email: {
      subject: declined ? "Your 1-on-1 request" : `1-on-1 session cancelled: ${longDate(lesson.date)}`,
      paragraphs: declined
        ? [`Sorry, we couldn't schedule your 1-on-1 request for ${when}.`, ...(lesson.adminNote ? [`Note from the dojo: ${sentence(lesson.adminNote)}`] : []), "You're welcome to send a new request with a different date or dojo."]
        : [`Sorry, your 1-on-1 session on ${when} has been cancelled.`, ...(lesson.adminNote ? [`Note from the dojo: ${sentence(lesson.adminNote)}`] : []), ...(refunded > 0 ? [`${plural(refunded, "credit")} returned to your account.`] : [])],
      button: { label: "Request another 1-on-1", path: "/lessons?type=private" },
    },
  });
}
