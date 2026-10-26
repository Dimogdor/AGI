/* ================= BOUCLE & RENDU ================= */
function render(dt){
  if (!game){ if (intro>=0){ drawIntro(dt); } else drawMenuScene(dt); return; }
  ctx.save();
  // SECOUSSE : appliquée UNIQUEMENT au monde, JAMAIS au HUD ni aux overlays — sinon les
  // boutons tremblent hors de leur zone cliquable. Posée dans la sauvegarde du monde, restaurée avant le HUD.
  // ---- monde (zoomé, ancré en bas) ----
  ctx.save();
  if (game.shake>0.3 && SETTINGS.shake) ctx.translate((Math.random()-0.5)*game.shake,(Math.random()-0.5)*game.shake);
  ctx.translate(0, zTY());
  ctx.scale(zoom, zoom);
  drawBG();
  SLOT_LABELS.length = 0;                    // étiquettes de socles : remises à zéro chaque frame
  for (const n of game.nodes) drawNode(n);
  for (const s of game.p.slots) drawSlot(s, game.p, false);
  for (const s of game.e.slots) drawSlot(s, game.e, false);
  for (const n of game.neut) drawSlot(n, null, true);
  drawBase(game.p); drawBase(game.e);
  for (const u of game.e.units) drawUnit(u);
  for (const u of game.p.units) drawUnit(u);
  if (game.rally) drawRally(game.rally);                     // fanion ⚑ d'ordre de position
  if (game.tut && game.tutBarrier!=null) drawTutBarrier();   // barrière d'énergie du tutoriel
  if (shots.length){ ctx.lineCap='round';
    if (qFx()){ ctx.save(); ctx.globalCompositeOperation='lighter';   // halo additif (sans shadowBlur — coûteux)
      for (const s of shots){ ctx.globalAlpha=(1-s.t/s.dur)*0.4; ctx.strokeStyle=FACTIONS[s.fac].eraCols[s.era]; ctx.lineWidth=5;
        ctx.beginPath(); ctx.moveTo(s.x-camX,s.y); ctx.lineTo(s.tx-camX,s.ty); ctx.stroke(); }
      ctx.restore(); }
    for (const s of shots){ ctx.globalAlpha=1-s.t/s.dur; ctx.strokeStyle=FACTIONS[s.fac].eraCols[s.era]; ctx.lineWidth=2.2;
      ctx.beginPath(); ctx.moveTo(s.x-camX,s.y); ctx.lineTo(s.tx-camX,s.ty); ctx.stroke(); }
    ctx.globalAlpha=1;
  }
  // OBUS (v1.8) : vrai projectile sombre orienté selon sa trajectoire, ogive incandescente de
  // la couleur de l'ère, traînée de fumée qui s'étire derrière lui (au lieu d'un point lumineux)
  const projGlow = qFx();
  for (const pr of projectiles){
    const k = pr.t/pr.dur;
    const ox = pr.ox||0, oy = pr.oy!=null? pr.oy : -26;   // départ à la bouche du tube, arrivée au sol
    const wx2 = lerp(pr.sx+ox,pr.tx,k), px = wx2-camX, py = gY(wx2) + oy + (-26-oy)*k - Math.sin(k*Math.PI)*90;
    const col = FACTIONS[pr.fac].eraCols[pr.era];
    const pwx = pr._wx!=null? pr._wx : wx2-(pr.tx-pr.sx)*0.01, pwy = pr._wy!=null? pr._wy : py;
    const ang = Math.atan2(py-pwy, wx2-pwx);
    // bouffées de fumée laissées en vol (seulement si l'obus a AVANCÉ : rien ne s'accumule en pause)
    if (projGlow && pr._wx!=null && pr._wx!==wx2 && particles.length<500 && Math.random()<0.55)
      particles.push({k:'m', x:wx2, y:py, vx:(Math.random()-0.5)*6, vy:-6, g:-2, dr:1, life:0.55+Math.random()*0.3, t:0, r:2.4+Math.random()*1.6});
    pr._wx = wx2; pr._wy = py;
    ctx.save(); ctx.translate(px,py); ctx.rotate(ang);
    ctx.fillStyle='#2c2a28'; ctx.beginPath(); ctx.ellipse(0,0,5.4,2.7,0,0,6.283); ctx.fill();
    ctx.fillStyle='#5a5652'; ctx.fillRect(-5.4,-0.8,3,1.6);
    ctx.fillStyle=col; ctx.beginPath(); ctx.ellipse(3.6,0,2.2,1.9,0,0,6.283); ctx.fill();
    ctx.restore();
    if (projGlow){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=rgbaC(col,0.3);
      ctx.beginPath(); ctx.arc(px+Math.cos(ang)*3.6, py+Math.sin(ang)*3.6, 6, 0, 6.28); ctx.fill(); ctx.restore(); }
  }
  // RAGDOLLS DE MORT (par rôle) : bascule au sol · chute en vrille (volants) · effondrement (tanks)
  for (const d of deaths){
    const x=d.x-camX; if (x<-60||x>VW()+60) continue;
    // le VRAI sprite de l'unité bascule (pivot aux pieds) puis s'efface, au lieu d'un bâtonnet coloré
    const gy=gY(d.x), k=d.t/d.life; ctx.save(); ctx.globalAlpha=Math.max(0,1-k*k);
    const e=Math.min(1,k*1.7), fall=e*e*(3-2*e);
    if (d.fly){ const s=1.5*(1-k*0.25); ctx.translate(x, gy-d.flyH*(1-k*k)-6); ctx.rotate(k*6*d.side); ctx.scale(d.side*s,s);
      ctx.drawImage(sprite('AIR'+d.fac+d.era+(d.trans?'T':''),64,44,()=>airSprite(d.fac,d.era,d.trans)),-32,-22,64,44); }
    else if (d.role==='gremlin'){ ctx.translate(x, gy-2); ctx.rotate(k*1.5*d.side); ctx.fillStyle=FACTIONS[d.fac].eraCols[d.era]; ctx.fillRect(-7,-12,14,12); }
    else if (d.role==='hero'){ ctx.translate(x-d.side*fall*8, gy); ctx.rotate(-d.side*fall*1.4); ctx.scale(d.side,1);
      ctx.drawImage(sprite('HERO'+d.fac,HERO_SW,100,()=>heroSprite(d.fac)),-HERO_SW/2,-92,HERO_SW,100); }
    else { const kind=d.fac==='HUM'?'hum':'bot';
      const spr=sprite('S'+kind+d.role+d.era+(d.trans?'T':''),USP.W,USP.H,()=>drawUnitSprite(kind,d.fac,d.role,d.era,d.trans));
      ctx.translate(x-d.side*fall*6, gy);
      if (d.role==='tank'){ ctx.rotate(-d.side*fall*0.35); ctx.scale(d.side, 1-0.5*fall); }   // les lourds s'affaissent
      else { ctx.rotate(-d.side*fall*1.45); ctx.scale(d.side,1); }
      ctx.drawImage(spr,-USP.cx,-USP.foot,USP.W,USP.H); }
    ctx.restore(); ctx.globalAlpha=1;
  }
  // PARTICULES (v1.8) : passe normale (fumée, poussière, débris, onde de choc, points), puis
  // passe additive (boules de feu, étincelles) — deux changements d'état seulement par frame
  const PF = puffSprites(), pvw = VW();
  for (const pt of particles){
    const x=pt.x-camX; if (x<-90||x>pvw+90) continue;
    const k=pt.t/pt.life;
    if (!pt.k){ ctx.globalAlpha=1-k; ctx.fillStyle=pt.color; ctx.beginPath(); ctx.arc(x,pt.y,pt.r,0,6.28); ctx.fill(); }
    else if (pt.k==='m' || pt.k==='u'){ const r=pt.r*(1+k*(pt.k==='m'? 2.2 : 1.4));
      ctx.globalAlpha=(pt.k==='m'? 0.85 : 0.7)*(1-k)*Math.min(1,k*8); ctx.drawImage(pt.k==='m'? PF.smoke : PF.dust, x-r, pt.y-r, r*2, r*2); }
    else if (pt.k==='d'){ ctx.globalAlpha=Math.min(1,(1-k)*3); ctx.fillStyle=pt.color;
      ctx.save(); ctx.translate(x,pt.y); ctx.rotate(pt.rot); ctx.fillRect(-pt.r,-pt.r*0.7,pt.r*2,pt.r*1.4); ctx.restore(); }
    else if (pt.k==='r'){ const rr=pt.r*(0.25+k); ctx.globalAlpha=0.5*(1-k); ctx.strokeStyle='rgb(235,220,190)'; ctx.lineWidth=0.6+2.4*(1-k);
      ctx.beginPath(); ctx.ellipse(x,pt.y,rr,rr*0.22,0,0,6.283); ctx.stroke(); }
  }
  ctx.globalAlpha=1;
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineCap='round';
  for (const pt of particles){
    if (pt.k!=='f' && pt.k!=='s') continue;
    const x=pt.x-camX; if (x<-90||x>pvw+90) continue;
    const k=pt.t/pt.life;
    if (pt.k==='f'){ const r=pt.r*(0.6+k*1.2); ctx.globalAlpha=Math.pow(1-k,1.4); ctx.drawImage(PF.fire, x-r, pt.y-r, r*2, r*2); }
    else { ctx.globalAlpha=1-k; ctx.strokeStyle=pt.color; ctx.lineWidth=pt.r;
      ctx.beginPath(); ctx.moveTo(x,pt.y); ctx.lineTo(x-pt.vx*0.035, pt.y-pt.vy*0.035); ctx.stroke(); }
  }
  ctx.restore(); ctx.globalAlpha=1;
  // ===== LUMIÈRES DYNAMIQUES (RTX simulé) : nappes additives qui éclairent la scène =====
  // En qualité Faible, on saute les dégradés radiaux (coûteux) mais on continue de faire
  // expirer les lumières pour ne pas les accumuler (évite la surcharge sur GPU/extensions lourdes).
  // Intensité réduite (0,55/0,22 → 0,34/0,12) et au plus 24 lumières DESSINÉES par frame (les
  // plus récentes) : en grande bataille jusqu'à 60 dégradés radiaux additifs s'empilaient,
  // blanchissant la mêlée ET coûtant cher. Toutes continuent d'expirer normalement.
  if (LIGHTS.length){
    const drawLights = qFx(), firstDrawn = LIGHTS.length-24;
    if (drawLights){ ctx.save(); ctx.globalCompositeOperation='lighter'; }
    for (let i=LIGHTS.length-1;i>=0;i--){ const L=LIGHTS[i]; L.t+=dt; if(L.t>=L.life){ LIGHTS.splice(i,1); continue; }
      if (!drawLights || i<firstDrawn) continue;
      const a=1-L.t/L.life, lx=L.x-camX;
      const g=ctx.createRadialGradient(lx,L.y,1,lx,L.y,L.r);
      g.addColorStop(0,rgbaC(L.col,0.34*a)); g.addColorStop(0.5,rgbaC(L.col,0.12*a)); g.addColorStop(1,rgbaC(L.col,0));
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(lx,L.y,L.r,0,6.283); ctx.fill(); }
    if (drawLights) ctx.restore(); }
  ctx.textAlign='center';
  for (const f of floaters){
    ctx.globalAlpha=1-f.t/1.6;
    ctx.font='800 '+f.size+'px Georgia'; ctx.fillStyle=f.color;
    ctx.fillText(f.txt, f.x-camX, f.y);
  }
  ctx.globalAlpha=1;
  ctx.restore(); // fin du monde zoomé
  drawWinter();
  drawCata();
  if (game.boon==='rain') drawRainBoon(game.t);   // PLUIE FERTILE : l'averse se voit

  if (game.flash>0){ ctx.fillStyle='#fff'; ctx.globalAlpha=Math.min(0.4,game.flash*0.3); ctx.fillRect(0,0,W,H); ctx.globalAlpha=1; }
  // étalonnage cinématique : légère vignette pour la profondeur (n'assombrit pas le HUD)
  if (!VIGN){ VIGN=ctx.createRadialGradient(W/2,H*0.46,H*0.4,W/2,H*0.5,H*0.95);
    VIGN.addColorStop(0,'rgba(0,0,0,0)'); VIGN.addColorStop(1,'rgba(8,6,12,0.30)'); }
  ctx.fillStyle=VIGN; ctx.fillRect(0,0,W,H);
  drawFilmGrade();               // étalonnage cinéma (ombres froides / hautes lumières chaudes) + grain
  drawHUD();
  drawSpeedOverlays();
  ctx.restore();
}
// sélecteur de vitesse (chooser local) + modal de vote reçu — dessinés par-dessus le HUD
function drawSpeedOverlays(){
  if (speedPending){                                   // ma proposition en attente
    ctx.textAlign='center'; ctx.font='700 13px Arial';
    ctx.fillStyle='rgba(16,13,12,0.9)'; rr(W/2-150,44,300,24,6); ctx.fill();
    ctx.fillStyle='#e8d8a0'; ctx.fillText(t('spd_proposed')+' ×'+speedPending.speed+' — '+t('spd_waiting'), W/2, 56);
  }
  if (speedVote){                                      // proposition reçue : Oui / Non
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,W,H);
    const bw=360, bh=132, bx=W/2-bw/2, by=H/2-bh/2;
    ctx.fillStyle='rgba(20,16,15,0.97)'; rr(bx,by,bw,bh,10); ctx.fill();
    ctx.strokeStyle='#7ec8ff'; ctx.lineWidth=1.5; rr(bx,by,bw,bh,10); ctx.stroke();
    ctx.textAlign='center'; ctx.fillStyle='#e8e0d2'; ctx.font='700 16px Arial';
    ctx.fillText(t('spd_incoming'), W/2, by+34);
    ctx.fillStyle='#7ec8ff'; ctx.font='800 26px Arial'; ctx.fillText('×'+speedVote.speed, W/2, by+66);
    const yes={x:bx+30,y:by+86,w:140,h:32,ok:true}, no={x:bx+bw-170,y:by+86,w:140,h:32,ok:false};
    for (const r of [yes,no]){
      ctx.fillStyle = r.ok? 'rgba(60,140,80,0.9)':'rgba(140,60,50,0.9)'; rr(r.x,r.y,r.w,r.h,7); ctx.fill();
      ctx.fillStyle='#fff'; ctx.font='700 14px Arial'; ctx.fillText(r.ok? '✓ '+t('yes'):'✗ '+t('no'), r.x+r.w/2, r.y+r.h/2);
    }
    speedVote.rects=[yes,no];
  }
  if (speedPanel){                                     // sélecteur des 4 vitesses
    const opts=SPEEDS, n=opts.length, bw=84, gap=10, totw=n*bw+(n-1)*gap;
    const bx=W/2-totw/2, by=H/2-70, bh=46;
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center'; ctx.fillStyle='#e8e0d2'; ctx.font='700 15px Arial';
    ctx.fillText(isOnline()? t('spd_pick_online') : t('spd_pick'), W/2, by-18);
    const rects=[];
    for (let i=0;i<n;i++){
      const x=bx+i*(bw+gap), cur=(game.speed||1)===opts[i];
      ctx.fillStyle = cur? 'rgba(126,200,255,0.92)':'rgba(30,26,24,0.95)';
      rr(x,by,bw,bh,8); ctx.fill();
      ctx.strokeStyle = cur? '#fff':'#5a544c'; ctx.lineWidth=1.4; rr(x,by,bw,bh,8); ctx.stroke();
      ctx.fillStyle = cur? '#06121c':'#e8e0d2'; ctx.font='800 20px Arial';
      ctx.fillText('×'+opts[i], x+bw/2, by+bh/2);
      rects.push({x,y:by,w:bw,h:bh,spd:opts[i]});
    }
    speedPanel.rects=rects;
  }
}

let last = performance.now();
let lastAutoDowngrade = -999;   // horodatage (perfT, temps RÉEL) de la dernière baisse auto — évite les à-coups répétés
let perfGame = null, perfT = 0; // temps RÉEL écoulé dans la partie en cours (remis à zéro à chaque nouvelle partie)
let perfSkip = 0;               // frames à ignorer dans la mesure de FPS (retour d'arrière-plan)
document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) perfSkip = 2; });
let lastFsHidden = null;        // dernier état du bouton plein écran flottant (masqué/visible)
function loop(now){
  // bouton ⛶ : masqué en partie et pendant l'intro (il chevauchait le HUD) ; on ne touche au
  // DOM qu'aux transitions (début/fin de partie, intro), pas à chaque frame
  const fsH = fsBtnHidden(); if (fsH!==lastFsHidden){ lastFsHidden = fsH; refreshFsBtn(); }
  const raw = (now-last)/1000;              // pas de temps RÉEL, non borné
  const dt = Math.min(raw, 0.05); last=now;
  // L'adaptation de qualité se mesure en temps RÉEL, jamais en temps de JEU : `game.t` n'avance
  // que de `dt` borné à 0,05 s par frame, donc sur un appareil qui rame il défile au ralenti et
  // le garde « 6 s de partie » mettait des minutes à s'ouvrir — le filet se déclenchait d'autant
  // PLUS TARD que l'appareil était lent, soit l'inverse exact du besoin. Même raison pour fpsAvg :
  // calculé sur `dt` borné, il ne pouvait jamais descendre sous 20 fps (1/0,05).
  if (game !== perfGame){ perfGame = game; perfT = 0; lastAutoDowngrade = -999; }
  // AUTO-ADAPTATION DE QUALITÉ : si le FPS reste bas de façon SOUTENUE (moyenne lissée, pas un
  // pic isolé) pendant une vraie partie, on baisse la qualité d'UN cran automatiquement — sans
  // ça, un joueur qui ne sait pas qu'un réglage existe (ou ne le remarque pas) reste bloqué avec
  // un jeu saccadé. Un cran à la fois, avec un temps de repos entre deux baisses pour laisser le
  // nouveau palier faire ses preuves avant de rebaisser. Au palier Faible, plus rien à faire
  // automatiquement : un seul message ponctuel l'indique (fpsWarned, inchangé).
  // Un onglet remis au premier plan produit un `raw` énorme qui n'est PAS un FPS réel : on saute
  // ces frames-là explicitement (visibilitychange) plutôt que par un seuil de durée, sinon un
  // appareil vraiment à genoux (>2 s/frame) serait exclu de la mesure et ne baisserait jamais.
  // Ailleurs on plafonne à 1 s : plancher de mesure à 1 fps, largement sous le seuil de 28.
  if (perfSkip>0){ perfSkip--; }
  else if (raw>0){
    // délai d'attente compté en temps réel, borné à 1 s/frame comme la mesure de FPS
    if (game && !game.over && !paused) perfT += Math.min(raw, 1);
    // Lissage pondéré par le TEMPS, pas par le nombre de frames : à 60 fps le facteur vaut ~0,05
    // (comportement d'origine), mais quand les frames se raréfient chacune pèse davantage, sinon
    // la moyenne mettait d'autant plus de frames à réagir que l'appareil en produisait peu.
    // Plafond à 0,35 : il faut plusieurs frames lentes d'affilée, un à-coup isolé ne suffit pas.
    fpsAvg += ((1/Math.min(raw,1))-fpsAvg) * Math.min(0.35, raw*3);
    if (game && !game.over && !paused && perfT>6 && (perfT-lastAutoDowngrade)>15 && fpsAvg<28){
      const qi = QUALITIES.indexOf(SETTINGS.quality);
      if (qi>0){
        SETTINGS.quality = QUALITIES[qi-1]; saveSettings(); fpsWarned=false; lastAutoDowngrade=perfT;
        announce(tr('perf_auto')+' → '+qualityName(), '#ffcf6a');
      } else if (!fpsWarned){ fpsWarned=true; announce(tr('perf_warn'), '#ffcf6a'); }
    }
  }
  if (PERF.on){ PERF.fps += ((dt>0?1/dt:60)-PERF.fps)*0.1; PERF.t0 = performance.now(); }
  if (netPause && netPause.active) tickNetPause(dt);   // le décompte de pause tourne en temps réel
  const sp = (game && game.speed) ? game.speed : 1;    // vitesse de jeu (×0.75…×3)
  if (game && game.net==='guest') netGuestTick(dt);    // l'invité ne simule pas : la cadence vient des snapshots de l'hôte
  else if (game && !game.over && !paused){
    // on sous-découpe le pas pour le borner (≤0.05 s) : indispensable à ×2/×3 (anti-tunneling)
    let rem = dt * sp;
    while (rem > 1e-4){ const st = Math.min(rem, 0.05); update(st); rem -= st; }
  } else update(dt);                                    // menu / intro / pause / fin : logique inchangée
  if (PERF.on){ const n=performance.now(); PERF.upd += (n-PERF.t0 - PERF.upd)*0.15; PERF.t0=n; }
  // l'hôte diffuse l'état ~12 fois/seconde (cadence en temps réel, indépendante de la vitesse de jeu)
  if (game && game.net==='host' && net && net.peer && !paused && !game.over){
    net.acc += dt;
    if (net.acc >= 0.08){ net.acc = 0; net.sendState({s:serialize(), ev:net.ev}); net.ev = []; }
  }
  // remise à zéro systématique : aucune transformation ne peut fuir d'une frame à l'autre
  ctx.setTransform(SCALE,0,0,SCALE,0,0);
  ctx.fillStyle='#0d0a0a'; ctx.fillRect(0,0,W,H);
  if (PERF.on) PERF.t0 = performance.now();
  try { render(dt); }
  catch(err){ ctx.setTransform(SCALE,0,0,SCALE,0,0); console.error(err); }
  if (PERF.on){ PERF.rend += (performance.now()-PERF.t0 - PERF.rend)*0.15; drawPerfHud(); }
  if (CHEAT.unlocked && CHEAT.open && game && !game.over) drawCheatPanel();
  if (WARMQ.length) warmTick(2);           // préchauffe étalée des sprites (voir prewarmSprites)
  requestAnimationFrame(loop);
}
// MODE TRICHE (dev) — panneau d'actions de test, n'apparaît qu'une fois déverrouillé
function drawCheatPanel(){
  ctx.setTransform(SCALE,0,0,SCALE,0,0);
  const items = [
    {k:'res',     l:'💰 +10000 ressources'},
    {k:'xp',      l:'✦ +2000 XP'},
    {k:'evolve',  l:'⚡ Évoluer (ère +1)'},
    {k:'special', l:'✸ Pouvoir prêt'},
    {k:'hero',    l:'🦸 Héros dispo + ressources'},
    {k:'mature',  l:'🌾 Fermes au régime max (×3)'},
    {k:'wave',    l:'☠ Vague ennemie (+5)'},
    {k:'god',     l:(CHEAT.god?'🛡 GOD: ON':'🛡 GOD: OFF')},
    {k:'win',     l:'🏆 Gagner (base ennemie)'},
  ];
  const pw=192, rh=24, pad=8, ph=pad*2+18+items.length*rh;
  const px=W-pw-10, py=64;
  ctx.fillStyle='rgba(14,8,16,0.94)'; rr(px,py,pw,ph,7); ctx.fill();
  ctx.strokeStyle='#ff5af0'; ctx.lineWidth=1.4; rr(px,py,pw,ph,7); ctx.stroke();
  ctx.textAlign='left'; ctx.font='700 11px Arial'; ctx.fillStyle='#ff9bf0';
  ctx.fillText('★ TRICHE (DEV) — F9', px+pad, py+pad+8);
  CHEAT.rects = [];
  for (let i=0;i<items.length;i++){
    const it=items[i], y=py+pad+16+i*rh;
    const on = it.k==='god' && CHEAT.god;
    ctx.fillStyle = on? 'rgba(255,90,240,0.22)':'rgba(255,255,255,0.06)';
    rr(px+pad, y, pw-pad*2, rh-4, 4); ctx.fill();
    ctx.fillStyle = '#f0d8f0'; ctx.font='600 11px Arial';
    ctx.fillText(it.l, px+pad+8, y+(rh-4)/2+1);
    CHEAT.rects.push({x:px+pad, y, w:pw-pad*2, h:rh-4, k:it.k});
  }
}
// overlay de diagnostic perf (coin haut-gauche) — n'apparaît que si PERF.on
function drawPerfHud(){
  ctx.setTransform(SCALE,0,0,SCALE,0,0);
  const lines = [
    'FPS '+PERF.fps.toFixed(0)+'  ('+(1000/Math.max(1,PERF.fps)).toFixed(1)+' ms)',
    'sim '+PERF.upd.toFixed(2)+' ms   rendu '+PERF.rend.toFixed(2)+' ms',
    game? ('unités '+(game.p.units.length+game.e.units.length)+'  part '+particles.length
          +'  fx '+(LIGHTS.length+deaths.length+shots.length+projectiles.length)) : 'menu',
    'q='+SETTINGS.quality+(typeof DECOR!=='undefined'?('  décor '+DECOR.length):''),
  ];
  ctx.font='11px monospace'; ctx.textAlign='left'; ctx.textBaseline='top';
  const w=232, h=8+lines.length*15;
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(6,6,w,h);
  ctx.fillStyle = PERF.fps<30? '#ff8a6a' : PERF.fps<50? '#ffcf6a' : '#9dd88a';
  for (let i=0;i<lines.length;i++) ctx.fillText(lines[i], 12, 11+i*15);
  ctx.textBaseline='alphabetic';
}
requestAnimationFrame(loop);
