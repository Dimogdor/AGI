/* Campagne · mission V (La dernière bataille) : joue les trois actes à chaque niveau avec un joueur scripté
   (doit GAGNER, et chaque acte doit lui demander un vrai effort) puis un joueur passif (doit PERDRE) ; vérifie
   les cinématiques (ouverture, passages d'acte, choix final et ses DEUX fins, échec) et la reprise à l'acte.
   node tools/camp-m5.mjs [-v] [lvl=N]       DOC=1 : seconde doctrine (Radio libre)       TRACE=1 : suivi de la partie  */
import { open, close, check, failures } from './_camp-lib.mjs';
const V = process.argv.includes('-v');
// joueur scripté : économie, forge, héros, armée mixte ; acte I : escorte les sapeurs en Tenir, appelle les cellules,
// puis frappe la porte ; acte II : prend les baies l'une après l'autre ; acte III : l'avatar d'abord, Replier devant la bande blanche
const play = ({ bot, trace }) => {
  const g = game, c = g.camp, p = g.p, e = g.e; let steps = 0, think = 0, cines = 0, buyI = 0, mode = 'build'; const acts = [0,0,0,0], tr = [], seen = {};
  while (!g.over && steps++ < 46000){
    if (CINE.on){ cines++; let k = 0; while (CINE.on && k++ < 14){ CINE.t = 0.5; render(1/60); CINE.t = 99; cineTick(0.05); } }
    update(0.05); if (steps%40===0) render(1/60);
    acts[c.act] = c.t;
    if (trace && steps%(c.act>=3? 100 : c.act>=2? 600 : 1200)===0) tr.push([Math.round(c.t), 'a'+c.act, p.units.length+'/'+e.units.length, Math.round(100*e.hp/e.maxhp)+'%', Math.round(100*p.hp/p.maxhp)+'%', 'era'+p.era+'/'+e.era, Math.round(p.f)+'/'+Math.round(p.m)+'/'+Math.round(p.w),
      'sap'+c.saps.length+'+'+c.charges+'-'+c.sapLost, 'cl'+c.cellsLeft, 'z'+c.owned, mode, c.avatar? 'av'+Math.round(100*c.avatar.hp/c.avatar.maxhp) : ''].join(' '));
    if (!bot || (think -= 0.05) > 0) continue; think = 0.5;
    game.sel.clear();
    p.f += 5+4*c.D.i; p.m += 1+2*c.D.i;                                                                                   // un joueur compétent a une économie plus solide que ce script (fermes, marchés, neutres)
    ['farmF','farmF','turret'].forEach((ty,i)=>{ if (!p.slots[i].b) tryBuild(p, p.slots[i], ty); });
    for (const s of p.slots) if (s.b && s.b.type!=='site' && s.b.hp < s.b.maxhp*0.6) tryRepair(p, s);
    for (const s of g.neut) if (!s.b && p.units.some(u=>Math.abs(u.x-s.x)<100)) tryBuild(p, s, s.x<1500? 'farmF' : 'farmM');
    if (p.hp < p.maxhp*0.55) tryRepairBase(p);
    if (p.era < g.eraCap && p.xp >= EVOLVE_XP[p.era+1]) tryEvolve(p);
    if (!p.capUp && unitTotal(p) >= 24) tryCapUp(p);
    if (p.heroCd<=0 && !p.units.some(u=>u.role==='hero') && p.f>=700 && p.m>=700 && p.w>=200) tryHero(p);
    if (p.specialCd<=0 && e.units.some(u=>Math.abs(u.x-p.x)<1100) && p.xp > 400) trySpecial(p);
    const pat = [1,2,0,2,3,0,2,1,4,5]; tryBuy(p, pat[buyI++%pat.length]); if (p.f < 120){ tryBuy(p, 3); tryBuy(p, 3); }   // plus de vivres : l'artillerie ne coûte que du métal et de l'eau
    if (p.m > 320){ let bi = 0; for (let i=1;i<5;i++) if ((p.upg[ROLES[i].key]||0) < (p.upg[ROLES[bi].key]||0)) bi = i; tryUpgRole(p, bi); }
    if (!(c.actCd > 0) && c.cellsLeft > 0 && (c.cellN===0 || c.t - c.t0 > 40)) campAct();                       // l'appel aux cellules
    const n = p.units.length, hero = p.units.find(u=>u.role==='hero'); let tx = null;
    if (c.act===1){
      const head = c.saps.reduce((m,x)=>Math.max(m,x.x), 0), foeNear = c.saps.length && (e.units.some(u=>u.x > head-40 && u.x < head+420) || c.batt.some(b=>!b.dead && b.x > head-40 && b.x < head+700));
      if (c.saps.length && !c.gateOpen && foeNear && n >= 8){ for (const u of p.units) if (u._m5f){ u.ord = null; u.px = null; u._m5f = 0; } setStance(p, 'charge'); mode = 'clear'; }   // on dégage la route devant le sapeur
      else if (c.saps.length && !c.gateOpen){ setStance(p, 'hold'); mode = 'escort'; }                               // Tenir : l'armée se place devant le sapeur
      else if (!c.gateOpen && c.charges < M5.need[c.D.i]){ setStance(p, 'hold'); tx = p.x + 450; mode = 'wait'; }
      else if (n >= 14 || mode==='assault' && n >= 6){ for (const u of p.units) if (u._m5f || u.ord==='point'){ u.ord = null; u.px = null; u._m5f = 0; } setStance(p, 'charge'); mode = 'assault'; }
      else { tx = p.x + 700; mode = 'gather'; }
    } else if (c.act===2){
      const z = g.zones.find(z=>z.owner!=='p'); const low = n < 7;
      if (z && !low){ tx = z.x + 20; mode = 'bay'+g.zones.indexOf(z); }
      else if (!z){ for (const u of p.units) { u.ord = null; u.px = null; } setStance(p, 'charge'); mode = 'door'; }
      else { tx = p.x + 300; mode = 'regroup'; }
    } else {
      if (c.rw && !c.rw.done){ setStance(p, 'retreat'); mode = 'flee'; }
      else if (n < 7 && !c.avFell){ tx = p.x + 380; mode = 'regroup'; }
      else { for (const u of p.units) if (u.ord==='point'){ u.ord = null; u.px = null; } setStance(p, 'charge'); mode = 'push'; }
    }
    if (tx!=null){ if (p.stance!=='charge' && p.stance!=='hold') setStance(p, 'charge'); orderPoint(p, tx); }
    if (hero && c.act===3) { hero.ord = null; }
  }
  return { tr:tr.join('\n    '), ehp:Math.round(e.hp), over:g.over, win:g.win, act:c.act, t:Math.round(c.t), acts:acts.slice(1).map(Math.round), hp:Math.round(100*p.hp/p.maxhp), phase:p.phase, era:p.era, cines, units:p.units.length,
    info:(c.nextInfo||[]).join(" | "), sapLost:c.sapLost, deaths:(c.sapDeaths||[]).join(" "), charges:c.charges, lifeLost:c.lifeLost, hallsAt:c.hallsAt, rw:c.rwCount, goal2:!!c.goal2Done };
};
console.log('\nCAMPAGNE · MISSION V — LA DERNIÈRE BATAILLE');
const ONLY = process.argv.find(a=>/^lvl=/.test(a)), LVLS = ONLY? [+ONLY.slice(4)] : [0,1,2];
for (const lvl of LVLS){
  for (const bot of [true, false]){
    const { page, errs } = await open(lvl, 4);
    const intro = await page.evaluate(() => { const n = CINE.on? CINE.script.length : 0; const played = cineRun(); return { n, played, on:CINE.on }; });
    if (bot) check(intro.n>=11 && intro.played===intro.n && !intro.on, `niveau ${lvl} : ouverture de ${intro.n} plans jouée jusqu'au bout`);
    const r = await page.evaluate(play, { bot, trace:!!process.env.TRACE });
    if (V || process.env.TRACE) console.log('    ', JSON.stringify({ ...r, tr:undefined }), '\n    '+r.tr);
    if (bot){
      const dur = r.acts.map((x,i)=> x - (i? r.acts[i-1] : 0));
      check(r.over && r.win && r.act===3, `niveau ${lvl} : joueur scripté GAGNE (${r.t} s ; actes ${dur.join(' / ')} s ; base ${r.hp} %, ère ${r.era+1}, ${r.sapLost} sapeur(s) perdu(s))`);
      check(dur.every(d=>d>=40), `niveau ${lvl} : chaque acte demande un vrai effort (≥ 40 s) — ${dur.join(' / ')} s`);
      check(r.t>=(lvl? 420 : 330) && r.t<=2200, `niveau ${lvl} : durée raisonnable (${(r.t/60).toFixed(1)} min)`);
      check(r.cines>=2, `niveau ${lvl} : scènes en mission (2 passages d'acte + …) : ${r.cines}`);
    } else check(r.over && !r.win, `niveau ${lvl} : joueur passif PERD (${r.t} s, acte ${r.act})`);
    await page.waitForTimeout(1400);
    if (bot){                                                              // le choix : PASSER s'arrête dessus ; les deux fins au niveau 0, une par niveau ensuite
      const end = async (pick) => page.evaluate((pick) => { if (!CINE.on) campEndCine(); const stop = cineRun(); const more = cineRun(pick); render(1/60);
        return { stop, more, ending:game.camp.ending, on:CINE.on, end:document.getElementById('endscreen').style.display!=='none', txt:campResult().slice(0,30) }; }, pick);
      const picks = lvl===0? [0,1] : [lvl%2];
      for (const pk of picks){ const o = await end(pk);
        check(o.stop<0 && o.more>=4 && !o.on && o.end && o.ending===(pk? 'watch' : 'fall'), `niveau ${lvl} : choix ${pk+1} → fin « ${o.ending} » (${o.more} plans), écran de fin « ${o.txt}… »`);
        await page.evaluate(() => { document.getElementById('endscreen').style.display = 'none'; }); }
    } else {
      const o = await page.evaluate(() => { const n = CINE.on? CINE.script.length : 0; const played = cineRun(); render(1/60); return { n, played, on:CINE.on, end:document.getElementById('endscreen').style.display!=='none', btn:document.getElementById('campNextBtn').textContent }; });
      check(o.n>=2 && o.played===o.n && !o.on && o.end, `niveau ${lvl} : épilogue de défaite (${o.n} plans) puis écran de fin — bouton « ${o.btn} »`);
      if (lvl<2) check(/\d/.test(o.btn), `niveau ${lvl} : le bouton propose de reprendre à l'acte (${o.btn})`);
    }
    check(!errs.length, `niveau ${lvl} : aucune exception${errs[0]? ' — '+errs[0] : ''}`);
    await page.close();
  }
}
await close();
console.log(failures()? `\n✗ ${failures()} échec(s)` : '\n✓ mission V : tout passe');
process.exit(failures()? 1 : 0);
