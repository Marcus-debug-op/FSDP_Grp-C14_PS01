// CONTROLLER: forgot password (FSDP-90).
// 1) POST /api/auth/forgot-password       { email }            -> emails a reset link
// 2) POST /api/auth/reset-password/check  { token }            -> is the link still usable?
// 3) POST /api/auth/reset-password        { token, password }  -> saves the new password
import bcrypt from "bcryptjs";
import * as User from "../model/userModel.js";
import * as Tokens from "../model/accountTokenModel.js";
import { sendPasswordResetEmail } from "../utils/accountEmails.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_MINUTES = 60;

// Shown whether or not the email has an account, so this page can't be used
// to find out who is registered.
const SENT_MESSAGE = "If an account uses that email, we've sent a link to reset your password. It expires in 1 hour.";
const BAD_LINK_MESSAGE = "This reset link has expired or has already been used. Please request a new one.";

export async function forgotPassword(req, res, next) {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!EMAIL_PATTERN.test(email) || email.length > 255) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }
    const user = await User.findByEmail(email);
    if (user && !(await Tokens.sentRecently(user.id, "password_reset"))) {
      const token = await Tokens.createToken(user.id, "password_reset", RESET_MINUTES);
      // Not awaited, so the reply takes the same time whether or not an email is sent.
      sendPasswordResetEmail({ to: user.email, fullName: user.full_name, token });
    }
    res.set("Cache-Control", "no-store");
    res.json({ message: SENT_MESSAGE });
  } catch (err) { next(err); }
}

export async function checkResetToken(req, res, next) {
  try {
    const token = req.body?.token;
    const valid = Tokens.isTokenFormat(token) && (await Tokens.isValid(token, "password_reset"));
    res.set("Cache-Control", "no-store");
    res.json({ valid, ...(valid ? {} : { message: BAD_LINK_MESSAGE }) });
  } catch (err) { next(err); }
}

export async function resetPassword(req, res, next) {
  try {
    const token = req.body?.token;
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!Tokens.isTokenFormat(token)) return res.status(400).json({ message: BAD_LINK_MESSAGE });
    // Same rule as sign-up (authController.js).
    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({ message: "Password must be 8–72 characters." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await Tokens.resetPassword(token, passwordHash);
    if (!user) return res.status(400).json({ message: BAD_LINK_MESSAGE });
    res.set("Cache-Control", "no-store");
    res.json({ message: "Your password has been changed. You can now sign in with your new password." });
  } catch (err) { next(err); }
}
