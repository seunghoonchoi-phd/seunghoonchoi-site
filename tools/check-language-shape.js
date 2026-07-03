#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const contentRoot = path.join(root, "content");
const sourceLang = "ko";
const sourceRoot = path.join(contentRoot, sourceLang);
const errors = [];

function readLanguages() {
  const hugo = fs.readFileSync(path.join(root, "hugo.toml"), "utf8");
  const langs = [];
  for (const line of hugo.split(/\r?\n/)) {
    const match = line.match(/^\s*\[languages\.([A-Za-z0-9_-]+)\]\s*$/);
    if (match) langs.push(match[1]);
  }
  return langs.filter((lang) => lang !== sourceLang);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function stripFrontMatter(text) {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

function countBodyLines(body, predicate) {
  let count = 0;
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (predicate(line)) count += 1;
  }
  return count;
}

function shape(text) {
  const body = stripFrontMatter(text);
  return {
    h2: countBodyLines(body, (line) => /^##\s+/.test(line)),
    h3: countBodyLines(body, (line) => /^###\s+/.test(line)),
    media: countBodyLines(body, (line) => /^!\[/.test(line) || /<img\b/i.test(line)),
    captions: countBodyLines(body, (line) => /inline-image-caption/.test(line)),
    codeFences: (body.match(/^```/gm) || []).length,
  };
}

function shouldSkip(rel) {
  return (
    rel.startsWith("literature/") ||
    rel.startsWith("incomplete/") ||
    rel.endsWith("_index.md")
  );
}

const languages = readLanguages();

for (const sourceFile of walk(sourceRoot)) {
  const rel = path.relative(sourceRoot, sourceFile).replace(/\\/g, "/");
  if (shouldSkip(rel)) continue;

  const sourceShape = shape(fs.readFileSync(sourceFile, "utf8"));
  for (const lang of languages) {
    const translatedFile = path.join(contentRoot, lang, rel);
    if (!fs.existsSync(translatedFile)) continue;

    const translatedShape = shape(fs.readFileSync(translatedFile, "utf8"));
    for (const key of Object.keys(sourceShape)) {
      if (sourceShape[key] !== translatedShape[key]) {
        errors.push(
          `${rel} [${lang}] ${key} differs from Korean source: ` +
            `${sourceShape[key]} != ${translatedShape[key]}`
        );
      }
    }
  }
}

if (errors.length) {
  console.error("Language shape check failed:\n");
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Language shape check passed for ${languages.join(", ")}.`);
