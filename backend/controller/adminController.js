import * as Admin from "../model/adminModel.js";
import { addDays, dateFromToday, isValidDate, isValidTime, mondayOf } from "../utils/schedule.js";

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (message) => new HttpError(400, message);
const notFound = (message) => new HttpError(404, message);

function handle(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  };
}

function parseId(value, label = "ID") {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0 || id > 2147483647) throw badRequest(`${label} is not valid.`);
  return id;
}

function optionalId(value, label) {
  if (value === undefined || value === null || value === "") return undefined;
  return parseId(value, label);
}

function text(value, label, { min = 1, max = 255, required = true } = {}) {
  if (value !== undefined && value !== null && typeof value !== "string") throw badRequest(`${label} must be text.`);
  const trimmed = (value || "").trim();
  if (!trimmed && !required) return "";
  if (trimmed.length < min) throw badRequest(`Please enter the ${label.toLowerCase()}.`);
  if (trimmed.length > max) throw badRequest(`${label} must be ${max} characters or fewer.`);
  return trimmed;
}

function bool(value, label) {
  if (typeof value !== "boolean") throw badRequest(`${label} must be true or false.`);
  return value;
}

function validDate(value, label = "Date") {
  if (!isValidDate(value)) throw badRequest(`${label} must be a valid date.`);
  return value;
}

function timeRange(startTime, endTime) {
  if (!isValidTime(startTime)) throw badRequest("Start time must be a valid time.");
  if (!isValidTime(endTime)) throw badRequest("End time must be a valid time.");
  if (endTime <= startTime) throw badRequest("End time must be after start time.");
  return { startTime, endTime };
}

async function validateCentre(body, excludeId) {
  const name = text(body.name, "Dojo name", { min: 2, max: 100 });
  const address = text(body.address, "Address", { required: false, max: 255 }) || null;
  if (await Admin.findCentreByName(name, excludeId)) throw new HttpError(409, "A dojo with this name already exists.");
  return { name, address };
}

export const overview = handle(async (req, res) => {
  const weekStart = mondayOf(dateFromToday(0));
  const weekEnd = addDays(weekStart, 6);
  res.json({ weekStart, weekEnd, ...(await Admin.getOverview({ from: weekStart, to: weekEnd })) });
});

export const listCentres = handle(async (req, res) => {
  res.json({ centres: await Admin.listCentres() });
});

export const createCentre = handle(async (req, res) => {
  const data = await validateCentre(req.body);
  res.status(201).json({ centre: await Admin.createCentre(data) });
});

export const updateCentre = handle(async (req, res) => {
  const id = parseId(req.params.id, "Dojo ID");
  if (!(await Admin.findCentreById(id))) throw notFound("Dojo not found.");
  const data = await validateCentre(req.body, id);
  res.json({ centre: await Admin.updateCentre(id, data) });
});

export const setCentreStatus = handle(async (req, res) => {
  const id = parseId(req.params.id, "Dojo ID");
  const centre = await Admin.setCentreActive(id, bool(req.body.isActive, "Active"));
  if (!centre) throw notFound("Dojo not found.");
  res.json({ centre });
});

export const listInstructors = handle(async (req, res) => {
  res.json({ instructors: await Admin.listInstructors() });
});

export const getSchedule = handle(async (req, res) => {
  const requested = req.query.week || dateFromToday(0);
  if (!isValidDate(requested)) throw badRequest("Week must be a valid date.");
  const weekStart = mondayOf(requested);
  const weekEnd = addDays(weekStart, 6);
  const items = await Admin.listSchedule({
    from: weekStart,
    to: weekEnd,
    centreId: optionalId(req.query.centreId, "Dojo ID"),
    instructorId: optionalId(req.query.instructorId, "Instructor ID"),
    includeCancelled: req.query.includeCancelled === "true",
  });
  res.json({ weekStart, weekEnd, items });
});



export const listAttendance = handle(async (req, res) => {
  const from = validDate(req.query.from || dateFromToday(-6), "From date");
  const to = validDate(req.query.to || dateFromToday(0), "To date");
  if (to < from) throw badRequest("The end date must be on or after the start date.");
  if (addDays(from, 92) < to) throw badRequest("Please choose a range of 3 months or less.");
  const student = text(req.query.student, "Student search", { required: false, max: 100 }) || undefined;
  const sessions = await Admin.listAttendanceSessions({
    from,
    to,
    centreId: optionalId(req.query.centreId, "Dojo ID"),
    instructorId: optionalId(req.query.instructorId, "Instructor ID"),
    student,
  });
  res.json({ from, to, sessions });
});

export const getSessionAttendance = handle(async (req, res) => {
  const id = parseId(req.params.id, "Session ID");
  const session = await Admin.findAttendanceSession(id);
  if (!session) throw notFound("Session not found.");
  res.json({ session, students: await Admin.listSessionStudents(id) });
});

function monthStart(value) {
  return `${value.slice(0, 7)}-01`;
}

function monthEnd(value) {
  const [y, m] = value.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${value.slice(0, 7)}-${String(last).padStart(2, "0")}`;
}

function shiftMonths(value, months) {
  const [y, m] = value.split("-").map(Number);
  const date = new Date(y, m - 1 + months, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export const dashboard = handle(async (req, res) => {
  const view = req.query.view === "monthly" ? "monthly" : "daily";
  const today = dateFromToday(0);

  if (view === "daily") {
    const yesterday = addDays(today, -1);
    const weekFrom = addDays(today, -6);
    const [todayTotals, yesterdayTotals, weekTotals, series, centres, todayClasses, todaySessions] = await Promise.all([
      Admin.getAttendanceTotals({ from: today, to: today }),
      Admin.getAttendanceTotals({ from: yesterday, to: yesterday }),
      Admin.getAttendanceTotals({ from: weekFrom, to: today }),
      Admin.getDailyAttendance({ from: addDays(today, -13), to: today }),
      Admin.getCentreAttendance({ from: weekFrom, to: today }),
      Admin.listSchedule({ from: today, to: today }),
      Admin.listAttendanceSessions({ from: today, to: today }),
    ]);
    const counts = new Map(todaySessions.map((s) => [`session-${s.id}`, s]));
    const classes = todayClasses.map((item) => {
      const session = counts.get(item.id);
      return {
        ...item,
        sessionId: session?.id ?? null,
        booked: session?.booked ?? 0,
        attended: session ? session.present + session.late : 0,
        absent: session?.absent ?? 0,
      };
    });
    return res.json({
      view, today,
      period: { from: today, to: today, label: "Today" },
      totals: { ...todayTotals, classesScheduled: todayClasses.length },
      previous: { label: "yesterday", ...yesterdayTotals },
      rolling: { label: "last 7 days", from: weekFrom, to: today, ...weekTotals },
      series, centres, classes,
    });
  }

  const from = monthStart(today);
  const to = monthEnd(today);
  const lastFrom = shiftMonths(today, -1);
  const lastTo = monthEnd(lastFrom);
  const [monthTotals, lastTotals, series, centres] = await Promise.all([
    Admin.getAttendanceTotals({ from, to: today }),
    Admin.getAttendanceTotals({ from: lastFrom, to: lastTo }),
    Admin.getMonthlyAttendance({ from: shiftMonths(today, -5), to: today }),
    Admin.getCentreAttendance({ from, to: today }),
  ]);
  res.json({
    view, today,
    period: { from, to, label: "This month" },
    totals: monthTotals,
    previous: { label: "last month", ...lastTotals },
    series, centres,
  });
});

export const listBelts = handle(async (req, res) => {
  res.json({ belts: await Admin.listBelts() });
});

export const searchStudents = handle(async (req, res) => {
  const query = text(req.query.q, "Search", { required: false, max: 100 }) || undefined;
  const result = await Admin.searchStudents({
    query,
    centreId: optionalId(req.query.centreId, "Dojo ID"),
    beltId: optionalId(req.query.beltId, "Belt ID"),
    limit: 50,
  });
  res.json({ ...result, limit: 50 });
});

export const getStudent = handle(async (req, res) => {
  const id = parseId(req.params.id, "Student ID");
  const student = await Admin.findStudentProfile(id);
  if (!student) throw notFound("Student not found.");
  const [attendanceSummary, recentAttendance, memberships, gradings] = await Promise.all([
    Admin.getStudentAttendanceSummary(id),
    Admin.listStudentAttendance(id, 10),
    Admin.listStudentMemberships(id),
    Admin.listStudentGradings(id),
  ]);
  res.json({ student, attendanceSummary, recentAttendance, memberships, gradings });
});
