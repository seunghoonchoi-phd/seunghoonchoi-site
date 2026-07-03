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
    id: "opaque-compound",
    pattern: /우주\s*블라인드|스페이스\s*블라인드|블라인드\s*모듈/,
    message: "`우주 블라인드`처럼 쉬운 단어를 붙인 새 용어 대신 `우주에 띄우는 햇빛 가림막`, `햇빛 가림막 모듈`처럼 생김새와 역할을 풀어 쓰세요.",
  },
  {
    id: "vague-response",
    pattern: /보조\s*대응|보조적\s*대응/,
    message: "`보조 대응`처럼 행동이 안 보이는 말 대신 `임시 조치`, `붕괴 가능성을 낮출 시간을 확보하는 조치`처럼 실제 역할을 쓰세요.",
  },
  {
    id: "technical-shading",
    pattern: /차광률|차광\s*모듈|차광판|북극\s*여름\s*차광/,
    message: "`차광` 계열 한자어 대신 `햇빛을 얼마나 줄일지`, `햇빛 가림막`, `햇빛 가림막 모듈`처럼 바로 보이는 말로 푸세요.",
  },
  {
    id: "abstract-civilization-stack",
    pattern: /실행\s*구조|문명(?:의|급)?\s*(?:문제|프로젝트|운영자|실행\s*구조)|문명\s*(?:문제|프로젝트|운영자|은\s*문서|은\s*모니터|을\s*위한\s*기술|을\s*바꾼다|이\s*풀어야)/,
    message: "`문명의 실행 구조`, `문명급 문제`, `문명 프로젝트 운영자`처럼 큰 추상어를 겹치지 말고 발전소, 공장, 병원, 현장처럼 실제 장소와 행동으로 쓰세요.",
  },
  {
    id: "abstract-why-heading",
    pattern: /(?:^##\s+|^title:\s*").*왜.*(?:구조|체계|시스템|원리|본질|의미|역할|조건|프레임|문명|실행).*인가\??/,
    message: "`왜 X는 구조/본질/역할인가`식 제목은 누가 어디서 무엇을 하는지 보이게 다시 쓰세요.",
  },
  {
    id: "future-signal-metaphor",
    pattern: /닿을지\s*모르는\s*신호|신호가\s*약|신호를\s*던지|미래(?:로)?\s*보내는\s*(?:작은\s*)?신호|닿을\s*수\s*있는\s*형태/,
    message: "`신호가 닿는다/약하다/던진다` 대신 `AI가 읽을 수 있다`, `중요하게 보지 않을 수 있다`, `기록으로 남긴다`처럼 실제 의미를 쓰세요.",
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
