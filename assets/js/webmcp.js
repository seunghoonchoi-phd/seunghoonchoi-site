/* WebMCP — expose this site's read-only tools to browser AI agents.
   Spec: W3C Web Machine Learning CG (webmachinelearning/webmcp).
   No-op unless the browser provides document.modelContext (Chrome 149+
   origin trial / chrome://flags/#enable-webmcp-testing). */
(function () {
  "use strict";

  var mc = document.modelContext || navigator.modelContext;
  if (!mc || typeof mc.registerTool !== "function") return;

  var script = document.currentScript;
  var searchIndexUrl = (script && script.dataset.searchIndex) || "/search.json";
  var llmsUrl = (script && script.dataset.llms) || "/llms.txt";
  var siteLang = document.documentElement.lang || "en";

  function fetchText(url) {
    return fetch(url, { credentials: "omit" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
      return res.text();
    });
  }

  function absoluteUrl(path) {
    return new URL(path, location.origin).href;
  }

  function register(tool) {
    try {
      var result = mc.registerTool(tool);
      if (result && typeof result.catch === "function") result.catch(function () {});
    } catch (e) { /* experimental API — never break the page */ }
  }

  register({
    name: "get_site_overview",
    description:
      "Get a curated map of this site (seunghoonchoi.com, language: " + siteLang + "): " +
      "who Seunghoon Choi is, contact and profile links, and an annotated list of every " +
      "published page — research, essays, books, apps, and study-abroad guides. " +
      "Call this first to learn what exists here.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    execute: function () {
      return fetchText(llmsUrl);
    }
  });

  register({
    name: "search_site",
    description:
      "Full-text search over every published page on this site in the current language. " +
      "Returns matching pages with title, URL, section, date, and a short summary.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search terms; all terms must match (case-insensitive)." },
        limit: { type: "number", description: "Maximum results to return (default 10, max 30)." }
      },
      required: ["query"]
    },
    annotations: { readOnlyHint: true },
    execute: function (input) {
      var query = String((input && input.query) || "").trim();
      if (!query) return Promise.resolve("Error: empty query.");
      var limit = Math.max(1, Math.min(30, Number(input && input.limit) || 10));
      var terms = query.toLowerCase().split(/\s+/);
      return fetch(searchIndexUrl, { credentials: "omit" })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then(function (items) {
          var hits = [];
          for (var i = 0; i < items.length && hits.length < limit; i++) {
            var haystack = String(items[i].search || "").toLowerCase();
            var ok = true;
            for (var t = 0; t < terms.length; t++) {
              if (haystack.indexOf(terms[t]) === -1) { ok = false; break; }
            }
            if (ok) hits.push(items[i]);
          }
          if (!hits.length) return "No results for \"" + query + "\".";
          return hits.map(function (item) {
            return "- " + item.title + " — " + absoluteUrl(item.url) +
              (item.date ? " (" + item.date + ")" : "") +
              (item.section ? " [" + item.section + "]" : "") +
              (item.subtitle ? "\n  " + item.subtitle : "");
          }).join("\n");
        });
    }
  });

  register({
    name: "get_page_text",
    description:
      "Fetch one page from this site by URL or path (same origin only) and return its main " +
      "text content as plain text. Use URLs from get_site_overview or search_site.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Absolute URL on this site, or a path like /apps/us-tax-app/." }
      },
      required: ["url"]
    },
    annotations: { readOnlyHint: true },
    execute: function (input) {
      var target;
      try { target = new URL(String((input && input.url) || ""), location.origin); }
      catch (e) { return Promise.resolve("Error: invalid URL."); }
      if (target.origin !== location.origin) {
        return Promise.resolve("Error: only pages on " + location.origin + " can be fetched.");
      }
      return fetchText(target.href).then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var root = doc.querySelector("main") || doc.body;
        if (!root) return "Error: page has no readable content.";
        var text = root.textContent.replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
        if (text.length > 40000) text = text.slice(0, 40000) + "\n[truncated]";
        var title = doc.querySelector("title");
        return (title ? title.textContent.trim() + "\n\n" : "") + text;
      });
    }
  });
})();
