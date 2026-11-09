// ROUTES: student self-service portal. Every route needs a signed-in student.
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getDashboard } from "../controller/studentController.js";
import { getSettings, updateSettings, setHomeDojo } from "../controller/settingsController.js";

const router = Router();

router.use(requireAuth, requireRole("student"));

router.get("/dashboard", getDashboard);

// Personal settings. Contact details are editable; belt and membership are
// only ever read, so there is no route that writes them.    FSDP-42
router.get("/settings", getSettings);
router.patch("/settings", updateSettings);
// Separate route because changing the home dojo is the student confirming a
// suggestion, never a side effect of saving an address.
router.put("/settings/home-dojo", setHomeDojo);

export default router;
