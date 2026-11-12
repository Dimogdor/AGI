/* =====================================================================
   PAUSE EN LIGNE — pause négociée (pas de gel automatique imposé)
   Le demandeur obtient une pause initiale de 40 s. À l'expiration, c'est
   l'ADVERSAIRE qui vote : « prolonger ? ». Oui → +40 s (boucle). Non →
   reprise immédiate. La pause s'applique aux deux clients pour que la
   simulation de l'hôte gèle (l'hôte cesse de diffuser tant que `paused`).
   ===================================================================== */
const PAUSE_WINDOW = 40; // secondes par cycle de pause
function isOnline(){ return game && (game.net==='host' || game.net==='guest'); }
function pauseSend(act){ if (net && net.sendPause){ try{ net.sendPause({act}); }catch(e){} } }
function onlinePauseRequest(){
  if (netPause && netPause.active) return;
  netPause = {active:true, byMe:true, timer:PAUSE_WINDOW, voting:false};
  paused = true; pauseSend('req');
  announce(t('np_paused_you'), '#e8d8a0');
}
function endOnlinePause(broadcast){
  if (broadcast) pauseSend('end');
  netPause = null; paused = false; settingsOpen = false;
  if (game && !game.over) announce(t('np_resumed'), '#9dc88a');
}
const PAUSE_MAX_FOE = 6;               // demandes de pause de l'adversaire acceptées par partie
function onPauseMsg(d){
  if (!game || game.over) return;
  if (d.act==='req'){
    // anti-harcèlement : une pause déjà en cours n'est pas relancée, et au-delà de PAUSE_MAX_FOE
    // demandes on refuse automatiquement (sinon un client modifié figeait la partie à l'infini)
    if (netPause && netPause.active) return;
    game.foePauses = (game.foePauses||0) + 1;
    if (game.foePauses > PAUSE_MAX_FOE){ pauseSend('no'); return; }
    netPause = {active:true, byMe:false, timer:PAUSE_WINDOW, voting:false};
    paused = true; announce(t('np_paused_foe'), '#e8d8a0');
  } else if (d.act==='yes'){       // l'adversaire a accepté de prolonger
    if (netPause && netPause.byMe && netPause.voting){ netPause.voting=false; netPause.timer=PAUSE_WINDOW; }
    onlineVoteRects=null;
  } else if ((d.act==='no' || d.act==='end') && netPause){
    onlineVoteRects=null; netPause=null; paused=false; settingsOpen=false;
    if (!game.over) announce(t('np_resumed'), '#9dc88a');
  }
}
// décompte indépendant de update() : il doit tourner MÊME en pause (appelé depuis loop)
function tickNetPause(dt){
  if (!netPause || !netPause.active || netPause.voting) return;
  netPause.timer -= dt;
  if (netPause.timer<=0){
    netPause.timer=0; netPause.voting=true;
    // à l'expiration : l'adversaire (celui qui n'a pas demandé) doit voter ; le demandeur patiente
  }
}
function castPauseVote(ok){
  if (!netPause || !netPause.voting || netPause.byMe) return;
  pauseSend(ok? 'yes':'no');
  onlineVoteRects=null;
  if (ok){ netPause.voting=false; netPause.timer=PAUSE_WINDOW; }
  else { netPause=null; paused=false; settingsOpen=false; if (!game.over) announce(t('np_resumed'), '#9dc88a'); }
}
// écran vu par l'adversaire du demandeur (négociation + vote de prolongation)
// VOILE LÉGER : l'adversaire peut lui aussi observer la carte pendant la pause
// (correctif v1.5 — avant, il avait un écran opaque alors que le demandeur voyait le terrain).
function drawOnlinePause(){
  ctx.fillStyle='rgba(8,6,7,0.30)'; ctx.fillRect(0,0,W,H);
  const pal = uiPal();
  ctx.textAlign='center'; ctx.textBaseline='middle';
  if (!netPause.voting){
    // bandeau compact en haut (papier) : décompte visible sans masquer le champ de bataille
    const bw=300, bh=62, bx=W/2-bw/2, by=46;
    paperPanel(bx, by, bw, bh, pal, {tape:true});
    ctx.fillStyle=pal.ink;
    const foeTxt = t('np_paused_foe');
    fitFont(foeTxt, bw-24, uiF(pal,'type',13), 9);
    ctx.fillText(foeTxt, W/2, by+19);
    ctx.fillStyle=pal.red;
    const secTxt = Math.ceil(netPause.timer)+t('unit_sec');
    fitFont(secTxt, bw-24, uiF(pal,'head',26), 16);
    ctx.fillText(secTxt, W/2, by+44);
    onlineVoteRects=null;
  } else {
    // vote de prolongation : on assombrit pour attirer l'attention sur le choix
    ctx.fillStyle='rgba(10,8,7,0.5)'; ctx.fillRect(0,0,W,H);
    const bw=360, bh=128, bx=W/2-bw/2, by=H/2-bh/2;
    paperPanel(bx, by, bw, bh, pal, {tape:true});
    ctx.fillStyle=pal.ink;
    fitFont(t('np_ask'), bw-30, uiF(pal,'type',14), 9);
    ctx.fillText(t('np_ask'), W/2, by+34);
    const w=130, h=40, yes={x:W/2-w-12, y:by+66, w, h, ok:true}, no={x:W/2+12, y:by+66, w, h, ok:false};
    inkStamp(yes.x, yes.y, yes.w, yes.h, t('yes'), pal, 17);
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle=pal.ink2;
    fitFont(t('no'), w-16, uiF(pal,'type',15), 10);
    const nw = ctx.measureText(t('no')).width; ctx.fillText(t('no'), no.x+w/2, no.y+h/2); ctx.fillRect(no.x+w/2-nw/2, no.y+h/2+9, nw, 1);
    onlineVoteRects=[yes,no];
  }
}
// bandeau d'état pour le DEMANDEUR (par-dessus son menu de réglages)
function drawOnlinePauseInfo(){
  ctx.textAlign='center';
  const txt = netPause.voting? t('np_wait') : (Math.ceil(netPause.timer)+t('unit_sec')+' · '+t('np_paused_you'));
  ctx.fillStyle='#e8a06a';
  fitFont(txt, W-40, '600 13px '+UI_COND, 9.5);
  ctx.fillText(txt, W/2, 24);
}
// point d'entrée unique : un appui sur « pause » selon le contexte (solo / en ligne)
// ⚙ — ouvre le menu de réglages (gèle aussi la partie le temps qu'il est ouvert)
function togglePauseAction(){
  if (buildMenu){ buildMenu=null; return; }
  if (isOnline()){
    // ⚙ EN LIGNE : ouvre/ferme uniquement les RÉGLAGES, SANS imposer de pause au jeu.
    // (la pause se demande via ⏸ et se négocie avec l'adversaire). Accessible même
    // pendant une pause négociée — on peut donc régler le son/qualité en pleine partie.
    settingsOpen = !settingsOpen;
  } else {
    // SOLO : ⚙ et ⏸ restent redondants (les deux figent la partie), comme avant.
    settingsOpen = !settingsOpen;
    paused = settingsOpen;
  }
}
// ⏸ — pause simple : fige la partie SANS masquer le champ de bataille (pour observer la situation)
function toggleSoftPause(){
  if (!game || game.over) return;
  if (buildMenu) buildMenu=null;
  if (isOnline()){                       // en ligne : pause négociée (le terrain reste visible des deux côtés)
    if (!paused) onlinePauseRequest();
    else if (netPause && netPause.byMe) endOnlinePause(true);
    return;
  }
  settingsOpen = false;
  paused = !paused;
}
/* ---- transport en ligne (PeerJS : broker cloud gratuit + WebRTC, TURN inclus) ----
   Architecture : l'hôte enregistre l'identifiant « agi-<CODE> » auprès du broker public
   PeerJS ; l'invité s'y connecte directement par cet identifiant — le code EST l'adresse,
   rien à échanger. Aucun serveur à gérer. Un seul canal de données fiable transporte tous
   les messages typés {t, d}. STUN+TURN permettent la traversée des NAT (4G/5G inclus). */
const NET_PROTO = 2;   // VERSION DU PROTOCOLE RÉSEAU — à incrémenter à CHAQUE changement
                       // incompatible (sérialisation, messages…). Bloque les versions mêlées.
/* ╔══════════════════════════════════════════════════════════════════════════╗
   ║  CONFIG RÉSEAU — À RENSEIGNER (sinon repli automatique, le jeu marche      ║
   ║  quand même : TURN public + pas de liste de salons publics).              ║
   ║                                                                            ║
   ║  • Firebase Realtime DB (liste des salons publics) : colle l'URL de ta    ║
   ║    base, ex. "https://mon-projet-default-rtdb.firebaseio.com". Mets les    ║
   ║    règles en lecture/écriture publiques (voir README).                     ║
   ║  • Cloudflare TURN (relais dédié, fiable en 4G↔4G) : Key ID + API token   ║
   ║    depuis le dashboard Cloudflare (Realtime / TURN).                       ║
   ╚══════════════════════════════════════════════════════════════════════════╝ */
const NET_CONFIG = {
  firebaseDb:   "https://agi-lobbies-default-rtdb.europe-west1.firebasedatabase.app",   // liste des salons publics
  cfTurnProxy:  "https://turn-proxy.dimdevche.workers.dev",   // Worker proxy : garde le token TURN secret côté serveur
  cfTurnKeyId:  "",   // (vide) — le proxy gère l'authentification ; aucun secret dans la page
  cfTurnToken:  "",   // (vide) — le token reste dans les secrets du Worker, jamais exposé
};
let peerObj = null;
// empreinte de peerjs 1.5.4 : un replis CDN altéré est REFUSÉ par le navigateur (SRI)
const PEERJS_SRI = 'sha384-nlUQ8ZqCbvStErob+biJNzSgltf6urV3VGqhfIfzhmg9RXmpeRm76ELw0pYnKlTR';
function loadScriptOnce(src, ms, integrity){
  return new Promise((res, rej)=>{
    const s = document.createElement('script'); s.src = src; s.async = true;
    if (integrity){ s.integrity = integrity; s.crossOrigin = 'anonymous'; }
    const to = setTimeout(()=>{ s.onload=s.onerror=null; rej(new Error('timeout')); }, ms);
    s.onload  = ()=>{ clearTimeout(to); res(); };
    s.onerror = ()=>{ clearTimeout(to); s.remove(); rej(new Error('load error')); };
    document.head.appendChild(s);
  });
}
async function loadPeerLib(){
  if (window.Peer) return window.Peer;
  const sources = [
    './peerjs.min.js',                                              // auto-hébergé (même origine) : fiable, instantané
    'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js', // replis CDN
    'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
  ];
  for (const src of sources){
    // SRI partout où le navigateur sait la vérifier : CDN, et copie auto-hébergée servie en
    // http(s) (le service worker la met en cache : une copie altérée serait refusée). Sur file://
    // (appli PC) le fichier fait partie du paquet installé et la vérification n'y est pas possible.
    const sri = (/^https:/.test(src) || /^https?:$/.test(location.protocol))? PEERJS_SRI : null;
    try { await loadScriptOnce(src, 9000, sri); if (window.Peer) return window.Peer; } catch(e){}
  }
  return null;
}
const STUN = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
// repli TURN public gratuit (peut saturer) — utilisé si Cloudflare n'est pas configuré
const OPENRELAY = [
  { urls: 'turn:openrelay.metered.ca:80',  username:'openrelayproject', credential:'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username:'openrelayproject', credential:'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username:'openrelayproject', credential:'openrelayproject' },
];
let cfIceCache = null;  // {servers, exp} — crédentiels Cloudflare mis en cache jusqu'à expiration
// renvoie la config ICE : STUN + (Cloudflare TURN dédié si configuré, sinon OpenRelay public)
async function getIceServers(){
  // Proxy Worker (recommandé : token secret côté serveur) sinon appel direct avec token.
  const useProxy = !!NET_CONFIG.cfTurnProxy;
  if (useProxy || (NET_CONFIG.cfTurnKeyId && NET_CONFIG.cfTurnToken)){
    try {
      if (cfIceCache && cfIceCache.exp > performance.now()) return { iceServers: cfIceCache.servers };
      const url = useProxy
        ? NET_CONFIG.cfTurnProxy
        : 'https://rtc.live.cloudflare.com/v1/turn/keys/'+encodeURIComponent(NET_CONFIG.cfTurnKeyId)+'/credentials/generate-ice-servers';
      const headers = useProxy
        ? { 'Content-Type':'application/json' }   // pas de token côté client avec le proxy
        : { 'Authorization':'Bearer '+NET_CONFIG.cfTurnToken, 'Content-Type':'application/json' };
      const r = await fetch(url, { method:'POST', headers, body: JSON.stringify({ ttl: 7200 }),
        signal: (window.AbortSignal && AbortSignal.timeout)? AbortSignal.timeout(6000) : undefined });   // proxy muet : repli au bout de 6 s
      if (r.ok){
        const j = await r.json();
        const turn = (j.iceServers ? (Array.isArray(j.iceServers)? j.iceServers : [j.iceServers]) : []);
        const okTurn = turn.filter(s => s && typeof s==='object' && s.urls);
        if (okTurn.length){                                       // réponse sans TURN : pas de cache, repli public
          const servers = STUN.concat(okTurn);
          cfIceCache = { servers, exp: performance.now() + 6600*1000 };   // identifiants valables 2 h : on renouvelle avant
          return { iceServers: servers };
        }
      }
    } catch(e){ /* échec Cloudflare → repli public ci-dessous */ }
  }
  return { iceServers: STUN.concat(OPENRELAY) };
}
function nsend(t, d){ try { if (net && net.conn && net.conn.open) net.conn.send({t, d}); } catch(e){} }
function versionFail(){
  netStatus(tr('net_vermismatch'));
  try { iosHint('Versions différentes — rechargez le jeu des deux côtés.'); } catch(e){}
  setTimeout(netDisconnect, 50);
}
// SÉCURITÉ : tout message du pair est NON FIABLE (client modifié possible). Corps toujours objet,
// camps limités à HUM/IA, file de commandes plafonnée, mot de passe protégé contre la force brute.
const facOk = f => f==='HUM' || f==='IA';
const PW_MAX_FAILS = 6, PW_LOCK_S = 60;
function nrecv(msg){
  if (!msg || typeof msg!=='object' || !net) return;
  const t = msg.t, d = (msg.d && typeof msg.d==='object')? msg.d : {};
  try {
  if (t==='st'){ if (net.role==='guest') onSnapshot(d); }
  else if (t==='cm'){ if (net.role==='host' && net.authed && net.cmdQ.length < 64) net.cmdQ.push(d); }
  else if (t==='hi'){                                   // l'hôte reçoit le bonjour de l'invité (version + mot de passe)
    if (net.role==='host' && !game){
      if (d.v !== NET_PROTO){ nsend('ko', {v:NET_PROTO}); return; }   // v1.13 : le salon de l'hôte survit à un invité de mauvaise version
      const now = performance.now()/1000;
      if (net.pw){
        // anti-force-brute : après PW_MAX_FAILS échecs, plus aucun essai accepté pendant PW_LOCK_S
        if (net.pwLockUntil && now < net.pwLockUntil){ nsend('pwko', {}); return; }
        if (String(d.pw||'') !== net.pw){
          net.pwFails = (net.pwFails||0) + 1;
          if (net.pwFails >= PW_MAX_FAILS){ net.pwFails = 0; net.pwLockUntil = now + PW_LOCK_S; }
          nsend('pwko', {}); netStatus(tr('net_badpw_wait'));
          try { if (net.conn) setTimeout(()=>{ try { net && net.conn && net.conn.close(); } catch(e){} }, 300); } catch(e){}
          return;
        }
      }
      net.pwFails = 0; net.authed = true;
      net.foeFac = facOk(d.fac)? d.fac : (net.myFac==='HUM'? 'IA':'HUM');   // faction initiale de l'invité
      net.sendLok({ v:NET_PROTO, hostFac:net.myFac, speed:net.speed });  // confirme + partage la faction de l'hôte
      enterLobby();                                      // → écran de lobby commun (choix des camps)
    }
  }
  else if (t==='lok'){                                  // l'invité reçoit la confirmation de l'hôte → lobby
    if (net.role==='guest' && !game){
      if (d.v !== NET_PROTO){ versionFail(); return; }
      net.authed = true;
      net.foeFac = facOk(d.hostFac)? d.hostFac : null;
      if (d.speed) net.speed = clampSpeed(d.speed);
      enterLobby();
    }
  }
  else if (t==='lf'){                                   // l'autre joueur a changé de camp dans le lobby
    if (net && net.authed && !game && facOk(d.fac)){ net.foeFac = d.fac; refreshLobbyView(); }
  }
  else if (t==='go'){                                   // l'invité reçoit le départ de l'hôte (avec sa version)
    if (net.role==='guest' && net.authed && !game){
      if (d.v !== NET_PROTO){ versionFail(); return; }
      if (!facOk(d.guestFac) || !facOk(d.hostFac)) return;
      startGuestGame(d);
    }
  }
  else if (t==='ko'){ if (net.role==='guest' && !game) versionFail(); }                  // l'autre côté a refusé pour cause de version
  else if (t==='pwko'){ if (net.role==='guest') netBadPw(); }   // mot de passe refusé par l'hôte
  else if (t==='pz'){ if (net.authed) onPauseMsg(d); }
  else if (t==='sp'){ if (net.authed) onSpeedMsg(d); }  // vote de changement de vitesse
  } catch(err){ console.error('nrecv', err); }
}
function netBadPw(){ netStatus(t('net_badpw')); setTimeout(netDisconnect, 50); }
function bindConn(conn){
  net.conn = conn; net.authed = false;
  conn.on('open', ()=>{
    if (!net || net.conn!==conn) return;
    if (net.findTimer){ clearTimeout(net.findTimer); net.findTimer=null; }
    net.peer = true;
    if (net.role==='guest'){ netStatus(tr('net_found')); net.sendHello({fac:net.myFac, v:NET_PROTO, pw:net.pw||''}); }
    else netStatus(tr('net_peer_conn'));
  });
  // seuls les messages de la connexion COURANTE comptent (une connexion remplacée ne parle plus)
  conn.on('data', msg=>{ if (net && net.conn===conn) nrecv(msg); });
  conn.on('close', ()=>{ if (!net || net.conn!==conn) return;
    const was = net.authed; net.peer=false; net.authed=false;
    if (was || game) onPeerLeft();
    else if (net.role==='guest') netStatus(fmt('net_nohost2',{code:net.code})); });   // refusé (salon plein, mauvais mot de passe)
  conn.on('error', ()=>{});
}
async function netConnect(role, code, fac, opts){
  opts = opts || {};
  netStatus(t('net_loading'));
  const tok = netConnect._tok = (netConnect._tok||0)+1;   // pris AVANT tout await : Annuler ou un double clic l'invalident
  const Peer = await loadPeerLib();
  if (tok !== netConnect._tok) return;
  if (!Peer){ netStatus(tr('net_nop2p')); return; }
  netTeardown();                                          // repart propre si une tentative précédente traîne
  const RTC = await getIceServers();                      // STUN + TURN (Cloudflare dédié ou repli public)
  if (tok !== netConnect._tok) return;
  netTeardown();
  const hostId = 'agi-' + code;
  const myId   = role==='host' ? hostId : (hostId + '-g' + Math.random().toString(36).slice(2,8));
  net = { role, code, myFac:fac, foeFac:(fac==='HUM'?'IA':'HUM'), speed:clampSpeed(opts.speed||menuSpeed),
          pw:(opts.pw||''), name:(opts.name||''), pub:!!opts.pub,
          peer:false, cmdQ:[], ev:[], acc:0, conn:null, tries:0,
          sendState:o=>nsend('st',o), sendCmd:o=>nsend('cm',o),
          sendHello:o=>nsend('hi',o), sendStart:o=>nsend('go',o), sendPause:o=>nsend('pz',o),
          sendSpeed:o=>nsend('sp',o), sendLok:o=>nsend('lok',o), sendLF:o=>nsend('lf',o) };
  const my = net;                                         // session courante : les rappels d'une session annulée s'ignorent
  try { peerObj = new Peer(myId, { config: RTC, debug: 1 }); }
  catch(err){ netStatus(tr('net_initfail')); return; }
  const tryConnect = ()=>{
    if (net!==my || !peerObj || peerObj.destroyed) return;
    const conn = peerObj.connect(hostId, { reliable:true });
    if (conn) bindConn(conn);
  };
  peerObj.on('open', ()=>{
    // PeerJS ré-émet 'open' après reconnect() : sans cette garde, l'invité rouvrait une connexion en
    // pleine partie (et se faisait éjecter), l'hôte empilait un second minuteur de publication
    if (net!==my || game || my.peer || my.authed) return;
    if (role==='host'){
      showHostingCode(code);                              // affiche le code à partager
      netStatus(t('net_waiting'));
      if (my.pub){ lobbyPublish(); if (my.hbTimer) clearInterval(my.hbTimer); my.hbTimer = setInterval(lobbyPublish, 20000); } // heartbeat liste publique
    } else { netStatus(fmt('net_search',{code:code})); tryConnect(); }
  });
  // invité entrant côté hôte. VERROU : une fois un invité authentifié (bon mot de passe, lobby ou
  // partie en cours), toute autre connexion est refusée — avant, n'importe qui connaissant le code
  // (liste publique) remplaçait l'adversaire, même en pleine partie, et pilotait son armée.
  peerObj.on('connection', conn=>{
    if (role!=='host') { try { conn.close(); } catch(e){} return; }
    if (net && net.conn && net.authed && net.peer){ conn.on('open', ()=>{ try { conn.close(); } catch(e){} }); return; }
    if (net && net.conn && net.conn!==conn){ try { net.conn.close(); } catch(e){} }   // tentative non authentifiée remplacée
    bindConn(conn);
  });
  peerObj.on('error', err=>{
    const ty = err && err.type;
    if (ty==='unavailable-id'){
      netStatus(tr('net_codetaken'));
    } else if (ty==='peer-unavailable'){
      // course possible : l'invité arrive avant que l'hôte soit enregistré → on retente
      if (role==='guest' && net && (net.tries = (net.tries||0)+1) <= 6 && !net.peer){
        netStatus(fmt('net_retry',{n:net.tries}));
        setTimeout(()=>{ if (net===my && !net.peer) tryConnect(); }, 2500);
      } else {
        netStatus(fmt('net_nohost',{code:code}));
      }
    } else if (ty==='network' || ty==='server-error' || ty==='socket-error' || ty==='socket-closed'){
      netStatus(tr('net_relayerr'));
    } else if (ty==='browser-incompatible'){
      netStatus(tr('net_nowebrtc'));
    } else {
      netStatus(fmt('net_err',{t:(ty?' ('+ty+')':'')}));
    }
  });
  peerObj.on('disconnected', ()=>{ try { peerObj.reconnect(); } catch(e){} });
  // sans adversaire au bout de ~35 s, on guide plutôt que de laisser attendre dans le vide
  net.findTimer = setTimeout(()=>{
    if (net && !net.peer) netStatus(fmt(role==='host'? 'net_stillwait':'net_nohost2', {code:code}));
  }, 35000);
}
function netDisconnect(){ netConnect._tok = (netConnect._tok||0)+1; netTeardown(); }   // invalide aussi une connexion en cours de préparation
function netTeardown(){
  speedVote = null; speedPanel = null; clearSpeedPending();  // annule tout vote/minuteur de vitesse en cours
  if (net){
    if (net.findTimer) clearTimeout(net.findTimer);
    if (net.hbTimer) clearInterval(net.hbTimer);
    if (net.pub && net.code && net.listed) lobbyRemove(net.code);     // retire NOTRE salon de la liste publique (jamais celui d'un homonyme)
  }
  try { if (net && net.conn) net.conn.close(); } catch(e){}
  try { if (peerObj) peerObj.destroy(); } catch(e){}
  peerObj = null; net = null;
}

/* ---- liste des salons publics via Firebase Realtime DB (API REST, sans SDK) ---- */
function fbUrl(path){ return NET_CONFIG.firebaseDb.replace(/\/+$/,'') + path + '.json'; }
function lobbyPublish(){
  if (!NET_CONFIG.firebaseDb || !net || !net.pub || net.authed) return;   // salon occupé : l'entrée expire d'elle-même en 60 s
  net.listed = true;
  const body = JSON.stringify({ code:net.code, name:(net.name||('Salon '+net.code)), fac:net.myFac,
                                speed:net.speed, hasPw:!!net.pw, ts:{'.sv':'timestamp'} });   // heure du SERVEUR (horloges des téléphones souvent fausses)
  fetch(fbUrl('/lobbies/'+net.code), { method:'PUT', body }).catch(()=>{});
}
// onglet fermé / appli tuée : on retire le salon tout de suite (keepalive : la requête survit à la page)
window.addEventListener('pagehide', ()=>{ try { if (net && net.pub && net.listed && net.code && NET_CONFIG.firebaseDb)
  fetch(fbUrl('/lobbies/'+net.code), { method:'DELETE', keepalive:true }); } catch(e){} });
function lobbyRemove(code){
  if (!NET_CONFIG.firebaseDb || !code) return;
  fetch(fbUrl('/lobbies/'+code), { method:'DELETE' }).catch(()=>{});
}
function lobbyClean(l){
  if (!l || typeof l!=='object') return null;
  const code = String(l.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
  if (!code) return null;
  return { code, name: typeof l.name==='string'? l.name.slice(0,40) : '', fac: l.fac==='IA'? 'IA' : 'HUM',
           speed: SPEEDS.includes(+l.speed)? +l.speed : 1, hasPw: l.hasPw===true, ts: Number.isFinite(+l.ts)? +l.ts : 0 };
}
const lobbySeen = Object.create(null);   // code → { ts, at, first } : dernière évolution observée de l'horodatage (temps monotone)
async function lobbyList(){
  if (!NET_CONFIG.firebaseDb) return [];
  try {
    // lecture BORNÉE (50 salons les plus récents) : les règles Firebase conseillées (README)
    // n'autorisent plus que cette requête — une base remplie de salons bidons ne peut plus
    // faire télécharger des mégaoctets à chaque joueur. Repli sur la lecture simple tant que
    // les anciennes règles (sans index « ts ») sont en place.
    let r = await fetch(fbUrl('/lobbies')+'?orderBy=%22ts%22&limitToLast=50', { cache:'no-store' });
    if (!r.ok) r = await fetch(fbUrl('/lobbies'), { cache:'no-store' });
    if (!r.ok) return [];
    const j = (await r.json()) || {};
    // FRAÎCHEUR SANS HORLOGE LOCALE : les « ts » sont posés par le serveur. Si l'horloge de l'appareil
    // concorde avec le plus récent, on s'y fie (affichage immédiat) ; sinon (téléphone mal réglé) un
    // salon est vivant dès qu'on a VU son horodatage changer — l'hôte republie toutes les 20 s —,
    // mesuré en temps monotone. Avant, un appareil décalé de plus d'une minute ne voyait aucun salon.
    const loc = Date.now(), mono = performance.now();
    let tsMax = 0; for (const v of Object.values(j)) if (v && Number.isFinite(+v.ts) && +v.ts > tsMax && +v.ts < loc + 600000) tsMax = +v.ts;   // une entrée « du futur » ne sert jamais de référence
    const clockOk = tsMax>0 && Math.abs(loc - tsMax) < 90000;
    for (const v of Object.values(j)){ if (!v || !v.code) continue; const k = String(v.code), s = lobbySeen[k];
      if (!s) lobbySeen[k] = { ts:+v.ts, at:-1e12, first:mono };
      else if (s.ts!==+v.ts){ s.ts = +v.ts; s.at = mono; } }
    for (const k in lobbySeen) if (!Object.values(j).some(v => v && String(v.code)===k)) delete lobbySeen[k];
    const alive = l => (clockOk && Math.abs(loc - l.ts) < 60000) || (lobbySeen[l.code] && mono - lobbySeen[l.code].at < 60000);
    // AUTO-NETTOYAGE : un salon dont l'appli a été tuée ou a planté ne passe jamais par
    // lobbyRemove() — son entrée (nom saisi compris) restait stockée indéfiniment. Chaque
    // consultation de la liste supprime donc les entrées mortes depuis plus de 5 min (l'hôte
    // vivant republie toutes les 20 s, aucun risque d'effacer un salon actif). Plafonné à
    // quelques suppressions par appel pour ne pas bombarder la base.
    let purged = 0;
    for (const [k, l] of Object.entries(j)){
      if (purged >= 5) break;
      // mort = plus de 5 min de retard sur l'entrée la plus récente (heures serveur comparées entre
      // elles), ou observé figé pendant 5 min — jamais « vieux d'après l'horloge de ce téléphone »
      const s = l && l.code && lobbySeen[String(l.code)];
      if (!l || !l.code || tsMax - (+l.ts||0) > 300000 || (s && s.at<0 && mono - s.first > 300000)){ purged++;
        fetch(fbUrl('/lobbies/'+encodeURIComponent(k)), { method:'DELETE' }).catch(()=>{}); }
    }
    // SÉCURITÉ : la base est publique en écriture — chaque champ est revalidé ici (type,
    // longueur, liste blanche) ; plus rien de brut n'atteint l'affichage (faille XSS stockée
    // possible auparavant via le champ « speed », inséré tel quel dans le HTML de la liste).
    return Object.values(j).map(lobbyClean).filter(l => l && alive(l))               // ignore les périmés (>60 s)
                           .sort((a,b)=> b.ts-a.ts);
  } catch(e){ return []; }
}
