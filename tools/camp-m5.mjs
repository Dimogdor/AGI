/* Campagne · mission V (La dernière bataille) : joue les trois actes à chaque niveau de récit avec
   un joueur scripté simple (doit GAGNER) puis un joueur passif (doit PERDRE) ; vérifie les
   cinématiques (ouverture, changements d'acte, choix final et ses DEUX fins, défaite).
   node tools/camp-m5.mjs [-v]  */
import { open, close, check, failures } from './_camp-lib.mjs';
const V = process.argv.includes('-v');
// joueur scripté : économie de base, tourelle, montée en ère, armée mixte, pousse quand il est en
// nombre ; acte II : va tenir les baies l'une après l'autre ; acte III : recule devant la réécriture
const play = (bot) => {
  const g = game, c = g.camp, p = g.p, e = g.e; let push = false, steps = 0, think = 0, cines = 0, buyI = 0; const acts = [0,0,0,0], trace = [];
  while (!g.over && steps++ < 26000){
    if (CINE.on){ cines++; let k = 0; while (CINE.on && k++ < 12){ CINE.t = 0.5; render(1/60); CINE.t = 99; cineTick(0.05); } }
    update(0.05); if (steps%40===0) render(1/60);
    acts[c.act] = c.t;
    if (steps%1200===0) trace.push([Math.round(c.t), c.act, p.units.length, e.units.length, Math.round(e.hp), p.era, e.era, Math.round(p.f), Math.round(p.m), g.zones.map(z=>(z.owner||'-')+Math.round(z.prog*9)).join(''), push, Math.round(Math.max(0,...p.units.map(u=>u.x))), Math.round(Math.min(9999,...e.units.map(u=>u.x))), g.neut.map(n=>n.b? n.b.type[0]+Math.round(n.b.hp)+(n.owner===p?'P':'E') : '-').join('/'), p.stance].join(','));
    if (!bot || (think -= 0.05) > 0) continue; think = 0.5;
    game.sel.clear();
    ['farmM','turret','farmF'].forEach((ty,i)=>{ if (!p.slots[i].b) tryBuild(p, p.slots[i], ty); });
    for (const s of p.slots) if (s.b && s.b.type!=='site' && s.b.hp < s.b.maxhp*0.6) tryRepair(p, s);
    if (p.hp < p.maxhp*0.55) tryRepairBase(p);
    if (p.era < g.eraCap && p.xp >= EVOLVE_XP[p.era+1]) tryEvolve(p);
    if (!p.capUp && unitTotal(p) >= 24) tryCapUp(p);
    if (p.heroCd<=0 && !p.units.some(u=>u.role==='hero') && c.act>=2) tryHero(p);
    if (p.specialCd<=0 && e.units.some(u=>Math.abs(u.x-p.x)<900)) trySpecial(p);
    const pat = [1,2,0,2,3,0,2,1,4,5]; tryBuy(p, pat[buyI++%pat.length]);
    if (!(c.actCd > 0)) campAct();
    if (p.m > 320){ let bi = 0; for (let i=1;i<5;i++) if ((p.upg[ROLES[i].key]||0) < (p.upg[ROLES[bi].key]||0)) bi = i; tryUpgRole(p, bi); }
    const n = p.units.length; let tx = null;
    if (c.act===2){ const z = g.zones.find(z=>z.owner!=='p'); if (z && n>=8) tx = z.x+20; }
    if (c.rw && !c.rw.done) tx = c.rw.x - 60;
    if (push && n<=5) push = false; else if (!push && n>=14) push = true;            // on se regroupe, puis on pousse en masse
    if (tx==null && !push) tx = e.units.some(u=>u.x<p.x+700)? p.x+260 : p.x+520;
    if (tx!=null) orderPoint(p, tx); else { for (const u of p.units) u.ord = null; setStance(p, 'charge'); }
  }
  return { trace:trace.join(' | '), ehp:Math.round(e.hp), emax:e.maxhp, eu:e.units.length, over:g.over, win:g.win, act:c.act, t:Math.round(c.t), acts:acts.slice(1).map(Math.round), hp:Math.round(100*p.hp/p.maxhp), phase:p.phase, era:p.era, cines, units:p.units.length };
};
console.log('\nCAMPAGNE · MISSION V — LA DERNIÈRE BATAILLE');
const ONLY = process.argv.find(a=>/^lvl=/.test(a)), LVLS = ONLY? [+ONLY.slice(4)] : [0,1,2];
for (const lvl of LVLS){
  for (const bot of [true, false]){
    const { page, errs } = await open(lvl, 4);
    const intro = await page.evaluate(() => { const n = CINE.on? CINE.script.length : 0; const played = cineRun(); return { n, played, on:CINE.on }; });
    if (bot) check(intro.n>=6 && intro.played===intro.n && !intro.on, `niveau ${lvl} : intro, ${intro.n} plans joués jusqu'au bout`);
    const r = await page.evaluate(play, bot);
    if (V) console.log('    ', JSON.stringify(r));
    if (bot){ check(r.over && r.win && r.act===3, `niveau ${lvl} : joueur scripté GAGNE (${r.t} s ; fin des actes à ${r.acts.join(' / ')} s ; base ${r.hp} %, ère ${r.era+1})`);
      check(r.t>=420 && r.t<=960, `niveau ${lvl} : durée raisonnable (${(r.t/60).toFixed(1)} min)`);
      check(r.cines>=3, `niveau ${lvl} : scènes en mission (renforts + 2 changements d'acte) : ${r.cines}`); }
    else check(r.over && !r.win, `niveau ${lvl} : joueur passif PERD (${r.t} s, acte ${r.act})`);
    await page.waitForTimeout(1400);
    if (bot){                                                              // le choix : PASSER s'arrête dessus ; une fin par niveau, les deux au niveau 0
      const end = async (pick) => page.evaluate((pick) => { if (!CINE.on) campEndCine(); const stop = cineRun(); const more = cineRun(pick); render(1/60);
        return { stop, more, ending:game.camp.ending, on:CINE.on, end:document.getElementById('endscreen').style.display!=='none', txt:campResult().slice(0,24) }; }, pick);
      const picks = lvl===0? [0,1] : [lvl%2];
      for (const pk of picks){ const o = await end(pk);
        check(o.stop<0 && o.more>=3 && !o.on && o.end && o.ending===(pk? 'watch' : 'fall'), `niveau ${lvl} : choix ${pk+1} → fin « ${o.ending} » (${o.more} plans), écran de fin « ${o.txt}… »`);
        await page.evaluate(() => { document.getElementById('endscreen').style.display = 'none'; }); }
    } else {
      const o = await page.evaluate(() => { const n = CINE.on? CINE.script.length : 0; const played = cineRun(); render(1/60); return { n, played, on:CINE.on, end:document.getElementById('endscreen').style.display!=='none' }; });
      check(o.n>=1 && o.played===o.n && !o.on && o.end, `niveau ${lvl} : épilogue défaite puis écran de fin`);
    }
    check(!errs.length, `niveau ${lvl} : aucune exception${errs[0]? ' — '+errs[0] : ''}`);
    await page.close();
  }
}
await close();
console.log(failures()? `\n✗ ${failures()} échec(s)` : '\n✓ mission V : tout passe');
process.exit(failures()? 1 : 0);
