// PixelSwap — vanilla port of React Bits <PixelSwap /> (JS-CSS variant).
// Markup: <el class="pixel-swap"> with two children
//   .ps-layer[data-layer="0"] (first content) and .ps-layer[data-layer="1"].
// The incoming layer is revealed through a grid of square "windows", each
// showing its own clone of that layer; windows scale/fade in in random
// order. Options via data-attributes (defaults = the React Bits config):
//   data-pixel-size 64 · data-gap 0 · data-pixel-radius 0 · data-pixel-spin 0
//   data-pixel-scale 0.35 · data-duration 1400 · data-pixel-duration 450
//   data-pattern random · data-randomness 0 · data-fade true
//   data-trigger hover|click (hover = mouse enter/leave + focus/blur; on
//   touch screens the first tap reveals, the next tap follows the link)
(function () {
  var MAX_PIXELS = 220, STEPS = 14;
  var clamp = function (v, a, b) { return Math.min(Math.max(v, a), b); };
  var noise = function (s) { var v = Math.sin(s * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  var PATTERNS = {
    random: function () { return null; },
    center: function (x, y) { return Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2; },
    edges: function (x, y) { return Math.min(x, 1 - x, y, 1 - y) * 2; },
    "left-to-right": function (x) { return x; },
    "right-to-left": function (x) { return 1 - x; },
    "top-to-bottom": function (_x, y) { return y; },
    "bottom-to-top": function (_x, y) { return 1 - y; },
    diagonal: function (x, y) { return (x + y) / 2; }
  };
  function bezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    return function (p) {
      var t = p;
      for (var i = 0; i < 5; i++) {
        var slope = (3 * ax * t + 2 * bx) * t + cx;
        if (!slope) break;
        t -= (((ax * t + bx) * t + cx) * t - p) / slope;
      }
      t = clamp(t, 0, 1);
      return ((ay * t + by) * t + cy) * t;
    };
  }
  var ease = bezier(0.22, 1, 0.36, 1);
  function coverScale(size, gap, radius) {
    var p = clamp(radius, 0, 50) / 100;
    var corner = Math.SQRT1_2 / (Math.SQRT2 * (0.5 - p) + p);
    return ((size + gap) / size) * Math.max(1, corner);
  }
  function buildGrid(w, h, size, gap, pattern, randomness) {
    var cols = Math.max(1, Math.ceil((w + gap) / (size + gap)));
    var rows = Math.max(1, Math.ceil((h + gap) / (size + gap)));
    if (cols * rows > MAX_PIXELS) {
      size = Math.ceil(size * Math.sqrt((cols * rows) / MAX_PIXELS));
      cols = Math.max(1, Math.ceil((w + gap) / (size + gap)));
      rows = Math.max(1, Math.ceil((h + gap) / (size + gap)));
    }
    var stride = size + gap;
    var ox = (w - (cols * stride - gap)) / 2, oy = (h - (rows * stride - gap)) / 2;
    var order = PATTERNS[pattern] || PATTERNS.random, mix = clamp(randomness, 0, 1), px = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var i = r * cols + c;
      var x = cols <= 1 ? 0.5 : c / (cols - 1), y = rows <= 1 ? 0.5 : r / (rows - 1);
      var base = order(x, y), rnd = noise(i + 1);
      px.push({ left: ox + c * stride, top: oy + r * stride, offset: base === null ? rnd : base * (1 - mix) + rnd * mix });
    }
    return { pixels: px, size: size, gap: gap, width: w, height: h };
  }
  function keyframes(startScale, endScale, spin, fade) {
    var win = [], con = [];
    for (var s = 0; s <= STEPS; s++) {
      var p = s / STEPS, e = ease(p), sc = startScale + (endScale - startScale) * e, a = spin * (1 - e);
      win.push({ offset: p, opacity: fade ? Math.min(1, e * 1.6) : 1, transform: "rotate(" + a + "deg) scale(" + sc + ")" });
      con.push({ offset: p, transform: "scale(" + 1 / sc + ") rotate(" + -a + "deg)" });
    }
    return { win: win, con: con };
  }
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function PixelSwap(root) {
    var d = root.dataset;
    var opt = {
      size: Math.max(8, +(d.pixelSize || 64)), gap: Math.max(0, +(d.gap || 0)),
      radius: +(d.pixelRadius || 0), spin: +(d.pixelSpin || 0), scale: +(d.pixelScale || 0.35),
      duration: +(d.duration || 1400), pixelDuration: +(d.pixelDuration || 450),
      pattern: d.pattern || "random", randomness: +(d.randomness || 0),
      fade: d.fade !== "false", trigger: d.trigger || "hover"
    };
    var layers = [root.querySelector('.ps-layer[data-layer="0"]'), root.querySelector('.ps-layer[data-layer="1"]')];
    var shown = 0, target = 0, running = null;
    var grid = document.createElement("div");
    grid.className = "ps-grid"; grid.setAttribute("aria-hidden", "true");
    root.appendChild(grid);

    function paint() {
      layers.forEach(function (l, i) {
        l.dataset.visible = i === shown && !(running && i === running.to) ? "true" : "false";
        l.style.zIndex = i === shown ? 2 : 1;
      });
      root.dataset.active = shown ? "true" : "false";
    }
    function stop() {
      if (!running) return;
      running.anims.forEach(function (a) { a.cancel(); });
      clearTimeout(running.timer);
      grid.replaceChildren();
      running = null;
    }
    function finish(to) { stop(); shown = to; paint(); if (target !== shown) start(target); }
    function start(to) {
      if (running || to === shown) return;
      var w = root.clientWidth, h = root.clientHeight;
      if (reduce || !w || !h) { shown = to; paint(); return; }
      var g = buildGrid(w, h, opt.size, opt.gap, opt.pattern, opt.randomness);
      var total = Math.max(200, opt.duration), pms = clamp(opt.pixelDuration, 60, total), spread = Math.max(0, total - pms);
      var end = coverScale(g.size, g.gap, opt.radius);
      var kf = keyframes(clamp(opt.scale, 0.05, 1) * end, end, opt.spin, opt.fade);
      running = { to: to, anims: [], timer: 0 };
      paint();
      g.pixels.forEach(function (p) {
        var cell = document.createElement("div");
        cell.className = "ps-pixel";
        cell.style.cssText = "left:" + p.left + "px;top:" + p.top + "px;width:" + g.size + "px;height:" + g.size + "px;border-radius:" + clamp(opt.radius, 0, 50) + "%";
        var content = document.createElement("div");
        content.className = "ps-pixel-content";
        content.style.cssText = "left:" + -p.left + "px;top:" + -p.top + "px;width:" + g.width + "px;height:" + g.height + "px;transform-origin:" + (p.left + g.size / 2) + "px " + (p.top + g.size / 2) + "px";
        var clone = layers[to].cloneNode(true);
        clone.dataset.visible = "true";
        content.appendChild(clone);
        cell.appendChild(content);
        grid.appendChild(cell);
        var t = { duration: pms, delay: p.offset * spread, easing: "linear", fill: "both" };
        running.anims.push(cell.animate(kf.win, t), content.animate(kf.con, t));
      });
      running.timer = setTimeout(function () { finish(to); }, total);
    }
    function request(to) { target = to; if (!running) start(to); }

    if (opt.trigger === "hover") {
      root.addEventListener("mouseenter", function () { request(1); });
      root.addEventListener("mouseleave", function () { request(0); });
      root.addEventListener("focus", function () { request(1); });
      root.addEventListener("blur", function () { request(0); });
      // Touch: no hover, so the first tap reveals instead of activating.
      var lastPointer = "mouse";
      root.addEventListener("pointerdown", function (e) { lastPointer = e.pointerType; });
      root.addEventListener("click", function (e) {
        if (lastPointer === "touch" && target === 0) {
          e.preventDefault(); e.stopImmediatePropagation(); request(1);
        }
      }, true);
    } else {
      root.addEventListener("click", function () { request(target ? 0 : 1); });
    }
    paint();
  }
  document.querySelectorAll(".pixel-swap").forEach(function (el) { PixelSwap(el); });
})();
