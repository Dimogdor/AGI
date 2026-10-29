/* tools/regression.mjs — suite de NON-RÉGRESSION jouée dans un vrai navigateur (Playwright).
   Couvre : chargement dans les 9 langues (+ traductions manquantes), tutoriel pas à pas puis
   joué de bout en bout par clics, réglages / onglets / touches / raccourcis, intro et fil
   d'actualités dans les 9 langues,
   parties complètes jusqu'à la victoire/défaite (4 difficultés, joueur passif et joueur actif),
   chaque cataclysme, rendu à chaque état du monde et chaque qualité, préchauffe de tous les
   sprites, pause sans accumulation, aller-retour de sérialisation réseau, écran de fin.
   Prérequis : npm run dev (régénère la-derniere-bataille.html), puis
     npm i --no-save playwright-core   et un Chromium (CHROME=/chemin/vers/chrome, sinon celui
     de Playwright : npx playwright-core install chromium)
   Lancer : npm test        (code de sortie 1 au moindre échec) */
import { chromium } from 'playwright-core';
const GAME = new URL('../la-derniere-bataille.html', import.meta.url).href;
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let fails = 0, warns = 0;
const ok = m => console.log('  ✓ '+m), ko = m => { console.log('  ✗ '+m); fails++; }, warn = m => { console.log('  ⚠ '+m); warns++; };
const check = (cond, m) => cond ? ok(m) : ko(m);
const t0 = Date.now();

async function open(lang='fr', quality='high'){
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  // boucle gelée : le test pilote lui-même update()/render() (déterministe, rapide)
  await page.addInitScript(([lang,quality]) => { window.requestAnimationFrame = () => 0;
    try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1');
      localStorage.setItem('agi_settings', JSON.stringify({ quality, lang, music:false, sfx:false })); } catch(e){} }, [lang,quality]);
  await page.goto(GAME); await page.waitForTimeout(400);
  await page.evaluate(() => {
    let s = 20251031; Math.random = () => { s = (s*16807)%2147483647; return (s-1)/2147483646; };   // reproductible
    const m = document.getElementById('menu'); if (m) m.style.display = 'none';
  });
  return { page, errs };
}

console.log('\nCHARGEMENT + 9 LANGUES');
{ const langs = ['fr','en','es','de','it','pt','ru','zh','ar'];
  const { page } = await open();
  const miss = await page.evaluate(() => { const out = {}; const ref = Object.keys(I18N.fr);
    for (const L of Object.keys(I18N)) out[L] = ref.filter(k => I18N[L][k]==null).length; return out; });
  await page.close();
  for (const L of langs){
    const { page, errs } = await open(L);
    await page.evaluate(() => { newGame('HUM', 1, false); for (let i=0;i<30;i++) update(0.05); render(1/60); });
    if (errs.length) ko(L+' : '+errs[0]);
    await page.close();
  }
  if (!fails) ok('aucune exception au chargement ni en partie, dans les 9 langues');
  const holes = Object.entries(miss).filter(([L,n]) => n>0 && L!=='fr');
  if (holes.length) warn('clés absentes (repli anglais/français) : '+holes.map(([L,n])=>L+' '+n).join(', '));
  else ok('toutes les langues couvrent toutes les clés du français');
}

{ // réglages sauvegardés corrompus : le jeu doit démarrer quand même (écran noir avant la v1.9)
  const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('agi_settings', '{corrompu'); localStorage.setItem('agi_langChosen','1'); });
  await page.goto(GAME); await page.waitForTimeout(400);
  const okLoad = await page.evaluate(() => typeof newGame==='function' && !!SETTINGS.keys);
  check(okLoad && !errs.length, 'réglages sauvegardés corrompus : le jeu démarre quand même'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}

console.log('\nTUTORIEL');
{ const { page, errs } = await open();
  const r = await page.evaluate(() => { startTutorial(); const n = TUT.steps.length; let bad = 0;
    for (let i=0;i<n;i++){ try { TUT.i = i; tutEnterStep(); for (let k=0;k<10;k++) update(0.05); render(1/60);
      const f = TUT.steps[i].focus && TUT.steps[i].focus(); } catch(e){ bad++; } }
    return { n, bad }; });
  check(r.n>=20 && r.bad===0 && !errs.length, r.n+' étapes : enter() + simulation + rendu sans exception'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}
{ // PARTIE JOUÉE comme un joueur : chaque étape est réussie via les VRAIS gestionnaires de clic
  // (handleTap aux coordonnées du halo / des menus), sans tricher sur l'état du tutoriel
  const { page, errs } = await open();
  const r = await page.evaluate(() => {
    const R = () => { ctx.setTransform(SCALE,0,0,SCALE,0,0); render(1/60); };
    const sim = n => { for (let i=0;i<n;i++) update(0.05); R(); };
    const C = r => [r.x+r.w/2, r.y+r.h/2];
    startTutorial(); R();
    const times = []; let last = -1, it = 0, guard = 0, simT = 0;
    while (TUT && guard++ < 6000){
      if (TUT.i !== last){ if (last>=0) times.push(+(simT).toFixed(1)); last = TUT.i; it = 0; simT = 0; }
      if (++it > 500) return { stuck: TUT.i, text: (TUT.steps[TUT.i].obj||{}).fr };
      if (TUT.celebrating){ sim(5); simT += 0.25; continue; }
      const st = TUT.steps[TUT.i], A = d => !!(st.allow && st.allow(d)), f = st.focus && st.focus(), src = String(st.done);
      if (st.tap){ const c = TUT.uiRects.find(r=>r.key==='cont'); handleTap(...C(c)); R(); continue; }
      const build = ['farmF','farmM','well','wall','turret'].find(t => A({t:'build',type:t}));
      if (build){
        if (!buildMenu){ handleTap(f.x+f.w/2, f.y+f.h*0.6); R(); }
        const o = buildMenu && buildMenu.rects.find(r=>r.key===build);
        if (o){ handleTap(...C(o)); } sim(10); simT += 0.5; continue; }
      if (A({t:'upg'})){ handleTap(...C(HUD.upgRects.find(r=>r.i===0))); sim(4); continue; }
      if (A({t:'lasso'})){ if (!selMode){ handleTap(...C(f)); R(); }
        const xs = game.p.units.filter(u=>!u.fly).map(u=>w2sX(u.x)), gy = w2sY(gY(game.p.x+400));
        selBox = { x0:Math.min(...xs)-30, y0:gy-90, x1:Math.max(...xs)+30, y1:gy+20 }; finishLasso(); sim(4); continue; }
      const btn = ['formation','cap','special','evolve','hero','stance'].find(t => A({t, st:'charge'}))
               || [0,1,2,3,4,5].map(i=>'buy'+i).find(b => A({t:'buy', i:+b[3]}));
      if (btn && f){ handleTap(...C(f)); sim(8); simT += 0.4; continue; }
      if (src.includes('sel.size>=1')){ handleTap(f.x+f.w/2, f.y+f.h-40); sim(4); continue; }
      if (src.includes("'point'")){ handleTap(w2sX(game.p.x+500), w2sY(gY(game.p.x+500))-10, false, {right:true}); sim(4); continue; }
      if (src.includes('gar.length') || src.includes('fortLvl')){
        if (!buildMenu){ handleTap(f.x+f.w/2, f.y+f.h*0.55); R(); }
        const o = buildMenu && buildMenu.rects.find(r=>['gar_ranged','garrison','fortify'].includes(r.key));
        if (o) handleTap(...C(o)); sim(20); simT += 1; continue; }
      if (src.includes('e.units.length===0')){ sim(20); simT += 1; continue; }
      return { unknown: TUT.i };
    }
    return { done: !TUT, n: times.length+1, times, menu: document.getElementById('menu').style.display,
             seen: localStorage.getItem('agi_tutoSeen') };
  });
  check(r.done && r.menu==='flex' && !errs.length,
    r.done? `tutoriel joué de bout en bout par clics (${r.n} étapes ; vague ${r.times[r.times.length-9]} s, assaut ${r.times[r.times.length-1]} s de jeu)`
          : 'tutoriel BLOQUÉ : '+JSON.stringify(r)+(errs[0]? ' — '+errs[0] : ''));
  if (r.done){ const slow = r.times.filter(t=>t>45); check(!slow.length, 'aucune étape interminable (> 45 s de jeu) : '+(slow.join(', ')||'ok')); }
  await page.close();
}
{ // clavier en tutoriel : une touche n'exécute pas une action pas encore enseignée
  const { page, errs } = await open();
  const r = await page.evaluate(() => { startTutorial(); tutAdvance();          // étape « ferme »
    const before = game.p.queue.length + game.p.units.length, xp = game.p.era;
    for (const code of ['Digit1','Digit4','KeyE','KeyH','KeyG']) window.dispatchEvent(new KeyboardEvent('keydown', {code}));
    return { added: game.p.queue.length + game.p.units.length - before, form: game.p.formation, era: game.p.era - xp }; });
  check(r.added===0 && !r.form && r.era===0 && !errs.length, 'tutoriel : les raccourcis clavier respectent les leçons non encore vues');
  await page.close();
}

console.log('\nRÉGLAGES, MENUS, TOUCHES');
{ const { page, errs } = await open();
  const r = await page.evaluate(() => { const out = {};
    const m = document.getElementById('menu'); m.style.display = 'flex';
    const S0 = JSON.stringify(SETTINGS);
    for (const id of ['oMusic','oSfx','oShake','oNews']) document.getElementById(id).click();
    out.toggles = [SETTINGS.music, SETTINGS.sfx, SETTINGS.shake, SETTINGS.newsFeed].join();
    const q0 = SETTINGS.quality; document.getElementById('oQuality').click(); out.q = q0+'→'+SETTINGS.quality;
    const v = document.getElementById('oVol'); v.value = 35; v.dispatchEvent(new Event('input')); out.vol = SETTINGS.vol;
    const saved = JSON.parse(localStorage.getItem('agi_settings')); out.saved = saved.vol===0.35 && saved.newsFeed===SETTINGS.newsFeed;
    const ls = document.getElementById('langSel'); ls.value = 'de'; ls.dispatchEvent(new Event('change'));
    out.lang = document.documentElement.lang + '/' + document.querySelector('[data-i18n="set_news"]').textContent;
    ls.value = 'fr'; ls.dispatchEvent(new Event('change'));
    // onglets du menu : chacun affiche sa page
    out.tabs = [...document.querySelectorAll('.tab')].map(tb => { tb.click(); const pg = document.getElementById('page-'+tb.dataset.page);
      return pg && getComputedStyle(pg).display!=='none'; }).every(Boolean);
    // touches : échange en cas de conflit, Échap annule, F8 refusée
    keyWait = {k:'buy1'}; window.dispatchEvent(new KeyboardEvent('keydown', {code:'KeyE'}));
    out.swap = SETTINGS.keys.buy1==='KeyE' && SETTINGS.keys.evolve==='Digit1';
    keyWait = {k:'buy2'}; window.dispatchEvent(new KeyboardEvent('keydown', {code:'Escape'})); out.esc = SETTINGS.keys.buy2==='Digit2';
    keyWait = {k:'buy3'}; window.dispatchEvent(new KeyboardEvent('keydown', {code:'F8'})); out.f8 = SETTINGS.keys.buy3==='Digit3'; PERF.on = false;
    out.dups = new Set(Object.values(SETTINGS.keys)).size === Object.keys(SETTINGS.keys).length;
    document.querySelectorAll('.keyBtn'); [...document.querySelectorAll('#keysBox .keyBtn')].pop().click();   // ↺ défaut
    out.reset = JSON.stringify(SETTINGS.keys)===JSON.stringify(DEFKEYS);
    m.style.display = 'none';
    return out; });
  check(r.toggles==='true,true,false,false' && r.vol===0.35 && r.saved, 'PARAMÈTRES : musique/effets/secousses/fil + volume appliqués et sauvegardés');
  check(r.q.split('→')[0]!==r.q.split('→')[1], 'qualité graphique : cycle '+r.q);
  check(r.lang.startsWith('de/') && r.lang!=='de/Fil d\'actualités', 'changement de langue appliqué au menu ('+r.lang+')');
  check(r.tabs, 'chaque onglet du menu affiche sa page');
  check(r.swap && r.esc && r.f8 && r.dups && r.reset, 'touches : échange sans doublon, Échap annule, F8 réservée, ↺ défaut');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}
{ // raccourcis en partie : chaque touche déclenche son action
  const { page, errs } = await open();
  const r = await page.evaluate(() => { newGame('HUM', 1, false); const p = game.p; p.f = p.m = p.w = 5000; p.xp = 5000;
    const key = code => window.dispatchEvent(new KeyboardEvent('keydown', {code}));
    const out = {}; const n0 = p.queue.length + p.units.length;
    key('Digit1'); key('Digit2'); key('Digit3'); out.buy = p.queue.length + p.units.length - n0;
    key('KeyE'); out.evolve = p.era;
    key('KeyC'); out.charge = p.stance; key('KeyV'); out.hold = p.stance; key('KeyB'); out.retreat = p.stance;
    key('KeyG'); out.form = p.formation; key('KeyU'); out.cap = p.capUp;
    const z0 = zoom; key('Equal'); out.zoom = zoom > z0;
    const cf = camFollow; key('KeyF'); out.follow = camFollow !== cf;
    p.heroCd = 0; key('KeyH'); out.hero = p.units.some(u=>u.role==='hero');
    key('KeyP'); out.soft = paused && !settingsOpen; key('KeyP');
    key('Escape'); out.menu = settingsOpen && paused; ctx.setTransform(SCALE,0,0,SCALE,0,0); render(1/60);
    const nr = pauseRects.find(r=>r.key==='news'), was = SETTINGS.newsFeed; handleTap(nr.x+nr.w/2, nr.y+nr.h/2); out.pnews = SETTINGS.newsFeed !== was;
    out.rows = pauseRects.every(r => r.y >= 0 && r.y + r.h <= H);
    key('Escape'); out.closed = !settingsOpen && !paused;
    return out; });
  check(r.buy===3 && r.evolve===1 && r.charge==='charge' && r.hold==='hold' && r.retreat==='retreat' && r.form && r.cap && r.zoom && r.follow && r.hero,
    'raccourcis : unités 1-3, évoluer, charger/tenir/replier, formation, capacité, zoom, caméra, héros');
  check(r.soft && r.menu && r.pnews && r.rows && r.closed, 'P = pause terrain visible, Échap = menu ⚙ (toutes les lignes dans l\'écran, fil activable)');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}
{ // réglages sauvegardés invalides (volume texte, langue inconnue, touches non textuelles)
  const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1');
    localStorage.setItem('agi_settings', JSON.stringify({ vol:'abc', lang:5, music:'oui', keys:{ buy1:7, buy2:'F8', hero:'KeyG' } })); });
  await page.goto(GAME); await page.waitForTimeout(400);
  const r = await page.evaluate(() => { newGame('HUM',1,false); togglePauseAction(); ctx.setTransform(SCALE,0,0,SCALE,0,0); render(1/60);
    return { vol: SETTINGS.vol, lang: SETTINGS.lang, k1: SETTINGS.keys.buy1, k2: SETTINGS.keys.buy2, hero: SETTINGS.keys.hero, form: SETTINGS.keys.formation }; });
  check(r.vol===0.8 && r.lang==='fr' && r.k1==='Digit1' && r.k2==='Digit2' && !errs.length, 'réglages invalides : valeurs par défaut, menu ⚙ affiché sans erreur'+(errs[0]? ' — '+errs[0] : ''));
  check(r.hero==='KeyG' && r.form==='', 'nouvelle touche par défaut déjà prise par le joueur : la sienne est conservée');
  await page.close();
}

console.log('\nINTRO + FIL D\'ACTUALITÉS');
{ const langs = ['fr','en','es','de','it','pt','ru','zh','ar']; let bad = [];
  for (const L of langs){
    const { page, errs } = await open(L);
    const r = await page.evaluate((full) => { pendingStart = null;
      for (let i=0;i<INTRO_N;i++){ intro=i; introT=0; introOut=0; for (let k=0;k<4;k++){ ctx.setTransform(SCALE,0,0,SCALE,0,0); drawIntro(0.8); } }
      intro = full? 0 : INTRO_N-1; introT=0; introOut=0; let n=0;          // déroulé complet (avance auto) une fois
      while (intro>=0 && n<2000){ ctx.setTransform(SCALE,0,0,SCALE,0,0); if (intro===INTRO_N-1) advanceIntro(); drawIntro(0.25); n++; }
      return { end: intro, menu: document.getElementById('menu').style.display, seen: localStorage.getItem('agi_introSeen'),
               lore: INTRO_LORE.every(k => Array.isArray(t(k)) && t(k).length===2) && t('lore_ch').length===6 }; }, L==='fr');
    if (r.end!==-1 || r.menu!=='flex' || r.seen!=='1' || !r.lore || errs.length) bad.push(L+':'+JSON.stringify(r)+(errs[0]||''));
    await page.close();
  }
  check(!bad.length, 'intro : 7 tableaux rendus, avance auto puis retour au menu, dans les 9 langues'+(bad.length? ' — '+bad[0] : ''));
}
{ const { page, errs } = await open();
  const r = await page.evaluate(() => { newGame('HUM', 1, false); const out = {};
    const R = () => { ctx.setTransform(SCALE,0,0,SCALE,0,0); render(1/60); };
    for (let i=0;i<20*20;i++){ update(0.05); newsTick(0.05); } out.first = !!NEWSF.cur; R();
    startCata('acid'); newsTick(0.05); out.ev = NEWSF.queue.some(q=>q.ev) || (NEWSF.cur && NEWSF.cur.ev);
    game.p.era = 1; newsTick(0.05); out.era = NEWSF.queue.length + (NEWSF.cur?1:0) >= 2;
    // 9 langues : chaque dépêche existe et s'affiche
    out.langs = Object.keys(I18N).every(L => { SETTINGS.lang = L;
      return ['t0','t1','t2','t3','hum','ia','even','flav'].every(c => NEWS[c].every(o => typeof o[L]==='string' && o[L].length>8))
          && Object.values(NEWS.ev).every(o => typeof o[L]==='string'); });
    SETTINGS.lang = 'fr';
    NEWSF.cur = { txt: 'Test dépêche très longue '.repeat(8), ev:false, t:2, dur:9 }; R();
    out.rect = !!NEWSF.rect && NEWSF.rect.y < 80;
    const rr = NEWSF.rect; handleTap(rr.x+rr.w/2, rr.y+rr.h/2);
    out.closed = SETTINGS.newsFeed===false && JSON.parse(localStorage.getItem('agi_settings')).newsFeed===false && NEWSF.closedT>0;
    for (let i=0;i<40*20;i++){ update(0.05); newsTick(0.05); } out.silent = !NEWSF.cur;
    return out; });
  check(r.first && r.ev && r.era, 'fil d\'actualités : dépêche d\'ambiance, puis dépêches d\'événements (cataclysme, ère)');
  check(r.langs, 'fil d\'actualités : toutes les dépêches traduites dans les 9 langues');
  check(r.rect && r.closed && r.silent, 'fil d\'actualités : la croix le ferme, réglage sauvegardé, plus aucune dépêche');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}

// partie jusqu'au bout. Joueur « actif » : un robot simple qui recrute, construit, évolue,
// invoque son héros et utilise ses pouvoirs — il exerce les chemins de code du joueur.
async function fullGame(diff, active, fac='HUM'){
  const { page, errs } = await open('fr', 'medium');
  const r = await page.evaluate(([diff,active,fac]) => {
    newGame(fac, diff, false); const p = game.p;
    const nan = () => { for (const s of [game.p, game.e]){
      for (const k of ['f','m','w','xp','hp']) if (!Number.isFinite(s[k])) return s===game.p? 'p.'+k : 'e.'+k;
      for (const u of s.units) if (!Number.isFinite(u.x) || !Number.isFinite(u.hp)) return 'unité '+u.role; }
      return null; };
    let steps = 0, maxP = 0, maxU = 0, maxL = 0, bad = null;
    while (!game.over && steps < 20*60*40){                 // ≤ 40 min de jeu
      update(0.05); steps++;
      if (active && steps % 20 === 0){
        tryEvolve(p); for (let i=0;i<6;i++) tryBuy(p, (steps/20+i)%6|0);
        const s = p.slots.find(s=>!s.b); if (s) tryBuild(p, s, ['farmF','farmM','turret','well','wall'][steps/20%5|0]);
        if (steps % 400 === 0){ try { tryHero(p); } catch(e){} try { trySpecial(p); } catch(e){} setStance(p, steps%800? 'charge':'hold'); }
      }
      if (steps % 30 === 0) render(1/60);
      maxP = Math.max(maxP, particles.length); maxL = Math.max(maxL, LIGHTS.length);
      maxU = Math.max(maxU, game.p.units.length + game.e.units.length);
      if (steps % 200 === 0 && (bad = nan())) break;
    }
    return { over: game.over, win: game.win, min: steps*0.05/60, maxP, maxU, maxL, bad, era: [game.p.era, game.e.era] };
  }, [diff, active, fac]);
  check(r.over && !r.bad && r.maxP<=640 && r.maxL<=61 && !errs.length,
    `${fac} diff ${diff} ${active? 'actif ':'passif'} → ${r.over? (r.win? 'victoire':'défaite') : 'PAS DE FIN'} en ${r.min.toFixed(1)} min`
    + ` · ères ${r.era.join('/')} · max ${r.maxU} unités / ${r.maxP} particules / ${r.maxL} lumières`
    + (r.bad? ' · NaN '+r.bad : '') + (errs[0]? ' · '+errs[0] : ''));
  await page.close();
}
console.log('\nPARTIES COMPLÈTES');
for (const d of [0,1,2,3]) await fullGame(d, false);
for (const d of [1,3]) await fullGame(d, true);
await fullGame(1, true, 'IA');

console.log('\nCATACLYSMES');
{ const { page, errs } = await open();
  const r = await page.evaluate(() => { const out = [];
    for (const k of CATA_KEYS){ newGame('HUM', 1, false); game.cataCd = 1e9;
      for (let i=0;i<4;i++){ spawnUnit(game.p, i%5, false, 1300+i*20); spawnUnit(game.e, i%5, false, 1700+i*20); }
      startCata(k); const dur = game.cataDur; let n = 0;
      while (game.cata && n < (dur+2)*20){ update(0.05); n++; if (n%3===0) render(1/60); }
      out.push([k, !game.cata]); }
    return out; });
  check(r.every(x=>x[1]) && !errs.length, r.map(x=>x[0]).join(', ')+' : déclenchés, joués et terminés sans exception'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}

console.log('\nRENDU : ÉTATS DU MONDE × QUALITÉS × ZOOMS');
{ const { page, errs } = await open();
  const r = await page.evaluate(() => { newGame('HUM', 1, false); let n = 0;
    for (let i=0;i<10;i++){ spawnUnit(game.p, i%5, false, 1200+i*20); spawnUnit(game.e, i%5, false, 1500+i*20); }
    for (const q of ['low','medium','high','ultra']) for (const dv of [0,0.25,0.5,0.75,1]) for (const z of [ZMIN,1,ZMAX]){
      SETTINGS.quality = q; game.t = dv*960; update(0.05); zoom = z; camFollow = false; camX = 900; camClamp(); render(1/60); n++; }
    return { n, tiles: typeof LANDT!=='undefined'? LANDT.size : 0 }; });
  check(!errs.length, r.n+' combinaisons rendues sans exception'+(errs[0]? ' — '+errs[0] : ''));
  check(r.tiles<=42, 'cache des tuiles de paysage borné ('+r.tiles+' ≤ 42)');
  await page.close();
}

console.log('\nSPRITES, PAUSE, RÉSEAU, FIN DE PARTIE');
{ const { page, errs } = await open();
  const r = await page.evaluate(() => { newGame('HUM', 1, false);
    while (WARMQ.length) warmTick(50);                              // préchauffe complète
    const spr = SPR.size;
    for (let i=0;i<6;i++){ spawnUnit(game.p, 3, false, 1200+i*16); spawnUnit(game.e, 3, false, 1700+i*16); }
    camFollow=false; camX=1450-VW()/2;
    for (let i=0;i<240;i++){ update(1/60); render(1/60); }
    const before = particles.length; for (let i=0;i<400;i++) render(1/60);      // pause : rendu sans simulation
    const after = particles.length;
    const snap = JSON.parse(JSON.stringify(serialize())); const bytes = JSON.stringify(snap).length;
    let net = 'ok'; try { game.net = 'guest'; applySnapshot(snap); render(1/60); game.net = null; } catch(e){ net = e.message; }
    game.over = true; game.win = false; let end = 'ok'; try { showEnd(); } catch(e){ end = e.message; }
    return { spr, before, after, bytes, net, end }; });
  check(r.spr>=120, 'préchauffe complète : '+r.spr+' sprites cuits sans exception');
  check(r.after<=r.before, 'pause : aucune accumulation de particules ('+r.before+' → '+r.after+')');
  check(r.net==='ok', 'sérialisation réseau aller-retour ('+(r.bytes/1024).toFixed(1)+' Ko) : '+r.net);
  check(r.end==='ok', 'écran de fin : '+r.end);
  check(!errs.length, 'aucune erreur JS capturée'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}

console.log('\nSÉCURITÉ');
{ const { page, errs } = await open();
  // salon piégé dans la base publique : chaque champ tente d'injecter du HTML/JS
  const r = await page.evaluate(async () => {
    const evil = '<img src=x onerror="window.__pwn=1">';
    window.fetch = async () => ({ ok:true, json: async () => ({ k1:{ code:'AB2'+evil, name:evil, speed:evil, hasPw:evil, fac:evil, ts:Date.now() },
                                                               k2:{ code:evil, ts:'x' }, k3:null, k4:'texte' }) });
    let box = document.getElementById('lobbyList');
    if (!box){ box = document.createElement('div'); box.id = 'lobbyList'; document.body.appendChild(box); }
    await refreshLobbies(); await new Promise(r=>setTimeout(r,300));
    return { imgs: box.querySelectorAll('img').length, pwn: !!window.__pwn, rows: box.children.length, txt: box.textContent.slice(0,80) };
  });
  check(r.imgs===0 && !r.pwn && r.rows===1, 'liste des salons : entrée piégée neutralisée (affichée en texte brut, '+r.rows+' ligne valide)');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}
{ // HÔTE piégé → invité : instantané malveillant (chaînes HTML, NaN, tableaux géants, rôles inconnus)
  const { page, errs } = await open();
  const r = await page.evaluate(() => { newGame('HUM', 1, false); game.net = 'guest';
    const evil = '<img src=x onerror="window.__pwn=1">';
    const snap = JSON.parse(JSON.stringify(serialize()));
    Object.assign(snap, { t: evil, dev: 'x', kills: evil, ekills: evil, we: evil, bo: evil, ca: '__proto__', ov: 1, pw: 0 });
    snap.p.hp = evil; snap.p.upg = { melee: evil, __proto__: { polluted: 1 } }; snap.p.slots = [[99,1,1,1,0,[]], ['__proto__']];
    snap.pu = new Array(5000).fill([1, 999, 'NaN', 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0]);
    snap.shots = new Array(100000).fill([0,0,0,0,0,0,0,0]);
    let ok = true; try { applySnapshot(snap);
      applyEvents([{k:'b', x:10, y:10, c:evil, n:1e7, p:1e9}, {k:'a', t:evil.repeat(500), c:evil}, {k:'s', n:'__proto__', p:1e12}]);
      for (let i=0;i<3;i++){ netGuestTick(0.05); render(1/60); } showEnd(); } catch(e){ ok = e.message; }
    const s = document.getElementById('endstats');
    return { ok, imgs: s.querySelectorAll('img').length, pwn: !!window.__pwn, units: game.p.units.length + game.e.units.length,
             shots: shots.length, parts: particles.length, msg: (game.msg && game.msg.txt.length) || 0, proto: ({}).polluted===undefined && [].b===undefined }; });
  check(r.ok===true && r.imgs===0 && !r.pwn && r.proto, 'instantané piégé : aucun HTML injecté dans l\'écran de fin, aucune pollution de prototype'+(r.ok!==true? ' — '+r.ok : ''));
  check(r.units===0 && r.shots<=400 && r.parts<200 && r.msg<=120, 'instantané piégé : listes plafonnées, rôles inconnus ignorés, burst borné ('+r.parts+' particules)');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}
{ // INVITÉ piégé → hôte : commandes malveillantes
  const { page, errs } = await open();
  const r = await page.evaluate(() => { newGame('HUM', 1, false); game.net = 'host'; net = { cmdQ:[], ev:[] };
    const p = game.p, e = game.e; e.f = e.m = e.w = 1e5;
    // l'hôte possède un bâtiment neutre avec deux tireurs en garnison
    const ns = game.neut[0]; ns.owner = p; ns.b = { type:'turret', hp:400, maxhp:400, lvl:1, gar:[], atkT:0 };
    for (let i=0;i<2;i++){ spawnUnit(p, 2, false, ns.x); const u = p.units.pop(); ns.b.gar.push(u); }
    const cmds = [ {c:'build', ref:{t:'own', i:'__proto__'}, type:'wall'}, {c:'build', ref:{t:'own', i:0}, type:'__proto__'},
      {c:'buy', ri:'__proto__'}, {c:'buy', ri:99}, {c:'urole', ri:-1}, {c:'point', x:NaN, ids:[]}, {c:'point', x:'1e400'},
      {c:'stance', st:'<x>', ids:new Array(1e5).fill(1)}, {c:'ungar', ref:{t:'neut', i:0}}, {c:'demo', ref:{t:'neut', i:0}},
      {c:'gar', ref:{t:'neut', i:0}, role:'ranged'}, {c:'bgar', role:'__proto__'}, null, 'texte', {c:'build', ref:null} ];
    let ok = true; try { for (const c of cmds) applyCmd(c); for (let i=0;i<40;i++) update(0.05); } catch(err){ ok = err.message; }
    const nan = e.units.some(u => !Number.isFinite(u.x) || (u.px!=null && !Number.isFinite(u.px)));
    return { ok, proto: [].b===undefined && ({}).polluted===undefined, stolen: ns.b? 2-ns.b.gar.length : 'démoli', owner: ns.owner===p, nan,
             stance: e.stance }; });
  check(r.ok===true && r.proto && !r.nan, 'commandes piégées de l\'invité : ni pollution de prototype ni NaN dans la simulation'+(r.ok!==true? ' — '+r.ok : ''));
  check(r.stolen===0 && r.owner && r.stance!=='<x>', 'l\'invité ne peut ni vider, ni démolir, ni garnir un bâtiment de l\'hôte');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}
{ // couche connexion : messages hors protocole, faction inconnue, force brute du mot de passe
  const { page, errs } = await open();
  const r = await page.evaluate(() => { const sent = [];
    nsend = (t, d) => sent.push(t); enterLobby = () => sent.push('LOBBY'); netStatus = () => {}; versionFail = () => sent.push('VF');
    net = { role:'host', pw:'secret', myFac:'HUM', foeFac:null, cmdQ:[], speed:1, conn:null, sendLok:o=>sent.push('lok') };
    nrecv(null); nrecv('x'); nrecv({t:'hi', d:null}); nrecv({t:'cm', d:{c:'buy', ri:0}});
    const queuedBeforeAuth = net.cmdQ.length;
    for (let i=0;i<10;i++) nrecv({t:'hi', d:{v:NET_PROTO, pw:'essai'+i, fac:'HUM'}});
    const locked = !!net.pwLockUntil;
    nrecv({t:'hi', d:{v:NET_PROTO, pw:'secret', fac:'<b>'}});        // bon mot de passe… mais verrou actif
    const lobbyWhileLocked = sent.includes('LOBBY');
    net.pwLockUntil = 0; nrecv({t:'hi', d:{v:NET_PROTO, pw:'secret', fac:'<b>'}});
    for (let i=0;i<500;i++) nrecv({t:'cm', d:{c:'buy', ri:0}});
    return { queuedBeforeAuth, locked, lobbyWhileLocked, lobby: sent.includes('LOBBY'), foe: net.foeFac, q: net.cmdQ.length }; });
  check(r.queuedBeforeAuth===0 && r.locked && !r.lobbyWhileLocked && r.lobby && r.foe==='IA',
    'connexion : commandes refusées avant authentification, mot de passe verrouillé après 6 échecs, faction inconnue rejetée');
  check(r.q<=64, 'connexion : file de commandes plafonnée ('+r.q+' ≤ 64)');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}

await browser.close();
console.log(`\n${fails? '✗ '+fails+' ÉCHEC(S)' : '✓ TOUT VERT'}${warns? ' ('+warns+' avertissement(s))' : ''} — ${((Date.now()-t0)/1000).toFixed(0)} s`);
process.exit(fails? 1 : 0);
