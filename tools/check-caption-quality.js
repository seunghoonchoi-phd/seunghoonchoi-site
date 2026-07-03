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
    const reason = row.reason ? ` (${row.reason})` : "";
    console.error(`- ${row.file}: ${row.caption}${reason}`);
  }
  if (rows.length > 40) console.error(`... and ${rows.length - 40} more`);
  process.exit(1);
}

walk(root);

const koreanNonliteralPatterns = [
  [/에\s*가깝다/, "avoid loose '~에 가깝다' label captions"],
  [/말은\s*작|말은\s*작지만/, "avoid treating words as literally small"],
  [/손대|손을\s*대|만지지\s*못/, "avoid physical-touch metaphors for abstract systems"],
  [/일이\s*흘러|흘러가는\s*순서|흩어지|결과를\s*가두/, "state the actual process instead of movement metaphors"],
  [/모델\s*주변의\s*손발|큰길|골목|좋은\s*판|나쁜\s*판|남는\s*무기|현실의\s*접점/, "replace image-metaphor nouns with the actual object"],
  [/문턱이\s*낮아|어떤\s*줄에\s*서|머리를\s*빌려/, "avoid compressed metaphorical idioms in captions"],
  [/막힌\s*(?:지점|부분)|시간이\s*막히|풀이가[\s\S]{0,20}막히|AI를\s*붙/, "name the real delay, misunderstanding, or adoption action"],
  [/시간을\s*벌|병목|글이\s*매끄|문장\s*밖|체면을\s*건드|기회가\s*나를\s*찾/, "replace figurative shorthand with the concrete process or consequence"],
  [/책임\s*지점|필요한\s*지점|업무\s*경계|행동이\s*보상|사례[\s\S]{0,20}가르친|기회가\s*다시\s*사용/, "make the actor and object explicit"],
  [/터진다|밀어내|멈춰\s*세워/, "avoid physical-action verbs unless the action is literal"],
];

function findKoreanNonliteralIssue(caption) {
  for (const [pattern, reason] of koreanNonliteralPatterns) {
    if (pattern.test(caption)) return reason;
  }
  return "";
}

const nearbyDuplicates = [];
const titleDuplicates = [];
const quotedCaptions = [];
const markerLeaks = [];
const sameFileDuplicates = [];
const koreanStyleIssues = [];
const nonColumnCaptions = [];
let total = 0;

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const rel = path.relative(process.cwd(), file);
  const relPath = rel.replace(/\\/g, "/");
  const section = relPath.split("/")[2];
  const titleMatch = text.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  const normalizedTitle = titleMatch ? normalize(titleMatch[1]) : "";
  const seenInFile = new Map();

  for (const match of text.matchAll(/<p class="inline-image-caption">([\s\S]*?)<\/p>/g)) {
    total += 1;
    const caption = stripMarkup(match[1]);
    const normalizedCaption = normalize(caption);

    if (section !== "column") {
      nonColumnCaptions.push({ file: rel, caption });
    }

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

    if (relPath.startsWith("content/ko/")) {
      const reason = findKoreanNonliteralIssue(caption);
      if (reason) koreanStyleIssues.push({ file: rel, caption, reason });
    }
  }
}

if (nearbyDuplicates.length) fail("Caption quality check failed: captions duplicate nearby body text.", nearbyDuplicates);
if (titleDuplicates.length) fail("Caption quality check failed: captions duplicate page titles.", titleDuplicates);
if (quotedCaptions.length) fail("Caption quality check failed: captions include their own edge quotes.", quotedCaptions);
if (markerLeaks.length) fail("Caption quality check failed: captions contain empty text, temp markers, or mojibake.", markerLeaks);
if (sameFileDuplicates.length) fail("Caption quality check failed: duplicate captions within the same file.", sameFileDuplicates);
if (koreanStyleIssues.length) fail("Caption quality check failed: Korean captions should use clear subject/object/action instead of non-literal metaphors.", koreanStyleIssues);
if (nonColumnCaptions.length) fail("Caption quality check failed: inline image captions are only allowed in column pages.", nonColumnCaptions);

console.log(`Caption quality check passed (${total} captions).`);
