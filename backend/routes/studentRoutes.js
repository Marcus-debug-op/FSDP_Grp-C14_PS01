// ROUTES: student self-service portal. Every route needs a signed-in student.
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { listLessons, bookLesson, cancelLesson } from "../controller/lessonController.js";
import { getDashboard, getProfile } from "../controller/studentController.js";
import { getApplicationStatus } from "../controller/studentApplicationStatusController.js";
import { getSettings, updateSettings } from "../controller/settingsController.js";
import { photoStatus, resubmitPhoto } from "../controller/photoResubmissionController.js";
import {
  getTimetable, getHistory, listPrivateLessons, requestPrivateLesson, withdrawPrivateLesson, listNotices, readNotices,
} from "../controller/myLessonsController.js";
import express from "express";
import { reapply } from "../controller/membershipReapplicationController.js";
import { checkIn } from "../controller/checkInController.js";

const router = Router();

router.use(requireAuth, requireRole("student"));

router.get("/dashboard", getDashboard);
router.get("/profile", getProfile);
router.get("/application/status", getApplicationStatus);
router.post("/check-in", checkIn);   // QR check-in (body: { token })
router.post("/application/reapply", reapply);
router.get("/application/photo-status", photoStatus);
router.post("/application/photo", express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "2mb" }), resubmitPhoto);

// Personal settings. Contact details are editable; belt, membership and the
// nearest dojo are only ever read, so there is no route that writes them.
// The nearest dojo needs no route of its own: it is derived from the postal
// code saved by PATCH below.                                      FSDP-42
router.get("/settings", getSettings);
router.patch("/settings", updateSettings);

router.get("/lessons", listLessons);                    // FSDP-50
router.post("/lessons/:sessionId/book", bookLesson);    // FSDP-53
router.post("/lessons/:sessionId/cancel", cancelLesson); // FSDP-55

router.get("/timetable", getTimetable);                 // FSDP-41
router.get("/history", getHistory);                     // FSDP-59

router.get("/private-lessons", listPrivateLessons);     // FSDP-54
router.post("/private-lessons", requestPrivateLesson);
router.post("/private-lessons/:id/withdraw", withdrawPrivateLesson);

// Notices for bookings, payments, lesson changes and 1-on-1s (FSDP-47, 53, 54, 56)
router.get("/notices", listNotices);
router.post("/notices/read", readNotices);

export default router;
