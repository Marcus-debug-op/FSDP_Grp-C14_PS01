import { Router } from "express";
import pool from "../db.js";

const router = Router();

// Public, read-only: new students can select a plan before creating their account.
// Prices and plan IDs are always read from Neon; never trusted from the browser.
router.get("/plans", async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, duration_months AS "durationMonths", price_cents AS "priceCents"
       FROM membership_plans
       WHERE name = 'Registration (New Member)' AND is_active = TRUE
       ORDER BY id`
    );
    res.json({ plans: result.rows });
  } catch (error) { next(error); }
});

// Public list of active dojos; no personal details are exposed.
router.get("/centres", async (_req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, name, address FROM centres WHERE is_active = TRUE ORDER BY name"
    );
    res.json({ centres: result.rows });
  } catch (error) { next(error); }
});

export default router;
