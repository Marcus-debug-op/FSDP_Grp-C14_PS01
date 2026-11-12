-- =====================================================================
-- dev_branch_classes_sample_data.sql  – DEV / TEST BRANCHES ONLY, never production.
-- Run after dev_instructor_sample_data.sql. Safe to run more than once.
--
-- REAL: every branch dojo class time on the Our Dojos page that
--       dev_instructor_sample_data.sql does not already add.
-- SAMPLE: the instructors. The site names no instructors for branch dojos,
--       so these are spread across the HQ instructors with no clashes:
--       nobody teaches two classes at once, and there is at least 60 minutes
--       between classes at different dojos on the same day.
-- Classes already added for the instructor test account are not changed.
-- =====================================================================

BEGIN;

INSERT INTO classes (title, centre_id, instructor_id, day_of_week, start_time, end_time)
SELECT v.title, c.id, u.id, v.dow, v.st::time, v.et::time
FROM (VALUES
    ('Children Class', 'AGORA Colearning', 'bob.tan@ask-sample.test', 2, '16:30', '17:30'),
    ('Children Class', 'AGORA Colearning', 'alexander.lee@ask-sample.test', 5, '15:15', '16:15'),
    ('Mixed Class', 'ActiveSG Bedok Dojo', 'elaine.ong@ask-sample.test', 0, '09:00', '10:00'),
    ('Mixed Class', 'ActiveSG Bedok Dojo', 'elaine.ong@ask-sample.test', 0, '10:15', '11:15'),
    ('Mixed Class', 'ActiveSG Bedok Dojo', 'elaine.ong@ask-sample.test', 0, '11:30', '12:30'),
    ('Mixed Class', 'ActiveSG Jurong East Dojo', 'alexander.lee@ask-sample.test', 0, '14:45', '15:45'),
    ('Mixed Class', 'ActiveSG Seng Kang Dojo', 'mun.kit@ask-sample.test', 0, '13:30', '14:30'),
    ('Mixed Class', 'ActiveSG Seng Kang Dojo', 'mun.kit@ask-sample.test', 0, '14:45', '15:45'),
    ('Mixed Class', 'ActiveSG Woodlands Dojo', 'aloyseus.lee@ask-sample.test', 0, '09:00', '10:00'),
    ('Mixed Class', 'ActiveSG Woodlands Dojo', 'aloyseus.lee@ask-sample.test', 0, '10:15', '11:15'),
    ('Mixed Class', 'ActiveSG Yio Chu Kang Dojo', 'ronald.tan@ask-sample.test', 6, '16:00', '17:00'),
    ('Mixed Class', 'ActiveSG Yio Chu Kang Dojo', 'ronald.tan@ask-sample.test', 6, '17:15', '18:15'),
    ('Adult Class', 'Alexandra Retail Centre Dojo', 'mark.lim@ask-sample.test', 4, '12:00', '13:00'),
    ('Mixed Class', 'Bukit Timah Dojo', 'james.tan@ask-sample.test', 6, '16:00', '17:15'),
    ('Children Class', 'Cheng San Dojo', 'mun.kit@ask-sample.test', 6, '10:00', '11:00'),
    ('Mixed Class', 'Chong Pang Dojo', 'james.tan@ask-sample.test', 0, '11:00', '12:00'),
    ('Mixed Class', 'Chua Chu Kang Dojo', 'bob.tan@ask-sample.test', 6, '16:30', '17:30'),
    ('Children Class', 'Ci Yuan Dojo', 'robin.tan@ask-sample.test', 6, '15:00', '16:00'),
    ('Adult Class', 'Ci Yuan Dojo', 'philip.lee@ask-sample.test', 6, '15:00', '16:15'),
    ('Children Class', 'Civil Service Club (Bukit Batok) Dojo', 'bob.tan@ask-sample.test', 0, '10:00', '11:00'),
    ('Children Class', 'EtonHouse International School Sentosa Dojo', 'mun.kit@ask-sample.test', 5, '15:00', '16:00'),
    ('Children Class', 'EtonHouse Pre-School Robertson Walk Dojo', 'philip.lee@ask-sample.test', 1, '15:00', '17:00'),
    ('Children Class', 'Etonhouse International School Dojo', 'alexander.lee@ask-sample.test', 3, '15:30', '16:30'),
    ('Children Class', 'HomeTeamNS Bukit Batok Dojo', 'aloyseus.lee@ask-sample.test', 6, '14:30', '15:30'),
    ('Adult Class', 'HomeTeamNS Bukit Batok Dojo', 'annie.goh@ask-sample.test', 6, '14:30', '15:45'),
    ('Mixed Class', 'HomeTeamNS Khatib Dojo', 'james.tan@ask-sample.test', 6, '11:00', '12:00'),
    ('Mixed Class', 'Japanese Association Dojo', 'tan.kok.hiang@ask-sample.test', 6, '12:00', '13:30'),
    ('Mixed Class', 'Nanyang Polytechnic Dojo', 'annie.goh@ask-sample.test', 3, '18:00', '20:30'),
    ('Mixed Class', 'National Service Resort & Country Club Dojo', 'ronald.tan@ask-sample.test', 0, '15:00', '16:15'),
    ('Children Class', 'Orchid Country Club Dojo', 'elaine.ong@ask-sample.test', 6, '15:00', '16:00'),
    ('Adult Class', 'Orchid Country Club Dojo', 'mark.lim@ask-sample.test', 6, '15:00', '16:15'),
    ('Children Class', 'Our Tampines Hub Dojo', 'robin.tan@ask-sample.test', 1, '19:30', '20:30'),
    ('Children Class', 'Paya Lebar Kovan Dojo', 'robin.tan@ask-sample.test', 4, '20:00', '21:00'),
    ('Adult Class', 'Paya Lebar Kovan Dojo', 'aloyseus.lee@ask-sample.test', 4, '20:00', '21:15'),
    ('Mixed Class', 'Punggol 21 Dojo', 'annie.goh@ask-sample.test', 1, '19:30', '20:30'),
    ('Mixed Class', 'Republic Polytechnic Dojo', 'ronald.tan@ask-sample.test', 5, '15:00', '16:30'),
    ('Adult Class', 'SAFRA Toa Payoh Dojo', 'nicholas.lee@ask-sample.test', 6, '20:00', '21:00'),
    ('Adult Class', 'SMU Dojo', 'philip.lee@ask-sample.test', 5, '20:30', '22:00'),
    ('Children Class', 'Senja-Cashew Community Club Dojo', 'annie.goh@ask-sample.test', 4, '20:00', '21:00'),
    ('Adult Class', 'Senja-Cashew Community Club Dojo', 'james.tan@ask-sample.test', 4, '20:00', '21:15'),
    ('Mixed Class', 'Siglap South Dojo', 'bob.tan@ask-sample.test', 1, '20:00', '21:15'),
    ('Children Class', 'Tanjong Pagar Dojo', 'nicholas.lee@ask-sample.test', 2, '20:00', '21:00'),
    ('Adult Class', 'Tanjong Pagar Dojo', 'alexander.lee@ask-sample.test', 2, '20:00', '21:15'),
    ('Children Class', 'The Frontier Dojo', 'mark.lim@ask-sample.test', 5, '19:00', '20:00'),
    ('Mixed Class', 'The Singapore Island Country Club Dojo', 'tan.kok.hiang@ask-sample.test', 0, '14:30', '15:30'),
    ('Adult Class', 'West Coast Dojo', 'tan.kok.hiang@ask-sample.test', 6, '16:00', '17:15'),
    ('Children Class', 'West Coast Dojo', 'alexander.lee@ask-sample.test', 6, '16:00', '17:00')
) AS v(title, centre, email, dow, st, et)
JOIN centres c ON c.name = v.centre
JOIN users u ON u.email = v.email
WHERE NOT EXISTS (
    SELECT 1 FROM classes x
    WHERE x.centre_id = c.id AND x.title = v.title
      AND x.day_of_week = v.dow AND x.start_time = v.st::time
);

-- Sessions for these classes, today to 3 weeks ahead, in Singapore time
INSERT INTO class_sessions (class_id, session_date, start_time, end_time, instructor_id, status)
SELECT cl.id, g::date, cl.start_time, cl.end_time, cl.instructor_id, 'scheduled'
FROM classes cl
JOIN centres ce ON ce.id = cl.centre_id
JOIN users u ON u.id = cl.instructor_id
CROSS JOIN LATERAL generate_series(
    (NOW() AT TIME ZONE 'Asia/Singapore')::date,
    (NOW() AT TIME ZONE 'Asia/Singapore')::date + 21,
    INTERVAL '1 day') AS g
WHERE ce.name <> 'ASK Headquarters Dojo'
  AND u.email LIKE '%@ask-sample.test'
  AND cl.is_active
  AND EXTRACT(DOW FROM g) = cl.day_of_week
ON CONFLICT (class_id, session_date) DO NOTHING;

COMMIT;
