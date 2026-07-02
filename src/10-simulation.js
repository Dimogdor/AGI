/* ================= SIMULATION ================= */
function foeTargets(foe){
  const out = foe.units.slice();
  for (const s of sideBuildSlots(foe)){
    if (s.b) out.push({isB:true, slot:s, x:s.x, get hp(){return s.b?s.b.hp:0},
      hit(d){ if(s.b){ s.b.hp -= d*(s.b.gar&&s.b.gar.length? 0.75:1); } } });
  }
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
    target.hp -= out; target.flash = 0.15;
    if (attacker && attacker.role) target.lastHit = attacker;        // pour la vétérance
  }
}
function updateUnits(side, foe, dt){
  const targets = foeTargets(foe);
  const m = statMul(side.era);
  const garMoves = [];
  const medClaims = new Set(); // un blessé soigné par un médic ne sera pas ciblé par les autres ce tick
  // unité héroïque vivante : ×3 dégâts et ×2 vitesse pour TOUT le camp (réduit si la légende est affaiblie)
  side.heroAlive = side.units.some(u=>u.role==='hero');
  side.heroPow = side.heroAlive ? (side.units.find(u=>u.role==='hero').heroPow||1) : 0;
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
    // récupération hors combat : les humains soufflent plus vite que les machines ne refroidissent
    if (u.heat>0) u.heat = Math.max(0, u.heat-(u.fac==='IA'?0.030:0.05)*dt);
    if (u.role==='support') u.supT -= dt;
    // aura du héros humain (Che) : soigne en continu les alliés proches, en plus de combattre
    if (u.role==='hero' && u.fac==='HUM'){
      u.auraT = (u.auraT||0) - dt;
      if (u.auraT<=0){ u.auraT = 1;
        for (const a of side.units) if (a!==u && a.hp<a.maxhp && Math.abs(a.x-u.x)<150){
          a.hp = Math.min(a.maxhp, a.hp + 28*m);
          addFloater(a.x, gY(a.x)-50, '+❤', '#6dff8a', 11);
        }
      }
    }
    const st = u.ord || side.stance;
    // ---- tâche assignée : chantier ou garnison (envoi direct depuis le pool) ----
    if (u.task){
      const sl = u.task.slot;
      const okB = sl && sl.b && u.task.kind==='build' && sl.b.type==='site' && sl.owner===side;
      const okG = sl && canGar(sl.b) && u.task.kind==='garrison' && sl.owner===side && sl.b.gar.length<GAR_MAX;
      const okC = u.task.kind==='gbase' && side.gar.length<3;   // garde du château
      if (!okB && !okG && !okC){ u.task = null; }
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
        u.droneT -= dt;
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
        u.supT = isHive? base*1.35 : base;
        const heal = (isHive? 40+9*lvl : 45+10*lvl)*m;
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
      if (u.ord==='hold'){
        const hx = (u.holdX!=null)? u.holdX : u.x;     // tient la position ordonnée, soigne ce qui passe à portée
        if (Math.abs(u.x-hx)>4) moveToward(u, hx, dt, 1.0);
      } else if (u.ord==='charge'){
        tryMove(u, side, dt);                          // avance au front avec les troupes, soigne en chemin
      } else if (u.ord==='retreat'){
        const homeX = side.x + side.side*150;
        if ((u.x-homeX)*side.side>4) moveBack(u, side, dt);
      } else if (u.ord==='point'){
        // ordre de position explicite : le soutien s'y poste (et soigne ce qui passe à portée)
        if (u.px!=null && Math.abs(u.x-u.px)>10) moveToward(u, u.px, dt, 1.05);
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
    let noMove = false;
    if (st==='retreat'){
      const homeX = side.x + side.side*150;
      if ((u.x-homeX)*side.side > 4){ moveBack(u, side, dt); continue; }
      if (u.ord==='retreat'){ u.ord='hold'; u.holdX = u.x; }
      noMove = true;
    }
    // ---- malus social/système : la faction « figée » refuse d'attaquer et se contente de tenir ----
    const muzzled = (u.fac==='HUM' && game.weather==='strike') || (u.fac==='IA' && game.weather==='patch');
    if (muzzled) noMove = true;
    // ---- ciblage (mêlée au sol ≠ volants ; tempête de sable : visée longue brouillée) ----
    // BONUS DE RELIEF : tenir une hauteur (bosse de terrain) accroît légèrement portée et
    // dégâts — récompense le contrôle des collines. elev : 0 en plaine → 1 au sommet.
    const elev = u.fly? 0 : clamp((GROUND - gY(u.x))/26, 0, 1);
    const meleeGround = u.range<=24 && !u.fly;
    const eRange = u.range * (game.cata==='sand' && u.range>60? 0.78 : 1) * (1 + 0.14*elev);
    let target=null, best=1e9;
    if (!muzzled) for (const f of targets){
      if (f.hp<=0 && !f.isBase) continue;
      if (f.fly && meleeGround) continue;
      const dx = (f.x-u.x)*u.side;
      if (dx>-12 && dx<best){ best=dx; target=f; }
    }
    if (target && best<=eRange){
      if (u.atkT<=0){
        const tired = u.tiredT>0;
        const isIA = u.fac==='IA';
        // pénalité d'épuisement : GPT surchauffe DUR (sprint), HUM fatigue en douceur (marathon)
        u.atkT = u.rate * (tired? (isIA?1.8:1.3) : 1);
        // ×3 si héros allié vivant, + bonus offensif de comeback ; pénalité d'épuisement par faction
        const dmgOut = u.dmg * (tired? (isIA?0.55:0.8) : 1) * (u.farT>0?0.9:1) * (1 + 0.12*elev) * (side.siegeT>0 && u.range>60?1.1:1) * (side.heroAlive? (1+2*(side.heroPow||1)) :1) * (1 + 0.25*(side.combatBuff||0)) * (1 + (side.zoneBuff||0));
        // jauge d'effort : GPT chauffe vite et s'effondre longtemps ; HUM monte lentement, dip court
        u.heat = (u.heat||0) + (isIA? 0.08 : 0.045);
        if (u.heat>=1){
          u.heat = 0; u.tiredT = isIA? 6 : 3;
          addFloater(u.x, gY(u.x)-60-(u.fly?u.flyH:0),
            tr(isIA? 'f_overheat':'f_tired'), '#d8a06a', 11);
        }
        const sy0 = gY(u.x)-26-(u.fly? u.flyH:0);
        const ty0 = gY(target.x)-(target.isBase?56:(target.fly? 24+target.flyH : 24));
        if (u.arc){
          projectiles.push({sx:u.x, tx:target.x, dmg:dmgOut, aoe:u.aoe, side:u.side, fac:u.fac, t:0, dur:0.7, era:u.era, hb:homeBuff(u), src:u});
          if (u.side===1) sfx('shoot', 3);
        } else if (u.range>60){
          shots.push({x:u.x+u.side*10, y:sy0, tx:target.x, ty:ty0, t:0, dur:0.16, fac:u.fac, era:u.era});
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
      // tient sa position de repli
    } else if (st==='point'){
      // ORDRE DE POSITION : rejoint le point assigné (⚑) puis DÉFEND sur place —
      // le ciblage ci-dessus reste actif, l'unité combat tout ce qui entre à portée.
      if (u.px!=null && Math.abs(u.x-u.px)>10) moveToward(u, u.px, dt, 1.05);
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
    else if (!gm.base && canGar(gm.sl.b) && gm.sl.b.gar.length<GAR_MAX){
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
        deaths.push({x:u.x, fac:u.fac, era:u.era, role:u.role, fly:!!u.fly, flyH:u.flyH||0, side:u.side, t:0, life:0.75});
      // journal des morts : alimente la carte thermique (pause) et le récit de fin de partie
      if (game.killLog){ game.killLog.push({x:u.x, s:u.side}); if (game.killLog.length>140) game.killLog.shift(); }
      foe.xp += u.xpv; foe.f += u.xpv*0.5; foe.m += u.xpv*0.5;
      if (foe===game.p){ game.kills++; addFloater(u.x, gY(u.x)-50, "+"+u.xpv+"✦", "#cdb4ff"); sfx('die'); }
      else game.eKills++;
      game.sel.delete(u);
      side.units.splice(i,1);
    }
  }
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
  u.x += u.spd*(side.heroAlive? (1+(side.heroPow||1)) :1)*(game.winter?0.82:1)*side.side*dt;   // ×2 sous l'aura d'un héros (réduite si la légende est affaiblie) ; neige → léger ralentissement
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
  for (const s of sideBuildSlots(side)){
    if (!s.b) continue;
    if (s.b.hp<=0){ burst(s.x, gY(s.x)-30, '#aaa', 14); demolish(s, true); sfx('boom'); continue; }
    const b = s.b;
    if (b.type==='site'){
      // chantier derrière les lignes adverses : abandonné, il s'effondre tout seul
      if ((s.x - side.adv)*side.side > 60) b.hp -= 40*dt;
      else assignWorker(side, s);
      continue;
    }
    if (b.age!==undefined) b.age += dt;                                       // ancienneté → bonus de longévité
    if (side.autoRepair && b.hp<b.maxhp) b.hp = Math.min(b.maxhp, b.hp+4*dt); // nano-réparation
    if (b.type==='turret'){
      b.atkT -= dt;
      if (b.atkT<=0){
        const tRange = BUILDS.turret.range * (game.cata==='sand'?0.78:1);
        let target=null, best=1e9;
        for (const f of foe.units){ const d=Math.abs(f.x-s.x); if (d<tRange && d<best){best=d;target=f;} }
        if (target){ b.atkT = BUILDS.turret.rate;
          target.hp -= BUILDS.turret.dmg*(1+side.era*0.6)*lvlF(b); target.flash=0.15;
          shots.push({x:s.x, y:gY(s.x)-58, tx:target.x, ty:gY(target.x)-22, t:0, dur:0.14, fac:side.facKey, era:side.era});
          if (side===game.p) sfx('shoot', 2);
        }
      }
    } else if (b.type==='farmF') side.f += BUILDS.farmF.rate*lvlF(b)*longevMul(b)*(side.prodMul||1)*winterMul()*dt;
    else if (b.type==='farmM') side.m += BUILDS.farmM.rate*lvlF(b)*longevMul(b)*(side.prodMul||1)*winterMul()*dt;
    else if (b.type==='well') side.w += BUILDS.well.rate*lvlF(b)*longevMul(b)*(side.prodMul||1)*dt*(1-0.5*game.dev);
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
function updateNodes(dt){
  const dwindle = 1 - 0.65*game.dev;
  for (const n of game.nodes){
    let np=0, ne=0;
    for (const u of game.p.units) if (Math.abs(u.x-n.x)<70) np++;
    for (const u of game.e.units) if (Math.abs(u.x-n.x)<70) ne++;
    const push = clamp(np-ne, -3, 3)*0.12*dt;
    if (push!==0){
      n.prog = clamp(n.prog + push, -1, 1);
      if (n.prog>=1 && n.owner!=='p'){ n.owner='p'; game.p.xp += 40;
        announce(tr('ev_lake'), "#5ad0ff"); sfx('node'); }
      if (n.prog<=-1 && n.owner!=='e'){ n.owner='e'; game.e.xp += 40;
        announce(tr('ev_lake_lost'), "#d88"); }
    }
    if (n.owner){
      const s = n.owner==='p'? game.p : game.e;
      s.w += (n.center? 3.5 : 2.2)*dwindle*dt;
      if (n.center){ s.f += 2*dwindle*dt; s.m += 2*dwindle*dt; s.xp += 1.5*dt; } // l'oasis nourrit aussi l'XP
    }
  }
}
function updateZones(dt){
  const p=game.p, e=game.e;
  for (const z of game.zones){
    let np=0, ne=0;
    for (const u of p.units) if (Math.abs(u.x-z.x)<80) np++;
    for (const u of e.units) if (Math.abs(u.x-z.x)<80) ne++;
    const push = clamp(np-ne, -3, 3)*0.10*dt;
    if (push!==0){
      z.prog = clamp(z.prog+push, -1, 1);
      if (z.prog>=1 && z.owner!=='p'){ z.owner='p'; announce(tr('ev_zone'), '#9dd88a'); }
      if (z.prog<=-1 && z.owner!=='e'){ z.owner='e'; }
    }
    if (z.owner==='p') p.xp += 0.5*dt; else if (z.owner==='e') e.xp += 0.5*dt;
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
  const p=game.p, e=game.e, d=game.d;
  if (CHEAT.god){ p.hp=p.maxhp; for (const u of p.units) u.hp=u.maxhp; }   // MODE TRICHE : base + troupes du joueur invincibles
  // comeback RENFORCÉ : le camp qui perd produit nettement plus, recharge son ultime plus
  // vite, frappe plus fort (combatBuff) et encaisse un peu mieux.
  const lp = losing01(p), le = losing01(e);
  p.combatBuff = lp; e.combatBuff = le;
  const wM = winterMul();                      // hiver nucléaire : malus nourriture/énergie dégressif (÷2 → ×1 en 6 min)
  const rainMul = game.boon==='rain'? 1.3 : 1; // PLUIE FERTILE : +30 % nourriture (les deux camps)
  p.prodMul = 1 + 0.9*lp;
  e.prodMul = (1 + 0.9*le) * (d.cheat||1);     // triche IA selon la difficulté
  p.f += 4*p.prodMul*wM*rainMul*dt; p.m += 2.5*p.prodMul*wM*dt; p.w += 0.6*p.prodMul*dt;
  e.f += 4*d.inc*e.prodMul*wM*rainMul*dt; e.m += 2.5*d.inc*e.prodMul*wM*dt; e.w += 0.6*d.inc*e.prodMul*dt;
  // XP passive de base + bonus par niveau de fortification de la base principale
  p.xp += (2.2 + ((p.fortLvl||1)-1)*1.3)*dt; e.xp += (2.2 + ((e.fortLvl||1)-1)*1.3)*dt;
  for (let i=0;i<6;i++){ if(p.cd[i]>0)p.cd[i]-=dt; if(e.cd[i]>0)e.cd[i]-=dt; }
  if (p.heroCd>0) p.heroCd -= dt; if (e.heroCd>0) e.heroCd -= dt;
  // nano-réparation passive de la base
  if (p.autoRepair && p.hp<p.maxhp) p.hp = Math.min(p.maxhp, p.hp+8*dt);
  if (e.autoRepair && e.hp<e.maxhp) e.hp = Math.min(e.maxhp, e.hp+8*dt);
  const sigMul = game.boon==='signal'? 1.3 : 1;   // SIGNAL RENFORCÉ : ultime se recharge plus vite
  if (p.specialCd>0) p.specialCd -= dt*(1+1.8*lp)*sigMul;
  if (e.specialCd>0) e.specialCd -= dt*(1+1.8*le)*sigMul;
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
      game.weather = newW;
      if (newW==='strike') announce(tr('ev_strike'), '#ff9d45');
      else if (newW==='patch') announce(tr('ev_patch'), '#5ad0ff');
    }
  }
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
    announce(tr('ev_bonuszone'), '#ffd34a'); sfx('node');
  }
  if (game.bonusZone){
    const z=game.bonusZone; z.t+=dt;
    let np=0,ne=0;
    for (const u of p.units) if (Math.abs(u.x-z.x)<80) np++;
    for (const u of e.units) if (Math.abs(u.x-z.x)<80) ne++;
    z.prog = clamp(z.prog + clamp(np-ne,-3,3)*0.12*dt, -1, 1);
    z.owner = z.prog>=0.6?'p': z.prog<=-0.6?'e':null;
    z.contested = (np>0 && ne>0);                         // grésille/oscille à l'écran
    if (z.owner==='p') p.xp += 1.4*dt; else if (z.owner==='e') e.xp += 1.4*dt;
    if (z.t>60) game.bonusZone = null;                    // disparaît
  }
  // ---- siège final : sous 20 % de PV, le pouvoir désespéré se débloque ----
  if (!p.lastSeen && p.hp < p.maxhp*0.2){ p.lastSeen=true; p.lastReady=true;
    announce(tr('ev_lastresort'), '#ff5a4a'); sfx('spec'); }
  if (!e.lastSeen && e.hp < e.maxhp*0.2){ e.lastSeen=true; e.lastReady=true; }

  if (game.net==='host'){ let c; while((c=net.cmdQ.shift())) applyCmd(c); } // commandes de l'invité
  else if (!game.net && !game.tut) aiUpdate(dt);                             // IA en solo (escarmouche ; jamais en tuto)
  processQueue(p); processQueue(e);                                          // file d'attente de production
  updateUnits(p,e,dt); updateUnits(e,p,dt);
  updateBuildings(p,e,dt); updateBuildings(e,p,dt);
  updateBaseGarrison(p,e,dt); updateBaseGarrison(e,p,dt);
  updateNodes(dt);
  updateZones(dt);
  checkTrans(p); checkTrans(e);

  // santé du monde : dégradation ralentie — saturation visée vers la 16e min (~960 s)
  // pour des parties d'environ 20 min ; les pertes/pouvoirs n'accélèrent plus que marginalement.
  game.dev = game.tut? 0 : clamp(game.t/960 + (game.kills+game.eKills)/600 + game.specialsUsed*0.02, 0, 1);
  if (!game.tut) updateCata(dt);

  for (let i=projectiles.length-1;i>=0;i--){
    const pr=projectiles[i]; pr.t+=dt;
    if (pr.t>=pr.dur){
      const foe = pr.side===1? game.e: game.p;
      burst(pr.tx, gY(pr.tx)-14, FACTIONS[pr.fac].eraCols[pr.era], qN(14));
      sfxAt('boom', pr.tx);
      if (Math.random()<0.45) addCrater(pr.tx, Math.max(20, pr.aoe*0.8));
      let hitAny=false;
      for (const t of foeTargets(foe)){
        if (t.fly) continue; // les obus en cloche n'atteignent pas les volants
        if (Math.abs(t.x-pr.tx) < pr.aoe){
          hitAny=true;
          if (t.isBase||t.isB) t.hit(pr.dmg*1.6*pr.hb);
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
  for (let i=particles.length-1;i>=0;i--){ const pt=particles[i]; pt.t+=dt;
    pt.x+=pt.vx*dt; pt.y+=pt.vy*dt; pt.vy+=220*dt; if(pt.t>pt.life) particles.splice(i,1); }
  for (let i=deaths.length-1;i>=0;i--){ deaths[i].t+=dt; if(deaths[i].t>deaths[i].life) deaths.splice(i,1); }
  for (let i=floaters.length-1;i>=0;i--){ const f=floaters[i]; f.t+=dt; f.y-=22*dt; if(f.t>1.6) floaters.splice(i,1); }
  for (let i=shots.length-1;i>=0;i--){ shots[i].t+=dt; if(shots[i].t>shots[i].dur) shots.splice(i,1); }
  if (game.shake>0) game.shake=Math.max(0,game.shake-dt*30);
  if (game.flash>0) game.flash-=dt;
  if (game.msgT>0) game.msgT-=dt;
  if (game.rally){ game.rally.t+=dt; if (game.rally.t>3) game.rally=null; }   // marqueur ⚑ éphémère

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

  if (p.hp<=0 || e.hp<=0){
    const faller = p.hp<=0? p : e;
    // SECONDE CHANCE — INDÉPENDANTE PAR CAMP : la 1re fois qu'une base tombe, elle renaît
    // plus solide (phase 2). Chaque base possède donc bien ses deux phases. L'Hiver
    // nucléaire (Bombe H) ne se déclenche qu'UNE fois, à la 1re base abattue.
    if ((faller.phase||1)<2){
      faller.phase = 2;
      faller.maxhp = Math.round(faller.maxhp*2.2);
      faller.hp = faller.maxhp;
      if (!game.winter) triggerNuclearWinter();
      else { game.flash=Math.max(game.flash||0,1.2); game.shake=Math.max(game.shake,20);
        nukeBlast(faller.x, 220); announce(tr('ev_reborn'), '#bfe6ff'); sfx('boom'); }
    } else {
      game.over=true; game.win = e.hp<=0;
      game.shake=20;
      burst((game.win?e:p).x, gY((game.win?e:p).x)-60, '#fff', 44, 1.6);
      sfx(game.win?'evolve':'boom');
      setTimeout(showEnd, 1100);
    }
  }
}
// Bombe H : rase tout (sauf bases), santé du monde à 0, bascule en Hiver nucléaire
const WINTER_DUR = 360;   // l'hiver nucléaire dure 6 min puis le monde revient à la normale
function triggerNuclearWinter(){
  const g=game;
  g.winter = true; g.winterT = WINTER_DUR; g.dev = 1;
  g.flash = 1.6; g.shake = Math.max(g.shake,34);
  addLight(WORLD/2, gY(WORLD/2)-80, '#fff4e0', 900, 1.4);          // flash lumineux global de la Bombe H
  razeMap();
  announce(tr('ev_hbomb'), '#bfe6ff');
  addFloater(WORLD/2, gY(WORLD/2)-150, tr('ev_winter_sub'), '#bfe6ff', 14);
  // SILENCE DRAMATIQUE puis détonation : la musique se tait, le « boom » tombe ~0,6 s après le flash.
  if (AC){ audioDuckUntil = AC.currentTime + 0.6; }
  setTimeout(()=>{ sfxAt('boom', WORLD/2); }, 600);
}
// malus d'hiver qui s'estompe : ÷2 au début → ×1 (normal) après 6 min
function winterMul(){ return game.winter? clamp(0.5 + 0.5*(1-(game.winterT||0)/WINTER_DUR), 0.5, 1) : 1; }