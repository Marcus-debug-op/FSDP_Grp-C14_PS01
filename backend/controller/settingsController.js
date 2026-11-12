// CONTROLLER: FSDP-42 "Manage personal settings".
//
// What a student may change here: phone, address, emergency contact.
// What they may not: belt, membership, or any dojo. Those are sent for display
// only and there is no route that writes them.
//
// The nearest dojo is not a setting. It is derived from the student's postal
// code on every request, so it follows the address automatically and there is
// nothing stored that could fall out of step with it.
import * as Settings from "../model/settingsModel.js";
import { findCurrentBelt } from "../model/beltModel.js";
import { rankByProximity, proximityLabel } from "../utils/singaporeLocation.js";
import {
  LIMITS, boundedText, phoneNumber, postalCode, assertEmergencyPair, assertPresent,
} from "../utils/contactValidation.js";

const NEARBY_LIMIT = 5;

// Builds the set of columns to update from whatever the request actually sent.
// A field the request leaves out is left alone, so the page can save one
// section without blanking the others.
//
// The rules themselves live in utils/contactValidation.js, because the sign-up
// form accepts the same fields and the two must not drift apart.
function readChanges(body) {
  const changes = {};
  if ("phone" in body) changes.phone = phoneNumber(body.phone, "Phone number");
  // One field for the whole address, unit number included.
  if ("address" in body) changes.address = boundedText(body.address, LIMITS.address, "Address");
  if ("postalCode" in body) changes.postal_code = postalCode(body.postalCode);

  const hasName = "emergencyContactName" in body;
  const hasPhone = "emergencyContactPhone" in body;
  if (hasName) {
    changes.emergency_contact_name =
      boundedText(body.emergencyContactName, LIMITS.emergencyContactName, "Emergency contact name");
  }
  if (hasPhone) {
    changes.emergency_contact_phone = phoneNumber(body.emergencyContactPhone, "Emergency contact number");
  }
  if ("emergencyContactRelationship" in body) {
    changes.emergency_contact_relationship =
      boundedText(body.emergencyContactRelationship, LIMITS.emergencyContactRelationship, "Relationship");
  }

  // The emergency contact is required at sign-up, so it must not be possible
  // to blank it afterwards -- otherwise the sign-up requirement means nothing.
  // Editing it is fine; emptying it is not. This only fires when the request
  // actually carries the field, so a student editing their phone number is
  // unaffected, as is an older account that never had one recorded.
  if (hasName) {
    assertPresent(changes.emergency_contact_name, "Please give a name for your emergency contact.");
  }
  if (hasPhone) {
    assertPresent(changes.emergency_contact_phone, "Please give a contact number for your emergency contact.");
  }
  assertEmergencyPair(
    hasName ? changes.emergency_contact_name : undefined,
    hasPhone ? changes.emergency_contact_phone : undefined
  );

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
  const [belt, membership, centres] = await Promise.all([
    findCurrentBelt(userId),
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
  }));

  return {
    contact: publicContact(contactRow),
    belt: publicBelt(belt),
    membership: publicMembership(membership, contactRow),
    // The closest open dojo to the student's postal code. Worked out fresh on
    // every request and never stored, so it simply follows the address: there
    // is nothing for a student to pick and nothing to go stale. null until
    // they give a usable postal code.
    nearestDojo: nearbyDojos[0] || null,
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
// with the nearest dojo and the nearby list recalculated from the new postal
// code -- which is how changing an address changes the dojo shown.
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

// There is deliberately no route here that writes a dojo. The nearest dojo is
// derived from the address the student already saves through PATCH, so it needs
// no endpoint of its own and cannot disagree with the address it came from.
