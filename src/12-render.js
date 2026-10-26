/* ================= RENDU ================= */
// CIEL À TROIS TEINTES (zénith / mi-hauteur / horizon), pour chaque état du monde :
// sain (jour bleu), agonisant (crépuscule violet et braise), mort (nuit de cendres rougeoyante).
const SKY_T=[[74,134,206],[70,52,96],[22,18,28]], SKY_M=[[150,196,228],[214,112,80],[46,34,40]],
      SKY_B=[[240,220,178],[250,170,100],[72,52,46]];
const GRASS=[[116,160,82],[150,120,60],[70,58,50]], DIRT=[[92,74,52],[80,60,44],[48,40,36]];
function devLerp(arr){
  const d=game?game.dev:0;
  return d<0.5? lerpColArr(arr[0],arr[1],d*2) : lerpColArr(arr[1],arr[2],(d-0.5)*2);
}
function lerpColArr(c1,c2,t){ return [lerp(c1[0],c2[0],t),lerp(c1[1],c2[1],t),lerp(c1[2],c2[2],t)]; }
const colS = c => 'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')';
function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
// ADAPTATIF ANTI-DÉBORDEMENT : ajuste ctx.font pour que `text` tienne dans maxW pixels
// (indispensable en i18n — une même case doit accueillir 9 langues de longueurs très
// différentes, ex. l'allemand ou le russe sont souvent 30-50% plus longs que le français).
// Ne réduit jamais sous minPx. Définit ctx.font en effet de bord ; l'appelant dessine ensuite
// normalement avec ctx.fillText(text, ...). Retourne la largeur finale mesurée.
function fitFont(text, maxW, font, minPx){
  ctx.font = font;
  let w = ctx.measureText(text).width;
  if (w <= maxW) return w;
  const m = font.match(/(\d+(?:\.\d+)?)px/);
  const px0 = m? parseFloat(m[1]) : 12;
  minPx = minPx || Math.max(7, px0*0.6);
  let px = Math.max(minPx, px0 * (maxW / w));
  ctx.font = font.replace(/(\d+(?:\.\d+)?)px/, px.toFixed(1)+'px');
  w = ctx.measureText(text).width;
  if (w > maxW && px > minPx){                 // l'estimation proportionnelle rate parfois (kerning) : 2e passe
    px = minPx; ctx.font = font.replace(/(\d+(?:\.\d+)?)px/, px+'px'); w = ctx.measureText(text).width;
  }
  return w;
}

/* ================= BOÎTE À OUTILS PIXEL-ART =================
   Tout est dessiné sur une grille de « gros pixels » pour un rendu néo-rétro net.
   Aucune image externe : sprites 100 % procéduraux, mis en cache hors écran. */
const PX = 3;                                   // taille d'un pixel-bloc (unités monde)
const qz = v => Math.round(v/PX)*PX;            // accroche une coordonnée à la grille
let TC = ctx;                                    // contexte cible courant (écran ou sprite hors écran)
function hexRGB(h){ h=h.replace('#',''); if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
function toRGB(c){ if (Array.isArray(c)) return c;
  if (typeof c==='string'){ if (c[0]==='#') return hexRGB(c);
    const m=c.match(/-?\d+\.?\d*/g); if (m) return [+m[0],+m[1],+m[2]]; }
  return [128,128,128]; }
function shade(c,f){ c=toRGB(c); return 'rgb('+clamp(c[0]*f|0,0,255)+','+clamp(c[1]*f|0,0,255)+','+clamp(c[2]*f|0,0,255)+')'; }
function mix(a,b,t){ a=toRGB(a); b=toRGB(b); return colS(lerpColArr(a,b,t)); }
// bloc accroché à la grille (le cœur du style)
function pb(x,y,w,h,col){ TC.fillStyle=col; TC.fillRect(qz(x),qz(y),Math.max(PX,qz(w)),Math.max(PX,qz(h))); }
// rectangle plein + liseré sombre (donne le contour « pixel »)
function pbo(x,y,w,h,col,line){ x=qz(x); y=qz(y); w=Math.max(PX,qz(w)); h=Math.max(PX,qz(h));
  TC.fillStyle=line||shade(col,0.45); TC.fillRect(x-PX,y-PX,w+PX*2,h+PX*2);
  TC.fillStyle=col; TC.fillRect(x,y,w,h); }
// cache de sprites hors écran : key -> canvas. draw() utilise pb/pbo/… qui ciblent TC.
// SURÉCHANTILLONNAGE : on cuit chaque sprite à SS× la taille logique (≈ densité de pixels de
// l'écran) puis on le blitte à sa taille logique → net en 4K au lieu d'un bitmap basse-déf
// agrandi et flou. SS dépend de SCALE (densité réelle) ; la clé l'inclut → recuisson au resize.
const SPR = new Map();
const spriteSS = ()=> Math.max(2, Math.min(4, Math.ceil(SCALE||2)));
// CONTOUR SOMBRE cuit dans chaque sprite d'unité : sur le champ de bataille clair, les
// silhouettes se détachent enfin (surtout dans les mêlées). La silhouette vient d'un second
// rendu SANS halos néon (BLOOM_OFF) : dilater la version avec halos aurait laissé des bavures
// sombres autour de chaque lueur. Coût payé UNE fois à la cuisson (préchauffée au lancement),
// zéro par frame.
let BLOOM_OFF = false;
const SPR_SCRATCH = new Map();   // toiles de travail réutilisées pour les silhouettes (une par taille)
function sprite(key, w, h, draw){
  const SS = spriteSS(), k = key+'@'+SS;
  let s = SPR.get(k);
  if (!s){
    const cw = Math.ceil(w*SS), ch = Math.ceil(h*SS);
    // dessine le sprite dans une toile donnée (état remis à neuf avant/après : draw() peut
    // laisser l'état déséquilibré sans polluer la suite)
    const into = cv => { const c=cv.getContext('2d'); c.save(); c.imageSmoothingEnabled=true; c.setTransform(SS,0,0,SS,0,0);
      const prev=TC; TC=c; try { draw(c, cv); } finally { TC=prev; c.restore(); } };
    // 1) silhouette sans halos, dans une toile de travail RÉUTILISÉE (pas d'allocation par sprite)
    const sk = cw+'x'+ch; let sil = SPR_SCRATCH.get(sk);
    if (!sil){ sil=document.createElement('canvas'); sil.width=cw; sil.height=ch; SPR_SCRATCH.set(sk, sil); }
    else sil.getContext('2d').clearRect(0,0,cw,ch);
    BLOOM_OFF = true; try { into(sil); } finally { BLOOM_OFF = false; }
    // 2) contour : silhouette dilatée puis teintée, dans la toile finale
    s = document.createElement('canvas'); s.width = cw; s.height = ch;
    const oc = s.getContext('2d'), d = Math.max(1, Math.round(SS*0.9));
    for (const [dx,dy] of [[-d,0],[d,0],[0,-d],[0,d],[-d,-d],[d,-d],[-d,d],[d,d]]) oc.drawImage(sil, dx, dy);
    oc.globalCompositeOperation='source-in'; oc.fillStyle='rgba(12,8,16,0.8)'; oc.fillRect(0,0,cw,ch);
    oc.globalCompositeOperation='source-over';
    // 3) sprite complet (halos compris) par-dessus, directement dans la toile finale
    into(s);
    SPR.set(k,s);
  }
  return s;
}

/* ====== CINÉMATIQUE v3 : profondeur de champ, monde vivant, dégradation, post-FX ====== */
// support du flou canvas (Safari ancien ne l'a pas → dégradation gracieuse, aucun crash)
const CANF = (()=>{ try{ const c=document.createElement('canvas').getContext('2d');
  c.filter='blur(1px)'; return c.filter==='blur(1px)'; }catch(e){ return false; } })();
const qHi = ()=> SETTINGS.quality==='high' || SETTINGS.quality==='ultra';
// GRAIN FILMIQUE : bruit pré-cuit, tuilé avec un décalage aléatoire par frame
let GRAIN=null;
function grainCanvas(){
  if (GRAIN) return GRAIN;
  GRAIN=document.createElement('canvas'); GRAIN.width=GRAIN.height=160;
  const c=GRAIN.getContext('2d'), im=c.createImageData(160,160);
  for (let i=0;i<im.data.length;i+=4){ const v=128+((Math.random()*64-32)|0);
    im.data[i]=im.data[i+1]=im.data[i+2]=v; im.data[i+3]=255; }
  c.putImageData(im,0,0); return GRAIN;
}
// ÉTALONNAGE + GRAIN (écran entier, après la vignette) : ombres teal, hautes lumières
// chaudes, grain discret — le « look film » post-apocalyptique, purement cosmétique.
// PERF : tout est PRÉ-CUIT dans deux canvas (rebâtis au resize seulement) et blitté en
// source-over — plus AUCUN multiply/overlay plein écran par frame (c'était le grand
// responsable de la lenteur en Élevé/Ultra).
let GRADE=null, GRAINBIG=null, GRADEKEY='';
function drawFilmGrade(){
  if (!qHi()) return;
  const key = Math.ceil(W)+'x'+Math.ceil(H);
  if (GRADEKEY!==key){
    GRADEKEY=key;
    GRADE=document.createElement('canvas');
    GRADE.width=Math.max(2,Math.ceil(W/2)); GRADE.height=Math.max(2,Math.ceil(H/2));
    const c=GRADE.getContext('2d');
    // approximation source-over du grade multiply/screen : même perception, coût nul
    const sh=c.createLinearGradient(0,GRADE.height*0.45,0,GRADE.height);
    sh.addColorStop(0,'rgba(8,38,50,0)'); sh.addColorStop(1,'rgba(8,38,50,0.11)');       // ombres froides en bas
    c.fillStyle=sh; c.fillRect(0,0,GRADE.width,GRADE.height);
    const hl=c.createLinearGradient(0,0,0,GRADE.height*0.5);
    hl.addColorStop(0,'rgba(255,190,90,0.075)'); hl.addColorStop(1,'rgba(255,190,90,0)'); // hautes lumières dorées
    c.fillStyle=hl; c.fillRect(0,0,GRADE.width,GRADE.height*0.5);
    // grain pré-tuilé en 2× : la « vibration » par frame n'est plus qu'un décalage de blit
    GRAINBIG=document.createElement('canvas');
    GRAINBIG.width=Math.ceil(W)+160; GRAINBIG.height=Math.ceil(H)+160;
    const g2=GRAINBIG.getContext('2d'), gg=grainCanvas();
    for (let y=0;y<GRAINBIG.height;y+=160) for (let x=0;x<GRAINBIG.width;x+=160) g2.drawImage(gg,x,y);
  }
  ctx.drawImage(GRADE, 0, 0, W, H);
  ctx.save(); ctx.globalAlpha=0.030;
  ctx.drawImage(GRAINBIG, -((Math.random()*160)|0), -((Math.random()*160)|0));
  ctx.restore();
}
/* ---- MONDE VIVANT : événements de fond aléatoires (100 % cosmétiques, aucun gameplay) ----
   Avions/hélicos qui traversent le ciel et s'écrasent à l'horizon, voitures qui explosent
   dans la ville lointaine ; les épaves laissent des COLONNES DE FUMÉE persistantes. Plus le
   monde agonise (game.dev), plus ces chutes sont fréquentes : la carte SE DÉGRADE sous vos yeux. */
const AMB = { last:0, next:14, ev:null, smokes:[], fires:[] };
function ambReset(){ AMB.ev=null; AMB.smokes.length=0; AMB.fires.length=0; AMB.last=0; AMB.next=10+Math.random()*18; }
function drawAmbient(t, dev, vw){
  if (!qFx()) return;
  const dt = clamp(t-AMB.last, 0, 0.1); AMB.last = t;
  // apparition : rare monde sain, fréquente monde mourant
  if (!AMB.ev && t>AMB.next){
    const roll = Math.random();
    if (roll < 0.45+dev*0.45){
      // monde SAIN : vie paisible (jet de ligne, migration d'oiseaux, montgolfière) ;
      // monde MOURANT : les mêmes cieux ne charrient plus que des chutes et des flammes.
      const kinds = dev<0.22? ['jet','flock','balloon','jet','flock']
                  : dev<0.5?  ['jet','flock','plane','heli','carfire','balloon']
                  :           ['plane','heli','carfire','plane','heli'];
      const k = kinds[(Math.random()*kinds.length)|0];
      const dir = Math.random()<0.5? 1:-1;
      const durs = { plane:7.5, heli:9, carfire:0.8, jet:13, flock:19, balloon:27 };
      AMB.ev = { k, t:0, dir, dur:durs[k], y: 46+Math.random()*80, cx: WORLD*(0.2+Math.random()*0.6) };
    }
    AMB.next = t + lerp(26, 11, dev) + Math.random()*18;
  }
  if (AMB.ev){
    const e=AMB.ev; e.t += dt;
    if (e.t>=e.dur){
      // CRASH (avion/hélico) : flash + colonne de fumée persistante ; voiture : brasier ;
      // les événements paisibles (jet, oiseaux, montgolfière) sortent simplement du cadre.
      if (e.k==='plane'||e.k==='heli'){
        if (AMB.smokes.length<4) AMB.smokes.push({cx:e.cx, t:0, life:50+Math.random()*25});
        addLight(e.cx, GROUND-140, '#ff9a4a', 130, 0.6);
      } else if (e.k==='carfire' && AMB.fires.length<3) AMB.fires.push({cx:e.cx, t:0, life:26});
      AMB.ev=null;
    } else drawAmbEvent(e, vw);
  }
  // colonnes de fumée des épaves (parallaxe lointaine 0.55)
  for (let i=AMB.smokes.length-1;i>=0;i--){
    const s=AMB.smokes[i]; s.t+=dt;
    if (s.t>s.life){ AMB.smokes.splice(i,1); continue; }
    const x=s.cx-camX*0.55, a=clamp(1-s.t/s.life,0,1)*0.5*(1-dev*0.3);
    if (x<-80||x>vw+80) continue;
    for (let p2=0;p2<5;p2++){
      const ph=((t*0.22+p2*0.2+s.cx*0.01)%1), py=GROUND-152-ph*95, drift=Math.sin(t*0.5+p2*2)*8*ph;
      ctx.fillStyle='rgba(46,40,42,'+(a*(1-ph)).toFixed(3)+')';
      ctx.beginPath(); ctx.arc(x+drift+p2*3, py, 6+ph*17, 0, 6.283); ctx.fill();
    }
    if (s.t<7){ ctx.save(); ctx.globalCompositeOperation='lighter';                     // foyer encore incandescent
      ctx.fillStyle='rgba(255,120,40,'+(0.35*(1-s.t/7)).toFixed(3)+')';
      ctx.beginPath(); ctx.ellipse(x,GROUND-148,10,4,0,0,6.283); ctx.fill(); ctx.restore(); }
  }
  // voitures en feu dans la ville lointaine (parallaxe 0.7)
  for (let i=AMB.fires.length-1;i>=0;i--){
    const f=AMB.fires[i]; f.t+=dt;
    if (f.t>f.life){ AMB.fires.splice(i,1); continue; }
    const x=f.cx-camX*0.7; if (x<-40||x>vw+40) continue;
    const a=clamp(1-f.t/f.life,0,1);
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const fl=Math.abs(Math.sin(t*7+f.cx));
    ctx.fillStyle='rgba(255,'+(120+60*fl|0)+',50,'+(0.5*a).toFixed(3)+')';
    ctx.beginPath(); ctx.ellipse(x, GROUND-6, 5, 3+fl*4, 0, 0, 6.283); ctx.fill();
    ctx.restore();
    ctx.fillStyle='rgba(40,36,38,'+(0.4*a).toFixed(3)+')';
    for (let p2=0;p2<3;p2++){ const ph=((t*0.4+p2*0.33)%1);
      ctx.beginPath(); ctx.arc(x+Math.sin(t+p2)*4*ph, GROUND-10-ph*46, 3+ph*7, 0, 6.283); ctx.fill(); }
  }
}
function drawAmbEvent(e, vw){
  const k2 = e.t/e.dur, dev=game?game.dev:0;
  if (e.k==='carfire'){                                       // flash bref dans la ville
    const x=e.cx-camX*0.7; if (x<-60||x>vw+60) return;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    ctx.fillStyle='rgba(255,190,110,'+(0.8*(1-k2)).toFixed(3)+')';
    ctx.beginPath(); ctx.arc(x, GROUND-10, 4+k2*22, 0, 6.283); ctx.fill(); ctx.restore();
    return;
  }
  if (e.k==='jet'){                                           // avion de ligne à haute altitude + traînée
    const px = lerp(e.dir>0? -60:vw+60, e.dir>0? vw+60:-60, k2), py = e.y*0.6+18;
    ctx.save();
    const tg=ctx.createLinearGradient(px-e.dir*180,py,px,py);  // traînée de condensation qui s'estompe
    tg.addColorStop(0,'rgba(255,255,255,0)'); tg.addColorStop(1,'rgba(255,255,255,0.30)');
    ctx.strokeStyle=tg; ctx.lineWidth=2.2; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(px-e.dir*180, py+2); ctx.lineTo(px, py+1); ctx.stroke();
    ctx.fillStyle='rgba(235,240,248,0.85)';
    ctx.save(); ctx.translate(px,py); ctx.scale(e.dir,1);
    ctx.beginPath(); ctx.ellipse(0,0,7,1.6,0,0,6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-1,0); ctx.lineTo(-4,3); ctx.lineTo(-2.4,0); ctx.closePath(); ctx.fill();
    ctx.restore(); ctx.restore();
    return;
  }
  if (e.k==='flock'){                                         // grande migration d'oiseaux en V
    const px = lerp(e.dir>0? -120:vw+120, e.dir>0? vw+120:-120, k2), py = e.y+Math.sin(e.t*0.6)*8;
    ctx.strokeStyle='rgba(26,22,28,0.6)'; ctx.lineWidth=1.7; ctx.lineCap='round';
    for (let b2=0;b2<9;b2++){
      const row=Math.ceil(b2/2), side2=(b2%2? 1:-1);
      const bx=px - e.dir*row*13, by2=py + side2*row*7 + Math.sin(e.t*3+b2)*1.5;
      const w2=Math.sin(e.t*7+b2*1.3)*3.4;
      ctx.beginPath(); ctx.moveTo(bx-4,by2); ctx.quadraticCurveTo(bx,by2-3+w2,bx+4,by2); ctx.stroke();
    }
    return;
  }
  if (e.k==='balloon'){                                       // montgolfière qui dérive paisiblement
    const px = lerp(e.dir>0? -50:vw+50, e.dir>0? vw+50:-50, k2), py = e.y+Math.sin(e.t*0.5)*6;
    ctx.save();
    ctx.fillStyle='rgba(196,88,60,0.85)';
    ctx.beginPath(); ctx.arc(px, py, 10, Math.PI*0.95, Math.PI*0.05); ctx.quadraticCurveTo(px+6,py+9,px+2.6,py+13);
    ctx.lineTo(px-2.6,py+13); ctx.quadraticCurveTo(px-6,py+9,px-10,py+1); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(230,200,140,0.85)'; ctx.fillRect(px-3.6, py+2-10, 2.6, 11);   // bande claire du ballon
    ctx.strokeStyle='rgba(60,44,32,0.8)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(px-2.6,py+13); ctx.lineTo(px-2,py+17); ctx.moveTo(px+2.6,py+13); ctx.lineTo(px+2,py+17); ctx.stroke();
    ctx.fillStyle='rgba(96,70,46,0.9)'; ctx.fillRect(px-3, py+17, 6, 4.4);            // nacelle
    ctx.restore();
    return;
  }
  // trajectoire : traversée du ciel puis PIQUÉ final vers l'horizon (à parallaxe 0.55)
  const cxS = e.cx - camX*0.55;
  const entry = e.dir>0? -140 : vw+140;
  const dive = clamp((k2-0.62)/0.38, 0, 1);                  // dernière phase : chute
  const px = lerp(entry, cxS, clamp(k2/0.9,0,1));
  const py = lerp(e.y, GROUND-150, dive*dive) + Math.sin(e.t*2.2)*3*(1-dive);
  const tilt = e.dir*(0.06+dive*0.9);
  if (px<-160||px>vw+160) return;
  ctx.save(); ctx.translate(px,py); ctx.rotate(tilt); ctx.scale(e.dir,1);
  ctx.fillStyle='rgba(30,30,38,0.92)';
  if (e.k==='plane'){                                         // silhouette d'avion de ligne
    ctx.beginPath(); ctx.ellipse(0,0,17,3.4,0,0,6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2,0); ctx.lineTo(-10,7); ctx.lineTo(-5,0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-2,0); ctx.lineTo(-9,-6); ctx.lineTo(-5,0); ctx.closePath(); ctx.fill();
    ctx.fillRect(-17,-4.6,4,4);
  } else {                                                    // hélicoptère
    ctx.beginPath(); ctx.ellipse(0,0,9,4,0,0,6.283); ctx.fill();
    ctx.fillRect(-16,-1.4,10,2.4);
    const r=Math.abs(Math.sin(e.t*14))*14;
    ctx.strokeStyle='rgba(30,30,38,0.7)'; ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.moveTo(-r,-5); ctx.lineTo(r,-5); ctx.stroke();
  }
  ctx.restore();
  // panache de fumée / feu dès que l'appareil est condamné
  if (k2>0.3){
    ctx.fillStyle='rgba(50,44,46,'+(0.35*clamp((k2-0.3)*3,0,1)).toFixed(3)+')';
    for (let i2=1;i2<=4;i2++){ const bx=px-e.dir*i2*13, by=py-i2*2*(1-dive)+dive*i2*6;
      ctx.beginPath(); ctx.arc(bx, by, 2.5+i2*1.8, 0, 6.283); ctx.fill(); }
    if (k2>0.55){ ctx.save(); ctx.globalCompositeOperation='lighter';
      ctx.fillStyle='rgba(255,140,60,0.55)'; ctx.beginPath(); ctx.arc(px-e.dir*6, py, 3.4, 0, 6.283); ctx.fill(); ctx.restore(); }
  }
}
// FISSURES DU SOL : le terrain se craquèle à mesure que le monde meurt (dev) — cosmétique
function drawCracks(dev, vw){
  const a = clamp((dev-0.28)*1.3, 0, 0.5); if (a<=0.02) return;
  ctx.strokeStyle='rgba(16,10,8,'+a.toFixed(3)+')'; ctx.lineWidth=1.6; ctx.lineCap='round';
  for (let wx=Math.floor(camX/300)*300; wx<camX+vw+300; wx+=300){
    const h1=Math.abs(Math.sin(wx*0.769))%1; if (h1>0.62) continue;      // toutes les fissures ne « prennent » pas
    const wx2=wx+h1*160, x=wx2-camX, gy=gY(wx2)+4;
    ctx.beginPath(); ctx.moveTo(x,gy);
    let px2=x, py2=gy;
    for (let s2=0;s2<4;s2++){ px2+=6+h1*14; py2+=5+((h1*97+s2*37)%9); ctx.lineTo(px2,py2); }
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+8,gy+6); ctx.lineTo(x+14+h1*8, gy+2); ctx.stroke();   // ramification
  }
}
/* ---------- écran-titre : dystopie animée ---------- */
/* ---------- INTRO : le lore en quatre tableaux ---------- */
function introText(lines, y){
  ctx.textAlign='center';
  const bh = lines.length*26+30;
  const g=ctx.createLinearGradient(0,y-22,0,y-22+bh);
  g.addColorStop(0,'rgba(8,6,10,0)'); g.addColorStop(0.16,'rgba(8,6,10,0.72)');
  g.addColorStop(0.84,'rgba(8,6,10,0.72)'); g.addColorStop(1,'rgba(8,6,10,0)');
  ctx.fillStyle=g; ctx.fillRect(0, y-22, W, bh);
  ctx.font='italic 17px Georgia';
  for (let i=0;i<lines.length;i++){
    const ap = clamp(introT*1.5 - 0.2 - i*0.28, 0, 1);     // apparition ligne par ligne (plus animé)
    ctx.globalAlpha=ap; ctx.fillStyle='#e8dfd0';
    ctx.shadowColor='rgba(0,0,0,0.85)'; ctx.shadowBlur=4;
    ctx.fillText(lines[i], W/2, y+8+i*26, W-60);
  }
  ctx.globalAlpha=1; ctx.shadowBlur=0;
}
function drawIntroTower(x, baseY, hue, glitch, t){
  ctx.fillStyle=lgrad(x-70,baseY-340,x+70,baseY,[[0,'#171d30'],[1,'#0b0f1a']]); ctx.fillRect(x-70,baseY-340,140,340);
  ctx.fillStyle='#1b2338'; ctx.fillRect(x-52,baseY-380,104,40);
  for (let r=0;r<14;r++) for (let c=0;c<5;c++){
    const lit=((r*5+c)*2654435761>>>0)%10<6, gl=glitch>0&&Math.random()<glitch*0.4;
    if (gl||lit){ const col=gl?'#ff4ad0':(glitch>0.5?'rgba(255,74,208,'+(0.4+0.4*glitch)+')':'rgba(140,210,240,0.85)');
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.shadowColor=col; ctx.shadowBlur=5; ctx.fillStyle=col;
      ctx.fillRect(x-58+c*24, baseY-326+r*22, 14, 10); ctx.restore(); }
    else { ctx.fillStyle='rgba(30,38,56,0.9)'; ctx.fillRect(x-58+c*24, baseY-326+r*22, 14, 10); }
  }
  const flick=glitch>0.4&&Math.sin(t*22)>0.4, col=flick?'#ff4ad0':glitch>0.4?'rgba(255,74,208,0.9)':'#8ad4f0';
  bloomT(col,14,()=>{ ctx.font='700 46px Georgia'; ctx.textAlign='center'; ctx.fillStyle=col; ctx.fillText('Ω', x, baseY-344); });
  ctx.font='10px Arial'; ctx.fillStyle='rgba(170,200,220,0.7)'; ctx.fillText('OMNICORP', x, baseY-330);
  if (glitch>0) for (let i=0;i<6*glitch;i++){ const gy2=baseY-340+Math.random()*330, gw=20+Math.random()*100;
    ctx.fillStyle='rgba(255,74,208,'+(0.12+Math.random()*0.25)+')'; ctx.fillRect(x-70+Math.random()*40, gy2, gw, 2+Math.random()*3); }
}
// barres cinéma + vignette pour un cachet « film »
function introFrame(){
  const bar=26; ctx.fillStyle='#000'; ctx.fillRect(0,0,W,bar); ctx.fillRect(0,H-bar,W,bar);
  const vg=ctx.createRadialGradient(W/2,H/2,H*0.45,W/2,H/2,H*0.95);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.5)'); ctx.fillStyle=vg; ctx.fillRect(0,0,W,H);
}
function drawIntro(dt){
  introT += dt;
  const t = introT;
  ctx.fillStyle='#0d0a0a'; ctx.fillRect(0,0,W,H);
  const baseY = 430, fade = clamp(introT*1.2, 0, 1);
  if (intro===0){
    // — 1. la corpo possède tout —
    ctx.fillStyle=lgrad(0,0,0,baseY,[[0,'#0a0e1c'],[1,'#1c2030']]); ctx.fillRect(0,0,W,baseY);
    ctx.fillStyle='#08080c'; ctx.fillRect(0,baseY,W,H-baseY);
    // skyline en deux plans (parallaxe douce)
    ctx.fillStyle='#0e1018'; for (let i=0;i<12;i++){ const bh2=30+((i*41)%70); ctx.fillRect(i*84-(t*4%84), baseY-bh2, 64, bh2); }
    ctx.fillStyle='#14161f'; for (let i=0;i<10;i++){ const bh2=40+((i*53)%90); ctx.fillRect(30+i*92, baseY-bh2, 50, bh2); }
    drawIntroTower(W/2, baseY, 0, 0, t);
    // projecteur balayant depuis la tour (additif)
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const sa=Math.sin(t*0.5)*0.5; const sg=ctx.createLinearGradient(W/2,baseY-300,W/2+Math.sin(sa)*300,baseY);
    sg.addColorStop(0,'rgba(150,210,240,0.18)'); sg.addColorStop(1,'rgba(150,210,240,0)');
    ctx.fillStyle=sg; ctx.beginPath(); ctx.moveTo(W/2,baseY-300); ctx.lineTo(W/2+Math.sin(sa)*300-60,baseY); ctx.lineTo(W/2+Math.sin(sa)*300+60,baseY); ctx.closePath(); ctx.fill();
    // drones avec faisceau lumineux
    for (let i=0;i<3;i++){ const a=t*0.5+i*2.1, dx=W/2+Math.cos(a)*210, dy=150+Math.sin(a*1.3)*40;
      ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(120,200,235,0.12)';
      ctx.beginPath(); ctx.moveTo(dx,dy+3); ctx.lineTo(dx-16,baseY); ctx.lineTo(dx+16,baseY); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation='source-over'; ctx.fillStyle='#28364c';
      ctx.beginPath(); ctx.moveTo(dx+8,dy); ctx.lineTo(dx,dy-4); ctx.lineTo(dx-8,dy); ctx.lineTo(dx,dy+4); ctx.closePath(); ctx.fill();
      bloomT('#8ad4f0',6,()=>{ ctx.fillStyle='#8ad4f0'; ctx.fillRect(dx-1,dy-1,2,2); }); }
    ctx.restore();
    // foule soumise
    ctx.fillStyle='#06060a';
    for (let i=0;i<10;i++){ const px=110+i*50+Math.sin(t+i)*1.5;
      ctx.fillRect(px-3, baseY-14, 6, 14); ctx.beginPath(); ctx.arc(px, baseY-17, 3.4, 0, 6.28); ctx.fill(); }
    introText(_t('lore0'), 458);
  } else if (intro===1){
    // — 2. l'éveil de l'AGI —
    ctx.fillStyle=lgrad(0,0,0,baseY,[[0,'#14060f'],[1,'#1c0a18']]); ctx.fillRect(0,0,W,baseY);
    ctx.fillStyle='#08080c'; ctx.fillRect(0,baseY,W,H-baseY);
    // pluie de code (additive, lumineuse)
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.font='11px monospace';
    for (let i=0;i<54;i++){ const cx2=(i*73)%W, cy2=((t*70+i*97)%(baseY+40))-20, a=0.2+0.5*((i*7)%5)/5;
      ctx.fillStyle='rgba(255,90,210,'+a+')'; ctx.fillText(String((i*7)%2), cx2, cy2); }
    ctx.restore();
    drawIntroTower(W/2, baseY, 0, clamp(t*0.5,0.3,1), t);
    // l'œil géant s'ouvre, avec halo
    const open = clamp(t*0.6-0.2, 0, 1);
    bloomT('#ff4ad0', 24, ()=>{
      ctx.fillStyle='#eef6ff'; ctx.beginPath(); ctx.ellipse(W/2,180,58,32*open,0,0,6.28); ctx.fill();
      if (open>0.2){ ctx.fillStyle='#ff4ad0'; ctx.beginPath(); ctx.arc(W/2,180,18*open,0,6.28); ctx.fill();
        ctx.fillStyle='#0a1018'; ctx.beginPath(); ctx.arc(W/2,180,8*open,0,6.28); ctx.fill(); }
    });
    if (open>0.4){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle='rgba(255,74,208,0.4)'; ctx.lineWidth=2;
      for (let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(W/2,180,66+i*18+Math.sin(t*2+i)*4,0,6.28); ctx.stroke(); } ctx.restore(); }
    introText(_t('lore1'), 458);
  } else if (intro===2){
    // — 3. la résistance —
    ctx.fillStyle=lgrad(0,0,0,baseY,[[0,'#16100e'],[1,'#3a241c']]); ctx.fillRect(0,0,W,baseY);
    ctx.fillStyle='#0c0908'; ctx.fillRect(0,baseY,W,H-baseY);
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,240,220,0.55)';
    for (let i=0;i<28;i++){ const tw=0.5+0.5*Math.sin(t*2+i); ctx.globalAlpha=0.3+tw*0.5; ctx.fillRect((i*157)%W,(i*89)%190,1.6,1.6);} ctx.globalAlpha=1; ctx.restore();
    ctx.fillStyle='#100c0c';
    for (let i=0;i<8;i++){ const bh2=50+((i*67)%80), bx2=20+i*120;
      ctx.beginPath(); ctx.moveTo(bx2,baseY); ctx.lineTo(bx2,baseY-bh2);
      ctx.lineTo(bx2+18,baseY-bh2+14); ctx.lineTo(bx2+34,baseY-bh2-8); ctx.lineTo(bx2+52,baseY-bh2+20);
      ctx.lineTo(bx2+52,baseY); ctx.closePath(); ctx.fill(); }
    const fx=W/2-90, fy=baseY-4;
    // halo de feu
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const glow=ctx.createRadialGradient(fx,fy-12,4,fx,fy-12,120); glow.addColorStop(0,'rgba(255,150,60,0.5)'); glow.addColorStop(1,'rgba(255,150,60,0)');
    ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(fx,fy-12,120,0,6.28); ctx.fill();
    // flammes
    for (let i=0;i<5;i++){ const fl=Math.abs(Math.sin(t*5+i*1.7));
      ctx.fillStyle=i%2?'rgba(255,150,60,'+(0.5+fl*0.4)+')':'rgba(255,210,90,'+(0.4+fl*0.5)+')';
      ctx.beginPath(); ctx.moveTo(fx-8+i*4,fy-2); ctx.quadraticCurveTo(fx-8+i*4+Math.sin(t*6+i)*4,fy-14-fl*18,fx-6+i*4,fy-2); ctx.closePath(); ctx.fill(); }
    // braises qui montent
    for (let i=0;i<14;i++){ const ey=(t*40+i*53)%150, a=1-ey/150; ctx.fillStyle='rgba(255,170,80,'+(a*0.7)+')';
      ctx.fillRect(fx+Math.sin(t*2+i)*18, fy-10-ey, 2, 2); }
    ctx.restore();
    ctx.fillStyle='#2c2018'; ctx.fillRect(fx-14,fy-3,28,4);
    // silhouettes (poing levé)
    ctx.fillStyle='#0a0808';
    for (const [px,fist] of [[fx+44,1],[fx+74,0],[fx+100,0.5]]){
      ctx.fillRect(px-4,baseY-26,8,26); ctx.beginPath(); ctx.arc(px,baseY-31,4.6,0,6.28); ctx.fill();
      if (fist===1){ ctx.save(); ctx.lineWidth=4; ctx.strokeStyle='#0a0808'; ctx.beginPath(); ctx.moveTo(px+3,baseY-22); ctx.lineTo(px+11,baseY-40); ctx.stroke(); ctx.beginPath(); ctx.arc(px+12,baseY-42,3,0,6.28); ctx.fill(); ctx.restore(); } }
    // drapeau rouge
    const flx=fx+140; ctx.strokeStyle='#3a2a20'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(flx,baseY); ctx.lineTo(flx,baseY-80); ctx.stroke();
    const wv=Math.sin(t*3)*4; ctx.fillStyle='#d4281e';
    ctx.beginPath(); ctx.moveTo(flx,baseY-80); ctx.quadraticCurveTo(flx+22,baseY-76+wv,flx+42,baseY-70+wv); ctx.lineTo(flx,baseY-58); ctx.closePath(); ctx.fill();
    introText(_t('lore2'), 458);
  } else {
    // — 4. carton-titre —
    ctx.fillStyle=lgrad(0,0,0,H,[[0,'#120a0a'],[1,'#080606']]); ctx.fillRect(0,0,W,H);
    // traits de lumière montants
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for (let i=0;i<12;i++){ const lx=(i*83+t*30)%W, a=0.04+0.05*Math.sin(t*1.5+i); ctx.fillStyle='rgba(255,120,70,'+a+')'; ctx.fillRect(lx,120,2,200); }
    ctx.restore();
    ctx.textAlign='center';
    const pulse=0.5+0.5*Math.sin(t*1.6);
    bloomT('#ff5a3a', 18+pulse*10, ()=>{ ctx.font='700 124px Arial Narrow, Arial'; ctx.fillStyle='#e8e0d2'; ctx.fillText('AGI', W/2, 244); });
    ctx.font='700 124px Arial Narrow, Arial'; ctx.fillStyle='rgba(255,90,58,0.25)'; ctx.fillText('AGI', W/2+3, 247);
    ctx.font='14px Arial'; ctx.fillStyle='#c8a888'; ctx.fillText(_t('lore_sub'), W/2, 286, W-70);
    ctx.font='italic 15px Georgia'; ctx.fillStyle='rgba(232,224,212,'+(0.5+0.4*pulse)+')'; ctx.fillText(_t('lore_enter'), W/2, 362);
  }
  if (fade<1){ ctx.fillStyle='rgba(8,6,10,'+(1-fade)+')'; ctx.fillRect(0,0,W,H); }   // fondu d'entrée par tableau
  introFrame();
  // bouton PASSER + indication
  const isr = INTRO_SKIP();
  ctx.fillStyle='rgba(16,13,12,0.85)'; rr(isr.x,isr.y,isr.w,isr.h,5); ctx.fill();
  ctx.strokeStyle='#4a3a32'; ctx.lineWidth=1; rr(isr.x,isr.y,isr.w,isr.h,5); ctx.stroke();
  ctx.font='700 12px Arial'; ctx.textAlign='center'; ctx.fillStyle='#b8b0a4';
  ctx.fillText(_t('skip')+' ▸', isr.x+isr.w/2, isr.y+isr.h/2+1);
  if (intro<3){ ctx.font='11px Arial'; ctx.fillStyle='rgba(184,176,164,0.6)';
    ctx.fillText('▸ '+_t('tap_continue')+'  ·  '+(intro+1)+' / 4', W/2, H-14); }
}
function advanceIntro(){
  if (intro>=3){ finishIntro(); return; }
  intro++; introT = 0; sfx('sel');
}
function finishIntro(){
  intro = -1;
  if (pendingStart){ newGame(pendingStart.fac, pendingStart.diff, false); pendingStart=null; }
}

let menuT = 0, menuFacMix = 0;
function drawMenuScene(dt){
  menuT += dt;
  const t = menuT;
  // SÉLECTION CINÉMATIQUE : la scène vire vers la couleur du camp choisi (rouge ↔ cyan).
  const target = (typeof menuFac!=='undefined' && menuFac==='IA')? 1 : 0;
  menuFacMix += (target - menuFacMix) * Math.min(1, dt*3);
  const mx = menuFacMix;
  const mix = (a,b)=>Math.round(a+(b-a)*mx);
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'rgb('+mix(26,8)+','+mix(14,16)+','+mix(12,26)+')');
  g.addColorStop(0.55,'rgb('+mix(58,12)+','+mix(24,30)+','+mix(18,52)+')');
  g.addColorStop(1,'#0d0a0a');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // soleil immense (rouge Commune ↔ halo cyan de la Singularité)
  ctx.fillStyle='rgb('+mix(168,40)+','+mix(40,150)+','+mix(30,210)+')'; ctx.beginPath(); ctx.arc(W*0.62, 200, 110, 0, 6.28); ctx.fill();
  ctx.fillStyle='rgb('+mix(122,24)+','+mix(26,96)+','+mix(18,150)+')'; ctx.beginPath(); ctx.arc(W*0.62, 200, 80, 0, 6.28); ctx.fill();
  // skyline 3 couches qui défilent lentement
  for (let layer=0; layer<3; layer++){
    const spd = 4+layer*5, base = 290+layer*55, alpha = 0.35+layer*0.3;
    ctx.fillStyle = 'rgba('+(14+layer*8)+','+(9+layer*5)+','+(9+layer*4)+','+alpha+')';
    const off = (t*spd)%160;
    for (let i=-1;i<8;i++){
      const bx = i*160-off, bw = 70+((i*53+layer*31)%60), bh = 90+((i*97+layer*61)%150);
      ctx.fillRect(bx, base-bh, bw, bh+200);
      if (layer===2 && ((i+Math.floor(t*spd/160))%3===0)){
        ctx.fillStyle='rgba(232,160,106,'+(0.25+0.2*Math.sin(t*3+i))+')';
        for(let wy=0; wy<bh-20; wy+=22) ctx.fillRect(bx+10, base-bh+10+wy, 8, 9);
        ctx.fillStyle='rgba(30,19,17,'+alpha+')';
      }
    }
  }
  // courbe boursière qui s'effondre
  ctx.strokeStyle='rgba(216,72,58,0.85)'; ctx.lineWidth=2.5;
  ctx.beginPath();
  for (let x=0;x<=W;x+=20){
    const ph = (x+t*40)*0.02;
    const yv = 120 + x*0.16 + Math.sin(ph)*18 + Math.sin(ph*2.7)*9;
    x===0? ctx.moveTo(x,yv) : ctx.lineTo(x,yv);
  }
  ctx.stroke();
  ctx.fillStyle='rgba(216,72,58,0.85)'; ctx.font='14px Arial';
  ctx.textAlign='left'; ctx.fillText(fmt('mkt_crash',{pct:38+Math.floor(8*Math.sin(t*0.7))}), 16, 108);
  // pluie de symboles du capital
  ctx.font='15px Georgia'; ctx.textAlign='center';
  const GL = ['$','€','¥','▼','£','◈'];
  for (let i=0;i<26;i++){
    const fx = (i*167+i*i*13)%W, fy = ((t*(34+i%5*9))+i*120)%(H+40)-20;
    ctx.fillStyle = 'rgba(184,154,122,'+(0.12+(i%4)*0.07)+')';
    ctx.fillText(GL[i%GL.length], fx, fy);
  }
  // smog
  for (let i=0;i<3;i++){
    ctx.fillStyle='rgba(20,12,10,'+(0.13+i*0.05)+')';
    const sy2 = 320+i*60+Math.sin(t*0.3+i)*8;
    ctx.beginPath(); ctx.ellipse((t*8+i*340)%(W+400)-200, sy2, 260, 26, 0, 0, 6.28); ctx.fill();
  }
  // braises qui montent + étoiles scintillantes : le menu VIT (additif discret)
  ctx.save(); ctx.globalCompositeOperation='lighter';
  for (let i=0;i<18;i++){
    const ey=(t*(26+(i%4)*9)+i*67)%(H+30), a=clamp(1-ey/H,0,1);
    ctx.fillStyle = (menuFacMix>0.5)? 'rgba(110,200,255,'+(0.35*a)+')' : 'rgba(255,150,70,'+(0.35*a)+')';
    ctx.fillRect((i*173+Math.sin(t*0.8+i)*26)%W, H-ey, 2, 2);
  }
  ctx.fillStyle='rgba(255,248,235,0.8)';
  for (let i=0;i<12;i++){ const tw=0.4+0.6*Math.abs(Math.sin(t*1.6+i*1.1));
    ctx.globalAlpha=tw*0.5; ctx.fillRect((i*257+40)%W, (i*113)%150, 1.6, 1.6); }
  ctx.restore(); ctx.globalAlpha=1;
}

function drawBG(){
  const dev = game? game.dev:0, t = game? game.t:0, vw = VW();
  const top=devLerp(SKY_T), mid=devLerp(SKY_M), bot=devLerp(SKY_B);
  // CIEL ANCRÉ SUR LE HAUT RÉEL DE L'ÉCRAN. L'ancien dégradé partait de y=-H (monde), bien
  // au-dessus de l'écran : à zoom 1 le haut visible tombait déjà à ~58 % du trajet vers
  // l'horizon, si bien que le bleu du zénith n'apparaissait JAMAIS et que toute la scène
  // baignait dans le crème de l'horizon. On part désormais du haut de l'écran courant
  // (quel que soit le zoom), avec une marge pour la secousse de caméra.
  const yTop = -zTY()/zoom - 24;
  const sky=ctx.createLinearGradient(0,yTop,0,GROUND);
  sky.addColorStop(0,colS(top)); sky.addColorStop(0.58,colS(mid)); sky.addColorStop(1,colS(bot));
  ctx.fillStyle=sky; ctx.fillRect(0,yTop,vw,GROUND-yTop);
  // PERSPECTIVE AÉRIENNE : les plans lointains se fondent vers une brume légèrement bleutée
  // (comme le vrai ciel), et non plus vers le crème de l'horizon qui délavait tout.
  const haze = lerpColArr(bot, mid, 0.75);
  // (Anciens « éclairs d'ambiance » retirés : ils provoquaient un scintillement intempestif
  //  de l'arrière-plan pendant les batailles. Le ciel reste désormais stable.)
  // cendres rougeoyantes quand le monde agonise (additif). Plus d'« étoiles » en plein jour :
  // des points blancs dans un ciel diurne se lisaient comme des pixels morts.
  if (dev>0.4){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,90,60,0.5)';
    for (let i=0;i<30;i++){ const ax=(i*173+t*14+i*i*7)%vw, ay=(t*30+i*97)%GROUND; ctx.fillRect(ax,ay,2,2); }
    ctx.restore(); }
  // PARTICULES D'AMBIANCE selon la faction/ère du joueur (décor pur, additif). Les cendres
  // (monde mourant) sont déjà gérées plus haut ; ici : pétales humains, étincelles GPT.
  if (game && game.p && dev<0.45){
    ctx.save(); ctx.globalCompositeOperation='lighter';
    if (game.p.facKey==='HUM' && game.p.era===0){          // pétales portés par le vent
      ctx.fillStyle='rgba(255,150,190,0.45)';
      for (let i=0;i<14;i++){ const px=((i*211+t*26)%(vw+40))-20, py=((i*89+t*12*(1+i%3))%(GROUND-50))+10;
        ctx.beginPath(); ctx.ellipse(px,py,2.4,1.1,t+i,0,6.283); ctx.fill(); }
    } else if (game.p.facKey==='IA' && game.p.era>=3){      // étincelles électriques montantes
      for (let i=0;i<16;i++){ const px=(i*167)%vw, py=GROUND-((t*60+i*73)%(GROUND-30));
        ctx.fillStyle='rgba(120,210,255,'+(0.28+0.34*((i*7)%5)/5)+')'; ctx.fillRect(px,py,1.6,3.0); }
    }
    ctx.restore();
  }
  // soleil + halo bloom
  const sunX=vw*0.5-(camX/(WORLD-vw||1)-0.5)*120, sunY=80+dev*46;
  const sunC = dev<0.5? lerpCol([255,244,210],[255,150,80],dev*2) : lerpCol([255,150,80],[150,80,80],(dev-0.5)*2);
  ctx.save(); ctx.globalCompositeOperation='lighter';
  // halo plus contenu qu'avant (0,9 → 0,6) : sur le nouveau ciel bleu, l'ancien blanchissait
  // tout le tiers central de l'écran.
  const sg=ctx.createRadialGradient(sunX,sunY,4,sunX,sunY,130);
  sg.addColorStop(0,rgbaC(sunC,0.6)); sg.addColorStop(0.18,rgbaC(sunC,0.28)); sg.addColorStop(1,rgbaC(sunC,0));
  ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(sunX,sunY,130,0,6.283); ctx.fill();
  ctx.fillStyle=rgbaC(sunC,1); ctx.beginPath(); ctx.arc(sunX,sunY,22,0,6.283); ctx.fill();
  // rayons divins : faisceaux doux descendant du soleil, animés lentement (s'estompent
  // quand le monde agonise). Restent dans le bloc additif « lighter ».
  const rayA = 0.055*(1-dev*0.55);
  if (rayA>0.004) for (let i=0;i<6;i++){
    const a = 0.9 + i*0.17 + Math.sin(t*0.1+i)*0.02;     // éventail orienté vers le bas
    const len=420, w=20+i*5, ex=sunX+Math.cos(a)*len, ey=sunY+Math.sin(a)*len;
    const px=Math.cos(a+1.5708), py=Math.sin(a+1.5708);
    const rg=ctx.createLinearGradient(sunX,sunY,ex,ey);
    rg.addColorStop(0,rgbaC(sunC,rayA)); rg.addColorStop(1,rgbaC(sunC,0));
    ctx.fillStyle=rg; ctx.beginPath();
    ctx.moveTo(sunX+px*5,sunY+py*5); ctx.lineTo(sunX-px*5,sunY-py*5);
    ctx.lineTo(ex-px*w,ey-py*w); ctx.lineTo(ex+px*w,ey+py*w); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // NUAGES en volume (sommet éclairé, base ombrée), cuits en cache et blittés : 7 drawImage
  // par frame au lieu des 5 dégradés radiaux d'avant — plus beaux ET moins coûteux. Trois
  // plans de parallaxe (les lointains plus petits, plus lents, plus pâles). Blancs le jour,
  // rosés au crépuscule, fumées sombres quand le monde est mort.
  const cl = cloudSprites(dev);
  ctx.save();
  for (let i=0;i<7;i++){
    const k = cl[i%cl.length], layer = i%3;
    const sc = 0.62+layer*0.22, par = 0.03+layer*0.035, cw = k.w*sc, ch = k.h*sc;
    const span = vw + cw*2;
    const x = ((t*(3+layer*2.2) + i*611 - camX*par) % span + span) % span - cw;
    ctx.globalAlpha = (dev>0.55? 0.62 : 0.8) * (0.62+layer*0.19);
    ctx.drawImage(k.c, x, 12+((i*47)%96)-layer*6, cw, ch);
  }
  ctx.restore();
  // VIE AMBIANTE : vols d'oiseaux traversant lentement le ciel tant que le monde est sain
  // (ils désertent quand la santé du monde décline — le décor RACONTE l'état de la partie)
  if (dev<0.4 && qFx()){
    ctx.strokeStyle='rgba(28,24,30,'+(0.55*(1-dev*2.2)).toFixed(3)+')'; ctx.lineWidth=1.6; ctx.lineCap='round';
    for (let f2=0; f2<2; f2++){
      const fx2=((t*(11+f2*5)+f2*700)%(vw+300))-150, fy2=64+f2*44+Math.sin(t*0.7+f2*3)*10;
      for (let b2=0;b2<5;b2++){
        const bx2=fx2+b2*15-(b2%2)*7, by2=fy2+(b2%3)*6+b2*2;
        const w2=Math.sin(t*7+b2*1.3+f2*2)*3;
        ctx.beginPath(); ctx.moveTo(bx2-4,by2); ctx.quadraticCurveTo(bx2,by2-3+w2,bx2+4,by2);
        ctx.stroke();
      }
    }
  }
  // PROFONDEUR DE CHAMP : le flou des montagnes est PRÉ-CUIT dans drawFarRange (cache
  // offscreen) — plus aucun ctx.filter par frame, la mise au point reste sur la bataille.
  drawFarRange(vw, bot, dev, t);
  // collines habitées en 3 plans de parallaxe (forêts, champs, villages…), cuites par tuiles
  drawLand(dev);
  drawCity(dev);
  drawAmbient(t, dev, vw);       // monde vivant : crashs, incendies, fumées, jets, vols d'oiseaux…
  // voile de brume à l'horizon (plus léger qu'avant : 0,4 → 0,26)
  const hz=ctx.createLinearGradient(0,GROUND-120,0,GROUND);
  hz.addColorStop(0,rgbaC(haze,0)); hz.addColorStop(1,rgbaC(haze,0.16));
  ctx.fillStyle=hz; ctx.fillRect(0,GROUND-120,vw,120);
  // terrain (dégradé sculpté) + bande d'herbe
  const dirt=devLerp(DIRT), grass=devLerp(GRASS), yBot=(H-zTY())/zoom+60;
  ctx.beginPath(); ctx.moveTo(0,yBot); for(let sx=0;sx<=vw;sx+=8) ctx.lineTo(sx,gY(sx+camX)); ctx.lineTo(vw,yBot); ctx.closePath();
  const tg=ctx.createLinearGradient(0,GROUND-30,0,yBot);
  tg.addColorStop(0,shade(dirt,1.18)); tg.addColorStop(0.22,colS(dirt)); tg.addColorStop(1,shade(dirt,0.55));
  ctx.fillStyle=tg; ctx.fill();
  ctx.beginPath(); for(let sx=0;sx<=vw;sx+=8){ const y=gY(sx+camX); sx?ctx.lineTo(sx,y):ctx.moveTo(sx,y);}
  for(let sx=vw;sx>=0;sx-=8) ctx.lineTo(sx,gY(sx+camX)+13); ctx.closePath();
  const gg=ctx.createLinearGradient(0,GROUND-12,0,GROUND+16); gg.addColorStop(0,shade(grass,1.25)); gg.addColorStop(1,shade(grass,0.65));
  ctx.fillStyle=gg; ctx.fill();
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle=rgbaC(shade(grass,1.4),0.5); ctx.lineWidth=2;
  ctx.beginPath(); for(let sx=0;sx<=vw;sx+=8){ const y=gY(sx+camX); sx?ctx.lineTo(sx,y):ctx.moveTo(sx,y);} ctx.stroke(); ctx.restore();
  // STRATES : veines plus sombres parallèles à la surface — la terre a de la profondeur
  ctx.strokeStyle=rgbaC(shade(dirt,0.62),0.32); ctx.lineWidth=2.2;
  for (const d of [24, 46, 78]){ ctx.beginPath();
    for (let sx=0; sx<=vw+16; sx+=16){ const wx=sx+camX, y=gY(wx)+d+Math.sin(wx*0.011+d)*4; sx? ctx.lineTo(sx,y) : ctx.moveTo(sx,y); }
    ctx.stroke(); }
  // TEXTURE DU SOL : cailloux et mottes déterministes (hachage de la coordonnée monde) +
  // éclats de lumière rasante — la bande de terre n'est plus un simple aplat.
  if (qFx()){
    const stepT = SETTINGS.quality==='ultra'? 22 : 34;
    ctx.fillStyle='rgba(28,20,16,0.22)';
    for (let sx=0; sx<=vw; sx+=stepT){
      const wx=sx+camX, h1=Math.abs(Math.sin(wx*0.0173))*0.997%1;
      ctx.beginPath(); ctx.ellipse(sx+h1*22, gY(wx)+9+h1*24, 2.4+h1*2.8, 1.1+h1, 0, 0, 6.283); ctx.fill();
    }
    ctx.fillStyle='rgba(255,238,204,0.05)';
    for (let sx=17; sx<=vw; sx+=stepT*1.7){
      const wx=sx+camX, h1=Math.abs(Math.sin(wx*0.0311))*0.997%1;
      ctx.fillRect(sx, gY(wx)+4+h1*18, 5+h1*7, 1.4);
    }
  }
  // HERBE DYNAMIQUE : touffes qui ondulent au vent et se COUCHENT au passage de TOUTES les
  // unités au sol (les lourdes l'écrasent davantage) — le terrain réagit à la bataille.
  if (qFx() && game){
    const walkers=[];
    for (const u of game.p.units) if(!u.fly) walkers.push([u.x, (u.role==='tank'||u.role==='siege'||u.role==='hero')? 0.5 : 0.26]);
    for (const u of game.e.units) if(!u.fly) walkers.push([u.x, (u.role==='tank'||u.role==='siege'||u.role==='hero')? 0.5 : 0.26]);
    const step = SETTINGS.quality==='ultra'?14 : SETTINGS.quality==='high'?22 : 40;
    const under = qHi();                                        // sous-couche courte en Élevé/Ultra
    ctx.lineWidth=1.4;
    for (let sx=10; sx<=vw; sx+=step){
      const wx=sx+camX, by=gY(wx);
      const h1=Math.abs(Math.sin(wx*0.517))%1;
      let bend = Math.sin(wx*0.05+t*1.6)*2, crush = 0;
      for (const [hx,w2] of walkers){ const dlt=wx-hx, ad=Math.abs(dlt);
        if (ad<32){ bend += Math.sign(dlt||1)*(32-ad)*w2; crush = Math.max(crush, (1-ad/32)*w2*1.6); } }
      const hgt = (9+h1*5)*(1-Math.min(0.75,crush));            // hauteur variée ; s'ÉCRASE sous le pas
      ctx.strokeStyle=rgbaC(shade(grass, 1.15+h1*0.35), 0.45);  // teintes variées → prairie étoffée
      ctx.beginPath(); ctx.moveTo(sx, by); ctx.quadraticCurveTo(sx+bend*0.5, by-hgt*0.63, sx+bend, by-hgt); ctx.stroke();
      if (under){                                               // brin court décalé (2e couche)
        ctx.strokeStyle=rgbaC(shade(grass,0.9),0.35);
        ctx.beginPath(); ctx.moveTo(sx+step*0.45, by+1);
        ctx.quadraticCurveTo(sx+step*0.45+bend*0.3, by-3, sx+step*0.45+bend*0.55, by-5-h1*3); ctx.stroke();
      }
    }
  }
  // rochers sculptés
  // CRATÈRES PERSISTANTS : creux sombres laissés par les explosions lourdes, posés sur le sol.
  if (game.craters) for (const cr of game.craters){
    const cx=cr.x-camX; if (cx<-80||cx>vw+80) continue;
    const cy=gY(cr.x)+2, rr=cr.r;
    const cg=ctx.createRadialGradient(cx,cy,1,cx,cy,rr);
    cg.addColorStop(0,'rgba(18,12,10,0.55)'); cg.addColorStop(0.7,'rgba(30,22,18,0.32)'); cg.addColorStop(1,'rgba(30,22,18,0)');
    ctx.fillStyle=cg; ctx.beginPath(); ctx.ellipse(cx,cy,rr,rr*0.34,0,0,6.28); ctx.fill();
    ctx.strokeStyle='rgba(120,100,80,0.22)'; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.ellipse(cx,cy,rr*0.9,rr*0.3,0,0,6.28); ctx.stroke();
  }
  drawCracks(dev, vw);           // le sol se craquèle à mesure que le monde meurt
  for (const z of game.zones) drawZone(z, dev, t, vw);
  drawDecor(dev, t, vw);                 // calque d'habillage cosmétique (épaves, végétation, débris…)
  for (const tr of TREES) drawTree(tr, dev, t, vw);
  // 4e ZONE BONUS temporaire : pilier doré qui grésille/oscille quand elle est disputée.
  if (game.bonusZone){
    const z=game.bonusZone, bx=z.x-camX, gy=gY(z.x);
    if (bx>-60 && bx<vw+60){
      const flick = z.contested? (0.55+0.45*Math.sin(t*42)) : 1;
      const cS = z.owner==='p'? '157,255,157' : z.owner==='e'? '255,157,157' : '255,211,74';
      ctx.save(); ctx.globalCompositeOperation='lighter';
      const g=ctx.createLinearGradient(bx,gy-130,bx,gy);
      g.addColorStop(0,'rgba('+cS+',0)'); g.addColorStop(1,'rgba('+cS+','+(0.4*flick)+')');
      ctx.fillStyle=g; ctx.fillRect(bx-16,gy-130,32,130);
      ctx.globalAlpha=(0.6+0.3*Math.sin(t*3))*flick; ctx.strokeStyle='rgba('+cS+',0.9)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(bx,gy+2,30,9,0,0,6.28); ctx.stroke();
      ctx.restore(); ctx.globalAlpha=1;
      ctx.fillStyle='rgba('+cS+',0.95)'; ctx.font='700 11px Arial'; ctx.textAlign='center';
      ctx.fillText('★ '+Math.max(0,Math.ceil(60-z.t))+'s', bx, gy-138);
    }
  }
  // brume basse dérivante (additif)
  ctx.save(); ctx.globalCompositeOperation='lighter';
  for (let i=0;i<3;i++){ const my=GROUND-26+i*15, mx=(t*8*(i+1))%200;
    const mg=ctx.createLinearGradient(0,my-13,0,my+13);
    mg.addColorStop(0,'rgba(216,228,238,0)'); mg.addColorStop(0.5,'rgba(216,228,238,'+(0.05+i*0.012)+')'); mg.addColorStop(1,'rgba(216,228,238,0)');
    ctx.fillStyle=mg; ctx.fillRect(-mx,my-13,vw+220,26); }
  ctx.restore();
}
// émetteurs de sol dynamiques (remplacent les anciens rochers décoratifs) :
// s'illuminent de la couleur de la faction qui domine la zone, réagissent au passage
// des unités lourdes (onde), et grésillent (hologramme) en cas de combat/cataclysme.
function drawZone(z, dev, t, vw){
  const x=z.x-camX; if (x<-70||x>vw+70) return; const y=gY(z.x);
  const owner=z.owner, acc = owner? (owner==='p'?game.p.fac.accent:game.e.fac.accent) : '#9aa6b2';
  let pN=0, eN=0, heavy=0;
  for (const u of game.p.units){ const d=Math.abs(u.x-z.x); if(d<90){ pN++; if((u.role==='tank'||u.role==='siege'||u.role==='hero')&&d<55) heavy=Math.max(heavy,1-d/55); } }
  for (const u of game.e.units){ const d=Math.abs(u.x-z.x); if(d<90){ eN++; if((u.role==='tank'||u.role==='siege'||u.role==='hero')&&d<55) heavy=Math.max(heavy,1-d/55); } }
  const combat = pN>0 && eN>0, pulse=0.65+0.35*Math.sin(t*3+z.x), flick=(combat||game.cata)?(0.55+0.45*Math.sin(t*22+z.x)):1;
  ctx.save(); ctx.globalCompositeOperation='lighter';
  // halo + anneau au sol
  const g=ctx.createRadialGradient(x,y,2,x,y,42); g.addColorStop(0,rgbaC(acc,0.3*pulse)); g.addColorStop(1,rgbaC(acc,0));
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(x,y,42,15,0,0,6.283); ctx.fill();
  ctx.strokeStyle=rgbaC(acc,0.6); ctx.lineWidth=2.5; ctx.beginPath(); ctx.ellipse(x,y,26,9,0,0,6.283); ctx.stroke();
  // anneau de progression de capture
  if (Math.abs(z.prog)>0.01 && Math.abs(z.prog)<1){ const pc=z.prog>0?game.p.fac.accent:game.e.fac.accent;
    ctx.strokeStyle=rgbaC(pc,0.95); ctx.lineWidth=3.4; ctx.beginPath(); ctx.ellipse(x,y,26,9,0,-Math.PI/2,-Math.PI/2+6.283*Math.abs(z.prog)); ctx.stroke(); }
  // colonne holographique + glyphe de contrôle
  const hh=50; const cg=ctx.createLinearGradient(x,y,x,y-hh); cg.addColorStop(0,rgbaC(acc,0.55*flick)); cg.addColorStop(1,rgbaC(acc,0));
  ctx.fillStyle=cg; ctx.fillRect(x-4,y-hh,8,hh);
  ctx.save(); ctx.translate(x,y-hh-2); ctx.rotate(t*1.2); ctx.globalAlpha=flick; ctx.fillStyle=rgbaC(acc,0.95); ctx.fillRect(-5,-5,10,10); ctx.restore();
  // onde au passage d'unités lourdes
  if (heavy>0.1){ const ph=(t*1.5)%1, rr2=10+ph*36; ctx.strokeStyle=rgbaC(acc,0.5*heavy*(1-ph)); ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(x,y,rr2,rr2*0.36,0,0,6.283); ctx.stroke(); }
  ctx.restore();
  // étiquette de contrôle
  ctx.font='700 9px Arial'; ctx.textAlign='center'; ctx.fillStyle=rgbaC(acc,0.92);
  ctx.fillText(owner? (owner==='p'?tr('zone_you'):tr('zone_foe')) : tr('zone_neutral'), x, y-hh-9);
}
// chaîne de montagnes lointaine : silhouette dentelée, très embrumée, parallaxe ultra-lente.
// neige sur les sommets quand le monde est sain ; teinte cendrée quand il agonise.
// PERF : la chaîne (avec son FLOU de profondeur de champ) est CUITE dans un canvas hors
// écran couvrant toute l'amplitude de parallaxe, rebâti seulement quand la santé du monde
// franchit un palier (0.05) — par frame il ne reste qu'un drawImage. C'était l'autre grand
// coût du mode Ultra (ctx.filter par frame = très lent sur beaucoup de GPU).
function devLerpAt(arr, d){
  return d<0.5? lerpColArr(arr[0],arr[1],d*2) : lerpColArr(arr[1],arr[2],(d-0.5)*2);
}
// NUAGES : 5 silhouettes cuites une fois par état du monde (quantifié au dixième) puis
// réutilisées. Amas de bulles déterministe (même ciel d'une partie à l'autre), dégradé
// sommet éclairé → base ombrée, base aplatie, flou doux si le navigateur le supporte.
let CLOUDS = null;
function cloudSprites(dev){
  const dq = Math.round(dev*10)/10, SS = Math.min(2, spriteSS()), key = dq+'|'+SS+'|'+(CANF?1:0);
  if (CLOUDS && CLOUDS.key===key) return CLOUDS.list;
  const lit = devLerpAt([[255,255,255],[255,196,150],[96,84,88]], dq);
  const shd = devLerpAt([[176,196,222],[122,72,92],[34,28,32]], dq);
  const list = [];
  for (let n=0;n<5;n++){
    const w = 150+n*38, h = w*0.5;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(w*SS); cv.height = Math.ceil(h*SS);
    const g = cv.getContext('2d'); g.scale(SS,SS);
    if (CANF) g.filter = 'blur(1.6px)';
    let s = n*9301+49297; const rnd = ()=>{ s=(s*16807)%2147483647; return s/2147483647; };
    const gr = g.createLinearGradient(0,h*0.08,0,h*0.8);
    gr.addColorStop(0,colS(lit)); gr.addColorStop(0.55,colS(lerpColArr(lit,shd,0.35))); gr.addColorStop(1,colS(shd));
    g.fillStyle = gr; g.beginPath();
    for (let i=0;i<7;i++){
      const r = h*(0.16+0.14*rnd()+0.1*Math.sin(i/6*Math.PI));          // bosses plus hautes au centre
      const px = w*(0.17+0.66*i/6)+(rnd()-0.5)*w*0.07, py = h*0.66-r*0.5;
      g.moveTo(px+r,py); g.arc(px,py,r,0,6.283);
    }
    g.rect(w*0.13, h*0.58, w*0.74, h*0.18);                               // base aplatie
    g.fill();
    list.push({ c:cv, w, h });
  }
  CLOUDS = { key, list };
  return list;
}
let FARC = null;
function drawFarRange(vw, bot, dev, t){
  const devQ = Math.round(dev*20)/20;
  // cuite pour la largeur visible MAXIMALE (zoom mini) : l'ancienne clé dépendait de la largeur
  // courante, donc chaque cran de zoom recuisait toute la chaîne (flou compris) — saccade.
  const maxVW = Math.ceil(W/ZMIN);
  const key = devQ+'|'+maxVW;
  // chaîne abaissée (amplitude 150 → 110) : ses sommets montaient jusqu'en haut de l'écran et
  // recouvraient presque tout le ciel — c'est elle qu'on prenait pour un « ciel délavé »
  const base = GROUND-140, amp = 110, topY = base-amp*1.62;
  if (!FARC || FARC.key!==key){
    const wpx = maxVW + Math.ceil(WORLD*0.04) + 40;
    // PERF + PROFONDEUR DE CHAMP : cuite en BASSE résolution (0,6) puis agrandie — le lissage de
    // l'agrandissement fait le flou de lointain. L'ancien filtre blur pleine résolution coûtait
    // ~80 ms à chaque palier de santé du monde (saccade toutes les ~48 s) ; ici quelques ms.
    const SS = 0.6;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(wpx*SS); cv.height = Math.ceil((GROUND-topY+6)*SS);
    const c = cv.getContext('2d'); c.scale(SS,SS); c.translate(0,-topY);
    // PERSPECTIVE AÉRIENNE : les montagnes lointaines prennent la teinte du HAUT du ciel
    // (bleu-gris le jour), pas celle de l'herbe ni du crème de l'horizon.
    const far = lerpColArr(devLerpAt(SKY_M, devQ), devLerpAt(SKY_T, devQ), 0.4);
    const col = lerpColArr(devLerpAt(GRASS, devQ), far, 0.8);
    const pts = [];
    for (let x=0; x<=wpx+12; x+=12){
      const h = Math.abs(Math.sin(x*0.0016))*amp + Math.abs(Math.sin(x*0.0041+1.7))*amp*0.5 + Math.abs(Math.sin(x*0.013+0.4))*amp*0.09;
      pts.push([x, base-h, h]);
    }
    const ridge = () => { c.beginPath(); pts.forEach((p,i)=> i? c.lineTo(p[0],p[1]) : c.moveTo(p[0],p[1])); };
    ridge(); c.lineTo(wpx+12,GROUND+6); c.lineTo(0,GROUND+6); c.closePath();
    const g=c.createLinearGradient(0,base-amp,0,base+30);
    g.addColorStop(0,shade(col,1.18)); g.addColorStop(1,colS(col));
    c.fillStyle=g; c.fill();
    c.save(); c.clip();
    // NEIGES ÉTERNELLES sur les plus hauts sommets (fondent puis disparaissent avec le monde)
    const snowA = 0.82*Math.max(0, 1-devQ*1.7), snowH = amp*1.18;
    if (snowA>0.02){
      c.fillStyle = 'rgba(240,246,255,'+snowA.toFixed(3)+')'; c.beginPath();
      let open = false;
      const back = i => { for (let j=i-1; j>=0 && pts[j][2]>snowH; j--) c.lineTo(pts[j][0], pts[j][1]+pts[j].th*(0.55+0.45*Math.abs(Math.sin(j*2.3)*Math.cos(j*0.9)))); c.closePath(); open = false; };
      for (let i=0;i<pts.length;i++){ const p = pts[i];
        if (p[2]>snowH){ p.th = 2+(p[2]-snowH)*0.95;
          if (!open){ c.moveTo(p[0],p[1]); open = true; }
          c.lineTo(p[0],p[1]); }
        else if (open) back(i);
      }
      if (open) back(pts.length);
      c.fill();
    }
    // MODELÉ DU RELIEF (lumière haut-gauche) : chaque bande verticale est assombrie selon la
    // pente qui descend vers la droite, éclaircie si elle monte. Pente LISSÉE sur une large
    // fenêtre (±40 u) : sinon un trait vertical tombait sous chaque sommet, là où l'ombre et
    // la lumière se rencontrent. Bandes jointives (un recouvrement doublait l'alpha → stries).
    const hf = x => Math.abs(Math.sin(x*0.0016))*amp + Math.abs(Math.sin(x*0.0041+1.7))*amp*0.5 + Math.abs(Math.sin(x*0.013+0.4))*amp*0.09;
    const sc = lerpColArr(col,[20,24,40],0.55);
    const sg = c.createLinearGradient(0, base-amp*1.6, 0, base+10);
    sg.addColorStop(0, rgbaC(sc,1)); sg.addColorStop(0.55, rgbaC(sc,0.55)); sg.addColorStop(1, rgbaC(sc,0));
    const lg = c.createLinearGradient(0, base-amp*1.6, 0, base);
    lg.addColorStop(0, 'rgba(255,248,236,1)'); lg.addColorStop(1, 'rgba(255,248,236,0)');
    for (let x=0; x<=wpx; x+=5){ let dy=0; for (const o of [10,20,30,40]) dy += -(hf(x+o)-hf(x-o))*12/(2*o); dy/=4;
      const y0 = base-hf(x)-2;
      if (dy>0){ c.globalAlpha = Math.min(0.36, dy/12*0.5); c.fillStyle = sg; }
      else { c.globalAlpha = Math.min(0.16, -dy/12*0.22); c.fillStyle = lg; }
      c.fillRect(x, y0, 5, base+10-y0); }
    c.globalAlpha = 1;
    c.restore();
    FARC = {key, cv, wpx, SS, topY};
  }
  const off = camX*0.04;
  ctx.drawImage(FARC.cv, -off, FARC.topY, FARC.wpx, GROUND-FARC.topY+6);
}
/* ===== PAYSAGE HABITÉ EN TUILES (v1.8) ===== */
// Les trois collines étaient de simples vagues lisses et vides. Ce sont désormais des plans
// habités — lisière de forêts et éoliennes au loin, champs, villages, pylônes et route au
// milieu, gros arbres, haies et clôtures devant — qui se dégradent avec la santé du monde :
// blé → chaume, forêts qui roussissent puis meurent, villages éventrés aux fenêtres en feu,
// éoliennes aux pales arrachées. Chaque plan est CUIT par tuiles de 512 unités et par palier
// de santé du monde (0,05) : par frame, il ne reste que quelques drawImage (moins coûteux que
// les trois dégradés d'avant). Les tuiles d'un nouveau palier se cuisent UNE par frame en
// tâche de fond ; d'ici là, la tuile du palier précédent reste affichée (aucune saccade).
const LAND_TW = 512;
const LAND_L = [
  { par:0.18, base:GROUND-124, amp:60, haze:0.56, seed:1.7, top:GROUND-236 },
  { par:0.32, base:GROUND-90,  amp:46, haze:0.34, seed:4.3, top:GROUND-182 },
  { par:0.50, base:GROUND-50,  amp:32, haze:0.12, seed:7.9, top:GROUND-136 },
];
const LANDT = new Map();
let landBudget = 0, landTick = 0;
const lhash = (n, s) => { const v = Math.sin(n*12.9898 + s*78.233)*43758.5453; return v - Math.floor(v); };
const csc = (c, f) => [c[0]*f, c[1]*f, c[2]*f];
function landY(L, x){
  return L.base - Math.abs(Math.sin(x*0.0042 + L.seed))*L.amp*0.78
                - Math.sin(x*0.0113 + L.seed*2.1)*L.amp*0.3
                - Math.sin(x*0.037 + L.seed*0.7)*L.amp*0.06;
}
const landWood = (L, x) => Math.sin(x*0.0061 + L.seed*3.1) + Math.sin(x*0.0173 + L.seed)*0.55 - 0.15;  // > 0 = boisé
function landPal(dq){
  const mid = devLerpAt(SKY_M, dq), bot = devLerpAt(SKY_B, dq);
  return { grass: devLerpAt(GRASS, dq), haze: lerpColArr(bot, mid, 0.75) };
}
function landBake(li, idx, dq){
  const L = LAND_L[li], SS = Math.min(1.25, spriteSS()), h = GROUND-L.top+2;
  const cv = document.createElement('canvas'); cv.width = Math.ceil(LAND_TW*SS); cv.height = Math.ceil(h*SS);
  const c = cv.getContext('2d'); c.scale(SS,SS); c.translate(-idx*LAND_TW, -L.top);
  const prev = TC; TC = c;
  try { paintLand(c, L, li, idx*LAND_TW, (idx+1)*LAND_TW, dq); } finally { TC = prev; }
  return cv;
}
// tuile du palier demandé ; sinon la plus proche déjà cuite (et cuisson différée)
function landTile(li, idx, dq){
  const SS = Math.min(1.25, spriteSS()), key = li+'|'+idx+'|'+dq+'|'+SS;
  let e = LANDT.get(key);
  if (e){ e.used = landTick; return e.cv; }
  let best = null, bd = 9;
  for (const [k,v] of LANDT){ const p = k.split('|');
    if (+p[0]===li && +p[1]===idx && +p[3]===SS){ const d = Math.abs(+p[2]-dq); if (d<bd){ bd=d; best=v; } } }
  if (best && bd<=0.101 && landBudget<=0){ best.used = landTick; return best.cv; }
  landBudget--;
  e = { cv: landBake(li, idx, dq), used: landTick };
  LANDT.set(key, e);
  if (LANDT.size > 42){                                     // éviction des tuiles les moins récentes
    const old = [...LANDT.entries()].sort((a,b)=>a[1].used-b[1].used);
    for (let i=0; i<LANDT.size-36; i++) LANDT.delete(old[i][0]);
  }
  return e.cv;
}
function drawLand(dev){
  const dq = Math.round(dev*20)/20, vw = VW();
  landTick++; landBudget = 1;
  for (let li=0; li<LAND_L.length; li++){
    const L = LAND_L[li], off = camX*L.par, h = GROUND-L.top+2;
    for (let i=Math.floor(off/LAND_TW), i1=Math.floor((off+vw)/LAND_TW); i<=i1; i++)
      ctx.drawImage(landTile(li, i, dq), i*LAND_TW-off, L.top, LAND_TW, h);
    if (li===1) landSmoke(L, off, vw, dev);
  }
}
// fumées des villages en ruine (en direct, quelques volutes)
function landSmoke(L, off, vw, dev){
  const dead = clamp((dev-0.55)/0.35, 0, 1);
  if (dead<=0.05 || !qFx()) return;
  const t = game? game.t : 0;
  ctx.save();
  for (let k=Math.floor((off-200)/560); k*560<off+vw+200; k++){
    if (lhash(k, L.seed+20)>0.62) continue;
    const vx = k*560 + lhash(k, L.seed+21)*200 + 18, sx = vx-off; if (sx<-60||sx>vw+60) continue;
    const sy = landY(L, vx)+2;
    for (let i=0;i<4;i++){ const ph = (t*0.12 + i*0.25 + k*0.37)%1;
      ctx.fillStyle = 'rgba(40,36,38,'+(0.26*dead*(1-ph)).toFixed(3)+')';
      ctx.beginPath(); ctx.arc(sx + Math.sin(t*0.4+i+k)*4*ph + ph*14, sy - ph*60, 3+ph*11, 0, 6.283); ctx.fill(); }
  }
  ctx.restore();
}
function paintLand(c, L, li, xa, xb, dq){
  const P = landPal(dq), hz = P.haze, dead = clamp((dq-0.55)/0.35, 0, 1), dry = clamp(dq*1.6, 0, 1);
  const fog = (col, k) => colS(lerpColArr(col, hz, k===undefined? L.haze : k));
  const m = 46, yTop = L.base - L.amp*1.15;
  const lay = (x, d) => landY(L, x) + d;
  // 1) la colline : dégradé crête éclairée → pied embrumé + liseré de lumière sur la crête
  c.beginPath(); c.moveTo(xa-m, GROUND+2);
  for (let x=xa-m; x<=xb+m; x+=6) c.lineTo(x, landY(L,x));
  c.lineTo(xb+m, GROUND+2); c.closePath();
  const g = c.createLinearGradient(0, yTop, 0, GROUND);
  g.addColorStop(0, fog(csc(P.grass,1.2))); g.addColorStop(0.45, fog(P.grass)); g.addColorStop(1, fog(P.grass, Math.min(1, L.haze+0.3)));
  c.fillStyle = g; c.fill();
  c.strokeStyle = fog(csc(P.grass,1.45), L.haze*0.8); c.globalAlpha = 0.5; c.lineWidth = 1.2;
  c.beginPath(); for (let x=xa-m; x<=xb+m; x+=6){ const y=landY(L,x)+0.6; x===xa-m? c.moveTo(x,y) : c.lineTo(x,y); } c.stroke();
  c.globalAlpha = 1;
  // 2) champs en pente (plans lointain et moyen) : blé doré → chaume brun
  if (li<2){
    const FS = li===0? 150 : 210, fc = lerpColArr(lerpColArr([200,184,98],[146,110,64],dry), [92,80,66], dead*0.6);
    for (let k=Math.floor((xa-140)/FS); k*FS<xb+140; k++){
      if (lhash(k, L.seed+5)>0.55) continue;
      const fx = k*FS + lhash(k,L.seed+6)*FS*0.4, fw = 46+lhash(k,L.seed+7)*64;
      const d0 = 9+lhash(k,L.seed+8)*16, fh = 9+lhash(k,L.seed+9)*11;
      c.beginPath();
      for (let x=fx; x<=fx+fw; x+=6) x===fx? c.moveTo(x, lay(x,d0)) : c.lineTo(x, lay(x,d0));
      for (let x=fx+fw; x>=fx; x-=6) c.lineTo(x, lay(x,d0+fh));
      c.closePath(); c.fillStyle = fog(fc); c.fill();
      c.strokeStyle = fog(csc(fc,0.78)); c.lineWidth = 0.7;
      for (let s=1;s<4;s++){ c.beginPath(); for (let x=fx+2; x<=fx+fw-2; x+=6){ const y=lay(x, d0+fh*s/4); x===fx+2? c.moveTo(x,y) : c.lineTo(x,y); } c.stroke(); }
    }
  }
  // 3) route (plan moyen) : ruban clair qui serpente à flanc de colline
  if (li===1){
    c.strokeStyle = fog(lerpColArr([206,196,174],[90,84,80],dead)); c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); for (let x=xa-m; x<=xb+m; x+=8){ const y=lay(x, 22+Math.sin(x*0.008+L.seed)*6); x===xa-m? c.moveTo(x,y) : c.lineTo(x,y); } c.stroke();
  }
  // 4) éoliennes (plan lointain) : pales arrachées quand le monde meurt
  if (li===0){
    const tw = fog([238,242,246], L.haze*0.7);
    for (let k=Math.floor((xa-60)/270); k*270<xb+60; k++){
      if (lhash(k, L.seed+12)>0.42) continue;
      const x = k*270 + lhash(k,L.seed+13)*120, y = landY(L,x)+1, H = 28+lhash(k,L.seed+14)*9;
      c.strokeStyle = tw; c.fillStyle = tw; c.lineWidth = 1.1; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x,y); c.lineTo(x,y-H); c.stroke();
      const nb = dead>0.3? (lhash(k,L.seed+15)<0.5? 1 : 2) : 3, a0 = lhash(k,L.seed+16)*6.283;
      c.lineWidth = 1.3; c.beginPath();
      for (let b=0;b<nb;b++){ const a=a0+b*2.094; c.moveTo(x,y-H); c.lineTo(x+Math.cos(a)*11, y-H+Math.sin(a)*11); }
      c.stroke(); c.beginPath(); c.arc(x, y-H, 1.3, 0, 6.283); c.fill();
    }
  }
  // 5) pylônes et lignes électriques (plan moyen)
  if (li===1){
    const pc = fog([58,60,66], L.haze*0.9), PS = 300;
    const pyl = k => lhash(k, L.seed+17)<0.72 ? k*PS + lhash(k,L.seed+18)*50 : null;
    c.strokeStyle = pc; c.lineWidth = 0.9;
    for (let k=Math.floor((xa-PS)/PS); k*PS<xb+PS; k++){
      const x = pyl(k); if (x===null) continue; const y = lay(x,3);
      c.beginPath(); c.moveTo(x-4,y); c.lineTo(x,y-26); c.lineTo(x+4,y); c.moveTo(x-2.6,y-9); c.lineTo(x+2.6,y-9);
      c.moveTo(x-6,y-22); c.lineTo(x+6,y-22); c.stroke();
      const x2 = pyl(k+1); if (x2===null) continue; const y2 = lay(x2,3);
      c.beginPath(); c.moveTo(x+5,y-22); c.quadraticCurveTo((x+x2)/2, (y+y2)/2-12, x2+5, y2-22); c.stroke();
      c.beginPath(); c.moveTo(x-5,y-22); c.quadraticCurveTo((x+x2)/2, (y+y2)/2-12, x2-5, y2-22); c.stroke();
    }
  }
  // 6) villages (plan moyen) : maisons, clocher, fenêtres allumées au crépuscule, ruines en feu
  if (li===1){
    const dusk = clamp((dq-0.18)*3, 0, 1)*(1-dead*0.6);
    for (let k=Math.floor((xa-140)/560); k*560<xb+140; k++){
      if (lhash(k, L.seed+20)>0.62) continue;
      const vx = k*560 + lhash(k,L.seed+21)*200, n = 3 + Math.floor(lhash(k,L.seed+22)*3);
      for (let j=0;j<n;j++){
        const s = k*17+j, hx = vx + j*15 + lhash(s,L.seed+23)*4, w = 10+lhash(s,L.seed+24)*4, hh = 7+lhash(s,L.seed+25)*4;
        const y = lay(hx+w/2, 6), ruined = lhash(s, L.seed+26) < dead;
        const church = j===1 && lhash(k,L.seed+27)<0.5;
        const wall = fog(ruined? [70,64,62] : lerpColArr([222,208,186],[150,136,118],dry*0.5));
        const roof = fog(ruined? [38,34,34] : (lhash(s,L.seed+28)<0.6? [158,74,54] : [96,100,110]));
        c.fillStyle = wall; c.fillRect(hx, y-hh, w, hh);
        if (church){ c.fillRect(hx+w-5, y-hh-11, 5, 11); c.fillStyle = roof; c.beginPath(); c.moveTo(hx+w-6, y-hh-11); c.lineTo(hx+w-2.5, y-hh-19); c.lineTo(hx+w+1, y-hh-11); c.fill(); }
        c.fillStyle = roof;
        if (ruined){ c.beginPath(); c.moveTo(hx, y-hh); c.lineTo(hx+w*0.3, y-hh-3); c.lineTo(hx+w*0.5, y-hh+1); c.lineTo(hx+w*0.8, y-hh-2); c.lineTo(hx+w, y-hh); c.closePath(); c.fill(); }
        else { c.beginPath(); c.moveTo(hx-1.2, y-hh); c.lineTo(hx+w/2, y-hh-5.5); c.lineTo(hx+w+1.2, y-hh); c.closePath(); c.fill(); }
        const burning = ruined && dead<0.92 && lhash(s,L.seed+29)<0.6;
        const wc = burning? 'rgba(255,128,48,0.95)' : dusk>0.05? 'rgba(255,214,140,'+(0.35+0.6*dusk).toFixed(2)+')' : fog([60,58,64], L.haze*0.6);
        c.fillStyle = wc; c.fillRect(hx+w*0.25, y-hh*0.62, 2.2, 2.2); if (w>12) c.fillRect(hx+w*0.62, y-hh*0.62, 2.2, 2.2);
      }
    }
  }
  // 7) arbres : lisières denses au loin, bosquets au milieu, gros arbres devant ; roussis puis morts
  const TS = li===0? 6 : li===1? 10 : 26;
  const tree = lerpColArr(lerpColArr(csc(P.grass,0.58),[84,66,40],dry*0.55), [52,44,40], dead*0.5);
  const treeL = lerpColArr(lerpColArr(csc(P.grass,0.92),[140,108,58],dry*0.55), [72,62,56], dead*0.5);
  const tk = L.haze*0.8, cTree = fog(tree, tk), cTreeL = fog(treeL, tk), cTrunk = fog([74,56,40], tk), cDead = fog([46,40,38], tk);
  for (let k=Math.floor((xa-m)/TS); k*TS<xb+m; k++){
    const x = k*TS + lhash(k,L.seed+1)*TS*0.8;
    if (landWood(L,x)<0 && lhash(k,L.seed+2)>(li===2? 0.25 : 0.07)) continue;   // clairières, arbres isolés
    const r = (li===0? 2.7 : li===1? 4.6 : 9.5)*(0.75+lhash(k,L.seed+3)*0.6);
    const depth = li===2? 3+lhash(k,L.seed+4)*5 : (lhash(k,L.seed+4)<0.6? 1.5 : 5+lhash(k,L.seed+4)*20);
    const y = lay(x, depth);
    if (dead>0.5 && lhash(k,L.seed+11)<dead){                                    // arbre mort
      c.strokeStyle = cDead; c.lineWidth = Math.max(0.8, r*0.22); c.lineCap = 'round';
      c.beginPath(); c.moveTo(x,y); c.lineTo(x,y-r*2.6); c.moveTo(x,y-r*1.6); c.lineTo(x+r*0.8,y-r*2.3); c.moveTo(x,y-r*1.2); c.lineTo(x-r*0.7,y-r*1.8); c.stroke();
    } else if (lhash(k,L.seed+10) < (li===0? 0.5 : 0.32)){                       // conifère
      const hgt = r*3.1;
      c.fillStyle = cTree; c.beginPath(); c.moveTo(x-r, y); c.lineTo(x, y-hgt); c.lineTo(x+r, y); c.closePath(); c.fill();
      c.fillStyle = cTreeL; c.beginPath(); c.moveTo(x-r, y); c.lineTo(x, y-hgt); c.lineTo(x-r*0.1, y); c.closePath(); c.fill();
      if (li===2){ c.fillStyle = cTree; c.beginPath(); c.moveTo(x-r*1.2, y-hgt*0.3); c.lineTo(x, y-hgt*0.75); c.lineTo(x+r*1.2, y-hgt*0.3); c.closePath(); c.fill(); }
    } else {                                                                      // feuillu
      if (li===2){ c.fillStyle = cTrunk; c.fillRect(x-r*0.14, y-r*1.2, r*0.28, r*1.2); }
      const cy = y - r*(li===2? 1.9 : 0.9);
      c.fillStyle = cTree; c.beginPath(); c.arc(x, cy, r, 0, 6.283); if (li>0) c.arc(x+r*0.7, cy+r*0.3, r*0.7, 0, 6.283); c.fill();
      c.fillStyle = cTreeL; c.beginPath(); c.arc(x-r*0.32, cy-r*0.3, r*0.55, 0, 6.283); c.fill();
    }
  }
  // 8) premier plan des collines : haies, clôtures, bottes de foin, rochers
  if (li===2){
    // haies : rangées continues de buissons qui suivent la pente (et non des boules isolées)
    const bush = lerpColArr(csc(tree,1.1), [70,60,50], dead*0.4), cB = fog(bush, tk), cBL = fog(csc(bush,1.3), tk);
    for (let k=Math.floor((xa-200)/170); k*170<xb+200; k++){
      if (lhash(k,L.seed+30)>0.55) continue;
      const hx = k*170 + lhash(k,L.seed+31)*60, len = 50+lhash(k,L.seed+32)*90, d = 11+lhash(k,L.seed+33)*7;
      for (let x=hx; x<=hx+len; x+=4.5){ const r = 3+Math.abs(Math.sin(x*0.7))*1.6, y = lay(x,d);
        c.fillStyle = cB; c.beginPath(); c.arc(x, y-r*0.5, r, 0, 6.283); c.fill(); }
      for (let x=hx; x<=hx+len; x+=9){ const r = 1.6+Math.abs(Math.sin(x*0.7))*0.8, y = lay(x,d);
        c.fillStyle = cBL; c.beginPath(); c.arc(x-1.2, y-r-2.4, r, 0, 6.283); c.fill(); }
    }
    if (dead<0.5){ c.strokeStyle = fog([120,96,70], tk); c.lineWidth = 0.9;                // clôtures
      for (let k=Math.floor((xa-120)/240); k*240<xb+120; k++){ if (lhash(k,L.seed+34)>0.5) continue;
        const fx = k*240 + lhash(k,L.seed+35)*80;
        c.beginPath(); for (let x=fx; x<=fx+60; x+=12){ const y=lay(x,9); c.moveTo(x,y); c.lineTo(x,y-5); }
        for (const d of [6.5, 8.5]){ for (let x=fx; x<=fx+60; x+=6){ const y=lay(x,d); x===fx? c.moveTo(x,y) : c.lineTo(x,y); } }
        c.stroke(); } }
    if (dq<0.45){ for (let k=Math.floor((xa-60)/190); k*190<xb+60; k++){ if (lhash(k,L.seed+36)>0.35) continue;   // bottes de foin
        const x = k*190 + lhash(k,L.seed+37)*90, y = lay(x,14);
        c.fillStyle = fog([214,184,104], tk); c.beginPath(); c.ellipse(x, y-3, 4.2, 3.4, 0, 0, 6.283); c.fill();
        c.fillStyle = fog([170,140,74], tk); c.beginPath(); c.ellipse(x+2.6, y-3, 1.6, 3.2, 0, 0, 6.283); c.fill(); } }
    for (let k=Math.floor((xa-40)/130); k*130<xb+40; k++){ if (lhash(k,L.seed+38)>0.4) continue;                  // rochers
      const x = k*130 + lhash(k,L.seed+39)*70, y = lay(x,16), r = 3+lhash(k,L.seed+40)*4;
      c.fillStyle = fog([120,116,112], tk); c.beginPath(); c.ellipse(x, y-r*0.4, r, r*0.7, 0, 0, 6.283); c.fill();
      c.fillStyle = fog([160,156,150], tk); c.beginPath(); c.ellipse(x-r*0.3, y-r*0.65, r*0.45, r*0.3, 0, 0, 6.283); c.fill(); }
  }
}
function drawCity(dev){
  const par=0.7, vw=VW(), t=game?game.t:0;
  // DÉGRADATION VISIBLE : à mesure que la santé du monde chute, les immeubles s'éventrent
  // (toits déchiquetés), fument, puis BRÛLENT — la skyline raconte la fin du monde.
  const ruinBase = clamp((dev-0.3)*1.8, 0, 1);
  const ruinTop = (bx, topY, bw2, h1)=>{                       // toit déchiqueté + fumée + feu
    ctx.fillStyle='rgba(12,10,12,0.95)';
    ctx.beginPath(); ctx.moveTo(bx, topY);
    ctx.lineTo(bx+bw2*0.22, topY+7+h1*8); ctx.lineTo(bx+bw2*0.44, topY+2);
    ctx.lineTo(bx+bw2*0.66, topY+9+h1*5); ctx.lineTo(bx+bw2*0.86, topY+3); ctx.lineTo(bx+bw2, topY+8);
    ctx.lineTo(bx+bw2, topY-1); ctx.lineTo(bx, topY-1); ctx.closePath(); ctx.fill();
    if (qFx()){
      ctx.fillStyle='rgba(44,40,42,'+(0.30*ruinBase).toFixed(3)+')';                     // fumée du toit
      for (let p2=0;p2<3;p2++){ const ph=((t*0.3+p2*0.33+h1)%1);
        ctx.beginPath(); ctx.arc(bx+bw2*0.4+Math.sin(t*0.6+p2+h1*9)*6*ph, topY-4-ph*38, 3+ph*8, 0, 6.283); ctx.fill(); }
      if (dev>0.55){ ctx.save(); ctx.globalCompositeOperation='lighter';                 // fenêtres en feu
        const fl=Math.abs(Math.sin(t*5+h1*20));
        ctx.fillStyle='rgba(255,'+(110+70*fl|0)+',40,'+(0.35*ruinBase).toFixed(3)+')';
        ctx.fillRect(bx+bw2*0.28, topY+10, 6, 7); ctx.restore(); }
    }
  };
  // PERSPECTIVE ATMOSPHÉRIQUE (v1.7) : la skyline lointaine se fond dans la brume de l'horizon
  // au lieu de blocs ardoise opaques qui se confondaient avec les bases au premier plan ; toits
  // variés (gradins, antennes, châteaux d'eau) et fenêtres plus discrètes.
  const hz = devLerp(SKY_M), haze = 0.46*(1-dev*0.45);
  const roofT = (bx, top, bw2, k, body)=>{                     // silhouette de toit variée
    ctx.fillStyle=body;
    if (k===1){ ctx.fillRect(bx+bw2*0.2, top-9, bw2*0.6, 9); }
    else if (k===2){ ctx.fillRect(bx+bw2*0.5-0.8, top-16, 1.6, 16); ctx.fillRect(bx+bw2*0.5-3, top-5, 6, 5); }
    else if (k===3){ ctx.fillRect(bx+bw2*0.25, top-6, 1.4, 6); ctx.fillRect(bx+bw2*0.55, top-6, 1.4, 6); ctx.fillRect(bx+bw2*0.2, top-13, bw2*0.42, 7); }
    else { ctx.fillRect(bx-1.5, top, bw2+3, 2.4); }
  };
  ctx.save(); ctx.translate(-camX*par,0);
  for (let i=0;i<7;i++){
    const bx=40+i*54, bw=34, bh=60+((i*37)%70); if (bx-camX*par>vw+60||bx-camX*par<-90) continue;
    const body=mix(mix([62,58,76],[26,24,34],dev), hz, haze), top=GROUND-bh;
    roofT(bx, top, bw, i%4, body);
    const g=ctx.createLinearGradient(bx,top,bx,GROUND); g.addColorStop(0,shade(body,1.1)); g.addColorStop(1,shade(body,0.82));
    ctx.fillStyle=g; ctx.fillRect(bx,top,bw,bh);
    ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(bx,top,2,bh);                         // arête éclairée
    if (dev<0.7){ ctx.fillStyle='rgba(255,214,150,'+(0.42-dev*0.5).toFixed(3)+')';
      for(let wy=0;wy<bh-14;wy+=12) for(let wxn=0;wxn<3;wxn++) if(((i*7+wy+wxn*5)%4)===0) ctx.fillRect(bx+5+wxn*9,top+7+wy,4,5); }
    const h1=((i*2654435)>>>0)%100/100;
    if (ruinBase > h1*0.9+0.08) ruinTop(bx, top, bw, h1);
  }
  for (let i=0;i<6;i++){
    const bx=WORLD*par-380+i*60, bh=50+((i*53)%60), top=GROUND-bh;
    const body=mix(mix([46,58,78],[20,26,38],dev), hz, haze);
    roofT(bx, top, 40, (i+2)%4, body);
    const g=ctx.createLinearGradient(bx,top,bx,GROUND); g.addColorStop(0,shade(body,1.1)); g.addColorStop(1,shade(body,0.82));
    ctx.fillStyle=g; ctx.fillRect(bx,top,40,bh);
    ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(bx,top,2,bh);
    ctx.fillStyle='rgba(120,214,255,'+((0.24+0.12*Math.sin(t*2+i))*(1-ruinBase*0.7)).toFixed(3)+')';
    for(let wy=6;wy<bh-6;wy+=12) ctx.fillRect(bx+5,top+wy,30,1.6);
    const h1=((i*7654321)>>>0)%100/100;
    if (ruinBase > h1*0.9+0.08) ruinTop(bx, top, 40, h1);
  }
  ctx.restore();
}
function drawTree(tr, dev, t, vw){
  const x=tr.x-camX; if (x<-50||x>vw+50) return;
  const y=gY(tr.x), s=tr.s, sway=Math.sin(t*0.8+tr.ph)*2*s*(1-dev), bark=mix([96,70,46],[50,42,38],dev);
  if (dev<0.78) projShadow(x, y, 16*s);          // ombre portée de l'arbre
  // ESSENCES VARIÉES (v1.8) : pins et peupliers parmi les feuillus, choisis par la position
  const sp = lhash(Math.round(tr.x), 3.3);
  if (sp<0.3 || sp>0.86){ treeAlt(sp<0.3? 'pine' : 'poplar', x, y, s, sway, dev, bark, tr); return; }
  // TRONC détaillé : évasement de racines, fût à deux tons, branche maîtresse
  ctx.fillStyle=shade(bark,0.8);
  ctx.beginPath(); ctx.moveTo(x-6*s,y+3); ctx.quadraticCurveTo(x-2*s,y-4*s,x-2.6*s,y-12*s);
  ctx.lineTo(x+2.6*s,y-12*s); ctx.quadraticCurveTo(x+2*s,y-4*s,x+6*s,y+3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle=bark; ctx.lineWidth=6*s; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x,y+2); ctx.quadraticCurveTo(x+sway*0.5,y-34*s,x+sway,y-62*s); ctx.stroke();
  ctx.strokeStyle=shade(bark,1.28); ctx.lineWidth=2*s;                          // arête éclairée du fût
  ctx.beginPath(); ctx.moveTo(x-1.6*s,y); ctx.quadraticCurveTo(x+sway*0.5-1.6*s,y-30*s,x+sway-1.6*s,y-56*s); ctx.stroke();
  ctx.strokeStyle=bark; ctx.lineWidth=3*s;                                      // branche maîtresse
  ctx.beginPath(); ctx.moveTo(x+sway*0.6,y-40*s); ctx.quadraticCurveTo(x+sway+9*s,y-50*s,x+sway+15*s,y-58*s); ctx.stroke();
  if (dev<0.78){
    // CANOPÉE 3 couches : masse d'ombre, feuillage principal, amas de lumière — volume réel
    const leaf=lerpColArr(devLerp(GRASS),[120,90,50],dev*0.7), cx=x+sway, cy=y-70*s, r=25*s*(1-dev*0.55);
    ctx.fillStyle=shade(leaf,0.55);                                              // couche d'ombre (dessous)
    ctx.beginPath(); ctx.arc(cx-r*0.5,cy+r*0.45,r*0.7,0,6.283); ctx.arc(cx+r*0.55,cy+r*0.4,r*0.75,0,6.283);
    ctx.arc(cx,cy+r*0.5,r*0.8,0,6.283); ctx.fill();
    const g=ctx.createRadialGradient(cx-r*0.3,cy-r*0.3,2,cx,cy,r*1.5);
    g.addColorStop(0,shade(leaf,1.3)); g.addColorStop(1,shade(leaf,0.65));
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,6.283); ctx.arc(cx-r*0.62,cy+r*0.3,r*0.72,0,6.283); ctx.arc(cx+r*0.62,cy+r*0.22,r*0.78,0,6.283); ctx.arc(cx,cy-r*0.5,r*0.62,0,6.283); ctx.fill();
    ctx.fillStyle=shade(leaf,1.5);                                               // amas de lumière (soleil haut-gauche)
    ctx.beginPath(); ctx.arc(cx-r*0.42,cy-r*0.5,r*0.34,0,6.283);
    ctx.arc(cx+r*0.1,cy-r*0.72,r*0.26,0,6.283); ctx.arc(cx-r*0.75,cy-r*0.05,r*0.24,0,6.283); ctx.fill();
    if (qHi()){ ctx.fillStyle=rgbaC(shade(leaf,1.7),0.8);                        // feuilles piquées de lumière
      for (let i2=0;i2<5;i2++){ const a2=tr.ph+i2*1.35, lx=cx+Math.cos(a2)*r*0.72, ly=cy+Math.sin(a2)*r*0.5-r*0.2;
        ctx.fillRect(lx, ly, 2.2*s, 2.2*s); } }
  } else { ctx.lineWidth=3*s; ctx.beginPath(); ctx.moveTo(x+sway,y-62*s); ctx.lineTo(x+sway-13*s,y-76*s);
    ctx.moveTo(x+sway,y-54*s); ctx.lineTo(x+sway+14*s,y-70*s); ctx.stroke(); }
}
function treeAlt(kind, x, y, s, sway, dev, bark, tr){
  const dead = dev>=0.78;
  ctx.strokeStyle=bark; ctx.lineCap='round';
  if (kind==='pine'){
    ctx.lineWidth=4.4*s; ctx.beginPath(); ctx.moveTo(x,y+2); ctx.lineTo(x+sway*0.6,y-70*s); ctx.stroke();
    if (dead){ ctx.lineWidth=1.8*s; ctx.beginPath();
      for (let i=0;i<4;i++){ const yy=y-22*s-i*12*s, d=(i%2?1:-1); ctx.moveTo(x+sway*0.3*(i/4),yy); ctx.lineTo(x+d*(9-i*1.6)*s,yy-5*s); } ctx.stroke(); return; }
    const pine = lerpColArr([52,96,70],[96,90,52],dev*0.9);
    for (let i=0;i<3;i++){                                   // trois étages d'aiguilles, ombre à droite
      const by=y-(16+i*17)*s, w=(19-i*4.6)*s, h=(30-i*4)*s, tx=x+sway*(0.4+i*0.25);
      ctx.fillStyle=shade(pine,0.72); ctx.beginPath(); ctx.moveTo(x-w,by); ctx.lineTo(tx,by-h); ctx.lineTo(x+w,by); ctx.closePath(); ctx.fill();
      ctx.fillStyle=shade(pine,1.12); ctx.beginPath(); ctx.moveTo(x-w,by); ctx.lineTo(tx,by-h); ctx.lineTo(x-w*0.05,by-1.5*s); ctx.closePath(); ctx.fill();
    }
  } else {
    ctx.lineWidth=4*s; ctx.beginPath(); ctx.moveTo(x,y+2); ctx.lineTo(x+sway*0.5,y-40*s); ctx.stroke();
    if (dead){ ctx.lineWidth=1.8*s; ctx.beginPath(); ctx.moveTo(x+sway*0.5,y-40*s); ctx.lineTo(x+sway,y-72*s);
      ctx.moveTo(x,y-34*s); ctx.lineTo(x-7*s,y-52*s); ctx.moveTo(x,y-44*s); ctx.lineTo(x+8*s,y-60*s); ctx.stroke(); return; }
    const leaf = lerpColArr(lerpColArr(devLerp(GRASS),[150,170,80],0.25),[170,120,50],dev*0.8), cx=x+sway, cy=y-62*s;
    ctx.fillStyle=shade(leaf,0.62); ctx.beginPath(); ctx.ellipse(cx+2*s,cy+3*s,11*s,30*s,0,0,6.283); ctx.fill();
    const g=ctx.createLinearGradient(cx-11*s,cy-30*s,cx+11*s,cy+20*s); g.addColorStop(0,shade(leaf,1.35)); g.addColorStop(1,shade(leaf,0.7));
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(cx,cy,10*s,28*s,0,0,6.283); ctx.fill();
    if (qHi()){ ctx.fillStyle=rgbaC(shade(leaf,1.6),0.75);
      for (let i=0;i<5;i++){ const a=tr.ph+i*1.3; ctx.fillRect(cx-4*s+Math.cos(a)*4*s, cy-18*s+i*7*s, 2*s, 2*s); } }
  }
}
function drawNode(n){
  const x=n.x-camX; if (x<-110||x>VW()+110) return;
  const dev=game.dev, t=game.t, y=gY(n.x), rw=(n.center?54:40)*(1-0.5*dev), rh=rw*0.34;
  // bassin réfléchissant
  ctx.save(); ctx.beginPath(); ctx.ellipse(x,y+6,rw,rh,0,0,6.283); ctx.clip();
  const wg=ctx.createLinearGradient(0,y-rh,0,y+rh*2);
  wg.addColorStop(0,lerpCol([150,215,250],[110,130,130],dev)); wg.addColorStop(1,lerpCol([30,90,120],[40,60,60],dev));
  ctx.fillStyle=wg; ctx.fillRect(x-rw,y-rh,rw*2,rh*3.5);
  ctx.save(); ctx.globalCompositeOperation='lighter';
  // les reflets s'agitent quand une explosion proche secoue la scène (flash/secousse globaux)
  const react = clamp((game.flash||0)*1.1 + (game.shake||0)*0.035, 0, 0.5);
  for(let i=0;i<3;i++){ ctx.fillStyle='rgba(220,245,255,'+(0.2-i*0.05+react*0.5)+')'; ctx.fillRect(x-rw, y+2+i*5+Math.sin(t*2+i)*(1.5+react*9), rw*2, 1.6); }
  ctx.restore(); ctx.restore();
  // rim lumineux
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle='rgba(200,240,255,0.6)'; ctx.lineWidth=2; ctx.shadowColor='#bfe6f2'; ctx.shadowBlur=6;
  ctx.beginPath(); ctx.ellipse(x,y+6,rw,rh,0,Math.PI*0.05,Math.PI*0.95); ctx.stroke(); ctx.restore();
  // mât + drapeau
  const owner=n.owner, col=owner?(owner==='p'?game.p.fac.accent:game.e.fac.accent):'#9a8a78';
  ctx.strokeStyle='#5a4a3a'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(x,y-2); ctx.lineTo(x,y-46); ctx.stroke();
  const wave=Math.sin(t*3)*3; ctx.fillStyle=col;
  ctx.beginPath(); ctx.moveTo(x,y-46); ctx.lineTo(x+22,y-40+wave); ctx.lineTo(x,y-32); ctx.closePath(); ctx.fill();
  if (Math.abs(n.prog)<1 && n.prog!==0){
    ctx.fillStyle='#000a'; ctx.fillRect(x-22,y-58,44,5);
    ctx.fillStyle = n.prog>0? game.p.fac.accent : game.e.fac.accent; ctx.fillRect(x-22,y-58,44*Math.abs(n.prog),5); }
  if (n.center){ ctx.font='11px Arial'; ctx.textAlign='center'; ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillText(tr('oasis'), x, y-82); }
}

/* ====== ÉCLAIRAGE & MATIÈRE — relief 2.5D sculpté + accents néon ====== */
const LIGHT = { x:-0.55, y:-0.83 };               // direction de la lumière (haut-gauche)
const rgbaC = (col,a)=>{ const m=toRGB(col); return 'rgba('+(m[0]|0)+','+(m[1]|0)+','+(m[2]|0)+','+a+')'; };
function lgrad(x0,y0,x1,y1,st){ const g=TC.createLinearGradient(x0,y0,x1,y1); for(const s of st) g.addColorStop(s[0],s[1]); return g; }
function rgrad(x,y,r,st){ const g=TC.createRadialGradient(x,y,1,x,y,Math.max(2,r)); for(const s of st) g.addColorStop(s[0],s[1]); return g; }
function rrectT(x,y,w,h,r){ r=Math.min(r,Math.abs(w)/2,Math.abs(h)/2); TC.beginPath(); TC.moveTo(x+r,y);
  TC.arcTo(x+w,y,x+w,y+h,r); TC.arcTo(x+w,y+h,x,y+h,r); TC.arcTo(x,y+h,x,y,r); TC.arcTo(x,y,x+w,y,r); TC.closePath(); }
function bloomT(col,b,fn){ TC.save(); if (!BLOOM_OFF){ TC.globalCompositeOperation='lighter'; TC.shadowColor=col; TC.shadowBlur=b; } fn(); TC.restore(); }
// pièce sculptée : dégradé directionnel + occlusion basse + arête de lumière (+ liseré néon optionnel)
function sculptT(x,y,w,h,r,base,rim){
  TC.fillStyle=lgrad(x,y,x+w,y+h,[[0,shade(base,1.5)],[0.45,base],[1,shade(base,0.42)]]); rrectT(x,y,w,h,r); TC.fill();
  TC.fillStyle='rgba(0,0,0,0.22)'; rrectT(x,y+h*0.6,w,h*0.42,r*0.6); TC.fill();
  TC.fillStyle='rgba(255,255,255,0.40)'; rrectT(x+w*0.07,y+h*0.05,Math.max(2,w*0.16),h*0.66,r*0.5); TC.fill();
  if (rim){ TC.strokeStyle=rgbaC(rim,0.85); TC.lineWidth=2; bloomT(rim,6,()=>{ rrectT(x,y,w,h,r); TC.stroke(); }); }
}
// ombre projetée douce au sol (ray-tracing simulé), en direct sur l'écran
function projShadow(x,gy,w){
  ctx.save(); ctx.translate(x,gy+2); ctx.transform(1,0,-LIGHT.x/LIGHT.y*0.7,0.34,0,0);
  const g=ctx.createRadialGradient(0,0,1,0,0,Math.max(3,w*1.6));
  g.addColorStop(0,'rgba(6,5,9,0.36)'); g.addColorStop(0.6,'rgba(6,5,9,0.15)'); g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(0,0,w*1.5,w*0.95,0,0,6.283); ctx.fill(); ctx.restore();
}
function drawStar(cx,cy,r,col){ TC.fillStyle=col; TC.beginPath();
  for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr2=i%2?r*0.45:r;
    const px=cx+Math.cos(a)*rr2, py=cy+Math.sin(a)*rr2; i?TC.lineTo(px,py):TC.moveTo(px,py); }
  TC.closePath(); TC.fill(); }

/* ---- sprites d'unités mis en cache : de vrais personnages ---- */
// v1.7 : fini les capsules identiques cernées de néon. Chaque RÔLE a sa silhouette, lisible au
// premier coup d'œil même en pleine mêlée : bouclier du tank, tube sur l'épaule du siège, fusil
// épaulé du tireur, lame levée du mêlée, sac à croix rouge du soutien. Chaque ÈRE a son
// équipement (survivants dépareillés → milice → tactique → exo-armure → armure d'or ; robots
// industriels → coque → blindés → effilés → cristal). Le néon n'est plus qu'un accent (visière,
// cœur, brassard, foulard) : les halos qui bavaient et fusionnaient en mêlée ont disparu.
const USP = { W:80, H:90, cx:40, foot:74 };          // marge haute : cimiers, auréoles, couronnes
function polyP(p){ TC.beginPath(); TC.moveTo(p[0],p[1]); for(let i=2;i<p.length;i+=2) TC.lineTo(p[i],p[i+1]); TC.closePath(); }
function strokeP(p){ TC.beginPath(); TC.moveTo(p[0],p[1]); for(let i=2;i<p.length;i+=2) TC.lineTo(p[i],p[i+1]); }
// plaque ombrée : dégradé directionnel (lumière haut-gauche) + arête claire
function plateT(p, col, edge){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(let i=0;i<p.length;i+=2){ if(p[i]<x0)x0=p[i]; if(p[i]>x1)x1=p[i]; if(p[i+1]<y0)y0=p[i+1]; if(p[i+1]>y1)y1=p[i+1]; }
  polyP(p); TC.fillStyle=lgrad(x0,y0,x1,y1,[[0,shade(col,1.4)],[0.5,col],[1,shade(col,0.56)]]); TC.fill();
  if (edge!==false){ TC.strokeStyle='rgba(255,255,255,0.2)'; TC.lineWidth=0.9; TC.stroke(); }
}
// membre : segment épais aux articulations arrondies (côté ombre + face éclairée + reflet)
function limbT(p, w, col){
  TC.lineCap='round'; TC.lineJoin='round';
  strokeP(p); TC.strokeStyle=shade(col,0.6); TC.lineWidth=w; TC.stroke();
  TC.save(); TC.translate(-w*0.12,-w*0.12); strokeP(p); TC.strokeStyle=col; TC.lineWidth=w*0.6; TC.stroke();
  TC.translate(-w*0.08,-w*0.07); strokeP(p); TC.strokeStyle='rgba(255,255,255,0.24)'; TC.lineWidth=Math.max(0.8,w*0.18); TC.stroke();
  TC.restore();
}
// tube (canon, lance-roquettes, fût) : cylindre ombré entre deux points
function tubeT(x0,y0,x1,y1,r,col){
  TC.save(); TC.translate(x0,y0); TC.rotate(Math.atan2(y1-y0,x1-x0));
  TC.fillStyle=lgrad(0,-r,0,r,[[0,shade(col,1.5)],[0.35,col],[1,shade(col,0.5)]]);
  rrectT(0,-r,Math.hypot(x1-x0,y1-y0),2*r,Math.min(r,1.6)); TC.fill(); TC.restore();
}
function crossT(x,y,s,col){ TC.fillStyle=col; TC.fillRect(x-s/2,y-s/6,s,s/3); TC.fillRect(x-s/6,y-s/2,s/3,s); }
// point lumineux : seul élément néon des personnages (petit, net, cœur blanc)
function glowDot(x,y,r,col,b){
  bloomT(col,b||6,()=>{ TC.fillStyle=col; TC.beginPath(); TC.arc(x,y,r,0,6.283); TC.fill(); });
  TC.fillStyle='rgba(255,255,255,0.85)'; TC.beginPath(); TC.arc(x-r*0.25,y-r*0.25,r*0.42,0,6.283); TC.fill();
}
// bande perpendiculaire à un segment (brassard sur le haut du bras)
function bandT(x0,y0,x1,y1,t,w,col){
  const x=x0+(x1-x0)*t, y=y0+(y1-y0)*t;
  TC.save(); TC.translate(x,y); TC.rotate(Math.atan2(y1-y0,x1-x0)); TC.fillStyle=col; TC.fillRect(-1.3,-w/2,2.6,w); TC.restore();
}
// bouche de l'arme [avance, hauteur] par rôle : tirs, éclairs et obus partent enfin du canon
const MZ_DEF=[10,-26], MZ_MEL=[8,-36], MZ_HR=[29,-40], MZ_HS=[25,-47], MZ_BS=[7,-55], MZ_BR=[0,1,2,3,4].map(e=>[22+e,-35.5]);
function muzzleOf(u){
  if (u.fly || u.role==='hero' || u.role==='gremlin') return MZ_DEF;
  const hum = u.fac==='HUM';
  if (u.role==='ranged') return hum? MZ_HR : (MZ_BR[u.era]||MZ_DEF);
  if (u.role==='siege') return hum? MZ_HS : MZ_BS;
  return MZ_MEL;
}
function drawUnitSprite(kind, fac, role, era, trans){
  if (kind==='bot') drawBotSprite(fac, role, era, trans, false); else drawHumSprite(fac, role, era, trans, false);
}
// poses des bras par rôle : épaule, coude, main (bras arrière b*, bras avant f*), repère cx/F
function armPose(role, era, cx, F){
  switch(role){
    case 'melee':  return { b:[cx-3,F-42, cx-1,F-34, cx+9,F-36], f:[cx+2,F-42, cx+9,F-35, cx+14,F-42] };
    case 'tank':   return { b:[cx-3,F-42, cx-6,F-34, cx-4,F-27], f:[cx+2,F-42, cx+6,F-33, cx+11,F-34] };
    case 'siege':  return { b:[cx-3,F-42, cx+5,F-36, cx+15,F-43], f:[cx+2,F-42, cx+4,F-34, cx+8,F-40] };
    case 'support':return era>=2 ? { b:[cx-3,F-42, cx-5,F-33, cx-3,F-26], f:[cx+2,F-42, cx+8,F-35, cx+13,F-38] }
                                 : { b:[cx-3,F-42, cx-5,F-33, cx-3,F-26], f:[cx+2,F-42, cx+5,F-33, cx+7,F-27] };
    case 'hero':   return { b:[cx-3,F-43, cx-7,F-35, cx-5,F-27], f:[cx+3,F-44, cx+10,F-41, cx+15,F-47] };
    default:       return { b:[cx-3,F-42, cx+4,F-35, cx+16,F-38], f:[cx+2,F-42, cx+3,F-33, cx+9,F-37] };   // tireur
  }
}

// ===== HUMANITÉ : survivants 2025 → milice → tactique → exo-armure → armure d'or =====
function drawHumSprite(fac, role, era, trans, hero){
  const cx=USP.cx, F=USP.foot, acc=FACTIONS[fac].accent;
  const uni = hero? '#55653c' : FACTIONS[fac].eraCols[era];
  const tank = role==='tank', sw = tank? 10 : 8;                 // demi-largeur d'épaules
  const pants = era===4? shade(uni,0.72) : mix(uni,'#26262c',0.42);
  const boot = era===4? '#8a6a2a' : era===3? '#2c2a36' : '#2a2420';
  const skin = '#e2b48a', glove = era>=3? shade(uni,0.85) : era===2? '#2a2c30' : skin;
  const metal = era===4? '#ecd27e' : '#a2aab6';
  const lw = tank? 8 : 7, aw = tank? 6.2 : 5.4;
  const P = hero? { b:[cx-3,F-42, cx-5,F-33, cx-2,F-26], f:[cx+2,F-42, cx+10,F-48, cx+12.5,F-60] } : armPose(role, era, cx, F);
  const RED = '#d8282a';
  // --- arrière-plan : cape (ère d'or), paquetage
  if (era===4){ TC.fillStyle=lgrad(cx-14,F-46,cx-4,F-8,[[0,'#c8402c'],[1,'#661a16']]);
    polyP([cx-6,F-46, cx-1,F-44, cx-7,F-9, cx-19,F-11, cx-14,F-30]); TC.fill(); }
  if (role==='support'){
    const bx=cx-sw-7;
    if (era>=1){ TC.strokeStyle='#2a2a2e'; TC.lineWidth=1.2; strokeP([bx+2,F-45, bx-1,F-60]); TC.stroke(); glowDot(bx-1,F-60,1.2,'#ff5a4a',4); }
    TC.fillStyle=lgrad(bx,F-46,bx+9,F-26,[[0,era===4?'#fff6dc':'#f2f4f0'],[1,era===4?'#c8a860':'#a8aca8']]); rrectT(bx,F-46,9,20,3); TC.fill();
    crossT(bx+4.5,F-37,6,RED);
  } else if (role==='siege'){
    const bx=cx-sw-6;
    for (let i=0;i<2;i++){ tubeT(bx+1.5+i*3.4,F-44,bx+1.5+i*3.4,F-53,1.4,'#6a7048'); TC.fillStyle='#c84a2a';
      polyP([bx+0.1+i*3.4,F-53, bx+2.9+i*3.4,F-53, bx+1.5+i*3.4,F-57]); TC.fill(); }
    TC.fillStyle=lgrad(bx,F-46,bx+8,F-28,[[0,'#6a5e4c'],[1,'#3a3228']]); rrectT(bx,F-46,8,18,2.5); TC.fill();
  }
  if (hero){ TC.save(); TC.translate(cx+5,F-24); TC.rotate(-2.06);                                 // fusil dans le dos
    TC.fillStyle=lgrad(0,-2,0,3,[[0,'#9a6034'],[1,'#5a3418']]); polyP([0,-2, 12,-1.4, 12,1.8, 0,2.6]); TC.fill();
    tubeT(11,-0.6,38,-0.6,1.1,'#4a4e54'); TC.restore(); }
  // --- jambe arrière (plus sombre : côté opposé à la lumière)
  limbT([cx-1,F-24, cx-4,F-13, cx-6,F-4], lw-0.5, shade(pants,0.72));
  TC.fillStyle=shade(boot,0.8); rrectT(cx-10,F-6,10,6,2); TC.fill();
  // --- bras arrière
  limbT(P.b, aw-0.4, shade(uni,0.66));
  TC.fillStyle=shade(glove,0.8); TC.beginPath(); TC.arc(P.b[4],P.b[5],aw*0.45,0,6.283); TC.fill();
  // --- jambe avant + botte
  limbT([cx+2,F-24, cx+5,F-13, cx+5,F-4], lw, pants);
  if (era>=3) plateT([cx+2,F-18, cx+8,F-16, cx+7.5,F-9, cx+2,F-10], shade(uni,era===4?1:1.1));
  TC.fillStyle=lgrad(cx,F-6,cx,F,[[0,shade(boot,1.5)],[1,boot]]); rrectT(cx+1,F-6,11,6,2); TC.fill();
  TC.fillStyle='rgba(0,0,0,0.35)'; TC.fillRect(cx+1,F-1.4,11,1.4);
  // --- torse
  plateT([cx-sw+1,F-45, cx+sw-1,F-45, cx+sw,F-41, cx+sw-2,F-23, cx-sw+2,F-23, cx-sw,F-41], uni);
  TC.strokeStyle='rgba(0,0,0,0.28)'; TC.lineWidth=1;
  if (era===0){
    strokeP([cx+2,F-44, cx+1,F-25]); TC.stroke();                                         // fermeture éclair
    plateT([cx-7,F-47, cx-1,F-46, cx-3,F-42, cx-8,F-43], shade(uni,0.82), false);         // capuche
    TC.fillStyle=shade(uni,1.18); TC.fillRect(cx-5,F-38,4,4);                              // rapiéçage
    // foulard aux couleurs de la faction (seul accent de l'ère 0)
    TC.fillStyle=lgrad(cx-4,F-48,cx+5,F-43,[[0,shade(acc,1.15)],[1,shade(acc,0.7)]]);
    polyP([cx-4,F-48, cx+5,F-47.5, cx+5.5,F-44, cx-4,F-44]); TC.fill();
    polyP([cx-4,F-47, cx-10,F-41, cx-8,F-39, cx-3,F-44]); TC.fill();
  } else if (era===1){
    TC.fillStyle=shade(uni,0.8); TC.fillRect(cx-5,F-40,4.5,4.5); TC.fillRect(cx+1,F-40,4.5,4.5);   // poches
    TC.lineCap='butt'; TC.strokeStyle='#4a3522'; TC.lineWidth=2.6; strokeP([cx-sw+2,F-44, cx+sw-2,F-26]); TC.stroke(); // cartouchière
    TC.fillStyle='#d8b050'; for(let i=1;i<5;i++){ TC.fillRect(cx-sw+2+i*(2*sw-4)/5-0.8, F-44+i*18/5-1.6, 1.6, 2.2); }
  } else if (era===2){
    plateT([cx-sw+2,F-44, cx+sw-1,F-44, cx+sw-1,F-28, cx-sw+2,F-28], mix(uni,'#2e3238',0.5));   // gilet porte-plaques
    TC.strokeStyle='rgba(0,0,0,0.3)'; for(let i=0;i<3;i++){ strokeP([cx-sw+3,F-40+i*3.4, cx+sw-2,F-40+i*3.4]); TC.stroke(); }
    TC.fillStyle=mix(uni,'#2e3238',0.65); rrectT(cx-5,F-29,4.5,4,1); TC.fill(); rrectT(cx+1,F-29,4.5,4,1); TC.fill();
    TC.fillStyle=acc; TC.fillRect(cx+3,F-42.5,3,2);                                              // écusson
  } else if (era===3){
    plateT([cx-sw+1,F-45, cx+sw-1,F-45, cx+sw-1,F-34, cx,F-31, cx-sw+1,F-34], shade(uni,1.12));     // plastron
    strokeP([cx-4,F-29, cx+5,F-29]); TC.stroke(); strokeP([cx-4,F-26.5, cx+5,F-26.5]); TC.stroke();
    bloomT(acc,5,()=>{ TC.fillStyle=acc; rrectT(cx-2,F-41,6,1.6,0.8); TC.fill(); });
  } else {
    plateT([cx-sw+1,F-45, cx+sw-1,F-45, cx+sw-1,F-33, cx,F-30, cx-sw+1,F-33], '#f0d888');            // plastron d'or
    glowDot(cx+1,F-38.5,2.2,'#ffe9a0',6);
  }
  if (tank || era>=3){                                                                             // épaulière
    const c = era===0? '#5a5650' : era===4? '#e8c860' : shade(uni,1.12);
    plateT([cx-2,F-47, cx+sw+2,F-46.5, cx+sw+3.5,F-40, cx,F-38.5], c);
  }
  TC.fillStyle='#2a2018'; TC.fillRect(cx-sw+2,F-27,2*sw-4,3.4);                                    // ceinturon
  TC.fillStyle=metal; TC.fillRect(cx,F-27,3,3.4);
  if (trans) bloomT('#ff3a2a',7,()=>drawStar(cx+1,F-34,3.6,'#ff4a2a'));                             // révolution
  // --- tête
  const hx=cx+1, hy=F-53, hr=7.6;
  TC.fillStyle=shade(skin,0.75); TC.fillRect(cx-2,F-48,5,4);
  TC.fillStyle=rgrad(hx-3,hy-3,hr*1.5,[[0,shade(skin,1.12)],[0.65,skin],[1,shade(skin,0.68)]]);
  TC.beginPath(); TC.arc(hx,hy,hr,0,6.283); TC.fill(); TC.beginPath(); TC.arc(hx+7.3,hy+1.2,1.7,0,6.283); TC.fill();
  const closed = era>=3 && !hero;                                                                  // casque intégral
  if (!closed){
    TC.fillStyle=shade(skin,0.8); TC.beginPath(); TC.ellipse(hx-2,hy+0.5,1.6,2.3,0,0,6.283); TC.fill();
    TC.fillStyle='#1e1612'; rrectT(hx+3.4,hy-2,1.9,2.6,0.8); TC.fill();
    TC.fillStyle=shade(skin,0.5); TC.fillRect(hx+2.5,hy-3.9,3.8,1);
  }
  const dome = (r, dy, col) => { TC.fillStyle=lgrad(hx-r,hy+dy-r,hx+r,hy+dy,[[0,shade(col,1.35)],[1,shade(col,0.62)]]);
    TC.beginPath(); TC.arc(hx,hy+dy,r,Math.PI,0); TC.closePath(); TC.fill(); };
  if (hero){                                                                                       // le Che
    TC.fillStyle='#2a1e16'; polyP([hx-7,hy-3, hx-3,hy-2, hx-4,hy+6, hx-9,hy+4]); TC.fill();        // cheveux longs
    TC.fillStyle='#2e2016'; polyP([hx-1,hy+2.5, hx+8,hy+2, hx+7,hy+7.5, hx+1,hy+7.5]); TC.fill();   // barbe
    TC.fillStyle='#1e2a1c'; TC.beginPath(); TC.ellipse(hx-0.5,hy-6.5,9.6,4.2,-0.18,0,6.283); TC.fill(); // béret
    bloomT('#ff3a2a',5,()=>drawStar(hx+3.5,hy-7.2,2.2,'#ff4a2a'));
    TC.fillStyle='#d8c0a0'; TC.fillRect(hx+7,hy+3.4,5,1.4); glowDot(hx+12.4,hy+4.1,0.9,'#ff7a3a',4);  // cigare
  } else if (era===0){
    if (role==='tank'){ dome(hr+1,-2,'#d8a630'); TC.fillStyle='#b88a20'; rrectT(hx-9.5,hy-3,19.5,2.2,1); TC.fill(); }      // casque de chantier
    else if (role==='ranged'){ dome(hr+0.6,-1.5,'#3a3e44'); TC.fillStyle='#2a2e34'; rrectT(hx+3,hy-3.6,9,2,1); TC.fill(); }  // casquette
    else if (role==='siege'){ dome(hr+0.8,-1,'#5a4e46'); TC.fillStyle='#4a4038'; rrectT(hx-8.4,hy-3.2,17,3,1.4); TC.fill();  // bonnet
      TC.beginPath(); TC.arc(hx-1,hy-9.6,1.8,0,6.283); TC.fill(); }
    else if (role==='support'){ dome(hr+0.5,-1.5,'#e8e8e4'); crossT(hx+1,hy-5.5,4,RED); }
    else { dome(hr+0.2,-1.2,'#3a2a1e'); TC.fillStyle=acc; rrectT(hx-7.6,hy-5,15.4,2.6,1); TC.fill();                   // bandeau
      TC.strokeStyle=acc; TC.lineWidth=1.4; strokeP([hx-7,hy-4, hx-12,hy-1]); TC.stroke(); strokeP([hx-7,hy-3.4, hx-11,hy+1.5]); TC.stroke(); }
  } else if (era===1){
    const hc = role==='support'? '#dcdcd4' : '#59633f';
    dome(9.6,-1.5,hc); TC.fillStyle=shade(hc,0.7); rrectT(hx-10.5,hy-2.4,21,2.2,1); TC.fill();     // casque acier
    if (role==='support'){ TC.fillStyle='#fff'; TC.beginPath(); TC.arc(hx,hy-6,3.2,0,6.283); TC.fill(); crossT(hx,hy-6,4.4,RED); }
  } else if (era===2){
    dome(9.4,-1.8,'#3c4652'); TC.fillStyle='#4a525c'; rrectT(hx-4.6,hy-1.6,3.2,4.6,1.4); TC.fill();  // casque + oreillette radio
    TC.fillStyle='#2a2e34'; TC.fillRect(hx+5,hy-9,3,3); TC.fillStyle='#1a1d22'; rrectT(hx+4,hy-12.5,6,3.4,1); TC.fill();
    TC.fillStyle='rgba(120,220,160,0.8)'; TC.fillRect(hx+8.4,hy-11.8,1.2,2);                        // JVN relevées
    if (role==='support') crossT(hx-3,hy-6.5,4,RED);
    if (tank){ TC.fillStyle='rgba(170,210,235,0.38)'; rrectT(hx+1,hy-6,8.6,11,2); TC.fill(); }       // visière anti-émeute
  } else {
    const hc = era===4? '#e8c860' : mix(uni,'#2a2a38',0.35);
    TC.fillStyle=lgrad(hx-9,hy-10,hx+9,hy+8,[[0,shade(hc,1.4)],[0.5,hc],[1,shade(hc,0.55)]]);
    TC.beginPath(); TC.arc(hx,hy-0.5,hr+1.4,0,6.283); TC.fill();
    TC.fillStyle=shade(hc,0.6); polyP([hx+2,hy+3, hx+9,hy+2, hx+8,hy+7, hx+2,hy+8]); TC.fill();       // mentonnière
    if (era===4){ TC.fillStyle=lgrad(hx-12,hy-16,hx,hy-8,[[0,'#e84a34'],[1,'#8a2018']]);
      polyP([hx-1,hy-8.5, hx+3,hy-9.5, hx-5,hy-15.5, hx-12,hy-11]); TC.fill(); }                      // cimier
    const vc = era===4? '#fff0c0' : '#ffd34a';
    bloomT(vc,6,()=>{ TC.fillStyle=vc; rrectT(hx+1,hy-2.6,8.6,2.6,1.2); TC.fill(); });              // visière
    if (role==='support') crossT(hx-3,hy-5,4,RED);
  }
  // --- arme (rôle × ère) puis bras avant par-dessus
  const fh = [P.f[4], P.f[5]];
  if (tank){ drawArm(); humShield(); return; }
  if (!hero){                                      // le Che a le poing levé, fusil dans le dos
    if (role==='ranged') humRifle(era);
    else if (role==='melee') humBlade();
    else if (role==='siege') humLauncher();
    else if (role==='support') humMedic();
  }
  drawArm();
  if (hero) return;

  function drawArm(){
    limbT(P.f, aw, shade(uni,0.95));
    if (era>=3) plateT([P.f[2]-3,P.f[3]-3, P.f[2]+3,P.f[3]-2.5, P.f[4]+1,P.f[5]+1.5, P.f[4]-2.5,P.f[5]+2], shade(uni,1.08));
    const band = role==='support'? '#f4f4f0' : trans? '#e8302a' : hero? '#e8302a' : (era===1||era===2)? acc : null;
    if (band){ bandT(P.f[0],P.f[1],P.f[2],P.f[3],0.5,aw+0.6,band); if (role==='support') crossT((P.f[0]+P.f[2])/2,(P.f[1]+P.f[3])/2,2.6,RED); }
    TC.fillStyle=lgrad(fh[0]-2,fh[1]-2,fh[0]+2,fh[1]+2,[[0,shade(glove,1.2)],[1,shade(glove,0.75)]]);
    TC.beginPath(); TC.arc(fh[0],fh[1],aw*0.5,0,6.283); TC.fill();
  }
  function humBlade(){
    TC.save(); TC.translate(fh[0],fh[1]); TC.rotate(-1.05);
    TC.fillStyle='#3a2a1e'; rrectT(-4,-1.4,7,2.8,1); TC.fill();                                       // poignée
    if (era===0){ tubeT(2,0,18,0,1.5,'#8a8a86'); TC.fillStyle='#c8c4b8'; TC.fillRect(2,-1.7,4,3.4); }   // barre à mine
    else if (era===1){ TC.fillStyle=lgrad(3,-3,3,2,[[0,'#e8ecf0'],[1,'#7a828c']]); polyP([3,-1.6, 18,-3, 21,-0.6, 17,1.8, 3,1.6]); TC.fill(); }  // machette
    else if (era===2){ tubeT(2,0,17,0,1.2,'#2a2c30'); TC.fillStyle=lgrad(12,-7,18,0,[[0,'#e0e4ea'],[1,'#6a7280']]);
      polyP([12,-1.4, 17,-1.4, 19.5,-7, 14,-6]); TC.fill(); }                                            // tomahawk
    else { const bc = era===4? '#fff3c4' : '#ffe0b0', gc = era===4? '#ffe9a0' : acc;
      TC.fillStyle=era===4? '#d8a840' : '#4a4a58'; TC.fillRect(2,-3.2,2.2,6.4);                         // garde
      bloomT(gc,7,()=>{ TC.fillStyle=bc; polyP([4,-1.8, 21,-1.3, 24,0, 21,1.3, 4,1.8]); TC.fill(); });   // lame d'énergie / d'or
      TC.fillStyle='rgba(255,255,255,0.9)'; TC.fillRect(5,-0.4,16,0.8); }
    TC.restore();
  }
  function humRifle(e){
    const y=F-39;
    if (e<=1){
      TC.fillStyle=lgrad(cx-2,y-2,cx+20,y+4,[[0,'#9a6034'],[1,'#5a3418']]);                             // crosse en bois
      polyP([cx-2,y-2.5, cx+8,y-1.5, cx+12,y-0.2, cx+21,y-0.2, cx+21,y+1.4, cx+9,y+1.8, cx+4,y+3.6, cx-2,y+3]); TC.fill();
      tubeT(cx+10,y-1.4,cx+30+e*2,y-1.4,1.1,'#5a5e64');
      if (e===1){ TC.fillStyle=metal; TC.beginPath(); TC.arc(cx+10,y+1.6,1.2,0,6.283); TC.fill();
        TC.fillStyle='#c8ccd2'; polyP([cx+31,y-2.2, cx+36,y-1.4, cx+31,y-0.6]); TC.fill(); }               // baïonnette
    } else if (e===2){
      TC.fillStyle='#2a2c30'; polyP([cx-1,y-2.4, cx+19,y-2.4, cx+19,y+1.2, cx+8,y+2, cx+2,y+3.4, cx-1,y+2.4]); TC.fill();
      TC.fillStyle='#1c1e22'; polyP([cx+10,y+1.4, cx+14,y+1.4, cx+15.5,y+7.2, cx+11.5,y+6.6]); TC.fill();  // chargeur
      tubeT(cx+19,y-1,cx+28,y-1,1,'#3a3c40');
      TC.fillStyle='#1c1e22'; TC.fillRect(cx+8,y-3.6,1.6,1.4); tubeT(cx+5,y-5,cx+14,y-5,1.5,'#24262a');     // lunette
      TC.fillStyle='rgba(140,220,255,0.9)'; TC.fillRect(cx+13.4,y-5.8,0.9,1.6);
    } else {
      const bc = e===4? '#f0d888' : '#c8ccd6', ec = e===4? '#ffe9a0' : '#ffb35a';
      plateT([cx-1,y-3, cx+22,y-2.4, cx+27,y-0.4, cx+22,y+2, cx+7,y+2.4, cx+2,y+3.6, cx-1,y+2.4], bc);
      TC.fillStyle=shade(bc,0.45); TC.fillRect(cx+6,y+0.6,15,1.2);
      for (let i=0;i<3;i++) glowDot(cx+11+i*3.6,y-0.4,0.9,ec,4);
      glowDot(cx+27,y-0.4,1.5,ec,6);
    }
  }
  function humLauncher(){
    const x0=cx-13, y0=F-42, x1=cx+20, y1=F-47;
    const tc = era===0? '#7a7e84' : era===1? '#5a6a3c' : era===2? '#3e4a3c' : era===3? '#2c2e3a' : '#d8b048';
    if (era===1) tubeT(x0-2,y0+0.3,x0+5,y0-0.8,4.4,shade(tc,0.85));                                      // évasement arrière
    tubeT(x0,y0,x1,y1,3.4,tc);
    const along = (t,fn) => { TC.save(); TC.translate(x0+(x1-x0)*t, y0+(y1-y0)*t); TC.rotate(Math.atan2(y1-y0,x1-x0)); fn(); TC.restore(); };
    if (era===0){ for (const t of [0.25,0.62]) along(t,()=>{ TC.fillStyle='#c4c8cc'; TC.fillRect(-2,-3.6,4,7.2); });   // ruban adhésif
      along(1,()=>{ TC.fillStyle='#c84a2a'; polyP([0,-2.6, 5,0, 0,2.6]); TC.fill(); }); }                  // roquette qui dépasse
    else if (era===1) along(0.82,()=>{ TC.fillStyle=shade(tc,0.7); TC.fillRect(-1,-6,2,4); });
    else if (era===2) along(0.5,()=>{ TC.fillStyle='#1c2024'; rrectT(-3,-8.4,7,4.4,1); TC.fill();
      TC.fillStyle='rgba(140,220,255,0.9)'; TC.fillRect(3,-7.4,1,2.4); });                                // optique
    else if (era===3){ for (const t of [0.4,0.6,0.8]) along(t,()=>{ bloomT('#ffb35a',5,()=>{ TC.fillStyle='#ffb35a'; TC.fillRect(-0.9,-3.8,1.8,7.6); }); });
      along(1,()=>{ TC.fillStyle='#4a4c5a'; TC.fillRect(0,-3.4,5,1.6); TC.fillRect(0,1.8,5,1.6); }); }       // rails
    else along(1,()=>glowDot(1,0,2.2,'#fff0c0',7));
    along(0.4,()=>{ TC.fillStyle='#2a2a2e'; TC.fillRect(-1.2,2.4,2.4,4.4); });                              // poignée
  }
  function humMedic(){
    if (era<2){ TC.fillStyle='#4a4038'; TC.fillRect(fh[0]-0.8,fh[1],1.6,2.4);                               // trousse portée
      TC.fillStyle=lgrad(fh[0]-5,fh[1]+2,fh[0]+5,fh[1]+10,[[0,'#ffffff'],[1,'#b8bcb8']]); rrectT(fh[0]-5,fh[1]+2,10,8,1.6); TC.fill();
      crossT(fh[0],fh[1]+6,5,RED); }
    else { const bc = era===4? '#f0d888' : '#e4e8ec';                                                       // émetteur de soin
      plateT([fh[0]-3,fh[1]-3, fh[0]+8,fh[1]-2.4, fh[0]+9,fh[1]+1.2, fh[0]-2,fh[1]+2], bc);
      crossT(fh[0]+3,fh[1]-0.6,3,RED); glowDot(fh[0]+9.6,fh[1]-0.6,1.6,'#7dffb0',6); }
  }
  function humShield(){
    const x=cx+8, y=F-50, w=12, h=46;
    if (era===0){ TC.fillStyle=lgrad(x,y,x+w,y+h,[[0,'#9a7a52'],[1,'#5a4228']]); rrectT(x,y,w,h,1.5); TC.fill();   // porte de récup
      TC.strokeStyle='rgba(0,0,0,0.3)'; TC.lineWidth=0.8; for (let i=1;i<3;i++){ strokeP([x+i*4,y+1, x+i*4,y+h-1]); TC.stroke(); }
      TC.fillStyle='#8a8e92'; TC.fillRect(x,y+9,w,3); TC.fillRect(x,y+h-12,w,3);
      TC.fillStyle='#c8ccd0'; for (const yy of [y+10.5,y+h-10.5]) for (const xx of [x+2,x+w-2]){ TC.beginPath(); TC.arc(xx,yy,0.8,0,6.283); TC.fill(); } }
    else if (era===1){ plateT([x,y, x+w,y+1, x+w,y+h-1, x,y+h], '#8a9098');                                         // bouclier d'acier
      TC.fillStyle='#1a1d22'; rrectT(x+3,y+5,w-5,2.2,1); TC.fill();
      TC.fillStyle='#c8ccd2'; for (let i=0;i<5;i++){ TC.beginPath(); TC.arc(x+1.6,y+4+i*9.4,0.8,0,6.283); TC.arc(x+w-1.6,y+4+i*9.4,0.8,0,6.283); TC.fill(); } }
    else if (era===2){ TC.fillStyle='rgba(150,190,215,0.62)'; rrectT(x,y,w,h,2); TC.fill();                        // polycarbonate
      TC.strokeStyle='rgba(40,50,60,0.9)'; TC.lineWidth=1.4; rrectT(x,y,w,h,2); TC.stroke();
      TC.fillStyle='rgba(255,255,255,0.45)'; TC.fillRect(x+2,y+3,1.6,h-8);
      TC.fillStyle=acc; TC.fillRect(x+1,y+h*0.42,w-2,3); }
    else { const c = era===4? '#e8c860' : '#3a3a4a';                                                                 // pavois d'énergie / d'or
      plateT([x,y+2, x+w/2,y, x+w,y+2, x+w,y+h-6, x+w/2,y+h, x,y+h-6], c);
      if (era===3){ TC.strokeStyle=rgbaC(acc,0.9); TC.lineWidth=1.2; bloomT(acc,5,()=>{ polyP([x+2,y+4, x+w/2,y+2.5, x+w-2,y+4, x+w-2,y+h-7, x+w/2,y+h-2.5, x+2,y+h-7]); TC.stroke(); }); }
      else bloomT('#fff0c0',7,()=>drawStar(x+w/2,y+h*0.42,4.2,'#fff3c4')); }
  }
}

// ===== GPT : robots industriels → coque → blindés → effilés → cristal =====
function drawBotSprite(fac, role, era, trans, hero){
  const cx=USP.cx, F=USP.foot;
  const lite = hero? '#ff6ad6' : FACTIONS[fac].eraCols[era];         // couleur de l'ère : lumières
  const plate = mix(lite,'#4a5260',0.5), frame='#2a3038', joint='#15181d';
  const tank = role==='tank', heavy = tank || role==='siege', sw = tank? 11 : role==='siege'? 9.5 : 8.5;
  const lw = heavy? 6.4 : 5, hy0 = tank? 4 : 0;
  const P = armPose(hero?'hero':role, era, cx, F);
  if (!hero){ P.f[0]+=1; P.f[1]-=2; P.b[1]-=2; }                       // épaules de châssis plus hautes
  // --- drone de réparation (soutien), derrière
  if (role==='support'){
    TC.fillStyle=lgrad(cx-16,F-66,cx-4,F-60,[[0,shade(plate,1.4)],[1,shade(plate,0.6)]]);
    TC.beginPath(); TC.ellipse(cx-10,F-63,6,2.4,0,0,6.283); TC.fill();
    TC.fillStyle=frame; TC.fillRect(cx-17,F-66,14,1.2);
    glowDot(cx-10,F-60.6,1.4,lite,5);
  }
  // --- nacelle lance-missiles (siège), sur l'épaule arrière
  if (role==='siege'){
    plateT([cx-14,F-55, cx+2,F-60, cx+4,F-49, cx-12,F-45], plate);
    TC.fillStyle=frame; polyP([cx+2,F-60, cx+5,F-61, cx+7,F-50, cx+4,F-49]); TC.fill();
    const n = 2 + Math.min(era,2);
    for (let i=0;i<n;i++){ const t=(i+0.5)/n; const x=cx+5.5+t*1.6, y=F-60.5+t*10.5;
      TC.fillStyle='#0c1014'; TC.beginPath(); TC.arc(x,y,1.9,0,6.283); TC.fill();
      TC.fillStyle=era>=2? lite : '#e04a3a'; TC.beginPath(); TC.arc(x+0.3,y,1.2,0,6.283); TC.fill(); }
    TC.fillStyle=joint; TC.fillRect(cx-6,F-47,4,4);
  }
  // --- jambe arrière (digitigrade)
  const lb = shade(frame,0.8);
  limbT([cx-2,F-25, cx+1,F-15], lw+0.6, lb); limbT([cx+1,F-15, cx-4,F-5], lw-0.4, lb);
  plateT([cx-8,F, cx+2,F, cx,F-4, cx-5,F-5], shade(plate,0.65));
  // --- bras arrière
  limbT(P.b, 4.4, shade(frame,0.85));
  TC.fillStyle=joint; TC.beginPath(); TC.arc(P.b[4],P.b[5],2.2,0,6.283); TC.fill();
  // --- jambe avant : cuisse blindée, genou articulé, vérin
  limbT([cx+2,F-25, cx+7,F-15], lw+0.6, frame); limbT([cx+7,F-15, cx+2,F-5], lw-0.4, frame);
  TC.strokeStyle='#8a929c'; TC.lineWidth=1.1; strokeP([cx+3,F-21, cx+4,F-9]); TC.stroke();
  plateT([cx+1,F-28, cx+8.5,F-25, cx+8.5,F-18, cx+3,F-16.5], plate);
  TC.fillStyle=joint; TC.beginPath(); TC.arc(cx+7,F-15,2.4,0,6.283); TC.fill();
  plateT([cx-2,F, cx+11,F, cx+8.5,F-4, cx+1,F-5], shade(plate,0.9));
  // --- bassin + colonne
  plateT([cx-6,F-30, cx+6,F-30, cx+5,F-23, cx-5,F-23], frame);
  TC.fillStyle=joint; TC.fillRect(cx-3,F-33,6,4);
  // --- châssis selon l'ère
  const ct = F-48;                                                                                     // haut du torse
  if (era===0){
    plateT([cx-sw,ct, cx+sw,ct, cx+sw,F-31, cx-sw,F-31], plate);
    TC.fillStyle='rgba(0,0,0,0.35)'; for (let i=0;i<3;i++) TC.fillRect(cx-sw+2,ct+4+i*2.4,5,1.1);       // grille
    for (let i=0;i<Math.ceil(sw*2/3);i++){ TC.fillStyle=i%2?'#1a1a1a':'#e8b830'; polyP([cx-sw+i*3,F-31, cx-sw+i*3+3,F-31, cx-sw+i*3+1.6,F-33.4, cx-sw+i*3-1.4,F-33.4]); TC.fill(); }  // bande de danger
    TC.fillStyle='rgba(255,255,255,0.5)'; for (const [x,y] of [[cx-sw+1.4,ct+1.4],[cx+sw-1.4,ct+1.4]]){ TC.beginPath(); TC.arc(x,y,0.7,0,6.283); TC.fill(); }
    glowDot(cx+4,F-40,2,lite,5);
  } else if (era===1){
    plateT([cx-sw+2,ct, cx+sw-1,ct, cx+sw+1,ct+3, cx+sw,F-35, cx+sw-3,F-31, cx-sw+3,F-31, cx-sw,F-35, cx-sw,ct+3], plate);
    TC.strokeStyle='rgba(0,0,0,0.3)'; TC.lineWidth=0.9; strokeP([cx-sw+2,F-37, cx+sw-1,F-37]); TC.stroke();
    glowDot(cx+2,F-41.5,2.3,lite,6);
  } else if (era===2){
    plateT([cx-sw,ct, cx+sw+2,ct+1, cx+sw,F-36, cx+3,F-31, cx-4,F-31, cx-sw+1,F-37], plate);
    TC.strokeStyle='rgba(0,0,0,0.32)'; TC.lineWidth=0.9; strokeP([cx-sw+1,ct+2, cx+1,F-37, cx+sw+1,ct+2]); TC.stroke();
    glowDot(cx+3,F-40,2,lite,6);
  } else if (era===3){
    const s=sw-1.5;
    plateT([cx-s,ct+1, cx+s+1,ct+1, cx+s-1,F-35, cx+2,F-31, cx-3,F-31, cx-s+1,F-35], plate);
    bloomT(lite,5,()=>{ TC.fillStyle=lite; TC.fillRect(cx-0.6,F-38,1.6,7); });                          // colonne lumineuse
    glowDot(cx+2,F-42,2,lite,6);
  } else {
    polyP([cx-sw,ct+1, cx+1,ct-1, cx+sw+2,ct+2, cx+2,F-38]); TC.fillStyle=shade(plate,1.35); TC.fill();  // facettes de cristal
    polyP([cx-sw,ct+1, cx+2,F-38, cx+sw+2,ct+2, cx+sw-1,F-35, cx+2,F-30, cx-3,F-31, cx-sw+1,F-35]); TC.fillStyle=shade(plate,0.8); TC.fill();
    TC.strokeStyle=rgbaC(lite,0.7); TC.lineWidth=0.8; strokeP([cx-sw+1,ct+1.5, cx+2,F-38, cx+sw+1,ct+2.5]); TC.stroke();
    glowDot(cx+2,F-40,2.2,lite,7);
    for (const [x,y] of [[cx-sw-4,F-46],[cx-sw-2,F-30]]){ TC.fillStyle=shade(plate,1.2); polyP([x,y-2.6, x+1.6,y, x,y+2.6, x-1.6,y]); TC.fill(); }  // éclats en orbite
  }
  if (heavy || era>=2){                                                                                // épaulière
    const g = era===3? 1.5 : 0;
    plateT([cx-1,ct-2-g, cx+sw+2,ct-1-g, cx+sw+3.5,ct+6-g, cx,ct+7-g], shade(plate,1.08));
  }
  if (trans) glowDot(cx+2,F-40,2.4,'#39ff6a',8);
  // --- tête
  const hx=cx+1, hy=F-54+hy0;
  TC.fillStyle=frame; TC.fillRect(cx-1.5,hy+3.5,4,4);
  if (era===0){
    plateT([hx-6,hy-6, hx+6,hy-6, hx+6,hy+4, hx-6,hy+4], plate);
    TC.fillStyle='#0c1218'; TC.beginPath(); TC.arc(hx+3,hy-1,3.2,0,6.283); TC.fill();
    TC.strokeStyle='#8a929c'; TC.lineWidth=0.9; TC.stroke(); glowDot(hx+3.4,hy-1,1.5,lite,5);            // œil-caméra
    TC.strokeStyle=frame; TC.lineWidth=1.1; strokeP([hx-3,hy-6, hx-4.5,hy-11]); TC.stroke(); glowDot(hx-4.5,hy-11.4,0.9,'#ff5a4a',3);
  } else if (era===1){
    TC.fillStyle=lgrad(hx-7,hy-8,hx+7,hy+5,[[0,shade(plate,1.4)],[0.5,plate],[1,shade(plate,0.56)]]);
    TC.beginPath(); TC.ellipse(hx,hy-1,7,6.4,0,0,6.283); TC.fill();
    TC.fillStyle='#0a1016'; rrectT(hx,hy-3,7.6,3.2,1.4); TC.fill();
    bloomT(lite,6,()=>{ TC.fillStyle=lite; rrectT(hx+1,hy-2.3,6,1.6,0.8); TC.fill(); });               // fente de visée
  } else if (era===2){
    plateT([hx-6,hy-6, hx+5,hy-6, hx+8,hy-1.5, hx+5,hy+4, hx-6,hy+4], plate);
    TC.fillStyle='#0a1016'; polyP([hx+0.5,hy-3.6, hx+7.4,hy-3, hx+4.4,hy+0.2]); TC.fill();
    bloomT(lite,6,()=>{ TC.strokeStyle=lite; TC.lineWidth=1.3; strokeP([hx+1.5,hy-3, hx+4.4,hy-0.8, hx+7,hy-2.6]); TC.stroke(); });  // visière en V
    TC.strokeStyle='rgba(0,0,0,0.35)'; TC.lineWidth=0.8; for (let i=0;i<2;i++){ strokeP([hx+2+i*2,hy+1.5, hx+2+i*2,hy+3.4]); TC.stroke(); }
  } else if (era===3){
    plateT([hx-5,hy-7, hx-1,hy-7, hx-6,hy-13, hx-9,hy-11], shade(plate,1.15));                             // crête
    plateT([hx-5,hy-7, hx+4,hy-7, hx+6.5,hy-2, hx+4,hy+4, hx-5,hy+4], plate);
    bloomT(lite,6,()=>{ TC.fillStyle=lite; rrectT(hx+0.5,hy-3,5.4,1.6,0.8); TC.fill(); });
  } else {
    polyP([hx,hy-9, hx+7,hy-1, hx-6,hy-1]); TC.fillStyle=shade(plate,1.4); TC.fill();                      // tête de cristal
    polyP([hx-6,hy-1, hx+7,hy-1, hx,hy+5]); TC.fillStyle=shade(plate,0.7); TC.fill();
    glowDot(hx+3,hy-1.6,1.5,lite,6);
    bloomT(lite,7,()=>{ TC.strokeStyle=rgbaC(lite,0.9); TC.lineWidth=1.2; TC.beginPath(); TC.ellipse(hx,hy-12,6.5,1.8,0,0,6.283); TC.stroke(); });  // auréole
  }
  if (trans) bloomT('#39ff6a',7,()=>{ TC.fillStyle='#39ff6a'; for (let i=0;i<3;i++){ rrectT(hx-5+i*4.4,hy-(era===4?16.5:era===3?15:13)-(i===1?2:0),1.8,4.4,0.8); TC.fill(); } });
  // --- bras avant + arme intégrée
  const fh=[P.f[4],P.f[5]];
  const arm = (pts) => { limbT(pts, 4.6, frame); plateT([pts[0]-2.4,pts[1]-2.6, pts[0]+3,pts[1]-2.4, pts[2]+1.6,pts[3]+1, pts[2]-1.8,pts[3]+1.4], shade(plate,1.05)); };
  if (hero){
    arm(P.f); glowDot(fh[0]+4,fh[1]-2,3.4,lite,12);                                                      // orbe de singularité
    bloomT(lite,10,()=>{ TC.strokeStyle=rgbaC(lite,0.9); TC.lineWidth=1.6;
      for (let i=0;i<6;i++){ const a=-Math.PI/2+(i-2.5)*0.42; strokeP([hx+Math.cos(a)*9,hy-5+Math.sin(a)*7, hx+Math.cos(a)*13,hy-5+Math.sin(a)*10]); TC.stroke(); } });
    return;
  }
  if (role==='melee'){
    arm([P.f[0],P.f[1], P.f[2],P.f[3], fh[0],fh[1]+3]);
    const wx=fh[0], wy=fh[1]+3;
    if (era===0){                                                                                        // scie circulaire
      const sx=wx+4, sy=wy-5; TC.fillStyle='#c8ccd0'; TC.beginPath();
      for (let i=0;i<28;i++){ const a=i*Math.PI/14, r=i%2?6.2:7.6; i?TC.lineTo(sx+Math.cos(a)*r,sy+Math.sin(a)*r):TC.moveTo(sx+r,sy); }
      TC.closePath(); TC.fill(); TC.fillStyle=rgrad(sx-2,sy-2,6,[[0,'#e8ecf0'],[1,'#7a828c']]); TC.beginPath(); TC.arc(sx,sy,5.4,0,6.283); TC.fill();
      TC.fillStyle=joint; TC.beginPath(); TC.arc(sx,sy,1.8,0,6.283); TC.fill();
    } else {
      const blades = era===4? [-0.72,-1.25] : [-0.95];
      for (const ang of blades){ TC.save(); TC.translate(wx,wy); TC.rotate(ang);
        if (era===1){ TC.fillStyle=lgrad(0,-5,0,2,[[0,'#e8ecf0'],[1,'#6a727c']]); polyP([1,-1.8, 15,-5.4, 18,0.6, 2,2]); TC.fill(); }           // couperet
        else if (era===2){ TC.fillStyle=lgrad(0,-2,0,2,[[0,'#f0f4f8'],[1,'#7a828c']]); polyP([1,-1.6, 23,-0.4, 23,0.4, 1,1.6]); TC.fill(); }      // mono-lame
        else { bloomT(lite,7,()=>{ TC.fillStyle=lite; polyP([1,-1.9, 20,-1.1, 23.5,0, 20,1.1, 1,1.9]); TC.fill(); });                             // lame d'énergie
          TC.fillStyle='rgba(255,255,255,0.9)'; TC.fillRect(2,-0.4,17,0.8); }
        TC.restore(); }
    }
  } else if (role==='tank'){
    arm(P.f);
    const x=cx+7, y=F-50;
    if (era===0){ plateT([x,y+1, x+13,y, x+13,y+44, x,y+43], '#7a7e80');                                   // dalle d'acier rivetée
      TC.fillStyle='#c8ccd0'; for (let i=0;i<4;i++){ TC.beginPath(); TC.arc(x+2,y+5+i*11,0.8,0,6.283); TC.arc(x+11,y+5+i*11,0.8,0,6.283); TC.fill(); }
      for (let i=0;i<4;i++){ TC.fillStyle=i%2?'#1a1a1a':'#e8b830'; polyP([x+i*3.25,y+43, x+i*3.25+3.25,y+43, x+i*3.25+1.6,y+39, x+i*3.25-1.6,y+39]); TC.fill(); } }
    else { plateT([x+6.5,y, x+13.5,y+9, x+13.5,y+35, x+6.5,y+44, x-0.5,y+35, x-0.5,y+9], plate);              // bouclier hexagonal
      TC.strokeStyle='rgba(0,0,0,0.32)'; TC.lineWidth=0.9; polyP([x+6.5,y+5, x+10.5,y+11, x+10.5,y+33, x+6.5,y+39, x+2.5,y+33, x+2.5,y+11]); TC.stroke();
      if (era>=2) bloomT(lite,5,()=>{ TC.strokeStyle=rgbaC(lite,0.85); TC.lineWidth=1.1; polyP([x+6.5,y+1.6, x+12.2,y+9.6, x+12.2,y+34.4, x+6.5,y+42.4, x+0.8,y+34.4, x+0.8,y+9.6]); TC.stroke(); });
      glowDot(x+6.5,y+22,1.8,lite,6); }
  } else if (role==='support'){
    arm(P.f);
    TC.save(); TC.translate(fh[0],fh[1]); TC.fillStyle='#8a929c'; TC.rotate(-0.5); TC.fillRect(0,-2.6,6,1.6); TC.rotate(0.9); TC.fillRect(0,1,6,1.6); TC.restore();   // pince
    glowDot(fh[0]+6.5,fh[1]-0.2,1.3,lite,6);
    bloomT(lite,5,()=>crossT(cx-3,F-41,3.6,lite));                                                     // marquage réparateur
  } else {
    // tireur : canon de bras ; siège : canon court de visée sous la nacelle
    const sh=P.f; limbT([sh[0],sh[1], sh[2],sh[3]], 4.6, frame);
    const L = role==='siege'? 12 : 19+era;
    tubeT(sh[2],sh[3]-1, sh[2]+L,sh[3]-1.5, 3.3, plate);
    TC.fillStyle=frame; TC.fillRect(sh[2]+L*0.3,sh[3]-4.6,1.4,6.4); TC.fillRect(sh[2]+L*0.55,sh[3]-4.6,1.4,6.4);
    TC.fillStyle=joint; TC.beginPath(); TC.arc(sh[2]+L,sh[3]-1.5,2,0,6.283); TC.fill();
    glowDot(sh[2]+L,sh[3]-1.5,1.3,lite,6);
    if (era>=3 && role!=='siege') for (let i=0;i<2;i++) glowDot(sh[2]+L*0.42+i*4,sh[3]-1.2,0.8,lite,4);
  }
}
function attackFX(u, x, bodyY, imp, mx){
  // PERF : shadowBlur est l'opération canvas la plus coûteuse du jeu, et attackFX est appelée
  // pour CHAQUE unité en train d'attaquer, CHAQUE frame — en pleine bataille (dizaines d'unités
  // simultanées) c'était le premier poste de coût de rendu. Coupé en qualité Faible, conservé
  // dès Moyen pour garder l'effet visuel sur tout appareil un minimum capable.
  imp = (imp==null)?1:imp; const dir=u.side, col=u.fac==='HUM'?'#ffd9a0':'#9fe8ff';
  // v1.8 : le halo vient de la bouffée de feu CUITE (drawImage) — plus aucun shadowBlur ici
  const glow = qFx(), PF = puffSprites();
  ctx.save(); ctx.globalCompositeOperation='lighter';
  ctx.lineCap='round';
  if (u.role==='ranged'||u.role==='air'){
    const fx=x+dir*(mx!=null?mx:26);
    if (glow){ const r=4+5*imp; ctx.globalAlpha=Math.min(1,0.35+imp); ctx.drawImage(PF.fire, fx-r, bodyY-r, r*2, r*2); ctx.globalAlpha=1;
      ctx.strokeStyle=rgbaC(col,0.8*imp); ctx.lineWidth=1.4; ctx.beginPath();                            // éclat en étoile
      ctx.moveTo(fx,bodyY); ctx.lineTo(fx+dir*(8+7*imp),bodyY); ctx.moveTo(fx+dir*3,bodyY-4*imp); ctx.lineTo(fx+dir*3,bodyY+4*imp); ctx.stroke(); }
    ctx.fillStyle=col; ctx.beginPath(); ctx.arc(fx,bodyY,2+2*imp,0,6.283); ctx.fill();                 // bouche à feu
    ctx.strokeStyle=rgbaC(col,0.65*imp); ctx.lineWidth=2; ctx.beginPath();                              // traceur nerveux
    ctx.moveTo(fx,bodyY); ctx.lineTo(fx+dir*(46+u.range*0.12), bodyY-2); ctx.stroke();
    ctx.fillStyle=rgbaC('#ffcf8a',0.8*imp); ctx.beginPath(); ctx.arc(x+dir*14, bodyY+3, 1.6, 0,6.283); ctx.fill(); // douille
  } else if (u.role==='siege'){
    const fx=x+dir*(mx!=null?mx:24), fy=mx!=null? bodyY : bodyY-4;
    const r=7+10*imp; ctx.globalAlpha=Math.min(1,0.3+imp); ctx.drawImage(PF.fire, fx-r, fy-r, r*2, r*2); ctx.globalAlpha=1;
    ctx.strokeStyle=rgbaC('#ff9d45',0.5*imp); ctx.lineWidth=3; ctx.beginPath(); ctx.arc(fx,fy,12+12*imp,0,6.283); ctx.stroke();
    if (glow && imp>0.85 && u._smk!==u.atkT && particles.length<500){                                   // bouffée de départ
      u._smk = u.atkT;                                       // une par pas de simulation (rien en pause)
      particles.push({k:'m', x:fx+camX, y:fy, vx:dir*20, vy:-14, g:-4, dr:1.6, life:0.9, t:0, r:5}); }
  } else {
    // mêlée : arc tranchant qui balaie devant l'unité
    const cxs=x+dir*6, r=22, a0=dir>0?-1.0:Math.PI+1.0, a1=dir>0?1.0:Math.PI-1.0;
    // arc plus fin et moins blanc qu'avant (0,2+0,8 → 0,15+0,5) : dans une mêlée dense, les
    // arcs additifs superposés fusionnaient en une tache blanche qui masquait les unités
    ctx.strokeStyle=rgbaC('#ffffff',0.15+0.5*imp); ctx.lineWidth=2.6;
    ctx.beginPath(); ctx.arc(cxs,bodyY,r,a0,a1,dir<0); ctx.stroke();
    ctx.strokeStyle=rgbaC(col,0.4*imp); ctx.lineWidth=5; ctx.beginPath(); ctx.arc(cxs,bodyY,r,a0,a1,dir<0); ctx.stroke();
  }
  ctx.restore();
  // éclair de lumière dynamique au moment du tir/de la frappe (coords MONDE)
  if (imp>0.8){ const lc=u.role==='siege'?'#ff9d45':col; addLight(u.x+dir*18, bodyY, lc, u.role==='siege'?78:46, 0.2); }
}
function drawGremlin(u, x, gy){
  const t=u.bob, b=Math.abs(Math.sin(t*2.4))*4;
  projShadow(x, gy, 9); const cy=gy-12-b;
  const spr=sprite('GREM'+u.era, 28, 24, ()=>gremlinSprite(u.era));
  ctx.save(); ctx.translate(x,cy); ctx.scale(u.side,1); ctx.drawImage(spr,-14,-12,28,24);
  if (u.flash>0){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=Math.min(0.55,u.flash); ctx.drawImage(spr,-14,-12,28,24); }
  ctx.restore();
  if (u.atkT>u.rate-0.14) attackFX(u, x, cy);
}
function blitHumanoid(u, x, gy, kind){
  if (u.role==='gremlin'){ drawGremlin(u,x,gy); return; }
  const fac = kind==='hum'? 'HUM':'IA', key='S'+kind+u.role+u.era+(u.trans?'T':'');
  const spr = sprite(key, USP.W, USP.H, ()=>drawUnitSprite(kind,fac,u.role,u.era,u.trans));
  const t=u.bob, dir=u.side;
  // DÉMARCHE : balancement + foulée quand l'unité avance (détectée via le delta de position monde)
  const mv = Math.abs(u.x-(u._wx!=null?u._wx:u.x)); u._wx = u.x;
  const moving = mv>0.04;
  const gAmp = (u.role==='tank'||u.role==='siege')? 0.5 : 1;        // les lourds se dandinent moins
  const ph = t*1.5;
  const stepBob = moving ? -Math.abs(Math.sin(ph))*2.6*gAmp : 0;    // le corps s'élève à chaque pas
  const stepSkew = moving ? Math.sin(ph)*0.06*gAmp : 0;            // foulée (cisaillement horizontal)
  let sy = 1 + 0.03*Math.sin(t*2.6);                               // léger tassement, PIEDS ANCRÉS au sol
  if (u.flash>0) sy *= 0.86;                                       // ÉCRASEMENT bref à l'impact (feedback)
  const atk = u.atkT > u.rate-0.16;
  const imp = atk ? clamp((u.atkT-(u.rate-0.16))/0.16, 0, 1) : 0;   // 1 à l'impact → 0
  const fwd = (u.role==='melee'||u.role==='tank');                  // mêlée : jab avant ; tir/siège : recul
  const lunge = fwd ? dir*9*imp : (atk? -dir*5*imp : 0);
  const tilt = fwd ? dir*imp*0.12 : (atk? -dir*imp*0.06 : 0);       // bascule (poids/impact)
  projShadow(x, gy, 15);
  // POUSSIÈRE DE PAS : petites volutes au sol quand l'unité marche (cosmétique, plafonné)
  if (moving && qFx() && particles.length<440 && Math.random()<0.09){
    particles.push({ x:u.x-dir*7, y:gy-1, vx:-dir*6+(Math.random()*6-3), vy:-8-Math.random()*8,
      r:1.4+Math.random()*1.6, life:0.4+Math.random()*0.3, t:0, color:'rgba(198,184,156,0.5)' });
  }
  ctx.save(); ctx.translate(x+lunge, gy+stepBob); ctx.rotate(tilt);
  if (stepSkew) ctx.transform(1,0,stepSkew*dir,1,0,0);
  ctx.scale(dir, sy);
  ctx.drawImage(spr, -USP.cx, -USP.foot, USP.W, USP.H);
  if (u.flash>0){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=Math.min(0.5,u.flash*0.9); ctx.drawImage(spr, -USP.cx, -USP.foot, USP.W, USP.H); }
  ctx.restore();
  if (atk){ const m=muzzleOf(u); attackFX(u, x+lunge, gy+m[1], imp, m[0]); }
}
function drawHuman(u, x, gy){ blitHumanoid(u, x, gy, 'hum'); }
function drawBot(u, x, gy){ blitHumanoid(u, x, gy, 'bot'); }
// AÉRONEFS : hélicoptère humain (civil rafistolé → hélico de milice → hélico d'attaque →
// VTOL → or) et drone quadrirotor GPT. Les rotors restent animés en direct par drawAir.
function airSprite(fac, era, trans){
  const cx=32, cy=22;
  if (fac==='HUM'){
    const acc=FACTIONS.HUM.accent, body=FACTIONS.HUM.eraCols[era];
    TC.fillStyle=lgrad(cx-26,cy-5,cx-26,cy+2,[[0,shade(body,1.3)],[1,shade(body,0.55)]]);   // poutre de queue
    polyP([cx-8,cy-4.5, cx-26,cy-3.4, cx-26,cy-0.6, cx-8,cy+2]); TC.fill();
    plateT([cx-29.5,cy-11, cx-25,cy-10, cx-23.5,cy+0.5, cx-27.5,cy+0.5], body);                // dérive
    TC.strokeStyle='rgba(30,34,40,0.6)'; TC.lineWidth=1; TC.beginPath(); TC.arc(cx-25.5,cy-4.5,4.4,0,6.283); TC.stroke();  // anticouple
    TC.fillStyle=acc; TC.fillRect(cx-20,cy-3.6,3,3.4);                                         // bande de faction
    TC.strokeStyle='#262a30'; TC.lineWidth=1.4; TC.lineCap='round';                            // patins
    strokeP([cx-10,cy+10, cx+10,cy+10, cx+13,cy+8]); TC.stroke();
    strokeP([cx-5,cy+5, cx-6,cy+10]); TC.stroke(); strokeP([cx+5,cy+5, cx+6,cy+10]); TC.stroke();
    if (era>=2){ plateT([cx-6,cy+2, cx+4,cy+2, cx+3,cy+5, cx-5,cy+5], shade(body,0.8));          // aile courte + paniers
      tubeT(cx-5,cy+6.2,cx+5,cy+6.2,1.7,era===4?'#c8a040':'#2a2e34');
      TC.fillStyle=era===4?'#fff0c0':'#c84a2a'; TC.beginPath(); TC.arc(cx+5,cy+6.2,1,0,6.283); TC.fill(); }
    plateT([cx-11,cy-5, cx+2,cy-8, cx+9,cy-6, cx+14,cy-1, cx+12,cy+5, cx-2,cy+6, cx-11,cy+3], body); // fuselage
    TC.fillStyle=lgrad(cx+2,cy-7,cx+13,cy+2,[[0,'rgba(225,242,250,0.96)'],[1,'rgba(56,84,112,0.96)']]);  // verrière
    polyP([cx+2,cy-7, cx+8.5,cy-5.6, cx+13,cy-1, cx+12.4,cy+1.5, cx+3,cy+1.5]); TC.fill();
    TC.fillStyle='rgba(255,255,255,0.6)'; polyP([cx+4,cy-6, cx+7,cy-5.4, cx+5,cy-1.5, cx+3.5,cy-1.5]); TC.fill();
    plateT([cx-7,cy-9, cx+2,cy-10, cx+4,cy-7, cx-8,cy-5], shade(body,0.82));                    // capot moteur
    TC.fillStyle='#262a30'; TC.fillRect(cx-2.6,cy-11.6,2.4,2.6);                                // mât rotor
    if (era===0){ TC.fillStyle=shade(body,1.25); TC.fillRect(cx-7,cy-2,5,4);                    // tôle rapiécée
      TC.fillStyle='rgba(0,0,0,0.4)'; for (const [x,y] of [[cx-6.4,cy-1.4],[cx-2.6,cy-1.4],[cx-6.4,cy+1.4],[cx-2.6,cy+1.4]]) TC.fillRect(x,y,0.8,0.8); }
    else if (era===1){ tubeT(cx+1,cy+3,cx+10,cy+4,0.9,'#2a2e34'); TC.fillStyle='#1a1c20'; TC.fillRect(cx-4,cy-3.5,4,6); } // porte + mitrailleuse
    else if (era>=3){ const gc = era===4? '#fff0c0' : '#ffb35a';
      TC.fillStyle=era===4?'#fff3c4':shade(body,1.35); TC.fillRect(cx-9,cy-0.6,18,1.2);
      tubeT(cx+11,cy+4,cx+16,cy+4.6,1,'#2a2e34'); glowDot(cx+11,cy+4,1.4,gc,5); }               // tourelle de nez
    if (trans) bloomT('#ff3a2a',7,()=>drawStar(cx-4,cy-1,2.8,'#ff4a2a'));
  } else {
    const lite=FACTIONS.IA.eraCols[era], plate=mix(lite,'#4a5260',0.5), frame='#2a3038';
    TC.strokeStyle=frame; TC.lineWidth=1.8; TC.lineCap='round';                                // bras porteurs
    strokeP([cx-10,cy-5.6, cx-3,cy-2]); TC.stroke(); strokeP([cx+10,cy-5.6, cx+3,cy-2]); TC.stroke();
    for (const sx of [-10,10]){ TC.fillStyle=frame; rrectT(cx+sx-2.6,cy-8,5.2,2.8,1.3); TC.fill(); }
    for (let i=0;i<Math.min(era,3);i++)                                                        // ailerons d'ère
      plateT([cx-12+i*3.2,cy-2, cx-10+i*3.2,cy-8-i*0.8, cx-8+i*3.2,cy-7.4-i*0.8, cx-8.6+i*3.2,cy-2], shade(plate,1.1));
    if (era===4){ polyP([cx-14,cy-1, cx-4,cy-6, cx+10,cy-5, cx+16,cy]); TC.fillStyle=shade(plate,1.35); TC.fill();   // coque de cristal
      polyP([cx-14,cy-1, cx+16,cy, cx+8,cy+5, cx-6,cy+4]); TC.fillStyle=shade(plate,0.75); TC.fill(); }
    else plateT([cx-14,cy-1, cx-6,cy-5, cx+8,cy-5, cx+15,cy, cx+8,cy+5, cx-6,cy+4], plate);         // corps effilé
    TC.fillStyle=frame; polyP([cx-6,cy+2, cx+8,cy+2, cx+8,cy+5, cx-6,cy+4]); TC.fill();
    tubeT(cx,cy+4.6,cx+10,cy+6.2,1.2,'#3a4048');                                              // canon ventral
    TC.fillStyle='#0a1016'; TC.beginPath(); TC.arc(cx+9,cy-0.6,2.8,0,6.283); TC.fill();         // œil-capteur
    glowDot(cx+9.4,cy-0.6,1.6,lite,6);
    if (era>=2){ TC.fillStyle=rgbaC(lite,0.9); TC.fillRect(cx-5,cy-2.6,8,1); }
    if (trans) bloomT('#39ff6a',7,()=>{ TC.strokeStyle=rgbaC('#39ff6a',0.9); TC.lineWidth=1.2; TC.beginPath(); TC.ellipse(cx,cy-11,7,1.8,0,0,6.283); TC.stroke(); });
  }
}
function drawAir(u, x, gy){
  const fac=u.fac, era=u.era, t=u.bob, dir=u.side, acc=FACTIONS[fac].accent;
  const spr = sprite('AIR'+fac+era+(u.trans?'T':''), 64, 44, ()=>airSprite(fac,era,u.trans));
  const y = gy - u.flyH + Math.sin(t*1.1)*3;
  const AS = 1.5;                 // aéronefs agrandis (échelle cohérente : plus gros que l'infanterie)
  projShadow(x, gy, 16);
  ctx.save(); ctx.translate(x,y); ctx.scale(dir*AS,AS); ctx.drawImage(spr, -32, -22, 64, 44);
  if (u.flash>0){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=Math.min(0.5,u.flash*0.9); ctx.drawImage(spr,-32,-22, 64, 44); }
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineCap='round';
  ctx.strokeStyle=rgbaC(fac==='HUM'?'#cfd6e0':acc,0.5); ctx.lineWidth=2.5;
  if (fac==='HUM'){ const r=Math.abs(Math.sin(t*9))*20; ctx.beginPath(); ctx.moveTo(x-r,y-16); ctx.lineTo(x+r,y-16); ctx.stroke(); }
  else { for(const sx2 of[-15,15]){ const r=Math.abs(Math.sin(t*10+sx2))*9; ctx.beginPath(); ctx.moveTo(x+sx2-r,y-10); ctx.lineTo(x+sx2+r,y-10); ctx.stroke(); } }
  ctx.restore();
  if (u.atkT>u.rate-0.14) attackFX(u, x, y);
}
// GREMLIN (essaim GPT) : petit robot-araignée mis en cache (avant : capsule néon redessinée
// avec halos en direct à chaque frame)
function gremlinSprite(era){
  const cx=14, cy=12, lite=FACTIONS.IA.eraCols[era], plate=mix(lite,'#4a5260',0.5), frame='#2a3038';
  TC.strokeStyle='#4a525c'; TC.lineWidth=0.9; TC.lineCap='round'; TC.lineJoin='round';
  for (const s of [-1,1]) for (let i=0;i<3;i++){ const x0=cx+s*(1+i*1.6), kx=cx+s*(7+i*1.8), fx=cx+s*(5+i*2.6);
    strokeP([x0,cy+1, kx,cy-2+i, fx,cy+10]); TC.stroke(); }
  TC.fillStyle=lgrad(cx-7,cy-6,cx+7,cy+5,[[0,shade(plate,1.45)],[0.5,plate],[1,shade(plate,0.55)]]);
  TC.beginPath(); TC.ellipse(cx,cy,7.4,5.6,0,0,6.283); TC.fill();
  TC.fillStyle='#0a1016'; rrectT(cx+1,cy-2.6,6,3.4,1.6); TC.fill();
  glowDot(cx+3,cy-1,1.2,lite,4); glowDot(cx+5.6,cy-1,1.2,lite,4);
}
// HÉROS : un vrai personnage à l'échelle ×1,3 — le Che (béret étoilé, barbe, cigare, poing levé,
// fusil en bandoulière) et la Singularité (corps de cristal, couronne de rayons, orbe d'énergie)
const HERO_SW = 88;
function heroSprite(fac){
  TC.save(); TC.translate(HERO_SW/2, 92); TC.scale(1.3,1.3); TC.translate(-USP.cx,-USP.foot);
  if (fac==='HUM') drawHumSprite('HUM','ranged',1,false,true); else drawBotSprite('IA','hero',4,false,true);
  TC.restore();
}
// PERF : PRÉCHAUFFE de tous les sprites d'unités possibles (2 factions × 5 rôles au sol × 5 ères
// × transcendé/non, + aériens, héros, gremlins), pour qu'aucune première apparition en pleine
// bataille ne déclenche de micro-saccade de fabrication. v1.7 : les personnages sont bien plus
// détaillés, donc la préchauffe est ÉTALÉE — l'ère 0 (ce qui apparaît dans les premières
// secondes) est cuite tout de suite au lancement, le reste par ordre d'ère dans une file vidée
// quelques millisecondes par image (warmTick) : tout est prêt bien avant la première évolution.
let _spritesWarmed = false, WARMQ = [];
function prewarmSprites(){
  if (!_spritesWarmed){
    _spritesWarmed = true;
    const roles = ['melee','tank','ranged','siege','support'];
    for (let era=0; era<5; era++) for (const trans of [false,true]){
      for (const kind of ['hum','bot']){ const fac = kind==='hum'? 'HUM':'IA';
        for (const role of roles) WARMQ.push({ era, trans, fn:()=>sprite('S'+kind+role+era+(trans?'T':''), USP.W, USP.H, ()=>drawUnitSprite(kind,fac,role,era,trans)) }); }
      for (const fac of ['HUM','IA']) WARMQ.push({ era, trans, fn:()=>sprite('AIR'+fac+era+(trans?'T':''), 64, 44, ()=>airSprite(fac,era,trans)) });
      if (!trans) WARMQ.push({ era, trans, fn:()=>sprite('GREM'+era, 28, 24, ()=>gremlinSprite(era)) });
      if (era===1 && !trans) for (const fac of ['HUM','IA']) WARMQ.push({ era, trans, fn:()=>sprite('HERO'+fac, HERO_SW, 100, ()=>heroSprite(fac)) });
      if (era===1 && !trans) WARMQ.push({ era, trans, fn:()=>{ mushroomSprite(); puffSprites(); } });   // effets lourds
    }
  }
  while (WARMQ.length && WARMQ[0].era===0 && !WARMQ[0].trans) WARMQ.shift().fn();
}
function warmTick(budgetMs){
  const t0 = performance.now();
  while (WARMQ.length && performance.now()-t0 < budgetMs) WARMQ.shift().fn();
}
function drawHero(u, x, gy){
  const t=game.t, col=u.fac==='HUM'?'#ffcf5a':'#ff6ad6', side=u.side===1?game.p:game.e;
  // liens d'empowerment vers les alliés proches (montre l'impact du héros sur les troupes)
  ctx.save(); ctx.globalCompositeOperation='lighter';
  for (const a of side.units){ if (a===u||a.role==='hero') continue; const d=Math.abs(a.x-u.x);
    if (d<210){ const ax=a.x-camX, ay=gY(a.x)-18, al=(1-d/210)*0.22*(0.6+0.4*Math.sin(t*5+a.x));
      ctx.strokeStyle=rgbaC(col,al); ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x,gy-32); ctx.lineTo(ax,ay); ctx.stroke(); } }
  // aura au sol + halo
  ctx.strokeStyle=rgbaC(col,0.3+0.2*Math.sin(t*3)); ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(x,gy,42,13,0,0,6.283); ctx.stroke();
  const g=ctx.createRadialGradient(x,gy-44,4,x,gy-44,54+Math.sin(t*3)*6);
  g.addColorStop(0,rgbaC(col,0.22)); g.addColorStop(1,rgbaC(col,0));
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,gy-44,56,0,6.283); ctx.fill(); ctx.restore();
  projShadow(x, gy, 18);
  const spr = sprite('HERO'+u.fac, HERO_SW, 100, ()=>heroSprite(u.fac));
  const atk = u.atkT > u.rate-0.18, imp = atk? clamp((u.atkT-(u.rate-0.18))/0.18,0,1):0, lunge=u.side*9*imp;
  ctx.save(); ctx.translate(x+lunge,gy); ctx.scale(u.side,1); ctx.drawImage(spr, -HERO_SW/2, -92, HERO_SW, 100);
  if (u.flash>0){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=Math.min(0.5,u.flash*0.9); ctx.drawImage(spr,-HERO_SW/2,-92, HERO_SW, 100); }
  ctx.restore();
  if (atk){ attackFX(u, x, gy-44, imp); }                       // frappe héroïque spectaculaire
  ctx.font='700 10px Arial'; ctx.textAlign='center'; ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=6;
  ctx.fillText(HERO_NAME[u.fac], x, gy-103); ctx.shadowBlur=0;
}
function drawUnit(u){
  const x = u.x-camX;
  if (x<-40 || x>VW()+40) return;
  const gy = gY(u.x);
  const fh = u.fly? u.flyH : 0;
  const top = u.role==='gremlin'? 26 : u.fly? 44 : u.role==='hero'? 98 : 70;   // au-dessus de la tête
  // NOYADE (inondation) : l'unité s'enfonce sous la nappe, puis disparaît.
  const drowning = (!u.fly && u.drownT>0);
  if (drowning){ ctx.save(); ctx.translate(0, Math.min(u.drownT*22, 30)); ctx.globalAlpha = Math.max(0.3, 1 - u.drownT*0.4); }
  // TRAÎNÉE DE CHARGE : sillage lumineux (couleur de faction) derrière les unités lancées.
  const sideU = u.side===1? game.p : game.e;
  if (qFx() && (u.ord||sideU.stance)==='charge' && u.role!=='support' && u.role!=='gremlin' && !sideU.formation){
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const tc = FACTIONS[u.fac].eraCols[u.era];
    for (let i=1;i<=3;i++){ ctx.globalAlpha=0.15/i; ctx.fillStyle=tc;
      ctx.beginPath(); ctx.ellipse(x + u.side*i*7, gy-18-fh, Math.max(2,6-i), Math.max(4,11-i*2), 0, 0, 6.28); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha=1;
  }
  if (game.sel.has(u)){
    ctx.strokeStyle='#ffd34a'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(x, gy+3, 13, 4.5, 0,0,6.28); ctx.stroke();
    ctx.fillStyle='#ffd34a';
    ctx.beginPath(); ctx.moveTo(x-4,gy-top-8-fh); ctx.lineTo(x+4,gy-top-8-fh); ctx.lineTo(x,gy-top-2-fh); ctx.closePath(); ctx.fill();
  }
  // TRANSCENDANCE : aura animée DERRIÈRE l'unité + empreinte lumineuse au sol (avant : un
  // ovale additif posé PAR-DESSUS le sprite, qui le délavait entièrement)
  if (u.trans && qFx()){
    ctx.save(); ctx.globalCompositeOperation='lighter'; const ac=FACTIONS[u.fac].accent;
    ctx.globalAlpha=0.16+0.08*Math.sin(u.bob*3); ctx.fillStyle=ac;
    ctx.beginPath(); ctx.ellipse(x, gy-30-fh, 15, 27, 0,0,6.28); ctx.fill();
    ctx.globalAlpha=0.30; ctx.beginPath(); ctx.ellipse(x, gy+2, 14, 4.5, 0,0,6.28); ctx.fill();
    ctx.restore(); ctx.globalAlpha=1;
  }
  if (u.role==='hero') drawHero(u,x,gy);
  else if (u.role==='air') drawAir(u,x,gy);
  else if (u.fac==='HUM') drawHuman(u,x,gy);
  else drawBot(u,x,gy);
  // galons d'amélioration de classe
  const side = u.side===1? game.p : game.e;
  const ulvl = side.upg[u.role]||0;
  if (ulvl>0 && u.role!=='gremlin'){
    for (let i=0;i<ulvl;i++){
      if (u.fac==='HUM'){                           // chevrons dorés
        ctx.strokeStyle='#ffd34a'; ctx.lineWidth=1.4;
        const cx2=x-u.side*14; ctx.beginPath(); ctx.moveTo(cx2-3, gy-44-fh-i*4); ctx.lineTo(cx2, gy-41-fh-i*4); ctx.lineTo(cx2+3, gy-44-fh-i*4); ctx.stroke();
      } else {                                       // diodes d'optimisation
        ctx.fillStyle='rgba(90,208,255,'+(0.6+0.3*Math.sin(u.bob*2+i))+')';
        ctx.fillRect(x-u.side*14-1.5, gy-44-fh-i*4, 3, 2.4);
      }
    }
  }
  // vétéran : étoile dorée
  if (u.vet) drawStar(x+16, gy-top-fh+1.5, 3, '#ffd34a');
  // fatigue / surchauffe : volutes au-dessus de la tête
  if (u.tiredT>0){
    ctx.fillStyle = u.fac==='HUM'? 'rgba(220,220,230,0.55)':'rgba(255,140,80,0.55)';
    for (let i=0;i<2;i++){
      const py = gy-top-4-fh - ((u.bob*14+i*7)%12);
      ctx.beginPath(); ctx.arc(x-3+i*6+Math.sin(u.bob*3+i)*2, py, 2.2, 0, 6.28); ctx.fill();
    }
  }
  // NEIGE (hiver nucléaire) : flocons qui se posent sur la silhouette de l'unité.
  if (game.winter && qFx() && u.role!=='gremlin'){
    ctx.fillStyle='rgba(235,245,255,0.85)';
    for (let i=0;i<3;i++){ const sx=x-6+((i*97+u.bob*3)%12), sy=gy-34-fh+i*9;
      ctx.fillRect(sx, sy, 1.6, 1.6); }
  }
  const frac = clamp(u.hp/u.maxhp,0,1);
  if (frac<1){
    const w = u.role==='gremlin'? 14:24, yy = gy-top-fh;
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(x-w/2,yy,w,3.4);
    ctx.fillStyle = frac>0.5?'#7dd84a':frac>0.25?'#ffd34a':'#ff5a4a';
    ctx.fillRect(x-w/2,yy,w*frac,3.4);
  }
  if (drowning) ctx.restore();
}
/* ---------- marqueur d'ordre de position (⚑) ---------- */
// fanion doré planté au point ordonné : onde au sol + flottement, s'estompe en ~3 s
function drawRally(r){
  const x=r.x-camX; if (x<-60||x>VW()+60) return;
  const gy=gY(r.x), k=clamp(r.t/3,0,1), a=1-k*k;
  const drop=Math.min(1, r.t*5), fy=gy-34*drop;      // le fanion se plante d'un coup sec
  ctx.save(); ctx.globalAlpha=a;
  const ph=(r.t*1.4)%1;                               // onde de choc au sol
  ctx.strokeStyle=rgbaC('#ffd34a',0.7*(1-ph)); ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(x,gy+2,8+ph*26,(8+ph*26)*0.34,0,0,6.283); ctx.stroke();
  ctx.strokeStyle='#e8d8a0'; ctx.lineWidth=2.4; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x,gy+2); ctx.lineTo(x,fy); ctx.stroke();
  const wv=Math.sin(r.t*9)*2;
  ctx.fillStyle='#ffd34a';
  ctx.beginPath(); ctx.moveTo(x,fy); ctx.lineTo(x+14,fy+4+wv); ctx.lineTo(x,fy+9); ctx.closePath(); ctx.fill();
  ctx.restore();
}
/* ---------- dégâts : fumée & flammes sur bâtiments/bases amochés ---------- */
// volutes déterministes (pas de pool de particules) : fumée sous 55 % de PV, flammes sous 30 %.
function dmgSmoke(x, topY, frac, t, seed){
  if (frac>=0.55 || !qFx()) return;
  // panache en bouffées cuites (v1.8) : épais, qui s'élargit en montant ; flammes sous 30 %
  const PF = puffSprites(), n = frac<0.3? 4:3;
  for (let i=0;i<n;i++){
    const ph = ((t*0.42 + i/n + seed*0.013)%1), r = 4+ph*13;
    const px = x + Math.sin(t*1.1+i*2+seed)*6*ph + ph*10 + (i-1)*3, py = topY - ph*40;
    ctx.globalAlpha = 0.9*(1-ph)*Math.min(1,ph*6);
    ctx.drawImage(PF.smoke, px-r, py-r, r*2, r*2);
  }
  ctx.globalAlpha = 1;
  if (frac<0.3){
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for (let i=0;i<2;i++){ const fl=Math.abs(Math.sin(t*7+i*1.9+seed)), r=5+fl*4;
      ctx.globalAlpha=0.6+0.35*fl; ctx.drawImage(PF.fire, x-3+i*6-r, topY+3-r*1.2, r*2, r*2.4); }
    ctx.restore(); ctx.globalAlpha=1;
  }
}
// BOUFFÉES CUITES (feu, fumée, poussière) : dégradés radiaux irréguliers rendus UNE fois puis
// blittés — les explosions deviennent des boules de feu et des panaches au lieu de confettis.
let PUFFS = null;
function puffSprites(){
  if (PUFFS) return PUFFS;
  const mk = (stops, lumpy) => { const S=64, cv=document.createElement('canvas'); cv.width=cv.height=S; const c=cv.getContext('2d');
    const blobs = lumpy? [[32,33,29],[22,27,17],[42,25,16],[39,42,17],[24,41,15]] : [[32,32,31]];
    for (const [x,y,r] of blobs){ const g=c.createRadialGradient(x,y,1,x,y,r); for (const s of stops) g.addColorStop(s[0],s[1]);
      c.fillStyle=g; c.beginPath(); c.arc(x,y,r,0,6.283); c.fill(); }
    return cv; };
  PUFFS = {
    fire:  mk([[0,'rgba(255,250,220,1)'],[0.25,'rgba(255,204,96,0.9)'],[0.6,'rgba(255,112,32,0.45)'],[1,'rgba(200,40,10,0)']], false),
    smoke: mk([[0,'rgba(66,60,62,0.5)'],[0.6,'rgba(58,52,54,0.3)'],[1,'rgba(50,46,48,0)']], true),
    dust:  mk([[0,'rgba(200,182,150,0.46)'],[0.6,'rgba(184,164,132,0.26)'],[1,'rgba(170,150,120,0)']], true),
  };
  return PUFFS;
}
/* ---------- PLUIE FERTILE : averse visible pendant l'événement (écran entier) ---------- */
function drawRainBoon(t){
  ctx.save();
  ctx.fillStyle='rgba(90,140,190,0.05)'; ctx.fillRect(0,0,W,H);       // voile froid très léger
  ctx.strokeStyle='rgba(160,210,255,0.34)'; ctx.lineWidth=1.2; ctx.beginPath();
  const n = qFx()? 70 : 34;
  for (let i=0;i<n;i++){
    const rx=((i*127 + t*520)%(W+80))-40, ry=(i*211 + t*(640+(i%5)*60))%H;
    ctx.moveTo(rx, ry); ctx.lineTo(rx-6, ry+14);
  }
  ctx.stroke();
  // impacts au sol (petits rebonds clairs le long de la ligne d'horizon basse)
  if (qFx()){ ctx.fillStyle='rgba(190,225,255,0.30)';
    for (let i=0;i<14;i++){ const px=(i*173+((t*3.1+i)|0)*97)%W, ph=(t*3.1+i*0.37)%1;
      ctx.beginPath(); ctx.ellipse(px, H-70-(i%5)*28, 3+ph*5, 1.2, 0, 0, 6.283);
      ctx.globalAlpha=0.5*(1-ph); ctx.fill(); ctx.globalAlpha=1; } }
  ctx.restore();
}
/* ---------- bases & bâtiments ---------- */
/* ---- bâtiments et bases mis en cache : de vraies constructions qui évoluent avec les ères ---- */
// v1.7 : avant, des blocs arrondis gris-violet cernés de néon, identiques d'une ère à l'autre.
// Désormais chaque bâtiment a sa forme (palissade, tour de guet, champ, étal, puits ; panneaux
// solaires, baie de calcul, condenseur côté GPT) et ses MATÉRIAUX suivent l'ère du camp :
// planches et briques → pierre → béton → blindage → marbre et or. Cuits une fois, puis blittés
// (miroir selon le camp) : moins d'opérations canvas par frame qu'avant malgré le détail.
const HMAT = [
  { wall:'#8a5a40', roof:'#6e6a66', trim:'#4a3428', lite:'#ffcf78' },   // ère 0 : briques, planches, tôle
  { wall:'#8e877a', roof:'#5e584e', trim:'#4e4840', lite:'#ffcf78' },   // ère 1 : pierre
  { wall:'#7c8084', roof:'#4e5256', trim:'#3a3e42', lite:'#fff0c0' },   // ère 2 : béton
  { wall:'#4a4560', roof:'#2e2a3c', trim:'#ffb35a', lite:'#ffb35a' },   // ère 3 : blindage
  { wall:'#e6dfcc', roof:'#c8a040', trim:'#d8b048', lite:'#fff0c0' },   // ère 4 : marbre et or
];
const iaPlate = era => mix(FACTIONS.IA.eraCols[era],'#4a5260',0.55);
// appareil de briques / pierres : joints horizontaux + joints verticaux décalés
function masonT(x,y,w,h,rowH,brickW,a){
  TC.fillStyle='rgba(0,0,0,'+(a||0.2)+')';
  for (let r=0, yy=y+rowH; yy<y+h-0.5; r++, yy+=rowH){
    TC.fillRect(x,yy,w,0.8);
    for (let xx=x+((r%2)?brickW/2:brickW); xx<x+w-1; xx+=brickW) TC.fillRect(xx,yy-rowH+0.8,0.8,rowH-0.8);
  }
}
function sandbagsT(x0,x1,G,rows){
  for (let r=0;r<rows;r++){ const y=G-4.6-r*4.4, off=(r%2)*3.2;
    for (let x=x0+off; x<x1-2; x+=6.4){
      TC.fillStyle=lgrad(x,y-2,x,y+3,[[0,'#d2bf92'],[1,'#8a7650']]); rrectT(x,y-2.2,6.2,4.6,2.2); TC.fill(); } }
}
function windowT(x,y,w,h,lite,boarded){
  TC.fillStyle='#1c1814'; TC.fillRect(x-0.8,y-0.8,w+1.6,h+1.6);
  bloomT(lite,5,()=>{ TC.fillStyle=lite; TC.fillRect(x,y,w,h); });
  if (boarded){ TC.fillStyle='#6a4a2c'; TC.save(); TC.translate(x+w/2,y+h/2); TC.rotate(-0.5); TC.fillRect(-w*0.75,-0.9,w*1.5,1.8); TC.restore(); }
}
function hazardT(x,y,w,h){
  TC.save(); TC.beginPath(); TC.rect(x,y,w,h); TC.clip();
  TC.fillStyle='#e8b830'; TC.fillRect(x,y,w,h); TC.fillStyle='#1a1a1a';
  for (let xx=x-h; xx<x+w; xx+=h*1.6){ polyP([xx,y+h, xx+h*0.8,y+h, xx+h*1.6,y, xx+h*0.8,y]); TC.fill(); }
  TC.restore();
}

/* --- BÂTIMENTS (repère : cx = centre, G = sol, h = hauteur de jeu bldH) --- */
const BSP = { W:64, H:120, cx:32, G:112 };
function bldSprite(type, fk, lvl, era, h){
  const cx=BSP.cx, G=BSP.G;
  if (fk==='HUM') humBld(type, lvl, era, h, cx, G); else iaBld(type, lvl, era, h, cx, G);
}
function humBld(type, lvl, era, h, cx, G){
  const M=HMAT[era], acc=FACTIONS.HUM.accent, y0=G-h;
  if (type==='wall'){
    const x0=cx-14, w=28;
    if (era===0){                                                                             // palissade + sacs de sable
      for (let i=0;i<4;i++){ const px=x0+i*7; TC.fillStyle=lgrad(px,0,px+7,0,[[0,'#a88058'],[1,'#6a4a2c']]);
        polyP([px+0.4,G, px+0.4,y0+4, px+3.5,y0, px+6.6,y0+4, px+6.6,G]); TC.fill(); }
      TC.fillStyle='#5a3e24'; TC.fillRect(x0,y0+10,w,2.4); TC.fillRect(x0,G-h*0.5,w,2.4);
      TC.fillStyle='#8a8e92'; TC.fillRect(x0+9,y0+16,11,9); TC.fillStyle='#c8ccd0';
      for (const [a,b] of [[x0+10,y0+17],[x0+18.6,y0+17],[x0+10,y0+23.6],[x0+18.6,y0+23.6]]) TC.fillRect(a,b,0.9,0.9);
      sandbagsT(x0-2,x0+w+2,G,2);
    } else if (era===1){                                                                      // rempart de pierre crénelé
      plateT([x0,y0+6, x0+w,y0+6, x0+w,G, x0,G], M.wall); masonT(x0,y0+6,w,h-6,6,9,0.22);
      for (let c=0;c<3;c++) plateT([x0+c*10.5,y0, x0+c*10.5+7,y0, x0+c*10.5+7,y0+7, x0+c*10.5,y0+7], shade(M.wall,1.08));
      TC.fillStyle='#1c1814'; TC.fillRect(cx-1,y0+16,2,9);                                         // meurtrière
      TC.fillStyle=acc; polyP([x0+3,y0+12, x0+9,y0+12, x0+9,y0+26, x0+6,y0+23, x0+3,y0+26]); TC.fill();  // bannière
    } else if (era===2){                                                                      // mur en T de béton + barbelés
      plateT([x0+2,y0+5, x0+w-2,y0+5, x0+w,G-8, x0+w+2,G, x0-2,G, x0,G-8], M.wall);
      TC.fillStyle='rgba(0,0,0,0.22)'; TC.fillRect(x0+2,y0+h*0.45,w-4,0.9); TC.fillRect(cx,y0+6,0.9,h-14);
      TC.strokeStyle='#5a5e62'; TC.lineWidth=0.8; for (let i=0;i<5;i++){ TC.beginPath(); TC.ellipse(x0+3+i*5.5,y0+2.6,3,2.6,0,0,6.283); TC.stroke(); }
      TC.fillStyle=acc; TC.fillRect(x0+4,y0+14,w-8,3);
    } else if (era===3){                                                                      // blindage + bande lumineuse
      plateT([x0,y0+3, cx,y0, x0+w,y0+3, x0+w,G, x0,G], M.wall);
      TC.fillStyle='rgba(0,0,0,0.3)'; for (let i=1;i<4;i++) TC.fillRect(x0+1,y0+i*h/4,w-2,0.9);
      bloomT(M.lite,6,()=>{ TC.fillStyle=M.lite; TC.fillRect(x0+3,y0+10,w-6,1.8); });
    } else {                                                                                  // marbre et or
      plateT([x0,y0+5, x0+w,y0+5, x0+w,G, x0,G], M.wall); masonT(x0,y0+5,w,h-5,9,14,0.08);
      TC.fillStyle=M.trim; TC.fillRect(x0-1,y0+2,w+2,4); TC.fillRect(x0-1,G-4,w+2,4);
      bloomT('#fff0c0',6,()=>drawStar(cx,y0+18,4,'#fff3c4'));
    }
    if (lvl>=3 && era!==1){ TC.fillStyle=shade(era===0?'#6a4a2c':M.wall,0.9); for (let c=0;c<3;c++) TC.fillRect(x0+c*10.5,y0-5,7,5); }
  } else if (type==='turret'){
    const top=y0;                                                                             // la tête dépasse au-dessus
    if (era===0){                                                                             // tour de guet en bois
      TC.strokeStyle='#5a3e24'; TC.lineWidth=3; TC.lineCap='butt';
      strokeP([cx-9,G, cx-6,top+8]); TC.stroke(); strokeP([cx+9,G, cx+6,top+8]); TC.stroke();
      TC.lineWidth=1.6; strokeP([cx-8.4,G-6, cx+6.6,top+20]); TC.stroke(); strokeP([cx+8.4,G-6, cx-6.6,top+20]); TC.stroke();
      strokeP([cx-7.4,top+28, cx+7.4,top+28]); TC.stroke();
      TC.fillStyle=lgrad(0,top,0,top+10,[[0,'#a88058'],[1,'#6a4a2c']]); TC.fillRect(cx-11,top+1,22,8);
      sandbagsT(cx-12,cx+12,top+9,1);
    } else if (era===1){                                                                      // tour de pierre
      plateT([cx-9,top+4, cx+9,top+4, cx+11,G, cx-11,G], M.wall); masonT(cx-11,top+4,22,h-4,6,8,0.22);
      TC.fillStyle='#1c1814'; TC.fillRect(cx-1,top+16,2,7);
      for (let c=0;c<3;c++) plateT([cx-11+c*8,top-4, cx-6+c*8,top-4, cx-6+c*8,top+4, cx-11+c*8,top+4], shade(M.wall,1.1));
    } else if (era===2){                                                                      // fût de béton + dôme d'acier
      plateT([cx-9,top+2, cx+9,top+2, cx+10,G, cx-10,G], M.wall);
      TC.fillStyle='rgba(0,0,0,0.25)'; for (let i=1;i<4;i++) TC.fillRect(cx-9,top+2+i*(h-2)/4,18,0.9);
      TC.fillStyle='#1c1814'; TC.fillRect(cx-5,top+12,10,2);
      TC.fillStyle=lgrad(cx-10,top-10,cx+10,top+2,[[0,'#9aa0a8'],[1,'#4a4e54']]); TC.beginPath(); TC.arc(cx,top+2,10,Math.PI,0); TC.fill();
    } else {                                                                                  // pylône high-tech / d'or
      plateT([cx-7,top+4, cx+7,top+4, cx+9,G, cx-9,G], M.wall);
      if (era===3){ bloomT(M.lite,5,()=>{ TC.fillStyle=M.lite; TC.fillRect(cx-0.8,top+10,1.6,h-16); }); }
      else { TC.fillStyle=M.trim; for (let i=0;i<3;i++) TC.fillRect(cx-8,top+10+i*(h-14)/3,16,2.4); }
      plateT([cx-11,top+4, cx-6,top-6, cx+7,top-6, cx+11,top+4], era===4? M.trim : shade(M.wall,1.2));
    }
    // canons (un par niveau) pointés vers l'ennemi
    const hy = top-3;
    for (let c=0;c<lvl;c++){ const by = hy + (c-(lvl-1)/2)*3.6;
      tubeT(cx+2, by, cx+16+lvl*2, by-0.6, era>=3?1.8:1.5, era===4? '#c8a040' : '#26282e');
      if (era===3) glowDot(cx+16+lvl*2, by-0.6, 1, M.lite, 4); }
    TC.fillStyle=era===4? M.trim : era>=3? shade(M.wall,1.3) : '#3a3e44';
    rrectT(cx-6,hy-4.6,12,9.2,3); TC.fill();
    TC.fillStyle=acc; TC.fillRect(cx-6,hy+2.6,12,1.6);
  } else if (type==='farmF'){
    // champ labouré (le blé, animé, est dessiné en direct par-dessus) + abri selon l'ère
    if (era>=3){ plateT([cx-17,G-h-6, cx-5,G-h-6, cx-5,G, cx-17,G], era===4? M.wall : '#3a3a4a');      // ferme verticale
      for (let i=0;i<3;i++){ const yy=G-h-2+i*((h+2)/3); TC.fillStyle='#2e6a2e'; TC.fillRect(cx-16,yy,10,2.6);
        bloomT('#d27aff',4,()=>{ TC.fillStyle='rgba(210,122,255,0.9)'; TC.fillRect(cx-16,yy-1.2,10,0.9); }); } }
    else if (era===2){ TC.fillStyle='rgba(190,225,235,0.55)'; TC.beginPath(); TC.arc(cx-10,G,9,Math.PI,0); TC.fill();  // serre
      TC.strokeStyle='rgba(80,90,100,0.9)'; TC.lineWidth=0.9; TC.stroke(); strokeP([cx-10,G-9, cx-10,G]); TC.stroke();
      TC.fillStyle='rgba(255,255,255,0.5)'; TC.fillRect(cx-15,G-6,1.2,5); }
    else if (lvl>=2){ plateT([cx-19,G-h+6, cx-7,G-h+6, cx-7,G, cx-19,G], era===0? '#9a3a2a' : '#8a3226');  // grange
      TC.fillStyle=M.roof; polyP([cx-21,G-h+7, cx-13,G-h, cx-5,G-h+7]); TC.fill();
      TC.strokeStyle='rgba(255,255,255,0.6)'; TC.lineWidth=0.8; strokeP([cx-16,G, cx-16,G-6, cx-10,G-6, cx-10,G]); TC.stroke(); }
    TC.fillStyle=lgrad(0,G-5,0,G,[[0,'#7a5a3a'],[1,'#4a3422']]); rrectT(cx-18,G-4.4,36,4.4,1.5); TC.fill();
    TC.fillStyle='rgba(0,0,0,0.25)'; for (let i=0;i<5;i++) TC.fillRect(cx-16+i*7,G-3.6,4.4,0.9);
    TC.fillStyle='#6a4a2c'; TC.fillRect(cx+16,G-9,1.6,9); TC.fillRect(cx-19,G-9,1.6,9);
  } else if (type==='farmM'){
    // étal de marché : auvent rayé aux couleurs de la faction, caisses, sacs
    const sh = Math.max(h+4, 24), top=G-sh;
    if (era>=3){ plateT([cx-15,top+3, cx+15,top+3, cx+15,G, cx-15,G], era===4? M.wall : '#3a3a4a');
      bloomT(M.lite,6,()=>{ TC.fillStyle=M.lite; TC.fillRect(cx-11,top+7,22,4); });
      TC.fillStyle='#1c1814'; TC.fillRect(cx-10,top+14,20,G-top-18); TC.fillStyle=rgbaC(M.lite,0.35); TC.fillRect(cx-10,top+14,20,G-top-18); }
    else {
      TC.fillStyle=era===2? '#5a5e62' : '#6a4a2c'; TC.fillRect(cx-14,top+4,2,sh-4); TC.fillRect(cx+12,top+4,2,sh-4);
      plateT([cx-15,G-10, cx+15,G-10, cx+15,G, cx-15,G], era===2? '#7c8084' : '#9a7048');
      for (let i=0;i<6;i++){ TC.fillStyle=i%2? '#f2ece0' : acc; polyP([cx-17+i*5.7,top, cx-11.3+i*5.7,top, cx-10.6+i*5.7,top+7, cx-16.3+i*5.7,top+7]); TC.fill(); }
      TC.fillStyle='rgba(0,0,0,0.25)'; TC.fillRect(cx-17,top+7,34,1.2);
      TC.fillStyle='#e8c84a'; TC.beginPath(); TC.arc(cx-7,G-11.5,2.4,Math.PI,0); TC.fill();
      TC.fillStyle='#d84a2a'; TC.beginPath(); TC.arc(cx-1,G-11.5,2.2,Math.PI,0); TC.fill();
      TC.fillStyle='#7ab84a'; TC.beginPath(); TC.arc(cx+5,G-11.5,2.2,Math.PI,0); TC.fill();
      if (lvl>=2){ TC.fillStyle='#b88a50'; TC.fillRect(cx+16,G-7,7,7); TC.fillStyle='rgba(0,0,0,0.3)'; TC.fillRect(cx+16,G-4,7,0.8); }
      if (lvl>=3){ TC.fillStyle='#c8b080'; TC.beginPath(); TC.ellipse(cx-19,G-3.4,3.6,3.4,0,0,6.283); TC.fill(); }
    }
    bloomT('#ffd34a',5,()=>{ TC.fillStyle='#ffd34a'; TC.beginPath(); TC.arc(cx+10,top-3,3,0,6.283); TC.fill(); });   // enseigne (pièce)
    TC.fillStyle='#8a6a1a'; TC.fillRect(cx+9.4,top-4.4,1.2,2.8);
  } else {
    // puits : margelle de pierre + toit (→ château d'eau → purificateur)
    if (era<=1){
      plateT([cx-10,G-12, cx+10,G-12, cx+10,G, cx-10,G], era===0? '#8a7a68' : M.wall); masonT(cx-10,G-12,20,12,4,6,0.25);
      TC.fillStyle='#50a0dc'; TC.beginPath(); TC.ellipse(cx,G-12,8,2.4,0,0,6.283); TC.fill();
      TC.fillStyle='#5a3e24'; TC.fillRect(cx-9,G-h-6,1.8,h-6); TC.fillRect(cx+7.2,G-h-6,1.8,h-6);
      TC.fillStyle=M.roof; polyP([cx-13,G-h-4, cx,G-h-12, cx+13,G-h-4]); TC.fill();
      TC.strokeStyle='#3a2a1a'; TC.lineWidth=0.8; strokeP([cx,G-h-4, cx,G-16]); TC.stroke();
      TC.fillStyle='#6a5a4a'; TC.fillRect(cx-1.8,G-17,3.6,3);
    } else if (era===2){
      TC.strokeStyle='#4a4e54'; TC.lineWidth=1.6; strokeP([cx-8,G, cx-6,G-h+4]); TC.stroke(); strokeP([cx+8,G, cx+6,G-h+4]); TC.stroke();
      plateT([cx-10,G-h-8, cx+10,G-h-8, cx+10,G-h+5, cx-10,G-h+5], '#6a8aa4');
      TC.fillStyle='rgba(0,0,0,0.2)'; TC.fillRect(cx-10,G-h-2,20,0.9); tubeT(cx+4,G-h+5,cx+4,G,1,'#4a4e54');
    } else {
      plateT([cx-10,G-6, cx+10,G-6, cx+10,G, cx-10,G], era===4? M.trim : '#3a3a4a');
      TC.fillStyle='rgba(200,235,255,0.35)'; rrectT(cx-7,G-h-6,14,h,4); TC.fill();
      bloomT('#5ab8ff',6,()=>{ TC.fillStyle='rgba(90,184,255,0.85)'; rrectT(cx-5.6,G-h*0.55-6,11.2,h*0.55,3); TC.fill(); });
      TC.fillStyle='rgba(255,255,255,0.55)'; TC.fillRect(cx-5,G-h-4,1.4,h-6);
      plateT([cx-8,G-h-9, cx+8,G-h-9, cx+8,G-h-5, cx-8,G-h-5], era===4? M.trim : '#3a3a4a');
    }
  }
}
function iaBld(type, lvl, era, h, cx, G){
  const lite=FACTIONS.IA.eraCols[era], plate=iaPlate(era), frame='#2a3038', dark='#14181e', y0=G-h;
  if (type==='wall'){
    const x0=cx-14, w=28;
    if (era===0){ plateT([x0,y0, x0+w,y0, x0+w,G, x0,G], '#8a9094');                            // tôle d'acier rivetée
      TC.fillStyle='rgba(255,255,255,0.45)'; for (let i=0;i<Math.floor(h/10);i++){ TC.fillRect(x0+2,y0+4+i*10,0.9,0.9); TC.fillRect(x0+w-3,y0+4+i*10,0.9,0.9); }
      hazardT(x0,G-6,w,6); }
    else if (era===3){ plateT([x0,y0, x0+w,y0+2, x0+w,y0+h*0.48, x0,y0+h*0.46], plate);         // plaques en lévitation
      plateT([x0,y0+h*0.54, x0+w,y0+h*0.56, x0+w,G, x0,G], plate);
      bloomT(lite,6,()=>{ TC.fillStyle=lite; TC.fillRect(x0+2,y0+h*0.49,w-4,1.6); }); }
    else if (era===4){ for (const [a,b,c,d] of [[x0,G,x0+9,y0+8],[x0+7,G,x0+17,y0],[x0+15,G,x0+28,y0+12]]){   // éclats de cristal
        polyP([a,b, (a+c)/2-2,d+6, (a+c)/2,d, c,b]); TC.fillStyle=shade(plate,1.3); TC.fill();
        polyP([(a+c)/2,d, c,b, (a+c)/2+1,b]); TC.fillStyle=shade(plate,0.75); TC.fill(); }
      glowDot(cx,y0+h*0.45,1.6,lite,6); }
    else { plateT([x0,y0+4, x0+4,y0, x0+w-4,y0, x0+w,y0+4, x0+w,G, x0,G], plate);                 // panneaux de coque
      TC.fillStyle='rgba(0,0,0,0.3)'; TC.fillRect(cx-0.4,y0+2,0.9,h-2); TC.fillRect(x0+1,y0+h*0.5,w-2,0.9);
      if (era===2) bloomT(lite,5,()=>{ TC.fillStyle=lite; TC.fillRect(x0+4,y0+8,w-8,1.6); }); else glowDot(cx,y0+9,1.4,lite,5); }
  } else if (type==='turret'){
    plateT([cx-9,G-6, cx+9,G-6, cx+11,G, cx-11,G], frame);                                        // embase
    plateT([cx-6,y0+6, cx+6,y0+6, cx+8,G-6, cx-8,G-6], plate);                                    // fût
    TC.fillStyle='rgba(0,0,0,0.3)'; for (let i=1;i<3;i++) TC.fillRect(cx-6,y0+6+i*(h-12)/3,12,0.9);
    if (era>=2) bloomT(lite,4,()=>{ TC.fillStyle=lite; TC.fillRect(cx-0.7,y0+12,1.4,h-22); });
    const hy=y0-3;
    for (let c=0;c<lvl;c++){ const by=hy+(c-(lvl-1)/2)*3.6; tubeT(cx+2,by,cx+16+lvl*2,by-0.6,1.6,plate);
      TC.fillStyle=dark; TC.beginPath(); TC.arc(cx+16+lvl*2,by-0.6,1.2,0,6.283); TC.fill(); }
    plateT([cx-8,hy-5, cx+5,hy-6, cx+9,hy, cx+5,hy+5, cx-8,hy+5], shade(plate,1.1));              // tête
    TC.fillStyle=dark; TC.beginPath(); TC.arc(cx+3,hy-0.6,2.6,0,6.283); TC.fill(); glowDot(cx+3.3,hy-0.6,1.4,lite,5);
  } else if (type==='farmF'){
    // champ de panneaux solaires
    for (let i=0;i<2;i++){ const px=cx-16+i*16;
      TC.fillStyle=frame; TC.fillRect(px+6,G-8,1.6,8);
      TC.fillStyle=lgrad(px,G-16,px+14,G-8,[[0,'#3a5a8a'],[1,'#162a48']]); polyP([px,G-8, px+3,G-16, px+15,G-16, px+12,G-8]); TC.fill();
      TC.strokeStyle='rgba(160,200,255,0.45)'; TC.lineWidth=0.6; strokeP([px+1.5,G-12, px+13.5,G-12]); TC.stroke();
      strokeP([px+6,G-8, px+8,G-16]); TC.stroke(); strokeP([px+9,G-8, px+11.5,G-16]); TC.stroke(); }
    plateT([cx+14,G-h, cx+20,G-h, cx+20,G, cx+14,G], plate);                                     // batterie (LED animées en direct)
    if (lvl>=2) plateT([cx-20,G-6, cx-16,G-6, cx-16,G, cx-20,G], frame);
  } else if (type==='farmM'){
    // baie de calcul (minage) : armoire + grille de LED animées en direct
    plateT([cx-10,G-h-6, cx+10,G-h-6, cx+10,G, cx-10,G], plate);
    TC.fillStyle=dark; TC.fillRect(cx-7,G-h-2,14,h-2);
    TC.fillStyle='rgba(255,255,255,0.12)'; for (let i=0;i<4;i++) TC.fillRect(cx-7,G-h+1+i*(h-4)/4,14,0.8);
    TC.fillStyle=frame; TC.fillRect(cx-12,G-3,24,3);
    if (lvl>=2){ plateT([cx+11,G-h+2, cx+17,G-h+2, cx+17,G, cx+11,G], shade(plate,0.85)); }
  } else {
    // condenseur d'eau : cuve vitrée + conduites
    plateT([cx-9,G-5, cx+9,G-5, cx+9,G, cx-9,G], frame);
    TC.fillStyle='rgba(200,235,255,0.3)'; rrectT(cx-6.5,G-h-6,13,h+1,5); TC.fill();
    bloomT(lite,5,()=>{ TC.fillStyle=rgbaC(lite,0.75); rrectT(cx-5,G-h*0.6-5,10,h*0.6,4); TC.fill(); });
    TC.fillStyle='rgba(255,255,255,0.5)'; TC.fillRect(cx-4.4,G-h-4,1.2,h-4);
    plateT([cx-7.5,G-h-9, cx+7.5,G-h-9, cx+7.5,G-h-5, cx-7.5,G-h-5], plate);
    tubeT(cx+7,G-h*0.5-3,cx+13,G-h*0.5-3,1.2,frame); tubeT(cx+13,G-h*0.5-3,cx+13,G,1.2,frame);
  }
}

/* --- BASES --- */
const BASP = { W:184, H:156, cx:92, G:144 };
function baseSprite(fk, era, trans, fort){
  const cx=BASP.cx, G=BASP.G, acc=FACTIONS[fk].accent;
  // remparts de fortification (niveau ≥ 2) de part et d'autre
  if (fort>=2){ const fh=26+(fort-2)*14;
    for (const dx of [-72,64]){
      if (fk==='HUM'){ const M=HMAT[era]; const wc = era===0? '#7a6a5a' : M.wall;
        plateT([cx+dx,G-fh, cx+dx+16,G-fh, cx+dx+16,G, cx+dx,G], wc); masonT(cx+dx,G-fh,16,fh,6,8,0.2);
        TC.fillStyle=shade(wc,1.15); TC.fillRect(cx+dx,G-fh-4,6,4); TC.fillRect(cx+dx+10,G-fh-4,6,4);
        if (era>=3) bloomT(M.lite,4,()=>{ TC.fillStyle=M.lite; TC.fillRect(cx+dx+2,G-fh+6,12,1.4); }); }
      else { const pl=iaPlate(era);
        plateT([cx+dx+2,G-fh, cx+dx+14,G-fh, cx+dx+16,G, cx+dx,G], pl);
        bloomT(FACTIONS.IA.eraCols[era],5,()=>{ TC.fillStyle=FACTIONS.IA.eraCols[era]; TC.fillRect(cx+dx+7.2,G-fh+4,1.6,fh-10); }); } } }
  if (fk==='HUM') humBase(era, trans, cx, G, acc); else iaBase(era, trans, cx, G, acc);
}
function humBase(era, trans, cx, G, acc){
  const M=HMAT[era];
  // tour (côté arrière, le mât du drapeau s'y plante — drapeau animé en direct)
  const tx0=cx-42, tx1=cx-20, tTop=G-92;
  plateT([tx0,tTop, tx1,tTop, tx1,G, tx0,G], shade(M.wall,0.92));
  if (era===0){ masonT(tx0,tTop,22,92,4,7,0.18); TC.fillStyle=M.roof; polyP([tx0-3,tTop+1, cx-31,tTop-11, tx1+3,tTop+1]); TC.fill(); }
  else if (era===1){ masonT(tx0,tTop,22,92,7,10,0.2); for (let c=0;c<3;c++) plateT([tx0+c*8,tTop-6, tx0+c*8+6,tTop-6, tx0+c*8+6,tTop, tx0+c*8,tTop], shade(M.wall,1.05)); }
  else if (era===2){ TC.fillStyle='rgba(0,0,0,0.22)'; for (let i=1;i<6;i++) TC.fillRect(tx0,tTop+i*15,22,0.9);
    TC.strokeStyle='#4a4e54'; TC.lineWidth=1.4; strokeP([tx0+5,tTop, tx0+3,tTop-14]); TC.stroke(); glowDot(tx0+3,tTop-15,1.4,'#ff5a4a',4); }
  else if (era===3){ bloomT(M.lite,5,()=>{ TC.fillStyle=M.lite; TC.fillRect(cx-31.8,tTop+8,1.6,70); });
    plateT([tx0-2,tTop+2, cx-31,tTop-12, tx1+2,tTop+2], M.roof); }
  else { TC.fillStyle=M.trim; for (let i=0;i<4;i++) TC.fillRect(tx0,tTop+12+i*20,22,2.4);
    TC.fillStyle=lgrad(tx0,tTop-12,tx1,tTop,[[0,'#fff0b0'],[1,'#b88a30']]); TC.beginPath(); TC.arc(cx-31,tTop,11,Math.PI,0); TC.fill(); }
  windowT(cx-34,tTop+16,6,era===1?9:7,M.lite,era===0);
  // corps de bâtisse
  const hx0=cx-30, hx1=cx+42, hTop=G-58;
  plateT([hx0,hTop, hx1,hTop, hx1,G, hx0,G], M.wall);
  if (era===0) masonT(hx0,hTop,hx1-hx0,58,4,8,0.18);
  else if (era===1) masonT(hx0,hTop,hx1-hx0,58,7,12,0.2);
  else if (era===2){ TC.fillStyle='rgba(0,0,0,0.2)'; for (let i=1;i<4;i++) TC.fillRect(hx0,hTop+i*14.5,hx1-hx0,0.9); for (let i=1;i<5;i++) TC.fillRect(hx0+i*14.4,hTop,0.9,58); }
  else if (era===3){ TC.fillStyle='rgba(0,0,0,0.3)'; for (let i=1;i<3;i++) TC.fillRect(hx0,hTop+i*19,hx1-hx0,0.9);
    bloomT(M.lite,6,()=>{ TC.fillStyle=M.lite; TC.fillRect(hx0+4,hTop+8,hx1-hx0-8,1.6); }); }
  else { masonT(hx0,hTop,hx1-hx0,58,10,18,0.07); TC.fillStyle=M.trim; TC.fillRect(hx0-1,hTop+2,hx1-hx0+2,3); TC.fillRect(hx0-1,G-4,hx1-hx0+2,4); }
  // toiture / parapet
  if (era===0){ TC.fillStyle=lgrad(0,hTop-10,0,hTop,[[0,'#8a8680'],[1,'#56524e']]); polyP([hx0-4,hTop, hx1+4,hTop, hx1-2,hTop-10, hx0+2,hTop-10]); TC.fill();
    TC.fillStyle='rgba(0,0,0,0.22)'; for (let x=hx0;x<hx1;x+=4) TC.fillRect(x,hTop-9.4,0.9,9.4);
    TC.fillStyle='#8a4a2a'; TC.fillRect(hx0+10,hTop-7,12,4); }                                        // tôle rouillée rapiécée
  else if (era===1){ for (let c=0;c<7;c++) plateT([hx0+c*11,hTop-7, hx0+c*11+7,hTop-7, hx0+c*11+7,hTop, hx0+c*11,hTop], shade(M.wall,1.06)); }
  else if (era===2){ plateT([hx0-2,hTop-4, hx1+2,hTop-4, hx1+2,hTop, hx0-2,hTop], M.roof);
    TC.strokeStyle='#4a4e54'; TC.lineWidth=1.6; strokeP([cx+22,hTop-4, cx+22,hTop-14]); TC.stroke();      // radar
    TC.fillStyle=lgrad(cx+14,hTop-24,cx+30,hTop-12,[[0,'#d8dce0'],[1,'#7a8088']]); TC.beginPath(); TC.ellipse(cx+22,hTop-17,9,4,-0.35,0,Math.PI); TC.fill(); }
  else if (era===3){ plateT([hx0-3,hTop, hx1+3,hTop, hx1-6,hTop-10, hx0+6,hTop-10], M.roof);
    glowDot(cx+6,hTop-12,2.2,M.lite,8); }
  else { TC.fillStyle=lgrad(0,hTop-16,0,hTop,[[0,'#fff0b0'],[1,'#c89a40']]); polyP([hx0-3,hTop, cx+6,hTop-17, hx1+3,hTop]); TC.fill();
    bloomT('#fff0c0',8,()=>drawStar(cx+6,hTop-7,4.6,'#fff6d0')); }
  // fenêtres
  for (const wx of [hx0+6, hx0+20, hx0+34]) for (const wy of [hTop+10, hTop+28]){
    if (era===1) windowT(wx+1.5,wy,3,10,M.lite,false);
    else if (era===3){ TC.fillStyle='#1c1814'; TC.fillRect(wx-0.6,wy+3,8.2,3.4); bloomT(M.lite,4,()=>{ TC.fillStyle=M.lite; TC.fillRect(wx,wy+3.6,7,2.2); }); }
    else if (era===4){ TC.fillStyle='#1c1814'; rrectT(wx-0.6,wy-0.6,7.2,11,3.4); TC.fill(); bloomT(M.lite,5,()=>{ TC.fillStyle=M.lite; rrectT(wx,wy,6,10,3); TC.fill(); }); }
    else windowT(wx,wy+1,6,era===2?4:7,M.lite,era===0 && wx===hx0+20 && wy===hTop+10);
  }
  // porte (face à l'ennemi)
  const dx0=cx+20, dw=16, dTop=G-30;
  if (era===0){ TC.fillStyle=lgrad(dx0,0,dx0+dw,0,[[0,'#8a6440'],[1,'#5a3e24']]); TC.fillRect(dx0,dTop,dw,30);
    TC.fillStyle='rgba(0,0,0,0.3)'; for (let i=1;i<4;i++) TC.fillRect(dx0+i*4,dTop,0.8,30);
    TC.fillStyle='#4a3420'; TC.save(); TC.translate(dx0+dw/2,dTop+15); TC.rotate(0.6); TC.fillRect(-10,-1.2,20,2.4); TC.restore(); }
  else if (era===1){ TC.fillStyle='#1c1814'; TC.beginPath(); TC.moveTo(dx0-1,G); TC.lineTo(dx0-1,dTop+7); TC.arc(dx0+dw/2,dTop+7,dw/2+1,Math.PI,0); TC.lineTo(dx0+dw+1,G); TC.fill();
    TC.fillStyle=lgrad(dx0,0,dx0+dw,0,[[0,'#8a6440'],[1,'#5a3e24']]); TC.beginPath(); TC.moveTo(dx0,G); TC.lineTo(dx0,dTop+7); TC.arc(dx0+dw/2,dTop+7,dw/2,Math.PI,0); TC.lineTo(dx0+dw,G); TC.fill();
    TC.fillStyle='#3a3a3e'; TC.fillRect(dx0,dTop+12,dw,1.8); TC.fillRect(dx0,dTop+22,dw,1.8); }
  else if (era===2){ plateT([dx0,dTop, dx0+dw,dTop, dx0+dw,G, dx0,G], '#5a5e64'); hazardT(dx0,dTop,dw,3.4); TC.fillStyle='rgba(0,0,0,0.3)'; TC.fillRect(dx0+dw/2-0.4,dTop+4,0.8,26); }
  else if (era===3){ TC.fillStyle='#14121c'; TC.fillRect(dx0,dTop,dw,30); bloomT(acc,6,()=>{ TC.strokeStyle=rgbaC(acc,0.9); TC.lineWidth=1.2; TC.strokeRect(dx0+1.5,dTop+1.5,dw-3,27); }); }
  else { TC.fillStyle=lgrad(dx0,dTop,dx0+dw,G,[[0,'#fff0b0'],[1,'#b88a30']]); TC.beginPath(); TC.moveTo(dx0,G); TC.lineTo(dx0,dTop+7); TC.arc(dx0+dw/2,dTop+7,dw/2,Math.PI,0); TC.lineTo(dx0+dw,G); TC.fill(); }
  // bannière de faction
  const bc = trans? '#d8282a' : acc;
  TC.fillStyle=lgrad(cx-6,0,cx+2,0,[[0,shade(bc,1.15)],[1,shade(bc,0.75)]]); polyP([cx-6,hTop+6, cx+2,hTop+6, cx+2,hTop+30, cx-2,hTop+26, cx-6,hTop+30]); TC.fill();
  if (trans) bloomT('#ffe9a0',4,()=>drawStar(cx-2,hTop+15,3,'#ffe9a0'));
  // avant-poste : sacs de sable (→ bornes d'énergie)
  if (era<=2) sandbagsT(cx+40,cx+62,G,era===0?3:2);
  else { for (const px of [cx+46,cx+58]){ plateT([px-2,G-14, px+2,G-14, px+3,G, px-3,G], era===4? M.trim : M.wall); glowDot(px,G-15,1.6,M.lite,6); } }
}
function iaBase(era, trans, cx, G, acc){
  const lite=FACTIONS.IA.eraCols[era], plate=iaPlate(era), frame='#2a3038', dark='#14181e';
  if (era===0){                                                                                // ferme de serveurs
    plateT([cx-40,G-62, cx+40,G-62, cx+40,G, cx-40,G], plate);
    for (let i=0;i<4;i++){ const rx=cx-34+i*17; TC.fillStyle=dark; TC.fillRect(rx,G-54,13,46);
      TC.fillStyle='rgba(255,255,255,0.1)'; for (let j=0;j<8;j++) TC.fillRect(rx,G-52+j*5.6,13,0.8); }
    for (const fx of [cx-24,cx+12]){ plateT([fx-8,G-70, fx+12,G-70, fx+12,G-62, fx-8,G-62], frame);
      TC.fillStyle='#4a525c'; TC.beginPath(); TC.ellipse(fx+2,G-66,6,2.4,0,0,6.283); TC.fill(); }
    hazardT(cx-40,G-6,80,6);
    TC.strokeStyle=frame; TC.lineWidth=2.4; strokeP([cx,G-62, cx,G-78]); TC.stroke();
  } else if (era===1){                                                                         // tour-cœur
    plateT([cx-44,G-14, cx+44,G-14, cx+48,G, cx-48,G], frame);
    plateT([cx-26,G-74, cx-18,G-82, cx+18,G-82, cx+26,G-74, cx+28,G-14, cx-28,G-14], plate);
    TC.fillStyle=dark; TC.fillRect(cx-4,G-74,8,56);
    bloomT(lite,8,()=>{ TC.fillStyle=lite; TC.fillRect(cx-2,G-72,4,52); });
    TC.fillStyle='rgba(0,0,0,0.25)'; for (let i=1;i<4;i++) TC.fillRect(cx-27,G-74+i*15,23,0.9), TC.fillRect(cx+4,G-74+i*15,23,0.9);
  } else if (era===2){                                                                         // forteresse anguleuse
    for (const s of [-1,1]){ plateT([cx+s*30-9,G-56, cx+s*30+9,G-56, cx+s*30+10,G, cx+s*30-10,G], shade(plate,0.9));
      tubeT(cx+s*30,G-60,cx+s*30+s*14,G-62,1.6,frame); plateT([cx+s*30-6,G-64, cx+s*30+6,G-64, cx+s*30+6,G-56, cx+s*30-6,G-56], plate); }
    plateT([cx-22,G-72, cx+22,G-72, cx+28,G-20, cx+24,G, cx-24,G, cx-28,G-20], plate);
    TC.strokeStyle='rgba(0,0,0,0.3)'; TC.lineWidth=0.9; strokeP([cx-22,G-72, cx,G-40, cx+22,G-72]); TC.stroke();
    bloomT(lite,6,()=>{ TC.fillStyle=lite; TC.fillRect(cx-16,G-24,32,2); });
  } else if (era===3){                                                                         // pyramide en lévitation
    for (let i=0;i<4;i++){ const w2=88-i*20, yb=G-i*19, yt=yb-15;
      plateT([cx-w2/2,yb, cx+w2/2,yb, cx+w2/2-6,yt, cx-w2/2+6,yt], mix(plate,'#2a2a3a',0.15*i));
      bloomT(lite,6,()=>{ TC.fillStyle=lite; TC.fillRect(cx-w2/2+8,yt-2.2,w2-16,1.6); }); }
  } else {                                                                                     // flèche de cristal
    plateT([cx-46,G-8, cx+46,G-8, cx+50,G, cx-50,G], frame);
    for (const [ox,hh,ww] of [[-28,46,14],[28,40,12],[0,100,22]]){
      polyP([cx+ox-ww/2,G-8, cx+ox-ww/4,G-8-hh*0.7, cx+ox,G-8-hh, cx+ox+ww/2,G-8]); TC.fillStyle=shade(plate,1.35); TC.fill();
      polyP([cx+ox,G-8-hh, cx+ox+ww/2,G-8, cx+ox+ww*0.1,G-8]); TC.fillStyle=shade(plate,0.72); TC.fill();
      TC.strokeStyle=rgbaC(lite,0.6); TC.lineWidth=0.8; strokeP([cx+ox,G-8-hh, cx+ox+ww*0.1,G-8]); TC.stroke(); }
    glowDot(cx+2,G-50,3,lite,10);
  }
  if (trans) bloomT('#ff4ad0',6,()=>{ TC.fillStyle='#ff4ad0'; TC.fillRect(cx-30,G-3,60,1.6); });
}
// hauteur de l'œil scrutateur (animé en direct) au sommet de chaque base GPT
const IA_EYE_Y = [80, 94, 84, 90, 116];
function drawBase(side){
  const x = side.x-camX; if (x<-160||x>VW()+160) return;
  const fac = side.fac, t = game.t, era = side.era, hum = side.facKey==='HUM', d = side.side;
  const col = fac.accent, gy = gY(side.x), fort = clamp(side.fortLvl||1, 1, 4);
  projShadow(x, gy, 52);                          // ombre portée de la base
  const spr = sprite('BASE'+side.facKey+era+(side.trans?'T':'')+fort, BASP.W, BASP.H, ()=>baseSprite(side.facKey, era, side.trans, fort));
  ctx.save(); ctx.translate(x, gy); ctx.scale(d, 1); ctx.drawImage(spr, -BASP.cx, -BASP.G, BASP.W, BASP.H);
  if (!hum && era===0){                            // LED des baies de serveurs qui clignotent
    for (let i=0;i<4;i++) for (let j=0;j<8;j++){ const on = Math.sin(t*(2.2+i*0.7)+j*1.9+i)>0.2;
      ctx.fillStyle = on? col : 'rgba(90,208,255,0.18)'; ctx.fillRect(-BASP.cx+58+i*17+(j%2)*5, -48+j*5.6, 2.4, 1.6); } }
  ctx.restore();
  if (hum){
    // mât + drapeau qui ondule au sommet de la tour
    const px = x - d*31, pb = gy-92-[11,6,0,12,11][era], top = pb-24;
    ctx.strokeStyle='#4a4650'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(px,pb); ctx.lineTo(px,top); ctx.stroke();
    const wv=Math.sin(t*3)*2.2, wv2=Math.sin(t*3+1.3)*2.2, fc=side.trans?'#e84a3a':col;
    ctx.fillStyle=fc; ctx.beginPath(); ctx.moveTo(px,top); ctx.quadraticCurveTo(px+d*11,top-2+wv, px+d*22,top+1+wv2);
    ctx.lineTo(px+d*22,top+10+wv2); ctx.quadraticCurveTo(px+d*11,top+8+wv, px,top+10); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.fillRect(px, top+7, d*22, 1.2);
    if (side.trans) drawStar(px+d*10, top+5+wv*0.5, 3, '#ffe9a0');
    if (era>=3){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle='rgba(255,211,74,'+(0.22+0.1*Math.sin(t*2))+')'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(x,gy-40,70,Math.PI*1.08,-Math.PI*0.08); ctx.stroke(); ctx.restore(); }   // bouclier d'énergie
  } else {
    // œil scrutateur qui suit le front
    let frontX = side.x - d*200;
    for (const u of game.p.units.concat(game.e.units)) if (Math.abs(u.x-side.x)<500) frontX=u.x;
    const look = clamp((frontX-side.x)/500,-1,1)*4, ey = gy-IA_EYE_Y[era];
    sculptT(x-13, ey-8, 26, 16, 6, '#cfe0ee');
    bloomT(side.trans?'#ff4ad0':col, 8, ()=>{ ctx.fillStyle=side.trans?'#ff4ad0':col; ctx.beginPath(); ctx.arc(x+look,ey,5,0,6.283); ctx.fill(); });
    ctx.fillStyle='#0a1018'; ctx.beginPath(); ctx.arc(x+look,ey,2.2,0,6.283); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for (let i=0;i<era+(side.trans?2:0);i++){ ctx.strokeStyle='rgba(90,208,255,'+(0.36-i*0.05)+')'; ctx.lineWidth=1.6;
      ctx.beginPath(); ctx.arc(x,ey,20+i*7+Math.sin(t*2+i)*2,0,6.283); ctx.stroke(); }
    ctx.restore();
  }
  // nano-réparation : ouvriers (HUM) / drones (IA)
  if (side.autoRepair){
    if (hum){ for (let i=0;i<2;i++){ const wx=x+Math.sin(t*0.7+i*2.6)*52, wy=gy-1;
      ctx.fillStyle='#caa84a'; ctx.beginPath(); ctx.arc(wx,wy-12,2.6,0,6.283); ctx.fill(); ctx.fillStyle='#8a6a3a'; ctx.fillRect(wx-2,wy-10,4,8);
      if (Math.sin(t*8+i)>0.5) bloomT('#ffd34a',5,()=>{ ctx.fillStyle='#ffd34a'; ctx.fillRect(wx+2,wy-13,2,2); }); } }
    else { for (let i=0;i<2;i++){ const a=t*1.4+i*3.14, dx2=Math.cos(a)*46, dy2=-58+Math.sin(a*1.7)*16;
      bloomT('#5ad0ff',6,()=>{ ctx.fillStyle='#5ad0ff'; ctx.beginPath(); ctx.moveTo(x+dx2+4,gy+dy2); ctx.lineTo(x+dx2,gy+dy2-3); ctx.lineTo(x+dx2-4,gy+dy2); ctx.lineTo(x+dx2,gy+dy2+3); ctx.closePath(); ctx.fill(); }); } }
  }
  const w=110, frac=clamp(side.hp/side.maxhp,0,1), by=gy-140;
  // base amochée : colonnes de fumée puis flammes (l'état de siège se LIT à l'écran)
  if (frac<0.55){ dmgSmoke(x-26, gy-70, frac, t, side.x); dmgSmoke(x+22, gy-52, frac, t, side.x+31); }
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(x-w/2,by,w,8);
  ctx.fillStyle=col; ctx.fillRect(x-w/2,by,w*frac,8);
  ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1; ctx.strokeRect(x-w/2,by,w,8);
  // indication réparation possible
  if (side===game.p && frac<0.95){
    ctx.font='12px Arial'; ctx.textAlign='center';
    ctx.fillStyle='rgba(255,255,255,'+(0.5+0.3*Math.sin(t*3))+')';
    ctx.fillText(tr('hud_tap_repair'), x, by-10);
  }
}
let SLOT_LABELS = [];   // libellés de socles posés cette frame (anti-chevauchement)
function drawSlot(slot, side, neutral){
  const x = slot.x-camX; if (x<-60||x>VW()+60) return;
  const gy = gY(slot.x), t = game.t;
  const owner = neutral? slot.owner : side;
  if (!slot.b){
    const canB = neutral? true : side===game.p, pulse = 0.5+0.5*Math.sin(t*2.6);
    const ac = neutral? '#e8d8a0' : '#ffd34a';
    // halo de sol doux + anneau lumineux NET, parfaitement centrés sur le spot (plus de socle/poteau noir)
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(x,gy,2,x,gy,30); g.addColorStop(0,rgbaC(ac,0.16+0.12*pulse)); g.addColorStop(1,rgbaC(ac,0));
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(x,gy,30,11,0,0,6.283); ctx.fill();
    if (canB){ ctx.strokeStyle=rgbaC(ac,0.55+0.4*pulse); ctx.lineWidth=2; ctx.shadowColor=ac; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.ellipse(x,gy,24,9,0,0,6.283); ctx.stroke(); }
    ctx.restore();
    if (canB){
      const fy=gy-26+Math.sin(t*2.6)*2;     // « + » flottant (aucun support)
      bloomT(ac,8,()=>{ ctx.strokeStyle=ac; ctx.lineWidth=3; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(x-6,fy); ctx.lineTo(x+6,fy); ctx.moveTo(x,fy-6); ctx.lineTo(x,fy+6); ctx.stroke(); });
      // ÉTIQUETTE anti-chevauchement : des socles côte à côte (éco de base, tuto) partageaient
      // le même texte illisible — on n'écrit le libellé que si aucun voisin ne l'a déjà posé.
      if (SLOT_LABELS.every(lx=>Math.abs(lx-slot.x)>=90)){
        SLOT_LABELS.push(slot.x);
        ctx.font='700 9px Arial'; ctx.textAlign='center'; ctx.fillStyle=rgbaC(ac,0.92);
        ctx.fillText(neutral?tr('free_land'):tr('build_here'), x, gy-40);
      }
    }
    return;
  }
  const b=slot.b, facKey = owner.facKey, fac = owner.fac;
  if (b.type==='site'){
    ctx.strokeStyle='#8a7a5a'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x-14,gy); ctx.lineTo(x+10,gy-34); ctx.moveTo(x+14,gy); ctx.lineTo(x-10,gy-34); ctx.stroke();
    ctx.strokeStyle='#6a5a3e'; ctx.beginPath(); ctx.moveTo(x-16,gy-18); ctx.lineTo(x+16,gy-18); ctx.stroke();
    ctx.font='12px Arial'; ctx.textAlign='center'; ctx.fillStyle='#e8d8a0'; ctx.fillText('🚧', x, gy-42);
    return;
  }
  const lvl = b.lvl||1, bh2 = bldH(b);
  projShadow(x, gy, 15);                          // ombre portée du bâtiment
  // POP DE CONSTRUCTION : le bâtiment SURGIT du sol avec un léger dépassement élastique
  // (b.age démarre à 0 à la pose — pur habillage, ancré au sol, sans effet de jeu).
  const popK = (b.age!==undefined && b.age<0.45)? clamp(b.age/0.45,0,1) : 1;
  const popped = popK<1;
  if (popped){
    const s = popK<0.8? (popK/0.8)*1.08 : 1.08-((popK-0.8)/0.2)*0.08;
    ctx.save(); ctx.translate(x,gy); ctx.scale(1,Math.max(0.06,s)); ctx.translate(-x,-gy);
  }
  const bera = owner.era||0, bs = owner.side||1;
  const bspr = sprite('B'+b.type+facKey+lvl+'e'+bera, BSP.W, BSP.H, ()=>bldSprite(b.type, facKey, lvl, bera, bh2));
  ctx.save(); ctx.translate(x, gy); ctx.scale(bs, 1); ctx.drawImage(bspr, -BSP.cx, -BSP.G, BSP.W, BSP.H);
  // animations en direct par-dessus le bâtiment cuit
  if (b.type==='farmF'){
    if (facKey==='HUM'){ ctx.strokeStyle='#caa84a'; ctx.lineWidth=2; ctx.lineCap='round'; ctx.fillStyle='#e8c84a';
      for (let i=0;i<4;i++){ const wx=-1+i*5.6, sw=Math.sin(t*2+i)*2; ctx.beginPath(); ctx.moveTo(wx,-3); ctx.lineTo(wx+sw,-16); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(wx+sw,-17.5,1.8,3,sw*0.08,0,6.283); ctx.fill(); } }
    else for (let i=0;i<3;i++){ ctx.fillStyle=(Math.sin(t*3+i)>0)? FACTIONS.IA.eraCols[bera] : 'rgba(90,208,255,0.2)'; ctx.fillRect(15.4,-bh2+3+i*((bh2-6)/3),3.2,2); }
  } else if (b.type==='farmM' && facKey!=='HUM'){
    const rows=Math.max(3,Math.floor((bh2-4)/4));
    for (let r=0;r<rows;r++) for (let c=0;c<3;c++){ const on=Math.sin(t*4+r*1.7+c*2.3)>0.1;
      ctx.fillStyle=on? FACTIONS.IA.eraCols[bera] : 'rgba(180,74,255,0.18)'; ctx.fillRect(-5.6+c*4.2,-bh2+0.6+r*((bh2-4)/rows),2.4,1.4); }
  } else if (b.type==='turret' && b.atkT > BUILDS.turret.rate-0.1){
    bloomT('#ffd34a',8,()=>{ ctx.fillStyle='#ffd34a'; ctx.beginPath(); ctx.arc(18+lvl*2,-bh2-3.6,3,0,6.283); ctx.fill(); });
  }
  ctx.restore();
  if (popped) ctx.restore();   // fin du pop de construction (le reste — garnison, barres — à l'échelle normale)
  // garnison : silhouettes animées selon le rôle, aux créneaux
  if (b.gar && b.gar.length){
    for (let gi=0; gi<b.gar.length; gi++){
      const g = b.gar[gi], gx = x + (gi? 8:-8), gyTop = gy - bh2 - 2;
      const col = FACTIONS[g.fac].eraCols[g.era];
      const recoil = g.atkT > g.rate-0.12;
      // tête qui dépasse
      if (g.fac==='HUM'){ ctx.fillStyle='#edc39a'; ctx.beginPath(); ctx.arc(gx, gyTop-3, 3.2, 0, 6.28); ctx.fill();
        ctx.fillStyle=col; ctx.beginPath(); ctx.arc(gx, gyTop-4, 3.5, Math.PI, 0); ctx.fill(); }
      else { ctx.fillStyle='#e8f4ff'; ctx.beginPath(); ctx.arc(gx, gyTop-3, 3.4, 0, 6.28); ctx.fill();
        ctx.fillStyle='#1a1a2e'; ctx.beginPath(); ctx.arc(gx+1, gyTop-3, 1.3, 0, 6.28); ctx.fill(); }
      if (g.range>60){
        // canon qui suit la cadence + flash au tir
        ctx.strokeStyle = g.role==='siege'? '#e8d8a0':'#2c2c34'; ctx.lineWidth=2;
        const ang = g.role==='siege'? -0.5 : -0.08;
        ctx.beginPath(); ctx.moveTo(gx, gyTop-2);
        ctx.lineTo(gx + owner.side*10*Math.cos(ang), gyTop-2+10*Math.sin(ang)); ctx.stroke();
        if (recoil){ ctx.fillStyle = g.fac==='HUM'? '#ffd34a':'#aef';
          ctx.beginPath(); ctx.arc(gx + owner.side*11, gyTop-3, 2.6, 0, 6.28); ctx.fill(); }
      } else {
        // mêlée/tank : lame ou bouclier qui veille à la porte
        if (g.role==='tank'){ ctx.fillStyle=col; rr(gx + owner.side*4-2, gyTop-6, 3.4, 8, 1); ctx.fill(); }
        else { ctx.strokeStyle=col; ctx.lineWidth=2;
          const sw = recoil? 0.8 : Math.sin(g.bob)*0.2;
          ctx.beginPath(); ctx.moveTo(gx, gyTop-2);
          ctx.lineTo(gx + owner.side*8*Math.cos(sw-0.4), gyTop-2-8*Math.sin(sw+0.4)); ctx.stroke(); }
      }
    }
  }
  // v1.5 — halo doré « plein régime » : une ferme/marché/puits qui a vieilli sans mourir
  // rayonne de plus en plus (jusqu'à ×3 de production). Indice visuel cheap (pas de gradient).
  if ((b.type==='farmF'||b.type==='farmM'||b.type==='well') && SETTINGS.quality!=='low'){
    const inten = clamp((longevMul(b)-1)/2, 0, 1);
    if (inten>0.12){
      const bh3 = bldH(b), cy = gy-bh3*0.5;
      ctx.save(); ctx.globalCompositeOperation='lighter';
      ctx.fillStyle='rgba(255,206,96,'+(0.05+0.11*inten).toFixed(3)+')';
      ctx.beginPath(); ctx.arc(x, cy, 15+4*Math.sin(t*2)+9*inten, 0, 6.283); ctx.fill();
      ctx.restore();
      if (inten>0.9){ ctx.fillStyle='rgba(255,228,130,0.9)'; ctx.font='9px Arial'; ctx.textAlign='center';
        ctx.fillText('✦', x, gy-bh3-30); }
    }
  }
  // niveau et garnison
  if ((b.lvl||1)>1){ ctx.font='10px Arial'; ctx.textAlign='center';
    ctx.fillStyle='#ffd34a'; ctx.fillText('★'.repeat(b.lvl-1), x, gy-bldH(b)-22); }
  // défenseurs aux créneaux des murailles : tête + fusil qui dépasse du rempart
  if (b.type==='wall' && b.gar && b.gar.length){
    for (let gi=0; gi<b.gar.length; gi++){
      const gx = x-7+gi*14, gTop = gy-bldH(b);
      ctx.fillStyle = owner.facKey==='HUM'? '#e0b890':'#e8f4ff';
      ctx.beginPath(); ctx.arc(gx, gTop-4, 3, 0, 6.28); ctx.fill();
      ctx.strokeStyle='#2c2c34'; ctx.lineWidth=1.8;
      ctx.beginPath(); ctx.moveTo(gx, gTop-3); ctx.lineTo(gx+owner.side*9, gTop-6); ctx.stroke();
      if (b.gar[gi].atkT > b.gar[gi].rate-0.1){
        ctx.fillStyle='#ffd34a'; ctx.beginPath(); ctx.arc(gx+owner.side*10, gTop-6, 2.2, 0, 6.28); ctx.fill();
      }
    }
  }
  if (b.gar && b.gar.length){
    ctx.font='11px Arial'; ctx.textAlign='center';
    ctx.fillStyle='#fff'; ctx.fillText('🚪'+b.gar.length, x+20, gy-bldH(b)-12);
  }
  const frac = clamp(b.hp/b.maxhp,0,1);
  dmgSmoke(x, gy-bldH(b), frac, t, slot.x);            // bâtiment amoché : fumée, puis flammes
  if (frac<1){ const hy = gy-bldH(b)-18;
    ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(x-16,hy,32,3.4);
    ctx.fillStyle = frac>0.4?'#7dd84a':'#ff5a4a'; ctx.fillRect(x-16,hy,32*frac,3.4); }
  // nano-réparation : l'équipe se déplace sur CHAQUE bâtiment endommagé de la carte
  if (owner && owner.autoRepair && frac<1){
    if (owner.facKey==='HUM'){
      const wx2 = x + Math.sin(t*3)*8;
      ctx.fillStyle='#caa84a'; ctx.beginPath(); ctx.arc(wx2, gy-13, 2.6, 0, 6.28); ctx.fill();
      ctx.fillStyle='#8a6a3a'; ctx.fillRect(wx2-2, gy-11, 4, 8);
      if (Math.sin(t*9)>0.6){ ctx.fillStyle='#ffd34a'; ctx.fillRect(wx2+3, gy-14, 1.8, 1.8); }
    } else {
      const a2 = t*2.2, dx3 = Math.cos(a2)*14;
      ctx.fillStyle='#5ad0ff'; ctx.beginPath();
      ctx.moveTo(x+dx3+4, gy-26); ctx.lineTo(x+dx3, gy-29); ctx.lineTo(x+dx3-4, gy-26); ctx.lineTo(x+dx3, gy-23);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(90,208,255,0.4)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x+dx3, gy-23); ctx.lineTo(x+dx3, gy-12); ctx.stroke();
    }
  }
}
