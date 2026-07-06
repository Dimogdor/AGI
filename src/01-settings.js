/* ---------- PARAMÈTRES & TOUCHES ---------- */
const DEFKEYS = { buy1:'Digit1', buy2:'Digit2', buy3:'Digit3', buy4:'Digit4', buy5:'Digit5', buy6:'Digit6',
  evolve:'KeyE', special:'Space', charge:'KeyC', hold:'KeyV', retreat:'KeyB', formation:'KeyG',
  follow:'KeyF', left:'ArrowLeft', right:'ArrowRight', zoomin:'Equal', zoomout:'Minus',
  capup:'KeyU', repairall:'KeyR', pause:'Escape' };
// libellés des touches : traduits (clés key_*, voir 02-i18n.js) — fonction plutôt que
// table statique pour toujours refléter la langue courante, y compris après un changement.
function keyLabel(k){ return tr('key_'+k); }
// AUTO-DÉTECTION DE PERFORMANCE (1x, install neuve UNIQUEMENT — jamais si l'utilisateur a déjà
// une préférence enregistrée) : mesure un échantillon d'opérations canvas représentatives des
// plus coûteuses du jeu (ombres portées, dégradés radiaux) pour choisir une qualité de DÉPART
// adaptée à l'appareil. Sans ça, une tablette démarre en Ultra par défaut et découvre un jeu
// saccadé sans que son propriétaire sache pourquoi ni qu'un réglage existe pour y remédier.
function autoDetectQuality(){
  try {
    const c = document.createElement('canvas'); c.width=200; c.height=200;
    const bc = c.getContext('2d');
    const t0 = performance.now();
    for (let i=0;i<40;i++){
      bc.save(); bc.shadowColor='#5ad0ff'; bc.shadowBlur=12; bc.fillStyle='#5ad0ff';
      bc.beginPath(); bc.arc(100,100,20,0,6.283); bc.fill(); bc.restore();
      const g=bc.createRadialGradient(100,100,2,100,100,60);
      g.addColorStop(0,'rgba(255,255,255,0.5)'); g.addColorStop(1,'rgba(255,255,255,0)');
      bc.fillStyle=g; bc.fillRect(0,0,200,200);
    }
    const dt = performance.now()-t0;
    const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints||0)>0;
    let q = dt<8?'ultra' : dt<18?'high' : dt<35?'medium' : 'low';
    // marge de sécurité tactile : un sondage à froid sous-estime souvent l'emballement
    // thermique d'un GPU mobile en jeu prolongé — on démarre un cran plus bas par précaution.
    if (touch && q==='ultra') q='high';
    return q;
  } catch(e){ return 'high'; }   // repli sûr si le sondage échoue pour une raison quelconque
}
let _autoQ = null;
try { if (!localStorage.getItem('agi_settings')) _autoQ = autoDetectQuality(); } catch(e){}
const SETTINGS = Object.assign({music:true, sfx:true, vol:0.8, shake:true, lang:'fr', speed:1, quality:_autoQ||'ultra', keys:Object.assign({},DEFKEYS)},
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
