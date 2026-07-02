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
/* ---- côté HÔTE : application des commandes de l'invité (sur game.e) ---- */
function resolveRef(ref){
  if (!ref) return null;
  return ref.t==='own'? game.e.slots[ref.i] : ref.t==='neut'? game.neut[ref.i] : null;
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
function applyPointIds(side, x, ids){
  const set = new Set(ids||[]);
  const sel = side.units.filter(u=>set.has(u.id));
  sel.forEach((u,i)=>{
    u.ord='point'; u.task=null;
    u.px = clamp(x + (i-(sel.length-1)/2)*16, 40, WORLD-40);
  });
}
function applyCmd(cmd){
  const e = game.e;
  try {
    switch(cmd.c){
      case 'buy':    tryBuy(e, cmd.ri); break;
      case 'hero':   tryHero(e); break;
      case 'evo':    tryEvolve(e); break;
      case 'ult':    trySpecial(e); break;
      case 'cap':    tryCapUp(e); break;
      case 'urole':  tryUpgRole(e, cmd.ri); break;
      case 'repall': tryRepairAll(e); break;
      case 'fort':   tryFortify(e); break;
      case 'autorep':tryAutoRepair(e); break;
      case 'repbase':tryRepairBase(e); break;
      case 'form':   e.formation=!e.formation; break;
      case 'stance': applyStanceIds(e, cmd.st, cmd.ids); break;
      case 'point':  applyPointIds(e, cmd.x, cmd.ids); break;
      case 'build':  { const s=resolveRef(cmd.ref); if (s) tryBuild(e,s,cmd.type); break; }
      case 'srep':   { const s=resolveRef(cmd.ref); if (s&&s.b) tryRepair(e,s); break; }
      case 'subg':   { const s=resolveRef(cmd.ref); if (s&&s.b) tryUpgBuild(e,s); break; }
      case 'gar':    { const s=resolveRef(cmd.ref); if (s) dispatchGarrison(e,s,cmd.role); break; }
      case 'garsel': { const s=resolveRef(cmd.ref); if (s&&canGar(s.b)) garrisonByIds(e,s,cmd.ids); break; }
      case 'bgar':   dispatchBaseGarrison(e, cmd.role); break;
      case 'ungar':  { const s=resolveRef(cmd.ref); if (s&&s.b&&s.b.gar.length){
                       for (const g of s.b.gar){ g.x=s.x+(Math.random()*30-15); e.units.push(g); } s.b.gar=[]; } break; }
      case 'bungar': { for (const g of e.gar){ g.x=e.x+e.side*40; e.units.push(g); } e.gar=[]; break; }
      case 'demo':   { const s=resolveRef(cmd.ref); if (s&&s.b) demolish(s); break; }
    }
  } catch(err){ console.error('applyCmd', err); }
}
/* ---- côté INVITÉ : reconstruction de la vue miroir depuis un snapshot ---- */
function deBld(sb, ownerSide){
  if (!sb || sb===0) return null;
  const type = BCODE_TYPE[sb[0]];
  const b = { type, hp:sb[1], maxhp:sb[2], lvl:sb[3], atkT:0, gar:[] };
  if (type==='site') b.buildType = BCODE_TYPE[sb[4]];
  b.gar = (sb[5]||[]).map(g=>({role:CODE_ROLES[g[0]], era:g[1], fac:g[2]?'IA':'HUM', atkT:0, rate:1, bob:0}));
  return b;
}
function applySnapshot(snap){
  if (!game || game.net!=='guest') return;
  const g = game;
  g.t = snap.t; g.dev = snap.dev; g.weather = snap.we||null; g.boon = snap.bo||null;
  g.kills = snap.ekills; g.eKills = snap.kills;
  // cataclysme en cours (vue miroir : x → WORLD-x)
  const ck = (snap.ca>=0)? CATA_KEYS[snap.ca] : null;
  g.cata = ck; g.cataT = snap.cat||0; g.cataDur = ck? CATAS[ck].dur : 0;
  g.cataX = WORLD - (snap.cax||0);
  g.winter = !!snap.wi; g.winterT = snap.wt||0;
  // l'armée de l'invité = canonical 'e' → devient le local p (à gauche) ; mirroir des x
  const fillSide = (loc, ser, foeWon)=>{
    loc.hp=ser.hp; loc.maxhp=ser.mh; loc.f=ser.f; loc.m=ser.m; loc.w=ser.w; loc.xp=ser.xp;
    loc.era=ser.era; loc.trans=!!ser.tr; loc.cap=ser.cap; loc.stance=ser.st; loc.fortLvl=ser.fl;
    loc.autoRepair=!!ser.ar; loc.specialCd=ser.scd; loc.lastReady=!!ser.lr; loc.lastUsed=!!ser.lu;
    loc.formation=!!ser.fm; loc.prodMul=ser.pm; loc.upg=ser.upg;
    loc.heroCd=ser.hcd||0; loc.queueLen=ser.q||0;
    loc.gar = new Array(ser.gn).fill(0).map(()=>({}));   // longueur seule (compteur d'effectif)
    for (let i=0;i<loc.slots.length;i++){ loc.slots[i].b = deBld(ser.slots[i], loc);
      loc.slots[i].owner = loc.slots[i].b? loc : null; }
  };
  fillSide(g.p, snap.e);   // moi (invité) = canonical e
  fillSide(g.e, snap.p);   // hôte = canonical p
  // unités : mirroir x = WORLD-x, side inversé
  const keep = new Set([...g.sel].map(u=>u.id));
  g.p.units.length = 0; g.e.units.length = 0;
  const addU = (a)=>{
    const role = CODE_ROLES[a[1]];
    const cside = a[7];                       // côté canonique (1=hôte, -1=invité)
    const loc = (cside===-1)? g.p : g.e;       // invité→local p, hôte→local e
    const tx = WORLD - a[2];
    const id = a[0];
    const u = { id, role, fac:a[6]?'IA':'HUM', era:a[5], side:(cside===-1?1:-1),
      tx, x:(GX[id]!==undefined? GX[id]:tx), hp:a[3], maxhp:a[4],
      fly:!!a[8], flyH:a[9], vet:!!a[10], tiredT:a[11]?1:0, trans:!!a[12],
      atkT:a[13]?1:0, rate:1, bob:Math.random()*6.28, flash:0, range:role==='ranged'||role==='siege'||role==='air'?150:16 };
    loc.units.push(u);
  };
  for (const a of snap.pu) addU(a);
  for (const a of snap.eu) addU(a);
  g.sel = new Set(g.p.units.filter(u=>keep.has(u.id)));
  // spots neutres (mirroir owner) et lacs (mirroir prog/owner)
  for (let i=0;i<g.neut.length;i++){ const ns=snap.neut[i];
    const own = ns[0]===-1? g.p : ns[0]===1? g.e : null;
    g.neut[i].owner = own; g.neut[i].b = deBld(ns[1], own); }
  for (let i=0;i<g.nodes.length;i++){ const nd=snap.nodes[i];
    g.nodes[i].owner = nd[0]===-1? 'p' : nd[0]===1? 'e' : null;
    g.nodes[i].prog = -nd[1]; }
  if (snap.zones && g.zones) for (let i=0;i<g.zones.length;i++){ const zd=snap.zones[i]; if(!zd) continue;
    g.zones[i].owner = zd[0]===-1? 'p' : zd[0]===1? 'e' : null; g.zones[i].prog = -zd[1]; }
  // tirs & obus (mirroir x)
  shots = snap.shots.map(s=>({x:WORLD-s[0], y:s[1], tx:WORLD-s[2], ty:s[3], t:s[4], dur:s[5], fac:s[6]?'IA':'HUM', era:s[7]}));
  projectiles = snap.proj.map(p=>({sx:WORLD-p[0], tx:WORLD-p[1], t:p[2], dur:p[3], fac:p[4]?'IA':'HUM', era:p[5], aoe:44}));
  // fin de partie
  if (snap.ov && !g.over){ g.over=true; g.win = !snap.pw; game.shake=18; setTimeout(showEnd, 900); }
}
function applyEvents(ev){
  if (!ev) return;
  for (const e of ev){
    if (e.k==='b') burst(WORLD-e.x, e.y, e.c, e.n, e.p);
    else if (e.k==='f') addFloater(WORLD-e.x, e.y, e.t, e.c, e.s);
    else if (e.k==='a'){ game.msg={txt:e.t, color:e.c}; game.msgT=2.6; }
    else if (e.k==='s') sfx(e.n, e.p);
  }
}
function onSnapshot(data){
  if (!game || game.net!=='guest') return;
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
  for (let i=particles.length-1;i>=0;i--){ const pt=particles[i]; pt.t+=dt;
    pt.x+=pt.vx*dt; pt.y+=pt.vy*dt; pt.vy+=220*dt; if (pt.t>pt.life) particles.splice(i,1); }
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
