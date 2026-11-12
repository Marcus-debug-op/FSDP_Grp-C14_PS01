# Database guide – Aikido Shinjukai SMS (Neon Postgres)

Read this before adding or changing any table. If everyone follows it,
our pieces will fit together when we combine them.

## 1. Formatting rules (copied from the existing `users` table)

| Thing | Rule | Example |
|---|---|---|
| Table names | plural, snake_case | `grading_applications` |
| Column names | snake_case | `belt_awarded_on` |
| Primary key | `id SERIAL PRIMARY KEY` | |
| Foreign key | `<thing>_id INTEGER REFERENCES <table>(id)` | `plan_id` |
| FK to a person | name it after their role, always points at `users(id)` | `student_id`, `instructor_id`, `examiner_id` |
| Names / titles | `VARCHAR(100)` | |
| Emails, URLs, addresses, Stripe IDs | `VARCHAR(255)` | |
| Status / type values | `VARCHAR(20)` + `CHECK (x IN (...))`, lowercase snake_case values | `'pending'`, `'credit_topup'` |
| Long free text | `TEXT` | `note`, `remarks` |
| Yes/no | `BOOLEAN`, prefix `is_` | `is_active` |
| Timestamps | `TIMESTAMPTZ NOT NULL DEFAULT NOW()`, suffix `_at` | `created_at`, `applied_at` |
| Calendar dates | `DATE`, suffix `_on` or `_date` | `belt_awarded_on`, `grading_date` |
| Time of day | `TIME` | `start_time` |
| Money | `INTEGER` in cents, suffix `_cents`, plus `currency` `'sgd'` | `8000` = S$80.00 |
| Every table | has `created_at`, and `updated_at` if rows get edited | |

Things **not** to do: no camelCase columns, no `DECIMAL`/`FLOAT` for money,
no stored "balance" or "count" columns that someone else's code must keep in sync,
no new user/student table (use `users` + `student_profiles`).

Days of the week are `0 = Sunday … 6 = Saturday`, the same as JavaScript `getDay()`.

## 2. Who owns which table

Only change tables you own. Changes to a SHARED table need the team's agreement first.

| Owner | Tables |
|---|---|
| Marcus (auth) | `users` |
| **SHARED** | `centres`, `belt_ranks`, `student_profiles` |
| qj – lessons, attendance, payments | `classes`, `class_sessions`, `bookings`, `attendance`, `payments` |
| Membership / belt / grading teammate | `membership_plans`, `memberships`, `credit_packages`, `credit_transactions`, `belt_requirements`, `progress_notes`, `grading_sessions`, `grading_applications` |

Instructor-side attendance (roster) also writes to `attendance`. Use `method = 'manual'` and fill `recorded_by`.

## 3. Where our features touch (agree these, don't guess)

**Payments (renew membership, top up credits, grading fee)**
- All Stripe charges go through qj's payment code and land in `payments`.
  Don't call Stripe directly from membership or grading code.
- Flow:
  1. Membership code asks payments to start a checkout with `{ studentId, purpose, amountCents }`,
     where `purpose` is one of `'membership' | 'credit_topup' | 'grading_fee'`.
  2. A `payments` row is created with `status = 'pending'`.
  3. The Stripe webhook marks it `succeeded` or `failed`.
  4. On `succeeded`, the webhook calls the membership side, which then:
     - inserts the `memberships` row with `payment_id`, or
     - inserts a `credit_transactions` row with `reason = 'topup'` and `payment_id`.
- Agree the exact function names for step 4 before writing either side.

**Credits**
- There's no balance column. A student's balance is `SELECT SUM(change) FROM credit_transactions WHERE student_id = $1`.
- Only ever INSERT ledger rows, never UPDATE or DELETE them.
- The membership fee only makes someone a member. It includes no credits
  (`membership_plans.included_credits` is always 0). Students buy credits
  separately, and 1 credit = 1 lesson. Booking needs an active membership
  AND a balance of at least 1.
- Who writes which `reason`:

  | reason | Written by | change |
  |---|---|---|
  | `topup` | membership teammate | + |
  | `membership_grant` | not used: the membership fee includes no lessons | + |
  | `adjustment` | membership teammate | + or − |
  | `booking` | qj, when a class is booked | − `credit_cost` |
  | `booking_refund` | qj, when a booking is cancelled | + |

**Cancelled or moved lessons (migration 011)**
- A single session can move to another dojo for one day: `class_sessions.centre_id`.
  NULL means it's at the class's usual dojo (`classes.centre_id`). Any query that shows
  where a lesson is should use `COALESCE(cs.centre_id, cl.centre_id)`.
- `class_sessions.change_note` is the reason students see; `changed_at` is when it changed.
- Cancel or move a session only through `POST /api/sessions/:id/cancel` or `/move`
  (admins: any session, instructors: their own). That returns booked students' credits
  and sends their notices. Don't set `class_sessions.status = 'cancelled'` directly.
- When the dojo cancels a session, bookings stay `booked` (so students still see it marked
  "Cancelled") and the credits come back as `booking_refund` rows.

**Notices and emails (`notifications`)**
- Write notices through `model/notificationModel.js` → `notify(...)`, or the ready-made ones in
  `utils/notices.js`. It saves the website notice and sends the email in one go.
- `dedupe_key` is unique, so the same event never sends two emails. Pick a key that names the
  event, for example `payment:42` or `session-cancelled:<sessionId>:<studentId>`.
- Email settings go in `backend/.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
  `MAIL_FROM`). Without them, emails are printed in the backend terminal instead.

**1-on-1 sessions (`private_lessons`)**
- Students request one (`status = 'requested'`); an admin schedules it, which takes
  `credit_cost` credits as a `booking` row with `private_lesson_id`.
- A student withdrawing a request sets `status = 'declined'` with
  `admin_note = 'Withdrawn by the student.'` (no credits were taken).

**Progress notes → lessons**
- `progress_notes.session_id` points at qj's `class_sessions`. Use it to say which lesson the note is for.

**Grading eligibility**
- Read, never write, these tables:
  - `student_profiles.belt_awarded_on` gives the months at the current belt.
  - `attendance` gives the classes attended since that date.
  - The next belt is the `belt_ranks` row where `rank_order = current.rank_order + 1`.
- Compare the student against that next belt's `min_months_at_rank` and `min_classes_at_rank`, plus its `belt_requirements`.

## 4. Status values (use exactly these strings)

| Column | Values |
|---|---|
| `users.role` | student, instructor, admin |
| `class_sessions.status` | scheduled, completed, cancelled |
| `bookings.status` | booked, cancelled |
| `attendance.status` | present, late, absent, excused |
| `attendance.method` | qr, manual |
| `payments.purpose` | membership, credit_topup, grading_fee, other |
| `payments.status` | pending, succeeded, failed, refunded |
| `memberships.status` | pending, active, expired, cancelled |
| `credit_transactions.reason` | topup, membership_grant, booking, booking_refund, adjustment |
| `grading_sessions.status` | scheduled, completed, cancelled |
| `grading_applications.status` | pending, approved, rejected, withdrawn, passed, failed |
| `private_lessons.status` | requested, scheduled, completed, no_show, cancelled, declined |
| `notifications.type` | welcome, booking_confirmed, payment_received, grading_eligible, grading_update, attendance_follow_up, lesson_cancelled, lesson_moved, private_lesson |
| `notifications.email_status` | none, pending, sent, failed |

Adding a new value means a new migration that replaces the CHECK constraint, so tell the team first.

## 5. How to change the schema without conflicts

Neon branches **do not merge** like git branches. A Neon branch is a separate copy of the database.
Schema changes reach `production` by re-running migration files, so **git is the source of truth, not Neon.**

1. All schema lives in `backend/database/migrations/` as numbered `.sql` files, committed to git.
2. **Never edit a migration that has already run on production.** Add a new one instead.
3. Name new files `NNN_<yourname>_<what>.sql`, for example `003_qj_add_booking_notes.sql`.
   If two people both pick `003`, the second renames theirs to `004` when merging. Names never clash.
4. To try something out, create your own Neon branch from `production`, such as `dev-<yourname>`, and run your migration there.
5. When your git PR merges, run your new migration file on `production`. Then reset your dev branch from its parent so it's fresh.
6. `backend/database/dev_sample_data.sql` is fake test data. Only run it on dev branches, never `production`.

## 6. Handy queries

```sql
-- Current membership
SELECT m.*, p.name FROM memberships m JOIN membership_plans p ON p.id = m.plan_id
WHERE m.student_id = $1 AND m.status = 'active' AND m.end_date >= CURRENT_DATE
ORDER BY m.end_date DESC LIMIT 1;

-- Credit balance
SELECT COALESCE(SUM(change), 0) AS balance FROM credit_transactions WHERE student_id = $1;

-- Next belt
SELECT nb.* FROM student_profiles sp
JOIN belt_ranks cb ON cb.id = sp.current_belt_id
JOIN belt_ranks nb ON nb.rank_order = cb.rank_order + 1
WHERE sp.user_id = $1;

-- Classes attended since current belt was awarded
SELECT COUNT(*) FROM attendance a
JOIN class_sessions cs ON cs.id = a.session_id
JOIN student_profiles sp ON sp.user_id = a.student_id
WHERE a.student_id = $1 AND a.status IN ('present', 'late')
  AND cs.session_date >= sp.belt_awarded_on;

-- Next grading date
SELECT * FROM grading_sessions
WHERE grading_date >= CURRENT_DATE AND status = 'scheduled'
ORDER BY grading_date LIMIT 1;
```
