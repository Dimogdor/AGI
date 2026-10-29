/* ================= FIN DE PARTIE ================= */
// échappement HTML : en ligne, une partie des valeurs affichées vient de l'autre joueur
const escH = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function showEnd(){
  const et = document.getElementById('endtitle'), s = document.getElementById('endstats');
  et.textContent = game.win? t('end_win') : t('end_lose');
  et.style.color = game.win? '#e8d8a0' : '#a8281e';
  const gt = Math.max(0, +game.t||0), mins = Math.floor(gt/60), secs = ('0'+Math.floor(gt%60)).slice(-2);
  // v1.9 : cartes de statistiques à icônes + jauge de santé du monde (avant : 4 lignes de texte)
  const cells = [
    ['⏱', t('end_duration'), mins+' '+t('unit_min')+' '+secs+' '+t('unit_sec')],
    ['⚔', t('end_kills'), (+game.kills||0)|0],
    ['☠', t('end_losses'), (+game.eKills||0)|0],
    ['✸', t('end_powers'), (+game.specialsUsed||0)|0],
    ['✦', t('end_era'), lEra(game.p.facKey,game.p.era)+(game.p.trans? ' — '+lTransName(game.p.facKey):'')],
  ];
  const wh = clamp(Math.round((1-(+game.dev||0))*100), 0, 100);
  s.innerHTML = '<div class="esGrid">'+cells.map(([ic,l,v],i)=>'<div class="esCell'+(i===4?' esWide':'')+'"><span class="esIco">'+ic+'</span>'+
      '<span class="esLbl">'+escH(l)+'</span><b>'+escH(v)+'</b></div>').join('')+'</div>'+
    '<div class="esWorld"><span>🌍 '+t('end_world')+'</span><div class="esBar"><i style="width:'+wh+'%;background:'+
      (wh>60? '#7dd84a' : wh>30? '#ffd34a' : '#ff5a4a')+'"></i></div><b>'+wh+'%</b></div>'+
    '<i class="esJournal">'+escH(warJournal())+'</i>';
  try { drawEndArt(); } catch(e){}
  document.getElementById('endscreen').style.display = 'flex';
}
// ILLUSTRATION DE FIN (v1.9), dessinée avec les vrais sprites : victoire — ton héros entouré
// de son escouade sous des rayons de lumière ; défaite — le héros ennemi domine, ton drapeau
// est à terre.
function drawEndArt(){
  const cv = document.getElementById('endart'); if (!cv) return;
  const c = cv.getContext('2d'), k = cv.width/520;
  c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,cv.width,cv.height); c.scale(k,k);
  const win = game.win, side = win? game.p : game.e, fk = side.facKey, kind = fk==='HUM'? 'hum':'bot';
  const acc = side.fac.accent, gy = 176;
  const g = c.createRadialGradient(260,140,10,260,140,280);
  g.addColorStop(0, rgbaC(acc, win? 0.42 : 0.22)); g.addColorStop(1, rgbaC(acc, 0));     // fondu vers la MÊME teinte
  c.fillStyle = g; c.fillRect(0,0,520,200);
  if (win){ c.save(); c.globalCompositeOperation='lighter';                              // rayons de gloire
    for (let i=0;i<9;i++){ const a = -Math.PI/2 + (i-4)*0.24, w = 0.06;
      c.fillStyle = rgbaC(acc, 0.07); c.beginPath(); c.moveTo(260, 150);
      c.lineTo(260+Math.cos(a-w)*320, 150+Math.sin(a-w)*320); c.lineTo(260+Math.cos(a+w)*320, 150+Math.sin(a+w)*320); c.closePath(); c.fill(); }
    c.restore(); }
  c.fillStyle = 'rgba(10,7,9,0.92)'; c.beginPath(); c.moveTo(0,200);                     // crête
  for (let x=0; x<=520; x+=20) c.lineTo(x, gy + 3 + Math.sin(x*0.05)*3);
  c.lineTo(520,200); c.closePath(); c.fill();
  // fondu radial du décor : rien n'est coupé net aux bords du cadre
  const m = c.createRadialGradient(260,150,60,260,150,270); m.addColorStop(0,'rgba(0,0,0,1)'); m.addColorStop(1,'rgba(0,0,0,0)');
  c.save(); c.globalCompositeOperation='destination-in'; c.fillStyle=m; c.fillRect(0,0,520,200); c.restore();
  const era = side.era, trans = !!side.trans;
  for (const [role, dx, s] of [['ranged',-170,0.9],['tank',-105,0.98],['melee',105,0.98],['support',170,0.9]]){
    c.save(); c.translate(260+dx, gy); c.scale(dx<0? s : -s, s); drawUnitLayers(kind, fk, role, era, trans, 0, c); c.restore(); }
  const hs = sprite('HERO'+fk, HERO_SW, 100, ()=>heroSprite(fk)), hk = 1.32;
  c.save(); c.translate(260, gy+2); c.scale(win? hk : -hk, hk); c.drawImage(hs, -HERO_SW/2, -92, HERO_SW, 100); c.restore();
  if (!win){                                                                               // drapeau du joueur à terre
    c.save(); c.globalCompositeOperation='source-atop'; c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0,0,520,200); c.restore();
    const pc = game.p.fac.accent;
    c.strokeStyle = '#2a2420'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(70, gy+2); c.lineTo(148, gy-20); c.stroke();
    c.fillStyle = shade(pc,0.7); c.beginPath(); c.moveTo(148, gy-20); c.quadraticCurveTo(160, gy-6, 176, gy-2); c.lineTo(166, gy+4);
    c.quadraticCurveTo(152, gy+2, 140, gy-10); c.closePath(); c.fill(); }
}
// JOURNAL DE GUERRE : 2-3 lignes générées à partir de l'issue de la partie (récit localisé).
function warJournal(){
  const o = { era:lEra(game.p.facKey,game.p.era), kills:game.kills, losses:game.eKills,
              world:Math.round((1-game.dev)*100), fac:lFacName(game.p.facKey), foe:lFacName(game.e.facKey),
              brigade:73 + (Math.floor(game.t)%27) };
  return fmt(game.win? 'journal_win' : 'journal_lose', o);
}
