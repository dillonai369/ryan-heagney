# Ryan Heagney — Recruitment Funnel v2 · Backend Notes

## Structure (Studio Seven build system)
- `index.html` — video-first recruitment funnel. ALL editable content/data lives in `window.FUNNEL` in `<head>`.
- `styles.css` design system · `motion.js` reveals/embers/FAQ/video · `fx.js` motion graphics (production chart, income odometers, phone process) · `apply.js` multi-step application.
- `api/apply.js` — Vercel function, saves applicants to Supabase.
- `supabase/schema.sql` — run once to create the `applicants` table (RLS on, server-only access).
- `insurance.html` — old client-facing site at `/insurance`.

## Connect Supabase
1. Supabase → New project (or existing) → SQL Editor → paste `supabase/schema.sql` → Run.
2. Project Settings → API → copy Project URL and the `service_role` key.
3. `vercel env add SUPABASE_URL` and `vercel env add SUPABASE_SERVICE_ROLE_KEY` (Production + Preview), then `vercel --prod`.

## Before launch — replace sample data
`production` and `income` blocks are SAMPLE data and show a "Sample data" tag until `verified: true`.
Only publish real, documentable figures. Also: vslUrl, interviewUrl (group interview calendar), carriers, pixel/GA IDs, team stories, Ryan's story line, FAQ answers (comp, leads, licensing fees), IMO compliance language.

## Later
Twilio SMS (after number port + A2P 10DLC registration) and a small admin dashboard reading the `applicants` table (status pipeline: new → contacted → interview_booked → licensed → onboarded).
