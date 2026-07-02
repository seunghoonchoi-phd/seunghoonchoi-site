const fs = require("fs");
const path = require("path");

const root = path.join(process.cwd(), "content");
const windowSize = 1200;
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(full);
  }
}

function stripMarkup(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return stripMarkup(value)
    .toLowerCase()
    .replace(/["'`.,!?;:\s]/g, "")
    .replace(/[\u201c\u201d\u2018\u2019]/g, "")
    .replace(/[，。！？；：،؛؟]/g, "");
}

function fail(message, rows) {
  console.error(message);
  for (const row of rows.slice(0, 40)) {
    console.error(`- ${row.file}: ${row.caption}`);
  }
  if (rows.length > 40) console.error(`... and ${rows.length - 40} more`);
  process.exit(1);
}

walk(root);

const nearbyDuplicates = [];
const titleDuplicates = [];
const quotedCaptions = [];
const markerLeaks = [];
const sameFileDuplicates = [];
let total = 0;

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(process.cwd(), file);
  const titleMatch = text.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  const normalizedTitle = titleMatch ? normalize(titleMatch[1]) : "";
  const seenInFile = new Map();

  for (const match of text.matchAll(/<p class="inline-image-caption">([\s\S]*?)<\/p>/g)) {
    total += 1;
    const caption = stripMarkup(match[1]);
    const normalizedCaption = normalize(caption);

    if (!normalizedCaption) {
      markerLeaks.push({ file: rel, caption: "(empty caption)" });
      continue;
    }

    const before = normalize(text.slice(Math.max(0, match.index - windowSize), match.index));
    const after = normalize(text.slice(match.index + match[0].length, match.index + match[0].length + windowSize));
    if (normalizedCaption.length >= 12 && (before.includes(normalizedCaption) || after.includes(normalizedCaption))) {
      nearbyDuplicates.push({ file: rel, caption });
    }

    if (normalizedTitle && normalizedTitle === normalizedCaption) {
      titleDuplicates.push({ file: rel, caption });
    }

    if (/^[\s'"`\u201c\u201d\u2018\u2019]|['"`\u201c\u201d\u2018\u2019]\s*$/.test(caption)) {
      quotedCaptions.push({ file: rel, caption });
    }

    if (/CAPTION_\d+|\?\?\?/.test(caption)) {
      markerLeaks.push({ file: rel, caption });
    }

    if (seenInFile.has(normalizedCaption)) {
      sameFileDuplicates.push({ file: rel, caption });
    } else {
      seenInFile.set(normalizedCaption, true);
    }
  }
}

if (nearbyDuplicates.length) fail("Caption quality check failed: captions duplicate nearby body text.", nearbyDuplicates);
if (titleDuplicates.length) fail("Caption quality check failed: captions duplicate page titles.", titleDuplicates);
if (quotedCaptions.length) fail("Caption quality check failed: captions include their own edge quotes.", quotedCaptions);
if (markerLeaks.length) fail("Caption quality check failed: captions contain empty text, temp markers, or mojibake.", markerLeaks);
if (sameFileDuplicates.length) fail("Caption quality check failed: duplicate captions within the same file.", sameFileDuplicates);

console.log(`Caption quality check passed (${total} captions).`);
