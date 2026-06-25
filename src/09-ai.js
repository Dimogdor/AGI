/* ================= IA ADVERSE ================= */
function aiUpdate(dt){
  const e=game.e, p=game.p, d=game.d;
  game.aiThink -= dt;
  if (game.aiThink>0) return;
  game.aiThink = d.think*(0.5+Math.random()*0.6);
  // évolution dès que possible
  if (e.era<4 && e.xp >= EVOLVE_XP[e.era+1]*(1+d.eraLag)) tryEvolve(e);
  if (e.era>=1) e.formation = true;
  // héros : l'IA le met de côté. Dès qu'une bataille s'engage et qu'il est encore
  // disponible, elle suspend ses dépenses superflues le temps d'amasser son coût,
  // puis l'invoque — sinon elle dilapide tout en troupes et ne l'utilise jamais.
  const hasHero   = e.units.some(u=>u.role==='hero');
  const pPushing  = p.units.some(u=>Math.abs(u.x-e.x)<900);
  const heroReady = e.heroCd<=0 && !hasHero && e.era>=1;
  // décision « collante » : une fois engagée à économiser, l'IA tient bon malgré
  // les accalmies de la bataille, jusqu'à pouvoir payer (puis invoquer) son héros.
  if (heroReady && (e.mode==='push' || pPushing)) e.heroSaving = true;
  if (!heroReady) e.heroSaving = false;
  const heroSave = !!e.heroSaving && !canPay(e, HERO_COST);
  // invocation AVANT toute dépense : sitôt le coût réuni (épargne bouclée) ou une
  // bataille engagée avec les moyens en caisse, le héros entre en scène.
  if (heroReady && canPay(e, HERO_COST) && (e.heroSaving || e.mode==='push' || pPushing || e.trans)) tryHero(e);
  // en TRANSCENDANCE, l'argent/les données sont illimités : l'IA rase ses marchés/serveurs
  // (farmM) devenus inutiles pour libérer la place et reconstruire de l'utile.
  if (e.trans){
    for (const s of sideBuildSlots(e))
      if (s.b && s.b.type==='farmM'){ demolish(s); break; }
  }
  // économie : slots de base puis spots neutres (gelée pendant l'épargne héros)
  const empty = e.slots.find(s=>!s.b);
  if (empty && !heroSave){
    const order = e.trans? ['turret','farmF','well'] : ['farmM','turret','farmF'];
    tryBuild(e, empty, order[e.slots.indexOf(empty)] || 'well');
  } else if (!empty && !heroSave){
    for (const n of game.neut) if (!n.b && Math.random()<0.6){
      // macro : capitalise d'abord (fermes), tour seulement si menacé
      const threatened = game.p.units.some(u=>Math.abs(u.x-n.x)<400);
      const eco = e.trans? (Math.random()<0.5?'farmF':'well')
                         : (game.dev>0.4? 'well' : Math.random()<0.5?'farmM':'farmF');
      tryBuild(e, n, threatened? 'turret' : eco); break;
    }
  }
  // améliore ses fermes et tours quand la caisse le permet
  if (e.m>350 && !heroSave){
    for (const s of sideBuildSlots(e))
      if (s.b && s.b.type!=='site' && (s.b.lvl||1)<3 && tryUpgBuild(e,s)) break;
  }
  // entretien systématique (la base reste toujours réparée ; le reste est suspendu
  // tant que l'IA met de l'argent de côté pour son héros)
  if (e.hp < e.maxhp*0.7) tryRepairBase(e);
  if (!e.autoRepair && e.m>500 && !heroSave) tryAutoRepair(e);
  if ((e.fortLvl||1)<3 && e.m>700 && !heroSave) tryFortify(e);
  if (!heroSave) for (const s of sideBuildSlots(e))
    if (s.b && s.b.type!=='site' && s.b.hp<s.b.maxhp*0.6){ tryRepair(e,s); break; }
  // améliore la classe la moins montée en continu
  if (e.m>300 && !heroSave){
    let bi=-1, bl=9;
    for (let i=0;i<6;i++){
      if (ROLES[i].minEra && e.era<ROLES[i].minEra) continue;
      const l = e.upg[ROLES[i].key]||0;
      if (l<bl){ bl=l; bi=i; }
    }
    if (bi>=0 && bl<3) tryUpgRole(e, bi);
  }
  if (!e.capUp && unitTotal(e)>=22 && !heroSave) tryCapUp(e);
  // dernier recours : l'IA le joue dès qu'il est débloqué
  if (e.lastReady && !e.lastUsed) trySpecial(e);
  // ultime : nettoie dès que le joueur masse des troupes ou pousse vers la base
  if (e.specialCd<=0 && (p.units.length>=5 || pPushing)) trySpecial(e);
  // ----- vagues : accumule en défense, puis pousse en masse -----
  const wave = 7 + game.diff*3 + e.era*2;
  const myN = e.units.filter(u=>u.role!=='support').length;
  let danger=false;
  for (const u of p.units) if (Math.abs(u.x-e.x)<600){ danger=true; break; }
  if (danger || (e.mode!=='push' && myN >= Math.min(wave, e.cap-4))){
    e.mode='push'; setStance(e,'charge');
  } else if (e.mode==='push' && myN < Math.max(3, wave*0.3)){
    e.mode='build'; setStance(e,'hold');
  } else if (e.mode!=='push') setStance(e,'hold');
  // ----- recrutement : contre la composition du joueur (suspendu si l'IA amasse pour son héros) -----
  if (!heroSave){
    const pAir = p.units.filter(u=>u.fly).length;
    const pRanged = p.units.filter(u=>u.range>60 && !u.fly).length;
    const pMelee = p.units.length - pRanged - pAir;
    let pick; const r = Math.random();
    if (pAir>=2 && r<0.45) pick = r<0.25? 4 : 2;        // anti-aérien : aviation/tireurs
    else if (r<0.14) pick = 5;                           // soutien (ruche/médic) à toutes les ères
    else if (pRanged>pMelee+1) pick = r<0.6? 1 : 0;      // tanks contre les tireurs
    else if (pMelee>pRanged+1) pick = r<0.5? 2 : 3;      // tireurs/siège contre la mêlée
    else pick = r<0.3?0 : r<0.5?1 : r<0.7?2 : r<0.85?4 : 3;
    if (!tryBuy(e,pick)){ if (!tryBuy(e,2)) tryBuy(e,0); }
    // recrutement multiple aux hautes difficultés
    if (game.diff>=2) tryBuy(e, Math.floor(Math.random()*4));
    if (game.diff>=3) tryBuy(e, Math.floor(Math.random()*5));
  }
}
