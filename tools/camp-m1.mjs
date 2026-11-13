/* Campagne · mission I (La nuit des compteurs) : à chaque niveau de récit, un joueur scripté simple
   (doit GAGNER) puis un joueur passif (doit PERDRE) ; vérifie les cinématiques (ouverture, scène du
   premier transformateur, clôture).   node tools/camp-m1.mjs [-v]   (DOC=1 : seconde doctrine) */
import { open, close, check, failures } from './_camp-lib.mjs';
import { readFileSync } from 'node:fs';
const BOTS = readFileSync(new URL('./_bots.js', import.meta.url), 'utf8');
const V = process.argv.includes('-v');
// joueur scripté : le « compétent » de l'audit d'équilibrage (tools/_bots.js), plus la fusée éclairante
// lancée au-dessus du front dès que des machines s'en approchent
const play = (bot) => {
  const g = game, c = g.camp, p = g.p, e = g.e; let steps = 0, think = 0, cines = 0; const st = {};
  while (!g.over && steps++ < 20000){
    if (CINE.on){ cines++; cineEnd(); }
    update(0.05); if (steps%40===0) render(1/60);
    if (!bot || (think -= 0.05) > 0) continue; think = 0.5;
    __competent(st, {});
    let front = p.x; for (const u of p.units) if (u.x>front) front = u.x;
    if (!(c.actCd > 0) && e.units.some(u=>Math.abs(u.x-front)<420)){ camX = clamp(front+120 - VW()/2, 0, WORLD-VW()); campAct(); }
  }
  return { over:g.over, win:g.win, t:Math.round(c.t), owned:c.owned, hp:Math.round(100*p.hp/p.maxhp), ehp:Math.round(100*e.hp/e.maxhp), cines, units:p.units.length };
};
console.log('\nCAMPAGNE · MISSION I — LA NUIT DES COMPTEURS');
for (const lvl of [0,1,2]){
  for (const bot of [true, false]){
    const { page, errs } = await open(lvl, 0); await page.evaluate('(() => { '+BOTS+'\n; window.__competent = __competent; })()');   // la CSP du jeu interdit les scripts en ligne : on passe par evaluate
    const intro = await page.evaluate(() => { const n = CINE.on? CINE.script.length : 0; const played = cineRun(); return { n, played, on:CINE.on }; });
    if (bot) check(intro.n>=6 && intro.played===intro.n && !intro.on, `niveau ${lvl} : ouverture, ${intro.n} plans joués jusqu'au bout`);
    const r = await page.evaluate(play, bot);
    if (V) console.log('    ', JSON.stringify(r));
    if (bot) check(r.over && r.win && r.t>=180 && r.t<=900, `niveau ${lvl} : joueur scripté GAGNE (${r.t} s, base ${r.hp} %, ${r.owned}/3 transformateurs, ${r.cines} scène(s) en mission)`);
    else check(r.over && !r.win, `niveau ${lvl} : joueur passif PERD (${r.t} s)`);
    await page.waitForTimeout(1400);
    const outro = await page.evaluate(() => { const n = CINE.on? CINE.script.length : 0; const played = cineRun(); render(1/60);
      return { n, played, on:CINE.on, end:document.getElementById('endscreen').style.display!=='none' }; });
    check(outro.n>=1 && outro.played===outro.n && !outro.on && outro.end, `niveau ${lvl} : clôture ${bot? 'victoire' : 'défaite'} (${outro.n} plans) puis écran de fin`);
    check(!errs.length, `niveau ${lvl} : aucune exception${errs[0]? ' — '+errs[0] : ''}`);
    await page.close();
  }
}
await close();
console.log(failures()? `\n✗ ${failures()} échec(s)` : '\n✓ mission I : tout passe');
process.exit(failures()? 1 : 0);
