import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getEligibility, applyForGrading, getMyApplications } from "../controller/gradingController.js";

const router = Router();

// Every route here is the student's own view of their own grading.
router.use(requireAuth, requireRole("student"));

// (progress toward grading) + (grading eligibility).
// One payload for both: the progress bar and the met/not-met breakdown come
// from the same counts, so splitting them would let the two disagree.
// Read-only -- nothing in this file writes.
router.get("/eligibility", getEligibility);

// apply for grading and pay the exam fee. Re-checks eligibility on the
// server and opens a Stripe Checkout. It does not create the application --
// that happens in paymentModel.markSucceeded once Stripe confirms the payment.
router.post("/applications", applyForGrading);

// track application status. The student's own applications and where
// each one stands on the Submitted -> Accepted -> Assessed -> Submitted for
// processing journey. Read-only.
router.get("/applications/me", getMyApplications);

export default router;
