// Mission II « Grève générale » : simulation aux 3 niveaux de récit (voir _camp-run.mjs).
//   npm run dev && node tools/camp-m2.mjs        (TRACE=1 pour suivre la partie minute par minute)
import { campRun } from './_camp-run.mjs';
await campRun({
  mission: 1,
  // joueur scripté simple : fermes/marché/puits, escorte en « Tenir », tanks devant et tireurs derrière, barricades dès que possible
  bot(g, c, st){
    const p = g.p;
    if (p.stance!=='hold') setStance(p, 'hold');
    if (p.era<1 && p.xp >= EVOLVE_XP[1]) tryEvolve(p);
    p.slots.forEach((s,i)=>{ if (!s.b) tryBuild(p, s, ['farmF','farmM','well'][i]); });
    const n = r => p.units.filter(u=>u.role===r).length, air = g.e.units.some(u=>u.fly);
    if (p.queue.length < 3){ const pick = n('tank')*2 < n('ranged')+1? 1 : (air || Math.random()<0.6)? 2 : (n('siege')<2? 3 : 0); tryBuy(p, pick); }
    if (st%100===0) campAct();
  },
  info(g, c){ return 'cortège '+Math.round((c.mx-430)/25)+' %, '+Math.ceil(c.hp/10)+' grévistes, '+g.e.units.length+' machines, '+g.p.units.length+' des nôtres'; },
});
