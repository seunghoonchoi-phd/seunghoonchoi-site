#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { webcrypto } = require("crypto");

const root = process.cwd();
const appDir = path.join(root, "static", "language-recall");
const expectedFiles = [
  "app.js",
  "demo-adapter.js",
  "demo-data.js",
  "icon.svg",
  "index.html",
  "manifest.webmanifest",
  "styles.css",
  "sw.js",
].sort();
const languages = configuredLanguages();
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files.sort();
}

function configuredLanguages() {
  const config = read(path.join(root, "hugo.toml"));
  return Array.from(config.matchAll(/^\s*\[languages\.([A-Za-z0-9_-]+)\]\s*$/gm), (match) => match[1]);
}

function scanPublicFiles() {
  if (!fs.existsSync(appDir)) {
    fail("missing static/language-recall directory");
    return;
  }

  const relativeFiles = walk(appDir).map((file) => path.relative(appDir, file).replace(/\\/g, "/"));
  if (JSON.stringify(relativeFiles) !== JSON.stringify(expectedFiles)) {
    fail(`public app allowlist mismatch: ${relativeFiles.join(", ")}`);
  }

  const forbiddenNames = /(?:^|\/)(?:\.env(?:\..*)?|state\.json|events\.ndjson|connector-snapshots\.json|inbox-seed\.json|notion-sources\.json|server\.log|server\.mjs|backups)(?:$|\/)/i;
  const forbiddenContent = [
    [/NOTION_TOKEN\s*=/i, "Notion token assignment"],
    [/secret_[A-Za-z0-9_-]{8,}/, "secret-like token"],
    [/https?:\/\/[^\s"']*(?:notion\.(?:so|site|com)|\.ts\.net)[^\s"']*/i, "private Notion or tailnet URL"],
    [/(?:^|["'\s])[A-Za-z]:\\(?:Users|내 드라이브|내\s드라이브)\\/m, "local absolute path"],
    [/(?:공부용|내 드라이브|tailnet only|connector-snapshots|inbox-seed|notion-sources)/i, "private implementation marker"],
    [/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i, "UUID"],
  ];

  for (const relative of relativeFiles) {
    if (forbiddenNames.test(relative)) fail(`forbidden public file: ${relative}`);
    const full = path.join(appDir, relative);
    if (!/\.(?:html|css|js|json|webmanifest|svg)$/i.test(relative)) continue;
    const text = read(full);
    for (const [pattern, label] of forbiddenContent) {
      if (pattern.test(text)) fail(`${relative}: contains ${label}`);
    }
  }
}

function checkPathsAndScope() {
  const index = read(path.join(appDir, "index.html"));
  const manifest = JSON.parse(read(path.join(appDir, "manifest.webmanifest")));
  const serviceWorker = read(path.join(appDir, "sw.js"));
  const app = read(path.join(appDir, "app.js"));

  if (manifest.start_url !== "./") fail("manifest start_url must be ./");
  if (manifest.scope !== "/language-recall/") fail("manifest scope must be /language-recall/");
  if (!app.includes('serviceWorker.register("./sw.js")')) fail("service worker registration must use ./sw.js");
  if (!index.includes('src="./demo-data.js"') || !index.includes('src="./demo-adapter.js"')) {
    fail("index is missing demo scripts");
  }
  const dataIndex = index.indexOf('src="./demo-data.js"');
  const adapterIndex = index.indexOf('src="./demo-adapter.js"');
  const appIndex = index.indexOf('src="./app.js"');
  if (!(dataIndex >= 0 && dataIndex < adapterIndex && adapterIndex < appIndex)) fail("demo script order is incorrect");
  if (!/<section[^>]+id="notion-sync-panel"[^>]+hidden/i.test(index)) fail("Notion sync panel must remain hidden in the public demo");
  if (!index.includes('id="demo-reset"') || !index.includes('id="private-config"') || !index.includes('id="private-launch"')) {
    fail("demo controls are incomplete");
  }
  if (!/<button[^>]+id="private-launch"[^>]+hidden/i.test(index) || /<button[^>]+id="private-launch"[^>]+(?:href|data-url)=/i.test(index)) {
    fail("private launcher must be an initially hidden button without a URL attribute");
  }
  for (const asset of serviceWorker.matchAll(/["'](\/[^"']+)["']/g)) {
    const value = asset[1];
    if (!value.startsWith("/language-recall/")) fail(`service worker escapes app scope: ${value}`);
  }
  if (!serviceWorker.includes("/language-recall/index.html") && !serviceWorker.includes("${APP_BASE}index.html")) {
    fail("service worker fallback is not app-scoped");
  }
}

function checkContentParity() {
  if (languages.length !== 7) fail(`expected 7 configured languages, found ${languages.length}`);
  for (const language of languages) {
    const file = path.join(root, "content", language, "apps", "language-recall.md");
    if (!fs.existsSync(file)) {
      fail(`missing ${path.relative(root, file)}`);
      continue;
    }
    const text = read(file);
    const headings = (text.match(/^##\s+/gm) || []).length;
    const appCards = (text.match(/class="appcard"/g) || []).length;
    if (headings !== 3) fail(`${language}: expected 3 H2 headings, found ${headings}`);
    if (appCards !== 1) fail(`${language}: expected one appcard, found ${appCards}`);
    if (!text.includes('href="/language-recall/"')) fail(`${language}: demo CTA is missing`);
    if (!text.includes("image: /images/language-recall-card.svg")) fail(`${language}: card image front matter is missing`);
    if (/\*\*|[—–]/.test(text)) fail(`${language}: forbidden inline emphasis or dash`);
    if (/https?:\/\/[^\s"']*(?:notion\.(?:so|site|com)|\.ts\.net)|secret_[A-Za-z0-9_-]{8,}|\b[0-9a-f]{8}-[0-9a-f-]{27,}\b|[A-Za-z]:\\/i.test(text)) {
      fail(`${language}: page contains a private URL, secret, UUID, or local path`);
    }
  }
}

async function executeDemoAdapter() {
  const storage = new Map();
  let nativeFetches = 0;
  const elements = Object.fromEntries(["#demo-reset", "#private-config", "#private-launch"].map((selector) => [selector, {
    hidden: selector === "#private-launch",
    href: "",
    dataset: {},
    textContent: "",
    attributes: new Map(),
    listeners: new Map(),
    addEventListener(name, handler) { this.listeners.set(name, handler); },
    setAttribute(name, value) { this.attributes.set(String(name), String(value)); },
    removeAttribute(name) { this.attributes.delete(name); },
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; },
  }]));
  const localStorage = {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(String(key), String(value)),
    removeItem: (key) => storage.delete(String(key)),
    clear: () => storage.clear(),
  };
  const sandbox = {
    console,
    URL,
    URLSearchParams,
    Headers,
    Request,
    Response,
    Date,
    Math,
    JSON,
    Promise,
    structuredClone,
    setTimeout,
    clearTimeout,
    crypto: webcrypto,
    localStorage,
    location: { origin: "https://example.test", href: "https://example.test/language-recall/", reload() {} },
    navigator: { onLine: true },
    document: {
      readyState: "loading",
      querySelector: (selector) => elements[selector] || null,
      addEventListener: (name, handler) => { if (name === "DOMContentLoaded") handler(); },
    },
    confirm: () => true,
    prompt: () => null,
    open: () => null,
    fetch: async () => {
      nativeFetches += 1;
      throw new Error("public demo attempted a native network request");
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read(path.join(appDir, "demo-data.js")), sandbox, { filename: "demo-data.js" });
  vm.runInContext(read(path.join(appDir, "demo-adapter.js")), sandbox, { filename: "demo-adapter.js" });

  const privateUrl = "https://private.example.test/review";
  sandbox.RecallDemo.setPrivateAppUrl(privateUrl);
  const launch = elements["#private-launch"];
  const launchDom = JSON.stringify({
    href: launch.href,
    dataset: launch.dataset,
    textContent: launch.textContent,
    attributes: Array.from(launch.attributes.entries()),
  });
  if (launch.hidden || launch.getAttribute("href") !== null || launch.getAttribute("data-url") !== null || launchDom.includes(privateUrl)) {
    fail("private launcher exposed or failed to enable without a DOM URL");
  }
  sandbox.RecallDemo.clearPrivateAppUrl();
  if (!launch.hidden) fail("private launcher stayed visible after clearing its browser-only URL");

  const stateResponse = await sandbox.fetch("https://example.test/api/state?language=English");
  const statePayload = await stateResponse.json();
  if (!statePayload.ok || !Array.isArray(statePayload.data?.queue) || !statePayload.data.queue.length) {
    fail("demo adapter did not return an English review queue");
    return;
  }
  const firstCard = statePayload.data.queue[0].card;
  const query = encodeURIComponent(String(firstCard.intentKo || "").split(/\s+/)[0]);
  const searchPayload = await (await sandbox.fetch(`https://example.test/api/search?language=English&q=${query}`)).json();
  if (!searchPayload.ok || !searchPayload.data?.results?.length) fail("demo search returned no matching synthetic card");

  await sandbox.fetch("https://example.test/api/use", {
    method: "POST",
    body: JSON.stringify({ cardId: firstCard.id, action: "plan" }),
  });
  const afterPlan = await (await sandbox.fetch("https://example.test/api/state?language=English")).json();
  if (!afterPlan.data?.pendingUses?.some((item) => item.card?.id === firstCard.id)) fail("demo use plan was not persisted");

  await sandbox.fetch("https://example.test/api/review", {
    method: "POST",
    body: JSON.stringify({ cardId: firstCard.id, rating: "good" }),
  });

  const post = async (pathname, body) => {
    const response = await sandbox.fetch(`https://example.test${pathname}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { status: response.status, payload: await response.json() };
  };
  const candidate = (suffix) => ({
    action: "force",
    language: "English",
    intentKo: `합성 한도 검사 상황 ${suffix}`,
    targetText: `Synthetic active limit phrase ${suffix}.`,
    pronunciation: "",
    kind: "expression",
    scene: "자동 검사",
    counterpart: "검사 상대",
    purpose: "활성 카드 상한 확인",
    habitualText: "자동 검사에서만 쓴다.",
    note: "공개 데모 API 계약 검사",
    alias: `limit-check-${suffix}`,
  });

  sandbox.RecallDemo.reset();
  const fourthCreated = await post("/api/cards", candidate("four"));
  const fourthId = fourthCreated.payload.data?.card?.id;
  const fourthApproved = await post("/api/cards", { action: "approve", cardId: fourthId, force: true });
  if (fourthCreated.status !== 201 || fourthApproved.status !== 200 || !fourthApproved.payload.ok) {
    fail("demo adapter did not allow the fourth active English card");
  }

  const fifthCreated = await post("/api/cards", candidate("five"));
  const fifthId = fifthCreated.payload.data?.card?.id;
  const fifthApproved = await post("/api/cards", { action: "approve", cardId: fifthId, force: true });
  if (fifthApproved.status !== 409 || fifthApproved.payload.error?.code !== "ACTIVE_LIMIT") {
    fail("demo adapter did not reject the fifth active English card with ACTIVE_LIMIT");
  }

  const inactiveReview = await post("/api/review", { cardId: fifthId, rating: "good" });
  if (inactiveReview.status !== 409 || inactiveReview.payload.error?.code !== "CARD_NOT_REVIEWABLE") {
    fail("demo adapter allowed review of an inactive candidate");
  }
  const inactiveUse = await post("/api/use", { cardId: fifthId, action: "plan" });
  if (inactiveUse.status !== 409 || inactiveUse.payload.error?.code !== "CARD_NOT_USABLE") {
    fail("demo adapter allowed use of an inactive candidate");
  }

  const languageMismatch = await post("/api/cards", {
    action: "resolve-duplicate",
    cardId: fifthId,
    mergeIntoId: "demo-zh-slowly",
  });
  if (languageMismatch.status !== 409 || languageMismatch.payload.error?.code !== "LANGUAGE_MISMATCH") {
    fail("demo adapter allowed a cross-language duplicate merge");
  }
  const invalidDuplicateCandidate = await post("/api/cards", {
    action: "resolve-duplicate",
    cardId: "demo-en-pharmacy",
    mergeIntoId: "demo-en-apartment",
  });
  if (invalidDuplicateCandidate.status !== 409 || invalidDuplicateCandidate.payload.error?.code !== "CARD_NOT_DUPLICATE_CANDIDATE") {
    fail("demo adapter allowed duplicate resolution from a non-candidate card");
  }

  if (nativeFetches !== 0) fail(`demo made ${nativeFetches} native network request(s)`);

  const serialized = JSON.stringify(statePayload.data);
  if (/https?:\/\//i.test(serialized) || /\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/i.test(serialized)) {
    fail("demo API state contains a URL or UUID-like identifier");
  }
}

async function executeServiceWorkerIsolation() {
  const listeners = new Map();
  const deleted = [];
  const sandbox = {
    console,
    URL,
    Promise,
    caches: {
      keys: async () => ["language-recall-demo-old", "language-recall-demo-v3", "reading-trainer-v12", "site-shell-v1"],
      delete: async (key) => { deleted.push(key); return true; },
      open: async () => ({ addAll: async () => {}, put: async () => {} }),
      match: async () => null,
    },
    self: {
      addEventListener: (name, handler) => listeners.set(name, handler),
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
      location: { origin: "https://example.test" },
    },
    fetch: async () => new Response("", { status: 200 }),
  };
  vm.createContext(sandbox);
  vm.runInContext(read(path.join(appDir, "sw.js")), sandbox, { filename: "sw.js" });
  const activate = listeners.get("activate");
  if (!activate) {
    fail("service worker has no activate handler");
    return;
  }
  let activation = Promise.resolve();
  activate({ waitUntil: (promise) => { activation = promise; } });
  await activation;
  if (JSON.stringify(deleted) !== JSON.stringify(["language-recall-demo-old"])) {
    fail(`service worker deleted caches outside its own old prefix: ${deleted.join(", ")}`);
  }
}

async function main() {
  scanPublicFiles();
  if (fs.existsSync(appDir)) {
    checkPathsAndScope();
    checkContentParity();
    await executeDemoAdapter();
    await executeServiceWorkerIsolation();
  }
  if (failures.length) {
    console.error(`Language Recall public safety check failed (${failures.length}):`);
    for (const message of failures) console.error(`- ${message}`);
    process.exit(1);
  }
  console.log(`Language Recall public safety check passed: ${expectedFiles.length} app files, ${languages.length} language pages, no private network access.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
