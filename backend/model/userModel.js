// MODEL: talks to the database. Only SQL lives here, no request/response code.
import pool from "../db.js"; // existing Neon connection (unchanged)

// Find one user by email (includes password_hash so login can check the password)
export async function findByEmail(email) {
  const result = await pool.query(
    "SELECT id, full_name, email, role, password_hash FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0];
}

// Find one user by id (never returns the password hash)
export async function findById(id) {
  const result = await pool.query(
    "SELECT id, full_name, email, role FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0];
}

// Create a new STUDENT account. The role is fixed here, so no one can sign up as
// an instructor or admin. Throws error code 23505 if the email already exists.
export async function createStudent({ fullName, email, passwordHash }) {
  const result = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, 'student')
     RETURNING id, full_name, email, role`,
    [fullName, email, passwordHash]
  );
  return result.rows[0];
}
