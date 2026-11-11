// ROUTES: instructor side. Every route needs a signed-in instructor.
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { listClasses, getCalendar, getGradingReadiness, getRoster, saveAttendance } from "../controller/instructorController.js";

const router = Router();

router.use(requireAuth, requireRole("instructor"));

router.get("/classes", listClasses);
router.get("/calendar", getCalendar);
router.get("/grading-readiness", getGradingReadiness);
router.get("/sessions/:id/roster", getRoster);
router.put("/sessions/:id/attendance", saveAttendance);

export default router;
