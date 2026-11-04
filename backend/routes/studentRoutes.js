// ROUTES: student self-service portal. Every route needs a signed-in student.
import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getDashboard } from "../controller/studentController.js";

const router = Router();

router.use(requireAuth, requireRole("student"));

router.get("/dashboard", getDashboard);

export default router;
