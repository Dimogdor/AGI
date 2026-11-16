/* tools/test-misc-fixes.mjs — corrections diverses de l'audit v1.16 : resize() n'efface plus le canvas quand la taille ne change pas (#6),
   la « reprise allégée » des missions III/IV ne survit pas à une autre partie (#7), le « boom » de la Bombe H suit l'horloge de jeu (#8).
   Prérequis : npm run dev.   Lancer : node tools/test-misc-fixes.mjs (code 1 au moindre échec). */
import { chromium } from 'playwright-core';
const GAME = new URL('../la-derniere-bataille.html', import.meta.url).href;
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let fails = 0;
const check = (c, m) => { console.log((c? '  ✓ ' : '  ✗ ')+m); if (!c) fails++; };
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.addInitScript(() => { window.requestAnimationFrame = () => 0;
  localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
  localStorage.setItem('agi_settings', JSON.stringify({ quality:'low', lang:'fr', music:false, sfx:false })); localStorage.removeItem('agi_camp'); });
await page.goto(GAME); await page.waitForTimeout(300);

console.log('\nRESIZE — canvas conservé si la taille ne change pas');
const a = await page.evaluate(() => { ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle = '#ff0000'; ctx.fillRect(3, 3, 4, 4);
  const px = () => Array.from(ctx.getImageData(5, 5, 1, 1).data).join();
  const before = px();
  window.visualViewport.dispatchEvent(new Event('scroll')); window.dispatchEvent(new Event('resize')); const same = px();
  return { before, same }; });
check(a.before==='255,0,0,255' && a.same===a.before, 'défilement du viewport / resize sans changement : le contenu du canvas est conservé');
await page.setViewportSize({ width:1000, height:600 }); await page.waitForTimeout(200);
const b = await page.evaluate(() => ({ w: cv.width, ok: cv.width>0 && cv.height>0 }));
check(b.ok, 'un vrai redimensionnement réajuste toujours le canvas ('+b.w+' px)');

console.log('\nREPRISE ALLÉGÉE — missions III / IV');
const r = await page.evaluate(() => { document.getElementById('menu').style.display = 'none'; CAMP_SAVE.done = 4; CAMP_SAVE.diff = 0;
  const o = {};
  M3_RETRY = true; startMission(2); o.m3retry = game.camp.water; o.m3flag = M3_RETRY;          // même mission : reprise allégée (eau 70)
  M3_RETRY = true; startMission(0); o.afterOther = M3_RETRY;                                        // autre mission : remise à zéro
  startMission(2); o.m3fresh = game.camp.water;
  M3_RETRY = true; newGame('HUM', 1, false); o.afterSkirmish = M3_RETRY;                            // escarmouche
  M4_RETRY = true; startMission(3); o.m4flag = M4_RETRY; startMission(1); o.m4after = M4_RETRY;
  M3_RETRY = M4_RETRY = true; paused = false; netDisconnect(); game = null; M3_RETRY = M4_RETRY = false; return o; });
check(r.m3retry===70 && r.m3flag===true, 'mission III relancée après sa défaite : reprise allégée conservée (eau '+r.m3retry+')');
check(r.afterOther===false && r.m3fresh===40, 'une autre mission remet le drapeau à zéro : la mission III repart normale (eau '+r.m3fresh+')');
check(r.afterSkirmish===false, 'une escarmouche remet le drapeau à zéro');
check(r.m4flag===true && r.m4after===false, 'mission IV : conservé pour elle-même, remis à zéro par une autre mission');

console.log('\nBOMBE H — « boom » sur l\'horloge de jeu');
const h = await page.evaluate(async () => { newGame('HUM', 1, false); game.aiThink = 1e9; let n = 0; const o = window.sfxAt; window.sfxAt = (k) => { if (k==='boom') n++; };
  triggerNuclearWinter(); const n0 = n; await new Promise(r => setTimeout(r, 900));                 // 0,9 s RÉELLE sans simulation (pause / menu) : rien ne doit sonner
  const n1 = n; for (let i=0;i<10;i++) update(0.1); const n2 = n; window.sfxAt = o; return { n0, n1, n2 }; });
check(h.n0===0 && h.n1===0, 'pas de détonation tant que la simulation ne tourne pas (pause, menu)');
check(h.n2===1, 'une seule détonation, ~0,6 s de jeu après le flash ('+h.n2+')');
check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
await browser.close();
if (fails){ console.log('\n'+fails+' échec(s)'); process.exit(1); }
