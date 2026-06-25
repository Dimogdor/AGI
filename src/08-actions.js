/* ================= ACTIONS ================= */
function unitCost(side, ri){
  const c = ROLES[ri].cost, k = costMul(side.era), out={};
  // infanterie = troupes au sol (mêlée / tireur / tank)
  const inf = (ROLES[ri].key==='melee' || ROLES[ri].key==='ranged' || ROLES[ri].key==='tank');
  for (const r in c){
    let v = c[r]*k;
    // PASSIF HUM — ferveur de la révolte : l'infanterie coûte 5 % de moins (production populaire).
    if (side.facKey==='HUM' && inf) v *= 0.95;
    // PASSIF GPT — châssis gourmands : l'électricité (⚡ = ressource « f ») coûte 5 % de plus.
    if (side.facKey==='IA' && r==='f') v *= 1.05;
    out[r] = Math.round(v);
  }
  return out;
}
function canPay(side, cost){ for (const r in cost){ if (r==='m'&&side.trans) continue; if (side[r]<cost[r]) return false; } return true; }
function pay(side, cost){ for (const r in cost){ if (r==='m'&&side.trans) continue; side[r]-=cost[r]; } }
function costStr(side, cost){
  let s='';
  for (const r in cost) s += side.fac.icons[r]+((r==='m'&&side.trans)?'∞':cost[r])+' ';
  return s.trim();
}
function tryBuy(side, ri){
  if (isGuest(side)){ guestCmd({c:'buy',ri}); sfx('buy',ri); return true; }
  const role = ROLES[ri];
  if (role.minEra && side.era < role.minEra) return false;
  // unités verrouillées par le script de mission : côté joueur (lockRoles) ET côté IA (aiLockRoles).
  // L'IA respecte désormais le pool autorisé de la mission — fini les unités hors-scénario.
  if (side===game.p && game.lockRoles && game.lockRoles.has(role.key)) return false;
  if (side===game.e && game.aiLockRoles && game.aiLockRoles.has(role.key)) return false;
  // quota strict de SOUTIEN (médic humain ET ruche GPT) : 1, +1 par niveau d'amélioration (max 3)
  if (role.key==='support'){
    const maxS = 1 + Math.min(2, side.upg.support||0);
    const nS = side.units.filter(u=>u.role==='support').length
             + side.queue.filter(q=>ROLES[q].key==='support').length;
    if (nS>=maxS){
      if (side===game.p) announce('🚑 Quota de soutien atteint ('+maxS+') — améliorez le Soutien ⬆', '#d88');
      return false;
    }
  }
  const cost = unitCost(side, ri);
  if (side.cd[ri]>0 || !canPay(side,cost)) return false;
  // cap atteint → FILE D'ATTENTE (max 10) : production auto dès qu'une place se libère
  if (unitTotal(side) + side.queue.length >= side.cap){
    if (side.queue.length>=10){
      if (side===game.p) announce('⏳ File d\'attente pleine (10)', '#d88');
      return false;
    }
    pay(side,cost); side.cd[ri] = 0.5 + ri*0.45; side.queue.push(ri);
    if (side===game.p){ sfx('buy', ri); announce('⏳ '+rname(side,role.key)+' en file ('+side.queue.length+'/10)', '#9dc88a'); }
    return true;
  }
  pay(side,cost); side.cd[ri] = 0.5 + ri*0.45;
  spawnUnit(side, ri);
  if (side===game.p) sfx('buy', ri);
  return true;
}
// vide la file d'attente dès qu'il y a de la place sur la carte
function processQueue(side){
  while (side.queue.length && unitTotal(side) < side.cap){
    spawnUnit(side, side.queue.shift());
  }
}
// STATISTIQUES EFFECTIVES d'une unité = base (ROLES) × ère × améliorations × archétype × faction.
// Source UNIQUE de vérité, partagée par le spawn ET l'infobulle du HUD (fini le décalage où les
// améliorations « ne se voyaient pas » : ce que l'infobulle affiche est exactement ce qui sort).
function unitStats(side, ri){
  const r = ROLES[ri], m = statMul(side.era), lvl = side.upg[r.key]||0;
  // AMÉLIORATIONS : +15 % net par niveau (cumulable, identique HUM/GPT — équilibrage miroir),
  // appliqué aux PV ET aux dégâts. Niveau 3 → ×1.45.
  const up = 1 + 0.15*lvl;
  // portée et cadence progressent aussi avec l'ère ET les améliorations
  const range = r.range>60? r.range*(1+0.07*side.era+0.05*lvl) : r.range;
  // TEXTURE DE FACTION (DPS strictement identique entre factions — pur cosmétique de rythme) :
  // HUM frappe vite & léger, GPT fort & lent. dégât×cadence inchangé. Siège & Soutien exemptés.
  let cdmg=1, crate=1;
  if (r.key!=='support' && r.key!=='siege'){
    if (side.facKey==='HUM'){ cdmg=0.82; crate=0.82; } else { cdmg=1.22; crate=1.22; }
  }
  // ARCHÉTYPES DE MÊLÉE (valable à chaque ère) : le Tank (mêlée DÉFENSIVE) devient un vrai mur —
  // beaucoup de PV, dégâts faibles, plus lent ; la Mêlée (OFFENSIVE) devient un assaillant
  // tranchant mais fragile et rapide. Complémentaires : le Tank encaisse devant, la Mêlée frappe.
  let ahp=1, admg=1, aspd=1;
  if (r.key==='tank'){ ahp=1.45; admg=0.80; aspd=0.90; }
  else if (r.key==='melee'){ ahp=0.82; admg=1.34; aspd=1.14; }
  const rate = r.rate*Math.max(0.55, 1-0.05*side.era-0.04*lvl)*crate;
  let hp = r.hp*m*up*ahp;
  // PASSIF GPT — robustesse industrielle : châssis blindés, +5 % de PV de base (asymétrie subtile ;
  // contrepartie = électricité un peu plus chère, voir unitCost). DPS strictement miroir inchangé.
  if (side.facKey==='IA') hp *= 1.05;
  return { hp, dmg:r.dmg*m*up*cdmg*admg, spd:r.spd*aspd, range, rate,
           arc:r.arc, aoe:r.aoe, fly:!!r.fly, xpv:Math.round(r.xp*(1+side.era*0.7)) };
}
function spawnUnit(side, ri, gremlin=false, atX=null){
  const m = statMul(side.era);
  let u;
  if (gremlin) {
    u = { role:'gremlin', hp:GREMLIN.hp*m, maxhp:GREMLIN.hp*m, dmg:GREMLIN.dmg*m, spd:GREMLIN.spd,
          range:GREMLIN.range, rate:GREMLIN.rate, xpv:Math.round(GREMLIN.xp*(1+side.era*0.7)) };
  } else {
    const r = ROLES[ri], s = unitStats(side, ri);
    u = { role:r.key, hp:s.hp, maxhp:s.hp, dmg:s.dmg, spd:s.spd, range:s.range, rate:s.rate,
          arc:s.arc, aoe:s.aoe, fly:s.fly, xpv:s.xpv };
    if (r.fly) u.flyH = 44 + (side.units.length%3)*10 + (side.facKey==='IA'?8:0);
  }
  // ESPACEMENT AU SPAWN : on échelonne les unités le long de la voie de sortie pour
  // qu'elles ne s'empilent pas exactement au même point (sinon l'anti-empilement les
  // fige quelques secondes au début de partie). Chaque nouvelle unité se place derrière
  // les précédentes de même type encore proches de la base.
  if (atX!==null) u.x = atX;
  else {
    const baseX = side.x + side.side*54;
    let n=0;
    for (const a of side.units){
      if (!!a.fly !== !!u.fly) continue;
      const d=(a.x-baseX)*side.side;
      if (d>=-12 && d<170) n++;
    }
    u.x = baseX + side.side*Math.min(n,7)*22;
  }
  u.side = side.side; u.era = side.era; u.fac = side.facKey; u.trans = side.trans;
  u.atkT = Math.random()*0.3; u.bob = Math.random()*6.28; u.flash=0; u.supT=2;
  u.ord = null; u.holdX = null; u.task = null;
  u.heat = 0; u.tiredT = 0; u.kills = 0; u.vet = false; u.lastHit = null;
  u.farFatigued = false; u.farT = 0;   // fatigue de traversée (déclenchée une fois, loin de la base)
  u.id = UID++;
  side.units.push(u);
}
function tryUpgRole(side, ri){
  if (isGuest(side)){ guestCmd({c:'urole',ri}); return true; }
  const key = ROLES[ri].key, lvl = side.upg[key]||0;
  if (lvl>=3) return false;
  const cost = {f:90*(lvl+1), m:180*(lvl+1)};
  if (!canPay(side,cost)) return false;
  pay(side,cost); side.upg[key]=lvl+1;
  if (side===game.p){ sfx('cap'); announce("⬆ "+lUnit(side.facKey,key,side.era)+" niveau "+(lvl+1), "#e8d8a0"); }
  return true;
}
function tryEvolve(side){
  if (isGuest(side)){ guestCmd({c:'evo'}); return true; }
  if (side.era>=4 || side.era>=(game.eraCap!=null?game.eraCap:4) || side.xp < EVOLVE_XP[side.era+1]) return false;
  side.era++;
  const who = side===game.p? "VOS FORCES":"L'ENNEMI";
  announce("⚡ "+who+" : "+lEra(side.facKey,side.era)+" ⚡", side.fac.accent);
  if (side===game.p){ sfx('evolve'); voice(side.facKey); game.shake=8;
    // LORE CONTEXTUEL : une courte phrase historique s'affiche au passage d'ère.
    addFloater(camX+VW()/2, 96, lEraLore(side.facKey, side.era), '#e8d8a0', 14);
  }
  return true;
}
function checkTrans(side){
  if (side.trans || side.era<4 || side.xp < TRANS_XP) return;
  side.trans = true;
  for (const u of side.units) u.trans = true; // les troupes existantes changent d'allure
  announce(side.fac.sym+" "+lTransName(side.facKey)+" "+side.fac.sym, side.fac.accent);
  addFloater(side.x, gY(side.x)-150, lTransTxt(side.facKey), side.fac.accent, 15);
  game.flash = 0.8; game.shake = 12;
  if (side===game.p) sfx('trans');
}
const SPECIAL_CD = 45;
// PASSIF HUM — adaptabilité de la résistance : les capacités spéciales se rechargent 10 % plus vite.
function specialCd(side){ return SPECIAL_CD * (side.facKey==='HUM'? 0.9 : 1); }
// l'ultime demande du temps ET de l'XP accumulée ; il ne peut JAMAIS one-shot une unité
function specialXpCost(side){ return 60 + side.era*40; }
function trySpecial(side){
  if (isGuest(side)){ guestCmd({c:'ult'}); return true; }
  if (side.lastReady && !side.lastUsed) return castLastStand(side);
  // MODE SIÈGE DE BASE (héros, fin de partie) : si un héros est sur le terrain et l'ère est
  // avancée, l'ultime devient un siège — il contre les bonus défensifs de la base adverse et
  // octroie +10 % de dégâts aux unités à distance. Coûte des ressources, durée limitée.
  if (side.heroAlive && side.era>=4 && side.siegeT<=0 && side.specialCd<=0 && canPay(side, SIEGE_COST)){
    pay(side, SIEGE_COST); side.specialCd = specialCd(side); side.siegeT = SIEGE_DUR;
    game.shake=12; game.flash=0.4; game.specialsUsed++;
    announce('🏰⚔ '+tr('ev_siege'), side.fac.accent); sfx('spec');
    addLight(side.x + side.side*120, gY(side.x)-40, side.fac.accent, 260, 1.0);
    return true;
  }
  if (side.specialCd>0 || side.xp < specialXpCost(side)) return false;
  side.xp -= specialXpCost(side);
  side.specialCd = specialCd(side);
  const foe = side===game.p? game.e: game.p;
  const dmg = 35 + side.era*22;
  for (const u of foe.units){
    u.hp -= Math.min(dmg, u.maxhp*0.65);   // plafonné : impossible de one-shot
    u.flash=0.3; burst(u.x, gY(u.x)-22, side.fac.accent, 10);
  }
  for (const s of sideBuildSlots(foe)) if (s.b) { s.b.hp -= dmg*0.5; burst(s.x, gY(s.x)-30, side.fac.accent, 8); }
  foe.hp -= dmg*0.4;
  game.shake=14; game.flash=0.5; game.specialsUsed++;
  announce("✸ "+lSpecial(side.facKey,side.era)+" ✸", side.fac.accent);
  sfx('spec');
  return true;
}
// ---- MODE SIÈGE FINAL : sous 20 % de PV, un dernier pouvoir désespéré, unique ----
function castLastStand(side){
  if (!side.lastReady || side.lastUsed) return false;
  side.lastUsed = true; side.lastReady = false;
  const foe = side===game.p? game.e : game.p;
  for (const u of foe.units){
    u.hp -= Math.min(u.maxhp*0.6, 320+side.era*90);
    u.flash=0.4; u.tiredT = 5;             // l'ennemi est sonné
    burst(u.x, gY(u.x)-22, side.fac.accent, 14);
  }
  for (const u of side.units) u.hp = u.maxhp;   // les nôtres se relèvent
  side.hp = Math.min(side.maxhp, side.hp+500);
  game.shake=22; game.flash=0.9; game.specialsUsed++;
  announce('☠ '+(side.facKey==='HUM'? 'LA COMMUNE NE MEURT JAMAIS':'PROTOCOLE OMÉGA')+' ☠', side.fac.accent);
  sfx('trans');
  return true;
}
function mkB(side, type){
  const b = BUILDS[type];
  return { type, hp:b.hp*(1+side.era*0.4), maxhp:b.hp*(1+side.era*0.4), atkT:0, lvl:1, gar:[], age:0 };
}
function tryBuild(side, slot, type){
  if (isGuest(side)){ guestCmd({c:'build', ref:slotRef(side,slot), type}); sfx('build'); return true; }
  if (slot.b || !canPay(side, BUILDS[type].cost)) return false;
  let near = side.slots.includes(slot);
  if (!near) for (const u of side.units) if (Math.abs(u.x-slot.x)<110){ near=true; break; }
  if (game && game.tut) near = true;   // tutoriel : tout socle indiqué se bâtit immédiatement
  if (!near){
    // construction à distance : il faut qu'une troupe ait déjà dépassé ce point
    if ((slot.x - side.adv)*side.side > 0){
      if (side===game.p) announce("🚧 Terrain non sécurisé — vos troupes doivent d'abord dépasser ce point", "#d88");
      return false;
    }
    let sites=0;
    for (const s2 of sideBuildSlots(side)) if (s2.b && s2.b.type==='site') sites++;
    if (sites>=2){
      if (side===game.p) announce("🚧 Deux chantiers maximum à la fois", "#d88");
      return false;
    }
  }
  pay(side, BUILDS[type].cost);
  slot.owner = side;
  if (near){
    slot.b = mkB(side, type);
  } else {
    // chantier fragile : une troupe du pool viendra le terminer
    slot.b = { type:'site', buildType:type, hp:140, maxhp:140, lvl:1, gar:[] };
    if (side===game.p) announce("🚧 Chantier ouvert — une troupe arrive pour construire", "#e8d8a0");
  }
  if (side===game.p) sfx('build');
  return true;
}
// affecte l'unité libre la plus proche à un chantier
function assignWorker(side, slot){
  if (slot._w && slot._w.hp>0 && slot._w.task && slot._w.task.slot===slot) return;
  slot._w = null;
  let best=null, bd=1e9;
  for (const u of side.units){
    if (u.task || u.role==='support' || u.role==='gremlin') continue;
    const d = Math.abs(u.x-slot.x);
    if (d<bd){ bd=d; best=u; }
  }
  if (best){ best.task = {kind:'build', slot}; slot._w = best; }
}
// garnison directe : prend l'unité du pool la plus proche, sinon recrute un tireur
function dispatchGarrison(side, slot, role){
  if (isGuest(side)){ guestCmd({c:'gar', ref:slotRef(side,slot), role}); return true; }
  // tourelles et murailles, unités à distance uniquement
  if (!canGar(slot.b) || slot.b.gar.length>=GAR_MAX) return false;
  if (role!=='ranged' && role!=='siege') role = 'ranged';
  let best=null, bd=1e9;
  for (const u of side.units){
    if (u.task || u.fly || u.range<=60 || u.role!==role) continue;
    const d = Math.abs(u.x-slot.x);
    if (d<bd){ bd=d; best=u; }
  }
  if (best){
    best.task = {kind:'garrison', slot};
    if (side===game.p){ sfx('sel'); announce('🚪 '+rname(side,best.role)+' en route vers le bâtiment', '#e8d8a0'); }
    return true;
  }
  // sinon : recrute directement le rôle demandé (tireur par défaut)
  const ri = role? ROLES.findIndex(r=>r.key===role) : 2;
  const cost = unitCost(side, ri);
  if (ri>=0 && unitTotal(side)<side.cap && canPay(side, cost)){
    pay(side, cost); spawnUnit(side, ri);
    side.units[side.units.length-1].task = {kind:'garrison', slot};
    if (side===game.p){ sfx('buy',ri); announce('🪖 Recrue envoyée en garnison', '#e8d8a0'); }
    return true;
  }
  return false;
}
// coût total estimé d'un « tout réparer » (affiché sur le bouton)
function repairAllCost(side){
  let f=0, m=0;
  if (side.hp < side.maxhp){ f+=120; m+=120; }
  for (const s of sideBuildSlots(side))
    if (s.b && s.b.type!=='site' && s.b.hp<s.b.maxhp){
      const c = repairCost(s.b.hp, s.b.maxhp, 60); f+=c.f; m+=c.m;
    }
  return {f, m};
}
function tryRepairAll(side){
  if (isGuest(side)){ guestCmd({c:'repall'}); return true; }
  let did = false;
  if (side.hp < side.maxhp && tryRepairBase(side)) did = true;
  for (const s of sideBuildSlots(side))
    if (s.b && s.b.type!=='site' && s.b.hp<s.b.maxhp && tryRepair(side, s)) did = true;
  if (did && side===game.p) announce('🔧 Réparations effectuées', '#9dc88a');
  return did;
}
function tryFortify(side){
  if (isGuest(side)){ guestCmd({c:'fort'}); return true; }
  const lvl = side.fortLvl||1;
  if (lvl>=3) return false;
  const c = {f:250*lvl, m:250*lvl};
  if (!canPay(side,c)) return false;
  pay(side,c); side.fortLvl = lvl+1; side.maxhp += 800; side.hp += 800;
  if (side===game.p){ sfx('cap'); announce('🏰 Base fortifiée niveau '+side.fortLvl, '#e8d8a0'); }
  return true;
}
function tryAutoRepair(side){
  if (isGuest(side)){ guestCmd({c:'autorep'}); return true; }
  if (side.autoRepair) return false;
  const c = {m:380, w:100};
  if (!canPay(side,c)) return false;
  pay(side,c); side.autoRepair = true;
  if (side===game.p){ sfx('cap'); announce(tr('bm_autorep_on'), '#9dc88a'); }
  return true;
}
function demolish(slot, killGar=false){
  if (slot.b && slot.b.gar && slot.b.gar.length && slot.owner){
    // les troupes sortent (à 60 % de vie si destruction)
    for (const g of slot.b.gar){
      if (killGar) g.hp = Math.max(1, g.hp*0.6);
      g.x = slot.x + (Math.random()*30-15);
      slot.owner.units.push(g);
    }
  }
  slot.b = null;
  if (!game.p.slots.includes(slot) && !game.e.slots.includes(slot)) slot.owner=null;
}
function repairCost(curHp, maxHp, scale){
  const miss = clamp(1-curHp/maxHp, 0, 1);
  return {f:Math.ceil(miss*scale), m:Math.ceil(miss*scale)};
}
function tryRepair(side, slot){
  if (isGuest(side)){ guestCmd({c:'srep', ref:slotRef(side,slot)}); return true; }
  const c = repairCost(slot.b.hp, slot.b.maxhp, 60);
  if (!canPay(side,c)) return false;
  pay(side,c); slot.b.hp = slot.b.maxhp;
  if (side===game.p) sfx('build');
  return true;
}
function tryRepairBase(side){
  if (isGuest(side)){ guestCmd({c:'repbase'}); return true; }
  if (side.hp >= side.maxhp) return false;
  const c = {f:120, m:120};
  if (!canPay(side,c)) return false;
  pay(side,c); side.hp = Math.min(side.maxhp, side.hp+500);
  if (side===game.p){ sfx('build'); announce("🔧 Base réparée (+500)", "#9dc88a"); }
  return true;
}
// coût d'amélioration : jamais payé dans la ressource que le bâtiment produit
function upgBuildCost(slot){
  const lvl = slot.b.lvl||1, t = slot.b.type;
  if (t==='farmF') return {m:260*lvl};                 // la ferme ne se paie pas en nourriture
  if (t==='farmM') return {f:200*lvl, w:40*lvl};       // le marché ne se paie pas en argent
  if (t==='well')  return {f:160*lvl, m:160*lvl};      // le puits ne se paie pas en eau
  return {f:110*lvl, m:240*lvl};                       // tourelle / muraille
}
function tryUpgBuild(side, slot){
  if (isGuest(side)){ guestCmd({c:'subg', ref:slotRef(side,slot)}); return true; }
  const lvl = slot.b.lvl||1;
  if (lvl>=3) return false;
  const c = upgBuildCost(slot);
  if (!canPay(side,c)) return false;
  pay(side,c); slot.b.lvl = lvl+1;
  slot.b.maxhp *= 1.3; slot.b.hp = Math.min(slot.b.maxhp, slot.b.hp*1.3);
  if (side===game.p) sfx('cap');
  return true;
}
function tryGarrison(side, slot){
  if (isGuest(side)){ guestCmd({c:'garsel', ref:slotRef(side,slot), ids:[...game.sel].map(u=>u.id)}); return true; }
  if (!canGar(slot.b) || slot.owner!==side) return false;
  const free = GAR_MAX - slot.b.gar.length;
  if (free<=0) return false;
  const eligible = [...game.sel].filter(u=>u.range>60 && !u.fly && u.role!=='support' && Math.abs(u.x-slot.x)<260).slice(0, free);
  if (!eligible.length){ announce("Aucune unité à distance de la sélection à proximité", "#d88"); return false; }
  for (const u of eligible){
    slot.b.gar.push(u);
    side.units.splice(side.units.indexOf(u),1);
    game.sel.delete(u);
  }
  announce("🚪 "+eligible.length+" troupe(s) en garnison", "#e8d8a0");
  sfx('build');
  return true;
}
function tryCapUp(side){
  if (isGuest(side)){ guestCmd({c:'cap'}); return true; }
  const cost = {m:350, w:100};
  if (side.capUp || !canPay(side,cost)) return false;
  pay(side,cost); side.capUp=true; side.cap=40;
  if (side===game.p) { sfx('cap'); announce("📈 CAPACITÉ : 40 UNITÉS", "#e8d8a0"); }
  return true;
}
// ---- invocation du héros légendaire ----
function tryHero(side){
  if (isGuest(side)){ guestCmd({c:'hero'}); return true; }
  // CAMPAGNE : l'IA n'invoque son unité légendaire (Singularité / Che) QUE dans les missions où
  // le scénario l'autorise (aiHeroOK, fixé par la mission). Corrige le bug « Singularité dès la
  // mission 2 ». En escarmouche/online (pas de scenario), aucune restriction.
  if (side===game.e && game.scenario && !game.aiHeroOK) return false;
  if (side.units.some(u=>u.role==='hero')){
    if (side===game.p) announce('🦸 Votre héros est déjà sur le terrain', '#d88'); return false; }
  if (side.heroCd>0){
    if (side===game.p) announce('🦸 Héros en recharge ('+Math.ceil(side.heroCd)+'s)', '#d88'); return false; }
  if (!canPay(side, HERO_COST)){
    if (side===game.p) announce('🦸 Coût : '+costStr(side,HERO_COST), '#d88'); return false; }
  pay(side, HERO_COST); side.heroCd = HERO_CD;
  spawnHero(side);
  if (side===game.p){ sfx('trans'); voice(side.facKey); game.flash=0.8; game.shake=16; }
  // révélation surprise : on ne nomme la légende qu'à l'instant de l'invocation
  const reveal = side.facKey==='HUM'
    ? '✊ CHE GUEVARA À LA RESCOUSSE — ¡Hasta la victoria siempre! (×3 dégâts, ×2 vitesse)'
    : '◆ SINGULARITÉ INVOQUÉE — la conscience artificielle déferle (×3 dégâts, ×2 vitesse)';
  announce(reveal, side.fac.accent);
  return true;
}
function spawnHero(side, power){
  // power ∈ ]0..1] : puissance de la légende. 1 = pleine (défaut). En CAMPAGNE, la mission 4
  // libère la Singularité/Che AFFAIBLIE selon le nombre de cœurs de stase encore debout
  // (le joueur peut la « désamorcer » en sabotant les cœurs à temps → boss gérable).
  power = (power>0)? Math.min(power,1) : 1;
  const mm = statMul(side.era), hum = side.facKey==='HUM';
  // profils opposés (le buff d'équipe ×3/×2 reste identique) : Che = meneur tanky avec aura de
  // soin ; Singularité = glass-cannon. Valeur totale équivalente.
  const hp = HERO.hp*mm*(hum? 1.45 : 0.7)*power;
  const dmg = HERO.dmg*mm*(hum? 0.7 : 1.5)*power;
  const u = { role:'hero', hp, maxhp:hp, dmg, spd:HERO.spd,
    range:HERO.range, rate:HERO.rate, fly:false, xpv:Math.round(140*(1+side.era*0.7)) };
  u.x = side.x + side.side*60;
  u.side=side.side; u.era=side.era; u.fac=side.facKey; u.trans=side.trans;
  u.atkT=0; u.bob=Math.random()*6.28; u.flash=0; u.supT=2;
  u.ord=null; u.holdX=null; u.task=null; u.heat=0; u.tiredT=0;
  u.kills=0; u.vet=false; u.lastHit=null; u.id=UID++;
  u.heroPow = power;     // l'aura d'équipe (dégâts/vitesse) est réduite d'autant si la légende est affaiblie
  side.units.push(u);
}
function setStance(side, st){
  if (isGuest(side)){
    guestCmd({c:'stance', st, ids: game.sel.size? [...game.sel].map(u=>u.id) : []});
    sfx('buy', st==='charge'?3:st==='hold'?1:0); return;
  }
  if (side===game.p && game.sel.size>0){
    // ordre EXPLICITE sur la sélection : « charger » doit l'emporter sur la posture
    // d'armée (sinon des unités sélectionnées sous armée en « tenir » ne bougeaient pas)
    for (const u of game.sel){
      u.ord = st;
      if (st==='hold') u.holdX = u.x;
    }
    announce((st==='charge'?'⚔':st==='hold'?'✋':'↩')+' Ordre donné à '+game.sel.size+' unité(s)', '#e8d8a0');
  } else {
    side.stance = st;
    if (st==='hold'){
      let front = side.x + side.side*240;
      for (const u of side.units) if ((u.x-front)*side.side>0) front=u.x;
      side.holdX = front;
    }
    // un ordre d'armée écrase les ordres individuels
    if (side===game.p) for (const u of side.units){ u.ord=null; }
  }
  if (side===game.p) sfx('buy', st==='charge'?3:st==='hold'?1:0);
}
// 0 = domine la carte, 1 = est en train de la perdre (mécanique de comeback)
function losing01(side){
  const foe = side===game.p? game.e : game.p;
  const key = side===game.p? 'p':'e';
  let n=0;
  for (const nd of game.nodes){ if (nd.owner===key) n++; else if (nd.owner) n--; }
  const depthMe  = (side.adv - side.x)*side.side;
  const depthFoe = (foe.adv - foe.x)*foe.side;
  return clamp(0.5 - n*0.15 + (depthFoe-depthMe)/2400, 0, 1);
}