/* ---------- PARAMÈTRES & TOUCHES ---------- */
const DEFKEYS = { buy1:'Digit1', buy2:'Digit2', buy3:'Digit3', buy4:'Digit4', buy5:'Digit5', buy6:'Digit6',
  evolve:'KeyE', special:'Space', charge:'KeyC', hold:'KeyV', retreat:'KeyB', formation:'KeyG',
  follow:'KeyF', left:'ArrowLeft', right:'ArrowRight', zoomin:'Equal', zoomout:'Minus',
  capup:'KeyU', repairall:'KeyR', hero:'KeyH', softpause:'KeyP', pause:'Escape' };
// touches réservées (profileur F8, panneau dev F9) : jamais attribuables à une action
const RESERVED_KEYS = { F8:1, F9:1 };
const LANG_CODES = ['fr','en','es','de','it','pt','ru','zh','ar'];
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
// lecture TOLÉRANTE : un réglage corrompu (écriture interrompue…) ou un stockage inaccessible
// (navigation privée stricte, file:// bridé) faisait planter le jeu dès le chargement — écran
// noir définitif jusqu'à l'effacement manuel des données du site. Repli sur les défauts.
function readSavedSettings(){
  try { const v = JSON.parse(localStorage.getItem('agi_settings')||'{}'); return (v && typeof v==='object' && !Array.isArray(v))? v : {}; }
  catch(e){ return {}; }
}
const SETTINGS = Object.assign({music:true, sfx:true, vol:0.8, shake:true, lang:'fr', speed:1, quality:_autoQ||'ultra', keys:Object.assign({},DEFKEYS)},
  readSavedSettings());
// VALIDATION des réglages relus : un stockage modifié à la main (ou par une ancienne version)
// pouvait contenir un volume non numérique (gain NaN → audio muet), une langue inconnue
// (SETTINGS.lang.toUpperCase() plantait le menu ⚙ si ce n'était pas une chaîne) ou des touches
// non textuelles. Chaque champ invalide retombe sur sa valeur par défaut.
for (const k of ['music','sfx','shake']) SETTINGS[k] = SETTINGS[k]!==false;
SETTINGS.vol = Number.isFinite(+SETTINGS.vol) ? Math.min(1, Math.max(0, +SETTINGS.vol)) : 0.8;
if (LANG_CODES.indexOf(SETTINGS.lang)<0) SETTINGS.lang = 'fr';
{ const kk = (SETTINGS.keys && typeof SETTINGS.keys==='object')? SETTINGS.keys : {};
  SETTINGS.keys = Object.assign({}, DEFKEYS);
  for (const k in DEFKEYS) if (typeof kk[k]==='string' && kk[k].length<=24 && !RESERVED_KEYS[kk[k]]) SETTINGS.keys[k] = kk[k];
  // une touche par défaut ajoutée depuis (ex. H = héros) déjà prise par une touche PERSONNALISÉE
  // du joueur : on laisse la sienne et la nouvelle action reste libre (à attribuer dans le menu)
  for (const k in DEFKEYS){ const c = SETTINGS.keys[k]; if (c!==DEFKEYS[k]) continue;
    for (const j in DEFKEYS) if (j!==k && SETTINGS.keys[j]===c && SETTINGS.keys[j]!==DEFKEYS[j]){ SETTINGS.keys[k]=''; break; } } }
SETTINGS.newsFeed = SETTINGS.newsFeed!==false;   // fil d'actualités du monde (en jeu)
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
function saveSettings(){ try { localStorage.setItem('agi_settings', JSON.stringify(SETTINGS)); } catch(e){} applyVol(); }
function applyVol(){ if (master) master.gain.value = SETTINGS.vol; }
