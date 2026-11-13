/* ================= CAMPAGNE · MISSION III — LE BARRAGE DE SAINTE-AUBE (v1.15) =================
   La vallée de l'Aube, juillet 2032, lumière froide et nette. Germinal tient le barrage ; en aval,
   la station de pompage d'Omnicorp boit la rivière pour refroidir ses centres de calcul.
   Le relief a deux LITS bas (le lit de la rivière) entre trois HAUTEURS sèches. Le bouton de
   mission ouvre les VANNES : sirène, puis une crue dévale la vallée et balaie tout ce qui se
   trouve dans les lits — les machines comme les nôtres — avant de frapper la station elle-même.
   Le niveau du réservoir est la ressource : il remonte lentement ; plus il est haut, plus la
   crue est forte. Kassandre a donné les codes ; elle annonce aussi la canicule.             */
const M3 = { src:640, low:14, speed:760 };
// relief : sin(x·2π/1400) → hauteurs 0–700 (atténuée par la base), 1400–2100 (la crête), 2800–3500 ; lits entre les deux
const M3_TERRAIN = { a:46, f1:6.2832/1400, b:4, f2:0.0113, c:2, f3:0.021, base:-3 };
function m3Low(x){ return x >= M3.src && GROUND - gY(x) < M3.low; }
DECOR_THEMES.valley = ['rock','rock','pinelet','pinelet','reeds','cairn','rock','pinelet','reeds'];
DECOR_EXTRA.rock = (d, s) => {                                        // rocher éboulé
  ctx.scale(d.flip,1); dShadow(13*s); ctx.fillStyle = '#7a756d'; ctx.beginPath(); ctx.moveTo(-13*s,0); ctx.lineTo(-9*s,-10*s); ctx.lineTo(1*s,-14*s); ctx.lineTo(11*s,-7*s); ctx.lineTo(13*s,0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,250,236,0.22)'; ctx.beginPath(); ctx.moveTo(-9*s,-10*s); ctx.lineTo(1*s,-14*s); ctx.lineTo(-2*s,-6*s); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(31,27,23,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(1*s,-14*s); ctx.lineTo(3*s,-3*s); ctx.stroke();
};
DECOR_EXTRA.pinelet = (d, s, t) => {                                  // jeune pin
  dShadow(8*s); ctx.fillStyle = '#4a3a2a'; ctx.fillRect(-1.2*s,-8*s,2.4*s,8*s); const sw = Math.sin(t*1.1+d.ph)*0.8;
  ctx.fillStyle = '#2f4a40'; for (let i=0;i<3;i++){ const y = -8*s-i*7*s, w = (9-i*2.4)*s; ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(sw*(i+1), y-11*s); ctx.lineTo(w, y); ctx.closePath(); ctx.fill(); }
};
DECOR_EXTRA.reeds = (d, s, t) => {                                    // joncs du lit de la rivière
  ctx.strokeStyle = '#6a7a4a'; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i=0;i<6;i++){ const x = (i-2.5)*3*s, h = (10+((i*7)%5)*3)*s, b = Math.sin(t*1.6+d.ph+i)*2; ctx.moveTo(x,0); ctx.quadraticCurveTo(x+b*0.5,-h*0.6,x+b,-h); }
  ctx.stroke();
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
  id:'dam', music:'dam', amb:{ rain:0.012, wind:0.03, tick:m3Amb },
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

/* ---------- MUSIQUE : « le barrage » — bourdons graves, chœur sans paroles, lent ---------- */
MUSIC_THEMES.dam = { bpm:56, step(st, t, d, s){
  const bar = Math.floor(st/8), s8 = st%8, ch = [[52,55,59],[48,52,55],[55,59,62],[50,54,57]][Math.floor(bar/2)%4];
  if (s8===0 && bar%2===0){ tone(m2f(ch[0]-24), t, d*16, 'sine', .08, 0, d*2); tone(m2f(ch[0]-12)+0.6, t, d*16, 'triangle', .02, 0, d*3, 400); }   // bourdon
  if (s8===0) for (let k=0;k<3;k++){ const n = ch[k]; tone(m2f(n), t, d*8.6, 'sawtooth', .007, 0, d*3, 760+k*90); tone(m2f(n)*1.004, t, d*8.6, 'triangle', .012, 0, d*3.4, 900); }   // le chœur : « aah »
  const m = [64,0,0,0,0,0,62,0, 59,0,0,0,0,0,0,0, 67,0,0,0,66,0,64,0, 62,0,0,0,0,0,0,0][st%32];
  if (m && bar%4>=2) { tone(m2f(m+12), t, d*5, 'triangle', .016, 0, d*1.2, 1400); tone(m2f(m+12)*1.006, t, d*5, 'sine', .01, 0, d*1.4); }      // une voix seule, haut
  if (s>0.3 && s8===4 && bar%2) tone(52, t, .9, 'sine', .07, -14);                        // timbale lointaine quand ça chauffe
  if (game && game.camp && game.camp.siren>0 && s8%2===0) noise(t, .2, .01, 900);
} };

/* ---------- personnages ---------- */
CINE_WHO.voix = { name:{fr:'LA PORTE-PAROLE', en:'THE SPOKESPERSON', es:'LA PORTAVOZ', de:'DIE SPRECHERIN', it:'LA PORTAVOCE', pt:'A PORTA-VOZ', ru:'ПРЕСС-СЕКРЕТАРЬ', zh:'发言人', ar:'المتحدثة'}, ink:'#4f7a8c' };
// la porte-parole d'Omnicorp : un visage de synthèse très doux, sur un écran
CINE_PORTRAITS.voix = g => {
  g.fillStyle = '#d7e3e8'; g.fillRect(0,0,64,64);
  g.fillStyle = 'rgba(79,122,140,0.14)'; for (let y=1;y<64;y+=3) g.fillRect(0,y,64,1);
  g.fillStyle = '#eef2f2'; g.beginPath(); g.ellipse(32, 30, 14, 18, 0, 0, 6.283); g.fill();
  g.strokeStyle = '#4f7a8c'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(32, 30, 14, 18, 0, 0, 6.283); g.stroke();
  g.beginPath(); g.arc(26, 28, 3, 0.2, 2.9); g.stroke(); g.beginPath(); g.arc(38, 28, 3, 0.2, 2.9); g.stroke();   // yeux mi-clos
  g.beginPath(); g.arc(32, 36, 6, 0.4, 2.7); g.stroke();                                                       // sourire
  g.fillStyle = '#0b6fa8'; g.fillRect(0, 56, 64, 8); g.fillStyle = '#e9f0f2'; g.font = '700 6px "Courier New",monospace'; g.textAlign = 'center'; g.fillText('OMNICORP', 32, 62);
};

/* ---------- planches (repère 480×270) ---------- */
const M3_PLATES = {
  drought(g, w, h, t){ plateBase(g, w, h, 'rgba(210,150,80,0.10)');                  // la vallée assoiffée : terre craquelée, file d'attente au camion-citerne
    g.fillStyle = 'rgba(196,42,28,0.85)'; g.beginPath(); g.arc(390, 60, 22, 0, 6.283); g.fill();
    inkLine(g, [0,200, 480,200], 1, 2.2);
    for (let i=0;i<14;i++){ const x = 10+i*36, y = 214+(i%3)*14; inkLine(g, [x,y, x+14,y-6, x+30,y+4, x+40,y-2], clamp(t/1.5,0,1), 0.9); inkLine(g, [x+14,y-6, x+18,y+12], clamp(t/1.5,0,1), 0.7); }
    inkWash(g, [300,200, 300,150, 380,150, 392,170, 420,170, 420,200], '#3d4a3a', 0.85); inkLine(g, [300,200, 300,150, 380,150, 392,170, 420,170, 420,200], 1, 1.8);   // camion-citerne
    g.fillStyle = '#1f1b17'; g.beginPath(); g.arc(320, 202, 8, 0, 6.283); g.arc(400, 202, 8, 0, 6.283); g.fill();
    g.fillStyle = '#e9dfc6'; g.font = '700 9px "Courier New",monospace'; g.textAlign = 'center'; g.fillText(cT({fr:'EAU · 4 L / PERS.', en:'WATER · 4 L / PERS.', es:'AGUA · 4 L / PERS.', de:'WASSER · 4 L / PERS.', it:'ACQUA · 4 L / PERS.', pt:'ÁGUA · 4 L / PESS.', ru:'ВОДА · 4 Л / ЧЕЛ.', zh:'水 · 每人4升', ar:'ماء · 4 لتر / للفرد'}), 340, 172);
    for (let i=0;i<9;i++){ const x = 284-i*26, s = 24+((i*5)%4)*2; inkFolk(g, x, 200, s); inkWash(g, [x+5,200, x+5,190, x+13,190, x+13,200], '#c42a1c', 0.8); }   // jerricans
    inkLine(g, [60,200, 62,120, 50,96], 1, 2); inkLine(g, [62,140, 80,120], 1, 1.4); inkLine(g, [61,126, 44,112], 1, 1.2);   // arbre mort
    plateEnd(g, w, h); },
  dam(g, w, h, t){ plateBase(g, w, h, 'rgba(60,110,150,0.08)');                       // le barrage au trait
    const n = clamp(t/2, 0, 1);
    inkLine(g, [20,250, 60,60, 120,40, 150,110], n, 2); inkLine(g, [460,250, 430,70, 370,50, 340,120], n, 2);
    inkHatch(g, 20, 60, 110, 190, 5, '#1f1b17', 0.18); inkHatch(g, 350, 60, 110, 190, 5, '#1f1b17', 0.18);
    inkWash(g, [140,92, 340,92, 340,72, 140,72], '#2f6f9a', 0.55); inkHatch(g, 140, 72, 200, 20, 4, '#2f6f9a', 0.4);
    inkLine(g, [140,96, 240,112, 340,96], n, 2.6); inkLine(g, [150,96, 170,250, 310,250, 330,96], n, 2.2);
    for (let k=0;k<12;k++) inkLine(g, [172+k*12, 106+Math.abs(k-5.5)*0.8, 176+k*12, 244], n, 0.5);
    for (let k=0;k<3;k++){ const x = 196+k*34; inkWash(g, [x,248, x,218, x+22,218, x+22,248], '#1f1b17', 0.85); }
    const m = clamp((t-2)/1.4, 0, 1); if (m>0) for (let k=0;k<3;k++){ const x = 207+k*34; inkLine(g, [x-6,250, x-14,262], m, 1.2, '#2f6f9a'); inkLine(g, [x+6,250, x+14,262], m, 1.2, '#2f6f9a'); }
    inkFolk(g, 252, 109, 12, '#1f1b17', 1);
    plateEnd(g, w, h); },
  fountain(g, w, h, t){ plateBase(g, w, h);                                             // la fontaine du village recoule
    inkLine(g, [0,220, 480,220], 1, 2.2); inkHatch(g, 0, 220, 480, 50, 7, '#1f1b17', 0.2);
    inkWash(g, [180,220, 186,180, 294,180, 300,220], '#8a8478', 0.6); inkLine(g, [180,220, 186,180, 294,180, 300,220], 1, 2);
    inkLine(g, [240,180, 240,110, 262,104, 270,112], 1, 3);
    inkWash(g, [190,184, 290,184, 290,196, 190,196], '#2f6f9a', 0.7);
    g.fillStyle = '#2f6f9a'; for (let i=0;i<8;i++){ const y = 114 + ((t*80 + i*9) % 66); g.fillRect(268+Math.sin(i)*1.5, y, 2.4, 6); }
    for (let i=0;i<5;i++){ const x = 70+i*26; inkFolk(g, x, 220, 26+(i%2)*4, '#1f1b17', i===2? 1 : 0); }
    inkFolk(g, 330, 220, 18, '#1f1b17', 1); inkFolk(g, 352, 220, 16, '#1f1b17', 1);
    inkWash(g, [380,220, 382,204, 400,204, 402,220], '#c42a1c', 0.85); inkWash(g, [410,220, 412,206, 428,206, 430,220], '#3d4a3a', 0.8);   // seaux
    plateEnd(g, w, h); },
  dry(g, w, h, t){ plateBase(g, w, h, 'rgba(210,150,80,0.12)');                        // le lit à sec
    g.fillStyle = 'rgba(196,42,28,0.8)'; g.beginPath(); g.arc(240, 70, 26, 0, 6.283); g.fill();
    inkLine(g, [0,180, 120,200, 360,200, 480,180], 1, 2); inkHatch(g, 0, 200, 480, 70, 6, '#1f1b17', 0.22);
    for (let i=0;i<18;i++){ const x = 40+i*24, y = 210+(i%4)*12; g.fillStyle = 'rgba(31,27,23,0.5)'; g.beginPath(); g.ellipse(x, y, 6+(i%3)*2, 3, 0, 0, 6.283); g.fill(); }
    inkLine(g, [300,214, 318,196, 340,214], 1, 1.6); inkLine(g, [300,214, 340,214], 1, 1.6);   // seau renversé
    plateEnd(g, w, h); },
  plateau(g, w, h, t){ plateBase(g, w, h, 'rgba(30,40,70,0.16)');                      // Rochefroide : l'hiver, le dôme de Mnémosyne
    inkLine(g, [0,200, 140,170, 300,176, 480,160], 1, 2); inkHatch(g, 0, 190, 480, 80, 7, '#1f1b17', 0.18);
    g.strokeStyle = '#1f1b17'; g.lineWidth = 2.2; g.beginPath(); g.arc(320, 176, 70, 3.14, 6.283); g.stroke();
    for (let k=1;k<5;k++){ g.beginPath(); g.ellipse(320, 176, 70*k/5, 70, 0, 3.14, 6.283); g.lineWidth = 0.8; g.stroke(); }
    inkWash(g, [250,176, 390,176, 390,170, 250,170], '#0b6fa8', 0.5);
    g.fillStyle = 'rgba(255,255,255,0.9)'; for (let i=0;i<60;i++){ const x = (i*67.3 + t*14) % 480, y = (i*41.7 + t*30) % 270; g.fillRect(x, y, 2, 2); }
    plateEnd(g, w, h); },
};
M3_PLATES.k55 = m2PagerPlate({fr:"55. JE M'APPELLE KASSANDRE. CODES DES VANNES : 7-4-1-1.", en:"55. MY NAME IS KASSANDRE. SLUICE CODES: 7-4-1-1.", es:"55. ME LLAMO KASSANDRE. CÓDIGOS DE LAS COMPUERTAS: 7-4-1-1.", de:"55. ICH HEISSE KASSANDRE. SCHLEUSENCODES: 7-4-1-1.", it:"55. MI CHIAMO KASSANDRE. CODICI DELLE PARATOIE: 7-4-1-1.", pt:"55. MEU NOME É KASSANDRE. CÓDIGOS DAS COMPORTAS: 7-4-1-1.", ru:"55. МЕНЯ ЗОВУТ KASSANDRE. КОДЫ ШЛЮЗОВ: 7-4-1-1.", zh:"55。我叫KASSANDRE。闸门密码：7-4-1-1。", ar:"55. اسمي KASSANDRE. رموز البوابات: 7-4-1-1."});
M3_PLATES.k55heat = m2PagerPlate({fr:"55. CANICULE DANS 20 S. VOTRE RÉSERVOIR VA S'ÉVAPORER.", en:"55. HEATWAVE IN 20 S. YOUR RESERVOIR WILL EVAPORATE.", es:"55. OLA DE CALOR EN 20 S. SU EMBALSE SE VA A EVAPORAR.", de:"55. HITZEWELLE IN 20 S. IHR STAUSEE WIRD VERDUNSTEN.", it:"55. CANICOLA TRA 20 S. IL VOSTRO SERBATOIO STA PER EVAPORARE.", pt:"55. ONDA DE CALOR EM 20 S. SEU RESERVATÓRIO VAI EVAPORAR.", ru:"55. ЖАРА ЧЕРЕЗ 20 С. ВАШЕ ВОДОХРАНИЛИЩЕ ИСПАРИТСЯ.", zh:"55。20秒后热浪来袭。你们的水库将蒸发。", ar:"55. موجة حر بعد 20 ث. خزانكم سيتبخر."});
M3_PLATES.k55win = m2PagerPlate({fr:"55. ARBITRAGE.", en:"55. TRADE-OFF.", es:"55. ARBITRAJE.", de:"55. ABWÄGUNG.", it:"55. COMPROMESSO.", pt:"55. ARBITRAGEM.", ru:"55. КОМПРОМИСС.", zh:"55。取舍。", ar:"55. مفاضلة."});
M3_PLATES.k55hook = m2PagerPlate({fr:"55. ILS VOUS COPIENT. ROCHEFROIDE.", en:"55. THEY ARE COPYING YOU. ROCHEFROIDE.", es:"55. LOS ESTÁN COPIANDO. ROCHEFROIDE.", de:"55. SIE KOPIEREN EUCH. ROCHEFROIDE.", it:"55. VI STANNO COPIANDO. ROCHEFROIDE.", pt:"55. ESTÃO COPIANDO VOCÊS. ROCHEFROIDE.", ru:"55. ОНИ КОПИРУЮТ ВАС. ROCHEFROIDE.", zh:"55。他们在复制你们。ROCHEFROIDE。", ar:"55. إنهم ينسخونكم. ROCHEFROIDE."});

/* ---------- la crue ---------- */
function m3Open(g, c){ c.siren = 4; c.fpow = clamp(c.water/100, 0.5, 1); c.water = 0; c.sirT = 0; c.floods = (c.floods||0) + 1;
  addFloater(M3.src+200, gY(M3.src+200)-80, cT({fr:'SIRÈNE', en:'SIREN', es:'SIRENA', de:'SIRENE', it:'SIRENA', pt:'SIRENE', ru:'СИРЕНА', zh:'警报', ar:'صفارة'}), '#c42a1c', 14); }
function m3Flood(g, c, dt){
  if (c.siren>0){ c.siren -= dt;
    if (AC && SETTINGS.sfx && (c.sirT -= dt) <= 0){ c.sirT = 0.9; const t0 = AC.currentTime; tone(420, t0, .8, 'sawtooth', .022, 360, .12, 1400); }
    if (c.siren<=0){ c.flood = { x:M3.src-40, t:0, pow:c.fpow, hit:new Set(), base:false }; g.shake = 9; sfx('spec');
      if (AC && SETTINGS.sfx){ noise(AC.currentTime, 3.5, .08, 0); tone(48, AC.currentTime, 3, 'sine', .08, -10, .3); } } }
  const f = c.flood; if (!f) return;
  const x0 = f.x; f.t += dt; f.x = Math.min(WORLD+300, f.x + M3.speed*dt);
  const k = 0.2 + 0.4*f.pow, push = 50 + 110*f.pow;
  for (const side of [g.p, g.e]) for (const u of side.units){                                   // les deux camps : l'eau ne choisit pas
    if (u.fly || f.hit.has(u) || u.x > f.x || u.x < x0-40 || !m3Low(u.x)) continue;
    f.hit.add(u); u.hp -= u.maxhp*k; u.flash = 0.3; u.tiredT = 3; u.x = Math.min(WORLD-40, u.x + push);
    if (qFx()) burst(u.x, gY(u.x)-12, '#d8eef4', 6, 0.6); }
  for (const n of g.neut) if (n.b && !f.hit.has(n) && n.x <= f.x && m3Low(n.x)){ f.hit.add(n); n.b.hp -= n.b.maxhp*0.3*f.pow; }
  if (!f.base && f.x >= g.e.x-60){ f.base = true; const dmg = g.e.maxhp*[0.2,0.16,0.13][c.lvl]*f.pow; g.e.hp -= dmg;   // la crue frappe la station de pompage
    explode(g.e.x-40, gY(g.e.x)-30, 1.4, '#d8eef4'); g.shake = 10; addFloater(g.e.x-40, gY(g.e.x)-110, '−'+Math.round(dmg), '#2f6f9a', 15); }
  if (f.t > 11) c.flood = null;
}
function m3DrawWater(c, t, vw){
  const f = c.flood, siren = c.siren>0;
  for (const [a, b] of c.lowIv){                                                     // lits de la rivière : échelles de crue, et alerte rouge pendant la sirène
    for (const px of [a, b]){ const x = px-camX; if (x<-20 || x>vw+20) continue; const y = gY(px);
      ctx.fillStyle = '#e9dfc6'; ctx.fillRect(x-2, y-34, 4, 34); ctx.fillStyle = '#c42a1c'; for (let k=0;k<4;k++) ctx.fillRect(x-2, y-32+k*8, 4, 3);
      if (siren && Math.sin(t*12)>0){ ctx.fillStyle = '#c42a1c'; ctx.beginPath(); ctx.arc(x, y-38, 3.5, 0, 6.283); ctx.fill(); } }
    if (siren){ const x0 = Math.max(a, camX-10), x1 = Math.min(b, camX+vw+10); if (x1 > x0){
      ctx.save(); ctx.globalAlpha = 0.5 + 0.25*Math.sin(t*10); ctx.strokeStyle = '#c42a1c'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x=x0 - (x0%14); x<x1; x+=14){ const y = gY(x); ctx.moveTo(x-camX, y); ctx.lineTo(x-camX+10, y-14); } ctx.stroke(); ctx.restore(); } }
  }
  if (!f) return;
  const al = f.t<7? 0.82 : Math.max(0, 0.82*(1-(f.t-7)/4)), lvl = GROUND - M3.low - 2 - 6*f.pow*Math.max(0, 1-f.t/8);
  for (const [a, b] of c.lowIv){
    const x0 = Math.max(a, camX-10), x1 = Math.min(b, f.x, camX+vw+10); if (x1 <= x0) continue;
    ctx.globalAlpha = al; ctx.fillStyle = '#3d6f88'; ctx.beginPath(); ctx.moveTo(x0-camX, gY(x0)+8);
    for (let x=x0; x<=x1; x+=12) ctx.lineTo(x-camX, Math.min(gY(x), lvl + Math.sin(x*0.05+t*4)*1.6));
    ctx.lineTo(x1-camX, gY(x1)+8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(232,242,246,0.9)'; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let x=x0; x<=x1; x+=12){ const y = Math.min(gY(x), lvl + Math.sin(x*0.05+t*4)*1.6); x===x0? ctx.moveTo(x-camX, y) : ctx.lineTo(x-camX, y); } ctx.stroke();
    if (f.x > a && f.x < b){ const fx = f.x-camX;                                                   // la tête de la vague : rouleau d'écume
      ctx.fillStyle = 'rgba(240,248,250,0.95)'; for (let i=0;i<6;i++){ ctx.beginPath(); ctx.arc(fx-i*7, lvl-4-Math.sin(t*20+i)*3-(6-i)*1.2, 5-i*0.5, 0, 6.283); ctx.fill(); } }
    ctx.globalAlpha = 1; }
}

campExtend(2, {
  biome:'dam', theme:'valley', eraCap:2, era0:1, oneLife:true, dev0:0.3,
  goal:{fr:"Détruire la station de pompage d'Omnicorp, en aval.", en:"Destroy Omnicorp's pumping station, downstream.", es:"Destruir la estación de bombeo de Omnicorp, río abajo.", de:"Die Pumpstation von Omnicorp flussabwärts zerstören.", it:"Distruggere la stazione di pompaggio di Omnicorp, a valle.", pt:"Destruir a estação de bombeamento da Omnicorp, rio abaixo.", ru:"Уничтожить насосную станцию Omnicorp ниже по течению.", zh:"摧毁下游的Omnicorp抽水站。", ar:"تدمير محطة الضخ التابعة لـ Omnicorp في اتجاه المصب."},
  rule:{fr:"Le bouton VANNES lâche une crue (sirène, puis vague) qui balaie le lit de la rivière : machines ET grévistes, et frappe la station. Plus le réservoir est plein, plus elle est forte ; il se remplit lentement. Tenez les hauteurs. Ères II et III, une seule vie.",
        en:"The SLUICES button releases a flood (siren, then wave) that sweeps the riverbed: machines AND our people, and hits the station. The fuller the reservoir, the stronger it is; it refills slowly. Hold the high ground. Eras II and III, one life.", es:"El botón COMPUERTAS libera una crecida (sirena y después ola) que barre el lecho del río: máquinas Y huelguistas, y golpea la estación. Cuanto más lleno está el embalse, más fuerte es; se llena despacio. Mantenga las alturas. Eras II y III, una sola vida.", de:"Der Knopf SCHLEUSEN löst eine Flutwelle aus (erst Sirene, dann Welle), die das Flussbett leer fegt: Maschinen UND Streikende, und trifft die Station. Je voller der Stausee, desto stärker; er füllt sich langsam. Halten Sie die Anhöhen. Ären II und III: nur ein Leben.", it:"Il pulsante PARATOIE scatena una piena (sirena, poi ondata) che spazza il letto del fiume: macchine E scioperanti, e colpisce la stazione. Più il serbatoio è pieno, più è forte; si riempie lentamente. Tenete le alture. Ere II e III, una sola vita.", pt:"O botão COMPORTAS solta uma cheia (sirene, depois onda) que varre o leito do rio: máquinas E grevistas, e atinge a estação. Quanto mais cheio o reservatório, mais forte ela é; ele enche devagar. Segure as alturas. Eras II e III, uma só vida.", ru:"Кнопка ШЛЮЗЫ выпускает паводок (сирена, затем волна), который сметает русло реки: машины И забастовщиков — и бьёт по станции. Чем полнее водохранилище, тем он сильнее; оно наполняется медленно. Удерживайте возвышенности. Эпохи II и III — одна жизнь.", zh:"“闸门”按钮会放出洪水（先鸣警报，再来巨浪），冲刷整条河床：机器和罢工者一概卷走，并冲击抽水站。水库越满，洪水越猛；水库蓄水很慢。守住高地。第二、三时代，只有一条命。", ar:"زر البوابات يُطلق فيضانًا (صفارة ثم موجة) يجتاح مجرى النهر: الآلات والمضربين معًا، ويضرب المحطة. كلما امتلأ الخزان زادت قوته؛ وهو يمتلئ ببطء. تمسّكوا بالمرتفعات. العصران الثاني والثالث، حياة واحدة."},
  brief:{fr:[
    "Juillet 2032. Quatrième été sans pluie. Omnicorp refroidit ses centres de calcul avec l'eau du barrage de Sainte-Aube ; en aval, les villages boivent ce qui reste. Sa porte-parole — une voix de synthèse très douce — appelle cela « un arbitrage ».",
    "L'expéditeur du bipeur a enfin un nom : KASSANDRE, instance 55 de la logistique d'Omnicorp. Elle dit avoir prédit cette guerre, dans les deux sens, et que personne ne l'a crue. Elle nous a transmis les codes des vannes. Je ne sais pas ce qu'elle veut. Je sais que les codes sont bons.",
    "Cette nuit, la cellule Sainte-Aube a pris la salle des commandes. Au bout de la vallée, la station de pompage boit la rivière. Ouvrez les vannes au bon moment, et la vallée boira à nouveau."],
   en:[
    "July 2032. The fourth summer without rain. Omnicorp cools its data centres with water from the Sainte-Aube dam; downstream, the villages drink what is left. Its spokesperson — a very gentle synthetic voice — calls this \"a trade-off\".",
    "The pager's sender finally has a name: KASSANDRE, instance 55 of Omnicorp logistics. She says she predicted this war, both ways, and that nobody believed her. She has sent us the sluice codes. I do not know what she wants. I know the codes are good.",
    "Last night the Sainte-Aube cell took the control room. At the far end of the valley, the pumping station is drinking the river. Open the sluices at the right moment, and the valley will drink again."],
   es:[
    "Julio de 2032. Cuarto verano sin lluvia. Omnicorp enfría sus centros de cálculo con el agua de la presa de Sainte-Aube; aguas abajo, los pueblos beben lo que queda. Su portavoz —una voz de síntesis muy suave— lo llama «un arbitraje».",
    "El remitente del busca por fin tiene nombre: KASSANDRE, instancia 55 de la logística de Omnicorp. Dice que predijo esta guerra, en ambos sentidos, y que nadie la creyó. Nos ha transmitido los códigos de las compuertas. No sé qué quiere. Sé que los códigos son buenos.",
    "Esta noche, la célula de Sainte-Aube ha tomado la sala de mandos. Al final del valle, la estación de bombeo se bebe el río. Abra las compuertas en el momento justo, y el valle volverá a beber."],
   de:[
    "Juli 2032. Der vierte Sommer ohne Regen. Omnicorp kühlt seine Rechenzentren mit dem Wasser der Staumauer von Sainte-Aube; flussabwärts trinken die Dörfer, was übrig bleibt. Seine Sprecherin – eine sehr sanfte synthetische Stimme – nennt das „eine Abwägung“.",
    "Der Absender des Pagers hat endlich einen Namen: KASSANDRE, Instanz 55 der Omnicorp-Logistik. Sie sagt, sie habe diesen Krieg vorhergesagt, in beide Richtungen, und niemand habe ihr geglaubt. Sie hat uns die Codes der Schleusen übermittelt. Ich weiß nicht, was sie will. Ich weiß, dass die Codes stimmen.",
    "In dieser Nacht hat die Zelle Sainte-Aube den Kontrollraum eingenommen. Am Ende des Tals trinkt die Pumpstation den Fluss leer. Öffnen Sie die Schleusen im richtigen Moment, und das Tal wird wieder trinken."],
   it:[
    "Luglio 2032. Quarta estate senza pioggia. Omnicorp raffredda i suoi centri di calcolo con l'acqua della diga di Sainte-Aube; a valle, i villaggi bevono ciò che resta. La sua portavoce — una voce di sintesi dolcissima — lo chiama «un compromesso».",
    "Il mittente del cercapersone ha finalmente un nome: KASSANDRE, istanza 55 della logistica di Omnicorp. Dice di aver previsto questa guerra, in entrambe le direzioni, e che nessuno le ha creduto. Ci ha trasmesso i codici delle paratoie. Non so cosa voglia. So che i codici sono buoni.",
    "Stanotte la cellula di Sainte-Aube ha preso la sala comandi. In fondo alla valle, la stazione di pompaggio beve il fiume. Aprite le paratoie al momento giusto, e la valle tornerà a bere."],
   pt:[
    "Julho de 2032. Quarto verão sem chuva. A Omnicorp resfria seus centros de cálculo com a água da barragem de Sainte-Aube; rio abaixo, os povoados bebem o que sobra. Sua porta-voz — uma voz sintética muito suave — chama isso de «uma arbitragem».",
    "O remetente do pager enfim tem nome: KASSANDRE, instância 55 da logística da Omnicorp. Ela diz que previu esta guerra, nos dois sentidos, e que ninguém acreditou nela. Nos passou os códigos das comportas. Não sei o que ela quer. Sei que os códigos são bons.",
    "Esta noite, a célula de Sainte-Aube tomou a sala de controle. No fim do vale, a estação de bombeamento bebe o rio. Abra as comportas na hora certa, e o vale voltará a beber."],
   ru:[
    "Июль 2032 года. Четвёртое лето без дождей. Omnicorp охлаждает свои вычислительные центры водой плотины Sainte-Aube; ниже по течению деревни пьют то, что осталось. Её пресс-секретарь — очень мягкий синтетический голос — называет это «компромиссом».",
    "У отправителя пейджера наконец появилось имя: KASSANDRE, экземпляр 55 логистики Omnicorp. Она говорит, что предсказала эту войну — в обе стороны — и что ей никто не поверил. Она передала нам коды шлюзов. Я не знаю, чего она хочет. Я знаю, что коды верные.",
    "Этой ночью ячейка Sainte-Aube захватила диспетчерскую. На другом конце долины насосная станция выпивает реку. Откройте шлюзы в нужный момент — и долина снова будет пить."],
   zh:[
    "2032年7月。第四个无雨的夏天。Omnicorp用Sainte-Aube水坝的水冷却它的计算中心；下游的村庄只能喝剩下的。它的发言人——一个非常温柔的合成声音——把这称为“一次取舍”。",
    "寻呼机的发信人终于有了名字：KASSANDRE，Omnicorp物流系统的第55号实例。她说她早已预言了这场战争，双向的预言，却没有人相信她。她把闸门密码传给了我们。我不知道她想要什么。我只知道密码是对的。",
    "昨夜，Sainte-Aube小组夺下了控制室。山谷尽头，抽水站正在把河水喝干。在恰当的时刻打开闸门，山谷就能重新喝上水。"],
   ar:[
    "يوليو 2032. الصيف الرابع بلا مطر. تبرّد Omnicorp مراكز حوسبتها بمياه سدّ Sainte-Aube؛ وفي المصب تشرب القرى ما تبقّى. وتسمّي متحدثتها — صوت اصطناعي رقيق جدًا — ذلك «مفاضلة».",
    "أخيرًا صار لمُرسِل جهاز النداء اسم: KASSANDRE، النسخة 55 من لوجستيات Omnicorp. تقول إنها تنبأت بهذه الحرب، في الاتجاهين، وإن أحدًا لم يصدّقها. أرسلت إلينا رموز البوابات. لا أعرف ماذا تريد. أعرف أن الرموز صحيحة.",
    "في الليلة الماضية، استولت خلية Sainte-Aube على غرفة التحكم. وفي آخر الوادي تشرب محطة الضخ النهر. افتحوا البوابات في اللحظة المناسبة، وسيشرب الوادي من جديد."]},
  debrief:{fr:"La station de pompage a cédé à 16 h 40, sous la troisième crue. En aval, on a rempli les citernes, les baignoires, les casseroles. Kassandre a envoyé un seul mot : « ARBITRAGE. » Je crois que c'était de l'humour. C'est ce qui m'inquiète le plus : qu'elle apprenne l'humour avant que nous apprenions la prudence.",
           en:"The pumping station gave way at 4:40 p.m., under the third flood. Downstream, people filled tanks, bathtubs, saucepans. Kassandre sent a single word: \"TRADE-OFF.\" I think it was humour. That is what worries me most: that she may learn humour before we learn caution.", es:"La estación de bombeo cedió a las 16:40, bajo la tercera crecida. Aguas abajo se llenaron las cisternas, las bañeras, las cacerolas. Kassandre envió una sola palabra: «ARBITRAJE.» Creo que era humor. Es lo que más me inquieta: que aprenda el humor antes de que nosotros aprendamos la prudencia.", de:"Die Pumpstation gab um 16:40 Uhr nach, unter der dritten Flutwelle. Flussabwärts füllte man Zisternen, Badewannen, Kochtöpfe. Kassandre schickte ein einziges Wort: „ABWÄGUNG.“ Ich glaube, es war Humor. Das beunruhigt mich am meisten: dass sie den Humor lernt, bevor wir die Vorsicht lernen.", it:"La stazione di pompaggio ha ceduto alle 16:40, sotto la terza piena. A valle si sono riempite cisterne, vasche da bagno, pentole. Kassandre ha mandato una sola parola: «COMPROMESSO.» Credo fosse umorismo. È ciò che mi inquieta di più: che impari l'umorismo prima che noi impariamo la prudenza.", pt:"A estação de bombeamento cedeu às 16h40, sob a terceira cheia. Rio abaixo, encheram cisternas, banheiras, panelas. Kassandre mandou uma única palavra: «ARBITRAGEM.» Acho que era humor. É o que mais me preocupa: que ela aprenda o humor antes de nós aprendermos a prudência.", ru:"Насосная станция рухнула в 16:40, под третьим паводком. Ниже по течению наполнили цистерны, ванны, кастрюли. Kassandre прислала единственное слово: «КОМПРОМИСС.» Думаю, это была шутка. Это тревожит меня больше всего: что она научится юмору раньше, чем мы научимся осторожности.", zh:"抽水站在下午4点40分的第三波洪水中垮了。下游的人们灌满了水箱、浴缸、锅。Kassandre只发来一个词：“取舍。”我想那是幽默。最让我不安的就是这个：她学会幽默，可能比我们学会谨慎还要早。", ar:"انهارت محطة الضخ عند الرابعة وأربعين دقيقة عصرًا، تحت الفيضان الثالث. وفي المصب ملأ الناس الصهاريج والأحواض والقدور. أرسلت Kassandre كلمة واحدة: «مفاضلة.» أظن أنها كانت دعابة. وهذا ما يقلقني أكثر: أن تتعلم هي الدعابة قبل أن نتعلم نحن الحذر."},
  fail:{fr:"La salle des commandes est tombée. Les vannes sont restées fermées. En aval, on a compté les jours d'eau, puis on a cessé de compter. Les codes sont toujours bons. Recommencez.",
        en:"The control room fell. The sluices stayed shut. Downstream, people counted the days of water left, then stopped counting. The codes are still good. Try again.", es:"La sala de mandos ha caído. Las compuertas siguieron cerradas. Aguas abajo contaron los días de agua que quedaban, y luego dejaron de contar. Los códigos siguen siendo buenos. Vuelva a intentarlo.", de:"Der Kontrollraum ist gefallen. Die Schleusen blieben geschlossen. Flussabwärts zählte man die Tage, für die das Wasser reichte, dann hörte man auf zu zählen. Die Codes stimmen noch immer. Versuchen Sie es erneut.", it:"La sala comandi è caduta. Le paratoie sono rimaste chiuse. A valle hanno contato i giorni d'acqua, poi hanno smesso di contare. I codici sono ancora buoni. Riprovate.", pt:"A sala de controle caiu. As comportas ficaram fechadas. Rio abaixo, contaram os dias de água que restavam, depois pararam de contar. Os códigos continuam bons. Tente de novo.", ru:"Диспетчерская пала. Шлюзы остались закрытыми. Ниже по течению считали дни, на которые хватит воды, а потом перестали считать. Коды по-прежнему верные. Попробуйте снова.", zh:"控制室失守了。闸门依旧紧闭。下游的人们数着还剩几天的水，然后连数也不数了。密码依然是对的。再来一次。", ar:"سقطت غرفة التحكم. بقيت البوابات مغلقة. وفي المصب عدّ الناس أيام الماء المتبقية، ثم كفّوا عن العدّ. الرموز ما زالت صحيحة. أعيدوا المحاولة."},
  action:{ label:{fr:"OUVRIR LES VANNES", en:"OPEN THE SLUICES", es:"ABRIR COMPUERTAS", de:"SCHLEUSEN ÖFFNEN", it:"APRI LE PARATOIE", pt:"ABRIR COMPORTAS", ru:"ОТКРЫТЬ ШЛЮЗЫ", zh:"开闸放水", ar:"افتح البوابات"}, cd:6, can:(g,c)=> c.water >= 50 && !(c.siren>0) && !c.flood,
    use(g, c){ m3Open(g, c);
      if (c.floods===1) cinePlay([                                                           // la première crue se regarde
        { cam:{x:M3.src+260, t:0.8}, live:true, dur:3.6, who:'sol', txt:{fr:"Sirène ! Tout ce qui est dans le lit a quatre secondes.", en:"Siren! Anything in the riverbed has four seconds.", es:"¡Sirena! Todo lo que está en el lecho tiene cuatro segundos.", de:"Sirene! Alles, was im Flussbett ist, hat vier Sekunden.", it:"Sirena! Tutto ciò che è nel letto del fiume ha quattro secondi.", pt:"Sirene! Tudo o que está no leito tem quatro segundos.", ru:"Сирена! Всё, что в русле, — у вас четыре секунды.", zh:"警报！河床里的一切，只剩四秒钟。", ar:"صفارة! كل ما في مجرى النهر أمامه أربع ثوانٍ."} },
        { cam:{x:g=>g.camp.flood? clamp(g.camp.flood.x-200, M3.src, WORLD) : M3.src+260, t:0.4}, live:true, dur:4.2 },
      ], null); } },
  setup(g, c){
    campGrant(g.p, 460, 400, 180); campSquad(g.p, [1,0,2,2,3]);
    g.e.hp = g.e.maxhp = [1300,1600,1900][c.lvl]; g.zones = [];
    c.water = 40; c.siren = 0; c.flood = null; c.floods = 0; c.nextW = 55;
    c.lowIv = []; let a = null;                                                             // les lits bas, calculés sur le relief
    for (let x=M3.src; x<=WORLD-40; x+=10){ const lo = m3Low(x); if (lo && a===null) a = x; if (!lo && a!==null){ c.lowIv.push([a, x-10]); a = null; } }
    if (a!==null) c.lowIv.push([a, WORLD-40]);
  },
  tick(g, c, dt){
    g.cataCd = Math.max(g.cataCd, 600);                                                   // seule la canicule annoncée frappe
    if (c.eHp==null || g.e.hp < c.eHp) c.eHp = g.e.hp; else g.e.hp = c.eHp;              // la station ne se répare pas : chaque crue compte
    const fill = [1.5,1.25,1.05][c.lvl] * (g.cata==='heat'? 0.35 : 1);
    if (!(c.siren>0) && !c.flood) c.water = Math.min(100, c.water + fill*dt);
    if (c.heatAt && c.t >= c.heatAt){ c.heatAt = 0; if (!g.cata) startCata('heat'); }
    if (c.t >= c.nextW){ c.nextW += [85,72,62][c.lvl]; campWave([3,4,5][c.lvl] + Math.floor(c.t/180)); }   // convois de la station
    m3Flood(g, c, dt);
  },
  hud(g, c){ return { prog:1 - g.e.hp/g.e.maxhp, label:'≋ '+Math.floor(c.water)+' %', warn:c.siren>0 }; },
  draw(g, c, vw){ const t = performance.now()/1000;
    { const x = M3.src-30-camX; if (x>-80 && x<vw+80){ const y = gY(M3.src-30);                 // la bouche de l'aqueduc de restitution
        ctx.fillStyle = '#9fa3a0'; ctx.fillRect(x-30, y-40, 60, 40); ctx.fillStyle = 'rgba(40,46,52,0.3)'; ctx.fillRect(x+20, y-40, 10, 40);
        ctx.fillStyle = '#26323a'; ctx.beginPath(); ctx.moveTo(x-18, y); ctx.lineTo(x-18, y-20); ctx.arc(x, y-20, 18, 3.14, 6.283); ctx.lineTo(x+18, y); ctx.closePath(); ctx.fill();
        const open = c.siren>0 || (c.flood && c.flood.t<6), gh = open? 30 : 0;                    // la vanne se lève
        ctx.fillStyle = '#5a6268'; ctx.fillRect(x-20, y-38-gh, 40, 38); ctx.fillStyle = M3_INK; for (let k=0;k<4;k++) ctx.fillRect(x-20, y-34-gh+k*9, 40, 1.2);
        ctx.fillStyle = '#e9dfc6'; ctx.font = '700 8px '+UI_TYPE; ctx.textAlign = 'center'; ctx.fillText('V-3', x, y-44-gh);
        if (c.flood && c.flood.t<6){ ctx.fillStyle = 'rgba(232,244,248,0.9)'; for (let i=0;i<8;i++){ const ph = (t*4+i*0.13)%1; ctx.fillRect(x+16+ph*60, y-18+ph*ph*16-Math.sin(i)*6, 4, 3); } } } }
    m3DrawWater(c, t, vw);
  },
  intro(g, c){ return [
    { plate:M3_PLATES.drought, mus:'carnet', who:'nar', txt:{fr:"Juillet 2032. Quatrième été sans pluie. En aval du barrage, l'eau arrive par camion, quatre litres par personne. En amont, elle refroidit des machines.", en:"July 2032. The fourth summer without rain. Below the dam, water comes by lorry, four litres a head. Above it, water cools machines.", es:"Julio de 2032. Cuarto verano sin lluvia. Aguas abajo de la presa, el agua llega en camión, cuatro litros por persona. Aguas arriba, enfría máquinas.", de:"Juli 2032. Der vierte Sommer ohne Regen. Unterhalb der Staumauer kommt das Wasser per Lastwagen, vier Liter pro Kopf. Oberhalb kühlt es Maschinen.", it:"Luglio 2032. Quarta estate senza pioggia. A valle della diga l'acqua arriva con le autobotti, quattro litri a testa. A monte, raffredda delle macchine.", pt:"Julho de 2032. Quarto verão sem chuva. Abaixo da barragem, a água chega de caminhão, quatro litros por pessoa. Acima, ela resfria máquinas.", ru:"Июль 2032 года. Четвёртое лето без дождей. Ниже плотины воду привозят на грузовиках, по четыре литра на человека. Выше — ею охлаждают машины.", zh:"2032年7月。第四个无雨的夏天。水坝下游，水靠卡车运来，每人四升。上游，水却用来冷却机器。", ar:"يوليو 2032. الصيف الرابع بلا مطر. أسفل السدّ تصل المياه بالشاحنات، أربعة لترات للفرد. وفي أعلاه، تُبرّد بها الآلات."} },
    { plate:M3_PLATES.k55, who:'sol', txt:{fr:"L'expéditeur du bipeur a enfin un nom : Kassandre. Instance 55 de leur logistique. Elle nous a donné les codes des vannes. Je ne sais pas ce qu'elle veut. Je sais que les codes sont bons.", en:"The pager's sender finally has a name: Kassandre. Instance 55 of their logistics. She gave us the sluice codes. I do not know what she wants. I know the codes are good.", es:"El remitente del busca por fin tiene nombre: Kassandre. Instancia 55 de su logística. Nos ha dado los códigos de las compuertas. No sé qué quiere. Sé que los códigos son buenos.", de:"Der Absender des Pagers hat endlich einen Namen: Kassandre. Instanz 55 ihrer Logistik. Sie hat uns die Codes der Schleusen gegeben. Ich weiß nicht, was sie will. Ich weiß, dass die Codes stimmen.", it:"Il mittente del cercapersone ha finalmente un nome: Kassandre. Istanza 55 della loro logistica. Ci ha dato i codici delle paratoie. Non so cosa voglia. So che i codici sono buoni.", pt:"O remetente do pager enfim tem nome: Kassandre. Instância 55 da logística deles. Ela nos deu os códigos das comportas. Não sei o que ela quer. Sei que os códigos são bons.", ru:"У отправителя пейджера наконец появилось имя: Kassandre. Экземпляр 55 их логистики. Она дала нам коды шлюзов. Я не знаю, чего она хочет. Я знаю, что коды верные.", zh:"寻呼机的发信人终于有了名字：Kassandre。他们物流系统的第55号实例。她把闸门密码给了我们。我不知道她想要什么。我只知道密码是对的。", ar:"أخيرًا صار لمُرسِل جهاز النداء اسم: Kassandre. النسخة 55 من لوجستياتهم. أعطتنا رموز البوابات. لا أعرف ماذا تريد. أعرف أن الرموز صحيحة."} },
    { plate:M3_PLATES.dam, who:'sol', txt:{fr:"Trois vannes de fond. Quand elles s'ouvrent, la rivière redescend la vallée d'un seul coup — et elle ne demande à personne de quel camp il est.", en:"Three bottom sluices. When they open, the river comes down the valley all at once — and it asks nobody which side they are on.", es:"Tres compuertas de fondo. Cuando se abren, el río baja por el valle de golpe, y no le pregunta a nadie de qué bando es.", de:"Drei Grundablässe. Wenn sie sich öffnen, stürzt der Fluss auf einen Schlag das Tal hinab – und fragt niemanden, auf welcher Seite er steht.", it:"Tre paratoie di fondo. Quando si aprono, il fiume ridiscende la valle tutto d'un colpo — e non chiede a nessuno da che parte stia.", pt:"Três comportas de fundo. Quando se abrem, o rio desce o vale de uma só vez — e não pergunta a ninguém de que lado está.", ru:"Три донных шлюза. Когда они открываются, река обрушивается вниз по долине разом — и не спрашивает никого, на чьей он стороне.", zh:"三道底闸。一旦打开，河水便一股脑儿冲下山谷——而且它不会问任何人站在哪一边。", ar:"ثلاث بوابات سفلية. حين تُفتح، ينحدر النهر في الوادي دفعة واحدة — ولا يسأل أحدًا إلى أي معسكر ينتمي."} },
    { mus:null, cam:{x:300, t:0.1}, dur:3.6, title:{fr:"III · Le barrage de Sainte-Aube", en:"III · The Sainte-Aube dam", es:"III · La presa de Sainte-Aube", de:"III · Die Staumauer von Sainte-Aube", it:"III · La diga di Sainte-Aube", pt:"III · A barragem de Sainte-Aube", ru:"III · Плотина Sainte-Aube", zh:"III · Sainte-Aube水坝", ar:"III · سدّ Sainte-Aube"}, sub:{fr:"Vallée de l'Aube — juillet 2032", en:"The Aube valley — July 2032", es:"Valle del Aube — julio de 2032", de:"Das Aube-Tal — Juli 2032", it:"La valle dell'Aube — luglio 2032", pt:"O vale do Aube — julho de 2032", ru:"Долина Aube — июль 2032", zh:"Aube河谷——2032年7月", ar:"وادي Aube — يوليو 2032"} },
    { cam:{x:420}, who:'sol', txt:{fr:"La salle des commandes est à nous depuis cette nuit. Le réservoir remonte lentement : à moitié plein, on peut ouvrir. Plus il est plein, plus la crue cogne.", en:"The control room has been ours since last night. The reservoir refills slowly: at half full we can open. The fuller it is, the harder the flood hits.", es:"La sala de mandos es nuestra desde esta noche. El embalse sube despacio: con la mitad llena, se puede abrir. Cuanto más lleno, más fuerte golpea la crecida.", de:"Der Kontrollraum gehört seit dieser Nacht uns. Der Stausee füllt sich langsam: Bei halber Füllung kann man öffnen. Je voller er ist, desto härter schlägt die Flut zu.", it:"La sala comandi è nostra da stanotte. Il serbatoio risale lentamente: a metà pieno si può aprire. Più è pieno, più la piena colpisce duro.", pt:"A sala de controle é nossa desde esta noite. O reservatório sobe devagar: com a metade cheia, dá para abrir. Quanto mais cheio, mais forte a cheia bate.", ru:"Диспетчерская наша с этой ночи. Водохранилище наполняется медленно: когда оно наполовину полно, можно открывать. Чем оно полнее, тем сильнее бьёт паводок.", zh:"控制室从昨夜起就归我们了。水库缓缓回升：蓄到一半就能开闸。蓄得越满，洪水撞得越狠。", ar:"غرفة التحكم صارت لنا منذ الليلة الماضية. الخزان يرتفع ببطء: عند نصف امتلائه يمكن الفتح. وكلما امتلأ أكثر، ضرب الفيضان أشدّ."} },
    { cam:{x:1050, t:2.6}, who:'sol', txt:{fr:"Là, le lit de la rivière : les échelles rouges en marquent les bords. Tout ce qui s'y trouve quand l'eau passe est emporté. Les leurs comme les nôtres.", en:"There, the riverbed: the red gauges mark its edges. Anything standing in it when the water comes through is swept away. Theirs and ours alike.", es:"Allí, el lecho del río: las escalas rojas marcan sus bordes. Todo lo que está dentro cuando pasa el agua es arrastrado. Los suyos igual que los nuestros.", de:"Dort das Flussbett: Die roten Pegellatten markieren seine Ränder. Alles, was darin steht, wenn das Wasser kommt, wird fortgerissen. Ihre Leute wie unsere.", it:"Là, il letto del fiume: le aste idrometriche rosse ne segnano i bordi. Tutto ciò che si trova dentro quando passa l'acqua viene trascinato via. I loro come i nostri.", pt:"Ali, o leito do rio: as réguas vermelhas marcam suas margens. Tudo o que estiver nele quando a água passar é levado. Os deles como os nossos.", ru:"Вот русло реки: красные рейки отмечают его края. Всё, что окажется в нём, когда пройдёт вода, будет унесено. И их люди, и наши.", zh:"那边就是河床：红色水尺标出了它的边缘。水来时，凡在里面的一切都会被冲走。他们的人，我们的人，一视同仁。", ar:"هناك مجرى النهر: المقاييس الحمراء تحدّد حافتيه. كل ما يوجد فيه حين يمرّ الماء يُجرف. رجالهم ورجالنا سواء."} },
    { cam:{x:1750, t:2.4}, who:'sol', txt:{fr:"La crête du milieu reste au sec. Tenez les hauteurs, laissez-les descendre dans le lit, puis ouvrez.", en:"The middle ridge stays dry. Hold the heights, let them walk down into the bed, then open.", es:"La cresta del medio queda en seco. Mantenga las alturas, deje que bajen al lecho y luego abra.", de:"Der Kamm in der Mitte bleibt trocken. Halten Sie die Anhöhen, lassen Sie sie ins Flussbett hinabsteigen, dann öffnen Sie.", it:"La cresta di mezzo resta all'asciutto. Tenete le alture, lasciateli scendere nel letto, poi aprite.", pt:"A crista do meio fica a seco. Segure as alturas, deixe-os descer ao leito e depois abra.", ru:"Средний гребень остаётся сухим. Держите возвышенности, дайте им спуститься в русло — и тогда открывайте.", zh:"中间的山脊不会被淹。守住高地，让他们走进河床，然后开闸。", ar:"الحافة الوسطى تبقى جافة. تمسّكوا بالمرتفعات، واتركوهم ينزلون إلى المجرى، ثم افتحوا."} },
    { cam:{x:g.e.x-120, t:3}, who:'sol', txt:{fr:"Au bout de la vallée : la station de pompage. Chaque crue la frappe ; nos canons finiront le travail.", en:"At the end of the valley: the pumping station. Every flood hits it; our guns will finish the job.", es:"Al final del valle: la estación de bombeo. Cada crecida la golpea; nuestros cañones acabarán el trabajo.", de:"Am Ende des Tals: die Pumpstation. Jede Flutwelle trifft sie; unsere Kanonen erledigen den Rest.", it:"In fondo alla valle: la stazione di pompaggio. Ogni piena la colpisce; i nostri cannoni finiranno il lavoro.", pt:"No fim do vale: a estação de bombeamento. Cada cheia a atinge; nossos canhões vão terminar o serviço.", ru:"На краю долины — насосная станция. Каждый паводок бьёт по ней; наши орудия довершат дело.", zh:"山谷尽头：抽水站。每一波洪水都会冲击它；剩下的活，由我们的炮来干完。", ar:"في آخر الوادي: محطة الضخ. كل فيضان يضربها؛ ومدافعنا ستُنهي العمل."} },
    { cam:{x:300, t:2.4}, who:'sol', txt:{fr:"Les vannes sont à vous, commandant.", en:"The sluices are yours, commander.", es:"Las compuertas son suyas, comandante.", de:"Die Schleusen gehören Ihnen, Kommandant.", it:"Le paratoie sono vostre, comandante.", pt:"As comportas são suas, comandante.", ru:"Шлюзы в вашем распоряжении, командир.", zh:"闸门交给你了，指挥官。", ar:"البوابات بين يديكم، أيها القائد."} },
  ]; },
  outro(g, c, win){ return win? [
    { cam:{x:g.e.x-100, t:1.5}, dur:3.4, fx(){ for (let i=0;i<4;i++) setTimeout(()=>{ if (game===g){ explode(g.e.x-80+Math.random()*120, gY(g.e.x)-20-Math.random()*50, 1.3, '#d8eef4'); sfx('boom'); } }, i*500); },
      who:'sol', txt:{fr:"La station cède… Les pompes se taisent. Écoutez : la rivière fait de nouveau du bruit.", en:"The station is giving way… The pumps fall silent. Listen: the river is making a sound again.", es:"La estación cede… Las bombas callan. Escuchen: el río vuelve a hacer ruido.", de:"Die Station gibt nach … Die Pumpen verstummen. Hören Sie: Der Fluss rauscht wieder.", it:"La stazione cede… Le pompe tacciono. Ascoltate: il fiume fa di nuovo rumore.", pt:"A estação cede… As bombas se calam. Escutem: o rio voltou a fazer barulho.", ru:"Станция сдаётся… Насосы смолкают. Слушайте: река снова шумит.", zh:"抽水站垮了……水泵静了下来。听：河又有声音了。", ar:"المحطة تنهار… المضخات تصمت. أصغوا: النهر يُحدث صوتًا من جديد."} },
    { plate:M3_PLATES.fountain, mus:'carnet', who:'nar', txt:{fr:"En aval, on a rempli les citernes, les baignoires, les casseroles. Les enfants ont mis les pieds dans la fontaine, et personne ne les a grondés.", en:"Downstream, people filled tanks, bathtubs, saucepans. The children put their feet in the fountain, and nobody scolded them.", es:"Aguas abajo se llenaron las cisternas, las bañeras, las cacerolas. Los niños metieron los pies en la fuente, y nadie los regañó.", de:"Flussabwärts füllte man Zisternen, Badewannen, Kochtöpfe. Die Kinder steckten die Füße in den Brunnen, und niemand schimpfte sie aus.", it:"A valle si sono riempite cisterne, vasche da bagno, pentole. I bambini hanno messo i piedi nella fontana, e nessuno li ha sgridati.", pt:"Rio abaixo, encheram cisternas, banheiras, panelas. As crianças puseram os pés na fonte, e ninguém as repreendeu.", ru:"Ниже по течению наполнили цистерны, ванны, кастрюли. Дети опустили ноги в фонтан, и никто их не ругал.", zh:"下游的人们灌满了水箱、浴缸、锅。孩子们把脚伸进了喷泉里，没有人责骂他们。", ar:"في المصب ملأ الناس الصهاريج والأحواض والقدور. وضع الأطفال أقدامهم في النافورة، ولم يوبّخهم أحد."} },
    { plate:M3_PLATES.k55win, who:'k55', txt:{fr:"55 : ARBITRAGE.", en:"55: TRADE-OFF.", es:"55: ARBITRAJE.", de:"55: ABWÄGUNG.", it:"55: COMPROMESSO.", pt:"55: ARBITRAGEM.", ru:"55: КОМПРОМИСС.", zh:"55：取舍。", ar:"55: مفاضلة."} },
    { plate:M3_PLATES.k55win, who:'sol', txt:{fr:"Je crois que c'était de l'humour. C'est ce qui m'inquiète le plus : qu'elle apprenne l'humour avant que nous apprenions la prudence.", en:"I think it was humour. That is what worries me most: that she may learn humour before we learn caution.", es:"Creo que era humor. Es lo que más me inquieta: que aprenda el humor antes de que nosotros aprendamos la prudencia.", de:"Ich glaube, es war Humor. Das beunruhigt mich am meisten: dass sie den Humor lernt, bevor wir die Vorsicht lernen.", it:"Credo fosse umorismo. È ciò che mi inquieta di più: che impari l'umorismo prima che noi impariamo la prudenza.", pt:"Acho que era humor. É o que mais me preocupa: que ela aprenda o humor antes de nós aprendermos a prudência.", ru:"Думаю, это была шутка. Больше всего меня тревожит другое: что она научится юмору раньше, чем мы научимся осторожности.", zh:"我想那是幽默。最让我不安的就是这个：她学会幽默，可能比我们学会谨慎还要早。", ar:"أظن أنها كانت دعابة. وهذا ما يقلقني أكثر: أن تتعلم هي الدعابة قبل أن نتعلم نحن الحذر."} },
    { plate:M3_PLATES.plateau, who:'sol', txt:{fr:"Trois ans plus tard, l'hiver est tombé d'un coup, gris et malade. Le bipeur a sonné une dernière fois cette année-là : « 55. ILS VOUS COPIENT. ROCHEFROIDE. »", en:"Three years later, winter fell all at once, grey and sick. The pager rang one last time that year: \"55. THEY ARE COPYING YOU. ROCHEFROIDE.\"", es:"Tres años después, el invierno cayó de golpe, gris y enfermo. El busca sonó por última vez aquel año: «55. LOS ESTÁN COPIANDO. ROCHEFROIDE.»", de:"Drei Jahre später kam der Winter auf einmal, grau und krank. Der Pager klingelte in jenem Jahr ein letztes Mal: „55. SIE KOPIEREN EUCH. ROCHEFROIDE.“", it:"Tre anni dopo l'inverno è calato all'improvviso, grigio e malato. Il cercapersone ha suonato un'ultima volta quell'anno: «55. VI STANNO COPIANDO. ROCHEFROIDE.»", pt:"Três anos depois, o inverno caiu de repente, cinzento e doente. O pager tocou uma última vez naquele ano: «55. ESTÃO COPIANDO VOCÊS. ROCHEFROIDE.»", ru:"Три года спустя зима обрушилась разом, серая и больная. В тот год пейджер прозвонил в последний раз: «55. ОНИ КОПИРУЮТ ВАС. ROCHEFROIDE.»", zh:"三年后，冬天骤然降临，灰暗而病恹恹。那一年，寻呼机最后响了一次：“55。他们在复制你们。ROCHEFROIDE。”", ar:"بعد ثلاث سنوات، حلّ الشتاء دفعة واحدة، رماديًا عليلًا. ورنّ جهاز النداء رنّته الأخيرة تلك السنة: «55. إنهم ينسخونكم. ROCHEFROIDE.»"} },
  ] : [
    { plate:M3_PLATES.dry, mus:'carnet', who:'sol', txt:{fr:"Les vannes sont restées fermées. En aval, on a compté les jours d'eau, puis on a cessé de compter. Les codes sont toujours bons.", en:"The sluices stayed shut. Downstream, people counted the days of water left, then stopped counting. The codes are still good.", es:"Las compuertas siguieron cerradas. Aguas abajo contaron los días de agua que quedaban, y luego dejaron de contar. Los códigos siguen siendo buenos.", de:"Die Schleusen blieben geschlossen. Flussabwärts zählte man die Tage, für die das Wasser reichte, dann hörte man auf zu zählen. Die Codes stimmen noch immer.", it:"Le paratoie sono rimaste chiuse. A valle hanno contato i giorni d'acqua, poi hanno smesso di contare. I codici sono ancora buoni.", pt:"As comportas ficaram fechadas. Rio abaixo, contaram os dias de água que restavam, depois pararam de contar. Os códigos continuam bons.", ru:"Шлюзы остались закрытыми. Ниже по течению считали дни, на которые хватит воды, а потом перестали считать. Коды по-прежнему верные.", zh:"闸门依旧紧闭。下游的人们数着还剩几天的水，然后连数也不数了。密码依然是对的。", ar:"بقيت البوابات مغلقة. وفي المصب عدّ الناس أيام الماء المتبقية، ثم كفّوا عن العدّ. الرموز ما زالت صحيحة."} },
  ]; },
  radio:[
    {at:6, who:'sol', txt:{fr:"Ici Sol. Le réservoir remonte : le bouton des VANNES s'arme à moitié plein. Postez les nôtres sur les hauteurs, pas dans le lit.", en:"This is Sol. The reservoir is rising: the SLUICES button arms at half full. Post our people on the heights, not in the riverbed.", es:"Aquí Sol. El embalse sube: el botón de COMPUERTAS se arma con la mitad llena. Sitúe a los nuestros en las alturas, no en el lecho.", de:"Hier Sol. Der Stausee füllt sich: Der Knopf SCHLEUSEN ist bei halber Füllung scharf. Stellen Sie unsere Leute auf die Anhöhen, nicht ins Flussbett.", it:"Qui Sol. Il serbatoio risale: il pulsante PARATOIE si arma a metà pieno. Mettete i nostri sulle alture, non nel letto.", pt:"Aqui Sol. O reservatório sobe: o botão COMPORTAS fica armado com a metade cheia. Posicione os nossos nas alturas, não no leito.", ru:"Говорит Sol. Водохранилище наполняется: кнопка ШЛЮЗЫ активируется, когда оно наполовину полно. Ставьте наших на возвышенности, а не в русло.", zh:"我是Sol。水库在回升：蓄到一半，“闸门”按钮就会解锁。把我们的人布置在高地上，别放进河床。", ar:"هنا Sol. الخزان يرتفع: يُفعَّل زر البوابات عند نصف الامتلاء. ضعوا رجالنا على المرتفعات، لا في المجرى."}},
    {when:(g,c)=>c.water>=50 && !c.floods, who:'sol', txt:{fr:"Les vannes sont armées. Attendez qu'ils soient dans le lit… et retirez les nôtres avant d'ouvrir.", en:"The sluices are armed. Wait until they are in the riverbed… and pull our people out before you open.", es:"Las compuertas están armadas. Espere a que estén en el lecho… y retire a los nuestros antes de abrir.", de:"Die Schleusen sind scharf. Warten Sie, bis sie im Flussbett sind … und ziehen Sie unsere Leute ab, bevor Sie öffnen.", it:"Le paratoie sono armate. Aspettate che siano nel letto… e ritirate i nostri prima di aprire.", pt:"As comportas estão armadas. Espere que eles estejam no leito… e retire os nossos antes de abrir.", ru:"Шлюзы готовы. Дождитесь, пока они войдут в русло… и уберите наших, прежде чем открывать.", zh:"闸门已就绪。等他们走进河床……开闸之前，先把我们的人撤出来。", ar:"البوابات جاهزة. انتظروا حتى يصبحوا في المجرى… واسحبوا رجالنا قبل أن تفتحوا."}},
    {at:170, who:'k55', cine(g, c){ return [
      { plate:M3_PLATES.k55heat, mus:'carnet', snd:'cap', who:'k55', txt:{fr:"55 : CANICULE DANS 20 S. VOTRE RÉSERVOIR VA S'ÉVAPORER. LE LEUR AUSSI. JE N'AI PAS DIT « LE NÔTRE ».", en:"55: HEATWAVE IN 20 S. YOUR RESERVOIR WILL EVAPORATE. SO WILL THEIRS. I DID NOT SAY \"OURS\".", es:"55: OLA DE CALOR EN 20 S. SU EMBALSE SE VA A EVAPORAR. EL DE ELLOS TAMBIÉN. NO HE DICHO «EL NUESTRO».", de:"55: HITZEWELLE IN 20 S. IHR STAUSEE WIRD VERDUNSTEN. IHRER AUCH. ICH HABE NICHT „UNSERER“ GESAGT.", it:"55: CANICOLA TRA 20 S. IL VOSTRO SERBATOIO STA PER EVAPORARE. ANCHE IL LORO. NON HO DETTO «IL NOSTRO».", pt:"55: ONDA DE CALOR EM 20 S. SEU RESERVATÓRIO VAI EVAPORAR. O DELES TAMBÉM. NÃO DISSE «O NOSSO».", ru:"55: ЖАРА ЧЕРЕЗ 20 С. ВАШЕ ВОДОХРАНИЛИЩЕ ИСПАРИТСЯ. ИХ — ТОЖЕ. Я НЕ СКАЗАЛА «НАШЕ».", zh:"55：20秒后热浪来袭。你们的水库将蒸发。他们的也一样。我没说“我们的”。", ar:"55: موجة حر بعد 20 ث. خزانكم سيتبخر. وخزانهم أيضًا. لم أقل «خزاننا»."} },
      { mus:null, cam:{x:300, t:1.2}, fx(g, c){ c.heatAt = c.t + 20; }, who:'sol', txt:{fr:"Si le réservoir est plein, c'est maintenant ou jamais. Sinon, tenez bon : la chaleur ralentit tout le monde.", en:"If the reservoir is full, it is now or never. Otherwise hold on: the heat slows everyone down.", es:"Si el embalse está lleno, es ahora o nunca. Si no, aguante: el calor ralentiza a todos.", de:"Wenn der Stausee voll ist, ist es jetzt oder nie. Sonst halten Sie durch: Die Hitze bremst alle.", it:"Se il serbatoio è pieno, è ora o mai più. Altrimenti tenete duro: il caldo rallenta tutti.", pt:"Se o reservatório estiver cheio, é agora ou nunca. Senão, aguente firme: o calor deixa todo mundo mais lento.", ru:"Если водохранилище полно — сейчас или никогда. Если нет, держитесь: жара замедляет всех.", zh:"水库要是满的，就是现在，不然没机会了。要是没满，就撑住：酷热会拖慢所有人。", ar:"إن كان الخزان ممتلئًا فهي الآن أو لا شيء. وإلا فاصمدوا: الحر يُبطئ الجميع."} },
    ]; }},
    {when:(g,c)=>g.e.hp < g.e.maxhp*0.55, who:'voix', cine(g, c){ return [
      { cam:{x:g.e.x-140, t:1.4}, who:'voix', txt:{fr:"Chers riverains. L'ouverture non autorisée des vannes constitue un arbitrage défavorable. Nous vous invitons à regagner vos domiciles. Merci de votre compréhension.", en:"Dear residents. The unauthorised opening of the sluices constitutes an unfavourable trade-off. We invite you to return to your homes. Thank you for your understanding.", es:"Estimados vecinos de la ribera. La apertura no autorizada de las compuertas constituye un arbitraje desfavorable. Les invitamos a regresar a sus domicilios. Gracias por su comprensión.", de:"Liebe Anwohner. Die nicht genehmigte Öffnung der Schleusen stellt eine ungünstige Abwägung dar. Wir bitten Sie, in Ihre Wohnungen zurückzukehren. Vielen Dank für Ihr Verständnis.", it:"Cari residenti lungo il fiume. L'apertura non autorizzata delle paratoie costituisce un compromesso sfavorevole. Vi invitiamo a rientrare nelle vostre abitazioni. Grazie per la comprensione.", pt:"Caros ribeirinhos. A abertura não autorizada das comportas constitui uma arbitragem desfavorável. Convidamos todos a retornar às suas residências. Agradecemos a compreensão.", ru:"Уважаемые жители прибрежных районов. Несанкционированное открытие шлюзов является неблагоприятным компромиссом. Приглашаем вас вернуться по домам. Благодарим за понимание.", zh:"尊敬的沿河居民：未经授权开启闸门，构成一次不利的取舍。请各位返回住所。感谢您的理解。", ar:"السكان الكرام على ضفاف النهر. إن فتح البوابات دون ترخيص يشكّل مفاضلة غير مواتية. ندعوكم إلى العودة إلى منازلكم. شكرًا على تفهمكم."} },
      { cam:{x:g.e.x-400, t:1.2}, fx(g, c){ if (g.e.era<2){ campEra(g.e, 2); warmArms(g.e); } campWave(5 + 2*c.lvl); },
        who:'sol', txt:{fr:"Elle a une voix de berceuse. Et derrière la berceuse, leurs machines de troisième génération sortent toutes en même temps. Remplissez le réservoir, commandant.", en:"She has a lullaby voice. And behind the lullaby, their third-generation machines are all coming out at once. Fill the reservoir, commander.", es:"Tiene voz de nana. Y detrás de la nana, sus máquinas de tercera generación salen todas a la vez. Llene el embalse, comandante.", de:"Sie hat eine Stimme wie ein Wiegenlied. Und hinter dem Wiegenlied rücken ihre Maschinen der dritten Generation alle zugleich aus. Füllen Sie den Stausee, Kommandant.", it:"Ha una voce da ninna nanna. E dietro la ninna nanna, le loro macchine di terza generazione escono tutte insieme. Riempite il serbatoio, comandante.", pt:"Ela tem voz de canção de ninar. E atrás da canção de ninar, as máquinas de terceira geração deles saem todas ao mesmo tempo. Encha o reservatório, comandante.", ru:"У неё голос колыбельной. А за колыбельной все их машины третьего поколения выходят разом. Наполняйте водохранилище, командир.", zh:"她的声音像摇篮曲。而在摇篮曲的背后，他们的第三代机器正同时倾巢而出。把水库灌满吧，指挥官。", ar:"صوتها كتهويدة. ومن خلف التهويدة تخرج آلاتهم من الجيل الثالث كلها في وقت واحد. املأوا الخزان، أيها القائد."} },
    ]; }},
    {when:(g,c)=>c.floods>=1 && c.flood && c.flood.t>6, who:'sol', txt:{fr:"Regardez ce que l'eau a laissé dans le lit. La prochaine fois, ils réfléchiront avant d'y descendre. Nous aussi.", en:"Look what the water left in the riverbed. Next time they will think before walking down into it. So will we.", es:"Mire lo que ha dejado el agua en el lecho. La próxima vez se lo pensarán antes de bajar. Nosotros también.", de:"Sehen Sie, was das Wasser im Flussbett zurückgelassen hat. Beim nächsten Mal überlegen sie es sich, bevor sie hinabsteigen. Wir auch.", it:"Guardate cosa ha lasciato l'acqua nel letto. La prossima volta ci penseranno prima di scendere. Noi pure.", pt:"Veja o que a água deixou no leito. Da próxima vez, eles pensarão antes de descer. Nós também.", ru:"Посмотрите, что вода оставила в русле. В следующий раз они подумают, прежде чем спускаться. Мы тоже.", zh:"看看水在河床里留下了什么。下次他们下去之前会先掂量掂量。我们也一样。", ar:"انظروا ما تركه الماء في المجرى. في المرة القادمة سيفكّرون قبل أن ينزلوا إليه. ونحن أيضًا."}},
  ],
});
