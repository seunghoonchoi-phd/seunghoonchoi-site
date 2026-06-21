/* in-place editor — 실제 페이지에 떠 있는 "편집" 버튼 → 사이트 스타일로 보며 편집 → Worker로 커밋.
   본인 브라우저(admin 설정 localStorage 보유)에서만 로드됨. front-matter 로직은 /admin 과 동일(단위테스트 11/11). */
(function () {
  if (window.__scEdit) return; window.__scEdit = true;
  var CFG = window.SC_EDIT || {};
  var WORKER = (localStorage.getItem('sc_admin_worker') || '').replace(/\/+$/, '');
  var CLIENT = (localStorage.getItem('sc_admin_google_client') || '').trim();
  var ALLOWED = 'herring2141@gmail.com';
  if (!WORKER || !CLIENT || !CFG.path) return;

  /* ---- front-matter helpers (same as /admin) ---- */
  function splitDoc(raw){ if(!/^---\r?\n/.test(raw)) return {hasFm:false,fmFull:'',body:raw}; var m=raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/); if(!m) return {hasFm:false,fmFull:'',body:raw}; return {hasFm:true,fmFull:m[0],body:raw.slice(m[0].length)}; }
  function getField(fm,k){ var m=fm.match(new RegExp('^'+k+':[ \\t]*(.*)$','m')); if(!m) return null; var v=m[1].trim(); if((v.charAt(0)=='"'&&v.slice(-1)=='"')||(v.charAt(0)=="'"&&v.slice(-1)=="'")) v=v.slice(1,-1); return v.replace(/\\"/g,'"'); }
  function setField(fm,k,val){ var line=k+': "'+String(val).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"'; var re=new RegExp('^'+k+':[ \\t]*.*$','m'); if(re.test(fm)) return fm.replace(re,line); if(k=='subtitle'){ var tre=/^(title:.*)$/m; if(tre.test(fm)) return fm.replace(tre,'$1\n'+line); } return fm.replace(/(\r?\n---\r?\n)$/,'\n'+line+'$1'); }
  function b64utf8(b64){ var bin=atob((b64||'').replace(/\s/g,'')); return new TextDecoder('utf-8').decode(Uint8Array.from(bin,function(c){return c.charCodeAt(0);})); }
  function utf8b64(str){ var by=new TextEncoder().encode(str); var s=''; by.forEach(function(b){ s+=String.fromCharCode(b); }); return btoa(s); }
  function esc(s){ return (s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  /* ---- styles ---- */
  var css = ''
  + '#scEditBtn{position:fixed;top:90px;right:18px;z-index:9000;font:600 14px/1 "Kumbh Sans",system-ui,sans-serif;'
  + 'background:#0D1B4C;color:#fff;border:0;border-radius:999px;padding:10px 16px;cursor:pointer;box-shadow:0 6px 20px rgba(13,27,76,.28);opacity:.92}'
  + '#scEditBtn:hover{opacity:1;transform:translateY(-1px)}'
  + '#scEditWrap{position:fixed;inset:0;z-index:9001;display:none}'
  + '#scEditWrap.on{display:block}'
  + '#scEditWrap .ov{position:absolute;inset:0;background:rgba(13,27,76,.28)}'
  + '#scEditDr{position:absolute;top:0;right:0;height:100%;width:min(680px,94vw);background:#F8F6F3;box-shadow:-12px 0 40px rgba(13,27,76,.22);display:flex;flex-direction:column}'
  + '#scEditDr .hd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px;background:#0D1B4C;color:#fff}'
  + '#scEditDr .hd b{font:600 15px/1.3 "Kumbh Sans",sans-serif}'
  + '#scEditDr .hd .pth{font:400 11.5px/1.3 ui-monospace,monospace;color:#C7C9D6;word-break:break-all}'
  + '#scEditDr .tabs{display:flex;gap:2px;background:#EEF0F6;margin:12px 18px 0;border-radius:10px;padding:3px;align-self:flex-start}'
  + '#scEditDr .tab{font:700 13px/1 "Kumbh Sans",sans-serif;border:0;background:transparent;color:#0D1B4C;padding:7px 14px;border-radius:8px;cursor:pointer}'
  + '#scEditDr .tab.on{background:#fff;box-shadow:0 1px 3px rgba(13,27,76,.12)}'
  + '#scEditDr .bd{flex:1;overflow:auto;padding:14px 18px 0}'
  + '#scEditDr label{display:block;font:600 12px/1 "Kumbh Sans",sans-serif;color:#44423E;margin:12px 0 5px}'
  + '#scEditDr input,#scEditDr textarea{width:100%;border:1.5px solid rgba(13,27,76,.14);border-radius:10px;background:#fff;font-family:inherit;padding:10px 12px}'
  + '#scEditDr input{font-size:15px}'
  + '#scEditDr #scTitle{font-weight:700;color:#0D1B4C;font-size:18px}'
  + '#scEditDr textarea{font-family:ui-monospace,Consolas,monospace;font-size:13.5px;line-height:1.7;min-height:48vh;resize:vertical}'
  + '#scEditDr .tbar{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 0}'
  + '#scEditDr .tbar button{font:700 13px/1 "Kumbh Sans",sans-serif;border:1.5px solid rgba(13,27,76,.14);background:#fff;color:#0D1B4C;border-radius:8px;padding:6px 10px;cursor:pointer}'
  + '#scEditDr .pv{display:none;background:#fff;border:1.5px solid rgba(13,27,76,.14);border-radius:12px;padding:24px 26px;min-height:48vh}'
  + '#scEditDr .pv.on{display:block} #scEditDr .ed.off{display:none}'
  + '#scEditDr .pv h1{font:700 1.7rem/1.15 "Playfair Display",Georgia,serif;color:#0D1B4C;margin:0 0 .15em}'
  + '#scEditDr .pv .sub{font:italic 400 1.05rem/1.4 "Playfair Display",Georgia,serif;color:#2C3A78;margin-bottom:1.1em}'
  + '#scEditDr .pv h2{font:600 1.35rem/1.2 "Playfair Display",Georgia,serif;color:#1B1B1A;margin:1.5em 0 .4em;border-top:1px solid rgba(13,27,76,.12);padding-top:.7em}'
  + '#scEditDr .pv h3{font:600 1.12rem/1.25 "Playfair Display",Georgia,serif;margin:1.2em 0 .3em}'
  + '#scEditDr .pv p{margin:.7em 0;font-size:1.02rem;line-height:1.8;color:#1B1B1A}'
  + '#scEditDr .pv img{max-width:100%;border-radius:10px;margin:.6em 0}'
  + '#scEditDr .pv blockquote{border-left:3px solid #B87333;margin:1em 0;padding:.2em 0 .2em 16px;font-style:italic;color:#44423E}'
  + '#scEditDr .pv a{color:#B87333} #scEditDr .pv strong{color:#0D1B4C}'
  + '#scEditDr .pv ul,#scEditDr .pv ol{margin:.5em 0 .5em 1.3em}'
  + '#scEditDr .ft{display:flex;align-items:center;gap:10px;padding:14px 18px;border-top:1px solid rgba(13,27,76,.12);background:#FCFBF9}'
  + '#scEditDr .ft button{font:600 14px/1 "Kumbh Sans",sans-serif;border:0;border-radius:10px;padding:10px 18px;cursor:pointer}'
  + '#scSave{background:#0D1B4C;color:#fff} #scClose{background:#fff;color:#0D1B4C;border:1.5px solid rgba(13,27,76,.14)!important}'
  + '#scEditDr .ft .msg{font:400 13px/1.4 "Kumbh Sans",sans-serif;color:#8A857C}'
  + '#scAuth{padding:30px 18px;text-align:center}'
  + '#scAuth p{font:400 14px/1.6 "Kumbh Sans",sans-serif;color:#44423E;margin-bottom:14px}'
  + '#scAuthBtn{display:flex;justify-content:center;min-height:44px}'
  + '@media(max-width:560px){#scEditDr textarea,#scEditDr .pv{min-height:40vh}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---- floating button ---- */
  var btn = document.createElement('button'); btn.id = 'scEditBtn'; btn.type = 'button'; btn.textContent = '✎ 편집'; btn.title = '이 페이지 편집';
  document.body.appendChild(btn);

  /* ---- state ---- */
  var ID_TOKEN = null, CUR = null, view = 'edit', drawer = null;
  try { var t = JSON.parse(sessionStorage.getItem('sc_edit_tok') || 'null'); if (t && t.exp * 1000 > Date.now() + 60000) ID_TOKEN = t.token; } catch (e) {}

  function loadScript(src){ return new Promise(function(res,rej){ var s=document.createElement('script'); s.src=src; s.async=true; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
  function ensureGIS(){ return (window.google&&google.accounts&&google.accounts.id)?Promise.resolve():loadScript('https://accounts.google.com/gsi/client'); }
  function ensureMarked(){ return window.marked?Promise.resolve():loadScript('https://cdn.jsdelivr.net/npm/marked@12/marked.min.js'); }
  function decodeJwt(t){ return JSON.parse(b64utf8(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); }

  function signIn(){
    return ensureGIS().then(function(){ return new Promise(function(resolve,reject){
      google.accounts.id.initialize({ client_id: CLIENT, auto_select: true, cancel_on_tap_outside: false, callback: function(resp){
        try{
          var c = decodeJwt(resp.credential);
          if ((c.email||'').toLowerCase() !== ALLOWED){ setMsg('권한 없는 계정: '+(c.email||'?'), true); reject(new Error('forbidden')); return; }
          ID_TOKEN = resp.credential;
          try{ sessionStorage.setItem('sc_edit_tok', JSON.stringify({ token: ID_TOKEN, exp: c.exp })); }catch(e){}
          resolve();
        }catch(e){ reject(e); }
      }});
      var holder = document.getElementById('scAuthBtn');
      if (holder){ holder.innerHTML=''; google.accounts.id.renderButton(holder,{theme:'filled_blue',size:'large',shape:'pill',text:'continue_with',width:280}); }
      google.accounts.id.prompt();
    }); });
  }

  function api(method, seg, opts){
    opts = opts || {};
    var u = WORKER + '/' + seg + (opts.path ? ('?path=' + encodeURIComponent(opts.path)) : '');
    return fetch(u, { method: method, headers: Object.assign({ 'Authorization': 'Bearer ' + ID_TOKEN }, opts.body ? { 'Content-Type': 'application/json' } : {}), body: opts.body ? JSON.stringify(opts.body) : undefined });
  }

  function setMsg(m, err){ var e = drawer && drawer.querySelector('.msg'); if (e){ e.textContent = m || ''; e.style.color = err ? '#b3261e' : '#8A857C'; } }

  function buildDrawer(){
    drawer = document.createElement('div'); drawer.id = 'scEditWrap';
    drawer.innerHTML =
      '<div class="ov"></div><div id="scEditDr">'
      + '<div class="hd"><div><b>이 페이지 편집</b><div class="pth">'+esc(CFG.path)+'</div></div><button id="scX" style="background:none;border:0;color:#fff;font-size:20px;cursor:pointer">×</button></div>'
      + '<div id="scAuth"><p>편집하려면 Google 로그인이 필요합니다.</p><div id="scAuthBtn"></div></div>'
      + '<div id="scMain" style="display:none;flex:1;display:none;flex-direction:column;min-height:0">'
      + '  <div class="tabs"><button class="tab on" data-v="edit">편집</button><button class="tab" data-v="preview">미리보기</button></div>'
      + '  <div class="bd">'
      + '    <div class="ed"><label>제목</label><input id="scTitle" type="text"><div id="scSubWrap"><label>부제</label><input id="scSub" type="text"></div>'
      + '      <div class="tbar"><button data-md="bold"><b>B</b></button><button data-md="h2">H2</button><button data-md="h3">H3</button><button data-md="link">🔗</button><button data-md="ul">• 목록</button></div>'
      + '      <label>본문</label><textarea id="scBody" spellcheck="false"></textarea></div>'
      + '    <div class="pv"></div>'
      + '  </div>'
      + '  <div class="ft"><button id="scSave">저장 (커밋)</button><button id="scClose">닫기</button><span class="msg"></span></div>'
      + '</div></div>';
    document.body.appendChild(drawer);
    drawer.querySelector('.ov').addEventListener('click', close);
    drawer.querySelector('#scX').addEventListener('click', close);
    drawer.querySelector('#scClose').addEventListener('click', close);
    drawer.querySelector('#scSave').addEventListener('click', save);
    drawer.querySelectorAll('.tab').forEach(function(b){ b.addEventListener('click', function(){ setView(b.dataset.v); }); });
    drawer.querySelector('.tbar').addEventListener('click', function(e){ var b=e.target.closest('button[data-md]'); if(b) md(b.dataset.md); });
    drawer.querySelector('#scBody').addEventListener('input', function(){ if(view==='preview') renderPreview(); });
    drawer.querySelector('#scTitle').addEventListener('input', function(){ if(view==='preview') renderPreview(); });
    drawer.querySelector('#scSub').addEventListener('input', function(){ if(view==='preview') renderPreview(); });
  }

  function setView(v){
    view = v;
    drawer.querySelectorAll('.tab').forEach(function(b){ b.classList.toggle('on', b.dataset.v===v); });
    drawer.querySelector('.ed').classList.toggle('off', v==='preview');
    drawer.querySelector('.pv').classList.toggle('on', v==='preview');
    if (v==='preview') renderPreview();
  }

  function renderPreview(){
    var pv = drawer.querySelector('.pv');
    var title = drawer.querySelector('#scTitle').value, sub = drawer.querySelector('#scSub').value, body = drawer.querySelector('#scBody').value;
    var html = '';
    if (title) html += '<h1>'+esc(title)+'</h1>';
    if (sub) html += '<div class="sub">'+esc(sub)+'</div>';
    if (window.marked){ try{ html += marked.parse(body||''); }catch(e){ html += '<p style="color:#b3261e">미리보기 오류</p>'; } }
    pv.innerHTML = html;
  }

  function md(kind){
    var ta = drawer.querySelector('#scBody'); var s=ta.selectionStart, e=ta.selectionEnd, val=ta.value, sel=val.slice(s,e);
    function wrap(a,b,ph){ var t=sel||ph; ta.value=val.slice(0,s)+a+t+b+val.slice(e); ta.focus(); ta.selectionStart=s+a.length; ta.selectionEnd=s+a.length+t.length; }
    function pre(p){ var ls=val.lastIndexOf('\n',s-1)+1; ta.value=val.slice(0,ls)+p+val.slice(ls); ta.focus(); ta.selectionStart=ta.selectionEnd=s+p.length; }
    if(kind==='bold') wrap('**','**','굵게'); else if(kind==='h2') pre('## '); else if(kind==='h3') pre('### '); else if(kind==='ul') pre('- ');
    else if(kind==='link'){ var u=prompt('링크 URL:','https://'); if(u) wrap('[',']('+u+')','링크 텍스트'); }
    if(view==='preview') renderPreview();
  }

  function open(){
    if (!drawer) buildDrawer();
    drawer.classList.add('on');
    if (!ID_TOKEN){
      drawer.querySelector('#scAuth').style.display='block';
      drawer.querySelector('#scMain').style.display='none';
      signIn().then(loadFile).catch(function(){});
    } else { loadFile(); }
  }
  function close(){ if (drawer) drawer.classList.remove('on'); }

  function loadFile(){
    drawer.querySelector('#scAuth').style.display='none';
    var main = drawer.querySelector('#scMain'); main.style.display='flex';
    setMsg('불러오는 중…');
    ensureMarked();
    api('GET','file',{path:CFG.path}).then(function(r){
      if (r.status===401){ ID_TOKEN=null; try{sessionStorage.removeItem('sc_edit_tok');}catch(e){} drawer.querySelector('#scAuth').style.display='block'; main.style.display='none'; signIn().then(loadFile); throw new Error('401'); }
      if (!r.ok) throw new Error('불러오기 실패 ('+r.status+')');
      return r.json();
    }).then(function(j){
      var raw = b64utf8(j.content); var d = splitDoc(raw);
      CUR = { sha: j.sha, hasFm: d.hasFm, fmFull: d.fmFull };
      drawer.querySelector('#scTitle').value = d.hasFm ? (getField(d.fmFull,'title')||'') : '';
      var sub = d.hasFm ? getField(d.fmFull,'subtitle') : null;
      drawer.querySelector('#scSub').value = sub || '';
      drawer.querySelector('#scSubWrap').style.display = (d.hasFm && sub===null) ? 'none' : 'block';
      drawer.querySelector('#scBody').value = d.hasFm ? d.body : raw;
      setView('edit'); setMsg('');
    }).catch(function(e){ if (e.message!=='401') setMsg(e.message, true); });
  }

  function currentRaw(){
    if (!CUR.hasFm) return drawer.querySelector('#scBody').value;
    var fm = setField(CUR.fmFull, 'title', drawer.querySelector('#scTitle').value);
    var sub = drawer.querySelector('#scSub').value;
    if (sub !== '' || getField(CUR.fmFull,'subtitle')!==null) fm = setField(fm, 'subtitle', sub);
    return fm + drawer.querySelector('#scBody').value;
  }

  function save(){
    if (!CUR) return;
    var b = drawer.querySelector('#scSave'); b.disabled=true; var old=b.textContent; b.textContent='저장 중…';
    api('PUT','file',{ path: CFG.path, body: { content: utf8b64(currentRaw()), sha: CUR.sha, message: 'edit: '+CFG.path } })
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok,status:r.status,j:j}; }); })
      .then(function(res){
        if (!res.ok) throw new Error('저장 실패 ('+res.status+') '+((res.j&&res.j.message)||''));
        if (res.j.content && res.j.content.sha) CUR.sha = res.j.content.sha;
        setMsg('저장됨 ✓ 1~2분 뒤 페이지에 반영됩니다.');
      })
      .catch(function(e){ if (e.message!=='401') setMsg(e.message, true); })
      .then(function(){ b.disabled=false; b.textContent=old; });
  }

  btn.addEventListener('click', open);
  document.addEventListener('keydown', function(e){ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s' && drawer && drawer.classList.contains('on')){ e.preventDefault(); save(); } });
})();
