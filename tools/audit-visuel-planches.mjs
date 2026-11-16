/* Audit visuel (v1.16) : planches de la campagne (cinématiques à l'encre) — pour chaque mission, chaque plan de la cinématique
   d'ouverture est photographié à 70 % de sa durée (plein cadre 1280×720). Sortie : <dossier>/plan-m<i>-<n>.png ; liste des plans sur stdout.
   usage : node tools/audit-visuel-planches.mjs <dossier> [missions=0,1,2,3,4]    (npm run dev avant) */
import { ouvrir } from './_audit-visuel-lib.mjs';
const out = process.argv[2], MIS = (process.argv[3] || '0,1,2,3,4').split(',').map(Number);
const { browser, page, errs } = await ouvrir({ dsf:1 });
for (const i of MIS){
  const n = await page.evaluate((i) => { goFullscreen = () => {}; CAMP_SAVE.done = 5; campStart(i); return CINE.on? CINE.script.length : -1; }, i);
  console.log('mission', i, 'plans :', n);
  for (let k=0; k<Math.max(0,n) && k<14; k++){
    const info = await page.evaluate((k) => { if (!CINE.on) return null; CINE.i = k; CINE.t = 0; const s = cineShot(); CINE.t = cineDur(s)*0.7; render(1/60); render(1/60);
      return { kind: s.kind || s.t || s.type || Object.keys(s).slice(0,3).join(','), choice:!!s.choice }; }, k);
    if (!info) break; console.log('  plan', k, JSON.stringify(info));
    await page.screenshot({ path:`${out}/plan-m${i}-${String(k).padStart(2,'0')}.png` });
  }
  await page.evaluate(() => { try { cineEnd(); } catch(e){} });
}
console.log('erreurs :', errs.slice(0,5)); await browser.close();
