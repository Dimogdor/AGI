/* tools/test-net-parity.mjs — mode en ligne (hôte / invité miroir) : la zone bonus et les météores arrivent chez l'invité
   (x miroir), les annonces et flotteurs sont traduits dans la langue de L'INVITÉ (clé + variables, pas le texte de l'hôte),
   « toi / l'adversaire » retournés. Deux pages reliées, hôte en français, invité en anglais.
   Prérequis : npm run dev.   Lancer : node tools/test-net-parity.mjs (code 1 au moindre échec). */
import { chromium } from 'playwright-core';
const GAME = new URL('../la-derniere-bataille.html', import.meta.url).href;
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let fails = 0;
const check = (c, m) => { console.log((c? '  ✓ ' : '  ✗ ')+m); if (!c) fails++; };
async function open(lang){
  const page = await browser.newPage({ viewport:{ width:1280, height:720 } }); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript((lang) => { window.requestAnimationFrame = () => 0;
    try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
      localStorage.setItem('agi_settings', JSON.stringify({ quality:'low', lang, music:false, sfx:false })); } catch(e){} }, lang);
  await page.goto(GAME); await page.waitForTimeout(350);
  return { page, errs };
}
const A = await open('fr'), B = await open('en');
await A.page.exposeFunction('__wire', msg => B.page.evaluate(m => nrecv(m), msg).catch(()=>{}));
await B.page.exposeFunction('__wire', msg => A.page.evaluate(m => nrecv(m), msg).catch(()=>{}));
const mkNet = ([role, fac]) => { net = { role, code:'TEST1', myFac:fac, foeFac:null, speed:1, pw:'', name:'', pub:false, peer:true, cmdQ:[], ev:[], acc:0, tries:0,
    conn:{ open:true, send:m => window.__wire(JSON.parse(JSON.stringify(m))), close(){} },
    sendState:o=>nsend('st',o), sendCmd:o=>nsend('cm',o), sendHello:o=>nsend('hi',o), sendStart:o=>nsend('go',o), sendPause:o=>nsend('pz',o),
    sendSpeed:o=>nsend('sp',o), sendLok:o=>nsend('lok',o), sendLF:o=>nsend('lf',o) }; };
await A.page.evaluate(mkNet, ['host', 'HUM']); await A.page.evaluate(() => { net.authed = false; });
await B.page.evaluate(mkNet, ['guest', 'IA']);
await B.page.evaluate(() => net.sendHello({ fac:net.myFac, v:NET_PROTO, pw:'' })); await A.page.waitForTimeout(250);
await A.page.evaluate(() => startHostGame()); await B.page.waitForTimeout(250);
const tick = async (n, hostFn) => { for (let i=0;i<n;i++){
  await A.page.evaluate((fn) => { if (fn) eval(fn); for (let k=0;k<2;k++){ game.aiThink = 1e9; update(0.05); } net.sendState({ s:serialize(), ev:net.ev }); net.ev = []; }, hostFn || null);
  await B.page.evaluate(() => { netGuestTick(0.1); ctx.setTransform(SCALE,0,0,SCALE,0,0); render(1/60); }); } };
await tick(3);

console.log('\nZONE BONUS');
await tick(1, 'game.bonusClock = 181');
await tick(2);
const bz = await Promise.all([A.page.evaluate(() => game.bonusZone && game.bonusZone.x), B.page.evaluate(() => game.bonusZone && game.bonusZone.x)]);
const mir = bz[1] ? await B.page.evaluate((x) => Math.abs((WORLD - game.bonusZone.x) - x), bz[0]) : 1e9;
check(bz[0] && bz[1] && mir < 2, `la zone bonus existe chez l'invité, en miroir (hôte ${bz[0]&&bz[0].toFixed(0)}, invité ${bz[1]&&bz[1].toFixed(0)})`);
// la progression se reflète (propriétaire inversé)
await A.page.evaluate(() => { const z = game.bonusZone; z.prog = 0.8; z.owner = 'p'; });
await tick(2);
const own = await B.page.evaluate(() => game.bonusZone && game.bonusZone.owner);
check(own==='e', `propriétaire inversé chez l'invité (hôte 'p' → invité '${own}')`);
await A.page.evaluate(() => { game.bonusZone = null; });
await tick(2);
check(await B.page.evaluate(() => !game.bonusZone), 'la zone disparue chez l\'hôte disparaît chez l\'invité');

console.log('\nMÉTÉORES');
await A.page.evaluate(() => { startCata('meteor'); });
await tick(2, 'METEORS.push({ tx:2000, t:0, dur:4, dx:200 })');
const met = await Promise.all([A.page.evaluate(() => METEORS.length), B.page.evaluate(() => ({ n:METEORS.length, ok:METEORS.every(m=>m.tx>=0 && m.tx<=WORLD && m.t<=m.dur) }))]);
check(met[0]>0 && met[1].n>0 && met[1].ok, `météores visibles chez l'invité (hôte ${met[0]}, invité ${met[1].n})`);
await A.page.evaluate(() => { game.cata = null; game.cataT = 0; METEORS.length = 0; });
await tick(2);

console.log('\nANNONCES TRADUITES CHEZ L\'INVITÉ');
await A.page.evaluate(() => { net.ev = []; });
const h = await A.page.evaluate(() => { announce(tr('ev_bonuszone'), '#ffd34a'); announce(fmt('a_guard_out', {n:3}), '#e8d8a0');
  announce(fmt('a_evolve_foe', {era:lEra('IA',2)}), '#fff', {q:'a_evolve_foe', v:{era:{L:'era', f:'IA', i:2}}});
  addFloater(300, 200, tr('f_drone'), '#5ad0ff'); return { ev:net.ev.filter(e=>e.k==='a'||e.k==='f').map(e=>({k:e.k, q:e.q||null, hasT:typeof e.t})), fr:tr('ev_bonuszone') }; });
check(h.ev.length>=4 && h.ev[0].q==='ev_bonuszone' && h.ev[1].q==='a_guard_out' && h.ev[3].q==='f_drone', 'l\'hôte envoie des clés de traduction ('+h.ev.map(e=>e.q).join(', ')+')');
const g = await B.page.evaluate(() => { const out = {};
  const ev = [{k:'a', t:'TEXTE-HOTE', c:'#fff', q:'ev_bonuszone'}, {k:'a', t:'x', c:'#fff', q:'a_guard_out', v:{n:3}},
    {k:'a', t:'x', c:'#fff', q:'a_evolve_foe', v:{era:{L:'era', f:'IA', i:2}}}, {k:'f', x:100, y:200, t:'TEXTE-HOTE', c:'#fff', s:13, q:'f_drone'},
    {k:'a', t:'repli hôte', c:'#fff', q:'__proto__'}, {k:'a', t:'cata', c:'#fff', r:{L:'cata', k:'meteor'}, pr:'☄ ', sx:' ☄'}];
  const msgs = []; for (const e of ev){ applyEvents([e]); msgs.push(game.msg.txt); }
  out.msgs = msgs; out.floater = floaters[floaters.length-1] && floaters[floaters.length-1].txt;
  out.en = [tr('ev_bonuszone'), fmt('a_guard_out', {n:3}), fmt('a_evolve_you', {era:lEra('IA',2)}), tr('f_drone'), cataName('meteor')]; return out; });
check(g.msgs[0]===g.en[0] && g.msgs[0]!=='TEXTE-HOTE', 'annonce reçue dans la langue de l\'invité ('+g.msgs[0]+')');
check(g.msgs[1]===g.en[1], 'annonce à variables : '+g.msgs[1]);
check(g.msgs[2]===g.en[2], '« l\'adversaire évolue » devient « tu évolues » chez l\'invité, nom d\'ère de l\'invité : '+g.msgs[2]);
check(g.floater===g.en[3], 'flotteur traduit : '+g.floater);
check(g.msgs[4]==='repli hôte', 'clé piégée (__proto__) : repli sur le texte brut');
check(g.msgs[5]==='☄ '+g.en[4]+' ☄', 'nom de cataclysme : '+g.msgs[5]);

console.log('\nASYMÉTRIE DES FACTIONS (v1.17 : ancienneté des bâtiments, réseau coupé, ruines à −50 %)');
// hôte = Humanité (p), invité = G·P·T (e canonique = p local chez l'invité)
await A.page.evaluate(() => { const e = game.e; e.f = e.m = e.w = 9000;
  e.slots.forEach((s,i) => { if (s.b) demolish(s); tryBuild(e, s, ['farmF','farmM','well'][i]); if (s.b){ s.b.age = 420; } }); e.netT = 0; });
await tick(2);
const rate = async (P, side) => P.page.evaluate((side) => { const r = calcRates(side==='p'? game.p : game.e); return [r.f, r.m, r.w]; }, side);
const near = (a, b) => a.every((v,i) => Math.abs(v-b[i]) <= 0.03*Math.max(1, Math.abs(v)));
let hr = await rate(A, 'e'), gr = await rate(B, 'p');
check(near(hr, gr) && hr[0] > 6, `revenus de G·P·T identiques chez l'hôte et chez l'invité, longévité et effet réseau compris (${hr.map(v=>v.toFixed(1))} / ${gr.map(v=>v.toFixed(1))})`);
await A.page.evaluate(() => { game.e.netT = game.t + 9; }); await tick(1);
const cutH = await rate(A, 'e'), cutG = await rate(B, 'p');
check(near(cutH, cutG) && cutH[0] < hr[0], `réseau coupé : la baisse se voit aussi chez l'invité (${hr[0].toFixed(1)} → ${cutH[0].toFixed(1)} / invité ${cutG[0].toFixed(1)})`);
// ruine humaine : l'hôte détruit un bâtiment, l'invité voit le même prix réduit
await A.page.evaluate(() => { const p = game.p, s = p.slots[0]; if (s.b) demolish(s); p.f = p.m = p.w = 9000; tryBuild(p, s, 'farmF'); demolish(s, true); });
await tick(2);
const cp = await A.page.evaluate(() => buildCost(game.p, 'farmF', game.p.slots[0]).m), cg = await B.page.evaluate(() => buildCost(game.e, 'farmF', game.e.slots[0]).m);
check(cp === 35 && cg === 35, `ruine : reconstruction à moitié prix chez l'hôte (${cp}) et chez l'invité (${cg})`);
check(await B.page.evaluate(() => game.e.slots[0].b===null || game.e.slots[0].b===undefined), 'le socle détruit est vide chez l\'invité');
const garH = await A.page.evaluate(() => { const p = game.p, s = p.slots[1]; if (s.b) demolish(s); p.f = p.m = 9000; tryBuild(p, s, 'wall'); return garMax(s.b); });
await tick(2);
check(garH === 3 && await B.page.evaluate(() => garMax(game.e.slots[1].b)) === 3, 'muraille humaine : 3 places de garnison des deux côtés');
// lots 2-3 : moral de l'Humanité (jauge ✊) et martyr du Che voyagent vers l'invité ; l'indicateur de refroidissement se lit sur 💧
await A.page.evaluate(() => { game.p.morale = 90; game.p.martyrT = game.t + 15; }); await tick(2);
const moG = await B.page.evaluate(() => [game.e.morale, (game.e.martyrT||0)-game.t]);
check(Math.abs(moG[0]-90) <= 6 && moG[1] > 8 && moG[1] <= 16, `moral et martyr de l'hôte lus par l'invité (${moG.map(v=>v.toFixed(1))})`);
// v1.18 : chaleur des machines (champ 16 des unités) et annonce du héros G·P·T traduite chez l'invité
await A.page.evaluate(() => { spawnUnit(game.e, 0, false, 900); const u = game.e.units[game.e.units.length-1]; u.heat = 0.6; window.__hid = u.id; });
await tick(1);
const heatG = await B.page.evaluate((id) => { const u = game.p.units.find(v => v.id===id); return u? u.heat : -1; }, await A.page.evaluate(() => window.__hid));
check(heatG > 0.45 && heatG < 0.65, `chaleur d'une machine de G·P·T lue par l'invité (${heatG.toFixed(2)})`);
await A.page.evaluate(() => { const e = game.e; e.f = e.m = e.w = 99999; e.heroCd = 0; e.units = e.units.filter(u => u.role!=='hero'); e.heroAlive = false; tryHero(e); });
await tick(2);
const hmsg = await B.page.evaluate(() => ({ txt: game.msg && game.msg.txt, ia: tr('a_hero_ia') }));
check(hmsg.txt && hmsg.txt.includes(hmsg.ia) && hmsg.txt.startsWith('◆ '), `annonce du héros de G·P·T dans la langue de l'invité (« ${hmsg.txt} »)`);
check(await A.page.evaluate(() => NET_PROTO) >= 6, 'NET_PROTO incrémenté');
check(!A.errs.length && !B.errs.length, 'aucune erreur JS'+((A.errs[0]||B.errs[0])? ' — '+(A.errs[0]||B.errs[0]) : ''));
await browser.close();
if (fails){ console.log('\n'+fails+' échec(s)'); process.exit(1); }
