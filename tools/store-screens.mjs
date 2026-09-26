/* tools/store-screens.mjs — captures de STORE (1920×1080) rendues par le VRAI moteur du jeu.
   Produit dans resources/ :
     screenshots/03-bataille.png, 04-crepuscule.png, 05-ere-avancee.png, 06-monde-mourant.png
       (HUD visible : on montre le jeu tel qu'on y joue — la mort du monde en 4 temps)
     pc-presentation.png (Google Play Games sur PC : SANS aucun texte ni HUD, exigé par Google)
   Les captures 01/02 (cinématique d'intro) ne sont pas régénérées ici.
   Prérequis : npm run dev (régénère la-derniere-bataille.html), puis
     npm i --no-save playwright-core   (aucun téléchargement de navigateur nécessaire)
     CHROME="chemin/vers/chrome"  node tools/store-screens.mjs
   (Windows, en général : C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe) */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const GAME = new URL('../la-derniere-bataille.html', import.meta.url).href;
const OUT  = ROOT + 'resources/screenshots/';
const PC   = ROOT + 'resources/pc-presentation.png';
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errs=[]; page.on('pageerror', e => errs.push(e.message));
// boucle du jeu GELÉE : chaque capture est exactement la frame rendue à la main (sinon la boucle
// vivante continue de simuler entre le rendu et la capture et fait réapparaître des bulles d'XP)
await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
await page.addInitScript(() => { try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1');
  localStorage.setItem('agi_settings', JSON.stringify({quality:'ultra', lang:'fr'})); } catch(e){} });
await page.goto(GAME);
await page.waitForTimeout(1200);
await page.evaluate(() => { const b=document.getElementById('fsBtn'); if (b) b.style.setProperty('display','none','important'); });

// scène : faction, difficulté, ère, niveau de dégradation, nb d'unités par camp
async function scene(o){
  await page.evaluate((o) => {
    document.getElementById('menu').style.display='none';
    Math.random = (()=>{ let s=o.seed||4242; return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; })();
    newGame(o.fac, 1, false);
    const p=game.p, e=game.e; p.f=p.m=p.w=8e3; p.xp=o.xp||80;
    for (let k=0;k<o.era;k++){ p.xp=9e6; tryEvolve(p); }
    for (let k=0;k<o.era;k++){ e.xp=9e6; tryEvolve(e); }
    p.xp=o.xp||80; p.f=1240; p.m=860; p.w=310;
    // défenses sur les socles joueur
    ['turret','wall','farmF'].forEach((t,i)=>{ const s=p.slots[i]; if (s){ p.f=p.m=p.w=9e6; try { tryBuild(p, s, t); } catch(e){} } });
    p.f=1240; p.m=860; p.w=310;
    for (let i=0;i<o.n;i++){ spawnUnit(p, i%6, false, p.x+o.px+i*30); spawnUnit(e, i%6, false, p.x+o.px+300+i*30); }
    camFollow=false; zoom=o.zoom||1; camX=p.x+o.cam; camClamp();
    for (let i=0;i<o.warm;i++) update(1/60);
    if (o.dev!=null){ game.t=o.dev*960; game.kills=game.eKills=0; game.specialsUsed=0; update(1/60); }
    floaters.length=0; game.msg=null; game.msgT=0; render(1/60);   // pas de bandeau d'événement figé
  }, o);
  await page.waitForTimeout(350);
}
const S = [
  ['03-bataille',        { fac:'HUM', era:0, n:9,  px:420, cam:230, warm:260, dev:0.02 }],
  ['04-crepuscule',      { fac:'HUM', era:2, n:10, px:420, cam:230, warm:280, dev:0.5, seed:99 }],
  ['05-ere-avancee',     { fac:'IA',  era:4, n:10, px:420, cam:230, warm:300, dev:0.28, seed:7 }],
  ['06-monde-mourant',   { fac:'HUM', era:3, n:10, px:420, cam:230, warm:260, dev:0.92, seed:31 }],
];
for (const [name, o] of S){ await scene(o); await page.screenshot({ path: OUT+name+'.png' }); console.log('✔', name); }
// présentation PC : même scène que le crépuscule, SANS HUD ni texte flottant
await scene(S[1][1]);
await page.evaluate(() => { window.drawHUD=()=>{}; floaters.length=0; game.zones=[]; game.nodes=[]; game.neut=[];
  const ds=window.drawSlot; window.drawSlot=(s,side,n)=>{ if (s.b) ds(s,side,n); };   // socles vides = libellés texte
  render(1/60); });
await page.screenshot({ path: PC }); console.log('✔ présentation PC');
console.log(errs.length ? 'ERREURS: '+errs.slice(0,3).join(' | ') : '0 erreur JS');
await browser.close();
