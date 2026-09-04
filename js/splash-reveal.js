// Splash reveal -- background + character dissolve intro (added).
//
// Plays on first opening the site this session, and again on an actual
// page refresh -- but NOT every time the visitor navigates back to the
// homepage (e.g. the nav logo or a project page's "back to portfolio"
// link), even though that's technically a fresh load of index.html too.
// A plain sessionStorage flag alone can't tell those apart (both are just
// "index.html loading"), so isReloadNavigation() below reads the
// Navigation Timing API to distinguish an actual reload from a normal
// navigation. Right after the existing name-intro overlay (see
// js/main.js) finishes -- or immediately if that has already played this
// session. This file only reads the name-intro overlay's own DOM state to
// know when it is done; it never modifies main.js or any of its
// behaviour beyond the small, matching "when does the hero wake up"
// coordination described where js/main.js adds "is-loaded" (see the
// comment there). Everything here is additive: a new full-screen layer
// (#splashReveal in index.html) that sits on top of the real page while it
// plays, then fades itself out and removes itself from the DOM, revealing
// the real page exactly as it was already rendering underneath the whole
// time. No existing element's position, size, timing or animation is
// touched. Skipped entirely under prefers-reduced-motion (see the matching
// rule in style.css).
(function () {
  var overlay = document.getElementById("splashReveal");
  if (!overlay) return;

  function isReloadNavigation() {
    try {
      var entries = performance.getEntriesByType && performance.getEntriesByType("navigation");
      if (entries && entries[0]) return entries[0].type === "reload";
    } catch (e) {}
    try {
      // Navigation Timing L1 fallback for older browsers -- TYPE_RELOAD === 1.
      if (performance.navigation) return performance.navigation.type === 1;
    } catch (e) {}
    return false;
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var alreadyPlayed = sessionStorage.getItem("splashRevealPlayed");
  var isReload = isReloadNavigation();

  if (reduceMotion || (alreadyPlayed && !isReload)) {
    overlay.remove();
    return;
  }
  sessionStorage.setItem("splashRevealPlayed", "1");

  var bgCanvas = document.getElementById("splashBgCanvas");
  var particleCanvas = document.getElementById("splashParticleCanvas");
  var bctx = bgCanvas.getContext("2d");
  var pctx = particleCanvas.getContext("2d");

  // Capped lower than the usual "2" -- this effect redraws two full-
  // viewport canvases (background art + gradient erase, then particle
  // strokes) every frame, so on a Retina/high-DPI display at full DPR the
  // pixel fill-rate cost is the single biggest lever on how janky this
  // feels, well above the particle-count tuning below. 1.5 still looks
  // sharp for a ~4s intro that's gone almost as soon as you've registered
  // it, and cuts the pixels touched per frame by close to half versus 2.
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var W = 0,
    H = 0;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    bgCanvas.width = Math.round(W * DPR);
    bgCanvas.height = Math.round(H * DPR);
    particleCanvas.width = Math.round(W * DPR);
    particleCanvas.height = Math.round(H * DPR);
    bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    pctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (imgLoaded) computeCover();
    drawStill();
  }

  // ---- background art ----
  var img = new Image();
  var imgLoaded = false;
  var cover = { dw: 0, dh: 0, dx: 0, dy: 0 };
  var sampleGrid = null;
  var SAMPLE_COLS = 48,
    SAMPLE_ROWS = 27;

  img.onload = function () {
    imgLoaded = true;
    computeCover();
    // drawStill() first, unconditionally -- some browsers (notably Safari,
    // and also Chrome when the page is opened directly as a file:// URL
    // instead of through a local server) throw a SecurityError from
    // getImageData() below even for a same-origin local image, which
    // would otherwise abort this whole onload callback before the
    // background ever got drawn (and before imgReady/maybeStart ran),
    // leaving the overlay stuck showing just the character art on a
    // blank white background forever. drawImage() itself never throws
    // for this, so doing it first (and wrapping only the pixel-sampling
    // step below) keeps the background visible and the sequence moving
    // no matter what the browser allows.
    drawStill();
    try {
      buildSampleGrid();
    } catch (e) {
      // Pixel sampling isn't available in this browser/context -- the
      // dissolve and particles still run fine, just with a fixed particle
      // color instead of one sampled from the art (see sampleColorAt).
      sampleGrid = null;
    }
    imgReady = true;
    maybeStart();
  };
  img.onerror = function () {
    // Background art failed to load -- don't strand the visitor behind a
    // stuck overlay, just remove it so the real page shows normally.
    overlay.remove();
  };
  img.src = "assets/hero/01-background-clean.webp";

  function computeCover() {
    var ir = img.width / img.height,
      cr = W / H;
    if (ir > cr) {
      cover.dh = H;
      cover.dw = H * ir;
    } else {
      cover.dw = W;
      cover.dh = W / ir;
    }
    cover.dx = (W - cover.dw) / 2;
    cover.dy = (H - cover.dh) / 2;
  }

  function buildSampleGrid() {
    var off = document.createElement("canvas");
    off.width = SAMPLE_COLS;
    off.height = SAMPLE_ROWS;
    var octx = off.getContext("2d");
    octx.drawImage(img, 0, 0, SAMPLE_COLS, SAMPLE_ROWS);
    sampleGrid = octx.getImageData(0, 0, SAMPLE_COLS, SAMPLE_ROWS).data;
  }

  // Fallback used when pixel sampling isn't available (see the try/catch
  // around buildSampleGrid() above) -- a muted lavender in the middle of
  // the background art's own aurora palette, so particles still look
  // plausible even without a real per-pixel color.
  var FALLBACK_PARTICLE_COLOR = "rgb(178, 168, 214)";

  function sampleColorAt(x, y) {
    if (!sampleGrid) return FALLBACK_PARTICLE_COLOR;
    var u = (x - cover.dx) / cover.dw;
    var v = (y - cover.dy) / cover.dh;
    u = Math.min(1, Math.max(0, u));
    v = Math.min(1, Math.max(0, v));
    var col = Math.min(SAMPLE_COLS - 1, Math.floor(u * SAMPLE_COLS));
    var row = Math.min(SAMPLE_ROWS - 1, Math.floor(v * SAMPLE_ROWS));
    var idx = (row * SAMPLE_COLS + col) * 4;
    return "rgb(" + sampleGrid[idx] + "," + sampleGrid[idx + 1] + "," + sampleGrid[idx + 2] + ")";
  }

  function drawStill() {
    if (!imgLoaded) return;
    bctx.clearRect(0, 0, W, H);
    bctx.drawImage(img, cover.dx, cover.dy, cover.dw, cover.dh);
  }

  // ---- diagonal sweep erase (top-right -> bottom-left) ----
  var BAND = 0.16;
  function clamp01(x) {
    return Math.max(0, Math.min(1, x));
  }

  function drawErased(p) {
    bctx.clearRect(0, 0, W, H);
    bctx.drawImage(img, cover.dx, cover.dy, cover.dw, cover.dh);
    if (p <= -BAND) return;

    bctx.save();
    bctx.globalCompositeOperation = "destination-out";
    var grad = bctx.createLinearGradient(W, 0, 0, H);
    var offsets = [0, clamp01(p - BAND), clamp01(p), 1];
    var last = -1;
    offsets.forEach(function (o) {
      if (o <= last) o = Math.min(1, last + 0.0005);
      var alpha = clamp01((p - o) / BAND);
      grad.addColorStop(o, "rgba(0,0,0," + alpha + ")");
      last = o;
    });
    bctx.fillStyle = grad;
    bctx.fillRect(0, 0, W, H);
    bctx.restore();
  }

  // ---- sand particles along the sweep front ----
  // Tuned down from the first pass (N=70, 60% spawn chance, 450-950ms
  // life) -- that produced several hundred particles alive at once during
  // the sweep, stroking each one every frame on top of a full-canvas
  // redraw, which was visibly janky. Fewer, shorter-lived particles plus a
  // hard cap keep the "sand dust" look without the frame-rate hit.
  var particles = [];
  var MAX_PARTICLES = 220;
  function spawnParticlesAt(p) {
    if (particles.length > MAX_PARTICLES) return;
    var N = 40;
    for (var i = 0; i < N; i++) {
      if (Math.random() > 0.4) continue;
      var s = Math.random();
      var dirx = -W,
        diry = H;
      var dlen = Math.sqrt(dirx * dirx + diry * diry);
      dirx /= dlen;
      diry /= dlen;
      var baseX = W + (0 - W) * p,
        baseY = 0 + (H - 0) * p;
      var perpx = -diry,
        perpy = dirx;
      var spread = 1.4;
      var px = baseX + perpx * (s - 0.5) * (W + H) * spread;
      var py = baseY + perpy * (s - 0.5) * (W + H) * spread;
      if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;

      var jitter = (Math.random() - 0.5) * 34;
      px += dirx * jitter;
      py += diry * jitter;

      var speedMag = 0.5 + Math.random() * 0.9;
      particles.push({
        x: px,
        y: py,
        vx: -dirx * speedMag + (Math.random() - 0.5) * 0.7,
        vy: -diry * speedMag + (Math.random() - 0.5) * 0.7,
        life: 0,
        maxLife: 320 + Math.random() * 320,
        size: 0.8 + Math.random() * 2.0,
        color: sampleColorAt(px, py),
      });
    }
  }

  function updateParticles(dt) {
    pctx.clearRect(0, 0, W, H);
    for (var i = particles.length - 1; i >= 0; i--) {
      var pt = particles[i];
      pt.life += dt;
      var lt = pt.life / pt.maxLife;
      if (lt >= 1) {
        particles.splice(i, 1);
        continue;
      }
      pt.x += pt.vx * dt * 0.06;
      pt.y += pt.vy * dt * 0.06 - 0.012 * dt * 0.06;
      var alpha = (lt < 0.12 ? lt / 0.12 : 1) * (1 - lt);
      var vmag = Math.sqrt(pt.vx * pt.vx + pt.vy * pt.vy) || 1;
      var tailLen = (3 + pt.size * 3.2) * (0.4 + vmag * 0.5);
      var tx = pt.x - (pt.vx / vmag) * tailLen;
      var ty = pt.y - (pt.vy / vmag) * tailLen;

      pctx.globalAlpha = Math.max(0, alpha * 0.8);
      pctx.strokeStyle = pt.color;
      pctx.lineWidth = pt.size;
      pctx.lineCap = "round";
      pctx.beginPath();
      pctx.moveTo(pt.x, pt.y);
      pctx.lineTo(tx, ty);
      pctx.stroke();
    }
    pctx.globalAlpha = 1;
  }

  // ---- timeline: hold, then a slow diagonal dissolve ----
  var HOLD = 650; // ms, static hold before the dissolve starts
  var SWEEP = 2900; // ms, dissolve duration (slow, per feedback)

  var rafId = null,
    startTime = null,
    lastFrame = null;

  function easeInOut(x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  }

  // The real hero section's own character entrance (.hero-enter, gated by
  // .hero.is-loaded) normally wakes up almost instantly on page load (see
  // js/main.js) -- with the splash overlay in front of it, that means it
  // would already be fully settled, unseen, by the time the overlay
  // reveals it. js/main.js checks the same conditions this file used to
  // decide whether to skip itself (reduced motion / already played this
  // session and not a reload) and, when it predicts the splash WILL play,
  // leaves "is-loaded" off the hero for this function to add instead --
  // right here, the instant the background finishes dissolving -- so the
  // hero's own entrance plays a second time exactly as the real page
  // comes into view, instead of it never visibly playing at all.
  var heroRevealTriggered = false;
  function triggerHeroReveal() {
    if (heroRevealTriggered) return;
    heroRevealTriggered = true;
    var heroSection = document.querySelector(".hero");
    if (heroSection) heroSection.classList.add("is-loaded");
  }

  function frame(now) {
    if (startTime === null) startTime = now;
    var elapsed = now - startTime;
    var dt = lastFrame === null ? 16 : now - lastFrame;
    lastFrame = now;

    if (elapsed < HOLD) {
      drawStill();
      pctx.clearRect(0, 0, W, H);
    } else if (elapsed < HOLD + SWEEP) {
      var raw = (elapsed - HOLD) / SWEEP;
      var p = -BAND + easeInOut(raw) * (1 + 2 * BAND);
      drawErased(p);
      if (Math.random() < 0.9) spawnParticlesAt(Math.max(0, Math.min(1, p)));
      updateParticles(dt);
    } else {
      // Background art is fully dissolved as of this frame -- reveal the
      // real hero right now (see triggerHeroReveal above) AND start the
      // crossfade to the real page immediately (finish()), rather than
      // first waiting for any trailing sand particles to fully decay on
      // their own. Particles can outlive the dissolve by up to ~640ms
      // (their own maxLife), and the old code gated finish() on
      // particles.length hitting 0 -- so there was a stretch of up to
      // ~640ms, after the dissolve was already visually done, where
      // nothing happened yet: the crossfade hadn't started, and the
      // overlay's own (frozen, unanimated) character art just sat there
      // covering the real page. That dead time read as a stutter/freeze
      // between the dissolve finishing and the real homepage appearing.
      // Any particles still alive at this instant simply stop animating
      // and fade out along with the rest of the overlay during finish()'s
      // own 900ms opacity transition -- fading a still frame is visually
      // seamless, so nothing is lost by not animating them further.
      triggerHeroReveal();
      finish();
      return;
    }
    rafId = requestAnimationFrame(frame);
  }

  function finish() {
    bctx.clearRect(0, 0, W, H);
    pctx.clearRect(0, 0, W, H);
    overlay.classList.add("splash-reveal-hidden");
    overlay.addEventListener(
      "transitionend",
      function () {
        overlay.remove();
      },
      { once: true }
    );
  }

  function start() {
    // Plays the splash's own characters' "world waking up" entrance (see
    // the matching .splash-active rule in style.css) -- this is the first
    // of the two plays the character entrance now gets: once here as the
    // splash opens, and again via triggerHeroReveal() above once the
    // background finishes dissolving into the real hero underneath.
    overlay.classList.add("splash-active");
    rafId = requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();

  // ---- start only once both the background art is ready AND the
  // existing name-intro overlay has finished (read-only: this never
  // touches introOverlay itself, only listens for it to be done) ----
  var imgReady = false;
  var introDone = false;
  var started = false;

  function maybeStart() {
    if (started || !imgReady || !introDone) return;
    started = true;
    start();
  }

  var introOverlay = document.getElementById("introOverlay");
  if (introOverlay && document.body.contains(introOverlay)) {
    introOverlay.addEventListener(
      "transitionend",
      function () {
        introDone = true;
        maybeStart();
      },
      { once: true }
    );
  } else {
    introDone = true;
    maybeStart();
  }
})();
