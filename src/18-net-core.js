/* =====================================================================
   ================= MULTIJOUEUR — serveur-chez-l'hôte (WebRTC) =========
   L'hôte fait tourner la simulation autoritaire et diffuse l'état ;
   l'invité envoie ses commandes et affiche une vue MIROIR (toujours à
   gauche), interpolée. Mise en relation P2P via PeerJS (broker public gratuit).
   ===================================================================== */
function bcode(b){ return b? ({wall:1,turret:2,farmF:3,farmM:4,well:5,site:6}[b.type]||0) : 0; }
const BCODE_TYPE = [null,'wall','turret','farmF','farmM','well','site'];
function serBld(b){
  if (!b) return 0;
  return [bcode(b), Math.round(b.hp), Math.round(b.maxhp), b.lvl||1,
    (b.type==='site'? (BCODE_TYPE.indexOf(b.buildType)) : 0),
    (b.gar||[]).map(g=>[ROLE_CODES[g.role]||0, g.era, g.fac==='HUM'?0:1])];
}
function serSide(s){
  return { hp:Math.round(s.hp), mh:Math.round(s.maxhp), f:Math.round(s.f), m:Math.round(s.m),
    w:Math.round(s.w), xp:Math.round(s.xp), era:s.era, tr:s.trans?1:0, cap:s.cap, st:s.stance,
    fl:s.fortLvl||1, ar:s.autoRepair?1:0, scd:Math.round(s.specialCd*10)/10, lr:s.lastReady?1:0,
    lu:s.lastUsed?1:0, fm:s.formation?1:0, pm:Math.round((s.prodMul||1)*100)/100,
    hcd:Math.round(s.heroCd||0), q:s.queue?s.queue.length:0,
    upg:s.upg, gn:(s.gar||[]).length, slots:s.slots.map(sl=>serBld(sl.b)) };
}
function serialize(){
  const u2 = u => [u.id, ROLE_CODES[u.role], Math.round(u.x), Math.round(u.hp), Math.round(u.maxhp),
    u.era, u.fac==='HUM'?0:1, u.side, u.fly?1:0, u.flyH|0, u.vet?1:0, u.tiredT>0?1:0, u.trans?1:0,
    (u.atkT>u.rate-0.12?1:0)];
  return {
    t:game.t, dev:Math.round(game.dev*1000)/1000, we:game.weather||0, bo:game.boon||0, ov:game.over?1:0,
    ca:game.cata?CATA_KEYS.indexOf(game.cata):-1, cat:Math.round(game.cataT*10)/10, cax:Math.round(game.cataX||0),
    wi:game.winter?1:0, wt:Math.round(game.winterT||0),
    pw:game.win?1:0, kills:game.kills, ekills:game.eKills,
    p:serSide(game.p), e:serSide(game.e),
    pu:game.p.units.map(u2), eu:game.e.units.map(u2),
    neut:game.neut.map(n=>[n.owner===game.p?1:n.owner===game.e?-1:0, serBld(n.b)]),
    nodes:game.nodes.map(n=>[n.owner==='p'?1:n.owner==='e'?-1:0, Math.round(n.prog*100)/100]),
    zones:game.zones.map(z=>[z.owner==='p'?1:z.owner==='e'?-1:0, Math.round(z.prog*100)/100]),
    shots:shots.map(s=>[Math.round(s.x),s.y,Math.round(s.tx),s.ty,s.t,s.dur,s.fac==='HUM'?0:1,s.era]),
    proj:projectiles.map(pr=>[Math.round(pr.sx),Math.round(pr.tx),pr.t,pr.dur,pr.fac==='HUM'?0:1,pr.era]),
  };
}
/* ---- côté HÔTE : application des commandes de l'invité (sur game.e) ----
   SÉCURITÉ : l'hôte fait autorité et ne fait JAMAIS confiance au contenu reçu (un client modifié
   peut envoyer n'importe quoi). Index entiers bornés, valeurs dans des listes connues, propriété
   des bâtiments vérifiée. Sans ça : pollution de prototype (ref.i='__proto__' → Array.prototype.b),
   coordonnées NaN qui contaminaient la simulation, ou vol des troupes en garnison de l'hôte
   (« ungar » sur un bâtiment neutre qu'il a capturé). */
const CMD_BUILD_TYPES = ['wall','turret','farmF','farmM','well'];
const CMD_STANCES = ['charge','hold','retreat'], CMD_GAR_ROLES = ['ranged','siege'];
const isIdx = (v, n) => Number.isInteger(v) && v>=0 && v<n;
function cmdIds(ids){ return Array.isArray(ids)? ids.slice(0, 120).filter(v => Number.isFinite(v)) : []; }
// own=true : un bâtiment EXISTANT doit appartenir à l'invité (game.e) — jamais celui de l'hôte
function resolveRef(ref, own){
  if (!ref || typeof ref!=='object') return null;
  const arr = ref.t==='own'? game.e.slots : ref.t==='neut'? game.neut : null;
  if (!arr || !isIdx(ref.i, arr.length)) return null;
  const s = arr[ref.i];
  if (own && s.b && s.owner!==game.e) return null;
  return s;
}
function applyStanceIds(side, st, ids){
  if (ids && ids.length){
    const set = new Set(ids);
    for (const u of side.units) if (set.has(u.id)){ u.ord=st; if (st==='hold') u.holdX=u.x; }
  } else {
    side.stance = st;
    if (st==='hold'){ let front=side.x+side.side*240;
      for (const u of side.units) if ((u.x-front)*side.side>0) front=u.x; side.holdX=front; }
    for (const u of side.units) u.ord=null;
  }
}
function garrisonByIds(side, slot, ids){
  const free = GAR_MAX - slot.b.gar.length; if (free<=0) return;
  const set = new Set(ids||[]);
  const elig = side.units.filter(u=>set.has(u.id) && u.range>60 && !u.fly && u.role!=='support'
    && Math.abs(u.x-slot.x)<260).slice(0, free);
  for (const u of elig){ slot.b.gar.push(u); side.units.splice(side.units.indexOf(u),1); }
}
// ordre de position de l'invité (coordonnée déjà convertie côté invité en repère hôte)
// ids vide = TOUTE l'armée (aucune sélection côté invité)
function applyPointIds(side, x, ids){
  const set = new Set(ids||[]);
  const sel = (ids && ids.length)? side.units.filter(u=>set.has(u.id))
                                 : side.units.filter(u=>u.role!=='gremlin');
  sel.forEach((u,i)=>{
    u.ord='point'; u.task=null;
    u.px = clamp(x + (i-(sel.length-1)/2)*16, 40, WORLD-40);
  });
}
function applyCmd(cmd){
  const e = game.e;
  if (!cmd || typeof cmd!=='object') return;
  try {
    switch(cmd.c){
      case 'buy':    if (isIdx(cmd.ri, ROLES.length)) tryBuy(e, cmd.ri); break;
      case 'hero':   tryHero(e); break;
      case 'evo':    tryEvolve(e); break;
      case 'ult':    trySpecial(e); break;
      case 'cap':    tryCapUp(e); break;
      case 'urole':  if (isIdx(cmd.ri, ROLES.length)) tryUpgRole(e, cmd.ri); break;
      case 'repall': tryRepairAll(e); break;
      case 'fort':   tryFortify(e); break;
      case 'autorep':tryAutoRepair(e); break;
      case 'repbase':tryRepairBase(e); break;
      case 'form':   e.formation=!e.formation; break;
      case 'stance': if (CMD_STANCES.includes(cmd.st)) applyStanceIds(e, cmd.st, cmdIds(cmd.ids)); break;
      case 'point':  if (Number.isFinite(cmd.x)) applyPointIds(e, clamp(cmd.x, 40, WORLD-40), cmdIds(cmd.ids)); break;
      case 'build':  { const s=resolveRef(cmd.ref, true); if (s && !s.b && CMD_BUILD_TYPES.includes(cmd.type)) tryBuild(e,s,cmd.type); break; }
      case 'srep':   { const s=resolveRef(cmd.ref, true); if (s&&s.b) tryRepair(e,s); break; }
      case 'subg':   { const s=resolveRef(cmd.ref, true); if (s&&s.b) tryUpgBuild(e,s); break; }
      case 'gar':    { const s=resolveRef(cmd.ref, true); if (s&&s.b) dispatchGarrison(e,s,CMD_GAR_ROLES.includes(cmd.role)? cmd.role : 'ranged'); break; }
      case 'garsel': { const s=resolveRef(cmd.ref, true); if (s&&canGar(s.b)) garrisonByIds(e,s,cmdIds(cmd.ids)); break; }
      case 'bgar':   if (CMD_GAR_ROLES.includes(cmd.role)) dispatchBaseGarrison(e, cmd.role); break;
      case 'ungar':  { const s=resolveRef(cmd.ref, true); if (s&&s.b&&s.b.gar.length){
                       for (const g of s.b.gar){ g.x=s.x+(Math.random()*30-15); e.units.push(g); } s.b.gar=[]; } break; }
      case 'bungar': { for (const g of e.gar){ g.x=e.x+e.side*40; e.units.push(g); } e.gar=[]; break; }
      case 'demo':   { const s=resolveRef(cmd.ref, true); if (s&&s.b) demolish(s); break; }
    }
  } catch(err){ console.error('applyCmd', err); }
}
/* ---- côté INVITÉ : reconstruction de la vue miroir depuis un snapshot ---- */
// SÉCURITÉ (invité) : l'instantané vient de l'hôte, donc potentiellement d'un client modifié.
// Tout est ramené à des nombres finis bornés / des valeurs connues, et les listes sont plafonnées :
// sinon une chaîne piégée finissait dans l'écran de fin (innerHTML → exécution de script), un
// tableau géant ou burst(n=1e7) gelait le jeu, un rôle inconnu faisait planter chaque image.
const SN = (v, lo, hi, d=0) => { v = +v; return Number.isFinite(v)? (v<lo? lo : v>hi? hi : v) : d; };
const SA = (a, max) => Array.isArray(a)? (a.length>max? a.slice(0, max) : a) : [];
const SCOL = c => (typeof c==='string' && c.length<=32 && /^[#a-z0-9(),.\s%]+$/i.test(c))? c : '#e8e0d2';
const SNAP_WEATHER = ['strike','patch'], SNAP_BOON = ['rain','signal'];
function deBld(sb, ownerSide){
  if (!Array.isArray(sb) || !isIdx(sb[0], BCODE_TYPE.length) || !sb[0]) return null;
  const type = BCODE_TYPE[sb[0]];
  const maxhp = SN(sb[2], 1, 1e6, 100);
  const b = { type, hp:SN(sb[1], 0, maxhp), maxhp, lvl:SN(sb[3], 1, 3, 1)|0, atkT:0, gar:[] };
  if (type==='site') b.buildType = BCODE_TYPE[isIdx(sb[4], BCODE_TYPE.length)? sb[4] : 1] || 'wall';
  b.gar = SA(sb[5], GAR_MAX).filter(g => Array.isArray(g) && CODE_ROLES[g[0]])
    .map(g=>({role:CODE_ROLES[g[0]], era:SN(g[1],0,4)|0, fac:g[2]?'IA':'HUM', atkT:0, rate:1, bob:0}));
  return b;
}
function applySnapshot(snap){
  if (!game || game.net!=='guest' || !snap || typeof snap!=='object') return;
  const g = game;
  g.t = SN(snap.t, 0, 1e7); g.dev = SN(snap.dev, 0, 1);
  g.weather = SNAP_WEATHER.includes(snap.we)? snap.we : null; g.boon = SNAP_BOON.includes(snap.bo)? snap.bo : null;
  g.kills = SN(snap.ekills, 0, 1e7)|0; g.eKills = SN(snap.kills, 0, 1e7)|0;
  // cataclysme en cours (vue miroir : x → WORLD-x)
  const ck = isIdx(snap.ca, CATA_KEYS.length)? CATA_KEYS[snap.ca] : null;
  g.cata = ck; g.cataT = SN(snap.cat, 0, 600); g.cataDur = ck? CATAS[ck].dur : 0;
  g.cataX = WORLD - SN(snap.cax, 0, WORLD);
  g.winter = !!snap.wi; g.winterT = SN(snap.wt, 0, 3600);
  // l'armée de l'invité = canonical 'e' → devient le local p (à gauche) ; mirroir des x
  const fillSide = (loc, ser)=>{
    if (!ser || typeof ser!=='object') return;
    loc.maxhp=SN(ser.mh, 1, 1e7, 1000); loc.hp=SN(ser.hp, 0, loc.maxhp);
    loc.f=SN(ser.f, 0, 1e9); loc.m=SN(ser.m, 0, 1e9); loc.w=SN(ser.w, 0, 1e9); loc.xp=SN(ser.xp, 0, 1e9);
    loc.era=SN(ser.era, 0, 4)|0; loc.trans=!!ser.tr; loc.cap=SN(ser.cap, 0, 200, 30)|0;
    loc.stance=CMD_STANCES.includes(ser.st)? ser.st : 'charge'; loc.fortLvl=SN(ser.fl, 1, 3, 1)|0;
    loc.autoRepair=!!ser.ar; loc.specialCd=SN(ser.scd, 0, 600); loc.lastReady=!!ser.lr; loc.lastUsed=!!ser.lu;
    loc.formation=!!ser.fm; loc.prodMul=SN(ser.pm, 0, 10, 1);
    const upg = {}; if (ser.upg && typeof ser.upg==='object') for (const r of ROLES) upg[r.key] = SN(ser.upg[r.key], 0, 3)|0;
    loc.upg = upg;
    loc.heroCd=SN(ser.hcd, 0, 1e4); loc.queueLen=SN(ser.q, 0, 99)|0;
    loc.gar = new Array(SN(ser.gn, 0, 3)|0).fill(0).map(()=>({}));   // longueur seule (compteur d'effectif)
    const sl = SA(ser.slots, 64);
    for (let i=0;i<loc.slots.length;i++){ loc.slots[i].b = deBld(sl[i], loc);
      loc.slots[i].owner = loc.slots[i].b? loc : null; }
  };
  fillSide(g.p, snap.e);   // moi (invité) = canonical e
  fillSide(g.e, snap.p);   // hôte = canonical p
  // unités : mirroir x = WORLD-x, side inversé
  const keep = new Set([...g.sel].map(u=>u.id));
  g.p.units.length = 0; g.e.units.length = 0;
  const addU = (a)=>{
    if (!Array.isArray(a)) return;
    const role = CODE_ROLES[a[1]]; if (!role) return;
    const cside = a[7];                       // côté canonique (1=hôte, -1=invité)
    const loc = (cside===-1)? g.p : g.e;       // invité→local p, hôte→local e
    const tx = WORLD - SN(a[2], 0, WORLD);
    const id = SN(a[0], 0, 1e9, -1); if (id<0) return;
    const maxhp = SN(a[4], 1, 1e6, 100);
    const u = { id, role, fac:a[6]?'IA':'HUM', era:SN(a[5],0,4)|0, side:(cside===-1?1:-1),
      tx, x:(GX[id]!==undefined? GX[id]:tx), hp:SN(a[3], 0, maxhp), maxhp,
      fly:!!a[8], flyH:SN(a[9], 0, 200)|0, vet:!!a[10], tiredT:a[11]?1:0, trans:!!a[12],
      atkT:a[13]?1:0, rate:1, bob:Math.random()*6.28, flash:0, range:role==='ranged'||role==='siege'||role==='air'?150:16 };
    loc.units.push(u);
  };
  for (const a of SA(snap.pu, 300)) addU(a);
  for (const a of SA(snap.eu, 300)) addU(a);
  g.sel = new Set(g.p.units.filter(u=>keep.has(u.id)));
  // spots neutres (mirroir owner) et lacs (mirroir prog/owner)
  const sn = SA(snap.neut, 16), sd = SA(snap.nodes, 16), sz = SA(snap.zones, 16);
  for (let i=0;i<g.neut.length;i++){ const ns=sn[i]; if (!Array.isArray(ns)) continue;
    const own = ns[0]===-1? g.p : ns[0]===1? g.e : null;
    g.neut[i].owner = own; g.neut[i].b = deBld(ns[1], own); }
  for (let i=0;i<g.nodes.length;i++){ const nd=sd[i]; if (!Array.isArray(nd)) continue;
    g.nodes[i].owner = nd[0]===-1? 'p' : nd[0]===1? 'e' : null;
    g.nodes[i].prog = -SN(nd[1], -1, 1); }
  if (g.zones) for (let i=0;i<g.zones.length;i++){ const zd=sz[i]; if (!Array.isArray(zd)) continue;
    g.zones[i].owner = zd[0]===-1? 'p' : zd[0]===1? 'e' : null; g.zones[i].prog = -SN(zd[1], -1, 1); }
  // tirs & obus (mirroir x)
  shots = SA(snap.shots, 400).filter(Array.isArray).map(s=>({x:WORLD-SN(s[0],0,WORLD), y:SN(s[1],-200,800), tx:WORLD-SN(s[2],0,WORLD), ty:SN(s[3],-200,800),
    t:SN(s[4],0,5), dur:SN(s[5],0.01,5,0.16), fac:s[6]?'IA':'HUM', era:SN(s[7],0,4)|0}));
  projectiles = SA(snap.proj, 300).filter(Array.isArray).map(p=>({sx:WORLD-SN(p[0],0,WORLD), tx:WORLD-SN(p[1],0,WORLD), t:SN(p[2],0,5), dur:SN(p[3],0.01,5,0.7),
    fac:p[4]?'IA':'HUM', era:SN(p[5],0,4)|0, aoe:44}));
  // fin de partie
  if (snap.ov && !g.over){ g.over=true; g.win = !snap.pw; game.shake=18; setTimeout(showEnd, 900); }
}
function applyEvents(ev){
  for (const e of SA(ev, 200)){
    if (!e || typeof e!=='object') continue;
    const x = WORLD - SN(e.x, 0, WORLD), y = SN(e.y, -300, 900);
    if (e.k==='b') burst(x, y, SCOL(e.c), SN(e.n, 0, 60)|0, SN(e.p, 0, 3, 1));
    else if (e.k==='x') explode(x, y, SN(e.p, 0, 3, 1), SCOL(e.c));
    else if (e.k==='f') addFloater(x, y, String(e.t==null? '' : e.t).slice(0, 48), SCOL(e.c), SN(e.s, 6, 40, 13));
    else if (e.k==='a'){ game.msg={txt:String(e.t==null? '' : e.t).slice(0, 120), color:SCOL(e.c)}; game.msgT=2.6; }
    else if (e.k==='s' && NET_SFX.has(e.n)) sfx(e.n, SN(e.p, 0, 8));
  }
}
function onSnapshot(data){
  if (!game || game.net!=='guest' || !data || typeof data!=='object') return;
  applySnapshot(data.s);
  applyEvents(data.ev);
}
// l'invité fait juste avancer l'affichage (interpolation, animations, effets locaux)
function netGuestTick(dt){
  if (!game || paused || game.over) return;
  const ease = Math.min(1, dt*9);
  for (const side of [game.p, game.e]) for (const u of side.units){
    u.x += (u.tx - u.x)*ease; GX[u.id] = u.x;
    u.bob += dt*7; if (u.flash>0) u.flash-=dt;
  }
  for (let i=shots.length-1;i>=0;i--){ shots[i].t+=dt; if (shots[i].t>shots[i].dur) shots.splice(i,1); }
  for (let i=projectiles.length-1;i>=0;i--){ projectiles[i].t+=dt; if (projectiles[i].t>projectiles[i].dur) projectiles.splice(i,1); }
  stepParticles(dt);
  for (let i=floaters.length-1;i>=0;i--){ const f=floaters[i]; f.t+=dt; f.y-=22*dt; if (f.t>1.6) floaters.splice(i,1); }
  if (game.msgT>0) game.msgT-=dt;
  if (game.shake>0) game.shake=Math.max(0,game.shake-dt*30);
  if (game.flash>0) game.flash-=dt;
  if (camFollow && !dragging){
    let front = game.p.units.length? Math.max(...game.p.units.map(u=>u.x)) : game.p.x+200;
    camX = lerp(camX, clamp(front - VW()*0.45, 0, WORLD-VW()), Math.min(1,dt*2.2));
  }
  camClamp();
}
/* ---- démarrage des parties en ligne ---- */
function netNeutralDiff(){ return {name:'EN LIGNE', inc:1, think:1, eraLag:0, hpMul:1, cheat:1}; }
function startHostGame(){
  audioInit(); musicStart();
  intro=-1; pendingStart=null;
  newGame(net.myFac, 1, false, net.foeFac);
  game.d = netNeutralDiff();
  game.e.hp = game.e.maxhp = 1500;
  game.net = 'host';
  game.speed = clampSpeed(net.speed);                 // vitesse décidée dans le lobby
  if (net.hbTimer){ clearInterval(net.hbTimer); net.hbTimer=null; }
  if (net.pub) lobbyRemove(net.code);                 // salon plein : on le retire de la liste
  resetSpeedNet();
  net.sendStart({hostFac:net.myFac, guestFac:net.foeFac, v:NET_PROTO, speed:game.speed});
  $('menu').style.display='none'; closeNetUI();
  announce(fmt('a_net_start',{a:FACTIONS[net.myFac].name, b:FACTIONS[net.foeFac].name}), '#9dc88a');
}
function startGuestGame(data){
  audioInit(); musicStart();
  intro=-1; pendingStart=null;
  // l'invité construit une coquille « vue normale » (lui à gauche) que les snapshots rempliront
  net.myFac = data.guestFac; net.foeFac = data.hostFac;
  newGame(data.guestFac, 1, false, data.hostFac);
  game.d = netNeutralDiff();
  game.net = 'guest';
  game.speed = clampSpeed(data.speed);                 // vitesse décidée par l'hôte (lobby)
  if (net) net.speed = game.speed;
  resetSpeedNet();
  // les lacs/spots de la VUE invité sont en miroir des positions canoniques (indices alignés)
  game.nodes = [ {x:WORLD*0.75,owner:null,prog:0,center:false},
                 {x:WORLD*0.50,owner:null,prog:0,center:true},
                 {x:WORLD*0.25,owner:null,prog:0,center:false} ];
  game.zones = [ {x:WORLD*0.70,owner:null,prog:0}, {x:WORLD*0.50,owner:null,prog:0}, {x:WORLD*0.30,owner:null,prog:0} ];
  game.neut = [ {x:WORLD*0.67,b:null,owner:null}, {x:WORLD*0.58,b:null,owner:null},
                {x:WORLD*0.42,b:null,owner:null}, {x:WORLD*0.33,b:null,owner:null} ];
  GX = {};
  $('menu').style.display='none'; closeNetUI();
  announce(fmt('a_net_conn',{name:FACTIONS[data.guestFac].name}), '#9dc88a');
}
function onPeerLeft(){
  if (!game){
    // déconnexion AVANT le début (dans le lobby) : on ne termine pas une partie inexistante
    if (net){
      net.foeFac = null;
      if (net.role==='host'){                 // l'hôte ré-attend un nouvel invité
        netStatus(t('lob_foe_left'));
        showHostingCode(net.code);
        if (net.pub) lobbyPublish();
      } else {                                  // l'invité : l'hôte est parti → retour à l'accueil
        netStatus(t('lob_host_left'));
        showNetView('home');
      }
    }
    return;
  }
  paused = false; netPause = null;
  announce(tr('a_net_dc'), '#ff5a4a');
  if (!game.over){ game.over=true; game.win = game.net==='host'; setTimeout(showEnd, 600); }
}
