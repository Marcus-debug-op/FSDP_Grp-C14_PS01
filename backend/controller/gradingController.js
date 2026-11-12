// progress toward grading & grading eligibility
//
// Everything here is read-only. One endpoint serves both stories, because
// they are computed from the same counts -- two endpoints would mean two
// chances for the dashboard and the grading page to disagree.
//
// `canApply` is computed here and will be re-checked, using these same model
// functions, by the POST handler that FSDP-65 adds. Hiding a button is not a
// gate; the server has to decide.
import * as Grading from "../model/gradingModel.js";
import { findCurrentBelt } from "../model/beltModel.js";

// How far along a requirement the student is, as a percentage for the bar.
// A requirement of 0 is already satisfied, so it shows as full rather than
// dividing by zero.
function percentOf(done, required) {
  if (!required || required <= 0) return 100;
  return Math.min(100, Math.round((done / required) * 100));
}

export async function getEligibility(req, res, next) {
  try {
    const userId = req.user.id;

    const [belt, nextBelt, training, nextGrading] = await Promise.all([
      findCurrentBelt(userId),
      Grading.findNextBelt(userId),
      Grading.findTrainingSinceBelt(userId),
      Grading.findNextGradingSession(),
    ]);

    // No student_profiles row: the front desk hasn't recorded a belt yet, so
    // there is no belt to grade from and nothing to measure. Same shape as the
    // other student endpoints so the page can render a single notice.
    if (!belt) {
      return res.json({
        profileReady: false,
        currentBelt: null, nextBelt: null, atHighestBelt: false,
        progress: null, eligible: false, unmet: [], canApply: false,
        nextGrading: null, application: null, syllabus: [],
      });
    }

    const classesAttended = Number(training.classes_attended) || 0;
    const hoursAttended = Number(training.hours_attended) || 0;
    const externalClasses = Number(training.external_classes) || 0;
    const monthsAtBelt = Number(belt.months_at_belt) || 0;

    // At the top of the recorded ladder there is nothing to be eligible for.
    // Still returns the counts, so the page can show what they've trained.
    if (!nextBelt) {
      return res.json({
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
        nextGrading: null, application: null, syllabus: [],
      });
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
    const application = nextGrading
      ? await Grading.findApplicationForSession(userId, nextGrading.id)
      : undefined;

    // A withdrawn or rejected application shouldn't block a fresh attempt at
    // the same session; anything else means they've already applied.
    const blockingApplication =
      application && !["withdrawn", "rejected"].includes(application.status);

    const syllabus = await Grading.findSyllabusFor(nextBelt.id);

    res.json({
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
          }
        : null,
      application: application
        ? { id: application.id, status: application.status, appliedOn: application.applied_on }
        : null,
      // FSDP-65 will reuse exactly this condition on the POST, so the button
      // and the gate can never drift apart.
      canApply: Boolean(
        eligible && nextGrading && nextGrading.registration_open && !blockingApplication
      ),
      syllabus,
    });
  } catch (err) {
    next(err);
  }
}
