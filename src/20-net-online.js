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
function onPauseMsg(d){
  if (!game || game.over) return;
  if (d.act==='req'){
    netPause = {active:true, byMe:false, timer:PAUSE_WINDOW, voting:false};
    paused = true; announce(t('np_paused_foe'), '#e8d8a0');
  } else if (d.act==='yes'){       // l'adversaire a accepté de prolonger
    if (netPause){ netPause.voting=false; netPause.timer=PAUSE_WINDOW; }
    onlineVoteRects=null;
  } else if (d.act==='no' || d.act==='end'){
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
  ctx.textAlign='center';
  if (!netPause.voting){
    // bandeau compact en haut : décompte visible sans masquer le champ de bataille
    const bw=300, bh=58, bx=W/2-bw/2, by=46;
    ctx.fillStyle='rgba(16,13,12,0.9)'; rr(bx,by,bw,bh,8); ctx.fill();
    ctx.strokeStyle='#e8a06a'; ctx.lineWidth=1.4; rr(bx,by,bw,bh,8); ctx.stroke();
    ctx.font='700 15px Arial'; ctx.fillStyle='#e8e0d2';
    ctx.fillText('⏸  '+t('np_paused_foe'), W/2, by+22);
    ctx.font='700 24px Arial'; ctx.fillStyle='#e8a06a';
    ctx.fillText(Math.ceil(netPause.timer)+'s', W/2, by+44);
    onlineVoteRects=null;
  } else {
    // vote de prolongation : on assombrit pour attirer l'attention sur le choix
    ctx.fillStyle='rgba(10,8,7,0.55)'; ctx.fillRect(0,0,W,H);
    ctx.font='16px Arial'; ctx.fillStyle='#b8b0a4';
    ctx.fillText(t('np_ask'), W/2, H/2-20);
    const bw=130, bh=46, gap=24, y=H/2+10;
    const yes={x:W/2-bw-gap/2, y, w:bw, h:bh, ok:true};
    const no ={x:W/2+gap/2,    y, w:bw, h:bh, ok:false};
    for (const b of [yes,no]){
      ctx.fillStyle = b.ok? '#1c3a18':'#3c100c'; rr(b.x,b.y,b.w,b.h,5); ctx.fill();
      ctx.strokeStyle = b.ok? '#5aa84a':'#d8483a'; ctx.lineWidth=1; rr(b.x,b.y,b.w,b.h,5); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font='700 18px Arial';
      ctx.fillText(b.ok? t('yes'):t('no'), b.x+b.w/2, b.y+b.h/2+1);
    }
    onlineVoteRects=[yes,no];
  }
}
// bandeau d'état pour le DEMANDEUR (par-dessus son menu de réglages)
function drawOnlinePauseInfo(){
  ctx.textAlign='center';
  const txt = netPause.voting? t('np_wait') : (Math.ceil(netPause.timer)+'s · '+t('np_paused_you'));
  ctx.font='600 13px Arial'; ctx.fillStyle='#e8a06a';
  ctx.fillText(txt, W/2, 24);
}
// point d'entrée unique : un appui sur « pause » selon le contexte (solo / en ligne)
// ⚙ — ouvre le menu de réglages (gèle aussi la partie le temps qu'il est ouvert)
function togglePauseAction(){
  if (tutoStep>=0) return;
  if (game && game.tut) return;   // tutoriel : pas de pause manuelle — le gel est géré par TUT.frozen
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
  if (tutoStep>=0 || !game || game.over || game.tut) return;
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
function loadScriptOnce(src, ms){
  return new Promise((res, rej)=>{
    const s = document.createElement('script'); s.src = src; s.async = true;
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
    try { await loadScriptOnce(src, 9000); if (window.Peer) return window.Peer; } catch(e){}
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
      if (cfIceCache && cfIceCache.exp > Date.now()) return { iceServers: cfIceCache.servers };
      const url = useProxy
        ? NET_CONFIG.cfTurnProxy
        : 'https://rtc.live.cloudflare.com/v1/turn/keys/'+encodeURIComponent(NET_CONFIG.cfTurnKeyId)+'/credentials/generate-ice-servers';
      const headers = useProxy
        ? { 'Content-Type':'application/json' }   // pas de token côté client avec le proxy
        : { 'Authorization':'Bearer '+NET_CONFIG.cfTurnToken, 'Content-Type':'application/json' };
      const r = await fetch(url, { method:'POST', headers, body: JSON.stringify({ ttl: 86400 }) });
      if (r.ok){
        const j = await r.json();
        const turn = (j.iceServers ? (Array.isArray(j.iceServers)? j.iceServers : [j.iceServers]) : []);
        const servers = STUN.concat(turn);
        cfIceCache = { servers, exp: Date.now() + 80000*1000 };  // ~22 h
        return { iceServers: servers };
      }
    } catch(e){ /* échec Cloudflare → repli public ci-dessous */ }
  }
  return { iceServers: STUN.concat(OPENRELAY) };
}
function nsend(t, d){ try { if (net && net.conn && net.conn.open) net.conn.send({t, d}); } catch(e){} }
function versionFail(){
  netStatus('⚠ Versions différentes : METTEZ À JOUR le jeu des deux côtés (rechargez la page), puis réessayez.');
  try { iosHint('Versions différentes — rechargez le jeu des deux côtés.'); } catch(e){}
  setTimeout(netDisconnect, 50);
}
function nrecv(msg){
  if (!msg || !net) return;
  const t = msg.t, d = msg.d;
  if (t==='st'){ if (net.role==='guest') onSnapshot(d); }
  else if (t==='cm'){ if (net.role==='host') net.cmdQ.push(d); }
  else if (t==='hi'){                                   // l'hôte reçoit le bonjour de l'invité (version + mot de passe)
    if (net.role==='host' && !game){
      if (d.v !== NET_PROTO){ nsend('ko', {v:NET_PROTO}); versionFail(); return; }
      if (net.pw && (d.pw||'') !== net.pw){ nsend('pwko', {}); netStatus('Tentative avec un mot de passe incorrect — toujours en attente.'); return; }
      net.foeFac = d.fac;                                // faction initiale de l'invité
      net.sendLok({ v:NET_PROTO, hostFac:net.myFac, speed:net.speed });  // confirme + partage la faction de l'hôte
      enterLobby();                                      // → écran de lobby commun (choix des camps)
    }
  }
  else if (t==='lok'){                                  // l'invité reçoit la confirmation de l'hôte → lobby
    if (net.role==='guest' && !game){
      if (d.v !== NET_PROTO){ versionFail(); return; }
      net.foeFac = d.hostFac;
      if (d.speed) net.speed = clampSpeed(d.speed);
      enterLobby();
    }
  }
  else if (t==='lf'){                                   // l'autre joueur a changé de camp dans le lobby
    if (net && !game){ net.foeFac = d.fac; refreshLobbyView(); }
  }
  else if (t==='go'){                                   // l'invité reçoit le départ de l'hôte (avec sa version)
    if (net.role==='guest' && !game){
      if (d.v !== NET_PROTO){ versionFail(); return; }
      startGuestGame(d);
    }
  }
  else if (t==='ko'){ versionFail(); }                  // l'autre côté a refusé pour cause de version
  else if (t==='pwko'){ netBadPw(); }                   // mot de passe refusé par l'hôte
  else if (t==='pz'){ onPauseMsg(d); }
  else if (t==='sp'){ onSpeedMsg(d); }                  // vote de changement de vitesse
}
function netBadPw(){ netStatus(t('net_badpw')); setTimeout(netDisconnect, 50); }
function bindConn(conn){
  net.conn = conn;
  conn.on('open', ()=>{
    if (net.findTimer){ clearTimeout(net.findTimer); net.findTimer=null; }
    net.peer = true; net.peerId = conn.peer;
    if (net.role==='guest'){ netStatus('Hôte trouvé — connexion…'); net.sendHello({fac:net.myFac, v:NET_PROTO, pw:net.pw||''}); }
    else netStatus('Adversaire connecté !');
  });
  conn.on('data', nrecv);
  conn.on('close', ()=>{ if (net){ net.peer=false; } onPeerLeft(); });
  conn.on('error', ()=>{});
}
async function netConnect(role, code, fac, opts){
  opts = opts || {};
  netStatus(t('net_loading'));
  const Peer = await loadPeerLib();
  if (!Peer){ netStatus('⚠ Réseau P2P inaccessible (connexion ? pare-feu ?). Réessayez.'); return; }
  netDisconnect();                                        // repart propre si une tentative précédente traîne
  const RTC = await getIceServers();                      // STUN + TURN (Cloudflare dédié ou repli public)
  const hostId = 'agi-' + code;
  const myId   = role==='host' ? hostId : (hostId + '-g' + Math.random().toString(36).slice(2,8));
  net = { role, code, myFac:fac, foeFac:(fac==='HUM'?'IA':'HUM'), speed:clampSpeed(opts.speed||menuSpeed),
          pw:(opts.pw||''), name:(opts.name||''), pub:!!opts.pub,
          peer:false, cmdQ:[], ev:[], acc:0, conn:null, tries:0,
          sendState:o=>nsend('st',o), sendCmd:o=>nsend('cm',o),
          sendHello:o=>nsend('hi',o), sendStart:o=>nsend('go',o), sendPause:o=>nsend('pz',o),
          sendSpeed:o=>nsend('sp',o), sendLok:o=>nsend('lok',o), sendLF:o=>nsend('lf',o) };
  try { peerObj = new Peer(myId, { config: RTC, debug: 1 }); }
  catch(err){ netStatus('⚠ Impossible d\'initialiser le réseau.'); return; }
  const tryConnect = ()=>{
    if (!peerObj || peerObj.destroyed) return;
    const conn = peerObj.connect(hostId, { reliable:true });
    if (conn) bindConn(conn);
  };
  peerObj.on('open', ()=>{
    if (role==='host'){
      showHostingCode(code);                              // affiche le code à partager
      netStatus(t('net_waiting'));
      if (net && net.pub){ lobbyPublish(); net.hbTimer = setInterval(lobbyPublish, 20000); } // heartbeat liste publique
    } else { netStatus('Recherche du salon « '+code+' »…'); tryConnect(); }
  });
  peerObj.on('connection', conn=>{ if (role==='host') bindConn(conn); });   // invité entrant côté hôte
  peerObj.on('error', err=>{
    const ty = err && err.type;
    if (ty==='unavailable-id'){
      netStatus('⚠ Ce code est déjà pris. Choisissez-en un autre pour créer le salon.');
    } else if (ty==='peer-unavailable'){
      // course possible : l'invité arrive avant que l'hôte soit enregistré → on retente
      if (role==='guest' && net && (net.tries = (net.tries||0)+1) <= 6 && !net.peer){
        netStatus('Salon pas encore prêt… nouvelle tentative ('+net.tries+'/6)…');
        setTimeout(()=>{ if (net && !net.peer) tryConnect(); }, 2500);
      } else {
        netStatus('Aucun hôte pour « '+code+' ». Vérifiez le code (l\'hôte doit avoir créé le salon), puis réessayez.');
      }
    } else if (ty==='network' || ty==='server-error' || ty==='socket-error' || ty==='socket-closed'){
      netStatus('⚠ Serveur de mise en relation momentanément injoignable. Réessayez dans un instant.');
    } else if (ty==='browser-incompatible'){
      netStatus('⚠ Ce navigateur ne supporte pas le P2P (WebRTC).');
    } else {
      netStatus('⚠ Erreur réseau'+(ty?' ('+ty+')':'')+'. Réessayez.');
    }
  });
  peerObj.on('disconnected', ()=>{ try { peerObj.reconnect(); } catch(e){} });
  // sans adversaire au bout de ~35 s, on guide plutôt que de laisser attendre dans le vide
  net.findTimer = setTimeout(()=>{
    if (net && !net.peer) netStatus(role==='host'
      ? 'Toujours en attente… l\'adversaire doit saisir EXACTEMENT le code « '+code+' ».'
      : 'Aucun hôte pour « '+code+' ». Vérifiez le code, ou demandez à l\'hôte de recréer le salon.');
  }, 35000);
}
function netDisconnect(){
  speedVote = null; speedPanel = null; clearSpeedPending();  // annule tout vote/minuteur de vitesse en cours
  if (net){
    if (net.findTimer) clearTimeout(net.findTimer);
    if (net.hbTimer) clearInterval(net.hbTimer);
    if (net.pub && net.code) lobbyRemove(net.code);     // retire le salon de la liste publique
  }
  try { if (net && net.conn) net.conn.close(); } catch(e){}
  try { if (peerObj) peerObj.destroy(); } catch(e){}
  peerObj = null; net = null;
}

/* ---- liste des salons publics via Firebase Realtime DB (API REST, sans SDK) ---- */
function fbUrl(path){ return NET_CONFIG.firebaseDb.replace(/\/+$/,'') + path + '.json'; }
function lobbyPublish(){
  if (!NET_CONFIG.firebaseDb || !net || !net.pub) return;
  const body = JSON.stringify({ code:net.code, name:(net.name||('Salon '+net.code)), fac:net.myFac,
                                speed:net.speed, hasPw:!!net.pw, ts:Date.now() });
  fetch(fbUrl('/lobbies/'+net.code), { method:'PUT', body }).catch(()=>{});
}
function lobbyRemove(code){
  if (!NET_CONFIG.firebaseDb || !code) return;
  fetch(fbUrl('/lobbies/'+code), { method:'DELETE' }).catch(()=>{});
}
async function lobbyList(){
  if (!NET_CONFIG.firebaseDb) return [];
  try {
    const r = await fetch(fbUrl('/lobbies'), { cache:'no-store' });
    if (!r.ok) return [];
    const j = (await r.json()) || {};
    const now = Date.now();
    return Object.values(j).filter(l => l && l.code && (now - (l.ts||0) < 60000))   // ignore les périmés (>60 s)
                           .sort((a,b)=> (b.ts||0)-(a.ts||0));
  } catch(e){ return []; }
}
