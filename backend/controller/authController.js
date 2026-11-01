// CONTROLLER: the logic for each request (check input, hash/compare passwords,
// make tokens). It asks the model for data and sends the response.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as User from "../model/userModel.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The token proves who the user is. It expires after 8 hours.
function createToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "8h" });
}

// Only send safe fields to the browser (never password_hash).
function publicUser(row) {
  return { id: row.id, fullName: row.full_name, email: row.email, role: row.role };
}

// POST /api/auth/signup  (students only)
export async function signup(req, res, next) {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (fullName.length < 2 || fullName.length > 100) {
      return res.status(400).json({ message: "Please enter your full name." });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }
    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({ message: "Password must be 8 to 72 characters." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // Any "role" sent by the browser is ignored: the model always makes a student.
    const user = await User.createStudent({ fullName, email, passwordHash });

    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (err) {
    // 23505 = email already exists (UNIQUE rule in the database)
    if (err.code === "23505") {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    next(err);
  }
}

// POST /api/auth/login  (student, instructor, admin)
export async function login(req, res, next) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const user = await User.findByEmail(email);

    // Same message for "no such email" and "wrong password" so attackers learn nothing.
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) return res.status(401).json({ message: "Incorrect email or password." });

    res.json({ token: createToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me  (used by the frontend to restore a session)
export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: "Please sign in." });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}
