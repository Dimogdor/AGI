/* ---------- PARAMÈTRES & TOUCHES ---------- */
const DEFKEYS = { buy1:'Digit1', buy2:'Digit2', buy3:'Digit3', buy4:'Digit4', buy5:'Digit5', buy6:'Digit6',
  evolve:'KeyE', special:'Space', charge:'KeyC', hold:'KeyV', retreat:'KeyB', formation:'KeyG',
  follow:'KeyF', left:'ArrowLeft', right:'ArrowRight', zoomin:'Equal', zoomout:'Minus',
  capup:'KeyU', repairall:'KeyR', pause:'Escape' };
// libellés des touches : traduits (clés key_*, voir 02-i18n.js) — fonction plutôt que
// table statique pour toujours refléter la langue courante, y compris après un changement.
function keyLabel(k){ return tr('key_'+k); }
const SETTINGS = Object.assign({music:true, sfx:true, vol:0.8, shake:true, lang:'fr', speed:1, quality:'ultra', keys:Object.assign({},DEFKEYS)},
  JSON.parse(localStorage.getItem('agi_settings')||'{}'));
SETTINGS.keys = Object.assign({}, DEFKEYS, SETTINGS.keys);
// PROFILS DE QUALITÉ GRAPHIQUE : densité des particules / lumières. Ultra par défaut.
const QUALITIES = ['low','medium','high','ultra'];
const QUAL_MUL = {low:0.35, medium:0.6, high:0.82, ultra:1};
if (QUALITIES.indexOf(SETTINGS.quality)<0) SETTINGS.quality='ultra';
function qMul(){ return QUAL_MUL[SETTINGS.quality]||1; }       // facteur densité (0.35 → 1)
function qN(n){ return Math.max(1, Math.round(n*qMul())); }    // compte de particules ajusté
function qFx(){ return SETTINGS.quality!=='low'; }             // effets « riches » coupés en Faible
let fpsAvg = 60, fpsWarned = false;                            // suivi FPS pour l'alerte perf
// PROFILEUR PERF (overlay de diagnostic) : activé par ?perf dans l'URL ou la touche F8.
// Mesure le temps de simulation vs rendu et le nombre d'objets vivants — sert à confirmer si
// les chutes de FPS viennent du jeu (boucle/rendu) ou d'une extension du navigateur qui
// surcharge le canvas (Dark Reader, bloqueurs lisant le Canvas…). Aucun coût si désactivé.
const PERF = { on:(typeof location!=='undefined' && /[?&]perf\b/.test(location.search||'')),
               upd:0, rend:0, fps:60, t0:0 };
// vitesses de jeu disponibles (×0.75 ralenti, ×1 normal, ×2, ×3)
const SPEEDS = [0.75, 1, 2, 3];
function clampSpeed(s){ s = +s; return SPEEDS.indexOf(s) >= 0 ? s : 1; }
SETTINGS.speed = clampSpeed(SETTINGS.speed);
function saveSettings(){ localStorage.setItem('agi_settings', JSON.stringify(SETTINGS)); applyVol(); }
function applyVol(){ if (master) master.gain.value = SETTINGS.vol; }
