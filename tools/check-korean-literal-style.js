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
    id: "ai-takes-work",
    pattern: /(?:AI(?:가|는)?[^.\n]{0,50}(?:일|업무|직업|일자리|사람\s*일|감각|것)[^.\n]{0,50}(?:가져가|가져갈|가져간|가져가는|가져갔|빼앗|잡아먹|먹어치우)|(?:일|업무|직업|일자리|사람\s*일|감각|것)[^.\n]{0,50}AI(?:가|는)?[^.\n]{0,50}(?:가져가|가져갈|가져간|가져가는|가져갔|빼앗|잡아먹|먹어치우))/,
    message: "`AI가 일을 가져간다`처럼 물건을 들고 가는 듯 쓰지 말고 `AI가 어떤 업무를 대체한다`, `사람이 하던 업무가 자동화된다`처럼 실제 변화를 쓰세요.",
  },
  {
    id: "ai-enters-field",
    pattern: /(?:AI(?:가|는)?[^.\n]{0,40}(?:현장|업무|산업|전력망|공정|시스템)[^.\n]{0,40}(?:들어오|들어가)|(?:현장|업무|산업|전력망|공정|시스템)[^.\n]{0,40}AI(?:가|는)?[^.\n]{0,40}(?:들어오|들어가)|피지컬\s*AI가\s*들어)/,
    message: "`AI가 현장/업무에 들어온다`처럼 이동 비유로 쓰지 말고 `AI를 현장 업무에 쓰다`, `AI로 자동화되다`, `AI 기능을 도입하다`처럼 실제 사용 방식을 쓰세요.",
  },
  {
    id: "wearing-ai",
    pattern: /AI를\s*(?:입|착용)|AI를\s*입은\s*채|AI를\s*입고/,
    message: "`AI를 입다` 대신 `착용형 기기와 AI를 같이 쓰다`, `모바일 AI를 바로 호출하다`처럼 실제 장치와 사용 방식을 쓰세요.",
  },
  {
    id: "ai-handoff-metaphor",
    pattern: /(?:일|업무|감시와\s*대응|결정권|가치\s*판단)[^.\n]{0,50}(?:AI|AI\s*방어\s*시스템)[^.\n]{0,50}넘어|AI가\s*더\s*잘해도\s*결정권[^.\n]{0,50}넘어|사람이\s*들어가느냐/,
    message: "`업무/결정권이 AI에게 넘어간다`, `사람이 들어간다`처럼 이동 비유로 쓰지 말고 `AI가 처리한다`, `사람이 맡는다`, `결정권을 AI에게 맡긴다`처럼 실제 역할을 쓰세요.",
  },
  {
    id: "compression-metaphor",
    pattern: /(?:능력|가능성|가능한\s*선택지|감각|경험|형태)[^.\n]{0,50}압축|압축[^.\n]{0,50}(?:능력|가능성|감각|경험|형태)|(?:능력|일|업무|감각)[^.\n]{0,40}(?:기계|AI|모델)\s*안으로\s*들어/,
    message: "`능력이 버튼 하나로 압축된다`, `기계 안으로 들어간다`처럼 쓰지 말고 `AI가 대신 처리한다`, `선택지를 추려낸다`, `데이터로 정리한다`처럼 실제 변화와 행동을 쓰세요.",
  },
  {
    id: "constitution-reported-proposal",
    pattern: /(?:헌법|제\d+조|조항)[^.\n]{0,80}(?:제안했다|말했다|발언했다|아이디어를\s*말했다)|(?:제안했다|말했다|발언했다)[^.\n]{0,80}(?:헌법|제\d+조|조항)/,
    message: "헌법 조항처럼 정리하는 글에서는 `제안했다/말했다`를 반복하지 말고 `~하여야 한다`, `~할 수 없다`, `~로 제한한다`처럼 조문 문장으로 쓰세요.",
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
    id: "vague-comprehension-loss",
    pattern: /이해도[^.\n]{0,40}(?:버리|무너지)|이해[^.\n]{0,20}포기/,
    message: "`이해도를 버리다/무너지다` 대신 `읽은 내용을 문제로 확인한다`, `이해도 점수가 낮으면 통과시키지 않는다`처럼 확인 행동을 쓰세요.",
  },
  {
    id: "vague-research-profile-verbs",
    pattern: /(?:소재\s*후보[^.\n]{0,40}좁히|조건[^.\n]{0,40}좁히|특성[^.\n]{0,40}성능[^.\n]{0,40}연결|병목[^.\n]{0,40}풀어내|프롤로그[^.\n]{0,20}공개|물에\s*강한[^.\n]{0,20}센서)/,
    message: "`좁히다`, `연결하다`, `풀어내다`, `프롤로그 공개`, `물에 강한 센서`처럼 뜻이 흐린 표현 대신 `후보를 추려내다`, `성능을 예측하다`, `해결하고 공유하다`, `수분에 내구성이 있다`처럼 실제 행동과 대상을 쓰세요.",
  },
  {
    id: "vague-market-story",
    pattern: /(?:기업의\s*기대\s*이야기|미래\s*이야기에\s*더\s*큰\s*돈|처음\s*보는\s*기술)/,
    message: "`기대 이야기`, `미래 이야기에 돈을 쓴다`, `처음 보는 기술`처럼 추상적으로 쓰지 말고 성장 전망, 회사 가치, 실제 매출과 비용처럼 투자자가 보는 대상을 직접 쓰세요.",
  },
  {
    id: "question-stage",
    pattern: /(?:같은\s*질문\s*앞|질문\s*앞에\s*있|질문을\s*받아야\s*한다)/,
    message: "`질문 앞에 있다`, `질문을 받아야 한다`처럼 질문을 무대처럼 세우지 말고 `이 계산을 피하기 어렵다`, `이 질문을 피할 수 없다`처럼 실제 압박을 쓰세요.",
  },
  {
    id: "target-answer-drift",
    pattern: /(?:목표가\s*안\s*맞|답도\s*엉뚱한\s*곳|실행력도\s*엉뚱한\s*곳)/,
    message: "`목표가 안 맞으면`, `답이 엉뚱한 곳으로 간다` 대신 `목표가 맞지 않으면`, `엉뚱한 답을 낸다`, `엉뚱한 일을 하게 된다`처럼 실제 결과를 쓰세요.",
  },
  {
    id: "draft-pushed-output",
    pattern: /초안[^.\n]{0,40}결과물[^.\n]{0,40}밀어붙/,
    message: "`초안을 결과물로 밀어붙이다` 대신 `초안을 실제로 쓸 수 있게 고치다`, `결과물로 완성하다`처럼 사람이 하는 일을 직접 쓰세요.",
  },
  {
    id: "reputation-confirmation",
    pattern: /평판\s*확인/,
    message: "`평판 확인`처럼 확인 대상을 뭉개지 말고 `상대가 어떻게 받아들일지 본다`, `평판에 피해를 줄 수 있는지 본다`처럼 실제 검토 행동을 쓰세요.",
  },
  {
    id: "outside-speech",
    pattern: /(?:밖으로\s*나간\s*말|밖으로\s*나가는\s*말|밖으로\s*나가는\s*문서|밖으로\s*내보내기|밖으로\s*나가도\s*되는지|밖에\s*내보내도\s*되는지|그런데\s*밖으로\s*나가면|결국\s*내\s*말)/,
    message: "`밖으로 나간 말`, `내 말`처럼 안팎 비유와 소유 표현으로 뭉개지 말고 `내가 보낸 문장`, `내가 한 말`, `고객이나 대중이 보는 문서`처럼 책임 주체와 대상을 직접 쓰세요.",
  },
  {
    id: "latest-vague-column-phrases",
    pattern: /(?:“?나중에”?는\s*편한\s*말이다|사람은\s*논리보다\s*편을\s*먼저\s*본다|빈말\s*못\s*하는\s*사람은\s*빠른\s*방식에서\s*불리하다|착한\s*사람이\s*이기는\s*건\s*세상이\s*기록을\s*남기기\s*때문|회사에서\s*중요한\s*건\s*[“"]만들\s*수\s*있느냐[”"]만이\s*아니다|더\s*중요한\s*건\s*맥락|(?<!약속을\s)지킨\s*것을\s*사람들이\s*느끼게)/,
    message: "사용자가 지적한 최근 유형입니다. 편/방식/중요한 건/지킨 것처럼 목적어가 흐린 말을 쓰지 말고, 누가 무엇을 보거나 지켰는지 직접 쓰세요.",
  },
  {
    id: "latest-vague-ai-work-phrases",
    pattern: /(?:그\s*앞뒤가\s*막혀|앞의\s*5분|앞으로\s*간\s*일|네\s*실력보다\s*막힌\s*환경|머리\s*일|이\s*글은\s*전체\s*지도다|제일\s*먼저\s*밀리는지|처음부터\s*끝까지\s*혼자\s*처리하는\s*일|먼저\s*답이\s*정해진\s*업무가\s*흔들린다|그다음\s*전문가의\s*분석이\s*흔들린다|그다음\s*대중의\s*반응을\s*예측하는\s*일이\s*흔들린다)/,
    message: "사용자가 지적한 AI 업무 글 유형입니다. 앞뒤/앞으로/머리 일/흔들린다/밀린다 대신 절차, 검토 시간, 결정, 지식 업무, 자동화, 대체 압력을 직접 쓰세요.",
  },
  {
    id: "latest-ai-series-wording",
    pattern: /(?:소프트웨어\s*안에서\s*끝나는\s*(?:일|자동화)|육체노동은\s*머리\s*일보다|감각은\s*맞히기만\s*하는\s*일|결정권은\s*성능표만으로|종이\s*한\s*장(?:이다|은|이|으로|없으면)?|소유권은\s*(?:능력|실력)보다\s*오래\s*버틴다|수지와\s*카리나는\s*다른\s*게임|그\s*위는\s*과감하게|(?:소유권|시장|업무|일|신뢰|노후|AMOC|믿음)(?:이|은|도)?\s*흔들(?:린다|리는|려도|림))/,
    message: "AI 대체 시리즈에서 사용자가 지적한 표현입니다. 화면 안에서 확인되는 일, 지식 업무, 책임 주체, 종이일 뿐, 작은 실험처럼 대상과 행동을 직접 쓰세요.",
  },
  {
    id: "latest-context-training-career-wording",
    pattern: /(?:빠진\s*배경지식이란\s*무엇인가|빈\s*페이지보다\s*위험한\s*것은\s*빈\s*이해다|회의에서\s*무너진다|안\s*적힌\s*배경|조각을\s*아는\s*것과\s*주장을\s*아는\s*것은\s*다르다|질문\s*하나에\s*무너진다|앞으로\s*비싸지는\s*사람|처음부터\s*많이\s*보려고|30개는\s*수\s*가\s*아니라|많이\s*모으는\s*것이\s*아니라\s*다르게|감은\s*정보가\s*연결|보이는\s*사람에게\s*온다|작게\s*훈련하고|작게\s*쪼개면|스타일을\s*오류로\s*만들면|귀화\s*작문(?:까지)?|자판\s*자리연습|작문\s*모범답안\s*입력\s*연습|컴퓨터\s*입력기를\s*한글로|전제는\s*하나입니다|ERR\s*정독|유효\s*읽기속도|순서대로\s*가자|콜드메일|컨택\s*메일|카드엔\s*매달\s*수수료|미국\s*렌트\s*포털은\s*보통\s*두\s*가지|수수료\s*0|한\s*줄\s*교훈|설정하지\s*않고\s*일을\s*마쳤습니다|갈립니다|오리엔테이션\s*참석\s*회신\(RSVP\)|\[공대\s*안내\]|지식\s*설명은\s*AI)/,
    message: "사용자가 직접 지적한 최신 표현입니다. 맥락 부채, 지식을 설명하는 것, 훈련 단위, 컨택 이메일, 결제수단, RSVP 풀네임처럼 대상과 뜻을 분명히 쓰세요.",
  },
  {
    id: "latest-research-profile-wording",
    pattern: /(?:(?:^|\n)계산재료과학과\s*머신러닝을\s*바탕으로,\s*원자|실험해\s*볼\s*소재\s*후보|전도성\s*코팅을\s*더해|여러\s*종류의\s*움직임과\s*신호를\s*구분할\s*수\s*있었고|큰\s*변형에서도\s*전기\s*신호가\s*안정적으로\s*유지됐습니다|미세구조의\s*형상[^.\n]{0,80}어떻게\s*바꾸는지\s*보였습니다|생체모사\s*구조를\s*공학\s*설계의\s*관점으로\s*풀어낸|자극\s*반응\s*전기신호를\s*오래\s*안정적으로\s*기록합니다|잔털처럼\s*가는\s*섬유|헤어리\s*파이버|백커버|표면에\s*미세한\s*털을\s*세운|어떻게\s*쓸\s*수\s*있는지를\s*보여준\s*연구)/,
    message: "연구·소개 페이지에서 사용자가 지적한 표현입니다. 현재 연구 맥락, 실험 소재 후보군, 전도성 코팅 처리, 신호 구분 성공, Back Cover처럼 정확한 연구 표현을 쓰세요.",
  },
  {
    id: "title-hides-action",
    pattern: /(?:빠르면\s*사고도\s*커진다|살아남는\s*법[^.\n]{0,70}(?:걸어라|에\s*걸)|정치는\s*어떻게\s*사람\s*마음[^.\n]{0,50}(?:방법|얻는가)|빈말\s*못\s*하는\s*사람의\s*방법|느린\s*신뢰\s*쌓기에\s*걸어라|그리고\s*이보다\s*더\s*중요한\s*것)/,
    message: "제목과 소제목은 `무엇을 어떻게 하는지`가 바로 보여야 합니다. `뭘 걸어?`, `무슨 방법?`, `뭐가 커져?`라고 되물을 수 있으면 행동과 대상을 직접 쓰세요.",
  },
  {
    id: "ambiguous-bet-action",
    pattern: /(?:자리에\s*건다는|(?:능력|실력|자리|신뢰)[^.\n]{0,25}(?:에\s*)?걸어라|에\s*걸어라)/,
    message: "`걸어라`처럼 비유로 방향을 말하지 말고 `실력을 자격으로 바꾼다`, `약속을 지킨다`, `시간을 쓴다`처럼 실제 행동을 쓰세요.",
  },
  {
    id: "important-part-vague",
    pattern: /중요한\s*부분을\s*놓치는\s*것이다/,
    message: "`중요한 부분을 놓치는 것이다`처럼 결론만 말하지 말고, 놓치는 대상이 현장 데이터인지 착용형 기기인지 실제로 드러나게 쓰세요.",
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
      .map((line) => (/^(title|subtitle|description|seoTitle):/.test(line) ? line : ""))
      .join("\n");
  });
}

function bodyOnly(text) {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

function shouldSkip(rel) {
  return (
    rel.startsWith("content/ko/literature/") ||
    rel.startsWith("content/ko/incomplete/") ||
    (rel.endsWith("/_index.md") && rel !== "content/ko/research/_index.md")
  );
}

function shouldSkipParagraphRhythm(rel, body) {
  return (
    rel.startsWith("content/ko/literature/") ||
    rel.startsWith("content/ko/incomplete/") ||
    rel.endsWith("/_index.md") ||
    /<style\b|<article\b|<div\s+class=/i.test(body)
  );
}

function plainParagraphText(block) {
  return block
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isProseParagraph(block) {
  const text = block.trim();
  if (!text) return false;
  if (/^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|!\[|<|\||```|:::|\{\{|---+$)/.test(text)) return false;
  if (/\u2197/.test(text) && plainParagraphText(text).length < 160) return false;
  return text.split(/\r?\n/).every((line) => !/^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|!\[|<|\||```|:::|\{\{)/.test(line));
}

function isShortProseParagraph(block) {
  const plain = plainParagraphText(block);
  if (!plain) return false;
  const sentenceCount = Math.max(1, (plain.match(/[.!?。！？]|[다요죠까니다][.」”"]?(?=\s|$)/g) || []).length);
  return plain.length < 120 || (sentenceCount <= 1 && plain.length < 180);
}

function checkParagraphRhythm(rel, text) {
  const body = bodyOnly(text);
  if (shouldSkipParagraphRhythm(rel, body)) return;

  const blocks = [];
  let current = [];
  let inFence = false;

  function pushCurrent() {
    if (current.length) {
      blocks.push(current.join("\n"));
      current = [];
    }
  }

  for (const line of body.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      pushCurrent();
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^\s*$/.test(line)) {
      pushCurrent();
    } else {
      current.push(line);
    }
  }
  pushCurrent();

  let run = [];

  function flush() {
    if (run.length >= 3) {
      const sample = run
        .slice(0, 3)
        .map((item) => item.plain.slice(0, 54))
        .join(" / ");
      errors.push(
        `${rel} [paragraph-rhythm] 짧은 문단이 3개 이상 연속됩니다. 관련 문장은 2~4문장짜리 문단으로 묶으세요.\n  ${sample}`
      );
    }
    run = [];
  }

  for (const block of blocks) {
    if (isProseParagraph(block) && isShortProseParagraph(block)) {
      run.push({ plain: plainParagraphText(block) });
    } else {
      flush();
    }
  }
  flush();
}

for (const file of walk(koContent)) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (shouldSkip(rel)) continue;

  const raw = fs.readFileSync(file, "utf8");
  checkParagraphRhythm(rel, raw);

  let inFence = false;
  const lines = stripFrontMatter(raw).split(/\r?\n/);
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
