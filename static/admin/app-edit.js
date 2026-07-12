/* 앱 UI 편집기 v1 — PWA 앱 화면 위에서 소유자가 글씨·크기를 직접 고치는 관리자 도구.
   ① 모든 방문자: static/<app>/ui-edits.json 이 있으면 런타임 오버레이로 적용(글자 치환·크기·숨김·전역 배율).
   ② 소유 브라우저(sc_admin_worker + sc_admin_google_client 설정됨): "✎ UI 편집" 버튼이 떠서
      클릭=글자 편집, Alt+클릭=요소 선택(글자크기·숨기기), 하단 바=전역 배율 → 저장하면 Worker가
      ui-edits.json 을 GitHub에 커밋한다. 인증·커밋 흐름은 /admin/edit.js 와 동일(30일 세션).
   ③ 이후 Claude에게 "한국어 기준으로 다른 언어 반영해줘"라고 요청하면 이 JSON을 앱 소스에 굽고
      파일을 비운다 — 절차는 AGENTS.md 'App UI Edit Overrides' 절이 정본. */
(function () {
  if (window.__scAppEdit) return; window.__scAppEdit = true;
  var m = location.pathname.match(/^\/([a-z0-9-]+)\//);
  var APP = m ? m[1] : null; if (!APP || APP === 'admin') return;
  var FILE = 'static/' + APP + '/ui-edits.json';
  var LOCAL_URL = '/' + APP + '/ui-edits.json';
  var WORKER = (localStorage.getItem('sc_admin_worker') || '').replace(/\/+$/, '');
  var CLIENT = (localStorage.getItem('sc_admin_google_client') || '').trim();
  var ALLOWED = 'herring2141@gmail.com';

  /* ================= 1) 런타임 오버레이 — 모든 방문자 ================= */
  var OV = { rootScale: 100, text: [], style: [] };
  var findToRep = {}, repToFind = {};
  function buildMaps() {
    findToRep = {}; repToFind = {};
    (OV.text || []).forEach(function (t) {
      if (t && t.find != null && t.replace != null && t.find !== t.replace) { findToRep[t.find] = t.replace; repToFind[t.replace] = t.find; }
    });
  }
  function applyTextIn(root) {
    if (!OV.text || !OV.text.length || !root) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = w.nextNode())) {
      var raw = n.nodeValue; if (!raw) continue;
      var key = raw.trim(); if (!key) continue;
      var rep = findToRep[key];
      if (rep != null) n.nodeValue = raw.replace(key, rep);
    }
  }
  function applyStyles() {
    (OV.style || []).forEach(function (s) {
      if (!s || !s.selector) return;
      var els; try { els = document.querySelectorAll(s.selector); } catch (e) { return; }
      els.forEach(function (el) {
        if (s.hide) el.style.display = 'none';
        else if (el.getAttribute('data-sc-hidden')) { el.style.display = ''; el.removeAttribute('data-sc-hidden'); }
        if (s.hide) el.setAttribute('data-sc-hidden', '1');
        if (s.fontScale && s.fontScale !== 100) el.style.fontSize = s.fontScale + '%';
      });
    });
  }
  function applyRoot() {
    var z = (OV.rootScale || 100) / 100;
    document.body.style.zoom = (z === 1 ? '' : String(z));
  }
  function applyAll() { buildMaps(); applyRoot(); applyTextIn(document.body); applyStyles(); }
  var moT = null;
  var mo = new MutationObserver(function () {
    if (!((OV.text && OV.text.length) || (OV.style && OV.style.length))) return;
    clearTimeout(moT);
    moT = setTimeout(function () { if (!editing) { applyTextIn(document.body); applyStyles(); } }, 80);
  });
  function boot() {
    fetch(LOCAL_URL, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && typeof j === 'object') { OV.rootScale = j.rootScale || 100; OV.text = j.text || []; OV.style = j.style || []; }
      })
      .catch(function () {})
      .then(function () {
        applyAll();
        try { mo.observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) {}
        if (WORKER && CLIENT) initEditor();
      });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  /* ================= 2) 편집기 — 소유 브라우저에서만 ================= */
  var editing = false, dirty = 0, selEl = null, editEl = null, editOrig = null;

  function b64utf8(b64) { var bin = atob((b64 || '').replace(/\s/g, '')); return new TextDecoder('utf-8').decode(Uint8Array.from(bin, function (c) { return c.charCodeAt(0); })); }
  function utf8b64(str) { var by = new TextEncoder().encode(str); var s = ''; by.forEach(function (b) { s += String.fromCharCode(b); }); return btoa(s); }
  function decodeJwt(t) { return JSON.parse(b64utf8(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function ensureGIS() { return (window.google && google.accounts && google.accounts.id) ? Promise.resolve() : loadScript('https://accounts.google.com/gsi/client'); }

  /* ---- 인증(edit.js 와 동일 규약: sc_edit_tok 30일 세션, 저장 누를 때만 로그인) ---- */
  var ID_TOKEN = null, TOKEN_EXP = 0, pendingAuth = null, gisInit = false;
  function saveToken(tok, exp) { ID_TOKEN = tok; TOKEN_EXP = exp || 0; try { localStorage.setItem('sc_edit_tok', JSON.stringify({ token: tok, exp: exp })); } catch (e) {} }
  function tokenValid() { return !!(ID_TOKEN && TOKEN_EXP * 1000 > Date.now() + 60000); }
  function clearToken() { ID_TOKEN = null; TOKEN_EXP = 0; try { localStorage.removeItem('sc_edit_tok'); } catch (e) {} }
  function authInit() { try { var t = JSON.parse(localStorage.getItem('sc_edit_tok') || 'null'); if (t && t.token && t.exp * 1000 > Date.now() + 60000) { ID_TOKEN = t.token; TOKEN_EXP = t.exp; } } catch (e) {} }
  function gisCallback(resp) {
    try {
      var c = decodeJwt(resp.credential);
      if (!((c.email || '').toLowerCase() === ALLOWED && String(c.email_verified) === 'true')) {
        hideLogin();
        if (pendingAuth) { pendingAuth.reject(new Error('이 계정(' + (c.email || '?') + ')은 권한이 없습니다. ' + ALLOWED + ' 로 로그인하세요')); pendingAuth = null; }
        return;
      }
      var done = function () { hideLogin(); if (pendingAuth) { pendingAuth.resolve(); pendingAuth = null; } };
      fetch(WORKER + '/session', { method: 'POST', headers: { 'Authorization': 'Bearer ' + resp.credential } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j && j.session) { saveToken(j.session, j.exp); } else { saveToken(resp.credential, c.exp); } done(); })
        .catch(function () { saveToken(resp.credential, c.exp); done(); });
    } catch (e) { if (pendingAuth) { pendingAuth.reject(e); pendingAuth = null; } }
  }
  function showLogin() {
    var ov = document.getElementById('scaLogin');
    if (ov) { ov.style.display = 'flex'; return; }
    ov = document.createElement('div'); ov.id = 'scaLogin';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99990;background:rgba(25,31,40,.4);display:flex;align-items:center;justify-content:center;padding:20px';
    var card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:16px;padding:26px 28px 20px;max-width:340px;text-align:center;box-shadow:0 24px 64px rgba(25,31,40,.35);font-family:system-ui,sans-serif';
    card.innerHTML = '<div style="font-weight:700;font-size:16px;color:#191f28;margin-bottom:6px">저장하려면 로그인</div>' +
      '<div style="font-size:12.5px;color:#777;line-height:1.5;margin-bottom:16px">' + ALLOWED + ' 계정으로만 가능합니다.</div>' +
      '<div id="scaGbtn" style="display:flex;justify-content:center;min-height:44px"></div>' +
      '<button id="scaLoginX" type="button" style="margin-top:14px;border:0;background:transparent;color:#999;font-weight:600;font-size:12px;cursor:pointer">취소</button>';
    ov.appendChild(card); document.body.appendChild(ov);
    function cancel() { hideLogin(); if (pendingAuth) { pendingAuth.reject(new Error('로그인 취소됨')); pendingAuth = null; } }
    ov.addEventListener('click', function (e) { if (e.target === ov) cancel(); });
    card.querySelector('#scaLoginX').addEventListener('click', cancel);
  }
  function hideLogin() { var ov = document.getElementById('scaLogin'); if (ov) ov.style.display = 'none'; }
  function ensureAuth() {
    return new Promise(function (resolve, reject) {
      if (tokenValid()) { resolve(); return; }
      pendingAuth = { resolve: resolve, reject: reject };
      ensureGIS().then(function () {
        if (!gisInit) { google.accounts.id.initialize({ client_id: CLIENT, auto_select: true, cancel_on_tap_outside: true, callback: gisCallback }); gisInit = true; }
        showLogin();
        var c = document.getElementById('scaGbtn');
        if (c) { c.innerHTML = ''; try { google.accounts.id.renderButton(c, { type: 'standard', theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill', logo_alignment: 'left', width: 240 }); } catch (e) {} }
        try { google.accounts.id.prompt(); } catch (e) {}
      }).catch(function (e) { pendingAuth = null; hideLogin(); reject(e); });
    });
  }
  function api(method, seg, opts) {
    opts = opts || {};
    var u = WORKER + '/' + seg + (opts.path ? ('?path=' + encodeURIComponent(opts.path)) : '');
    return fetch(u, { method: method, headers: Object.assign({ 'Authorization': 'Bearer ' + ID_TOKEN }, opts.body ? { 'Content-Type': 'application/json' } : {}), body: opts.body ? JSON.stringify(opts.body) : undefined });
  }

  /* ---- 오버라이드 기록 ---- */
  function setTextOverride(orig, next) {
    orig = (orig == null ? '' : String(orig)).trim(); next = (next == null ? '' : String(next)).trim();
    if (!orig) return;
    var list = OV.text = OV.text || [];
    for (var i = 0; i < list.length; i++) { if (list[i].find === orig) { list.splice(i, 1); break; } }
    if (next && next !== orig) list.push({ find: orig, replace: next });
    dirty++; buildMaps(); paintBar();
  }
  function styleEntry(selector) {
    var list = OV.style = OV.style || [];
    for (var i = 0; i < list.length; i++) if (list[i].selector === selector) return list[i];
    var e = { selector: selector }; list.push(e); return e;
  }
  function cleanStyleList() {
    OV.style = (OV.style || []).filter(function (s) { return s && (s.hide || (s.fontScale && s.fontScale !== 100)); });
  }
  function selFor(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    var path = [], cur = el, depth = 0;
    while (cur && cur.nodeType === 1 && cur !== document.body && depth < 6) {
      if (cur.id) { path.unshift('#' + CSS.escape(cur.id)); break; }
      var seg = cur.tagName.toLowerCase();
      var cls = ''; try { if (cur.classList.length) cls = '.' + CSS.escape(cur.classList[0]); } catch (e) {}
      var parent = cur.parentElement, nth = '';
      if (parent) {
        var count = 0, pos = 0, sib = parent.children;
        for (var i = 0; i < sib.length; i++) { if (sib[i].tagName === cur.tagName) { count++; if (sib[i] === cur) pos = count; } }
        if (count > 1) nth = ':nth-of-type(' + pos + ')';
      }
      path.unshift(seg + cls + nth);
      cur = parent; depth++;
    }
    return path.join(' > ');
  }

  /* ---- 편집기 UI ---- */
  var css = ''
    + '#scaBtn{position:fixed;right:14px;bottom:92px;z-index:99900;font:700 13px/1 system-ui,sans-serif;background:#191f28;color:#fff;border:0;border-radius:999px;padding:11px 16px;cursor:pointer;box-shadow:0 8px 24px rgba(25,31,40,.35);opacity:.92}'
    + '#scaBtn:hover{opacity:1}'
    + '#scaBar{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99920;display:none;align-items:center;gap:10px;background:#191f28;color:#fff;border-radius:999px;padding:9px 12px 9px 16px;box-shadow:0 12px 36px rgba(25,31,40,.4);font:600 13px/1 system-ui,sans-serif;flex-wrap:wrap;justify-content:center;max-width:96vw}'
    + '#scaBar.show{display:flex}'
    + '#scaBar .grp{display:inline-flex;align-items:center;gap:6px}'
    + '#scaBar .lbl{color:#aab0bb;font-weight:600;font-size:12px}'
    + '#scaBar button{font:700 12.5px/1 system-ui,sans-serif;border:0;border-radius:999px;padding:8px 12px;cursor:pointer;background:rgba(255,255,255,.14);color:#fff}'
    + '#scaBar button:hover{background:rgba(255,255,255,.24)}'
    + '#scaBar .save{background:#fff;color:#191f28}'
    + '#scaBar .danger{background:transparent;color:#ff8a93;padding:8px 6px}'
    + '#scaBar .num{min-width:44px;text-align:center;font-weight:800}'
    + 'body.sca-editing{cursor:crosshair}'
    + 'body.sca-editing [contenteditable="true"]{outline:2px solid #3182f6;outline-offset:3px;border-radius:3px;cursor:text}'
    + '.sca-selected{outline:2px dashed #ff8a00 !important;outline-offset:3px}'
    + '#scaPop{position:absolute;z-index:99930;display:none;background:#fff;border:1px solid #e5e8eb;border-radius:10px;box-shadow:0 12px 32px rgba(25,31,40,.25);padding:6px;gap:4px;font:700 12px/1 system-ui,sans-serif}'
    + '#scaPop.show{display:inline-flex}'
    + '#scaPop button{border:0;border-radius:7px;background:#f4f5f7;color:#191f28;padding:8px 10px;cursor:pointer;font:inherit}'
    + '#scaPop button:hover{background:#e8ebef}'
    + '#scaHint{position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:99910;display:none;background:#FFF7E8;color:#8a6d1f;border:1px solid #EBD9B0;border-radius:10px;padding:7px 13px;font:600 12px/1.45 system-ui,sans-serif;max-width:86vw;text-align:center}'
    + '#scaHint.show{display:block}';

  function initEditor() {
    authInit();
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var btn = document.createElement('button'); btn.id = 'scaBtn'; btn.type = 'button'; btn.textContent = '✎ UI 편집';
    btn.title = '앱 화면의 글자·크기를 직접 편집 (관리자)';
    document.body.appendChild(btn);
    var bar = document.createElement('div'); bar.id = 'scaBar';
    bar.innerHTML = '<span class="grp"><span class="lbl">전역 배율</span><button data-act="z-">−</button><span class="num" id="scaZoom">100%</span><button data-act="z+">＋</button></span>'
      + '<span class="grp"><span class="lbl" id="scaCount">변경 0건</span></span>'
      + '<span class="grp"><button class="danger" data-act="reset">전체 초기화</button><button data-act="cancel">취소</button><button class="save" data-act="save">저장</button></span>';
    document.body.appendChild(bar);
    var hint = document.createElement('div'); hint.id = 'scaHint'; document.body.appendChild(hint);
    var pop = document.createElement('div'); pop.id = 'scaPop';
    pop.innerHTML = '<button data-act="f-">글자−</button><button data-act="f+">글자＋</button><button data-act="hide">숨기기</button><button data-act="unsel">해제</button>';
    document.body.appendChild(pop);

    function showHint(t) { hint.textContent = t; hint.classList.add('show'); clearTimeout(showHint._t); showHint._t = setTimeout(function () { hint.classList.remove('show'); }, 3600); }

    function enter() {
      if (editing) return;
      editing = true; dirty = 0;
      document.body.classList.add('sca-editing');
      bar.classList.add('show'); btn.style.display = 'none';
      paintBar();
      showHint('글자를 클릭해 바로 고치세요 · 크기·숨김은 Alt+클릭 · 끝나면 저장');
    }
    function exit(reload) {
      editing = false;
      document.body.classList.remove('sca-editing');
      bar.classList.remove('show'); btn.style.display = '';
      deselect(); stopTextEdit(false);
      if (reload) location.reload();
    }
    function paintBar() {
      var z = document.getElementById('scaZoom'); if (z) z.textContent = (OV.rootScale || 100) + '%';
      var c = document.getElementById('scaCount');
      if (c) c.textContent = '변경 ' + ((OV.text || []).length + (OV.style || []).length + ((OV.rootScale || 100) !== 100 ? 1 : 0)) + '건';
    }
    window.paintBar = paintBar; // setTextOverride에서 호출

    /* 텍스트 편집: 자식 요소 없는 잎(leaf) 요소만 contenteditable */
    function isLeaf(el) {
      if (!el || el.nodeType !== 1) return false;
      for (var i = 0; i < el.children.length; i++) { var t = el.children[i].tagName; if (t !== 'BR' && t !== 'B' && t !== 'I' && t !== 'STRONG' && t !== 'EM') return false; }
      return (el.textContent || '').trim().length > 0;
    }
    function startTextEdit(el) {
      stopTextEdit(true);
      editEl = el;
      var cur = (el.textContent || '').trim();
      editOrig = repToFind[cur] || cur; // 이미 고친 글자를 또 고치면 원문 기준으로 기록
      el.setAttribute('contenteditable', 'true');
      el.focus();
    }
    function stopTextEdit(commit) {
      if (!editEl) return;
      var el = editEl, orig = editOrig; editEl = null; editOrig = null;
      el.removeAttribute('contenteditable');
      if (commit) {
        var next = (el.textContent || '').trim();
        if (next !== orig) setTextOverride(orig, next);
      }
    }
    function deselect() {
      if (selEl) { selEl.classList.remove('sca-selected'); selEl = null; }
      pop.classList.remove('show');
    }
    function select(el) {
      deselect();
      selEl = el; el.classList.add('sca-selected');
      var r = el.getBoundingClientRect();
      pop.classList.add('show');
      pop.style.left = Math.max(6, window.pageXOffset + r.left) + 'px';
      pop.style.top = (window.pageYOffset + r.bottom + 6) + 'px';
    }

    document.addEventListener('click', function (e) {
      if (!editing) return;
      if (bar.contains(e.target) || pop.contains(e.target) || e.target === btn || (editEl && editEl.contains(e.target))) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      stopTextEdit(true);
      var t = e.target && e.target.nodeType === 1 ? e.target : null;
      if (!t || t === document.body) { deselect(); return; }
      if (e.altKey) { select(t); return; }
      deselect();
      if (isLeaf(t)) startTextEdit(t);
      else {
        // 클릭 지점의 잎 후손을 한 단계 탐색
        var leaf = null;
        for (var i = 0; i < t.children.length && !leaf; i++) if (isLeaf(t.children[i])) leaf = t.children[i];
        if (leaf) startTextEdit(leaf);
        else showHint('글자가 있는 더 작은 부분을 클릭하세요 (크기·숨김은 Alt+클릭)');
      }
    }, true);
    document.addEventListener('focusout', function (e) { if (editing && editEl && e.target === editEl) setTimeout(function () { stopTextEdit(true); }, 0); }, true);
    document.addEventListener('keydown', function (e) {
      if (editing && editEl && e.key === 'Enter') { e.preventDefault(); stopTextEdit(true); }
      if (editing && e.key === 'Escape') { e.preventDefault(); stopTextEdit(false); deselect(); }
    }, true);

    pop.addEventListener('click', function (e) {
      var act = e.target && e.target.getAttribute('data-act'); if (!act || !selEl) return;
      e.preventDefault(); e.stopPropagation();
      if (act === 'unsel') { deselect(); return; }
      var sel = selFor(selEl), ent = styleEntry(sel);
      if (act === 'f-' || act === 'f+') {
        ent.fontScale = Math.max(40, Math.min(300, (ent.fontScale || 100) + (act === 'f+' ? 10 : -10)));
        selEl.style.fontSize = ent.fontScale === 100 ? '' : ent.fontScale + '%';
      } else if (act === 'hide') {
        ent.hide = true; selEl.style.display = 'none'; deselect();
      }
      cleanStyleList(); dirty++; paintBar();
    });

    bar.addEventListener('click', function (e) {
      var act = e.target && e.target.getAttribute('data-act'); if (!act) return;
      e.preventDefault(); e.stopPropagation();
      if (act === 'z-' || act === 'z+') {
        OV.rootScale = Math.max(50, Math.min(150, (OV.rootScale || 100) + (act === 'z+' ? 5 : -5)));
        applyRoot(); dirty++; paintBar();
      } else if (act === 'cancel') {
        if (!dirty || confirm('저장하지 않은 변경을 버리고 닫을까요?')) exit(dirty > 0);
      } else if (act === 'reset') {
        if (!confirm('이 앱의 UI 편집을 전부 초기화할까요?\n(저장된 ui-edits.json 도 비웁니다)')) return;
        OV = { rootScale: 100, text: [], style: [] }; buildMaps();
        saveFile('admin: reset app UI edits (' + APP + ')').then(function () { exit(true); }).catch(function (err) { alert('초기화 실패: ' + err.message); });
      } else if (act === 'save') {
        stopTextEdit(true);
        var sv = bar.querySelector('.save'); sv.disabled = true; sv.textContent = '저장 중…';
        saveFile('admin: app UI edits (' + APP + ')').then(function () {
          sv.disabled = false; sv.textContent = '저장';
          dirty = 0; paintBar();
          showHint('저장됨 ✓ 1~2분 뒤 모든 방문자에게 적용 · Claude에게 "한국어 기준으로 다른 언어 반영해줘"라고 하면 소스에 굽습니다');
        }).catch(function (err) { sv.disabled = false; sv.textContent = '저장'; alert('저장 실패: ' + err.message); });
      }
    });

    btn.addEventListener('click', enter);
  }

  function saveFile(message) {
    return ensureAuth().then(function () {
      return api('GET', 'file', { path: FILE }).then(function (r) {
        if (r.status === 401) { clearToken(); throw new Error('세션 만료 — 다시 저장하세요'); }
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('읽기 실패 (' + r.status + ')');
        return r.json();
      });
    }).then(function (j) {
      cleanStyleList();
      var body = {
        version: 1,
        app: APP,
        updatedAt: new Date().toISOString(),
        note: '관리자 UI 편집 오버레이 — Claude가 소스에 반영(AGENTS.md: App UI Edit Overrides) 후 비웁니다',
        rootScale: OV.rootScale || 100,
        text: OV.text || [],
        style: OV.style || []
      };
      var payload = { content: utf8b64(JSON.stringify(body, null, 2) + '\n'), message: message };
      if (j && j.sha) payload.sha = j.sha;
      return api('PUT', 'file', { path: FILE, body: payload });
    }).then(function (r) {
      if (r.status === 401) { clearToken(); throw new Error('세션 만료 — 다시 저장하세요'); }
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error('커밋 실패 (' + r.status + ') ' + (j.message || '')); });
    });
  }
})();
