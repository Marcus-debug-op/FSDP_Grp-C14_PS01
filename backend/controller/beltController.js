// CONTROLLER: the logic for each request. It asks the model for data and sends the response.
import * as Belt from "../model/beltModel.js";
import { findTrainingSinceBelt } from "../model/gradingModel.js";

// Only send the fields the browser needs, in camelCase like the rest of the API.
function publicBelt(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    colour: row.colour,
    rankOrder: row.rank_order,
    beltAwardedOn: row.belt_awarded_on,
    monthsAtBelt: row.months_at_belt,
    daysAtBelt: row.days_at_belt,
    minMonthsAtRank: row.min_months_at_rank,
    minClassesAtRank: row.min_classes_at_rank,
  };
}

// GET /api/belts/me  (current belt status, view-only)
// 200 with belt:null if the student has no profile row yet (e.g. a brand-new sign-up).
export async function getMyBelt(req, res, next) {
  try {
    const current = await Belt.findCurrentBelt(req.user.id);
    res.json({ belt: publicBelt(current) });
  } catch (err) {
    next(err);
  }
}

// GET /api/belts/me/history  (real belt history, view-only)
// A dated timeline of each belt the student has achieved, newest first.
// fromGrading=true means the date is a real grading-exam date; false means it came
// from the belt recorded on the student's profile.
export async function getMyHistory(req, res, next) {
  try {
    const rows = await Belt.findBeltHistory(req.user.id);
    const history = rows.map((r) => ({
      id: r.id,
      name: r.name,
      colour: r.colour,
      rankOrder: r.rank_order,
      achievedOn: r.achieved_on,
      fromGrading: r.from_grading,
    }));
    res.json({ history });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------
// Belt ladder and what's ahead
// ---------------------------------------------------------------------

const PACE_WEEKS = 8; // estimate uses the last 8 weeks of training

function percentOf(done, required) {
  if (!required || required <= 0) return 100;
  return Math.min(100, Math.round((done / required) * 100));
}

// Date maths on "YYYY-MM-DD" strings in UTC, so the server's timezone can't shift the day.
function addDays(ymd, days) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(ymd, months) {
  const [y, m, d] = ymd.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate(); // clamp 31 Jan + 1 -> 28/29 Feb
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDay))).toISOString().slice(0, 10);
}

// The later of: when the time-at-belt minimum is reached, and when the class minimum is
// reached at the current pace. null if classes are still short and there's no recent training.
function estimateDate({ today, awardedOn, requiredMonths, classesLeft, perWeek }) {
  if (classesLeft > 0 && perWeek <= 0) return null;
  const timeDate = addMonths(awardedOn, requiredMonths);
  const classDate = classesLeft > 0 ? addDays(today, Math.ceil((classesLeft / perWeek) * 7)) : today;
  const later = timeDate > classDate ? timeDate : classDate;
  return later > today ? later : today;
}

// Progress toward the next belt. Counts come from the same sources as GET /api/grading/eligibility,
// so the numbers match the Grading page.
function nextBeltProgress(current, nextRow, training, recent) {
  const attended = Number(training.classes_attended) || 0;
  const months = Number(current.months_at_belt) || 0;
  const requiredClasses = Number(nextRow.min_classes_at_rank) || 0;
  const requiredMonths = Number(nextRow.min_months_at_rank) || 0;
  const classesMet = attended >= requiredClasses;
  const monthsMet = months >= requiredMonths;
  const readyNow = classesMet && monthsMet;
  const perWeek = (Number(recent.recent_classes) || 0) / PACE_WEEKS;

  return {
    beltId: nextRow.id,
    classes: { attended, required: requiredClasses, met: classesMet, percent: percentOf(attended, requiredClasses) },
    timeAtBelt: { months, requiredMonths, met: monthsMet, percent: percentOf(months, requiredMonths) },
    readyNow,
    classesPerWeek: Math.round(perWeek * 10) / 10,
    // Estimate rests on time alone when classes are already met (or the belt has no class minimum).
    timeOnly: classesMet,
    estimatedDate: readyNow
      ? null
      : estimateDate({
          today: recent.today,
          awardedOn: current.belt_awarded_on,
          requiredMonths,
          classesLeft: Math.max(0, requiredClasses - attended),
          perWeek,
        }),
  };
}

// GET /api/belts/me/ladder  (view-only)
// Every belt on the student's ladder, marked earned / current / next / upcoming, with what each
// needs. next = progress + estimate for the next belt, or null at the top of the ladder.
export async function getMyLadder(req, res, next) {
  try {
    const userId = req.user.id;
    const [current, belts, history, training, recent] = await Promise.all([
      Belt.findCurrentBelt(userId),
      Belt.findLadderBelts(userId),
      Belt.findBeltHistory(userId),
      findTrainingSinceBelt(userId),
      Belt.countRecentClasses(userId, PACE_WEEKS * 7),
    ]);

    // No profile row yet: same "nothing to show" signal as the other belt endpoints.
    if (!current) return res.json({ profileReady: false, ladder: null, belts: [], next: null });

    const earnedOn = new Map(history.map((h) => [h.id, h.achieved_on]));
    const nextRank = current.rank_order + 1; // same "next belt" rule as gradingModel.findNextBelt
    const nextRow = belts.find((b) => b.rank_order === nextRank);

    const stateOf = (b) =>
      b.id === current.id ? "current"
      : b.rank_order < current.rank_order ? "earned"
      : b.rank_order === nextRank ? "next"
      : "upcoming";

    res.json({
      profileReady: true,
      ladder: belts[0]?.ladder ?? null,
      belts: belts.map((b) => ({
        id: b.id,
        name: b.name,
        colour: b.colour,
        rankOrder: b.rank_order,
        minClasses: b.min_classes_at_rank,
        minMonths: b.min_months_at_rank,
        techniques: b.technique_count,
        state: stateOf(b),
        earnedOn: earnedOn.get(b.id) || null, // null for lower belts never recorded (e.g. joined mid-ladder)
      })),
      next: nextRow ? nextBeltProgress(current, nextRow, training, recent) : null,
    });
  } catch (err) {
    next(err);
  }
}
