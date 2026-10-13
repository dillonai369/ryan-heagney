# Ryan Heagney — Recruitment Funnel · Backend Notes

## Structure (Studio Seven build system)
- `index.html` — recruitment funnel (homepage). All editable settings live in the `window.FUNNEL` config block in `<head>`.
- `insurance.html` — previous client-facing insurance homepage, served at `/insurance`.
- `privacy.html`, `terms.html` — legal pages (needed for A2P/SMS). Make sure they also cover recruiting applicant data.
- `styles.css` + `motion.js` — shared design/motion layer. `apply.js` — multi-step application.
- `api/apply.js` — Vercel serverless function. Validates and forwards applications to GoHighLevel.
- `images/` — real image files (no base64).

## Connecting GoHighLevel (choose one)
A) Workflow with an **Inbound Webhook** trigger → copy URL →
   `vercel env add GHL_WEBHOOK_URL production` (and `preview`)
B) Settings → Private Integrations → create token with `contacts.write` →
   `vercel env add GHL_API_TOKEN production` and `vercel env add GHL_LOCATION_ID production`
Redeploy after adding env vars.

Applicants are tagged `recruit-applicant`, `source-recruit-funnel` (+ `recruit-licensed`, `sms-opt-in` when applicable).
Answers + UTM/ad attribution are attached as a contact note (Option B) or included in the webhook payload (Option A).

## Placeholders to replace
vslUrl, testimonialVideo1, interviewUrl (recruiting calendar), metaPixelId, ga4Id, team testimonials, Ryan's story line, IMO compliance language.
