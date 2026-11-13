// Banc d'essai d'une mission de campagne (missions II et III) : rejoue la mission, boucle gelée,
// à chaque niveau de récit — un joueur scripté doit GAGNER, un joueur passif doit PERDRE — et
// vérifie que toutes les cinématiques (ouverture, en mission, clôture) démarrent, se déroulent ou
// se passent et finissent sans erreur. Sortie non nulle en cas d'échec.
//   usage : import { campRun } from './_camp-run.mjs'; await campRun({ mission, bot, info })
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const GAME = new URL('../la-derniere-bataille.html', import.meta.url).href;

// une méthode abrégée « bot(g){…} » devient une expression de fonction
const fnSrc = f => { const t = f.toString(); return /^[A-Za-z_$][\w$]*\s*\(/.test(t) && !/^function\b/.test(t)? 'function '+t : t; };
export async function campRun({ mission, bot, info, maxMin = 14, levels = (process.env.LEVELS || '0,1,2').split(',').map(Number) }){
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  let fails = 0;
  const ko = m => { console.log('  ✗ '+m); fails++; }, ok = m => console.log('  ✓ '+m);
  for (const lvl of levels) for (const active of [true, false]){
    const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0;
      try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
        localStorage.setItem('agi_settings', JSON.stringify({ quality:'high', lang:'fr', music:false, sfx:false })); } catch(e){} });
    await page.goto(GAME); await page.waitForTimeout(300);
    const r = await page.evaluate(([mission, lvl, active, botSrc, infoSrc, maxMin, tstep, DOC]) => {
      let s = 20280317 + lvl*101 + (active? 7 : 0); Math.random = () => { s = (s*16807)%2147483647; return (s-1)/2147483646; };
      CAMP_SAVE.done = 5; CAMP_SAVE.lvl = lvl; if (DOC) CAMP_SAVE.doc[mission] = 1; else delete CAMP_SAVE.doc[mission]; campLaunch(mission);   // DOC=1 : seconde doctrine
      const out = { intro:0, cines:0, shots:0, err:null };
      const play = skip => { if (skip){ cineEnd(); return; }                // déroule chaque plan (rendu compris) ou passe la scène
        let n = 0; while (CINE.on && n++ < 40){ const sh = cineShot(); CINE.t = cineDur(sh)*0.6; render(0.016); out.shots++; cineNext(); } };
      if (!CINE.on) out.err = 'pas de cinématique d’ouverture';
      while (CINE.on && out.intro < 40){ const sh = cineShot(); CINE.t = cineDur(sh)*0.6; render(0.016); out.intro++; cineNext(); }
      const bot = active? new Function('return ('+botSrc+')')() : null, inf = new Function('return ('+infoSrc+')')();
      let st = 0; const max = maxMin*60*20, trace = [];
      while (!game.over && st < max){
        if (CINE.on){ out.cines++; play(!active); }
        update(0.05); st++;
        if (bot && st%20===0) bot(game, game.camp, st);
        if (st%(tstep*20)===0){ render(0.016); trace.push(Math.round(game.t)+'s '+inf(game, game.camp)); }
      }
      return { ...out, over:game.over, win:game.win, t:Math.round(game.t), info:inf(game, game.camp), trace };
    }, [mission, lvl, active, fnSrc(bot), fnSrc(info), maxMin, +(process.env.TSTEP||60), process.env.DOC==='1']);
    await page.waitForTimeout(1400);                                           // campEndCine part après 1,1 s (minuterie réelle)
    const o = await page.evaluate(() => { const o = { on:CINE.on, shots:0 };
      let n = 0; while (CINE.on && n++ < 40){ const sh = cineShot(); CINE.t = cineDur(sh)*0.6; render(0.016); o.shots++; cineNext(); }
      o.end = getComputedStyle(document.getElementById('endscreen')).display; return o; });
    const tag = `niv. ${lvl} · ${active? 'joueur scripté' : 'joueur passif'}`;
    console.log(`${tag} : ${r.over? (r.win? 'VICTOIRE' : 'DÉFAITE') : 'NON TERMINÉE'} à ${Math.floor(r.t/60)}:${('0'+r.t%60).slice(-2)} — ${r.info} | ouverture ${r.intro} plans, ${r.cines} scènes en mission (${r.shots} plans), clôture ${o.shots} plans`);
    if (process.env.TRACE) console.log('    '+r.trace.join('\n    '));
    if (r.err) ko(r.err);
    if (!r.over) ko(tag+' : la mission ne se termine pas');
    else if (r.win !== active) ko(tag+' : attendu '+(active? 'une victoire' : 'une défaite'));
    else ok(tag+' : issue attendue');
    if (r.intro < 3) ko(tag+' : cinématique d’ouverture trop courte');
    if (active && r.cines < 2) ko(tag+' : moins de deux cinématiques en mission');
    if (r.over && (!o.on || o.shots < 1)) ko(tag+' : pas de cinématique de clôture');
    if (r.over && o.end === 'none') ko(tag+' : écran de fin absent après la clôture');
    if (errs.length) ko(tag+' : erreurs JS : '+errs.slice(0,3).join(' | '));
    await page.close();
  }
  await browser.close();
  console.log(fails? `\n${fails} échec(s)` : '\ntout est bon');
  process.exit(fails? 1 : 0);
}
