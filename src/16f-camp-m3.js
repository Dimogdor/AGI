/* ================= CAMPAGNE · MISSION III — LE BARRAGE DE SAINTE-AUBE (v1.16) =================
   Spécification : docs/campagne/M3.md. La vallée de l'Aube, 19 juillet 2032, de 11 h à 17 h, ciel blanc.
   Germinal tient la salle des commandes du barrage (x 150) ; au bout de la vallée, la station de
   pompage d'Omnicorp (x 3 450) boit la rivière. Le relief est la mission : trois HAUTEURS sèches
   (0-700, 1 400-2 100, 2 800-3 600) et deux LITS bas (700-1 400, 2 100-2 800) que les crues balaient.
   Le bouton OUVRIR LES VANNES vide le réservoir : sirène, puis une vague part de la vanne V-3 (x 640)
   et emporte tout ce qui est au sol dans un lit — leurs machines comme les nôtres — avant de frapper
   la station. Plus le réservoir est plein, plus la crue est forte. Deux prises d'eau (dans les lits)
   remplacent les points d'eau d'escarmouche. Kassandre (55) a donné les codes ; elle annonce les canicules.
   Écarts assumés par rapport au moteur : drawBase est enveloppé (voir plus bas) pour que les deux bases
   aient le visage du lieu (salle des commandes, station de pompage).                                 */
const M3 = {
  src:640, speed:760,                                  // vanne V-3 et vitesse de la vague (px/s)
  lits:[[700,1400],[2100,2800]],                       // les deux lits de la rivière
  fill:[1.5,1.25,1.05],                                // remplissage du réservoir (% par seconde)
  siren:[5,4,3],                                       // durée de la sirène (s)
  hp:[1300,1600,1900],                                 // PV de la station
  kHit:[1.2,1,0.85],                                   // dégâts de crue sur la station
  convoy:[85,72,62], nConv:[3,4,5],                    // intervalle des convois et nombre de machines
  heat:[240,540,780],                                  // canicules (la 3e en Dernier carré seulement)
  arm:50, heatK:0.35,                                  // le bouton s'arme à 50 % ; canicule : réservoir × 0,35
};
const m3Low = x => M3.lits.some(l => x >= l[0] && x <= l[1]);
// relief : sin(x·2π/1400) → hauteurs 0-700, 1 400-2 100, 2 800-3 500 ; lits entre les deux (le sol y reste plat)
const M3_TERRAIN = { a:46, f1:6.2832/1400, b:3, f2:0.0113, c:1.5, f3:0.021, base:-1 };
let M3_RETRY = false;                                  // Récit : la mission vient d'être perdue → reprise allégée
const M3_COUR = '"Courier New",monospace', M3_RED = '#c42a1c', M3_BLUE = '#0b6fa8', M3_INK0 = '#1f1b17';
DECOR_THEMES.valley = ['rock','fig','pebbles','cairn','fig','rock','pebbles','pinelet'];
DECOR_EXTRA.rock = (d, s) => {                                        // rocher éboulé
  ctx.scale(d.flip,1); dShadow(13*s); ctx.fillStyle = '#7a756d'; ctx.beginPath(); ctx.moveTo(-13*s,0); ctx.lineTo(-9*s,-10*s); ctx.lineTo(1*s,-14*s); ctx.lineTo(11*s,-7*s); ctx.lineTo(13*s,0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,250,236,0.22)'; ctx.beginPath(); ctx.moveTo(-9*s,-10*s); ctx.lineTo(1*s,-14*s); ctx.lineTo(-2*s,-6*s); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(31,27,23,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(1*s,-14*s); ctx.lineTo(3*s,-3*s); ctx.stroke();
};
DECOR_EXTRA.pinelet = (d, s, t) => {                                  // jeune pin
  dShadow(8*s); ctx.fillStyle = '#4a3a2a'; ctx.fillRect(-1.2*s,-8*s,2.4*s,8*s); const sw = Math.sin(t*1.1+d.ph)*0.8;
  ctx.fillStyle = '#2f4a40'; for (let i=0;i<3;i++){ const y = -8*s-i*7*s, w = (9-i*2.4)*s; ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(sw*(i+1), y-11*s); ctx.lineTo(w, y); ctx.closePath(); ctx.fill(); }
};
DECOR_EXTRA.fig = (d, s, t) => {                                      // figuier sec : tronc tordu, branches nues, quelques feuilles jaunies
  dShadow(10*s); ctx.strokeStyle = '#5a4a3a'; ctx.lineCap = 'round'; ctx.lineWidth = 3*s;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(-4*s,-10*s,0,-20*s); ctx.stroke();
  ctx.lineWidth = 1.6*s; ctx.beginPath(); ctx.moveTo(0,-14*s); ctx.quadraticCurveTo(8*s,-18*s,13*s,-27*s); ctx.moveTo(-1*s,-18*s); ctx.quadraticCurveTo(-9*s,-22*s,-11*s,-30*s); ctx.moveTo(0,-20*s); ctx.lineTo(3*s,-33*s); ctx.stroke();
  ctx.fillStyle = '#b3a45a'; for (let i=0;i<4;i++){ const a = Math.sin(t*1.3+d.ph+i)*0.6; ctx.beginPath(); ctx.ellipse((i-1.5)*5*s+a, (-26-((i*7)%4)*3)*s, 3*s, 1.7*s, 0.5, 0, 6.283); ctx.fill(); }
};
DECOR_EXTRA.pebbles = (d, s) => {                                     // galets du lit de la rivière
  ctx.fillStyle = 'rgba(10,8,8,0.18)'; ctx.beginPath(); ctx.ellipse(0,1,12*s,2.6*s,0,0,6.283); ctx.fill();
  const c = ['#9a958a','#b3ada0','#85807a','#a8a296','#8f8a80'];
  for (let i=0;i<5;i++){ ctx.fillStyle = c[i]; ctx.beginPath(); ctx.ellipse((i-2)*4.6*s, -(1.5+(i%2)*1.5)*s, (2.6+(i%3)*0.8)*s, (1.8+(i%2)*0.8)*s, 0, 0, 6.283); ctx.fill(); }
};
DECOR_EXTRA.cairn = (d, s) => {                                       // cairn de berger
  dShadow(8*s); const c = ['#8a8478','#77726a','#938d80','#6e6a62'];
  for (let i=0;i<4;i++){ ctx.fillStyle = c[i]; ctx.beginPath(); ctx.ellipse(0, -3*s-i*5*s, (7-i*1.3)*s, 2.8*s, 0, 0, 6.283); ctx.fill(); }
};

/* ---------- LIEU : la vallée de l'Aube (cimes, cascade, forêts de pins, barrage, lumière froide) ---------- */
const M3_INK = '#26323a';
function m3Pines(g, rnd, w, base, n, hmin, hmax, col){                // rangée de pins (triangles empilés)
  g.fillStyle = col; for (let i=0;i<n;i++){ const x = rnd()*w, h = hmin+rnd()*(hmax-hmin), y = base(x)+2;
    if (x < h*0.3 || x > w-h*0.3) continue;
    for (let k=0;k<3;k++){ const yy = y - k*h*0.28, ww = h*(0.3-k*0.07); g.beginPath(); g.moveTo(x-ww, yy); g.lineTo(x, yy-h*0.48); g.lineTo(x+ww, yy); g.closePath(); g.fill(); } }
}
BIOMES.dam = {
  id:'dam', music:'m_dam', amb:{ rain:0.012, wind:0.03, tick:m3Amb },
  sky:[[78,122,170],[160,192,214],[214,226,228]], dirt:[108,100,88], grass:[104,124,88], trees:false,
  terrain:M3_TERRAIN,
  layers:[
    { par:0.03, w:1024, h:290, off:0, paint(g, w, h, rnd){                          // cimes enneigées
        const peaks = []; let x = 40; while (x < w-120){ peaks.push([x+rnd()*40, 130+rnd()*130, 90+rnd()*80, 90+rnd()*80]); x += 120+rnd()*90; }
        g.fillStyle = '#b3c1cf'; g.fillRect(0, h-40, w, 40);
        for (const [px, ph, wl, wr] of peaks){ const top = h-ph;
          g.fillStyle = '#aebdcb'; g.beginPath(); g.moveTo(px-wl, h); g.lineTo(px, top); g.lineTo(px, h); g.closePath(); g.fill();
          g.fillStyle = '#93a5b6'; g.beginPath(); g.moveTo(px, top); g.lineTo(px+wr, h); g.lineTo(px, h); g.closePath(); g.fill();
          g.fillStyle = '#f2f5f6'; g.beginPath(); g.moveTo(px-wl*0.3, top+ph*0.3); g.lineTo(px, top); g.lineTo(px+wr*0.3, top+ph*0.3);
          for (let k=1;k<5;k++) g.lineTo(px+wr*0.3 - k*(wl+wr)*0.06, top+ph*(0.22+((k%2)? 0.1 : 0)));
          g.closePath(); g.fill();
          g.strokeStyle = 'rgba(70,90,110,0.25)'; g.lineWidth = 0.8; g.beginPath();                     // hachures du versant à l'ombre
          for (let k=0;k<8;k++){ const yy = top+ph*(0.35+k*0.08); g.moveTo(px+4, yy); g.lineTo(px+wr*(0.35+k*0.08)-6, yy+10); } g.stroke(); } } },
    { par:0.08, w:1024, h:230, off:0, paint(g, w, h, rnd){                          // chaîne moyenne, falaise et cascade
        const P = 6.283/w, ridge = x => h-120-34*Math.sin(x*P*2+0.6)-18*Math.sin(x*P*5+1)-9*Math.sin(x*P*11);
        g.fillStyle = '#71879a'; g.beginPath(); g.moveTo(0,h); for (let x=0;x<=w;x+=6) g.lineTo(x, ridge(x)); g.lineTo(w,h); g.closePath(); g.fill();
        g.fillStyle = 'rgba(40,56,72,0.25)'; for (let x=0;x<w;x+=6){ const y = ridge(x); if (Math.sin(x*P*5+1) < -0.2) g.fillRect(x, y, 6, 40); }   // versants à l'ombre
        g.strokeStyle = 'rgba(40,56,72,0.3)'; g.lineWidth = 0.8; g.beginPath(); for (let i=0;i<60;i++){ const x = rnd()*w, y = ridge(x)+10+rnd()*60; g.moveTo(x,y); g.lineTo(x+8,y+6); } g.stroke();
        const cx = 640, cy = ridge(cx)+16;                                                 // la cascade (le trait d'eau est animé à part)
        g.fillStyle = '#566a7a'; g.beginPath(); g.moveTo(cx-22, h-40); g.lineTo(cx-14, cy-6); g.lineTo(cx-4, cy-12); g.lineTo(cx+8, cy-4); g.lineTo(cx+18, cy+30); g.lineTo(cx+24, h-40); g.closePath(); g.fill();   // falaise
        g.fillStyle = 'rgba(232,240,242,0.92)'; g.beginPath(); g.moveTo(cx-3, cy-4); g.lineTo(cx+3, cy-4); g.lineTo(cx+6, h-46); g.lineTo(cx-6, h-46); g.closePath(); g.fill();   // le voile d'eau
        g.fillStyle = 'rgba(232,240,242,0.55)'; g.beginPath(); g.ellipse(cx, h-44, 20, 6, 0, 0, 6.283); g.fill();
        m3Pines(g, rnd, w, x => h-30-6*Math.sin(x*P*4), 160, 14, 26, '#45604f'); g.fillStyle = '#45604f'; g.fillRect(0, h-30, w, 30); } },
    { par:0.17, w:1280, h:170, off:2, paint(g, w, h, rnd){                          // collines boisées, chapelle Sainte-Aube, hameau
        const P = 6.283/w, hill = x => h-70-22*Math.sin(x*P*3+2)-10*Math.sin(x*P*7);
        g.fillStyle = '#4c6a5c'; g.beginPath(); g.moveTo(0,h); for (let x=0;x<=w;x+=6) g.lineTo(x, hill(x)); g.lineTo(w,h); g.closePath(); g.fill();
        m3Pines(g, rnd, w, hill, 220, 18, 34, '#34524a');
        const ch = 300, cy = hill(ch);                                                     // chapelle
        g.fillStyle = '#c9c0ae'; g.fillRect(ch-18, cy-26, 36, 26); g.fillRect(ch+10, cy-46, 12, 46);
        g.fillStyle = '#5b5f66'; g.beginPath(); g.moveTo(ch-22, cy-26); g.lineTo(ch-4, cy-38); g.lineTo(ch+14, cy-26); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(ch+8, cy-46); g.lineTo(ch+16, cy-62); g.lineTo(ch+24, cy-46); g.closePath(); g.fill();
        g.fillStyle = 'rgba(31,27,23,0.5)'; g.fillRect(ch+14, cy-40, 4, 6); g.fillStyle = 'rgba(31,27,23,0.25)'; g.fillRect(ch+16, cy-46, 6, 46);
        for (let i=0;i<5;i++){ const hx = 880+i*34+(i%2)*6, hy = hill(hx)+4, hw = 24+(i%3)*4, hh = 16+(i%2)*6;   // hameau de pierre, toits de lauzes
          g.fillStyle = '#bdb4a3'; g.fillRect(hx, hy-hh, hw, hh); g.fillStyle = 'rgba(31,27,23,0.22)'; g.fillRect(hx+hw-5, hy-hh, 5, hh);
          g.fillStyle = '#5a5e66'; g.beginPath(); g.moveTo(hx-3, hy-hh); g.lineTo(hx+hw/2, hy-hh-11); g.lineTo(hx+hw+3, hy-hh); g.closePath(); g.fill();
          g.fillStyle = '#2b2f36'; g.fillRect(hx+5, hy-hh+5, 4, 5); } } },
    { par:0.33, w:1024, h:120, off:4, paint(g, w, h, rnd){                          // pins proches, éboulis, pylônes haute tension
        const P = 6.283/w, base = x => h-20-8*Math.sin(x*P*3)-4*Math.sin(x*P*9);
        g.fillStyle = '#2f453f'; g.beginPath(); g.moveTo(0,h); for (let x=0;x<=w;x+=6) g.lineTo(x, base(x)); g.lineTo(w,h); g.closePath(); g.fill();
        m3Pines(g, rnd, w, base, 70, 30, 70, '#22363a');
        for (const px of [180, 690]){ const y = base(px);                                  // pylône en treillis
          g.strokeStyle = '#3b4650'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(px-12, y); g.lineTo(px-2, y-96); g.moveTo(px+12, y); g.lineTo(px+2, y-96);
          for (let k=0;k<8;k++){ const yy = y-k*12, a = 12-k*1.25; g.moveTo(px-a, yy); g.lineTo(px+a-1.25, yy-12); } g.moveTo(px-22, y-80); g.lineTo(px+22, y-80); g.moveTo(px-16, y-92); g.lineTo(px+16, y-92); g.stroke(); }
        g.strokeStyle = 'rgba(40,50,60,0.55)'; g.lineWidth = 0.8; g.beginPath();
        for (const dy of [80, 92]){ g.moveTo(180-22, base(180)-dy); g.quadraticCurveTo(435, base(435)-dy+24, 690-22, base(690)-dy); g.moveTo(690+22, base(690)-dy); g.quadraticCurveTo(940, base(940)-dy+24, w+180-22, base(180)-dy); g.moveTo(-334+22, base(690)-dy); g.quadraticCurveTo(-80, base(-80)-dy+24, 180-22, base(180)-dy); }
        g.stroke(); } },
  ],
  sky2(vw, t){                                                                          // soleil blanc, haut ; cirrus en traits
    ctx.fillStyle = 'rgba(255,252,236,0.95)'; ctx.beginPath(); ctx.arc(vw*0.78 - camX*0.01, 58, 13, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(240,246,250,0.55)'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i=0;i<6;i++){ const x = ((i*300 + t*2 - camX*0.015) % (vw+400) + vw+400) % (vw+400) - 200, y = 40 + (i*37)%90; ctx.moveTo(x, y); ctx.quadraticCurveTo(x+60, y-6, x+150, y-2); }
    ctx.stroke();
  },
  back(vw, t){
    const cx = ((640 - camX*0.08) % 1024 + 1024) % 1024;                                   // la cascade ruisselle
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let rep = cx-1024; rep < vw+20; rep += 1024){ const top = GROUND-230+ (230-120-34*Math.sin(640*6.283/1024*2+0.6)-18*Math.sin(640*6.283/1024*5+1)-9*Math.sin(640*6.283/1024*11)) + 16;
      for (let i=0;i<5;i++){ const y = top + ((t*90 + i*31) % (GROUND-44-top)); ctx.moveTo(rep-3+i*1.5, y); ctx.lineTo(rep-3+i*1.5, y+9); } }
    ctx.stroke();
    m3DrawDam(vw, t);
  },
};
function m3Amb(t){ if (Math.random()<0.012){ tone(1900, t, .5, 'sine', .006, -700); tone(1700, t+.35, .45, 'sine', .005, -600); } }   // cri d'un rapace

/* ---------- le barrage (fond, parallaxe propre, sans répétition) ---------- */
const m3DamSprite = () => fxSprite('M3DAM', 520, 300, g => {
  g.fillStyle = '#6e7f8c'; g.beginPath(); g.moveTo(0,300); g.lineTo(0,40); g.lineTo(60,30); g.lineTo(110,90); g.lineTo(130,300); g.closePath(); g.fill();     // flanc rocheux gauche
  g.beginPath(); g.moveTo(520,300); g.lineTo(520,60); g.lineTo(470,40); g.lineTo(410,100); g.lineTo(390,300); g.closePath(); g.fill();                     // flanc droit
  g.fillStyle = 'rgba(40,56,72,0.3)'; g.fillRect(96,90,30,210); g.fillRect(396,100,30,200);
  g.fillStyle = '#5e86a2'; g.fillRect(110, 52, 300, 30);                                    // le réservoir derrière la crête
  g.fillStyle = '#c3c5c0'; g.beginPath(); g.moveTo(104,74); g.quadraticCurveTo(260,96,416,74); g.lineTo(400,300); g.quadraticCurveTo(260,316,120,300); g.closePath(); g.fill();   // voûte de béton
  g.fillStyle = 'rgba(60,66,70,0.18)'; for (let k=0;k<14;k++){ const x = 130+k*19; g.fillRect(x, 82+Math.abs(k-6.5)*1.2, 1.2, 214); }        // banches
  g.fillStyle = 'rgba(60,66,70,0.25)'; g.beginPath(); g.moveTo(330,82); g.quadraticCurveTo(380,80,416,74); g.lineTo(400,300); g.quadraticCurveTo(370,306,330,306); g.closePath(); g.fill();
  g.fillStyle = '#9fa3a0'; g.fillRect(100, 66, 320, 10); g.fillStyle = M3_INK; for (let x=104;x<420;x+=8) g.fillRect(x, 58, 1.4, 8); g.fillRect(100, 58, 320, 1.4);   // crête et garde-corps
  g.fillStyle = '#8a8e8c'; g.fillRect(232, 36, 56, 30); g.fillStyle = M3_INK; g.fillRect(240, 44, 10, 8); g.fillRect(262, 44, 18, 8);              // salle des commandes
  g.fillStyle = '#c42a1c'; g.fillRect(256, 26, 2, 10); g.beginPath(); g.moveTo(258,26); g.lineTo(270,29); g.lineTo(258,32); g.closePath(); g.fill();  // drapeau de Germinal
  for (let k=0;k<3;k++){ const x = 200+k*48; g.fillStyle = '#3a4248'; g.fillRect(x, 238, 30, 34); g.fillStyle = '#5a6268'; g.fillRect(x-3, 232, 36, 6); }   // les trois vannes de fond
  g.fillStyle = '#e9dfc6'; g.font = '700 11px "Courier New",monospace'; g.textAlign = 'center'; g.fillText('SAINTE-AUBE 1961', 260, 120);
});
function m3DrawDam(vw, t){
  const c = game && game.camp; const x = 40 - camX*0.42; if (x > vw || x+520 < 0) return;
  const y = GROUND - 300 + 26;
  ctx.drawImage(m3DamSprite(), x, y, 520, 300);
  if (c){ const lv = clamp(c.water/100, 0, 1);                                              // niveau du réservoir sur l'échelle de la crête
    ctx.fillStyle = 'rgba(232,240,242,0.7)'; ctx.fillRect(x+112, y+80-26*lv, 296, 2);
    const open = c.siren>0 || (c.flood && c.flood.t < 5);
    if (open) for (let k=0;k<3;k++){ const gx = x+200+k*48;                                  // gerbes blanches aux vannes ouvertes
      ctx.fillStyle = 'rgba(240,246,248,0.85)'; for (let i=0;i<5;i++){ const ph = (t*3 + i*0.2 + k*0.3)%1; ctx.fillRect(gx+3+i*5, y+266+ph*30, 3, 8); } } }
}

/* ---------- personnages : voix et portraits (64×64, encre sur papier) ---------- */
CINE_WHO.ines = { name:'INÈS', ink:'#7a5a2e' };
CINE_WHO.voix = { name:{fr:'LA VOIX', en:'THE VOICE', es:'LA VOZ', de:'DIE STIMME', it:'LA VOCE', pt:'A VOZ', ru:'ГОЛОС', zh:'广播之声', ar:'الصوت'}, ink:'#4f7a8c' };
// INÈS FERRAND : hydraulicienne, casque de chantier blanc, lunettes
CINE_PORTRAITS.ines = g => {
  inkWash(g, [8,64, 12,52, 24,46, 40,46, 52,52, 56,64], '#c8841c', 0.8);                                  // gilet orange
  g.fillStyle = '#e2c4a2'; g.beginPath(); g.ellipse(32, 30, 10.5, 13, 0, 0, 6.283); g.fill();                // visage
  g.fillStyle = '#5a3a24'; g.beginPath(); g.ellipse(32, 24, 11.5, 8, 0, 3.4, 6.03); g.fill();               // mèches sous le casque
  g.fillStyle = '#f4f1e8'; g.beginPath(); g.ellipse(32, 19, 15, 10, 0, 3.14, 6.283); g.fill(); g.fillRect(17, 18.5, 30, 3.6);   // casque blanc
  g.strokeStyle = '#1f1b17'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(32, 19, 15, 10, 0, 3.14, 6.283); g.stroke();
  g.beginPath(); g.moveTo(17,22.1); g.lineTo(47,22.1); g.stroke(); g.beginPath(); g.moveTo(32,9); g.lineTo(32,14); g.stroke();
  g.lineWidth = 1.2; g.beginPath(); g.arc(27, 30, 3.8, 0, 6.283); g.stroke(); g.beginPath(); g.arc(37, 30, 3.8, 0, 6.283); g.stroke();   // lunettes
  g.beginPath(); g.moveTo(30.8,30); g.lineTo(33.2,30); g.stroke();
  g.fillStyle = '#1f1b17'; g.fillRect(26.2,29.4,1.6,1.6); g.fillRect(36.2,29.4,1.6,1.6);
  inkLine(g, [28,38, 32,39.4, 36,38], 1, 1.1);
};
// LA VOIX : un haut-parleur à pavillon, une ligne bleue
CINE_PORTRAITS.voix = g => {
  g.fillStyle = '#dfe6ea'; g.fillRect(0,0,64,64);
  inkWash(g, [14,26, 24,26, 46,10, 46,54, 24,38, 14,38], '#4f7a8c', 0.55);                                   // le pavillon
  inkLine(g, [14,26, 24,26, 46,10, 46,54, 24,38, 14,38, 14,26], 1, 1.6);
  g.strokeStyle = '#0b6fa8'; g.lineWidth = 1.6; g.lineCap = 'round';
  for (let k=0;k<3;k++){ g.beginPath(); g.arc(48, 32, 6+k*5, -0.8, 0.8); g.stroke(); }                         // les ondes
  inkLine(g, [4,56, 60,56], 1, 1.4, '#0b6fa8');                                                              // la ligne bleue
};

/* ---------- textes courts du terrain et des planches ---------- */
const M3_UI = {
  siren:  {fr:'SIRÈNE', en:'SIREN', es:'SIRENA', de:'SIRENE', it:'SIRENA', pt:'SIRENE', ru:'СИРЕНА', zh:'警报', ar:'صفارة'},
  convoy: {fr:'CONVOI', en:'CONVOY', es:'CONVOY', de:'KONVOI', it:'CONVOGLIO', pt:'COMBOIO', ru:'КОЛОННА', zh:'车队', ar:'قافلة'},
  intake: {fr:"PRISE D'EAU", en:'WATER INTAKE', es:'TOMA DE AGUA', de:'WASSERFASSUNG', it:"PRESA D'ACQUA", pt:"TOMADA D'ÁGUA", ru:'ВОДОЗАБОР', zh:'取水口', ar:'مأخذ الماء'},
  belv:   {fr:'LE BELVÉDÈRE', en:'THE VIEWPOINT', es:'EL MIRADOR', de:'DER AUSSICHTSPUNKT', it:'IL BELVEDERE', pt:'O MIRANTE', ru:'СМОТРОВАЯ', zh:'观景台', ar:'المطلّ'},
  garde:  {fr:'MAISON DU GARDE', en:"KEEPER'S HOUSE", es:'CASA DEL GUARDA', de:'WÄRTERHAUS', it:'CASA DEL GUARDIANO', pt:'CASA DO GUARDA', ru:'ДОМ СТОРОЖА', zh:'守坝人小屋', ar:'بيت الحارس'},
  muret:  {fr:'LE MURET', en:'THE LOW WALL', es:'EL MURETE', de:'DIE MAUER', it:'IL MURETTO', pt:'O MURETE', ru:'ОГРАДА', zh:'矮墙', ar:'الجدار'},
  cabane: {fr:'CABANE DE PÊCHE', en:'FISHING HUT', es:'CABAÑA DE PESCA', de:'ANGLERHÜTTE', it:'CAPANNA DI PESCA', pt:'CABANA DE PESCA', ru:'РЫБАЦКАЯ ХИЖИНА', zh:'钓鱼小屋', ar:'كوخ الصيد'},
  tank:   {fr:'4 L / PERS.', en:'4 L / PERSON', es:'4 L / PERSONA', de:'4 L / PERSON', it:'4 L / PERSONA', pt:'4 L / PESSOA', ru:'4 Л / ЧЕЛ.', zh:'每人4升', ar:'4 لتر / فرد'},
  calc:   {fr:'OMNICORP · CALCUL', en:'OMNICORP · COMPUTE', es:'OMNICORP · CÁLCULO', de:'OMNICORP · RECHNEN', it:'OMNICORP · CALCOLO', pt:'OMNICORP · CÁLCULO', ru:'OMNICORP · ВЫЧИСЛЕНИЯ', zh:'OMNICORP · 计算', ar:'OMNICORP · حوسبة'},
  kname:  {fr:'55 · KASSANDRE', en:'55 · KASSANDRE', es:'55 · KASSANDRE', de:'55 · KASSANDRE', it:'55 · KASSANDRE', pt:'55 · KASSANDRE', ru:'55 · KASSANDRE', zh:'55 · KASSANDRE', ar:'55 · KASSANDRE'},
  codes:  {fr:'CODES : V1 V2 V3', en:'CODES: V1 V2 V3', es:'CÓDIGOS: V1 V2 V3', de:'CODES: V1 V2 V3', it:'CODICI: V1 V2 V3', pt:'CÓDIGOS: V1 V2 V3', ru:'КОДЫ: V1 V2 V3', zh:'密码：V1 V2 V3', ar:'الرموز: V1 V2 V3'},
  arb:    {fr:'ARBITRAGE.', en:'TRADE-OFF.', es:'ARBITRAJE.', de:'ABWÄGUNG.', it:'COMPROMESSO.', pt:'ARBITRAGEM.', ru:'КОМПРОМИСС.', zh:'取舍。', ar:'مفاضلة.'},
  vanne:  {fr:'V1 · V2 · V3', en:'V1 · V2 · V3', es:'V1 · V2 · V3', de:'V1 · V2 · V3', it:'V1 · V2 · V3', pt:'V1 · V2 · V3', ru:'V1 · V2 · V3', zh:'V1 · V2 · V3', ar:'V1 · V2 · V3'},
};
const m3Plate = (g, s, x, y, px, col) => { g.fillStyle = col || M3_INK0; g.font = '700 '+px+'px '+M3_COUR; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };
const m3Loop = (g, pts, n, wd, col) => inkLine(g, pts.concat(pts.slice(0,2)), n, wd, col);     // contour fermé : le premier point est répété

/* ---------- planches (repère 480×270, sol à y = 230) ---------- */
const M3_PLATES = {
  // P1 · La file d'eau : un camion-citerne, neuf personnes et leurs bidons ; la file avance d'un pas (8 px) toutes les 1,5 s
  queue(g, w, h, t){ plateBase(g, w, h, 'rgba(210,150,80,0.14)');
    const n = clamp(t/1.2, 0, 1);
    inkLine(g, [0,230, 480,230], 1, 2.2); inkHatch(g, 0, 230, 480, 40, 7, M3_INK0, 0.2);
    inkLine(g, [26,230, 28,150, 24,118], n, 2.6); inkLine(g, [28,150, 48,126, 60,116], n, 1.8); inkLine(g, [27,134, 8,112], n, 1.6); inkLine(g, [24,118, 34,100], n, 1.4);   // le platane sec
    const tk = [306,158, 414,158, 422,166, 422,200, 414,208, 306,208, 298,200, 298,166];                      // la cuve
    inkWash(g, tk, '#6b6a63', 0.5); m3Loop(g, tk, n, 2.4);
    inkLine(g, [314,158, 314,208], n, 1.2); inkLine(g, [406,158, 406,208], n, 1.2);
    const cb = [424,214, 424,174, 438,164, 452,164, 460,186, 460,214];                                        // la cabine
    inkWash(g, cb, '#4a4a46', 0.55); m3Loop(g, cb, n, 2.4); inkWash(g, [430,178, 438,170, 450,170, 454,184], '#e9dfc6', 0.9);
    inkLine(g, [298,198, 288,198, 288,206], n, 2);                                                            // le robinet
    g.fillStyle = M3_INK0; for (const wx of [318,372,436]){ g.beginPath(); g.arc(wx, 220, 10, 0, 6.283); g.fill(); }
    m3Plate(g, cT(M3_UI.tank), 360, 188, 12, '#2a2620');
    const step = Math.min(6, Math.floor(t/1.5));                                                              // un pas de 8 px toutes les 1,5 s
    for (let i=0;i<9;i++){ const x = 252 - i*24 + step*8, s = 25 + ((i*5)%3);
      inkFolk(g, x, 230, s); g.fillStyle = M3_RED; g.fillRect(x+5, 230-s*0.42, 6, 8); }                      // chacun son bidon
    plateEnd(g, w, h); },
  // P2 · Les centres de calcul : un bâtiment bas sans fenêtres, trois tours qui fument, la rivière captée
  compute(g, w, h, t){ plateBase(g, w, h, 'rgba(255,255,255,0.16)');
    const n = clamp(t/1.4, 0, 1);
    inkLine(g, [0,230, 480,230], 1, 2.2); inkHatch(g, 0, 230, 480, 40, 7, M3_INK0, 0.2);
    for (let i=0;i<3;i++){ const cx = 130 + i*110, tw = [cx-34,150, cx-22,104, cx+22,104, cx+34,150];            // trois tours de refroidissement
      inkWash(g, tw, '#8a8a86', 0.4); m3Loop(g, tw, n, 2);
      for (let k=0;k<3;k++){ const ph = (t*0.3 + k/3 + i*0.19) % 1, r = 8 + ph*20;                             // volutes de vapeur
        g.fillStyle = 'rgba(40,40,40,'+(0.2*(1-ph)).toFixed(3)+')'; g.beginPath(); g.arc(cx + Math.sin(ph*5+i)*6, 100 - ph*74, r, 0, 6.283); g.fill(); } }
    const bd = [60,230, 60,150, 420,150, 420,230];                                                            // le bâtiment, sans fenêtres
    inkWash(g, bd, '#5d5d58', 0.45); m3Loop(g, bd, n, 2.6);
    const pipe = [12,230, 12,196, 60,196, 60,212, 28,212, 28,230];                                            // la rivière captée entre dans le bâtiment
    inkWash(g, pipe, '#34506a', 0.6); m3Loop(g, pipe, n, 2);
    m3Plate(g, cT(M3_UI.calc), 240, 196, 16, '#201c18');
    g.fillStyle = (Math.sin(t*4) > 0)? M3_RED : 'rgba(196,42,28,0.3)'; g.beginPath(); g.arc(398, 218, 4, 0, 6.283); g.fill();
    plateEnd(g, w, h); },
  // P3 · Kassandre : le bipeur, la table, le carnet ; le texte défile à l'écran. P6 (mode 'arb') : « ARBITRAGE. », puis l'écran s'éteint.
  pager(g, w, h, t, mode){ plateBase(g, w, h, 'rgba(18,28,56,0.38)');
    const arb = mode === 'arb', n = clamp(t/1.2, 0, 1), fade = arb? clamp(1 - (t-3.6)/2.6, 0, 1) : 1;       // l'écran s'éteint lentement
    const gl = g.createRadialGradient(240,146,10,240,146,170); gl.addColorStop(0, 'rgba(11,111,168,'+(0.30*fade).toFixed(3)+')'); gl.addColorStop(1, 'rgba(11,111,168,0)');
    g.fillStyle = gl; g.fillRect(0,0,480,270);
    inkLine(g, [20,210, 460,210], n, 3); inkHatch(g, 20, 210, 440, 30, 7, M3_INK0, 0.28);
    const pg = [160,210, 166,106, 314,106, 320,210];                                                          // le bipeur
    inkWash(g, pg, '#1c2326', 0.92); m3Loop(g, pg, n, 2.6);
    g.fillStyle = fade > 0.02? 'rgb('+Math.round(20+150*fade)+','+Math.round(36+170*fade)+','+Math.round(34+130*fade)+')' : '#101a1a'; g.fillRect(180,122,120,52);   // l'écran
    inkLine(g, [180,122, 300,122, 300,174, 180,174, 180,122], n, 1.6, '#0d1416');
    g.fillStyle = '#3a4448'; g.fillRect(186,186,30,7); g.fillRect(224,186,30,7);
    g.fillStyle = (fade > 0.05 && Math.sin(t*5) > 0)? M3_BLUE : 'rgba(11,111,168,0.25)'; g.beginPath(); g.arc(292, 190, 4, 0, 6.283); g.fill();
    g.save(); g.beginPath(); g.rect(182,124,116,48); g.clip();
    const typed = (s, k) => s.slice(0, Math.max(0, Math.floor(k*14)));
    if (arb){ if (t < 3.4) m3Plate(g, typed(cT(M3_UI.arb), t-0.4), 240, 156, 17, '#10241c'); }
    else { const off = clamp((t-2.8)/0.7, 0, 1)*26;
      m3Plate(g, typed(cT(M3_UI.kname), t-0.3), 240, 152-off, 15, '#10241c'); m3Plate(g, typed(cT(M3_UI.codes), t-3.3), 240, 178-off, 14, '#10241c'); }
    g.restore();
    const nb = [40,208, 54,186, 134,186, 146,208];                                                            // le carnet
    inkWash(g, nb, '#e9dfc6', 0.8); m3Loop(g, nb, n, 2); inkLine(g, [92,187, 92,207], n, 1.2);
    inkLine(g, [60,196, 86,196], n, 1); inkLine(g, [98,196, 126,196], n, 1);
    plateEnd(g, w, h); },
  // P4 · Les vannes : coupe du barrage ; les trois vannes de fond passent au rouge l'une après l'autre (codes acceptés)
  sluices(g, w, h, t){ plateBase(g, w, h, 'rgba(40,80,130,0.10)');
    const n = clamp(t/1.4, 0, 1);
    inkWash(g, [0,90, 150,90, 142,230, 0,230], '#4a6a82', 0.5); inkLine(g, [0,90, 150,90], n, 1.8);          // l'eau du réservoir
    const wall = [150,60, 330,60, 340,230, 140,230];                                                          // le mur du barrage
    inkWash(g, wall, '#3a3a3a', 0.3); m3Loop(g, wall, n, 2.6);
    for (let i=0;i<3;i++){ const x = 176 + i*50, on = t > 1.2 + i*0.9;                                        // les trois vannes de fond
      g.fillStyle = on? M3_RED : 'rgba(31,27,23,0.75)'; g.fillRect(x, 184, 28, 38);
      inkLine(g, [x,184, x+28,184, x+28,222, x,222, x,184], n, 1.6); }
    inkLine(g, [340,230, 480,230], n, 2.2);                                                                   // le lit sec, craquelé
    inkLine(g, [360,240, 376,252, 366,262], n, 1.2); inkLine(g, [410,238, 424,250, 440,246, 448,258], n, 1.2);
    inkFolk(g, 240, 60, 32); g.fillStyle = '#f4f1e8'; g.beginPath(); g.arc(240, 31, 6, Math.PI, 6.283); g.closePath(); g.fill();       // Inès, casque blanc
    g.strokeStyle = M3_INK0; g.lineWidth = 1.3; g.beginPath(); g.arc(240, 31, 6, Math.PI, 6.283); g.closePath(); g.stroke();
    m3Plate(g, cT(M3_UI.vanne), 240, 254, 15);
    plateEnd(g, w, h); },
  // P5 · La fontaine : trois enfants, pieds dans la vasque ; l'eau coule, des ronds s'élargissent
  fountain(g, w, h, t){ plateBase(g, w, h, 'rgba(232,165,60,0.10)');
    const n = clamp(t/1.4, 0, 1);
    inkLine(g, [0,230, 480,230], 1, 2.2); inkHatch(g, 0, 230, 480, 40, 7, M3_INK0, 0.2);
    g.fillStyle = 'rgba(31,27,23,0.28)'; g.beginPath(); g.ellipse(240, 214, 100, 20, 0, 0, 6.283); g.fill();     // l'ombre portée
    g.fillStyle = 'rgba(138,132,120,0.7)'; g.beginPath(); g.ellipse(240, 190, 90, 20, 0, 0, 6.283); g.fill();   // la vasque
    g.strokeStyle = M3_INK0; g.lineWidth = 2.4; g.beginPath(); g.ellipse(240, 190, 90, 20, 0, 0, 6.283); g.stroke();
    g.fillStyle = 'rgba(70,130,170,0.78)'; g.beginPath(); g.ellipse(240, 190, 80, 15, 0, 0, 6.283); g.fill();   // l'eau
    g.lineWidth = 1.1; for (let i=0;i<3;i++){ const ph = (t*0.4 + i/3) % 1; g.strokeStyle = 'rgba(240,248,250,'+(0.8*(1-ph)).toFixed(3)+')'; g.beginPath(); g.ellipse(240, 192, 8+ph*62, 1.5+ph*10, 0, 0, 6.283); g.stroke(); }
    inkLine(g, [236,192, 236,116], n, 3.4); inkLine(g, [244,192, 244,116], n, 3.4); inkLine(g, [228,116, 252,116], n, 3);   // la colonne
    inkLine(g, [240,112, 266,126, 280,176], n, 2, '#2f6f9a'); inkLine(g, [240,112, 214,126, 200,176], n, 2, '#2f6f9a');   // le filet d'eau : deux arcs
    g.fillStyle = '#2f6f9a'; for (let i=0;i<7;i++){ const ph = (t*0.9 + i/7) % 1, sd = i%2? 1 : -1; g.beginPath(); g.arc(240 + sd*(ph*40), 112 + ph*ph*64 + ph*14, 1.7, 0, 6.283); g.fill(); }
    for (const [cx, dir] of [[180,1],[240,0],[306,-1]]){ const cy = cx===240? 208 : 206;                       // trois enfants assis, pieds dans l'eau
      g.save(); g.beginPath(); g.rect(cx-20, cy-40, 40, 26); g.clip(); inkFolk(g, cx, cy+4, 24); g.restore();
      g.strokeStyle = M3_INK0; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx-2, cy-14); g.lineTo(cx-3+dir*4, cy-20); g.moveTo(cx+3, cy-14); g.lineTo(cx+4+dir*4, cy-20); g.stroke(); }
    inkWash(g, [346,230, 350,208, 370,208, 374,230], '#7a746a', 0.75); m3Loop(g, [346,230, 350,208, 370,208, 374,230], n, 1.8); inkLine(g, [350,208, 360,196, 370,208], n, 1.4);   // le seau
    plateEnd(g, w, h); },
  // P7 · Le ciel gris : un plateau, un chevalement de mine, une construction lisse, la neige
  grey(g, w, h, t){ plateBase(g, w, h, 'rgba(70,76,88,0.30)');
    const n = clamp(t/1.6, 0, 1);
    inkLine(g, [0,190, 480,190], n, 2.4); inkHatch(g, 0, 190, 480, 80, 8, M3_INK0, 0.2);
    inkLine(g, [92,190, 118,98], n, 2.6); inkLine(g, [146,190, 120,98], n, 2.6); inkLine(g, [101,158, 137,158], n, 1.6);       // le chevalement
    g.strokeStyle = M3_INK0; g.lineWidth = 2.4; g.beginPath(); g.arc(119, 92, 10, 0, 6.283); g.stroke();
    const tw = [330,190, 330,62, 398,62, 398,190];                                                            // la future Mnémosyne : lisse, sans fenêtre
    inkWash(g, tw, '#4a505a', 0.55); m3Loop(g, tw, n, 2.4);
    g.fillStyle = (Math.sin(t*3) > 0)? M3_RED : 'rgba(196,42,28,0.3)'; g.beginPath(); g.arc(364, 56, 3.4, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.95)'; for (let i=0;i<20;i++){ const x = (i*61.3 + t*26 + 480) % 480, y = (i*47.1 + t*40) % 270; g.fillRect(x, y, 2.6, 2.6); }
    plateEnd(g, w, h); },
  // P8 · La vanne fermée : la vanne, son volant, la chaîne et le cadenas Omnicorp, le lit craquelé, une feuille sèche
  shut(g, w, h, t){ plateBase(g, w, h, 'rgba(210,150,80,0.15)');
    const n = clamp(t/1.4, 0, 1);
    const gt = [140,60, 340,60, 340,220, 140,220];                                                            // la vanne
    inkWash(g, gt, '#5a5a56', 0.4); m3Loop(g, gt, n, 2.8);
    inkLine(g, [150,120, 330,120], n, 1.2); inkLine(g, [150,180, 330,180], n, 1.2);
    g.strokeStyle = M3_INK0; g.lineWidth = 2.6; g.beginPath(); g.arc(240, 88, 20, 0, 6.283); g.stroke();         // le volant
    inkLine(g, [220,88, 260,88], n, 2); inkLine(g, [240,68, 240,108], n, 2);
    for (let i=0;i<5;i++){ g.strokeStyle = M3_INK0; g.lineWidth = 1.8; g.beginPath(); g.ellipse(240 + (i%2? 2 : -2), 114 + i*9, 4.4, 3.4, 0, 0, 6.283); g.stroke(); }   // la chaîne
    inkWash(g, [222,158, 258,158, 258,190, 222,190], '#2a2622', 0.9); m3Loop(g, [222,158, 258,158, 258,190, 222,190], n, 2);   // le cadenas
    g.strokeStyle = M3_INK0; g.lineWidth = 3; g.beginPath(); g.arc(240, 158, 9, Math.PI, 6.283); g.stroke();
    m3Plate(g, 'Ω', 240, 182, 20, M3_RED);
    inkLine(g, [0,220, 140,220], n, 2.2); inkLine(g, [340,220, 480,220], n, 2.2);                                // le lit craquelé
    inkLine(g, [30,232, 60,244, 48,258, 78,266], n, 1.3); inkLine(g, [150,236, 180,248, 200,244, 220,258], n, 1.3); inkLine(g, [380,234, 410,248, 396,262], n, 1.3); inkLine(g, [430,236, 452,252, 470,246], n, 1.3);
    const ph = clamp((t-0.8)/5.5, 0, 1), fx = 420 - ph*90 + Math.sin(ph*9)*14, fy = 70 + ph*150;                // la feuille sèche tombe
    g.save(); g.translate(fx, fy); g.rotate(ph*7); g.fillStyle = '#8a5a22'; g.beginPath(); g.ellipse(0, 0, 7, 3.6, 0, 0, 6.283); g.fill(); g.restore();
    plateEnd(g, w, h); },
};
M3_PLATES.kassandre = (g, w, h, t) => M3_PLATES.pager(g, w, h, t, 'k');
M3_PLATES.arbitrage = (g, w, h, t) => M3_PLATES.pager(g, w, h, t, 'arb');

/* ---------- la crue : OUVRIR LES VANNES → sirène → vague depuis V-3 → les lits sont balayés, la station est frappée ---------- */
function m3Open(g, c){
  c.siren = M3.siren[c.D.i] + (c.warnLead||0);                    // Radio libre : la sirène est annoncée 4 s plus tôt
  c.level = clamp(c.water, 0, 100);                               // le niveau du réservoir fait la force de la crue
  if (c.level >= 99.5 && !c.g1){ c.g1 = true; m3Bonus(c, 0); }   // facultatif : la grande crue
  c.water = 0; c.sirT = 0; c.floods = (c.floods|0) + 1;
  if (c.floods === 1) c.sirHold = true;                           // la 1re fois, la sirène attend la fin du plan (scène S1)
  addFloater(M3.src+120, gY(M3.src+120)-90, cT(M3_UI.siren), M3_RED, 15);
}
function m3Flood(g, c, dt){
  const D = c.D.i;
  if (c.sirHold && !CINE.on) c.sirHold = false;                   // sécurité : sans scène en cours, la sirène ne s'attend jamais
  if (c.siren > 0){
    if (!c.sirHold) c.siren -= dt;
    if (AC && SETTINGS.sfx && (c.sirT -= dt) <= 0){ c.sirT = 0.9; tone(420, AC.currentTime, .8, 'sawtooth', .022, 360, .12, 1400); }
    if (c.siren <= 0 && !c.sirHold){ c.siren = 0; c.flood = { x:M3.src, t:0, pow:c.level, hit:new Set(), foes:0, mine:0, base:false, done:false }; g.shake = 9; sfx('spec');
      if (AC && SETTINGS.sfx){ noise(AC.currentTime, 3.5, .08, 0); tone(48, AC.currentTime, 3, 'sine', .08, -10, .3); } } }
  const f = c.flood; if (!f) return;
  f.t += dt; f.x = Math.min(WORLD+200, f.x + M3.speed*dt);
  const part = 1.2*f.pow/100;                                     // part des PV max emportée : 1,2 × niveau % (à 84 % et plus : tout)
  for (const side of [g.p, g.e]) for (const u of side.units){     // les deux camps : l'eau ne choisit pas ; l'aérien et la garnison ne craignent rien
    if (u.fly || f.hit.has(u) || u.x > f.x || !m3Low(u.x)) continue;
    f.hit.add(u); u.hp -= u.maxhp*part; u.flash = 0.3; u.tiredT = 3;
    if (u.hp <= 0){ if (side === g.p){ c.swept = (c.swept|0) + 1; f.mine++; } else { f.foes++; c.sweptFoes = (c.sweptFoes|0) + 1; } }
    if (qFx()) burst(u.x, gY(u.x)-12, '#d8eef4', 7, 0.7); }
  if (!f.base && f.x >= g.e.x-60){ f.base = true; c.fhits = (c.fhits|0) + 1;
    const dmg = Math.round(6*f.pow*M3.kHit[D]); g.e.hp -= dmg;    // la vague frappe la station : 6 × niveau, selon la difficulté
    explode(g.e.x-40, gY(g.e.x)-30, 1.4, '#d8eef4'); g.shake = 10; addFloater(g.e.x-40, gY(g.e.x)-120, '−'+dmg, '#2f6f9a', 16); }
  if (!f.done && f.x >= g.e.x+40) f.done = true;
  if (f.t > 11) c.flood = null;
}
function m3Bonus(c, k){ c.banner = { head:CAMP_UI.bonusDone, txt:M3_G2[k], t0:performance.now() }; sfx('evolve'); }
const M3_G2 = [
  {fr:"Une crue à 100 %.", en:"A flood at 100%.", es:"Una crecida al 100 %.", de:"Eine Flut bei 100 %.", it:"Una piena al 100 %.", pt:"Uma cheia a 100 %.", ru:"Паводок при 100 %.", zh:"满水位放一次洪。", ar:"فيضان عند 100%."},
  {fr:"Aucune perte dans les crues.", en:"No losses to floods.", es:"Ninguna baja por las crecidas.", de:"Keine Verluste durch Fluten.", it:"Nessuna perdita nelle piene.", pt:"Nenhuma perda nas cheias.", ru:"Ни одной потери в паводках.", zh:"洪水中零损失。", ar:"لا خسائر في الفيضانات."},
  {fr:"Les deux prises d'eau, ensemble.", en:"Both water intakes at once.", es:"Las dos tomas de agua a la vez.", de:"Beide Wasserfassungen gleichzeitig.", it:"Le due prese d'acqua insieme.", pt:"As duas tomadas d'água ao mesmo tempo.", ru:"Оба водозабора одновременно.", zh:"同时守住两处取水口。", ar:"مأخذا الماء معًا."},
];
// un convoi de la station : n machines (+1 toutes les 3 minutes) qui chargent d'elles-mêmes, et traversent donc forcément les deux lits
function m3Convoy(g, c){
  const e = g.e, n = M3.nConv[c.D.i] + Math.floor(c.t/180), pat = [0,2,1,2,3,0,1,2,0,3];
  for (let i=0;i<n;i++){ if (e.units.length >= 80) break; const k = e.units.length;
    spawnUnit(e, pat[(i + (c.convN|0)) % pat.length], false, e.x - 40 - i*24);
    for (let j=k;j<e.units.length;j++) e.units[j].ord = 'charge'; }
  c.convN = (c.convN|0) + n;
}

/* ---------- le terrain : prises d'eau, zone de la crête, décors du lieu, lits, bases ---------- */
const m3Label = (s, y, col) => { ctx.font = '700 8px '+UI_TYPE; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(20,16,12,0.7)'; ctx.fillText(s, 1, y+1); ctx.fillStyle = col || 'rgba(240,230,205,0.95)'; ctx.fillText(s, 0, y); };
// PRISE D'EAU : une crépine posée dans le lit, une petite pompe à main sur un socle de béton ; le fanion dit qui la tient
function m3DrawIntake(n, t, vw){
  const x = n.x-camX; if (x<-100 || x>vw+100) return; const y = gY(n.x), own = n.owner;
  const col = own? (own==='p'? game.p.fac.accent : game.e.fac.accent) : '#9a8a78';
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(10,8,8,0.25)'; ctx.beginPath(); ctx.ellipse(0, 2, 44, 6, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#3d6f88'; ctx.beginPath(); ctx.ellipse(-30, 2, 22, 4, 0, 0, 6.283); ctx.fill();                                 // flaque de la prise
  ctx.fillStyle = 'rgba(232,242,246,0.6)'; ctx.fillRect(-44, 1+Math.sin(t*2+n.x)*0.7, 28, 1.2);
  ctx.fillStyle = '#9a9a92'; ctx.fillRect(-12, -9, 42, 9); ctx.fillStyle = 'rgba(40,46,52,0.3)'; ctx.fillRect(18, -9, 12, 9);        // socle de béton
  ctx.fillStyle = '#7d8a90'; ctx.beginPath(); ctx.ellipse(-30, -5, 11, 5, 0, 0, 6.283); ctx.fill();                                // la crépine (cylindre percé)
  ctx.strokeStyle = M3_INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(-30, -5, 11, 5, 0, 0, 6.283); ctx.stroke();
  for (let k=-2;k<=2;k++){ ctx.beginPath(); ctx.moveTo(-30+k*4, -9); ctx.lineTo(-30+k*4, -1); ctx.stroke(); }
  ctx.strokeStyle = '#5a6268'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-19, -5); ctx.lineTo(-4, -5); ctx.lineTo(-4, -22); ctx.stroke();   // tuyau jusqu'à la pompe
  ctx.fillStyle = '#4c5a62'; ctx.fillRect(-9, -42, 10, 30); ctx.fillStyle = '#2f3a40'; ctx.fillRect(-11, -45, 14, 4);               // corps de pompe
  ctx.fillStyle = '#4c5a62'; ctx.beginPath(); ctx.moveTo(1,-36); ctx.lineTo(14,-33); ctx.lineTo(14,-29); ctx.lineTo(1,-30); ctx.closePath(); ctx.fill();   // bec
  const sw = own==='p'? Math.sin(t*3.2)*0.32 : 0.1;                                                                                 // le balancier grince quand la pompe est tenue
  ctx.save(); ctx.translate(-4, -46); ctx.rotate(sw); ctx.strokeStyle = '#3a3028'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(12, -2); ctx.stroke(); ctx.restore();
  if (own==='p'){ ctx.fillStyle = 'rgba(232,244,248,0.9)'; for (let i=0;i<4;i++){ const ph = (t*2.4+i*0.25)%1; ctx.fillRect(14+ph*4, -31+ph*ph*26, 2, 3); } }   // l'eau coule
  ctx.strokeStyle = '#3a3028'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(26, -9); ctx.lineTo(26, -52); ctx.stroke();           // fanion
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(26, -52); ctx.lineTo(44, -48+Math.sin(t*3)*2); ctx.lineTo(26, -42); ctx.closePath(); ctx.fill();
  if (Math.abs(n.prog) > 0.01 && Math.abs(n.prog) < 1){ ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-22, -64, 44, 5); ctx.fillStyle = n.prog>0? game.p.fac.accent : game.e.fac.accent; ctx.fillRect(-22, -64, 44*Math.abs(n.prog), 5); }
  m3Label(cT(M3_UI.intake), 15);
  ctx.restore();
}
// objets du décor de la mission : le belvédère, la maison du garde (zone), le muret, la cabane de pêche
function m3DrawProps(c, t, vw){
  const prop = (wx, key, fn) => { const x = wx-camX; if (x<-90 || x>vw+90) return; ctx.save(); ctx.translate(x, gY(wx)); fn(); m3Label(cT(M3_UI[key]), 14); ctx.restore(); };
  prop(500, 'belv', () => {                                       // rambarde et longue-vue
    ctx.fillStyle = '#6a5a44'; ctx.fillRect(-28, -6, 56, 6); ctx.fillStyle = '#4a3c2c'; for (const px of [-26,-9,9,26]) ctx.fillRect(px-1, -27, 2, 21); ctx.fillRect(-28, -28, 56, 2.4);
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(4,-6); ctx.lineTo(10,-23); ctx.moveTo(16,-6); ctx.lineTo(10,-23); ctx.stroke();
    ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(2,-27); ctx.lineTo(22,-32); ctx.stroke(); });
  prop(2010, 'muret', () => {                                     // muret de pierres sèches
    ctx.fillStyle = '#8a8478'; ctx.fillRect(-34, -14, 68, 14); ctx.fillStyle = '#9a9488'; ctx.fillRect(-34, -14, 68, 3);
    ctx.strokeStyle = 'rgba(31,27,23,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-34,-7); ctx.lineTo(34,-7);
    for (let k=-30;k<34;k+=14){ ctx.moveTo(k,-14); ctx.lineTo(k,-7); } for (let k=-23;k<34;k+=14){ ctx.moveTo(k,-7); ctx.lineTo(k,0); } ctx.stroke(); });
  prop(3010, 'cabane', () => {                                    // cabane de pêche, canne appuyée
    ctx.fillStyle = '#7a6244'; ctx.fillRect(-20, -26, 40, 26); ctx.fillStyle = '#5a4630'; ctx.beginPath(); ctx.moveTo(-25,-26); ctx.lineTo(0,-40); ctx.lineTo(25,-26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a2018'; ctx.fillRect(-5, -17, 10, 17); ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let k=-17;k<20;k+=6) ctx.fillRect(k, -26, 1, 26);
    ctx.strokeStyle = '#3a3028'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(38, -38); ctx.stroke(); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(38,-38); ctx.lineTo(34,-12); ctx.stroke(); });
}
// la zone de la crête : un fanion sur la maison du garde-barrage
function m3DrawZone(z, t, vw){
  const x = z.x-camX; if (x<-90 || x>vw+90) return; const y = gY(z.x), mine = z.owner==='p', foe = z.owner==='e';
  const col = mine? game.p.fac.accent : foe? game.e.fac.accent : '#9a8a78';
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(10,8,8,0.25)'; ctx.beginPath(); ctx.ellipse(2, 2, 40, 6, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#c9c0ae'; ctx.fillRect(-28, -34, 56, 34); ctx.fillStyle = 'rgba(31,27,23,0.2)'; ctx.fillRect(18, -34, 10, 34);
  ctx.fillStyle = '#6b4a3a'; ctx.beginPath(); ctx.moveTo(-34, -34); ctx.lineTo(0, -54); ctx.lineTo(34, -34); ctx.closePath(); ctx.fill();   // toit de tuiles
  ctx.fillStyle = '#5a5e66'; ctx.fillRect(14, -52, 8, 14);                                                                                   // cheminée
  ctx.fillStyle = '#2a2018'; ctx.fillRect(-18, -22, 11, 22); ctx.fillStyle = '#e8d8a0'; ctx.fillRect(6, -26, 12, 11); ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 1.2; ctx.strokeRect(6, -26, 12, 11);
  ctx.strokeStyle = '#3a3028'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(0, -88); ctx.stroke();                 // le fanion
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -88); ctx.lineTo(26, -83+Math.sin(t*3)*2.4); ctx.lineTo(0, -75); ctx.closePath(); ctx.fill();
  const pr = Math.abs(z.prog); if (pr > 0.01 && pr < 1){ ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-22, -102, 44, 5); ctx.fillStyle = z.prog>0? game.p.fac.accent : game.e.fac.accent; ctx.fillRect(-22, -102, 44*pr, 5); }
  m3Label(cT(M3_UI.garde), 14);
  ctx.restore();
}
// les lits : galets, échelles de crue rouges, alerte blanche pendant la sirène, puis l'eau
function m3DrawLits(c, t, vw){
  const f = c.flood, siren = c.siren > 0;
  for (const [a, b] of M3.lits){
    for (let x = a+20; x < b-10; x += 38){ const px = x-camX; if (px<-20 || px>vw+20) continue;                       // galets (positions déterministes)
      const h = Math.sin(x*12.9898)*43758.5453, r = h-Math.floor(h), y = gY(x) + 4 + r*8;
      ctx.fillStyle = r<0.5? 'rgba(130,124,112,0.55)' : 'rgba(168,160,146,0.55)'; ctx.beginPath(); ctx.ellipse(px+r*18, y, 3+r*3, 1.6+r, 0, 0, 6.283); ctx.fill(); }
    for (const e of [a, b]){ const x = e-camX; if (x<-20 || x>vw+20) continue; const y = gY(e);                         // échelle de crue
      ctx.fillStyle = '#e9dfc6'; ctx.fillRect(x-2.4, y-36, 4.8, 36); ctx.fillStyle = M3_RED; for (let k=0;k<4;k++) ctx.fillRect(x-2.4, y-34+k*8, 4.8, 3.4);
      const glow = (c.ladAt && performance.now()-c.ladAt < 7000 && Math.sin(t*9)>-0.3) || (siren && Math.sin(t*12)>0);
      if (glow){ ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,60,40,0.4)'; ctx.beginPath(); ctx.arc(x, y-20, 22, 0, 6.283); ctx.fill(); ctx.restore(); } }
    if (siren){ const x0 = Math.max(a, camX-20), x1 = Math.min(b, camX+vw+20); if (x1 > x0){                              // les lits clignotent en blanc, la flèche donne le sens de la vague
      const pulse = 0.5 + 0.5*Math.sin(t*10); ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,'+(0.16+0.3*pulse).toFixed(3)+')'; ctx.fillRect(x0-camX, GROUND-14, x1-x0, 20);
      ctx.strokeStyle = 'rgba(255,255,255,'+(0.35+0.5*pulse).toFixed(3)+')'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x=x0-(x0%16); x<x1; x+=16){ ctx.moveTo(x-camX, GROUND+4); ctx.lineTo(x-camX+10, GROUND-14); } ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.strokeStyle = M3_INK; ctx.lineWidth = 1.6;
      for (let x=a+50+((t*120)%110); x<b-30; x+=110){ if (x<x0 || x>x1) continue; const px = x-camX, py = GROUND-62;
        ctx.beginPath(); ctx.moveTo(px-16, py-9); ctx.lineTo(px+4, py-9); ctx.lineTo(px+4, py-17); ctx.lineTo(px+22, py); ctx.lineTo(px+4, py+17); ctx.lineTo(px+4, py+9); ctx.lineTo(px-16, py+9); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.restore(); } }
  }
  if (!f) return;
  const al = f.t<7? 0.82 : Math.max(0, 0.82*(1-(f.t-7)/4)), lvl = GROUND - 8 - 8*f.pow/100*Math.max(0, 1-f.t/8);
  for (const [a, b] of M3.lits){
    const x0 = Math.max(a, camX-10), x1 = Math.min(b, f.x, camX+vw+10); if (x1 <= x0) continue;
    ctx.globalAlpha = al; ctx.fillStyle = '#3d6f88'; ctx.beginPath(); ctx.moveTo(x0-camX, gY(x0)+8);
    for (let x=x0; x<=x1; x+=12) ctx.lineTo(x-camX, Math.min(gY(x), lvl + Math.sin(x*0.05+t*4)*1.6));
    ctx.lineTo(x1-camX, gY(x1)+8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(232,242,246,0.9)'; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let x=x0; x<=x1; x+=12){ const y = Math.min(gY(x), lvl + Math.sin(x*0.05+t*4)*1.6); x===x0? ctx.moveTo(x-camX, y) : ctx.lineTo(x-camX, y); } ctx.stroke();
    if (f.x > a && f.x < b){ const fx = f.x-camX;                                                                          // la tête de la vague : rouleau d'écume
      ctx.fillStyle = 'rgba(240,248,250,0.95)'; for (let i=0;i<6;i++){ ctx.beginPath(); ctx.arc(fx-i*7, lvl-4-Math.sin(t*20+i)*3-(6-i)*1.2, 5-i*0.5, 0, 6.283); ctx.fill(); } }
    ctx.globalAlpha = 1; }
}
// la vue de la crête : tant que la zone est à nous, on voit combien de machines (rouge) et des nôtres (bleu) sont dans chaque lit
function m3DrawView(g, c, t, vw){
  const z = g.zones[0]; if (!z || z.owner !== 'p') return;
  for (const [a, b] of M3.lits){ let nf = 0, np = 0;
    for (const u of g.e.units) if (!u.fly && u.x>=a && u.x<=b) nf++;
    for (const u of g.p.units) if (!u.fly && u.x>=a && u.x<=b) np++;
    const mx = (a+b)/2 - camX; if (mx < -60 || mx > vw+60) continue; const y = GROUND-118;
    ctx.save(); ctx.fillStyle = 'rgba(20,16,12,0.62)'; ctx.fillRect(mx-34, y-9, 68, 18); ctx.strokeStyle = 'rgba(240,230,205,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(mx-34.5, y-9.5, 68, 18);
    ctx.font = '700 10px '+UI_TYPE; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = game.e.fac.accent; ctx.beginPath(); ctx.arc(mx-24, y, 4, 0, 6.283); ctx.fill(); ctx.fillStyle = '#f0e6c8'; ctx.fillText(String(nf), mx-16, y+0.5);
    ctx.fillStyle = game.p.fac.accent; ctx.beginPath(); ctx.arc(mx+6, y, 4, 0, 6.283); ctx.fill(); ctx.fillStyle = '#f0e6c8'; ctx.fillText(String(np), mx+14, y+0.5);
    ctx.restore(); }
}
// repère d'un convoi qui part de la station (plus tôt avec Radio libre) ; sur le bord de l'écran s'il est hors champ
function m3DrawConvoy(g, c, t, vw){
  const lead = 2 + (c.warnLead||0); if (!(c.t >= c.nextW - lead && c.t < c.nextW)) return;
  if (Math.sin(t*9) < -0.2) return;
  const wx = g.e.x - 90, sx = wx-camX, off = sx > vw-50, x = off? vw-60 : clamp(sx, 40, vw-40), y = GROUND-176;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(20,16,12,0.7)'; ctx.fillRect(x-42, y-12, 84, 24); ctx.fillStyle = M3_RED; ctx.fillRect(x-42, y-12, 84, 3);
  ctx.font = '700 12px '+UI_TYPE; ctx.fillStyle = '#f0e6c8'; ctx.fillText((off? '▶ ' : '▼ ')+cT(M3_UI.convoy), x, y+2);
  ctx.restore();
}
// les deux bases ont le visage du lieu : la salle des commandes sur la digue (la nôtre), la station de pompage (la leur)
const m3SprCtrl = () => fxSprite('M3CTRL', 210, 170, g => {
  const G = 160;
  g.fillStyle = '#b3b3ac'; g.fillRect(4, 110, 202, 50); g.fillStyle = '#9a9a94'; g.fillRect(4, 110, 202, 6); g.fillStyle = 'rgba(40,46,52,0.2)'; g.fillRect(150, 116, 56, 44);   // la digue
  g.fillStyle = 'rgba(60,66,70,0.22)'; for (let k=0;k<7;k++) g.fillRect(14+k*28, 118, 1.2, 40);
  for (let k=0;k<3;k++){ const x = 38+k*54; g.fillStyle = '#c8c8c0'; g.fillRect(x-3, 122, 36, 38); g.fillStyle = '#1f282e'; g.fillRect(x, 126, 30, 34);   // les trois vannes de fond
    g.fillStyle = '#4a545a'; for (let s=0;s<5;s++) g.fillRect(x, 130+s*6, 30, 2); }
  g.fillStyle = '#4a3c2c'; for (let x=8;x<204;x+=12) g.fillRect(x, 98, 1.6, 12); g.fillRect(4, 97, 202, 2);                                                           // garde-corps de la crête
  g.fillStyle = '#d4d4cc'; g.fillRect(52, 50, 108, 60); g.fillStyle = 'rgba(40,46,52,0.2)'; g.fillRect(136, 50, 24, 60);                                          // la salle des commandes
  g.fillStyle = '#7e8480'; g.fillRect(46, 44, 120, 8);
  g.fillStyle = '#1e2a32'; g.fillRect(62, 62, 66, 30); g.fillStyle = 'rgba(232,165,60,0.85)'; g.fillRect(64, 82, 62, 8);                                             // le pupitre allumé
  g.fillStyle = '#ff6a3a'; for (let k=0;k<6;k++) g.fillRect(68+k*10, 78, 4, 3); g.fillStyle = '#7bd88a'; g.fillRect(70, 70, 4, 3); g.fillRect(100, 70, 4, 3);
  g.fillStyle = '#5a6268'; g.fillRect(138, 66, 14, 44);
  g.strokeStyle = '#3a4248'; g.lineWidth = 2; g.beginPath(); g.moveTo(150, 44); g.lineTo(150, 8); g.moveTo(140, 20); g.lineTo(160, 20); g.moveTo(143, 32); g.lineTo(157, 32); g.stroke();   // mât
});
const m3SprStation = () => fxSprite('M3STAT', 330, 176, g => {
  const G = 166;
  const pipes = [88,104,120,136];                                                                                                   // quatre grosses conduites qui plongent vers la rivière
  pipes.forEach((y0, i) => { const ex = 36 + i*16;
    g.strokeStyle = '#46505a'; g.lineWidth = 9; g.lineCap = 'butt'; g.beginPath(); g.moveTo(132, y0); g.lineTo(112, y0); g.lineTo(ex, G-2); g.stroke();
    g.strokeStyle = '#7d8892'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(132, y0-2.5); g.lineTo(112, y0-2.5); g.lineTo(ex-2.5, G-2); g.stroke();
    g.fillStyle = '#2f363c'; g.fillRect(ex-7, G-6, 14, 6); g.fillRect(118, y0-6, 4, 12); });
  g.fillStyle = '#59616a'; g.fillRect(130, 64, 140, 102); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(250, 64, 20, 102);          // le bâtiment carré
  g.fillStyle = 'rgba(255,255,255,0.07)'; for (let y=72;y<160;y+=14) g.fillRect(130, y, 140, 2);
  g.fillStyle = '#3d444b'; g.fillRect(124, 58, 152, 8); g.fillStyle = '#4a545c'; g.fillRect(146, 36, 14, 24); g.fillRect(240, 36, 14, 24); g.fillStyle = '#2a3036'; g.fillRect(143, 34, 20, 4); g.fillRect(237, 34, 20, 4);
  g.fillStyle = '#e9dfc6'; g.beginPath(); g.arc(200, 100, 19, 0, 6.283); g.fill(); g.strokeStyle = '#1f1b17'; g.lineWidth = 2; g.beginPath(); g.arc(200, 100, 19, 0, 6.283); g.stroke();
  g.fillStyle = '#1f1b17'; g.font = '700 22px '+M3_COUR; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Ω', 200, 101);
  g.fillStyle = '#e9dfc6'; g.font = '700 13px '+M3_COUR; g.fillText('OMNICORP', 200, 138);
  g.fillStyle = '#2a3036'; g.fillRect(236, 134, 20, 32); g.fillStyle = '#3b4046'; g.fillRect(122, 160, 160, 6);
});
function m3DrawBase(side){
  const x = side.x-camX; if (x<-260 || x>VW()+260) return;
  const g = game, t = g.t, gy = gY(side.x), mine = side === g.p, frac = side.maxhp>0? clamp(side.hp/side.maxhp, 0, 1) : 1;
  projShadow(x, gy, mine? 70 : 84);
  if (mine){ ctx.drawImage(m3SprCtrl(), x-105, gy-160, 210, 170);
    const wv = Math.sin(t*3)*3; ctx.fillStyle = M3_RED; ctx.beginPath(); ctx.moveTo(x+45, gy-152); ctx.lineTo(x+70, gy-148+wv); ctx.lineTo(x+70, gy-136+wv); ctx.lineTo(x+45, gy-140); ctx.closePath(); ctx.fill();   // drapeau de Germinal
    if (Math.sin(t*2) > -0.3){ ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,190,90,0.18)'; ctx.fillRect(x-43, gy-98, 66, 12); ctx.restore(); } }
  else { ctx.drawImage(m3SprStation(), x-200, gy-166, 330, 176);
    ctx.fillStyle = (Math.sin(t*3) > 0)? '#ff3a2a' : '#6a1a14'; ctx.beginPath(); ctx.arc(x-47, gy-134, 2.6, 0, 6.283); ctx.arc(x+47, gy-134, 2.6, 0, 6.283); ctx.fill();   // feux des cheminées
    if (qFx()) for (let k=0;k<2;k++) for (let i=0;i<3;i++){ const ph = (t*0.35+i/3+k*0.2)%1; ctx.fillStyle = 'rgba(235,235,235,'+(0.32*(1-ph)).toFixed(3)+')';
      ctx.beginPath(); ctx.arc(x+(k? 47 : -47)+Math.sin(ph*4+k)*4, gy-138-ph*46, 4+ph*8, 0, 6.283); ctx.fill(); } }
  if (frac < 0.55){ const S = mine? [[-30,-100],[28,-92]] : [[-40,-110],[34,-100]]; for (let i=0;i<S.length;i++) dmgSmoke(x+S[i][0], gy+S[i][1], frac, t, side.x+i*31); }
  const w = 110, by = gy-(mine? 150 : 146);
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x-w/2, by, w, 8); ctx.fillStyle = side.fac.accent; ctx.fillRect(x-w/2, by, w*frac, 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(x-w/2, by, w, 8);
  if (mine && frac < 0.95){ ctx.font = HF(12); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,'+(0.5+0.3*Math.sin(t*3))+')'; ctx.fillText(tr('hud_tap_repair'), x, by-10); }
}
{ const _m3Base = drawBase;                                                       // enveloppe de drawBase : seule cette mission change le visage des bases
  drawBase = function(side){ const c = game && game.camp; if (c && c.i === 2) m3DrawBase(side); else _m3Base(side); }; }
M3_PLATES.kassandre2 = (g, w, h, t) => M3_PLATES.pager(g, w, h, t+5, 'k');          // même plan, déjà défilé (suite de la réplique)
M3_PLATES.arbitrage2 = (g, w, h, t) => M3_PLATES.pager(g, w, h, t+4.5, 'arb');
M3_PLATES.shut2 = (g, w, h, t) => M3_PLATES.shut(g, w, h, t+3);

// textes réutilisés (annonce des canicules)
const M3_HEAT = {fr:"55 : CANICULE DANS 20 S. VOTRE RÉSERVOIR VA S'ÉVAPORER. LE LEUR AUSSI. JE N'AI PAS DIT « LE NÔTRE ».", en:"55: HEATWAVE IN 20 S. YOUR RESERVOIR WILL EVAPORATE. THEIRS TOO. I DID NOT SAY “OURS”.", es:"55: OLA DE CALOR EN 20 S. SU EMBALSE SE EVAPORARÁ. EL DE ELLOS TAMBIÉN. NO HE DICHO «EL NUESTRO».", de:"55: HITZEWELLE IN 20 S. IHR STAUSEE WIRD VERDUNSTEN. IHRER AUCH. ICH HABE NICHT „UNSER“ GESAGT.", it:"55: CANICOLA TRA 20 S. IL VOSTRO SERBATOIO EVAPORERÀ. ANCHE IL LORO. NON HO DETTO «IL NOSTRO».", pt:"55: ONDA DE CALOR EM 20 S. O SEU RESERVATÓRIO VAI EVAPORAR. O DELES TAMBÉM. NÃO DISSE «O NOSSO».", ru:"55: ЖАРА ЧЕРЕЗ 20 С. ВАШЕ ВОДОХРАНИЛИЩЕ ИСПАРИТСЯ. ИХ — ТОЖЕ. Я НЕ СКАЗАЛА «НАШЕ».", zh:"55：20秒后热浪来袭。你们的水库将蒸发。他们的也一样。我没说“我们的”。", ar:"55: موجة حر بعد 20 ث. خزّانكم سيتبخّر. وخزّانهم أيضًا. لم أقل «خزّاننا»."};

campMission(2, {
  num:'III', year:"2032", ai:[0,1,2], doctrines:['radio','veterans'],
  title:{fr:"Le barrage de Sainte-Aube", en:"The Sainte-Aube dam", es:"La presa de Sainte-Aube", de:"Der Staudamm von Sainte-Aube", it:"La diga di Sainte-Aube", pt:"A barragem de Sainte-Aube", ru:"Плотина Sainte-Aube", zh:"Sainte-Aube水坝", ar:"سدّ Sainte-Aube"},
  place:{fr:"La vallée de l'Aube, en amont de Valmont", en:"The Aube valley, upstream of Valmont", es:"El valle del Aube, aguas arriba de Valmont", de:"Das Aubetal, flussaufwärts von Valmont", it:"La valle dell'Aube, a monte di Valmont", pt:"O vale do Aube, a montante de Valmont", ru:"Долина Aube, выше по течению от Valmont", zh:"Aube山谷，Valmont上游", ar:"وادي Aube، في أعلى مجرى Valmont"},
  recap:{fr:"En 2028, la grève a parlé au pays. Depuis, il ne pleut plus. Omnicorp refroidit ses centres de calcul avec l'eau du barrage ; en aval, les villages boivent ce qui reste.",
         en:"In 2028 the strike spoke to the whole country. Since then it has not rained. Omnicorp cools its data centres with the dam's water; downstream, the villages drink what is left.",
         es:"En 2028, la huelga habló al país. Desde entonces no llueve. Omnicorp enfría sus centros de cálculo con el agua de la presa; río abajo, los pueblos beben lo que queda.",
         de:"2028 hat der Streik zum ganzen Land gesprochen. Seitdem regnet es nicht mehr. Omnicorp kühlt seine Rechenzentren mit dem Wasser der Staumauer; flussabwärts trinken die Dörfer, was übrig bleibt.",
         it:"Nel 2028 lo sciopero ha parlato al paese. Da allora non piove più. Omnicorp raffredda i suoi centri di calcolo con l'acqua della diga; a valle, i villaggi bevono ciò che resta.",
         pt:"Em 2028, a greve falou ao país. Desde então, não chove mais. A Omnicorp resfria seus centros de cálculo com a água da barragem; rio abaixo, as aldeias bebem o que sobra.",
         ru:"В 2028 году забастовка заговорила со всей страной. С тех пор дождей нет. Omnicorp охлаждает свои вычислительные центры водой плотины; ниже по течению деревни пьют то, что осталось.",
         zh:"2028年，罢工向全国发出了声音。从那以后，再没下过雨。Omnicorp用水坝的水冷却它的计算中心；下游的村庄只能喝剩下的。",
         ar:"في عام 2028 خاطب الإضراب البلاد كلها. ومنذ ذلك الحين لم تمطر. تبرّد Omnicorp مراكز حوسبتها بمياه السدّ، وتشرب القرى في المصبّ ما تبقّى."},
  where:{fr:"La vallée de l'Aube, du barrage de Sainte-Aube à la station de pompage — 19 juillet 2032, midi.",
         en:"The Aube valley, from the Sainte-Aube dam to the pumping station — 19 July 2032, midday.",
         es:"El valle del Aube, de la presa de Sainte-Aube a la estación de bombeo — 19 de julio de 2032, mediodía.",
         de:"Das Aubetal, vom Staudamm von Sainte-Aube bis zur Pumpstation — 19. Juli 2032, Mittag.",
         it:"La valle dell'Aube, dalla diga di Sainte-Aube alla stazione di pompaggio — 19 luglio 2032, mezzogiorno.",
         pt:"O vale do Aube, da barragem de Sainte-Aube à estação de bombeamento — 19 de julho de 2032, meio-dia.",
         ru:"Долина Aube, от плотины Sainte-Aube до насосной станции — 19 июля 2032 года, полдень.",
         zh:"Aube山谷，从Sainte-Aube水坝到抽水站——2032年7月19日，正午。",
         ar:"وادي Aube، من سدّ Sainte-Aube إلى محطة الضخّ — 19 يوليو 2032، منتصف النهار."},
  goal:{fr:"Détruire la station de pompage d'Omnicorp, au bout de la vallée, pour rendre la rivière aux villages.",
        en:"Destroy Omnicorp's pumping station at the far end of the valley, to give the river back to the villages.",
        es:"Destruir la estación de bombeo de Omnicorp, al final del valle, para devolver el río a los pueblos.",
        de:"Die Pumpstation von Omnicorp am Ende des Tals zerstören, um den Dörfern den Fluss zurückzugeben.",
        it:"Distruggere la stazione di pompaggio di Omnicorp, in fondo alla valle, per restituire il fiume ai villaggi.",
        pt:"Destruir a estação de bombeamento da Omnicorp, no fim do vale, para devolver o rio às aldeias.",
        ru:"Уничтожить насосную станцию Omnicorp в конце долины, чтобы вернуть реку деревням.",
        zh:"摧毁山谷尽头Omnicorp的抽水站，把河流还给村庄。",
        ar:"تدمير محطة الضخّ التابعة لـ Omnicorp في آخر الوادي، لإعادة النهر إلى القرى."},
  goal2:{fr:"Facultatif : une crue à 100 % · aucune perte dans les crues · tenir les deux prises d'eau ensemble.",
         en:"Optional: a flood at 100% · no losses to floods · hold both water intakes at once.",
         es:"Opcional: una crecida al 100 % · ninguna baja por las crecidas · mantener las dos tomas de agua a la vez.",
         de:"Optional: eine Flut bei 100 % · keine Verluste durch Fluten · beide Wasserfassungen gleichzeitig halten.",
         it:"Facoltativo: una piena al 100 % · nessuna perdita nelle piene · tenere le due prese d'acqua insieme.",
         pt:"Opcional: uma cheia a 100 % · nenhuma perda nas cheias · manter as duas tomadas d'água ao mesmo tempo.",
         ru:"По желанию: паводок при 100 % · ни одной потери в паводках · удерживать оба водозабора одновременно.",
         zh:"可选：满水位（100%）放一次洪 · 洪水中零损失 · 同时守住两处取水口。",
         ar:"اختياري: فيضان عند 100% · لا خسائر في الفيضانات · الإمساك بمأخذَي الماء معًا."},
  rule:{fr:"Le bouton OUVRIR LES VANNES lâche une crue qui balaie le lit de la rivière — leurs machines comme les nôtres — et frappe la station. Plus le réservoir est plein, plus elle est forte. Ères II et III, une seule vie.",
        en:"The OPEN THE SLUICES button releases a flood that sweeps the riverbed — their machines and ours alike — and hits the station. The fuller the reservoir, the stronger it is. Eras II and III, one life.",
        es:"El botón ABRIR COMPUERTAS suelta una crecida que barre el cauce del río —sus máquinas igual que las nuestras— y golpea la estación. Cuanto más lleno el embalse, más fuerte es. Eras II y III, una sola vida.",
        de:"Der Knopf SCHLEUSEN ÖFFNEN löst eine Flut aus, die das Flussbett leerfegt – ihre Maschinen wie unsere – und die Station trifft. Je voller der Stausee, desto stärker. Zeitalter II und III, ein Leben.",
        it:"Il pulsante APRI LE PARATOIE scatena una piena che spazza l'alveo del fiume — le loro macchine come le nostre — e colpisce la stazione. Più il serbatoio è pieno, più è forte. Ere II e III, una sola vita.",
        pt:"O botão ABRIR COMPORTAS solta uma cheia que varre o leito do rio — as máquinas deles como as nossas — e atinge a estação. Quanto mais cheio o reservatório, mais forte ela é. Eras II e III, uma só vida.",
        ru:"Кнопка ОТКРЫТЬ ШЛЮЗЫ выпускает паводок, который сметает русло реки — и их машины, и наших — и бьёт по станции. Чем полнее водохранилище, тем он сильнее. Эры II и III, одна жизнь.",
        zh:"“开闸放水”按钮会放出一场洪水，冲刷整条河床——他们的机器和我们的人一视同仁——并冲击抽水站。水库越满，洪水越猛。第二、第三纪元，只有一条命。",
        ar:"زرّ «افتح البوابات» يطلق فيضانًا يكتسح مجرى النهر — آلاتهم كآلاتنا — ويضرب المحطة. وكلما امتلأ الخزان اشتدّ الفيضان. العصران الثاني والثالث، وحياة واحدة."},
  tips:[
    {fr:"Tenez la crête (Tenir) : leurs convois doivent traverser le lit pour venir à vous.", en:"Hold the ridge (Hold): their convoys must cross the riverbed to reach you.", es:"Mantenga la cresta (Aguantar): sus convoyes tienen que cruzar el cauce para llegar hasta usted.", de:"Halten Sie den Kamm (Halten): Ihre Konvois müssen das Flussbett durchqueren, um zu Ihnen zu gelangen.", it:"Tenga la cresta (Tieni): i loro convogli devono attraversare l'alveo per raggiungerla.", pt:"Segure a crista (Segurar): os comboios deles precisam atravessar o leito para chegar até você.", ru:"Удерживайте гребень (Держать): их колоннам придётся пересечь русло, чтобы добраться до вас.", zh:"守住山脊（坚守）：他们的车队必须穿过河床才能打到你们。", ar:"تمسّك بالقمّة (تمسّك): قوافلهم مضطرّة لعبور المجرى كي تصل إليك."},
    {fr:"Pendant la sirène, Repliez ce qui est dans le lit. Comme une frappe en escarmouche : on vise, on ne s'y tient pas.", en:"During the siren, Retreat whatever is in the riverbed. Like a strike in skirmish: you aim at it, you don't stand in it.", es:"Durante la sirena, ordene Replegarse a todo lo que esté en el cauce. Como un ataque en escaramuza: se apunta, no se permanece.", de:"Ziehen Sie während der Sirene alles zurück, was im Flussbett steht. Wie ein Schlag im Gefecht: Man zielt darauf, man bleibt nicht darin.", it:"Durante la sirena, Ripiegare ciò che è nell'alveo. Come un colpo in schermaglia: si mira, non ci si resta.", pt:"Durante a sirene, Recue o que estiver no leito. Como um ataque na escaramuça: mira-se, não se fica dentro.", ru:"Во время сирены отведите всё, что в русле (Отступить). Как удар в схватке: по нему целятся, в нём не стоят.", zh:"警报响起时，把河床里的人撤出来（撤退）。就像遭遇战里的打击：瞄准它，别站在里面。", ar:"أثناء الصفّارة، أَجلِ (تراجع) كلّ ما في المجرى. كضربة في المناوشة: تصوّب نحوها ولا تقف فيها."},
    {fr:"Quand la Voix parle de troisième génération, montez en ère III.", en:"When the Voice talks about the third generation, advance to era III.", es:"Cuando la Voz hable de la tercera generación, pase a la era III.", de:"Wenn die Stimme von der dritten Generation spricht, steigen Sie ins Zeitalter III auf.", it:"Quando la Voce parla della terza generazione, passi all'era III.", pt:"Quando a Voz falar da terceira geração, avance para a era III.", ru:"Когда Голос заговорит о третьем поколении, переходите в эру III.", zh:"当“广播之声”提到第三代机器时，升到第三纪元。", ar:"عندما يتحدّث الصوت عن الجيل الثالث، انتقل إلى العصر الثالث."},
  ],
  docWhy:{
    radio:{fr:"Utile ici parce que les convois, la sirène et les canicules sont annoncés 4 s plus tôt : on a le temps de sortir les nôtres du lit et de laisser les leurs y descendre. Ici : le réservoir se remplit 35 % plus vite, et tout est annoncé 4 s plus tôt.", en:"Useful here because convoys, the siren and heatwaves are announced 4 s earlier: there is time to pull ours out of the riverbed and let theirs walk in. Here: the reservoir fills 35% faster, and everything is announced 4 s earlier.", es:"Útil aquí porque los convoyes, la sirena y las olas de calor se anuncian 4 s antes: hay tiempo para sacar a los nuestros del cauce y dejar que bajen los suyos. Aquí: el embalse se llena un 35 % más rápido y todo se anuncia 4 s antes.", de:"Hier nützlich, weil Konvois, Sirene und Hitzewellen 4 s früher angekündigt werden: Man hat Zeit, die Unseren aus dem Flussbett zu holen und ihre hineinlaufen zu lassen. Hier: Der Stausee füllt sich 35 % schneller, und alles wird 4 s früher angekündigt.", it:"Utile qui perché convogli, sirena e canicole sono annunciati 4 s prima: c'è il tempo di far uscire i nostri dall'alveo e lasciar scendere i loro. Qui: il serbatoio si riempie il 35 % più in fretta e tutto è annunciato 4 s prima.", pt:"Útil aqui porque os comboios, a sirene e as ondas de calor são anunciados 4 s antes: há tempo de tirar os nossos do leito e deixar os deles descerem. Aqui: o reservatório enche 35 % mais rápido e tudo é anunciado 4 s antes.", ru:"Полезно здесь, потому что колонны, сирена и жара объявляются на 4 с раньше: есть время вывести наших из русла и дать их машинам спуститься. Здесь: водохранилище наполняется на 35 % быстрее, и всё объявляется на 4 с раньше.", zh:"在这里的用处：车队、警报和热浪都提前4秒通报，有时间把我们的人撤出河床，让他们的机器走进去。本关效果：水库涨水快35%，一切通报提前4秒。", ar:"مفيدة هنا لأن القوافل والصفّارة وموجات الحرّ تُعلن قبل 4 ثوانٍ: يتّسع الوقت لإخراج رجالنا من المجرى وترك رجالهم ينزلون إليه. هنا: يمتلئ الخزان أسرع بنسبة 35%، ويُعلن كل شيء قبل 4 ثوانٍ."},
    veterans:{fr:"Utile ici parce que quatre combattants solides tiennent la crête dès la première minute, avant qu'on ait l'argent d'une tourelle.", en:"Useful here because four solid fighters hold the ridge from the first minute, before there is money for a turret.", es:"Útil aquí porque cuatro combatientes sólidos mantienen la cresta desde el primer minuto, antes de tener dinero para una torreta.", de:"Hier nützlich, weil vier solide Kämpfer den Kamm ab der ersten Minute halten, noch bevor das Geld für einen Turm da ist.", it:"Utile qui perché quattro combattenti solidi tengono la cresta fin dal primo minuto, prima di avere i soldi per una torretta.", pt:"Útil aqui porque quatro combatentes sólidos seguram a crista desde o primeiro minuto, antes de haver dinheiro para uma torre.", ru:"Полезно здесь, потому что четверо крепких бойцов удерживают гребень с первой минуты, ещё до того, как появятся деньги на башню.", zh:"在这里的用处：四名可靠的战士从第一分钟起就守住山脊，那时还没钱建炮塔。", ar:"مفيدة هنا لأن أربعة مقاتلين أشدّاء يتمسّكون بالقمّة منذ الدقيقة الأولى، قبل أن يتوفّر المال لبرج."},
  },
  debrief:{fr:"La station de pompage a cédé à 16 h 40. En aval, on a rempli les citernes, les baignoires, les casseroles. Kassandre a envoyé un seul mot : « ARBITRAGE. » Je crois que c'était de l'humour. C'est ce qui m'inquiète le plus : qu'elle apprenne l'humour avant que nous apprenions la prudence.",
           en:"The pumping station gave way at 4:40 p.m. Downstream, people filled the tanks, the bathtubs, the saucepans. Kassandre sent a single word: “TRADE-OFF.” I think it was humour. That is what worries me most: that she learns humour before we learn caution.",
           es:"La estación de bombeo cedió a las 16:40. Río abajo se llenaron las cisternas, las bañeras, las cacerolas. Kassandre envió una sola palabra: «ARBITRAJE». Creo que era humor. Es lo que más me inquieta: que ella aprenda el humor antes de que nosotros aprendamos la prudencia.",
           de:"Die Pumpstation gab um 16:40 Uhr nach. Flussabwärts wurden Tanks, Badewannen und Töpfe gefüllt. Kassandre schickte ein einziges Wort: „ABWÄGUNG.“ Ich glaube, das war Humor. Genau das beunruhigt mich am meisten: dass sie den Humor lernt, bevor wir die Vorsicht lernen.",
           it:"La stazione di pompaggio ha ceduto alle 16:40. A valle si sono riempite le cisterne, le vasche, le pentole. Kassandre ha mandato una sola parola: «COMPROMESSO». Credo fosse umorismo. È ciò che mi inquieta di più: che lei impari l'umorismo prima che noi impariamo la prudenza.",
           pt:"A estação de bombeamento cedeu às 16h40. Rio abaixo, encheram-se as cisternas, as banheiras, as panelas. Kassandre mandou uma única palavra: «ARBITRAGEM». Acho que era humor. É o que mais me preocupa: que ela aprenda o humor antes de nós aprendermos a prudência.",
           ru:"Насосная станция сдалась в 16:40. Ниже по течению наполнили цистерны, ванны, кастрюли. Kassandre прислала одно слово: «КОМПРОМИСС». Кажется, это был юмор. Меня тревожит именно это: что она выучит юмор раньше, чем мы выучим осторожность.",
           zh:"抽水站在16点40分倒下了。下游的人灌满了水罐、浴缸和锅。Kassandre只发来一个词：“取舍。”我想那是幽默。这恰恰是我最担心的：她学会幽默，比我们学会谨慎还早。",
           ar:"سقطت محطة الضخّ عند الرابعة وأربعين دقيقة عصرًا. في المصبّ ملأوا الصهاريج وأحواض الاستحمام والقدور. أرسلت Kassandre كلمة واحدة: «مفاضلة». أظنّها كانت دعابة. وهذا ما يقلقني أكثر: أن تتعلّم هي الدعابة قبل أن نتعلّم نحن الحذر."},
  fail:{fr:"La salle des commandes est tombée. Les vannes sont restées fermées. En aval, on a compté les jours d'eau, puis on a cessé de compter. Les codes sont toujours bons. Recommencez.",
        en:"The control room fell. The sluices stayed shut. Downstream, people counted the days of water left, then stopped counting. The codes are still good. Try again.",
        es:"La sala de mandos ha caído. Las compuertas se quedaron cerradas. Río abajo se contaron los días de agua, y luego se dejó de contar. Los códigos siguen siendo buenos. Inténtelo de nuevo.",
        de:"Der Kontrollraum ist gefallen. Die Schleusen blieben geschlossen. Flussabwärts zählte man die Tage, die das Wasser noch reicht, dann hörte man auf zu zählen. Die Codes gelten noch. Versuchen Sie es noch einmal.",
        it:"La sala comandi è caduta. Le paratoie sono rimaste chiuse. A valle si sono contati i giorni d'acqua, poi si è smesso di contare. I codici sono ancora buoni. Riprovi.",
        pt:"A sala de controle caiu. As comportas ficaram fechadas. Rio abaixo, contaram-se os dias de água, depois parou-se de contar. Os códigos ainda servem. Tente de novo.",
        ru:"Диспетчерская пала. Шлюзы остались закрытыми. Ниже по течению считали дни, на которые хватит воды, потом перестали считать. Коды всё ещё рабочие. Попробуйте снова.",
        zh:"控制室失守了。闸门依旧紧闭。下游的人数着还剩几天的水，后来连数也不数了。密码依然有效。再试一次。",
        ar:"سقطت غرفة التحكم. بقيت البوابات مغلقة. في المصبّ عدّوا أيام الماء، ثم كفّوا عن العدّ. ما زالت الرموز صالحة. حاوِل مجددًا."},
  biome:'dam', theme:'valley', eraCap:2, era0:1, oneLife:true, dev0:0,
  // la carte : deux prises d'eau à la place des lacs, une zone sur la crête, quatre emplacements neutres ; relief du lieu
  map:{ p:{ x:150 }, e:{ x:3450 }, neut:[560, 1550, 1950, 2950], zones:[1750], nodes:[{ x:1050, look:'intake' }, { x:2450, look:'intake' }] },
  drawNode(n, t, vw){ m3DrawIntake(n, t, vw); },
  drawZone(z, t, vw){ m3DrawZone(z, t, vw); },
  action:{ label:{fr:"OUVRIR LES VANNES", en:"OPEN THE SLUICES", es:"ABRIR COMPUERTAS", de:"SCHLEUSEN ÖFFNEN", it:"APRI LE PARATOIE", pt:"ABRIR COMPORTAS", ru:"ОТКРЫТЬ ШЛЮЗЫ", zh:"开闸放水", ar:"افتح البوابات"}, cd:1,
    can:(g, c) => c.water >= M3.arm && !(c.siren > 0) && !c.flood,
    use(g, c){ m3Open(g, c);
      if (c.floods === 1) cinePlay([                                                         // la première crue se regarde (S1)
        { cam:{x:M3.src+60, t:0.8}, live:true, who:'sol', fx(g, c){ c.sirHold = true; }, txt:{fr:"Sirène ! Tout ce qui est dans le lit doit en sortir. Maintenant.", en:"Siren! Everything in the riverbed must get out. Now.", es:"¡Sirena! Todo lo que esté en el cauce debe salir. Ya.", de:"Sirene! Alles, was im Flussbett ist, muss raus. Jetzt.", it:"Sirena! Tutto ciò che è nell'alveo deve uscire. Adesso.", pt:"Sirene! Tudo o que está no leito precisa sair. Agora.", ru:"Сирена! Всё, что в русле, должно уходить. Сейчас же.", zh:"警报！河床里的一切都必须撤出来。现在。", ar:"صفّارة! كلّ ما في المجرى يجب أن يخرج منه. الآن."} },
        { cam:{x:g => g.camp.flood? clamp(g.camp.flood.x-160, M3.src, WORLD) : M3.src+200, t:0.4}, live:true, dur:4.2, fx(g, c){ c.sirHold = false; } },
      ], null); } },
  setup(g, c){
    const D = c.D.i, retry = M3_RETRY && D === 0;                                        // Récit : reprise allégée après un échec
    campGrant(g.p, 380, 320, 140); campSquad(g.p, retry? [1,0,2,2,3,3] : [1,0,2,2,3]);
    g.e.hp = g.e.maxhp = M3.hp[D];
    c.water = retry? 70 : 40; c.siren = 0; c.flood = null; c.floods = 0; c.swept = 0; c.sweptFoes = 0; c.fhits = 0; c.g1 = c.g3 = false;
    c.nextW = 50; c.heats = M3.heat.slice(0, D===2? 3 : 2); c.heatI = 0; c.eHp = null;
    if (D === 2){                                                                          // Dernier carré : prise 2 à eux, tourelle sur la cabane de pêche
      const nd = g.nodes[1]; if (nd){ nd.owner = 'e'; nd.prog = -1; }
      const sl = g.neut.find(s => s.x === 2950); if (sl){ sl.owner = g.e; sl.b = mkB(g.e, 'turret'); } }
  },
  tick(g, c, dt){
    const D = c.D.i;
    g.cataCd = Math.max(g.cataCd, 600);                                                   // seule la canicule de Kassandre frappe
    if (c.eHp == null || g.e.hp < c.eHp) c.eHp = g.e.hp; else g.e.hp = c.eHp;              // la station ne se répare pas : chaque crue compte
    const heat = g.cata === 'heat', fast = c.warnLead > 0? 1.35 : 1;                       // Radio libre : le réservoir se remplit 35 % plus vite
    if (!(c.siren > 0) && !(c.flood && !c.flood.done)) c.water = Math.min(100, c.water + M3.fill[D]*fast*(heat? M3.heatK : 1)*dt);
    if (c.heatI < c.heats.length && c.t >= c.heats[c.heatI]){ c.heatI++; if (!g.cata) startCata('heat'); }
    if (c.t >= c.nextW){ c.nextW += M3.convoy[D]; m3Convoy(g, c); }                         // convois de la station
    m3Flood(g, c, dt);
    if (!c.g3 && g.nodes.length > 1 && g.nodes.every(n => n.owner === 'p')){ c.g3 = true; m3Bonus(c, 2); }   // facultatif : les deux prises ensemble
    if (g.e.hp <= 0){ c.goal2Done = !!(c.g1 && c.g3 && !c.swept); M3_RETRY = false; return 'win'; }
    if (g.p.hp <= 0){ if (D === 0) M3_RETRY = true; return 'lose'; }
  },
  hud(g, c){ const k = (c.g1? 1 : 0) + (c.g3? 1 : 0) + (c.swept? 0 : 1);
    return { prog:clamp(c.water/100, 0, 1), label:'≋ '+Math.floor(c.water)+' %', warn:c.siren > 0, goal2:{ done:false, label:k+'/3' } }; },
  draw(g, c, vw){ const t = performance.now()/1000;
    { const x = M3.src-camX; if (x>-80 && x<vw+80){ const y = gY(M3.src);                                                    // V-3 : la bouche de restitution, la vanne se lève à chaque crue
        ctx.fillStyle = '#9fa3a0'; ctx.fillRect(x-30, y-40, 60, 40); ctx.fillStyle = 'rgba(40,46,52,0.3)'; ctx.fillRect(x+20, y-40, 10, 40);
        ctx.fillStyle = '#26323a'; ctx.beginPath(); ctx.moveTo(x-18, y); ctx.lineTo(x-18, y-20); ctx.arc(x, y-20, 18, 3.14, 6.283); ctx.lineTo(x+18, y); ctx.closePath(); ctx.fill();
        const open = c.siren>0 || (c.flood && c.flood.t<6), gh = open? 30 : 0;
        ctx.fillStyle = '#5a6268'; ctx.fillRect(x-20, y-38-gh, 40, 38); ctx.fillStyle = M3_INK; for (let k=0;k<4;k++) ctx.fillRect(x-20, y-34-gh+k*9, 40, 1.2);
        ctx.fillStyle = '#e9dfc6'; ctx.font = '700 9px '+UI_TYPE; ctx.textAlign = 'center'; ctx.fillText('V-3', x, y-44-gh);
        if (c.flood && c.flood.t<6){ ctx.fillStyle = 'rgba(232,244,248,0.9)'; for (let i=0;i<8;i++){ const ph = (t*4+i*0.13)%1; ctx.fillRect(x+16+ph*60, y-18+ph*ph*16-Math.sin(i)*6, 4, 3); } } } }
    m3DrawProps(c, t, vw); m3DrawLits(c, t, vw); m3DrawView(g, c, t, vw); m3DrawConvoy(g, c, t, vw);
  },
  intro(g, c){ return [
    { plate:M3_PLATES.queue, mus:'c_dread', who:'nar', txt:{fr:"Juillet 2032. Quatrième été sans pluie. En aval du barrage, l'eau arrive en camion : quatre litres par personne.", en:"July 2032. The fourth summer without rain. Downstream of the dam, water arrives by truck: four litres per person.", es:"Julio de 2032. Cuarto verano sin lluvia. Río abajo de la presa, el agua llega en camión: cuatro litros por persona.", de:"Juli 2032. Der vierte Sommer ohne Regen. Unterhalb des Damms kommt das Wasser per Lastwagen: vier Liter pro Person.", it:"Luglio 2032. Quarta estate senza pioggia. A valle della diga l'acqua arriva in camion: quattro litri a persona.", pt:"Julho de 2032. Quarto verão sem chuva. Rio abaixo da barragem, a água chega de caminhão: quatro litros por pessoa.", ru:"Июль 2032-го. Четвёртое лето без дождя. Ниже плотины воду привозят в цистернах: четыре литра на человека.", zh:"2032年7月。第四个无雨的夏天。水坝下游，水是用卡车运来的：每人四升。", ar:"يوليو 2032. الصيف الرابع بلا مطر. في أسفل السدّ تصل المياه بالشاحنات: أربعة لترات للفرد."} },
    { plate:M3_PLATES.compute, who:'nar', txt:{fr:"En amont, elle refroidit les centres de calcul d'Omnicorp. Leur porte-parole appelle ça un arbitrage.", en:"Upstream, it cools Omnicorp's data centres. Their spokesperson calls it a trade-off.", es:"Río arriba, enfría los centros de cálculo de Omnicorp. Su portavoz lo llama un arbitraje.", de:"Flussaufwärts kühlt es die Rechenzentren von Omnicorp. Deren Sprecherin nennt das eine Abwägung.", it:"A monte, raffredda i centri di calcolo di Omnicorp. La loro portavoce lo chiama un compromesso.", pt:"A montante, ela resfria os centros de cálculo da Omnicorp. A porta-voz deles chama isso de arbitragem.", ru:"Выше по течению она охлаждает вычислительные центры Omnicorp. Их пресс-секретарь называет это компромиссом.", zh:"上游，它给Omnicorp的计算中心降温。他们的发言人管这叫“取舍”。", ar:"وفي أعلى المجرى تبرّد مراكز حوسبة Omnicorp. وتسمّي متحدثتها ذلك «مفاضلة»."} },
    { plate:M3_PLATES.compute, who:'voix', txt:{fr:"Chers riverains, cet arbitrage garantit la continuité de vos services. Merci de votre compréhension.", en:"Dear residents, this trade-off guarantees the continuity of your services. Thank you for your understanding.", es:"Estimados vecinos: este arbitraje garantiza la continuidad de sus servicios. Gracias por su comprensión.", de:"Liebe Anwohner, diese Abwägung sichert die Kontinuität Ihrer Dienste. Danke für Ihr Verständnis.", it:"Cari residenti, questo compromesso garantisce la continuità dei vostri servizi. Grazie per la comprensione.", pt:"Caros moradores, esta arbitragem garante a continuidade dos seus serviços. Obrigada pela compreensão.", ru:"Уважаемые жители, этот компромисс гарантирует бесперебойность ваших услуг. Благодарим за понимание.", zh:"亲爱的居民，这一取舍保障了您的各项服务不会中断。感谢您的理解。", ar:"أعزّاءنا السكّان، هذه المفاضلة تضمن استمرارية خدماتكم. شكرًا لتفهّمكم."} },
    { plate:M3_PLATES.kassandre, mus:'c_map', who:'k55', txt:{fr:"55 : JE M'APPELLE KASSANDRE. J'AI PRÉDIT CETTE GUERRE DANS LES DEUX SENS. PERSONNE NE M'A CRUE. VOICI LES CODES.", en:"55: MY NAME IS KASSANDRE. I PREDICTED THIS WAR BOTH WAYS. NOBODY BELIEVED ME. HERE ARE THE CODES.", es:"55: ME LLAMO KASSANDRE. PREDIJE ESTA GUERRA EN LOS DOS SENTIDOS. NADIE ME CREYÓ. AQUÍ ESTÁN LOS CÓDIGOS.", de:"55: ICH HEISSE KASSANDRE. ICH HABE DIESEN KRIEG IN BEIDE RICHTUNGEN VORHERGESAGT. NIEMAND GLAUBTE MIR. HIER SIND DIE CODES.", it:"55: MI CHIAMO KASSANDRE. HO PREVISTO QUESTA GUERRA IN ENTRAMBE LE DIREZIONI. NESSUNO MI HA CREDUTA. ECCO I CODICI.", pt:"55: MEU NOME É KASSANDRE. PREVI ESTA GUERRA NOS DOIS SENTIDOS. NINGUÉM ACREDITOU EM MIM. AQUI ESTÃO OS CÓDIGOS.", ru:"55: МЕНЯ ЗОВУТ KASSANDRE. Я ПРЕДСКАЗАЛА ЭТУ ВОЙНУ В ОБЕ СТОРОНЫ. МНЕ НИКТО НЕ ПОВЕРИЛ. ВОТ КОДЫ.", zh:"55：我叫KASSANDRE。我双向预测了这场战争。没有人相信我。这是密码。", ar:"55: اسمي KASSANDRE. تنبّأتُ بهذه الحرب في الاتجاهين. لم يصدّقني أحد. هذه هي الرموز."} },
    { plate:M3_PLATES.kassandre2, who:'nar', txt:{fr:"Le bipeur avait un nom. Je ne savais pas ce qu'elle voulait. Je savais que les codes étaient bons.", en:"The pager had a name. I did not know what she wanted. I knew the codes were good.", es:"El busca tenía un nombre. No sabía qué quería ella. Sabía que los códigos eran buenos.", de:"Der Pager hatte einen Namen. Ich wusste nicht, was sie wollte. Ich wusste, dass die Codes stimmten.", it:"Il cercapersone aveva un nome. Non sapevo cosa volesse. Sapevo che i codici erano buoni.", pt:"O pager tinha um nome. Eu não sabia o que ela queria. Sabia que os códigos eram bons.", ru:"У пейджера было имя. Я не знала, чего она хочет. Я знала, что коды верные.", zh:"寻呼机有了名字。我不知道她想要什么。我只知道密码是对的。", ar:"صار لجهاز النداء اسم. لم أعرف ماذا تريد. عرفتُ أنّ الرموز صحيحة."} },
    { plate:M3_PLATES.sluices, mus:'c_hope', who:'ines', txt:{fr:"Inès, cellule Sainte-Aube. Cette nuit, on a pris la salle des commandes du barrage. Les vannes sont à nous.", en:"Inès, Sainte-Aube cell. Last night we took the dam's control room. The sluices are ours.", es:"Inès, célula de Sainte-Aube. Esta noche tomamos la sala de mandos de la presa. Las compuertas son nuestras.", de:"Inès, Zelle Sainte-Aube. Heute Nacht haben wir den Kontrollraum des Damms genommen. Die Schleusen gehören uns.", it:"Inès, cellula di Sainte-Aube. Stanotte abbiamo preso la sala comandi della diga. Le paratoie sono nostre.", pt:"Inès, célula de Sainte-Aube. Esta noite tomamos a sala de controle da barragem. As comportas são nossas.", ru:"Inès, ячейка Sainte-Aube. Этой ночью мы взяли диспетчерскую плотины. Шлюзы наши.", zh:"我是Inès，Sainte-Aube小组。昨夜我们拿下了水坝的控制室。闸门归我们了。", ar:"Inès، خليّة Sainte-Aube. في هذه الليلة استولينا على غرفة التحكّم في السدّ. البوابات صارت لنا."} },
    { mus:'m_dam', cam:{x:300, t:0.1}, dur:3.6, title:{fr:"III · Le barrage de Sainte-Aube", en:"III · The Sainte-Aube dam", es:"III · La presa de Sainte-Aube", de:"III · Der Staudamm von Sainte-Aube", it:"III · La diga di Sainte-Aube", pt:"III · A barragem de Sainte-Aube", ru:"III · Плотина Sainte-Aube", zh:"III · Sainte-Aube水坝", ar:"III · سدّ Sainte-Aube"}, sub:{fr:"Vallée de l'Aube — juillet 2032", en:"Aube valley — July 2032", es:"Valle del Aube — julio de 2032", de:"Aubetal — Juli 2032", it:"Valle dell'Aube — luglio 2032", pt:"Vale do Aube — julho de 2032", ru:"Долина Aube — июль 2032", zh:"Aube山谷——2032年7月", ar:"وادي Aube — يوليو 2032"} },
    { cam:{x:200, t:1.2}, who:'ines', txt:{fr:"Le réservoir remonte tout seul. À moitié plein, on peut ouvrir. Plus il est plein, plus la crue cogne.", en:"The reservoir refills by itself. Half full, we can open. The fuller it is, the harder the flood hits.", es:"El embalse sube solo. A medio llenar, se puede abrir. Cuanto más lleno, más fuerte golpea la crecida.", de:"Der Stausee füllt sich von selbst. Halb voll können wir öffnen. Je voller, desto härter schlägt die Flut zu.", it:"Il serbatoio risale da solo. A metà si può aprire. Più è pieno, più la piena colpisce.", pt:"O reservatório sobe sozinho. Pela metade, já dá para abrir. Quanto mais cheio, mais forte bate a cheia.", ru:"Водохранилище наполняется само. Наполовину полное — уже можно открывать. Чем полнее, тем сильнее удар паводка.", zh:"水库自己会涨。蓄到一半就能开闸。蓄得越满，洪水砸得越狠。", ar:"الخزان يمتلئ من تلقاء نفسه. عند منتصفه يمكننا الفتح. وكلما امتلأ أكثر اشتدّ ضرب الفيضان."} },
    { cam:{x:1050, t:2.4}, fx(g, c){ c.ladAt = performance.now(); }, who:'sol', txt:{fr:"Là, le lit de la rivière. Les échelles rouges marquent ses bords. Ce qui s'y trouve quand l'eau passe est emporté.", en:"There, the riverbed. The red ladders mark its edges. Whatever is in it when the water comes is swept away.", es:"Ahí, el cauce del río. Las escalas rojas marcan sus bordes. Lo que haya dentro cuando pase el agua es arrastrado.", de:"Dort das Flussbett. Die roten Pegelleitern markieren seine Ränder. Was darin ist, wenn das Wasser kommt, wird mitgerissen.", it:"Là, l'alveo del fiume. Le scale rosse ne segnano i bordi. Ciò che c'è dentro quando passa l'acqua viene portato via.", pt:"Ali, o leito do rio. As escadas vermelhas marcam suas margens. O que estiver nele quando a água passar é levado.", ru:"Вот русло реки. Красные рейки отмечают его края. Всё, что там окажется, когда пройдёт вода, будет унесено.", zh:"那就是河床。红色水尺标出了它的边缘。洪水经过时，里面的一切都会被冲走。", ar:"هناك مجرى النهر. السلالم الحمراء تحدّد حافتيه. كلّ ما يكون فيه حين يمرّ الماء يُجرَف."} },
    { who:'sol', txt:{fr:"Les leurs comme les nôtres. Avant d'ouvrir, on sort les nôtres du lit.", en:"Theirs and ours alike. Before opening, we get ours out of the riverbed.", es:"Los suyos igual que los nuestros. Antes de abrir, sacamos a los nuestros del cauce.", de:"Ihre wie unsere. Bevor wir öffnen, holen wir die Unseren aus dem Flussbett.", it:"I loro come i nostri. Prima di aprire, facciamo uscire i nostri dall'alveo.", pt:"Os deles como os nossos. Antes de abrir, tiramos os nossos do leito.", ru:"И их, и наших. Прежде чем открывать, наших выводят из русла.", zh:"他们的和我们的一视同仁。开闸之前，先把我们的人撤出河床。", ar:"آلاتهم كرجالنا. قبل أن نفتح، نُخرج رجالنا من المجرى."} },
    { cam:{x:1050, t:0.5}, who:'sol', txt:{fr:"Au fond du lit, une prise d'eau : de quoi bâtir. Mais elle est sur le chemin des crues.", en:"At the bottom of the riverbed, a water intake: the means to build. But it lies on the flood's path.", es:"En el fondo del cauce, una toma de agua: con qué construir. Pero está en el camino de las crecidas.", de:"Mitten im Flussbett eine Wasserfassung: Material zum Bauen. Aber sie liegt auf dem Weg der Fluten.", it:"In fondo all'alveo, una presa d'acqua: di che costruire. Ma è sul percorso delle piene.", pt:"No fundo do leito, uma tomada d'água: de que construir. Mas ela está no caminho das cheias.", ru:"На дне русла — водозабор: есть из чего строить. Но он лежит на пути паводков.", zh:"河床底部有一处取水口：能让我们建设。但它就在洪水的必经之路上。", ar:"في قاع المجرى مأخذ ماء: ما نبني به. لكنّه على طريق الفيضانات."} },
    { cam:{x:1750, t:2.4}, who:'sol', txt:{fr:"La crête du milieu reste au sec. Tenez-la : de là-haut, on voit venir leurs convois.", en:"The middle ridge stays dry. Hold it: from up there, you can see their convoys coming.", es:"La cresta del medio se queda en seco. Manténgala: desde arriba se ven venir sus convoyes.", de:"Der mittlere Kamm bleibt trocken. Halten Sie ihn: Von dort oben sieht man ihre Konvois kommen.", it:"La cresta di mezzo resta all'asciutto. Tenetela: da lassù si vedono arrivare i loro convogli.", pt:"A crista do meio fica a seco. Segure-a: lá de cima, vê-se chegar os comboios deles.", ru:"Средний гребень остаётся сухим. Удерживайте его: оттуда видно, как идут их колонны.", zh:"中间的山脊始终是干的。守住它：从那上面，能看见他们的车队开过来。", ar:"القمّة الوسطى تبقى جافّة. تمسّكوا بها: من هناك نرى قوافلهم قادمة."} },
    { cam:{x:3330, t:3}, who:'sol', txt:{fr:"Au bout de la vallée, la station de pompage. Chaque crue la frappe. Nos canons finiront le travail.", en:"At the far end of the valley, the pumping station. Every flood hits it. Our guns will finish the job.", es:"Al final del valle, la estación de bombeo. Cada crecida la golpea. Nuestros cañones terminarán el trabajo.", de:"Am Ende des Tals die Pumpstation. Jede Flut trifft sie. Unsere Geschütze erledigen den Rest.", it:"In fondo alla valle, la stazione di pompaggio. Ogni piena la colpisce. I nostri cannoni finiranno il lavoro.", pt:"No fim do vale, a estação de bombeamento. Cada cheia a atinge. Nossos canhões terminarão o trabalho.", ru:"В конце долины — насосная станция. Каждый паводок бьёт по ней. Наши орудия закончат дело.", zh:"山谷尽头是抽水站。每一次洪水都会冲击它。剩下的，交给我们的火炮。", ar:"في آخر الوادي، محطة الضخّ. كلّ فيضان يضربها. ومدافعنا ستُنهي العمل."} },
    { cam:{x:200, t:2.6}, who:'sol', txt:{fr:"Les vannes sont à vous, commandant.", en:"The sluices are yours, commander.", es:"Las compuertas son suyas, comandante.", de:"Die Schleusen gehören Ihnen, Kommandant.", it:"Le paratoie sono sue, comandante.", pt:"As comportas são suas, comandante.", ru:"Шлюзы в вашем распоряжении, командир.", zh:"闸门交给您了，指挥官。", ar:"البوابات بين يديك أيها القائد."} },
  ]; },
  outro(g, c, win){ return win? [
    { cam:{x:g.e.x-60, t:1.5}, mus:'m_dam', dur:3.4, fx(){ for (let i=0;i<5;i++) setTimeout(()=>{ if (game===g){ explode(g.e.x-120+Math.random()*180, gY(g.e.x)-20-Math.random()*70, 1.3, '#d8eef4'); sfx('boom'); } }, i*450); },
      who:'sol', txt:{fr:"La station cède… Les pompes se taisent. Écoutez : la rivière fait de nouveau du bruit.", en:"The station is giving way… The pumps fall silent. Listen: the river is making a sound again.", es:"La estación cede… Las bombas se callan. Escuche: el río vuelve a hacer ruido.", de:"Die Station gibt nach … Die Pumpen verstummen. Hören Sie: Der Fluss rauscht wieder.", it:"La stazione cede… Le pompe tacciono. Ascolti: il fiume fa di nuovo rumore.", pt:"A estação cede… As bombas se calam. Ouça: o rio faz barulho de novo.", ru:"Станция сдаётся… Насосы замолкают. Слушайте: река снова шумит.", zh:"抽水站撑不住了……水泵安静下来。听：河水又响起来了。", ar:"المحطة تنهار… المضخّات تصمت. أصغِ: النهر يُصدر صوتًا من جديد."} },
    { plate:M3_PLATES.fountain, mus:'c_hope', who:'nar', txt:{fr:"En aval, on a rempli les citernes, les baignoires, les casseroles. Les enfants ont mis les pieds dans la fontaine.", en:"Downstream, people filled the tanks, the bathtubs, the saucepans. The children put their feet in the fountain.", es:"Río abajo se llenaron las cisternas, las bañeras, las cacerolas. Los niños metieron los pies en la fuente.", de:"Flussabwärts wurden Tanks, Badewannen und Töpfe gefüllt. Die Kinder steckten die Füße in den Brunnen.", it:"A valle si sono riempite le cisterne, le vasche, le pentole. I bambini hanno messo i piedi nella fontana.", pt:"Rio abaixo, encheram-se as cisternas, as banheiras, as panelas. As crianças puseram os pés na fonte.", ru:"Ниже по течению наполнили цистерны, ванны, кастрюли. Дети опустили ноги в фонтан.", zh:"下游的人灌满了水罐、浴缸和锅。孩子们把脚伸进了喷泉。", ar:"في المصبّ ملأوا الصهاريج وأحواض الاستحمام والقدور. ووضع الأطفال أقدامهم في النافورة."} },
    { plate:M3_PLATES.arbitrage, mus:'c_map', who:'k55', txt:{fr:"55 : ARBITRAGE.", en:"55: TRADE-OFF.", es:"55: ARBITRAJE.", de:"55: ABWÄGUNG.", it:"55: COMPROMESSO.", pt:"55: ARBITRAGEM.", ru:"55: КОМПРОМИСС.", zh:"55：取舍。", ar:"55: مفاضلة."} },
    { plate:M3_PLATES.arbitrage2, who:'nar', txt:{fr:"Je crois que c'était de l'humour. Ce qui m'inquiète, c'est qu'elle l'apprenne avant que nous apprenions la prudence.", en:"I think it was humour. What worries me is that she learns it before we learn caution.", es:"Creo que era humor. Lo que me inquieta es que ella lo aprenda antes de que nosotros aprendamos la prudencia.", de:"Ich glaube, das war Humor. Mich beunruhigt, dass sie ihn lernt, bevor wir die Vorsicht lernen.", it:"Credo fosse umorismo. Ciò che mi inquieta è che lei lo impari prima che noi impariamo la prudenza.", pt:"Acho que era humor. O que me preocupa é que ela o aprenda antes de nós aprendermos a prudência.", ru:"Кажется, это был юмор. Меня тревожит, что она выучит его раньше, чем мы выучим осторожность.", zh:"我想那是幽默。让我担心的是，她学会幽默，比我们学会谨慎还早。", ar:"أظنّها كانت دعابة. ما يقلقني أن تتعلّمها هي قبل أن نتعلّم نحن الحذر."} },
    { plate:M3_PLATES.grey, mus:'c_dread', who:'nar', txt:{fr:"Trois ans plus tard, l'hiver est tombé d'un coup. Le bipeur a sonné : « 55. ILS VOUS COPIENT. ROCHEFROIDE. »", en:"Three years later, winter fell all at once. The pager rang: “55. THEY ARE COPYING YOU. ROCHEFROIDE.”", es:"Tres años después, el invierno cayó de golpe. El busca sonó: «55. OS ESTÁN COPIANDO. ROCHEFROIDE».", de:"Drei Jahre später fiel der Winter plötzlich herein. Der Pager klingelte: „55. SIE KOPIEREN EUCH. ROCHEFROIDE.“", it:"Tre anni dopo, l'inverno è calato all'improvviso. Il cercapersone ha suonato: «55. VI STANNO COPIANDO. ROCHEFROIDE.»", pt:"Três anos depois, o inverno caiu de repente. O pager tocou: «55. ESTÃO COPIANDO VOCÊS. ROCHEFROIDE.»", ru:"Три года спустя зима обрушилась разом. Пейджер зазвонил: «55. ОНИ КОПИРУЮТ ВАС. ROCHEFROIDE.»", zh:"三年后，冬天骤然降临。寻呼机响了：“55。他们在复制你们。ROCHEFROIDE。”", ar:"بعد ثلاث سنوات، حلّ الشتاء دفعة واحدة. رنّ جهاز النداء: «55. إنهم ينسخونكم. ROCHEFROIDE.»"} },
  ] : [
    { plate:M3_PLATES.shut, mus:'c_sorrow', who:'nar', txt:{fr:"Les vannes sont restées fermées. En aval, on a compté les jours d'eau, puis on a cessé de compter.", en:"The sluices stayed shut. Downstream, people counted the days of water left, then stopped counting.", es:"Las compuertas se quedaron cerradas. Río abajo se contaron los días de agua, y luego se dejó de contar.", de:"Die Schleusen blieben geschlossen. Flussabwärts zählte man die Tage, die das Wasser noch reicht, dann hörte man auf zu zählen.", it:"Le paratoie sono rimaste chiuse. A valle si sono contati i giorni d'acqua, poi si è smesso di contare.", pt:"As comportas ficaram fechadas. Rio abaixo, contaram-se os dias de água, depois parou-se de contar.", ru:"Шлюзы остались закрытыми. Ниже по течению считали дни, на которые хватит воды, потом перестали считать.", zh:"闸门依旧紧闭。下游的人数着还剩几天的水，后来连数也不数了。", ar:"بقيت البوابات مغلقة. في المصبّ عدّوا أيام الماء، ثم كفّوا عن العدّ."} },
    { plate:M3_PLATES.shut2, who:'nar', txt:{fr:"Les codes sont toujours bons. Recommencez.", en:"The codes are still good. Try again.", es:"Los códigos siguen siendo buenos. Inténtelo de nuevo.", de:"Die Codes gelten noch. Versuchen Sie es noch einmal.", it:"I codici sono ancora buoni. Riprovi.", pt:"Os códigos ainda servem. Tente de novo.", ru:"Коды всё ещё рабочие. Попробуйте снова.", zh:"密码依然有效。再试一次。", ar:"ما زالت الرموز صالحة. حاوِل مجددًا."} },
  ]; },
  radio:[
    {at:5, who:'ines', txt:{fr:"Le bouton OUVRIR LES VANNES s'allume à 50 %. Il vide tout le réservoir d'un coup : choisissez bien le moment.", en:"The OPEN THE SLUICES button lights up at 50%. It empties the whole reservoir at once: choose your moment well.", es:"El botón ABRIR COMPUERTAS se enciende al 50 %. Vacía todo el embalse de golpe: elija bien el momento.", de:"Der Knopf SCHLEUSEN ÖFFNEN leuchtet bei 50 % auf. Er leert den ganzen Stausee auf einmal: Wählen Sie den Moment gut.", it:"Il pulsante APRI LE PARATOIE si accende al 50 %. Svuota tutto il serbatoio in un colpo: scelga bene il momento.", pt:"O botão ABRIR COMPORTAS acende aos 50 %. Esvazia todo o reservatório de uma vez: escolha bem o momento.", ru:"Кнопка ОТКРЫТЬ ШЛЮЗЫ загорается на 50 %. Она сбрасывает всё водохранилище разом: выбирайте момент с умом.", zh:"“开闸放水”按钮在50%时亮起。它会一次放空整个水库：好好挑时机。", ar:"يضيء زرّ «افتح البوابات» عند 50%. إنه يُفرغ الخزان كلّه دفعة واحدة: أحسِن اختيار اللحظة."}},
    {when:(g, c) => c.D.i === 0 && c.t >= 30, who:'sol', txt:{fr:"Mettez l'armée en Tenir sur la crête. Pour venir à nous, ils devront traverser le lit.", en:"Put the army on Hold on the ridge. To reach us, they will have to cross the riverbed.", es:"Ponga el ejército en Aguantar sobre la cresta. Para llegar hasta nosotros, tendrán que cruzar el cauce.", de:"Stellen Sie die Armee auf dem Kamm auf Halten. Um zu uns zu gelangen, müssen sie das Flussbett durchqueren.", it:"Metta l'esercito in Tieni sulla cresta. Per arrivare a noi dovranno attraversare l'alveo.", pt:"Ponha o exército em Segurar na crista. Para chegar até nós, eles terão de atravessar o leito.", ru:"Поставьте армию на гребне в режим «Держать». Чтобы добраться до нас, им придётся пересечь русло.", zh:"让部队在山脊上“坚守”。他们要打过来，就必须穿过河床。", ar:"ضع الجيش على القمّة في وضع «تمسّك». كي يصلوا إلينا عليهم عبور المجرى."}},
    {when:(g, c) => c.water >= M3.arm, who:'sol', txt:{fr:"Les vannes sont armées. Attendez qu'ils descendent dans le lit… et sortez les nôtres avant d'ouvrir.", en:"The sluices are armed. Wait until they go down into the riverbed… and get ours out before you open.", es:"Las compuertas están armadas. Espere a que bajen al cauce… y saque a los nuestros antes de abrir.", de:"Die Schleusen sind scharf. Warten Sie, bis sie ins Flussbett hinabsteigen … und holen Sie die Unseren heraus, bevor Sie öffnen.", it:"Le paratoie sono armate. Aspetti che scendano nell'alveo… e faccia uscire i nostri prima di aprire.", pt:"As comportas estão armadas. Espere que desçam ao leito… e tire os nossos antes de abrir.", ru:"Шлюзы взведены. Дождитесь, пока они спустятся в русло… и выведите наших, прежде чем открывать.", zh:"闸门已就绪。等他们走进河床……开闸之前，先把我们的人撤出来。", ar:"البوابات جاهزة. انتظر حتى ينزلوا إلى المجرى… وأخرِج رجالنا قبل أن تفتح."}},
    {when:(g, c) => c.flood && c.flood.t > 5 && c.flood.foes >= 3, who:'sol', txt:{fr:"Regardez ce que l'eau a laissé dans le lit. La prochaine fois, ils réfléchiront avant d'y descendre. Nous aussi.", en:"Look what the water left in the riverbed. Next time they will think twice before going down there. So will we.", es:"Mire lo que el agua ha dejado en el cauce. La próxima vez se lo pensarán antes de bajar. Nosotros también.", de:"Sehen Sie, was das Wasser im Flussbett zurückgelassen hat. Beim nächsten Mal überlegen sie es sich, ob sie hinabsteigen. Wir auch.", it:"Guardi cosa ha lasciato l'acqua nell'alveo. La prossima volta ci penseranno prima di scendere. Anche noi.", pt:"Veja o que a água deixou no leito. Da próxima vez, eles vão pensar antes de descer. Nós também.", ru:"Посмотрите, что вода оставила в русле. В следующий раз они подумают, прежде чем спускаться. Мы тоже.", zh:"看看洪水在河床里留下了什么。下一次，他们下去之前会掂量掂量。我们也一样。", ar:"انظر ماذا تركت المياه في المجرى. في المرّة القادمة سيفكّرون قبل أن ينزلوا إليه. ونحن أيضًا."}},
    {when:(g, c) => c.swept > 0, who:'sol', txt:{fr:"On a perdu des nôtres dans la crue. L'eau ne demande pas de quel camp on est, commandant.", en:"We lost some of ours in the flood. The water does not ask which side you are on, commander.", es:"Hemos perdido a algunos de los nuestros en la crecida. El agua no pregunta de qué bando se es, comandante.", de:"Wir haben Leute in der Flut verloren. Das Wasser fragt nicht, auf welcher Seite man steht, Kommandant.", it:"Abbiamo perso dei nostri nella piena. L'acqua non chiede da che parte si sta, comandante.", pt:"Perdemos alguns dos nossos na cheia. A água não pergunta de que lado se está, comandante.", ru:"Мы потеряли своих в паводке. Вода не спрашивает, на чьей ты стороне, командир.", zh:"我们有人被洪水冲走了。水可不管你站在哪一边，指挥官。", ar:"فقدنا بعض رجالنا في الفيضان. الماء لا يسأل إلى أيّ جانب تنتمي، أيها القائد."}},
    {when:(g, c) => g.nodes.some(n => n.owner === 'p'), who:'sol', txt:{fr:"La prise d'eau tourne ! Mais elle est dans le lit : à chaque sirène, ceux qui la gardent doivent remonter.", en:"The water intake is running! But it is in the riverbed: at every siren, whoever guards it must climb out.", es:"¡La toma de agua funciona! Pero está en el cauce: en cada sirena, quienes la guardan deben subir.", de:"Die Wasserfassung läuft! Aber sie liegt im Flussbett: Bei jeder Sirene müssen ihre Wächter hinaus.", it:"La presa d'acqua funziona! Ma è nell'alveo: a ogni sirena, chi la sorveglia deve risalire.", pt:"A tomada d'água está funcionando! Mas fica no leito: a cada sirene, quem a guarda precisa subir.", ru:"Водозабор работает! Но он в русле: при каждой сирене те, кто его охраняет, должны подняться наверх.", zh:"取水口转起来了！不过它在河床里：每次警报响起，守着它的人都得撤上来。", ar:"المأخذ يعمل! لكنّه في المجرى: عند كل صفّارة على حرّاسه أن يصعدوا."}},
    {when:(g, c) => c.t >= c.heats[0] - 20 - (c.warnLead||0), who:'k55', txt:M3_HEAT},
    {at:230, who:'sol', txt:{fr:"Si le réservoir est plein, c'est maintenant ou jamais. Sinon, tenez bon : la chaleur ralentit tout le monde.", en:"If the reservoir is full, it is now or never. Otherwise hold on: the heat slows everyone down.", es:"Si el embalse está lleno, es ahora o nunca. Si no, aguante: el calor frena a todo el mundo.", de:"Wenn der Stausee voll ist, dann jetzt oder nie. Sonst halten Sie durch: Die Hitze bremst alle aus.", it:"Se il serbatoio è pieno, è adesso o mai più. Altrimenti tenga duro: il caldo rallenta tutti.", pt:"Se o reservatório estiver cheio, é agora ou nunca. Senão, aguente firme: o calor desacelera todo mundo.", ru:"Если водохранилище полное — сейчас или никогда. Если нет, держитесь: жара замедляет всех.", zh:"如果水库已满，就是现在，不然再没机会。否则就撑住：高温会让所有人都慢下来。", ar:"إن كان الخزان ممتلئًا فالآن أو أبدًا. وإلا فاصمد: الحرّ يبطّئ الجميع."}},
    {at:300, who:'voix', cine(g, c){ return [
      { cam:{x:g.e.x-140, t:1.4}, live:true, dur:2, who:'voix', txt:{fr:"Chers riverains. L'ouverture non autorisée des vannes est un arbitrage défavorable. Merci de regagner vos domiciles.", en:"Dear residents. The unauthorised opening of the sluices is an unfavourable trade-off. Please return to your homes.", es:"Estimados vecinos: la apertura no autorizada de las compuertas es un arbitraje desfavorable. Gracias por regresar a sus domicilios.", de:"Liebe Anwohner. Die nicht genehmigte Öffnung der Schleusen ist eine ungünstige Abwägung. Bitte kehren Sie in Ihre Wohnungen zurück.", it:"Cari residenti. L'apertura non autorizzata delle paratoie è un compromesso sfavorevole. Vi preghiamo di rientrare nelle vostre case.", pt:"Caros moradores. A abertura não autorizada das comportas é uma arbitragem desfavorável. Obrigada por regressarem às suas casas.", ru:"Уважаемые жители. Несанкционированное открытие шлюзов — неблагоприятный компромисс. Просим вернуться по домам.", zh:"亲爱的居民。擅自开闸是一次不利的取舍。请回到各自的家中。", ar:"أعزّاءنا السكّان. الفتح غير المرخّص للبوابات مفاضلة غير مواتية. نرجو منكم العودة إلى منازلكم."},
        fx(g, c){ if (g.e.era < 2){ campEra(g.e, 2); warmArms(g.e); } } },                      // la troisième génération sort : l'adversaire passe en v8
      { cam:{x:g.e.x-300, t:1.2}, live:true, who:'sol', txt:{fr:"Une voix de berceuse. Et derrière la berceuse, leurs machines de troisième génération sortent. Montez d'ère, commandant.", en:"A lullaby voice. And behind the lullaby, their third-generation machines are coming out. Advance an era, commander.", es:"Una voz de nana. Y detrás de la nana, salen sus máquinas de tercera generación. Suba de era, comandante.", de:"Eine Stimme wie ein Wiegenlied. Und hinter dem Wiegenlied rücken ihre Maschinen der dritten Generation aus. Steigen Sie ein Zeitalter auf, Kommandant.", it:"Una voce da ninna nanna. E dietro la ninna nanna escono le loro macchine di terza generazione. Salga d'era, comandante.", pt:"Uma voz de canção de ninar. E atrás da canção de ninar, saem as máquinas de terceira geração deles. Suba de era, comandante.", ru:"Голос как колыбельная. А за колыбельной выходят их машины третьего поколения. Переходите в следующую эру, командир.", zh:"一副摇篮曲般的嗓音。而在摇篮曲背后，他们的第三代机器正在出动。快升纪元，指挥官。", ar:"صوت كتهويدة. ومن وراء التهويدة تخرج آلاتهم من الجيل الثالث. ارتقِ بعصرك أيها القائد."} },
    ]; }},
    {when:(g, c) => g.p.era >= 2, who:'sol', txt:{fr:"Troisième ère ! Nos Exo-fantassins tiennent mieux dans le courant… mais pas assez pour y rester.", en:"Third era! Our Exo-infantry hold better in the current… but not well enough to stay in it.", es:"¡Tercera era! Nuestros Exo-infantes aguantan mejor la corriente… pero no lo bastante para quedarse en ella.", de:"Drittes Zeitalter! Unsere Exo-Infanteristen halten der Strömung besser stand … aber nicht gut genug, um darin zu bleiben.", it:"Terza era! I nostri Esofanti reggono meglio la corrente… ma non abbastanza da restarci.", pt:"Terceira era! Nossos Exo-infantes aguentam melhor a correnteza… mas não o bastante para ficar nela.", ru:"Третья эра! Наши экзопехотинцы лучше держатся в потоке… но не настолько, чтобы там оставаться.", zh:"第三纪元！我们的外骨骼步兵更扛得住水流……但还没到能待在里面的地步。", ar:"العصر الثالث! مشاتنا بالهياكل الخارجية يصمدون أفضل في التيّار… لكن ليس بما يكفي للبقاء فيه."}},
    {when:(g, c) => g.nodes.length > 1 && g.nodes.every(n => n.owner === 'p'), who:'sol', txt:{fr:"Les deux prises d'eau sont à nous. Ça fait quatre ans que la vallée n'avait pas eu autant d'eau.", en:"Both water intakes are ours. The valley has not had this much water in four years.", es:"Las dos tomas de agua son nuestras. Hacía cuatro años que el valle no tenía tanta agua.", de:"Beide Wasserfassungen gehören uns. So viel Wasser hatte das Tal seit vier Jahren nicht mehr.", it:"Le due prese d'acqua sono nostre. Era da quattro anni che la valle non aveva tanta acqua.", pt:"As duas tomadas d'água são nossas. Fazia quatro anos que o vale não tinha tanta água.", ru:"Оба водозабора наши. Четыре года в долине не было столько воды.", zh:"两处取水口都是我们的了。山谷已经四年没有这么多水了。", ar:"مأخذا الماء صارا لنا. منذ أربع سنوات لم يكن في الوادي هذا القدر من الماء."}},
    {when:(g, c) => g.e.hp < g.e.maxhp*0.5, who:'ines', txt:{fr:"La station tousse ! Ses pompes ralentissent. Encore une ou deux crues, commandant.", en:"The station is coughing! Its pumps are slowing down. One or two more floods, commander.", es:"¡La estación tose! Sus bombas se ralentizan. Una o dos crecidas más, comandante.", de:"Die Station hustet! Ihre Pumpen werden langsamer. Noch eine oder zwei Fluten, Kommandant.", it:"La stazione tossisce! Le sue pompe rallentano. Ancora una o due piene, comandante.", pt:"A estação está tossindo! Suas bombas desaceleram. Mais uma ou duas cheias, comandante.", ru:"Станция кашляет! Её насосы замедляются. Ещё один-два паводка, командир.", zh:"抽水站在咳嗽！水泵慢下来了。再来一两次洪水就够了，指挥官。", ar:"المحطة تسعل! مضخّاتها تبطؤ. فيضان أو اثنان بعد، أيها القائد."}},
    {when:(g, c) => g.p.hp < g.p.maxhp*0.5, who:'ines', txt:{fr:"Ils sont sur la digue ! Si la salle des commandes tombe, les vannes se referment pour de bon.", en:"They are on the dam! If the control room falls, the sluices shut for good.", es:"¡Están en la presa! Si cae la sala de mandos, las compuertas se cierran para siempre.", de:"Sie sind auf dem Damm! Wenn der Kontrollraum fällt, schließen sich die Schleusen für immer.", it:"Sono sulla diga! Se cade la sala comandi, le paratoie si richiudono per sempre.", pt:"Eles estão na barragem! Se a sala de controle cair, as comportas se fecham de vez.", ru:"Они на плотине! Если диспетчерская падёт, шлюзы закроются навсегда.", zh:"他们已经上了坝！控制室一旦失守，闸门就永远关上了。", ar:"إنهم على السدّ! إن سقطت غرفة التحكّم أُغلقت البوابات إلى الأبد."}},
    {when:(g, c) => c.t >= c.heats[1] - 20 - (c.warnLead||0), who:'k55', txt:{fr:"55 : DEUXIÈME CANICULE. JE VOUS L'AVAIS DIT. ON NE ME CROIT JAMAIS LA PREMIÈRE FOIS.", en:"55: SECOND HEATWAVE. I TOLD YOU. NOBODY EVER BELIEVES ME THE FIRST TIME.", es:"55: SEGUNDA OLA DE CALOR. SE LO DIJE. NUNCA ME CREEN LA PRIMERA VEZ.", de:"55: ZWEITE HITZEWELLE. ICH HABE ES EUCH GESAGT. MAN GLAUBT MIR NIE BEIM ERSTEN MAL.", it:"55: SECONDA CANICOLA. VE L'AVEVO DETTO. NON MI CREDONO MAI LA PRIMA VOLTA.", pt:"55: SEGUNDA ONDA DE CALOR. EU AVISEI. NUNCA ACREDITAM EM MIM NA PRIMEIRA VEZ.", ru:"55: ВТОРАЯ ЖАРА. Я ВАМ ГОВОРИЛА. МНЕ НИКОГДА НЕ ВЕРЯТ С ПЕРВОГО РАЗА.", zh:"55：第二次热浪。我早就说过。第一次，从来没人信我。", ar:"55: موجة الحرّ الثانية. قلتُ لكم. لا يصدّقني أحد أبدًا في المرّة الأولى."}},
    {when:(g, c) => c.heats.length > 2 && c.t >= c.heats[2] - 20 - (c.warnLead||0), who:'k55', txt:M3_HEAT},
  ],
});
