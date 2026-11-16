/* tools/test-hero-follow.mjs — héros « Avec la troupe » : pas de scintillement marche/arrêt (audit #1), pas de va-et-vient
   devant le front (audit #2), pas de rejeu de l'entrée en scène au bord de l'écran (audit #3, #10).
   Prérequis : npm run dev.   Lancer : node tools/test-hero-follow.mjs (code 1 au moindre échec). */
import { chromium } from 'playwright-core';
const GAME = new URL('../la-derniere-bataille.html', import.meta.url).href;
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let fails = 0;
const check = (c, m) => { console.log((c? '  ✓ ' : '  ✗ ')+m); if (!c) fails++; };
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.addInitScript(() => { window.requestAnimationFrame = () => 0;
  localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
  localStorage.setItem('agi_settings', JSON.stringify({ quality:'high', lang:'fr', music:false, sfx:false })); });
await page.goto(GAME); await page.waitForTimeout(300);
await page.evaluate(() => { document.getElementById('menu').style.display = 'none';
  window.R = (dt) => { ctx.setTransform(SCALE,0,0,SCALE,0,0); render(dt); }; });

// bascules de l'état de marche DESSINÉ du héros (u._walk si le rendu l'expose, sinon le mouvement brut)
const run = (hz, roles, secs) => page.evaluate(([hz, roles, secs]) => {
  newGame('HUM', 1, false); game.aiThink = 1e9; camFollow = false; const p = game.p; p.stance = 'charge'; p.heroStance = 'normal';
  for (const [ri, x] of roles) spawnUnit(p, ri, false, x);
  spawnHero(p); const h = p.units.find(u => u.role==='hero'); h.x = 300; h._born = -9;
  camX = 200; camClamp(); const dt = 1/hz; let tog = 0, last = null, px = h.x;
  for (let i=0;i<secs*hz;i++){ game.aiThink = 1e9; update(dt); R(dt);
    const w = h._walk!==undefined? h._walk : Math.abs(h.x-px)>0.04; px = h.x;
    if (last!==null && w!==last) tog++; last = w; }
  return { tog, x:h.x }; }, [hz, roles, secs]);

console.log('\nHÉROS « avec la troupe » — scintillement marche/arrêt');
const a = await run(60, [[1,420],[1,430],[1,440],[1,450]], 4);
check(a.tog < 2, `front de tanks à 60 Hz : ${a.tog} bascule(s) en 4 s`);
const b = await run(144, [[1,420],[0,430],[2,410],[1,445],[0,425],[2,400]], 4);
check(b.tog < 2, `armée mixte à 144 Hz : ${b.tog} bascule(s) en 4 s`);

console.log('\nHÉROS « avec la troupe » — contact qui disparaît');
const c = await page.evaluate(() => {
  newGame('HUM', 1, false); game.aiThink = 1e9; camFollow = false; const p = game.p, e = game.e; p.stance = 'charge'; p.heroStance = 'normal';
  for (const x of [600,610,620,630]) spawnUnit(p, 1, false, x);
  spawnHero(p); const h = p.units.find(u => u.role==='hero'); h.x = 560; h._born = -9;
  for (let i=0;i<40;i++){ game.aiThink = 1e9; update(0.05); }
  // des ennemis factices passent au contact devant le front toutes les 2 s et meurent 1 s plus tard (cible qui disparaît puis revient) :
  // le héros ne doit pas faire le va-et-vient devant/derrière le front
  const front = () => Math.max(...p.units.filter(u=>u.role==='tank').map(u=>u.x));
  let en = null, ahead = 0, maxAhead = 0, flips = 0, lastS = 0, px = h.x;
  for (let i=0;i<200;i++){ game.aiThink = 1e9;
    if (i%40===0){ spawnUnit(e, 0, false, front()+150); en = e.units[e.units.length-1]; en.spd = 0; en.hp = en.maxhp = 1e6; }
    if (i%40===20 && en) en.hp = 0;
    update(0.05);
    const f = front(); if (h.x > f+4) ahead++; maxAhead = Math.max(maxAhead, h.x-f);
    const s = Math.sign(h.x-px); if (Math.abs(h.x-px)>0.01){ if (lastS && s!==lastS) flips++; lastS = s; } px = h.x; }
  return { ahead, maxAhead, flips };
});
check(c.flips <= 2, `peu d'inversions de sens du héros (${c.flips}), avance max devant le front ${c.maxAhead.toFixed(0)} px`);

console.log('\nENTRÉE EN SCÈNE — _born fixé à la création, démarche non rejouée hors champ');
const d = await page.evaluate(() => {
  newGame('HUM', 1, false); game.aiThink = 1e9; camFollow = false; camX = 0; camClamp(); const p = game.p;
  spawnUnit(p, 0, false, 2500); spawnHero(p);
  const u = p.units[0], h = p.units.find(x=>x.role==='hero');
  const o = { bornU: u._born, bornH: h._born, t: game.t };
  game.t = 30; h.x = 2600; for (let i=0;i<5;i++){ update(0.05); R(1/60); }     // hors champ pendant ce temps
  o.wxU = u._wx !== undefined; o.wxH = h._wx !== undefined;
  camX = 2300; camClamp(); const n0 = particles.length; R(1/60);
  o.born2 = u._born; o.dust = particles.length - n0;
  return o; });
check(d.bornU!==undefined && d.bornH!==undefined, `_born fixé à la création (unité ${d.bornU}, héros ${d.bornH})`);
check(d.born2===d.bornU && d.dust<=2, `entrer dans le champ ne rejoue pas l'apparition (_born ${d.born2}, ${d.dust} particules)`);
check(d.wxU && d.wxH, '_wx mis à jour même hors champ');
check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
await browser.close();
if (fails){ console.log('\n'+fails+' échec(s)'); process.exit(1); }
