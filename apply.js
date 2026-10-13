/* Ryan Heagney — Application funnel (one question at a time)
   Submits to /api/apply (Vercel function) which forwards to GoHighLevel.
   Nothing is "sent" unless that endpoint confirms it. */
(function () {
  var form = document.getElementById('applyForm');
  if (!form) return;
  var CFG = window.FUNNEL || {};
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var steps = Array.prototype.slice.call(form.querySelectorAll('.step'));
  var total = steps.length;
  var barFill = document.getElementById('applyBar');
  var stepLabel = document.getElementById('applyStep');
  var backBtn = document.getElementById('applyBack');
  var nextBtn = document.getElementById('applyNext');
  var nextLabel = nextBtn.querySelector('.btn-label');
  var notice = document.getElementById('applyNotice');
  var nav = form.querySelector('.apply-nav');
  var done = document.getElementById('applyDone');
  var data = {};
  var i = 0;
  var started = false;

  function show(idx, back) {
    steps.forEach(function (s) { s.classList.remove('active', 'leaving-back'); });
    var s = steps[idx];
    s.classList.add('active');
    if (back) s.classList.add('leaving-back');
    stepLabel.textContent = (idx + 1) + ' / ' + total;
    barFill.style.width = ((idx / total) * 100 + 4) + '%';
    backBtn.hidden = idx === 0;
    nextLabel.textContent = idx === total - 1 ? 'Submit Application' : 'Continue';
    clearError(s);
    var shell = form.getBoundingClientRect();
    if (started && shell.top < 70) form.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    var first = s.querySelector('input:not([type=checkbox]), select, textarea');
    if (first && window.matchMedia('(hover: hover)').matches) first.focus({ preventScroll: true });
  }

  function err(step, msg) {
    var box = step.querySelector('.error-msg');
    step.classList.add('invalid');
    if (box) box.textContent = msg;
  }
  function clearError(step) {
    step.classList.remove('invalid', 'invalid-check');
    var box = step.querySelector('.error-msg');
    if (box) box.textContent = '';
  }
  function val(name) { var el = form.elements[name]; return el ? String(el.value || '').trim() : ''; }

  function validate(step) {
    clearError(step);
    var type = step.getAttribute('data-type');
    if (type === 'name') {
      if (!val('firstName') || !val('lastName')) return err(step, 'Please enter your first and last name.'), false;
      data.firstName = val('firstName'); data.lastName = val('lastName');
    }
    if (type === 'select') {
      var n = step.getAttribute('data-name');
      if (!val(n)) return err(step, 'Please choose an option.'), false;
      data[n] = val(n);
    }
    if (type === 'choice') {
      var name = step.querySelector('.options').getAttribute('data-name');
      if (!data[name]) return err(step, 'Pick the option that fits best.'), false;
    }
    if (type === 'text') {
      var w = val('why');
      if (w.length < 20) return err(step, 'Give us a little more — a sentence or two is perfect.'), false;
      data.why = w;
    }
    if (type === 'contact') {
      var email = val('email'), phone = val('phone').replace(/\D/g, '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return err(step, 'Please enter a valid email address.'), false;
      if (phone.length < 10) return err(step, 'Please enter a valid phone number.'), false;
      if (!form.elements.consentContact.checked) { step.classList.add('invalid-check'); return err(step, 'Please confirm we can contact you about your application.'), false; }
      data.email = email; data.phone = val('phone');
      data.consentContact = true;
      data.consentSms = form.elements.consentSms.checked;
    }
    return true;
  }

  /* Option buttons */
  form.querySelectorAll('.options').forEach(function (group) {
    var name = group.getAttribute('data-name');
    var opts = group.querySelectorAll('.opt');
    opts.forEach(function (opt) {
      opt.addEventListener('click', function () {
        opts.forEach(function (o) { o.setAttribute('aria-checked', 'false'); });
        opt.setAttribute('aria-checked', 'true');
        data[name] = opt.getAttribute('data-value');
        clearError(group.closest('.step'));
        setTimeout(next, reduced ? 0 : 280);
      });
    });
  });

  /* Phone formatting */
  var phoneEl = form.elements.phone;
  if (phoneEl) phoneEl.addEventListener('input', function () {
    var d = phoneEl.value.replace(/\D/g, '').slice(0, 11);
    if (d.length === 11 && d[0] === '1') d = d.slice(1);
    var out = d;
    if (d.length > 6) out = '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6, 10);
    else if (d.length > 3) out = '(' + d.slice(0, 3) + ') ' + d.slice(3);
    phoneEl.value = out;
  });

  /* Character counter */
  var why = form.elements.why, counter = document.getElementById('whyCount');
  if (why && counter) why.addEventListener('input', function () { counter.textContent = why.value.length + ' / 600'; });

  function next() {
    var step = steps[i];
    if (!validate(step)) return;
    if (!started) { started = true; if (window.funnelTrack) window.funnelTrack('InitiateCheckout', { content_name: 'recruit_application' }); }
    if (i < total - 1) { i++; show(i); } else { submit(); }
  }
  function back() { if (i > 0) { i--; show(i, true); } }

  nextBtn.addEventListener('click', next);
  backBtn.addEventListener('click', back);

  form.addEventListener('submit', function (e) { e.preventDefault(); next(); });
  form.addEventListener('keydown', function (e) {
    var step = steps[i];
    if (!step || !step.classList.contains('active')) return;
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') { e.preventDefault(); next(); }
    if (e.key === 'Enter' && e.target.tagName === 'TEXTAREA' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); next(); }
    if (step.getAttribute('data-type') === 'choice' && /^[a-dA-D]$/.test(e.key) && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      var opt = step.querySelectorAll('.opt')[e.key.toLowerCase().charCodeAt(0) - 97];
      if (opt) opt.click();
    }
  });

  function submit() {
    notice.hidden = true;
    nextBtn.classList.add('loading');
    var attr = {};
    try { attr = JSON.parse(sessionStorage.getItem('rh-attr') || '{}'); } catch (e) {}
    var payload = Object.assign({}, data, {
      website: form.elements.website ? form.elements.website.value : '', // honeypot
      attribution: attr,
      page: location.href,
      submittedAt: new Date().toISOString()
    });

    fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); })
      .then(function (res) {
        nextBtn.classList.remove('loading');
        if (res.ok) return complete();
        var phone = CFG.phone || '';
        notice.textContent = res.status === 503
          ? 'Applications are being connected right now and could not be sent. Please call or text ' + phone + ' and we will get you scheduled.'
          : (res.body && res.body.error ? res.body.error : 'Something went wrong sending your application. Please try again, or call/text ' + phone + '.');
        notice.hidden = false;
      })
      .catch(function () {
        nextBtn.classList.remove('loading');
        notice.textContent = 'Connection problem — your application was not sent. Please try again.';
        notice.hidden = false;
      });
  }

  function complete() {
    form.querySelector('.apply-body').style.display = 'none';
    nav.style.display = 'none';
    barFill.style.width = '100%';
    stepLabel.textContent = 'Complete';
    document.getElementById('doneName').textContent = data.firstName || '';
    var link = document.getElementById('bookInterview');
    if (CFG.interviewUrl) {
      try {
        var u = new URL(CFG.interviewUrl);
        u.searchParams.set('name', (data.firstName + ' ' + data.lastName).trim());
        u.searchParams.set('email', data.email);
        link.href = u.toString();
      } catch (e) { link.href = CFG.interviewUrl; }
    } else {
      link.style.display = 'none';
    }
    done.classList.add('active');
    if (window.funnelTrack) window.funnelTrack('Lead', { content_name: 'recruit_application' });
    document.getElementById('apply').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  show(0);
})();
