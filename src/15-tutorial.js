/* =====================================================================
   TUTORIEL INTERACTIF (réécriture v2 — simple, robuste, sans blocage)
   Principes :
   · MONDE VIVANT mais calme — l'ennemi est passif (IA coupée), sa base est
     inattaquable, on ne peut ni gagner ni perdre, aucun événement/cataclysme.
   · AUCUN GEL, AUCUN VERROU d'entrée — le guidage est purement VISUEL :
     les boutons non encore enseignés sont masqués, celui de l'étape est en
     surbrillance, les acquis restent affichés (grisés).
   · AUCUN VOILE SOMBRE — un simple halo + flèche + carte cliquable-au-travers,
     donc jamais d'écran « noir / nulle part où cliquer ».
   · Chaque étape est réalisable instantanément ; un rappel apparaît si le
     joueur hésite, et « Passer » est toujours disponible.
   Textes FR + EN (les autres langues retombent sur l'anglais).
   ===================================================================== */
function tutText(o){ return (o && (o[SETTINGS.lang] || o.en || o.fr)) || ''; }
function tutGrant(f,m,w){ const p=game.p; if(f)p.f=Math.max(p.f,f); if(m)p.m=Math.max(p.m,m); if(w)p.w=Math.max(p.w,w); }
function tutCam(wx){ camFollow=false; camX=clamp(wx - VW()/2, 0, WORLD-VW()); }
function tutCount(role){ const p=game.p;
  return p.units.filter(u=>u.role===role).length + p.queue.filter(q=>ROLES[q].key===role).length; }
function tutHasBuild(type){ const p=game.p;
  for (const s of sideBuildSlots(p)) if (s.b && (s.b.type===type || s.b.buildType===type)) return true;
  return false; }
function tutEmptySlot(){ const p=game.p; return p.slots.find(s=>!s.b) || null; }
function tutHudRect(match){ for (const b of HUD.btns) if (!btnHidden(b) && match(b)) return {x:b.x,y:b.y,w:b.w,h:b.h}; return null; }
function tutWorldRect(wx){ const sx=w2sX(wx), gy=w2sY(gY(wx)); return {x:sx-46, y:gy-100, w:92, h:108}; }
// garantit au moins n unités au sol (pour les étapes sélection / lasso)
function tutEnsureGround(n){ const p=game.p; let g=p.units.filter(u=>!u.fly).length;
  while (g<n){ spawnUnit(p, 0, false, p.x + 130 + g*34); g++; } }
// descripteur d'action d'un bouton de HUD (pour la visibilité progressive)
function tutDesc(b){
  switch(b.type){
    case 'unit':      return {t:'buy', i:b.i};
    case 'stance':    return {t:'stance', st:b.st};
    case 'evolve':    return {t:'evolve'};
    case 'special':   return {t:'special'};
    case 'cap':       return {t:'cap'};
    case 'repairall': return {t:'repairall'};
    case 'formation': return {t:'formation'};
    case 'hero':      return {t:'hero'};
    case 'lasso':     return {t:'lasso'};
    default:          return {t:b.type};
  }
}
/* ---- ÉTAPES ----
   text/obj : texte + objectif (FR/EN) · tap : étape d'info (bouton Continuer)
   enter()  : préparation (ressources, caméra, unités) · focus() : cible à mettre en valeur
   allow(d) : prédicat identifiant le(s) bouton(s)/action de l'étape (visibilité + halo)
   done()   : condition de réussite (étapes d'action) */
const TUT_STEPS = [
  { // 0 — accueil
    tap:true,
    text:{fr:"Bienvenue, commandant. Objectif : détruire la base ennemie à droite. En haut : vos ressources — 🌾 nourriture, 🪙 argent, 💧 eau.",
          en:"Welcome, commander. Goal: destroy the enemy base on the right. Top bar: your resources — 🌾 food, 🪙 money, 💧 water."},
    enter:()=>{ camFollow=false; camX=0; },
    focus:()=>({x:0,y:0,w:Math.min(320,W),h:38}),
  },
  { // 1 — ferme
    text:{fr:"Tout commence par l'ÉCONOMIE. Touchez le socle « + » surligné et bâtissez une 🌾 FERME (+nourriture).",
          en:"It all starts with the ECONOMY. Tap the highlighted \"+\" pad and build a 🌾 FARM (+food)."},
    obj:{fr:"Construisez une ferme",en:"Build a farm"},
    enter:()=>{ tutGrant(300,300,150); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='farmF',
    done:()=>tutHasBuild('farmF'),
  },
  { // 2 — marché
    text:{fr:"Bâtissez un 🪙 MARCHÉ sur le socle surligné : l'argent paie troupes et bâtiments.",
          en:"Build a 🪙 MARKET on the highlighted pad: money pays for troops and buildings."},
    obj:{fr:"Construisez un marché",en:"Build a market"},
    enter:()=>{ tutGrant(300,300,150); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='farmM',
    done:()=>tutHasBuild('farmM'),
  },
  { // 3 — puits
    text:{fr:"Enfin un ⛲ PUITS sur le dernier socle (+eau). Vos trois sources de richesse sont prêtes.",
          en:"Finally a ⛲ WELL on the last pad (+water). Your three income sources are set."},
    obj:{fr:"Construisez un puits",en:"Build a well"},
    enter:()=>{ tutGrant(300,300,150); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='well',
    done:()=>tutHasBuild('well'),
  },
  { // 4 — mêlée
    text:{fr:"En bas, la barre de recrutement. Recrutez DEUX unités de ⚔ MÊLÉE (bouton surligné) : votre première ligne.",
          en:"Bottom bar: recruiting. Recruit TWO ⚔ MELEE units (highlighted button): your front line."},
    obj:{fr:"Recrutez 2 unités de mêlée",en:"Recruit 2 melee units"},
    enter:()=>{ tutGrant(600,500,150); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===0),
    allow:a=>a.t==='buy'&&a.i===0,
    done:()=>tutCount('melee')>=2,
  },
  { // 5 — tireurs
    text:{fr:"Recrutez DEUX 🏹 TIREURS : fragiles, mais ils frappent de loin. Mêlez toujours mêlée et distance.",
          en:"Recruit TWO 🏹 RANGED: fragile, but they strike from afar. Always mix melee and ranged."},
    obj:{fr:"Recrutez 2 tireurs",en:"Recruit 2 ranged units"},
    enter:()=>{ tutGrant(500,600,150); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===2),
    allow:a=>a.t==='buy'&&a.i===2,
    done:()=>tutCount('ranged')>=2,
  },
  { // 6 — aérien
    text:{fr:"Ajoutez une unité 🦅 AÉRIENNE : elle survole le sol et ignore la mêlée.",
          en:"Add a 🦅 AIR unit: it flies over the ground and ignores melee."},
    obj:{fr:"Recrutez 1 unité aérienne",en:"Recruit 1 air unit"},
    enter:()=>{ tutGrant(500,600,250); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===4),
    allow:a=>a.t==='buy'&&a.i===4,
    done:()=>tutCount('air')>=1,
  },
  { // 7 — sélection
    text:{fr:"Place au CONTRÔLE. Touchez l'une de vos unités sur le terrain pour la SÉLECTIONNER.",
          en:"Time for CONTROL. Tap one of your units on the field to SELECT it."},
    obj:{fr:"Sélectionnez une unité",en:"Select a unit"},
    enter:()=>{ camFollow=false; camX=0; game.p.stance='hold'; tutEnsureGround(2); game.sel.clear(); },
    focus:()=>{ const u=game.p.units.find(x=>!x.fly)||game.p.units[0]; return u? tutWorldRect(u.x):null; },
    done:()=>game.sel.size>=1,
  },
  { // 8 — lasso
    text:{fr:"Pour sélectionner TOUT un groupe : touchez ⬚ LASSO (surligné), puis tracez un rectangle autour de vos troupes.",
          en:"To select a WHOLE group: tap ⬚ LASSO (highlighted), then drag a box around your troops."},
    obj:{fr:"Sélectionnez un groupe au lasso",en:"Lasso-select a group"},
    enter:()=>{ camFollow=false; camX=0; tutEnsureGround(3); game.sel.clear(); selMode=false; },
    focus:()=>tutHudRect(b=>b.type==='lasso'),
    allow:a=>a.t==='lasso',
    done:()=>game.sel.size>=2,
  },
  { // 9 — formation
    text:{fr:"Activez la ⚏ FORMATION : vos troupes se rangent — mêlée devant, tireurs derrière. Bien plus solide.",
          en:"Toggle ⚏ FORMATION: troops auto-arrange — melee front, ranged back. Far sturdier."},
    obj:{fr:"Activez la formation",en:"Enable formation"},
    enter:()=>{ camFollow=false; camX=0; game.p.formation=false; },
    focus:()=>tutHudRect(b=>b.type==='formation'),
    allow:a=>a.t==='formation',
    done:()=>game.p.formation===true,
  },
  { // 10 — charger
    text:{fr:"Donnez l'ordre ⚔ CHARGER (surligné) pour lancer vos troupes vers l'ennemi. ✋ Tenir et ↩ Replier complètent vos ordres.",
          en:"Give the ⚔ CHARGE order (highlighted) to send troops at the enemy. ✋ Hold and ↩ Retreat round out your orders."},
    obj:{fr:"Ordonnez la charge",en:"Order the charge"},
    enter:()=>{ camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='stance'&&b.st==='charge'),
    allow:a=>a.t==='stance',
    done:()=>game.p.stance==='charge'||game.p.units.some(u=>u.ord==='charge'),
  },
  { // 11 — amélioration de classe
    text:{fr:"Renforcez vos troupes : touchez le petit ⬆ dans le coin du bouton ⚔ MÊLÉE pour AMÉLIORER toute la classe (cumulable ×3).",
          en:"Strengthen your troops: tap the small ⬆ in the corner of the ⚔ MELEE button to UPGRADE the whole class (stacks ×3)."},
    obj:{fr:"Améliorez la classe mêlée (⬆)",en:"Upgrade the melee class (⬆)"},
    enter:()=>{ tutGrant(600,1200,250); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===0),
    allow:a=>a.t==='upg'||(a.t==='buy'&&a.i===0),
    done:()=>(game.p.upg.melee||0)>=1,
  },
  { // 12 — capacité d'armée
    text:{fr:"Investissez : touchez 📈 CAPACITÉ pour augmenter le nombre maximum d'unités de votre armée.",
          en:"Invest: tap 📈 CAPACITY to raise your army's maximum unit count."},
    obj:{fr:"Augmentez votre capacité d'armée",en:"Raise your army capacity"},
    enter:()=>{ tutGrant(500,800,500); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='cap'),
    allow:a=>a.t==='cap',
    done:()=>game.p.capUp===true,
  },
  { // 13 — pouvoir ultime
    text:{fr:"L'EXPÉRIENCE ✦ se gagne au combat et alimente votre POUVOIR ULTIME. Il est prêt : lancez-le avec ✸.",
          en:"EXPERIENCE ✦ comes from combat and powers your ULTIMATE. It's ready: unleash it with ✸."},
    obj:{fr:"Lancez votre pouvoir ultime",en:"Unleash your ultimate"},
    enter:()=>{ const p=game.p; p.specialCd=0; p.xp=Math.max(p.xp, specialXpCost(p)+30); TUT.specBase=game.specialsUsed; camFollow=true; },
    focus:()=>tutHudRect(b=>b.type==='special'),
    allow:a=>a.t==='special',
    done:()=>game.specialsUsed>(TUT.specBase||0),
  },
  { // 14 — évolution d'ère
    text:{fr:"L'✦ permet aussi d'ÉVOLUER : changer d'ère rend TOUTES vos forces plus puissantes. Touchez ⚡ ÉVOLUER.",
          en:"✦ also lets you EVOLVE: advancing an era makes ALL your forces stronger. Tap ⚡ EVOLVE."},
    obj:{fr:"Évoluez vers l'ère suivante",en:"Evolve to the next era"},
    enter:()=>{ const p=game.p; TUT.eraBase=p.era; p.xp=Math.max(p.xp, EVOLVE_XP[Math.min(p.era+1,4)]+30); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='evolve'),
    allow:a=>a.t==='evolve',
    done:()=>game.p.era>(TUT.eraBase||0),
  },
  { // 15 — héros
    text:{fr:"Une fois par partie, invoquez votre 🦸 HÉROS légendaire : il décuple la force de toute votre armée tant qu'il vit.",
          en:"Once per game, summon your 🦸 legendary HERO: he massively boosts your whole army while alive."},
    obj:{fr:"Invoquez votre héros",en:"Summon your hero"},
    enter:()=>{ const p=game.p; p.heroCd=0; tutGrant(900,900,400); camFollow=true; },
    focus:()=>tutHudRect(b=>b.type==='hero'),
    allow:a=>a.t==='hero',
    done:()=>game.p.units.some(u=>u.role==='hero'),
  },
  { // 16 — fin
    tap:true,
    text:{fr:"🎉 Tutoriel terminé ! Économie, troupes, ordres, améliorations, pouvoirs, évolution, héros — tout est à vous. Bonne guerre, commandant !",
          en:"🎉 Tutorial complete! Economy, troops, orders, upgrades, powers, evolution, hero — it's all yours. Good war, commander!"},
    enter:()=>{ game.flash=0.5; sfx('evolve'); },
    focus:()=>null,
  },
];
/* ---- cycle de vie ---- */
function startTutorial(){
  audioInit(); musicStart(); goFullscreen();
  closeNetUI(); $('menu').style.display='none'; $('endscreen').style.display='none';
  intro = -1; pendingStart = null; netDisconnect();
  newGame('HUM', 0, false);
  game.tut = true; game.speed = 1;
  const p = game.p, e = game.e;
  p.stance = 'hold'; e.stance = 'hold';
  e.hp = e.maxhp = 9e9;              // base ennemie inattaquable (aucune victoire accidentelle)
  camFollow = false; zoom = 1; camX = 0; camClamp();
  TUT = { i:0, t:0, steps:TUT_STEPS, revealed:[], celebrating:false, celebT:0, confirmSkip:false, uiRects:[], confirmRects:[] };
  tutEnterStep();
  announce(tutText({fr:"✦ TUTORIEL — bienvenue, commandant",en:"✦ TUTORIAL — welcome, commander"}), '#ffd34a');
}
function endTutorial(){
  try { localStorage.setItem('agi_tutoSeen','1'); } catch(e){}
  TUT = null; game = null; paused = false; netPause = null; buildMenu = null;
  selMode = false; selBox = null; intro = -1; pendingStart = null;
  $('menu').style.display = 'flex';
}
function tutEnterStep(){
  const step = TUT.steps[TUT.i];
  TUT.t = 0; TUT.uiRects = [];
  if (step.enter) step.enter();
}
function tutBeginAct(){ if (TUT && TUT.steps[TUT.i].tap) tutAdvance(); }   // bouton « Continuer »
function tutAdvance(){
  if (!TUT) return;
  TUT.celebrating = false; TUT.celebT = 0;
  const step = TUT.steps[TUT.i];
  if (step.allow) TUT.revealed.push(step.allow);   // mémorise les boutons enseignés
  TUT.i++;
  if (TUT.i >= TUT.steps.length){ endTutorial(); return; }
  tutEnterStep();
}
function tutTick(dt){
  if (!game || !game.tut || !TUT) return;
  TUT.t += dt;
  if (TUT.celebrating){ TUT.celebT += dt; if (TUT.celebT > 0.7) tutAdvance(); return; }
  const step = TUT.steps[TUT.i];
  if (!step.tap && step.done && step.done()){
    TUT.celebrating = true; TUT.celebT = 0; sfx('cap');
    const cx = s2wX(W/2); addFloater(cx, gY(cx)-150, '✓', '#9dc88a', 22);
  }
}
/* ---- visibilité progressive du HUD (appelée par 13-hud.js) ---- */
function tutBtnHidden(b){            // true = masquer (jamais enseigné)
  if (!game || !game.tut || !TUT) return false;
  const step = TUT.steps[TUT.i], desc = tutDesc(b);
  if (step && step.allow && step.allow(desc)) return false;     // bouton de l'étape
  if (TUT.revealed.some(p => p(desc))) return false;            // déjà enseigné
  return true;
}
function tutBtnDim(b){               // true = afficher grisé (acquis, pas l'étape courante)
  if (!game || !game.tut || !TUT) return false;
  const step = TUT.steps[TUT.i], desc = tutDesc(b);
  if (step && step.allow && step.allow(desc)) return false;
  return TUT.revealed.some(p => p(desc));
}
function tutBuildAllowed(key){       // option de menu de construction visible en tuto ?
  if (!game || !game.tut || !TUT) return true;
  const step = TUT.steps[TUT.i], d = {t:'build', type:key};
  return (step && step.allow && step.allow(d)) || TUT.revealed.some(p => p(d));
}
function tutBuildCurrent(key){       // option à mettre en surbrillance dans le menu
  if (!game || !game.tut || !TUT) return false;
  const step = TUT.steps[TUT.i];
  return !!(step && step.allow && step.allow({t:'build', type:key}));
}
/* ---- rendu (halo + carte) ---- */
function tutArrow(cx, edgeY, down, pulse){
  const o = (down?1:-1)*(7+5*pulse);
  ctx.fillStyle = '#ffd34a'; ctx.beginPath();
  if (down){ ctx.moveTo(cx, edgeY-4+o+14); ctx.lineTo(cx-11, edgeY-4+o); ctx.lineTo(cx+11, edgeY-4+o); }
  else      { ctx.moveTo(cx, edgeY+4+o-14); ctx.lineTo(cx-11, edgeY+4+o); ctx.lineTo(cx+11, edgeY+4+o); }
  ctx.closePath(); ctx.fill();
}
function tutWrap(text, maxW, font){
  ctx.font = font; const words = text.split(' '), lines=[]; let cur='';
  for (const w of words){ const test = cur? cur+' '+w : w;
    if (ctx.measureText(test).width > maxW && cur){ lines.push(cur); cur=w; } else cur=test; }
  if (cur) lines.push(cur); return lines;
}
function drawTut(){
  if (!TUT) return;
  const step = TUT.steps[TUT.i];
  const focus = (!TUT.confirmSkip && step.focus) ? step.focus() : null;
  const acc = (game&&game.p&&game.p.fac)? game.p.fac.accent : '#ffd34a';
  const pulse = 0.5 + 0.5*Math.sin(performance.now()/1000*4.5);
  // HALO additif autour de la cible (PAS de voile sombre → jamais d'écran noir)
  let fx=0,fy=0,fw=0,fh=0;
  if (focus){
    const pad=10; fx=focus.x-pad; fy=focus.y-pad; fw=focus.w+pad*2; fh=focus.h+pad*2;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    ctx.strokeStyle=rgbaC(acc,0.55+0.4*pulse); ctx.lineWidth=3; ctx.shadowColor=acc; ctx.shadowBlur=16;
    rr(fx,fy,fw,fh,12); ctx.stroke(); ctx.restore();
  }
  // CARTE d'instruction — ancrée en haut, déplacée en bas seulement si la cible est en haut
  const bw = Math.min(400, W-32), pad = 13, titleH = 15, lineH = 17, btnH = 30;
  const lines = tutWrap(tutText(step.text), bw-pad*2, '13px Arial');
  const objLine = step.obj ? tutText(step.obj) : null;
  const bh = pad + titleH + 10 + lines.length*lineH + 8 + btnH + pad + (objLine?20:0);
  const bx = clamp((W-bw)/2, 12, W-bw-12);
  const focusTop = focus && (focus.y + focus.h*0.5) < H*0.4;
  let by = clamp(focusTop ? (H-94-bh) : 44, 12, H-bh-12);
  if (focus){ const cxF=fx+fw/2, fromBelow = by > fy;
    tutArrow(clamp(cxF,bx+20,bx+bw-20), fromBelow? fy+fh : fy, !fromBelow, pulse); }
  TUT.uiRects = [];
  ctx.save(); ctx.shadowColor='rgba(0,0,0,0.45)'; ctx.shadowBlur=18; ctx.shadowOffsetY=5;
  const pg=ctx.createLinearGradient(bx,by,bx,by+bh); pg.addColorStop(0,'rgba(26,22,30,0.92)'); pg.addColorStop(1,'rgba(14,12,18,0.92)');
  ctx.fillStyle=pg; rr(bx,by,bw,bh,12); ctx.fill(); ctx.restore();
  ctx.save(); ctx.strokeStyle=rgbaC(acc,0.9); ctx.lineWidth=2; ctx.shadowColor=acc; ctx.shadowBlur=8; rr(bx,by,bw,bh,12); ctx.stroke(); ctx.restore();
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
  ctx.font='700 11px Arial'; ctx.fillStyle=acc;
  ctx.fillText('✦ '+tutText({fr:'TUTORIEL',en:'TUTORIAL'}), bx+pad, by+pad+8);
  const dotN=TUT.steps.length, dr=2.4, dgap=7, dtot=dotN*dgap;
  for(let i=0;i<dotN;i++){ ctx.beginPath(); ctx.arc(bx+bw-pad-dtot+i*dgap, by+pad+5, dr, 0,6.283);
    ctx.fillStyle = i===TUT.i? acc : 'rgba(255,255,255,0.22)'; ctx.fill(); }
  ctx.font='13px Arial'; ctx.fillStyle='#ece6da'; let ty = by+pad+titleH+12;
  for (const ln of lines){ ctx.fillText(ln, bx+pad, ty); ty += lineH; }
  if (objLine){ ctx.font='700 12px Arial'; ctx.fillStyle='#9dd88a'; ctx.fillText('▸ '+objLine, bx+pad, ty+3); ty += 20; }
  const byB = by + bh - pad - btnH, skipW = 150;
  ctx.fillStyle='rgba(255,255,255,0.08)'; rr(bx+pad, byB, skipW, btnH, 7); ctx.fill();
  ctx.font='700 12px Arial'; ctx.fillStyle='#d8a0a0'; ctx.textAlign='center';
  ctx.fillText(tutText({fr:'Passer ✕',en:'Skip ✕'}), bx+pad+skipW/2, byB+btnH/2+4);
  TUT.uiRects.push({key:'skip', x:bx+pad, y:byB, w:skipW, h:btnH});
  if (step.tap){
    const contW = 188;
    ctx.save(); ctx.fillStyle=rgbaC(acc,0.95); ctx.shadowColor=acc; ctx.shadowBlur=10; rr(bx+bw-pad-contW, byB, contW, btnH, 7); ctx.fill(); ctx.restore();
    ctx.fillStyle='#14110f'; ctx.font='700 13px Arial';
    ctx.fillText(tutText({fr:'Continuer ▸',en:'Continue ▸'}), bx+bw-pad-contW/2, byB+btnH/2+4);
    TUT.uiRects.push({key:'cont', x:bx+bw-pad-contW, y:byB, w:contW, h:btnH});
  } else {
    // rappel pulsé : plus visible si le joueur hésite (>6 s sur l'étape)
    const urge = TUT.t>6 ? 1 : 0.6;
    ctx.font='700 12px Arial'; ctx.fillStyle=rgbaC('#9dd88a', (0.5+0.5*pulse)*urge); ctx.textAlign='right';
    ctx.fillText(tutText({fr:'▸ à vous de jouer',en:'▸ your turn'}), bx+bw-pad, byB+btnH/2+4);
  }
  ctx.textAlign='left';
  if (TUT.confirmSkip) drawTutConfirm();
}
function drawTutConfirm(){
  ctx.fillStyle='rgba(8,6,6,0.72)'; ctx.fillRect(0,0,W,H);
  const bw=Math.min(460,W-40), bh=176, bx=(W-bw)/2, by=(H-bh)/2;
  ctx.fillStyle='#16100e'; rr(bx,by,bw,bh,10); ctx.fill();
  ctx.strokeStyle='#a8281e'; ctx.lineWidth=2; rr(bx,by,bw,bh,10); ctx.stroke();
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.font='700 16px Arial'; ctx.fillStyle='#e8e0d2';
  ctx.fillText(tutText({fr:'Passer le tutoriel ?',en:'Skip the tutorial?'}), W/2, by+36);
  ctx.font='13px Arial'; ctx.fillStyle='#c4bcb0';
  const lines = tutWrap(tutText({fr:"Vous pourrez le relancer depuis l'onglet TUTORIEL du menu.",
                                 en:"You can restart it from the TUTORIAL tab in the menu."}), bw-50, '13px Arial');
  let ty = by+62; for (const ln of lines){ ctx.fillText(ln, W/2, ty); ty += 18; }
  const btnH=34, byB=by+bh-btnH-16, bwB=(bw-44)/2;
  ctx.fillStyle='rgba(168,40,30,0.92)'; rr(bx+16, byB, bwB, btnH, 7); ctx.fill();
  ctx.font='700 13px Arial'; ctx.fillStyle='#fff';
  ctx.fillText(tutText({fr:'Continuer le tuto',en:'Keep playing'}), bx+16+bwB/2, byB+btnH/2+5);
  ctx.fillStyle='rgba(255,255,255,0.1)'; rr(bx+bw-16-bwB, byB, bwB, btnH, 7); ctx.fill();
  ctx.fillStyle='#d8a0a0';
  ctx.fillText(tutText({fr:'Oui, passer',en:'Yes, skip'}), bx+bw-16-bwB/2, byB+btnH/2+5);
  ctx.textAlign='left';
  TUT.confirmRects = [ {key:'no', x:bx+16, y:byB, w:bwB, h:btnH},
                       {key:'yes', x:bx+bw-16-bwB, y:byB, w:bwB, h:btnH} ];
}
// clic sur les boutons de la carte du tuto (renvoie true si consommé) — appelé par 22-input.js
function tutHandleTap(sx, sy){
  if (!game || !game.tut || !TUT) return false;
  if (TUT.confirmSkip){
    for (const r of (TUT.confirmRects||[])) if (inRect(sx,sy,r)){
      if (r.key==='yes'){ sfx('sel'); endTutorial(); } else { sfx('sel'); TUT.confirmSkip=false; }
      return true;
    }
    return true;   // modal : rien d'autre n'est cliquable
  }
  for (const r of (TUT.uiRects||[])) if (inRect(sx,sy,r)){
    if (r.key==='skip'){ sfx('sel'); TUT.confirmSkip=true; }
    else if (r.key==='cont'){ sfx('sel'); tutBeginAct(); }
    return true;
  }
  return false;   // sinon : le clic atteint le jeu normalement
}
// contenu de l'onglet TUTORIEL du menu
function refreshTutoPage(){
  const intro = document.getElementById('tutoIntro');
  if (intro) intro.innerHTML = tutText({
    fr:"<h3>APPRENEZ EN JOUANT</h3>Un tutoriel interactif vous guide pas à pas dans une vraie partie : économie, recrutement, contrôle des troupes, ordres, améliorations, pouvoirs, évolution et héros. Vous pouvez le quitter à tout moment.",
    en:"<h3>LEARN BY PLAYING</h3>An interactive tutorial guides you step by step through a real match: economy, recruitment, troop control, orders, upgrades, powers, evolution and hero. Leave anytime."
  });
  const btn = document.getElementById('tutoStartBtn');
  if (btn) btn.textContent = tutText({fr:"▶ COMMENCER LE TUTORIEL", en:"▶ START THE TUTORIAL"});
}
