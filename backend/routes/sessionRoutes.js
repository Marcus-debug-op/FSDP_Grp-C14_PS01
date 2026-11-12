// ROUTES: cancel or move a single class session (FSDP-56).
// Admins can change any session; instructors only their own (checked in the model).
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getSession, cancelSession, moveSession } from "../controller/sessionChangeController.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "instructor"));

router.get("/:id", getSession);
router.post("/:id/cancel", cancelSession);
router.post("/:id/move", moveSession);

export default router;
