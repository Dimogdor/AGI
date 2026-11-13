/* Joueurs scriptés partagés par les bancs d'essai (issus de l'audit d'équilibrage v1.14), injectés dans la page.
   __competent(st, o) : économie d'abord, armée selon un mélange cible, héros, ultime, améliorations ; se regroupe puis charge. */
const __armyN = s => s.units.filter(u=>u.role!=='gremlin'&&u.role!=='support').length;
const __cnt = (s, key) => s.units.filter(u=>u.role===key).length + s.queue.filter(q=>ROLES[q].key===key).length;
function __buyMix(p, mix, maxBuys, reserve, anyOk){
  let bought = 0;
  for (let k=0;k<maxBuys;k++){
    if (unitTotal(p)+p.queue.length >= p.cap) break;
    const tot = Math.max(1, p.units.filter(u=>u.role!=='gremlin').length + p.queue.length);
    const wsum = mix.reduce((a,b)=>a+b,0);
    const okPay = i => { const c = unitCost(p,i); if (!canPay(p,c)) return false;
      if (reserve){ for (const r in c){ if (r==='m'&&p.trans) continue; if (p[r]-c[r] < (reserve[r]||0)) return false; } } return true; };
    // wanted role = largest deficit vs target mix (a competent player WAITS for the unit he wants)
    let best=-1, bd=-1e9; const cand=[];
    for (let i=0;i<6;i++){
      if (!mix[i]) continue;
      if (ROLES[i].key==='support' && __cnt(p,'support') >= 1+Math.min(2,p.upg.support||0)) continue;
      const d = mix[i]/wsum - __cnt(p,ROLES[i].key)/tot; cand.push([d,i]);
      if (d>bd){ bd=d; best=i; }
    }
    if (best<0) break;
    let pick = -1;
    if (p.cd[best]<=0 && okPay(best)) pick = best;
    else if (anyOk || p.cd[best]>0){ cand.sort((a,b)=>b[0]-a[0]); for (const [d,i] of cand) if (i!==best && p.cd[i]<=0 && okPay(i) && (anyOk || d>-0.02)){ pick=i; break; } }
    if (pick<0) break;
    if (tryBuy(p,pick)) bought++; else break;
  }
  return bought;
}
function __competent(st, o){
  const p=game.p, e=game.e;
  const mix = o.mix || [3,2,4,1,2,1];
  const pushN = o.pushN || 10;
  if (p.lastReady && !p.lastUsed && e.units.some(u=>Math.abs(u.x-p.x)<600)) trySpecial(p);
  tryEvolve(p);
  p.formation = true;
  const threatened = e.units.some(u=>u.x-p.x<750);
  // --- economy first ---
  const ord=['farmF','farmM','well']; let ecoDone=true;
  for (let i=0;i<3;i++){ const s=p.slots[i]; if (!s.b){ tryBuild(p,s,ord[i]); if (!s.b) ecoDone=false; } }
  if (ecoDone){
    const n0=game.neut[0], n1=game.neut[1];
    if (!n0.b) tryBuild(p,n0,'turret');
    if (!n1.b) tryBuild(p,n1,'wall');
  }
  const N = __armyN(p);
  // --- hero ---
  const heroAvail = p.heroCd<=0 && !p.units.some(u=>u.role==='hero');
  const saving = !o.noHero && heroAvail && game.t>240 && N>=pushN*0.6 && !threatened;
  if (!o.noHero && heroAvail && canPay(p,HERO_COST) && N>=4){ if (tryHero(p)) { st.mode='push'; setStance(p,'charge'); } }
  // --- army ---
  if (ecoDone || threatened || game.t>40) __buyMix(p, mix, 2, saving? HERO_COST : null, threatened || N<4);
  // --- ultimate : >=4 enemies in range of the front ---
  let front = p.x; for (const u of p.units) if (u.x>front) front=u.x;
  let nNear=0; for (const u of e.units) if (Math.abs(u.x-front)<330) nNear++;
  if (nNear>=4 && !(p.lastReady&&!p.lastUsed)) trySpecial(p);
  // --- upgrades ---
  if (ecoDone && !saving){
    if (unitTotal(p)>=p.cap-3) tryCapUp(p);
    if (p.m>450 && p.f>250 && N>=5){
      let bi=-1, bc=-1; for (let i=0;i<6;i++){ if (!mix[i]||(p.upg[ROLES[i].key]||0)>=3) continue; const c=__cnt(p,ROLES[i].key); if (c>bc){bc=c;bi=i;} }
      if (bi>=0) tryUpgRole(p,bi);
    }
    for (const s of p.slots) if (s.b && s.b.type!=='site' && (s.b.lvl||1)<3){
      const c=upgBuildCost(s); let ok=true; for (const r in c) if (p[r] < c[r]*1.4+80) ok=false;
      if (ok){ tryUpgBuild(p,s); break; }
    }
    if (p.f>800 && p.m>800) tryFortify(p);
  }
  if (p.hp < p.maxhp*0.6) tryRepairBase(p);
  // --- stance : hold until army >= N then charge ---
  if (st.mode===undefined){ st.mode='gather'; setStance(p,'hold'); }
  if (st.mode==='gather'){
    if (N>=pushN || p.heroAlive){ st.mode='push'; setStance(p,'charge'); }
    else if (p.stance==='retreat' && !p.units.some(u=>u.x-p.x>320)) setStance(p,'hold');
  } else if (N < Math.max(2,pushN/3) && !p.heroAlive){ st.mode='gather'; setStance(p,'retreat'); }
}
