/* tools/test-orders.mjs — ordres de position (⚑), grève / mise à jour forcée, postures du héros, guide.
   Vrais clics souris Playwright sur le canvas (clic droit, glissé), appui long tactile (CDP), et mesures
   dans la simulation. Prérequis : npm run dev. Lancer : node tools/test-orders.mjs (code 1 au moindre échec). */
import { chromium } from 'playwright-core';
const GAME = new URL('../la-derniere-bataille.html', import.meta.url).href;
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let fails = 0; const t0 = Date.now();
const check = (c, m) => { console.log((c? '  ✓ ' : '  ✗ ')+m); if (!c) fails++; };

async function open(opts={}){
  const ctx = await browser.newContext({ viewport:{ width:1280, height:720 }, hasTouch:!!opts.touch });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0;
    try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
      localStorage.setItem('agi_settings', JSON.stringify({ quality:'low', lang:'fr', music:false, sfx:false })); } catch(e){} });
  await page.goto(GAME); await page.waitForTimeout(350);
  await page.evaluate(() => { let s = 4242; Math.random = () => { s = (s*16807)%2147483647; return (s-1)/2147483646; };
    document.getElementById('menu').style.display = 'none';
    window.R = () => { ctx.setTransform(SCALE,0,0,SCALE,0,0); render(1/60); };
    window.sim = (sec, fn) => { for (let i=0;i<sec*20;i++){ game.aiThink = 1e9; if (fn) fn(i); update(0.05); } R(); };
    window.toPage = (sx, sy) => { const r = cv.getBoundingClientRect(); return [r.left + sx/W*r.width, r.top + sy/H*r.height]; }; });
  return { page, errs, ctx };
}

console.log('\nORDRE DE POSITION — vrais clics droits');
{ const { page, errs, ctx } = await open();
  const cases = [ ['zoom 1, caméra 0', '', [640, 300]], ['bas de l\'écran (sous la ligne du sol)', '', [520, 422]],
    ['zoom ×0,6, caméra 800', 'zoom=0.6; camX=800; camClamp();', [500, 250]], ['zoom ×1,25, caméra 1200', 'zoom=1.25; camX=1200; camClamp();', [330, 330]] ];
  for (const [name, cam, [sx, sy]] of cases){
    const wx = await page.evaluate(([cam, sx]) => { newGame('HUM', 1, false); game.aiThink = 1e9; camFollow = false;
      { const p=game.p; for (const ri of [0,1,2,3,4,5,0,2,1,0,2,4]) spawnUnit(p, ri, false, 260); spawnHero(p); }
      eval(cam); R(); return s2wX(sx); }, [cam, sx]);
    const [x, y] = await page.evaluate(([a,b]) => toPage(a,b), [sx, sy]);
    await page.mouse.move(x, y); await page.mouse.down({ button:'right' }); await page.mouse.up({ button:'right' });
    const r = await page.evaluate((wx) => { const p = game.p, n = p.units.length;
      const ordered = p.units.every(u=>u.ord==='point'); const flag0 = (game.flags||[]).length;
      sim(32); const errMax = Math.max(...p.units.map(u=>Math.abs(u.x-u.px)));
      const xs = p.units.map(u=>u.x), c = (Math.min(...xs.filter((_,i)=>!p.units[i].fly))+Math.max(...xs.filter((_,i)=>!p.units[i].fly)))/2;
      const spread = Math.max(...xs)-Math.min(...xs); const flagGone = !(game.flags||[]).length;
      const before = xs.join(); sim(8); const still = p.units.map(u=>u.x).join()===before && p.units.every(u=>u.ord==='point');
      return { ordered, flag0, errMax, centre: Math.abs(c-wx), spread, flagGone, still, n }; }, wx);
    check(r.ordered && r.flag0===1 && r.errMax<=1.5 && r.centre<=8 && r.spread<=100 && r.flagGone && r.still,
      `${name} : ${r.n} unités (dont héros, volants, soutien) posées à ≤ ${r.errMax.toFixed(1)} px de leur place, bloc centré à ${r.centre.toFixed(1)} px du clic, ${r.spread.toFixed(0)} px de large ; fanion retiré à l'arrivée ; position tenue`);
  }
  // clic droit « en mouvement » : la souris glisse de 30 px pendant le clic — l'ordre part quand même, sans glissé de caméra
  { await page.evaluate(() => { newGame('HUM', 1, false); game.aiThink = 1e9; camFollow = false; camX = 400; camClamp(); spawnUnit(game.p, 0, false, 500); R(); });
    const [x, y] = await page.evaluate(() => toPage(600, 300));
    await page.mouse.move(x, y); await page.mouse.down({ button:'right' }); await page.mouse.move(x+30, y+4, { steps:4 }); await page.mouse.up({ button:'right' });
    const r = await page.evaluate(() => ({ ord: game.p.units[0].ord, px: game.p.units[0].px, cam: camX, want: s2wX(600) }));
    check(r.ord==='point' && Math.abs(r.px-r.want)<1 && r.cam===400, 'clic droit avec 30 px de glissé : ordre donné au point de l\'appui, caméra immobile');
  }
  // sélection : seuls les sélectionnés y vont ; clic droit sur un bouton du HUD : aucun ordre
  { const r = await page.evaluate(() => { newGame('HUM', 1, false); game.aiThink = 1e9; camFollow = false;
      { const p=game.p; for (const ri of [0,1,2,3,4,5,0,2,1,0,2,4]) spawnUnit(p, ri, false, 260); spawnHero(p); } R();
      for (const u of game.p.units) if (u.role==='ranged') game.sel.add(u);
      handleTap(400, 300, false, {right:true});
      const sel = game.p.units.filter(u=>u.ord==='point').every(u=>u.role==='ranged') && game.p.units.some(u=>u.ord==='point');
      game.sel.clear(); for (const u of game.p.units) u.ord = null;
      const b = HUD.btns.find(b=>b.type==='stance' && b.st==='hold'); handleTap(b.x+b.w/2, b.y+b.h/2, false, {right:true});
      return { sel, hud: !game.p.units.some(u=>u.ord==='point') }; });
    check(r.sel && r.hud, 'avec une sélection, elle seule obéit ; un clic droit sur un bouton du HUD ne donne aucun ordre');
  }
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await ctx.close();
}

console.log('\nORDRE DE POSITION — combat, repli, tactile, en ligne');
{ const { page, errs, ctx } = await open({ touch:true });
  const r = await page.evaluate(() => { const out = {};
    // tient la position : un ennemi qui arrive à portée est combattu, personne ne quitte sa place
    newGame('HUM', 1, false); game.aiThink = 1e9; camFollow = false; const p = game.p, e = game.e;
    for (const ri of [0,1,2,2,3,4]) spawnUnit(p, ri, false, 300);
    orderPoint(p, 900); sim(26);
    const placed = p.units.every(u=>Math.abs(u.x-u.px)<=1.5);
    for (let i=0;i<5;i++) spawnUnit(e, i%3, false, 1250+i*12);
    let maxDrift = 0; const hp0 = e.units.reduce((a,u)=>a+u.hp,0);
    sim(10, () => { for (const u of p.units) if (u.ord==='point') maxDrift = Math.max(maxDrift, Math.abs(u.x-u.px)); });
    out.hold = placed && maxDrift<=1.5 && (e.units.length<5 || e.units.reduce((a,u)=>a+u.hp,0) < hp0*0.7);
    out.drift = maxDrift;
    // point EN ARRIÈRE sous la poursuite : l'armée décroche et l'atteint (avant : tireurs et artillerie restaient au contact)
    newGame('HUM', 1, false); game.aiThink = 1e9; const p2 = game.p, e2 = game.e;
    for (const ri of [0,1,2,2,3]) spawnUnit(p2, ri, false, 1400);
    for (let i=0;i<5;i++) spawnUnit(e2, i%3, false, 1560+i*15);
    sim(1); orderPoint(p2, 500); sim(32); const n0 = p2.units.length;
    out.back = p2.units.filter(u=>Math.abs(u.x-u.px)<=1.5).length; out.backN = n0;
    // allure : sous l'aura du héros, l'ordre avance aussi vite qu'une charge
    newGame('HUM', 1, false); game.aiThink = 1e9; const p3 = game.p;
    spawnUnit(p3, 0, false, 300); spawnUnit(p3, 0, false, 300); spawnHero(p3); const h3 = p3.units[2]; h3.x = 200; h3.ord = 'hold'; h3.holdX = 200;
    p3.units[0].ord = 'point'; p3.units[0].px = 2400; sim(3);
    out.pace = Math.abs(p3.units[0].x - p3.units[1].x) < 3;
    // invité → hôte : même bloc (applyPointIds = assignPoint), ordre persistant
    newGame('HUM', 1, false); game.aiThink = 1e9; const e4 = game.e;
    for (const ri of [0,1,2,3,4,5]) spawnUnit(e4, ri, false, WORLD-300);
    applyCmd({c:'point', x:2600, ids:[]});
    const ok4 = e4.units.every(u=>u.ord==='point') && Math.abs((Math.min(...e4.units.filter(u=>!u.fly).map(u=>u.px))+Math.max(...e4.units.filter(u=>!u.fly).map(u=>u.px)))/2 - 2600) < 1;
    sim(26); out.guestCmd = ok4 && e4.units.filter(u=>u.role!=='gremlin').every(u=>u.ord==='point' && Math.abs(u.x-u.px)<=1.5);
    return out; });
  check(r.hold, `posté sur le point : riposte aux ennemis à portée sans quitter sa place (dérive max ${r.drift.toFixed(1)} px)`);
  check(r.back===r.backN, `point en arrière sous la poursuite : ${r.back}/${r.backN} unités décrochent et l'atteignent`);
  check(r.pace, 'sous l\'aura du héros, l\'ordre de position avance à la même allure qu\'une charge');
  check(r.guestCmd, 'commande en ligne « point » : l\'hôte place le même bloc compact, centré sur le point');
  // APPUI LONG tactile (vrais évènements tactiles), juste à côté de ses propres troupes : ordre, pas sélection
  await page.evaluate(() => { newGame('HUM', 1, false); game.aiThink = 1e9; camFollow = false; spawnUnit(game.p, 2, false, 600); spawnUnit(game.p, 0, false, 590); R(); });
  const [tx, ty] = await page.evaluate(() => toPage(w2sX(612), w2sY(gY(612))-20));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:tx, y:ty }] });
  await page.waitForTimeout(200);
  await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x:tx+5, y:ty+3 }] });   // léger tremblement du doigt
  await page.waitForTimeout(400);
  const mid = await page.evaluate(() => game.p.units.map(u=>u.ord).join());            // doigt encore posé
  await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  await page.waitForTimeout(50);
  const lp = await page.evaluate(() => ({ ord: game.p.units.map(u=>u.ord).join(), sel: game.sel.size, flags: (game.flags||[]).length, want: s2wX(w2sX(612)) }));
  check(mid==='point,point' && lp.sel===0 && lp.flags===1, 'appui long tactile (doigt qui tremble, tout près de ses troupes) : l\'ordre part dès 450 ms, sans sélectionner');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await ctx.close();
}

console.log('\nGRÈVE GÉNÉRALE / MISE À JOUR FORCÉE');
{ const { page, errs, ctx } = await open();
  const r = await page.evaluate(() => { const out = {};
    const freeze = (fac, we) => {
      newGame(fac, 1, false); game.aiThink = 1e9; const p = game.p, e = game.e;   // t = 0 : ni usure du monde ni cycle d'événements
      for (const ri of [0,2,2,1,3]) spawnUnit(p, ri, false, 1300);
      spawnUnit(p, 5, false, 1190); const med = p.units[p.units.length-1];
      spawnUnit(p, 2, false, 1130); const hurt = p.units[p.units.length-1]; hurt.hp *= 0.5; const hurtHp = hurt.hp;   // blessé à l'abri, à portée du soin
      for (let i=0;i<4;i++) spawnUnit(e, i%3, false, 1420+i*12);
      spawnHero(e, 0.2); const eh = e.units[e.units.length-1]; eh.x = 1400;   // légende affaiblie : le combat dure
      const x0 = new Map(p.units.map(u=>[u, u.x])), ehp0 = e.units.reduce((a,u)=>a+u.hp,0), eh0 = eh.hp;
      const s = game.e.slots[0]; s.b = mkB(game.e, 'wall'); s.owner = game.e; s.x = 1330; const wall0 = s.b.hp;   // un bâtiment ennemi à portée
      game.weather = we;
      let moved = 0, healed = 0; for (let i=0;i<20*8;i++){ game.aiThink = 1e9; const hp = new Map(p.units.map(u=>[u, u.hp])); update(0.05);
        for (const u of p.units){ if (x0.has(u) && Math.abs(u.x-x0.get(u))>0.01) moved++; if (hp.has(u) && u.hp > hp.get(u)+5) healed++; } if (game.weather!==we) break; }
      return { moved, dmg: ehp0 - e.units.reduce((a,u)=>a+Math.max(0,u.hp),0), hero: eh.hp < eh0 || !e.units.includes(eh), wall: s.b? wall0 - s.b.hp : 'détruit', heal: healed>0 || hurt.hp > hurtHp, frozen: facFrozen(fac) };
    };
    out.hum = freeze('HUM', 'strike'); out.ia = freeze('IA', 'patch');
    // capture : une faction figée ne prend pas un lac (même seule dessus)
    newGame('HUM', 1, false); game.aiThink = 1e9; game.t = 200; for (let i=0;i<5;i++) spawnUnit(game.p, 0, false, game.nodes[0].x);
    game.weather = 'strike'; game.wClock = 31; for (let i=0;i<20*6;i++){ game.aiThink = 1e9; update(0.05); }
    out.cap = game.nodes[0].prog === 0;
    // explication : à la 1re grève de la partie seulement
    newGame('HUM', 1, false); game.aiThink = 1e9; game.t = 125; game.wClock = 29.9;
    for (let i=0;i<4;i++) update(0.05); const sub1 = game.msg && game.msg.sub;
    game.wClock = 29.9 + 150 - 0.1; for (let i=0;i<20*16;i++){ game.aiThink = 1e9; update(0.05); }
    game.msg = null; for (let i=0;i<20*140 && game.weather!=='strike';i++){ game.aiThink = 1e9; update(0.05); }
    out.sub1 = sub1 === tr('evx_strike_hum');   // asymétrie (v1.17) : ligne propre à la faction du joueur
    out.sub2 = !(game.msg && game.msg.sub);
    return out; });
  for (const k of ['hum','ia']){ const o = r[k];
    check(o.frozen!==undefined && o.moved===0 && o.dmg>0 && o.hero && o.heal && o.wall===0,
      `${k==='hum'? 'grève (humains)' : 'mise à jour forcée (machines)'} : 0 déplacement, ${o.dmg.toFixed(0)} dégâts infligés aux unités (héros ennemi compris), médic/ruche qui soigne, bâtiment à portée épargné` + (o.moved===0 && o.dmg>0 && o.hero && o.heal && o.wall===0? '' : ' — '+JSON.stringify(o))); }
  check(r.cap, 'une faction figée ne capture pas un lac, même seule dessus');
  check(r.sub1 && r.sub2, 'la 1re grève de la partie s\'annonce avec sa ligne d\'explication, pas les suivantes');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await ctx.close();
}

console.log('\nPOSTURES DU HÉROS (mesurées)');
{ const { page, errs, ctx } = await open();
  const r = await page.evaluate(() => { const out = {};
    for (const hs of HERO_STANCES){
      newGame('HUM', 1, false); game.aiThink = 1e9; const p = game.p, e = game.e;
      for (let i=0;i<8;i++) spawnUnit(p, [0,1,2,0,2,1,0,3][i], false, 400+i*12);
      p.heroStance = hs; spawnHero(p); const h = p.units.find(u=>u.role==='hero'); h.x = 380; setStance(p, 'charge');
      for (let i=0;i<4;i++){ spawnUnit(e, [0,1,2,0][i], false, 1950+i*14); const u=e.units[e.units.length-1]; u.ord='hold'; u.holdX=1900; }
      let sum = 0, n = 0, maxAhead = -1e9, firstHit = null;
      for (let i=0;i<20*16;i++){ game.aiThink = 1e9; update(0.05); if (!p.units.includes(h)) break;
        const fr = armyFront(p, h); if (fr!==null && i>40 && i%5===0){ const d = h.x-fr; sum += d; n++;
          const lead = Math.max(...p.units.filter(a=>a!==h && !a.fly && a.role!=='support').map(a=>a.x)); maxAhead = Math.max(maxAhead, h.x-lead); }
        if (firstHit===null && h.atkN>0) firstHit = +(i*0.05).toFixed(1); }
      // sous « tenir » : l'offensif part seul, les deux autres restent avec la ligne
      newGame('HUM', 1, false); game.aiThink = 1e9; const q = game.p;
      for (let i=0;i<6;i++) spawnUnit(q, i%3, false, 900+i*8); q.heroStance = hs; spawnHero(q); const g = q.units.find(u=>u.role==='hero'); g.x = 800;
      setStance(q, 'hold'); for (let i=0;i<20*6;i++){ game.e.units.length = 0; game.aiThink = 1e9; update(0.05); }
      out[hs] = { mean: Math.round(sum/Math.max(1,n)), maxAhead: Math.round(maxAhead), firstHit, hold: Math.round(g.x - armyFront(q, g)) };
    }
    // PRUDENT blessé : rentre, se remet à la base, repart au front
    newGame('HUM', 1, false); game.aiThink = 1e9; const p = game.p; p.heroStance = 'prudent';
    for (let i=0;i<5;i++) spawnUnit(p, 0, false, 1300); for (const u of p.units){ u.ord='hold'; u.holdX=1300; }
    spawnUnit(p, 5, false, p.x+200);   // un médic à la base : c'est lui qui le remet sur pied
    spawnHero(p); const h = p.units.find(u=>u.role==='hero'); h.x = 1250; h.hp = h.maxhp*0.3;
    let atBase = false, back = false;
    for (let i=0;i<20*60;i++){ game.e.units.length = 0; game.aiThink = 1e9; update(0.05);
      if (h.hstate==='flee' && Math.abs(h.x-(p.x+150))<10) atBase = true;
      if (atBase && h.hstate==null && h.x > 1200){ back = true; break; } }
    out.cycle = atBase && back;
    return out; });
  const P = r.prudent, N = r.normal, O = r.offensive;
  console.log(`    héros − front du gros de la troupe (charge) ; « max » = avance sur l'unité de tête : prudent ${P.mean} px, avec la troupe ${N.mean} px, offensif ${O.mean} px (max ${O.maxAhead}) · 1re frappe ${P.firstHit}/${N.firstHit}/${O.firstHit} s · sous « tenir » : ${P.hold}/${N.hold}/${O.hold} px`);
  check(P.mean<=-30 && P.maxAhead<=0, `PRUDENT : en seconde ligne (${P.mean} px derrière le front en moyenne, jamais devant)`);
  check(N.mean>-30 && N.mean>P.mean+15 && N.maxAhead<=1, `AVEC LA TROUPE : au front (${N.mean} px du front du gros de la troupe), jamais devant sa tête (max ${N.maxAhead} px)`);
  check(O.maxAhead>=60 && O.mean>N.mean+20, `OFFENSIF : fonce devant la troupe (jusqu'à ${O.maxAhead} px), engage le premier`);
  check(P.hold<=-30 && Math.abs(N.hold)<=2 && O.hold>=300, 'sous « tenir » : prudent en retrait, avec la troupe sur la ligne, offensif part à l\'assaut');
  check(r.cycle, 'PRUDENT blessé : rentre à la base, s\'y fait soigner, puis repart au front');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await ctx.close();
}

console.log('\nGUIDE (menu) ET TEXTES');
{ const { page, errs, ctx } = await open();
  const r = await page.evaluate(() => { const out = {};
    const m = document.getElementById('menu'); m.style.display = 'flex';
    document.querySelector('.tab[data-page="guide"]').click();
    out.visible = getComputedStyle(document.getElementById('page-guide')).display!=='none';
    out.langs = Object.keys(I18N).map(L => { SETTINGS.lang = L; applyLang();
      const secs = [...document.querySelectorAll('#guideBox details')];
      const keys = document.querySelectorAll('#guideBox .gKeys b').length;
      const keysOk = keys === Object.keys(DEFKEYS).length + guideTbl().gestures.length;
      const filled = secs.length===12 && secs.every(d => d.querySelector('summary').textContent.length>2 && d.querySelector('.gBody').textContent.length>40);
      const evx = ['strike','patch','rain','signal','bonuszone','acid','heat','flood','sand','nuke','meteor','lake','zone'].every(k => I18N[L]['evx_'+k])
        && ['prudent','normal','offensive'].every(s => I18N[L]['hsx_'+s] && I18N[L]['hst_'+s]) && I18N[L].tab_guide;
      return (filled && keysOk && evx)? '' : L; }).filter(Boolean);
    SETTINGS.lang = 'fr'; applyLang();
    return out; });
  check(r.visible && !r.langs.length, 'onglet GUIDE : 12 rubriques remplies, raccourcis réels, explications d\'événements et de postures dans les 9 langues'+(r.langs.length? ' — manque : '+r.langs.join(',') : ''));
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await ctx.close();
}

await browser.close();
console.log(`\n${fails? '✗ '+fails+' ÉCHEC(S)' : '✓ TOUT VERT'} — ${((Date.now()-t0)/1000).toFixed(0)} s`);
process.exit(fails? 1 : 0);
