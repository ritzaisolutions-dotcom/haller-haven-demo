(function () {
  var top = document.querySelector(".top");
  if (!top) return;
  function tick() {
    top.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  tick();
  window.addEventListener("scroll", tick, { passive: true });
})();
