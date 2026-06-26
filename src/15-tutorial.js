/* =====================================================================
   TUTORIEL SCRIPTÉ INTERACTIF
   Une vraie mini-partie accélérée et scriptée : ennemi non-IA (vagues
   scriptées), impossible de perdre, ressources offertes au fil des
   étapes, verrouillage doux (halo + flèche sur le seul contrôle
   enseigné). Textes FR + EN ; les autres langues retombent sur le FR.
   ===================================================================== */
function tutText(o){ return o[SETTINGS.lang] || o.en || o.fr; }
function tutGrant(f,m,w){ const p=game.p; if(f)p.f=Math.max(p.f,f); if(m)p.m=Math.max(p.m,m); if(w)p.w=Math.max(p.w,w); }
function tutCam(wx){ camFollow=false; camX=clamp(wx - VW()/2, 0, WORLD-VW()); }
function tutCount(role){ const p=game.p;
  return p.units.filter(u=>u.role===role).length + p.queue.filter(q=>ROLES[q].key===role).length; }
function tutHasBuild(type){ const p=game.p;
  for (const s of sideBuildSlots(p)) if (s.b && (s.b.type===type || s.b.buildType===type)) return true;
  return false; }
function tutEmptySlot(){ const p=game.p;
  let s = p.slots.find(s=>!s.b); if (s) return s;
  for (const n of game.neut) if (!n.b && n.owner!==game.e) return n;
  return null; }
function tutHudRect(match){ for (const b of HUD.btns) if (match(b)) return {x:b.x,y:b.y,w:b.w,h:b.h}; return null; }
// descripteur d'action associé à un bouton de HUD (pour savoir s'il fait partie de la leçon en cours)
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
function tutWorldRect(wx){ const sx=w2sX(wx), gy=w2sY(gY(wx)); return {x:sx-46, y:gy-100, w:92, h:108}; }
function tutSpawnWave(){
  const e=game.e; e.stance='charge';
  const baseX = game.p.x + 1150;
  for (let k=0;k<3;k++) spawnUnit(e, (k%2===0?0:2), false, baseX + k*70);
}
// --- définition des étapes (les closures sont évaluées une fois le jeu lancé) ---
// v1.5 : tutoriel ENTIÈREMENT GUIDÉ — pause forcée + lecture entre CHAQUE action, surbrillance
// de l'unique élément à utiliser (le reste de l'interface est masqué), et chaque commande du jeu
// est mise en pratique une fois (lasso, sélection, groupe, formation, upgrades, ressources, cataclysme).
const TUT_STEPS = [
  { // 0 — accueil & objectif
    tap:true,
    text:{fr:"Bienvenue, commandant. Objectif : détruire la base ennemie à droite. En haut, vos ressources — 🌾 nourriture, 🪙 argent, 💧 eau — et leur revenu par seconde.",
          en:"Welcome, commander. Goal: destroy the enemy base on the right. Top bar: your resources — 🌾 food, 🪙 money, 💧 water — and income per second."},
    focus:()=>({x:0,y:0,w:Math.min(320,W),h:38}),
  },
  { // 1 — ferme (🌾)
    text:{fr:"Tout commence par l'ÉCONOMIE. Touchez le socle « + » surligné devant votre base et construisez une 🌾 FERME. Chaque ferme produit +4 🌾/s — la nourriture sert à recruter et entretenir vos troupes.",
          en:"Everything starts with the ECONOMY. Tap the highlighted \"+\" pad in front of your base and build a 🌾 FARM. Each farm yields +4 🌾/s — food is used to recruit and sustain your troops."},
    obj:{fr:"Construisez une ferme",en:"Build a farm"},
    enter:()=>{ tutGrant(300,300,120); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='farmF',
    done:()=>tutHasBuild('farmF'),
  },
  { // 2 — marché (🪙)
    text:{fr:"Construisez maintenant un 🪙 MARCHÉ sur le socle surligné. Il produit +4 🪙/s : l'argent paie le recrutement de vos troupes et la construction de vos bâtiments.",
          en:"Now build a 🪙 MARKET on the highlighted pad. It yields +4 🪙/s: money pays for recruiting troops and constructing buildings."},
    obj:{fr:"Construisez un marché",en:"Build a market"},
    enter:()=>{ tutGrant(300,300,120); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='farmM',
    done:()=>tutHasBuild('farmM'),
  },
  { // 3 — puits (⛲) + bonus de longévité
    text:{fr:"Enfin un ⛲ PUITS sur le dernier socle (+3 💧/s). Astuce : un bâtiment gardé en vie monte en régime — jusqu'à ×3. Protégez et réparez vos fermes !",
          en:"Finally a ⛲ WELL on the last pad (+3 💧/s). Tip: a building kept alive ramps up — up to ×3 output. Protect and repair your farms!"},
    obj:{fr:"Construisez un puits",en:"Build a well"},
    enter:()=>{ tutGrant(300,300,120); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='well',
    done:()=>tutHasBuild('well'),
  },
  { // 4 — mêlée ×2
    text:{fr:"Une économie sans armée ne tient pas. En bas : la barre de recrutement. Recrutez DEUX unités de ⚔ MÊLÉE (bouton surligné) : rapides et résistantes au corps-à-corps, elles forment votre première ligne.",
          en:"An economy without an army won't last. At the bottom: the recruit bar. Recruit TWO ⚔ MELEE units (highlighted button): fast and tough up close, they form your front line."},
    obj:{fr:"Recrutez 2 unités de mêlée",en:"Recruit 2 melee units"},
    enter:()=>{ tutGrant(600,400,120); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===0),
    allow:a=>a.t==='buy'&&a.i===0,
    done:()=>tutCount('melee')>=2,
  },
  { // 5 — tireurs ×2
    text:{fr:"Recrutez maintenant DEUX 🏹 TIREURS : fragiles, mais ils frappent de loin. Une bonne armée MÊLE toujours corps-à-corps (devant) et distance (derrière).",
          en:"Now recruit TWO 🏹 RANGED units: fragile, but they strike from afar. A good army always MIXES melee (front) and ranged (back)."},
    obj:{fr:"Recrutez 2 tireurs",en:"Recruit 2 ranged units"},
    enter:()=>{ tutGrant(400,600,120); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===2),
    allow:a=>a.t==='buy'&&a.i===2,
    done:()=>tutCount('ranged')>=2,
  },
  { // 6 — aérien ×1
    text:{fr:"Ajoutez une unité 🦅 AÉRIENNE : elle survole le sol et ignore la mêlée — parfaite pour contourner les murs et harceler l'arrière ennemi.",
          en:"Add one 🦅 AIR unit: it flies over the ground and ignores melee — perfect to bypass walls and harass the enemy backline."},
    obj:{fr:"Recrutez 1 unité aérienne",en:"Recruit 1 air unit"},
    enter:()=>{ tutGrant(400,600,200); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===4),
    allow:a=>a.t==='buy'&&a.i===4,
    done:()=>tutCount('air')>=1,
  },
  { // 7 — sélection d'une unité (contrôle individuel)
    text:{fr:"Place au CONTRÔLE. Touchez l'une de vos unités sur le terrain pour la SÉLECTIONNER — un cadre apparaît autour d'elle. Une unité sélectionnée obéit à vos ordres individuels.",
          en:"Time for CONTROL. Tap one of your units on the field to SELECT it — a frame appears around it. A selected unit obeys your individual orders."},
    obj:{fr:"Sélectionnez une unité",en:"Select a unit"},
    enter:()=>{ camFollow=false; camX=0; game.p.stance='hold'; game.sel.clear(); },
    focus:()=>{ const u=game.p.units.find(x=>!x.fly)||game.p.units[0]; return u? tutWorldRect(u.x):null; },
    done:()=>game.sel.size>=1,
  },
  { // 8 — lasso (sélection de groupe)
    text:{fr:"Pour sélectionner TOUT un groupe d'un seul geste, utilisez le ⬚ LASSO : touchez le bouton surligné, puis tracez un rectangle autour de plusieurs de vos troupes.",
          en:"To select a WHOLE group at once, use the ⬚ LASSO: tap the highlighted button, then drag a rectangle around several of your troops."},
    obj:{fr:"Sélectionnez un groupe au lasso",en:"Lasso-select a group"},
    enter:()=>{ camFollow=false; camX=0; game.sel.clear(); selMode=false; },
    focus:()=>tutHudRect(b=>b.type==='lasso'),
    allow:a=>a.t==='lasso',
    done:()=>game.sel.size>=2,
  },
  { // 9 — formation
    text:{fr:"Avec un groupe, activez la ⚏ FORMATION : vos troupes se rangent automatiquement — mêlée devant, tireurs au centre, artillerie au fond. Bien plus solide qu'une cohue désordonnée.",
          en:"With a group, toggle ⚏ FORMATION: your troops auto-arrange — melee front, ranged center, artillery back. Far sturdier than a disorganized mob."},
    obj:{fr:"Activez la formation",en:"Enable formation"},
    enter:()=>{ camFollow=false; camX=0; game.p.formation=false; },
    focus:()=>tutHudRect(b=>b.type==='formation'),
    allow:a=>a.t==='formation',
    done:()=>game.p.formation===true,
  },
  { // 10 — ordre de groupe (charger)
    text:{fr:"Vos unités sélectionnées agissent ENSEMBLE. Donnez-leur l'ordre ⚔ CHARGER (bouton surligné) pour les lancer vers l'ennemi. ✋ Tenir et ↩ Replier complètent vos ordres.",
          en:"Your selected units act TOGETHER. Give them the ⚔ CHARGE order (highlighted button) to send them at the enemy. ✋ Hold and ↩ Retreat round out your orders."},
    obj:{fr:"Ordonnez la charge au groupe",en:"Order the group to charge"},
    enter:()=>{ camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='stance'&&b.st==='charge'),
    allow:a=>a.t==='stance',
    done:()=>game.p.stance==='charge'||game.p.units.some(u=>u.ord==='charge'),
  },
  { // 11 — capturer un lac
    text:{fr:"L'eau, c'est la vie. Menez vos troupes près d'un 💧 LAC et restez à proximité pour le CAPTURER : il vous fournira de l'eau en continu — et un peu d'expérience ✦.",
          en:"Water is life. Lead your troops near a 💧 LAKE and stay close to CAPTURE it: it supplies water continuously — and a bit of experience ✦."},
    obj:{fr:"Capturez un lac",en:"Capture a lake"},
    enter:()=>{ const n=game.nodes[0]; n.prog=0.85; game.p.stance='charge';
      for (const u of game.p.units) if(!u.fly){ u.x=Math.max(u.x, n.x-60); u.tx=u.x; }
      tutCam(n.x); TUT.frozen=false; },  // la capture nécessite que le monde tourne
    focus:()=>tutWorldRect(game.nodes[0].x),
    done:()=>game.nodes.some(n=>n.owner==='p'),
  },
  { // 12 — vague ennemie (texte)
    tap:true,
    text:{fr:"⚠ Une vague ennemie surgit ! Apprenons à nous défendre.",
          en:"⚠ An enemy wave appears! Let's learn to defend."},
    enter:()=>{ tutSpawnWave(); game.shake=6; sfx('boom');   // brève secousse (retombe même gelé)
      announce(tutText({fr:'⚠ VAGUE ENNEMIE',en:'⚠ ENEMY WAVE'}), '#ff5a4a');
      // pan vers l'ennemi pour qu'il soit visible, puis la carte + le bouton Continuer restent accessibles
      const e=game.e.units[0]; if(e) tutCam(e.x-200); },
    focus:()=>null,  // pas de spotlight : évite le voile quasi-total qui masquait le bouton Continuer
  },
  { // 13 — muraille
    text:{fr:"Bloquez leur avance : construisez une 🧱 MURAILLE sur le socle surligné. Solide, elle encaisse les coups à la place de vos troupes.",
          en:"Block their advance: build a 🧱 WALL on the highlighted pad. Sturdy, it takes hits instead of your troops."},
    obj:{fr:"Construisez une muraille",en:"Build a wall"},
    enter:()=>{ tutGrant(300,300,120); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='wall',
    done:()=>tutHasBuild('wall'),
  },
  { // 14 — tourelle
    text:{fr:"Ajoutez une 🗼 TOURELLE sur le socle surligné : elle tire automatiquement sur tout ennemi à portée.",
          en:"Add a 🗼 TURRET on the highlighted pad: it automatically fires at any enemy in range."},
    obj:{fr:"Construisez une tourelle",en:"Build a turret"},
    enter:()=>{ tutGrant(300,400,120); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='turret',
    done:()=>tutHasBuild('turret'),
  },
  { // 15 — garnison (explication)
    tap:true,
    text:{fr:"À SAVOIR : murailles et tourelles peuvent ABRITER un tireur. Touchez-en une, puis « Garnison » — perché et protégé, il tire de plus loin et survit bien mieux.",
          en:"GOOD TO KNOW: walls and turrets can GARRISON a shooter. Tap one, then \"Garrison\" — elevated and protected, it shoots farther and survives far better."},
    focus:()=>{ for (const s of sideBuildSlots(game.p)) if (s.b && (s.b.type==='turret'||s.b.type==='wall')) return tutWorldRect(s.x); return null; },
  },
  { // 16 — amélioration de classe (upgrades)
    text:{fr:"Renforcez durablement vos troupes : touchez le petit ⬆ dans le coin du bouton ⚔ MÊLÉE pour AMÉLIORER toute la classe (+50 % d'effet). Les améliorations se cumulent jusqu'au niveau 3.",
          en:"Permanently strengthen your troops: tap the small ⬆ in the corner of the ⚔ MELEE button to UPGRADE the whole class (+50% effect). Upgrades stack up to level 3."},
    obj:{fr:"Améliorez la classe mêlée (⬆)",en:"Upgrade the melee class (⬆)"},
    enter:()=>{ tutGrant(600,1200,200); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===0),
    allow:a=>a.t==='upg'||(a.t==='buy'&&a.i===0),
    done:()=>(game.p.upg.melee||0)>=1,
  },
  { // 17 — gestion des ressources : capacité d'armée
    text:{fr:"GÉRER ses ressources, c'est aussi savoir INVESTIR. Touchez 📈 CAPACITÉ pour dépenser de l'argent et de l'eau et faire passer votre armée de 30 à 40 unités. Dépenser au bon moment décide d'une partie.",
          en:"MANAGING resources also means INVESTING. Tap 📈 CAPACITY to spend money and water and raise your army cap from 30 to 40 units. Spending at the right time decides a match."},
    obj:{fr:"Augmentez votre capacité d'armée",en:"Raise your army capacity"},
    enter:()=>{ tutGrant(400,800,400); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='cap'),
    allow:a=>a.t==='cap',
    done:()=>game.p.capUp===true,
  },
  { // 18 — expérience & pouvoir ultime
    text:{fr:"L'EXPÉRIENCE ✦ se gagne au combat, en tenant lacs et zones, et en fortifiant votre base. Elle alimente votre POUVOIR ULTIME : il est prêt — lancez-le avec ✸.",
          en:"EXPERIENCE ✦ comes from combat, holding lakes and zones, and fortifying your base. It powers your ULTIMATE: it's ready — unleash it with ✸."},
    obj:{fr:"Lancez votre pouvoir ultime",en:"Unleash your ultimate"},
    enter:()=>{ const p=game.p; p.specialCd=0; p.xp=Math.max(p.xp, specialXpCost(p)+20); TUT.specBase=game.specialsUsed; camFollow=true; },
    focus:()=>tutHudRect(b=>b.type==='special'),
    allow:a=>a.t==='special',
    done:()=>game.specialsUsed>(TUT.specBase||0),
  },
  { // 19 — évolution d'ère
    text:{fr:"L'expérience ✦ permet aussi d'ÉVOLUER : changer d'ère rend TOUTES vos forces plus puissantes et débloque de nouvelles unités. Vous avez assez d'✦ : touchez ⚡ ÉVOLUER.",
          en:"Experience ✦ also lets you EVOLVE: advancing an era makes ALL your forces stronger and unlocks new units. You have enough ✦: tap ⚡ EVOLVE."},
    obj:{fr:"Évoluez vers l'ère suivante",en:"Evolve to the next era"},
    enter:()=>{ const p=game.p; TUT.eraBase=p.era; p.xp=Math.max(p.xp, EVOLVE_XP[Math.min(p.era+1,4)]+20); },
    focus:()=>tutHudRect(b=>b.type==='evolve'),
    allow:a=>a.t==='evolve',
    done:()=>game.p.era>(TUT.eraBase||0),
  },
  { // 20 — cataclysme (démonstration)
    tap:true,
    text:{fr:"Le MONDE est un adversaire : des CATACLYSMES frappent les deux camps (tempêtes, crues, frappes nucléaires). En voici un — adaptez toujours votre stratégie.",
          en:"The WORLD is an opponent: CATACLYSMS strike both sides (storms, floods, nukes). Here's one — always adapt your strategy."},
    enter:()=>{ if (typeof startCata==='function') startCata('sand'); camFollow=false; camX=0; },
    focus:()=>null,
  },
  { // 21 — héros légendaire
    text:{fr:"Une fois par partie, invoquez votre HÉROS légendaire — 🦸 Che Guevara — qui décuple la force de toute votre armée tant qu'il vit. Touchez le bouton héros surligné.",
          en:"Once per game, summon your legendary HERO — 🦸 Che Guevara — who massively boosts your whole army while alive. Tap the highlighted hero button."},
    obj:{fr:"Invoquez votre héros",en:"Summon your hero"},
    enter:()=>{ const p=game.p; p.heroCd=0; tutGrant(900,900,300); camFollow=true; },
    focus:()=>tutHudRect(b=>b.type==='hero'),
    allow:a=>a.t==='hero',
    done:()=>game.p.units.some(u=>u.role==='hero'),
  },
  { // 22 — assaut final
    text:{fr:"Tout est en place. À l'assaut ! Ordonnez la ⚔ CHARGE et menez vos troupes détruire la base ennemie. Recrutez des renforts si besoin.",
          en:"Everything is set. Attack! Order the ⚔ CHARGE and lead your troops to destroy the enemy base. Recruit reinforcements if needed."},
    obj:{fr:"Détruisez la base ennemie",en:"Destroy the enemy base"},
    enter:()=>{ const e=game.e; e.hp=e.maxhp=600; e.stance='hold'; game.p.stance='charge'; tutGrant(800,800,300);
      for (const u of game.p.units) if(!u.fly){ u.x=Math.max(u.x, e.x-1500); u.tx=u.x; }
      camFollow=true; TUT.frozen=false; },  // le combat nécessite que le monde tourne
    focus:()=>tutWorldRect(game.e.x),
    allow:a=>a.t==='stance'||a.t==='buy',
    done:()=>game.e.hp<=0,
  },
  { // 23 — fin
    tap:true,
    text:{fr:"🎉 Tutoriel terminé ! Économie, troupes, ordres, défense, pouvoirs, évolution — tout est entre vos mains. Bonne guerre, commandant !",
          en:"🎉 Tutorial complete! Economy, troops, orders, defense, powers, evolution — it's all yours now. Good war, commander!"},
    enter:()=>{ game.flash=0.6; sfx('evolve'); },
    focus:()=>null,
  },
];
let _tutNudgeT = 0;
function tutNudge(){
  const now = performance.now();
  if (now - _tutNudgeT < 750) return; _tutNudgeT = now;
  sfx('sel');   // pas de secousse ici : répétée, elle ferait vibrer l'écran à chaque clic « à côté »
  announce(tutText({fr:"✦ Suivez le guide — faites l'action surlignée",en:"✦ Follow the guide — do the highlighted action"}), '#ffd34a');
}
// porte du verrouillage doux : true si l'action est permise (hors tuto : toujours true)
function tutGate(a){
  if (!game || !game.tut || !TUT) return true;
  const step = TUT.steps[TUT.i];
  if (step && step.allow && step.allow(a)){
    // Premier geste autorisé → dégeler le monde immédiatement : les cooldowns reprennent,
    // le combat tourne, la capture de lac progresse. Le done() est détecté dans tutTick.
    if (TUT.frozen) TUT.frozen = false;
    return true;
  }
  if (!step || !step.allow){
    if (TUT.frozen) TUT.frozen = false;   // pas de prédicat = tout est permis
    return true;
  }
  tutNudge();
  return false;
}
function tutEnterStep(){
  const step = TUT.steps[TUT.i];
  TUT.t = 0; TUT.uiRects = [];
  // GEL DOUX (TUT.frozen) : le MONDE est figé (pas de combat, pas de temps qui passe), MAIS
  // la caméra et TOUS les clics restent actifs — le joueur peut bâtir / sélectionner / donner
  // des ordres. Le jeu se dégèle tout seul dès que l'action enseignée est détectée (tutTick).
  // Ce n'est PAS une vraie pause : `paused` reste false, donc les handlers d'entrée fonctionnent.
  TUT.frozen = true;
  if (step.enter) step.enter();
}
// Pour les étapes informatives (tap:true) : « Continuer » avance manuellement.
function tutBeginAct(){
  if (!TUT) return;
  const step = TUT.steps[TUT.i];
  if (step.tap){ tutAdvance(); return; }
  // pour les étapes d'action : ne rien faire (auto-détection via tutTick)
}
function tutAdvance(){
  if (!TUT) return;
  TUT.celebrating = false; TUT.celebT = 0;
  const step = TUT.steps[TUT.i];
  if (step && step.allow) TUT.revealed.push(step.allow);  // mémorise les actions déjà enseignées
  if (step.exit) step.exit();
  TUT.i++;
  if (TUT.i >= TUT.steps.length){ endTutorial(); return; }
  tutEnterStep();
}
function tutTick(dt){
  if (!game || !game.tut || !TUT) return;
  TUT.t += dt;
  const step = TUT.steps[TUT.i];
  if (TUT.celebrating){ TUT.celebT += dt; if (TUT.celebT > 0.85) tutAdvance(); return; }
  // L'action du joueur est détectée même pendant le gel doux : il peut bâtir / sélectionner.
  if (step.tick) step.tick(dt);
  if (!step.tap && step.done && step.done()){
    TUT.frozen = false;   // dégel : le monde repart le temps de la petite célébration (0.85 s)
    TUT.celebrating = true; TUT.celebT = 0; sfx('cap');
    const cx = s2wX(W/2); addFloater(cx, gY(cx)-160, '✓', '#9dc88a', 22);
  }
}
function tutLocApply(){
  // v1.5 : le tutoriel a été réécrit/réordonné. Les traductions TUT_L10N (es/de/it/pt/ru/zh/ar)
  // étaient indexées sur les ANCIENNES étapes — les réappliquer mélangerait les textes. On s'appuie
  // donc sur le repli FR/EN intégré à chaque étape (tutText : lang → en → fr) en attendant une
  // retraduction complète. Désactivé volontairement.
  return;
}
function startTutorial(){
  tutLocApply(); audioInit(); musicStart(); goFullscreen();
  closeNetUI(); $('menu').style.display='none'; $('endscreen').style.display='none';
  intro = -1; pendingStart = null; netDisconnect();
  newGame('HUM', 0, false);          // Humanité, difficulté Facile, sans case « guidé »
  game.tut = true;
  game.speed = 1;
  const p = game.p, e = game.e;
  p.stance = 'hold';
  e.stance = 'hold';
  e.hp = e.maxhp = 20000;            // base ennemie hors d'atteinte jusqu'à l'assaut final
  camFollow = false; zoom = 1; camX = 0; camClamp();
  TUT = { i:0, t:0, steps:TUT_STEPS, celebrating:false, celebT:0, uiRects:[], confirmRects:[], confirmSkip:false, revealed:[] };
  tutEnterStep();
  announce(tutText({fr:"✦ TUTORIEL — bienvenue, commandant",en:"✦ TUTORIAL — welcome, commander"}), '#ffd34a');
}
function endTutorial(){
  try { localStorage.setItem('agi_tutoSeen','1'); } catch(e){}
  TUT = null;
  game = null; paused = false; netPause = null; buildMenu = null;
  selMode = false; selBox = null; tutoStep = -1; intro = -1; pendingStart = null;
  $('menu').style.display = 'flex';
}
/* ---- rendu du tutoriel (halo + flèche + panneau + confirmation de skip) ---- */
function tutArrow(cx, edgeY, down, pulse){
  const o = (down?1:-1)*(7+5*pulse);
  ctx.fillStyle = '#ffd34a';
  ctx.beginPath();
  if (down){ ctx.moveTo(cx, edgeY-4+o+14); ctx.lineTo(cx-11, edgeY-4+o); ctx.lineTo(cx+11, edgeY-4+o); }
  else      { ctx.moveTo(cx, edgeY+4+o-14); ctx.lineTo(cx-11, edgeY+4+o); ctx.lineTo(cx+11, edgeY+4+o); }
  ctx.closePath(); ctx.fill();
}
function tutWrap(text, maxW, font){
  ctx.font = font;
  const words = text.split(' '); const lines=[]; let cur='';
  for (const w of words){ const test = cur? cur+' '+w : w;
    if (ctx.measureText(test).width > maxW && cur){ lines.push(cur); cur=w; } else cur=test; }
  if (cur) lines.push(cur); return lines;
}
function drawTut(){
  if (!TUT) return;
  const step = TUT.steps[TUT.i];
  const focus = (!TUT.confirmSkip && step.focus) ? step.focus() : null;
  const acc = (game&&game.p&&game.p.fac)? game.p.fac.accent : '#ffd34a';
  const pulse = 0.5 + 0.5*Math.sin(performance.now()/1000*4.5);   // anime même en pause (phase lecture)
  // voile léger + découpe (spotlight) — laisse voir le champ de bataille
  ctx.fillStyle = 'rgba(8,6,10,0.42)';
  let fpad=12, fx=0, fy=0, fw=0, fh=0;
  if (focus){
    fx=focus.x-fpad; fy=focus.y-fpad; fw=focus.w+fpad*2; fh=focus.h+fpad*2;
    ctx.fillRect(0,0,W,Math.max(0,fy));
    ctx.fillRect(0,fy+fh,W,Math.max(0,H-(fy+fh)));
    ctx.fillRect(0,Math.max(0,fy),Math.max(0,fx),fh);
    ctx.fillRect(fx+fw,Math.max(0,fy),Math.max(0,W-(fx+fw)),fh);
    // halo lumineux autour de la cible (additif)
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle=rgbaC(acc,0.55+0.4*pulse);
    ctx.lineWidth=3; ctx.shadowColor=acc; ctx.shadowBlur=16; rr(fx,fy,fw,fh,12); ctx.stroke(); ctx.restore();
  } else {
    ctx.fillRect(0,0,W,H);
  }
  // ---- carte d'instruction COMPACTE — placement DÉFINITIF : ancrée tout en HAUT par défaut.
  // Les cibles actionnables (socles, menu de construction, boutons du HUD) sont TOUJOURS au
  // centre/bas de l'écran ; une carte courte en haut ne les recouvre donc jamais. Elle ne passe
  // en bas que si la cible est dans le tiers HAUT (l'étape « barre de ressources »). ----
  const bw = Math.min(400, W-32), pad = 13, titleH = 15, lineH = 17, btnH = 30;
  const lines = tutWrap(tutText(step.text), bw-pad*2, '13px Arial');
  const objLine = step.obj ? tutText(step.obj) : null;
  const bh = pad + titleH + 10 + lines.length*lineH + 8 + btnH + pad + (objLine?20:0);
  const bx = clamp((W-bw)/2, 12, W-bw-12);
  const focusTop = focus && (focus.y + focus.h*0.5) < H*0.4;   // cible dans le tiers haut ?
  let by = clamp(focusTop ? (H-94-bh) : 44, 12, H-bh-12);
  // flèche de la carte vers la cible
  if (focus){ const cxF=fx+fw/2, fromBelow = by > fy;
    tutArrow(clamp(cxF,bx+20,bx+bw-20), fromBelow? fy+fh : fy, !fromBelow, pulse); }
  TUT.uiRects = [];
  // fond carte LÉGÈREMENT TRANSPARENT (on voit le HUD derrière) + liseré néon de faction.
  // Les clics qui ne touchent pas Passer/Continuer traversent la carte jusqu'au HUD (click-through).
  ctx.save(); ctx.shadowColor='rgba(0,0,0,0.45)'; ctx.shadowBlur=18; ctx.shadowOffsetY=5;
  const pg=ctx.createLinearGradient(bx,by,bx,by+bh); pg.addColorStop(0,'rgba(26,22,30,0.80)'); pg.addColorStop(1,'rgba(14,12,18,0.80)');
  ctx.fillStyle=pg; rr(bx,by,bw,bh,12); ctx.fill(); ctx.restore();
  ctx.save(); ctx.strokeStyle=rgbaC(acc,0.9); ctx.lineWidth=2; ctx.shadowColor=acc; ctx.shadowBlur=8; rr(bx,by,bw,bh,12); ctx.stroke(); ctx.restore();
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
  // en-tête + points de progression
  ctx.font='700 11px Arial'; ctx.fillStyle=acc;
  ctx.fillText('✦ '+tutText({fr:'TUTORIEL',en:'TUTORIAL'}), bx+pad, by+pad+8);
  const dotN=TUT.steps.length, dr=2.4, dgap=7, dtot=dotN*dgap;
  for(let i=0;i<dotN;i++){ ctx.beginPath(); ctx.arc(bx+bw-pad-dtot+i*dgap, by+pad+5, dr, 0,6.283);
    ctx.fillStyle = i===TUT.i? acc : 'rgba(255,255,255,0.22)'; ctx.fill(); }
  ctx.font='13px Arial'; ctx.fillStyle='#ece6da'; let ty = by+pad+titleH+12;
  for (const ln of lines){ ctx.fillText(ln, bx+pad, ty); ty += lineH; }
  if (objLine){ ctx.font='700 12px Arial'; ctx.fillStyle='#9dd88a'; ctx.fillText('▸ '+objLine, bx+pad, ty+3); ty += 20; }
  // boutons (cibles tactiles ≥32)
  const byB = by + bh - pad - btnH, skipW = 150;
  ctx.fillStyle='rgba(255,255,255,0.08)'; rr(bx+pad, byB, skipW, btnH, 7); ctx.fill();
  ctx.font='700 12px Arial'; ctx.fillStyle='#d8a0a0'; ctx.textAlign='center';
  ctx.fillText(tutText({fr:'Passer ✕',en:'Skip ✕'}), bx+pad+skipW/2, byB+btnH/2+4);
  TUT.uiRects.push({key:'skip', x:bx+pad, y:byB, w:skipW, h:btnH});
  if (step.tap){
    // étape informative : bouton « Continuer » pour avancer manuellement
    const contW = 188;
    ctx.save(); ctx.fillStyle=rgbaC(acc,0.95); ctx.shadowColor=acc; ctx.shadowBlur=10; rr(bx+bw-pad-contW, byB, contW, btnH, 7); ctx.fill(); ctx.restore();
    ctx.fillStyle='#14110f'; ctx.font='700 13px Arial';
    ctx.fillText(tutText({fr:'Continuer ▸',en:'Continue ▸'}), bx+bw-pad-contW/2, byB+btnH/2+4);
    TUT.uiRects.push({key:'cont', x:bx+bw-pad-contW, y:byB, w:contW, h:btnH});
  } else {
    // étape d'action : rappel pulsé — le jeu se dégèle automatiquement quand l'action est faite
    ctx.font='700 12px Arial'; ctx.fillStyle=rgbaC('#9dd88a', 0.6+0.4*pulse); ctx.textAlign='right';
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
  const lines = tutWrap(tutText({fr:"Vous pourrez le relancer à tout moment depuis l'onglet TUTORIEL.",
                                 en:"You can restart it anytime from the TUTORIAL tab."}), bw-50, '13px Arial');
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
// présentation de l'onglet TUTORIEL du menu (FR/EN, fallback FR)
function refreshTutoPage(){
  const intro = document.getElementById('tutoIntro');
  if (intro) intro.innerHTML = tutText({
    fr:"<h3>APPRENEZ EN JOUANT</h3>Un tutoriel interactif vous prend par la main dans une vraie mini-partie : économie, recrutement, ordres, défense, pouvoirs, évolution et héros. Vous pouvez le quitter à tout moment.<h3>RAPPEL DES CONTRÔLES</h3>Touchez une <b>unité</b> = son groupe ; le <b>sol</b> = désélection. <b>⬚ Lasso</b> pour choisir précisément. Glisser le terrain = caméra · pincer = zoom. Ordres : <b>⚔ Charger · ✋ Tenir · ↩ Replier</b>. Touchez les <b>socles « + »</b> pour bâtir, vos <b>bâtiments</b> pour les entretenir.",
    en:"<h3>LEARN BY PLAYING</h3>An interactive tutorial walks you through a real mini-match: economy, recruitment, orders, defense, powers, evolution and hero. Leave anytime.<h3>CONTROLS RECAP</h3>Tap a <b>unit</b> = its group ; the <b>ground</b> = deselect. <b>⬚ Lasso</b> to pick precisely. Drag the terrain = camera · pinch = zoom. Orders: <b>⚔ Charge · ✋ Hold · ↩ Retreat</b>. Tap <b>\"+\" pads</b> to build, your <b>buildings</b> to maintain them."
  });
  const btn = document.getElementById('tutoStartBtn');
  if (btn) btn.textContent = tutText({fr:"▶ COMMENCER LE TUTORIEL", en:"▶ START THE TUTORIAL"});
}

let last = performance.now();
function loop(now){
  const dt = Math.min((now-last)/1000, 0.05); last=now;
  // ALERTE PERF : on lisse le FPS ; s'il reste bas longtemps en jeu et que la qualité
  // n'est pas déjà au minimum, on invite UNE fois à la réduire dans les paramètres.
  if (dt>0){ fpsAvg += ((1/dt)-fpsAvg)*0.05;
    if (!fpsWarned && game && !game.over && !paused && SETTINGS.quality!=='low' && game.t>8 && fpsAvg<34){
      fpsWarned=true; announce(tr('perf_warn'), '#ffcf6a'); }
  }
  if (PERF.on){ PERF.fps += ((dt>0?1/dt:60)-PERF.fps)*0.1; PERF.t0 = performance.now(); }
  if (netPause && netPause.active) tickNetPause(dt);   // le décompte de pause tourne en temps réel
  const sp = (game && game.speed) ? game.speed : 1;    // vitesse de jeu (×0.75…×3)
  if (game && game.net==='guest') netGuestTick(dt);    // l'invité ne simule pas : la cadence vient des snapshots de l'hôte
  else if (game && !game.over && !paused && tutoStep<0){
    // on sous-découpe le pas pour le borner (≤0.05 s) : indispensable à ×2/×3 (anti-tunneling)
    let rem = dt * sp;
    while (rem > 1e-4){ const st = Math.min(rem, 0.05); update(st); rem -= st; }
  } else update(dt);                                    // menu / intro / pause / fin : logique inchangée
  if (PERF.on){ const n=performance.now(); PERF.upd += (n-PERF.t0 - PERF.upd)*0.15; PERF.t0=n; }
  // l'hôte diffuse l'état ~12 fois/seconde (cadence en temps réel, indépendante de la vitesse de jeu)
  if (game && game.net==='host' && net && net.peer && !paused && !game.over){
    net.acc += dt;
    if (net.acc >= 0.08){ net.acc = 0; net.sendState({s:serialize(), ev:net.ev}); net.ev = []; }
  }
  // remise à zéro systématique : aucune transformation ne peut fuir d'une frame à l'autre
  ctx.setTransform(SCALE,0,0,SCALE,0,0);
  ctx.fillStyle='#0d0a0a'; ctx.fillRect(0,0,W,H);
  if (PERF.on) PERF.t0 = performance.now();
  try { render(dt); }
  catch(err){ ctx.setTransform(SCALE,0,0,SCALE,0,0); console.error(err); }
  if (PERF.on){ PERF.rend += (performance.now()-PERF.t0 - PERF.rend)*0.15; drawPerfHud(); }
  if (CHEAT.unlocked && CHEAT.open && game && !game.over) drawCheatPanel();
  requestAnimationFrame(loop);
}
// MODE TRICHE (dev) — panneau d'actions de test, n'apparaît qu'une fois déverrouillé
function drawCheatPanel(){
  ctx.setTransform(SCALE,0,0,SCALE,0,0);
  const items = [
    {k:'res',     l:'💰 +10000 ressources'},
    {k:'xp',      l:'✦ +2000 XP'},
    {k:'evolve',  l:'⚡ Évoluer (ère +1)'},
    {k:'special', l:'✸ Pouvoir prêt'},
    {k:'hero',    l:'🦸 Héros dispo + ressources'},
    {k:'mature',  l:'🌾 Fermes au régime max (×3)'},
    {k:'wave',    l:'☠ Vague ennemie (+5)'},
    {k:'god',     l:(CHEAT.god?'🛡 GOD: ON':'🛡 GOD: OFF')},
    {k:'win',     l:'🏆 Gagner (base ennemie)'},
  ];
  const pw=192, rh=24, pad=8, ph=pad*2+18+items.length*rh;
  const px=W-pw-10, py=64;
  ctx.fillStyle='rgba(14,8,16,0.94)'; rr(px,py,pw,ph,7); ctx.fill();
  ctx.strokeStyle='#ff5af0'; ctx.lineWidth=1.4; rr(px,py,pw,ph,7); ctx.stroke();
  ctx.textAlign='left'; ctx.font='700 11px Arial'; ctx.fillStyle='#ff9bf0';
  ctx.fillText('★ TRICHE (DEV) — F9', px+pad, py+pad+8);
  CHEAT.rects = [];
  for (let i=0;i<items.length;i++){
    const it=items[i], y=py+pad+16+i*rh;
    const on = it.k==='god' && CHEAT.god;
    ctx.fillStyle = on? 'rgba(255,90,240,0.22)':'rgba(255,255,255,0.06)';
    rr(px+pad, y, pw-pad*2, rh-4, 4); ctx.fill();
    ctx.fillStyle = '#f0d8f0'; ctx.font='600 11px Arial';
    ctx.fillText(it.l, px+pad+8, y+(rh-4)/2+1);
    CHEAT.rects.push({x:px+pad, y, w:pw-pad*2, h:rh-4, k:it.k});
  }
}
// overlay de diagnostic perf (coin haut-gauche) — n'apparaît que si PERF.on
function drawPerfHud(){
  ctx.setTransform(SCALE,0,0,SCALE,0,0);
  const lines = [
    'FPS '+PERF.fps.toFixed(0)+'  ('+(1000/Math.max(1,PERF.fps)).toFixed(1)+' ms)',
    'sim '+PERF.upd.toFixed(2)+' ms   rendu '+PERF.rend.toFixed(2)+' ms',
    game? ('unités '+(game.p.units.length+game.e.units.length)+'  part '+particles.length
          +'  fx '+(LIGHTS.length+deaths.length+shots.length+projectiles.length)) : 'menu',
    'q='+SETTINGS.quality+(typeof DECOR!=='undefined'?('  décor '+DECOR.length):''),
  ];
  ctx.font='11px monospace'; ctx.textAlign='left'; ctx.textBaseline='top';
  const w=232, h=8+lines.length*15;
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(6,6,w,h);
  ctx.fillStyle = PERF.fps<30? '#ff8a6a' : PERF.fps<50? '#ffcf6a' : '#9dd88a';
  for (let i=0;i<lines.length;i++) ctx.fillText(lines[i], 12, 11+i*15);
  ctx.textBaseline='alphabetic';
}
requestAnimationFrame(loop);