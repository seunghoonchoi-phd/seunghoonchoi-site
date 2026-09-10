"use strict";

// Shared helpers for the content checkers in tools/.
//
// parseLanguages() and walkMarkdown() used to be copy-pasted into four scripts,
// which meant a fix to the hugo.toml parser had to be repeated four times.
// Behaviour here is identical to those copies.

const fs = require("fs");
const path = require("path");

const root = process.cwd();

// Read a repo-relative file as UTF-8.
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

// Languages in hugo.toml declaration order, honoring an explicit contentDir override.
function parseLanguages() {
  const text = read("hugo.toml");
  const langs = [];
  let current = null;

  for (const line of text.split(/\r?\n/)) {
    const section = line.match(/^\s*\[languages\.([A-Za-z0-9_-]+)\]\s*$/);
    if (section) {
      current = { lang: section[1], contentDir: `content/${section[1]}` };
      langs.push(current);
      continue;
    }

    if (/^\s*\[/.test(line) && !/^\s*\[languages\.[A-Za-z0-9_-]+\.params\]\s*$/.test(line)) {
      current = null;
      continue;
    }

    const contentDir = line.match(/^\s*contentDir\s*=\s*"([^"]+)"/);
    if (current && contentDir) current.contentDir = contentDir[1].replace(/\\/g, "/");
  }

  return langs;
}

// Every .md under a repo-relative directory, sorted.
// Returns null when the directory does not exist, so a caller can tell
// "no language tree" apart from "an empty language tree".
// Paths come back relative to `dir`; pass { absolute: true } for full paths.
function walkMarkdown(dir, options = {}) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return null;
  const out = [];

  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) visit(p);
      else if (entry.isFile() && entry.name.endsWith(".md")) {
        out.push(options.absolute ? p : path.relative(abs, p).replace(/\\/g, "/"));
      }
    }
  }

  visit(abs);
  return out.sort();
}

// Markdown body with the front matter removed.
function bodyOnly(text) {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

module.exports = { root, read, parseLanguages, walkMarkdown, bodyOnly };
