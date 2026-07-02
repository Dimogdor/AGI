/* ================= RENDU ================= */
const SKY_T=[[126,190,228],[224,138,78],[42,36,48]], SKY_B=[[235,222,180],[120,70,60],[24,20,26]];
const GRASS=[[116,160,82],[150,120,60],[70,58,50]], DIRT=[[92,74,52],[80,60,44],[48,40,36]];
function devLerp(arr){
  const d=game?game.dev:0;
  return d<0.5? lerpColArr(arr[0],arr[1],d*2) : lerpColArr(arr[1],arr[2],(d-0.5)*2);
}
function lerpColArr(c1,c2,t){ return [lerp(c1[0],c2[0],t),lerp(c1[1],c2[1],t),lerp(c1[2],c2[2],t)]; }
const colS = c => 'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')';
function rr(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

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
function sprite(key, w, h, draw){
  const SS = spriteSS(), k = key+'@'+SS;
  let s = SPR.get(k);
  if (!s){ s=document.createElement('canvas'); s.width=Math.ceil(w*SS); s.height=Math.ceil(h*SS);
    const c=s.getContext('2d'); c.imageSmoothingEnabled=true; c.scale(SS,SS);
    const prev=TC; TC=c; draw(c, s); TC=prev; SPR.set(k,s); }
  return s;
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
  ctx.fillStyle='rgba(16,13,12,0.85)'; rr(INTRO_SKIP.x,INTRO_SKIP.y,INTRO_SKIP.w,INTRO_SKIP.h,5); ctx.fill();
  ctx.strokeStyle='#4a3a32'; ctx.lineWidth=1; rr(INTRO_SKIP.x,INTRO_SKIP.y,INTRO_SKIP.w,INTRO_SKIP.h,5); ctx.stroke();
  ctx.font='700 12px Arial'; ctx.textAlign='center'; ctx.fillStyle='#b8b0a4';
  ctx.fillText(_t('skip')+' ▸', INTRO_SKIP.x+INTRO_SKIP.w/2, INTRO_SKIP.y+INTRO_SKIP.h/2+1);
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
  ctx.textAlign='left'; ctx.fillText('▼ HUMANITY −'+(38+Math.floor(8*Math.sin(t*0.7))) +'%', 16, 108);
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
  const top=devLerp(SKY_T), bot=devLerp(SKY_B);
  // ciel dégradé
  const sky=ctx.createLinearGradient(0,-H,0,GROUND); sky.addColorStop(0,colS(top)); sky.addColorStop(1,colS(bot));
  ctx.fillStyle=sky; ctx.fillRect(0,-H,vw,GROUND+H);
  // (Anciens « éclairs d'ambiance » retirés : ils provoquaient un scintillement intempestif
  //  de l'arrière-plan pendant les batailles. Le ciel reste désormais stable.)
  // astres / cendres (additif)
  ctx.save(); ctx.globalCompositeOperation='lighter';
  if (dev>0.4){ ctx.fillStyle='rgba(255,90,60,0.5)';
    for (let i=0;i<30;i++){ const ax=(i*173+t*14+i*i*7)%vw, ay=(t*30+i*97)%GROUND; ctx.fillRect(ax,ay,2,2); } }
  else { ctx.fillStyle='rgba(255,255,255,0.7)';
    for (let i=0;i<16;i++){ const sx=(i*257)%vw, sy=(i*113)%150; ctx.beginPath(); ctx.arc(sx,sy,1.2,0,6.283); ctx.fill(); } }
  ctx.restore();
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
  const sg=ctx.createRadialGradient(sunX,sunY,4,sunX,sunY,130);
  sg.addColorStop(0,rgbaC(sunC,0.9)); sg.addColorStop(0.18,rgbaC(sunC,0.5)); sg.addColorStop(1,rgbaC(sunC,0));
  ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(sunX,sunY,130,0,6.283); ctx.fill();
  ctx.fillStyle=rgbaC(sunC,1); ctx.beginPath(); ctx.arc(sunX,sunY,26,0,6.283); ctx.fill();
  // rayons divins : faisceaux doux descendant du soleil, animés lentement (s'estompent
  // quand le monde agonise). Restent dans le bloc additif « lighter ».
  const rayA = 0.085*(1-dev*0.55);
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
  // nuages dérivants (parallaxe douce) — profondeur du ciel ; cendres si le monde agonise
  ctx.save(); ctx.globalCompositeOperation = dev>0.55? 'source-over':'lighter';
  for (let i=0;i<5;i++){
    const cw=120+i*46, drift=(t*(6+i*3)+i*900) % (vw+cw*2)-cw, cx=drift - (camX*0.08)%(vw+cw*2);
    const cy=46+((i*53)%70), al=(dev>0.55? 0.12+dev*0.12 : 0.10)*(1-i*0.07);
    const col = dev>0.55? '50,46,54' : '255,255,255';
    const g=ctx.createRadialGradient(cx,cy,4,cx,cy,cw*0.6);
    g.addColorStop(0,'rgba('+col+','+al+')'); g.addColorStop(1,'rgba('+col+',0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(cx,cy,cw*0.6,cw*0.22,0,0,6.283); ctx.fill();
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
  // MONTAGNES LOINTAINES (parallaxe la plus lente, fortement embrumées) → profondeur du décor
  drawFarRange(vw, bot, dev, t);
  // collines avec brume de profondeur (3 plans)
  hill(0.18, GROUND-130, 90, lerpColArr(devLerp(GRASS),bot,0.7), vw);
  hill(0.32, GROUND-95,  70, lerpColArr(devLerp(GRASS),bot,0.5), vw);
  hill(0.5,  GROUND-55,  50, lerpColArr(devLerp(GRASS),bot,0.32), vw);
  drawCity(dev);
  // voile de brume à l'horizon
  const haze=ctx.createLinearGradient(0,GROUND-120,0,GROUND);
  haze.addColorStop(0,rgbaC(bot,0)); haze.addColorStop(1,rgbaC(bot,0.4));
  ctx.fillStyle=haze; ctx.fillRect(0,GROUND-120,vw,120);
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
  // HERBE DYNAMIQUE : touffes qui ondulent au vent et se couchent au passage des unités lourdes.
  if (qFx() && game){
    const heavies=[];
    for (const u of game.p.units) if(!u.fly && (u.role==='tank'||u.role==='siege'||u.role==='hero')) heavies.push(u.x);
    for (const u of game.e.units) if(!u.fly && (u.role==='tank'||u.role==='siege'||u.role==='hero')) heavies.push(u.x);
    ctx.strokeStyle=rgbaC(shade(grass,1.3),0.45); ctx.lineWidth=1.4;
    const step = SETTINGS.quality==='ultra'?26 : SETTINGS.quality==='high'?34 : 48;
    for (let sx=10; sx<=vw; sx+=step){
      const wx=sx+camX, by=gY(wx);
      let bend = Math.sin(wx*0.05+t*1.6)*2;
      for (const hx of heavies){ const dlt=wx-hx; if (Math.abs(dlt)<34) bend += Math.sign(dlt||1)*(34-Math.abs(dlt))*0.45; }
      ctx.beginPath(); ctx.moveTo(sx, by); ctx.quadraticCurveTo(sx+bend*0.5, by-7, sx+bend, by-11); ctx.stroke();
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
function drawFarRange(vw, bot, dev, t){
  const off = camX*0.04, base = GROUND-150, amp = 150;
  const col = lerpColArr(devLerp(GRASS), bot, 0.86);
  ctx.beginPath(); ctx.moveTo(0,GROUND);
  const pts=[];
  for (let x=0;x<=vw;x+=24){ const wx=x+off;
    const h = (Math.abs(Math.sin(wx*0.0016))*amp + Math.abs(Math.sin(wx*0.0041+1.7))*amp*0.5);
    const y = base - h; pts.push([x,y]); x===0?ctx.moveTo(0,y):ctx.lineTo(x,y); }
  ctx.lineTo(vw,GROUND); ctx.lineTo(0,GROUND); ctx.closePath();
  const g=ctx.createLinearGradient(0,base-amp,0,base+30);
  g.addColorStop(0,shade('rgb('+(col[0]|0)+','+(col[1]|0)+','+(col[2]|0)+')',1.16));
  g.addColorStop(1,colS(col));
  ctx.fillStyle=g; ctx.fill();
  // neige / givre sur les crêtes (s'efface quand le monde meurt)
  if (dev<0.55){ ctx.save(); ctx.globalAlpha=0.5*(1-dev*1.6>0?1-dev*1.6:0); ctx.strokeStyle='rgba(236,244,255,0.9)'; ctx.lineWidth=2;
    ctx.beginPath(); for(let i=0;i<pts.length;i++){ const p=pts[i]; i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]); } ctx.stroke(); ctx.restore(); }
}
function hill(par, base, amp, col, vw){
  const off = camX*par;
  ctx.beginPath(); ctx.moveTo(0,GROUND);
  for (let x=0;x<=vw;x+=18){ const wx=x+off; ctx.lineTo(x, base-Math.abs(Math.sin(wx*0.004))*amp-Math.sin(wx*0.011)*amp*0.3); }
  ctx.lineTo(vw,GROUND); ctx.closePath();
  const g=ctx.createLinearGradient(0,base-amp,0,GROUND); g.addColorStop(0,shade(col,1.14)); g.addColorStop(1,colS(col));
  ctx.fillStyle=g; ctx.fill();
}
function drawCity(dev){
  const par=0.7, vw=VW(), t=game?game.t:0;
  ctx.save(); ctx.translate(-camX*par,0);
  for (let i=0;i<7;i++){
    const bx=40+i*54, bw=34, bh=60+((i*37)%70); if (bx-camX*par>vw+60||bx-camX*par<-90) continue;
    const body=mix([46,44,60],[22,20,30],dev);
    const g=ctx.createLinearGradient(bx,GROUND-bh,bx,GROUND); g.addColorStop(0,shade(body,1.25)); g.addColorStop(1,shade(body,0.7));
    ctx.fillStyle=g; ctx.fillRect(bx,GROUND-bh,bw,bh);
    if (dev<0.7){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,210,130,'+(0.5-dev*0.5)+')';
      for(let wy=0;wy<bh-14;wy+=14) for(let wxn=0;wxn<2;wxn++) if((i+wy+wxn)%3) ctx.fillRect(bx+6+wxn*14,GROUND-bh+8+wy,5,6); ctx.restore(); }
  }
  for (let i=0;i<6;i++){
    const bx=WORLD*par-380+i*60, bh=50+((i*53)%60);
    const body=mix([34,44,60],[18,24,36],dev);
    const g=ctx.createLinearGradient(bx,GROUND-bh,bx,GROUND); g.addColorStop(0,shade(body,1.25)); g.addColorStop(1,shade(body,0.7));
    ctx.fillStyle=g; ctx.fillRect(bx,GROUND-bh,40,bh);
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(90,208,255,'+(0.35+0.2*Math.sin(t*2+i))+')';
    for(let wy=6;wy<bh-6;wy+=12) ctx.fillRect(bx+5,GROUND-bh+wy,30,2); ctx.restore();
  }
  ctx.restore();
}
function drawTree(tr, dev, t, vw){
  const x=tr.x-camX; if (x<-50||x>vw+50) return;
  const y=gY(tr.x), s=tr.s, sway=Math.sin(t*0.8+tr.ph)*2*s*(1-dev), bark=mix([96,70,46],[50,42,38],dev);
  if (dev<0.78) projShadow(x, y, 16*s);          // ombre portée de l'arbre
  // arbres nettement plus GRANDS que l'infanterie (cohérence d'échelle)
  ctx.strokeStyle=bark; ctx.lineWidth=6*s; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x,y+2); ctx.quadraticCurveTo(x+sway*0.5,y-34*s,x+sway,y-62*s); ctx.stroke();
  if (dev<0.78){
    const leaf=lerpColArr(devLerp(GRASS),[120,90,50],dev*0.7), cx=x+sway, cy=y-70*s, r=25*s*(1-dev*0.55);
    const g=ctx.createRadialGradient(cx-r*0.3,cy-r*0.3,2,cx,cy,r*1.5);
    g.addColorStop(0,shade(leaf,1.3)); g.addColorStop(1,shade(leaf,0.65));
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,6.283); ctx.arc(cx-r*0.62,cy+r*0.3,r*0.72,0,6.283); ctx.arc(cx+r*0.62,cy+r*0.22,r*0.78,0,6.283); ctx.arc(cx,cy-r*0.5,r*0.62,0,6.283); ctx.fill();
  } else { ctx.lineWidth=3*s; ctx.beginPath(); ctx.moveTo(x+sway,y-62*s); ctx.lineTo(x+sway-13*s,y-76*s);
    ctx.moveTo(x+sway,y-54*s); ctx.lineTo(x+sway+14*s,y-70*s); ctx.stroke(); }
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
function bloomT(col,b,fn){ TC.save(); TC.globalCompositeOperation='lighter'; TC.shadowColor=col; TC.shadowBlur=b; fn(); TC.restore(); }
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

/* ---- sprites d'unités mis en cache (corps humanoïde sculpté + néon) ---- */
const USP = { W:80, H:84, cx:40, foot:68 };
function drawUnitSprite(kind, fac, role, era, trans){
  const isBot = kind==='bot', acc = FACTIONS[fac].accent, body = FACTIONS[fac].eraCols[era];
  const pants = isBot? '#28323e' : shade(body,0.55), cx=USP.cx, F=USP.foot;
  const tw = role==='tank'? 26 : role==='siege'? 20 : 17;   // silhouettes plus fines/élégantes
  // jambes
  sculptT(cx-9, F-22, 7, 22, 3, pants); sculptT(cx+2, F-22, 7, 22, 3, pants);   // jambes affinées
  // torse sculpté + liseré néon de faction
  sculptT(cx-tw/2, F-50, tw, 30, isBot?10:7, body, acc);
  bloomT(acc,8,()=>{ TC.fillStyle=acc; if(isBot){ TC.fillRect(cx-2,F-44,4,13);} else { rrectT(cx-tw/2+3,F-46,tw-6,3,1); TC.fill(); } });
  if (role==='tank'){ TC.fillStyle='rgba(0,0,0,0.25)'; rrectT(cx-tw/2,F-30,tw,6,2); TC.fill();
    sculptT(cx-5,F-44,10,10,3,FACTIONS[fac].eraCols[era]); }
  // tête
  if (isBot){
    sculptT(cx-10, F-66, 20, 18, 7, shade(body,1.08), acc);
    TC.fillStyle='#0a141d'; rrectT(cx-7, F-60, 14, 7, 3); TC.fill();
    bloomT(acc,10,()=>{ TC.fillStyle=acc; TC.beginPath(); TC.arc(cx-3,F-56,2.2,0,6.283); TC.arc(cx+3,F-56,2.2,0,6.283); TC.fill(); });
    TC.strokeStyle=shade(body,1.2); TC.lineWidth=2; TC.beginPath(); TC.moveTo(cx,F-66); TC.lineTo(cx,F-73); TC.stroke();
  } else {
    TC.fillStyle=rgrad(cx-3, F-62, 12, [[0,'#f6d8b2'],[1,'#b98a5c']]); TC.beginPath(); TC.arc(cx,F-58,9,0,6.283); TC.fill();
    if (era===0){ TC.fillStyle=lgrad(cx-9,F-72,cx+9,F-64,[[0,shade(acc,1.2)],[1,shade(acc,0.7)]]); rrectT(cx-9,F-72,18,7,3); TC.fill(); TC.fillRect(cx+4,F-69,8,3); }
    else if (era===1){ TC.fillStyle=lgrad(cx-10,F-74,cx+10,F-64,[[0,'#5a6650'],[1,'#2f3a2a']]); TC.beginPath(); TC.arc(cx,F-62,11,Math.PI*1.04,-0.04); TC.fill(); }
    else if (era===2){ TC.fillStyle=lgrad(cx-10,F-74,cx+10,F-64,[[0,'#3a4658'],[1,'#222c3a']]); TC.beginPath(); TC.arc(cx,F-62,11,Math.PI*1.04,-0.04); TC.fill();
      bloomT('#7fd8ff',7,()=>{ TC.fillStyle='#7fd8ff'; rrectT(cx-6,F-60,13,3,1); TC.fill(); }); }
    else if (era===3){ TC.fillStyle=lgrad(cx-11,F-76,cx+11,F-62,[[0,'#4a3a64'],[1,'#241c34']]); rrectT(cx-11,F-76,22,16,7); TC.fill();
      bloomT('#ffd34a',7,()=>{ TC.fillStyle='#ffd34a'; rrectT(cx-6,F-60,13,3,1); TC.fill(); }); }
    else { TC.fillStyle=lgrad(cx-10,F-72,cx+10,F-64,[[0,'#fff0c0'],[1,'#d8b048']]); TC.beginPath(); TC.arc(cx,F-62,10,Math.PI*1.04,-0.04); TC.fill();
      bloomT('#ffe9a0',9,()=>{ TC.strokeStyle=rgbaC('#ffe9a0',0.9); TC.lineWidth=2; TC.beginPath(); TC.arc(cx,F-74,9,0,6.283); TC.stroke(); }); }
    TC.fillStyle='#241c2a'; TC.beginPath(); TC.arc(cx+4,F-58,1.8,0,6.283); TC.fill();
  }
  // arme par rôle
  const ax=cx+tw/2-2, ay=F-40, wc = era>=3? '#e8d8a0' : '#cdd4de';
  if (role==='melee'){
    if (isBot){ bloomT(acc,9,()=>{ TC.strokeStyle=rgbaC(acc,0.95); TC.lineWidth=3; TC.lineCap='round'; TC.beginPath(); TC.moveTo(ax,ay+4); TC.lineTo(ax+18,ay-4); TC.stroke(); }); }
    else { TC.save(); TC.translate(ax,ay); TC.rotate(-0.25); TC.fillStyle=lgrad(0,0,16,0,[[0,shade(wc,1.3)],[1,shade(wc,0.7)]]); rrectT(0,-2,16+era,4,2); TC.fill();
      TC.fillStyle='#4a3a2a'; rrectT(-3,-2,5,5,1); TC.fill(); TC.restore(); }
  } else if (role==='ranged'){
    TC.fillStyle=lgrad(ax,ay,ax,ay+6,[[0,'#3a414c'],[1,'#1c2129']]); rrectT(ax,ay+2,17+era,5,2); TC.fill();
    TC.fillStyle=shade(wc,0.8); rrectT(ax+13+era,ay,4,8,1); TC.fill();
  } else if (role==='siege'){
    TC.save(); TC.translate(ax-2,ay+2); TC.rotate(-0.5);
    TC.fillStyle=lgrad(0,-4,0,4,[[0,shade(wc,1.2)],[1,shade(wc,0.6)]]); rrectT(0,-4,22+era*2,8,3); TC.fill();
    TC.fillStyle='#11151b'; TC.beginPath(); TC.arc(22+era*2,0,3,0,6.283); TC.fill(); TC.restore();
  } else if (role==='tank'){
    sculptT(ax,F-48,7,26,3, shade(body,0.85), acc);
  } else {
    if (isBot){ bloomT(acc,8,()=>{ TC.fillStyle=acc; for(let i=0;i<3;i++){ const a=i*2.1; TC.beginPath(); TC.arc(cx+Math.cos(a)*11,F-36+Math.sin(a)*11,2,0,6.283); TC.fill(); } }); }
    else { sculptT(ax-1,F-42,9,12,3,'#eef2f6'); bloomT('#ff5a5a',6,()=>{ TC.fillStyle='#ff5a5a'; rrectT(ax+2,F-40,3,8,1); TC.fill(); rrectT(ax-0.5,F-38,8,3,1); TC.fill(); }); }
  }
  // ailerons d'ère (bot)
  if (isBot) for(let i=0;i<era;i++){ TC.fillStyle=rgbaC(shade(body,1.3),0.7); rrectT(cx-tw/2-3-i*3, F-46+i*5, 3, 8, 1); TC.fill(); }
  // transcendance
  if (trans){
    if (fac==='HUM'){ bloomT('#ff3a2a',8,()=>{ TC.fillStyle='#ff3a2a'; rrectT(cx-tw/2,F-47,tw,3,1); TC.fill(); drawStar(cx,F-34,4,'#ff5a3a'); }); }
    else { bloomT('#39ff6a',9,()=>{ TC.fillStyle='#39ff6a'; for(let i=0;i<3;i++) rrectT(cx-7+i*6,F-78,2,5,1), TC.fill(); }); }
  }
}
function attackFX(u, x, bodyY, imp){
  imp = (imp==null)?1:imp; const dir=u.side, col=u.fac==='HUM'?'#ffd9a0':'#9fe8ff';
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.shadowColor=col; ctx.shadowBlur=14; ctx.lineCap='round';
  if (u.role==='ranged'||u.role==='air'){
    const fx=x+dir*26;
    ctx.fillStyle=col; ctx.beginPath(); ctx.arc(fx,bodyY,3+3*imp,0,6.283); ctx.fill();                 // bouche à feu
    ctx.strokeStyle=rgbaC(col,0.65*imp); ctx.lineWidth=2; ctx.beginPath();                              // traceur nerveux
    ctx.moveTo(fx,bodyY); ctx.lineTo(fx+dir*(46+u.range*0.12), bodyY-2); ctx.stroke();
    ctx.fillStyle=rgbaC('#ffcf8a',0.8*imp); ctx.beginPath(); ctx.arc(x+dir*14, bodyY+3, 1.6, 0,6.283); ctx.fill(); // douille
  } else if (u.role==='siege'){
    const fx=x+dir*24, fy=bodyY-4;
    ctx.fillStyle='#ffd34a'; ctx.beginPath(); ctx.arc(fx,fy,5+7*imp,0,6.283); ctx.fill();
    ctx.strokeStyle=rgbaC('#ff9d45',0.5*imp); ctx.lineWidth=3; ctx.beginPath(); ctx.arc(fx,fy,12+12*imp,0,6.283); ctx.stroke();
  } else {
    // mêlée : arc tranchant qui balaie devant l'unité
    const cxs=x+dir*6, r=22, a0=dir>0?-1.0:Math.PI+1.0, a1=dir>0?1.0:Math.PI-1.0;
    ctx.strokeStyle=rgbaC('#ffffff',0.2+0.8*imp); ctx.lineWidth=3.2;
    ctx.beginPath(); ctx.arc(cxs,bodyY,r,a0,a1,dir<0); ctx.stroke();
    ctx.strokeStyle=rgbaC(col,0.5*imp); ctx.lineWidth=6; ctx.beginPath(); ctx.arc(cxs,bodyY,r,a0,a1,dir<0); ctx.stroke();
  }
  ctx.restore();
  // éclair de lumière dynamique au moment du tir/de la frappe (coords MONDE)
  if (imp>0.8){ const lc=u.role==='siege'?'#ff9d45':col; addLight(u.x+dir*18, bodyY, lc, u.role==='siege'?78:46, 0.2); }
}
function drawGremlin(u, x, gy){
  const t=u.bob, acc=FACTIONS.IA.accent, body=FACTIONS.IA.eraCols[u.era], b=Math.abs(Math.sin(t*2.4))*4;
  projShadow(x, gy, 9); const cy=gy-12-b;
  sculptT(x-8, cy-8, 16, 16, 6, body, acc);
  bloomT(acc,8,()=>{ ctx.fillStyle=acc; ctx.beginPath(); ctx.arc(x-3,cy,2,0,6.283); ctx.arc(x+3,cy,2,0,6.283); ctx.fill(); });
  if (u.flash>0){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=u.flash; sculptT(x-8,cy-8,16,16,6,'#ffffff'); ctx.restore(); }
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
  // reflet chromé temps-réel sur les châssis GPT : bande spéculaire qui balaie le torse/la tête
  if (kind==='bot'){
    ctx.save(); ctx.beginPath(); ctx.rect(-13, -USP.foot+14, 26, 40); ctx.clip();
    const sweep=((t*0.45)%1)*60-30; ctx.globalCompositeOperation='lighter';
    const sg=ctx.createLinearGradient(sweep-9,0,sweep+9,0);
    sg.addColorStop(0,'rgba(220,245,255,0)'); sg.addColorStop(0.5,'rgba(225,248,255,0.40)'); sg.addColorStop(1,'rgba(220,245,255,0)');
    ctx.fillStyle=sg; ctx.fillRect(-14,-USP.foot+14,28,40); ctx.restore();
  }
  if (u.flash>0){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=Math.min(1,u.flash*1.4); ctx.drawImage(spr, -USP.cx, -USP.foot, USP.W, USP.H); }
  ctx.restore();
  if (atk) attackFX(u, x, gy-26, imp);
}
function drawHuman(u, x, gy){ blitHumanoid(u, x, gy, 'hum'); }
function drawBot(u, x, gy){ blitHumanoid(u, x, gy, 'bot'); }
function airSprite(fac, era, trans){
  const acc=FACTIONS[fac].accent, body=FACTIONS[fac].eraCols[era], cx=32, cy=22;
  if (fac==='HUM'){
    sculptT(cx-12, cy-6, 24, 12, 6, body, acc);
    TC.fillStyle='rgba(210,235,245,0.9)'; rrectT(cx+2, cy-4, 7, 7, 3); TC.fill();
    TC.strokeStyle=shade(body,0.7); TC.lineWidth=3; TC.lineCap='round'; TC.beginPath(); TC.moveTo(cx-11,cy); TC.lineTo(cx-22,cy-3); TC.stroke();
    TC.fillStyle=shade(body,0.7); rrectT(cx-25, cy-8, 5, 9, 2); TC.fill();
    for(let i=0;i<era;i++){ TC.fillStyle='rgba(255,255,255,0.6)'; rrectT(cx-12-i*3, cy+6, 2, 4, 1); TC.fill(); }
    if (trans) bloomT('#ff3a2a',7,()=>drawStar(cx,cy,3,'#ff5a3a'));
  } else {
    TC.fillStyle=lgrad(cx-14,cy-8,cx+14,cy+8,[[0,shade(body,1.4)],[0.5,body],[1,shade(body,0.5)]]);
    TC.beginPath(); TC.moveTo(cx+15,cy); TC.lineTo(cx,cy-9); TC.lineTo(cx-15,cy); TC.lineTo(cx,cy+9); TC.closePath(); TC.fill();
    bloomT(acc,9,()=>{ TC.fillStyle=acc; TC.beginPath(); TC.arc(cx+2,cy,3,0,6.283); TC.fill(); });
    if (trans) bloomT('#39ff6a',8,()=>{ TC.strokeStyle=rgbaC('#39ff6a',0.85); TC.lineWidth=2; TC.beginPath(); TC.arc(cx,cy,13,0,6.283); TC.stroke(); });
  }
}
function drawAir(u, x, gy){
  const fac=u.fac, era=u.era, t=u.bob, dir=u.side, acc=FACTIONS[fac].accent;
  const spr = sprite('AIR'+fac+era+(u.trans?'T':''), 64, 44, ()=>airSprite(fac,era,u.trans));
  const y = gy - u.flyH + Math.sin(t*1.1)*3;
  const AS = 1.5;                 // aéronefs agrandis (échelle cohérente : plus gros que l'infanterie)
  projShadow(x, gy, 16);
  ctx.save(); ctx.translate(x,y); ctx.scale(dir*AS,AS); ctx.drawImage(spr, -32, -22, 64, 44);
  if (u.flash>0){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=Math.min(1,u.flash*1.4); ctx.drawImage(spr,-32,-22, 64, 44); }
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineCap='round';
  ctx.strokeStyle=rgbaC(fac==='HUM'?'#cfd6e0':acc,0.5); ctx.lineWidth=2.5;
  if (fac==='HUM'){ const r=Math.abs(Math.sin(t*9))*20; ctx.beginPath(); ctx.moveTo(x-r,y-16); ctx.lineTo(x+r,y-16); ctx.stroke(); }
  else { for(const sx2 of[-15,15]){ const r=Math.abs(Math.sin(t*10+sx2))*9; ctx.beginPath(); ctx.moveTo(x+sx2-r,y-10); ctx.lineTo(x+sx2+r,y-10); ctx.stroke(); } }
  ctx.restore();
  if (u.atkT>u.rate-0.14) attackFX(u, x, y);
}
function heroSprite(fac){
  const hum=fac==='HUM', acc=hum?'#ffcf5a':'#ff6ad6', body=hum?'#3a5632':'#22324a', skin=hum?'#e8c89a':'#bdecff', cx=32, F=92;
  TC.fillStyle=lgrad(cx-18,F-58,cx-8,F-10,[[0,shade(acc,1.0)],[1,shade(acc,0.45)]]); rrectT(cx-18,F-58,9,48,4); TC.fill(); // cape/manteau
  sculptT(cx-12,F-26,10,26,5,shade(body,0.85)); sculptT(cx+3,F-26,10,26,5,shade(body,0.85));   // jambes
  sculptT(cx-17,F-66,34,44,10,body,acc);                                                        // torse imposant
  TC.fillStyle=rgrad(cx-4,F-82,16,[[0,shade(skin,1.12)],[1,shade(skin,0.7)]]); TC.beginPath(); TC.arc(cx,F-78,13,0,6.283); TC.fill();
  if (hum){
    // identité « Che » : ceinturon, étoile rouge, béret incliné, barbe, cigare, fusil en bandoulière
    TC.fillStyle='#241a12'; rrectT(cx-17,F-40,34,5,2); TC.fill();
    bloomT('#ff3a2a',10,()=>drawStar(cx,F-52,7,'#ff4a2a'));
    TC.fillStyle='#243a22'; TC.beginPath(); TC.ellipse(cx-1,F-90,15,7,-0.18,0,6.283); TC.fill();
    bloomT('#ff3a2a',6,()=>drawStar(cx-6,F-91,3.2,'#ff5a3a'));
    TC.fillStyle=shade(skin,0.55); TC.fillRect(cx-7,F-72,14,4);                     // barbe
    TC.fillStyle='#d8c0a0'; TC.fillRect(cx+12,F-74,8,2); bloomT('#ff7a3a',5,()=>{ TC.fillStyle='#ff7a3a'; TC.fillRect(cx+20,F-74,2,2); }); // cigare
    TC.strokeStyle='#2a2018'; TC.lineWidth=3; TC.beginPath(); TC.moveTo(cx+11,F-60); TC.lineTo(cx+19,F-28); TC.stroke();   // fusil en bandoulière
  } else {
    // identité « Singularité » : couronne de lumière fractale + cœur de données + visière
    bloomT(acc,12,()=>drawStar(cx,F-50,7,acc));
    bloomT(acc,8,()=>{ TC.fillStyle=acc; TC.fillRect(cx-2,F-48,4,14); });
    TC.fillStyle='#0a1420'; TC.fillRect(cx-7,F-80,14,5);
    bloomT(acc,8,()=>{ TC.fillStyle=acc; TC.fillRect(cx-6,F-79,13,2); });
    bloomT(acc,14,()=>{ TC.strokeStyle=rgbaC(acc,0.9); TC.lineWidth=2;
      for(let i=0;i<6;i++){ const a=-Math.PI/2+i*Math.PI/3; TC.beginPath();
        TC.moveTo(cx+Math.cos(a)*12,F-92+Math.sin(a)*8); TC.lineTo(cx+Math.cos(a)*18,F-92+Math.sin(a)*12); TC.stroke(); } });
  }
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
  const spr = sprite('HERO'+u.fac, 64, 100, ()=>heroSprite(u.fac));
  const atk = u.atkT > u.rate-0.18, imp = atk? clamp((u.atkT-(u.rate-0.18))/0.18,0,1):0, lunge=u.side*9*imp;
  ctx.save(); ctx.translate(x+lunge,gy); ctx.scale(u.side,1); ctx.drawImage(spr, -32, -92, 64, 100);
  if (u.flash>0){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=Math.min(1,u.flash*1.4); ctx.drawImage(spr,-32,-92, 64, 100); }
  ctx.restore();
  if (atk){ attackFX(u, x, gy-44, imp); }                       // frappe héroïque spectaculaire
  ctx.font='700 10px Arial'; ctx.textAlign='center'; ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=6;
  ctx.fillText(HERO_NAME[u.fac], x, gy-100); ctx.shadowBlur=0;
}
function drawUnit(u){
  const x = u.x-camX;
  if (x<-40 || x>VW()+40) return;
  const gy = gY(u.x);
  const fh = u.fly? u.flyH : 0;
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
    ctx.beginPath(); ctx.moveTo(x-4,gy-52-fh); ctx.lineTo(x+4,gy-52-fh); ctx.lineTo(x,gy-46-fh); ctx.closePath(); ctx.fill();
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
        ctx.beginPath(); ctx.moveTo(x-11, gy-34-fh-i*4); ctx.lineTo(x-8, gy-31-fh-i*4); ctx.lineTo(x-5, gy-34-fh-i*4); ctx.stroke();
      } else {                                       // diodes d'optimisation
        ctx.fillStyle='rgba(90,208,255,'+(0.6+0.3*Math.sin(u.bob*2+i))+')';
        ctx.fillRect(x-10, gy-32-fh-i*4, 3, 2.4);
      }
    }
  }
  // vétéran : étoile dorée
  if (u.vet) drawStar(x+9, gy-50-fh, 2.8, '#ffd34a');
  // TRANSCENDANCE : aura permanente animée + empreinte lumineuse au sol.
  if (u.trans && qFx()){
    ctx.save(); ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=0.22+0.10*Math.sin(u.bob*3); ctx.fillStyle=FACTIONS[u.fac].accent;
    ctx.beginPath(); ctx.ellipse(x, gy-20-fh, 11, 19, 0,0,6.28); ctx.fill();
    ctx.globalAlpha=0.30; ctx.beginPath(); ctx.ellipse(x, gy+2, 12, 4, 0,0,6.28); ctx.fill();
    ctx.restore(); ctx.globalAlpha=1;
  }
  // fatigue / surchauffe : volutes au-dessus de la tête
  if (u.tiredT>0){
    ctx.fillStyle = u.fac==='HUM'? 'rgba(220,220,230,0.55)':'rgba(255,140,80,0.55)';
    for (let i=0;i<2;i++){
      const py = gy-46-fh - ((u.bob*14+i*7)%12);
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
    const w = u.role==='gremlin'? 14:24, yy = gy-(u.role==='gremlin'?26:44)-fh;
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
  const n = frac<0.3? 3:2;
  ctx.save();
  for (let i=0;i<n;i++){
    const ph = ((t*0.5 + i*0.37 + seed*0.013)%1);
    const py = topY - ph*28, drift = Math.sin(t*1.3+i*2+seed)*5*ph;
    ctx.fillStyle='rgba(44,38,40,'+(0.42*(1-ph)).toFixed(3)+')';
    ctx.beginPath(); ctx.arc(x+drift+(i-1)*4, py, 2.5+ph*5.5, 0, 6.283); ctx.fill();
  }
  if (frac<0.3){
    ctx.globalCompositeOperation='lighter';
    for (let i=0;i<2;i++){
      const fl=Math.abs(Math.sin(t*7+i*1.9+seed));
      ctx.fillStyle='rgba(255,'+(140+60*fl|0)+',60,'+(0.30+0.40*fl).toFixed(3)+')';
      ctx.beginPath(); ctx.ellipse(x-3+i*6, topY+2, 2.2, 3.5+fl*3, 0, 0, 6.283); ctx.fill();
    }
  }
  ctx.restore();
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
function drawBase(side){
  const x = side.x-camX; if (x<-160||x>VW()+160) return;
  const fac = side.fac, t = game.t, era = side.era;
  const col = fac.accent, gy = gY(side.x);
  projShadow(x, gy, 52);                          // ombre portée de la base
  if (side.facKey==='HUM'){
    // forteresse modulaire sculptée
    sculptT(x-44, gy-58, 88, 58, 8, '#4a4252', col);
    sculptT(x-36, gy-80, 72, 26, 7, '#5a5266');
    sculptT(x-12, gy-30, 24, 30, 4, '#241f2a');
    // fenêtres lumineuses (bloom)
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,205,120,0.85)'; ctx.shadowColor='#ffcf78'; ctx.shadowBlur=6;
    for (const wx of [x-30,x-6,x+18]) for (const wy of [gy-50,gy-40]) ctx.fillRect(wx,wy,6,6); ctx.restore();
    // mât + drapeau
    ctx.strokeStyle='#6a6274'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(x-30,gy-78); ctx.lineTo(x-30,gy-114); ctx.stroke();
    const wv=Math.sin(t*3)*3, fc=side.trans?'#e84a3a':col;
    ctx.fillStyle=fc; ctx.beginPath(); ctx.moveTo(x-30,gy-114); ctx.lineTo(x-4,gy-108+wv); ctx.lineTo(x-30,gy-100); ctx.closePath(); ctx.fill();
    if (side.trans){ ctx.fillStyle='#ffe9a0'; ctx.font='10px Georgia'; ctx.textAlign='center'; ctx.fillText('☭', x-20, gy-106); }
    if (era>=1){ ctx.strokeStyle='#8a8296'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x+24,gy-78); ctx.lineTo(x+24,gy-102); ctx.stroke();
      bloomT('#ff5a4a',6,()=>{ ctx.fillStyle='#ff5a4a'; ctx.beginPath(); ctx.arc(x+24,gy-104,3,0,6.283); ctx.fill(); }); }
    if (era>=3){ ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle='rgba(255,211,74,0.5)'; ctx.lineWidth=2; ctx.shadowColor='#ffd34a'; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.arc(x,gy-64,56,Math.PI,0); ctx.stroke(); ctx.restore(); }
  } else {
    // ziggourat IA sculptée en gradins
    for (let i=0;i<5;i++){ const w2=84-i*15, yy=gy-i*14; sculptT(x-w2/2, yy-15, w2, 16, 5, mix('#1e2a3c','#30425c',i/4), i===0?col:null); }
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for(let i=0;i<4;i++){ ctx.globalAlpha=0.4+0.4*Math.sin(t*2.5+i); ctx.fillStyle=col; ctx.fillRect(x-38+i*20, gy-40, 12, 2); }
    ctx.restore();
    // œil scrutateur qui suit le front
    let frontX = side.x - side.side*200;
    for (const u of game.p.units.concat(game.e.units)) if (Math.abs(u.x-side.x)<500) frontX=u.x;
    const look = clamp((frontX-side.x)/500,-1,1)*4;
    sculptT(x-13, gy-88, 26, 16, 6, '#cfe0ee');
    bloomT(side.trans?'#ff4ad0':col, 12, ()=>{ ctx.fillStyle=side.trans?'#ff4ad0':col; ctx.beginPath(); ctx.arc(x+look,gy-80,5,0,6.283); ctx.fill(); });
    ctx.fillStyle='#0a1018'; ctx.beginPath(); ctx.arc(x+look,gy-80,2.2,0,6.283); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for (let i=0;i<era+(side.trans?2:0);i++){ ctx.strokeStyle='rgba(90,208,255,'+(0.4-i*0.05)+')'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(x,gy-78,20+i*7+Math.sin(t*2+i)*2,0,6.283); ctx.stroke(); }
    ctx.restore();
  }
  // fortification : remparts sculptés
  if ((side.fortLvl||1)>=2){
    const fh2 = 26 + (side.fortLvl-2)*14, wcol = side.facKey==='HUM'? '#6a6274':'#24384c';
    for (const dx of [-72, 64]){ sculptT(x+dx, gy-fh2, 16, fh2, 3, wcol, col);
      ctx.fillStyle=shade(wcol,1.2); ctx.fillRect(x+dx,gy-fh2-4,6,4); ctx.fillRect(x+dx+10,gy-fh2-4,6,4); }
  }
  // nano-réparation : ouvriers (HUM) / drones (IA)
  if (side.autoRepair){
    if (side.facKey==='HUM'){ for (let i=0;i<2;i++){ const wx=x+Math.sin(t*0.7+i*2.6)*52, wy=gy-1;
      ctx.fillStyle='#caa84a'; ctx.beginPath(); ctx.arc(wx,wy-12,2.6,0,6.283); ctx.fill(); ctx.fillStyle='#8a6a3a'; ctx.fillRect(wx-2,wy-10,4,8);
      if (Math.sin(t*8+i)>0.5) bloomT('#ffd34a',5,()=>{ ctx.fillStyle='#ffd34a'; ctx.fillRect(wx+2,wy-13,2,2); }); } }
    else { for (let i=0;i<2;i++){ const a=t*1.4+i*3.14, dx2=Math.cos(a)*46, dy2=-58+Math.sin(a*1.7)*16;
      bloomT('#5ad0ff',6,()=>{ ctx.fillStyle='#5ad0ff'; ctx.beginPath(); ctx.moveTo(x+dx2+4,gy+dy2); ctx.lineTo(x+dx2,gy+dy2-3); ctx.lineTo(x+dx2-4,gy+dy2); ctx.lineTo(x+dx2,gy+dy2+3); ctx.closePath(); ctx.fill(); }); } }
  }
  const w=110, frac=clamp(side.hp/side.maxhp,0,1);
  // base amochée : colonnes de fumée puis flammes (l'état de siège se LIT à l'écran)
  if (frac<0.55){ dmgSmoke(x-26, gy-70, frac, t, side.x); dmgSmoke(x+22, gy-52, frac, t, side.x+31); }
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(x-w/2,gy-128,w,8);
  ctx.fillStyle=col; ctx.fillRect(x-w/2,gy-128,w*frac,8);
  ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=1; ctx.strokeRect(x-w/2,gy-128,w,8);
  // indication réparation possible
  if (side===game.p && frac<0.95){
    ctx.font='12px Arial'; ctx.textAlign='center';
    ctx.fillStyle='rgba(255,255,255,'+(0.5+0.3*Math.sin(t*3))+')';
    ctx.fillText('🔧 toucher pour réparer', x, gy-138);
  }
}
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
      ctx.font='700 9px Arial'; ctx.textAlign='center'; ctx.fillStyle=rgbaC(ac,0.92);
      ctx.fillText(neutral?tr('free_land'):tr('build_here'), x, gy-40);
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
  if (b.type==='wall'){
    const wc = facKey==='HUM'? '#7a7080':'#2c4258';
    sculptT(x-14, gy-bh2, 28, bh2, 4, wc, fac.accent);
    ctx.fillStyle='rgba(0,0,0,0.16)';
    for(let r2=0;r2<Math.floor(bh2/7);r2++) ctx.fillRect(x-12+(r2%2)*6, gy-bh2+4+r2*7, 18, 1.5);
    if (lvl>=2){ const cc = facKey==='HUM'? '#8a8090':'#3a5268'; for (let c=0;c<3;c++) sculptT(x-14+c*10, gy-bh2-6, 7, 6, 1, cc); }
  } else if (b.type==='turret'){
    const tc = facKey==='HUM'? '#5a5266':'#28364c';
    sculptT(x-9-lvl, gy-bh2, 18+lvl*2, bh2, 3, tc);
    sculptT(x-13-lvl, gy-bh2-10, 26+lvl*2, 12, 5, fac.accent, fac.accent);
    ctx.strokeStyle='#1c1c24'; ctx.lineWidth=4; ctx.lineCap='round';
    for (let c=0;c<lvl;c++){ const cy=gy-bh2-4+c*5; ctx.beginPath(); ctx.moveTo(x,cy); ctx.lineTo(x+owner.side*(16+c*2),cy-2); ctx.stroke(); }
    if (b.atkT > BUILDS.turret.rate-0.1) bloomT('#ffd34a',8,()=>{ ctx.fillStyle='#ffd34a'; ctx.beginPath(); ctx.arc(x+owner.side*(18+lvl*2),gy-bh2-6,3,0,6.283); ctx.fill(); });
  } else if (b.type==='farmF'){
    if (facKey==='HUM'){ ctx.strokeStyle='#caa84a'; ctx.lineWidth=2.4; ctx.lineCap='round';
      for(let i=-2;i<=2;i++){ const wx=x+i*7, sw=Math.sin(t*2+i)*2; ctx.beginPath(); ctx.moveTo(wx,gy); ctx.lineTo(wx+sw,gy-16); ctx.stroke();
        ctx.fillStyle='#e8c84a'; ctx.beginPath(); ctx.arc(wx+sw,gy-17,3,0,6.283); ctx.fill(); } }
    else { sculptT(x-16, gy-16, 32, 16, 3, '#28364c');
      ctx.save(); ctx.globalCompositeOperation='lighter'; for(let i=0;i<3;i++){ ctx.fillStyle=(Math.sin(t*3+i)>0)?'rgba(90,208,255,0.9)':'rgba(90,208,255,0.22)'; ctx.fillRect(x-13+i*10,gy-13,7,7);} ctx.restore(); }
  } else if (b.type==='farmM'){
    if (facKey==='HUM'){ sculptT(x-14, gy-18, 28, 18, 3, '#8a6a3a');
      ctx.fillStyle='#ffd34a'; ctx.beginPath(); ctx.arc(x,gy-18,5,Math.PI,0); ctx.fill(); ctx.fillStyle='#b8862c'; ctx.fillRect(x-14,gy-9,28,2); }
    else { sculptT(x-10, gy-26, 20, 26, 3, '#28364c');
      ctx.save(); ctx.globalCompositeOperation='lighter'; for(let i=0;i<3;i++){ ctx.fillStyle=(Math.sin(t*4+i*2)>0)?'rgba(180,74,255,0.9)':'rgba(180,74,255,0.28)'; ctx.fillRect(x-6,gy-21+i*7,12,3);} ctx.restore(); }
  } else if (b.type==='well'){
    sculptT(x-10, gy-18, 20, 18, 3, '#6a7a8a');
    ctx.save(); ctx.beginPath(); ctx.ellipse(x,gy-18,8,3,0,0,6.283); ctx.clip(); ctx.fillStyle='#50a0dc'; ctx.fillRect(x-8,gy-22,16,8); ctx.restore();
    ctx.strokeStyle='#3a4a5a'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(x-8,gy-20); ctx.lineTo(x-8,gy-30); ctx.lineTo(x+8,gy-30); ctx.lineTo(x+8,gy-20); ctx.stroke();
  }
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
