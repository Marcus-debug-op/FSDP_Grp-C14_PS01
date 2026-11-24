// ROUTES: only connects each web address to a controller function.
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/authMiddleware.js";
import { signup, login, me, myProfilePhoto, checkEmail } from "../controller/authController.js";
import { forgotPassword, checkResetToken, resetPassword } from "../controller/passwordResetController.js";

const router = Router();

// Slows down password guessing: max 30 attempts per 15 minutes per address.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: { message: "Too many attempts. Please try again later." },
});

// Forgot password (FSDP-90): stricter, so the form can't be used to flood
// someone's inbox. Max 5 requests per 15 minutes per IP address.
const resetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { message: "Too many reset requests. Please wait 15 minutes and try again." },
});

// Public signup pre-check: rate limited, and returns only whether an email exists.
router.post("/check-email", authLimiter, checkEmail);
router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/forgot-password", resetRequestLimiter, forgotPassword);
router.post("/reset-password/check", authLimiter, checkResetToken);
router.post("/reset-password", authLimiter, resetPassword);
router.get("/me", requireAuth, me);
router.get("/profile-photo", requireAuth, myProfilePhoto);

export default router;
