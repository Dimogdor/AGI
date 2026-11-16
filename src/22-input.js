/* ================= CLAVIER ================= */
const kdown = new Set();
// attribution d'une touche (menu PARAMÈTRES) : Échap annule (sauf pour l'action « menu ⚙ »
// elle-même), F8/F9 sont réservées, et une touche déjà utilisée par une autre action est
// ÉCHANGÉE — avant, deux actions pouvaient partager une touche et la seconde ne marchait plus.
function assignKey(k, code){
  if (RESERVED_KEYS[code]) return false;
  const prev = SETTINGS.keys[k];
  for (const j in SETTINGS.keys) if (j!==k && SETTINGS.keys[j]===code) SETTINGS.keys[j] = prev;
  SETTINGS.keys[k] = code; saveSettings(); return true;
}
window.addEventListener('keydown', e=>{
  if (keyWait && $('menu').style.display==='none') keyWait = null;   // attente oubliée en lançant une partie
  if (keyWait && e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)){ keyWait = null; buildKeysBox(); }
  if (keyWait){
    e.preventDefault();
    if (!(e.code==='Escape' && keyWait.k!=='pause')) assignKey(keyWait.k, e.code);
    keyWait = null; buildKeysBox();
    return;
  }
  kdown.add(e.code);
  cheatFeed(e);                                                         // séquence secrète du mode triche (dev)
  if (e.code==='F8'){ PERF.on=!PERF.on; e.preventDefault(); return; }   // profileur perf (diagnostic)
  if (e.code==='F9' && CHEAT.unlocked && !(game && game.net)){ CHEAT.open=!CHEAT.open; e.preventDefault(); return; }   // panneau de triche (hors ligne)
  if (intro>=0){
    if (e.code==='Escape') finishIntro(); else advanceIntro();
    e.preventDefault(); return;
  }
  if (game && CINE.on){ if (!e.repeat) cineKey(e.code); e.preventDefault(); return; }   // cinématique : Espace/Entrée = suite, Échap = passer
  if (!game || game.over) return;
  const K = SETTINGS.keys, p = game.p;
  if (e.code===K.pause){ e.preventDefault();
    if (!e.repeat) togglePauseAction();
    return;
  }
  if (e.code==='Space' || e.code===K.special) e.preventDefault();
  // tutoriel : Espace/Entrée valide les étapes d'info (« Continuer »)
  if (game.tut && TUT && (e.code==='Space'||e.code==='Enter') && !TUT.confirmSkip && TUT.steps[TUT.i].tap){ tutBeginAct(); return; }
  if (e.repeat) return;                 // touche maintenue : jamais de bascule/commande en rafale (pause en ligne, formation…)
  if (e.code===K.softpause){ e.preventDefault(); toggleSoftPause(); return; }
  if (paused || settingsOpen) return;   // réglages ouverts (même hors pause en ligne) : pas d'action de jeu au clavier
  // TUTORIEL : le clavier respecte la visibilité progressive (une touche ne déclenche pas une
  // action dont le bouton n'a pas encore été enseigné — sinon on sautait des leçons)
  const kb = (b)=> !(game.tut && TUT && tutBtnHidden(b));
  if (e.code===K.buy1){ if (kb({type:'unit',i:0})) tryBuy(p,0); }
  else if (e.code===K.buy2){ if (kb({type:'unit',i:1})) tryBuy(p,1); }
  else if (e.code===K.buy3){ if (kb({type:'unit',i:2})) tryBuy(p,2); }
  else if (e.code===K.buy4){ if (kb({type:'unit',i:3})) tryBuy(p,3); }
  else if (e.code===K.buy5){ if (kb({type:'unit',i:4})) tryBuy(p,4); }
  else if (e.code===K.buy6){ if (kb({type:'unit',i:5})) tryBuy(p,5); }
  else if (e.code===K.evolve){ if (kb({type:'evolve'})) tryEvolve(p); }
  else if (e.code===K.special){ if (kb({type:'special'})) trySpecial(p); }
  else if (e.code===K.charge){ if (kb({type:'stance',st:'charge'})) setStance(p,'charge'); }
  else if (e.code===K.hold){ if (kb({type:'stance',st:'hold'})) setStance(p,'hold'); }
  else if (e.code===K.retreat){ if (kb({type:'stance',st:'retreat'})) setStance(p,'retreat'); }
  else if (e.code===K.formation){ if (kb({type:'formation'})) toggleFormation(p); }
  else if (e.code===K.repairall){ if (kb({type:'repairall'})) tryRepairAll(p); }
  else if (e.code===K.hero){ if (kb({type:'hero'}) && heroBtnReady(p)) tryHero(p); }
  else if (e.code===K.herostance){ if (kb({type:'hstance'})) cycleHeroStance(p); }
  else if (e.code===K.follow) camFollow=!camFollow;
  else if (e.code===K.capup){ if (kb({type:'cap'})) tryCapUp(p); }
  else if (e.code===K.zoomin || e.code==='NumpadAdd') setZoom(zoom+0.12);
  else if (e.code===K.zoomout || e.code==='NumpadSubtract') setZoom(zoom-0.12);
});
// ⚏ formation : MÊME chemin pour le bouton et la touche (la touche ne relayait pas l'ordre à
// l'hôte en ligne : côté invité la formation ne basculait que localement, puis était écrasée)
function toggleFormation(p){
  if (game.net==='guest'){ guestCmd({c:'form'}); sfx('sel'); return; }
  p.formation=!p.formation; sfx('sel');
  announce(p.formation? tr(p.facKey==='HUM'? 'a_form_hum':'a_form_ia') : tr('a_form_off'), '#e8d8a0');
}
window.addEventListener('keyup', e=>kdown.delete(e.code));
// alt-tab en maintenant une flèche : le « keyup » n'arrive jamais → la caméra défilait seule au retour
window.addEventListener('blur', ()=>kdown.clear());
document.addEventListener('visibilitychange', ()=>{ if (document.hidden) kdown.clear(); });
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

// SURVOL (souris uniquement) : tooltip détaillé sur les boutons d'unités et de posture du héros.
let hoverUnitBtn = -1, hoverHudBtn = null;
cv.addEventListener('pointermove', e=>{
  if (e.pointerType==='touch'){ hoverUnitBtn=-1; hoverHudBtn=null; return; }
  if (!game || game.over || paused || buildMenu){ hoverUnitBtn=-1; hoverHudBtn=null; return; }
  const {sx,sy} = evXY(e); hoverUnitBtn=-1; hoverHudBtn=null;
  for (const b of HUD.btns) if (!btnHidden(b) && inRect(sx,sy,b)){
    if (b.type==='unit') hoverUnitBtn=b.i; else if (b.type==='hstance') hoverHudBtn=b;
    break; }
});
// le point (sx, sy) tombe-t-il sur l'interface (bandeau, bouton, bannière de sélection, fil) ?
function overHud(sx, sy){
  if (sy<=38) return true;
  for (const b of HUD.btns) if (!btnHidden(b) && inRect(sx,sy,b)) return true;
  for (const r of HUD.upgRects) if (inRect(sx,sy,r)) return true;
  if (HUD.selRect && inRect(sx,sy,HUD.selRect)) return true;
  if (typeof NEWSF!=='undefined' && NEWSF.rect && inRect(sx,sy,NEWSF.rect)) return true;
  const cc = game && game.camp;                                         // campagne : étiquette d'objectif, bouton « ? » et action de mission
  if (cc) for (const r of [cc.objRect, cc.helpRect, cc.actRect]) if (r && inRect(sx,sy,r)) return true;
  return false;
}
// APPUI LONG (tactile) = ordre de position : il part DÈS que le délai est écoulé, doigt encore posé
// (un anneau se remplit sous le doigt), au lieu d'attendre qu'on le lève.
const LONG_PRESS_MS = 450;
function longPressOrder(pd){
  if (!game || game.over || paused || settingsOpen || buildMenu || speedPanel || speedVote || CINE.on) return false;
  if (game.tut && TUT && TUT.confirmSkip) return false;
  if (overHud(pd.sx, pd.sy)) return false;
  if (!orderPoint(game.p, s2wX(pd.sx))) return false;
  try { if (navigator.vibrate) navigator.vibrate(15); } catch(e){}
  return true;
}

let _fsTried=false;
let tutDragging=null;          // glisser-déposer de la carte du tutoriel
cv.addEventListener('pointerdown', e=>{
  audioInit(); musicStart();
  if (!_fsTried){ _fsTried=true; goFullscreen(); }   // plein écran auto dès la 1re interaction (PC + Android)
  cv.setPointerCapture(e.pointerId);
  const {sx,sy} = evXY(e);
  if (game && CINE.on){ cineInput(sx, sy); return; }   // cinématique : un appui = plan suivant
  if (game && game.camp && !game.over && campClick(sx, sy)) return;   // bouton d'action de la mission
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
  // CLIC DROIT = ordre de position, donné DÈS L'APPUI (comme dans tout jeu de stratégie). Avant, il
  // partait au relâcher et seulement si la souris n'avait pas bougé de plus de 6 px logiques : un clic
  // droit « en mouvement » (≥ 9 px à l'écran, mesuré) devenait un glissé de caméra et l'ordre était perdu.
  if (e.button===2 && game && !game.over && intro<0){
    pdown = {sx, sy, moved:false, lasso:false, btn:2, done:true};
    handleTap(sx, sy, e.shiftKey, {right:true});
    return;
  }
  if (!game || game.over || paused || buildMenu){ pdown={sx,sy,moved:false,lasso:false,btn:e.button}; return; }
  const lasso = (selMode || e.shiftKey) && e.button===0 && sy>38 && sy<H-102;
  pdown = {sx, sy, moved:false, lasso, t0:performance.now(), touch:e.pointerType==='touch', btn:e.button};
  if (lasso) selBox = {x0:sx, y0:sy, x1:sx, y1:sy};
  else if (pdown.touch){ const pd = pdown;
    pd.lpT = setTimeout(()=>{ if (pdown===pd && !pd.moved && ptrs.size===1 && longPressOrder(pd)) pd.done = true; }, LONG_PRESS_MS); }
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
  if (!pdown || pdown.done) return;      // ordre déjà donné (clic droit, appui long) : pas de glissé de caméra
  // ⚙ réglages : glisser sur la barre de volume la règle en continu (avant : un tap par réglage)
  if (settingsOpen && pauseRects){ const r = pauseRects.find(r=>r.key==='vol' && r.slider);
    if (r && inRect(pdown.sx, pdown.sy, r)){ pdown.moved = true;
      SETTINGS.vol = clamp(Math.round(((sx-r.slider.x)/r.slider.w)*20)/20, 0, 1); saveSettings(); refreshOpts(); return; } }
  const dx = sx-prev.sx;
  // seuil de glissé : 6 px logiques à la souris ; 12 au doigt (6 px logiques ≈ 4 px réels sur un
  // téléphone : le moindre tremblement annulait l'appui long et faisait glisser la caméra)
  const thr = pdown.touch? 12 : 6;
  if (Math.abs(sx-pdown.sx)>thr || Math.abs(sy-pdown.sy)>thr) pdown.moved = true;
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
  if (pdown && pdown.lpT) clearTimeout(pdown.lpT);
  if (pdown && pdown.done){ pdown = null; dragging = false; selBox = null; return; }   // ordre déjà donné à l'appui
  if (!was || !pdown) { dragging = ptrs.size>0 && dragging; return; }
  const {sx,sy} = evXY(e);
  const tap = !pdown.moved;
  if (intro>=0){
    pdown = null; dragging = false;
    if (tap){ if (inRect(sx,sy,INTRO_SKIP())) finishIntro(); else advanceIntro(); }
    return;
  }
  const lasso = pdown.lasso;
  // ORDRE DE POSITION : CLIC DROIT (souris) ou APPUI LONG sans bouger (tactile) = envoyer
  // la sélection défendre ce point précis. Le clic gauche garde ses rôles historiques.
  const long = pdown.touch && !pdown.moved && (performance.now()-pdown.t0) > 450;
  const right = pdown.btn===2;
  pdown = null; dragging = false;
  // VRAI glisser en mode lasso = sélection rectangle. En revanche un simple APPUI (sans glisser)
  // doit rester un tap normal : on peut ainsi construire/sélectionner même en mode lasso actif
  // (corrige le blocage des socles muraille/tourelle quand ⬚ LASSO est enclenché juste avant).
  if (lasso && !tap){ finishLasso(); return; }
  selBox = null;
  if (tap) handleTap(sx,sy,e.shiftKey,{touch:e.pointerType==='touch', long, right});
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', e=>{ ptrs.delete(e.pointerId); if(ptrs.size<2) pinch=null; if (pdown && pdown.lpT) clearTimeout(pdown.lpT); pdown=null; selBox=null; dragging=false; tutDragging=null; });

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
  if (game.sel.size){ sfx('sel'); announce(fmt('a_lasso',{n:game.sel.size}), '#ffd34a'); }
}

function handleTap(sx, sy, shift, opts){
  if (!game) return;
  if (game.over) return;
  // MODE TRICHE (dev) : le panneau capte les clics en priorité tant qu'il est ouvert
  if (CHEAT.unlocked && CHEAT.open && CHEAT.rects && !game.net){
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
  // CLIC DROIT : réservé EXCLUSIVEMENT à l'ordre de position — il n'actionne jamais un bouton,
  // un menu ni la sélection. Sélection active → elle seule y va ; AUCUNE sélection → toute l'armée.
  if (opts && opts.right){
    if (paused || settingsOpen) return;
    if (game.tut && TUT && TUT.confirmSkip) return;
    // menu de construction ouvert : un clic droit le referme ; hors du menu, l'ordre part aussi
    if (buildMenu){ const bx = buildMenu.box; buildMenu = null; if (bx && inRect(sx,sy,bx)) return; }
    if (overHud(sx, sy)) return;            // jamais sur un bouton ni sur le bandeau du haut
    orderPoint(game.p, s2wX(sx));
    return;
  }
  // tutoriel : boutons de la carte (Continuer / Passer / confirmation). Renvoie true si le clic
  // est consommé ; sinon il atteint le jeu normalement (construire, sélectionner…).
  if (game.tut && TUT && tutHandleTap(sx,sy)) return;
  // contrôles du coin haut-droite (⏸ pause terrain · ⚙ réglages · ⏩ vitesse) : TOUJOURS actifs,
  // y compris en pause ou réglages ouverts — avant, le ▶ dessiné en pause ne reprenait rien et
  // ⚙ ne s'ouvrait pas pendant une pause (la branche « pause » interceptait tout)
  for (const b of HUD.btns){
    if ((b.type!=='softpause' && b.type!=='pause' && b.type!=='speed') || btnHidden(b) || !inRect(sx,sy,b)) continue;
    if (b.type==='softpause') toggleSoftPause();
    else if (b.type==='pause') togglePauseAction();
    else if (!settingsOpen) openSpeedPanel();
    sfx('sel'); return;
  }
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
      else if (r.key==='news'){ SETTINGS.newsFeed=!SETTINGS.newsFeed; saveSettings(); refreshOpts(); }
      else if (r.key==='lang'){ cycleLang(); }
      else if (r.key==='quality'){ cycleQuality(); refreshOpts(); }
      else if (r.key==='follow') camFollow=!camFollow;
      else if (r.key==='fs') toggleFullscreen();       // geste utilisateur : requête plein écran autorisée
      else if (r.key==='quit'){
        netDisconnect();
        paused=false; settingsOpen=false; netPause=null; game=null; buildMenu=null; selMode=false; selBox=null;
        M1_RETRY = M3_RETRY = M4_RETRY = false;                  // campagne quittée : plus de reprise allégée
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
    if (!base && slot.b && slot.owner && slot.owner!==p) return;   // bâtiment ennemi apparu pendant que le menu était ouvert
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
          if (n){ announce(fmt('a_guard_out',{n:n}), '#e8d8a0'); sfx('build'); }
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
        announce(fmt('a_ungar',{n:n}), '#e8d8a0'); sfx('build');
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
  // fil d'actualités : la croix × le masque
  if (newsHandleTap(sx,sy)) return;
  // bannière de sélection : ✖
  if (HUD.selRect && inRect(sx,sy,HUD.selRect)){ game.sel.clear(); sfx('sel'); return; }
  // ⬆ d'amélioration de classe (annonce le coût si on ne peut pas payer)
  for (const r of HUD.upgRects) if (inRect(sx,sy,r)){
    if (!tryUpgRole(p, r.i)){
      const lvl = p.upg[ROLES[r.i].key]||0;
      if (lvl<3) announce(fmt('a_upgcost',{cost:costStr(p,{f:90*(lvl+1), m:180*(lvl+1)})}), '#d8a06a');
    }
    return;
  }
  // boutons HUD
  for (const b of HUD.btns) if (!btnHidden(b) && inRect(sx,sy,b)){
    HUD.press = { b, t:performance.now() };          // la fiche touchée s'enfonce un instant (retour tactile)
    if (b.type==='unit'){ tryBuy(p, b.i); }
    else if (b.type==='hero'){ if (!heroBtnReady(p)) continue; tryHero(p); }
    else if (b.type==='hstance'){ cycleHeroStance(p); }
    else if (b.type==='special'){ trySpecial(p); }
    else if (b.type==='evolve'){ tryEvolve(p); }
    else if (b.type==='cap'){ tryCapUp(p); }
    else if (b.type==='stance'){ setStance(p, b.st); }
    else if (b.type==='lasso'){ selMode=!selMode; sfx('sel'); }
    else if (b.type==='formation'){ toggleFormation(p); return; }
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
    // (⏸ / ⚙ / ⏩ : traités plus haut, avant les branches pause et réglages)
    return;
  }
  if (sy<=38) return; // bandeau de ressources
  // ---- monde ----
  const wx = s2wX(sx), wy = s2wY(sy);
  // ORDRE DE POSITION (tactile) : APPUI LONG sur le terrain = envoyer la sélection — ou TOUTE
  // l'armée si rien n'est sélectionné — DÉFENDRE ce point exact (souris : clic droit, plus haut).
  // Prioritaire sur la sélection d'unité / l'ouverture d'un socle : avant, un appui long près de ses
  // propres troupes (là où on veut justement les poster) les sélectionnait au lieu de les envoyer.
  // (En jeu, l'appui long part dès 450 ms doigt posé — voir longPressOrder ; ceci couvre le relâcher.)
  if (opts && opts.touch && opts.long){
    if (orderPoint(p, wx)) return;
  }
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
  // ---- sol ----
  // tap bref / clic gauche sur le sol : désélection (comportement historique)
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
