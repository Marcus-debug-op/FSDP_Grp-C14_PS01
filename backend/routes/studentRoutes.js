// ROUTES: student self-service portal. Every route needs a signed-in student.
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getDashboard, getProfile } from "../controller/studentController.js";
import { getSettings, updateSettings } from "../controller/settingsController.js";


const router = Router();

router.use(requireAuth, requireRole("student"));

router.get("/dashboard", getDashboard);
router.get("/profile", getProfile);

// Personal settings. Contact details are editable; belt, membership and the
// nearest dojo are only ever read, so there is no route that writes them.
// The nearest dojo needs no route of its own: it is derived from the postal
// code saved by PATCH below.                                      FSDP-42
router.get("/settings", getSettings);
router.patch("/settings", updateSettings);

export default router;