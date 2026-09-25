// 联系方式: the WeChat row copies the ID (there is no link to open) and
// briefly confirms it in place; announced via aria-live.
(function () {
  document.querySelectorAll(".contact-copy").forEach(function (btn) {
    var note = btn.querySelector(".contact-copied");
    var timer;
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var label = btn.querySelector(".contact-copy-label");
      var done = function () {
        btn.classList.add("is-copied");
        if (note) note.textContent = "已复制";
        if (label) label.textContent = "已复制 ✓";
        clearTimeout(timer);
        timer = setTimeout(function () {
          btn.classList.remove("is-copied");
          if (note) note.textContent = "";
          if (label) label.textContent = "点击复制";
        }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", "");
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta); done();
      }
    });
  });
})();
