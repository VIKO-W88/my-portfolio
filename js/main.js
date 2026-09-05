document.getElementById("year").textContent = new Date().getFullYear();

const themeToggle = document.getElementById("themeToggle");
const root = document.documentElement;
const stored = localStorage.getItem("theme");

if (stored === "dark") {
  root.setAttribute("data-theme", "dark");
  themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  const isDark = root.getAttribute("data-theme") === "dark";
  if (isDark) {
    root.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
    themeToggle.textContent = "🌙";
  } else {
    root.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    themeToggle.textContent = "☀️";
  }
});

// Transparent overlay nav -- turns solid once the page scrolls past the
// full-bleed hero artwork, so it stays legible over the plain-background
// sections further down (About / Projects / Contact).
const nav = document.querySelector(".nav");
if (nav) {
  const updateNavSolidity = () => {
    nav.classList.toggle("is-solid", window.scrollY > 60);
  };
  updateNavSolidity();
  window.addEventListener("scroll", updateNavSolidity, { passive: true });
}

// Projects row — click-and-drag horizontal scrolling (in addition to
// trackpad/touch scroll, which already works natively), plus a
// closed-loop wrap so dragging past the last card cycles back to the
// first (and back past the first cycles to the last) instead of
// hitting a hard stop.
const projectsGrid = document.querySelector(".projects-grid");

if (projectsGrid) {
  // --- Closed-loop setup -------------------------------------------------
  // Clone the real card set a couple of times on either side of itself,
  // so there's always more (pixel-identical) content to scroll into.
  // Scrolling stays completely native (drag + trackpad/touch); once the
  // visitor drifts a full set-width away from "home" we silently jump
  // scrollLeft back by exactly one set-width, which is invisible since
  // the clones are identical to the originals. Which copy is "real"
  // keeps shifting, so clones are marked aria-hidden / tabindex=-1.
  const originalCards = Array.from(
    projectsGrid.querySelectorAll(".project-card")
  );
  const LOOP_COPIES = 2;

  const buildCloneSet = () =>
    originalCards.map((card) => {
      const clone = card.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("a, button").forEach((el) => {
        el.setAttribute("tabindex", "-1");
      });
      return clone;
    });

  if (originalCards.length) {
    for (let i = 0; i < LOOP_COPIES; i++) {
      const beforeFrag = document.createDocumentFragment();
      buildCloneSet().forEach((c) => beforeFrag.appendChild(c));
      projectsGrid.insertBefore(beforeFrag, projectsGrid.firstElementChild);

      const afterFrag = document.createDocumentFragment();
      buildCloneSet().forEach((c) => afterFrag.appendChild(c));
      projectsGrid.appendChild(afterFrag);
    }
  }

  let isDown = false;
  let didDrag = false;
  let startX = 0;
  let startScrollLeft = 0;

  projectsGrid.addEventListener("mousedown", (e) => {
    isDown = true;
    didDrag = false;
    projectsGrid.classList.add("dragging");
    startX = e.pageX;
    startScrollLeft = projectsGrid.scrollLeft;
  });

  window.addEventListener("mouseup", () => {
    if (!isDown) return;
    isDown = false;
    projectsGrid.classList.remove("dragging");
    scheduleSettleCheck();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    const delta = e.pageX - startX;
    if (Math.abs(delta) > 4) didDrag = true;
    projectsGrid.scrollLeft = startScrollLeft - delta;
  });

  // Prevent the drag gesture from also triggering a card's "查看详情" link.
  projectsGrid.addEventListener(
    "click",
    (e) => {
      if (didDrag) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  // Coverflow-style focus scaling — the card nearest the row's own
  // horizontal center is scaled up via a --focus-scale custom property,
  // tapering down toward the edges as it scrolls away. Includes the
  // loop clones so the effect stays seamless while wrapping.
  const projectCards = Array.from(
    projectsGrid.querySelectorAll(".project-card")
  );
  let focusRAF = null;

  const applyProjectFocus = () => {
    focusRAF = null;
    const gridRect = projectsGrid.getBoundingClientRect();
    const centerX = gridRect.left + gridRect.width / 2;
    // Falloff distance is tied to a couple of card-widths, not half the
    // (now much wider) row -- so the size drop-off happens over the
    // nearest card or two, reading as a clear peak at center like the
    // reference deck, instead of a gentle bump barely visible across a
    // wide row.
    const cardStep = 300 + 22; // .project-card base width + .projects-grid gap
    const maxDist = cardStep * 1.5;

    projectCards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const t = Math.min(Math.abs(cardCenter - centerX) / maxDist, 1);
      // Wider center-to-edge range (1.25x down to 0.75x, was a subtle
      // 1.15x/0.82x) so the focused card reads as clearly bigger. No
      // opacity fade -- every card stays fully opaque like the
      // reference; size alone carries the focus effect.
      const scale = 1.25 - 0.5 * t;
      card.style.setProperty("--focus-scale", scale.toFixed(3));
      card.style.zIndex = String(Math.round((1 - t) * 10) + 1);
    });
  };

  const scheduleProjectFocus = () => {
    if (focusRAF) return;
    focusRAF = requestAnimationFrame(applyProjectFocus);
  };

  // "Home" is: the real first card (FamilyFlow) sitting a small, normal
  // gap from the row's left edge -- rather than scrollLeft=0, which (given
  // the row's coverflow-centering padding) leaves a big empty gap before
  // it AND nudges it nearest the row's own center, so FamilyFlow rather
  // than the card meant to stand out is what gets scaled up. Home also
  // doubles as the reference point the loop wraps around.
  let loopSetWidth = 0;
  let loopHomeStart = 0;
  const desiredLeftGap = 24; // matches the row's own minimum edge padding

  const measureLoop = () => {
    if (!originalCards.length) return;
    const gridRect = projectsGrid.getBoundingClientRect();
    const firstRect = originalCards[0].getBoundingClientRect();
    loopHomeStart =
      projectsGrid.scrollLeft +
      (firstRect.left - gridRect.left - desiredLeftGap);

    const nextSetFirstCard =
      projectCards[originalCards.length * (LOOP_COPIES + 1)];
    if (nextSetFirstCard) {
      loopSetWidth =
        nextSetFirstCard.getBoundingClientRect().left - firstRect.left;
    }
  };

  let userMovedRow = false;
  ["mousedown", "touchstart", "wheel"].forEach((evt) => {
    projectsGrid.addEventListener(
      evt,
      () => {
        userMovedRow = true;
      },
      { passive: true, once: true }
    );
  });

  let didSetInitialScroll = false;
  const setInitialScrollPosition = () => {
    if (userMovedRow || didSetInitialScroll || !originalCards.length) return;
    measureLoop();
    projectsGrid.scrollLeft = loopHomeStart;
    didSetInitialScroll = true;
  };

  // Silently jump by one set-width once the row drifts a full set away
  // from home so it never runs out of (identical) content to show.
  // Skipped mid-drag so it never fights the drag math; runs once
  // scrolling/dragging settles instead. WRAP_SLOP absorbs the few px of
  // rounding that shows up once the coverflow focus-scale transform has
  // been applied to nearby cards (getBoundingClientRect includes CSS
  // transforms, so a scaled-down card measures a little short of its
  // untransformed position) -- without slack that noise alone could trip
  // the boundary check and jump a whole extra set-width by mistake.
  const WRAP_SLOP = 80;
  let settleTimer = null;
  const normalizeLoop = () => {
    if (isDown || !loopSetWidth) return;
    let guard = 0;
    while (
      projectsGrid.scrollLeft < loopHomeStart - WRAP_SLOP &&
      guard++ < 10
    ) {
      projectsGrid.scrollLeft += loopSetWidth;
    }
    while (
      projectsGrid.scrollLeft > loopHomeStart + loopSetWidth + WRAP_SLOP &&
      guard++ < 20
    ) {
      projectsGrid.scrollLeft -= loopSetWidth;
    }
  };

  const scheduleSettleCheck = () => {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(normalizeLoop, 120);
  };

  projectsGrid.addEventListener(
    "scroll",
    () => {
      scheduleProjectFocus();
      scheduleSettleCheck();
    },
    { passive: true }
  );
  window.addEventListener("resize", () => {
    measureLoop();
    scheduleProjectFocus();
  });
  // Note: load/timeout intentionally re-run setInitialScrollPosition()
  // (a no-op once it has already snapped once) but do NOT call
  // measureLoop() again here -- by then applyProjectFocus() has already
  // scaled nearby cards via CSS transform, and re-measuring off those
  // transformed rects would drift loopHomeStart/loopSetWidth away from
  // the untransformed values captured at true setup time.
  window.addEventListener("load", () => {
    setInitialScrollPosition();
    scheduleProjectFocus();
  });
  setInitialScrollPosition();
  scheduleProjectFocus();
  // Re-run once thumbnails/layout settle right after first paint.
  setTimeout(() => {
    setInitialScrollPosition();
    scheduleProjectFocus();
  }, 300);
}

// Hero card — cursor-reactive 3D tilt + holographic sheen.
const heroSection = document.querySelector(".hero");
const heroCard = document.getElementById("heroCard");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

if (heroSection && heroCard && !prefersReducedMotion) {
  const maxTilt = 10; // degrees

  heroSection.addEventListener("mousemove", (e) => {
    const rect = heroCard.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1

    const rx = (px - 0.5) * 2 * maxTilt; // rotateY
    const ry = (0.5 - py) * 2 * maxTilt; // rotateX

    heroCard.style.setProperty("--rx", `${rx}deg`);
    heroCard.style.setProperty("--ry", `${ry}deg`);
    heroCard.style.setProperty("--mx", `${px * 100}%`);
    heroCard.style.setProperty("--my", `${py * 100}%`);
    heroCard.classList.add("is-active");
  });

  heroSection.addEventListener("mouseleave", () => {
    heroCard.style.setProperty("--rx", "0deg");
    heroCard.style.setProperty("--ry", "0deg");
    heroCard.classList.remove("is-active");
  });
}

// Magnetic buttons/links — nudge toward the cursor within a small radius.
if (!prefersReducedMotion) {
  document.querySelectorAll(".magnetic").forEach((el) => {
    const strength = 0.35;
    const maxOffset = 10; // px

    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const offsetX = e.clientX - (rect.left + rect.width / 2);
      const offsetY = e.clientY - (rect.top + rect.height / 2);
      const x = Math.max(-maxOffset, Math.min(maxOffset, offsetX * strength));
      const y = Math.max(-maxOffset, Math.min(maxOffset, offsetY * strength));
      el.style.transform = `translate(${x}px, ${y}px)`;
    });

    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
    });
  });
}

// Scroll-reveal — fade/slide elements in as they enter the viewport.
const revealEls = document.querySelectorAll(".reveal");

if (revealEls.length) {
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in-view"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    revealEls.forEach((el) => revealObserver.observe(el));
  }
}

// Intro splash — plays once per browser session (index.html only).
const introOverlay = document.getElementById("introOverlay");

if (introOverlay) {
  const alreadyPlayed = sessionStorage.getItem("introPlayed");

  if (alreadyPlayed) {
    introOverlay.remove();
  } else {
    sessionStorage.setItem("introPlayed", "1");
    window.setTimeout(() => {
      introOverlay.classList.add("is-leaving");
      introOverlay.addEventListener(
        "transitionend",
        () => introOverlay.remove(),
        { once: true }
      );
    }, 1000);
  }
}

// Custom cursor — a lagging ring + a tight dot (mouse/trackpad only).
const supportsFinePointer = window.matchMedia(
  "(hover: hover) and (pointer: fine)"
).matches;

if (supportsFinePointer && !prefersReducedMotion) {
  document.body.classList.add("has-custom-cursor");

  const cursorDot = document.createElement("div");
  cursorDot.className = "cursor-dot";
  const cursorRing = document.createElement("div");
  cursorRing.className = "cursor-ring";
  document.body.append(cursorDot, cursorRing);

  let ringX = window.innerWidth / 2;
  let ringY = window.innerHeight / 2;
  let targetX = ringX;
  let targetY = ringY;

  window.addEventListener("mousemove", (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    cursorDot.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;
  });

  document.addEventListener("mouseover", (e) => {
    if (e.target.closest("a, button, .magnetic")) {
      cursorRing.classList.add("is-hovering");
    }
  });

  document.addEventListener("mouseout", (e) => {
    if (e.target.closest("a, button, .magnetic")) {
      cursorRing.classList.remove("is-hovering");
    }
  });

  // Ease the ring toward the pointer for a soft "lagging" trail feel.
  function animateRing() {
    ringX += (targetX - ringX) * 0.18;
    ringY += (targetY - ringY) * 0.18;
    cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    requestAnimationFrame(animateRing);
  }
  requestAnimationFrame(animateRing);
}

// Hero character animations wake up shortly after the page paints
// (independent of the once-per-session intro splash above, so repeat
// visits within the same session still get the "world waking up" reveal).
//
// Exception (added): when the background-dissolve splash overlay (see
// js/splash-reveal.js) is about to play in front of the hero, adding
// "is-loaded" this early would mean the hero's own entrance finishes
// silently behind the overlay, unseen. willSplashPlay() below mirrors the
// exact same play/skip decision js/splash-reveal.js makes for itself
// (same reduced-motion check, same sessionStorage flag read BEFORE either
// script has touched it yet, same reload check) -- when it predicts the
// splash WILL play, "is-loaded" is left off here on purpose, and
// js/splash-reveal.js adds it instead, right as the background finishes
// dissolving, so the entrance plays fresh at that moment.
function willSplashPlay() {
  var splashEl = document.getElementById("splashReveal");
  if (!splashEl) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  var alreadyPlayed = sessionStorage.getItem("splashRevealPlayed");
  if (!alreadyPlayed) return true;
  try {
    var entries = performance.getEntriesByType && performance.getEntriesByType("navigation");
    if (entries && entries[0]) return entries[0].type === "reload";
  } catch (e) {}
  try {
    if (performance.navigation) return performance.navigation.type === 1;
  } catch (e) {}
  return false;
}

if (heroSection) {
  if (!willSplashPlay()) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        heroSection.classList.add("is-loaded");
      });
    });
  }
}

// Hero scene — layered depth parallax. Each image layer carries a
// data-depth (0 = background, further foreground layers move more) and
// the whole group shifts opposite the cursor for a subtle 3D feel. This
// stays secondary to each character's own idle animation above — small
// offsets only (background ~1-2px, portal ~2-3px, characters ~3-5px,
// foreground ~5-8px at full cursor travel).
const heroScene = document.querySelector(".hero-scene");
const heroBg = document.getElementById("heroBg");
const heroLayers = document.querySelectorAll(".hero-scene .hero-layer");

if (heroSection && heroScene && heroLayers.length && !prefersReducedMotion) {
  heroSection.addEventListener("mousemove", (e) => {
    const rect = heroSection.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5;

    heroLayers.forEach((layer) => {
      const depth = parseFloat(layer.dataset.depth || "0.13");
      const moveX = -px * depth * 60;
      const moveY = -py * depth * 30;
      layer.style.setProperty("--px", `${moveX}px`);
      layer.style.setProperty("--py", `${moveY}px`);
    });

    if (heroBg) {
      const bgDepth = 0.05;
      heroBg.style.transform = `translate(${-px * bgDepth * 60}px, ${-py * bgDepth * 30}px)`;
    }
  });

  heroSection.addEventListener("mouseleave", () => {
    heroLayers.forEach((layer) => {
      layer.style.setProperty("--px", "0px");
      layer.style.setProperty("--py", "0px");
    });
    if (heroBg) heroBg.style.transform = "";
  });
}

// Hero characters "dodge" the cursor -- as the mouse moves over the scene,
// any character close to it gets pushed away (stronger the closer the
// cursor gets), then eases back to its resting spot once the cursor moves
// on. Only the actual character mascots take part (not the portal, lantern
// or foreground plants -- those are scenery, not characters). The push is
// carried in --dx/--dy, a second custom property additive with the
// existing --px/--py parallax offset inside each character's own keyframe
// transform (see the "+ var(--dx, 0px))" calc() in their keyframes), and is
// smoothed every frame via a simple lerp rather than a CSS transition,
// since transitioning a plain custom property doesn't animate.
const dodgeChars = Array.from(
  document.querySelectorAll(
    ".hero-char-design, .hero-char-media, .hero-char-explore, .hero-char-code, .hero-char-bird, .hero-char-robot"
  )
).map((el) => ({ el, dx: 0, dy: 0, tx: 0, ty: 0 }));

if (heroSection && dodgeChars.length && !prefersReducedMotion) {
  const DODGE_RADIUS = 240;
  const DODGE_STRENGTH = 46;

  heroSection.addEventListener("mousemove", (e) => {
    dodgeChars.forEach((c) => {
      const r = c.el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dxRaw = cx - e.clientX;
      const dyRaw = cy - e.clientY;
      const dist = Math.hypot(dxRaw, dyRaw) || 1;
      if (dist < DODGE_RADIUS) {
        const strength = (1 - dist / DODGE_RADIUS) ** 2;
        c.tx = (dxRaw / dist) * DODGE_STRENGTH * strength;
        c.ty = (dyRaw / dist) * DODGE_STRENGTH * strength;
      } else {
        c.tx = 0;
        c.ty = 0;
      }
    });
  });

  heroSection.addEventListener("mouseleave", () => {
    dodgeChars.forEach((c) => {
      c.tx = 0;
      c.ty = 0;
    });
  });

  const tickDodge = () => {
    dodgeChars.forEach((c) => {
      c.dx += (c.tx - c.dx) * 0.14;
      c.dy += (c.ty - c.dy) * 0.14;
      c.el.style.setProperty("--dx", `${c.dx.toFixed(2)}px`);
      c.el.style.setProperty("--dy", `${c.dy.toFixed(2)}px`);
    });
    requestAnimationFrame(tickDodge);
  };
  requestAnimationFrame(tickDodge);
}

// Project thumbnails — subtle image parallax shift on hover.
if (!prefersReducedMotion) {
  document.querySelectorAll(".project-card").forEach((card) => {
    const thumb = card.querySelector(".project-thumb");
    if (!thumb) return;

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      thumb.style.transform = `translate(${px * 10}px, ${py * 10}px) scale(1.12)`;
    });

    card.addEventListener("mouseleave", () => {
      thumb.style.transform = "";
    });
  });
}
