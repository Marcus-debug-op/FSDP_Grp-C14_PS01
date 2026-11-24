// MODEL: one-time links sent by email (FSDP-90 forgot password; later also
// email confirmation and account setup). Table: account_tokens (migration 017).
// Only a SHA-256 hash of each link's secret is stored, never the secret itself.
import crypto from "node:crypto";
import pool from "../db.js";

export const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

// A link secret is 32 random bytes in base64url: exactly 43 characters.
export const isTokenFormat = (raw) => typeof raw === "string" && /^[A-Za-z0-9_-]{43}$/.test(raw);

// True if a link for this purpose was sent to the user in the last `seconds`
// seconds, so repeated clicks on "Send reset link" don't flood their inbox.
export async function sentRecently(userId, purpose, seconds = 60) {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM account_tokens
       WHERE user_id = $1 AND purpose = $2 AND created_at > NOW() - make_interval(secs => $3)
     ) AS recent`,
    [userId, purpose, seconds]
  );
  return result.rows[0].recent;
}

// Creates a new link and cancels any older unused ones for the same purpose,
// so only the newest email works. Returns the raw secret to put in the email.
export async function createToken(userId, purpose, minutesValid) {
  const raw = crypto.randomBytes(32).toString("base64url");
  await pool.query(
    `UPDATE account_tokens SET used_at = NOW()
     WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
    [userId, purpose]
  );
  await pool.query(
    `INSERT INTO account_tokens (user_id, purpose, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + make_interval(mins => $4))`,
    [userId, purpose, hashToken(raw), minutesValid]
  );
  return raw;
}

// True if the link exists, hasn't been used and hasn't expired.
export async function isValid(raw, purpose) {
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM account_tokens
       WHERE token_hash = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > NOW()
     ) AS ok`,
    [hashToken(raw), purpose]
  );
  return result.rows[0].ok;
}

// Uses up a password-reset link and saves the new password in ONE statement,
// so two clicks at the same moment can't both succeed, and the link is never
// used up without the password changing. Returns the user, or null if the
// link was invalid, used or expired.
export async function resetPassword(raw, passwordHash) {
  const result = await pool.query(
    `WITH used AS (
       UPDATE account_tokens SET used_at = NOW()
       WHERE token_hash = $1 AND purpose = 'password_reset'
         AND used_at IS NULL AND expires_at > NOW()
       RETURNING user_id
     )
     UPDATE users u SET password_hash = $2
     FROM used WHERE u.id = used.user_id
     RETURNING u.id, u.full_name, u.email, u.role`,
    [hashToken(raw), passwordHash]
  );
  return result.rows[0] ?? null;
}
