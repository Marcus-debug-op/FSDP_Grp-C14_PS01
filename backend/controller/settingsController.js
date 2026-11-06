// CONTROLLER: FSDP-42 "Manage personal settings".
//
// What a student may change here: phone, address, emergency contact, and
// (after confirming a suggestion) which dojo is their home dojo.
// What they may not: belt and membership. Those are sent for display only and
// there is no route that writes them.
import * as Settings from "../model/settingsModel.js";
import { findCurrentBelt } from "../model/beltModel.js";
import { isPostalCode, rankByProximity, proximityLabel } from "../utils/singaporeLocation.js";

const NEARBY_LIMIT = 5;

// ---------------------------------------------------------------------
// Validation. Each helper throws a message meant to be read by a student,
// and the handlers turn that into a 400.
// ---------------------------------------------------------------------

// Trims, checks the type, and enforces the column's own length limit.
// Treats null/undefined as "not given" -> "", matching how this table stores
// optional text (NOT NULL DEFAULT '').
function text(value, max, label) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new Error(`${label} is too long (max ${max} characters).`);
  return trimmed;
}

// Deliberately permissive about shape -- students write numbers as
// "+65 9123 4567", "91234567" or "9123-4567" and all of those are fine. It
// only insists on enough digits to be a real number, so an obvious typo is
// caught at the form rather than being discovered in an emergency.
function phone(value, label) {
  const trimmed = text(value, 30, label);
  if (trimmed === "") return "";
  if (!/^[0-9+()\-\s]+$/.test(trimmed)) {
    throw new Error(`${label} can only contain digits, spaces and + - ( ).`);
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    throw new Error(`${label} must have between 8 and 15 digits.`);
  }
  return trimmed;
}

// '' means "not given yet", which is allowed. Anything else must be a real
// 6-digit Singapore postal code, because the nearby-dojo suggestions read it.
//
// Checked directly rather than through text() so that every wrong value gets
// the same useful message. Going through text() first would answer "579 7831"
// with "too long (max 6 characters)", which tells a student nothing about what
// a postal code should look like.
//
// Inner spaces are stripped before checking: a postal code is only ever
// digits, so "579 783" is unambiguously 579783 and worth accepting rather
// than bouncing back at someone who typed it the way they say it.
function postalCode(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("Postal code must be text.");
  const compact = value.replace(/\s/g, "");
  if (compact === "") return "";
  if (!isPostalCode(compact)) {
    throw new Error("Postal code must be 6 digits, for example 579783.");
  }
  return compact;
}

// Builds the set of columns to update from whatever the request actually sent.
// A field the request leaves out is left alone, so the page can save one
// section without blanking the others.
function readChanges(body) {
  const changes = {};
  if ("phone" in body) changes.phone = phone(body.phone, "Phone number");
  // One field for the whole address, unit number included.
  if ("address" in body) changes.address = text(body.address, 255, "Address");
  if ("postalCode" in body) changes.postal_code = postalCode(body.postalCode);

  const hasName = "emergencyContactName" in body;
  const hasPhone = "emergencyContactPhone" in body;
  if (hasName) changes.emergency_contact_name = text(body.emergencyContactName, 100, "Emergency contact name");
  if (hasPhone) changes.emergency_contact_phone = phone(body.emergencyContactPhone, "Emergency contact number");
  if ("emergencyContactRelationship" in body) {
    changes.emergency_contact_relationship = text(body.emergencyContactRelationship, 50, "Relationship");
  }

  // A name with no number is no use in an emergency, and a number with no name
  // is no use either. Only check when the request touches one of them, so
  // saving an unrelated field can't fail on this.
  if (hasName || hasPhone) {
    const name = hasName ? changes.emergency_contact_name : undefined;
    const number = hasPhone ? changes.emergency_contact_phone : undefined;
    if (name !== undefined && number !== undefined) {
      if (name !== "" && number === "") throw new Error("Please give a contact number for your emergency contact.");
      if (number !== "" && name === "") throw new Error("Please give a name for your emergency contact.");
    }
  }

  return changes;
}

// ---------------------------------------------------------------------
// Shaping. Rows go out in camelCase, like the rest of the API.
// ---------------------------------------------------------------------

function publicContact(row) {
  return {
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    postalCode: row.postal_code,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    emergencyContactRelationship: row.emergency_contact_relationship,
    updatedAt: row.updated_at,
  };
}

// View-only. Deliberately omits the grading-requirement numbers: this page is
// about contact details, and the My Belt page is where progress belongs.
// Both monthsAtBelt and daysAtBelt go out because the shared timeAtBelt()
// helper on the front end needs the day count to word a belt held for less
// than a month ("12 days" rather than "0 months").
function publicBelt(row) {
  if (!row) return null;
  return {
    name: row.name,
    colour: row.colour,
    awardedOn: row.belt_awarded_on,
    monthsAtBelt: row.months_at_belt,
    daysAtBelt: row.days_at_belt,
  };
}

// View-only. Same "expired / expiring / active" wording as the dashboard.
function publicMembership(row, onboarding) {
  if (!row) {
    // No memberships row yet: fall back to what was chosen at sign-up, so a
    // student who hasn't paid still sees something truthful.
    return {
      plan: onboarding.membership_plan,
      state: onboarding.membership_status,
      startDate: null,
      endDate: null,
      daysLeft: null,
      fromSignup: true,
    };
  }
  const state =
    row.status !== "active" || row.days_left < 0
      ? "expired"
      : row.days_left <= 7
        ? "expiring"
        : "active";
  return {
    plan: row.plan,
    state,
    startDate: row.start_date,
    endDate: row.end_date,
    daysLeft: row.days_left,
    fromSignup: false,
  };
}

// The whole settings payload, rebuilt from the database every time so a save
// and a reload can never show different things.
async function buildSettings(userId, contactRow) {
  const [belt, home, membership, centres] = await Promise.all([
    findCurrentBelt(userId),
    Settings.findHomeDojo(userId),
    Settings.findMembership(userId),
    Settings.listActiveCentres(),
  ]);

  // Empty until the student gives a postal code -- which is exactly why
  // changing the address changes what appears here.
  const nearbyDojos = rankByProximity(contactRow.postal_code, centres, NEARBY_LIMIT).map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    area: row.area,
    distanceKm: row.distanceKm,
    label: proximityLabel(row),
    sameDistrict: row.sameDistrict,
    isHomeDojo: Boolean(home && home.home_centre_id === row.id),
  }));

  return {
    // false means the front desk hasn't recorded a belt and home dojo yet.
    // Contact details are still editable; the home-dojo button is not.
    profileReady: Boolean(home),
    contact: publicContact(contactRow),
    belt: publicBelt(belt),
    membership: publicMembership(membership, contactRow),
    homeDojo: home && home.home_centre_id
      ? { id: home.home_centre_id, name: home.centre_name, address: home.centre_address }
      : null,
    nearbyDojos,
  };
}

// Shared by every handler: a student with no student_onboarding row has
// nothing to edit, and saying so beats reporting a save that changed nothing.
const NO_RECORD = "We couldn't find your student record. Please ask the front desk to finish setting up your account.";

// ---------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------

// GET /api/student/settings  (students only)
export async function getSettings(req, res, next) {
  try {
    const contact = await Settings.findContactDetails(req.user.id);
    if (!contact) return res.status(409).json({ message: NO_RECORD });
    res.json(await buildSettings(req.user.id, contact));
  } catch (err) {
    next(err);
  }
}

// PATCH /api/student/settings  (students only)
// Saves only the fields the request sent, then returns the full page payload,
// including the nearby-dojo list recalculated from the new postal code.
export async function updateSettings(req, res, next) {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({ message: "Please send the details to save." });
    }

    let changes;
    try {
      changes = readChanges(req.body);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    if (Object.keys(changes).length === 0) {
      return res.status(400).json({ message: "There was nothing to save." });
    }

    const contact = await Settings.updateContactDetails(req.user.id, changes);
    if (!contact) return res.status(409).json({ message: NO_RECORD });
    res.json(await buildSettings(req.user.id, contact));
  } catch (err) {
    next(err);
  }
}

// PUT /api/student/settings/home-dojo  (students only)
// The student has seen the suggestions and picked one. Nothing changes a home
// dojo without going through here, so it is never a side effect of saving an
// address.
export async function setHomeDojo(req, res, next) {
  try {
    const centreId = Number(req.body?.centreId);
    if (!Number.isInteger(centreId) || centreId < 1) {
      return res.status(400).json({ message: "Please choose a dojo." });
    }

    const contact = await Settings.findContactDetails(req.user.id);
    if (!contact) return res.status(409).json({ message: NO_RECORD });

    const updated = await Settings.setHomeDojo(req.user.id, centreId);
    if (!updated) {
      // Either the student has no profile row, or that dojo is closed or gone.
      const home = await Settings.findHomeDojo(req.user.id);
      return res.status(home ? 400 : 409).json({
        message: home
          ? "That dojo isn't open for new students right now."
          : "Your belt and home dojo haven't been recorded yet. Please ask the front desk.",
      });
    }

    res.json(await buildSettings(req.user.id, contact));
  } catch (err) {
    next(err);
  }
}
