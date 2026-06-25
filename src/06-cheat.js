/* ============ MODE TRICHE (DEV) — À RETIRER AVANT LA RELEASE PUBLIQUE ============
   Outil de test PERSONNEL : non documenté en jeu et verrouillé par une séquence
   secrète tapée au clavier (le nom du propriétaire). Une fois déverrouillé, F9
   ouvre/ferme un petit panneau d'actions de test. Aucun effet réseau en ligne. */
const CHEAT = { unlocked:false, open:false, god:false, rects:[] };
const CHEAT_CODE = 'elwadi';              // séquence d'activation secrète (perso)
let _cheatBuf = '';
function cheatFeed(e){
  if (!e.key || e.key.length!==1 || !/[a-z]/i.test(e.key)) return;
  _cheatBuf = (_cheatBuf + e.key.toLowerCase()).slice(-12);
  if (!CHEAT.unlocked && _cheatBuf.endsWith(CHEAT_CODE)){
    CHEAT.unlocked = true; CHEAT.open = true;
    if (game) announce('★ MODE TRICHE — F9 pour le panneau', '#ff5af0');
  }
}
function cheatAction(k){
  if (!game || game.over) return;
  const p=game.p, e=game.e;
  if (k==='res'){ p.f+=10000; p.m+=10000; p.w+=10000; }
  else if (k==='xp'){ p.xp+=2000; }
  else if (k==='evolve'){ p.xp=Math.max(p.xp, (EVOLVE_XP[Math.min(p.era+1,4)]||0)+50); tryEvolve(p); }
  else if (k==='special'){ p.specialCd=0; p.xp=Math.max(p.xp, specialXpCost(p)+20); }
  else if (k==='hero'){ p.heroCd=0; p.f+=4000; p.m+=4000; p.w+=4000; }
  else if (k==='god'){ CHEAT.god=!CHEAT.god; }
  else if (k==='mature'){ for (const s of sideBuildSlots(p)) if (s.b && s.b.age!==undefined) s.b.age=LONGEV_MAX_T; }
  else if (k==='wave'){ for (let i=0;i<5;i++) spawnUnit(e, i%3, false); }
  else if (k==='win'){ e.hp=0; }
  if (typeof sfx==='function') sfx('cap');
}
let intro = -1, introT = 0, pendingStart = null;   // cinématique d'ouverture
const INTRO_SKIP = {x:W-116, y:10, w:104, h:28};
const TREES=[], ROCKS=[];
(function(){
  let seed = 7;
  const rnd = ()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  for (let i=0;i<34;i++) TREES.push({x:120+rnd()*(WORLD-240), s:0.7+rnd()*0.8, ph:rnd()*6.28});
  for (let i=0;i<18;i++) ROCKS.push({x:80+rnd()*(WORLD-160), s:0.5+rnd()*1});
})();