import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import * as admin from "../controller/adminController.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/overview", admin.overview);
router.get("/dashboard", admin.dashboard);

router.get("/centres", admin.listCentres);
router.post("/centres", admin.createCentre);
router.put("/centres/:id", admin.updateCentre);
router.patch("/centres/:id/status", admin.setCentreStatus);

router.get("/instructors", admin.listInstructors);
router.get("/belts", admin.listBelts);

router.get("/schedule", admin.getSchedule);

router.get("/students", admin.searchStudents);
router.get("/students/:id", admin.getStudent);

router.get("/private-lessons", admin.listPrivateLessons);
router.get("/private-lessons/availability", admin.getInstructorAvailability);
router.post("/private-lessons", admin.createPrivateLesson);
router.patch("/private-lessons/:id/schedule", admin.schedulePrivateLesson);
router.patch("/private-lessons/:id/cancel", admin.cancelPrivateLesson);
router.patch("/private-lessons/:id/outcome", admin.recordPrivateLessonOutcome);

router.get("/attendance", admin.listAttendance);
router.get("/attendance/sessions/:id", admin.getSessionAttendance);

export default router;
