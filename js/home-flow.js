// Home page browsing layer -- see css/home-flow.css.
// Native scroll only (no smoothing library, so nothing lags); every effect is
// measured live from getBoundingClientRect inside one rAF per scroll, so it
// always rewinds exactly when scrolling back up.
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.remove("snap-pages");
  root.classList.add("flow-home");

  var isDark = function () { return root.getAttribute("data-theme") === "dark"; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  // ---- backdrop ---------------------------------------------------------------
  var bg = document.createElement("div");
  bg.className = "flow-bg"; bg.setAttribute("aria-hidden", "true");
  bg.innerHTML = '';
  document.body.insertBefore(bg, document.body.firstChild);
  
  // floating shapes
  var KINDS = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8.5"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>',
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z" transform="translate(0 3)"/></svg>',
    '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 4l8.5 15h-17z"/></svg>'
  ];
  var shapes = [];
  var N = 0; // pages are opaque now (stacked layout), so no backdrop shapes
  for (var i = 0; i < N; i++) {
    var el = document.createElement("div");
    el.className = "flow-shape";
    var size = 10 + ((i * 37) % 19);
    el.style.width = el.style.height = size + "px";
    el.innerHTML = KINDS[i % KINDS.length];
    bg.appendChild(el);
    shapes.push({
      el: el,
      x: ((i * 61.8) % 100) / 100,           // spread across the width
      y: ((i * 38.2 + 13) % 100) / 100,       // and the height
      depth: 0.12 + ((i * 7) % 10) / 22,      // parallax speed
      spin: (i % 2 ? 1 : -1) * (6 + (i % 5) * 3),
      bob: 4 + (i % 4) * 3, phase: i * 1.7
    });
  }

  // ---- progress line ----------------------------------------------------------
  var bar = document.createElement("div");
  bar.className = "flow-progress"; bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  // ---- nav tuck -----------------------------------------------------------------
  var nav = document.querySelector(".nav");
  var lastY = window.scrollY;

  // ---- lagging headings ------------------------------------------------------------
  var heads = []; // heading lag off in the stacked layout

  // ---- reveal ----------------------------------------------------------------------
  var rv = [].slice.call(document.querySelectorAll(
    "#about .about-layout, .projects-page-more .pc, #contact .contact-text, #contact .contact-links"));
  if (!reduce && "IntersectionObserver" in window) {
    rv.forEach(function (e) { e.classList.add("flow-rv"); });
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("flow-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -12% 0px" });
    rv.forEach(function (e) { io.observe(e); });
  }

  // ---- pinned horizontal 精选项目 -----------------------------------------------------
  var pin = null;
  var featured = document.querySelector(".projects-page-featured");
  var mq = window.matchMedia("(min-width: 1024px)");
  function buildPin() {
    if (!featured || pin) return;
    var row = featured.querySelector(".feature-row");
    if (!row) return;
    var stage = document.createElement("div"); stage.className = "flow-pin-stage";
    while (featured.firstChild) stage.appendChild(featured.firstChild);
    var cards = row.querySelectorAll(".feature-card");
    var meta = document.createElement("div"); meta.className = "flow-pin-meta";
    meta.innerHTML = '<span><b class="n">01</b> / ' + String(cards.length).padStart(2, "0") + '</span><span class="flow-pin-bar"><i></i></span><span>SCROLL →</span>';
    stage.appendChild(meta);
    featured.appendChild(stage);
    featured.classList.add("flow-pin");
    pin = { stage: stage, row: row, cards: cards, num: meta.querySelector(".n"), fill: meta.querySelector(".flow-pin-bar i"), dist: 0 };
    sizePin();
  }
  function destroyPin() {
    if (!pin) return;
    while (pin.stage.firstChild) {
      if (pin.stage.firstChild.classList && pin.stage.firstChild.classList.contains("flow-pin-meta")) { pin.stage.removeChild(pin.stage.firstChild); continue; }
      featured.insertBefore(pin.stage.firstChild, pin.stage);
    }
    pin.stage.remove();
    featured.classList.remove("flow-pin"); featured.style.height = "";
    pin.row.style.transform = ""; root.style.removeProperty("--flow-row-w");
    pin = null;
  }
  function sizePin() {
    if (!pin) return;
    var vw = window.innerWidth, vh = window.innerHeight;
    var cardW = Math.min(vw * 0.36, 600), gap = 16, n = pin.cards.length;
    var rowW = n * cardW + (n - 1) * gap;
    root.style.setProperty("--flow-row-w", rowW + "px");
    var cs = getComputedStyle(pin.stage);
    var inner = pin.stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    pin.dist = Math.max(0, rowW - inner);
    featured.style.height = (vh + pin.dist * 1.1) + "px";
  }
  function paintPin() {
    if (!pin) return;
    var r = featured.getBoundingClientRect();
    var span = featured.offsetHeight - window.innerHeight;
    var p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
    pin.row.style.transform = "translate3d(" + (-pin.dist * p).toFixed(1) + "px,0,0)";
    pin.fill.style.transform = "scaleX(" + p.toFixed(4) + ")";
    pin.num.textContent = String(Math.min(pin.cards.length, Math.round(p * (pin.cards.length - 1)) + 1)).padStart(2, "0");
  }
  function applyMq() { if (mq.matches && !reduce) buildPin(); else destroyPin(); }
  // (pinned horizontal gallery switched off: all five cards now sit on one screen)

  // ---- frame ----------------------------------------------------------------------
  // ---- 精选项目 hover-expand gallery ----------------------------------------------------
  (function () {
    var row = document.querySelector(".feature-row");
    if (!row) return;
    var cards = [].slice.call(row.querySelectorAll(".feature-card"));
    if (!cards.length) return;
    var open = function (c) { cards.forEach(function (k) { k.classList.toggle("is-open", k === c); }); };
    open(cards[0]);
    cards.forEach(function (c) {
      c.addEventListener("mouseenter", function () { open(c); });
      c.addEventListener("focusin", function () { open(c); });
    });
    row.addEventListener("mouseleave", function () { open(cards[0]); });
    row.addEventListener("focusout", function (e) { if (!row.contains(e.relatedTarget)) open(cards[0]); });
  })();

  // ---- stacked pages ------------------------------------------------------------------
  var pages = [].slice.call(document.querySelectorAll("#home, #about, .projects-page-featured, .projects-page-more, #contact"));
  pages.forEach(function (p, i) {
    p.classList.add("flow-page"); if (i) p.classList.add("flow-next"); p.style.zIndex = 10 + i;
    if (i < pages.length - 1) { var d = document.createElement("div"); d.className = "flow-dwell"; d.setAttribute("aria-hidden", "true"); p.parentNode.insertBefore(d, p.nextSibling); }
  });
  function sizePages() {
    var vh = window.innerHeight;
    pages.forEach(function (p) { p.style.setProperty("--stick", Math.min(0, vh - p.offsetHeight) + "px"); });
  }
  function paintPages() {
    if (reduce) return;
    var vh = window.innerHeight;
    pages.forEach(function (p, i) {
      var n = pages[i + 1];
      var o = n ? clamp((vh - n.getBoundingClientRect().top) / vh, 0, 1) : 0;
      p.style.setProperty("--cover", o.toFixed(3));
    });
  }
  sizePages();

  var scrollDirty = true;
  function frame(now) {
    var t = now / 1000, y = window.scrollY, vw = window.innerWidth, vh = window.innerHeight;
    var max = Math.max(1, root.scrollHeight - vh), p = clamp(y / max, 0, 1);

    if (scrollDirty) {
      scrollDirty = false;
      bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      if (nav) {
        var down = y > lastY + 4, up = y < lastY - 4;
        if (y < vh * 0.6 || up) nav.classList.remove("flow-tuck");
        else if (down) nav.classList.add("flow-tuck");
        if (down || up) lastY = y;
      }
      heads.forEach(function (h) {
        var r = h.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var off = clamp((r.top - vh * 0.35) * 0.04, -16, 16);
        h.style.transform = "translate3d(0," + off.toFixed(1) + "px,0)";
      });
      paintPin();
      paintPages();
    }


    var H = vh + 160;
    shapes.forEach(function (s) {
      var yy = ((s.y * H - y * s.depth) % H + H) % H - 80;
      var bob = reduce ? 0 : Math.sin(t * 0.6 + s.phase) * s.bob;
      var rot = (reduce ? 0 : t * s.spin) + y * 0.04 * s.spin / 10;
      s.el.style.transform = "translate3d(" + (s.x * vw).toFixed(1) + "px," + (yy + bob).toFixed(1) + "px,0) rotate(" + rot.toFixed(1) + "deg)";
    });

    requestAnimationFrame(frame);
  }
  window.addEventListener("scroll", function () { scrollDirty = true; }, { passive: true });
  window.addEventListener("resize", function () { sizePin(); sizePages(); scrollDirty = true; });
  window.addEventListener("load", function () { sizePin(); sizePages(); scrollDirty = true; });
  if (window.ResizeObserver) { var ro = new ResizeObserver(function () { sizePages(); scrollDirty = true; }); pages.forEach(function (p) { ro.observe(p); }); }
  requestAnimationFrame(frame);
})();
