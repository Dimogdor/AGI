// Mission II « Grève générale » : joueur scripté (doit GAGNER en ESCORTANT, pas en fonçant) et joueur passif (doit PERDRE),
// aux 3 niveaux et avec les 2 doctrines.   npm run dev && node tools/camp-m2.mjs      (DOC=1 : Caisse de grève · TRACE=1 · LEVELS=0,1)
import { campRun } from './_camp-run.mjs';
await campRun({
  mission: 1,
  // joueur scripté : ferme/marché/puits, tourelles aux emplacements ouverts, armée en « Tenir » (« Charger » seulement pour couler les
  // canonnières), lourds devant, tireurs derrière, évolution, barricade quand une barge accoste, jamais loin du cortège
  bot(g, c, st){
    const p = g.p, n = r => p.units.filter(u=>u.role===r).length;
    const boats = c.seg>=2 && c.boats.some(b=>!b.dead) && Math.abs(c.boats.find(b=>!b.dead).x - c.mx) < 760;
    const want = boats? 'charge' : 'hold'; if (p.stance!==want) setStance(p, want);
    if (p.era<1 && p.xp >= EVOLVE_XP[1]) tryEvolve(p);
    p.slots.forEach((s,i)=>{ if (!s.b) tryBuild(p, s, ['farmF','farmM','well'][i]); });
    for (const s of g.neut) if (!s.b && p.m > 200) tryBuild(p, s, 'turret');
    if (!p.capUp && unitTotal(p) >= 24) tryCapUp(p);
    if (p.era>=1 && p.m > 260){ tryUpgRole(p, 1); tryUpgRole(p, 2); }
    const air = g.e.units.some(u=>u.fly);
    if (p.queue.length < 3){ const pick = n('tank') < 4? 1 : (n('ranged') < 2*n('tank') || air)? 2 : (n('siege') < 3? 3 : 0); tryBuy(p, pick); }
    const near = g.e.units.some(u=>!u.fly && u.x > c.mx && u.x < c.mx+420) || c.barges.some(b=>!b.done && b.x < c.mx+500);
    if (near) campAct();
  },
  info(g, c){ return 'cortège '+Math.round(100*(c.mx-430)/2720)+' %, tronçon '+(c.seg+1)+', force '+Math.ceil(c.hp)+'/'+Math.ceil(c.cap)+', ère '+g.p.era+', '+g.e.units.length+' machines, '+g.p.units.length+' des nôtres, canonnières coulées '+c.sunk+', terminal '+(c.term.dead? 'fermé' : c.term.active? 'actif' : 'en veille'); },
});
