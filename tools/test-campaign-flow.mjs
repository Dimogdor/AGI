/* tools/test-campaign-flow.mjs — parcours de la CAMPAGNE (moteur v1.16), joué dans un vrai Chromium.
   Vérifie : enchaînement continu mission N → clôture → écran de fin → briefing N+1 → choix de doctrine →
   cinématique d'ouverture → mission ; le carnet du menu ouvre le même briefing ; la difficulté change
   vraiment les paramètres ; aucune carte de campagne ne montre les lacs d'escarmouche ; un changement
   d'acte remet à zéro ce qu'il doit ; aucune machine n'apparaît derrière nos lignes (escorte) ; aide « ? » ;
   migration de la sauvegarde ; rien ne reste de la campagne une fois sorti.
   Prérequis : npm run dev.   Lancer : node tools/test-campaign-flow.mjs   (sortie non nulle en cas d'échec) */
import { chromium } from 'playwright-core';
const GAME = new URL('../la-derniere-bataille.html', import.meta.url).href;
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let fails = 0;
const ok = m => console.log('  ✓ '+m), ko = m => { console.log('  ✗ '+m); fails++; };
const check = (c, m) => c ? ok(m) : ko(m);
async function open(save){
  const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript((save) => { window.requestAnimationFrame = () => 0;
    localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
    localStorage.setItem('agi_settings', JSON.stringify({ quality:'high', lang:'fr', music:false, sfx:false }));
    if (save) localStorage.setItem('agi_camp', save); else localStorage.removeItem('agi_camp'); }, save || null);
  await page.goto(GAME); await page.waitForTimeout(300);
  await page.evaluate(() => { let s = 20261114; Math.random = () => { s = (s*16807)%2147483647; return (s-1)/2147483646; };
    window.R = () => { ctx.setTransform(SCALE,0,0,SCALE,0,0); render(1/60); };
    window.playCine = () => { let n = 0; while (CINE.on && n++ < 80){ CINE.t = cineDur(cineShot())*0.6; R(); cineNext(); } return n; }; });
  return { page, errs };
}
const t0 = Date.now();

console.log('\nCAMPAGNE · PARCOURS COMPLET (carnet → briefing → mission → fin → briefing suivant)');
{ const { page, errs } = await open();
  const r = await page.evaluate(() => {
    const out = [], vis = id => getComputedStyle(document.getElementById(id)).display !== 'none';
    document.getElementById('menu').style.display = 'flex';
    document.querySelector('.tab[data-page="camp"]').click();
    document.querySelector('#campBox .mis').click();                                   // le carnet ouvre le briefing plein écran
    for (let i=0;i<5;i++){
      const o = { i, brief:vis('campBrief'), menuHidden:!vis('menu'), endHidden:!vis('endscreen') };
      o.secs = document.querySelectorAll('#campBrief .cbSec').length;
      o.tips = document.querySelectorAll('#campBrief .cbTips li').length;
      o.title = (document.querySelector('#campBrief .cbTitle')||{}).textContent;
      o.cards = document.querySelectorAll('#campBrief .cbDoc').length;
      o.music = musicMode();
      if (o.cards===2){ document.querySelectorAll('#campBrief .cbDoc')[1].click(); o.docSaved = CAMP_SAVE.doc[i]===1; o.sel = document.querySelectorAll('#campBrief .cbDoc.sel').length; }
      document.querySelector('#campBrief .cbGo').click();                              // LANCER LA MISSION
      o.started = !!(game && game.camp && game.camp.i===i) && !vis('campBrief');
      o.introOn = CINE.on; o.intro = playCine();
      o.doc = campDoc(i)===(o.cards? DOCTRINES[CAMPAIGN[i].doctrines[1]] : null);
      for (let k=0;k<200;k++){ update(0.05); if (k%50===0) R(); if (CINE.on) playCine(); }
      o.hud = !!game.camp.helpRect;
      game.over = true; game.win = true; campEndCine(); o.outro = playCine();
      o.end = vis('endscreen'); o.done = CAMP_SAVE.done;
      const nb = document.getElementById('campNextBtn'); o.next = nb.style.display!=='none';
      out.push(o);
      if (i<4) nb.click();                                                             // « mission suivante » → briefing (jamais directement la partie)
    }
    return out; });
  for (const o of r) check(o.brief && o.menuHidden && o.endHidden && o.secs>=6 && o.tips>=2 && o.title && o.music && o.started && o.introOn && o.intro>=3 && o.doc && o.hud && o.outro>=1 && o.end && o.done===o.i+1
      && (o.i===0? o.cards===0 : o.cards===2 && o.docSaved && o.sel===1),
    `mission ${o.i+1} : briefing (${o.secs} sections, ${o.tips} conseils, ${o.cards} doctrines, musique « ${o.music} »), ouverture de ${o.intro} plans, mission, clôture, fin`);
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}

console.log('\nDIFFICULTÉ : des paramètres vraiment différents');
{ const { page, errs } = await open();
  const r = await page.evaluate(() => { const out = [];
    for (let d=0; d<3; d++){ CAMP_SAVE.diff = d; CAMP_SAVE.done = 5; delete CAMP_SAVE.doc[2];
      campStart(2); cineEnd();
      const e = game.e; spawnUnit(e, 1, false); const u = e.units[e.units.length-1]; const hp0 = u.maxhp; update(0.05);
      out.push({ d, ai:game.diff, f:game.p.f, emax:e.maxhp, unit:u.maxhp/hp0, base:game.p.maxhp, names:cT(CAMP_UI['d'+d]), lines:campDiffLines(campDiff(d), CAMPAIGN[2]).length }); }
    return out; });
  const inc = (k) => r[0][k] < r[1][k] && r[1][k] < r[2][k], dec = (k) => r[0][k] > r[1][k] && r[1][k] > r[2][k];
  check(inc('ai') && dec('f') && inc('emax') && inc('unit') && dec('base'), 'Récit → Lutte → Dernier carré : IA '+r.map(o=>o.ai).join('/')+', ressources '+r.map(o=>Math.round(o.f)).join('/')+', base ennemie '+r.map(o=>o.emax).join('/')+', vie des machines ×'+r.map(o=>o.unit.toFixed(2)).join('/')+', notre base '+r.map(o=>o.base).join('/'));
  check(r.every(o=>o.names && o.lines>=5), 'chaque niveau a un nom ('+r.map(o=>o.names).join(' / ')+') et ses lignes d’explication chiffrées');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}

console.log('\nCARTES : pas de lacs d’escarmouche, objets d’objectif');
{ const { page, errs } = await open();
  const r = await page.evaluate(() => { const out = []; CAMP_SAVE.done = 5;
    for (let i=0;i<5;i++){ campStart(i); cineEnd(); for (let k=0;k<20;k++) update(0.05); R();
      out.push({ i, nodes:game.nodes.length, custom:game.nodes.every(n=>n.look) && !!CAMPAIGN[i].drawNode, bz:game._bz && !game.bonusZone }); }
    // objet d'objectif générique : capturé par le moteur quand nos troupes s'en approchent
    campStart(0); cineEnd(); const c = game.camp; c.objs.push({ id:'test', x:900, r:80, rate:0.5, owner:null, prog:0, capture:true });
    for (let k=0;k<4;k++) spawnUnit(game.p, 1, false, 900);
    for (let k=0;k<100;k++){ update(0.05); for (const u of game.p.units) u.x = 900; } R();
    return { out, obj:c.objs[0].owner }; });
  for (const o of r.out) check((o.nodes===0 || o.custom) && o.bz, `mission ${o.i+1} : ${o.nodes? o.nodes+' points d’eau au visage du lieu' : 'aucun lac'}, pas de zone bonus d’escarmouche`);
  check(r.obj==='p', 'objet d’objectif de carte : capturé par nos troupes');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}

console.log('\nACTES : le passage d’acte remet à zéro ce qu’il doit (mission V)');
{ const { page, errs } = await open();
  const r = await page.evaluate(() => { CAMP_SAVE.done = 5; CAMP_SAVE.diff = 1; delete CAMP_SAVE.doc[4];
    campStart(4); cineEnd(); const g = game, c = g.camp, p = g.p;
    for (let k=0;k<24;k++) spawnUnit(p, k%3, false); p.f = p.m = p.w = 9999; tryBuild(p, p.slots[0], 'farmM');
    const y0 = gY(1800), n0 = p.units.length;
    c.sap = 99; g.e.hp = 0; let k = 0; while (!CINE.on && k++ < 20) update(0.05);
    const cine = CINE.on; playCine();
    return { cine, act:c.act, n0, n:p.units.length, f:Math.round(p.f), wantF:Math.round(450*c.D.res*(DOCTRINES.veterans.fx.res||1)), slots:p.slots.every(s=>!s.b),
      ehp:g.e.maxhp, want:M5.gate[1][c.lvl], terrain:Math.round(gY(1800)) !== Math.round(y0), zones:g.zones.length, goal:!!c.goalTxt, eUnits:g.e.units.every(u=>u.m5) }; });
  check(r.cine && r.act===2, 'la porte tombe → cinématique → acte II');
  check(r.n < r.n0 && r.n <= 5+3+4+1, `armée : ${r.n0} unités → ${r.n} (5 plus fortes + héros + escouade + doctrine)`);
  check(r.f===r.wantF && r.slots, `ressources remises à ${r.f} (fiche × difficulté), socles vidés`);
  check(r.ehp===r.want && r.terrain && r.zones===3 && r.goal, `nouvelle porte (${r.ehp} PV), nouveau relief, 3 baies, nouvel objectif annoncé`);
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}

console.log('\nESCORTE (mission II) : jamais de machines dans notre dos, grilles fermées, pas de base invulnérable');
{ const { page, errs } = await open();
  const r = await page.evaluate(() => { CAMP_SAVE.done = 5; CAMP_SAVE.diff = 2;
    campStart(1); cineEnd(); const g = game, c = g.camp, p = g.p;
    const spawn0 = spawnUnit, bad = [], all = [];
    window.spawnUnit = function(side, r, a, x){ const f = campFront(g), n = side.units.length; const out = spawn0.apply(this, arguments);
      if (side===g.e) for (let j=n;j<side.units.length;j++){ all.push(1); if (side.units[j].x < f - 40) bad.push(Math.round(f - side.units[j].x)); }
      return out; };
    p.f = p.m = p.w = 99999; let over = 0;
    for (let k=0;k<20*240 && !g.over;k++){
      if (CINE.on) cineEnd();
      if (k%20===0){ tryBuy(p, 1); tryBuy(p, 2); setStance(p, 'charge'); }                   // le joueur fonce droit devant
      update(0.05);
      for (const u of p.units) if (u.x > m2Lim(c) + 1) over++; }
    window.spawnUnit = spawn0;
    R();
    return { spawns:all.length, bad, over, shield:!!c.shield, seg:c.seg, mx:Math.round(c.mx), eAlive:g.e.hp===g.e.maxhp && !c.term.active }; });
  check(r.spawns>10 && !r.bad.length, `${r.spawns} machines apparues, aucune derrière notre front`+(r.bad.length? ' — '+r.bad.length+' en arrière (jusqu’à '+Math.max(...r.bad)+' px)' : ''));
  check(r.over===0, 'les grilles tiennent : aucune de nos troupes au-delà de la grille fermée');
  check(!r.shield && r.eAlive, 'plus de base invulnérable : le terminal est un décor inactif et hors de portée avant le tronçon 4');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}

console.log('\nAIDE « ? », SAUVEGARDE, SORTIE PROPRE');
{ const { page, errs } = await open('{"done":3,"lvl":2,"best":{"0":120},"doc":{"2":1}}');
  const r = await page.evaluate(() => { const o = { diff:CAMP_SAVE.diff, done:CAMP_SAVE.done, doc:CAMP_SAVE.doc[2], v:CAMP_SAVE.v };
    campStart(0); cineEnd(); for (let k=0;k<40;k++) update(0.05);
    const kd = code => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles:true }));
    kd('KeyO'); o.help = game.camp.help && paused; R();
    o.rects = !!(game.camp.helpRects && game.camp.helpRects.resume);
    kd('KeyO'); o.closed = !game.camp.help && !paused;
    const r = game.camp.helpRect; o.click = campClick(r.x+5, r.y+5) && game.camp.help; campHelp(false);
    campRadio('sol', CAMPAIGN[0].radio[0].txt); for (let k=0;k<10;k++) update(0.05); o.log = game.camp.log.length>0 && !!game.camp.cur;
    campSave(); o.saved = JSON.parse(localStorage.getItem('agi_camp')).diff;
    // sortie : retour au carnet puis escarmouche
    game.over = true; game.win = false; campEndCine(); playCine();
    document.getElementById('replayBtn').click();
    newGame('HUM', 1, false); for (let k=0;k<40;k++) update(0.05); R();
    o.clean = !game.camp && !game.biome && game.nodes.length===3 && !CAMP_BRIEF.open && musicMode()==='war';
    kd('KeyO'); o.keyFree = !paused;
    return o; });
  check(r.diff===2 && r.done===3 && r.doc===1 && r.v===2 && r.saved===2, 'sauvegarde v1 (« niveau de récit ») migrée vers la difficulté v2');
  check(r.help && r.rects && r.closed && r.click, 'touche O / bouton « ? » : l’aide met en pause et se referme');
  check(r.log, 'radio : message affiché et inscrit au journal');
  check(r.clean && r.keyFree, 'escarmouche après la campagne : aucun reste (lacs revenus, pas de briefing, musique de guerre, touche O libre)');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}

await browser.close();
console.log(`\n${fails? '✗ '+fails+' échec(s)' : '✓ parcours de campagne : tout passe'} (${Math.round((Date.now()-t0)/1000)} s)`);
process.exit(fails? 1 : 0);
