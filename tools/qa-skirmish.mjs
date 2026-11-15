/* Escarmouche : passe de sanité QA (v1.16). Pour chaque camp (HUM, IA) et chaque difficulté demandée, le joueur compétent
   (tools/_bots.js) affronte l'IA, boucle gelée ; le script exerce aussi : frappe/mise à jour (grève/« patch » qui figent un camp),
   ordres de point, postures du héros, rendu de toutes les bases, sons et musique (repli synthétique, hors serveur).
   Échoue sur la moindre exception JS / erreur console, NaN, partie sans issue. Ne modifie rien du jeu.
   usage : node tools/qa-skirmish.mjs [niveaux=1,2] [minutes=14]      (npm run dev avant) */
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const GAME = 'file://' + fileURLToPath(new URL('../la-derniere-bataille.html', import.meta.url));
const BOTS = readFileSync(new URL('./_bots.js', import.meta.url), 'utf8');
const LVLS = (process.argv[2] || '1,2').split(',').map(Number), MIN = +(process.argv[3] || 14);
const browser = await chromium.launch();
let fails = 0; const ok = m => console.log('  ✓ '+m), ko = m => { console.log('  ✗ '+m); fails++; };
for (const fac of ['HUM', 'IA']) for (const lvl of LVLS){
  const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text()); });
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0;
    try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
      localStorage.setItem('agi_settings', JSON.stringify({ quality:'high', lang:'fr', music:true, sfx:true })); } catch(e){} });   // son actif : on exerce le repli synthétique
  await page.goto(GAME); await page.waitForTimeout(400);
  await page.evaluate(BOTS);
  const r = await page.evaluate(([fac, lvl, MIN]) => {
    let s = 4242 + lvl; Math.random = () => { s = (s*16807)%2147483647; return (s-1)/2147483646; };
    try { audioInit(); musicStart(); } catch(e){}
    newGame(fac, lvl, false); const p = game.p; const st = {}; const seen = { strike:0, patch:0, hero:0, point:0, stances:new Set() };
    let steps = 0, bad = null; const max = MIN*60*20;
    while (!game.over && steps < max){
      update(0.05); steps++;
      if (steps%20===0){ __competent(st, {});
        if (game.weather==='strike') seen.strike++; if (game.weather==='patch') seen.patch++;
        if (p.units.some(u=>u.role==='hero')) seen.hero++;
        if (steps%400===0){ const hs = ['prudent','normal','offensive'][(steps/400)%3|0]; try { setHeroStance(p, hs); seen.stances.add(p.heroStance); } catch(e){ bad = 'setHeroStance: '+e.message; } }
        if (steps%600===300){ try { orderPoint(p, p.x + 500 + (steps%1200)); seen.point++; } catch(e){ bad = 'orderPoint: '+e.message; } }
        if (steps%100===0){ try { sfx('hit'); sfx('sel'); } catch(e){ bad = 'sfx: '+e.message; } }
      }
      if (steps%30===0) render(1/60);
      if (steps%200===0) for (const sd of [game.p, game.e]){ for (const k of ['f','m','w','xp','hp']) if (!Number.isFinite(sd[k])) bad = bad || ('NaN '+k); for (const u of sd.units) if (!Number.isFinite(u.x) || !Number.isFinite(u.hp)) bad = bad || ('NaN unité '+u.role); }
      if (bad) break;
    }
    return { over:game.over, win:game.win, t:Math.round(game.t), bad, era:[p.era, game.e.era], units:[p.units.length, game.e.units.length], strike:seen.strike, patch:seen.patch, hero:seen.hero, point:seen.point, stances:[...seen.stances].join(',') };
  }, [fac, lvl, MIN]);
  const tag = `${fac} niveau ${lvl}`;
  const line = `${r.over? (r.win? 'victoire' : 'défaite') : 'non terminée'} à ${Math.floor(r.t/60)}:${('0'+r.t%60).slice(-2)} · ères ${r.era.join('/')} · unités ${r.units.join('/')} · grève ${r.strike} patch ${r.patch} (ticks) · héros ${r.hero} · points ${r.point} · postures ${r.stances}`;
  (r.bad || errs.length)? ko(`${tag} : ${r.bad || ''} ${errs.slice(0,3).join(' | ')} — ${line}`) : ok(`${tag} : ${line}`);
  await page.close();
}
await browser.close();
console.log(fails? `\n${fails} échec(s)` : '\ntout est bon'); process.exit(fails? 1 : 0);
