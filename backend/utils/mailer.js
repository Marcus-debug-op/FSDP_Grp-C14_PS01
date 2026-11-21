// Sends email in one of two ways. Settings live in backend/.env (never in the code).
//
// 1) Gmail API (used on the deployed site). Render's free plan blocks SMTP, so
//    the live server sends through Google's Gmail API over normal HTTPS instead:
//      GMAIL_CLIENT_ID=OAuth client ID from Google Cloud Console
//      GMAIL_CLIENT_SECRET=OAuth client secret
//      GMAIL_REFRESH_TOKEN=refresh token for the sending Gmail account (scope: gmail.send)
//      MAIL_FROM="Aikido Shinju-Kai <yourname@gmail.com>"  (must be that same Gmail account)
//
// 2) SMTP, for example a Gmail account with an app password (used on laptops):
//      SMTP_HOST=smtp.gmail.com
//      SMTP_PORT=465
//      SMTP_USER=yourname@gmail.com
//      SMTP_PASS=your 16-letter app password
//      MAIL_FROM="Aikido Shinju-Kai <yourname@gmail.com>"   (optional)
//
// If the three GMAIL_* values are set, the Gmail API is used; otherwise SMTP.
// With neither set, each email is printed in the backend terminal instead of
// being sent, so everything else still works on a laptop with no email set up.
import nodemailer from "nodemailer";

let transport = null;
let gmailToken = null; // { value, expiresAt }

function gmailConfigured() {
  return Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function emailConfigured() {
  return gmailConfigured() || smtpConfigured();
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

// Exchanges the long-lived refresh token for a short-lived access token,
// reusing it until a minute before it expires.
async function gmailAccessToken() {
  if (gmailToken && gmailToken.expiresAt > Date.now() + 60_000) return gmailToken.value;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    // Google's error code only (never the secrets), e.g. "invalid_grant".
    throw new Error(`Google sign-in for email failed (${response.status}): ${body.error || "no access token"}`);
  }
  gmailToken = { value: body.access_token, expiresAt: Date.now() + (Number(body.expires_in) || 3600) * 1000 };
  return gmailToken.value;
}

// Encodes a header value so names and subjects with any characters are safe.
function encodeHeader(value) {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function buildMime({ from, to, subject, text, html }) {
  const boundary = `ask_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject || "")}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
  ];
  const part = (type, content) => [
    `--${boundary}`,
    `Content-Type: ${type}; charset="UTF-8"`,
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(content, "utf8").toString("base64").replace(/.{76}/g, "$&\r\n"),
    "",
  ];
  if (text) lines.push(...part("text/plain", text));
  if (html) lines.push(...part("text/html", html));
  lines.push(`--${boundary}--`, "");
  return lines.join("\r\n");
}

// "Name <email>" with the name safely encoded, or just the address.
function fromHeader() {
  const raw = (process.env.MAIL_FROM || process.env.SMTP_USER || "").trim().replace(/^"|"$/g, "");
  const match = raw.match(/^(.*)<([^>]+)>$/);
  if (!match) return raw;
  const name = match[1].trim().replace(/^"|"$/g, "");
  return name ? `${encodeHeader(name)} <${match[2].trim()}>` : match[2].trim();
}

async function sendWithGmailApi({ to, subject, text, html }) {
  const from = fromHeader();
  if (!from) throw new Error("Set MAIL_FROM to the Gmail address the refresh token belongs to.");
  const recipients = (Array.isArray(to) ? to : String(to).split(",")).map((e) => e.trim()).filter(Boolean).join(", ");
  const raw = Buffer.from(buildMime({ from, to: recipients, subject, text, html }), "utf8").toString("base64url");

  const token = await gmailAccessToken();
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    if (response.status === 401) gmailToken = null; // force a fresh token next time
    const body = await response.json().catch(() => ({}));
    throw new Error(`Gmail API rejected the email (${response.status})${body.error?.message ? `: ${body.error.message}` : ""}`);
  }
}

// Returns true once the email is accepted for sending, or false if email
// isn't set up (the email is printed instead). Throws if sending fails.
export async function sendEmail({ to, subject, text, html }) {
  if (gmailConfigured()) {
    await sendWithGmailApi({ to, subject, text, html });
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
