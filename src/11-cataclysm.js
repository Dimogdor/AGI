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
  explode(cx, gy-6, 1.5, '#ff9a4a');
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
    // éclaboussures qui grésillent au sol (repère monde → écran)
    ctx.shadowBlur=0; ctx.lineWidth=1.2;
    for (let i=0;i<26;i++){ const slot=Math.floor(tt*5+i*0.37), ph=(tt*5+i*0.37)%1;
      const sx=(i*197+slot*331)%W, sy=w2sY(gY(s2wX(sx))), r=2+ph*6;
      ctx.strokeStyle='rgba(180,250,100,'+(0.7*(1-ph)*fade).toFixed(3)+')';
      ctx.beginPath(); ctx.ellipse(sx, sy, r, r*0.3, 0, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx-r*0.5, sy-1); ctx.lineTo(sx-r*0.8, sy-3-ph*5); ctx.moveTo(sx+r*0.5, sy-1); ctx.lineTo(sx+r*0.8, sy-3-ph*5); ctx.stroke(); }
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
    // voile ocre, plus dense au ras du sol, et NUÉES de poussière qui défilent (bouffées cuites)
    const sg=ctx.createLinearGradient(0,0,0,H);
    sg.addColorStop(0,'rgba(186,148,86,'+(0.42*fade)+')'); sg.addColorStop(0.55,'rgba(196,156,92,'+(0.56*fade)+')'); sg.addColorStop(1,'rgba(176,136,80,'+(0.68*fade)+')');
    ctx.fillStyle=sg; ctx.fillRect(0,0,W,H);
    const PF=puffSprites();
    for (let i=0;i<12;i++){ const r=80+(i%4)*45, x=((i*263+tt*(380+(i%5)*70))%(W+2*r))-r, y=H*0.2+((i*137)%(H*0.75));
      ctx.globalAlpha=0.75*fade; ctx.drawImage(PF.dust, x-r, y-r*0.55, r*2, r*1.1); }
    ctx.globalAlpha=1;
    ctx.fillStyle='rgba(222,186,120,'+(0.85*fade)+')';
    for (let i=0;i<200;i++){ const x=((i*53+tt*1300)%(W+40))-20, y=(i*47)%H; ctx.fillRect(x,y,14,1.6); }
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
      // traînée de feu EFFILÉE (dégradé queue transparente → tête incandescente) + rocher
      const dl=Math.hypot(ix-sx0, iy-sy0)||1, ux=(ix-sx0)/dl, uy=(iy-sy0)/dl, nx=-uy, ny=ux, L=110*zoom, hw=8*zoom;
      const tx2=px-ux*L, ty2=py-uy*L, tg=ctx.createLinearGradient(tx2,ty2,px,py);
      tg.addColorStop(0,'rgba(255,90,30,0)'); tg.addColorStop(0.7,'rgba(255,130,50,0.55)'); tg.addColorStop(1,'rgba(255,220,150,0.95)');
      ctx.fillStyle=tg; ctx.beginPath(); ctx.moveTo(tx2,ty2); ctx.lineTo(px+nx*hw,py+ny*hw); ctx.lineTo(px-nx*hw,py-ny*hw); ctx.closePath(); ctx.fill();
      ctx.fillStyle='rgba(255,140,60,0.5)'; ctx.beginPath(); ctx.arc(px,py,13*zoom,0,6.283); ctx.fill();
      ctx.restore(); ctx.save();
      ctx.translate(px,py); ctx.rotate(m.t*5); const rr=6.5*zoom;
      ctx.fillStyle='#3a2a22'; ctx.beginPath();
      for (let j=0;j<7;j++){ const a=j/7*6.283, r2=rr*(0.75+0.25*Math.sin(j*2.7+m.tx)); j? ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2) : ctx.moveTo(r2,0); }
      ctx.closePath(); ctx.fill(); ctx.strokeStyle='rgba(255,170,90,0.95)'; ctx.lineWidth=1.6*zoom; ctx.stroke();
      ctx.restore(); ctx.save(); ctx.globalCompositeOperation='lighter';
    }
    ctx.restore();
  } else if (k==='nuke'){
    const gx=w2sX(game.cataX||WORLD/2), gz=w2sY(GROUND);
    if (tt<0.55){ ctx.fillStyle='rgba(255,250,238,'+(1-tt/0.55)+')'; ctx.fillRect(0,0,W,H); }   // éclair aveuglant
    ctx.fillStyle='rgba(120,44,22,'+(0.16*fade)+')'; ctx.fillRect(0,0,W,H);                     // ciel embrasé
    // CHAMPIGNON ATOMIQUE (v1.8) : nuage cuit (pied qui monte, collerette, chapeau en tore de
    // volutes, jupe de poussière) qui grandit, incandescent par en dessous puis qui refroidit
    const M=mushroomSprite(), gr=clamp(tt/2.4,0,1), ease=1-Math.pow(1-gr,3), s=zoom*(0.3+0.7*ease);
    const vis=clamp((game.cataDur-tt)/1.6,0,1), heat=clamp(1-tt/3.6,0,1);
    ctx.save();
    ctx.globalAlpha=vis; ctx.drawImage(M.cv, gx-M.w/2*s, gz-M.h*s+14*s, M.w*s, M.h*s);
    ctx.globalCompositeOperation='lighter';
    const capY=gz-(M.h-70)*s, stemY=gz-60*s;
    for (const [cy,rad,a] of [[capY+18*s,110*s,0.6],[stemY,70*s,0.75],[gz-6*s,90*s,0.5]]){
      const hg=ctx.createRadialGradient(gx,cy,2,gx,cy,rad);
      hg.addColorStop(0,'rgba(255,190,90,'+(a*heat*vis).toFixed(3)+')'); hg.addColorStop(1,'rgba(255,90,30,0)');
      ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(gx,cy,rad,0,6.283); ctx.fill(); }
    if (tt<0.9){ const fr=(20+tt*120)*zoom, fa=1-tt/0.9;                                      // boule de feu initiale
      const fg=ctx.createRadialGradient(gx,gz-fr*0.5,2,gx,gz-fr*0.5,fr);
      fg.addColorStop(0,'rgba(255,255,240,'+fa+')'); fg.addColorStop(0.5,'rgba(255,200,110,'+(0.8*fa)+')'); fg.addColorStop(1,'rgba(255,120,40,0)');
      ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(gx,gz-fr*0.5,fr,0,6.283); ctx.fill(); }
    // onde de choc + mur de poussière qui court au sol
    const sr=tt*430*zoom; ctx.strokeStyle='rgba(255,214,150,'+clamp(0.7-tt/2.4,0,0.7)+')'; ctx.lineWidth=6;
    ctx.beginPath(); ctx.ellipse(gx,gz,sr,sr*0.4,0,0,6.283); ctx.stroke();
    ctx.restore();
    if (tt<3){ const PF=puffSprites(), da=clamp(1-tt/3,0,1);
      for (const sd of [-1,1]) for (let i=0;i<4;i++){ const r=(26+i*9)*zoom, x=gx+sd*(sr*(0.92-i*0.08));
        ctx.globalAlpha=0.85*da; ctx.drawImage(PF.dust, x-r, gz-r*1.1, r*2, r*1.4); }
      ctx.globalAlpha=1; }
  }
  ctx.globalAlpha=fade; ctx.font='700 16px Arial'; ctx.textAlign='center';
  ctx.fillStyle=c.col; ctx.fillText(c.icon+'  '+cataName(k)+'  '+c.icon, W/2, 92);
  ctx.restore();
}
// nuage en champignon cuit une fois : pied, collerette, chapeau en tore (arrière puis avant),
// jupe de poussière — volutes éclairées par le haut, ombrées dessous
let MUSH = null;
function mushroomSprite(){
  if (MUSH) return MUSH;
  // résolution 1 sans filtre (le flou par volute coûtait ~0,5 s) : l'agrandissement adoucit
  const w=260, h=300, SS=1, cv=document.createElement('canvas'); cv.width=w*SS; cv.height=h*SS;
  const c=cv.getContext('2d'); c.scale(SS,SS);
  const puff=(x,y,r,top,bot)=>{ const g=c.createRadialGradient(x-r*0.3,y-r*0.45,r*0.1,x,y,r); g.addColorStop(0,top); g.addColorStop(1,bot);
    c.fillStyle=g; c.beginPath(); c.arc(x,y,r,0,6.283); c.fill(); };
  for (let i=0;i<9;i++) puff(34+i*24, 282, 22+Math.sin(i*1.7)*6, 'rgb(156,126,100)', 'rgb(92,70,58)');            // jupe
  for (let i=0;i<14;i++) puff(130+Math.sin(i*1.3)*5, 270-i*12.5, 15+i*0.7+Math.sin(i*2.1)*3, 'rgb(200,154,112)', 'rgb(108,78,62)'); // pied
  for (let i=0;i<7;i++){ const a=i/6*Math.PI; puff(130+Math.cos(a)*40, 152+Math.sin(a)*8, 16, 'rgb(190,148,110)', 'rgb(108,80,64)'); } // collerette
  const cap=[]; for (let i=0;i<16;i++){ const a=i/16*6.283; cap.push([130+Math.cos(a)*78, 80+Math.sin(a)*24, 32+Math.sin(i*2.3)*6]); }
  cap.sort((p,q)=>p[1]-q[1]);
  for (const [x,y,r] of cap) puff(x, y, r, 'rgb(226,186,146)', 'rgb(120,88,70)');
  for (let i=0;i<9;i++){ const a=i/9*6.283; puff(130+Math.cos(a)*36, 58+Math.sin(a)*13, 35, 'rgb(238,204,164)', 'rgb(138,102,80)'); }
  puff(130, 50, 40, 'rgb(246,218,180)', 'rgb(150,112,88)');
  MUSH = { cv, w, h };
  return MUSH;
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
  ctx.fillText(fmt('ev_winter_now',{min:Math.ceil((game.winterT||0)/60)}), W/2, 78);
  ctx.restore();
}
