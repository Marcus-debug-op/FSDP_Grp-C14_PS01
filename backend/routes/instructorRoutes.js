// ROUTES: instructor side. Every route needs a signed-in instructor.
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  listClasses, getCalendar, getGradingReadiness, listUpcomingGradings, getGradingApplicants, setApplicantApproval,
  getRoster, saveAttendance, getAttendanceTrends, listOffers, acceptOffer, declineOffer,
} from "../controller/instructorController.js";
import { createQr } from "../controller/checkInController.js";

const router = Router();

router.use(requireAuth, requireRole("instructor"));

router.get("/classes", listClasses);
router.get("/calendar", getCalendar);
router.get("/attendance-trends", getAttendanceTrends);
router.get("/grading-readiness", getGradingReadiness);
router.get("/gradings", listUpcomingGradings);
router.get("/gradings/:id/applicants", getGradingApplicants);
router.put("/gradings/:id/applicants/:studentId/approval", setApplicantApproval);
router.get("/sessions/:id/roster", getRoster);
router.put("/sessions/:id/attendance", saveAttendance);
router.post("/sessions/:id/qr", createQr);   // QR check-in code for this class
router.get("/offers", listOffers);           // FSDP-69: lessons the admin asked you to take
router.post("/offers/:id/accept", acceptOffer);
router.post("/offers/:id/decline", declineOffer);

export default router;
