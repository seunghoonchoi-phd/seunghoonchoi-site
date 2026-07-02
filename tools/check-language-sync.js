#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const errors = [];
const parityFrontMatterKeys = ["draft", "hidden", "build", "pinned", "series", "weight", "image", "ogimage"];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

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

function walkMarkdown(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return null;
  const out = [];

  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) visit(p);
      else if (entry.isFile() && entry.name.endsWith(".md")) {
        out.push(path.relative(abs, p).replace(/\\/g, "/"));
      }
    }
  }

  visit(abs);
  return out.sort();
}

function parseFrontMatter(rel) {
  const text = read(rel);
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return {};

  const out = {};
  for (const raw of match[1].split(/\r?\n/)) {
    const line = raw.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (line) out[line[1]] = line[2].trim();
  }
  return out;
}

function markdownH2Count(rel) {
  return [...read(rel).matchAll(/^##\s+.+$/gm)].length;
}

function tomlSectionKeys(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, "utf8");
  return [...text.matchAll(/^\s*\[([^\]]+)\]\s*$/gm)].map((m) => m[1]).sort();
}

function diff(base, other) {
  const a = new Set(base);
  const b = new Set(other);
  return {
    missing: base.filter((x) => !b.has(x)),
    extra: other.filter((x) => !a.has(x)),
  };
}

function expectTextContains(rel, token, message) {
  if (!exists(rel)) {
    errors.push(`${rel} is missing.`);
    return;
  }
  if (!read(rel).includes(token)) errors.push(message);
}

const langs = parseLanguages();
const langCodes = langs.map((item) => item.lang);
const ko = langs.find((item) => item.lang === "ko");

if (!ko) {
  errors.push("hugo.toml must define [languages.ko]; Korean is the source-of-truth content tree.");
} else {
  const koFiles = walkMarkdown(ko.contentDir);
  if (!koFiles) {
    errors.push(`Korean contentDir does not exist: ${ko.contentDir}`);
  } else {
    for (const lang of langs) {
      const files = walkMarkdown(lang.contentDir);
      if (!files) {
        errors.push(`[${lang.lang}] contentDir does not exist: ${lang.contentDir}`);
        continue;
      }

      const result = diff(koFiles, files);
      if (result.missing.length || result.extra.length) {
        errors.push(
          `[${lang.lang}] content tree differs from ko (${lang.contentDir})` +
            (result.missing.length ? `\n  missing:\n    ${result.missing.join("\n    ")}` : "") +
            (result.extra.length ? `\n  extra:\n    ${result.extra.join("\n    ")}` : "")
        );
      }

      for (const rel of koFiles) {
        const target = `${lang.contentDir}/${rel}`;
        if (!exists(target)) continue;

        const koFm = parseFrontMatter(`${ko.contentDir}/${rel}`);
        const langFm = parseFrontMatter(target);
        const mismatches = parityFrontMatterKeys.filter((key) => (koFm[key] || "") !== (langFm[key] || ""));

        if (mismatches.length) {
          errors.push(
            `[${lang.lang}] front matter differs from ko for ${rel}\n` +
              mismatches.map((key) => `  ${key}: ko=${koFm[key] || "(empty)"} ${lang.lang}=${langFm[key] || "(empty)"}`).join("\n")
          );
        }

        if (rel.startsWith("column/") && rel !== "column/_index.md") {
          const koH2Count = markdownH2Count(`${ko.contentDir}/${rel}`);
          const langH2Count = markdownH2Count(target);
          if (koH2Count !== langH2Count) {
            errors.push(
              `[${lang.lang}] column H2 count differs from ko for ${rel}\n` +
                `  ko=${koH2Count} ${lang.lang}=${langH2Count}`
            );
          }
        }
      }
    }
  }
}

const koI18n = tomlSectionKeys("i18n/ko.toml");
if (!koI18n) {
  errors.push("i18n/ko.toml is missing.");
} else {
  for (const lang of langs) {
    const rel = `i18n/${lang.lang}.toml`;
    const keys = tomlSectionKeys(rel);
    if (!keys) {
      errors.push(`[${lang.lang}] ${rel} is missing.`);
      continue;
    }
    const result = diff(koI18n, keys);
    if (result.missing.length || result.extra.length) {
      errors.push(
        `[${lang.lang}] i18n keys differ from ko` +
          (result.missing.length ? `\n  missing: ${result.missing.join(", ")}` : "") +
          (result.extra.length ? `\n  extra: ${result.extra.join(", ")}` : "")
      );
    }
  }
}

const switcher = read("layouts/partials/langswitch.html");
for (const lang of langs) {
  const token = `"${lang.lang}"`;
  if (!switcher.includes(token)) {
    errors.push(`layouts/partials/langswitch.html does not include configured language ${token}.`);
  }
}

for (const lang of langCodes) {
  expectTextContains(
    "static/admin/index.html",
    `'${lang}'`,
    `static/admin/index.html admin language list does not include '${lang}'.`
  );
  expectTextContains(
    "static/admin/edit.js",
    `'${lang}'`,
    `static/admin/edit.js inline edit language list does not include '${lang}'.`
  );
}

if (errors.length) {
  console.error("Language sync check failed:\n");
  console.error(errors.join("\n\n"));
  process.exit(1);
}

console.log(`Language sync check passed for ${langCodes.join(", ")}.`);
