// CONTROLLER: browse, book and cancel group lessons (FSDP-50, FSDP-53, FSDP-55).
import * as Lesson from "../model/lessonModel.js";
import * as Student from "../model/studentModel.js";
import { listUpcomingForStudent as listMyPrivateLessons } from "../model/studentPrivateLessonModel.js";
import * as Notices from "../utils/notices.js";

const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const TYPES = ["all", "group", "private"];

// Reads an optional whole-number filter from the query string.
// Returns undefined if it's missing, or null if it's not a valid number.
function readId(value, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

// GET /api/student/lessons?centreId=&day=&date=&type=&instructorId=&suitsBelt=1
// day is 0 (Sunday) to 6 (Saturday), the same as JavaScript getDay().
// date is "YYYY-MM-DD". type is all (default), group or private (1-on-1).
// Group lessons can be booked here. 1-on-1 sessions are the student's own,
// scheduled by the dojo, and are listed so the student sees everything in one place.
export async function listLessons(req, res, next) {
  try {
    const filters = {
      centreId: readId(req.query.centreId),
      dayOfWeek: readId(req.query.day, { min: 0, max: 6 }),
      instructorId: readId(req.query.instructorId),
      suitsBelt: req.query.suitsBelt === "1",
      date: req.query.date ? (isDate(req.query.date) ? req.query.date : null) : undefined,
    };
    const type = req.query.type || "all";
    if (Object.values(filters).includes(null) || !TYPES.includes(type)) {
      return res.status(400).json({ message: "One of the filters isn't valid. Please reset them and try again." });
    }

    const studentId = req.user.id;
    const rankOrder = await Lesson.getRankOrder(studentId);
    const [lessons, privates, options, credits, membership] = await Promise.all([
      type === "private" ? [] : Lesson.listUpcoming(studentId, rankOrder, filters),
      type === "group" || filters.instructorId || filters.suitsBelt
        ? []
        : listMyPrivateLessons(studentId, Lesson.DAYS_AHEAD, filters),
      Lesson.getFilterOptions(),
      Student.getCreditBalance(studentId),
      Student.getMembership(studentId),
    ]);

    res.json({
      daysAhead: Lesson.DAYS_AHEAD,
      cancelNoticeHours: Lesson.CANCEL_NOTICE_HOURS,
      credits,
      membership: membership && {
        plan: membership.plan,
        endDate: membership.end_date,
        active: membership.status === "active" && membership.days_left >= 0,
      },
      filters: options,
      lessons: lessons.map((l) => ({
        type: "group",
        id: l.id,
        title: l.title,
        centreId: l.centre_id,
        centre: l.centre,
        instructor: l.instructor,
        date: l.session_date,
        startTime: l.start_time,
        endTime: l.end_time,
        creditCost: l.credit_cost,
        spotsLeft: Math.max(0, l.capacity - l.booked),
        minBelt: l.min_belt,
        maxBelt: l.max_belt,
        openToAll: l.open_to_all,
        suitsBelt: l.suits_belt,
        bookedByMe: l.booked_by_me,
        freeCancel: l.free_cancel,
        cancelBy: { date: l.cancel_by_date, time: l.cancel_by_time },
        venueChanged: l.venue_changed,
        changeNote: l.change_note,
      })),
      // The student's own 1-on-1 sessions in the same window (FSDP-54).
      privateLessons: privates,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/student/lessons/:sessionId/book
export async function bookLesson(req, res, next) {
  const sessionId = readId(req.params.sessionId);
  if (!sessionId) return res.status(400).json({ message: "That lesson couldn't be found." });

  try {
    const result = await Lesson.bookSession(req.user.id, sessionId);
    // FSDP-53: confirmation on the website and by email. Not awaited, so a
    // slow mail server never holds up the booking.
    Notices.bookingConfirmed(req.user.id, { ...result, cancelNoticeHours: Lesson.CANCEL_NOTICE_HOURS });
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Lesson.BookingError) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
}

// POST /api/student/lessons/:sessionId/cancel   body: { acceptLostCredit?: true }
// A late cancel (inside the notice period) answers 409 with code "late_cancel"
// until the student confirms they accept losing the credit.
export async function cancelLesson(req, res, next) {
  const sessionId = readId(req.params.sessionId);
  if (!sessionId) return res.status(400).json({ message: "That lesson couldn't be found." });

  try {
    const result = await Lesson.cancelBooking(req.user.id, sessionId, {
      acceptLostCredit: req.body?.acceptLostCredit === true,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof Lesson.BookingError) {
      return res.status(err.status).json({ message: err.message, code: err.code });
    }
    next(err);
  }
}
