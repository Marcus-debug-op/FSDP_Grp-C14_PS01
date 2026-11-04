// ROUTES: only connects each web address to a controller function.
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getMyBelt, getMyProgression } from "../controller/beltController.js";

const router = Router();

// Students only. Belt information is view-only, so there are no POST/PUT/DELETE routes.
router.get("/me", requireAuth, requireRole("student"), getMyBelt);
router.get("/me/progression", requireAuth, requireRole("student"), getMyProgression);

export default router;
