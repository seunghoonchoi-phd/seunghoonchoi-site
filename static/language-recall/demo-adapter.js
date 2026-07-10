"use strict";

(() => {
  const STATE_KEY = "language-recall-demo-state-v1";
  const PRIVATE_URL_KEY = "language-recall-private-app-url-v1";
  const LIMITS = Object.freeze({ active: 200, dailyQueue: 5, discovery: 1, interactions: 7, perSourcePage: 2 });
  const DAY_MS = 24 * 60 * 60 * 1000;
  const nativeFetch = typeof window.fetch === "function" ? window.fetch.bind(window) : null;
  let memoryState = null;

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function sourceOnly(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      pageTitle: String(source.pageTitle || ""),
      path: Array.isArray(source.path)
        ? source.path.map((part) => String(part)).filter(Boolean)
        : String(source.path || ""),
      rawText: String(source.rawText || ""),
    };
  }

  function publicCard(value) {
    const card = value && typeof value === "object" && !Array.isArray(value) ? clone(value) : {};
    card.source = sourceOnly(card.source);
    delete card.notionSource;
    delete card.pageUrl;
    delete card.originalUrl;
    delete card.url;
    delete card.sourceId;
    delete card.pageId;
    return card;
  }

  function freshState() {
    const seed = clone(window.RecallDemoSeed);
    if (!seed || !Array.isArray(seed.cards) || !seed.reviews) {
      throw new Error("합성 데모 데이터를 불러오지 못했습니다.");
    }
    return {
      schemaVersion: Number(seed.schemaVersion) || 1,
      cards: seed.cards.map(publicCard),
      reviews: clone(seed.reviews),
      pendingUses: Array.isArray(seed.pendingUses) ? clone(seed.pendingUses) : [],
      useHistory: [],
      nextCardNumber: Number(seed.nextCardNumber) || 1,
      lastSyncAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  function usableState(value) {
    const seedVersion = Number(window.RecallDemoSeed?.schemaVersion) || 1;
    return Boolean(
      value
      && typeof value === "object"
      && Number(value.schemaVersion) === seedVersion
      && Array.isArray(value.cards)
      && value.reviews
      && typeof value.reviews === "object"
      && !Array.isArray(value.reviews)
    );
  }

  function readState() {
    if (memoryState) return memoryState;
    let stored = null;
    try {
      const raw = window.localStorage.getItem(STATE_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch {
      stored = null;
    }

    memoryState = usableState(stored) ? stored : freshState();
    memoryState.cards = memoryState.cards.map(publicCard);
    memoryState.pendingUses = Array.isArray(memoryState.pendingUses) ? memoryState.pendingUses : [];
    memoryState.useHistory = Array.isArray(memoryState.useHistory) ? memoryState.useHistory : [];
    memoryState.nextCardNumber = Math.max(1, Number(memoryState.nextCardNumber) || 1);
    if (!usableState(stored)) writeState(memoryState);
    return memoryState;
  }

  function writeState(state) {
    state.updatedAt = nowIso();
    memoryState = state;
    try {
      window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      // The runtime copy remains usable when persistent browser storage is unavailable.
    }
    return state;
  }

  function removeState() {
    memoryState = null;
    try {
      window.localStorage.removeItem(STATE_KEY);
    } catch {
      // There is no persistent demo state to remove in this browser context.
    }
  }

  function success(data, status = 200) {
    return new Response(JSON.stringify({ ok: true, data }), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  function failure(code, message, status = 400, details = {}) {
    return new Response(JSON.stringify({
      ok: false,
      error: { code, message, ...details },
    }), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  function normalizedLanguage(value) {
    return ["English", "Chinese", "all"].includes(value) ? value : "English";
  }

  function languageMatches(card, language) {
    return language === "all" || card.language === language;
  }

  function isVerified(card) {
    return ["verified", "approved"].includes(String(card?.verification || "").toLowerCase());
  }

  function isActive(card) {
    return isVerified(card) && card.active !== false && card.lifecycle === "learning";
  }

  function countActive(cards, language) {
    return cards.filter((card) => card.language === language && isActive(card)).length;
  }

  function findCard(state, cardId) {
    return state.cards.find((card) => card.id === cardId) || null;
  }

  function cleanText(value) {
    return String(value || "").trim();
  }

  function normalizeText(value) {
    return cleanText(value)
      .normalize("NFKC")
      .toLocaleLowerCase()
      .replace(/[\p{P}\p{S}\s]+/gu, "");
  }

  function uniqueText(values) {
    const result = [];
    const seen = new Set();
    values.forEach((value) => {
      const text = cleanText(value);
      const key = normalizeText(text);
      if (!text || !key || seen.has(key)) return;
      seen.add(key);
      result.push(text);
    });
    return result;
  }

  function pairs(value) {
    const text = normalizeText(value);
    if (!text) return [];
    if (text.length === 1) return [text];
    const result = [];
    for (let index = 0; index < text.length - 1; index += 1) {
      result.push(text.slice(index, index + 2));
    }
    return result;
  }

  function similarity(left, right) {
    const a = normalizeText(left);
    const b = normalizeText(right);
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) {
      return Math.min(0.98, 0.82 + (0.16 * Math.min(a.length, b.length) / Math.max(a.length, b.length)));
    }

    const leftPairs = pairs(a);
    const rightPairs = pairs(b);
    const counts = new Map();
    leftPairs.forEach((part) => counts.set(part, (counts.get(part) || 0) + 1));
    let overlap = 0;
    rightPairs.forEach((part) => {
      const remaining = counts.get(part) || 0;
      if (remaining > 0) {
        overlap += 1;
        counts.set(part, remaining - 1);
      }
    });
    return (2 * overlap) / Math.max(1, leftPairs.length + rightPairs.length);
  }

  function searchScore(card, query) {
    const fields = [
      ["intentKo", card.intentKo, 1],
      ["aliases", (card.aliases || []).join(" "), 0.96],
      ["targetText", card.targetText, 0.9],
      ["learnedText", card.learnedText, 0.9],
      ["source", card.source?.rawText, 0.78],
      ["scene", card.scene, 0.66],
      ["purpose", card.purpose, 0.66],
    ];
    const measured = fields.map(([field, text, weight]) => ({
      field,
      score: similarity(query, text) * weight,
    }));
    const score = Math.max(0, ...measured.map((item) => item.score));
    return {
      score,
      matchedFields: measured
        .filter((item) => item.score >= Math.max(0.22, score * 0.72))
        .sort((left, right) => right.score - left.score)
        .map((item) => item.field),
    };
  }

  function duplicateRows(state, candidate, excludeId = "") {
    const candidateAliases = Array.isArray(candidate.aliases)
      ? candidate.aliases
      : [candidate.alias];
    return state.cards
      .filter((card) => card.id !== excludeId && card.language === candidate.language && card.lifecycle !== "retired")
      .map((card) => {
        const target = similarity(candidate.targetText, card.learnedText || card.targetText);
        const intent = similarity(candidate.intentKo, card.intentKo);
        const alias = Math.max(
          0,
          ...candidateAliases.map((left) => Math.max(
            similarity(left, card.intentKo),
            ...(card.aliases || []).map((right) => similarity(left, right))
          ))
        );
        const score = Math.max(target, intent * 0.96, alias * 0.92, ((target + intent) / 2) * 0.98);
        return {
          card: publicCard(card),
          score: Math.round(score * 100) / 100,
          level: score >= 0.9 ? "strong" : "possible",
        };
      })
      .filter((item) => item.score >= 0.72)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);
  }

  function reviewDue(review, instant = Date.now()) {
    if (!review) return false;
    const dueAt = new Date(review.dueAt || 0).getTime();
    const snoozedUntil = review.snoozedUntil ? new Date(review.snoozedUntil).getTime() : 0;
    return Number.isFinite(dueAt) && dueAt <= instant && (!snoozedUntil || snoozedUntil <= instant);
  }

  function buildMapRows(cards, reviews) {
    const rows = new Map();
    cards.filter((card) => isVerified(card)).forEach((card) => {
      const review = reviews[card.id] || {};
      const active = isActive(card) ? 1 : 0;
      const learned = Number(review.step) >= 6 && Number(review.successfulUses) >= 2 ? 1 : 0;
      const used = Number(card.actualUseCount) > 0 ? 1 : 0;
      if (!active && !learned && !used) return;
      const scene = cleanText(card.scene) || "미분류";
      const purpose = cleanText(card.purpose) || "미분류";
      const key = `${scene}\u0000${purpose}`;
      const row = rows.get(key) || { scene, purpose, active: 0, learned: 0, used: 0 };
      row.active += active;
      row.learned += learned;
      row.used += used;
      rows.set(key, row);
    });
    return Array.from(rows.values()).sort((left, right) => (
      left.scene.localeCompare(right.scene, "ko") || left.purpose.localeCompare(right.purpose, "ko")
    ));
  }

  function statePayload(state, language) {
    const instant = Date.now();
    const cards = state.cards.filter((card) => languageMatches(card, language));
    const dueItems = cards
      .filter(isActive)
      .map((card) => ({ card: publicCard(card), review: clone(state.reviews[card.id]) }))
      .filter((item) => reviewDue(item.review, instant))
      .sort((left, right) => new Date(left.review.dueAt) - new Date(right.review.dueAt));

    const discovery = cards
      .filter((card) => ["archive", "archived"].includes(card.lifecycle))
      .filter((card) => !card.discoverAfter || new Date(card.discoverAfter).getTime() <= instant)
      .sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0))
      .slice(0, LIMITS.discovery)
      .map(publicCard);

    const inbox = cards
      .filter((card) => (
        ["candidate", "needs-review", "sync-pending"].includes(card.lifecycle)
        || ["pending", "candidate", "needs-review", "source-changed"].includes(card.verification)
      ))
      .filter((card) => card.lifecycle !== "retired")
      .sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0))
      .map(publicCard);

    const pendingUses = state.pendingUses
      .map((item) => ({ ...item, card: findCard(state, item.cardId) }))
      .filter((item) => item.card && isVerified(item.card) && languageMatches(item.card, language))
      .sort((left, right) => new Date(right.plannedAt) - new Date(left.plannedAt))
      .slice(0, 3)
      .map((item) => ({ card: publicCard(item.card), plannedAt: item.plannedAt }));

    const collection = cards
      .filter((card) => card.lifecycle !== "retired")
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .map((card) => ({ card: publicCard(card), review: clone(state.reviews[card.id]) || null }));

    const upcoming = cards
      .filter((card) => {
        const review = state.reviews[card.id];
        return isActive(card) && review && !reviewDue(review, instant);
      })
      .map((card) => ({ card: publicCard(card), review: clone(state.reviews[card.id]) }))
      .sort((left, right) => new Date(left.review.dueAt) - new Date(right.review.dueAt))
      .slice(0, 30);

    const map = buildMapRows(cards, state.reviews);
    const active = cards.filter(isActive).length;
    const learned = cards.filter((card) => {
      const review = state.reviews[card.id] || {};
      return isVerified(card) && Number(review.step) >= 6 && Number(review.successfulUses) >= 2;
    }).length;
    const used = cards.filter((card) => isVerified(card) && Number(card.actualUseCount) > 0).length;
    const nextDue = cards.filter((card) => {
      const review = state.reviews[card.id];
      return isActive(card) && review && !reviewDue(review, instant);
    }).length;

    return {
      queue: dueItems.slice(0, LIMITS.dailyQueue),
      discovery,
      inbox,
      pendingUses,
      collection,
      upcoming,
      stats: {
        total: cards.filter((card) => card.lifecycle !== "retired").length,
        active,
        due: dueItems.length,
        nextDue,
        learned,
        used,
        map,
      },
      sync: {
        notion: {
          status: "synced",
          lastSuccessAt: state.lastSyncAt || state.updatedAt || nowIso(),
          error: null,
        },
      },
      limits: clone(LIMITS),
    };
  }

  function candidateFromBody(state, body, mode = "candidate") {
    const language = body.language === "Chinese" ? "Chinese" : "English";
    const instant = nowIso();
    const id = `demo-added-${state.nextCardNumber}`;
    state.nextCardNumber += 1;
    return publicCard({
      id,
      language,
      intentKo: cleanText(body.intentKo),
      targetText: cleanText(body.targetText),
      learnedText: "",
      pronunciation: cleanText(body.pronunciation),
      kind: cleanText(body.kind) || "expression",
      scene: cleanText(body.scene),
      counterpart: cleanText(body.counterpart),
      purpose: cleanText(body.purpose),
      habitualText: cleanText(body.habitualText),
      note: cleanText(body.note),
      aliases: uniqueText([body.alias, body.intentKo]),
      verification: "candidate",
      lifecycle: "candidate",
      active: false,
      actualUseCount: 0,
      lastUsedAt: null,
      createdAt: instant,
      updatedAt: instant,
      source: {
        pageTitle: mode === "save" ? "이 브라우저에서 바로 저장한 합성 데모 표현" : "이 브라우저에서 추가한 합성 데모 후보",
        path: ["합성 데모 자료", mode === "save" ? "바로 저장" : "직접 추가"],
        rawText: cleanText(body.targetText),
      },
    });
  }

  function validateCandidate(body) {
    if (!["English", "Chinese"].includes(body.language)) return "언어를 선택해 주세요.";
    if (!cleanText(body.intentKo)) return "한국어 상황을 적어 주세요.";
    if (!cleanText(body.targetText)) return "학습 표현을 적어 주세요.";
    if (body.language === "Chinese" && !cleanText(body.pronunciation)) return "중국어는 병음을 함께 적어 주세요.";
    return "";
  }

  function handleCards(state, body) {
    const action = cleanText(body.action) || "check";

    if (action === "save") {
      const validation = validateCandidate(body);
      if (validation) return failure("INVALID_CARD", validation, 400);
      const language = body.language === "Chinese" ? "Chinese" : "English";
      const preview = {
        language,
        intentKo: cleanText(body.intentKo),
        targetText: cleanText(body.targetText),
        aliases: uniqueText([body.alias, body.intentKo]),
      };
      const duplicates = duplicateRows(state, preview);
      if (duplicates.length && body.force !== true) {
        return success({ requiresConfirmation: true, duplicates });
      }
      if (countActive(state.cards, language) >= LIMITS.active) {
        return failure(
          "ACTIVE_LIMIT",
          `언어별 학습 카드 ${LIMITS.active}개 상한에 도달했습니다.`,
          409
        );
      }
      const card = candidateFromBody(state, body, "save");
      card.learnedText = card.targetText;
      card.verification = "verified";
      card.lifecycle = "learning";
      card.active = true;
      state.cards.push(card);
      state.reviews[card.id] = {
        cardId: card.id,
        step: 0,
        reviewCount: 0,
        successfulUses: 0,
        dueAt: nowIso(),
      };
      writeState(state);
      return success({ card: publicCard(card), review: clone(state.reviews[card.id]), duplicates }, 201);
    }

    if (action === "update") {
      const card = findCard(state, cleanText(body.cardId));
      if (!card) return failure("CARD_NOT_FOUND", "수정할 항목을 찾지 못했습니다.", 404);
      if (card.lifecycle === "retired") return failure("CARD_RETIRED", "보관한 항목은 수정할 수 없습니다.", 409);
      const intentKo = cleanText(body.intentKo);
      const targetText = cleanText(body.targetText);
      if (!intentKo) return failure("INVALID_CARD", "한국어 상황을 적어 주세요.", 400);
      if (!targetText) return failure("INVALID_CARD", "학습 표현을 적어 주세요.", 400);
      const pronunciation = cleanText(body.pronunciation !== undefined ? body.pronunciation : card.pronunciation);
      if (card.language === "Chinese" && isVerified(card) && !pronunciation) {
        return failure("PRONUNCIATION_REQUIRED", "중국어는 병음을 함께 적어 주세요.", 400);
      }
      card.intentKo = intentKo;
      card.targetText = targetText;
      card.pronunciation = pronunciation;
      if (body.learnedText !== undefined) card.learnedText = cleanText(body.learnedText);
      if (isVerified(card) && !card.learnedText) card.learnedText = targetText;
      ["kind", "scene", "counterpart", "purpose", "habitualText", "note"].forEach((field) => {
        if (body[field] !== undefined) card[field] = cleanText(body[field]);
      });
      card.aliases = uniqueText([...(card.aliases || []), intentKo]);
      card.updatedAt = nowIso();
      writeState(state);
      return success({ card: publicCard(card), review: clone(state.reviews[card.id]) || null });
    }

    if (action === "retire") {
      const card = findCard(state, cleanText(body.cardId));
      if (!card) return failure("CARD_NOT_FOUND", "보관할 항목을 찾지 못했습니다.", 404);
      if (card.lifecycle === "retired") return failure("CARD_RETIRED", "이미 보관한 항목입니다.", 409);
      card.lifecycle = "retired";
      card.active = false;
      card.updatedAt = nowIso();
      delete state.reviews[card.id];
      state.pendingUses = state.pendingUses.filter((item) => item.cardId !== card.id);
      writeState(state);
      return success({ card: publicCard(card), retired: true });
    }

    if (["check", "force"].includes(action)) {
      const validation = validateCandidate(body);
      if (validation) return failure("INVALID_CARD", validation, 400);
      const preview = {
        language: body.language,
        intentKo: cleanText(body.intentKo),
        targetText: cleanText(body.targetText),
        aliases: uniqueText([body.alias]),
      };
      const duplicates = duplicateRows(state, preview);
      if (action === "check" && duplicates.length) {
        return success({ requiresConfirmation: true, duplicates });
      }
      const card = candidateFromBody(state, body);
      state.cards.push(card);
      writeState(state);
      return success({ card: publicCard(card), duplicates }, 201);
    }

    if (action === "merge") {
      const card = findCard(state, cleanText(body.mergeIntoId));
      if (!card) return failure("CARD_NOT_FOUND", "합칠 기존 항목을 찾지 못했습니다.", 404);
      card.aliases = uniqueText([...(card.aliases || []), body.alias]);
      card.updatedAt = nowIso();
      writeState(state);
      return success({ card: publicCard(card), merged: true });
    }

    if (action === "approve") {
      const card = findCard(state, cleanText(body.cardId));
      if (!card) return failure("CARD_NOT_FOUND", "검수할 항목을 찾지 못했습니다.", 404);
      const pronunciation = cleanText(body.pronunciation || card.pronunciation);
      if (card.language === "Chinese" && !pronunciation) {
        return failure("PRONUNCIATION_REQUIRED", "중국어는 병음을 확인해 주세요.", 400);
      }
      const duplicates = duplicateRows(state, card, card.id);
      if (duplicates.length && body.force !== true) {
        return failure(
          "DUPLICATE_CANDIDATES",
          "비슷한 기존 항목이 있습니다. 합칠지 별도로 승인할지 선택해 주세요.",
          409,
          { duplicates }
        );
      }
      if (!card.active && countActive(state.cards, card.language) >= LIMITS.active) {
        return failure(
          "ACTIVE_LIMIT",
          `언어별 활성 카드 ${LIMITS.active}개 상한에 도달했습니다.`,
          409
        );
      }
      card.learnedText = cleanText(body.learnedText) || card.targetText;
      card.pronunciation = pronunciation;
      card.verification = "verified";
      card.lifecycle = "learning";
      card.active = true;
      card.updatedAt = nowIso();
      delete card.duplicateCandidateIds;
      state.reviews[card.id] = {
        cardId: card.id,
        step: 0,
        reviewCount: 0,
        successfulUses: 0,
        dueAt: nowIso(),
      };
      writeState(state);
      return success({ card: publicCard(card), review: clone(state.reviews[card.id]) });
    }

    if (action === "resolve-duplicate") {
      const candidate = findCard(state, cleanText(body.cardId));
      const target = findCard(state, cleanText(body.mergeIntoId));
      if (!candidate) return failure("CARD_NOT_FOUND", "중복 후보 항목을 찾지 못했습니다.", 404);
      if (!target) return failure("MERGE_TARGET_NOT_FOUND", "합칠 기존 항목을 찾지 못했습니다.", 404);
      if (candidate.id === target.id) return failure("SAME_CARD", "중복 후보와 기존 항목은 서로 달라야 합니다.", 400);
      if (candidate.language !== target.language) {
        return failure("LANGUAGE_MISMATCH", "서로 다른 언어 항목은 합칠 수 없습니다.", 409);
      }
      const isDuplicateCandidate = candidate.duplicatePending === true
        || (["candidate", "inbox"].includes(candidate.lifecycle)
          && ["candidate", "unverified"].includes(candidate.verification));
      if (!isDuplicateCandidate) {
        return failure(
          "CARD_NOT_DUPLICATE_CANDIDATE",
          "중복 확인 대기 중인 받은함 항목만 이 방식으로 합칠 수 있습니다.",
          409
        );
      }
      target.aliases = uniqueText([
        ...(target.aliases || []),
        candidate.intentKo,
        ...(candidate.aliases || []),
      ]);
      target.updatedAt = nowIso();
      candidate.lifecycle = "retired";
      candidate.verification = "retired";
      candidate.active = false;
      candidate.duplicatePending = false;
      candidate.quarantineReason = null;
      candidate.retiredIntoId = target.id;
      candidate.updatedAt = nowIso();
      delete candidate.duplicateCandidateIds;
      delete state.reviews[candidate.id];
      state.pendingUses = state.pendingUses.filter((item) => item.cardId !== candidate.id);
      writeState(state);
      return success({ card: publicCard(target), retiredCard: publicCard(candidate), merged: true });
    }

    return failure("UNKNOWN_CARD_ACTION", "지원하지 않는 카드 작업입니다.", 400);
  }

  function handleReview(state, body) {
    const card = findCard(state, cleanText(body.cardId));
    const rating = cleanText(body.rating);
    if (!card) return failure("CARD_NOT_FOUND", "복습할 항목을 찾지 못했습니다.", 404);
    if (!isActive(card)) {
      return failure("CARD_NOT_REVIEWABLE", "검수 완료된 활성 항목만 복습할 수 있습니다.", 409);
    }
    if (!["again", "hard", "good"].includes(rating)) return failure("INVALID_RATING", "복습 결과를 다시 선택해 주세요.", 400);

    const review = state.reviews[card.id] || {
      cardId: card.id,
      step: 0,
      reviewCount: 0,
      successfulUses: 0,
      dueAt: nowIso(),
    };
    const instant = Date.now();
    const intervals = [1, 3, 7, 14, 30, 60, 120];
    review.reviewCount = Number(review.reviewCount || 0) + 1;
    review.lastReviewedAt = new Date(instant).toISOString();
    review.lastRating = rating;
    delete review.snoozedUntil;

    if (rating === "again") {
      review.step = 0;
      review.dueAt = new Date(instant + (10 * 60 * 1000)).toISOString();
    } else if (rating === "hard") {
      review.step = Math.max(0, Number(review.step) || 0);
      review.dueAt = new Date(instant + DAY_MS).toISOString();
    } else {
      const previousStep = Math.max(0, Number(review.step) || 0);
      review.step = Math.min(previousStep + 1, intervals.length);
      review.dueAt = new Date(instant + (intervals[Math.min(previousStep, intervals.length - 1)] * DAY_MS)).toISOString();
    }

    state.reviews[card.id] = review;
    card.updatedAt = nowIso();
    writeState(state);
    return success({ card: publicCard(card), review: clone(review) });
  }

  function snoozeDate(until) {
    const date = new Date();
    if (until === "tomorrow") {
      date.setDate(date.getDate() + 1);
      date.setHours(9, 0, 0, 0);
      return date;
    }
    if (until === "weekend") {
      const daysUntilSaturday = ((6 - date.getDay() + 7) % 7) || 7;
      date.setDate(date.getDate() + daysUntilSaturday);
      date.setHours(9, 0, 0, 0);
      return date;
    }
    if (until === "7d") {
      date.setDate(date.getDate() + 7);
      date.setHours(9, 0, 0, 0);
      return date;
    }
    return null;
  }

  function handleSnooze(state, body) {
    const card = findCard(state, cleanText(body.cardId));
    const review = card ? state.reviews[card.id] : null;
    const date = snoozeDate(cleanText(body.until));
    if (!card || !review) return failure("CARD_NOT_FOUND", "미룰 복습 항목을 찾지 못했습니다.", 404);
    if (!date) return failure("INVALID_SNOOZE", "미루기 날짜를 다시 선택해 주세요.", 400);
    review.snoozedUntil = date.toISOString();
    card.updatedAt = nowIso();
    writeState(state);
    return success({ cardId: card.id, snoozedUntil: review.snoozedUntil });
  }

  function handleDiscover(state, body) {
    const card = findCard(state, cleanText(body.cardId));
    const decision = cleanText(body.decision);
    if (!card) return failure("CARD_NOT_FOUND", "분류할 원문을 찾지 못했습니다.", 404);
    if (!["soon", "later", "retire", "needs-review"].includes(decision)) {
      return failure("INVALID_DISCOVERY", "원문 분류를 다시 선택해 주세요.", 400);
    }

    if (decision === "soon") {
      card.lifecycle = "candidate";
      card.verification = "candidate";
      card.active = false;
    } else if (decision === "later") {
      card.lifecycle = "archive";
      card.active = false;
      card.discoverAfter = new Date(Date.now() + (30 * DAY_MS)).toISOString();
    } else if (decision === "retire") {
      card.lifecycle = "retired";
      card.active = false;
    } else {
      card.lifecycle = "needs-review";
      card.verification = "needs-review";
      card.active = false;
    }
    card.updatedAt = nowIso();
    writeState(state);
    return success({ card: publicCard(card), decision });
  }

  function handleUse(state, body) {
    const card = findCard(state, cleanText(body.cardId));
    const action = cleanText(body.action);
    if (!card) return failure("CARD_NOT_FOUND", "사용할 항목을 찾지 못했습니다.", 404);
    if (!isActive(card)) {
      return failure("CARD_NOT_USABLE", "검수 완료된 활성 항목만 실제 사용 기록을 남길 수 있습니다.", 409);
    }

    if (action === "plan") {
      state.pendingUses = state.pendingUses.filter((item) => item.cardId !== card.id);
      state.pendingUses.push({ cardId: card.id, plannedAt: nowIso() });
      writeState(state);
      return success({ card: publicCard(card), planned: true });
    }

    if (action === "reflect") {
      const delivery = cleanText(body.delivery);
      if (!["memory", "read", "not-used"].includes(delivery)) {
        return failure("INVALID_REFLECTION", "어떻게 말했는지 다시 선택해 주세요.", 400);
      }
      const reflectedAt = nowIso();
      state.pendingUses = state.pendingUses.filter((item) => item.cardId !== card.id);
      state.useHistory.unshift({
        cardId: card.id,
        reflectedAt,
        delivery,
        understood: body.understood || null,
        note: cleanText(body.note),
      });
      state.useHistory = state.useHistory.slice(0, 30);

      if (delivery !== "not-used") {
        card.actualUseCount = Number(card.actualUseCount || 0) + 1;
        card.lastUsedAt = reflectedAt;
        const review = state.reviews[card.id];
        if (review && delivery === "memory" && body.understood === "yes") {
          review.successfulUses = Number(review.successfulUses || 0) + 1;
        }
      }
      card.updatedAt = reflectedAt;
      writeState(state);
      return success({ card: publicCard(card), review: clone(state.reviews[card.id] || null) });
    }

    return failure("UNKNOWN_USE_ACTION", "지원하지 않는 사용 기록 작업입니다.", 400);
  }

  async function requestBody(input, options) {
    if (typeof options.body === "string") {
      return options.body ? JSON.parse(options.body) : {};
    }
    if (options.body && typeof options.body === "object") return options.body;
    if (typeof Request !== "undefined" && input instanceof Request) {
      const raw = await input.clone().text();
      return raw ? JSON.parse(raw) : {};
    }
    return {};
  }

  async function routeApi(url, method, body) {
    const state = readState();
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (method === "GET" && path === "/api/state") {
      return success(statePayload(state, normalizedLanguage(url.searchParams.get("language"))));
    }

    if (method === "GET" && path === "/api/search") {
      const query = cleanText(url.searchParams.get("q"));
      if (!query) return failure("QUERY_REQUIRED", "찾을 상황이나 표현을 적어 주세요.", 400);
      const language = normalizedLanguage(url.searchParams.get("language"));
      const results = state.cards
        .filter((card) => card.lifecycle !== "retired" && languageMatches(card, language))
        .map((card) => ({ card: publicCard(card), ...searchScore(card, query) }))
        .filter((item) => item.score >= 0.15)
        .sort((left, right) => right.score - left.score)
        .slice(0, 3);
      return success({ query, results });
    }

    if (method === "POST" && path === "/api/cards") return handleCards(state, body);
    if (method === "POST" && path === "/api/review") return handleReview(state, body);
    if (method === "POST" && path === "/api/snooze") return handleSnooze(state, body);
    if (method === "POST" && path === "/api/discover") return handleDiscover(state, body);
    if (method === "POST" && path === "/api/use") return handleUse(state, body);

    if (method === "POST" && path === "/api/sync/notion") {
      state.lastSyncAt = nowIso();
      writeState(state);
      return success({ demo: true, syncedAt: state.lastSyncAt, created: 0, updated: 0 });
    }

    return failure("NOT_FOUND", "이 데모에서 지원하지 않는 요청입니다.", 404);
  }

  async function demoFetch(input, options = {}) {
    let rawUrl = "";
    if (typeof input === "string") rawUrl = input;
    else if (input instanceof URL) rawUrl = input.href;
    else if (input && typeof input.url === "string") rawUrl = input.url;

    let url;
    let pageUrl;
    try {
      pageUrl = new URL(window.location.href);
      url = new URL(rawUrl, pageUrl);
    } catch {
      if (nativeFetch) return nativeFetch(input, options);
      throw new TypeError("요청 주소를 읽을 수 없습니다.");
    }

    const isDemoApi = url.origin === pageUrl.origin && (url.pathname === "/api" || url.pathname.startsWith("/api/"));
    if (!isDemoApi) {
      if (nativeFetch) return nativeFetch(input, options);
      throw new TypeError("브라우저 요청 기능을 사용할 수 없습니다.");
    }

    const method = cleanText(options.method || input?.method || "GET").toUpperCase();
    try {
      const body = ["GET", "HEAD"].includes(method) ? {} : await requestBody(input, options);
      return await routeApi(url, method, body);
    } catch {
      return failure("INVALID_REQUEST", "요청 내용을 읽지 못했습니다.", 400);
    }
  }

  function parsePrivateUrl(value) {
    const raw = cleanText(value);
    if (!raw) return null;
    try {
      const parsed = new URL(raw);
      if (!["http:", "https:"].includes(parsed.protocol)) return null;
      return parsed.href;
    } catch {
      return null;
    }
  }

  function storedPrivateUrl() {
    try {
      const raw = window.localStorage.getItem(PRIVATE_URL_KEY);
      const parsed = parsePrivateUrl(raw);
      if (!parsed && raw) window.localStorage.removeItem(PRIVATE_URL_KEY);
      return parsed;
    } catch {
      return null;
    }
  }

  function refreshPrivateLaunch() {
    const launch = document.querySelector("#private-launch");
    if (!launch) return;
    launch.hidden = !storedPrivateUrl();
    launch.removeAttribute("href");
    launch.removeAttribute("data-url");
  }

  function resetDemo() {
    removeState();
    writeState(freshState());
    return true;
  }

  function setPrivateAppUrl(value) {
    const parsed = parsePrivateUrl(value);
    if (!parsed) throw new TypeError("http 또는 https 주소만 저장할 수 있습니다.");
    window.localStorage.setItem(PRIVATE_URL_KEY, parsed);
    refreshPrivateLaunch();
    return true;
  }

  function clearPrivateAppUrl() {
    window.localStorage.removeItem(PRIVATE_URL_KEY);
    refreshPrivateLaunch();
    return true;
  }

  function openPrivateApp() {
    const target = storedPrivateUrl();
    if (!target) {
      refreshPrivateLaunch();
      return false;
    }
    window.open(target, "_blank", "noopener,noreferrer");
    return true;
  }

  function bindDemoControls() {
    const resetButton = document.querySelector("#demo-reset");
    const configButton = document.querySelector("#private-config");
    const launchButton = document.querySelector("#private-launch");

    resetButton?.addEventListener("click", () => {
      if (!window.confirm("합성 데모에서 바꾼 내용과 복습 기록을 처음 상태로 되돌릴까요?")) return;
      resetDemo();
      window.location.reload();
    });

    configButton?.addEventListener("click", () => {
      const entered = window.prompt("개인 앱 주소를 입력하세요. 비워 두고 확인하면 저장값을 지웁니다.", "");
      if (entered === null) return;
      if (!cleanText(entered)) {
        clearPrivateAppUrl();
        window.alert("저장한 개인 앱 주소를 지웠습니다.");
        return;
      }
      try {
        setPrivateAppUrl(entered);
        window.alert("개인 앱 주소를 이 브라우저에만 저장했습니다.");
      } catch {
        window.alert("http 또는 https로 시작하는 주소를 입력해 주세요.");
      }
    });

    launchButton?.addEventListener("click", (event) => {
      event.preventDefault();
      openPrivateApp();
    });
    refreshPrivateLaunch();
  }

  window.fetch = demoFetch;
  window.RecallDemo = Object.freeze({
    reset: resetDemo,
    setPrivateAppUrl,
    openPrivateApp,
    clearPrivateAppUrl,
    deletePrivateAppUrl: clearPrivateAppUrl,
  });
  document.addEventListener("DOMContentLoaded", bindDemoControls, { once: true });
})();
