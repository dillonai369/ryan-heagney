/* POST /api/apply — Recruitment application handler (Vercel serverless function)
   Forwards applicants to GoHighLevel. Secrets live in Vercel env vars, never in the page.

   Set ONE of these in Vercel → Project → Settings → Environment Variables:
     Option A (GHL workflow "Inbound Webhook" trigger):
       GHL_WEBHOOK_URL   = https://services.leadconnectorhq.com/hooks/...
     Option B (GHL Private Integration — no workflow add-on needed):
       GHL_API_TOKEN     = pit-xxxxxxxx   (scopes: contacts.write)
       GHL_LOCATION_ID   = Ryan's sub-account Location ID
   If neither is set, this returns 503 and the page tells the applicant to call/text —
   it never pretends an application was received. */

const LABELS = {
  licensed: { 'licensed': 'Licensed', 'in-progress': 'Licensing in progress', 'not-licensed': 'Not licensed' },
  situation: { 'employed-ft': 'Working full-time', 'employed-pt': 'Working part-time', 'business-owner': 'Self-employed / business owner', 'other': 'In transition / other' },
  commitment: { 'full-time': 'Full-time', 'part-time': 'Part-time to start', 'exploring': 'Just exploring' }
};

const clean = (v, max = 600) => String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};

  // Honeypot — bots fill hidden fields. Pretend success, send nothing.
  if (b.website) return res.status(200).json({ ok: true });

  const a = {
    firstName: clean(b.firstName, 80),
    lastName: clean(b.lastName, 80),
    email: clean(b.email, 160).toLowerCase(),
    phone: clean(b.phone, 30),
    state: clean(b.state, 60),
    licensed: LABELS.licensed[b.licensed] || '',
    situation: LABELS.situation[b.situation] || '',
    commitment: LABELS.commitment[b.commitment] || '',
    why: clean(b.why, 600),
    consentContact: b.consentContact === true,
    consentSms: b.consentSms === true,
    attribution: typeof b.attribution === 'object' && b.attribution ? b.attribution : {},
    page: clean(b.page, 300),
    submittedAt: new Date().toISOString()
  };

  const missing = [];
  if (!a.firstName || !a.lastName) missing.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email)) missing.push('email');
  if (a.phone.replace(/\D/g, '').length < 10) missing.push('phone');
  if (!a.state) missing.push('state');
  if (!a.consentContact) missing.push('consent');
  if (missing.length) return res.status(400).json({ error: 'Please complete: ' + missing.join(', ') + '.' });

  const tags = ['recruit-applicant', 'source-recruit-funnel'];
  if (a.licensed === 'Licensed') tags.push('recruit-licensed');
  if (a.consentSms) tags.push('sms-opt-in');

  const summary = [
    'RECRUITMENT APPLICATION',
    `State: ${a.state}`,
    `Licensed: ${a.licensed}`,
    `Current situation: ${a.situation}`,
    `Time commitment: ${a.commitment}`,
    `Why interested: ${a.why}`,
    `Contact consent: ${a.consentContact ? 'Yes' : 'No'} · SMS consent: ${a.consentSms ? 'Yes' : 'No'}`,
    `Attribution: ${JSON.stringify(a.attribution)}`,
    `Submitted: ${a.submittedAt}`
  ].join('\n');

  try {
    // Option A — Inbound webhook
    if (process.env.GHL_WEBHOOK_URL) {
      const r = await fetch(process.env.GHL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...a, ...a.attribution, tags: tags.join(','), notes: summary, source: 'Recruitment Funnel' })
      });
      if (!r.ok) throw new Error('Webhook responded ' + r.status);
      return res.status(200).json({ ok: true });
    }

    // Option B — Private Integration API
    if (process.env.GHL_API_TOKEN && process.env.GHL_LOCATION_ID) {
      const headers = {
        Authorization: `Bearer ${process.env.GHL_API_TOKEN}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
        Accept: 'application/json'
      };
      const up = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          locationId: process.env.GHL_LOCATION_ID,
          firstName: a.firstName, lastName: a.lastName,
          email: a.email, phone: a.phone, state: a.state,
          source: 'Recruitment Funnel', tags
        })
      });
      const j = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error('Upsert responded ' + up.status + ' ' + JSON.stringify(j).slice(0, 200));
      const id = j && j.contact && j.contact.id;
      if (id) {
        await fetch(`https://services.leadconnectorhq.com/contacts/${id}/notes`, {
          method: 'POST', headers, body: JSON.stringify({ body: summary })
        }).catch(() => {});
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(503).json({ error: 'not_configured' });
  } catch (e) {
    console.error('[apply] forward failed:', e && e.message);
    return res.status(502).json({ error: 'We couldn\u2019t send your application just now. Please try again in a moment.' });
  }
};
