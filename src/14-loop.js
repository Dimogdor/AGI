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
  for (const n of game.nodes) drawNode(n);
  for (const s of game.p.slots) drawSlot(s, game.p, false);
  for (const s of game.e.slots) drawSlot(s, game.e, false);
  for (const n of game.neut) drawSlot(n, null, true);
  drawBase(game.p); drawBase(game.e);
  for (const u of game.e.units) drawUnit(u);
  for (const u of game.p.units) drawUnit(u);
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
  const projGlow = qFx();
  if (projGlow){ ctx.save(); ctx.globalCompositeOperation='lighter'; }
  for (const pr of projectiles){
    const k = pr.t/pr.dur;
    const wx2 = lerp(pr.sx,pr.tx,k), px = wx2-camX, py = gY(wx2)-26 - Math.sin(k*Math.PI)*90;
    const col = FACTIONS[pr.fac].eraCols[pr.era];
    if (projGlow){                                   // traînée + lueur additive (cercles pleins, pas de gradient)
      if (pr._px!=null){ ctx.strokeStyle=rgbaC(col,0.4); ctx.lineWidth=3; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(pr._px,pr._py); ctx.lineTo(px,py); ctx.stroke(); }
      pr._px=px; pr._py=py;
      ctx.fillStyle=rgbaC(col,0.28); ctx.beginPath(); ctx.arc(px,py,8,0,6.28); ctx.fill();
    }
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.arc(px,py,3.4,0,6.28); ctx.fill();
  }
  if (projGlow) ctx.restore();
  // RAGDOLLS DE MORT (par rôle) : bascule au sol · chute en vrille (volants) · effondrement (tanks)
  for (const d of deaths){
    const x=d.x-camX; if (x<-30||x>VW()+30) continue;
    const gy=gY(d.x), k=d.t/d.life; ctx.save(); ctx.globalAlpha=Math.max(0,1-k);
    const col=FACTIONS[d.fac].eraCols[d.era];
    if (d.fly){ ctx.translate(x, gy-d.flyH*(1-k)-6); ctx.rotate(k*9*d.side); ctx.fillStyle=col; ctx.fillRect(-7,-3,14,6); }
    else if (d.role==='tank'){ ctx.translate(x, gy-3); ctx.scale(1, Math.max(0.2,1-k*1.1)); ctx.fillStyle=col; ctx.fillRect(-9,-13,18,13); }
    else { ctx.translate(x, gy-2); ctx.rotate(k*1.5*d.side); ctx.fillStyle=col;
      ctx.fillRect(-3,-17,6,17); ctx.beginPath(); ctx.arc(0,-20,4,0,6.28); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha=1;
  }
  for (const pt of particles){
    ctx.globalAlpha=1-pt.t/pt.life;
    ctx.fillStyle=pt.color; ctx.beginPath(); ctx.arc(pt.x-camX,pt.y,pt.r,0,6.28); ctx.fill();
  }
  ctx.globalAlpha=1;
  // ===== LUMIÈRES DYNAMIQUES (RTX simulé) : nappes additives qui éclairent la scène =====
  // En qualité Faible, on saute les dégradés radiaux (coûteux) mais on continue de faire
  // expirer les lumières pour ne pas les accumuler (évite la surcharge sur GPU/extensions lourdes).
  if (LIGHTS.length){
    const drawLights = qFx();
    if (drawLights){ ctx.save(); ctx.globalCompositeOperation='lighter'; }
    for (let i=LIGHTS.length-1;i>=0;i--){ const L=LIGHTS[i]; L.t+=dt; if(L.t>=L.life){ LIGHTS.splice(i,1); continue; }
      if (!drawLights) continue;
      const a=1-L.t/L.life, lx=L.x-camX;
      const g=ctx.createRadialGradient(lx,L.y,1,lx,L.y,L.r);
      g.addColorStop(0,rgbaC(L.col,0.55*a)); g.addColorStop(0.5,rgbaC(L.col,0.22*a)); g.addColorStop(1,rgbaC(L.col,0));
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
  if (game.flash>0){ ctx.fillStyle='#fff'; ctx.globalAlpha=Math.min(0.4,game.flash*0.3); ctx.fillRect(0,0,W,H); ctx.globalAlpha=1; }
  // étalonnage cinématique : légère vignette pour la profondeur (n'assombrit pas le HUD)
  if (!VIGN){ VIGN=ctx.createRadialGradient(W/2,H*0.46,H*0.4,W/2,H*0.5,H*0.95);
    VIGN.addColorStop(0,'rgba(0,0,0,0)'); VIGN.addColorStop(1,'rgba(8,6,12,0.30)'); }
  ctx.fillStyle=VIGN; ctx.fillRect(0,0,W,H);
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
function loop(now){
  const dt = Math.min((now-last)/1000, 0.05); last=now;
  // ALERTE PERF : on lisse le FPS ; s'il reste bas longtemps en jeu et que la qualité
  // n'est pas déjà au minimum, on invite UNE fois à la réduire dans les paramètres.
  if (dt>0){ fpsAvg += ((1/dt)-fpsAvg)*0.05;
    if (!fpsWarned && game && !game.over && !paused && SETTINGS.quality!=='low' && game.t>8 && fpsAvg<34){
      fpsWarned=true; announce(tr('perf_warn'), '#ffcf6a'); }
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
