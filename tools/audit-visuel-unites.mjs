/* Audit visuel (v1.16) : planches « unités » — pour chaque camp et chaque ère (+ transcendance), les 6 rôles,
   le héros et le gremlin, à l'échelle du jeu (rendu réel, fond neutre). Sortie : <dossier>/unites-<camp>-e<ère>.png
   usage : node tools/audit-visuel-unites.mjs <dossier> [zoom=1]      (npm run dev avant) */
import { ouvrir, cliche } from './_audit-visuel-lib.mjs';
const out = process.argv[2], Z = +(process.argv[3] || 1);
const { browser, page, errs } = await ouvrir({ dsf:2 });
await page.evaluate(() => __neutre(true));
for (const fac of ['HUM', 'IA']) for (const [era, trans] of [[0,false],[1,false],[2,false],[3,false],[4,false],[4,true]]){
  await page.evaluate(([fac, era, trans, Z]) => { __fresh(fac, era, trans); zoom = Z; const S = game.p, gap = 96;
    for (let r=0;r<6;r++){ spawnUnit(S, r, false, 1500 + r*gap); }
    spawnHero(S, 1); S.units[S.units.length-1].x = 1500 + 6*gap + 10; spawnUnit(S, 0, true, 1500 + 7*gap);
    for (const u of S.units){ u.bob = 0; u.atkT = 0; if (u.fly) u.flyH = 52; }
    __pose(1500 - 40); }, [fac, era, trans, Z]);
  await cliche(page, `${out}/unites-${fac}-e${era}${trans?'T':''}.png`, { w:1280, haut:Math.round(250*Z), bas:30 });
}
console.log('erreurs :', errs.slice(0,5)); await browser.close();
