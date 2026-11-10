/* ---------- PAPIER (v1.11) : les panneaux en jeu reprennent l'identité du menu ----------
   Fiche imprimée pour l'Humanité, listing d'imprimante zébré et perforé pour G·P·T. Grain cuit
   une seule fois en motif, ombre portée nette : aucun flou, coût négligeable. */
const UIPAL = {
  HUM:{ paper:'#e9e0ca', paper2:'#d8ccb0', ink:'#1f1b17', ink2:'#5a5146', red:'#c42a1c', ok:'#2f6a2a', line:'rgba(31,27,23,0.32)',
        head:'"AGI Stencil","AGI Cond",Impact,sans-serif', headW:800, type:'"AGI Type","Courier New",monospace', k:1 },
  IA: { paper:'#eef2ea', paper2:'#dde9da', ink:'#10262d', ink2:'#3d5a62', red:'#0b6fa8', ok:'#0b6fa8', line:'rgba(16,38,45,0.28)',
        head:'"AGI Term","Courier New",monospace', headW:400, type:'"AGI Term","Courier New",monospace', k:1.3, ia:true },
};
const UI_COND = '"AGI Cond","Arial Narrow",Arial,sans-serif';
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
// file d'attente : petits pictogrammes des unités en attente d'une place sur la carte (en haut à gauche)
function drawQueue(){
  const p=game.p, q=p.queue;
  if (!q || !q.length) return;
  const sz=20, gap=4, bx=10, by=43, n=Math.min(q.length,10);
  const bw=n*(sz+gap)+6;
  ctx.fillStyle='rgba(16,13,12,0.82)'; rr(bx-5,by-3,bw,sz+8,5); ctx.fill();
  ctx.strokeStyle='rgba(255,211,74,0.30)'; ctx.lineWidth=1; rr(bx-5,by-3,bw,sz+8,5); ctx.stroke();
  ctx.textAlign='center'; ctx.textBaseline='middle';
  for (let i=0;i<n;i++){
    const x=bx+i*(sz+gap), next=(i===0);
    ctx.fillStyle = next? 'rgba(255,211,74,0.18)':'rgba(255,255,255,0.06)'; rr(x,by,sz,sz,4); ctx.fill();
    ctx.strokeStyle = next? '#ffd34a':'#4a443c'; ctx.lineWidth=1; rr(x,by,sz,sz,4); ctx.stroke();
    ctx.font='13px Arial'; ctx.fillStyle='#e8e0d2';
    ctx.fillText(ROLE_ICON[ROLES[q[i]].key]||'?', x+sz/2, by+sz/2+1);
  }
}
// TOOLTIP DÉTAILLÉ (survol souris) : fiche stats d'une unité au-dessus de son bouton.
function drawUnitTooltip(i){
  const r = ROLES[i], p = game.p; if (!r) return;
  let btn=null; for (const b of HUD.btns) if (b.type==='unit'&&b.i===i){ btn=b; break; }
  if (!btn) return;
  const name = lUnit(p.facKey, r.key, p.era);
  // stats EFFECTIVES (ère + améliorations + archétype + faction) — exactement ce qui sera déployé.
  const s = unitStats(p, i), lvl = p.upg[r.key]||0;
  const up = lvl? '  ⬆'+lvl : '';
  const lines = [
    '❤ '+Math.round(s.hp)+'    ⚔ '+(s.dmg? Math.round(s.dmg):'—')+'    ⏱ '+s.rate.toFixed(2)+'s'+up,
    '🎯 '+Math.round(s.range)+'    👟 '+Math.round(s.spd)+(s.aoe?'    💥 '+s.aoe:''),
    '💰 '+costStr(p, unitCost(p, i)),
  ];
  ctx.font='11px Arial'; let tw=ctx.measureText(name).width;
  for (const l of lines) tw=Math.max(tw, ctx.measureText(l).width);
  // PORTRAIT (v1.9) : le personnage exact qui sera déployé (ère, faction, transcendance)
  const PW=62, w=tw+20+PW, h=Math.max(76, 22+lines.length*15), x=clamp(btn.x+btn.w/2-w/2, 4, W-w-4), y=btn.y-h-8;
  ctx.fillStyle='rgba(14,11,10,0.96)'; rr(x,y,w,h,6); ctx.fill();
  ctx.strokeStyle=p.fac.accent; ctx.lineWidth=1; rr(x,y,w,h,6); ctx.stroke();
  ctx.save(); rr(x+4,y+4,PW-6,h-8,5); ctx.clip();
  const pg=ctx.createLinearGradient(0,y,0,y+h); pg.addColorStop(0,rgbaC(p.fac.accent,0.16)); pg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=pg; ctx.fillRect(x+4,y+4,PW-6,h-8);
  if (r.key==='air'){ ctx.translate(x+PW/2+1, y+h/2); ctx.scale(0.85,0.85);
    ctx.drawImage(sprite('AIR'+p.facKey+p.era+(p.trans?'T':''), 64, 44, ()=>airSprite(p.facKey,p.era,p.trans)), -32, -22, 64, 44); }
  else { ctx.translate(x+PW/2, y+h-6); const k=Math.min(0.92,(h-12)/70); ctx.scale(k,k);
    drawUnitLayers(p.facKey==='HUM'?'hum':'bot', p.facKey, r.key, p.era, p.trans, 0); }
  ctx.restore();
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.fillStyle=p.fac.accent; ctx.font=HF(12);
  ctx.fillText((ROLE_ICON[r.key]||'')+' '+name, x+PW+8, y+16);
  ctx.fillStyle='#cdc4b6'; ctx.font='11px Arial';
  let yy=y+33; for (const l of lines){ ctx.fillText(l, x+PW+8, yy); yy+=15; }
  ctx.textAlign='center';
}
function drawHUD(){
  const p = game.p, fac = p.fac;
  const rates = calcRates(p);
  ctx.textBaseline='middle';
  // ---- bandeau haut (h=38) : dégradé, liseré de faction, pastilles de ressources ----
  const tg = ctx.createLinearGradient(0,0,0,38); tg.addColorStop(0,'rgba(30,25,22,0.94)'); tg.addColorStop(1,'rgba(12,10,9,0.88)');
  ctx.fillStyle=tg; ctx.fillRect(0,0,W,38);
  ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fillRect(0,0,W,1);
  ctx.fillStyle=rgbaC(fac.accent,0.55); ctx.fillRect(0,37,W,1);
  ctx.fillStyle='rgba(255,255,255,0.045)';
  for (const [cx0,cw] of [[3,86],[91,86],[179,76],[257,92]]){ rr(cx0,3,cw,32,6); ctx.fill(); }
  ctx.textAlign='left';
  ctx.font=HF(14);
  ctx.fillStyle='#e8d8a0'; ctx.fillText(fac.icons.f+' '+Math.floor(p.f), 8, 13);
  ctx.fillStyle='#b8d8e8'; ctx.fillText(fac.icons.m+' '+(p.trans?'∞':Math.floor(p.m)), 96, 13);
  ctx.fillStyle='#6ab0e0'; ctx.fillText('💧 '+Math.floor(p.w), 184, 13);
  ctx.fillStyle='#cdb4ff';
  const nx = p.era<4? EVOLVE_XP[p.era+1] : (!p.trans? TRANS_XP : null);
  ctx.fillText('✦ '+Math.floor(p.xp)+(nx?'/'+nx:''), 262, 13);
  // production /s sous chaque ressource
  ctx.font='10px Arial';
  ctx.fillStyle='#9dc88a';
  ctx.fillText(fmtRate(rates.f)+'/s', 8, 29);
  ctx.fillText(p.trans?'∞':fmtRate(rates.m)+'/s', 96, 29);
  ctx.fillText(fmtRate(rates.w)+'/s', 184, 29);
  ctx.fillStyle='#8a7aa8';
  const xpr = 2.2 + ((p.fortLvl||1)-1)*1.3 + (game.nodes.some(n=>n.center&&n.owner==='p')?1.5:0) + 0.5*game.zones.reduce((n,z)=>n+(z.owner==='p'?1:0),0);
  ctx.fillText(fmtRate(xpr)+'/s', 262, 29);
  // ère + santé du monde au centre
  ctx.textAlign='center'; ctx.font=HF(14);
  ctx.fillStyle = p.trans? '#ffe9a0' : fac.accent;
  ctx.fillText(p.trans? lTransName(p.facKey) : lEra(p.facKey,p.era), W/2, 11);
  ctx.fillStyle='rgba(255,255,255,0.13)'; rr(W/2-80, 25.5, 160, 5, 2.5); ctx.fill();
  if (game.dev>0.01){ ctx.fillStyle = lerpCol([120,200,120],[200,60,40],game.dev); rr(W/2-80, 25.5, Math.max(5,160*game.dev), 5, 2.5); ctx.fill(); }
  ctx.font='8.5px Arial'; ctx.fillStyle='rgba(255,255,255,0.45)';
  ctx.fillText(tr('world_health'), W/2, 20);
  // droite : effectif + ennemi (calés À GAUCHE du cluster de contrôles → plus de chevauchement)
  const RX = W-120;                                // 8 px d'air avant le bouton de vitesse (x = W-112)
  ctx.textAlign='right'; ctx.font=HF(13);
  ctx.fillStyle = unitTotal(p)>=p.cap? '#ff5a4a':'#d8d0c4';
  const qn = (p.queue && p.queue.length) ? p.queue.length : (p.queueLen||0);
  ctx.fillText('👥 '+unitTotal(p)+'/'+p.cap+(qn? ' ⏳'+qn:''), RX, 13);
  // ligne 2 : ennemi (couleur faction) puis difficulté (gris), tous deux calés à droite
  ctx.font='10px Arial'; ctx.fillStyle='#988e80';
  const diffTxt = tr('diff_'+game.diff).toUpperCase();
  ctx.fillText(diffTxt, RX, 29);
  const dw = ctx.measureText(diffTxt).width;
  ctx.font=HF(11); ctx.fillStyle=game.e.fac.accent;
  ctx.fillText(lFacName(game.e.facKey)+' '+game.e.fac.eras[game.e.era].tag+(game.e.trans? ' '+game.e.fac.sym:''), RX-dw-10, 29);
  // ---- minimap (y=42) ----
  const mw=200, mh=13, mx=W/2-mw/2, my=42;
  ctx.fillStyle='rgba(0,0,0,0.5)'; rr(mx-2,my-2,mw+4,mh+4,4); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(mx,my,mw,mh);
  for (const n of game.nodes){
    ctx.fillStyle = n.owner==='p'? game.p.fac.accent : n.owner==='e'? game.e.fac.accent : '#888';
    ctx.fillRect(mx + n.x/WORLD*mw -2, my+3, 4, mh-6);
  }
  for (const n of game.neut){
    ctx.fillStyle = n.owner? n.owner.fac.accent : '#666';
    ctx.fillRect(mx + n.x/WORLD*mw -1.5, my+4, 3, mh-8);
  }
  for (const u of game.p.units){ ctx.fillStyle=game.p.fac.accent; ctx.fillRect(mx+u.x/WORLD*mw, my+4, 2, 5); }
  for (const u of game.e.units){ ctx.fillStyle=game.e.fac.accent; ctx.fillRect(mx+u.x/WORLD*mw, my+4, 2, 5); }
  ctx.fillStyle='#fff'; ctx.fillRect(mx+game.p.x/WORLD*mw-2, my+1, 4, mh-2);
  ctx.fillRect(mx+game.e.x/WORLD*mw-2, my+1, 4, mh-2);
  ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1;
  ctx.strokeRect(mx + camX/WORLD*mw, my, VW()/WORLD*mw, mh);
  // ---- INDICATEUR DE MOMENTUM : qui prend l'avantage globalement (sous la minimap) ----
  // RESTYLE : barre plus épaisse et lisible (6px), lueur de la couleur en tête, repère
  // central en TRIANGLE net au-dessus de la barre (l'ancien tick carré blanc se confondait
  // avec le remplissage coloré et ressemblait à un point flottant sans signification).
  { const my2=my+mh+5, barH=6;
    const mom = clamp((p.hp/p.maxhp - game.e.hp/game.e.maxhp)*1.6 + (p.units.length-game.e.units.length)/40, -1, 1);
    ctx.fillStyle='rgba(0,0,0,0.5)'; rr(mx,my2,mw,barH,3); ctx.fill();
    const leadCol = mom>=0? p.fac.accent : game.e.fac.accent;
    ctx.save(); if (qFx()){ ctx.shadowColor=leadCol; ctx.shadowBlur=5; }   // PERF : coupé en Faible
    ctx.fillStyle=leadCol;
    if (mom>=0) rr(mx+mw/2, my2, mw/2*mom, barH, 3); else rr(mx+mw/2+mw/2*mom, my2, -mw/2*mom, barH, 3);
    ctx.fill(); ctx.restore();
    ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.moveTo(mx+mw/2, my2-1); ctx.lineTo(mx+mw/2-3.2, my2-5.5); ctx.lineTo(mx+mw/2+3.2, my2-5.5); ctx.closePath(); ctx.fill();
  }
  // ---- ANNEAU DE PROGRESSION D'ÈRE (façon RPG), à gauche de la minimap ----
  { const rx=mx-18, ry=my+7, rad=8;
    const prevX = p.era>0? (EVOLVE_XP[p.era]||0):0;
    const nX = p.era<4? EVOLVE_XP[p.era+1] : (!p.trans? TRANS_XP : null);
    const fr = nX? clamp((p.xp-prevX)/((nX-prevX)||1),0,1) : 1;
    ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(rx,ry,rad,0,6.283); ctx.stroke();
    ctx.strokeStyle=p.trans?'#ffe9a0':fac.accent; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(rx,ry,rad,-1.5708,-1.5708+6.283*fr); ctx.stroke();
    ctx.fillStyle=p.trans?'#ffe9a0':fac.accent; ctx.font=HF(8); ctx.textAlign='center';
    ctx.fillText(p.era<4?('E'+(p.era+1)):'★', rx, ry+1);
  }
  // ---- chrono de partie (gelé en pause, accéléré/ralenti avec la vitesse de jeu) ----
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.font=HF(12); ctx.fillStyle='#cdbf9a';
  ctx.fillText('⏱ '+fmtTime(game.t)+((game.speed&&game.speed!==1)? '  ×'+game.speed : ''), mx+mw+10, my+mh/2);
  drawQueue();
  // ---- météo en cours ----
  if (game.weather){
    ctx.font=HF(10); ctx.textAlign='center';
    ctx.fillStyle = game.weather==='strike'? '#ff9d45':'#5ad0ff';
    ctx.fillText(game.weather==='strike'? tr('ev_strike_short')
                                         : tr('ev_patch_short'), W/2, 66);
  }
  // ---- annonce (y=100) ----
  if (game.msgT>0 && game.msg){
    ctx.globalAlpha = Math.min(1, game.msgT);
    ctx.font=uiF(uiPal(),'head',24); ctx.textAlign='center';
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillText(game.msg.txt, W/2+2, 102);
    ctx.fillStyle=game.msg.color; ctx.fillText(game.msg.txt, W/2, 100);
    ctx.globalAlpha=1;
  }
  drawNews();                                      // fil d'actualités du monde (haut gauche, discret)
  // ---- console de commandement : fondu sombre + filet, pour que les plaques ne flottent pas sur le décor ----
  { const dockY = H-64-6-31-3-7;
    const dg = ctx.createLinearGradient(0, dockY-14, 0, H); dg.addColorStop(0,'rgba(10,8,9,0)'); dg.addColorStop(0.16,'rgba(10,8,9,0.62)'); dg.addColorStop(1,'rgba(8,6,7,0.9)');
    ctx.fillStyle = dg; ctx.fillRect(0, dockY-14, W, H-dockY+14);
    ctx.fillStyle = rgbaC(fac.accent, 0.35); ctx.fillRect(0, dockY, W, 1); }
  // ---- boutons ----
  HUD.upgRects = [];
  for (const b of HUD.btns){
    if (btnHidden(b)) continue;
    const dim = game.tut && TUT && tutBtnDim(b);    // tuto : acquis mais pas l'étape courante → grisé
    if (dim){ ctx.save(); ctx.globalAlpha = 0.38; drawBtn(b); ctx.restore(); }
    else drawBtn(b);
  }
  if (hoverUnitBtn>=0) drawUnitTooltip(hoverUnitBtn);
  // ---- bannière de sélection (y=H-134, jamais sur les boutons) ----
  HUD.selRect = null;
  if (game.sel.size>0){
    const txt = fmt('hud_sel',{n:game.sel.size});
    ctx.font=HF(12);
    const tw = ctx.measureText(txt).width;
    const bx = W/2-tw/2-26, by = H-132, bw = tw+52;
    ctx.fillStyle='rgba(16,13,12,0.92)'; rr(bx,by,bw,24,5); ctx.fill();
    ctx.strokeStyle='#ffd34a'; ctx.lineWidth=1.4; rr(bx,by,bw,24,5); ctx.stroke();
    ctx.textAlign='left'; ctx.fillStyle='#ffd34a'; ctx.fillText(txt, bx+9, by+12);
    ctx.textAlign='center'; ctx.fillStyle='#d88'; ctx.fillText('✖', bx+bw-14, by+12);
    HUD.selRect = {x:bx+bw-28, y:by, w:28, h:24};
  }
  // lasso en cours
  if (selBox){
    ctx.strokeStyle='#ffd34a'; ctx.lineWidth=1.4; ctx.setLineDash([5,4]);
    ctx.strokeRect(Math.min(selBox.x0,selBox.x1), Math.min(selBox.y0,selBox.y1),
      Math.abs(selBox.x1-selBox.x0), Math.abs(selBox.y1-selBox.y0));
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,211,74,0.08)';
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
// un bouton mystérieux qui surgit en surbrillance — l'identité n'est révélée qu'à l'activation.
function heroBtnReady(p){
  return !p.units.some(u=>u.role==='hero') && p.heroCd<=0 && canPay(p,HERO_COST);
}
function drawHeroBtn(b, p){
  if (!heroBtnReady(p)) return;                 // invisible tant que ce n'est pas disponible
  const col = p.facKey==='HUM'? '#e8c84a' : '#ff4ad0';
  const pulse = 0.55 + 0.45*Math.sin(performance.now()/1000*4.5);  // respiration lumineuse pour attirer l'œil
  ctx.save();
  if (qFx()){ ctx.shadowColor = col; ctx.shadowBlur = 10+10*pulse; }   // PERF : coupé en Faible
  ctx.fillStyle='rgba(20,16,14,0.92)'; rr(b.x,b.y,b.w,b.h,6); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 1.4+1.4*pulse; rr(b.x,b.y,b.w,b.h,6); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.6+0.4*pulse;
  ctx.fillStyle = col; ctx.font='800 16px Georgia'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('✦', b.x+b.w/2, b.y+b.h/2+1);    // glyphe énigmatique : on ne révèle pas ce que c'est
  ctx.restore();
}
// contrôles épurés (vitesse / pause / réglages) : icônes vectorielles propres
function drawCtrl(b){
  const r=6, cx=b.x+b.w/2, cy=b.y+b.h/2;
  let col='#cfcabf', active=false;
  if (b.type==='speed'){ const s=game.speed||1; active=(s!==1); col=active?'#7ec8ff':'#9a958c'; }
  else if (b.type==='softpause'){ active=(paused&&!settingsOpen); col=active?'#7dd84a':'#cfcabf'; }
  ctx.save();
  ctx.fillStyle='rgba(16,13,12,0.9)'; rr(b.x,b.y,b.w,b.h,r); ctx.fill();
  ctx.strokeStyle=col; ctx.globalAlpha=active?0.9:0.4; ctx.lineWidth=1.2; rr(b.x,b.y,b.w,b.h,r); ctx.stroke();
  ctx.globalAlpha=1; ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=1.8; ctx.lineCap='round'; ctx.lineJoin='round';
  if (b.type==='speed'){
    const s=game.speed||1;
    if (s<1){ ctx.beginPath(); ctx.arc(cx,cy,4.5,0,6.28); ctx.stroke(); }     // ralenti : petit rond
    else { const n=(s>=3?3:s>=2?2:1), gap=4.5, x0=cx-(n-1)*gap/2-1;            // ×1/×2/×3 : chevrons d'avance
      for (let i=0;i<n;i++){ const ox=x0+i*gap; ctx.beginPath();
        ctx.moveTo(ox-2.6,cy-4.5); ctx.lineTo(ox+2.6,cy); ctx.lineTo(ox-2.6,cy+4.5); ctx.stroke(); } }
  } else if (b.type==='softpause'){
    if (active){ ctx.beginPath(); ctx.moveTo(cx-4,cy-5.5); ctx.lineTo(cx+6,cy); ctx.lineTo(cx-4,cy+5.5); ctx.closePath(); ctx.fill(); } // ▶ reprendre
    else { ctx.fillRect(cx-4.5,cy-5.5,3,11); ctx.fillRect(cx+1.5,cy-5.5,3,11); }   // ⏸ deux barres
  } else { // réglages : ROUAGE plein (rouage clair et reconnaissable)
    const teeth=8, ro=8.2, ri=6;
    ctx.beginPath();
    for (let i=0;i<teeth*2;i++){ const a=i*Math.PI/teeth - 0.2, rr2=(i%2?ro:ri);
      const px=cx+Math.cos(a)*rr2, py=cy+Math.sin(a)*rr2; i?ctx.lineTo(px,py):ctx.moveTo(px,py); }
    ctx.closePath(); ctx.fillStyle=col; ctx.fill();
    ctx.fillStyle='rgba(16,13,12,0.95)'; ctx.beginPath(); ctx.arc(cx,cy,2.8,0,6.28); ctx.fill();
  }
  ctx.restore();
}
// ---------- HUD v3 (v1.12) : CONSOLE DE COMMANDEMENT ----------
// Plaques d'acier sombre posées sur une console unique (plus de boutons néon flottants) :
// cartes d'unités avec le BUSTE réel du personnage qui sera déployé (ère, camp, transcendance),
// coût ressource par ressource (en rouge celle qui manque), jauge de recharge sur le portrait,
// actif = aplat de la couleur + filet, sans aucun halo flou.
const RES_COL = { f:'#e8d8a0', m:'#b8d8e8', w:'#7ab8e6' };
const UNIT_CAT_COL = ['#ff7a5a','#ff7a5a','#ffd34a','#ffd34a','#5ad0ff','#6dff8a'];
function hudPlate(b, r, active, col, dim){
  const g = ctx.createLinearGradient(0, b.y, 0, b.y+b.h);
  g.addColorStop(0, active? 'rgba(52,44,40,0.97)' : 'rgba(38,33,36,0.96)'); g.addColorStop(1, 'rgba(15,12,14,0.97)');
  ctx.fillStyle = g; rr(b.x, b.y, b.w, b.h, r); ctx.fill();
  if (active){ ctx.fillStyle = rgbaC(col, 0.16); rr(b.x, b.y, b.w, b.h, r); ctx.fill(); }
  ctx.strokeStyle = active? col : rgbaC(col, dim? 0.28 : 0.5); ctx.lineWidth = active? 1.6 : 1;
  rr(b.x+0.5, b.y+0.5, b.w-1, b.h-1, r); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(b.x+r, b.y+1, b.w-r*2, 1);   // reflet du haut (plaque)
}
// buste du personnage dans un cadre w×h dont le coin haut-gauche est (x, y)
function hudPortrait(p, role, x, y, w, h, locked){
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y+h); g.addColorStop(0, rgbaC(p.fac.accent, 0.22)); g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (role.key==='air'){
    const k = (w-2)/60; ctx.translate(x+w/2, y+h/2+1); ctx.scale(k, k);
    ctx.drawImage(sprite('AIR'+p.facKey+p.era+(p.trans?'T':''), 64, 44, ()=>airSprite(p.facKey,p.era,p.trans)), -32, -22, 64, 44);
  } else {
    // cadrage BUSTE : la bande y ∈ [-60, -22] du personnage (tête + torse + arme) remplit le cadre
    const k = h/38; ctx.translate(x + w/2 - 3*k, y + h + 22*k); ctx.scale(k, k);
    drawUnitLayers(p.facKey==='HUM'?'hum':'bot', p.facKey, role.key, role.minEra? Math.max(p.era, role.minEra) : p.era, p.trans, 0);
  }
  ctx.restore();
  if (locked){ ctx.fillStyle = 'rgba(10,8,10,0.72)'; ctx.fillRect(x, y, w, h); }
}
function drawUnitCard(b){
  const A0 = ctx.globalAlpha;
  const p = game.p, role = ROLES[b.i], cat = UNIT_CAT_COL[b.i];
  const locked = !!(role.minEra && p.era<role.minEra);
  const cost = unitCost(p, b.i), lvl = p.upg[role.key]||0;
  const cd = p.cd[b.i]>0? clamp(p.cd[b.i]/(0.5+b.i*0.45), 0, 1) : 0;
  const full = unitTotal(p)>=p.cap;
  const ok = !locked && canPay(p, cost) && cd<=0 && !full;
  hudPlate(b, 5, ok, p.fac.accent, !ok);
  ctx.fillStyle = rgbaC(cat, ok? 1 : 0.5); ctx.fillRect(b.x+5, b.y+1, b.w-10, 2.5);          // filet de catégorie
  // nom
  const name = lUnit(p.facKey, role.key, locked? role.minEra : p.era);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ok? '#f4eee2' : '#a39a8c';
  fitFont(name, b.w-8, HF(10.5), 7); ctx.fillText(name, b.x+b.w/2, b.y+10.5);
  // portrait + recharge
  const px = b.x+4, py = b.y+17, pw = 33, ph = 31;
  ctx.globalAlpha = A0*(ok? 1 : locked? 1 : 0.62);
  hudPortrait(p, role, px, py, pw, ph, locked);
  ctx.globalAlpha = A0;
  if (cd>0){ ctx.fillStyle = 'rgba(8,6,8,0.66)'; ctx.fillRect(px, py, pw, ph*cd); }
  ctx.strokeStyle = rgbaC(cat, ok? 0.75 : 0.3); ctx.lineWidth = 1; ctx.strokeRect(px+0.5, py+0.5, pw-1, ph-1);
  // raccourci clavier (coin du portrait)
  ctx.fillStyle = 'rgba(10,8,10,0.78)'; ctx.fillRect(px, py+ph-9, 9, 9);
  ctx.fillStyle = '#cfc7b8'; ctx.font = HF(7.5); ctx.textAlign = 'center'; ctx.fillText(String(b.i+1), px+4.5, py+ph-4);
  // colonne de droite : verrou d'ère, ou coût ressource par ressource
  const cx0 = b.x+41;
  ctx.textAlign = 'left';
  if (locked){
    ctx.font = '13px Arial'; ctx.fillStyle = '#b8b0a4'; ctx.fillText('🔒', cx0+8, b.y+26);
    ctx.fillStyle = '#a39a8c'; const lk = fmt('hud_era_lock', {n:role.minEra+1});
    fitFont(lk, b.w-45, HF(9), 6.5); ctx.fillText(lk, cx0, b.y+41);
  } else {
    let yy = b.y+22;
    for (const r in cost){
      const free = r==='m' && p.trans, have = free || p[r]>=cost[r];
      ctx.font = '9px Arial'; ctx.globalAlpha = A0*(ok||!have? 1 : 0.7); ctx.fillStyle = '#fff';
      ctx.fillText(p.fac.icons[r], cx0, yy);
      ctx.font = HF(10.5); ctx.fillStyle = have? (ok? RES_COL[r] : '#b9b0a2') : '#ff6a5a';
      ctx.fillText(free? '∞' : String(cost[r]), cx0+13, yy+0.5);
      ctx.globalAlpha = A0; yy += 10;
    }
    if (full){ ctx.font = HF(8); ctx.fillStyle = '#ff6a5a'; ctx.fillText('👥 '+p.cap, cx0, b.y+46); }
  }
  // bas de carte : amélioration de classe (coût en chiffres colorés + onglet ⬆ + pastilles de niveau)
  // (en tuto : masqué tant que l'étape « amélioration » n'est pas atteinte)
  if (!locked && (!game.tut || !TUT || tutUpgAllowed())){
    const r = {x:b.x+b.w-22, y:b.y+b.h-17, w:21, h:16, i:b.i};
    HUD.upgRects.push({x:b.x+b.w-24, y:b.y+b.h-20, w:24, h:20, i:b.i});
    const upc = {f:90*(lvl+1), m:180*(lvl+1)}, can = lvl<3 && canPay(p, upc);
    ctx.fillStyle = can? 'rgba(232,216,160,0.20)' : 'rgba(255,255,255,0.05)'; rr(r.x, r.y, r.w, r.h, 3); ctx.fill();
    ctx.strokeStyle = can? '#e8d8a0' : '#4a443c'; ctx.lineWidth = 1; rr(r.x+0.5, r.y+0.5, r.w-1, r.h-1, 3); ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = HF(10); ctx.fillStyle = can? '#f0e2b0' : '#6a665e';
    ctx.fillText(lvl>=3? '★' : '⬆', r.x+r.w/2, r.y+r.h/2+0.5);
    for (let k=0;k<lvl;k++){ ctx.fillStyle = '#ffd34a'; ctx.fillRect(r.x+3+k*5.5, r.y-3.5, 4, 2.2); }   // niveaux acquis
    if (lvl<3){
      ctx.textAlign = 'left'; ctx.font = HF(8);
      let xx = b.x+5; const yy = b.y+b.h-8.5;
      for (const k2 of ['f','m']){ const have = (k2==='m' && p.trans) || p[k2]>=upc[k2];
        ctx.fillStyle = have? rgbaC(RES_COL[k2], can? 1 : 0.6) : 'rgba(255,106,90,0.75)';
        const tx = (k2==='m' && p.trans)? '∞' : String(upc[k2]); ctx.fillText(tx, xx, yy); xx += ctx.measureText(tx).width+5; }
    }
  }
  ctx.textBaseline = 'middle';
}
function drawBtn(b){
  const A0 = ctx.globalAlpha;
  const p=game.p, fac=p.fac;
  if (b.type==='hero'){ drawHeroBtn(b, p); return; }
  if (b.type==='speed'||b.type==='softpause'||b.type==='pause'){ drawCtrl(b); return; }
  if (b.type==='unit'){ drawUnitCard(b); return; }
  let label='', sub='', ok=false, col=fac.accent, prog=1, small=b.h<40, glyph='';
  if (b.type==='special'){
    if (p.lastReady && !p.lastUsed){
      label=tr('hud_last'); sub=tr('hud_last_sub'); ok=true; col='#ffd34a'; prog=1;
    } else {
      label=lSpecial(p.facKey, p.era); glyph='✸';
      const xc = specialXpCost(p);
      ok = p.specialCd<=0 && p.xp>=xc;
      sub = (p.specialCd>0? '⏳'+Math.ceil(p.specialCd)+'s ':'') + '✦'+xc+' [ESP]';
      prog = Math.min(p.specialCd>0? 1-p.specialCd/SPECIAL_CD:1, Math.min(1,p.xp/xc)); col='#e08a8a';
    }
  } else if (b.type==='evolve'){
    label=tr('hud_evolve').replace(/^⚡\s*/,''); glyph='⚡'; col='#e8d8a0';
    if (p.era<4){ ok = p.xp>=EVOLVE_XP[p.era+1]; sub='✦'+EVOLVE_XP[p.era+1]+' [E]';
      prog = Math.min(1,p.xp/EVOLVE_XP[p.era+1]); }
    else if (!p.trans){ ok=false; sub='✦'+TRANS_XP+' → '+p.fac.sym; prog=Math.min(1,p.xp/TRANS_XP); }
    else { ok=false; sub=tr('hud_trans'); prog=1; }
  } else if (b.type==='cap'){
    label=tr('hud_cap').replace(/^👥\s*/,''); glyph='👥'; col='#9dc88a';
    ok = !p.capUp && canPay(p,{m:350,w:100});
    sub = p.capUp? tr('hud_owned'):costStr(p,{m:350,w:100})+' [U]';
    prog = 1;
  } else if (b.type==='stance'){
    label=b.label;
    const active = game.sel.size? false : p.stance===b.st;
    ok = active; col = active? '#e8d8a0' : game.sel.size? '#ffd34a':'#8a867e';
  } else if (b.type==='lasso'){
    label=b.label; ok=selMode; col = selMode? '#ffd34a':'#8a867e';
  } else if (b.type==='formation'){
    label=b.label; ok=p.formation; col = p.formation? '#9dc88a':'#8a867e';
  } else if (b.type==='repairall'){
    label=tr('hud_repall').replace(/^🔧\s*/,''); glyph='🔧'; col='#9dc88a';
    const rc = repairAllCost(p);
    ok = rc.f>0 || rc.m>0;
    sub = ok? costStr(p, rc)+' [R]' : tr('hud_norep');
  } else if (b.type==='cam'){
    label=b.label; ok = b.go==='follow' && camFollow;
    col = ok? '#9dc88a':'#8a867e';
  } else if (b.type==='zoom'){
    label=b.label; ok=false; col='#a8a296';
  }
  ctx.textAlign='center'; ctx.textBaseline='middle';
  if (small){
    hudPlate(b, 5, ok, col, false);
    if (ok){ ctx.fillStyle = col; ctx.fillRect(b.x+6, b.y+b.h-3, b.w-12, 2); }                 // filet « enclenché »
    ctx.fillStyle = ok? '#fff8e6' : (b.type==='stance' && game.sel.size)? '#ffd34a' : '#b6afa2';
    const smallLbl = b.label||label;
    fitFont(smallLbl, b.w-8, HF(12), 8);
    ctx.fillText(smallLbl, b.x+b.w/2, b.y+b.h/2+0.5);
    return;
  }
  // carte d'action (pouvoir, évolution, capacité, réparation) : pictogramme + libellé + coût + jauge
  hudPlate(b, 5, ok, col, !ok);
  ctx.globalAlpha = A0*(ok? 1 : 0.55);
  if (glyph){ ctx.font = '15px Arial'; ctx.fillStyle = col; ctx.fillText(glyph, b.x+b.w/2, b.y+15); }
  ctx.fillStyle = ok? '#f4eee2' : '#a39a8c';
  fitFont(label, b.w-8, HF(glyph? 10.5 : 11.5), 7); ctx.fillText(label, b.x+b.w/2, b.y+(glyph? 31 : 20));
  ctx.fillStyle = ok? col : '#8a8378';
  fitFont(sub, b.w-8, HF(9.5), 6.5); ctx.fillText(sub, b.x+b.w/2, b.y+(glyph? 45 : 42));
  ctx.globalAlpha = A0;
  if (prog<1 || b.type==='special' || b.type==='evolve'){                                         // jauge de progression
    ctx.fillStyle = 'rgba(255,255,255,0.09)'; ctx.fillRect(b.x+6, b.y+b.h-7, b.w-12, 3);
    ctx.fillStyle = prog>=1? col : rgbaC(col, 0.7); ctx.fillRect(b.x+6, b.y+b.h-7, (b.w-12)*clamp(prog,0,1), 3);
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
    ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='11px Arial'; ctx.textAlign='center';
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
