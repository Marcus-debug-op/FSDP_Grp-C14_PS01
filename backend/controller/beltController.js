// CONTROLLER: the logic for each request. It asks the model for data and sends the response.
import * as Belt from "../model/beltModel.js";

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
