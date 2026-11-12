-- 011 (qj): lesson changes and student notices.
-- FSDP-56 (lesson cancelled or moved), FSDP-47 / FSDP-53 (confirmation emails),
-- FSDP-54 (1-on-1 sessions).
--
-- class_sessions is qj's table (see DATABASE.md).
-- notifications comes from 003_aswin_instructor_tables.sql: this only adds new
-- allowed values to its type list. No existing rows or columns change.
-- Safe to run more than once.

-- A single session can move to another dojo for the day without changing the
-- weekly class. NULL means it runs at the class's usual dojo.
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS centre_id INTEGER REFERENCES centres(id);
-- Why the session was cancelled or moved, shown to students.
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS change_note TEXT;
-- When it was last cancelled or moved.
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ;

-- New notice types: a lesson was cancelled, a lesson moved dojo,
-- and updates about a 1-on-1 session.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'welcome', 'booking_confirmed', 'payment_received', 'grading_eligible', 'grading_update',
  'attendance_follow_up', 'lesson_cancelled', 'lesson_moved', 'private_lesson'
));
