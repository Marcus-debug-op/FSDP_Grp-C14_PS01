// Express server entry point. Run with:  npm run dev
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { stripeWebhook } from "./controller/paymentController.js";
import adminRoutes from "./routes/adminRoutes.js";
import beltRoutes from "./routes/beltRoutes.js";
import instructorRoutes from "./routes/instructorRoutes.js";
import publicClassRoutes from "./routes/publicClassRoutes.js";
import registrationRoutes from "./routes/registrationRoutes.js";
import gradingRoutes from "./routes/gradingRoutes.js"; 


dotenv.config();

// Refuse to start without a signing secret (never hardcode it in the code).
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing. Add it to backend/.env and restart.");
  process.exit(1);
}

const app = express();

// Only the frontend is allowed to call this API from a browser.
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
// Stripe webhook needs the raw body to check its signature, so it must come before express.json().
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);
// Two optional 2 MB files may arrive as base64 (approximately 5.4 MB total).
app.use(express.json({ limit: "7mb" }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/registration", registrationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/belts", beltRoutes);
app.use("/api/instructor", instructorRoutes);
app.use("/api/classes", publicClassRoutes);
app.use("/api/grading", gradingRoutes);  

// Unknown address
app.use((req, res) => res.status(404).json({ message: "Not found" }));

// Any unexpected error ends up here. Details stay in the terminal, not in the browser.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
