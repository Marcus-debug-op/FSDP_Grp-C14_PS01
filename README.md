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

### Tech stack

| Part      | What we use |
| --------- | ----------- |
| Frontend  | React 18, React Router 7, Vite, plain CSS |
| Backend   | Node.js, Express 5 (ES modules), routes → controller → model |
| Database  | PostgreSQL on Neon (`@neondatabase/serverless`) |
| Payments  | Stripe Checkout + webhooks |
| Auth      | JWT + bcrypt, rate-limited login |
| Other     | Nodemailer (emails), `qrcode` + `jsqr` (QR check-in) |

### Features

**Visitors (not signed in)**
- Home, About and Dojos pages
- Classes guide with filters (adults, children, family) and a public timetable (`/schedule`)
- Join & Fees page: how to join, live registration price, what to wear, FAQ
- Contact page and a friendly 404 page

**Students**
- Sign up in steps (details, experience/certificate, photo, plan) and pay the registration fee with Stripe
- Track the application on the profile page (payment, approval, photo review, membership book), and re-apply if rejected
- Dashboard, belt progress, personal settings
- Book and cancel lessons, weekly timetable and lesson history, private lesson requests
- Check in to class by scanning the instructor's QR code (`/check-in`)
- Grading eligibility and grading applications

**Instructors**
- Class list, calendar and attendance analytics
- Class roster: mark attendance, or show a live QR code students scan to check in
- Request a cover, accept/decline lesson offers
- Approve students for gradings

**Admins**
- Membership applications: approve/reject, request a new photo, membership book stages, HQ newcomer alerts
- Students, dojos, schedule, attendance
- Private lessons, cover requests, grading sessions

## Getting started

### 1. Requirements
- Node.js 20 or newer
- Access to the team's Neon project (ask the team leader)
- Stripe CLI (only needed to test payments locally)

### 2. Install

```bash
npm run install:all
```

This installs the root, `backend` and `frontend` packages. If npm shows an `ERESOLVE` peer-dependency error in the frontend (Vite 8 vs `@vitejs/plugin-react`), run:

```bash
cd frontend
npm install --legacy-peer-deps
```

### 3. Environment variables

Create `backend/.env` and `frontend/.env`. **Never commit these files or paste real keys in chat/GitHub.** Ask a teammate for the values.

`backend/.env`

| Variable | What it is |
| -------- | ---------- |
| `DATABASE_URL` | Neon connection string for the branch you are using |
| `JWT_SECRET` | Any long random string (server will not start without it) |
| `FRONTEND_URL` | Usually `http://localhost:5173` |
| `PORT` | Optional, defaults to `3000` |
| `STRIPE_SECRET_KEY` | Stripe **test** secret key |
| `STRIPE_WEBHOOK_SECRET` | Printed by `stripe listen` (starts with `whsec_`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Email settings (optional; emails are skipped if not set) |
| `EXTRA_CORS_ORIGINS` | Optional, only for phone/LAN testing. Leave empty normally |
| `CHECKIN_TEST_MODE` | Optional. `true` lets QR check-in work outside class time. Keep `false` normally |

`frontend/.env`

| Variable | What it is |
| -------- | ---------- |
| `VITE_API_URL` | Backend address, usually `http://localhost:3000` |

### 4. Run

```bash
npm run dev          # backend + frontend
npm run dev:stripe   # backend + frontend + Stripe webhook listener (use this to test payments)
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

Stripe test card: `4242 4242 4242 4242`, any future date, any CVC.

## Database

- All schema changes live in `backend/database/migrations/`. Read `backend/database/DATABASE.md` before changing anything.
- To build a fresh database: run `backend/database/init.sql`, then every migration in file-name order.
- The Neon branches share one database per branch, so **switching Git branches does not switch the database**. Check with the team before running SQL that changes tables.
- `dev_*_sample_data.sql` files are fake test data. Only run them on dev/test branches, never on `production`.

## Project structure

```
backend/
  server.js          Express app and route mounting
  routes/            URL → controller
  controller/        request checks and responses
  model/             SQL queries
  middleware/        auth (JWT, roles)
  utils/             mailer, helpers
  database/          init.sql, migrations, DATABASE.md
frontend/
  public/media/      images and short videos
  src/jsx/           pages and components
  src/js/services/   API calls to the backend
  src/js/data/       static site content
  src/css/           styles
```

## Testing tips

- **Payments:** use `npm run dev:stripe` so the webhook updates the payment after checkout.
- **QR check-in on a phone:** the camera only works on HTTPS (or `localhost`). For local testing, set `CHECKIN_TEST_MODE=true` and use the test link shown on the instructor's QR page; remember to switch it back to `false`.
- After testing on your phone over Wi-Fi, set `VITE_API_URL` / `FRONTEND_URL` back to `localhost` and clear `EXTRA_CORS_ORIGINS`.
