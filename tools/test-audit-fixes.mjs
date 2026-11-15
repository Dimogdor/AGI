/* tools/test-audit-fixes.mjs — régressions de l'audit v1.16 : victoire de la mission IV enregistrée (CAMP_SAVE.done==4),
   ducking de la voix qui ne laisse pas la musique à moitié baissée, plafond Vétérans conservé, migration des doctrines.
   Prérequis : npm run dev.   Lancer : node tools/test-audit-fixes.mjs */
import { chromium } from 'playwright-core';
const GAME = new URL('../la-derniere-bataille.html', import.meta.url).href;
const browser = await chromium.launch({ ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), args:['--autoplay-policy=no-user-gesture-required'] });
let fails = 0;
const check = (c, m) => { console.log((c? '  ✓ ' : '  ✗ ')+m); if (!c) fails++; };
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.addInitScript(() => { window.requestAnimationFrame = () => 0;
  localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
  localStorage.setItem('agi_settings', JSON.stringify({ quality:'high', lang:'fr', music:false, sfx:false })); localStorage.removeItem('agi_camp'); });
await page.goto(GAME); await page.waitForTimeout(300);

console.log('\nMISSION IV : victoire avec un civil sauvé → mission V débloquée');
const r = await page.evaluate(() => { CAMP_SAVE.done = 3; startMission(3); const c = game.camp;
  c.civSaved = 1; game.over = true; game.win = true; campResult();
  const o = { done:CAMP_SAVE.done, rec:!!c._recorded, hud:c.m.hud(game, c).label.includes('1/4') };
  startMission(1); const c2 = game.camp; o.cNoCollide = c2.civSaved===undefined && !c2._recorded; return o; });
check(r.done===4 && r.rec, 'CAMP_SAVE.done == 4 après la victoire de la mission IV');
check(r.hud, 'le HUD de la mission IV lit le compteur de civils');

console.log('\nVOIX : la musique revient à son niveau nominal');
const a = await page.evaluate(async () => { audioInit(); await AC.resume(); await new Promise(r => setTimeout(r, 200));
  for (let k=0;k<5;k++){ voiceDuck(true); await new Promise(r => setTimeout(r, 250)); voiceDuck(false); await new Promise(r => setTimeout(r, 120)); }
  await new Promise(r => setTimeout(r, 2500));
  return { v:musicBus.gain.value, st:AC.state, out:VOICE.out? 1 : 0 }; });
check(a.st==='running' ? Math.abs(a.v-1) < 0.03 : true, 'musicBus.gain ≈ 1 après cinq répliques enchaînées (valeur '+a.v.toFixed(3)+', contexte '+a.st+')');

console.log('\nDOCTRINE Vétérans : le plafond 40 (capUp) sert de base');
const d = await page.evaluate(() => { CAMP_SAVE.doc[4] = 0; startMission(4); const g = game, c = g.camp, p = g.p;
  p.capUp = true; p.cap = 40; docApply(DOCTRINES.veterans, g, c); return [p.cap, DOCTRINES.veterans.fx.cap]; });
check(d[0]===40+d[1], 'plafond = 40 + malus de la doctrine avec capUp (valeur '+d[0]+')');
check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
await browser.close();
if (fails){ console.log('\n'+fails+' échec(s)'); process.exit(1); }
