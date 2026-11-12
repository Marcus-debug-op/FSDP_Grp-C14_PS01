// MODEL: notices shown to a student on the website, each with an optional email.
// Used for booking and payment confirmations, cancelled or moved lessons and
// 1-on-1 updates (FSDP-47, FSDP-53, FSDP-54, FSDP-56).
// Table: notifications (migrations 003 and 011). dedupe_key is unique, so one
// event never creates two notices or sends two emails, even if Stripe sends
// the same webhook twice.
import pool from "../db.js";
import { sendEmail } from "../utils/mailer.js";

const FRONTEND_URL = () => (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Saves a notice and, when `email` is given, emails it too.
// email = { subject, paragraphs: [..], button?: { label, path } }
// Never throws: a notice that fails must not undo a booking or payment that
// already worked. Returns the new notice id, or null if it already existed.
export async function notify({ userId, type, title, body, dedupeKey, email = null }) {
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, dedupe_key, email_status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (dedupe_key) DO NOTHING
       RETURNING id`,
      [userId, type, title.slice(0, 100), body, dedupeKey, email ? "pending" : "none"]
    );
    const id = result.rows[0]?.id ?? null;
    // Not awaited: the student shouldn't wait for the mail server.
    if (id && email) deliver(id, userId, email);
    return id;
  } catch (err) {
    console.error("Couldn't save notice", dedupeKey, err.message);
    return null;
  }
}

// Sends the email for one notice and records how it went:
// 'sent', 'failed', or still 'pending' if email isn't set up.
async function deliver(id, userId, { subject, paragraphs, button }) {
  try {
    const user = (await pool.query("SELECT email, full_name FROM users WHERE id = $1", [userId])).rows[0];
    if (!user) return;
    const firstName = user.full_name.split(" ")[0];
    const link = button && { label: button.label, url: `${FRONTEND_URL()}${button.path}` };

    const text = [
      `Hi ${firstName},`,
      ...paragraphs,
      ...(link ? [`${link.label}: ${link.url}`] : []),
      "Aikido Shinju-Kai",
    ].join("\n\n");

    const html = `
<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#26231f;max-width:560px">
  <p>Hi ${escapeHtml(firstName)},</p>
  ${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n  ")}
  ${link ? `<p><a href="${escapeHtml(link.url)}" style="display:inline-block;padding:10px 18px;background:#a83f31;color:#fff;text-decoration:none">${escapeHtml(link.label)}</a></p>` : ""}
  <p style="color:#5b5650">Aikido Shinju-Kai</p>
</div>`;

    const sent = await sendEmail({ to: user.email, subject, text, html });
    if (sent) await pool.query("UPDATE notifications SET email_status = 'sent' WHERE id = $1", [id]);
  } catch (err) {
    console.error("Email failed for notice", id, err.message);
    await pool.query("UPDATE notifications SET email_status = 'failed' WHERE id = $1", [id]).catch(() => {});
  }
}

// Newest notices first, for the student's dashboard.
export async function listForUser(userId, limit = 10) {
  const result = await pool.query(
    `SELECT id, type, title, body, read_at IS NOT NULL AS is_read,
            to_char(created_at AT TIME ZONE 'Asia/Singapore', 'YYYY-MM-DD"T"HH24:MI') AS created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2`,
    [userId, limit]
  );
  const unread = await pool.query(
    "SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL",
    [userId]
  );
  return { notices: result.rows, unread: unread.rows[0].count };
}

// Marks every unread notice as read. Only touches the user's own notices.
export async function markAllRead(userId) {
  await pool.query("UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL", [userId]);
}
