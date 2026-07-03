/* ---------- CATACLYSMES NATURELS ---------- */
function updateCata(dt){
  const g=game;
  // hiver nucléaire temporaire : se dissipe en 6 min (malus dégressif), puis retour à la normale
  if (g.winter){ g.winterT = (g.winterT||0) - dt;
    if (g.winterT<=0){ g.winter=false; g.winterT=0; announce(tr('ev_winter_end'), '#bfe6ff'); } }
  if (g.cata){
    g.cataT += dt;
    applyCataEffects(dt);
    if (g.cataT>=g.cataDur){
      if (g.cata==='flood'){ for (const s of [g.p,g.e]) for (const u of s.units) u.drownT=0; } // survivants : on annule la noyade
      g.cata=null;
    }
    return;
  }
  g.cataCd -= dt;
  if (g.cataCd>0) return;
  // prochaine échéance : très espacée tant que le monde est sain, resserrée quand il agonise
  g.cataCd = lerp(150, 26, g.dev) + Math.random()*45;
  if (g.dev < 0.10) return;     // monde encore vivable : pas de cataclysme
  triggerCata();
}
function triggerCata(){
  const g=game;
  // Pondération : l'inondation et la frappe nucléaire restent RARES même à monde mort
  // (santé du monde = 0). L'essentiel des cataclysmes vient des fléaux « doux ».
  const pool = [
    ['acid', 32], ['heat', 32], ['sand', 32],
    ['flood', 5],                       // crue : exceptionnelle (était ~25 %)
    ['nuke', g.dev>0.7 ? 3 : 0],        // frappe atomique : très rare et monde très abîmé
    ['meteor', g.dev>0.35 ? 4 : 1],     // pluie de météorites : RARE, un peu moins en fin de monde
  ];
  let total=0; for (const [,w] of pool) total+=w;
  let r=Math.random()*total, key='acid';
  for (const [k,w] of pool){ r-=w; if (r<0){ key=k; break; } }
  startCata(key);
}
function startCata(key){
  const g=game, c=CATAS[key];
  g.cata=key; g.cataT=0; g.cataDur=c.dur;
  g.cataX = WORLD*(0.3+Math.random()*0.4);
  announce(c.icon+'  '+cataName(key)+'  '+c.icon, c.col);
  sfx('boom');
  // effets INSTANTANÉS et radicaux au déclenchement
  if (key==='nuke'){
    g.flash=1.2; g.shake=Math.max(g.shake,24);
    burst(g.cataX, gY(g.cataX)-60, '#fff0a0', 46, 2.4); burst(g.cataX, gY(g.cataX)-130, '#ffd34a', 34, 1.8);
    nukeBlast(g.cataX, 260);                      // cratère localisé — ne rase PLUS toute la carte
  } else if (key==='flood'){
    g.shake=Math.max(g.shake,10);
    // LA CRUE NOIE TOUT CE QUI N'EST PAS VOLANT : les unités au sol commencent à couler
    // (la noyade s'achève en ~1,8 s, voir applyCataEffects). Les volants sont au-dessus de l'eau.
    for (const s of [g.p,g.e]) for (const u of s.units) if (!u.fly){ u.drownT = 0.001; burst(u.x, gY(u.x)-8, '#9fd8ff', 7, 1.3); }
  } else if (key==='sand'){
    g.shake=Math.max(g.shake,8);
    for (const s of [g.p,g.e]) for (const u of s.units) if (u.fly){ u.hp=0; burst(u.x, gY(u.x)-30, '#d9b46a', 6); }
  } else if (key==='meteor'){
    g.shake=Math.max(g.shake,6);
    METEORS.length=0; g.metT=0.9;      // premières chutes après ~1 s d'annonce
  }
}
function cataName(key){ const k='cata_'+key; const s=(typeof t==='function')? t(k):null; return (s&&s!==k)? s : CATAS[key].name; }
function applyCataEffects(dt){
  const g=game, k=g.cata;
  const each=fn=>{ for (const u of g.p.units) fn(u); for (const u of g.e.units) fn(u); };
  if (k==='acid'){                                          // DoT lourd : unités + bâtiments
    each(u=>{ u.hp -= (u.fac==='IA'?22:18)*dt; });
    for (const side of [g.p,g.e]) for (const s of sideBuildSlots(side)) if (s.b && s.b.type!=='site') s.b.hp -= 24*dt;
  } else if (k==='heat'){                                   // DoT lourd + surchauffe + ralentit
    each(u=>{ u.hp -= (u.fac==='IA'?20:16)*dt; u.heat=(u.heat||0)+0.12*dt; if (u.heat>=1){u.heat=0;u.tiredT=3;} });
  } else if (k==='flood'){                                  // noyade : tout ce qui n'est pas volant coule et meurt
    each(u=>{ if (!u.fly){
      u.drownT = (u.drownT||0) + dt;
      u.hp -= u.maxhp * dt / 1.8;                           // mort garantie en ~1,8 s
      if (Math.random() < dt*7){                            // bulles qui remontent
        particles.push({x:u.x+(Math.random()-0.5)*12, y:gY(u.x)-6-Math.random()*16,
          vx:(Math.random()-0.5)*8, vy:-34-Math.random()*22, life:0.5+Math.random()*0.4, t:0,
          color:'rgba(190,228,255,0.9)', r:1+Math.random()*1.8});
      }
    }});
  } else if (k==='sand'){                                   // la tempête continue d'arracher tout volant
    each(u=>{ if (u.fly) u.hp -= 30*dt; });
  } else if (k==='meteor'){                                 // chutes échelonnées sur toute la carte
    g.metT = (g.metT||0) - dt;
    if (g.metT<=0 && g.cataT < g.cataDur-1.2){
      g.metT = 0.55 + Math.random()*0.7;
      METEORS.push({ tx: 120+Math.random()*(WORLD-240), t:0,
                     dur: 0.85+Math.random()*0.35, dx: 150+Math.random()*130 });
    }
    for (let i=METEORS.length-1;i>=0;i--){
      const m=METEORS[i]; m.t+=dt;
      if (m.t>=m.dur){ METEORS.splice(i,1); meteorImpact(m.tx); }
    }
  }
}
// impact de météorite : ONE-SHOT en frappe directe, souffle de zone autour, marque au sol
let METEORS = [];
function meteorImpact(cx){
  const g=game, gy=gY(cx);
  burst(cx, gy-10, '#ff9a4a', qN(18), 1.7); burst(cx, gy-6, '#ffe0b0', qN(8), 1.0);
  addLight(cx, gy-20, '#ff8a3a', 160, 0.5);
  sfxAt('boom', cx);
  if (Math.random()<0.6) addCrater(cx, 24+Math.random()*16);
  g.shake = Math.max(g.shake, 6);
  for (const side of [g.p,g.e]){
    for (const u of side.units){
      const d = Math.abs(u.x-cx);
      if (d < 16){ u.hp = 0; burst(u.x, gY(u.x)-16-(u.fly?u.flyH:0), '#ff6a3a', 6); } // frappe directe : one-shot
      else if (d < 75){ u.hp -= 30 + 60*(1-d/75); u.flash = 0.2; }                    // souffle de zone
    }
    for (const s of sideBuildSlots(side)) if (s.b && Math.abs(s.x-cx)<60) s.b.hp -= 130;
  }
  if (Math.abs(g.p.x-cx)<75) g.p.hp -= 60;
  if (Math.abs(g.e.x-cx)<75) g.e.hp -= 60;
}
// frappe nucléaire (cataclysme) : un cratère LOCALISÉ autour de cx, pas la carte entière.
// (la Bombe H scénarisée, elle, garde razeMap : c'est la chute d'une base.)
function nukeBlast(cx, r){
  const g=game;
  for (const side of [g.p,g.e]){
    for (const u of side.units) if (Math.abs(u.x-cx)<r){ u.hp=0; burst(u.x, gY(u.x)-16, '#fff0a0', 5); }
    for (const s of side.slots) if (s.b && Math.abs(s.x-cx)<r){
      s.b.hp -= s.b.maxhp*0.85; if (s.b.hp<=0){ s.b=null; s.owner=null; } }
  }
  for (const n of g.neut) if (n.b && Math.abs(n.x-cx)<r){ n.b=null; n.owner=null; }
  addLight(cx, gY(cx)-50, '#fff0c0', r*2.4, 0.9);                 // grande lumière d'explosion
  addCrater(cx, r*0.85);                                          // cratère persistant
}
// CRATÈRES PERSISTANTS : empreintes laissées au sol par les explosions lourdes (siège, Bombe H).
function addCrater(x, r){
  if (!game.craters) game.craters=[];
  game.craters.push({x, r});
  if (game.craters.length>40) game.craters.shift();              // borne mémoire
}
// rase TOUTES les unités et constructions de la carte — JAMAIS les bases (ni leur garnison).
function razeMap(){
  const g=game;
  for (const side of [g.p,g.e]){
    for (const u of side.units) burst(u.x, gY(u.x)-16, '#fff0a0', 4);
    side.units.length = 0; side.queue.length = 0;
    for (const s of side.slots) s.b = null;
  }
  for (const n of g.neut){ n.b=null; n.owner=null; }
  // les bases (et leur garde) survivent ; tirs/obus en vol sont effacés
  shots.length = 0; projectiles.length = 0;
}
function drawCata(){
  if (!game || !game.cata) return;
  const k=game.cata, c=CATAS[k], tt=game.cataT;
  const fade=clamp(Math.min(tt, game.cataDur-tt)/1.5, 0, 1);
  ctx.save();
  if (k==='acid'){
    ctx.fillStyle='rgba(120,200,40,0.12)'; ctx.fillRect(0,0,W,H);
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle='rgba(170,240,90,'+(0.6*fade)+')'; ctx.lineWidth=1.6; ctx.shadowColor='#a6f050'; ctx.shadowBlur=4;
    for (let i=0;i<70;i++){ const x=(i*137+tt*260)%W, y=(i*89+tt*640)%H; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-4,y+15); ctx.stroke(); }
    ctx.restore();
  } else if (k==='heat'){
    const g2=ctx.createLinearGradient(0,0,0,H);
    g2.addColorStop(0,'rgba(255,110,20,0.20)'); g2.addColorStop(1,'rgba(255,180,40,0.05)');
    ctx.fillStyle=g2; ctx.fillRect(0,0,W,H);
    // mirage : bandes horizontales qui ondulent
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for (let i=0;i<10;i++){ const y=H*0.4+i*16+Math.sin(tt*3+i)*3; ctx.fillStyle='rgba(255,220,150,'+(0.05*fade)+')'; ctx.fillRect(0,y,W,4); }
    ctx.restore();
  } else if (k==='flood'){
    // crue : nappe réfléchissante qui monte (sous l'altitude des volants)
    const rise=clamp(tt/game.cataDur*1.7,0,1), surfW=lerp(GROUND,388,rise), ly=Math.max(0,w2sY(surfW));
    const grad=ctx.createLinearGradient(0,ly,0,H);
    grad.addColorStop(0,'rgba(95,175,232,0.42)'); grad.addColorStop(1,'rgba(18,68,138,0.62)');
    ctx.fillStyle=grad; ctx.fillRect(0,ly,W,H-ly);
    // caustiques animés
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for(let i=0;i<3;i++){ ctx.fillStyle='rgba(190,228,255,'+(0.10-i*0.025)+')'; const yy=ly+8+i*11;
      for(let x=0;x<=W;x+=24) ctx.fillRect(x+Math.sin(x*0.04+tt*3+i)*6, yy, 12, 2); }
    // écume lumineuse en surface
    ctx.strokeStyle='rgba(205,236,255,'+(0.6*fade)+')'; ctx.lineWidth=2.5; ctx.shadowColor='#bfe6ff'; ctx.shadowBlur=8;
    ctx.beginPath(); for(let x=0;x<=W;x+=10){ const yy=ly+Math.sin(x*0.05+tt*4)*3; x?ctx.lineTo(x,yy):ctx.moveTo(x,yy);} ctx.stroke();
    ctx.restore();
  } else if (k==='sand'){
    ctx.fillStyle='rgba(190,150,80,'+(0.62*fade)+')'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(222,186,120,'+(0.85*fade)+')';
    for (let i=0;i<240;i++){ const x=((i*53+tt*1300)%(W+40))-20, y=(i*47)%H; ctx.fillRect(x,y,14,1.6); }
    // rafales plus claires
    ctx.fillStyle='rgba(245,220,170,'+(0.3*fade)+')';
    for (let i=0;i<40;i++){ const x=((i*131+tt*1900)%(W+60))-30, y=(i*97+30)%H; ctx.fillRect(x,y,26,2.2); }
  } else if (k==='meteor'){
    // CIEL D'ENFER : voile rouge apocalyptique + lueur incandescente à l'horizon
    const g2=ctx.createLinearGradient(0,0,0,H);
    g2.addColorStop(0,'rgba(110,8,4,'+(0.36*fade)+')');
    g2.addColorStop(0.55,'rgba(150,36,12,'+(0.22*fade)+')');
    g2.addColorStop(1,'rgba(255,96,32,'+(0.12*fade)+')');
    ctx.fillStyle=g2; ctx.fillRect(0,0,W,H);
    ctx.save(); ctx.globalCompositeOperation='lighter';
    // braises portées par le vent
    for (let i=0;i<26;i++){ const x=(i*167+tt*40)%W, y=H-((tt*(46+(i%5)*15)+i*83)%H);
      ctx.fillStyle='rgba(255,140,60,'+(0.26*fade)+')'; ctx.fillRect(x,y,2,2); }
    // stries lointaines (pluie de fond, purement cosmétique — visibles aussi côté invité)
    ctx.strokeStyle='rgba(255,150,70,'+(0.20*fade)+')'; ctx.lineWidth=1.6; ctx.lineCap='round';
    for (let i=0;i<7;i++){ const x=((i*233+tt*310)%(W+160))-80, y=(i*127+tt*90)%(H*0.5);
      ctx.beginPath(); ctx.moveTo(x+26,y-38); ctx.lineTo(x,y); ctx.stroke(); }
    // MÉTÉORES actifs : boule incandescente + longue traînée de feu (repère monde → écran)
    for (const m of METEORS){
      const k2=m.t/m.dur, ix=w2sX(m.tx), iy=w2sY(gY(m.tx));
      const sx0=ix+m.dx, sy0=-40;
      const px=lerp(sx0,ix,k2), py=lerp(sy0,iy,k2);
      const tx2=px+(sx0-ix)*0.16, ty2=py+(sy0-iy)*0.16;
      ctx.strokeStyle='rgba(255,120,40,0.35)'; ctx.lineWidth=9;
      ctx.beginPath(); ctx.moveTo(tx2,ty2); ctx.lineTo(px,py); ctx.stroke();
      ctx.strokeStyle='rgba(255,190,100,0.75)'; ctx.lineWidth=3.5;
      ctx.beginPath(); ctx.moveTo(tx2,ty2); ctx.lineTo(px,py); ctx.stroke();
      ctx.fillStyle='rgba(255,120,40,0.65)'; ctx.beginPath(); ctx.arc(px,py,8,0,6.283); ctx.fill();
      ctx.fillStyle='#ffe6c0'; ctx.beginPath(); ctx.arc(px,py,4.2,0,6.283); ctx.fill();
    }
    ctx.restore();
  } else if (k==='nuke'){
    const gx=w2sX(game.cataX||WORLD/2), gz=w2sY(GROUND);
    if (tt<0.55){ ctx.fillStyle='rgba(255,250,238,'+(1-tt/0.55)+')'; ctx.fillRect(0,0,W,H); }   // éclair aveuglant
    ctx.save(); ctx.globalCompositeOperation='lighter';
    // onde de choc
    const sr=tt*430; ctx.strokeStyle='rgba(255,214,150,'+clamp(0.7-tt/2.4,0,0.7)+')'; ctx.lineWidth=6;
    ctx.beginPath(); ctx.ellipse(gx,gz,sr,sr*0.4,0,0,6.283); ctx.stroke();
    // champignon atomique
    const gr=Math.min(tt,3.2)/3.2, capY=gz-150*gr;
    ctx.shadowColor='#ffb060'; ctx.shadowBlur=34;
    const cg=ctx.createLinearGradient(gx,gz,gx,capY); cg.addColorStop(0,'rgba(255,180,80,0.85)'); cg.addColorStop(1,'rgba(255,110,40,0.5)');
    ctx.fillStyle=cg; ctx.beginPath(); ctx.moveTo(gx-20*gr,gz); ctx.quadraticCurveTo(gx-10,capY+34,gx-30*gr,capY);
    ctx.lineTo(gx+30*gr,capY); ctx.quadraticCurveTo(gx+10,capY+34,gx+20*gr,gz); ctx.closePath(); ctx.fill();
    for (let i=0;i<5;i++){ const r=(30+i*11)*gr; ctx.fillStyle='rgba(255,'+(168-i*22)+',80,'+(0.5-i*0.07)+')';
      ctx.beginPath(); ctx.arc(gx+(i-2)*15*gr, capY-r*0.3, r, 0,6.283); ctx.fill(); }
    ctx.fillStyle='rgba(255,250,222,0.92)'; ctx.beginPath(); ctx.arc(gx,capY,18*gr,0,6.283); ctx.fill();
    ctx.restore();
    ctx.fillStyle='rgba(120,44,22,'+(0.14*fade)+')'; ctx.fillRect(0,0,W,H);                     // ciel embrasé
  }
  ctx.globalAlpha=fade; ctx.font='700 16px Arial'; ctx.textAlign='center';
  ctx.fillStyle=c.col; ctx.fillText(c.icon+'  '+cataName(k)+'  '+c.icon, W/2, 92);
  ctx.restore();
}
// hiver nucléaire : monde sombre et enneigé, visibilité réduite (brouillard / vignette)
let snow = null;
function drawWinter(){
  if (!game || !game.winter) return;
  const t = game.t;
  if (!snow){ snow=[]; for (let i=0;i<140;i++) snow.push({x:Math.random()*W, y:Math.random()*H, s:0.5+Math.random()*1.6, d:10+Math.random()*30}); }
  ctx.save();
  const wd = clamp((game.winterT||0)/WINTER_DUR, 0, 1);                 // 1 au déclenchement → 0 à la fin
  // voile froid CLAIR (lisibilité préservée — plus de quasi-noir après la Bombe H)
  ctx.fillStyle='rgba(150,180,220,0.10)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(22,32,54,'+(0.12+0.14*wd)+')'; ctx.fillRect(0,0,W,H);
  // léger halo périphérique (très allégé)
  const fog = ctx.createRadialGradient(W/2,H/2,130, W/2,H/2,W*0.72);
  fog.addColorStop(0,'rgba(18,28,46,0)'); fog.addColorStop(1,'rgba(16,24,42,'+(0.30+0.18*wd)+')');
  ctx.fillStyle=fog; ctx.fillRect(0,0,W,H);
  // neige (additive, lumineuse)
  ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(236,244,255,0.92)';
  for (const f of snow){
    const y=(f.y + t*f.d)%H, x=(f.x + Math.sin(t*0.6+f.y)*12);
    ctx.beginPath(); ctx.arc(x, y, f.s, 0, 6.28); ctx.fill();
  }
  ctx.globalCompositeOperation='source-over';
  ctx.font='700 12px Arial'; ctx.textAlign='center'; ctx.fillStyle='#bfe6ff';
  ctx.fillText('❄ HIVER NUCLÉAIRE — retour à la normale dans '+Math.ceil((game.winterT||0)/60)+' min', W/2, 78);
  ctx.restore();
}
