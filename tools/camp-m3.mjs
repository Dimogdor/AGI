// Mission III « Le barrage de Sainte-Aube » : simulation aux 3 niveaux de récit (voir _camp-run.mjs).
//   npm run dev && node tools/camp-m3.mjs        (TRACE=1 pour suivre la partie, LEVELS=0,2 pour choisir)
import { campRun } from './_camp-run.mjs';
await campRun({
  mission: 2,
  // joueur scripté simple : économie, évolution, tanks/tireurs/artillerie ; l'armée tient la crête du milieu,
  // ouvre les vannes quand au moins 3 machines sont dans le lit et aucun des nôtres, puis donne l'assaut une fois forte
  bot(g, c, st){
    const p = g.p, e = g.e;
    p.slots.forEach((s,i)=>{ if (!s.b) tryBuild(p, s, ['farmF','farmM','well'][i]); });
    if (p.era < g.eraCap && p.xp >= EVOLVE_XP[p.era+1]) tryEvolve(p);
    if (!p.capUp && unitTotal(p) >= 28) tryCapUp(p);
    if (p.m > 320){ tryUpgRole(p, 1); tryUpgRole(p, 3); }
    const n = r => p.units.filter(u=>u.role===r).length;
    if (p.queue.length < 3){ const pick = n('tank') < n('ranged')/2+1? 1 : n('siege') < n('ranged')/2? 3 : 2; tryBuy(p, pick); }
    const lowFoes = e.units.filter(u=>!u.fly && m3Low(u.x)).length, lowMine = p.units.filter(u=>!u.fly && m3Low(u.x)).length;
    if (c.water >= 60 && lowFoes >= 3 && lowMine <= 1) campAct();
    const army = p.units.length;
    if (!c._go && army >= 18 + 2*c.lvl) c._go = true; else if (c._go && army < 9) c._go = false;
    if (c._go){ if (p.stance!=='charge' || p.units.some(u=>u.ord==='point')) setStance(p, 'charge'); }
    else if (st%100===0) orderPoint(p, 1720);
    if (p.specialCd<=0 && e.units.filter(u=>u.x < 2300).length >= 5) trySpecial(p);
  },
  info(g, c){ return 'station '+Math.round(100*g.e.hp/g.e.maxhp)+' %, base '+Math.round(100*g.p.hp/g.p.maxhp)+' %, réservoir '+Math.floor(c.water)+' %, '+(c.floods||0)+' crues, ère '+g.p.era+'/'+g.e.era+', '+g.e.units.length+' machines, '+g.p.units.length+' des nôtres'; },
});
