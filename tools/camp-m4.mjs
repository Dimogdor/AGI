/* Campagne · mission IV (Rochefroide) : joue la mission à chaque niveau de récit avec un joueur
   scripté simple (doit GAGNER) puis un joueur passif (doit PERDRE), et vérifie que toutes les
   cinématiques démarrent, défilent et se terminent sans erreur ; contrôle aussi la carte, les PV,
   le compte à rebours du niveau et la reprise allégée du Récit.
   node tools/camp-m4.mjs [-v]   (DOC=1 : seconde doctrine, Service d'ordre)  */
import { open, close, check, failures } from './_camp-lib.mjs';
const V = process.argv.includes('-v');
// joueur scripté : répare et garnit la tourelle et la muraille, recrute (de la mêlée au vivre quand le métal manque),
// monte en ère IV, tient le premier brasero, sort chercher les civils quand la rue est calme et les escorte,
// remet du charbon quand un feu est éteint près de ses troupes
const play = (bot) => {
  const g = game, c = g.camp, p = g.p, e = g.e; let steps = 0, think = 0, cines = 0, buyI = 0, ploughs = 0;
  while (!g.over && steps++ < 14000){
    if (CINE.on){ cines++; cineEnd(); }
    update(0.05); if (steps%40===0) render(1/60);
    if (c.plN > ploughs) ploughs = c.plN;
    if (!bot || (think -= 0.05) > 0) continue; think = 0.5;
    game.sel.clear();
    for (const s of p.slots) if (s.b && s.b.type!=='site' && s.b.hp < s.b.maxhp*0.7) tryRepair(p, s);
    if (p.hp < p.maxhp*0.6) tryRepairBase(p);
    for (const s of p.slots) if (s.b && (s.b.type==='turret' || s.b.type==='wall') && s.b.gar.length<2) dispatchGarrison(p, s, 'ranged');
    if (p.era < g.eraCap && p.xp >= EVOLVE_XP[p.era+1]) tryEvolve(p);
    const pat = [1,2,0,2,1,0,2,3]; if (tryBuy(p, pat[buyI%pat.length])) buyI++; else tryBuy(p, 0);
    const near = e.units.filter(u=>u.x < 1500).length, house = c.houses.find(h=>!h.st && h.x < 1800), gr = c.groups[0];   // la 4e maison, au bout de la rue, est un pari que le joueur scripté ne prend pas
    let tx = 620;
    if (gr) tx = gr.x + 50; else if (house && near < 2 && c.t < 400 && p.units.length >= 4) tx = house.x;
    orderPoint(p, tx);
    if (!(c.actCd > 0) && g.zones.some(z=>z.owner!=='p' && p.units.some(u=>Math.abs(u.x-z.x)<260))) campAct();
  }
  return { over:g.over, win:g.win, t:Math.round(c.t), saved:c.saved, lost:c.lost, lit:c.lit, hp:Math.round(100*p.hp/p.maxhp), ehp:Math.round(100*e.hp/e.maxhp), cines, units:p.units.length, ploughs, pEx:c.pEx };
};
console.log('\nCAMPAGNE · MISSION IV — ROCHEFROIDE');
const TOTAL = [420, 480, 540], WORD = ['sept', 'huit', 'neuf'];
for (const lvl of [0,1,2]){
  for (const bot of [true, false]){
    const { page, errs } = await open(lvl, 3);
    if (bot){
      const m = await page.evaluate(() => { const g = game, c = g.camp; return { zones:g.zones.map(z=>z.x+(z.owner==='p'? '*' : '')).join(' '), nodes:g.nodes.length, neut:g.neut.map(s=>s.x).join(' '),
        hp:Math.round(g.p.maxhp/(campDoc(3).fx.baseHp||1)), ehp:g.e.maxhp, total:c.total, goal:cT(CAMPAIGN[3].goal), turret:Math.round(100*g.p.slots[1].b.hp/g.p.slots[1].b.maxhp), wall:Math.round(100*g.p.slots[2].b.hp/g.p.slots[2].b.maxhp) }; });
      check(m.nodes===0 && m.zones==='640* 1040 1420 1950 2330' && m.neut==='700 1100 1480 2000', `niveau ${lvl} : carte (pas de lac, cinq braseros dont le 1er allumé, quatre socles neutres)`);
      check(m.total===TOTAL[lvl] && m.hp===[3400,2900,2700][lvl] && m.ehp===[5200,6400,7600][lvl], `niveau ${lvl} : compte à rebours ${m.total} s, PV du relais ${m.hp}, de Mnémosyne ${m.ehp}`);
      check(m.goal.includes(WORD[lvl]) && m.turret===45 && m.wall===50, `niveau ${lvl} : l'objectif annonce « ${WORD[lvl]} minutes » ; tourelle ${m.turret} %, muraille ${m.wall} %`);
    }
    const intro = await page.evaluate(() => { const n = CINE.on? CINE.script.length : 0; const played = cineRun(); return { n, played, on:CINE.on }; });
    if (bot) check(intro.n>=11 && intro.played===intro.n && !intro.on, `niveau ${lvl} : intro, ${intro.n} plans joués jusqu'au bout`);
    const r = await page.evaluate(play, bot);
    if (V) console.log('    ', JSON.stringify(r));
    if (bot) check(r.over && r.win && r.t>=200 && r.t<=TOTAL[lvl]+5, `niveau ${lvl} : joueur scripté GAGNE (${r.t} s, base ${r.hp} %, civils ${r.saved}/4, ${r.cines} scènes en mission)`);
    else check(r.over && !r.win, `niveau ${lvl} : joueur passif PERD (${r.t} s)`);
    if (bot) check(r.cines>=3, `niveau ${lvl} : les 3 scènes en mission se sont déclenchées (${r.cines})`);
    if (bot) check(r.ploughs === (lvl===2? 2 : 1), `niveau ${lvl} : ${r.ploughs} déneigeuse(s) envoyée(s)`);
    await page.waitForTimeout(1400);                                       // campEndCine est différée de 1,1 s
    const outro = await page.evaluate(() => { const n = CINE.on? CINE.script.length : 0; const played = cineRun(); render(1/60);
      return { n, played, on:CINE.on, end:document.getElementById('endscreen').style.display!=='none' }; });
    check(outro.n>=1 && outro.played===outro.n && !outro.on && outro.end, `niveau ${lvl} : épilogue ${bot? 'victoire' : 'défaite'} (${outro.n} plans) puis écran de fin`);
    if (!bot && lvl===0){                                                  // Récit : après un échec, la reprise est allégée
      const retry = await page.evaluate(() => { campStart(3); const g = game; cineEnd(); return { z:g.zones.map(z=>z.owner==='p'? 1 : 0).join(''), t:Math.round(100*g.p.slots[1].b.hp/g.p.slots[1].b.maxhp) }; });
      check(retry.z==='11000' && retry.t===100, `niveau 0 : reprise allégée (braseros 1 et 2 allumés ${retry.z}, tourelle réparée ${retry.t} %)`);
    }
    check(!errs.length, `niveau ${lvl} : aucune exception${errs[0]? ' — '+errs[0] : ''}`);
    await page.close();
  }
}
await close();
console.log(failures()? `\n✗ ${failures()} échec(s)` : '\n✓ mission IV : tout passe');
process.exit(failures()? 1 : 0);
