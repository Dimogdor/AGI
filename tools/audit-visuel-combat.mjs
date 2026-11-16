/* Audit visuel (v1.16) : planches « combat » — mêlée, tirs, obus en vol, explosions, ordres ⚑, épaves, morts, gremlins,
   à l'ère 0, 2 et 4, fond réel du jeu. Sortie : <dossier>/combat-e<ère>.png ; usage : node tools/audit-visuel-combat.mjs <dossier> */
import { ouvrir, cliche } from './_audit-visuel-lib.mjs';
const out = process.argv[2];
const { browser, page, errs } = await ouvrir({ dsf:2 });
for (const era of [0, 2, 4]){
  await page.evaluate((era) => { __fresh('HUM', era); zoom = 1.35; game.e.era = era; game.e.facKey; const P = game.p, E = game.e, x0 = 1450;
    game.banner = null; try { announce('', '#000'); } catch(e){}
    // deux lignes face à face : mêlée, tank, tireur, siège, aérien, soutien de chaque camp
    for (let r=0;r<6;r++){ spawnUnit(P, r, false, x0 + r*36); spawnUnit(E, r, false, x0 + 400 - r*36); }
    spawnUnit(E, 0, true, x0+250); spawnUnit(E, 0, true, x0+270);
    for (const u of [...P.units, ...E.units]){ u.bob = 0; u._born = -9; u.atkT = u.rate - 0.06; if (u.fly) u.flyH = 56; }
    wrecks.push({ x:x0-40, fac:'HUM', era, role:'melee', side:1, t:5 }, { x:x0-70, fac:'HUM', era, role:'tank', side:1, t:5 }, { x:x0+455, fac:'IA', era, role:'ranged', side:-1, t:5 }, { x:x0+485, fac:'IA', era, role:'siege', side:-1, t:5 });
    deaths.push({ x:x0+200, fac:'HUM', era, role:'melee', fly:false, flyH:0, side:1, t:0.25, life:0.75, trans:false }, { x:x0+235, fac:'IA', era, role:'tank', fly:false, flyH:0, side:-1, t:0.35, life:0.75, trans:false });
    for (let i=0;i<3;i++){ shots.push({ x:x0+60+i*10, y:gY(x0)-40-i*4, tx:x0+200, ty:gY(x0)-30, t:0.05, dur:0.16, fac:i%2?'IA':'HUM', era }); }
    projectiles.push({ sx:x0+120, tx:x0+330, side:1, fac:'HUM', t:0.35, dur:0.7, era, aoe:50, dmg:1, ox:0, oy:-30 }, { sx:x0+330, tx:x0+110, side:-1, fac:'IA', t:0.3, dur:0.7, era, aoe:50, dmg:1, ox:0, oy:-30 });
    explode(x0+215, gY(x0)-20, 1, '#ffb060');
    camX = x0 - 60; __R(1); game.t += 3; __R(1);
    for (const w of wrecks) w.t = 5; __R(2); }, era);
  await cliche(page, `${out}/combat-e${era}.png`, { w:1280, haut:380, bas:30 });
}
console.log('erreurs :', errs.slice(0,5)); await browser.close();
