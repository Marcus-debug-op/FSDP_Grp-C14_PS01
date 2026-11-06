// CONTROLLER: the logic for each instructor request. It checks the input,
// asks the model for data and sends the response.
import * as Instructor from "../model/instructorModel.js";
import { isValidDate } from "../utils/schedule.js";

const ATTENDANCE_STATUSES = ["present", "absent"];

function publicSession(row) {
  return {
    id: row.id,
    title: row.title,
    centre: row.centre,
    date: row.session_date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
  };
}

function publicRosterStudent(row) {
  return {
    studentId: row.id,
    fullName: row.full_name,
    belt: row.belt,
    status: row.status,
    method: row.method,
  };
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Returns the session, or sends a 404. Someone else's session looks the
// same as one that does not exist, so nothing is given away.
async function findOwnSession(req, res) {
  const sessionId = parseId(req.params.id);
  const session = sessionId && (await Instructor.findSession(sessionId, req.user.id));
  if (!session) res.status(404).json({ message: "Class not found." });
  return session;
}

// GET /api/instructor/classes?date=YYYY-MM-DD  (date is optional, default is today)
export async function listClasses(req, res, next) {
  try {
    const date = req.query.date || null;
    if (date && !isValidDate(date)) {
      return res.status(400).json({ message: "Date must be a valid date." });
    }

    const rows = await Instructor.listClassesOn(req.user.id, date);
    res.json({
      classes: rows.map((row) => ({ ...publicSession(row), booked: row.booked, marked: row.marked })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructor/calendar?month=YYYY-MM
export async function getCalendar(req, res, next) {
  try {
    const month = req.query.month;
    if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ message: "Month must look like 2026-11." });
    }

    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const from = `${month}-01`;
    const to = `${month}-${String(lastDay).padStart(2, "0")}`;

    const [classes, gradings] = await Promise.all([
      Instructor.listClassesBetween(req.user.id, from, to),
      Instructor.listGradingsBetween(req.user.id, from, to),
    ]);

    res.json({
      classes: classes.map((row) => ({ ...publicSession(row), booked: row.booked, marked: row.marked })),
      gradings: gradings.map((row) => ({
        id: row.id,
        centre: row.centre,
        date: row.grading_date,
        startTime: row.start_time,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/instructor/sessions/:id/roster
export async function getRoster(req, res, next) {
  try {
    const session = await findOwnSession(req, res);
    if (!session) return;

    const roster = await Instructor.getRoster(session.id);
    res.json({ session: publicSession(session), roster: roster.map(publicRosterStudent) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/instructor/sessions/:id/attendance
// Body: { records: [{ studentId, status }] }
export async function saveAttendance(req, res, next) {
  try {
    const session = await findOwnSession(req, res);
    if (!session) return;

    if (session.status === "cancelled") {
      return res.status(400).json({ message: "This class was cancelled." });
    }
    if (session.is_future) {
      return res.status(400).json({ message: "Attendance can only be marked on or after the class date." });
    }

    const records = req.body?.records;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "Please mark at least one student." });
    }
    if (records.some((r) => !parseId(r?.studentId) || !ATTENDANCE_STATUSES.includes(r?.status))) {
      return res.status(400).json({ message: "Each student needs a valid attendance status." });
    }
    if (new Set(records.map((r) => r.studentId)).size !== records.length) {
      return res.status(400).json({ message: "A student can only be marked once." });
    }

    const roster = await Instructor.getRoster(session.id);
    const onRoster = new Set(roster.map((row) => row.id));
    if (records.some((r) => !onRoster.has(r.studentId))) {
      return res.status(400).json({ message: "Only students on this roster can be marked." });
    }

    await Instructor.saveAttendance(session.id, req.user.id, records);

    const updated = await Instructor.getRoster(session.id);
    res.json({ session: publicSession(session), roster: updated.map(publicRosterStudent) });
  } catch (err) {
    next(err);
  }
}
