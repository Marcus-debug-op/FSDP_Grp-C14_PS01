# Belt feature (FSDP-9 and FSDP-62) — built against the live Neon schema

These files read your real tables: `student_profiles`, `belt_ranks`, `belt_requirements`.
Nothing here writes to the database, and nothing overwrites an existing project file.
No new tables are needed — the belt tables already exist in Neon.

## New files
backend/model/beltModel.js
backend/controller/beltController.js
backend/routes/beltRoutes.js
frontend/src/services/beltService.js
frontend/src/beltFormat.js              shared helpers (colour map, date, time-at-belt)
frontend/src/belt.css
frontend/src/components/student/BeltCard.jsx     FSDP-9
frontend/src/components/student/BeltTimeline.jsx FSDP-62
frontend/src/pages/student/BeltProgress.jsx      shows both together

## Two small edits to existing files

backend/server.js — add the import with the other imports, and the route by the auth route:

    import beltRoutes from "./routes/beltRoutes.js";
    ...
    app.use("/api/belts", beltRoutes);

frontend/src/App.jsx — import the page and add a protected route above the "*" route:

    import BeltProgress from "./pages/student/BeltProgress.jsx";
    ...
    <Route path="/belt-progress" element={<ProtectedRoute><BeltProgress /></ProtectedRoute>} />

## Database branch
The belt tables are only on the Neon Playground branch, not production. To test, point
DATABASE_URL in backend/.env at Playground.

## Endpoints (students only, read-only)
GET /api/belts/me             -> { belt }            current belt from student_profiles
GET /api/belts/me/progression -> { progression, hasProfile }   the full belt ladder

## How it maps to your tables
- Current belt   = student_profiles.current_belt_id  ->  belt_ranks (name, colour)
- Awarded date   = student_profiles.belt_awarded_on
- Time at belt   = today (Singapore) minus belt_awarded_on
- Progression    = all belt_ranks ordered by rank_order, each tagged
                   achieved / current / upcoming against the student's current rank
- Requirements   = belt_requirements.description per rank (shown under each belt)

## Important limitation for FSDP-62
The database stores only a student's CURRENT belt (one row in student_profiles).
There is no belt-history table, so earlier belts cannot show the date they were achieved.
The progression view therefore shows the belt ladder with the current belt dated and
earlier belts marked "achieved" without dates. A true dated history (AC: "a timeline of
each belt achieved with its date") would need a new table, e.g.:

    student_belt_history(user_id, belt_rank_id, achieved_on, verified)

That is a shared schema change — raise it with the team (it also helps grading). Until
then, this is the most the current schema can show.

## Tested
Verified against a local Postgres recreating belt_ranks / belt_requirements /
student_profiles with your real rows (Ungraded -> Shodan) and a sample student at 4th Kyu:
- /me returns the current belt with the correct "18 months" at belt
- /me/progression tags 4th Kyu as current and lists requirements per rank
- a student with no profile returns belt:null and the card shows "No belt recorded yet"
- instructor token -> 403, no token -> 401 (view-only, students only)
- vite build passes and both components render

## Note
beltService.js has its own small fetch helper because authService.js keeps request()
private. Once the team agrees a shared apiClient.js, switch this over.
