-- =====================================================================
-- 002_seed_reference_data.sql
-- Reference data every feature depends on. Safe for production.
-- Belt names, prices and requirements are PLACEHOLDERS – replace with
-- Aikido Shinjukai's real syllabus/fees in a later migration.
-- =====================================================================

BEGIN;

INSERT INTO centres (name, address) VALUES
    ('Bishan',     'Bishan Sports Hall, Singapore'),
    ('Jurong East', 'Jurong East Community Club, Singapore');

INSERT INTO belt_ranks (name, colour, rank_order, min_months_at_rank, min_classes_at_rank) VALUES
    ('Ungraded', 'white', 1, 0,  0),
    ('6th Kyu',  'white', 2, 3,  20),
    ('5th Kyu',  'white', 3, 3,  30),
    ('4th Kyu',  'white', 4, 4,  40),
    ('3rd Kyu',  'brown', 5, 6,  50),
    ('2nd Kyu',  'brown', 6, 6,  60),
    ('1st Kyu',  'brown', 7, 6,  70),
    ('Shodan',   'black', 8, 12, 100);

INSERT INTO belt_requirements (belt_rank_id, description, sort_order)
SELECT b.id, r.description, r.sort_order
FROM belt_ranks b
JOIN (VALUES
    ('6th Kyu', 'Ukemi: forward and backward rolls', 1),
    ('6th Kyu', 'Shomen-uchi ikkyo (omote and ura)', 2),
    ('5th Kyu', 'Katate-dori shiho-nage', 1),
    ('5th Kyu', 'Shomen-uchi irimi-nage', 2)
) AS r(belt, description, sort_order) ON r.belt = b.name;

INSERT INTO membership_plans (name, duration_months, price_cents, included_credits) VALUES
    ('Monthly',   1,  8000,  8),
    ('Quarterly', 3,  22000, 26),
    ('Annual',    12, 80000, 110);

INSERT INTO credit_packages (name, credits, price_cents) VALUES
    ('5 credits',  5,  5000),
    ('10 credits', 10, 9000);

COMMIT;
