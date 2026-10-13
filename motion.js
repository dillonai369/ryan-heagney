/* Ryan Heagney — Motion core (Studio Seven shared library pattern) */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hoverable = window.matchMedia('(hover: hover)').matches;
  var CFG = window.FUNNEL || {};

  /* ---------- Reveal: position check each scroll frame (never skips on fast flicks) ---------- */
  var pending = Array.prototype.slice.call(document.querySelectorAll('.reveal, .reveal-mask'));
  var revealHooks = [];
  window.onReveal = function (el, fn) { revealHooks.push({ el: el, fn: fn, done: false }); };
  function revealCheck() {
    var vh = window.innerHeight;
    if (pending.length) pending = pending.filter(function (el) {
      if (el.getBoundingClientRect().top < vh * 0.92) { el.classList.add('visible'); return false; }
      return true;
    });
    revealHooks.forEach(function (h) {
      if (!h.done && h.el.getBoundingClientRect().top < vh * 0.8) { h.done = true; h.fn(); }
    });
  }
  if (reduced) { pending.forEach(function (el) { el.classList.add('visible'); }); pending = []; }

  /* ---------- Header scrim + progress ---------- */
  var header = document.querySelector('.site-header');
  var bar = document.querySelector('.progress-top');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle('scrim', y > 20);
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    revealCheck();
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  window.addEventListener('resize', revealCheck);
  window.addEventListener('load', revealCheck);
  requestAnimationFrame(function () { requestAnimationFrame(onScroll); });

  /* ---------- Spotlight follows cursor on .spot panels ---------- */
  if (hoverable && !reduced) {
    document.addEventListener('pointermove', function (e) {
      var t = e.target.closest && e.target.closest('.spot');
      if (!t) return;
      var r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      t.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ---------- Ember particles (subtle, orange → white, drift upward) ---------- */
  var cv = document.getElementById('embers');
  if (cv && !reduced) {
    var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), W, H, parts = [];
    var count = window.innerWidth < 700 ? 22 : 46;
    function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function spawn(p, init) {
      p.x = Math.random() * W; p.y = init ? Math.random() * H : H + 10;
      p.r = Math.random() * 1.6 + .4; p.vy = Math.random() * .25 + .08; p.vx = (Math.random() - .5) * .12;
      p.a = Math.random() * .5 + .15; p.w = Math.random() * Math.PI * 2; p.h = Math.random() < .7 ? 24 : 38;
      return p;
    }
    size(); for (var i = 0; i < count; i++) parts.push(spawn({}, true));
    window.addEventListener('resize', size);
    var running = true;
    document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) requestAnimationFrame(tick); });
    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.w += .01; p.x += p.vx + Math.sin(p.w) * .15; p.y -= p.vy;
        if (p.y < -10) spawn(p, false);
        var fade = Math.min(1, p.y / (H * .5));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'hsla(' + p.h + ',100%,' + (p.h > 30 ? 82 : 62) + '%,' + (p.a * fade) + ')';
        ctx.shadowColor = 'rgba(255,120,40,.8)'; ctx.shadowBlur = 8;
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Sticky mobile CTA ---------- */
  var sticky = document.querySelector('.sticky-cta'), hero = document.querySelector('.hero'), apply = document.getElementById('apply');
  if (sticky && hero && apply && 'IntersectionObserver' in window) {
    var hv = true, av = false, upd = function () { sticky.classList.toggle('show', !hv && !av); };
    new IntersectionObserver(function (e) { hv = e[0].isIntersecting; upd(); }, { threshold: .1 }).observe(hero);
    new IntersectionObserver(function (e) { av = e[0].isIntersecting; upd(); }, { threshold: .05 }).observe(apply);
  }

  /* ---------- Story rail arrows ---------- */
  var rail = document.querySelector('.rail');
  document.querySelectorAll('[data-rail]').forEach(function (b) {
    b.addEventListener('click', function () {
      var c = rail && rail.querySelector('.t-card'); if (!c) return;
      rail.scrollBy({ left: (b.getAttribute('data-rail') === 'next' ? 1 : -1) * (c.getBoundingClientRect().width + 14), behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.closest('.faq-item'), open = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (i) { i.classList.remove('open'); i.querySelector('.faq-q').setAttribute('aria-expanded', 'false'); });
      if (!open) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* ---------- Video players ---------- */
  function embedFor(url) {
    if (!url) return null;
    var yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return '<iframe src="https://www.youtube-nocookie.com/embed/' + yt[1] + '?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="Video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    var vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return '<iframe src="https://player.vimeo.com/video/' + vm[1] + '?autoplay=1&title=0&byline=0&portrait=0" title="Video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
    return '<video src="' + url + '" controls autoplay playsinline></video>';
  }
  document.querySelectorAll('[data-video]').forEach(function (p) {
    var go = function () {
      var html = embedFor(CFG[p.getAttribute('data-video')]);
      if (!html) { var s = p.querySelector('[data-video-status]'); if (s) s.textContent = 'Video coming soon'; return; }
      var host = p.closest('.video-frame') || p;
      if (host === p) { p.innerHTML = html; } else { host.insertAdjacentHTML('beforeend', html); p.remove(); }
      track('ViewContent', { content_name: p.getAttribute('data-video') });
    };
    p.addEventListener('click', go);
    p.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });

  /* ---------- Analytics (load only when IDs set) ---------- */
  if (CFG.metaPixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', CFG.metaPixelId); window.fbq('track', 'PageView');
  }
  if (CFG.ga4Id) {
    var g = document.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + CFG.ga4Id; document.head.appendChild(g);
    window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', CFG.ga4Id);
  }
  function track(name, params) {
    try { if (window.fbq) window.fbq('track', name, params || {}); } catch (e) {}
    try { if (window.gtag) window.gtag('event', name === 'Lead' ? 'generate_lead' : name, params || {}); } catch (e) {}
  }
  window.funnelTrack = track;

  /* ---------- Attribution capture ---------- */
  try {
    var qs = new URLSearchParams(location.search), st = JSON.parse(sessionStorage.getItem('rh-attr') || '{}');
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid','ttclid'].forEach(function (k) { if (qs.get(k)) st[k] = qs.get(k); });
    if (!st.landing) st.landing = location.pathname;
    if (!st.referrer && document.referrer) st.referrer = document.referrer;
    sessionStorage.setItem('rh-attr', JSON.stringify(st));
  } catch (e) {}

  /* ---------- Config-driven text ---------- */
  var ub = document.getElementById('urgencyText'); if (ub && CFG.urgency) ub.innerHTML = CFG.urgency;
  var yr = document.getElementById('year'); if (yr) yr.textContent = new Date().getFullYear();
  var cr = document.getElementById('carrierRow');
  if (cr) {
    if (CFG.carriers && CFG.carriers.length) cr.innerHTML = CFG.carriers.map(function (c) { return '<span>' + c + '</span>'; }).join('');
    else cr.closest('.carriers').style.display = 'none';
  }
})();

/* Hide "Sample data" tags once real data is marked verified */
(function () {
  var C = window.FUNNEL || {};
  document.querySelectorAll('[data-sample]').forEach(function (t) {
    var k = t.getAttribute('data-sample');
    if (C[k] && C[k].verified) t.remove();
  });
})();
