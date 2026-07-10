"use strict";

const APP_IS_DEMO = true;

const appState = {
  language: "English",
  server: null,
  searchCompleted: false,
  searchQuery: "",
  searchResults: [],
  pendingQuickPayload: null,
  activeUseCard: null,
  collectionOpenId: null,
  toastTimer: null,
};

const DAY_MS = 24 * 60 * 60 * 1000;

const dom = {};

class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheDom();
  bindEvents();
  restorePreferences();
  updateConnectionStatus();
  updateQuickSaveLanguage();
  registerServiceWorker();
  loadState();
  applyInitialScreenFromQuery();
}

function cacheDom() {
  dom.languageSelect = document.querySelector("#language-select");
  dom.offlineBanner = document.querySelector("#offline-banner");
  dom.searchForm = document.querySelector("#search-form");
  dom.searchQuery = document.querySelector("#search-query");
  dom.searchMessage = document.querySelector("#search-message");
  dom.searchResults = document.querySelector("#search-results");
  dom.quickSaveSection = document.querySelector("#quick-save-section");
  dom.quickSaveForm = document.querySelector("#quick-save-form");
  dom.quickSaveLanguage = document.querySelector("#quick-save-language");
  dom.quickSaveLanguageChip = document.querySelector("#quick-save-language-chip");
  dom.quickPronunciationField = document.querySelector("#quick-pronunciation-field");
  dom.duplicatePanel = document.querySelector("#duplicate-panel");
  dom.inboxPendingSection = document.querySelector("#inbox-pending-section");
  dom.inboxPendingCount = document.querySelector("#inbox-pending-count");
  dom.collectionList = document.querySelector("#collection-list");
  dom.collectionCount = document.querySelector("#collection-count");
  dom.collectionFilterText = document.querySelector("#collection-filter-text");
  dom.collectionFilterLanguage = document.querySelector("#collection-filter-language");
  dom.reviewSummary = document.querySelector("#review-summary");
  dom.pendingUseSection = document.querySelector("#pending-use-section");
  dom.pendingUseCount = document.querySelector("#pending-use-count");
  dom.pendingUseList = document.querySelector("#pending-use-list");
  dom.reviewStage = document.querySelector("#review-stage");
  dom.discoverStage = document.querySelector("#discover-stage");
  dom.inboxList = document.querySelector("#inbox-list");
  dom.notionSyncPanel = document.querySelector("#notion-sync-panel");
  dom.notionSyncStatus = document.querySelector("#notion-sync-status");
  dom.notionSyncSummary = document.querySelector("#notion-sync-summary");
  dom.notionSyncError = document.querySelector("#notion-sync-error");
  dom.notionSyncButton = document.querySelector("#notion-sync-button");
  dom.mapStats = document.querySelector("#map-stats");
  dom.mapTableWrap = document.querySelector("#map-table-wrap");
  dom.navButtons = Array.from(document.querySelectorAll("[data-nav]"));
  dom.screens = Array.from(document.querySelectorAll("[data-screen]"));
  dom.useDialog = document.querySelector("#use-dialog");
  dom.useClose = document.querySelector("#use-close");
  dom.useLanguage = document.querySelector("#use-language");
  dom.useTitle = document.querySelector("#use-title");
  dom.usePronunciation = document.querySelector("#use-pronunciation");
  dom.useCopy = document.querySelector("#use-copy");
  dom.useSpeak = document.querySelector("#use-speak");
  dom.reflectToggle = document.querySelector("#reflect-toggle");
  dom.reflectForm = document.querySelector("#reflect-form");
  dom.toast = document.querySelector("#toast");
}

function bindEvents() {
  dom.languageSelect.addEventListener("change", onLanguageChange);
  dom.quickSaveLanguage.addEventListener("change", updateQuickSaveLanguage);
  dom.searchForm.addEventListener("submit", onSearch);
  dom.quickSaveForm.addEventListener("submit", onQuickSaveSubmit);
  dom.collectionFilterText.addEventListener("input", renderCollection);
  dom.collectionFilterLanguage.addEventListener("change", renderCollection);
  dom.notionSyncButton.addEventListener("click", onNotionSync);
  dom.navButtons.forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.nav));
  });
  dom.useClose.addEventListener("click", closeUseDialog);
  dom.useCopy.addEventListener("click", copyActiveExpression);
  dom.useSpeak.addEventListener("click", () => speakCard(appState.activeUseCard));
  dom.reflectToggle.addEventListener("click", toggleReflectForm);
  dom.reflectForm.addEventListener("submit", onReflectSubmit);
  dom.useDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeUseDialog();
  });
  dom.useDialog.addEventListener("click", (event) => {
    if (event.target === dom.useDialog) closeUseDialog();
  });
  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);
}

function restorePreferences() {
  const savedLanguage = localStorage.getItem("recall-map-language");
  if (["English", "Chinese", "all"].includes(savedLanguage)) {
    appState.language = savedLanguage;
    dom.languageSelect.value = savedLanguage;
  }
  if (appState.language !== "all") dom.quickSaveLanguage.value = appState.language;
}

function onLanguageChange() {
  appState.language = dom.languageSelect.value;
  localStorage.setItem("recall-map-language", appState.language);
  appState.searchCompleted = false;
  appState.searchQuery = "";
  appState.searchResults = [];
  appState.collectionOpenId = null;
  dom.searchResults.replaceChildren();
  dom.searchMessage.textContent = "";
  dom.duplicatePanel.hidden = true;
  if (appState.language !== "all") dom.quickSaveLanguage.value = appState.language;
  updateQuickSaveLanguage();
  loadState();
}

function updateConnectionStatus() {
  dom.offlineBanner.hidden = navigator.onLine;
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch (error) {
    throw new ApiError(
      navigator.onLine ? "서버에 연결할 수 없습니다." : "오프라인에서는 이 작업을 저장할 수 없습니다.",
      0,
      { cause: error }
    );
  }

  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new ApiError("서버 응답 형식을 읽을 수 없습니다.", response.status);
    }
  }

  if (!response.ok || !payload?.ok) {
    const error = payload?.error || {};
    throw new ApiError(error.message || `요청에 실패했습니다. (${response.status})`, response.status, error);
  }
  return payload.data;
}

async function loadState() {
  setScreenLoading();
  try {
    const params = new URLSearchParams({ language: appState.language });
    appState.server = await api(`/api/state?${params.toString()}`);
    renderAllState();
  } catch (error) {
    appState.server = null;
    renderStateError(error);
  }
}

function setScreenLoading() {
  dom.reviewSummary.textContent = "오늘 큐를 불러오는 중입니다.";
  hidePendingUses();
  dom.reviewStage.replaceChildren(emptyState("불러오는 중", "복습 항목을 확인하고 있습니다."));
  dom.discoverStage.replaceChildren(emptyState("불러오는 중", "묻혀 있던 원문을 확인하고 있습니다."));
  dom.inboxPendingSection.hidden = true;
  dom.inboxList.replaceChildren();
  dom.collectionCount.textContent = "";
  dom.collectionList.replaceChildren(emptyState("불러오는 중", "저장한 표현을 확인하고 있습니다."));
  setNotionSyncLoading();
  dom.mapStats.replaceChildren();
  dom.mapTableWrap.replaceChildren(emptyState("불러오는 중", "학습 지도를 계산하고 있습니다."));
}

function renderStateError(error) {
  const message = friendlyError(error);
  dom.reviewSummary.textContent = message;
  hidePendingUses();
  dom.reviewStage.replaceChildren(emptyState("불러오지 못했습니다", message));
  dom.discoverStage.replaceChildren(emptyState("불러오지 못했습니다", message));
  dom.inboxPendingSection.hidden = true;
  dom.inboxList.replaceChildren();
  dom.collectionCount.textContent = "";
  dom.collectionList.replaceChildren(emptyState("불러오지 못했습니다", message));
  renderNotionSyncError(message);
  dom.mapStats.replaceChildren();
  dom.mapTableWrap.replaceChildren(emptyState("불러오지 못했습니다", message));
}

function renderAllState() {
  renderReview();
  renderDiscover();
  renderInbox();
  renderNotionSync();
  renderMap();
}

async function onSearch(event) {
  event.preventDefault();
  const query = dom.searchQuery.value.trim();
  if (!query) {
    setSearchMessage("한국어 상황이나 하고 싶은 말을 먼저 적어 주세요.", true);
    dom.searchQuery.focus();
    return;
  }

  setSearchBusy(true);
  setSearchMessage(APP_IS_DEMO ? "합성 노트 원문과 검색 별칭을 찾고 있습니다." : "노션 원문과 검색 별칭을 찾고 있습니다.");
  dom.searchResults.replaceChildren();
  dom.duplicatePanel.hidden = true;

  try {
    const params = new URLSearchParams({ q: query, language: appState.language });
    const data = await api(`/api/search?${params.toString()}`);
    appState.searchCompleted = true;
    appState.searchQuery = data.query || query;
    appState.searchResults = Array.isArray(data.results) ? data.results.slice(0, 3) : [];
    renderSearchResults();
    const count = appState.searchResults.length;
    setSearchMessage(
      count
        ? `${APP_IS_DEMO ? "합성 노트 원문" : "기존 원문"} ${count}개를 먼저 확인하세요.`
        : `가까운 ${APP_IS_DEMO ? "합성 노트 원문" : "기존 원문"}을 찾지 못했습니다. 아래 바로 저장으로 추가하세요.`
    );
    if (!count) prefillQuickSave(appState.searchQuery);
  } catch (error) {
    appState.searchCompleted = false;
    setSearchMessage(friendlyError(error), true);
  } finally {
    setSearchBusy(false);
  }
}

function setSearchBusy(isBusy) {
  const button = dom.searchForm.querySelector("button[type='submit']");
  const label = button.querySelector("span");
  button.disabled = isBusy;
  label.textContent = isBusy ? "찾는 중…" : "먼저 찾기";
}

function setSearchMessage(message, isError = false) {
  dom.searchMessage.textContent = message;
  dom.searchMessage.classList.toggle("is-error", isError);
}

function renderSearchResults() {
  dom.searchResults.replaceChildren();
  if (!appState.searchResults.length) return;

  appState.searchResults.forEach((result, index) => {
    const card = normalizeCard(result);
    const article = createCardShell("source-card");
    const header = element("div", "card-header");
    const headingWrap = element("div");
    headingWrap.append(
      element("p", "source-label", `${APP_IS_DEMO ? "합성 노트 원문" : "기존 원문"} ${index + 1}`),
      element("h2", "card-title", card.intentKo || "상황 설명 없음")
    );
    const score = Number(result?.score);
    if (Number.isFinite(score)) {
      header.append(headingWrap, element("span", "meta-chip", `일치 ${Math.round(score * (score <= 1 ? 100 : 1))}`));
    } else {
      header.append(headingWrap);
    }
    article.append(header);

    const matchedFields = Array.isArray(result?.matchedFields) ? result.matchedFields : [];
    if (matchedFields.length) {
      const tags = element("div", "tag-row");
      matchedFields.forEach((field) => tags.append(element("span", "meta-chip", matchedFieldLabel(field))));
      article.append(tags);
    }

      appendCardDetails(article, card, { includeTarget: true, includeStatus: true });

      const actions = element("div", "card-actions");
      if (isVerified(card)) {
        const useButton = button("기존 표현으로 지금 쓰기", "primary-button");
        useButton.addEventListener("click", () => mergeAliasAndUse(card, useButton));
        actions.append(useButton);
      } else {
        const reviewAction = unverifiedSearchAction(card);
        const reviewButton = button(reviewAction.label, "secondary-button");
        reviewButton.addEventListener("click", () => handleUnverifiedSearchResult(card, reviewAction, reviewButton));
        actions.append(reviewButton);
      }
      article.append(actions);
      dom.searchResults.append(article);
    });
  }

async function mergeAliasAndUse(card, trigger) {
  if (!isVerified(card)) {
    showToast("검수 완료 전에는 지금 쓰기를 열 수 없습니다.");
    navigate("inbox");
    return;
  }
  const alias = appState.searchQuery.trim();
  if (!alias) return;
  setButtonBusy(trigger, true, "연결 중…");
  try {
    const data = await api("/api/cards", {
      method: "POST",
      body: JSON.stringify(cardPayloadFromCard(card, { action: "merge", alias, mergeIntoId: card.id })),
    });
    const savedCard = normalizeCard(data?.card || data || card);
    showToast("이번 검색어를 기존 항목의 별칭으로 연결했습니다.");
    openUseDialog(savedCard.id ? savedCard : card);
  } catch (error) {
    showToast(friendlyError(error));
  } finally {
    setButtonBusy(trigger, false);
  }
}

function unverifiedSearchAction(card) {
  const verification = String(card?.verification || "").toLowerCase();
  const lifecycle = String(card?.lifecycle || "").toLowerCase();
  const needsReview = ["needs-review", "source-changed"].includes(verification) || lifecycle === "needs-review";
  if (needsReview) return { label: "재검수하기", sendToInbox: false };

  const archivedNotion = verification === "notion-original" || ["archive", "archived"].includes(lifecycle);
  if (archivedNotion) return { label: "검수 후보로 보내기", sendToInbox: true };

  return { label: "내 표현에서 검수하기", sendToInbox: false };
}

async function handleUnverifiedSearchResult(card, action, trigger) {
  if (!action.sendToInbox) {
    navigate("inbox");
    return;
  }
  if (!card.id) {
    showToast("카드 식별자가 없어 받은함으로 보낼 수 없습니다.");
    return;
  }

  setButtonBusy(trigger, true, "보내는 중…");
  try {
    await api("/api/discover", {
      method: "POST",
      body: JSON.stringify({ cardId: card.id, decision: "soon" }),
    });
    showToast("검수 후보를 내 표현의 검수 대기로 보냈습니다.");
    await loadState();
    navigate("inbox");
  } catch (error) {
    showToast(friendlyError(error));
  } finally {
    setButtonBusy(trigger, false);
  }
}

function prefillQuickSave(query) {
  const intentInput = dom.quickSaveForm.elements.intentKo;
  if (!intentInput.value.trim() || intentInput.dataset.autofilled === "true") {
    intentInput.value = query;
    intentInput.dataset.autofilled = "true";
  }
  if (appState.language !== "all") dom.quickSaveLanguage.value = appState.language;
  updateQuickSaveLanguage();
  dom.quickSaveSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  dom.quickSaveForm.elements.targetText.focus({ preventScroll: true });
}

function updateQuickSaveLanguage() {
  const isChinese = dom.quickSaveLanguage.value === "Chinese";
  dom.quickSaveLanguageChip.textContent = isChinese ? "저장 언어 · 中文" : "저장 언어 · English";
  dom.quickPronunciationField.hidden = !isChinese;
  dom.quickSaveForm.elements.pronunciation.required = isChinese;
}

async function onQuickSaveSubmit(event) {
  event.preventDefault();
  if (!dom.quickSaveForm.reportValidity()) return;

  const payload = quickSavePayload();
  appState.pendingQuickPayload = payload;
  const submit = dom.quickSaveForm.querySelector("button[type='submit']");
  setButtonBusy(submit, true, "저장 중…");
  dom.duplicatePanel.hidden = true;

  try {
    const data = await api("/api/cards", { method: "POST", body: JSON.stringify(payload) });
    if (data?.requiresConfirmation && Array.isArray(data.duplicates) && data.duplicates.length) {
      renderDuplicateChoices(data.duplicates);
    } else {
      onQuickSaved(data);
    }
  } catch (error) {
    showToast(friendlyError(error));
  } finally {
    setButtonBusy(submit, false);
  }
}

function quickSavePayload() {
  const data = new FormData(dom.quickSaveForm);
  const intentKo = String(data.get("intentKo") || "").trim();
  return {
    action: "save",
    language: String(data.get("language") || "English"),
    intentKo,
    targetText: String(data.get("targetText") || "").trim(),
    pronunciation: String(data.get("pronunciation") || "").trim(),
    kind: String(data.get("kind") || "expression"),
    scene: String(data.get("scene") || "").trim(),
    counterpart: String(data.get("counterpart") || "").trim(),
    purpose: String(data.get("purpose") || "").trim(),
    habitualText: String(data.get("habitualText") || "").trim(),
    note: String(data.get("note") || "").trim(),
    alias: intentKo,
  };
}

function renderDuplicateChoices(duplicates) {
  dom.duplicatePanel.replaceChildren();
  dom.duplicatePanel.hidden = false;
  dom.duplicatePanel.append(
    element("h3", "", "비슷한 기존 항목이 있습니다"),
    element("p", "supporting-copy", "자동으로 합치지 않습니다. 기존 항목에 이번 상황을 별칭으로 붙이거나, 다른 상황이면 새로 저장하세요.")
  );
  const list = element("div", "duplicate-list");
  duplicates.forEach((item) => {
    const card = normalizeCard(item);
    const row = element("div", "duplicate-item");
    row.append(
      element("strong", "", card.intentKo || "상황 설명 없음"),
      element("p", "target-text", displayExpression(card) || "학습 표현 없음")
    );
    const mergeButton = button("기존 항목에 별칭 추가", "secondary-button");
    mergeButton.addEventListener("click", () => resolveQuickDuplicate("merge", card, mergeButton));
    row.append(mergeButton);
    list.append(row);
  });
  const forceButton = button("그래도 새로 저장", "primary-button");
  forceButton.addEventListener("click", () => resolveQuickDuplicate("force", null, forceButton));
  dom.duplicatePanel.append(list, forceButton);
  dom.duplicatePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function resolveQuickDuplicate(kind, card, trigger) {
  if (!appState.pendingQuickPayload) return;
  const payload = kind === "merge"
    ? { ...appState.pendingQuickPayload, action: "merge", mergeIntoId: card.id }
    : { ...appState.pendingQuickPayload, action: "save", force: true };
  setButtonBusy(trigger, true, "저장 중…");
  try {
    const data = await api("/api/cards", { method: "POST", body: JSON.stringify(payload) });
    if (kind === "merge") {
      dom.duplicatePanel.hidden = true;
      appState.pendingQuickPayload = null;
      showToast("기존 항목에 이번 상황을 별칭으로 연결했습니다.");
      await loadState();
    } else {
      onQuickSaved(data);
    }
  } catch (error) {
    showToast(friendlyError(error));
  } finally {
    setButtonBusy(trigger, false);
  }
}

function onQuickSaved(data) {
  const card = normalizeCard(data);
  const review = data?.review || null;
  appState.pendingQuickPayload = null;
  dom.duplicatePanel.hidden = true;
  dom.quickSaveForm.reset();
  delete dom.quickSaveForm.elements.intentKo.dataset.autofilled;
  if (appState.language !== "all") dom.quickSaveLanguage.value = appState.language;
  updateQuickSaveLanguage();
  loadState();
  showToast("오늘 복습에 추가했습니다.", {
    label: "지금 말해보기",
    onAction: () => startInstantReview({ card, review }),
  });
}

function startInstantReview(item) {
  const card = normalizeCard(item);
  if (!card.id) return;
  navigate("review");
  dom.reviewSummary.textContent = "방금 저장한 표현부터 말해 봅니다.";
  dom.reviewStage.replaceChildren(buildReviewCard(item, 1));
}

function renderReview() {
  renderPendingUses();
  const queue = asArray(appState.server?.queue);
  const stats = appState.server?.stats || {};
  const limits = appState.server?.limits || {};
  const cap = safeCount(limits.dailyQueue) || 5;
  const interactionCap = safeCount(limits.interactions) || 7;
  dom.reviewSummary.textContent = queue.length
    ? `${queue.length}개가 준비됐습니다. 언어별 하루 ${cap}개, 실패 재시도까지 최대 ${interactionCap}개입니다.`
    : "오늘 꺼내 말할 항목이 없습니다.";
  dom.reviewStage.replaceChildren();
  if (!queue.length) {
    dom.reviewStage.append(emptyState(
      "오늘 복습을 마쳤습니다",
      safeCount(stats.nextDue)
        ? `다음 예정 ${safeCount(stats.nextDue)}개가 아래 일정에 있습니다.`
        : "찾기 화면의 바로 저장으로 새 표현을 추가하면 오늘 복습에 바로 들어옵니다."
    ));
    const upcomingPanel = buildUpcomingPanel();
    if (upcomingPanel) dom.reviewStage.append(upcomingPanel);
    return;
  }
  dom.reviewStage.append(buildReviewCard(queue[0], queue.length));
}

function buildUpcomingPanel() {
  const upcoming = asArray(appState.server?.upcoming);
  if (!upcoming.length) return null;
  const panel = element("div", "upcoming-panel");
  panel.append(element("span", "detail-label", "다가오는 복습 · 7일"));

  const today = startOfDay(new Date());
  const dayCounts = new Map();
  let beyond = 0;
  upcoming.forEach((item) => {
    const dueAt = effectiveDueDate(item?.review);
    if (!dueAt) return;
    const diffDays = Math.round((startOfDay(dueAt) - today) / DAY_MS);
    if (diffDays <= 7) {
      const key = formatDateOnly(dueAt);
      dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
    } else {
      beyond += 1;
    }
  });

  const daysList = element("ul", "upcoming-days");
  dayCounts.forEach((count, label) => {
    const line = document.createElement("li");
    line.append(element("span", "", label), element("span", "upcoming-count", `${count}개`));
    daysList.append(line);
  });
  if (beyond) {
    const line = document.createElement("li");
    line.append(element("span", "", "8일 이후"), element("span", "upcoming-count", `${beyond}개`));
    daysList.append(line);
  }
  panel.append(daysList);

  const preview = upcoming.slice(0, 3);
  if (preview.length) {
    const previewWrap = element("div", "upcoming-preview");
    previewWrap.append(element("span", "detail-label", "가장 이른 카드"));
    preview.forEach((item) => {
      const card = normalizeCard(item);
      const dueAt = effectiveDueDate(item?.review);
      const line = element("p", "upcoming-preview-item");
      line.append(
        element("strong", "", displayExpression(card) || card.intentKo || "표현 없음"),
        document.createTextNode(dueAt ? ` · ${formatDateOnly(dueAt)}` : "")
      );
      previewWrap.append(line);
    });
    panel.append(previewWrap);
  }
  return panel;
}

function effectiveDueDate(review) {
  if (!review || !review.dueAt) return null;
  const dueAt = new Date(review.dueAt);
  if (Number.isNaN(dueAt.getTime())) return null;
  if (review.snoozedUntil) {
    const snoozed = new Date(review.snoozedUntil);
    if (!Number.isNaN(snoozed.getTime()) && snoozed > dueAt) return snoozed;
  }
  return dueAt;
}

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function renderPendingUses() {
  const rawItems = appState.server?.pendingUses;
  const items = Array.isArray(rawItems)
    ? rawItems.filter(isValidPendingUse).slice(0, 3)
    : [];
  dom.pendingUseList.replaceChildren();
  if (!items.length) {
    hidePendingUses();
    return;
  }

  dom.pendingUseSection.hidden = false;
  dom.pendingUseCount.textContent = `${items.length}개`;
  items.forEach((item) => {
    const card = normalizeCard(item);
    const row = element("article", "pending-use-item");
    const copy = element("div", "pending-use-copy");
    copy.append(
      element("strong", "pending-use-expression", displayExpression(card) || "학습 표현 없음"),
      element("p", "pending-use-intent", card.intentKo || "상황 설명 없음"),
      element("p", "pending-use-time", pendingUseTimeLabel(item.plannedAt))
    );
    const reflectButton = button("결과 남기기", "secondary-button pending-use-button");
    reflectButton.addEventListener("click", () => openUseDialog(card, { recordPlan: false, openReflect: true }));
    row.append(copy, reflectButton);
    dom.pendingUseList.append(row);
  });
}

function isValidPendingUse(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  const card = normalizeCard(item);
  return Boolean(card.id && isVerified(card) && (displayExpression(card) || card.intentKo));
}

function pendingUseTimeLabel(value) {
  if (typeof value !== "string" && typeof value !== "number") return "계획 시각 기록 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "계획 시각 기록 없음";
  return `계획 ${formatDateTime(date)}`;
}

function hidePendingUses() {
  dom.pendingUseSection.hidden = true;
  dom.pendingUseCount.textContent = "";
  dom.pendingUseList.replaceChildren();
}

function buildReviewCard(item, queueLength) {
  const card = normalizeCard(item);
  const reviewState = item?.review || item?.reviewState || card.reviewState || {};
  const article = createCardShell("review-card");
  const header = element("div", "card-header");
  header.append(
    element("span", "review-count", `남은 항목 ${queueLength}`),
    statusChip(card)
  );
  article.append(header);
  article.append(element("p", "review-prompt", card.intentKo || "이 표현을 쓸 상황을 떠올려 보세요."));

  const meta = element("div", "card-meta");
  [card.scene, card.counterpart, card.purpose].filter(Boolean).forEach((value) => meta.append(element("span", "meta-chip", value)));
  if (meta.childElementCount) article.append(meta);

  const revealArea = element("div", "reveal-area");
  const revealButton = button(card.language === "Chinese" ? "한자 보기" : "표현 보기", "primary-button reveal-button");
  revealArea.append(revealButton);
  article.append(revealArea);

  revealButton.addEventListener("click", () => {
    revealArea.replaceChildren(buildReviewAnswer(card, reviewState));
  });
  return article;
}

function buildReviewAnswer(card, reviewState) {
  const answer = element("div", "review-answer");
  const expression = displayExpression(card);
  answer.append(element("span", "detail-label", card.language === "Chinese" ? "한자" : "학습 표현"));
  answer.append(element("p", "target-text", expression || "학습 표현 없음"));

  if (card.language === "Chinese") {
    const pinyinButton = button("병음 보기", "secondary-button reveal-button");
    answer.append(pinyinButton);
    pinyinButton.addEventListener("click", () => {
      pinyinButton.replaceWith(element("p", "pronunciation-text", card.pronunciation || "병음 없음"));
      appendReviewControls(answer, card, reviewState);
    }, { once: true });
  } else {
    appendReviewControls(answer, card, reviewState);
  }
  return answer;
}

function appendReviewControls(answer, card, reviewState) {
  if (answer.querySelector(".review-actions")) return;

  const speakButton = button("듣기", "secondary-button");
  speakButton.addEventListener("click", () => speakCard(card));
  answer.append(speakButton);

  appendSourceAndLearningBlocks(answer, card);

  const actions = element("div", "review-actions");
  const ratings = [
    ["again", "못함", "rating-again"],
    ["hard", "애매함", ""],
    ["good", "바로 말함", "rating-good"],
  ];
  ratings.forEach(([rating, label, extraClass]) => {
    const ratingButton = button(label, `choice-button ${extraClass}`.trim());
    ratingButton.addEventListener("click", () => submitReview(card.id, rating, ratingButton));
    actions.append(ratingButton);
  });
  answer.append(actions);

  const snoozeWrap = element("div", "snooze-wrap");
  snoozeWrap.append(element("span", "detail-label", "미루기"));
  const snoozeActions = element("div", "snooze-actions");
  [
    ["tomorrow", "내일"],
    ["weekend", "주말"],
    ["7d", "7일 뒤"],
  ].forEach(([until, label]) => {
    const snoozeButton = button(label, "");
    snoozeButton.addEventListener("click", () => submitSnooze(card.id, until, snoozeButton));
    snoozeActions.append(snoozeButton);
  });
  snoozeWrap.append(snoozeActions);
  answer.append(snoozeWrap);

  if (reviewState.reviewCount) {
    answer.append(element("p", "inline-status", `지금까지 ${reviewState.reviewCount}번 꺼내 봤습니다.`));
  }
}

async function submitReview(cardId, rating, trigger) {
  if (!cardId) return;
  setButtonBusy(trigger, true, "저장 중…");
  try {
    await api("/api/review", {
      method: "POST",
      body: JSON.stringify({ cardId, rating }),
    });
    showToast("복습 결과와 다음 일정을 저장했습니다.");
    await loadState();
  } catch (error) {
    showToast(friendlyError(error));
    setButtonBusy(trigger, false);
  }
}

async function submitSnooze(cardId, until, trigger) {
  if (!cardId) return;
  setButtonBusy(trigger, true, "저장 중…");
  try {
    await api("/api/snooze", {
      method: "POST",
      body: JSON.stringify({ cardId, until }),
    });
    showToast("선택한 날짜까지 미뤘습니다. 내일 분량은 늘어나지 않습니다.");
    await loadState();
  } catch (error) {
    showToast(friendlyError(error));
    setButtonBusy(trigger, false);
  }
}

function renderDiscover() {
  const items = asArray(appState.server?.discovery);
  dom.discoverStage.replaceChildren();
  if (!items.length) {
    dom.discoverStage.append(emptyState("오늘 다시 볼 원문이 없습니다", "언어별 하루 한 개만 보여 줍니다."));
    return;
  }

  const card = normalizeCard(items[0]);
  const article = createCardShell("discover-card");
  const header = element("div", "card-header");
  header.append(element("span", "source-label", APP_IS_DEMO ? "합성 노트 원문" : "Notion 원문"), statusChip(card));
  article.append(header);
  article.append(element("p", "discover-text", sourceRawText(card) || displayExpression(card) || "표시할 원문이 없습니다."));
  appendSourceBlock(article, card, { includeRaw: false });

  const actions = element("div", "discover-actions");
  [
    ["soon", "곧 쓸 것"],
    ["later", "언젠가"],
    ["retire", "필요 없음"],
    ["needs-review", "교정 필요"],
  ].forEach(([decision, label]) => {
    const decisionButton = button(label, decision === "soon" ? "primary-button" : "choice-button");
    decisionButton.addEventListener("click", () => submitDiscover(card.id, decision, decisionButton));
    actions.append(decisionButton);
  });
  article.append(actions);
  dom.discoverStage.append(article);
}

async function submitDiscover(cardId, decision, trigger) {
  if (!cardId) return;
  setButtonBusy(trigger, true, "저장 중…");
  try {
    await api("/api/discover", {
      method: "POST",
      body: JSON.stringify({ cardId, decision }),
    });
    showToast("분류를 저장했습니다.");
    await loadState();
  } catch (error) {
    showToast(friendlyError(error));
    setButtonBusy(trigger, false);
  }
}

function renderInbox() {
  const items = asArray(appState.server?.inbox);
  dom.inboxList.replaceChildren();
  dom.inboxPendingSection.hidden = !items.length;
  dom.inboxPendingCount.textContent = items.length ? `${items.length}개` : "";
  items.forEach((item) => dom.inboxList.append(buildInboxCard(item)));
  renderCollection();
}

function renderCollection() {
  const items = asArray(appState.server?.collection);
  const textFilter = String(dom.collectionFilterText.value || "").trim().toLocaleLowerCase();
  const languageFilter = dom.collectionFilterLanguage.value;
  const filtered = items.filter((item) => {
    const card = normalizeCard(item);
    if (languageFilter !== "all" && card.language !== languageFilter) return false;
    if (!textFilter) return true;
    const haystack = [card.intentKo, card.targetText, card.learnedText, (card.aliases || []).join(" ")]
      .join(" ")
      .toLocaleLowerCase();
    return haystack.includes(textFilter);
  });
  dom.collectionCount.textContent = `${filtered.length}개`;
  dom.collectionList.replaceChildren();
  if (!filtered.length) {
    dom.collectionList.append(emptyState(
      "표시할 표현이 없습니다",
      items.length ? "필터를 지우면 전체 목록이 다시 보입니다." : "찾기 화면의 바로 저장으로 첫 표현을 추가해 보세요."
    ));
    return;
  }
  filtered.forEach((item) => dom.collectionList.append(buildCollectionItem(item)));
}

function buildCollectionItem(item) {
  const card = normalizeCard(item);
  const review = item?.review || null;
  const wrap = element("article", "collection-item");
  const row = element("button", "collection-row");
  row.type = "button";
  row.setAttribute("aria-expanded", "false");
  const copy = element("div", "collection-copy");
  copy.append(
    element("p", "collection-intent", card.intentKo || "상황 설명 없음"),
    element("p", "collection-expression", displayExpression(card) || "학습 표현 없음")
  );
  const side = element("div", "collection-side");
  side.append(collectionBadge(card, review));
  const dueLabel = collectionDueLabel(card, review);
  if (dueLabel) side.append(element("span", "collection-due", dueLabel));
  row.append(copy, side);

  const detail = element("div", "collection-detail");
  detail.hidden = true;

  row.addEventListener("click", () => {
    const willOpen = detail.hidden;
    if (willOpen && !detail.childElementCount) detail.append(buildCollectionDetail(card, review));
    detail.hidden = !willOpen;
    row.setAttribute("aria-expanded", String(willOpen));
    appState.collectionOpenId = willOpen ? card.id : null;
  });

  if (appState.collectionOpenId === card.id) {
    detail.append(buildCollectionDetail(card, review));
    detail.hidden = false;
    row.setAttribute("aria-expanded", "true");
  }

  wrap.append(row, detail);
  return wrap;
}

function collectionBadge(card, review) {
  const lifecycle = String(card?.lifecycle || "").toLowerCase();
  const verification = String(card?.verification || "").toLowerCase();
  let label = "후보";
  let className = "badge-candidate";
  if (["needs-review", "source-changed"].includes(verification) || lifecycle === "needs-review") {
    label = "재검수";
    className = "badge-review";
  } else if (["archive", "archived"].includes(lifecycle)) {
    label = "보관 원문";
    className = "";
  } else if (isVerified(card) && Number(review?.step) >= 6 && Number(review?.successfulUses) >= 2) {
    label = "익힘";
    className = "badge-learned";
  } else if (isVerified(card) && lifecycle === "learning") {
    label = "학습중";
    className = "badge-learning";
  }
  return element("span", `collection-badge ${className}`.trim(), label);
}

function collectionDueLabel(card, review) {
  if (!isVerified(card) || card.active === false || String(card?.lifecycle).toLowerCase() !== "learning") return "";
  const dueAt = effectiveDueDate(review);
  if (!dueAt) return "";
  return dueAt.getTime() <= Date.now() ? "오늘 복습" : `다음 ${formatDateOnly(dueAt)}`;
}

function buildCollectionDetail(card, review) {
  const wrap = element("div");
  const meta = element("div", "card-meta");
  meta.append(element("span", "meta-chip", languageLabel(card.language)), statusChip(card));
  if (safeCount(review?.reviewCount)) meta.append(element("span", "meta-chip", `복습 ${safeCount(review.reviewCount)}회`));
  if (safeCount(card.actualUseCount)) meta.append(element("span", "meta-chip", `실사용 ${safeCount(card.actualUseCount)}회`));
  if (card.createdAt) meta.append(element("span", "meta-chip", `저장 ${formatDateOnly(card.createdAt)}`));
  wrap.append(meta);

  const form = element("form", "field-grid collection-edit-form");
  form.append(
    editField("한국어 상황·뜻", "intentKo", card.intentKo, { type: "textarea", required: true, full: true }),
    editField("학습 표현", "targetText", card.targetText, { type: "textarea", required: true, full: true })
  );
  if (card.language === "Chinese") {
    form.append(editField("병음", "pronunciation", card.pronunciation, { required: isVerified(card), full: true }));
  }
  if (isVerified(card)) {
    form.append(editField("검수 학습본", "learnedText", card.learnedText, { type: "textarea", full: true }));
  }
  form.append(
    buildKindSelect(card.kind),
    editField("말의 목적", "purpose", card.purpose),
    editField("장면", "scene", card.scene),
    editField("상대", "counterpart", card.counterpart),
    editField("평소 표현", "habitualText", card.habitualText, { full: true }),
    editField("메모", "note", card.note, { type: "textarea", full: true })
  );

  const actions = element("div", "collection-detail-actions field-full");
  const saveButton = button("변경 저장", "primary-button");
  saveButton.type = "submit";
  actions.append(saveButton);
  if (isVerified(card)) {
    const useButton = button("지금 쓰기", "secondary-button");
    useButton.addEventListener("click", () => openUseDialog(card));
    actions.append(useButton);
  }
  const retireButton = button("보관", "secondary-button retire-button");
  retireButton.addEventListener("click", () => retireCard(card, retireButton));
  actions.append(retireButton);
  form.append(actions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    submitCollectionEdit(card, form, saveButton);
  });

  wrap.append(form);
  return wrap;
}

function editField(labelText, name, value, { type = "input", rows = 2, required = false, full = false } = {}) {
  const label = element("label", `field${full ? " field-full" : ""}`);
  const title = element("span", "", `${labelText} `);
  if (required) title.append(element("b", "", "*"));
  label.append(title);
  let control;
  if (type === "textarea") {
    control = document.createElement("textarea");
    control.rows = rows;
  } else {
    control = document.createElement("input");
    control.type = "text";
    control.autocomplete = "off";
  }
  control.name = name;
  control.value = value || "";
  control.required = required;
  label.append(control);
  return label;
}

function buildKindSelect(value) {
  const label = element("label", "field");
  label.append(element("span", "", "항목 유형"));
  const select = document.createElement("select");
  select.name = "kind";
  [
    ["expression", "실전 표현"],
    ["script", "장면 스크립트·공식 문의"],
    ["concept", "단어·개념"],
    ["checklist", "시험 노하우·체크리스트"],
    ["reference", "일회성·오래된 정보"],
  ].forEach(([optionValue, optionLabel]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionLabel;
    if (optionValue === (value || "expression")) option.selected = true;
    select.append(option);
  });
  label.append(select);
  return label;
}

async function submitCollectionEdit(card, form, trigger) {
  const data = new FormData(form);
  const payload = {
    action: "update",
    cardId: card.id,
    intentKo: String(data.get("intentKo") || "").trim(),
    targetText: String(data.get("targetText") || "").trim(),
    pronunciation: data.has("pronunciation") ? String(data.get("pronunciation") || "").trim() : (card.pronunciation || ""),
    kind: String(data.get("kind") || card.kind || "expression"),
    purpose: String(data.get("purpose") || "").trim(),
    scene: String(data.get("scene") || "").trim(),
    counterpart: String(data.get("counterpart") || "").trim(),
    habitualText: String(data.get("habitualText") || "").trim(),
    note: String(data.get("note") || "").trim(),
  };
  if (data.has("learnedText")) payload.learnedText = String(data.get("learnedText") || "").trim();
  setButtonBusy(trigger, true, "저장 중…");
  try {
    await api("/api/cards", { method: "POST", body: JSON.stringify(payload) });
    appState.collectionOpenId = card.id;
    showToast("표현을 수정했습니다.");
    await loadState();
  } catch (error) {
    showToast(friendlyError(error));
    setButtonBusy(trigger, false);
  }
}

async function retireCard(card, trigger) {
  if (!card.id) return;
  if (!window.confirm("이 표현을 보관할까요? 복습과 목록에서 빠집니다.")) return;
  setButtonBusy(trigger, true, "보관 중…");
  try {
    await api("/api/cards", { method: "POST", body: JSON.stringify({ action: "retire", cardId: card.id }) });
    appState.collectionOpenId = null;
    showToast("표현을 보관했습니다.");
    await loadState();
  } catch (error) {
    showToast(friendlyError(error));
    setButtonBusy(trigger, false);
  }
}

function setNotionSyncLoading() {
  setNotionSyncStatus("확인 중", "status-pending");
  dom.notionSyncSummary.textContent = "동기화 상태를 확인하고 있습니다.";
  dom.notionSyncError.hidden = true;
  dom.notionSyncError.textContent = "";
  dom.notionSyncButton.disabled = true;
}

function renderNotionSync() {
  const notion = appState.server?.sync?.notion;
  const sync = notion && typeof notion === "object" && !Array.isArray(notion) ? notion : {};
  const status = String(sync.status || "idle").toLowerCase();
  const labels = {
    ok: ["최신", "status-verified"],
    synced: ["최신", "status-verified"],
    syncing: ["가져오는 중", "status-pending"],
    pending: ["대기", "status-pending"],
    idle: ["연결 상태 없음", "status-pending"],
    "not-configured": ["연결 필요", "status-pending"],
    error: ["오류", "status-changed"],
  };
  const [label, className] = labels[status] || [sync.status || "상태 미확인", "status-pending"];
  setNotionSyncStatus(label, className);

  dom.notionSyncSummary.textContent = sync.lastSuccessAt
    ? `마지막 성공 ${formatDateTime(sync.lastSuccessAt)}`
    : status === "not-configured"
      ? "현재 저장된 원문으로 사용할 수 있습니다. Notion 연결 후 새 내용이 자동 반영됩니다."
      : "아직 성공한 동기화 기록이 없습니다.";
  const error = typeof sync.error === "string"
    ? sync.error.trim()
    : (typeof sync.error?.message === "string" ? sync.error.message.trim() : "");
  dom.notionSyncError.textContent = error;
  dom.notionSyncError.hidden = !error;
  dom.notionSyncButton.disabled = status === "syncing";
  dom.notionSyncButton.textContent = status === "syncing" ? "새로고침 중…" : "Notion 새로고침";
}

function renderNotionSyncError(message) {
  setNotionSyncStatus("오류", "status-changed");
  dom.notionSyncSummary.textContent = "동기화 상태를 불러오지 못했습니다.";
  dom.notionSyncError.textContent = message;
  dom.notionSyncError.hidden = false;
  dom.notionSyncButton.disabled = false;
}

function setNotionSyncStatus(label, className) {
  dom.notionSyncStatus.textContent = label;
  dom.notionSyncStatus.className = `status-chip ${className}`;
}

async function onNotionSync() {
  const trigger = dom.notionSyncButton;
  setButtonBusy(trigger, true, "새로고침 중…");
  setNotionSyncStatus("가져오는 중", "status-pending");
  dom.notionSyncError.hidden = true;
  dom.notionSyncError.textContent = "";
  try {
    await api("/api/sync/notion", { method: "POST" });
    showToast("Notion 원문과 받은함을 새로 가져왔습니다.");
    await loadState();
  } catch (error) {
    const message = friendlyError(error);
    showToast(message);
    renderNotionSyncError(message);
  } finally {
    setButtonBusy(trigger, false);
  }
}

function buildInboxCard(item) {
  const card = normalizeCard(item);
  const article = createCardShell("inbox-card");
  const header = element("div", "inbox-heading");
  const headingWrap = element("div");
  headingWrap.append(
    element("span", "source-label", languageLabel(card.language)),
    element("h2", "inbox-title", card.intentKo || "상황 설명 없음")
  );
  header.append(headingWrap, statusChip(card));
  article.append(header);
  article.append(element("p", "inbox-expression", card.targetText || "학습 표현 없음"));
  if (card.language === "Chinese" && card.pronunciation) {
    article.append(element("p", "pronunciation-text", card.pronunciation));
  }
  appendSourceAndLearningBlocks(article, card);

  const syncText = syncStatusText(card);
  if (syncText) {
    const statusBlock = element("div", "status-block");
    statusBlock.append(element("span", "detail-label", "동기화 상태"), element("p", "raw-text", syncText));
    article.append(statusBlock);
  }

  if (Array.isArray(card.duplicateCandidateIds) && card.duplicateCandidateIds.length) {
    article.append(element(
      "p",
      "duplicate-warning",
      `비슷한 기존 항목 ${card.duplicateCandidateIds.length}개가 있습니다. 승인할 때 직접 확인해야 합니다.`
    ));
  }

  if (!isVerified(card)) {
    const form = element("form", "approval-form");
    const label = element("label", "field field-full");
    label.append(element("span", "", "교정한 학습본 (선택)"));
    const textarea = document.createElement("textarea");
    textarea.name = "learnedText";
    textarea.rows = 2;
    textarea.value = card.learnedText || "";
      textarea.placeholder = "원문을 그대로 승인하면 비워 두기";
      label.append(textarea);
      form.append(label);

      let pronunciationInput = null;
      if (card.language === "Chinese") {
        const pronunciationLabel = element("label", "field field-full");
        const pronunciationTitle = element("span", "", "병음 ");
        pronunciationTitle.append(element("b", "", "*"));
        pronunciationLabel.append(pronunciationTitle);
        pronunciationInput = document.createElement("input");
        pronunciationInput.name = "pronunciation";
        pronunciationInput.type = "text";
        pronunciationInput.autocomplete = "off";
        pronunciationInput.required = true;
        pronunciationInput.value = card.pronunciation || "";
        pronunciationLabel.append(pronunciationInput);
        form.append(pronunciationLabel);
      }

      const approveButton = button("검수 완료하고 복습 시작", "primary-button");
      approveButton.type = "submit";
      form.append(approveButton);
      const duplicatePanel = element("div", "inbox-duplicate-panel");
      duplicatePanel.hidden = true;
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        approveCard(
          card,
          textarea.value.trim(),
          pronunciationInput?.value.trim() || card.pronunciation || "",
          approveButton,
          duplicatePanel
        );
      });
      article.append(form, duplicatePanel);
    }
    return article;
  }

async function approveCard(card, learnedText, pronunciation, trigger, duplicatePanel, { force = false } = {}) {
    if (!card.id) return;
    setButtonBusy(trigger, true, "승인 중…");
    const payload = {
      action: "approve",
      cardId: card.id,
      learnedText,
      pronunciation,
    };
    if (force) payload.force = true;
    try {
      await api("/api/cards", { method: "POST", body: JSON.stringify(payload) });
      clearInboxDuplicatePanel(duplicatePanel);
      showToast("검수를 마쳤습니다. 오늘 복습과 다음 일정에 반영됩니다.");
      await loadState();
    } catch (error) {
      const duplicates = Array.isArray(error.details?.duplicates) ? error.details.duplicates : [];
      if (error.status === 409 && duplicates.length) {
        renderInboxApprovalDuplicates(card, duplicates, { learnedText, pronunciation }, duplicatePanel);
      }
      showToast(friendlyError(error));
    } finally {
      setButtonBusy(trigger, false);
    }
  }

function renderInboxApprovalDuplicates(candidate, duplicates, approvalValues, duplicatePanel) {
  duplicatePanel.replaceChildren();
  duplicatePanel.hidden = false;
  duplicatePanel.append(
    element("h3", "", "비슷한 기존 항목을 확인하세요"),
    element("p", "supporting-copy", "자동으로 합치지 않습니다. 같은 표현인지 직접 고른 뒤 진행하세요.")
  );

  const list = element("div", "inbox-duplicate-list");
  duplicates.forEach((item) => {
    const chosen = normalizeCard(item);
    if (!chosen.id || chosen.id === candidate.id) return;
    const row = element("div", "inbox-duplicate-item");
    row.append(
      element("strong", "", chosen.intentKo || "상황 설명 없음"),
      element("p", "target-text", displayExpression(chosen) || "학습 표현 없음")
    );
    const mergeButton = button("기존 항목에 합치기", "secondary-button");
    mergeButton.addEventListener("click", () => resolveInboxDuplicate(candidate, chosen, mergeButton, duplicatePanel));
    row.append(mergeButton);
    list.append(row);
  });
  duplicatePanel.append(list);

  const forceButton = button("다른 상황으로 별도 승인", "primary-button");
  forceButton.addEventListener("click", () => approveCard(
    candidate,
    approvalValues.learnedText,
    approvalValues.pronunciation,
    forceButton,
    duplicatePanel,
    { force: true }
  ));
  duplicatePanel.append(forceButton);
  duplicatePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function resolveInboxDuplicate(candidate, chosen, trigger, duplicatePanel) {
  if (!candidate.id || !chosen.id || candidate.id === chosen.id) return;
  setButtonBusy(trigger, true, "합치는 중…");
  try {
    await api("/api/cards", {
      method: "POST",
      body: JSON.stringify({
        action: "resolve-duplicate",
        cardId: candidate.id,
        mergeIntoId: chosen.id,
      }),
    });
    clearInboxDuplicatePanel(duplicatePanel);
    showToast("기존 항목에 합쳤습니다.");
    await loadState();
  } catch (error) {
    showToast(friendlyError(error));
  } finally {
    setButtonBusy(trigger, false);
  }
}

function clearInboxDuplicatePanel(duplicatePanel) {
  if (!duplicatePanel) return;
  duplicatePanel.closest(".inbox-card")?.querySelector(".duplicate-warning")?.remove();
  duplicatePanel.replaceChildren();
  duplicatePanel.hidden = true;
}

function renderMap() {
  const stats = appState.server?.stats || {};
  const mapRows = Array.isArray(stats.map) ? stats.map : [];
  const totals = mapRows.reduce((sum, row) => ({
    active: sum.active + safeCount(row.active),
    learned: sum.learned + safeCount(row.learned),
    used: sum.used + safeCount(row.used),
  }), { active: 0, learned: 0, used: 0 });

  dom.mapStats.replaceChildren(
    statCard(stats.active ?? totals.active, "활성"),
    statCard(stats.learned ?? totals.learned, "익힘"),
    statCard(stats.used ?? totals.used, "실사용")
  );
  dom.mapTableWrap.replaceChildren();
  if (!mapRows.length) {
    dom.mapTableWrap.append(emptyState("아직 지도가 비었습니다", "승인한 표현과 실제 사용 기록이 쌓이면 자동으로 채워집니다."));
    return;
  }

  const scenes = unique(mapRows.map((row) => row.scene || "미분류"));
  const purposes = unique(mapRows.map((row) => row.purpose || "미분류"));
  const table = element("table", "map-table");
  const caption = document.createElement("caption");
  caption.className = "visually-hidden";
  caption.textContent = "생활 영역과 말의 목적별 활성, 익힘, 실사용 수";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.append(element("th", "", "생활 영역 · 목적"));
  purposes.forEach((purpose) => headRow.append(element("th", "", purpose)));
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  scenes.forEach((scene) => {
    const rowElement = document.createElement("tr");
    rowElement.append(element("th", "", scene));
    purposes.forEach((purpose) => {
      const value = mapRows.find((row) => (row.scene || "미분류") === scene && (row.purpose || "미분류") === purpose);
      const cell = document.createElement("td");
      if (value) {
        const grid = element("div", "map-cell");
        grid.append(
          metricCell(value.active, "활성"),
          metricCell(value.learned, "익힘"),
          metricCell(value.used, "사용")
        );
        cell.append(grid);
      } else {
        cell.textContent = "—";
      }
      rowElement.append(cell);
    });
    tbody.append(rowElement);
  });
  table.append(caption, thead, tbody);
  dom.mapTableWrap.append(table);
}

function navigate(name) {
  dom.screens.forEach((screen) => {
    const active = screen.dataset.screen === name;
    screen.hidden = !active;
    screen.classList.toggle("is-active", active);
  });
  dom.navButtons.forEach((buttonElement) => {
    const active = buttonElement.dataset.nav === name;
    buttonElement.classList.toggle("is-active", active);
    if (active) buttonElement.setAttribute("aria-current", "page");
    else buttonElement.removeAttribute("aria-current");
  });
  document.querySelector("#main")?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function applyInitialScreenFromQuery() {
  const requested = new URLSearchParams(window.location.search).get("screen");
  const validScreens = new Set(["search", "review", "discover", "inbox", "map"]);
  if (validScreens.has(requested)) navigate(requested);
}

function openUseDialog(card, { recordPlan = true, openReflect = false } = {}) {
  const normalized = normalizeCard(card);
  if (!isVerified(normalized)) {
    showToast("검수 완료 전에는 지금 쓰기를 열 수 없습니다.");
    navigate("inbox");
    return;
  }
  appState.activeUseCard = normalized;
  const expression = displayExpression(appState.activeUseCard);
  dom.useLanguage.textContent = languageLabel(appState.activeUseCard.language);
  dom.useTitle.textContent = expression || "학습 표현 없음";
  dom.usePronunciation.textContent = appState.activeUseCard.pronunciation || "";
  dom.usePronunciation.hidden = appState.activeUseCard.language !== "Chinese" || !appState.activeUseCard.pronunciation;
  dom.reflectForm.hidden = !openReflect;
  dom.reflectForm.reset();
  dom.reflectToggle.setAttribute("aria-expanded", String(openReflect));
  if (typeof dom.useDialog.showModal === "function") dom.useDialog.showModal();
  else dom.useDialog.setAttribute("open", "");
  document.body.style.overflow = "hidden";
  if (recordPlan) planUse(appState.activeUseCard);
  if (openReflect) {
    window.requestAnimationFrame(() => dom.reflectForm.elements.delivery?.focus());
  }
}

async function planUse(card) {
  if (!card.id) return;
  try {
    await api("/api/use", {
      method: "POST",
      body: JSON.stringify({ cardId: card.id, action: "plan" }),
    });
    await loadState();
  } catch (error) {
    showToast(`표현은 열었지만 복기 예약을 저장하지 못했습니다. ${friendlyError(error)}`);
  }
}

function closeUseDialog() {
  window.speechSynthesis?.cancel();
  if (typeof dom.useDialog.close === "function" && dom.useDialog.open) dom.useDialog.close();
  else dom.useDialog.removeAttribute("open");
  document.body.style.overflow = "";
  appState.activeUseCard = null;
}

function toggleReflectForm() {
  const willOpen = dom.reflectForm.hidden;
  dom.reflectForm.hidden = !willOpen;
  dom.reflectToggle.setAttribute("aria-expanded", String(willOpen));
  if (willOpen) dom.reflectForm.elements.delivery.focus();
}

async function onReflectSubmit(event) {
  event.preventDefault();
  const card = appState.activeUseCard;
  if (!card?.id || !dom.reflectForm.reportValidity()) return;
  const formData = new FormData(dom.reflectForm);
  const understoodValue = String(formData.get("understood") || "");
  const payload = {
    cardId: card.id,
    action: "reflect",
    delivery: String(formData.get("delivery")),
    understood: understoodValue || null,
    note: String(formData.get("note") || "").trim(),
  };
  const submit = dom.reflectForm.querySelector("button[type='submit']");
  setButtonBusy(submit, true, "저장 중…");
  try {
    await api("/api/use", { method: "POST", body: JSON.stringify(payload) });
    showToast("실제 사용 결과를 저장했습니다.");
    closeUseDialog();
    await loadState();
  } catch (error) {
    showToast(friendlyError(error));
    setButtonBusy(submit, false);
  }
}

async function copyActiveExpression() {
  const text = displayExpression(appState.activeUseCard);
  if (!text) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.append(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }
    showToast("표현을 복사했습니다.");
  } catch {
    showToast("복사하지 못했습니다. 문장을 길게 눌러 복사해 주세요.");
  }
}

function speakCard(card) {
  const text = displayExpression(card);
  if (!text || !("speechSynthesis" in window)) {
    showToast("이 브라우저에서는 음성 재생을 지원하지 않습니다.");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = card?.language === "Chinese" ? "zh-CN" : "en-US";
  utterance.rate = .9;
  window.speechSynthesis.speak(utterance);
}

function appendCardDetails(container, card, options = {}) {
  if (options.includeTarget) {
    container.append(element("p", "target-text", displayExpression(card) || "학습 표현 없음"));
    if (card.language === "Chinese" && card.pronunciation) {
      container.append(element("p", "pronunciation-text", card.pronunciation));
    }
  }
  appendSourceAndLearningBlocks(container, card);
  if (options.includeStatus) {
    const block = element("div", "status-block");
    block.append(
      element("span", "detail-label", "검수·학습 상태"),
      element("p", "raw-text", `${verificationLabel(card.verification)} · ${lifecycleLabel(card.lifecycle)}`)
    );
    container.append(block);
  }
}

function appendSourceAndLearningBlocks(container, card) {
  appendSourceBlock(container, card);
  const learned = card.learnedText;
  if (learned) {
    const block = element("div", "learned-block");
    block.append(
      element("span", "detail-label", "검수 학습본"),
      element("p", "learned-text", learned)
    );
    container.append(block);
  }
}

function appendSourceBlock(container, card, { includeRaw = true } = {}) {
    const source = sourceObject(card);
    const rawText = sourceRawText(card);
    if (!rawText && !source.pageTitle && !source.path && !source.pageUrl && !source.originalUrl) return;
    const block = element("div", "source-block");
  block.append(element(
    "span",
    "detail-label",
    APP_IS_DEMO ? (includeRaw ? "합성 노트 원문" : "합성 노트 출처") : (includeRaw ? "실제 Notion 원문" : "Notion 출처")
  ));
  if (includeRaw && rawText) block.append(element("p", "raw-text", rawText));
  const pathLabel = Array.isArray(source.path) ? source.path.filter(Boolean).join(" › ") : source.path;
  const sourceName = [pathLabel, source.pageTitle].filter(Boolean).join(" · ");
  if (sourceName) block.append(element("p", "inline-status", sourceName));
    const originalUrl = validHttpUrl(source.originalUrl) ? source.originalUrl : "";
    const pageUrl = validHttpUrl(source.pageUrl) ? source.pageUrl : "";
    if (originalUrl) {
      block.append(sourceLink(originalUrl, APP_IS_DEMO ? "합성 원본 보기" : "원본 Notion 페이지 열기"));
      if (pageUrl && !sameUrl(pageUrl, originalUrl)) {
        block.append(sourceLink(pageUrl, APP_IS_DEMO ? "합성 받은함 항목 보기" : "받은함 항목 열기"));
      }
    } else if (pageUrl) {
      block.append(sourceLink(pageUrl, APP_IS_DEMO ? "합성 노트 출처 보기" : "Notion 출처 페이지 열기"));
    }
    container.append(block);
  }

function sourceLink(url, label) {
  const link = element("a", "source-link", label);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function sameUrl(left, right) {
  try {
    return new URL(left).href === new URL(right).href;
  } catch {
    return left === right;
  }
}

function normalizeCard(value) {
  const card = value?.card && typeof value.card === "object" ? value.card : value;
  return card && typeof card === "object" ? card : {};
}

function sourceObject(card) {
  if (card?.source && typeof card.source === "object") return card.source;
  if (card?.notionSource && typeof card.notionSource === "object") return card.notionSource;
  return {};
}

function sourceRawText(card) {
  const source = sourceObject(card);
  return String(source.rawText || card?.rawText || "").trim();
}

function displayExpression(card) {
  return String(card?.learnedText || card?.targetText || "").trim();
}

function cardPayloadFromCard(card, overrides = {}) {
  return {
    action: overrides.action || "check",
    language: card.language || "English",
    intentKo: card.intentKo || "",
    targetText: card.targetText || displayExpression(card),
    pronunciation: card.pronunciation || "",
    kind: card.kind || "expression",
    scene: card.scene || "",
    counterpart: card.counterpart || "",
    purpose: card.purpose || "",
    habitualText: card.habitualText || "",
    note: card.note || "",
    alias: overrides.alias || "",
    ...(overrides.mergeIntoId ? { mergeIntoId: overrides.mergeIntoId } : {}),
  };
}

function statusChip(card) {
  const label = `${verificationLabel(card.verification)} · ${lifecycleLabel(card.lifecycle)}`;
  const chip = element("span", `status-chip ${statusClass(card)}`, label);
  return chip;
}

function statusClass(card) {
  const verification = String(card?.verification || "").toLowerCase();
  const lifecycle = String(card?.lifecycle || "").toLowerCase();
  if (verification.includes("change") || verification.includes("review") || lifecycle.includes("review")) return "status-changed";
  if (verification === "verified" || verification === "approved") return "status-verified";
  if (lifecycle === "learning" || card?.active) return "status-learning";
  return "status-pending";
}

function verificationLabel(value) {
  const labels = {
    verified: "검수 완료",
    approved: "검수 완료",
    "notion-original": APP_IS_DEMO ? "합성 노트 원문" : "노션 원문",
    pending: "미검수",
    candidate: "미검수",
    "needs-review": "재검수 필요",
    "source-changed": "원문 변경",
  };
  return labels[value] || (value ? String(value) : "검수 상태 없음");
}

function lifecycleLabel(value) {
  const labels = {
    candidate: "후보",
    learning: "학습 중",
    archive: "검색 보관함",
    archived: "보관함",
    retired: "은퇴",
    snoozed: "미루기 중",
    "sync-pending": APP_IS_DEMO ? "데모 저장 대기" : "노션 동기화 대기",
  };
  return labels[value] || (value ? String(value) : "학습 상태 없음");
}

function syncStatusText(card) {
  if (APP_IS_DEMO) return "이 브라우저에 저장된 데모 기록";
  if (card?.syncStatus) return String(card.syncStatus);
  const notionSync = card?.notionSync;
  if (notionSync && typeof notionSync === "object") {
    const labels = {
      pending: "노션 동기화 대기",
      synced: "노션 받은함 동기화 완료",
      disabled: "노션 쓰기 연결 없음 · 로컬에 안전하게 보관 중",
      error: notionSync.error ? `노션 동기화 실패 · ${notionSync.error}` : "노션 동기화 실패",
    };
    if (labels[notionSync.status]) return labels[notionSync.status];
  }
  if (card?.lifecycle === "sync-pending") return "노션 동기화 대기";
  const source = sourceObject(card);
  if (source.lastSyncedAt) return `마지막 노션 동기화 ${formatDateTime(source.lastSyncedAt)}`;
  return "";
}

function isVerified(card) {
  return ["verified", "approved"].includes(String(card?.verification || "").toLowerCase());
}

function languageLabel(language) {
  if (language === "Chinese") return "中文 · zh-CN";
  if (language === "English") return "English · en-US";
  return "전체 언어";
}

function matchedFieldLabel(field) {
  const labels = {
    intentKo: "한국어 상황",
    aliases: "검색 별칭",
    targetText: "학습 표현",
    learnedText: "검수 학습본",
    source: APP_IS_DEMO ? "합성 노트 원문" : "Notion 원문",
    scene: "장면",
    purpose: "말의 목적",
  };
  return labels[field] || String(field);
}

function friendlyError(error) {
  if (error instanceof ApiError) return error.message;
  return "알 수 없는 오류가 생겼습니다.";
}

function createCardShell(className) {
  return element("article", className);
}

function emptyState(title, description) {
  const box = element("div", "empty-state");
  box.append(element("strong", "", title), element("span", "", description));
  return box;
}

function statCard(value, label) {
  const box = element("div", "stat-card");
  box.append(element("span", "stat-value", String(safeCount(value))), element("span", "stat-label", label));
  return box;
}

function metricCell(value, label) {
  const box = element("span", "");
  box.append(document.createTextNode(String(safeCount(value))), element("small", "", label));
  return box;
}

function element(tagName, className = "", text = null) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = String(text);
  return node;
}

function button(label, className) {
  const node = element("button", className, label);
  node.type = "button";
  return node;
}

function setButtonBusy(buttonElement, busy, busyLabel = "처리 중…") {
  if (!buttonElement) return;
  if (busy) {
    buttonElement.dataset.originalLabel = buttonElement.textContent;
    buttonElement.disabled = true;
    buttonElement.textContent = busyLabel;
  } else {
    buttonElement.disabled = false;
    if (buttonElement.dataset.originalLabel) {
      buttonElement.textContent = buttonElement.dataset.originalLabel;
      delete buttonElement.dataset.originalLabel;
    }
  }
}

function showToast(message, action = null) {
  window.clearTimeout(appState.toastTimer);
  dom.toast.replaceChildren(element("span", "toast-message", message));
  if (action && action.label && typeof action.onAction === "function") {
    const actionButton = button(action.label, "toast-action");
    actionButton.addEventListener("click", () => {
      dom.toast.hidden = true;
      action.onAction();
    });
    dom.toast.append(actionButton);
  }
  dom.toast.hidden = false;
  appState.toastTimer = window.setTimeout(() => {
    dom.toast.hidden = true;
  }, action ? 8000 : 4200);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && typeof value === "object" && (value.id || value.card)) return [value];
  return [];
}

function safeCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function unique(values) {
  return Array.from(new Set(values));
}

function validHttpUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDateOnly(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? "");
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(date);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // The app remains usable online if service worker registration is unavailable.
    });
  });
}
