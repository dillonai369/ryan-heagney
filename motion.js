/* Ryan Heagney — Motion (Studio Seven shared library pattern) */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CFG = window.FUNNEL || {};

  /* ---------- Scroll reveal ----------
     Observer for normal scrolling + a position check on every scroll frame,
     so fast flicks (mobile) can never skip an element and leave it hidden. */
  var pending = Array.prototype.slice.call(document.querySelectorAll('.reveal, .reveal-mask'));
  function revealCheck() {
    if (!pending.length) return;
    var vh = window.innerHeight;
    pending = pending.filter(function (el) {
      if (el.getBoundingClientRect().top < vh * 0.92) { el.classList.add('visible'); return false; }
      return true;
    });
  }
  if (reduced) {
    pending.forEach(function (el) { el.classList.add('visible'); });
    pending = [];
  }

  /* ---------- Header scrim + scroll progress + parallax ---------- */
  var header = document.querySelector('.site-header');
  var bar = document.querySelector('.progress-top');
  var parallax = reduced ? [] : Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle('scrim', y > 24);
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    parallax.forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
      el.style.transform = 'translate3d(0,' + (y * speed).toFixed(1) + 'px,0)';
    });
    revealCheck();
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  requestAnimationFrame(function () { requestAnimationFrame(onScroll); }); // let first paint happen so hero animates in
  window.addEventListener('load', revealCheck);
  window.addEventListener('resize', revealCheck);

  /* ---------- Card spotlight (follows cursor) ---------- */
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- Sticky mobile CTA: show after hero, hide at the application ---------- */
  var sticky = document.querySelector('.sticky-cta');
  var hero = document.querySelector('.hero');
  var apply = document.getElementById('apply');
  if (sticky && hero && apply && 'IntersectionObserver' in window) {
    var heroVisible = true, applyVisible = false;
    var update = function () { sticky.classList.toggle('show', !heroVisible && !applyVisible); };
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(hero);
    new IntersectionObserver(function (e) { applyVisible = e[0].isIntersecting; update(); }, { threshold: 0.05 }).observe(apply);
  }

  /* ---------- Testimonial rail arrows ---------- */
  var rail = document.querySelector('.rail');
  document.querySelectorAll('[data-rail]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!rail) return;
      var card = rail.querySelector('.t-card');
      var step = card ? card.getBoundingClientRect().width + 14 : 320;
      rail.scrollBy({ left: btn.getAttribute('data-rail') === 'next' ? step : -step, behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  /* ---------- VSL player ---------- */
  function embedFor(url) {
    if (!url) return null;
    var yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return '<iframe src="https://www.youtube-nocookie.com/embed/' + yt[1] + '?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="Recruitment video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    var vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vm) return '<iframe src="https://player.vimeo.com/video/' + vm[1] + '?autoplay=1&title=0&byline=0&portrait=0" title="Recruitment video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';
    return '<video src="' + url + '" controls autoplay playsinline></video>';
  }
  document.querySelectorAll('[data-video]').forEach(function (poster) {
    var activate = function () {
      var key = poster.getAttribute('data-video');
      var url = CFG[key];
      var html = embedFor(url);
      if (!html) {
        var label = poster.querySelector('[data-video-status]');
        if (label) label.textContent = 'Video coming soon — check back shortly.';
        return;
      }
      poster.parentElement.insertAdjacentHTML('beforeend', html);
      poster.remove();
      track('ViewContent', { content_name: key });
    };
    poster.addEventListener('click', activate);
    poster.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
  });

  /* ---------- Analytics (only loads when IDs are set in window.FUNNEL) ---------- */
  if (CFG.metaPixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', CFG.metaPixelId);
    window.fbq('track', 'PageView');
  }
  if (CFG.ga4Id) {
    var g = document.createElement('script'); g.async = true; g.src = 'https://www.googletagmanager.com/gtag/js?id=' + CFG.ga4Id;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', CFG.ga4Id);
  }
  function track(name, params) {
    try { if (window.fbq) window.fbq('track', name, params || {}); } catch (e) {}
    try { if (window.gtag) window.gtag('event', name === 'Lead' ? 'generate_lead' : name, params || {}); } catch (e) {}
  }
  window.funnelTrack = track;

  /* ---------- Capture UTM / ad click IDs for attribution ---------- */
  try {
    var qs = new URLSearchParams(location.search);
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid'];
    var stored = JSON.parse(sessionStorage.getItem('rh-attr') || '{}');
    keys.forEach(function (k) { if (qs.get(k)) stored[k] = qs.get(k); });
    if (!stored.landing) stored.landing = location.pathname;
    if (!stored.referrer && document.referrer) stored.referrer = document.referrer;
    sessionStorage.setItem('rh-attr', JSON.stringify(stored));
  } catch (e) {}

  /* ---------- Footer year ---------- */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
})();
