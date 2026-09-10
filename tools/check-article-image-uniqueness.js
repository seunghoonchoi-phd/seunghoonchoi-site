#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { root, read, parseLanguages, walkMarkdown } = require("./lib/content.js");

const errors = [];

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
  if (!files) throw new Error(`missing content directory: ${lang.contentDir}`);

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
