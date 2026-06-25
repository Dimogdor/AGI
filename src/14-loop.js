/* ================= BOUCLE & RENDU ================= */
// MUR D'ÉNERGIE / BROUILLARD DE SCÉNARIO : barrière verticale animée + voile sombre sur la portion
// scellée de la carte (dessinée dans le repère « monde » zoomé, comme les unités : x = monde - camX).
function drawBarrier(){
  const b = game.barrier, x = b.x - camX, vw = VW(), gz = gY(b.x);
  const top = -zTY()/zoom - 40, bot = gz + 20;
  // voile sombre sur la zone scellée (au-delà du mur, côté ennemi)
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,26,0.42)'; ctx.fillRect(x, top, (vw - x) + 60, bot - top);
  // mur lui-même : dégradé translucide + balayage lumineux animé
  const pulse = 0.45 + 0.25*Math.sin(game.t*3);
  const g = ctx.createLinearGradient(x-16, 0, x+16, 0);
  g.addColorStop(0, 'rgba(90,208,255,0)');
  g.addColorStop(0.5, rgbaC('#5ad0ff', pulse));
  g.addColorStop(1, 'rgba(90,208,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x-16, top, 32, bot - top);
  // créneaux d'énergie qui défilent verticalement
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#bfe9ff';
  for (let yy = top + ((game.t*70) % 26); yy < bot; yy += 26) ctx.fillRect(x-2, yy, 4, 12);
  ctx.restore(); ctx.globalAlpha = 1;
}
function render(dt){
  if (!game){ if (intro>=0){ drawIntro(dt); } else drawMenuScene(dt); return; }
  ctx.save();
  if (game.shake>0.3 && SETTINGS.shake) ctx.translate((Math.random()-0.5)*game.shake,(Math.random()-0.5)*game.shake);
  // ---- monde (zoomé, ancré en bas) ----
  ctx.save();
  ctx.translate(0, zTY());
  ctx.scale(zoom, zoom);
  drawBG();
  for (const n of game.nodes) drawNode(n);
  for (const s of game.p.slots) drawSlot(s, game.p, false);
  for (const s of game.e.slots) drawSlot(s, game.e, false);
  for (const n of game.neut) drawSlot(n, null, true);
  drawBase(game.p); drawBase(game.e);
  if (game.pois) drawPOIs();
  for (const u of game.e.units) drawUnit(u);
  for (const u of game.p.units) drawUnit(u);
  if (game.barrier && !game.barrier.opened) drawBarrier();
  for (const s of shots){
    ctx.globalAlpha = 1-s.t/s.dur;
    ctx.strokeStyle = FACTIONS[s.fac].eraCols[s.era]; ctx.lineWidth=2.2;
    ctx.beginPath(); ctx.moveTo(s.x-camX,s.y); ctx.lineTo(s.tx-camX,s.ty); ctx.stroke();
    ctx.globalAlpha=1;
  }
  for (const pr of projectiles){
    const k = pr.t/pr.dur;
    const px = lerp(pr.sx,pr.tx,k)-camX, py = gY(lerp(pr.sx,pr.tx,k))-26 - Math.sin(k*Math.PI)*90;
    ctx.fillStyle=FACTIONS[pr.fac].eraCols[pr.era];
    ctx.beginPath(); ctx.arc(px,py,4,0,6.28); ctx.fill();
  }
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
