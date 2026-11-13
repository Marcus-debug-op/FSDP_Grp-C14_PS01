-- 012_lesson_offers_and_cover_requests.sql
-- Run once after 011. Safe to run more than once. Only adds tables and one notice type.
--
-- lesson_offers: the admin offers a lesson to an instructor, who accepts or declines.
--   Used for private lessons (private_lesson_id) and for covering a group class
--   (session_id). Exactly one of the two is set. Only one offer per lesson can be
--   waiting at a time; a newer offer withdraws the older one.
-- cover_requests: an instructor asks to be covered for a group class
--   (at least 12 hours before it starts, checked in code).
--
-- Who writes what:
--   admin pages: create offers (lessonOfferModel.createOffer), mark a cover request
--   cancelled when the lesson is cancelled.
--   instructor pages: create cover requests, accept or decline offers. On accepting
--   a cover offer, set class_sessions.instructor_id to the new instructor and mark
--   the cover request covered.

BEGIN;

CREATE TABLE IF NOT EXISTS lesson_offers (
    id                 SERIAL PRIMARY KEY,
    session_id         INTEGER REFERENCES class_sessions(id) ON DELETE CASCADE,
    private_lesson_id  INTEGER REFERENCES private_lessons(id) ON DELETE CASCADE,
    instructor_id      INTEGER NOT NULL REFERENCES users(id),
    offered_by         INTEGER REFERENCES users(id),
    status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
    response_note      TEXT,
    offered_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at       TIMESTAMPTZ,
    CHECK ((session_id IS NULL) <> (private_lesson_id IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lesson_offers_pending_session
    ON lesson_offers (session_id) WHERE status = 'pending' AND session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_lesson_offers_pending_private
    ON lesson_offers (private_lesson_id) WHERE status = 'pending' AND private_lesson_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lesson_offers_instructor ON lesson_offers (instructor_id, status);

CREATE TABLE IF NOT EXISTS cover_requests (
    id             SERIAL PRIMARY KEY,
    session_id     INTEGER NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    instructor_id  INTEGER NOT NULL REFERENCES users(id),
    reason         TEXT NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'covered', 'cancelled')),
    requested_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at    TIMESTAMPTZ,
    resolved_by    INTEGER REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cover_requests_open_session
    ON cover_requests (session_id) WHERE status = 'open';

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'welcome', 'booking_confirmed', 'payment_received', 'grading_eligible', 'grading_update',
  'attendance_follow_up', 'lesson_cancelled', 'lesson_moved', 'private_lesson',
  'lesson_offer', 'cover_request'
));

COMMIT;
