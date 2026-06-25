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
function audioInit(){
  if (AC) { if (AC.state==='suspended') AC.resume(); return; }
  AC = new (window.AudioContext||window.webkitAudioContext)();
  master = AC.createGain(); master.gain.value = SETTINGS.vol;
  const comp = AC.createDynamicsCompressor();
  master.connect(comp); comp.connect(AC.destination);
}
function tone(f, t0, dur, type='square', vol=0.05, slide=0){
  const o=AC.createOscillator(), g=AC.createGain();
  o.type=type; o.frequency.setValueAtTime(f,t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide), t0+dur);
  g.gain.setValueAtTime(vol,t0); g.gain.exponentialRampToValueAtTime(0.0008,t0+dur);
  o.connect(g); g.connect(busOut()); o.start(t0); o.stop(t0+dur+0.02);
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
const MUSIC_TUNE = -3;     // transposition en demi-tons appliquée à TOUTE la musique (− = plus grave)
const MUSIC_TEMPO = 0.85;  // facteur de tempo global (< 1 = plus lent)
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
function stress(){ return (game && !game.over)? clamp(game.t/360 + game.dev*0.5, 0, 1) : 0; }
function musicMode(){
  if (!game) return 'menu';
  if (game.p.trans) return game.p.facKey==='HUM'? 'anthem':'break';
  return 'war';
}
function musicStart(){
  if (MUSIC.started) return; MUSIC.started=true;
  MUSIC.nextT = AC.currentTime+0.1; MUSIC.step=0;
  MUSIC.timer = setInterval(musicSched, 90);
}
function musicSched(){
  if (!AC) return;
  if (!SETTINGS.music || (game&&paused) || audioDuckUntil>AC.currentTime) { MUSIC.nextT = Math.max(MUSIC.nextT, AC.currentTime); return; }
  while (MUSIC.nextT < AC.currentTime + 0.35) {
    const mode = musicMode(), s = stress();
    const bpm = (mode==='menu'? 104 : mode==='anthem'? 116 : mode==='break'? 128 : 138 + 46*s) * MUSIC_TEMPO;
    const stepDur = 60/bpm/2;
    if (mode==='menu') stepMenu(MUSIC.step, MUSIC.nextT, stepDur);
    else if (mode==='anthem') stepAnthem(MUSIC.step, MUSIC.nextT, stepDur);
    else if (mode==='break') stepBreak(MUSIC.step, MUSIC.nextT, stepDur);
    else stepWar(MUSIC.step, MUSIC.nextT, stepDur, s);
    MUSIC.step++; MUSIC.nextT += stepDur;
  }
}
function stepWar(st, t, stepDur, s){
  const bar = Math.floor(st/8), s8 = st%8;
  const chord = (s>0.55? CHORDS_T : CHORDS)[bar%4];
  const intense = game && !game.over && (game.p.units.length+game.e.units.length>8);
  tone(m2f(chord[0]-12), t, stepDur*0.95, 'sawtooth', .045);
  if (intense||s>0.4) tone(m2f(chord[0]), t, stepDur*0.5, 'sawtooth', .025);
  if (s8%2===0) tone(150, t, .12, 'sine', .14, -110);
  if (s>0.6 && s8%2===1) tone(150, t, .08, 'sine', .09, -110);
  if (s8===2||s8===6) noise(t, .12, .09, 1200);
  if (s>0.45 && (s8===3||s8===7)) noise(t, .05, .04, 1500);
  noise(t, .03, intense? .03 : .018, 6000);
  if (s>0.35) noise(t+stepDur/2, .025, .02, 7000);
  if ((intense||s>0.5) && (s8===3||s8===7)) tone(98, t, .14, 'sine', .1, -50);
  if (s>0.7 && s8===0){ tone(55,t,.1,'sine',.12); tone(55,t+stepDur*0.7,.08,'sine',.08); }
  if (s8===0) for (const n of chord){
    tone(m2f(n), t, stepDur*8, 'sawtooth', .018);
    tone(m2f(n)+1.5, t, stepDur*8, 'sawtooth', .014);
    if (s>0.65) tone(m2f(n+1), t, stepDur*8, 'sawtooth', .007*s);
  }
  if (s8===0 && bar%4===0) for (const n of chord) tone(m2f(n-12), t, stepDur*6, 'sawtooth', .04+.02*s);
  const mn = MELODY[st % MELODY.length];
  if (mn){ tone(m2f(mn), t, stepDur*1.8, 'triangle', .05);
    if (intense||s>0.5) tone(m2f(mn+12), t, stepDur*1.2, 'square', .018); }
}
function stepMenu(st, t, stepDur){
  // synthwave morose mais entraînant pour l'écran-titre
  const bar = Math.floor(st/8), s8 = st%8, chord = CHORDS[bar%4];
  if (s8%2===0) tone(140, t, .14, 'sine', .12, -100);          // four on the floor
  if (s8%2===1) noise(t, .03, .025, 7000);                      // hat off-beat
  if (s8===4) noise(t, .12, .06, 1400);                         // clap
  tone(m2f(chord[0]-12), t, stepDur*0.9, 'sawtooth', .04);      // bass
  tone(m2f(chord[(st%3)]+12), t, stepDur*0.8, 'triangle', .03); // arp
  if (s8===0) for (const n of chord){ tone(m2f(n), t, stepDur*8, 'sawtooth', .014);
    tone(m2f(n)+2, t, stepDur*8, 'sawtooth', .011); }
  if (s8===0 && bar%8===4) for (const n of chord) tone(m2f(n+12), t, stepDur*7, 'triangle', .02);
}
function stepAnthem(st, t, stepDur){
  // « L'Armée rouge est la plus forte » : marche militaire, cuivres à l'unisson
  const bar = Math.floor(st/8)%8, s8 = st%8, chord = CH_RED[bar];
  if (s8%2===0) tone(150, t, .12, 'sine', .13, -100);            // grosse caisse de marche
  noise(t, .04, s8%2? .04:.022, 2000);                           // roulement de caisse claire
  if (s8===2||s8===6) noise(t, .12, .09, 1200);
  tone(m2f(chord[0]-12), t, stepDur*0.9, 'sawtooth', .045);      // basse-tuba : pompe 1
  if (s8===4) tone(m2f(chord[2]-12), t, stepDur*0.9, 'sawtooth', .04); // pompe 2
  if (s8===0) for (const n of chord){
    tone(m2f(n), t, stepDur*8, 'sawtooth', .02);
    tone(m2f(n-12), t, stepDur*8, 'sawtooth', .016);
  }
  const mn = MEL_RED[st % MEL_RED.length];
  if (mn){
    tone(m2f(mn), t, stepDur*1.7, 'square', .045);               // cuivres
    tone(m2f(mn), t, stepDur*1.7, 'triangle', .06);              // chœur
    tone(m2f(mn-12), t, stepDur*1.5, 'sawtooth', .022);
  }
  if (s8===0 && bar>=4) for (const n of chord) tone(m2f(n+12), t, stepDur*8, 'triangle', .018); // chœur au refrain
}
function stepBreak(st, t, stepDur){
  // breakbeat orchestral sombre façon club néo-Matrix (motif original, grille 16e)
  const bar = Math.floor(st/8)%4, s8 = st%8, chord = CH_BRK2[bar];
  for (let k=0;k<2;k++){                                          // deux doubles-croches par pas
    const i = s8*2+k, tt = t + k*stepDur/2;
    if (DRUM_BRK.kick[i])  tone(130, tt, .13, 'sine', .15, -95);
    if (DRUM_BRK.snare[i]) noise(tt, .12, (i===4||i===12)? .1 : .05, 1100);
    if (DRUM_BRK.hat[i])   noise(tt, .025, .026, 6800);
  }
  tone(m2f(STR_BRK[st%8]), t, stepDur*0.85, 'sawtooth', .05);     // ostinato de cordes graves
  tone(m2f(STR_BRK[st%8]+12), t, stepDur*0.5, 'sawtooth', .02);
  if (s8===0) for (const n of chord) tone(m2f(n), t, stepDur*8, 'sawtooth', .015);
  const pn = PIANO_BRK[st % PIANO_BRK.length];
  if (pn){ tone(m2f(pn), t, stepDur*2.6, 'triangle', .06);        // piano froid et clairsemé
    tone(m2f(pn+12), t, stepDur*2, 'sine', .03); }
}