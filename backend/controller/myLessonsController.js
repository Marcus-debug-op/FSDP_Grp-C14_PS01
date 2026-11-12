// CONTROLLER: the student's own lessons and notices.
// FSDP-41 My timetable, FSDP-59 Lesson history, FSDP-54 1-on-1 requests,
// and the notices from FSDP-47 / 53 / 54 / 56.
import * as Timetable from "../model/timetableModel.js";
import * as Private from "../model/studentPrivateLessonModel.js";
import * as Notifications from "../model/notificationModel.js";
import { getCreditBalance } from "../model/studentModel.js";
import * as Notices from "../utils/notices.js";
import { CANCEL_NOTICE_HOURS } from "../model/lessonModel.js";

const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

// "YYYY-MM-DD" of the Monday on or before a date.
function mondayOf(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

// Today's date in Singapore, "YYYY-MM-DD".
const todaySgt = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

// GET /api/student/timetable?week=YYYY-MM-DD   (any day in the week; defaults to this week)
export async function getTimetable(req, res, next) {
  try {
    if (req.query.week && !isDate(req.query.week)) {
      return res.status(400).json({ message: "That week isn't valid." });
    }
    const weekStart = mondayOf(req.query.week || todaySgt());
    const items = await Timetable.getWeek(req.user.id, weekStart);
    res.json({ weekStart, thisWeek: mondayOf(todaySgt()), today: todaySgt(), cancelNoticeHours: CANCEL_NOTICE_HOURS, items });
  } catch (err) {
    next(err);
  }
}

// GET /api/student/history?month=YYYY-MM&centreId=
export async function getHistory(req, res, next) {
  try {
    const month = req.query.month || undefined;
    const centreId = req.query.centreId ? Number(req.query.centreId) : undefined;
    if ((month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) || (centreId !== undefined && !(Number.isInteger(centreId) && centreId > 0))) {
      return res.status(400).json({ message: "One of the filters isn't valid. Please reset them and try again." });
    }
    res.json(await Timetable.getHistory(req.user.id, { month, centreId }));
  } catch (err) {
    next(err);
  }
}

// GET /api/student/private-lessons
export async function listPrivateLessons(req, res, next) {
  try {
    const [lessons, centres, credits] = await Promise.all([
      Private.listForStudent(req.user.id),
      Private.listOpenCentres(),
      getCreditBalance(req.user.id),
    ]);
    res.json({
      lessons,
      centres,
      credits,
      creditCost: Private.PRIVATE_LESSON_CREDITS,
      daysAhead: Private.REQUEST_DAYS_AHEAD,
      maxOpenRequests: Private.MAX_OPEN_REQUESTS,
      timeChoices: Private.TIME_CHOICES,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/student/private-lessons   body: { centreId, preferredDate, preferredTime, note? }
export async function requestPrivateLesson(req, res, next) {
  const body = req.body || {};
  const centreId = Number(body.centreId);
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!Number.isInteger(centreId) || centreId <= 0) return res.status(400).json({ message: "Please choose a dojo." });
  if (!isDate(body.preferredDate)) return res.status(400).json({ message: "Please choose a date." });
  if (!Private.TIME_CHOICES.includes(body.preferredTime)) {
    return res.status(400).json({ message: "Please choose a time of day." });
  }
  if (note.length > 500) return res.status(400).json({ message: "Please keep your note under 500 characters." });

  try {
    const request = await Private.requestLesson(req.user.id, {
      centreId,
      preferredDate: body.preferredDate,
      preferredTime: body.preferredTime,
      note: note || null,
    });
    Notices.privateLessonRequested(req.user.id, request);
    res.status(201).json({ id: request.id });
  } catch (err) {
    if (err instanceof Private.RequestError) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

// POST /api/student/private-lessons/:id/withdraw
export async function withdrawPrivateLesson(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "That request couldn't be found." });
  try {
    await Private.withdrawRequest(req.user.id, id);
    res.json({ withdrawn: true });
  } catch (err) {
    if (err instanceof Private.RequestError) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

// GET /api/student/notices
export async function listNotices(req, res, next) {
  try {
    const { notices, unread } = await Notifications.listForUser(req.user.id);
    res.json({
      unread,
      notices: notices.map((n) => ({
        id: n.id, type: n.type, title: n.title, body: n.body, read: n.is_read, createdAt: n.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/student/notices/read   (marks them all as read)
export async function readNotices(req, res, next) {
  try {
    await Notifications.markAllRead(req.user.id);
    res.json({ unread: 0 });
  } catch (err) {
    next(err);
  }
}
