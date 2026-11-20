/* ================= ACTIONS ================= */
function unitCost(side, ri){
  const c = ROLES[ri].cost, k = costMul(side.era), out={};
  // infanterie = troupes au sol (mêlée / tireur / tank)
  const inf = (ROLES[ri].key==='melee' || ROLES[ri].key==='ranged' || ROLES[ri].key==='tank');
  for (const r in c){
    let v = c[r]*k;
    // PASSIF HUM — ferveur de la révolte : l'infanterie coûte 5 % de moins (production populaire).
    if (inf) v *= FAC_TRAITS[side.facKey].infCost;
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
  // quota strict de SOUTIEN (médic humain ET ruche GPT) : 1, +1 par niveau d'amélioration (max 3)
  if (role.key==='support'){
    const maxS = 1 + Math.min(2, side.upg.support||0) + ((side.trans && side.facKey==='HUM' && asymOn('trans'))? ft('HUM','transSup') : 0);
    const nS = side.units.filter(u=>u.role==='support').length
             + side.queue.filter(q=>ROLES[q].key==='support').length;
    if (nS>=maxS){
      if (side===game.p) announce(fmt('a_supquota',{n:maxS}), '#d88');
      return false;
    }
  }
  const cost = unitCost(side, ri);
  if (side.cd[ri]>0 || !canPay(side,cost)) return false;
  // cap atteint → FILE D'ATTENTE (max 10) : production auto dès qu'une place se libère
  if (unitTotal(side) + side.queue.length >= side.cap){
    if (side.queue.length>=10){
      if (side===game.p) announce(tr('a_qfull'), '#d88');
      return false;
    }
    pay(side,cost); side.cd[ri] = 0.5 + ri*0.45; side.queue.push(ri);
    if (side===game.p){ sfx('buy', ri); announce(fmt('a_queued',{name:rname(side,role.key), n:side.queue.length}), '#9dc88a'); }
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
    const T = FAC_TRAITS[side.facKey]; cdmg = asymOn('unit')? T.texDU : T.texD; crate = T.texR;
  }
  // ARCHÉTYPES DE MÊLÉE (valable à chaque ère) : le Tank (mêlée DÉFENSIVE) devient un vrai mur —
  // beaucoup de PV, dégâts faibles, plus lent ; la Mêlée (OFFENSIVE) devient un assaillant
  // tranchant mais fragile et rapide. Complémentaires : le Tank encaisse devant, la Mêlée frappe.
  let ahp=1, admg=1, aspd=1;
  if (r.key==='tank'){ ahp=1.45; admg=0.80; aspd=0.90; }
  else if (r.key==='melee'){ ahp=0.82; admg=1.34; aspd=1.14; }
  const rate = r.rate*Math.max(0.55, 1-0.05*side.era-0.04*lvl)*crate;
  let hp = r.hp*m*up*ahp;
  // PASSIF GPT — robustesse industrielle : châssis blindés, +5 % de PV de base (FAC_TRAITS.IA.hpMul). Il n'a PAS de
  // contrepartie de coût (le commentaire d'origine en promettait une, jamais codée) : sa contrepartie est la surchauffe,
  // plus dure que la fatigue humaine (updateUnits) et, avec `econ`, une économie plus lente à démarrer. Premier levier de
  // réglage de la balance (FACTIONS.md §5) : on le retire si l'IA prend l'avantage au banc.
  if (side.facKey==='IA') hp *= FAC_TRAITS.IA.hpMul;
  return { hp, dmg:r.dmg*m*up*cdmg*admg, spd:r.spd*aspd, range, rate,
           arc:r.arc, aoe:(r.aoe && side.facKey==='IA' && asymOn('unit'))? r.aoe*FAC_TRAITS.IA.siegeAoe : r.aoe, fly:!!r.fly, xpv:Math.round(r.xp*(1+side.era*0.7)) };
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
  u.id = UID++; u._born = game.t;      // l'entrée en scène se joue à la naissance, pas à l'arrivée dans le champ
  side.units.push(u);
}
function tryUpgRole(side, ri){
  if (isGuest(side)){ guestCmd({c:'urole',ri}); return true; }
  const key = ROLES[ri].key, lvl = side.upg[key]||0;
  if (lvl>=3) return false;
  const cost = {f:90*(lvl+1), m:180*(lvl+1)};
  if (!canPay(side,cost)) return false;
  pay(side,cost); side.upg[key]=lvl+1;
  if (side===game.p){ sfx('cap'); announce(fmt('a_upgraded',{name:lUnit(side.facKey,key,side.era), n:lvl+1}), "#e8d8a0"); }
  return true;
}
function tryEvolve(side){
  if (isGuest(side)){ guestCmd({c:'evo'}); return true; }
  if (side.era>=4 || side.era>=(game.eraCap!=null?game.eraCap:4) || side.xp < EVOLVE_XP[side.era+1]) return false;
  side.era++;
  if (side.heroAlive) warmHero(side);           // … et la nouvelle apparence de son héros
  warmArms(side);                               // cuit les bras animés de la nouvelle ère (étalé sur quelques images)
  // onde lumineuse d'évolution : le passage d'ère SE VOIT sur la base (les deux camps)
  addLight(side.x, gY(side.x)-70, side.fac.accent, 340, 0.9);
  burst(side.x, gY(side.x)-60, side.fac.accent, 26, 1.4);
  announce(fmt(side===game.p? 'a_evolve_you':'a_evolve_foe', {era:lEra(side.facKey,side.era)}), side.fac.accent,
    {q:side===game.p? 'a_evolve_you':'a_evolve_foe', v:{era:{L:'era', f:side.facKey, i:side.era}}});
  if (side===game.p){ sfx('evolve'); voice(side.facKey); game.shake=8;
    // LORE CONTEXTUEL : une courte phrase historique s'affiche au passage d'ère.
    addFloaterLocal(camX+VW()/2, 96, lEraLore(side.facKey, side.era), '#e8d8a0', 14);   // (repère d'écran de l'hôte : pas envoyé)
  }
  return true;
}
function checkTrans(side){
  if (side.trans || side.era<4 || side.xp < TRANS_XP) return;
  side.trans = true;
  for (const u of side.units) u.trans = true; // les troupes existantes changent d'allure
  announce(side.fac.sym+" "+lTransName(side.facKey)+" "+side.fac.sym, side.fac.accent, {r:{L:'tn', f:side.facKey}, pr:side.fac.sym+' ', sx:' '+side.fac.sym});
  addFloater(side.x, gY(side.x)-150, lTransTxt(side.facKey), side.fac.accent, 15, {r:{L:'ttx', f:side.facKey}});
  if (asymOn('trans')) addFloater(side.x, gY(side.x)-176, tr(side.facKey==='HUM'? 'f_trans2_hum' : 'f_trans2_ia'), side.fac.accent, 13);
  game.flash = 0.8; game.shake = 12;
  if (side===game.p) sfx('trans');
}
const SPECIAL_CD = 45;
// PASSIF COMMUN aux deux camps : les capacités spéciales se rechargent 5 % plus vite (v1.17 : le commentaire d'origine
// promettait « −10 % pour l'Humanité » alors que le code l'appliquait aux deux camps ; on garde le comportement mesuré,
// sans écart de faction — le pouvoir ✸ se différencie par son effet, voir FACTIONS.md M7).
function specialCd(side){ return SPECIAL_CD * 0.95; }
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
  const pw = asymOn('power');
  // M7 : chaque faction a SON pouvoir — Soulèvement (nombre : 0,7·D partout, mais nos troupes sont soignées) / Frappe chirurgicale (précision)
  const hum = side.facKey==='HUM';
  let elite = null;
  if (pw && !hum){
    const sc = u => (u.role==='hero'? 1e9 : 0) + u.maxhp*u.dmg;
    elite = new Set(foe.units.filter(u=>u.role!=='gremlin').sort((a,b)=>sc(b)-sc(a)).slice(0, ft('IA','strikeN')));
  }
  for (const u of foe.units){
    const k = !pw? 1 : hum? ft('HUM','upDmg') : (elite.has(u)? ft('IA','strikeK') : ft('IA','strikeRest'));
    let dd = dmg*k;
    if (pw && !hum && u.role==='hero') dd = Math.max(dd, u.maxhp*ft('IA','strikeHeroPct'));   // v1.18 : contre le héros, au moins 6 % de ses PV max (172 PV sur 15 120 ne lui faisaient rien)
    u.hp -= Math.min(dd, u.maxhp*0.65);   // plafonné : impossible de one-shot
    u.flash=0.3; burst(u.x, gY(u.x)-22, side.fac.accent, elite && elite.has(u)? 16 : 10);
  }
  if (pw && hum) for (const u of side.units){ u.hp = Math.min(u.maxhp, u.hp + u.maxhp*ft('HUM','upHeal')); u.heat = 0; u.tiredT = 0; burst(u.x, gY(u.x)-22, '#6dff8a', 5, 0.6); }
  for (const s of sideBuildSlots(foe)) if (s.b) { s.b.hp -= dmg*0.5*((pw && !hum)? ft('IA','strikeBld') : 1); burst(s.x, gY(s.x)-30, side.fac.accent, 8); }
  foe.hp -= dmg*0.4;
  game.shake=14; game.flash=0.5; game.specialsUsed++;
  announce("✸ "+lSpecial(side.facKey,side.era)+" ✸", side.fac.accent, {r:{L:'sp', f:side.facKey, i:side.era}, pr:'✸ ', sx:' ✸'});
  if (pw && side===game.p && game.msg){ game.msg.sub = tr(hum? 'a_spec_hum' : 'a_spec_ia'); game.msgT = Math.max(game.msgT||0, 4.2); }   // sous-titre : ce que fait CE pouvoir
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
  announce(tr(side.facKey==='HUM'? 'a_last_hum':'a_last_ia'), side.fac.accent);
  sfx('trans');
  return true;
}
function mkB(side, type){
  const b = BUILDS[type];
  return { type, hp:b.hp*(1+side.era*0.4), maxhp:b.hp*(1+side.era*0.4), atkT:0, lvl:1, gar:[], age:0, fk:side.facKey };
}
// coût d'une construction pour CE camp sur CE socle : M5 (muraille humaine −25 %) et M1 (rebâtir le même type sur une ruine
// de moins de 90 s : −50 % pour l'Humanité). Sert au paiement, au remboursement et à tous les menus.
function ruinActive(side, slot, type){
  const r = slot && slot.ruin;
  return !!(r && side.facKey==='HUM' && asymOn('econ') && r.side===side.side && r.type===type && game.t-r.t <= ft('HUM','rebuildT'));
}
function buildCost(side, type, slot){
  const base = BUILDS[type].cost; let k = 1;
  if (side.facKey==='HUM' && type==='wall' && asymOn('bld')) k *= ft('HUM','wallCost');
  if (ruinActive(side, slot, type)) k *= ft('HUM','rebuildK');
  if (k===1) return base;
  const out = {}; for (const r in base) out[r] = Math.round(base[r]*k);
  return out;
}
const siteMax = side => (side.facKey==='HUM' && asymOn('bld'))? ft('HUM','siteMax') : 2;
function tryBuild(side, slot, type){
  if (isGuest(side)){ guestCmd({c:'build', ref:slotRef(side,slot), type}); sfx('build'); return true; }
  const cost = buildCost(side, type, slot);
  if (slot.b || !canPay(side, cost)) return false;
  let near = side.slots.includes(slot);
  if (!near) for (const u of side.units) if (Math.abs(u.x-slot.x)<110){ near=true; break; }
  if (!near){
    // construction à distance : il faut qu'une troupe ait déjà dépassé ce point
    if ((slot.x - side.adv)*side.side > 0){
      if (side===game.p) announce(tr('a_unsafe'), "#d88");
      return false;
    }
    let sites=0;
    for (const s2 of sideBuildSlots(side)) if (s2.b && s2.b.type==='site') sites++;
    if (sites>=siteMax(side)){
      if (side===game.p) announce(tr('a_twosites'), "#d88");
      return false;
    }
  }
  pay(side, cost);
  if (cost!==BUILDS[type].cost && ruinActive(side, slot, type) && side===game.p) addFloater(slot.x, gY(slot.x)-44, tr('f_rebuild'), '#9dc88a', 12);
  slot.ruin = null;
  slot.owner = side;
  if (near){
    slot.b = mkB(side, type);
    burst(slot.x, gY(slot.x)-14, '#cdbf9a', 8, 0.7);   // poussière de chantier (accompagne le pop)
  } else {
    // chantier fragile : une troupe du pool viendra le terminer
    const sh = (side.facKey==='HUM' && asymOn('bld'))? ft('HUM','siteHp') : 140;
    slot.b = { type:'site', buildType:type, hp:sh, maxhp:sh, lvl:1, gar:[], paid:cost, fk:side.facKey };
    if (side===game.p) announce(tr('a_siteopen'), "#e8d8a0");
  }
  if (side===game.p) sfx('build');
  return true;
}
// affecte l'unité libre la plus proche à un chantier
function assignWorker(side, slot){
  if (slot._w && slot._w.hp>0 && slot._w.task && slot._w.task.slot===slot && side.units.includes(slot._w)) return;
  slot._w = null;
  let best=null, bd=1e9;
  for (const u of side.units){
    if (u.task || u.role==='support' || u.role==='gremlin' || u.role==='hero') continue;
    // de préférence une unité SANS ordre explicite : une troupe postée (⚑, tenir) ne quitte plus son poste
    const d = Math.abs(u.x-slot.x) + (u.ord? 4000 : 0);
    if (d<bd){ bd=d; best=u; }
  }
  if (best){ best.task = {kind:'build', slot}; slot._w = best; }
}
// garnison directe : prend l'unité du pool la plus proche, sinon recrute un tireur
function dispatchGarrison(side, slot, role){
  if (isGuest(side)){ guestCmd({c:'gar', ref:slotRef(side,slot), role}); return true; }
  // tourelles et murailles, unités à distance uniquement. Les places déjà PROMISES (unités en
  // route vers ce bâtiment) comptent : des taps rapides envoyaient 5 recrues vers 2 places libres.
  const enRoute = side.units.filter(u=>u.task && u.task.kind==='garrison' && u.task.slot===slot).length;
  if (!canGar(slot.b) || slot.b.gar.length+enRoute>=garMax(slot.b)) return false;
  if (role!=='ranged' && role!=='siege') role = 'ranged';
  let best=null, bd=1e9;
  for (const u of side.units){
    if (u.task || u.fly || u.range<=60 || u.role!==role) continue;
    const d = Math.abs(u.x-slot.x);
    if (d<bd){ bd=d; best=u; }
  }
  if (best){
    best.task = {kind:'garrison', slot};
    if (side===game.p){ sfx('sel'); announce(fmt('a_garway',{name:rname(side,best.role)}), '#e8d8a0'); }
    return true;
  }
  // sinon : recrute directement le rôle demandé (tireur par défaut)
  const ri = role? ROLES.findIndex(r=>r.key===role) : 2;
  const cost = unitCost(side, ri);
  if (ri>=0 && side.cd[ri]<=0 && unitTotal(side)<side.cap && canPay(side, cost)){   // même délai qu'un recrutement normal
    pay(side, cost); side.cd[ri] = 0.5 + ri*0.45; spawnUnit(side, ri);
    side.units[side.units.length-1].task = {kind:'garrison', slot};
    if (side===game.p){ sfx('buy',ri); announce(tr('a_garrecruit'), '#e8d8a0'); }
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
      const c = repairCost(s.b.hp, s.b.maxhp, 60, side); f+=c.f; m+=c.m;
    }
  return {f, m};
}
function tryRepairAll(side){
  if (isGuest(side)){ guestCmd({c:'repall'}); return true; }
  let did = false;
  if (side.hp < side.maxhp && tryRepairBase(side)) did = true;
  for (const s of sideBuildSlots(side))
    if (s.b && s.b.type!=='site' && s.b.hp<s.b.maxhp && tryRepair(side, s)) did = true;
  if (did && side===game.p) announce(tr('a_repaired'), '#9dc88a');
  return did;
}
function tryFortify(side){
  if (isGuest(side)){ guestCmd({c:'fort'}); return true; }
  const lvl = side.fortLvl||1;
  if (lvl>=3) return false;
  const c = {f:250*lvl, m:250*lvl};
  if (!canPay(side,c)) return false;
  pay(side,c); side.fortLvl = lvl+1; side.maxhp += 800; side.hp += 800;
  if (side===game.p){ sfx('cap'); announce(fmt('a_fortified',{n:side.fortLvl}), '#e8d8a0'); }
  return true;
}
function tryAutoRepair(side){
  if (isGuest(side)){ guestCmd({c:'autorep'}); return true; }
  if (side.autoRepair) return false;
  const c = autoRepCost(side);
  if (!canPay(side,c)) return false;
  pay(side,c); side.autoRepair = true;
  if (side===game.p){ sfx('cap'); announce(tr('bm_autorep_on'), '#9dc88a'); }
  return true;
}
function demolish(slot, killGar=false){
  // chantier ANNULÉ par le joueur : le coût est rendu (un chantier qui s'effondre seul ne rend rien)
  if (slot.b && slot.b.type==='site' && !killGar && slot.owner && slot.b.buildType && BUILDS[slot.b.buildType]){
    const c = slot.b.paid || BUILDS[slot.b.buildType].cost, sd = slot.owner;
    for (const r in c){ if (r==='m' && sd.trans) continue; sd[r] += c[r]; }
  }
  if (slot.b && slot.b.gar && slot.b.gar.length && slot.owner){
    // les troupes sortent (à 60 % de vie si destruction)
    for (const g of slot.b.gar){
      if (killGar) g.hp = Math.max(1, g.hp*0.6);
      g.x = slot.x + (Math.random()*30-15);
      slot.owner.units.push(g);
    }
  }
  // M1 : un bâtiment DÉTRUIT (killGar) laisse une ruine — l'Humanité la rebâtit à moitié prix pendant 90 s ; la machine
  // qui perd un nœud éco voit son bonus réseau tomber à 0 pendant 12 s (« resynchronisation »)
  if (killGar && slot.b && slot.b.type!=='site' && slot.owner && asymOn('econ')){
    const ow = slot.owner;
    if (ow.facKey==='HUM') slot.ruin = { type:slot.b.type, t:game.t, side:ow.side };
    else if (ECO_TYPES[slot.b.type] && ow.facKey==='IA'){ ow.netT = game.t + ft('IA','netCut'); if (ow===game.p) addFloater(slot.x, gY(slot.x)-44, tr('f_netcut'), '#5ad0ff', 12); }
  }
  slot.b = null; slot._w = null;
  for (const sd of [game.p, game.e]) for (const u of sd.units) if (u.task && u.task.slot===slot) u.task = null;
  if (!game.p.slots.includes(slot) && !game.e.slots.includes(slot)) slot.owner=null;
}
function repairCost(curHp, maxHp, scale, side){
  const miss = clamp(1-curHp/maxHp, 0, 1);
  if (side && side.facKey==='HUM' && asymOn('heal')) scale *= FAC_TRAITS.HUM.repairK;   // M3 : réparations −30 % pour l'Humanité
  return {f:Math.ceil(miss*scale), m:Math.ceil(miss*scale)};
}
// M3 : coût et vitesse de la nano-réparation (moins chère et plus rapide pour la machine)
const autoRepCost = side => (side.facKey==='IA' && asymOn('heal'))? FAC_TRAITS.IA.arCost : {m:380, w:100};
const autoRepRate = (side, base) => (side.facKey==='IA' && asymOn('heal'))? (base? FAC_TRAITS.IA.arBase : FAC_TRAITS.IA.arBld) : (base? 8 : 4);
function tryRepair(side, slot){
  if (isGuest(side)){ guestCmd({c:'srep', ref:slotRef(side,slot)}); return true; }
  const c = repairCost(slot.b.hp, slot.b.maxhp, 60, side);
  if (!canPay(side,c)) return false;
  pay(side,c); slot.b.hp = slot.b.maxhp;
  if (side===game.p) sfx('build');
  return true;
}
function tryRepairBase(side){
  if (isGuest(side)){ guestCmd({c:'repbase'}); return true; }
  if (side.hp >= side.maxhp) return false;
  if (game.t < (side.repBaseT||0)) return false;   // recharge de 20 s (v1.18, audit n°2) : sans elle, la réparation illimitée après la transcendance bloquait les parties (50 à 80 % non finies en Difficile/Brutal)
  const c = {f:120, m:120};
  if (!canPay(side,c)) return false;
  pay(side,c); side.hp = Math.min(side.maxhp, side.hp+(game.collapse? 250 : 500)); side.repBaseT = game.t + (game.collapse? 30 : 20);   // après l'effondrement du monde : 250 PV toutes les 30 s (sinon la réparation annulait l'effondrement : parties à 45 min)
  if (side===game.p){ sfx('build'); announce(tr('a_baserepaired'), "#9dc88a"); }
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
  const free = garMax(slot.b) - slot.b.gar.length;
  if (free<=0) return false;
  const eligible = [...game.sel].filter(u=>u.range>60 && !u.fly && u.role!=='support' && Math.abs(u.x-slot.x)<260).slice(0, free);
  if (!eligible.length){ announce(tr('a_nogar'), "#d88"); return false; }
  for (const u of eligible){
    const i = side.units.indexOf(u);
    game.sel.delete(u);
    if (i<0) continue;                       // unité qui n'existe plus (jamais splice(-1) : ça supprimait la dernière)
    u.task = null;                           // sinon un chantier restait « réservé » par un ouvrier parti en garnison
    slot.b.gar.push(u);
    side.units.splice(i,1);
  }
  announce(fmt('a_garred',{n:eligible.length}), "#e8d8a0");
  sfx('build');
  return true;
}
function tryCapUp(side){
  if (isGuest(side)){ guestCmd({c:'cap'}); return true; }
  const cost = {m:350, w:100};
  if (side.capUp || !canPay(side,cost)) return false;
  pay(side,cost); side.capUp=true; side.cap=40;
  if (side===game.p) { sfx('cap'); announce(tr('a_cap40'), "#e8d8a0"); }
  return true;
}
// ---- invocation du héros légendaire ----
function tryHero(side){
  if (isGuest(side)){ guestCmd({c:'hero'}); return true; }
  if (side.units.some(u=>u.role==='hero')){
    if (side===game.p) announce(tr('a_hero_there'), '#d88'); return false; }
  if (side.heroCd>0){
    if (side===game.p) announce(fmt('a_hero_cd',{n:Math.ceil(side.heroCd)}), '#d88'); return false; }
  if (!canPay(side, HERO_COST)){
    if (side===game.p) announce(fmt('a_hero_cost',{cost:costStr(side,HERO_COST)}), '#d88'); return false; }
  pay(side, HERO_COST); side.heroCd = HERO_CD;
  spawnHero(side); moraleAdd(side, ft('HUM','moraleHero'));
  if (asymOn('herofx') && side.facKey==='HUM'){      // M6 : ralliement — la troupe est reposée, le moral monte à 100
    for (const u of side.units){ u.heat = 0; u.tiredT = 0; }
    if (asymOn('rhythm')) side.morale = 100;
    addFloater(side.x, gY(side.x)-110, tr('f_rally'), '#9dc88a', 14);
  }
  if (side===game.p){ game.flash=0.8; game.shake=16; }
  // révélation surprise : on ne nomme la légende qu'à l'instant de l'invocation
  if (side.facKey==='HUM') announce(tr('a_hero_hum'), side.fac.accent);
  else announce('◆ '+heroNameOf('IA', side.era)+' — '+tr('a_hero_ia'), side.fac.accent, {q:'a_hero_ia', pr:'◆ '+heroNameOf('IA', side.era)+' — '});   // clé + préfixe : l'invité traduit
  return true;
}
function spawnHero(side, power){
  // power ∈ ]0..1] : puissance de la légende. 1 = pleine (défaut).
  power = (power>0)? Math.min(power,1) : 1;
  const mm = statMul(side.era), hum = side.facKey==='HUM';
  // profils opposés (le buff d'équipe ×3/×2 reste identique) : Che = meneur tanky avec aura de
  // soin ; Singularité = frappeuse. v1.12 : PV alignés (1,45 contre 0,7 donnait 88 % de victoires
  // au même joueur en Humanité contre 25 % en GPT, mesuré par simulation).
  const hp = HERO.hp*mm*(hum? 1.2 : 1.2)*power;
  const dmg = HERO.dmg*mm*FAC_TRAITS[side.facKey].heroDmg*power;
  const u = { role:'hero', hp, maxhp:hp, dmg, spd:HERO.spd,
    range:HERO.range, rate:HERO.rate, fly:false, xpv:Math.round(140*(1+side.era*0.7)) };
  u.x = side.x + side.side*60;
  u.side=side.side; u.era=side.era; u.fac=side.facKey; u.trans=side.trans;
  u.atkT=0; u.bob=Math.random()*6.28; u.flash=0; u.supT=2;
  u.ord=null; u.holdX=null; u.task=null; u.heat=0; u.tiredT=0;
  u.kills=0; u.vet=false; u.lastHit=null; u.id=UID++; u._born = game.t;
  u.atkN = 0; u.hstate = null; u.barkT = 5+Math.random()*5;
  warmHero(side); heroSfx(side.facKey, 'spawn', u.x);
  u.heroPow = power;     // l'aura d'équipe (dégâts/vitesse) est réduite d'autant si la légende est affaiblie
  side.units.push(u);
}
// ---- POSTURE DU HÉROS (prudent / normal / offensive) : réglable avant et pendant sa présence ----
function setHeroStance(side, st){
  if (HERO_STANCES.indexOf(st)<0) return false;
  if (isGuest(side)){ guestCmd({c:'hst', st}); side._hsLock = performance.now()+800; }   // l'hôte confirmera par instantané
  side.heroStance = st;
  // (pas d'announce : rien à révéler à l'adversaire) — titre + la règle de la posture en une ligne
  if (side===game.p){ sfx('sel'); game.msg = {txt:tr('a_hst_'+st), color:'#e8d8a0', sub:tr('hsx_'+st)}; game.msgT = 4.2; }
  return true;
}
function cycleHeroStance(side){
  return setHeroStance(side, HERO_STANCES[(HERO_STANCES.indexOf(side.heroStance||'normal')+1)%HERO_STANCES.length]);
}
// ---- ORDRE DE POSITION : aller DÉFENDRE un point précis du terrain ----
// Avec une sélection : seules les unités sélectionnées y vont. SANS sélection : TOUTE
// l'armée reçoit l'ordre. Elles s'y rendent en ne combattant que ce qui leur barre le
// chemin (vers l'arrière : elles décrochent sans s'arrêter), s'y POSENT en un bloc compact
// centré sur le point, puis le tiennent — en ripostant à tout ce qui entre à portée — jusqu'au
// prochain ordre (ord='point', place u.px, groupe u.pid).
// PLACEMENT (v1.15) : avant, un éventail de 16 px par unité dans l'ordre de la liste (30 unités
// = 464 px de large, des unités qui se croisaient). Désormais un bloc : au sol, du front vers
// l'arrière, tanks · mêlée/héros · tireurs · artillerie · soutien, 7 px par unité (2 à 3 de front,
// comme une colonne normale) ; les volants, au-dessus, à part (12 px). Dans chaque rang, l'ordre
// suit la position actuelle : personne ne croise personne en chemin. Hôte ET invité (applyPointIds).
const POINT_RANK = { tank:0, melee:1, gremlin:1, hero:1, ranged:2, air:2, siege:3, support:4 };
const POINT_GAP = 7, POINT_GAP_AIR = 12;
let POINT_SEQ = 0;
function pointHalf(n, gap){ return Math.max(0, n-1)*gap/2; }
function assignPoint(side, units, x){
  x = clamp(x, 40, WORLD-40);
  const s = side.side;
  const place = (list, gap, ranked) => {
    list.sort((a,b)=> (ranked? (POINT_RANK[a.role]||0)-(POINT_RANK[b.role]||0) : 0) || (b.x-a.x)*s);
    const half = pointHalf(list.length, gap);
    list.forEach((u,i)=>{ u.px = clamp(x + s*(half - i*gap), 40, WORLD-40); });
  };
  place(units.filter(u=>!u.fly), POINT_GAP, true);
  place(units.filter(u=>u.fly), POINT_GAP_AIR, false);
  const id = ++POINT_SEQ;
  for (const u of units){ u.ord = 'point'; u.task = null; u.pid = id; }
  return id;
}
function orderPoint(side, wx){
  const all = !game.sel.size;
  wx = clamp(wx, 40, WORLD-40);
  const sel = all? side.units.filter(u=>u.role!=='gremlin') : [...game.sel].filter(u=>side.units.includes(u));
  if (!sel.length) return false;
  if (isGuest(side)){
    // vue miroir → coordonnée hôte ; ids vide = toute l'armée (l'hôte calcule le même bloc)
    guestCmd({c:'point', x:Math.round(WORLD-wx), ids: all? [] : sel.map(u=>u.id)});
    addPointFlag(wx, sel, 0);
  } else addPointFlag(wx, sel, assignPoint(side, sel, wx));
  sfx('sel'); announce(all? tr('a_point_all') : fmt('a_point',{n:sel.length}), '#e8d8a0');
  return true;
}
// FANION ⚑ : reste planté tant que les unités envoyées ne sont pas TOUTES arrivées (avant : il
// s'effaçait au bout de 3 s, unités encore en chemin), puis s'efface. Un fanion par ordre (5 max).
// Solo/hôte : suivi exact (u.pid, u.px). Invité : il ne reçoit pas les places calculées par l'hôte —
// il suit ses unités par identifiant et les tient pour arrivées une fois dans l'emprise du bloc.
function addPointFlag(x, units, id){
  const fl = game.flags || (game.flags = []);
  const ids = units.map(u=>u.id), set = new Set(ids);
  for (const f of fl) if (f.ids) f.ids = f.ids.filter(i=>!set.has(i));   // ces unités changent d'ordre
  const nG = units.filter(u=>!u.fly).length, nA = units.length-nG;
  fl.push({x, id, ids: id? null : ids, t:0, out:0, half: Math.max(pointHalf(nG, POINT_GAP), pointHalf(nA, POINT_GAP_AIR))});
  if (fl.length>5) fl.shift();
}
function forgetPointFlags(ids){                // invité : un nouvel ordre retire ces unités de leurs fanions
  if (!game.flags) return;
  if (!ids) { game.flags.length = 0; return; }
  const set = new Set(ids); for (const f of game.flags) if (f.ids) f.ids = f.ids.filter(i=>!set.has(i));
}
function tickPointFlags(dt){
  const fl = game && game.flags; if (!fl || !fl.length) return;
  const p = game.p;
  for (let i=fl.length-1;i>=0;i--){
    const f = fl[i]; f.t += dt;
    let alive = 0, pending = 0;
    if (f.id){ for (const u of p.units) if (u.pid===f.id && u.ord==='point'){ alive++; if (Math.abs(u.x-u.px)>2) pending++; } }
    else { const set = new Set(f.ids); for (const u of p.units) if (set.has(u.id)){ alive++; if (Math.abs(u.x-f.x)>f.half+16) pending++; } }
    if (!alive){ fl.splice(i,1); continue; }                    // plus personne sous cet ordre (morts, autre ordre)
    if (pending && f.t<120) f.out = 0;
    else if ((f.out += dt) > 0.9) fl.splice(i,1);              // tous arrivés : le fanion s'efface
  }
}
function setStance(side, st){
  if (isGuest(side)){
    guestCmd({c:'stance', st, ids: game.sel.size? [...game.sel].map(u=>u.id) : []});
    forgetPointFlags(game.sel.size? [...game.sel].map(u=>u.id) : null);
    sfx('buy', st==='charge'?3:st==='hold'?1:0); return;
  }
  if (side===game.p && game.sel.size>0){
    // ordre EXPLICITE sur la sélection : « charger » doit l'emporter sur la posture
    // d'armée (sinon des unités sélectionnées sous armée en « tenir » ne bougeaient pas)
    for (const u of game.sel){
      u.ord = st;
      if (st==='hold') u.holdX = u.x;
    }
    announce((st==='charge'?'⚔ ':st==='hold'?'✋ ':'↩ ')+fmt('a_order',{n:game.sel.size}), '#e8d8a0');
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