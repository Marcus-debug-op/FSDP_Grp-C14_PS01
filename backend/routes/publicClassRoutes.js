import { Router } from "express";
import { getPublicClasses } from "../controller/publicClassController.js";

const router = Router();
router.get("/", getPublicClasses);
export default router;
