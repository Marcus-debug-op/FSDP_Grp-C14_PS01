// MODEL: SQL for FSDP-42 "Manage personal settings". Only SQL lives here.
// Tables used:
//   users(id, full_name, email)                              read-only here
//   student_onboarding(user_id, phone, address, postal_code, emergency_*)
//                                                            the editable fields
//   student_profiles(user_id, home_centre_id)                home dojo only
//   centres(id, name, address, is_active)                    read-only here
//   memberships + membership_plans                           read-only here
//
// Belt is read through beltModel.findCurrentBelt, not re-queried here, so the
// Settings page and the My Belt page can never disagree.
import pool from "../db.js";

// "Today" in Singapore, matching studentModel and beltModel.
const SGT_TODAY = "(NOW() AT TIME ZONE 'Asia/Singapore')::date";

// The columns a student is allowed to change, and nothing else. The settings
// UPDATE is built from this list, so a new key in the request body can never
// reach a column that isn't here.
export const EDITABLE_COLUMNS = [
  "phone",
  "address",
  "postal_code",
  "emergency_contact_name",
  "emergency_contact_phone",
  "emergency_contact_relationship",
];

// The student's own contact details.
// Returns undefined when there is no student_onboarding row -- that means the
// account was created by SQL rather than by the sign-up form, and there is
// nothing to edit yet. The caller must handle it rather than silently inserting,
// because date_of_birth / gender / experience_level are NOT NULL on this table
// and inventing them would show a student a fake date of birth as their own.
export async function findContactDetails(userId) {
  const result = await pool.query(
    `SELECT u.full_name, u.email,
            o.phone,
            o.address, o.postal_code,
            o.emergency_contact_name, o.emergency_contact_phone, o.emergency_contact_relationship,
            o.membership_plan, o.membership_status,
            to_char(o.updated_at AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD HH24:MI') AS updated_at
     FROM users u
     JOIN student_onboarding o ON o.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0];
}

// Updates only the fields present in `changes`, which must be keys of
// EDITABLE_COLUMNS. Returns undefined if no student_onboarding row was
// matched, so the controller can report that instead of a false success.
export async function updateContactDetails(userId, changes) {
  const columns = Object.keys(changes).filter((key) => EDITABLE_COLUMNS.includes(key));
  if (columns.length === 0) return findContactDetails(userId);

  // $1 is the user id, so the first value placeholder is $2.
  const assignments = columns.map((column, i) => `${column} = $${i + 2}`);
  const values = columns.map((column) => changes[column]);

  const result = await pool.query(
    `UPDATE student_onboarding
        SET ${assignments.join(", ")}, updated_at = NOW()
      WHERE user_id = $1
      RETURNING user_id`,
    [userId, ...values]
  );
  if (result.rowCount === 0) return undefined;
  return findContactDetails(userId);
}

// The student's home dojo and membership, both view-only on this page.
// Returns undefined when the student has no student_profiles row (not yet
// enrolled by the front desk).
export async function findHomeDojo(userId) {
  const result = await pool.query(
    `SELECT p.home_centre_id, c.name AS centre_name, c.address AS centre_address
     FROM student_profiles p
     LEFT JOIN centres c ON c.id = p.home_centre_id
     WHERE p.user_id = $1`,
    [userId]
  );
  return result.rows[0];
}

// The membership in force today, or the most recent one. Same query shape as
// studentModel.getMembership so the dashboard and this page agree.
export async function findMembership(userId) {
  const result = await pool.query(
    `SELECT mp.name AS plan, m.status,
            to_char(m.start_date, 'YYYY-MM-DD') AS start_date,
            to_char(m.end_date, 'YYYY-MM-DD') AS end_date,
            (m.end_date - ${SGT_TODAY})::int AS days_left
     FROM memberships m
     JOIN membership_plans mp ON mp.id = m.plan_id
     WHERE m.student_id = $1 AND m.status IN ('active', 'expired')
     ORDER BY (m.status = 'active' AND m.end_date >= ${SGT_TODAY}) DESC, m.end_date DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

// Every dojo a student could choose as their home dojo. Closed and
// under-renovation dojos (is_active = FALSE) are left out on purpose: there is
// no point suggesting somewhere nobody can train.
export async function listActiveCentres() {
  const result = await pool.query(
    "SELECT id, name, address FROM centres WHERE is_active ORDER BY name"
  );
  return result.rows;
}

// Sets the student's home dojo, but only to a dojo that exists and is open.
// The centre check is inside the statement so a closed or made-up centre id
// matches no row rather than being written and rejected later.
// Returns undefined if nothing was updated (no profile row, or a bad centre id),
// which the controller turns into a clear message.
export async function setHomeDojo(userId, centreId) {
  const result = await pool.query(
    `UPDATE student_profiles
        SET home_centre_id = $2, updated_at = NOW()
      WHERE user_id = $1
        AND EXISTS (SELECT 1 FROM centres c WHERE c.id = $2 AND c.is_active)
      RETURNING home_centre_id`,
    [userId, centreId]
  );
  if (result.rowCount === 0) return undefined;
  return findHomeDojo(userId);
}
