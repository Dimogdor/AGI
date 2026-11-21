/* tools/test-actions-states.mjs — AUDIT des actions du joueur dans tous les états (même famille de bugs que
   « on ne peut pas améliorer un bâtiment abîmé » : une variable non définie dans buildOptions levait une
   ReferenceError pendant le rendu → menu vide, ni réparer ni améliorer ; aucun test n'ouvrait ce menu).
   Principe : on joue avec les VRAIS gestionnaires (handleTap aux coordonnées des menus et des boutons du HUD,
   boucle gelée, update()/render() pilotés à la main), pour HUM et IA, à 1280×720 ET 844×390, et on vérifie
   à chaque fois : (1) aucune exception (pageerror, console.error, exception levée dans render/update/handleTap),
   (2) la liste des options du menu correspond à l'état, (3) chaque option a l'effet attendu (niveau +1, PV
   réparés, garnison, ressources débitées — ou rien si on ne peut pas payer).
   Couvre : menu de chaque bâtiment (farmF farmM well turret wall) plein / abîmé / niveau max / sans ressources /
   garnison pleine / avec sélection ; menu de la base (réparer, tout réparer, fortifier ×2, réparation auto,
   garde) pleine / abîmée / effondrement / transcendance ; barre d'actions (achat des 6 unités, amélioration de
   rôle ×3, ÉVOLUER, héros, posture, pouvoir, formation, ordres, capacité, tout réparer, caméra) en état normal /
   couvre-feu / mise à jour / ressources nulles ; chantier (annuler) ; socle vide (chaque construction) ;
   invité en ligne (commandes guestCmd jouées côté hôte) ; campagne (missions 1 à 5 : menu d'un bâtiment abîmé).
   Prérequis : npm run dev.   Lancer : node tools/test-actions-states.mjs   (code 1 au moindre échec ; ~1 min) */
import { chromium } from 'playwright-core';
const GAME = new URL('../la-derniere-bataille.html', import.meta.url).href;
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let fails = 0, nChecks = 0;
const ko = m => { console.log('  ✗ '+m); fails++; };
const t0 = Date.now();
const VPS = { desk:{ width:1280, height:720 }, phone:{ width:844, height:390 } };

/* ---------- bibliothèque injectée dans la page (hôte et invité) ---------- */
function LIB(){
  const E = window.__errs = [];
  const note = (n, e) => E.push(n+' : '+(e && e.message)+' @ '+String((e && e.stack)||'').split('\n').slice(1,3).join(' | ').trim());
  const wrap = (n, f) => (...a) => { try { return f(...a); } catch(e){ note(n, e); return undefined; } };
  const AX = window.AX = {};
  AX.R = wrap('render', () => { ctx.setTransform(SCALE,0,0,SCALE,0,0); render(1/60); });
  AX.U = wrap('update', (n=1) => { for (let i=0;i<n;i++){ if (!game.net) game.aiThink = 1e9; update(0.05); } });
  AX.tap = wrap('handleTap', (sx, sy) => handleTap(sx, sy, false, undefined));
  AX.drain = () => E.splice(0);
  AX.fresh = (fac) => {
    document.getElementById('menu').style.display = 'none';
    newGame(fac, 1, false); intro = -1; paused = false; settingsOpen = false; buildMenu = null; camFollow = false; camX = 0;
    game.aiThink = 1e9; game.e.hp = game.e.maxhp = 1e6;
    AX.rich(); AX.R(); return game.p;
  };
  AX.rich = () => { const p = game.p; p.f = p.m = p.w = 9000; p.cd = [0,0,0,0,0,0]; };
  AX.poor = () => { const p = game.p; p.f = p.m = p.w = 0; };
  AX.S = () => { const p = game.p; return { f:p.f, m:p.m, w:p.w }; };
  AX.mk = (slot, type, o={}) => { const p = game.p; slot.owner = p; slot.b = mkB(p, type);
    if (o.dmg) slot.b.hp = Math.floor(slot.b.maxhp*o.dmg); if (o.lvl) slot.b.lvl = o.lvl; return slot.b; };
  AX.unit = (ri, x, o={}) => { const p = game.p; spawnUnit(p, ri); const u = p.units[p.units.length-1]; u.x = x; u.task = null; if (o.sel) game.sel.add(u); return u; };
  // ouvre le menu d'un socle (ou de la base) par un VRAI clic ; renvoie les clés des options
  AX.open = (slot) => {
    const p = game.p, wx = slot? slot.x : p.x, gy = gY(wx);
    camX = clamp(wx - VW()/2, 0, WORLD-VW()); camFollow = false; AX.R();
    // on vise le HAUT du bâtiment (au-dessus des troupes qui passent devant) ; repli plus bas si rien ne s'ouvre
    for (const dy of (slot? [-70, -30, -10] : [-110, -60, -20])){ buildMenu = null; AX.tap(w2sX(wx), w2sY(gy+dy)); if (buildMenu) break; }
    AX.R();
    return buildMenu? (buildMenu.rects||[]).map(r => r.key) : null;
  };
  AX.click = (key) => {
    const r = buildMenu && (buildMenu.rects||[]).find(r => r.key===key); if (!r) return false;
    AX.tap(r.x + r.w/2, r.y + r.h/2); AX.R(); return true;
  };
  AX.btn = (type, f) => HUD.btns.find(b => b.type===type && (!f || f(b)));
  AX.press = (b) => { if (!b) return false; AX.tap(b.x + b.w/2, b.y + b.h/2); return true; };
  // état à la caisse : somme dépensée (m ignoré en transcendance)
  AX.paid = (a, b) => ({ f:a.f-b.f, m:a.m-b.m, w:a.w-b.w });
  AX.eqCost = (paid, cost, trans) => ['f','m','w'].every(r => (r==='m' && trans)? true : paid[r]===(cost[r]||0));
  AX.nomoney = (a, b) => a.f===b.f && a.m===b.m && a.w===b.w;
  AX.sameKeys = (a, b) => a && b && a.length===b.length && [...a].sort().join()===[...b].sort().join();
}

async function open(vpName, fac){
  const page = await browser.newPage({ viewport: VPS[vpName] });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror '+e.message));
  page.on('console', m => { if (m.type()==='error') errs.push('console.error '+m.text()); });
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0;
    try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
      localStorage.setItem('agi_settings', JSON.stringify({ quality:'low', lang:'fr', music:false, sfx:false })); } catch(e){} });
  await page.goto(GAME); await page.waitForTimeout(350);
  await page.evaluate(() => { let s = 20261121; Math.random = () => { s = (s*16807)%2147483647; return (s-1)/2147483646; }; resize(); });
  await page.evaluate(LIB);
  return { page, errs };
}

/* Chaque « cas » rend un tableau de [bool, message] ; les erreurs JS de la page sont ajoutées ici. */
async function runCases(tag, page, errs, fn, arg){
  const res = await page.evaluate(fn, arg);
  const jsErr = await page.evaluate(() => AX.drain());
  let bad = 0;
  for (const [okk, m] of res){ nChecks++; if (!okk){ bad++; ko(`[${tag}] ${m}`); } }
  for (const e of [...jsErr, ...errs.splice(0)]){ nChecks++; bad++; ko(`[${tag}] erreur JS : ${e}`); }
  return bad;
}

/* =================== 1. MENUS DES BÂTIMENTS =================== */
function CASES_BUILDINGS(){
  const out = []; const A = (c, m) => out.push([!!c, m]);
  const TYPES = ['farmF','farmM','well','turret','wall'];
  for (const type of TYPES){
    const gar = type==='turret' || type==='wall';
    // oracle indépendant de buildOptions : options attendues d'après l'état
    const expect = (b, sel) => { const k = [];
      if (b.hp<b.maxhp) k.push('repair');
      if ((b.lvl||1)<3) k.push('upgrade');
      if (gar && b.gar.length<garMax(b)){ if (sel) k.push('garrison'); k.push('gar_ranged','gar_siege'); }
      if (b.gar.length) k.push('ungarrison');
      k.push('demolish'); return k; };
    const L = (s) => type+' · '+s+' : ';
    // --- plein ---
    { const p = AX.fresh(game_fac); const s = p.slots[0]; const b = AX.mk(s, type);
      const keys = AX.open(s);
      A(keys, L('plein')+'le menu s\'ouvre'); A(keys && AX.sameKeys(keys, expect(b, false)), L('plein')+'options conformes ('+keys+')');
      A(keys && !keys.includes('repair'), L('plein')+'pas de réparation proposée');
      const before = AX.S(), cost = upgBuildCost(s), mhp = b.maxhp;
      A(AX.click('upgrade'), L('plein')+'clic ⬆'); A(b.lvl===2 && Math.abs(b.maxhp-mhp*1.3)<1e-6, L('plein')+'niveau 2, PV max ×1,3');
      A(AX.eqCost(AX.paid(before, AX.S()), cost, p.trans), L('plein')+'coût débité'); AX.U(2); }
    // --- abîmé : réparer ---
    { const p = AX.fresh(game_fac); const s = p.slots[1]; const b = AX.mk(s, type, {dmg:0.4});
      const keys = AX.open(s);
      A(keys && keys.includes('repair') && keys.includes('upgrade'), L('abîmé')+'réparer ET améliorer proposés ('+keys+')');
      A(keys && AX.sameKeys(keys, expect(b, false)), L('abîmé')+'options conformes');
      const before = AX.S(), cost = repairCost(b.hp, b.maxhp, 60, p);
      A(AX.click('repair'), L('abîmé')+'clic réparer'); A(b.hp===b.maxhp, L('abîmé')+'PV rendus');
      A(AX.eqCost(AX.paid(before, AX.S()), cost, p.trans), L('abîmé')+'coût de réparation débité'); AX.U(2); }
    // --- abîmé : AMÉLIORER (le bug signalé) ---
    { const p = AX.fresh(game_fac); const s = p.slots[2]; const b = AX.mk(s, type, {dmg:0.4}); const hp0 = b.hp, mhp = b.maxhp;
      const keys = AX.open(s); const before = AX.S(), cost = upgBuildCost(s);
      A(keys && keys.includes('upgrade'), L('abîmé')+'⬆ proposé');
      A(AX.click('upgrade'), L('abîmé')+'clic ⬆'); A(b.lvl===2 && b.maxhp>mhp && b.hp>hp0 && b.hp<=b.maxhp, L('abîmé')+'amélioré malgré les dégâts (lvl '+b.lvl+', pv '+Math.round(b.hp)+'/'+Math.round(b.maxhp)+')');
      A(AX.eqCost(AX.paid(before, AX.S()), cost, p.trans), L('abîmé')+'coût ⬆ débité'); AX.U(2);
      // améliorer deux fois de suite → niveau 3, puis plus d'option ⬆
      const k2 = AX.open(s); A(k2 && k2.includes('upgrade') && AX.click('upgrade') && b.lvl===3, L('abîmé')+'2e amélioration → niveau 3');
      const k3 = AX.open(s); A(k3 && !k3.includes('upgrade') && k3.includes('repair'), L('niveau max abîmé')+'plus de ⬆, réparation toujours là ('+k3+')');
      A(AX.click('repair') && b.hp===b.maxhp, L('niveau max abîmé')+'réparation OK'); }
    // --- niveau max, plein ---
    { const p = AX.fresh(game_fac); const s = p.slots[0]; const b = AX.mk(s, type, {lvl:3});
      const keys = AX.open(s); A(keys && AX.sameKeys(keys, expect(b, false)) && !keys.includes('upgrade') && !keys.includes('repair'), L('niveau max')+'ni ⬆ ni réparation ('+keys+')'); }
    // --- sans ressources : le menu doit s'ouvrir et les clics ne rien faire (ni planter) ---
    { const p = AX.fresh(game_fac); const s = p.slots[0]; const b = AX.mk(s, type, {dmg:0.3}); AX.poor();
      const keys = AX.open(s); A(keys && keys.length>=3, L('fauché')+'le menu s\'ouvre quand même ('+keys+')');
      const b0 = AX.S(), hp0 = b.hp;
      AX.click('repair'); A(b.hp===hp0 && AX.nomoney(b0, AX.S()), L('fauché')+'réparer impossible, rien de débité');
      AX.open(s); AX.click('upgrade'); A((b.lvl||1)===1 && AX.nomoney(b0, AX.S()), L('fauché')+'⬆ impossible, rien de débité'); AX.U(2); }
    // --- démolir ---
    { const p = AX.fresh(game_fac); const s = p.slots[0]; const b = AX.mk(s, type, {dmg:0.5}); AX.open(s);
      A(AX.click('demolish') && !s.b, L('démolir')+'bâtiment retiré'); AX.U(2); }
    if (!gar){ const p = AX.fresh(game_fac); const s = p.slots[0]; AX.mk(s, type); const keys = AX.open(s);
      A(keys && !keys.some(k => k.startsWith('gar') || k==='ungarrison'), L('éco')+'aucune option de garnison'); continue; }
    // --- garnison : avec unités sélectionnées ---
    { const p = AX.fresh(game_fac); const s = p.slots[0]; const b = AX.mk(s, type, {dmg:0.6});
      const u = AX.unit(2, s.x - 70, {sel:true}); const n0 = p.units.length;
      const keys = AX.open(s); A(keys && keys.includes('garrison') && AX.sameKeys(keys, expect(b, true)), L('sélection')+'« garnison (sélection) » proposé ('+keys+')');
      A(AX.click('garrison') && b.gar.length===1 && p.units.length===n0-1, L('sélection')+'tireur sélectionné entré en garnison'); AX.U(3);
      const k2 = AX.open(s); A(k2 && k2.includes('ungarrison') && k2.includes('repair') && k2.includes('upgrade'), L('garnison')+'menu avec garnison : sortir + réparer + ⬆ ('+k2+')');
      A(AX.click('ungarrison') && b.gar.length===0 && p.units.includes(u), L('garnison')+'sortie de garnison'); }
    // --- garnison : unité libre du pool, puis recrutement ---
    { const p = AX.fresh(game_fac); const s = p.slots[0]; const b = AX.mk(s, type);
      const u = AX.unit(2, s.x + 50); const keys = AX.open(s);
      A(keys && keys.includes('gar_ranged') && keys.includes('gar_siege'), L('pool')+'garnison tireur/siège proposées');
      A(AX.click('gar_ranged') && u.task && u.task.kind==='garrison', L('pool')+'le tireur libre part en garnison');
      const n1 = p.units.length, b0 = AX.S(); AX.open(s);
      A(AX.click('gar_siege') && p.units.length===n1+1 && p.units[p.units.length-1].task && p.units[p.units.length-1].task.kind==='garrison', L('recrue')+'sans siège libre : une recrue part en garnison');
      A(!AX.nomoney(b0, AX.S()), L('recrue')+'recrutement payé');
      for (let i=0;i<80;i++) AX.U(1); AX.R();
      A(b.gar.length>=1, L('garnison')+'les troupes arrivent en garnison (gar='+b.gar.length+')'); }
    // --- garnison PLEINE ---
    { const p = AX.fresh(game_fac); const s = p.slots[0]; const b = AX.mk(s, type, {dmg:0.5});
      while (b.gar.length<garMax(b)){ const u = AX.unit(2, s.x); p.units.pop(); b.gar.push(u); }
      const keys = AX.open(s); A(keys && AX.sameKeys(keys, expect(b, true)) && !keys.some(k=>k==='garrison'||k.startsWith('gar_')), L('garnison pleine')+'plus d\'ajout, sortie + réparer + ⬆ ('+keys+')');
      A(AX.click('upgrade') && b.lvl===2, L('garnison pleine')+'⬆ possible'); AX.U(2); }
  }
  return out;
}

/* =================== 2. SOCLE VIDE, CHANTIER =================== */
function CASES_SLOTS(){
  const out = []; const A = (c, m) => out.push([!!c, m]);
  for (const type of ['wall','turret','farmF','farmM','well']){
    const L = (s) => 'socle vide · '+type+' : '+s+' : ';
    { const p = AX.fresh(game_fac); const s = p.slots[0]; const keys = AX.open(s);
      A(keys && AX.sameKeys(keys, ['wall','turret','farmF','farmM','well']), L('menu')+'5 constructions proposées ('+keys+')');
      const b0 = AX.S(), cost = buildCost(p, type, s);
      A(AX.click(type) && s.b && s.b.type===type && s.owner===p, L('riche')+'construit');
      A(AX.eqCost(AX.paid(b0, AX.S()), cost, p.trans), L('riche')+'coût débité'); AX.U(2);
      const k2 = AX.open(s); A(k2 && k2.includes('demolish'), L('après')+'menu du bâtiment s\'ouvre'); }
    { const p = AX.fresh(game_fac); AX.poor(); const s = p.slots[0]; const keys = AX.open(s); const b0 = AX.S();
      A(keys && keys.length===5, L('fauché')+'menu ouvert'); AX.click(type); A(!s.b && AX.nomoney(b0, AX.S()), L('fauché')+'rien construit, rien débité'); }
    // socle neutre loin de la base : CHANTIER (nécessite qu'une troupe ait dépassé ce point), puis annulation
    { const p = AX.fresh(game_fac); const s = game.neut[0]; p.adv = s.x + 40; const b0 = AX.S(), cost = buildCost(p, type, s);
      const keys = AX.open(s); A(keys && keys.length===5, L('neutre')+'menu du socle neutre ouvert');
      A(AX.click(type) && s.b && s.b.type==='site' && s.b.buildType===type, L('neutre')+'chantier ouvert');
      A(AX.eqCost(AX.paid(b0, AX.S()), cost, p.trans), L('neutre')+'coût du chantier débité'); AX.U(2);
      const k2 = AX.open(s); A(k2 && k2.length===1 && k2[0]==='demolish', L('chantier')+'seule option : annuler ('+k2+')');
      const b1 = AX.S(); A(AX.click('demolish') && !s.b, L('chantier')+'annulé');
      A(AX.eqCost(AX.paid(AX.S(), b1), cost, p.trans), L('chantier')+'coût remboursé'); AX.U(2); }
  }
  return out;
}

/* =================== 3. MENU DE LA BASE =================== */
function CASES_BASE(){
  const out = []; const A = (c, m) => out.push([!!c, m]);
  const expectBase = (p) => { const k = []; let dmg = false;
    for (const s of sideBuildSlots(p)) if (s.b && s.b.type!=='site' && s.b.hp<s.b.maxhp) dmg = true;
    if (p.hp<p.maxhp) k.push('repairBase'); if (dmg || p.hp<p.maxhp) k.push('repairAll');
    if (p.gar.length<3) k.push('bgar_ranged','bgar_siege'); if (p.gar.length) k.push('bungar');
    if ((p.fortLvl||1)<3) k.push('fortify'); if (!p.autoRepair) k.push('autorep'); return k; };
  const states = {
    plein:     p => {},
    abîmée:    p => { p.hp = 600; },
    effondrement: p => { p.hp = 600; game.collapse = true; },
    transcendance: p => { p.era = 4; p.xp = TRANS_XP; p.trans = true; p.hp = 600; },
    'bâtiments abîmés': p => { AX.mk(p.slots[0], 'turret', {dmg:0.3}); AX.mk(p.slots[1], 'farmF', {dmg:0.5}); },
  };
  for (const [name, setup] of Object.entries(states)){
    const L = (s) => 'base '+name+' : '+s+' : ';
    const mk = () => { const p = AX.fresh(game_fac); setup(p); AX.R(); return p; };
    { const p = mk(); const keys = AX.open(null); A(keys && keys.length>0 && AX.sameKeys(keys, expectBase(p)), L('menu')+'options conformes ('+keys+')'); }
    if (name==='abîmée' || name==='effondrement' || name==='transcendance'){
      const p = mk(); const hp0 = p.hp, gain = game.collapse? 250 : 500, b0 = AX.S(); AX.open(null);
      A(AX.click('repairBase') && p.hp===Math.min(p.maxhp, hp0+gain), L('réparer')+'+'+gain+' PV (hp '+p.hp+')');
      A(AX.eqCost(AX.paid(b0, AX.S()), {f:120,m:120}, p.trans), L('réparer')+'coût 120/120 débité');
      A(p.repBaseT > game.t, L('réparer')+'recharge enclenchée'); AX.U(2);
      AX.open(null); AX.click('repairBase'); A(p.hp===Math.min(p.maxhp, hp0+gain), L('réparer')+'2e clic dans la recharge : refusé sans erreur');
    }
    if (name==='bâtiments abîmés' || name==='abîmée'){
      const p = mk(); const b0 = AX.S(), hp0 = p.hp; AX.open(null);
      A(AX.click('repairAll'), L('tout réparer')+'clic');
      A(p.hp>=Math.min(p.maxhp, hp0+(hp0<p.maxhp? 500 : 0)) && sideBuildSlots(p).every(s => !s.b || s.b.hp===s.b.maxhp), L('tout réparer')+'base réparée (+500) et bâtiments entièrement réparés');
      A(!AX.nomoney(b0, AX.S()), L('tout réparer')+'payé');
    }
    { const p = mk(); const keys = AX.open(null); if (keys && keys.includes('fortify')){
        const b0 = AX.S(), mh = p.maxhp; A(AX.click('fortify') && p.fortLvl===2 && p.maxhp===mh+800, L('fortifier')+'niveau 2 (+800 PV max)');
        A(AX.eqCost(AX.paid(b0, AX.S()), {f:250,m:250}, p.trans), L('fortifier 2')+'coût 250/250'); AX.U(2);
        const k2 = AX.open(null); A(k2 && k2.includes('fortify'), L('fortifier')+'encore proposé au niveau 2');
        const b1 = AX.S(); A(AX.click('fortify') && p.fortLvl===3 && p.maxhp===mh+1600, L('fortifier')+'niveau 3');
        A(AX.eqCost(AX.paid(b1, AX.S()), {f:500,m:500}, p.trans), L('fortifier 3')+'coût 500/500'); AX.U(2);
        const k3 = AX.open(null); A(k3 && !k3.includes('fortify') && k3.length>0, L('fortifier')+'plus proposé au niveau 3 ('+k3+')'); } }
    { const p = mk(); const keys = AX.open(null); if (keys && keys.includes('autorep')){
        const b0 = AX.S(), cost = autoRepCost(p); A(AX.click('autorep') && p.autoRepair===true, L('réparation auto')+'activée');
        A(AX.eqCost(AX.paid(b0, AX.S()), cost, p.trans), L('réparation auto')+'coût débité'); AX.U(2);
        const k2 = AX.open(null); A(k2 && !k2.includes('autorep'), L('réparation auto')+'n\'est plus proposée'); } }
    { const p = mk(); const u = AX.unit(2, p.x + 150); AX.open(null);
      A(AX.click('bgar_ranged') && u.task && u.task.kind==='gbase', L('garde')+'un tireur libre rejoint la garde');
      const n = p.units.length; AX.open(null); A(AX.click('bgar_siege') && p.units.length===n+1, L('garde')+'sans siège libre : recrue');
      for (let i=0;i<120;i++) AX.U(1);
      AX.open(null); AX.R(); }
    { const p = mk(); while (p.gar.length<3){ AX.unit(2, p.x); p.gar.push(p.units.pop()); }
      const keys = AX.open(null); A(keys && !keys.some(k=>k.startsWith('bgar')) && keys.includes('bungar'), L('garde pleine')+'plus d\'ajout, « sortir » proposé ('+keys+')');
      const n = p.units.length; A(AX.click('bungar') && p.gar.length===0 && p.units.length===n+3, L('garde pleine')+'sortie de la garde'); AX.U(2); }
    { const p = mk(); AX.poor(); const keys = AX.open(null); const b0 = AX.S(), hp0 = p.hp, fl = p.fortLvl;
      A(keys && keys.length>0, L('fauché')+'menu ouvert ('+keys+')');
      for (const k of ['repairBase','repairAll','fortify','autorep']){ AX.open(null); AX.click(k); }
      A(p.hp===hp0 && p.fortLvl===fl && !p.autoRepair && AX.nomoney(b0, AX.S()), L('fauché')+'aucune action sans ressources'); AX.U(2); }
  }
  return out;
}

/* =================== 4. BARRE D'ACTIONS =================== */
function CASES_BAR(){
  const out = []; const A = (c, m) => out.push([!!c, m]);
  const states = {
    normal: p => {}, 'couvre-feu': p => { game.t = 130; game.wClock = 35; game.weather = 'strike'; },
    'mise à jour': p => { game.t = 130; game.wClock = 95; game.weather = 'patch'; },
    effondrement: p => { game.collapse = true; },
  };
  for (const [name, setup] of Object.entries(states)){
    const L = (s) => 'barre '+name+' : '+s+' : ';
    const mk = () => { const p = AX.fresh(game_fac); setup(p); AX.R(); return p; };
    // achat de chaque unité
    for (let ri=0; ri<6; ri++){
      const p = mk(); const b = AX.btn('unit', b => b.i===ri); const n0 = p.units.length + p.queue.length, b0 = AX.S(), cost = unitCost(p, ri);
      A(b, L('unité '+ri)+'bouton présent'); AX.press(b);
      A(p.units.length + p.queue.length === n0+1, L('unité '+ri+' ('+ROLES[ri].key+')')+'achetée'); A(AX.eqCost(AX.paid(b0, AX.S()), cost, p.trans), L('unité '+ri)+'coût débité');
      AX.U(2); }
    // amélioration de rôle jusqu'à 3 puis plus rien
    for (let ri=0; ri<6; ri++){
      if (name!=='normal' && ri!==2) continue;         // les 6 rôles en état normal, un seul dans les autres états (durée)
      const p = mk(); const key = ROLES[ri].key; AX.unit(ri, p.x+220); AX.R();
      for (let n=1; n<=4; n++){
        const r = HUD.upgRects.find(r => r.i===ri); const b0 = AX.S(), cost = {f:90*n, m:180*n};
        if (!r){ if (n<=3) A(false, L('⬆ rôle '+key)+'pastille ⬆ absente au niveau '+(n-1)); break; }
        AX.tap(r.x + r.w/2, r.y + r.h/2); AX.R();
        if (n<=3){ A(p.upg[key]===n, L('⬆ rôle '+key)+'niveau '+n); A(AX.eqCost(AX.paid(b0, AX.S()), cost, p.trans), L('⬆ rôle '+key)+'coût '+n); }
        else A(p.upg[key]===3, L('⬆ rôle '+key)+'plafonné à 3');
        AX.U(1);
      }
      AX.poor(); const lv = p.upg[key]; const r2 = HUD.upgRects.find(r => r.i===ri); if (r2){ AX.tap(r2.x+r2.w/2, r2.y+r2.h/2); AX.R(); } A(p.upg[key]===lv, L('⬆ rôle '+key)+'rien sans ressources'); }
    // ÉVOLUER
    { const p = mk(); p.xp = EVOLVE_XP[1]; AX.R(); const era0 = p.era; AX.press(AX.btn('evolve')); A(p.era===era0+1, L('évoluer')+'ère '+p.era);
      p.xp = 0; AX.press(AX.btn('evolve')); A(p.era===era0+1, L('évoluer')+'sans XP : refusé'); AX.U(2);
      p.era = 4; p.xp = TRANS_XP; AX.U(2); A(p.trans, L('transcendance')+'atteinte'); AX.R(); AX.press(AX.btn('evolve')); AX.press(AX.btn('special')); AX.press(AX.btn('repairall')); AX.U(5); AX.R(); }
    // héros + posture
    { const p = mk(); AX.R(); const hb = AX.btn('hero'); AX.press(hb); A(p.units.some(u=>u.role==='hero'), L('héros')+'invoqué');
      AX.R(); const hs = AX.btn('hstance'); const seq = []; for (let i=0;i<3;i++){ AX.press(hs); seq.push(p.heroStance); }
      A(new Set(seq).size===3 && seq[2]==='normal', L('posture du héros')+'cycle prudent/offensif/normal ('+seq+')'); AX.U(3); AX.R();
      const p2 = mk(); p2.heroCd = 30; AX.R(); AX.press(AX.btn('hero')); A(!p2.units.some(u=>u.role==='hero'), L('héros')+'en recharge : refusé'); }
    { const p = mk(); AX.poor(); AX.R(); AX.press(AX.btn('hero')); A(!p.units.some(u=>u.role==='hero'), L('héros')+'sans ressources : refusé'); }
    // pouvoir spécial
    { const p = mk(); p.xp = specialXpCost(p) + 5; AX.unit(0, game.e.x - 400); AX.R(); const xp0 = p.xp; AX.press(AX.btn('special'));
      A(p.specialCd>0 && p.xp<xp0, L('pouvoir')+'lancé'); AX.press(AX.btn('special')); AX.U(3);
      const q = mk(); q.xp = 0; AX.press(AX.btn('special')); A(q.specialCd<=0, L('pouvoir')+'sans XP : refusé'); }
    // formation, ordres, capacité, tout réparer, lasso, caméra, zoom
    { const p = mk(); const f0 = p.formation; AX.press(AX.btn('formation')); A(p.formation===!f0, L('formation')+'basculée'); AX.press(AX.btn('formation')); A(p.formation===f0, L('formation')+'rebasculée'); }
    { const p = mk(); const u = AX.unit(0, p.x+300, {sel:true}); AX.R();
      for (const st of ['hold','retreat','charge']){ AX.press(AX.btn('stance', b=>b.st===st)); A(u.ord===st, L('ordre '+st)+'sur la sélection'); }
      game.sel.clear(); AX.R(); for (const st of ['hold','retreat','charge']){ AX.press(AX.btn('stance', b=>b.st===st)); A(p.stance===st, L('posture d\'armée '+st)); } AX.U(3); }
    { const p = mk(); const b0 = AX.S(); AX.press(AX.btn('cap')); A(p.capUp && p.cap===40 && AX.eqCost(AX.paid(b0, AX.S()), {m:350,w:100}, p.trans), L('capacité')+'+ unités'); AX.press(AX.btn('cap')); AX.U(1); }
    { const p = mk(); p.hp = 500; AX.mk(p.slots[0], 'wall', {dmg:0.2}); AX.R(); AX.press(AX.btn('repairall')); A(p.hp>500 && p.slots[0].b.hp===p.slots[0].b.maxhp, L('tout réparer')+'bouton'); }
    { const p = mk(); AX.press(AX.btn('lasso')); A(selMode===true, L('lasso')+'actif'); AX.press(AX.btn('lasso')); A(selMode===false, L('lasso')+'inactif');
      for (const g of ['base','front','follow']) AX.press(AX.btn('cam', b=>b.go===g)); AX.press(AX.btn('zoom', b=>b.d===1)); AX.press(AX.btn('zoom', b=>b.d===-1)); AX.U(2); AX.R(); }
    // sans ressources : tous les boutons du HUD, sans erreur ni débit
    { const p = mk(); AX.poor(); AX.R(); const b0 = AX.S(); for (const b of HUD.btns){ if (['speed','softpause','pause'].includes(b.type)) continue; AX.press(b); }
      A(AX.nomoney(b0, AX.S()), L('fauché')+'aucun achat'); AX.U(3); AX.R(); }
    // TOUS les boutons à la suite, partie en cours (riche)
    { const p = mk(); for (let i=0;i<4;i++) AX.unit(i%4, p.x+120+i*20, {sel:i%2===0}); p.xp = 3000; AX.R();
      for (const b of HUD.btns.slice()){ if (['speed','softpause','pause'].includes(b.type)) continue; AX.press(b); AX.U(1); } AX.R(); }
  }
  return out;
}

/* =================== 5. INVITÉ EN LIGNE =================== */
async function guestSection(vpName){
  const A = await open(vpName), B = await open(vpName);
  await A.page.exposeFunction('__wire', msg => B.page.evaluate(m => nrecv(m), msg).catch(()=>{}));
  await B.page.exposeFunction('__wire', msg => A.page.evaluate(m => nrecv(m), msg).catch(()=>{}));
  const mkNet = ([role, fac]) => { net = { role, code:'TEST1', myFac:fac, foeFac:null, speed:1, pw:'', name:'', pub:false, peer:true, cmdQ:[], ev:[], acc:0, tries:0,
    conn:{ open:true, send:m => window.__wire(JSON.parse(JSON.stringify(m))), close(){} },
    sendState:o=>nsend('st',o), sendCmd:o=>nsend('cm',o), sendHello:o=>nsend('hi',o), sendStart:o=>nsend('go',o), sendPause:o=>nsend('pz',o),
    sendSpeed:o=>nsend('sp',o), sendLok:o=>nsend('lok',o), sendLF:o=>nsend('lf',o) }; };
  await A.page.evaluate(mkNet, ['host', 'HUM']); await A.page.evaluate(() => { net.authed = false; });
  await B.page.evaluate(mkNet, ['guest', 'IA']);
  await B.page.evaluate(() => net.sendHello({ fac:net.myFac, v:NET_PROTO, pw:'' })); await A.page.waitForTimeout(250);
  await A.page.evaluate(() => { document.getElementById('menu').style.display='none'; startHostGame(); }); await B.page.waitForTimeout(250);
  await B.page.evaluate(() => { document.getElementById('menu').style.display='none'; camFollow = false; });
  // un tour : l'hôte avance et envoie l'instantané, l'invité l'applique et dessine
  const tick = async (n=1) => { for (let i=0;i<n;i++){
    await A.page.evaluate(() => { try { for (let k=0;k<2;k++){ game.aiThink = 1e9; update(0.05); } net.sendState({ s:serialize(), ev:net.ev }); net.ev = []; } catch(e){ __errs.push('hôte : '+e.message); } });
    await B.page.evaluate(() => { try { netGuestTick(0.1); } catch(e){ __errs.push('invité tick : '+e.message); } AX.R(); }); } };
  await tick(3);
  let bad = 0;
  const rep = async (label, fn) => { // fn = [hôteSetup, invitéAction, hôteVérif] (sources)
    const [setup, act, check] = fn;
    if (setup) await A.page.evaluate(setup); await tick(3);
    const actRes = await B.page.evaluate(act); await tick(3);
    const okk = await A.page.evaluate(`(${check})(${JSON.stringify(actRes===undefined? null : actRes)})`);
    const eA = await A.page.evaluate(() => AX.drain()), eB = await B.page.evaluate(() => AX.drain());
    nChecks++; if (!okk){ bad++; ko(`[invité ${vpName}] ${label} : effet absent côté hôte`); }
    for (const e of [...eA.map(x=>'hôte '+x), ...eB.map(x=>'invité '+x), ...A.errs.splice(0).map(x=>'hôte '+x), ...B.errs.splice(0).map(x=>'invité '+x)]){ nChecks++; bad++; ko(`[invité ${vpName}] ${label} : erreur JS : ${e}`); }
  };
  const G = 'e';  // côté hôte, la partie de l'invité est game.e
  // économie et état de départ de l'invité (fixés sur l'hôte, répercutés par instantané)
  await A.page.evaluate(() => { const e = game.e; e.f = e.m = e.w = 9000; e.cd = [0,0,0,0,0,0]; });
  const openSlot = `(i) => { const s = game.p.slots[i]; return AX.open(s); }`;
  // bâtiment abîmé de l'invité : menu → réparer / améliorer / garnison / sortir / démolir
  for (const type of ['turret','farmM']){
    await rep(`bâtiment abîmé ${type} : réparer`, [
      `(()=>{ const e = game.e, s = e.slots[0]; s.owner = e; s.b = mkB(e, ${JSON.stringify(type)}); s.b.hp = Math.floor(s.b.maxhp*0.4); e.f = e.m = e.w = 9000; })()`,
      `(()=>{ const k = AX.open(game.p.slots[0]); return { keys:k, ok:!!(k && AX.click('repair')) }; })()`,
      `(r) => game.e.slots[0].b.hp === game.e.slots[0].b.maxhp && r.ok && r.keys.includes('upgrade')` ]);
    await rep(`bâtiment abîmé ${type} : améliorer`, [
      `(()=>{ const e = game.e, s = e.slots[0]; s.b.hp = Math.floor(s.b.maxhp*0.4); e.f = e.m = e.w = 9000; })()`,
      `(()=>{ const k = AX.open(game.p.slots[0]); return { ok:!!(k && AX.click('upgrade')) }; })()`,
      `(r) => r.ok && game.e.slots[0].b.lvl === 2` ]);
  }
  await rep('tourelle : garnison (recrue)', [
    `(()=>{ const e = game.e, s = e.slots[0]; s.owner = e; s.b = mkB(e, 'turret'); e.f = e.m = e.w = 9000; })()`,
    `(()=>{ const k = AX.open(game.p.slots[0]); return { ok:!!(k && AX.click('gar_ranged')) }; })()`,
    `(r) => r.ok && game.e.units.some(u => u.task && u.task.kind==='garrison')` ]);
  await tick(60);
  await rep('tourelle : sortir la garnison', [
    `(()=>{ const e = game.e, b = e.slots[0].b; const u = (spawnUnit(e,2), e.units.pop()); b.gar.push(u); })()`,
    `(()=>{ const k = AX.open(game.p.slots[0]); return { ok:!!(k && k.includes('ungarrison') && AX.click('ungarrison')) }; })()`,
    `(r) => r.ok && game.e.slots[0].b.gar.length === 0` ]);
  await rep('tourelle : démolir', [ null,
    `(()=>{ const k = AX.open(game.p.slots[0]); return { ok:!!(k && AX.click('demolish')) }; })()`,
    `(r) => r.ok && !game.e.slots[0].b` ]);
  for (const type of ['wall','turret','farmF','farmM','well']){
    await rep(`socle vide : construire ${type}`, [
      `(()=>{ const e = game.e, s = e.slots[1]; s.b = null; s.owner = null; e.f = e.m = e.w = 9000; })()`,
      `(()=>{ const k = AX.open(game.p.slots[1]); return { ok:!!(k && AX.click(${JSON.stringify(type)})) }; })()`,
      `(r) => r.ok && game.e.slots[1].b && game.e.slots[1].b.type === ${JSON.stringify(type)}` ]);
  }
  // chantier chez l'invité puis annulation
  await rep('chantier : ouvrir sur un socle neutre', [
    `(()=>{ const e = game.e, s = game.neut[0]; s.b = null; s.owner = null; spawnUnit(e, 0); const u = e.units[e.units.length-1]; u.x = s.x - 300; u.task = null; e.f = e.m = e.w = 9000; })()`,
    `(()=>{ const s = game.neut[0]; const k = AX.open(s); return { ok:!!(k && AX.click('wall')) }; })()`,
    `(r) => r.ok && game.neut[0].b && game.neut[0].b.type==='site'` ]);
  await rep('chantier : annuler', [ null,
    `(()=>{ const k = AX.open(game.neut[0]); return { keys:k, ok:!!(k && AX.click('demolish')) }; })()`,
    `(r) => r.ok && r.keys.length===1 && !game.neut[0].b` ]);
  // base de l'invité
  await rep('base : réparer', [ `(()=>{ const e = game.e; e.hp = 500; e.repBaseT = 0; e.f = e.m = e.w = 9000; })()`,
    `(()=>{ const k = AX.open(null); return { keys:k, ok:!!(k && AX.click('repairBase')) }; })()`, `(r) => r.ok && game.e.hp > 500` ]);
  await rep('base : tout réparer', [ `(()=>{ const e = game.e; e.hp = 500; e.repBaseT = 0; e.slots[2].owner = e; e.slots[2].b = mkB(e,'wall'); e.slots[2].b.hp = 10; })()`,
    `(()=>{ const k = AX.open(null); return { ok:!!(k && AX.click('repairAll')) }; })()`, `(r) => r.ok && game.e.slots[2].b.hp === game.e.slots[2].b.maxhp` ]);
  await rep('base : fortifier', [ `(()=>{ const e = game.e; e.fortLvl = 1; e.f = e.m = e.w = 9000; })()`,
    `(()=>{ const k = AX.open(null); return { ok:!!(k && AX.click('fortify')) }; })()`, `(r) => r.ok && game.e.fortLvl === 2` ]);
  await rep('base : réparation auto', [ `(()=>{ const e = game.e; e.autoRepair = false; e.f = e.m = e.w = 9000; })()`,
    `(()=>{ const k = AX.open(null); return { ok:!!(k && AX.click('autorep')) }; })()`, `(r) => r.ok && game.e.autoRepair === true` ]);
  await rep('base : garde (recrue)', [ `(()=>{ const e = game.e; e.gar = []; e.f = e.m = e.w = 9000; })()`,
    `(()=>{ const k = AX.open(null); return { ok:!!(k && AX.click('bgar_ranged')) }; })()`, `(r) => r.ok && game.e.units.some(u => u.task && u.task.kind==='gbase')` ]);
  await tick(80);
  await rep('base : sortir la garde', [ `(()=>{ const e = game.e; for (const u of e.units.filter(u=>u.task&&u.task.kind==='gbase')){ u.task=null; } while (e.gar.length<2){ spawnUnit(e,2); e.gar.push(e.units.pop()); } })()`,
    `(()=>{ const k = AX.open(null); return { ok:!!(k && AX.click('bungar')) }; })()`, `(r) => r.ok && game.e.gar.length === 0` ]);
  // barre d'actions de l'invité
  for (let ri=0; ri<6; ri++)
    await rep(`barre : acheter l'unité ${ri}`, [ `(()=>{ const e = game.e; e.f = e.m = e.w = 9000; e.cd = [0,0,0,0,0,0]; window.__n0 = e.units.length + e.queue.length; })()`,
      `(()=>{ AX.R(); return { ok:AX.press(AX.btn('unit', b=>b.i===${ri})) }; })()`, `(r) => r.ok && (game.e.units.length + game.e.queue.length) > window.__n0` ]);
  await rep('barre : ⬆ de rôle', [ `(()=>{ const e = game.e; e.f = e.m = e.w = 9000; e.upg.tank = 0; })()`,
    `(()=>{ AX.R(); const r = HUD.upgRects[0]; if (r) AX.tap(r.x+r.w/2, r.y+r.h/2); return { ok:!!r, i:r&&r.i }; })()`, `(r) => r.ok && game.e.upg[ROLES[r.i].key] === 1` ]);
  await rep('barre : évoluer', [ `(()=>{ const e = game.e; e.xp = EVOLVE_XP[1]; window.__era = e.era; })()`,
    `(()=>{ AX.R(); return { ok:AX.press(AX.btn('evolve')) }; })()`, `(r) => r.ok && game.e.era === window.__era+1` ]);
  await rep('barre : héros', [ `(()=>{ const e = game.e; e.f = e.m = e.w = 9000; e.heroCd = 0; e.units = e.units.filter(u=>u.role!=='hero'); })()`,
    `(()=>{ AX.R(); return { ok:AX.press(AX.btn('hero')) }; })()`, `(r) => r.ok && game.e.units.some(u=>u.role==='hero')` ]);
  await rep('barre : posture du héros', [ null,
    `(()=>{ AX.R(); return { ok:AX.press(AX.btn('hstance')) }; })()`, `(r) => r.ok` ]);
  await rep('barre : pouvoir', [ `(()=>{ const e = game.e; e.xp = specialXpCost(e)+10; e.specialCd = 0; })()`,
    `(()=>{ AX.R(); return { ok:AX.press(AX.btn('special')) }; })()`, `(r) => r.ok && game.e.specialCd > 0` ]);
  await rep('barre : formation', [ `(()=>{ game.e.formation = false; })()`,
    `(()=>{ AX.R(); return { ok:AX.press(AX.btn('formation')) }; })()`, `(r) => r.ok && game.e.formation === true` ]);
  await rep('barre : ordre « tenir »', [ null,
    `(()=>{ game.sel.clear(); buildMenu = null; AX.R(); return { ok:AX.press(AX.btn('stance', b=>b.st==='hold')) }; })()`, `(r) => r.ok && game.e.stance === 'hold'` ]);
  await rep('barre : capacité', [ `(()=>{ const e = game.e; e.f = e.m = e.w = 9000; e.capUp = false; })()`,
    `(()=>{ AX.R(); return { ok:AX.press(AX.btn('cap')) }; })()`, `(r) => r.ok && game.e.capUp === true` ]);
  await rep('barre : tout réparer', [ `(()=>{ const e = game.e; e.hp = 400; e.repBaseT = 0; e.f = e.m = e.w = 9000; })()`,
    `(()=>{ AX.R(); return { ok:AX.press(AX.btn('repairall')) }; })()`, `(r) => r.ok && game.e.hp > 400` ]);
  // couvre-feu / mise à jour chez l'invité : tout le HUD reste utilisable
  for (const [lab, we] of [['couvre-feu','strike'], ['mise à jour','patch']])
    await rep('barre en '+lab+' : tous les boutons', [ `(()=>{ game.t = Math.max(game.t,130); game.weather = ${JSON.stringify(we)}; game.wClock = ${we==='strike'?35:95}; game.e.f = game.e.m = game.e.w = 9000; })()`,
      `(()=>{ AX.R(); for (const b of HUD.btns){ if (['speed','softpause','pause'].includes(b.type)) continue; AX.press(b); } return { ok:true }; })()`, `(r) => r.ok` ]);
  await A.page.close(); await B.page.close(); return bad;
}

/* =================== 6. CAMPAGNE =================== */
async function campaignSection(vpName, missions){
  let bad = 0;
  for (const mi of missions){
    const page = await browser.newPage({ viewport: VPS[vpName] }); const errs = [];
    page.on('pageerror', e => errs.push('pageerror '+e.message)); page.on('console', m => { if (m.type()==='error') errs.push('console.error '+m.text()); });
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0; localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
      localStorage.setItem('agi_settings', JSON.stringify({ quality:'low', lang:'fr', music:false, sfx:false })); localStorage.removeItem('agi_camp'); });
    await page.goto(GAME); await page.waitForTimeout(300);
    await page.evaluate(() => { let s = 20261121; Math.random = () => { s = (s*16807)%2147483647; return (s-1)/2147483646; }; resize(); });
    await page.evaluate(LIB);
    await page.evaluate((mi) => { window.playCine = () => { let n = 0; while (CINE.on && n++ < 80){ CINE.t = cineDur(cineShot())*0.6; AX.R(); cineNext(); } return n; };
      // débloque la mission voulue : la sauvegarde de campagne dit « déjà jouées » les précédentes
      try { CAMP_SAVE.done = Math.max(CAMP_SAVE.done||0, mi); } catch(e){}
      document.getElementById('menu').style.display = 'flex'; campLaunch(mi); document.querySelector('#campBrief .cbGo').click(); playCine();
      document.getElementById('menu').style.display = 'none'; for (let k=0;k<20;k++){ game.aiThink = 1e9; update(0.05); if (CINE.on) playCine(); } AX.R(); }, mi);
    const res = await page.evaluate(() => { const out = []; const A = (c, m) => out.push([!!c, m]);
      A(game && game.camp, 'la mission démarre');
      if (!game || !game.camp) return out;
      const p = game.p; game.aiThink = 1e9; AX.rich(); camFollow = false;
      const L = s => 'campagne m'+(game.camp.i+1)+' : '+s+' : ';
      for (const type of ['turret','farmF','wall','well','farmM']){
        const s = p.slots[0]; s.owner = p; s.b = mkB(p, type); s.b.hp = Math.floor(s.b.maxhp*0.4); AX.R();
        const keys = AX.open(s);
        A(keys && keys.includes('repair') && keys.includes('upgrade'), L(type+' abîmé')+'réparer ET améliorer proposés ('+keys+')');
        const lv = s.b.lvl||1; A(AX.click('upgrade') && (s.b.lvl||1)===lv+1, L(type+' abîmé')+'⬆ appliqué');
        AX.open(s); A(AX.click('repair') && s.b.hp===s.b.maxhp, L(type+' abîmé')+'réparation appliquée');
        AX.open(s); AX.click('demolish'); AX.U(1);
      }
      p.hp = 700; const bk = AX.open(null); A(bk && bk.includes('repairBase') && bk.includes('fortify'), L('base abîmée')+'menu de base ('+bk+')');
      A(AX.click('repairBase') && p.hp>700, L('base abîmée')+'réparée');
      AX.R(); for (const b of HUD.btns){ if (['speed','softpause','pause'].includes(b.type)) continue; AX.press(b); AX.U(1); } AX.R();
      return out; }) ;
    const jsErr = await page.evaluate(() => AX.drain());
    for (const [okk, m] of res){ nChecks++; if (!okk){ bad++; ko(`[camp ${vpName}] ${m}`); } }
    for (const e of [...jsErr, ...errs]){ nChecks++; bad++; ko(`[camp ${vpName} m${mi+1}] erreur JS : ${e}`); }
    await page.close();
  }
  return bad;
}

/* =================== PILOTAGE (4 tâches en parallèle) =================== */
const tasks = [];
for (const vpName of ['desk','phone']) for (const fac of ['HUM','IA']) tasks.push({ name:`actions ${fac} ${vpName==='desk'? '1280×720' : '844×390'} : bâtiments, socles/chantiers, base, barre d'actions`,
  run: async () => { const { page, errs } = await open(vpName); await page.evaluate(f => { window.game_fac = f; }, fac); let bad = 0;
    for (const [lab, fn] of [['bâtiments', CASES_BUILDINGS], ['socles', CASES_SLOTS], ['base', CASES_BASE], ['barre', CASES_BAR]]){
      const t1 = Date.now(); bad += await runCases(`${fac} ${vpName} ${lab}`, page, errs, `(${fn.toString()})()`); if (process.env.TIMING) console.log('    · '+fac+' '+vpName+' '+lab+' '+(Date.now()-t1)+' ms'); }
    await page.close(); return bad; } });
for (const vpName of ['desk','phone']) tasks.push({ name:`invité en ligne ${vpName==='desk'? '1280×720' : '844×390'} : commandes jouées côté hôte`, run: () => guestSection(vpName) });
tasks.push({ name:'campagne 1280×720 : menu d\'un bâtiment abîmé, missions 1 à 5', run: () => campaignSection('desk', [0,1,2,3,4]) });
tasks.push({ name:'campagne 844×390 : mission 1', run: () => campaignSection('phone', [0]) });
const queue = tasks.slice(), results = [];
await Promise.all([0,1,2,3].map(async () => { for (let tk; (tk = queue.shift());){ const tt = Date.now(); let bad = 0;
  try { bad = await tk.run(); } catch(e){ bad = 1; ko(`${tk.name} : exception du test : ${e.message}`); }
  results.push([tk, bad, Date.now()-tt]); } }));
for (const tk of tasks){ const r = results.find(r => r[0]===tk); console.log(`  ${r[1]? '✗' : '✓'} ${tk.name} (${(r[2]/1000).toFixed(1)} s)`); }

await browser.close();
console.log(`\n${nChecks} vérifications, ${fails} échec(s), ${((Date.now()-t0)/1000).toFixed(0)} s`);
process.exit(fails? 1 : 0);
