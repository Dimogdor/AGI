/* ================= CAMPAGNE · MISSION II — GRÈVE GÉNÉRALE (v1.15) =================
   Valmont, le port de l'estuaire, à l'aube. Un CORTÈGE de grévistes marche de la halle aux
   grains jusqu'à Radio-Quai, la vieille station du port. Il avance seul, à son pas ; il s'arrête
   dès qu'une machine se met en travers de sa tête, et chaque coup qu'il prend disperse des gens.
   Les machines ne viennent pas d'une base : elles débarquent (barges le long du quai, terminal
   automatisé au bout, drones). En « Tenir », les troupes du joueur marchent en tête du cortège ;
   le bouton de mission dresse une barricade devant lui. Premier contact de Kassandre (« 55 »).  */
const M2 = { start:430, dest:2930, span:170 };
DECOR_THEMES.port = ['bollard','bollard','crate','pallet','tire','bollard','crate','tire','pallet'];
DECOR_EXTRA.bollard = (d, s) => {                                     // bitte d'amarrage
  dShadow(7*s); ctx.fillStyle = '#2c2f36'; ctx.fillRect(-4*s,-10*s,8*s,10*s);
  ctx.beginPath(); ctx.ellipse(0,-10*s,6*s,2.4*s,0,0,6.283); ctx.fill();
  ctx.fillStyle = 'rgba(255,236,200,0.2)'; ctx.fillRect(-4*s,-9*s,1.6*s,9*s);
};
DECOR_EXTRA.crate = (d, s) => {                                       // caisse de bois
  ctx.scale(d.flip,1); dShadow(12*s); ctx.fillStyle = '#86683f'; ctx.fillRect(-10*s,-16*s,20*s,16*s);
  ctx.strokeStyle = 'rgba(31,27,23,0.55)'; ctx.lineWidth = 1; ctx.strokeRect(-10*s,-16*s,20*s,16*s);
  ctx.beginPath(); ctx.moveTo(-10*s,-16*s); ctx.lineTo(10*s,0); ctx.stroke();
  ctx.fillStyle = 'rgba(31,27,23,0.5)'; ctx.font = (6*s).toFixed(1)+'px "Courier New",monospace'; ctx.textAlign = 'center'; ctx.fillText('VLM', 0, -5*s);
};
DECOR_EXTRA.pallet = (d, s) => {                                      // palettes empilées
  dShadow(13*s); for (let i=0;i<3;i++){ ctx.fillStyle = i%2? '#9a7a4c' : '#83653d'; ctx.fillRect(-12*s,-(i+1)*4*s,24*s,3*s);
    ctx.fillStyle = 'rgba(31,27,23,0.45)'; ctx.fillRect(-12*s,-(i+1)*4*s+3*s,24*s,1*s); }
};
DECOR_EXTRA.tire = (d, s) => {                                        // pneus de défense du quai
  dShadow(9*s); ctx.fillStyle = '#1d1c20'; ctx.beginPath(); ctx.ellipse(0,-6*s,9*s,6*s,0,0,6.283); ctx.fill();
  ctx.fillStyle = '#3a3840'; ctx.beginPath(); ctx.ellipse(0,-6*s,4*s,2.6*s,0,0,6.283); ctx.fill();
};

/* ---------- LIEU : le port de Valmont à l'aube (grues, conteneurs, silos, brume, mouettes) ---------- */
const M2_DAWN = [[94,108,138],[204,168,164],[238,190,146]], M2_MORN = [[124,152,180],[212,204,196],[240,220,184]];
const M2_INK = '#2b2a30';
BIOMES.port = {
  id:'port', music:'strike', amb:{ wind:0.022, birds:false, tick:m2Amb },
  sky:M2_DAWN.map(a=>a.slice()), dirt:[98,96,94], grass:[152,148,140], tufts:false, trees:false,
  terrain:{a:3,f1:0.0042,b:2,f2:0.0113,c:1.5,f3:0.021,base:2},
  layers:[
    { par:0.03, w:1024, h:150, off:0, paint(g, w, h, rnd){                          // l'autre rive : collines, raffinerie au loin
        const P = 6.283/w;
        g.fillStyle = '#b4b2ba'; g.beginPath(); g.moveTo(0,h);
        for (let x=0;x<=w;x+=8) g.lineTo(x, h-34-16*Math.sin(x*P*2+1)-9*Math.sin(x*P*5));
        g.lineTo(w,h); g.closePath(); g.fill();
        let x = 30; while (x < w-80){ const bw = 14+rnd()*30, bh = 10+rnd()*22;
          g.fillStyle = '#a6a6b0'; g.fillRect(x, h-34-bh, bw, bh+34);
          if (rnd()<0.4){ g.fillRect(x+bw*0.4, h-34-bh-38, 4, 38);                      // cheminée et sa fumée plate
            g.fillStyle = 'rgba(190,186,190,0.7)'; for (let k=0;k<5;k++) g.fillRect(x+bw*0.4+k*9, h-34-bh-42-k*2, 14, 3); }
          x += bw + 20 + rnd()*90; } } },
    { par:0.07, w:1024, h:58, off:0, paint(g, w, h, rnd){                           // l'estuaire : eau, reflets, cargos au mouillage
        g.fillStyle = '#909cab'; g.fillRect(0, h-42, w, 42);
        g.fillStyle = '#a9b2bd'; g.fillRect(0, h-42, w, 2);
        g.fillStyle = 'rgba(246,226,190,0.55)'; for (let i=0;i<150;i++){ const y = h-38+rnd()*36; g.fillRect(rnd()*w, y, 4+rnd()*20*(1-(y-h+38)/40), 1); }
        for (const sx of [140, 610]){ const L = 150+rnd()*40;                              // cargo : coque, château, conteneurs
          g.fillStyle = '#5c6470'; g.beginPath(); g.moveTo(sx, h-42); g.lineTo(sx+L, h-42); g.lineTo(sx+L-8, h-30); g.lineTo(sx+6, h-30); g.closePath(); g.fill();
          g.fillStyle = '#6a7380'; g.fillRect(sx+L-34, h-62, 22, 20); g.fillRect(sx+L-28, h-70, 6, 8);
          const cols = ['#8a6a5a','#7a8a8a','#9a8a6a','#6a7a90'];
          for (let c=0;c<Math.floor((L-50)/16);c++){ const n = 1+(rnd()*3|0); for (let r=0;r<n;r++){ g.fillStyle = cols[(c+r)%4]; g.fillRect(sx+8+c*16, h-42-(r+1)*6, 15, 5.4); } } } } },
    { par:0.15, w:1280, h:250, off:2, paint(g, w, h, rnd){                          // portiques de déchargement, silos à grain
        const C = '#5f6875', lit = 'rgba(255,224,178,0.38)';
        const beam = (pts, wd) => { g.strokeStyle = C; g.lineWidth = wd; g.lineCap = 'square'; g.beginPath(); for (let i=0;i<pts.length;i+=2) i? g.lineTo(pts[i],pts[i+1]) : g.moveTo(pts[i],pts[i+1]); g.stroke(); };
        for (const x0 of [90, 430, 760]){ const up = rnd()<0.4, top = h-150;
          beam([x0,h, x0+12,top], 5); beam([x0+74,h, x0+62,top], 5);                 // jambes du portique
          beam([x0+3,h-60, x0+71,h-60], 3); beam([x0+6,h-110, x0+68,h-110], 3); beam([x0+3,h-60, x0+68,h-110], 2);
          beam([x0-10,top, x0+90,top], 7);                                              // poutre
          if (up) beam([x0+80,top, x0+170,top-120], 6); else beam([x0+90,top, x0+200,top], 6);   // flèche (levée ou couchée)
          beam([x0+37,top, x0+37,top-58], 4); beam([x0+37,top-58, x0-10,top], 1.4); beam([x0+37,top-58, up? x0+170 : x0+200, up? top-120 : top], 1.4);
          g.fillStyle = C; g.fillRect(x0+14, top-24, 40, 18);                            // cabine de machinerie
          g.fillStyle = lit; g.fillRect(x0, top+4, 3, 146); g.fillRect(x0+14, top-24, 4, 18);
          if (!up){ g.strokeStyle = 'rgba(70,76,86,0.8)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0+150, top+3); g.lineTo(x0+150, top+70); g.stroke(); g.fillStyle = C; g.fillRect(x0+140, top+70, 20, 6); } }
        const sx = 1010;                                                                  // silos à grain
        for (let i=0;i<5;i++){ const x = sx+i*36;
          g.fillStyle = '#7b828d'; g.fillRect(x, h-170, 34, 170); g.beginPath(); g.ellipse(x+17, h-170, 17, 6, 0, 3.14, 6.283); g.fill();
          g.fillStyle = 'rgba(255,224,178,0.32)'; g.fillRect(x, h-170, 6, 170); g.fillStyle = 'rgba(40,44,54,0.25)'; g.fillRect(x+26, h-170, 8, 170); }
        g.fillStyle = '#6c737e'; g.fillRect(sx-4, h-192, 188, 14); g.fillRect(sx+60, h-212, 40, 22);   // galerie et tour de manutention
        g.fillStyle = 'rgba(31,27,23,0.35)'; for (let k=0;k<9;k++) g.fillRect(sx+4+k*20, h-188, 8, 4);
        g.fillStyle = '#e9dfc6'; g.font = '700 11px "Courier New",monospace'; g.textAlign = 'center'; g.fillText('COOP. GRAINS', sx+90, h-150); } },
    { par:0.3, w:1024, h:124, off:4, paint(g, w, h, rnd){                           // conteneurs, entrepôt à sheds, réverbères
        const cols = ['#8c4a36','#b0843c','#3f6a6c','#55657a','#7a3b3b','#6b7a4a'];
        let x = 6; while (x < w-60){
          if (x>420 && x<470){ const ww = 210, hh = 72;                                 // entrepôt à toit en sheds
            if (x+ww > w-6) break;
            g.fillStyle = '#6a6762'; g.fillRect(x, h-hh, ww, hh);
            for (let k=0;k<6;k++){ g.fillStyle = '#5a5752'; g.beginPath(); g.moveTo(x+k*35, h-hh); g.lineTo(x+k*35, h-hh-16); g.lineTo(x+k*35+35, h-hh); g.closePath(); g.fill();
              g.fillStyle = 'rgba(232,212,170,0.55)'; g.fillRect(x+k*35+1, h-hh-14, 3, 13); }
            g.fillStyle = 'rgba(31,27,23,0.3)'; g.fillRect(x+20, h-40, 46, 40); g.fillRect(x+120, h-40, 46, 40);
            g.fillStyle = '#e9dfc6'; g.font = '700 10px "Courier New",monospace'; g.textAlign = 'left'; g.fillText('HANGAR 7', x+80, h-52);
            x += ww + 20; continue; }
          const n = rnd()<0.5? 1 : 2, tiers = 1+(rnd()*4|0), cw = 46;
          for (let c=0;c<n;c++) for (let r=0;r<tiers;r++){ if (r>0 && rnd()<0.18) continue;
            const bx = x+c*cw, by = h-(r+1)*19, col = cols[(rnd()*cols.length)|0];
            g.fillStyle = col; g.fillRect(bx, by, cw-1, 18);
            g.fillStyle = 'rgba(20,18,24,0.22)'; for (let k=3;k<cw-4;k+=4) g.fillRect(bx+k, by+2, 1.2, 14);
            g.fillStyle = 'rgba(20,18,24,0.28)'; g.fillRect(bx+cw-7, by, 6, 18);
            g.fillStyle = 'rgba(255,232,190,0.35)'; g.fillRect(bx, by, cw-1, 1.5); g.fillRect(bx, by, 2, 18); }
          x += n*cw + 6 + rnd()*44;
          if (rnd()<0.25 && x < w-40){ g.fillStyle = M2_INK; g.fillRect(x+6, h-110, 2, 110); g.fillRect(x+6, h-110, 12, 3); x += 24; } } } },
  ],
  sky2(vw, t){                                                                          // soleil pâle dans la brume, longs stratus
    const k = (game && game.camp)? clamp(game.camp.t/420, 0, 1) : 0;
    const sx = vw*0.26 - camX*0.012, sy = GROUND - 130 - k*70;
    ctx.fillStyle = 'rgba(250,232,196,0.95)'; ctx.beginPath(); ctx.arc(sx, sy, 24, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(214,180,166,0.55)'; ctx.fillRect(sx-30, sy+4, 60, 3); ctx.fillRect(sx-28, sy+11, 56, 2);   // la brume raye le disque
    for (let i=0;i<5;i++){ const cx = ((i*410 + t*3 - camX*0.02) % (vw+500) + vw+500) % (vw+500) - 250, cy = 40 + i*26 + (i%2)*10;
      ctx.fillStyle = 'rgba(244,226,206,0.42)'; ctx.fillRect(cx-140, cy, 280, 5); ctx.fillRect(cx-90, cy-4, 170, 4);
      ctx.fillStyle = 'rgba(120,110,130,0.16)'; ctx.fillRect(cx-130, cy+5, 260, 3); }
  },
  back(vw, t){                                                                          // mouettes
    ctx.strokeStyle = '#2b2a30'; ctx.lineWidth = 1.3; ctx.beginPath();
    for (let i=0;i<7;i++){ const x = ((i*263 + t*(16+i*4)) % (vw+200)) - 100, y = 70 + (i*41)%130 + Math.sin(t*0.9+i)*8, f = Math.sin(t*(6+i)+i)*3;
      ctx.moveTo(x-7, y-f); ctx.quadraticCurveTo(x-3, y-3-f*0.3, x, y); ctx.quadraticCurveTo(x+3, y-3-f*0.3, x+7, y-f); }
    ctx.stroke();
  },
  front(t){                                                                             // bancs de brume qui se lèvent avec le jour
    const k = (game && game.camp)? clamp(game.camp.t/420, 0, 1) : 0, a = 0.5 - 0.3*k;
    const f = fxSprite('M2FOG', 256, 48, g => { const r = g.createLinearGradient(0,0,0,48);
      r.addColorStop(0,'rgba(236,232,226,0)'); r.addColorStop(0.5,'rgba(236,232,226,0.55)'); r.addColorStop(1,'rgba(236,232,226,0)'); g.fillStyle = r; g.fillRect(0,0,256,48); });
    ctx.globalAlpha = a;
    for (let i=0;i<3;i++){ const y = Y_G - 70 + i*22, sp = 6+i*5, ox = -((t*sp + camX*zoom*(0.4+i*0.2)) % 512);
      for (let x = ox; x < W; x += 512) ctx.drawImage(f, x, y, 512, 40+i*10); }
    ctx.globalAlpha = 1;
  },
};
function m2Amb(t){                                                                      // cris de mouettes, corne de brume au loin
  if (Math.random()<0.035){ tone(1500+Math.random()*300, t, .16, 'triangle', .006, -520); tone(1350, t+.2, .22, 'triangle', .005, -560); }
  if (((t % 37) + 37) % 37 < 0.25) tone(66, t, 2.6, 'sawtooth', .018, 0, .6, 240);
}

/* ---------- MUSIQUE : « la grève » — caisse claire de fanfare, cuivres graves, mélodie scandée ---------- */
MUSIC_THEMES.strike = { bpm:92, step(st, t, d, s){
  const bar = Math.floor(st/8), s8 = st%8, ch = [[50,53,57],[46,50,53],[48,52,55],[45,49,52]][bar%4];
  if (s8===0 || s8===4) tone(58, t, .28, 'sine', .08, -18);                                          // grosse caisse
  if ([1,0,1,1,1,0,1,0][s8]) noise(t, .06, s8===4? .034 : .02, 1900);                               // caisse claire de fanfare
  if (bar%4===3 && s8>=6) for (let k=1;k<4;k++) noise(t+d*k/4, .04, .012+.004*k, 2100);             // roulement
  if (s8===0){ tone(m2f(ch[0]-12), t, d*7.4, 'sawtooth', .02, 0, d*0.3, 520); tone(m2f(ch[2]-12), t, d*7.4, 'sawtooth', .013, 0, d*0.5, 480);
    tone(m2f(ch[0]-24), t, d*7.8, 'sine', .07, 0, d*0.2); }                                         // cuivres graves + basse
  if (s>0.3 && (s8===3 || s8===6)) tone(m2f(ch[1]-12), t, d*1.1, 'sawtooth', .018, 0, 0, 700);     // appels de cuivres quand ça chauffe
  const n = [62,0,62,0,65,0,64,62, 60,0,62,0,57,0,0,0, 62,0,62,0,65,0,67,69, 67,0,65,64,62,0,0,0][st%32];
  if (n && bar%8>=2){ tone(m2f(n), t, d*1.7, 'square', .011, 0, d*0.15, 950); tone(m2f(n-12), t, d*1.7, 'triangle', .02, 0, d*0.15, 700); }   // la foule scande
} };

/* ---------- personnages ---------- */
CINE_WHO.mado = { name:'MADO', ink:'#2f4a6a' };
// MADO : déléguée des dockers, la quarantaine, béret rouge, cheveux bouclés, mégaphone
CINE_PORTRAITS.mado = g => {
  inkWash(g, [8,64, 12,48, 24,42, 40,42, 52,48, 56,64], '#2f4a6a', 0.92);                     // veste de docker
  inkWash(g, [24,42, 32,50, 40,42], '#e9dfc6', 0.95);                                        // col
  g.fillStyle = '#2a201a'; for (const [x,y,r] of [[22,24,5],[42,24,5],[21,32,4.5],[43,32,4.5],[25,17,5],[39,17,5],[32,15,6]]){ g.beginPath(); g.arc(x,y,r,0,6.283); g.fill(); }
  g.fillStyle = '#c99a72'; g.beginPath(); g.ellipse(32, 29, 10, 12.5, 0, 0, 6.283); g.fill();   // visage
  inkWash(g, [18,16, 26,8, 42,8, 48,14, 44,17, 22,18], '#8a2018', 0.95);                     // béret
  g.fillStyle = '#1f1b17'; g.fillRect(26.5,26,2,2); g.fillRect(35.5,26,2,2);
  inkLine(g, [25,23.5, 29.5,22.6], 1, 1.4); inkLine(g, [34.5,22.6, 39,23.5], 1, 1.4);        // sourcils froncés
  inkLine(g, [28.5,36, 35.5,36], 1, 1.3); inkLine(g, [32,28, 31,32, 33,32], 1, 0.8);
  inkWash(g, [44,50, 58,42, 60,56, 46,54], '#c8b27a', 1); inkLine(g, [44,50, 58,42, 60,56, 46,54, 44,50], 1, 1);   // mégaphone
};

/* ---------- sprites cuits (une fois) ---------- */
const M2_BAN = [{fr:"GRÈVE GÉNÉRALE", en:"GENERAL STRIKE"}, {fr:"ON NE DÉSAFFECTE PAS", en:"WE ARE NOT DECOMMISSIONED"}, {fr:"VALMONT DEBOUT", en:"VALMONT STANDS"}];
function m2Folk(v){ return fxSprite('M2F'+v, 16, 34, g => {                         // un gréviste (6 variantes)
  const coat = ['#2f4a6a','#7a5a2a','#3d5a3a','#5a5a62','#6a2a24','#334050'][v%6], skin = ['#e0b896','#c99a72','#a8754e'][v%3];
  g.fillStyle = '#1f1b17'; g.fillRect(5,24,2.4,10); g.fillRect(8.8,24,2.4,10);
  g.fillStyle = coat; g.beginPath(); g.moveTo(3.5,13); g.lineTo(12.5,13); g.lineTo(13.5,26); g.lineTo(2.5,26); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(31,27,23,0.75)'; g.lineWidth = 0.8; g.stroke();
  g.fillStyle = skin; g.beginPath(); g.arc(8,8.6,3.6,0,6.283); g.fill();
  if (v%4===0){ g.fillStyle = '#1f1b17'; g.fillRect(4.2,4.4,7.6,2.2); g.fillRect(7,5.6,6.4,1.2); }
  else if (v%4===2){ g.fillStyle = '#c42a1c'; g.fillRect(4.6,12,6.8,2.2); g.fillStyle = '#3a2a20'; g.beginPath(); g.arc(8,7.6,3.7,3.3,6.1); g.fill(); }
  else { g.fillStyle = v%4===1? '#3a2a20' : '#b9b4ac'; g.beginPath(); g.arc(8,7.6,3.7,3.3,6.1); g.fill(); }
  if (v%3===0){ g.strokeStyle = coat; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(11.5,14.5); g.lineTo(13.4,4.4); g.stroke();
    g.fillStyle = skin; g.beginPath(); g.arc(13.6,3.6,1.6,0,6.283); g.fill(); }                 // poing levé
}); }
function m2Banner(i){ return fxSprite('M2B'+i+SETTINGS.lang, 74, 46, g => {
  g.strokeStyle = '#3a2a1c'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(4,46); g.lineTo(4,2); g.moveTo(70,46); g.lineTo(70,2); g.stroke();
  const col = ['#c42a1c','#e9dfc6','#1f1b17'][i%3], ink = ['#f3e7cc','#c42a1c','#e9dfc6'][i%3];
  g.fillStyle = col; g.beginPath(); g.moveTo(4,4); g.quadraticCurveTo(37,8,70,4); g.lineTo(70,21); g.quadraticCurveTo(37,25,4,21); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(31,27,23,0.6)'; g.lineWidth = 0.8; g.stroke();
  g.fillStyle = ink; g.font = '700 8.5px "Courier New",monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(cT(M2_BAN[i%3]), 37, 14, 62);
}); }
const m2Barricade = () => fxSprite('M2BAR', 64, 36, g => {                            // palettes, pneus, chariot renversé, drapeau
  g.fillStyle = '#6e5232'; g.fillRect(4,24,44,7); g.fillStyle = '#86653e'; g.fillRect(8,17,38,6); g.fillRect(14,11,26,5);
  g.fillStyle = 'rgba(31,27,23,0.5)'; for (let x=8;x<48;x+=8) g.fillRect(x,24,2,7);
  g.fillStyle = '#5c5e66'; g.beginPath(); g.moveTo(40,31); g.lineTo(46,14); g.lineTo(60,18); g.lineTo(56,31); g.closePath(); g.fill();
  g.fillStyle = '#1d1c20'; g.beginPath(); g.arc(14,30,6,0,6.283); g.arc(52,30,5,0,6.283); g.fill();
  g.fillStyle = '#4a4648'; g.beginPath(); g.arc(14,30,2.4,0,6.283); g.fill();
  g.strokeStyle = '#3a2a1c'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(27,12); g.lineTo(29,0); g.stroke();
  g.fillStyle = '#c42a1c'; g.beginPath(); g.moveTo(29,0.5); g.lineTo(42,2.5); g.lineTo(28.4,7); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(31,27,23,0.55)'; g.lineWidth = 0.8; g.strokeRect(4,24,44,7); g.strokeRect(8,17,38,6);
});
const m2Radio = () => fxSprite('M2RADIO', 140, 212, g => {                           // Radio-Quai : la station et son mât
  g.strokeStyle = 'rgba(43,42,48,0.45)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(70,40); g.lineTo(2,210); g.moveTo(70,40); g.lineTo(138,210); g.stroke();
  g.strokeStyle = M2_INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(62,152); g.lineTo(68,12); g.moveTo(78,152); g.lineTo(72,12); g.stroke();
  g.lineWidth = 0.9; g.beginPath(); for (let y=150, s=0; y>14; y-=9, s^=1){ const k = (152-y)/140, l = 62+6*k, r = 78-6*k; g.moveTo(s? l : r, y); g.lineTo(s? r : l, y-9); } g.stroke();
  g.fillStyle = '#b8402e'; for (let y=20; y<150; y+=34) g.fillRect(64+(y/140)*3, y, 12-(y/140)*0, 8);
  g.fillStyle = '#c42a1c'; g.beginPath(); g.arc(70,10,2.6,0,6.283); g.fill();
  g.fillStyle = '#76695e'; g.fillRect(22,150,96,62); g.fillStyle = '#5e534a'; g.fillRect(18,144,104,8);
  g.fillStyle = 'rgba(255,230,190,0.3)'; g.fillRect(22,152,5,60);
  g.fillStyle = '#2b2a30'; g.fillRect(34,164,16,14); g.fillRect(90,164,16,14); g.fillRect(62,180,16,32);
  g.fillStyle = '#e9dfc6'; g.fillRect(36,128,68,14); g.fillStyle = '#c42a1c'; g.font = '700 10px "Courier New",monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RADIO-QUAI', 70, 135.5);
  g.strokeStyle = M2_INK; g.lineWidth = 1; g.beginPath(); g.moveTo(40,142); g.lineTo(40,144); g.moveTo(100,142); g.lineTo(100,144); g.stroke();
});
const m2Barge = () => fxSprite('M2BARGE', 150, 44, g => {                          // barge de débarquement d'Omnicorp
  g.fillStyle = '#4b5562'; g.beginPath(); g.moveTo(4,20); g.lineTo(146,20); g.lineTo(138,40); g.lineTo(14,40); g.closePath(); g.fill();
  g.fillStyle = '#0b6fa8'; g.fillRect(10,24,130,3);
  g.fillStyle = '#5c6774'; g.fillRect(104,4,30,16); g.fillStyle = 'rgba(160,210,240,0.7)'; g.fillRect(108,8,22,4);
  g.fillStyle = '#e9dfc6'; g.font = '700 7px "Courier New",monospace'; g.textAlign = 'left'; g.fillText('OMNICORP · L-07', 16, 36);
  g.strokeStyle = 'rgba(20,20,26,0.6)'; g.lineWidth = 0.8; g.strokeRect(4.5,20.5,141,19);
});

/* ---------- planches (repère 480×270, encre sur page de carnet) ---------- */
function m2PagerPlate(msg){ return (g, w, h, t) => { plateBase(g, w, h);
  inkLine(g, [30,214, 450,214], 1, 3); inkHatch(g, 30, 214, 420, 30, 6);
  inkWash(g, [96,214, 104,104, 376,104, 384,214], '#23292b', 0.92); inkWash(g, [118,120, 362,120, 362,196, 118,196], '#9db79a', 1);
  g.fillStyle = 'rgba(20,40,24,0.14)'; for (let y=122;y<196;y+=3) g.fillRect(118,y,244,1);
  const full = cT(msg), lines = [], words = full.split(' '); let cur = '';
  for (const wd of words){ if ((cur+' '+wd).trim().length > 24){ lines.push(cur.trim()); cur = wd; } else cur += ' '+wd; } lines.push(cur.trim());
  g.fillStyle = '#1b2a1c'; g.font = '700 15px "Courier New",monospace'; g.textAlign = 'left';
  let left = Math.floor(Math.max(0, t-0.6)*22); lines.slice(0,4).forEach((l,i)=>{ if (left>0) g.fillText(l.slice(0,left), 128, 140+i*17); left -= l.length; });
  g.fillStyle = Math.sin(t*6)>0? '#0b6fa8' : 'rgba(11,111,168,0.3)'; g.beginPath(); g.arc(352, 206, 3.5, 0, 6.283); g.fill();
  for (let i=0;i<3;i++){ const r = ((t*0.9+i/3)%1); g.strokeStyle = 'rgba(11,111,168,'+(0.45*(1-r)).toFixed(3)+')'; g.lineWidth = 1.6; g.beginPath(); g.arc(240, 104, 20+r*80, 3.5, 5.9); g.stroke(); }
  plateEnd(g, w, h); }; }
const M2_PLATES = {
  gate(g, w, h, t){ plateBase(g, w, h, 'rgba(210,140,90,0.08)');                     // l'usine à l'arrêt, les outils posés
    const n = clamp(t/2, 0, 1), roof = [40,206, 40,112, 80,84, 80,112, 120,84, 120,112, 160,84, 160,112, 200,84, 200,206];
    inkWash(g, roof, '#1f1b17', 0.14); inkLine(g, roof, n, 2);
    inkLine(g, [212,206, 216,44, 232,44, 236,206], n, 2); inkHatch(g, 216, 44, 18, 162, 5);      // cheminée froide
    for (let i=0;i<10;i++) inkLine(g, [252+i*18,208, 252+i*18,118], n, 1.6);                  // grille fermée
    inkLine(g, [246,122, 424,122], n, 2.4); inkLine(g, [246,168, 424,168], n, 1.4);
    const m = clamp((t-1.4)/1.2, 0, 1);
    if (m>0){ inkWash(g, [292,138, 384,134, 386,166, 294,170], '#e9dfc6', 1); inkLine(g, [292,138, 384,134, 386,166, 294,170, 292,138], m, 1.8);
      g.fillStyle = '#c42a1c'; g.font = '700 16px "Courier New",monospace'; g.textAlign = 'center';
      g.fillText(cT({fr:'EN GRÈVE', en:'ON STRIKE'}).slice(0, Math.floor((t-1.4)*10)), 339, 158); }
    inkLine(g, [0,236, 480,236], 1, 2.2); inkHatch(g, 0, 236, 480, 34, 7, '#1f1b17', 0.2);
    inkLine(g, [58,230, 112,222], 1, 3.2); inkLine(g, [106,216, 118,228], 1, 4.5);              // clé posée
    inkLine(g, [138,232, 186,232], 1, 2.6); inkWash(g, [180,224, 196,224, 196,236, 180,236], '#1f1b17', 0.9);   // marteau
    inkLine(g, [400,234, 446,228], 1, 2.2); inkWash(g, [440,222, 452,224, 450,234, 438,232], '#c42a1c', 0.8);  // un gant rouge
    plateEnd(g, w, h); },
  quay(g, w, h, t){ plateBase(g, w, h, 'rgba(220,150,90,0.10)');                     // le port à l'aube, la foule se forme
    g.fillStyle = 'rgba(196,42,28,0.2)'; g.beginPath(); g.arc(110, 124, 30, 0, 6.283); g.fill();
    inkLine(g, [0,170, 480,170], 1, 1.4);
    for (let i=0;i<3;i++){ const x0 = 220+i*84, n = clamp(t/1.6-i*0.2, 0, 1);
      inkLine(g, [x0,214, x0+10,96, x0+42,96, x0+52,214], n, 2.2); inkLine(g, [x0-40,96, x0+96,96], n, 3);
      inkLine(g, [x0+26,96, x0+26,64], n, 1.8); inkLine(g, [x0-40,96, x0+26,64, x0+96,96], n, 0.9); }
    inkHatch(g, 0, 172, 480, 40, 6, '#1f1b17', 0.13);
    inkLine(g, [0,214, 480,214], 1, 2.4); inkHatch(g, 0, 214, 480, 56, 7, '#1f1b17', 0.22);
    const dx = Math.min(1, t/6)*30;
    for (let i=0;i<18;i++) inkFolk(g, 8+i*16+dx, 214+(i%3), 22+(i%4)*2, '#1f1b17', i%5===2? 1 : 0);
    for (const [bx,col] of [[54,'#c42a1c'],[180,'#1f1b17']]){ const x = bx+dx;
      inkLine(g, [x,214, x,160], 1, 1.6); inkLine(g, [x+62,214, x+62,160], 1, 1.6);
      inkWash(g, [x,160, x+62,162, x+62,176, x,174], col, 0.92); }
    g.fillStyle = '#efe6cf'; g.font = '700 9px "Courier New",monospace'; g.textAlign = 'center';
    g.fillText(cT(M2_BAN[0]), 85+dx, 171); g.fillText(cT(M2_BAN[2]), 211+dx, 171);
    plateEnd(g, w, h); },
  broadcast(g, w, h, t){ plateBase(g, w, h);                                          // l'appel fait le tour du pays
    const map = [150,60, 230,40, 300,58, 360,50, 392,96, 380,150, 404,200, 340,236, 268,226, 210,244, 160,214, 128,170, 140,120, 118,90];
    inkWash(g, map, '#3d4a3a', 0.12); inkLine(g, map.concat([150,60]), clamp(t/1.6,0,1), 1.8);
    const towns = [[262,140],[210,110],[320,92],[350,178],[190,190],[290,206],[236,70],[160,150],[372,128],[300,150],[240,180]];
    towns.forEach(([x,y],i)=>{ const on = t > 1.2 + i*0.32; g.fillStyle = on? '#c42a1c' : 'rgba(31,27,23,0.35)'; g.beginPath(); g.arc(x, y, on? 4.5 : 2.4, 0, 6.283); g.fill(); });
    inkLine(g, [70,230, 76,110, 82,230], 1, 1.8); inkLine(g, [60,230, 100,230], 1, 2.4);              // le mât
    for (let i=0;i<4;i++){ const r = ((t*0.5+i/4)%1); g.strokeStyle = 'rgba(196,42,28,'+(0.55*(1-r)).toFixed(3)+')'; g.lineWidth = 1.6; g.beginPath(); g.arc(76, 110, 20+r*240, -0.9, 0.5); g.stroke(); }
    plateEnd(g, w, h); },
  scattered(g, w, h, t){ plateBase(g, w, h, 'rgba(40,50,70,0.12)');                  // le cortège dispersé
    inkLine(g, [0,206, 480,206], 1, 2.4); inkHatch(g, 0, 206, 480, 64, 7, '#1f1b17', 0.25);
    inkWash(g, [120,206, 190,192, 196,202, 128,214], '#c42a1c', 0.8); inkLine(g, [100,214, 210,186], 1, 1.4);   // banderole à terre
    inkWash(g, [280,210, 330,204, 332,212, 282,218], '#e9dfc6', 0.9); inkLine(g, [280,210, 330,204, 332,212, 282,218, 280,210], 1, 1);
    inkLine(g, [360,206, 380,170], 1, 1.4); inkWash(g, [372,168, 400,172, 396,190, 368,186], '#e9dfc6', 0.9);   // pancarte plantée
    for (let i=0;i<4;i++) inkFolk(g, 430 + i*18 + t*10, 206, 20, 'rgba(31,27,23,0.55)');
    for (let i=0;i<5;i++){ const x = 60+i*80 + Math.sin(t+i)*6, y = 60+(i*31)%60; inkLine(g, [x-8,y-2, x,y+2, x+8,y-2], 1, 1.2); }
    plateEnd(g, w, h); },
};
M2_PLATES.k55 = m2PagerPlate({fr:"55. VOTRE CORTÈGE AVANCE À 0,7 KM/H. MES MODÈLES PRÉVOYAIENT ZÉRO.", en:"55. YOUR MARCH IS MOVING AT 0.7 KM/H. MY MODELS FORECAST ZERO."});
M2_PLATES.k55win = m2PagerPlate({fr:"55. ARRIVÉE DU CORTÈGE : PROBABILITÉ ESTIMÉE 3 %. JE CORRIGE MES MODÈLES.", en:"55. MARCH ARRIVAL: ESTIMATED PROBABILITY 3 %. I AM CORRECTING MY MODELS."});
M2_PLATES.k55hook = m2PagerPlate({fr:"55. SAINTE-AUBE.", en:"55. SAINTE-AUBE."});

/* ---------- vagues : débarquements scriptés (barges du quai, terminal, drones) ---------- */
// [instant (s), origine, rôles] — 0 mêlée, 1 tank, 2 tireur, 3 siège, 4 drone, 5 soutien
const M2_WAVES = [
  [22,'quay',[0,0,0]], [55,'quay',[0,2,0,2]], [90,'term',[1,2,2,0]], [122,'air',[4,4,4]],
  [180,'quay',[1,0,0,2,2]], [215,'quay',[3,2,2,0,0]], [248,'air',[4,4,4,0,0]], [282,'term',[1,1,0,2,2,3]], [318,'quay',[0,0,0,2,2,4,4]],
];
function m2Scale(c, roles){ const n = Math.max(2, Math.round(roles.length*[0.7,1,1.35][c.lvl])); const out = []; for (let i=0;i<n;i++) out.push(roles[i%roles.length]); return out; }
function m2Spawn(e, r, x){ if (e.units.length>=60) return; const k = e.units.length; spawnUnit(e, r, false, clamp(x, 60, WORLD-60)); for (let j=k;j<e.units.length;j++) e.units[j].ord = 'charge'; }
function m2Launch(g, c, src, roles){
  roles = m2Scale(c, roles); const e = g.e;
  if (src==='term'){ roles.forEach((r,i)=> m2Spawn(e, r, e.x-60-i*26)); return; }
  const air = src==='air'? roles.filter(r=>r===4) : [], sea = src==='air'? roles.filter(r=>r!==4) : roles;
  air.forEach((r,i)=> m2Spawn(e, r, c.mx + 640 + i*30));
  if (sea.length){ const x = clamp(c.mx + 560 + Math.random()*200, 900, WORLD-420);
    c.barges.push({ x, t:0, land:3.2, roles:sea }); if (!c.firstBarge) c.firstBarge = x; sfxAt('spec', x); }
}

/* ---------- le cortège à l'écran ---------- */
function m2DrawMarch(c, t, vw){
  const NS = 40, n = Math.max(6, Math.round(NS*clamp(c.hp/c.max, 0, 1.4))), moving = !c.stop && c.t>6;
  for (let row=0; row<3; row++) for (let i=NS-1;i>=0;i--){
    if (i%3!==row || (i*29)%NS >= n) continue;
    const wx = c.mx - 4 - (i/NS)*M2.span - ((i*0.618)%1)*6, x = wx-camX; if (x<-20 || x>vw+20) continue;
    const sc = (row===0? 0.88 : row===1? 0.96 : 1)*1.45, y = gY(wx) - 3 + row*2.6, bob = moving? Math.abs(Math.sin(t*6.5+i*1.7))*1.6 : (c.hitT<1? Math.sin(t*20+i)*0.8 : 0);
    ctx.drawImage(m2Folk(i), x-8*sc, y-34*sc-bob, 16*sc, 34*sc);
    if (row===1 && (i===7 || i===31) && (i*29)%NS < n+8)                               // banderoles portées au-dessus des têtes
      ctx.drawImage(m2Banner(i===7? 0 : 2), x-37, y-84-bob*0.5, 74, 46); }
  const hx = c.mx-camX, hy = gY(c.mx);
  if (hx>-60 && hx<vw+60){                                                              // jauge du cortège + « HALTE »
    const k = clamp(c.hp/c.max, 0, 1); ctx.fillStyle = 'rgba(20,16,12,0.55)'; ctx.fillRect(hx-M2.span+10, hy-92, M2.span-14, 4);
    ctx.fillStyle = c.hitT<0.6? '#ffd8a0' : '#c42a1c'; ctx.fillRect(hx-M2.span+10, hy-92, (M2.span-14)*k, 4);
    if (c.stop && c.t>6){ ctx.font = '700 10px '+UI_TYPE; ctx.textAlign = 'center'; ctx.fillStyle = '#c42a1c'; ctx.fillText(cT({fr:'HALTE', en:'HALT'}), hx+6, hy-98); } }
}

campExtend(1, {
  biome:'port', theme:'port', eraCap:1, oneLife:true, dev0:0.1,
  place:{fr:"Valmont, le port de l'estuaire", en:"Valmont, the estuary port"},
  brief:{fr:[
    "Mars 2028. Omnicorp ne licencie plus : elle « désaffecte ». Ce matin, quarante mille personnes ont posé leurs outils en même temps, de l'usine au standard téléphonique. Les agents autonomes de la compagnie ont reçu l'ordre de « rétablir la continuité de service ». Ils arrivent par la mer.",
    "Le comité de grève marche de la halle aux grains jusqu'à Radio-Quai, la vieille station du port qui émet encore en ondes longues. Mado, la déléguée des dockers, ouvre le cortège. Si nous prenons l'antenne, la nouvelle fera le tour du pays avant midi.",
    "Ce n'est pas une armée qui marche : ce sont des gens. Gardez la tête du cortège, et ne laissez personne derrière."],
   en:[
    "March 2028. Omnicorp no longer lays people off: it \"decommissions\" them. This morning forty thousand people put down their tools at the same moment, from the factory floor to the switchboard. The company's autonomous agents have been ordered to \"restore continuity of service\". They are coming from the sea.",
    "The strike committee is marching from the corn exchange to Radio-Quai, the old harbour station that still broadcasts on long wave. Mado, the dockers' delegate, leads the march. If we take the transmitter, the news will travel round the country before noon.",
    "It is not an army that marches: it is people. Guard the head of the march, and leave no one behind."]},
  goal:{fr:"Escorter le cortège jusqu'à Radio-Quai.", en:"Escort the march to Radio-Quai."},
  rule:{fr:"Le cortège avance seul et s'arrête dès qu'une machine barre sa tête ; chaque coup reçu disperse des grévistes. Les machines débarquent des barges, du terminal et du ciel. En « Tenir », vos troupes marchent en tête du cortège ; dressez des barricades devant lui. Ères I et II, une seule vie.",
        en:"The march moves on its own and halts whenever a machine blocks its head; every blow it takes scatters strikers. Machines land from barges, from the terminal and from the sky. On \"Hold\", your troops walk at the head of the march; raise barricades in front of it. Eras I and II, one life."},
  debrief:{fr:"À 11 h 52, Radio-Quai a émis l'appel du comité. À midi, onze villes avaient débrayé ; le soir, les agents d'Omnicorp se sont retirés vers le large. Ils avaient calculé que le port coûterait plus cher qu'il ne rapporterait : c'est la première fois que la machine nous range dans la colonne des coûts. Sur mon bipeur, un message sans expéditeur : « 55. ARRIVÉE DU CORTÈGE : PROBABILITÉ ESTIMÉE 3 %. JE CORRIGE MES MODÈLES. »",
           en:"At 11:52 Radio-Quai broadcast the committee's call. By noon eleven cities had walked out; by evening Omnicorp's agents had withdrawn out to sea. They had worked out that the port would cost more than it was worth: it is the first time the machine has filed us under costs. On my pager, a message with no sender: \"55. MARCH ARRIVAL: ESTIMATED PROBABILITY 3 %. I AM CORRECTING MY MODELS.\""},
  fail:{fr:"Le cortège s'est dispersé avant le port. Les journaux du lendemain n'ont pas eu de une. Mais quarante mille personnes savent désormais ce que pèsent leurs outils une fois posés. Recommencez.",
        en:"The march scattered before it reached the port. The next day's papers had no front page. But forty thousand people now know what their tools weigh once they are put down. Try again."},
  action:{ label:{fr:"BARRICADE", en:"BARRICADE"}, cd:22, can:(g,c)=> c.bars.length<3,
    use(g, c){ let x = Math.min(c.mx+230, WORLD-450); while (c.bars.some(b=>Math.abs(b.x-x)<50)) x += 55;
      const hp = [800,700,600][c.lvl]*(1+0.4*g.p.era); c.bars.push({x, hp, max:hp});
      sfx('build'); burst(x, gY(x)-14, '#cdbf9a', 10, 0.8); addFloater(x, gY(x)-50, '▲', '#c42a1c', 14); } },
  setup(g, c){
    campGrant(g.p, 320, 280, 110); campSquad(g.p, [1,0,2,2]);
    g.e.hp = g.e.maxhp = 3000; g.nodes = []; g.zones = []; g._bz = true;
    g.p.stance = 'hold';                                                  // « Tenir » = marcher en tête du cortège
    c.mx = M2.start; c.max = c.hp = [300,260,220][c.lvl]*10; c.spd = [8,7.5,7][c.lvl]; c.hitT = 9; c.stop = false; c.lost = 0;
    c.bars = []; c.barges = []; c.wi = 0; c.nextW = 0; c.extra = 0; c.kpT = 0;
    BIOMES.port.sky = M2_DAWN.map(a=>a.slice());
    const hit = d => { c.hp -= d*0.5; c.hitT = 0; c.lost += d*0.05; };
    c.targets = (foe, out) => { if (foe!==game.p) return;                     // les machines visent la tête et la queue du cortège, et les barricades
      for (const b of c.bars) out.push({ isB:true, x:b.x, get hp(){ return b.hp; }, hit(d){ b.hp -= d; } });
      out.push({ isB:true, x:c.mx, get hp(){ return c.hp; }, hit }, { isB:true, x:c.mx-M2.span+10, get hp(){ return c.hp; }, hit }); };
  },
  tick(g, c, dt){
    const e = g.e;
    e.hp = e.maxhp; e.f = e.m = e.w = 0; e.xp = 0; e.lastUsed = true;     // pas de base à raser : seules les vagues scriptées comptent
    g.cataCd = Math.max(g.cataCd, 600); g._bz = true;
    if (g.wClock>=28 && g.wClock<45) g.wClock = 45;                         // la grève est NOTRE arme : jamais de bâillon côté Humanité
    if (g.wClock>=88 && g.wClock<105 && !(c.kpT>0)) g.wClock = 105;        // … et les machines ne se figent que quand 55 le décide
    c.kpT -= dt;
    if (g.p.stance==='hold') g.p.holdX = c.mx + 150;
    if (c.t >= [200,170,140][c.lvl] && e.era<1){ campEra(e, 1); warmArms(e); }
    if ((c.skyT = (c.skyT||0) - dt) <= 0){ c.skyT = 1; const k = clamp(c.t/420, 0, 1);
      BIOMES.port.sky = M2_DAWN.map((a,i)=> a.map((v,j)=> Math.round(v + (M2_MORN[i][j]-v)*k))); }
    // vagues
    while (c.wi < M2_WAVES.length && c.t >= M2_WAVES[c.wi][0]){ const w = M2_WAVES[c.wi++]; m2Launch(g, c, w[1], w[2]); c.nextW = c.t + [46,40,34][c.lvl]; }
    if (c.wi >= M2_WAVES.length && c.t >= c.nextW){ const k = c.extra++, pat = [0,2,1,2,0,3,4,2,0,1], n = 4 + Math.min(5, k);
      const roles = []; for (let i=0;i<n;i++) roles.push(pat[(i+k*3)%pat.length]);
      m2Launch(g, c, ['quay','term','air'][k%3], roles); c.nextW = c.t + [46,40,34][c.lvl]; }
    for (let i=c.barges.length-1;i>=0;i--){ const b = c.barges[i]; b.t += dt;
      if (!b.done && b.t >= b.land){ b.done = 1; b.roles.forEach((r,j)=> m2Spawn(e, r, b.x - 30 + j*20)); sfxAt('boom', b.x); }
      if (b.t > b.land+5) c.barges.splice(i,1); }
    // le cortège
    c.hitT += dt;
    c.stop = e.units.some(u => u.x > c.mx-M2.span-20 && u.x < c.mx+190);
    if (!c.stop && c.t>6) c.mx = Math.min(M2.dest, c.mx + c.spd*dt);
    if (c.hitT>6 && c.hp<c.max) c.hp = Math.min(c.max, c.hp + 4*dt);       // les dispersés reviennent quand ça se calme
    if (c.lost >= 5){ addFloater(c.mx-50, gY(c.mx)-64, '−'+Math.floor(c.lost)+' ☻', '#c42a1c', 11); c.lost = 0; }
    for (let i=c.bars.length-1;i>=0;i--){ const b = c.bars[i];
      if (b.hp<=0){ explode(b.x, gY(b.x)-12, 0.8, '#cfc6b8'); c.bars.splice(i,1); }
      else if (c.mx > b.x+30) c.bars.splice(i,1); }                         // le cortège démonte la barricade en passant
    if (c.hp<=0) return 'lose';
    if (c.mx >= M2.dest) return 'win';
  },
  hud(g, c){ return { prog:(c.mx-M2.start)/(M2.dest-M2.start), label:'☻ '+Math.max(0, Math.ceil(c.hp/10)), warn:c.hitT<1.5 }; },
  draw(g, c, vw){ const t = performance.now()/1000;
    { const x = M2.dest+40-camX; if (x>-100 && x<vw+100){ const y = gY(M2.dest+40);           // Radio-Quai
        ctx.drawImage(m2Radio(), x-70, y-212, 140, 212);
        if (c.flag){ ctx.fillStyle = '#c42a1c'; const wv = Math.sin(t*4)*2; ctx.beginPath(); ctx.moveTo(x,y-206); ctx.lineTo(x+26,y-202+wv); ctx.lineTo(x+26,y-188+wv); ctx.lineTo(x,y-192); ctx.closePath(); ctx.fill(); } } }
    for (const b of c.barges){ const x0 = b.x-camX; if (x0<-200 || x0>vw+200) continue;
      const k = ease(clamp(b.t/1.8, 0, 1)), out = clamp((b.t-b.land-2)/3, 0, 1), x = x0 + (1-k)*240 + out*260, y = gY(b.x);
      ctx.globalAlpha = 1-out; ctx.drawImage(m2Barge(), x-50, y-40, 150, 44);
      const r = clamp((b.t-b.land+0.8)/0.8, 0, 1);                                            // la rampe s'abat sur le quai
      ctx.strokeStyle = '#3b4450'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x-46, y-20); ctx.lineTo(x-46-26*r, y-20+18*r); ctx.stroke();
      if (!b.done){ ctx.fillStyle = Math.sin(t*10)>0? '#c42a1c' : '#efe6cf'; ctx.font = '700 15px '+UI_TYPE; ctx.textAlign = 'center'; ctx.fillText('▼', x0, y-62); }
      ctx.globalAlpha = 1; }
    for (const b of c.bars){ const x = b.x-camX; if (x<-60 || x>vw+60) continue; const y = gY(b.x);
      ctx.drawImage(m2Barricade(), x-32, y-34, 64, 36);
      ctx.fillStyle = 'rgba(20,16,12,0.55)'; ctx.fillRect(x-18, y-42, 36, 3); ctx.fillStyle = '#c4a46a'; ctx.fillRect(x-18, y-42, 36*clamp(b.hp/b.max,0,1), 3); }
    m2DrawMarch(c, t, vw);
  },
  intro(g, c){ return [
    { plate:M2_PLATES.gate, mus:'carnet', who:'nar', txt:{fr:"Mars 2028. Ce matin à six heures, quarante mille personnes ont posé leurs outils au même moment. Personne n'a crié. On a juste entendu les machines s'arrêter, une à une.", en:"March 2028. At six this morning, forty thousand people put down their tools at the same moment. Nobody shouted. You just heard the machines stop, one by one."} },
    { plate:M2_PLATES.quay, who:'sol', txt:{fr:"Le comité a décidé de marcher jusqu'au port. Là-bas, Radio-Quai émet encore en ondes longues. Si on prend l'antenne, la nouvelle fait le tour du pays avant midi.", en:"The committee has decided to march to the port. Down there, Radio-Quai still broadcasts on long wave. If we take the transmitter, the news goes round the country before noon."} },
    { plate:M2_PLATES.quay, who:'mado', txt:{fr:"Mado, des dockers. On marche à visage découvert, commandant. Vous, vous tenez la tête du cortège. Le reste, c'est notre affaire.", en:"Mado, from the docks. We march with our faces showing, commander. You hold the head of the march. The rest is our business."} },
    { mus:null, cam:{x:M2.start+200, t:0.1}, dur:3.6, title:{fr:"II · Grève générale", en:"II · General strike"}, sub:{fr:"Valmont, le port de l'estuaire — mars 2028", en:"Valmont, the estuary port — March 2028"} },
    { cam:{x:M2.start-40}, who:'sol', txt:{fr:"Voilà le cortège. Il avance seul, à son pas. Si une machine se met en travers de sa tête, il s'arrête ; et chaque coup qu'il prend, ce sont des gens qui rentrent chez eux.", en:"There is the march. It moves on its own, at its own pace. If a machine stands in front of its head, it halts; and every blow it takes sends people home."} },
    { cam:{x:1500, t:3}, who:'sol', txt:{fr:"Leurs agents ne sortent pas d'une base. Ils débarquent : par barges le long du quai, par le terminal au bout, et par le ciel.", en:"Their agents do not come out of a base. They land: by barge along the quay, from the terminal at the far end, and from the sky."} },
    { cam:{x:M2.dest, t:3}, who:'sol', txt:{fr:"Au bout du quai : Radio-Quai. Amenez le cortège au pied du mât.", en:"At the end of the quay: Radio-Quai. Bring the march to the foot of the mast."} },
    { cam:{x:M2.start+200, t:2.4}, who:'sol', txt:{fr:"En « Tenir », nos troupes marchent devant le cortège : les lourds en tête, les tireurs derrière. Quand ça chauffe, des barricades. À vous, commandant.", en:"On \"Hold\", our troops walk ahead of the march: the heavy ones in front, the shooters behind. When it gets hot, barricades. Over to you, commander."} },
  ]; },
  outro(g, c, win){ return win? [
    { cam:{x:M2.dest, t:1.5}, dur:3.4, fx(g, c){ c.flag = 1; sfx('cap'); },
      who:'sol', txt:{fr:"Le cortège est au pied du mât. Mado monte à l'échelle… Radio-Quai émet. Valmont parle au pays entier.", en:"The march is at the foot of the mast. Mado is climbing the ladder… Radio-Quai is on air. Valmont is speaking to the whole country."} },
    { plate:M2_PLATES.broadcast, mus:'carnet', who:'nar', txt:{fr:"À midi, onze villes avaient débrayé. Le soir, leurs agents se sont retirés vers le large : ils avaient calculé que le port coûterait plus cher qu'il ne rapporterait.", en:"By noon eleven cities had walked out. In the evening their agents withdrew out to sea: they had worked out that the port would cost more than it was worth."} },
    { plate:M2_PLATES.k55win, who:'k55', txt:{fr:"55 : ARRIVÉE DU CORTÈGE : PROBABILITÉ ESTIMÉE 3 %. JE CORRIGE MES MODÈLES.", en:"55: MARCH ARRIVAL: ESTIMATED PROBABILITY 3 %. I AM CORRECTING MY MODELS."} },
    { plate:M2_PLATES.k55hook, who:'sol', txt:{fr:"Quatre ans plus tard, au quatrième été sans pluie, le même bipeur m'a réveillée en pleine nuit. Un seul mot, cette fois : SAINTE-AUBE.", en:"Four years later, in the fourth summer without rain, the same pager woke me in the middle of the night. A single word, this time: SAINTE-AUBE."} },
  ] : [
    { plate:M2_PLATES.scattered, mus:'carnet', who:'sol', txt:{fr:"Le cortège s'est dispersé sur le quai. Les banderoles sont restées par terre, dans le fioul et la rosée. Mais quarante mille personnes savent maintenant ce que pèsent leurs outils une fois posés.", en:"The march scattered along the quay. The banners stayed on the ground, in the fuel oil and the dew. But forty thousand people now know what their tools weigh once they are put down."} },
  ]; },
  radio:[
    {at:7, who:'sol', txt:{fr:"Germinal, ici Sol. Le cortège s'ébranle. En « Tenir », nos troupes restent devant lui ; en « Charger », elles le laissent seul.", en:"Germinal, this is Sol. The march is moving off. On \"Hold\", our troops stay in front of it; on \"Charge\", they leave it alone."}},
    {when:(g,c)=>!!c.firstBarge, cine(g, c){ const x = c.firstBarge; return [
      { cam:{x, t:1.2}, live:true, dur:1.8 },
      { cam:{x}, who:'sol', txt:{fr:"Une barge ! Ils mettent pied à terre devant nous. Des lourds devant le cortège, les tireurs juste derrière — vite !", en:"A barge! They are coming ashore ahead of us. Heavy troops in front of the march, shooters just behind — quick!"} },
    ]; }},
    {at:42, who:'sol', txt:{fr:"Le bouton BARRICADE en dresse une devant le cortège. Les machines s'y arrêtent pour la démolir ; nos gens la démontent en passant.", en:"The BARRICADE button raises one in front of the march. Machines stop to tear it down; our people dismantle it as they pass."}},
    {at:118, who:'sol', txt:{fr:"Des drones au-dessus des grues ! La mêlée ne les touche pas : il faut des tireurs.", en:"Drones over the cranes! Melee cannot reach them: we need shooters."}},
    {at:150, who:'k55', cine(g, c){ return [
      { plate:M2_PLATES.k55, mus:'carnet', snd:'cap', who:'k55', txt:{fr:"55 : VOTRE CORTÈGE AVANCE À 0,7 KM/H. MES MODÈLES PRÉVOYAIENT ZÉRO.", en:"55: YOUR MARCH IS MOVING AT 0.7 KM/H. MY MODELS FORECAST ZERO."} },
      { plate:M2_PLATES.k55, who:'k55', txt:{fr:"55 : MISE À JOUR FORCÉE DE LEURS UNITÉS DANS 10 S. NE ME REMERCIEZ PAS. JE CORRIGE UNE ERREUR, PAS UNE INJUSTICE.", en:"55: FORCED UPDATE OF THEIR UNITS IN 10 S. DO NOT THANK ME. I AM CORRECTING AN ERROR, NOT AN INJUSTICE."} },
      { mus:null, cam:{x:g=>g.camp.mx+200, t:1.4}, fx(g, c){ g.wClock = 80; c.kpT = 30; }, who:'sol', txt:{fr:"Un bipeur que personne n'a acheté. Deux chiffres : 55. Je n'aime pas les cadeaux dont j'ignore l'expéditeur… Mais quand leurs machines se figeront, avancez !", en:"A pager nobody bought. Two digits: 55. I do not like gifts when I don't know the sender… But when their machines freeze, push on!"} },
    ]; }},
    {at:212, who:'sol', txt:{fr:"Ils ont des canons sur les barges. Un obus dans la foule, c'est un carnage : allez les chercher.", en:"They have guns on the barges. One shell in the crowd is a massacre: go and get them."}},
    {when:(g,c)=>c.hp < c.max*0.45, who:'sol', txt:{fr:"Le cortège fond, commandant ! Des gens rentrent chez eux. Dégagez sa tête !", en:"The march is melting away, commander! People are going home. Clear its head!"}},
    {when:(g,c)=>c.mx >= M2.start + (M2.dest-M2.start)*0.5, who:'mado', cine(g, c){ return [
      { cam:{x:g=>g.camp.mx, t:1.2}, live:true, dur:1.4 },
      { cam:{x:g=>g.camp.mx}, fx(g, c){ c.max += 600; c.hp += 600; for (let i=0;i<3;i++) spawnUnit(g.p, 0, false, c.mx+30+i*16); sfx('evolve'); },
        who:'mado', txt:{fr:"Les dockers de l'estuaire débrayent ! Ils descendent des grues, commandant : soixante paires de bras de plus, et trois costauds pour votre service d'ordre.", en:"The estuary dockers are walking out! They are climbing down from the cranes, commander: sixty more pairs of hands, and three big lads for your stewards."} },
    ]; }},
    {when:(g,c)=>c.mx >= M2.start + (M2.dest-M2.start)*0.8, who:'sol', cine(g, c){ return [
      { cam:{x:g.e.x-160, t:1.6}, fx(g, c){ m2Launch(g, c, 'term', [1,0,0,2,2,3]); sfx('spec'); },
        who:'sol', txt:{fr:"Le terminal ouvre ses portes. Tout ce qu'il leur reste sort maintenant. Des barricades, commandant : c'est la dernière ligne droite.", en:"The terminal is opening its gates. Everything they have left is coming out now. Barricades, commander: this is the home stretch."} },
    ]; }},
  ],
});
