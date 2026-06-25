"use strict";
/* =====================================================================
   AGI — Humains vs GPT · v3
   zoom + lasso + garnison + réparations + upgrades + transcendance
   ===================================================================== */
// toute erreur JS devient visible au lieu de geler silencieusement l'affichage
window.addEventListener('error', ev=>{
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:99;background:#400;color:#fcc;font:11px monospace;padding:4px 8px;max-width:90vw;pointer-events:none';
  d.textContent = '⚠ '+ev.message+' (ligne '+ev.lineno+')';
  document.body.appendChild(d);
  setTimeout(()=>d.remove(), 9000);
});
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const W = 960, H = 540;
const WORLD = 3600, GROUND = 414;
let SCALE = 1, zoom = 1;
const ZMIN = 0.55, ZMAX = 1.25;

function resize() {
  // iOS : window.innerHeight inclut la zone derrière la barre d'outils dynamique et
  // l'indicateur d'accueil → le canvas débordait sous l'écran. visualViewport donne la
  // hauteur RÉELLEMENT visible, ce qui supprime la coupure du bas.
  const vv = window.visualViewport;
  const ww = Math.round(vv ? vv.width  : window.innerWidth);
  const wh = Math.round(vv ? vv.height : window.innerHeight);
  const ratio = 16/9;
  let cw = ww, ch = ww/ratio;
  if (ch > wh) { ch = wh; cw = wh*ratio; }
  // le conteneur épouse la zone visible : le canvas centré reste toujours entièrement à l'écran
  const wrap = document.getElementById('wrap');
  if (wrap){ wrap.style.height = wh+'px'; wrap.style.width = ww+'px'; }
  cv.style.width = cw+'px'; cv.style.height = ch+'px';
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  cv.width = Math.round(cw*dpr); cv.height = Math.round(ch*dpr);
  SCALE = cv.width / W;
  ctx.setTransform(SCALE,0,0,SCALE,0,0);
  // rendu lissé pour les dégradés sculptés (style relief)
  ctx.imageSmoothingEnabled = true;
  // mobile-first : en portrait, le 16:9 deviendrait une bande illisible → on invite à pivoter
  const rot = document.getElementById('rotate');
  if (rot) rot.style.display = (wh > ww*1.02 && ww < 820) ? 'flex' : 'none';
}
window.addEventListener('resize', resize);
// iOS rapporte des dimensions périmées juste après une rotation → on repasse après coup
window.addEventListener('orientationchange', ()=>{ resize(); setTimeout(resize, 250); setTimeout(resize, 600); });
if (window.visualViewport){ window.visualViewport.addEventListener('resize', resize); window.visualViewport.addEventListener('scroll', resize); }
resize();

const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
function lerpCol(c1,c2,t){ return 'rgb('+Math.round(lerp(c1[0],c2[0],t))+','+Math.round(lerp(c1[1],c2[1],t))+','+Math.round(lerp(c1[2],c2[2],t))+')'; }
// vue zoomée : largeur visible en unités monde, conversions écran<->monde
const VW = ()=> W/zoom;
const Y_G = 400;                          // position écran fixe de la ligne du sol (au-dessus du HUD)
const zTY = ()=> Y_G - GROUND*zoom;       // translation verticale du monde zoomé
const s2wX = x => x/zoom + camX;
const s2wY = y => (y - zTY())/zoom;
const w2sX = x => (x - camX)*zoom;
const w2sY = y => y*zoom + zTY();
function camClamp(){ camX = clamp(camX, 0, WORLD - VW()); }

/* ---------- RELIEF ---------- */
// Profil de terrain par défaut (escarmouche) + presets de campagne pour des cartes variées.
const TERRAIN_DEFAULT = {a:16,f1:0.0042,b:9,f2:0.0113,c:6,f3:0.021,base:10};
const TERRAINS = {
  plains: {a:6, f1:0.0040,b:4, f2:0.0100,c:3, f3:0.020, base:6},    // ville : quasi plat
  hills:  {a:26,f1:0.0050,b:14,f2:0.0120,c:8, f3:0.022, base:14},   // faubourgs vallonnés
  rugged: {a:34,f1:0.0060,b:18,f2:0.0130,c:11,f3:0.025, base:18},   // insurrection : accidenté
  waste:  {a:22,f1:0.0045,b:12,f2:0.0110,c:7, f3:0.020, base:12},   // terres dévastées (finale)
};
function gY(x){
  const flat = clamp((Math.min(x, WORLD-x)-240)/320, 0, 1);
  // relief uniquement en bosses (jamais de creux : rien ne passe sous la ligne du sol / derrière le HUD)
  const c = (game && game.terrainCfg) || TERRAIN_DEFAULT;
  const h = c.a*Math.sin(x*c.f1) + c.b*Math.sin(x*c.f2+2) + c.c*Math.sin(x*c.f3+5) + c.base;
  return GROUND - Math.max(0, h) * flat;
}
