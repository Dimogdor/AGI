/* ================= ÉTAT ================= */
let game = null, paused = false;
let settingsOpen = false;   // ⚙ menu de réglages ouvert (gèle aussi la partie) — distinct de la pause simple ⏸
let netPause = null;        // négociation de pause en ligne (voir module pause en ligne)
let speedPanel = null;      // sélecteur de vitesse ouvert (chooser local)
let speedVote = null;       // proposition de vitesse reçue de l'adversaire (modal Oui/Non)
let speedPending = null;    // ma proposition en attente de réponse
let speedProps = [];        // horodatage de mes propositions (anti-spam : 2 max / 7 min)
let onlineVoteRects = null; // boutons Oui/Non du vote de prolongation
let net = null, GX = {}, UID = 1;          // réseau (serveur-chez-l'hôte) + ids d'unités
const ROLE_CODES = {melee:0,tank:1,ranged:2,siege:3,air:4,support:5,gremlin:6,hero:7};
const CODE_ROLES = ['melee','tank','ranged','siege','air','support','gremlin','hero'];
const isGuest = side => game && game.net==='guest' && side===game.p;
function guestCmd(c){ if (net && net.sendCmd) net.sendCmd(c); }
function slotRef(side, slot){
  let i = side.slots.indexOf(slot); if (i>=0) return {t:'own',i};
  i = game.neut.indexOf(slot);     if (i>=0) return {t:'neut',i};
  return null;
}
let particles=[], floaters=[], shots=[], projectiles=[], LIGHTS=[], VIGN=null, deaths=[];
let camX = 0, camFollow = true;
let buildMenu = null, pauseRects = null;
let selMode = false, selBox = null;       // lasso
let TUT = null;                            // tutoriel interactif (réécriture propre — voir 15-tutorial.js)