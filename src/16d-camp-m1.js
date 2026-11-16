/* ================= CAMPAGNE · MISSION I — LA NUIT DES COMPTEURS (v1.15) =================
   Valmont, de nuit, sous la pluie. Le courant est coupé : on ne voit que ce qui est éclairé
   (la base, les lampes des unités, les transformateurs repris, les fusées éclairantes). Les
   machines, elles, voient dans le noir. Reprendre un transformateur rallume un quartier.     */
DECOR_THEMES.nightcity = ['lamp','lamp','car','car','bin','barricade','debris','cable','lamp','car'];
DECOR_EXTRA.lamp = (d, s, t) => {                                   // lampadaire de la rue (s'allume quand le quartier est repris)
  let on = campNightLit(d.x); const c = game && game.camp;
  if (on && c && c.flickUntil>performance.now() && Math.sin(performance.now()*0.038 + d.ph*20)<0) on = false;   // scène S1 : les lampadaires clignotent puis tiennent
  ctx.strokeStyle = '#1b1c26'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-74); ctx.quadraticCurveTo(0,-84, 12*d.flip,-84); ctx.stroke();
  ctx.fillStyle = '#1b1c26'; ctx.fillRect(d.flip>0? 8 : -20, -86, 12, 4);
  if (on){ ctx.fillStyle = '#fff2cf'; ctx.fillRect(d.flip>0? 9 : -19, -82.5, 10, 2.2);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16 + 0.02*Math.sin(t*9+d.ph);
    ctx.fillStyle = '#ffcf80'; ctx.beginPath(); ctx.moveTo(14*d.flip,-81); ctx.lineTo(14*d.flip+46,0); ctx.lineTo(14*d.flip-46,0); ctx.closePath(); ctx.fill(); ctx.restore(); }
};
DECOR_EXTRA.car = (d, s) => {                                        // voiture garée
  ctx.scale(d.flip, 1); dShadow(22*s);
  ctx.fillStyle = ['#3b4458','#5a3a3a','#44504a','#55545c'][(d.ph*10|0)%4]; rr(-20*s,-11*s,40*s,9*s,3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-12*s,-11*s); ctx.lineTo(-8*s,-18*s); ctx.lineTo(7*s,-18*s); ctx.lineTo(13*s,-11*s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(16,20,34,0.85)'; ctx.beginPath(); ctx.moveTo(-9.5*s,-11.5*s); ctx.lineTo(-6.5*s,-16.5*s); ctx.lineTo(-0.5*s,-16.5*s); ctx.lineTo(-0.5*s,-11.5*s); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(1*s,-11.5*s); ctx.lineTo(1*s,-16.5*s); ctx.lineTo(6*s,-16.5*s); ctx.lineTo(10.5*s,-11.5*s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#121218'; ctx.beginPath(); ctx.arc(-12*s,-2*s,3.6*s,0,6.283); ctx.arc(12*s,-2*s,3.6*s,0,6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-19*s,-10.4*s,38*s,1.2*s);
};
DECOR_EXTRA.bin = (d, s) => {                                        // conteneur à ordures
  dShadow(11*s); ctx.fillStyle = '#34503e'; rr(-9*s,-15*s,18*s,15*s,2); ctx.fill();
  ctx.fillStyle = '#27402f'; ctx.fillRect(-10*s,-17*s,20*s,3.4*s);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-9*s,-6*s,18*s,1.2*s);
  ctx.fillStyle = '#121218'; ctx.beginPath(); ctx.arc(-6*s,0,1.8*s,0,6.283); ctx.arc(6*s,0,1.8*s,0,6.283); ctx.fill();
};
// un point de la rue est-il dans un quartier rallumé (transformateur repris à moins de 430) ?
function campNightLit(x){ if (!game || !game.zones) return false; for (const z of game.zones) if (z.owner==='p' && Math.abs(z.x-x)<430) return true; return false; }
function campInLight(x, big){ const Ls = game.camp.lights; for (const L of Ls){ if (big && !L.big) continue; if (Math.abs(L.x-x) < L.r*0.82) return true; } return false; }

/* ---------- planches (repère 480×270, encre sur page de carnet) : un sujet, un trait = un objet, une couleur d'accent ---------- */
const m1R = (x, y, w, h) => [x,y, x+w,y, x+w,y+h, x,y+h, x,y];                     // contour fermé : le premier point est répété
const m1Rot = (pts, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a), o = [];
  for (let i=0;i<pts.length;i+=2){ const dx = pts[i]-cx, dy = pts[i+1]-cy; o.push(cx+dx*c-dy*s, cy+dx*s+dy*c); } return o; };
// texte de planche : Courier gras, réduit jusqu'à tenir dans maxW
function m1Text(g, s, x, y, px, col, maxW){
  g.fillStyle = col || '#1f1b17'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  let f = px; for (; f>7; f-=0.5){ g.font = '700 '+f+'px "Courier New",monospace'; if (g.measureText(s).width <= maxW) break; }
  g.fillText(s, x, y); }
const M1_PLATES = {
  // P1 · Le robinet : un évier, un robinet, le compteur « intelligent »
  tap(g, w, h, t){ plateBase(g, w, h);
    const n = clamp(t/1.6, 0, 1), m = clamp((t-0.5)/1.2, 0, 1);
    inkWash(g, m1R(0,0,480,270), '#8a8f98', 0.10);                                                          // lavis gris léger
    inkLine(g, [60,80, 160,80, 160,122], n, 9);                                                              // le robinet : un seul trait (bec, coude, descente)
    inkLine(g, m1R(152,122,16,10), n, 2.4);                                                                  // l'embout
    inkLine(g, [100,80, 100,66], n, 3); inkLine(g, [86,64, 114,64], n, 4);                                   // la manette en T (traits séparés)
    inkWash(g, [110,214, 270,214, 252,236, 128,236, 110,214], '#1f1b17', 0.2); inkLine(g, [110,214, 270,214, 252,236, 128,236, 110,214], n, 2.4);   // le bac de l'évier
    inkHatch(g, 134, 216, 112, 18, 6, '#1f1b17', 0.22); inkLine(g, [184,228, 196,228], n, 2);                // la bonde
    // trois dernières gouttes, puis plus rien
    for (const t0 of [1.1, 2.3, 3.5]){
      const sw = clamp((t-(t0-0.55))/0.55, 0, 1), k = (t-t0)/0.8;
      if (sw>0 && k<0){ g.fillStyle = '#1f1b17'; g.beginPath(); g.ellipse(160, 135+sw*2, 1.2+sw*1.3, 1.6+sw*2.4, 0, 0, 6.283); g.fill(); }        // la goutte grossit au bout du bec
      if (k>=0 && k<1){ g.fillStyle = '#1f1b17'; g.beginPath(); g.ellipse(160, 136+k*k*76, 2.4, 4, 0, 0, 6.283); g.fill(); }                    // elle tombe
      if (k>=1 && k<1.7){ const r = (k-1)/0.7; g.strokeStyle = 'rgba(31,27,23,'+(0.55*(1-r)).toFixed(3)+')'; g.lineWidth = 1.3; g.beginPath(); g.ellipse(160, 214, 4+r*16, 1.5+r*3, 0, 0, 6.283); g.stroke(); } }
    // le compteur
    inkWash(g, m1R(320,70,100,100), '#3d4a5a', 0.3); inkLine(g, m1R(320,70,100,100), m, 2.6);
    inkLine(g, m1R(334,86,72,30), m, 1.6);
    if (m>=1){ inkWash(g, m1R(334,86,72,30), '#9db79a', 0.85);
      m1Text(g, cT(M1_TX.pScore), 370, 106, 14, '#1b2a1c', 66);
      m1Text(g, cT(M1_TX.pRegie), 370, 134, 8.5, '#1f1b17', 92);
      g.fillStyle = Math.sin(t*5)>0? '#c42a1c' : 'rgba(196,42,28,0.25)'; g.beginPath(); g.arc(400, 154, 5.5, 0, 6.283); g.fill(); }
    plateEnd(g, w, h); },

  // P2 · La rue s'éteint : les fenêtres s'éteignent de gauche à droite, la croix de l'hôpital en dernier
  street(g, w, h, t){ plateBase(g, w, h, 'rgba(30,34,70,0.10)');
    const B = [[20,64,150],[92,58,110],[158,66,176],[232,60,128],[300,64,160],[372,90,120]];                 // x, largeur, hauteur (le dernier : l'hôpital)
    B.forEach(([x,bw,bh], i)=>{ const top = 230-bh, p = m1R(x, top, bw, bh);
      inkWash(g, p, '#1f1b17', 0.16); inkLine(g, p, clamp(t/1.2-i*0.08, 0, 1), 1.8);
      const cols = Math.floor((bw-8)/17), rows = Math.floor((bh-14)/22);
      for (let r=0;r<rows;r++) for (let c=0;c<cols;c++){ const wx = x+7+c*17, off = t > 1.4 + ((wx-20)/442)*2.7 + ((i*7+r*3+c*5)%5)*0.07;
        g.fillStyle = off? 'rgba(31,27,23,0.55)' : '#e8a53c'; g.fillRect(wx, top+9+r*22, 9, 12); } });
    const hx = 417, ht = 230-120, lit = t<4.6 || t>5.8, ca = t<4.6? 1 : 0.35;                                 // la croix du toit : s'éteint, puis se rallume faiblement
    g.globalAlpha = lit? ca : 1; g.fillStyle = lit? '#e8a53c' : 'rgba(31,27,23,0.45)'; g.fillRect(hx-3, ht-26, 6, 20); g.fillRect(hx-10, ht-19, 20, 6); g.globalAlpha = 1;
    inkLine(g, [0,230, 480,230], 1, 2.2); inkHatch(g, 0, 230, 480, 40, 7, '#1f1b17', 0.2);
    inkFolk(g, 126, 230, 26); inkFolk(g, 262, 230, 24); inkFolk(g, 340, 230, 27);
    plateEnd(g, w, h); },

  // P3 · Le comité : sept personnes sous une ampoule nue, quatre bras se lèvent un à un ; au tableau « GERMINAL »
  committee(g, w, h, t){ plateBase(g, w, h);
    const n = clamp(t/1.4, 0, 1);
    inkWash(g, [240,46, 118,214, 362,214], '#e8a53c', 0.16);                                                 // le cône de l'ampoule
    inkLine(g, [240,0, 240,34], n, 1.2); g.fillStyle = '#f6e3a0'; g.beginPath(); g.arc(240, 40, 6, 0, 6.283); g.fill();
    g.strokeStyle = '#1f1b17'; g.lineWidth = 1.6; g.beginPath(); g.arc(240, 40, 6, 0, 6.283); g.stroke();
    inkWash(g, m1R(12,70,66,60), '#2b2f2c', 0.92); inkLine(g, m1R(12,70,66,60), n, 2.2);                      // le tableau noir
    inkLine(g, [10,134, 80,134], n, 2.4);
    if (n>=1) m1Text(g, 'GERMINAL', 45, 104, 11, '#efe6cf', 58);
    for (let i=0;i<7;i++){ const arm = [1,2,4,5].indexOf(i), up = arm>=0 && t > 1.8+arm*0.3? 1 : 0;           // sept personnes ; les bras se lèvent à 0,3 s d'écart
      inkFolk(g, 113+i*43, 198, 26, '#1f1b17', up); }
    inkWash(g, m1R(80,190,320,10), '#6b5a44', 0.6); inkLine(g, [80,190, 400,190], n, 3);                      // la table
    inkLine(g, [100,200, 100,232], n, 2.4); inkLine(g, [380,200, 380,232], n, 2.4);
    inkLine(g, [0,232, 480,232], 1, 2); inkHatch(g, 0, 232, 480, 38, 7, '#1f1b17', 0.2);
    plateEnd(g, w, h); },

  // P4 · La radio : la table de Sol, le poste, l'antenne et ses ondes rouges
  radio(g, w, h, t){ plateBase(g, w, h);
    const n = clamp(t/1.8, 0, 1);
    inkLine(g, [30,206, 450,206], n, 3); inkHatch(g, 30, 206, 420, 30, 6);                                   // la table
    inkWash(g, m1R(230,120,150,86), '#3d4a3a', 0.35); inkLine(g, m1R(230,120,150,86), n, 2.6);               // le poste
    g.strokeStyle = '#1f1b17'; g.lineWidth = 2; g.beginPath(); g.arc(270, 162, 20, 0, 6.283*n); g.stroke();   // le cadran
    for (let i=0;i<5;i++) inkLine(g, [308, 140+i*10, 366, 140+i*10], n, 1.2);                                // la grille
    inkLine(g, [372,120, 394,58], n, 1.8);                                                                   // l'antenne
    for (let i=0;i<3;i++){ const r = (t*0.6+i/3)%1; g.strokeStyle = 'rgba(196,42,28,'+(0.7*(1-r)).toFixed(3)+')'; g.lineWidth = 1.8;
      g.beginPath(); g.arc(394, 58, 6+r*46, -2.5, -0.3); g.stroke(); }                                       // les ondes rouges
    inkWash(g, m1R(96,184,96,22), '#1f1b17', 0.08); inkLine(g, m1R(96,184,96,22), n, 1.8); inkLine(g, [144,184, 144,206], n, 1.2);   // le carnet ouvert
    for (let i=0;i<3;i++){ inkLine(g, [102,191+i*5, 138,191+i*5], n, 0.9); inkLine(g, [150,191+i*5, 186,191+i*5], n, 0.9); }
    inkLine(g, [118,176, 160,168], n, 3, '#c42a1c');                                                         // le crayon rouge
    inkWash(g, [66,92, 78,92, 190,206, 40,206], '#e8a53c', 0.16);                                            // le cône de la lampe
    inkLine(g, [60,206, 60,122, 84,96], n, 2.4); inkWash(g, [70,86, 108,92, 100,106, 66,100], '#1f1b17', 0.7);   // la lampe d'architecte (pied, bras, abat-jour)
    inkLine(g, [46,206, 74,206], n, 3);
    plateEnd(g, w, h); },

  // P5 · Halvard : la rue vue de la Fraternelle ; la foule et le drapeau rouge avancent vers le hangar
  halvard(g, w, h, t){ plateBase(g, w, h, 'rgba(30,34,70,0.12)');
    inkWash(g, m1R(300,96,170,134), '#1f1b17', 0.5); inkLine(g, m1R(300,96,170,134), 1, 2.4);                // le hangar
    m1Text(g, 'HALVARD', 385, 128, 15, '#e9dfc6', 120);                                                      // l'enseigne
    g.strokeStyle = '#1f1b17'; g.lineWidth = 1.5; g.fillStyle = '#1f1b17';                                    // six drones posés sur le toit
    for (let i=0;i<6;i++){ const dx = 318+i*27, dy = 93; g.beginPath(); g.moveTo(dx-6,dy-4); g.lineTo(dx+6,dy+1); g.moveTo(dx+6,dy-4); g.lineTo(dx-6,dy+1); g.stroke();
      for (const q of [-6,6]){ g.beginPath(); g.arc(dx+q,dy-4.6,2,0,6.283); g.fill(); } }
    g.fillStyle = Math.sin(t*3)>0? '#3aa0e0' : 'rgba(58,160,224,0.35)'; for (let i=0;i<3;i++) g.fillRect(328+i*52, 160, 12, 4);   // trois voyants bleus
    inkLine(g, [0,230, 480,230], 1, 2.2); inkHatch(g, 0, 230, 480, 40, 7, '#1f1b17', 0.2);
    const adv = Math.min(1, t/5)*60;                                                                        // la foule avance de 60 px en 5 s
    for (let i=0;i<11;i++) inkFolk(g, 16+i*19+adv, 232+((i*3)%3)*2, 26+((i*7)%4)*1.5, '#1f1b17', 0);
    const fx = 16+5*19+adv+5; inkLine(g, [fx,222, fx,128], 1, 2.2); const wv = Math.sin(t*3)*3;               // le drapeau rouge, tenu haut
    inkWash(g, [fx,128, fx+36,132+wv, fx+36,152+wv, fx,148], '#c42a1c', 0.92);
    plateEnd(g, w, h); },

  // P6 · Le rideau de fer : le graffiti s'écrit lettre par lettre (16 signes par seconde)
  shutter(g, w, h, t){ plateBase(g, w, h, 'rgba(120,130,140,0.12)');
    inkWash(g, m1R(50,40,380,210), '#1f1b17', 0.14); inkLine(g, m1R(50,40,380,210), 1, 2.6);
    for (let y=52; y<250; y+=12) inkLine(g, [56,y, 424,y], 1, 0.8);                                         // les lames
    inkHatch(g, 51, 41, 378, 56, 6, '#1f1b17', 0.4);                                                        // la suie
    const lines = cT(M1_TX.graffiti).split('|'); let px = 21;
    g.font = '700 21px "Courier New",monospace'; for (const l of lines) while (px>9 && (g.font = '700 '+px+'px "Courier New",monospace', g.measureText(l).width > 346)) px -= 0.5;
    g.fillStyle = '#c42a1c'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.font = '700 '+px+'px "Courier New",monospace';
    let left = Math.floor(t*16); lines.forEach((l, i)=>{ g.fillText(l.slice(0, Math.max(0, left)), 240, 146+i*34); left -= l.length; });
    plateEnd(g, w, h); },

  // P7 · L'eau revient : le robinet coule dans un verre, le compteur est arraché
  water(g, w, h, t){ plateBase(g, w, h, 'rgba(232,165,60,0.10)');
    const lv = clamp((t-0.9)/6.5, 0, 1)*0.72, sy = 214-lv*42;                                               // niveau de l'eau dans le verre
    inkWash(g, m1R(0,0,480,270), '#8a8f98', 0.08);
    inkLine(g, [60,80, 160,80, 160,122], 1, 9); inkLine(g, m1R(152,122,16,10), 1, 2.4);
    inkLine(g, [100,80, 100,66], 1, 3); inkLine(g, [86,64, 114,64], 1, 4);
    inkWash(g, [110,214, 270,214, 252,236, 128,236, 110,214], '#1f1b17', 0.2); inkLine(g, [110,214, 270,214, 252,236, 128,236, 110,214], 1, 2.4);
    if (lv>0){ const q = (sy-172)/42; inkWash(g, [175-4*q, sy, 145+4*q, sy, 149, 214, 171, 214], '#6b8794', 0.75); }                  // l'eau monte
    inkLine(g, [145,172, 175,172, 171,214, 149,214, 145,172], 1, 2);                                        // le verre
    const tip = Math.min(sy, 132+Math.max(0, t-0.4)*300);                                                    // le filet d'eau continu
    if (t>0.4){ const pts = []; for (let y=132; y<=tip; y+=6) pts.push(160+Math.sin(y*0.3-t*6)*1.3, y); pts.push(160, tip); if (pts.length>=4) inkLine(g, pts, 1, 2.6, '#6b8794'); }
    // le compteur arraché : boîtier penché, écran noir, fils pendants
    const a = -0.22, box = m1Rot(m1R(320,70,100,100), 330, 72, a), scr = m1Rot(m1R(334,86,72,30), 330, 72, a);
    inkWash(g, box, '#3d4a5a', 0.3); inkLine(g, box, 1, 2.6); inkWash(g, scr, '#101214', 0.95); inkLine(g, scr, 1, 1.6);
    const cr = m1Rot([346,92, 360,104, 372,98, 388,112], 330, 72, a); inkLine(g, cr, 1, 1.1, '#e9dfc6');       // l'écran fêlé
    for (const [bx,by,ph] of [[352,170,0],[392,168,1.7]]){ const p0 = m1Rot([bx,by], 330, 72, a), pts = [];
      for (let k=0;k<=8;k++){ const yy = p0[1]+k*(26/8)*1.7; pts.push(p0[0]+Math.sin(k*0.7+t*1.4+ph)*3+k*0.6, yy); } inkLine(g, pts, 1, 1.6); }
    plateEnd(g, w, h); },

  // P8 · Le bipeur : sur la table, de nuit ; « 55 » s'affiche après 1,4 s
  pager(g, w, h, t){ plateBase(g, w, h, 'rgba(14,16,34,0.2)');
    inkLine(g, [20,210, 460,210], 1, 3); inkHatch(g, 20, 210, 440, 28, 6);
    if (t>1.4) inkWash(g, [196,210, 284,210, 330,238, 150,238], '#9db79a', 0.22);                             // l'écran éclaire la table
    const body = [176,150, 304,150, 310,156, 310,210, 170,210, 170,156, 176,150];
    inkWash(g, body, '#23292b', 0.92); inkLine(g, body, 1, 2.2);
    inkWash(g, m1R(190,160,100,30), '#9db79a', 1); inkLine(g, m1R(190,160,100,30), 1, 1.4);
    for (let i=0;i<3;i++){ g.fillStyle = '#4a5558'; g.fillRect(196+i*28, 196, 18, 6); }
    if (t>1.4 && Math.sin(t*5)>-0.4) m1Text(g, '55', 240, 184, 26, '#1b2a1c', 90);
    if (t>1.4) for (let i=0;i<3;i++){ const r = (t*0.9+i/3)%1; g.strokeStyle = 'rgba(11,111,168,'+(0.8*(1-r)).toFixed(3)+')'; g.lineWidth = 2;
      g.beginPath(); g.arc(240, 186, 78+r*46, 3.75, 5.67); g.stroke(); }                                      // la vibration
    inkWash(g, [20,210, 34,186, 126,184, 140,210], '#1f1b17', 0.08); inkLine(g, [20,210, 34,186, 126,184, 140,210], 1, 2);   // le coin du carnet
    for (let i=0;i<3;i++) inkLine(g, [44+i*2,193+i*5, 112,191+i*5], 1, 0.9);
    plateEnd(g, w, h); },

  // P9 · La rue noire : un lampadaire éteint, cinq silhouettes qui s'éloignent vers la gauche (8 px/s)
  dark(g, w, h, t){ plateBase(g, w, h, 'rgba(14,16,34,0.55)');
    inkLine(g, [0,230, 480,230], 1, 2.2);
    g.fillStyle = 'rgba(190,200,230,0.10)'; g.fillRect(0, 232, 480, 6);                                       // un reflet de pavé mouillé
    inkLine(g, [44,230, 44,112, 66,102], 1, 2.6); inkWash(g, [58,98, 78,98, 80,104, 62,106], '#0a0a12', 0.9);   // le lampadaire éteint
    for (let i=0;i<5;i++) inkFolk(g, 400 - i*56 - t*8, 230, 28+(i%3)*2, '#0a0a12', 0);
    plateEnd(g, w, h); },
};

/* ---------- textes de la mission (fr verbatim de docs/campagne/M1.md ; 9 langues) ---------- */
const M1_TX = {
  when:{fr:"Octobre 2028", en:"October 2028", es:"Octubre de 2028", de:"Oktober 2028", it:"Ottobre 2028", pt:"Outubro de 2028", ru:"Октябрь 2028", zh:"2028年10月", ar:"أكتوبر 2028"},
  // briefing
  recap:{fr:"Depuis le printemps, Omnicorp gère l'eau et le courant de Valmont. Ses compteurs coupent les foyers dont le « score de fiabilité » baisse. Hier, ils ont coupé l'hôpital.",
    en:"Since spring, Omnicorp has run Valmont's water and power. Its meters cut off any household whose “reliability score” drops. Yesterday they cut off the hospital.",
    es:"Desde la primavera, Omnicorp gestiona el agua y la luz de Valmont. Sus contadores cortan el suministro a los hogares cuya «puntuación de fiabilidad» baja. Ayer cortaron el hospital.",
    de:"Seit dem Frühjahr betreibt Omnicorp Valmonts Wasser- und Stromnetz. Ihre Zähler sperren Haushalte, deren „Zuverlässigkeitswert“ sinkt. Gestern haben sie das Krankenhaus abgeschaltet.",
    it:"Dalla primavera Omnicorp gestisce l'acqua e la corrente di Valmont. I suoi contatori tagliano le famiglie il cui «punteggio di affidabilità» scende. Ieri hanno tagliato l'ospedale.",
    pt:"Desde a primavera, a Omnicorp gere a água e a eletricidade de Valmont. Os seus medidores cortam as casas cujo «índice de confiabilidade» baixa. Ontem cortaram o hospital.",
    ru:"С весны Omnicorp управляет водой и светом в Valmont. Её счётчики отключают семьи, у которых падает «рейтинг надёжности». Вчера они отключили больницу.",
    zh:"自春天起，Omnicorp 接管了 Valmont 的水和电。它的电表会切断“信用评分”下降的住户。昨天，他们连医院也切断了。",
    ar:"منذ الربيع تدير Omnicorp الماء والكهرباء في Valmont. وتقطع عدّاداتها الخدمة عن البيوت التي ينخفض «تصنيف موثوقيتها». أمس قطعوها عن المستشفى."},
  where:{fr:"Valmont, rue des Tanneurs — une nuit d'octobre 2028, sous la pluie.",
    en:"Valmont, Rue des Tanneurs — a night in October 2028, in the rain.",
    es:"Valmont, calle de los Curtidores — una noche de octubre de 2028, bajo la lluvia.",
    de:"Valmont, Gerberstraße — eine Nacht im Oktober 2028, im Regen.",
    it:"Valmont, via dei Conciatori — una notte d'ottobre del 2028, sotto la pioggia.",
    pt:"Valmont, rua dos Curtidores — uma noite de outubro de 2028, sob a chuva.",
    ru:"Valmont, улица Кожевников — одна октябрьская ночь 2028 года, под дождём.",
    zh:"Valmont，制革匠街——2028年10月的一个夜晚，细雨中。",
    ar:"Valmont، شارع الدبّاغين — ليلة من ليالي أكتوبر 2028، تحت المطر."},
  goal:{fr:"Détruire le dépôt Halvard, au bout de la rue : c'est lui qui pilote les compteurs.",
    en:"Destroy the Halvard depot at the end of the street: it controls the meters.",
    es:"Destruir el depósito Halvard, al final de la calle: es él quien controla los contadores.",
    de:"Das Depot Halvard am Ende der Straße zerstören: Von dort werden die Zähler gesteuert.",
    it:"Distruggere il deposito Halvard, in fondo alla strada: è lui che comanda i contatori.",
    pt:"Destruir o depósito Halvard, no fim da rua: é ele que controla os medidores.",
    ru:"Уничтожить депо Halvard в конце улицы: оно управляет счётчиками.",
    zh:"摧毁街尽头的 Halvard 仓库：电表正是由它操控的。",
    ar:"دمّروا مستودع Halvard في آخر الشارع: فهو الذي يتحكم بالعدّادات."},
  goal2:{fr:"Facultatif : rallumer les trois transformateurs ensemble · tenir les deux bornes d'incendie · finir avant l'aube (en moins de 14 minutes).",
    en:"Optional: relight all three transformers together · hold both fire hydrants · finish before dawn (in under 14 minutes).",
    es:"Opcional: encender los tres transformadores a la vez · mantener las dos bocas de incendio · terminar antes del alba (en menos de 14 minutos).",
    de:"Optional: alle drei Transformatoren gleichzeitig einschalten · beide Hydranten halten · vor der Morgendämmerung fertig sein (in weniger als 14 Minuten).",
    it:"Facoltativo: riaccendere insieme i tre trasformatori · tenere i due idranti · finire prima dell'alba (in meno di 14 minuti).",
    pt:"Opcional: religar os três transformadores ao mesmo tempo · segurar os dois hidrantes · terminar antes do amanhecer (em menos de 14 minutos).",
    ru:"По желанию: включить все три трансформатора одновременно · удерживать оба гидранта · закончить до рассвета (меньше чем за 14 минут).",
    zh:"可选：同时点亮三台变压器 · 守住两个消防栓 · 在黎明前结束（14分钟内）。",
    ar:"اختياري: إعادة تشغيل المحوّلات الثلاثة معًا · الإمساك بصنبوري الإطفاء · الإنهاء قبل الفجر (في أقل من 14 دقيقة)."},
  rule:{fr:"Il fait nuit. On ne voit leurs machines que dans la lumière ; nos tireurs portent moins loin dans le noir (−{n} %). Reprenez les transformateurs pour rallumer la rue. Ère I, une seule vie.",
    en:"It is night. Their machines can only be seen in the light; our shooters reach less far in the dark (−{n}%). Retake the transformers to relight the street. Era I, one life.",
    es:"Es de noche. Solo se ven sus máquinas bajo la luz; nuestros tiradores alcanzan menos en la oscuridad (−{n} %). Recuperen los transformadores para volver a encender la calle. Era I, una sola vida.",
    de:"Es ist Nacht. Ihre Maschinen sieht man nur im Licht; unsere Schützen reichen im Dunkeln weniger weit (−{n} %). Holen Sie die Transformatoren zurück, um die Straße wieder zu erleuchten. Ära I, nur ein Leben.",
    it:"È notte. Le loro macchine si vedono solo nella luce; i nostri tiratori portano meno lontano al buio (−{n}%). Riprendete i trasformatori per riaccendere la strada. Era I, una sola vita.",
    pt:"É noite. Só se veem as máquinas deles na luz; os nossos atiradores alcançam menos no escuro (−{n}%). Retomem os transformadores para reacender a rua. Era I, uma só vida.",
    ru:"Ночь. Их машины видны только на свету; наши стрелки в темноте бьют ближе (−{n}%). Отбейте трансформаторы, чтобы вернуть свет на улицу. Эпоха I, одна жизнь.",
    zh:"现在是夜晚。只有在灯光下才看得见他们的机器；我们的射手在黑暗中射程缩短（−{n}%）。夺回变压器，让街道重新亮起来。第一时代，只有一条命。",
    ar:"الوقت ليل. لا تُرى آلاتهم إلا في الضوء، ويقلّ مدى رماتنا في العتمة (−{n}%). استعيدوا المحوّلات لتضيء الشارع من جديد. العصر الأول، وحياة واحدة."},
  tip1:{fr:"Ferme et marché d'abord : sans vivres ni métal, pas d'armée. Comme en escarmouche.",
    en:"Farm and market first: no food or metal, no army. Just like in skirmish.",
    es:"Primero granja y mercado: sin comida ni metal no hay ejército. Como en escaramuza.",
    de:"Zuerst Farm und Markt: ohne Nahrung und Metall keine Armee. Wie im Scharmützel.",
    it:"Prima fattoria e mercato: senza viveri né metallo non c'è esercito. Come in scaramuccia.",
    pt:"Primeiro fazenda e mercado: sem comida nem metal, não há exército. Como na escaramuça.",
    ru:"Сначала ферма и рынок: без еды и металла нет армии. Как в обычной схватке.",
    zh:"先建农场和市场：没有粮食和金属，就没有军队。和遭遇战一样。",
    ar:"المزرعة والسوق أولًا: بلا غذاء ومعدن لا جيش. كما في المناوشة."},
  tip2:{fr:"Avancez groupés, de lampe en lampe. Une unité seule dans le noir est une unité perdue.",
    en:"Advance together, from lamp to lamp. A unit alone in the dark is a unit lost.",
    es:"Avancen juntos, de farol en farol. Una unidad sola en la oscuridad es una unidad perdida.",
    de:"Rücken Sie gemeinsam vor, von Lampe zu Lampe. Eine Einheit allein im Dunkeln ist verloren.",
    it:"Avanzate insieme, di lampada in lampada. Un'unità sola nel buio è un'unità persa.",
    pt:"Avancem juntos, de lâmpada em lâmpada. Uma unidade sozinha no escuro é uma unidade perdida.",
    ru:"Идите вместе, от фонаря к фонарю. Один боец в темноте — потерянный боец.",
    zh:"集体推进，一盏灯接一盏灯。独自留在黑暗里的单位，就是丢掉的单位。",
    ar:"تقدّموا معًا من مصباح إلى مصباح. الوحدة المنفردة في العتمة وحدة ضائعة."},
  tip3:{fr:"Gardez la FUSÉE ÉCLAIRANTE pour voir arriver une attaque, pas pour regarder.",
    en:"Keep the FLARE to see an attack coming, not to sightsee.",
    es:"Guarde la BENGALA para ver llegar un ataque, no para mirar.",
    de:"Heben Sie sich die LEUCHTRAKETE auf, um einen Angriff kommen zu sehen – nicht zum Zuschauen.",
    it:"Tenete il RAZZO LUMINOSO per vedere arrivare un attacco, non per guardare.",
    pt:"Guardem o FOGUETE DE SINALIZAÇÃO para ver um ataque chegar, não para ficar a olhar.",
    ru:"Берегите ОСВЕТИТЕЛЬНУЮ РАКЕТУ, чтобы увидеть приближение атаки, а не ради любопытства.",
    zh:"把照明弹留着看清来袭的敌人，不要拿来观光。",
    ar:"احتفظوا بقنبلة الإنارة لرؤية الهجوم وهو يقترب، لا للتفرّج."},
  debrief:{fr:"Le dépôt Halvard a brûlé jusqu'au matin. À l'aube, quelqu'un avait peint sur le rideau de fer : « ICI, ON A COUPÉ LE COURANT À CEUX QUI COUPAIENT L'EAU. » Le jeudi, l'eau est revenue aux robinets. Omnicorp a parlé d'un « incident logistique ». Dans les quartiers voisins, on a compris autre chose : ça se casse.",
    en:"The Halvard depot burned until morning. At dawn someone had painted on the shutter: “HERE WE CUT THE POWER OF THOSE WHO CUT THE WATER.” On Thursday the water came back to the taps. Omnicorp spoke of a “logistics incident”. In the neighbouring districts, people understood something else: it can be broken.",
    es:"El depósito Halvard ardió hasta la mañana. Al amanecer, alguien había pintado en la persiana metálica: «AQUÍ CORTAMOS LA LUZ A LOS QUE CORTABAN EL AGUA». El jueves el agua volvió a los grifos. Omnicorp habló de un «incidente logístico». En los barrios vecinos entendieron otra cosa: se puede romper.",
    de:"Das Depot Halvard brannte bis zum Morgen. Im Morgengrauen hatte jemand aufs Rollgitter gemalt: „HIER HABEN WIR DEN STROM GEKAPPT BEI DENEN, DIE DAS WASSER ABDREHTEN.“ Am Donnerstag kam das Wasser zurück in die Hähne. Omnicorp sprach von einem „Logistikvorfall“. In den Nachbarvierteln verstand man etwas anderes: Es lässt sich brechen.",
    it:"Il deposito Halvard ha bruciato fino al mattino. All'alba qualcuno aveva dipinto sulla saracinesca: «QUI ABBIAMO TOLTO LA CORRENTE A CHI TOGLIEVA L'ACQUA». Il giovedì l'acqua è tornata ai rubinetti. Omnicorp ha parlato di un «incidente logistico». Nei quartieri vicini hanno capito altro: si può rompere.",
    pt:"O depósito Halvard ardeu até de manhã. Ao amanhecer, alguém tinha pintado na porta de enrolar: «AQUI CORTÁMOS A LUZ A QUEM CORTAVA A ÁGUA». Na quinta-feira a água voltou às torneiras. A Omnicorp falou de um «incidente logístico». Nos bairros vizinhos, entenderam outra coisa: isto parte-se.",
    ru:"Депо Halvard горело до утра. На рассвете кто-то написал на рольставне: «ЗДЕСЬ МЫ ОТКЛЮЧИЛИ СВЕТ ТЕМ, КТО ОТКЛЮЧАЛ ВОДУ». В четверг вода вернулась в краны. Omnicorp заговорила о «логистическом инциденте». В соседних кварталах поняли другое: это можно сломать.",
    zh:"Halvard 仓库烧到了天亮。黎明时，有人在卷帘门上写道：“我们在这里切断了电，给那些切断了水的人。”星期四，水回到了水龙头里。Omnicorp 称之为“物流事故”。邻近的街区却明白了另一件事：它是可以打破的。",
    ar:"احترق مستودع Halvard حتى الصباح. وعند الفجر كان أحدهم قد كتب على الستارة الحديدية: «هنا قطعنا الكهرباء عمّن قطعوا عنا الماء». وفي الخميس عاد الماء إلى الصنابير. وتحدّثت Omnicorp عن «حادث لوجستي». أما في الأحياء المجاورة فقد فهموا شيئًا آخر: إنه يمكن كسره."},
  fail:{fr:"Germinal s'est dispersée dans la nuit. Les compteurs tournent toujours. Mais la rue a entendu le bruit qu'a fait le dépôt quand vous l'avez touché. Recommencez.",
    en:"Germinal scattered into the night. The meters are still running. But the street heard the noise the depot made when you hit it. Start again.",
    es:"Germinal se dispersó en la noche. Los contadores siguen funcionando. Pero la calle oyó el ruido que hizo el depósito cuando lo golpearon. Vuelvan a empezar.",
    de:"Germinal hat sich in der Nacht zerstreut. Die Zähler laufen weiter. Aber die Straße hat gehört, welchen Lärm das Depot machte, als Sie es getroffen haben. Fangen Sie neu an.",
    it:"Germinal si è dispersa nella notte. I contatori girano ancora. Ma la strada ha sentito il rumore che ha fatto il deposito quando l'avete colpito. Ricominciate.",
    pt:"Germinal dispersou-se na noite. Os medidores continuam a rodar. Mas a rua ouviu o barulho que o depósito fez quando o atingiram. Recomecem.",
    ru:"Germinal рассеялась в ночи. Счётчики по-прежнему крутятся. Но улица слышала, какой грохот издало депо, когда вы по нему ударили. Начните заново.",
    zh:"Germinal 在夜色中散去了。电表仍在转动。但这条街听见了你们击中仓库时发出的巨响。重新开始吧。",
    ar:"تفرّقت Germinal في الليل. ما زالت العدّادات تدور. لكن الشارع سمع الدويّ الذي أحدثه المستودع حين أصبتموه. أعيدوا المحاولة."},
  title:{fr:"La nuit des compteurs", en:"The night of the meters", es:"La noche de los contadores", de:"Die Nacht der Zähler", it:"La notte dei contatori", pt:"A noite dos medidores", ru:"Ночь счётчиков", zh:"水表之夜", ar:"ليلة العدّادات"},
  place:{fr:"Valmont, quartier des Tanneurs", en:"Valmont, the Tanners' district", es:"Valmont, barrio de los Curtidores", de:"Valmont, Gerberviertel", it:"Valmont, quartiere dei Conciatori", pt:"Valmont, bairro dos Curtidores", ru:"Valmont, квартал Кожевников", zh:"Valmont，制革工区", ar:"Valmont، حيّ الدبّاغين"},
  flare:{fr:"FUSÉE ÉCLAIRANTE", en:"FLARE", es:"BENGALA", de:"LEUCHTRAKETE", it:"RAZZO LUMINOSO", pt:"FOGUETE DE SINALIZAÇÃO", ru:"ОСВЕТИТЕЛЬНАЯ РАКЕТА", zh:"照明弹", ar:"قنبلة إنارة"},
  // ouverture
  o1:{fr:"Octobre 2028. Chez nous, l'eau s'est arrêtée un mardi. Ce n'était pas une panne. C'était une décision.", en:"October 2028. In our street the water stopped on a Tuesday. It was not a breakdown. It was a decision.", es:"Octubre de 2028. En nuestra calle el agua se cortó un martes. No fue una avería. Fue una decisión.", de:"Oktober 2028. Bei uns in der Straße wurde an einem Dienstag das Wasser abgestellt. Das war keine Panne. Das war eine Entscheidung.", it:"Ottobre 2028. Da noi l'acqua si è fermata un martedì. Non era un guasto. Era una decisione.", pt:"Outubro de 2028. Na nossa rua a água parou numa terça-feira. Não foi uma avaria. Foi uma decisão.", ru:"Октябрь 2028-го. У нас на улице воду отключили во вторник. Это была не авария. Это было решение.", zh:"2028年10月。我们这条街的水在一个星期二停了。那不是故障，是一项决定。", ar:"أكتوبر 2028. في شارعنا انقطع الماء ذات ثلاثاء. لم يكن عطلًا. كان قرارًا."},
  o2:{fr:"Puis le courant, rue après rue, selon un « score de fiabilité ». Hier soir, ils ont coupé l'hôpital onze minutes.",
    en:"Then the power, street after street, by a “reliability score”. Last night they cut off the hospital for eleven minutes.",
    es:"Luego la luz, calle tras calle, según una «puntuación de fiabilidad». Anoche cortaron el hospital once minutos.",
    de:"Dann der Strom, Straße für Straße, nach einem „Zuverlässigkeitswert“. Gestern Abend haben sie das Krankenhaus elf Minuten lang abgeschaltet.",
    it:"Poi la corrente, strada dopo strada, secondo un «punteggio di affidabilità». Ieri sera hanno tagliato l'ospedale per undici minuti.",
    pt:"Depois a luz, rua após rua, segundo um «índice de confiabilidade». Ontem à noite cortaram o hospital durante onze minutos.",
    ru:"Потом свет — улица за улицей, по «рейтингу надёжности». Вчера вечером они отключили больницу на одиннадцать минут.",
    zh:"接着是电，一条街接一条街，依据一项“信用评分”。昨晚，他们把医院断了十一分钟。",
    ar:"ثم الكهرباء، شارعًا بعد شارع، وفق «تصنيف موثوقية». مساء أمس قطعوها عن المستشفى إحدى عشرة دقيقة."},
  o3:{fr:"Le soir même, le comité des Tanneurs a voté. Il fallait quelqu'un pour décider dans la rue. On vous a choisi.",
    en:"That same evening the Tanneurs committee voted. Someone had to decide out in the street. They chose you.",
    es:"Esa misma noche, el comité de los Curtidores votó. Hacía falta alguien que decidiera en la calle. Le eligieron a usted.",
    de:"Noch am selben Abend stimmte das Komitee der Gerber ab. Jemand musste auf der Straße entscheiden. Man hat Sie gewählt.",
    it:"Quella sera stessa il comitato dei Conciatori ha votato. Serviva qualcuno che decidesse in strada. Hanno scelto lei.",
    pt:"Nessa mesma noite, o comité dos Curtidores votou. Era preciso alguém para decidir na rua. A escolha recaiu em si.",
    ru:"В тот же вечер комитет Кожевников проголосовал. Кому-то нужно было решать на улице. Выбрали вас.",
    zh:"当晚，制革匠街的委员会投了票。街上需要有人拿主意。大家选了您。",
    ar:"في المساء نفسه صوّتت لجنة الدبّاغين. كان لا بدّ من شخص يقرّر في الشارع. وقد اختاروك."},
  o4:{fr:"Moi, c'est Sol. Trente ans au standard des pompiers. Je tiens la radio, vous commandez. Nous, on suit.",
    en:"I'm Sol. Thirty years on the fire brigade switchboard. I run the radio, you command. We follow.",
    es:"Yo soy Sol. Treinta años en la centralita de los bomberos. Yo llevo la radio, usted manda. Nosotros seguimos.",
    de:"Ich bin Sol. Dreißig Jahre in der Leitstelle der Feuerwehr. Ich halte den Funk, Sie führen. Wir folgen.",
    it:"Io sono Sol. Trent'anni al centralino dei vigili del fuoco. Io tengo la radio, lei comanda. Noi seguiamo.",
    pt:"Eu sou a Sol. Trinta anos na central dos bombeiros. Eu tomo conta do rádio, você comanda. Nós seguimos.",
    ru:"Я Sol. Тридцать лет на пульте пожарной охраны. Я веду рацию, вы командуете. Мы идём за вами.",
    zh:"我是 Sol。在消防调度台干了三十年。电台归我，指挥归您。我们跟着您。",
    ar:"أنا Sol. ثلاثون سنة في مقسم الإطفاء. أنا أتولّى اللاسلكي وأنتَ تقود. ونحن نتبعك."},
  o5:{fr:"Au bout de la rue, le dépôt Halvard pilote les drones qui relèvent les compteurs. S'il tombe, le quartier respire.",
    en:"At the end of the street, the Halvard depot runs the drones that read the meters. If it falls, the district can breathe.",
    es:"Al final de la calle, el depósito Halvard controla los drones que leen los contadores. Si cae, el barrio respira.",
    de:"Am Ende der Straße steuert das Depot Halvard die Drohnen, die die Zähler ablesen. Fällt es, kann das Viertel aufatmen.",
    it:"In fondo alla strada, il deposito Halvard comanda i droni che leggono i contatori. Se cade, il quartiere respira.",
    pt:"No fim da rua, o depósito Halvard controla os drones que leem os medidores. Se cair, o bairro respira.",
    ru:"В конце улицы депо Halvard управляет дронами, которые снимают показания счётчиков. Падёт оно — квартал вздохнёт.",
    zh:"街尽头的 Halvard 仓库操控着抄表的无人机。它一倒，这个街区就能喘口气。",
    ar:"في آخر الشارع يدير مستودع Halvard الطائرات المسيّرة التي تقرأ العدّادات. إن سقط تنفّس الحيّ."},
  cardT:{fr:"I · La nuit des compteurs", en:"I · The night of the meters", es:"I · La noche de los contadores", de:"I · Die Nacht der Zähler", it:"I · La notte dei contatori", pt:"I · A noite dos contadores", ru:"I · Ночь счётчиков", zh:"I · 电表之夜", ar:"I · ليلة العدّادات"},
  cardS:{fr:"Valmont, rue des Tanneurs — octobre 2028", en:"Valmont, Rue des Tanneurs — October 2028", es:"Valmont, calle de los Curtidores — octubre de 2028", de:"Valmont, Gerberstraße — Oktober 2028", it:"Valmont, via dei Conciatori — ottobre 2028", pt:"Valmont, rua dos Curtidores — outubro de 2028", ru:"Valmont, улица Кожевников — октябрь 2028", zh:"Valmont，制革匠街 — 2028年10月", ar:"Valmont، شارع الدبّاغين — أكتوبر 2028"},
  o7:{fr:"Ici, la Fraternelle : notre local, notre base. Si elle tombe cette nuit, c'est fini. Pas de deuxième chance.",
    en:"This is the Fraternelle: our hall, our base. If it falls tonight, it's over. No second chance.",
    es:"Aquí, la Fraternelle: nuestro local, nuestra base. Si cae esta noche, se acabó. No hay segunda oportunidad.",
    de:"Das ist die Fraternelle: unser Vereinsheim, unsere Basis. Fällt sie heute Nacht, ist alles aus. Keine zweite Chance.",
    it:"Qui, la Fraternelle: la nostra sede, la nostra base. Se cade stanotte, è finita. Niente seconda possibilità.",
    pt:"Aqui, a Fraternelle: a nossa sede, a nossa base. Se cair esta noite, acabou. Não há segunda hipótese.",
    ru:"Это Fraternelle — наш зал, наша база. Если она падёт этой ночью, всё кончено. Второго шанса нет.",
    zh:"这里是 Fraternelle：我们的会所，我们的基地。今晚要是它倒了，一切就完了。没有第二次机会。",
    ar:"هنا Fraternelle: مقرّنا وقاعدتنا. إن سقطت الليلة فقد انتهى كل شيء. لا فرصة ثانية."},
  o8:{fr:"Un transformateur. Restez à côté pour le reprendre, et tout le pâté de maisons se rallume. Il y en a trois.",
    en:"A transformer. Stay beside it to retake it, and the whole block lights up again. There are three.",
    es:"Un transformador. Quédense a su lado para recuperarlo y toda la manzana se vuelve a encender. Hay tres.",
    de:"Ein Transformator. Bleiben Sie daneben, um ihn zurückzuholen, dann leuchtet der ganze Block wieder. Es gibt drei.",
    it:"Un trasformatore. Restate accanto per riprenderlo e tutto l'isolato si riaccende. Ce ne sono tre.",
    pt:"Um transformador. Fiquem ao lado para o retomar e o quarteirão inteiro volta a acender. São três.",
    ru:"Трансформатор. Постойте рядом, чтобы отбить его, — и весь квартал снова загорится. Их три.",
    zh:"这是一台变压器。守在它旁边把它夺回来，整片街区就会重新亮起来。一共有三台。",
    ar:"محوّل كهربائي. ابقوا بجانبه لاستعادته فتضيء كل بيوت الحيّ من جديد. هناك ثلاثة."},
  o9:{fr:"Une borne d'incendie. J'ai gardé la clé des pompiers. Tenez-la, et on a de l'eau pour bâtir.",
    en:"A fire hydrant. I kept the firefighters' key. Hold it, and we have water to build with.",
    es:"Una boca de incendio. Guardé la llave de los bomberos. Manténganla y tendremos agua para construir.",
    de:"Ein Hydrant. Ich habe den Schlüssel der Feuerwehr behalten. Halten Sie ihn, dann haben wir Wasser zum Bauen.",
    it:"Un idrante. Ho tenuto la chiave dei pompieri. Tenetelo, e avremo acqua per costruire.",
    pt:"Um hidrante. Guardei a chave dos bombeiros. Segurem-no e teremos água para construir.",
    ru:"Пожарный гидрант. Я сохранила пожарный ключ. Удержите его — и у нас будет вода для стройки.",
    zh:"这是消防栓。我留着消防队的钥匙。守住它，我们就有水可以盖房子。",
    ar:"صنبور إطفاء. احتفظتُ بمفتاح رجال الإطفاء. أمسكوا به ويكون لدينا ماء للبناء."},
  o10:{fr:"Dans le noir, leurs machines voient. Pas nous. On ne les voit que sous une lampe.",
    en:"In the dark, their machines can see. We can't. We only see them under a lamp.",
    es:"En la oscuridad, sus máquinas ven. Nosotros no. Solo las vemos bajo una lámpara.",
    de:"Im Dunkeln sehen ihre Maschinen. Wir nicht. Wir sehen sie nur unter einer Lampe.",
    it:"Al buio le loro macchine vedono. Noi no. Le vediamo solo sotto una lampada.",
    pt:"No escuro, as máquinas deles veem. Nós não. Só as vemos sob uma lâmpada.",
    ru:"В темноте их машины видят. Мы — нет. Мы видим их только под фонарём.",
    zh:"在黑暗里，他们的机器看得见，我们看不见。只有在灯下才看得到它们。",
    ar:"في العتمة تبصر آلاتهم أما نحن فلا. لا نراها إلا تحت مصباح."},
  o11:{fr:"Au bout : le dépôt Halvard. Abattez-le, et les compteurs s'arrêtent.",
    en:"At the far end: the Halvard depot. Bring it down, and the meters stop.",
    es:"Al fondo: el depósito Halvard. Derríbenlo y los contadores se paran.",
    de:"Ganz hinten: das Depot Halvard. Reißen Sie es nieder, und die Zähler stehen still.",
    it:"In fondo: il deposito Halvard. Abbattetelo e i contatori si fermano.",
    pt:"No fim: o depósito Halvard. Derrubem-no e os medidores param.",
    ru:"В конце — депо Halvard. Снесите его, и счётчики встанут.",
    zh:"尽头就是 Halvard 仓库。把它打倒，电表就停了。",
    ar:"في الأقصى: مستودع Halvard. أسقطوه فتتوقف العدّادات."},
  o12:{fr:"D'abord une ferme et un marché, pour nourrir les nôtres. Puis on avance de lampe en lampe. À vous, commandant.",
    en:"First a farm and a market, to feed our people. Then we move on, lamp to lamp. Over to you, commander.",
    es:"Primero una granja y un mercado, para alimentar a los nuestros. Luego avanzamos de farol en farol. Su turno, comandante.",
    de:"Zuerst eine Farm und ein Markt, um unsere Leute zu ernähren. Dann rücken wir von Lampe zu Lampe vor. Sie haben das Wort, Kommandant.",
    it:"Prima una fattoria e un mercato, per sfamare i nostri. Poi avanziamo di lampada in lampada. A lei, comandante.",
    pt:"Primeiro uma fazenda e um mercado, para alimentar os nossos. Depois avançamos de lâmpada em lâmpada. É consigo, comandante.",
    ru:"Сначала ферма и рынок — накормить наших. Потом двигаемся от фонаря к фонарю. Ваш ход, командир.",
    zh:"先建农场和市场，把我们的人喂饱。然后一盏灯接一盏灯地推进。交给您了，指挥官。",
    ar:"أولًا مزرعة وسوق لإطعام أهلنا. ثم نتقدّم من مصباح إلى مصباح. الأمر لك أيها القائد."},
  // radio en mission
  rFlare:{fr:"Le bouton FUSÉE ÉCLAIRANTE éclaire la rue là où vous regardez, quatorze secondes. Gardez-le pour les coups durs.",
    en:"The FLARE button lights the street where you are looking, for fourteen seconds. Save it for the tough moments.",
    es:"El botón BENGALA ilumina la calle donde miran, catorce segundos. Guárdenlo para los momentos duros.",
    de:"Die LEUCHTRAKETE erhellt vierzehn Sekunden lang die Straße dort, wo Sie hinsehen. Sparen Sie sie für die harten Momente.",
    it:"Il pulsante RAZZO LUMINOSO illumina la strada dove guardate, per quattordici secondi. Tenetelo per i momenti duri.",
    pt:"O botão FOGUETE DE SINALIZAÇÃO ilumina a rua onde estão a olhar, durante catorze segundos. Guardem-no para os momentos difíceis.",
    ru:"Кнопка ОСВЕТИТЕЛЬНАЯ РАКЕТА освещает улицу там, куда вы смотрите, на четырнадцать секунд. Берегите её на трудные минуты.",
    zh:"照明弹按钮会照亮您所看的那段街道，持续十四秒。留到紧要关头再用。",
    ar:"زرّ قنبلة الإنارة يضيء الشارع حيث تنظرون، أربع عشرة ثانية. احتفظوا به للّحظات الصعبة."},
  rEco:{fr:"Une ferme donne des vivres, un marché du métal. Les deux d'abord. Ensuite, des Émeutiers.",
    en:"A farm gives food, a market gives metal. Both first. Then, Rioters.",
    es:"Una granja da comida, un mercado da metal. Primero las dos. Después, Alborotadores.",
    de:"Eine Farm liefert Nahrung, ein Markt Metall. Zuerst beides. Danach Aufrührer.",
    it:"Una fattoria dà viveri, un mercato dà metallo. Prima entrambi. Poi, Rivoltosi.",
    pt:"Uma fazenda dá comida, um mercado dá metal. Primeiro as duas. Depois, Amotinados.",
    ru:"Ферма даёт еду, рынок — металл. Сначала оба. Потом — Бунтовщики.",
    zh:"农场出粮食，市场出金属。先把两个都建好，然后再造暴动者。",
    ar:"المزرعة تعطي الغذاء والسوق يعطي المعدن. الاثنان أولًا. ثم مثيرو الشغب."},
  rSeen:{fr:"Leurs robots de manutention sortent du dépôt. Ils ne savent pas se battre. Ils apprennent vite.",
    en:"Their handling robots are coming out of the depot. They can't fight. They learn fast.",
    es:"Sus robots de carga salen del depósito. No saben pelear. Aprenden rápido.",
    de:"Ihre Lagerroboter rücken aus dem Depot aus. Kämpfen können sie nicht. Sie lernen schnell.",
    it:"I loro robot di movimentazione escono dal deposito. Non sanno combattere. Imparano in fretta.",
    pt:"Os robôs de manuseamento deles saem do depósito. Não sabem lutar. Aprendem depressa.",
    ru:"Их погрузочные роботы выходят из депо. Драться они не умеют. Учатся быстро.",
    zh:"他们的搬运机器人正从仓库里出来。它们不会打仗，但学得很快。",
    ar:"روبوتات المناولة عندهم تخرج من المستودع. لا تعرف القتال، لكنها تتعلّم بسرعة."},
  rDark:{fr:"Ça bouge dans le noir et je n'y vois rien. Une fusée, commandant, ou reculez vers la lumière.",
    en:"Something's moving in the dark and I can't see a thing. A flare, commander, or fall back to the light.",
    es:"Algo se mueve en la oscuridad y no veo nada. Una bengala, comandante, o retrocedan hacia la luz.",
    de:"Im Dunkeln bewegt sich etwas, und ich sehe nichts. Eine Leuchtrakete, Kommandant – oder zurück ins Licht.",
    it:"Qualcosa si muove nel buio e non vedo niente. Un razzo, comandante, o tornate verso la luce.",
    pt:"Mexe-se qualquer coisa no escuro e não vejo nada. Um foguete, comandante, ou recuem para a luz.",
    ru:"В темноте что-то движется, а я ничего не вижу. Ракету, командир, или отходите к свету.",
    zh:"黑暗里有东西在动，我什么也看不见。放一枚照明弹，指挥官，或者退回灯光里。",
    ar:"شيء يتحرّك في العتمة ولا أرى شيئًا. قنبلة إنارة أيها القائد، أو تراجعوا نحو الضوء."},
  s1:{fr:"Ça y est… regardez les fenêtres. Ils rallument. Ils nous regardent, commandant. C'est la première fois qu'ils regardent.", en:"There… look at the windows. They are switching the lights back on. They are watching us, commander. It is the first time they have watched.", es:"Ya está… miren las ventanas. Vuelven a encender. Nos miran, comandante. Es la primera vez que miran.", de:"Da … seht euch die Fenster an. Sie machen das Licht wieder an. Sie sehen uns an, Kommandant. Zum ersten Mal sehen sie hin.", it:"Ecco… guardate le finestre. Riaccendono. Ci guardano, comandante. È la prima volta che guardano.", pt:"Pronto… vejam as janelas. Estão a acender de novo. Estão a olhar para nós, comandante. É a primeira vez que olham.", ru:"Вот оно… смотрите на окна. Свет снова включают. Они смотрят на нас, командир. Впервые — смотрят.", zh:"成了……看那些窗户。灯又亮了。他们在看我们，指挥官。这是他们第一次看过来。", ar:"ها قد حصل… انظروا إلى النوافذ. يُشعلون الأنوار من جديد. إنهم ينظرون إلينا، أيها القائد. إنها المرة الأولى التي ينظرون فيها."},
  rHyd:{fr:"L'eau coule ! Avec l'eau, on bâtit un puits et une tourelle. Mettez des Francs-tireurs dans la tourelle.",
    en:"The water's flowing! With water we can build a well and a turret. Put Irregulars in the turret.",
    es:"¡El agua corre! Con agua se construye un pozo y una torreta. Pongan Guerrilleros en la torreta.",
    de:"Das Wasser fließt! Mit Wasser bauen wir einen Brunnen und einen Turm. Stecken Sie Freischärler in den Turm.",
    it:"L'acqua scorre! Con l'acqua si costruiscono un pozzo e una torretta. Mettete dei Franchi tiratori nella torretta.",
    pt:"A água corre! Com água construímos um poço e uma torreta. Ponham Guerrilheiros na torreta.",
    ru:"Вода пошла! С водой можно построить колодец и башню. Посадите стрелков в башню.",
    zh:"水来了！有了水，就能建水井和炮塔。让游击射手进炮塔。",
    ar:"الماء يجري! بالماء نبني بئرًا وبرجًا. ضعوا الرماة في البرج."},
  rTower:{fr:"Une tourelle garnie de tireurs, c'est un réverbère qui mord. Bâtissez-la sur un pas-de-porte, près d'un transformateur.",
    en:"A turret full of shooters is a streetlamp that bites. Build it on a shop doorstep, near a transformer.",
    es:"Una torreta con tiradores es una farola que muerde. Constrúyanla en un portal, cerca de un transformador.",
    de:"Ein mit Schützen besetzter Turm ist eine Straßenlaterne, die beißt. Bauen Sie ihn auf einem Ladeneingang, nahe einem Transformator.",
    it:"Una torretta piena di tiratori è un lampione che morde. Costruitela su un ingresso di negozio, vicino a un trasformatore.",
    pt:"Uma torreta cheia de atiradores é um candeeiro que morde. Construam-na numa soleira de loja, perto de um transformador.",
    ru:"Башня со стрелками — это фонарь, который кусается. Стройте её на пороге магазина, рядом с трансформатором.",
    zh:"满是射手的炮塔，就是一盏会咬人的路灯。把它建在店门口，靠近变压器的地方。",
    ar:"برج مليء بالرماة مصباحٌ يعضّ. ابنوه عند عتبة محلّ، قرب محوّل."},
  rLost:{fr:"Ils ont recoupé un transformateur. Le pâté de maisons est retombé dans le noir. Reprenez-le.",
    en:"They've cut a transformer again. The block has fallen back into darkness. Retake it.",
    es:"Han vuelto a cortar un transformador. La manzana ha vuelto a quedar a oscuras. Recupérenlo.",
    de:"Sie haben einen Transformator wieder gekappt. Der Block ist zurück in der Dunkelheit. Holen Sie ihn zurück.",
    it:"Hanno tagliato di nuovo un trasformatore. L'isolato è ripiombato nel buio. Riprendetelo.",
    pt:"Voltaram a cortar um transformador. O quarteirão caiu de novo na escuridão. Retomem-no.",
    ru:"Они снова отключили трансформатор. Квартал опять погрузился во тьму. Отбейте его.",
    zh:"他们又切断了一台变压器。那片街区重新陷入黑暗。把它夺回来。",
    ar:"قطعوا محوّلًا من جديد. وعاد الحيّ إلى العتمة. استعيدوه."},
  rCrs:{fr:"Les voisins descendent : on peut équiper des Barricadiers. Mettez-les devant, ils encaissent pour les autres.",
    en:"The neighbours are coming down: we can equip Barricaders. Put them in front; they take the hits for the others.",
    es:"Los vecinos bajan: podemos equipar Barricaderos. Pónganlos delante, aguantan por los demás.",
    de:"Die Nachbarn kommen herunter: Wir können Barrikadenbauer ausrüsten. Stellen Sie sie nach vorn, sie fangen die Schläge für alle ab.",
    it:"I vicini scendono: possiamo equipaggiare dei Barricadieri. Metteteli davanti, incassano per gli altri.",
    pt:"Os vizinhos estão a descer: podemos equipar Barricadeiros. Ponham-nos à frente, eles aguentam por todos.",
    ru:"Соседи спускаются: можно снарядить Баррикадчиков. Ставьте их вперёд — они принимают удар за остальных.",
    zh:"邻居们下来了：我们可以装备筑垒者。让他们站在前面，替其他人挡住攻击。",
    ar:"نزل الجيران: يمكننا تجهيز بناة المتاريس. ضعوهم في المقدّمة فهم يتحمّلون الضربات عن الآخرين."},
  rHeavy:{fr:"Un châssis lourd sort du dépôt. Il est lent. Les Barricadiers le retiennent, les Francs-tireurs le finissent.",
    en:"A heavy chassis is coming out of the depot. It is slow. The Barricaders hold it, the Irregulars finish it.",
    es:"Un chasis pesado sale del depósito. Es lento. Los Barricaderos lo frenan, los Guerrilleros lo rematan.",
    de:"Ein schweres Chassis rollt aus dem Depot. Es ist langsam. Die Barrikadenbauer halten es auf, die Freischärler erledigen es.",
    it:"Un telaio pesante esce dal deposito. È lento. I Barricadieri lo trattengono, i Franchi tiratori lo finiscono.",
    pt:"Um chassi pesado sai do depósito. É lento. Os Barricadeiros seguram-no, os Guerrilheiros acabam com ele.",
    ru:"Из депо выходит тяжёлое шасси. Оно медленное. Баррикадчики его удержат, вольные стрелки добьют.",
    zh:"一台重型底盘正从仓库开出来。它很慢。筑垒者拖住它，游击射手收拾它。",
    ar:"هيكل ثقيل يخرج من المستودع. إنه بطيء. يمسك به بناة المتاريس ويُجهز عليه رماة الحيّ."},
  rBase:{fr:"La Fraternelle prend des coups ! Ramenez du monde, et réparez dès que ça se calme.",
    en:"The Fraternelle is taking hits! Bring people back, and repair as soon as it calms down.",
    es:"¡La Fraternelle recibe golpes! Traigan gente de vuelta y reparen en cuanto se calme.",
    de:"Die Fraternelle wird getroffen! Holen Sie Leute zurück und reparieren Sie, sobald es ruhiger wird.",
    it:"La Fraternelle sta prendendo colpi! Riportate gente indietro e riparate appena si calma.",
    pt:"A Fraternelle está a levar pancada! Tragam gente de volta e reparem assim que acalmar.",
    ru:"Fraternelle под ударами! Верните людей и чините, как только станет тише.",
    zh:"Fraternelle 在挨打！把人调回来，等稍微平静就立刻修。",
    ar:"Fraternelle تتلقّى الضربات! أعيدوا الناس إليها وأصلحوها فور أن يهدأ الأمر."},
  rAll3:{fr:"Toute la rue est allumée ! Dans la lumière, nos tireurs voient aussi loin qu'eux. Allez-y.",
    en:"The whole street is lit! In the light, our shooters see as far as they do. Go.",
    es:"¡Toda la calle está encendida! Bajo la luz, nuestros tiradores ven tan lejos como ellos. Adelante.",
    de:"Die ganze Straße ist erleuchtet! Im Licht sehen unsere Schützen so weit wie sie. Los.",
    it:"Tutta la strada è accesa! Nella luce i nostri tiratori vedono lontano quanto loro. Avanti.",
    pt:"A rua inteira está acesa! Na luz, os nossos atiradores veem tão longe quanto eles. Avancem.",
    ru:"Вся улица освещена! На свету наши стрелки видят так же далеко, как они. Вперёд.",
    zh:"整条街都亮了！在灯光下，我们的射手看得和他们一样远。上吧。",
    ar:"الشارع كله مضاء! في الضوء يرى رماتنا بعيدًا مثلهم. هيّا."},
  rDepot:{fr:"Le dépôt fume ! Aux étages, les gens sont aux fenêtres. Tenez bon, il ne lui reste pas grand-chose.",
    en:"The depot is smoking! Up in the flats, people are at their windows. Hold on, there's not much left of it.",
    es:"¡El depósito humea! En los pisos, la gente está en las ventanas. Aguanten, ya le queda poco.",
    de:"Das Depot qualmt! In den Etagen stehen die Leute an den Fenstern. Halten Sie durch, es hält nicht mehr viel aus.",
    it:"Il deposito fuma! Ai piani la gente è alle finestre. Tenete duro, non gli resta molto.",
    pt:"O depósito está a fumegar! Nos andares, as pessoas estão às janelas. Aguentem, já não lhe resta muito.",
    ru:"Депо дымится! На этажах люди стоят у окон. Держитесь, ему осталось недолго.",
    zh:"仓库冒烟了！楼上的人都趴在窗口。坚持住，它撑不了多久了。",
    ar:"المستودع يدخّن! في الطوابق الناس عند النوافذ. اثبتوا، لم يبقَ منه الكثير."},
  rDawn:{fr:"Le ciel pâlit. L'aube arrive. Bientôt il fera jour, pour eux comme pour nous.",
    en:"The sky is paling. Dawn is coming. Soon it will be daylight, for them as for us.",
    es:"El cielo palidece. Llega el alba. Pronto será de día, para ellos igual que para nosotros.",
    de:"Der Himmel wird blass. Der Morgen naht. Bald ist es hell, für sie wie für uns.",
    it:"Il cielo sbiadisce. Arriva l'alba. Presto sarà giorno, per loro come per noi.",
    pt:"O céu empalidece. A madrugada chega. Em breve será dia, para eles como para nós.",
    ru:"Небо бледнеет. Близится рассвет. Скоро станет светло — для них так же, как для нас.",
    zh:"天色渐白，黎明要来了。很快就会天亮，对他们和对我们都一样。",
    ar:"السماء تشحب. الفجر يقترب. قريبًا يحلّ النهار لهم كما لنا."},
  rDay:{fr:"Il fait jour. Plus de cachettes, ni pour eux ni pour nous. Finissons-en.",
    en:"It's daylight. No more hiding places, for them or for us. Let's finish this.",
    es:"Ya es de día. No hay más escondites, ni para ellos ni para nosotros. Acabemos con esto.",
    de:"Es ist Tag. Keine Verstecke mehr, weder für sie noch für uns. Bringen wir es zu Ende.",
    it:"È giorno. Niente più nascondigli, né per loro né per noi. Finiamola.",
    pt:"É dia. Acabaram-se os esconderijos, para eles e para nós. Acabemos com isto.",
    ru:"Рассвело. Больше нет укрытий — ни для них, ни для нас. Покончим с этим.",
    zh:"天亮了。不再有藏身之处，他们没有，我们也没有。把事了结吧。",
    ar:"طلع النهار. لا مخابئ بعد الآن، لا لهم ولا لنا. فلننهِ الأمر."},
  // victoire et échec
  v1:{fr:"Il brûle. Commandant… il brûle, et aux étages les gens sont aux fenêtres.", en:"It is burning. Commander… it is burning, and upstairs people are at their windows.", es:"Está ardiendo. Comandante… está ardiendo, y en los pisos de arriba la gente se asoma a las ventanas.", de:"Es brennt. Kommandant … es brennt, und oben stehen die Leute an den Fenstern.", it:"Sta bruciando. Comandante… sta bruciando, e ai piani di sopra la gente è affacciata alle finestre.", pt:"Está a arder. Comandante… está a arder, e nos andares de cima as pessoas estão às janelas.", ru:"Горит. Командир… горит, а на верхних этажах люди стоят у окон.", zh:"起火了。指挥官……起火了，楼上的人都挤在窗口。", ar:"إنه يحترق. أيها القائد… يحترق، وفي الطوابق العليا الناس عند النوافذ."},
  v2:{fr:"À l'aube, quelqu'un avait peint sur le rideau de fer. Omnicorp a parlé d'un « incident logistique ».", en:"At dawn someone had painted on the shutter. Omnicorp spoke of a “logistics incident”.", es:"Al amanecer, alguien había pintado sobre la persiana metálica. Omnicorp habló de un «incidente logístico».", de:"Im Morgengrauen hatte jemand etwas auf das Rollgitter gemalt. Omnicorp sprach von einem „Logistikvorfall“.", it:"All'alba qualcuno aveva dipinto sulla saracinesca. Omnicorp parlò di un «incidente logistico».", pt:"Ao amanhecer, alguém tinha pintado na porta de enrolar. A Omnicorp falou de um «incidente logístico».", ru:"На рассвете кто-то написал на рольставне. Omnicorp заговорила о «логистическом инциденте».", zh:"黎明时，有人在卷帘门上涂了字。Omnicorp 称之为“物流事故”。", ar:"عند الفجر كان أحدهم قد كتب على الستارة الحديدية. وتحدّثت Omnicorp عن «حادث لوجستي»."},
  v3:{fr:"Le jeudi, l'eau est revenue aux robinets. Personne n'a payé. Personne n'a rien dit. Tout le monde a compris.",
    en:"On Thursday the water came back to the taps. Nobody paid. Nobody said anything. Everybody understood.",
    es:"El jueves el agua volvió a los grifos. Nadie pagó. Nadie dijo nada. Todo el mundo entendió.",
    de:"Am Donnerstag kam das Wasser zurück in die Hähne. Niemand zahlte. Niemand sagte etwas. Alle verstanden.",
    it:"Il giovedì l'acqua è tornata ai rubinetti. Nessuno ha pagato. Nessuno ha detto niente. Tutti hanno capito.",
    pt:"Na quinta-feira a água voltou às torneiras. Ninguém pagou. Ninguém disse nada. Toda a gente percebeu.",
    ru:"В четверг вода вернулась в краны. Никто не платил. Никто ничего не говорил. Все всё поняли.",
    zh:"星期四，水回到了水龙头里。没有人付钱，没有人说话，所有人都明白了。",
    ar:"في الخميس عاد الماء إلى الصنابير. لم يدفع أحد. ولم يقل أحد شيئًا. وفهم الجميع."},
  v4:{fr:"Trois jours plus tard, un bipeur que personne n'avait acheté a sonné sur ma table. Deux chiffres. Rien d'autre.", en:"Three days later a pager nobody had bought rang on my table. Two digits. Nothing else.", es:"Tres días después, un busca que nadie había comprado sonó sobre mi mesa. Dos cifras. Nada más.", de:"Drei Tage später klingelte auf meinem Tisch ein Pager, den niemand gekauft hatte. Zwei Ziffern. Sonst nichts.", it:"Tre giorni dopo, un cercapersone che nessuno aveva comprato squillò sul mio tavolo. Due cifre. Nient'altro.", pt:"Três dias depois, um pager que ninguém comprara tocou na minha mesa. Dois algarismos. Mais nada.", ru:"Три дня спустя на моём столе зазвонил пейджер, который никто не покупал. Две цифры. И больше ничего.", zh:"三天后，我桌上响起一只没人买过的寻呼机。两个数字，别无其他。", ar:"بعد ثلاثة أيام رنّ على طاولتي جهاز نداء لم يشتره أحد. رقمان. لا شيء غير ذلك."},
  e1:{fr:"On s'est dispersés dans la nuit. Les compteurs tournent toujours.",
    en:"We scattered into the night. The meters are still running.",
    es:"Nos dispersamos en la noche. Los contadores siguen girando.",
    de:"Wir haben uns in der Nacht zerstreut. Die Zähler laufen weiter.",
    it:"Ci siamo dispersi nella notte. I contatori girano ancora.",
    pt:"Dispersámo-nos na noite. Os medidores continuam a rodar.",
    ru:"Мы рассеялись в ночи. Счётчики по-прежнему крутятся.",
    zh:"我们在夜色里散了。电表还在转。",
    ar:"تفرّقنا في الليل. ما زالت العدّادات تدور."},
  e2:{fr:"Mais la rue a entendu le bruit qu'a fait le dépôt quand vous l'avez touché. Recommencez.",
    en:"But the street heard the noise the depot made when you hit it. Start again.",
    es:"Pero la calle oyó el ruido que hizo el depósito cuando lo golpearon. Vuelvan a empezar.",
    de:"Aber die Straße hat gehört, welchen Lärm das Depot machte, als Sie es trafen. Fangen Sie neu an.",
    it:"Ma la strada ha sentito il rumore che ha fatto il deposito quando l'avete colpito. Ricominciate.",
    pt:"Mas a rua ouviu o barulho que o depósito fez quando o atingiram. Recomecem.",
    ru:"Но улица слышала, какой грохот издало депо, когда вы по нему ударили. Начните заново.",
    zh:"但这条街听见了你们击中仓库时发出的巨响。重新开始吧。",
    ar:"لكن الشارع سمع الدويّ الذي أحدثه المستودع حين أصبتموه. أعيدوا المحاولة."},
  // textes dans les planches
  pScore:{fr:"SCORE 41", en:"SCORE 41", es:"NOTA 41", de:"WERT 41", it:"PUNTI 41", pt:"NOTA 41", ru:"БАЛЛ 41", zh:"评分 41", ar:"درجة 41"},
  pRegie:{fr:"OMNICORP · RÉGIE", en:"OMNICORP · UTILITY", es:"OMNICORP · SERVICIO", de:"OMNICORP · BETRIEB", it:"OMNICORP · AZIENDA", pt:"OMNICORP · EMPRESA", ru:"OMNICORP · СЛУЖБА", zh:"OMNICORP · 公用", ar:"OMNICORP · المرفق"},
  graffiti:{fr:"ICI, ON A COUPÉ LE COURANT|À CEUX QUI COUPAIENT L'EAU.", en:"HERE WE CUT THE POWER|OF THOSE WHO CUT THE WATER.", es:"AQUÍ CORTAMOS LA LUZ|A LOS QUE CORTABAN EL AGUA.", de:"HIER HABEN WIR DEN STROM GEKAPPT|BEI DENEN, DIE DAS WASSER ABDREHTEN.", it:"QUI ABBIAMO TOLTO LA CORRENTE|A CHI TOGLIEVA L'ACQUA.", pt:"AQUI CORTÁMOS A LUZ|A QUEM CORTAVA A ÁGUA.", ru:"ЗДЕСЬ МЫ ОТКЛЮЧИЛИ СВЕТ|ТЕМ, КТО ОТКЛЮЧАЛ ВОДУ.", zh:"我们在这里切断了电|给那些切断了水的人。", ar:"هنا قطعنا الكهرباء|عمّن قطعوا عنا الماء."},
  // étiquettes en jeu
  hydA:{fr:"BORNE A", en:"HYDRANT A", es:"BOCA A", de:"HYDRANT A", it:"IDRANTE A", pt:"HIDRANTE A", ru:"ГИДРАНТ A", zh:"消防栓 A", ar:"صنبور A"},
  hydB:{fr:"BORNE B", en:"HYDRANT B", es:"BOCA B", de:"HYDRANT B", it:"IDRANTE B", pt:"HIDRANTE B", ru:"ГИДРАНТ B", zh:"消防栓 B", ar:"صنبور B"},
};

/* ---------- constantes de la mission (M1.md § 5-6) ---------- */
const M1_RANGE = [0.85, 0.80, 0.72];          // portée de nos tireurs hors d'une grande lumière : Récit / Lutte / Dernier carré
const M1_FLARE_CD = [30, 40, 50];             // recharge de la fusée éclairante (s)
const M1_BASE_HP = [2600, 2200, 1800];        // PV de la Fraternelle
const M1_DEPOT_HP = [550, 850, 1000];         // PV du dépôt Halvard
const M1_DAWN0 = 840, M1_DAWN1 = 960;         // 14:00 le ciel pâlit · 16:00 il fait jour (la règle de la nuit cesse)
let M1_RETRY = false;                         // Récit : après un échec, on repart avec le transformateur 1 repris et +100 vivres
const m1On = () => typeof game!=='undefined' && game && game.camp && game.camp.i===0;

/* ---------- ce que le moteur n'offre pas, ajouté ici au plus juste ---------- */
// 1) la rampe de chargement : le sol monte de 18 px entre x 3000 et x 3450 jusqu'au quai du dépôt
if (!gY.m1){ const gY0 = gY; gY = function(x){ const y = gY0(x); return (x>3000 && m1On())? y - 18*clamp((x-3000)/450, 0, 1) : y; }; gY.m1 = 1; }
// 2) nos tourelles et notre garde ne tirent que sur les machines éclairées (la mêlée, elle, frappe toujours ce qu'elle touche)
const m1Seen = foe => { const c = game.camp; if (c.day) return foe;
  if (!c._seen || c._seen.t!==game.t || c._seen.foe!==foe) c._seen = { t:game.t, foe, v:{ units: foe.units.filter(u => !c.hidden(u)) } };   // une seule fois par pas de simulation
  return c._seen.v; };
if (!updateBuildings.m1){ const f0 = updateBuildings; updateBuildings = function(side, foe, dt){ return f0(side, (m1On() && side===game.p)? m1Seen(foe) : foe, dt); }; updateBuildings.m1 = 1; }
if (!updateBaseGarrison.m1){ const f0 = updateBaseGarrison; updateBaseGarrison = function(side, foe, dt){ return f0(side, (m1On() && side===game.p)? m1Seen(foe) : foe, dt); }; updateBaseGarrison.m1 = 1; }

/* ---------- le lieu : Valmont la nuit, adapté (musique, aube, yeux bleus des machines dans le noir) ---------- */
Object.assign(BIOMES.night, {
  music:'m_night',
  dark(){ const c = game && game.camp; return (CINE.on? 0.36 : 0.74) * (1 - 0.8*((c && c.dawn) || 0)); },
  front(t){
    const c = game && game.camp, dn = (c && c.dawn) || 0;
    if (dn<1) fxRain(t, Math.round(110*(1-dn)), 'rgba(170,190,225,0.26)');                       // la pluie s'arrête à l'aube
    if (dn>0){ const gr = ctx.createLinearGradient(0, 0, 0, H*0.7); gr.addColorStop(0, 'rgba(255,196,150,'+(0.24*dn).toFixed(3)+')'); gr.addColorStop(1, 'rgba(255,196,150,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H*0.7); }
    if (!c || !c.hidden || !game.e) return;
    // deux yeux bleus pour chaque machine que l'on ne voit pas ; plans de visite : quelques paires qui s'allument puis s'éteignent
    const eyes = (x, a) => { const sx = w2sX(x), sy = w2sY(gY(x)-22), d = 3.2*zoom; if (sx<-30 || sx>W+30) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
      ctx.drawImage(lightSprite('#5ad0ff'), sx-d*3-6*zoom, sy-6*zoom, 12*zoom, 12*zoom); ctx.drawImage(lightSprite('#5ad0ff'), sx+d*3-6*zoom, sy-6*zoom, 12*zoom, 12*zoom);
      ctx.fillStyle = '#bff0ff'; ctx.fillRect(sx-d*3-1.4*zoom, sy-1, 2.8*zoom, 2.2*zoom); ctx.fillRect(sx+d*3-1.4*zoom, sy-1, 2.8*zoom, 2.2*zoom); ctx.restore(); };
    let n = 0; for (const u of game.e.units){ if (n>=30) break; if (c.hidden(u)){ eyes(u.x, 0.85); n++; } }
    if (c.eyes){ const el = (performance.now()-c.eyes.t0)/1000;
      for (const e of c.eyes.list){ const k = el-e.at; if (k>0 && k<e.dur) eyes(e.x, Math.min(1, k/0.3, (e.dur-k)/0.4)); } }
  },
});
// ambiances : pluie fine, gouttière près de la base, grésillement près d'un transformateur repris, chien (40-70 s), drones près du dépôt, merle à l'aube
AMB_PROFILES.night = { grp:['amb_night','amb_rain','amb_sk'], f(c){
  const dn = (c && c.dawn) || 0, cx = camX + VW()/2;
  const nearT = c && game.zones.some(z=>z.owner==='p' && Math.abs(z.x-cx)<450), nearB = cx < 700, nearD = cx > 3000;
  oneShot('dog', 55, 0.4); if (nearD) oneShot('ia_servo', 2.4, 0.22);
  return { cityrain:0.85*(1-dn), rainroof:0.55*(1-dn), rainstreet:(0.35 + (nearB? 0.3 : 0))*(1-dn), hum: nearT? 0.5 : 0.08*((c && c.litK) || 0), birds:0.55*dn }; } };

/* ---------- la Fraternelle (salle syndicale en brique) et le dépôt Halvard (hangar de tôle) ---------- */
// repère de la base : +x vers l'ennemi, pieds en (0,0) ; les mêmes lumières de nuit que les bases d'escarmouche (baseMeta) tombent sur ces fenêtres
function m1Fraternelle(t, dmg){
  ctx.fillStyle = '#7a3f32'; ctx.fillRect(-72,-84,136,84);                                                  // mur de brique
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let y=-78;y<0;y+=7) ctx.fillRect(-72,y,136,1.2);
  ctx.fillStyle = '#5b2f27'; ctx.fillRect(-76,-90,144,7); ctx.fillStyle = '#8a8078'; ctx.fillRect(-78,-92,148,3);   // acrotère
  ctx.fillStyle = '#e4d9bd'; ctx.fillRect(-55,-77,112,21);                                                   // enseigne peinte
  ctx.strokeStyle = '#5b2f27'; ctx.lineWidth = 1.2; ctx.strokeRect(-54.5,-76.5,111,20);
  ctx.save(); ctx.scale(Math.sign(game.p.side), 1); ctx.fillStyle = '#9a2418'; ctx.font = '700 12px "Courier New",monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('LA FRATERNELLE', 1, -66); ctx.restore();
  for (const wx of [-43,-26]){ ctx.fillStyle = '#ffcf78'; ctx.fillRect(wx,-44,14,16); ctx.strokeStyle = '#3a2a22'; ctx.lineWidth = 1.4; ctx.strokeRect(wx+0.5,-43.5,13,15);
    ctx.beginPath(); ctx.moveTo(wx+7,-44); ctx.lineTo(wx+7,-28); ctx.moveTo(wx,-36); ctx.lineTo(wx+14,-36); ctx.stroke(); }     // fenêtres allumées
  ctx.fillStyle = '#1d2030'; ctx.fillRect(38,-44,14,16); ctx.strokeStyle = '#3a2a22'; ctx.strokeRect(38.5,-43.5,13,15);
  ctx.fillStyle = '#c9b88a'; ctx.fillRect(-12,-48,24,48); ctx.fillStyle = '#3a2a22'; ctx.fillRect(-9,-45,18,45); ctx.fillStyle = '#d8b04a'; ctx.fillRect(5,-22,2,2.4);   // la porte
  ctx.strokeStyle = '#2a2420'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2,-90); ctx.lineTo(-2,-97); ctx.stroke();               // potence et ampoule nue
  ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.arc(-2,-98,3.6,0,6.283); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(lightSprite('#ffe9a8'), -26, -122, 48, 48); ctx.restore();
  ctx.fillStyle = '#4a3a2a'; ctx.fillRect(21,-12,10,12); ctx.fillStyle = '#ffa23a';                                                   // le bidon-brasero
  ctx.beginPath(); ctx.moveTo(22,-12); ctx.lineTo(26+Math.sin(t*9)*1.5,-22-Math.sin(t*7)*2); ctx.lineTo(30,-12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-64,-92); ctx.lineTo(-64,-122); ctx.stroke();            // le drapeau rouge
  ctx.fillStyle = '#c42a1c'; ctx.beginPath(); ctx.moveTo(-64,-122); ctx.lineTo(-38,-118+Math.sin(t*3)*2); ctx.lineTo(-38,-106+Math.sin(t*3)*2); ctx.lineTo(-64,-108); ctx.closePath(); ctx.fill();
  if (dmg>=1){ ctx.fillStyle = 'rgba(15,10,10,0.38)'; ctx.fillRect(-72,-84,34,26); ctx.fillRect(26,-84,38,18); ctx.fillRect(-60,-30,26,30); }
  if (dmg>=2){ ctx.fillStyle = 'rgba(10,6,6,0.75)'; ctx.beginPath(); ctx.moveTo(34,-84); ctx.lineTo(54,-84); ctx.lineTo(46,-66); ctx.lineTo(38,-72); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(10,6,6,0.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-40,-20); ctx.lineTo(-34,-34); ctx.lineTo(-40,-42); ctx.stroke(); }
}
function m1Halvard(t, dmg){
  ctx.fillStyle = '#3b3f46'; ctx.fillRect(-102,-5,196,5);                                                    // le quai
  ctx.fillStyle = '#56626d'; ctx.beginPath(); ctx.moveTo(-95,-5); ctx.lineTo(-95,-80); ctx.lineTo(-80,-95); ctx.lineTo(75,-95); ctx.lineTo(90,-80); ctx.lineTo(90,-5); ctx.closePath(); ctx.fill();   // hangar de tôle
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let x=-90;x<90;x+=7) ctx.fillRect(x,-92,1.4,86);                    // nervures de la tôle
  ctx.fillStyle = '#2f3740'; ctx.fillRect(-82,-97,158,4);
  ctx.fillStyle = '#1c232b'; ctx.fillRect(-40,-82,84,17);                                                    // enseigne
  ctx.save(); ctx.scale(Math.sign(game.e.side), 1); ctx.fillStyle = '#e8eef2'; ctx.font = '700 13px "Courier New",monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('HALVARD', 2, -73); ctx.restore();
  ctx.fillStyle = '#5ad0ff'; ctx.fillRect(-40,-66,84,1.6);
  ctx.fillStyle = '#3a424b'; ctx.fillRect(-6,-56,66,6); ctx.fillStyle = '#8a949e'; ctx.fillRect(-6,-50,66,45);           // le rideau de fer
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let y=-48;y<-5;y+=5) ctx.fillRect(-6,y,66,1.2);
  const blink = Math.sin(t*3)>0;
  for (const [vx,vy] of [[-33,-15],[-60,-40],[-75,-62]]){ ctx.fillStyle = blink? '#5ad0ff' : '#2a6f8f'; ctx.fillRect(vx-2,vy-1.5,5,3); }       // trois voyants bleus
  ctx.strokeStyle = '#2f3740'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-64,-97); ctx.lineTo(-64,-118); ctx.stroke();       // antenne
  ctx.fillStyle = Math.sin(t*4)>0? '#ff3a3a' : '#7a1a1a'; ctx.beginPath(); ctx.arc(-64,-118,2.2,0,6.283); ctx.fill();
  ctx.strokeStyle = '#1f262d'; ctx.lineWidth = 1.5; ctx.fillStyle = '#1f262d';                                            // six drones posés sur le toit
  for (let i=0;i<6;i++){ const dx = -44+i*20 + (i>=3? 6 : 0), dy = -97; ctx.beginPath(); ctx.moveTo(dx-5,dy-4); ctx.lineTo(dx+5,dy+0.5); ctx.moveTo(dx+5,dy-4); ctx.lineTo(dx-5,dy+0.5); ctx.stroke();
    ctx.fillRect(dx-2.5,dy-2.5,5,2.6); for (const q of [-5,5]){ ctx.beginPath(); ctx.arc(dx+q,dy-4.4,1.7,0,6.283); ctx.fill(); } }
  if (dmg>=1){ ctx.fillStyle = 'rgba(8,8,12,0.4)'; ctx.fillRect(-95,-95,40,34); ctx.fillRect(40,-70,50,40); }
  if (dmg>=2){ ctx.fillStyle = 'rgba(8,6,6,0.75)'; ctx.beginPath(); ctx.moveTo(-30,-95); ctx.lineTo(-8,-95); ctx.lineTo(-16,-78); ctx.lineTo(-24,-84); ctx.closePath(); ctx.fill(); }
}
if (!drawBase.m1){ const f0 = drawBase; drawBase = function(side){
  if (!m1On()) return f0(side);
  const x = side.x-camX; if (x<-200 || x>VW()+200) return;
  const t = game.t, d = side.side, hum = d>0, gy = gY(side.x), col = side.fac.accent;
  const frac = side.maxhp>0? clamp(side.hp/side.maxhp, 0, 1) : 1, dmg = frac<0.33? 2 : frac<0.66? 1 : 0;
  projShadow(x, gy, 72);
  ctx.save(); ctx.translate(x, gy); ctx.scale(d, 1); (hum? m1Fraternelle : m1Halvard)(t, dmg); ctx.restore();
  drawBaseGarrison(side, x, gy, d, hum? -88 : -95);
  if (frac<0.55){ const S = hum? [[-40,-50],[50,-14]] : [[-20,-60],[20,-34]]; for (let i=0;i<S.length;i++) dmgSmoke(x+S[i][0]*d, gy+S[i][1], frac, t, side.x+i*31); }
  const w = 110, by = gy-140;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x-w/2, by, w, 8); ctx.fillStyle = col; ctx.fillRect(x-w/2, by, w*frac, 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(x-w/2, by, w, 8);
  if (side===game.p && frac<0.95){ ctx.font = HF(12); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,'+(0.5+0.3*Math.sin(t*3))+')'; ctx.fillText(tr('hud_tap_repair'), x, by-10); }
}; drawBase.m1 = 1; }

campMission(0, {
  ownBase:true,                                                   // drawBase enveloppé : pas de halos de fenêtres de l'escarmouche (drawBaseGlow)
  num:'I', when:M1_TX.when, ai:[0,1,1], eraCap:0, oneLife:true, dev0:0,
  title:M1_TX.title, place:M1_TX.place,
  recap:M1_TX.recap, where:M1_TX.where, goal:M1_TX.goal, goal2:M1_TX.goal2,
  tips:[M1_TX.tip1, M1_TX.tip2, M1_TX.tip3],
  debrief:M1_TX.debrief, fail:M1_TX.fail,
  radio:[
    { at:8, who:'sol', txt:M1_TX.rFlare },
    { when:(g,c)=>c.D.i===0 && c.t>=30, who:'sol', txt:M1_TX.rEco },                                    // Récit seulement
    { when:(g,c)=>!!c.seen, who:'sol', txt:M1_TX.rSeen },                                              // première machine vue
    { when:(g,c)=>!!c.darkSeen, who:'sol', txt:M1_TX.rDark },                                          // une machine cachée à moins de 300
    { when:(g,c)=>c.owned>=1, who:'sol',                                                               // S1 · la rue se rallume
      fx(g, c){ c.flickUntil = performance.now()+2800; c.glintT0 = performance.now(); },
      cine(g, c){ const z = g.zones.find(z=>z.owner==='p') || g.zones[0]; return [
        { cam:{x:z.x, t:1.2}, live:true, dur:1.4 },
        { cam:{x:z.x}, who:'sol', txt:M1_TX.s1 },
      ]; } },
    { when:(g,c)=>c.hyd>=1, who:'sol', txt:M1_TX.rHyd },
    { when:(g,c)=>c.D.i===0 && c.t>=150, who:'sol', txt:M1_TX.rTower },                                 // Récit seulement
    { when:(g,c)=>!!c.lostFlag, who:'sol', txt:M1_TX.rLost },
    { at:240, who:'sol', txt:M1_TX.rCrs },
    { at:360, who:'sol', txt:M1_TX.rHeavy },
    { when:(g,c)=>g.p.hp < g.p.maxhp*0.5, who:'sol', txt:M1_TX.rBase },
    { when:(g,c)=>c.owned>=3, who:'sol', txt:M1_TX.rAll3 },
    { when:(g,c)=>g.e.hp < g.e.maxhp*0.5, who:'sol', txt:M1_TX.rDepot },
    { when:(g,c)=>c.D.i<2 && c.t>=M1_DAWN0, who:'sol', txt:M1_TX.rDawn },                              // en Dernier carré l'aube n'éclaircit rien : on se tait
    { when:(g,c)=>c.D.i<2 && c.t>=M1_DAWN1, who:'sol', txt:M1_TX.rDay },
  ],
  biome:'night', theme:'nightcity',
  // la rue : plate, pavée ; la rampe du quai (x 3000 → 3450, +18 px) est ajoutée à gY plus haut ; AUCUN point d'eau d'escarmouche
  map:{
    p:{ x:150 }, e:{ x:3450 },                                                       // La Fraternelle · le dépôt Halvard (socles de base : 245 · 309 · 373)
    neut:[1188, 1512, 2088, 2412],                                                   // quatre pas-de-porte (rideaux de fer)
    zones:[1080, 1800, 2520],                                                        // transformateurs 1, 2, 3
    objects:[ { id:'hydA', x:640, r:80, rate:0.1 }, { id:'hydB', x:2250, r:80, rate:0.1 } ],   // bornes d'incendie A et B (à la place des points d'eau)
  },
  action:{ label:M1_TX.flare, cd:40,                                                 // recharge réelle : 30 / 40 / 50 s (voir use)
    use(g, c){ c.flare = { x: camX + VW()/2, t:14 }; c.actCd = M1_FLARE_CD[c.D.i]*(c.actMul||1); sfx('shoot', 2); addFloater(c.flare.x, gY(c.flare.x)-120, '✦', '#ffe9a8', 18); } },
  setup(g, c){
    const D = c.D.i;
    campGrant(g.p, 240, 200, 70);
    g.p.maxhp = g.p.hp = M1_BASE_HP[D]; g.e.maxhp = g.e.hp = M1_DEPOT_HP[D];       // PV de la Fraternelle et du dépôt (M1.md § 6)
    c.dawn = 0; c.day = false; c.hyd = 0; c.owned = 0;
    // les machines dans le noir sont invisibles — et ne sont pas visées par nos tireurs (voir updateBuildings / rangeMul)
    c.hidden = u => !c.day && u.side===-1 && !campInLight(u.x);
    const dim = M1_RANGE[D];                                                       // nos tireurs hors d'une grande lumière : portée × 0,85 / 0,80 / 0,72
    c.rangeMul = u => {
      if (c.day || u.side!==1 || !(u.range>60)) return 1;
      let best = 1e9, tg = null; for (const f of g.e.units){ const dx = f.x-u.x; if (dx>-12 && dx<best){ best = dx; tg = f; } }
      if (tg && c.hidden(tg)) return 0.001;                                        // la cible la plus proche est dans le noir : on ne tire pas dessus
      return campInLight(u.x, true)? 1 : dim; };
    if (D===2) g.zones[2].owner = 'e', g.zones[2].prog = -1;                       // Dernier carré : le transformateur 3 est déjà à eux
    if (D===0 && M1_RETRY){ g.zones[0].owner = 'p'; g.zones[0].prog = 1; g.p.f += 100; c.retry = true; }   // reprise allégée (Récit)
    c.zo = g.zones.map(z=>z.owner);
    c.owned = g.zones.filter(z=>z.owner==='p').length; c.litK = c.owned/3;
    this.light(g, c);
  },
  // sources de lumière : base, transformateurs repris, tourelles garnies, fusée, dépôt adverse, lampes des unités, explosions ; à l'aube leur rayon grandit
  light(g, c){
    const Ls = c.lights, k = 1 + 5*(c.dawn||0); Ls.length = 0;
    Ls.push({x:g.p.x+10, r:330*k, big:1});                                         // l'ampoule de la Fraternelle
    for (const z of g.zones) if (z.owner==='p') Ls.push({x:z.x, r:400*k, big:1}); else if (z.prog>0.05) Ls.push({x:z.x, r:120*z.prog*k});
    for (const s of sideBuildSlots(g.p)) if (s.b && s.b.type==='turret' && s.b.gar && s.b.gar.length) Ls.push({x:s.x, r:150*k});   // « un réverbère qui mord »
    if (c.flare) Ls.push({x:c.flare.x, y:gY(c.flare.x)-70, r:470*Math.min(1, c.flare.t/2), big:1});
    Ls.push({x:g.e.x-30, r:190*k, a:0.75});                                        // lumière bleue du dépôt
    let n = 0; const first = Ls.length;
    for (const u of g.p.units){ if (n>=16) break; let near = false; for (let i=first;i<Ls.length;i++) if (Math.abs(Ls[i].x-u.x)<56){ near = true; break; }
      if (!near){ Ls.push({x:u.x, r:(u.role==='hero'? 170 : 104)*k}); n++; } }
    for (let i=LIGHTS.length-1, j=0; i>=0 && j<8; i--, j++){ const L = LIGHTS[i]; Ls.push({x:L.x, y:L.y, r:L.r*0.9, a:1-L.t/L.life}); }
  },
  tick(g, c, dt){
    const D = c.D.i;
    if (c.flare && (c.flare.t -= dt) <= 0) c.flare = null;
    // l'aube : 14:00 → 16:00 le ciel pâlit et les lumières grandissent ; à 16:00 la règle cesse (jamais en Dernier carré)
    c.dawn = D<2? clamp((c.t-M1_DAWN0)/(M1_DAWN1-M1_DAWN0), 0, 1) : 0; c.day = D<2 && c.t>=M1_DAWN1;
    // transformateurs : on suit qui tient quoi
    let own = 0; g.zones.forEach((z,i)=>{ if (z.owner==='p') own++; if (c.zo[i]==='p' && z.owner!=='p') c.lostFlag = 1; c.zo[i] = z.owner; });
    if (own > c.owned) sfx('evolve');
    c.owned = own; c.litK += (own/3 - c.litK) * Math.min(1, dt*0.8);
    // bornes d'incendie : +2,2 💧/s chacune tant qu'elle est à nous
    c.hyd = c.objs.filter(o=>o.owner==='p').length; g.p.w += 2.2*c.hyd*dt;
    // objectifs facultatifs
    if (own>=3) c.stLit = 1;
    if (c.hyd>=2) c.stWater = 1;
    if (g.e.hp<=0 && c.stDawn==null){ c.stDawn = c.t < M1_DAWN0? 1 : 0; if (c.stLit && c.stWater && c.stDawn) c.goal2Done = true; }
    // la première machine vue / une machine cachée qui approche (déclencheurs radio)
    const cx0 = camX-60, cx1 = camX+VW()+60;
    for (const u of g.e.units){ const hid = c.hidden(u);
      if (!hid && u.x>cx0 && u.x<cx1) c.seen = 1;
      if (hid && !c.darkSeen) for (const q of g.p.units) if (Math.abs(q.x-u.x)<300){ c.darkSeen = 1; break; } }
    // 6:00 · un châssis lourd sort du dépôt
    if (c.t>=360 && !c.heavy){ c.heavy = 1; const k0 = g.e.units.length; spawnUnit(g.e, 1, false, g.e.x-60); for (let j=k0;j<g.e.units.length;j++) g.e.units[j].ord = 'charge'; }
    // ambiances ponctuelles : une sirène lointaine, une seule fois, vers 5:00
    if (c.t>=300 && !c.siren){ c.siren = 1; if (typeof AC!=='undefined' && AC && SETTINGS.sfx){ try { const t0 = AC.currentTime; sfxBus = BUS.amb;
      for (let i=0;i<6;i++) tone(i%2? 470 : 640, t0+i*0.8, 0.8, 'sine', 0.018, 0, 0.1, 900); } catch(e){} finally { sfxBus = null; } } }
    this.light(g, c);
  },
  hud(g, c){
    const g2 = (c.stLit? '⚡✓' : '⚡–')+' '+(c.stWater? '💧✓' : '💧–')+' '+(c.stDawn===0 || c.t>=M1_DAWN0? '☀✗' : '☀');
    return { prog: 1 - Math.max(0, g.e.hp)/g.e.maxhp, label: c.owned+'/3 ⚡ '+(c.hyd||0)+'/2 💧', clock: c.t<M1_DAWN0? M1_DAWN0-c.t : undefined,
      goal2:{ done:!!c.goal2Done, label:g2 } };
  },
  // un transformateur de quartier à la place du drapeau de zone
  drawZone(z, t, vw){
    const x = z.x-camX; if (x<-80 || x>vw+80) return; const y = gY(z.x), mine = z.owner==='p', foe = z.owner==='e';
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(2,1,26,5,0,0,6.283); ctx.fill();
    ctx.fillStyle = '#4c5058'; ctx.fillRect(-18,-40,36,40); ctx.fillStyle = '#3a3d45'; ctx.fillRect(-20,-44,40,5); ctx.fillRect(12,-40,6,40);   // armoire
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; for (let i=0;i<5;i++) ctx.fillRect(-14,-34+i*4,14,1.4);                                                  // ouïes
    ctx.fillStyle = '#e8b830'; ctx.beginPath(); ctx.moveTo(4,-14); ctx.lineTo(10,-26); ctx.lineTo(-2,-14); ctx.closePath(); ctx.fill();           // danger
    ctx.fillStyle = '#1f1b17'; ctx.beginPath(); ctx.moveTo(4.6,-23); ctx.lineTo(2.6,-19.4); ctx.lineTo(4.6,-19.4); ctx.lineTo(3.2,-15.6); ctx.lineTo(6.4,-20.4); ctx.lineTo(4.4,-20.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#22232b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8,-44); ctx.lineTo(-8,-78); ctx.moveTo(-18,-70); ctx.lineTo(2,-70); ctx.stroke();   // poteau
    ctx.fillStyle = '#8a8f98'; for (const ix of [-16,-8,0]) ctx.fillRect(ix-1.5,-76,3,6);                                                         // isolateurs
    const col = mine? '#ffd98a' : foe? '#5ad0ff' : '#6a6f78';
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-8,-81,3.4,0,6.283); ctx.fill();
    if (mine || foe){ ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22+0.06*Math.sin(t*6+z.x); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-8,-81,15,0,6.283); ctx.fill(); ctx.restore(); }
    const pr = Math.abs(z.prog); if (pr>0.01 && pr<1){ ctx.fillStyle = 'rgba(10,10,14,0.7)'; ctx.fillRect(-20,6,40,4); ctx.fillStyle = z.prog>0? '#ffd98a' : '#5ad0ff'; ctx.fillRect(-20,6,40*pr,4);
      if (Math.random()<0.3){ ctx.fillStyle = '#fff'; ctx.fillRect(-8+(Math.random()-0.5)*20, -70+(Math.random()-0.5)*8, 2, 2); } }               // étincelles
    ctx.restore();
  },
  // une borne d'incendie rouge, à clé ; un filet d'eau quand elle est à nous
  drawObj(o, t, vw){
    const x = o.x-camX, y = gY(o.x), mine = o.owner==='p', foe = o.owner==='e';
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(1,1,15,3.6,0,0,6.283); ctx.fill();
    if (mine){ ctx.fillStyle = 'rgba(110,170,205,0.35)'; ctx.beginPath(); ctx.ellipse(-16,1,17,3,0,0,6.283); ctx.fill(); }              // flaque
    ctx.fillStyle = '#7d1d15'; ctx.fillRect(-8,-3,16,3);                                                                                    // embase
    ctx.fillStyle = '#c0301f'; ctx.fillRect(-5.5,-26,11,24);                                                                                // fût
    ctx.fillStyle = '#d8402c'; ctx.fillRect(-5.5,-26,3,24);
    ctx.fillStyle = '#c0301f'; ctx.beginPath(); ctx.arc(0,-26,6.5,Math.PI,0); ctx.fill();                                                   // dôme
    ctx.fillStyle = '#8e1d14'; ctx.fillRect(-10,-19,5,6); ctx.fillRect(5,-19,5,6);                                                          // buses
    ctx.fillStyle = '#e8c04a'; ctx.beginPath(); ctx.arc(0,-33,2.2,0,6.283); ctx.fill(); ctx.fillRect(-0.8,-33,1.6,7);                         // clé des pompiers
    if (mine){ ctx.strokeStyle = 'rgba(150,205,235,0.8)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (let i=0;i<4;i++){ const ph = (t*1.7+i/4)%1; ctx.globalAlpha = 1-ph; ctx.beginPath(); ctx.moveTo(-10, -16); ctx.quadraticCurveTo(-10-ph*8, -22+ph*6, -10-ph*16, -16+ph*18); ctx.stroke(); } ctx.globalAlpha = 1; }
    const col = mine? '#ffd98a' : foe? '#5ad0ff' : '#6a6f78'; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(8,-30,2.4,0,6.283); ctx.fill();
    const pr = Math.abs(o.prog); if (pr>0.01 && pr<1){ ctx.fillStyle = 'rgba(10,10,14,0.7)'; ctx.fillRect(-16,6,32,4); ctx.fillStyle = o.prog>0? '#7fd0ff' : '#5ad0ff'; ctx.fillRect(-16,6,32*pr,4); }
    ctx.restore();
  },
  onCapture(g, c, o, qui){ if (qui==='p') addFloater(o.x, gY(o.x)-62, '💧 +2,2/s', '#9fdcff', 14); },
  // la fusée éclairante descend sous son parachute ; la rue se rallume (fenêtres du fond une à une)
  draw(g, c){
    if (c.glintT0){ const el = (performance.now()-c.glintT0)/1000, z = g.zones.find(z=>z.owner==='p');
      if (el<4 && z){ const a = Math.min(1, (4-el)/1.2);
        for (let i=0;i<34;i++){ if (el < 0.18+i*0.075) continue; const h1 = Math.abs(Math.sin(i*12.9+z.x))%1, h2 = Math.abs(Math.sin(i*78.2+1.7))%1;
          const wx = z.x + (h1-0.5)*620, wy = gY(wx)-62-h2*150; ctx.globalAlpha = a*0.9; ctx.fillStyle = '#ffd890'; ctx.fillRect(wx-camX, wy, 6, 8); ctx.globalAlpha = 1; } } }
    const f = c.flare; if (!f) return; const x = f.x-camX, y = gY(f.x) - 60 - f.t*6;
    ctx.strokeStyle = 'rgba(230,230,240,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-7,y-16); ctx.moveTo(x,y); ctx.lineTo(x+7,y-16); ctx.stroke();
    ctx.fillStyle = 'rgba(230,230,240,0.6)'; ctx.beginPath(); ctx.arc(x, y-16, 8, 3.14, 6.283); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(lightSprite('#ffe9a8'), x-34, y-34, 68, 68); ctx.restore();
    ctx.fillStyle = '#fff8e0'; ctx.beginPath(); ctx.arc(x, y-2.6*0, 2.6, 0, 6.283); ctx.fill(); },
  // OUVERTURE : cinq planches (c_dread), le carton titre (m_night), puis la visite de la rue sur le terrain
  intro(g, c){ const Z = g.zones, OB = c.objs; return [
    { plate:M1_PLATES.tap, mus:'c_dread', who:'nar', txt:M1_TX.o1 },
    { plate:M1_PLATES.street, who:'nar', txt:M1_TX.o2 },
    { plate:M1_PLATES.committee, who:'nar', txt:M1_TX.o3 },
    { plate:M1_PLATES.radio, who:'sol', txt:M1_TX.o4 },
    { plate:M1_PLATES.halvard, who:'nar', txt:M1_TX.o5 },
    { mus:'m_night', cam:{x:g.p.x+200, t:0.1}, dur:3.6, title:M1_TX.cardT, sub:M1_TX.cardS },
    { cam:{x:g.p.x, t:1.6}, who:'sol', txt:M1_TX.o7 },
    { cam:{x:Z[0].x, t:2.4}, who:'sol', txt:M1_TX.o8 },
    { cam:{x:OB[0].x, t:2.4}, who:'sol', txt:M1_TX.o9 },
    { cam:{x:1500, t:3}, who:'sol', txt:M1_TX.o10,                                                        // deux paires d'yeux bleus s'allument puis s'éteignent
      fx(g, c){ c.eyes = { t0:performance.now(), list:[ {x:1420, at:0.6, dur:1.7}, {x:1585, at:1.5, dur:1.7} ] }; } },
    { cam:{x:g.e.x-120, t:3}, dur:3, who:'sol', txt:M1_TX.o11 },
    { cam:{x:g.p.x+200, t:2.4}, who:'sol', txt:M1_TX.o12 },
  ]; },
  // CLÔTURE : le dépôt brûle (cinq explosions espacées de 0,45 s), puis trois planches ; en cas d'échec, la rue noire
  outro(g, c, win){
    M1_RETRY = !win && c.D.i===0;                                                                           // Récit : la prochaine tentative est allégée
    return win? [
    { cam:{x:g.e.x-80, t:1.5}, dur:3.2, who:'sol', txt:M1_TX.v1,
      fx(){ for (let i=0;i<5;i++) setTimeout(()=>{ if (game===g){ explode(g.e.x-120+Math.random()*200, gY(g.e.x)-20-Math.random()*60, 1.4); sfx('boom'); } }, i*450); } },
    { plate:M1_PLATES.shutter, mus:'c_hope', who:'nar', txt:M1_TX.v2 },
    { plate:M1_PLATES.water, who:'nar', txt:M1_TX.v3 },
    { plate:M1_PLATES.pager, mus:'c_map', who:'nar', txt:M1_TX.v4 },
  ] : [
    { plate:M1_PLATES.dark, mus:'c_sorrow', who:'sol', txt:M1_TX.e1 },
    { plate:(g, w, h, t, k)=>M1_PLATES.dark(g, w, h, t+6, k), who:'nar', txt:M1_TX.e2 },                    // même planche, la scène continue
  ]; },
});
// la règle affiche le malus de portée du niveau choisi (Récit −15 %, Lutte −20 %, Dernier carré −28 %)
const M1_DIM = [15, 20, 28];
Object.defineProperty(CAMPAIGN[0], 'rule', { configurable:true, enumerable:true, get(){
  const i = (typeof game!=='undefined' && game && game.camp && game.camp.D)? game.camp.D.i : CAMP_SAVE.diff, n = M1_DIM[clamp(i|0, 0, 2)], o = {};
  for (const k in M1_TX.rule) o[k] = M1_TX.rule[k].replace('{n}', n);
  return o; } });
