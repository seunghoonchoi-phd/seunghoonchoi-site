(function () {
  "use strict";

  var root = document.documentElement;
  var home = document.body && document.body.classList.contains("is-home");
  if (!home) {
    root.classList.remove("trace-motion");
    return;
  }

  var sections = Array.prototype.slice.call(document.querySelectorAll(".is-home .home-full > .hsec.reveal"));

  function stopFallbackTimer() {
    if (!window.__traceMotionFallback) return;
    window.clearTimeout(window.__traceMotionFallback);
    window.__traceMotionFallback = null;
  }

  function showEverything() {
    sections.forEach(function (section) {
      section.style.transitionDelay = "";
      section.classList.add("is-visible");
    });
    root.classList.remove("trace-motion");
    stopFallbackTimer();
  }

  try {
    sections.forEach(function (section) {
      /* main.js owns generic pages; FIRST TRACE owns the home sequence. */
      section.style.transitionDelay = "";
    });

    if (!("IntersectionObserver" in window) || !sections.length) {
      showEverything();
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: "0px 0px -4% 0px" });

    sections.forEach(function (section) { observer.observe(section); });
    root.classList.add("trace-motion-ready");
    stopFallbackTimer();
  } catch (error) {
    showEverything();
  }

  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    showEverything();
  });
})();
