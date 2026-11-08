// Error pages (404.html, 500.html). These are served for any URL, so the language is picked from
// the requested path (/en/…, /de/…), then the remembered choice, then Slovak. The copy for each
// language lives in the page itself as JSON (<script type="application/json" id="error-copy">).
(function () {
  var root = document.documentElement;
  var copy = JSON.parse(document.getElementById('error-copy').textContent);

  // The path below the site root (the <base> set in <head>), e.g. "en/missing-page"
  var siteRoot = new URL(document.baseURI).pathname;
  var path = location.pathname.indexOf(siteRoot) === 0 ? location.pathname.slice(siteRoot.length) : location.pathname.slice(1);
  var lang = (path.match(/^(en|de)(\/|$)/) || [])[1];
  if (!lang) { try { lang = localStorage.getItem('rs-language'); } catch (e) { /* storage blocked */ } }
  if (!copy[lang]) lang = 'sk';
  var t = copy[lang];
  var base = lang === 'sk' ? './' : lang + '/'; // relative to <base>

  // With a <base>, "#main" would point at the home page; keep the skip link on this page
  var skip = document.querySelector('.skip-link');
  if (skip) skip.setAttribute('href', location.pathname + location.search + '#main');

  root.lang = lang;
  document.title = t.title;
  document.querySelectorAll('[data-t]').forEach(function (el) {
    var value = t[el.getAttribute('data-t')];
    if (value != null) el.innerHTML = value;
  });
  document.querySelectorAll('[data-href]').forEach(function (el) {
    el.setAttribute('href', base + el.getAttribute('data-href'));
  });
  document.querySelectorAll('[data-t-label]').forEach(function (el) {
    el.setAttribute('aria-label', t[el.getAttribute('data-t-label')]);
  });
  var reload = document.querySelector('[data-reload]');
  if (reload) reload.addEventListener('click', function (e) { e.preventDefault(); location.reload(); });

  if (root.classList.contains('reduced-motion')) return;

  // ---------- Falling leaves ----------
  var SHAPES = ['#leaf-round', '#leaf-long'];
  var COLORS = [
    ['rgba(166, 217, 143, 0.22)', 'rgba(166, 217, 143, 0.4)'],
    ['rgba(125, 187, 106, 0.35)', 'rgba(166, 217, 143, 0.5)'],
    ['rgba(242, 193, 78, 0.28)', 'rgba(242, 193, 78, 0.5)'],
    ['rgba(63, 122, 79, 0.45)', 'rgba(125, 187, 106, 0.45)']
  ];
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var pick = function (list) { return list[Math.floor(Math.random() * list.length)]; };
  var leafSvg = function () {
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="' + pick(SHAPES) + '"/></svg>';
  };
  var paint = function (el) {
    var c = pick(COLORS);
    el.style.setProperty('--c', c[0]);
    el.style.setProperty('--c-line', c[1]);
  };

  var fall = document.querySelector('[data-fall]');
  var count = window.innerWidth < 700 ? 9 : 16;
  for (var i = 0; i < count; i++) {
    var leaf = document.createElement('div');
    var dur = rand(11, 22);
    leaf.className = 'fall-leaf';
    leaf.innerHTML = leafSvg();
    leaf.style.setProperty('--x', rand(0, 98) + '%');
    leaf.style.setProperty('--s', rand(16, 44) + 'px');
    leaf.style.setProperty('--t', dur + 's');
    leaf.style.setProperty('--delay', -rand(0, dur) + 's'); // already mid-fall on load
    leaf.style.setProperty('--swing', rand(14, 46) + 'px');
    leaf.style.setProperty('--r', rand(0, 360) + 'deg');
    paint(leaf);
    fall.appendChild(leaf);
  }

  // ---------- Click: a small gust of leaves ----------
  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest('a, button')) return;
    for (var j = 0; j < 7; j++) {
      var g = document.createElement('div');
      var angle = rand(0, Math.PI * 2), dist = rand(70, 180);
      g.className = 'gust-leaf';
      g.innerHTML = leafSvg();
      g.style.left = e.clientX + 'px';
      g.style.top = e.clientY + 'px';
      g.style.setProperty('--s', rand(14, 30) + 'px');
      g.style.setProperty('--gx', Math.cos(angle) * dist + 'px');
      g.style.setProperty('--gy', Math.sin(angle) * dist + 60 + 'px');
      g.style.setProperty('--gr', rand(-260, 260) + 'deg');
      paint(g);
      g.addEventListener('animationend', function () { this.remove(); });
      document.body.appendChild(g);
    }
  });

  // ---------- Pointer depth on the floating leaves (same feel as the home hero) ----------
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var layers = Array.prototype.map.call(document.querySelectorAll('.err [data-depth]'), function (el) {
    return { el: el, depth: parseFloat(el.getAttribute('data-depth')) || 0, x: 0, y: 0 };
  });
  var tx = 0, ty = 0, frame = 0;
  var tick = function () {
    var moving = false;
    layers.forEach(function (l) {
      l.x += (tx * l.depth - l.x) * 0.08;
      l.y += (ty * l.depth - l.y) * 0.08;
      if (Math.abs(tx * l.depth - l.x) > 0.1 || Math.abs(ty * l.depth - l.y) > 0.1) moving = true;
      l.el.style.transform = 'translate3d(' + l.x.toFixed(2) + 'px,' + l.y.toFixed(2) + 'px,0)';
    });
    frame = moving ? requestAnimationFrame(tick) : 0;
  };
  window.addEventListener('pointermove', function (e) {
    tx = e.clientX / window.innerWidth - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
    if (!frame) frame = requestAnimationFrame(tick);
  });
})();
