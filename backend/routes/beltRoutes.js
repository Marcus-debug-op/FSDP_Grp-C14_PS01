// ROUTES: only connects each web address to a controller function.
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getMyBelt, getMyHistory, getMyLadder } from "../controller/beltController.js";

const router = Router();

// Students only. Belt information is view-only, so there are no POST/PUT/DELETE routes.
router.get("/me", requireAuth, requireRole("student"), getMyBelt);              // FSDP-9
router.get("/me/history", requireAuth, requireRole("student"), getMyHistory);   // FSDP-62
router.get("/me/ladder", requireAuth, requireRole("student"), getMyLadder);     // FSDP-123

export default router;
