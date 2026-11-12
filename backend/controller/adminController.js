import * as Admin from "../model/adminModel.js";
import * as Lessons from "../model/privateLessonModel.js";
import * as Grading from "../model/adminGradingModel.js";
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
      if (err instanceof HttpError || err instanceof Lessons.LessonError) {
        return res.status(err.status).json({ message: err.message });
      }
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

const LESSON_VIEWS = ["requests", "upcoming", "past"];
const LESSON_OUTCOMES = ["completed", "no_show"];

function singaporeToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}

function lessonSlot(body) {
  const date = validDate(body.date, "Lesson date");
  if (date < singaporeToday()) throw badRequest("The lesson date cannot be in the past.");
  const { startTime, endTime } = timeRange(body.startTime, body.endTime);
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes < 30) throw badRequest("A private lesson must be at least 30 minutes.");
  if (minutes > 180) throw badRequest("A private lesson can be at most 3 hours.");
  return { date, startTime, endTime };
}

export const listPrivateLessons = handle(async (req, res) => {
  const view = req.query.view || "requests";
  if (!LESSON_VIEWS.includes(view)) throw badRequest("View must be requests, upcoming or past.");
  const [lessons, counts] = await Promise.all([Lessons.listLessons(view), Lessons.countLessons()]);
  res.json({ view, lessons, counts });
});

export const getInstructorAvailability = handle(async (req, res) => {
  const date = validDate(req.query.date, "Lesson date");
  const { startTime, endTime } = timeRange(req.query.startTime, req.query.endTime);
  const excludeLessonId = optionalId(req.query.lessonId, "Lesson ID") || null;
  res.json({ instructors: await Lessons.listInstructorAvailability({ date, startTime, endTime, excludeLessonId }) });
});

export const createPrivateLesson = handle(async (req, res) => {
  const body = req.body || {};
  const lesson = await Lessons.scheduleLesson({
    studentId: parseId(body.studentId, "Student"),
    centreId: parseId(body.centreId, "Dojo"),
    instructorId: parseId(body.instructorId, "Instructor"),
    ...lessonSlot(body),
    adminNote: text(body.adminNote, "Note", { required: false, max: 500 }) || null,
    adminId: req.user.id,
  });
  res.status(201).json({ lesson });
});

export const schedulePrivateLesson = handle(async (req, res) => {
  const body = req.body || {};
  const lesson = await Lessons.scheduleLesson({
    lessonId: parseId(req.params.id, "Lesson ID"),
    centreId: parseId(body.centreId, "Dojo"),
    instructorId: parseId(body.instructorId, "Instructor"),
    ...lessonSlot(body),
    adminNote: text(body.adminNote, "Note", { required: false, max: 500 }) || null,
    adminId: req.user.id,
  });
  res.json({ lesson });
});

export const cancelPrivateLesson = handle(async (req, res) => {
  const body = req.body || {};
  const result = await Lessons.cancelLesson({
    lessonId: parseId(req.params.id, "Lesson ID"),
    adminNote: text(body.adminNote, "Reason", { required: false, max: 500 }) || null,
  });
  res.json(result);
});

export const recordPrivateLessonOutcome = handle(async (req, res) => {
  const outcome = (req.body || {}).outcome;
  if (!LESSON_OUTCOMES.includes(outcome)) throw badRequest("Outcome must be completed or no_show.");
  const lesson = await Lessons.recordOutcome({ lessonId: parseId(req.params.id, "Lesson ID"), outcome });
  res.json({ lesson });
});

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

function checkEligibility(row, session) {
  const reasons = [];
  const classes = { have: row.classes_since_belt ?? 0, need: row.min_classes_at_rank ?? 0 };
  const months = { have: row.months_at_belt ?? 0, need: row.min_months_at_rank ?? 0 };

  if (!row.current_belt_id) {
    reasons.push("No belt recorded for this student yet");
  } else if (!row.next_belt_id) {
    reasons.push(`Already at ${row.current_belt_name}, the highest belt on record`);
  } else {
    if (row.target_belt_id !== row.next_belt_id) {
      reasons.push(`Applied for ${row.target_belt_name}, but their next belt is ${row.next_belt_name}`);
    }
    if (classes.have < classes.need) {
      reasons.push(`${plural(classes.need - classes.have, "more class", "more classes")} needed (${classes.have} of ${classes.need})`);
    }
    if (months.have < months.need) {
      reasons.push(`${plural(months.need - months.have, "more month", "more months")} at ${row.current_belt_name} needed (${months.have} of ${months.need})`);
    }
  }

  const { minBelt, maxBelt } = session;
  const belowRange = minBelt && row.target_belt_rank < minBelt.rankOrder;
  const aboveRange = maxBelt && row.target_belt_rank > maxBelt.rankOrder;
  if (belowRange || aboveRange) {
    reasons.push(`This grading is for ${minBelt ? minBelt.name : "any belt"} to ${maxBelt ? maxBelt.name : "any belt"} only`);
  }
  if (!row.member_on_grading_date) {
    reasons.push("No active membership on the grading date");
  }

  return { eligible: reasons.length === 0, reasons, classes, months, membershipActive: row.member_on_grading_date };
}

function toApplication(row, session) {
  return {
    id: row.id,
    status: row.status,
    appliedOn: row.applied_on,
    student: { id: row.student_id, name: row.student_name, email: row.student_email },
    currentBelt: row.current_belt_name,
    targetBelt: row.target_belt_name,
    instructorApproval: { by: row.approved_by, on: row.approved_on },
    ...checkEligibility(row, session),
  };
}

export const listGradingSessions = handle(async (req, res) => {
  const sessions = await Grading.listSessions();
  res.json({
    upcoming: sessions.filter((s) => s.isUpcoming),
    past: sessions.filter((s) => !s.isUpcoming).reverse(),
  });
});

export const createGradingSession = handle(async (req, res) => {
  const body = req.body || {};
  const today = singaporeToday();

  const centreId = parseId(body.centreId, "Dojo");
  const gradingDate = validDate(body.gradingDate, "Grading date");
  if (gradingDate < today) throw badRequest("The grading date cannot be in the past.");
  if (!isValidTime(body.startTime)) throw badRequest("Start time must be a valid time.");
  const startTime = body.startTime;
  const registrationClosesOn = validDate(body.registrationClosesOn, "Applications close date");
  if (registrationClosesOn > gradingDate) throw badRequest("Applications must close on or before the grading date.");
  if (registrationClosesOn < today) throw badRequest("Applications cannot close in the past.");
  if (!body.minBeltId || !body.maxBeltId) throw badRequest("Please choose the belts being graded.");
  const minBeltId = parseId(body.minBeltId, "Lowest belt graded");
  const maxBeltId = parseId(body.maxBeltId, "Highest belt graded");
  const examinerId = optionalId(body.examinerId, "Examiner") || null;

  const [centre, minBelt, maxBelt, examiner] = await Promise.all([
    Grading.findActiveCentre(centreId),
    Grading.findBelt(minBeltId),
    Grading.findBelt(maxBeltId),
    examinerId ? Grading.findInstructor(examinerId) : null,
  ]);
  if (!centre) throw badRequest("Please choose an open dojo.");
  if (!minBelt || !maxBelt) throw badRequest("Please choose the belts being graded.");
  if (minBelt.rank_order > maxBelt.rank_order) throw badRequest("The lowest belt graded must come before the highest.");
  if (examinerId && !examiner) throw badRequest("The examiner must be an instructor.");

  if (await Grading.findClashingSession({ centreId, gradingDate, startTime })) {
    throw new HttpError(409, `There is already a grading at ${centre.name} at that date and time.`);
  }

  const session = await Grading.createSession({ centreId, gradingDate, startTime, registrationClosesOn, examinerId, minBeltId, maxBeltId });
  res.status(201).json({ session });
});

export const getGradingApplications = handle(async (req, res) => {
  const session = await Grading.findSession(parseId(req.params.id, "Grading ID"));
  if (!session) throw notFound("Grading session not found.");
  const rows = await Grading.listApprovedApplications(session.id);
  const applications = rows.map((row) => toApplication(row, session));
  res.json({
    session,
    applications,
    counts: {
      total: applications.length,
      eligible: applications.filter((a) => a.eligible).length,
      awaitingInstructor: session.awaitingCount,
    },
  });
});
