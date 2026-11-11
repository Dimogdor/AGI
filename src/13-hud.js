/* ---------- PAPIER (v1.11) : les panneaux en jeu reprennent l'identité du menu ----------
   Fiche imprimée pour l'Humanité, listing d'imprimante zébré et perforé pour G·P·T. Grain cuit
   une seule fois en motif, ombre portée nette : aucun flou, coût négligeable. */
const UIPAL = {
  HUM:{ paper:'#e9e0ca', paper2:'#d8ccb0', ink:'#1f1b17', ink2:'#5a5146', red:'#c42a1c', ok:'#2f6a2a', line:'rgba(31,27,23,0.32)',
        dull:'#b3a88f', tab:'#c2ae84', kraft:'#d2bd90', photo:'#b4bd9c', photo2:'#a39c88', bad:'#c42a1c',
        head:'"AGI Stencil","AGI Cond",Impact,sans-serif', headW:800, type:'"AGI Type","Courier New",monospace', k:1 },
  IA: { paper:'#eef2ea', paper2:'#dde9da', ink:'#10262d', ink2:'#3d5a62', red:'#0b6fa8', ok:'#0b6fa8', line:'rgba(16,38,45,0.28)',
        dull:'#b3c0bd', tab:'#b9c9cb', kraft:'#d3e2dc', photo:'#a9c6d2', photo2:'#9daeb2', bad:'#b3261e',
        head:'"AGI Term","Courier New",monospace', headW:400, type:'"AGI Term","Courier New",monospace', k:1.3, ia:true },
};
const UI_COND = '"AGI Cond","Arial Narrow",sans-serif';
const UI_TYPE = '"AGI Type","Courier New",monospace', UI_STEN = '"AGI Stencil","AGI Cond",Impact,sans-serif';
// police du HUD : condensée de presse (Oswald 600) — plus typée que l'Arial gras et plus étroite,
// donc moins de libellés comprimés par fitFont dans les langues longues
const HF = px => '600 '+px+'px '+UI_COND;
// les polices embarquées (data: URI) ne se chargent qu'à la première utilisation : on les
// demande dès le démarrage pour que le canvas ne dessine jamais avec la police de repli
try { if (document.fonts && document.fonts.load)
  for (const f of ['800 20px "AGI Stencil"', '20px "AGI Type"', '600 20px "AGI Cond"', '20px "AGI Term"']) document.fonts.load(f).catch(()=>{}); } catch(e){}
function uiPal(){ return (game && game.p && game.p.facKey==='IA')? UIPAL.IA : UIPAL.HUM; }
// police d'un rôle de texte : 'head' (pochoir / terminal), 'type' (machine à écrire), 'cond' (titre de presse)
function uiF(pal, kind, px){
  if (kind==='cond') return '600 '+px+'px '+UI_COND;
  return (kind==='head'? pal.headW+' ' : '')+(px*pal.k).toFixed(1)+'px '+(kind==='head'? pal.head : pal.type);
}
let _paperGrain = null;
function paperGrain(){
  if (!_paperGrain){
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    let s = 4242; const r = () => ((s = (s*16807) % 2147483647) / 2147483647);
    for (let i=0;i<1400;i++){ g.fillStyle = 'rgba(90,66,36,'+(0.03+r()*0.09).toFixed(3)+')'; g.fillRect(r()*128, r()*128, 0.8+r()*1.6, 0.8+r()*1.6); }
    for (let i=0;i<10;i++){ g.fillStyle = 'rgba(120,90,50,0.045)'; g.beginPath(); g.arc(r()*128, r()*128, 4+r()*10, 0, 6.283); g.fill(); }
    _paperGrain = ctx.createPattern(c, 'repeat');
  }
  return _paperGrain;
}
function paperPanel(x, y, w, h, pal, o){
  o = o || {};
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(x+4, y+6, w, h);                 // ombre nette
  const g = ctx.createLinearGradient(0, y, 0, y+h); g.addColorStop(0, pal.paper); g.addColorStop(1, pal.paper2);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (pal.ia){                                                                        // listing : bandes + perforations
    ctx.fillStyle = 'rgba(120,180,125,0.22)';
    for (let yy=y+18; yy<y+h; yy+=36) ctx.fillRect(x+16, yy, w-32, Math.min(18, y+h-yy));
    ctx.fillStyle = 'rgba(12,10,10,0.9)';
    for (let yy=y+10; yy<y+h-5; yy+=18){
      ctx.beginPath(); ctx.arc(x+8, yy, 3, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(x+w-8, yy, 3, 0, 6.283); ctx.fill(); }
  } else {
    ctx.fillStyle = paperGrain(); ctx.fillRect(x, y, w, h);
    if (o.tape){ ctx.fillStyle = 'rgba(236,226,196,0.72)'; ctx.translate(x+w*(o.tapeX||0.5), y); ctx.rotate(-0.05); ctx.fillRect(-34, -8, 68, 16); }
  }
  ctx.restore();
}
// bouton d'action principal : TAMPON à double cadre (Humanité) ou touche pleine ombrée (G·P·T)
function inkStamp(x, y, w, h, txt, pal, px){
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (pal.ia){
    ctx.fillStyle = pal.ink; ctx.fillRect(x+3, y+3, w, h); ctx.fillStyle = pal.red; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#eaf6ff';
  } else {
    ctx.strokeStyle = pal.red; ctx.lineWidth = 2.4; ctx.strokeRect(x+1.5, y+1.5, w-3, h-3);
    ctx.lineWidth = 1.1; ctx.strokeRect(x+5, y+5, w-10, h-10); ctx.fillStyle = pal.red;
  }
  fitFont(txt, w-18, uiF(pal, 'head', px||16), 9);
  ctx.fillText(txt, x+w/2, y+h/2+1);
  ctx.restore();
}
// ligne pointillée de formulaire
function inkRule(x1, x2, y, pal){ ctx.save(); ctx.strokeStyle = pal.line; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); ctx.restore(); }

/* ---------- HUD (refait : zones fixes, aucun chevauchement) ---------- */
/* ---------- PICTOGRAMMES VECTORIELS (v1.13) ----------
   Plus aucun emoji système dans l'interface de jeu : ils changeaient d'aspect d'un appareil à
   l'autre (et donnaient un air « générique »). Chaque symbole est tracé à la main, d'un seul ton
   (la couleur du texte courant), dans un carré de côté s centré en (0,0). ctx.fillText est
   enveloppé une fois pour toutes : toute chaîne contenant un symbole connu (libellés traduits
   compris, dans les 9 langues) est composée texte + pictogrammes, alignement respecté. */
const ICON = (()=>{
  const P = (g, pts, close)=>{ g.beginPath(); g.moveTo(pts[0],pts[1]); for (let i=2;i<pts.length;i+=2) g.lineTo(pts[i],pts[i+1]); if (close!==false) g.closePath(); };
  const star = (g, n, ro, ri, a0)=>{ g.beginPath(); for (let i=0;i<n*2;i++){ const a=(a0||-Math.PI/2)+i*Math.PI/n, r=i%2? ri:ro; g.lineTo(Math.cos(a)*r, Math.sin(a)*r); } g.closePath(); g.fill(); };
  const shieldP = g=>{ g.beginPath(); g.moveTo(0,-.46); g.lineTo(.38,-.3); g.lineTo(.38,.02); g.quadraticCurveTo(.34,.34,0,.48); g.quadraticCurveTo(-.34,.34,-.38,.02); g.lineTo(-.38,-.3); g.closePath(); }, shield = g=>{ shieldP(g); g.fill(); };
  const coin = g=>{ g.lineWidth=.11; g.beginPath(); g.arc(0,0,.36,0,6.283); g.stroke(); g.beginPath(); g.arc(0,0,.15,0,6.283); g.fill(); };
  const I = {
    wheat:g=>{ g.lineWidth=.07; g.beginPath(); g.moveTo(0,.48); g.lineTo(0,-.2); g.stroke();
      for (let i=0;i<3;i++) for (const d of [-1,1]){ g.beginPath(); g.ellipse(d*.15, .12-i*.2, .16, .075, d*-.9, 0, 6.283); g.fill(); }
      g.beginPath(); g.ellipse(0,-.36,.075,.14,0,0,6.283); g.fill(); },
    coin, drop:g=>{ g.beginPath(); g.moveTo(0,-.48); g.bezierCurveTo(.1,-.2,.36,0,.36,.16); g.arc(0,.16,.36,0,Math.PI); g.bezierCurveTo(-.36,0,-.1,-.2,0,-.48); g.fill(); },
    bolt:g=>{ P(g,[.1,-.5,-.3,.06,-.02,.06,-.12,.5,.3,-.1,.02,-.1]); g.fill(); },
    people:g=>{ for (const [x,s] of [[-.2,.82],[.2,1]]){ g.beginPath(); g.arc(x,-.22*s,.15*s,0,6.283); g.fill();
      g.beginPath(); g.moveTo(x-.27*s,.42); g.quadraticCurveTo(x-.27*s,-.02*s,x,-.02*s); g.quadraticCurveTo(x+.27*s,-.02*s,x+.27*s,.42); g.closePath(); g.fill(); } },
    hourglass:g=>{ P(g,[-.3,-.45,.3,-.45,.04,0,.3,.45,-.3,.45,-.04,0]); g.fill(); g.fillRect(-.36,-.5,.72,.08); g.fillRect(-.36,.42,.72,.08); },
    lock:g=>{ g.fillRect(-.32,-.06,.64,.5); g.lineWidth=.1; g.beginPath(); g.arc(0,-.1,.2,Math.PI,0); g.stroke(); },
    wrench:g=>{ g.save(); g.rotate(.78); g.fillRect(-.07,-.2,.14,.68); g.lineWidth=.13; g.beginPath(); g.arc(0,-.3,.17,-1.05,Math.PI+1.05); g.stroke(); g.restore(); },
    swords:g=>{ g.lineWidth=.085; g.lineCap='round'; for (const d of [-1,1]){ g.beginPath(); g.moveTo(d*.4,-.42); g.lineTo(-d*.3,.3); g.stroke();
      g.beginPath(); g.moveTo(-d*.12,.3); g.lineTo(-d*.4,.06); g.stroke(); g.beginPath(); g.moveTo(-d*.32,.3); g.lineTo(-d*.42,.42); g.stroke(); } },
    hold:g=>{ shieldP(g); g.rect(-.2,-.07,.4,.12); g.fill('evenodd'); },
    shield, back:g=>{ g.lineWidth=.1; g.lineCap='round'; g.lineJoin='round'; g.beginPath(); g.moveTo(.36,.3); g.lineTo(.36,-.04); g.quadraticCurveTo(.36,-.2,.2,-.2); g.lineTo(-.3,-.2); g.stroke();
      P(g,[-.44,-.2,-.16,-.42,-.16,.02]); g.fill(); },
    camera:g=>{ g.fillRect(-.44,-.22,.58,.46); P(g,[.16,-.02,.44,-.24,.44,.26,.16,.06]); g.fill(); g.beginPath(); g.arc(-.26,-.32,.13,0,6.283); g.arc(.0,-.32,.13,0,6.283); g.fill(); },
    zoom:g=>{ g.lineWidth=.1; g.lineCap='round'; g.beginPath(); g.arc(-.08,-.08,.28,0,6.283); g.stroke(); g.beginPath(); g.moveTo(.14,.14); g.lineTo(.42,.42); g.stroke(); },
    heart:g=>{ g.beginPath(); g.moveTo(0,.42); g.bezierCurveTo(-.6,0,-.42,-.5,0,-.2); g.bezierCurveTo(.42,-.5,.6,0,0,.42); g.fill(); },
    clock:g=>{ g.lineWidth=.09; g.lineCap='round'; g.beginPath(); g.arc(0,.03,.38,0,6.283); g.stroke(); g.beginPath(); g.moveTo(0,-.18); g.lineTo(0,.03); g.lineTo(.16,.12); g.stroke(); g.fillRect(-.1,-.5,.2,.08); },
    target:g=>{ g.lineWidth=.08; g.beginPath(); g.arc(0,0,.38,0,6.283); g.stroke(); g.beginPath(); g.arc(0,0,.13,0,6.283); g.fill();
      g.beginPath(); g.moveTo(0,-.5); g.lineTo(0,-.28); g.moveTo(0,.5); g.lineTo(0,.28); g.moveTo(-.5,0); g.lineTo(-.28,0); g.moveTo(.5,0); g.lineTo(.28,0); g.stroke(); },
    speed:g=>{ g.lineWidth=.1; g.lineCap='round'; g.lineJoin='round'; for (const x of [-.26,.08]){ g.beginPath(); g.moveTo(x,-.3); g.lineTo(x+.26,0); g.lineTo(x,.3); g.stroke(); } },
    burst:g=>star(g,8,.48,.2), spark:g=>star(g,4,.48,.14), star:g=>star(g,5,.48,.2),
    cross:g=>{ g.lineWidth=.12; g.lineCap='round'; g.beginPath(); g.moveTo(-.3,-.3); g.lineTo(.3,.3); g.moveTo(.3,-.3); g.lineTo(-.3,.3); g.stroke(); },
    play:g=>{ P(g,[-.26,-.38,.38,0,-.26,.38]); g.fill(); }, pause:g=>{ g.fillRect(-.3,-.36,.2,.72); g.fillRect(.1,-.36,.2,.72); },
    full:g=>{ g.lineWidth=.09; g.lineCap='round'; g.lineJoin='round'; for (const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){ g.beginPath(); g.moveTo(a*.4,b*.14); g.lineTo(a*.4,b*.4); g.lineTo(a*.14,b*.4); g.stroke(); } },
    up:g=>{ P(g,[0,-.46,.38,-.04,.14,-.04,.14,.44,-.14,.44,-.14,-.04,-.38,-.04]); g.fill(); },
    gear:g=>{ g.beginPath(); for (let i=0;i<16;i++){ const a=i*Math.PI/8-.2, r=i%2? .46:.33; g.lineTo(Math.cos(a)*r, Math.sin(a)*r); } g.closePath(); g.moveTo(.15,0); g.arc(0,0,.15,0,6.283); g.fill('evenodd'); },
    flag:g=>{ g.fillRect(-.3,-.46,.08,.94); P(g,[-.22,-.44,.4,-.24,-.22,-.02]); g.fill(); },
    door:g=>{ g.beginPath(); g.moveTo(-.28,.46); g.lineTo(-.28,-.18); g.arc(0,-.18,.28,Math.PI,0); g.lineTo(.28,.46); g.closePath(); g.moveTo(.18,.12); g.arc(.12,.12,.06,0,6.283); g.fill('evenodd'); },
    skull:g=>{ g.beginPath(); g.arc(0,-.1,.36,0,6.283); g.moveTo(-.04,-.08); g.arc(-.14,-.08,.1,0,6.283); g.moveTo(.24,-.08); g.arc(.14,-.08,.1,0,6.283); g.fill('evenodd');
      g.fillRect(-.2,.2,.17,.24); g.fillRect(.03,.2,.17,.24); },
    trophy:g=>{ g.beginPath(); g.moveTo(-.28,-.44); g.lineTo(.28,-.44); g.quadraticCurveTo(.28,.1,0,.12); g.quadraticCurveTo(-.28,.1,-.28,-.44); g.fill(); g.fillRect(-.05,.1,.1,.2); g.fillRect(-.24,.3,.48,.14);
      g.lineWidth=.07; g.beginPath(); g.arc(-.3,-.24,.13,1.2,4.9); g.stroke(); g.beginPath(); g.arc(.3,-.24,.13,-1.75,1.95); g.stroke(); },
    wall:g=>{ for (let r=0;r<3;r++) for (let c=0;c<3;c++){ const o=r%2? -.16:0; g.fillRect(-.46+c*.32+o, -.4+r*.28, .28, .22); } },
    tower:g=>{ P(g,[-.2,.46,-.14,-.14,.14,-.14,.2,.46]); g.fill(); g.fillRect(-.3,-.44,.6,.24); g.fillRect(.2,-.38,.26,.09); },
    well:g=>{ g.fillRect(-.36,.1,.72,.34); g.fillRect(-.34,-.34,.07,.46); g.fillRect(.27,-.34,.07,.46); P(g,[-.44,-.3,0,-.5,.44,-.3]); g.fill(); },
    rain:g=>{ g.beginPath(); g.arc(-.16,-.16,.2,0,6.283); g.arc(.12,-.22,.24,0,6.283); g.fill(); g.fillRect(-.36,-.18,.72,.16);
      g.lineWidth=.07; g.lineCap='round'; for (const x of [-.22,0,.22]){ g.beginPath(); g.moveTo(x,.12); g.lineTo(x-.08,.4); g.stroke(); } },
    fire:g=>{ g.beginPath(); g.moveTo(0,-.5); g.bezierCurveTo(.1,-.2,.4,-.06,.34,.2); g.bezierCurveTo(.3,.42,.12,.48,0,.48); g.bezierCurveTo(-.2,.48,-.38,.36,-.34,.12); g.bezierCurveTo(-.32,-.06,-.16,-.1,-.14,-.26); g.bezierCurveTo(-.04,-.2,-.02,-.36,0,-.5); g.fill(); },
    warn:g=>{ P(g,[0,-.46,.48,.4,-.48,.4]); g.rect(-.045,-.16,.09,.3); g.rect(-.045,.2,.09,.09); g.fill('evenodd'); },
    crane:g=>{ g.fillRect(-.3,-.44,.09,.9); g.fillRect(-.3,-.44,.72,.08); g.fillRect(.3,-.4,.04,.36); g.fillRect(.2,-.06,.24,.18); g.fillRect(-.44,.38,.4,.08); },
    medic:g=>{ g.fillRect(-.14,-.42,.28,.84); g.fillRect(-.42,-.14,.84,.28); },
    chart:g=>{ g.fillRect(-.42,.14,.2,.3); g.fillRect(-.1,-.1,.2,.54); g.fillRect(.22,-.4,.2,.84); },
    globe:g=>{ g.lineWidth=.07; g.beginPath(); g.arc(0,0,.42,0,6.283); g.stroke(); g.beginPath(); g.ellipse(0,0,.18,.42,0,0,6.283); g.stroke(); g.beginPath(); g.moveTo(-.42,0); g.lineTo(.42,0); g.stroke(); },
    lr:g=>{ P(g,[-.48,0,-.22,-.24,-.22,-.08,.22,-.08,.22,-.24,.48,0,.22,.24,.22,.08,-.22,.08,-.22,.24]); g.fill(); },
  };
  const MAP = { '🌾':'wheat','🪙':'coin','💰':'coin','💧':'drop','⚡':'bolt','👥':'people','⏳':'hourglass','🔒':'lock','🔧':'wrench','🛠':'wrench',
    '⚔':'swords','✋':'hold','✊':'hold','🛡':'shield','↩':'back','🎥':'camera','🔍':'zoom','❤':'heart','⏱':'clock','🎯':'target','👟':'speed','⏩':'speed',
    '💥':'burst','✸':'burst','✦':'spark','★':'star','🦸':'star','✖':'cross','▶':'play','⏸':'pause','⛶':'full','⬆':'up','📈':'chart','⚙':'gear','⚑':'flag',
    '🚪':'door','☠':'skull','🏆':'trophy','🧱':'wall','🗼':'tower','🏰':'tower','⛲':'well','🌧':'rain','🔥':'fire','⚠':'warn','🚧':'warn','❗':'warn',
    '🏗':'crane','🚑':'medic','🌐':'globe','🌍':'globe','↔':'lr','🏹':'target','💣':'burst','🪖':'shield' };
  const RE = new RegExp('('+Object.keys(MAP).join('|')+')\\uFE0F?', 'u'), REG = new RegExp(RE.source, 'gu');
  return { I, MAP, RE, REG };
})();
function drawIcon(name, x, y, s, g){ g = g||ctx; const f = ICON.I[name]; if (!f) return;
  g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = g.fillStyle; g.setLineDash([]); f(g); g.restore(); }
{ const ft = ctx.fillText.bind(ctx);
  ctx.fillText = function(str, x, y, mw){
    str = String(str);
    if (!ICON.RE.test(str)){ return mw===undefined? ft(str, x, y) : ft(str, x, y, mw); }
    const px = parseFloat((/([\d.]+)px/.exec(ctx.font)||[0,12])[1]), iw = px*1.02, gap = px*0.14;
    const parts = []; let last = 0, tw = 0, m; ICON.REG.lastIndex = 0;
    while ((m = ICON.REG.exec(str))){ if (m.index>last) parts.push(str.slice(last, m.index)); parts.push({ic:ICON.MAP[m[1]]}); last = m.index+m[0].length; }
    if (last<str.length) parts.push(str.slice(last));
    for (const p of parts) tw += typeof p==='string'? ctx.measureText(p).width : iw+gap;
    const al = ctx.textAlign, bl = ctx.textBaseline;
    let cx = al==='center'? x-tw/2 : (al==='right'||al==='end')? x-tw : x;
    const cy = bl==='middle'? y : bl==='top'? y+px*0.55 : y-px*0.36;
    ctx.textAlign = 'left';
    for (const p of parts){
      if (typeof p==='string'){ ft(p, cx, y); cx += ctx.measureText(p).width; }
      else { drawIcon(p.ic, cx+iw/2, cy, px*0.98); cx += iw+gap; }
    }
    ctx.textAlign = al;
  };
}
const HUD = { btns:[], selRect:null, upgRects:[] };
function layoutHUD(){
  HUD.btns = [];
  const bh=64, y=H-bh-6;            // rangée unités
  let x=6;
  for (let i=0;i<6;i++){ HUD.btns.push({type:'unit', i, x, y, w:80, h:bh}); x+=83; }
  HUD.btns.push({type:'special', x, y, w:84, h:bh}); x+=87;
  HUD.btns.push({type:'evolve', x, y, w:84, h:bh}); x+=87;
  HUD.btns.push({type:'cap', x, y, w:74, h:bh}); x+=77;
  HUD.btns.push({type:'repairall', x, y, w:70, h:bh});
  const oh=31, sy = y-oh-3;           // rangée ordres / caméra (cibles tactiles agrandies)
  HUD.btns.push({type:'stance', st:'charge', x:6,   y:sy, w:84, h:oh, label:tr('ord_charge')});
  HUD.btns.push({type:'stance', st:'hold',   x:94,  y:sy, w:70, h:oh, label:tr('ord_hold')});
  HUD.btns.push({type:'stance', st:'retreat',x:168, y:sy, w:82, h:oh, label:tr('ord_retreat')});
  HUD.btns.push({type:'lasso',  x:254, y:sy, w:74, h:oh, label:tr('btn_lasso')});
  HUD.btns.push({type:'formation', x:332, y:sy, w:98, h:oh, label:tr('btn_formation')});
  HUD.btns.push({type:'hero', x:434, y:sy, w:48, h:oh});
  HUD.btns.push({type:'cam', go:'base',  x:W-300, y:sy, w:64, h:oh, label:tr('cam_base')});
  HUD.btns.push({type:'cam', go:'front', x:W-232, y:sy, w:64, h:oh, label:tr('cam_front')});
  HUD.btns.push({type:'cam', go:'follow',x:W-164, y:sy, w:72, h:oh, label:tr('cam_auto')});
  HUD.btns.push({type:'zoom', d:-1, x:W-88, y:sy, w:40, h:oh, label:'🔍−'});
  HUD.btns.push({type:'zoom', d:1,  x:W-44, y:sy, w:38, h:oh, label:'🔍+'});
  // cluster de contrôles, coin haut-droite (vitesse · pause · réglages) — agrandi pour le tactile
  HUD.btns.push({type:'speed',     x:W-112, y:5, w:34, h:28});
  HUD.btns.push({type:'softpause', x:W-75,  y:5, w:34, h:28});
  HUD.btns.push({type:'pause',     x:W-38,  y:5, w:34, h:28, label:'⚙'});
}
layoutHUD();
// MASQUAGE DYNAMIQUE DU HUD : le bouton ⚡ ÉVOLUER disparaît une fois l'ère plafond atteinte.
function btnHidden(b){
  if (!game) return false;
  if (game.tut && TUT && tutBtnHidden(b)) return true;   // tuto : n'affiche que les boutons enseignés
  if (b.type==='evolve' && game.eraCap!=null && game.p.era>=game.eraCap) return true;
  return false;
}
function setZoom(nz, cxAnchor){
  const anchor = cxAnchor!==undefined? cxAnchor : camX + VW()/2;
  const frac = (anchor-camX)/VW();
  zoom = clamp(nz, ZMIN, ZMAX);
  camX = anchor - VW()*frac;
  camClamp();
}
function fmtRate(r){ return '+'+(Math.round(r*10)/10); }
function fmtTime(s){ const m=Math.floor(s/60), ss=('0'+Math.floor(s%60)).slice(-2); return m+':'+ss; }
// file d'attente : tickets des unités en attente d'une place sur la carte (en haut à gauche)
function drawQueue(){
  const p=game.p, q=p.queue;
  if (!q || !q.length) return;
  const pal = uiPal(), sz=20, gap=4, bx=10, by=43, n=Math.min(q.length,10);
  ctx.textAlign='center'; ctx.textBaseline='middle';
  for (let i=0;i<n;i++){
    const x=bx+i*(sz+gap), next=(i===0);
    ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(x+1.5, by+2, sz, sz);
    ctx.fillStyle = next? pal.paper : pal.dull; ctx.fillRect(x, by, sz, sz);
    if (next){ ctx.strokeStyle = pal.red; ctx.lineWidth = 1.5; ctx.strokeRect(x+1, by+1, sz-2, sz-2); }
    ctx.font=HF(13); ctx.fillStyle = next? pal.ink : pal.ink2;
    ctx.fillText(ROLE_ICON[ROLES[q[i]].key]||'?', x+sz/2, by+sz/2+1);
  }
}
// FICHE DÉTAILLÉE (survol souris) : stats d'une unité au-dessus de sa carte, sur papier.
function drawUnitTooltip(i){
  const r = ROLES[i], p = game.p; if (!r) return;
  let btn=null; for (const b of HUD.btns) if (b.type==='unit'&&b.i===i){ btn=b; break; }
  if (!btn) return;
  const pal = uiPal(), name = lUnit(p.facKey, r.key, p.era);
  // stats EFFECTIVES (ère + améliorations + archétype + faction) — exactement ce qui sera déployé.
  const s = unitStats(p, i), lvl = p.upg[r.key]||0;
  const up = lvl? '  ⬆'+lvl : '';
  const lines = [
    '❤ '+Math.round(s.hp)+'    ⚔ '+(s.dmg? Math.round(s.dmg):'—')+'    ⏱ '+s.rate.toFixed(2)+'s'+up,
    '🎯 '+Math.round(s.range)+'    👟 '+Math.round(s.spd)+(s.aoe?'    💥 '+s.aoe:''),
    '💰 '+costStr(p, unitCost(p, i)),
  ];
  const fName = uiF(pal,'cond',12.5), fLine = uiF(pal,'cond',11);
  ctx.font=fName; let tw=ctx.measureText(name).width+16;
  ctx.font=fLine; for (const l of lines) tw=Math.max(tw, ctx.measureText(l).width);
  // PORTRAIT : le personnage exact qui sera déployé (ère, faction, transcendance)
  const PW=62, w=tw+22+PW, h=Math.max(76, 24+lines.length*15), x=clamp(btn.x+btn.w/2-w/2, 4, W-w-4), y=btn.y-h-10;
  paperPanel(x, y, w, h, pal);
  ctx.save(); ctx.beginPath(); ctx.rect(x+5,y+5,PW-8,h-10); ctx.clip();
  ctx.fillStyle = pal.photo; ctx.fillRect(x+5,y+5,PW-8,h-10);
  if (r.key==='air'){ ctx.translate(x+PW/2+1, y+h/2); ctx.scale(0.85,0.85);
    ctx.drawImage(sprite('AIR'+p.facKey+p.era+(p.trans?'T':''), 64, 44, ()=>airSprite(p.facKey,p.era,p.trans)), -32, -22, 64, 44); }
  else { ctx.translate(x+PW/2, y+h-7); const k=Math.min(0.92,(h-14)/70); ctx.scale(k,k);
    drawUnitLayers(p.facKey==='HUM'?'hum':'bot', p.facKey, r.key, p.era, p.trans, 0); }
  ctx.restore();
  ctx.strokeStyle = pal.ink; ctx.lineWidth = 1; ctx.strokeRect(x+5.5, y+5.5, PW-9, h-11);
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.fillStyle=pal.red; ctx.font=fName;
  ctx.fillText((ROLE_ICON[r.key]||'')+' '+name, x+PW+6, y+17);
  ctx.fillStyle=pal.ink; ctx.font=fLine;
  let yy=y+34; for (const l of lines){ ctx.fillText(l, x+PW+6, yy); yy+=15; }
  ctx.textAlign='center';
}
/* ---------- HUD v4 (v1.14) : BUREAU DE CAMPAGNE ----------
   Le jeu se commande depuis une table : plateau de bois (Humanité) ou de tôle (G·P·T), marquages
   au pochoir, fiches de recrutement en papier, intercalaires de classeur pour les ordres, bons à
   découper pour les actions. Aucun halo, aucun dégradé lumineux, aucune bordure néon : des
   aplats, de l'encre, des ombres nettes — la même main que le menu et les panneaux papier. */
const DESK_CREAM = '#efe6cf', DESK_DIM = '#a59a84';
const sideInk = s => (s && s.facKey==='IA')? '#0b6fa8' : '#c4421c';       // encre d'un camp sur papier clair
let _desk = {};
function deskFill(x, y, w, h){
  const ia = !!uiPal().ia, k = ia? 'IA' : 'HUM';
  if (!_desk[k]){
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = ia? '#131b20' : '#1d1611'; g.fillRect(0,0,256,64);
    let s = ia? 977 : 131; const r = () => ((s = (s*16807) % 2147483647) / 2147483647);
    if (ia){                                           // tôle brossée : fines rayures
      for (let i=0;i<80;i++){ g.fillStyle = 'rgba(160,205,220,'+(0.02+r()*0.045).toFixed(3)+')'; g.fillRect(r()*256, r()*64, 20+r()*90, 0.7); }
    } else {                                           // bois : longues veines à peine ondulées
      for (let i=0;i<48;i++){ const y0 = r()*64, a = 0.04+r()*0.08;
        g.strokeStyle = (r()<0.5? 'rgba(0,0,0,' : 'rgba(156,112,70,')+a.toFixed(3)+')'; g.lineWidth = 0.6+r()*1.0;
        g.beginPath(); g.moveTo(0,y0); g.bezierCurveTo(80, y0+(r()-0.5)*5, 170, y0+(r()-0.5)*5, 256, y0); g.stroke(); }
    }
    _desk[k] = ctx.createPattern(c, 'repeat');
  }
  ctx.fillStyle = _desk[k]; ctx.fillRect(x, y, w, h);
}
// morceau de papier posé : ombre nette, aplat, grain (ou bandes de listing pour G·P·T)
function paperChip(x, y, w, h, pal, col){
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x+1.5, y+2.5, w, h);
  ctx.fillStyle = col || pal.paper; ctx.fillRect(x, y, w, h);
  if (pal.ia){ ctx.fillStyle = 'rgba(95,160,110,0.16)'; for (let yy=y+8; yy<y+h; yy+=16) ctx.fillRect(x, yy, w, Math.min(8, y+h-yy)); }
  else { ctx.fillStyle = paperGrain(); ctx.fillRect(x, y, w, h); }
}
function drawHUD(){
  const p = game.p, fac = p.fac, pal = uiPal();
  const rates = calcRates(p);
  ctx.textBaseline='middle';
  // ---- bandeau haut (h=38) : rebord du bureau, chiffres au pochoir ----
  deskFill(0, 0, W, 36);
  ctx.fillStyle = '#0a0706'; ctx.fillRect(0, 35, W, 1);
  ctx.fillStyle = pal.red; ctx.fillRect(0, 36, W, 2);
  ctx.fillStyle = 'rgba(239,230,207,0.13)';
  for (const sx of [90,178,256]) ctx.fillRect(sx, 6, 1, 24);
  ctx.textAlign='left';
  const nx = p.era<4? EVOLVE_XP[p.era+1] : (!p.trans? TRANS_XP : null);
  const xpr = 2.2 + ((p.fortLvl||1)-1)*1.3 + (game.nodes.some(n=>n.center&&n.owner==='p')?1.5:0) + 0.5*game.zones.reduce((n,z)=>n+(z.owner==='p'?1:0),0);
  const cells = [
    [8,   fac.icons.f, '#e3c878', String(Math.floor(p.f)), fmtRate(rates.f)+'/s'],
    [96,  fac.icons.m, '#c7d3d6', p.trans? '∞' : String(Math.floor(p.m)), p.trans? '∞' : fmtRate(rates.m)+'/s'],
    [184, '💧',        '#86b6dc', String(Math.floor(p.w)), fmtRate(rates.w)+'/s'],
    [262, '✦',         pal.ia? '#6cc0ee' : '#e8694f', Math.floor(p.xp)+(nx?'/'+nx:''), fmtRate(xpr)+'/s'],
  ];
  for (const [cx0, ic, icol, val, rate] of cells){
    ctx.font=HF(14); ctx.fillStyle=icol; ctx.fillText(ic, cx0, 13);
    ctx.fillStyle=DESK_CREAM; ctx.fillText(val, cx0+18, 13);
    ctx.font='9.5px '+UI_TYPE; ctx.fillStyle='#a9b888'; ctx.fillText(rate, cx0+18, 28);
  }
  // ère : étiquette peinte au centre ; santé du monde : réglette graduée dessous
  ctx.textAlign='center';
  { const etxt = p.trans? lTransName(p.facKey) : lEra(p.facKey,p.era);
    fitFont(etxt, 230, uiF(pal,'head',13), 8);
    const tw = Math.min(230, ctx.measureText(etxt).width), lw = tw+20;
    ctx.fillStyle = p.trans? '#c9a227' : pal.red; ctx.fillRect(W/2-lw/2, 2, lw, 16);
    ctx.fillStyle = p.trans? '#1f1b17' : '#f4ecd8'; ctx.fillText(etxt, W/2, 10.5);
    ctx.fillStyle = '#0a0706'; ctx.fillRect(W/2-80, 27, 160, 5);
    if (game.dev>0.01){ ctx.fillStyle = lerpCol([122,170,96],[196,58,36],game.dev); ctx.fillRect(W/2-80, 27, Math.max(3,160*game.dev), 5); }
    ctx.fillStyle = 'rgba(10,7,6,0.55)'; for (let k=1;k<8;k++) ctx.fillRect(W/2-80+k*20, 27, 1, 5);
    ctx.font='7.5px '+UI_TYPE; ctx.fillStyle=DESK_DIM; ctx.fillText(tr('world_health'), W/2, 22.5); }
  // droite : effectif + ennemi (calés À GAUCHE du cluster de contrôles → pas de chevauchement)
  const RX = W-120;                                // 8 px d'air avant le bouton de vitesse (x = W-112)
  ctx.textAlign='right'; ctx.font=HF(13);
  ctx.fillStyle = unitTotal(p)>=p.cap? '#ff6a55' : DESK_CREAM;
  const qn = (p.queue && p.queue.length) ? p.queue.length : (p.queueLen||0);
  ctx.fillText('👥 '+unitTotal(p)+'/'+p.cap+(qn? ' ⏳'+qn:''), RX, 13);
  // ligne 2 : ennemi (couleur faction) puis difficulté (gris), tous deux calés à droite
  ctx.font='9.5px '+UI_TYPE; ctx.fillStyle=DESK_DIM;
  const diffTxt = tr('diff_'+game.diff).toUpperCase();
  ctx.fillText(diffTxt, RX, 28);
  const dw = ctx.measureText(diffTxt).width;
  ctx.font=HF(11); ctx.fillStyle=game.e.fac.accent;
  ctx.fillText(lFacName(game.e.facKey)+' '+game.e.fac.eras[game.e.era].tag+(game.e.trans? ' '+game.e.fac.sym:''), RX-dw-10, 28);
  // ---- minimap (y=42) : bande de carte d'état-major, repères à l'encre ----
  const mw=200, mh=13, mx=W/2-mw/2, my=42;
  ctx.fillStyle='rgba(0,0,0,0.42)'; ctx.fillRect(mx+2, my+2.5, mw, mh);
  ctx.fillStyle=pal.paper; ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle=pal.line; for (let k=1;k<10;k++) ctx.fillRect(mx+k*mw/10, my+mh-3, 1, 3);
  const inkP = sideInk(game.p), inkE = sideInk(game.e);
  for (const n of game.nodes){
    ctx.fillStyle = n.owner==='p'? inkP : n.owner==='e'? inkE : pal.ink2;
    ctx.fillRect(mx + n.x/WORLD*mw -2, my+3, 4, mh-6);
  }
  for (const n of game.neut){
    ctx.fillStyle = n.owner? sideInk(n.owner) : pal.ink2;
    ctx.fillRect(mx + n.x/WORLD*mw -1.5, my+4, 3, mh-8);
  }
  ctx.fillStyle=inkP; for (const u of game.p.units) ctx.fillRect(mx+u.x/WORLD*mw, my+4, 2, 5);
  ctx.fillStyle=inkE; for (const u of game.e.units) ctx.fillRect(mx+u.x/WORLD*mw, my+4, 2, 5);
  ctx.fillStyle=pal.ink; ctx.fillRect(mx+game.p.x/WORLD*mw-2, my+1, 4, mh-2);
  ctx.fillRect(mx+game.e.x/WORLD*mw-2, my+1, 4, mh-2);
  ctx.strokeStyle=pal.ink; ctx.lineWidth=1.2;
  ctx.strokeRect(mx + camX/WORLD*mw, my-0.5, VW()/WORLD*mw, mh+1);
  // ---- INDICATEUR DE MOMENTUM : qui prend l'avantage globalement (sous la minimap) ----
  { const my2=my+mh+5, barH=5;
    const mom = clamp((p.hp/p.maxhp - game.e.hp/game.e.maxhp)*1.6 + (p.units.length-game.e.units.length)/40, -1, 1);
    ctx.fillStyle='rgba(10,7,6,0.62)'; ctx.fillRect(mx, my2, mw, barH);
    ctx.fillStyle = mom>=0? p.fac.accent : game.e.fac.accent;
    if (mom>=0) ctx.fillRect(mx+mw/2, my2, mw/2*mom, barH); else ctx.fillRect(mx+mw/2+mw/2*mom, my2, -mw/2*mom, barH);
    ctx.fillStyle=DESK_CREAM;
    ctx.beginPath(); ctx.moveTo(mx+mw/2, my2+1); ctx.lineTo(mx+mw/2-3.2, my2-4); ctx.lineTo(mx+mw/2+3.2, my2-4); ctx.closePath(); ctx.fill();
  }
  // ---- PASTILLE D'ÈRE : rond de papier tamponné, arc d'encre = progression vers l'ère suivante ----
  { const rx=mx-19, ry=my+7, rad=9;
    const prevX = p.era>0? (EVOLVE_XP[p.era]||0):0;
    const nX = p.era<4? EVOLVE_XP[p.era+1] : (!p.trans? TRANS_XP : null);
    const fr = nX? clamp((p.xp-prevX)/((nX-prevX)||1),0,1) : 1;
    ctx.fillStyle='rgba(0,0,0,0.42)'; ctx.beginPath(); ctx.arc(rx+1.5,ry+2,rad,0,6.283); ctx.fill();
    ctx.fillStyle=pal.paper; ctx.beginPath(); ctx.arc(rx,ry,rad,0,6.283); ctx.fill();
    ctx.strokeStyle=pal.line; ctx.lineWidth=2.4; ctx.beginPath(); ctx.arc(rx,ry,rad-1.6,0,6.283); ctx.stroke();
    ctx.strokeStyle=pal.red; ctx.beginPath(); ctx.arc(rx,ry,rad-1.6,-1.5708,-1.5708+6.283*fr); ctx.stroke();
    ctx.fillStyle=pal.ink; ctx.font=HF(7.5); ctx.textAlign='center';
    ctx.fillText(p.era<4?('E'+(p.era+1)):'★', rx, ry+0.5);
  }
  // ---- chrono de partie (gelé en pause, accéléré/ralenti avec la vitesse de jeu) : étiquette ----
  { const ttxt = fmtTime(game.t)+((game.speed&&game.speed!==1)? '  ×'+game.speed : '');
    ctx.font='11px '+UI_TYPE; const tw = ctx.measureText(ttxt).width+12;
    ctx.fillStyle='rgba(0,0,0,0.42)'; ctx.fillRect(mx+mw+10, my+2.5, tw, mh);
    ctx.fillStyle=pal.paper; ctx.fillRect(mx+mw+8, my, tw, mh);
    ctx.textAlign='center'; ctx.fillStyle=pal.ink; ctx.fillText(ttxt, mx+mw+8+tw/2, my+mh/2+0.5); }
  drawQueue();
  // ---- météo en cours ----
  if (game.weather){
    ctx.font=HF(10); ctx.textAlign='center';
    const wt = game.weather==='strike'? tr('ev_strike_short') : tr('ev_patch_short');
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillText(wt, W/2+1, 72);
    ctx.fillStyle = game.weather==='strike'? '#ff9d45':'#5ad0ff'; ctx.fillText(wt, W/2, 71);
  }
  // ---- annonce (y=100) ----
  if (game.msgT>0 && game.msg){
    ctx.globalAlpha = Math.min(1, game.msgT);
    ctx.font=uiF(pal,'head',24); ctx.textAlign='center';
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillText(game.msg.txt, W/2+2, 102);
    ctx.fillStyle=game.msg.color; ctx.fillText(game.msg.txt, W/2, 100);
    ctx.globalAlpha=1;
  }
  drawNews();                                      // fil d'actualités du monde (haut gauche, discret)
  // ---- plateau du bureau : les fiches et intercalaires y sont posés ----
  { const dockY = H-64-6-31-3-7;
    deskFill(0, dockY, W, H-dockY);
    ctx.fillStyle = '#0a0706'; ctx.fillRect(0, dockY-2, W, 2);
    ctx.fillStyle = 'rgba(239,230,207,0.10)'; ctx.fillRect(0, dockY, W, 1); }
  // ---- boutons ----
  HUD.upgRects = [];
  for (const b of HUD.btns){
    if (btnHidden(b)) continue;
    const dim = game.tut && TUT && tutBtnDim(b);    // tuto : acquis mais pas l'étape courante → grisé
    if (dim){ ctx.save(); ctx.globalAlpha = 0.38; drawBtn(b); ctx.restore(); }
    else drawBtn(b);
  }
  if (hoverUnitBtn>=0) drawUnitTooltip(hoverUnitBtn);
  // ---- bandeau de sélection (y=H-132, jamais sur les boutons) : bande de papier ----
  HUD.selRect = null;
  if (game.sel.size>0){
    const txt = fmt('hud_sel',{n:game.sel.size});
    ctx.font=HF(12);
    const tw = ctx.measureText(txt).width;
    const bx = W/2-tw/2-26, by = H-134, bw = tw+52;
    paperChip(bx, by, bw, 22, pal);
    ctx.textAlign='left'; ctx.fillStyle=pal.ink; ctx.fillText(txt, bx+9, by+11.5);
    ctx.textAlign='center'; ctx.fillStyle=pal.bad; ctx.fillText('✖', bx+bw-14, by+11.5);
    HUD.selRect = {x:bx+bw-28, y:by, w:28, h:24};
  }
  // lasso en cours
  if (selBox){
    ctx.strokeStyle=DESK_CREAM; ctx.lineWidth=1.4; ctx.setLineDash([5,4]);
    ctx.strokeRect(Math.min(selBox.x0,selBox.x1), Math.min(selBox.y0,selBox.y1),
      Math.abs(selBox.x1-selBox.x0), Math.abs(selBox.y1-selBox.y0));
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(239,230,207,0.10)';
    ctx.fillRect(Math.min(selBox.x0,selBox.x1), Math.min(selBox.y0,selBox.y1),
      Math.abs(selBox.x1-selBox.x0), Math.abs(selBox.y1-selBox.y0));
  }
  if (buildMenu) drawBuildMenu();
  if (game && game.tut && TUT) drawTut();
  // RÉGLAGES au premier plan : accessibles même pendant une pause négociée en ligne,
  // et en ligne ils n'impliquent plus la mise en pause du jeu.
  if (settingsOpen){
    drawPause();
    if (netPause && netPause.active) drawOnlinePauseInfo();
  } else if (paused){
    // pause négociée : les DEUX joueurs voient désormais le champ de bataille (voile léger).
    // L'adversaire du demandeur garde son panneau de décompte / vote de prolongation.
    if (netPause && netPause.active && !netPause.byMe) drawOnlinePause();
    else { drawSoftPause(); if (netPause && netPause.active) drawOnlinePauseInfo(); }
  }
}
// l'unité légendaire ne s'affiche QUE lorsqu'elle est réellement invocable
// (assez de temps écoulé pour avoir amassé les ressources, et hors recharge) :
// un sceau qui apparaît sur le bureau — l'identité n'est révélée qu'à l'activation.
function heroBtnReady(p){
  return !p.units.some(u=>u.role==='hero') && p.heroCd<=0 && canPay(p,HERO_COST);
}
function drawHeroBtn(b, p){
  if (!heroBtnReady(p)) return;                 // invisible tant que ce n'est pas disponible
  const pal = uiPal(), pulse = 0.5 + 0.5*Math.sin(performance.now()/1000*4.5);
  paperChip(b.x, b.y, b.w, b.h, pal);
  ctx.strokeStyle = pal.red; ctx.lineWidth = 2; ctx.strokeRect(b.x+2, b.y+2, b.w-4, b.h-4);
  ctx.save(); ctx.globalAlpha *= 0.25+0.75*pulse; ctx.lineWidth = 1; ctx.strokeRect(b.x+5, b.y+5, b.w-10, b.h-10); ctx.restore();
  ctx.fillStyle = pal.red; ctx.font=HF(15+2*pulse); ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('★', b.x+b.w/2, b.y+b.h/2+0.5);    // sceau énigmatique : on ne révèle pas ce que c'est
}
// contrôles (vitesse / pause / réglages) : jetons de papier, pictos à l'encre
function drawCtrl(b){
  const pal = uiPal(), cx=b.x+b.w/2, cy=b.y+b.h/2;
  let active=false;
  if (b.type==='speed') active = (game.speed||1)!==1;
  else if (b.type==='softpause') active = paused&&!settingsOpen;
  ctx.save();
  paperChip(b.x, b.y, b.w, b.h, pal, active? pal.red : null);
  const col = active? '#f4ecd8' : pal.ink;
  ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=1.9; ctx.lineCap='round'; ctx.lineJoin='round';
  if (b.type==='speed'){
    const s=game.speed||1;
    if (s<1){ ctx.beginPath(); ctx.arc(cx,cy,4.5,0,6.28); ctx.stroke(); }     // ralenti : petit rond
    else { const n=(s>=3?3:s>=2?2:1), gap=4.5, x0=cx-(n-1)*gap/2-1;            // ×1/×2/×3 : chevrons d'avance
      for (let i=0;i<n;i++){ const ox=x0+i*gap; ctx.beginPath();
        ctx.moveTo(ox-2.6,cy-4.5); ctx.lineTo(ox+2.6,cy); ctx.lineTo(ox-2.6,cy+4.5); ctx.stroke(); } }
  } else if (b.type==='softpause'){
    if (active){ ctx.beginPath(); ctx.moveTo(cx-4,cy-5.5); ctx.lineTo(cx+6,cy); ctx.lineTo(cx-4,cy+5.5); ctx.closePath(); ctx.fill(); } // ▶ reprendre
    else { ctx.fillRect(cx-4.5,cy-5.5,3,11); ctx.fillRect(cx+1.5,cy-5.5,3,11); }   // ⏸ deux barres
  } else drawIcon('gear', cx, cy, 18);
  ctx.restore();
}
const UNIT_CAT_INK = ['#b8402e','#b8402e','#b07d12','#b07d12','#2a6f9c','#2f7a3a'];   // front · tir · air · soutien
// photo d'identité du personnage dans un cadre w×h dont le coin haut-gauche est (x, y)
function hudPortrait(p, role, x, y, w, h, bg){
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  if (role.key==='air'){
    const k = (w-2)/60; ctx.translate(x+w/2, y+h/2+1); ctx.scale(k, k);
    ctx.drawImage(sprite('AIR'+p.facKey+p.era+(p.trans?'T':''), 64, 44, ()=>airSprite(p.facKey,p.era,p.trans)), -32, -22, 64, 44);
  } else {
    // cadrage BUSTE : la bande y ∈ [-60, -22] du personnage (tête + torse + arme) remplit le cadre
    const k = h/38; ctx.translate(x + w/2 - 3*k, y + h + 22*k); ctx.scale(k, k);
    drawUnitLayers(p.facKey==='HUM'?'hum':'bot', p.facKey, role.key, p.era, p.trans, 0);
  }
  ctx.restore();
}
// FICHE DE RECRUTEMENT : papier vif quand l'unité est recrutable, terne sinon ; photo d'identité,
// coût ressource par ressource (en rouge celle qui manque), recharge = volet sombre sur la photo.
function drawUnitCard(b){
  const A0 = ctx.globalAlpha, pal = uiPal();
  const p = game.p, role = ROLES[b.i], cat = UNIT_CAT_INK[b.i];
  const cost = unitCost(p, b.i), lvl = p.upg[role.key]||0;
  const cd = p.cd[b.i]>0? clamp(p.cd[b.i]/(0.5+b.i*0.45), 0, 1) : 0;
  const full = unitTotal(p)>=p.cap;
  const ok = canPay(p, cost) && cd<=0 && !full;
  paperChip(b.x, b.y, b.w, b.h, pal, ok? null : pal.dull);
  ctx.fillStyle = cat; ctx.globalAlpha = A0*(ok? 1 : 0.55); ctx.fillRect(b.x, b.y, b.w, 3); ctx.globalAlpha = A0;   // onglet de vocation
  if (ok){ ctx.strokeStyle = pal.ink; ctx.lineWidth = 1; ctx.strokeRect(b.x+0.5, b.y+0.5, b.w-1, b.h-1); }
  // nom
  const name = lUnit(p.facKey, role.key, p.era);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ok? pal.ink : pal.ink2;
  fitFont(name, b.w-8, HF(10.5), 7); ctx.fillText(name, b.x+b.w/2, b.y+11);
  // photo + recharge
  const px = b.x+4, py = b.y+18, pw = 33, ph = 30;
  ctx.globalAlpha = A0*(ok? 1 : 0.7);
  hudPortrait(p, role, px, py, pw, ph, ok? pal.photo : pal.photo2);
  ctx.globalAlpha = A0;
  if (cd>0){ ctx.fillStyle = 'rgba(23,18,15,0.62)'; ctx.fillRect(px, py, pw, ph*cd); }
  ctx.strokeStyle = ok? pal.ink : pal.ink2; ctx.lineWidth = 1; ctx.strokeRect(px+0.5, py+0.5, pw-1, ph-1);
  // raccourci clavier (coin de la photo)
  ctx.fillStyle = pal.ink; ctx.fillRect(px, py+ph-9, 9, 9);
  ctx.fillStyle = pal.paper; ctx.font = HF(7.5); ctx.textAlign = 'center'; ctx.fillText(String(b.i+1), px+4.5, py+ph-4);
  // colonne de droite : coût ressource par ressource
  const cx0 = b.x+41;
  ctx.textAlign = 'left';
  {
    let yy = b.y+23;
    for (const r in cost){
      const free = r==='m' && p.trans, have = free || p[r]>=cost[r];
      ctx.font = HF(9); ctx.fillStyle = pal.ink2;
      ctx.fillText(p.fac.icons[r], cx0, yy);
      ctx.font = HF(10.5); ctx.fillStyle = have? (ok? pal.ink : pal.ink2) : pal.bad;
      ctx.fillText(free? '∞' : String(cost[r]), cx0+13, yy+0.5);
      yy += 10;
    }
    if (full){ ctx.font = HF(8); ctx.fillStyle = pal.bad; ctx.fillText('👥 '+p.cap, cx0, b.y+46); }
  }
  // bas de fiche : amélioration de classe (coût en petits caractères + tampon ⬆ + crans de niveau)
  // (en tuto : masqué tant que l'étape « amélioration » n'est pas atteinte)
  if ((!game.tut || !TUT || tutUpgAllowed())){
    const r = {x:b.x+b.w-22, y:b.y+b.h-16, w:20, h:14, i:b.i};
    HUD.upgRects.push({x:b.x+b.w-24, y:b.y+b.h-20, w:24, h:20, i:b.i});
    const upc = {f:90*(lvl+1), m:180*(lvl+1)}, can = lvl<3 && canPay(p, upc);
    if (can){ ctx.fillStyle = pal.ink; ctx.fillRect(r.x, r.y, r.w, r.h); }
    else { ctx.strokeStyle = pal.line; ctx.lineWidth = 1; ctx.strokeRect(r.x+0.5, r.y+0.5, r.w-1, r.h-1); }
    ctx.textAlign = 'center'; ctx.font = HF(10); ctx.fillStyle = can? '#f4ecd8' : pal.ink2;
    ctx.globalAlpha = A0*(can? 1 : 0.6); ctx.fillText(lvl>=3? '★' : '⬆', r.x+r.w/2, r.y+r.h/2+0.5); ctx.globalAlpha = A0;
    ctx.fillStyle = pal.ink; for (let k=0;k<lvl;k++) ctx.fillRect(r.x+1.5+k*6, r.y-3.5, 4.5, 2.2);    // niveaux acquis
    if (lvl<3){
      ctx.textAlign = 'left'; ctx.font = '7.5px '+UI_TYPE;
      let xx = b.x+5; const yy = b.y+b.h-8;
      for (const k2 of ['f','m']){ const have = (k2==='m' && p.trans) || p[k2]>=upc[k2];
        ctx.fillStyle = have? pal.ink2 : pal.bad;
        const tx = (k2==='m' && p.trans)? '∞' : String(upc[k2]); ctx.fillText(tx, xx, yy); xx += ctx.measureText(tx).width+4; }
    }
  }
  ctx.textBaseline = 'middle';
}
function drawBtn(b){
  const A0 = ctx.globalAlpha, pal = uiPal();
  const p=game.p;
  if (b.type==='hero'){ drawHeroBtn(b, p); return; }
  if (b.type==='speed'||b.type==='softpause'||b.type==='pause'){ drawCtrl(b); return; }
  if (b.type==='unit'){ drawUnitCard(b); return; }
  let label='', sub='', ok=false, prog=1, small=b.h<40, glyph='', hot=false;
  if (b.type==='special'){
    if (p.lastReady && !p.lastUsed){
      label=tr('hud_last'); sub=tr('hud_last_sub'); ok=true; hot=true; prog=1;
    } else {
      label=lSpecial(p.facKey, p.era); glyph='✸';
      const xc = specialXpCost(p);
      // héros en vie à la dernière ère : la touche déclenche le MODE SIÈGE (payé en ressources) — le bon l'annonce
      const siegeOk = p.heroAlive && p.era>=4 && p.siegeT<=0 && p.specialCd<=0 && canPay(p,SIEGE_COST);
      ok = siegeOk || (p.specialCd<=0 && p.xp>=xc);
      if (siegeOk) label = tr('ev_siege');
      sub = siegeOk? costStr(p,SIEGE_COST)+' [ESP]' : (p.specialCd>0? '⏳'+Math.ceil(p.specialCd)+'s ':'') + '✦'+xc+' [ESP]';
      prog = Math.min(p.specialCd>0? 1-p.specialCd/SPECIAL_CD:1, Math.min(1,p.xp/xc));
    }
  } else if (b.type==='evolve'){
    label=tr('hud_evolve').replace(/^⚡\s*/,''); glyph='⚡';
    if (p.era<4){ ok = p.xp>=EVOLVE_XP[p.era+1]; sub='✦'+EVOLVE_XP[p.era+1]+' [E]';
      prog = Math.min(1,p.xp/EVOLVE_XP[p.era+1]); }
    else if (!p.trans){ ok=false; sub='✦'+TRANS_XP+' → '+p.fac.sym; prog=Math.min(1,p.xp/TRANS_XP); }
    else { ok=false; sub=tr('hud_trans'); prog=1; }
  } else if (b.type==='cap'){
    label=tr('hud_cap').replace(/^👥\s*/,''); glyph='👥';
    ok = !p.capUp && canPay(p,{m:350,w:100});
    sub = p.capUp? tr('hud_owned'):costStr(p,{m:350,w:100})+' [U]';
    prog = 1;
  } else if (b.type==='stance'){
    label=b.label; ok = game.sel.size? false : p.stance===b.st;
  } else if (b.type==='lasso'){
    label=b.label; ok=selMode;
  } else if (b.type==='formation'){
    label=b.label; ok=p.formation;
  } else if (b.type==='repairall'){
    label=tr('hud_repall').replace(/^🔧\s*/,''); glyph='🔧';
    const rc = repairAllCost(p);
    ok = rc.f>0 || rc.m>0;
    sub = ok? costStr(p, rc)+' [R]' : tr('hud_norep');
  } else if (b.type==='cam'){
    label=b.label; ok = b.go==='follow' && camFollow;
  } else if (b.type==='zoom'){
    label=b.label; ok=false;
  }
  ctx.textAlign='center'; ctx.textBaseline='middle';
  if (small){
    // INTERCALAIRE de classeur : coins du haut coupés ; enclenché = papier clair + soulignement à l'encre
    const dy = ok? 0 : 2, x=b.x, y=b.y+dy, w=b.w, h=b.h-dy, c=5;
    const tab = (ox, oy)=>{ ctx.beginPath(); ctx.moveTo(x+ox, y+h+oy); ctx.lineTo(x+ox, y+c+oy); ctx.lineTo(x+c+ox, y+oy);
      ctx.lineTo(x+w-c+ox, y+oy); ctx.lineTo(x+w+ox, y+c+oy); ctx.lineTo(x+w+ox, y+h+oy); ctx.closePath(); };
    ctx.fillStyle = 'rgba(0,0,0,0.42)'; tab(1.5, 2); ctx.fill();
    ctx.fillStyle = ok? pal.paper : pal.tab; tab(0, 0); ctx.fill();
    if (ok){ ctx.fillStyle = pal.red; ctx.fillRect(x+6, y+h-4, w-12, 2.4); }
    ctx.fillStyle = ok? pal.red : (b.type==='stance' && game.sel.size)? pal.bad : pal.ink;
    const smallLbl = b.label||label;
    fitFont(smallLbl, b.w-8, HF(12), 8);
    ctx.fillText(smallLbl, b.x+b.w/2, y+h/2+(ok? -0.5 : 0.5));
    return;
  }
  // BON D'ACTION (pouvoir, évolution, capacité, réparation) : kraft à cadre pointillé, encre, jauge
  const pulse = 0.5+0.5*Math.sin(performance.now()/260);
  paperChip(b.x, b.y, b.w, b.h, pal, hot? pal.bad : ok? pal.kraft : pal.dull);
  const inkC = hot? '#f6eedb' : ok? pal.ink : pal.ink2, accC = hot? '#f6eedb' : ok? pal.red : pal.ink2;
  ctx.strokeStyle = accC; ctx.lineWidth = 1; ctx.globalAlpha = A0*(ok? (b.type==='evolve'||hot? 0.55+0.45*pulse : 0.9) : 0.45);
  if (ok && (b.type==='evolve'||b.type==='special')){ ctx.lineWidth = 1.6; ctx.strokeRect(b.x+2.5, b.y+2.5, b.w-5, b.h-5); }
  else { ctx.setLineDash([3,2.5]); ctx.strokeRect(b.x+3.5, b.y+3.5, b.w-7, b.h-7); ctx.setLineDash([]); }
  ctx.globalAlpha = A0;
  if (glyph){ ctx.font = HF(15); ctx.fillStyle = accC; ctx.fillText(glyph, b.x+b.w/2, b.y+16); }
  ctx.fillStyle = inkC;
  fitFont(label, b.w-12, HF(glyph? 10.5 : 11.5), 7); ctx.fillText(label, b.x+b.w/2, b.y+(glyph? 31 : 21));
  ctx.fillStyle = hot? '#f6eedb' : ok? pal.ink : pal.ink2;
  fitFont(sub, b.w-12, HF(9.5), 6.5); ctx.fillText(sub, b.x+b.w/2, b.y+(glyph? 44 : 41));
  if (prog<1 || b.type==='special' || b.type==='evolve'){                                         // jauge de progression
    ctx.fillStyle = pal.line; ctx.fillRect(b.x+8, b.y+b.h-10, b.w-16, 3);
    ctx.fillStyle = prog>=1? accC : pal.ink2; ctx.fillRect(b.x+8, b.y+b.h-10, (b.w-16)*clamp(prog,0,1), 3);
  }
}
function buildOptions(side, slot){
  const opts = [];
  if (slot.b){
    if (slot.b.type==='site')
      return [{key:'demolish', label:tr('bm_cancelsite'), cost:{}}];
    if (slot.b.hp < slot.b.maxhp)
      opts.push({key:'repair', label:tr('bm_repair'), cost:repairCost(slot.b.hp, slot.b.maxhp, 60)});
    if ((slot.b.lvl||1)<3)
      opts.push({key:'upgrade', label:fmt('bm_upgrade',{n:(slot.b.lvl||1)+1}), cost:upgBuildCost(slot)});
    // garnison : RÉSERVÉE aux tourelles et murailles, unités à distance uniquement
    if (canGar(slot.b) && slot.b.gar.length<GAR_MAX){
      if ([...game.sel].some(u=>u.range>60 && !u.fly))
        opts.push({key:'garrison', label:tr('bm_garrisonsel'), cost:{}});
      const pool = {};
      for (const u of side.units)
        if (!u.task && !u.fly && u.range>60 && u.role!=='support' && u.role!=='gremlin')
          pool[u.role]=(pool[u.role]||0)+1;
      for (const rk of ['ranged','siege']){
        const n = pool[rk]||0;
        const ri = ROLES.findIndex(r=>r.key===rk);
        opts.push({key:'gar_'+rk, label:fmt('bm_garrison',{name:rname(side,rk)})+(n? fmt('bm_garr_avail',{n:n}):tr('bm_garr_recruit')),
          cost: n? {} : unitCost(side, ri)});
      }
    }
    if (slot.b.gar.length>0)
      opts.push({key:'ungarrison', label:fmt('bm_ungarrison',{n:slot.b.gar.length}), cost:{}});
    opts.push({key:'demolish', label:fmt('bm_demolish',{name:bName(side.facKey, slot.b.type)}), cost:{}});
    return opts;
  }
  return [
    {key:'wall',  label:tr('bm_wall'), cost:BUILDS.wall.cost},
    {key:'turret',label:tr('bm_turret'), cost:BUILDS.turret.cost},
    {key:'farmF', label:(side.facKey==='HUM'?tr('bm_farmH'):tr('bm_farmI')), cost:BUILDS.farmF.cost, prod:'+'+BUILDS.farmF.rate+' 🌾/s'},
    {key:'farmM', label:(side.facKey==='HUM'?tr('bm_marketH'):tr('bm_marketI')), cost:BUILDS.farmM.cost, prod:'+'+BUILDS.farmM.rate+' 🪙/s'},
    {key:'well',  label:tr('bm_well'), cost:BUILDS.well.cost, prod:'+'+BUILDS.well.rate+' 💧/s'},
  ];
}
function drawBuildMenu(){
  const p = game.p, slot = buildMenu.slot;
  // base : menu de réparation
  let opts;
  if (buildMenu.base){
    opts = [];
    // réparations : visibles uniquement quand il y a quelque chose à réparer
    if (p.hp < p.maxhp)
      opts.push({key:'repairBase', label:tr('bm_baserepair'), cost:{f:120,m:120}});
    let damaged = false;
    for (const s of sideBuildSlots(p)) if (s.b && s.b.type!=='site' && s.b.hp<s.b.maxhp) damaged = true;
    if (damaged || p.hp<p.maxhp)
      opts.push({key:'repairAll', label:tr('bm_repairall'), cost:repairAllCost(p)});
    // garde du château (3 max, unités à distance)
    if (p.gar.length<3){
      opts.push({key:'bgar_ranged', label:fmt('bm_guard',{name:rname(p,'ranged'),n:p.gar.length}), cost:{}});
      opts.push({key:'bgar_siege', label:fmt('bm_guard2',{name:rname(p,'siege')}), cost:{}});
    }
    if (p.gar.length)
      opts.push({key:'bungar', label:fmt('bm_ungarrisonbase',{n:p.gar.length}), cost:{}});
    if ((p.fortLvl||1)<3)
      opts.push({key:'fortify', label:fmt('bm_fortify',{n:(p.fortLvl||1)+1}), cost:{f:250*(p.fortLvl||1), m:250*(p.fortLvl||1)}});
    if (!p.autoRepair)
      opts.push({key:'autorep', label:tr('bm_autorep'), cost:{m:380, w:100}});
    if (!opts.length)
      opts.push({key:'noop', label:tr('bm_noop'), cost:{}});
  } else {
    opts = buildOptions(p, slot);
  }
  // TUTORIEL : sur un SOCLE VIDE, ne proposer que la construction de l'étape + celles déjà
  // enseignées. (Sur un bâtiment existant — réparer / améliorer / GARNISON — on ne filtre rien.)
  if (game.tut && TUT && !buildMenu.base && !slot.b) opts = opts.filter(o => tutBuildAllowed(o.key));
  const bw=210, bh=Math.max(1,opts.length)*34+12;
  const anchorX = buildMenu.base? p.x : slot.x;
  let bx = clamp(w2sX(anchorX)-bw/2, 8, W-bw-8);
  let by = clamp(w2sY(gY(anchorX))-110-bh, 44, H-bh-150);
  buildMenu.box = {x:bx, y:by, w:bw, h:bh};
  buildMenu.rects=[];
  const pal = uiPal();
  paperPanel(bx, by, bw, bh, pal, {tape:true, tapeX:0.78});
  ctx.textAlign='left'; ctx.textBaseline='middle';
  const inTut = game.tut && TUT && !buildMenu.base && !slot.b;   // surbrillance/grisé : uniquement les constructions sur socle vide
  const pulse = 0.6 + 0.4*Math.sin(performance.now()/220);
  for (let i=0;i<opts.length;i++){
    const o=opts[i], y=by+8+i*34;
    const free = !Object.keys(o.cost).length;
    const ok = free || canPay(p,o.cost);
    const cur = inTut && tutBuildCurrent(o.key);     // construction demandée à cette étape
    const past = inTut && !cur;                       // déjà enseignée → grisée
    buildMenu.rects.push({x:bx+4,y,w:bw-8,h:30,key:o.key});
    if (i>0) inkRule(bx+10, bx+bw-10, y-2, pal);
    ctx.globalAlpha = past? 0.4 : (ok?1:0.45);
    if (cur){ ctx.save(); ctx.strokeStyle=pal.red; ctx.globalAlpha=pulse; ctx.lineWidth=2.2; ctx.strokeRect(bx+5,y+1,bw-10,28); ctx.restore(); }
    ctx.fillStyle = cur? pal.red : pal.ink;
    fitFont(o.label, bw-20, uiF(pal,'cond',12.5), 8.5);
    ctx.fillText(o.label, bx+12, y+10);
    ctx.fillStyle = pal.ink2;
    const costTxt = free?'—':costStr(p,o.cost);
    fitFont(costTxt, bw-20, uiF(pal,'type',10.5), 7.5);
    ctx.fillText(costTxt, bx+12, y+23);
    // info de production affichée AVANT la construction (chaque ferme produit X de sa ressource)
    if (o.prod){
      ctx.textAlign='right'; ctx.fillStyle=pal.ok;
      fitFont(o.prod, bw*0.4, uiF(pal,'type',10.5), 7.5);
      ctx.fillText(o.prod, bx+bw-12, y+15);
      ctx.textAlign='left';
    }
    ctx.globalAlpha=1;
  }
}
// pause simple ⏸ : voile très léger pour qu'on VOIE encore le champ de bataille,
// + un bandeau discret et un bouton « Reprendre ».
function drawSoftPause(){
  ctx.fillStyle='rgba(10,8,7,0.28)'; ctx.fillRect(0,0,W,H);
  const pal = uiPal(), bw=240, bh=84, bx=W/2-bw/2, by=H/2-bh/2;
  paperPanel(bx, by, bw, bh, pal, {tape:true});
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=pal.ink;
  fitFont(t('p_title'), bw-24, uiF(pal,'head',24), 14);
  ctx.fillText(t('p_title'), W/2, by+24);
  const rw=bw-44, rh=30, rx=bx+22, ry=by+42;
  inkStamp(rx, ry, rw, rh, t('p_resume'), pal, 15);
  pauseRects = [{x:rx,y:ry,w:rw,h:rh,key:'resume'}];
}
const QUAL_KEY = {low:'qual_low', medium:'qual_med', high:'qual_high', ultra:'qual_ultra'};
function qualityName(){ return tr(QUAL_KEY[SETTINGS.quality]||'qual_med'); }
function cycleQuality(){ const i=QUALITIES.indexOf(SETTINGS.quality); SETTINGS.quality=QUALITIES[(i+1)%QUALITIES.length]; fpsWarned=false; saveSettings(); }
// PAUSE COMPLÈTE (⚙ Réglages) — carte arrondie façon menu v2 (dégradé + liseré doré),
// regroupée par section (Audio / Affichage / Partie) pour une lecture logique, avec un
// bouton Reprendre mis en avant et Quitter clairement isolé en rouge.
function drawPause(){
  ctx.fillStyle='rgba(10,8,7,0.7)'; ctx.fillRect(0,0,W,H);
  // CARTE THERMIQUE des morts (combats récents), visible en pause — nappes additives colorées.
  if (game && !game.over && game.killLog && game.killLog.length){
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for (const k of game.killLog){
      const sx=(k.x-camX)*zoom, sy=gY(k.x)*zoom+zTY();
      if (sx<-40||sx>W+40) continue;
      const col = k.s===1? '90,170,255' : '255,90,70';
      const g=ctx.createRadialGradient(sx,sy,1,sx,sy,34);
      g.addColorStop(0,'rgba('+col+',0.15)'); g.addColorStop(1,'rgba('+col+',0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sx,sy,34,0,6.28); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font=HF(11); ctx.textAlign='center';
    ctx.fillText(tr('heatmap_lbl'), W/2, 70);
  }
  const bw=316, bx=W/2-bw/2;
  const items = [
    {key:'h1', head:tr('opts_h_audio')},
    {key:'music',  half:true, label:t('p_music')+' : '+(SETTINGS.music?t('on'):t('off'))},
    {key:'sfx',    half:true, label:t('p_sfx')+' : '+(SETTINGS.sfx?t('on'):t('off'))},
    {key:'vol',    label:''},                       // slider de volume
    {key:'h2', head:tr('opts_h_display')},
    {key:'lang',   label:t('set_lang')+' : '+((typeof LANG_NATIVE!=='undefined'&&LANG_NATIVE[SETTINGS.lang])||String(SETTINGS.lang).toUpperCase())},
    {key:'quality',label:tr('set_quality')+' : '+qualityName()},
    {key:'shake',  half:true, label:t('p_shake')+' : '+(SETTINGS.shake?t('on'):t('off'))},
    {key:'follow', half:true, label:t('p_follow')+' : '+(camFollow?t('yes'):t('no'))},
    {key:'news',   half:true, label:tr('set_news')+' : '+(SETTINGS.newsFeed?t('on'):t('off'))},
  ];
  // plein écran : en partie le bouton flottant ⛶ est masqué (il recouvrait le HUD), on le
  // propose donc ici — seulement là où l'API existe (ni appli native, ni iOS)
  if (FS_AVAILABLE) items.push({key:'fs', half:true, label:tr('fs_btn')+' : '+(isFullscreen()?t('on'):t('off'))});
  items.push({key:'quit', label:t('p_quit')});
  // DEUX réglages par ligne (paires consécutives « half ») : le panneau reste dans les 540 px
  // logiques même avec le plein écran et le fil d'actualités en plus
  const rows = [];
  for (let i=0;i<items.length;i++){ const it = items[i];
    if (it.half && items[i+1] && items[i+1].half){ rows.push({pair:[it, items[i+1]]}); i++; }
    else rows.push(it); }
  // GÉOMÉTRIE : bh est dérivé des MÊMES constantes que les offsets Y du dessin
  // (TITLE_H/RESUME_H/GAP0), au lieu d'une constante devinée séparément — c'est cet
  // écart qui faisait sortir « Abandonner la partie » (dernier item) du cadre du panneau.
  const TITLE_H=48, RESUME_H=34, GAP0=16, BOTTOM_PAD=14;
  const headH=24, gap=6;
  // hauteur de ligne ADAPTATIVE : 36 px par défaut, resserrée si la liste (ex. ligne plein
  // écran en plus) ne tiendrait plus dans la hauteur logique (540 px en 16:9)
  const nRows = rows.filter(it=>it.head==null).length, nHeads = rows.length-nRows;
  const ih = Math.max(30, Math.min(36, Math.floor((H-16 - TITLE_H-RESUME_H-GAP0-BOTTOM_PAD - nHeads*(headH+gap))/nRows - gap)));
  let contentH=0; for (const it of rows) contentH += (it.head!=null? headH : ih)+gap;
  const bh = TITLE_H + RESUME_H + GAP0 + contentH + BOTTOM_PAD;
  const by=clamp(H/2-bh/2, 8, H-bh-8);
  const pal = uiPal();
  paperPanel(bx, by, bw, bh, pal, {tape:true, tapeX:0.3});
  ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.fillStyle=pal.ink;
  fitFont(t('p_title'), bw-30, uiF(pal,'head',26), 15);
  ctx.fillText(t('p_title'), W/2, by+34);
  ctx.fillStyle=pal.ink; ctx.fillRect(bx+20, by+41, bw-40, 1.5); ctx.fillRect(bx+20, by+44, bw-40, 1.5);   // double filet
  // bouton REPRENDRE mis en avant, juste sous le titre (tampon)
  const rw0=bw-48, rh0=RESUME_H, rx0=bx+24, ry0=by+TITLE_H+2;
  inkStamp(rx0, ry0, rw0, rh0, t('p_resume'), pal, 16);
  pauseRects = [{x:rx0,y:ry0,w:rw0,h:rh0,key:'resume'}];
  let y = ry0+rh0+GAP0;
  ctx.textBaseline='alphabetic';
  for (const it of rows){
    if (it.pair){
      const hw = (bw-28-6)/2;
      it.pair.forEach((pi,j)=>{ const px = bx+14+j*(hw+6);
        pauseRects.push({x:px,y,w:hw,h:ih-6,key:pi.key});
        ctx.textAlign='center'; ctx.fillStyle=pal.ink;
        fitFont(pi.label, hw-12, uiF(pal,'type',12), 8);
        ctx.fillText(pi.label, px+hw/2, y+(ih-6)/2+4); });
      ctx.fillStyle=pal.line; ctx.fillRect(bx+14+(bw-28)/2, y+4, 1, ih-14);
      inkRule(bx+16, bx+bw-16, y+ih-3, pal);
      y += ih+gap; continue;
    }
    if (it.head!=null){
      ctx.textAlign='left'; ctx.fillStyle=pal.red;
      fitFont(it.head, bw-44, uiF(pal,'head',13), 8);
      ctx.fillText(it.head, bx+22, y+headH*0.72);
      y += headH+gap; continue;
    }
    pauseRects.push({x:bx+14,y,w:bw-28,h:ih-6,key:it.key});
    ctx.textAlign='center';
    if (it.key==='vol'){
      // slider : cliquer/glisser n'importe où sur la barre règle le volume
      const rx=bx+58, rw2=bw-166, ry=y+(ih-6)/2;
      ctx.fillStyle=pal.ink; ctx.textAlign='left';
      fitFont(t('set_vol'), 58, uiF(pal,'type',12), 8.5);
      ctx.fillText(t('set_vol'), bx+24, ry+4);
      ctx.fillStyle=pal.ink2; ctx.fillRect(rx+28, ry-1, rw2, 2);
      ctx.fillStyle=pal.red; ctx.fillRect(rx+28, ry-2.5, rw2*SETTINGS.vol, 5);
      ctx.fillStyle=pal.ink; ctx.beginPath(); ctx.arc(rx+28+rw2*SETTINGS.vol, ry, 6, 0, 6.28); ctx.fill();
      ctx.textAlign='center';
      fitFont(Math.round(SETTINGS.vol*100)+'%', 40, uiF(pal,'type',12), 9);
      ctx.fillText(Math.round(SETTINGS.vol*100)+'%', bx+bw-30, ry+4);
      pauseRects[pauseRects.length-1].slider = {x:rx+28, w:rw2};
      inkRule(bx+16, bx+bw-16, y+ih-3, pal);
      y += ih+gap; continue;
    }
    ctx.fillStyle = it.key==='quit'? pal.red : pal.ink;
    fitFont(it.label, bw-44, uiF(pal, it.key==='quit'? 'head' : 'type', it.key==='quit'? 14 : 12.5), 9);
    ctx.fillText(it.label, W/2, y+(ih-6)/2+4);
    if (it.key!=='quit') inkRule(bx+16, bx+bw-16, y+ih-3, pal);
    y += ih+gap;
  }
}
