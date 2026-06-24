/* Molecular Precision — interactions */
(function () {
  "use strict";

  var langScrollKey = "sc_langswitch_scroll";
  function normalizePath(path) {
    return (path || "/").replace(/\/+$/, "") || "/";
  }
  function restoreLanguageScroll() {
    var raw;
    try { raw = sessionStorage.getItem(langScrollKey); } catch (e) { return; }
    if (!raw) return;
    var state;
    try { state = JSON.parse(raw); } catch (e) { sessionStorage.removeItem(langScrollKey); return; }
    if (!state || state.expires < Date.now() || normalizePath(state.path) !== normalizePath(location.pathname)) {
      try { sessionStorage.removeItem(langScrollKey); } catch (e) {}
      return;
    }
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    var y = Math.max(0, Number(state.y) || 0);
    var tries = 0;
    var scrollToSavedPosition = function () {
      var maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo(0, Math.min(y, maxY));
      tries += 1;
      if (tries < 16 && maxY < y) {
        setTimeout(scrollToSavedPosition, 90);
      } else {
        try { sessionStorage.removeItem(langScrollKey); } catch (e) {}
      }
    };
    requestAnimationFrame(scrollToSavedPosition);
    window.addEventListener("load", scrollToSavedPosition, { once: true });
  }
  restoreLanguageScroll();

  /* Mobile nav toggle */
  var burger = document.querySelector(".hamburger");
  var nav = document.querySelector(".nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Nav dropdowns — click/touch + keyboard (hover handled by CSS) */
  var toggles = document.querySelectorAll(".nav__toggle");
  toggles.forEach(function (btn) {
    var group = btn.closest(".nav__group");
    if (!group) return;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var open = group.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest(".nav__group")) return;
    document.querySelectorAll(".nav__group.is-open").forEach(function (g) {
      g.classList.remove("is-open");
      var t = g.querySelector(".nav__toggle");
      if (t) t.setAttribute("aria-expanded", "false");
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".nav__group.is-open").forEach(function (g) {
      g.classList.remove("is-open");
      var t = g.querySelector(".nav__toggle");
      if (t) t.setAttribute("aria-expanded", "false");
    });
  });

  /* Language switcher — toggle button opens a vertical dropdown */
  var ls = document.querySelector("[data-langswitch]");
  if (ls) {
    var lsBtn = ls.querySelector(".langswitch__toggle");
    if (lsBtn) {
      lsBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = ls.hasAttribute("data-open");
        if (open) { ls.removeAttribute("data-open"); lsBtn.setAttribute("aria-expanded", "false"); }
        else { ls.setAttribute("data-open", ""); lsBtn.setAttribute("aria-expanded", "true"); }
      });
      document.addEventListener("click", function (e) { if (!ls.contains(e.target)) { ls.removeAttribute("data-open"); lsBtn.setAttribute("aria-expanded", "false"); } });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") { ls.removeAttribute("data-open"); lsBtn.setAttribute("aria-expanded", "false"); } });
    }
    ls.querySelectorAll("[data-preserve-scroll]").forEach(function (link) {
      link.addEventListener("click", function () {
        try {
          var target = new URL(link.href, location.href);
          sessionStorage.setItem(langScrollKey, JSON.stringify({
            path: target.pathname,
            y: window.scrollY || window.pageYOffset || 0,
            expires: Date.now() + 30000
          }));
        } catch (e) {}
      });
    });
  }

  /* Reveal on scroll */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); ro.unobserve(e.target); }
      });
    }, { threshold: 0, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i % 6, 5) * 0.05) + "s";
      ro.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Category filter (list pages) */
  var bar = document.querySelector("[data-filter]");
  var list = document.querySelector("[data-list]");
  if (bar && list) {
    bar.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".chip");
      if (!btn) return;
      bar.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("is-active"); });
      btn.classList.add("is-active");
      var cat = btn.getAttribute("data-cat");
      list.querySelectorAll(".card").forEach(function (card) {
        var cats = (card.getAttribute("data-cat") || "").split(/\s+/);
        var show = cat === "*" || cats.indexOf(cat) !== -1;
        card.classList.toggle("is-hidden", !show);
      });
    });
  }

  /* Copy attribution — append source line when copying article text */
  var post = document.querySelector(".post");
  if (post && window.SC) {
    document.addEventListener("copy", function (e) {
      var sel = window.getSelection ? String(window.getSelection()) : "";
      if (sel.length < 40) return;
      var an = window.getSelection().anchorNode;
      if (!an || !post.contains(an)) return;
      var note = "\n\n— " + SC.author + ", " + SC.title + "\n" + SC.srcLabel + ": " + SC.url;
      try {
        (e.clipboardData || window.clipboardData).setData("text/plain", sel + note);
        e.preventDefault();
      } catch (err) {}
    });
  }

  /* Cite-this copy button */
  var citeBtn = document.querySelector("[data-cite-copy]");
  var citeText = document.getElementById("cite-text");
  if (citeBtn && citeText) {
    citeBtn.addEventListener("click", function () {
      var t = (citeText.textContent || "").trim();
      var done = function () {
        var orig = citeBtn.getAttribute("data-label") || citeBtn.textContent;
        citeBtn.setAttribute("data-label", orig);
        citeBtn.textContent = citeBtn.getAttribute("data-copied") || "Copied";
        setTimeout(function () { citeBtn.textContent = orig; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(done, done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (err) {}
        document.body.removeChild(ta); done();
      }
    });
  }

  /* Copy email — contact / collaborate button */
  var emailBtn = document.querySelector("[data-copy-email]");
  var emailToast = document.querySelector("[data-copy-toast]");
  if (emailBtn) {
    emailBtn.addEventListener("click", function () {
      var email = emailBtn.getAttribute("data-copy-email") || "";
      var msg = emailBtn.getAttribute("data-copied") || "Copied";
      var show = function () {
        if (!emailToast) return;
        emailToast.textContent = email + " · " + msg;
        emailToast.classList.add("is-shown");
        clearTimeout(emailToast._t);
        emailToast._t = setTimeout(function () { emailToast.classList.remove("is-shown"); }, 2600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(show, show);
      } else {
        var ta = document.createElement("textarea");
        ta.value = email; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); } catch (err) {}
        document.body.removeChild(ta); show();
      }
    });
  }

  /* Private review badges — admin-only. Status comes from localStorage (written by /admin/ on the
     same origin), NEVER from page HTML, so non-admin visitors see nothing and the source never
     leaks review state. Keyed by section/slug via [data-rk] on each card. */
  function paintReviewBadges() {
    var raw;
    try { raw = localStorage.getItem("sc_review_status"); } catch (e) { return; }
    if (!raw) return;
    var map;
    try { map = (JSON.parse(raw) || {}).map || {}; } catch (e) { return; }
    var lm = (document.body.className || "").match(/lang-([a-z]+)/); var lang = lm ? lm[1] : "en";
    var RVL = { none: ["미검수", "#9a7b1f", "#FBF1D6", "#E8D6A8"], reviewing: ["검수중", "#8a6d1f", "#FFF3D9", "#EBD9B0"], done: ["검수완료", "#1b7a3d", "#E7F6EC", "#B7E4C7"] };
    document.querySelectorAll("[data-rk]").forEach(function (card) {
      if (card.querySelector(".rv-badge")) return;
      var st = map[card.getAttribute("data-rk")];
      if (!st || !(lang in st)) return;
      var v = RVL[st[lang]] || RVL.none;
      var meta = card.querySelector(".card__meta") || card;
      var b = document.createElement("span");
      b.className = "rv-badge";
      b.textContent = v[0];
      b.title = "검수 상태 · 나만 보임(외부 비공개)";
      b.style.cssText = "display:inline-block;font-size:.66rem;font-weight:700;letter-spacing:.02em;padding:1px 7px;border-radius:6px;margin-left:8px;vertical-align:1px;color:" + v[1] + ";background:" + v[2] + ";border:1px solid " + v[3] + ";";
      meta.appendChild(b);
    });
  }
  paintReviewBadges();
  window.addEventListener("storage", function (e) { if (e.key === "sc_review_status") paintReviewBadges(); });
})();

/* Instagram CTA: on touch devices (phone), swap the DM web link for the profile so it opens the app where you can follow */
(function () {
  try {
    var a = document.querySelector("[data-ig-follow]");
    if (a && window.matchMedia && matchMedia("(pointer:coarse)").matches) {
      a.href = a.getAttribute("data-ig-follow");
    }
  } catch (e) {}
})();
