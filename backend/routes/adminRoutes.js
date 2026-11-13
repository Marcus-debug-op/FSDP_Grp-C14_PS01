import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import * as admin from "../controller/adminController.js";
import * as applications from "../controller/membershipApplicationAdminController.js";
import * as membershipBook from "../controller/membershipBookController.js";
import * as hqAlerts from "../controller/hqAlertsController.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/applications", applications.list);
router.get("/applications/hq-alerts", hqAlerts.list);
router.patch("/applications/hq-alerts/:alertId/ack", hqAlerts.acknowledge);
router.get("/applications/:id", applications.detail);
router.get("/applications/:id/photo", applications.photo);
router.patch("/applications/:id/decision", applications.decide);
router.patch("/applications/:id/book", membershipBook.advance);
router.patch("/applications/:id/photo/request", applications.requestPhoto);
router.patch("/applications/:id/photo/accept", applications.acceptPhoto);

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
router.patch("/private-lessons/:id/instructor", admin.changePrivateLessonInstructor);

router.get("/cover-requests", admin.listCoverRequests);
router.get("/cover-requests/:id/availability", admin.getCoverAvailability);
router.post("/cover-requests/:id/offer", admin.offerCover);
router.post("/cover-requests/:id/cancel", admin.cancelCoverLesson);

router.get("/grading-sessions", admin.listGradingSessions);
router.post("/grading-sessions", admin.createGradingSession);
router.get("/grading-sessions/:id/applications", admin.getGradingApplications);

router.get("/attendance", admin.listAttendance);
router.get("/attendance/sessions/:id", admin.getSessionAttendance);

export default router;
