// ====================== HABILLAGE DES CARTES (décor NON-interactif) ======================
// Calque cosmétique qui meuble les zones vides — il ne bloque PAS le pathfinding (purement
// visuel, à l'échelle des unités). Thématisé par le terrain de la carte/mission.
let DECOR = [];
const DECOR_THEMES = {
  plains:  ['bush','bush','bush','wreck','wreck','tiremark','tiremark','debris'],         // ville quasi plate
  hills:   ['bush','bush','bush','debris','debris','barricade','barricade','wreck'],      // faubourgs
  rugged:  ['debris','debris','debris','barricade','barricade','cable','cable','wreck'],  // insurrection
  waste:   ['wreck','wreck','wreck','debris','debris','debris','cable','cable','tiremark'], // terres dévastées
  default: ['bush','bush','wreck','debris','debris','tiremark','barricade','cable'],
};
function genDecor(theme){
  const pool = DECOR_THEMES[theme] || DECOR_THEMES.default;
  let seed = 1337 + (theme? theme.length*97 + theme.charCodeAt(0) : 0);
  const rnd = ()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  // placement PROPRE : jamais sur une base, un socle, un lac ni une zone (fini l'épave
  // collée derrière le château), et espacement minimal pour que rien ne se chevauche.
  const out=[]; let guard=0;
  while (out.length<24 && guard++<800){
    const x = 140+rnd()*(WORLD-280);
    const kind = pool[(rnd()*pool.length)|0], s = 0.8+rnd()*0.7, ph = rnd()*6.28, flip = rnd()<0.5?1:-1;
    if (!mapClear(x, 34)) continue;
    if (out.some(o=>Math.abs(o.x-x)<50)) continue;
    out.push({x, kind, s, ph, flip});
  }
  out.sort((a,b)=>a.x-b.x);
  return out;
}
// rendu du calque de décor (repère monde zoomé : x = monde − camX), culé hors écran
function drawDecor(dev, t, vw){
  if (!DECOR.length) return;
  const lo = SETTINGS.quality==='low'; let i=0;
  for (const d of DECOR){
    if (lo && (i++ & 1)) continue;                 // moitié des éléments en qualité Faible
    const x = d.x - camX; if (x<-60 || x>vw+60) continue;
    ctx.save(); ctx.translate(x, gY(d.x)); drawDecorItem(d, dev, t, lo); ctx.restore();
  }
}
function dShadow(w){ ctx.fillStyle='rgba(10,8,8,0.22)'; ctx.beginPath(); ctx.ellipse(0,1,w,w*0.26,0,0,6.283); ctx.fill(); }
function drawDecorItem(d, dev, t, lo){
  const s=d.s, k=d.kind, sway=Math.sin(t*1.4+d.ph);
  if (k==='bush'){
    dShadow(13*s);
    const base = dev<0.5? '74,120,58' : '110,98,54';   // vert → desséché quand le monde agonise
    ctx.fillStyle='rgba('+base+',0.96)';
    ctx.beginPath(); ctx.arc(-5*s,-6*s,7*s,0,6.28); ctx.arc(5*s,-6*s,7*s,0,6.28);
    ctx.arc(0,-11*s+sway*0.8,8*s,0,6.28); ctx.fill();
    ctx.fillStyle='rgba('+base+',0.45)'; ctx.beginPath(); ctx.arc(-3*s,-9*s,3*s,0,6.28); ctx.arc(4*s,-8*s,2.5*s,0,6.28); ctx.fill();
  } else if (k==='wreck'){
    ctx.scale(d.flip,1); dShadow(20*s);
    ctx.fillStyle='rgba(42,38,44,1)'; rr(-16*s,-12*s,32*s,12*s,3); ctx.fill();   // châssis calciné
    ctx.beginPath(); ctx.moveTo(-9*s,-12*s); ctx.lineTo(-5*s,-20*s); ctx.lineTo(7*s,-20*s); ctx.lineTo(10*s,-12*s); ctx.closePath(); ctx.fill(); // cabine défoncée
    ctx.fillStyle='rgba(120,70,40,0.5)'; ctx.fillRect(-15*s,-10*s,30*s,2.4*s);   // rouille/brûlure
    ctx.fillStyle='rgba(18,16,18,1)';                                            // roues à plat
    ctx.beginPath(); ctx.arc(-10*s,0,3.6*s,0,6.28); ctx.arc(10*s,0,3.6*s,0,6.28); ctx.fill();
    if (!lo){ ctx.save(); ctx.globalAlpha=0.18+0.06*Math.sin(t*0.9+d.ph); ctx.fillStyle='rgba(60,58,64,1)';   // volute de fumée
      ctx.beginPath(); ctx.arc(3*s,-24*s-((t*6+d.ph*9)%18),4*s,0,6.28); ctx.fill(); ctx.restore(); }
  } else if (k==='debris'){
    dShadow(13*s); ctx.fillStyle='rgba(70,64,60,1)';
    ctx.beginPath(); ctx.moveTo(-12*s,0); ctx.lineTo(-6*s,-8*s); ctx.lineTo(0,0); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(92,84,78,1)'; ctx.fillRect(1*s,-6*s,8*s,6*s);
    ctx.fillStyle='rgba(120,112,104,0.8)'; ctx.fillRect(1*s,-6*s,8*s,1.4*s);    // arête éclairée
    ctx.fillStyle='rgba(54,50,48,1)'; ctx.fillRect(-4*s,-3*s,5*s,3*s);
  } else if (k==='barricade'){
    dShadow(15*s); ctx.rotate(-0.12*d.flip);
    ctx.fillStyle='rgba(96,74,46,1)';  ctx.fillRect(-14*s,-4*s,28*s,4*s);       // sacs / planches empilés
    ctx.fillStyle='rgba(120,96,60,1)'; ctx.fillRect(-12*s,-9*s,22*s,5*s);
    ctx.fillStyle='rgba(140,116,76,1)'; ctx.fillRect(-8*s,-13*s,15*s,4*s);
    ctx.strokeStyle='rgba(40,30,20,0.6)'; ctx.lineWidth=1; ctx.strokeRect(-14*s,-4*s,28*s,4*s);
  } else if (k==='tiremark'){
    ctx.strokeStyle='rgba(22,18,16,0.34)'; ctx.lineWidth=2.6*s; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-18*s,1); ctx.quadraticCurveTo(0,-2.5,18*s,1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-18*s,5*s); ctx.quadraticCurveTo(0,1.5,18*s,5*s); ctx.stroke();
    ctx.lineCap='butt';
  } else if (k==='cable'){
    dShadow(6*s); ctx.fillStyle='rgba(34,32,36,1)'; ctx.fillRect(-1.4*s,-22*s,2.8*s,22*s);  // poteau tordu
    ctx.strokeStyle='rgba(26,24,28,0.9)'; ctx.lineWidth=1.6;                                // câble arraché qui pend
    ctx.beginPath(); ctx.moveTo(0,-21*s); ctx.quadraticCurveTo(11*s,-6*s,20*s,-2*s); ctx.stroke();
    if (!lo && ((t*0.7+d.ph)%3)<0.18){ ctx.save(); ctx.globalCompositeOperation='lighter';   // grésillement d'étincelle
      ctx.fillStyle='rgba(150,210,255,0.9)'; ctx.beginPath(); ctx.arc(20*s,-2*s,2.2*s,0,6.28); ctx.fill(); ctx.restore(); }
  }
}
function mkSide(side, facKey, x){
  return {
    side, fac:FACTIONS[facKey], facKey, x, adv:x, gar:[],
    hp:1500, maxhp:1500,
    f:120, m:100, w:40, xp:0, era:0, trans:false,
    units:[], cd:[0,0,0,0,0,0], specialCd:0,
    lastSeen:false, lastReady:false, lastUsed:false,
    stance:'charge', holdX:null,
    cap:30, capUp:false,
    formation:false, autoRepair:false, fortLvl:1, mode:'build', reach:260,
    upg:{melee:0,tank:0,ranged:0,siege:0,air:0,support:0},
    queue:[],                 // file d'attente de production (max 10)
    heroCd:0, heroDone:false,  // unité héroïque légendaire (1 / 10 min)
    phase:1, combatBuff:0, zoneBuff:0,     // seconde base (phase 2) + bonus de comeback + bonus de zones
    siegeT:0,                              // Mode Siège de base (héros) : minuterie du bonus offensif
    slots:[0,1,2].map(i=>({ x: x + side*(95+i*64), b:null, owner:null })),
  };
}
function newGame(facKey, diff, withTuto, eFacOverride){
  const eFac = eFacOverride || (facKey==='HUM'? 'IA':'HUM');
  game = {
    diff, d:DIFFS[diff], t:0, over:false, win:false,
    shake:0, flash:0, dev:0, kills:0, eKills:0, specialsUsed:0,
    p: mkSide(1, facKey, 150),
    e: mkSide(-1, eFac, WORLD-150),
    nodes: [
      {x:WORLD*0.25, owner:null, prog:0, center:false},
      {x:WORLD*0.50, owner:null, prog:0, center:true},
      {x:WORLD*0.75, owner:null, prog:0, center:false},
    ],
    // 3 ZONES stratégiques (anciens « ronds » décoratifs) : +0.5✦/s au contrôleur,
    // et bonus de comeback pour le perdant sur chaque zone qu'il ne tient pas.
    zones: [ {x:WORLD*0.30, owner:null, prog:0}, {x:WORLD*0.50, owner:null, prog:0}, {x:WORLD*0.70, owner:null, prog:0} ],
    neut: [ {x:WORLD*0.33, b:null, owner:null}, {x:WORLD*0.42, b:null, owner:null},
            {x:WORLD*0.58, b:null, owner:null}, {x:WORLD*0.67, b:null, owner:null} ],
    sel: new Set(),
    weather:null, wClock:20,            // cycle météo (démarre au calme)
    boon:null, boonClock:0,             // événements POSITIFS (pluie fertile / signal renforcé)
    bonusZone:null, bonusClock:0,       // 4e zone bonus temporaire (apparaît en milieu de partie)
    craters:[], killLog:[],             // cratères persistants + journal des morts (heatmap/récit)
    cata:null, cataT:0, cataDur:0, cataX:0, cataCd:90, // cataclysmes naturels (voir CATAS)
    winter:false, winterT:0,                            // hiver nucléaire temporaire (2e phase de base)
    aiThink:2, msg:null, msgT:0,
    eraCap:4,                            // plafond d'ère (jusqu'à la Transcendance)
    speed: 1,   // TOUJOURS ×1 au lancement d'une partie (on ne traîne plus le ×3 d'une partie précédente) ; modifiable en cours. Online : la vitesse convenue est réappliquée par le lobby après newGame.
  };
  game.e.hp = game.e.maxhp = 1500*game.d.hpMul;
  DECOR = genDecor('default');             // habillage par défaut (escarmouche/online) ; re-thémé par mission
  particles=[]; floaters=[]; shots=[]; projectiles=[]; LIGHTS=[]; deaths=[];
  speedPanel=null; speedVote=null; clearSpeedPending(); speedProps=[];
  camX = 0; zoom = 1; camFollow = true; buildMenu = null; paused = false; settingsOpen = false;
  selMode = false; selBox = null;
  announce(tr('a_start'), "#e8d8a0");
}
// capture des effets transitoires pour les renvoyer à l'invité (hôte uniquement)
function netEv(e){ if (game && game.net==='host' && net && net.ev && net.ev.length<160) net.ev.push(e); }
function announce(txt,color){ game.msg={txt,color}; game.msgT=2.6; netEv({k:'a',t:txt,c:color}); }
function addFloater(x,y,txt,color,size=13){ floaters.push({x,y,txt,color,size,t:0}); netEv({k:'f',x,y,t:txt,c:color,s:size}); }
function addLight(x,y,col,r,life){ if(LIGHTS.length>60) LIGHTS.shift(); LIGHTS.push({x,y,col,r,life,t:0}); }  // lumière dynamique (RTX simulé)
function burst(x,y,color,n=10,pow=1){
  n = Math.max(2, Math.round(n*qMul()));     // densité selon le profil de qualité
  if (particles.length>520) particles.splice(0, particles.length-520);   // borne mémoire (anti-accumulation)
  for(let i=0;i<n;i++){ const a=Math.random()*6.28, s=(30+Math.random()*120)*pow;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-50,life:0.4+Math.random()*0.5,t:0,color,r:1.5+Math.random()*3}); }
  addLight(x, y, color, 26+n*1.4*pow, 0.35+0.05*pow);                 // flash lumineux d'impact/explosion
  netEv({k:'b',x,y,c:color,n,p:pow});
}
function sideBuildSlots(side){
  const out = side.slots.slice();
  for (const n of game.neut) if (n.owner===side) out.push(n);
  return out;
}
function unitTotal(side){
  // les drones « micro » (essaim GPT) ne pèsent PAS dans le cap global de la carte
  let n = (side.gar? side.gar.length:0);
  for (const u of side.units) if (u.role!=='gremlin') n++;
  for (const s of sideBuildSlots(side)) if (s.b && s.b.gar) n += s.b.gar.length;
  return n;
}
// nombre de drones « micro » actuellement déployés (limité à part du cap)
function droneCount(side){ let n=0; for (const u of side.units) if (u.role==='gremlin') n++; return n; }
function droneCap(side){ return 5 + side.era*2 + (side.upg.support||0)*2; }
// garde du château : envoie l'unité à distance la plus proche, ou en recrute une
function dispatchBaseGarrison(side, role){
  if (isGuest(side)){ guestCmd({c:'bgar', role}); return true; }
  if (side.gar.length>=3) return false;
  if (role!=='ranged' && role!=='siege') role='ranged';
  let best=null, bd=1e9;
  for (const u of side.units){
    if (u.task || u.fly || u.range<=60 || u.role!==role) continue;
    const d = Math.abs(u.x-side.x);
    if (d<bd){ bd=d; best=u; }
  }
  if (best){
    best.task = {kind:'gbase'};
    if (side===game.p){ sfx('sel'); announce(fmt('a_guard_recall',{name:rname(side,role)}), '#e8d8a0'); }
    return true;
  }
  const ri = ROLES.findIndex(r=>r.key===role), cost = unitCost(side, ri);
  if (unitTotal(side)<side.cap && canPay(side, cost)){
    pay(side, cost); spawnUnit(side, ri);
    side.units[side.units.length-1].task = {kind:'gbase'};
    if (side===game.p){ sfx('buy',ri); announce(tr('a_guard_recruit'), '#e8d8a0'); }
    return true;
  }
  return false;
}
// bonus du territoire : plus fort près de sa propre base (jusqu'à +45 %)
function homeBuff(u){
  const bx = u.side===1? game.p.x : game.e.x;
  return 1 + 0.45*Math.max(0, 1 - Math.abs(u.x-bx)/900);
}
// production par seconde (pour l'affichage HUD)
function calcRates(side){
  const dwindle = 1 - 0.65*game.dev;
  let rf=4, rm=2.5, rw=0.6;
  for (const s of sideBuildSlots(side)){
    if (!s.b) continue;
    if (s.b.type==='farmF') rf += BUILDS.farmF.rate*lvlF(s.b)*longevMul(s.b);
    else if (s.b.type==='farmM') rm += BUILDS.farmM.rate*lvlF(s.b)*longevMul(s.b);
    else if (s.b.type==='well') rw += BUILDS.well.rate*lvlF(s.b)*longevMul(s.b)*(1-0.5*game.dev);
  }
  const key = side===game.p? 'p':'e';
  for (const n of game.nodes) if (n.owner===key){
    rw += (n.center? 3.5:2.2)*dwindle;
    if (n.center){ rf += 2*dwindle; rm += 2*dwindle; }
  }
  const pm = side.prodMul||1, wM = game.winter?0.5:1;
  return {f:rf*pm*wM, m:rm*pm*wM, w:rw*pm};
}
