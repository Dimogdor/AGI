// Mission II « Grève générale » : simulation aux 3 niveaux de récit (voir _camp-run.mjs).
//   npm run dev && node tools/camp-m2.mjs        (TRACE=1 pour suivre la partie minute par minute)
import { campRun } from './_camp-run.mjs';
await campRun({
  mission: 1,
  // joueur scripté simple : fermes/marché/puits, escorte en « Tenir » (charge sur les canons), tanks devant et tireurs derrière, évolution dès que
  // possible (petite armée en attendant), +10 de cap, améliorations, barricades dès que possible
  bot(g, c, st){
    const p = g.p;
    const guns = g.e.units.some(u=>u.role==='siege' && u.x < c.mx+480);       // des canons pilonnent la tête : on va les chercher
    if (guns && p.stance!=='charge') setStance(p, 'charge'); else if (!guns && p.stance!=='hold') setStance(p, 'hold');
    if (p.era<1 && p.xp >= EVOLVE_XP[1]) tryEvolve(p);
    p.slots.forEach((s,i)=>{ if (!s.b) tryBuild(p, s, ['farmF','farmM','well'][i]); });
    const n = r => p.units.filter(u=>u.role===r).length, air = g.e.units.some(u=>u.fly);
    if (!p.capUp && unitTotal(p) >= 28) tryCapUp(p);
    if (p.era>=1 && p.m > 260){ tryUpgRole(p, 1); tryUpgRole(p, 2); }
    if (p.queue.length < 3 && (p.era>=1 || p.units.length < 14)){ const pick = n('tank')*2 < n('ranged')+1? 1 : (air || Math.random()<0.6)? 2 : (n('siege')<2? 3 : 0); tryBuy(p, pick); }
    if (st%100===0) campAct();
  },
  info(g, c){ return 'cortège '+Math.round((c.mx-430)/25)+' %, ère '+g.p.era+'/'+g.e.era+', '+Math.ceil(c.hp/10)+' grévistes, '+g.e.units.length+' machines, '+g.p.units.length+' des nôtres ('+['melee','tank','ranged','siege','air','support'].map(r=>g.p.units.filter(u=>u.role===r).length).join('·')+')'; },
});
