-- =====================================================================
-- 013_timely_grading_syllabus.sql
-- The official grading syllabus, as belt_requirements rows.
-- Shown on the student's Grading page under "What you'll demonstrate".
--
-- Source: the Syllabus section of aikidoshinjukai.com.sg/grading-information
--   * Adult Grading Syllabus Blue (6th Kyu) to Dan, revised January 2021
--       -> 6th Kyu .. 1st Kyu, Shodan .. Yondan, and Junior Dan
--   * Children Grading Syllabus Part 1, Red (12th Kyu) to Blue (6th Kyu), Oct 2014
--   * Children Grading Syllabus Part 2, Blue-Silver to Black-Silver, Oct 2014
--
-- Each row is "Technique: what is tested", one row per filled cell of the
-- syllabus grid, in the grid's column order. The Grading page splits on the
-- first ": " to show the technique in bold. Notes printed in small italics
-- on the sheets (Omote, Ura, Static, "6 different throws" ...) are kept in
-- brackets.
--
-- Two technique names are spelt differently between the sheets, so one
-- spelling is used throughout: Tenchinage (adult sheet: "Techinage") and
-- Kotegaeshi (adult sheet: "Koteigashi", children's: "Kotegaishi").
-- Everything else is as printed.
--
-- Not covered by any published sheet, so left without rows: the two
-- Ungraded belts (nobody grades to them) and Children Kyu 1 Black Gold.
--
-- Replaces the four placeholder rows from 002_seed_reference_data.sql, which
-- did not match the real syllabus. Nothing references belt_requirements by
-- id, so the rows are simply deleted and re-inserted for every belt below.
-- Safe to run more than once: each run leaves exactly the same rows.
-- Stops with an error, and changes nothing, if any belt name below is
-- missing from belt_ranks (for example on a branch without migration 011).
-- =====================================================================

BEGIN;

CREATE TEMP TABLE syllabus (belt_name TEXT, sort_order INT, description TEXT) ON COMMIT DROP;

INSERT INTO syllabus (belt_name, sort_order, description) VALUES
-- ---------------------------------------------------------------------
-- Adults' Kyu grades
-- ---------------------------------------------------------------------
('6th Kyu', 1, 'Basics: Breakfalls, Movements, Attacks, Suwariwaza Kokyuho'),
('6th Kyu', 2, 'Ikkyo: Katatedori, Shomenuchi'),
('6th Kyu', 3, 'Iriminage: Katatedori, Shomenuchi'),
('6th Kyu', 4, 'Shihonage: Katatedori Aihanmi'),
('6th Kyu', 5, 'Kokyunage: Katatedori Gyakuhanmi'),
('6th Kyu', 6, 'Jiyuwaza: Katatedori Gyakuhanmi'),

('5th Kyu', 1, 'Ikkyo: Suwariwaza Katatedori, Suwariwaza Shomenuchi'),
('5th Kyu', 2, 'Nikyo: Katadori'),
('5th Kyu', 3, 'Iriminage: Suwariwaza Katatedori, Suwariwaza Shomenuchi'),
('5th Kyu', 4, 'Shihonage: Katatedori Gyakuhanmi, Yokomenuchi'),
('5th Kyu', 5, 'Kokyunage: Katatedori Aihanmi'),
('5th Kyu', 6, 'Tenchinage: Ryotedori'),
('5th Kyu', 7, 'Jujinage: Katatedori Aihanmi'),
('5th Kyu', 8, 'Jiyuwaza: Katatedori Aihanmi'),

('4th Kyu', 1, 'Nikyo: Suwariwaza Katadori, Tachiwaza + Suwariwaza Shomenuchi'),
('4th Kyu', 2, 'Sankyo: Suwariwaza Katadori, Tachiwaza + Suwariwaza Shomenuchi'),
('4th Kyu', 3, 'Yonkyo: Suwariwaza Katadori, Tachiwaza + Suwariwaza Shomenuchi'),
('4th Kyu', 4, 'Iriminage: Tsuki'),
('4th Kyu', 5, 'Shihonage: Ryotedori'),
('4th Kyu', 6, 'Kokyunage: Ryotedori'),
('4th Kyu', 7, 'Kotegaeshi: Katatedori, Shomenuchi, Tsuki'),
('4th Kyu', 8, 'Kaitennage: Katatedori (Uchi + Soto)'),
('4th Kyu', 9, 'Jujinage: Ryotedori'),
('4th Kyu', 10, 'Jiyuwaza: Ryotedori'),

('3rd Kyu', 1, 'Ikkyo: Tachiwaza + Suwariwaza Katadori'),
('3rd Kyu', 2, 'Sankyo: Tachiwaza + Suwariwaza Katadori'),
('3rd Kyu', 3, 'Yonkyo: Tachiwaza + Suwariwaza Katadori'),
('3rd Kyu', 4, 'Gokyo: Yokomenuchi'),
('3rd Kyu', 5, 'Shihonage: Hanmihandachi Katatedori Gyakuhanmi'),
('3rd Kyu', 6, 'Kokyunage: Yokomenuchi, Shomenuchi'),
('3rd Kyu', 7, 'Kaitennage: Shomenuchi'),
('3rd Kyu', 8, 'Jujinage: Yokomenuchi, Shomenuchi'),
('3rd Kyu', 9, 'Jiyuwaza: Morotedori'),
('3rd Kyu', 10, 'Tanto waza: Defence against Tanto attacks'),

('2nd Kyu', 1, 'Ikkyo: Yokomenuchi, Ushiro Ryotedori'),
('2nd Kyu', 2, 'Nikyo: Yokomenuchi, Ushiro Ryotedori'),
('2nd Kyu', 3, 'Sankyo: Yokomenuchi, Ushiro Ryotedori'),
('2nd Kyu', 4, 'Yonkyo: Yokomenuchi, Ushiro Ryotedori'),
('2nd Kyu', 5, 'Shihonage: Hanmihandachi Ryotedori, Hanmihandachi Morotedori'),
('2nd Kyu', 6, 'Kokyunage: Tsuki'),
('2nd Kyu', 7, 'Tenchinage: Tsuki'),
('2nd Kyu', 8, 'Kaitennage: Tsuki'),
('2nd Kyu', 9, 'Jujigarami: Morotedori'),
('2nd Kyu', 10, 'Koshinage: Katatedori'),
('2nd Kyu', 11, 'Jiyuwaza: Shomenuchi, Yokomenuchi, Tsuki, Ushiro Attacks'),
('2nd Kyu', 12, 'Jo waza: 7 Jo Suburi'),
('2nd Kyu', 13, 'Ken waza: 7 Ken Suburi, Defence against Bokken attacks'),

('1st Kyu', 1, 'Gokyo: Shomenuchi'),
('1st Kyu', 2, 'Iriminage: Yokomenuchi, Ushiro Ryotedori'),
('1st Kyu', 3, 'Shihonage: Shomenuchi, Ushiro Ryotedori'),
('1st Kyu', 4, 'Kokyunage: Ushiro Ryotedori'),
('1st Kyu', 5, 'Tenchinage: Yokomenuchi, Shomenuchi, Ushiro Ryotedori'),
('1st Kyu', 6, 'Kotegaeshi: Yokomenuchi, Ushiro Ryotedori'),
('1st Kyu', 7, 'Kaitennage: Yokomenuchi, Ushiro Ryotedori'),
('1st Kyu', 8, 'Jujinage: Ushiro Ryotedori'),
('1st Kyu', 9, 'Jujigarami: Ushiro Ryotedori'),
('1st Kyu', 10, 'Koshinage: Yokomenuchi, Shomenuchi'),
('1st Kyu', 11, 'Jiyuwaza: Hanmihandachi, 2 Attackers'),
('1st Kyu', 12, 'Jo waza: 31 Jo Kata, Defence against Jo attacks'),

-- ---------------------------------------------------------------------
-- Dan grades (adult sheet). The sheet prints "Candidate aged 50 & above
-- (by year) are to take 20 Ukemis" once across 1st to 4th Dan; it is
-- folded into each Ukemi line. Junior Dan is on the children's ladder in
-- belt_ranks (migration 011) but is graded on the adult sheet.
-- ---------------------------------------------------------------------
('Junior Dan', 1, 'Unarmed techniques: Tachiwaza, Suwariwaza & Hanmihandachi'),
('Junior Dan', 2, 'Ukemi: Take 20 Ukemis'),
('Junior Dan', 3, 'Scoring: Achieve a 3 points average on the scoring system'),

('Shodan', 1, 'Unarmed techniques: Tachiwaza, Suwariwaza, Hanmihandachi for all form of strikes, thrusts, grasping of shoulders, elbows, collar, wrists and hands from front & rear'),
('Shodan', 2, 'Ukemi: Take 30 Ukemis (candidates aged 50 & above take 20)'),
('Shodan', 3, 'Ki: Demonstrate unbendable arm'),
('Shodan', 4, 'Jiyuwaza: 3 Attackers'),
('Shodan', 5, 'Weapons: Defence against 3 Attackers with Jo, Bokken & Tanto'),
('Shodan', 6, 'Scoring: Achieve a 3 points average on the scoring system'),

('Nidan', 1, 'Unarmed techniques: Similar to 1st Dan, plus defence against kicks'),
('Nidan', 2, 'Ukemi: Take 30 Ukemis (candidates aged 50 & above take 20)'),
('Nidan', 3, 'Ki: Demonstrate relaxation and unable to be lifted by 1 person'),
('Nidan', 4, 'Jiyuwaza: 4 Attackers'),
('Nidan', 5, 'Jo waza: 24 Jo Kata'),
('Nidan', 6, 'Article: Submit an article on Aikido related subjects'),
('Nidan', 7, 'Scoring: Achieve a 6 points average on the scoring system'),

('Sandan', 1, 'Unarmed techniques: Similar to 2nd Dan'),
('Sandan', 2, 'Ukemi: Take 30 Ukemis (candidates aged 50 & above take 20)'),
('Sandan', 3, 'Ki: Demonstrate relaxation and unable to be lifted by 2 persons'),
('Sandan', 4, 'Jiyuwaza: 5 Attackers'),
('Sandan', 5, 'Jo waza: 24 Jo Kumitachi'),
('Sandan', 6, 'Ken waza: 5 Kumi Ken'),
('Sandan', 7, 'Article: Submit an article on Aikido related subjects'),
('Sandan', 8, 'Scoring: Achieve a 9 points average on the scoring system'),

('Yondan', 1, 'Unarmed techniques: Unarmed, Kaeshi & Henka (Counter & Change) techniques'),
('Yondan', 2, 'Ukemi: Take 30 Ukemis (candidates aged 50 & above take 20)'),
('Yondan', 3, 'Ki: Demonstrate understanding of KI extension, relaxation and show stable seiza'),
('Yondan', 4, 'Jiyuwaza: 6 Attackers'),
('Yondan', 5, 'Jo waza: 5 Kumi Jo'),
('Yondan', 6, 'Article: Submit an article on Aikido related subjects'),
('Yondan', 7, 'Scoring: Achieve a 12 points average on the scoring system'),

-- ---------------------------------------------------------------------
-- Children, Part 1: Red (12th Kyu) to Blue (6th Kyu)
-- ---------------------------------------------------------------------
('Children Kyu 12 Red', 1, 'Breakfall: Forward Roll, Rocking'),
('Children Kyu 12 Red', 2, 'Movement: Irimi-Tenkan, Tenkan'),
('Children Kyu 12 Red', 3, 'Attack: Katatedori Aihanmi'),
('Children Kyu 12 Red', 4, 'Ikkyo: Katatedori Aihanmi'),

('Children Kyu 11 Red Gold', 1, 'Breakfall: Back Roll'),
('Children Kyu 11 Red Gold', 2, 'Ki exercise: Kokyu Push'),
('Children Kyu 11 Red Gold', 3, 'Movement: Shikko'),
('Children Kyu 11 Red Gold', 4, 'Attack: Katatedori Gyakuhanmi'),
('Children Kyu 11 Red Gold', 5, 'Iriminage: Katatedori Aihanmi'),
('Children Kyu 11 Red Gold', 6, 'Kokyunage: Katatedori Gyakuhanmi'),
('Children Kyu 11 Red Gold', 7, 'Jiyuwaza: Katatedori Gyakuhanmi (Tenkan & throw)'),

('Children Kyu 10 Yellow', 1, 'Ki exercise: Rowing Exercise'),
('Children Kyu 10 Yellow', 2, 'Movement: Shikko (with movement Irimi + Tenkan)'),
('Children Kyu 10 Yellow', 3, 'Ikkyo: Suwariwaza Katatedori Aihanmi'),
('Children Kyu 10 Yellow', 4, 'Iriminage: Suwariwaza Katatedori Aihanmi'),
('Children Kyu 10 Yellow', 5, 'Jiyuwaza: Katatedori Gyakuhanmi (2 different throws)'),
('Children Kyu 10 Yellow', 6, 'Kokyuho: Suwariwaza'),

('Children Kyu 9 Orange', 1, 'Attack: Shomenuchi, Yokomenuchi'),
('Children Kyu 9 Orange', 2, 'Ikkyo: Shomenuchi'),
('Children Kyu 9 Orange', 3, 'Iriminage: Shomenuchi'),
('Children Kyu 9 Orange', 4, 'Shihonage: Katatedori Aihanmi (Omote)'),
('Children Kyu 9 Orange', 5, 'Jiyuwaza: Katatedori Gyakuhanmi (4 different throws)'),

('Children Kyu 8 Green', 1, 'Breakfall: Forward Roll (over obstacles)'),
('Children Kyu 8 Green', 2, 'Ikkyo: Suwariwaza Shomenuchi'),
('Children Kyu 8 Green', 3, 'Nikyo: Katatedori Aihanmi (Static)'),
('Children Kyu 8 Green', 4, 'Iriminage: Suwariwaza Shomenuchi'),
('Children Kyu 8 Green', 5, 'Shihonage: Katatedori Aihanmi (Ura)'),
('Children Kyu 8 Green', 6, 'Kokyunage: Katatedori Aihanmi'),
('Children Kyu 8 Green', 7, 'Kotegaeshi: Katatedori Aihanmi (Static)'),
('Children Kyu 8 Green', 8, 'Jujinage: Katatedori Aihanmi'),
('Children Kyu 8 Green', 9, 'Jiyuwaza: Katatedori Aihanmi (2 different throws)'),

('Children Kyu 7 Purple', 1, 'Movement: Katatedori Gyakuhanmi (Tenkan)'),
('Children Kyu 7 Purple', 2, 'Ikkyo: Katatedori Gyakuhanmi (show Ikkyo finishing lock)'),
('Children Kyu 7 Purple', 3, 'Nikyo: Katatedori Gyakuhanmi (Static)'),
('Children Kyu 7 Purple', 4, 'Iriminage: Katatedori Gyakuhanmi'),
('Children Kyu 7 Purple', 5, 'Shihonage: Katatedori Gyakuhanmi (Omote)'),
('Children Kyu 7 Purple', 6, 'Kotegaeshi: Katatedori Gyakuhanmi (Static)'),
('Children Kyu 7 Purple', 7, 'Jiyuwaza: Katatedori Gyakuhanmi (6 different throws)'),

('Children Kyu 6 Blue', 1, 'Movement: Katadori (Irimi-Tenkan + side-step cut)'),
('Children Kyu 6 Blue', 2, 'Nikyo: Katadori (Static)'),
('Children Kyu 6 Blue', 3, 'Shihonage: Katatedori Gyakuhanmi (Ura)'),
('Children Kyu 6 Blue', 4, 'Tenchinage: Ryotedori (Omote)'),
('Children Kyu 6 Blue', 5, 'Jiyuwaza: Katatedori Gyakuhanmi (8 different throws)'),
('Children Kyu 6 Blue', 6, 'Jo waza: Morotedori (Nage holding Jo, 2 basic throws)'),

-- ---------------------------------------------------------------------
-- Children, Part 2: Blue-Silver (6th Kyu) to Black-Silver (2nd Kyu).
-- The sheet's heading says this part ADDS ON to Part 1.
-- ---------------------------------------------------------------------
('Children Kyu 6 Blue Silver', 1, 'Movement: Yokomenuchi (Irimi-Tenkan)'),
('Children Kyu 6 Blue Silver', 2, 'Nikyo: Katadori (Omote)'),
('Children Kyu 6 Blue Silver', 3, 'Sankyo: Katatedori Aihanmi (Omote)'),
('Children Kyu 6 Blue Silver', 4, 'Yonkyo: Katatedori Aihanmi (Omote)'),
('Children Kyu 6 Blue Silver', 5, 'Shihonage: Yokomenuchi (Omote)'),
('Children Kyu 6 Blue Silver', 6, 'Tenchinage: Ryotedori (Ura)'),
('Children Kyu 6 Blue Silver', 7, 'Jiyuwaza: Katatedori Aihanmi (6 different throws)'),
('Children Kyu 6 Blue Silver', 8, 'Jo waza: Morotedori (Nage holding Jo, 4 basic throws)'),

('Children Kyu 5 Blue Gold', 1, 'Nikyo: Katadori (Ura)'),
('Children Kyu 5 Blue Gold', 2, 'Sankyo: Katatedori Aihanmi (Ura)'),
('Children Kyu 5 Blue Gold', 3, 'Yonkyo: Katatedori Aihanmi (Ura)'),
('Children Kyu 5 Blue Gold', 4, 'Shihonage: Yokomenuchi (Ura)'),
('Children Kyu 5 Blue Gold', 5, 'Jiyuwaza: Katatedori Aihanmi (8 different throws)'),
('Children Kyu 5 Blue Gold', 6, 'Jo waza: Defence against Jo Tsuki attacks (2 basic defence)'),

('Children Kyu 4 Brown', 1, 'Movement: Ryotedori (Irimi-Tenkan)'),
('Children Kyu 4 Brown', 2, 'Nikyo: Suwariwaza Katadori'),
('Children Kyu 4 Brown', 3, 'Sankyo: Suwariwaza Katatedori Aihanmi'),
('Children Kyu 4 Brown', 4, 'Yonkyo: Suwariwaza Katatedori Aihanmi'),
('Children Kyu 4 Brown', 5, 'Iriminage: Tsuki'),
('Children Kyu 4 Brown', 6, 'Shihonage: Ryotedori'),
('Children Kyu 4 Brown', 7, 'Kokyunage: Ryotedori'),
('Children Kyu 4 Brown', 8, 'Kotegaeshi: Katatedori Gyakuhanmi, Tsuki'),
('Children Kyu 4 Brown', 9, 'Kaitennage: Katatedori Gyakuhanmi (Uchi + Soto)'),
('Children Kyu 4 Brown', 10, 'Jujinage: Ryotedori'),
('Children Kyu 4 Brown', 11, 'Jiyuwaza: Ryotedori'),
('Children Kyu 4 Brown', 12, 'Ken waza: 1 to 3 of 7 Ken Suburi'),

('Children Kyu 4 Brown Silver', 1, 'Movement: Morotedori (Tenkan)'),
('Children Kyu 4 Brown Silver', 2, 'Nikyo: Tachiwaza + Suwariwaza Shomenuchi'),
('Children Kyu 4 Brown Silver', 3, 'Sankyo: Tachiwaza + Suwariwaza Shomenuchi'),
('Children Kyu 4 Brown Silver', 4, 'Yonkyo: Tachiwaza + Suwariwaza Shomenuchi'),
('Children Kyu 4 Brown Silver', 5, 'Iriminage: Morotedori'),
('Children Kyu 4 Brown Silver', 6, 'Kokyunage: Morotedori'),
('Children Kyu 4 Brown Silver', 7, 'Kotegaeshi: Katatedori Aihanmi, Shomenuchi'),
('Children Kyu 4 Brown Silver', 8, 'Kaitennage: Katatedori Aihanmi (Uchi + Soto)'),
('Children Kyu 4 Brown Silver', 9, 'Jiyuwaza: Morotedori'),
('Children Kyu 4 Brown Silver', 10, 'Ken waza: 1 to 5 of 7 Ken Suburi'),

('Children Kyu 3 Brown Gold', 1, 'Ikkyo: Yokomenuchi'),
('Children Kyu 3 Brown Gold', 2, 'Nikyo: Yokomenuchi'),
('Children Kyu 3 Brown Gold', 3, 'Sankyo: Yokomenuchi'),
('Children Kyu 3 Brown Gold', 4, 'Yonkyo: Yokomenuchi'),
('Children Kyu 3 Brown Gold', 5, 'Gokyo: Yokomenuchi'),
('Children Kyu 3 Brown Gold', 6, 'Shihonage: Hanmihandachi Katatedori Gyakuhanmi'),
('Children Kyu 3 Brown Gold', 7, 'Kokyunage: Yokomenuchi, Shomenuchi'),
('Children Kyu 3 Brown Gold', 8, 'Kaitennage: Shomenuchi'),
('Children Kyu 3 Brown Gold', 9, 'Jujinage: Yokomenuchi, Shomenuchi'),
('Children Kyu 3 Brown Gold', 10, 'Jiyuwaza: Yokomenuchi'),
('Children Kyu 3 Brown Gold', 11, 'Ken waza: 7 Ken Suburi'),

('Children Kyu 2 Black', 1, 'Ikkyo: Ushiro Ryotedori'),
('Children Kyu 2 Black', 2, 'Nikyo: Ushiro Ryotedori'),
('Children Kyu 2 Black', 3, 'Sankyo: Ushiro Ryotedori'),
('Children Kyu 2 Black', 4, 'Yonkyo: Ushiro Ryotedori'),
('Children Kyu 2 Black', 5, 'Shihonage: Hanmihandachi Ryotedori, Hanmihandachi Morotedori'),
('Children Kyu 2 Black', 6, 'Kokyunage: Tsuki'),
('Children Kyu 2 Black', 7, 'Tenchinage: Tsuki'),
('Children Kyu 2 Black', 8, 'Kaitennage: Tsuki'),
('Children Kyu 2 Black', 9, 'Jiyuwaza: Shomenuchi, Tsuki'),
('Children Kyu 2 Black', 10, 'Jo waza: 1 to 3 of 7 Jo Suburi'),

('Children Kyu 2 Black Silver', 1, 'Gokyo: Shomenuchi'),
('Children Kyu 2 Black Silver', 2, 'Iriminage: Yokomenuchi'),
('Children Kyu 2 Black Silver', 3, 'Shihonage: Yokomenuchi'),
('Children Kyu 2 Black Silver', 4, 'Tenchinage: Yokomenuchi'),
('Children Kyu 2 Black Silver', 5, 'Kotegaeshi: Yokomenuchi'),
('Children Kyu 2 Black Silver', 6, 'Jiyuwaza: Ushiro attacks'),
('Children Kyu 2 Black Silver', 7, 'Jo waza: 1 to 5 of 7 Jo Suburi');

-- Stop before changing anything if a belt above doesn't exist here, rather
-- than silently skipping its syllabus.
DO $$
DECLARE missing TEXT;
BEGIN
  SELECT string_agg(DISTINCT s.belt_name, ', ') INTO missing
  FROM syllabus s
  WHERE NOT EXISTS (SELECT 1 FROM belt_ranks b WHERE b.name = s.belt_name);
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'belt_ranks has no belt named: %. Run migrations 001 to 011 first.', missing;
  END IF;
END $$;

-- Replace, belt by belt, only the belts this file covers.
DELETE FROM belt_requirements
WHERE belt_rank_id IN (
  SELECT b.id FROM belt_ranks b WHERE b.name IN (SELECT DISTINCT belt_name FROM syllabus)
);

INSERT INTO belt_requirements (belt_rank_id, description, sort_order)
SELECT b.id, s.description, s.sort_order
FROM syllabus s
JOIN belt_ranks b ON b.name = s.belt_name;

COMMIT;

-- ---------------------------------------------------------------------
-- Check it worked: 25 belts, 198 rows.
-- ---------------------------------------------------------------------
-- SELECT b.name, COUNT(*) AS items
-- FROM belt_requirements r JOIN belt_ranks b ON b.id = r.belt_rank_id
-- GROUP BY b.name, b.rank_order ORDER BY b.rank_order;
