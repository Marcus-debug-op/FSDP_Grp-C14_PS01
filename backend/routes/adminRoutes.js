import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import * as admin from "../controller/adminController.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/overview", admin.overview);

router.get("/centres", admin.listCentres);
router.post("/centres", admin.createCentre);
router.put("/centres/:id", admin.updateCentre);
router.patch("/centres/:id/status", admin.setCentreStatus);

router.get("/instructors", admin.listInstructors);

router.get("/schedule", admin.getSchedule);

export default router;
