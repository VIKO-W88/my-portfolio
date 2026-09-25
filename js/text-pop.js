// Fold-in text (vanilla port of React Bits <FoldText /> — splitBy "char",
// hinge "top", duration 0.65s, stagger 0.045s, ease power3.out,
// perspective 700px, creaseShading 0.55). Each character starts folded
// 92° back on its top edge and swings down into place, left to right.
//
// Applied to: the hero (Hello, I'm → VIKO → 查看作品, one continuous
// sequence) and the four home-page titles. Replays every time a page is
// scrolled/snapped into view. On each page the eyebrow and body text
// rise in around the fold. Skipped under prefers-reduced-motion.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  // Split one element's text into fold pieces; k = running char index so
  // several elements can fold as one continuous sequence.
  function foldify(el, k) {
    if (el.dataset.fold) return k;
    var text = el.textContent.trim();
    el.textContent = "";
    var sr = document.createElement("span");
    sr.className = "fold-sr";
    sr.textContent = text;
    var vis = document.createElement("span");
    vis.setAttribute("aria-hidden", "true");
    Array.from(text).forEach(function (ch) {
      var seg = document.createElement("span");
      seg.className = "fold-seg";
      var piece = document.createElement("span");
      piece.className = "fold-piece";
      piece.textContent = ch === " " ? " " : ch;
      piece.style.setProperty("--k", k++);
      seg.appendChild(piece);
      vis.appendChild(seg);
    });
    el.appendChild(sr);
    el.appendChild(vis);
    el.dataset.fold = "1";
    return k;
  }

  var targets = [];

  // Hero: one sequence across the three lines.
  var hero = document.querySelector(".hero");
  if (hero) {
    var k = 0;
    [".hero-eyebrow", ".hero-title", ".hero-link"].forEach(function (s) {
      var el = hero.querySelector(s);
      if (el) k = foldify(el, k);
    });
    hero.classList.add("pop-page");
    targets.push(hero);
  }

  // The four pages: title folds; eyebrow + body lines rise.
  var BODY = ".about-text, .contact-text, .contact-card";
  document
    .querySelectorAll("#about, .projects-page-featured, .projects-page-more, #contact")
    .forEach(function (page) {
      var title = page.querySelector(".page-title");
      var n = title ? foldify(title, 0) : 0;
      page.style.setProperty("--n-title", n);
      var eyebrow = page.querySelector(".page-eyebrow");
      if (eyebrow) eyebrow.classList.add("pop-line", "pop-eyebrow");
      page.querySelectorAll(BODY).forEach(function (el, j) {
        el.classList.add("pop-line");
        el.style.setProperty("--j", j);
      });
      page.classList.add("pop-page");
      targets.push(page);
    });

  document.documentElement.classList.add("fold-ready", "pop-ready");

  var visible = new WeakMap();
  function sync(el) {
    // The hero waits for its own entrance (the intro splash) to finish.
    var ready = el !== hero || hero.classList.contains("is-loaded");
    el.classList.toggle("is-popped", !!visible.get(el) && ready);
  }
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.intersectionRatio >= 0.45) visible.set(e.target, true);
        else if (!e.isIntersecting) visible.set(e.target, false);
        sync(e.target);
      });
    },
    { threshold: [0, 0.45] }
  );
  targets.forEach(function (t) { io.observe(t); });
  if (hero) {
    new MutationObserver(function () { sync(hero); }).observe(hero, {
      attributes: true,
      attributeFilter: ["class"]
    });
  }
})();
