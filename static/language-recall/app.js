"use strict";

const APP_IS_DEMO = true;

const appState = {
  language: "English",
  server: null,
  searchCompleted: false,
  searchQuery: "",
  searchResults: [],
  pendingCardPayload: null,
  activeUseCard: null,
  toastTimer: null,
};

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
  updateNewCardLanguageFields();
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
  dom.newCardSection = document.querySelector("#new-card-section");
  dom.newCardForm = document.querySelector("#new-card-form");
  dom.cardLanguage = document.querySelector("#card-language");
  dom.cardAlias = document.querySelector("#card-alias");
  dom.pronunciationField = document.querySelector("#pronunciation-field");
  dom.duplicatePanel = document.querySelector("#duplicate-panel");
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
  dom.cardLanguage.addEventListener("change", updateNewCardLanguageFields);
  dom.searchForm.addEventListener("submit", onSearch);
  dom.newCardForm.addEventListener("submit", onNewCardSubmit);
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
}

function onLanguageChange() {
  appState.language = dom.languageSelect.value;
  localStorage.setItem("recall-map-language", appState.language);
  appState.searchCompleted = false;
  appState.searchQuery = "";
  appState.searchResults = [];
  dom.searchResults.replaceChildren();
  dom.searchMessage.textContent = "";
  dom.newCardSection.hidden = true;
  dom.duplicatePanel.hidden = true;
  if (appState.language !== "all") dom.cardLanguage.value = appState.language;
  updateNewCardLanguageFields();
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
  dom.inboxList.replaceChildren(emptyState("불러오는 중", "받은함 상태를 확인하고 있습니다."));
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
  dom.inboxList.replaceChildren(emptyState("불러오지 못했습니다", message));
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
  dom.newCardSection.hidden = true;
  dom.duplicatePanel.hidden = true;

  try {
    const params = new URLSearchParams({ q: query, language: appState.language });
    const data = await api(`/api/search?${params.toString()}`);
    appState.searchCompleted = true;
    appState.searchQuery = data.query || query;
    appState.searchResults = Array.isArray(data.results) ? data.results.slice(0, 3) : [];
    renderSearchResults();
    prepareNewCardForm();
    const count = appState.searchResults.length;
    setSearchMessage(
      count
        ? `${APP_IS_DEMO ? "합성 노트 원문" : "기존 원문"} ${count}개를 먼저 확인하세요.`
        : `가까운 ${APP_IS_DEMO ? "합성 노트 원문" : "기존 원문"}을 찾지 못했습니다. 새 후보를 만들 수 있습니다.`
    );
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

  return { label: "받은함에서 검수하기", sendToInbox: false };
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
    showToast("검수 후보를 받은함으로 보냈습니다.");
    await loadState();
    navigate("inbox");
  } catch (error) {
    showToast(friendlyError(error));
  } finally {
    setButtonBusy(trigger, false);
  }
}

function prepareNewCardForm() {
  if (!appState.searchCompleted) return;
  dom.newCardSection.hidden = false;
  dom.duplicatePanel.hidden = true;
  const intentInput = dom.newCardForm.elements.intentKo;
  intentInput.value = appState.searchQuery;
  dom.cardAlias.value = appState.searchQuery;
  if (appState.language !== "all") dom.cardLanguage.value = appState.language;
  updateNewCardLanguageFields();
}

function updateNewCardLanguageFields() {
  const isChinese = dom.cardLanguage.value === "Chinese";
  dom.pronunciationField.hidden = !isChinese;
  dom.newCardForm.elements.pronunciation.required = isChinese;
}

async function onNewCardSubmit(event) {
  event.preventDefault();
  if (!appState.searchCompleted) {
    showToast(`새 표현을 저장하기 전에 ${APP_IS_DEMO ? "합성 노트 원문" : "기존 원문"} 검색을 먼저 해야 합니다.`);
    dom.searchQuery.focus();
    return;
  }
  if (!dom.newCardForm.reportValidity()) return;

  const payload = newCardPayload("check");
  appState.pendingCardPayload = payload;
  const submit = dom.newCardForm.querySelector("button[type='submit']");
  setButtonBusy(submit, true, "중복 확인 중…");
  dom.duplicatePanel.hidden = true;

  try {
    const data = await api("/api/cards", { method: "POST", body: JSON.stringify(payload) });
    if (data?.requiresConfirmation && Array.isArray(data.duplicates) && data.duplicates.length) {
      renderDuplicateChoices(data.duplicates);
    } else {
      onCandidateSaved(data);
    }
  } catch (error) {
    const duplicates = Array.isArray(error.details?.duplicates) ? error.details.duplicates : [];
    if (error.status === 409 && duplicates.length) {
      renderDuplicateChoices(duplicates);
    } else {
      showToast(friendlyError(error));
    }
  } finally {
    setButtonBusy(submit, false);
  }
}

function newCardPayload(action) {
  const data = new FormData(dom.newCardForm);
  return {
    action,
    language: String(data.get("language") || ""),
    intentKo: String(data.get("intentKo") || "").trim(),
    targetText: String(data.get("targetText") || "").trim(),
    pronunciation: String(data.get("pronunciation") || "").trim(),
    kind: String(data.get("kind") || "expression"),
    scene: String(data.get("scene") || "").trim(),
    counterpart: String(data.get("counterpart") || "").trim(),
    purpose: String(data.get("purpose") || "").trim(),
    habitualText: String(data.get("habitualText") || "").trim(),
    note: String(data.get("note") || "").trim(),
    alias: String(data.get("alias") || appState.searchQuery).trim(),
  };
}

function renderDuplicateChoices(duplicates) {
  dom.duplicatePanel.replaceChildren();
  dom.duplicatePanel.hidden = false;
  dom.duplicatePanel.append(
    element("h3", "", "비슷한 기존 항목이 있습니다"),
    element("p", "supporting-copy", "자동으로 합치지 않습니다. 기존 항목에 이번 검색 별칭을 붙이거나, 다른 상황이면 새 후보로 저장하세요.")
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
    mergeButton.addEventListener("click", () => resolveDuplicate("merge", card, mergeButton));
    row.append(mergeButton);
    list.append(row);
  });
  const forceButton = button("그래도 새 후보로 저장", "primary-button");
  forceButton.addEventListener("click", () => resolveDuplicate("force", null, forceButton));
  dom.duplicatePanel.append(list, forceButton);
  dom.duplicatePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function resolveDuplicate(action, card, trigger) {
  if (!appState.pendingCardPayload) return;
  const payload = { ...appState.pendingCardPayload, action };
  if (action === "merge") payload.mergeIntoId = card.id;
  setButtonBusy(trigger, true, "저장 중…");
  try {
    const data = await api("/api/cards", { method: "POST", body: JSON.stringify(payload) });
    onCandidateSaved(data, action === "merge");
  } catch (error) {
    showToast(friendlyError(error));
  } finally {
    setButtonBusy(trigger, false);
  }
}

function onCandidateSaved(data, merged = false) {
  showToast(merged ? "기존 항목에 검색 별칭을 추가했습니다." : "새 후보를 받은함에 저장했습니다.");
  dom.duplicatePanel.hidden = true;
  appState.pendingCardPayload = null;
  if (!merged) {
    dom.newCardForm.reset();
    if (appState.language !== "all") dom.cardLanguage.value = appState.language;
    updateNewCardLanguageFields();
  }
  loadState().then(() => navigate(merged ? "search" : "inbox"));
  return data;
}

function renderReview() {
  renderPendingUses();
  const queue = asArray(appState.server?.queue);
  const stats = appState.server?.stats || {};
  const cap = 5;
  const interactionCap = 7;
  dom.reviewSummary.textContent = queue.length
    ? `${queue.length}개가 준비됐습니다. 언어별 하루 ${cap}개, 실패 재시도까지 최대 ${interactionCap}개입니다.`
    : "오늘 꺼내 말할 항목이 없습니다.";
  dom.reviewStage.replaceChildren();
  if (!queue.length) {
    dom.reviewStage.append(emptyState("오늘 복습을 마쳤습니다", safeCount(stats.nextDue) ? `다음 예정 ${safeCount(stats.nextDue)}개가 있습니다.` : "검색하거나 실제로 쓴 표현부터 다시 보게 됩니다."));
    return;
  }
  dom.reviewStage.append(buildReviewCard(queue[0], queue.length));
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
  if (!items.length) {
    dom.inboxList.append(emptyState("받은함이 비었습니다", "새 후보와 재검수 항목이 생기면 여기에 표시됩니다."));
    return;
  }
  items.forEach((item) => dom.inboxList.append(buildInboxCard(item)));
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

function showToast(message) {
  window.clearTimeout(appState.toastTimer);
  dom.toast.textContent = message;
  dom.toast.hidden = false;
  appState.toastTimer = window.setTimeout(() => {
    dom.toast.hidden = true;
  }, 4200);
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

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // The app remains usable online if service worker registration is unavailable.
    });
  });
}
