/* Campagne · mission I (La nuit des compteurs) : à chaque niveau de récit, un joueur scripté simple
   (doit GAGNER) puis un joueur passif (doit PERDRE) ; vérifie les cinématiques (ouverture, scène du
   premier transformateur, clôture).   node tools/camp-m1.mjs [-v]   (DOC=1 : seconde doctrine) */
import { open, close, check, failures } from './_camp-lib.mjs';
const V = process.argv.includes('-v');
// joueur scripté : bâtit l'économie, recrute une armée mixte, reprend les transformateurs un à un,
// lance une fusée éclairante devant le front, puis charge le dépôt quand il est en nombre
const play = (bot) => {
  const g = game, c = g.camp, p = g.p, e = g.e; let steps = 0, think = 0, cines = 0, buyI = 0, push = false;
  while (!g.over && steps++ < 20000){
    if (CINE.on){ cines++; cineEnd(); }
    update(0.05); if (steps%40===0) render(1/60);
    if (!bot || (think -= 0.05) > 0) continue; think = 0.5;
    game.sel.clear();
    ['farmF','farmM','well','turret'].forEach((ty,i)=>{ if (p.slots[i] && !p.slots[i].b) tryBuild(p, p.slots[i], ty); });
    for (const s of p.slots) if (s.b && s.b.type!=='site' && s.b.hp < s.b.maxhp*0.6) tryRepair(p, s);
    if (!p.capUp && unitTotal(p) >= 24) tryCapUp(p);
    if (p.heroCd<=0 && !p.units.some(u=>u.role==='hero')) tryHero(p);
    const pat = [1,2,0,2,3,0,2,1]; if (tryBuy(p, pat[buyI%pat.length])) buyI++;
    const n = p.units.length, z = g.zones.find(z=>z.owner!=='p');
    if (!(c.actCd > 0) && e.units.some(u=>u.x < (z? z.x+300 : e.x))) campAct();
    if (push && n<=4) push = false; else if (!push && n>=10) push = true;          // on se regroupe, puis on avance ensemble
    if (z && push) orderPoint(p, z.x+20);
    else if (!z && push){ for (const u of p.units) u.ord = null; setStance(p, 'charge'); }
    else orderPoint(p, p.x+260);
  }
  return { over:g.over, win:g.win, t:Math.round(c.t), owned:c.owned, hp:Math.round(100*p.hp/p.maxhp), ehp:Math.round(100*e.hp/e.maxhp), cines, units:p.units.length };
};
console.log('\nCAMPAGNE · MISSION I — LA NUIT DES COMPTEURS');
for (const lvl of [0,1,2]){
  for (const bot of [true, false]){
    const { page, errs } = await open(lvl, 0);
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
