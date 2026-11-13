/* Outils communs aux tests de mission de campagne (tools/camp-m4.mjs, tools/camp-m5.mjs).
   Boucle gelée (requestAnimationFrame neutralisé) : le test avance lui-même update(0.05) et
   appelle render() de temps en temps pour attraper les erreurs de dessin. */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
export const GAME = 'file://' + fileURLToPath(new URL('../la-derniere-bataille.html', import.meta.url));
let browser = null, fails = 0;
export const ok = m => console.log('  ✓ '+m), ko = m => { console.log('  ✗ '+m); fails++; };
export const check = (cond, m) => cond ? ok(m) : ko(m);
export const failures = () => fails;
export async function open(lvl, mis){
  if (!browser) browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1280, height:640 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0;
    try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
      localStorage.setItem('agi_settings', JSON.stringify({ quality:'high', lang:'fr', music:false, sfx:false })); } catch(e){} });
  await page.goto(GAME); await page.waitForTimeout(400);
  await page.evaluate(([lvl, mis]) => {
    let s = 20251031 + lvl*977; Math.random = () => { s = (s*16807)%2147483647; return (s-1)/2147483646; };   // reproductible
    CAMP_SAVE.done = 5; CAMP_SAVE.lvl = lvl; campLaunch(mis);
    // joue la cinématique en cours plan par plan (rendu compris) ; choix = index du bouton à presser sur un plan « choice »
    window.cineRun = (choice) => { let n = 0, guard = 0; while (CINE.on && guard++ < 80){ const s = CINE.script[CINE.i]; n++;
        CINE.t = 0.3; cineTick(0.05); render(1/60); CINE.t = 1.5; render(1/60);
        if (s && s.choice){ if (choice==null) return -n; s.choice[choice].pick(game, game.camp); cineNext(); }
        else { CINE.t = 99; cineTick(0.05); } }
      return n; };
  }, [lvl, mis]);
  return { page, errs };
}
export async function close(){ if (browser) await browser.close(); }
