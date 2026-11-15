/* tools/test-audio.mjs — banc d'essai de l'audio (sons enregistrés, musique, repli de synthèse).
   1. assets/audio : manifeste ↔ fichiers ↔ CREDITS.md cohérents, taille totale bornée
   2. dans Chromium (servi en http) : chaque fichier se décode ; ni écrêtage ni composante continue ;
      chaque boucle se raccorde (la queue recopie bien le début)
   3. chaque thème du contrat existe et produit du son (rendu hors ligne), niveaux et coût CPU mesurés ;
      équilibre : ambiance sous les effets, musique entre les deux
   4. repli : ouvert en file://, aucun fichier n'est demandé et effets, ambiance, thèmes sonnent en synthèse
   Prérequis : npm run dev. Lancer : node tools/test-audio.mjs (sortie non nulle au moindre échec). */
import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const A = join(ROOT, 'assets/audio');
let fails = 0; const ok = m => console.log('  ✓ '+m), ko = m => { console.log('  ✗ '+m); fails++; };
const check = (c, m) => c? ok(m) : ko(m);
const THEMES = ['m_night','m_strike','m_dam','m_cold','m_citadel','m_finale','c_dread','c_hope','c_sorrow','c_map','e_dawn','e_ash'];

console.log('\nFICHIERS');
const man = JSON.parse(await readFile(join(A, 'manifest.json'), 'utf8'));
const credits = await readFile(join(A, 'CREDITS.md'), 'utf8');
const files = [];
for (const d of ['sfx','amb','mus']) for (const f of await readdir(join(A, d))) files.push(d+'/'+f);
const ref = new Set(); let bytes = 0;
for (const [k, s] of Object.entries(man.sounds)) for (const t of s.takes){ ref.add(t.f);
  if (!existsSync(join(A, t.f))) ko('manquant : '+t.f+' ('+k+')');
  if (s.kind==='loop' && !(t.loop>1)) ko('boucle sans longueur : '+k);
  if (s.kind==='note' && t.root==null) ko('note sans hauteur : '+k); }
for (const f of files){ bytes += (await stat(join(A, f))).size; if (!ref.has(f)) ko('fichier hors manifeste : '+f); if (!credits.includes('`'+f+'`')) ko('absent des crédits : '+f); }
check(files.length===ref.size, `${files.length} fichiers, tous au manifeste et aux crédits`);
check(bytes < 8.5e6, `taille totale ${(bytes/1e6).toFixed(2)} Mo (< 8,5 Mo)`);
check(!/\b(CC[- ]BY[- ]NC|NonCommercial|NoDerivatives)\b/i.test(credits) && (credits.match(/CC0 1\.0/g)||[]).length >= files.length, 'licences : CC0 uniquement');

// ---- serveur http local ----
const TYPES = { '.html':'text/html', '.json':'application/json', '.mp3':'audio/mpeg' };
const srv = http.createServer(async (q, r) => { try { let p = decodeURIComponent(q.url.split('?')[0]); if (p==='/') p = '/la-derniere-bataille.html';
  if (p.includes('..')) throw 0; const b = await readFile(join(ROOT, p)); r.writeHead(200, {'content-type':TYPES[extname(p)]||'application/octet-stream'}); r.end(b); }
  catch(e){ r.writeHead(404); r.end(); } });
await new Promise(res => srv.listen(0, '127.0.0.1', res));
const URL0 = `http://127.0.0.1:${srv.address().port}/`;
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
async function open(url){
  const page = await browser.newPage(); const errs = [], reqs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('request', q => { if (/assets\/audio/.test(q.url())) reqs.push(q.url()); });
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0;
    try { localStorage.setItem('agi_langChosen','1'); localStorage.setItem('agi_tutoSeen','1'); localStorage.setItem('agi_introSeen','1');
      localStorage.setItem('agi_settings', JSON.stringify({ quality:'high', lang:'fr', music:false, sfx:true })); } catch(e){} });
  await page.goto(url); await page.waitForTimeout(300);
  return { page, errs, reqs };
}
// outils injectés : rendu hors ligne d'un thème / d'un son, mesures
const TOOLS = () => {
  window.__meas = (buf) => { let pk = 0, ss = 0, dc = 0, n = 0; const W = buf.sampleRate*0.4|0; let mx = 0;
    for (let c=0;c<buf.numberOfChannels;c++){ const d = buf.getChannelData(c); let acc = 0;
      for (let i=0;i<d.length;i++){ const a = d[i]; if (Math.abs(a)>pk) pk = Math.abs(a); ss += a*a; dc += a; n++;
        acc += a*a; if (i>=W){ const b = d[i-W]; acc -= b*b; } if (i>=W && c===0){ const m = acc/W; if (m>mx) mx = m; } } }
    return { pk:20*Math.log10(pk||1e-9), rms:10*Math.log10(ss/n||1e-12), mmax:10*Math.log10(mx||1e-12), dc:Math.abs(dc/n) }; };
  window.__renderTheme = async (id, sec, tension) => {
    const real = AC, off = new OfflineAudioContext(2, 48000*sec, 48000);
    AC = off; audioBuses(off); MUSIC.bus = null; MUSIC.cur = null; MUSIC.step = 0;
    const th = MUSIC_THEMES[id]; musicSwitch(id);
    let t = 0.05, st = 0; const c0 = performance.now();
    while (t < sec - 0.5){ const d = 60/(th.bpm*MUSIC_TEMPO)/2; sfxBus = MUSIC.bus; try { th.step(st, t, d, tension); } finally { sfxBus = null; } st++; t += d; }
    const buf = await off.startRendering(); const ms = performance.now() - c0;
    AC = real; audioBuses(real);
    return Object.assign(__meas(buf), { cpu: ms/sec });
  };
  window.__renderFx = async (fn, sec) => {
    const real = AC, off = new OfflineAudioContext(2, 48000*sec, 48000); AC = off; audioBuses(off);
    try { fn(); } catch(e){ AC = real; throw e; }
    const buf = await off.startRendering(); AC = real; audioBuses(real); return __meas(buf);
  };
};

console.log('\nDÉCODAGE, CRÊTES, BOUCLES (Chromium, http)');
{ const { page, errs } = await open(URL0); await page.evaluate(TOOLS);
  await page.mouse.click(4, 4); await page.waitForTimeout(300);
  const r = await page.evaluate(async () => {
    await SND.manP; const out = { bad:[], clip:[], dc:[], seam:[], n:0 };
    const all = []; for (const k in SND.man.sounds){ const s = SND.man.sounds[k]; for (const t of s.takes) all.push([k, s, t]); }
    for (const g of new Set(all.map(x => x[1].grp))) await sampLoad(g);
    for (const [k, s, t] of all){ out.n++;
      if (!t.b || !(t.b.duration > 0.004)){ out.bad.push(t.f); continue; }
      const m = __meas(t.b); if (m.pk > -0.3) out.clip.push(t.f+' '+m.pk.toFixed(2)); if (m.dc > 0.01) out.dc.push(t.f);
      if (s.kind==='loop' && k!=='march'){            // raccord (la marche est une boucle d'origine, rythmique) : on rejoue la jonction comme le lecteur du jeu (instance suivante à t+L, fondu 0,3 s)
        const sr = 48000, L = t.loop, off = new OfflineAudioContext(1, Math.round(sr*(L+1.2)), sr);
        for (const [at, fin] of [[0,false],[L,true]]){ const s2 = off.createBufferSource(), g = off.createGain(); s2.buffer = t.b; s2.connect(g); g.connect(off.destination);
          if (fin){ g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(1, at+0.3); } else { g.gain.setValueAtTime(1, L); g.gain.linearRampToValueAtTime(0, L+0.3); }
          s2.start(at, t.off||0); s2.stop(at + (fin? 1.2 : L+0.35)); }
        const d = (await off.startRendering()).getChannelData(0), W = sr*0.05|0, lv = [];
        for (let i=Math.round((L-1)*sr); i+W<=Math.round((L+1)*sr); i+=W){ let e = 0; for (let j=0;j<W;j++) e += d[i+j]*d[i+j]; lv.push(10*Math.log10(e/W+1e-12)); }
        const at = lv.slice(18, 26), rest = lv.slice(0, 16).concat(lv.slice(28));
        const lo = Math.min(...rest), hi = Math.max(...rest), dev = Math.max(0, ...at.map(v => v>hi? v-hi : v<lo? lo-v : 0));
        if (dev > 1.5 || t.b.duration < t.loop + 0.3) out.seam.push(t.f+' '+dev.toFixed(1)+' dB'); }
    }
    return out; });
  check(!r.bad.length, `${r.n} fichiers décodés`+(r.bad.length? ' — échecs : '+r.bad.join(', ') : ''));
  check(!r.clip.length, 'aucun écrêtage (crête < −0,3 dBFS)'+(r.clip.length? ' — '+r.clip.join(', ') : ''));
  check(!r.dc.length, 'aucune composante continue'+(r.dc.length? ' — '+r.dc.join(', ') : ''));
  check(!r.seam.length, 'boucles d\'ambiance raccordées sans trou ni bosse à la jonction'+(r.seam.length? ' — '+r.seam.join(', ') : ''));

  console.log('\nTHÈMES DU CONTRAT (rendu hors ligne, 12 s, instruments chargés)');
  const th = await page.evaluate(async (ids) => { const out = {};
    for (const id of ids){ if (!MUSIC_THEMES[id]){ out[id] = null; continue; }
      for (const g of MUSIC_THEMES[id].inst||[]) await sampLoad('mus_'+g);
      out[id] = await __renderTheme(id, 12, 0.5); }
    return out; }, THEMES);
  let cpuMax = 0;
  for (const id of THEMES){ const m = th[id];
    if (!m){ ko(id+' : absent'); continue; }
    cpuMax = Math.max(cpuMax, m.cpu);
    check(m.mmax > -40 && m.pk < -0.1, `${id} : sonie max ${m.mmax.toFixed(1)} dB, crête ${m.pk.toFixed(1)} dBFS, ${m.cpu.toFixed(0)} ms de calcul / s rendue`); }
  check(cpuMax < 120, `coût CPU des thèmes < 120 ms par seconde rendue (pire : ${cpuMax.toFixed(0)} ms)`);
  const al = await page.evaluate(() => ['night','carnet','strike','dam','rochefroide','citadel'].map(m => [m, musicResolve(m)]));
  check(al.every(([a,b]) => b!==a && b.startsWith(a==='carnet'? 'c_' : 'm_')), 'anciens identifiants redirigés : '+al.map(x => x.join('→')).join(', '));

  console.log('\nÉQUILIBRE DU MÉLANGE (sons enregistrés)');
  const mix = await page.evaluate(async () => {
    let sd = 12345; Math.random = () => (sd = (sd*16807)%2147483647)/2147483647;   // prises et variations reproductibles
    const r = {};
    r.boom = await __renderFx(() => sampSfx('boom', 0, 0), 3);
    r.shoot = await __renderFx(() => sampSfx('shoot', 1, 0), 2);
    r.ui = await __renderFx(() => sampSfx('sel', 0, 0), 1);
    r.hero = await __renderFx(() => sampHero('HUM', 'spawn', 0, 1, 0), 3);
    r.amb = await __renderFx(() => { clearInterval(AMBS.timer); game = null; SND.beds = {}; bedTick('rainstreet', 0.35); bedTick('cityrain', 0.85); bedTick('rainroof', 0.55); }, 8);
    r.music = await __renderTheme('m_night', 12, 0.4);
    return r; });
  for (const [k, m] of Object.entries(mix)) console.log(`    ${k.padEnd(6)} sonie max ${m.mmax.toFixed(1)} dB · moyenne ${m.rms.toFixed(1)} dB · crête ${m.pk.toFixed(1)} dBFS`);
  check(mix.amb.mmax < mix.boom.mmax - 10 && mix.amb.mmax < mix.hero.mmax - 6 && mix.amb.mmax < mix.shoot.mmax + 6, 'l\'ambiance reste sous les effets');
  check(mix.music.mmax < mix.boom.mmax && mix.music.mmax > mix.amb.mmax - 6, 'la musique se place entre ambiance et explosions');
  check(Object.values(mix).every(m => m.pk < -0.1), 'aucun écrêtage au mélange');
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}

console.log('\nREPLI SANS FICHIERS (file://)');
{ const { page, errs, reqs } = await open('file://'+join(ROOT, 'la-derniere-bataille.html')); await page.evaluate(TOOLS);
  await page.mouse.click(4, 4); await page.waitForTimeout(500);
  const r = await page.evaluate(async () => ({
    can: sampCanFetch(), man: !!SND.man,
    sfx: (await __renderFx(() => { sfx('boom'); sfx('shoot', 2); sfx('evolve'); }, 2)).mmax,
    hero: (await __renderFx(() => { heroSfx('HUM', 'spawn', null, true); }, 2)).mmax,
    theme: (await __renderTheme('m_cold', 8, 0.5)).mmax,
    old: (await __renderTheme('night', 6, 0.5)).mmax }));
  check(!r.can && !r.man && !reqs.length, 'aucun fichier demandé en file://');
  check(r.sfx > -45 && r.hero > -45, `effets et héros en synthèse (${r.sfx.toFixed(1)} / ${r.hero.toFixed(1)} dB)`);
  check(r.theme > -50 && r.old > -50, `thèmes en synthèse : m_cold ${r.theme.toFixed(1)} dB, night ${r.old.toFixed(1)} dB`);
  check(!errs.length, 'aucune erreur JS'+(errs[0]? ' — '+errs[0] : ''));
  await page.close();
}
await browser.close(); srv.close();
console.log(fails? `\n${fails} échec(s)` : '\ntout est bon');
process.exit(fails? 1 : 0);
