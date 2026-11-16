/* Audit visuel (v1.16) : HUD — barre du haut (ressources, ère, vitesse) et console du bas (rôles, pouvoirs, pictogrammes)
   pour chaque camp, ères 0 et 4, avec un bâtiment sélectionné (menu de construction) en prime. Sortie : <dossier>/hud-<camp>-e<ère>.png
   usage : node tools/audit-visuel-hud.mjs <dossier>    (npm run dev avant) */
import { ouvrir } from './_audit-visuel-lib.mjs';
const out = process.argv[2];
const { browser, page, errs } = await ouvrir({ dsf:2 });
for (const fac of ['HUM', 'IA']) for (const era of [0, 4]){
  await page.evaluate(([fac, era]) => { __fresh(fac, era); game.p.f = 900; game.p.m = 900; game.p.w = 400; game.p.xp = 700; camX = 80; __R(1); game.t += 3; __R(2); }, [fac, era]);
  await page.screenshot({ path:`${out}/hud-${fac}-e${era}.png` });
}
console.log('erreurs :', errs.slice(0,5)); await browser.close();
