/* ================= MUSIQUE DE CAMPAGNE (v1.16) =================
   Compositions originales séquencées ici et jouées avec de vrais instruments échantillonnés (CC0 :
   guitare nylon, piano droit, cordes, cuivres, harmonium, percussions, cloches — voir
   assets/audio/CREDITS.md), réverbérées. Un thème = MUSIC_THEMES[id] = { bpm, verb, inst:[lots],
   step(st, t, d, tension) } ; st repart de 0 à chaque entrée du thème (pas = croche, d = sa durée).
   Tant qu'un instrument n'est pas chargé (ou hors ligne), inst() le remplace par une synthèse :
   aucun thème n'est jamais muet.
   Identifiants (contrat avec les missions) : m_night m_strike m_dam m_cold m_citadel m_finale
   c_dread c_hope c_sorrow c_map e_dawn e_ash. Les anciens identifiants (night, carnet, strike, dam,
   rochefroide, citadel) basculent vers le nouveau thème dès que ses instruments sont chargés. */
const INST_G = { gtr:0.62, gtrh:0.4, pno:0.55, vln:0.3, vc:0.34, pizz:0.6, hrn:0.36, tpt:0.3, tba:0.5, org:0.28,
  snare:0.36, snareg:0.32, roll:0.3, bd:0.55, cym:0.24, timp:0.5, gong:0.42, bell:0.34, chime:0.3 };
const INST_GRP = { gtr:'gtr', gtrh:'gtr', pno:'pno', vln:'str', vc:'str', pizz:'str', hrn:'brass', tpt:'brass', tba:'brass', org:'org',
  snare:'drums', snareg:'drums', roll:'drums', bd:'drums', cym:'drums', timp:'drums', gong:'bell', bell:'bell', chime:'bell' };
const mHash = (a, b) => { const x = Math.sin(a*12.9898 + b*78.233)*43758.5453; return x - Math.floor(x); };
// joue une note : clé d'instrument, hauteur MIDI (réelle, sans MUSIC_TUNE), début, durée (s), vélocité 0..1
function inst(key, m, t, dur, vel, o){
  if (!AC) return; o = o || {};
  const bus = o.bus || sfxBus || MUSIC.bus || BUS.mduck || master;
  const s = SND.man && SND.man.sounds[key], v = (vel==null? 0.7 : vel) * (INST_G[key] || 0.4);
  if (s){
    const ok = s.takes.filter(x => x.b);
    if (ok.length){
      let tk = ok[0];
      if (tk.root){ let best = 1e9; for (const x of ok){ const dd = Math.abs(m - x.root) + (m < x.root? 0.4 : 0); if (dd < best){ best = dd; tk = x; } } }
      else tk = ok[(Math.random()*ok.length)|0];
      const src = AC.createBufferSource(), g = AC.createGain(); src.buffer = tk.b;
      src.playbackRate.value = tk.root? Math.pow(2, (m - tk.root)/12) : (o.rate || 1);
      const off = tk.off || 0, att = o.att!=null? o.att : (tk.sus? 0.06 : 0.002), rel = o.rel!=null? o.rel : (tk.sus? 0.7 : 0.4);
      if (tk.sus){ src.loop = true; src.loopStart = tk.sus[0] + off; src.loopEnd = tk.sus[1] + off; }
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + att);
      g.gain.setValueAtTime(v, t + Math.max(att, dur)); g.gain.setTargetAtTime(0.0001, t + Math.max(att, dur), rel/3);
      let head = g; if (o.pan && AC.createStereoPanner){ const p = AC.createStereoPanner(); p.pan.value = o.pan; g.connect(p); head = p; }
      src.connect(g); head.connect(bus); src.start(t, off); src.stop(t + Math.max(att, dur) + rel*1.6 + 0.05);
      if (bus._srcs){ bus._srcs.add(src); src.onended = () => bus._srcs.delete(src); }
      return true;
    }
    sampLoad(s.grp);
  }
  instSynth(key, m, t, dur, vel==null? 0.7 : vel, bus);
  return false;
}
// remplaçant synthétique (hors ligne, ou le temps du chargement)
function instSynth(key, m, t, dur, vel, bus){
  const f = 440*Math.pow(2, (m-69)/12), keep = sfxBus; sfxBus = bus;
  try {
    const g = INST_GRP[key];
    if (key==='bd' || key==='timp'){ tone(key==='bd'? 60 : 88, t, key==='bd'? .3 : .7, 'sine', .12*vel, -30); }
    else if (key==='snare' || key==='snareg' || key==='roll'){ noise(t, key==='roll'? .6 : .08, (key==='snareg'? .012 : .03)*vel, 1500); }
    else if (key==='cym' || key==='gong'){ noise(t, key==='gong'? 2 : 1.2, .012*vel, key==='gong'? 200 : 5000); if (key==='gong') tone(98, t, 3, 'sine', .04*vel); }
    else if (g==='str' && key!=='pizz' || key==='org' || key==='hrn'){ tone(f, t, dur+0.4, 'sawtooth', .014*vel, 0, Math.min(0.5, dur*0.4), key==='vln'? 1600 : 900);
      tone(f*1.004, t, dur+0.4, 'triangle', .012*vel, 0, Math.min(0.6, dur*0.5)); }
    else if (key==='tpt' || key==='tba'){ tone(f, t, Math.max(0.15, dur), 'sawtooth', .022*vel, 0, 0.02, key==='tba'? 600 : 1800); }
    else { tone(f, t, Math.min(3, dur+1.2), 'triangle', .04*vel, 0, 0.004, 2600); if (key==='gtr' || key==='pizz') tone(f*2, t, 0.25, 'sine', .01*vel); }
  } finally { sfxBus = keep; }
}
const instReady = list => !!SND.man && list.every(g => sampGrpReady('mus_'+g));
// alias des anciens identifiants + acte III de la mission V → m_finale
const MUSIC_ALIAS = { night:'m_night', carnet:'c_map', strike:'m_strike', dam:'m_dam', rochefroide:'m_cold', citadel:'m_citadel' };
function musicResolve(m){
  if (m==='citadel' || m==='m_citadel'){ try { if (typeof m5Act==='function' && m5Act()>=3) m = 'm_finale'; } catch(e){} }
  const a = MUSIC_ALIAS[m];
  if (a && MUSIC_THEMES[a]){ if (instReady(MUSIC_THEMES[a].inst)) return a; }
  else if (MUSIC_THEMES[m] && MUSIC_THEMES[m].inst) instReady(MUSIC_THEMES[m].inst);    // déclenche le chargement
  return m;
}
/* ---------- ritournelles (effets musicaux) : montée d'ère, clairon du Che, sonnerie aux morts… ---------- */
function musStinger(name, at, V, pan){
  if (!AC) return false;
  const need = { eraHUM:['brass','drums'], eraIA:['bell'], trans:['bell','str'], node:['bell'], bugle:['brass'], taps:['brass'], gong:['bell'] }[name];
  if (!need || !instReady(need)) return false;
  const t = at || AC.currentTime + 0.02, o = { bus: BUS.sfx, pan: pan || 0 }, k = (V==null? 1 : V);
  if (name==='eraHUM'){                                        // fanfare : arpège de trompettes, cors, timbale, cymbale
    [[65,0,0.12],[70,0.13,0.12],[74,0.26,0.12],[77,0.4,1.1]].forEach(([m,d,l]) => inst('tpt', m, t+d, l, 0.9*k, o));
    [58,62,65].forEach(m => inst('hrn', m, t+0.4, 1.2, 0.7*k, o)); inst('tba', 46, t+0.4, 0.6, 0.8*k, o);
    inst('timp', 0, t, 1, 0.8*k, o); inst('timp', 0, t+0.4, 1, 1*k, o); inst('cym', 0, t+0.4, 2, 0.8*k, o); musicDip(5, 1.6);
  } else if (name==='eraIA'){                                  // carillon froid qui monte + gong
    [76,81,84,88,93].forEach((m,i) => inst('chime', m, t+i*0.09, 1.2, 0.7*k, o)); inst('gong', 0, t+0.45, 3, 0.7*k, o); sampPlay('ia_up', {vol:0.5*k, at:t}); musicDip(5, 1.6);
  } else if (name==='trans'){
    [72,76,79,84,88].forEach((m,i) => inst('chime', m, t+i*0.14, 2, 0.6*k, o)); [69,72,76].forEach(m => inst('vln', m, t+0.3, 2.2, 0.8*k, Object.assign({att:0.6}, o)));
    inst('gong', 0, t+0.7, 4, 0.6*k, o); musicDip(6, 2.5);
  } else if (name==='node'){ inst('chime', 84, t, 1.2, 0.6*k, o); inst('chime', 88, t+0.12, 1.4, 0.55*k, o); }
  else if (name==='bugle'){ [[67,0,0.16],[72,0.18,0.16],[76,0.36,0.16],[79,0.54,0.7]].forEach(([m,d,l]) => inst('tpt', m, t+d, l, 0.75*k, o)); }
  else if (name==='taps'){ [[72,0,0.45],[67,0.5,0.45],[64,1.0,1.4]].forEach(([m,d,l]) => inst('hrn', m, t+d, l, 0.75*k, o)); }
  else if (name==='gong'){ inst('gong', 0, t, 3, 0.8*k, o); inst('chime', 81, t+0.05, 1.5, 0.4*k, o); }
  return true;
}

/* ================= LES THÈMES ================= */
const T = MUSIC_THEMES;
const bpmEff = b => b / MUSIC_TEMPO;                            // le moteur multiplie tout tempo par MUSIC_TEMPO
const nn = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];

// m_night — Valmont sous la pluie, coupure de courant : contrebasse pizzicato, attente feutrée ; quand le
// quartier se rallume, le piano ose une mélodie en fa majeur.
T.m_night = { bpm:bpmEff(84), verb:0.32, inst:['str','pno','drums'], step(st, t, d, s){
  const bar = st>>3, s8 = st&7, c = game && game.camp, lit = !!(c && c.litK > 0.6);
  const P = lit? [[53,57,60],[48,52,55],[50,53,57],[46,50,53]] : [[50,53,57],[50,53,57],[46,50,53],[45,49,52],[50,53,57],[43,46,50],[46,50,53],[45,49,52]];
  const ch = nn(P, bar), r = ch[0];
  const BP = bar%2? [[0,0],[4,-5],[6,-2]] : [[0,0],[3,7],[6,12]];
  for (const [k, iv] of BP) if (s8===k && !(k && mHash(bar, k) < 0.18)) inst('pizz', r-24+iv, t, d*2.2, k? 0.55 : 0.8);
  if (s8===0 && bar%2===0) inst('vc', r-12, t, d*15.5, 0.25 + 0.45*s, {att:1.2, rel:1.5});
  if (s>0.5 && s8===0 && bar%4===2) inst('vln', ch[2]+12, t, d*14, 0.35*s, {att:1.6, rel:1.5});
  if (lit){ const m = nn([72,0,0,76,0,77,76,0, 74,0,0,72,0,0,69,0, 72,0,0,79,0,77,76,0, 74,0,72,0,69,0,0,0], st); if (m) inst('pno', m, t, d*3, 0.42); }
  else if ((s8===3 || s8===6) && mHash(st, 7) < 0.22) inst('pno', ch[(st>>1)%3]+24, t, d*4, 0.28);       // quelques lueurs
  if (s>0.4 && (s8===2 || s8===6)) inst('snareg', 0, t, d, 0.5 + 0.4*s);
  if (s>0.55 && s8===0) inst('bd', 0, t, d*2, 0.35);
} };

// m_strike — le port à l'aube, la grève : fanfare de rue (cuivres, tuba), tambour de cortège, élan joyeux et
// en colère ; forme en quatre sections de quatre mesures (tambours seuls → cor → trompettes → tutti).
const STRIKE_MEL = [65,0,0,65, 67,0,69,0, 70,0,0,0, 69,0,67,0,  65,0,0,62, 64,0,65,0, 67,0,0,0, 0,0,0,0,
                    65,0,0,65, 67,0,69,0, 70,0,72,0, 74,0,72,0,  70,0,69,0, 67,0,65,0, 65,0,0,0, 0,0,0,0];
T.m_strike = { bpm:bpmEff(104), verb:0.2, inst:['brass','drums'], step(st, t, d, s){
  const bar = st>>3, s8 = st&7, sec = (bar>>2)%4;
  const ch = nn([[58,62,65],[53,57,60],[55,58,62],[51,55,58],[58,62,65],[53,57,60],[51,55,58],[53,57,60]], bar), r = ch[0];
  if (s8===0 || s8===4) inst('bd', 0, t, d*2, s8? 0.55 : 0.8);
  if ([1,0,1,1,1,0,1,0][s8]) inst('snare', 0, t, d, s8===4? 0.95 : 0.6);
  else inst('snareg', 0, t, d, 0.5);
  if (bar%4===3 && s8===6) inst('roll', 0, t, d*2, 0.6);
  if (s8===0) inst('tba', r-24, t, d*0.9, 0.85); if (s8===4) inst('tba', ch[2]-24, t, d*0.9, 0.7);
  if (s8===2 || s8===6) for (const n of ch) inst('hrn', n-12, t, d*0.8, 0.28, {att:0.01, rel:0.15});     // contretemps
  const m = nn(STRIKE_MEL, st);
  if (m && sec>=1){ let L = 1; while (L<6 && !nn(STRIKE_MEL, st+L)) L++;
    inst(sec===1? 'hrn' : 'tpt', m, t, d*L*0.92, sec===1? 0.75 : 0.7);
    if (sec>=2) inst('hrn', m-4 - (m%2), t, d*L*0.9, 0.45); }
  if (s>0.3 && (s8===3 || s8===7) && sec!==1) inst('tpt', ch[1]+12, t, d*0.5, 0.35*s, {rel:0.12});
  if (st%32===0 && sec>=2) inst('cym', 0, t, 2, 0.7);
} };

// m_dam — chaleur immobile au barrage : bourdon de violoncelles (mi, si), cordes aiguës tenues qui
// montent lentement, timbale lointaine quand la bataille gronde ; tout s'ouvre quand la vanne cède.
T.m_dam = { bpm:bpmEff(50), verb:0.42, inst:['str','drums'], step(st, t, d, s){
  const bar = st>>3, s8 = st&7, c = game && game.camp, open = !!(c && (c.siren>0 || (c.flood && c.flood.t<6)));
  if (st%16===0){ inst('vc', 40, t, d*17, 0.55, {att:1.5, rel:2}); inst('vc', 47, t, d*17, 0.4, {att:2, rel:2}); }
  const RISE = [71,72,74,76,78,79,81,83];
  if (s8===0 && bar%2===0){ const n = RISE[(bar>>1)%8]; inst('vln', n, t, d*15, 0.35 + 0.35*s, {att:2.2, rel:2}); if ((bar>>1)%8>=4) inst('vln', n-5, t, d*15, 0.25, {att:2.5, rel:2}); }
  if (s8===4 && bar%4===1) inst('pizz', 52, t, d*3, 0.4);
  if (s>0.3 && s8===0 && bar%4===0) inst('timp', 0, t, d*6, 0.45 + 0.4*s);
  if (open && s8%2===0) inst('vln', 76 + (st%4? 0 : 7), t, d*2.2, 0.5, {att:0.05});
} };

// m_cold — Rochefroide dans le blizzard : guitare nylon seule, très peu de notes, beaucoup d'air ;
// l'harmonium entre quand le vent forcit ; la cloche de la mine, de loin en loin.
const COLD_CH = [[45,52,57,60,64],[41,48,53,57,60],[48,52,55,60,64],[47,50,55,59,62]];   // la m · fa · do · sol/si
const COLD_FIG = [[[0,0],[3,2],[6,3],[11,4]], [[0,0],[6,3],[7,4]], [[0,0],[2,1],[4,2],[8,4],[12,3]], [[0,0],[0,2],[1,3],[10,-1]]];
T.m_cold = { bpm:bpmEff(60), verb:0.5, inst:['gtr','org','bell'], step(st, t, d, s){
  const c = game && game.camp, gu = (c && c.gust) || 0, span = st>>4, k = st&15, phrase = span>>2;
  const ch = COLD_CH[span%4], fig = COLD_FIG[(phrase*3 + span) % 4];
  if (mHash(phrase, 3) < 0.25 && span%4===3 && k>0) return;                 // une mesure de silence de temps en temps
  for (const [at, vi] of fig) if (k===at){ const hum = mHash(st, 1)*0.018;
    if (vi<0) inst('gtrh', 88, t+hum, d*8, 0.35); else inst('gtr', ch[vi], t+hum, d*(vi? 7 : 12), vi? 0.5 : 0.62); }
  if (k===0 && span%2===0 && (gu>0.3 || s>0.45 || span%8>=4)) [ch[0], ch[0]+7, ch[0]+12].forEach(n => inst('org', n, t, d*31, 0.25 + 0.35*Math.max(gu, s), {att:2.5, rel:2.5}));
  if (st%256===128) inst('bell', 69, t, 6, 0.35, {pan:-0.4});
} };

// m_citadel — la citadelle d'Omnicorp : l'hymne de Germinal ralenti de moitié, cors graves sur un pouls de
// machine ; à l'acte II une ombre un demi-ton au-dessus, la timbale et le tuba.
T.m_citadel = { bpm:bpmEff(66), verb:0.35, inst:['brass','drums','str','bell'], step(st, t, d, s){
  let a = 1; try { if (typeof m5Act==='function') a = m5Act() || 1; } catch(e){}
  const s8 = st&7, ch = CH_RED[(st>>4)%8], mn = st%2? 0 : MEL_RED[(st>>1) % MEL_RED.length];
  tone(m2f(ch[0]-24), t, d*0.45, 'sine', .05 + .03*s, 0, 0.01);                 // le pouls de la machine
  if (s8%4===2) noise(t, .02, .006 + .006*a, 6800);
  if (st%16===0) inst('vc', ch[0]-12, t, d*16.5, 0.45, {att:1.2, rel:1.5});
  if (mn){ let L = 2; while (L<8 && !MEL_RED[((st>>1)+L/2) % MEL_RED.length]) L += 2;
    inst('hrn', mn-12, t, d*L*0.95, 0.55 + 0.1*a, {att:0.12});
    if (a>=2){ inst('tba', mn-24, t, d*1.2, 0.5); inst('vln', mn+1, t+d*0.5, d*L*0.8, 0.18, {att:0.5}); } }
  if (a>=2 && s8===0) inst('timp', 0, t, d*4, 0.5 + 0.3*s);
  if (st%128===0) inst('gong', 0, t, 6, 0.5);
} };

// m_finale — acte III : l'hymne complet, tout le monde ensemble ; trompettes et cors, cordes, tambours,
// cymbales ; le tempo monte avec la tension.
T.m_finale = { get bpm(){ return bpmEff(104 + 18*stress()); }, verb:0.28, inst:['brass','drums','str'], step(st, t, d, s){
  const bar = (st>>3)%8, s8 = st&7, ch = CH_RED[bar], mn = MEL_RED[st % MEL_RED.length];
  if (mn){ let L = 1; while (L<4 && !MEL_RED[(st+L) % MEL_RED.length]) L++;
    inst('tpt', mn, t, d*L*0.9, 0.7); inst('hrn', mn-12, t, d*L*0.9, 0.6); }
  if (s8===0){ for (const n of ch) inst('vln', n+12, t, d*8.5, 0.5, {att:0.25}); inst('vc', ch[0]-12, t, d*8.5, 0.6, {att:0.15}); inst('tba', ch[0]-24, t, d, 0.8); }
  if (s8===4) inst('tba', ch[2]-24, t, d, 0.6);
  if (s8%2===0) inst('bd', 0, t, d, s8? 0.5 : 0.8);
  inst(s8%2? 'snareg' : 'snare', 0, t, d, s8%2? 0.45 : 0.7);
  if (s8===0) inst('timp', 0, t, d*3, 0.7);
  if (st%64===0 || st%64===32) inst('cym', 0, t, 3, 0.8);
} };

// c_dread — menace : nappe grave, pouls lent, une note qui ne se résout pas
T.c_dread = { bpm:bpmEff(60), verb:0.45, inst:['str','drums','bell'], step(st, t, d, s){
  const s8 = st&7, bar = st>>3;
  if (st%16===0) inst('vc', 38, t, d*17, 0.6, {att:2, rel:2});
  if (s8===0 || s8===1) inst('bd', 0, t, d, s8? 0.3 : 0.45);
  if (s8===0 && bar%4===2) inst('vln', 75, t, d*15, 0.3, {att:2.5, rel:2.5});
  if (st%64===0) inst('gong', 0, t, 6, 0.35);
} };
// c_hope — solidarité, retournement : cordes en majeur qui montent lentement, cor, piano
T.c_hope = { bpm:bpmEff(72), verb:0.4, inst:['str','brass','pno'], step(st, t, d, s){
  const bar = st>>3, s8 = st&7, ch = nn([[62,66,69],[59,62,66],[55,59,62],[57,61,64]], bar), lift = 12*((bar>>2)%2);
  if (s8===0){ for (const n of ch) inst('vln', n+lift, t, d*8.5, 0.4, {att:0.8}); inst('vc', ch[0]-12, t, d*8.5, 0.5, {att:0.6}); }
  const m = nn([66,0,0,0,69,0,0,0, 71,0,69,0,66,0,0,0, 64,0,66,0,69,0,0,0, 71,0,0,0,73,0,0,0], st);
  if (m && bar%8>=2){ let L = 1; while (L<6 && !nn([66,0,0,0,69,0,0,0, 71,0,69,0,66,0,0,0, 64,0,66,0,69,0,0,0, 71,0,0,0,73,0,0,0], st+L)) L++; inst('hrn', m, t, d*L*0.95, 0.55, {att:0.1}); }
  if (s8%2===0) inst('pno', ch[(s8>>1)%3]+12, t, d*3, 0.25);
} };
// c_sorrow — deuil : violoncelle seul, mineur, lent, sur un harmonium à peine audible
const SORROW = [62,0,0,0,0,0,60,0, 58,0,0,0,57,0,0,0, 55,0,0,0,57,0,58,0, 57,0,0,0,0,0,0,0,
                62,0,0,0,65,0,64,0, 62,0,0,0,61,0,0,0, 62,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0];
T.c_sorrow = { bpm:bpmEff(56), verb:0.5, inst:['str','org'], step(st, t, d, s){
  const bar = st>>3, ch = nn([[50,53,57],[43,46,50],[46,50,53],[45,49,52]], bar>>1), m = nn(SORROW, st);
  if (m){ let L = 1; while (L<8 && !nn(SORROW, st+L)) L++; inst('vc', m, t, d*L*0.98, 0.7, {att:0.25, rel:1}); }
  if (st%16===0) for (const n of ch) inst('org', n, t, d*16.5, 0.22, {att:2, rel:2});
} };
// c_map — le carnet, la veille de bataille : piano seul, intime
const MAPMEL = [72,0,0,0,69,0,70,0, 72,0,0,0,0,0,0,0, 74,0,72,0,70,0,69,0, 67,0,0,0,0,0,0,0,
                69,0,0,0,65,0,67,0, 69,0,0,0,70,0,72,0, 70,0,69,0,67,0,0,0, 65,0,0,0,0,0,0,0];
T.c_map = { bpm:bpmEff(76), verb:0.38, inst:['pno'], step(st, t, d, s){
  const bar = st>>3, s8 = st&7, ch = nn([[41,48,57],[38,45,53],[46,53,62],[48,55,64]], bar>>1);
  if (s8===0) inst('pno', ch[0], t, d*8, 0.5); if (s8===2) inst('pno', ch[1], t, d*6, 0.35); if (s8===4) inst('pno', ch[2], t, d*4, 0.32);
  const m = (bar>>3)%2? 0 : nn(MAPMEL, st); if (m) inst('pno', m, t + mHash(st, 2)*0.02, d*4, 0.45);
  if ((bar>>3)%2 && s8===6 && mHash(st, 5) < 0.5) inst('pno', ch[2]+12, t, d*4, 0.25);
} };
// e_dawn — fin « veiller » : l'aube, piano et cordes, majeur suspendu, carillon
T.e_dawn = { bpm:bpmEff(66), verb:0.45, inst:['pno','str','bell'], step(st, t, d, s){
  const bar = st>>3, s8 = st&7, ch = nn([[55,57,62],[48,55,64],[52,55,62],[50,55,57]], bar>>1);
  if (st%16===0){ for (const n of ch) inst('vln', n+12, t, d*16.5, 0.35, {att:2}); inst('vc', ch[0]-12, t, d*16.5, 0.4, {att:1.5}); }
  if (s8%2===0) inst('pno', ch[(st>>1)%3] + 12 + 12*((st>>3)&1), t, d*4, 0.3);
  if (st%32===12) inst('chime', 81, t, 3, 0.3, {pan:0.4});
} };
// e_ash — fin « abattre » : cuivres en sourdine, l'hymne lent jusqu'au bout
T.e_ash = { bpm:bpmEff(58), verb:0.45, inst:['brass','str','drums'], step(st, t, d, s){
  const mn = st%2? 0 : MEL_RED[(st>>1) % MEL_RED.length], ch = CH_RED[(st>>4)%8];
  if (mn){ let L = 2; while (L<8 && !MEL_RED[((st>>1)+L/2) % MEL_RED.length]) L += 2; inst('hrn', mn-12, t, d*L*0.95, 0.35, {att:0.2}); }
  if (st%16===0){ inst('vc', ch[0]-12, t, d*16.5, 0.4, {att:2}); inst('vc', ch[2]-12, t, d*16.5, 0.25, {att:2.5}); }
  if (st%64===0) inst('timp', 0, t, 4, 0.3);
} };
