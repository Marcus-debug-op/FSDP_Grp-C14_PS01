// ROUTES: instructor side. Every route needs a signed-in instructor.
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { listClasses, getRoster, saveAttendance } from "../controller/instructorController.js";

const router = Router();

router.use(requireAuth, requireRole("instructor"));

router.get("/classes", listClasses);
router.get("/sessions/:id/roster", getRoster);
router.put("/sessions/:id/attendance", saveAttendance);

export default router;
