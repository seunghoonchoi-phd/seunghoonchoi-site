#!/usr/bin/env node

// Human-facing companion to tools/check-language-sync.js.
//
// check-language-sync.js is the hard gate (runs in CI, fails the build when a
// language tree drifts from the Korean source of truth). This script does the
// eyeball habit: it prints a (article x language) presence matrix and a
// "missing only" summary so you can scan parity by eye before publishing.
//
//   node tools/report-language-matrix.js          # summary + gaps only
//   node tools/report-language-matrix.js --full    # add the full check mark matrix
//   node tools/report-language-matrix.js --strict   # exit 1 if any gap (hook-friendly)

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const sourceLang = "ko";
const args = new Set(process.argv.slice(2));
const showFull = args.has("--full");
const strict = args.has("--strict");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

// Mirror parseLanguages() in check-language-sync.js: declaration order, honoring
// an explicit contentDir override when present.
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

function pad(text, width) {
  const str = String(text);
  return str.length >= width ? str : str + " ".repeat(width - str.length);
}

const langs = parseLanguages();
const langCodes = langs.map((item) => item.lang);
const ko = langs.find((item) => item.lang === sourceLang);

if (!ko) {
  console.error(`hugo.toml must define [languages.${sourceLang}]; ${sourceLang} is the source-of-truth content tree.`);
  process.exit(1);
}

const koFiles = walkMarkdown(ko.contentDir);
if (!koFiles) {
  console.error(`Source contentDir does not exist: ${ko.contentDir}`);
  process.exit(1);
}
const koSet = new Set(koFiles);

// Presence[rel][lang] = boolean, plus per-language missing/extra lists.
const filesByLang = {};
const missingByLang = {};
const extraByLang = {};
for (const lang of langs) {
  const files = walkMarkdown(lang.contentDir);
  if (!files) {
    missingByLang[lang.lang] = koFiles.slice();
    extraByLang[lang.lang] = [];
    filesByLang[lang.lang] = new Set();
    continue;
  }
  const set = new Set(files);
  filesByLang[lang.lang] = set;
  missingByLang[lang.lang] = koFiles.filter((rel) => !set.has(rel));
  extraByLang[lang.lang] = files.filter((rel) => !koSet.has(rel));
}

// ---- Summary table -------------------------------------------------------
const codeWidth = Math.max(4, ...langCodes.map((c) => c.length));
console.log(`Language content parity  (source of truth: ${sourceLang}, ${koFiles.length} files)\n`);
console.log(`  ${pad("lang", codeWidth)}  files  missing  extra  status`);
console.log(`  ${"-".repeat(codeWidth)}  -----  -------  -----  ------`);
let anyGap = false;
for (const lang of langCodes) {
  const count = filesByLang[lang].size;
  const missing = missingByLang[lang].length;
  const extra = extraByLang[lang].length;
  const ok = missing === 0 && extra === 0;
  if (!ok) anyGap = true;
  const status = lang === sourceLang ? "source" : ok ? "OK" : "DRIFT";
  console.log(
    `  ${pad(lang, codeWidth)}  ${pad(count, 5)}  ${pad(missing, 7)}  ${pad(extra, 5)}  ${status}`
  );
}

// ---- Gaps: missing / extra by language -----------------------------------
if (anyGap) {
  console.log(`\nGaps (relative to ${sourceLang}):`);
  for (const lang of langCodes) {
    if (lang === sourceLang) continue;
    const missing = missingByLang[lang];
    const extra = extraByLang[lang];
    if (!missing.length && !extra.length) continue;
    console.log(`\n  [${lang}]`);
    for (const rel of missing) console.log(`    missing: ${rel}`);
    for (const rel of extra) console.log(`    extra:   ${rel}`);
  }
} else {
  console.log(`\nAll ${langCodes.length} languages are in file parity with ${sourceLang}.`);
}

// ---- Full check-mark matrix (opt-in) -------------------------------------
if (showFull) {
  const relWidth = Math.max(7, ...koFiles.map((r) => r.length));
  const header = `  ${pad("article", relWidth)}  ` + langCodes.map((c) => pad(c, codeWidth)).join(" ");
  console.log(`\nFull matrix (checkmark = present, dot = missing):\n`);
  console.log(header);
  console.log(`  ${"-".repeat(relWidth)}  ` + langCodes.map(() => "-".repeat(codeWidth)).join(" "));
  for (const rel of koFiles) {
    const cells = langCodes
      .map((lang) => pad(filesByLang[lang].has(rel) ? "O" : ".", codeWidth))
      .join(" ");
    console.log(`  ${pad(rel, relWidth)}  ${cells}`);
  }
}

if (strict && anyGap) {
  console.error(`\nParity gaps found. (Hard gate lives in tools/check-language-sync.js.)`);
  process.exit(1);
}
