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
  function closeNavDropdowns() {
    document.querySelectorAll(".nav__group.is-open").forEach(function (g) {
      g.classList.remove("is-open");
      var t = g.querySelector(".nav__toggle");
      if (t) t.setAttribute("aria-expanded", "false");
    });
  }
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open) closeNavDropdowns();
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
        closeNavDropdowns();
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
    closeNavDropdowns();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    closeNavDropdowns();
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

  /* Instagram mobile handoff. Android Chrome only opens intent links reliably
     from a direct user gesture, so turn the homepage tap into a profile link
     that opens the Instagram app when it is installed. */
  document.querySelectorAll("[data-instagram-app-link]").forEach(function (link) {
    var username = link.getAttribute("data-instagram-username") || "hoonchoi.mk1";
    var profileUrl = "https://www.instagram.com/" + encodeURIComponent(username) + "/";
    var iosAppUrl = "instagram://user?username=" + encodeURIComponent(username);
    var androidIntentUrl = "intent://www.instagram.com/" + encodeURIComponent(username) +
      "/#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=" +
      encodeURIComponent(profileUrl) + ";end";
    var isAndroid = /Android/i.test(navigator.userAgent);
    var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (!isAndroid && !isIOS) return;
    link.removeAttribute("target");
    link.href = isAndroid ? androidIntentUrl : iosAppUrl;
    if (isAndroid) return;

    link.addEventListener("click", function () {
      if (isIOS) {
        window.setTimeout(function () {
          if (!document.hidden) window.location.href = profileUrl;
        }, 1500);
      }
    });
  });

  /* Admin-only private links. These are created only in an owner browser with a
     valid admin session token, so public visitors do not see unfinished tabs. */
  function validAdminToken() {
    try {
      var raw = localStorage.getItem("sc_edit_tok");
      if (!raw) return false;
      var tok = JSON.parse(raw);
      return !!(tok && tok.token && tok.exp && tok.exp * 1000 > Date.now() + 60000);
    } catch (e) {
      return false;
    }
  }
  function currentLang() {
    var m = (document.body.className || "").match(/lang-([a-z]+)/);
    return m ? m[1] : (document.documentElement.lang || "en");
  }
  function adminHref(slug) {
    var lang = currentLang();
    return (lang === "en" ? "" : "/" + lang) + "/" + slug + "/";
  }
  var adminNavItems = [
    { slug: "incomplete", label: "미완료" }
  ];
  function paintAdminPrivateNav() {
    var nav = document.querySelector(".nav");
    var right = document.querySelector(".topbar__right");
    if (!validAdminToken()) {
      document.querySelectorAll("[data-admin-private-nav], [data-admin-incomplete]").forEach(function (el) { el.remove(); });
      return;
    }
    function makeLink(item, kind) {
      var a = document.createElement("a");
      a.href = adminHref(item.slug);
      a.className = "nav__link admin-private-link admin-private-link--" + kind;
      a.setAttribute("data-admin-private-nav", item.slug);
      a.setAttribute("data-admin-private-kind", kind);
      a.textContent = item.label;
      if (new RegExp("\\/" + item.slug + "\\/?$").test(location.pathname)) a.classList.add("is-active");
      return a;
    }
    if (right) {
      var anchor = right.querySelector(".langswitch") || right.firstChild;
      adminNavItems.forEach(function (item) {
        if (!right.querySelector("[data-admin-private-nav='" + item.slug + "'][data-admin-private-kind='top']")) {
          right.insertBefore(makeLink(item, "top"), anchor);
        }
      });
    }
    if (nav) {
      adminNavItems.forEach(function (item) {
        if (!nav.querySelector("[data-admin-private-nav='" + item.slug + "'][data-admin-private-kind='mobile']")) {
          nav.appendChild(makeLink(item, "mobile"));
        }
      });
    }
  }
  paintAdminPrivateNav();
  window.addEventListener("sc-admin-auth", paintAdminPrivateNav);
  window.addEventListener("storage", function (e) {
    if (e.key === "sc_edit_tok") paintAdminPrivateNav();
  });
  window.setInterval(paintAdminPrivateNav, 60000);

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
  document.querySelectorAll("[data-filter]").forEach(function (bar) {
    var scope = bar.closest(".section") || document;
    var list = scope.querySelector("[data-list]");
    if (!list) return;
    bar.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".chip");
      if (!btn) return;
      bar.querySelectorAll(".chip").forEach(function (c) {
        var active = c === btn;
        c.classList.toggle("is-active", active);
        c.setAttribute("aria-pressed", active ? "true" : "false");
      });
      var cat = btn.getAttribute("data-cat") || "*";
      list.querySelectorAll(".card").forEach(function (card) {
        var cardCat = card.getAttribute("data-cat") || "";
        var show = cat === "*" || cardCat === cat;
        card.classList.toggle("is-hidden", !show);
        card.hidden = !show;
      });
    });
  });

  /* Language-scoped site search. Home searches the current language; section pages
     search only their current tab/section, including title, subtitle, tags, and body text. */
  var searchIndexCache = {};
  function normalizeSearchText(value) {
    var text = String(value || "");
    if (text.normalize) text = text.normalize("NFKC");
    return text.toLowerCase();
  }
  function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch];
    });
  }
  function loadSearchIndex(url) {
    if (!url || !window.fetch) return Promise.resolve([]);
    if (!searchIndexCache[url]) {
      searchIndexCache[url] = fetch(url, { credentials: "same-origin" })
        .then(function (res) { return res.ok ? res.json() : []; })
        .catch(function () { return []; });
    }
    return searchIndexCache[url];
  }
  function resultCard(item) {
    var tags = Array.isArray(item.tags) ? item.tags.slice(0, 6) : [];
    var meta = [];
    if (item.source) meta.push('<span class="search-result__source">' + escapeHTML(item.source) + '</span>');
    if (item.date) meta.push('<time datetime="' + escapeHTML(item.datetime || "") + '">' + escapeHTML(item.date) + '</time>');
    if (item.category) meta.push('<span class="search-result__cat">' + escapeHTML(item.category) + '</span>');
    var thumb = item.image
      ? '<a class="search-result__thumb" href="' + escapeHTML(item.url) + '" tabindex="-1" aria-hidden="true"><img src="' + escapeHTML(item.image) + '" alt="" loading="lazy"></a>'
      : '<a class="search-result__thumb search-result__thumb--fallback" href="' + escapeHTML(item.url) + '" tabindex="-1" aria-hidden="true"><span>' + escapeHTML(item.category || item.source || "Result") + '</span></a>';
    return '<article class="card search-result">' +
      thumb +
      '<div class="search-result__body">' +
        '<h3 class="card__title search-result__title"><a href="' + escapeHTML(item.url) + '">' + escapeHTML(item.title) + '</a></h3>' +
        (item.subtitle ? '<p class="search-result__excerpt">' + escapeHTML(item.subtitle) + '</p>' : '') +
        (meta.length ? '<div class="card__meta search-result__meta">' + meta.join("") + '</div>' : '') +
        (tags.length ? '<div class="search-result__tags">' + tags.map(function (tag) { return '<span class="search-result__tag">#' + escapeHTML(tag) + '</span>'; }).join("") + '</div>' : '') +
      '</div>' +
    '</article>';
  }
  document.querySelectorAll("[data-site-search]").forEach(function (module) {
    var input = module.querySelector("[data-search-input]");
    var clear = module.querySelector("[data-search-clear]");
    var panel = module.querySelector("[data-search-results]");
    var list = module.querySelector("[data-search-list]");
    var count = module.querySelector("[data-search-count]");
    var empty = module.querySelector("[data-search-empty]");
    var indexURL = module.getAttribute("data-search-index");
    var suffix = module.getAttribute("data-search-count-suffix") || " results";
    var mode = module.getAttribute("data-search-scope") || "section";
    var section = module.getAttribute("data-search-section") || "";
    var sectionRoot = module.closest(".section");
    var normalList = sectionRoot ? sectionRoot.querySelector("[data-list]") : null;
    var pager = sectionRoot ? sectionRoot.querySelector(".pagination") : null;
    var homeFull = mode === "home" ? document.querySelector(".home-full") : null;
    var seq = 0;
    if (!input || !panel || !list) return;

    function setSearchActive(active) {
      module.classList.toggle("is-searching", active);
      if (sectionRoot) sectionRoot.classList.toggle("is-searching", active);
      if (normalList) normalList.hidden = active;
      if (pager) pager.hidden = active;
      if (homeFull) homeFull.hidden = active;
      if (clear) clear.hidden = !active;
      panel.hidden = !active;
    }
    function applySearch() {
      var query = input.value || "";
      var terms = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
      var run = ++seq;
      if (!terms.length) {
        list.innerHTML = "";
        if (count) count.textContent = "";
        if (empty) empty.hidden = true;
        setSearchActive(false);
        return;
      }
      setSearchActive(true);
      loadSearchIndex(indexURL).then(function (items) {
        if (run !== seq) return;
        var results = (Array.isArray(items) ? items : []).filter(function (item) {
          if (mode === "section" && section && item.section !== section) return false;
          var hay = normalizeSearchText(item.search);
          return terms.every(function (term) { return hay.indexOf(term) !== -1; });
        }).map(function (item) {
          var hay = normalizeSearchText(item.search);
          var title = normalizeSearchText(item.title);
          var subtitle = normalizeSearchText(item.subtitle);
          var tagText = normalizeSearchText(Array.isArray(item.tags) ? item.tags.join(" ") : "");
          var score = 0;
          terms.forEach(function (term) {
            if (title.indexOf(term) !== -1) score += 40;
            if (subtitle.indexOf(term) !== -1) score += 18;
            if (tagText.indexOf(term) !== -1) score += 14;
            if (hay.indexOf(term) !== -1) score += 1;
          });
          item._score = score;
          return item;
        }).sort(function (a, b) {
          if (b._score !== a._score) return b._score - a._score;
          return String(b.datetime || "").localeCompare(String(a.datetime || ""));
        });
        if (count) count.textContent = results.length + suffix;
        if (empty) empty.hidden = results.length !== 0;
        list.innerHTML = results.map(resultCard).join("");
      });
    }
    input.addEventListener("input", applySearch);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && input.value) {
        input.value = "";
        applySearch();
      }
    });
    if (clear) {
      clear.addEventListener("click", function () {
        input.value = "";
        input.focus();
        applySearch();
      });
    }
  });

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
