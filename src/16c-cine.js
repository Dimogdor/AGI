/* ================= CINÉMATIQUES DE CAMPAGNE (v1.16) =================
   Un script est une liste de PLANS joués l'un après l'autre. Un plan peut être :
     · une PLANCHE (plate) : illustration peinte à la main (page du carnet de Sol), cadrée au-dessus
       (ou à gauche, sur écran très large) du texte — le texte ne recouvre jamais la planche ;
     · un plan SUR LE TERRAIN : la carte réelle, bandes noires, caméra qui se déplace, la
       simulation figée (ou vivante si live:true) — sert aussi en pleine mission ; le texte est en haut,
       sur le ciel, pour ne pas cacher les troupes.
   Champs d'un plan :
     plate(g,w,h,t,k)  peintre de planche : dessine DANS (0,0,w,h) (t = secondes dans le plan, k = 0..1)
     cam:{x, t}        cible caméra (x monde, ou fonction g=>x) atteinte en t secondes
     who, txt          réplique : qui parle (portrait, nom, voix) et quoi ({fr,en,…})
     dur               durée minimale (le plan dure au moins le temps de lecture, et de la voix off)
     fx(g,c)           action au début du plan (TOUJOURS exécutée, même si on passe la scène)
     snd, mus          bruitage / thème musical à l'entrée du plan
     live              la simulation continue pendant ce plan
     title:{…}, sub    grand titre au pochoir (carton)
     choice:[{label, sub, ink, pick(g,c), then(g,c)}]  CHOIX offert au joueur : le plan attend un appui sur l'un des
                       boutons ; then() renvoie les plans qui suivent ce choix ; PASSER s'arrête sur le choix
   LECTURE : le texte se tape à la machine ; 1er appui = tout le texte, 2e appui = suite. Un texte long
   est découpé en pages (phrases entières, 3 à 4 lignes). Sans appui, une page reste affichée au moins
   2,5 s + 55 ms par caractère, et la dernière jusqu'à la fin de la voix off (16c0-voice.js) + une marge.
   « Passer la cinématique » (ou Échap) termine la scène ; Espace / Entrée / → = suite. */
const CINE = { on:false, script:null, i:0, t:0, done:null, bar:0, cam0:0, camBack:null, follow:true, mus:null, fade:0, restore:true, vd:0, lay:null };
const CINE_WHO = {                                   // nom affiché et encre de chaque voix
  sol:  { name:'SOL', ink:'#c42a1c' },
  k55:  { name:'55', ink:'#0b6fa8' },
  nous: { name:{fr:'« NOUS »', en:'"WE"', es:'«NOSOTROS»', de:'„WIR“', it:'«NOI»', pt:'«NÓS»', ru:'«МЫ»', zh:'“我们”', ar:'«نحن»'}, ink:'#3a4a58' },
  nar:  { name:null, ink:'#1f1b17' },
};
const CINE_PORTRAITS = {};                           // id → peintre (g) sur une vignette 64×64 (encre sur papier)
const CINE_UI = {
  skip: {fr:"PASSER LA CINÉMATIQUE", en:"SKIP CUTSCENE", es:"SALTAR ESCENA", de:"SZENE ÜBERSPRINGEN", it:"SALTA LA SCENA", pt:"PULAR CENA", ru:"ПРОПУСТИТЬ СЦЕНУ", zh:"跳过过场", ar:"تخطّي المشهد"},
  next: {fr:"suite", en:"next", es:"seguir", de:"weiter", it:"avanti", pt:"seguir", ru:"далее", zh:"继续", ar:"التالي"},
  space:{fr:"Espace", en:"Space", es:"Espacio", de:"Leertaste", it:"Spazio", pt:"Espaço", ru:"Пробел", zh:"空格", ar:"مسافة"},
  pick: {fr:"faites votre choix", en:"make your choice", es:"elija", de:"treffen Sie Ihre Wahl", it:"faccia la sua scelta", pt:"faça a sua escolha", ru:"сделайте выбор", zh:"请做出选择", ar:"اتّخذ قرارك"},
};
const CINE_CJK = /[⺀-鿿豈-﫿＀-￯]/;
const CINE_CPS = () => SETTINGS.lang==='zh'? 18 : 45;          // vitesse de frappe (caractères / s)
const cineShot = () => CINE.script && CINE.script[CINE.i];
const cineLive = () => { const s = cineShot(); return !!(s && s.live); };
const cineWho = s => s.who || 'nar';
// temps de lecture d'un texte : 2,5 s + 55 ms par caractère (un idéogramme compte 2,5 caractères)
function cineRead(str){ let n = 0; for (const ch of str) n += CINE_CJK.test(ch)? 2.5 : 1; return 2.5 + 0.055*n; }
// durée du plan : celle du dernier calcul de mise en page (pages, voix) ou une estimation
function cineDur(s){
  if (CINE.lay && CINE.lay.s===s && CINE.lay.total) return CINE.lay.total;
  if (s.txt){ const v = (s===cineShot())? CINE.vd : 0; return Math.max(s.dur||0, cineRead(cT(s.txt)), v? v+0.6 : 0); }
  return s.dur || (s.title? 3.4 : 2.6);
}
const ease = k => k<0? 0 : k>1? 1 : k*k*(3-2*k);

function cinePlay(script, done, opt){
  if (!game || !script || !script.length){ if (done) done(); return; }
  if (CINE.on) cineEnd(true);
  CINE.on = true; CINE.script = script; CINE.i = -1; CINE.done = done || null; CINE.bar = 0; CINE.fade = 0;
  CINE.camBack = (opt && opt.keepCam)? null : camX; CINE.follow = camFollow; camFollow = false; CINE.mus = null;
  buildMenu = null; selMode = false; selBox = null;
  if (typeof voiceStop==='function') voiceStop();
  cineNext();
}
function cineNext(){
  CINE.i++; CINE.lay = null; CINE.vd = 0;
  if (typeof voiceStop==='function') voiceStop();
  const s = cineShot(); if (!s){ cineEnd(); return; }
  CINE.t = 0; CINE.cam0 = camX;
  if (s.mus!==undefined) CINE.mus = s.mus;
  if (s.snd) sfx(s.snd);
  if (s.fx) try { s.fx(game, game.camp); } catch(e){}
  if (s.txt && typeof voiceSay==='function'){                // voix off : la durée connue d'avance (index) règle le plan
    CINE.vd = voiceSay(cineWho(s), s.txt, {cine:true});
    voicePrefetch(CINE.script.slice(CINE.i+1, CINE.i+4).map(n => ({who:cineWho(n), txt:n.txt})));
  }
}
// fin de scène ; les actions (fx) des plans non joués sont exécutées pour que la mission reste cohérente
function cineEnd(silent){
  if (!CINE.on) return;
  const sc = CINE.script || [];
  const ch = silent? -1 : sc.findIndex((s,j)=> j>=CINE.i && s.choice && !s.picked);       // on ne passe pas un choix : la scène s'y arrête
  if (ch>=0){ if (ch>CINE.i){ for (let j=CINE.i+1; j<ch; j++) if (sc[j].fx) try { sc[j].fx(game, game && game.camp); } catch(e){}
      CINE.i = ch-1; cineNext(); } return; }
  for (let j=CINE.i+1; j<sc.length; j++) if (sc[j].fx) try { sc[j].fx(game, game && game.camp); } catch(e){}
  CINE.on = false; CINE.script = null; CINE.mus = null; CINE.lay = null; camFollow = CINE.follow;
  if (typeof voiceStop==='function') voiceStop();
  if (CINE.camBack!=null){ camX = CINE.camBack; camClamp(); }
  const d = CINE.done; CINE.done = null;
  if (d && !silent) d();
}
// page affichée à l'instant t (0..n-1) et ses bornes
function cinePage(lay, t){ let p = 0; while (p < lay.pages.length-1 && t >= lay.starts[p+1]) p++; return p; }
const cineTyped = (lay, p) => lay.starts[p] + lay.chars[p]/CINE_CPS();          // instant où la page p est entièrement tapée
function cineTick(rdt){
  const s = cineShot(); if (!s) return;
  CINE.t += rdt; CINE.bar = Math.min(1, CINE.bar + rdt*2.5);
  if (s.cam && !s.plate){
    const tx = clamp((typeof s.cam.x==='function'? s.cam.x(game) : s.cam.x) - VW()/2, 0, WORLD-VW());
    camX = lerp(CINE.cam0, tx, ease(CINE.t/(s.cam.t || Math.min(2.6, cineDur(s)*0.7))));
  }
  const lay = s.txt? cineLayout(s) : null;
  // machine à écrire : petit cliquetis (Sol) ou bip (55) tous les quelques caractères — pas par-dessus une voix
  if (lay && !CINE.vd && SETTINGS.sfx && AC){ const p = cinePage(lay, CINE.t), n = Math.floor((CINE.t-lay.starts[p])*CINE_CPS());
    if (n>=0 && n<lay.chars[p] && n!==CINE._n && n%3===0){ const t0 = AC.currentTime;
      if (s.who==='k55' || s.who==='nous') tone(s.who==='nous'? 220 : 1180+(n%5)*40, t0, 0.03, 'sine', 0.012);
      else noise(t0, 0.012, 0.014, 2600); }
    CINE._n = n; }
  if (s.choice) return;
  const end = lay? lay.total : cineDur(s);
  if (CINE.t >= end && !(typeof voiceBusy==='function' && voiceBusy(0.45))) cineNext();
}
function cineHit(r, sx, sy){ return r && sx>=r.x && sx<=r.x+r.w && sy>=r.y && sy<=r.y+r.h; }
function cineInput(sx, sy){
  const fr = cineFrame();
  if (cineHit(fr.skip, sx, sy)){ cineEnd(); return; }
  if (cineHit(fr.vbtn, sx, sy)){ voiceToggle(); const s = cineShot();
    if (SETTINGS.voice && s && s.txt){ CINE.vd = voiceSay(cineWho(s), s.txt, {cine:true}); CINE.lay = null; } else CINE.vd = 0;
    return; }
  const s = cineShot(); if (!s) return;
  const lay = s.txt? cineLayout(s) : null;
  if (s.choice){
    if (lay){ const p = cinePage(lay, CINE.t); if (CINE.t < cineTyped(lay, p)){ CINE.t = cineTyped(lay, p) + 0.01; return; }
      if (p < lay.pages.length-1){ CINE.t = lay.starts[p+1]; return; } }
    if (CINE.t>0.6) cineChoiceRects(s).forEach((q,i)=>{ if (cineHit(q, sx, sy)) cinePick(i); }); return; }
  if (CINE.t <= 0.25) return;
  if (lay){ const p = cinePage(lay, CINE.t);
    if (CINE.t < cineTyped(lay, p)){ CINE.t = cineTyped(lay, p) + 0.01; return; }      // 1er appui : toute la page
    if (p < lay.pages.length-1){ CINE.t = lay.starts[p+1]; return; } }                // page suivante
  cineNext();
}
// CHOIX : boutons côte à côte (empilés sur écran étroit), sous le texte ; cinePick applique le choix et enchaîne sur ses plans
function cineChoiceRects(s){
  const lay = s.txt? cineLayout(s) : null, fs = lay? lay.fs : cineFrame().fs, n = s.choice.length, col = W<560;
  const bw = col? Math.min(W-28, fs*17) : Math.min(fs*17, (W-40-(n-1)*20)/n), bh = Math.round(clamp(fs*3.9, 66, 104));
  const tot = col? bw : n*bw+(n-1)*20, x0 = (W-tot)/2;
  const top = lay && lay.box && lay.mode==='top'? lay.box.y+lay.box.h+16 : H*0.22;
  const y0 = Math.min(top, Y_G - (col? n*(bh+10) : bh) - 10);
  return s.choice.map((o,i)=> col? {x:x0, y:y0+i*(bh+10), w:bw, h:bh} : {x:x0+i*(bw+20), y:y0, w:bw, h:bh}); }
function cinePick(i){ const s = cineShot(); if (!s || !s.choice || s.picked) return; const o = s.choice[i]; s.picked = 1; sfx('evolve');
  if (o.pick) o.pick(game, game.camp);
  if (o.then){ const more = o.then(game, game.camp) || []; CINE.script = CINE.script.slice(0, CINE.i+1).concat(more); }
  cineNext(); }
function cineKey(code){
  if (code==='Escape'){ cineEnd(); return; }
  const s = cineShot(); if (s && s.choice){ const i = code==='Digit1' || code==='Numpad1'? 0 : code==='Digit2' || code==='Numpad2'? 1 : -1;
    if (i>=0 && i<s.choice.length){ cinePick(i); return; } }
  if (code==='Space' || code==='Enter' || code==='ArrowRight' || code==='NumpadEnter') cineInput(-1, -1);
}

/* ---------- mise en page du texte : taille lisible sur téléphone, lignes de 60 à 65 signes, pages ---------- */
// px CSS par unité logique (le canvas logique fait 540 de haut : un téléphone en paysage l'affiche ~0,7×)
function cineCssK(){ const w = parseFloat(cv.style.width) || cv.clientWidth || W; return Math.max(0.3, w/W); }
const cineTouch = () => { try { return matchMedia('(pointer:coarse)').matches; } catch(e){ return false; } };
function cineFont(who, fs){
  const L = SETTINGS.lang;
  const fam = L==='zh'? '"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Source Han Sans SC","Microsoft YaHei",sans-serif'
    : L==='ar'? '"Noto Naskh Arabic","Geeza Pro","Segoe UI",Tahoma,serif'
    : 'Georgia,"Noto Serif","DejaVu Serif","Times New Roman",serif';
  return (who==='nar' && L!=='zh' && L!=='ar'? 'italic ' : '') + fs.toFixed(1)+'px '+fam;
}
// coupe en lignes ≤ maxW (police courante) : aux espaces, ou au caractère pour le chinois — jamais
// de ponctuation fermante en début de ligne. La somme des longueurs des lignes = caractères tapés.
function cineWrap(text, maxW){
  const out = [];
  for (const para of String(text).split('\n')){
    const toks = para.match(/[⺀-鿿豈-﫿＀-￯]|[^\s⺀-鿿豈-﫿＀-￯]+|\s+/g) || [];
    let cur = '', sp = false;
    for (const tk of toks){
      if (/^\s+$/.test(tk)){ sp = true; continue; }
      const cand = cur? cur + (sp? ' ' : '') + tk : tk;
      const closing = /^[，。！？、；：」』”’）》〉…,.;:!?)\]»%—–-]+$/.test(tk);
      if (cur && !closing && ctx.measureText(cand).width > maxW){ out.push(cur); cur = tk; }
      else cur = cand;
      sp = false;
    }
    if (cur) out.push(cur);
  }
  return out.length? out : [''];
}
// pages de ≤ maxLines lignes, faites de phrases entières quand c'est possible
function cinePaginate(text, maxW, maxLines){
  const all = cineWrap(text, maxW); if (all.length <= maxLines) return [all];
  const cjk = CINE_CJK.test(text);
  const sents = (text.match(/[^.!?…。！？]+(?:[.!?…。！？]+["»”’)\]]*\s*|$)/g) || [text]).map(x => x.trim()).filter(Boolean);
  const chunks = []; let cur = '';
  for (const st of sents){ const cand = cur? cur + (cjk? '' : ' ') + st : st;
    if (!cur || cineWrap(cand, maxW).length <= maxLines) cur = cand; else { chunks.push(cur); cur = st; } }
  if (cur) chunks.push(cur);
  const pages = [];
  for (const c of chunks){ const ls = cineWrap(c, maxW); for (let i=0;i<ls.length;i+=maxLines) pages.push(ls.slice(i, i+maxLines)); }
  return pages;
}
// cadre commun de la scène : bandes, bouton « passer », bouton voix, corps de texte
function cineFrame(){
  const k = cineCssK(), L = SETTINGS.lang, key = W+'|'+H+'|'+L+'|'+k.toFixed(3)+'|'+(SETTINGS.voice?1:0);
  if (CINE._fr && CINE._fr.key===key) return CINE._fr;
  const rtl = L==='ar', fs = clamp((L==='zh'? 16.5 : 15.5)/k, L==='zh'? 18 : 17, 24);
  const bh = Math.round(H*0.105), sf = clamp(12.5/k, 10.5, 17), sh = Math.round(clamp(36/k, 26, 52));
  ctx.font = sf.toFixed(1)+'px '+UI_TYPE;
  const lbl = cT(CINE_UI.skip)+' ▸▸', hint = cineTouch()? '' : '  [Esc]';
  const sw = Math.round(ctx.measureText(lbl+hint).width + sf*2.4), y = Math.round(Math.max(5, (bh-sh)/2));
  const skip = { x: rtl? 10 : W-10-sw, y, w:sw, h:sh, lbl, hint, f:sf };
  const vok = typeof voiceIndex==='function' && !!voiceIndex();
  const vbtn = vok? { x: rtl? skip.x+sw+8 : skip.x-sh-8, y, w:sh, h:sh } : null;
  return (CINE._fr = { key, k, rtl, fs, bh, skip, vbtn });
}
// mise en page d'une réplique (mise en cache par plan) : mode 'side' (planche à gauche, texte à droite,
// écrans très larges), 'below' (planche au-dessus du texte) ou 'top' (plan sur le terrain : texte en haut)
function cineLayout(s){
  const fr = cineFrame(), key = fr.key+'|'+CINE.i+'|'+CINE.vd;
  if (CINE.lay && CINE.lay.s===s && CINE.lay.key===key) return CINE.lay;
  const { fs, rtl, bh } = fr, L = SETTINGS.lang, who = cineWho(s), wi = CINE_WHO[who] || CINE_WHO.nar;
  const full = cT(s.txt), por = cinePortrait(who);
  const nm = wi.name? (typeof wi.name==='string'? wi.name : cT(wi.name)) : null;
  const lh = Math.round(fs*(L==='zh'? 1.55 : 1.42)), pad = Math.round(fs*0.8), nf = Math.round(fs*0.68);
  const nameH = nm? Math.round(nf*1.9) : 0, cueH = Math.round(fs*1.15);
  const side = !!s.plate && W/H >= 1.85;
  const ps = por? Math.round(clamp(fs*(side? 3.0 : 3.5), 54, 86)) : 0;
  ctx.font = cineFont(who, fs);
  let mode, box, plate = null, textW, pages;
  if (side){                                                         // planche à gauche, colonne de texte à droite
    const colW = Math.round(clamp(fs*17.5, 330, W*0.42));
    const pw = W - colW - 24, ph = Math.min(H - 2*bh, pw*270/480);
    plate = { x:rtl? colW+24 : 0, y:Math.round((H-ph)/2), w:pw, h:Math.round(ph) };
    textW = colW - 2*pad;
    const maxL = Math.max(3, Math.floor((H - 2*bh - 2*pad - nameH - cueH - (ps? ps+pad*0.6 : 0)) / lh));
    pages = cinePaginate(full, textW, Math.min(9, maxL));
    const nl = Math.max(...pages.map(p => p.length));
    const hh = pad + (ps? ps+Math.round(pad*0.6) : 0) + nameH + nl*lh + cueH + Math.round(pad*0.6);
    box = { x: rtl? 12 : W-colW-12, y: Math.round(Math.max(bh+6, (H-hh)/2)), w: colW, h: hh };
    mode = 'side';
  } else {
    const maxL = (H*fr.k < 470)? 3 : 4;                             // hauteur réelle < 470 px CSS (téléphone) : 3 lignes
    textW = Math.round(Math.min(fs*(L==='zh'? 27 : 29), W - 48 - (ps? ps+pad : 0) - 2*pad));
    pages = cinePaginate(full, textW, maxL);
    const nl = Math.max(...pages.map(p => p.length));
    const w = textW + 2*pad + (ps? ps+pad : 0);
    const hh = Math.max(ps + 2*pad, pad + nameH + nl*lh + cueH + Math.round(pad*0.5));
    const mg = Math.round(Math.max(8, fs*0.5));
    if (s.plate){ mode = 'below';
      box = { x:Math.round((W-w)/2), y:H-hh-mg, w, h:hh };
      const top = Math.max(bh*0.7, fr.skip.y+fr.skip.h+6), ph = Math.max(H*0.42, box.y - mg - top), pw = Math.min(W, ph*480/270*1.35);
      plate = { x:Math.round((W-pw)/2), y:Math.round(top), w:Math.round(pw), h:Math.round(ph) };
    } else { mode = 'top'; box = { x:Math.round((W-w)/2), y:bh+mg, w, h:hh }; }
  }
  // temps : chaque page au moins son temps de lecture ; la voix off répartie au prorata des caractères
  const chars = pages.map(p => p.reduce((a,l)=>a+[...l].length, 0)), N = chars.reduce((a,b)=>a+b, 0) || 1;
  const dur = pages.map((p,i)=> Math.max(cineRead(p.join(' ')), CINE.vd? CINE.vd*chars[i]/N : 0));
  if (CINE.vd) dur[dur.length-1] += 0.6;
  const sum = dur.reduce((a,b)=>a+b, 0); if (s.dur && s.dur > sum) dur[dur.length-1] += s.dur - sum;
  const starts = [0]; for (let i=1;i<dur.length;i++) starts.push(starts[i-1]+dur[i-1]);
  // chars compte en points de code ; on garde des longueurs en unités JS pour le découpage
  const chU = pages.map(p => p.reduce((a,l)=>a+l.length, 0));
  return (CINE.lay = { key, s, mode, fs, lh, pad, nf, nameH, cueH, ps, por, nm, ink:wi.ink, who, rtl, box, plate, textW,
    pages, chars:chU, dur, starts, total: starts[starts.length-1]+dur[dur.length-1] });
}

/* ---------- outils de dessin « encre sur papier » pour les planches et les portraits ---------- */
let CINE_PAPER = null;
function cinePaper(){                                // texture de page de carnet (cuite une fois)
  if (CINE_PAPER) return CINE_PAPER;
  const c = document.createElement('canvas'); c.width = 320; c.height = 200; const g = c.getContext('2d');
  g.fillStyle = '#e9dfc6'; g.fillRect(0,0,320,200);
  let sd = 77; const rnd = ()=>{ sd = (sd*16807)%2147483647; return sd/2147483647; };
  for (let i=0;i<1500;i++){ g.fillStyle = 'rgba('+(rnd()<0.5? '80,60,30':'255,250,235')+','+(0.03+rnd()*0.05).toFixed(3)+')';
    g.fillRect(rnd()*320, rnd()*200, 1+rnd()*2.4, 1+rnd()*1.2); }
  g.strokeStyle = 'rgba(70,90,130,0.13)'; g.lineWidth = 1;
  for (let y=14; y<200; y+=13){ g.beginPath(); g.moveTo(0,y+0.5); g.lineTo(320,y+0.5); g.stroke(); }
  return (CINE_PAPER = c);
}
// fond de planche : page de carnet + vignettage ; renvoie l'échelle (les planches sont dessinées sur 480×270)
function plateBase(g, w, h, tint){
  g.drawImage(cinePaper(), 0, 0, w, h);
  if (tint){ g.fillStyle = tint; g.fillRect(0,0,w,h); }
  const sc = Math.min(w/480, h/270);
  g.save(); g.translate((w-480*sc)/2, (h-270*sc)/2); g.scale(sc, sc);
  return sc;
}
function plateEnd(g, w, h){ g.restore();
  const v = g.createRadialGradient(w/2,h/2,h*0.35,w/2,h/2,h*0.95); v.addColorStop(0,'rgba(40,24,10,0)'); v.addColorStop(1,'rgba(40,24,10,0.42)');
  g.fillStyle = v; g.fillRect(0,0,w,h); }
// trait d'encre légèrement tremblé entre des points [x,y,…] ; n = part du tracé déjà dessinée (0..1)
function inkLine(g, pts, n, wd, col){
  const m = pts.length/2; if (m<2) return; n = clamp(n==null? 1 : n, 0, 1); if (n<=0) return;
  g.strokeStyle = col || '#1f1b17'; g.lineWidth = wd || 1.6; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); const last = (m-1)*n;
  for (let i=0;i<m;i++){ if (i>Math.ceil(last)) break;
    let x = pts[i*2], y = pts[i*2+1];
    if (i>last){ const f = last-(i-1); x = lerp(pts[i*2-2], x, f); y = lerp(pts[i*2-1], y, f); }
    const j = Math.sin(i*12.9+pts[0])*0.7; x += j; y += Math.cos(i*7.3+pts[1])*0.7;
    i? g.lineTo(x,y) : g.moveTo(x,y); }
  g.stroke();
}
// lavis : aplat d'encre diluée dans un polygone
function inkWash(g, pts, col, a){ g.fillStyle = col || '#1f1b17'; g.globalAlpha = a==null? 0.18 : a; g.beginPath();
  for (let i=0;i<pts.length;i+=2) i? g.lineTo(pts[i],pts[i+1]) : g.moveTo(pts[i],pts[i+1]); g.closePath(); g.fill(); g.globalAlpha = 1; }
// hachures dans un rectangle (ombres)
function inkHatch(g, x, y, w, h, step, col, a){ g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip(); g.strokeStyle = col || '#1f1b17'; g.globalAlpha = a==null? 0.3 : a; g.lineWidth = 0.8;
  g.beginPath(); for (let k=-h; k<w; k+=step||5){ g.moveTo(x+k, y+h); g.lineTo(x+k+h, y); } g.stroke(); g.restore(); }
// petit personnage à l'encre (silhouette) : pieds en (x,y), hauteur s
function inkFolk(g, x, y, s, col, arm){ g.fillStyle = col || '#1f1b17';
  g.beginPath(); g.arc(x, y-s*0.86, s*0.13, 0, 6.283); g.fill();
  g.beginPath(); g.moveTo(x-s*0.17, y-s*0.72); g.lineTo(x+s*0.17, y-s*0.72); g.lineTo(x+s*0.13, y-s*0.3); g.lineTo(x+s*0.16, y); g.lineTo(x+s*0.04, y);
  g.lineTo(x, y-s*0.26); g.lineTo(x-s*0.04, y); g.lineTo(x-s*0.16, y); g.lineTo(x-s*0.13, y-s*0.3); g.closePath(); g.fill();
  if (arm){ g.strokeStyle = g.fillStyle; g.lineWidth = s*0.08; g.lineCap = 'round'; g.beginPath(); g.moveTo(x+s*0.14, y-s*0.66); g.lineTo(x+s*0.34, y-s*(0.66+0.4*arm)); g.stroke(); } }

function cinePortrait(id){
  const p = CINE_PORTRAITS[id]; if (!p) return null;
  return fxSprite('CINEP_'+id, 128, 128, g => { g.scale(2,2); g.drawImage(cinePaper(), 0, 0, 64, 64); p(g);
    g.strokeStyle = '#1f1b17'; g.lineWidth = 1.5; g.strokeRect(0.75,0.75,62.5,62.5); });
}
// SOL : soixantaine, chignon gris, lunettes rondes, casque radio, foulard rouge
CINE_PORTRAITS.sol = g => {
  inkWash(g, [10,64, 14,50, 24,44, 40,44, 50,50, 54,64], '#3d4a3a', 0.85);                       // vareuse
  inkWash(g, [22,46, 32,54, 42,46, 40,42, 24,42], '#c42a1c', 0.95);                              // foulard
  g.fillStyle = '#e2c4a2'; g.beginPath(); g.ellipse(32, 28, 11, 13.5, 0, 0, 6.283); g.fill();     // visage
  g.fillStyle = '#b9b4ac'; g.beginPath(); g.ellipse(32, 17, 12.5, 7.5, 0, 3.14, 6.283); g.fill(); // cheveux
  g.beginPath(); g.arc(41, 12, 5, 0, 6.283); g.fill();                                           // chignon
  inkLine(g, [21,20, 24,14, 32,11, 40,14, 43,20], 1, 1.2);
  g.strokeStyle = '#1f1b17'; g.lineWidth = 1.2;
  g.beginPath(); g.arc(27, 28, 4, 0, 6.283); g.stroke(); g.beginPath(); g.arc(37, 28, 4, 0, 6.283); g.stroke();   // lunettes
  g.beginPath(); g.moveTo(31,28); g.lineTo(33,28); g.stroke();
  g.fillStyle = '#1f1b17'; g.fillRect(26,27.4,1.6,1.6); g.fillRect(36,27.4,1.6,1.6);
  inkLine(g, [28,36, 32,37.4, 36,36], 1, 1.1);                                                    // bouche
  inkLine(g, [24,33, 26,35], 1, 0.7); inkLine(g, [40,33, 38,35], 1, 0.7);                         // rides
  g.strokeStyle = '#1f1b17'; g.lineWidth = 2.2; g.beginPath(); g.arc(32, 22, 13.5, 3.5, 5.9); g.stroke();          // arceau du casque
  g.fillStyle = '#1f1b17'; g.fillRect(17,23,4.5,9); g.fillRect(42.5,23,4.5,9);                    // écouteurs
  inkLine(g, [19,32, 20,38, 26,40], 1, 1.1); g.beginPath(); g.arc(27, 40, 1.8, 0, 6.283); g.fill();                // micro
};
// 55 (Kassandre) : un bipeur, deux chiffres sur un écran à cristaux
CINE_PORTRAITS.k55 = g => {
  g.fillStyle = '#23292b'; g.fillRect(9,16,46,34); g.fillStyle = '#31393c'; g.fillRect(9,16,46,5);
  g.fillStyle = '#9db79a'; g.fillRect(14,24,36,17);
  g.fillStyle = 'rgba(20,40,24,0.14)'; for (let y=25;y<41;y+=2) g.fillRect(14,y,36,1);
  g.fillStyle = '#1b2a1c'; g.font = '700 15px "Courier New",monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('55', 32, 33);
  g.fillStyle = '#0b6fa8'; g.beginPath(); g.arc(49, 45.5, 1.6, 0, 6.283); g.fill();
  g.fillStyle = '#4a5558'; g.fillRect(14,44,10,3); g.fillRect(27,44,10,3);
  inkLine(g, [20,16, 20,9, 24,9], 1, 1.4);
};
// « NOUS » : la Singularité — un cercle vide, parfaitement régulier, sur fond de trame
CINE_PORTRAITS.nous = g => {
  g.fillStyle = '#dfe6ea'; g.fillRect(0,0,64,64);
  g.fillStyle = 'rgba(40,60,80,0.16)'; for (let y=2;y<64;y+=4) for (let x=(y%8? 2:4); x<64; x+=4) g.fillRect(x,y,1.2,1.2);
  g.strokeStyle = '#26323c'; g.lineWidth = 3; g.beginPath(); g.arc(32,32,15,0,6.283); g.stroke();
  g.lineWidth = 1; g.beginPath(); g.arc(32,32,21,0,6.283); g.stroke();
};

/* ---------- rendu (espace écran, par-dessus le monde ; remplace le HUD pendant la scène) ---------- */
function drawCine(){
  const s = cineShot(); if (!s) return;
  const t = CINE.t, dur = cineDur(s), k = clamp(t/dur, 0, 1), pal = UIPAL.HUM, fr = cineFrame();
  const lay = s.txt? cineLayout(s) : null;
  let P = null;                                                             // cadre de la planche
  if (s.plate){
    P = lay && lay.plate || { x:0, y:0, w:W, h:H };
    if (lay){ ctx.fillStyle = '#0d0b0a'; ctx.fillRect(0,0,W,H); }
    ctx.save(); ctx.beginPath(); ctx.rect(P.x, P.y, P.w, P.h); ctx.clip(); ctx.translate(P.x, P.y);
    s.plate(ctx, P.w, P.h, t, k); ctx.restore();
    const a = 1 - Math.min(1, t/0.5);                                       // la page arrive en fondu
    if (a>0){ ctx.fillStyle = 'rgba(14,10,8,'+a.toFixed(3)+')'; ctx.fillRect(P.x, P.y, P.w, P.h); }
  }
  const bh = Math.round(fr.bh*ease(CINE.bar));                              // bandes noires
  ctx.fillStyle = '#0d0b0a'; ctx.fillRect(0,0,W,bh); ctx.fillRect(0,H-bh,W,bh);
  if (s.title){                                                             // carton-titre au pochoir
    const a = Math.min(1, t/0.5, (dur-t)/0.5 + 1), cy = P? P.y+P.h*0.45 : H*0.40;
    ctx.save(); ctx.globalAlpha = clamp(a,0,1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const big = Math.min(48, W*0.058, fr.fs*2.3);
    ctx.font = big+'px '+UI_STEN; const tx = cT(s.title).toUpperCase(), tw = ctx.measureText(tx).width, sub = s.sub? fr.fs*1.5 : 0;
    ctx.fillStyle = 'rgba(13,11,10,0.78)'; ctx.fillRect(W/2-tw/2-26, cy-big*0.8, tw+52, big*1.6 + sub);
    ctx.fillStyle = '#c42a1c'; ctx.fillRect(W/2-tw/2-26, cy-big*0.8, 5, big*1.6 + sub);
    ctx.fillStyle = '#efe6cf'; ctx.fillText(tx, W/2, cy);
    if (s.sub){ ctx.font = cineFont('sol', fr.fs*0.8); ctx.fillStyle = '#e2d4b0'; ctx.fillText(cT(s.sub), W/2, cy+big*0.8+sub*0.4); }
    ctx.restore();
  }
  if (lay) cineDrawText(lay, t);
  if (s.choice){ const rs = cineChoiceRects(s), a = clamp((t-0.3)/0.4, 0, 1), fs = lay? lay.fs : fr.fs;   // CHOIX : deux bons à tamponner
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    s.choice.forEach((o,i)=>{ const q = rs[i], ink = o.ink || '#c42a1c';
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(q.x+3, q.y+4, q.w, q.h);
      ctx.fillStyle = pal.paper; ctx.fillRect(q.x, q.y, q.w, q.h); ctx.globalAlpha = a*0.5; ctx.fillStyle = paperGrain(); ctx.fillRect(q.x, q.y, q.w, q.h); ctx.globalAlpha = a;
      ctx.fillStyle = ink; ctx.fillRect(q.x, q.y, q.w, 4); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.strokeRect(q.x+4.5, q.y+8.5, q.w-9, q.h-13);
      const lf = Math.min(fs*1.15, q.w*0.085); ctx.font = lf.toFixed(1)+'px '+UI_STEN; ctx.fillStyle = ink;
      ctx.fillText((cineTouch()? '' : (i+1)+' · ')+cT(o.label).toUpperCase(), q.x+q.w/2, q.y+q.h*(o.sub? 0.34 : 0.52));
      if (o.sub){ const sf = fs*0.74; ctx.font = cineFont('sol', sf); ctx.fillStyle = '#1f1b17';
        cineWrap(cT(o.sub), q.w-28).slice(0,2).forEach((l,j)=> ctx.fillText(l, q.x+q.w/2, q.y+q.h*0.62+j*sf*1.25)); } });
    ctx.restore(); }
  // bouton PASSER LA CINÉMATIQUE (+ bouton voix off quand des voix existent pour cette langue)
  const r = fr.skip, ga = 0.92*ease(CINE.bar); ctx.save(); ctx.globalAlpha = ga;
  ctx.fillStyle = 'rgba(13,11,10,0.7)'; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = 'rgba(232,216,170,0.7)'; ctx.lineWidth = 1.2; ctx.strokeRect(r.x+0.5, r.y+0.5, r.w-1, r.h-1);
  ctx.font = r.f.toFixed(1)+'px '+UI_TYPE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f0e2b8';
  ctx.fillText(r.lbl + r.hint, r.x+r.w/2, r.y+r.h/2+0.5);
  const v = fr.vbtn; if (v){ ctx.fillStyle = 'rgba(13,11,10,0.7)'; ctx.fillRect(v.x, v.y, v.w, v.h); ctx.strokeRect(v.x+0.5, v.y+0.5, v.w-1, v.h-1);
    const cx = v.x+v.w/2-v.w*0.08, cy = v.y+v.h/2, u = v.h*0.16; ctx.fillStyle = '#f0e2b8';     // haut-parleur, barré si coupé
    ctx.beginPath(); ctx.moveTo(cx-u*2, cy-u); ctx.lineTo(cx-u, cy-u); ctx.lineTo(cx+u*0.6, cy-u*2.2); ctx.lineTo(cx+u*0.6, cy+u*2.2); ctx.lineTo(cx-u, cy+u); ctx.lineTo(cx-u*2, cy+u); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f0e2b8'; ctx.lineWidth = Math.max(1.5, u*0.45);
    if (SETTINGS.voice){ ctx.beginPath(); ctx.arc(cx+u*1.2, cy, u*1.3, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(cx+u*1.2, cy, u*2.3, -0.9, 0.9); ctx.stroke(); }
    else { ctx.strokeStyle = '#e0533f'; ctx.beginPath(); ctx.moveTo(v.x+v.w*0.2, v.y+v.h*0.8); ctx.lineTo(v.x+v.w*0.82, v.y+v.h*0.2); ctx.stroke(); } }
  ctx.restore();
}
// la réplique : feuillet (nom, portrait, texte tapé à la machine), repère « suite ▸ », minuterie, pages
function cineDrawText(lay, t){
  const b = lay.box, p = cinePage(lay, t), lines = lay.pages[p], pal = UIPAL.HUM;
  const shown = Math.floor((t - lay.starts[p]) * CINE_CPS()), done = shown >= lay.chars[p];
  const a = Math.min(1, t/0.25), rtl = lay.rtl, pad = lay.pad, who = lay.who;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(b.x+3, b.y+4, b.w, b.h);
  ctx.fillStyle = who==='k55'? '#ecf2e8' : (who==='nous' || who==='voix')? '#e8edf0' : '#efe7d2'; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.globalAlpha = a*0.45; ctx.fillStyle = paperGrain(); ctx.fillRect(b.x, b.y, b.w, b.h); ctx.globalAlpha = a;
  ctx.fillStyle = lay.ink; ctx.fillRect(b.x, b.y, b.w, 3);
  // portrait : en tête de colonne (mode 'side'), sinon à gauche (à droite en arabe)
  let tx = rtl? b.x+b.w-pad : b.x+pad, ty = b.y+pad;
  if (lay.por){
    if (lay.mode==='side'){ const px = rtl? b.x+b.w-pad-lay.ps : b.x+pad; ctx.drawImage(lay.por, px, ty, lay.ps, lay.ps);
      if (lay.nm){ ctx.font = lay.nf+'px '+UI_TYPE; ctx.fillStyle = lay.ink; ctx.textAlign = rtl? 'right' : 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(lay.nm, rtl? px-pad*0.7 : px+lay.ps+pad*0.7, ty+lay.ps/2); }
      ty += lay.ps + Math.round(pad*0.6); }
    else { const px = rtl? b.x+b.w-pad-lay.ps : b.x+pad; ctx.drawImage(lay.por, px, b.y+pad, lay.ps, lay.ps);
      tx = rtl? px-pad : px+lay.ps+pad; }
  }
  ctx.textAlign = rtl? 'right' : 'left'; ctx.textBaseline = 'middle';
  if (lay.nm && !(lay.por && lay.mode==='side')){ ctx.font = lay.nf+'px '+UI_TYPE; ctx.fillStyle = lay.ink; ctx.fillText(lay.nm, tx, ty+lay.nameH*0.4); }
  if (!(lay.por && lay.mode==='side')) ty += lay.nameH;
  ctx.font = cineFont(who, lay.fs); ctx.fillStyle = '#17130f';
  let left = done? 1e9 : Math.max(0, shown);
  lines.forEach((l,j)=>{ if (left<=0) return; ctx.fillText(l.slice(0, left), tx, ty+lay.lh*(j+0.5)); left -= l.length; });
  // pied du feuillet : pages (●○), minuterie d'avance automatique, « suite ▸ »
  const fy = b.y+b.h-lay.cueH*0.62, s = lay.s;
  if (lay.pages.length>1){ ctx.fillStyle = lay.ink; for (let i=0;i<lay.pages.length;i++){ const dx = (rtl? -1 : 1)*i*lay.fs*0.6, cx = (rtl? b.x+b.w-pad : b.x+pad)+dx;
    ctx.beginPath(); ctx.arc(cx, fy, lay.fs*0.16, 0, 6.283); i===p? ctx.fill() : (ctx.lineWidth = 1, ctx.strokeStyle = lay.ink, ctx.stroke()); } }
  if (done){
    const tEnd = lay.starts[p] + lay.dur[p], tTy = cineTyped(lay, p), q = clamp((t-tTy)/Math.max(0.1, tEnd-tTy), 0, 1);
    if (!s.choice){ ctx.fillStyle = 'rgba(31,27,23,0.22)'; ctx.fillRect(b.x, b.y+b.h-2, b.w, 2); ctx.fillStyle = lay.ink; ctx.fillRect(rtl? b.x+b.w*(1-q) : b.x, b.y+b.h-2, b.w*q, 2); }
    const cue = s.choice? cT(CINE_UI.pick) : (rtl? '◂ ' : '')+cT(CINE_UI.next)+(rtl? '' : ' ▸')+(cineTouch()? '' : '  ['+cT(CINE_UI.space)+']');
    ctx.globalAlpha = a*(0.7 + 0.3*Math.sin(performance.now()/260));
    ctx.font = Math.round(lay.fs*0.72)+'px '+UI_TYPE; ctx.fillStyle = lay.ink; ctx.textAlign = rtl? 'left' : 'right';
    ctx.fillText(cue, rtl? b.x+pad : b.x+b.w-pad, fy);
  }
  ctx.restore();
}
