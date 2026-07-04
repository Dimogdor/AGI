/* ================= MENU (DOM) ================= */
const $ = id => document.getElementById(id);
let menuFac = 'HUM', menuDiff = 1, menuSpeed = clampSpeed(SETTINGS.speed);
function netStatus(t){ const el=$('netStatus'); if (el) el.textContent = t; }
function closeNetUI(){ const el=$('onlinePanel'); if (el) el.style.display='none';
  if (typeof lobbyTimer!=='undefined' && lobbyTimer){ clearInterval(lobbyTimer); lobbyTimer=null; } }
function randCode(){ const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s='';
  for (let i=0;i<5;i++) s+=A[Math.floor(Math.random()*A.length)]; return s; }

document.querySelectorAll('.tab').forEach(tb=>{
  tb.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
    tb.classList.add('on');
    $('page-'+tb.dataset.page).classList.add('on');
    if (tb.dataset.page==='tuto') refreshTutoPage();
  });
});
$('cardHum').addEventListener('click', ()=>{ menuFac='HUM';
  $('cardHum').classList.add('sel'); $('cardIA').classList.remove('sel'); });
$('cardIA').addEventListener('click', ()=>{ menuFac='IA';
  $('cardIA').classList.add('sel'); $('cardHum').classList.remove('sel'); });
document.querySelectorAll('.diffBtn').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.diffBtn').forEach(x=>x.classList.remove('sel'));
    b.classList.add('sel'); menuDiff = +b.dataset.diff;
  });
});
// sélecteur de vitesse du menu : préférence offline + valeur par défaut du lobby en ligne
function refreshSpeedBtns(){
  document.querySelectorAll('.spdBtn').forEach(x=>x.classList.toggle('sel', +x.dataset.spd===menuSpeed));
}
document.querySelectorAll('.spdBtn').forEach(b=>{
  b.addEventListener('click', ()=>{
    menuSpeed = clampSpeed(+b.dataset.spd);
    SETTINGS.speed = menuSpeed; saveSettings();
    if (game && !game.net && !game.over) game.speed = menuSpeed;  // offline : applique immédiatement à la partie en cours
    refreshSpeedBtns();
  });
});
refreshSpeedBtns();
/* ---- plein écran : demande robuste + bascule manuelle (utile sur mobile après une sortie) ----
   iOS (iPhone surtout) n'IMPLÉMENTE PAS l'API Fullscreen : requestFullscreen y est sans effet.
   Le seul vrai plein écran sur iOS est « Ajouter à l'écran d'accueil » (mode standalone PWA).
   On détecte donc iOS pour ne pas proposer un bouton mort, mais guider l'utilisateur. */
const IS_IOS = /iP(hone|ad|od)/.test(navigator.platform)
  || /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.userAgent.includes('Mac') && (navigator.maxTouchPoints||0) > 1); // iPad iPadOS
const IS_STANDALONE = (navigator.standalone === true)
  || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
  || (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches);
let iosHintEl = null;
function iosHint(msg){
  if (!iosHintEl){
    iosHintEl = document.createElement('div');
    iosHintEl.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:60;'+
      'max-width:88vw;padding:10px 14px;border-radius:8px;background:rgba(16,13,12,0.95);'+
      'border:1px solid #4a3a32;color:#f0e6d6;font:600 13px/1.4 Arial;text-align:center;'+
      'box-shadow:0 4px 18px rgba(0,0,0,.5);pointer-events:none;';
    document.body.appendChild(iosHintEl);
  }
  iosHintEl.textContent = msg;
  iosHintEl.style.display = 'block';
  clearTimeout(iosHintEl._t);
  iosHintEl._t = setTimeout(()=>{ if (iosHintEl) iosHintEl.style.display='none'; }, 5200);
}
function goFullscreen(){
  if (IS_IOS) return;                  // API absente sur iOS : on ne tente rien (évite un échec muet)
  try {
    const el = document.documentElement;
    const fs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (fs && !isFullscreen()){
      const p = fs.call(el);
      if (p && p.then) p.then(()=>{ try{ screen.orientation.lock('landscape').catch(()=>{});}catch(e){} resize(); }).catch(()=>{});
    }
  } catch(e){}
}
function isFullscreen(){ return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function exitFullscreen(){ try { (document.exitFullscreen||document.webkitExitFullscreen||function(){}).call(document); } catch(e){} }
// le bouton flottant ⛶ n'apparaît que sur tactile et hors plein écran (sinon il encombre)
const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints>0);
function refreshFsBtn(){
  const b = $('fsBtn'); if (!b) return;
  // sur iOS déjà installé en appli, pas besoin de bouton ; sinon on garde le ⛶ comme aide
  if (IS_IOS && IS_STANDALONE){ b.style.display='none'; return; }
  b.textContent = (IS_IOS ? '⤢' : (isFullscreen()? '✕' : '⛶'));
  b.title = b.ariaLabel = tr('fs_btn');
  b.style.display = IS_TOUCH? 'block' : (isFullscreen()? 'none':'block');
  if (isFullscreen() && !IS_TOUCH) b.style.display='none';
}
$('fsBtn').addEventListener('click', ()=>{
  if (IS_IOS){ iosHint(tr('ios_fs_hint')); return; }
  if (isFullscreen()) exitFullscreen(); else goFullscreen();
  setTimeout(refreshFsBtn, 60);
});
document.addEventListener('fullscreenchange', ()=>{ resize(); refreshFsBtn(); });
document.addEventListener('webkitfullscreenchange', ()=>{ resize(); refreshFsBtn(); });
refreshFsBtn();
$('startBtn').addEventListener('click', ()=>{
  audioInit(); musicStart();
  goFullscreen();
  $('menu').style.display = 'none';
  pendingStart = {fac:menuFac, diff:menuDiff};
  intro = 0; introT = 0;
});
$('tutoStartBtn').addEventListener('click', startTutorial);
$('replayBtn').addEventListener('click', ()=>{
  $('endscreen').style.display = 'none';
  $('menu').style.display = 'flex';
  netDisconnect();
  game = null; paused = false; settingsOpen = false; netPause = null; buildMenu = null; selMode = false; selBox = null; intro = -1; pendingStart = null;
});
/* ---- mode en ligne : navigation entre les vues ---- */
let lobbyTimer = null;
function showNetView(v){
  for (const id of ['netHome','netCreate','netJoin','netHosting','netLobby']){
    const el=$(id); if (el) el.style.display = (id==='net'+v.charAt(0).toUpperCase()+v.slice(1))? 'flex':'none';
  }
  // le rappel « même version » et Annuler ne servent qu'en phase active
  if (lobbyTimer){ clearInterval(lobbyTimer); lobbyTimer=null; }
  if (v==='home'){ refreshLobbies(); lobbyTimer = setInterval(refreshLobbies, 5000); }
}
// LOBBY : les deux joueurs sont connectés ; chacun choisit son camp (miroirs permis), l'hôte lance.
function enterLobby(){
  if (!net) return;
  showNetView('lobby');
  const code = $('lobCode'); if (code) code.textContent = net.code || '-----';
  const isHost = net.role==='host';
  const sb=$('lobStart'); if (sb) sb.style.display = isHost? 'inline-block':'none';
  const lw=$('lobWait');  if (lw) lw.style.display = isHost? 'none':'block';
  netStatus('');
  refreshLobbyView();
}
function refreshLobbyView(){
  if (!net) return;
  document.querySelectorAll('.lobMe').forEach(b=>{
    const on = b.dataset.fac===net.myFac;
    b.classList.toggle('sel', on);
    b.classList.toggle('hum', b.dataset.fac==='HUM');
    b.classList.toggle('ia',  b.dataset.fac==='IA');
  });
  const foe=$('lobFoe');
  if (foe){
    if (net.foeFac){ foe.textContent = FACTIONS[net.foeFac].name; foe.style.color = FACTIONS[net.foeFac].accent; }
    else { foe.textContent = '…'; foe.style.color = '#888'; }
  }
  const st=$('lobFoeState');
  if (st){
    const mirror = net.myFac && net.foeFac && net.myFac===net.foeFac;
    st.textContent = !net.foeFac? t('lob_waiting')
                   : mirror? '⚔ '+t('lob_mirror')
                   : t('lob_ready');
    st.style.color = mirror? '#e8a06a' : '#9dc88a';
  }
}
function showHostingCode(code){
  const big=$('hostCodeBig'); if (big) big.textContent = code;
  const info=$('hostingInfo');
  if (info) info.textContent = (net && net.pub) ? t('net_listed') : t('net_private');
  showNetView('hosting');
}
async function refreshLobbies(){
  const box=$('lobbyList'); if (!box) return;
  if (!NET_CONFIG.firebaseDb){ box.innerHTML = '<div style="color:#7a7286;font-size:12px;text-align:center;padding:6px;">'+t('net_nolist')+'</div>'; return; }
  const list = await lobbyList();
  if (!list.length){ box.innerHTML = '<div style="color:#7a7286;font-size:12px;text-align:center;padding:6px;">'+t('net_empty')+'</div>'; return; }
  box.innerHTML = '';
  for (const l of list){
    const row=document.createElement('button'); row.className='pick';
    row.style.cssText='display:flex;justify-content:space-between;align-items:center;width:100%;text-align:left;font-size:13px;padding:7px 10px;';
    const nm = (l.name||fmt('net_room_fallback',{code:l.code})).slice(0,22);
    row.innerHTML = '<span>'+(l.hasPw?'🔒 ':'')+escapeHtml(nm)+'</span>'+
                    '<span style="color:#9dc88a;">×'+(l.speed||1)+' · '+escapeHtml(l.code)+' →</span>';
    row.addEventListener('click', ()=> joinLobby(l));
    box.appendChild(row);
  }
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function joinLobby(l){
  audioInit();
  let pw = '';
  if (l.hasPw){ pw = (prompt(t('net_askpw'))||'').trim(); if (!pw) return; }
  showNetView('join'); $('joinCode').value = l.code; $('joinPw').value = pw;
  netConnect('guest', l.code, menuFac, { pw });
}
$('onlineBtn').addEventListener('click', ()=>{
  const pan = $('onlinePanel');
  const opening = pan.style.display==='none';
  pan.style.display = opening? 'flex':'none';
  netStatus('');
  if (opening) showNetView('home'); else if (lobbyTimer){ clearInterval(lobbyTimer); lobbyTimer=null; }
});
$('goCreate').addEventListener('click', ()=>{ netStatus(''); refreshLobSpeed(); showNetView('create'); });
$('goJoin').addEventListener('click',  ()=>{ netStatus(''); showNetView('join'); });
$('createBack').addEventListener('click', ()=>{ netDisconnect(); netStatus(''); showNetView('home'); });
$('joinBack').addEventListener('click',   ()=>{ netDisconnect(); netStatus(''); showNetView('home'); });
// lobby : choix de camp (envoie le changement à l'adversaire), lancement (hôte), départ
document.querySelectorAll('.lobMe').forEach(b=>{
  b.addEventListener('click', ()=>{
    if (!net || game) return;
    net.myFac = b.dataset.fac;
    refreshLobbyView();
    if (net.conn && net.conn.open) net.sendLF({ fac: net.myFac });
  });
});
$('lobStart').addEventListener('click', ()=>{ if (net && net.role==='host' && net.peer && !game) startHostGame(); });
$('lobLeave').addEventListener('click', ()=>{ netDisconnect(); netStatus(''); showNetView('home'); });
$('netCancel').addEventListener('click', ()=>{ netDisconnect(); netStatus(''); showNetView('home'); });
$('lobbyRefresh').addEventListener('click', refreshLobbies);
// sélecteur de vitesse du lobby (partage menuSpeed avec l'onglet Jouer)
function refreshLobSpeed(){ document.querySelectorAll('.lobSpd').forEach(x=>x.classList.toggle('sel', +x.dataset.spd===menuSpeed)); }
document.querySelectorAll('.lobSpd').forEach(b=>{
  b.addEventListener('click', ()=>{ menuSpeed = clampSpeed(+b.dataset.spd); SETTINGS.speed=menuSpeed; saveSettings();
    refreshLobSpeed(); refreshSpeedBtns(); });
});
$('hostBtn').addEventListener('click', ()=>{
  audioInit();
  const custom = ($('hostCode').value||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  const code = custom.length>=3? custom : randCode();
  const name = ($('lobbyName').value||'').trim();
  const pw   = ($('hostPw').value||'').trim();
  const pub  = $('lobbyPublic').checked;
  netConnect('host', code, menuFac, { name, pw, pub, speed:menuSpeed });
});
$('joinBtn').addEventListener('click', ()=>{
  audioInit();
  const code = ($('joinCode').value||'').trim().toUpperCase();
  if (code.length<3){ netStatus(t('net_entercode')); return; }
  const pw = ($('joinPw').value||'').trim();
  netConnect('guest', code, menuFac, { pw });
});
$('copyCode').addEventListener('click', ()=>{
  const code = $('hostCodeBig').textContent||'';
  const done = ()=>{ const b=$('copyCode'); if(b){ const o=b.textContent; b.textContent='✓ '+t('net_copied'); setTimeout(()=>b.textContent=o,1500);} };
  if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(code).then(done).catch(done); }
  else done();
});
$('netCancel').addEventListener('click', ()=>{ netDisconnect(); netStatus(t('net_cancelled')); showNetView('home'); });

/* ---------- Paramètres ---------- */
function refreshOpts(){
  const on=t('on').toUpperCase(), off=t('off').toUpperCase();
  const set = (id,v)=>{ const el=$(id); if(!el) return; el.classList.toggle('on',v); el.textContent = v? on:off; };
  set('oMusic', SETTINGS.music);
  set('oSfx', SETTINGS.sfx);
  set('oShake', SETTINGS.shake);
  $('oVol').value = Math.round(SETTINGS.vol*100);
  $('oVolV').textContent = Math.round(SETTINGS.vol*100)+'%';
  const oq=$('oQuality'); if (oq){ oq.classList.add('on'); oq.textContent = qualityName().toUpperCase(); }
}
$('oMusic').addEventListener('click', ()=>{ SETTINGS.music=!SETTINGS.music; saveSettings(); refreshOpts(); });
$('oSfx').addEventListener('click', ()=>{ SETTINGS.sfx=!SETTINGS.sfx; saveSettings(); refreshOpts(); });
$('oShake').addEventListener('click', ()=>{ SETTINGS.shake=!SETTINGS.shake; saveSettings(); refreshOpts(); });
$('oVol').addEventListener('input', ()=>{ SETTINGS.vol=clamp($('oVol').value/100,0,1); saveSettings(); refreshOpts(); });
$('oQuality').addEventListener('click', ()=>{ cycleQuality(); refreshOpts(); });
$('langSel').addEventListener('change', ()=>{ SETTINGS.lang=$('langSel').value; saveSettings(); applyLang(); });
applyLang();
refreshOpts();

/* ---------- CHOIX DE LANGUE AU PREMIER LANCEMENT ---------- */
// Une seule fois : avant même de voir le menu, on demande la langue (avec une présélection
// intelligente si la langue du navigateur fait partie des 9 gérées). Reste modifiable à tout
// moment dans PARAMÈTRES → Langue (select #langSel, inchangé).
const LANG_NATIVE = { fr:'Français', en:'English', es:'Español', de:'Deutsch', it:'Italiano',
  pt:'Português', ru:'Русский', zh:'中文', ar:'العربية' };
// cycle de langue (utilisé par la pause en jeu ⚙, où un <select> n'est pas pratique en canvas)
function cycleLang(){
  const codes = Object.keys(LANG_NATIVE), i = codes.indexOf(SETTINGS.lang);
  SETTINGS.lang = codes[(i+1+codes.length)%codes.length] || codes[0];
  saveSettings(); applyLang();
}
function buildLangPicker(){
  const grid = $('langPickGrid'); if (!grid) return;
  grid.innerHTML = '';
  for (const code in LANG_NATIVE){
    const b = document.createElement('button');
    b.className = 'pick'; b.textContent = LANG_NATIVE[code];
    b.style.cssText = 'font-size:16px;padding:13px 26px;';
    b.addEventListener('click', ()=>{
      SETTINGS.lang = code; saveSettings(); applyLang();
      try { localStorage.setItem('agi_langChosen','1'); } catch(e){}
      $('langPick').style.display = 'none';
    });
    grid.appendChild(b);
  }
}
(function maybeAskLanguage(){
  let chosen = '1';
  try { chosen = localStorage.getItem('agi_langChosen'); } catch(e){}
  if (chosen) return;                                  // déjà choisi (ou relance) : ne redemande jamais
  buildLangPicker();
  // présélection : langue du navigateur si elle fait partie des 9 gérées, sinon FR par défaut
  const nav = ((navigator.language||'fr').slice(0,2)).toLowerCase();
  if (LANG_NATIVE[nav]){ SETTINGS.lang = nav; saveSettings(); applyLang(); }
  $('langPick').style.display = 'flex';
})();

/* ---------- À PROPOS : avis (étoiles + texte) et rapport de bug ---------- */
// Tout passe par l'application e-mail de l'utilisateur (mailto préréempli) : fonctionne
// hors-ligne, sans serveur, sur web / APK / PC.
let fbRating = 0;
function refreshStars(){
  document.querySelectorAll('#fbStars button').forEach((b,i)=>{
    const on = i<fbRating;
    b.classList.toggle('on', on); b.textContent = on? '★':'☆';
  });
}
document.querySelectorAll('#fbStars button').forEach((b,i)=>{
  b.addEventListener('click', ()=>{ fbRating = (fbRating===i+1)? 0 : i+1; refreshStars(); });
});
refreshStars();
function gameVersion(){ const v=$('verTag'); return v? v.textContent.trim() : 'AGI'; }
function openMail(subject, body){
  location.href = 'mailto:dimdevche@gmail.com?subject='+encodeURIComponent(subject)
                + '&body='+encodeURIComponent(body);
}
const fbEl = $('fbSend');
if (fbEl) fbEl.addEventListener('click', ()=>{
  const txt = ($('fbText').value||'').trim();
  const stars = fbRating? '★'.repeat(fbRating)+'☆'.repeat(5-fbRating)+' ('+fbRating+'/5)\n\n' : '';
  openMail('[AGI] '+t('about_subj_fb'), stars + txt + '\n\n— '+gameVersion());
});
const bugEl = $('fbBug');
if (bugEl) bugEl.addEventListener('click', ()=>{
  const txt = ($('fbText').value||'').trim();
  openMail('[AGI] '+t('about_subj_bug'),
    (txt || t('about_bug_tpl')) + '\n\n— '+gameVersion()+'\n— '+navigator.userAgent);
});
/* ---------- Touches reconfigurables ---------- */
let keyWait = null;
function keyName(code){
  if (!code) return '?';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  // touches à glyphe universel (flèches, +/−) : jamais traduites, déjà comprises partout
  const glyph = {ArrowLeft:'←', ArrowRight:'→', ArrowUp:'↑', ArrowDown:'↓', Equal:'+', Minus:'−', Tab:'Tab'};
  if (glyph[code]) return glyph[code];
  const map = {Space:'kn_space', Escape:'kn_escape', NumpadAdd:'kn_numadd', NumpadSubtract:'kn_numsub',
    ShiftLeft:'kn_shiftl', ShiftRight:'kn_shiftr', ControlLeft:'kn_ctrll', ControlRight:'kn_ctrlr',
    Enter:'kn_enter', Backspace:'kn_backspace'};
  return map[code]? tr(map[code]) : code;
}
function buildKeysBox(){
  const box = $('keysBox'); if (!box) return; box.innerHTML='';
  for (const k in DEFKEYS){
    const row = document.createElement('div'); row.className='setRow';
    const sp = document.createElement('span'); sp.textContent = keyLabel(k);
    const bt = document.createElement('button'); bt.className='keyBtn';
    bt.textContent = keyName(SETTINGS.keys[k]);
    bt.addEventListener('click', ()=>{
      document.querySelectorAll('.keyBtn').forEach(b=>b.classList.remove('wait'));
      keyWait = {k, bt}; bt.classList.add('wait'); bt.textContent='…';
    });
    row.appendChild(sp); row.appendChild(bt); box.appendChild(row);
  }
  const row = document.createElement('div'); row.className='setRow';
  const sp = document.createElement('span'); sp.textContent = tr('keys_reset');
  const bt = document.createElement('button'); bt.className='keyBtn'; bt.textContent = tr('keys_default');
  bt.addEventListener('click', ()=>{ SETTINGS.keys = Object.assign({},DEFKEYS); saveSettings(); buildKeysBox(); });
  row.appendChild(sp); row.appendChild(bt); box.appendChild(row);
}
buildKeysBox();
