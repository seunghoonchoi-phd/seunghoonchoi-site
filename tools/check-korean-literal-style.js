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
  {
    id: "abstract-ai-judgment-standard",
    pattern: /느린\s*공부[^.\n]{0,60}(?:판단(?:하는)?\s*기준|기준으로\s*필요)|AI\s*(?:결과|결과물|답)[^.\n]{0,40}(?:판단(?:하는)?\s*기준|기준으로\s*필요)/,
    message: "`AI 결과를 판단하는 기준`처럼 추상명사로 눌러 쓰지 말고 `AI 답이 맞는지, 빠진 것이 없는지, 그대로 써도 되는지 확인한다`처럼 실제 확인 행동을 쓰세요.",
  },
  {
    id: "vague-screen-boundary",
    pattern: /(?:모니터\s*(?:앞|안|밖)|화면\s*(?:앞|안|밖|보다)|(?:밖에\s*나가|교실\s*밖)[^.\n]{0,50}확인|회사\s*일[^.\n]{0,30}(?:모니터|화면)\s*밖|학생[^.\n]{0,30}(?:모니터|화면)\s*밖)/,
    message: "`모니터/화면 안팎`, `밖에 나가 확인`처럼 장소 비유로 압축하지 말고 문서, 코드, 실제 장비, 사용자 반응, 빠진 조건처럼 확인할 대상을 직접 쓰세요.",
  },
  {
    id: "outside-record-metaphor",
    pattern: /(?:밖에\s*(?:적은|남긴|남겨|쓴)|밖으로\s*꺼내|꺼내\s*둔|외부에\s*남는\s*형태|세상에\s*남아[^.\n]{0,40}읽)/,
    message: "`밖에 적은 기록`, `밖으로 꺼낸다`처럼 안팎 비유로 줄이지 말고 글, 코드, 프로젝트, 메모, 체크리스트처럼 다시 읽거나 쓸 수 있는 구체적 형태를 쓰세요.",
  },
  {
    id: "private-thought-record",
    pattern: /(?:머릿속에만\s*둔\s*생각|머릿속[^.\n]{0,60}(?:기록|데이터|학습)|마음속[^.\n]{0,40}(?:소망|기도)[^.\n]{0,40}데이터)/,
    message: "`머릿속/마음속`과 `기록/데이터`를 맞붙이지 말고 `생각만 하고 끝낸 것`, `글로 쓰고 코드와 프로젝트로 남긴 것`처럼 실제 기록 행동을 쓰세요.",
  },
  {
    id: "vague-look-force",
    pattern: /문제를\s*(?:봐야|보아야)\s*한다|일을\s*끝내는\s*힘/,
    message: "`문제를 봐야 한다`, `일을 끝내는 힘`처럼 눌러 쓰지 말고 `무엇을 따져봐야 하는지`, `설치하고 운영하고 고치는 능력`처럼 실제 판단 대상과 행동을 쓰세요.",
  },
  {
    id: "neural-network-aggregation",
    pattern: /인공신경망[^.\n]{0,80}(?:종합|학습|읽|들어갈)|AI\s*인공신경망|모든\s*(?:게|것|대화|기록)[^.\n]{0,80}(?:종합|학습|합쳐|모아)|(?:종합되|종합하|학습되)[^.\n]{0,80}(?:시대|시스템|AI|기록)|(?:해상도|재구성되|개인화|식별하고\s*고려|반복적으로\s*확인되는\s*정체성|고려는\s*해\s*볼)/,
    message: "`모든 게 인공신경망에 종합된다`, `학습해 개인화에 쓴다`, `높은 해상도로 재구성된다`처럼 주체와 동작이 흐린 말을 쓰지 말고 `AI가 기록을 한데 모아 읽는다`, `그 기록으로 어떤 사람인지 알아본다`처럼 누가 무엇을 어떻게 처리하는지 쓰세요.",
  },
  {
    id: "vague-share-role",
    pattern: /(?:내|나의|사람(?:의)?|독자(?:의)?|중요한)\s*몫|몫(?:은|이|을)|남는\s*몫/,
    message: "`내 몫`, `사람의 몫`, `독자의 몫`처럼 보상·역할·책임을 뭉개지 말고 `내 자산이 같이 커진다`, `사람이 해야 한다`, `독자가 자기 상황에 맞춰 판단한다`처럼 실제 돈, 행동, 책임을 쓰세요.",
  },
  {
    id: "vague-work-chunk",
    pattern: /(?:남은|남는|해야\s*할|처리할|정리할)[^.\n]{0,35}(?:세|두|몇|큰)?\s*덩어리|(?:세|두|몇)\s*덩어리(?:입니다|로\s*(?:나뉘|갈리|묶))/,
    message: "`남은 일은 세 덩어리`처럼 해야 할 일을 물리적 덩어리로 뭉개지 말고 `서류, 송금, 수강신청을 차례로 처리한다`처럼 실제 항목과 행동을 쓰세요.",
  },
  {
    id: "copy-typing",
    pattern: /따라\s*치|따라치/,
    message: "`따라치기` 대신 `모범답안을 보며 직접 입력한다`처럼 사용자가 실제로 하는 행동을 쓰세요.",
  },
  {
    id: "weak-duty-renewal",
    pattern: /(?:이사|주소|10일)[^.\n]{0,45}갱신합니다/,
    message: "법적·행정 의무는 `갱신합니다`로 약하게 쓰지 말고 `갱신해야 합니다`처럼 의무임을 분명히 쓰세요.",
  },
  {
    id: "casual-ai-output",
    pattern: /AI로\s*보고서\s*하나\s*만들\s*수\s*있다|보고서\s*하나\s*만들\s*수\s*있/,
    message: "`보고서 하나 만들 수 있다` 대신 `보고서 한 편 만드는 것은 가능하다`처럼 대상과 단위를 분명히 쓰세요.",
  },
  {
    id: "value-comes-out",
    pattern: /가치[^.\n]{0,30}(?:나온|나오|나와)/,
    message: "`가치가 나온다`처럼 물건이 나오는 듯 쓰지 말고 `차이가 결정된다`, `돈으로 이어진다`처럼 실제 의미를 쓰세요.",
  },
  {
    id: "blocked-speed",
    pattern: /(?:속도|결재|승인)[^.\n]{0,35}막(?:힌|히)|속도는\s*다시\s*막/,
    message: "`속도가 막힌다` 대신 승인 시간이 줄지 않는지, 검토 단계가 남는지, 결재 절차가 그대로인지 실제 병목을 쓰세요.",
  },
  {
    id: "unclear-authority-fieldwork",
    pattern: /권한[^.\n]{0,45}현장\s*업무[^.\n]{0,25}(?:들어가|못\s*들어)|현장\s*업무에\s*못\s*들어/,
    message: "`권한이 애매하면 현장 업무에 못 들어간다` 대신 누가 AI 결과를 수정하고 시스템에 반영할 수 있는지 직접 쓰세요.",
  },
  {
    id: "vague-research-profile-verbs",
    pattern: /(?:소재\s*후보[^.\n]{0,40}좁히|조건[^.\n]{0,40}좁히|특성[^.\n]{0,40}성능[^.\n]{0,40}연결|병목[^.\n]{0,40}풀어내|프롤로그[^.\n]{0,20}공개|물에\s*강한[^.\n]{0,20}센서)/,
    message: "`좁히다`, `연결하다`, `풀어내다`, `프롤로그 공개`, `물에 강한 센서`처럼 뜻이 흐린 표현 대신 `후보를 추려내다`, `성능을 예측하다`, `해결하고 공유하다`, `수분에 내구성이 있다`처럼 실제 행동과 대상을 쓰세요.",
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
    (rel.endsWith("/_index.md") && rel !== "content/ko/research/_index.md")
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
