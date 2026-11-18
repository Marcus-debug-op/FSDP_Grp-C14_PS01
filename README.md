# FSDP_Grp-C14_PS01

## Members

| Name                                           | Github Username     |
| -------------------------------------          | --------------------|
| Balasubramanian Aswin Kumar (Team Leader)      | Aswinkumar03        |
| Marcus Ng                                      | Marcus-debug-op     |
| Timely Loh                                     | Timely              |
| Tang Quan Jun                                  | Quanjune            | 
| Matthew Tay                                    | Spadnana            |

## App info

**Aikido Shinju-Kai** is a web app for an aikido school with dojos in Singapore and overseas. It covers the full journey of a student: finding a class as a visitor, signing up and paying the registration fee, booking lessons, checking in to class with a QR code, and applying for gradings. Instructors and admins get their own tools to run classes, approve members and manage the schedule.

## Project Tagline

As Aikido Shinju-Kai expands to 60 dojos, coordination between members, payments, classes, and gradings becomes increasingly difficult. Our student management system brings everything together. Students sign up, make payments for memberships, credits and gradings via Stripe, schedule classes, check-in using QR codes and view their next gradings. Instructors handle rostering and assessing students, while admins authorize members and coordinate class scheduling without clashes in every dojo. Notifications are sent directly to the relevant individual via email notifications.

### Tech stack

| Part      | What we use |
| --------- | ----------- |
| Frontend  | React 18, React Router 7, Vite, plain CSS |
| Backend   | Node.js, Express 5 (ES modules), routes → controller → model |
| Database  | PostgreSQL on Neon (`@neondatabase/serverless`) |
| Payments  | Stripe Checkout + webhooks |
| Auth      | JWT + bcrypt, rate-limited login |
| Other     | Nodemailer (emails), `qrcode` + `jsqr` (QR check-in) |
| Hosting   | Vercel (frontend), Render (backend), Neon (database) |

### Features

**Visitors (not signed in)**
- Home, About and Dojos pages
- Classes guide with filters (adults, children, family) and a public timetable (`/schedule`)
- Join & Fees page: how to join, live registration price, what to wear, FAQ
- Contact page and a friendly 404 page

**Students**
- Sign up in steps (details, experience/certificate, photo, plan) and pay the registration fee with Stripe
- Welcome notice and email after signing up
- Track the application on the profile page (payment, approval, photo review, membership book), and re-apply if rejected
- Membership runs until 31 December of the year you join; new members start with a beginner belt
- Dashboard, inbox (`/inbox`) for notices, belt progress, personal settings
- Book and cancel lessons, weekly timetable and lesson history, private lesson requests
- Check in to class by scanning the instructor's QR code (`/check-in`)
- Grading eligibility and grading applications

**Instructors**
- Class list, calendar and attendance analytics
- Class roster: mark attendance, or show a live QR code students scan to check in
- Students list and each student's progress
- Request a cover, accept/decline lesson offers
- Grading sessions: approve students and assess them on the day

**Admins**
- Membership applications: approve/reject, view the experience certificate, request a new photo, membership book stages, HQ newcomer alerts
- Students, dojos, schedule, attendance
- Private lessons, cover requests, grading sessions and grading applications

## Getting started

### 1. Requirements
- Node.js 20 or newer
- Access to the team's Neon project (ask the team leader)
- Stripe CLI (only needed to test payments locally)

### 2. Install

```bash
npm run install:all
```

This installs the root, `backend` and `frontend` packages. `frontend/.npmrc` already turns on `legacy-peer-deps`, so the Vite / `@vitejs/plugin-react` peer-dependency error should not appear.

### 3. Environment variables

Create `backend/.env` and `frontend/.env`. **Never commit these files or paste real keys in chat/GitHub.** Ask a teammate for the values.

`backend/.env`

| Variable | What it is |
| -------- | ---------- |
| `DATABASE_URL` | Neon connection string for the branch you are using |
| `JWT_SECRET` | Any long random string (server will not start without it) |
| `FRONTEND_URL` | Usually `http://localhost:5173` (no slash at the end) |
| `PORT` | Optional, defaults to `3000` |
| `STRIPE_SECRET_KEY` | Stripe **test** secret key |
| `STRIPE_WEBHOOK_SECRET` | Printed by `stripe listen` (starts with `whsec_`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Email settings (optional; emails are skipped if not set) |
| `EXTRA_CORS_ORIGINS` | Optional, only for phone/LAN testing. Leave empty normally |
| `CHECKIN_TEST_MODE` | Optional. `true` lets QR check-in work outside class time. Keep `false` normally |
| `GRADING_TEST_MODE` | Optional. `true` relaxes grading checks for testing. Keep `false` normally |
| `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Only for `npm run seed` in `backend` (creates the admin account) |
| `SEED_INSTRUCTOR_NAME`, `SEED_INSTRUCTOR_EMAIL`, `SEED_INSTRUCTOR_PASSWORD` | Only for `npm run seed` (creates an instructor account) |

`frontend/.env`

| Variable | What it is |
| -------- | ---------- |
| `VITE_API_URL` | Backend address, usually `http://localhost:3000` (no slash at the end) |

### 4. Run

```bash
npm run dev          # backend + frontend
npm run dev:stripe   # backend + frontend + Stripe webhook listener (use this to test payments)
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000 (check http://localhost:3000/api/health)

Stripe test card: `4242 4242 4242 4242`, any future date, any CVC.

## Database

- All schema changes live in `backend/database/migrations/`. Read `backend/database/DATABASE.md` before changing anything.
- To build a fresh database: run `backend/database/init.sql`, then every migration in file-name order (`001` to `015`). Files that share a number (e.g. the three `005_` files) are all run, in alphabetical order.
- The Neon branches share one database per branch, so **switching Git branches does not switch the database**. Check with the team before running SQL that changes tables.
- `dev_*_sample_data.sql` files (in `backend/database/` and `backend/database/Seed_updates/`) are fake test data. Only run them on dev/test branches, never on `production`.

## Deployment

The app is deployed as three parts. Deploy the backend first, because the frontend needs its address.

**1. Backend on Render** (New → Web Service)
- Root directory: `backend` · Build: `npm install` · Start: `npm start`
- Add the same variables as `backend/.env`. `DATABASE_URL` must point to a branch that has all migrations run.
- Check `https://<backend>.onrender.com/api/health` shows `{"status":"ok"}`.
- The free plan sleeps after ~15 minutes idle; the first request then takes ~50 seconds.

**2. Frontend on Vercel** (Add New → Project)
- Root directory: `frontend` (Vercel detects Vite)
- Environment variable: `VITE_API_URL` = the Render backend address
- `frontend/vercel.json` sends every page to `index.html`, so refreshing a page like `/dashboard` works.

**3. Connect them**
- On Render, set `FRONTEND_URL` to the Vercel address and redeploy (needed for CORS, Stripe redirects and email links).
- In the Stripe Dashboard (test mode) → Developers → Webhooks, add `https://<backend>.onrender.com/api/payments/webhook` with the events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` and `payment_intent.payment_failed`. Put its signing secret in `STRIPE_WEBHOOK_SECRET` on Render.

The deployed site uses HTTPS, so QR check-in works from a phone camera.

## Project structure

```
backend/
  server.js          Express app and route mounting
  routes/            URL → controller
  controller/        request checks and responses
  model/             SQL queries
  middleware/        auth (JWT, roles)
  utils/             mailer, notices, helpers
  data/              mock data
  tests/             tests
  database/          init.sql, migrations, sample data, DATABASE.md
frontend/
  public/images/     images
  public/media/      images and short videos
  src/jsx/           pages, components and context
  src/js/services/   API calls to the backend
  src/js/data/       static site content
  src/js/hooks/      shared React hooks
  src/css/           styles
  vercel.json        Vercel page routing
  .npmrc             install settings (legacy-peer-deps)
```

## Testing tips

- **Payments:** use `npm run dev:stripe` so the webhook updates the payment after checkout.
- **QR check-in on a phone:** the camera only works on HTTPS (or `localhost`). Use the deployed site, or for local testing set `CHECKIN_TEST_MODE=true` and use the test link shown on the instructor's QR page; remember to switch it back to `false`.
- After testing on your phone over Wi-Fi, set `VITE_API_URL` / `FRONTEND_URL` back to `localhost` and clear `EXTRA_CORS_ORIGINS`.
