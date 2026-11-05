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

// GET /api/belts/tester01
// 200 with belt:null if the student has no profile row yet (e.g. a brand-new sign-up).
export async function getMyBelt(req, res, next) {
  try {
    const current = await Belt.findCurrentBelt(req.user.id);
    res.json({ belt: publicBelt(current) });
  } catch (err) {
    next(err);
  }
}

// GET /api/belts/tester01/progression
// Returns the whole ladder. Each rank is tagged achieved / current / upcoming against
// the student's current rank_order, and the current rank carries the date it was awarded.
// NOTE: the database keeps only the student's CURRENT belt, so earlier belts have no
// recorded award date. True per-belt history would need a belt-history table.
export async function getMyProgression(req, res, next) {
  try {
    const [ladder, currentRank] = await Promise.all([
      Belt.findBeltLadder(),
      Belt.findCurrentRank(req.user.id),
    ]);
    const currentOrder = currentRank ? currentRank.rank_order : 0;

    const progression = ladder.map((r) => ({
      id: r.id,
      name: r.name,
      colour: r.colour,
      rankOrder: r.rank_order,
      minMonthsAtRank: r.min_months_at_rank,
      minClassesAtRank: r.min_classes_at_rank,
      requirements: r.requirements, // array of strings (may be empty)
      status:
        r.rank_order < currentOrder ? "achieved"
        : r.rank_order === currentOrder ? "current"
        : "upcoming",
      // Only the current belt has a real date in the database.
      awardedOn: r.rank_order === currentOrder && currentRank ? currentRank.belt_awarded_on : null,
    }));

    res.json({ progression, hasProfile: Boolean(currentRank) });
  } catch (err) {
    next(err);
  }
}
