/* ================= VOIX OFF (v1.16) =================
   Les répliques des cinématiques et de la radio de campagne sont dites par des voix
   enregistrées à l'avance (synthèse neuronale hors ligne, voir tools/voice/README.md) :
     assets/voice/<langue>/index.json   { v, lang, lines:{ <empreinte>: durée en s } }
     assets/voice/<langue>/<empreinte>.mp3
   L'empreinte d'une réplique = voiceKey(langue, qui, texte affiché) : FNV-1a 32 bits de
   « langue|qui|texte » (UTF-8), en hexadécimal — MÊME algorithme que tools/voice/hash.mjs.
   Un texte réécrit change d'empreinte : tant que la voix n'est pas régénérée, la réplique reste
   simplement muette (jamais de voix décalée du texte).
   Lecture : WebAudio (fetch + decodeAudioData), musique baissée pendant la réplique, effet radio
   (passe-bande) pour les transmissions. Indisponible sans serveur (file:// d'un navigateur) :
   le jeu reste muet, sans erreur. */
const VOICE_DIR = 'assets/voice/';
const VOICE = { idx:{}, load:{}, bufs:new Map(), cur:null, out:null, duck:null, iv:0, plays:0 };
const VOICE_UI = {
  set:   {fr:"Voix off", en:"Voice-over", es:"Voz en off", de:"Sprecherstimmen", it:"Voce narrante", pt:"Narração", ru:"Озвучка", zh:"配音", ar:"التعليق الصوتي"},
  vol:   {fr:"Volume des voix", en:"Voice volume", es:"Volumen de voz", de:"Lautstärke Stimmen", it:"Volume voci", pt:"Volume das vozes", ru:"Громкость голосов", zh:"配音音量", ar:"مستوى الصوت"},
  none:  {fr:"indisponible ici (version hors ligne)", en:"unavailable here (offline file)", es:"no disponible aquí (archivo local)", de:"hier nicht verfügbar (lokale Datei)", it:"non disponibile qui (file locale)", pt:"indisponível aqui (ficheiro local)", ru:"недоступно (локальный файл)", zh:"此版本不可用（本地文件）", ar:"غير متاح هنا (ملف محلي)"},
};
// libellés du menu (data-i18n) : ajoutés aux tables de 02-i18n.js
for (const L of LANG_CODES) if (I18N[L]){ I18N[L].set_voice = VOICE_UI.set[L]; I18N[L].set_voicevol = VOICE_UI.vol[L]; }

function voiceHash(s){
  const b = new TextEncoder().encode(String(s)); let h = 0x811c9dc5;
  for (let i=0;i<b.length;i++){ h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return ('0000000'+h.toString(16)).slice(-8);
}
const voiceKey = (lang, who, text) => voiceHash(lang+'|'+who+'|'+text);
// on ne tente le réseau que là où il peut aboutir : web (http/s), Capacitor, Electron (file:// + XHR)
function voiceCanFetch(){
  try { const p = location.protocol;
    if (/^(https?|capacitor|app|ionic):$/.test(p)) return true;
    return p==='file:' && /Electron/.test(navigator.userAgent||'');
  } catch(e){ return false; }
}
function voiceGet(url, type){
  if (location.protocol!=='file:' && typeof fetch==='function')
    return fetch(url, {cache:'no-cache'}).then(r => r.ok? (type==='json'? r.json() : r.arrayBuffer()) : null).catch(()=>null);
  return new Promise(res => { try { const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = type==='json'? 'json' : 'arraybuffer';
    x.onload = () => res((x.status===200 || x.status===0) && x.response? x.response : null); x.onerror = () => res(null); x.send(); } catch(e){ res(null); } });
}
// table des répliques d'une langue : objet, null (aucune voix) ou undefined (chargement en cours)
function voiceIndex(L){
  L = L || SETTINGS.lang;
  if (VOICE.idx[L]!==undefined) return VOICE.idx[L];
  if (!voiceCanFetch()){ VOICE.idx[L] = null; return null; }
  if (!VOICE.load[L]) VOICE.load[L] = voiceGet(VOICE_DIR+L+'/index.json', 'json').then(j => {
    const m = j && typeof j==='object'? (j.lines && typeof j.lines==='object'? j.lines : j) : null;
    VOICE.idx[L] = m && Object.keys(m).length? m : null; return VOICE.idx[L]; });
  return undefined;
}
const voiceText = txt => typeof txt==='string'? txt : cT(txt);
// durée (s) de la réplique dans la langue courante, 0 si elle n'a pas de voix
function voiceDur(who, txt){
  if (!SETTINGS.voice || !who) return 0;
  const idx = voiceIndex(); if (!idx) return 0;
  const d = +idx[voiceKey(SETTINGS.lang, who, voiceText(txt))]; return d>0? d : 0;
}
// décodage (mis en cache, borné) : promesse d'un AudioBuffer ou de null
function voiceBuf(L, k){
  const id = L+'/'+k; let p = VOICE.bufs.get(id);
  if (p){ VOICE.bufs.delete(id); VOICE.bufs.set(id, p); return p; }
  p = voiceGet(VOICE_DIR+L+'/'+k+'.mp3', 'ab').then(ab => (ab && AC)? new Promise(res => {
      try { const q = AC.decodeAudioData(ab, res, () => res(null)); if (q && q.catch) q.catch(() => res(null)); } catch(e){ res(null); } }) : null);
  VOICE.bufs.set(id, p);
  while (VOICE.bufs.size > 32) VOICE.bufs.delete(VOICE.bufs.keys().next().value);
  return p;
}
// précharge quelques répliques à venir [{who, txt}]
function voicePrefetch(list){
  if (!SETTINGS.voice || !AC || !list) return;
  const idx = voiceIndex(); if (!idx) return;
  for (const it of list){ if (!it || !it.who || !it.txt) continue; const k = voiceKey(SETTINGS.lang, it.who, voiceText(it.txt)); if (idx[k]) voiceBuf(SETTINGS.lang, k); }
}
// bus de musique du moteur audio s'il en expose un (sinon on baisse le bus principal)
function voiceMusicBus(){
  try { if (typeof musicBus!=='undefined' && musicBus && musicBus.gain) return musicBus; } catch(e){}
  try { if (typeof musicGain!=='undefined' && musicGain && musicGain.gain) return musicGain; } catch(e){}
  try { if (MUSIC && MUSIC.bus && MUSIC.bus.gain) return MUSIC.bus; if (MUSIC && MUSIC.gain && MUSIC.gain.gain) return MUSIC.gain; } catch(e){}
  return null;
}
function voiceDuck(on){
  if (!AC) return; const t = AC.currentTime, bus = voiceMusicBus();
  try {
    if (on && !VOICE.duck){ const node = bus || master; if (!node) return;
      VOICE.duck = { node, base: bus? 1 : SETTINGS.vol };
      node.gain.cancelScheduledValues(t); node.gain.setValueAtTime(node.gain.value, t); node.gain.setTargetAtTime(VOICE.duck.base*(bus? 0.32 : 0.5), t, 0.08); }
    else if (!on && VOICE.duck){ const d = VOICE.duck; VOICE.duck = null;
      const base = d.node===master? SETTINGS.vol : d.base;
      d.node.gain.cancelScheduledValues(t); d.node.gain.setValueAtTime(d.node.gain.value, t); d.node.gain.setTargetAtTime(base, t, 0.3); }
  } catch(e){}
}
function voiceOut(){
  if (!VOICE.out || VOICE.out.context!==AC || VOICE.out._m!==master){ VOICE.out = AC.createGain(); VOICE.out.connect(master || AC.destination); VOICE.out._m = master; }   // via le bus principal : volume général + limiteur
  VOICE.out.gain.value = Number.isFinite(+SETTINGS.voiceVol)? +SETTINGS.voiceVol : 1;
  return VOICE.out;
}
// chaîne d'effets à la lecture : 'radio' = transmission (passe-bande + saturation), 'near' = radio légère
function voiceFx(kind, head){
  if (!kind) return head;
  const hp = AC.createBiquadFilter(), lp = AC.createBiquadFilter(), pk = AC.createBiquadFilter();
  hp.type = 'highpass'; lp.type = 'lowpass'; pk.type = 'peaking';
  hp.frequency.value = kind==='radio'? 420 : 220; lp.frequency.value = kind==='radio'? 3100 : 5200;
  pk.frequency.value = 1700; pk.Q.value = 0.9; pk.gain.value = kind==='radio'? 5 : 2;
  head.connect(hp); hp.connect(pk); pk.connect(lp);
  if (kind!=='radio') return lp;
  const ws = AC.createWaveShaper(), n = 1024, cu = new Float32Array(n);
  for (let i=0;i<n;i++){ const x = i/(n-1)*2-1; cu[i] = Math.tanh(x*2.2)/Math.tanh(2.2); }
  ws.curve = cu; lp.connect(ws); return ws;
}
function voicePlay(cur, offset){
  if (!AC || !cur.buf) return;
  const src = AC.createBufferSource(); src.buffer = cur.buf;
  const g = AC.createGain(); g.gain.value = cur.o.radio? 0.95 : 1;
  voiceFx(cur.o.radio? 'radio' : cur.o.near? 'near' : null, src).connect(g); g.connect(voiceOut());
  const t = AC.currentTime + 0.03;
  src.onended = () => { if (cur.src!==src || cur.paused) return; cur.state = 'done'; cur.endT = performance.now(); voiceDuck(false); };
  try { src.start(t, offset||0); } catch(e){ cur.state = 'fail'; return; }
  cur.src = src; cur.state = 'play'; cur.paused = false; cur.at = t - (offset||0);
  VOICE.plays++; voiceDuck(true);
}
function voiceHalt(cur){ if (cur && cur.src){ const s = cur.src; cur.src = null; try { s.onended = null; s.stop(); } catch(e){} } }
// coupe la réplique en cours (fondu court)
function voiceStop(){
  const cur = VOICE.cur; if (!cur) return; VOICE.cur = null;
  if (cur.src){ try { const s = cur.src, t = AC.currentTime; s.onended = null; s.stop(t+0.06); } catch(e){} cur.src = null; }
  voiceDuck(false);
}
/* Dit une réplique : who = identifiant de voix (CINE_WHO), txt = texte affiché (chaîne) ou objet {fr,en,…}.
   opts : {cine:true} réplique de cinématique (prioritaire, coupée en fin de scène), {radio:true} transmission
   en mission (effet radio ; ne coupe jamais une cinématique), {near:true} radio légère.
   Renvoie la durée de la réplique (s), 0 si elle n'a pas de voix. */
function voiceSay(who, txt, opts){
  const o = opts || {};
  if (!SETTINGS.voice || !AC || !who) return 0;
  if (VOICE.cur && VOICE.cur.o.cine && !o.cine && VOICE.cur.state!=='done' && VOICE.cur.state!=='fail') return 0;
  const text = voiceText(txt); if (!text) return 0;
  const L = SETTINGS.lang, idx = voiceIndex(L); if (!idx) return 0;
  const k = voiceKey(L, who, text), dur = +idx[k]; if (!(dur>0)) return 0;
  voiceStop();
  const cur = VOICE.cur = { k, L, who, dur, o, state:'load', t0:performance.now(), src:null, buf:null, paused:false, endT:0 };
  voiceBuf(L, k).then(buf => { if (VOICE.cur!==cur) return;
    if (!buf || performance.now()-cur.t0 > 4000){ cur.state = 'fail'; return; }
    cur.buf = buf; if (paused || (o.cine && !CINE.on)) { cur.paused = true; cur.state = 'play'; cur.off = 0; return; }
    voicePlay(cur, 0); });
  voiceWatch();
  return dur;
}
// vrai tant que la réplique en cours doit retenir la cinématique (lecture, ou chargement < 2,5 s ; + marge après la fin)
function voiceBusy(margin){
  const c = VOICE.cur; if (!c) return false;
  if (c.state==='load') return performance.now()-c.t0 < 2500;
  if (c.state==='done') return performance.now()-c.endT < (margin||0)*1000;
  if (c.state!=='play') return false;
  if (c.paused) return true;
  if (!AC || (AC.state!=='running' && !document.hidden)) return false;   // contexte audio bloqué : on n'attend pas une voix qu'on n'entend pas
  return AC.currentTime - c.at < c.buf.duration + (margin||0);
}
// surveillance légère pendant une réplique : pause du jeu, retour au menu, fin de cinématique
function voiceWatch(){
  if (VOICE.iv) return;
  VOICE.iv = setInterval(() => {
    const c = VOICE.cur;
    if (!c || c.state==='done' || c.state==='fail'){ clearInterval(VOICE.iv); VOICE.iv = 0; if (!c || c.state!=='load') voiceDuck(false); return; }
    if (!game || !SETTINGS.voice || (c.o.cine && !CINE.on) || (c.o.radio && game.over)){ voiceStop(); return; }
    if (c.state!=='play' || !AC) return;
    if (paused && !c.paused){ c.off = Math.max(0, AC.currentTime - c.at); c.paused = true; voiceHalt(c); voiceDuck(false); }
    else if (!paused && c.paused){ voicePlay(c, c.off||0); }
  }, 150);
}
// réglages : interrupteur + volume (menu PARAMÈTRES → AUDIO)
function voiceRefreshOpts(){
  const b = document.getElementById('oVoice'), v = document.getElementById('oVoiceVol'), vv = document.getElementById('oVoiceVolV');
  if (b){ b.classList.toggle('on', !!SETTINGS.voice); b.textContent = (SETTINGS.voice? t('on') : t('off')).toUpperCase();
    b.title = voiceCanFetch()? '' : cT(VOICE_UI.none); }
  if (v) v.value = Math.round(SETTINGS.voiceVol*100);
  if (vv) vv.textContent = Math.round(SETTINGS.voiceVol*100)+'%';
}
function voiceToggle(on){ SETTINGS.voice = on==null? !SETTINGS.voice : !!on; saveSettings(); if (!SETTINGS.voice) voiceStop(); voiceRefreshOpts(); }
{ const b = document.getElementById('oVoice'), v = document.getElementById('oVoiceVol');
  if (b) b.addEventListener('click', () => voiceToggle());
  if (v) v.addEventListener('input', () => { SETTINGS.voiceVol = clamp(v.value/100, 0, 1); saveSettings(); if (VOICE.out && AC) VOICE.out.gain.value = SETTINGS.voiceVol; voiceRefreshOpts(); }); }
voiceIndex();                                        // la table de la langue courante se charge dès le démarrage (quelques Ko)
