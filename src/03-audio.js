/* ================= AUDIO ================= */
let AC=null, master=null, MUSIC={started:false, nextT:0, step:0, timer:null};
let sfxBus = null;                       // si défini, tone/noise s'y branchent (spatialisation)
function busOut(){ return sfxBus || master; }
// SON SPATIALISÉ : joue un effet panoramiqué selon la position écran (gauche/droite).
function sfxAt(kind, worldX, p=0){
  if (!AC || !SETTINGS.sfx || !AC.createStereoPanner || typeof camX==='undefined'){ sfx(kind,p); return; }
  const px = (worldX - camX) / (VW()||960);                  // 0 (gauche) → 1 (droite)
  const pan = AC.createStereoPanner(); pan.pan.value = clamp((px-0.5)*1.6, -0.92, 0.92);
  pan.connect(master); sfxBus = pan; sfx(kind,p); sfxBus = null;
}
let audioDuckUntil = 0;                   // silence dramatique (Bombe H) : la musique se tait jusque-là
// RÉPLIQUE DE COMMANDANT : court motif synthétique, distinct par faction, sur événement majeur.
function voice(facKey){
  if (!AC || !SETTINGS.sfx) return; const t0=AC.currentTime;
  if (facKey==='HUM'){           // cuivre montant, héroïque (« Hasta la victoria »)
    tone(330,t0,.15,'sawtooth',.08); tone(392,t0+.13,.15,'sawtooth',.08); tone(523,t0+.27,.24,'square',.07);
  } else {                       // bip froid, calculé (« Calcul optimisé »)
    tone(880,t0,.08,'square',.05,-120); tone(660,t0+.09,.08,'square',.05,-90); tone(523,t0+.19,.18,'triangle',.05);
  }
}
// APPLI EN ARRIÈRE-PLAN : la musique, programmée 0,35 s à l'avance par une minuterie que le
// navigateur ralentit (voire gèle) hors écran, continuait de jouer par à-coups une fois
// l'appli/l'onglet quitté — et de vider la batterie. Le contexte audio est mis en veille.
document.addEventListener('visibilitychange', ()=>{
  if (!AC) return;
  try { if (document.hidden) AC.suspend(); else AC.resume(); } catch(e){}
});
function audioInit(){
  if (AC) { if (AC.state==='suspended') AC.resume(); return; }
  AC = new (window.AudioContext||window.webkitAudioContext)();
  master = AC.createGain(); master.gain.value = SETTINGS.vol;
  const comp = AC.createDynamicsCompressor();
  master.connect(comp); comp.connect(AC.destination);
}
// att = attaque douce (s) : le son GONFLE au lieu de claquer — indispensable aux nappes.
// lp = filtre passe-bas (Hz) : adoucit radicalement les dents de scie (cordes chaudes, pas criardes).
function tone(f, t0, dur, type='square', vol=0.05, slide=0, att=0, lp=0){
  const o=AC.createOscillator(), g=AC.createGain();
  o.type=type; o.frequency.setValueAtTime(f,t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide), t0+dur);
  if (att>0 && att<dur){ g.gain.setValueAtTime(0.0008,t0); g.gain.exponentialRampToValueAtTime(vol, t0+att); }
  else g.gain.setValueAtTime(vol,t0);
  g.gain.exponentialRampToValueAtTime(0.0008,t0+dur);
  let head=o;
  if (lp){ const fl=AC.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=lp; o.connect(fl); head=fl; }
  head.connect(g); g.connect(busOut()); o.start(t0); o.stop(t0+dur+0.02);
}
function noise(t0, dur, vol=0.08, hp=0){
  const len = Math.ceil(AC.sampleRate*dur), buf = AC.createBuffer(1,len,AC.sampleRate);
  const d = buf.getChannelData(0);
  for (let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
  const s=AC.createBufferSource(); s.buffer=buf;
  const g=AC.createGain(); g.gain.value=vol;
  if (hp) { const f=AC.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp; s.connect(f); f.connect(g); }
  else s.connect(g);
  g.connect(busOut()); s.start(t0);
}
const NET_SFX = new Set(['shoot','boom','die','evolve','cap','node','spec','trans','build']);
function sfx(kind, p=0){
  if (NET_SFX.has(kind)) netEv({k:'s',n:kind,p});   // sons du monde renvoyés à l'invité
  if (!AC || !SETTINGS.sfx) return; const t=AC.currentTime;
  if (kind==='buy')   tone(300+p*70, t, .09, 'triangle', .05);
  if (kind==='shoot') tone(620+p*120, t, .05, 'square', .025, -200);
  if (kind==='boom')  { tone(90,t,.3,'sawtooth',.07,-40); noise(t,.25,.06); }
  if (kind==='evolve'){ tone(440,t,.18,'sawtooth',.06); tone(660,t+.12,.22,'sawtooth',.06); tone(880,t+.26,.3,'triangle',.06); }
  if (kind==='die')   tone(160,t,.08,'square',.03,-60);
  if (kind==='build') { tone(220,t,.08,'triangle',.05); tone(330,t+.08,.1,'triangle',.05); }
  if (kind==='cap')   { tone(523,t,.1,'triangle',.06); tone(784,t+.1,.15,'triangle',.06); }
  if (kind==='spec')  { tone(70,t,.6,'sawtooth',.1,-30); noise(t,.5,.1); }
  if (kind==='node')  { tone(392,t,.1,'triangle',.05); tone(587,t+.1,.14,'triangle',.05); }
  if (kind==='sel')   tone(520,t,.04,'triangle',.03);
  if (kind==='trans') { for(let i=0;i<5;i++) tone(330*Math.pow(1.25,i), t+i*.14, .5, 'triangle', .06); }
}
/* --- Musique : 4 modes — menu / guerre (accélère) / hymne humain / break IA --- */
// Réglage global de la bande-son : plus grave (transposition) et un peu plus lente,
// pour une ambiance moins criarde et moins pressante (retour joueur v1.5).
const MUSIC_TUNE = -4;     // transposition en demi-tons appliquée à TOUTE la musique (− = plus grave)
const MUSIC_TEMPO = 0.78;  // facteur de tempo global (< 1 = plus lent) — respiration cinématique
const m2f = m => 440*Math.pow(2,(m-69+MUSIC_TUNE)/12);
const CHORDS  = [[57,60,64],[53,57,60],[48,52,55],[55,59,62]]; // Am F C G
const CHORDS_T= [[57,60,64],[53,57,60],[50,53,57],[52,56,59]]; // Am F Dm E
const MELODY = [69,0,72,74, 76,0,74,72, 69,0,69,72, 77,0,76,74,
                76,0,72,76, 79,0,76,72, 74,0,71,74, 79,0,76,74];
// hymne humain : « L'Armée rouge est la plus forte » (Pokrass, 1920 — domaine public)
// couplet (4 mesures) puis refrain montant (4 mesures), la mineur, marche 2/4
const MEL_RED = [
  64,69,0,69, 71,72,0,72,   71,0,69,0, 68,0,64,0,     // Belaya armiya, chyorny baron...
  64,69,0,69, 71,72,0,72,   74,0,72,0, 71,0,69,0,
  69,0,71,0, 72,0,74,0,     76,0,76,0, 77,76,74,0,    // Tak pust' zhe Krasnaya... (refrain qui monte)
  72,74,76,0, 74,72,71,0,   71,0,68,0, 69,0,0,0 ];
const CH_RED = [[57,60,64],[52,56,59],[57,60,64],[52,56,59],
                [57,60,64],[50,53,57],[57,60,64],[52,56,59]]; // Am E Am E / Am Dm Am E
// break IA : breakbeat orchestral original façon club néo-Matrix (motif original)
const DRUM_BRK = {
  kick: [1,0,0,0, 1,0,0,0, 1,0,0,1, 0,0,0,0],
  snare:[0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,1],
  hat:  [1,1,1,1, 0,1,1,0, 1,1,1,1, 0,1,1,1] };
const PIANO_BRK = [76,0,0,0, 71,0,0,0, 0,0,69,0, 0,0,0,0,
                   64,0,0,0, 0,0,67,0, 0,0,71,0, 0,0,0,0];
const STR_BRK = [40,47,43,47, 40,47,43,47];                    // ostinato Mi mineur implacable
const CH_BRK2 = [[52,56,59],[48,55,60],[57,60,64],[47,54,59]]; // Em C Am B
// tension musicale : monte plus LENTEMENT et plafonne à 0.8 — la bande-son ne vire plus
// à la mitraille anxiogène en fin de partie (retour joueur : « fait mal à la tête »).
function stress(){ return (game && !game.over)? clamp(game.t/600 + game.dev*0.35, 0, 0.8) : 0; }
function musicMode(){
  if (typeof intro!=='undefined' && intro>=0) return 'intro';
  if (!game) return 'menu';
  if (game.p.trans) return game.p.facKey==='HUM'? 'anthem':'break';
  return 'war';
}
function musicStart(){
  ambStart();
  if (MUSIC.started) return; MUSIC.started=true;
  MUSIC.nextT = AC.currentTime+0.1; MUSIC.step=0;
  MUSIC.timer = setInterval(musicSched, 90);
}
function musicSched(){
  if (!AC) return;
  if (!SETTINGS.music || (game&&paused) || audioDuckUntil>AC.currentTime) { MUSIC.nextT = Math.max(MUSIC.nextT, AC.currentTime); return; }
  while (MUSIC.nextT < AC.currentTime + 0.35) {
    const mode = musicMode(), s = stress();
    const bpm = (mode==='intro'? 70 : mode==='menu'? 88 : mode==='anthem'? 104 : mode==='break'? 112 : 100 + 24*s) * MUSIC_TEMPO;
    const stepDur = 60/bpm/2;
    if (mode==='intro') stepIntro(MUSIC.step, MUSIC.nextT, stepDur);
    else if (mode==='menu') stepMenu(MUSIC.step, MUSIC.nextT, stepDur);
    else if (mode==='anthem') stepAnthem(MUSIC.step, MUSIC.nextT, stepDur);
    else if (mode==='break') stepBreak(MUSIC.step, MUSIC.nextT, stepDur);
    else stepWar(MUSIC.step, MUSIC.nextT, stepDur, s);
    MUSIC.step++; MUSIC.nextT += stepDur;
  }
}
// GUERRE v2 — orchestral cinématique (façon Two Steps From Hell / BO de Battlefield) :
// nappes de cordes chaudes filtrées à attaque douce, taiko profond sur les temps forts
// (fini la grosse caisse toutes les doubles-croches), cor ample qui respire, chœur qui
// gonfle avec la tension. Moins de couches, plus graves, plus lentes → zéro agression.
function stepWar(st, t, stepDur, s){
  const bar = Math.floor(st/8), s8 = st%8;
  const chord = (s>0.6? CHORDS_T : CHORDS)[bar%4];
  // PERCUSSIONS : taiko ample sur le 1 (et le 5 quand la bataille chauffe)
  if (s8===0){ tone(70, t, .5, 'sine', .15, -26); noise(t, .16, .03, 320); }
  if (s8===4 && s>0.25) tone(88, t, .38, 'sine', .11, -30);
  if (s>0.5 && s8===6) noise(t, .07, .028, 2200);            // caisse claire lointaine, rare
  noise(t, .018, .006+.007*s, 7400);                          // souffle d'air discret
  // NAPPE DE CORDES (cœur du morceau) : deux voix légèrement désaccordées, filtrées
  if (s8===0) for (const n of chord){
    tone(m2f(n), t, stepDur*8.4, 'sawtooth', .020, 0, stepDur*1.2, 1100);
    tone(m2f(n)+1.2, t, stepDur*8.4, 'sawtooth', .014, 0, stepDur*1.6, 900);
  }
  // BASSE ronde tenue + violoncelles quand la tension monte
  if (s8===0){
    tone(m2f(chord[0]-24), t, stepDur*8, 'triangle', .05, 0, stepDur*0.5);
    if (s>0.4) tone(m2f(chord[0]-12), t, stepDur*8, 'sawtooth', .015, 0, stepDur, 700);
  }
  // CHŒUR épique : octave supérieure qui GONFLE, une mesure sur deux, selon la tension
  if (s8===0 && bar%2===1 && s>0.3)
    for (const n of chord) tone(m2f(n+12), t, stepDur*8, 'triangle', .013+.012*s, 0, stepDur*3);
  // COR : la mélodie respire (une note sur deux), grave et ample
  const mn = MELODY[st % MELODY.length];
  if (mn && s8%2===0){
    tone(m2f(mn-12), t, stepDur*2.6, 'triangle', .045, 0, stepDur*0.4, 1700);
    tone(m2f(mn), t, stepDur*2.2, 'sine', .026, 0, stepDur*0.5);
  }
}
// INTRO — partition dédiée, une humeur par chapitre : mélancolie (le travail s'éteint),
// tension (la soif des machines), froid (la corporation), ténèbres (l'éveil), menace
// dissonante (le monde optimisé), espoir (la résistance), puis l'envolée du carton-titre.
// Nappes lentes, pouls grave façon battement de cœur, piano clairsemé — aucune batterie.
const CH_INTRO = [
  [[50,53,57],[46,50,53],[53,57,60],[48,52,55]],   // I   Rém Sib Fa Do
  [[52,55,59],[48,52,55],[45,48,52],[47,51,54]],   // II  Mim Do Lam Si
  [[57,60,64],[53,57,60],[48,52,55],[55,59,62]],   // III Lam Fa Do Sol
  [[48,51,55],[44,48,51],[41,44,48],[43,47,50]],   // IV  Dom Lab Fam Sol
  [[46,49,53],[42,46,49],[39,42,46],[41,45,48]],   // V   Sibm Solb Mibm Fa
  [[53,57,60],[48,52,55],[55,59,62],[57,60,64]],   // VI  Fa Do Sol Lam (la lumière revient)
  [[45,52,57,60],[41,48,53,57],[43,50,55,59],[40,47,52,56]] ];   // titre
function stepIntro(st, t, stepDur){
  const sc = clamp(typeof intro!=='undefined'? intro : 0, 0, CH_INTRO.length-1);
  const bar = Math.floor(st/8), s8 = st%8, chord = CH_INTRO[sc][bar%4];
  if (s8===0) for (const n of chord){                                     // nappe de cordes
    tone(m2f(n), t, stepDur*8.6, 'sawtooth', .014, 0, stepDur*2.2, sc===4? 1300 : 900);
    tone(m2f(n)+1.3, t, stepDur*8.6, 'sawtooth', .010, 0, stepDur*2.8, 760);
  }
  if (s8===0) tone(m2f(chord[0]-24), t, stepDur*8, 'sine', .07, 0, stepDur);   // sous-basse
  if (sc>=2 && sc<=4 && (s8===0 || s8===1)) tone(58, t, .32, 'sine', s8? .06 : .09, -18);   // pouls
  if (sc<6 && (s8===2 || s8===5 || (sc===5 && s8===7))){                  // piano clairsemé
    const n = chord[(bar+s8)%chord.length]+12; tone(m2f(n), t, stepDur*4, 'triangle', .032); tone(m2f(n+12), t, stepDur*3, 'sine', .012); }
  if (sc===4 && s8===4) tone(m2f(chord[2]+13), t, stepDur*4, 'sine', .010, 0, stepDur);   // dissonance (seconde mineure)
  if (sc===3 && s8%2===1) noise(t, .02, .004, 6800);                     // grésillement numérique
  if (sc===6){
    if (s8===0){ tone(55, t, 1.2, 'sine', .14, -14); noise(t, .6, .03, 200); }   // timbale
    if (s8===0) for (const n of chord) tone(m2f(n+12), t, stepDur*8, 'triangle', .016, 0, stepDur*3);   // chœur
  }
}
function stepMenu(st, t, stepDur){
  // écran-titre v2 : ambient cinématique posé — pulsation sourde lente, nappes qui
  // s'ouvrent, arpège doux ; plus de « four on the floor » criard
  const bar = Math.floor(st/8), s8 = st%8, chord = CHORDS[bar%4];
  if (s8===0) tone(66, t, .5, 'sine', .10, -22);                        // pulsation profonde
  if (s8===4) noise(t, .10, .022, 900);                                 // frappe feutrée
  if (s8%2===1) noise(t, .018, .008, 7200);                             // tic très discret
  tone(m2f(chord[0]-12), t, stepDur*1.8, 'triangle', .036);             // basse ronde
  if (s8%2===0) tone(m2f(chord[((st/2)|0)%3]+12), t, stepDur*1.5, 'sine', .020); // arpège doux
  if (s8===0) for (const n of chord){
    tone(m2f(n), t, stepDur*8.4, 'sawtooth', .012, 0, stepDur*2, 950);
    tone(m2f(n)+1.5, t, stepDur*8.4, 'sawtooth', .009, 0, stepDur*2.6, 780);
  }
  if (s8===0 && bar%8>=6) for (const n of chord) tone(m2f(n+12), t, stepDur*7, 'triangle', .014, 0, stepDur*2);
}
function stepAnthem(st, t, stepDur){
  // « L'Armée rouge est la plus forte » : marche militaire, cuivres à l'unisson
  const bar = Math.floor(st/8)%8, s8 = st%8, chord = CH_RED[bar];
  if (s8%2===0) tone(120, t, .16, 'sine', .10, -70);             // grosse caisse de marche (assouplie)
  if (s8%2) noise(t, .035, .018, 2000);                          // roulement discret
  if (s8===2||s8===6) noise(t, .10, .05, 1100);
  tone(m2f(chord[0]-12), t, stepDur*0.9, 'sawtooth', .04, 0, 0, 800);        // basse-tuba : pompe 1
  if (s8===4) tone(m2f(chord[2]-12), t, stepDur*0.9, 'sawtooth', .035, 0, 0, 800); // pompe 2
  if (s8===0) for (const n of chord){
    tone(m2f(n), t, stepDur*8, 'sawtooth', .016, 0, stepDur, 1100);
    tone(m2f(n-12), t, stepDur*8, 'sawtooth', .013, 0, stepDur, 900);
  }
  const mn = MEL_RED[st % MEL_RED.length];
  if (mn){
    tone(m2f(mn), t, stepDur*1.7, 'sawtooth', .028, 0, 0, 1900);  // cuivres chauds (plus de square criard)
    tone(m2f(mn), t, stepDur*1.7, 'triangle', .05);               // chœur
    tone(m2f(mn-12), t, stepDur*1.5, 'sawtooth', .016, 0, 0, 1000);
  }
  if (s8===0 && bar>=4) for (const n of chord) tone(m2f(n+12), t, stepDur*8, 'triangle', .015, 0, stepDur*2); // chœur au refrain
}
function stepBreak(st, t, stepDur){
  // breakbeat orchestral sombre façon club néo-Matrix (motif original, grille 16e)
  const bar = Math.floor(st/8)%4, s8 = st%8, chord = CH_BRK2[bar];
  for (let k=0;k<2;k++){                                          // deux doubles-croches par pas
    const i = s8*2+k, tt = t + k*stepDur/2;
    if (DRUM_BRK.kick[i])  tone(120, tt, .14, 'sine', .11, -80);
    if (DRUM_BRK.snare[i]) noise(tt, .10, (i===4||i===12)? .06 : .03, 1000);
    if (DRUM_BRK.hat[i])   noise(tt, .02, .014, 6600);
  }
  tone(m2f(STR_BRK[st%8]), t, stepDur*0.85, 'sawtooth', .035, 0, 0, 950);  // ostinato de cordes graves adouci
  tone(m2f(STR_BRK[st%8]+12), t, stepDur*0.5, 'sawtooth', .014, 0, 0, 1300);
  if (s8===0) for (const n of chord) tone(m2f(n), t, stepDur*8, 'sawtooth', .012, 0, stepDur*1.5, 1000);
  const pn = PIANO_BRK[st % PIANO_BRK.length];
  if (pn){ tone(m2f(pn), t, stepDur*2.6, 'triangle', .06);        // piano froid et clairsemé
    tone(m2f(pn+12), t, stepDur*2, 'sine', .03); }
}
/* --- PAYSAGE SONORE D'AMBIANCE (en partie) : le monde s'entend ---
   vent qui forcit à mesure que le monde meurt, oiseaux tant qu'il est sain, pluie (pluie fertile,
   pluie d'acide, crue), crépitements de feu (canicule, frappe, hiver nucléaire), grondement
   lointain quand la bataille s'intensifie, battement de cœur quand votre base est en danger.
   Deux sources de bruit en boucle (coût quasi nul) + quelques tons ponctuels ; suit le réglage
   « Effets sonores » et le volume ; se tait en pause, au menu et à la fin. */
const AMBS = { on:false, wind:null, rain:null, windF:null, timer:null, beatT:0, birdT:2, crackT:0, rumbleT:6 };
function ambLoop(hp, bp){
  const len = AC.sampleRate*2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  let b = 0; for (let i=0;i<len;i++){ const w = Math.random()*2-1; b = b*0.96 + w*0.04; d[i] = hp? w : b*6; }   // bruit blanc / brun
  const src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = AC.createBiquadFilter(); f.type = bp? 'bandpass' : 'highpass'; f.frequency.value = bp? 420 : 1600; if (bp) f.Q.value = 0.7;
  const g = AC.createGain(); g.gain.value = 0;
  src.connect(f); f.connect(g); g.connect(master); src.start();
  return { g, f };
}
function ambStart(){
  if (AMBS.on || !AC) return; AMBS.on = true;
  AMBS.wind = ambLoop(false, true); AMBS.rain = ambLoop(true, false);
  AMBS.timer = setInterval(ambTick, 250);
}
function ambTick(){
  if (!AC) return;
  const live = game && !game.over && !paused && intro<0 && SETTINGS.sfx && AC.state==='running';
  const t = AC.currentTime, dev = live? (game.dev||0) : 0;
  const rainy = live && (game.boon==='rain' || game.cata==='acid' || game.cata==='flood');
  AMBS.wind.g.gain.setTargetAtTime(live? 0.010 + 0.05*dev + (game.cata==='sand'? 0.05 : 0) : 0, t, 0.8);
  AMBS.wind.f.frequency.setTargetAtTime(330 + 260*Math.sin(t*0.13) + 300*dev, t, 1.5);   // rafales
  AMBS.rain.g.gain.setTargetAtTime(rainy? 0.035 : 0, t, 0.6);
  if (!live) return;
  const dt = 0.25;
  // oiseaux : gazouillis rares tant que le monde est sain (et pas en plein cataclysme)
  if ((AMBS.birdT -= dt) <= 0){ AMBS.birdT = 3 + Math.random()*7;
    if (dev < 0.35 && !game.cata && Math.random() < 1 - dev*2.2){ const f0 = 2300 + Math.random()*1500, n = 2 + (Math.random()*3|0);
      for (let i=0;i<n;i++) tone(f0*(1+0.06*i), t+i*0.09, 0.07, 'sine', 0.006, 500+Math.random()*400); } }
  // feu : crépitements (canicule, frappe nucléaire, hiver nucléaire, monde agonisant)
  const fiery = game.cata==='heat' || game.cata==='nuke' || game.winter || dev > 0.75;
  if (fiery && (AMBS.crackT -= dt) <= 0){ AMBS.crackT = 0.15 + Math.random()*0.5;
    for (let i=0;i<2;i++) noise(t+Math.random()*0.2, 0.012, 0.012, 2500); }
  // grondement lointain (artillerie hors champ) quand la bataille dure
  if ((AMBS.rumbleT -= dt) <= 0){ AMBS.rumbleT = 7 + Math.random()*10;
    if (stress() > 0.3){ tone(48+Math.random()*10, t, 1.3, 'sine', 0.035, -12); noise(t, 0.9, 0.012, 120); } }
  // battement de cœur : votre base sous 30 %
  const p = game.p, low = p.maxhp>0 && p.hp>0 && p.hp/p.maxhp < 0.30 && !game.tut;
  if (low && (AMBS.beatT -= dt) <= 0){ AMBS.beatT = 1.05;
    tone(62, t, 0.16, 'sine', 0.10, -16); tone(56, t+0.2, 0.18, 'sine', 0.08, -14); }
}
