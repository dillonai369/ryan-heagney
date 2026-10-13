/* POST /api/apply — saves recruitment applications to Supabase (Vercel serverless function).
   Env vars (Vercel → Settings → Environment Variables):
     SUPABASE_URL               https://<project>.supabase.co
     SUPABASE_SERVICE_ROLE_KEY  service_role key (server-only — never put it in the page)
   Table: see supabase/schema.sql. If env vars are missing this returns 503 and the page
   tells the applicant to call/text — it never pretends an application was saved. */

const LABELS = {
  licensed: { 'licensed': 'Licensed', 'in-progress': 'Licensing in progress', 'not-licensed': 'Not licensed' },
  situation: { 'employed-ft': 'Working full-time', 'employed-pt': 'Working part-time', 'business-owner': 'Self-employed / business owner', 'other': 'In transition / other' },
  commitment: { 'full-time': 'Full-time', 'part-time': 'Part-time to start', 'exploring': 'Just exploring' }
};
const clean = (v, max = 600) => String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  if (b.website) return res.status(200).json({ ok: true }); // honeypot

  const row = {
    first_name: clean(b.firstName, 80),
    last_name: clean(b.lastName, 80),
    email: clean(b.email, 160).toLowerCase(),
    phone: clean(b.phone, 30),
    state: clean(b.state, 60),
    licensed: LABELS.licensed[b.licensed] || null,
    situation: LABELS.situation[b.situation] || null,
    commitment: LABELS.commitment[b.commitment] || null,
    why: clean(b.why, 600),
    consent_contact: b.consentContact === true,
    consent_sms: b.consentSms === true,
    attribution: b.attribution && typeof b.attribution === 'object' ? b.attribution : {},
    page: clean(b.page, 300),
    user_agent: clean(req.headers['user-agent'], 300)
  };

  const missing = [];
  if (!row.first_name || !row.last_name) missing.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(row.email)) missing.push('email');
  if (row.phone.replace(/\D/g, '').length < 10) missing.push('phone');
  if (!row.state) missing.push('state');
  if (!row.consent_contact) missing.push('consent');
  if (missing.length) return res.status(400).json({ error: 'Please complete: ' + missing.join(', ') + '.' });

  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'not_configured' });

  try {
    const r = await fetch(url.replace(/\/$/, '') + '/rest/v1/applicants', {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row)
    });
    if (!r.ok) throw new Error('Supabase ' + r.status + ' ' + (await r.text()).slice(0, 200));
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[apply] save failed:', e && e.message);
    return res.status(502).json({ error: 'We couldn\u2019t save your application just now. Please try again in a moment.' });
  }
};
