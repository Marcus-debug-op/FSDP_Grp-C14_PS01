// ROUTES: cancel or move a single class session (FSDP-56). Admins only.
// Instructors who can't teach a lesson use "Can't make it" instead (FSDP-69),
// so another instructor covers it and the lesson still goes ahead.
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getSession, cancelSession, moveSession } from "../controller/sessionChangeController.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/:id", getSession);
router.post("/:id/cancel", cancelSession);
router.post("/:id/move", moveSession);

export default router;
