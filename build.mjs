/* =====================================================================
   build.mjs — pipeline de build « cache le code source »
   Lit guerre-des-eres.html (source lisible), minifie (terser) puis
   obfusque (javascript-obfuscator) le script, et écrit un bundle
   web prêt à l'emploi dans www/ :
     www/index.html   — jeu, script minifié + obfusqué
     www/manifest.webmanifest, www/sw.js, www/icons/…  — PWA installable
   Ce dossier www/ est ensuite empaqueté par Capacitor (iOS/Android),
   Electron (PC) ou servi tel quel sur le web.
   Lancer :  npm run build
   ===================================================================== */
import { readFile, writeFile, mkdir, rm, cp, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { minify } from 'terser';
import JsObf from 'javascript-obfuscator';

const ROOT = new URL('./', import.meta.url);
const SRC  = new URL('./guerre-des-eres.html', import.meta.url);
const OUT  = new URL('./www/', import.meta.url);
const pkg  = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
const VERSION = pkg.version;
// identifiant de build UNIQUE à chaque compilation : garantit qu'un nouveau sw.js est servi
// à chaque déploiement → le service worker se met à jour et purge l'ancien cache.
const BUILD_ID = VERSION + '-' + Date.now().toString(36);

const exists = async p => { try { await access(p, constants.F_OK); return true; } catch { return false; } };

console.log(`▶ build v${VERSION}`);
const html = await readFile(SRC, 'utf8');

// --- extraction du <script> principal (le seul du fichier) ---
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('✖ aucun <script> trouvé'); process.exit(1); }
const rawJs = m[1];

// --- 1) minification (terser) : compresse + mangle les variables locales ---
const min = await minify(rawJs, {
  compress: { passes: 2, drop_console: true, drop_debugger: true },
  mangle:   { toplevel: false },   // garde les noms de haut niveau (rien d'externe ne les référence)
  format:   { comments: false },
});
if (min.error) { console.error('✖ terser', min.error); process.exit(1); }

// --- 2) obfuscation (javascript-obfuscator) : tableau de chaînes chiffré, auto-défense… ---
// Réglages calibrés pour un jeu 60 fps : pas de control-flow-flattening ni dead-code
// (coûteux en CPU), mais toutes les chaînes (lore, UI, logique) passent en base64.
const obf = JsObf.obfuscate(min.code, {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  numbersToExpressions: false,
  renameGlobals: false,            // mettre true pour durcir davantage (à retester)
  selfDefending: true,
  simplify: true,
  splitStrings: false,             // préserve l'unicode du lore (arabe, mandarin…)
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.8,
  transformObjectKeys: false,      // les clés sont adressées par chaîne (i18n, FACTIONS…)
  unicodeEscapeSequence: false,
}).getObfuscatedCode();

console.log(`  script : ${(rawJs.length/1024)|0} Ko → ${(obf.length/1024)|0} Ko obfusqué`);

// --- bootstrap natif : signale à Capacitor que l'app est prête (OTA), inerte sur web/Electron ---
const nativeBoot = `window.addEventListener('load',function(){try{var u=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.CapacitorUpdater;if(u&&u.notifyAppReady)u.notifyAppReady();}catch(e){}});`;

// --- enregistrement du service worker (PWA web uniquement, http/https) ---
// + rechargement AUTOMATIQUE quand une nouvelle version prend la main : plus jamais
//   d'ancienne version coincée en cache chez un joueur de retour.
const swReg = `if('serviceWorker'in navigator&&location.protocol.startsWith('http')){window.addEventListener('load',function(){`+
  `var reloaded=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(reloaded)return;reloaded=true;location.reload();});`+
  `navigator.serviceWorker.register('sw.js').then(function(reg){reg.update();setInterval(function(){reg.update();},60000);}).catch(function(){});`+
  `});}`;

// --- réassemblage du HTML ---
// NB : remplaçants passés en FONCTION pour que les `$`/`$'` du code obfusqué
// ne soient pas interprétés comme motifs de remplacement par String.replace.
let outHtml = html.replace(/<script>[\s\S]*?<\/script>/,
  () => `<script>${obf}</script>\n<script>${nativeBoot}${swReg}</script>`);
// numéro de version affiché dans le menu (jeton remplacé au build)
outHtml = outHtml.split('__VERSION__').join(VERSION);
// liens PWA dans le <head>
outHtml = outHtml.replace('</head>', () =>
  `  <meta name="theme-color" content="#0d0a0a">\n` +
  `  <link rel="manifest" href="manifest.webmanifest">\n` +
  `  <link rel="apple-touch-icon" href="icons/icon-192.png">\n</head>`);

// --- (re)création de www/ ---
await rm(OUT, { recursive: true, force: true });
await mkdir(new URL('./icons/', OUT), { recursive: true });
await writeFile(new URL('./index.html', OUT), outHtml);

// --- manifest PWA ---
const manifest = {
  name: "AGI — Guerre des Ères", short_name: "AGI", description: pkg.description,
  start_url: ".", scope: ".", display: "fullscreen", orientation: "landscape",
  background_color: "#0d0a0a", theme_color: "#0d0a0a",
  icons: [
    { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
  ],
};
await writeFile(new URL('./manifest.webmanifest', OUT), JSON.stringify(manifest, null, 2));

// --- PeerJS AUTO-HÉBERGÉ : on récupère le bundle UMD au build et on le sert depuis
//     notre propre origine. Un seul fichier autonome (aucun import externe) qui pose
//     window.Peer. Évite toute dépendance CDN au runtime pour démarrer une partie en ligne.
async function vendorPeerJS(){
  const SRC = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
  const js = await fetch(SRC).then(r=>r.ok?r.text():Promise.reject(new Error('peerjs '+r.status)));
  if (!/Peer/.test(js) || js.length < 10000) throw new Error('contenu PeerJS inattendu');
  await writeFile(new URL('./peerjs.min.js', OUT), js);
  console.log(`  réseau  : PeerJS auto-hébergé (${(js.length/1024)|0} Ko)`);
}
try { await vendorPeerJS(); }
catch(e){ console.warn('  ⚠ PeerJS non auto-hébergé ('+e.message+') — repli sur CDN au runtime'); }

// --- service worker : RÉSEAU D'ABORD pour le HTML (toujours la dernière version en ligne),
//     cache d'abord pour les ressources statiques (offline). Cache unique par build → mise
//     à jour et purge automatiques à chaque déploiement. ---
const sw = `const C='agi-${BUILD_ID}';const A=['./','index.html','manifest.webmanifest','peerjs.min.js','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(A).catch(()=>{})))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const req=e.request,u=new URL(req.url);
  const isDoc=req.mode==='navigate'||u.pathname==='/'||u.pathname.endsWith('/')||u.pathname.endsWith('index.html');
  if(isDoc){ // réseau d'abord : la page la plus récente quand on est connecté
    e.respondWith(fetch(req).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put('index.html',cp).catch(()=>{}));return res;}).catch(()=>caches.match('index.html').then(r=>r||caches.match('./'))));
    return;
  }
  // ressources statiques : cache d'abord + rafraîchissement en arrière-plan
  e.respondWith(caches.match(req).then(r=>{const net=fetch(req).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(req,cp).catch(()=>{}));return res;}).catch(()=>r);return r||net;}));
});`;
await writeFile(new URL('./sw.js', OUT), sw);

// --- icônes : copie depuis resources/ si présentes, sinon génère des placeholders PNG ---
const haveIcons = await exists(new URL('./resources/icon-512.png', ROOT));
if (haveIcons) {
  await cp(new URL('./resources/icon-192.png', ROOT), new URL('./icons/icon-192.png', OUT)).catch(()=>{});
  await cp(new URL('./resources/icon-512.png', ROOT), new URL('./icons/icon-512.png', OUT)).catch(()=>{});
  console.log('  icônes : copiées depuis resources/');
} else {
  // PNG 1×1 noir minimal (placeholder) — remplacez par vos vraies icônes dans resources/
  const png1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMDAQAY3Y2wAAAAAElFTkSuQmCC',
    'base64');
  await writeFile(new URL('./icons/icon-192.png', OUT), png1x1);
  await writeFile(new URL('./icons/icon-512.png', OUT), png1x1);
  console.log('  icônes : placeholders générés (ajoutez resources/icon-192.png & icon-512.png)');
}

console.log('✔ www/ prêt');
