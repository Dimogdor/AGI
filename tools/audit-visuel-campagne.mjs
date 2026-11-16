/* Audit visuel (v1.16) : objets de mission de la campagne (bornes d'eau, transformateurs, braseros, vannes, portes…) —
   pour chaque mission, démarre la mission, passe l'ouverture, puis photographie chaque zone / objet / point d'eau / socle
   de la carte à l'échelle du jeu (zoom 1,4). Sortie : <dossier>/camp-m<i>-<k>-<type>.png + camp-m<i>-vue.png ; JSON des objets sur stdout.
   usage : node tools/audit-visuel-campagne.mjs <dossier> [missions=0,1,2,3,4]    (npm run dev avant) */
import { ouvrir } from './_audit-visuel-lib.mjs';
const out = process.argv[2], MIS = (process.argv[3] || '0,1,2,3,4').split(',').map(Number);
const { browser, page, errs } = await ouvrir({ dsf:2 });
for (const i of MIS){
  const info = await page.evaluate((i) => { CAMP_SAVE.done = 5; campStart(i); try { cineEnd(); } catch(e){}
    for (let k=0;k<60;k++){ try { if (CINE.on){ CINE.t = 99; cineTick(0.05); } } catch(e){} update(0.05); }
    zoom = 1.4; if (game.biome && game.biome.dark) game.biome.dark = 0.1; // nuit éclaircie : on juge le dessin, pas l'obscurité
    const pts = [];
    (game.zones||[]).forEach((z,k)=>pts.push({ kind:'zone', k, x:z.x!=null? z.x : z }));
    (game.camp.objs||[]).forEach((o,k)=>pts.push({ kind:'obj', k, x:o.x }));
    (game.nodes||[]).forEach((n,k)=>pts.push({ kind:'node', k, x:n.x }));
    if (pts.length<3) for (const x of [500, 1200, 1900, 2600]) pts.push({ kind:'vue', k:x, x });   // missions sans zone : vues régulières
    window.__pts = pts; return pts; }, i);
  console.log('mission', i, JSON.stringify(info));
  const seen = new Set(); let n = 0;
  for (const p of info){ const key = p.kind+':'+Math.round(p.x/60); if (seen.has(key) || n>=8) continue; seen.add(key); n++;
    await page.evaluate((x) => { for (let k=0;k<4;k++) update(0.05); camX = Math.max(0, x - VW()/2); __R(2); }, p.x);
    const k = await page.evaluate(() => [innerWidth / W, Y_G]);
    await page.screenshot({ path:`${out}/camp-m${i}-${n}-${p.kind}${p.k}.png`, clip:{ x:0, y:Math.max(0,k[1]*k[0]-380), width:1280, height:420 } }); }
}
console.log('erreurs :', errs.slice(0,5)); await browser.close();
