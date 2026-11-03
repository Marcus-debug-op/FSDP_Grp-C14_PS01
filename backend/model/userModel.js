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
export async function createStudent({ fullName, email, passwordHash, onboarding }) {
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
        user_id, date_of_birth, experience_level, previous_rank, experience_notes,
        evidence_filename, evidence_mime, evidence_data,
        membership_status, membership_plan, preferred_name, phone, training_goal
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_payment', 'annual', $9, $10, $11)`,
      [user.id, onboarding.dateOfBirth, onboarding.experienceLevel, onboarding.previousRank,
       onboarding.experienceNotes, onboarding.fileName, onboarding.fileMime,
       onboarding.fileBuffer, onboarding.preferredName, onboarding.phone,
       onboarding.trainingGoal]
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
