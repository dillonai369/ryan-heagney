/* Ryan Heagney — Motion graphics (chart · odometer · phone process) */
(function () {
  var CFG = window.FUNNEL || {};
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var onReveal = window.onReveal || function (el, fn) { fn(); };
  function el(tag, attrs, parent) { var n = document.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function money(v, compact) {
    if (compact && v >= 1000) return '$' + (v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : Math.round(v / 1000) + 'K');
    return '$' + Math.round(v).toLocaleString('en-US');
  }

  /* =====================================================
     ODOMETER — rolling digit columns
     ===================================================== */
  function odoSet(node, text) {
    var chars = String(text).split('');
    var same = node.children.length === chars.length && Array.prototype.every.call(node.children, function (c, i) { return (/\d/.test(chars[i])) === c.classList.contains('col'); });
    if (!same) {
      node.innerHTML = '';
      chars.forEach(function (ch) {
        if (/\d/.test(ch)) {
          var col = document.createElement('span'); col.className = 'col';
          var strip = document.createElement('span');
          for (var d = 0; d <= 9; d++) { var b = document.createElement('b'); b.textContent = d; strip.appendChild(b); }
          strip.style.transform = 'translateY(0)';
          col.appendChild(strip); node.appendChild(col);
        } else { var s = document.createElement('span'); s.className = 'sym'; s.textContent = ch; node.appendChild(s); }
      });
      node.offsetHeight; // commit start position so the roll animates
    }
    var i = 0;
    Array.prototype.forEach.call(node.children, function (c, idx) {
      if (c.classList.contains('col')) {
        var strip = c.firstChild;
        strip.style.transitionDelay = (reduced ? 0 : idx * 45) + 'ms';
        strip.style.transform = 'translateY(-' + chars[idx] + 'em)';
      } else c.textContent = chars[idx];
      i++;
    });
  }
  window.odoSet = odoSet;

  /* =====================================================
     TEAM PRODUCTION CHART
     ===================================================== */
  var host = document.getElementById('prodChart');
  if (host && CFG.production && CFG.production.values && CFG.production.values.length > 1) {
    var P = CFG.production, vals = P.values, months = P.months;
    var narrow = host.clientWidth < 600;
    var W = narrow ? 440 : 800, H = narrow ? 300 : 330, L = narrow ? 46 : 56, R = narrow ? 12 : 18, T = 20, B = 36;
    var iw = W - L - R, ih = H - T - B;
    var maxV = Math.max.apply(null, vals);
    var step = Math.pow(10, Math.floor(Math.log10(maxV * 1.15 / 4)));
    var yMax = Math.ceil((maxV * 1.15) / (step * 4)) * step * 4;
    var X = function (i) { return L + (i / (vals.length - 1)) * iw; };
    var Y = function (v) { return T + ih - (v / yMax) * ih; };
    var pts = vals.map(function (v, i) { return [X(i), Y(v)]; });

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart-svg', role: 'img', 'aria-label': P.title || 'Team production by month' }, host);
    var defs = el('defs', {}, svg);
    var lg = el('linearGradient', { id: 'lineGrad', x1: '0', x2: '1', y1: '0', y2: '0' }, defs);
    el('stop', { offset: '0', 'stop-color': '#FF6A1A' }, lg); el('stop', { offset: '.6', 'stop-color': '#FF9A4D' }, lg); el('stop', { offset: '1', 'stop-color': '#FFE9D6' }, lg);
    var ag = el('linearGradient', { id: 'areaGrad', x1: '0', x2: '0', y1: '0', y2: '1' }, defs);
    el('stop', { offset: '0', 'stop-color': '#FF7A28', 'stop-opacity': '.38' }, ag); el('stop', { offset: '.7', 'stop-color': '#FF7A28', 'stop-opacity': '.04' }, ag); el('stop', { offset: '1', 'stop-color': '#FF7A28', 'stop-opacity': '0' }, ag);
    var sg = el('linearGradient', { id: 'scanGrad', x1: '0', x2: '1', y1: '0', y2: '0' }, defs);
    el('stop', { offset: '0', 'stop-color': '#FFB27A', 'stop-opacity': '0' }, sg); el('stop', { offset: '.5', 'stop-color': '#FFB27A', 'stop-opacity': '.16' }, sg); el('stop', { offset: '1', 'stop-color': '#FFB27A', 'stop-opacity': '0' }, sg);
    var f = el('filter', { id: 'lineGlow', x: '-10%', y: '-30%', width: '120%', height: '160%' }, defs);
    el('feGaussianBlur', { stdDeviation: '4', result: 'b' }, f);
    var fm = el('feMerge', {}, f); el('feMergeNode', { in: 'b' }, fm); el('feMergeNode', { in: 'SourceGraphic' }, fm);
    var clip = el('clipPath', { id: 'revealClip' }, defs);
    var clipRect = el('rect', { x: L, y: 0, width: 0, height: H }, clip);

    // grid + y labels
    for (var g = 0; g <= 4; g++) {
      var gv = (yMax / 4) * g, gy = Y(gv);
      el('line', { x1: L, x2: W - R, y1: gy, y2: gy, class: 'gridline' }, svg);
      var t = el('text', { x: L - 12, y: gy + 4, 'text-anchor': 'end', class: 'axis' }, svg); t.textContent = money(gv, true);
    }
    // ghost bars (subtle depth)
    var bw = iw / vals.length * .42;
    vals.forEach(function (v, i) { el('rect', { x: X(i) - bw / 2, y: Y(v), width: bw, height: T + ih - Y(v), rx: 6, class: 'bar-ghost', 'clip-path': 'url(#revealClip)' }, svg); });
    // x labels
    months.forEach(function (m, i) { var t = el('text', { x: X(i), y: H - 10, 'text-anchor': 'middle', class: 'axis' }, svg); t.textContent = m; });

    // smooth path (Catmull-Rom → Bézier)
    function smooth(p) {
      var d = 'M' + p[0][0] + ',' + p[0][1];
      for (var i = 0; i < p.length - 1; i++) {
        var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2, k = .18;
        d += ' C' + (p1[0] + (p2[0] - p0[0]) * k) + ',' + (p1[1] + (p2[1] - p0[1]) * k) + ' ' + (p2[0] - (p3[0] - p1[0]) * k) + ',' + (p2[1] - (p3[1] - p1[1]) * k) + ' ' + p2[0] + ',' + p2[1];
      }
      return d;
    }
    var dLine = smooth(pts);
    el('path', { d: dLine + ' L' + X(vals.length - 1) + ',' + (T + ih) + ' L' + L + ',' + (T + ih) + ' Z', class: 'area-path', 'clip-path': 'url(#revealClip)' }, svg);
    var scan = el('rect', { x: L - 120, y: T, width: 120, height: ih, class: 'scan', 'clip-path': 'url(#revealClip)', opacity: 0 }, svg);
    var line = el('path', { d: dLine, class: 'line-path' }, svg);
    var cross = el('line', { x1: 0, x2: 0, y1: T, y2: T + ih, class: 'crosshair' }, svg);
    var dots = pts.map(function (p) { return el('circle', { cx: p[0], cy: p[1], r: 4.5, class: 'pt' }, svg); });
    var ring = el('circle', { cx: L, cy: T + ih, r: 5, class: 'head-ring', opacity: 0 }, svg);
    var head = el('circle', { cx: L, cy: T + ih, r: 4, class: 'head', opacity: 0 }, svg);

    var len = line.getTotalLength();
    line.style.strokeDasharray = len; line.style.strokeDashoffset = len;

    // KPIs
    var kTotal = document.getElementById('kpiTotal'), kGrowth = document.getElementById('kpiGrowth');
    var total = vals[vals.length - 1], growth = Math.round(((vals[vals.length - 1] - vals[0]) / vals[0]) * 100);

    function draw() {
      var dur = reduced ? 1 : 2200, t0 = performance.now();
      head.setAttribute('opacity', 1);
      (function frame(now) {
        var t = Math.min(1, (now - t0) / dur), e = easeOut(t);
        line.style.strokeDashoffset = len * (1 - e);
        var p = line.getPointAtLength(len * e);
        head.setAttribute('cx', p.x); head.setAttribute('cy', p.y);
        clipRect.setAttribute('width', Math.max(0, p.x - L + 2));
        dots.forEach(function (d, i) { if (pts[i][0] <= p.x + 1) d.classList.add('in'); });
        if (kTotal) kTotal.textContent = money(total * e, true);
        if (kGrowth) kGrowth.textContent = '+' + Math.round(growth * e) + '%';
        if (t < 1) requestAnimationFrame(frame);
        else {
          ring.setAttribute('cx', p.x); ring.setAttribute('cy', p.y); ring.setAttribute('opacity', 1);
          clipRect.setAttribute('width', iw + 4);
          if (!reduced) sweep();
        }
      })(t0);
    }
    function sweep() { // periodic light scan across the area
      var t0 = performance.now(), dur = 2600;
      scan.setAttribute('opacity', 1);
      (function f(now) {
        var t = Math.min(1, (now - t0) / dur);
        scan.setAttribute('x', L - 120 + (iw + 120) * easeOut(t));
        if (t < 1) requestAnimationFrame(f); else { scan.setAttribute('opacity', 0); setTimeout(sweep, 4200); }
      })(t0);
    }
    onReveal(host, draw);

    // hover / touch tooltip
    var tip = document.getElementById('chartTip'), hot = -1;
    function locate(clientX) {
      var r = svg.getBoundingClientRect(), x = (clientX - r.left) / r.width * W;
      var i = Math.round(((x - L) / iw) * (vals.length - 1)); return Math.max(0, Math.min(vals.length - 1, i));
    }
    function show(i) {
      if (i === hot) return; hot = i;
      dots.forEach(function (d, j) { d.classList.toggle('hot', j === i); });
      cross.setAttribute('x1', pts[i][0]); cross.setAttribute('x2', pts[i][0]); cross.style.opacity = 1;
      var r = svg.getBoundingClientRect(), hr = host.getBoundingClientRect();
      tip.style.left = (r.left - hr.left + pts[i][0] / W * r.width) + 'px';
      tip.style.top = (r.top - hr.top + pts[i][1] / H * r.height) + 'px';
      var prev = i > 0 ? vals[i - 1] : null, delta = prev ? Math.round((vals[i] - prev) / prev * 100) : null;
      tip.innerHTML = '<div class="m">' + months[i] + '</div><div class="val">' + money(vals[i]) + '</div>' + (delta !== null ? '<div class="delta">' + (delta >= 0 ? '▲ ' : '▼ ') + Math.abs(delta) + '% vs ' + months[i - 1] + '</div>' : '');
      tip.classList.add('show');
    }
    function hide() { hot = -1; tip.classList.remove('show'); cross.style.opacity = 0; dots.forEach(function (d) { d.classList.remove('hot'); }); }
    svg.addEventListener('pointermove', function (e) { show(locate(e.clientX)); });
    svg.addEventListener('pointerdown', function (e) { show(locate(e.clientX)); });
    svg.addEventListener('pointerleave', hide);
  }

  /* =====================================================
     INCOME — tabs + odometers
     ===================================================== */
  var inc = document.getElementById('income');
  if (inc && CFG.income && CFG.income.tiers) {
    var tiers = CFG.income.tiers, tabs = inc.querySelector('.tabs'), pill = tabs.querySelector('.pill');
    tabs.insertAdjacentHTML('beforeend', tiers.map(function (t, i) { return '<button type="button" role="tab" aria-selected="' + (i === 1) + '" data-i="' + i + '">' + t.label + '</button>'; }).join(''));
    var btns = tabs.querySelectorAll('button');
    var f = {
      annual: inc.querySelector('[data-f="annual"]'), monthly: inc.querySelector('[data-f="monthly"]'),
      policies: inc.querySelector('[data-f="policies"]'), first: inc.querySelector('[data-f="first"]'),
      rate: inc.querySelector('[data-f="rate"]'), hours: inc.querySelector('[data-f="hours"]'), blurb: inc.querySelector('[data-f="blurb"]')
    };
    var started = false, cur = 1;
    function movePill(b) { pill.style.width = b.offsetWidth + 'px'; pill.style.transform = 'translateX(' + (b.offsetLeft - 5) + 'px)'; }
    function render(i) {
      cur = i; var t = tiers[i];
      btns.forEach(function (b, j) { b.setAttribute('aria-selected', j === i); });
      movePill(btns[i]);
      if (!started) return;
      odoSet(f.annual, money(t.annual));
      odoSet(f.monthly, money(t.annual / 12));
      odoSet(f.policies, String(t.policies));
      f.first.textContent = t.first; f.rate.textContent = t.rate;
      f.hours.textContent = t.hours; f.blurb.textContent = t.blurb;
    }
    btns.forEach(function (b, i) { b.addEventListener('click', function () { render(i); }); });
    window.addEventListener('resize', function () { movePill(btns[cur]); });
    requestAnimationFrame(function () { movePill(btns[cur]); });
    // start at zero, roll up when scrolled into view
    var z = tiers[cur];
    odoSet(f.annual, money(z.annual).replace(/\d/g, '0'));
    odoSet(f.monthly, money(z.annual / 12).replace(/\d/g, '0'));
    odoSet(f.policies, String(z.policies).replace(/\d/g, '0'));
    onReveal(inc, function () { started = true; setTimeout(function () { render(cur); }, reduced ? 0 : 250); });
  }

  /* =====================================================
     PROCESS — phone motion graphic
     ===================================================== */
  var stage = document.getElementById('phoneStage');
  if (stage) {
    var pSteps = stage.querySelectorAll('.p-step'), list = document.querySelectorAll('.s-item');
    var prog = stage.querySelector('.p-progress i'), toast = stage.querySelector('.p-toast'), cursor = stage.querySelector('.p-cursor'), screen = stage.querySelector('.phone-screen');
    var STEP_MS = 3200, idx = -1, timer = null, visible = false;
    document.documentElement.style.setProperty('--step-ms', STEP_MS + 'ms');
    function setStep(i) {
      idx = i;
      pSteps.forEach(function (s, j) { s.classList.toggle('on', j === i); s.classList.toggle('done', j < i); });
      list.forEach(function (s, j) { s.classList.remove('on'); if (j === i) { void s.offsetWidth; s.classList.add('on'); } });
      prog.style.width = ((i + 1) / pSteps.length * 100) + '%';
      toast.classList.remove('show');
      // simulated tap
      var target = pSteps[i], sr = screen.getBoundingClientRect(), tr = target.getBoundingClientRect();
      cursor.style.opacity = 1;
      cursor.style.left = (tr.left - sr.left + tr.width * .78) + 'px';
      cursor.style.top = (tr.top - sr.top + tr.height * .5 + 12) + 'px';
      setTimeout(function () { cursor.classList.add('tap'); setTimeout(function () { cursor.classList.remove('tap'); }, 220); }, 750);
    }
    function finale() {
      pSteps.forEach(function (s) { s.classList.remove('on'); s.classList.add('done'); });
      toast.classList.add('show'); cursor.style.opacity = 0;
    }
    function loop() {
      clearTimeout(timer);
      if (!visible) return;
      if (idx < pSteps.length - 1) { setStep(idx + 1); timer = setTimeout(loop, STEP_MS); }
      else { finale(); timer = setTimeout(function () { idx = -1; prog.style.width = '0%'; pSteps.forEach(function (s) { s.classList.remove('done', 'on'); }); list.forEach(function (s) { s.classList.remove('on'); }); timer = setTimeout(loop, 700); }, 2600); }
    }
    list.forEach(function (s, i) { s.addEventListener('click', function () { clearTimeout(timer); setStep(i); timer = setTimeout(loop, STEP_MS); }); });
    if (reduced) { pSteps.forEach(function (s) { s.classList.add('done'); }); prog.style.width = '100%'; }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        visible = e[0].isIntersecting;
        if (visible) { timer = setTimeout(loop, 400); } else clearTimeout(timer);
      }, { threshold: .35 }).observe(stage);
    }
    // gentle 3D tilt toward the pointer
    var phone = stage.querySelector('.phone');
    if (!reduced && window.matchMedia('(hover: hover)').matches) {
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        phone.style.setProperty('--ry', (x * 18) + 'deg'); phone.style.setProperty('--rx', (-y * 12) + 'deg');
      });
      stage.addEventListener('pointerleave', function () { phone.style.setProperty('--ry', '-8deg'); phone.style.setProperty('--rx', '4deg'); });
    }
  }
})();
