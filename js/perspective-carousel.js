// Perspective carousel -- vanilla port of VengeanceUI's PerspectiveCarousel
// (https://github.com/Ashutoshx7/VengeanceUI). Same model as the original:
//   track.x      = -(index * slideWidth + slideWidth / 2)   (centered)
//   card.rotateY = (active - i) * rotationStep
//   card.scale   = i === active ? 1 : inactiveScale
//   label        = opacity/blur in only on the active card
// The original's framer-motion spring (bounce 0.14, 0.9s) is approximated
// with a slightly overshooting cubic-bezier in CSS (see .pc-* in style.css).
(function () {
  document.querySelectorAll(".pc").forEach(function (root) {
    var track = root.querySelector(".pc-track");
    var slides = Array.prototype.slice.call(root.querySelectorAll(".pc-slide"));
    var dots = Array.prototype.slice.call(root.querySelectorAll(".pc-dot"));
    var prev = root.querySelector(".pc-prev");
    var next = root.querySelector(".pc-next");
    var max = slides.length - 1;
    var step = parseFloat(root.dataset.rotationStep) || 55;
    var inactive = parseFloat(root.dataset.inactiveScale) || 0.85;
    var baseWidth = parseFloat(root.dataset.slideWidth) || 300;
    var index = Math.min(Math.max(parseInt(root.dataset.index, 10) || 0, 0), max);

    function slideWidth() {
      // Narrower cards on phones so neighbours stay visible, and short
      // enough that the whole 更多项目 page (eyebrow + title + carousel
      // + controls ≈ card height + 507px) fits one screen -- needed for
      // the home page's snap-to-page scrolling to land cleanly.
      var byHeight = Infinity;
      var page = root.closest(".projects-page");
      var nav = document.querySelector(".nav");
      if (page && nav) {
        // Measure what the page spends above/below the carousel (padding,
        // eyebrow, title, gaps) and give the carousel exactly the rest, so
        // the page is never taller than one screen -- one colour block per
        // screen, nothing of the next page peeking in.
        var cs = getComputedStyle(page);
        var title = page.querySelector(".page-title");
        var above = title
          ? title.getBoundingClientRect().bottom - page.getBoundingClientRect().top +
            parseFloat(getComputedStyle(title).marginBottom)
          : 0;
        var available = window.innerHeight - nav.getBoundingClientRect().height -
          above - parseFloat(cs.paddingBottom) - 120 /* label + controls */ - 8;
        byHeight = available * 0.75; /* card is 3:4 */
      }
      return Math.max(110, Math.min(baseWidth, Math.max(180, root.clientWidth * 0.55), byHeight));
    }

    function render() {
      var w = slideWidth();
      root.style.setProperty("--pc-w", w + "px");
      track.style.transform = "translate3d(" + -(index * w + w / 2) + "px, -50%, 0)";
      slides.forEach(function (li, i) {
        var active = i === index;
        li.classList.toggle("is-active", active);
        li.style.setProperty("--pc-rot", (index - i) * step + "deg");
        li.style.setProperty("--pc-scale", active ? 1 : inactive);
        li.style.zIndex = String(100 - Math.abs(index - i));
        var hit = li.querySelector(".pc-hit");
        hit.setAttribute("aria-current", active ? "true" : "false");
        li.querySelector(".pc-label").tabIndex = active ? 0 : -1;
      });
      dots.forEach(function (d, i) {
        d.setAttribute("aria-current", i === index ? "true" : "false");
      });
      prev.disabled = index === 0;
      next.disabled = index === max;
    }

    function go(i) {
      index = Math.min(Math.max(i, 0), max);
      render();
    }

    slides.forEach(function (li, i) {
      li.querySelector(".pc-hit").addEventListener("click", function () {
        if (dragged) return;
        if (i === index) window.location.href = li.dataset.href;
        else go(i);
      });
    });
    dots.forEach(function (d, i) { d.addEventListener("click", function () { go(i); }); });
    prev.addEventListener("click", function () { go(index - 1); });
    next.addEventListener("click", function () { go(index + 1); });

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
    });

    // Swipe / drag: one slide per gesture past a 40px threshold.
    var startX = null, dragged = false;
    root.addEventListener("pointerdown", function (e) { startX = e.clientX; dragged = false; });
    root.addEventListener("pointermove", function (e) {
      if (startX !== null && Math.abs(e.clientX - startX) > 8) dragged = true;
    });
    root.addEventListener("pointerup", function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      startX = null;
      setTimeout(function () { dragged = false; }, 0);
    });
    root.addEventListener("pointercancel", function () { startX = null; dragged = false; });

    window.addEventListener("resize", render);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
    render();
  });
})();
