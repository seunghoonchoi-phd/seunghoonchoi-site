#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
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

function extractBodyImagePaths(text) {
  const out = new Set();

  const frontMatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (frontMatter) {
    const image = frontMatter[1].match(/^image:\s*(.*)$/m);
    if (image) out.add(image[1].trim().replace(/^['"]|['"]$/g, ""));
  }

  for (const match of text.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    out.add(match[1]);
  }

  for (const match of text.matchAll(/<img\b[^>]*\bsrc=(["'])(.*?)\1/gi)) {
    out.add(match[2]);
  }

  return [...out].filter((src) => /^\/images\/(?:col-|inline\/)/.test(src));
}

const langs = parseLanguages();
const byImage = new Map();

for (const lang of langs) {
  const files = walkMarkdown(lang.contentDir);

  for (const rel of files) {
    const text = read(path.join(lang.contentDir, rel).replace(/\\/g, "/"));
    for (const src of extractBodyImagePaths(text)) {
      const imageFile = path.join(root, "static", src.replace(/^\/images\//, "images/"));
      if (!fs.existsSync(imageFile)) {
        errors.push(`${lang.lang}:${rel} references missing image ${src}`);
      }

      if (!byImage.has(src)) byImage.set(src, new Map());
      const canonical = byImage.get(src);
      if (!canonical.has(rel)) canonical.set(rel, []);
      canonical.get(rel).push(lang.lang);
    }
  }
}

for (const [src, canonical] of byImage) {
  if (canonical.size <= 1) continue;
  const usages = [...canonical.entries()]
    .map(([rel, langsForRel]) => `${rel} [${langsForRel.sort().join(",")}]`)
    .join("; ");
  errors.push(`${src} is reused by multiple canonical content items: ${usages}`);
}

if (errors.length) {
  console.error("Article image uniqueness check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Article image uniqueness check passed.");
