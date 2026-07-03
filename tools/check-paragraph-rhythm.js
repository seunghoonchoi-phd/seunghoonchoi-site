#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const fix = process.argv.includes("--fix");
const errors = [];
const changed = [];

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
  if (!fs.existsSync(abs)) return [];
  const out = [];

  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const p = path.join(current, entry.name);
      if (entry.isDirectory()) visit(p);
      else if (entry.isFile() && entry.name.endsWith(".md")) out.push(p);
    }
  }

  visit(abs);
  return out.sort();
}

function bodyOnly(text) {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

function splitFrontMatter(text) {
  const match = text.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/);
  return match ? { head: match[1], body: text.slice(match[1].length) } : { head: "", body: text };
}

function detectEol(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function shouldSkipFile(rel, body) {
  return (
    rel.includes("/incomplete/") ||
    rel.includes("/literature/") ||
    rel.endsWith("/_index.md") ||
    /<style\b|<article\b|<div\s+class=/i.test(body)
  );
}

function parseTokens(body) {
  const tokens = [];
  let current = [];
  let fence = [];
  let inFence = false;

  function pushCurrent() {
    if (current.length) {
      tokens.push({ type: "block", text: current.join("\n") });
      current = [];
    }
  }

  for (const line of body.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      if (!inFence) {
        pushCurrent();
        fence = [line];
        inFence = true;
      } else {
        fence.push(line);
        tokens.push({ type: "raw", text: fence.join("\n") });
        fence = [];
        inFence = false;
      }
      continue;
    }

    if (inFence) {
      fence.push(line);
      continue;
    }

    if (/^\s*$/.test(line)) pushCurrent();
    else current.push(line);
  }

  pushCurrent();
  if (fence.length) tokens.push({ type: "raw", text: fence.join("\n") });
  return tokens;
}

function plainText(block) {
  return block
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isStructuralBlock(block) {
  const text = block.trim();
  if (!text) return true;
  if (/^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|!\[|<|\||```|:::|\{\{|---+$)/.test(text)) return true;
  if (/\u2197/.test(text) && plainText(text).length < 160) return true;
  return text.split(/\r?\n/).some((line) => /^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|!\[|<|\||```|:::|\{\{)/.test(line));
}

function isProse(block) {
  return !isStructuralBlock(block) && plainText(block).length > 0;
}

function metric(lang, text) {
  const chars = Array.from(text.replace(/\s/g, "")).length;
  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = Math.max(
    1,
    (text.match(/[.!?。！？؟।]|[다요죠까니다][.」”"]?(?=\s|$)/g) || []).length
  );
  const spaced = ["en", "es"].includes(lang);
  return { chars, words, sentences, spaced };
}

function limits(lang) {
  if (lang === "ko") return { shortChars: 72, shortOneSentence: 150, maxChars: 560, maxWords: 0 };
  if (lang === "ja" || lang === "zh") return { shortChars: 62, shortOneSentence: 130, maxChars: 520, maxWords: 0 };
  if (lang === "en" || lang === "es") return { shortChars: 95, shortOneSentence: 155, maxChars: 820, maxWords: 130 };
  return { shortChars: 105, shortOneSentence: 170, maxChars: 760, maxWords: 0 };
}

function isShortProse(lang, block) {
  const plain = plainText(block);
  if (!plain) return false;
  const m = metric(lang, plain);
  const lim = limits(lang);

  if (m.spaced) {
    return m.words <= 12 || (m.sentences <= 1 && m.chars < lim.shortOneSentence);
  }

  return m.chars < lim.shortChars || (m.sentences <= 1 && m.chars < lim.shortOneSentence);
}

function isHingeParagraph(lang, text) {
  const patterns = {
    ko: /^(문제는|그러면|그래서|그 결과|결국|핵심은|목표는|이 차이|이건|그렇다면|하지만|다만|여기서|반대로|앞으로|진짜 변화는)\b/,
    en: /^(The problem is|Then|So|As a result|In the end|The point is|The goal is|This difference|This is|That is why|From here|At this point|But|However|The real change)\b/i,
    zh: /^(问题是|这样|因此|所以|结果|关键是|目标是|这种差异|这就是|真正的变化|但是|然而)/,
    ja: /^(問題は|すると|だから|その結果|結局|要点は|目標は|この違い|これは|本当の変化|ただし|しかし|ここで)/,
    es: /^(El problema es|Entonces|Por eso|Así que|El resultado|En última instancia|La clave es|El objetivo es|Esta diferencia|Esto es|Pero|Sin embargo|El cambio real)\b/i,
    hi: /^(समस्या|तो|इसलिए|नतीजा|मुख्य|लक्ष्य|यही|लेकिन)/,
    ar: /^(المشكلة|إذن|لذلك|والنتيجة|الخلاصة|الهدف|هذا|لكن|غير أن)/,
  };
  return (patterns[lang] || patterns.en).test(text);
}

function canJoin(lang, blocks) {
  const plain = plainText(blocks.join(" "));
  const m = metric(lang, plain);
  const lim = limits(lang);
  if (m.spaced && lim.maxWords) return m.words <= lim.maxWords;
  return m.chars <= lim.maxChars;
}

function joinBlocks(blocks) {
  return blocks.map((item) => item.trim().replace(/\s*\r?\n\s*/g, " ")).join(" ");
}

function groupedProse(lang, blocks) {
  const out = [];
  const joinAfter = new Set();
  let shortRun = [];

  function flushShortRun() {
    if (shortRun.length >= 3) {
      for (let i = 0; i < shortRun.length - 1; i += 1) joinAfter.add(shortRun[i]);
    }
    shortRun = [];
  }

  for (let i = 0; i < blocks.length; i += 1) {
    if (isShortProse(lang, blocks[i])) {
      shortRun.push(i);
    } else {
      flushShortRun();
    }

    const plain = plainText(blocks[i]);
    if (isShortProse(lang, blocks[i]) && isHingeParagraph(lang, plain)) {
      if (i > 0) joinAfter.add(i - 1);
      else if (i + 1 < blocks.length) joinAfter.add(i);
    }
  }
  flushShortRun();

  let group = [];

  function push() {
    if (group.length) {
      out.push(joinBlocks(group));
      group = [];
    }
  }

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (!group.length) {
      group.push(block);
      continue;
    }

    if (joinAfter.has(i - 1) && canJoin(lang, [...group, block])) {
      group.push(block);
    } else {
      push();
      group.push(block);
    }
  }

  push();
  return out;
}

function analyzeTokens(lang, rel, tokens) {
  let proseRun = [];
  let runStart = 0;

  function flush(index) {
    if (!proseRun.length) return;

    let shortRun = [];
    for (let i = 0; i < proseRun.length; i += 1) {
      if (isShortProse(lang, proseRun[i])) {
        shortRun.push(i);
      } else {
        if (shortRun.length >= 3) addRunError(rel, proseRun, shortRun);
        shortRun = [];
      }
    }
    if (shortRun.length >= 3) addRunError(rel, proseRun, shortRun);

    for (let i = 0; i < proseRun.length; i += 1) {
      const prev = i > 0 && isProse(proseRun[i - 1]);
      const next = i + 1 < proseRun.length && isProse(proseRun[i + 1]);
      if (isShortProse(lang, proseRun[i]) && isHingeParagraph(lang, plainText(proseRun[i])) && (prev || next)) {
        const sample = plainText(proseRun[i]).slice(0, 80);
        errors.push(`${rel} [orphan-hinge-paragraph] Short connector paragraph is isolated; join it with nearby explanation.\n  ${sample}`);
      }
    }

    proseRun = [];
    runStart = index + 1;
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type === "block" && isProse(token.text)) {
      if (!proseRun.length) runStart = i;
      proseRun.push(token.text);
    } else {
      flush(i);
    }
  }
  flush(tokens.length);
}

function addRunError(rel, proseRun, indexes) {
  const sample = indexes
    .slice(0, 3)
    .map((i) => plainText(proseRun[i]).slice(0, 54))
    .join(" / ");
  errors.push(`${rel} [short-paragraph-run] Three or more short prose paragraphs appear in a row.\n  ${sample}`);
}

function fixTokens(lang, tokens) {
  const out = [];
  let proseRun = [];

  function flush() {
    if (!proseRun.length) return;
    for (const text of groupedProse(lang, proseRun)) out.push({ type: "block", text });
    proseRun = [];
  }

  for (const token of tokens) {
    if (token.type === "block" && isProse(token.text)) {
      proseRun.push(token.text);
    } else {
      flush();
      out.push(token);
    }
  }

  flush();
  return out;
}

function normalizeBody(tokens, eol) {
  return tokens
    .map((token) => token.text.trim())
    .filter(Boolean)
    .join(`${eol}${eol}`);
}

for (const lang of parseLanguages()) {
  for (const file of walkMarkdown(lang.contentDir)) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const original = fs.readFileSync(file, "utf8");
    const body = bodyOnly(original);
    if (shouldSkipFile(rel, body)) continue;

    const split = splitFrontMatter(original);
    const tokens = parseTokens(split.body.trim());

    if (fix) {
      const eol = detectEol(original);
      const next = split.head + normalizeBody(fixTokens(lang.lang, tokens), eol) + (original.endsWith("\n") ? eol : "");
      if (next !== original) {
        fs.writeFileSync(file, next, "utf8");
        changed.push(rel);
      }
    } else {
      analyzeTokens(lang.lang, rel, tokens);
    }
  }
}

if (fix) {
  console.log(`Paragraph rhythm fixer changed ${changed.length} file(s).`);
  for (const rel of changed.slice(0, 120)) console.log(`  ${rel}`);
  if (changed.length > 120) console.log(`  ... ${changed.length - 120} more`);
} else if (errors.length) {
  console.error("Paragraph rhythm check failed:\n");
  console.error(errors.slice(0, 120).join("\n\n"));
  if (errors.length > 120) console.error(`\n... ${errors.length - 120} more issue(s)`);
  process.exit(1);
} else {
  console.log("Paragraph rhythm check passed.");
}
