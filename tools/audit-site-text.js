#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const args = process.argv.slice(2);
const failOnHard = args.includes("--fail-on-hard");
const includeRendered = !args.includes("--source-only");
const outputDir = valueAfter("--output");
const renderedDir = valueAfter("--rendered") || path.join(root, "public");

const report = {
  generatedAt: new Date().toISOString(),
  root,
  scope: {
    source: ["content", "i18n", "layouts", "hugo.toml", "index.html", "uf-guide.html"],
    rendered: includeRendered ? path.relative(root, renderedDir).replace(/\\/g, "/") || "." : null,
  },
  totals: {
    contentFiles: 0,
    i18nFiles: 0,
    layoutFiles: 0,
    configFiles: 0,
    staticHtmlFiles: 0,
    renderedPages: 0,
    sourceTextBlocks: 0,
    sourceSentences: 0,
    renderedTextBlocks: 0,
    renderedSentences: 0,
  },
  byLanguage: {},
  hardIssues: [],
  advisoryIssues: [],
  files: [],
};

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : "";
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function exists(file) {
  return fs.existsSync(file);
}

function walk(dir, predicate = () => true) {
  if (!exists(dir)) return [];
  const out = [];

  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && predicate(full)) out.push(full);
    }
  }

  visit(dir);
  return out.sort();
}

function parseLanguages() {
  const config = read(path.join(root, "hugo.toml"));
  const langs = [];
  let current = null;

  for (const line of config.split(/\r?\n/)) {
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

function ensureLang(lang) {
  if (!report.byLanguage[lang]) {
    report.byLanguage[lang] = {
      contentFiles: 0,
      sourceTextBlocks: 0,
      sourceSentences: 0,
      renderedPages: 0,
      renderedTextBlocks: 0,
      renderedSentences: 0,
    };
  }
  return report.byLanguage[lang];
}

function parseFrontMatter(text) {
  const match = text.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/);
  if (!match) return { front: "", body: text, values: {} };
  const front = match[1];
  const values = {};

  for (const line of front.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.+?)\s*$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return { front, body: text.slice(match[1].length), values };
}

function isDraftLike(fileRel, frontValues) {
  return fileRel.includes("/incomplete/") || /^true$/i.test(frontValues.draft || "");
}

function decodeEntities(text) {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    ndash: "\u2013",
    mdash: "\u2014",
    hellip: "\u2026",
  };

  return text.replace(/&(#x?[0-9A-Fa-f]+|[A-Za-z]+);/g, (all, entity) => {
    if (entity[0] === "#") {
      const base = entity[1] && entity[1].toLowerCase() === "x" ? 16 : 10;
      const raw = entity[1] && entity[1].toLowerCase() === "x" ? entity.slice(2) : entity.slice(1);
      const code = Number.parseInt(raw, base);
      return Number.isFinite(code) ? String.fromCodePoint(code) : all;
    }
    return named[entity] || all;
  });
}

function cleanText(text) {
  return decodeEntities(text)
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}

function shortcodeText(text) {
  const values = [];
  text.replace(/\b(?:title|subtitle|caption|alt|label|text|ariaLabel)\s*=\s*"([^"]+)"/g, (_, value) => {
    values.push(value);
    return "";
  });
  return values.join(" ");
}

function markdownPlainText(text) {
  const shortcodes = shortcodeText(text);
  let next = text
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\{\{<[^>]+>\}\}/g, " ")
    .replace(/\{\{%[\s\S]*?%\}\}/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[|`*_~>#]/g, " ");
  if (shortcodes) next += ` ${shortcodes}`;
  return cleanText(next);
}

function htmlVisibleText(html, includeTitle = true) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch && includeTitle ? cleanText(stripTags(titleMatch[1])) : "";
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1] : html;
  body = body
    .replace(/\{\{[\s\S]*?\}\}/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(?:p|div|section|article|header|footer|nav|main|aside|li|tr|td|th|h[1-6]|br)\b[^>]*>/gi, "\n")
    .replace(/<\/(?:p|div|section|article|header|footer|nav|main|aside|li|tr|td|th|h[1-6])>/gi, "\n");
  const text = cleanText(stripTags(body));
  return [title, text].filter(Boolean).join("\n");
}

function stripTags(text) {
  return text.replace(/<[^>]+>/g, " ");
}

function textBlocksFromPlain(text) {
  return text
    .split(/\r?\n+/)
    .map(cleanText)
    .filter((item) => item && !/^[{}\[\](),.;:|/\\-]+$/.test(item));
}

function frontMatterBlocks(values) {
  const keys = new Set([
    "title",
    "subtitle",
    "description",
    "summary",
    "seoTitle",
    "seoDescription",
    "menuTitle",
    "caption",
    "alt",
    "imageAlt",
  ]);
  const blocks = [];
  for (const [key, value] of Object.entries(values)) {
    if (keys.has(key) && value && !/^(true|false|\d{4}-\d{2}-\d{2})$/i.test(value)) {
      blocks.push({ kind: `front:${key}`, text: cleanText(value) });
    }
  }
  return blocks;
}

function markdownBlocks(body) {
  const sourceBody = body
    .replace(/<style\b[\s\S]*?<\/style>/gi, "\n")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "\n");
  const blocks = [];
  let current = [];
  let inFence = false;
  let fence = [];

  function pushCurrent() {
    const raw = current.join("\n");
    const text = markdownPlainText(raw);
    if (text) blocks.push({ kind: "markdown", text });
    current = [];
  }

  function pushFence() {
    const raw = fence.join("\n").replace(/^\s*```[A-Za-z0-9_-]*\s*/m, "").replace(/\s*```\s*$/m, "");
    const text = cleanText(raw);
    if (text) blocks.push({ kind: "code", text });
    fence = [];
  }

  for (const line of sourceBody.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      if (!inFence) {
        if (current.length) pushCurrent();
        fence = [line];
        inFence = true;
      } else {
        fence.push(line);
        pushFence();
        inFence = false;
      }
      continue;
    }

    if (inFence) {
      fence.push(line);
      continue;
    }

    if (/^\s*$/.test(line)) {
      if (current.length) pushCurrent();
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      if (current.length) pushCurrent();
      continue;
    }

    if (/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)) {
      if (current.length) pushCurrent();
      continue;
    }

    if (/<(?:p|div|section|article|header|footer|nav|main|aside|li|td|th|h[1-6])\b/i.test(line)) {
      if (current.length) pushCurrent();
      for (const item of textBlocksFromPlain(htmlVisibleText(line, false))) {
        blocks.push({ kind: "html-line", text: item });
      }
      continue;
    }

    if (/^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|\|)/.test(line)) {
      if (current.length) pushCurrent();
      const text = markdownPlainText(line);
      if (text) blocks.push({ kind: "markdown-line", text });
      continue;
    }

    current.push(line);
  }

  if (current.length) pushCurrent();
  if (fence.length) pushFence();
  return blocks;
}

function splitSentences(lang, text) {
  const normalized = cleanText(text);
  if (!normalized) return [];
  const parts = normalized
    .split(/(?<=[.!?。！？؟।])\s+|(?<=[.!?。！？؟।])(?=[^\s])/u)
    .map(cleanText)
    .filter(Boolean);
  if (parts.length) return parts;

  if (["ko", "ja", "zh"].includes(lang) && Array.from(normalized).length > 120) {
    return [normalized];
  }
  if (!["ko", "ja", "zh"].includes(lang) && normalized.split(/\s+/).length > 24) {
    return [normalized];
  }
  return normalized ? [normalized] : [];
}

function languageFromContentRel(fileRel) {
  const match = fileRel.match(/^content\/([^/]+)\//);
  return match ? match[1] : "site";
}

function languageFromRenderedRel(fileRel) {
  const first = fileRel.split("/")[0];
  return ["ko", "zh", "es", "hi", "ar", "ja"].includes(first) ? first : "en";
}

function addIssue(kind, issue) {
  report[kind].push(issue);
}

function inspectText({ fileRel, lang, source, kind, text, draftLike = false }) {
  const sentences = splitSentences(lang, text);
  const publicText = !draftLike;

  if (/\uFFFD/.test(text)) {
    addIssue("hardIssues", { rule: "replacement-character", file: fileRel, source, kind, text: sample(text) });
  }
  if (/\{\{|\}\}|<%|%>/.test(text) && source === "rendered") {
    addIssue("hardIssues", { rule: "template-leaked-rendered", file: fileRel, source, kind, text: sample(text) });
  }
  if (/(?:^|[\s([<{])(?:TODO|FIXME|TBD)(?:\s*:|\s*-|\s*\]|$)/.test(text) && publicText) {
    addIssue("hardIssues", { rule: "draft-marker", file: fileRel, source, kind, text: sample(text) });
  }
  if (lang === "ko" && publicText && /[\u2013\u2014]/.test(text)) {
    addIssue("hardIssues", { rule: "korean-dash", file: fileRel, source, kind, text: sample(text) });
  }
  if (lang === "ko" && publicText && /(?:\s---\s*$|&mdash;|&ndash;)/i.test(text)) {
    addIssue("hardIssues", { rule: "korean-dash-source", file: fileRel, source, kind, text: sample(text) });
  }

  for (const sentence of sentences) {
    const tooLong =
      ["ko", "ja", "zh"].includes(lang)
        ? Array.from(sentence.replace(/\s/g, "")).length > 190
        : sentence.split(/\s+/).length > 44;
    if (source !== "rendered" && tooLong && kind !== "code") {
      addIssue("advisoryIssues", {
        rule: "long-sentence-review",
        file: fileRel,
        source,
        kind,
        lang,
        text: sample(sentence, 160),
      });
    }
  }

  return sentences.length;
}

function sample(text, limit = 120) {
  const value = cleanText(text);
  return value.length > limit ? `${value.slice(0, limit - 1)}...` : value;
}

function duplicateKey(text) {
  return cleanText(text)
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}"'`*_~<>|/\\\u3000\u3001\u3002\uFF0C\uFF01\uFF1F\u061F\u060C\u0964]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inspectAdjacentDuplicates(fileRel, source, lang, blocks, draftLike) {
  if (draftLike) return;
  if (fileRel.endsWith("/_index.md")) return;
  let previous = "";
  const recent = [];

  for (const block of blocks) {
    if (block.kind.startsWith("front:")) continue;
    const key = duplicateKey(block.text);
    if (key.length > 40 && key === previous) {
      addIssue("hardIssues", {
        rule: "adjacent-duplicate-text",
        file: fileRel,
        source,
        kind: block.kind,
        lang,
        text: sample(block.text),
      });
    }
    if (key.length > 90 && recent.some((item) => item.key === key)) {
      addIssue("hardIssues", {
        rule: "near-duplicate-text",
        file: fileRel,
        source,
        kind: block.kind,
        lang,
        text: sample(block.text),
      });
    }
    if (block.kind === "markdown-line" && key.length > 12 && key === previous) {
      addIssue("hardIssues", {
        rule: "adjacent-duplicate-heading",
        file: fileRel,
        source,
        kind: block.kind,
        lang,
        text: sample(block.text),
      });
    }
    if (key) previous = key;
    if (key) {
      recent.push({ key });
      if (recent.length > 6) recent.shift();
    }
  }
}

function inspectFrontMatterLeak(fileRel, body, draftLike) {
  if (draftLike) return;
  let inFence = false;
  const leaked = [];

  for (const line of body.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^\s*(title|description|date|categories|tags|subtitle|seoTitle|image|reviewStatus|draft)\s*:/.test(line)) {
      leaked.push(line.trim());
    }
  }

  if (leaked.length) {
    addIssue("hardIssues", {
      rule: "frontmatter-leaked-body",
      file: fileRel,
      source: "content",
      kind: "raw-body",
      text: sample(leaked.join(" ")),
    });
  }
}

function auditContentFile(file, lang) {
  const fileRel = rel(file);
  const parsed = parseFrontMatter(read(file));
  const draftLike = isDraftLike(fileRel, parsed.values);
  const blocks = [...frontMatterBlocks(parsed.values), ...markdownBlocks(parsed.body)];
  let sentences = 0;

  inspectFrontMatterLeak(fileRel, parsed.body, draftLike);
  inspectAdjacentDuplicates(fileRel, "content", lang, blocks, draftLike);

  for (const block of blocks) {
    sentences += inspectText({
      fileRel,
      lang,
      source: "content",
      kind: block.kind,
      text: block.text,
      draftLike,
    });
  }

  report.totals.contentFiles += 1;
  report.totals.sourceTextBlocks += blocks.length;
  report.totals.sourceSentences += sentences;

  const langStats = ensureLang(lang);
  langStats.contentFiles += 1;
  langStats.sourceTextBlocks += blocks.length;
  langStats.sourceSentences += sentences;

  report.files.push({ file: fileRel, source: "content", lang, blocks: blocks.length, sentences, draftLike });
}

function auditTomlFile(file, source) {
  const fileRel = rel(file);
  const lang = source === "i18n" ? path.basename(file, ".toml") : "site";
  const blocks = [];
  for (const line of read(file).split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*"([^"]+)"\s*$/);
    if (!match) continue;
    const key = match[1];
    const value = cleanText(match[2]);
    if (!value) continue;
    if (/^(baseURL|url|image|src|path|contentDir|weight|date|email)$/i.test(key)) continue;
    blocks.push({ kind: `toml:${key}`, text: value });
  }
  let sentences = 0;
  for (const block of blocks) {
    sentences += inspectText({ fileRel, lang, source, kind: block.kind, text: block.text });
  }
  if (source === "i18n") report.totals.i18nFiles += 1;
  else report.totals.configFiles += 1;
  report.totals.sourceTextBlocks += blocks.length;
  report.totals.sourceSentences += sentences;
  report.files.push({ file: fileRel, source, lang, blocks: blocks.length, sentences });
}

function auditHugoConfig(file) {
  const fileRel = rel(file);
  let currentLang = "site";
  const blocks = [];

  for (const line of read(file).split(/\r?\n/)) {
    const section = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (section) {
      const langSection = section[1].match(/^languages\.([A-Za-z0-9_-]+)/);
      currentLang = langSection ? langSection[1] : "site";
      continue;
    }

    const match = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*"([^"]+)"\s*$/);
    if (!match) continue;
    const key = match[1];
    const value = cleanText(match[2]);
    if (!value) continue;
    if (/^(baseURL|url|image|src|path|contentDir|weight|date|email)$/i.test(key)) continue;
    blocks.push({ lang: currentLang, kind: `toml:${key}`, text: value });
  }

  let sentences = 0;
  for (const block of blocks) {
    sentences += inspectText({
      fileRel,
      lang: block.lang,
      source: "config",
      kind: block.kind,
      text: block.text,
    });
  }

  report.totals.configFiles += 1;
  report.totals.sourceTextBlocks += blocks.length;
  report.totals.sourceSentences += sentences;
  report.files.push({ file: fileRel, source: "config", lang: "mixed", blocks: blocks.length, sentences });
}

function auditHtmlSource(file, source) {
  const fileRel = rel(file);
  const text = htmlVisibleText(read(file), true);
  const blocks = textBlocksFromPlain(text);
  let sentences = 0;
  for (const block of blocks) {
    sentences += inspectText({ fileRel, lang: "site", source, kind: "html", text: block });
  }
  if (source === "layout") report.totals.layoutFiles += 1;
  if (source === "static-html") report.totals.staticHtmlFiles += 1;
  report.totals.sourceTextBlocks += blocks.length;
  report.totals.sourceSentences += sentences;
  report.files.push({ file: fileRel, source, lang: "site", blocks: blocks.length, sentences });
}

function auditRenderedHtml(file) {
  const fileRel = rel(file);
  const renderedRootRel = rel(renderedDir);
  const relativeToRendered = path.relative(renderedDir, file).replace(/\\/g, "/");
  const lang = languageFromRenderedRel(relativeToRendered);
  const text = htmlVisibleText(read(file), true);
  const blocks = textBlocksFromPlain(text);
  let sentences = 0;

  for (const block of blocks) {
    sentences += inspectText({ fileRel, lang, source: "rendered", kind: "html", text: block });
  }

  report.totals.renderedPages += 1;
  report.totals.renderedTextBlocks += blocks.length;
  report.totals.renderedSentences += sentences;

  const langStats = ensureLang(lang);
  langStats.renderedPages += 1;
  langStats.renderedTextBlocks += blocks.length;
  langStats.renderedSentences += sentences;

  report.files.push({
    file: fileRel,
    renderedPath: `${renderedRootRel}/${relativeToRendered}`.replace(/\\/g, "/"),
    source: "rendered",
    lang,
    blocks: blocks.length,
    sentences,
  });
}

for (const lang of parseLanguages()) {
  const files = walk(path.join(root, lang.contentDir), (file) => file.endsWith(".md"));
  for (const file of files) auditContentFile(file, lang.lang);
}

for (const file of walk(path.join(root, "i18n"), (item) => item.endsWith(".toml"))) auditTomlFile(file, "i18n");
if (exists(path.join(root, "hugo.toml"))) auditHugoConfig(path.join(root, "hugo.toml"));
for (const file of walk(path.join(root, "layouts"), (item) => item.endsWith(".html"))) auditHtmlSource(file, "layout");
for (const name of ["index.html", "uf-guide.html"]) {
  const file = path.join(root, name);
  if (exists(file)) auditHtmlSource(file, "static-html");
}

if (includeRendered && exists(renderedDir)) {
  const renderedFiles = walk(renderedDir, (item) => item.endsWith(".html"));
  for (const file of renderedFiles) auditRenderedHtml(file);
}

function writeReports() {
  if (!outputDir) return;
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "site-text-audit.json"), JSON.stringify(report, null, 2), "utf8");

  const lines = [];
  lines.push("# Site Text Audit");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push("## Totals");
  for (const [key, value] of Object.entries(report.totals)) lines.push(`- ${key}: ${value}`);
  lines.push("");
  lines.push("## By Language");
  for (const [lang, stats] of Object.entries(report.byLanguage).sort()) {
    lines.push(`- ${lang}: contentFiles=${stats.contentFiles}, sourceBlocks=${stats.sourceTextBlocks}, sourceSentences=${stats.sourceSentences}, renderedPages=${stats.renderedPages}, renderedBlocks=${stats.renderedTextBlocks}, renderedSentences=${stats.renderedSentences}`);
  }
  lines.push("");
  lines.push(`## Hard Issues (${report.hardIssues.length})`);
  for (const item of report.hardIssues.slice(0, 300)) {
    lines.push(`- ${item.rule}: ${item.file} :: ${item.text}`);
  }
  if (report.hardIssues.length > 300) lines.push(`- ... ${report.hardIssues.length - 300} more`);
  lines.push("");
  lines.push(`## Advisory Issues (${report.advisoryIssues.length})`);
  for (const item of report.advisoryIssues.slice(0, 300)) {
    lines.push(`- ${item.rule}: ${item.file} :: ${item.text}`);
  }
  if (report.advisoryIssues.length > 300) lines.push(`- ... ${report.advisoryIssues.length - 300} more`);
  fs.writeFileSync(path.join(outputDir, "site-text-audit.md"), `${lines.join("\n")}\n`, "utf8");
}

writeReports();

console.log(
  [
    `Site text audit scanned ${report.totals.contentFiles} content file(s), ${report.totals.i18nFiles} i18n file(s), ${report.totals.layoutFiles} layout file(s), ${report.totals.configFiles} config file(s), ${report.totals.staticHtmlFiles} static HTML file(s).`,
    `Source text: ${report.totals.sourceTextBlocks} block(s), ${report.totals.sourceSentences} sentence(s).`,
    includeRendered && exists(renderedDir)
      ? `Rendered text: ${report.totals.renderedPages} page(s), ${report.totals.renderedTextBlocks} block(s), ${report.totals.renderedSentences} sentence(s).`
      : "Rendered text: not scanned.",
    `Hard issues: ${report.hardIssues.length}. Advisory issues: ${report.advisoryIssues.length}.`,
  ].join("\n")
);

if (outputDir) {
  console.log(`Report: ${path.join(outputDir, "site-text-audit.md")}`);
  console.log(`JSON: ${path.join(outputDir, "site-text-audit.json")}`);
}

if (failOnHard && report.hardIssues.length) {
  for (const issue of report.hardIssues.slice(0, 80)) {
    console.error(`${issue.rule}: ${issue.file} :: ${issue.text}`);
  }
  if (report.hardIssues.length > 80) console.error(`... ${report.hardIssues.length - 80} more`);
  process.exit(1);
}
