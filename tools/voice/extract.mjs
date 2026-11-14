/* tools/voice/extract.mjs — inventaire de TOUTES les répliques dites de la campagne, dans les 9 langues.
   usage : npm run dev && node tools/voice/extract.mjs [--out tools/voice/lines.json] [--check]
   1) DYNAMIQUE (Playwright, le vrai jeu) : pour chaque langue, chaque mission, chaque niveau de récit
      et chaque doctrine, on lance la mission puis on appelle ses fabriques de scripts : intro, outro
      (victoire, défaite, et chaque branche de choix via then()), radio[] (txt et cine), toute autre
      méthode de la mission qui renvoie des plans (endFall…), l'action de mission (cinématique déclenchée),
      les fonctions globales « …Cine » (m5ActCine, à chaque acte) ; cinePlay/campRadio sont espionnés.
   2) STATIQUE (acorn, src/16*.js) : tout littéral {who:'x', txt:{fr…}}, tout campRadio('x', cT({…})) et
      les appels aux méthodes qui enveloppent campRadio (say(c, clé, {…})) — filet de sécurité pour les
      répliques déclenchées en cours de partie, hors d'atteinte des fabriques.
   3) GABARITS : répliques composées à l'exécution (renforts « la cellule {name} est arrivée »).
   Sortie : { langs, speakers, lines:[{lang, who, text, hash}] } ; hash = voiceKey(lang, who, text)
   (tools/voice/hash.mjs, identique au jeu). --check : n'écrit rien, sort en 1 si le fichier diffère. */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { voiceKey } from './hash.mjs';

const ROOT = new URL('../../', import.meta.url);
const GAME = new URL('la-derniere-bataille.html', ROOT).href;
const args = process.argv.slice(2);
const OUT = fileURLToPath(new URL(args.includes('--out')? args[args.indexOf('--out')+1] : 'tools/voice/lines.json', ROOT));
const LANGS = ['fr','en','es','de','it','pt','ru','zh','ar'];
const t0 = Date.now();

// ---------- 1) dynamique ----------
async function dynamic(){
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0;
    try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
      localStorage.setItem('agi_settings', JSON.stringify({ quality:'low', lang:'fr', music:false, sfx:false, voice:false })); } catch(e){} });
  await page.goto(GAME); await page.waitForTimeout(300);
  const res = await page.evaluate((LANGS) => {
    const out = [], seen = new Set(), notes = [];
    let src = '';
    const add = (who, txt) => { if (!txt) return; const L = SETTINGS.lang;
      if (typeof txt==='object' && !txt[L]) return;                     // pas de texte dans cette langue : pas de voix
      const text = typeof txt==='string'? txt : cT(txt); if (!text) return;
      const k = L+'|'+(who||'nar')+'|'+text; if (seen.has(k)) return; seen.add(k); out.push({ lang:L, who:who||'nar', text, src }); };
    const g0 = () => game, c0 = () => game && game.camp;
    const shots = (sc, depth) => { if (!Array.isArray(sc) || (depth|0) > 4) return;
      for (const s of sc){ if (!s || typeof s!=='object') continue; if (s.txt) add(s.who, s.txt);
        if (Array.isArray(s.choice)) s.choice.forEach((o,j) => { if (o && typeof o.then==='function'){ const keep = src; src += '>choix'+j;
          try { shots(o.then(g0(), c0()), (depth|0)+1); } catch(e){ notes.push(src+': '+e.message); } src = keep; } }); } };
    const realPlay = cinePlay, realRadio = campRadio;
    cinePlay = (sc, done) => { shots(sc); };                             // espions : on note, on ne joue pas
    campRadio = (who, txt) => { add(who, txt); };
    const SKIP = new Set(['setup','tick','hud','draw','drawZone','intro','outro','light','say','bot','constructor']);
    const globals = Object.keys(window).filter(n => /Cine$/.test(n) && typeof window[n]==='function' && !/^cine/.test(n));
    for (const L of LANGS){ SETTINGS.lang = L;
      for (let i=0;i<CAMPAIGN.length;i++) for (let lvl=0; lvl<3; lvl++) for (const doc of [0,1]){
        const fresh = () => { CAMP_SAVE.done = 5; CAMP_SAVE.lvl = lvl; if (doc) CAMP_SAVE.doc[i] = 1; else delete CAMP_SAVE.doc[i];
          let s = 4242+i*7+lvl; Math.random = () => { s = (s*16807)%2147483647; return (s-1)/2147483646; };
          startMission(i); if (CINE.on) cineEnd(true); return [game, game.camp]; };
        const run = (tag, f) => { src = 'M'+(i+1)+'.'+tag; try { const [g, c] = fresh(); f(g, c, c.m); } catch(e){ notes.push(src+': '+e.message); } };
        run('intro', (g,c,m) => m.intro && shots(m.intro(g, c)));
        run('outro+', (g,c,m) => { g.over = true; g.win = true; m.outro && shots(m.outro(g, c, true)); });
        run('outro-', (g,c,m) => { g.over = true; g.win = false; m.outro && shots(m.outro(g, c, false)); });
        run('radio', (g,c,m) => (m.radio||[]).forEach((r,j) => { src = 'M'+(i+1)+'.radio'+j; if (r.txt) add(r.who, r.txt);
          if (typeof r.cine==='function'){ try { shots(r.cine(g, c)); } catch(e){ notes.push(src+': '+e.message); } } }));
        run('action', (g,c,m) => { if (m.action && typeof m.action.use==='function') for (let n=0;n<3;n++){ try { m.action.use(g, c); } catch(e){} } });
        const names = new Set(); for (let o = CAMPAIGN[i]; o && o!==Object.prototype; o = Object.getPrototypeOf(o)) Object.getOwnPropertyNames(o).forEach(n => names.add(n));
        for (const n of names){ if (SKIP.has(n)) continue;
          run('m.'+n, (g,c,m) => { if (typeof m[n]!=='function') return; const r = m[n](g, c); if (Array.isArray(r)) shots(r); }); }
        for (const n of globals) for (const act of [1,2,3,4])
          run(n+'@'+act, (g,c) => { c.act = act; const r = window[n](g, c); if (Array.isArray(r)) shots(r); });
      }
    }
    cinePlay = realPlay; campRadio = realRadio;
    // gabarits : renforts (CAMP_UI.reinf × CAMP_CELLS), dits par Sol à la radio
    const tpl = [];
    try { for (const L of LANGS){ SETTINGS.lang = L; for (const n of CAMP_CELLS) tpl.push({ lang:L, who:'sol', text: cT(CAMP_UI.reinf).replace('{name}', n), src:'renforts' }); } }
    catch(e){ notes.push('gabarit renforts : '+e.message); }
    const who = {}; for (const k in CINE_WHO){ const n = CINE_WHO[k].name; who[k] = n==null? null : typeof n==='string'? n : n.fr; }
    return { out, tpl, notes, who, hash: out.slice(0, 50).map(l => voiceKey(l.lang, l.who, l.text)) };
  }, LANGS);
  await browser.close();
  return { ...res, errs };
}

// ---------- 2) statique ----------
async function staticScan(){
  let acorn; try { acorn = await import('acorn'); } catch(e){ console.warn('  ⚠ acorn introuvable : inventaire statique sauté'); return []; }
  const dir = new URL('src/', ROOT), files = (await readdir(dir)).filter(f => /^16.*\.js$/.test(f)).sort(), found = [];
  for (const f of files){
    const code = await readFile(new URL(f, dir), 'utf8');
    let ast; try { ast = acorn.parse(code, { ecmaVersion:'latest', sourceType:'script' }); } catch(e){ console.warn('  ⚠ '+f+' : '+e.message); continue; }
    const lit = n => { try { return new Function('return ('+code.slice(n.start, n.end)+')')(); } catch(e){ return null; } };
    const isTxt = n => n && n.type==='ObjectExpression' && n.properties.some(p => p.key && (p.key.name||p.key.value)==='fr');
    const key = p => p && p.key && (p.key.name || p.key.value);
    const nodes = []; (function walk(n, parent){ if (!n || typeof n.type!=='string') return; n.parent = parent; nodes.push(n);
      for (const k in n){ if (k==='parent') continue; const v = n[k]; if (Array.isArray(v)) v.forEach(x => x && typeof x.type==='string' && walk(x, n)); else if (v && typeof v.type==='string') walk(v, n); } })(ast, null);
    const unCT = a => a && a.type==='CallExpression' && a.callee.name==='cT'? a.arguments[0] : a;
    // enveloppes de campRadio : function(…, txt) { … campRadio('sol', cT(txt)) }
    const wrappers = {};
    for (const n of nodes) if (n.type==='CallExpression' && n.callee.name==='campRadio' && n.arguments[0] && n.arguments[0].type==='Literal'){
      const a = unCT(n.arguments[1]); if (!a || a.type!=='Identifier') continue;
      let fn = n.parent; while (fn && !/Function/.test(fn.type)) fn = fn.parent; if (!fn) continue;
      const idx = fn.params.findIndex(p => p.name===a.name); if (idx<0) continue;
      const host = fn.parent && fn.parent.type==='Property'? key(fn.parent) : fn.id && fn.id.name; if (host) wrappers[host] = { who:n.arguments[0].value, idx }; }
    const take = (who, n, tag) => { const objs = n.type==='ArrayExpression'? n.elements : n.type==='MemberExpression' && n.object.type==='ArrayExpression'? n.object.elements : [n];
      for (const o of objs) if (isTxt(o)){ const v = lit(o); if (v) found.push({ who, txt:v, src:f+':'+tag }); } };
    for (const n of nodes){
      if (n.type==='ObjectExpression'){ const w = n.properties.find(p => key(p)==='who'), t = n.properties.find(p => key(p)==='txt');
        let inRadio = false; for (let q = n.parent; q; q = q.parent) if (q.type==='Property' && key(q)==='radio'){ inRadio = true; break; }   // radio[] : lue dynamiquement (et remplacée par campExtend)
        if (t && isTxt(t.value) && !inRadio){ const who = w && w.value.type==='Literal'? w.value.value : 'nar'; take(who, t.value, 'who/txt'); } }
      if (n.type==='CallExpression'){ const nm = n.callee.name || (n.callee.property && n.callee.property.name);
        if (nm==='campRadio' && n.arguments[0] && n.arguments[0].type==='Literal'){ const a = unCT(n.arguments[1]); if (a) take(n.arguments[0].value, a, 'campRadio'); }
        else if (wrappers[nm] && n.arguments[wrappers[nm].idx]) take(wrappers[nm].who, n.arguments[wrappers[nm].idx], nm+'()'); }
    }
  }
  return found;
}

const [dyn, stat] = await Promise.all([dynamic(), staticScan()]);
const lines = [], seen = new Set();
const push = (lang, who, text, src) => { const k = lang+'|'+who+'|'+text; if (seen.has(k) || !text) return; seen.add(k); lines.push({ lang, who, text, hash: voiceKey(lang, who, text), src }); };
for (const l of dyn.out) push(l.lang, l.who, l.text, l.src);
let staticOnly = 0;
for (const s of stat) for (const L of LANGS){ if (!s.txt[L]) continue; const k = L+'|'+s.who+'|'+s.txt[L]; if (!seen.has(k)){ staticOnly++; push(L, s.who, s.txt[L], s.src); if (L==="fr" && process.env.VERBOSE) console.log("   statique : "+s.src+" "+s.who+" — "+s.txt[L].slice(0,70)); } }
for (const l of dyn.tpl) push(l.lang, l.who, l.text, l.src);
// contrôle croisé de l'empreinte : celle du jeu (navigateur) = celle de tools/voice/hash.mjs
const bad = dyn.out.slice(0, 50).filter((l,i) => voiceKey(l.lang, l.who, l.text)!==dyn.hash[i]).length;
if (bad){ console.error('✗ empreintes différentes entre le jeu et hash.mjs ('+bad+')'); process.exit(1); }
const order = Object.fromEntries(LANGS.map((l,i)=>[l,i]));
lines.sort((a,b) => order[a.lang]-order[b.lang]);
const speakers = {}; for (const l of lines) speakers[l.who] = (speakers[l.who]||0) + (l.lang==='fr'? 1 : 0);
const man = { v:1, langs:LANGS, names:dyn.who, speakers, lines: lines.map(({lang, who, text, hash}) => ({ lang, who, text, hash })) };
const json = JSON.stringify(man, null, 1)+'\n';
const per = LANGS.map(L => L+' '+lines.filter(l => l.lang===L).length).join(' · ');
console.log(`▶ ${lines.length} répliques (${per}) — dynamiques ${dyn.out.length}, statiques seules ${staticOnly}, gabarits ${dyn.tpl.length} — ${((Date.now()-t0)/1000).toFixed(1)} s`);
console.log('  voix : '+Object.entries(speakers).map(([k,n]) => k+' '+n).join(', '));
if (dyn.notes.length) console.log('  notes : '+[...new Set(dyn.notes)].slice(0,6).join(' | '));
if (dyn.errs.length) console.log('  erreurs JS : '+dyn.errs.slice(0,3).join(' | '));
if (args.includes('--check')){
  const old = await readFile(OUT, 'utf8').catch(() => '');
  if (old!==json){ console.log('✗ '+OUT+' n\'est plus à jour : relancez tools/voice/extract.mjs puis gen.py'); process.exit(1); }
  console.log('✓ inventaire à jour'); process.exit(0);
}
await writeFile(OUT, json);
console.log('✔ '+OUT);
