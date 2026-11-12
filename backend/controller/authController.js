import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as User from "../model/userModel.js";
// the contact fields on the Profile step are validated by the same
// rules as the settings page, so the two can't drift apart. This file used to
// have its own boundedText(); it now comes from here instead, unchanged.
import {
  LIMITS, boundedText, phoneNumber, postalCode, assertPresent,
} from "../utils/contactValidation.js";
import pool from "../db.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FILE_TYPES = new Map([
  ["application/pdf", { prefix: "%PDF-" }],
  ["image/png", { magic: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }],
  ["image/jpeg", { magic: Buffer.from([0xff, 0xd8, 0xff]) }],
]);

const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function parsePhoto(input) {
  if (!input) return { photoMime: null, photoBuffer: null };
  if (typeof input !== "object" || Array.isArray(input) || !PHOTO_TYPES.has(input.type) || typeof input.dataUrl !== "string") throw new Error("Upload a JPG, PNG or WebP image.");
  const prefix = `data:${input.type};base64,`;
  if (!input.dataUrl.startsWith(prefix)) throw new Error("Invalid profile photo.");
  const base64 = input.dataUrl.slice(prefix.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > 2800000) throw new Error("Invalid profile photo.");
  const photoBuffer = Buffer.from(base64, "base64");
  if (!photoBuffer.length || photoBuffer.length > 2 * 1024 * 1024 || photoBuffer.toString("base64") !== base64) throw new Error("Profile photo must be 2 MB or smaller.");
  const signature = input.type === "image/png" ? Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]) : input.type === "image/jpeg" ? Buffer.from([0xff,0xd8,0xff]) : Buffer.from("RIFF");
  if (!photoBuffer.subarray(0,signature.length).equals(signature)) throw new Error("Image does not match its file type.");
  if (input.type === "image/webp" && photoBuffer.toString("ascii",8,12) !== "WEBP") throw new Error("Invalid WebP image.");
  return { photoMime: input.type, photoBuffer };
}

function createToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "8h" });
}
function publicUser(row) {
  return { id: row.id, fullName: row.full_name, email: row.email, role: row.role };
}
function parseEvidence(input) {
  if (!input) return { fileName: null, fileMime: null, fileBuffer: null };
  if (typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid file upload.");
  const fileName = boundedText(input.name, 255, "File name");
  const fileMime = input.type;
  if (!fileName || !FILE_TYPES.has(fileMime) || typeof input.dataUrl !== "string") throw new Error("Upload a PDF, PNG or JPG file.");
  const pattern = new RegExp(`^data:${fileMime.replace("/", "\/")};base64,([A-Za-z0-9+/]+={0,2})$`);
  const match = input.dataUrl.match(pattern);
  if (!match) throw new Error("Invalid file content.");
  const fileBuffer = Buffer.from(match[1], "base64");
  if (!fileBuffer.length || fileBuffer.length > 2 * 1024 * 1024) throw new Error("File must be no larger than 2 MB.");
  const rule = FILE_TYPES.get(fileMime);
  if (rule.magic && !fileBuffer.subarray(0, rule.magic.length).equals(rule.magic)) throw new Error("File content does not match its type.");
  if (rule.prefix && !fileBuffer.subarray(0, rule.prefix.length).equals(Buffer.from(rule.prefix))) throw new Error("Invalid PDF file.");
  return { fileName, fileMime, fileBuffer };
}

export async function signup(req, res, next) {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const dateOfBirth = req.body.dateOfBirth;
    const validDateString = typeof dateOfBirth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth);
    const parsedDate = validDateString ? new Date(`${dateOfBirth}T00:00:00Z`) : new Date(NaN);
    const today = new Date();
    const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (!validDateString || Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== dateOfBirth ||
        dateOfBirth < "1900-01-01" || parsedDate > utcToday) {
      return res.status(400).json({ message: "Please enter a valid date of birth (not in the future)." });
    }
    if (fullName.length < 2 || fullName.length > 100) return res.status(400).json({ message: "Please enter your full name (2–100 characters)." });
    if (!EMAIL_PATTERN.test(email) || email.length > 255) return res.status(400).json({ message: "Please enter a valid email address." });
    if (!["male", "female", "other", "prefer_not_to_say"].includes(req.body.gender)) return res.status(400).json({ message: "Please select a gender option." });
    if (password.length < 8 || password.length > 72) return res.status(400).json({ message: "Password must be 8–72 characters." });
    if (req.body.membershipSelection !== "annual_pending_payment") return res.status(400).json({ message: "Please select a registration plan." });
    const selectedPlanId = Number(req.body.selectedRegistrationPlanId);
    if (!Number.isInteger(selectedPlanId)) return res.status(400).json({ message: "Please choose a registration plan." });
    const availablePlan = await pool.query(
      "SELECT id FROM membership_plans WHERE id = $1 AND name = 'Registration (New Member)' AND is_active = TRUE",
      [selectedPlanId]
    );
    if (!availablePlan.rowCount) return res.status(400).json({ message: "Selected registration plan is unavailable." });
    if (!["beginner", "experienced"].includes(req.body.experienceLevel)) return res.status(400).json({ message: "Please select your experience level." });
    let onboarding;
    try {
      const beginner = req.body.experienceLevel === "beginner";
      onboarding = {
        dateOfBirth,
        gender: req.body.gender,
        ...parsePhoto(req.body.profilePhoto),
        experienceLevel: req.body.experienceLevel,
        previousRank: beginner ? "" : boundedText(req.body.previousRank, 100, "Previous rank"),
        experienceNotes: beginner ? "" : boundedText(req.body.experienceNotes, 1000, "Training background"),
        ...(!beginner ? parseEvidence(req.body.experienceFile) : { fileName: null, fileMime: null, fileBuffer: null }),
        preferredName: boundedText(req.body.preferredName, 100, "Preferred name"),
        // Was boundedText, so any text up to 30 characters was accepted. Now
        // checked by the same rule as the settings page, which means a number
        // that sign-up lets through is a number the settings page will too.
        phone: phoneNumber(req.body.phone, "Phone number"),
        trainingGoal: boundedText(req.body.trainingGoal, 500, "Training goal"),

        // address and emergency contact, collected on the Profile
        // step after the membership step. All required except the
        // relationship, which is a nicety rather than something we'd need in
        // an emergency.
        address: assertPresent(
          boundedText(req.body.address, LIMITS.address, "Address"),
          "Please enter your home address."
        ),
        postalCode: assertPresent(
          postalCode(req.body.postalCode),
          "Please enter your 6-digit postal code."
        ),
        emergencyContactName: assertPresent(
          boundedText(req.body.emergencyContactName, LIMITS.emergencyContactName, "Emergency contact name"),
          "Please enter the name of your emergency contact."
        ),
        emergencyContactPhone: assertPresent(
          phoneNumber(req.body.emergencyContactPhone, "Emergency contact number"),
          "Please enter a contact number for your emergency contact."
        ),
        emergencyContactRelationship: boundedText(
          req.body.emergencyContactRelationship,
          LIMITS.emergencyContactRelationship,
          "Relationship"
        ),
      };
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
    const preferredCentreId = Number(req.body.preferredCentreId);
    if (!Number.isSafeInteger(preferredCentreId) || preferredCentreId <= 0) {
      return res.status(400).json({ message: "Please choose a preferred dojo." });
    }
    const centreResult = await pool.query(
      "SELECT id FROM centres WHERE id = $1 AND is_active = TRUE",
      [preferredCentreId]
    );
    if (centreResult.rowCount === 0) {
      return res.status(400).json({ message: "The selected dojo is unavailable." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.createStudent({ fullName, email, passwordHash, onboarding, planId: selectedPlanId, preferredCentreId });
    return res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "An account with this email already exists." });
    // A CHECK constraint rejected something. Validation above should have
    // caught it first, so this is a backstop: without it the sign-up
    // transaction rolls back and the student sees the generic 500 from
    // server.js with no idea which field was wrong.
    if (err.code === "23514") {
      const field = err.constraint === "student_onboarding_postal_code_check" ? "postal code" : "details";
      return res.status(400).json({ message: `Please check your ${field} and try again.` });
    }
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findByEmail(email);
    const ok = user && (await bcrypt.compare(password, user.password_hash));
    if (!ok) return res.status(401).json({ message: "Incorrect email or password." });
    res.json({ token: createToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: "Please sign in." });
    res.json({ user: publicUser(user) });
  } catch (err) { next(err); }
}

// Profile images are private: only the signed-in user can retrieve their own photo.
export async function myProfilePhoto(req, res, next) {
  try {
    const image = await User.findProfilePhoto(req.user.id);
    if (!image?.photo_data || !image.photo_mime) return res.status(404).json({ message: "No profile photo uploaded." });
    res.set("Content-Type", image.photo_mime);
    res.set("Cache-Control", "private, no-store");
    res.send(image.photo_data);
  } catch (err) { next(err); }
}