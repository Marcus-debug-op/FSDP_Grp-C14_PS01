// ROUTES: student self-service portal. Every route needs a signed-in student.
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { listLessons, bookLesson, cancelLesson } from "../controller/lessonController.js";
import { getDashboard, getProfile } from "../controller/studentController.js";
import { getApplicationStatus } from "../controller/studentApplicationStatusController.js";
import { getSettings, updateSettings } from "../controller/settingsController.js";
import { photoStatus, resubmitPhoto } from "../controller/photoResubmissionController.js";
import express from "express";
https://github.com/Marcus-debug-op/FSDP_Grp-C14_PS01/pull/38/conflict?name=frontend%252Fsrc%252Fcss%252Fdashboard.css&ancestor_oid=82c046bffccd0aeabff92dcbd2033c9420d86195&base_oid=e934d5a6cc5816389f82bdb29496ea44d679e75a&head_oid=5b8e4be71d062109b7439848d2a30a68906e82a4

const router = Router();

router.use(requireAuth, requireRole("student"));

router.get("/dashboard", getDashboard);
router.get("/profile", getProfile);
router.get("/application/status", getApplicationStatus);
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

export default router;
