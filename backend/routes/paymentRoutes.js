// ROUTES: buying memberships and credits. The Stripe webhook is NOT here:
// it needs the raw request body, so server.js mounts it before express.json().
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getOptions, createCheckout, getSessionStatus } from "../controller/paymentController.js";

const router = Router();

router.use(requireAuth, requireRole("student"));

router.get("/options", getOptions);
router.post("/checkout", createCheckout);
router.get("/session/:sessionId", getSessionStatus);

export default router;
