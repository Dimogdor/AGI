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
    const times = [], named = {}; let last = -1, it = 0, guard = 0, simT = 0, lastSrc = '';
    while (TUT && guard++ < 6000){
      if (TUT.i !== last){ if (last>=0){ times.push(+(simT).toFixed(1));
          if (lastSrc.includes('e.units.length===0')) named.wave = +(simT).toFixed(1); if (lastSrc.includes('e.hp<=0')) named.assault = +(simT).toFixed(1); }
        last = TUT.i; it = 0; simT = 0; lastSrc = String(TUT.steps[TUT.i].done); }
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
      if (src.includes('camStart')){ handleTap(...C(f)); sim(6);                       // caméra : bouton « Front », puis défilement
        if (Math.abs(camX-(TUT.camStart||0))<=200){ camX += 320; camClamp(); } sim(2); continue; }
      if (src.includes('lvl||1)>=2')){                                                   // amélioration de la ferme
        if (!buildMenu){ handleTap(f.x+f.w/2, f.y+f.h*0.6); R(); }
        const o = buildMenu && buildMenu.rects.find(r=>r.key==='upgrade');
        if (o) handleTap(...C(o)); sim(6); continue; }
      const btn = ['formation','cap','special','evolve','hero','stance','repairall'].find(t => A({t, st:'charge'}))
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
    return { done: !TUT, n: times.length+1, times, named, menu: document.getElementById('menu').style.display,
             seen: localStorage.getItem('agi_tutoSeen') };
  });
  check(r.done && r.menu==='flex' && !errs.length,
    r.done? `tutoriel joué de bout en bout par clics (${r.n} étapes ; vague ${r.named.wave} s, assaut ${r.named.assault} s de jeu)`
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

console.log('\nMENU « TRACT » (v1.11)');
for (const [vw, vh] of [[1280,720],[844,390],[1024,768]]){
  const page = await browser.newPage({ viewport:{ width:vw, height:vh } }); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
    localStorage.setItem('agi_settings', JSON.stringify({ lang:'de', music:false, sfx:false })); });
  await page.goto(GAME); await page.waitForTimeout(900);
  const r = await page.evaluate(async () => {
    const out = {}, sheet = document.querySelector('#menu .sheet'), vis = el => { const b = el.getBoundingClientRect(); return b.width>0 && b.left>=0 && b.top>=0 && b.right<=innerWidth+1 && b.bottom<=innerHeight+1; };
    await document.fonts.ready;
    out.fonts = ['800 20px "AGI Stencil"','20px "AGI Type"'].every(f => document.fonts.check(f));
    out.fit = sheet.scrollHeight <= sheet.clientHeight + 2 && ['startBtn','onlineBtn','cardHum','cardIA'].every(id => vis(document.getElementById(id))) && vis(document.querySelector('#menu .poster .title'));
    document.getElementById('cardIA').click(); out.ia = document.getElementById('menu').classList.contains('fac-ia') && getComputedStyle(document.querySelector('.sgIa')).display!=='none';
    document.getElementById('cardHum').click(); out.hum = !document.getElementById('menu').classList.contains('fac-ia');
    document.querySelector('.diffBtn[data-diff="3"]').click(); out.diff = menuDiff===3;
    document.getElementById('startBtn').click(); await new Promise(r => setTimeout(r, 450));
    out.started = document.getElementById('menu').style.display==='none' && intro===INTRO_N-1 && pendingStart && pendingStart.diff===3;
    // écran de fin sur cet écran : le bouton Rejouer reste visible sans défiler
    finishIntro(); game.over = true; game.win = true; showEnd(); await new Promise(r => setTimeout(r, 350));
    out.end = vis(document.getElementById('replayBtn'));
    return out; });
  check(r.fonts && r.fit && r.ia && r.hum && r.diff && r.started && r.end && !errs.length,
    `${vw}×${vh} (de) : polices chargées, écran Jouer sans défilement, bascule G·P·T, tampon → partie, fin lisible`+(Object.entries(r).filter(([k,v])=>!v).map(([k])=>' ✗'+k).join('')+(errs[0]? ' — '+errs[0] : '')));
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

console.log('\nCORRECTIFS D\'AUDIT (v1.11)');
{ const { page, errs } = await open();
  const r = await page.evaluate(() => { const out = {};
    const R = () => { ctx.setTransform(SCALE,0,0,SCALE,0,0); render(1/60); };
    // bombe H : une seule fois par partie, et la sélection morte est vidée
    newGame('HUM', 1, false); let p = game.p, e = game.e;
    for (let i=0;i<3;i++) spawnUnit(p, 2); for (const u of p.units) game.sel.add(u);
    e.hp = 0; update(0.05); out.sel = game.sel.size===0 && game.hbombDone;
    game.winter = false; game.winterT = 0; for (let i=0;i<4;i++){ spawnUnit(p,0); spawnUnit(e,0); }
    p.hp = 0; update(0.05); out.once = p.units.length>=4 && e.units.length>=4;
    // contrôles ⏸ / ⚙ actifs pendant une pause
    newGame('HUM', 1, false); R();
    const sp = HUD.btns.find(b=>b.type==='softpause'), gear = HUD.btns.find(b=>b.type==='pause');
    handleTap(sp.x+sp.w/2, sp.y+sp.h/2); const paused1 = paused;
    handleTap(sp.x+sp.w/2, sp.y+sp.h/2); out.soft = paused1 && !paused;
    toggleSoftPause(); handleTap(gear.x+gear.w/2, gear.y+gear.h/2); out.gear = settingsOpen; togglePauseAction();
    // garnison : 5 taps rapides pour une tourelle à 2 places → pas de surdépense
    p = game.p; p.f = p.m = p.w = 9999; const s = p.slots[0]; tryBuild(p, s, 'turret'); s.b = { type:'turret', hp:420, maxhp:420, lvl:1, gar:[], atkT:0 }; s.owner = p;
    const m0 = p.m; for (let i=0;i<5;i++) dispatchGarrison(p, s, 'ranged');
    out.gar = p.units.filter(u=>u.task && u.task.slot===s).length <= 2 && m0 - p.m <= 2*unitCost(p,2).m;
    // fil d'actualités sous la file de production
    p.queue.push(0,0,0); NEWSF.game = game; NEWSF.cur = { txt:'Dépêche de test', ev:false, t:2, dur:9 }; R();
    out.news = !!NEWSF.rect && NEWSF.rect.y >= 66;
    // annonces en temps réel à ×3
    game.speed = 3; announce('test', '#fff'); let real = 0; while (game.msgT > 0 && real < 10){ for (let k=0;k<3;k++) update(1/60); real += 1/60; }
    out.msg = real > 2.2;
    return out; });
  check(r.sel && r.once, 'bombe H : une seule par partie, sélection d\'unités mortes vidée');
  check(r.soft && r.gear, 'pause : ▶ reprend et ⚙ s\'ouvre même pendant une pause');
  check(r.gar, 'garnison : des taps rapides ne recrutent pas au-delà des places libres');
  check(r.news && r.msg, 'fil d\'actualités sous la file de production ; annonces lisibles à ×3');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}

console.log('\nCAMPAGNE (v1.14)');
{ // carnet de missions : verrouillage, dossier, sauvegarde corrompue
  const { page, errs } = await open();
  const r = await page.evaluate(() => {
    document.getElementById('menu').style.display = 'flex';
    document.querySelector('.tab[data-page="camp"]').click();
    const rows = [...document.querySelectorAll('#campBox .mis')];
    const o = { n: rows.length, locked: rows.filter(b=>b.disabled).length };
    rows[0].click(); o.brief = document.querySelectorAll('#campBox .campStory p').length; o.go = !!document.querySelector('#campBox .go');
    SETTINGS.lang = 'en'; applyLang(); o.en = document.querySelector('#campBox .campHead').textContent;
    SETTINGS.lang = 'fr'; applyLang();
    return o; });
  check(r.n===5 && r.locked===4 && r.brief>=3 && r.go && /meters/i.test(r.en) && !errs.length,
    `carnet : ${r.n} missions, ${r.locked} verrouillées au départ, dossier de ${r.brief} paragraphes, traduit à la volée`+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
  const p2 = await browser.newPage(); const e2 = []; p2.on('pageerror', e => e2.push(e.message));
  await p2.addInitScript(() => { window.requestAnimationFrame = () => 0; localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_camp', '{"done":99,"lvl":"x","best":{"0":-5,"__proto__":{"a":1}}}'); });
  await p2.goto(GAME); await p2.waitForTimeout(300);
  const sv = await p2.evaluate(() => ({ done: CAMP_SAVE.done, lvl: CAMP_SAVE.lvl, best: Object.keys(CAMP_SAVE.best).length, pol: ({}).a }));
  check(sv.done===5 && sv.lvl>=0 && sv.lvl<=2 && sv.best===0 && sv.pol===undefined && !e2.length, 'sauvegarde de campagne falsifiée : bornée et nettoyée au chargement');
  await p2.close();
}
{ // les 5 missions jouées jusqu'à leur dénouement (règles propres, radio, sauvegarde, enchaînement)
  const { page, errs } = await open();
  const r = await page.evaluate(() => {
    const out = {}, R = () => { ctx.setTransform(SCALE,0,0,SCALE,0,0); render(1/60); };
    const safe = () => { game.p.maxhp = 1e9; game.p.hp = 1e9; };
    const run = (sec, each) => { for (let k=0;k<sec*20;k++){ if (each) each(); update(0.05); if (k%60===0) R(); if (game.over) break; } };
    const kill = ph => { for (let k=0;k<200 && !game.over && (game.e.phase||1)===ph;k++){ game.e.hp = -1e6; update(0.05); } };
    CAMP_SAVE.done = 0; CAMP_SAVE.best = {}; CAMP_SAVE.lvl = 1;
    campLaunch(0); run(100, safe);
    out.m1 = { radio: game.camp.fired.filter(Boolean).length, cap: game.eraCap, one: game.e.phase===2 };
    game.p.xp = 9e6; out.m1.noEvo = tryEvolve(game.p)===false;
    kill(2); showEnd(); out.m1.win = game.over && game.win; out.m1.done = CAMP_SAVE.done;
    out.m1.title = document.getElementById('endtitle').textContent; out.m1.btn = document.getElementById('campNextBtn').style.display;
    document.getElementById('campNextBtn').click(); out.m2start = game && game.camp && game.camp.i;      // « mission suivante »
    run(365, safe); showEnd();
    out.m2 = { win: game.over && game.win, t: Math.round(game.camp.t), waves: game.camp.waveN, radio: game.camp.fired.filter(Boolean).length, done: CAMP_SAVE.done };
    campLaunch(2); out.m3 = { far: game.nodes[2].owner }; run(160, safe); out.m3.cata = game.cata;
    run(70, ()=>{ safe(); for (const n of game.nodes){ n.owner='p'; n.prog=1; } }); showEnd(); out.m3.win = game.over && game.win; out.m3.done = CAMP_SAVE.done;
    campLaunch(3); run(310, ()=>{ safe(); game.e.hp = game.e.maxhp; }); out.m4 = { hero: game.e.units.some(u=>u.role==='hero'), winter: game.winter };
    run(800, ()=>{ safe(); game.e.hp = game.e.maxhp; }); showEnd();
    out.m4.lose = game.over && !game.win; out.m4.t = Math.round(game.camp.t); out.m4.done = CAMP_SAVE.done; out.m4.retry = document.getElementById('campNextBtn').dataset.i;
    campLaunch(3); run(20, safe); kill(2); showEnd(); out.m4.win = game.over && game.win;
    campLaunch(4); run(170, safe); out.m5 = { cells: game.camp.cell, era: game.p.era };
    kill(1); out.m5.reborn = game.e.phase===2 && !!game.hbombDone && !game.over;
    run(20, safe); kill(2); showEnd(); out.m5.win = game.over && game.win; out.m5.done = CAMP_SAVE.done;
    // retour au carnet puis escarmouche : plus aucune trace de la campagne
    document.getElementById('replayBtn').click(); out.back = document.getElementById('menu').style.display + '/' + document.querySelector('.tab.on').dataset.page;
    newGame('HUM', 1, false); for (let k=0;k<40;k++) update(0.05); R(); out.clean = !game.camp && !game.devBase && game.eraCap===4 && (game.p.phase||1)===1;
    return out; });
  check(r.m1.radio>=2 && r.m1.cap===0 && r.m1.one && r.m1.noEvo && r.m1.win && r.m1.done===1 && r.m1.btn!=='none',
    'mission I : ère plafonnée, base à une vie, radio, victoire enregistrée — '+r.m1.title);
  check(r.m2start===1 && r.m2.win && r.m2.t===360 && r.m2.waves>20 && r.m2.radio>=6 && r.m2.done===2, `mission II : « mission suivante » enchaîne, ${r.m2.waves} assaillants en vagues, tenue 6 min`);
  check(r.m3.far==='e' && r.m3.cata==='heat' && r.m3.win && r.m3.done===3, 'mission III : lac ennemi au départ, canicule annoncée, victoire en tenant les 3 lacs');
  check(r.m4.hero && r.m4.winter && r.m4.lose && r.m4.t===900 && r.m4.done===3 && r.m4.retry==='3' && r.m4.win,
    'mission IV : hiver permanent, prototype, échec au terme du compte à rebours prolongé (15 min), puis victoire');
  check(r.m5.cells>=2 && r.m5.era===3 && r.m5.reborn && r.m5.win && r.m5.done===5, 'mission V : renforts, base ennemie à deux vies, campagne terminée');
  check(r.back==='flex/camp' && r.clean && !errs.length, 'retour au carnet, puis escarmouche sans reste de campagne'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}

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

console.log('\nHÉROS : POSTURES, ÈRES, ANIMATION');
{ const { page, errs } = await open();
  const r = await page.evaluate(() => { const out = {};
    const R = () => { ctx.setTransform(SCALE,0,0,SCALE,0,0); render(1/60); };
    const setup = (stance, hpFrac) => { newGame('HUM', 1, false); game.aiThink = 1e9; const p = game.p; p.heroStance = stance;
      spawnHero(p); const h = p.units.find(u=>u.role==='hero'); h.x = 1500; h.hp = h.maxhp*hpFrac; return h; };
    const run = n => { for (let i=0;i<n;i++){ game.e.units.length = 0; game.aiThink = 1e9; update(0.05); } };
    // PRUDENT : sous 35 % de PV il rentre vers sa base et y reste ; soigné (≥ 60 %), il repart
    let h = setup('prudent', 0.3); const p0 = game.p; run(200);
    out.flee = h.hstate==='flee' && Math.abs(h.x-(p0.x+150)) < 40;
    h.hp = h.maxhp*0.5; run(20); out.stay = h.hstate==='flee';                      // 50 % : pas encore (hystérésis)
    h.hp = h.maxhp; spawnUnit(p0, 0, false, 1200); const m = p0.units[p0.units.length-1]; run(60);
    out.back = h.hstate===null && h.x > p0.x+300;
    out.behind = (m.x - h.x) > 20;                                                // … et se tient derrière la ligne
    // OFFENSIF : mêmes PV, armée en repli → il avance quand même, jamais de fuite
    h = setup('offensive', 0.3); setStance(game.p, 'retreat'); run(60);
    out.lead = h.x > 1700 && h.hstate!=='flee';
    // NORMAL : comportement historique (obéit au repli de l'armée, ne fuit pas de lui-même)
    h = setup('normal', 0.3); run(40); const adv = h.x > 1500; setStance(game.p, 'retreat'); run(200);
    out.normal = adv && h.hstate==null && Math.abs(h.x-(game.p.x+150)) < 40;
    // statistiques inchangées par la posture ; aura identique
    const a = setup('prudent', 1), sA = [a.maxhp, a.dmg, a.spd, a.range, a.rate].join(); run(2); const powA = game.p.heroPow;
    const b = setup('normal', 1), sB = [b.maxhp, b.dmg, b.spd, b.range, b.rate].join(); run(2);
    out.stats = sA===sB && powA===game.p.heroPow && powA===1;
    // commande : bouton du HUD, touche, valeur invalide refusée côté hôte
    newGame('HUM', 1, false); R(); const bt = HUD.btns.find(b=>b.type==='hstance');
    handleTap(bt.x+bt.w/2, bt.y+bt.h/2); const s1 = game.p.heroStance;
    window.dispatchEvent(new KeyboardEvent('keydown', {code:'KeyJ'})); const s2 = game.p.heroStance; R();
    out.ui = !!bt && s1==='offensive' && s2==='prudent';
    applyCmd({c:'hst', st:'prudent'}); const c1 = game.e.heroStance; applyCmd({c:'hst', st:'__proto__'}); applyCmd({c:'hst'});
    out.cmd = c1==='prudent' && game.e.heroStance==='prudent';
    // chaque héros, à chaque ère : toutes les couches cuites, rendu vivant / en attaque / blessé / mort sans erreur ; l'ère suit le camp
    out.draw = true; out.era = true;
    try { for (const fac of ['HUM','IA']){ newGame(fac, 1, false); game.aiThink = 1e9; const p = game.p; spawnHero(p); const u = p.units[0]; u.x = 600; camX = 300; camFollow = false;
        for (let era=0; era<5; era++){ p.era = era; game.e.units.length = 0; update(0.05); if (u.era!==era) out.era = false;
          for (const [t, n] of [[-1,0],[0.75,1],[0.75,2],[0.1,3]]){ u.atkT = t; u.atkN = n; u.flash = n===3? 0.1 : 0; u._wx = u.x-(n? 0 : 3); R(); }
          deaths.push({x:700, fac, era, role:'hero', fly:false, flyH:0, side:1, t:0.9, life:1.8}); R(); deaths.length = 0;
          const c = heroFullSprite(fac, era); if (!(c.width>0)) out.draw = false; } } } catch(e){ out.draw = e.message; }
    // instantané réseau : posture et état d'animation du héros transmis à l'invité
    newGame('HUM', 1, false); game.e.heroStance = 'offensive'; spawnHero(game.e); const eh = game.e.units.find(u=>u.role==='hero'); eh.atkN = 3; eh.hstate = 'flee';
    const snap = JSON.parse(JSON.stringify(serialize()));
    game.net = 'guest'; applySnapshot(snap); const gh = game.p.units.find(u=>u.role==='hero');
    out.snap = game.p.heroStance==='offensive' && !!gh && gh.atkN===3 && gh.hstate==='flee' && game.p.heroAlive===true; R(); game.net = null;
    return out; });
  check(r.flee && r.stay && r.back && r.behind, 'posture PRUDENT : repli vers la base sous 35 % de PV, retour une fois soigné (≥ 60 %), reste derrière la ligne');
  check(r.lead, 'posture OFFENSIF : avance malgré 30 % de PV et une armée en repli, ne fuit jamais');
  check(r.normal && r.stats, 'posture NORMAL : comportement historique ; statistiques et aura identiques quelle que soit la posture');
  check(r.ui && r.cmd, 'posture : bouton du HUD, touche J, commande réseau validée (valeur inconnue ignorée)');
  check(r.draw===true && r.era, 'héros : 2 camps × 5 ères rendus (repos, deux attaques, blessure, mort), l\'apparence suit l\'ère du camp'+(r.draw!==true? ' — '+r.draw : ''));
  check(r.snap, 'instantané : posture, n° d\'attaque et repli du héros reçus par l\'invité');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}

console.log('\nMODE EN LIGNE DE BOUT EN BOUT (deux pages reliées)');
{ const A = await open(), B = await open();                       // A = hôte (Humanité), B = invité (G·P·T)
  const link = async (from, to) => from.page.exposeFunction('__wire', msg => to.page.evaluate(m => nrecv(m), msg).catch(()=>{}));
  await link(A, B); await link(B, A);
  const mkNet = ([role, fac]) => { net = { role, code:'TEST1', myFac:fac, foeFac:null, speed:1, pw:'', name:'', pub:false, peer:true, cmdQ:[], ev:[], acc:0, tries:0,
      conn:{ open:true, send:m => window.__wire(JSON.parse(JSON.stringify(m))), close(){} },
      sendState:o=>nsend('st',o), sendCmd:o=>nsend('cm',o), sendHello:o=>nsend('hi',o), sendStart:o=>nsend('go',o), sendPause:o=>nsend('pz',o),
      sendSpeed:o=>nsend('sp',o), sendLok:o=>nsend('lok',o), sendLF:o=>nsend('lf',o) }; };
  await A.page.evaluate(mkNet, ['host', 'HUM']); await A.page.evaluate(() => { net.authed = false; });
  await B.page.evaluate(mkNet, ['guest', 'IA']);
  await B.page.evaluate(() => net.sendHello({ fac:net.myFac, v:NET_PROTO, pw:'' })); await A.page.waitForTimeout(250);
  const lobby = [await A.page.evaluate(() => net.authed && net.foeFac), await B.page.evaluate(() => net.authed && net.foeFac)];
  check(lobby[0]==='IA' && lobby[1]==='HUM', 'salon : poignée de main, chaque joueur voit le camp de l\'autre ('+lobby.join(' / ')+')');
  await A.page.evaluate(() => startHostGame()); await B.page.waitForTimeout(250);
  const tick = async n => { for (let i=0;i<n;i++){ await A.page.evaluate(() => { for (let k=0;k<4;k++) update(0.05); net.sendState({ s:serialize(), ev:net.ev }); net.ev = []; });
      await B.page.evaluate(() => { netGuestTick(0.2); ctx.setTransform(SCALE,0,0,SCALE,0,0); render(1/60); }); } };
  await tick(5);
  const st = await B.page.evaluate(() => ({ g: !!game && game.net, fac: game && game.p.facKey, t: game && game.t }));
  check(st.g==='guest' && st.fac==='IA' && st.t>0, 'lancement : l\'invité reçoit le départ et les instantanés (t='+(st.t||0).toFixed(1)+' s)');
  // commandes de l'invité : recruter, construire, ordre — appliquées chez l'hôte, visibles chez l'invité
  await A.page.evaluate(() => { game.e.f = game.e.m = game.e.w = 2000; });                  // de quoi payer les trois ordres
  await B.page.evaluate(() => { tryBuy(game.p, 0); tryBuy(game.p, 2); tryBuild(game.p, game.p.slots[0], 'farmF'); setStance(game.p, 'hold'); setHeroStance(game.p, 'prudent'); });
  await A.page.evaluate(() => spawnHero(game.e));
  await tick(40);
  const cmd = { host: await A.page.evaluate(() => ({ u: game.e.units.length + game.e.queue.length, b: !!game.e.slots[0].b, st: game.e.stance })),
                guest: await B.page.evaluate(() => ({ u: game.p.units.length + (game.p.queueLen||0), b: !!game.p.slots[0].b, st: game.p.stance })) };
  const hst = [await A.page.evaluate(() => game.e.heroStance), await B.page.evaluate(() => game.p.heroStance + '/' + game.p.units.some(u=>u.role==='hero'))];
  check(hst[0]==='prudent' && hst[1]==='prudent/true', 'posture du héros de l\'invité : commande appliquée par l\'hôte, héros et posture visibles chez l\'invité ('+hst.join(' · ')+')');
  check(cmd.host.u>=2 && cmd.host.b && cmd.host.st==='hold' && cmd.guest.u>=2 && cmd.guest.b && cmd.guest.st==='hold',
    'commandes de l\'invité (recruter, construire, tenir) : appliquées par l\'hôte et reflétées chez l\'invité');
  // vitesse : proposition de l'invité, acceptée par l'hôte
  await B.page.evaluate(() => pickSpeed(2)); await A.page.waitForTimeout(200);
  await A.page.evaluate(() => castSpeedVote(true)); await B.page.waitForTimeout(200);
  const spd = [await A.page.evaluate(() => game.speed), await B.page.evaluate(() => game.speed)];
  check(spd[0]===2 && spd[1]===2, 'vote de vitesse ×2 : accepté, appliqué des deux côtés');
  // pause négociée : demandée par l'hôte, levée par l'hôte
  await A.page.evaluate(() => toggleSoftPause()); await B.page.waitForTimeout(200);
  const pz1 = [await A.page.evaluate(() => paused), await B.page.evaluate(() => paused)];
  await A.page.evaluate(() => toggleSoftPause()); await B.page.waitForTimeout(200);
  const pz2 = [await A.page.evaluate(() => paused), await B.page.evaluate(() => paused)];
  check(pz1[0] && pz1[1] && !pz2[0] && !pz2[1], 'pause en ligne : figée puis reprise des deux côtés');
  // fin de partie : la base de l'invité tombe deux fois (phase 2 puis défaite)
  await A.page.evaluate(() => { game.e.hp = 0; }); await tick(3); await A.page.evaluate(() => { game.e.hp = 0; }); await tick(3);
  await A.page.waitForTimeout(1300);
  const end = [await A.page.evaluate(() => ({ over: game.over, win: game.win, shown: document.getElementById('endscreen').style.display })),
               await B.page.evaluate(() => ({ over: game.over, win: game.win, shown: document.getElementById('endscreen').style.display }))];
  check(end[0].over && end[0].win && end[1].over && !end[1].win && end[0].shown==='flex' && end[1].shown==='flex',
    'fin de partie : victoire chez l\'hôte, défaite chez l\'invité, écran de fin des deux côtés');
  check(!A.errs.length && !B.errs.length, 'aucune erreur JS chez l\'hôte ni chez l\'invité'+((A.errs[0]||B.errs[0])? ' — '+(A.errs[0]||B.errs[0]) : ''));
  await A.page.close(); await B.page.close();
}

await browser.close();
console.log(`\n${fails? '✗ '+fails+' ÉCHEC(S)' : '✓ TOUT VERT'}${warns? ' ('+warns+' avertissement(s))' : ''} — ${((Date.now()-t0)/1000).toFixed(0)} s`);
process.exit(fails? 1 : 0);
