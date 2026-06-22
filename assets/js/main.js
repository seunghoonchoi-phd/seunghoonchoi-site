/* Molecular Precision — interactions */
(function () {
  "use strict";

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
    document.querySelectorAll("[data-rk]").forEach(function (card) {
      if (card.querySelector(".rv-badge")) return;
      var st = map[card.getAttribute("data-rk")];
      if (!st) return;
      var langs = Object.keys(st);
      if (!langs.length) return;
      var n = 0; langs.forEach(function (l) { if (st[l]) n++; });
      var total = langs.length, color, bg, bd, label;
      if (n === 0) { label = "미검수"; color = "#9a7b1f"; bg = "#FBF1D6"; bd = "#E8D6A8"; }
      else if (n === total) { label = "검수완료"; color = "#1b7a3d"; bg = "#E7F6EC"; bd = "#B7E4C7"; }
      else { label = "검수 " + n + "/" + total; color = "#8a6d1f"; bg = "#FFF3D9"; bd = "#EBD9B0"; }
      var meta = card.querySelector(".card__meta") || card;
      var b = document.createElement("span");
      b.className = "rv-badge";
      b.textContent = label;
      b.title = "검수 상태 · 나만 보임(외부 비공개)";
      b.style.cssText = "display:inline-block;font-size:.66rem;font-weight:700;letter-spacing:.02em;padding:1px 7px;border-radius:6px;margin-left:8px;vertical-align:1px;color:" + color + ";background:" + bg + ";border:1px solid " + bd + ";";
      meta.appendChild(b);
    });
  }
  paintReviewBadges();
  window.addEventListener("storage", function (e) { if (e.key === "sc_review_status") paintReviewBadges(); });
})();
