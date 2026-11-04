import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import * as admin from "../controller/adminController.js";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/overview", admin.overview);

router.get("/dojos", admin.listDojos);
router.post("/dojos", admin.createDojo);
router.put("/dojos/:id", admin.updateDojo);
router.patch("/dojos/:id/status", admin.setDojoStatus);

router.get("/instructors", admin.listInstructors);
router.get("/schedule", admin.getSchedule);

export default router;
