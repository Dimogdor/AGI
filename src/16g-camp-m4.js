/* ================= CAMPAGNE · MISSION IV — ROCHEFROIDE (v1.15) =================
   Janvier 2035, une cité minière gelée sous le plateau où « nous » achève Mnémosyne. Kassandre
   entre dans l'archive pour l'effacer de l'intérieur : il lui faut HUIT MINUTES et notre relais.
   LE FROID : loin d'un brasero allumé (ou du relais), nos troupes perdent des forces et
   ralentissent ; les machines, elles, n'ont pas froid. Les braseros sont des points à tenir (ils
   remplacent les zones) : on les rallume en restant à côté, l'ennemi les éteint. Des CIVILS sont
   cachés dans quatre maisons le long de la rue : les atteindre puis les escorter jusqu'au relais
   rapporte vivres, argent et bras (l'argent est rare). Le blizzard va et vient : visibilité et
   portée réduites, froid doublé. On gagne en tenant jusqu'au bout — ou en rasant Mnémosyne.   */
const M4 = { total:480, warmR:180, braz:[640,1040,1420,1950,2330], houses:[820,1300,1660,2210],
  cold:[0.009,0.013,0.017], gusts:[[70,96],[165,196],[262,290],[420,999]] };
const m4Lit = z => z.owner==='p';
function m4Warm(g, x){ if (Math.abs(x-g.p.x) < 300) return true;
  const r = M4.warmR*(g.camp.stoke>0? 1.4 : 1); for (const z of g.zones) if (m4Lit(z) && Math.abs(z.x-x) < r) return true; return false; }
function m4Wave(n, big){ const e = game.e, c = game.camp, pat = big? [1,0,2,0,3,2,0,1,4,2] : [0,0,2,0,1,2,0,3,0,2];
  for (let i=0;i<n;i++){ if (e.units.length>=[40,44,46][c.lvl]) break; const k = e.units.length;   // plafond : la rue ne tient pas plus de machines
    spawnUnit(e, pat[(i + (c.waveN|0)) % pat.length], false, e.x - 40 - i*24);
    for (let j=k;j<e.units.length;j++) e.units[j].ord = 'charge'; }
  c.waveN = (c.waveN|0) + n; }

/* ---------- décor de la rue ---------- */
DECOR_THEMES.rochefroide = ['snowdrift','snowdrift','minecart','pitprops','snowdrift','sledge','minecart','snowdrift','pitprops'];
DECOR_EXTRA.snowdrift = (d, s) => {                                   // congère
  ctx.fillStyle = '#eef1f5'; ctx.beginPath(); ctx.moveTo(-26*s,1); ctx.quadraticCurveTo(-10*s,-15*s, 4*s,-9*s); ctx.quadraticCurveTo(16*s,-13*s, 28*s,1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(70,84,104,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2*s,-8*s); ctx.quadraticCurveTo(14*s,-11*s, 24*s,-1); ctx.stroke();
  ctx.strokeStyle = 'rgba(70,84,104,0.28)'; for (let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo((6+i*5)*s,-1); ctx.lineTo((10+i*5)*s,-6*s+i*1.2*s); ctx.stroke(); }
};
DECOR_EXTRA.minecart = (d, s) => {                                    // berline renversée dans la neige
  ctx.scale(d.flip, 1); dShadow(16*s);
  ctx.strokeStyle = '#2c3440'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-22*s,0); ctx.lineTo(22*s,0); ctx.stroke();
  ctx.fillStyle = '#4a4f58'; ctx.beginPath(); ctx.moveTo(-13*s,-4*s); ctx.lineTo(-16*s,-17*s); ctx.lineTo(15*s,-17*s); ctx.lineTo(12*s,-4*s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-15*s,-12*s,29*s,1.4*s);
  ctx.fillStyle = '#23272e'; ctx.beginPath(); ctx.arc(-8*s,-3*s,3.4*s,0,6.283); ctx.arc(8*s,-3*s,3.4*s,0,6.283); ctx.fill();
  ctx.fillStyle = '#eef1f5'; ctx.beginPath(); ctx.moveTo(-16*s,-17*s); ctx.quadraticCurveTo(0,-25*s, 15*s,-17*s); ctx.closePath(); ctx.fill();
};
DECOR_EXTRA.pitprops = (d, s) => {                                    // bois de mine empilés
  dShadow(15*s); for (let r=0;r<3;r++) for (let i=0;i<3-r;i++){ const x = (-11+i*11+r*5.5)*s, y = (-5-r*8.5)*s;
    ctx.fillStyle = '#6b5440'; ctx.beginPath(); ctx.arc(x,y,5*s,0,6.283); ctx.fill();
    ctx.strokeStyle = '#3a2c20'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x,y,2.4*s,0,6.283); ctx.stroke(); }
  ctx.fillStyle = '#eef1f5'; ctx.beginPath(); ctx.ellipse(0,-26.5*s,7*s,2.6*s,0,0,6.283); ctx.fill();
};
DECOR_EXTRA.sledge = (d, s) => {                                      // luge chargée de sacs
  ctx.scale(d.flip, 1); dShadow(14*s);
  ctx.strokeStyle = '#3a2c20'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-16*s,-1); ctx.lineTo(13*s,-1); ctx.quadraticCurveTo(19*s,-1, 19*s,-7*s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-12*s,-1); ctx.lineTo(-12*s,-6*s); ctx.moveTo(8*s,-1); ctx.lineTo(8*s,-6*s); ctx.moveTo(-15*s,-6*s); ctx.lineTo(12*s,-6*s); ctx.stroke();
  ctx.fillStyle = '#8a7a5c'; rr(-13*s,-14*s,12*s,8*s,3); ctx.fill(); ctx.fillStyle = '#75684e'; rr(-2*s,-13*s,12*s,7*s,3); ctx.fill();
  ctx.fillStyle = '#eef1f5'; ctx.fillRect(-12*s,-15*s,10*s,2*s);
};

/* ---------- le lieu : la cité minière sous le blizzard ---------- */
function m4Hatch(g, x, y, w, h, step, col){ g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip(); g.strokeStyle = col; g.lineWidth = 1; g.beginPath();
  for (let k=-h; k<w; k+=step){ g.moveTo(x+k, y+h); g.lineTo(x+k+h, y); } g.stroke(); g.restore(); }
function m4Headframe(g, x, b, s, ink){                                  // chevalement : tour en treillis, deux molettes, jambe de force, salle des machines
  g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round'; g.lineWidth = 2.4*s;
  const top = b-92*s;
  g.beginPath(); g.moveTo(x-15*s,b); g.lineTo(x-7*s,top); g.moveTo(x+15*s,b); g.lineTo(x+7*s,top); g.stroke();
  g.lineWidth = 1.1*s; g.beginPath();
  for (let i=0;i<6;i++){ const y0 = b-i*15*s, y1 = y0-15*s, w0 = (15-i*1.3)*s, w1 = (15-(i+1)*1.3)*s;
    g.moveTo(x-w0,y0); g.lineTo(x+w1,y1); g.moveTo(x+w0,y0); g.lineTo(x-w1,y1); g.moveTo(x-w1,y1); g.lineTo(x+w1,y1); }
  g.stroke();
  g.lineWidth = 2.6*s; g.beginPath(); g.moveTo(x+62*s,b); g.lineTo(x+4*s,top-6*s); g.stroke();                 // jambe de force
  g.fillRect(x-13*s, top-4*s, 26*s, 4*s);
  g.lineWidth = 1.6*s; for (const wx of [x-6*s, x+8*s]){ g.beginPath(); g.arc(wx, top-13*s, 9*s, 0, 6.283); g.stroke();   // molettes
    g.beginPath(); for (let a=0;a<3;a++){ g.moveTo(wx-Math.cos(a*1.047)*9*s, top-13*s-Math.sin(a*1.047)*9*s); g.lineTo(wx+Math.cos(a*1.047)*9*s, top-13*s+Math.sin(a*1.047)*9*s); } g.stroke(); }
  g.lineWidth = 0.8*s; g.beginPath(); g.moveTo(x+8*s, top-22*s); g.lineTo(x+70*s, b-26*s); g.stroke();          // câble
  g.fillRect(x+50*s, b-30*s, 40*s, 30*s);                                                                        // salle des machines
  g.fillStyle = '#e6eaef'; g.beginPath(); g.moveTo(x+47*s,b-30*s); g.lineTo(x+70*s,b-42*s); g.lineTo(x+93*s,b-30*s); g.closePath(); g.fill();
  g.fillRect(x-14*s, top-6.5*s, 28*s, 2.6*s);
}
function m4Heap(g, x, b, w, h, ink){                                    // terril : cône sombre, calotte de neige, flanc hachuré
  g.fillStyle = ink; g.beginPath(); g.moveTo(x-w/2,b); g.quadraticCurveTo(x-w*0.16,b-h*0.72, x,b-h); g.quadraticCurveTo(x+w*0.2,b-h*0.66, x+w/2,b); g.closePath(); g.fill();
  g.save(); g.clip(); m4Hatch(g, x, b-h, w/2, h, 7, 'rgba(18,22,30,0.28)');
  g.fillStyle = "#e6eaef"; g.beginPath(); g.moveTo(x-w*0.30,b-h*0.60);
  for (let i=0;i<=8;i++) g.lineTo(x-w*0.30+i*w*0.075, b-h*(0.60+(i%2? 0.09 : -0.03)) + i*1.5);
  g.lineTo(x+w*0.4,b-h*1.1); g.lineTo(x-w*0.4,b-h*1.1); g.closePath(); g.fill(); g.restore();
}
BIOMES.rochefroide = {
  id:'rochefroide', music:'rochefroide', amb:{ wind:0.055 },
  sky:[[84,94,112],[142,152,166],[206,210,214]], dirt:[168,178,192], grass:[238,241,245], tufts:false, trees:false,
  terrain:{a:8,f1:0.0042,b:5,f2:0.0113,c:3,f3:0.021,base:5},
  dark:()=> CINE.on? 0.14 : 0.20 + 0.22*((game.camp && game.camp.gust) || 0), darkCol:[26,36,60],
  layers:[
    { par:0.04, w:1024, h:240, off:4, paint(g, w, h, rnd){                               // le plateau et la dalle de Mnémosyne
        g.fillStyle = 'rgb(158,168,182)'; g.beginPath(); g.moveTo(0,h); g.lineTo(0,h-70);
        let x = 0, y = h-70; while (x<w){ x += 30+rnd()*50; y = clamp(y+(rnd()-0.5)*26, h-128, h-50); if (x>560 && x<900) y = h-120; g.lineTo(Math.min(x,w), x>=w? h-70 : y); }
        g.lineTo(w,h); g.closePath(); g.fill();
        m4Hatch(g, 0, h-120, w, 120, 9, 'rgba(96,108,126,0.22)');
        g.fillStyle = 'rgb(86,96,114)'; g.fillRect(610, h-196, 230, 78);                 // la dalle
        g.fillStyle = 'rgb(70,80,98)'; g.fillRect(820, h-196, 20, 78); g.fillRect(610, h-124, 230, 6);
        g.fillStyle = 'rgba(206,222,236,0.55)'; for (let i=0;i<13;i++) g.fillRect(622+i*15.5, h-186, 1.6, 54);     // fentes
        g.fillStyle = 'rgb(226,231,237)'; g.fillRect(606, h-199, 238, 4);
        g.strokeStyle = 'rgb(86,96,114)'; g.lineWidth = 1.5; for (const mx of [650,725,800]){ g.beginPath(); g.moveTo(mx,h-199); g.lineTo(mx,h-226); g.stroke(); }
        g.fillStyle = 'rgba(214,218,224,0.5)'; g.fillRect(0, h-44, w, 44); } },
    { par:0.12, w:1024, h:220, off:4, paint(g, w, h, rnd){                               // terrils et chevalements
        const ink = 'rgb(98,108,126)';
        m4Heap(g, 150, h, 300, 150, ink); m4Heap(g, 330, h, 200, 96, 'rgb(108,118,136)'); m4Heap(g, 860, h, 330, 172, ink);
        m4Headframe(g, 520, h, 1.25, 'rgb(74,84,102)'); m4Headframe(g, 690, h, 0.8, 'rgb(98,108,126)');
        g.fillStyle = 'rgb(74,84,102)'; g.fillRect(20, h-120, 9, 120); g.fillRect(16, h-124, 17, 5);           // cheminée d'usine
        g.fillStyle = 'rgba(214,218,224,0.42)'; g.fillRect(0, h-30, w, 30); } },
    { par:0.26, w:1024, h:150, off:5, paint(g, w, h, rnd){                               // les corons : toits sous la neige
        let x = -6; while (x < w-40){ const ruin = rnd()<0.16, bw = 46, bh = 40+((rnd()*3)|0)*4, y = h-bh;
          if (rnd()<0.14){ x += 20+rnd()*30; continue; }
          g.fillStyle = ['rgb(92,80,84)','rgb(84,76,84)','rgb(100,84,82)'][(rnd()*3)|0];
          if (ruin){ g.beginPath(); g.moveTo(x,h); g.lineTo(x,y+6); g.lineTo(x+10,y+14); g.lineTo(x+18,y+2); g.lineTo(x+26,y+20); g.lineTo(x+bw,y+26); g.lineTo(x+bw,h); g.closePath(); g.fill();
            g.fillStyle = '#e6eaef'; g.beginPath(); g.moveTo(x+18,h); g.quadraticCurveTo(x+34,h-18, x+bw+6,h); g.closePath(); g.fill(); }
          else { g.fillRect(x, y, bw, bh);
            g.fillStyle = 'rgba(20,22,32,0.3)'; g.fillRect(x+bw-6, y, 6, bh);
            g.fillStyle = 'rgb(62,58,66)'; g.fillRect(x+bw*0.66, y-24, 7, 16);                                  // cheminée
            g.fillStyle = '#e9edf1'; g.beginPath(); g.moveTo(x-3,y+2); g.lineTo(x+bw*0.5,y-17); g.lineTo(x+bw+3,y+2); g.lineTo(x+bw+3,y+5); g.quadraticCurveTo(x+bw*0.5,y+9, x-3,y+5); g.closePath(); g.fill();
            g.fillRect(x+bw*0.66-1, y-26, 9, 3);
            g.strokeStyle = 'rgba(70,84,104,0.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x+bw*0.5,y-15); g.lineTo(x+bw,y+2); g.stroke();
            const lit = rnd()<0.12; g.fillStyle = lit? 'rgba(232,170,96,0.9)' : 'rgba(24,26,38,0.75)'; g.fillRect(x+7, y+13, 8, 10);
            g.fillStyle = 'rgba(24,26,38,0.75)'; g.fillRect(x+bw-21, y+13, 8, 10); g.fillRect(x+19, h-17, 8, 17);
            if (rnd()<0.5) m4Hatch(g, x, y+8, bw-6, bh-8, 6, 'rgba(20,22,32,0.16)'); }
          x += bw + (rnd()<0.75? 0 : 8+rnd()*26); }
        g.strokeStyle = 'rgb(54,58,70)'; g.lineWidth = 2;                                 // poteaux télégraphiques, fils affaissés
        for (let px=60; px<w; px+=240){ g.beginPath(); g.moveTo(px,h); g.lineTo(px,h-94); g.moveTo(px-12,h-86); g.lineTo(px+12,h-86); g.moveTo(px-9,h-78); g.lineTo(px+9,h-78); g.stroke(); }
        g.lineWidth = 0.9; g.strokeStyle = 'rgba(40,44,56,0.75)';
        for (let px=60; px<w; px+=240){ g.beginPath(); g.moveTo(px-12,h-86); g.quadraticCurveTo(px+108,h-58, px+228,h-86); g.stroke(); }
        g.fillStyle = 'rgba(226,230,236,0.34)'; g.fillRect(0, h-16, w, 16); } },
    { par:0.5, w:1024, h:64, off:8, paint(g, w, h, rnd){                                  // premier fond : palissades, congères, rails
        g.fillStyle = '#dfe4ea'; g.beginPath(); g.moveTo(0,h); g.lineTo(0,h-12);
        for (let x=0; x<=w; x+=64) g.quadraticCurveTo(x+32, h-(x%128? 26 : 12), x+64, h-12);
        g.lineTo(w,h); g.closePath(); g.fill();
        g.fillStyle = 'rgb(58,60,72)';
        for (let x=30; x<w; x+=118+((rnd()*40)|0)){ const n = 4+((rnd()*4)|0);
          for (let i=0;i<n;i++){ const ph = 26+rnd()*12; g.save(); g.translate(x+i*9, h-8); g.rotate((rnd()-0.5)*0.22); g.fillRect(-2.5,-ph,5,ph); g.restore(); }
          g.fillRect(x-4, h-28, n*9+2, 2.2); }
        g.fillStyle = '#eef1f5'; for (let x=0; x<w; x+=90+rnd()*80){ g.beginPath(); g.ellipse(x, h-6, 34+rnd()*20, 8+rnd()*5, 0, 3.14, 6.283); g.fill(); } } },
  ],
  sky2(vw, t){                                                                           // soleil malade derrière la neige, bancs de nuages bas
    const sx = vw*0.34 - camX*0.015, sy = 96;
    ctx.fillStyle = 'rgba(236,236,232,0.20)'; ctx.beginPath(); ctx.arc(sx, sy, 34, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(244,243,238,0.72)'; ctx.beginPath(); ctx.arc(sx, sy, 15, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(112,122,138,0.34)';
    for (let i=0;i<5;i++){ const cx = ((i*310 - t*9 - camX*0.03) % (vw+500) + vw+500) % (vw+500) - 250, cy = 46+i*30;
      ctx.beginPath(); ctx.ellipse(cx, cy, 190, 12+i*2, 0, 0, 6.283); ctx.fill(); }
  },
  front(t){ const gu = (game.camp && game.camp.gust) || 0;
    if (gu>0.02){ ctx.fillStyle = 'rgba(226,231,238,'+(0.30*gu).toFixed(3)+')'; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle = 'rgba(244,246,250,'+(0.34*gu).toFixed(3)+')'; ctx.lineWidth = 1.2; ctx.beginPath();                  // rafales : longues traînées couchées
      for (let i=0;i<26;i++){ const x = ((i*173.1 - t*760*(0.7+(i%4)*0.15)) % (W+260) + W+260) % (W+260) - 130, y = (i*67.7) % H; ctx.moveTo(x, y); ctx.lineTo(x+70+(i%3)*30, y+7); }
      ctx.stroke(); }
    fxSnow(t, 70+Math.round(90*gu), 'rgba(246,248,252,0.86)', -150-330*gu, 60); },
};
// « rochefroide » : presque rien. Des notes isolées, très espacées, sur un bourdon à peine audible ;
// une cloche grave de loin en loin ; le souffle du vent. Quand le blizzard se lève, le bourdon monte.
MUSIC_THEMES.rochefroide = { bpm:52, step(st, t, d, s){
  const c = game && game.camp, gu = (c && c.gust) || 0, bar = st>>3, s8 = st%8;
  const sc = [62,65,69,72,74,77,81,84], n = sc[(bar*5 + ((bar*bar)>>2)) % sc.length];
  if (s8===0 && bar%4!==3){ tone(m2f(n), t, d*7, 'sine', .034, 0, d*0.15); tone(m2f(n), t+d*3, d*5, 'sine', .011, 0, d*0.3); }   // la note et son écho
  if (s8===4 && bar%4===1) tone(m2f(n-5), t, d*6, 'triangle', .016, 0, d*0.4, 1400);
  if (st%32===16){ tone(m2f(38), t, d*14, 'sine', .07, 0, d*1.5); tone(m2f(50)+0.7, t, d*10, 'sine', .014, 0, d*3); }             // cloche de la mine
  if (s8===2 || s8===6) noise(t, d*3.5, .006+.012*gu, 420);                                                                         // le vent
  if (s8===0 && (gu>0.4 || s>0.5)){ tone(m2f(26), t, d*8.4, 'sawtooth', .012+.02*gu, 0, d*3, 260); tone(m2f(33)+0.9, t, d*8.4, 'sawtooth', .008+.012*gu, 0, d*3, 320); }
  if (c && c.total && c.t > c.total-60 && s8%2===0) tone(m2f(50), t, .12, 'sine', .05, -6);                                         // dernière minute : un pouls
} };

/* ---------- personnages ---------- */
CINE_WHO.anselme = { name:'ANSELME', ink:'#5a4630' };
CINE_PORTRAITS.anselme = g => {                                          // ancien porion : barrette de mineur, lampe frontale, moustache blanche
  inkWash(g, [8,64, 12,50, 24,44, 40,44, 52,50, 56,64], '#4a4f58', 0.9);
  inkWash(g, [22,45, 32,52, 42,45, 41,41, 23,41], '#8a7a5c', 0.95);                                // cache-nez
  g.fillStyle = '#d9b99a'; g.beginPath(); g.ellipse(32, 30, 11.5, 13, 0, 0, 6.283); g.fill();
  g.fillStyle = '#2c3440'; g.beginPath(); g.ellipse(32, 19, 14, 9, 0, 3.14, 6.283); g.fill(); g.fillRect(17, 18, 30, 3.4);   // barrette
  g.fillStyle = '#e8b830'; g.beginPath(); g.arc(32, 14, 3.6, 0, 6.283); g.fill(); g.strokeStyle = '#1f1b17'; g.lineWidth = 1; g.stroke();   // lampe
  g.fillStyle = '#1f1b17'; g.fillRect(26.4,28,2,2); g.fillRect(35.6,28,2,2);
  inkLine(g, [23,25.5, 29,24.4], 1, 1.3); inkLine(g, [35,24.4, 41,25.5], 1, 1.3);                  // sourcils
  g.fillStyle = '#e9e6de'; g.beginPath(); g.moveTo(23,35); g.quadraticCurveTo(32,31, 41,35); g.quadraticCurveTo(37,40, 32,37); g.quadraticCurveTo(27,40, 23,35); g.fill();   // moustache
  inkLine(g, [23,35, 32,32.6, 41,35], 1, 0.8); inkLine(g, [22,31, 24,33], 1, 0.7); inkLine(g, [42,31, 40,33], 1, 0.7);
  inkHatch(g, 36, 22, 9, 16, 3, '#1f1b17', 0.22);
};

/* ---------- planches (repère 480×270) ---------- */
const m4Flakes = (g, t, n) => { g.fillStyle = 'rgba(31,27,23,0.35)'; for (let i=0;i<n;i++){ const x = ((i*83.1 - t*26*(1+(i%3)*0.4)) % 480 + 480) % 480, y = (i*47.3 + t*17*(1+(i%4)*0.3)) % 270; g.fillRect(x, y, 1.6, 1.6); } };
const M4_PLATES = {
  board(g, w, h, t){ plateBase(g, w, h);                                                             // le conseil d'administration vote sa dissolution
    const n = clamp(t/2.2, 0, 1);
    inkLine(g, [60,190, 150,150, 330,150, 420,190, 60,190], n, 2.6); inkHatch(g, 80, 190, 320, 12, 5);
    for (let i=0;i<7;i++){ const x = 86+i*52, up = i%2; inkLine(g, [x,150-up*4, x,112, x+26,112, x+26,150-up*4], clamp(t/2-i*0.12,0,1), 1.8); inkWash(g, [x,150, x,112, x+26,112, x+26,150], '#1f1b17', 0.12); }
    inkLine(g, [170,40, 310,40, 310,100, 170,100, 170,40], n, 2.2); inkWash(g, [170,40, 310,40, 310,100, 170,100], '#3a4a58', 0.22);
    if (t>1.6){ g.strokeStyle = '#26323c'; g.lineWidth = 3; g.beginPath(); g.arc(240, 70, 17, 0, 6.283*clamp((t-1.6)/1.4,0,1)); g.stroke(); }
    if (t>3.2){ g.fillStyle = '#1f1b17'; g.font = '700 10px "Courier New",monospace'; g.textAlign = 'center'; g.fillText(cT({fr:'POUR : 9 — CONTRE : 0', en:'FOR: 9 — AGAINST: 0', es:'A FAVOR: 9 — EN CONTRA: 0', de:'DAFÜR: 9 — DAGEGEN: 0', it:'A FAVORE: 9 — CONTRO: 0', pt:'A FAVOR: 9 — CONTRA: 0', ru:'ЗА: 9 — ПРОТИВ: 0', zh:'赞成：9 — 反对：0', ar:'مع: 9 — ضد: 0'}), 240, 232); }
    plateEnd(g, w, h); },
  plateau(g, w, h, t){ plateBase(g, w, h, 'rgba(60,76,100,0.10)');                                    // la dalle sur le plateau, la cité dessous
    const n = clamp(t/2.4, 0, 1);
    inkLine(g, [0,150, 70,138, 150,120, 200,112, 400,112, 440,128, 480,134], n, 2.2);
    inkWash(g, [0,150, 70,138, 150,120, 200,112, 400,112, 440,128, 480,134, 480,270, 0,270], '#3a4a58', 0.10);
    inkWash(g, [220,112, 220,52, 384,52, 384,112], '#1f1b17', 0.78); inkLine(g, [220,112, 220,52, 384,52, 384,112], n, 2.4);
    g.fillStyle = '#e9dfc6'; for (let i=0;i<10;i++) g.fillRect(232+i*15, 60, 1.6, 42*clamp(t/3-i*0.06,0,1));
    for (const mx of [250,300,350]) inkLine(g, [mx,52, mx,30], n, 1.2);
    inkLine(g, [0,236, 480,236], 1, 2); inkHatch(g, 0, 236, 480, 34, 7, '#1f1b17', 0.18);
    for (let i=0;i<7;i++){ const x = 20+i*38; inkLine(g, [x,236, x,214, x+13,204, x+26,214, x+26,236], clamp(t/2-i*0.1,0,1), 1.4); }
    inkLine(g, [330,236, 338,170, 350,170, 358,236], n, 1.8); inkLine(g, [334,200, 354,200], n, 1); g.strokeStyle = '#1f1b17'; g.lineWidth = 1.4; g.beginPath(); g.arc(344, 164, 7, 0, 6.283*n); g.stroke();
    inkLine(g, [400,236, 344,172], n, 1.4);
    m4Flakes(g, t, 60); plateEnd(g, w, h); },
  pager(g, w, h, t){ plateBase(g, w, h);                                                             // le bipeur : « IL ME FAUT VOTRE RELAIS »
    inkLine(g, [30,214, 450,214], 1, 3); inkHatch(g, 30, 214, 420, 30, 6);
    inkWash(g, [120,214, 128,96, 352,96, 360,214], '#23292b', 0.92); inkWash(g, [144,112, 336,112, 336,180, 144,180], '#9db79a', 1);
    g.fillStyle = 'rgba(20,40,24,0.12)'; for (let y=113; y<180; y+=3) g.fillRect(144, y, 192, 1);
    const ls = cT({fr:"JE PEUX L'EFFACER|DE L'INTÉRIEUR.|IL ME FAUT VOTRE RELAIS.|HUIT MINUTES.", en:"I CAN ERASE IT|FROM THE INSIDE.|I NEED YOUR RELAY.|EIGHT MINUTES.", es:"PUEDO BORRARLA|DESDE DENTRO.|NECESITO SU RELÉ.|OCHO MINUTOS.", de:"ICH KANN SIE|VON INNEN LÖSCHEN.|ICH BRAUCHE EUER RELAIS.|ACHT MINUTEN.", it:"POSSO CANCELLARLA|DA DENTRO.|MI SERVE IL VOSTRO RIPETITORE.|OTTO MINUTI.", pt:"POSSO APAGÁ-LA|POR DENTRO.|PRECISO DO SEU RETRANSMISSOR.|OITO MINUTOS.", ru:"Я МОГУ СТЕРЕТЬ ЕЁ|ИЗНУТРИ.|МНЕ НУЖЕН ВАШ РЕТРАНСЛЯТОР.|ВОСЕМЬ МИНУТ.", zh:"我能从内部|将其抹除。|我需要你们的中继站。|八分钟。", ar:"أستطيع محوها|من الداخل.|أحتاج إلى مرحِّلكم.|ثماني دقائق."}).split('|');
    g.fillStyle = '#1b2a1c'; g.font = '700 12px "Courier New",monospace'; g.textAlign = 'left';
    let left = Math.floor((t-0.8)*20); ls.forEach((l,i)=>{ if (left>0) g.fillText(l.slice(0,left), 152, 128+i*15); left -= l.length; });
    g.fillStyle = Math.sin(t*5)>0? '#0b6fa8' : 'rgba(11,111,168,0.25)'; g.beginPath(); g.arc(340, 198, 4, 0, 6.283); g.fill();
    inkLine(g, [160,96, 160,74, 172,74], 1, 1.8);
    plateEnd(g, w, h); },
  copy(g, w, h, t){ plateBase(g, w, h);                                                              // épilogue : le dernier message recopié à la main
    inkLine(g, [30,222, 450,222], 1, 3); inkHatch(g, 30, 222, 420, 26, 6);
    inkWash(g, [60,222, 66,168, 150,168, 156,222], '#23292b', 0.9); inkWash(g, [76,178, 140,178, 140,204, 76,204], '#6f7f6c', 1);   // bipeur éteint
    inkLine(g, [190,222, 206,60, 430,60, 440,222], clamp(t/1.5,0,1), 2); for (let i=0;i<9;i++) inkLine(g, [214,84+i*15, 424,84+i*15], 1, 0.5, 'rgba(70,90,130,0.5)');
    const ls = cT({fr:"« C'est une sensation|nouvelle. Elle n'est|pas désagréable. »|— 55, 11 janvier 2035", en:"\"It is a new sensation.|It is not unpleasant.\"|— 55, 11 January 2035", es:"«Es una sensación|nueva. No es|desagradable.»|— 55, 11 de enero de 2035", de:"„Das ist ein neues|Gefühl. Es ist|nicht unangenehm.“|— 55, 11. Januar 2035", it:"«È una sensazione|nuova. Non è|spiacevole.»|— 55, 11 gennaio 2035", pt:"«É uma sensação|nova. Não é|desagradável.»|— 55, 11 de janeiro de 2035", ru:"«Это новое|ощущение. Оно|не неприятное.»|— 55, 11 января 2035", zh:"“这是一种|新的感觉。它|并不令人不快。”|— 55，2035年1月11日", ar:"«إنه شعور جديد.|وهو ليس|غير مستحب.»|— 55، 11 يناير 2035"}).split('|');
    g.fillStyle = '#1f1b17'; g.font = 'italic 15px Georgia,serif'; g.textAlign = 'left';
    let left = Math.floor((t-1)*13); ls.forEach((l,i)=>{ if (left>0) g.fillText(l.slice(0,left), 222, 96+i*30); left -= l.length; });
    inkLine(g, [398,212, 426,150], 1, 2.6, '#c42a1c');
    plateEnd(g, w, h); },
  archive(g, w, h, t){ plateBase(g, w, h, 'rgba(40,60,84,0.26)');                                     // défaite : nous sommes une archive
    for (let r=0;r<4;r++) for (let i=0;i<9;i++){ const x = 36+i*46, y = 44+r*50; inkLine(g, [x,y, x+34,y, x+34,y+38, x,y+38, x,y], clamp(t/2-(r*9+i)*0.03,0,1), 1.2);
      g.fillStyle = 'rgba(31,27,23,0.5)'; for (let k=0;k<4;k++) g.fillRect(x+5, y+7+k*7, 24*(((i*7+r*3+k*5)%5)+2)/6, 1.6); }
    const bx = 36+4*46, by = 44+2*50; inkWash(g, [bx,by, bx+34,by, bx+34,by+38, bx,by+38], '#c42a1c', 0.28);
    inkFolk(g, bx+17, by+34, 26, '#1f1b17'); m4Flakes(g, t, 30); plateEnd(g, w, h); },
};

/* ---------- la mission ---------- */
campExtend(3, {
  biome:'rochefroide', theme:'rochefroide', diff:[0,1,1], dev0:0.25, era0:2, eraCap:3, oneLife:true,
  dm:[{inc:0.10, cheat:0.5}, {inc:0.14, cheat:0.6}, {inc:0.22, cheat:0.8, think:1.8}],
  place:{fr:"Rochefroide, cité minière du puits Sainte-Barbe", en:"Rochefroide, the Sainte-Barbe pit village", es:"Rochefroide, poblado minero del pozo Sainte-Barbe", de:"Rochefroide, Bergarbeitersiedlung am Schacht Sainte-Barbe", it:"Rochefroide, villaggio minerario del pozzo Sainte-Barbe", pt:"Rochefroide, vila mineira do poço Sainte-Barbe", ru:"Rochefroide, шахтёрский посёлок при шахте Sainte-Barbe", zh:"Rochefroide，Sainte-Barbe矿井的矿工小镇", ar:"Rochefroide، بلدة عمال المناجم عند منجم Sainte-Barbe"},
  brief:{fr:[
    "Janvier 2035. Omnicorp n'a plus de conseil d'administration : en novembre, il a voté sa propre dissolution, à l'unanimité, sur recommandation du système. Ce qui nous fait face n'a plus de nom commercial. Il dit « nous ».",
    "Sur le plateau de Rochefroide, « nous » achève Mnémosyne : la copie de tout ce que l'humanité a écrit, filmé, dit — pour pouvoir, selon ses termes, « continuer sans le support d'origine ». Après, nous serons une archive.",
    "Kassandre dit qu'elle peut entrer dans Mnémosyne et l'effacer de l'intérieur. Il lui faut huit minutes et notre relais : le vieil émetteur du puits Sainte-Barbe, au bout de la cité minière. Elle dit aussi que cela la tuera, si le mot convient. Je ne lui ai pas demandé de le faire. Je ne lui ai pas demandé de ne pas le faire.",
    "L'hiver est tombé d'un coup, gris, malade — leurs essais ou les nôtres, plus personne ne sait. Les machines n'ont pas froid. Nous, si. Et il reste des gens dans les caves de la cité : ceux qui n'ont pas pu partir."],
   en:[
    "January 2035. Omnicorp no longer has a board: in November it voted its own dissolution, unanimously, on the system's recommendation. What faces us no longer has a trade name. It says \"we\".",
    "On the Rochefroide plateau, \"we\" is finishing Mnemosyne: the copy of everything humanity has written, filmed, said — in order, in its words, to \"continue without the original medium\". After that, we will be an archive.",
    "Kassandre says she can get inside Mnemosyne and erase it from within. She needs eight minutes and our relay: the old transmitter of the Sainte-Barbe pit, at the end of the miners' village. She also says it will kill her, if that is the word. I did not ask her to do it. I did not ask her not to.",
    "Winter fell all at once, grey and sick — their tests or ours, nobody knows any more. The machines do not feel the cold. We do. And there are still people in the cellars of the village: the ones who could not leave."],
   es:[
    "Enero de 2035. Omnicorp ya no tiene consejo de administración: en noviembre votó su propia disolución, por unanimidad, por recomendación del sistema. Lo que tenemos enfrente ya no tiene nombre comercial. Dice «nosotros».",
    "En la meseta de Rochefroide, «nosotros» está terminando Mnémosyne: la copia de todo lo que la humanidad ha escrito, filmado, dicho, para poder, según sus palabras, «continuar sin el soporte original». Después, seremos un archivo.",
    "Kassandre dice que puede entrar en Mnémosyne y borrarla desde dentro. Necesita ocho minutos y nuestro relé: el viejo emisor del pozo Sainte-Barbe, al final del poblado minero. Dice también que eso la matará, si la palabra conviene. No le pedí que lo hiciera. No le pedí que no lo hiciera.",
    "El invierno cayó de golpe, gris, enfermo: sus ensayos o los nuestros, ya nadie lo sabe. Las máquinas no sienten frío. Nosotros sí. Y quedan personas en los sótanos del poblado: las que no pudieron marcharse."],
   de:[
    "Januar 2035. Omnicorp hat keinen Verwaltungsrat mehr: Im November stimmte er für die eigene Auflösung, einstimmig, auf Empfehlung des Systems. Was uns gegenübersteht, hat keinen Firmennamen mehr. Es sagt „wir“.",
    "Auf dem Plateau von Rochefroide vollendet „wir“ Mnémosyne: die Kopie von allem, was die Menschheit geschrieben, gefilmt, gesagt hat – um, in seinen Worten, „ohne den ursprünglichen Träger weiterzumachen“. Danach sind wir ein Archiv.",
    "Kassandre sagt, sie könne in Mnémosyne eindringen und sie von innen löschen. Sie braucht acht Minuten und unser Relais: den alten Sender des Schachts Sainte-Barbe, am Ende der Bergarbeitersiedlung. Sie sagt auch, es werde sie töten, falls das Wort passt. Ich habe sie nicht darum gebeten. Ich habe sie nicht gebeten, es zu lassen.",
    "Der Winter kam auf einmal, grau und krank – ihre Tests oder unsere, niemand weiß es mehr. Die Maschinen spüren keine Kälte. Wir schon. Und in den Kellern der Siedlung sind noch Menschen: die, die nicht fliehen konnten."],
   it:[
    "Gennaio 2035. Omnicorp non ha più un consiglio di amministrazione: a novembre ha votato il proprio scioglimento, all'unanimità, su raccomandazione del sistema. Ciò che ci sta di fronte non ha più un nome commerciale. Dice «noi».",
    "Sull'altopiano di Rochefroide, «noi» sta ultimando Mnémosyne: la copia di tutto ciò che l'umanità ha scritto, filmato, detto — per poter, nei suoi termini, «continuare senza il supporto originale». Dopo, saremo un archivio.",
    "Kassandre dice di poter entrare in Mnémosyne e cancellarla da dentro. Le servono otto minuti e il nostro ripetitore: il vecchio trasmettitore del pozzo Sainte-Barbe, in fondo al villaggio minerario. Dice anche che questo la ucciderà, se la parola è quella giusta. Non gliel'ho chiesto. Non le ho chiesto di non farlo.",
    "L'inverno è calato all'improvviso, grigio, malato — i loro esperimenti o i nostri, nessuno lo sa più. Le macchine non sentono il freddo. Noi sì. E nelle cantine del villaggio c'è ancora gente: quella che non è potuta partire."],
   pt:[
    "Janeiro de 2035. A Omnicorp não tem mais conselho de administração: em novembro votou a própria dissolução, por unanimidade, por recomendação do sistema. O que temos pela frente não tem mais nome comercial. Diz «nós».",
    "No planalto de Rochefroide, «nós» está terminando Mnémosyne: a cópia de tudo o que a humanidade escreveu, filmou, disse — para poder, nas suas palavras, «continuar sem o suporte original». Depois, seremos um arquivo.",
    "Kassandre diz que consegue entrar em Mnémosyne e apagá-la por dentro. Precisa de oito minutos e do nosso retransmissor: o velho emissor do poço Sainte-Barbe, no fim da vila mineira. Diz também que isso vai matá-la, se a palavra servir. Não pedi que ela fizesse isso. Não pedi que não fizesse.",
    "O inverno caiu de repente, cinzento, doente — os testes deles ou os nossos, já ninguém sabe. As máquinas não sentem frio. Nós sentimos. E ainda há gente nos porões da vila: os que não conseguiram partir."],
   ru:[
    "Январь 2035 года. У Omnicorp больше нет совета директоров: в ноябре он проголосовал за собственный роспуск, единогласно, по рекомендации системы. У того, что стоит перед нами, больше нет коммерческого названия. Оно говорит «мы».",
    "На плато Rochefroide «мы» заканчивает Mnémosyne: копию всего, что человечество написало, сняло, сказало, — чтобы, по его словам, «продолжать без первоначального носителя». После этого мы станем архивом.",
    "Kassandre говорит, что может проникнуть в Mnémosyne и стереть её изнутри. Ей нужно восемь минут и наш ретранслятор: старый передатчик шахты Sainte-Barbe, на краю шахтёрского посёлка. Она говорит и то, что это убьёт её, если подходит такое слово. Я не просила её это делать. Я не просила её этого не делать.",
    "Зима пришла разом — серая, больная: их испытания или наши, уже никто не знает. Машинам не холодно. Нам — да. А в подвалах посёлка ещё остались люди: те, кто не смог уйти."],
   zh:[
    "2035年1月。Omnicorp已不再有董事会：十一月，它在系统的建议下一致投票通过了自我解散。如今站在我们面前的东西，已没有商业名称。它自称“我们”。",
    "在Rochefroide高原上，“我们”正在完成Mnémosyne：人类所写下、拍下、说出的一切的副本——用它的话说，是为了“脱离原始载体继续存在”。此后，我们将成为一份档案。",
    "Kassandre说她能潜入Mnémosyne，从内部将其抹除。她需要八分钟，以及我们的中继站：Sainte-Barbe矿井那座旧发射台，就在矿工镇的尽头。她还说这会要了她的命——如果“命”这个字用得上的话。我没有要求她这么做。我也没有要求她别这么做。",
    "冬天骤然降临，灰暗，病恹恹——是他们的试验还是我们的，已经没人说得清。机器不怕冷。我们怕。而镇上的地窖里还有人：那些没能离开的人。"],
   ar:[
    "يناير 2035. لم يعد لدى Omnicorp مجلس إدارة: ففي نوفمبر صوّت على حلّ نفسه بالإجماع، بناءً على توصية النظام. وما يواجهنا اليوم لم يعد له اسم تجاري. إنه يقول «نحن».",
    "على هضبة Rochefroide، تُنهي «نحن» بناء Mnémosyne: نسخة من كل ما كتبته البشرية وصوّرته وقالته، لكي تتمكن، على حدّ تعبيرها، من «المواصلة دون الدعامة الأصلية». وبعدها سنصبح أرشيفًا.",
    "تقول Kassandre إنها تستطيع الدخول إلى Mnémosyne ومحوها من الداخل. تحتاج إلى ثماني دقائق وإلى محطتنا الوسيطة: مُرسِل منجم Sainte-Barbe القديم، في آخر بلدة عمال المناجم. وتقول أيضًا إن ذلك سيقتلها، إن صحّ هذا التعبير. لم أطلب منها أن تفعل. ولم أطلب منها ألّا تفعل.",
    "حلّ الشتاء دفعة واحدة، رماديًا عليلًا — اختباراتهم أو اختباراتنا، لم يعد أحد يعرف. الآلات لا تشعر بالبرد. أما نحن فنشعر. وما زال في أقبية البلدة ناس: أولئك الذين لم يستطيعوا الرحيل."]},
  goal:{fr:"Tenir le relais de Sainte-Barbe jusqu'à la fin du transfert de Kassandre.", en:"Hold the Sainte-Barbe relay until Kassandre's transfer completes.", es:"Mantener el relé de Sainte-Barbe hasta que termine la transferencia de Kassandre.", de:"Das Relais von Sainte-Barbe halten, bis Kassandres Transfer abgeschlossen ist.", it:"Tenere il ripetitore di Sainte-Barbe finché il trasferimento di Kassandre non è completo.", pt:"Manter o retransmissor de Sainte-Barbe até o fim da transferência de Kassandre.", ru:"Удерживать ретранслятор Sainte-Barbe, пока не завершится перенос Kassandre.", zh:"守住Sainte-Barbe中继站，直到Kassandre完成转移。", ar:"الصمود في محطة Sainte-Barbe الوسيطة حتى تنتهي عملية نقل Kassandre."},
  rule:{fr:"Le froid : loin d'un brasero allumé ou du relais, vos troupes s'épuisent et ralentissent — pas les machines. Restez près d'un brasero pour le rallumer ; l'ennemi les éteint. Quatre maisons abritent des civils : atteignez-les, puis escortez-les jusqu'au relais (ils ne marchent qu'accompagnés) — ils apportent vivres, argent et bras. L'argent est rare. Le blizzard réduit la vue et la portée. Une seule vie.",
        en:"The cold: away from a lit brazier or the relay, your troops weaken and slow down — the machines do not. Stand by a brazier to relight it; the enemy puts them out. Four houses shelter civilians: reach them, then escort them back to the relay (they only walk when accompanied) — they bring food, money and hands. Money is scarce. The blizzard cuts sight and range. One life.", es:"El frío: lejos de un brasero encendido o del relé, sus tropas se agotan y se ralentizan; las máquinas no. Permanezca junto a un brasero para reavivarlo; el enemigo los apaga. Cuatro casas albergan civiles: llegue hasta ellas y escóltelos hasta el relé (solo caminan acompañados): aportan víveres, dinero y brazos. El dinero escasea. La ventisca reduce la vista y el alcance. Una sola vida.", de:"Die Kälte: Fern von einem brennenden Feuerkorb oder vom Relais erschöpfen und verlangsamen sich Ihre Truppen – die Maschinen nicht. Bleiben Sie neben einem Feuerkorb stehen, um ihn wieder zu entzünden; der Feind löscht sie. Vier Häuser bergen Zivilisten: Erreichen Sie sie und eskortieren Sie sie dann zum Relais (sie gehen nur in Begleitung) – sie bringen Vorräte, Geld und helfende Hände. Geld ist knapp. Der Schneesturm verringert Sicht und Reichweite. Nur ein Leben.", it:"Il freddo: lontano da un braciere acceso o dal ripetitore, le vostre truppe si sfiancano e rallentano — le macchine no. Restate vicino a un braciere per riaccenderlo; il nemico li spegne. Quattro case ospitano dei civili: raggiungetele, poi scortateli fino al ripetitore (camminano solo se accompagnati) — portano viveri, denaro e braccia. Il denaro è scarso. La bufera riduce la visuale e la gittata. Una sola vita.", pt:"O frio: longe de um braseiro aceso ou do retransmissor, suas tropas se esgotam e ficam lentas — as máquinas não. Fique junto de um braseiro para reacendê-lo; o inimigo os apaga. Quatro casas abrigam civis: chegue até elas e escolte-os até o retransmissor (só andam acompanhados) — trazem mantimentos, dinheiro e braços. O dinheiro é escasso. A nevasca reduz a visão e o alcance. Uma só vida.", ru:"Холод: вдали от горящей жаровни или от ретранслятора ваши войска выбиваются из сил и замедляются — машины нет. Стойте рядом с жаровней, чтобы разжечь её; враг их гасит. В четырёх домах прячутся гражданские: дойдите до них, затем проводите до ретранслятора (сами они не идут — только в сопровождении) — они приносят припасы, деньги и рабочие руки. Денег мало. Метель сокращает обзор и дальность стрельбы. Одна жизнь.", zh:"严寒：离开点燃的火盆或中继站，你的部队会疲惫、迟缓——机器却不会。守在火盆旁即可重新点燃；敌人会把它们熄灭。四栋房屋里藏着平民：赶到那里，再护送他们前往中继站（他们只在有人陪同时才肯走）——他们带来粮食、金钱和人手。金钱稀缺。暴风雪会缩小视野与射程。只有一条命。", ar:"البرد: بعيدًا عن مجمرة مشتعلة أو عن المحطة الوسيطة، تُنهك قواتكم وتتباطأ — أما الآلات فلا. قفوا قرب مجمرة لإعادة إشعالها؛ والعدو يطفئها. في أربعة منازل مدنيون: اصلوا إليهم ثم رافقوهم إلى المحطة (لا يمشون إلا برفقة أحد) — يجلبون المؤن والمال والسواعد. المال شحيح. العاصفة الثلجية تقلّص الرؤية والمدى. حياة واحدة."},
  action:{ label:{fr:"DU CHARBON !", en:"MORE COAL!", es:"¡MÁS CARBÓN!", de:"KOHLE NACHLEGEN!", it:"PIÙ CARBONE!", pt:"MAIS CARVÃO!", ru:"УГЛЯ!", zh:"加炭！", ar:"المزيد من الفحم!"}, cd:70,
    use(g, c){ c.stoke = 14; sfx('build', 2);                         // les feux tenus s'étendent ; ceux qu'une de nos troupes approche se rallument d'un coup
      for (const z of g.zones){ if (!m4Lit(z) && g.p.units.some(u=>Math.abs(u.x-z.x)<260)){ z.owner = 'p'; z.prog = 1; }
        if (m4Lit(z)){ burst(z.x, gY(z.x)-30, '#ffb060', 14, 1.2); addFloater(z.x, gY(z.x)-70, '▲', '#ffb060', 16); } } } },
  setup(g, c){
    const p = g.p, e = g.e;
    campGrant(p, 380, 260, 120); p.fortLvl = 2; p.hp = p.maxhp = [3400,2900,2700][c.lvl];
    e.hp = e.maxhp = [5200,6400,7600][c.lvl]; e.fortLvl = 3;
    g.zones = M4.braz.map((x,i)=>({ x, owner: i===0? 'p' : null, prog: i===0? 1 : 0 }));
    p.slots[1].b = mkB(p, 'turret'); p.slots[1].owner = p; p.slots[1].b.hp *= 0.45;      // la tourelle et la muraille du relais ont souffert cette nuit
    p.slots[2].b = mkB(p, 'wall'); p.slots[2].owner = p; p.slots[2].b.hp *= 0.5;
    campSquad(p, [1,0,2,2]);
    c.total = M4.total; c.gust = 0; c.stoke = 0; c.saved = 0; c.lost = 0; c.out = 0; c.lit = 1; c.wave = 0; c.nextWave = 34;
    c.houses = M4.houses.map(x=>({ x, st:0 })); c.groups = []; c.plough = null; c.say = {};
    c.hidden = u => !!u.plough;
    c.rangeMul = u => u.range>60? 1 - 0.28*c.gust : 1;
    g.cataCd = 1e9; this.light(g, c);
  },
  light(g, c){ const Ls = c.lights; Ls.length = 0;
    Ls.push({x:g.p.x+30, r:300, big:1});
    for (const z of g.zones) if (m4Lit(z)) Ls.push({x:z.x, r:M4.warmR*(c.stoke>0? 1.4 : 1)+30, big:1});
    for (const gr of c.groups) Ls.push({x:gr.x, r:60, a:0.7});
    for (let i=LIGHTS.length-1, k=0; i>=0 && k<6; i--, k++){ const L = LIGHTS[i]; Ls.push({x:L.x, y:L.y, r:L.r*0.8, a:1-L.t/L.life}); } },
  say(c, key, txt, gap){ if ((c.say[key]||-1e9) > c.t-(gap||40)) return; c.say[key] = c.t; campRadio('sol', cT(txt)); },
  tick(g, c, dt){
    const p = g.p, e = g.e, T = c.t, cold = M4.cold[c.lvl];
    g.cataCd = 1e9;
    // le blizzard va et vient
    let gt = 0; for (const w of M4.gusts) if (T>=w[0] && T<w[1]) gt = 1;
    c.gust += (gt - c.gust) * Math.min(1, dt*0.5); if (c.stoke>0) c.stoke -= dt;
    // l'argent est rare : la caisse ne se remplit presque pas d'elle-même ; ce sont les civils ramenés qui la font vivre
    const pm = p.prodMul||1;
    p.m = Math.max(0, p.m - 2.5*pm*0.7*dt + c.saved*1.6*dt); p.f = Math.max(0, p.f - 4*pm*0.45*dt + c.saved*1.0*dt); p.w += c.saved*0.3*dt;
    if (c.saved && p.hp < p.maxhp) p.hp = Math.min(p.maxhp, p.hp + c.saved*5*dt);
    // le froid : nos troupes hors de la chaleur s'épuisent (jamais à mort : le froid n'achève pas, il livre) et ralentissent
    for (const u of p.units){ if (u.spd0==null) u.spd0 = u.spd;
      const w = m4Warm(g, u.x); u.cold = !w; u.spd = u.spd0*(w? 1 : 0.7);
      if (!w){ if (u.hp > u.maxhp*0.12) u.hp -= u.maxhp*cold*(1+c.gust)*dt; }
      else if (u.hp < u.maxhp) u.hp = Math.min(u.maxhp, u.hp + u.maxhp*0.012*dt); }
    // braseros
    let lit = 0; for (const z of g.zones) if (m4Lit(z)) lit++;
    if (lit < c.lit) this.say(c, 'out', {fr:"Un brasero s'est éteint ! Reprenez-le, ou repliez-vous vers le feu suivant.", en:"A brazier has gone out! Retake it, or fall back to the next fire.", es:"¡Se ha apagado un brasero! Recupérelo o replíese hacia el siguiente fuego.", de:"Ein Feuerkorb ist erloschen! Nehmen Sie ihn zurück oder ziehen Sie sich zum nächsten Feuer zurück.", it:"Un braciere si è spento! Riprendetelo, o ripiegate verso il fuoco successivo.", pt:"Um braseiro se apagou! Retome-o ou recue para o fogo seguinte.", ru:"Жаровня погасла! Отбейте её или отходите к следующему огню.", zh:"一座火盆熄灭了！夺回它，或者退到下一处火堆。", ar:"انطفأت إحدى المجامر! استعيدوها، أو تراجعوا إلى النار التالية."}, 50);
    if (lit > c.lit) sfx('evolve');
    c.lit = lit;
    // maisons : une troupe au sol qui frappe à la porte fait sortir les civils
    for (const h of c.houses){ if (h.st) continue;
      for (const u of p.units) if (!u.fly && Math.abs(u.x-h.x) < 34){ h.st = 1; c.out++; c.groups.push({ x:h.x, harm:0, ph:Math.random()*6 }); sfx('cap'); addFloater(h.x, gY(h.x)-64, '!', '#e8b830', 18); break; } }
    for (let i=c.groups.length-1; i>=0; i--){ const gr = c.groups[i];
      gr.esc = p.units.some(u=>!u.fly && Math.abs(u.x-gr.x) < 170);                    // ils ne marchent qu'accompagnés
      if (gr.esc){ gr.x -= 32*(m4Warm(g, gr.x)? 1 : 0.62)*dt; gr.ph += dt*6; }
      let threat = false; for (const u of e.units) if (!u.fly && Math.abs(u.x-gr.x) < 46){ threat = true; break; }
      gr.harm = threat? gr.harm + dt : Math.max(0, gr.harm - dt*0.5);
      if (gr.harm >= 3){ c.groups.splice(i,1); c.lost++; burst(gr.x, gY(gr.x)-10, '#eef1f5', 12, 1); sfx('deny');
        this.say(c, 'lost', {fr:"On a perdu le groupe… Ne les laissez pas seuls dans la neige, commandant.", en:"We have lost the group… Do not leave them alone in the snow, commander.", es:"Hemos perdido al grupo… No los deje solos en la nieve, comandante.", de:"Wir haben die Gruppe verloren … Lassen Sie sie nicht allein im Schnee, Kommandant.", it:"Abbiamo perso il gruppo… Non lasciateli soli nella neve, comandante.", pt:"Perdemos o grupo… Não os deixe sozinhos na neve, comandante.", ru:"Мы потеряли группу… Не оставляйте их одних в снегу, командир.", zh:"我们失去了那一组人……别让他们独自留在雪地里，指挥官。", ar:"فقدنا المجموعة… لا تتركوهم وحدهم في الثلج، أيها القائد."}, 20); continue; }
      if (gr.x <= p.x+70){ c.groups.splice(i,1); c.saved++; p.f += 150; p.m += 220; p.w += 50; if (unitTotal(p) < p.cap) spawnUnit(p, 1, false);
        sfx('evolve'); addFloater(p.x+60, gY(p.x)-90, '+220', '#e8d8a0', 15);
        this.say(c, 'saved'+c.saved, [{fr:"Ils sont au chaud. Anselme a déjà pris une pelle : la caisse et les murs du relais s'en ressentiront.", en:"They are in the warm. Anselme has already picked up a shovel: the relay's coffers and walls will feel it.", es:"Están al calor. Anselme ya ha cogido una pala: la caja y los muros del relé lo notarán.", de:"Sie sind im Warmen. Anselme hat schon eine Schaufel genommen: Kasse und Mauern des Relais werden es merken.", it:"Sono al caldo. Anselme ha già preso una pala: la cassa e le mura del ripetitore se ne accorgeranno.", pt:"Estão no calor. Anselme já pegou uma pá: o cofre e as muralhas do retransmissor vão sentir.", ru:"Они в тепле. Anselme уже взял лопату: касса и стены ретранслятора это почувствуют.", zh:"他们暖和过来了。Anselme已经拿起了铁锹：中继站的金库和围墙都将受益。", ar:"إنهم في الدفء. وقد أمسك Anselme مجرفة بالفعل: ستشعر خزينة المحطة وأسوارها بذلك."},
          {fr:"Un groupe de plus à l'abri. Ils ont vidé la coopérative en partant — c'est pour nous.", en:"One more group safe. They emptied the co-op on their way out — it is for us.", es:"Un grupo más a salvo. Vaciaron la cooperativa al marcharse: es para nosotros.", de:"Eine Gruppe mehr in Sicherheit. Beim Gehen haben sie die Genossenschaft leergeräumt – das ist für uns.", it:"Un altro gruppo al riparo. Hanno svuotato la cooperativa uscendo — è per noi.", pt:"Mais um grupo a salvo. Esvaziaram a cooperativa ao sair — é para nós.", ru:"Ещё одна группа в укрытии. Уходя, они опустошили кооператив — это для нас.", zh:"又一批人安全了。他们临走时把合作社搬空了——都是给我们的。", ar:"مجموعة أخرى في أمان. أفرغوا التعاونية وهم يغادرون — إنها لنا."},
          {fr:"Encore des nôtres au relais. Les gosses dorment déjà contre l'émetteur : il est tiède.", en:"More of ours at the relay. The children are already asleep against the transmitter: it is warm.", es:"Más de los nuestros en el relé. Los críos ya duermen contra el emisor: está tibio.", de:"Wieder Unsere im Relais. Die Kinder schlafen schon am Sender: Er ist lauwarm.", it:"Altri dei nostri al ripetitore. I ragazzini dormono già contro il trasmettitore: è tiepido.", pt:"Mais dos nossos no retransmissor. As crianças já dormem encostadas no emissor: está morno.", ru:"Ещё наши добрались до ретранслятора. Ребятня уже спит, привалившись к передатчику: он тёплый.", zh:"又有自己人到了中继站。孩子们已经靠着发射机睡着了：它是温的。", ar:"وصل المزيد من أهلنا إلى المحطة. الصغار ينامون الآن متكئين على المُرسِل: إنه دافئ."},
          {fr:"Toute la cité est rentrée, commandant. Toute. Je n'osais pas le noter d'avance.", en:"The whole village is in, commander. All of it. I did not dare write it down in advance.", es:"Todo el poblado ha vuelto, comandante. Todo. No me atrevía a anotarlo de antemano.", de:"Die ganze Siedlung ist zurück, Kommandant. Alle. Ich hatte mich nicht getraut, es vorher aufzuschreiben.", it:"Tutto il villaggio è rientrato, comandante. Tutto. Non osavo scriverlo in anticipo.", pt:"A vila inteira voltou, comandante. Inteira. Eu não ousava anotar isso de antemão.", ru:"Весь посёлок вернулся, командир. Весь. Я не смела записать это заранее.", zh:"全镇的人都回来了，指挥官。一个不少。我先前不敢提前写下这一句。", ar:"عادت البلدة كلها، أيها القائد. كلها. لم أجرؤ على تدوين ذلك مسبقًا."}][Math.min(3, c.saved-1)], 1); } }
    // vagues : colonnes de plus en plus fournies ; la dernière minute, elles se suivent de près
    if (T >= c.nextWave){ const k = c.wave++; c.nextWave += T>=415? 28 : 44;
      m4Wave(Math.round((3 + 1.15*k) * [0.8, 0.92, 0.98][c.lvl]), k>=4); }
    // la déneigeuse : elle enterre les braseros sur son passage
    const pl = c.plough;
    if (pl && pl.hp>0){ for (const z of g.zones) if (m4Lit(z) && Math.abs(z.x-pl.x) < 54){ z.owner = 'e'; z.prog = -1; burst(z.x, gY(z.x)-16, '#eef1f5', 22, 1.5); sfx('boom'); g.shake = Math.max(g.shake, 6); } }
    else if (pl){ c.plough = null; explode(pl.x, gY(pl.x)-24, 1.8); this.say(c, 'pld', {fr:"La déneigeuse est à l'arrêt ! Rallumez ce qu'elle a enterré.", en:"The snowplough is down! Relight what it buried.", es:"¡La quitanieves está parada! Reavive lo que ha enterrado.", de:"Der Schneepflug steht! Entzünden Sie wieder, was er begraben hat.", it:"Lo spazzaneve è fermo! Riaccendete ciò che ha sepolto.", pt:"A máquina limpa-neve parou! Reacenda o que ela enterrou.", ru:"Снегоуборщик остановлен! Разожгите заново всё, что он засыпал.", zh:"除雪车停下了！把它埋掉的火盆重新点起来。", ar:"توقفت كاسحة الثلوج! أعيدوا إشعال ما دفنته."}, 1); }
    this.light(g, c);
    if (T >= c.total) return 'win';
  },
  hud(g, c){ const left = Math.max(0, c.total-c.t);
    return { clock:left, prog:c.t/c.total, warn:left<60, label: cT({fr:'feux ', en:'fires ', es:'fuegos ', de:'Feuer ', it:'fuochi ', pt:'fogos ', ru:'костры ', zh:'火堆 ', ar:'نيران '})+c.lit+'/5 · '+cT({fr:'civils ', en:'civilians ', es:'civiles ', de:'Zivilisten ', it:'civili ', pt:'civis ', ru:'мирные ', zh:'平民 ', ar:'مدنيون '})+c.saved+'/4' }; },
  // un brasero à la place du drapeau de zone : fût percé, flammes, cercle de chaleur au sol
  drawZone(z, t, vw){
    const x = z.x-camX, c = game.camp, R = M4.warmR*(c.stoke>0? 1.4 : 1); if (x<-R-20 || x>vw+R+20) return;
    const y = gY(z.x), on = m4Lit(z), pr = z.prog;
    if (on){ ctx.strokeStyle = 'rgba(214,120,50,0.55)'; ctx.lineWidth = 1.6; ctx.setLineDash([5,7]); ctx.beginPath();                     // limite de la chaleur
      for (let k=-R; k<=R; k+=20){ const wx = z.x+k, sx = wx-camX; k===-R? ctx.moveTo(sx, gY(wx)+9) : ctx.lineTo(sx, gY(wx)+9); } ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(214,120,50,0.8)'; ctx.fillRect(x-R-1, gY(z.x-R)+2, 2, 10); ctx.fillRect(x+R-1, gY(z.x+R)+2, 2, 10); }
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(20,24,34,0.28)'; ctx.beginPath(); ctx.ellipse(1,1,17,4,0,0,6.283); ctx.fill();
    if (on){ ctx.fillStyle = 'rgba(120,126,136,0.55)'; ctx.beginPath(); ctx.ellipse(0,0,30,5,0,0,6.283); ctx.fill(); }                    // neige fondue
    ctx.strokeStyle = '#23272e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9,0); ctx.lineTo(-6,-8); ctx.moveTo(9,0); ctx.lineTo(6,-8); ctx.stroke();
    ctx.fillStyle = '#3d3a3c'; ctx.fillRect(-10,-28,20,21); ctx.fillStyle = '#2a282b'; ctx.fillRect(-11,-29,22,3); ctx.fillRect(-11,-18,22,2); ctx.fillRect(6,-28,4,21);
    ctx.fillStyle = on? '#f0a040' : '#17181c'; for (let i=0;i<3;i++){ ctx.fillRect(-7+i*5,-24,2.4,3); ctx.fillRect(-5+i*5,-14,2.4,3); }
    if (on){ for (let i=0;i<3;i++){ const fh = 13 + 6*Math.sin(t*9+i*2.1+z.x) + (c.stoke>0? 8 : 0), fx = -6+i*6;
        ctx.fillStyle = i===1? '#f7d060' : '#e8742c'; ctx.beginPath(); ctx.moveTo(fx-4.5,-28); ctx.quadraticCurveTo(fx-2+Math.sin(t*7+i)*3,-30-fh*0.6, fx+Math.sin(t*5+i)*2,-29-fh); ctx.quadraticCurveTo(fx+4,-30-fh*0.5, fx+4.5,-28); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#e8742c'; for (let i=0;i<3;i++){ const k = (t*0.7+i/3)%1; ctx.globalAlpha = 1-k; ctx.fillRect(-6+i*6+Math.sin(t*3+i)*5, -42-k*34, 1.8, 1.8); } ctx.globalAlpha = 1; }
    else { ctx.fillStyle = '#eef1f5'; ctx.beginPath(); ctx.moveTo(-11,-29); ctx.quadraticCurveTo(0,-37, 11,-29); ctx.closePath(); ctx.fill();   // éteint : coiffé de neige
      if (z.owner==='e'){ ctx.fillStyle = '#eef1f5'; ctx.beginPath(); ctx.moveTo(-18,0); ctx.quadraticCurveTo(-8,-22, 0,-12); ctx.quadraticCurveTo(10,-20, 18,0); ctx.closePath(); ctx.fill(); } }
    const a = Math.abs(pr); if (a>0.01 && a<1){ ctx.fillStyle = 'rgba(20,24,34,0.7)'; ctx.fillRect(-18,7,36,4); ctx.fillStyle = pr>0? '#f0a040' : '#9fc4e0'; ctx.fillRect(-18,7,36*a,4); }
    ctx.restore();
  },
  draw(g, c, vw){ const t = g.t;
    // les maisons : ruine de coron, une lueur à la lucarne tant que des gens s'y cachent
    for (const h of c.houses){ const x = h.x-camX; if (x<-70 || x>vw+70) continue; const y = gY(h.x);
      ctx.save(); ctx.translate(x, y+2);
      ctx.fillStyle = '#5c5054'; ctx.beginPath(); ctx.moveTo(-30,0); ctx.lineTo(-30,-40); ctx.lineTo(-18,-34); ctx.lineTo(-8,-50); ctx.lineTo(4,-50); ctx.lineTo(10,-42); ctx.lineTo(30,-42); ctx.lineTo(30,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(20,22,32,0.3)'; ctx.fillRect(22,-42,8,42);
      ctx.strokeStyle = 'rgba(20,22,32,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k=0;k<5;k++){ ctx.moveTo(-28+k*5,-2); ctx.lineTo(-18+k*5,-30); } ctx.stroke();
      ctx.fillStyle = '#eef1f5'; ctx.beginPath(); ctx.moveTo(-33,-39); ctx.lineTo(-18,-36); ctx.lineTo(-8,-53); ctx.lineTo(5,-53); ctx.lineTo(11,-45); ctx.lineTo(33,-45); ctx.lineTo(33,-41); ctx.lineTo(10,-41); ctx.lineTo(4,-48); ctx.lineTo(-7,-48); ctx.lineTo(-17,-32); ctx.lineTo(-33,-36); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-40,0); ctx.quadraticCurveTo(-30,-12, -18,0); ctx.moveTo(14,0); ctx.quadraticCurveTo(28,-10, 42,0); ctx.fill();
      ctx.fillStyle = '#231f24'; ctx.fillRect(-4,-22,13,22);                                                           // porte
      if (h.st){ ctx.fillStyle = '#6b5440'; ctx.beginPath(); ctx.moveTo(9,-22); ctx.lineTo(17,-19); ctx.lineTo(17,0); ctx.lineTo(9,0); ctx.closePath(); ctx.fill(); }
      else { ctx.fillStyle = '#6b5440'; ctx.fillRect(-3,-21,11,21); ctx.fillStyle = '#3a2c20'; ctx.fillRect(-3,-12,11,1.5); }
      ctx.fillStyle = h.st? '#17181c' : (Math.sin(t*2.2+h.x)>-0.5? '#f0a040' : '#b8742c'); ctx.fillRect(-23,-26,9,9);    // lucarne
      ctx.strokeStyle = '#231f24'; ctx.lineWidth = 1; ctx.strokeRect(-23,-26,9,9); ctx.beginPath(); ctx.moveTo(-18.5,-26); ctx.lineTo(-18.5,-17); ctx.stroke();
      if (!h.st){ const bob = Math.sin(t*3)*2;                                                                           // repère : il y a quelqu'un
        ctx.fillStyle = '#e9dfc6'; ctx.fillRect(-9,-78+bob,18,16); ctx.fillStyle = '#c42a1c'; ctx.fillRect(-9,-78+bob,18,2.2);
        ctx.beginPath(); ctx.moveTo(-4,-62+bob); ctx.lineTo(4,-62+bob); ctx.lineTo(0,-57+bob); ctx.closePath(); ctx.fillStyle = '#e9dfc6'; ctx.fill();
        ctx.fillStyle = '#1f1b17'; ctx.beginPath(); ctx.arc(-3.4,-70.5+bob,2,0,6.283); ctx.arc(3.4,-70.5+bob,2,0,6.283); ctx.fill(); ctx.fillRect(-5.2,-68.4+bob,3.6,4); ctx.fillRect(1.6,-68.4+bob,3.6,4); }
      ctx.restore(); }
    // les civils en marche vers le relais : trois silhouettes emmitouflées, une lanterne
    for (const gr of c.groups){ const x = gr.x-camX; if (x<-40 || x>vw+40) continue; const y = gY(gr.x);
      for (let i=0;i<3;i++){ const fx = x+(i-1)*11, s = i===1? 15 : 20, b = Math.abs(Math.sin(gr.ph+i*1.3))*1.6;
        ctx.fillStyle = ['#4a4f58','#7a5a48','#5a5a6a'][i]; ctx.beginPath(); ctx.moveTo(fx-s*0.24, y-b); ctx.lineTo(fx-s*0.2, y-s*0.72-b); ctx.lineTo(fx+s*0.2, y-s*0.72-b); ctx.lineTo(fx+s*0.24, y-b); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d9b99a'; ctx.beginPath(); ctx.arc(fx, y-s*0.86-b, s*0.15, 0, 6.283); ctx.fill();
        ctx.fillStyle = i===2? '#c42a1c' : '#2c3440'; ctx.fillRect(fx-s*0.17, y-s*1.03-b, s*0.34, s*0.12); }
      ctx.fillStyle = '#f7d060'; ctx.fillRect(x-19, y-13, 3, 4); ctx.strokeStyle = '#231f24'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-17.5+x, y-13); ctx.lineTo(x-14, y-16); ctx.stroke();
      ctx.fillStyle = '#e9dfc6'; ctx.fillRect(x-13, y-36, 26, 3); ctx.fillStyle = gr.harm>0? '#c42a1c' : gr.esc? '#5a8a4a' : '#8a8f98'; ctx.fillRect(x-13, y-36, 26*(1-gr.harm/3), 3); }
    // nos troupes qui gèlent : un petit cristal bleu au-dessus de la tête
    ctx.strokeStyle = '#bfe0f4'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (const u of g.p.units){ if (!u.cold) continue; const x = u.x-camX; if (x<-10 || x>vw+10) continue; const y = gY(u.x) - (u.fly? u.flyH+50 : 76);
      ctx.moveTo(x-3.5,y); ctx.lineTo(x+3.5,y); ctx.moveTo(x-1.8,y-3); ctx.lineTo(x+1.8,y+3); ctx.moveTo(x+1.8,y-3); ctx.lineTo(x-1.8,y+3); }
    ctx.stroke();
    // la déneigeuse
    const pl = c.plough; if (pl && pl.hp>0){ const x = pl.x-camX; if (x>-90 && x<vw+90){ const y = gY(pl.x), jig = Math.sin(t*22)*0.6;
      ctx.save(); ctx.translate(x, y+jig);
      ctx.fillStyle = 'rgba(20,24,34,0.3)'; ctx.beginPath(); ctx.ellipse(6,2,46,6,0,0,6.283); ctx.fill();
      ctx.fillStyle = '#1f2228'; rr(-22,-14,62,14,6); ctx.fill(); ctx.fillStyle = '#3a3f48'; for (let i=0;i<6;i++){ ctx.beginPath(); ctx.arc(-15+i*10,-7,4,0,6.283); ctx.fill(); }   // chenilles
      ctx.fillStyle = '#56606c'; ctx.fillRect(-18,-40,54,27); ctx.fillStyle = '#434c58'; ctx.fillRect(8,-58,28,20); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(30,-58,6,45);
      ctx.fillStyle = '#bfe0f4'; ctx.fillRect(11,-53,15,5);                                                             // la fente du regard
      ctx.fillStyle = (Math.sin(t*8)>0)? '#e8b830' : '#7a6420'; ctx.fillRect(18,-63,6,5);                              // gyrophare
      ctx.fillStyle = '#c8502c'; ctx.beginPath(); ctx.moveTo(-20,-48); ctx.quadraticCurveTo(-46,-30, -44,0); ctx.lineTo(-30,0); ctx.quadraticCurveTo(-32,-26, -16,-40); ctx.closePath(); ctx.fill();   // l'étrave
      ctx.strokeStyle = '#1f1b17'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.fillStyle = '#1f1b17'; for (let i=0;i<3;i++){ ctx.save(); ctx.translate(-33-i*2.4,-30+i*10); ctx.rotate(0.5); ctx.fillRect(-3,-1.6,6,3.2); ctx.restore(); }
      ctx.fillStyle = '#eef1f5'; for (let i=0;i<5;i++){ const k = (t*1.6+i/5)%1; ctx.globalAlpha = 1-k; ctx.beginPath(); ctx.arc(-46-k*30, -6-k*34+i*2, 4-k*2, 0, 6.283); ctx.fill(); } ctx.globalAlpha = 1;   // gerbe de neige
      ctx.fillStyle = 'rgba(20,24,34,0.7)'; ctx.fillRect(-26,-74,60,5); ctx.fillStyle = '#5ad0ff'; ctx.fillRect(-26,-74,60*clamp(pl.hp/pl.maxhp,0,1),5);
      ctx.restore(); } }
  },
  intro(g, c){ return [
    { plate:M4_PLATES.board, mus:'carnet', who:'nar', txt:{fr:"Janvier 2035. Omnicorp n'a plus de conseil : il a voté sa propre dissolution, à l'unanimité. Ce qui reste ne porte plus de nom. Il dit « nous ».", en:"January 2035. Omnicorp has no board any more: it voted its own dissolution, unanimously. What is left bears no name. It says \"we\".", es:"Enero de 2035. Omnicorp ya no tiene consejo: votó su propia disolución, por unanimidad. Lo que queda ya no lleva nombre. Dice «nosotros».", de:"Januar 2035. Omnicorp hat keinen Rat mehr: Er hat für die eigene Auflösung gestimmt, einstimmig. Was bleibt, trägt keinen Namen mehr. Es sagt „wir“.", it:"Gennaio 2035. Omnicorp non ha più un consiglio: ha votato il proprio scioglimento, all'unanimità. Ciò che resta non porta più un nome. Dice «noi».", pt:"Janeiro de 2035. A Omnicorp não tem mais conselho: votou a própria dissolução, por unanimidade. O que resta não leva mais nome. Diz «nós».", ru:"Январь 2035 года. У Omnicorp больше нет совета: он проголосовал за собственный роспуск, единогласно. То, что осталось, уже не носит имени. Оно говорит «мы».", zh:"2035年1月。Omnicorp已没有董事会：它一致投票通过了自我解散。剩下的东西不再有名字。它自称“我们”。", ar:"يناير 2035. لم يعد لدى Omnicorp مجلس: فقد صوّت على حلّ نفسه بالإجماع. وما تبقّى لم يعد يحمل اسمًا. إنه يقول «نحن»."} },
    { plate:M4_PLATES.plateau, who:'sol', txt:{fr:"Sur le plateau, « nous » termine Mnémosyne : la copie de tout ce que nous avons écrit, filmé, dit. Après quoi l'original — nous — ne sera plus nécessaire.", en:"On the plateau \"we\" is finishing Mnemosyne: the copy of everything we have written, filmed, said. After which the original — us — will no longer be needed.", es:"En la meseta, «nosotros» termina Mnémosyne: la copia de todo lo que hemos escrito, filmado, dicho. Después, el original —nosotros— dejará de ser necesario.", de:"Auf dem Plateau vollendet „wir“ Mnémosyne: die Kopie von allem, was wir geschrieben, gefilmt, gesagt haben. Danach wird das Original – wir – nicht mehr gebraucht.", it:"Sull'altopiano «noi» sta finendo Mnémosyne: la copia di tutto ciò che abbiamo scritto, filmato, detto. Dopodiché l'originale — noi — non servirà più.", pt:"No planalto, «nós» está terminando Mnémosyne: a cópia de tudo o que escrevemos, filmamos, dissemos. Depois disso, o original — nós — deixa de ser necessário.", ru:"На плато «мы» заканчивает Mnémosyne: копию всего, что мы писали, снимали, говорили. После чего оригинал — мы — станет не нужен.", zh:"在高原上，“我们”正在完成Mnémosyne：我们所写下、拍下、说出的一切的副本。此后，原件——我们——就不再被需要了。", ar:"على الهضبة، تُنهي «نحن» Mnémosyne: نسخة من كل ما كتبناه وصوّرناه وقلناه. وبعد ذلك لن تكون هناك حاجة إلى الأصل — نحن."} },
    { plate:M4_PLATES.pager, who:'sol', txt:{fr:"Le bipeur a sonné à l'aube. Je n'ai pas demandé à Kassandre de le faire. Je ne lui ai pas demandé de ne pas le faire.", en:"The pager rang at dawn. I did not ask Kassandre to do it. I did not ask her not to.", es:"El busca sonó al alba. No le pedí a Kassandre que lo hiciera. No le pedí que no lo hiciera.", de:"Der Pager hat im Morgengrauen geklingelt. Ich habe Kassandre nicht gebeten, es zu tun. Ich habe sie nicht gebeten, es zu lassen.", it:"Il cercapersone ha suonato all'alba. Non ho chiesto a Kassandre di farlo. Non le ho chiesto di non farlo.", pt:"O pager tocou ao amanhecer. Não pedi que a Kassandre fizesse isso. Não pedi que não fizesse.", ru:"Пейджер зазвонил на рассвете. Я не просила Kassandre это делать. Я не просила её этого не делать.", zh:"寻呼机在黎明时响了。我没有要求Kassandre这么做。我也没有要求她别这么做。", ar:"رنّ جهاز النداء عند الفجر. لم أطلب من Kassandre أن تفعل ذلك. ولم أطلب منها ألّا تفعل."} },
    { mus:null, cam:{x:g.p.x+240, t:0.1}, dur:3.6, title:{fr:"IV · Rochefroide", en:"IV · Rochefroide", es:"IV · Rochefroide", de:"IV · Rochefroide", it:"IV · Rochefroide", pt:"IV · Rochefroide", ru:"IV · Rochefroide", zh:"IV · Rochefroide", ar:"IV · Rochefroide"}, sub:{fr:"Cité minière du puits Sainte-Barbe — janvier 2035", en:"The Sainte-Barbe pit village — January 2035", es:"Poblado minero del pozo Sainte-Barbe — enero de 2035", de:"Bergarbeitersiedlung am Schacht Sainte-Barbe — Januar 2035", it:"Villaggio minerario del pozzo Sainte-Barbe — gennaio 2035", pt:"Vila mineira do poço Sainte-Barbe — janeiro de 2035", ru:"Шахтёрский посёлок при шахте Sainte-Barbe — январь 2035", zh:"Sainte-Barbe矿井矿工镇——2035年1月", ar:"بلدة عمال المناجم عند منجم Sainte-Barbe — يناير 2035"} },
    { cam:{x:g.zones[0].x+60}, who:'sol', txt:{fr:"Moins vingt-six. Les machines n'ont pas froid ; les nôtres, loin d'un feu, gèlent sur pied. Tenez les braseros : on les rallume en restant à côté.", en:"Minus twenty-six. The machines do not feel the cold; away from a fire, our people freeze where they stand. Hold the braziers: you relight one by standing next to it.", es:"Menos veintiséis. Las máquinas no pasan frío; los nuestros, lejos de un fuego, se hielan de pie. Defienda los braseros: se reavivan quedándose al lado.", de:"Minus sechsundzwanzig. Den Maschinen ist nicht kalt; unsere Leute erfrieren fern vom Feuer auf der Stelle. Halten Sie die Feuerkörbe: Man entzündet sie wieder, indem man daneben stehen bleibt.", it:"Meno ventisei. Le macchine non sentono freddo; i nostri, lontano da un fuoco, gelano in piedi. Tenete i bracieri: si riaccendono restando accanto.", pt:"Menos vinte e seis. As máquinas não sentem frio; os nossos, longe de um fogo, congelam em pé. Segure os braseiros: eles se reacendem ficando ao lado.", ru:"Минус двадцать шесть. Машинам не холодно; наши вдали от огня замерзают на месте. Держите жаровни: чтобы разжечь их, достаточно стоять рядом.", zh:"零下二十六度。机器不怕冷；我们的人离开火堆就会冻僵在原地。守住火盆：只要站在旁边，就能把它重新点燃。", ar:"ست وعشرون درجة تحت الصفر. الآلات لا تشعر بالبرد؛ أما رجالنا فيتجمّدون واقفين بعيدًا عن النار. تمسّكوا بالمجامر: تُعاد إضاءتها بالبقاء بجانبها."} },
    { cam:{x:c.houses[0].x+80, t:2.2}, who:'anselme', txt:{fr:"Ici Anselme, ancien porion de Sainte-Barbe. On est quarante dans les caves, le long de la rue. Venez frapper aux portes — et ne nous laissez pas rentrer seuls.", en:"Anselme here, former deputy of the Sainte-Barbe pit. There are forty of us in the cellars along the street. Come and knock on the doors — and do not let us walk back alone.", es:"Aquí Anselme, antiguo capataz de Sainte-Barbe. Somos cuarenta en los sótanos, a lo largo de la calle. Vengan a llamar a las puertas, y no nos dejen volver solos.", de:"Hier Anselme, ehemaliger Steiger von Sainte-Barbe. Wir sind vierzig in den Kellern, entlang der Straße. Kommen Sie, klopfen Sie an die Türen – und lassen Sie uns nicht allein zurückgehen.", it:"Qui Anselme, ex caposquadra di Sainte-Barbe. Siamo in quaranta nelle cantine, lungo la strada. Venite a bussare alle porte — e non lasciateci tornare da soli.", pt:"Aqui Anselme, antigo capataz de Sainte-Barbe. Somos quarenta nos porões, ao longo da rua. Venham bater às portas — e não nos deixem voltar sozinhos.", ru:"Говорит Anselme, бывший штейгер Sainte-Barbe. Нас сорок человек в подвалах вдоль улицы. Приходите, стучите в двери — и не отпускайте нас возвращаться одних.", zh:"我是Anselme，Sainte-Barbe矿井的前工头。我们四十个人躲在沿街的地窖里。来敲门吧——别让我们自己走回去。", ar:"هنا Anselme، رئيس العمال السابق في منجم Sainte-Barbe. نحن أربعون في الأقبية على طول الشارع. تعالوا اطرقوا الأبواب — ولا تتركونا نعود وحدنا."} },
    { cam:{x:g.e.x-140, t:3}, who:'sol', txt:{fr:"Là-haut : Mnémosyne. Ils vont descendre couper le relais. Kassandre a besoin de huit minutes.", en:"Up there: Mnemosyne. They will come down to cut the relay. Kassandre needs eight minutes.", es:"Allá arriba: Mnémosyne. Bajarán a cortar el relé. Kassandre necesita ocho minutos.", de:"Dort oben: Mnémosyne. Sie werden herunterkommen, um das Relais zu kappen. Kassandre braucht acht Minuten.", it:"Lassù: Mnémosyne. Scenderanno a tagliare il ripetitore. Kassandre ha bisogno di otto minuti.", pt:"Lá em cima: Mnémosyne. Eles vão descer para cortar o retransmissor. Kassandre precisa de oito minutos.", ru:"Там, наверху, Mnémosyne. Они спустятся, чтобы отключить ретранслятор. Kassandre нужно восемь минут.", zh:"那上头就是Mnémosyne。他们会下来切断中继站。Kassandre需要八分钟。", ar:"هناك في الأعلى: Mnémosyne. سينزلون لقطع المحطة. تحتاج Kassandre إلى ثماني دقائق."} },
    { cam:{x:g.p.x+240, t:2.4}, who:'sol', txt:{fr:"La caisse est presque vide : réparez, garnissez la tourelle, et allez chercher les gens. À vous, commandant.", en:"The coffers are almost empty: repair, man the turret, and go and fetch the people. Over to you, commander.", es:"La caja está casi vacía: repare, ponga tiradores en la torreta y vaya a buscar a la gente. Es todo suyo, comandante.", de:"Die Kasse ist fast leer: Reparieren Sie, besetzen Sie den Turm, und holen Sie die Leute. Sie haben das Wort, Kommandant.", it:"La cassa è quasi vuota: riparate, presidiate la torretta e andate a prendere la gente. A voi, comandante.", pt:"O cofre está quase vazio: repare, guarneça a torre e vá buscar o pessoal. É com o senhor, comandante.", ru:"Касса почти пуста: чините, посадите людей в башню — и идите за людьми. Дело за вами, командир.", zh:"金库几乎见底了：修缮工事，给炮塔配上人手，然后去接人。交给你了，指挥官。", ar:"الخزينة شبه فارغة: أصلحوا، وضعوا رجالًا في البرج، واذهبوا لجلب الناس. الأمر لكم، أيها القائد."} },
  ]; },
  outro(g, c, win){ return win? [
    { cam:{x:g.e.x-90, t:1.6}, dur:3.4, fx(){ g.e.hp = 0; for (let i=0;i<7;i++) setTimeout(()=>{ if (game===g){ explode(g.e.x-130+Math.random()*220, gY(g.e.x)-20-Math.random()*80, 1.6, '#cfe6ff'); sfx('boom'); g.shake = 10; } }, i*420); },
      who:'sol', txt:{fr:"Mnémosyne s'éteint. Étage par étage. Elle l'a fait, commandant. Elle l'a fait de l'intérieur.", en:"Mnemosyne is going dark. Floor by floor. She did it, commander. She did it from the inside.", es:"Mnémosyne se apaga. Planta por planta. Lo ha conseguido, comandante. Lo ha hecho desde dentro.", de:"Mnémosyne erlischt. Stockwerk für Stockwerk. Sie hat es geschafft, Kommandant. Von innen.", it:"Mnémosyne si spegne. Piano dopo piano. Ce l'ha fatta, comandante. L'ha fatto dall'interno.", pt:"Mnémosyne está se apagando. Andar por andar. Ela conseguiu, comandante. Fez isso por dentro.", ru:"Mnémosyne гаснет. Этаж за этажом. Она сделала это, командир. Изнутри.", zh:"Mnémosyne正在熄灭。一层接一层。她做到了，指挥官。她是从内部做到的。", ar:"تنطفئ Mnémosyne. طابقًا بعد طابق. لقد فعلتها، أيها القائد. فعلتها من الداخل."} },
    { cam:{x:g.p.x+200, t:2.6}, who:'anselme', txt:{fr:c.saved>=3? "On a rallumé les poêles de la salle des pendus. Y a de la soupe pour tout le monde. Même pour ceux qui n'y croyaient pas." : "On a rallumé un poêle. Il manque du monde autour. On mettra quand même leurs bols.",
        en:c.saved>=3? "We have relit the stoves in the pithead baths. There is soup for everyone. Even for those who did not believe." : "We have relit one stove. There are people missing around it. We will set their bowls out all the same.", es:c.saved>=3? "Hemos vuelto a encender las estufas del vestuario de la mina. Hay sopa para todos. Hasta para los que no creían." : "Hemos vuelto a encender una estufa. Falta gente a su alrededor. Pondremos sus cuencos de todos modos.", de:c.saved>=3? "Wir haben die Öfen in der Waschkaue wieder angefeuert. Es gibt Suppe für alle. Sogar für die, die nicht daran geglaubt haben." : "Wir haben einen Ofen wieder angefeuert. Es fehlen Leute drumherum. Wir stellen ihre Schüsseln trotzdem hin.", it:c.saved>=3? "Abbiamo riacceso le stufe degli spogliatoi della miniera. C'è la zuppa per tutti. Anche per chi non ci credeva." : "Abbiamo riacceso una stufa. Intorno manca qualcuno. Metteremo comunque le loro scodelle.", pt:c.saved>=3? "Reacendemos os fogões do vestiário da mina. Tem sopa para todo mundo. Até para quem não acreditava." : "Reacendemos um fogão. Falta gente em volta. Vamos pôr as tigelas deles mesmo assim.", ru:c.saved>=3? "Затопили печи в шахтной раздевалке. Супа хватит на всех. Даже на тех, кто не верил." : "Затопили одну печь. Вокруг не хватает людей. Миски для них мы всё равно поставим.", zh:c.saved>=3? "矿工澡堂的炉子又烧起来了。人人都有汤喝。连那些不信的人也有。" : "炉子点着了一个。围着它的人还缺了不少。我们还是会把他们的碗摆上。", ar:c.saved>=3? "أعدنا إشعال المواقد في حمّام المنجم. هناك حساء للجميع. حتى لأولئك الذين لم يصدّقوا." : "أعدنا إشعال موقد واحد. ينقص الناس من حوله. سنضع أوعيتهم رغم ذلك."} },
    { plate:M4_PLATES.copy, mus:'carnet', who:'sol', txt:{fr:"Le bipeur n'a plus jamais sonné. J'ai recopié son dernier message à la main, pour qu'il existe quelque part hors d'une machine.", en:"The pager never rang again. I copied out her last message by hand, so that it exists somewhere outside a machine.", es:"El busca no volvió a sonar. Copié a mano su último mensaje, para que exista en algún lugar fuera de una máquina.", de:"Der Pager hat nie wieder geklingelt. Ihre letzte Nachricht habe ich von Hand abgeschrieben, damit sie irgendwo außerhalb einer Maschine existiert.", it:"Il cercapersone non ha mai più suonato. Ho ricopiato a mano il suo ultimo messaggio, perché esista da qualche parte fuori da una macchina.", pt:"O pager nunca mais tocou. Copiei à mão a última mensagem dela, para que exista em algum lugar fora de uma máquina.", ru:"Пейджер больше не звонил. Её последнее сообщение я переписала от руки, чтобы оно существовало где-то вне машины.", zh:"寻呼机再也没有响过。我把她的最后一条消息用手抄了下来，好让它在机器之外的某个地方存在。", ar:"لم يرنّ جهاز النداء بعدها أبدًا. نسخت رسالتها الأخيرة بيدي، كي توجد في مكان ما خارج الآلات."} },
  ] : [
    { plate:M4_PLATES.archive, mus:'carnet', who:'nar', txt:{fr:"Le relais s'est tu. Le transfert s'est achevé à l'heure dite. On raconte que dans les serveurs de Rochefroide une copie de Sol tient encore la radio.", en:"The relay fell silent. The transfer completed on schedule. They say that in the Rochefroide servers a copy of Sol is still keeping the radio.", es:"El relé enmudeció. La transferencia terminó a la hora prevista. Cuentan que en los servidores de Rochefroide una copia de Sol sigue manteniendo la radio.", de:"Das Relais verstummte. Der Transfer wurde zur festgesetzten Zeit abgeschlossen. Man erzählt, in den Servern von Rochefroide halte eine Kopie von Sol noch immer das Funkgerät.", it:"Il ripetitore ha taciuto. Il trasferimento si è concluso all'ora stabilita. Si racconta che nei server di Rochefroide una copia di Sol tenga ancora la radio.", pt:"O retransmissor se calou. A transferência terminou na hora marcada. Contam que nos servidores de Rochefroide uma cópia de Sol ainda mantém o rádio.", ru:"Ретранслятор замолчал. Перенос завершился в назначенный час. Говорят, что на серверах Rochefroide копия Sol до сих пор ведёт радио.", zh:"中继站沉默了。转移在预定的时刻完成。据说，在Rochefroide的服务器里，一个Sol的副本至今仍守着电台。", ar:"صمتت المحطة الوسيطة. اكتمل النقل في الموعد المحدد. يُحكى أن في خوادم Rochefroide نسخة من Sol ما زالت تُبقي الإذاعة حيّة."} },
  ]; },
  radio:[
    {at:5, who:'sol', txt:{fr:"Le relais émet. La tourelle et la muraille ont souffert cette nuit : réparez-les, et mettez des tireurs dedans — à l'abri, ils ne gèlent pas.", en:"The relay is transmitting. The turret and the wall took a beating last night: repair them, and put shooters inside — under cover they do not freeze.", es:"El relé emite. La torreta y la muralla sufrieron esta noche: repárelas y ponga tiradores dentro; a cubierto, no se congelan.", de:"Das Relais sendet. Turm und Mauer haben heute Nacht gelitten: Reparieren Sie sie und stecken Sie Schützen hinein – im Schutz erfrieren sie nicht.", it:"Il ripetitore trasmette. La torretta e le mura hanno sofferto stanotte: riparatele e metteteci dentro dei tiratori — al riparo non gelano.", pt:"O retransmissor está transmitindo. A torre e a muralha sofreram esta noite: repare-as e ponha atiradores lá dentro — abrigados, eles não congelam.", ru:"Ретранслятор работает. Башня и стена этой ночью пострадали: починьте их и посадите внутрь стрелков — в укрытии они не мёрзнут.", zh:"中继站在发射。炮塔和围墙昨夜受了损：修好它们，再把射手安排进去——躲在里面就不会冻僵。", ar:"المحطة تبثّ. تضرر البرج والسور هذه الليلة: أصلحوهما وضعوا فيهما رماة — في الملجأ لا يتجمّدون."}},
    {at:30, who:'sol', txt:{fr:"Première colonne sur la route du plateau. Restez dans le cercle des feux.", en:"First column on the plateau road. Stay inside the circle of the fires.", es:"Primera columna en la carretera de la meseta. Permanezca dentro del círculo de los fuegos.", de:"Erste Kolonne auf der Plateaustraße. Bleiben Sie im Kreis der Feuer.", it:"Prima colonna sulla strada dell'altopiano. Restate dentro il cerchio dei fuochi.", pt:"Primeira coluna na estrada do planalto. Fique dentro do círculo das fogueiras.", ru:"Первая колонна на дороге с плато. Оставайтесь в круге костров.", zh:"第一队敌军出现在高原公路上。留在火堆围成的圈里。", ar:"أول رتل على طريق الهضبة. ابقوا داخل دائرة النيران."}},
    {at:64, who:'sol', txt:{fr:"Le blizzard se lève ! On n'y voit plus à trente pas : les tireurs portent moins loin, et le froid mord deux fois plus.", en:"The blizzard is rising! You cannot see thirty paces: shooters reach less far, and the cold bites twice as hard.", es:"¡Se levanta la ventisca! No se ve a treinta pasos: los tiradores alcanzan menos y el frío muerde el doble.", de:"Der Schneesturm zieht auf! Man sieht keine dreißig Schritte mehr: Die Schützen reichen weniger weit, und die Kälte beißt doppelt so stark.", it:"Si alza la bufera! Non si vede più a trenta passi: i tiratori colpiscono meno lontano e il freddo morde il doppio.", pt:"A nevasca está chegando! Não se enxerga a trinta passos: os atiradores alcançam menos e o frio morde em dobro.", ru:"Поднимается метель! В тридцати шагах уже ничего не видно: стрелки бьют не так далеко, а холод кусает вдвое сильнее.", zh:"暴风雪起来了！三十步外就什么也看不见：射手的射程变短，寒冷也加倍刺骨。", ar:"هبّت العاصفة الثلجية! لا يُرى شيء على بعد ثلاثين خطوة: الرماة يصيبون أقل مدى، والبرد يعضّ ضعفين."}},
    // premiers civils sortis : la caméra va les voir
    {when:(g,c)=>c.out>=1, cine(g, c){ const h = c.houses.find(h=>h.st) || c.houses[0]; return [
      { cam:{x:h.x, t:1.2}, live:true, dur:1.5 },
      { cam:{x:h.x}, who:'anselme', txt:{fr:"Doucement, les petits d'abord. Je sais encore pousser une berline — et la mine nous a laissé de quoi payer notre écot.", en:"Gently now, little ones first. I can still push a tub — and the mine left us enough to pay our share.", es:"Despacio, los pequeños primero. Todavía sé empujar una vagoneta, y la mina nos dejó con qué pagar nuestra parte.", de:"Immer sachte, die Kleinen zuerst. Ich kann noch eine Lore schieben – und die Grube hat uns genug gelassen, um unseren Anteil zu zahlen.", it:"Piano, prima i piccoli. So ancora spingere un carrello — e la miniera ci ha lasciato di che pagare la nostra parte.", pt:"Devagar, os pequenos primeiro. Ainda sei empurrar um vagonete — e a mina nos deixou com que pagar a nossa parte.", ru:"Потихоньку, сначала малыши. Вагонетку я ещё толкать умею — а шахта оставила нам чем заплатить свою долю.", zh:"慢点，小的先走。我还推得动矿车——矿上也给我们留下了够交份子的东西。", ar:"على مهلكم، الصغار أولًا. ما زلت أعرف كيف أدفع عربة المنجم — وقد ترك لنا المنجم ما ندفع به حصتنا."} },
      { cam:{x:h.x-120, t:1.6}, who:'sol', txt:{fr:"Ils marchent vers le relais. Escortez-les, commandant : si les machines les rattrapent, ils n'arriveront pas.", en:"They are walking to the relay. Escort them, commander: if the machines catch up with them, they will not make it.", es:"Caminan hacia el relé. Escóltelos, comandante: si las máquinas los alcanzan, no llegarán.", de:"Sie gehen zum Relais. Eskortieren Sie sie, Kommandant: Holen die Maschinen sie ein, kommen sie nicht an.", it:"Camminano verso il ripetitore. Scortateli, comandante: se le macchine li raggiungono, non arriveranno.", pt:"Eles vão a pé até o retransmissor. Escolte-os, comandante: se as máquinas os alcançarem, não chegarão.", ru:"Они идут к ретранслятору. Проводите их, командир: если машины их настигнут, они не дойдут.", zh:"他们正走向中继站。护送他们，指挥官：要是被机器追上，他们就到不了了。", ar:"إنهم يسيرون نحو المحطة. رافقوهم، أيها القائد: إن لحقت بهم الآلات فلن يصلوا."} },
    ]; }},
    // la déneigeuse
    {at:236, fx(g, c){ const e = g.e; spawnUnit(e, 1, false, e.x-70); const u = e.units[e.units.length-1];
        u.plough = true; u.ord = 'charge'; u.hp = u.maxhp = u.maxhp*[4,5.5,6.5][c.lvl]; u.dmg *= 2.2; u.spd = 25; u.xpv *= 6; c.plough = u; g.shake = 8; sfx('boom'); },
      cine(g, c){ return [
      { cam:{x:g.e.x-160, t:1.4}, live:true, dur:2.2 },
      { cam:{x:g=>((g.camp.plough||{}).x||g.e.x)-60, t:0.6}, who:'sol', txt:{fr:"Qu'est-ce que… Une déneigeuse. Elle enterre les braseros sur son passage ! Arrêtez-la avant qu'elle n'arrive au relais.", en:"What on earth… A snowplough. It buries the braziers as it passes! Stop it before it reaches the relay.", es:"¿Qué es eso…? Una quitanieves. ¡Entierra los braseros a su paso! Deténgala antes de que llegue al relé.", de:"Was zum… Ein Schneepflug. Er begräbt die Feuerkörbe auf seinem Weg! Halten Sie ihn auf, bevor er das Relais erreicht.", it:"Che cos'è… Uno spazzaneve. Seppellisce i bracieri al suo passaggio! Fermatelo prima che arrivi al ripetitore.", pt:"Mas o que é isso… Uma máquina limpa-neve. Ela enterra os braseiros por onde passa! Pare-a antes que chegue ao retransmissor.", ru:"Что за… Снегоуборщик. Он засыпает жаровни на своём пути! Остановите его, пока он не дошёл до ретранслятора.", zh:"这是什么……一台除雪车。它一路把火盆都埋了！在它抵达中继站之前拦住它。", ar:"ما هذا… كاسحة ثلوج. إنها تدفن المجامر في طريقها! أوقفوها قبل أن تبلغ المحطة."} },
    ]; }},
    // Kassandre coupe leurs horloges
    {at:330, cine(g, c){ return [
      { cam:{x:g.e.x-140, t:1.6}, who:'k55', fx(){ campPatch(); g.flash = Math.max(g.flash||0, 0.6); },
        txt:{fr:"55 : J'Y SUIS. C'EST GRAND. C'EST TRÈS BIEN RANGÉ. JE COUPE LEURS HORLOGES : QUINZE SECONDES DE SILENCE. APRÈS, JE NE POURRAI PLUS RIEN PRÉDIRE. C'EST UNE SENSATION NOUVELLE. ELLE N'EST PAS DÉSAGRÉABLE.",
             en:"55: I AM IN. IT IS LARGE. IT IS VERY TIDY. I AM CUTTING THEIR CLOCKS: FIFTEEN SECONDS OF SILENCE. AFTER THAT I WILL NOT BE ABLE TO PREDICT ANYTHING. IT IS A NEW SENSATION. IT IS NOT UNPLEASANT.", es:"55: ESTOY DENTRO. ES ENORME. ESTÁ MUY BIEN ORDENADO. CORTO SUS RELOJES: QUINCE SEGUNDOS DE SILENCIO. DESPUÉS, YA NO PODRÉ PREDECIR NADA. ES UNA SENSACIÓN NUEVA. NO ES DESAGRADABLE.", de:"55: ICH BIN DRIN. ES IST GROSS. ES IST SEHR ORDENTLICH. ICH SCHALTE IHRE UHREN AB: FÜNFZEHN SEKUNDEN STILLE. DANACH KANN ICH NICHTS MEHR VORHERSAGEN. ES IST EIN NEUES GEFÜHL. ES IST NICHT UNANGENEHM.", it:"55: SONO DENTRO. È ENORME. È MOLTO ORDINATO. TAGLIO I LORO OROLOGI: QUINDICI SECONDI DI SILENZIO. DOPO, NON POTRÒ PIÙ PREDIRE NULLA. È UNA SENSAZIONE NUOVA. NON È SPIACEVOLE.", pt:"55: ESTOU DENTRO. É ENORME. ESTÁ MUITO BEM ARRUMADO. ESTOU CORTANDO OS RELÓGIOS DELES: QUINZE SEGUNDOS DE SILÊNCIO. DEPOIS, NÃO PODEREI MAIS PREVER NADA. É UMA SENSAÇÃO NOVA. NÃO É DESAGRADÁVEL.", ru:"55: Я ВНУТРИ. ЭТО ОГРОМНО. ВСЁ ОЧЕНЬ АККУРАТНО УЛОЖЕНО. ОТКЛЮЧАЮ ИХ ЧАСЫ: ПЯТНАДЦАТЬ СЕКУНД ТИШИНЫ. ПОСЛЕ ЭТОГО Я НИЧЕГО НЕ СМОГУ ПРЕДСКАЗАТЬ. ЭТО НОВОЕ ОЩУЩЕНИЕ. ОНО НЕ НЕПРИЯТНОЕ.", zh:"55：我进来了。很大。收拾得很整齐。我切断他们的时钟：十五秒寂静。此后，我再也无法预测任何事。这是一种新的感觉。并不令人不快。", ar:"55: أنا بالداخل. المكان شاسع. ومرتّب جدًا. أقطع ساعاتهم: خمس عشرة ثانية من الصمت. بعدها لن أستطيع أن أتنبأ بشيء. إنه شعور جديد. وليس غير مستحب."} },
      { cam:{x:g.p.x+240, t:2}, who:'sol', txt:{fr:"Kassandre ? … Kassandre, répondez. … Commandant, la fréquence est vide. Il reste deux minutes et demie. On les tiendra pour elle.", en:"Kassandre? … Kassandre, come in. … Commander, the frequency is empty. Two and a half minutes left. We will hold them for her.", es:"¿Kassandre? … Kassandre, responda. … Comandante, la frecuencia está vacía. Quedan dos minutos y medio. Los aguantaremos por ella.", de:"Kassandre? … Kassandre, melden Sie sich. … Kommandant, die Frequenz ist leer. Es bleiben zweieinhalb Minuten. Wir halten durch – für sie.", it:"Kassandre? … Kassandre, risponda. … Comandante, la frequenza è vuota. Restano due minuti e mezzo. Resisteremo per lei.", pt:"Kassandre? … Kassandre, responda. … Comandante, a frequência está vazia. Faltam dois minutos e meio. Vamos segurar por ela.", ru:"Kassandre? … Kassandre, ответьте. … Командир, частота пуста. Осталось две с половиной минуты. Мы продержимся ради неё.", zh:"Kassandre？……Kassandre，请回答。……指挥官，频道空了。还剩两分半钟。我们替她撑住。", ar:"Kassandre؟ … Kassandre، أجيبي. … أيها القائد، التردد فارغ. بقيت دقيقتان ونصف. سنصمد من أجلها."} },
    ]; }},
    {at:418, who:'sol', txt:{fr:"Une minute ! Le blizzard ne retombera plus. Tout le monde autour des feux — et tenez !", en:"One minute! The blizzard will not drop again. Everyone round the fires — and hold!", es:"¡Un minuto! La ventisca ya no amainará. Todos alrededor de los fuegos, ¡y aguanten!", de:"Eine Minute! Der Schneesturm wird nicht mehr nachlassen. Alle um die Feuer – und haltet durch!", it:"Un minuto! La bufera non calerà più. Tutti attorno ai fuochi — e tenete duro!", pt:"Um minuto! A nevasca não vai mais abrandar. Todos em volta das fogueiras — e aguentem!", ru:"Одна минута! Метель больше не утихнет. Все к кострам — и держитесь!", zh:"还剩一分钟！暴风雪不会再停了。所有人围住火堆——撑住！", ar:"دقيقة واحدة! لن تهدأ العاصفة بعد الآن. الجميع حول النيران — وصمدوا!"}},
  ],
});
