/* Parcours UX de la campagne en captures d'écran (QA v1.16) : menu, briefings I-V (fr, ar, zh), premières secondes de chaque
   mission (plans d'ouverture, objectif, panneau « ? », radio), passage d'acte et choix final de la mission V, les deux fins,
   écran de fin « mission suivante ». Chaque capture est prise à 1280×720 (-d) puis 844×390 (-p).
   usage : node tools/qa-camp-shots.mjs <dossier-de-sortie> [part,part…]   parts : menu,brief,mis,m5   (défaut : tout)
   Écrit aussi <dossier>/overflow.txt : éléments du briefing qui débordent. Ne modifie rien du jeu. */
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const OUT = process.argv[2]; mkdirSync(OUT, { recursive:true });
const PARTS = (process.argv[3] || 'menu,brief,mis,m5').split(',');
const GAME = 'file://' + fileURLToPath(new URL('../la-derniere-bataille.html', import.meta.url));
const DESK = { width:1280, height:720 }, PHONE = { width:844, height:390 };
const browser = await chromium.launch();
const log = []; const note = m => { console.log(m); log.push(m); };

async function mk(lang){
  const page = await browser.newPage({ viewport:DESK });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text()); });
  await page.addInitScript(l => { window.requestAnimationFrame = () => 0;
    try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
      localStorage.setItem('agi_settings', JSON.stringify({ quality:'high', lang:l, music:false, sfx:false })); } catch(e){} }, lang);
  await page.goto(GAME); await page.waitForTimeout(500);
  await page.evaluate(() => {
    goFullscreen = () => {};
    window.showShot = f => { const s = cineShot(); CINE.t = cineDur(s)*f; render(0.016); };
    window.cineWalk = (choice, stopLast) => { let guard = 0;
      while (CINE.on && guard++ < 80){ const s = CINE.script[CINE.i];
        if (stopLast && CINE.i===CINE.script.length-1 && !s.choice){ CINE.t = cineDur(s)*0.9; render(1/60); return 'last'; }
        CINE.t = 0.3; cineTick(0.05); render(1/60); CINE.t = 1.5; render(1/60);
        if (s && s.choice){ if (choice==null){ CINE.t = 3; render(1/60); return 'choice'; } cineEnd(); if (CINE.script[CINE.i]!==s) return 'x'; cineInput(-1,-1); cinePick(choice); }
        else { CINE.t = 99; cineTick(0.05); } }
      return 'done'; };
    window.adv = (sec) => { for (let k = 0; k < sec*20 && !game.over; k++){ if (CINE.on){ CINE.t = 99; cineTick(0.05); } update(0.05); if (k%10===0) render(0.016); } render(0.016); };
  });
  return { page, errs };
}
// une capture aux deux formats
async function shoot(page, name){
  await page.evaluate(() => { try { if (typeof game!=='undefined' && game) render(0.016); } catch(e){} });
  await page.screenshot({ path:`${OUT}/${name}-d.png` });
  await page.setViewportSize(PHONE); await page.waitForTimeout(250);
  await page.evaluate(() => { try { if (typeof game!=='undefined' && game) render(0.016); } catch(e){} });
  await page.screenshot({ path:`${OUT}/${name}-p.png` });
  await page.setViewportSize(DESK); await page.waitForTimeout(250);
  await page.evaluate(() => { try { if (typeof game!=='undefined' && game) render(0.016); } catch(e){} });
}
const overflow = () => { const box = document.getElementById('campBrief'), out = [], vw = innerWidth;
  for (const e of box.querySelectorAll('*')){ const r = e.getBoundingClientRect(); if (!r.width) continue;
    if (e.scrollWidth > e.clientWidth+2 && getComputedStyle(e).overflowX!=='auto' && getComputedStyle(e).overflowX!=='scroll' && e.clientWidth>0) out.push('scrollW '+e.tagName+'.'+e.className+' '+e.scrollWidth+'>'+e.clientWidth);
    if (r.right > vw+2 || r.left < -2) out.push('hors écran '+e.tagName+'.'+e.className+' '+Math.round(r.left)+'..'+Math.round(r.right)+' / '+vw); }
  const body = box.querySelector('.cbBody'); out.push('(corps : scrollH '+(body&&body.scrollHeight)+' clientH '+(body&&body.clientHeight)+')'); return out.slice(0, 14); };

if (PARTS.includes('menu')){
  const { page, errs } = await mk('fr');
  await page.evaluate(() => { CAMP_SAVE.done = 0; CAMP_SAVE.best = {}; campSave(); const tb = document.querySelector('.tab[data-page="camp"]'); tb.click(); });
  await page.waitForTimeout(300); await shoot(page, 'menu-camp-nouveau');
  await page.evaluate(() => { CAMP_SAVE.done = 3; CAMP_SAVE.best = {0:376,1:140,2:410}; CAMP_SAVE.bonus = {0:1}; campSave(); campRenderMenu(); });
  await shoot(page, 'menu-camp-avance');
  await page.evaluate(() => { CAMP_SAVE.done = 5; campSave(); campRenderMenu(); });
  await shoot(page, 'menu-camp-fini');
  note('menu : erreurs JS '+JSON.stringify(errs)); await page.close();
}
if (PARTS.includes('brief')){
  for (const lang of ['fr','ar','zh']){
    const { page, errs } = await mk(lang);
    for (let i = 0; i < 5; i++){
      for (const vp of [['d',DESK],['p',PHONE]]){
        await page.setViewportSize(vp[1]); await page.waitForTimeout(200);
        await page.evaluate(i => { CAMP_SAVE.done = 5; CAMP_SAVE.diff = 1; campBriefOpen(i); }, i);
        await page.waitForTimeout(150);
        const ov = await page.evaluate(overflow); note(`briefing m${i+1} ${lang} ${vp[0]} : ${ov.join(' ; ')}`);
        const dims = await page.evaluate(() => { const b = document.querySelector('#campBrief .cbBody'); return [b.scrollHeight, b.clientHeight]; });
        const pages = Math.max(1, Math.ceil(dims[0]/dims[1]));
        for (let k = 0; k < Math.min(pages, 5); k++){
          await page.evaluate(k => { const b = document.querySelector('#campBrief .cbBody'); b.scrollTop = k*(b.clientHeight-30); }, k);
          await page.waitForTimeout(80);
          await page.screenshot({ path:`${OUT}/brief-m${i+1}-${lang}-${vp[0]}-${k}.png` });
        }
      }
    }
    // difficulté « Dernier carré » + seconde doctrine, mission II (fr uniquement)
    if (lang==='fr'){ await page.setViewportSize(DESK);
      await page.evaluate(() => { CAMP_SAVE.diff = 2; CAMP_SAVE.doc[1] = 1; campBriefOpen(1); document.querySelector('#campBrief .cbBody').scrollTop = 400; });
      await page.screenshot({ path:`${OUT}/brief-m2-fr-d-dernier-carre.png` }); }
    note('briefing '+lang+' : erreurs JS '+JSON.stringify(errs)); await page.close();
  }
}
if (PARTS.includes('mis')){
  const { page, errs } = await mk('fr');
  for (let i = 0; i < 5; i++){
    await page.setViewportSize(DESK);
    await page.evaluate(i => { let s = 77+i; Math.random = () => { s = (s*16807)%2147483647; return (s-1)/2147483646; }; CAMP_SAVE.done = 5; CAMP_SAVE.diff = 1; delete CAMP_SAVE.doc[i]; campStart(i); }, i);
    const n = await page.evaluate(() => CINE.on? CINE.script.length : 0);
    note(`mission ${i+1} : ouverture de ${n} plans`);
    await page.evaluate(() => showShot(0.9)); await shoot(page, `m${i+1}-a-ouverture-plan1`);
    if (n > 3){ await page.evaluate(n => { for (let k = 0; k < (n>>1); k++){ CINE.t = 99; cineNext(); } showShot(0.9); }, n); await shoot(page, `m${i+1}-a-ouverture-milieu`); }
    await page.evaluate(() => { cineEnd(); adv(4); });
    await shoot(page, `m${i+1}-b-debut-4s`);
    await page.evaluate(() => { campHelp(true); render(0.016); });
    await shoot(page, `m${i+1}-c-aide`);
    await page.evaluate(() => { campHelp(false); adv(1); });
    // laisse tomber la première radio : on avance jusqu'à ce qu'un message soit affiché
    const got = await page.evaluate(() => { for (let k = 0; k < 90; k++){ adv(2); if (game.camp.cur && game.camp.cur.t > 1.5) return game.camp.cur.txt? String(game.camp.cur.txt).slice(0,60) : 'radio'; } return null; });
    note(`mission ${i+1} : radio affichée = ${got}`);
    await shoot(page, `m${i+1}-d-radio`);
    await page.evaluate(() => { game = null; });
  }
  note('missions : erreurs JS '+JSON.stringify(errs)); await page.close();
}
if (PARTS.includes('m5')){
  const { page, errs } = await mk('fr');
  let src = readFileSync(new URL('./camp-m5.mjs', import.meta.url), 'utf8');
  src = src.slice(src.indexOf('const play = '), src.indexOf("console.log('\\nCAMPAGNE"));
  const A = "let steps = 0, think = 0, cines = 0, buyI = 0, mode = 'build'; const acts = [0,0,0,0], tr = [], seen = {};";
  const B = 'while (!g.over && steps++ < 46000){';
  if (!src.includes(A) || !src.includes(B)) throw new Error('camp-m5.mjs a changé : adapter qa-camp-shots.mjs');
  src = src.replace(A, "const W_ = window.__PS || (window.__PS = {steps:0,think:0,cines:0,buyI:0,mode:'build',acts:[0,0,0,0],tr:[],seen:{}}); let {steps,think,cines,buyI,mode} = W_; const {acts,tr,seen} = W_;")
           .replace(B, "while (!g.over && steps++ < 46000){ if (!CINE.on) W_.cs = 0; if (CINE.on && !W_.cs){ W_.cs = 1; Object.assign(W_,{steps,think,cines,buyI,mode}); return {paused:true, act:c.act, t:Math.round(c.t)}; }");
  await page.setViewportSize(DESK);
  await page.evaluate(() => { let s = 20251031; Math.random = () => { s = (s*16807)%2147483647; return (s-1)/2147483646; }; CAMP_SAVE.done = 5; CAMP_SAVE.diff = 1; delete CAMP_SAVE.doc[4]; campStart(4); cineEnd(); });
  await page.evaluate('window.__play = ' + src.trim().replace(/^const play = /, '').replace(/;$/, ''));
  let r, nPause = 0;
  for (let guard = 0; guard < 12; guard++){
    r = await page.evaluate(() => window.__play({ bot:true, trace:false }));
    if (!r.paused) break;
    nPause++; note(`mission V : scène en mission n°${nPause} (acte ${r.act}, ${r.t} s)`);
    await page.evaluate(() => { showShot(0.9); }); await shoot(page, `m5-acte-scene${nPause}-plan1`);
    await page.evaluate(() => { if (CINE.script.length>1){ CINE.t = 99; cineNext(); showShot(0.9); } }); await shoot(page, `m5-acte-scene${nPause}-plan2`);
    await page.evaluate(() => { let k = 0; while (CINE.on && k++ < 40){ CINE.t = 99; cineTick(0.05); } render(0.016); });
    await shoot(page, `m5-acte-scene${nPause}-apres`);
  }
  note(`mission V : bot ${r.win? 'VICTOIRE' : 'défaite'} à ${r.t} s, actes ${JSON.stringify(r.acts)}, ${errs.length} erreurs`);
  await page.waitForTimeout(1500);
  for (const pick of [0, 1]){
    await page.evaluate(() => { document.getElementById('endscreen').style.display = 'none'; if (!CINE.on) campEndCine(); });
    const st = await page.evaluate(() => cineWalk(null)); note(`mission V fin : arrêt sur ${st}`);
    if (pick===0) await shoot(page, 'm5-choix');
    await page.evaluate(p => { cineWalk(p, true); }, pick); await shoot(page, `m5-fin${pick+1}-derniere-image`);
    await page.evaluate(() => { let k = 0; while (CINE.on && k++ < 40){ CINE.t = 99; cineTick(0.05); } render(0.016); });
    await page.waitForTimeout(300);
    note(`mission V fin ${pick+1} : ending=${await page.evaluate(() => game.camp.ending)}, bouton « ${await page.evaluate(() => { const b = document.getElementById('campNextBtn'); return b.style.display+' / '+b.textContent; })} »`);
    await shoot(page, `m5-fin${pick+1}-ecran-final`);
  }
  note('mission V : erreurs JS '+JSON.stringify(errs.slice(0,5))); await page.close();
  // écran de fin « mission suivante » : victoire de la mission I
  const q = await mk('fr');
  await q.page.evaluate(() => { CAMP_SAVE.done = 1; campStart(0); cineEnd(); adv(2); game.over = true; game.win = true; campResult(); showEnd(); });
  await q.page.waitForTimeout(400); await shoot(q.page, 'fin-m1-mission-suivante');
  note('fin m1 : erreurs JS '+JSON.stringify(q.errs)); await q.page.close();
}
writeFileSync(OUT+'/notes.txt', log.join('\n')+'\n');
await browser.close();
