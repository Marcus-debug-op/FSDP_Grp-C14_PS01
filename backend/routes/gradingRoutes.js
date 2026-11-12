import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getEligibility } from "../controller/gradingController.js";

const router = Router();

// Every route here is the student's own view of their own grading.
router.use(requireAuth, requireRole("student"));

// (progress toward grading) + (grading eligibility).
// One payload for both: the progress bar and the met/not-met breakdown come
// from the same counts, so splitting them would let the two disagree.
// Read-only -- nothing in this file writes.
router.get("/eligibility", getEligibility);

// Coming next in this domain:
//   POST /applications      FSDP-65 apply and pay the exam fee
//   GET  /applications/me   FSDP-66 track application status

export default router;
