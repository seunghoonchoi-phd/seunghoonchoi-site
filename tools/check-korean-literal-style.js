#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const koContent = path.join(root, "content", "ko");
const errors = [];

const rules = [
  {
    id: "ai-attach",
    pattern: /AI를\s*붙|AI\s*붙|AI\s*챗봇을\s*붙|AI에\s*붙|AI만\s*붙|시니어에\s*AI만\s*붙|AI\s*앞뒤에\s*붙|AI가\s*진짜\s*일에\s*붙|AI는[^.\n]{0,24}붙일/,
    message: "`AI를 붙이다` 대신 `AI를 쓰다`, `AI로 처리하다`, `AI 기능을 넣다`처럼 실제 행동을 쓰세요.",
  },
  {
    id: "hands-feet",
    pattern: /손발/,
    message: "`손발` 비유 대신 막힌 대상인 권한, 도구, 승인, 환경을 직접 쓰세요.",
  },
  {
    id: "physical-touch",
    pattern: /손대|손을\s*대|건드/,
    message: "`손대다` 대신 `영향을 주다`, `처리하다`, `수정하다`, `줄이다`처럼 실제 동작을 쓰세요.",
  },
  {
    id: "poison",
    pattern: /독을\s*빼/,
    message: "`독을 빼다` 대신 CO2, 비용, 오류처럼 줄여야 하는 실제 대상을 쓰세요.",
  },
  {
    id: "earth-body",
    pattern: /지구(?:의)?\s*순환계|지구\s*순환계|그\s*장기|중환자실|해열제|응급약|생명유지\s*장치/,
    message: "지구나 기후 시스템을 몸/의료 상황으로 비유하지 말고 해류, 대기, 기후 시스템처럼 실제 시스템을 쓰세요.",
  },
  {
    id: "unneeded-pump",
    pattern: /바다\s*펌프|해양\s*펌프|물\s*펌프|펌프의\s*모터/,
    message: "`펌프` 비유 대신 해류 순환, 물이 가라앉는 흐름, 열·염분 이동처럼 실제 현상을 쓰세요.",
  },
  {
    id: "small-word",
    pattern: /말은\s*작|말은\s*작지만|작지만,\s*손대/,
    message: "`말이 작다`처럼 말 자체를 비유하지 말고 표현이 사소해 보인다는 뜻을 직접 쓰세요.",
  },
  {
    id: "vague-point",
    pattern: /그\s*지점|막힌\s*지점/,
    message: "`그 지점`, `막힌 지점` 대신 어떤 결정, 정보, 책임, 품질 기준인지 직접 쓰세요.",
  },
  {
    id: "time-buying",
    pattern: /시간을\s*(?:사|벌)/,
    message: "`시간을 사다/벌다` 대신 시간을 확보하거나 붕괴 가능성을 늦춘다는 실제 의미를 쓰세요.",
  },
  {
    id: "force-push",
    pattern: /AI[^.\n]{0,40}밀어붙|밀어붙[^.\n]{0,40}AI|업무\s*표준처럼\s*밀어붙/,
    message: "`밀어붙이다` 대신 강제로 쓰게 하다, 대체하다, 추진하다처럼 실제 행동을 쓰세요.",
  },
];

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
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, (match) => {
    return match
      .split(/\r?\n/)
      .map((line) => (/^(title|subtitle|description):/.test(line) ? line : ""))
      .join("\n");
  });
}

function shouldSkip(rel) {
  return (
    rel.startsWith("content/ko/literature/") ||
    rel.startsWith("content/ko/incomplete/") ||
    rel.endsWith("/_index.md")
  );
}

for (const file of walk(koContent)) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (shouldSkip(rel)) continue;

  let inFence = false;
  const lines = stripFrontMatter(fs.readFileSync(file, "utf8")).split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence || /^(\s*$|[|]\s|<!--|inline_image_caption:|image_alt:|image:|ogimage:)/.test(line)) continue;

    for (const rule of rules) {
      if (rule.pattern.test(line)) {
        errors.push(`${rel}:${index + 1} [${rule.id}] ${rule.message}\n  ${line}`);
      }
    }
  }
}

if (errors.length) {
  console.error("Korean literal style check failed:\n");
  console.error(errors.join("\n\n"));
  process.exit(1);
}

console.log("Korean literal style check passed.");
