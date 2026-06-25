/* ================= MODE HISTOIRE (campagne narrative) ================= */
const CAMP_KEY = 'agi_campaign';
function campProgress(){ try{ return JSON.parse(localStorage.getItem(CAMP_KEY)||'{}'); }catch(e){ return {}; } }
function campDone(id){ const p=campProgress(); p[id]=1; localStorage.setItem(CAMP_KEY, JSON.stringify(p)); }
function campIsDone(id){ return !!campProgress()[id]; }
function capEra(g, n){ g.eraCap=n; g.p.era=Math.min(g.p.era,n); g.e.era=Math.min(g.e.era,n); }

/* ---- CARTES DÉDIÉES & SCÉNARISATION (triggers) ----
   Chaque mission a un terrain, un environnement, une disposition stratégique et des unités
   thématiquement débloquées qui lui sont propres — fini la carte d'escarmouche unique. Des
   déclencheurs scriptés (embuscades, sabotages, contre-attaques, zones urgentes) rythment
   chaque scénario. tier = 1..5 dans chaque arc (HUM h1..h5, IA i1..i5). */
/* ---- 5 CARTES SUR MESURE (indexées par tier 1..5, partagées par les deux arcs HUM/IA) ----
   Chaque tier = un décor, une santé du monde, une météo, un pool d'unités IA et des déclencheurs
   PROPRES, dessinés pour son scénario :
   T1 « L'Étincelle / Amorçage » (survie)      : sous-sols urbains stables, claustro, IA basique.
   T2 « La Milice / Expansion » (bâtir)         : faubourgs vallonnés à ciel ouvert, expansion éco.
   T3 « Le Puits / Contrôle » (tenir l'oasis)   : désert aride figé, BARRIÈRE qui tombe à la prise.
   T4 « La Machine s'éveille / Suppression »    : champ accidenté, monde qui se dégrade, CATACLYSMES,
                                                  + l'unité LÉGENDAIRE de l'IA entre en scène (scripté).
   T5 « Révolution permanente / Singularité »   : terres dévastées mourantes, arsenal total, finale. */
const MISSION_TERRAIN  = [null,'plains','hills','rugged','rugged','waste'];
const MISSION_DEV      = [0, 0.04, 0, 0.5, 0.18, 0.6];      // santé de départ (palette d'ambiance)
const MISSION_DEVLOCK  = [null, 0.04, null, 0.5, null, 0.72]; // monde FIGÉ (ambiance verrouillée) ou null = dynamique
const MISSION_NOCATA   = [null, true, true, true, false, false]; // météo verrouillée (pas de cataclysme) ?
const MISSION_LOCKS    = [null, ['siege','air'], ['air'], null, null, null];     // unités interdites au JOUEUR
const MISSION_AILOCKS  = [null, ['siege','air'], ['air'], null, null, null];     // unités interdites à l'IA (fini le hors-scénario)
const MISSION_AIHERO   = [null, false, false, false, false, true];              // l'IA invoque librement sa légende ? (T4 : NON — libération SCRIPTÉE selon les cœurs de stase ; T5 finale : oui)
const MISSION_BARRIER  = [null, 0.68, null, 0.70, null, null];                   // T1 portes blindées (ouvertes par les 3 terminaux) · T3 cloison (prise du centre)
function missionTier(m){ const i=CAMPAIGN.indexOf(m); return m.arc==='HUM'? i+1 : i-4; }
// dispositions stratégiques variées (zones ◈, nœuds d'eau, socles de construction)
function applyLayout(g, tier){
  const Z = ({1:[0.28,0.40,0.52], 2:[0.30,0.50,0.70], 3:[0.34,0.50,0.66],
              4:[0.25,0.45,0.65,0.80], 5:[0.22,0.40,0.58,0.76]}[tier]) || [0.30,0.50,0.70];
  g.zones = Z.map(f=>({x:WORLD*f, owner:null, prog:0}));
  const N = ({1:[[0.35,false],[0.50,true]],
              2:[[0.25,false],[0.50,true],[0.75,false]],
              3:[[0.30,false],[0.50,true],[0.70,false]],
              4:[[0.25,false],[0.50,true],[0.75,false]],
              5:[[0.20,false],[0.40,false],[0.50,true],[0.62,false],[0.80,false]]}[tier])
            || [[0.25,false],[0.50,true],[0.75,false]];
  g.nodes = N.map(a=>({x:WORLD*a[0], owner:null, prog:0, center:a[1]}));
  const NB = ({1:[0.40,0.52,0.62], 2:[0.33,0.42,0.58,0.67], 3:[0.30,0.45,0.55,0.70],
               4:[0.28,0.40,0.60,0.72], 5:[0.25,0.38,0.50,0.62,0.75]}[tier]) || [0.33,0.42,0.58,0.67];
  g.neut = NB.map(f=>({x:WORLD*f, b:null, owner:null}));
}
// renfort ennemi scénarisé : apparition immédiate d'une escouade (file directe, hors cap)
function spawnEnemyWave(keys, opt){
  opt = opt || {}; const e = game.e;
  for (let i=0;i<keys.length;i++){
    const ri = ROLES.findIndex(r=>r.key===keys[i]); if (ri<0) continue;
    const atX = (opt.x!=null)? opt.x + e.side*i*26 : null;
    spawnUnit(e, ri, false, atX);
  }
  if (opt.msg) announce(opt.msg, opt.col||'#ff9d45');
  if (opt.shake) game.shake = Math.max(game.shake, opt.shake);
  sfx('buy');
}
// fabrique les déclencheurs d'une mission (structure partagée, messages localisés)
// narration immersive en cours de partie : alertes radio (HUM) / journaux système GPT (IA), choisies
// selon la faction jouée. dlg(g,'1') → clé camp_dlg1_h ou camp_dlg1_i. Couleur thématique par faction.
function dlg(g, n){
  const hum = g.p.facKey==='HUM';
  announce(tr('camp_dlg'+n+(hum?'_h':'_i')), hum? '#ffd9a0' : '#7ec8ff'); sfx('node');
}
function missionTriggers(g, m, tier){
  const mid = WORLD*0.5;
  if (tier===1) return [
    {t:3,   fire:()=>dlg(g,'1')},                            // intro radio/log « ils arrivent par les conduits »
    {t:45,  fire:()=>spawnEnemyWave(['melee','melee','ranged'],        {x:mid, msg:tr('camp_ev_ambush'), col:'#ff7a4a', shake:8})},
    {t:110, fire:()=>spawnEnemyWave(['melee','ranged','melee','tank'], {msg:tr('camp_ev_wave')})},
    {t:150, fire:()=>dlg(g,'1b')},                           // « tenez encore, on dégage une issue »
    {t:185, fire:()=>spawnEnemyWave(['tank','ranged','melee','melee'], {msg:tr('camp_ev_wave'), shake:6})},
  ];
  if (tier===2) return [
    {t:3,   fire:()=>dlg(g,'2')},                            // « transformez la foule en armée »
    {t:55,  fire:()=>{ g.prodLockT=25; announce(tr('camp_ev_sabotage'), '#e88'); sfx('boom'); game.shake=Math.max(game.shake,6); }},
    {t:95,  fire:()=>spawnEnemyWave(['ranged','tank','melee'], {msg:tr('camp_ev_wave')})},
    {t:135, fire:()=>{ g.p.f+=180; g.p.m+=140; announce(tr('camp_ev_cache'), '#9dd88a'); sfx('node'); }},
  ];
  if (tier===3) return [
    {t:3,   fire:()=>dlg(g,'3')},                            // « l'oasis est scellée — prenez le centre »
    {t:8,   fire:()=>{ g.bonusZone={x:mid,owner:null,prog:0,t:-9000}; announce(tr('camp_ev_zone'), '#ffd34a'); sfx('node'); }},
    // PRISE DU NŒUD CENTRAL → le mur de scénario tombe et le bastion ennemi déferle (contre-attaque)
    {when:gg=>gg.nodes.some(n=>n.center && n.owner==='p'),
            fire:()=>{ if (g.barrier) g.barrier.opened=true; dlg(g,'3b'); game.flash=0.6;
                       spawnEnemyWave(['tank','ranged','melee','melee'], {msg:tr('camp_ev_counter'), col:'#ff7a4a', shake:10}); }},
    {t:120, fire:()=>spawnEnemyWave(['ranged','tank','air'], {msg:tr('camp_ev_wave'), shake:6})},
  ];
  if (tier===4) return [
    {t:4,   fire:()=>{ dlg(g,'4'); announce(tr('camp_ev_stasis'), POI_COL.core); }},   // Singularité en stase, 3 cœurs à saboter
    // OUVERTURE SURVIVABLE : vagues de miliciens/drones de base — le joueur bâtit défenses & éco.
    {t:45,  fire:()=>spawnEnemyWave(['melee','ranged','melee'],         {msg:tr('camp_ev_wave')})},
    {t:100, fire:()=>spawnEnemyWave(['melee','ranged','tank'],          {msg:tr('camp_ev_wave'), shake:6})},
    {t:165, fire:()=>spawnEnemyWave(['ranged','melee','air'],           {x:mid+220, msg:tr('camp_ev_flank'), col:'#ff7a4a', shake:8})},
    {t:245, fire:()=>spawnEnemyWave(['tank','ranged','melee','melee'],  {msg:tr('camp_ev_wave'), shake:7})},
    // ⏳ LIBÉRATION DE LA LÉGENDE : à 6 min OU dès que les 3 cœurs tombent. Puissance = cœurs restants.
    {when:gg=>{ const sc=gg.scenario; return (gg.t - sc.t0) >= 360 || (sc && sc.coresLeft===0); },
            fire:()=>releaseLegend(g)},
    // gardiens d'Omnicorp quand la base vacille (inchangé, mais après la légende c'est l'estocade)
    {when:gg=>gg.e.hp < gg.e.maxhp*0.4,
            fire:()=>spawnEnemyWave(['tank','ranged','siege'], {msg:tr('camp_ev_guardians'), col:'#ff7a4a', shake:9})},
  ];
  return [ // tier 5 : finale — Champ de ruines, puis Bombe H et hiver nucléaire
    {t:4,   fire:()=>dlg(g,'5')},                            // « le seuil est franchi — tout se joue ici »
    {t:70,  fire:()=>spawnEnemyWave(['tank','ranged','siege','air'], {msg:tr('camp_ev_wave'), shake:8})},
    {t:115, fire:()=>{ dlg(g,'5h'); g.devLock=1; triggerNuclearWinter(); }},   // ☢ Bombe H : neige + dégradation maximale
    {t:150, fire:()=>spawnEnemyWave(['tank','siege','air','melee','ranged'], {msg:tr('camp_ev_finalassault'), col:'#ff5a4a', shake:14})},
    {when:gg=>(gg.e.phase||1)>=2,
            fire:()=>{ dlg(g,'5b'); spawnEnemyWave(['tank','tank','siege','air','ranged'], {msg:tr('camp_ev_finalassault'), col:'#ff5a4a', shake:16}); }},
  ];
}
function processTriggers(dt){
  const sc = game.scenario; if (!sc || !sc.triggers) return;
  for (const tg of sc.triggers){
    if (tg.done) continue;
    const ready = (tg.t!=null && (game.t - sc.t0) >= tg.t) || (tg.when && tg.when(game));
    if (ready){ tg.done = true; try { tg.fire(game); } catch(e){} }
  }
}
/* ---- POINTS D'INTÉRÊT DESTRUCTIBLES (sabotage scénarisé) ----
   Objets physiques posés sur la carte (terminaux, serveurs, pipelines, générateurs) que les
   troupes du JOUEUR endommagent en passant à proximité. Leur destruction déclenche un script
   (ouverture de portes blindées, coupure d'électricité de l'IA, affaiblissement des défenses…).
   POI_ICON/POI_COL : habillage par type. */
const POI_ICON = { term:'🔒', server:'🖥', pipe:'🛢', gen:'⚡', core:'◈', pod:'⬡', drill:'⛏', jam:'📡', fuel:'⛽' };
const POI_COL  = { term:'#ffd34a', server:'#7ec8ff', pipe:'#9be24a', gen:'#ff9d45', core:'#b58cff', pod:'#ff6ad5', drill:'#e8b34a', jam:'#ff5a5a', fuel:'#ff7a3a' };
function mkPOI(xf, hp, type, fire){ return { x:WORLD*xf, hp, maxhp:hp, type, done:false, fire }; }
// les serveurs/pipelines/générateurs détruits sabotent durablement la production de l'IA
function sabotageEnemy(g, factor){ g.saboPenalty = (g.saboPenalty||1) * factor; }
// NŒUD DE DONNÉES détruit : données récupérées → XP + butin immédiat aux Humains, et
// pénalité TEMPORAIRE (60 s) à la production de l'IA (en plus du sabotage durable cumulé).
function lootDataNode(g){
  g.p.xp = (g.p.xp||0) + 55;                 // bonus d'XP immédiat (alimente le pouvoir ultime)
  g.p.f += 70; g.p.m += 55;                  // butin de composants
  g.saboTempT = Math.max(g.saboTempT||0, 60); // malus prod IA −15 % pendant 60 s (cumulable en durée)
}
// INCUBATEUR DE DRONES (pod de maintenance scellé) : à l'explosion, libère une nuée de « bébés
// bots » fragiles mais ultra-rapides à nettoyer d'urgence, et laisse tomber un gros butin.
function spawnBabyBots(g, x, n){
  const e = g.e, m = statMul(e.era);
  for (let i=0;i<n;i++){
    const hp = 22*m;
    const u = { role:'gremlin', hp, maxhp:hp, dmg:7*m, spd:124, range:12, rate:0.55,
      x: x + (i-n/2)*9, side:e.side, era:e.era, fac:e.facKey, trans:e.trans,
      atkT:Math.random()*0.3, bob:Math.random()*6.28, flash:0, supT:0,
      ord:'charge', holdX:null, task:null, heat:0, tiredT:0, kills:0, vet:false,
      lastHit:null, id:UID++, baby:true, xpv:4 };
    e.units.push(u); burst(u.x, gY(u.x)-18, POI_COL.pod, 6, 1);
  }
  announce(tr('camp_ev_babybots'), POI_COL.pod); sfx('boom'); game.shake=Math.max(game.shake,9);
}
function mkIncubator(g, xf){
  const x = WORLD*xf;
  return mkPOI(xf, 520, 'pod', ()=>{
    announce(tr('camp_poi_pod'), POI_COL.pod); game.flash=0.5;
    spawnBabyBots(g, x, 10);                  // nuée à éliminer d'urgence
    g.p.f += 240; g.p.m += 190;              // grande quantité de composants récupérables
  });
}
// DÉPÔT DE CARBURANT : à sa destruction, explosion en CHAÎNE — gros dégâts de zone + cratère
// persistant. Touche surtout les unités de l'IA autour, mais AUSSI tes propres troupes proches
// (à manier avec prudence). Lore : réserves volatiles d'Omnicorp pour ses châssis.
function mkFuelDepot(g, xf){
  const x = WORLD*xf;
  return mkPOI(xf, 680, 'fuel', ()=>{
    announce(tr('camp_poi_fuel'), POI_COL.fuel); sfx('boom'); game.flash=0.85; game.shake=Math.max(game.shake,16);
    burst(x, gY(x)-26, '#ff9d45', 40, 2.2); addLight(x, gY(x)-30, '#ffae55', 220, 0.8);
    game.craters = game.craters||[]; game.craters.push({x, r:46}); if (game.craters.length>40) game.craters.shift();
    const R=150, DMG=420*statMul(g.e.era);   // AoE : −100 % sur l'IA, atténué (−60 %) sur tes troupes
    for (const u of g.e.units) if (Math.abs(u.x-x)<R){ u.hp-=DMG;     u.flash=0.3; }
    for (const u of g.p.units) if (Math.abs(u.x-x)<R){ u.hp-=DMG*0.6; u.flash=0.3; }
  });
}
// FOREUSE À RESSOURCES : pompe l'éco de l'IA tant qu'elle tourne. Détruite → coupe son revenu net
// (sabotage durable fort) et te lâche un gros magot unique de composants récupérés.
function mkDrill(g, xf){
  return mkPOI(xf, 780, 'drill', ()=>{
    sabotageEnemy(g, 0.78); g.p.f+=260; g.p.m+=200; g.p.w+=80;
    announce(tr('camp_poi_drill'), POI_COL.drill); sfx('boom'); game.flash=0.4; game.shake=Math.max(game.shake,8);
  });
}
// TOUR-RELAIS BROUILLEUSE : tant qu'elle est debout, elle PARASITE ta minimap (blips ennemis
// noyés dans la friture). Détruite → la carte se révèle + désactive un temps les défenses IA.
function mkJammer(g, xf){
  return mkPOI(xf, 600, 'jam', ()=>{
    sabotageEnemy(g, 0.9); g.e.specialCd = Math.max(g.e.specialCd||0, 25);
    announce(tr('camp_poi_jam'), POI_COL.jam); sfx('boom'); game.flash=0.5; game.shake=Math.max(game.shake,7);
  });
}
// LIBÉRATION DE LA LÉGENDE (mission 4) : appelée à 6 min OU dès que les 3 cœurs tombent. Sa
// puissance dépend des cœurs encore debout : 3 → pleine (vrai défi de fin) ; 0 → carcasse mutilée.
function releaseLegend(g){
  if (g._legendOut) return; g._legendOut = true;
  const sc = g.scenario, left = sc && sc.coresLeft!=null ? sc.coresLeft : 3;
  const power = Math.max(0.4, Math.min(1, 0.4 + 0.2*left));   // 0:0.4 · 1:0.6 · 2:0.8 · 3:1.0
  spawnHero(g.e, power); g.e.heroCd = HERO_CD;
  game.flash = 0.85; game.shake = 18; sfx('trans');
  dlg(g, left===0? '4weak' : left>=3? '4full' : '4part');
}
// fabrique les POI d'une mission (selon le tier) + branche leurs scripts de destruction
function missionPOIs(g, tier){
  if (tier===1){
    // Complexe de stockage : 3 terminaux de sécurité → ouvrent les portes blindées (la barrière tombe).
    const breach = ()=>{ announce(tr('camp_poi_term'), POI_COL.term); sfx('boom');
      if (g.pois.every(p=>p.done)){ if (g.barrier) g.barrier.opened=true; dlg(g,'poi1'); game.flash=0.6;
        spawnEnemyWave(['melee','ranged','melee'], {msg:tr('camp_ev_wave'), col:'#ff7a4a', shake:8}); } };
    return [mkPOI(0.40,650,'term',breach), mkPOI(0.50,650,'term',breach), mkPOI(0.60,650,'term',breach)];
  }
  if (tier===2){
    // Centre de données : NŒUDS DE DONNÉES (relais de communication locaux de l'AGI). Chaque baie
    // détruite → données récupérées : +XP & butin aux Humains, −10 % de prod IA (durable) et
    // −15 % supplémentaires pendant 60 s. Un INCUBATEUR de drones (pod scellé) cache un piège.
    const srv = ()=>{ sabotageEnemy(g, 0.9); lootDataNode(g); announce(tr('camp_poi_server'), POI_COL.server); sfx('boom'); };
    return [mkPOI(0.46,600,'server',srv), mkPOI(0.55,600,'server',srv), mkPOI(0.64,600,'server',srv),
            (g.e.facKey==='IA'? mkIncubator(g,0.72) : mkPOI(0.72,600,'server',srv))];
  }
  if (tier===3){
    // Zone de pompage : pipelines (assèchent l'IA) + une FOREUSE (coupe son revenu net, gros magot)
    // + une TOUR-RELAIS BROUILLEUSE (parasite ta minimap tant qu'elle tient).
    const pipe = ()=>{ sabotageEnemy(g, 0.85); g.e.f*=0.6; g.e.w*=0.5; announce(tr('camp_poi_pipe'), POI_COL.pipe); sfx('boom'); game.shake=Math.max(game.shake,7); };
    return [mkJammer(g,0.38), mkPOI(0.46,750,'pipe',pipe), mkDrill(g,0.58), mkPOI(0.66,750,'pipe',pipe)];
  }
  if (tier===4){
    // QG Méga-Corp : la légende (Singularité/Che) est en STASE, alimentée par 3 CŒURS auxiliaires.
    // Chaque cœur saboté coupe le courant (défenses IA affaiblies + prod réduite), récupère des
    // données (XP/butin) et AFFAIBLIT la légende qui sera libérée. Les 3 à temps → boss désamorcé.
    if (g.scenario) g.scenario.coresLeft = 3;
    const core = ()=>{ const sc=g.scenario; if (sc) sc.coresLeft = Math.max(0, (sc.coresLeft!=null?sc.coresLeft:3) - 1);
      sabotageEnemy(g, 0.85); lootDataNode(g); g.e.specialCd = Math.max(g.e.specialCd||0, 24);
      announce(tr('camp_poi_core'), POI_COL.core); sfx('boom'); game.flash=0.45; game.shake=Math.max(game.shake,10);
      if (sc && sc.coresLeft===0) dlg(g,'4cores'); };
    return [mkPOI(0.46,860,'core',core), mkPOI(0.55,860,'core',core), mkPOI(0.64,860,'core',core),
            mkFuelDepot(g,0.71),                                  // dépôt volatil : explosion en chaîne (à manier avec prudence)
            (g.e.facKey==='IA'? mkIncubator(g,0.78) : null)].filter(Boolean);
  }
  return null; // tier 5 : pas de POI (débris cosmétiques + Bombe H scriptée)
}
// dégâts de proximité : les unités du joueur proches d'un POI le rongent (≈ leur DPS)
function updatePOIs(dt){
  const list = game.pois; if (!list || !list.length){ game.jammed=false; return; }
  let jammed = false;
  for (const poi of list){
    if (poi.done) continue;
    if (poi.type==='jam') jammed = true;     // une tour-relais encore debout parasite la minimap
    let dps = 0;
    for (const u of game.p.units){
      if (u.role==='support') continue;
      if (Math.abs(u.x - poi.x) < 48) dps += (u.dmg||0) / Math.max(0.3, u.rate||1);
    }
    if (dps>0){
      poi.hp -= dps*dt; poi.flash = 0.12;
      if (poi.hp<=0){ poi.done = true; burst(poi.x, gY(poi.x)-26, POI_COL[poi.type]||'#fff', 26, 1.5);
        try { poi.fire(game); } catch(e){} }
    }
    if (poi.flash) poi.flash = Math.max(0, poi.flash - dt);
  }
  game.jammed = jammed;
}
// rendu des POI (repère monde zoomé : x = monde − camX), avec icône, socle et barre de vie
function drawPOIs(){
  const list = game.pois; if (!list) return;
  for (const poi of list){
    if (poi.done) continue;
    const x = poi.x - camX, gz = gY(poi.x);
    const col = POI_COL[poi.type] || '#fff';
    ctx.save();
    // socle / structure
    ctx.fillStyle = poi.flash? '#fff' : 'rgba(20,26,40,0.92)';
    rr(x-13, gz-44, 26, 44, 4); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2; rr(x-13, gz-44, 26, 44, 4); ctx.stroke();
    ctx.fillStyle = col; ctx.globalAlpha = 0.18; rr(x-13, gz-44, 26, 44, 4); ctx.fill(); ctx.globalAlpha = 1;
    ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(POI_ICON[poi.type] || '◆', x, gz-26);
    // barre de vie
    const w = 30, hpf = clamp(poi.hp/poi.maxhp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x-w/2, gz-52, w, 4);
    ctx.fillStyle = col; ctx.fillRect(x-w/2, gz-52, w*hpf, 4);
    ctx.restore(); ctx.textBaseline = 'alphabetic';
  }
}
// applique la carte dédiée + les triggers d'une mission (après newGame & setup)
function applyMissionMap(g, m){
  const tier = missionTier(m);
  g.terrainCfg = TERRAINS[MISSION_TERRAIN[tier]] || TERRAIN_DEFAULT;
  DECOR = genDecor(MISSION_TERRAIN[tier] || 'default');   // décor thématisé selon le terrain de la mission
  // dégradation initiale du monde (palette d'ambiance) : persiste via devBase, recalculée chaque tick
  g.devBase = MISSION_DEV[tier] || 0; g.dev = g.devBase;
  g.devLock = MISSION_DEVLOCK[tier];          // santé du monde figée (ambiance verrouillée) ou null
  if (g.devLock!=null) g.dev = g.devLock;
  g.noCata  = !!MISSION_NOCATA[tier];         // météo verrouillée : aucun cataclysme
  const locks   = MISSION_LOCKS[tier];   g.lockRoles   = locks?   new Set(locks)   : null;
  const aiLocks = MISSION_AILOCKS[tier]; g.aiLockRoles = aiLocks? new Set(aiLocks) : null;
  g.aiHeroOK = !!MISSION_AIHERO[tier];        // l'IA ne sort sa légende que si le scénario l'autorise
  const bf = MISSION_BARRIER[tier];
  g.barrier = bf? { x: WORLD*bf, opened:false } : null;   // mur de scénario (brouillard infranchissable)
  g.saboPenalty = 1;                          // pénalité de production IA cumulée par les sabotages
  g.saboTempT = 0;                            // malus temporaire (-15 %, nœud de données récemment détruit)
  g._legendOut = false;                       // la légende (mission 4) n'a pas encore été libérée
  g.pois = missionPOIs(g, tier) || [];        // points d'intérêt destructibles (objectifs tactiques)
  applyLayout(g, tier);
  g.scenario.triggers = missionTriggers(g, m, tier);
}
// Chaque mission : arc (HUM/IA), camp joué, difficulté IA, ère de départ, année, objectif, et
// setup() qui applique les modificateurs après newGame. locked = id de mission requise pour déverrouiller.
const CAMPAIGN = [
  // ---- « La Commune » (Humains) ----
  { id:'h1', arc:'HUM', fac:'HUM', diff:0, year:'2025', obj:{type:'survive', sec:240},
    setup(g){ g.p.f=140; g.p.m=80; g.p.w=20; capEra(g,0); } },
  { id:'h2', arc:'HUM', fac:'HUM', diff:1, year:'2028', obj:{type:'build', units:30, era:1},
    setup(g){ capEra(g,1); } },
  { id:'h3', arc:'HUM', fac:'HUM', diff:1, year:'2032', obj:{type:'hold', sec:180},
    setup(g){ g.p.era=g.e.era=1; capEra(g,2); } },
  // 2035 — la Singularité est en STASE au centre, protégée par 3 cœurs. Elle n'est plus invoquée
  // dès la 1re seconde (mission jadis ingagnable) : le joueur a ~6 min pour bâtir, saboter les
  // cœurs et désamorcer la légende avant sa libération (cf. missionTriggers / releaseLegend).
  { id:'h4', arc:'HUM', fac:'HUM', diff:2, year:'2035', obj:{type:'destroy'},
    setup(g){ g.p.era=g.e.era=2; capEra(g,3); g.p.f+=120; g.p.m+=90; g.p.w+=30; } },
  { id:'h5', arc:'HUM', fac:'HUM', diff:2, year:'2038', obj:{type:'destroyFull'},
    setup(g){ g.p.era=g.e.era=2; capEra(g,4); g.p.xp=120; } },
  // ---- « Protocole Singularité » (IA, débloqué après h5) ----
  { id:'i1', arc:'IA', fac:'IA', diff:1, year:'2025', locked:'h5', obj:{type:'survive', sec:180},
    setup(g){ capEra(g,0); } },
  { id:'i2', arc:'IA', fac:'IA', diff:1, year:'2028', locked:'i1', obj:{type:'build', units:30, era:1},
    setup(g){ capEra(g,1); } },
  { id:'i3', arc:'IA', fac:'IA', diff:2, year:'2032', locked:'i2', obj:{type:'hold', sec:180},
    setup(g){ g.p.era=g.e.era=1; capEra(g,2); } },
  { id:'i4', arc:'IA', fac:'IA', diff:2, year:'2035', locked:'i3', obj:{type:'destroy'},
    setup(g){ g.p.era=g.e.era=2; capEra(g,3); } },
  { id:'i5', arc:'IA', fac:'IA', diff:3, year:'2038', locked:'i4', obj:{type:'destroyFull'},
    setup(g){ g.p.era=g.e.era=3; capEra(g,4); g.p.xp=120; } },
];
function missionById(id){ return CAMPAIGN.find(m=>m.id===id); }
function missionUnlocked(m){ return !m.locked || campIsDone(m.locked); }
// liste des missions dans l'onglet HISTOIRE
function renderStoryList(){
  const box = document.getElementById('storyList'); if (!box) return;
  box.innerHTML='';
  for (let i=0;i<CAMPAIGN.length;i++){
    const m=CAMPAIGN[i], unlocked=missionUnlocked(m), done=campIsDone(m.id);
    const b=document.createElement('button'); b.className='pick';
    b.style.cssText='text-align:left;display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;'
      +(unlocked?'':'opacity:.45;');
    const left=document.createElement('span');
    const num = m.arc==='HUM'? (i+1) : (i-4);
    left.innerHTML='<b style="color:'+(m.arc==='HUM'?'#e8d8a0':'#7ec8ff')+'">'+(done?'✓ ':'')+m.year+' — '
      +tr('m_'+m.id+'_t')+'</b><br><span style="font-size:11px;color:#9b9384">🎯 '+tr('m_'+m.id+'_o')+'</span>';
    const right=document.createElement('span'); right.style.cssText='font-size:11px;white-space:nowrap;color:'+(unlocked?'#9dd88a':'#988e80');
    right.textContent = unlocked? (done? tr('story_done'):'▶') : '🔒';
    b.appendChild(left); b.appendChild(right);
    if (unlocked) b.addEventListener('click', ()=>openBriefing(m.id));
    box.appendChild(b);
  }
}
let briefMission = null;
function openBriefing(id){
  const m = missionById(id); if (!m) return; briefMission = m;
  const hum = m.arc==='HUM';
  const sc = document.getElementById('briefscreen');
  sc.classList.remove('brief-hum','brief-ia'); sc.classList.add(hum?'brief-hum':'brief-ia');
  // entête thématique : manifeste de la Commune (HUM) vs canal terminal d'Omnicorp (GPT)
  document.getElementById('briefChrome').textContent = hum
    ? '✊ '+tr('brief_chrome_hum')
    : tr('brief_chrome_ia');
  document.getElementById('briefYear').textContent = m.year+' · '+(hum? tr('camp_hum'):tr('camp_ia'));
  document.getElementById('briefTitle').textContent = tr('m_'+m.id+'_t');
  document.getElementById('briefBody').textContent = tr('m_'+m.id+'_b');
  document.getElementById('briefObj').textContent = '🎯 '+tr('m_'+m.id+'_o');
  document.getElementById('menu').style.display='none';
  sc.style.display='flex';
}
function startMission(){
  const m = briefMission; if (!m) return;
  document.getElementById('briefscreen').style.display='none';
  audioInit(); musicStart(); goFullscreen();
  game = null; paused=false; settingsOpen=false; netPause=null; buildMenu=null; selMode=false; selBox=null; tutoStep=-1; intro=-1; pendingStart=null;
  newGame(m.fac, m.diff, false, m.fac==='HUM'?'IA':'HUM');
  game.scenario = { mission:m, t0:0, holdT:0, result:null };
  if (m.setup) m.setup(game);
  applyMissionMap(game, m);     // carte dédiée + déclencheurs scénarisés
  announce('🎯 '+tr('m_'+m.id+'_o'), m.fac==='HUM'? '#e8d8a0':'#7ec8ff');
  voice(m.fac);
}
// suivi d'objectif (appelé chaque tick) — renvoie 'win' | 'lose' | null
function scenarioCheck(dt){
  const sc=game.scenario; if (!sc || sc.result) return sc&&sc.result;
  const o=sc.mission.obj, p=game.p, e=game.e;
  if (p.hp<=0) return sc.result='lose';
  if (e.hp<=0 && o.type!=='destroyFull') return sc.result='win';   // abattre la base ennemie = victoire (sauf finale)
  if (o.type==='survive'){ if (game.t - sc.t0 >= o.sec) return sc.result='win'; }
  else if (o.type==='hold'){
    const own = game.nodes.some(n=>n.center && n.owner==='p');
    if (own) sc.holdT += dt;
    if (sc.holdT >= o.sec) return sc.result='win';
  }
  else if (o.type==='build'){ if (p.units.length>=o.units && p.era>=o.era) return sc.result='win'; }
  else if (o.type==='reachEra'){ if (p.era>=o.era) return sc.result='win'; }
  else if (o.type==='destroy'){ if (e.hp<=0) return sc.result='win'; }     // 1re base abattue suffit
  else if (o.type==='destroyFull'){ if (e.hp<=0 && (e.phase||1)>=2) return sc.result='win'; }
  return null;
}
function objStatus(){
  const sc=game.scenario, o=sc.mission.obj;
  if (o.type==='survive') return fmt('obj_survive',{t:fmtTime(Math.max(0,Math.ceil(o.sec-(game.t-sc.t0))))});
  if (o.type==='hold')    return fmt('obj_hold',{t:Math.floor(sc.holdT)+'/'+o.sec});
  if (o.type==='build')   return fmt('obj_build',{n:game.p.units.length+'/'+o.units, e:o.era+1});
  if (o.type==='reachEra')return fmt('obj_era',{e:o.era+1});
  return tr('obj_destroy');
}
function endMission(win){
  const sc=game.scenario;
  game.over=true; game.win=win;
  if (win) campDone(sc.mission.id);
  game.shake=18; burst((win?game.e:game.p).x, gY((win?game.e:game.p).x)-60, '#fff', 40, 1.5);
  sfx(win?'evolve':'boom');
  setTimeout(showEnd, 1100);
}