/* tools/regression.mjs — suite de NON-RÉGRESSION jouée dans un vrai navigateur (Playwright).
   Couvre : chargement dans les 9 langues (+ traductions manquantes), tutoriel pas à pas,
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

console.log('\nTUTORIEL');
{ const { page, errs } = await open();
  const r = await page.evaluate(() => { startTutorial(); const n = TUT.steps.length; let bad = 0;
    for (let i=0;i<n;i++){ try { TUT.i = i; tutEnterStep(); for (let k=0;k<10;k++) update(0.05); render(1/60);
      const f = TUT.steps[i].focus && TUT.steps[i].focus(); } catch(e){ bad++; } }
    return { n, bad }; });
  check(r.n>=20 && r.bad===0 && !errs.length, r.n+' étapes : enter() + simulation + rendu sans exception'+(errs[0]? ' — '+errs[0] : ''));
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
    let net = 'ok'; try { applySnapshot(snap); render(1/60); } catch(e){ net = e.message; }
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

await browser.close();
console.log(`\n${fails? '✗ '+fails+' ÉCHEC(S)' : '✓ TOUT VERT'}${warns? ' ('+warns+' avertissement(s))' : ''} — ${((Date.now()-t0)/1000).toFixed(0)} s`);
process.exit(fails? 1 : 0);
