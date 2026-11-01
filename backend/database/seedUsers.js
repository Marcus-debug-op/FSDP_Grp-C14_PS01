// Creates the pre-existing Admin and Instructor accounts.
// Details come from backend/.env so no password is written in the code.
// Run with:  npm run seed      (safe to run again: existing emails are skipped)
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import pool from "../db.js";

dotenv.config();

const accounts = [
  {
    role: "admin",
    name: process.env.SEED_ADMIN_NAME || "Administrator",
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  },
  {
    role: "instructor",
    name: process.env.SEED_INSTRUCTOR_NAME || "Instructor",
    email: process.env.SEED_INSTRUCTOR_EMAIL,
    password: process.env.SEED_INSTRUCTOR_PASSWORD,
  },
];

try {
  for (const a of accounts) {
    if (!a.email || !a.password) {
      console.log(`Skipped ${a.role}: set SEED_${a.role.toUpperCase()}_EMAIL and _PASSWORD in .env`);
      continue;
    }
    const hash = await bcrypt.hash(a.password, 10);
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [a.name, a.email.trim().toLowerCase(), hash, a.role]
    );
    console.log(result.rowCount ? `Created ${a.role}: ${a.email}` : `Already exists: ${a.email}`);
  }
} catch (err) {
  console.error("Seeding failed:", err.message);
} finally {
  await pool.end();
}
