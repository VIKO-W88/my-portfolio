// Case-study scroll layer -- a port of aagamdoshi/PortFolio-Website:
//   useLenisSmooth  -> Lenis (lerp .085, duration 1.35) + ScrollTrigger
//   [data-reveal]   -> y 72, opacity 0, 1s power3.out, start "top 88%", once
//   [data-stagger]  -> items y 56, 0.85s, stagger .1, start "top 82%", once
//   [data-parallax] -> yPercent -speed*100, scrubbed across the section
//   hero content    -> yPercent 28, opacity .15 as the hero scrolls away
//   TiltCard        -> perspective(800px) rotate +-5deg, scale 1.02 on hover
//   Projects        -> pinned horizontal track, one slide per viewport,
//                      slides scale/fade/drop by distance from centre, 01 / 04
//   SectionRail     -> dots + labels + up/down, active at the middle 30%
//   ScrollProgress  -> 000 / 100, bottom left
//   ScrollBackdrop  -> wireframe orb + ring travelling with scroll progress
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var sections = [].slice.call(document.querySelectorAll(".case-section"))
    .filter(function (s) { return s.querySelector(":scope > h2"); });
  if (!sections.length) return;

  // ---- chapters -------------------------------------------------------------
  var LABELS = { "项目背景": "Background", "最终方案": "Solution", "竞品分析": "Competitors", "设计策略": "Strategy", "方案探索": "Exploration", "用户研究": "Research", "设计方案": "Design", "设计过程": "Process", "可用性测试": "Testing", "总结": "Reflection" };
  var hero = document.querySelector(".my-hero-banner") || document.querySelector(".case-hero");
  if (hero && !hero.id) hero.id = "cs-top";
  var chapters = hero ? [{ id: hero.id, el: hero, label: "开始" }] : [];
  sections.forEach(function (s, i) {
    var h2 = s.querySelector(":scope > h2");
    var text = h2.textContent.trim();
    var name = text.replace(/^\d+\s*/, "");
    if (!s.id) s.id = "cs-chapter-" + (i + 1);
    chapters.push({ id: s.id, el: s, label: name });
    var label = document.createElement("span");
    label.className = "cs-label";
    label.textContent = (LABELS[name] || "Chapter") + " · " + String(i + 1).padStart(2, "0");
    h2.parentNode.insertBefore(label, h2);
  });

  // ---- Lenis + scrollToSection ------------------------------------------------
  var lenis = null;
  function scrollToSection(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -72, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }

  // ---- SectionRail --------------------------------------------------------------
  var rail = document.createElement("aside");
  rail.className = "cs-rail";
  rail.setAttribute("aria-label", "章节导航");
  var prev = document.createElement("button");
  prev.type = "button"; prev.className = "cs-rail-btn"; prev.textContent = "↑"; prev.setAttribute("aria-label", "上一章");
  var next = document.createElement("button");
  next.type = "button"; next.className = "cs-rail-btn"; next.textContent = "↓"; next.setAttribute("aria-label", "下一章");
  var dotsWrap = document.createElement("div"); dotsWrap.className = "cs-rail-dots";
  var items = chapters.map(function (c) {
    var item = document.createElement("div"); item.className = "cs-rail-item";
    var lab = document.createElement("span"); lab.className = "cs-rail-label"; lab.textContent = c.label;
    var dot = document.createElement("button"); dot.type = "button"; dot.className = "cs-rail-dot"; dot.setAttribute("aria-label", "跳到 " + c.label);
    dot.addEventListener("click", function () { scrollToSection(c.id); });
    item.appendChild(lab); item.appendChild(dot); dotsWrap.appendChild(item);
    return item;
  });
  rail.appendChild(prev); rail.appendChild(dotsWrap); rail.appendChild(next);
  document.body.appendChild(rail);
  var active = 0;
  function setActive(i) {
    active = i;
    items.forEach(function (it, j) { it.classList.toggle("is-active", j === i); });
    items[i].querySelector(".cs-rail-dot").setAttribute("aria-current", "true");
    prev.disabled = i <= 0; next.disabled = i >= chapters.length - 1;
  }
  setActive(0);
  prev.addEventListener("click", function () { if (active > 0) scrollToSection(chapters[active - 1].id); });
  next.addEventListener("click", function () { if (active < chapters.length - 1) scrollToSection(chapters[active + 1].id); });
  if ("IntersectionObserver" in window) {
    chapters.forEach(function (c, i) {
      new IntersectionObserver(function (es) { if (es[0].isIntersecting) setActive(i); }, { rootMargin: "-35% 0px -35% 0px", threshold: 0 }).observe(c.el);
    });
  }

  // ---- ScrollProgress ------------------------------------------------------------
  var prog = document.createElement("div");
  prog.className = "cs-progress"; prog.setAttribute("aria-hidden", "true");
  prog.innerHTML = "<b>000</b><i>/</i>100";
  document.body.appendChild(prog);
  var progNum = prog.querySelector("b");
  var scrollP = 0;
  function readProgress(y) {
    var limit = document.documentElement.scrollHeight - window.innerHeight;
    scrollP = limit > 0 ? Math.min(1, Math.max(0, y / limit)) : 0;
  }

  if (reduce || !window.gsap || !window.ScrollTrigger) {
    window.addEventListener("scroll", function () { readProgress(window.scrollY); progNum.textContent = String(Math.round(scrollP * 100)).padStart(3, "0"); }, { passive: true });
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // (ScrollBackdrop wireframe orb removed at the user's request)

  // ---- Lenis (same settings as the reference) ------------------------------------
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, duration: 1.35, smoothWheel: true });
    lenis.on("scroll", function (inst) { ScrollTrigger.update(); readProgress(inst.scroll); });
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    window.addEventListener("scroll", function () { readProgress(window.scrollY); progNum.textContent = String(Math.round(scrollP * 100)).padStart(3, "0"); }, { passive: true });
  }

  // ---- hero content drift --------------------------------------------------------
  var heroImg = document.querySelector(".my-hero-banner img");
  if (heroImg) {
    // measured live on every scroll (not a cached ScrollTrigger start), so it always
    // returns exactly to the untouched banner at the top of the page
    var heroBox = heroImg.parentNode, heroRaf = 0;
    var heroPaint = function () {
      heroRaf = 0;
      var r = heroBox.getBoundingClientRect();
      var p = window.scrollY <= 1 ? 0 : Math.min(1, Math.max(0, -r.top / (r.height || 1)));
      if (p === 0) { gsap.set(heroImg, { clearProps: "transform,opacity" }); return; }
      gsap.set(heroImg, { yPercent: 28 * p, opacity: 1 - 0.85 * p });
    };
    window.addEventListener("scroll", function () { if (!heroRaf) heroRaf = requestAnimationFrame(heroPaint); }, { passive: true });
    window.addEventListener("resize", heroPaint);
    heroPaint();
  }

  // ---- [data-reveal] ----------------------------------------------------------------
  function reveal(el) {
    gsap.from(el, { y: 72, opacity: 0, duration: 1, ease: "power3.out", clearProps: "transform,opacity", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
  }
  [".case-hero", ".meta-bar"].forEach(function (sel) { var el = document.querySelector(sel); if (el) reveal(el); });

  // ---- [data-stagger] -------------------------------------------------------------
  var STAGGER = ".strategy-flow, .bm-strategy-grid, .bm-scenarios, .flow-steps, .insight-grid, .bm-option-list, .bm-options";
  function stagger(container) {
    var kids = [].slice.call(container.children);
    if (!kids.length) return;
    gsap.from(kids, { y: 56, opacity: 0, duration: 0.85, stagger: 0.1, ease: "power3.out", clearProps: "transform,opacity", scrollTrigger: { trigger: container, start: "top 82%", once: true } });
  }

  sections.forEach(function (s) {
    [].forEach.call(s.children, function (el) {
      if (el.matches(STAGGER)) stagger(el);
      else reveal(el);
    });
    s.querySelectorAll(".bm-option .bm-option-list").forEach(stagger);
  });

  // ---- [data-parallax] --------------------------------------------------------------


  // ---- Projects-style pinned horizontal showcase for each option group -----------------
  document.querySelectorAll(".bm-options").forEach(function (group) {
    var opts = [].slice.call(group.querySelectorAll(":scope > .bm-option"));
    if (opts.length < 2) return;
    var total = opts.length;
    var title = group.previousElementSibling;
    while (title && !/^H[23]$/.test(title.tagName)) title = title.previousElementSibling;
    var hz = document.createElement("div"); hz.className = "cs-hz";
    var track = document.createElement("div"); track.className = "cs-hz-track";
    opts.forEach(function (o, i) {
      var name = (o.querySelector(".bm-option-name") || {}).textContent || ("方案 " + (i + 1));
      var tag = (o.querySelector(".bm-option-tag") || {}).textContent || "";
      var img = o.querySelector("img");
      var slide = document.createElement("article"); slide.className = "cs-hz-slide";
      var body = o.querySelector(".bm-option-list, .bm-scenario-note");
      slide.innerHTML =
        '<div class="cs-hz-grid"><div class="cs-hz-media"><div class="cs-hz-img"></div></div>' +
        '<div><p class="cs-hz-kicker"></p><h4 class="cs-hz-title"></h4><div class="cs-hz-body"></div></div></div>';
      if (img) { var im = img.cloneNode(true); im.removeAttribute("loading"); slide.querySelector(".cs-hz-img").appendChild(im); }
      slide.querySelector(".cs-hz-kicker").textContent = name.trim() + " · " + String(i + 1).padStart(2, "0");
      slide.querySelector(".cs-hz-title").textContent = tag.trim();
      if (body) slide.querySelector(".cs-hz-body").appendChild(body.cloneNode(true));
      track.appendChild(slide);
    });
    // Sticky (not pinned): the outer box is as tall as the sideways travel,
    // the inner stage sticks to the viewport while the track slides.
    // The heading that introduces this group (label, title, intro line) moves
    // into the top of the white stage, so it reads as this block's own title.
    var heads = [];
    var prevEl = group.previousElementSibling;
    while (prevEl && prevEl.matches("p, h2, h3, .cs-label")) { heads.unshift(prevEl); prevEl = prevEl.previousElementSibling; }
    var stage = document.createElement("div"); stage.className = "cs-hz-stage";
    var head = document.createElement("div"); head.className = "cs-hz-head";
    heads.forEach(function (h) { var c = h.cloneNode(true); c.removeAttribute("style"); head.appendChild(c); });
    var view = document.createElement("div"); view.className = "cs-hz-view";
    view.innerHTML = '<div class="cs-hz-meta r"><b>01</b> / ' + String(total).padStart(2, "0") + '</div><div class="cs-hz-hint">Scroll<span>↓</span></div>';
    view.appendChild(track);
    stage.appendChild(head); stage.appendChild(view);
    hz.appendChild(stage);
    group.parentNode.insertBefore(hz, group.nextSibling);

    var mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", function () {
      group.classList.add("cs-hz-source");
      heads.forEach(function (h) { h.classList.add("cs-hz-source"); });
      var slides = [].slice.call(track.children);
      var counter = view.querySelector(".cs-hz-meta.r b"), hint = view.querySelector(".cs-hz-hint");
      // Slides are centred one at a time; each step costs ~0.7 screen of scroll
      // whatever the screen width, so no slide lingers for several screens.
      var slideW = function () { return slides[0].offsetWidth; };
      var dist = function () { return (total - 1) * slideW(); };
      var size = function () {
        track.style.paddingLeft = Math.max(0, (view.offsetWidth - slideW()) / 2) + "px";
        track.style.paddingRight = track.style.paddingLeft;
        hz.style.height = (window.innerHeight * (1 + (total - 1) * 0.7)) + "px";
      };
      size();
      function paint(p) {
        gsap.set(track, { x: -dist() * p });
        hint.classList.toggle("is-hidden", p >= 0.92);
        var sp = p * Math.max(total - 1, 1);
        counter.textContent = String(Math.min(Math.round(sp), total - 1) + 1).padStart(2, "0");
        slides.forEach(function (slide, i) {
          var d = Math.abs(i - sp);
          gsap.set(slide, { scale: Math.max(0.9, 1 - d * 0.08), opacity: Math.max(0.25, 1 - d * 0.6), y: 0 });
          var m = slide.querySelector(".cs-hz-img");
          if (m) gsap.set(m, { x: d * -40 * Math.sign(i - sp) });
        });
      }
      paint(0);
      // Progress is read live from where the box sits on screen right now, so
      // it is always correct in both directions, whatever loaded above it.
      var smooth = { p: 0 }, target = -1, raf = 0;
      function measure() {
        raf = 0;
        var r = hz.getBoundingClientRect();
        var len = r.height - window.innerHeight;
        var p = len > 0 ? Math.min(1, Math.max(0, -r.top / len)) : 0;
        if (p === target) return;
        target = p;
        gsap.to(smooth, { p: p, duration: 0.45, ease: "power2.out", overwrite: true, onUpdate: function () { paint(smooth.p); } });
      }
      function onScroll() { if (!raf) raf = requestAnimationFrame(measure); }
      function onResize() { size(); onScroll(); }
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);
      measure();
      return function () {
        window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize);
        hz.style.height = ""; group.classList.remove("cs-hz-source"); gsap.set(track, { x: 0 });
        heads.forEach(function (h) { h.classList.remove("cs-hz-source"); });
      };
    });
  });

  // ---- Final solution: a pinned walkthrough (intro mockup -> 3 steps) -------
  document.querySelectorAll(".bm-hero-mockup").forEach(function (mock) {
    var sec = mock.closest(".case-section");
    var shotsRow = null, flow = null, el = mock.nextElementSibling;
    while (el) {
      if (!flow && el.matches(".flow-steps")) flow = el;
      if (!shotsRow && el.matches(".bm-scenarios:not(.cols-4)")) { shotsRow = el; break; }
      el = el.nextElementSibling;
    }
    if (!shotsRow) return;
    var cols = [].slice.call(shotsRow.children).filter(function (c) { return c.querySelector("img"); });
    var labels = flow ? [].slice.call(flow.querySelectorAll(".flow-label")).map(function (l) { return l.textContent.trim(); }) : [];
    var heads = [];
    var hEl = mock.previousElementSibling;
    while (hEl && hEl.matches("p, h2, h3, .cs-label")) { heads.unshift(hEl); hEl = hEl.previousElementSibling; }

    var box = document.createElement("div"); box.className = "cs-st";
    var stage = document.createElement("div"); stage.className = "cs-st-stage";
    var head = document.createElement("div"); head.className = "cs-hz-head";
    heads.forEach(function (h) { var c = h.cloneNode(true); c.removeAttribute("style"); head.appendChild(c); });
    var body = document.createElement("div"); body.className = "cs-st-body";
    // intro layer: the hand-held mockup
    var intro = document.createElement("div"); intro.className = "cs-st-intro";
    var mi = mock.querySelector("img").cloneNode(true); mi.removeAttribute("loading"); mi.removeAttribute("style"); intro.appendChild(mi);
    // flow layer: steps on the left, phone on the right
    var flowL = document.createElement("div"); flowL.className = "cs-st-flow";
    var steps = document.createElement("ol"); steps.className = "cs-st-steps";
    steps.innerHTML = '<span class="cs-st-line"><i></i></span>';
    var phone = document.createElement("div"); phone.className = "cs-st-phone";
    var screen = document.createElement("div"); screen.className = "cs-st-screen";
    var bezel = document.createElement("div"); bezel.className = "cs-st-bezel";
    var island = document.createElement("i"); island.className = "cs-st-island";
    screen.appendChild(island); bezel.appendChild(screen); phone.appendChild(bezel);
    var stepTitles = cols.map(function (c) { var n = c.querySelector(".case-note, p"); return n ? n.textContent.trim() : ""; });
    var kick = [labels[0] && labels[1] ? labels[0] + " → " + labels[1] : (labels[0] || ""), labels[2] || "", "快捷问题"];
    cols.forEach(function (c, i) {
      var li = document.createElement("li"); li.className = "cs-st-step";
      li.innerHTML = '<span class="cs-st-num"></span><div><p class="cs-st-kick"></p><h4 class="cs-st-title"></h4></div>';
      li.querySelector(".cs-st-num").textContent = String(i + 1).padStart(2, "0");
      li.querySelector(".cs-st-kick").textContent = kick[i] || "";
      li.querySelector(".cs-st-title").textContent = stepTitles[i];
      steps.appendChild(li);
      var im = c.querySelector("img").cloneNode(true); im.removeAttribute("loading"); im.className = "cs-st-shot";
      screen.appendChild(im);
    });
    flowL.appendChild(steps); flowL.appendChild(phone);
    body.appendChild(intro); body.appendChild(flowL);
    stage.appendChild(head); stage.appendChild(body); box.appendChild(stage);
    mock.parentNode.insertBefore(box, mock);
    // keep the rest of 02 (why it works + answer patterns) on the same white ground as the stage,
    // so the module reads as one block instead of being cut off after the walkthrough
    var after = document.createElement("div"); after.className = "cs-st-after";
    var afterIn = document.createElement("div"); afterIn.className = "cs-st-after-in";
    after.appendChild(afterIn);
    var nx = shotsRow.nextElementSibling;
    while (nx) { var nn = nx.nextElementSibling; afterIn.appendChild(nx); nx = nn; }
    if (afterIn.children.length) { shotsRow.parentNode.appendChild(after); shotsRow.parentNode.classList.add("cs-st-section"); }

    var hideList = heads.concat([mock, flow, shotsRow]).filter(Boolean);
    var mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", function () {
      hideList.forEach(function (h) { h.classList.add("cs-hz-source"); });
      var shots = [].slice.call(screen.querySelectorAll(".cs-st-shot")), items = [].slice.call(steps.querySelectorAll(".cs-st-step"));
      var line = steps.querySelector(".cs-st-line i");
      var n = shots.length, INTRO = 0.24, cur = -1;
      var size = function () { box.style.height = (window.innerHeight * (1 + (n + 1) * 0.85)) + "px"; };
      size();
      gsap.set(shots, { yPercent: 14, opacity: 0, scale: 0.96 });
      // the two AI-answer screenshots were exported with a wider right margin (~22px vs ~68px of 1125); nudge them to optical centre
      gsap.set(shots, { xPercent: function (k, el) { return /answer-page/.test(el.src) ? 2.05 : 0; } });
      function show(i) {
        if (i === cur) return;
        var dir = i > cur ? 1 : -1; cur = i;
        shots.forEach(function (sh, j) {
          if (j === i) gsap.to(sh, { yPercent: 0, opacity: 1, scale: 1, duration: 0.6, ease: "power3.out", overwrite: true });
          else gsap.to(sh, { yPercent: j < i ? -14 : 14, opacity: 0, scale: 0.96, duration: 0.5, ease: "power3.out", overwrite: true });
        });
        items.forEach(function (it, j) { it.classList.toggle("is-on", j === i); it.classList.toggle("is-done", j < i); });
      }
      function paint(p) {
        // intro: the mockup grows, then hands over to the walkthrough
        var a = Math.min(1, p / INTRO);
        gsap.set(mi, { scale: 0.9 + a * 0.14, y: (1 - a) * 40 });
        var fade = Math.min(1, Math.max(0, (p - INTRO * 0.7) / (INTRO * 0.45)));
        gsap.set(intro, { opacity: 1 - fade });
        gsap.set(flowL, { opacity: fade, y: (1 - fade) * 40 });
        var sProg = Math.min(1, Math.max(0, (p - INTRO) / (1 - INTRO))); // 0..1 across the steps
        var s = sProg * n;
        show(Math.min(n - 1, Math.floor(s)));
        line.style.transform = "scaleY(" + Math.min(1, s / n + 0.001) + ")";
        gsap.set(phone, { clearProps: "transform" });
      }
      var smooth = { p: 0 }, target = -1, raf = 0;
      function measure() {
        raf = 0;
        var r = box.getBoundingClientRect(), len = r.height - window.innerHeight;
        var p = len > 0 ? Math.min(1, Math.max(0, -r.top / len)) : 0;
        if (p === target) return;
        target = p;
        gsap.to(smooth, { p: p, duration: 0.45, ease: "power2.out", overwrite: true, onUpdate: function () { paint(smooth.p); } });
      }
      function onScroll() { if (!raf) raf = requestAnimationFrame(measure); }
      function onResize() { size(); onScroll(); }
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);
      paint(0); measure();
      return function () {
        window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize);
        box.style.height = ""; hideList.forEach(function (h) { h.classList.remove("cs-hz-source"); });
      };
    });
  });

  // Lazy images change the page height after load; re-measure every pinned
  // section whenever that happens so nothing pins in the wrong place.
  var rt = 0;
  function refreshSoon() { clearTimeout(rt); rt = setTimeout(function () { ScrollTrigger.refresh(); }, 150); }
  if ("ResizeObserver" in window) {
    var lastH = 0;
    new ResizeObserver(function () {
      var h = document.documentElement.scrollHeight;
      if (Math.abs(h - lastH) > 2) { lastH = h; refreshSoon(); }
    }).observe(document.querySelector("main") || document.body);
  }
  document.querySelectorAll("main img").forEach(function (img) {
    if (!img.complete) img.addEventListener("load", refreshSoon, { once: true });
  });
  setTimeout(function () { ScrollTrigger.refresh(); }, 400);
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  window.addEventListener("resize", function () { ScrollTrigger.refresh(); });
})();
