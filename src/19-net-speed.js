/* =====================================================================
   VITESSE DE JEU — ×0.75 / ×1 / ×2 / ×3
   Offline : changement immédiat. En ligne : la vitesse est décidée par le
   lobby puis modifiable en cours de partie par un VOTE (l'adversaire accepte).
   Anti-spam : chaque joueur ne peut proposer un changement que 2 fois / 7 min.
   ===================================================================== */
const SPEED_PROP_WINDOW = 420, SPEED_PROP_MAX = 2; // 7 min, 2 propositions
function speedAnnounce(s){ announce('⏩ '+t('spd_now')+' ×'+s, '#7ec8ff'); }
function setGameSpeed(s){ if (game) game.speed = clampSpeed(s); }
function openSpeedPanel(){ speedPanel = speedPanel ? null : { rects:null }; }
function canProposeSpeed(){
  const now = performance.now()/1000;
  speedProps = speedProps.filter(ts => now - ts < SPEED_PROP_WINDOW);
  return speedProps.length < SPEED_PROP_MAX;
}
// choix d'une vitesse dans le sélecteur (offline = applique ; online = propose un vote)
function pickSpeed(s){
  s = clampSpeed(s); speedPanel = null;
  if (!isOnline()){
    setGameSpeed(s); menuSpeed = s; SETTINGS.speed = s; saveSettings(); refreshSpeedBtns(); speedAnnounce(s);
    return;
  }
  if (!net) return;                                        // sécurité : déconnecté entre-temps
  if ((game.speed||1) === s) return;                       // déjà à cette vitesse
  if (speedPending){ announce(t('spd_wait'), '#e8d8a0'); return; }
  if (!canProposeSpeed()){ announce(t('spd_toomany'), '#ff9d45'); return; }
  speedProps.push(performance.now()/1000);
  // si l'adversaire ne répond pas (15 s), on libère la proposition pour ne pas rester bloqué
  speedPending = { speed:s, timer:setTimeout(()=>{ if (speedPending){ speedPending=null; if (game) announce(t('spd_rejected'), '#ff9d45'); } }, 15000) };
  net.sendSpeed({ act:'propose', speed:s });
  announce(t('spd_proposed')+' ×'+s+'…', '#e8d8a0');
}
function clearSpeedPending(){ if (speedPending && speedPending.timer) clearTimeout(speedPending.timer); speedPending = null; }
// réception d'un message de vitesse (en ligne)
function onSpeedMsg(d){
  if (!d || !game) return;
  if (d.act === 'propose'){
    if (speedPending){ net.sendSpeed({ act:'reject', speed:d.speed }); return; } // collision : on refuse poliment
    speedVote = { speed: clampSpeed(d.speed), rects:null };
  } else if (d.act === 'accept'){
    if (speedPending){ setGameSpeed(speedPending.speed); speedAnnounce(speedPending.speed); clearSpeedPending(); }
  } else if (d.act === 'reject'){
    if (speedPending){ announce(t('spd_rejected'), '#ff9d45'); clearSpeedPending(); }
  }
}
// l'adversaire vote sur ma proposition reçue
function castSpeedVote(ok){
  if (!speedVote) return;
  if (!net){ speedVote=null; return; }                     // sécurité : déconnecté entre-temps
  const s = speedVote.speed;
  if (ok){ setGameSpeed(s); net.sendSpeed({ act:'accept', speed:s }); speedAnnounce(s); }
  else   { net.sendSpeed({ act:'reject', speed:s }); announce(t('spd_rejected'), '#ff9d45'); }
  speedVote = null;
}
function resetSpeedNet(){ speedPanel=null; speedVote=null; clearSpeedPending(); speedProps=[]; }
