// GooeyNav — vanilla port of React Bits <GooeyNav /> (JS-CSS variant) for
// the top nav. Config: particleCount 15 · particleDistances [90, 10] ·
// particleR 100 · animationTime 600 · timeVariance 300 ·
// colors [1,2,3,1,2,3,1,4] (--gooey-color-1..4 = the four page colours).
// Click → particles burst + gooey pill blobs onto the item. The active item
// also follows the page in view while scrolling (no particles then); on
// the hero no item is active and the pill hides.
(function () {
  var nav = document.querySelector(".gooey-nav");
  if (!nav) return;
  var ul = nav.querySelector(".nav-links");
  var items = Array.prototype.slice.call(ul.querySelectorAll("li"));
  var filter = nav.querySelector(".gooey-filter");
  var textEl = nav.querySelector(".gooey-text");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ANIM = 600, COUNT = 15, DIST = [90, 10], R = 100, VAR = 300;
  var COLORS = [1, 2, 3, 1, 2, 3, 1, 4];
  var active = -1;

  var noise = function (n) { n = n === undefined ? 1 : n; return n / 2 - Math.random() * n; };
  function getXY(distance, i, total) {
    var angle = ((360 + noise(8)) / total) * i * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  }
  function makeParticles(filter) {
    if (reduce) return;
    filter.querySelectorAll(".gooey-particle").forEach(function (p) { p.remove(); });
    filter.style.setProperty("--time", ANIM * 2 + VAR + "ms");
    filter.classList.remove("is-active");
    for (var i = 0; i < COUNT; i++) {
      (function (i) {
        var t = ANIM * 2 + noise(VAR * 2);
        var rot = noise(R / 10);
        var start = getXY(DIST[0], COUNT - i, COUNT);
        var end = getXY(DIST[1] + noise(7), COUNT - i, COUNT);
        var colour = COLORS[Math.floor(Math.random() * COLORS.length)];
        setTimeout(function () {
          var particle = document.createElement("span");
          var point = document.createElement("span");
          particle.className = "gooey-particle";
          particle.style.cssText =
            "--start-x:" + start[0] + "px;--start-y:" + start[1] + "px;" +
            "--end-x:" + end[0] + "px;--end-y:" + end[1] + "px;--time:" + t + "ms;" +
            "--scale:" + (1 + noise(0.2)) + ";--color:var(--gooey-color-" + colour + ");" +
            "--rotate:" + (rot > 0 ? (rot + R / 20) * 10 : (rot - R / 20) * 10) + "deg";
          point.className = "gooey-point";
          particle.appendChild(point);
          filter.appendChild(particle);
          requestAnimationFrame(function () { filter.classList.add("is-active"); });
          setTimeout(function () { particle.remove(); }, t);
        }, 30);
      })(i);
    }
  }
  function place() {
    if (active < 0) {
      nav.classList.remove("has-active");
      return;
    }
    var li = items[active];
    var a = nav.getBoundingClientRect(), r = li.getBoundingClientRect();
    [filter, textEl].forEach(function (el) {
      el.style.left = r.left - a.left + "px";
      el.style.top = r.top - a.top + "px";
      el.style.width = r.width + "px";
      el.style.height = r.height + "px";
    });
    textEl.textContent = li.textContent.trim();
    nav.classList.add("has-active");
  }
  function setActive(i, burst) {
    if (i === active) return;
    active = i;
    items.forEach(function (li, j) {
      li.classList.toggle("is-active", j === i);
      var a = li.querySelector("a");
      if (j === i) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    place();
    if (i < 0) return;
    textEl.classList.remove("is-active");
    void textEl.offsetWidth;
    textEl.classList.add("is-active");
    if (burst) makeParticles(filter);
    else filter.classList.add("is-active");
  }

  // Click: burst. Scroll-following is paused briefly so the smooth scroll
  // passing over other sections doesn't move the pill mid-flight.
  var lockUntil = 0;
  items.forEach(function (li, i) {
    li.querySelector("a").addEventListener("click", function () {
      lockUntil = performance.now() + 1200;
      setActive(i, true);
    });
  });

  // Scroll-follow: which nav target's page is under the top third.
  var targets = items.map(function (li) {
    return document.querySelector(li.querySelector("a").getAttribute("href"));
  });
  var ticking = false;
  function spy() {
    ticking = false;
    if (performance.now() < lockUntil) return;
    var line = innerHeight * 0.35, idx = -1;
    targets.forEach(function (t, i) {
      if (!t) return;
      var r = t.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) idx = i;
    });
    setActive(idx, false);
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(spy); }
  }, { passive: true });
  window.addEventListener("resize", place);
  if (window.ResizeObserver) new ResizeObserver(place).observe(nav);
  spy();

  // Same burst on the hero's "查看作品 →": particles + a gooey pill that
  // blobs in behind the link and then fades (it's not a toggle). The jump
  // to 作品集 waits ~0.5s so the burst is seen before the page scrolls.
  var heroLink = document.querySelector(".hero-link");
  if (heroLink) {
    var fx = null;
    heroLink.addEventListener("click", function (e) {
      var target = document.querySelector(heroLink.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      // Created on demand: the fold-text script rebuilds this link's
      // contents on load, which would wipe an element added up front.
      if (!fx || !heroLink.contains(fx)) {
        fx = document.createElement("span");
        fx.className = "gooey-effect gooey-filter gooey-burst";
        fx.setAttribute("aria-hidden", "true");
        heroLink.appendChild(fx);
      }
      heroLink.classList.add("is-bursting");
      fx.classList.remove("is-active");
      makeParticles(fx);
      if (reduce) fx.classList.add("is-active");
      setTimeout(function () {
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
        if (history.replaceState) history.replaceState(null, "", heroLink.getAttribute("href"));
      }, reduce ? 0 : 520);
      setTimeout(function () {
        heroLink.classList.remove("is-bursting");
        fx.classList.remove("is-active");
      }, 1400);
    });
  }
})();
