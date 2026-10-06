(function () {
  var video = document.getElementById("hero-video");
  var btn = document.getElementById("hero-play");
  if (!video) return;

  function isMobile() {
    return window.matchMedia("(max-width: 900px)").matches;
  }

  function armDesktop() {
    video.setAttribute("autoplay", "");
    video.play().catch(function () {});
    if (btn) btn.hidden = true;
  }

  function armMobile() {
    video.removeAttribute("autoplay");
    video.pause();
    video.preload = "none";
    if (btn) btn.hidden = false;
  }

  function apply() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      armMobile();
      if (btn) btn.hidden = true;
      return;
    }
    if (isMobile()) armMobile();
    else armDesktop();
  }

  if (btn) {
    btn.addEventListener("click", function () {
      video.play().catch(function () {});
      btn.hidden = true;
    });
  }

  apply();
  window.addEventListener("resize", apply);
})();
