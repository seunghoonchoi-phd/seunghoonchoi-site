/* AI 새 모델 체감 테스트 — 전부 클라이언트 사이드, 외부 요청 없음 */
(function () {
  "use strict";

  var SESSIONS_KEY = "avc.sessions.v1";
  var CUSTOM_KEY = "avc.customTests.v1";
  var ACTIVE_KEY = "avc.activeSession.v1";
  var GUIDE_KEY = "avc.guideOpen.v1";

  var DATA = window.AVC_TESTS && typeof window.AVC_TESTS === "object" ? window.AVC_TESTS : {};
  var CATEGORIES = Array.isArray(DATA.categories) ? DATA.categories : [];
  var BUILTIN = Array.isArray(DATA.tests) ? DATA.tests : [];

  var SCORE_WORDS = { 0: "실패", 1: "부분", 2: "통과" };
  var COLOR_A = "#191f28";
  var COLOR_B = "#3182f6";

  /* ── 상태 ─────────────────────────────────── */

  var state = {
    sessions: loadJson(SESSIONS_KEY, []),
    customTests: loadJson(CUSTOM_KEY, []),
    activeSessionId: loadRaw(ACTIVE_KEY),
    filterCat: "all",
    quickOnly: false,
    screen: "sessions"
  };

  if (!Array.isArray(state.sessions)) { state.sessions = []; }
  if (!Array.isArray(state.customTests)) { state.customTests = []; }
  if (state.activeSessionId && !findSession(state.activeSessionId)) {
    state.activeSessionId = null;
  }

  /* ── 저장소 유틸 ───────────────────────────── */

  function loadJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) { return fallback; }
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function loadRaw(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function persist() {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(state.sessions));
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(state.customTests));
      if (state.activeSessionId) {
        localStorage.setItem(ACTIVE_KEY, state.activeSessionId);
      } else {
        localStorage.removeItem(ACTIVE_KEY);
      }
    } catch (e) {
      toast("저장 실패: 브라우저 저장 공간을 확인하세요.");
    }
  }

  function uid(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  /* ── DOM 유틸 (XSS 안전: textContent만 사용) ── */

  function $(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { node.textContent = String(text); }
    return node;
  }

  function clear(node) {
    while (node.firstChild) { node.removeChild(node.firstChild); }
  }

  var toastTimer = null;
  function toast(message) {
    var box = $("toast");
    box.textContent = message;
    box.hidden = false;
    if (toastTimer) { clearTimeout(toastTimer); }
    toastTimer = setTimeout(function () { box.hidden = true; }, 2600);
  }

  /* ── 데이터 헬퍼 ───────────────────────────── */

  function findSession(id) {
    for (var i = 0; i < state.sessions.length; i++) {
      if (state.sessions[i].id === id) { return state.sessions[i]; }
    }
    return null;
  }

  function activeSession() {
    return state.activeSessionId ? findSession(state.activeSessionId) : null;
  }

  function catName(catId) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === catId) { return CATEGORIES[i].ko; }
    }
    return catId;
  }

  function normalizedCustom(t) {
    return {
      id: t.id,
      category: t.category,
      title: t.title,
      quick: false,
      prompt: t.prompt,
      why: t.why || "직접 추가한 사용자 정의 테스트입니다.",
      rubric: null,
      watchFor: Array.isArray(t.watchFor) ? t.watchFor : [],
      custom: true
    };
  }

  function allTests() {
    return BUILTIN.concat(state.customTests.map(normalizedCustom));
  }

  function courseTests() {
    // 현재 코스(빠른 코스 or 전체)의 테스트 — 진행률 계산 기준
    var list = allTests();
    if (state.quickOnly) {
      list = list.filter(function (t) { return t.quick === true; });
    }
    return list;
  }

  function visibleTests() {
    var list = courseTests();
    if (state.filterCat !== "all") {
      list = list.filter(function (t) { return t.category === state.filterCat; });
    }
    return list;
  }

  function getEntry(session, testId) {
    if (!session || !session.scores) { return null; }
    var entry = session.scores[testId];
    if (!entry || typeof entry.score !== "number") { return entry || null; }
    return entry;
  }

  function scoreOf(session, testId) {
    var entry = getEntry(session, testId);
    return entry && typeof entry.score === "number" ? entry.score : null;
  }

  function categoryAverages(session) {
    // 분야별 평균 점수(0~2). 채점 항목이 없는 분야는 null.
    var sums = {}, counts = {};
    var tests = allTests();
    for (var i = 0; i < tests.length; i++) {
      var s = scoreOf(session, tests[i].id);
      if (s === null) { continue; }
      var c = tests[i].category;
      sums[c] = (sums[c] || 0) + s;
      counts[c] = (counts[c] || 0) + 1;
    }
    var result = {};
    for (var j = 0; j < CATEGORIES.length; j++) {
      var id = CATEGORIES[j].id;
      result[id] = counts[id] ? sums[id] / counts[id] : null;
    }
    return result;
  }

  function totals(session) {
    var sum = 0, count = 0;
    var tests = allTests();
    for (var i = 0; i < tests.length; i++) {
      var s = scoreOf(session, tests[i].id);
      if (s === null) { continue; }
      sum += s;
      count += 1;
    }
    return {
      sum: sum,
      scored: count,
      total: tests.length,
      percent: count ? Math.round((sum / (count * 2)) * 1000) / 10 : null
    };
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) { return "-"; }
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  /* ── 화면 전환 ─────────────────────────────── */

  function showScreen(name) {
    state.screen = name;
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) {
      var isTarget = screens[i].getAttribute("data-screen") === name;
      screens[i].hidden = !isTarget;
      screens[i].classList.toggle("is-active", isTarget);
    }
    var navs = document.querySelectorAll(".nav-item");
    for (var j = 0; j < navs.length; j++) {
      var isNav = navs[j].getAttribute("data-nav") === name;
      navs[j].classList.toggle("is-active", isNav);
      if (isNav) {
        navs[j].setAttribute("aria-current", "page");
      } else {
        navs[j].removeAttribute("aria-current");
      }
    }
    if (name === "sessions") { renderSessions(); }
    if (name === "test") { renderTestScreen(); }
    if (name === "results") { renderResults(); }
    if (name === "compare") { renderCompare(); }
    window.scrollTo(0, 0);
  }

  function renderHeaderChip() {
    var chip = $("active-session-chip");
    var s = activeSession();
    if (s) {
      chip.textContent = "세션: " + s.model;
      chip.classList.add("is-active-session");
    } else {
      chip.textContent = "세션 없음";
      chip.classList.remove("is-active-session");
    }
  }

  /* ── 세션 화면 ─────────────────────────────── */

  function renderSessions() {
    renderHeaderChip();
    var list = $("session-list");
    clear(list);
    $("session-count").textContent = state.sessions.length + "개";

    if (state.sessions.length === 0) {
      var empty = el("div", "empty-state");
      empty.appendChild(el("strong", null, "아직 세션이 없습니다"));
      empty.appendChild(el("p", null, "위에서 모델명을 적고 첫 세션을 만들어 보세요."));
      list.appendChild(empty);
      return;
    }

    var sorted = state.sessions.slice().sort(function (a, b) {
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    sorted.forEach(function (session) {
      var card = el("article", "session-card");
      if (session.id === state.activeSessionId) { card.classList.add("is-current"); }

      var header = el("div", "session-card-header");
      var left = el("div");
      left.appendChild(el("h3", "session-model", session.model));
      var t = totals(session);
      left.appendChild(el("p", "session-meta",
        formatDate(session.createdAt) + " · 채점 " + t.scored + "/" + t.total +
        (t.percent === null ? "" : " · " + t.percent + "%")));
      if (session.memo) {
        left.appendChild(el("p", "session-memo", session.memo));
      }
      header.appendChild(left);
      if (session.id === state.activeSessionId) {
        var chip = el("span", "status-chip is-active-session meta-chip", "채점 중");
        header.appendChild(chip);
      }
      card.appendChild(header);

      var actions = el("div", "session-actions");
      var selectBtn = el("button", "primary-button", session.id === state.activeSessionId ? "테스트 계속하기" : "이 세션으로 채점");
      selectBtn.type = "button";
      selectBtn.addEventListener("click", function () {
        state.activeSessionId = session.id;
        persist();
        showScreen("test");
        toast("'" + session.model + "' 세션으로 전환했습니다.");
      });
      actions.appendChild(selectBtn);

      var deleteBtn = el("button", "secondary-button danger-button", "삭제");
      deleteBtn.type = "button";
      deleteBtn.setAttribute("aria-label", session.model + " 세션 삭제");
      deleteBtn.addEventListener("click", function () {
        if (!window.confirm("'" + session.model + "' 세션과 채점 기록을 삭제할까요?")) { return; }
        state.sessions = state.sessions.filter(function (s) { return s.id !== session.id; });
        if (state.activeSessionId === session.id) { state.activeSessionId = null; }
        persist();
        renderSessions();
        toast("세션을 삭제했습니다.");
      });
      actions.appendChild(deleteBtn);
      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  /* ── 테스트 화면 ───────────────────────────── */

  function renderTestScreen() {
    renderHeaderChip();
    var session = activeSession();
    var intro = $("test-session-intro");
    var notice = $("no-session-notice");
    if (session) {
      intro.textContent = "세션: " + session.model + " · 프롬프트를 복사해 모델에게 붙여넣고 답을 채점하세요.";
      notice.hidden = true;
    } else {
      intro.textContent = "세션을 만들면 채점이 가능합니다. 프롬프트 열람과 복사는 세션 없이도 됩니다.";
      notice.hidden = false;
    }
    renderProgress();
    renderTabs();
    renderTestList();
  }

  function renderProgress() {
    var session = activeSession();
    var tests = courseTests();
    var scored = 0;
    if (session) {
      for (var i = 0; i < tests.length; i++) {
        if (scoreOf(session, tests[i].id) !== null) { scored += 1; }
      }
    }
    var pct = tests.length ? Math.round((scored / tests.length) * 100) : 0;
    $("progress-text").textContent = "진행률 " + scored + " / " + tests.length +
      (state.quickOnly ? " (빠른 코스)" : "");
    $("progress-percent").textContent = pct + "%";
    $("progress-bar").style.width = pct + "%";
    $("progress-bar-track").setAttribute("aria-valuenow", String(pct));
  }

  function renderTabs() {
    var wrap = $("category-tabs");
    clear(wrap);
    var cats = [{ id: "all", ko: "전체" }].concat(CATEGORIES);
    cats.forEach(function (cat) {
      var btn = el("button", "tab-button", cat.ko);
      btn.type = "button";
      btn.setAttribute("aria-pressed", state.filterCat === cat.id ? "true" : "false");
      btn.addEventListener("click", function () {
        state.filterCat = cat.id;
        renderTabs();
        renderTestList();
      });
      wrap.appendChild(btn);
    });
    var quick = $("quick-toggle");
    quick.setAttribute("aria-pressed", state.quickOnly ? "true" : "false");
  }

  function copyText(text, button) {
    function done(ok) {
      var original = "프롬프트 복사";
      button.textContent = ok ? "복사됨!" : "복사 실패";
      setTimeout(function () { button.textContent = original; }, 1600);
      if (ok) { toast("프롬프트를 복사했습니다. 모델에게 붙여넣으세요."); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      done(!!ok);
    } catch (e) {
      done(false);
    }
  }

  function renderTestList() {
    var wrap = $("test-list");
    clear(wrap);
    var session = activeSession();
    var tests = visibleTests();

    if (tests.length === 0) {
      var empty = el("div", "empty-state");
      empty.appendChild(el("strong", null, "이 조합에는 문항이 없습니다"));
      empty.appendChild(el("p", null, "분야 필터나 빠른 코스 설정을 바꿔 보세요."));
      wrap.appendChild(empty);
      return;
    }

    tests.forEach(function (test) {
      wrap.appendChild(buildTestCard(test, session));
    });
  }

  function buildTestCard(test, session) {
    var card = el("article", "test-card");
    var currentScore = session ? scoreOf(session, test.id) : null;
    if (currentScore !== null) { card.classList.add("is-scored"); }

    var header = el("div", "test-card-header");
    header.appendChild(el("span", "cat-badge", catName(test.category)));
    if (test.quick) { header.appendChild(el("span", "cat-badge quick-badge", "빠른 코스")); }
    if (test.custom) { header.appendChild(el("span", "cat-badge custom-badge", "사용자 정의")); }
    header.appendChild(el("h3", "test-title", test.title));
    card.appendChild(header);

    if (test.why) {
      var why = el("div", "test-why");
      why.appendChild(el("span", "detail-label", "왜 이 테스트인가"));
      why.appendChild(el("span", null, test.why));
      card.appendChild(why);
    }

    // 프롬프트 블록
    var promptBlock = el("div", "prompt-block");
    var toolbar = el("div", "prompt-toolbar");
    toolbar.appendChild(el("span", null, "Prompt"));
    var copyBtn = el("button", "copy-button", "프롬프트 복사");
    copyBtn.type = "button";
    copyBtn.setAttribute("aria-label", "'" + test.title + "' 프롬프트 복사");
    copyBtn.addEventListener("click", function () { copyText(test.prompt, copyBtn); });
    toolbar.appendChild(copyBtn);
    promptBlock.appendChild(toolbar);
    var pre = el("pre", "prompt-pre", test.prompt);
    pre.tabIndex = 0;
    pre.setAttribute("aria-label", "프롬프트 전문");
    promptBlock.appendChild(pre);
    card.appendChild(promptBlock);

    // 살펴볼 포인트
    if (test.watchFor && test.watchFor.length) {
      var watch = el("div", "watch-block");
      watch.appendChild(el("span", "detail-label", "살펴볼 포인트"));
      var ul = el("ul", "watch-list");
      test.watchFor.forEach(function (w) { ul.appendChild(el("li", null, w)); });
      watch.appendChild(ul);
      card.appendChild(watch);
    }

    // 채점 기준
    if (test.rubric) {
      var rubric = el("div", "rubric-block");
      rubric.appendChild(el("span", "detail-label", "채점 기준"));
      var rl = el("ul", "rubric-list");
      ["0", "1", "2"].forEach(function (k) {
        if (test.rubric[k] === undefined) { return; }
        var li = el("li");
        li.appendChild(el("span", "rubric-score", k + " " + SCORE_WORDS[k]));
        li.appendChild(el("span", null, " " + test.rubric[k]));
        rl.appendChild(li);
      });
      rubric.appendChild(rl);
      card.appendChild(rubric);
    }

    // 채점 버튼
    var row = el("div", "score-row");
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", "'" + test.title + "' 채점");
    [0, 1, 2].forEach(function (value) {
      var btn = el("button", "score-button score-" + value);
      btn.type = "button";
      btn.appendChild(el("span", "score-num", String(value)));
      btn.appendChild(el("span", "score-word", SCORE_WORDS[value]));
      btn.setAttribute("aria-pressed", currentScore === value ? "true" : "false");
      btn.setAttribute("aria-label", test.title + " " + value + "점 " + SCORE_WORDS[value]);
      btn.disabled = !session;
      btn.addEventListener("click", function () {
        setScore(test.id, value, card, row);
      });
      row.appendChild(btn);
    });
    card.appendChild(row);

    // 메모
    var noteField = el("label", "field note-field");
    noteField.appendChild(el("span", null, "메모"));
    var ta = el("textarea");
    ta.rows = 2;
    ta.placeholder = session ? "모델 답변에서 눈에 띈 점 (자동 저장)" : "세션을 만들면 메모할 수 있습니다";
    ta.disabled = !session;
    var entry = session ? getEntry(session, test.id) : null;
    ta.value = entry && entry.note ? entry.note : "";
    ta.addEventListener("change", function () { setNote(test.id, ta.value); });
    ta.addEventListener("blur", function () { setNote(test.id, ta.value); });
    noteField.appendChild(ta);
    card.appendChild(noteField);
    card.appendChild(el("p", "save-hint", "채점과 메모는 즉시 이 브라우저에 저장됩니다."));

    // 사용자 정의 테스트 삭제
    if (test.custom) {
      var delRow = el("div", "custom-delete-row");
      var delBtn = el("button", "secondary-button danger-button", "이 테스트 삭제");
      delBtn.type = "button";
      delBtn.setAttribute("aria-label", "'" + test.title + "' 사용자 정의 테스트 삭제");
      delBtn.addEventListener("click", function () {
        if (!window.confirm("'" + test.title + "' 테스트를 삭제할까요? 세션별 채점 기록도 함께 지워집니다.")) { return; }
        state.customTests = state.customTests.filter(function (t) { return t.id !== test.id; });
        state.sessions.forEach(function (s) {
          if (s.scores && s.scores[test.id]) { delete s.scores[test.id]; }
        });
        persist();
        renderTestScreen();
        toast("사용자 정의 테스트를 삭제했습니다.");
      });
      delRow.appendChild(delBtn);
      card.appendChild(delRow);
    }

    return card;
  }

  function setScore(testId, value, card, row) {
    var session = activeSession();
    if (!session) {
      toast("먼저 세션을 만들거나 선택하세요.");
      return;
    }
    if (!session.scores) { session.scores = {}; }
    var entry = session.scores[testId] || {};
    if (entry.score === value) {
      delete entry.score; // 같은 버튼 다시 누르면 채점 해제
    } else {
      entry.score = value;
    }
    entry.updatedAt = new Date().toISOString();
    session.scores[testId] = entry;
    persist();

    var newScore = typeof entry.score === "number" ? entry.score : null;
    var buttons = row.querySelectorAll(".score-button");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-pressed", newScore === i ? "true" : "false");
    }
    card.classList.toggle("is-scored", newScore !== null);
    renderProgress();
  }

  function setNote(testId, text) {
    var session = activeSession();
    if (!session) { return; }
    if (!session.scores) { session.scores = {}; }
    var entry = session.scores[testId] || {};
    var trimmed = String(text || "").trim();
    if (trimmed) {
      entry.note = trimmed;
    } else {
      delete entry.note;
    }
    if (typeof entry.score !== "number" && !entry.note) {
      delete session.scores[testId];
    } else {
      entry.updatedAt = new Date().toISOString();
      session.scores[testId] = entry;
    }
    persist();
  }

  /* ── 레이더 차트 (순수 SVG) ─────────────────── */

  var SVG_NS = "http://www.w3.org/2000/svg";

  function svgEl(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    for (var key in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, key)) {
        node.setAttribute(key, attrs[key]);
      }
    }
    return node;
  }

  function radarPoint(cx, cy, radius, index, count) {
    var angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    };
  }

  function buildRadar(datasets, describeText) {
    // datasets: [{label, color, values: {catId: 0~2|null}}]
    var size = 420, cx = size / 2, cy = size / 2 + 4, R = 138;
    var n = CATEGORIES.length || 1;

    var svg = svgEl("svg", {
      viewBox: "0 0 " + size + " " + size,
      role: "img"
    });
    var titleId = uid("radar-title");
    var descId = uid("radar-desc");
    svg.setAttribute("aria-labelledby", titleId + " " + descId);
    var title = svgEl("title", { id: titleId });
    title.textContent = "분야별 점수 레이더 차트";
    var desc = svgEl("desc", { id: descId });
    desc.textContent = describeText;
    svg.appendChild(title);
    svg.appendChild(desc);

    // 격자 (0.5, 1, 1.5, 2)
    [0.5, 1, 1.5, 2].forEach(function (level) {
      var points = [];
      for (var i = 0; i < n; i++) {
        var p = radarPoint(cx, cy, (level / 2) * R, i, n);
        points.push(p.x.toFixed(1) + "," + p.y.toFixed(1));
      }
      svg.appendChild(svgEl("polygon", {
        points: points.join(" "),
        fill: "none",
        stroke: level === 2 ? "rgba(25,31,40,.28)" : "rgba(25,31,40,.12)",
        "stroke-width": level === 2 ? "1.5" : "1"
      }));
    });

    // 축과 라벨
    for (var i = 0; i < n; i++) {
      var outer = radarPoint(cx, cy, R, i, n);
      svg.appendChild(svgEl("line", {
        x1: cx, y1: cy, x2: outer.x.toFixed(1), y2: outer.y.toFixed(1),
        stroke: "rgba(25,31,40,.12)", "stroke-width": "1"
      }));
      var labelPos = radarPoint(cx, cy, R + 26, i, n);
      var anchor = "middle";
      if (labelPos.x < cx - 12) { anchor = "end"; }
      if (labelPos.x > cx + 12) { anchor = "start"; }
      var label = svgEl("text", {
        x: labelPos.x.toFixed(1),
        y: (labelPos.y + 4).toFixed(1),
        "text-anchor": anchor,
        "font-size": "13",
        "font-weight": "600",
        fill: "#191f28"
      });
      label.textContent = catName(CATEGORIES[i].id);
      svg.appendChild(label);
    }

    // 눈금 라벨
    var tick = svgEl("text", {
      x: cx + 4, y: cy - R - 4, "font-size": "10", fill: "#6b7684"
    });
    tick.textContent = "만점 2.0";
    svg.appendChild(tick);

    // 데이터 다각형
    datasets.forEach(function (ds) {
      var points = [];
      for (var k = 0; k < n; k++) {
        var v = ds.values[CATEGORIES[k].id];
        var value = typeof v === "number" ? Math.max(0, Math.min(2, v)) : 0;
        var p = radarPoint(cx, cy, (value / 2) * R, k, n);
        points.push(p.x.toFixed(1) + "," + p.y.toFixed(1));
      }
      svg.appendChild(svgEl("polygon", {
        points: points.join(" "),
        fill: ds.color,
        "fill-opacity": "0.16",
        stroke: ds.color,
        "stroke-width": "2.5",
        "stroke-linejoin": "round"
      }));
      for (var m = 0; m < n; m++) {
        var vv = ds.values[CATEGORIES[m].id];
        var val = typeof vv === "number" ? Math.max(0, Math.min(2, vv)) : 0;
        var dot = radarPoint(cx, cy, (val / 2) * R, m, n);
        svg.appendChild(svgEl("circle", {
          cx: dot.x.toFixed(1), cy: dot.y.toFixed(1), r: "4", fill: ds.color
        }));
      }
    });

    return svg;
  }

  function radarDescription(datasets) {
    return datasets.map(function (ds) {
      var parts = CATEGORIES.map(function (c) {
        var v = ds.values[c.id];
        return c.ko + " " + (typeof v === "number" ? v.toFixed(1) : "미채점");
      });
      return ds.label + ": " + parts.join(", ");
    }).join(" / ");
  }

  /* ── 결과 화면 ─────────────────────────────── */

  function fillSessionSelect(select, selectedId, placeholder) {
    clear(select);
    var ph = el("option", null, placeholder);
    ph.value = "";
    select.appendChild(ph);
    var sorted = state.sessions.slice().sort(function (a, b) {
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
    sorted.forEach(function (s) {
      var opt = el("option", null, s.model + " (" + formatDate(s.createdAt) + ")");
      opt.value = s.id;
      if (s.id === selectedId) { opt.selected = true; }
      select.appendChild(opt);
    });
  }

  function renderResults() {
    renderHeaderChip();
    var select = $("results-session-select");
    var selectedId = select.value || state.activeSessionId;
    if (selectedId && !findSession(selectedId)) { selectedId = state.activeSessionId; }
    fillSessionSelect(select, selectedId, "세션을 선택하세요");

    var body = $("results-body");
    clear(body);
    var session = selectedId ? findSession(selectedId) : null;

    if (!session) {
      var empty = el("div", "empty-state");
      empty.appendChild(el("strong", null, "표시할 세션이 없습니다"));
      empty.appendChild(el("p", null, "세션을 만들고 몇 문항을 채점하면 결과가 나타납니다."));
      body.appendChild(empty);
      return;
    }

    var t = totals(session);

    // 통계 카드
    var grid = el("div", "stat-grid");
    grid.appendChild(statCard(t.percent === null ? "-" : t.percent + "%", "총점 (획득/만점)"));
    grid.appendChild(statCard(t.scored + "/" + t.total, "채점한 문항"));
    grid.appendChild(statCard(t.sum + "점", "합계 (문항당 0~2)"));
    body.appendChild(grid);

    // 레이더
    var averages = categoryAverages(session);
    var radarPanel = el("section", "panel radar-panel");
    var ph = el("div", "panel-heading");
    var phLeft = el("div");
    phLeft.appendChild(el("p", "panel-kicker", "Radar"));
    phLeft.appendChild(el("h2", null, "분야 8축 프로필"));
    ph.appendChild(phLeft);
    radarPanel.appendChild(ph);
    var radarWrap = el("div", "radar-wrap");
    var datasets = [{ label: session.model, color: COLOR_A, values: averages }];
    radarWrap.appendChild(buildRadar(datasets, radarDescription(datasets)));
    radarPanel.appendChild(radarWrap);
    var legend = el("div", "radar-legend");
    legend.appendChild(legendItem(COLOR_A, session.model));
    radarPanel.appendChild(legend);
    body.appendChild(radarPanel);

    // 분야별 평균 표
    var catTable = el("div", "table-wrap");
    var table = el("table", "data-table");
    table.appendChild(el("caption", null, "분야별 평균 (0~2)"));
    var thead = el("thead");
    var hr = el("tr");
    ["분야", "평균", "채점 문항"].forEach(function (h) { hr.appendChild(el("th", null, h)); });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tbody = el("tbody");
    CATEGORIES.forEach(function (c) {
      var row = el("tr");
      row.appendChild(el("td", null, c.ko));
      var avg = averages[c.id];
      var avgCell = el("td", "num-cell", avg === null ? "미채점" : avg.toFixed(2));
      if (avg === null) { avgCell.classList.add("unscored"); }
      row.appendChild(avgCell);
      var catTests = allTests().filter(function (x) { return x.category === c.id; });
      var scoredInCat = catTests.filter(function (x) { return scoreOf(session, x.id) !== null; }).length;
      row.appendChild(el("td", "num-cell", scoredInCat + "/" + catTests.length));
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    catTable.appendChild(table);
    body.appendChild(catTable);

    // 항목별 점수 표
    var itemWrap = el("div", "table-wrap");
    var itemTable = el("table", "data-table");
    itemTable.appendChild(el("caption", null, "항목별 점수"));
    var ithead = el("thead");
    var ihr = el("tr");
    ["테스트", "분야", "점수", "메모"].forEach(function (h) { ihr.appendChild(el("th", null, h)); });
    ithead.appendChild(ihr);
    itemTable.appendChild(ithead);
    var itbody = el("tbody");
    allTests().forEach(function (test) {
      var row = el("tr");
      row.appendChild(el("td", null, test.title + (test.custom ? " (사용자 정의)" : "")));
      row.appendChild(el("td", null, catName(test.category)));
      var s = scoreOf(session, test.id);
      var cell = el("td", "num-cell", s === null ? "-" : s + " " + SCORE_WORDS[s]);
      if (s === null) { cell.classList.add("unscored"); }
      row.appendChild(cell);
      var entry = getEntry(session, test.id);
      row.appendChild(el("td", null, entry && entry.note ? entry.note : ""));
      itbody.appendChild(row);
    });
    itemTable.appendChild(itbody);
    itemWrap.appendChild(itemTable);
    body.appendChild(itemWrap);
  }

  function statCard(value, label) {
    var card = el("div", "stat-card");
    card.appendChild(el("span", "stat-value", value));
    card.appendChild(el("span", "stat-label", label));
    return card;
  }

  function legendItem(color, label) {
    var item = el("span", "legend-item");
    var swatch = el("span", "legend-swatch");
    swatch.style.background = color;
    item.appendChild(swatch);
    item.appendChild(el("span", null, label));
    return item;
  }

  /* ── 비교 화면 ─────────────────────────────── */

  var compareState = { a: null, b: null };

  function renderCompare() {
    renderHeaderChip();
    var selA = $("compare-a");
    var selB = $("compare-b");

    if (compareState.a && !findSession(compareState.a)) { compareState.a = null; }
    if (compareState.b && !findSession(compareState.b)) { compareState.b = null; }
    if (!compareState.b && state.activeSessionId) { compareState.b = state.activeSessionId; }
    if (!compareState.a) {
      var others = state.sessions.filter(function (s) { return s.id !== compareState.b; });
      if (others.length) {
        others.sort(function (x, y) { return (y.createdAt || "").localeCompare(x.createdAt || ""); });
        compareState.a = others[0].id;
      }
    }

    fillSessionSelect(selA, compareState.a, "기준 세션 선택");
    fillSessionSelect(selB, compareState.b, "비교 세션 선택");

    var body = $("compare-body");
    clear(body);

    var a = compareState.a ? findSession(compareState.a) : null;
    var b = compareState.b ? findSession(compareState.b) : null;

    if (!a || !b) {
      var empty = el("div", "empty-state");
      empty.appendChild(el("strong", null, "세션 2개를 선택하세요"));
      empty.appendChild(el("p", null, "비교하려면 채점된 세션이 2개 이상 필요합니다."));
      body.appendChild(empty);
      return;
    }
    if (a.id === b.id) {
      var same = el("div", "empty-state");
      same.appendChild(el("strong", null, "서로 다른 세션을 선택하세요"));
      same.appendChild(el("p", null, "같은 세션끼리는 비교할 수 없습니다."));
      body.appendChild(same);
      return;
    }

    var avgA = categoryAverages(a);
    var avgB = categoryAverages(b);
    var totalA = totals(a);
    var totalB = totals(b);

    // 요약 한 줄: 가장 크게 좋아진 분야
    var bestCat = null, bestDelta = 0;
    CATEGORIES.forEach(function (c) {
      if (typeof avgA[c.id] === "number" && typeof avgB[c.id] === "number") {
        var d = avgB[c.id] - avgA[c.id];
        if (d > bestDelta) { bestDelta = d; bestCat = c; }
      }
    });
    var headline = el("p", "compare-headline");
    if (bestCat) {
      headline.textContent = "가장 크게 좋아진 분야: " + bestCat.ko + " (+" + bestDelta.toFixed(2) + "점, 0~2 척도) — " +
        a.model + " 대비 " + b.model + " 기준.";
    } else {
      headline.textContent = "두 세션 모두에서 채점된 분야 중 점수가 오른 분야가 없거나, 겹치는 채점 분야가 아직 없습니다.";
    }
    body.appendChild(headline);

    // 총점 비교 카드
    var grid = el("div", "stat-grid");
    grid.appendChild(statCard(totalA.percent === null ? "-" : totalA.percent + "%", a.model + " 총점"));
    grid.appendChild(statCard(totalB.percent === null ? "-" : totalB.percent + "%", b.model + " 총점"));
    var diffText = "-";
    if (totalA.percent !== null && totalB.percent !== null) {
      var diff = Math.round((totalB.percent - totalA.percent) * 10) / 10;
      diffText = (diff > 0 ? "+" : "") + diff + "%p";
    }
    grid.appendChild(statCard(diffText, "총점 변화"));
    body.appendChild(grid);

    // 겹친 레이더
    var radarPanel = el("section", "panel radar-panel");
    var ph = el("div", "panel-heading");
    var phLeft = el("div");
    phLeft.appendChild(el("p", "panel-kicker", "Overlay"));
    phLeft.appendChild(el("h2", null, "레이더 겹쳐 보기"));
    ph.appendChild(phLeft);
    radarPanel.appendChild(ph);
    var radarWrap = el("div", "radar-wrap");
    var datasets = [
      { label: a.model, color: COLOR_A, values: avgA },
      { label: b.model, color: COLOR_B, values: avgB }
    ];
    radarWrap.appendChild(buildRadar(datasets, radarDescription(datasets)));
    radarPanel.appendChild(radarWrap);
    var legend = el("div", "radar-legend");
    legend.appendChild(legendItem(COLOR_A, a.model + " (기준)"));
    legend.appendChild(legendItem(COLOR_B, b.model + " (비교)"));
    radarPanel.appendChild(legend);
    body.appendChild(radarPanel);

    // 델타 표
    var wrap = el("div", "table-wrap");
    var table = el("table", "data-table");
    table.appendChild(el("caption", null, "분야별 점수 변화 (0~2 평균)"));
    var thead = el("thead");
    var hr = el("tr");
    ["분야", a.model, b.model, "변화"].forEach(function (h) { hr.appendChild(el("th", null, h)); });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tbody = el("tbody");
    CATEGORIES.forEach(function (c) {
      var row = el("tr");
      row.appendChild(el("td", null, c.ko));
      var va = avgA[c.id], vb = avgB[c.id];
      var cellA = el("td", "num-cell", typeof va === "number" ? va.toFixed(2) : "미채점");
      if (typeof va !== "number") { cellA.classList.add("unscored"); }
      var cellB = el("td", "num-cell", typeof vb === "number" ? vb.toFixed(2) : "미채점");
      if (typeof vb !== "number") { cellB.classList.add("unscored"); }
      row.appendChild(cellA);
      row.appendChild(cellB);
      var deltaCell = el("td", "num-cell");
      if (typeof va === "number" && typeof vb === "number") {
        var d = Math.round((vb - va) * 100) / 100;
        if (d > 0) {
          deltaCell.textContent = "▲ +" + d.toFixed(2);
          deltaCell.classList.add("delta-up");
        } else if (d < 0) {
          deltaCell.textContent = "▼ " + d.toFixed(2);
          deltaCell.classList.add("delta-down");
        } else {
          deltaCell.textContent = "= 0.00";
          deltaCell.classList.add("delta-flat");
        }
      } else {
        deltaCell.textContent = "-";
        deltaCell.classList.add("unscored");
      }
      row.appendChild(deltaCell);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    body.appendChild(wrap);
  }

  /* ── 내보내기 / 가져오기 ─────────────────────── */

  function exportJson() {
    var payload = {
      format: "ai-vibe-check",
      version: 1,
      exportedAt: new Date().toISOString(),
      sessions: state.sessions,
      customTests: state.customTests
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    var d = new Date();
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    link.href = url;
    link.download = "ai-vibe-check-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("JSON 파일로 내보냈습니다.");
  }

  function sanitizeScores(raw) {
    var out = {};
    if (!raw || typeof raw !== "object") { return out; }
    for (var key in raw) {
      if (!Object.prototype.hasOwnProperty.call(raw, key)) { continue; }
      var entryRaw = raw[key];
      if (!entryRaw || typeof entryRaw !== "object") { continue; }
      var entry = {};
      var sc = Number(entryRaw.score);
      if (sc === 0 || sc === 1 || sc === 2) { entry.score = sc; }
      if (entryRaw.note) { entry.note = String(entryRaw.note).slice(0, 4000); }
      if (entryRaw.updatedAt) { entry.updatedAt = String(entryRaw.updatedAt); }
      if (entry.score !== undefined || entry.note) { out[String(key)] = entry; }
    }
    return out;
  }

  function importJson(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try {
        data = JSON.parse(String(reader.result));
      } catch (e) {
        toast("JSON 파일을 읽을 수 없습니다.");
        return;
      }
      if (!data || typeof data !== "object") {
        toast("올바른 내보내기 파일이 아닙니다.");
        return;
      }
      var incomingSessions = Array.isArray(data.sessions) ? data.sessions : [];
      var incomingCustom = Array.isArray(data.customTests) ? data.customTests : [];
      if (!incomingSessions.length && !incomingCustom.length) {
        toast("가져올 세션이나 테스트가 없습니다.");
        return;
      }

      var existingSessionIds = {};
      state.sessions.forEach(function (s) { existingSessionIds[s.id] = true; });
      var existingCustomIds = {};
      state.customTests.forEach(function (t) { existingCustomIds[t.id] = true; });

      var addedSessions = 0, addedCustom = 0;

      incomingCustom.forEach(function (raw) {
        if (!raw || typeof raw !== "object" || !raw.title || !raw.prompt) { return; }
        var test = {
          id: String(raw.id || uid("custom")),
          title: String(raw.title).slice(0, 200),
          category: CATEGORIES.some(function (c) { return c.id === raw.category; }) ? String(raw.category) : (CATEGORIES[0] ? CATEGORIES[0].id : "etc"),
          prompt: String(raw.prompt).slice(0, 20000),
          why: raw.why ? String(raw.why).slice(0, 2000) : "",
          watchFor: Array.isArray(raw.watchFor) ? raw.watchFor.map(function (w) { return String(w).slice(0, 500); }).slice(0, 20) : [],
          createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString()
        };
        if (existingCustomIds[test.id]) { test.id = uid("custom"); } // 중복 id → 새 id
        existingCustomIds[test.id] = true;
        state.customTests.push(test);
        addedCustom += 1;
      });

      incomingSessions.forEach(function (raw) {
        if (!raw || typeof raw !== "object" || !raw.model) { return; }
        var session = {
          id: String(raw.id || uid("session")),
          model: String(raw.model).slice(0, 200),
          memo: raw.memo ? String(raw.memo).slice(0, 1000) : "",
          createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
          scores: sanitizeScores(raw.scores)
        };
        if (existingSessionIds[session.id]) { session.id = uid("session"); } // 중복 id → 새 id
        existingSessionIds[session.id] = true;
        state.sessions.push(session);
        addedSessions += 1;
      });

      persist();
      renderSessions();
      toast("가져오기 완료: 세션 " + addedSessions + "개, 사용자 정의 테스트 " + addedCustom + "개.");
    };
    reader.onerror = function () { toast("파일을 읽는 중 오류가 났습니다."); };
    reader.readAsText(file);
  }

  /* ── 이벤트 배선 ───────────────────────────── */

  function wireEvents() {
    // 하단 내비게이션
    var navs = document.querySelectorAll(".nav-item");
    for (var i = 0; i < navs.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          showScreen(btn.getAttribute("data-nav"));
        });
      })(navs[i]);
    }

    // 새 세션
    $("session-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target;
      var model = form.elements.model.value.trim();
      if (!model) {
        toast("모델명을 입력하세요.");
        form.elements.model.focus();
        return;
      }
      var session = {
        id: uid("session"),
        model: model.slice(0, 200),
        memo: form.elements.memo.value.trim().slice(0, 1000),
        createdAt: new Date().toISOString(),
        scores: {}
      };
      state.sessions.push(session);
      state.activeSessionId = session.id;
      persist();
      form.reset();
      showScreen("test");
      toast("'" + session.model + "' 세션을 만들었습니다. 채점을 시작하세요.");
    });

    // 빠른 코스 토글
    $("quick-toggle").addEventListener("click", function () {
      state.quickOnly = !state.quickOnly;
      renderTestScreen();
    });

    // 세션 없음 안내 버튼
    $("go-sessions").addEventListener("click", function () { showScreen("sessions"); });

    // 사용자 정의 테스트 추가
    $("custom-test-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.target;
      var title = form.elements.title.value.trim();
      var prompt = form.elements.prompt.value.trim();
      var category = form.elements.category.value;
      if (!title || !prompt || !category) {
        toast("제목·분야·프롬프트는 필수입니다.");
        return;
      }
      var watchLines = form.elements.watchFor.value.split("\n")
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return line.length > 0; })
        .slice(0, 20);
      state.customTests.push({
        id: uid("custom"),
        title: title.slice(0, 200),
        category: category,
        prompt: prompt.slice(0, 20000),
        watchFor: watchLines,
        createdAt: new Date().toISOString()
      });
      persist();
      form.reset();
      renderTestScreen();
      toast("사용자 정의 테스트를 추가했습니다.");
    });

    // 결과 세션 선택
    $("results-session-select").addEventListener("change", renderResults);

    // 비교 선택
    $("compare-a").addEventListener("change", function () {
      compareState.a = this.value || null;
      renderCompare();
    });
    $("compare-b").addEventListener("change", function () {
      compareState.b = this.value || null;
      renderCompare();
    });

    // 내보내기 / 가져오기
    $("export-button").addEventListener("click", exportJson);
    $("import-input").addEventListener("change", function () {
      if (this.files && this.files[0]) {
        importJson(this.files[0]);
        this.value = "";
      }
    });

    // 안내 박스 열림 상태 기억
    var guide = $("guide-box");
    var guidePref = loadRaw(GUIDE_KEY);
    if (guidePref === "closed") { guide.open = false; }
    guide.addEventListener("toggle", function () {
      try { localStorage.setItem(GUIDE_KEY, guide.open ? "open" : "closed"); } catch (e) { /* 무시 */ }
    });
  }

  function fillCustomCategorySelect() {
    var select = document.querySelector("#custom-test-form select[name='category']");
    clear(select);
    CATEGORIES.forEach(function (c) {
      var opt = el("option", null, c.ko);
      opt.value = c.id;
      select.appendChild(opt);
    });
  }

  /* ── 시작 ─────────────────────────────────── */

  function init() {
    if (!BUILTIN.length) {
      toast("테스트 데이터를 불러오지 못했습니다. tests-data.js를 확인하세요.");
    }
    fillCustomCategorySelect();
    wireEvents();
    renderHeaderChip();
    // 세션이 있으면 테스트 화면에서, 없으면 세션 화면에서 시작
    showScreen(activeSession() ? "test" : "sessions");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
