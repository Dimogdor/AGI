/* tools/test-factions.mjs — banc d'équilibrage des FACTIONS (Humanité ☭ / G·P·T Ω). Voir docs/audit/FACTIONS.md §3 et
   docs/audit/FACTIONS-BALANCE.md (mesures de référence et résultats par lot).
   Boucle gelée, Math.random à graine, update(0.05) sans rendu (≈ 1,4 s par partie de 23 min de jeu), 4 pages en parallèle.

   A  joueur scripté (__competent) contre l'IA du jeu, difficultés 0..3, une fois en HUM, une fois en IA
   B  bot contre bot (__competentSide joue LES DEUX camps, même cerveau), niveaux de bot 1..3, HUM à gauche et IA à gauche
   C  miroirs de contrôle HUM/HUM et IA/IA (le côté gauche ne doit pas gagner plus de ~50 %)
   D  ablation : chaque mécanique ASYM coupée seule (game.asym = {clé:false}) — écart de B
   E  A/B environnemental à graine fixe : coût de chaque événement forcé (valeur d'armée + ressources + base) par faction

   usage : node tools/test-factions.mjs [--full] [--game=copie.html] [--n=40] [--only=A,B,C,D,E] [--lv=1,2,3] [--seed=0] [--json=chemin.json] [--label=texte] [--workers=4]
   Sans --full : version LÉGÈRE (≈ 1–2 min) pour `npm run test:extra` : seuils larges, code 1 si un seuil est franchi.
   Avec --full : mesures complètes (n par défaut 40 par case ; B/C/D ×3), cibles du plan §3.3 affichées ; code 1 seulement
   sur une erreur JS ou une partie sans issue anormale (les cibles se lisent dans le tableau et dans FACTIONS-BALANCE.md).
   Prérequis : npm run dev. */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const BOTS = readFileSync(new URL('./_bots.js', import.meta.url), 'utf8');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--'+k+'=')); return a ? a.slice(k.length+3) : d; };
const GAME = 'file://' + (arg('game', '') || fileURLToPath(new URL('../la-derniere-bataille.html', import.meta.url)));   // --game=copie.html : mesurer une version figée pendant qu'on édite src/
const FULL = process.argv.includes('--full');
const N = +arg('n', FULL ? 40 : 12);
const ONLY = new Set(arg('only', 'A,B,C,D,E').split(','));
const WORKERS = +arg('workers', 4);
const LABEL = arg('label', '');
const ASYM_ARG = arg('asym', '') ? Object.fromEntries(arg('asym','').split(',').map(kv => { const [k,v] = kv.split(':'); return [k, v==='1'||v==='true']; })) : null;   // ex. --asym=env:0,econ:0 (B et E)
const TUNE = arg('tune', '');                       // --tune=IA.netStep=0.08,HUM.texD=0.85 : surcharge FAC_TRAITS (hors .env) avant chaque partie — réglage sans reconstruire
const SEED0 = +arg('seed', 0);                      // décale toutes les graines (mesures indépendantes)
const JSON_OUT = arg('json', '');

/* ---------- code injecté dans chaque page ---------- */
const HARNESS = `
const __LV = { 1:{every:60, pushN:12}, 2:{every:20, pushN:10}, 3:{every:10, pushN:8} };   // niveaux de bot : cadence de décision (ticks de 0,05 s) et taille de la vague
const __seed = s0 => { let s = (s0*7919 + 104729) % 2147483647; if (s<=0) s += 2147483646; Math.random = () => { s = (s*16807)%2147483647; return (s-1)/2147483646; }; };
const __neutralD = () => ({name:'BOT', inc:1, think:1, eraLag:0, hpMul:1, cheat:1});
const __armyVal = s => { let v=0; for (const u of s.units){ if (u.role==='gremlin') continue;
    const ri = ROLES.findIndex(r=>r.key===u.role); const c = u.role==='hero'? HERO_COST : unitCost(s, ri<0?0:ri);
    let tot=0; for (const r in c) tot += c[r]; v += tot*Math.max(0,u.hp)/u.maxhp; } return v; };
function __runGame(cfg){
  __seed(cfg.seed);
  const bot = cfg.mode==='bot';
  newGame(cfg.left, bot? 1 : cfg.diff, false, cfg.right);
  if (bot){ game.d = __neutralD(); game.noKF = true; game.e.hp = game.e.maxhp = 1500; }
  if (cfg.asym) game.asym = cfg.asym;
  if (cfg.flat) game.biome = {terrain:{a:0,b:0,c:0,f1:0,f2:0,f3:0,base:0}};   // carte plate : isole le biais gauche/droite du relief
  const lv = __LV[cfg.lv||2], st1={}, st2={}, eraT = {HUM:[0,0,0,0,0], IA:[0,0,0,0,0]}, rate = {};
  const max = (cfg.maxMin||45)*1200; let n=0, bad=null;
  const fk = s => s.facKey;
  // OUVERTURE TIRÉE (audit n°2, A1) : sans aléa, bot contre bot jouait la MÊME ouverture à chaque graine (parties identiques à l'unité près
  // pendant ~4 min) : chaque case ne tirait qu'une seule trajectoire. On tire donc, par camp, le mélange d'unités (×0,6–1,4), la taille de
  // la vague (±2) et la phase de décision, comme le banc E. Ces tirages se font APRÈS newGame (graine déjà posée).
  const jm = () => [3,2,4,1,2,1].map(v => v*(0.6+0.8*Math.random()));
  const o1 = {pushN:lv.pushN + Math.floor(Math.random()*5) - 2, mix:jm()}, o2 = {pushN:lv.pushN + Math.floor(Math.random()*5) - 2, mix:jm()};
  const ph1 = Math.floor(Math.random()*lv.every), ph2 = Math.floor(Math.random()*lv.every);
  while (!game.over && n<max){
    if (bot) game.aiThink = 1e9;
    update(0.05); n++;
    if (n%20===0){
      for (const s of [game.p, game.e]) if (!eraT[fk(s)][s.era] && s.era) eraT[fk(s)][s.era] = game.t;
      if (n===12000 || n===21600){ for (const s of [game.p, game.e]){ const r = calcRates(s); (rate[fk(s)] = rate[fk(s)]||{})[n===12000?'r10':'r18'] = r.f+r.m+r.w; } }
    }
    if (bot){ if (n%lv.every===ph1) __competentSide(game.p, game.e, st1, o1); if (n%lv.every===ph2) __competentSide(game.e, game.p, st2, o2); }
    else if (n%20===0) __competent(st1, {});
    if (n%400===0) for (const s of [game.p, game.e]){ for (const k of ['f','m','w','xp','hp']) if (!Number.isFinite(s[k])) bad = bad || ('NaN '+k); for (const u of s.units) if (!Number.isFinite(u.x) || !Number.isFinite(u.hp)) bad = bad || ('NaN unité '+u.role); }
    if (bad) break;
  }
  // partie non terminée à la limite : le camp qui a le plus de base restante (PV + seconde phase) l'emporte
  let win = game.win; if (!game.over){ const rem = s => s.hp + (s.phase<2? 2.2*s.maxhp : 0); win = rem(game.p) > rem(game.e); }
  return { over:game.over, win, t:Math.round(game.t), bad, eraT, rate, era:[game.p.era, game.e.era] };
}
// A/B environnemental : mêmes graines, événement forcé à tf, mesure à tf+60 s (événements naturels et cataclysmes coupés)
const __EV = {
  rain:   g => { g.boonClock = 20; return ['b',15]; },   signal: g => { g.boonClock = 70; return ['b',15]; },
  strike: g => { g.wClock = 30; return ['w',15]; },      patch:  g => { g.wClock = 90; return ['w',15]; },
  acid:   g => { startCata('acid'); return ['c',13]; },  heat:   g => { startCata('heat'); return ['c',14]; },
  sand:   g => { startCata('sand'); return ['c',11]; },  flood:  g => { startCata('flood'); return ['c',9]; },
  winter: g => { g.winter = true; g.winterT = WINTER_DUR; return ['c',360]; },
};
function __runE(cfg){
  __seed(cfg.seed);
  newGame(cfg.left, 1, false, cfg.right); game.d = __neutralD(); game.noKF = true; game.e.hp = game.e.maxhp = 1500;
  if (cfg.asym) game.asym = cfg.asym;
  // sans cataclysme (coupés ici) la partie est DÉTERMINISTE : la graine ne change rien. On la fait donc varier dans le « cerveau » des bots
  // (mélange d'unités, taille de la vague, phase de décision) et dans l'heure de l'événement.
  const st1={}, st2={}, lv = __LV[2]; let n=0, forced=false, tEnd=1e9, kind='';
  const jm = () => [3,2,4,1,2,1].map(v => v*(0.6+0.8*Math.random())), o1 = {pushN:7+((cfg.seed%5)|0)+2, mix:jm()}, o2 = {pushN:7+((cfg.seed%7)%5)+2, mix:jm()}, ph = (cfg.seed%lv.every)|0;
  const T = (cfg.tf||240) + (cfg.seed%9)*10, M = 60;
  while (!game.over && game.t < T+M){
    game.aiThink = 1e9;
    const inWin = forced && game.t < tEnd;
    if (!(inWin && kind==='w')) game.wClock = 0;
    if (!(inWin && kind==='b')) game.boonClock = 0;
    if (!game.cata) game.cataCd = 1e9;
    if (!forced && cfg.ev && game.t >= T){ forced = true; const r = __EV[cfg.ev](game); kind = r[0]; tEnd = game.t + r[1] + 0.2; }
    update(0.05); n++;
    if (n%lv.every===ph){ __competentSide(game.p, game.e, st1, o1); __competentSide(game.e, game.p, st2, o2); }
  }
  const out = {};
  for (const s of [game.p, game.e]) out[s.facKey+(s===game.p?'':'2')] = { army:__armyVal(s), stock:s.f+s.m+s.w, hp:Math.max(0,s.hp), n:s.units.length };
  return { over:game.over, hb:!!game.hbombDone, v:out };   // hb : une base est déjà tombée (Bombe H, hiver) — paire écartée du bilan
}
`;

/* ---------- pool de pages ---------- */
const browser = await chromium.launch();
const errs = [];
async function mkPage(){
  const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text()); });
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0;
    try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
      localStorage.setItem('agi_settings', JSON.stringify({ quality:'low', lang:'fr', music:false, sfx:false })); } catch(e){} });
  await page.goto(GAME); await page.waitForTimeout(300);
  await page.evaluate(BOTS); await page.evaluate(HARNESS);
  if (TUNE) await page.evaluate(`for (const kv of ${JSON.stringify(TUNE)}.split(',')){ const [p, v] = kv.split('='); let path = p.split('.'); let o = FAC_TRAITS; if (path[0]==='AI_K'){ o = AI_K; path = path.slice(1); } else if (path[0]==='AI_KF'){ o = AI_KF; path = path.slice(1); } for (let i=0;i<path.length-1;i++) o = o[path[i]]; o[path[path.length-1]] = +v; }`);
  return page;
}
const pages = await Promise.all(Array.from({length:WORKERS}, mkPage));
async function runAll(jobs, fn, label){
  const res = new Array(jobs.length); let next = 0, done = 0; const t0 = Date.now();
  await Promise.all(pages.map(async page => { while (next < jobs.length){ const i = next++;
    try { res[i] = await page.evaluate(`${fn}(${JSON.stringify(jobs[i])})`); } catch(e){ errs.push(label+': '+e.message.slice(0,200)); res[i] = null; }
    done++; if (done%50===0) process.stderr.write(`  ${label} ${done}/${jobs.length} (${Math.round((Date.now()-t0)/1000)} s)\n`); } }));
  return res;
}
const pct = (w, n) => n? 100*w/n : NaN;
// IC de Wilson à 95 % d'une proportion (k sur n), en % : « 37,5 [33,7 ; 41,4] »
const wil = (pc, n) => { if (!n || !Number.isFinite(pc)) return [NaN, NaN]; const z = 1.96, p = pc/100, d = 1+z*z/n, c = p+z*z/(2*n), h = z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n)); return [100*(c-h)/d, 100*(c+h)/d]; };
const ci = (pc, n) => { const [a,b] = wil(pc, n); return `[${f1(a)} ; ${f1(b)}]`; };
const f1 = x => Number.isFinite(x)? x.toFixed(1) : '—';
const median = a => { const s = a.filter(Number.isFinite).sort((x,y)=>x-y); return s.length? s[s.length>>1] : NaN; };
const mn = a => a.length? a.reduce((x,y)=>x+y,0)/a.length : NaN;
const REPORT = { label:LABEL, full:FULL, n:N, at:new Date().toISOString().slice(0,10) };
const warn = []; const soft = (cond, msg) => { if (!cond) warn.push(msg); };
let fails = 0;

/* ---------- A : joueur scripté contre l'IA ---------- */
if (ONLY.has('A')){
  const diffs = FULL? arg('diffs','0,1,2,3').split(',').map(Number) : [2];   // --diffs=2 : une seule difficulté
  const jobs = []; for (const fac of ['HUM','IA']) for (const diff of diffs) for (let s=0;s<N;s++) jobs.push({mode:'vs', left:fac, right:undefined, diff, seed:SEED0+1000+s*13+diff});
  const res = await runAll(jobs, '__runGame', 'A');
  console.log('\nA — joueur scripté contre l\'IA (victoires du joueur ; une partie non terminée à 45 min est jugée sur la base restante)');
  console.log('  difficulté      HUM [IC 95 %]            IA [IC 95 %]             écart   durée médiane HUM/IA');
  REPORT.A = {};
  for (const diff of diffs){
    const row = {};
    for (const fac of ['HUM','IA']){
      const r = res.filter((x,i)=>x && jobs[i].left===fac && jobs[i].diff===diff);
      const w = r.reduce((a,x)=>a+(x.win?1:0), 0);
      row[fac] = { win:pct(w,r.length), dur:median(r.map(x=>x.t)), n:r.length, unfinished:r.filter(x=>!x.over).length, bad:r.filter(x=>x.bad).length };
      fails += r.filter(x=>x.bad).length;
    }
    REPORT.A[diff] = row;
    console.log(`  ${['Facile','Normal','Difficile','Brutal'][diff].padEnd(11)}  ${f1(row.HUM.win).padStart(6)} % ${ci(row.HUM.win,row.HUM.n).padEnd(14)} ${f1(row.IA.win).padStart(6)} % ${ci(row.IA.win,row.IA.n).padEnd(14)} ${f1(Math.abs(row.HUM.win-row.IA.win)).padStart(5)}    ${row.HUM.dur}/${row.IA.dur} s${row.HUM.unfinished+row.IA.unfinished? '  (non terminées '+(row.HUM.unfinished+row.IA.unfinished)+')':''}`);
    if (!FULL) soft(Math.abs(row.HUM.win-row.IA.win) <= 40, `A diff ${diff} : écart HUM/IA ${f1(Math.abs(row.HUM.win-row.IA.win))} pts (> 40, bruit n=${N} compris)`);
  }
}

/* ---------- B : bot contre bot ---------- */
async function benchB(lvs, n, asym, label){
  const jobs = []; for (const lv of lvs) for (const left of ['HUM','IA']) for (let s=0;s<n;s++) jobs.push({mode:'bot', left, right:left==='HUM'?'IA':'HUM', lv, seed:SEED0+5000+s*17+lv, asym});
  const res = await runAll(jobs, '__runGame', label);
  const out = {};
  for (const lv of lvs){
    const sel = (left) => res.map((x,i)=>[x,jobs[i]]).filter(([x,j])=>x && j.lv===lv && j.left===left).map(([x])=>x);
    const L = sel('HUM'), R = sel('IA');                               // L : HUM à gauche ; R : IA à gauche
    const humW = L.reduce((a,x)=>a+(x.win?1:0), 0) + R.reduce((a,x)=>a+(x.win?0:1), 0);
    const all = L.concat(R);
    fails += all.filter(x=>x.bad).length;
    const eraAvg = (fac, e) => mn(all.map(x=>x.eraT[fac][e]).filter(v=>v>0));
    out[lv] = { hum:pct(humW, all.length), humLeft:pct(L.reduce((a,x)=>a+(x.win?1:0),0), L.length), humRight:pct(R.reduce((a,x)=>a+(x.win?0:1),0), R.length),
      n:all.length, dur:median(all.map(x=>x.t)), unfinished:all.filter(x=>!x.over).length,
      era3:{HUM:eraAvg('HUM',3), IA:eraAvg('IA',3)}, era4:{HUM:eraAvg('HUM',4), IA:eraAvg('IA',4)},
      r10:{HUM:mn(all.map(x=>x.rate.HUM&&x.rate.HUM.r10).filter(Number.isFinite)), IA:mn(all.map(x=>x.rate.IA&&x.rate.IA.r10).filter(Number.isFinite))},
      r18:{HUM:mn(all.map(x=>x.rate.HUM&&x.rate.HUM.r18).filter(Number.isFinite)), IA:mn(all.map(x=>x.rate.IA&&x.rate.IA.r18).filter(Number.isFinite))} };
  }
  return out;
}
let B2 = null;
if (ONLY.has('B')){
  const lvs = FULL? arg('lv','1,2,3').split(',').map(Number) : [2], n = N*2;       // n par placement
  const out = await benchB(lvs, n, ASYM_ARG, 'B'); B2 = out[2];
  console.log('\nB — bot contre bot (victoires HUM, %, HUM+IA placements confondus ; n = ' + (n*2) + ' par niveau)');
  console.log('  niveau   HUM % [IC 95 %]   (HUM à gauche / à droite)   durée méd.   ère III HUM/IA   ère IV HUM/IA   revenu 10 min HUM/IA   18 min HUM/IA');
  for (const lv of lvs){ const o = out[lv];
    console.log(`  ${String(lv).padEnd(6)}  ${f1(o.hum).padStart(5)} ${ci(o.hum,o.n)}   (${f1(o.humLeft)} / ${f1(o.humRight)})            ${String(o.dur).padStart(5)} s    ${Math.round(o.era3.HUM)}/${Math.round(o.era3.IA)} s       ${Math.round(o.era4.HUM)}/${Math.round(o.era4.IA)} s        ${f1(o.r10.HUM)}/${f1(o.r10.IA)}              ${f1(o.r18.HUM)}/${f1(o.r18.IA)}${o.unfinished? '   (non terminées '+o.unfinished+')':''}`);
    if (!FULL) soft(Math.abs(o.hum-50) <= 18, `B niveau ${lv} : HUM ${f1(o.hum)} % (hors 50 ± 18, bruit n=${o.n} compris)`); }
  REPORT.B = out;
}

/* ---------- C : miroirs de contrôle ---------- */
if (ONLY.has('C')){
  const n = N*2, jobs = [];
  for (const flat of [false, true]) for (const fac of ['HUM','IA']) for (let s=0;s<n;s++) jobs.push({mode:'bot', left:fac, right:fac, lv:2, flat, seed:SEED0+9000+s*19, asym:ASYM_ARG});
  const res = await runAll(jobs, '__runGame', 'C');
  console.log('\nC — miroirs de contrôle (victoire du camp de GAUCHE, bot niveau 2 ; cible 50 ± 6). Le relief (gY) n\'est pas symétrique : « carte plate » l\'isole.');
  REPORT.C = {};
  for (const flat of [false, true]) for (const fac of ['HUM','IA']){
    const r = res.filter((x,i)=>x && jobs[i].left===fac && !!jobs[i].flat===flat);
    const w = r.reduce((a,x)=>a+(x.win?1:0), 0), decisive = r.filter(x=>x.over);
    REPORT.C[fac+(flat?'-flat':'')] = { leftWin:pct(w,r.length), n:r.length, dur:median(r.map(x=>x.t)), leftWinDecisive:pct(decisive.filter(x=>x.win).length, decisive.length) }; fails += r.filter(x=>x.bad).length;
    console.log(`  ${fac}/${fac} ${flat? 'carte plate' : 'relief     '}  gauche ${f1(pct(w,r.length))} % ${ci(pct(w,r.length), r.length)}   (n=${r.length}, durée médiane ${median(r.map(x=>x.t))} s, parties décidées ${decisive.length} : gauche ${f1(pct(decisive.filter(x=>x.win).length, decisive.length))} %)`);
    if (!FULL && flat) soft(Math.abs(pct(w,r.length)-50) <= 22, `C ${fac}/${fac} carte plate : gauche ${f1(pct(w,r.length))} %`);
  }
}

/* ---------- D : ablation ---------- */
const MECHS = (process.env.ASYM_KEYS || 'env,terrain,bld,econ').split(',');
if (ONLY.has('D') && FULL){
  const n = N*3;
  const base = (await benchB([2], n, null, 'D-on'))[2];
  console.log(`\nD — ablation (HUM %, bot niveau 2, n=${n*2} ; référence « tout activé » ${f1(base.hum)} % ${ci(base.hum, base.n)})`);
  REPORT.D = { all:base.hum };
  for (const k of MECHS){
    const o = (await benchB([2], n, {[k]:false}, 'D-'+k))[2];
    REPORT.D[k] = o.hum;
    console.log(`  sans ${k.padEnd(8)}  HUM ${f1(o.hum).padStart(5)} % ${ci(o.hum, o.n)}   déplacement ${(o.hum-base.hum>=0?'+':'')+f1(o.hum-base.hum)} pts   (cible : |Δ| ≤ 10)`);
  }
}

/* ---------- E : événements forcés ---------- */
if (ONLY.has('E')){
  const evs = FULL? ['rain','signal','strike','patch','acid','heat','sand','flood','winter'] : ['rain','strike','acid'];
  const n = FULL? Math.max(N, 24) : 6, jobs = [];
  for (const left of ['HUM','IA']) for (let s=0;s<n;s++) for (const ev of [null, ...evs]) jobs.push({left, right:left==='HUM'?'IA':'HUM', seed:SEED0+700+s*23, ev, tf:240, asym:ASYM_ARG});
  const res = await runAll(jobs, '__runE', 'E');
  const key = new Map(); res.forEach((r,i)=>{ if (r) key.set(jobs[i].left+'|'+jobs[i].seed+'|'+jobs[i].ev, r); });
  const val = (r, fac) => { const side = r.v[fac] || r.v[fac+'2']; return side; };
  const tot = o => o.army + o.stock + 0.5*o.hp;
  console.log(`\nE — coût d'un événement forcé vers 4:00–5:30 (valeur = armée + ressources + ½ PV de base, mesurée 60 s plus tard ; Δ vs sans événement, en % de la valeur moyenne du camp)`);
  console.log('  événement   Δ HUM %    Δ IA %     (armée HUM/IA, stock HUM/IA, base HUM/IA en Δ absolu)');
  REPORT.E = {}; let sumH = 0, sumI = 0, cyc = 0; const nOk = {};
  let ref = []; for (const [k,r] of key) if (k.endsWith('|null') && !r.hb){ for (const fac of ['HUM','IA']) ref.push(tot(val(r,fac))); }
  const refMean = mn(ref);
  for (const ev of evs){
    const d = { HUM:[], IA:[] }, da = { HUM:[], IA:[] }, ds = { HUM:[], IA:[] }, dh = { HUM:[], IA:[] };
    for (const [k,r] of key){ if (!k.endsWith('|'+ev)) continue; const c = key.get(k.replace('|'+ev, '|null')); if (!c || r.hb || c.hb) continue; nOk[ev] = (nOk[ev]||0)+1;
      for (const fac of ['HUM','IA']){ const a = val(r,fac), b = val(c,fac); d[fac].push(tot(a)-tot(b)); da[fac].push(a.army-b.army); ds[fac].push(a.stock-b.stock); dh[fac].push(a.hp-b.hp); } }
    const H = mn(d.HUM)/refMean*100, I = mn(d.IA)/refMean*100;
    REPORT.E[ev] = { HUM:H, IA:I };
    if (['rain','signal','strike','patch','acid','heat','sand'].includes(ev)){ sumH += H; sumI += I; cyc++; }
    console.log(`  ${ev.padEnd(9)}  ${((H>=0?'+':'')+f1(H)).padStart(7)}   ${((I>=0?'+':'')+f1(I)).padStart(7)}   n=${nOk[ev]||0}  (${Math.round(mn(da.HUM))}/${Math.round(mn(da.IA))}, ${Math.round(mn(ds.HUM))}/${Math.round(mn(ds.IA))}, ${Math.round(mn(dh.HUM))}/${Math.round(mn(dh.IA))})`);
  }
  console.log(`  Σ cycle (pluie, signal, couvre-feu, mise à jour, acide, canicule, sable) : HUM ${f1(sumH)} %  IA ${f1(sumI)} %  écart ${f1(sumH-sumI)} pts (cible ≤ 3)`);
  REPORT.E.cycle = { HUM:sumH, IA:sumI, ref:refMean };
}

/* ---------- bilan ---------- */
if (errs.length){ fails++; console.log('\nErreurs JS :'); for (const e of [...new Set(errs)].slice(0,5)) console.log('  ✗ '+e); }
if (warn.length && !FULL){ for (const w of warn) console.log('  ✗ '+w); fails += warn.length; }
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(REPORT, null, 1));
await browser.close();
console.log(fails? `\n${fails} échec(s)` : '\ntout est bon'); process.exit(fails? 1 : 0);
