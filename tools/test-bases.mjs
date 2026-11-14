/* tools/test-bases.mjs — FUMÉE DE RENDU des bases et des bâtiments (Playwright).
   Cuit et dessine chaque base (2 factions × 5 ères × transcendance × 3 fortifications × 3 états
   de dégâts × 2 côtés), avec garnison (y compris l'état réduit d'un invité en ligne), la
   transition d'ère, la nuit d'un lieu de campagne, puis chaque bâtiment à chaque ère et niveau.
   Échoue sur toute exception ou sur un sprite de base vide.
   Prérequis : npm run dev. Lancer : node tools/test-bases.mjs */
import { chromium } from 'playwright-core';
const GAME = new URL('../la-derniere-bataille.html', import.meta.url).href;
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.addInitScript(() => { window.requestAnimationFrame = () => 0;
  try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
    localStorage.setItem('agi_settings', JSON.stringify({ quality:'high', lang:'fr', music:false, sfx:false })); } catch(e){} });
await page.goto(GAME); await page.waitForTimeout(400);
const r = await page.evaluate(() => {
  const out = { n:0, blank:[], thrown:[], bld:0, ms:0 };
  const R = () => { ctx.setTransform(SCALE,0,0,SCALE,0,0); render(1/60); };
  const filled = cv => { const c = cv.getContext('2d'), d = c.getImageData(0,0,cv.width,cv.height).data; let n = 0;
    for (let i=3;i<d.length;i+=16) if (d[i]>0) n++; return n / (d.length/16); };
  document.getElementById('menu').style.display = 'none';
  for (const fac of ['HUM','IA']){
    newGame(fac, 1, false); game.aiThink = 1e9; camFollow = false;
    for (const S of [game.p, game.e]) for (let era=0; era<5; era++) for (const trans of (era===4? [false,true] : [false]))
      for (let fort=1; fort<=3; fort++) for (const hp of [1, 0.5, 0.2]){
        try {
          S.era = era; S.trans = trans; S.fortLvl = fort; S.maxhp = 3000; S.hp = 3000*hp; S._bs = null; S._btr = null;
          S.gar = fort===1? [] : fort===2? [{}, {}] : [0,1,2].map(i=>({fac:S.facKey, era, role:i? 'ranged':'siege', range:200, rate:1, atkT:1, bob:i}));
          camX = S.x - VW()/2; const t0 = performance.now(); R(); out.ms += performance.now()-t0; out.n++;
          const key = 'BASE'+S.facKey+era+(trans?'T':'')+fort+'d'+(hp<0.33?2:hp<0.66?1:0)+(S.side<0?'M':'');
          const spr = SPR.get(key+'@'+spriteSS());
          if (!spr || filled(spr) < 0.08) out.blank.push(key);
        } catch(e){ out.thrown.push(fac+' '+era+' '+fort+' '+hp+' : '+e.message); }
      }
    // transition d'ère en cours (l'ancienne base s'efface, la nouvelle monte)
    try { const S = game.p; S.era = 1; S._bs = null; R(); S.era = 2; for (let k=0;k<5;k++){ game.t += 0.3; R(); } } catch(e){ out.thrown.push('transition : '+e.message); }
    // bâtiments : chaque type, chaque ère, chaque niveau, garnisons comprises
    for (let era=0; era<5; era++) for (const lvl of [1,2,3]){ try {
      game.p.era = era; game.p.slots.forEach((sl,i)=>{ sl.b = mkB(game.p, ['wall','turret','farmF','farmM','well'][(i+lvl+era)%5]); sl.owner = game.p; sl.b.lvl = lvl; sl.b.age = 9; });
      camX = game.p.x; R(); out.bld += 3; } catch(e){ out.thrown.push('bâtiment ère '+era+' niv '+lvl+' : '+e.message); } }
  }
  // nuit de campagne (voile sombre + lueurs des bases)
  try { CAMP_SAVE.done = 5; campLaunch(0); cineEnd(); for (let i=0;i<5;i++){ update(0.05); R(); } } catch(e){ out.thrown.push('nuit : '+e.message); }
  return out;
});
await browser.close();
let fails = 0; const ok = m => console.log('  ✓ '+m), ko = m => { console.log('  ✗ '+m); fails++; };
console.log('\nBASES & BÂTIMENTS');
(r.thrown.length || errs.length) ? ko('exceptions : '+[...r.thrown, ...errs].slice(0,5).join(' | ')) : ok(r.n+' états de base + transition + nuit + '+r.bld+' bâtiments rendus sans exception');
r.blank.length ? ko('sprites de base vides : '+r.blank.slice(0,6).join(', ')) : ok('aucun sprite de base vide');
console.log('  · rendu moyen d\'une image (cuisson comprise) : '+(r.ms/r.n).toFixed(1)+' ms');
process.exit(fails? 1 : 0);
