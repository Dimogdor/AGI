/* tools/test-asym-lots23.mjs — mécaniques d'asymétrie des lots 2-3 (docs/audit/FACTIONS.md : M2, M3, M4, M6, M7, M9), une par interrupteur ASYM.
   Vérifie l'effet de chaque mécanique ET que l'interrupteur coupé redonne l'ancien comportement. Prérequis : npm run dev. Code 1 au moindre échec. */
import { chromium } from 'playwright-core';
const GAME = new URL('../la-derniere-bataille.html', import.meta.url).href;
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ viewport:{ width:1280, height:720 } }); const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.addInitScript(() => { window.requestAnimationFrame = () => 0;
  try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
    localStorage.setItem('agi_settings', JSON.stringify({ quality:'low', lang:'fr', music:false, sfx:false })); } catch(e){} });
await page.goto(GAME); await page.waitForTimeout(300);
let fails = 0;
const check = (c, m) => { console.log((c? '  ✓ ' : '  ✗ ')+m); if (!c) fails++; };
const run = (fn, ...a) => page.evaluate(fn, ...a);
const fresh = (l, r) => page.evaluate(([l, r]) => { newGame(l, 1, false, r); game.aiThink = 1e9; game.p.f = game.p.m = game.p.w = game.e.f = game.e.m = game.e.w = 5000; Math.random = () => 0.5; return true; }, [l, r]);
const spawn = (sd, ri, x) => page.evaluate(([sd, ri, x]) => { const s = sd==='p'? game.p : game.e; spawnUnit(s, ri); const u = s.units[s.units.length-1]; u.x = x; return true; }, [sd, ri, x]);

console.log('M2 · unités');
await fresh('HUM', 'IA');
for (const x of [1000, 1020, 1040, 1060]) await spawn('p', 0, x);
const k = await run(() => [unitK(game.p.units[1], null, game.p), (game.asym = {unit:false}, unitK(game.p.units[1], null, game.p))]);
check(k[0] > 1.09 && k[0] <= 1.15 + 1e-9 && k[1] === 1, `coude à coude : ×${k[0].toFixed(2)} avec 3 voisins, ×1 interrupteur coupé`);
await fresh('IA', 'HUM'); await spawn('p', 2, 1000);
const ex = await run(() => { const u = game.p.units[0], t = { role:'melee', hp:10, maxhp:100 }; const a = unitK(u, t, game.p); t.hp = 90; return [a, unitK(u, t, game.p)]; });
check(ex[0] > 1 && ex[1] === 1, `exécution machine : ×${ex[0]} sous 50 % de PV, ×1 au-dessus`);
const tgt = await run(() => { const p = game.p, e = game.e; p.units.length = 0; e.units.length = 0; spawnUnit(p, 2); const sh = p.units[0]; sh.x = 1000; sh.atkT = 0; sh.range = 400;
  spawnUnit(e, 1); spawnUnit(e, 1); const [a, b] = e.units; a.x = 1100; b.x = 1250; b.hp = b.maxhp*0.3; const hb = b.hp, ha = a.hp; game.asym = {}; update(0.05); return [ha - a.hp, hb - b.hp]; });
check(tgt[1] > 0 && tgt[0] === 0, 'tireur machine : vise l\'ennemi le plus entamé plutôt que le plus proche');

console.log('M3 · soin et recyclage');
await fresh('HUM', 'IA');
await spawn('p', 0, 1000); await spawn('p', 5, 1010);
const rel = await run(() => { const u = game.p.units[0]; u.hp = -5; update(0.05); return [game.p.units.includes(u), u.hp / u.maxhp, game.p.units[1].relAt > game.t]; });
check(rel[0] && Math.abs(rel[1]-0.25) < 0.05 && rel[2], `relève : l'allié mourant survit à ${Math.round(rel[1]*100)} % et la charge du médic se recharge`);
const rel2 = await run(() => { const u = game.p.units[0]; u.hp = -5; update(0.05); return game.p.units.includes(u); });
check(!rel2, 'relève : pas de seconde relève pendant la recharge');
await fresh('IA', 'HUM'); await spawn('p', 1, 300);
const rc = await run(() => { const s = game.p, m0 = s.m; s.units[0].hp = -1; update(0.05); return s.m - m0; });
check(rc > 3, `recyclage : une perte près de la base rend ${rc.toFixed(1)} 🪙/◈`);

console.log('M4 · rythme');
await fresh('HUM', 'IA'); await spawn('p', 0, 1000); await spawn('e', 0, 1100);
const mo = await run(() => { const p = game.p, e = game.e; p.morale = 50; e.units[0].hp = -1; update(0.05); return p.morale; });
check(mo > 51.5, `moral : +2 par ennemi tué (${mo.toFixed(1)})`);
await fresh('IA', 'HUM'); await spawn('p', 0, 1000);
const cool = await run(() => { const s = game.p; s.w = 100; s.units[0].heat = 0.5; const w0 = s.w; for (let i=0;i<20;i++) update(0.05); const a = [w0 - s.w, s.units[0].heat]; game.asym = {rhythm:false}; return a; });
check(cool[1] < 0.47, `refroidissement actif : chaleur ${cool[1].toFixed(3)} (0,03/s seul donnerait 0.470)`);

console.log('M7 · pouvoirs');
await fresh('HUM', 'IA'); await spawn('p', 0, 1000); await spawn('e', 1, 1500); await spawn('e', 0, 1520);
const up = await run(() => { const p = game.p, e = game.e; p.units[0].hp = p.units[0].maxhp*0.5; p.units[0].tiredT = 3; p.xp = 999; p.specialCd = 0; const ehp = e.units.map(u=>u.hp); trySpecial(p); return [p.units[0].hp / p.units[0].maxhp, p.units[0].tiredT, ehp[0] - e.units[0].hp]; });
check(up[0] > 0.65 && up[1] === 0 && up[2] > 0, `Soulèvement : troupes soignées (${Math.round(up[0]*100)} %) et reposées, ennemis touchés (${up[2].toFixed(0)})`);
await fresh('IA', 'HUM'); for (let i=0;i<7;i++) await spawn('e', 1 + (i%2), 1500 + i*20);
const st = await run(() => { const p = game.p, e = game.e; p.xp = 999; p.specialCd = 0; e.units.forEach(u => u.hp = u.maxhp = 1e5); const hp0 = e.units.map(u=>u.hp); trySpecial(p); const d = e.units.map((u,i)=>hp0[i]-u.hp).sort((a,b)=>b-a); return [d[0], d[4], d[5], d.join()]; });
check(st[0] > 3*st[2] && Math.abs(st[0]-st[1]) < 1e-6 , `Frappe chirurgicale : 5 cibles à ${st[0].toFixed(0)}, les autres à ${st[2].toFixed(0)}`);

console.log('M6 · héros');
await fresh('IA', 'HUM'); await run(() => { game.p.era = 2; tryHero(game.p); });
const fr = await run(() => { const s = game.p; const h = s.units.find(u=>u.role==='hero'); h.hp = -1; const n0 = s.units.filter(u=>u.role==='gremlin').length; update(0.05); return s.units.filter(u=>u.role==='gremlin').length - n0; });
check(fr === 5, `fragmentation : ${fr} drones à la mort de la Singularité`);
await fresh('HUM', 'IA'); await run(() => { tryHero(game.p); });
const ma = await run(() => { const s = game.p; const h = s.units.find(u=>u.role==='hero'); const m1 = s.morale; h.hp = -1; update(0.05); return [m1, s.morale, s.martyrT - game.t]; });
check(ma[0] === 100 && ma[1] > 95 && ma[2] > 15, `Che : moral ${ma[0]} à l'invocation, martyr ${ma[2].toFixed(0)} s à sa mort`);

console.log('M9 · transcendance');
await fresh('HUM', 'IA');
const tr = await run(() => { const s = game.p; s.trans = true; s.morale = 10; s.hp = s.maxhp; moraleTick(s, 0.05); const m = s.morale; for (let i=0;i<3;i++){ s.cd.fill(0); s.f = s.m = s.w = 5000; tryBuy(s, 5); } return [m, s.units.filter(u=>u.role==='support').length]; });
check(tr[0] >= 70 && tr[1] === 2, `HUM transcendée : moral ≥ 70 (${tr[0]}) et ${tr[1]} médics en file au niveau 0 (quota 1 + 1)`);
await fresh('IA', 'HUM'); await spawn('p', 0, 1000); await spawn('e', 0, 1050);
const ht = await run(() => { const s = game.p; s.trans = true; const u = s.units[0]; u.heat = 0.99; u.atkT = 0; for (let i=0;i<10;i++) update(0.05); return [u.tiredT, u.heat]; });
check(ht[0] === 0 && ht[1] <= 0.99 + 1e-9, 'IA transcendée : plus aucune surchauffe');

check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
await browser.close();
if (fails){ console.log('\n'+fails+' échec(s)'); process.exit(1); }
console.log('\ntout est bon');
