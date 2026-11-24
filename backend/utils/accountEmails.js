// Emails about the account itself (password reset; later email confirmation
// and account setup). These go straight to the email address and do NOT
// create an inbox notice, because the person may not be able to sign in yet.
import { sendEmail } from "./mailer.js";

const FRONTEND_URL = () => (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Same look as the other emails (notificationModel.js).
function buildEmail({ fullName, paragraphs, button }) {
  const firstName = String(fullName || "").split(" ")[0] || "there";
  const text = [`Hi ${firstName},`, ...paragraphs, `${button.label}: ${button.url}`, "Aikido Shinju-Kai"].join("\n\n");
  const html = `
<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#26231f;max-width:560px">
  <p>Hi ${escapeHtml(firstName)},</p>
  ${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n  ")}
  <p><a href="${escapeHtml(button.url)}" style="display:inline-block;padding:10px 18px;background:#a83f31;color:#fff;text-decoration:none">${escapeHtml(button.label)}</a></p>
  <p style="color:#5b5650">Aikido Shinju-Kai</p>
</div>`;
  return { text, html };
}

// FSDP-90. Never throws: the forgot-password page shows the same message
// whether or not this works, so a mail problem is only logged.
export async function sendPasswordResetEmail({ to, fullName, token }) {
  try {
    const url = `${FRONTEND_URL()}/reset-password?token=${encodeURIComponent(token)}`;
    const { text, html } = buildEmail({
      fullName,
      paragraphs: [
        "We received a request to reset the password for your Aikido Shinju-Kai account.",
        "Click the button below to choose a new password. The link works once and expires in 1 hour.",
        "If you didn't ask for this, you can ignore this email. Your password won't change.",
      ],
      button: { label: "Reset my password", url },
    });
    await sendEmail({ to, subject: "Reset your Aikido Shinju-Kai password", text, html });
  } catch (err) {
    console.error("Password reset email failed:", err.message);
  }
}
