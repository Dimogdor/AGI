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
  const w=tw+20, h=22+lines.length*15, x=clamp(btn.x+btn.w/2-w/2, 4, W-w-4), y=btn.y-h-8;
  ctx.fillStyle='rgba(14,11,10,0.96)'; rr(x,y,w,h,6); ctx.fill();
  ctx.strokeStyle=p.fac.accent; ctx.lineWidth=1; rr(x,y,w,h,6); ctx.stroke();
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.fillStyle=p.fac.accent; ctx.font='700 12px Arial';
  ctx.fillText((ROLE_ICON[r.key]||'')+' '+name, x+10, y+16);
  ctx.fillStyle='#cdc4b6'; ctx.font='11px Arial';
  let yy=y+33; for (const l of lines){ ctx.fillText(l, x+10, yy); yy+=15; }
  ctx.textAlign='center';
}
function drawHUD(){
  const p = game.p, fac = p.fac;
  const rates = calcRates(p);
  ctx.textBaseline='middle';
  // ---- bandeau haut (h=38) ----
  ctx.fillStyle='rgba(16,13,12,0.88)'; ctx.fillRect(0,0,W,38);
  ctx.textAlign='left';
  ctx.font='700 14px Arial';
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
  ctx.textAlign='center'; ctx.font='700 14px Arial';
  ctx.fillStyle = p.trans? '#ffe9a0' : fac.accent;
  ctx.fillText(p.trans? lTransName(p.facKey) : lEra(p.facKey,p.era), W/2, 11);
  ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(W/2-80, 26, 160, 4);
  ctx.fillStyle = lerpCol([120,200,120],[200,60,40],game.dev);
  ctx.fillRect(W/2-80, 26, 160*game.dev, 4);
  ctx.font='8.5px Arial'; ctx.fillStyle='rgba(255,255,255,0.45)';
  ctx.fillText(tr('world_health'), W/2, 20);
  // droite : effectif + ennemi (calés À GAUCHE du cluster de contrôles → plus de chevauchement)
  const RX = W-112;
  ctx.textAlign='right'; ctx.font='700 13px Arial';
  ctx.fillStyle = unitTotal(p)>=p.cap? '#ff5a4a':'#d8d0c4';
  const qn = (p.queue && p.queue.length) ? p.queue.length : (p.queueLen||0);
  ctx.fillText('👥 '+unitTotal(p)+'/'+p.cap+(qn? ' ⏳'+qn:''), RX, 13);
  // ligne 2 : ennemi (couleur faction) puis difficulté (gris), tous deux calés à droite
  ctx.font='10px Arial'; ctx.fillStyle='#988e80';
  const diffTxt = DIFFS[game.diff].name;
  ctx.fillText(diffTxt, RX, 29);
  const dw = ctx.measureText(diffTxt).width;
  ctx.font='700 11px Arial'; ctx.fillStyle=game.e.fac.accent;
  ctx.fillText(game.e.fac.name+' '+game.e.fac.eras[game.e.era].tag+(game.e.trans? ' '+game.e.fac.sym:''), RX-dw-10, 29);
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
    ctx.save(); ctx.shadowColor=leadCol; ctx.shadowBlur=5;
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
    ctx.fillStyle=p.trans?'#ffe9a0':fac.accent; ctx.font='700 8px Arial'; ctx.textAlign='center';
    ctx.fillText(p.era<4?('E'+(p.era+1)):'★', rx, ry+1);
  }
  // ---- chrono de partie (gelé en pause, accéléré/ralenti avec la vitesse de jeu) ----
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.font='700 12px Arial'; ctx.fillStyle='#cdbf9a';
  ctx.fillText('⏱ '+fmtTime(game.t)+((game.speed&&game.speed!==1)? '  ×'+game.speed : ''), mx+mw+10, my+mh/2);
  drawQueue();
  // ---- météo en cours ----
  if (game.weather){
    ctx.font='700 10px Arial'; ctx.textAlign='center';
    ctx.fillStyle = game.weather==='strike'? '#ff9d45':'#5ad0ff';
    ctx.fillText(game.weather==='strike'? tr('ev_strike_short')
                                         : tr('ev_patch_short'), W/2, 66);
  }
  // ---- annonce (y=100) ----
  if (game.msgT>0 && game.msg){
    ctx.globalAlpha = Math.min(1, game.msgT);
    ctx.font='800 21px Georgia'; ctx.textAlign='center';
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillText(game.msg.txt, W/2+2, 102);
    ctx.fillStyle=game.msg.color; ctx.fillText(game.msg.txt, W/2, 100);
    ctx.globalAlpha=1;
  }
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
    ctx.font='700 12px Arial';
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
  ctx.shadowColor = col; ctx.shadowBlur = 10+10*pulse;
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
function drawBtn(b){
  const p=game.p, fac=p.fac;
  if (b.type==='hero'){ drawHeroBtn(b, p); return; }
  if (b.type==='speed'||b.type==='softpause'||b.type==='pause'){ drawCtrl(b); return; }
  let label='', sub='', ok=false, col=fac.accent, prog=1, small=b.h<40;
  if (b.type==='unit'){
    const role=ROLES[b.i];
    if (role.minEra && p.era<role.minEra){ label='🔒 '+lUnit(p.facKey, role.key, role.minEra); sub=fmt('hud_era_lock',{n:role.minEra+1}); ok=false; }
    else {
      const cost=unitCost(p,b.i);
      label=lUnit(p.facKey, role.key, p.era);
      const lvl = p.upg[role.key]||0;
      sub=costStr(p,cost)+' ['+(b.i+1)+']'+(lvl?' ★'+lvl:'');
      ok = canPay(p,cost) && p.cd[b.i]<=0 && unitTotal(p)<p.cap;
      prog = p.cd[b.i]>0? 1-p.cd[b.i]/(0.5+b.i*0.45):1;
    }
  } else if (b.type==='special'){
    if (p.lastReady && !p.lastUsed){
      label=tr('hud_last'); sub=tr('hud_last_sub'); ok=true; col='#ffd34a'; prog=1;
    } else {
      label='✸ '+lSpecial(p.facKey, p.era);
      const xc = specialXpCost(p);
      ok = p.specialCd<=0 && p.xp>=xc;
      sub = (p.specialCd>0? '⏳'+Math.ceil(p.specialCd)+'s ':'') + '✦'+xc+' [ESP]';
      prog = Math.min(p.specialCd>0? 1-p.specialCd/SPECIAL_CD:1, Math.min(1,p.xp/xc)); col='#c88';
    }
  } else if (b.type==='evolve'){
    label=tr('hud_evolve'); col='#e8d8a0';
    if (p.era<4){ ok = p.xp>=EVOLVE_XP[p.era+1]; sub='✦'+EVOLVE_XP[p.era+1]+' [E]';
      prog = Math.min(1,p.xp/EVOLVE_XP[p.era+1]); }
    else if (!p.trans){ ok=false; sub='✦'+TRANS_XP+' → '+p.fac.sym; prog=Math.min(1,p.xp/TRANS_XP); }
    else { ok=false; sub=tr('hud_trans'); prog=1; }
  } else if (b.type==='cap'){
    label=tr('hud_cap'); col='#9dc88a';
    ok = !p.capUp && canPay(p,{m:350,w:100});
    sub = p.capUp? tr('hud_owned'):costStr(p,{m:350,w:100})+' [U]';
    prog = p.capUp?1:0.5;
  } else if (b.type==='stance'){
    label=b.label;
    const active = game.sel.size? false : p.stance===b.st;
    ok = active; col = active? '#e8d8a0' : game.sel.size? '#ffd34a':'#8a867e';
  } else if (b.type==='lasso'){
    label=b.label; ok=selMode; col = selMode? '#ffd34a':'#8a867e';
  } else if (b.type==='formation'){
    label=b.label; ok=p.formation; col = p.formation? '#9dc88a':'#8a867e';
  } else if (b.type==='repairall'){
    label=tr('hud_repall'); col='#9dc88a';
    const rc = repairAllCost(p);
    ok = rc.f>0 || rc.m>0;
    sub = ok? costStr(p, rc)+' [R]' : tr('hud_norep');
  } else if (b.type==='cam'){
    label=b.label; ok = b.go==='follow' && camFollow;
    col = ok? '#9dc88a':'#8a867e';
  } else if (b.type==='zoom'){
    label=b.label; ok=true; col='#8a867e';
  }
  ctx.globalAlpha = small? 0.96 : ok?1:0.5;
  const bg=ctx.createLinearGradient(b.x,b.y,b.x,b.y+b.h); bg.addColorStop(0,'rgba(36,30,34,0.95)'); bg.addColorStop(1,'rgba(15,12,16,0.95)');
  ctx.fillStyle=bg; rr(b.x,b.y,b.w,b.h,7); ctx.fill();
  if (!small && prog<1){ ctx.fillStyle=rgbaC(col,0.22); ctx.save(); rr(b.x,b.y,b.w,b.h,7); ctx.clip();
    ctx.fillRect(b.x,b.y,b.w*prog,b.h); ctx.restore(); }
  if (ok && !small){ ctx.save(); ctx.shadowColor=col; ctx.shadowBlur=8; ctx.strokeStyle=rgbaC(col,0.95); ctx.lineWidth=2; rr(b.x,b.y,b.w,b.h,7); ctx.stroke(); ctx.restore(); }
  else { ctx.strokeStyle=ok?col:rgbaC(col,0.55); ctx.lineWidth=ok?1.8:1; rr(b.x,b.y,b.w,b.h,7); ctx.stroke(); }
  ctx.textAlign='center';
  if (small){
    ctx.fillStyle = col;
    const smallLbl = b.label||label;
    fitFont(smallLbl, b.w-8, '700 12px Arial', 8);
    ctx.fillText(smallLbl, b.x+b.w/2, b.y+b.h/2+1);
  } else {
    ctx.font='700 11px Arial'; ctx.fillStyle = ok?'#fff':'#9a9085';
    ctx.fillText(label, b.x+b.w/2, b.y+16, b.w-8);
    ctx.font='600 10px Arial'; ctx.fillStyle = ok? col:'#6a665e';
    ctx.fillText(sub, b.x+b.w/2, b.y+42, b.w-8);
  }
  ctx.globalAlpha=1;
  // étiquette de catégorie (regroupe les unités par vocation)
  if (b.type==='unit'){
    const CAT = [[tr('cat_melee'),'#ff7a5a'],[tr('cat_melee'),'#ff7a5a'],[tr('cat_range'),'#ffd34a'],
                 [tr('cat_range'),'#ffd34a'],[tr('cat_air'),'#5ad0ff'],[tr('cat_support'),'#6dff8a']][b.i];
    ctx.fillStyle = CAT[1];
    ctx.fillRect(b.x+4, b.y+2, b.w-8, 2);
    ctx.textAlign='center';
    ctx.globalAlpha = 0.85;
    fitFont(CAT[0], b.w-8, '600 6.5px Arial', 5.5);
    ctx.fillText(CAT[0], b.x+b.w/2, b.y+8);
    ctx.globalAlpha = 1;
  }
  // onglet ⬆ d'amélioration de classe sur les boutons d'unités
  // (en tuto : masqué tant que l'étape « amélioration » n'est pas atteinte)
  if (b.type==='unit' && (!game.tut || !TUT || tutUpgAllowed())){
    const role=ROLES[b.i];
    if (!(role.minEra && p.era<role.minEra)){
      const lvl = p.upg[role.key]||0;
      const r = {x:b.x+b.w-22, y:b.y+b.h-18, w:22, h:18, i:b.i};
      HUD.upgRects.push(r);
      const upc = {f:90*(lvl+1), m:180*(lvl+1)};
      const can = lvl<3 && canPay(p,upc);
      ctx.fillStyle = can? '#3a2e14':'#221d18'; rr(r.x,r.y,r.w,r.h,4); ctx.fill();
      ctx.strokeStyle = can? '#e8d8a0':'#4a443c'; ctx.lineWidth=1; rr(r.x,r.y,r.w,r.h,4); ctx.stroke();
      ctx.font='700 11px Arial'; ctx.textAlign='center';
      ctx.fillStyle = can? '#e8d8a0':'#6a665e';
      ctx.fillText(lvl>=3?'★':'⬆', r.x+r.w/2, r.y+r.h/2+1);
      // coût d'amélioration affiché sous le bouton (fini le flou)
      if (lvl<3){
        ctx.font='600 8px Arial';
        ctx.fillStyle = can? '#e8d8a0':'#7a7066';
        ctx.fillText('⬆ '+costStr(p,upc), b.x+b.w/2-10, b.y+b.h-8, b.w-26);
      }
    }
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
  ctx.fillStyle='rgba(16,13,12,0.95)'; rr(bx,by,bw,bh,8); ctx.fill();
  ctx.strokeStyle=p.fac.accent; ctx.lineWidth=1.6; rr(bx,by,bw,bh,8); ctx.stroke();
  ctx.textAlign='left';
  const inTut = game.tut && TUT && !buildMenu.base && !slot.b;   // surbrillance/grisé : uniquement les constructions sur socle vide
  for (let i=0;i<opts.length;i++){
    const o=opts[i], y=by+8+i*34;
    const free = !Object.keys(o.cost).length;
    const ok = free || canPay(p,o.cost);
    const cur = inTut && tutBuildCurrent(o.key);     // construction demandée à cette étape
    const past = inTut && !cur;                       // déjà enseignée → grisée
    buildMenu.rects.push({x:bx+4,y,w:bw-8,h:30,key:o.key});
    ctx.globalAlpha = past? 0.4 : (ok?1:0.45);
    ctx.fillStyle = cur? rgbaC(p.fac.accent,0.18) : 'rgba(255,255,255,0.07)'; rr(bx+4,y,bw-8,30,5); ctx.fill();
    if (cur){ ctx.save(); ctx.strokeStyle=p.fac.accent; ctx.lineWidth=2; ctx.shadowColor=p.fac.accent; ctx.shadowBlur=8;
      rr(bx+4,y,bw-8,30,5); ctx.stroke(); ctx.restore(); }
    ctx.fillStyle = cur? '#fff' : '#e8e0d2';
    fitFont(o.label, bw-20, '700 11.5px Arial', 8.5);
    ctx.fillText(o.label, bx+12, y+10);
    ctx.fillStyle='#e8d8a0';
    const costTxt = free?'—':costStr(p,o.cost);
    fitFont(costTxt, bw-20, '600 10px Arial', 7.5);
    ctx.fillText(costTxt, bx+12, y+23);
    // info de production affichée AVANT la construction (chaque ferme produit X de sa ressource)
    if (o.prod){
      ctx.textAlign='right'; ctx.fillStyle='#9dd88a';
      fitFont(o.prod, bw*0.4, '600 10px Arial', 7.5);
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
  const bw=240, bh=78, bx=W/2-bw/2, by=H/2-bh/2;
  ctx.fillStyle='rgba(16,16,14,0.9)'; rr(bx,by,bw,bh,8); ctx.fill();
  ctx.strokeStyle='#7dd84a'; ctx.lineWidth=1.4; rr(bx,by,bw,bh,8); ctx.stroke();
  ctx.textAlign='center'; ctx.fillStyle='#e8e0d2';
  const softTitle = '⏸  '+t('p_title');
  fitFont(softTitle, bw-24, '800 22px Arial', 14);
  ctx.fillText(softTitle, W/2, by+26);
  const rw=bw-44, rh=26, rx=bx+22, ry=by+40;
  ctx.fillStyle='rgba(125,216,74,0.14)'; rr(rx,ry,rw,rh,5); ctx.fill();
  ctx.strokeStyle='#7dd84a'; ctx.lineWidth=1.2; rr(rx,ry,rw,rh,5); ctx.stroke();
  ctx.fillStyle='#bfe6b0';
  fitFont(t('p_resume'), rw-12, '700 14px Arial', 10);
  ctx.fillText(t('p_resume'), W/2, ry+rh/2+1);
  pauseRects = [{x:rx,y:ry,w:rw,h:rh,key:'resume'}];
}
const QUAL_KEY = {low:'qual_low', medium:'qual_med', high:'qual_high', ultra:'qual_ultra'};
function qualityName(){ return tr(QUAL_KEY[SETTINGS.quality]||'qual_med'); }
function cycleQuality(){ const i=QUALITIES.indexOf(SETTINGS.quality); SETTINGS.quality=QUALITIES[(i+1)%QUALITIES.length]; fpsWarned=false; saveSettings(); }
// PAUSE COMPLÈTE (⚙ Réglages) — carte arrondie façon menu v2 (dégradé + liseré doré),
// regroupée par section (Audio / Affichage / Partie) pour une lecture logique, avec un
// bouton Reprendre mis en avant et Quitter clairement isolé en rouge.
function drawPause(){
  ctx.fillStyle='rgba(10,8,7,0.78)'; ctx.fillRect(0,0,W,H);
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
  const acc='#d8483a';
  const items = [
    {key:'h1', head:tr('opts_h_audio')},
    {key:'music',  label:t('p_music')+' : '+(SETTINGS.music?t('on'):t('off'))},
    {key:'sfx',    label:t('p_sfx')+' : '+(SETTINGS.sfx?t('on'):t('off'))},
    {key:'vol',    label:''},                       // slider de volume
    {key:'h2', head:tr('opts_h_display')},
    {key:'lang',   label:t('set_lang')+' : '+((typeof LANG_NATIVE!=='undefined'&&LANG_NATIVE[SETTINGS.lang])||SETTINGS.lang.toUpperCase())},
    {key:'quality',label:tr('set_quality')+' : '+qualityName()},
    {key:'shake',  label:t('p_shake')+' : '+(SETTINGS.shake?t('on'):t('off'))},
    {key:'follow', label:t('p_follow')+' : '+(camFollow?t('yes'):t('no'))},
    {key:'quit',   label:t('p_quit')},
  ];
  // GÉOMÉTRIE : bh est dérivé des MÊMES constantes que les offsets Y du dessin
  // (TITLE_H/RESUME_H/GAP0), au lieu d'une constante devinée séparément — c'est cet
  // écart qui faisait sortir « Abandonner la partie » (dernier item) du cadre du panneau.
  const TITLE_H=48, RESUME_H=34, GAP0=16, BOTTOM_PAD=14;
  const ih=36, headH=24, gap=6;
  let contentH=0; for (const it of items) contentH += (it.head!=null? headH : ih)+gap;
  const bh = TITLE_H + RESUME_H + GAP0 + contentH + BOTTOM_PAD;
  const by=clamp(H/2-bh/2, 8, H-bh-8);
  ctx.save(); ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=22; ctx.shadowOffsetY=6;
  const pg=ctx.createLinearGradient(bx,by,bx,by+bh); pg.addColorStop(0,'rgba(26,18,16,0.95)'); pg.addColorStop(1,'rgba(13,9,8,0.95)');
  ctx.fillStyle=pg; rr(bx,by,bw,bh,14); ctx.fill(); ctx.restore();
  ctx.strokeStyle=rgbaC(acc,0.7); ctx.lineWidth=1.6; rr(bx,by,bw,bh,14); ctx.stroke();
  ctx.textAlign='center'; ctx.fillStyle='#e8e0d2';
  const pauseTitle = '⚙ '+t('p_title');
  fitFont(pauseTitle, bw-30, '700 23px Arial', 15);
  ctx.fillText(pauseTitle, W/2, by+34);
  // bouton REPRENDRE mis en avant, juste sous le titre
  const rw0=bw-48, rh0=RESUME_H, rx0=bx+24, ry0=by+TITLE_H;
  ctx.save(); ctx.fillStyle=rgbaC('#7dd84a',0.16); rr(rx0,ry0,rw0,rh0,9); ctx.fill();
  ctx.strokeStyle='#7dd84a'; ctx.lineWidth=1.6; ctx.shadowColor='#7dd84a'; ctx.shadowBlur=8;
  rr(rx0,ry0,rw0,rh0,9); ctx.stroke(); ctx.restore();
  ctx.fillStyle='#bfe6b0';
  fitFont(t('p_resume'), rw0-20, '700 15px Arial', 11);
  ctx.fillText(t('p_resume'), W/2, ry0+rh0/2+5);
  pauseRects = [{x:rx0,y:ry0,w:rw0,h:rh0,key:'resume'}];
  let y = ry0+rh0+GAP0;
  for (const it of items){
    if (it.head!=null){
      ctx.textAlign='left'; ctx.fillStyle='#e8a06a';
      fitFont(it.head, bw-44, '700 10.5px Arial', 8);
      ctx.fillText(it.head, bx+22, y+headH*0.68);
      y += headH+gap; continue;
    }
    pauseRects.push({x:bx+14,y,w:bw-28,h:ih-6,key:it.key});
    ctx.fillStyle='rgba(255,255,255,0.045)'; rr(bx+14,y,bw-28,ih-6,7); ctx.fill();
    if (it.key==='quit'){ ctx.strokeStyle='rgba(200,120,110,0.4)'; ctx.lineWidth=1; rr(bx+14,y,bw-28,ih-6,7); ctx.stroke(); }
    ctx.textAlign='center';
    if (it.key==='vol'){
      // slider : cliquer/glisser n'importe où sur la barre règle le volume
      const rx=bx+58, rw2=bw-166, ry=y+(ih-6)/2;
      ctx.fillStyle='#b8b0a4'; ctx.textAlign='left';
      fitFont(t('set_vol'), 58, '13px Arial', 8.5);
      ctx.fillText(t('set_vol'), bx+24, ry+4);
      ctx.textAlign='center';
      ctx.fillStyle='#3a2e28'; rr(rx+28, ry-3, rw2, 6, 3); ctx.fill();
      ctx.fillStyle=acc; rr(rx+28, ry-3, rw2*SETTINGS.vol, 6, 3); ctx.fill();
      ctx.fillStyle='#e8e0d2'; ctx.beginPath(); ctx.arc(rx+28+rw2*SETTINGS.vol, ry, 6, 0, 6.28); ctx.fill();
      ctx.fillStyle='#b8b0a4';
      fitFont(Math.round(SETTINGS.vol*100)+'%', 40, '12px Arial', 9);
      ctx.fillText(Math.round(SETTINGS.vol*100)+'%', bx+bw-30, ry+4);
      pauseRects[pauseRects.length-1].slider = {x:rx+28, w:rw2};
      y += ih+gap; continue;
    }
    ctx.fillStyle = it.key==='quit'? '#e0a09a':'#d8d0c4';
    fitFont(it.label, bw-44, '13px Arial', 9);
    ctx.fillText(it.label, W/2, y+(ih-6)/2+4);
    y += ih+gap;
  }
}
