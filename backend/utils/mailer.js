// Sends email through any SMTP server, for example a Gmail account with an
// app password. Settings live in backend/.env (never in the code):
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=465
//   SMTP_USER=yourname@gmail.com
//   SMTP_PASS=your 16-letter app password
//   MAIL_FROM="Aikido Shinju-Kai <yourname@gmail.com>"   (optional)
// Without them, each email is printed in the backend terminal instead of
// being sent, so everything else still works on a laptop with no email set up.
import nodemailer from "nodemailer";

let transport = null;

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
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

// Returns true once the mail server accepts the email, or false if email
// isn't set up (the email is printed instead). Throws if sending fails.
export async function sendEmail({ to, subject, text, html }) {
  if (!emailConfigured()) {
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
