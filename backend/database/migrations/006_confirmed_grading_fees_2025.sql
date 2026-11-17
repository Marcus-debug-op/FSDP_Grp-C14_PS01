-- Aikido Shinju-Kai grading fees — confirmed September 2025 SOP, page 1.
-- Non-destructive: does NOT alter belt_ranks or belt_requirements,
-- which are referenced by student profiles and grading applications.
-- Store prices as integer SGD cents; months/sessions are published requirements.
-- Run on the agreed Neon branch after confirming team ownership.

BEGIN;

CREATE TABLE IF NOT EXISTS grading_fee_schedule (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('children_kyu', 'adult_kyu', 'yudansha')),
  display_order INTEGER NOT NULL CHECK (display_order > 0),
  grade_name TEXT NOT NULL,
  belt_colour TEXT NOT NULL,
  min_months INTEGER CHECK (min_months IS NULL OR min_months >= 0),
  max_months INTEGER CHECK (max_months IS NULL OR max_months >= 0),
  min_sessions INTEGER CHECK (min_sessions IS NULL OR min_sessions >= 0),
  fee_cents INTEGER NOT NULL CHECK (fee_cents >= 0),
  age_rule TEXT,
  notes TEXT,
  source_document TEXT NOT NULL DEFAULT 'ASK Grading SOP, September 2025, page 1',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, grade_name, belt_colour),
  CHECK (min_months IS NULL OR max_months IS NULL OR max_months >= min_months)
);

-- These source rows can be rerun safely. Existing rows with the same
-- category + grade + belt colour are corrected without changing their IDs.
INSERT INTO grading_fee_schedule
  (category, display_order, grade_name, belt_colour,
   min_months, max_months, min_sessions, fee_cents, age_rule, notes)
VALUES
  ('children_kyu', 1, 'Kyu 12', 'Red', 3, 3, NULL, 4500, '5 years old', NULL),
  ('children_kyu', 2, 'Kyu 11', 'Red Gold', 4, 4, NULL, 4500, NULL, NULL),
  ('children_kyu', 3, 'Kyu 10', 'Yellow', 4, 4, NULL, 4500, NULL, NULL),
  ('children_kyu', 4, 'Kyu 9', 'Orange', 4, 4, NULL, 4500, NULL, NULL),
  ('children_kyu', 5, 'Kyu 8', 'Green', 4, 6, NULL, 4500, NULL, NULL),
  ('children_kyu', 6, 'Kyu 7', 'Purple', 6, 6, NULL, 4500, NULL, NULL),
  ('children_kyu', 7, 'Kyu 6', 'Blue', 6, 6, NULL, 5000, NULL, NULL),
  ('children_kyu', 8, 'Kyu 6', 'Blue Silver', 6, 6, NULL, 5000, NULL, NULL),
  ('children_kyu', 9, 'Kyu 5', 'Blue Gold', 6, 6, NULL, 5500, NULL, NULL),
  ('children_kyu', 10, 'Kyu 4', 'Brown', 10, 10, NULL, 6000, NULL, NULL),
  ('children_kyu', 11, 'Kyu 4', 'Brown Silver', 10, 10, NULL, 6000, NULL, NULL),
  ('children_kyu', 12, 'Kyu 3', 'Brown Gold', 8, 10, NULL, 6500, NULL, NULL),
  ('children_kyu', 13, 'Kyu 2', 'Black', 10, 10, NULL, 9000, '12 years and above', NULL),
  ('children_kyu', 14, 'Kyu 2', 'Black Silver', 10, 10, NULL, 9000, NULL, NULL),
  ('children_kyu', 15, 'Kyu 1', 'Black Gold', 9, 9, 62, 9500, NULL, NULL),
  ('adult_kyu', 1, 'Kyu 6', 'Blue', 3, 3, 20, 5000, NULL, NULL),
  ('adult_kyu', 2, 'Kyu 5', 'Blue Gold', NULL, NULL, 24, 5500, NULL, NULL),
  ('adult_kyu', 3, 'Kyu 4', 'Brown', NULL, NULL, 32, 6000, NULL, NULL),
  ('adult_kyu', 4, 'Kyu 3', 'Brown Gold', 6, 6, 36, 6500, NULL, NULL),
  ('adult_kyu', 5, 'Kyu 2', 'Black', 6, 6, 56, 9000, NULL, NULL),
  ('adult_kyu', 6, 'Kyu 1', 'Black Gold', 9, 9, 62, 9500, NULL, NULL),
  ('yudansha', 1, 'Junior Dan', 'Black', 9, 9, 62, 21500, 'Below 14 years old', NULL),
  ('yudansha', 2, 'ShoDan', 'Black', 9, 9, 70, 53500, '15 years old and above', NULL),
  ('yudansha', 3, 'NiDan', 'Black', 18, 18, 150, 59000, NULL, NULL),
  ('yudansha', 4, 'SanDan', 'Black', 30, 30, 240, 69500, NULL, NULL),
  ('yudansha', 5, 'YonDan', 'Black', 42, 42, 400, 91000, NULL, NULL)
ON CONFLICT (category, grade_name, belt_colour)
DO UPDATE SET
  display_order = EXCLUDED.display_order,
  min_months = EXCLUDED.min_months,
  max_months = EXCLUDED.max_months,
  min_sessions = EXCLUDED.min_sessions,
  fee_cents = EXCLUDED.fee_cents,
  age_rule = EXCLUDED.age_rule,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Late grading application charge (NOT a membership fee).
CREATE TABLE IF NOT EXISTS grading_fee_settings (
  setting_key TEXT PRIMARY KEY,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  source_document TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO grading_fee_settings (setting_key, amount_cents, source_document)
VALUES ('late_submission', 2200, 'ASK Grading SOP, September 2025, page 1')
ON CONFLICT (setting_key) DO UPDATE
  SET amount_cents = EXCLUDED.amount_cents,
      source_document = EXCLUDED.source_document,
      updated_at = NOW();

COMMIT;