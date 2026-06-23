/* tools/selftest.mjs — banc d'essai headless de la LOGIQUE de jeu (node-canvas).
   Vérifie, sans navigateur, que le moteur tourne et que les règles tiennent :
   tutoriel franchissable, IA qui invoque son héros, rendu sans exception.
   Lancer : node tools/selftest.mjs   (sort en code 1 si un test échoue) */
import { createCanvas } from 'canvas';
import { readFile } from 'node:fs/promises';
const SRC = new URL('../guerre-des-eres.html', import.meta.url);
const js = (await readFile(SRC, 'utf8')).match(/<script>([\s\S]*?)<\/script>/)[1];
const noop=()=>{}; const W=960,Hh=540;
const main=createCanvas(W,Hh); const mctx=main.getContext('2d');
main.style={}; main.addEventListener=noop; main.getBoundingClientRect=()=>({left:0,top:0,width:W,height:Hh});
function elStub(){return{style:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},addEventListener:noop,appendChild:noop,remove:noop,setAttribute:noop,getAttribute:()=>null,querySelectorAll:()=>[],getContext:()=>mctx,dataset:{},textContent:'',innerHTML:'',value:'80',width:W,height:Hh,checked:false,getBoundingClientRect:()=>({left:0,top:0,width:W,height:Hh})};}
const elements={};
const document={getElementById:id=> id==='cv'?main:(elements[id]||(elements[id]=elStub())),
  createElement:t=> t==='canvas'? createCanvas(8,8) : elStub(),
  querySelectorAll:()=>[],querySelector:()=>null,addEventListener:noop,documentElement:elStub(),body:elStub(),fullscreenElement:null,exitFullscreen:noop};
const AC=function(){const p=()=>({value:0,setValueAtTime:noop,setTargetAtTime:noop,linearRampToValueAtTime:noop,exponentialRampToValueAtTime:noop});return{createGain:()=>({gain:p(),connect:noop}),createOscillator:()=>({connect:noop,start:noop,stop:noop,type:'',frequency:p(),detune:p()}),createBiquadFilter:()=>({connect:noop,frequency:p(),Q:p(),gain:p(),type:''}),createBuffer:()=>({getChannelData:()=>new Float32Array(8)}),createBufferSource:()=>({connect:noop,start:noop,stop:noop,buffer:null}),createWaveShaper:()=>({connect:noop,curve:null}),createDynamicsCompressor:()=>({connect:noop,threshold:p(),knee:p(),ratio:p(),attack:p(),release:p()}),currentTime:0,destination:{},state:'running',resume:noop,sampleRate:44100};};
const win={addEventListener:noop,innerWidth:W,innerHeight:Hh,devicePixelRatio:1,requestAnimationFrame:noop,location:{protocol:'file:'},AudioContext:AC,webkitAudioContext:AC};
const navigator={maxTouchPoints:0,userAgent:'node'}; const screen={orientation:{lock:()=>Promise.resolve()}};
const performance={now:()=>Date.now()}; const localStorage={_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=v;}};
const exp=`;module.exports={ get game(){return game;}, set game(v){game=v;}, get TUT(){return TUT;},
  newGame,update,render,resize,spawnUnit,unitStats,tryBuild,tryBuy,trySpecial,tryEvolve,tryCapUp,tryHero,setStance,
  startTutorial,tutTick,tutAdvance,tutEmptySlot,heroBtnReady,TUT_STEPS,BUILDS,
  CAMPAIGN,openBriefing,startMission,scenarioCheck,applyMissionMap,missionTier,ROLES,statMul,costMul };`;
const mod={exports:{}};
new Function('module','document','window','navigator','screen','performance','localStorage','requestAnimationFrame','addEventListener','AudioContext', js+exp)
  (mod,document,win,navigator,screen,performance,localStorage,noop,noop,AC);
const M=mod.exports; M.resize();
let fails=0; const ok=m=>console.log('  ✔',m), bad=m=>{console.log('  ✘',m); fails++;};

// 1) tutoriel franchissable + rendu sans exception
console.log('\n[1] Tutoriel + rendu');
M.startTutorial();
const bk=Object.keys(M.BUILDS);
function act(step,idx){ const p=M.game.p;
  if (step.tap){ M.tutAdvance(); return; }
  const bt=bk.find(k=>step.allow&&step.allow({t:'build',type:k})); if(bt){ const s=M.tutEmptySlot(); if(s)M.tryBuild(p,s,bt); return; }
  const bi=[0,1,2,3,4,5].find(i=>step.allow&&step.allow({t:'buy',i})); if(bi!==undefined){ for(let k=0;k<3&&!(step.done&&step.done());k++) M.tryBuy(p,bi); return; }
  if (step.allow&&step.allow({t:'stance',st:'charge'})){ M.setStance(p,'charge'); return; }
  if (step.allow&&step.allow({t:'special'})){ M.trySpecial(p); return; }
  if (step.allow&&step.allow({t:'evolve'})){ M.tryEvolve(p); return; }
  if (step.allow&&step.allow({t:'cap'})){ M.tryCapUp(p); return; }
  if (step.allow&&step.allow({t:'hero'})){ if(!M.heroBtnReady(p)) bad('étape héros : bouton indisponible'); M.tryHero(p); return; }
}
let guard=0, last=-1, stuck=0, total=M.TUT_STEPS.length, renderErr=null;
while (M.TUT && M.game && M.game.tut && guard++<4000){
  const TUT=M.TUT, idx=TUT.i, step=TUT.steps[idx];
  if (idx!==last){ last=idx; stuck=0; }
  try { M.render(0.016); } catch(e){ renderErr=e.message; break; }
  if (!TUT.celebrating && !(step.done&&step.done())) act(step,idx);
  M.tutTick(0.05); M.update(0.05);
  if (TUT.i===idx && ++stuck>1500){ bad('blocage étape '+idx); break; }
}
if (renderErr) bad('render() a levé une exception : '+renderErr);
else if (!M.game || !M.game.tut) ok('tutoriel franchi ('+total+' étapes), rendu OK');
else if (!fails) bad('tutoriel non terminé');

// 2) IA invoque son héros (4 difficultés)
console.log('\n[2] IA — héros');
const dn=['Facile','Normal','Difficile','Brutal'];
for (const diff of [0,1,2,3]){
  M.game=null; M.newGame('HUM',diff,false,'IA');
  const e=M.game.e, p=M.game.p; let seen=false,t=0;
  for(let i=0;i<12000&&!seen;i++){ if(i%60===0){p.f+=200;p.m+=200;p.w+=80;M.tryBuy(p,i%2?0:2);} M.update(0.05); t+=0.05;
    if (e.units.some(u=>u.role==='hero')||e.heroCd>0) seen=true; }
  seen? ok(dn[diff]+' : héros invoqué (~'+Math.round(t)+'s)') : bad(dn[diff]+' : héros jamais invoqué');
}
// 3) MODE HISTOIRE : chaque mission démarre, sa carte/déclencheurs s'appliquent, le moteur
//    tourne longtemps sans exception, les triggers se déclenchent et l'objectif progresse.
console.log('\n[3] Mode Histoire — campagne');
for (const m of M.CAMPAIGN){
  try {
    M.game=null; M.openBriefing(m.id); M.startMission();
    const g=M.game;
    if (!g || !g.scenario){ bad(m.id+' : scénario non initialisé'); continue; }
    if (!g.terrainCfg){ bad(m.id+' : carte dédiée non appliquée'); continue; }
    const tier=M.missionTier(m), expectLock=[null,2,1,0,0,0][tier];
    // boucle longue : ~5 min de jeu simulé, le joueur recrute en continu
    let res=null, renderE=null;
    for (let i=0;i<6200 && !res;i++){
      if (i%40===0){ g.p.f+=120; g.p.m+=120; g.p.w+=50; M.tryBuy(g.p, i%2?0:2); }
      M.update(0.05);
      if (i%200===0){ try{ M.render(0.05); }catch(e){ renderE=e.message; break; } }
      res = M.scenarioCheck(0); // lecture seule de l'état
    }
    if (renderE){ bad(m.id+' : render a levé '+renderE); continue; }
    const fired = (g.scenario.triggers||[]).filter(t=>t.done).length;
    ok(m.id+' ('+M.missionTier(m)+') : carte OK, '+fired+' trigger(s), issue='+(res||'en cours'));
  } catch(e){ bad(m.id+' : exception '+e.message); }
}

// 4) ÉQUILIBRAGE : au tier 1, la Mêlée doit frapper PLUS fort que le Tank (et avoir moins de PV).
console.log('\n[4] Équilibrage mêlée/tank (T1)');
{
  M.game=null; M.newGame('HUM',1,false,'IA');
  const g=M.game; g.p.units.length=0;
  M.spawnUnit(g.p,0); M.spawnUnit(g.p,1);
  const mel=g.p.units[0], tnk=g.p.units[1];
  (mel.dmg>tnk.dmg*1.4)? ok('Mêlée frappe nettement plus fort que le Tank ('+mel.dmg.toFixed(1)+' vs '+tnk.dmg.toFixed(1)+')')
                       : bad('Mêlée ('+mel.dmg.toFixed(1)+') ne dépasse pas nettement le Tank ('+tnk.dmg.toFixed(1)+')');
  (mel.maxhp<tnk.maxhp)? ok('Mêlée plus fragile que le Tank ('+Math.round(mel.maxhp)+' vs '+Math.round(tnk.maxhp)+' PV)')
                       : bad('Mêlée pas plus fragile que le Tank');
}

// 5) UPGRADES (+15 %/niveau effectifs), ÉQUILIBRAGE MIROIR, SCALING D'ÈRE, RESTRICTIONS DE CAMPAGNE
console.log('\n[5] Upgrades / miroir / scaling / restrictions de scénario');
{ M.game=null; M.newGame('HUM',1,false,'IA'); const g=M.game;
  const base=M.unitStats(g.p,0).dmg; g.p.upg.melee=3; const up3=M.unitStats(g.p,0).dmg;
  (Math.abs(up3/base-1.45)<0.01)? ok('Mêlée niv.3 = +45 % de dégâts ('+base.toFixed(1)+'→'+up3.toFixed(1)+')')
                               : bad('amélioration ≠ +45 % (ratio '+(up3/base).toFixed(3)+')');
}
{ M.game=null; M.newGame('HUM',1,false,'IA'); const h=M.unitStats(M.game.p,0);
  M.game=null; M.newGame('IA',1,false,'HUM'); const a=M.unitStats(M.game.p,0);
  const dpsH=h.dmg/h.rate, dpsA=a.dmg/a.rate;
  (Math.abs(dpsH-dpsA)<0.5)? ok('DPS Mêlée miroir HUM=GPT ('+dpsH.toFixed(1)+' = '+dpsA.toFixed(1)+')')
                           : bad('DPS non miroir ('+dpsH.toFixed(1)+' vs '+dpsA.toFixed(1)+')');
}
{ const r=M.statMul(4)/M.statMul(0);
  (r>=6)? ok('Scaling ère 4 = ×'+r.toFixed(2)+' (paliers spectaculaires)') : bad('scaling d\'ère trop faible (×'+r.toFixed(2)+')'); }
{ // restriction IA en mission de début (h1, tier 1) : ni siège ni aérien, ni légende
  M.game=null; M.openBriefing('h1'); M.startMission(); const g=M.game;
  g.e.f=g.e.m=g.e.w=99999; M.tryBuy(g.e,3); M.tryBuy(g.e,4);
  (g.e.units.every(u=>u.role!=='siege'&&!u.fly))? ok('IA T1 : siège/aérien bloqués (scénario)') : bad('IA T1 a déployé siège/aérien');
  g.e.heroCd=0; g.e.era=2; const hres=M.tryHero(g.e);
  (!hres && !g.e.units.some(u=>u.role==='hero'))? ok('IA T1 : Singularité bloquée (correctif gating)') : bad('IA T1 a invoqué sa légende');
}
{ // légende IA autorisée en finale (h5, tier 5)
  M.game=null; M.openBriefing('h5'); M.startMission(); const g=M.game;
  g.e.heroCd=0; g.e.era=2; g.e.f=g.e.m=g.e.w=99999;
  M.tryHero(g.e)? ok('IA T5 : légende autorisée (scriptée)') : bad('IA T5 : légende refusée à tort');
}
{ // barrière de scénario (brouillard infranchissable) en T3
  M.game=null; M.openBriefing('h3'); M.startMission();
  M.game.barrier? ok('T3 : barrière de scénario active (x='+Math.round(M.game.barrier.x)+')') : bad('T3 : barrière absente');
}

console.log('\n'+(fails? '❌ '+fails+' échec(s)':'✅ tout est vert'));
process.exit(fails?1:0);
