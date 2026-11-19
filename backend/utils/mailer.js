// Sends email in one of two ways. Settings live in backend/.env (never in the code).
//
// 1) Brevo email API (used on the deployed site). Render's free plan blocks
//    SMTP, so the live server sends through Brevo over normal HTTPS instead:
//      BREVO_API_KEY=your Brevo API key
//      MAIL_FROM="Aikido Shinju-Kai <yourname@gmail.com>"  (must be a sender verified in Brevo)
//
// 2) SMTP, for example a Gmail account with an app password (used on laptops):
//      SMTP_HOST=smtp.gmail.com
//      SMTP_PORT=465
//      SMTP_USER=yourname@gmail.com
//      SMTP_PASS=your 16-letter app password
//      MAIL_FROM="Aikido Shinju-Kai <yourname@gmail.com>"   (optional)
//
// If BREVO_API_KEY is set, Brevo is used; otherwise SMTP. With neither set,
// each email is printed in the backend terminal instead of being sent, so
// everything else still works on a laptop with no email set up.
import nodemailer from "nodemailer";

let transport = null;

function brevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY);
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function emailConfigured() {
  return brevoConfigured() || smtpConfigured();
}

function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

// Turns MAIL_FROM ("Name <email>" or just "email") into { name, email }.
function senderFromEnv() {
  const raw = (process.env.MAIL_FROM || process.env.SMTP_USER || "").trim().replace(/^"|"$/g, "");
  const match = raw.match(/^(.*)<([^>]+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    return name ? { name, email: match[2].trim() } : { email: match[2].trim() };
  }
  return { name: "Aikido Shinju-Kai", email: raw };
}

async function sendWithBrevo({ to, subject, text, html }) {
  const sender = senderFromEnv();
  if (!sender.email) throw new Error("Set MAIL_FROM to a sender verified in Brevo.");
  const recipients = (Array.isArray(to) ? to : String(to).split(","))
    .map((email) => email.trim())
    .filter(Boolean)
    .map((email) => ({ email }));

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: recipients,
      subject,
      ...(html ? { htmlContent: html } : {}),
      ...(text ? { textContent: text } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    // Brevo's error message only (never the API key), e.g. "Sender is not valid".
    let detail = "";
    try { detail = (await response.json()).message || ""; } catch { /* no body */ }
    throw new Error(`Brevo rejected the email (${response.status})${detail ? `: ${detail}` : ""}`);
  }
}

// Returns true once the email is accepted for sending, or false if email
// isn't set up (the email is printed instead). Throws if sending fails.
export async function sendEmail({ to, subject, text, html }) {
  if (brevoConfigured()) {
    await sendWithBrevo({ to, subject, text, html });
    return true;
  }
  if (!smtpConfigured()) {
    console.log(`[email not sent, SMTP not set up] To: ${to} | ${subject}`);
    return false;
  }
  await getTransport().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
  return true;
}
