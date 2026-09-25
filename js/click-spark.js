// ClickSpark — vanilla port of React Bits <ClickSpark /> (JS-CSS variant),
// applied site-wide: one fixed, click-through canvas over the viewport;
// every click bursts sparkCount short lines out from the pointer.
// Config: sparkSize 10 · sparkRadius 15 · sparkCount 8 · duration 400ms ·
// ease-out · extraScale 1. Colour: the React Bits default (#fff) is
// invisible on this site's light pages, so each burst takes the colour of
// the page it lands on (that page's title colour, else the site accent).
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var SIZE = 10, RADIUS = 15, COUNT = 8, DURATION = 400, EXTRA = 1;
  var ease = function (t) { return t * (2 - t); }; // ease-out

  var canvas = document.createElement("canvas");
  canvas.className = "click-spark";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");
  var sparks = [], raf = 0, dpr = 1;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
  }
  resize();
  window.addEventListener("resize", resize);

  function colourAt(target) {
    var el = target && target.closest ? target.closest("#about, .projects-page, #contact, .hero") : null;
    var cs = getComputedStyle(el || document.documentElement);
    return (cs.getPropertyValue("--page-title") || cs.getPropertyValue("--accent") || "#4a5ff0").trim();
  }

  function draw(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    sparks = sparks.filter(function (s) {
      var elapsed = now - s.start;
      if (elapsed >= DURATION) return false;
      var e = ease(elapsed / DURATION);
      var dist = e * RADIUS * EXTRA, len = SIZE * (1 - e);
      ctx.strokeStyle = s.colour;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x + dist * Math.cos(s.angle), s.y + dist * Math.sin(s.angle));
      ctx.lineTo(s.x + (dist + len) * Math.cos(s.angle), s.y + (dist + len) * Math.sin(s.angle));
      ctx.stroke();
      return true;
    });
    raf = sparks.length ? requestAnimationFrame(draw) : 0; // idle when nothing to draw
  }

  document.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    var now = performance.now(), colour = colourAt(e.target);
    for (var i = 0; i < COUNT; i++) {
      sparks.push({ x: e.clientX, y: e.clientY, angle: (2 * Math.PI * i) / COUNT, start: now, colour: colour });
    }
    if (!raf) raf = requestAnimationFrame(draw);
  }, { passive: true });
})();
