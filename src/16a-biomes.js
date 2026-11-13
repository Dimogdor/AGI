/* ================= LIEUX DE CAMPAGNE (v1.15) =================
   Un LIEU remplace, pour une mission, tout le décor de l'escarmouche : ciel, plans de fond en
   parallaxe (peints une fois dans des calques hors écran puis recopiés), sol, relief, météo,
   nuit éclairée par des sources de lumière, musique et ambiance sonore. game.biome = BIOMES[id].
   Champs d'un lieu :
     sky:[zénith,milieu,horizon]  couleurs [r,g,b]
     dirt, grass                  couleurs du sol et de la bande de surface ; tufts:false = pas d'herbe
     terrain                      profil du relief (mêmes champs que TERRAIN_DEFAULT)
     layers:[{par,w,h,off,paint(g,w,h,rnd),a()}]  calques du plus lointain au plus proche ; par =
                                  parallaxe (0 = fixe, 1 = colle au sol) ; a() = opacité dynamique
     sky2(vw,t)                   astres et nuages propres au lieu (avant les calques)
     back(vw,t)                   éléments animés derrière le champ de bataille (repère monde−camX)
     front(t)                     météo au premier plan (repère écran)
     dark                         0..1 obscurité ; les trous de lumière viennent de game.camp.lights
     trees:false                  pas d'arbres ; music / amb : thème et ambiance (voir 03-audio)   */
const BIOMES = {};
const BIOME_BAKED = new Map();
function biomeRnd(seed){ let s = seed||1; return ()=>{ s = (s*16807)%2147483647; return s/2147483647; }; }
function biomeLayer(B, i){
  const key = B.id+'#'+i; let c = BIOME_BAKED.get(key);
  if (!c){ const L = B.layers[i]; c = document.createElement('canvas'); c.width = L.w; c.height = L.h;
    const g = c.getContext('2d'); L.paint(g, L.w, L.h, biomeRnd(101+i*37+B.id.length*13)); BIOME_BAKED.set(key, c); }
  return c;
}
function biomeBack(B, vw, t){
  if (B.sky2) B.sky2(vw, t);
  for (let i=0;i<B.layers.length;i++){ const L = B.layers[i], a = L.a? L.a() : 1; if (a<=0.01) continue;
    const c = biomeLayer(B, i), y = GROUND - L.h + (L.off||0);
    let x = -((camX*L.par) % L.w); if (x>0) x -= L.w;
    ctx.globalAlpha = a; for (; x<vw; x+=L.w) ctx.drawImage(c, Math.round(x), y); ctx.globalAlpha = 1; }
  if (B.back) B.back(vw, t);
}
// OBSCURITÉ : voile sombre au quart de résolution, percé d'un halo par source de lumière
let DARK_CV = null, DARK_HOLE = null;
function biomeDark(B){
  const d = typeof B.dark==='function'? B.dark() : B.dark; if (!(d>0.02)) return;
  const cw = Math.ceil(W/4), ch = Math.ceil(H/4);
  if (!DARK_CV){ DARK_CV = document.createElement('canvas');
    DARK_HOLE = document.createElement('canvas'); DARK_HOLE.width = DARK_HOLE.height = 64; const h = DARK_HOLE.getContext('2d');
    const r = h.createRadialGradient(32,32,2,32,32,32); r.addColorStop(0,'rgba(0,0,0,1)'); r.addColorStop(0.55,'rgba(0,0,0,0.78)'); r.addColorStop(1,'rgba(0,0,0,0)');
    h.fillStyle = r; h.fillRect(0,0,64,64); }
  if (DARK_CV.width!==cw || DARK_CV.height!==ch){ DARK_CV.width = cw; DARK_CV.height = ch; }
  const g = DARK_CV.getContext('2d');
  g.globalCompositeOperation = 'source-over'; g.clearRect(0,0,cw,ch);
  const c = B.darkCol || [6,8,22]; g.fillStyle = 'rgba('+c[0]+','+c[1]+','+c[2]+','+d.toFixed(3)+')'; g.fillRect(0,0,cw,ch);
  g.globalCompositeOperation = 'destination-out';
  const Ls = (game.camp && game.camp.lights) || [];
  for (const L of Ls){ const sx = w2sX(L.x)/4, sy = w2sY(L.y!=null? L.y : gY(L.x)-30)/4, r = L.r*zoom/4*1.25;
    if (sx<-r || sx>cw+r) continue; g.globalAlpha = L.a==null? 1 : L.a; g.drawImage(DARK_HOLE, sx-r, sy-r*0.8, r*2, r*1.6); }
  g.globalAlpha = 1;
  ctx.imageSmoothingEnabled = true; ctx.drawImage(DARK_CV, 0, 0, W, H);
}
function biomeFront(dt){ const B = game.biome; if (!B) return; biomeDark(B); if (B.front) B.front(performance.now()/1000); }
// pluie oblique (repère écran) : traits fins, deux plans
function fxRain(t, n, col, slant){
  ctx.save(); ctx.strokeStyle = col || 'rgba(170,190,220,0.28)'; ctx.lineWidth = 1; ctx.beginPath();
  const lo = SETTINGS.quality==='low'; n = lo? n>>1 : n; slant = slant==null? -0.22 : slant;
  for (let i=0;i<n;i++){ const sp = 620+(i%7)*60, x = ((i*131.7 + t*sp*slant*-1) % (W+80) + W+80) % (W+80) - 40, y = (i*71.3 + t*sp) % (H+40) - 20, l = 9+(i%5)*3;
    ctx.moveTo(x, y); ctx.lineTo(x+l*slant, y+l); }
  ctx.stroke(); ctx.restore();
}
// neige / cendres : flocons portés par le vent (repère écran)
function fxSnow(t, n, col, wind, fall){
  ctx.save(); ctx.fillStyle = col || 'rgba(240,244,250,0.8)'; const lo = SETTINGS.quality==='low'; n = lo? n>>1 : n;
  for (let i=0;i<n;i++){ const sz = 1+(i%4)*0.6, x = ((i*97.3 + t*(wind||60)*(0.6+(i%5)*0.2) + Math.sin(t*0.8+i)*14) % (W+40) + W+40) % (W+40) - 20,
      y = (i*53.9 + t*(fall||46)*(0.6+(i%3)*0.3)) % (H+20) - 10;
    ctx.fillRect(x, y, sz, sz); }
  ctx.restore();
}

/* ---------- I · VALMONT, LA NUIT ---------- */
// fenêtres d'un immeuble : lit = proportion de fenêtres allumées, col = teinte de la lumière
function bWindows(g, rnd, x, y, w, h, cw, chh, lit, col, dark){
  for (let yy=y+5; yy<y+h-chh-2; yy+=chh+5) for (let xx=x+4; xx<x+w-cw-2; xx+=cw+4){
    const on = rnd()<lit; g.fillStyle = on? col : (dark||'rgba(8,10,18,0.55)'); g.fillRect(xx, yy, cw, chh);
    if (on && rnd()<0.35){ g.fillStyle = 'rgba(20,14,10,0.5)'; g.fillRect(xx, yy+chh*0.45, cw, chh*0.55); } }
}
function nightBlocks(lit){ return (g, w, h, rnd) => {                 // barres d'immeubles (plan moyen) — version éteinte / rallumée
  const wr = biomeRnd(lit? 911 : 517);                                 // rnd = géométrie (identique dans les deux versions) ; wr = détails
  let x = 6; while (x < w-70){ const bw = 54+rnd()*70, bh = 70+rnd()*110, y = h-bh, gap = 4+rnd()*22, ant = rnd(), edi = rnd();
    if (x+bw > w-4) break;
    if (!lit){ g.fillStyle = 'rgb('+(26+wr()*10|0)+','+(28+wr()*10|0)+','+(44+wr()*12|0)+')'; g.fillRect(x, y, bw, bh);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x+bw-7, y, 7, bh);                                     // pignon dans l'ombre
      g.fillStyle = 'rgba(120,130,170,0.10)'; g.fillRect(x, y, bw, 2);
      if (ant<0.5){ g.fillStyle = '#1a1c2a'; g.fillRect(x+bw*0.3, y-9, 3, 9); g.fillRect(x+bw*0.3-4, y-9, 11, 1.5); }   // antenne râteau
      if (edi<0.3){ g.fillStyle = '#20222f'; g.fillRect(x+bw*0.6, y-6, 12, 6); }                          // édicule
      bWindows(g, wr, x, y, bw-7, bh, 5, 7, 0.07, 'rgba(255,196,120,0.75)');
    } else bWindows(g, wr, x, y, bw-7, bh, 5, 7, 0.62, 'rgba(255,206,128,0.92)', 'rgba(0,0,0,0)');
    x += bw + gap; }
}; }
function nightStreet(lit){ return (g, w, h, rnd) => {                  // rue proche : pavillons, commerces à rideau de fer, lampadaires, fils
  const wr = biomeRnd(lit? 313 : 127);
  let x = 0; while (x < w-60){ const bw = 60+rnd()*80, bh = 44+rnd()*46, y = h-bh, shop = rnd()<0.45, roof = 16+rnd()*10, gap = rnd()*10;
    if (x+bw > w) break;
    if (!lit){ g.fillStyle = 'rgb('+(34+wr()*12|0)+','+(32+wr()*10|0)+','+(46+wr()*10|0)+')'; g.fillRect(x, y, bw, bh);
      if (!shop){ g.fillStyle = '#231f2c'; g.beginPath(); g.moveTo(x-3, y); g.lineTo(x+bw*0.5, y-roof); g.lineTo(x+bw+3, y); g.closePath(); g.fill();   // toit
        g.fillStyle = '#2b2734'; g.fillRect(x+bw*0.7, y-22, 7, 16); }                                    // cheminée
      else { g.fillStyle = '#2a2836'; g.fillRect(x-2, y-4, bw+4, 5);
        g.fillStyle = '#3a3b48'; g.fillRect(x+6, h-30, bw-12, 30);                                         // rideau de fer
        g.fillStyle = 'rgba(0,0,0,0.3)'; for (let yy=h-28; yy<h; yy+=4) g.fillRect(x+6, yy, bw-12, 1);
        g.fillStyle = 'rgba(150,50,44,0.55)'; g.fillRect(x+8, y+5, bw-16, 8); }                           // enseigne éteinte
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x+bw-6, y, 6, bh);
      if (!shop) bWindows(g, wr, x, y+4, bw-6, bh-6, 8, 10, 0.1, 'rgba(255,190,110,0.8)', 'rgba(10,10,18,0.7)');
    } else if (!shop) bWindows(g, wr, x, y+4, bw-6, bh-6, 8, 10, 0.7, 'rgba(255,208,130,0.95)', 'rgba(0,0,0,0)');
    else { g.fillStyle = 'rgba(255,120,90,0.85)'; g.fillRect(x+8, y+5, bw-16, 8); }
    x += bw + gap; }
  // lampadaires + fils
  for (let lx=70; lx<w; lx+=205){
    if (!lit){ g.strokeStyle = '#15161f'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(lx, h); g.lineTo(lx, h-88); g.quadraticCurveTo(lx, h-98, lx+14, h-98); g.stroke();
      g.fillStyle = '#15161f'; g.fillRect(lx+10, h-99, 12, 4); }
    else { const r = g.createRadialGradient(lx+16, h-92, 2, lx+16, h-60, 78); r.addColorStop(0,'rgba(255,214,140,0.85)'); r.addColorStop(0.25,'rgba(255,190,110,0.32)'); r.addColorStop(1,'rgba(255,180,100,0)');
      g.fillStyle = r; g.beginPath(); g.moveTo(lx+16, h-96); g.lineTo(lx+78, h); g.lineTo(lx-46, h); g.closePath(); g.fill();
      g.fillStyle = '#fff0cc'; g.fillRect(lx+11, h-96, 10, 2.5); } }
  if (!lit){ g.strokeStyle = 'rgba(10,10,16,0.8)'; g.lineWidth = 1;
    for (let lx=70; lx<w; lx+=205){ g.beginPath(); g.moveTo(lx, h-80); g.quadraticCurveTo(lx+102, h-66, lx+205, h-80); g.stroke(); } }
}; }
BIOMES.night = {
  id:'night', music:'night', amb:{ rain:0.05, wind:0.012 },
  sky:[[10,13,32],[30,34,66],[96,70,84]], dirt:[44,44,54], grass:[78,80,92], tufts:false, trees:false,
  terrain:{a:5,f1:0.0042,b:3,f2:0.0113,c:2,f3:0.021,base:3},
  dark:()=> CINE.on? 0.36 : 0.74, darkCol:[5,7,20],
  layers:[
    { par:0.06, w:1024, h:250, off:4, paint(g, w, h, rnd){                              // tours d'Omnicorp, au loin
        g.fillStyle = 'rgba(160,110,110,0.20)'; g.fillRect(0, h-46, w, 46);              // halo de la ville
        let x = 20; while (x < w-60){ const bw = 26+rnd()*34, bh = 110+rnd()*130;
          g.fillStyle = 'rgb(24,28,52)'; g.fillRect(x, h-bh, bw, bh);
          g.fillStyle = 'rgba(120,190,255,0.5)'; for (let yy=h-bh+6; yy<h-10; yy+=9) if (rnd()<0.5) g.fillRect(x+3, yy, bw-6, 1.2);
          if (rnd()<0.6){ g.fillStyle = 'rgb(24,28,52)'; g.fillRect(x+bw/2-1, h-bh-22, 2, 22); g.fillStyle = 'rgba(255,70,60,0.9)'; g.fillRect(x+bw/2-1.5, h-bh-24, 3, 3); }
          x += bw + 30 + rnd()*90; } } },
    { par:0.16, w:1024, h:200, off:4, paint: nightBlocks(false) },
    { par:0.16, w:1024, h:200, off:4, paint: nightBlocks(true), a:()=> (game.camp && game.camp.litK) || 0 },
    { par:0.36, w:1024, h:128, off:5, paint: nightStreet(false) },
    { par:0.36, w:1024, h:128, off:5, paint: nightStreet(true), a:()=> (game.camp && game.camp.litK) || 0 },
  ],
  sky2(vw, t){                                                                           // lune voilée + quelques étoiles
    ctx.fillStyle = 'rgba(220,226,255,0.55)';
    for (let i=0;i<26;i++){ const x = (i*197.3)%vw, y = 14+(i*61.7)%150; ctx.globalAlpha = 0.25+0.3*Math.abs(Math.sin(t*0.6+i)); ctx.fillRect(x, y, 1.3, 1.3); }
    ctx.globalAlpha = 1;
    const mx = vw*0.72 - camX*0.02, my = 74;
    ctx.fillStyle = 'rgba(226,230,246,0.10)'; ctx.beginPath(); ctx.arc(mx, my, 46, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(232,234,244,0.92)'; ctx.beginPath(); ctx.arc(mx, my, 17, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(30,34,66,0.9)'; ctx.beginPath(); ctx.arc(mx+7, my-4, 15, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(40,44,74,0.55)';                                               // nuages bas qui passent
    for (let i=0;i<4;i++){ const cx = ((t*5+i*330 - camX*0.03) % (vw+400) + vw+400) % (vw+400) - 200, cy = 60+i*34;
      ctx.beginPath(); ctx.ellipse(cx, cy, 150, 13, 0, 0, 6.283); ctx.fill(); }
  },
  front(t){ fxRain(t, 110, 'rgba(170,190,225,0.26)'); },
};
