-- =====================================================================
-- 004_aswin_real_reference_data.sql
-- Replaces the placeholder centres and belt rules from 002 with the
-- published data on aikidoshinjukai.com.sg (Our Dojos, Grading Information).
-- Safe for production and safe to run more than once.
--
-- Belts follow the adult ladder only. The site's children's ladder has
-- different grades, so it needs a schema decision first.
-- Membership plans and credit packages are not changed here.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Centres
-- ---------------------------------------------------------------------

-- The two placeholders become the real dojos, so existing rows keep their ids.
UPDATE centres SET name = 'ActiveSG Bishan Dojo', address = '5 Bishan Street 14, Singapore 579783'
WHERE name = 'Bishan';

UPDATE centres SET name = 'ActiveSG Jurong East Dojo', address = '21 Jurong East Street 31, Singapore 609517'
WHERE name = 'Jurong East';

INSERT INTO centres (name, address, is_active) VALUES
    ('ASK Headquarters Dojo', 'Thomson V One, 9 Sin Ming Road, #B1-02, Singapore 575630', TRUE),
    ('ActiveSG Bedok Dojo', 'Heartbeat@Bedok, 11 Bedok North Street 1 #01-02, Singapore 469662', TRUE),
    ('Bedok Community Centre Dojo', 'Bedok Community Centre, 850 New Upper Changi Rd, Singapore 467352', FALSE),
    ('Etonhouse International School Dojo', '51 Broadrick Rd, Singapore 439501', TRUE),
    ('Kampong Kembangan Community Club Dojo', '5 Lengkong Tiga, Singapore 417408', FALSE),
    ('MacPherson Community Club Dojo', '400 Paya Lebar Way, Singapore 379131', FALSE),
    ('Marine Parade Dojo', '278 Marine Parade Rd, Singapore 449282', FALSE),
    ('National Service Resort & Country Club Dojo', '10 Changi Coast Walk, Singapore 499739', TRUE),
    ('Our Tampines Hub Dojo', '1 Tampines Walk, Singapore 528523', TRUE),
    ('Paya Lebar Kovan Dojo', '207 Hougang Street 21, Singapore 530207', TRUE),
    ('Rivervale Dojo', 'Rivervale Mall, 11 Rivervale Cres, Singapore 545082', TRUE),
    ('ActiveSG Seng Kang Dojo', '57 Anchorvale Rd, Singapore 544964', TRUE),
    ('Siglap South Dojo', '6 Palm Rd, Singapore 456441', TRUE),
    ('Tampines West Dojo', '5 Tampines Ave 3, Singapore 529705', FALSE),
    ('Bukit Timah Dojo', 'Bukit Timah Community Club, 20 Toh Yi Dr, Singapore 596569', TRUE),
    ('Cheng San Dojo', '6 Ang Mo Kio Street 53, Singapore 569205', TRUE),
    ('EtonHouse Pre-School Robertson Walk Dojo', '11 Unity St, #02-20, Singapore 237995', TRUE),
    ('Japanese Association Dojo', '120 Adam Rd, Singapore 289899', TRUE),
    ('The Singapore Island Country Club Dojo', '240 Sime Rd, Singapore 288303', TRUE),
    ('SMU Dojo', 'Singapore Management University, 81 Victoria St, Singapore 188065', TRUE),
    ('SAFRA Toa Payoh Dojo', '293 Lor 6 Toa Payoh, Singapore 319387', TRUE),
    ('Thomson Dojo', '233 Bishan Street 22, Singapore 570233', TRUE),
    ('ActiveSG Yio Chu Kang Dojo', '200 Ang Mo Kio Ave 9, Singapore 569770', TRUE),
    ('AGORA Colearning', '1 Maritime Square, HarbourFront Centre, #04-01, Singapore 099253', TRUE),
    ('EtonHouse International School Sentosa Dojo', '33 Allanbrooke Rd, Singapore 099981', TRUE),
    ('Tanjong Pagar Dojo', 'Tanjong Pagar Community Club, 101 Cantonment Rd, Singapore 089774', TRUE),
    ('Alexandra Retail Centre Dojo', '460 Alexandra Road #03-02, Singapore 119963', TRUE),
    ('Civil Service Club (Bukit Batok) Dojo', '91 Bukit Batok West Ave 2, Singapore 659206', TRUE),
    ('Gek Poh Dojo', 'Gek Poh Ville Community Club, 1 Jurong West Street 74, Singapore 649149', FALSE),
    ('HomeTeamNS Bukit Batok Dojo', 'HomeTeamNS @ Bukit Batok, Singapore 659003', TRUE),
    ('The Frontier Dojo', '665a Jurong West Street 65, Singapore 641665', TRUE),
    ('West Coast Dojo', '2 Clementi West Street 2, Singapore 129605', TRUE),
    ('Chua Chu Kang Dojo', '35 Teck Whye Ave, Singapore 688892', TRUE),
    ('Chong Pang Dojo', '109 Yishun Ring Rd, Singapore 760109', TRUE),
    ('Fu Chun Dojo', 'Temporarily at Woodgrove Zone 10 RN, Blk 310 Link Hall', FALSE),
    ('HomeTeamNS Khatib Dojo', '2 Yishun Walk, Singapore 767944', TRUE),
    ('Nanyang Polytechnic Dojo', '180 Ang Mo Kio Ave 8, Singapore 569830', TRUE),
    ('Orchid Country Club Dojo', '1 Orchid Club Rd, Singapore 769162', TRUE),
    ('Republic Polytechnic Dojo', '9 Woodlands Ave 9, Singapore 738964', TRUE),
    ('ActiveSG Woodlands Dojo', '2 Woodlands Street 12, Singapore 738599', TRUE),
    ('Ci Yuan Dojo', '51 Hougang Ave 9, Singapore 538776', TRUE),
    ('Punggol 21 Dojo', '80 Punggol Field, Singapore 828815', TRUE),
    ('Senja-Cashew Community Club Dojo', '101 Bukit Panjang Rd, Singapore 679910', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------
-- Belts: months and classes needed to grade INTO each rank.
-- The site gives no minimum months for 5th and 4th Kyu, only sessions.
-- ---------------------------------------------------------------------

UPDATE belt_ranks b
SET colour = v.colour, min_months_at_rank = v.months, min_classes_at_rank = v.classes
FROM (VALUES
    ('6th Kyu', 'blue',  3, 20),
    ('5th Kyu', 'blue',  0, 24),
    ('4th Kyu', 'brown', 0, 32),
    ('3rd Kyu', 'brown', 6, 36),
    ('2nd Kyu', 'black', 6, 56),
    ('1st Kyu', 'black', 9, 62),
    ('Shodan',  'black', 9, 70)
) AS v(name, colour, months, classes)
WHERE b.name = v.name;

INSERT INTO belt_ranks (name, colour, rank_order, min_months_at_rank, min_classes_at_rank) VALUES
    ('Nidan',  'black', 9,  18, 150),
    ('Sandan', 'black', 10, 30, 240),
    ('Yondan', 'black', 11, 42, 400)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------
-- Upcoming gradings from the 2026 calendar.
-- The site gives the dates but not the venue or time, so HQ and 10:00
-- are PLACEHOLDERS.
-- ---------------------------------------------------------------------

INSERT INTO grading_sessions (centre_id, grading_date, start_time, registration_closes_on)
SELECT c.id, v.grading_date::date, '10:00', v.closes_on::date
FROM centres c
CROSS JOIN (VALUES
    ('2026-12-06', '2026-11-22'),   -- children
    ('2026-12-13', '2026-11-29')    -- adults
) AS v(grading_date, closes_on)
WHERE c.name = 'ASK Headquarters Dojo'
  AND NOT EXISTS (
      SELECT 1 FROM grading_sessions g WHERE g.grading_date = v.grading_date::date
  );

COMMIT;
