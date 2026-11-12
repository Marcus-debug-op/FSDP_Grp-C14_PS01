-- 011_children_belt_ladder.sql
-- Run once after 010. Safe to run more than once.
--
-- Adds the children's belt ladder from the ASK Grading SOP (September 2025,
-- page 1, also in 006_confirmed_grading_fees_2025.sql) next to the adult one.
--
-- How the two ladders stay apart:
--   adult belts keep rank_order 1 to 11, children's belts use 100 to 116.
--   "Next belt = rank_order + 1" therefore never crosses from one ladder to
--   the other, so existing queries keep working.
--   ladder says which ladder a belt is on, for lists and validation.
--
-- colour holds the base colour only (red, blue, brown, black), because the
-- belt badges map one colour word to one swatch. The stripe is in the name.
-- min_months_at_rank uses the lower bound of the SOP's month range.
-- Only Kyu 1 and Junior Dan have a published session count.

BEGIN;

ALTER TABLE belt_ranks
    ADD COLUMN IF NOT EXISTS ladder VARCHAR(20) NOT NULL DEFAULT 'adult';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'belt_ranks_ladder_check') THEN
        ALTER TABLE belt_ranks ADD CONSTRAINT belt_ranks_ladder_check CHECK (ladder IN ('adult', 'children'));
    END IF;
END $$;

INSERT INTO belt_ranks (name, colour, rank_order, min_months_at_rank, min_classes_at_rank, ladder) VALUES
    ('Children Ungraded',          'white',  100, 0,  0,  'children'),
    ('Children Kyu 12 Red',        'red',    101, 3,  0,  'children'),
    ('Children Kyu 11 Red Gold',   'red',    102, 4,  0,  'children'),
    ('Children Kyu 10 Yellow',     'yellow', 103, 4,  0,  'children'),
    ('Children Kyu 9 Orange',      'orange', 104, 4,  0,  'children'),
    ('Children Kyu 8 Green',       'green',  105, 4,  0,  'children'),
    ('Children Kyu 7 Purple',      'purple', 106, 6,  0,  'children'),
    ('Children Kyu 6 Blue',        'blue',   107, 6,  0,  'children'),
    ('Children Kyu 6 Blue Silver', 'blue',   108, 6,  0,  'children'),
    ('Children Kyu 5 Blue Gold',   'blue',   109, 6,  0,  'children'),
    ('Children Kyu 4 Brown',       'brown',  110, 10, 0,  'children'),
    ('Children Kyu 4 Brown Silver','brown',  111, 10, 0,  'children'),
    ('Children Kyu 3 Brown Gold',  'brown',  112, 8,  0,  'children'),
    ('Children Kyu 2 Black',       'black',  113, 10, 0,  'children'),
    ('Children Kyu 2 Black Silver','black',  114, 10, 0,  'children'),
    ('Children Kyu 1 Black Gold',  'black',  115, 9,  62, 'children'),
    ('Junior Dan',                 'black',  116, 9,  62, 'children')
ON CONFLICT (name) DO UPDATE SET
    colour = EXCLUDED.colour,
    min_months_at_rank = EXCLUDED.min_months_at_rank,
    min_classes_at_rank = EXCLUDED.min_classes_at_rank,
    ladder = EXCLUDED.ladder;

COMMIT;
