/* in-place 편집기 v2 — 실제 페이지 콘텐츠를 그 자리에서 글상자로 바꿔 편집(contentEditable),
   저장 시 HTML→Markdown(Turndown) 변환 + front-matter 보존하여 Worker로 커밋.
   ★버튼은 '구글 인증된 본인'일 때만 노출(설정만 된 브라우저로는 부족). 방문자엔 스크립트 자체가 안 실림(게이트=baseof). */
(function () {
  if (window.__scEdit) return; window.__scEdit = true;
  var CFG = window.SC_EDIT || {};
  var WORKER = (localStorage.getItem('sc_admin_worker') || '').replace(/\/+$/, '');
  var CLIENT = (localStorage.getItem('sc_admin_google_client') || '').trim();
  var ALLOWED = 'herring2141@gmail.com';
  if (!WORKER || !CLIENT || !CFG.path) return;

  var titleEl = document.querySelector('.post__title') || document.querySelector('.section__title');
  var subEl = document.querySelector('.post__subtitle');
  var bodyEl = document.querySelector('.post__body') || document.querySelector('.lede') || document.querySelector('.home-hero__intro');
  var hasCards = !!document.querySelector('[data-rk]');
  if (!bodyEl && !titleEl && !hasCards) return; // 편집 대상도 카드도 없으면 아무것도 안 함
  // 본문은 항상 인라인 편집. 단 raw HTML 특수 블록(앱 카드·시·표·통계)은 편집을 잠가 구조를 보호하고 저장 때 그대로 보존(turndown keep).
  var SPECIAL = '.appcard, .poem, table, iframe, .stats';
  var bodyHasRawHtml = bodyEl ? !!bodyEl.querySelector('.appcard, .poem, table, iframe, .cta, script, style, .stats') : false;
  var bodyEditable = !!bodyEl;

  /* ---- front-matter helpers (단위테스트 11/11) ---- */
  function splitDoc(raw){ if(!/^---\r?\n/.test(raw)) return {hasFm:false,fmFull:'',body:raw}; var m=raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/); if(!m) return {hasFm:false,fmFull:'',body:raw}; return {hasFm:true,fmFull:m[0],body:raw.slice(m[0].length)}; }
  function getField(fm,k){ var m=fm.match(new RegExp('^'+k+':[ \\t]*(.*)$','m')); if(!m) return null; var v=m[1].trim(); if((v.charAt(0)=='"'&&v.slice(-1)=='"')||(v.charAt(0)=="'"&&v.slice(-1)=="'")) v=v.slice(1,-1); return v.replace(/\\"/g,'"'); }
  function setField(fm,k,val){ var line=k+': "'+String(val).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"'; var re=new RegExp('^'+k+':[ \\t]*.*$','m'); if(re.test(fm)) return fm.replace(re,line); if(k=='subtitle'){ var tre=/^(title:.*)$/m; if(tre.test(fm)) return fm.replace(tre,'$1\n'+line); } return fm.replace(/(\r?\n---\r?\n)$/,'\n'+line+'$1'); }
  function b64utf8(b64){ var bin=atob((b64||'').replace(/\s/g,'')); return new TextDecoder('utf-8').decode(Uint8Array.from(bin,function(c){return c.charCodeAt(0);})); }
  function utf8b64(str){ var by=new TextEncoder().encode(str); var s=''; by.forEach(function(b){ s+=String.fromCharCode(b); }); return btoa(s); }

  /* ---- styles ---- */
  var css = ''
  + '#scEditBtn{position:fixed;top:90px;right:18px;z-index:9000;font:600 14px/1 "Kumbh Sans",system-ui,sans-serif;background:#0D1B4C;color:#fff;border:0;border-radius:999px;padding:10px 16px;cursor:pointer;box-shadow:0 6px 20px rgba(13,27,76,.28);opacity:.92;display:none}'
  + '#scEditBtn.show{display:block} #scEditBtn:hover{opacity:1;transform:translateY(-1px)}'
  + 'body.sc-editing [data-sc-edit]{outline:2px dashed rgba(184,115,51,.5);outline-offset:8px;border-radius:3px;transition:outline-color .2s}'
  + 'body.sc-editing [data-sc-edit]:focus{outline:2px solid #B87333}'
  + '#scBar{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9002;display:none;align-items:center;gap:12px;background:#0D1B4C;color:#fff;border-radius:999px;padding:10px 14px 10px 20px;box-shadow:0 12px 36px rgba(13,27,76,.34)}'
  + '#scBar.show{display:flex}'
  + '#scBar .m{font:500 13px/1.3 "Kumbh Sans",sans-serif;color:#C7C9D6;max-width:46vw}'
  + '#scBar button{font:700 13px/1 "Kumbh Sans",sans-serif;border:0;border-radius:999px;padding:9px 16px;cursor:pointer}'
  + '#scBar .save{background:#fff;color:#0D1B4C} #scBar .cancel{background:transparent;color:#C7C9D6;padding:9px 8px}'
  + '#scHint{position:fixed;left:50%;bottom:74px;transform:translateX(-50%);z-index:9002;display:none;background:#FFF7E8;color:#8a6d1f;border:1px solid #EBD9B0;border-radius:10px;padding:8px 14px;font:500 12.5px/1.4 "Kumbh Sans",sans-serif;max-width:80vw;text-align:center}'
  + '#scHint.show{display:block}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var btn = document.createElement('button'); btn.id = 'scEditBtn'; btn.type = 'button'; btn.textContent = '✎ 편집'; btn.title = '이 페이지 편집 (Ctrl/⌘+E)';
  document.body.appendChild(btn);

  var ID_TOKEN = null, CUR = null, editing = false, td = null;
  function loadScript(src){ return new Promise(function(res,rej){ var s=document.createElement('script'); s.src=src; s.async=true; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
  function ensureGIS(){ return (window.google&&google.accounts&&google.accounts.id)?Promise.resolve():loadScript('https://accounts.google.com/gsi/client'); }
  function ensureTurndown(){ return window.TurndownService?Promise.resolve():loadScript('https://cdn.jsdelivr.net/npm/turndown@7/dist/turndown.min.js'); }
  function decodeJwt(t){ return JSON.parse(b64utf8(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); }

  /* ---- 인증: 토큰을 localStorage에 보관(새로고침·탭·메뉴 이동에도 유지). 페이지 로드 때는 로그인 팝업을 띄우지 않는다.
     배지·편집버튼은 소유 브라우저면 바로 보이고, 실제 편집/검수 저장을 누를 때만(토큰 없거나 만료면) ensureAuth()로 한 번 로그인. ---- */
  var TOKEN_EXP = 0, pendingAuth = null, gisInit = false;
  function saveToken(tok, exp){ ID_TOKEN = tok; TOKEN_EXP = exp || 0; try{ localStorage.setItem('sc_edit_tok', JSON.stringify({ token: tok, exp: exp })); }catch(e){} }
  function tokenValid(){ return !!(ID_TOKEN && TOKEN_EXP*1000 > Date.now()+60000); }
  function clearToken(){ ID_TOKEN = null; TOKEN_EXP = 0; try{ localStorage.removeItem('sc_edit_tok'); }catch(e){} }
  function gisCallback(resp){
    try { var c = decodeJwt(resp.credential);
      if (!((c.email||'').toLowerCase()===ALLOWED && String(c.email_verified)==='true')){
        hideLogin();
        if (pendingAuth){ pendingAuth.reject(new Error('이 계정('+(c.email||'?')+')은 권한이 없습니다. '+ALLOWED+' 로 로그인하세요')); pendingAuth=null; }
        return;
      }
      var done = function(){ hideLogin(); onReady(); if (pendingAuth){ pendingAuth.resolve(); pendingAuth=null; } };
      // 구글 ID 토큰(약 1시간)을 30일 세션 토큰으로 교환(Worker /session). 실패하면 구글 토큰 그대로 사용(하위호환 — 구 Worker에서도 동작).
      fetch(WORKER + '/session', { method:'POST', headers:{ 'Authorization':'Bearer '+resp.credential } })
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(j){ if (j && j.session){ saveToken(j.session, j.exp); } else { saveToken(resp.credential, c.exp); } done(); })
        .catch(function(){ saveToken(resp.credential, c.exp); done(); });
    } catch(e){ if (pendingAuth){ pendingAuth.reject(e); pendingAuth=null; } }
  }
  /* 보이는 로그인 카드 + 실제 구글 버튼(원탭 prompt는 조용히 안 뜨는 경우가 많아 신뢰 불가 → renderButton을 항상 노출). */
  function showLogin(){
    var ov = document.getElementById('scLogin');
    if (ov){ ov.style.display='flex'; return; }
    ov = document.createElement('div'); ov.id='scLogin';
    ov.style.cssText='position:fixed;inset:0;z-index:9100;background:rgba(13,27,76,.34);display:flex;align-items:center;justify-content:center;padding:20px';
    var card = document.createElement('div');
    card.style.cssText='background:#fff;border-radius:16px;padding:26px 28px 20px;max-width:340px;text-align:center;box-shadow:0 24px 64px rgba(13,27,76,.34);font-family:"Kumbh Sans",system-ui,sans-serif';
    card.innerHTML='<div style="font-weight:700;font-size:16px;color:#0D1B4C;margin-bottom:6px">편집하려면 로그인</div>'+
      '<div style="font-size:12.5px;color:#777;line-height:1.5;margin-bottom:16px">'+ALLOWED+' 계정으로만 가능합니다.</div>'+
      '<div id="scGbtn" style="display:flex;justify-content:center;min-height:44px"></div>'+
      '<button id="scLoginX" type="button" style="margin-top:14px;border:0;background:transparent;color:#999;font-weight:600;font-size:12px;cursor:pointer">취소</button>';
    ov.appendChild(card); document.body.appendChild(ov);
    function cancel(){ hideLogin(); if(pendingAuth){ pendingAuth.reject(new Error('로그인 취소됨')); pendingAuth=null; } }
    ov.addEventListener('click', function(e){ if(e.target===ov) cancel(); });
    card.querySelector('#scLoginX').addEventListener('click', cancel);
  }
  function hideLogin(){ var ov=document.getElementById('scLogin'); if(ov) ov.style.display='none'; }
  function ensureAuth(){
    return new Promise(function(resolve, reject){
      if (tokenValid()){ resolve(); return; }
      pendingAuth = { resolve: resolve, reject: reject };
      ensureGIS().then(function(){
        if (!gisInit){ google.accounts.id.initialize({ client_id: CLIENT, auto_select: true, cancel_on_tap_outside: true, callback: gisCallback }); gisInit = true; }
        showLogin();
        var c = document.getElementById('scGbtn');
        if (c){ c.innerHTML=''; try { google.accounts.id.renderButton(c, { type:'standard', theme:'filled_blue', size:'large', text:'signin_with', shape:'pill', logo_alignment:'left', width:240 }); } catch(e){} }
        try { google.accounts.id.prompt(); } catch(e){}
      }).catch(function(e){ pendingAuth=null; hideLogin(); reject(e); });
    });
  }
  function authInit(){
    try { var t = JSON.parse(localStorage.getItem('sc_edit_tok') || 'null'); if (t && t.token && t.exp*1000 > Date.now()+60000){ ID_TOKEN = t.token; TOKEN_EXP = t.exp; } } catch(e){}
    onReady(); // 로그인 팝업 없이 바로 배지·편집버튼 노출(소유 브라우저). 인증은 편집/검수 저장 누를 때.
  }

  function api(method, seg, opts){
    opts = opts || {};
    var u = WORKER + '/' + seg + (opts.path ? ('?path=' + encodeURIComponent(opts.path)) : '');
    return fetch(u, { method: method, headers: Object.assign({ 'Authorization': 'Bearer ' + ID_TOKEN }, opts.body ? { 'Content-Type': 'application/json' } : {}), body: opts.body ? JSON.stringify(opts.body) : undefined });
  }
  function msg(m){ var e=document.querySelector('#scBar .m'); if(e) e.textContent=m||''; }

  /* ---- review-status badges on card lists (owner-only, interactive 3-state) ---- */
  var RV = { none:{l:'미검수',c:'#9a7b1f',bg:'#FBF1D6',bd:'#E8D6A8'}, reviewing:{l:'검수중',c:'#8a6d1f',bg:'#FFF3D9',bd:'#EBD9B0'}, done:{l:'검수완료',c:'#1b7a3d',bg:'#E7F6EC',bd:'#B7E4C7'} };
  function rvLang(){ var m=(document.body.className||'').match(/lang-([a-z]+)/); return m?m[1]:'en'; }
  function rvCache(){ try{ return (JSON.parse(localStorage.getItem('sc_review_status')||'{}')||{}).map||{}; }catch(e){ return {}; } }
  function rvSave(map){ try{ localStorage.setItem('sc_review_status', JSON.stringify({ at: Date.now(), map: map })); }catch(e){} }
  function rvStyle(b, status){ var s=RV[status]||RV.none; b.textContent=s.l; b.setAttribute('data-rv', status); b.style.cssText='cursor:pointer;display:inline-block;font-size:.66rem;font-weight:700;letter-spacing:.02em;padding:2px 8px;border-radius:6px;margin-left:8px;vertical-align:1px;color:'+s.c+';background:'+s.bg+';border:1px solid '+s.bd+';'; }
  function rvStatusFromRaw(raw){ var m=(raw||'').match(/^reviewStatus:[ \t]*["']?(none|reviewing|done)["']?[ \t]*$/m); if(m) return m[1]; var legacy=(raw||'').match(/^reviewed:[ \t]*(true|false)[ \t]*$/m); return legacy&&legacy[1]==='true'?'done':'none'; }
  function rvSetStatusRaw(raw, status){ var d=splitDoc(raw); if(!d.hasFm) return raw; var fm=d.fmFull.replace(/^reviewStatus:[ \t]*.*\r?\n/m,'').replace(/^reviewed:[ \t]*.*\r?\n/m,''); if(status==='reviewing'||status==='done') fm=fm.replace(/(\r?\n---\r?\n)$/,'\nreviewStatus: "'+status+'"$1'); return fm + d.body; }
  /* ---- 숨김: hidden:true + Hugo build로 공개 목록/사이트맵/검색에서 빠지되 URL은 살림. 전 언어 적용(관리자 setHidden과 동일 포맷). 복구는 관리자 페이지. ---- */
  function setHiddenRaw(raw, hide){ var d=splitDoc(raw); if(!d.hasFm) return raw; var fm=d.fmFull.replace(/^hidden:[ \t]*.*\r?\n/m,'').replace(/^build:[ \t]*\{[^}]*\}[ \t]*\r?\n/m,''); if(hide) fm=fm.replace(/(\r?\n---\r?\n)$/,'\nhidden: true\nbuild: {list: never, render: always}$1'); return fm + d.body; }
  /* 숨긴 글 미러(소유 브라우저 localStorage). 숨긴 글은 공개 목록에서 빠져 라이브에 안 떠 → 여기에 기억해 소유자에게만 '유령 카드'로 다시 띄워 원클릭 해제. 공개 HTML엔 절대 안 들어감. */
  function hidGet(){ try{ return (JSON.parse(localStorage.getItem('sc_hidden')||'{}')||{}).items||{}; }catch(e){ return {}; } }
  function hidSave(items){ try{ localStorage.setItem('sc_hidden', JSON.stringify({ at: Date.now(), items: items })); }catch(e){} }
  function hidHas(rk){ return !!hidGet()[rk]; }
  function hidAdd(rk, info){ var it=hidGet(); it[rk]=info; hidSave(it); }
  function hidDel(rk){ var it=hidGet(); delete it[rk]; hidSave(it); }
  function hideBtnStyle(hb, hidden){
    hb.textContent = hidden ? '숨김 해제' : '숨기기';
    hb.title = hidden ? '이 글을 다시 공개 (전 언어)' : '이 글을 공개 목록에서 숨김 (전 언어 · 나만 보임)';
    var c = hidden ? 'color:#1b7a3d;background:#E7F6EC;border-color:#B7E4C7' : 'color:#8a6d1f;background:#FFF3D9;border-color:#EBD9B0';
    hb.style.cssText='cursor:pointer;display:inline-block;font-size:.66rem;font-weight:700;padding:2px 8px;border-radius:6px;margin-left:6px;vertical-align:1px;border:1px solid;'+c;
  }
  /* 숨기기/해제를 한 함수로: 전 언어 hidden 토글 + sc_hidden 미러 + UI. 해제도 원클릭. */
  function setCardHidden(rk, card, hb, hide, info){
    if (!tokenValid()){ ensureAuth().then(function(){ setCardHidden(rk, card, hb, hide, info); }).catch(function(e){ if(e&&e.message) alert('로그인 필요: '+e.message); }); return; }
    if (hide && !confirm('이 글을 공개 목록에서 숨길까요?\n모든 언어에서 숨겨집니다. (이 버튼으로 언제든 다시 공개할 수 있어요.)')) return;
    var langs=['ko','en','zh','es','hi','ar'], i=0;
    hb.textContent = hide ? '숨기는 중…' : '해제하는 중…'; hb.style.opacity='.6'; hb.style.pointerEvents='none';
    function finish(){
      hb.style.opacity='1'; hb.style.pointerEvents='auto';
      if (hide){ hidAdd(rk, info||{}); if(card){ card.style.opacity='.5'; card.style.filter='grayscale(.5)'; } hideBtnStyle(hb, true); }
      else { hidDel(rk); if(card && card.classList.contains('sc-ghost')){ card.remove(); } else if(card){ card.style.opacity=''; card.style.filter=''; hideBtnStyle(hb, false); } }
    }
    function fail(lang, m){ hb.style.opacity='1'; hb.style.pointerEvents='auto'; hideBtnStyle(hb, !hide); alert((hide?'숨김':'해제')+' 실패('+lang+'): '+m); }
    function step(){
      if (i>=langs.length){ finish(); return; }
      var lang=langs[i++], path='content/'+lang+'/'+rk+'.md';
      api('GET','file',{path:path}).then(function(r){
        if (r.status===404){ step(); return; }
        if (r.status===401){ clearToken(); throw new Error('세션 만료 — 다시 누르세요'); }
        if (!r.ok) throw new Error('읽기 '+r.status);
        return r.json().then(function(j){
          var raw=b64utf8(j.content), next=setHiddenRaw(raw, hide);
          if (next===raw){ step(); return; }
          return api('PUT','file',{ path:path, body:{ content:utf8b64(next), sha:j.sha, message:'admin: '+(hide?'hide':'show')+' '+path } }).then(function(pr){ if(!pr.ok) throw new Error('저장 '+pr.status); step(); });
        });
      }).catch(function(e){ fail(lang, e.message); });
    }
    step();
  }
  function rvSet(rk, lang, status, badge){
    if (!tokenValid()){ ensureAuth().then(function(){ rvSet(rk, lang, status, badge); }).catch(function(e){ if(e&&e.message) alert('로그인 필요: '+e.message); }); return; }
    rvStyle(badge, status); // optimistic
    var path='content/'+lang+'/'+rk+'.md';
    api('GET','file',{path:path}).then(function(r){ if(r.status===401){ clearToken(); throw new Error('세션 만료 — 배지를 다시 클릭'); } if(!r.ok) throw new Error('읽기 '+r.status); return r.json(); }).then(function(j){
      var next=rvSetStatusRaw(b64utf8(j.content), status);
      return api('PUT','file',{ path:path, body:{ content:utf8b64(next), sha:j.sha, message:'admin: review '+status+' '+path } });
    }).then(function(r){ if(!r.ok) throw new Error('저장 '+r.status); var map=rvCache(); (map[rk]=map[rk]||{})[lang]=status; rvSave(map); }).catch(function(e){ alert('검수 상태 저장 실패: '+e.message); });
  }
  function rvMenu(badge, rk, lang){
    var ex=document.querySelector('.rv-menu'); if(ex) ex.remove();
    var menu=document.createElement('div'); menu.className='rv-menu';
    menu.style.cssText='position:absolute;z-index:9005;background:#fff;border:1px solid #e3e0d8;border-radius:8px;box-shadow:0 10px 26px rgba(13,27,76,.2);padding:4px;display:flex;flex-direction:column;min-width:104px';
    ['none','reviewing','done'].forEach(function(stt){
      var it=document.createElement('button'); it.type='button'; it.textContent=RV[stt].l;
      it.style.cssText='text-align:left;border:0;background:transparent;font:700 12px/1.4 sans-serif;color:'+RV[stt].c+';padding:7px 12px;border-radius:6px;cursor:pointer';
      it.onmouseover=function(){ it.style.background='#EEF2FF'; }; it.onmouseout=function(){ it.style.background='transparent'; };
      it.addEventListener('click', function(ev){ ev.stopPropagation(); rvSet(rk, lang, stt, badge); menu.remove(); });
      menu.appendChild(it);
    });
    document.body.appendChild(menu);
    var r=badge.getBoundingClientRect();
    menu.style.left=(window.pageXOffset+r.left)+'px'; menu.style.top=(window.pageYOffset+r.bottom+5)+'px';
    setTimeout(function(){ document.addEventListener('click', function cls(e){ if(!menu.contains(e.target)){ menu.remove(); document.removeEventListener('click', cls); } }); }, 0);
  }
  function rvSyncFromSource(rk, lang, badge){
    if(!tokenValid() || !badge || badge.getAttribute('data-rv-syncing')) return;
    var started=badge.getAttribute('data-rv')||'none';
    badge.setAttribute('data-rv-syncing','1');
    api('GET','file',{path:'content/'+lang+'/'+rk+'.md'}).then(function(r){
      if(r.status===401){ clearToken(); return null; }
      if(!r.ok) return null;
      return r.json();
    }).then(function(j){
      if(!j || !j.content) return;
      var status=rvStatusFromRaw(b64utf8(j.content));
      var map=rvCache(); (map[rk]=map[rk]||{})[lang]=status; rvSave(map);
      if((badge.getAttribute('data-rv')||'none')===started) rvStyle(badge, status);
    }).catch(function(){}).then(function(){ badge.removeAttribute('data-rv-syncing'); });
  }
  function paintCardBadges(){
    if(!hasCards) return;
    var lang=rvLang(), map=rvCache();
    document.querySelectorAll('[data-rk]').forEach(function(card){
      var rk=card.getAttribute('data-rk'), meta=card.querySelector('.card__meta'); if(!meta) return;
      var old=card.querySelector('.rv-badge'); if(old) old.remove(); // main.js 표시본 제거하고 인터랙티브로 교체
      var status=(map[rk]&&map[rk][lang])||'none';
      var b=document.createElement('span'); b.className='rv-badge'; rvStyle(b, status); b.title='검수 상태 — 클릭해서 변경(나만 보임)';
      b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); rvMenu(b, rk, lang); });
      meta.appendChild(b);
      rvSyncFromSource(rk, lang, b);
      var hb=document.createElement('span'); hb.className='sc-hide';
      var isHid=hidHas(rk); hideBtnStyle(hb, isHid);
      if (isHid){ card.style.opacity='.5'; card.style.filter='grayscale(.5)'; }
      hb.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation();
        var hide=!hidHas(rk);
        var ta=card.querySelector('.card__title a')||card.querySelector('a[href]'), tt=card.querySelector('.card__title');
        var info={ title:(tt?tt.textContent:rk).trim(), url:ta?ta.getAttribute('href'):'', lang:rvLang() };
        setCardHidden(rk, card, hb, hide, info);
      });
      meta.appendChild(hb);
    });
  }
  function pageSectionLang(){ var m=(CFG.path||'').match(/^content\/([a-z]+)\/([^/]+)\//); return m ? { lang:m[1], section:m[2] } : null; }
  /* 숨긴 글을 소유자에게만 '유령 카드'로 목록에 다시 띄움(공개 HTML엔 없음) → 배포 후에도 원클릭 해제 가능. */
  function paintHiddenGhosts(){
    if(!hasCards) return;
    var pl=pageSectionLang(); if(!pl) return;
    var list=document.querySelector('[data-list]')||document.querySelector('.cards'); if(!list) return;
    var items=hidGet();
    Object.keys(items).forEach(function(rk){
      var info=items[rk]||{};
      if (info.lang && info.lang!==pl.lang) return;        // 이 언어에서 숨긴 것만
      if (rk.split('/')[0]!==pl.section) return;            // 이 섹션 글만
      if (document.querySelector('[data-rk="'+rk+'"]')) return; // 미배포라 아직 DOM에 있으면 스킵
      var g=document.createElement('article'); g.className='card sc-ghost'; g.setAttribute('data-rk', rk);
      g.style.cssText='opacity:.66;border:1px dashed #B7E4C7;border-radius:14px;padding:8px 6px';
      var body=document.createElement('div'); body.className='card__body';
      var meta=document.createElement('div'); meta.className='card__meta';
      var lbl=document.createElement('span'); lbl.textContent='숨김됨(나만 보임)'; lbl.style.cssText='font-size:.66rem;font-weight:700;color:#1b7a3d;background:#E7F6EC;border:1px solid #B7E4C7;border-radius:6px;padding:2px 8px';
      var hb=document.createElement('span'); hb.className='sc-hide'; hideBtnStyle(hb, true);
      hb.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); setCardHidden(rk, g, hb, false, info); });
      meta.appendChild(lbl); meta.appendChild(hb);
      var h=document.createElement('h3'); h.className='card__title'; var a=document.createElement('a'); a.href=info.url||'#'; a.textContent=info.title||rk; h.appendChild(a);
      body.appendChild(meta); body.appendChild(h); g.appendChild(body); list.appendChild(g);
    });
  }
  function onReady(){ if (bodyEl||titleEl) btn.classList.add('show'); paintCardBadges(); paintHiddenGhosts(); }

  function bar(){
    var b = document.getElementById('scBar');
    if (b) return b;
    b = document.createElement('div'); b.id = 'scBar';
    b.innerHTML = '<span class="m"></span><button class="cancel">취소</button><button class="save">저장</button>';
    document.body.appendChild(b);
    b.querySelector('.save').addEventListener('click', save);
    b.querySelector('.cancel').addEventListener('click', function(){ if (confirm('편집 내용을 버리고 닫을까요?')) location.reload(); });
    var h = document.createElement('div'); h.id='scHint'; document.body.appendChild(h);
    return b;
  }

  function enterEdit(){
    if (editing) return;
    if (!tokenValid()){ ensureAuth().then(enterEdit).catch(function(e){ if(e&&e.message) alert('로그인 필요: '+e.message); }); return; }
    bar();
    msg('불러오는 중…'); document.getElementById('scBar').classList.add('show');
    api('GET','file',{path:CFG.path}).then(function(r){
      if (r.status===401){ clearToken(); throw new Error('세션 만료 — 편집을 다시 시작'); }
      if (!r.ok) throw new Error('불러오기 실패 ('+r.status+')');
      return r.json();
    }).then(function(j){
      var d = splitDoc(b64utf8(j.content));
      CUR = { sha: j.sha, hasFm: d.hasFm, fmFull: d.fmFull };
      editing = true; document.body.classList.add('sc-editing');
      if (titleEl){ titleEl.setAttribute('data-sc-edit','title'); titleEl.contentEditable = 'true'; }
      if (subEl){ subEl.setAttribute('data-sc-edit','sub'); subEl.contentEditable = 'true'; }
      if (bodyEditable){ bodyEl.setAttribute('data-sc-edit','body'); bodyEl.contentEditable = 'true';
        try{ bodyEl.querySelectorAll(SPECIAL).forEach(function(el){ el.contentEditable='false'; }); }catch(e){} // 특수 블록은 잠가서 구조 보호
      }
      var hint = document.getElementById('scHint');
      if (bodyHasRawHtml){ hint.textContent = '앱 카드·표 같은 특수 블록은 잠겨 있고 그대로 보존됩니다. 글·문단을 직접 고치세요.'; hint.classList.add('show'); }
      msg('점선 영역을 직접 고치세요 · ⌘/Ctrl+S 저장');
      // 자동 포커스 안 함 — 편집 진입 시 화면이 맨 위(제목)로 튀지 않게. 보던 자리에서 고칠 영역을 직접 클릭해 이어 편집.
    }).catch(function(e){ msg(''); document.getElementById('scBar').classList.remove('show'); alert(e.message); });
  }

  function buildRaw(turndown){
    var fm = CUR.fmFull;
    if (titleEl) fm = setField(fm, 'title', (titleEl.innerText||'').trim());
    if (subEl) fm = setField(fm, 'subtitle', (subEl.innerText||'').trim());
    if (bodyEditable){
      var md = turndown.turndown(bodyEl.innerHTML).replace(/^([ \t]*[-*]) {2,}/gm, '$1 ').replace(/\n{3,}/g,'\n\n').trim() + '\n';
      return fm + md;
    }
    // 본문 잠긴 글: 원본 본문 그대로 두고 front-matter만 갱신
    return fm + splitDoc(CUR._raw || '').body;
  }

  function save(){
    if (!CUR) return;
    var sv = document.querySelector('#scBar .save'); sv.disabled = true; var old = sv.textContent; sv.textContent = '저장 중…';
    ensureTurndown().then(function(){
      if (!td){ td = new window.TurndownService({ headingStyle:'atx', bulletListMarker:'-', codeBlockStyle:'fenced', emDelimiter:'_', hr:'---' });
        td.keep(function(node){ try{ return node.nodeType===1 && node.matches('.appcard, .poem, .cta, .stats, table, iframe, script, style'); }catch(e){ return false; } }); }
      // 본문 잠긴 글이면 원본 raw가 필요 → 없으면 다시 GET
      if (!bodyEditable && !CUR._raw){
        return api('GET','file',{path:CFG.path}).then(function(r){return r.json();}).then(function(j){ CUR._raw=b64utf8(j.content); CUR.sha=j.sha; });
      }
    }).then(function(){
      var content = buildRaw(td);
      return api('PUT','file',{ path: CFG.path, body: { content: utf8b64(content), sha: CUR.sha, message: 'edit: '+CFG.path } });
    }).then(function(r){ return r.json().then(function(j){ return {ok:r.ok,status:r.status,j:j}; }); })
    .then(function(res){
      if (!res.ok) throw new Error('저장 실패 ('+res.status+') '+((res.j&&res.j.message)||''));
      if (res.j.content && res.j.content.sha) CUR.sha = res.j.content.sha;
      var sy = window.pageYOffset || document.documentElement.scrollTop || 0; // 저장 직전 스크롤 위치
      // 편집 모드 종료(편집한 내용은 화면에 그대로 남겨 미리보기)
      editing = false; document.body.classList.remove('sc-editing');
      [titleEl,subEl,bodyEl].forEach(function(el){ if(el){ el.removeAttribute('contenteditable'); el.removeAttribute('data-sc-edit'); } });
      document.getElementById('scHint').classList.remove('show');
      msg('저장됨 ✓ 1~2분 뒤 실제 페이지에 반영됩니다.');
      window.scrollTo(0, sy); // 모드 종료로 스크롤이 움직였으면 보던 자리로 복원
      setTimeout(function(){ var b=document.getElementById('scBar'); if(b) b.classList.remove('show'); }, 4000);
    })
    .catch(function(e){ alert(e.message); })
    .then(function(){ sv.disabled=false; sv.textContent=old; });
  }

  btn.addEventListener('click', enterEdit);
  document.addEventListener('keydown', function(e){
    var mod = (e.ctrlKey||e.metaKey);
    if (mod && e.key.toLowerCase()==='s' && editing){ e.preventDefault(); save(); }
    else if (mod && e.key.toLowerCase()==='e' && !editing && btn.classList.contains('show')){ e.preventDefault(); enterEdit(); } // 단축키로 편집 진입
  });
  authInit(); // ★ 맨 끝에서 실행 — 위 모든 var(RV 등)·함수가 정의·할당된 뒤라야 paintCardBadges가 에러 없이 동작
})();
