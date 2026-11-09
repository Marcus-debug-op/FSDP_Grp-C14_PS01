// ROUTES: student self-service portal. Every route needs a signed-in student.
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getDashboard } from "../controller/studentController.js";
import { listLessons, bookLesson } from "../controller/lessonController.js";

const router = Router();

router.use(requireAuth, requireRole("student"));

router.get("/dashboard", getDashboard);

router.get("/lessons", listLessons);                    // FSDP-50
router.post("/lessons/:sessionId/book", bookLesson);    // FSDP-53

export default router;
