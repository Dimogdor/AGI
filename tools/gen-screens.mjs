/* tools/gen-screens.mjs — capture des visuels du jeu via node-canvas.
   Rend de vraies scènes (intro, bataille) en PNG dans resources/screenshots/.
   Brouillons : pour les stores, des captures sur appareil réel restent
   préférables (police/emoji système). Lancer : node tools/gen-screens.mjs */
import { createCanvas } from 'canvas';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const SRC = new URL('../la-derniere-bataille.html', import.meta.url);
const OUT = new URL('../resources/screenshots/', import.meta.url);
await mkdir(OUT, { recursive: true });

const js = (await readFile(SRC, 'utf8')).match(/<script>([\s\S]*?)<\/script>/)[1];
const noop = () => {};
const W = 1920, Hh = 1080;
const canvas = createCanvas(W, Hh);
canvas.style = {}; canvas.addEventListener = noop;
canvas.getBoundingClientRect = () => ({ left:0, top:0, width:W, height:Hh });

function elStub(){return{style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,appendChild:noop,remove:noop,setAttribute:noop,getAttribute:()=>null,querySelectorAll:()=>[],getContext:()=>canvas.getContext('2d'),dataset:{},textContent:'',innerHTML:'',value:'80',width:W,height:Hh,checked:false,getBoundingClientRect:()=>({left:0,top:0,width:W,height:Hh})};}
const elements={};
const document={getElementById:id=> id==='cv'?canvas:(elements[id]||(elements[id]=elStub())),querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>elStub(),addEventListener:noop,documentElement:elStub(),body:elStub(),fullscreenElement:null,exitFullscreen:noop};
const win={addEventListener:noop,innerWidth:W,innerHeight:Hh,devicePixelRatio:1,requestAnimationFrame:noop,location:{protocol:'file:'},
  get AudioContext(){return AudioContext;}, get webkitAudioContext(){return AudioContext;}};
const navigator={maxTouchPoints:0,userAgent:'node'};
const screen={orientation:{lock:()=>Promise.resolve()}};
const performance={now:()=>0};
const localStorage={_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=v;}};
const AudioContext=function(){const param=()=>({value:0,setValueAtTime:noop,setTargetAtTime:noop,linearRampToValueAtTime:noop,exponentialRampToValueAtTime:noop});return{createGain:()=>({gain:param(),connect:noop}),createOscillator:()=>({connect:noop,start:noop,stop:noop,type:'',frequency:param(),detune:param()}),createBiquadFilter:()=>({connect:noop,frequency:param(),Q:param(),gain:param(),type:''}),createBuffer:()=>({getChannelData:()=>new Float32Array(8)}),createBufferSource:()=>({connect:noop,start:noop,stop:noop,buffer:null}),createWaveShaper:()=>({connect:noop,curve:null,oversample:''}),createDynamicsCompressor:()=>({connect:noop,threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()}),createStereoPanner:()=>({connect:noop,pan:param()}),createConvolver:()=>({connect:noop,buffer:null}),createDelay:()=>({connect:noop,delayTime:param()}),currentTime:0,destination:{},state:'running',resume:noop,sampleRate:44100};};

const exp = `;module.exports={get game(){return game;},set game(v){game=v;},set intro(v){intro=v;},set camX(v){camX=v;},set zoom(v){zoom=v;},newGame,update,render,resize,spawnUnit,tryBuild};`;
const mod={exports:{}};
new Function('module','document','window','navigator','screen','performance','localStorage','requestAnimationFrame','addEventListener','AudioContext', js+exp)
  (mod,document,win,navigator,screen,performance,localStorage,noop,noop,AudioContext);
const M = mod.exports;
M.resize();

const save = async (name) => {
  await writeFile(new URL(name+'.png', OUT), canvas.toBuffer('image/png'));
  console.log('  ✔', name);
};

// --- intro : éveil de l'IA (tableau 2) et résistance (tableau 3) ---
function renderIntro(frame, t){ M.game=null; M.intro=frame;
  // l'intro lit introT interne ; on avance via plusieurs update du temps d'intro
  for (let i=0;i<Math.round(t/0.05);i++) M.render(0.05);
}
renderIntro(1, 1.2); await save('01-intro-ia');
renderIntro(2, 1.0); await save('02-intro-resistance');

// --- scène de bataille ---
M.newGame('HUM', 1, false, 'IA');
const g = M.game;
g.p.era = 2; g.e.era = 2;
g.p.f=g.p.m=g.e.f=g.e.m=9999;
// déploie deux armées qui se rencontrent au centre
const place=(side, ris, x0, dx)=>{ ris.forEach((ri,i)=>{ M.spawnUnit(side, ri, true, x0+i*dx); }); };
place(g.p, [0,0,2,2,3,5,0,2], g.p.x+700, 70);
place(g.e, [0,0,2,2,3,5,0,2], g.e.x-700, -70);
for (const u of g.p.units) u.era = 2;
for (const u of g.e.units) u.era = 2;
for (let i=0;i<140;i++) M.update(0.05);     // ~7 s : les lignes s'engagent
M.camX = 1500; M.zoom = 1;
M.render(0.05); await save('03-bataille');

// --- vue rapprochée, ère avancée ---
g.p.era=3; g.e.era=3; for (const u of g.p.units) u.era=3; for (const u of g.e.units) u.era=3;
for (let i=0;i<40;i++) M.update(0.05);
M.camX = 1600; M.zoom = 1.2;
M.render(0.05); await save('04-ere-avancee');

console.log('✔ resources/screenshots/ généré (brouillons 1920×1080)');
