// Express server entry point. Run with:  npm run dev
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

// Refuse to start without a signing secret (never hardcode it in the code).
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing. Add it to backend/.env and restart.");
  process.exit(1);
}

const app = express();

// Only the frontend is allowed to call this API from a browser.
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
// Two optional 2 MB files may arrive as base64 (approximately 5.4 MB total).
app.use(express.json({ limit: "7mb" }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);

// Unknown address
app.use((req, res) => res.status(404).json({ message: "Not found" }));

// Any unexpected error ends up here. Details stay in the terminal, not in the browser.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
