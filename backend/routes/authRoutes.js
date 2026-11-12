// ROUTES: only connects each web address to a controller function.
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/authMiddleware.js";
import { signup, login, me, myProfilePhoto, checkEmail } from "../controller/authController.js";

const router = Router();

// Slows down password guessing: max 30 attempts per 15 minutes per address.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: { message: "Too many attempts. Please try again later." },
});

// Public signup pre-check: rate limited, and returns only whether an email exists.
router.post("/check-email", authLimiter, checkEmail);
router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.get("/me", requireAuth, me);
router.get("/profile-photo", requireAuth, myProfilePhoto);

export default router;
