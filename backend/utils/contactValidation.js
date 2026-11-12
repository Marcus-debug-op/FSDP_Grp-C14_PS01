// =====================================================================
// Shared validation for a student's contact details.   FSDP-42
//
// Two places accept these fields now:
//   POST  /api/auth/signup      (authController)  -- captured at sign-up
//   PATCH /api/student/settings (settingsController) -- edited later
//
// They MUST agree. If sign-up were any looser than the settings page, the
// INSERT would hit the student_onboarding_postal_code_check constraint from
// migration 005, the whole sign-up transaction would roll back, and the
// student would get a generic "Something went wrong" with no idea which
// field was at fault. Keeping one copy of the rules here is what stops
// that, so put changes in this file rather than in either controller.
//
// Every function throws an Error whose message is meant to be read by a
// student; the controllers turn that into a 400.
// =====================================================================

import { isPostalCode } from "./singaporeLocation.js";

// Column widths from migration 005 and the original onboarding migration.
// Named here so a controller can never guess a limit the database will
// then reject.
export const LIMITS = {
  address: 255,
  phone: 30,
  emergencyContactName: 100,
  emergencyContactRelationship: 50,
};

// Trims, checks the type, and enforces a length limit.
// null/undefined mean "not given" -> "", which is how student_onboarding
// stores optional text (NOT NULL DEFAULT '').
export function boundedText(value, max, label) {
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
export function phoneNumber(value, label) {
  const trimmed = boundedText(value, LIMITS.phone, label);
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

// '' means "not given yet", which the column allows. Anything else must be a
// real 6-digit Singapore postal code, because the nearby-dojo suggestions
// read it.
//
// Checked directly rather than through boundedText so that every wrong value
// gets the same useful message: going through boundedText first would answer
// "579 7831" with "too long (max 6 characters)", which tells a student
// nothing about what a postal code should look like.
//
// Inner spaces are stripped before checking. A postal code is only ever
// digits, so "579 783" is unambiguously 579783 and worth accepting rather
// than bouncing back at someone who typed it the way they say it.
export function postalCode(value) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("Postal code must be text.");
  const compact = value.replace(/\s/g, "");
  if (compact === "") return "";
  if (!isPostalCode(compact)) {
    throw new Error("Postal code must be 6 digits, for example 579783.");
  }
  return compact;
}

// An emergency contact is only useful as a name AND a number: a name with no
// number can't be rung, and a number with no name can't be explained to
// whoever picks up. So the two are always accepted or rejected together.
//
// Pass the already-validated values. Either argument may be undefined, which
// means "this request isn't touching that field" and skips the check -- that
// is what lets the settings page save one field at a time.
export function assertEmergencyPair(name, phone) {
  if (name === undefined || phone === undefined) return;
  if (name !== "" && phone === "") throw new Error("Please give a contact number for your emergency contact.");
  if (phone !== "" && name === "") throw new Error("Please give a name for your emergency contact.");
}

// For a field the caller has decided is compulsory. Used by sign-up for all
// four new fields, and by the settings page for the emergency contact pair,
// so that a contact already on file cannot be blanked out.
export function assertPresent(value, message) {
  if (value === "") throw new Error(message);
  return value;
}
