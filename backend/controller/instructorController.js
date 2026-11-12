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
    attendanceClosed: row.attendance_closed,
  };
}

// A session plus whether attendance can be changed right now.
function publicRosterSession(row) {
  const canMark = row.status !== "cancelled" && !row.is_future && !row.attendance_closed;
  return { ...publicSession(row), canMark };
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

// Membership rule from the club's grading SOP: a member for at least 3 months.
// An active membership stands in for "no outstanding membership fees".
const MIN_MONTHS_AS_MEMBER = 3;

// Checks one student against the rules for their next belt.
function gradingProgress(row) {
  const student = { studentId: row.id, fullName: row.full_name, homeDojo: row.home_dojo };
  if (!row.current_belt) {
    return { ...student, status: "no_profile", checks: [] };
  }
  if (!row.next_belt) {
    return { ...student, currentBelt: row.current_belt, status: "top_belt", checks: [] };
  }

  const memberMonths = row.months_as_member ?? 0;
  const checks = [
    {
      key: "classes",
      label: "Classes since last grading",
      value: row.min_classes_at_rank > 0
        ? `${row.classes_since_belt} of ${row.min_classes_at_rank}`
        : `${row.classes_since_belt} classes, no minimum`,
      met: row.classes_since_belt >= row.min_classes_at_rank,
    },
    {
      key: "months",
      label: "Time at current belt",
      value: row.min_months_at_rank > 0
        ? `${row.months_at_belt} of ${row.min_months_at_rank} months`
        : `${row.months_at_belt} months, no minimum`,
      met: row.months_at_belt >= row.min_months_at_rank,
    },
    {
      key: "membership",
      label: "Member for 3 months, fees paid",
      value: row.membership_active ? `Member for ${memberMonths} months` : "No active membership",
      met: row.membership_active && memberMonths >= MIN_MONTHS_AS_MEMBER,
    },
  ];

  return {
    ...student,
    currentBelt: row.current_belt,
    nextBelt: row.next_belt,
    status: checks.every((check) => check.met) ? "ready" : "not_yet",
    checks,
  };
}

// GET /api/instructor/grading-readiness
export async function getGradingReadiness(req, res, next) {
  try {
    const rows = await Instructor.listGradingProgress(req.user.id);
    const order = { ready: 0, not_yet: 1, top_belt: 2, no_profile: 3 };
    const students = rows.map(gradingProgress).sort((a, b) => order[a.status] - order[b.status]);
    res.json({ students });
  } catch (err) {
    next(err);
  }
}

function publicGrading(row) {
  return {
    id: row.id,
    centre: row.centre,
    date: row.grading_date,
    startTime: row.start_time,
    closesOn: row.closes_on,
    registrationOpen: row.registration_open,
    isUpcoming: row.is_upcoming,
  };
}

// GET /api/instructor/gradings  (upcoming only)
export async function listUpcomingGradings(req, res, next) {
  try {
    const rows = await Instructor.listUpcomingGradings(req.user.id);
    res.json({
      gradings: rows.map((row) => ({ ...publicGrading(row), myApplicants: row.my_applicants, myAwaiting: row.my_awaiting })),
    });
  } catch (err) {
    next(err);
  }
}

// The instructor's own students who applied for a grading, each with the same
// readiness checks as the grading readiness page and their approval.
async function loadApplicants(instructorId, gradingId) {
  const [applications, progressRows] = await Promise.all([
    Instructor.listMyApplicants(instructorId, gradingId),
    Instructor.listGradingProgress(instructorId),
  ]);
  const progressById = new Map(progressRows.map((row) => [row.id, gradingProgress(row)]));

  return applications
    .filter((application) => progressById.has(application.student_id))
    .map((application) => ({
      ...progressById.get(application.student_id),
      applicationId: application.id,
      applicationStatus: application.status,
      targetBelt: application.target_belt,
      appliedOn: application.applied_on,
      approval: application.approved_on
        ? { by: application.approved_by, byYou: application.approved_by_id === instructorId, on: application.approved_on }
        : null,
    }));
}

// GET /api/instructor/gradings/:id/applicants
export async function getGradingApplicants(req, res, next) {
  try {
    const gradingId = parseId(req.params.id);
    const grading = gradingId && (await Instructor.findGrading(gradingId));
    if (!grading) return res.status(404).json({ message: "Grading not found." });

    const applicants = await loadApplicants(req.user.id, grading.id);
    res.json({ grading: publicGrading(grading), applicants });
  } catch (err) {
    next(err);
  }
}

// PUT /api/instructor/gradings/:id/applicants/:studentId/approval
// Body: { approved: true | false }. Approving sends the application on to the
// admin. Only Ready students can be approved, only before the grading day, and
// only while the application is still pending (the admin hasn't reviewed it).
export async function setApplicantApproval(req, res, next) {
  try {
    const gradingId = parseId(req.params.id);
    const studentId = parseId(req.params.studentId);
    const grading = gradingId && (await Instructor.findGrading(gradingId));
    if (!grading) return res.status(404).json({ message: "Grading not found." });
    if (typeof req.body?.approved !== "boolean") {
      return res.status(400).json({ message: "Say whether to approve or undo the approval." });
    }
    if (!grading.is_upcoming) {
      return res.status(400).json({ message: "This grading has already taken place." });
    }

    const applicant = (await loadApplicants(req.user.id, grading.id)).find((a) => a.studentId === studentId);
    if (!applicant) return res.status(404).json({ message: "Application not found." });
    // Once the admin has decided, the approval is locked so the application
    // doesn't disappear from the admin's grading page.
    if (applicant.applicationStatus !== "pending") {
      return res.status(409).json({ message: "The admin has already reviewed this application, so it can't be changed." });
    }

    if (req.body.approved) {
      if (applicant.status !== "ready") {
        return res.status(400).json({ message: "This student doesn't meet every requirement yet." });
      }
      if (applicant.approval && !applicant.approval.byYou) {
        return res.status(409).json({ message: `${applicant.approval.by} has already approved this application.` });
      }
      await Instructor.setApplicationApproval(applicant.applicationId, req.user.id);
    } else {
      if (applicant.approval && !applicant.approval.byYou) {
        return res.status(403).json({ message: "Only the instructor who approved this can undo it." });
      }
      await Instructor.setApplicationApproval(applicant.applicationId, null);
    }

    const updated = (await loadApplicants(req.user.id, grading.id)).find((a) => a.studentId === studentId);
    res.json({ applicant: updated });
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
    res.json({ session: publicRosterSession(session), roster: roster.map(publicRosterStudent) });
  } catch (err) {
    next(err);
  }
}

// PUT /api/instructor/sessions/:id/attendance
// Body: { records: [{ studentId, status }] }
// A status of null clears that student's mark, for an instructor who tapped by mistake.
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
    if (session.attendance_closed) {
      return res.status(400).json({ message: "Attendance closed 24 hours after this class ended." });
    }

    const records = req.body?.records;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "Please mark at least one student." });
    }
    if (records.some((r) => !parseId(r?.studentId) || !(r.status === null || ATTENDANCE_STATUSES.includes(r.status)))) {
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
    res.json({ session: publicRosterSession(session), roster: updated.map(publicRosterStudent) });
  } catch (err) {
    next(err);
  }
}
