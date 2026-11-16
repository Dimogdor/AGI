/* Aide pour l'audit de cohérence visuelle (v1.16) : ouvre le jeu figé (boucle gelée, rendu manuel),
   expose __R() (rendu d'une image) et __fresh() (partie neuve, sans unités) pour photographier chaque
   élément à l'échelle du jeu. Ne modifie rien du jeu. Prérequis : npm run dev. */
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
export const GAME = 'file://' + fileURLToPath(new URL('../la-derniere-bataille.html', import.meta.url));
export async function ouvrir({ dsf = 2, lang = 'fr' } = {}){
  const browser = await chromium.launch();
  const ctxB = await browser.newContext({ viewport:{ width:1280, height:720 }, deviceScaleFactor:dsf });
  const page = await ctxB.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await page.addInitScript((lang) => { window.requestAnimationFrame = () => 0;
    try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
      localStorage.setItem('agi_settings', JSON.stringify({ quality:'high', lang, music:false, sfx:false })); } catch(e){} }, lang);
  await page.goto(GAME); await page.waitForTimeout(500);
  await page.evaluate(() => { document.getElementById('menu').style.display = 'none';
    window.__R = (n=1) => { for (let i=0;i<n;i++){ ctx.setTransform(SCALE,0,0,SCALE,0,0); render(1/60); } };
    window.__fresh = (fac, era=0, trans=false) => { newGame(fac, 1, false); game.aiThink = 1e9; camFollow = false; game.t = 50;
      for (const S of [game.p, game.e]){ S.units.length = 0; S.era = era; S.trans = trans; S.hp = S.maxhp; }
      wrecks.length = 0; shots.length = 0; projectiles.length = 0; particles.length = 0; deaths.length = 0; };
    // fond neutre (« planche contact ») : ciel pâle + sol plat, sans décor ni socles ; le vrai fond reste dispo avec __vrai()
    window.__drawBG0 = drawBG; window.__drawNode0 = drawNode; window.__gY0 = gY; window.__drawSlot0 = drawSlot; window.__drawBase0 = drawBase;
    window.__neutre = (on=true) => { if (on){ window.drawBG = () => { const g = ctx.createLinearGradient(0,0,0,GROUND+80); g.addColorStop(0,'#dcd6c4'); g.addColorStop(1,'#cfc8b2');
        ctx.fillStyle = g; ctx.fillRect(0,0,VW()+4,GROUND+400); ctx.fillStyle = '#b3aa8e'; ctx.fillRect(0,GROUND,VW()+4,400); ctx.fillStyle='#6d6650'; ctx.fillRect(0,GROUND,VW()+4,1.2); };
        window.drawNode = () => {}; window.drawSlot = () => {}; window.drawBase = () => {}; window.gY = () => GROUND; } else { window.drawSlot = window.__drawSlot0; window.drawBase = window.__drawBase0; window.gY = window.__gY0; window.drawBG = window.__drawBG0; window.drawNode = window.__drawNode0; } };
    // pose les unités « posées » (apparition terminée) puis rend deux images
    window.__pose = (cx) => { camX = cx; __R(1); game.t += 3; __R(2); };
  });
  return { browser, page, errs };
}
// découpe autour de la ligne du sol : hauteur haut/bas en px CSS
export async function cliche(page, path, { x=0, w=1280, haut=230, bas=40 } = {}){
  const yg = await page.evaluate(() => Y_G * 1); // Y_G est déjà en px CSS (logique) : multiplié par le rapport écran ci-dessous
  const k = await page.evaluate(() => innerWidth / W);
  await page.screenshot({ path, clip:{ x, y:Math.max(0, yg*k-haut), width:w, height:haut+bas } });
}
