/* tools/test-voice.mjs — voix off : empreintes, fichiers, lecture dans les cinématiques, réglage, file://.
   usage : npm run dev && node tools/test-voice.mjs   (sortie non nulle en cas d'échec ; VOICE_STRICT=1 :
   un inventaire périmé — textes réécrits sans régénérer les voix — devient un échec au lieu d'un avertissement) */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { voiceKey } from './voice/hash.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
let fails = 0; const ok = m => console.log('  ✓ '+m), ko = m => { console.log('  ✗ '+m); fails++; }, check = (c, m) => c? ok(m) : ko(m);
const t0 = Date.now();
const man = JSON.parse(await readFile(path.join(ROOT, 'tools/voice/lines.json'), 'utf8'));
const langs = man.langs.filter(L => existsSync(path.join(ROOT, 'assets/voice', L, 'index.json')));

console.log('VOIX OFF — inventaire et fichiers');
check(man.lines.every(l => voiceKey(l.lang, l.who, l.text)===l.hash), `empreintes de l'inventaire = tools/voice/hash.mjs (${man.lines.length} répliques)`);
check(langs.length > 0, 'au moins une langue générée ('+langs.join(', ')+')');
for (const L of langs){
  const idx = JSON.parse(await readFile(path.join(ROOT, 'assets/voice', L, 'index.json'), 'utf8')).lines;
  const lines = man.lines.filter(l => l.lang===L), miss = [];
  let bytes = 0;
  for (const l of lines){ const f = path.join(ROOT, 'assets/voice', L, l.hash+'.mp3');
    if (!(idx[l.hash] > 0) || !existsSync(f)) miss.push(l.who+' « '+l.text.slice(0,40)+' »'); else bytes += (await stat(f)).size; }
  const extra = Object.keys(idx).filter(h => !lines.some(l => l.hash===h));
  check(!miss.length && !extra.length, `${L} : ${lines.length} répliques, chacune a son MP3 et sa durée (${(bytes/1e6).toFixed(2)} Mo)`+(miss.length? ' — manquent : '+miss.slice(0,3).join(' ; ') : '')+(extra.length? ' — orphelines : '+extra.length : ''));
}
// inventaire à jour avec les textes actuels du jeu ? (avertissement seulement, sauf VOICE_STRICT=1)
try { execFileSync('node', [path.join(ROOT, 'tools/voice/extract.mjs'), '--check'], { stdio:'pipe' }); ok('inventaire à jour avec les textes du jeu'); }
catch(e){ const msg = 'inventaire périmé : des textes ont changé — relancer node tools/voice/extract.mjs puis tools/voice/gen.py (les répliques changées restent muettes d\'ici là)';
  if (process.env.VOICE_STRICT) ko(msg); else console.log('  ⚠ '+msg); }

// serveur statique local (le jeu + assets/)
const TYPES = { '.html':'text/html; charset=utf-8', '.json':'application/json', '.mp3':'audio/mpeg', '.js':'text/javascript' };
const srv = http.createServer(async (req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT)){ res.writeHead(403); return res.end(); }
  try { const b = await readFile(p); res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(b); }
  catch(e){ res.writeHead(404); res.end(); }
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${srv.address().port}/la-derniere-bataille.html`;
const browser = await chromium.launch({ args:['--autoplay-policy=no-user-gesture-required'] });
const L0 = langs.includes('fr')? 'fr' : langs[0];
async function open(url, settings){
  const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await page.addInitScript(s => { window.requestAnimationFrame = () => 0;
    try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
      localStorage.setItem('agi_settings', JSON.stringify(Object.assign({ quality:'low', music:false, sfx:false }, s))); } catch(e){} }, settings);
  await page.goto(url); await page.waitForTimeout(400);
  return { page, errs };
}

console.log('VOIX OFF — lecture (http)');
if (L0){
  const { page, errs } = await open(BASE, { lang:L0 });
  // l'empreinte calculée par le jeu = celle de l'extracteur, pour toutes les répliques
  const bad = await page.evaluate(lines => lines.filter(l => voiceKey(l.lang, l.who, l.text)!==l.hash).length, man.lines);
  check(bad===0, `empreinte du jeu (voiceKey) = empreinte de l'extracteur (${man.lines.length} répliques)`);
  await page.waitForFunction(() => voiceIndex()!==undefined, null, { timeout:5000 }).catch(()=>{});
  // mission I, ouverture : on s'arrête sur la plus courte réplique dite
  const r = await page.evaluate(() => { CAMP_SAVE.done = 5; campLaunch(0);
    const sc = CINE.script; let best = -1, bd = 1e9;
    sc.forEach((s,i) => { const d = s.txt? voiceDur(s.who||'nar', s.txt) : 0; if (d>0 && d<bd){ bd = d; best = i; } });
    if (best<0) return { best };
    CINE.i = best-1; cineNext(); return { best, vd:CINE.vd, i:CINE.i }; });
  check(r.best>=0 && r.vd>0, `plan dit trouvé (durée de voix ${r.vd||0} s)`);
  if (r.best>=0){
    await page.waitForFunction(() => VOICE.cur && VOICE.cur.state==='play', null, { timeout:6000 }).catch(()=>{});
    const mid = await page.evaluate(() => { const i = CINE.i; CINE.t = 99; cineTick(0.05); return { held: CINE.i===i, state: VOICE.cur && VOICE.cur.state, plays: VOICE.plays }; });
    check(mid.state==='play' && mid.plays>=1, 'la voix est décodée et jouée (WebAudio)');
    check(mid.held, 'le plan ATTEND la fin de la voix même quand son temps de lecture est écoulé');
    await page.waitForTimeout(r.vd*1000 + 900);
    const end = await page.evaluate(i => { cineTick(0.05); return { moved: CINE.i!==i, state: VOICE.cur? VOICE.cur.state : 'none' }; }, r.i);
    check(end.moved, 'puis passe au plan suivant une fois la voix finie (+ marge)');
    // passer coupe la voix
    const sk = await page.evaluate(() => { const i = CINE.script.findIndex((s,j)=> j>CINE.i && s.txt && voiceDur(s.who||'nar', s.txt)>0); if (i<0) return null; CINE.i = i-1; cineNext(); return 1; });
    if (sk){ await page.waitForFunction(() => VOICE.cur && VOICE.cur.state==='play', null, { timeout:6000 }).catch(()=>{});
      const s2 = await page.evaluate(() => { cineEnd(); return !VOICE.cur && !CINE.on; }); check(s2, '« passer la cinématique » coupe la voix'); }
    // réglage coupé : aucune lecture
    const off = await page.evaluate(() => { voiceToggle(false); const p0 = VOICE.plays; campLaunch(0);
      const i = CINE.script.findIndex(s => s.txt); CINE.i = i-1; cineNext(); return { vd:CINE.vd, cur:!!VOICE.cur, p0 }; });
    await page.waitForTimeout(600);
    const p1 = await page.evaluate(() => VOICE.plays);
    check(off.vd===0 && !off.cur && p1===off.p0, 'Voix off coupée dans les réglages : aucune lecture');
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('agi_settings')).voice===false);
    check(persisted, 'le réglage est enregistré');
    // radio en mission : effet radio, durée renvoyée
    const rd = await page.evaluate(() => { voiceToggle(true); cineEnd(true); const l = (window.__l = null);
      const m = CAMPAIGN[0].radio.find(x => x.txt && voiceDur(x.who, x.txt)>0); return m? voiceSay(m.who, cT(m.txt), {radio:true}) : -1; });
    check(rd>0, 'transmission radio en mission : voiceSay() renvoie la durée ('+rd+' s)');
  }
  check(!errs.length, 'aucune erreur JS / console'+(errs.length? ' — '+errs.slice(0,3).join(' | ') : ''));
  await page.close();
}

console.log('VOIX OFF — fichier local (file://)');
{ const { page, errs } = await open('file://'+path.join(ROOT, 'la-derniere-bataille.html'), { lang:'fr' });
  const r = await page.evaluate(() => { CAMP_SAVE.done = 5; campLaunch(0); let n = 0; while (CINE.on && n++ < 40){ CINE.t = 99; cineTick(0.05); render(1/60); } return { idx:voiceIndex(), on:CINE.on, n }; });
  check(r.idx===null && !r.on && r.n>3, 'voix indisponible sans serveur : la cinématique se déroule, muette');
  check(!errs.length, 'aucune erreur JS / console en file://'+(errs.length? ' — '+errs.slice(0,3).join(' | ') : ''));
  await page.close(); }

await browser.close(); srv.close();
console.log(fails? `\n✗ ${fails} échec(s) — ${((Date.now()-t0)/1000)|0} s` : `\n✓ voix off : tout passe — ${((Date.now()-t0)/1000)|0} s`);
process.exit(fails? 1 : 0);
