/* ================= CLAVIER ================= */
const kdown = new Set();
window.addEventListener('keydown', e=>{
  if (keyWait){
    e.preventDefault();
    SETTINGS.keys[keyWait.k] = e.code; saveSettings();
    keyWait = null; buildKeysBox();
    return;
  }
  kdown.add(e.code);
  cheatFeed(e);                                                         // séquence secrète du mode triche (dev)
  if (e.code==='F8'){ PERF.on=!PERF.on; e.preventDefault(); return; }   // profileur perf (diagnostic)
  if (e.code==='F9' && CHEAT.unlocked){ CHEAT.open=!CHEAT.open; e.preventDefault(); return; }   // panneau de triche
  if (intro>=0){
    if (e.code==='Escape') finishIntro(); else advanceIntro();
    e.preventDefault(); return;
  }
  if (!game || game.over) return;
  const K = SETTINGS.keys, p = game.p;
  if (e.code===K.pause){ e.preventDefault();
    togglePauseAction();
    return;
  }
  if (e.code==='Space' || e.code===K.special) e.preventDefault();
  // tutoriel : Espace/Entrée valide les étapes d'info (« Continuer »)
  if (game.tut && TUT && (e.code==='Space'||e.code==='Enter') && !TUT.confirmSkip && TUT.steps[TUT.i].tap){ tutBeginAct(); return; }
  if (paused || settingsOpen) return;   // réglages ouverts (même hors pause en ligne) : pas d'action de jeu au clavier
  if (e.code===K.buy1){ tryBuy(p,0); }
  else if (e.code===K.buy2){ tryBuy(p,1); }
  else if (e.code===K.buy3){ tryBuy(p,2); }
  else if (e.code===K.buy4){ tryBuy(p,3); }
  else if (e.code===K.buy5){ tryBuy(p,4); }
  else if (e.code===K.buy6){ tryBuy(p,5); }
  else if (e.code===K.evolve){ tryEvolve(p); }
  else if (e.code===K.special){ trySpecial(p); }
  else if (e.code===K.charge){ setStance(p,'charge'); }
  else if (e.code===K.hold){ setStance(p,'hold'); }
  else if (e.code===K.retreat){ setStance(p,'retreat'); }
  else if (e.code===K.formation){ p.formation=!p.formation;
    announce(p.formation? '⚏ Formation activée':'⚏ Formation libre', '#e8d8a0'); }
  else if (e.code===K.repairall){ tryRepairAll(p); }
  else if (e.code===K.follow) camFollow=!camFollow;
  else if (e.code===K.capup){ tryCapUp(p); }
  else if (e.code===K.zoomin || e.code==='NumpadAdd') setZoom(zoom+0.12);
  else if (e.code===K.zoomout || e.code==='NumpadSubtract') setZoom(zoom-0.12);
});
window.addEventListener('keyup', e=>kdown.delete(e.code));
// caméra fluide au clavier
(function camKeys(){
  if (game && !paused && !game.over){
    const K = SETTINGS.keys;
    if (kdown.has(K.left)) { camX -= 9/zoom; camFollow=false; camClamp(); }
    if (kdown.has(K.right)){ camX += 9/zoom; camFollow=false; camClamp(); }
  }
  requestAnimationFrame(camKeys);
})();

/* ================= SOURIS & TACTILE ================= */
let dragging = false;
const ptrs = new Map();           // pointeurs actifs (pour le pincement)
let pinch = null;                 // {d0, z0, wx}
let pdown = null;                 // {sx, sy, moved, lasso}

function evXY(e){
  const r = cv.getBoundingClientRect();
  return { sx:(e.clientX-r.left)/r.width*W, sy:(e.clientY-r.top)/r.height*H };
}
function inRect(x,y,r){ return x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h; }

cv.addEventListener('contextmenu', e=>e.preventDefault());

// SURVOL (souris uniquement) : tooltip détaillé sur les boutons d'unités.
let hoverUnitBtn = -1;
cv.addEventListener('pointermove', e=>{
  if (e.pointerType==='touch'){ hoverUnitBtn=-1; return; }
  if (!game || game.over || paused || buildMenu){ hoverUnitBtn=-1; return; }
  const {sx,sy} = evXY(e); hoverUnitBtn=-1;
  for (const b of HUD.btns) if (b.type==='unit' && !btnHidden(b) && inRect(sx,sy,b)){ hoverUnitBtn=b.i; break; }
});

let _fsTried=false;
let tutDragging=null;          // glisser-déposer de la carte du tutoriel
cv.addEventListener('pointerdown', e=>{
  audioInit(); musicStart();
  if (!_fsTried){ _fsTried=true; goFullscreen(); }   // plein écran auto dès la 1re interaction (PC + Android)
  cv.setPointerCapture(e.pointerId);
  const {sx,sy} = evXY(e);
  ptrs.set(e.pointerId, {sx,sy});
  if (ptrs.size===2){             // pincement
    const [a,b] = [...ptrs.values()];
    pinch = { d0: Math.hypot(a.sx-b.sx, a.sy-b.sy), z0: zoom, wx: s2wX((a.sx+b.sx)/2) };
    pdown = null; selBox = null; tutDragging = null;
    return;
  }
  // TUTORIEL : presser la carte la SAISIT (pour la glisser) ; un simple appui sans bouger = valider
  if (game && game.tut && TUT && !TUT.confirmSkip && TUT.cardRect && inRect(sx,sy,TUT.cardRect)){
    tutDragging = { ox: sx-TUT.cardRect.x, oy: sy-TUT.cardRect.y, sx0:sx, sy0:sy, moved:false };
    pdown = null; return;
  }
  if (!game || game.over || paused || buildMenu){ pdown={sx,sy,moved:false,lasso:false}; return; }
  const lasso = (selMode || e.shiftKey) && sy>38 && sy<H-102;
  pdown = {sx, sy, moved:false, lasso};
  if (lasso) selBox = {x0:sx, y0:sy, x1:sx, y1:sy};
});

cv.addEventListener('pointermove', e=>{
  if (!ptrs.has(e.pointerId)) return;
  const {sx,sy} = evXY(e);
  const prev = ptrs.get(e.pointerId);
  ptrs.set(e.pointerId, {sx,sy});
  if (pinch && ptrs.size===2){
    const [a,b] = [...ptrs.values()];
    const d = Math.hypot(a.sx-b.sx, a.sy-b.sy);
    if (pinch.d0>0) setZoom(pinch.z0 * d/pinch.d0, pinch.wx);
    return;
  }
  if (tutDragging && TUT){
    if (Math.abs(sx-tutDragging.sx0)>4 || Math.abs(sy-tutDragging.sy0)>4) tutDragging.moved=true;
    if (tutDragging.moved){ const cr=TUT.cardRect||{w:320,h:160};
      TUT.cardPos = { x: clamp(sx-tutDragging.ox, 8, W-cr.w-8), y: clamp(sy-tutDragging.oy, 8, H-cr.h-8) }; }
    return;
  }
  if (!pdown) return;
  const dx = sx-prev.sx;
  if (Math.abs(sx-pdown.sx)>6 || Math.abs(sy-pdown.sy)>6) pdown.moved = true;
  if (pdown.lasso){ selBox.x1 = sx; selBox.y1 = sy; return; }
  // glisser = caméra (zone monde) — autorisé aussi en PAUSE (sauf menu réglages) pour observer la carte
  if (game && !game.over && !buildMenu && !settingsOpen && pdown.moved && pdown.sy>38 && pdown.sy<H-102){
    dragging = true; camFollow = false;
    camX -= dx/zoom; camClamp();
  }
});

function endPointer(e){
  if (tutDragging){
    const moved = tutDragging.moved; tutDragging = null;
    ptrs.delete(e.pointerId); if (ptrs.size<2) pinch=null; pdown=null;
    if (!moved){ const {sx,sy} = evXY(e); handleTap(sx,sy,e.shiftKey); }   // appui sans glisser = valider la carte
    return;
  }
  const was = ptrs.has(e.pointerId);
  ptrs.delete(e.pointerId);
  if (ptrs.size<2) pinch = null;
  if (!was || !pdown) { dragging = ptrs.size>0 && dragging; return; }
  const {sx,sy} = evXY(e);
  const tap = !pdown.moved;
  if (intro>=0){
    pdown = null; dragging = false;
    if (tap){ if (inRect(sx,sy,INTRO_SKIP)) finishIntro(); else advanceIntro(); }
    return;
  }
  const lasso = pdown.lasso;
  pdown = null; dragging = false;
  // VRAI glisser en mode lasso = sélection rectangle. En revanche un simple APPUI (sans glisser)
  // doit rester un tap normal : on peut ainsi construire/sélectionner même en mode lasso actif
  // (corrige le blocage des socles muraille/tourelle quand ⬚ LASSO est enclenché juste avant).
  if (lasso && !tap){ finishLasso(); return; }
  selBox = null;
  if (tap) handleTap(sx,sy,e.shiftKey);
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', e=>{ ptrs.delete(e.pointerId); if(ptrs.size<2) pinch=null; pdown=null; selBox=null; dragging=false; tutDragging=null; });

function finishLasso(){
  if (!selBox){ return; }
  const x0=Math.min(selBox.x0,selBox.x1), x1=Math.max(selBox.x0,selBox.x1);
  const y0=Math.min(selBox.y0,selBox.y1), y1=Math.max(selBox.y0,selBox.y1);
  selBox = null;
  if (!game || x1-x0<8) return;
  game.sel.clear();
  for (const u of game.p.units){
    const ux = w2sX(u.x), uy = w2sY(gY(u.x)-22);
    if (ux>=x0 && ux<=x1 && uy>=y0-26 && uy<=y1+26) game.sel.add(u);
  }
  if (game.sel.size){ sfx('sel'); announce('✓ '+game.sel.size+' unité(s) sélectionnée(s)', '#ffd34a'); }
}

function handleTap(sx, sy, shift){
  if (!game) return;
  if (game.over) return;
  // MODE TRICHE (dev) : le panneau capte les clics en priorité tant qu'il est ouvert
  if (CHEAT.unlocked && CHEAT.open && CHEAT.rects){
    for (const r of CHEAT.rects) if (inRect(sx,sy,r)){ cheatAction(r.k); return; }
  }
  // proposition de vitesse reçue (en ligne) : modal Oui/Non prioritaire
  if (speedVote){
    if (speedVote.rects) for (const r of speedVote.rects) if (inRect(sx,sy,r)){ castSpeedVote(r.ok); sfx('sel'); return; }
    return;
  }
  // sélecteur de vitesse ouvert : choisir une vitesse, ou taper à côté pour fermer
  if (speedPanel){
    if (speedPanel.rects) for (const r of speedPanel.rects) if (inRect(sx,sy,r)){ pickSpeed(r.spd); sfx('sel'); return; }
    speedPanel=null; return;
  }
  // tutoriel : boutons de la carte (Continuer / Passer / confirmation). Renvoie true si le clic
  // est consommé ; sinon il atteint le jeu normalement (construire, sélectionner…).
  if (game.tut && TUT && tutHandleTap(sx,sy)) return;
  // RÉGLAGES ouverts : prioritaires et indépendants de la pause (en ligne, ⚙ ne fige plus le jeu)
  if (settingsOpen){
    if (pauseRects) for (const r of pauseRects) if (inRect(sx,sy,r)){
      if (r.key==='resume'){ settingsOpen=false; if (!isOnline()) paused=false; }  // en ligne : ferme juste les réglages, la pause négociée (⏸) reste gérée à part
      else if (r.key==='music'){ SETTINGS.music=!SETTINGS.music; saveSettings(); refreshOpts(); }
      else if (r.key==='sfx'){ SETTINGS.sfx=!SETTINGS.sfx; saveSettings(); refreshOpts(); }
      else if (r.key==='vol' && r.slider){
        SETTINGS.vol = clamp(Math.round(((sx-r.slider.x)/r.slider.w)*20)/20, 0, 1);
        saveSettings(); refreshOpts();
      }
      else if (r.key==='shake'){ SETTINGS.shake=!SETTINGS.shake; saveSettings(); refreshOpts(); }
      else if (r.key==='quality'){ cycleQuality(); }
      else if (r.key==='follow') camFollow=!camFollow;
      else if (r.key==='quit'){
        netDisconnect();
        paused=false; settingsOpen=false; netPause=null; game=null; buildMenu=null; selMode=false; selBox=null;
        $('menu').style.display='flex';
      }
      sfx('sel'); return;
    }
    return;
  }
  // pause simple / négociée (sans réglages ouverts)
  if (paused){
    // négociation en ligne côté adversaire : vote Oui/Non puis rien d'autre n'est cliquable
    if (netPause && netPause.active && !netPause.byMe){
      if (onlineVoteRects) for (const r of onlineVoteRects) if (inRect(sx,sy,r)){ castPauseVote(r.ok); sfx('sel'); return; }
      return;
    }
    // bouton « Reprendre » de la pause simple
    if (pauseRects) for (const r of pauseRects) if (inRect(sx,sy,r)){
      if (r.key==='resume'){
        if (isOnline()){ if (netPause && netPause.byMe) endOnlinePause(true); }
        else paused=false;
      }
      sfx('sel'); return;
    }
    return;
  }
  const p = game.p;
  // menu de construction ouvert
  if (buildMenu){
    let hit = null;
    if (buildMenu.rects) for (const r of buildMenu.rects) if (inRect(sx,sy,r)) hit = r.key;
    const slot = buildMenu.slot, base = buildMenu.base;
    buildMenu = null;
    if (!hit) return;
    if (base){
      if (hit==='repairBase') tryRepairBase(p);
      else if (hit==='repairAll') tryRepairAll(p);
      else if (hit==='fortify') tryFortify(p);
      else if (hit==='autorep') tryAutoRepair(p);
      else if (hit==='bgar_ranged') dispatchBaseGarrison(p,'ranged');
      else if (hit==='bgar_siege') dispatchBaseGarrison(p,'siege');
      else if (hit==='bungar'){
        if (game.net==='guest'){ guestCmd({c:'bungar'}); }
        else {
          for (const g of p.gar){ g.x = p.x + 40 + Math.random()*30; p.units.push(g); }
          const n = p.gar.length; p.gar = [];
          if (n){ announce('🛡 '+n+' garde(s) renvoyée(s) au front', '#e8d8a0'); sfx('build'); }
        }
      }
      return;
    }
    if (hit==='repair') tryRepair(p, slot);
    else if (hit==='upgrade') tryUpgBuild(p, slot);
    else if (hit==='garrison') tryGarrison(p, slot);
    else if (hit==='gar_recruit') dispatchGarrison(p, slot, 'ranged');
    else if (hit.startsWith('gar_')) dispatchGarrison(p, slot, hit.slice(4));
    else if (hit==='ungarrison'){
      if (game.net==='guest'){ guestCmd({c:'ungar', ref:slotRef(p,slot)}); }
      else if (slot.b && slot.b.gar.length){
        for (const g of slot.b.gar){ g.x = slot.x + (Math.random()*30-15); p.units.push(g); }
        const n = slot.b.gar.length; slot.b.gar = [];
        announce('🚪 '+n+' troupe(s) sortie(s)', '#e8d8a0'); sfx('build');
      }
    }
    else if (hit==='demolish'){
      if (game.net==='guest') guestCmd({c:'demo', ref:slotRef(p,slot)});
      else demolish(slot);
      sfx('boom');
    }
    else tryBuild(p, slot, hit);
    return;
  }
  // bannière de sélection : ✖
  if (HUD.selRect && inRect(sx,sy,HUD.selRect)){ game.sel.clear(); sfx('sel'); return; }
  // ⬆ d'amélioration de classe (annonce le coût si on ne peut pas payer)
  for (const r of HUD.upgRects) if (inRect(sx,sy,r)){
    if (!tryUpgRole(p, r.i)){
      const lvl = p.upg[ROLES[r.i].key]||0;
      if (lvl<3) announce('⬆ Coût : '+costStr(p,{f:90*(lvl+1), m:180*(lvl+1)}), '#d8a06a');
    }
    return;
  }
  // boutons HUD
  for (const b of HUD.btns) if (!btnHidden(b) && inRect(sx,sy,b)){
    if (b.type==='unit'){ tryBuy(p, b.i); }
    else if (b.type==='hero'){ if (!heroBtnReady(p)) continue; tryHero(p); }
    else if (b.type==='special'){ trySpecial(p); }
    else if (b.type==='evolve'){ tryEvolve(p); }
    else if (b.type==='cap'){ tryCapUp(p); }
    else if (b.type==='stance'){ setStance(p, b.st); }
    else if (b.type==='lasso'){ selMode=!selMode; sfx('sel'); }
    else if (b.type==='formation'){
      if (game.net==='guest'){ guestCmd({c:'form'}); sfx('sel'); return; }
      p.formation=!p.formation; sfx('sel');
      announce(p.formation?
        (p.facKey==='HUM'? '⚏ Phalange ouvrière : corps à corps devant, tireurs derrière, artillerie au fond'
                         : '⚏ Essaim calculé : lames en première vague, optimiseurs au centre, canons au fond')
        : '⚏ Formation libre', '#e8d8a0');
    }
    else if (b.type==='repairall'){ tryRepairAll(p); }
    else if (b.type==='cam'){
      if (b.go==='base'){ camFollow=false; camX = clamp(p.x - VW()*0.25, 0, WORLD-VW()); }
      else if (b.go==='front'){
        camFollow=false;
        let front = p.units.length? Math.max(...p.units.map(u=>u.x)) : p.x+200;
        camX = clamp(front - VW()*0.5, 0, WORLD-VW());
      }
      else camFollow=true;
      sfx('sel');
    }
    else if (b.type==='zoom') setZoom(zoom + b.d*0.15, s2wX(W/2));
    else if (b.type==='softpause') toggleSoftPause();
    else if (b.type==='pause') togglePauseAction();
    else if (b.type==='speed') openSpeedPanel();
    return;
  }
  if (sy<=38) return; // bandeau de ressources
  // ---- monde ----
  const wx = s2wX(sx), wy = s2wY(sy);
  // priorité de clic : unité touchée PRÉCISÉMENT (10 px) > structures > unité proche (22 px)
  const pickUnit = (radius)=>{
    let b2=null, bd2=radius;
    for (const u of p.units){
      const gy = gY(u.x) - (u.fly? u.flyH : 0);
      const d = Math.abs(u.x-wx);
      if (d<bd2 && wy>gy-56 && wy<gy+12){ bd2=d; b2=u; }
    }
    return b2;
  };
  let best = pickUnit(10);
  if (!best){
    // base du joueur
    const gyb = gY(p.x);
    if (Math.abs(wx-p.x)<58 && wy>gyb-135 && wy<gyb+14){ buildMenu = {base:true, rects:[]}; sfx('sel'); return; }
    // socles & bâtiments (les nôtres + neutres non-ennemis)
    const spots = p.slots.concat(game.neut.filter(n=>n.owner!==game.e));
    for (const s of spots){
      const gy = gY(s.x);
      if (Math.abs(wx-s.x)<32 && wy>gy-80 && wy<gy+16){
        if (s.b && s.owner!==p) break;     // bâtiment neutre capturé par l'ennemi : rien
        buildMenu = {slot:s, rects:[]}; sfx('sel'); return;
      }
    }
    best = pickUnit(22);                   // pas de structure visée : rattrapage unité large
  }
  if (best){
    const groupSel = p.units.filter(u=>u.role===best.role);
    const sameGroup = game.sel.size===groupSel.length && groupSel.every(u=>game.sel.has(u));
    game.sel.clear();
    if (shift || sameGroup) game.sel.add(best);
    else for (const u of groupSel) game.sel.add(u);
    sfx('sel');
    return;
  }
  // sol : désélection
  if (game.sel.size){ game.sel.clear(); sfx('sel'); }
}

/* molette : caméra · Ctrl+molette : zoom */
cv.addEventListener('wheel', e=>{
  if (!game || paused || game.over) return;
  e.preventDefault();
  const {sx} = evXY(e);
  if (e.ctrlKey) setZoom(zoom - e.deltaY*0.0016, s2wX(sx));
  else { camFollow=false; camX += (e.deltaY+e.deltaX)*0.8/zoom; camClamp(); }
}, {passive:false});

/* PREMIER LANCEMENT : propose automatiquement le tutoriel (relançable depuis l'onglet TUTORIEL) */
(function maybeFirstLaunchTutorial(){
  let seen = '1';
  try { seen = localStorage.getItem('agi_tutoSeen'); } catch(e){}
  if (!seen) startTutorial();
})();
