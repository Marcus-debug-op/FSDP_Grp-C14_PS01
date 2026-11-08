// Database queries for accounts and student onboarding.
import pool from "../db.js";

export async function findByEmail(email) {
  const result = await pool.query("SELECT id, full_name, email, role, password_hash FROM users WHERE email = $1", [email]);
  return result.rows[0];
}

export async function findById(id) {
  const result = await pool.query("SELECT id, full_name, email, role FROM users WHERE id = $1", [id]);
  return result.rows[0];
}

// Both inserts succeed or neither does: no orphaned accounts if onboarding fails.
export async function createStudent({ fullName, email, passwordHash, onboarding, planId, preferredCentreId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'student') RETURNING id, full_name, email, role`,
      [fullName, email, passwordHash]
    );
    const user = result.rows[0];
    await client.query(
      `INSERT INTO student_onboarding (
        user_id, date_of_birth, gender, photo_mime, photo_data, experience_level, previous_rank, experience_notes,
        evidence_filename, evidence_mime, evidence_data,
        membership_status, membership_plan, phone, training_goal
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending_payment', 'annual', $12, $13)`,
      [user.id, onboarding.dateOfBirth, onboarding.gender, onboarding.photoMime, onboarding.photoBuffer,
       onboarding.experienceLevel, onboarding.previousRank, onboarding.experienceNotes,
       onboarding.fileName, onboarding.fileMime, onboarding.fileBuffer,
       onboarding.phone, onboarding.trainingGoal]
    );
    // Store the initial application for the admin review queue.
    // Payment verification and Shihan approval happen separately.
    await client.query(
      `INSERT INTO membership_applications
         (student_id, plan_id, centre_id, approval_status, book_status)
       VALUES ($1, $2, $3, 'pending', 'not_prepared')`,
      [user.id, planId, preferredCentreId]
    );
    await client.query("COMMIT");
    return user;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function findProfilePhoto(userId) {
  const result = await pool.query("SELECT photo_mime, photo_data FROM student_onboarding WHERE user_id = $1", [userId]);
  return result.rows[0];
}
