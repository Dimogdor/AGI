/* ====== DÉTAILS STRUCTURELS (v1.17) : réparateurs, drones, garnisons, jauges papier, épaves, fanions ======
   Tout ce qui était dessiné « en direct » (fillRect/arc, sans contour) est ici cuit par sprite()
   avec le contour d'encre des bases et des héros ; seuls les gestes (pose, étincelles, faisceau) sont
   redessinés à chaque image. Les fonctions des UNITÉS (drawHumSprite…) ne sont pas touchées. */
const DK_INK = '#1a1210';
function dkP(c, pts, col){ c.beginPath(); c.moveTo(pts[0],pts[1]); for (let i=2;i<pts.length;i+=2) c.lineTo(pts[i],pts[i+1]); c.closePath(); c.fillStyle=col; c.fill(); }
function dkR(c, x, y, w, h, col){ c.fillStyle=col; c.fillRect(x,y,w,h); }
function dkC(c, x, y, r, col){ c.fillStyle=col; c.beginPath(); c.arc(x,y,r,0,6.283); c.fill(); }
function dkL(c, x0, y0, x1, y1, w, col){ c.strokeStyle=col; c.lineWidth=w; c.lineCap='round'; c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1); c.stroke(); }
const dkPal = fk => UIPAL[fk==='IA'? 'IA' : 'HUM'];

/* ---------- JAUGES PAPIER & CHEVRONS (barres de vie des bases / bâtiments, niveau) ---------- */
// cartouche : papier posé, piste sombre, remplissage, graduations, cadre d'encre (comme paperChip du HUD)
function inkGauge(x, y, w, h, frac, col, fk){
  const pal = dkPal(fk);
  paperChip(x-1.6, y-1.6, w+3.2, h+3.2, pal);
  ctx.fillStyle = 'rgba(31,27,23,0.3)'; ctx.fillRect(x, y, w, h);
  if (frac>0){ ctx.fillStyle = col; ctx.fillRect(x, y, Math.max(1.2, w*frac), h);
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x, y, Math.max(1.2, w*frac), Math.max(1, h*0.34)); }
  ctx.fillStyle = 'rgba(26,18,16,0.55)'; for (let k=1;k<4;k++) ctx.fillRect(x+w*k/4-0.4, y, 0.8, h);
  ctx.strokeStyle = DK_INK; ctx.lineWidth = 1.1; ctx.lineJoin = 'miter'; ctx.strokeRect(x-1.6, y-1.6, w+3.2, h+3.2);
}
const gaugeCol = frac => frac>0.55? '#4f9a3a' : frac>0.28? '#d89a22' : '#c8402a';
// grade : n chevrons empilés, plein d'ocre cerné d'encre (au lieu de ★ jaunes)
function levelChevrons(x, y, n){
  const sp = 3.6, w = 4.6; ctx.save(); ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
  for (let i=0;i<n;i++){ const cy = y - i*sp;
    ctx.beginPath(); ctx.moveTo(x-w, cy+2.2); ctx.lineTo(x, cy-1.2); ctx.lineTo(x+w, cy+2.2); ctx.lineTo(x+w, cy+3.8); ctx.lineTo(x, cy+0.4); ctx.lineTo(x-w, cy+3.8); ctx.closePath();
    ctx.fillStyle = '#e8b830'; ctx.fill(); ctx.strokeStyle = DK_INK; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.restore();
}
// compteur de garnison : pastille papier, casque vectoriel + effectif
function garCounter(x, y, n, fk){
  const pal = dkPal(fk), w = 20, h = 11;
  paperChip(x-w/2, y-h/2, w, h, pal);
  ctx.strokeStyle = DK_INK; ctx.lineWidth = 1; ctx.strokeRect(x-w/2, y-h/2, w, h);
  ctx.fillStyle = DK_INK; ctx.beginPath(); ctx.arc(x-5.4, y+0.6, 3.1, Math.PI, 0); ctx.fill(); ctx.fillRect(x-9, y+0.5, 7.2, 1.3);
  ctx.font = '700 9px '+B_STEN; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = DK_INK; ctx.fillText(String(n), x+1, y+0.8);
  ctx.textBaseline = 'alphabetic';
}

/* ---------- RÉPARATEURS HUMAINS : mini-ouvrier cuit, 2 poses, étincelles en direct ---------- */
// pose 0 : à genoux, outil à l'établi · pose 1 : debout, marteau levé. Repère : pieds en (14, 37), regard vers +x.
function repSprite(era, pose){
  return sprite('REP'+era+'p'+pose, 34, 40, c=>{
    const E = era|0, skin = '#e2b48a', boot = '#2a2220';
    const pant = E===0? '#6a5a44' : E===1? '#3a4a6a' : E===2? '#4a5560' : E===3? '#dfe4e8' : '#8aa066';
    const top  = E===0? '#7a6446' : E===1? '#556a8a' : E===2? '#6a7480' : E===3? '#e8ecee' : '#a4b878';
    const hat  = E===0? '#6a4a3a' : E===1? '#f2c41c' : E===2? '#f2a41c' : E===3? '#f4f6f8' : '#7ab04a';
    const stripe = E===3? '#30b8e0' : '#e8eef0';
    const standing = pose===1;
    if (standing){
      dkR(c, 10, 36-3, 5.4, 3.2, boot); dkR(c, 15.4, 36-3, 5.4, 3.2, boot);
      dkR(c, 10.6, 25, 4.2, 9, pant); dkR(c, 15.6, 25, 4.2, 9, pant);
      dkL(c, 11, 15, 8.6, 24, 3, top);                                                    // bras arrière
      dkP(c, [9.4,13.2, 20.8,13.2, 21.4,26.4, 9,26.4], top);                              // torse
      if (E<3){ dkP(c, [10,13.6, 14.4,13.6, 14,26, 9.6,26], '#ff8a1c'); dkP(c, [16.8,13.6, 20.4,13.6, 20.9,26, 17.2,26], '#ff8a1c'); }
      dkR(c, 9.4, 20, 12, 1.8, stripe);
      dkC(c, 15.4, 9.4, 3.7, skin);
      dkL(c, 19.6, 15, 24.4, 8.2, 3.2, E===3? top : top);                                 // bras levé
      dkC(c, 24.6, 7.6, 1.9, skin);
    } else {
      dkR(c, 5.6, 33.4, 10, 3.4, pant); dkR(c, 4.4, 34, 3, 2.8, boot);                    // tibia arrière au sol
      dkP(c, [14.6,28, 20.4,28.6, 20.4,34, 18,34, 18,31, 14.6,31.4], pant); dkR(c, 18.4, 33.2, 5.4, 3.6, boot);
      dkP(c, [8.6,17.4, 17.6,15.4, 20.6,29, 9.8,29.4], top);                              // torse penché
      if (E<3){ dkP(c, [9.6,17.6, 13.6,16.6, 13.4,29, 10,29], '#ff8a1c'); dkP(c, [16,15.8, 18.4,15.4, 20.2,28.8, 17.4,28.8], '#ff8a1c'); }
      dkP(c, [9.2,23.4, 20.4,22.6, 20.5,24.4, 9.4,25.2], stripe);
      dkC(c, 17.6, 11.8, 3.7, skin);
      dkL(c, 18, 18.6, 23.4, 27, 3.2, top); dkC(c, 23.8, 27.6, 1.9, skin);
    }
    const hx = standing? 15.4 : 17.6, hy = standing? 9.4 : 11.8;                          // coiffe
    if (E===0){ c.fillStyle = hat; c.beginPath(); c.arc(hx, hy-0.6, 4.1, Math.PI, 0); c.fill(); dkR(c, hx-4.1, hy-1.2, 8.2, 1.8, '#b8402a'); }
    else { c.fillStyle = hat; c.beginPath(); c.arc(hx, hy-0.6, 4.4, Math.PI, 0); c.fill(); dkR(c, hx-5, hy-1, 10.8, 1.8, shade(hat,0.82));
      if (E===3){ dkR(c, hx+0.6, hy-0.3, 3.8, 1.8, '#40c8ee'); dkC(c, hx+1.6, hy-4.6, 1, '#fff6c0'); }
      if (E===4){ dkP(c, [hx-1,hy-4, hx+1.6,hy-7.6, hx+3.4,hy-4.4], '#4a9a3a'); } }
    // outil
    const hxx = standing? 24.6 : 23.8, hyy = standing? 7.6 : 27.6;
    if (E<=1){                                                                            // marteau
      if (standing){ dkL(c, hxx, hyy+1.6, hxx+1.4, hyy-9, 1.8, '#7a5a38'); dkP(c, [hxx-2.8,hyy-12, hxx+5,hyy-12, hxx+5,hyy-7.4, hxx-2.8,hyy-7.4], '#8a9098'); }
      else { dkL(c, hxx, hyy, hxx+5, hyy+4, 1.8, '#7a5a38'); dkP(c, [hxx+4,hyy+1.4, hxx+8,hyy+3.2, hxx+6.6,hyy+6.6, hxx+2.8,hyy+4.8], '#8a9098'); } }
    else if (E===2){                                                                      // clé à molette
      if (standing){ dkL(c, hxx, hyy+1, hxx+1.6, hyy-9, 2, '#9aa0a8'); c.strokeStyle = '#9aa0a8'; c.lineWidth = 2; c.beginPath(); c.arc(hxx+1.8, hyy-10.6, 2.6, 0.5, 5.8); c.stroke(); }
      else { dkL(c, hxx, hyy, hxx+5.6, hyy+3.4, 2, '#9aa0a8'); c.strokeStyle = '#9aa0a8'; c.lineWidth = 2; c.beginPath(); c.arc(hxx+7.4, hyy+4.6, 2.6, 2.2, 7.3); c.stroke(); } }
    else if (E===3){                                                                      // chalumeau
      if (standing){ dkL(c, hxx, hyy+1, hxx+1.2, hyy-7, 2.6, '#7a8088'); dkR(c, hxx-0.4, hyy-9.4, 1.8, 3, '#40c8ee'); }
      else { dkL(c, hxx, hyy, hxx+5.4, hyy+3.2, 2.6, '#7a8088'); dkR(c, hxx+5, hyy+2.4, 3, 1.8, '#40c8ee'); } }
    else {                                                                                // exo-bras mécanique sur l'épaule
      const sx = standing? 19.6 : 18, sy = standing? 15 : 18.6;
      dkL(c, sx-1, sy, sx+3.6, sy-4.4, 3.6, '#5a6a72'); dkL(c, sx+3.6, sy-4.4, hxx+(standing?0:3), hyy+(standing?-5:3), 3, '#8aa4ac');
      dkC(c, sx+3.6, sy-4.4, 2, '#3a4a52');
      dkP(c, [hxx-2+(standing?0:3), hyy-8+(standing?0:9), hxx+3.6+(standing?0:3), hyy-8+(standing?0:9), hxx+3+(standing?0:3), hyy-4+(standing?0:9), hxx-1.4+(standing?0:3), hyy-4+(standing?0:9)], '#4a9a3a'); }
  });
}
// étincelles : demi-cycle de frappe ; pas de Math.random (rendu déterministe)
function dkSparks(x, y, t, n, col, r){
  const ph = (t*7)%1; if (ph>0.7) return;
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle = col||'#ffd34a'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
  for (let i=0;i<(n||4);i++){ const a = -0.4-i*(2.6/(n||4))+lhash(i,Math.floor(t*7))*0.5, L = (r||5)*(0.4+ph);
    ctx.globalAlpha = 1-ph/0.7; ctx.beginPath(); ctx.moveTo(x+Math.cos(a)*1.5, y+Math.sin(a)*1.5); ctx.lineTo(x+Math.cos(a)*L, y+Math.sin(a)*L+ph*ph*5); ctx.stroke(); }
  ctx.restore();
}
// un ouvrier au sol à (x,gy), qui alterne frappe levée / genou à terre
function drawRepairer(x, gy, t, era, seed, dir){
  const ph = (t*1.6+seed*0.37)%2, pose = ph<1? 1 : 0, S = repSprite(clamp(era|0,0,4), pose);
  const bob = pose===1? -Math.abs(Math.sin(ph*Math.PI))*1.2 : 0;
  ctx.save(); ctx.translate(x, gy+1); ctx.scale(dir||1, 1); ctx.drawImage(S, -14, -37+bob, 34, 40); ctx.restore();
  const tip = pose===1? [10*(dir||1), -2] : [12*(dir||1), -4];
  if (pose===0 || (ph%1)>0.55) dkSparks(x+tip[0]+ (pose===1? 6*(dir||1):0), gy+tip[1], t+seed, 4, '#ffd34a', 5);
}

/* ---------- DRONES RÉPARATEURS (G·P·T) : mini quadri-rotor + faisceau de soudure ---------- */
function repDroneSprite(era){
  return sprite('RDR'+era, 30, 16, c=>{
    const lite = FACTIONS.IA.eraCols[clamp(era|0,0,4)], shell = iaPlate(clamp(era|0,0,4));
    dkL(c, 4, 6, 26, 6, 2, '#2a3038');                                                  // bras
    for (const rx of [4,26]){ dkR(c, rx-0.8, 3.4, 1.6, 3, '#14181e'); }                 // moyeux (hélices en direct)
    dkP(c, [9,6, 12,3, 18,3, 21,6, 19,10, 11,10], shell);                               // coque
    dkR(c, 11, 9, 8, 2, '#14181e'); dkC(c, 15, 7, 2.1, '#10161c'); dkC(c, 15.4, 6.8, 1.3, lite);
    dkL(c, 15, 10, 15, 14, 1.4, '#2a3038'); dkR(c, 13.4, 13, 3.2, 1.8, lite);           // torche sous le ventre
  });
}
// drone en (x,y), faisceau vers (tx,ty) ; era = couleur d'ère de la faction
function drawRepairDrone(x, y, tx, ty, t, era, seed){
  const E = clamp(era|0,0,4), lite = FACTIONS.IA.eraCols[E], S = repDroneSprite(E);
  ctx.save(); ctx.translate(x, y); ctx.drawImage(S, -15, -7, 30, 16);
  // hélices : disques flous alternés
  const f = 0.5+0.5*Math.sin(t*60+seed);
  ctx.fillStyle = 'rgba(210,225,235,0.55)'; for (const rx of [-11,11]){ ctx.beginPath(); ctx.ellipse(rx, -4, 5.2-f*1.2, 1.2+f*0.5, 0, 0, 6.283); ctx.fill(); }
  ctx.restore();
  const bx = x+0.4, by = y+8, on = Math.sin(t*5+seed)>-0.35;
  if (on){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineCap='round';
    ctx.strokeStyle = rgbaC(lite, 0.5); ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = 'rgba(240,252,255,0.95)'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(tx, ty, 2+Math.sin(t*30)*0.6, 0, 6.283); ctx.fill();
    ctx.restore(); dkSparks(tx, ty, t+seed, 4, '#bff0ff', 6); }
}

/* ---------- BUSTES DE GARNISON : un par camp et par ère, contour d'encre, arme dans le sprite ---------- */
// kind : 'r' tireur · 's' artillerie · 'm' mêlée · 't' bouclier. Repère : épaules sur y=22, regard vers +x.
function garSprite(fac, era, kind){
  return sprite('GAR'+fac+era+kind, 34, 28, c=>{
    const E = clamp(era|0,0,4);
    if (fac==='HUM'){
      const cloth = shade(FACTIONS.HUM.eraCols[E], 0.8), skin = '#e0b48c';
      c.fillStyle = cloth; c.beginPath(); c.ellipse(15, 24, 7.4, 5.6, 0, Math.PI, 0); c.fill();
      dkC(c, 15, 12.8, 4.2, skin);
      const hat = ['#2a2630','#c8302a','#5a6b3f','#d8dce0','#e8dcc0'][E];
      c.fillStyle = hat; c.beginPath(); c.arc(15, 12, 4.9, Math.PI, 0); c.fill();
      if (E===0){ dkR(c, 10.4, 11.6, 9.2, 4, '#2a2630'); dkR(c, 12.2, 12.4, 5.6, 1.2, skin); }            // cagoule
      else if (E===1){ dkR(c, 15.6, 11.6, 6.6, 1.5, hat); }                                              // casquette
      else if (E===2){ dkR(c, 9.6, 11.4, 11, 1.7, shade(hat,0.8)); }                                       // casque lourd
      else if (E===3){ dkR(c, 10.4, 12, 9.6, 2.6, '#40c8ee'); dkR(c, 10.4, 12, 9.6, 0.8, '#bff4ff'); }     // visière
      else { dkR(c, 9.8, 11.4, 10.4, 1.7, '#9a6434'); dkP(c, [14,8, 16,4.2, 18.4,8], '#4a9a3a'); }          // casque clair + feuille
      // arme
      if (kind==='s'){ dkL(c, 15, 21, 29, 14, 3.6, '#5a5a52'); dkR(c, 27.4, 11.4, 3.2, 4.4, '#3a3a34'); }
      else if (kind==='r'){ const gun = E===0? '#7a5a38' : E<=2? '#24242a' : E===3? '#3a4a58' : '#b8a886';
        dkL(c, 14, 20.6, 29, 19, 2.6, gun); dkR(c, 18, 18, 3, 3.6, shade(gun,0.8)); if (E===3) dkR(c, 25, 18.2, 4.4, 1.2, '#40c8ee'); if (E===4) dkR(c, 22, 18, 3.4, 1.2, '#4a9a3a'); }
      else if (kind==='t'){ dkP(c, [21,10, 29,12, 29,22, 25,27, 21,22], E>=3? '#8aa4b4' : '#7a8088'); dkR(c, 24, 14, 1.6, 8, shade(FACTIONS.HUM.eraCols[E],1)); }
      else { dkL(c, 19, 22, 27, 6, 2.2, E===0? '#7a5a38' : '#aab0b8'); dkR(c, 16.8, 20.4, 5, 1.8, '#4a3428'); }
    } else {
      const lite = FACTIONS.IA.eraCols[E], plate = iaPlate(E), dk = '#14181e';
      c.fillStyle = shade(plate,0.85); c.beginPath(); c.ellipse(15, 24, 8, 5.6, 0, Math.PI, 0); c.fill();
      if (E===0){ dkR(c, 9.6, 6.6, 11, 11, plate); dkR(c, 11.4, 9.6, 7.4, 3.6, dk); dkC(c, 15.6, 11.4, 1.5, lite); dkL(c, 13, 6.6, 12, 2, 1.1, '#2a3038'); }
      else if (E===1){ dkP(c, [9.6,7, 20.4,7, 21.4,17, 8.6,17], plate); dkC(c, 12.6, 11.6, 1.9, lite); dkC(c, 18.4, 11.6, 1.9, lite); dkR(c, 11.6, 14.4, 7, 1, dk); }
      else if (E===2){ dkP(c, [8.6,9.4, 15,5, 21.4,9.4, 20.4,17, 9.6,17], plate); dkR(c, 10.6, 10.4, 9.6, 2.8, dk); dkR(c, 11, 11.2, 7, 1.1, lite); dkL(c, 15, 5, 15, 1.4, 1.1, '#2a3038'); }
      else if (E===3){ c.fillStyle = shade(plate,1.1); c.beginPath(); c.arc(15, 14, 6.4, Math.PI, 0); c.fill(); c.fillRect(8.6, 14, 12.8, 3);
        c.strokeStyle = lite; c.lineWidth = 1.2; c.beginPath(); c.ellipse(15, 18.4, 8.4, 2, 0, 0, 6.283); c.stroke(); dkC(c, 16.4, 12.8, 2.2, dk); dkC(c, 16.8, 12.6, 1.3, lite); }
      else { dkP(c, [15,3, 21.4,9, 19.4,17, 10.6,17, 8.6,9], shade(plate,1.25)); dkP(c, [15,3, 21.4,9, 15,10], shade(plate,1.5)); dkC(c, 15.4, 11.6, 2.4, dk); dkC(c, 15.8, 11.4, 1.5, lite); }
      if (kind==='s'){ dkL(c, 16, 21, 29, 14, 4, '#3a424a'); dkR(c, 27.4, 11.4, 3.2, 4.6, dk); }
      else if (kind==='r'){ dkL(c, 18, 20.6, 29, 19.4, 3, plate); dkR(c, 26.4, 18.2, 3.8, 2.6, dk); dkR(c, 21, 19.6, 3, 1, lite); }
      else if (kind==='t'){ dkP(c, [21,10, 29,12, 29,22, 25,27, 21,22], plate); dkR(c, 24.4, 14, 1.4, 8, lite); }
      else { dkL(c, 19, 22, 27, 7, 2.6, plate); dkR(c, 25.6, 4.4, 3, 3.2, lite); }
    }
  });
}
const garKind = (role, range) => role==='siege'? 's' : role==='tank'? 't' : (range>60 || role==='ranged' || role==='support')? 'r' : 'm';
// buste dont les épaules reposent sur y = top (le créneau / le rebord du toit les masque en dessous)
function drawGarBust(fac, era, role, range, gx, top, d, recoil, bob){
  const kind = garKind(role, range), S = garSprite(fac, era, kind);
  ctx.save(); ctx.translate(gx, top+(bob||0)); ctx.scale(d||1, 1); ctx.drawImage(S, -15, -22, 34, 28); ctx.restore();
  if (recoil && kind!=='m' && kind!=='t'){ const mx = gx + (d||1)*(kind==='s'? 15 : 14), my = top+(bob||0)-(kind==='s'? 8 : 3);
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle = fac==='HUM'? '#ffd34a' : '#aef';
    ctx.beginPath(); ctx.arc(mx, my, 3.4, 0, 6.283); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(mx, my, 1.4, 0, 6.283); ctx.fill(); ctx.restore(); }
}
