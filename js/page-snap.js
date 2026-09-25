// Home page: keep --nav-h equal to the fixed nav's real rendered height.
// The page frames (min-height: 100svh - nav) and the snap offset
// (html scroll-padding-top) both use it, so every page lines up exactly
// under the nav whatever font/zoom/window size the visitor has.
(function () {
  var nav = document.querySelector(".nav");
  if (!nav) return;
  var root = document.documentElement;
  function sync() {
    root.style.setProperty("--nav-h", nav.getBoundingClientRect().height + "px");
  }
  sync();
  window.addEventListener("resize", sync);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);
  if (window.ResizeObserver) new ResizeObserver(sync).observe(nav);
})();
