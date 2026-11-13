// CONTROLLER: QR check-in.
// The instructor's screen asks for a short-lived code (refreshed every 30 s);
// the student's phone sends that code back to mark them present.
import jwt from "jsonwebtoken";
import * as CheckIn from "../model/checkInModel.js";

const TOKEN_SECONDS = 60;

// FOR TESTING ONLY: add CHECKIN_TEST_MODE=true to backend/.env to allow check-in
// at any time of day (skips the "30 min before until class ends" rule).
// Never set this on the live site. Everything else (booking, membership,
// expiry) is still checked.
const testMode = () => process.env.CHECKIN_TEST_MODE === "true";
// Separate signing key from login tokens, so a QR code can never be used to sign in.
const secret = () => `${process.env.JWT_SECRET}:class-checkin`;

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function publicSession(s) {
  return { id: s.id, title: s.title, centre: s.centre, date: s.session_date, startTime: s.start_time, endTime: s.end_time };
}

// POST /api/instructor/sessions/:id/qr   (instructor, own session only)
export async function createQr(req, res, next) {
  try {
    const sessionId = parseId(req.params.id);
    const session = sessionId && (await CheckIn.findSessionForCheckIn(sessionId));
    if (!session || session.instructor_id !== req.user.id) return res.status(404).json({ message: "Class not found." });
    if (session.status === "cancelled") return res.status(400).json({ message: "This class was cancelled." });
    if (!session.checkin_open && !testMode()) {
      return res.status(400).json({ message: "Check-in opens 30 minutes before class starts and closes when it ends." });
    }
    const token = jwt.sign({ sid: session.id, typ: "class-checkin" }, secret(), { expiresIn: TOKEN_SECONDS });
    res.set("Cache-Control", "no-store");
    res.json({ token, expiresInSeconds: TOKEN_SECONDS, session: publicSession(session) });
  } catch (err) { next(err); }
}

// POST /api/student/check-in   body: { token }   (signed-in student)
export async function checkIn(req, res, next) {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    let payload;
    try {
      payload = jwt.verify(token, secret());
    } catch {
      return res.status(400).json({ message: "This QR code has expired. Scan the code on your instructor's screen again." });
    }
    if (payload.typ !== "class-checkin" || !parseId(payload.sid)) {
      return res.status(400).json({ message: "This is not a valid check-in code." });
    }

    const session = await CheckIn.findSessionForCheckIn(payload.sid);
    if (!session) return res.status(404).json({ message: "Class not found." });
    if (session.status === "cancelled") return res.status(400).json({ message: "This class was cancelled." });
    if (!session.checkin_open && !testMode()) return res.status(400).json({ message: "Check-in for this class is closed." });

    const result = await CheckIn.recordQrCheckIn(session.id, req.user.id);
    if (!result.ok && result.reason === "not_member") {
      return res.status(403).json({ message: "Only active members can check in." });
    }
    if (!result.ok && result.reason === "not_booked") {
      return res.status(403).json({ message: "You haven't booked this class. Book it first, or ask your instructor to mark you present." });
    }
    res.set("Cache-Control", "no-store");
    res.status(result.ok ? 201 : 200).json({ alreadyCheckedIn: !result.ok, session: publicSession(session) });
  } catch (err) { next(err); }
}
