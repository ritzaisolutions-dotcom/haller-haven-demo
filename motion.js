(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    document.documentElement.classList.add("reduce-motion");
    document.body.classList.add("is-ready");
    return;
  }

  document.documentElement.classList.add("js-motion");

  function ready() {
    document.body.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }

  var nodes = document.querySelectorAll("[data-reveal]");
  if (!nodes.length || !("IntersectionObserver" in window)) {
    nodes.forEach(function (el) {
      el.classList.add("is-in");
    });
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = Number(el.getAttribute("data-reveal-delay") || 0);
        if (delay > 0) {
          el.style.transitionDelay = delay + "ms";
        }
        el.classList.add("is-in");
        io.unobserve(el);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -10% 0px" }
  );

  nodes.forEach(function (el) {
    io.observe(el);
  });
})();
