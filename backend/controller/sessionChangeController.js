// CONTROLLER: cancel a session or move it to another dojo (FSDP-56).
// Admins can change any session, instructors only the ones they teach.
import * as Change from "../model/sessionChangeModel.js";
import * as Notices from "../utils/notices.js";

function readId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function readNote(value, { required }) {
  const note = typeof value === "string" ? value.trim() : "";
  if (required && !note) return { error: "Please give a short reason. Students will see it." };
  if (note.length > 300) return { error: "Please keep the reason under 300 characters." };
  return { note: note || null };
}

function handle(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof Change.ChangeError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  };
}

// GET /api/sessions/:id
export const getSession = handle(async (req, res) => {
  const id = readId(req.params.id);
  if (!id) return res.status(400).json({ message: "That lesson couldn't be found." });
  res.json(await Change.getSession(id, req.user));
});

// POST /api/sessions/:id/cancel   body: { reason }
export const cancelSession = handle(async (req, res) => {
  const id = readId(req.params.id);
  if (!id) return res.status(400).json({ message: "That lesson couldn't be found." });
  const { note, error } = readNote(req.body?.reason, { required: true });
  if (error) return res.status(400).json({ message: error });

  const result = await Change.cancelSession(id, req.user, note);
  // Tell every booked student. Not awaited, so the page answers straight away.
  for (const a of result.affected) Notices.lessonCancelled(a.studentId, result.session, a.refunded);
  res.json({
    cancelled: true,
    studentsTold: result.affected.length,
    creditsReturned: result.affected.reduce((sum, a) => sum + a.refunded, 0),
  });
});

// POST /api/sessions/:id/move   body: { centreId, note? }
export const moveSession = handle(async (req, res) => {
  const id = readId(req.params.id);
  const centreId = readId(req.body?.centreId);
  if (!id) return res.status(400).json({ message: "That lesson couldn't be found." });
  if (!centreId) return res.status(400).json({ message: "Please choose the dojo it's moving to." });
  const { note, error } = readNote(req.body?.note, { required: false });
  if (error) return res.status(400).json({ message: error });

  const result = await Change.moveSession(id, req.user, centreId, note);
  for (const a of result.affected) Notices.lessonMoved(a.studentId, result.session);
  res.json({ moved: true, centre: result.session.centre, studentsTold: result.affected.length });
});
