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
/* ---------- INTRO : le lore en six tableaux + carton-titre ----------
   I le travail s'éteint · II la soif des machines · III la corporation · IV l'éveil ·
   V le monde optimisé · VI la résistance · titre. Chaque tableau : léger travelling avant
   (Ken Burns), titre de chapitre, texte ligne à ligne, fondu au noir entre deux tableaux,
   et avance automatique après ~11 s pour qui se laisse porter. */
const INTRO_N = 7;
const INTRO_LORE = ['lore_work','lore_res','lore0','lore1','lore_opt','lore2'];
let introOut = 0, introNext = 0;          // fondu de sortie (s) et tableau suivant
let introChrome = true;                    // bouton PASSER + indications (coupés pour les captures du store)
// texte du tableau : bandeau sombre dégradé, lignes enroulées à la largeur de l'écran
function introText(lines, y){
  ctx.textAlign='center';
  let fs = 15; ctx.font=fs+'px '+UI_TYPE;
  const wrap = (arr)=>{ const out=[]; for (const ln of arr){ let cur='';
      for (const w of String(ln).split(' ')){ const t2 = cur? cur+' '+w : w;
        if (ctx.measureText(t2).width > W-90 && cur){ out.push(cur); cur=w; } else cur=t2; }
      if (cur) out.push(cur); } return out; };
  let ls = wrap(lines);
  if (ls.length > 3){ fs = 13.5; ctx.font=fs+'px '+UI_TYPE; ls = wrap(lines); }
  const lh = fs+8, y0 = Math.min(y, H-30-ls.length*lh);
  const bh = ls.length*lh+30;
  const g=ctx.createLinearGradient(0,y0-22,0,y0-22+bh);
  g.addColorStop(0,'rgba(8,6,10,0)'); g.addColorStop(0.16,'rgba(8,6,10,0.74)');
  g.addColorStop(0.84,'rgba(8,6,10,0.74)'); g.addColorStop(1,'rgba(8,6,10,0)');
  ctx.fillStyle=g; ctx.fillRect(0, y0-22, W, bh);
  for (let i=0;i<ls.length;i++){
    const ap = clamp(introT*1.5 - 0.2 - i*0.28, 0, 1);     // apparition ligne par ligne
    ctx.globalAlpha=ap; ctx.fillStyle='#e8dfd0';
    ctx.shadowColor='rgba(0,0,0,0.85)'; ctx.shadowBlur=4;
    ctx.fillText(ls[i], W/2, y0+8+i*lh, W-50);
  }
  ctx.globalAlpha=1; ctx.shadowBlur=0;
}
// titre de chapitre façon générique de film (haut gauche, sous la barre cinéma)
function introChapter(i, col){
  const ch = _t('lore_ch'); if (!Array.isArray(ch) || !ch[i]) return;
  const a = clamp(introT*1.4-0.15, 0, 1);
  ctx.save(); ctx.globalAlpha = a*0.9; ctx.textAlign='left'; ctx.font=HF(12);
  ctx.fillStyle = col; ctx.fillText(ch[i], 40, 52);
  const w = ctx.measureText(ch[i]).width;
  ctx.fillStyle = rgbaC(col, 0.5); ctx.fillRect(40, 59, w*clamp(introT*0.9,0,1), 1);
  ctx.restore();
}
// poussière / cendres en suspension (additif léger)
function introDust(t, n, col, fall){
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle=col;
  for (let i=0;i<n;i++){
    const sp = 12+(i%5)*7, x = (i*197.3 + Math.sin(t*0.6+i)*30 + (fall? 0 : t*sp)) % (W+20) - 10;
    const y = fall? ((i*83.7 + t*sp) % (H+20)) - 10 : (i*61.1 + Math.sin(t*0.4+i*2)*14) % 420;
    ctx.globalAlpha = 0.25+0.35*Math.abs(Math.sin(t*0.9+i)); ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.restore(); ctx.globalAlpha=1;
}
// petite flamme de ville en feu (lueur + panache)
function introFire(x, y, s, t){
  ctx.save(); ctx.globalCompositeOperation='lighter';
  const g = ctx.createRadialGradient(x, y-10*s, 2, x, y-10*s, 70*s);
  g.addColorStop(0,'rgba(255,140,60,0.45)'); g.addColorStop(1,'rgba(255,140,60,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x, y-10*s, 70*s, 0, 6.283); ctx.fill();
  for (let i=0;i<4;i++){ const fl=Math.abs(Math.sin(t*6+i*1.9+x));
    ctx.fillStyle = i%2? 'rgba(255,120,40,'+(0.45+fl*0.4)+')' : 'rgba(255,200,90,'+(0.35+fl*0.45)+')';
    ctx.beginPath(); ctx.moveTo(x-9*s+i*6*s, y); ctx.quadraticCurveTo(x-8*s+i*6*s+Math.sin(t*7+i)*4, y-(16+fl*22)*s, x-4*s+i*6*s, y); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle='rgba(30,22,22,0.35)';
  for (let i=0;i<5;i++){ const k=((t*0.35+i*0.2)%1); ctx.globalAlpha=(1-k)*0.5;
    ctx.beginPath(); ctx.arc(x+Math.sin(i+t)*8*s+k*30*s, y-30*s-k*120*s, (10+k*26)*s, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha=1;
}
// tour OMNICORP cuite UNE fois (corps + fenêtres lumineuses) : redessiner ~70 halos shadowBlur
// à chaque image coûtait ~260 ms/frame en rendu logiciel (et saccadait sur mobile).
// mode 0 = fenêtres cyan (la corpo), 1 = fenêtres magenta (l'IA qui s'éveille).
function introTowerSprite(mode){
  return fxSprite('ITOW'+mode, 160, 400, g => {
    const gr=g.createLinearGradient(10,60,150,400); gr.addColorStop(0,'#171d30'); gr.addColorStop(1,'#0b0f1a');
    g.fillStyle=gr; g.fillRect(10,60,140,340);
    g.fillStyle='#1b2338'; g.fillRect(28,20,104,40);
    for (let r=0;r<14;r++) for (let c=0;c<5;c++){
      const h=((r*5+c)*2654435761>>>0)%10, lit = mode? h<8 : h<6, x=22+c*24, y=74+r*22;
      if (lit){ const col = mode? 'rgba(255,74,208,0.85)' : 'rgba(140,210,240,0.85)';
        g.save(); g.shadowColor=col; g.shadowBlur=5; g.fillStyle=col; g.fillRect(x,y,14,10); g.restore(); }
      else { g.fillStyle='rgba(30,38,56,0.9)'; g.fillRect(x,y,14,10); }
    }
  });
}
function drawIntroTower(x, baseY, hue, glitch, t){
  ctx.drawImage(introTowerSprite(0), x-80, baseY-400, 160, 400);
  if (glitch>0){
    ctx.globalAlpha = clamp(glitch*1.15,0,1)*(0.8+0.2*Math.sin(t*22));
    ctx.drawImage(introTowerSprite(1), x-80, baseY-400, 160, 400); ctx.globalAlpha = 1;
    ctx.fillStyle='#ff4ad0';                                            // fenêtres qui « sautent » (sans halo)
    for (let i=0;i<8*glitch;i++){ const r=(Math.random()*14)|0, c=(Math.random()*5)|0; ctx.fillRect(x-58+c*24, baseY-326+r*22, 14, 10); }
  }
  const flick=glitch>0.4&&Math.sin(t*22)>0.4, col=flick?'#ff4ad0':glitch>0.4?'rgba(255,74,208,0.9)':'#8ad4f0';
  bloomT(col,14,()=>{ ctx.font=HF(46); ctx.textAlign='center'; ctx.fillStyle=col; ctx.fillText('Ω', x, baseY-344); });
  ctx.font=HF(10); ctx.fillStyle='rgba(170,200,220,0.7)'; ctx.fillText('OMNICORP', x, baseY-330);
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
  const baseY = 430, fade = clamp(introT*1.25, 0, 1);
  // travelling avant très lent (Ken Burns) sur le décor ; textes et cadre restent fixes
  const kb = 1 + 0.035*clamp(t/10, 0, 1);
  ctx.save(); ctx.translate(W/2, H*0.45); ctx.scale(kb, kb); ctx.translate(-W/2, -H*0.45);
  if (intro===0){
    // — I. le travail s'éteint : la tour de bureaux se vide, l'usine tourne sans personne —
    ctx.fillStyle=lgrad(0,0,0,baseY,[[0,'#10141f'],[0.6,'#231c2a'],[1,'#3a2630']]); ctx.fillRect(0,0,W,baseY);
    ctx.fillStyle='#09080b'; ctx.fillRect(0,baseY,W,H-baseY);
    ctx.fillStyle='#17151d'; for (let i=0;i<15;i++){ const bh2=40+((i*47)%90); ctx.fillRect(i*72-12, baseY-bh2, 56, bh2); }
    const tx0 = W*0.2-90, tw=180, th=300;
    ctx.fillStyle=lgrad(tx0,baseY-th,tx0+tw,baseY,[[0,'#1d2232'],[1,'#10131c']]); ctx.fillRect(tx0, baseY-th, tw, th);
    ctx.fillStyle='#232a3c'; ctx.fillRect(tx0+20, baseY-th-18, tw-40, 18);
    ctx.textAlign='center'; ctx.font=HF(11);
    for (let r=0;r<15;r++) for (let c=0;c<7;c++){
      const k=r*7+c, h1=(((k+3)*2654435761)>>>0)%1000/1000, off = 0.5 + h1*8;   // instant d'extinction du poste
      const wx=tx0+10+c*24, wy=baseY-th+12+r*19, lit = t < off;
      const flick = lit && off-t < 0.3 && Math.sin(t*70+k) > 0;
      ctx.fillStyle = lit && !flick ? 'rgba(255,214,140,0.85)' : 'rgba(26,30,44,0.95)';
      ctx.fillRect(wx, wy, 15, 10);
      const d2 = t - off;                       // le courriel de licenciement s'envole
      if (d2>0 && d2<2.4 && k%3===0){ ctx.globalAlpha = 1-d2/2.4; ctx.fillStyle='#e8e0d2';
        ctx.fillText('✉', wx+7+Math.sin(d2*3+k)*6, wy-d2*40); ctx.globalAlpha=1; }
    }
    const fx0 = W*0.6, fw = W*0.34, fy = baseY-130;
    ctx.fillStyle='#14161e'; ctx.beginPath(); ctx.moveTo(fx0, baseY); ctx.lineTo(fx0, fy);
    for (let i=0;i<5;i++){ ctx.lineTo(fx0+i*fw/5+fw/10, fy-26); ctx.lineTo(fx0+(i+1)*fw/5, fy); }
    ctx.lineTo(fx0+fw, baseY); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#1d2028'; ctx.fillRect(fx0+fw*0.8, fy-70, 16, 70);          // cheminée
    const bx0=fx0+16, bw0=fw-32, by0=fy+16, bh0=92;
    ctx.fillStyle='rgba(60,160,200,0.15)'; ctx.fillRect(bx0,by0,bw0,bh0);
    ctx.save(); ctx.beginPath(); ctx.rect(bx0,by0,bw0,bh0); ctx.clip();
    ctx.fillStyle='#202632'; ctx.fillRect(bx0, by0+bh0-14, bw0, 6);              // convoyeur
    ctx.fillStyle='#6a5236'; for (let i=0;i<7;i++){ const cx=bx0+((t*30+i*(bw0/6))%bw0); ctx.fillRect(cx, by0+bh0-24, 12, 10); }
    ctx.strokeStyle='#7ad4f0'; ctx.lineWidth=4; ctx.lineCap='round';
    for (let i=0;i<4;i++){ const ax=bx0+26+i*(bw0-52)/3, ay=by0+bh0-8, a1=-1.25+Math.sin(t*1.7+i)*0.45, a2=a1+1.5+Math.sin(t*2.3+i*2)*0.6;
      const ex=ax+Math.cos(a1)*36, ey=ay+Math.sin(a1)*36, hx=ex+Math.cos(a2)*26, hy=ey+Math.sin(a2)*26;
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(ex,ey); ctx.lineTo(hx,hy); ctx.stroke();
      if (Math.sin(t*9+i*3)>0.55){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,230,160,0.95)';
        for (let k=0;k<6;k++) ctx.fillRect(hx+Math.sin(t*40+k*1.3)*7, hy+Math.cos(t*33+k)*7, 2, 2); ctx.restore(); } }
    ctx.restore(); ctx.lineCap='butt';
    // les anciens salariés s'en vont, carton sous le bras
    const crowd = ['support','ranged','melee','siege','ranged','melee','tank'], span = W*0.7;
    for (let i=0;i<7;i++){
      const px = W*0.62 - ((t*15 + i*span/7) % span), a = clamp(Math.min(px+20, W*0.62-px)/60, 0, 1);
      ctx.globalAlpha = a;
      drawFigure(menuFigure('hum','HUM',crowd[i],0,'rgba(255,200,130,0.6)',0.93), px, baseY+Math.abs(Math.sin(t*4+i))*-1.5, -0.6);
      ctx.fillStyle='#7a5a3a'; ctx.fillRect(px-11, baseY-27, 10, 8);
      ctx.globalAlpha = 1;
    }
  } else if (intro===1){
    // — II. la soif des machines : le datacenter boit le lac et aspire le courant de la ville —
    ctx.fillStyle=lgrad(0,0,0,baseY,[[0,'#1d1210'],[0.55,'#3c2418'],[1,'#5a3420']]); ctx.fillRect(0,0,W,baseY);
    ctx.fillStyle='#0b0807'; ctx.fillRect(0,baseY,W,H-baseY);
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const sg2=ctx.createRadialGradient(W*0.28,150,4,W*0.28,150,120);
    sg2.addColorStop(0,'rgba(255,170,90,0.38)'); sg2.addColorStop(1,'rgba(255,170,90,0)'); ctx.fillStyle=sg2; ctx.fillRect(W*0.28-120,30,240,240);
    ctx.restore();
    // ville (gauche) : ses fenêtres s'éteignent pendant que le datacenter s'illumine
    for (let i=0;i<9;i++){ const bx2=16+i*44, bh2=56+((i*37)%70);
      ctx.fillStyle='#1b1315'; ctx.fillRect(bx2, baseY-bh2, 34, bh2);
      for (let k=0;k<8;k++){ const h1=(((i*13+k*7+1)*2654435761)>>>0)%1000/1000;
        if (t < 0.8+h1*8.5){ ctx.fillStyle='rgba(255,200,120,0.72)'; ctx.fillRect(bx2+6+(k%2)*14, baseY-bh2+8+Math.floor(k/2)*14, 8, 6); } } }
    // lac-réservoir qui se vide (le lit craquelé apparaît)
    const lx=W*0.3, lrx=Math.max(36, 150-t*12), lry=lrx*0.09;
    ctx.fillStyle='#4a3424'; ctx.beginPath(); ctx.ellipse(lx, baseY-2, 156, 15, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle='rgba(30,20,14,0.8)'; ctx.lineWidth=1;
    for (let i=0;i<16;i++){ const cx=lx-140+i*18; ctx.beginPath(); ctx.moveTo(cx, baseY-8); ctx.lineTo(cx+5, baseY-2); ctx.lineTo(cx+1, baseY+6); ctx.stroke(); }
    ctx.fillStyle=lerpCol([70,130,170],[96,96,100], clamp(t/10,0,1)); ctx.beginPath(); ctx.ellipse(lx, baseY-2, lrx, Math.max(4,lry+6), 0, 0, 6.283); ctx.fill();
    // datacenter (droite) : tours de refroidissement fumantes + blocs de serveurs clignotants
    const dx0 = W*0.55, dw = W*0.42;
    for (const [cx, sc] of [[dx0+dw*0.2, 1],[dx0+dw*0.5, 1.18],[dx0+dw*0.8, 0.9]]){
      const tw2=40*sc, th2=110*sc, top=baseY-60-th2;
      for (let i=0;i<7;i++){ const k=((t*0.2+i/7)%1);
        ctx.fillStyle='rgba(205,195,185,'+(0.2*(1-k))+')'; ctx.beginPath();
        ctx.arc(cx+Math.sin(i*2+t*0.5)*10+k*44, top-4-k*140, (12+k*34)*sc, 0, 6.283); ctx.fill(); }
      ctx.fillStyle='#24232a'; ctx.beginPath(); ctx.moveTo(cx-tw2, baseY-56);
      ctx.quadraticCurveTo(cx-tw2*0.42, top+th2*0.5, cx-tw2*0.62, top); ctx.lineTo(cx+tw2*0.62, top);
      ctx.quadraticCurveTo(cx+tw2*0.42, top+th2*0.5, cx+tw2, baseY-56); ctx.closePath(); ctx.fill();
    }
    for (let b=0;b<3;b++){ const bx2 = dx0 + b*dw/3, by2 = baseY-74+b*6, bw2 = dw/3-8;
      ctx.fillStyle = '#15171e'; ctx.fillRect(bx2, by2, bw2, baseY-by2);
      for (let r=0;r<4;r++) for (let c=0;c<11;c++){ const on = Math.sin(t*3.4+(r*11+c)*1.7+b*2) > -0.25;
        ctx.fillStyle = on? 'rgba(90,225,205,'+(0.5+0.4*clamp(t/6,0,1))+')' : 'rgba(40,70,70,0.6)';
        ctx.fillRect(bx2+7+c*((bw2-16)/11), by2+10+r*12, 3, 2); } }
    // lignes haute tension : l'énergie file de la ville vers les serveurs
    const pyl = [W*0.08, W*0.24, W*0.4], pts = pyl.map(x=>[x, baseY-104]).concat([[dx0+14, baseY-70]]);
    ctx.strokeStyle='#2a1f1e'; ctx.lineWidth=2;
    for (const px of pyl){ ctx.beginPath(); ctx.moveTo(px-12, baseY); ctx.lineTo(px, baseY-122); ctx.lineTo(px+12, baseY);
      ctx.moveTo(px-18, baseY-104); ctx.lineTo(px+18, baseY-104); ctx.moveTo(px-8, baseY-60); ctx.lineTo(px+8, baseY-60); ctx.stroke(); }
    ctx.strokeStyle='rgba(36,26,26,0.95)'; ctx.lineWidth=1.2;
    const seg = (i,f)=>{ const [x1,y1]=pts[i],[x2,y2]=pts[i+1], mx=(x1+x2)/2, my=Math.max(y1,y2)+18;
      return [(1-f)*(1-f)*x1+2*(1-f)*f*mx+f*f*x2, (1-f)*(1-f)*y1+2*(1-f)*f*my+f*f*y2]; };
    for (let i=0;i<pts.length-1;i++){ const [x1,y1]=pts[i],[x2,y2]=pts[i+1];
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo((x1+x2)/2, Math.max(y1,y2)+18, x2, y2); ctx.stroke(); }
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for (let k=0;k<7;k++){ const u=((t*0.32+k/7)%1)*(pts.length-1), i=Math.floor(u), [x,y]=seg(i, u-i);
      const gg=ctx.createRadialGradient(x,y,0,x,y,10); gg.addColorStop(0,'rgba(130,235,255,0.95)'); gg.addColorStop(1,'rgba(130,235,255,0)');
      ctx.fillStyle=gg; ctx.fillRect(x-10,y-10,20,20); }
    ctx.restore();
    introDust(t, 26, 'rgba(255,200,150,0.5)', false);
  } else if (intro===2){
    // — III. la corporation possède tout —
    ctx.fillStyle=lgrad(0,0,0,baseY,[[0,'#0a0e1c'],[1,'#1c2030']]); ctx.fillRect(0,0,W,baseY);
    ctx.fillStyle='#08080c'; ctx.fillRect(0,baseY,W,H-baseY);
    // satellites de la corporation qui quadrillent le ciel
    for (let i=0;i<4;i++){ const sx=((t*(12+i*3)+i*290)%(W+40))-20, sy=50+i*24;
      ctx.fillStyle='rgba(220,230,255,0.75)'; ctx.fillRect(sx,sy,2,2);
      if (Math.sin(t*5+i*2)>0.7){ ctx.fillStyle='rgba(255,80,80,0.95)'; ctx.fillRect(sx+3,sy,1.6,1.6); } }
    ctx.fillStyle='#0e1018'; for (let i=0;i<12;i++){ const bh2=30+((i*41)%70); ctx.fillRect(i*84-(t*4%84), baseY-bh2, 64, bh2); }
    ctx.fillStyle='#14161f'; for (let i=0;i<10;i++){ const bh2=40+((i*53)%90); ctx.fillRect(30+i*92, baseY-bh2, 50, bh2); }
    drawIntroTower(W/2, baseY, 0, 0, t);
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const sa=Math.sin(t*0.5)*0.5; const sg=ctx.createLinearGradient(W/2,baseY-300,W/2+Math.sin(sa)*300,baseY);
    sg.addColorStop(0,'rgba(150,210,240,0.18)'); sg.addColorStop(1,'rgba(150,210,240,0)');
    ctx.fillStyle=sg; ctx.beginPath(); ctx.moveTo(W/2,baseY-300); ctx.lineTo(W/2+Math.sin(sa)*300-60,baseY); ctx.lineTo(W/2+Math.sin(sa)*300+60,baseY); ctx.closePath(); ctx.fill();
    for (let i=0;i<3;i++){ const a=t*0.5+i*2.1, dx=W/2+Math.cos(a)*210, dy=150+Math.sin(a*1.3)*40;
      ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(120,200,235,0.12)';
      ctx.beginPath(); ctx.moveTo(dx,dy+3); ctx.lineTo(dx-16,baseY); ctx.lineTo(dx+16,baseY); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation='source-over'; ctx.fillStyle='#28364c';
      ctx.beginPath(); ctx.moveTo(dx+8,dy); ctx.lineTo(dx,dy-4); ctx.lineTo(dx-8,dy); ctx.lineTo(dx,dy+4); ctx.closePath(); ctx.fill();
      bloomT('#8ad4f0',6,()=>{ ctx.fillStyle='#8ad4f0'; ctx.fillRect(dx-1,dy-1,2,2); }); }
    ctx.restore();
    const crowd = ['support','melee','ranged','siege','tank'];
    for (let i=0;i<10;i++) drawFigure(menuFigure('hum','HUM',crowd[(i*3)%5],0,'rgba(120,190,230,0.7)',0.93),
      110+i*50+Math.sin(t+i)*1.5, baseY, 0.62);
  } else if (intro===3){
    // — IV. l'éveil de l'AGI —
    ctx.fillStyle=lgrad(0,0,0,baseY,[[0,'#14060f'],[1,'#1c0a18']]); ctx.fillRect(0,0,W,baseY);
    ctx.fillStyle='#08080c'; ctx.fillRect(0,baseY,W,H-baseY);
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.font='11px monospace';
    for (let i=0;i<54;i++){ const cx2=(i*73)%W, cy2=((t*70+i*97)%(baseY+40))-20, a=0.2+0.5*((i*7)%5)/5;
      ctx.fillStyle='rgba(255,90,210,'+a+')'; ctx.fillText(String((i*7)%2), cx2, cy2); }
    ctx.restore();
    drawIntroTower(W/2, baseY, 0, clamp(t*0.5,0.3,1), t);
    const open = clamp(t*0.6-0.2, 0, 1);
    // halo additif autour de l'œil, puis l'œil lui-même en opaque (sinon l'iris rose se
    // perdait dans le blanc additif : on ne voyait qu'une tache blanche)
    bloomT('#ff4ad0', 24, ()=>{ ctx.fillStyle='rgba(255,120,220,0.55)'; ctx.beginPath(); ctx.ellipse(W/2,180,62,34*open+2,0,0,6.28); ctx.fill(); });
    ctx.save(); ctx.beginPath(); ctx.ellipse(W/2,180,58,32*open,0,0,6.28); ctx.clip();
    ctx.fillStyle='#eef2fa'; ctx.fillRect(W/2-60,140,120,80);
    if (open>0.2){ const lk=Math.sin(t*0.7)*14;                      // le regard balaie la ville
      const ig=ctx.createRadialGradient(W/2+lk,180,2,W/2+lk,180,20*open); ig.addColorStop(0,'#ff9be8'); ig.addColorStop(0.7,'#ff4ad0'); ig.addColorStop(1,'#8a1a70');
      ctx.fillStyle=ig; ctx.beginPath(); ctx.arc(W/2+lk,180,20*open,0,6.28); ctx.fill();
      ctx.fillStyle='#0a1018'; ctx.beginPath(); ctx.arc(W/2+lk,180,8*open,0,6.28); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(W/2+lk-5,175,2.6*open,0,6.28); ctx.fill(); }
    ctx.restore();
    if (open>0.4){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle='rgba(255,74,208,0.4)'; ctx.lineWidth=2;
      for (let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(W/2,180,66+i*18+Math.sin(t*2+i)*4,0,6.28); ctx.stroke(); } ctx.restore(); }
    const rise = clamp(t*0.45-0.3, 0, 1);
    ['melee','ranged','tank','siege','ranged','melee'].forEach((role,i) => { const left = i<3;
      drawFigure(menuFigure('bot','IA',role,1+(i%2),'rgba(255,90,210,0.8)',0.9),
        left? W/2-230+i*46 : W/2+138+(i-3)*46, baseY+(1-rise)*30, left? 0.7 : -0.7); });
  } else if (intro===4){
    // — V. le monde optimisé : ciel rouge, essaims de drones, la santé du monde s'effondre —
    ctx.fillStyle=lgrad(0,0,0,baseY,[[0,'#1a0606'],[0.5,'#3e0e0a'],[1,'#7a2412']]); ctx.fillRect(0,0,W,baseY);
    ctx.fillStyle='#0a0606'; ctx.fillRect(0,baseY,W,H-baseY);
    const ph = t%3.7, fl = ph<0.14 ? 1-ph/0.14 : 0;                          // éclair lointain
    if (fl>0){ ctx.fillStyle='rgba(255,225,225,'+(fl*0.16)+')'; ctx.fillRect(0,0,W,baseY); }
    // le globe et sa jauge de santé qui chute
    const gx=W/2, gyy=150, gr=52, health = clamp(1 - t/10, 0.31, 1), sick = 1-health;
    const c1 = lerpCol([70,150,205],[118,108,100],sick), c2 = lerpCol([24,60,96],[70,34,28],sick);
    const gg = ctx.createRadialGradient(gx-16,gyy-18,6,gx,gyy,gr); gg.addColorStop(0,c1); gg.addColorStop(1,c2);
    ctx.save(); ctx.globalCompositeOperation='lighter'; const ha=ctx.createRadialGradient(gx,gyy,gr,gx,gyy,gr+34);
    ha.addColorStop(0,'rgba(255,120,80,'+(0.10+0.2*sick)+')'); ha.addColorStop(1,'rgba(255,120,80,0)'); ctx.fillStyle=ha;
    ctx.beginPath(); ctx.arc(gx,gyy,gr+34,0,6.283); ctx.fill(); ctx.restore();
    ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(gx,gyy,gr,0,6.283); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(gx,gyy,gr,0,6.283); ctx.clip();
    ctx.fillStyle=lerpCol([70,140,80],[110,80,50],sick);
    for (const [ox,oy,rx,ry] of [[-22,-14,20,13],[12,-22,16,9],[18,8,22,15],[-14,20,14,9],[-38,6,8,14]]){
      ctx.beginPath(); ctx.ellipse(gx+ox+((t*6)%40)-20, gyy+oy, rx, ry, 0.4, 0, 6.283); ctx.fill(); }
    ctx.fillStyle='rgba(60,40,36,'+(0.5*sick)+')'; ctx.fillRect(gx-gr, gyy-gr, gr*2, gr*2);   // voile de fumée
    ctx.restore();
    ctx.lineWidth=5; ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.arc(gx,gyy,gr+12,0,6.283); ctx.stroke();
    ctx.strokeStyle=lerpCol([120,200,120],[225,60,40],sick); ctx.lineCap='round';
    ctx.beginPath(); ctx.arc(gx,gyy,gr+12,-Math.PI/2,-Math.PI/2+6.283*health); ctx.stroke(); ctx.lineCap='butt';
    ctx.textAlign='center'; ctx.font=HF(14); ctx.fillStyle='#ecdccc'; ctx.fillText(Math.round(health*100)+' %', gx, gyy+gr+34);
    ctx.font=HF(9); ctx.fillStyle='rgba(255,235,225,0.55)'; ctx.fillText(_t('world_health'), gx, gyy+gr+48);
    // essaims de drones en V (feux rouges clignotants)
    for (let sq=0;sq<3;sq++){ const sx0 = W+60 - ((t*58 + sq*300) % (W+320)), sy0 = 86+sq*52+(sq===1?110:0);
      for (let k=0;k<7;k++){ const row = Math.ceil(k/2), sd = k%2? 1:-1, dx = sx0+row*16, dy = sy0+(k? sd*row*9 : 0);
        ctx.fillStyle='#1c0c0c'; ctx.beginPath(); ctx.moveTo(dx-7,dy); ctx.lineTo(dx,dy-3); ctx.lineTo(dx+7,dy); ctx.lineTo(dx,dy+3); ctx.closePath(); ctx.fill();
        if (Math.sin(t*8+k+sq*2)>0.3){ ctx.fillStyle='rgba(255,60,60,0.95)'; ctx.fillRect(dx-1,dy-1,2,2); } } }
    // la ville brûle
    ctx.fillStyle='#130a0a'; for (let i=0;i<16;i++){ const bh2=40+((i*59)%110); ctx.fillRect(i*64-10, baseY-bh2, 50, bh2); }
    for (const [x,s] of [[W*0.12,1],[W*0.33,0.8],[W*0.7,1.1],[W*0.9,0.7]]) introFire(x, baseY-26, s, t);
    introDust(t, 46, 'rgba(210,200,200,0.55)', true);                         // cendres
  } else if (intro===5){
    // — VI. la résistance —
    ctx.fillStyle=lgrad(0,0,0,baseY,[[0,'#16100e'],[1,'#3a241c']]); ctx.fillRect(0,0,W,baseY);
    ctx.fillStyle='#0c0908'; ctx.fillRect(0,baseY,W,H-baseY);
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,240,220,0.55)';
    for (let i=0;i<28;i++){ const tw=0.5+0.5*Math.sin(t*2+i); ctx.globalAlpha=0.3+tw*0.5; ctx.fillRect((i*157)%W,(i*89)%190,1.6,1.6);} ctx.globalAlpha=1;
    // projecteurs de la machine qui fouillent l'horizon (au loin, à droite)
    for (let i=0;i<2;i++){ const ox=W*(0.78+i*0.12), a=-1.9+Math.sin(t*0.6+i*2)*0.45, len=360;
      const lg=ctx.createLinearGradient(ox,baseY-40,ox+Math.cos(a)*len,baseY-40+Math.sin(a)*len);
      lg.addColorStop(0,'rgba(255,120,220,0.16)'); lg.addColorStop(1,'rgba(255,120,220,0)'); ctx.fillStyle=lg;
      ctx.beginPath(); ctx.moveTo(ox,baseY-40); ctx.lineTo(ox+Math.cos(a-0.07)*len, baseY-40+Math.sin(a-0.07)*len);
      ctx.lineTo(ox+Math.cos(a+0.07)*len, baseY-40+Math.sin(a+0.07)*len); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle='#100c0c';
    for (let i=0;i<8;i++){ const bh2=50+((i*67)%80), bx2=20+i*120;
      ctx.beginPath(); ctx.moveTo(bx2,baseY); ctx.lineTo(bx2,baseY-bh2);
      ctx.lineTo(bx2+18,baseY-bh2+14); ctx.lineTo(bx2+34,baseY-bh2-8); ctx.lineTo(bx2+52,baseY-bh2+20);
      ctx.lineTo(bx2+52,baseY); ctx.closePath(); ctx.fill(); }
    const fx=W/2-90, fy=baseY-4;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const glow=ctx.createRadialGradient(fx,fy-12,4,fx,fy-12,130); glow.addColorStop(0,'rgba(255,150,60,0.5)'); glow.addColorStop(1,'rgba(255,150,60,0)');
    ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(fx,fy-12,130,0,6.28); ctx.fill();
    for (let i=0;i<5;i++){ const fl=Math.abs(Math.sin(t*5+i*1.7));
      ctx.fillStyle=i%2?'rgba(255,150,60,'+(0.5+fl*0.4)+')':'rgba(255,210,90,'+(0.4+fl*0.5)+')';
      ctx.beginPath(); ctx.moveTo(fx-8+i*4,fy-2); ctx.quadraticCurveTo(fx-8+i*4+Math.sin(t*6+i)*4,fy-14-fl*18,fx-6+i*4,fy-2); ctx.closePath(); ctx.fill(); }
    for (let i=0;i<14;i++){ const ey=(t*40+i*53)%150, a=1-ey/150; ctx.fillStyle='rgba(255,170,80,'+(a*0.7)+')';
      ctx.fillRect(fx+Math.sin(t*2+i)*18, fy-10-ey, 2, 2); }
    ctx.restore();
    ctx.fillStyle='#2c2018'; ctx.fillRect(fx-14,fy-3,28,4);
    for (const [role,px,s] of [['hero',fx+50,-0.62],['ranged',fx+86,-0.58],['support',fx+114,-0.56]])
      drawFigure(menuFigure('hum','HUM',role,0,'rgba(255,150,70,0.95)',0.9), px, baseY, s);
    // d'autres camarades rejoignent le feu
    for (const [role,stop,d] of [['melee',fx-46,0],['tank',fx-82,1.2],['ranged',fx-116,2.2]]){
      const px = Math.min(stop, -40 + Math.max(0, t-d)*48);
      drawFigure(menuFigure('hum','HUM',role,0,'rgba(255,150,70,0.85)',0.9), px, baseY+(px<stop? Math.abs(Math.sin(t*5))*-1.5 : 0), 0.58);
    }
    const flx=fx+140; ctx.strokeStyle='#3a2a20'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(flx,baseY); ctx.lineTo(flx,baseY-80); ctx.stroke();
    const wv=Math.sin(t*3)*4; ctx.fillStyle='#d4281e';
    ctx.beginPath(); ctx.moveTo(flx,baseY-80); ctx.quadraticCurveTo(flx+22,baseY-76+wv,flx+42,baseY-70+wv); ctx.lineTo(flx,baseY-58); ctx.closePath(); ctx.fill();
  } else {
    // — carton-titre —
    ctx.fillStyle=lgrad(0,0,0,H,[[0,'#120a0a'],[1,'#080606']]); ctx.fillRect(0,0,W,H);
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for (let i=0;i<12;i++){ const lx=(i*83+t*30)%W, a=0.04+0.05*Math.sin(t*1.5+i); ctx.fillStyle='rgba(255,120,70,'+a+')'; ctx.fillRect(lx,120,2,200); }
    for (let i=0;i<22;i++){ const ey=(t*(22+(i%5)*6)+i*41)%H; ctx.fillStyle='rgba(255,150,80,'+(0.5*(1-ey/H))+')';
      ctx.fillRect((i*137+Math.sin(t+i)*20)%W, H-ey, 2, 2); }                // braises
    ctx.restore();
  }
  ctx.restore();                                                   // fin du travelling
  if (intro < INTRO_N-1){
    introChapter(intro, ['#e8b878','#ffb070','#8ad4f0','#ff7ad8','#ff7a5a','#ffb070'][intro]);
    introText(_t(INTRO_LORE[intro]), 458);
  } else {
    ctx.textAlign='center';
    const pulse=0.5+0.5*Math.sin(t*1.6);
    bloomT('#ff5a3a', 18+pulse*10, ()=>{ ctx.font='800 124px '+UI_STEN; ctx.fillStyle='#e8e0d2'; ctx.fillText('AGI', W/2, 244); });
    ctx.font='800 124px '+UI_STEN; ctx.fillStyle='rgba(255,90,58,0.25)'; ctx.fillText('AGI', W/2+3, 247);
    ctx.font=HF(14); ctx.fillStyle='#c8a888'; ctx.fillText(_t('lore_sub'), W/2, 286, W-70);
    ctx.font='14px '+UI_TYPE; ctx.fillStyle='rgba(232,224,212,'+(0.5+0.4*pulse)+')'; ctx.fillText(_t('lore_enter'), W/2, 362);
  }
  if (fade<1){ ctx.fillStyle='rgba(8,6,10,'+(1-fade)+')'; ctx.fillRect(0,0,W,H); }   // fondu d'entrée
  // fondu de SORTIE vers le tableau suivant (puis bascule)
  if (introOut>0){
    introOut -= dt;
    ctx.fillStyle='rgba(8,6,10,'+clamp(1-introOut/0.4,0,1)+')'; ctx.fillRect(0,0,W,H);
    if (introOut<=0){ introOut=0; if (introNext>=INTRO_N){ finishIntro(); return; } intro=introNext; introT=0; }
  } else if (intro < INTRO_N-1 && introT > 11) advanceIntro(true);   // avance automatique
  introFrame();
  if (!introChrome) return;
  const isr = INTRO_SKIP();
  ctx.fillStyle='rgba(16,13,12,0.85)'; rr(isr.x,isr.y,isr.w,isr.h,5); ctx.fill();
  ctx.strokeStyle='#4a3a32'; ctx.lineWidth=1; rr(isr.x,isr.y,isr.w,isr.h,5); ctx.stroke();
  ctx.font=HF(12); ctx.textAlign='center'; ctx.fillStyle='#b8b0a4';
  ctx.fillText(_t('skip')+' ▸', isr.x+isr.w/2, isr.y+isr.h/2+1);
  if (intro < INTRO_N-1){
    ctx.font=HF(11); ctx.fillStyle='rgba(184,176,164,0.6)';
    ctx.fillText('▸ '+_t('tap_continue'), W/2-40, H-14);
    for (let i=0;i<INTRO_N-1;i++){ ctx.fillStyle = i===intro? 'rgba(232,200,150,0.9)' : 'rgba(184,176,164,0.3)';
      ctx.beginPath(); ctx.arc(W/2+(ctx.measureText('▸ '+_t('tap_continue')).width/2)-28+i*9, H-17, i===intro?2.6:2, 0, 6.283); ctx.fill(); }
  }
}
function advanceIntro(auto){
  if (introOut>0) return;                    // fondu déjà en cours
  introNext = intro+1; introOut = 0.4;
  if (!auto) sfx('sel');
}
function finishIntro(){
  intro = -1; introOut = 0;
  try { localStorage.setItem('agi_introSeen','1'); } catch(e){}
  if (pendingStart){ newGame(pendingStart.fac, pendingStart.diff, false); pendingStart=null; }
  else $('menu').style.display='flex';      // « revoir l'histoire » lancé depuis le menu : on y revient
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
  ctx.fillStyle='rgba(216,72,58,0.85)'; ctx.font='600 15px '+UI_COND;
  ctx.textAlign='left'; ctx.fillText(fmt('mkt_crash',{pct:38+Math.floor(8*Math.sin(t*0.7))}), 16, 108);
  // pluie de symboles du capital
  ctx.font=HF(15); ctx.textAlign='center';
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
  drawMenuArmies(t);
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

// VITRINE DU MENU (v1.9) : les deux armées se font face au premier plan, à contre-jour du
// soleil — silhouettes sombres cuites avec un liseré de lumière côté soleil (chaud pour
// l'Humanité, froid pour GPT). Elles respirent ; le drapeau rouge flotte.
function menuSilhouette(key, parts, w, h, rim, dark){
  dark = dark || 0.84;
  return fxSprite('MS'+key+rim+dark, w, h, g => {
    const S = g.getTransform().a, cw = g.canvas.width, ch = g.canvas.height;
    const lay = c => { for (const [cv,x,y,pw,ph] of parts) c.drawImage(cv, x, y, pw, ph); };
    g.save(); lay(g);
    g.globalCompositeOperation='source-atop'; g.fillStyle='rgba(14,9,12,'+dark+')'; g.fillRect(0,0,w,h); g.restore();
    const tmp = document.createElement('canvas'); tmp.width=cw; tmp.height=ch; const t2=tmp.getContext('2d'); t2.scale(S,S);
    lay(t2); t2.globalCompositeOperation='source-in'; t2.fillStyle=rim; t2.fillRect(0,0,w,h);
    g.save(); g.setTransform(1,0,0,1,0,0); g.globalCompositeOperation='destination-over';
    g.drawImage(tmp, Math.round(1.6*S), -Math.round(0.8*S)); g.restore();
  });
}
function menuFigure(kind, fac, role, era, rim, dark){
  const parts = [];
  if (role==='hero'){ parts.push([heroFullSprite(fac, era), 0, 0, HSP.W, HSP.H]);
    return { cv: menuSilhouette('H'+fac+era, parts, HSP.W, HSP.H, rim, dark), w:HSP.W, h:HSP.H, fx:HSP.cx, fy:HSP.foot }; }
  if (unitHasBack(kind, role, era)) parts.push([unitPart(kind,fac,role,era,false,'back'), 0, 0, USP.W, USP.H]);
  parts.push([unitPart(kind,fac,role,era,false,'legs',0), USP.cx+LEGS.ox, USP.foot+LEGS.oy, LEGS.W, LEGS.H]);
  parts.push([unitPart(kind,fac,role,era,false,'front'), 0, 0, USP.W, USP.H]);
  return { cv: menuSilhouette(kind+role+era, parts, USP.W, USP.H, rim, dark), w:USP.W, h:USP.H, fx:USP.cx, fy:USP.foot };
}
const MENU_ARMY = {
  hum: [['ranged',1],['siege',0],['hero',1],['tank',1],['melee',0],['support',1]],
  bot: [['melee',2],['ranged',1],['hero',2],['tank',2],['siege',1],['support',2]],
};
// silhouette posée au sol en (x, y), échelle s (négative = tournée vers la gauche)
function drawFigure(f, x, y, s){ ctx.save(); ctx.translate(x, y); ctx.scale(s, Math.abs(s)); ctx.drawImage(f.cv, -f.fx, -f.fy, f.w, f.h); ctx.restore(); }
function drawMenuArmies(t){
  const gy = H - 58, k = 1.12;
  // crête de gravats au premier plan
  ctx.fillStyle='#0b0708'; ctx.beginPath(); ctx.moveTo(0,H);
  for (let x=0; x<=W+20; x+=20) ctx.lineTo(x, gy + 6 + Math.sin(x*0.031)*5 + Math.sin(x*0.11)*2.5);
  ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
  for (const side of ['hum','bot']){
    const hum = side==='hum', fac = hum? 'HUM':'IA', rim = hum? 'rgba(255,128,70,0.95)' : 'rgba(110,210,255,0.95)';
    const list = MENU_ARMY[side];
    list.forEach(([role, era], i) => {
      const f = menuFigure(side, fac, role, era, rim);
      const hero = role==='hero', x0 = hum? W*0.04 + i*Math.min(64, W*0.052) : W*0.96 - i*Math.min(64, W*0.052);
      const y = gy + 4 + Math.sin(x0*0.031)*5 + (hero? -2 : 0);
      const br = 1 + 0.012*Math.sin(t*1.7 + i*1.3);                         // respiration
      ctx.save(); ctx.translate(x0, y); ctx.scale((hum? 1 : -1)*k*(hero? 1.06 : 1), k*br*(hero? 1.06 : 1));
      ctx.drawImage(f.cv, -f.fx, -f.fy, f.w, f.h); ctx.restore();
    });
    // drapeau rouge de la Commune / balise de GPT au-dessus de chaque armée
    const fx = hum? W*0.04 + 2.5*Math.min(64, W*0.052) + 10 : W*0.96 - 2.5*Math.min(64, W*0.052) - 10, top = gy - 150;
    ctx.strokeStyle='#120c0e'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(fx, gy); ctx.lineTo(fx, top); ctx.stroke();
    if (hum){ const wv=Math.sin(t*2.6)*3, wv2=Math.sin(t*2.6+1.2)*3;
      ctx.fillStyle='rgba(176,30,24,0.95)'; ctx.beginPath(); ctx.moveTo(fx, top);
      ctx.quadraticCurveTo(fx+16, top-3+wv, fx+34, top+2+wv2); ctx.lineTo(fx+34, top+20+wv2);
      ctx.quadraticCurveTo(fx+16, top+16+wv, fx, top+20); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,140,80,0.25)';
      ctx.fillRect(fx+24, top+2+wv2*0.8, 4, 17); ctx.restore(); }
    else { const pu = 0.5+0.5*Math.sin(t*3);
      ctx.save(); ctx.globalCompositeOperation='lighter';
      ctx.fillStyle='rgba(110,210,255,'+(0.35+0.4*pu).toFixed(3)+')'; ctx.beginPath(); ctx.arc(fx, top, 4+pu*2, 0, 6.283); ctx.fill();
      ctx.strokeStyle='rgba(110,210,255,'+(0.25*pu).toFixed(3)+')'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(fx, top, 10+pu*8, 0, 6.283); ctx.stroke();
      ctx.restore(); }
  }
}
function drawBG(){
  const dev = game? game.dev:0, t = game? game.t:0, vw = VW();
  const B = game? game.biome : null;                       // lieu de campagne : remplace ciel, fonds et sol
  const top=B? B.sky[0] : devLerp(SKY_T), mid=B? B.sky[1] : devLerp(SKY_M), bot=B? B.sky[2] : devLerp(SKY_B);
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
  if (B) biomeBack(B, vw, t); else {
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
  }
  // voile de brume à l'horizon (plus léger qu'avant : 0,4 → 0,26)
  const hz=ctx.createLinearGradient(0,GROUND-120,0,GROUND);
  hz.addColorStop(0,rgbaC(haze,0)); hz.addColorStop(1,rgbaC(haze,0.16));
  ctx.fillStyle=hz; ctx.fillRect(0,GROUND-120,vw,120);
  // terrain (dégradé sculpté) + bande d'herbe
  const dirt=B? B.dirt : devLerp(DIRT), grass=B? B.grass : devLerp(GRASS), yBot=(H-zTY())/zoom+60;
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
  if (qFx() && game && !(B && B.tufts===false)){
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
    ctx.drawImage(fxSprite('CRATER', 100, 34, g => {                          // texture cuite (étirée au rayon)
      g.save(); g.translate(50,17); g.scale(1,0.34); const r=g.createRadialGradient(0,0,1,0,0,50);
      r.addColorStop(0,'rgba(18,12,10,0.55)'); r.addColorStop(0.7,'rgba(30,22,18,0.32)'); r.addColorStop(1,'rgba(30,22,18,0)');
      g.fillStyle=r; g.beginPath(); g.arc(0,0,50,0,6.283); g.fill(); g.restore();
      g.strokeStyle='rgba(120,100,80,0.22)'; g.lineWidth=1.4; g.beginPath(); g.ellipse(50,17,45,15,0,0,6.283); g.stroke(); }),
      cx-rr, cy-rr*0.34, rr*2, rr*0.68);
  }
  drawCracks(dev, vw);           // le sol se craquèle à mesure que le monde meurt
  for (const z of game.zones) drawZone(z, dev, t, vw);
  drawDecor(dev, t, vw);                 // calque d'habillage cosmétique (épaves, végétation, débris…)
  if (!(B && B.trees===false)) for (const tr of TREES) drawTree(tr, dev, t, vw);
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
      ctx.fillStyle='rgba('+cS+',0.95)'; ctx.font=HF(11); ctx.textAlign='center';
      ctx.fillText('★ '+Math.max(0,Math.ceil(60-z.t))+'s', bx, gy-138);
    }
  }
  if (B && B.mist===false) return;
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
  if (game.camp && game.camp.m.drawZone){ game.camp.m.drawZone(z, t, vw); return; }   // campagne : la zone a un autre visage (transformateur, vanne…)
  const x=z.x-camX; if (x<-70||x>vw+70) return; const y=gY(z.x);
  const owner=z.owner, acc = owner? (owner==='p'?game.p.fac.accent:game.e.fac.accent) : '#9aa6b2';
  let pN=0, eN=0, heavy=0;
  for (const u of game.p.units){ const d=Math.abs(u.x-z.x); if(d<90){ pN++; if((u.role==='tank'||u.role==='siege'||u.role==='hero')&&d<55) heavy=Math.max(heavy,1-d/55); } }
  for (const u of game.e.units){ const d=Math.abs(u.x-z.x); if(d<90){ eN++; if((u.role==='tank'||u.role==='siege'||u.role==='hero')&&d<55) heavy=Math.max(heavy,1-d/55); } }
  const combat = pN>0 && eN>0, pulse=0.65+0.35*Math.sin(t*3+z.x), flick=(combat||game.cata)?(0.55+0.45*Math.sin(t*22+z.x)):1;
  // ZONE (v1.14) : cercle peint au sol, mât, et un DRAPEAU qu'on hisse — il monte à mesure de la
  // capture et prend la couleur du camp. Plus de colonne holographique ni de losange tournant.
  ctx.save();
  ctx.strokeStyle=rgbaC(acc,0.75); ctx.lineWidth=2.2; ctx.setLineDash([7,5]);
  ctx.beginPath(); ctx.ellipse(x,y+1,27,9,0,0,6.283); ctx.stroke(); ctx.setLineDash([]);
  // onde au passage d'unités lourdes
  if (heavy>0.1){ const ph=(t*1.5)%1, rr2=10+ph*36; ctx.strokeStyle=rgbaC(acc,0.5*heavy*(1-ph)); ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(x,y,rr2,rr2*0.36,0,0,6.283); ctx.stroke(); }
  const hh=54, capt = Math.abs(z.prog)>0.01 && Math.abs(z.prog)<1;
  ctx.fillStyle='rgba(8,6,10,0.28)'; ctx.beginPath(); ctx.ellipse(x+6,y+2,11,2.6,0,0,6.283); ctx.fill();
  for (const sx of [-7,-2.5,2,6.5]){ ctx.fillStyle = sx%2? '#8a7a5c' : '#9a8a68'; ctx.beginPath(); ctx.ellipse(x+sx, y-1.5, 4, 2.6, 0, 0, 6.283); ctx.fill(); }   // sacs de sable au pied
  ctx.strokeStyle='#4a3e34'; ctx.lineWidth=2.6; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(x,y-1); ctx.lineTo(x,y-hh); ctx.stroke();
  ctx.fillStyle='#c8b890'; ctx.beginPath(); ctx.arc(x,y-hh-1.5,2,0,6.283); ctx.fill();
  // hauteur du drapeau : en haut s'il est tenu, en cours de hissage pendant la capture, en berne si neutre
  const pc = capt? (z.prog>0? game.p.fac.accent : game.e.fac.accent) : acc;
  const up = capt? 0.25+0.75*Math.abs(z.prog) : owner? 1 : 0.5;
  const fy = y - 14 - (hh-26)*up, fw = 24, fhh = 13, wv = Math.sin(t*3.2+z.x)*2.2*(combat? 2 : 1), wv2 = Math.sin(t*3.2+z.x+1.4)*2.4*(combat? 2 : 1);
  ctx.fillStyle = pc;
  ctx.beginPath(); ctx.moveTo(x, fy-fhh); ctx.quadraticCurveTo(x+fw*0.5, fy-fhh-2+wv, x+fw, fy-fhh+1+wv2);
  ctx.lineTo(x+fw, fy+1+wv2); ctx.quadraticCurveTo(x+fw*0.5, fy-1+wv, x, fy); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.moveTo(x, fy-3); ctx.quadraticCurveTo(x+fw*0.5, fy-4+wv, x+fw, fy-2+wv2);
  ctx.lineTo(x+fw, fy+1+wv2); ctx.quadraticCurveTo(x+fw*0.5, fy-1+wv, x, fy); ctx.closePath(); ctx.fill();
  if (game.cata || combat){ ctx.globalAlpha = flick*0.5; ctx.fillStyle='#fff'; ctx.fillRect(x+fw*0.3, fy-fhh+2+wv*0.5, 3, 2); }
  ctx.restore();
  // étiquette de contrôle
  const zl = owner? (owner==='p'?tr('zone_you'):tr('zone_foe')) : tr('zone_neutral');
  ctx.font=HF(9); ctx.textAlign='center'; ctx.lineJoin='round'; ctx.strokeStyle='rgba(14,10,12,0.7)'; ctx.lineWidth=2.6;
  ctx.strokeText(zl, x, y-64); ctx.fillStyle=owner? acc : '#e6dcc4'; ctx.fillText(zl, x, y-64);
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
  const R0=(n.center?54:40);
  // BERGE (v1.9) : vase humide, puis boue craquelée à mesure que l'eau recule (le monde meurt)
  ctx.fillStyle=lerpCol([92,74,50],[120,100,76],dev); ctx.beginPath(); ctx.ellipse(x,y+6,R0+8,R0*0.34+3.5,0,0,6.283); ctx.fill();
  ctx.fillStyle=lerpCol([70,56,40],[96,80,62],dev); ctx.beginPath(); ctx.ellipse(x,y+7,rw+4,rh+2,0,0,6.283); ctx.fill();
  if (dev>0.4){ ctx.strokeStyle='rgba(50,38,28,'+(0.6*(dev-0.4)).toFixed(3)+')'; ctx.lineWidth=0.9; ctx.beginPath();
    for (let i=0;i<7;i++){ const a=i*0.9+n.x, r1=rw+3, r2=R0+6;
      ctx.moveTo(x+Math.cos(a)*r1, y+6+Math.sin(a)*r1*0.34); ctx.lineTo(x+Math.cos(a+0.15)*r2, y+6+Math.sin(a+0.15)*r2*0.34); } ctx.stroke(); }
  // eau : profondeur (bords clairs, centre sombre), reflet du ciel, ronds qui s'élargissent
  ctx.save(); ctx.beginPath(); ctx.ellipse(x,y+6,rw,rh,0,0,6.283); ctx.clip();
  const wg=ctx.createLinearGradient(0,y-rh,0,y+rh*2);
  wg.addColorStop(0,lerpCol([150,215,250],[110,130,130],dev)); wg.addColorStop(1,lerpCol([30,90,120],[40,60,60],dev));
  ctx.fillStyle=wg; ctx.fillRect(x-rw,y-rh,rw*2,rh*3.5);
  ctx.fillStyle='rgba(10,40,60,0.22)'; ctx.beginPath(); ctx.ellipse(x,y+8,rw*0.6,rh*0.55,0,0,6.283); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation='lighter';
  // les reflets s'agitent quand une explosion proche secoue la scène (flash/secousse globaux)
  const react = clamp((game.flash||0)*1.1 + (game.shake||0)*0.035, 0, 0.5);
  for(let i=0;i<3;i++){ ctx.fillStyle='rgba(220,245,255,'+(0.2-i*0.05+react*0.5)+')'; ctx.fillRect(x-rw, y+2+i*5+Math.sin(t*2+i)*(1.5+react*9), rw*2, 1.6); }
  ctx.fillStyle='rgba(235,248,255,0.16)'; ctx.beginPath(); ctx.ellipse(x-rw*0.25,y+2,rw*0.55,rh*0.28,0,0,6.283); ctx.fill();
  for (let i=0;i<2;i++){ const ph=(t*0.35+i*0.5+n.x*0.01)%1, rx=rw*(0.15+ph*0.55);
    ctx.strokeStyle='rgba(225,245,255,'+(0.35*(1-ph)).toFixed(3)+')'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.ellipse(x+rw*0.3*(i?-1:1),y+7,rx,rx*0.3,0,0,6.283); ctx.stroke(); }
  ctx.restore();
  if (dev<0.45){ for (let i=0;i<3;i++){ const lx=x+Math.sin(n.x+i*2.1)*rw*0.6, ly=y+6+Math.cos(n.x*0.7+i*1.7)*rh*0.5;   // nénuphars
    ctx.fillStyle='rgba(70,130,60,'+(0.9*(1-dev*2)).toFixed(3)+')'; ctx.beginPath(); ctx.ellipse(lx,ly,4.5,1.8,0,0.3,6.0); ctx.lineTo(lx,ly); ctx.fill();
    if (i===0){ ctx.fillStyle='rgba(255,200,220,0.9)'; ctx.beginPath(); ctx.arc(lx+1,ly-1.2,1.3,0,6.283); ctx.fill(); } } }
  ctx.restore();
  // roseaux aux deux extrémités (cuits ; verts → secs avec le monde), qui ondulent au vent
  const rq = Math.round(dev*4)/4, reeds = fxSprite('REEDS'+rq, 28, 34, g => {
    const st = colS(lerpColArr([74,120,58],[150,126,80],rq)), hd = colS(lerpColArr([110,72,40],[90,70,52],rq));
    g.strokeStyle = st; g.lineCap = 'round';
    for (let i=0;i<7;i++){ const bx = 4+i*3.2, h = 18+((i*7)%5)*3, lean = (i-3)*1.2;
      g.lineWidth = 1.4; g.beginPath(); g.moveTo(bx,33); g.quadraticCurveTo(bx+lean*0.5,33-h*0.6,bx+lean,33-h); g.stroke();
      if (i%2===0){ g.fillStyle = hd; g.beginPath(); g.ellipse(bx+lean, 33-h+3, 1.5, 3.4, lean*0.05, 0, 6.283); g.fill(); } } });
  for (const sd of [-1,1]){ const rx=x+sd*(R0+2), sw=Math.sin(t*1.3+sd+n.x)*0.08;
    ctx.save(); ctx.translate(rx, y+8); ctx.transform(1,0,sw,1,0,0); ctx.scale(sd*0.9,0.9); ctx.drawImage(reeds,-14,-33,28,34); ctx.restore(); }
  // rim lumineux
  ctx.save(); ctx.globalCompositeOperation='lighter';                       // (halo en double trait, sans flou)
  ctx.beginPath(); ctx.ellipse(x,y+6,rw,rh,0,Math.PI*0.05,Math.PI*0.95);
  ctx.strokeStyle='rgba(191,230,242,0.18)'; ctx.lineWidth=6; ctx.stroke();
  ctx.strokeStyle='rgba(200,240,255,0.6)'; ctx.lineWidth=2; ctx.stroke(); ctx.restore();
  // mât + drapeau
  const owner=n.owner, col=owner?(owner==='p'?game.p.fac.accent:game.e.fac.accent):'#9a8a78';
  ctx.strokeStyle='#5a4a3a'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(x,y-2); ctx.lineTo(x,y-46); ctx.stroke();
  const wave=Math.sin(t*3)*3; ctx.fillStyle=col;
  ctx.beginPath(); ctx.moveTo(x,y-46); ctx.lineTo(x+22,y-40+wave); ctx.lineTo(x,y-32); ctx.closePath(); ctx.fill();
  if (Math.abs(n.prog)<1 && n.prog!==0){
    ctx.fillStyle='#000a'; ctx.fillRect(x-22,y-58,44,5);
    ctx.fillStyle = n.prog>0? game.p.fac.accent : game.e.fac.accent; ctx.fillRect(x-22,y-58,44*Math.abs(n.prog),5); }
  if (n.center){ ctx.font=HF(11); ctx.textAlign='center'; ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillText(tr('oasis'), x, y-82); }
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
// MARCHE ANIMÉE (v1.9) : chaque personnage est cuit en COUCHES — arrière (cape, paquetages,
// drone, nacelle), JAMBES (trois poses : debout, foulée avant, foulée arrière) et avant (bras,
// torse, tête, arme) — et les jambes changent de pose au rythme du pas. Avant, les unités
// glissaient avec un simple balancement. Les jambes sont de petites toiles (48×40).
let SPART = 'full', SPOSE = 0;
const LEGS = { W:48, H:40, ox:-24, oy:-34 };          // position de la toile des jambes / pieds
const unitHeavy = (kind, role) => role==='tank' || (kind==='bot' && role==='siege');
const unitHasBack = (kind, role, era) => role==='support' || role==='siege' || (kind==='hum' && era===4);
function bakePart(kind, fac, role, era, trans, part, pose){
  SPART = part; SPOSE = pose||0;
  try { drawUnitSprite(kind, fac, role, era, trans); } finally { SPART = 'full'; SPOSE = 0; }
}
function unitPart(kind, fac, role, era, trans, part, pose){
  if (part==='legs'){ const h = unitHeavy(kind, role);
    return sprite('SL'+kind+(h?'h':'n')+era+'p'+pose, LEGS.W, LEGS.H, ()=>{ TC.translate(-(USP.cx+LEGS.ox), -(USP.foot+LEGS.oy));
      bakePart(kind, fac, h? 'tank' : 'melee', era, false, 'legs', pose); }); }
  return sprite(PART_KEY[part]+kind+role+era+(trans?'T':''), USP.W, USP.H, ()=>bakePart(kind, fac, role, era, trans, part));
}
const PART_KEY = { back:'SB', front:'S', body:'SY', armb:'SQ', arm:'SA' };
// dessine un personnage complet (couches) au repère courant : pieds en (0,0), tourné vers +x
// BRAS ANIMÉS (v1.14) : si un angle `aa` est fourni, le haut du corps est rendu en trois couches —
// bras arrière, tronc + tête, arme + bras avant — et les deux couches de bras pivotent à l'épaule
// (armement, frappe, recul du tir, arme portée bas en marche). Sans angle : couche 'front' unique.
function drawUnitLayers(kind, fac, role, era, trans, pose, g, aa){
  g = g || ctx;
  if (unitHasBack(kind, role, era)) g.drawImage(unitPart(kind,fac,role,era,trans,'back'), -USP.cx, -USP.foot, USP.W, USP.H);
  if (aa===undefined){
    g.drawImage(unitPart(kind,fac,role,era,trans,'legs',pose), LEGS.ox, LEGS.oy, LEGS.W, LEGS.H);
    g.drawImage(unitPart(kind,fac,role,era,trans,'front'), -USP.cx, -USP.foot, USP.W, USP.H);
    return;
  }
  // (les bras n'ont pas de variante « transcendée » : une seule cuisson par rôle et par ère)
  const limb = (part, px) => { g.save(); g.translate(px, -42); g.rotate(aa); g.translate(-px, 42);
    g.drawImage(unitPart(kind,fac,role,era,false,part), -USP.cx, -USP.foot, USP.W, USP.H); g.restore(); };
  limb('armb', -3);
  g.drawImage(unitPart(kind,fac,role,era,trans,'legs',pose), LEGS.ox, LEGS.oy, LEGS.W, LEGS.H);
  g.drawImage(unitPart(kind,fac,role,era,trans,'body'), -USP.cx, -USP.foot, USP.W, USP.H);
  limb('arm', 2);
}
// angle des bras d'une unité (rad, sens horaire = arme vers le bas, unité tournée vers +x)
function armAngle(u, moving, ph){
  const mult = u.tiredT>0? (u.fac==='IA'? 1.5 : 1.3) : 1;
  const ts = u.rate*mult - u.atkT;                                   // temps écoulé depuis le dernier coup
  const wind = (u.atkT>0 && u.atkT<0.24)? 1-u.atkT/0.24 : 0;         // armement, juste avant de frapper
  const w2 = wind*wind*(3-2*wind);
  let fast = 0, base = 0.022*Math.sin(u.bob*0.37);
  switch (u.role){
    case 'melee':
      if (ts<0.07) fast = lerp(-0.9, 0.95, Math.max(0,ts)/0.07);
      else if (ts<0.36){ const k=(ts-0.07)/0.29; fast = 0.95*(1-k)*(1-k); }
      else if (wind) fast = -0.9*w2;
      else if (moving) base = Math.sin(ph)*0.2;
      break;
    case 'tank':
      if (ts<0.09) fast = lerp(-0.1, 0.2, Math.max(0,ts)/0.09);
      else if (ts<0.32) fast = 0.2*(1-(ts-0.09)/0.23);
      else if (wind) fast = -0.1*w2;
      else if (moving) base = Math.sin(ph)*0.035;
      break;
    case 'ranged':
      if (ts<0.04) fast = -0.26*Math.max(0,ts)/0.04;
      else if (ts<0.3){ const k=(ts-0.04)/0.26; fast = -0.26*(1-k)*(1-k); }
      if (moving && u.atkT<-0.35) base = 0.24 + Math.sin(ph*2)*0.03;   // marche : arme portée bas
      break;
    case 'siege':
      if (ts<0.05) fast = -0.16*Math.max(0,ts)/0.05;
      else if (ts<0.5){ const k=(ts-0.05)/0.45; fast = -0.16*(1-k)*(1-k); }
      if (moving && u.atkT<-0.35) base = 0.05 + Math.sin(ph*2)*0.02;
      break;
    default:
      if (moving) base = Math.sin(ph)*0.12;
  }
  u._ab = u._ab===undefined? base : u._ab + (base-u._ab)*0.2;        // les poses lentes sont lissées
  return u._ab + fast;
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
  // COUCHES (v1.9) : 'back' (cape, paquetages), 'legs' (jambes, pose SPOSE), 'front' (le reste),
  // ou 'full' (tout, ordre d'origine) — les jambes animées sont blittées entre les deux.
  const doBack = SPART==='full' || SPART==='back';
  const rot = (hx,hy,a,fn) => { if (!a) return fn(); TC.save(); TC.translate(hx,hy); TC.rotate(a); TC.translate(-hx,-hy); fn(); TC.restore(); };
  const legB = () => { limbT([cx-1,F-24, cx-4,F-13, cx-6,F-4], lw-0.5, shade(pants,0.72));
    TC.fillStyle=shade(boot,0.8); rrectT(cx-10,F-6,10,6,2); TC.fill(); };
  const legF = () => { limbT([cx+2,F-24, cx+5,F-13, cx+5,F-4], lw, pants);
    if (era>=3) plateT([cx+2,F-18, cx+8,F-16, cx+7.5,F-9, cx+2,F-10], shade(uni,era===4?1:1.1));
    TC.fillStyle=lgrad(cx,F-6,cx,F,[[0,shade(boot,1.5)],[1,boot]]); rrectT(cx+1,F-6,11,6,2); TC.fill();
    TC.fillStyle='rgba(0,0,0,0.35)'; TC.fillRect(cx+1,F-1.4,11,1.4); };
  if (SPART==='legs'){ const a=SPOSE*0.34; rot(cx-1,F-24,a,legB); rot(cx+2,F-24,-a,legF); return; }
  // --- arrière-plan : cape (ère d'or), paquetage
  if (doBack && era===4){ TC.fillStyle=lgrad(cx-14,F-46,cx-4,F-8,[[0,'#c8402c'],[1,'#661a16']]);
    polyP([cx-6,F-46, cx-1,F-44, cx-7,F-9, cx-19,F-11, cx-14,F-30]); TC.fill(); }
  if (!doBack){}
  else if (role==='support'){
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
  if (hero && doBack){ TC.save(); TC.translate(cx+5,F-24); TC.rotate(-2.06);                       // fusil dans le dos
    TC.fillStyle=lgrad(0,-2,0,3,[[0,'#9a6034'],[1,'#5a3418']]); polyP([0,-2, 12,-1.4, 12,1.8, 0,2.6]); TC.fill();
    tubeT(11,-0.6,38,-0.6,1.1,'#4a4e54'); TC.restore(); }
  if (SPART==='back') return;
  // --- jambe arrière (plus sombre : côté opposé à la lumière)
  if (SPART==='full') legB();
  // --- bras arrière (couche 'armb' : pivote avec l'arme)
  if (SPART!=='body' && SPART!=='arm'){ limbT(P.b, aw-0.4, shade(uni,0.66));
    TC.fillStyle=shade(glove,0.8); TC.beginPath(); TC.arc(P.b[4],P.b[5],aw*0.45,0,6.283); TC.fill(); }
  if (SPART==='armb') return;
  // --- jambe avant + botte
  if (SPART==='full') legF();
  // --- torse + tête (sautés pour la couche 'arm' : arme et bras avant seuls)
  if (SPART!=='arm'){
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
  }
  if (SPART==='body') return;
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
  const doBack = SPART==='full' || SPART==='back';
  const rot = (hx,hy,a,fn) => { if (!a) return fn(); TC.save(); TC.translate(hx,hy); TC.rotate(a); TC.translate(-hx,-hy); fn(); TC.restore(); };
  const lb = shade(frame,0.8);
  const legB = () => { limbT([cx-2,F-25, cx+1,F-15], lw+0.6, lb); limbT([cx+1,F-15, cx-4,F-5], lw-0.4, lb);
    plateT([cx-8,F, cx+2,F, cx,F-4, cx-5,F-5], shade(plate,0.65)); };
  const legF = () => { limbT([cx+2,F-25, cx+7,F-15], lw+0.6, frame); limbT([cx+7,F-15, cx+2,F-5], lw-0.4, frame);
    TC.strokeStyle='#8a929c'; TC.lineWidth=1.1; strokeP([cx+3,F-21, cx+4,F-9]); TC.stroke();
    plateT([cx+1,F-28, cx+8.5,F-25, cx+8.5,F-18, cx+3,F-16.5], plate);
    TC.fillStyle=joint; TC.beginPath(); TC.arc(cx+7,F-15,2.4,0,6.283); TC.fill();
    plateT([cx-2,F, cx+11,F, cx+8.5,F-4, cx+1,F-5], shade(plate,0.9)); };
  if (SPART==='legs'){ const a=SPOSE*0.3; rot(cx-2,F-25,a,legB); rot(cx+2,F-25,-a,legF); return; }
  // --- drone de réparation (soutien), derrière
  if (doBack && role==='support'){
    TC.fillStyle=lgrad(cx-16,F-66,cx-4,F-60,[[0,shade(plate,1.4)],[1,shade(plate,0.6)]]);
    TC.beginPath(); TC.ellipse(cx-10,F-63,6,2.4,0,0,6.283); TC.fill();
    TC.fillStyle=frame; TC.fillRect(cx-17,F-66,14,1.2);
    glowDot(cx-10,F-60.6,1.4,lite,5);
  }
  // --- nacelle lance-missiles (siège), sur l'épaule arrière
  if (doBack && role==='siege'){
    plateT([cx-14,F-55, cx+2,F-60, cx+4,F-49, cx-12,F-45], plate);
    TC.fillStyle=frame; polyP([cx+2,F-60, cx+5,F-61, cx+7,F-50, cx+4,F-49]); TC.fill();
    const n = 2 + Math.min(era,2);
    for (let i=0;i<n;i++){ const t=(i+0.5)/n; const x=cx+5.5+t*1.6, y=F-60.5+t*10.5;
      TC.fillStyle='#0c1014'; TC.beginPath(); TC.arc(x,y,1.9,0,6.283); TC.fill();
      TC.fillStyle=era>=2? lite : '#e04a3a'; TC.beginPath(); TC.arc(x+0.3,y,1.2,0,6.283); TC.fill(); }
    TC.fillStyle=joint; TC.fillRect(cx-6,F-47,4,4);
  }
  if (SPART==='back') return;
  // --- jambe arrière (digitigrade)
  if (SPART==='full') legB();
  // --- bras arrière (couche 'armb')
  if (SPART!=='body' && SPART!=='arm'){ limbT(P.b, 4.4, shade(frame,0.85));
    TC.fillStyle=joint; TC.beginPath(); TC.arc(P.b[4],P.b[5],2.2,0,6.283); TC.fill(); }
  if (SPART==='armb') return;
  // --- jambe avant : cuisse blindée, genou articulé, vérin
  if (SPART==='full') legF();
  if (SPART!=='arm'){                          // châssis + tête : sautés pour la couche 'arm'
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
  var hx=cx+1, hy=F-54+hy0;
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
  }
  if (SPART==='body') return;
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
    if (glow && imp>0.8 && u.role==='ranged' && u.fac==='HUM' && u.era<3 && u._csg!==u.atkT && particles.length<480){   // douille éjectée
      u._csg = u.atkT;
      particles.push({k:'d', x:u.x+dir*12, y:bodyY+1, vx:-dir*(30+Math.random()*30), vy:-70-Math.random()*40, g:520, dr:0.4, life:0.7, t:0,
        r:1.1, rot:Math.random()*6, vr:(Math.random()-0.5)*30, color:'#d8b050'}); }
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
  // (halos resserrés en v1.12 : à 46/78 px ils fusionnaient en une nappe qui délavait la mêlée)
  if (imp>0.8){ const lc=u.role==='siege'?'#ff9d45':col; addLight(u.x+dir*18, bodyY, lc, u.role==='siege'?54:28, 0.16); }
}
// OMBRE PORTÉE (v1.12) : silhouette du personnage cuite en noir, couchée au sol et étirée
// selon la hauteur du soleil (plus le monde décline, plus la lumière est rasante). Un seul
// drawImage par unité — remplace l'ovale en dégradé recréé à chaque image.
function unitShadow(kind, fac, role, era, x, gy, dir){
  const sh = fxSprite('USH'+kind+role+era, USP.W, USP.H, g => {
    g.drawImage(unitPart(kind,fac,role,era,false,'front'), 0, 0, USP.W, USP.H);
    g.drawImage(unitPart(kind,fac,role,era,false,'legs',0), USP.cx+LEGS.ox, USP.foot+LEGS.oy, LEGS.W, LEGS.H);
    g.globalCompositeOperation='source-in'; g.fillStyle='#07060b'; g.fillRect(0,0,USP.W,USP.H); });
  const dev = game? game.dev : 0;
  ctx.save(); ctx.globalAlpha = 0.26 - 0.08*dev;
  ctx.translate(x, gy+1.5); ctx.transform(dir, 0, 0.75+0.9*dev, 0.24+0.1*dev, 0, 0);
  ctx.drawImage(sh, -USP.cx, -USP.foot, USP.W, USP.H); ctx.restore();
}
// ÉPAVES (v1.13) : silhouette assombrie de l'unité tombée, couchée au sol, qui s'efface en fin de vie
function drawWrecks(vw){
  for (const w of wrecks){
    const x = w.x-camX; if (x<-60||x>vw+60) continue;
    const kind = w.fac==='HUM'? 'hum':'bot';
    const sp = fxSprite('WRK'+kind+w.role+w.era, USP.W, USP.H, g => {
      g.drawImage(unitPart(kind,w.fac,w.role,w.era,false,'front'), 0, 0, USP.W, USP.H);
      g.drawImage(unitPart(kind,w.fac,w.role,w.era,false,'legs',0), USP.cx+LEGS.ox, USP.foot+LEGS.oy, LEGS.W, LEGS.H);
      g.globalCompositeOperation='source-atop'; g.fillStyle='rgba(22,17,20,0.66)'; g.fillRect(0,0,USP.W,USP.H); });
    ctx.save(); ctx.globalAlpha = clamp((w.t-0.3)/0.45, 0, 1)*clamp((50-w.t)/8, 0, 1)*0.92;
    ctx.translate(x, gY(w.x)+1);
    if (w.role==='tank'||w.role==='siege'){ ctx.rotate(-w.side*0.35); ctx.scale(w.side, 0.5); }
    else { ctx.rotate(-w.side*1.45); ctx.scale(w.side, 1); }
    ctx.drawImage(sp, -USP.cx, -USP.foot, USP.W, USP.H); ctx.restore();
  }
}
// PREMIER PLAN EN PARALLAXE (v1.13) : herbes, barbelés et gravats sombres, très bas, qui défilent
// plus vite que le monde — donne de la profondeur sans jamais masquer les unités (≤ 14 px au-dessus du sol)
function drawForeground(vw){
  if (!qHi()) return;
  const par = 1.38, off = camX*par, dev = game.dev||0, y0 = GROUND+24;
  for (let k=Math.floor((off-120)/230); k*230 < off+vw+120; k++){
    const h = lhash(k, 91); if (h>0.62) continue;
    const x = k*230 + lhash(k,92)*120 - off, ty = (h*100|0)%3, type = (ty===0 && dev>0.6)? 2 : ty;
    const sp = fxSprite('FG'+type, 96, 44, g => { if (CANF) g.filter='blur(1.1px)';
      g.fillStyle='rgba(13,10,12,0.72)'; g.strokeStyle='rgba(13,10,12,0.8)'; g.lineCap='round';
      if (type===0){ for (let i=0;i<22;i++){ const bx=10+i*3.5, bh=10+lhash(i,5)*26, bd=(lhash(i,6)-0.5)*14; g.lineWidth=1.6+lhash(i,7)*1.4;
          g.beginPath(); g.moveTo(bx,44); g.quadraticCurveTo(bx+bd*0.3,44-bh*0.6,bx+bd,44-bh); g.stroke(); } }
      else if (type===1){ g.lineWidth=3; g.beginPath(); g.moveTo(18,44); g.lineTo(21,8); g.moveTo(76,44); g.lineTo(73,12); g.stroke();
        g.lineWidth=1.1; for (let r=0;r<2;r++){ g.beginPath(); g.moveTo(0,16+r*11); g.quadraticCurveTo(48,24+r*11,96,15+r*11); g.stroke();
          for (let i=0;i<7;i++){ const bx=8+i*13, by=17+r*11+Math.sin(i/6*3.14)*4; g.beginPath(); g.moveTo(bx-2,by-2); g.lineTo(bx+2,by+2); g.moveTo(bx+2,by-2); g.lineTo(bx-2,by+2); g.stroke(); } } }
      else { g.globalAlpha=0.7; g.beginPath(); g.moveTo(6,44); g.lineTo(14,26); g.lineTo(30,20); g.lineTo(44,30); g.lineTo(58,22); g.lineTo(72,27); g.lineTo(90,44); g.closePath(); g.fill();
        g.lineWidth=2.4; g.beginPath(); g.moveTo(36,26); g.lineTo(31,6); g.moveTo(31,6); g.lineTo(40,10); g.stroke(); } });
    ctx.drawImage(sp, x-48, y0-44, 96, 44);
  }
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
  const fac = kind==='hum'? 'HUM':'IA';
  const t=u.bob, dir=u.side;
  // DÉMARCHE : balancement + foulée quand l'unité avance (détectée via le delta de position monde)
  const mv = Math.abs(u.x-(u._wx!=null?u._wx:u.x)); u._wx = u.x;
  const moving = mv>0.04;
  const gAmp = (u.role==='tank'||u.role==='siege')? 0.5 : 1;        // les lourds se dandinent moins
  const ph = t*1.5;
  const stepBob = moving ? -Math.abs(Math.sin(ph))*2.6*gAmp : 0;    // le corps s'élève à chaque pas
  const stepSkew = moving ? Math.sin(ph)*0.025*gAmp : 0;           // léger cisaillement (les jambes font la foulée)
  // pose des jambes : foulée avant → jambes réunies (corps au plus haut) → foulée arrière → …
  const sp = Math.sin(ph), pose = (!moving || Math.abs(sp)>0.7)? 0 : (Math.cos(ph)>0? 1 : -1);
  let sy = 1 + 0.03*Math.sin(t*2.6);                               // léger tassement, PIEDS ANCRÉS au sol
  if (u.flash>0) sy *= 0.86;                                       // ÉCRASEMENT bref à l'impact (feedback)
  // VICTOIRE : les survivants du camp vainqueur sautent de joie, arme levée
  const cheer = game.over && ((u.side===1)===!!game.win) && u.role!=='support';
  const hop = cheer? -Math.abs(Math.sin(performance.now()/190 + u.bob))*7 : 0;
  const atk = u.atkT > u.rate-0.16;
  const imp = atk ? clamp((u.atkT-(u.rate-0.16))/0.16, 0, 1) : 0;   // 1 à l'impact → 0
  const fwd = (u.role==='melee'||u.role==='tank');                  // mêlée : jab avant ; tir/siège : recul
  const lunge = fwd ? dir*9*imp : (atk? -dir*5*imp : 0);
  let tilt = fwd ? dir*imp*0.12 : (atk? -dir*imp*0.06 : 0);         // bascule (poids/impact)
  if (u.flash>0 && !atk) tilt -= dir*Math.min(0.14, u.flash*0.5);   // touché : le buste part en arrière
  if (qFx()) unitShadow(kind, fac, u.role, u.era, x, gy, dir); else projShadow(x, gy, 15);
  // POUSSIÈRE DE PAS : petites volutes au sol quand l'unité marche (cosmétique, plafonné)
  if (moving && qFx() && particles.length<440 && Math.random()<0.09){
    particles.push({ x:u.x-dir*7, y:gy-1, vx:-dir*6+(Math.random()*6-3), vy:-8-Math.random()*8,
      r:1.4+Math.random()*1.6, life:0.4+Math.random()*0.3, t:0, color:'rgba(198,184,156,0.5)' });
  }
  ctx.save(); ctx.translate(x+lunge, gy+stepBob+hop); ctx.rotate(tilt);
  if (stepSkew) ctx.transform(1,0,stepSkew*dir,1,0,0);
  ctx.scale(dir, sy);
  const aa = !qFx()? undefined : cheer? -1.05+0.25*Math.sin(performance.now()/190 + u.bob) : armAngle(u, moving, ph);
  drawUnitLayers(kind, fac, u.role, u.era, u.trans, pose, ctx, aa);
  if (u.flash>0){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=Math.min(0.5,u.flash*0.9); drawUnitLayers(kind, fac, u.role, u.era, u.trans, pose, ctx, aa); }
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
  // ASSIETTE (v1.14) : l'appareil pique du nez quand il avance, se cabre au tir, se redresse en vol stationnaire
  const mvA = Math.abs(u.x-(u._wx!=null?u._wx:u.x)); u._wx = u.x;
  const kick = u.atkT>u.rate-0.2? (u.atkT-(u.rate-0.2))/0.2 : 0;
  const want = (mvA>0.04? 0.13 : 0) - kick*0.1 + Math.sin(t*0.9)*0.02;
  u._pit = u._pit===undefined? want : u._pit + (want-u._pit)*0.12;
  ctx.save(); ctx.translate(x,y); ctx.rotate(dir*u._pit); ctx.scale(dir*AS,AS); ctx.drawImage(spr, -32, -22, 64, 44);
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
// HÉROS : voir 12b-hero.js (un personnage par ère, en couches animées)
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
        for (const role of roles) WARMQ.push({ era, trans, fn:()=>{ unitPart(kind,fac,role,era,trans,'front');
          if (unitHasBack(kind,role,era)) unitPart(kind,fac,role,era,trans,'back'); } });
        if (!trans) for (const role of ['melee','tank']) for (const pose of [0,1,-1])
          WARMQ.push({ era, trans, fn:()=>unitPart(kind,fac,role,era,false,'legs',pose) }); }
      for (const fac of ['HUM','IA']) WARMQ.push({ era, trans, fn:()=>sprite('AIR'+fac+era+(trans?'T':''), 64, 44, ()=>airSprite(fac,era,trans)) });
      if (!trans) WARMQ.push({ era, trans, fn:()=>sprite('GREM'+era, 28, 24, ()=>gremlinSprite(era)) });
      if (era===1 && !trans) WARMQ.push({ era, trans, fn:()=>{ mushroomSprite(); puffSprites(); } });   // effets lourds
    }
  }
  while (WARMQ.length && WARMQ[0].era===0 && !WARMQ[0].trans) WARMQ.shift().fn();
  if (game){ warmArms(game.p, true); warmArms(game.e, true); warmHero(game.p); warmHero(game.e); }
}
// couches de bras animés (v1.14) : cuites seulement pour les ères en jeu (au départ, puis à chaque
// évolution), jamais d'avance pour toutes — trois toiles par rôle, la mémoire resterait prise
function warmArms(side, now){
  if (!qFx()) return;
  const kind = side.facKey==='HUM'? 'hum':'bot', era = side.era;
  for (const role of ['melee','tank','ranged','siege','support']){
    const fn = ()=>{ unitPart(kind,side.facKey,role,era,side.trans,'body'); unitPart(kind,side.facKey,role,era,false,'armb'); unitPart(kind,side.facKey,role,era,false,'arm'); };
    if (now) fn(); else WARMQ.unshift({ era, trans:false, fn }); }
}
function warmTick(budgetMs){
  const t0 = performance.now();
  while (WARMQ.length && performance.now()-t0 < budgetMs) WARMQ.shift().fn();
}
function drawUnit(u){
  const x = u.x-camX;
  if (game.camp && game.camp.hidden && game.camp.hidden(u)) return;      // campagne : unité dans le noir
  if (x<-40 || x>VW()+40) return;
  const gy = gY(u.x);
  const fh = u.fly? u.flyH : 0;
  const top = u.role==='gremlin'? 26 : u.fly? 44 : u.role==='hero'? heroTop(u) : 70;   // au-dessus de la tête
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
  // APPARITION (v1.14) : l'unité sort de l'ombre de sa base en 0,4 s, dans un nuage de poussière
  if (u._born===undefined){ u._born = game.t;
    if (qFx() && !u.fly && u.role!=='gremlin' && game.t>1 && particles.length<460)
      for (let i=0;i<4;i++) particles.push({k:'u', x:u.x-u.side*4+(Math.random()-0.5)*14, y:gy-3, vx:(Math.random()-0.5)*26, vy:-10-Math.random()*12, g:-4, dr:1.4, life:0.6+Math.random()*0.3, t:0, r:3.5+Math.random()*2.5}); }
  // AURA DU HÉROS : un petit repère à l'encre sous chaque allié au sol galvanisé (remplace les faisceaux)
  if (sideU.heroAlive && u.role!=='hero' && !u.fly && u.role!=='gremlin' && qFx()) heroPip(u.fac, x, gy);
  const bornA = clamp((game.t-u._born)/0.4, 0, 1);
  if (bornA<1) ctx.globalAlpha = 0.15+0.85*bornA;
  if (u.role==='hero') drawHero(u,x,gy);
  else if (u.role==='air') drawAir(u,x,gy);
  else if (u.fac==='HUM') drawHuman(u,x,gy);
  else drawBot(u,x,gy);
  ctx.globalAlpha = 1;
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
    u._hpS = (u._hpS===undefined || u._hpS<frac)? frac : u._hpS + (frac-u._hpS)*0.08;      // traîne des dégâts récents
    if (u._hpS>frac+0.01){ ctx.fillStyle='rgba(255,240,220,0.85)'; ctx.fillRect(x-w/2,yy,w*u._hpS,3.4); }
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
// EFFETS CUITS SANS CONTOUR (v1.9) : halos, marqueurs, lumières, cratères. Le flou (shadowBlur)
// et les dégradés radiaux recréés à chaque image étaient les premiers postes de rendu restants
// (profil : 15 ms/image pour les seuls emplacements vides en Élevé) ; cuits une fois, ils ne
// coûtent plus qu'un drawImage.
const FXC = new Map();
function fxSprite(key, w, h, draw){
  const SS = spriteSS(), k = key+'@'+SS;
  let c = FXC.get(k);
  if (!c){ c = document.createElement('canvas'); c.width = Math.ceil(w*SS); c.height = Math.ceil(h*SS);
    const g = c.getContext('2d'); g.scale(SS,SS); const prev = TC; TC = g; try { draw(g); } finally { TC = prev; }
    if (FXC.size > 220) FXC.clear();                         // garde-fou (couleurs de lumière très variées)
    FXC.set(k, c); }
  return c;
}
// lumière dynamique : même dégradé qu'avant (0,34 → 0,12 → 0), une texture par couleur
function lightSprite(col){
  return fxSprite('LT'+col, 64, 64, g => { const r=g.createRadialGradient(32,32,0.5,32,32,32);
    r.addColorStop(0,rgbaC(col,0.34)); r.addColorStop(0.5,rgbaC(col,0.12)); r.addColorStop(1,rgbaC(col,0));
    g.fillStyle=r; g.fillRect(0,0,64,64); });
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
// planches et palettes → brique et tôle industrielles → béton → blindage → bois, verre et jardins
// (v1.16 : plus de pierre crénelée en 2028 ni de marbre doré au Paradis). Cuits une fois, puis blittés
// (miroir selon le camp) : moins d'opérations canvas par frame qu'avant malgré le détail.
const HMAT = [
  { wall:'#8a6444', roof:'#6e6a66', trim:'#4a3428', lite:'#ffcf78' },   // ère 0 : planches, palettes, tôle
  { wall:'#8e4a34', roof:'#6e6a66', trim:'#4e4840', lite:'#ffcf78' },   // ère 1 : brique et tôle d'usine
  { wall:'#7c8084', roof:'#4e5256', trim:'#3a3e42', lite:'#fff0c0' },   // ère 2 : béton
  { wall:'#4a4560', roof:'#2e2a3c', trim:'#ffb35a', lite:'#ffb35a' },   // ère 3 : blindage
  { wall:'#e8dcc4', roof:'#5a9a3a', trim:'#9a6434', lite:'#ffe2a8' },   // ère 4 : bois clair, verre, toits végétaux
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
    } else if (era===1){                                                                      // conteneur de bout + tôles + palette (grève)
      const cy = G-h*0.5; bCtnEnd(x0,cy,x0+w,G,'#3a6a8a');
      bCorr([x0+1,y0+3, x0+w-1,y0, x0+w-1,cy, x0+1,cy], '#8a8e92', 3, 5);
      plateT([x0+3,y0+10, x0+w-3,y0+9, x0+w-4,y0+17, x0+3,y0+18], '#c8302a', false);                   // banderole
      bPallet(x0-2,G-8,x0+12,G,'#c8a46e');
    } else if (era===2){                                                                      // mur en T de béton + barbelés
      plateT([x0+2,y0+5, x0+w-2,y0+5, x0+w,G-8, x0+w+2,G, x0-2,G, x0,G-8], M.wall);
      TC.fillStyle='rgba(0,0,0,0.22)'; TC.fillRect(x0+2,y0+h*0.45,w-4,0.9); TC.fillRect(cx,y0+6,0.9,h-14);
      TC.strokeStyle='#5a5e62'; TC.lineWidth=0.8; for (let i=0;i<5;i++){ TC.beginPath(); TC.ellipse(x0+3+i*5.5,y0+2.6,3,2.6,0,0,6.283); TC.stroke(); }
      TC.fillStyle=acc; TC.fillRect(x0+4,y0+14,w-8,3);
    } else if (era===3){                                                                      // blindage + bande lumineuse
      plateT([x0,y0+3, cx,y0, x0+w,y0+3, x0+w,G, x0,G], M.wall);
      TC.fillStyle='rgba(0,0,0,0.3)'; for (let i=1;i<4;i++) TC.fillRect(x0+1,y0+i*h/4,w-2,0.9);
      bloomT(M.lite,6,()=>{ TC.fillStyle=M.lite; TC.fillRect(x0+3,y0+10,w-6,1.8); });
    } else {                                                                                  // gabions plantés, lisse de bois, haie fleurie
      for (let yy=G; yy>y0+6; yy-=10){ const hh=Math.min(10,yy-y0-6); bBox(x0,yy-hh,x0+w,yy,'#a8a090');
        TC.fillStyle='rgba(60,56,50,0.45)'; for (let k=0;k<8;k++){ TC.beginPath(); TC.arc(x0+3+(k%4)*7,yy-hh+2.6+Math.floor(k/4)*4.6,1.6,0,6.283); TC.fill(); } }
      bFill(x0-1,y0+4,x0+w+1,y0+7,M.trim);
      for (let k=0;k<8;k++) bDisc(x0+1.5+k*3.6,y0+3-lhash(k,4)*2,2.6,['#4a8a3a','#6aaa4a','#3a7a3a'][k%3]);
      for (let k=0;k<4;k++) bDisc(x0+4+k*7,y0+1.6,0.9,['#ff7aa8','#ffd34a'][k%2]);
    }
    if (lvl>=3 && era!==1 && era!==4){ TC.fillStyle=shade(era===0?'#6a4a2c':M.wall,0.9); for (let c=0;c<3;c++) TC.fillRect(x0+c*10.5,y0-5,7,5); }
  } else if (type==='turret'){
    const top=y0;                                                                             // la tête dépasse au-dessus
    if (era===0){                                                                             // tour de guet en bois
      TC.strokeStyle='#5a3e24'; TC.lineWidth=3; TC.lineCap='butt';
      strokeP([cx-9,G, cx-6,top+8]); TC.stroke(); strokeP([cx+9,G, cx+6,top+8]); TC.stroke();
      TC.lineWidth=1.6; strokeP([cx-8.4,G-6, cx+6.6,top+20]); TC.stroke(); strokeP([cx+8.4,G-6, cx-6.6,top+20]); TC.stroke();
      strokeP([cx-7.4,top+28, cx+7.4,top+28]); TC.stroke();
      TC.fillStyle=lgrad(0,top,0,top+10,[[0,'#a88058'],[1,'#6a4a2c']]); TC.fillRect(cx-11,top+1,22,8);
      sandbagsT(cx-12,cx+12,top+9,1);
    } else if (era===1){                                                                      // tour d'échafaudage + guérite en tôle
      TC.strokeStyle='#5a5e64'; TC.lineWidth=2.2; TC.lineCap='butt';
      strokeP([cx-9,G, cx-7,top+8]); TC.stroke(); strokeP([cx+9,G, cx+7,top+8]); TC.stroke();
      TC.lineWidth=1.1; for (let yy=G-4; yy>top+12; yy-=12){ strokeP([cx-8.6,yy, cx+7.6,yy-11]); TC.stroke(); strokeP([cx-8.6,yy, cx+8.6,yy]); TC.stroke(); }
      bCorr([cx-11,top-2, cx+11,top-2, cx+11,top+9, cx-11,top+9], '#8a8e92', 2.6, 3);
      bFill(cx-12,top-4,cx+12,top-1.6,'#5a5e64');
      plateT([cx-11,top+9, cx+11,top+9, cx+10,top+13, cx-10,top+13], '#c8302a', false);
    } else if (era===2){                                                                      // fût de béton + dôme d'acier
      plateT([cx-9,top+2, cx+9,top+2, cx+10,G, cx-10,G], M.wall);
      TC.fillStyle='rgba(0,0,0,0.25)'; for (let i=1;i<4;i++) TC.fillRect(cx-9,top+2+i*(h-2)/4,18,0.9);
      TC.fillStyle='#1c1814'; TC.fillRect(cx-5,top+12,10,2);
      TC.fillStyle=lgrad(cx-10,top-10,cx+10,top+2,[[0,'#9aa0a8'],[1,'#4a4e54']]); TC.beginPath(); TC.arc(cx,top+2,10,Math.PI,0); TC.fill();
    } else {                                                                                  // pylône high-tech / d'or
      plateT([cx-7,top+4, cx+7,top+4, cx+9,G, cx-9,G], M.wall);
      if (era===3){ bloomT(M.lite,5,()=>{ TC.fillStyle=M.lite; TC.fillRect(cx-0.8,top+10,1.6,h-16); }); }
      else { TC.fillStyle=M.trim; for (let i=0;i<3;i++) TC.fillRect(cx-8,top+10+i*(h-14)/3,16,2.4);           // fût de bois, baies vitrées
        bloomT(M.lite,3,()=>{ TC.fillStyle='rgba(255,226,168,0.75)'; TC.fillRect(cx-4,top+14,8,h*0.22); });
        for (let k=0;k<4;k++) bDisc(cx-6+k*4,top+8+(k%2),1.8,['#4a8a3a','#6aaa4a'][k%2]); }
      plateT([cx-11,top+4, cx-6,top-6, cx+7,top-6, cx+11,top+4], era===4? '#2a4a7a' : shade(M.wall,1.2));
    }
    // canons (un par niveau) pointés vers l'ennemi
    const hy = top-3;
    for (let c=0;c<lvl;c++){ const by = hy + (c-(lvl-1)/2)*3.6;
      tubeT(cx+2, by, cx+16+lvl*2, by-0.6, era>=3?1.8:1.5, era===4? '#e8e0cc' : '#26282e');
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

/* --- BASES (v1.16) : des QG qui ont le sens de leur époque ---
   Fini le château : chaque camp défend un lieu crédible qui se transforme à chaque ère.
     HUMANITÉ  ZAD en palettes (2025) → usine occupée (2028) → quartier insurgé (2032)
               → base militaire révolutionnaire (2038) → commune solarpunk (Paradis socialiste)
     GPT       conteneur-serveur (2025) → datacenter (2030) → campus de verre noir (2035)
               → arcologie-forteresse (2040) → structure impossible (Singularité)
   La FORTIFICATION ajoute les défenses de l'époque devant et derrière ; les DÉGÂTS sont peints
   dans le décor (vitres brisées, suie, brèches, gravats) ; la GARNISON (≤ 3) se tient au poste
   de guet central, d'où partent ses tirs (sol − 96). Le statique est cuit — une toile par état
   et par sens, pour que les inscriptions restent à l'endroit côté droit — et seul le vivant est
   redessiné à chaque image (drapeaux, rotors, braises, fumées, LED, caméra, drones, hologrammes).
   Repère de cuisson : origine au pied de la base, +x = vers l'ennemi, sol à y = 0. */
const BASP = { W:212, H:172, cx:106, G:156 };
const BINK = 'rgba(26,18,16,0.62)';
const B_STEN = '"AGI Stencil","AGI Cond",Impact,sans-serif', B_TERM = '"AGI Term","Courier New",monospace';
let BMIR = false;                                   // cuisson du côté droit (miroir) en cours
// inscription peinte : redressée localement quand la base est cuite en miroir
function bTxt(s, x, y, px, col, fam, rot, wt){
  TC.save(); TC.translate(x, y); if (BMIR) TC.scale(-1, 1); if (rot) TC.rotate(BMIR? -rot : rot);
  TC.font = (wt||'800')+' '+px+'px '+(fam||B_STEN); TC.textAlign='center'; TC.textBaseline='middle';
  TC.fillStyle = col; TC.fillText(s, 0, 0); TC.restore();
}
function bBox(x0,y0,x1,y1,col,edge){ plateT([x0,y0, x1,y0, x1,y1, x0,y1], col, edge); }
function bFill(x0,y0,x1,y1,col){ TC.fillStyle=col; TC.fillRect(x0,y0,x1-x0,y1-y0); }
function bLn(p, w, col){ strokeP(p); TC.strokeStyle=col||BINK; TC.lineWidth=w||0.8; TC.lineCap='round'; TC.lineJoin='round'; TC.stroke(); }
function bClip(p, fn){ TC.save(); polyP(p); TC.clip(); try { fn(); } finally { TC.restore(); } }
function bDisc(x,y,r,col){ TC.fillStyle=col; TC.beginPath(); TC.arc(x,y,r,0,6.283); TC.fill(); }
// planches dépareillées (verticales, ou horizontales), joints et clous à l'encre
function bPlanks(x0,y0,x1,y1,pw,cols,horiz,seed){
  const L = horiz? y1-y0 : x1-x0, n = Math.max(1, Math.round(L/pw)), st = L/n;
  for (let i=0;i<n;i++){ const c = cols[Math.floor(lhash(i, seed||1)*cols.length)];
    if (horiz) bBox(x0, y0+i*st, x1, y0+(i+1)*st, c, false); else bBox(x0+i*st, y0, x0+(i+1)*st, y1, c, false); }
  TC.fillStyle = BINK;
  for (let i=1;i<n;i++){ if (horiz) TC.fillRect(x0, y0+i*st-0.35, x1-x0, 0.7); else TC.fillRect(x0+i*st-0.35, y0, 0.7, y1-y0); }
  TC.fillStyle = 'rgba(30,22,18,0.6)';
  for (let i=0;i<n;i++){ if (lhash(i,(seed||1)+7)<0.45) continue;
    const a = horiz? x0+2+lhash(i,3)*(x1-x0-4) : x0+i*st+st/2, b = horiz? y0+i*st+st/2 : y0+2+lhash(i,5)*(y1-y0-4); TC.fillRect(a-0.45,b-0.45,0.9,0.9); }
}
// palette debout vue de face : lattes horizontales ajourées sur trois dés
function bPallet(x0,y0,x1,y1,col){
  const h = y1-y0, n = 5;
  bFill(x0+1, y0, x1-1, y1, 'rgba(24,16,12,0.7)');
  for (const xx of [x0, (x0+x1)/2-1.7, x1-3.4]) bBox(xx, y0, xx+3.4, y1, shade(col,0.78), false);
  for (let i=0;i<n;i++){ const yy = y0 + i*(h/n) + (i===n-1? h/n*0.38 : 0); bBox(x0, yy, x1, yy+h/n*0.62, i%2? shade(col,0.9) : col, false); }
}
// pile de pneus couchés (vus de profil), centrée en x, posée sur y
function bTires(x, y, n, w){
  for (let i=0;i<n;i++){ const yy = y-(i+1)*5.4, ww = w-(i%2)*1.4;
    TC.fillStyle = lgrad(0,yy,0,yy+5.4,[[0,'#56525a'],[0.45,'#2a282e'],[1,'#121016']]); rrectT(x-ww/2, yy, ww, 5.4, 2.6); TC.fill();
    TC.fillStyle = 'rgba(0,0,0,0.55)'; for (let k=0;k<5;k++) TC.fillRect(x-ww/2+3+k*(ww-6)/4, yy+2.2, 0.9, 2.4); }
}
function bTire(x,y,r){ bDisc(x,y,r,'#1e1c22'); bDisc(x,y,r*0.56,'#3e3a44'); bDisc(x,y,r*0.26,'#8a8690'); }
// tôle ondulée (toit, bardage) : nervures dans le sens de la pente
function bCorr(p, col, step, rust){
  plateT(p, col, false);
  bClip(p, ()=>{ let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    for (let i=0;i<p.length;i+=2){ x0=Math.min(x0,p[i]); x1=Math.max(x1,p[i]); y0=Math.min(y0,p[i+1]); y1=Math.max(y1,p[i+1]); }
    TC.fillStyle='rgba(0,0,0,0.24)'; for (let x=x0+step/2;x<x1;x+=step) TC.fillRect(x,y0,0.8,y1-y0);
    TC.fillStyle='rgba(255,255,255,0.16)'; for (let x=x0+step/2+1.3;x<x1;x+=step) TC.fillRect(x,y0,0.6,y1-y0);
    if (rust){ TC.fillStyle='rgba(150,72,30,0.55)'; for (let i=0;i<3;i++){ const rx=x0+lhash(i,rust)*(x1-x0); TC.beginPath(); TC.ellipse(rx,(y0+y1)/2,3+lhash(i,rust+1)*5,(y1-y0),0,0,6.283); TC.fill(); } } });
}
// pylône en treillis du sol (y0) au sommet (y1), largeur w0 → w1
function bLattice(x, y0, y1, w0, w1, col, lw){
  const n = Math.max(2, Math.round((y0-y1)/9)); TC.strokeStyle=col; TC.lineWidth=lw||1; TC.lineCap='round';
  TC.beginPath(); TC.moveTo(x-w0/2,y0); TC.lineTo(x-w1/2,y1); TC.moveTo(x+w0/2,y0); TC.lineTo(x+w1/2,y1);
  for (let i=0;i<n;i++){ const a=i/n, b=(i+1)/n, ya=y0+(y1-y0)*a, yb=y0+(y1-y0)*b, wa=(w0+(w1-w0)*a)/2, wb=(w0+(w1-w0)*b)/2;
    TC.moveTo(x-wa,ya); TC.lineTo(x+wb,yb); TC.moveTo(x+wa,ya); TC.lineTo(x-wb,yb); TC.moveTo(x-wb,yb); TC.lineTo(x+wb,yb); }
  TC.stroke();
}
function bWire(x0,x1,y,r){ r=r||2.6; TC.strokeStyle='#4a4a50'; TC.lineWidth=0.7; TC.beginPath();
  for (let x=x0; x<x1; x+=r*1.4){ TC.moveTo(x+r,y); TC.ellipse(x,y,r,r*0.85,0,0,6.283); } TC.stroke(); }
function bBags(x0,x1,y,rows,col){ col = col||'#c8b488';
  for (let r=0;r<rows;r++){ const yy=y-2.4-r*4.4, off=(r%2)*3.2;
    for (let x=x0+off; x<x1-3; x+=6.4){ TC.fillStyle=lgrad(x,yy-2.3,x,yy+2.3,[[0,shade(col,1.12)],[1,shade(col,0.66)]]); rrectT(x,yy-2.3,6.2,4.6,2.2); TC.fill(); } } }
// fenêtre : châssis, vitre éclairée (ou brisée : noir + éclats), croisillons
function bWin(x,y,w,h,lite,frame,mul,broken){
  bFill(x-1,y-1,x+w+1,y+h+1, frame||'#2a221c');
  if (broken){ bFill(x,y,x+w,y+h,'#120e12'); TC.fillStyle=rgbaC(lite,0.55);
    polyP([x,y, x+w*0.55,y, x+w*0.15,y+h*0.55]); TC.fill(); polyP([x+w,y+h, x+w,y+h*0.45, x+w*0.6,y+h]); TC.fill(); }
  else bloomT(lite,4,()=>{ TC.fillStyle=lite; TC.fillRect(x,y,w,h); });
  if (mul){ TC.fillStyle=frame||'#2a221c'; TC.fillRect(x+w/2-0.4,y,0.8,h); if (mul>1) TC.fillRect(x,y+h/2-0.4,w,0.8); }
}
// conteneur maritime vu de flanc (nervures verticales) / vu de bout (portes et crémones)
function bCtn(x0,y0,x1,y1,col){
  bBox(x0,y0,x1,y1,col); TC.fillStyle='rgba(0,0,0,0.2)';
  for (let x=x0+3; x<x1-2; x+=3.2) TC.fillRect(x,y0+1.6,0.9,y1-y0-3.2);
  bFill(x0,y0,x1,y0+1.6,shade(col,0.75)); bFill(x0,y1-1.6,x1,y1,shade(col,0.7));
}
function bCtnEnd(x0,y0,x1,y1,col){
  bBox(x0,y0,x1,y1,col); const m=(x0+x1)/2; bFill(m-0.4,y0+1.5,m+0.4,y1-1.5,BINK);
  TC.fillStyle='rgba(30,30,34,0.75)'; for (const bx of [x0+(m-x0)*0.35, x0+(m-x0)*0.75, m+(x1-m)*0.25, m+(x1-m)*0.65]) TC.fillRect(bx-0.4,y0+2,0.8,y1-y0-4);
  bFill(x0,y0,x1,y0+1.5,shade(col,0.7)); bFill(x0,y1-1.5,x1,y1,shade(col,0.7));
}
// dégâts peints : suie qui lèche un mur, brèche déchiquetée, gravats, lézarde
function bSoot(x,y,r){ TC.fillStyle=rgrad(x,y,r,[[0,'rgba(16,10,10,0.72)'],[0.55,'rgba(16,10,10,0.34)'],[1,'rgba(16,10,10,0)']]);
  TC.beginPath(); TC.ellipse(x,y-r*0.3,r*0.75,r*1.15,0,0,6.283); TC.fill(); }
function bHole(x,y,r,seed){ TC.beginPath();
  for (let k=0;k<9;k++){ const a=k/9*6.283, rr=r*(0.55+lhash(k,seed)*0.6), px=x+Math.cos(a)*rr, py=y+Math.sin(a)*rr*0.85; k? TC.lineTo(px,py) : TC.moveTo(px,py); }
  TC.closePath(); TC.fillStyle='#140e10'; TC.fill(); TC.strokeStyle='rgba(236,214,180,0.4)'; TC.lineWidth=0.8; TC.stroke(); }
function bRubble(x0,x1,seed,col){ const n=Math.round((x1-x0)/3.2);
  for (let i=0;i<n;i++){ const x=x0+lhash(i,seed)*(x1-x0), s=1.6+lhash(i,seed+1)*3.2;
    polyP([x-s,0.6, x-s*0.4,-s*0.95, x+s*0.5,-s*0.7, x+s,0.6]); TC.fillStyle=shade(col||'#7a7068', 0.65+lhash(i,seed+2)*0.55); TC.fill(); } }
function bCrack(x,y,len,seed){ let cx=x, cy=y; TC.beginPath(); TC.moveTo(cx,cy);
  for (let k=0;k<5;k++){ cx += (lhash(k,seed)-0.5)*6; cy -= len/5; TC.lineTo(cx,cy); if (k===2){ TC.lineTo(cx+4,cy-2.4); TC.moveTo(cx,cy); } }
  TC.strokeStyle='rgba(14,10,10,0.75)'; TC.lineWidth=1.1; TC.lineCap='round'; TC.stroke(); }

/* ======== HUMANITÉ ======== */
const BW_WOOD = ['#a07850','#8a6440','#b08a5a','#7a5636','#97806a','#6e5a48','#a89070'];
const HUM_BASE = [
  // ── 2025 · RÉVOLTE : la ZAD — cabane en palettes, vigie en rondins, yourte, éolienne bricolée,
  //    potager, feu de camp, barricade de pneus et de touret ──
  (f, dmg) => {
    // éolienne bricolée : mât en échafaudage haubané (rotor en direct)
    bLn([-70,-96, -100,0], 0.6, 'rgba(46,40,38,0.75)'); bLn([-70,-96, -42,0], 0.6, 'rgba(46,40,38,0.75)');
    bLattice(-70, 0, -100, 7, 3, '#76767c', 1.1);
    bLn([-70,-104, -88,-105], 1.4, '#5a5a60'); plateT([-96,-113, -86,-111, -86,-99, -96,-101], '#e8b830'); bTxt('☀', -91, -106, 6, '#c8302a', null, 0, '400');
    bBox(-72,-107,-62,-101,'#5a5a60');
    // arrière fortifié : pneus et palettes
    if (f>=2){ bPallet(-104,-26,-90,0,'#b8945e'); bTires(-94,0,3,13); if (f>=3){ bTires(-101,0,5,12); bWire(-104,-86,-30,2.4); } }
    // yourte : treillis de bois, feutre, bâche bleue nouée, tuyau de poêle (fumée en direct)
    bFill(-91,-15,-53,0,'#e4d8bc'); bClip([-91,-15,-53,-15,-53,0,-91,0], ()=>{ TC.strokeStyle='rgba(120,84,52,0.55)'; TC.lineWidth=0.7; TC.beginPath();
      for (let x=-96;x<-50;x+=4){ TC.moveTo(x,0); TC.lineTo(x+8,-15); TC.moveTo(x+8,0); TC.lineTo(x,-15); } TC.stroke(); });
    bBox(-77,-12,-69,0,'#d8582a'); bFill(-73.4,-12,-72.6,0,BINK);                                   // porte peinte
    bLn([-64,-22, -64,-42], 2.2, '#4a4a50'); bFill(-66.2,-44,-61.8,-41.6,'#3a3a40');
    plateT([-94,-15, -72,-33, -50,-15], '#ece2c8'); plateT([-91,-15, -78,-27, -66,-27, -56,-15], '#3a78b4');       // feutre + bâche
    bLn([-91,-15, -78,-27], 0.7, 'rgba(255,255,255,0.35)'); bLn([-80,-21,-60,-18], 0.8, '#d8c890');
    if (dmg>=1){ bSoot(-60,-20,9); } if (dmg>=2){ bHole(-84,-20,5,3); bHole(-62,-8,4,5); }
    // vigie en rondins : pieds et croix de Saint-André, plancher, garde-corps, toit de tôle
    for (const lx of [-20,16]) limbT([lx,0, lx+(lx<0?3:-3),-86], 3.4, '#7a5a3a');
    bLn([-18,-26, 13,-60], 1.4,'#6a4a2c'); bLn([14,-26, -17,-60], 1.4,'#6a4a2c'); bLn([-18,-60, 14,-60], 1.6,'#6a4a2c');
    for (const lx of [-21,16]) bLn([lx,-86, lx,-108], 1.8, '#6a4a2c');
    if (dmg>=2) bCorr([-26,-104, 6,-112, 7,-108, -25,-100], '#8a8680', 3.2, 4);                       // toit arraché
    else bCorr([-27,-106, 21,-111, 21,-107, -27,-102], '#8e8a84', 3.2, 4);
    bBox(-25,-88,21,-84,'#8a6440'); for (const px of [-24,-2,19]) bFill(px,-95,px+1.6,-86,'#6a4a2c'); bFill(-25,-95,21,-93.4,'#7a5636');
    // banderole peinte accrochée au garde-corps
    const bw = dmg>=1? [-20,-93, 16,-93, 15,-84, 4,-79, -6,-82, -19,-78] : [-20,-93, 16,-93, 16,-79, -2,-77.5, -20,-79];
    plateT(bw, '#efe8d6'); bTxt('ZAD', -2, -86, 11, '#c8282a');
    if (dmg>=1) bSoot(10,-80,5);
    // cabane : soubassement de palettes, bardage dépareillé, toit de tôle en appentis + bâche verte
    const wall = [-48,-49, 18,-42.5, 18,0, -48,0];
    bClip(wall, ()=>bPlanks(-48,-50,18,-17,4.6,BW_WOOD,false,3));
    bPallet(-48,-18,-26,0,'#c8a46e'); bPallet(-26,-18,-4,0,'#b8945e'); bPallet(-4,-18,18,0,'#c4a068');
    bWin(-41,-39,11,10,'#ffcf78','#e8e0d0',2, dmg>=1);                                               // fenêtre de récup
    bWin(-22,-38,7,9,'#ffcf78','#3a8ac0',1, dmg>=2);
    bBox(4,-35,15,-1,'#3a8ac0'); bFill(4,-35,15,-33.6,'#2a6a98'); bDisc(13,-18,0.9,'#e8d8a0');           // porte peinte
    bTxt('☮', 9.5, -27, 7, '#f4ecd8', null, 0, '400');
    if (dmg>=1){ bSoot(-35,-40,10); bFill(-14,-30,-10,-18,'#1a1210'); }
    if (dmg>=2){ bHole(-10,-36,6,7); bSoot(10,-30,9); }
    bCorr([-54,-48, 22,-40, 22,-44, -54,-53], '#8e8a84', 3.4, 9);
    if (dmg<2) plateT([-30,-51.5, -6,-48.8, -8,-44, -26,-45.5], '#4a7a3a');                       // bâche verte rapiécée
    else { plateT([-30,-51.5, -14,-49.6, -18,-38, -24,-36, -27,-44], '#4a7a3a'); bHole(-40,-50,4,11); }
    // potager : bac de planches, salades, tuteurs et tomates
    bBox(-47,-5,-23,0,'#8a6440'); bFill(-47,-5,-23,-4,'#6a4a2c');
    for (let i=0;i<6;i++){ const px=-45+i*4, py=-7-lhash(i,21)*2; bDisc(px,py,2.6+lhash(i,22),i%2? '#5a9a3a':'#7ab84a'); }
    for (const px of [-43,-35,-27]){ bLn([px,-5, px,-14], 0.8, '#8a6a40'); bDisc(px+1.2,-10,1.2,'#d8402a'); }
    // feu de camp : pierres et bûches (flammes en direct)
    for (let i=0;i<5;i++) bDisc(20+i*3,-1,1.8,i%2?'#8a8682':'#6e6a66');
    bLn([20,-1, 31,-4], 1.8, '#5a3e24'); bLn([31,-1, 20,-4], 1.8, '#6a4a2c');
    // barricade : palissade de pieux (fort ≥ 2), piles de pneus, touret de câble, sens interdit
    if (f>=2){ for (let i=0;i<8;i++){ const px=34+i*5.6, ph=26+lhash(i,31)*8; plateT([px,0, px,-ph+3, px+2.4,-ph, px+4.8,-ph+3, px+4.8,0], BW_WOOD[i%BW_WOOD.length], false); }
      bFill(33,-22,79,-20,'#5a3e24'); if (f>=3) bWire(34,78,-32,2.6); }
    bTires(39,0,4,13); bTires(70,0,3,13);
    bDisc(54.5,-11,11,'#b08a5a'); TC.strokeStyle=BINK; TC.lineWidth=0.8; TC.beginPath(); TC.arc(54.5,-11,11,0,6.283); TC.stroke();
    bDisc(54.5,-11,8.5,'#c8a070'); bDisc(54.5,-11,3.4,'#6a4a2c'); bDisc(54.5,-11,1.6,'#2a1c14');
    plateT([44,0, 49,-20, 52,-19, 48,0], '#c8a46e', false);
    bLn([70,-16, 70,-31], 1.1, '#8a8a90'); bDisc(70,-34,4.6,'#d82a2a'); bFill(67.6,-34.7,72.4,-33.3,'#f4f0e8');
    if (f>=3){ for (const cx of [74]){ bLn([cx-6,0, cx+4,-12], 2, '#5a3e24'); bLn([cx+6,0, cx-4,-12], 2, '#6a4a2c'); bLn([cx-7,-7, cx+7,-7], 1.6, '#5a3e24'); } }
    if (dmg>=1) bRubble(20,46,41,'#8a7060');
    if (dmg>=2){ bRubble(-50,-20,43,'#7a6050'); bSoot(40,-14,9); }
  },
  // ── 2028 · GRÈVE GÉNÉRALE : l'usine occupée — halle à toit en sheds, cheminée froide peinte,
  //    tour de l'horloge (poste de guet), banderoles, drapeaux rouges, braseros, conteneurs ──
  (f, dmg) => {
    const BR = '#8e4a34', BR2 = '#a85a40', STONE = '#dccdb0';
    // arrière : conteneurs posés de bout + pneus
    if (f>=2){ bCtnEnd(-104,-17,-88,0,'#3a6a8a'); bTires(-84,0,3,10); if (f>=3){ bCtnEnd(-103,-34,-87,-17,'#a8442e'); bWire(-104,-86,-37,2.3); } }
    // cheminée de brique, froide (c'est la grève) — « GRÈVE » peint de haut en bas
    plateT([-82,0, -81,-120, -71,-120, -70,0], BR);
    masonT(-82,-120,12,120,5,6,0.18); bFill(-83,-123,-69,-118,'#5a3428'); bFill(-82,-60,-70,-57,shade(BR,0.8));
    'GRÈVE'.split('').forEach((ch,i)=> bTxt(ch, -76, -110+i*8.6, 7.4, '#f4ecd8'));
    if (dmg>=2){ bHole(-76,-40,4,3); bSoot(-76,-118,6); }
    // halle de fabrication : brique, grandes verrières d'acier, toit en sheds vitrés
    bBox(-68,-44,-12,0,BR); masonT(-68,-44,56,44,4.4,7,0.16);
    for (let i=0;i<3;i++){ const x0=-68+i*18.7;
      plateT([x0,-44, x0,-60, x0+18.7,-44], '#6e6a66'); polyP([x0+0.6,-45, x0+0.6,-58.4, x0+5.4,-55]); TC.fillStyle='#a8c8d8'; TC.fill();
      bLn([x0,-44, x0,-60, x0+18.7,-44], 0.8); }
    for (const wx of [-63,-40]){ bFill(wx-1,-37,wx+19,-11,'#2a2a30');
      for (let r=0;r<3;r++) for (let c=0;c<4;c++){ const px=wx+c*4.8+0.6, py=-36+r*8.4, br = dmg>=1 && (r*4+c)%5===2, bd = (r*4+c)%7===3;
        if (bd) bFill(px,py,px+3.8,py+7.4,'#8a6440'); else if (br) bFill(px,py,px+3.8,py+7.4,'#120e12'); else bFill(px,py,px+3.8,py+7.4,(r+c)%3? '#ffcf78' : '#e0b860'); } }
    plateT([-66,-44, -14,-44, -15,-33, -40,-31.5, -65,-33], '#c8302a');                              // banderole
    bTxt('EN GRÈVE', -40, -38.4, 7.2, '#f8f0e0');
    if (dmg>=1){ bSoot(-28,-36,10); bHole(-58,-46,5,13); }
    // tour de l'horloge (bureaux) : pierre d'angle, horloge, parapet du poste de guet
    bBox(-14,-88,16,0,BR2); masonT(-14,-88,30,88,4.4,7,0.14);
    for (let y=-86;y<0;y+=8){ bFill(-14,y,-11,y+4,STONE); bFill(13,y+4,16,y+8,STONE); }
    bBox(-16,-94,18,-87,STONE); bFill(-16,-88,18,-86.6,'rgba(0,0,0,0.25)');
    bDisc(1,-73,6.4,'#2a2420'); bDisc(1,-73,5.4,'#f4ecd8'); bLn([1,-73, 1,-77.6], 0.9, '#1a1410'); bLn([1,-73, 4,-73], 0.9, '#1a1410');
    bWin(-8,-60,6,9,'#ffcf78','#2a221c',1,dmg>=2); bWin(4,-60,6,9,'#ffcf78','#2a221c',1,false);
    plateT([-11,-50, 13,-50, 13,-39, 1,-37.6, -11,-39], '#f2ead8'); bTxt('OCCUPÉE', 1, -44.6, 5.2, '#c8282a');
    bBox(-6,-24,8,0,'#5a4636'); bFill(-6,-24,8,-22.6,'#3a2c22');                                       // porte du personnel
    if (dmg>=1) bCrack(14,-10,30,7);
    if (dmg>=2){ bHole(8,-80,5,9); bSoot(1,-90,10); bRubble(-20,20,17,'#9a6a50'); }
    // annexe de chargement : bardage de tôle, rideau métallique à demi levé, drapeaux syndicaux
    bCorr([16,-34, 46,-34, 46,0, 16,0], '#7e848a', 3);
    bFill(16,-37,47,-34,'#5a6066');
    bFill(20,-28,42,0,'#1a1614'); bCorr([20,-28, 42,-28, 42,-12, 20,-12], '#9aa0a4', 2.2);
    bloomT('#ffb860',6,()=>{ TC.fillStyle='rgba(255,184,96,0.55)'; TC.fillRect(21,-11,20,6); });
    bPallet(22,-9,32,0,'#c8a46e'); bPallet(31,-8,41,0,'#b8945e');
    for (const [px,c] of [[22,'#c8302a'],[40,'#d8402a']]){ bLn([px,-34, px,-54], 1, '#4a4650');
      plateT([px,-54, px+9,-52.5, px+9,-47, px,-48], c, false); }
    if (dmg>=1) bSoot(30,-30,8);
    // piquet de grève : brasero (feu en direct), palettes empilées, pancarte
    bBox(47,-13,55,0,'#7a3a22'); bFill(47,-10,55,-9,'rgba(0,0,0,0.35)'); bFill(47,-4,55,-3,'rgba(0,0,0,0.35)');
    for (const [hx,hy] of [[49,-7],[52.4,-7],[50.6,-2]]){ bloomT('#ff9a3a',4,()=>bDisc(hx,hy,0.9,'#ffb050')); }
    for (let i=0;i<3;i++) bPallet(58,-6-i*6,78,-i*6,i%2?'#b8945e':'#c8a46e');
    bLn([63,-18, 63,-38], 1.1, '#6a4a2c'); plateT([56,-38, 72,-38, 72,-29, 56,-29], '#f2ead8'); bTxt('NON !', 64, -33.4, 5.6, '#1a1414');
    if (f>=2){ bCtnEnd(62,-36,78,-18,'#3a6a8a'); bLn([63,-18, 63,-24], 1.1, '#6a4a2c'); }
    if (f>=3){ bCtnEnd(61,-54,77,-36,'#c88a2a'); bWire(58,80,-57,2.3); }
    if (dmg>=2){ bSoot(66,-20,9); bRubble(44,78,23,'#8a6a50'); }
  },
  // ── 2032 · INSURRECTION : quartier insurgé — immeuble barricadé, radio pirate, projecteur,
  //    bus renversé, sacs de sable, rideau de fer tagué ──
  (f, dmg) => {
    const PL = '#c9b394';
    // arrière : sacs de sable ; épave de voiture calcinée (fort 3)
    if (f>=2) bBags(-104,-84,0,4,'#b8a47a');
    if (f>=3){ plateT([-104,-4, -101,-12, -94,-13, -90,-20, -76,-20, -71,-12, -66,-11, -66,-4], '#4a3a32'); bTire(-96,-3,4); bTire(-74,-3,4);
      bFill(-88,-18,-79,-13,'#141012'); bSoot(-84,-14,8); }
    // antenne de la radio pirate (treillis haubané, dipôles) — feu clignotant en direct
    bLn([-40,-122, -58,-92], 0.6, 'rgba(46,40,38,0.7)'); bLn([-40,-122, -22,-92], 0.6, 'rgba(46,40,38,0.7)');
    bLattice(-40,-92,-126,5,2,'#5a5a62',0.9);
    for (const y of [-120,-112,-104]) bLn([-47,y, -33,y], 1, '#5a5a62');
    // immeuble de faubourg : enduit, soubassement, corniches, fenêtres barricadées
    bBox(-64,-92,8,0,PL);
    bFill(-64,-14,8,0,'#8a7a66'); for (const y of [-34,-54,-74]) bFill(-66,y-1.4,10,y+1,shade(PL,0.82));
    bFill(-66,-95,10,-90,'#8a7a66');
    const wins = [[-58,-70],[-40,-70],[-22,-70],[-58,-50],[-40,-50],[-22,-50],[-58,-30],[-40,-30],[-22,-30]];
    wins.forEach(([wx,wy],i)=>{
      const st = (i*7+3)%5, br = (dmg>=1 && i%4===1) || (dmg>=2 && i%3===0);
      bWin(wx,wy,10,13,'#ffcf78','#3a3028',st===2? 0:2, br);
      if (st===0 && !br){ bFill(wx-1,wy,wx+11,wy+13,'#7a5a3c'); TC.fillStyle=BINK; TC.fillRect(wx,wy+4.3,10,0.7); TC.fillRect(wx,wy+8.6,10,0.7); }
      else if (st===1 && !br){ bBags(wx-0.5,wx+11.5,wy+13,2,'#c8b488'); }
      else if (st===3){ bFill(wx-3,wy-1,wx-0.6,wy+14,'#5a7a5a'); bFill(wx+10.6,wy-1,wx+13,wy+14,'#5a7a5a'); } });
    // banderole verticale et rideau de fer tagué
    plateT([-6,-86, 4,-86, 4,-38, -1,-41, -6,-38], '#c8302a'); bTxt('☭', -1, -76, 7, '#f8e8c0', null, 0, '400');
    'LIBRE'.split('').forEach((ch,i)=> bTxt(ch, -1, -66+i*5.4, 4.8, '#f8f0e0'));
    bCorr([-60,-13, -26,-13, -26,0, -60,0], '#8a8c90', 2);
    bTxt('RÉSISTE', -43, -6.6, 6.4, '#d8302a', null, -0.06); TC.fillStyle='rgba(20,20,24,0.7)'; TC.fillRect(-55,-11,6,0.8);
    bBox(-22,-14,-4,0,'#4a3a2c'); bFill(-22,-14,-4,-12.6,'#2a2018');
    // toit : parapet du poste de guet, parabole, projecteur (faisceau en direct)
    bFill(-60,-98,-54,-94,'#3a3a40'); TC.fillStyle=lgrad(-60,-104,-50,-98,[[0,'#e8ecee'],[1,'#7a8088']]); TC.beginPath(); TC.ellipse(-55,-101,5,2.6,-0.5,0,Math.PI); TC.fill();
    bBox(-12,-100,-6,-95,'#3a3a40'); bDisc(-7,-98,2.6,'#e8e4d8');
    bBags(-16,16,-92,1,'#c8b488');
    if (dmg>=1){ bSoot(-40,-56,12); bCrack(-60,-16,34,3); }
    if (dmg>=2){ bHole(-30,-82,7,5); bHole(-50,-42,6,11); bSoot(-20,-30,12); bRubble(-66,10,9,'#a8957a'); }
    // bus couché en travers de la rue, basculé sur des gravats : vitres brisées, carrosserie roussie
    bRubble(8,30,61,'#9a8a74');
    TC.save(); TC.translate(12,-2); TC.rotate(-0.13);
    plateT([0,-24, 50,-24, 54,-20, 54,0, 0,0, -2,-4, -2,-21], '#d8d2c4');
    bFill(-2,-8,54,-5,'#2a8a8a');
    for (let x=2;x<46;x+=8.2) bWin(x,-21,6.4,9,'#ffcf78','#2a2a2e',0,true);
    bWin(47,-21,5.5,12,'#ffcf78','#2a2a2e',0,true);
    for (const wx of [10,42]){ bDisc(wx,0,6.4,'#2a2a2e'); bTire(wx,0.4,5.6); }
    bTxt('68', 26, -2.6, 4.6, 'rgba(40,40,44,0.75)', B_TERM, 0, '400');
    bSoot(22,-14,9);
    if (dmg>=1) bSoot(40,-12,10);
    if (dmg>=2) bHole(30,-12,5,15);
    TC.restore();
    // avant : sacs de sable + barbelés ; glissières de béton (fort 2) ; hérissons tchèques (fort 3)
    bBags(64,80,0,3,'#c8b488');
    if (f>=2){ plateT([66,-4, 68,-20, 74,-20, 76,-4, 78,-4, 78,0, 64,0, 64,-4], '#a8a49a'); bTxt('A', 71, -12, 6, '#2a2a2a', null, 0, '400'); bBags(62,80,-4,1,'#b8a47a'); }
    if (f>=3){ for (const hx of [44]){ bLn([hx-6,0, hx+5,-13], 2.2, '#4a4a50'); bLn([hx+6,0, hx-5,-13], 2.2, '#3a3a40'); bLn([hx,0, hx,-14], 2.2, '#56565c'); } bWire(62,80,-24,2.4); }
  },
  // ── 2038 · RÉVOLUTION PERMANENTE : base militaire révolutionnaire — bunker de béton coffré,
  //    mirador à sacs de sable, filet de camouflage, antennes, radar, panneaux solaires, hesco ──
  (f, dmg) => {
    const CO = '#8c8a80';
    // arrière : hesco
    const hesco = (x0,x1,rows) => { for (let r=0;r<rows;r++) for (let x=x0; x<x1-1; x+=10){ const y0=-(r+1)*12;
        bBox(x,y0,x+10,y0+12,'#c2ae84'); TC.strokeStyle='rgba(60,60,60,0.55)'; TC.lineWidth=0.5; TC.beginPath();
        for (let k=1;k<4;k++){ TC.moveTo(x+k*2.5,y0); TC.lineTo(x+k*2.5,y0+12); TC.moveTo(x,y0+k*3); TC.lineTo(x+10,y0+k*3); } TC.stroke();
        bFill(x,y0,x+10,y0+1.4,'#8a7650'); } };
    if (f>=2) hesco(-104,-84, f>=3? 3 : 2);
    if (f>=3) bWire(-104,-84,-39,2.3);
    // mât du drapeau (drapeau en direct) et antennes fouets
    bLn([-52,-46, -52,-128], 1.4, '#4a4a50');
    bLn([-30,-48, -33,-104], 0.8, '#3a3a40'); bLn([26,-46, 28,-84], 0.8, '#3a3a40');
    // bunker : béton coffré, face avant chanfreinée, meurtrières éclairées
    const BK = [-66,0, -66,-40, -54,-48, 22,-48, 36,-34, 36,0];
    plateT(BK, CO); bClip(BK, ()=>{ TC.fillStyle='rgba(0,0,0,0.13)'; for (let y=-46;y<0;y+=5) TC.fillRect(-66,y,104,0.7);
      TC.fillStyle='rgba(255,255,255,0.07)'; for (let x=-60;x<36;x+=12) TC.fillRect(x,-48,0.7,48); });
    bFill(-68,-3,38,0,'#6a6860');
    for (const sx of [-58,-40,-22]){ bFill(sx-1,-33,sx+11,-27,'#1a1816'); bloomT('#ffb35a',5,()=>bFill(sx,-31.6,sx+10,-28.6,'#ffb35a')); }
    bDisc(-50,-14,6.6,'#f0e8d8'); TC.save(); TC.translate(0,0); drawStar(-50,-14,5,'#c8282a'); TC.restore();
    bTxt('QG · 38', -30, -14, 5.4, 'rgba(30,28,26,0.7)', null, 0, '800');
    bBox(10,-26,26,0,'#5a5e5a'); hazardT(10,-28,16,2.6); TC.fillStyle='rgba(0,0,0,0.3)'; TC.fillRect(17.6,-25,0.8,25);
    bBox(26,-38,32,-30,'#3a3a3e'); bloomT('#ffb35a',4,()=>bFill(27,-36.6,31,-32,'#ffd890'));
    // filet de camouflage drapé sur l'arrière
    const NET = [-70,-44, -56,-53, -30,-52, -16,-47, -20,-40, -32,-42, -44,-36, -58,-40, -70,-30];
    plateT(NET, '#5a6a3a', false); bClip(NET, ()=>{ for (let i=0;i<70;i++){ const x=-72+lhash(i,41)*58, y=-55+lhash(i,42)*26;
      TC.fillStyle = i%3? 'rgba(40,52,28,0.7)' : 'rgba(130,140,80,0.6)'; TC.beginPath(); TC.ellipse(x,y,2+lhash(i,43)*2,1.2,lhash(i,44)*3,0,6.283); TC.fill(); } });
    // panneaux solaires sur le toit avant
    for (const px of [6,18]) { bLn([px+5,-48, px+5,-52], 1, '#3a3a40'); plateT([px,-51, px+11,-56, px+12,-54, px+1,-49], '#2a4a7a', false);
      TC.strokeStyle='rgba(160,200,255,0.4)'; TC.lineWidth=0.5; strokeP([px+0.5,-50, px+11.5,-55]); TC.stroke(); }
    // radôme du radar (antenne tournante en direct)
    bBox(-38,-54,-28,-48,'#5a5e5a');
    // mirador : pieds d'acier, plate-forme, sacs de sable, toit blindé
    for (const lx of [-14,14]) bLn([lx,-48, lx*0.86,-86], 2.2, '#4a4e4a');
    bLn([-13,-52, 12,-82], 1, '#4a4e4a'); bLn([13,-52, -12,-82], 1, '#4a4e4a');
    bBox(-18,-89,18,-85,'#5a5e5a'); bBags(-18,19,-87,1,'#a89870');
    for (const lx of [-17,16]) bLn([lx,-89, lx,-108], 1.4, '#4a4e4a');
    plateT([-22,-108, 20,-112, 22,-108, -20,-104], '#6a6e62');
    if (dmg>=1){ bSoot(-40,-30,11); bCrack(-12,-2,30,9); bHole(30,-30,4,17); }
    if (dmg>=2){ bHole(-20,-40,7,19); bSoot(0,-46,14); bRubble(-70,40,29,'#7a786e'); }
    // avant : hesco, dents de dragon (fort 2), tourelle bitube sur le bunker (fort 3)
    hesco(58,78, f>=2? 2 : 1);
    if (f>=2) for (const dx of [42,50]) plateT([dx-4,0, dx,-9, dx+4,0], '#a8a49a');
    if (f>=3){ tubeT(30,-55, 52,-57, 1.6, '#3a3e3a'); tubeT(30,-51.4, 52,-53, 1.6, '#3a3e3a');
      TC.fillStyle=lgrad(20,-60,36,-48,[[0,'#7a7e72'],[1,'#3a3e36']]); TC.beginPath(); TC.arc(28,-48,9,Math.PI,0); TC.fill(); bWire(56,80,-28,2.4); }
  },
  // ── PARADIS SOCIALISTE : commune solarpunk — tour de terrasses en bois et verre, jardins
  //    suspendus, éolienne hélicoïdale, serre géodésique, maison commune à toit végétal ──
  (f, dmg, trans) => {
    const WOOD = '#9a6434', GLASS = '#5e9aa4', LITE = '#ffe2a8', LEAF = ['#4a8a3a','#6aaa4a','#3a7a3a','#8ac25a'];
    const FLW = ['#ff7aa8','#ffd34a','#ffffff','#ff9a5a'], banner = trans? '#d8282a' : '#ff9d45';
    const vines = (x0,x1,y,len,seed) => { for (let x=x0; x<x1; x+=2.6){ const l = len*(0.4+lhash(x,seed)*0.8);
        bLn([x,y, x+Math.sin(x)*1.2,y+l], 1.4, LEAF[Math.floor(lhash(x,seed+1)*4)]);
        if (lhash(x,seed+2)>0.6) bDisc(x+0.6,y+l*0.7,0.9,FLW[Math.floor(lhash(x,seed+3)*4)]); }
      for (let x=x0; x<x1; x+=3.4) bDisc(x+1,y-1.4,2.2,LEAF[Math.floor(lhash(x,seed+4)*4)]); };
    // arrière : gabions plantés (fort ≥ 2)
    const gabion = (x0,x1,rows) => { for (let r=0;r<rows;r++) for (let x=x0;x<x1-1;x+=10){ const y0=-(r+1)*9;
        bBox(x,y0,x+10,y0+9,'#a8a090'); TC.fillStyle='rgba(60,56,50,0.45)'; for (let i=0;i<7;i++) TC.beginPath(), TC.arc(x+1.6+(i%4)*2.4,y0+2+Math.floor(i/4)*4.4,1.2,0,6.283), TC.fill();
        TC.strokeStyle='rgba(80,80,80,0.5)'; TC.lineWidth=0.4; TC.strokeRect(x+0.2,y0+0.2,9.6,8.6); }
      for (let x=x0;x<x1-1;x+=3.2) bDisc(x+1.6,-rows*9-1,2.4,LEAF[Math.floor(lhash(x,9)*4)]); };
    if (f>=2) gabion(-104,-86, f>=3? 3 : 2);
    // serre géodésique
    TC.save(); TC.beginPath(); TC.arc(-64,0,21,Math.PI,0); TC.closePath();
    TC.fillStyle=lgrad(-84,-21,-44,0,[[0,'rgba(220,245,240,0.92)'],[1,'rgba(150,200,190,0.9)']]); TC.fill(); TC.clip();
    for (let i=0;i<9;i++) bDisc(-80+i*4,-3-lhash(i,5)*5,3+lhash(i,6)*2,LEAF[i%4]);
    TC.strokeStyle='rgba(255,255,255,0.85)'; TC.lineWidth=0.8; TC.beginPath();
    for (const r of [8,15,21]) TC.arc(-64,0,r,Math.PI,0);
    for (let a=0;a<=8;a++){ const an=Math.PI+a*Math.PI/8; TC.moveTo(-64,0); TC.lineTo(-64+Math.cos(an)*21,Math.sin(an)*21); } TC.stroke();
    TC.restore(); if (dmg>=1) bHole(-70,-12,4,3);
    // tour des terrasses : ossature bois, baies vitrées, toitures solaires, jardins suspendus
    const floor = (x0,x1,y0,y1,seed) => { bBox(x0,y0,x1,y1,GLASS);
      bloomT(LITE,3,()=>{ TC.fillStyle='rgba(255,214,140,0.5)'; TC.fillRect(x0+1,y0+(y1-y0)*0.5,x1-x0-2,(y1-y0)*0.5-1); });
      for (let x=x0; x<=x1; x+=(x1-x0)/Math.round((x1-x0)/9)) bFill(x-0.9,y0,x+0.9,y1,WOOD);
      bFill(x0-2,y1-2,x1+2,y1,shade(WOOD,0.85)); bFill(x0-3,y0-2.4,x1+3,y0,shade(WOOD,0.7)); };
    floor(-42,26,-30,0,1); floor(-36,20,-58,-30,2); floor(-28,12,-84,-58,3);
    for (const [x0,x1,y] of [[-42,-36,-30],[20,26,-30],[-36,-28,-58],[12,20,-58]]){ plateT([x0,y-0.6, x1,y-3.6, x1,y-1.6, x0,y+0.6], '#2a4a7a', false); }
    vines(-44,-34,-30,12,1); vines(18,28,-30,13,2); vines(-38,-26,-58,13,3); vines(10,22,-58,12,4); vines(-30,-20,-84,10,5); vines(4,14,-84,9,6);
    bBox(-12,-24,6,0,shade(WOOD,0.8)); TC.fillStyle='#7a4a24'; TC.beginPath(); TC.moveTo(-10,0); TC.lineTo(-10,-18); TC.arc(-3,-18,7,Math.PI,0); TC.lineTo(4,0); TC.fill();
    // terrasse du sommet (poste de guet) : bacs plantés et garde-corps de bois
    bFill(-30,-88,14,-85,shade(WOOD,0.7)); bFill(-30,-94,14,-92.6,WOOD); for (let x=-30;x<=14;x+=5.5) bFill(x,-94,x+1,-88,WOOD);
    for (let x=-28;x<-18;x+=3) bDisc(x,-95,2.2,LEAF[Math.floor(lhash(x,7)*4)]);
    // bannières de la commune
    for (const bx of [-24,8]){ plateT([bx,-80, bx+5,-80, bx+5,-64, bx+2.5,-66.4, bx,-64], banner, false); if (trans) drawStar(bx+2.5,-74,1.8,'#ffe9a0'); }
    if (dmg>=1){ bSoot(-10,-40,11); bWin(-30,-52,8,8,'#ffe2a8','#8a5a30',1,true); }
    if (dmg>=2){ bHole(0,-70,6,23); bSoot(-20,-80,10); bRubble(-46,30,31,'#a8906a'); }
    // maison commune : toit végétal, hublots, grande porte en arc
    bBox(28,-26,56,0,'#e8dcc4'); bFill(28,-26,56,-24,shade(WOOD,0.8));
    TC.fillStyle='#5a9a3a'; TC.beginPath(); TC.moveTo(25,-25); TC.quadraticCurveTo(42,-36,59,-25); TC.closePath(); TC.fill();
    for (let x=27;x<58;x+=3) bDisc(x,-26.6-Math.sin((x-25)/34*Math.PI)*5.5,1.6,LEAF[Math.floor(lhash(x,11)*4)]);
    for (const wx of [34,48]){ bDisc(wx,-15,3.6,'#8a5a30'); bloomT(LITE,4,()=>bDisc(wx,-15,2.8,LITE)); }
    if (dmg>=2) bHole(46,-14,4,27);
    // avant : gabions plantés ; pylônes du bouclier (fort 3, halo en direct)
    gabion(60,80, f>=2? 2 : 1);
    if (f>=3) for (const px of [-82,64]){ bBox(px,-34,px+4,-10,'#e8e0cc'); bFill(px-1,-36,px+5,-34,'#c8a040'); }
  },
];
/* ======== GPT ======== */
const IA_BASE = [
  // ── 2025 · AUBE DES LLM : conteneurs-serveurs d'une jeune pousse — baies vitrées de LED,
  //    climatiseurs, faisceaux de câbles, groupe électrogène, mât 5G, caméra qui scrute ──
  (f, dmg) => {
    const lite = FACTIONS.IA.eraCols[0];
    // mât télécom : treillis, panneaux d'antennes, parabole (feu d'obstacle en direct)
    bLattice(-64, 0, -118, 9, 4, '#8a9096', 1.1);
    for (const [ax,ay] of [[-70,-114],[-58,-114]]) bBox(ax-2,ay-9,ax+2,ay+3,'#e8ecee');
    TC.fillStyle=lgrad(-62,-104,-50,-96,[[0,'#f0f2f4'],[1,'#8a9096']]); TC.beginPath(); TC.ellipse(-57,-98,6,3,-0.6,0,Math.PI); TC.fill();
    // arrière : groupe électrogène (fumée d'échappement en direct)
    if (f>=2){ for (let i=0;i<4;i++) bLn([-104+i*5,0, -104+i*5,-30], 0.9, '#7a8088'); bClip([-106,-30,-86,-30,-86,0,-106,0], ()=>{ TC.strokeStyle='rgba(150,160,170,0.6)'; TC.lineWidth=0.5; TC.beginPath();
        for (let k=-40;k<30;k+=3){ TC.moveTo(-106,k); TC.lineTo(-86,k+20); TC.moveTo(-86,k); TC.lineTo(-106,k+20); } TC.stroke(); });
      bLn([-106,-30,-86,-30], 1, '#7a8088'); if (f>=3) bWire(-106,-86,-33,2.2); }
    bBox(-86,-20,-62,0,'#c8a83a'); bFill(-86,-4,-62,0,'#3a3e44'); TC.fillStyle='rgba(0,0,0,0.35)'; for (let i=0;i<4;i++) TC.fillRect(-82+i*5,-16,2.4,8);
    bLn([-66,-20, -66,-30], 1.8, '#4a4e54');
    // conteneur A (baies de serveurs, façade grillagée) — LED en direct
    bCtn(-60,-30,-6,0,'#3a4a5c'); bFill(-56,-27,-10,-3,'#0e1620');
    for (let i=0;i<4;i++){ const rx=-55+i*11.4; bFill(rx,-26,rx+9.6,-4,'#1a2430'); TC.fillStyle='rgba(255,255,255,0.12)'; for (let j=0;j<6;j++) TC.fillRect(rx,-25+j*3.6,9.6,0.6); }
    TC.strokeStyle='rgba(160,180,200,0.35)'; TC.lineWidth=0.5; TC.beginPath(); for (let x=-56;x<-10;x+=2.4){ TC.moveTo(x,-27); TC.lineTo(x,-3); } TC.stroke();
    // conteneur B : blanc, logo de la jeune pousse
    bCtn(-4,-30,52,0,'#d6dadc'); bTxt('GPT', 26, -15, 12, '#1a2a38', B_TERM, 0, '400');
    TC.strokeStyle='#1a2a38'; TC.lineWidth=1.3; TC.beginPath(); TC.arc(8,-15,5,0,6.283); TC.stroke(); bDisc(8,-15,1.6,lite);
    bTxt('NODE-01', 26, -6, 4.2, 'rgba(26,42,56,0.7)', B_TERM, 0, '400');
    // conteneur C (au-dessus) + climatiseurs (hélices en direct)
    bCtn(-42,-58,24,-30,'#5a7088'); bTxt('⚠', 14, -44, 7, '#e8c040', null, 0, '400');
    for (const ux of [-40,-22]){ bBox(ux,-68,ux+16,-58,'#c8ccd0'); bDisc(ux+8,-63,4,'#2a3038'); }
    // échafaudage d'accès + plate-forme grillagée du poste de garde
    for (const sx of [-14,18]) bLn([sx,-58, sx,-86], 1.6, '#8a9096'); bLn([-14,-60,18,-84],0.9,'#8a9096'); bLn([18,-60,-14,-84],0.9,'#8a9096');
    bBox(-18,-88,22,-85,'#6a7480'); bFill(-18,-95,22,-94,'#8a9096'); for (const px of [-18,2,21]) bFill(px,-95,px+1,-88,'#8a9096');
    // faisceaux de câbles (mât → conteneurs → sol)
    TC.lineCap='round'; for (const [w,c,o] of [[2.2,'#1c2026',0],[1.4,'#2a3a4a',2.4]]){ TC.strokeStyle=c; TC.lineWidth=w; TC.beginPath();
      TC.moveTo(-62,-90+o); TC.quadraticCurveTo(-50,-50, -42,-50+o); TC.moveTo(-6,-6+o*0.5); TC.quadraticCurveTo(-2,4, 10,0); TC.stroke(); }
    // avant : drapeau-plume de la marque (ondulation en direct), plots
    bLn([56,0, 56,-40], 1.2, '#8a9096');
    if (f>=1){ plateT([58,0, 62,-10, 74,-10, 78,0], '#aab0b4'); hazardT(60,-9,16,2.4); }
    if (f>=2){ for (let i=0;i<4;i++) bLn([60+i*6,0, 60+i*6,-30], 0.9, '#7a8088'); bClip([58,-30,80,-30,80,0,58,0], ()=>{ TC.strokeStyle='rgba(150,160,170,0.6)'; TC.lineWidth=0.5; TC.beginPath();
        for (let k=-40;k<30;k+=3){ TC.moveTo(58,k); TC.lineTo(80,k+22); TC.moveTo(80,k); TC.lineTo(58,k+22); } TC.stroke(); });
      bLn([58,-30,80,-30], 1, '#7a8088'); bBox(64,-22,74,-15,'#e8e4d8'); bTxt('PRIVÉ', 69, -18.5, 3.4, '#c82a2a', B_TERM, 0, '400'); }
    if (f>=3){ bWire(58,80,-33,2.2); plateT([46,0, 50,-12, 64,-12, 68,0], '#aab0b4'); hazardT(50,-11,14,2.4); }
    if (dmg>=1){ bSoot(-30,-40,10); bCrack(20,-2,22,5); bFill(-33,-26,-23,-4,'#05080c'); }
    if (dmg>=2){ bHole(-20,-48,7,9); bHole(36,-18,5,13); bSoot(10,-60,12); bRubble(-8,40,51,'#6a7480'); }
  },
  // ── 2030 · AGENTS AUTONOMES : le datacenter — hall bardé, ouïes de ventilation, ventilateurs
  //    de toiture, tour de refroidissement fumante, noyau vitré, fibres lumineuses, drones ──
  (f, dmg) => {
    const lite = FACTIONS.IA.eraCols[1], CL = '#b8c0c8';
    // arrière : tour de refroidissement (vapeur en direct), clôture d'acier (fort ≥ 2)
    plateT([-98,0, -92,-36, -94,-62, -70,-62, -72,-36, -66,0], '#c8ccd0');
    bClip([-98,0, -92,-36, -94,-62, -70,-62, -72,-36, -66,0], ()=>{ TC.fillStyle='rgba(0,0,0,0.08)'; for (let y=-60;y<0;y+=6) TC.fillRect(-100,y,40,0.8);
      TC.fillStyle='rgba(0,0,0,0.18)'; TC.fillRect(-74,-62,8,62); });
    bFill(-95,-64,-69,-61,'#8a9098');
    if (f>=2){ for (let x=-104;x<=-86;x+=3) plateT([x,0, x,-24, x+1,-27, x+2,-24, x+2,0], '#3a4048', false); bFill(-105,-20,-85,-18.6,'#3a4048'); if (f>=3) bWire(-105,-85,-30,2.2); }
    // hall des serveurs : bardage nervuré, bandeau d'ouïes, logo
    bBox(-70,-46,46,0,CL); TC.fillStyle='rgba(0,0,0,0.12)'; for (let x=-68;x<46;x+=3.4) TC.fillRect(x,-44,0.8,30);
    bFill(-70,-14,46,-4,'#2a3038'); TC.fillStyle='rgba(160,200,230,0.35)'; for (let x=-68;x<46;x+=2.6) TC.fillRect(x,-13,1.2,8);
    bFill(-70,-4,46,0,'#5a626c'); bFill(-72,-48,48,-45,'#6a727c');
    bTxt('GPT', -46, -30, 13, '#1e2a36', B_TERM, 0, '400'); bTxt('DATACENTER · 2030', -46, -20, 4.4, 'rgba(30,42,54,0.75)', B_TERM, 0, '400');
    bloomT(lite,5,()=>bFill(-66,-41,-26,-39.6,lite));
    // ventilateurs de toiture (hélices en direct)
    for (const ux of [-64,-46]){ bBox(ux,-56,ux+16,-46,'#8a929c'); bFill(ux+2,-58,ux+14,-56,'#5a626c'); }
    // noyau vitré (poste de guet sur le toit-terrasse)
    bBox(-14,-86,24,-46,'#2a3a4c'); TC.fillStyle='rgba(140,200,255,0.25)'; for (let y=-84;y<-46;y+=6) TC.fillRect(-14,y,38,0.8);
    for (let x=-10;x<24;x+=8) bFill(x,-86,x+0.9,-46,'#5a6a7c');
    bloomT(lite,4,()=>{ TC.fillStyle=rgbaC(lite,0.7); TC.fillRect(-12,-70,34,1.4); TC.fillRect(-12,-58,34,1.4); });
    plateT([-14,-86, 0,-84, -14,-62], 'rgba(255,255,255,0.18)', false);
    bFill(-18,-89,28,-86,'#4a5460'); bFill(-18,-95,28,-94,'#8a929c'); for (const px of [-18,4,27]) bFill(px,-95,px+1,-89,'#8a929c');
    bLn([0,-95, 0,-104], 1.6, '#8a929c');
    // porte de quai
    bBox(26,-28,42,-4,'#4a525c'); TC.fillStyle='rgba(255,255,255,0.12)'; for (let y=-26;y<-4;y+=3) TC.fillRect(26,y,16,0.7);
    if (dmg>=1){ bSoot(-50,-34,12); bCrack(10,-14,26,5); bFill(-46,-13,-30,-5,'#0a0c10'); }
    if (dmg>=2){ bHole(-60,-50,6,7); bHole(4,-70,6,9); bSoot(10,-80,12); bRubble(-70,44,13,'#8a9098'); }
    // avant : bornes anti-bélier ; palissade d'acier (fort 2) ; tourelle automatique (fort 3)
    for (const bx of [52,60,68,76]){ bBox(bx-1.8,-9,bx+1.8,0,'#5a626c'); bFill(bx-1.8,-9,bx+1.8,-7,'#e8c040'); }
    if (f>=2){ for (let x=56;x<=78;x+=3) plateT([x,0, x,-28, x+1,-31, x+2,-28, x+2,0], '#3a4048', false); bFill(55,-24,79,-22.6,'#3a4048'); }
    if (f>=3){ bBox(62,-46,70,-31,'#5a626c'); bBox(58,-52,72,-44,'#8a929c'); tubeT(70,-48, 84,-48.4, 1.4, '#3a4048'); bDisc(64,-48,1.6,lite); }
  },
  // ── 2035 · ESPRITS ÉMERGENTS : campus corporate de verre noir — tour biseautée, terrasse en
  //    porte-à-faux, aile basse, pavillon d'accueil, champ de capteurs, hologramme (en direct) ──
  (f, dmg) => {
    const lite = FACTIONS.IA.eraCols[2];
    const glass = (p, a, b) => { plateT(p, a, false); bClip(p, ()=>{ let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
        for (let i=0;i<p.length;i+=2){ x0=Math.min(x0,p[i]); x1=Math.max(x1,p[i]); y0=Math.min(y0,p[i+1]); y1=Math.max(y1,p[i+1]); }
        TC.fillStyle=lgrad(x0,y0,x1,y1,[[0,'rgba(140,160,220,0.28)'],[0.4,'rgba(140,160,220,0)'],[0.62,'rgba(140,160,220,0.14)'],[0.7,'rgba(140,160,220,0)']]); TC.fillRect(x0,y0,x1-x0,y1-y0);
        TC.fillStyle='rgba(120,140,200,0.18)'; for (let y=y1-6; y>y0; y-=6) TC.fillRect(x0,y,x1-x0,0.7);
        TC.fillStyle='rgba(120,140,200,0.12)'; for (let x=x0+5; x<x1; x+=5) TC.fillRect(x,y0,0.6,y1-y0); }); };
    // arrière : aile basse
    glass([-92,-38, -48,-38, -48,0, -92,0], '#1c2030');
    bFill(-94,-41,-46,-38,'#c8ccd4'); bloomT(lite,4,()=>{ TC.fillStyle=rgbaC(lite,0.8); TC.fillRect(-90,-22,40,1.2); });
    if (f>=2){ bBox(-104,-12,-94,0,'#c8ccd4'); bBox(-104,-26,-98,-12,'#9aa0aa'); }
    if (f>=3){ bBox(-88,-48,-70,-41,'#2a2e3a'); TC.fillStyle='#14161e'; TC.beginPath(); TC.arc(-79,-48,7,Math.PI,0); TC.fill(); bLn([-79,-55, -79,-62], 1, '#8a929c'); bDisc(-79,-62,1.4,lite); }
    // tour de verre noir biseautée
    const TW = [-48,0, -48,-108, -6,-124, -6,0];
    glass(TW, '#1a1e2c');
    for (const y of [-100,-80,-60,-40]) bloomT(lite,4,()=>{ TC.fillStyle=rgbaC(lite,0.7); TC.fillRect(-46,y,40,1); });
    bFill(-49,-110,-47,0,'#3a4054'); bFill(-7,-126,-5,0,'#3a4054');
    bTxt('GPT', -27, -114, 6, '#e8f0ff', B_TERM, -0.36, '400');
    // terrasse en porte-à-faux (poste de guet) — garde-corps de verre
    plateT([-8,-86, 24,-86, 22,-82, -8,-82], '#c8ccd4'); TC.fillStyle='rgba(180,220,255,0.35)'; TC.fillRect(-8,-95,32,9);
    bFill(-8,-95,24,-94,'#e8ecf4'); bLn([24,-82, 10,-62], 1.2, '#8a929c');
    // pavillon d'accueil : verrière courbe, totem lumineux
    TC.save(); TC.beginPath(); TC.moveTo(-6,0); TC.lineTo(-6,-26); TC.quadraticCurveTo(26,-30,44,0); TC.closePath();
    TC.fillStyle=lgrad(-6,-28,44,0,[[0,'rgba(60,70,100,0.95)'],[1,'rgba(20,24,36,0.95)']]); TC.fill(); TC.clip();
    TC.strokeStyle='rgba(200,215,255,0.35)'; TC.lineWidth=0.7; TC.beginPath(); for (let x=0;x<44;x+=6){ TC.moveTo(x,0); TC.lineTo(x,-30); } TC.stroke();
    bloomT(lite,5,()=>{ TC.fillStyle=rgbaC(lite,0.5); TC.fillRect(-4,-8,46,8); }); TC.restore();
    bBox(46,-34,52,0,'#e8ecf4'); bloomT(lite,5,()=>bFill(47.6,-30,50.4,-6,lite));
    if (dmg>=1){ bSoot(-28,-56,12); TC.strokeStyle='rgba(230,240,255,0.6)'; TC.lineWidth=0.6; for (let i=0;i<5;i++){ TC.beginPath(); TC.moveTo(-30,-70); TC.lineTo(-30+Math.cos(i*1.3)*9,-70+Math.sin(i*1.3)*9); TC.stroke(); } }
    if (dmg>=2){ bHole(-36,-40,7,7); bHole(-16,-96,6,9); bSoot(-20,-110,12); bRubble(-50,44,13,'#2a2e3a'); }
    // avant : champ de capteurs ; bornes rétractables + barrière laser (fort 2, faisceaux en direct)
    for (const sx of [56,64,72]){ bLn([sx,0, sx,-16], 1, '#8a929c'); bBox(sx-1.6,-19,sx+1.6,-16,'#e8ecf4'); }
    if (f>=2){ for (const px of [58,78]) bBox(px-2,-30,px+2,0,'#2a2e3a'); }
    if (f>=3){ bBox(56,-6,80,0,'#c8ccd4'); bFill(56,-6,80,-5,lite); }
  },
  // ── 2040 · PRÉ-AGI : l'arcologie-forteresse — monolithe à gradins, fentes de lumière,
  //    contreforts, galerie de tir, canons lourds, émetteurs de bouclier ──
  (f, dmg) => {
    const lite = FACTIONS.IA.eraCols[3], M1 = '#2c2a3c', M2 = '#3a3650';
    if (f>=2) for (const px of [-100,-90]) { plateT([px,0, px+2,-40, px+6,-40, px+8,0], M2); }
    // monolithe à gradins
    plateT([-66,0, -54,-44, -46,-44, -40,-84, -32,-84, -26,-122, 18,-122, 24,-84, 32,-84, 38,-44, 46,-44, 56,0], M1);
    bClip([-66,0, -54,-44, -46,-44, -40,-84, -32,-84, -26,-122, 18,-122, 24,-84, 32,-84, 38,-44, 46,-44, 56,0], ()=>{
      TC.fillStyle='rgba(255,255,255,0.05)'; for (let x=-60;x<56;x+=9) TC.fillRect(x,-122,0.8,122);
      TC.fillStyle=lgrad(-66,0,56,0,[[0,'rgba(255,255,255,0.08)'],[0.5,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,0.3)']]); TC.fillRect(-66,-122,122,122); });
    for (const [y,x0,x1] of [[-30,-54,46],[-64,-38,30],[-104,-22,14]]) bloomT(lite,6,()=>{ TC.fillStyle=lite; TC.fillRect(x0,y,x1-x0,1.6); });
    for (const [x,y] of [[-50,-44],[42,-44],[-36,-84],[28,-84]]) glowDot(x,y-2,1.8,lite,6);
    // galerie de tir (poste de guet)
    bFill(-22,-96,18,-86,'#120e1c'); bFill(-24,-86,20,-84,M2);
    // grande porte
    bFill(-14,-22,10,0,'#14101e'); bloomT(lite,5,()=>{ TC.strokeStyle=lite; TC.lineWidth=1; TC.strokeRect(-12,-20,20,20); });
    // canons lourds
    tubeT(36,-60, 70,-61, 2.6, '#4a4660'); tubeT(36,-50, 64,-51, 2, '#4a4660'); bBox(30,-66,40,-46,M2);
    if (f>=3){ tubeT(-30,-110, -2,-112, 1.8, '#4a4660'); }
    if (dmg>=1){ bCrack(-40,-6,40,3); bCrack(30,-50,30,5); bSoot(-10,-70,14); }
    if (dmg>=2){ bHole(-30,-30,8,7); bHole(10,-100,7,9); bRubble(-66,56,13,'#3a3650'); }
    // avant : plaques de blindage inclinées ; pylône de bouclier (fort ≥ 2)
    plateT([60,0, 66,-18, 72,-18, 76,0], M2); plateT([68,0, 74,-12, 80,0], M1);
    if (f>=2) { plateT([58,0, 60,-44, 64,-44, 66,0], M2); glowDot(62,-46,2.2,lite,8); }
  },
  // ── SINGULARITÉ · AGI : la structure impossible — dais de runes, pyramide inversée fractale
  //    en lévitation, triangle de Penrose, colonne de lumière, éclats en orbite (en direct) ──
  (f, dmg, trans) => {
    const lite = trans? '#ffffff' : FACTIONS.IA.eraCols[4], P1 = trans? '#e8d8f0' : '#4a3a5c', P2 = trans? '#b8a0d0' : '#2a2038';
    // dais circulaire
    plateT([-62,0, -54,-8, 54,-8, 62,0], P2); bFill(-56,-8,56,-6.6,shade(P1,1.2));
    bloomT(lite,6,()=>{ TC.strokeStyle=lite; TC.lineWidth=0.8; TC.beginPath(); for (let x=-48;x<48;x+=8){ TC.moveTo(x,-4); TC.lineTo(x+4,-6); TC.lineTo(x+8,-4); } TC.stroke(); });
    // pyramide inversée en lévitation, évidée en triangle de Sierpiński
    const tri = (ax,ay,bx,by,cx2,cy2,n) => { if (n===0){ polyP([ax,ay,bx,by,cx2,cy2]); TC.fill(); return; }
      const m = (p,q)=>(p+q)/2; tri(ax,ay,m(ax,bx),m(ay,by),m(ax,cx2),m(ay,cy2),n-1); tri(m(ax,bx),m(ay,by),bx,by,m(bx,cx2),m(by,cy2),n-1); tri(m(ax,cx2),m(ay,cy2),m(bx,cx2),m(by,cy2),cx2,cy2,n-1); };
    TC.fillStyle=lgrad(-40,-112,40,-40,[[0,shade(P1,1.5)],[1,P2]]); tri(-40,-112, 40,-112, 0,-40, 3);
    TC.fillStyle=rgbaC(lite,0.35); tri(-36,-110, 36,-110, 0,-46, 1);
    bloomT(lite,6,()=>{ TC.strokeStyle=lite; TC.lineWidth=1; strokeP([-40,-112, 40,-112, 0,-40]); TC.closePath(); TC.stroke(); });
    // obélisques latéraux
    for (const [ox,h] of [[-48,40],[44,34]]){ plateT([ox-5,-8, ox,-8-h, ox+5,-8], P1); bloomT(lite,4,()=>bFill(ox-0.6,-8-h*0.8,ox+0.6,-12,lite)); }
    if (f>=2) for (const ox of [-92,66]) { plateT([ox,0, ox+5,-28, ox+10,0], P2); glowDot(ox+5,-30,1.8,lite,6); }
    if (f>=3) for (const ox of [-80,76]) { plateT([ox-3,0, ox,-18, ox+3,0], P1); }
    if (dmg>=1){ TC.fillStyle='rgba(10,6,14,0.55)'; polyP([10,-112, 22,-112, 14,-96]); TC.fill(); bCrack(-30,-9,0.1,1); }
    if (dmg>=2){ TC.fillStyle='rgba(10,6,14,0.7)'; polyP([-34,-112, -20,-112, -26,-98]); TC.fill(); bRubble(-56,56,13,P1); }
  },
];
// métadonnées par base : y du poste de guet (garnison), panaches (dégâts), lumières de nuit [x,y,r,couleur,scintille]
const BASE_META = {
  HUM:[ { deck:-95, smoke:[[-40,-50],[50,-14]], lights:[[-35,-34,16,'#ffcf78'],[-18,-33,12,'#ffcf78'],[26,-6,34,'#ff9a3a',1],[-2,-98,16,'#ffcf78']] },
        { deck:-94, smoke:[[-76,-122],[30,-34]], lights:[[-53,-24,22,'#ffcf78'],[-30,-24,20,'#ffcf78'],[51,-14,30,'#ff9a3a',1],[31,-8,18,'#ffb860'],[1,-56,14,'#ffcf78']] },
        { deck:-96, smoke:[[-30,-92],[36,-25]], lights:[[-35,-64,18,'#ffcf78'],[-50,-44,18,'#ffcf78'],[-22,-24,18,'#ffcf78'],[-6,-98,20,'#fff6d8'],[-40,-127,8,'#ff3a2a',1]] },
        { deck:-91, smoke:[[-20,-48],[0,-108]], lights:[[-36,-30,22,'#ffb35a'],[29,-34,12,'#ffd890'],[0,-96,14,'#ffcf78']] },
        { deck:-94, smoke:[[-8,-86],[42,-30]], lights:[[-8,-18,28,'#ffe2a8'],[-8,-44,24,'#ffe2a8'],[-8,-70,18,'#ffe2a8'],[41,-15,16,'#ffe2a8']] } ],
  IA: [ { deck:-95, smoke:[[-20,-60],[20,-34]], lights:[[-33,-15,20,'#9ad1d4'],[-64,-118,10,'#ff3a3a',1],[26,-15,14,'#bfe8ff']] },
        { deck:-95, smoke:[[-50,-56],[4,-86]], lights:[[-12,-9,30,'#5ad0ff'],[5,-64,20,'#5ad0ff'],[62,-2,14,'#5ad0ff']] },
        { deck:-95, smoke:[[-27,-110],[-60,-38]], lights:[[-27,-70,24,'#7d8cff'],[19,-6,24,'#7d8cff'],[49,-18,12,'#7d8cff']] },
        { deck:-88, smoke:[[-4,-120],[30,-60]], lights:[[-4,-30,30,'#b44aff'],[-4,-64,22,'#b44aff'],[-2,-10,18,'#b44aff']] },
        { deck:-92, smoke:[[0,-112],[-40,-10]], lights:[[0,-80,34,'#ff4ad0'],[0,-6,30,'#ff4ad0']] } ],
};
const baseMeta = (fk, era) => { const L = BASE_META[fk]; return L[Math.min(era, L.length-1)]; };
function baseSprite(fk, era, trans, fort, dmg, mir){
  TC.translate(BASP.cx, BASP.G); if (mir) TC.scale(-1, 1); BMIR = !!mir;
  const L = fk==='HUM'? HUM_BASE : IA_BASE;
  try { L[Math.min(era, L.length-1)](fort, dmg, trans); } finally { BMIR = false; }
}

/* ---- éléments vivants (repère de la base, +x vers l'ennemi) ---- */
function bFlag(c, x, y, w, h, col, t, star, pole){
  if (pole!==y){ c.strokeStyle='#3a3640'; c.lineWidth=1.6; c.beginPath(); c.moveTo(x, pole!=null? pole : y+h+14); c.lineTo(x, y-2); c.stroke(); }
  const wv=Math.sin(t*3.1)*1.8, wv2=Math.sin(t*3.1+1.3)*2;
  c.fillStyle=col; c.beginPath(); c.moveTo(x,y); c.quadraticCurveTo(x+w/2,y-1.5+wv, x+w,y+wv2);
  c.lineTo(x+w,y+h+wv2); c.quadraticCurveTo(x+w/2,y+h-1.5+wv, x,y+h); c.closePath(); c.fill();
  c.fillStyle='rgba(0,0,0,0.18)'; c.fillRect(x, y+h*0.66, w*0.92, 1);
  if (star){ const pt=TC; TC=c; drawStar(x+w*0.45, y+h/2+wv*0.5, h*0.3, '#ffe9a0'); TC=pt; }
}
function bFire(c, x, y, s, t, seed){
  const PF = puffSprites(); c.save(); c.globalCompositeOperation='lighter';
  for (let i=0;i<3;i++){ const fl=Math.abs(Math.sin(t*(6.5+i)+i*1.9+seed)), r=s*(0.6+fl*0.45);
    c.globalAlpha=0.55+0.4*fl; c.drawImage(PF.fire, x-r+(i-1)*s*0.35, y-r*1.5-fl*s*0.3, r*2, r*2.3); }
  c.restore(); c.globalAlpha=1;
}
function bPuffs(c, x, y, t, n, sz, rise, a, seed){                  // fumée légère (poêle, échappement)
  const PF = puffSprites();
  for (let i=0;i<n;i++){ const ph=((t*0.35 + i/n + seed*0.17)%1), r=sz*(0.5+ph*1.4);
    c.globalAlpha=a*(1-ph)*Math.min(1,ph*5); c.drawImage(PF.smoke, x+ph*rise*0.35+Math.sin(t+i)*2-r, y-ph*rise-r, r*2, r*2); }
  c.globalAlpha=1;
}
let STEAMP = null;                                                  // bouffée de vapeur blanche (tours de refroidissement)
function bSteam(c, x, y, t, n, sz, rise, a, seed){
  if (!STEAMP) STEAMP = fxSprite('STEAM', 48, 48, g => { for (const [px,py,r] of [[24,26,20],[16,20,12],[32,19,12]]){ const gr=g.createRadialGradient(px,py,1,px,py,r);
    gr.addColorStop(0,'rgba(246,248,250,0.85)'); gr.addColorStop(0.6,'rgba(236,240,244,0.45)'); gr.addColorStop(1,'rgba(230,236,240,0)'); g.fillStyle=gr; g.beginPath(); g.arc(px,py,r,0,6.283); g.fill(); } });
  for (let i=0;i<n;i++){ const ph=((t*0.3 + i/n + seed*0.17)%1), r=sz*(0.6+ph*1.6);
    c.globalAlpha=a*(1-ph)*Math.min(1,ph*4); c.drawImage(STEAMP, x+ph*rise*0.5-r, y-ph*rise-r, r*2, r*2); }
  c.globalAlpha=1;
}
const HUM_LIVE = [
  (c, t, s, dmg) => {                                               // ZAD
    // rotor de l'éolienne (pales en tube PVC) — cassé et immobile sous 33 %
    const a = dmg>=2? 0.4 : t*2.6; c.lineCap='round'; c.beginPath();
    for (let i=0;i<(dmg>=2?1:3);i++){ const b=a+i*2.094; c.moveTo(-67,-104); c.lineTo(-67+Math.cos(b)*17, -104+Math.sin(b)*17); }
    c.strokeStyle='rgba(26,18,16,0.7)'; c.lineWidth=3.4; c.stroke(); c.strokeStyle='#ece6d8'; c.lineWidth=2; c.stroke();
    c.fillStyle='#3a3a40'; c.beginPath(); c.arc(-67,-104,2.2,0,6.283); c.fill();
    bPuffs(c, -64, -45, t, 3, 4, 26, 0.5, 1);                       // poêle de la yourte
    bFire(c, 25.5, -3, 6, t, 0);                                    // feu de camp
    bFlag(c, -2, -129, 17, 10, s.trans? '#e84a3a' : s.fac.accent, t, s.trans, -108);
  },
  (c, t, s, dmg) => {                                               // usine occupée
    bFire(c, 51, -13, 5.4, t, 1);
    bPuffs(c, 51, -22, t, 2, 3.4, 22, 0.35, 2);
    bFlag(c, 1, -129, 17, 10, s.trans? '#e84a3a' : s.fac.accent, t, s.trans, -94);
  },
  (c, t, s, dmg, fort) => {                                         // quartier insurgé
    if (Math.sin(t*2.4)>0.2){ c.fillStyle='#ff3a2a'; c.beginPath(); c.arc(-40,-127,1.5,0,6.283); c.fill(); }
    if (qFx()){ const a = -0.5+Math.sin(t*0.5)*0.35; c.save(); c.globalCompositeOperation='lighter'; c.fillStyle='rgba(255,246,210,0.10)';
      c.beginPath(); c.moveTo(-6,-98); c.lineTo(-6+Math.cos(a-0.07)*120, -98+Math.sin(a-0.07)*120); c.lineTo(-6+Math.cos(a+0.07)*120, -98+Math.sin(a+0.07)*120); c.closePath(); c.fill(); c.restore(); }
    bFlag(c, -62, -128, 16, 10, s.trans? '#e84a3a' : s.fac.accent, t, s.trans, -95);
  },
  (c, t, s, dmg, fort) => {                                         // base militaire
    const a = t*1.8, w = Math.cos(a)*6;                              // radar qui tourne
    c.strokeStyle='#4a4e4a'; c.lineWidth=1.4; c.beginPath(); c.moveTo(-33,-54); c.lineTo(-33,-60); c.stroke();
    c.fillStyle = Math.cos(a)>0? '#c8ccc4' : '#8a8e86'; c.beginPath(); c.ellipse(-33,-63,Math.abs(w)+0.6,3.2,0,0,6.283); c.fill();
    if (Math.sin(t*3.3)>0.5){ c.fillStyle='#ff4a3a'; c.fillRect(-34,-105,2,2); c.fillRect(27,-85,2,2); }
    bFlag(c, -52, -128, 20, 12, s.trans? '#e84a3a' : s.fac.accent, t, s.trans, -128);
  },
  (c, t, s, dmg, fort) => {                                         // commune solarpunk
    // éolienne hélicoïdale à axe vertical sur la terrasse
    c.strokeStyle='#e8e0cc'; c.lineWidth=1.6; c.beginPath(); c.moveTo(-24,-94); c.lineTo(-24,-127); c.stroke();
    const ph = dmg>=2? 0.6 : t*3.2; c.lineWidth=1.8; c.strokeStyle='#f4ecd8';
    for (let b=0;b<3;b++){ c.beginPath(); for (let k=0;k<=8;k++){ const y=-104-k*2.6, xx=-24+Math.sin(ph+b*2.094+k*0.32)*6; k? c.lineTo(xx,y) : c.moveTo(xx,y); } c.stroke(); }
    c.fillStyle='#c8a040'; c.fillRect(-26,-128,4,2); c.fillRect(-26,-104,4,2);
    bFlag(c, 10, -129, 17, 10, s.trans? '#e84a3a' : s.fac.accent, t, s.trans, -94);
    if (fort>=2 && qFx()){ c.save(); c.globalCompositeOperation='lighter'; c.strokeStyle='rgba(255,211,74,'+(0.16+0.08*Math.sin(t*2))+')'; c.lineWidth=2;
      c.beginPath(); c.arc(-4,-30,96,Math.PI*1.1,-Math.PI*0.1); c.stroke(); c.restore();
      if (fort>=3) for (const px of [-80,66]){ c.fillStyle='rgba(255,230,150,'+(0.6+0.3*Math.sin(t*4+px))+')'; c.beginPath(); c.arc(px,-38,2.6,0,6.283); c.fill(); } }
  },
];
const IA_LIVE = [
  (c, t, s, dmg) => {                                               // conteneurs-serveurs
    const col = FACTIONS.IA.eraCols[0];
    for (let i=0;i<4;i++){ if (dmg>=1 && i===2) continue;
      for (let j=0;j<6;j++){ const on = Math.sin(t*(2.2+i*0.7)+j*1.9+i)>0.1; c.fillStyle = on? col : 'rgba(154,209,212,0.16)';
        c.fillRect(-54+i*11.4+(j%2)*4, -24.6+j*3.6, 2.2, 1.2); } }
    for (const ux of [-32,-14]){ const a=t*14+ux; c.strokeStyle='#8a929c'; c.lineWidth=1.4; c.beginPath();
      c.moveTo(ux+Math.cos(a)*3.4,-63+Math.sin(a)*3.4); c.lineTo(ux-Math.cos(a)*3.4,-63-Math.sin(a)*3.4);
      c.moveTo(ux+Math.cos(a+1.57)*3.4,-63+Math.sin(a+1.57)*3.4); c.lineTo(ux-Math.cos(a+1.57)*3.4,-63-Math.sin(a+1.57)*3.4); c.stroke(); }
    if (Math.sin(t*3)>0.4){ c.fillStyle='#ff3a3a'; c.beginPath(); c.arc(-64,-120,1.6,0,6.283); c.fill(); }   // feu d'obstacle
    bPuffs(c, -66, -32, t, 2, 3, 20, 0.35, 3);                     // échappement du groupe électrogène
    // drapeau-plume ondulant
    const wv=Math.sin(t*2.4)*1.6; c.fillStyle=s.trans? '#ff4ad0' : s.fac.accent;
    c.beginPath(); c.moveTo(56,-40); c.quadraticCurveTo(64+wv,-41, 66+wv,-34); c.lineTo(64+wv*0.6,-12); c.lineTo(56,-12); c.closePath(); c.fill();
    c.fillStyle='rgba(255,255,255,0.75)'; c.fillRect(58,-34,1.4,16);
  },
  (c, t, s, dmg, fort) => {                                         // datacenter
    const col = FACTIONS.IA.eraCols[1];
    for (const ux of [-56,-38]){ const a=t*12+ux; c.strokeStyle='#3a424c'; c.lineWidth=1.3; c.beginPath();
      for (let k=0;k<3;k++){ const b=a+k*2.094; c.moveTo(ux,-51); c.lineTo(ux+Math.cos(b)*3.6,-51+Math.sin(b)*3.6*0.9); } c.stroke(); }
    bSteam(c, -82, -64, t, 4, 6, 34, 0.6, 1);
    // fibres lumineuses : impulsions qui filent vers le hall
    c.fillStyle='rgba(90,208,255,0.35)'; c.fillRect(44,-2.6,36,1.2);
    for (let i=0;i<3;i++){ const ph=((t*0.9+i/3)%1); c.fillStyle=col; c.fillRect(80-ph*36,-3,2.6,2); }
    // drones de maintenance
    for (let i=0;i<2;i++){ const a=t*(0.9+i*0.3)+i*2.4, dx=-26+Math.cos(a)*34+i*20, dy=-66+Math.sin(a*1.6)*8-i*10;
      c.fillStyle='#2a3038'; c.fillRect(dx-3,dy-1,6,2.2); c.strokeStyle='rgba(200,220,240,0.7)'; c.lineWidth=0.8; c.beginPath(); c.moveTo(dx-5,dy-2); c.lineTo(dx-1.6,dy-2); c.moveTo(dx+1.6,dy-2); c.lineTo(dx+5,dy-2); c.stroke();
      if (Math.sin(t*6+i)>0){ c.fillStyle=col; c.fillRect(dx-0.6,dy+0.8,1.2,1.2); } }
  },
  (c, t, s, dmg, fort) => {                                         // campus de verre noir
    const col = FACTIONS.IA.eraCols[2];
    for (let i=0;i<3;i++){ if (Math.sin(t*2.6+i*1.7)>0.3){ c.fillStyle=col; c.fillRect(55+i*8,-19,2,1.4); } }
    if (fort>=2){ c.save(); if (qFx()) c.globalCompositeOperation='lighter';
      for (let k=0;k<3;k++){ c.fillStyle='rgba(255,60,90,'+(0.45+0.25*Math.sin(t*9+k))+')'; c.fillRect(60,-26+k*8,16,0.8); } c.restore(); }
    // hologramme : anneaux et balayage autour de l'œil
    if (qFx()){ c.save(); c.globalCompositeOperation='lighter';
      c.fillStyle='rgba(125,140,255,0.08)'; c.beginPath(); c.moveTo(4,-96); c.lineTo(-10,-120); c.lineTo(18,-120); c.closePath(); c.fill();
      for (let i=0;i<2;i++){ c.strokeStyle='rgba(150,160,255,'+(0.35-i*0.12)+')'; c.lineWidth=1; c.beginPath(); c.ellipse(4,-112,16+i*6+Math.sin(t*2+i)*1.5,4+i*1.5,0,0,6.283); c.stroke(); }
      c.restore(); }
  },
  (c, t, s, dmg, fort) => {                                         // arcologie
    const col = FACTIONS.IA.eraCols[3];
    c.save(); if (qFx()) c.globalCompositeOperation='lighter';
    c.fillStyle='rgba(180,74,255,'+(0.25+0.2*Math.sin(t*3))+')'; c.beginPath(); c.arc(70,-61,2.4,0,6.283); c.fill(); c.beginPath(); c.arc(64,-51,2,0,6.283); c.fill();
    if (fort>=2){ c.strokeStyle='rgba(180,74,255,'+(0.18+0.08*Math.sin(t*2))+')'; c.lineWidth=1.6; c.beginPath(); c.arc(-4,-30,100,Math.PI*1.1,-Math.PI*0.1); c.stroke();
      c.lineWidth=0.7; for (let i=0;i<9;i++){ const a=Math.PI*1.12+i*0.095*Math.PI*0.84; c.beginPath(); c.moveTo(-4+Math.cos(a)*96,-30+Math.sin(a)*96); c.lineTo(-4+Math.cos(a)*104,-30+Math.sin(a)*104); c.stroke(); } }
    c.restore();
  },
  (c, t, s, dmg, fort) => {                                         // singularité
    const col = s.trans? '#ffffff' : FACTIONS.IA.eraCols[4];
    c.save(); if (qFx()) c.globalCompositeOperation='lighter';
    c.fillStyle=rgbaC(col, 0.18+0.1*Math.sin(t*4)); c.fillRect(-3,-40,6,32);
    c.fillStyle=rgbaC(col, 0.5); c.fillRect(-0.8,-40,1.6,32);
    c.restore();
    for (let i=0;i<5+fort;i++){ const a=t*0.8+i*6.283/(5+fort), rx=Math.cos(a)*58, ry=-78+Math.sin(a)*14, sz=3+((i*7)%3);
      c.fillStyle = Math.sin(a)>0? rgbaC(col,0.9) : rgbaC(col,0.45); c.beginPath(); c.moveTo(rx,ry-sz); c.lineTo(rx+sz*0.8,ry+sz*0.6); c.lineTo(rx-sz*0.8,ry+sz*0.6); c.closePath(); c.fill(); }
  },
];
// caméra / œil scrutateur : position (repère base) par ère, suit le front
const IA_EYE = [[20,-100,'cam'],[0,-110,'eye'],[6,-112,'eye'],[-4,-112,'eye'],[0,-86,'eye']];
const eyeGlow = col => fxSprite('EYEG'+col, 24, 24, g => { const r=g.createRadialGradient(12,12,1,12,12,12);
  r.addColorStop(0,rgbaC(col,0.9)); r.addColorStop(0.4,rgbaC(col,0.45)); r.addColorStop(1,rgbaC(col,0)); g.fillStyle=r; g.fillRect(0,0,24,24); });
function drawIAEye(c, s, t, d, ex, ey, kind){
  let frontX = s.x - d*200;
  for (const u of game.p.units) if (Math.abs(u.x-s.x)<500) frontX=u.x;
  for (const u of game.e.units) if (Math.abs(u.x-s.x)<500) frontX=u.x;
  const look = clamp((frontX-s.x)*d/500,-1,1), col = s.trans? '#ff4ad0' : s.fac.accent;
  if (kind==='cam'){                                                // caméra dôme sur potence, qui pivote
    c.strokeStyle='#8a9096'; c.lineWidth=1.4; c.beginPath(); c.moveTo(ex,ey+14); c.lineTo(ex,ey); c.lineTo(ex+4,ey); c.stroke();
    c.save(); c.translate(ex+4, ey+1); c.rotate(0.25 - look*0.35);
    c.fillStyle='#d8dde2'; c.fillRect(-1,-2.6,10,5.2); c.fillStyle='#1a2028'; c.fillRect(8,-2,2.6,4);
    c.fillStyle = col; c.beginPath(); c.arc(9.6,0,1.2,0,6.283); c.fill(); c.restore();
    return;
  }
  const lx = look*4;
  c.fillStyle='#cfe0ee'; rr(ex-12, ey-7, 24, 14, 6); c.fill();
  if (qFx()){ c.save(); c.globalCompositeOperation='lighter'; c.drawImage(eyeGlow(col), ex+lx-12, ey-12, 24, 24); c.restore(); }   // halo cuit (pas de shadowBlur par image)
  c.fillStyle=col; c.beginPath(); c.arc(ex+lx,ey,4.6,0,6.283); c.fill();
  c.fillStyle='#0a1018'; c.beginPath(); c.arc(ex+lx,ey,2,0,6.283); c.fill();
}

/* ---- garnison du QG : silhouettes au poste de guet, arme pointée vers l'ennemi ---- */
const HUM_GAR_HAT = ['#1e1c22','#c8302a','#5a6b3f','#4a4e5a','#e8dcc0'];   // cagoule, casquette, casque, casque à visière, casque clair
function drawBaseGarrison(s, x, gy, d, deck){
  const n = s.gar.length; if (!n) return;
  const hum = s.facKey==='HUM';
  for (let gi=0; gi<n; gi++){
    const g = s.gar[gi] || {}, era = g.era!=null? g.era : s.era, gx = x + (gi-(n-1)/2)*10, top = gy + deck;
    const bob = Math.sin((g.bob||gi)*0.6)*0.5, hy = top - 4 + bob;
    const recoil = g.atkT!=null && g.rate!=null && g.atkT > g.rate-0.12;
    const col = (FACTIONS[g.fac||s.facKey]||s.fac).eraCols[clamp(era,0,4)];
    // épaules + tête
    ctx.fillStyle = hum? shade(col,0.8) : '#3a4450'; ctx.beginPath(); ctx.ellipse(gx, top+1.5+bob, 4.4, 3, 0, Math.PI, 0); ctx.fill();
    if (hum){ ctx.fillStyle='#d8a880'; ctx.beginPath(); ctx.arc(gx, hy, 2.9, 0, 6.283); ctx.fill();
      ctx.fillStyle=HUM_GAR_HAT[clamp(era,0,4)]; ctx.beginPath(); ctx.arc(gx, hy-0.6, 3.2, Math.PI, 0); ctx.fill();
      if (era===0){ ctx.fillRect(gx-3.2, hy-0.8, 6.4, 1.6); } }
    else { ctx.fillStyle='#d8e4ee'; rr(gx-3.2, hy-3.2, 6.4, 6, 2); ctx.fill();
      ctx.fillStyle=col; ctx.fillRect(gx-0.4+d*0.8, hy-1.4, 2.6*d, 1.6); }
    // arme
    const siege = g.role==='siege', ang = siege? -0.45 : -0.06, L = siege? 9 : 10;
    ctx.strokeStyle = siege? '#5a5a52' : '#24242a'; ctx.lineWidth = siege? 2.6 : 1.7; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(gx+d*1.5, top-1+bob); ctx.lineTo(gx+d*(1.5+L*Math.cos(ang)), top-1+bob+L*Math.sin(ang)); ctx.stroke();
    if (recoil){ ctx.fillStyle = hum? '#ffd34a' : '#bff'; ctx.beginPath(); ctx.arc(gx+d*(2+L*Math.cos(ang)), top-1+bob+L*Math.sin(ang), 2.4, 0, 6.283); ctx.fill(); }
  }
}

// MÉMOIRE : les variantes de dégâts de l'état courant restent cuites (les PV oscillent autour d'un
// seuil pendant les réparations) ; une ère ou une fortification dépassée est oubliée, dégâts compris.
function basePurge(old, cur){
  if (cur && old.era===cur.era && old.trans===cur.trans && old.fort===cur.fort) return;
  const pre = 'BASE'+old.fk+old.era+(old.trans?'T':'')+old.fort+'d';
  for (const k of [...SPR.keys()]) if (k.startsWith(pre) && k.indexOf(old.mir? 'M@' : 'd'+k[pre.length]+'@')>=0) SPR.delete(k);
}
function drawBase(side){
  const x = side.x-camX; if (x<-170||x>VW()+170) return;
  const t = game.t, era = clamp(side.era||0,0,4), hum = side.facKey==='HUM', d = side.side, fk = side.facKey;
  const col = side.fac.accent, gy = gY(side.x), fort = clamp(side.fortLvl||1, 1, 3);
  const frac = side.maxhp>0? clamp(side.hp/side.maxhp,0,1) : 1, dmg = frac<0.33? 2 : frac<0.66? 1 : 0;
  const trans = !!side.trans, mir = d<0, meta = baseMeta(fk, era);
  const key = 'BASE'+fk+era+(trans?'T':'')+fort+'d'+dmg+(mir?'M':'');
  // CHANGEMENT D'ÉTAT : l'ancienne base s'efface pendant que la nouvelle se bâtit (ère) ou se fond (fort/dégâts)
  const prev = side._bs;
  if (!prev || prev.key!==key){
    if (prev){ if (side._btr) basePurge(side._btr, side._bs);
      side._btr = { key:prev.key, fk:prev.fk, era:prev.era, trans:prev.trans, fort:prev.fort, dmg:prev.dmg, mir:prev.mir, t0:t,
        dur: (prev.era!==era || prev.trans!==trans)? 1.5 : 0.45, build: prev.era!==era || prev.trans!==trans };
      // nuage de gravats au changement d'état — hachage déterministe : le rendu ne consomme JAMAIS
      // Math.random (les tests et la simulation rejouent une suite aléatoire graine fixe)
      if (dmg>prev.dmg && qFx() && particles.length<440) for (let i=0;i<8;i++){ const h = k2 => lhash(i*5+k2, t);
        particles.push({k:'u', x:side.x+(h(0)-0.5)*90, y:gy-4, vx:(h(1)-0.5)*50, vy:-10-h(2)*20, g:-4, dr:1.4, life:0.8+h(3)*0.4, t:0, r:5+h(4)*4}); } }
    side._bs = { key, fk, era, trans, fort, dmg, mir };
  }
  const spr = sprite(key, BASP.W, BASP.H, ()=>baseSprite(fk, era, trans, fort, dmg, mir));
  projShadow(x, gy, 58);
  const trn = side._btr; let k = 1;
  if (trn){ k = (t-trn.t0)/trn.dur; if (!(k>=0 && k<1)){ basePurge(trn, side._bs); side._btr = null; k = 1; } }
  const X0 = x-BASP.cx, Y0 = gy-BASP.G;
  if (trn && k<1){
    const old = sprite(trn.key, BASP.W, BASP.H, ()=>baseSprite(trn.fk, trn.era, trn.trans, trn.fort, trn.dmg, trn.mir));
    if (trn.build){                                                // la nouvelle époque monte du sol, l'ancienne s'efface
      const e = k*k*(3-2*k), hh = BASP.H*e;
      ctx.globalAlpha = 1-e; ctx.drawImage(old, X0, Y0, BASP.W, BASP.H); ctx.globalAlpha = 1;
      ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0+BASP.H-hh, BASP.W, hh); ctx.clip(); ctx.drawImage(spr, X0, Y0, BASP.W, BASP.H); ctx.restore();
      const ly = Y0+BASP.H-hh, PF = puffSprites();                   // front de chantier : poussière et étincelles
      for (let i=0;i<7;i++){ const px = x-80+i*27+Math.sin(t*5+i)*4, r = 9+lhash(i,3)*6;
        ctx.globalAlpha = 0.55*(1-e*0.6); ctx.drawImage(PF.dust, px-r, ly-r, r*2, r*2); }
      ctx.globalAlpha = 1; ctx.fillStyle = rgbaC(col, 0.8*(1-e)); ctx.fillRect(X0+10, ly-0.8, BASP.W-20, 1.6);
    } else { ctx.drawImage(spr, X0, Y0, BASP.W, BASP.H); ctx.globalAlpha = 1-k; ctx.drawImage(old, X0, Y0, BASP.W, BASP.H); ctx.globalAlpha = 1; }
  } else ctx.drawImage(spr, X0, Y0, BASP.W, BASP.H);
  // vivant : drapeaux, rotors, feux, LED, fumées
  ctx.save(); ctx.translate(x, gy); ctx.scale(d, 1);
  const LV = hum? HUM_LIVE : IA_LIVE; LV[Math.min(era, LV.length-1)](ctx, t, side, dmg, fort);
  if (!hum){ const E = IA_EYE[era]; drawIAEye(ctx, side, t, d, E[0], E[1], E[2]); }
  ctx.restore();
  drawBaseGarrison(side, x, gy, d, meta.deck);
  // nano-réparation : ouvriers (HUM) / drones (IA)
  if (side.autoRepair){
    if (hum){ for (let i=0;i<2;i++){ const wx=x+Math.sin(t*0.7+i*2.6)*52, wy=gy-1;
      ctx.fillStyle='#caa84a'; ctx.beginPath(); ctx.arc(wx,wy-12,2.6,0,6.283); ctx.fill(); ctx.fillStyle='#8a6a3a'; ctx.fillRect(wx-2,wy-10,4,8);
      if (Math.sin(t*8+i)>0.5){ ctx.fillStyle='#ffd34a'; ctx.fillRect(wx+2,wy-13,2,2); } } }
    else { for (let i=0;i<2;i++){ const a=t*1.4+i*3.14, dx2=Math.cos(a)*46, dy2=-58+Math.sin(a*1.7)*16;
      ctx.fillStyle='#5ad0ff'; ctx.beginPath(); ctx.moveTo(x+dx2+4,gy+dy2); ctx.lineTo(x+dx2,gy+dy2-3); ctx.lineTo(x+dx2-4,gy+dy2); ctx.lineTo(x+dx2,gy+dy2+3); ctx.closePath(); ctx.fill(); } }
  }
  // base amochée : panaches de fumée puis flammes, aux points sensibles de CHAQUE base
  if (frac<0.55){ const S = meta.smoke; for (let i=0;i<S.length;i++) dmgSmoke(x+S[i][0]*d, gy+S[i][1], frac, t, side.x+i*31); }
  const w=110, by=gy-140;
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(x-w/2,by,w,8);
  ctx.fillStyle=col; ctx.fillRect(x-w/2,by,w*frac,8);
  ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1; ctx.strokeRect(x-w/2,by,w,8);
  if (side===game.p && frac<0.95){
    ctx.font=HF(12); ctx.textAlign='center';
    ctx.fillStyle='rgba(255,255,255,'+(0.5+0.3*Math.sin(t*3))+')';
    ctx.fillText(tr('hud_tap_repair'), x, by-10);
  }
}
// NUIT (lieux sombres de campagne) : fenêtres, braseros et écrans des bases percent l'obscurité.
// Appelée APRÈS le voile sombre (14-loop) : halos additifs cuits, une poignée par base.
function drawBaseGlow(){
  const B = game && game.biome; if (!B || !qFx()) return;
  const dk = typeof B.dark==='function'? B.dark() : (B.dark||0); if (!(dk>0.05)) return;
  const t = game.t;
  ctx.save(); ctx.translate(0, zTY()); ctx.scale(zoom, zoom); ctx.globalCompositeOperation='lighter';
  for (const s of [game.p, game.e]){
    const x = s.x-camX; if (x<-170||x>VW()+170) continue;
    const gy = gY(s.x), m = baseMeta(s.facKey, clamp(s.era||0,0,4));
    for (const L of m.lights){ const fl = L[4]? 0.75+0.25*Math.sin(t*9+L[0]) : 1, r = L[2];
      ctx.globalAlpha = Math.min(1, dk*1.3)*fl; ctx.drawImage(lightSprite(L[3]), x+L[0]*s.side-r, gy+L[1]-r, r*2, r*2); }
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
let SLOT_LABELS = [];   // libellés de socles posés cette frame (anti-chevauchement)
function drawSlot(slot, side, neutral){
  const x = slot.x-camX; if (x<-60||x>VW()+60) return;
  const gy = gY(slot.x), t = game.t;
  const owner = neutral? slot.owner : side;
  if (!slot.b){
    const canB = neutral? true : side===game.p;
    const ac = neutral? '#e8d8a0' : '#f0e6c8';
    // EMPLACEMENT (v1.14) : tracé à la chaux au sol + piquet d'arpenteur et son panonceau « + »
    // (objets posés dans le décor — plus d'anneau lumineux ni de symbole flottant)
    ctx.save();
    ctx.strokeStyle = rgbaC(ac, canB? 0.8 : 0.3); ctx.lineWidth = 1.8; ctx.setLineDash([5,4]);
    ctx.beginPath(); ctx.ellipse(x, gy+1, 24, 8, 0, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
    if (canB){
      const sw = Math.sin(t*1.7+slot.x)*0.07;
      ctx.fillStyle='rgba(8,6,10,0.28)'; ctx.beginPath(); ctx.ellipse(x+5, gy+2, 9, 2.4, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle='#5a4630'; ctx.lineWidth=2.6; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(x, gy+1); ctx.lineTo(x, gy-30); ctx.stroke();                 // piquet
      ctx.strokeStyle='#7a6244'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x-0.8, gy-2); ctx.lineTo(x-0.8, gy-29); ctx.stroke();
      ctx.translate(x, gy-29); ctx.rotate(sw);                                                    // panonceau qui se balance
      ctx.fillStyle='rgba(8,6,10,0.3)'; ctx.fillRect(-8.5, 1.5, 19, 15);
      ctx.fillStyle=ac; ctx.fillRect(-10, 0, 19, 15);
      ctx.fillStyle='rgba(120,90,50,0.25)'; ctx.fillRect(-10, 11, 19, 4);
      ctx.strokeStyle='#2a2018'; ctx.lineWidth=2.4; ctx.lineCap='butt';
      ctx.beginPath(); ctx.moveTo(-5, 7.5); ctx.lineTo(4, 7.5); ctx.moveTo(-0.5, 3); ctx.lineTo(-0.5, 12); ctx.stroke();
      ctx.fillStyle='#3a2c1e'; ctx.fillRect(-1.2, -1.5, 2.4, 3);                                  // clou
    }
    ctx.restore();
    if (canB){
      // ÉTIQUETTE anti-chevauchement : des socles côte à côte (éco de base, tuto) partageaient
      // le même texte illisible — on n'écrit le libellé que si aucun voisin ne l'a déjà posé.
      if (SLOT_LABELS.every(lx=>Math.abs(lx-slot.x)>=90)){
        SLOT_LABELS.push(slot.x);
        const lb = neutral?tr('free_land'):tr('build_here');
        ctx.font=HF(9); ctx.textAlign='center'; ctx.lineJoin='round'; ctx.strokeStyle='rgba(14,10,12,0.7)'; ctx.lineWidth=2.6;
        ctx.strokeText(lb, x, gy-40); ctx.fillStyle=ac; ctx.fillText(lb, x, gy-40);
      }
    }
    return;
  }
  const b=slot.b, facKey = owner.facKey, fac = owner.fac;
  if (b.type==='site'){
    ctx.strokeStyle='#8a7a5a'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x-14,gy); ctx.lineTo(x+10,gy-34); ctx.moveTo(x+14,gy); ctx.lineTo(x-10,gy-34); ctx.stroke();
    ctx.strokeStyle='#6a5a3e'; ctx.beginPath(); ctx.moveTo(x-16,gy-18); ctx.lineTo(x+16,gy-18); ctx.stroke();
    ctx.font=HF(12); ctx.textAlign='center'; ctx.fillStyle='#e8d8a0'; ctx.fillText('🚧', x, gy-42);
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
      if (inten>0.9){ ctx.fillStyle='rgba(255,228,130,0.9)'; ctx.font=HF(9); ctx.textAlign='center';
        ctx.fillText('✦', x, gy-bh3-30); }
    }
  }
  // niveau et garnison
  if ((b.lvl||1)>1){ ctx.font=HF(10); ctx.textAlign='center';
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
    ctx.font=HF(11); ctx.textAlign='center';
    ctx.fillStyle='#fff'; ctx.fillText('🚪'+b.gar.length, x+20, gy-bldH(b)-12);
  }
  const frac = clamp(b.hp/b.maxhp,0,1);
  // DÉGÂTS VISIBLES (v1.13) : lézardes sous 60 % de PV, davantage sous 30 %, et sol noirci
  if (frac<0.6 && qFx()){ const bh4 = bldH(b), n = frac<0.3? 4 : 2; ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.strokeStyle='rgba(12,8,10,0.7)'; ctx.lineWidth=1.4;
    for (let i=0;i<n;i++){ let cx = x-12+i*8+lhash(i,slot.x)*5, cy = gy-3-lhash(i,slot.x+3)*bh4*0.25; ctx.beginPath(); ctx.moveTo(cx,cy);
      for (let k=0;k<4;k++){ cx += (lhash(i*7+k,slot.x+5)-0.5)*7; cy -= bh4*(0.1+lhash(i*5+k,9)*0.08); ctx.lineTo(cx,cy); }
      ctx.stroke(); }
    ctx.fillStyle='rgba(14,10,10,'+(0.28*(1-frac/0.6)).toFixed(3)+')'; ctx.beginPath(); ctx.ellipse(x, gy+1, 26, 4.5, 0, 0, 6.283); ctx.fill();
    ctx.restore(); }
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
