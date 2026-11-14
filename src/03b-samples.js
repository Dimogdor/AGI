/* ================= SONS ENREGISTRÉS (v1.16) =================
   Des enregistrements libres de droits (CC0 : Freesound, Kenney, VSCO 2 CE, VCSL — voir
   assets/audio/CREDITS.md) remplacent la synthèse partout où ils sont chargés :
     assets/audio/manifest.json   { sounds:{ <clé>:{ kind:'sfx'|'loop'|'note', grp, takes:[{f, on, loop|root|sus}] } } }
   Chargement paresseux et par lots : « core » (interface, armes, héros) au premier geste, l'ambiance
   d'un lieu quand la mission démarre, les instruments quand un thème les demande.
   Hors ligne / file:// d'un navigateur : rien n'est demandé, le jeu garde l'audio de synthèse
   (même règle que la voix off). Tant qu'un son n'est pas décodé, sa version synthétique joue :
   le jeu n'est jamais muet là où il ne l'était pas. */
const SND = { base:'assets/audio/', man:null, manP:null, grp:{}, buf:new Map(), last:{}, live:new Map(), n:0, beds:{}, tOne:{} };
function sampCanFetch(){
  try { const p = location.protocol;
    if (/^(https?|capacitor|app|ionic):$/.test(p)) return true;
    return p==='file:' && /Electron/.test(navigator.userAgent||'');          // Electron : XHR sur file:// autorisé
  } catch(e){ return false; }
}
function sampGet(url, type){
  if (location.protocol!=='file:' && typeof fetch==='function')
    return fetch(url).then(r => r.ok? (type==='json'? r.json() : r.arrayBuffer()) : null).catch(()=>null);
  return new Promise(res => { try { const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = type==='json'? 'json' : 'arraybuffer';
    x.onload = () => res((x.status===200 || x.status===0) && x.response? x.response : null); x.onerror = () => res(null); x.send(); } catch(e){ res(null); } });
}
function sampInit(){
  if (SND.manP || !AC || !sampCanFetch()) return;
  SND.manP = sampGet(SND.base+'manifest.json', 'json').then(m => {
    if (!m || !m.sounds) return null;
    SND.man = m; sampLoad('core'); sampLoad('amb_wind'); sampLoad('amb_rain'); return m; });
}
// décode une prise ; mesure le retard du décodeur MP3 (amorce) pour caler attaque et points de boucle
function sampDecode(take){
  if (take.p) return take.p;
  take.p = sampGet(SND.base+take.f, 'ab').then(ab => (ab && AC)? new Promise(res => {
    const ok = b => { if (b){ const d = b.getChannelData(0), n = Math.min(d.length, b.sampleRate*2|0); let pk = 0;
        for (let i=0;i<n;i++){ const a = Math.abs(d[i]); if (a>pk) pk = a; }
        let i = 0; const th = pk*0.01; while (i<n && Math.abs(d[i])<th) i++;
        take.off = Math.max(0, i/b.sampleRate - (take.on||0)); take.b = b; SND.buf.set(take.f, b); } res(b); };
    try { const q = AC.decodeAudioData(ab, ok, () => res(null)); if (q && q.catch) q.catch(() => res(null)); } catch(e){ res(null); } }) : null);
  return take.p;
}
// charge un lot (3 téléchargements à la fois) ; promesse résolue quand tout est prêt (ou en échec)
function sampLoad(grp){
  if (!SND.man) { if (SND.manP) SND.manP.then(m => m && sampLoad(grp)); return Promise.resolve(false); }
  if (SND.grp[grp]) return SND.grp[grp];
  const takes = []; for (const k in SND.man.sounds){ const s = SND.man.sounds[k]; if (s.grp===grp) for (const t of s.takes) takes.push(t); }
  let i = 0; const worker = () => i<takes.length? sampDecode(takes[i++]).then(worker, worker) : null;
  return SND.grp[grp] = Promise.all([worker(), worker(), worker()]).then(() => true);
}
const sampReady = key => { const s = SND.man && SND.man.sounds[key]; return !!(s && s.takes.some(t => t.b)); };
function sampGrpReady(grp){ if (!SND.man) return false; sampLoad(grp);
  for (const k in SND.man.sounds){ const s = SND.man.sounds[k]; if (s.grp===grp && !s.takes.every(t => t.b)) return false; } return true; }
// limites de polyphonie par famille (au-delà : la plus ancienne voix s'efface)
const SAMP_CAP = { shot_old:5, shot_rifle:5, shot_gauss:4, shot_plasma:4, shot_laser:5, shot_laserH:4, boom:4, boom_big:2, die:3, build:3, ui_click:2, blade:3 };
const SAMP_GAP = { shot_old:0.04, shot_rifle:0.04, shot_gauss:0.05, shot_plasma:0.05, shot_laser:0.035, shot_laserH:0.05, die:0.06, boom:0.07, ui_click:0.03, build:0.05 };
/* joue une prise d'un son : o = {vol, pan, rate, at, bus, vary (±demi-tons), dur (coupe), fade}
   renvoie la source (ou null si le son n'est pas chargé : l'appelant joue alors sa synthèse) */
function sampPlay(key, o){
  if (!AC || !SND.man) return null;
  const s = SND.man.sounds[key]; if (!s) return null;
  const ok = s.takes.filter(t => t.b); if (!ok.length){ sampLoad(s.grp); return null; }
  o = o || {}; const t0 = Math.max(AC.currentTime, o.at || 0);
  if (SAMP_GAP[key] && SND.tOne[key]!=null && t0 - SND.tOne[key] < SAMP_GAP[key] && t0 >= SND.tOne[key]) return ok[0].b && {};   // rafale : on n'empile pas
  SND.tOne[key] = t0;
  let k = (Math.random()*ok.length)|0; if (ok.length>1 && ok[k].f===SND.last[key]) k = (k+1)%ok.length;
  const tk = ok[k]; SND.last[key] = tk.f;
  const src = AC.createBufferSource(); src.buffer = tk.b;
  const vary = o.vary!=null? o.vary : 0.6;
  src.playbackRate.value = (o.rate || 1) * Math.pow(2, (Math.random()*2-1)*vary/12);
  const g = AC.createGain(); const vol = (o.vol!=null? o.vol : 1) * (s.vol || 1) * (1 + (Math.random()*2-1)*0.12);
  g.gain.setValueAtTime(vol, t0);
  let head = g;
  if (o.pan && AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); g.connect(p); head = p; }
  head.connect(o.bus || BUS.sfx || master); src.connect(g);
  src.start(t0, tk.off || 0);
  if (o.dur){ g.gain.setValueAtTime(vol, t0+o.dur); g.gain.linearRampToValueAtTime(0.0001, t0+o.dur+(o.fade||0.12)); src.stop(t0+o.dur+(o.fade||0.12)+0.02); }
  // polyphonie
  const cap = SAMP_CAP[key] || 6, L = SND.live.get(key) || []; const now = AC.currentTime;
  for (let i=L.length-1;i>=0;i--) if (L[i].end < now) L.splice(i,1);
  if (L.length >= cap){ const v = L.shift(); try { v.g.gain.setTargetAtTime(0, now, 0.02); v.src.stop(now+0.1); } catch(e){} }
  L.push({ src, g, end: t0 + tk.b.duration/(src.playbackRate.value||1) }); SND.live.set(key, L);
  return src;
}

/* ---------- effets du jeu : sfx(kind, p) → enregistrement ---------- */
const SAMP_SHOT = { HUM:['shot_old','shot_rifle','shot_gauss','shot_plasma','shot_plasma'], IA:['shot_laser','shot_laser','shot_laserH','shot_laserH','shot_laserH'] };
function sampSfx(kind, p, pan){
  if (!SND.man) return false;
  const P = { pan: pan || 0 };
  switch (kind){
    case 'buy':   return !!sampPlay('ui_buy', {vol:0.6, rate:1+0.03*(p|0), vary:0.3});
    case 'sel':   return !!sampPlay('ui_click', {vol:0.7, vary:0.4});
    case 'cap':   return !!sampPlay('ui_ok', {vol:0.55, vary:0.2});
    case 'deny':  return !!sampPlay('ui_deny', {vol:0.6, vary:0});
    case 'shoot': { const fk = (game && game.p && game.p.facKey) || 'HUM', era = clamp(p|0, 0, 4);
      const key = SAMP_SHOT[fk==='IA'? 'IA':'HUM'][era];
      return !!sampPlay(key, {vol: fk==='IA'? 0.45 : 0.5, pan: pan || (Math.random()-0.5)*0.5, rate: era===4? 1.12 : 1, vary:0.8}); }
    case 'boom':  { const r = sampPlay('boom', {vol:0.62, pan:P.pan, vary:1.2}); if (r) musicDip(3, 0.6); return !!r; }
    case 'die':   return !!sampPlay('die', {vol:0.3, pan:(Math.random()-0.5)*0.6, vary:1.5});
    case 'build': return !!sampPlay('build', {vol:0.42, pan:P.pan, vary:1});
    case 'spec':  { if (!sampReady('spec')) return false;
      if (game && game.p && game.p.facKey==='HUM') sampPlay('shot_mortar', {vol:0.4, pan:-0.3});
      sampPlay('spec', {vol:0.75, at:AC.currentTime+0.12, vary:0.5}); musicDip(5, 1.4); return true; }
    case 'node':  return musStinger('node') || !!sampPlay('ui_ok', {vol:0.42, rate:1.12});
    case 'evolve':return musStinger((game && game.p && game.p.facKey==='IA')? 'eraIA' : 'eraHUM');
    case 'trans': return musStinger('trans');
  }
  return false;
}

/* ---------- héros : le Che (voix humaines, cuivres, caisse claire), la Singularité (machines) ---------- */
function sampHero(fac, kind, n, V, pan){
  if (!SND.man || !sampReady(fac==='HUM'? 'che_cry' : 'ia_glitch')) return false;
  const o = (key, vol, x) => sampPlay(key, Object.assign({vol: 0.65*vol*V, pan, bus:BUS.sfx}, x||{}));
  const t = AC.currentTime;
  if (fac==='HUM'){
    if (kind==='spawn'){ o('che_cry', 0.85, {vary:0.2}); musStinger('bugle', t+0.5, V, pan); musicDip(4, 1.6); }
    else if (kind==='atkA') o(n%2? 'shot_rifle' : 'shot_old', 0.42, {vary:1});
    else if (kind==='atkB') o('blade', 0.5, {vary:1.2});
    else if (kind==='hurt') o('che_hurt', 0.6, {vary:0.8});
    else if (kind==='death'){ o('che_death', 0.85, {vary:0}); musStinger('taps', t+0.9, V, pan); musicDip(5, 3); }
    else if (kind==='bark'){ if (n%3===1) o('whistle', 0.55, {vary:0.4}); else o('che_cry', 0.55, {vary:0.6}); }
    else return false;
  } else {
    if (kind==='spawn'){ o('ia_up', 0.7, {vary:0}); musStinger('gong', t+0.4, V, pan); musicDip(4, 1.6); }
    else if (kind==='atkA') o(n%2? 'ia_field' : 'shot_laserH', 0.4, {vary:1});
    else if (kind==='atkB') o('shot_gauss', 0.45, {rate:0.85, vary:0.8});
    else if (kind==='hurt') o('ia_glitch', 0.5, {vary:2});
    else if (kind==='death'){ o('ia_down', 0.85, {vary:0}); o('ia_glitch', 0.6, {at:t+0.5}); musicDip(5, 3); }
    else if (kind==='bark'){ o(n%3===0? 'ia_servo' : n%3===1? 'ia_noise' : 'ia_glitch', 0.5, {vary:1, dur: 1.6}); }
    else return false;
  }
  return true;
}

/* ---------- AMBIANCES : boucles stéréo enchaînées sans couture, par lieu ---------- */
// lecteur de boucle : une instance démarre à t, la suivante à t+L (contenu identique : fondu de 0,3 s)
function bedTick(key, level){
  let b = SND.beds[key];
  if (level<=0.0005 && !b) return;
  if (!b){ const s = SND.man.sounds[key], tk = s && s.takes.find(x => x.b); if (!tk) return;
    b = SND.beds[key] = { tk, g:AC.createGain(), next:0, cur:null, lvl:0 }; b.g.gain.value = 0; b.g.connect(BUS.amb || master); }
  const t = AC.currentTime;
  if (Math.abs(level - b.lvl) > 0.0005){ b.g.gain.setTargetAtTime(level, t, level>b.lvl? 1.2 : 0.8); b.lvl = level; }
  if (level<=0.0005){ if (b.cur && b.g.gain.value < 0.0008){ try { b.cur.s.stop(); } catch(e){} b.cur = null; b.next = 0; } return; }
  if (!b.cur || t > b.next - 1.0){                                           // planifie l'instance suivante
    const at = b.cur? b.next : t + 0.05, L = b.tk.loop, X = 0.3;
    const s = AC.createBufferSource(), g = AC.createGain(); s.buffer = b.tk.b; s.connect(g); g.connect(b.g);
    if (b.cur){ g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(1, at+X);
      const pg = b.cur.g.gain; pg.setValueAtTime(1, at); pg.linearRampToValueAtTime(0, at+X); b.cur.s.stop(at+X+0.05); }
    s.start(at, b.tk.off || 0); s.stop(at + L + X + 0.1);
    b.cur = { s, g }; b.next = at + L;
  }
}
function oneShot(key, every, vol, o){                                         // événement aléatoire (mouette, rafale, tonnerre…)
  const st = SND.beds['@'+key] || (SND.beds['@'+key] = { t: every*(0.3+Math.random()*0.7) });
  if ((st.t -= 0.25) > 0) return; st.t = every*(0.6+Math.random()*0.8);
  sampPlay(key, Object.assign({vol, pan:(Math.random()-0.5)*1.4, bus:BUS.amb}, o||{}));
}
// profils : niveau de chaque boucle selon l'état du lieu (le lot doit être chargé pour remplacer la synthèse)
const AMB_PROFILES = {
  night:{ grp:['amb_night','amb_rain'], f(c){ const lit = (c && c.litK) || 0;
    oneShot('thunder', 38, 0.55); oneShot('dog', 27, 0.4);
    return { cityrain:0.85, rainroof:0.55, rainstreet:0.35, hum:0.25*lit }; } },
  port:{ grp:['amb_port'], f(c){ oneShot('gull', 9, 0.5); oneShot('horn', 45, 0.6);
    return { harbour:0.75, lap:0.5, dawn:0.45, crowd:0.22, chant:0.28, march:0.32 }; } },
  dam:{ grp:['amb_dam','amb_wind'], f(c){ const open = c && (c.siren>0 || (c.flood && c.flood.t<6));
    return { river:0.5, falls:0.35 + (open? 0.5 : 0), gush: open? 0.8 : 0, cicadas:0.4, wind:0.3 }; } },
  rochefroide:{ grp:['amb_cold','amb_fire'], f(c){ const gu = (c && c.gust) || 0;
    if (gu>0.3) oneShot('gust', 4, 0.7); else oneShot('gust', 14, 0.45);
    return { blizzard:0.35 + 0.6*gu, howl:0.45, fire:0.32 }; } },
  citadel:{ grp:['amb_citadel','amb_wind'], f(c){ oneShot('ia_glitch', 11, 0.18);
    return { server:0.55, cityhum:0.45, wind:0.25 }; } },
};
// escarmouche : vent, pluie, oiseaux, feu selon l'état du monde
function sampAmbSkirmish(x){
  const fiery = game.cata==='heat' || game.cata==='nuke' || game.winter || x.dev > 0.75;
  return { wind: Math.min(1, x.wind*14), rainstreet: Math.min(1, x.rain*18), birds: (x.dev<0.35 && !game.cata)? 0.45*(1-x.dev*2.2) : 0, fire: fiery? 0.45 : 0 };
}
function sampAmb(live, x){
  const cov = {};
  if (!AC || !SND.man || !SETTINGS.sfx) { if (SND.man) for (const k in SND.beds) if (k[0]!=='@') bedTick(k, 0); return cov; }
  let want = {};
  if (live){
    const id = game.biome && game.biome.id, P = id && AMB_PROFILES[id];
    if (P){ if (P.grp.every(g => sampGrpReady(g))){ want = P.f(game.camp); cov.wind = cov.rain = cov.tick = cov.birds = cov.fire = true; } }
    else if (!game.biome){
      const r = sampGrpReady('amb_sk'), f = sampGrpReady('amb_fire');
      want = sampAmbSkirmish(x);
      if (sampReady('wind')) cov.wind = true; else delete want.wind;
      if (sampReady('rainstreet')) cov.rain = true; else delete want.rainstreet;
      if (r) cov.birds = true; else delete want.birds;
      if (f) cov.fire = true; else delete want.fire;
    }
    if (x.cine) for (const k in want) want[k] *= 0.6;                              // cinématique : l'ambiance recule
  }
  for (const k in want) bedTick(k, want[k]);
  for (const k in SND.beds) if (k[0]!=='@' && !(k in want)) bedTick(k, 0);
  return cov;
}
// premier geste n'importe où (menu compris) : le son démarre, les fichiers commencent à arriver
try { document.addEventListener('pointerdown', function first(){ document.removeEventListener('pointerdown', first, true);
  try { audioInit(); musicStart(); } catch(e){} }, true); } catch(e){}
