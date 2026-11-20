/* tools/test-credits.mjs — les crédits s'ouvrent puis se ferment (clic PC 1280×720, toucher téléphone 844×390) ;
   le bouton FERMER reste atteignable et reçoit bien le clic ; showEnd() et le retour au menu les referment.
   Prérequis : npm run dev.   Lancer : node tools/test-credits.mjs (code 1 au moindre échec). */
import { chromium } from 'playwright-core';
const GAME = new URL('../la-derniere-bataille.html', import.meta.url).href;
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let fails = 0;
const check = (c, m) => { console.log((c? '  ✓ ' : '  ✗ ')+m); if (!c) fails++; };
for (const f of [{ name:'PC 1280×720', vp:{ width:1280, height:720 }, touch:false }, { name:'téléphone 844×390 tactile', vp:{ width:844, height:390 }, touch:true }]) {
  console.log('\n'+f.name);
  const ctx = await browser.newContext({ viewport:f.vp, hasTouch:f.touch, isMobile:f.touch });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
    localStorage.setItem('agi_settings', JSON.stringify({ quality:'low', lang:'fr', music:false, sfx:false })); localStorage.removeItem('agi_camp'); });
  await page.goto(GAME); await page.waitForTimeout(400);
  const open = () => page.evaluate(() => { document.getElementById('menu').style.display = 'none';
    document.getElementById('endscreen').style.display = 'flex'; const nb = document.getElementById('campNextBtn'); if (nb) nb.style.display = '';
    campCredits(true); });
  const vis = () => page.evaluate(() => getComputedStyle(document.getElementById('credits')).display !== 'none');
  const how = f.touch? 'touch' : 'mouse';
  await open(); check(await vis(), 'crédits ouverts');
  const r = await page.evaluate(() => { const b = document.getElementById('crClose').getBoundingClientRect();
    const e = document.elementFromPoint(b.x+b.width/2, b.y+b.height/2);
    return { x:b.x+b.width/2, y:b.y+b.height/2, vh:innerHeight, hit:!!e && (e.id==='crClose' || !!e.closest('#credits')) }; });
  check(r.y > 0 && r.y < r.vh, 'FERMER dans l\'écran sans défiler (y='+Math.round(r.y)+' / '+r.vh+')');
  check(r.hit, 'le point du bouton appartient bien aux crédits (pas de clic traversant)');
  if (how==='touch') await page.touchscreen.tap(r.x, r.y); else await page.mouse.click(r.x, r.y);
  await page.waitForTimeout(100); check(!(await vis()), 'fermés par '+(how==='touch'? 'toucher' : 'clic'));
  await open(); await page.evaluate(() => { game = null; showEnd(); }); check(!(await vis()), 'showEnd() ferme les crédits');
  await open(); await page.evaluate(() => document.getElementById('replayBtn').click()); check(!(await vis()), 'retour au menu ferme les crédits');
  check(errs.length===0, 'aucune exception'+(errs.length? ' : '+errs[0] : ''));
  await ctx.close();
}
await browser.close(); console.log(fails? '\n'+fails+' ÉCHEC(S)' : '\nTOUT VERT'); process.exit(fails? 1 : 0);
