/* ================= CINÉMATIQUES DE CAMPAGNE (v1.15) =================
   Un script est une liste de PLANS joués l'un après l'autre. Un plan peut être :
     · une PLANCHE (plate) : illustration plein écran peinte à la main (page du carnet de Sol) ;
     · un plan SUR LE TERRAIN : la carte réelle, bandes noires, caméra qui se déplace, la
       simulation figée (ou vivante si live:true) — sert aussi en pleine mission.
   Champs d'un plan :
     plate(g,w,h,t,k)  peintre plein écran (t = secondes dans le plan, k = 0..1)
     cam:{x, t}        cible caméra (x monde, ou fonction g=>x) atteinte en t secondes
     who, txt          sous-titre : qui parle (portrait) et quoi ({fr,en,…})
     dur               durée (sinon calculée d'après la longueur du texte)
     fx(g,c)           action au début du plan (TOUJOURS exécutée, même si on passe la scène)
     snd, mus          bruitage / thème musical à l'entrée du plan
     live              la simulation continue pendant ce plan
     title:{…}         grand titre au pochoir (carton)
     choice:[{label, sub, ink, pick(g,c), then(g,c)}]  CHOIX offert au joueur : le plan attend un appui sur l'un des
                       boutons ; then() renvoie les plans qui suivent ce choix ; PASSER s'arrête sur le choix
   Un appui = plan suivant ; bouton PASSER = fin de la scène. */
const CINE = { on:false, script:null, i:0, t:0, done:null, bar:0, cam0:0, camBack:null, follow:true, mus:null, fade:0, restore:true };
const CINE_WHO = {                                   // nom affiché et encre de chaque voix
  sol:  { name:'SOL', ink:'#c42a1c' },
  k55:  { name:'55', ink:'#0b6fa8' },
  nous: { name:{fr:'« NOUS »', en:'"WE"'}, ink:'#3a4a58' },
  nar:  { name:null, ink:'#1f1b17' },
};
const CINE_PORTRAITS = {};                           // id → peintre (g) sur une vignette 64×64 (encre sur papier)
const CINE_UI = {
  skip: {fr:"PASSER ▸▸", en:"SKIP ▸▸", es:"SALTAR ▸▸", de:"WEITER ▸▸", it:"SALTA ▸▸", pt:"PULAR ▸▸", ru:"ПРОПУСТИТЬ ▸▸", zh:"跳过 ▸▸", ar:"تخطٍّ ▸▸"},
};
const cineSkipRect = () => ({ x:W-122, y:8, w:112, h:26 });
const cineShot = () => CINE.script && CINE.script[CINE.i];
const cineLive = () => { const s = cineShot(); return !!(s && s.live); };
const cineDur = s => s.dur || (s.txt? 2.4 + cT(s.txt).length/15 : s.title? 3.4 : 2.6);
const ease = k => k<0? 0 : k>1? 1 : k*k*(3-2*k);

function cinePlay(script, done, opt){
  if (!game || !script || !script.length){ if (done) done(); return; }
  if (CINE.on) cineEnd(true);
  CINE.on = true; CINE.script = script; CINE.i = -1; CINE.done = done || null; CINE.bar = 0; CINE.fade = 0;
  CINE.camBack = (opt && opt.keepCam)? null : camX; CINE.follow = camFollow; camFollow = false; CINE.mus = null;
  buildMenu = null; selMode = false; selBox = null;
  cineNext();
}
function cineNext(){
  CINE.i++;
  const s = cineShot(); if (!s){ cineEnd(); return; }
  CINE.t = 0; CINE.cam0 = camX;
  if (s.mus!==undefined) CINE.mus = s.mus;
  if (s.snd) sfx(s.snd);
  if (s.fx) try { s.fx(game, game.camp); } catch(e){}
}
// fin de scène ; les actions (fx) des plans non joués sont exécutées pour que la mission reste cohérente
function cineEnd(silent){
  if (!CINE.on) return;
  const sc = CINE.script || [];
  const ch = silent? -1 : sc.findIndex((s,j)=> j>=CINE.i && s.choice && !s.picked);       // on ne passe pas un choix : la scène s'y arrête
  if (ch>=0){ if (ch>CINE.i){ for (let j=CINE.i+1; j<ch; j++) if (sc[j].fx) try { sc[j].fx(game, game && game.camp); } catch(e){}
      CINE.i = ch-1; cineNext(); } return; }
  for (let j=CINE.i+1; j<sc.length; j++) if (sc[j].fx) try { sc[j].fx(game, game && game.camp); } catch(e){}
  CINE.on = false; CINE.script = null; CINE.mus = null; camFollow = CINE.follow;
  if (CINE.camBack!=null){ camX = CINE.camBack; camClamp(); }
  const d = CINE.done; CINE.done = null;
  if (d && !silent) d();
}
function cineTick(rdt){
  const s = cineShot(); if (!s) return;
  CINE.t += rdt; CINE.bar = Math.min(1, CINE.bar + rdt*2.5);
  if (s.cam && !s.plate){
    const tx = clamp((typeof s.cam.x==='function'? s.cam.x(game) : s.cam.x) - VW()/2, 0, WORLD-VW());
    camX = lerp(CINE.cam0, tx, ease(CINE.t/(s.cam.t || Math.min(2.6, cineDur(s)*0.7))));
  }
  // machine à écrire : petit cliquetis (Sol) ou bip (55) tous les quelques caractères
  if (s.txt && SETTINGS.sfx && AC){ const n = Math.floor(CINE.t*40), len = cT(s.txt).length;
    if (n<len && n!==CINE._n && n%3===0){ const t0 = AC.currentTime;
      if (s.who==='k55' || s.who==='nous') tone(s.who==='nous'? 220 : 1180+(n%5)*40, t0, 0.03, 'sine', 0.012);
      else noise(t0, 0.012, 0.014, 2600); }
    CINE._n = n; }
  if (!s.choice && CINE.t >= cineDur(s) + (s.txt? 1.1 : 0)) cineNext();
}
function cineInput(sx, sy){
  const r = cineSkipRect();
  if (sx>=r.x && sx<=r.x+r.w && sy>=r.y && sy<=r.y+r.h){ cineEnd(); return; }
  const s = cineShot(); if (!s) return;
  if (s.choice){ if (CINE.t>0.6) cineChoiceRects(s).forEach((q,i)=>{ if (sx>=q.x && sx<=q.x+q.w && sy>=q.y && sy<=q.y+q.h) cinePick(i); }); return; }
  if (s.txt && CINE.t*40 < cT(s.txt).length){ CINE.t = cT(s.txt).length/40 + 0.01; return; }   // 1er appui : tout le texte
  if (CINE.t > 0.25) cineNext();
}
// CHOIX : boutons côte à côte (empilés sur écran étroit) ; cinePick applique le choix et enchaîne sur ses plans
function cineChoiceRects(s){ const n = s.choice.length, col = W<560, bw = col? Math.min(W-28, 320) : Math.min(300, (W-28-(n-1)*16)/n), bh = col? 58 : 78;
  const tot = col? bw : n*bw+(n-1)*16, x0 = (W-tot)/2, y0 = H*(col? 0.20 : 0.27);
  return s.choice.map((o,i)=> col? {x:x0, y:y0+i*(bh+10), w:bw, h:bh} : {x:x0+i*(bw+16), y:y0, w:bw, h:bh}); }
function cinePick(i){ const s = cineShot(); if (!s || !s.choice || s.picked) return; const o = s.choice[i]; s.picked = 1; sfx('evolve');
  if (o.pick) o.pick(game, game.camp);
  if (o.then){ const more = o.then(game, game.camp) || []; CINE.script = CINE.script.slice(0, CINE.i+1).concat(more); }
  cineNext(); }
function cineKey(code){
  if (code==='Escape'){ cineEnd(); return; }
  const s = cineShot(); if (s && s.choice){ const i = code==='Digit1' || code==='Numpad1'? 0 : code==='Digit2' || code==='Numpad2'? 1 : -1; if (i>=0 && i<s.choice.length) cinePick(i); return; }
  if (code==='Space' || code==='Enter' || code==='ArrowRight') cineInput(-1, -1);
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
  const t = CINE.t, dur = cineDur(s), k = clamp(t/dur, 0, 1), pal = UIPAL.HUM;
  if (s.plate){
    ctx.save(); s.plate(ctx, W, H, t, k); ctx.restore();
    const a = 1 - Math.min(1, t/0.5);                                       // la page arrive en fondu
    if (a>0){ ctx.fillStyle = 'rgba(14,10,8,'+a.toFixed(3)+')'; ctx.fillRect(0,0,W,H); }
  }
  const bh = Math.round(H*0.105*ease(CINE.bar));                           // bandes noires
  ctx.fillStyle = '#0d0b0a'; ctx.fillRect(0,0,W,bh); ctx.fillRect(0,H-bh,W,bh);
  if (s.title){                                                             // carton-titre au pochoir
    const a = Math.min(1, t/0.5, (dur-t)/0.5 + 1);
    ctx.save(); ctx.globalAlpha = clamp(a,0,1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const big = Math.min(46, W*0.058);
    ctx.font = big+'px '+UI_STEN; const tx = cT(s.title).toUpperCase(), tw = ctx.measureText(tx).width;
    ctx.fillStyle = 'rgba(13,11,10,0.72)'; ctx.fillRect(W/2-tw/2-26, H*0.40-big*0.8, tw+52, big*1.6 + (s.sub? 22 : 0));
    ctx.fillStyle = '#c42a1c'; ctx.fillRect(W/2-tw/2-26, H*0.40-big*0.8, 5, big*1.6 + (s.sub? 22 : 0));
    ctx.fillStyle = '#efe6cf'; ctx.fillText(tx, W/2, H*0.40);
    if (s.sub){ ctx.font = '12px '+UI_TYPE; ctx.fillStyle = '#d8c9a4'; ctx.fillText(cT(s.sub), W/2, H*0.40+big*0.8+6); }
    ctx.restore();
  }
  if (s.txt){                                                               // sous-titre : feuillet tapé à la machine, portrait à gauche
    const full = cT(s.txt), shown = full.slice(0, Math.floor(t*40)), who = CINE_WHO[s.who] || CINE_WHO.nar;
    const por = cinePortrait(s.who), pw = por? 58 : 0;
    const bw = Math.min(W-28, 660), x0 = (W-bw)/2;
    ctx.font = '12.5px '+UI_TYPE; const lines = newsWrap(full, bw-pw-30), lh = 15.5;
    const hh = Math.max(pw+14, 24 + lines.length*lh), y0 = H - hh - Math.max(10, bh*0.28);
    const a = Math.min(1, t/0.25);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x0+3, y0+4, bw, hh);
    ctx.fillStyle = (s.who==='k55')? '#e9f0e6' : (s.who==='nous')? '#e4eaee' : pal.paper; ctx.fillRect(x0, y0, bw, hh);
    ctx.fillStyle = paperGrain(); ctx.fillRect(x0, y0, bw, hh);
    ctx.fillStyle = who.ink; ctx.fillRect(x0, y0, bw, 2.5);
    if (por) ctx.drawImage(por, x0+8, y0+8, pw-2, pw-2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const nm = who.name? (typeof who.name==='string'? who.name : cT(who.name)) : null;
    if (nm){ ctx.font = '8.5px '+UI_TYPE; ctx.fillStyle = who.ink; ctx.fillText(nm, x0+pw+16, y0+11); }
    ctx.font = (s.who==='nar'? 'italic ' : '')+'12.5px '+UI_TYPE; ctx.fillStyle = '#1f1b17';
    let left = shown.length;
    lines.forEach((l,j)=>{ if (left<=0) return; ctx.fillText(l.slice(0,left), x0+pw+16, y0+(nm? 25 : 16)+j*lh); left -= l.length+1; });
    if (shown.length>=full.length && Math.sin(performance.now()/200)>0){ ctx.fillStyle = who.ink; ctx.fillText('▸', x0+bw-16, y0+hh-10); }
    ctx.restore();
  }
  if (s.choice){ const rs = cineChoiceRects(s), a = clamp((t-0.3)/0.4, 0, 1);                       // CHOIX : deux bons à tamponner
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    s.choice.forEach((o,i)=>{ const q = rs[i], ink = o.ink || '#c42a1c';
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(q.x+3, q.y+4, q.w, q.h);
      ctx.fillStyle = pal.paper; ctx.fillRect(q.x, q.y, q.w, q.h); ctx.fillStyle = paperGrain(); ctx.fillRect(q.x, q.y, q.w, q.h);
      ctx.fillStyle = ink; ctx.fillRect(q.x, q.y, q.w, 4); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.strokeRect(q.x+4.5, q.y+8.5, q.w-9, q.h-13);
      ctx.font = Math.min(22, q.w*0.085)+'px '+UI_STEN; ctx.fillStyle = ink; ctx.fillText(cT(o.label).toUpperCase(), q.x+q.w/2, q.y+q.h*0.36);
      if (o.sub){ ctx.font = '10.5px '+UI_TYPE; ctx.fillStyle = '#1f1b17'; newsWrap(cT(o.sub), q.w-26).slice(0,2).forEach((l,k)=> ctx.fillText(l, q.x+q.w/2, q.y+q.h*0.62+k*12)); } });
    ctx.restore(); }
  // bouton PASSER
  const r = cineSkipRect(); ctx.globalAlpha = 0.85*ease(CINE.bar);
  ctx.fillStyle = 'rgba(13,11,10,0.55)'; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = 'rgba(232,216,170,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(r.x+0.5, r.y+0.5, r.w-1, r.h-1);
  ctx.font = '10.5px '+UI_TYPE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#e8d8aa';
  ctx.fillText(cT(CINE_UI.skip), r.x+r.w/2, r.y+r.h/2+0.5); ctx.globalAlpha = 1;
}
