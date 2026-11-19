/* ================= SIMULATION ================= */
function foeTargets(foe){
  const out = foe.units.slice();
  for (const s of sideBuildSlots(foe)){
    if (s.b) out.push({isB:true, slot:s, x:s.x, get hp(){return s.b?s.b.hp:0},
      hit(d){ if(s.b){ s.b.hp -= d*(s.b.gar&&s.b.gar.length? 0.75:1); } } });
  }
  if (game.camp && game.camp.targets) game.camp.targets(foe, out);   // campagne : cibles propres à la mission (cortège, barricades…)
  out.push({isBase:true, x:foe.x, hit(d){foe.hp-=d;}});
  return out;
}
function dealDmg(target, dmg, attacker){
  let out = dmg;
  if (attacker && attacker.side!==undefined) out *= homeBuff(attacker);
  if (target.isBase || target.isB){
    // MODE SIÈGE : la base assiégée perd ses bonus défensifs (dégâts amplifiés).
    const sg = (attacker && attacker.side!==undefined && (attacker.side===1?game.p:game.e).siegeT>0)? 1.3 : 1;
    target.hit(out * sg * (attacker && attacker.role==='siege'?1.6:1));
    // attaquer la base ennemie rapporte de l'XP : farmer l'expérience sans camper
    if (target.isBase && attacker && attacker.side!==undefined)
      (attacker.side===1? game.p : game.e).xp += out*0.04;
  }
  else {
    out /= homeBuff(target);
    const dside = target.side===1?game.p:game.e;
    out /= (1 + 0.15*(dside.combatBuff||0)) * (1 + (dside.zoneBuff||0)); // comeback + zones : le perdant encaisse mieux
    out *= piquetK(target);                                              // couvre-feu (M10) : le piquet humain encaisse −20 %
    target.hp -= out; target.flash = 0.15;
    if (target.role==='hero') heroSfx(target.fac, 'hurt', target.x);
    if (attacker && attacker.role) target.lastHit = attacker;        // pour la vétérance
  }
}
// ---- GRÈVE GÉNÉRALE (humains) / MISE À JOUR FORCÉE (machines) : la faction touchée est FIGÉE 15 s ----
// Elle ne bouge plus du tout (ni avance, ni repli, ni chantier), ne s'en prend plus aux bâtiments ni
// aux bases et ne peut rien capturer — mais elle SE DÉFEND : chaque unité riposte à toute unité ennemie
// à sa portée (héros compris, devant comme derrière), médics et ruches soignent, garnisons et tourelles
// tirent. (Avant : la faction figée ne ciblait plus RIEN et se laissait massacrer sans réagir.)
const FROZEN_DMG = 0.5;   // force de riposte d'une faction figée (l'événement doit rester un vrai handicap)
function facFrozen(fac){ return !!game && ((fac==='HUM' && game.weather==='strike') || (fac==='IA' && game.weather==='patch')); }
// ---- M10 · ENVIRONNEMENT PAR FACTION (asymOn('env') ; sinon les valeurs d'avant, identiques pour les deux camps) ----
// Principe : aucun événement n'est neutre, mais la somme sur un cycle l'est (FACTIONS.md §2 M10 ; mesuré par le banc E).
const envOn = () => asymOn('env');
const frozenDmg = fk => envOn()? fte(fk,'frozen') : FROZEN_DMG;                       // riposte d'un camp figé : humains ×0,3, machines ×0,5
const rainBaseK = fk => game.boon!=='rain'? 1 : envOn()? fte(fk,'rainBase') : 1.3;     // pluie fertile : revenu de base 🌾/⚡
const rainFarmK = fk => (game.boon==='rain' && envOn())? fte(fk,'rainFarm') : 1;       // … et production des fermes / panneaux
const sigK = fk => game.boon!=='signal'? 1 : envOn()? fte(fk,'sigCd') : 1.3;            // signal renforcé : recharge du pouvoir ✸
const piquetK = u => !envOn()? 1 : (u.fac==='HUM' && game.weather==='strike')? fte('HUM','piquet') : (u.fac==='IA' && game.weather==='patch')? fte('IA','safe') : 1;   // couvre-feu : le piquet encaisse mieux
function sandK(fk, tur){ return game.cata!=='sand'? 1 : envOn()? fte(fk, tur? 'sandTur':'sand') : 0.78; }   // tempête de sable : portée longue / tourelles
// hiver nucléaire : ÷2 → ×1 en 6 min pour les humains (🌾 et 🪙) ; la machine ne perd que son ⚡ (÷2,5 → ×1), ◈ intact
function winterK(side, res){
  if (!game.winter) return 1;
  if (envOn() && side.facKey==='IA'){ if (res==='m') return 1;
    const lo = fte('IA','winterF'); return lo + (1-lo)*clamp(1-(game.winterT||0)/WINTER_DUR, 0, 1); }
  return winterMul();
}
// vitesse de marche : hiver (HUM ×0,82 / IA ×0,95) et canicule (HUM ×0,9). Sans `env` : ×0,82 en hiver pour tous.
function envSpd(side){ let k = 1;
  if (game.winter) k *= envOn()? fte(side.facKey,'winterSpd') : 0.82;
  if (game.cata==='heat' && envOn() && side.facKey==='HUM') k *= fte('HUM','heatSpd');
  if (side.facKey==='HUM' && moraleOn() && (side.morale||50)<=ft('HUM','moraleLo')) k *= ft('HUM','moraleLoSpd');   // « débandade » (M4)
  return k; }
// ---- M1 · ÉCONOMIE : « effet réseau » de G·P·T (asymOn('econ')) : +6 % de production par AUTRE bâtiment éco vivant (max +24 %) ----
const ECO_TYPES = {farmF:1, farmM:1, well:1};
function ecoCount(side){ let n=0; for (const s of sideBuildSlots(side)) if (s.b && ECO_TYPES[s.b.type] && s.b.hp>0) n++; return n; }
function ecoMul(side){
  if (side.facKey!=='IA' || !asymOn('econ') || game.t < (side.netT||0)) return 1;   // netT : resynchronisation après la perte d'un nœud
  return 1 + Math.min(ft('IA','netMax'), ft('IA','netStep')*Math.max(0, ecoCount(side)-1));
}
// ---- M8 · TERRITOIRE (asymOn('terrain')) : l'Humanité OCCUPE (chaque unité compte ×1,5 pour capturer), la machine EXTRAIT (+25 % de rendement) ----
const capW = u => (u.fac==='HUM' && asymOn('terrain'))? FAC_TRAITS.HUM.occupy : 1;
const terrK = side => (side.facKey==='IA' && asymOn('terrain'))? FAC_TRAITS.IA.terrK : 1;
// ---- M5 · BÂTIMENTS (asymOn('bld')) : une tourelle IA à ≤ 300 px d'une autre tourelle IA est « liée » (cadence +10 %) ----
function turretLinked(side, slot){
  const R = ft('IA','turLinkR');
  for (const o of sideBuildSlots(side)) if (o!==slot && o.b && o.b.type==='turret' && Math.abs(o.x-slot.x)<=R) return true;
  return false;
}
// ---- M4 · RYTHME (asymOn('rhythm')) : moral de l'Humanité (jauge 0-100) ; la machine refroidit à l'eau et tourne en surrégime ----
const moraleOn = () => asymOn('rhythm');
function moraleAdd(side, v){ if (side.facKey==='HUM' && moraleOn()) side.morale = clamp((side.morale===undefined? 50 : side.morale)+v, 0, 100); }
const moraleK = side => (side.facKey==='HUM' && moraleOn())? 1 + ft('HUM','moraleDmg')*((side.morale===undefined? 50 : side.morale)-50)/50 : 1;
function moraleTick(side, dt){
  if (side.facKey!=='HUM' || !moraleOn()){ return; }
  let m = side.morale===undefined? 50 : side.morale;
  m += clamp(50-m, -dt, dt);                                          // retour vers 50 à 1 point/s
  if (side.trans && asymOn('trans')) m = Math.max(m, ft('HUM','transMorale'));   // M9 : communisme à visage humain — le moral ne tombe plus sous 70
  if (side.hp < side.maxhp*0.5) m = Math.max(m, 50);                   // « on n'a plus rien à perdre » : jamais sous 50 base en danger
  side.morale = m;
}
// ---- M2 · UNITÉS (asymOn('unit')) : l'Humanité frappe plus fort en groupe (« coude à coude »), la machine EXÉCUTE les cibles entamées ----
function unitK(u, target, side){
  if (!asymOn('unit')) return 1;
  if (u.fac==='HUM'){
    if (u.fly || u.role==='support' || u.role==='hero' || u.role==='gremlin') return 1;
    let n = 0; const R = ft('HUM','packR');
    for (const a of side.units) if (a!==u && !a.fly && a.role!=='support' && a.role!=='hero' && a.role!=='gremlin' && Math.abs(a.x-u.x)<=R) n++;
    return 1 + Math.min(ft('HUM','packMax'), ft('HUM','packStep')*n);
  }
  if ((u.role==='ranged' || u.role==='air') && target && target.role && target.hp/target.maxhp < ft('IA','execHp')) return ft('IA','execK');
  return 1;
}
// ---- M3 · SOIN ET RÉCUPÉRATION (asymOn('heal')) : l'Humanité RELÈVE un allié qui tombe (médic), la machine RECYCLE ses pertes ----
function healSave(side, u){
  if (u.fac!=='HUM' || !asymOn('heal') || u.role==='hero' || u.role==='gremlin') return false;
  if (u.drownT>0 && game.cata==='flood') return false;   // pas de relève d'une unité qui se noie (soin gaspillé)
  const lvl = side.upg.support||0;
  for (const a of side.units){
    if (a===u || a.role!=='support' || a.hp<=0 || (a.relAt||0)>game.t) continue;
    if (Math.abs(a.x-u.x) > a.range+40*lvl) continue;
    a.relAt = game.t + (lvl>=2? ft('HUM','reliefCd2') : ft('HUM','reliefCd'));
    u.hp = u.maxhp*ft('HUM','reliefHp'); u.lastHit = null; u.flash = 0.2;
    addFloater(u.x, gY(u.x)-60-(u.fly?u.flyH:0), tr('f_relief'), '#6dff8a', 12);
    burst(u.x, gY(u.x)-30, '#6dff8a', 8, 0.8);
    return true;
  }
  return false;
}
function healSalvage(side, u){
  if (u.fac!=='IA' || !asymOn('heal') || u.role==='hero' || u.role==='gremlin') return;
  let k = ft('IA','recycFar');
  if (Math.abs(u.x-side.x) <= ft('IA','recycR')) k = ft('IA','recycNear');
  else for (const a of side.units) if (a.role==='support' && a.hp>0 && Math.abs(a.x-u.x)<=a.range+40*(side.upg.support||0)){ k = ft('IA','recycNear'); break; }
  const ri = ROLES.findIndex(r=>r.key===u.role); if (ri<0) return;
  const c = unitCost(side, ri);
  for (const r in c){ if (r==='m' && side.trans) continue; side[r] += c[r]*k; }
  if (side===game.p && k>ft('IA','recycFar')) addFloater(u.x, gY(u.x)-44, tr('f_recycle'), '#5ad0ff', 11);
}
function updateUnits(side, foe, dt){
  const targets = foeTargets(foe);
  const m = statMul(side.era);
  const garMoves = [];
  const medClaims = new Set(); // un blessé soigné par un médic ne sera pas ciblé par les autres ce tick
  // unité héroïque vivante : ×3 dégâts et ×2 vitesse pour TOUT le camp (réduit si la légende est affaiblie)
  side.heroAlive = side.units.some(u=>u.role==='hero');
  side.heroPow = side.heroAlive ? (side.units.find(u=>u.role==='hero').heroPow||1) : 0;
  const frozen = facFrozen(side.facKey);
  const envA = envOn();
  // M10 : pluie et hiver évacuent la chaleur des machines ×2 ; « correctif » de la mise à jour : cadence +10 % pendant 30 s
  let coolK = (envA && side.facKey==='IA' && (game.boon==='rain' || game.winter))? fte('IA','rainCool') : 1;
  if (side.facKey==='IA' && side.heroAlive && asymOn('herofx')) coolK *= ft('IA','heroCool');   // M6 : « calcul distribué »
  const coolOn = side.facKey==='IA' && moraleOn() && side.w>=ft('IA','coolMin');   // M4 : refroidissement actif (consomme de l'eau)
  const eager = side.facKey==='HUM' && moraleOn() && (side.morale||50)>=ft('HUM','moraleHi')? ft('HUM','moraleHiK') : 1;   // « élan » : la fatigue monte moins vite
  const moraleMul = moraleK(side);
  const fixK = (envA && side.facKey==='IA' && (side.afterT||0)>game.t)? fte('IA','fixK') : 1;
  for (const u of side.units){
    u.bob += dt*7; u.atkT -= dt; if (u.flash>0) u.flash-=dt;
    if (u.tiredT>0) u.tiredT -= dt;                       // fatigue / surchauffe
    // FATIGUE DE TRAVERSÉE : une troupe au sol qui a parcouru l'essentiel de la carte
    // arrive éreintée — −10 % de dégâts pendant 8 s, une seule fois.
    if (u.farT>0) u.farT -= dt;
    else if (!u.farFatigued && !u.fly && u.role!=='support' && Math.abs(u.x-side.x) > WORLD*0.6){
      u.farFatigued = true; u.farT = 8;
      addFloater(u.x, gY(u.x)-58-(u.fly?u.flyH:0), '😮‍💨', '#d8a06a', 11);
    }
    // récupération : les humains soufflent plus vite que les machines ne refroidissent. v1.17 (`fatigue`) : 0,05 → 0,035
    // pour l'Humanité — à 0,05/s la fatigue humaine ne se déclenchait quasiment jamais (tireur/tank : jamais), seule la
    // machine surchauffait ; elle devient un vrai rythme d'effort (mêlée ~25 s, tireur ~1 min), plus doux que la surchauffe.
    if (u.heat>0){
      let rec = (u.fac==='IA'? FAC_TRAITS.IA.heatRec*coolK : (asymOn('fatigue')? FAC_TRAITS.HUM.heatRec : 0.05));
      if (coolOn && u.fac==='IA' && side.w>0){ rec = Math.max(rec, ft('IA','coolRec')*coolK); side.w = Math.max(0, side.w - ft('IA','coolW')*dt); }
      u.heat = Math.max(0, u.heat-rec*dt);
    }
    if (u.role==='support') u.supT -= dt;
    // aura du héros humain (Che) : soigne en continu les alliés proches, en plus de combattre
    // (v1.17 : la Singularité en a une aussi, plus faible — sans elle, bot contre bot, l'Humanité gagnait ~80 % des parties)
    const aura = u.role==='hero'? (u.fac==='HUM'? FAC_TRAITS.HUM.heroAura : (asymOn('hero')? FAC_TRAITS.IA.heroAura : 0)) : 0;
    if (aura>0){
      u.auraT = (u.auraT||0) - dt;
      if (u.auraT<=0){ u.auraT = 1;
        for (const a of side.units) if (a!==u && a.hp<a.maxhp && Math.abs(a.x-u.x)<150){
          a.hp = Math.min(a.maxhp, a.hp + aura*m);   // v1.12 : 28 → 14 (parité des camps)
          addFloater(a.x, gY(a.x)-50, u.fac==='HUM'? '+❤' : '+🔧', u.fac==='HUM'? '#6dff8a' : '#5ad0ff', 11);
        }
      }
    }
    let st = u.ord || side.stance;
    let heroMode = null;
    if (u.role==='hero'){
      if (u.era!==side.era){ u.era = side.era; burst(u.x, gY(u.x)-50, side.fac.accent, 14, 1); }   // l'apparence suit l'ère du camp (stats inchangées)
      heroMode = heroStanceStep(u, side, dt);
      if (heroMode==='hunt') st = 'charge';     // offensif : ignore « tenir » / « repli » de l'armée
    }
    // ---- tâche assignée : chantier ou garnison (envoi direct depuis le pool) ----
    if (u.task){
      const sl = u.task.slot;
      const okB = sl && sl.b && u.task.kind==='build' && sl.b.type==='site' && sl.owner===side;
      const okG = sl && canGar(sl.b) && u.task.kind==='garrison' && sl.owner===side && sl.b.gar.length<garMax(sl.b);
      const okC = u.task.kind==='gbase' && side.gar.length<3;   // garde du château
      if (!okB && !okG && !okC){ u.task = null; }
      else if (frozen){ /* grève / mise à jour : le chantier attend la reprise */ }
      else if (moveToward(u, okC? side.x : sl.x, dt, 1.15)){
        if (okB){
          sl.b = mkB(side, sl.b.buildType);
          burst(sl.x, gY(sl.x)-26, '#e8d8a0', 10);
          if (side===game.p){ sfx('build'); announce(tr('a_built'), '#9dc88a'); }
        } else garMoves.push({u, sl, base:okC});
        u.task = null;
      }
      continue;
    }
    // ---- soutien : médic humain / ruche GPT (soignent tous deux, ciblage réparti) ----
    if (u.role==='support'){
      const kind = FACTIONS[u.fac].supportKind;
      const isHive = kind==='hive';
      const lvl = side.upg.support||0;
      const hr = u.range + 40*lvl;             // portée de soin par amélioration
      const hcol = isHive? '#5ad0ff' : '#6dff8a';
      const hicon = isHive? '+🔧' : '+❤';
      // ciblage réparti : meilleur score (gravité + proximité), en évitant les blessés
      // déjà pris en charge par un autre soutien ce tick — pas de nuée sur la même unité.
      let best=null, bestScore=1e9;
      const pick = (allowClaimed)=>{
        for (const a of side.units){
          if (a===u || a.hp>=a.maxhp) continue;
          if (!allowClaimed && medClaims.has(a)) continue;
          const f = a.hp/a.maxhp;
          const score = f + Math.abs(a.x-u.x)/1500;
          if (score<bestScore){ bestScore=score; best=a; }
        }
      };
      pick(false);
      if (!best){ bestScore=1e9; pick(true); }
      if (best) medClaims.add(best);
      // la ruche GPT spawn des drones (hors cap global) sur un timer séparé et plus lent
      if (isHive){
        if (u.droneT===undefined) u.droneT = 2;
        u.droneT -= dt * ((envOn() && game.boon==='signal')? fte('IA','sigDrone') : 1);   // signal renforcé (M10) : ruches ×1,5 plus rapides
        if (u.droneT<=0){
          u.droneT = Math.max(2.6, 4.5 - 0.5*lvl);
          if (droneCount(side) < droneCap(side)){
            spawnUnit(side, 0, true, u.x + side.side*14);
            addFloater(u.x, gY(u.x)-56, tr('f_drone'), "#5ad0ff");
            burst(u.x, gY(u.x)-36, '#5ad0ff', 5, 0.5);
          }
        }
      }
      // SOIN : toujours actif si un blessé est à portée, QUEL QUE SOIT l'ordre du médic
      if (best && u.supT<=0 && Math.abs(best.x-u.x)<=hr){
        // la ruche soigne un peu plus lentement que le médic (elle produit aussi des drones)
        const base = Math.max(0.5, 1.3 - 0.2*lvl);
        const HT = FAC_TRAITS[u.fac];
        u.supT = base*HT.healPeriod;
        const heal = (HT.healBase + HT.healLvl*lvl)*m;
        best.hp = Math.min(best.maxhp, best.hp+heal);
        addFloater(best.x, gY(best.x)-52, hicon, hcol);
        burst(best.x, gY(best.x)-36, hcol, 4, 0.5);
        if (lvl>=2){ // soutien avancé : un 2e blessé à portée (non déjà réclamé)
          let b2=null, w2=0.999;
          for (const a of side.units) if (a!==u && a!==best && a.hp<a.maxhp
              && !medClaims.has(a) && Math.abs(a.x-u.x)<=hr){
            const f=a.hp/a.maxhp; if (f<w2){w2=f; b2=a;} }
          if (b2){ medClaims.add(b2); b2.hp = Math.min(b2.maxhp, b2.hp+heal*0.6);
            addFloater(b2.x, gY(b2.x)-52, hicon, hcol); }
        }
      }
      // DÉPLACEMENT — correctif v1.5 : un ORDRE EXPLICITE du joueur prime sur la poursuite
      // automatique des blessés. Le médic redevient ainsi pilotable (sélection + ⚔/✋/↩).
      if (frozen){
        // figé (grève / mise à jour forcée) : soigne sur place, ne bouge plus
      } else if (u.ord==='hold'){
        const hx = (u.holdX!=null)? u.holdX : u.x;     // tient la position ordonnée, soigne ce qui passe à portée
        if (Math.abs(u.x-hx)>4) moveToward(u, hx, dt, 1.0);
      } else if (u.ord==='charge'){
        tryMove(u, side, dt);                          // avance au front avec les troupes, soigne en chemin
      } else if (u.ord==='retreat'){
        const homeX = side.x + side.side*150;
        if ((u.x-homeX)*side.side>4) moveBack(u, side, dt);
      } else if (u.ord==='point'){
        // ordre de position explicite : le soutien rejoint SA place dans le bloc (et soigne ce qui passe à portée)
        if (u.px!=null) pointStep(u, side, dt, (u.px-u.x)*side.side<0? 1.2 : 1);
      } else if (best){
        // pas d'ordre explicite : comportement autonome — rejoint le blessé prioritaire
        if (Math.abs(best.x-u.x) > hr*0.7) moveToward(u, best.x - side.side*14, dt, 1.1);
      } else if (st==='retreat'){
        const homeX = side.x + side.side*150;
        if ((u.x-homeX)*side.side>4) moveBack(u, side, dt);
      } else if (side.formation){
        moveToFormation(u, side, dt);             // soutien : tenu tout à l'arrière de la colonne
      } else {
        let frontAlly = side.x;
        for (const a of side.units) if (a!==u && (a.x-frontAlly)*side.side>0) frontAlly=a.x;
        if (((frontAlly - side.side*70)-u.x)*side.side>4) tryMove(u, side, dt);
      }
      continue;
    }
    // ---- repli : retour en zone de base, puis tient la position ----
    // (figé par une grève / mise à jour forcée : plus aucun déplacement, mais il se défend sur place)
    let noMove = frozen;
    if (heroMode==='flee'){                              // héros prudent blessé : file vers sa base sans combattre, puis s'y défend
      if (!frozen && (u.x-(side.x + side.side*150))*side.side > 4){ moveBack(u, side, dt); continue; }
      noMove = true;
    } else
    if (st==='retreat'){
      const homeX = side.x + side.side*150;
      if ((u.x-homeX)*side.side > 4){ if (!frozen){ moveBack(u, side, dt); continue; } }
      else if (u.ord==='retreat'){ u.ord='hold'; u.holdX = u.x; }
      noMove = true;
    }
    // ---- ORDRE DE POSITION (⚑) : 'go' = en route vers l'avant, 'back' = décroche vers l'arrière,
    // 'at' = posté sur sa place. Il tient ensuite la position jusqu'au prochain ordre.
    let pt = null;
    if (st==='point' && u.px!=null && !noMove){
      const d = (u.px-u.x)*side.side;
      pt = Math.abs(u.px-u.x)<=1.5? 'at' : d>0? 'go' : 'back';
    }
    // point EN ARRIÈRE : l'unité décroche sans s'arrêter pour combattre (sinon les poursuivants la
    // clouaient sur place et elle n'atteignait jamais le point de repli — mesuré : tireurs et
    // artillerie restaient au contact jusqu'à la mort)
    // (un simple pas en arrière, ≤ 60 px — réajustement, recul devant un danger — se fait en combattant)
    if (pt==='back' && Math.abs(u.px-u.x) > 60){ pointStep(u, side, dt, 1.2); continue; }
    // ---- ciblage (mêlée au sol ≠ volants ; tempête de sable : visée longue brouillée) ----
    // BONUS DE RELIEF : tenir une hauteur (bosse de terrain) accroît légèrement portée et
    // dégâts — récompense le contrôle des collines. elev : 0 en plaine → 1 au sommet.
    const elev = u.fly? 0 : clamp((GROUND - gY(u.x))/26, 0, 1);
    const meleeGround = u.range<=24 && !u.fly;
    const eRange = u.range * (u.range>60? sandK(u.fac,false) : 1) * (1 + 0.14*elev) * (game.camp && game.camp.rangeMul? game.camp.rangeMul(u) : 1);
    let target=null, best=1e9;
    for (const f of targets){
      if (f.hp<=0 && !f.isBase) continue;
      if (f.fly && meleeGround) continue;
      if (frozen && !f.role) continue;          // figés : légitime défense — jamais les bâtiments ni la base
      const dx = (f.x-u.x)*u.side;
      if (dx>-12 && dx<best){ best=dx; target=f; }
    }
    // en route vers son point, une unité ne s'arrête que pour ce qui lui BARRE le chemin : un ennemi
    // au-delà du point sera combattu depuis le point (plus près). Elle va donc bien jusqu'au ⚑.
    if (pt==='go' && target && best<=eRange && (target.x-u.px)*side.side > 0){ target = null; best = 1e9; }
    // DÉFENSE TOUS AZIMUTS : une unité postée sur son point, figée, ou le héros offensif en chasse
    // riposte aussi à une unité ennemie qui la contourne (volants passés au-dessus, infiltrés…) ;
    // le héros offensif s'en prend en priorité au HÉROS ennemi à sa portée.
    if ((pt==='at' || frozen || heroMode==='hunt') && (!target || best>eRange || !target.role || heroMode==='hunt')){
      let alt=null, ad=1e9;
      for (const f of targets){
        if (!f.role || f.hp<=0 || (f.fly && meleeGround)) continue;
        const d = Math.abs(f.x-u.x); if (d>eRange) continue;
        const sc = d - ((heroMode==='hunt' && f.role==='hero')? 1e4 : 0);
        if (sc<ad){ ad=sc; alt=f; }
      }
      if (alt){ target = alt; best = Math.abs(alt.x-u.x); }
    }
    // M2 · verrouillage de cible (IA) : tireurs et aériens visent, parmi les unités à portée, la plus entamée
    if (target && best<=eRange && u.fac==='IA' && (u.role==='ranged' || u.role==='air') && asymOn('unit')){
      let bf = target.role? target.hp/target.maxhp : 1, bt = null;
      for (const f of targets){
        if (!f.role || f.hp<=0 || (f.fly && meleeGround)) continue;
        if ((f.x-u.x)*u.side<-12 || Math.abs(f.x-u.x)>eRange) continue;
        const fr = f.hp/f.maxhp; if (fr<bf-0.02){ bf = fr; bt = f; }
      }
      if (bt){ target = bt; best = Math.abs(bt.x-u.x); }
    }
    if (target && best<=eRange){
      if (u.atkT<=0){
        const tired = u.tiredT>0;
        const isIA = u.fac==='IA';
        // pénalité d'épuisement : GPT surchauffe DUR (sprint), HUM fatigue en douceur (marathon)
        const T = FAC_TRAITS[u.fac];
        u.atkT = u.rate * (tired? T.tiredRate : 1) / fixK;
        if (u.role==='hero'){ heroSfx(u.fac, HERO_SEQ[(u.atkN|0)&7]? 'atkB' : 'atkA', u.x); u.atkN = (u.atkN|0)+1; }   // alterne ses deux attaques (visuel + son)
        // ×3 si héros allié vivant, + bonus offensif de comeback ; pénalité d'épuisement par faction
        const dmgOut = u.dmg * (tired? T.tiredDmg : 1) * (u.farT>0?0.9:1) * (1 + 0.12*elev) * (side.siegeT>0 && u.range>60?1.1:1) * (side.heroAlive? (1+2*(side.heroPow||1)) :1) * (1 + 0.25*(side.combatBuff||0)) * (1 + (side.zoneBuff||0)) * (frozen? frozenDmg(side.facKey) : 1) * unitK(u, target, side) * moraleMul * ((side.facKey==='HUM' && (side.martyrT||0)>game.t)? ft('HUM','martyrK') : 1) * ((u.fac==='IA' && moraleOn() && u.heat>=ft('IA','overHeat'))? ft('IA','overK') : 1);   // figé : riposte, mais sans l'élan d'une troupe libre
        // jauge d'effort : GPT chauffe vite et s'effondre longtemps ; HUM monte lentement, dip court
        // (v1.12 : surchauffe GPT adoucie — 0,08/6 s/−45 % donnaient ~18 % de DPS soutenu en moins que
        //  l'Humanité ; le même joueur gagnait 88 % en Humanité contre 25 % en GPT)
        u.heat = (u.heat||0) + T.heatGain*eager;
        if (u.heat>=1 && u.fac==='IA' && side.trans && asymOn('trans')) u.heat = 0.99;   // M9 : AGI complète — plus aucune surchauffe (le surrégime reste actif)
        else if (u.heat>=1){
          u.heat = 0; u.tiredT = T.tiredT;
          addFloater(u.x, gY(u.x)-60-(u.fly?u.flyH:0),
            tr(isIA? 'f_overheat':'f_tired'), '#d8a06a', 11);
        }
        const sy0 = gY(u.x)-26-(u.fly? u.flyH:0);
        const ty0 = gY(target.x)-(target.isBase?56:(target.fly? 24+target.flyH : 34));   // impact au torse
        if (u.arc){
          const mz = muzzleOf(u);   // purement visuel : point de départ de l'obus (ox/oy)
          projectiles.push({sx:u.x, tx:target.x, dmg:dmgOut, aoe:u.aoe, side:u.side, fac:u.fac, t:0, dur:0.7, era:u.era, hb:homeBuff(u), src:u,
            ox:u.side*mz[0], oy:mz[1]});
          if (u.side===1) sfx('shoot', 3);
        } else if (u.range>60){
          const mz = muzzleOf(u);   // le trait part de la bouche de l'arme (visuel uniquement)
          shots.push({x:u.x+u.side*mz[0], y:sy0+26+mz[1], tx:target.x, ty:ty0, t:0, dur:0.16, fac:u.fac, era:u.era});
          dealDmg(target, dmgOut, u);
          if (qFx() && Math.random()<0.55) burst(target.x, ty0, FACTIONS[u.fac].eraCols[u.era], 4, 0.5);  // étincelles d'impact
          if (u.side===1) sfx('shoot', u.era);
        } else {
          dealDmg(target, dmgOut, u);
          burst((u.x+target.x)/2, gY(u.x)-26, FACTIONS[u.fac].eraCols[u.era], 4, 0.6);
        }
        if (target.isBase) game.shake = Math.max(game.shake,2);
      }
    } else if (noMove){
      // tient sa position de repli (ou figé : grève / mise à jour forcée)
    } else if (st==='point'){
      // ORDRE DE POSITION : rejoint SA place exacte dans le bloc (⚑), à l'allure de l'armée (aura du
      // héros comprise — avant, l'ordre avançait deux fois moins vite qu'une charge et s'arrêtait
      // 8 à 10 px avant la cible), puis DÉFEND sur place : le ciblage ci-dessus reste actif.
      if (pt==='go' || pt==='back') pointStep(u, side, dt, 1);
    } else if (heroMode==='escort' || heroMode==='guard'){
      heroFollow(u, side, dt, heroMode==='guard'? HERO_GUARD_GAP : 0, targets);   // au front de la troupe / en retrait derrière elle
    } else if (heroMode==='hunt'){
      heroAdvance(u, side, dt);                                          // offensif : fonce devant, jusqu'au contact
    } else if (st==='hold'){
      const hx = u.ord==='hold'? u.holdX : side.holdX;
      if (hx!==null && (u.x-hx)*side.side>=0){ /* tient */ }
      else tryMove(u, side, dt);
    } else if (side.formation && moveToFormation(u, side, dt)){
      // formation : volants en pointe, mêlée/tank devant, tireurs, artillerie puis soutien à l'arrière
      // (moveToFormation gère le placement ; renvoie false pour la ligne de front qui avance)
    } else {
      tryMove(u, side, dt);
    }
  }
  // entrées en garnison (hors itération) — tourelle ou château
  for (const gm of garMoves){
    let entered = false;
    if (gm.base && side.gar.length<3){ side.gar.push(gm.u); entered = true; }
    else if (!gm.base && canGar(gm.sl.b) && gm.sl.b.gar.length<garMax(gm.sl.b)){
      gm.sl.b.gar.push(gm.u); entered = true;
    }
    if (entered){
      const i = side.units.indexOf(gm.u);
      if (i>=0) side.units.splice(i,1);
      game.sel.delete(gm.u);
      if (side===game.p) announce(tr(gm.base? 'a_guard_in':'a_gar_in'), '#e8d8a0');
    }
  }
  for (let i=side.units.length-1;i>=0;i--){
    const u=side.units[i];
    if (u.hp<=0){
      if (healSave(side, u)) continue;               // M3 : relevé par un médic
      // vétérance : 5 éliminations → +8 % de dégâts à vie
      const k = u.lastHit;
      if (k && k.hp>0 && k.side!==u.side && k.role){
        k.kills = (k.kills||0)+1;
        // VÉTÉRANCE : permanente, par paliers (récompense la survie). Symétrique entre factions
        // (équilibrage miroir) — +6 % de dégâts par palier, 3 paliers max (4/8/12 éliminations).
        {
          const tier = Math.min(3, Math.floor(k.kills/4));
          if (tier > (k.vetTier||0)){
            k.vetTier = tier; k.vet = true; k.dmg *= 1.06;
            addFloater(k.x, gY(k.x)-62-(k.fly?k.flyH:0), fmt(k.fac==='HUM'? 'f_vet_hum':'f_vet_ia', {n:tier}), '#ffd34a', 12);
            sfx('cap');
          }
        }
      }
      burst(u.x, gY(u.x)-22-(u.fly?u.flyH:0), FACTIONS[u.fac].eraCols[u.era], 12);
      // RAGDOLL DE MORT (par rôle) : corps qui bascule / chute en vrille / châssis qui éclate.
      if (qFx() && u.role!=='gremlin' && deaths.length<60)
        deaths.push({x:u.x, fac:u.fac, era:u.era, role:u.role, fly:!!u.fly, flyH:u.flyH||0, side:u.side, t:0, life:u.role==='hero'? 1.8 : 0.75, trans:!!u.trans});
      if (u.role==='hero') heroSfx(u.fac, 'death', u.x);
      // ÉPAVE PERSISTANTE (v1.13, cosmétique) : le corps reste au sol ~50 s, le champ de bataille garde la trace des combats
      if (qFx() && !u.fly && u.role!=='gremlin' && u.role!=='hero' && !wrecks.some(w=>Math.abs(w.x-(u.x-u.side*6))<16)){ wrecks.push({x:u.x-u.side*6, fac:u.fac, era:u.era, role:u.role, side:u.side, t:0}); if (wrecks.length>26) wrecks.shift(); }
      // journal des morts : alimente la carte thermique (pause) et le récit de fin de partie
      if (game.killLog){ game.killLog.push({x:u.x, s:u.side}); if (game.killLog.length>140) game.killLog.shift(); }
      // inondation (M10) : « sauvegarde » — la machine noyée rembourse 30 % de son coût
      if (u.drownT>0 && game.cata==='flood' && envOn() && u.fac==='IA' && u.role!=='hero' && u.role!=='gremlin'){
        const ri = ROLES.findIndex(r=>r.key===u.role);
        if (ri>=0){ const c = unitCost(side, ri), k = fte('IA','floodRefund'); for (const r in c){ if (r==='m' && side.trans) continue; side[r] += c[r]*k; }
          if (side===game.p) addFloater(u.x, gY(u.x)-40, tr('f_backup'), '#5ad0ff', 11); }
      }
      if (u.role!=='gremlin'){ moraleAdd(side, -ft('HUM','moraleLoss')); moraleAdd(foe, ft('HUM','moraleKill')); }   // M4
      if (asymOn('herofx')){                         // M6 : martyr du Che, fragmentation et assimilation de la Singularité
        if (u.role==='hero' && u.fac==='HUM'){ side.martyrT = game.t + ft('HUM','martyrT'); if (moraleOn()) side.morale = 100; addFloater(u.x, gY(u.x)-80, tr('f_martyr'), '#ff9d45', 14); }
        else if (u.role==='hero'){ for (let k=0;k<ft('IA','fragN');k++) spawnUnit(side, 0, true, u.x + (k-2)*14); addFloater(u.x, gY(u.x)-80, tr('f_fragment'), '#5ad0ff', 14); }
        if (foe.facKey==='IA' && u.role!=='gremlin' && foe.units.some(h=>h.role==='hero' && h.hp>0 && Math.abs(h.x-u.x)<=ft('IA','assimR')) && droneCount(foe)<droneCap(foe)){
          spawnUnit(foe, 0, true, u.x); addFloater(u.x, gY(u.x)-56, tr('f_drone'), '#5ad0ff'); }
      }
      healSalvage(side, u);                          // M3 : la machine récupère une part du coût
      foe.xp += u.xpv; foe.f += u.xpv*0.5; foe.m += u.xpv*0.5;
      if (foe===game.p){ game.kills++; addFloater(u.x, gY(u.x)-50, "+"+u.xpv+"✦", "#cdb4ff"); sfx('die'); }
      else game.eKills++;
      game.sel.delete(u);
      side.units.splice(i,1);
    }
  }
}
// ---- HÉROS : posture (règles détaillées : HERO_STANCES dans 04-data.js) ----
// Trois rôles nettement distincts (v1.15 : « normal » et « offensif » se confondaient en charge —
// mesuré : héros 13 px derrière le front contre 36 px devant, 1re frappe à 9,2 s contre 9,1 s — et
// « prudent » = « normal » dès que l'armée tenait) :
//   prudent   → 'guard' : seconde ligne, HERO_GUARD_GAP px derrière le front ; 'flee' sous 35 % de PV
//               (rentre à la base sans combattre, s'y soigne lentement, repart à 60 %)
//   normal    → 'escort' : « avec la troupe » — exactement au front du gros de l'armée, JAMAIS devant,
//               et suit ses ordres (charger / tenir / replier / ⚑)
//   offensive → 'hunt' : fonce devant les troupes, traque les unités ennemies (leur héros d'abord),
//               pousse vers la base adverse, ne recule jamais
// Un ordre donné au héros LUI-MÊME (sélection + ⚔/✋/↩/⚑) passe toujours avant (renvoie null), sauf le
// repli du prudent blessé. Le repli d'ARMÉE (↩) est suivi en « prudent » et « avec la troupe ».
function heroStanceStep(u, side, dt){
  // répliques : de loin en loin, quand il n'est pas en train de fuir
  u.barkT = (u.barkT===undefined? 6 : u.barkT) - dt;
  if (u.barkT<=0){ u.barkT = 9+Math.random()*9; if (u.hstate!=='flee'){ u.gestT = game.t; heroSfx(u.fac, 'bark', u.x); } }
  const hs = side.heroStance;
  if (hs==='prudent'){
    const f = u.hp/u.maxhp;
    if (u.hstate!=='flee' && f<HERO_FLEE_HP) u.hstate = 'flee';
    else if (u.hstate==='flee' && f>=HERO_BACK_HP) u.hstate = null;
    if (u.hstate==='flee'){
      // CONVALESCENCE : à l'abri de sa base, il se remet lentement — sans médic, il repartait jamais
      if (Math.abs(u.x-(side.x + side.side*150)) < 60) u.hp = Math.min(u.maxhp, u.hp + u.maxhp*HERO_REST_REGEN*dt);
      return 'flee';
    }
    if (u.ord) return null;
    return side.stance==='retreat'? null : 'guard';
  }
  u.hstate = null;
  if (u.ord) return null;                                            // ordre donné au héros lui-même
  if (hs==='offensive') return 'hunt';
  return side.stance==='retreat'? null : 'escort';
}
// position de référence de la troupe : le front du GROS de l'armée au sol (un ou deux éclaireurs
// isolés devant ne comptent pas) ; null s'il n'y a aucune troupe au sol
function armyFront(side, except){
  const xs = [];
  for (const a of side.units){
    if (a===except || a.fly || a.hp<=0 || a.task || a.role==='support' || a.role==='gremlin' || a.role==='hero') continue;
    xs.push(a.x);
  }
  if (!xs.length) return null;
  xs.sort((a,b)=>(b-a)*side.side);                                   // du plus avancé au moins avancé
  return xs[xs.length>=8? 2 : xs.length>=4? 1 : 0];
}
// « avec la troupe » (gap 0) / « prudent » (gap HERO_GUARD_GAP) : se cale sur le front, jamais devant ;
// sans troupe, il attend près de sa base au lieu de partir seul
function heroFollow(u, side, dt, gap, targets){
  const front = armyFront(side, u);
  let want = front===null? side.x + side.side*150 : front - side.side*gap;
  // « avec la troupe », armée en charge : quand la troupe est AU CONTACT (ennemi, bâtiment ou base à moins de 220 px de
  // son front), il va frapper à ses côtés, à mi-portée de cet ennemi — sinon, derrière une ligne de
  // tireurs postés à 155 px, il restait hors de portée et ne combattait plus (mesuré : parties
  // bloquées). Il ne part jamais seul en avant : c'est la différence avec l'offensif.
  if (gap===0 && front!==null && targets && side.stance==='charge'){   // armée en « tenir » : il reste sur la ligne
    let near = null, nd = 220;
    for (const f of targets){ if (f.hp<=0 && !f.isBase) continue; const dx = (f.x-front)*side.side; if (dx>-12 && dx<nd){ nd = dx; near = f; } }
    // le contact est GARDÉ ~1,5 s après sa disparition (mort de l'ennemi, relève d'une cible) : sans cette mémoire
    // il bondissait devant le front dès qu'un ennemi passait sous 220 px, puis reculait à reculons
    if (near){ u._cx = near.x - side.side*u.range*0.5; u._cT = game.t; }
    else if (u._cx!==undefined && game.t-u._cT>1.5) u._cx = undefined;
    if (u._cx!==undefined && (u._cx-want)*side.side>0) want = u._cx;
  } else u._cx = undefined;
  const d = (want-u.x)*side.side;
  const sp = u.spd*(1+(side.heroPow||1))*envSpd(side)*dt;
  if (d>1e-3) u.x += side.side*Math.min(d, sp);                      // pas de zone morte : le front avance de < 1 px/image
  else if (d<-24) u.x -= side.side*Math.min(-d-12, sp*1.2);        // ne recule que s'il est vraiment trop en avant (> 24 px)
  u.x = clamp(u.x, 30, WORLD-30);
}
function heroAdvance(u, side, dt){   // même vitesse que tryMove, sans la file d'attente derrière les unités de mêlée
  u.x += u.spd*(1+(side.heroPow||1))*envSpd(side)*side.side*dt;
  u.x = clamp(u.x, 30, WORLD-30);
}
// ordre de position : avance vers u.px à l'allure de l'armée (aura du héros, neige) et s'y POSE
// exactement (sans le seuil de 8 px de moveToward) ; renvoie true une fois arrivée
function pointStep(u, side, dt, k){
  const d = u.px - u.x;
  const step = u.spd*(k||1)*(side.heroAlive? (1+(side.heroPow||1)) : 1)*envSpd(side)*dt;
  if (Math.abs(d) <= step){ u.x = u.px; return true; }
  u.x = clamp(u.x + Math.sign(d)*step, 30, WORLD-30);
  return false;
}
// nombre d'unités pouvant se masser sur la même position (croît avec ère + amélioration)
function stackMax(side, u){
  return (u.fly?3:2) + Math.floor(side.era/2) + ((side.upg[u.role]||0)>=2? 1:0);
}
// FORMATION : position voulue d'une unité dans la colonne ordonnée (toutes vocations incluses).
// Renvoie null pour les unités de front (mêlée/tank) qui avancent librement et SERVENT d'ancre.
function formationWant(side, u){
  let anchor = side.x + side.side*220;                       // défaut si aucune unité de front
  let tankX = null;                                          // tête du mur de tanks (bouclier)
  for (const a of side.units){
    if (a.fly || a.hp<=0) continue;
    if (a.role==='tank' && (tankX===null || (a.x-tankX)*side.side>0)) tankX = a.x;
    if ((a.role==='melee'||a.role==='tank') && (a.x-anchor)*side.side>0) anchor = a.x;
  }
  const hasTank = tankX!==null;
  const hum = side.facKey==='HUM';
  let off;
  switch (u.role){
    case 'tank': return null;                               // bouclier : tient le front, avance
    // MÊLÉE OFFENSIVE : se cale juste DERRIÈRE le mur de tanks (le tank encaisse, elle frappe).
    // Sans tank pour la couvrir, elle prend elle-même la ligne de front.
    case 'melee':  return hasTank? tankX - side.side*(hum?26:22) : null;
    case 'air':    off = hum? -34 : -28; break;             // volants : légèrement en pointe
    case 'ranged': off = hum?  60 :  42; break;             // tireurs : juste derrière
    case 'siege':  off = hum? 130 : 105; break;             // artillerie : au fond
    case 'support':off = hum? 185 : 165; break;             // soutien : tout à l'arrière, protégé
    default: return null;
  }
  return anchor - side.side*off;
}
// rapproche/recule l'unité vers sa position de formation ; renvoie true si elle a (presque) sa place
function moveToFormation(u, side, dt){
  const want = formationWant(side, u);
  if (want===null) return false;
  if ((u.x-want)*side.side > 6) moveBack(u, side, dt);
  else if ((want-u.x)*side.side > 8) tryMove(u, side, dt);
  return true;
}
function tryMove(u, side, dt){
  if (u.fly){
    let ahead=0;
    for (const a of side.units){
      if (a===u || !a.fly) continue;
      const d = (a.x-u.x)*side.side;
      if (d>0 && d<18) ahead++;
    }
    if (ahead>=3+Math.floor(side.era/2)) return;
  } else {
    let ahead=0;
    for (const a of side.units){
      if (a===u || a.role==='support' || a.fly) continue;
      const d = (a.x-u.x)*side.side;
      if (d>0 && d<20 && a.range <= u.range+1) ahead++;
    }
    if (ahead >= stackMax(side, u)) return;
  }
  u.x += u.spd*(side.heroAlive? (1+(side.heroPow||1)) :1)*envSpd(side)*side.side*dt;   // ×2 sous l'aura d'un héros (réduite si la légende est affaiblie) ; neige → léger ralentissement
  u.x = clamp(u.x, 30, WORLD-30);
}
function moveBack(u, side, dt){
  u.x -= u.spd*1.2*(side.heroAlive? (1+(side.heroPow||1)) :1)*side.side*dt;
  u.x = clamp(u.x, 30, WORLD-30);
}
// déplacement libre dans les deux sens (tâches, médic) ; renvoie true à l'arrivée
function moveToward(u, tx, dt, sp=1){
  const d = tx - u.x;
  if (Math.abs(d) < 8) return true;
  u.x += Math.sign(d)*u.spd*sp*dt;
  u.x = clamp(u.x, 30, WORLD-30);
  return false;
}
function updateBuildings(side, foe, dt){
  // production : M1 (réseau IA), M10 (couvre-feu / acquis sociaux / canicule / pluie / hiver), jamais appliqué en campagne sauf mission inscrite
  let pk = 1, rk = 1;                              // pk : tous les bâtiments éco ; rk : fermes / panneaux seuls (pluie)
  if (envOn()){
    if (side.facKey==='HUM'){ if (game.weather==='strike') pk = fte('HUM','strikeProd'); else if ((side.afterT||0)>game.t) pk = fte('HUM','acqK'); }
    else if (game.cata==='heat') pk = fte('IA','heatEco');
    rk = rainFarmK(side.facKey);
  }
  const netK = ecoMul(side), wf = winterK(side,'f'), wm = winterK(side,'m');
  const iaBld = asymOn('bld') && side.facKey==='IA';
  for (const s of sideBuildSlots(side)){
    if (!s.b) continue;
    if (s.b.hp<=0){ explode(s.x, gY(s.x)-16, 1.2, '#cfc6b8'); demolish(s, true); sfx('boom'); continue; }
    const b = s.b;
    if (b.type==='site'){
      // chantier derrière les lignes adverses : abandonné, il s'effondre tout seul
      if ((s.x - side.adv)*side.side > 60) b.hp -= 40*dt;
      else assignWorker(side, s);
      continue;
    }
    if (b.age!==undefined) b.age += dt;                                       // ancienneté → bonus de longévité
    if (side.autoRepair && b.hp<b.maxhp) b.hp = Math.min(b.maxhp, b.hp+autoRepRate(side,false)*dt); // nano-réparation
    if (b.type==='turret'){
      // cadence de la tourelle : on accélère le DÉCOMPTE (le délai affiché reste BUILDS.turret.rate) — liaison IA (M5) et signal (M10)
      b.atkT -= dt * ((iaBld && turretLinked(side, s))? 1/ft('IA','turLink') : 1) * ((envOn() && side.facKey==='IA' && game.boon==='signal')? fte('IA','sigTur') : 1);
      if (b.atkT<=0){
        const tRange = BUILDS.turret.range * sandK(side.facKey, true) * (iaBld? ft('IA','turRange') : 1);
        let target=null, best=1e9;
        for (const f of foe.units){ const d=Math.abs(f.x-s.x); if (d<tRange && d<best){best=d;target=f;} }
        if (target){ b.atkT = BUILDS.turret.rate;
          target.hp -= BUILDS.turret.dmg*(1+side.era*0.6)*lvlF(b)*(iaBld? ft('IA','turDmg') : 1)*piquetK(target); target.flash=0.15;
          shots.push({x:s.x, y:gY(s.x)-58, tx:target.x, ty:gY(target.x)-22, t:0, dur:0.14, fac:side.facKey, era:side.era});
          if (side===game.p) sfx('shoot', 2);
        }
      }
    } else if (b.type==='farmF') side.f += BUILDS.farmF.rate*lvlF(b)*longevMul(b)*(side.prodMul||1)*wf*dt*pk*rk*netK;
    else if (b.type==='farmM') side.m += BUILDS.farmM.rate*lvlF(b)*longevMul(b)*(side.prodMul||1)*wm*dt*pk*netK;
    else if (b.type==='well') side.w += BUILDS.well.rate*lvlF(b)*longevMul(b)*(side.prodMul||1)*dt*(1-0.5*game.dev)*pk*netK;
    // garnison : chaque rôle défend à sa façon
    if (b.gar) for (let gi=0; gi<b.gar.length; gi++){
      const g = b.gar[gi];
      g.atkT -= dt; g.bob += dt*7;
      if (g.atkT<=0){
        const isR = g.range>60;                       // tireur/artilleur : tire depuis la structure
        const gr = isR? g.range*1.15 : 52;            // bonus d'élévation ; CAC : défend la porte
        let target=null, best=1e9;
        for (const f of foe.units){
          if (f.fly && !isR) continue;                // la mêlée ne touche pas les volants
          const d=Math.abs(f.x-s.x); if (d<gr && d<best){best=d;target=f;}
        }
        if (target){ g.atkT = g.rate;
          const top = gY(s.x)-bldH(b)-4;
          if (isR){
            target.hp -= g.dmg; target.flash=0.15;
            shots.push({x:s.x+(gi?7:-7), y:top, tx:target.x,
              ty:gY(target.x)-(target.fly? 24+target.flyH:22), t:0, dur:0.14, fac:g.fac, era:g.era});
          } else {
            target.hp -= g.dmg*0.8; target.flash=0.15;
            burst((s.x+target.x)/2, gY(s.x)-20, FACTIONS[g.fac].eraCols[g.era], 4, 0.5);
          }
        }
      }
    }
  }
}
// la garde du château tire depuis les remparts
function updateBaseGarrison(side, foe, dt){
  if (!side.gar || !side.gar.length) return;
  for (let gi=0; gi<side.gar.length; gi++){
    const g = side.gar[gi];
    g.atkT -= dt; g.bob += dt*7;
    if (g.atkT>0) continue;
    const gr = g.range*1.2;
    let target=null, best=1e9;
    for (const f of foe.units){
      const d = Math.abs(f.x-side.x);
      if (d<gr && d<best){ best=d; target=f; }
    }
    if (target){
      g.atkT = g.rate;
      target.hp -= g.dmg; target.flash = 0.15;
      shots.push({x:side.x+(gi-1)*10, y:gY(side.x)-96, tx:target.x,
        ty:gY(target.x)-(target.fly? 24+target.flyH:22), t:0, dur:0.14, fac:g.fac, era:g.era});
      if (side===game.p) sfx('shoot', 2);
    }
  }
}
// poussée de capture d'un lac / d'une zone : un camp FIGÉ (grève, mise à jour forcée) ne capture
// rien — sa présence freine encore la capture adverse, mais ne fait jamais progresser la sienne
function capPush(np, ne, k){
  let push = clamp(np-ne, -3, 3)*k;
  if (push>0 && facFrozen(game.p.facKey)) push = 0;
  if (push<0 && facFrozen(game.e.facKey)) push = 0;
  return push;
}
function updateNodes(dt){
  const dwindle = 1 - 0.65*game.dev;
  for (const n of game.nodes){
    let np=0, ne=0;
    for (const u of game.p.units) if (Math.abs(u.x-n.x)<70) np += capW(u);
    for (const u of game.e.units) if (Math.abs(u.x-n.x)<70) ne += capW(u);
    const push = capPush(np, ne, 0.12*dt);
    if (push!==0){
      n.prog = clamp(n.prog + push, -1, 1);
      if (n.prog>=1 && n.owner!=='p'){ n.owner='p'; game.p.xp += 40; moraleAdd(game.p, ft('HUM','moraleNode'));
        announce(tr('ev_lake'), "#5ad0ff"); evExplain('lake'); sfx('node'); }
      if (n.prog<=-1 && n.owner!=='e'){ n.owner='e'; game.e.xp += 40; moraleAdd(game.e, ft('HUM','moraleNode'));
        announce(tr('ev_lake_lost'), "#d88"); }
    }
    if (n.owner){
      const s = n.owner==='p'? game.p : game.e;
      s.w += (n.center? 3.5 : 2.2)*dwindle*terrK(s)*dt;
      if (n.center){ s.f += 2*dwindle*dt; s.m += 2*dwindle*dt; s.xp += 1.5*dt; } // l'oasis nourrit aussi l'XP
    }
  }
}
function updateZones(dt){
  const p=game.p, e=game.e;
  for (const z of game.zones){
    let np=0, ne=0;
    for (const u of p.units) if (Math.abs(u.x-z.x)<80) np += capW(u);
    for (const u of e.units) if (Math.abs(u.x-z.x)<80) ne += capW(u);
    const push = capPush(np, ne, 0.10*dt);
    if (push!==0){
      z.prog = clamp(z.prog+push, -1, 1);
      if (z.prog>=1 && z.owner!=='p'){ z.owner='p'; moraleAdd(p, ft('HUM','moraleNode')); announce(tr('ev_zone'), '#9dd88a'); evExplain('zone'); }
      if (z.prog<=-1 && z.owner!=='e'){ z.owner='e'; moraleAdd(e, ft('HUM','moraleNode')); }
    }
    if (z.owner==='p') p.xp += 0.5*terrK(p)*dt; else if (z.owner==='e') e.xp += 0.5*terrK(e)*dt;
  }
  // catch-up : le perdant (base la plus basse) gagne +5% atk/déf par zone qu'il NE tient PAS (max +15%)
  const pf=p.hp/p.maxhp, ef=e.hp/e.maxhp;
  const loser = pf<ef-0.02? 'p' : ef<pf-0.02? 'e' : null;
  const ownedBy = k => game.zones.reduce((n,z)=>n+(z.owner===k?1:0),0);
  p.zoneBuff = loser==='p'? 0.05*(3-ownedBy('p')) : 0;
  e.zoneBuff = loser==='e'? 0.05*(3-ownedBy('e')) : 0;
}
function update(dt){
  if (!game || game.over || paused) return;
  // TUTORIEL : monde gelé pendant les étapes d'info / le bloc défense — la simulation est
  // suspendue mais les FX retombent et tutTick continue de détecter les actions. Toujours
  // réversible (un bouton « Continuer » / « Passer » visible). Jamais de blocage.
  if (game.tut && TUT && tutFrozen()){
    if (game.shake>0) game.shake=Math.max(0,game.shake-dt*30);
    if (game.flash>0) game.flash-=dt;
    tutTick(dt); return;
  }
  game.t += dt;
  if (game.boomAt!==undefined && game.t>=game.boomAt){ game.boomAt = undefined; sfxAt('boom', WORLD/2); }   // détonation de la Bombe H
  const p=game.p, e=game.e, d=game.d;
  if (CHEAT.god){ p.hp=p.maxhp; for (const u of p.units) u.hp=u.maxhp; }   // MODE TRICHE : base + troupes du joueur invincibles
  // comeback RENFORCÉ : le camp qui perd produit nettement plus, recharge son ultime plus
  // vite, frappe plus fort (combatBuff) et encaisse un peu mieux.
  const lp = losing01(p), le = losing01(e);
  p.combatBuff = lp; e.combatBuff = le;
  // hiver nucléaire : malus dégressif (÷2 → ×1 en 6 min ; M10 : la machine ne perd que son ⚡) · PLUIE FERTILE : revenu de base
  // 🌾/⚡ +30 % pour tous (M10 : humains +40 %, machines −20 %)
  p.prodMul = 1 + 0.9*lp;
  e.prodMul = (1 + 0.9*le) * (d.cheat||1) * (asymOn('econ') && !game.net? (AI_K[game.diff]||1)*(game.noKF? 1 : (AI_KF[e.facKey]||1)) : 1);   // noKF : le banc bot contre bot n'a pas d'« IA adverse »     // triche IA selon la difficulté
  p.f += 4*p.prodMul*winterK(p,'f')*rainBaseK(p.facKey)*dt; p.m += 2.5*p.prodMul*winterK(p,'m')*dt; p.w += 0.6*p.prodMul*dt;
  e.f += 4*d.inc*e.prodMul*winterK(e,'f')*rainBaseK(e.facKey)*dt; e.m += 2.5*d.inc*e.prodMul*winterK(e,'m')*dt; e.w += 0.6*d.inc*e.prodMul*dt;
  // XP passive de base + bonus par niveau de fortification de la base principale
  p.xp += (2.2 + ((p.fortLvl||1)-1)*1.3)*dt; e.xp += (2.2 + ((e.fortLvl||1)-1)*1.3)*dt;
  for (let i=0;i<6;i++){ if(p.cd[i]>0)p.cd[i]-=dt; if(e.cd[i]>0)e.cd[i]-=dt; }
  if (p.heroCd>0) p.heroCd -= dt; if (e.heroCd>0) e.heroCd -= dt;
  // nano-réparation passive de la base
  if (p.autoRepair && p.hp<p.maxhp) p.hp = Math.min(p.maxhp, p.hp+autoRepRate(p,true)*dt);
  if (e.autoRepair && e.hp<e.maxhp) e.hp = Math.min(e.maxhp, e.hp+autoRepRate(e,true)*dt);
  // SIGNAL RENFORCÉ : ultime se recharge plus vite (+30 % pour tous ; M10 : humains +10 %, machines +50 %)
  if (p.specialCd>0) p.specialCd -= dt*(1+1.8*lp)*sigK(p.facKey);
  if (e.specialCd>0) e.specialCd -= dt*(1+1.8*le)*sigK(e.facKey);
  if (p.siegeT>0) p.siegeT -= dt; if (e.siegeT>0) e.siegeT -= dt;   // MODE SIÈGE (héros) : décompte
  // la santé du monde use les vivants : le camp qui DOMINE s'use plus vite (catch-up)
  if (game.dev>0.12){
    const wearP = game.dev*(0.15+0.85*(1-lp))*dt;
    const wearE = game.dev*(0.15+0.85*(1-le))*dt;
    for (const u of p.units) u.hp -= wearP*1.2;
    for (const u of e.units) u.hp -= wearE*1.2;
    for (const s of sideBuildSlots(p)) if (s.b && s.b.type!=='site') s.b.hp -= wearP*2;
    for (const s of sideBuildSlots(e)) if (s.b && s.b.type!=='site') s.b.hp -= wearE*2;
  }

  // le front est la position ACTUELLE des troupes (plus de territoire « historique » :
  // l'ennemi ne peut plus ouvrir de chantier derrière vos lignes après un raid passé)
  p.adv = p.x; for (const u of p.units) if (!u.fly && u.x>p.adv) p.adv = u.x;
  e.adv = e.x; for (const u of e.units) if (!u.fly && u.x<e.adv) e.adv = u.x;

  // ---- événements sociaux/système : deux malus SYMÉTRIQUES de 15 s, un par faction ----
  // Grève générale (humains figés) ↔ Mise à jour forcée (machines figées).
  if (!game.tut && game.t>120){
    game.wClock = (game.wClock + dt) % 150;
    const newW = (game.wClock>=30 && game.wClock<45)? 'strike'
               : (game.wClock>=90 && game.wClock<105)? 'patch' : null;
    if (newW !== game.weather){
      const oldW = game.weather;
      game.weather = newW;
      if (envOn() && oldW){          // fin d'événement : « acquis sociaux » (humains, +20 % de production 30 s) / « correctif » (machines : chaleur remise à 0, cadence +10 %)
        for (const sd of [p,e]){
          if (oldW==='strike' && sd.facKey==='HUM'){ moraleAdd(sd, 10); sd.afterT = game.t + fte('HUM','acqT'); addFloater(sd.x, gY(sd.x)-120, fmt('f_acq',evNums()), '#9dc88a', 14); }
          if (oldW==='patch' && sd.facKey==='IA'){ sd.afterT = game.t + fte('IA','fixT'); addFloater(sd.x, gY(sd.x)-120, fmt('f_fix',evNums()), '#5ad0ff', 14);
            for (const u of sd.units){ u.heat = 0; u.tiredT = 0; } }
        }
      }
      if (newW==='strike') for (const sd of [p,e]) moraleAdd(sd, -ft('HUM','moraleStrike'));   // M4 : le couvre-feu casse le moral
      if (newW==='strike') announce(tr('ev_strike'), '#ff9d45');
      else if (newW==='patch') announce(tr('ev_patch'), '#5ad0ff');
    }
  }
  evWatch();                                   // 1re occurrence d'un événement : une ligne d'explication sous l'annonce
  // ---- événements POSITIFS (équitables : profitent aux DEUX camps) ----
  // Pluie fertile (+30 % nourriture) puis Signal renforcé (ultime plus rapide).
  if (!game.tut && game.t>90){
    game.boonClock = (game.boonClock + dt) % 110;
    const nb = (game.boonClock>=20 && game.boonClock<35)? 'rain'
             : (game.boonClock>=70 && game.boonClock<85)? 'signal' : null;
    if (nb !== game.boon){
      game.boon = nb;
      if (nb==='rain') announce(tr('ev_rain'), '#7fd0ff');
      else if (nb==='signal') announce(tr('ev_signal'), '#b9ff9d');
    }
  }
  // ---- 4e ZONE BONUS temporaire : apparaît vers la mi-partie, ~60 s, puis disparaît ----
  game.bonusClock += dt;
  if (!game.bonusZone && !game._bz && game.bonusClock>180){
    game._bz = true;
    game.bonusZone = {x:WORLD*(0.42+Math.random()*0.16), owner:null, prog:0, t:0};
    announce(tr('ev_bonuszone'), '#ffd34a'); evExplain('bonuszone'); sfx('node');
  }
  if (game.bonusZone){
    const z=game.bonusZone; z.t+=dt;
    let np=0,ne=0;
    for (const u of p.units) if (Math.abs(u.x-z.x)<80) np += capW(u);
    for (const u of e.units) if (Math.abs(u.x-z.x)<80) ne += capW(u);
    z.prog = clamp(z.prog + capPush(np, ne, 0.12*dt), -1, 1);
    z.owner = z.prog>=0.6?'p': z.prog<=-0.6?'e':null;
    z.contested = (np>0 && ne>0);                         // grésille/oscille à l'écran
    if (z.owner==='p') p.xp += 1.4*terrK(p)*dt; else if (z.owner==='e') e.xp += 1.4*terrK(e)*dt;
    if (z.t>60) game.bonusZone = null;                    // disparaît
  }
  // ---- siège final : sous 20 % de PV, le pouvoir désespéré se débloque ----
  if (!p.lastSeen && p.hp < p.maxhp*0.2){ p.lastSeen=true; p.lastReady=true;
    announce(tr('ev_lastresort'), '#ff5a4a'); sfx('spec'); }
  if (!e.lastSeen && e.hp < e.maxhp*0.2){ e.lastSeen=true; e.lastReady=true; }

  if (game.net==='host'){ let c; while((c=net.cmdQ.shift())) applyCmd(c); } // commandes de l'invité
  else if (!game.net && !game.tut) aiUpdate(dt);                             // IA en solo (escarmouche ; jamais en tuto)
  processQueue(p); processQueue(e);                                          // file d'attente de production
  moraleTick(p, dt); moraleTick(e, dt);
  updateUnits(p,e,dt); updateUnits(e,p,dt);
  updateBuildings(p,e,dt); updateBuildings(e,p,dt);
  updateBaseGarrison(p,e,dt); updateBaseGarrison(e,p,dt);
  updateNodes(dt);
  updateZones(dt);
  checkTrans(p); checkTrans(e);

  // santé du monde : dégradation ralentie — saturation visée vers la 16e min (~960 s)
  // pour des parties d'environ 20 min ; les pertes/pouvoirs n'accélèrent plus que marginalement.
  game.dev = game.tut? 0 : clamp((game.devBase||0) + game.t/960 + (game.kills+game.eKills)/600 + game.specialsUsed*0.02, 0, 1);   // devBase : état du monde au début d'une mission de campagne
  if (!game.tut){ updateCata(dt); evWatch(); }
  // EFFONDREMENT (v1.14) : passé 26 min, le monde ne tient plus debout — les DEUX bases se délabrent,
  // de plus en plus vite. Sans cela, une fois la santé du monde à zéro, les cataclysmes fauchaient
  // les vagues avant qu'elles n'arrivent et la partie pouvait ne jamais finir (15 à 55 % des parties
  // simulées atteignaient 40 min). La base la plus entamée tombe la première.
  if (!game.tut && game.t > COLLAPSE_T){
    if (!game.collapse){ game.collapse = true; announce(tr('ev_collapse'), '#ff7a5a'); sfx('boom'); game.shake = Math.max(game.shake, 10); }
    const k = 0.0015*(1 + (game.t-COLLAPSE_T)/300)*dt;
    p.hp -= p.maxhp*k; e.hp -= e.maxhp*k;
  }

  for (let i=projectiles.length-1;i>=0;i--){
    const pr=projectiles[i]; pr.t+=dt;
    if (pr.t>=pr.dur){
      const foe = pr.side===1? game.e: game.p;
      explode(pr.tx, gY(pr.tx)-8, 0.9, FACTIONS[pr.fac].eraCols[pr.era]);
      sfxAt('boom', pr.tx);
      if (Math.random()<0.45) addCrater(pr.tx, Math.max(20, pr.aoe*0.8));
      let hitAny=false;
      const spare = facFrozen(pr.fac);   // camp figé (grève / mise à jour) : ses obus épargnent bâtiments et base
      for (const t of foeTargets(foe)){
        if (t.fly) continue; // les obus en cloche n'atteignent pas les volants
        if (spare && (t.isBase || t.isB)) continue;
        if (Math.abs(t.x-pr.tx) < pr.aoe){
          hitAny=true;
          if (t.isBase||t.isB){ const own = pr.side===1? game.p : game.e;      // v1.13 : le MODE SIÈGE et l'XP de base valent aussi pour les obus
            t.hit(pr.dmg*1.6*pr.hb*(own.siegeT>0? 1.3 : 1)); if (t.isBase) own.xp += pr.dmg*pr.hb*0.04; }
          else { t.hp -= pr.dmg*pr.hb/homeBuff(t); t.flash=0.2; }
        }
      }
      // RICOCHET : un obus tombé à vide projette des éclats sur l'unité au sol la plus
      // proche juste au-delà du rayon (dégâts partiels).
      if (!hitAny){
        let best=null, bd=pr.aoe*2.2;
        for (const t of foeTargets(foe)){ if (t.fly||t.isBase||t.isB) continue;
          const d=Math.abs(t.x-pr.tx); if (d>=pr.aoe && d<bd){ bd=d; best=t; } }
        if (best){ best.hp -= pr.dmg*0.5*pr.hb/homeBuff(best); best.flash=0.2;
          burst(best.x, gY(best.x)-14, FACTIONS[pr.fac].eraCols[pr.era], qN(5)); }
      }
      game.shake = Math.max(game.shake, 3);
      projectiles.splice(i,1);
    }
  }
  stepParticles(dt);
  for (let i=deaths.length-1;i>=0;i--){ deaths[i].t+=dt; if(deaths[i].t>deaths[i].life) deaths.splice(i,1); }
  for (let i=wrecks.length-1;i>=0;i--){ wrecks[i].t+=dt; if(wrecks[i].t>50) wrecks.splice(i,1); }
  // repères d'INTERFACE (textes flottants, annonces, secousse, flash, ⚑) : temps RÉEL. update() est
  // sous-découpé à ×2/×3 — une annonce de 2,6 s n'en durait plus que 0,9 à ×3, illisible.
  const uiDt = dt / (game.speed||1);
  for (let i=floaters.length-1;i>=0;i--){ const f=floaters[i]; f.t+=uiDt; f.y-=22*uiDt; if(f.t>1.6) floaters.splice(i,1); }
  for (let i=shots.length-1;i>=0;i--){ shots[i].t+=dt; if(shots[i].t>shots[i].dur) shots.splice(i,1); }
  if (game.shake>0) game.shake=Math.max(0,game.shake-uiDt*30);
  if (game.flash>0) game.flash-=uiDt;
  if (game.msgT>0) game.msgT-=uiDt;
  tickPointFlags(uiDt);                       // fanions ⚑ : visibles tant que les unités ne sont pas arrivées

  if (camFollow && !dragging){
    let front = p.units.length? Math.max(...p.units.map(u=>u.x)) : p.x+200;
    const target = clamp(front - VW()*0.45, 0, WORLD-VW());
    camX = lerp(camX, target, Math.min(1,dt*2.2));
  }
  camClamp();

  if (game.tut){
    // BARRIÈRE du tutoriel : AUCUNE troupe du joueur (y compris AÉRIENNE) ne franchit la ligne
    if (game.tutBarrier!=null) for (const u of game.p.units){
      if (u.px!=null && u.px>game.tutBarrier) u.px = game.tutBarrier;
      if (u.x>game.tutBarrier){ u.x=game.tutBarrier; if(u.tx>game.tutBarrier) u.tx=game.tutBarrier; }
    }
    tutTick(dt); return;   // détection des actions, jamais de victoire/défaite « normale »
  }

  if (game.camp && campTick(dt)) return;      // campagne : radio, règles et objectifs propres à la mission

  if (p.hp<=0 || e.hp<=0){
    const faller = p.hp<=0? p : e;
    // SECONDE CHANCE — INDÉPENDANTE PAR CAMP : la 1re fois qu'une base tombe, elle renaît
    // plus solide (phase 2). Chaque base possède donc bien ses deux phases. L'Hiver
    // nucléaire (Bombe H) ne se déclenche qu'UNE fois, à la 1re base abattue — drapeau dédié :
    // « !game.winter » redevenait vrai 6 min plus tard et la 2e base abattue rasait tout à nouveau.
    if ((faller.phase||1)<2){
      faller.phase = 2;
      faller.maxhp = Math.round(faller.maxhp*2.2);
      faller.hp = faller.maxhp;
      if (!game.hbombDone){ game.hbombDone = true; triggerNuclearWinter(); }
      else { game.flash=Math.max(game.flash||0,1.2); game.shake=Math.max(game.shake,20);
        nukeBlast(faller.x, 220); announce(tr('ev_reborn'), '#bfe6ff'); sfx('boom'); }
    } else {
      game.over=true; game.win = e.hp/e.maxhp <= p.hp/p.maxhp;   // les deux bases à terre au même instant : la plus entamée perd
      game.shake=20;
      const fx2=(game.win?e:p).x; explode(fx2, gY(fx2)-40, 2.2, '#fff0c0'); burst(fx2, gY(fx2)-60, '#fff', 30, 1.6);
      sfx(game.win?'evolve':'boom');
      setTimeout(game.camp? campEndCine : showEnd, 1100);
    }
  }
}
// EXPLICATIONS CONTEXTUELLES (v1.15) : la 1re fois qu'un événement survient dans une partie, une ligne
// sous son annonce dit exactement ce qu'il fait (clés evx_*). Détection par CHANGEMENT D'ÉTAT plutôt
// qu'au moment de l'annonce : marche aussi chez l'invité en ligne (état reçu de l'hôte, ligne affichée
// dans SA langue) et en campagne, où la mise à jour forcée est déclenchée sans annonce.
const EV_TITLE = { strike:['ev_strike','#ff9d45'], patch:['ev_patch','#5ad0ff'], rain:['ev_rain','#7fd0ff'], signal:['ev_signal','#b9ff9d'] };
function evWatch(){
  const g = game; if (!g || g.tut) return;
  const w = g._evW || (g._evW = {we:null, bo:null, ca:null, wi:false});
  if (g.weather!==w.we){ w.we = g.weather; if (g.weather) evExplain(g.weather); }
  if (g.boon!==w.bo){ w.bo = g.boon; if (g.boon) evExplain(g.boon); }
  if (g.cata!==w.ca){ w.ca = g.cata; if (g.cata) evExplain(g.cata); }
  if (!!g.winter!==w.wi){ w.wi = !!g.winter; if (g.winter) evExplain('winter'); }
}
// valeurs réelles (FAC_TRAITS) injectées dans les textes d'événement : {dmg} {acq} {acqT} {fix} {fixT}
function evNums(){ return { dmg:Math.round((1-fte('HUM','piquet'))*100), acq:Math.round((fte('HUM','acqK')-1)*100), acqT:fte('HUM','acqT'),
  fix:Math.round((fte('IA','fixK')-1)*100), fixT:fte('IA','fixT') }; }
function evExplain(key){
  const g = game; if (!g) return;
  const seen = g.evSeen || (g.evSeen = {});
  if (seen[key]) return;
  // ligne propre à la faction du joueur (clé evx_<ev>_hum / _ia) quand l'asymétrie d'environnement est active, repli sur evx_<ev>
  const fsuf = (g.p && g.p.facKey==='IA')? '_ia' : '_hum', kf = 'evx_'+key+fsuf;
  let sub = asymOn(/^(lake|zone|bonuszone)$/.test(key)? 'terrain' : 'env')? tr(kf) : tr('evx_'+key);
  if (!sub || sub===kf || sub==='evx_'+key) sub = tr('evx_'+key);
  if (!sub || sub==='evx_'+key) return;
  seen[key] = 1;
  { const N = evNums(); sub = String(sub).replace(/\{(\w+)\}/g,(m,k)=>N[k]!=null? N[k] : m); }
  // l'annonce vient d'être faite (même pas de simulation) : on la complète ; sinon on la fait ici
  if (!g.msg || !(g.msgT > 2.3)){
    const tt = EV_TITLE[key], c = CATAS[key];
    if (tt) g.msg = { txt:tr(tt[0]), color:tt[1] };
    else if (c) g.msg = { txt:c.icon+'  '+cataName(key)+'  '+c.icon, color:c.col };
    else return;
  }
  g.msg.sub = sub; g.msgT = Math.max(g.msgT||0, 5.5);   // le temps de lire les deux lignes
}
// Bombe H : rase tout (sauf bases), bascule en Hiver nucléaire (production réduite, neige)
const COLLAPSE_T = 1560;  // début de l'effondrement du monde (26 min de jeu)
const WINTER_DUR = 360;   // l'hiver nucléaire dure 6 min puis le monde revient à la normale
function triggerNuclearWinter(){
  const g=game;
  g.winter = true; g.winterT = WINTER_DUR;
  g.flash = 1.6; g.shake = Math.max(g.shake,34);
  addLight(WORLD/2, gY(WORLD/2)-80, '#fff4e0', 900, 1.4);          // flash lumineux global de la Bombe H
  razeMap();
  announce(tr('ev_hbomb'), '#bfe6ff');
  addFloater(WORLD/2, gY(WORLD/2)-150, tr('ev_winter_sub'), '#bfe6ff', 14);
  // SILENCE DRAMATIQUE puis détonation : la musique se tait, le « boom » tombe ~0,6 s après le flash.
  if (AC){ audioDuckUntil = AC.currentTime + 0.6; }
  g.boomAt = g.t + 0.6;                      // horloge de jeu (et non setTimeout : le son ne jouait plus en pause / au menu)
}
// malus d'hiver qui s'estompe : ÷2 au début → ×1 (normal) après 6 min
function winterMul(){ return game.winter? clamp(0.5 + 0.5*(1-(game.winterT||0)/WINTER_DUR), 0.5, 1) : 1; }