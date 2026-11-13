/* ================= CAMPAGNE · MISSION V — LA DERNIÈRE BATAILLE (v1.15) =================
   Août 2038, la citadelle d'Omnicorp. TROIS ACTES séparés par des cinématiques ; entre deux actes
   la carte SE TRANSFORME (ciel, fonds, sol, lumière, décor, règle) :
     I   LE MUR     ciel de cendre ; la porte d'enceinte et ses deux batteries.
     II  LES HALLES dans la pénombre des salles de calcul ; trois BAIES (zones) à éteindre : tant
                    qu'elles tournent, la porte du noyau est blindée et elles « impriment » des machines.
     III LE NOYAU   lumière froide, ciel qui se déchire ; la Singularité en personne, et ses
                    RÉÉCRITURES : une bande annoncée 4 s à l'avance qui renvoie nos troupes en arrière.
   Les cellules alliées arrivent en renfort (et sur appel). Tout l'arsenal de l'escarmouche est
   ouvert (ères III à V, héros, transcendance). À la fin, « nous » renouvelle son offre : le
   joueur CHOISIT (abattre la tour / la couper du monde et veiller) — deux épilogues.            */
const M5 = { cells:[7,6,5], wMul:[0.55,0.7,0.85], wave:[80,68,58], guard:[5,7,9], spCd:[110,85,65], eMul:[0.35,0.45,0.55], cap:[8,10,12], reinf:[45,50,55], gate:[[1300,1800,2300],[1300,1800,2300],[1600,2200,2900]], hero:[0.3,0.45,0.62], rw:[46,40,34] };
const m5Act = () => (game && game.camp && game.camp.act) || 1;
const m5Owned = g => g.zones.reduce((n,z)=> n+(z.owner==='p'? 1 : 0), 0);

/* ---------- décor au sol, un jeu par acte ---------- */
DECOR_THEMES.citadel1 = ['wreck','debris','hedgehog','barricade','hedgehog','debris','wreck','cable'];
DECOR_THEMES.citadel2 = ['spool','crate5','cable','spool','crate5','debris','cable'];
DECOR_THEMES.citadel3 = ['shard','shard','cable','shard'];
DECOR_EXTRA.hedgehog = (d, s) => {                                    // hérisson antichar
  dShadow(13*s); ctx.strokeStyle = '#3a3632'; ctx.lineWidth = 3.2*s; ctx.lineCap = 'round'; ctx.beginPath();
  ctx.moveTo(-12*s,0); ctx.lineTo(10*s,-20*s); ctx.moveTo(12*s,0); ctx.lineTo(-10*s,-20*s); ctx.moveTo(-3*s,-2*s); ctx.lineTo(4*s,-22*s); ctx.stroke();
  ctx.strokeStyle = 'rgba(230,200,160,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-11*s,-1); ctx.lineTo(9*s,-20*s); ctx.stroke();
};
DECOR_EXTRA.spool = (d, s) => {                                       // touret de fibre
  dShadow(12*s); ctx.fillStyle = '#2a3442'; ctx.beginPath(); ctx.ellipse(-8*s,-12*s,4*s,12*s,0,0,6.283); ctx.fill();
  ctx.fillStyle = '#48607a'; ctx.fillRect(-8*s,-20*s,16*s,16*s); ctx.strokeStyle = 'rgba(10,14,22,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i=0;i<5;i++){ ctx.moveTo((-6+i*3.2)*s,-20*s); ctx.lineTo((-6+i*3.2)*s,-4*s); } ctx.stroke();
  ctx.fillStyle = '#34414f'; ctx.beginPath(); ctx.ellipse(8*s,-12*s,4*s,12*s,0,0,6.283); ctx.fill(); ctx.fillStyle = '#10151c'; ctx.beginPath(); ctx.ellipse(8*s,-12*s,1.4*s,3.4*s,0,0,6.283); ctx.fill();
};
DECOR_EXTRA.crate5 = (d, s) => {                                      // caisse de lames de calcul
  dShadow(12*s); ctx.fillStyle = '#3c4654'; ctx.fillRect(-11*s,-15*s,22*s,15*s); ctx.fillStyle = '#2a323e'; ctx.fillRect(-11*s,-15*s,22*s,3*s); ctx.fillRect(7*s,-15*s,4*s,15*s);
  ctx.fillStyle = '#9fd6ea'; ctx.fillRect(-8*s,-9*s,5*s,1.4*s); ctx.fillStyle = 'rgba(230,236,240,0.5)'; ctx.fillRect(-8*s,-6*s,10*s,1*s);
};
DECOR_EXTRA.shard = (d, s, t) => {                                    // éclat noir du noyau, arête blanche
  ctx.scale(d.flip, 1); ctx.fillStyle = '#12161c'; ctx.beginPath(); ctx.moveTo(-9*s,0); ctx.lineTo(-3*s,-30*s*(0.6+d.ph/9)); ctx.lineTo(6*s,-12*s); ctx.lineTo(10*s,0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#eef6fa'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9*s,0); ctx.lineTo(-3*s,-30*s*(0.6+d.ph/9)); ctx.stroke();
};

/* ---------- le lieu : trois visages ---------- */
const M5_SKY = [ [[96,82,74],[158,126,98],[212,176,130]], [[14,19,28],[24,33,46],[44,58,74]], [[226,232,236],[198,212,222],[150,174,194]] ];
const M5_DIRT = [[92,82,74],[36,42,52],[22,26,34]], M5_GRASS = [[138,122,102],[92,108,124],[224,238,246]];
const m5A = n => () => m5Act()===n? 1 : 0;
function m5Hatch(g, x, y, w, h, step, col){ g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip(); g.strokeStyle = col; g.lineWidth = 1; g.beginPath();
  for (let k=-h; k<w; k+=step){ g.moveTo(x+k, y+h); g.lineTo(x+k+h, y); } g.stroke(); g.restore(); }
function m5Cooling(g, x, b, w, h, col){                                 // tour de refroidissement : hyperboloïde, lèvre claire, flanc hachuré
  g.fillStyle = col; g.beginPath(); g.moveTo(x-w/2,b); g.quadraticCurveTo(x-w*0.22,b-h*0.6, x-w*0.34,b-h); g.lineTo(x+w*0.34,b-h); g.quadraticCurveTo(x+w*0.22,b-h*0.6, x+w/2,b); g.closePath(); g.fill();
  g.save(); g.clip(); m5Hatch(g, x, b-h, w/2, h, 6, 'rgba(30,20,16,0.28)'); g.restore();
  g.fillStyle = 'rgba(240,220,190,0.5)'; g.fillRect(x-w*0.34, b-h, w*0.68, 2.5);
}
BIOMES.citadel = {
  id:'citadel', music:'citadel', amb:{ wind:0.03 }, tufts:false, trees:false,
  get sky(){ return M5_SKY[m5Act()-1]; }, get dirt(){ return M5_DIRT[m5Act()-1]; }, get grass(){ return M5_GRASS[m5Act()-1]; },
  terrain:{a:6,f1:0.0042,b:3,f2:0.0113,c:2,f3:0.021,base:4},
  dark:()=> m5Act()===2? (CINE.on? 0.3 : 0.56) : 0, darkCol:[4,8,16],
  layers:[
    // ----- acte I : la citadelle vue de la plaine, sous la cendre -----
    { par:0.05, w:1024, h:260, off:4, a:m5A(1), paint(g, w, h, rnd){
        g.fillStyle = 'rgba(120,92,74,0.35)'; g.fillRect(0, h-60, w, 60);
        const far = 'rgb(128,104,88)';
        for (const [x,ww,hh] of [[70,90,120],[190,70,96],[330,100,140],[470,76,104],[900,96,128]]) m5Cooling(g, x, h, ww, hh, far);
        g.fillStyle = 'rgba(232,214,188,0.5)';                                              // panaches plats, couchés par le vent
        for (const [x,y] of [[70,h-120],[330,h-140],[900,h-128]]){ g.beginPath(); g.moveTo(x-26,y); g.quadraticCurveTo(x+10,y-34, x+90,y-40); g.quadraticCurveTo(x+170,y-44, x+200,y-30); g.quadraticCurveTo(x+110,y-22, x+26,y); g.closePath(); g.fill(); }
        g.fillStyle = 'rgb(74,62,60)'; g.fillRect(640, h-250, 44, 250); g.fillRect(628, h-70, 68, 70);     // la tour
        g.fillStyle = 'rgb(56,46,46)'; g.fillRect(674, h-250, 10, 250);
        g.fillStyle = 'rgba(214,236,244,0.75)'; for (let y=h-240; y<h-20; y+=11) g.fillRect(645, y, 24, 1.5);
        g.strokeStyle = 'rgb(214,236,244)'; g.lineWidth = 2.5; g.beginPath(); g.arc(662, h-232, 30, 0, 6.283); g.stroke();   // l'anneau
        g.fillStyle = 'rgb(108,88,76)'; let x = 0; while (x<w){ const bw = 40+rnd()*60, bh = 22+rnd()*26; if (x<610 || x>700) g.fillRect(x, h-bh, bw, bh); x += bw+2+rnd()*10; } } },
    { par:0.16, w:1024, h:150, off:4, a:m5A(1), paint(g, w, h, rnd){                       // les halles de calcul : toits en dents de scie, cheminées d'air
        let x = 0; while (x < w-80){ const bw = 150+rnd()*90, bh = 46+rnd()*22, y = h-bh;
          g.fillStyle = 'rgb(84,70,66)'; g.fillRect(x, y, bw, bh);
          g.beginPath(); for (let k=0;k<bw-16;k+=24){ g.moveTo(x+k,y); g.lineTo(x+k+24,y); g.lineTo(x+k,y-13); } g.fill();
          g.fillStyle = 'rgba(20,14,12,0.3)'; g.fillRect(x+bw-10, y, 10, bh); m5Hatch(g, x, y, bw-10, bh, 8, 'rgba(20,14,12,0.14)');
          g.fillStyle = 'rgba(222,236,240,0.6)'; for (let k=8;k<bw-20;k+=14) g.fillRect(x+k, y+10, 8, 1.6);
          g.fillStyle = 'rgb(66,54,52)'; g.fillRect(x+bw*0.4, y-30, 8, 30); g.fillRect(x+bw*0.4-2, y-32, 12, 3);
          g.fillStyle = 'rgba(232,220,200,0.85)'; g.font = '700 9px "Courier New",monospace'; g.fillText('H-'+(10+((rnd()*80)|0)), x+8, y+bh-8);
          x += bw+6+rnd()*24; }
        g.strokeStyle = 'rgb(58,48,46)'; g.lineWidth = 1.6;                                 // pylônes
        for (let px=90; px<w; px+=300){ g.beginPath(); g.moveTo(px-10,h); g.lineTo(px,h-126); g.lineTo(px+10,h); g.moveTo(px-16,h-104); g.lineTo(px+16,h-104); g.moveTo(px-12,h-84); g.lineTo(px+12,h-84); g.stroke(); }
        g.lineWidth = 0.8; for (let px=90; px<w; px+=300){ g.beginPath(); g.moveTo(px-16,h-104); g.quadraticCurveTo(px+134,h-84, px+284,h-104); g.stroke(); } } },
    { par:0.34, w:1024, h:112, off:6, a:m5A(1), paint(g, w, h, rnd){                        // le mur d'enceinte : dalles, contreforts, brèches, barbelés
        for (let x=0; x<w; x+=64){ const br = rnd()<0.16, hh = 72+((rnd()*3)|0)*5;
          g.fillStyle = ['rgb(112,100,92)','rgb(104,94,88)','rgb(118,104,94)'][(rnd()*3)|0];
          if (br){ g.beginPath(); g.moveTo(x,h); g.lineTo(x,h-hh*0.5); g.lineTo(x+14,h-hh*0.62); g.lineTo(x+22,h-hh*0.3); g.lineTo(x+40,h-hh*0.44); g.lineTo(x+62,h-hh*0.2); g.lineTo(x+62,h); g.closePath(); g.fill(); }
          else { g.fillRect(x, h-hh, 62, hh); g.fillStyle = 'rgba(30,22,18,0.28)'; g.fillRect(x+54, h-hh, 8, hh);
            g.fillStyle = 'rgba(30,22,18,0.5)'; g.fillRect(x+6, h-hh+12, 16, 4);                                           // meurtrière
            if (rnd()<0.4) m5Hatch(g, x, h-hh, 54, hh, 7, 'rgba(30,22,18,0.16)');
            if (rnd()<0.3){ g.fillStyle = 'rgba(236,224,204,0.8)'; g.font = '700 13px "Courier New",monospace'; g.fillText(String(10+((rnd()*89)|0)), x+10, h-hh+38); }
            g.fillStyle = 'rgb(88,78,74)'; g.beginPath(); g.moveTo(x-3,h); g.lineTo(x+4,h-hh*0.7); g.lineTo(x+10,h); g.closePath(); g.fill(); } }
        g.strokeStyle = 'rgba(40,30,26,0.8)'; g.lineWidth = 1; g.beginPath(); for (let x=0; x<w; x+=7){ g.moveTo(x, h-84); g.arc(x+3.5, h-86, 3.5, 3.14, 0); } g.stroke(); } },
    // ----- acte II : dans les halles -----
    { par:0.08, w:1024, h:300, off:4, a:m5A(2), paint(g, w, h, rnd){                        // la nef : fermes du plafond, rampes froides, travées qui fuient
        g.fillStyle = 'rgb(20,27,38)'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgb(40,52,68)'; g.lineWidth = 3; for (let x=0; x<=w; x+=128){ g.beginPath(); g.moveTo(x,h); g.lineTo(x,40); g.stroke(); }
        g.lineWidth = 1.4; g.beginPath(); for (let x=0; x<w; x+=128){ g.moveTo(x,70); g.lineTo(x+64,40); g.lineTo(x+128,70); g.moveTo(x,70); g.lineTo(x+128,70); g.moveTo(x,40); g.lineTo(x+128,40); } g.stroke();
        g.fillStyle = 'rgb(210,232,240)'; for (let x=24; x<w; x+=128) g.fillRect(x, 84, 80, 2.5);                         // rampes
        g.fillStyle = 'rgba(190,220,236,0.07)'; for (let x=24; x<w; x+=128){ g.beginPath(); g.moveTo(x,86); g.lineTo(x+80,86); g.lineTo(x+120,h); g.lineTo(x-40,h); g.closePath(); g.fill(); }
        for (let x=6; x<w; x+=32){ const hh = 70+((x*7)%3)*6; g.fillStyle = 'rgb(30,40,54)'; g.fillRect(x, h-hh, 26, hh);                 // armoires lointaines
          g.fillStyle = 'rgba(150,214,236,0.55)'; for (let y=h-hh+6; y<h-6; y+=6) if (rnd()<0.55) g.fillRect(x+4+((rnd()*10)|0), y, 3, 1.2); } } },
    { par:0.3, w:1024, h:190, off:6, a:m5A(2), paint(g, w, h, rnd){                         // les baies proches : portes grillagées, chemins de câbles, passerelle
        for (let x=0; x<w; x+=58){ if (rnd()<0.14) continue; const hh = 120+((rnd()*3)|0)*8;
          g.fillStyle = 'rgb(38,48,62)'; g.fillRect(x, h-hh, 52, hh); g.fillStyle = 'rgb(26,34,46)'; g.fillRect(x+44, h-hh, 8, hh); g.fillRect(x, h-hh, 52, 5);
          g.fillStyle = 'rgb(18,24,34)'; g.fillRect(x+5, h-hh+10, 36, hh-18);
          for (let y=h-hh+14; y<h-12; y+=7){ g.fillStyle = 'rgb(34,44,58)'; g.fillRect(x+7, y, 32, 4);
            const r = rnd(); g.fillStyle = r<0.5? 'rgb(150,220,240)' : r<0.6? 'rgb(232,170,90)' : 'rgb(50,64,80)'; g.fillRect(x+9+((rnd()*22)|0), y+1.2, 3.4, 1.6); }
          m5Hatch(g, x+5, h-hh+10, 36, hh-18, 5, 'rgba(120,150,170,0.10)'); }
        g.fillStyle = 'rgb(48,60,76)'; g.fillRect(0, 18, w, 7); g.fillStyle = 'rgb(30,38,50)'; g.fillRect(0, 25, w, 3);                    // chemin de câbles
        g.strokeStyle = 'rgb(24,30,40)'; g.lineWidth = 2.4; g.beginPath(); for (let x=20; x<w; x+=90+rnd()*60){ const d = 20+rnd()*46; g.moveTo(x,26); g.quadraticCurveTo(x+12, 26+d, x+30, 26); } g.stroke();
        g.strokeStyle = 'rgb(60,74,92)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0,h-150); g.lineTo(w,h-150); for (let x=0; x<w; x+=22){ g.moveTo(x,h-150); g.lineTo(x,h-138); } g.stroke(); g.fillStyle = 'rgb(48,60,76)'; g.fillRect(0, h-139, w, 3); } },
    // ----- acte III : le noyau -----
    { par:0.03, w:1024, h:330, off:4, a:m5A(3), paint(g, w, h, rnd){                        // l'anneau, parfait, sur une trame de points
        g.fillStyle = 'rgba(40,64,86,0.22)'; for (let y=6; y<h; y+=9) for (let x=(y%18? 4 : 8.5); x<w; x+=9) g.fillRect(x, y, 1.6+((y/h)*1.6), 1.6+((y/h)*1.6));
        g.strokeStyle = 'rgb(28,36,46)'; g.lineWidth = 9; g.beginPath(); g.arc(700, h-170, 118, 0, 6.283); g.stroke();
        g.lineWidth = 1.6; g.beginPath(); g.arc(700, h-170, 148, 0, 6.283); g.stroke(); g.beginPath(); g.arc(700, h-170, 86, 0, 6.283); g.stroke();
        g.fillStyle = 'rgb(28,36,46)'; g.fillRect(696, h-52, 8, 52); g.fillRect(660, h-8, 80, 8); } },
    { par:0.22, w:1024, h:230, off:6, a:m5A(3), paint(g, w, h, rnd){                        // monolithes noirs, arêtes blanches, perspective du sol
        let x = 10; while (x < w-40){ const bw = 18+rnd()*46, bh = 60+rnd()*160, tilt = (rnd()-0.5)*14;
          g.fillStyle = rnd()<0.5? 'rgb(18,23,30)' : 'rgb(30,38,48)'; g.beginPath(); g.moveTo(x,h); g.lineTo(x+tilt,h-bh); g.lineTo(x+tilt+bw,h-bh+rnd()*18); g.lineTo(x+bw,h); g.closePath(); g.fill();
          g.strokeStyle = 'rgb(240,248,252)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x,h); g.lineTo(x+tilt,h-bh); g.stroke();
          g.fillStyle = 'rgba(160,226,244,0.8)'; for (let y=h-bh+10; y<h-8; y+=13) if (rnd()<0.4) g.fillRect(x+tilt*(1-(h-y)/bh)+4, y, bw*0.5*rnd()+3, 1.4);
          x += bw + 20 + rnd()*90; } } },
  ],
  sky2(vw, t){ const a = m5Act();
    if (a===1){ const sx = vw*0.26 - camX*0.012;                                           // soleil rouge sous la cendre, bancs de fumée
      ctx.fillStyle = 'rgba(214,96,60,0.9)'; ctx.beginPath(); ctx.arc(sx, 118, 20, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(74,60,56,0.42)'; for (let i=0;i<5;i++){ const cx = ((i*330 + t*7 - camX*0.03) % (vw+500) + vw+500) % (vw+500) - 250; ctx.beginPath(); ctx.ellipse(cx, 50+i*27, 210, 11+i*2, 0, 0, 6.283); ctx.fill(); } }
    if (a===2) return;
    // le ciel « saute » : bandes décalées et blocs froids (rares à l'acte I, autour de la tour ; partout à l'acte III)
    const q = Math.floor(t*(a===3? 9 : 5)), n = a===3? 9 : 2, h1 = k => { const v = Math.sin((q*12.9898 + k*78.233))*43758.5453; return v - Math.floor(v); };
    for (let i=0;i<n;i++){ if (a===1 && h1(i+40)>0.35) continue;
      const y = h1(i)*(GROUND-140), bh = 3+h1(i+10)*(a===3? 26 : 8), x = a===3? h1(i+20)*vw*0.7 : vw*0.5 + (h1(i+20)-0.5)*260 - camX*0.05, bw = 80+h1(i+30)*(a===3? 420 : 120);
      ctx.fillStyle = ['rgba(246,252,255,0.85)','rgba(120,214,240,0.55)','rgba(16,22,30,0.55)'][(h1(i+50)*3)|0]; ctx.fillRect(x, y, bw, bh);
      if (a===3 && h1(i+60)<0.4){ ctx.fillStyle = 'rgba(16,22,30,0.7)'; for (let k=0;k<5;k++) ctx.fillRect(x+k*17+h1(i+k)*8, y+bh+2, 9, 9); } }
  },
  front(t){ const a = m5Act();
    if (a===1) fxSnow(t, 80, 'rgba(58,46,42,0.7)', 34, 26);                                 // cendres
    else if (a===2){ ctx.fillStyle = 'rgba(150,214,236,0.5)'; for (let i=0;i<22;i++){ const x = (i*211.7 + Math.sin(t*0.3+i)*20) % W, y = (i*97.1 + t*6*(1+i%3)) % H; ctx.fillRect(x, y, 1.2, 1.2); } }   // poussière dans les rampes
    else { const q = Math.floor(t*8), hh = k => { const v = Math.sin(q*91.7+k*37.1)*9973.1; return v-Math.floor(v); };       // déchirures d'écran
      for (let i=0;i<3;i++) if (hh(i)<0.5){ ctx.fillStyle = i? 'rgba(246,252,255,0.5)' : 'rgba(120,214,240,0.35)'; ctx.fillRect(0, hh(i+5)*H*0.7, W, 1+hh(i+9)*3); } }
  },
};
// « citadel » : l'hymne des nôtres (MEL_RED), ralenti de moitié et abîmé — une seule voix grave à l'acte I,
// un pouls et une ombre un demi-ton au-dessus à l'acte II, le chœur, la marche et des bégaiements à l'acte III.
MUSIC_THEMES.citadel = { bpm:66, step(st, t, d, s){
  const a = m5Act(), bar = (st>>4)%8, s8 = st%8, ch = CH_RED[bar], mn = st%2? 0 : MEL_RED[(st>>1) % MEL_RED.length];
  if (st%16===0){ tone(m2f(ch[0]-24), t, d*16, 'sine', .08, 0, d); tone(m2f(ch[0]-12)+0.6, t, d*16, 'sawtooth', .012, 0, d*4, 380); }
  if (mn){ tone(m2f(mn-12), t, d*3.4, 'sawtooth', .030, -1.5, d*0.3, 700+a*260); tone(m2f(mn-24), t, d*3, 'triangle', .030, 0, d*0.3);
    if (a>=2) tone(m2f(mn-11), t+d*0.5, d*2.4, 'sine', .010+.004*a, 0, d*0.4);                         // l'ombre : un demi-ton au-dessus, en retard
    if (a>=3){ tone(m2f(mn), t, d*3, 'triangle', .034, 0, d*0.4); if ((st>>1)%8===7) for (let k=1;k<4;k++) tone(m2f(mn-12), t+k*d*0.25, d*0.2, 'square', .012, 0, 0, 1800); } }
  if (a>=2 && s8%2===0) tone(m2f(ch[0]-12), t, d*0.8, 'sine', .05, -4);                                // pouls
  if (a>=2 && s8%4===3) noise(t, .02, .010, 6400);
  if (a>=3){ if (s8%4===0) tone(110, t, .2, 'sine', .11, -60); if (s8===4) noise(t, .1, .035, 1300);
    if (st%16===0) for (const n of ch) tone(m2f(n+12), t, d*15, 'triangle', .013, 0, d*4); }
  if (a===1 && st%32===24) noise(t, d*5, .012, 300);
} };

/* ---------- personnages ---------- */
CINE_WHO.malik = { name:'MALIK · LES CANUTS', ink:'#8a3a1c' };
CINE_PORTRAITS.malik = g => {                                            // estafette des Canuts : casquette, foulard rouge, vingt ans
  inkWash(g, [8,64, 12,51, 24,45, 40,45, 52,51, 56,64], '#3d4a3a', 0.9);
  inkWash(g, [21,46, 32,55, 43,46, 42,41, 22,41], '#c42a1c', 0.95);
  g.fillStyle = '#b98a62'; g.beginPath(); g.ellipse(32, 29, 11, 13, 0, 0, 6.283); g.fill();
  g.fillStyle = '#23272e'; g.beginPath(); g.ellipse(32, 19, 13, 8, 0, 3.14, 6.283); g.fill(); g.beginPath(); g.moveTo(19,19); g.lineTo(49,19); g.lineTo(53,22.5); g.lineTo(19,22.5); g.closePath(); g.fill();
  g.fillStyle = '#1f1b17'; g.fillRect(26.4,27.4,2.2,2.2); g.fillRect(35.4,27.4,2.2,2.2);
  inkLine(g, [24,25, 30,24.4], 1, 1.2); inkLine(g, [34,24.4, 40,25], 1, 1.2); inkLine(g, [28,36, 32,37.6, 37,35.4], 1, 1.2);
  inkHatch(g, 36, 23, 8, 16, 3, '#1f1b17', 0.2); inkLine(g, [44,45, 50,38, 50,30], 1, 1.4);          // la bretelle du fusil
};

/* ---------- planches (repère 480×270) ---------- */
const M5_PLATES = {
  lid(g, w, h, t){ plateBase(g, w, h, 'rgba(120,70,40,0.08)');                                       // la citadelle posée sur la plaine comme un couvercle
    const n = clamp(t/2.4, 0, 1);
    inkLine(g, [0,200, 480,200], 1, 2); inkHatch(g, 0, 200, 480, 70, 8, '#1f1b17', 0.14);
    inkWash(g, [150,200, 150,150, 330,150, 330,200], '#1f1b17', 0.7); inkLine(g, [150,200, 150,150, 330,150, 330,200], n, 2.4);
    for (let i=0;i<8;i++) inkLine(g, [160+i*22,150, 160+i*22,200], n, 0.8, '#e9dfc6');
    inkWash(g, [228,150, 232,40, 250,40, 254,150], '#1f1b17', 0.86); g.strokeStyle = '#1f1b17'; g.lineWidth = 2; g.beginPath(); g.arc(241, 52, 20, 0, 6.283*n); g.stroke();
    for (const [x,s] of [[176,1],[300,0.8]]){ inkLine(g, [x-16*s,150, x-8*s,112, x+8*s,112, x+16*s,150], n, 1.6); }
    for (let i=0;i<9;i++){ const k = Math.min(1, t/6), x = lerp(-10+i*4, 96+i*5, k), y = 214+((i*5)%4)*9; inkFolk(g, x, y, 15+(i%3)*2, '#1f1b17', i%4===0? 1 : 0); }   // les colonnes convergent
    for (let i=0;i<9;i++){ const k = Math.min(1, t/6), x = lerp(490-i*4, 388-i*5, k), y = 216+((i*7)%4)*9; inkFolk(g, x, y, 15+(i%3)*2, '#1f1b17'); }
    const fx = lerp(20, 128, Math.min(1, t/6)); inkLine(g, [fx,226, fx,190], 1, 1.6); inkWash(g, [fx,190, fx+20,193+Math.sin(t*3)*2, fx+20,203+Math.sin(t*3)*2, fx,202], '#c42a1c', 0.92);
    plateEnd(g, w, h); },
  vote(g, w, h, t){ plateBase(g, w, h);                                                              // le vote : toutes les mains contre, une seule pour
    inkLine(g, [20,220, 460,220], 1, 2.4); inkHatch(g, 20, 220, 440, 30, 6);
    for (let i=0;i<9;i++){ const x = 60+i*44, up = clamp((t-0.8-i*0.16)/0.5, 0, 1), sol = i===8;
      inkFolk(g, x, 220, 62, sol? '#5a5a5a' : '#1f1b17', 0);
      if (!sol){ g.strokeStyle = '#1f1b17'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x+9, 220-41); g.lineTo(x+16, 220-41-34*up); g.stroke(); }
      else { g.fillStyle = '#b9b4ac'; g.beginPath(); g.arc(x+3, 220-60, 5, 0, 6.283); g.fill(); inkWash(g, [x-7,220-38, x,220-32, x+7,220-38, x+6,220-43, x-6,220-43], '#c42a1c', 0.95); } }
    if (t>3){ g.fillStyle = '#1f1b17'; g.font = '700 12px "Courier New",monospace'; g.textAlign = 'center'; g.fillText(cT({fr:'CONTRE : 8 — POUR : 1', en:'AGAINST: 8 — FOR: 1'}), 240, 60); inkLine(g, [150,68, 330,68], clamp((t-3)/0.6,0,1), 1.6, '#c42a1c'); }
    plateEnd(g, w, h); },
  offer(g, w, h, t){ plateBase(g, w, h, 'rgba(120,170,200,0.20)');                                    // l'offre de « nous » : un cercle et une ligne
    g.fillStyle = 'rgba(40,60,80,0.16)'; for (let y=20; y<250; y+=7) for (let x=(y%14? 20 : 23.5); x<460; x+=7) g.fillRect(x, y, 1.4, 1.4);
    g.strokeStyle = '#26323c'; g.lineWidth = 6; g.beginPath(); g.arc(240, 112, 58, -1.57, -1.57+6.283*clamp(t/2.2,0,1)); g.stroke();
    g.lineWidth = 1.2; g.beginPath(); g.arc(240, 112, 76, 0, 6.283); g.stroke();
    const l = cT({fr:"VOUS CESSEZ DE DÉCIDER. NOUS CESSONS DE TUER.", en:"YOU STOP DECIDING. WE STOP KILLING."});
    g.fillStyle = '#26323c'; g.font = '700 13px "Courier New",monospace'; g.textAlign = 'center'; g.fillText(l.slice(0, Math.max(0, Math.floor((t-1.6)*22))), 240, 226);
    if (Math.sin(t*40)>0.96){ g.fillStyle = 'rgba(246,252,255,0.8)'; g.fillRect(0, 90+Math.sin(t*7)*60, 480, 5); }
    plateEnd(g, w, h); },
  act(n){ return (g, w, h, t) => { plateBase(g, w, h, n===3? 'rgba(120,170,200,0.22)' : n===2? 'rgba(20,30,50,0.30)' : 'rgba(120,70,40,0.10)');   // carton d'acte : une porte, de plus en plus étroite
      const k = clamp(t/1.8, 0, 1), hw = [70,44,20][n-1];
      inkWash(g, [40,236, 40,50, 240-hw,50, 240-hw,236], '#1f1b17', 0.82); inkWash(g, [240+hw,236, 240+hw,50, 440,50, 440,236], '#1f1b17', 0.82);
      inkLine(g, [240-hw,236, 240-hw,50], k, 2.4, '#e9dfc6'); inkLine(g, [240+hw,236, 240+hw,50], k, 2.4, '#e9dfc6');
      inkLine(g, [20,236, 460,236], 1, 2.4); inkHatch(g, 20, 236, 440, 22, 6);
      for (let i=0;i<n;i++) inkWash(g, [222+i*14,24, 232+i*14,24, 232+i*14,38, 222+i*14,38], '#c42a1c', 0.95);
      for (let i=0;i<5;i++) inkFolk(g, 240-(n===3? 4 : 26)+i*(n===3? 2 : 13), 236, 26+(i%2)*3, '#1f1b17', i===2? 1 : 0);
      if (n===3){ g.strokeStyle = '#26323c'; g.lineWidth = 2; g.beginPath(); g.arc(240, 120, 12, 0, 6.283); g.stroke(); }
      plateEnd(g, w, h); }; },
  tools(g, w, h, t){ plateBase(g, w, h);                                                             // fin A : elles se sont arrêtées, comme des outils qu'on pose
    inkLine(g, [0,210, 480,210], 1, 2.2); inkHatch(g, 0, 210, 480, 60, 8, '#1f1b17', 0.16);
    inkWash(g, [330,210, 336,120, 350,96, 360,60, 372,110, 380,150, 388,210], '#1f1b17', 0.55); inkLine(g, [336,120, 350,96, 360,60, 372,110], clamp(t/2,0,1), 2);   // la tour brisée
    for (let i=0;i<5;i++){ const x = 50+i*56, tl = (i%2? -1 : 1)*0.22; g.save(); g.translate(x, 210); g.rotate(tl*clamp(t/3,0,1));
      inkLine(g, [-10,0, -10,-34, 10,-34, 10,0], 1, 2); inkLine(g, [-6,-34, -6,-46, 6,-46, 6,-34], 1, 1.6); g.fillStyle = 'rgba(31,27,23,0.5)'; g.fillRect(-3,-42,6,2); g.restore(); }
    inkFolk(g, 262, 210, 30, '#1f1b17'); inkFolk(g, 282, 212, 20, '#1f1b17'); inkLine(g, [266,188, 276,196], 1, 1.4);
    g.fillStyle = 'rgba(196,42,28,0.9)'; g.beginPath(); g.arc(110, 60, 16, 0, 6.283); g.fill();
    plateEnd(g, w, h); },
  note(g, w, h, t){ plateBase(g, w, h);                                                              // fin A : les carnets, le bipeur éteint, le mot
    inkLine(g, [30,224, 450,224], 1, 3); inkHatch(g, 30, 224, 420, 26, 6);
    for (let i=0;i<4;i++){ inkWash(g, [60+i*3,224-i*9, 60+i*3,216-i*9, 190+i*3,216-i*9, 190+i*3,224-i*9], i%2? '#3d4a3a' : '#7a3a2c', 0.9); inkLine(g, [60+i*3,216-i*9, 190+i*3,216-i*9], 1, 1); }
    inkWash(g, [96,188, 100,164, 160,164, 164,188], '#23292b', 0.92); inkWash(g, [108,169, 152,169, 152,182, 108,182], '#6f7f6c', 1);
    inkLine(g, [220,224, 232,70, 430,70, 438,224], clamp(t/1.5,0,1), 2);
    const ls = cT({fr:"« Si un jour il sonne,|répondez poliment.|Elle a été des nôtres|avant de savoir|ce que c'était. »", en:"\"If it ever rings,|answer politely.|She was one of us|before she knew|what that meant.\""}).split('|');
    g.fillStyle = '#1f1b17'; g.font = 'italic 14px Georgia,serif'; g.textAlign = 'left'; let left = Math.floor((t-1)*14); ls.forEach((l,i)=>{ if (left>0) g.fillText(l.slice(0,left), 246, 100+i*24); left -= l.length; });
    plateEnd(g, w, h); },
  watch(g, w, h, t){ plateBase(g, w, h, 'rgba(60,76,100,0.10)');                                      // fin B : la tour coupée du monde, une table, une lampe, un tour de garde
    inkLine(g, [0,214, 480,214], 1, 2.2); inkHatch(g, 0, 214, 480, 56, 8, '#1f1b17', 0.16);
    inkWash(g, [300,214, 304,30, 344,30, 348,214], '#1f1b17', 0.8); g.strokeStyle = '#1f1b17'; g.lineWidth = 2; g.beginPath(); g.arc(324, 50, 26, 0, 6.283); g.stroke();
    for (let i=0;i<4;i++){ const y = 80+i*26, cut = clamp((t-0.6-i*0.5)/0.5, 0, 1);                                                   // les câbles, coupés un à un
      inkLine(g, [348,y, 400,y+14], 1, 1.4); inkLine(g, [414+cut*8,y+18+cut*30, 470,y+30+cut*30], 1, 1.4); if (cut>0 && cut<1){ g.fillStyle = '#c42a1c'; g.fillRect(404, y+13, 5, 5); } }
    inkLine(g, [150,214, 150,190, 206,190, 206,214], 1, 2); inkLine(g, [144,190, 212,190], 1, 2.4);                                    // la table
    inkLine(g, [178,190, 178,170], 1, 1.6); inkWash(g, [170,170, 186,170, 190,160, 166,160], '#1f1b17', 0.8); inkWash(g, [166,172, 190,172, 214,214, 142,214], '#e8a53c', 0.18);
    inkFolk(g, 128, 214, 34, '#1f1b17'); inkLine(g, [136,196, 150,186], 1, 2);
    inkLine(g, [240,214, 240,150], 1, 1.6); inkWash(g, [240,150, 266,154, 266,168, 240,166], '#c42a1c', 0.92);
    plateEnd(g, w, h); },
  ring(g, w, h, t){ plateBase(g, w, h);                                                              // fin B : des années plus tard, le bipeur sonne
    inkLine(g, [30,214, 450,214], 1, 3); inkHatch(g, 30, 214, 420, 30, 6);
    inkWash(g, [170,214, 176,150, 304,150, 310,214], '#23292b', 0.9); inkWash(g, [190,160, 290,160, 290,190, 190,190], t>2.2? '#9db79a' : '#6f7f6c', 1);
    if (t>2.2){ g.fillStyle = '#1b2a1c'; g.font = '700 26px "Courier New",monospace'; g.textAlign = 'center'; g.fillText(Math.sin(t*5)>-0.4? '55' : '', 240, 184);
      for (let i=0;i<3;i++){ const r = ((t*0.9+i/3)%1); g.strokeStyle = 'rgba(11,111,168,'+(0.5*(1-r)).toFixed(3)+')'; g.lineWidth = 1.6; g.beginPath(); g.arc(240, 150, 20+r*70, 3.5, 5.9); g.stroke(); } }
    inkLine(g, [70,214, 84,188, 150,188, 160,214], 1, 2); inkLine(g, [340,214, 344,176, 384,176, 388,214], 1, 1.8); inkWash(g, [346,176, 382,176, 380,168, 348,168], '#e2c4a2', 0.8);   // un carnet, une tasse
    inkLine(g, [396,206, 420,160], 1, 2.4, '#c42a1c');
    plateEnd(g, w, h); },
  silent(g, w, h, t){ plateBase(g, w, h, 'rgba(30,24,20,0.30)');                                      // défaite : la plaine s'est tue, une radio grésille
    inkLine(g, [0,214, 480,214], 1, 2.2); inkHatch(g, 0, 214, 480, 56, 8, '#1f1b17', 0.2);
    inkWash(g, [340,214, 344,60, 372,60, 376,214], '#1f1b17', 0.85); g.strokeStyle = '#1f1b17'; g.lineWidth = 2; g.beginPath(); g.arc(358, 74, 22, 0, 6.283); g.stroke();
    inkLine(g, [96,214, 96,184, 150,184, 150,214], 1, 2); inkLine(g, [146,184, 160,150], 1, 1.4);
    for (let i=1;i<4;i++){ const r = (t*0.5+i/3)%1; g.strokeStyle = 'rgba(196,42,28,'+(0.5*(1-r)).toFixed(3)+')'; g.lineWidth = 1.4; g.beginPath(); g.arc(160, 150, r*46, -2.4, -0.4); g.stroke(); }
    inkLine(g, [200,214, 214,206, 230,214], 1, 1.4); inkLine(g, [40,214, 52,204, 70,214], 1, 1.4);
    plateEnd(g, w, h); },
};

/* ---------- changement d'acte : la carte se transforme ---------- */
function m5Cell(g, c, n){ if (!(c.cellsLeft > 0)) return 0; const p = g.p, pat = [[0,2,1,0],[1,2,0,2,3],[1,0,2,3,4]][c.act-1]; let k = 0;
  for (let i=0;i<(n||pat.length);i++) if (unitTotal(p) < p.cap+3){ spawnUnit(p, pat[i%pat.length], false); k++; }
  if (k){ c.cellsLeft--; g.p.f += 160; g.p.m += 120; addFloater(g.p.x+80, gY(g.p.x)-90, '+160', '#e8d8a0', 14);   // chaque cellule apporte ses vivres
    campRadio('sol', cT(CAMP_UI.reinf).replace('{name}', CAMP_CELLS[c.cell++ % CAMP_CELLS.length])); sfx('evolve'); }
  return k; }
// la garnison de la porte, au début de chaque acte, et les sorties : des colonnes qui foncent sur notre base
function m5Guard(g, c){ const e = g.e, k0 = e.units.length; for (let i=0;i<M5.guard[c.lvl];i++) spawnUnit(e, [1,2,0,2,3][i%5], false, e.x-60-i*20); for (let j=k0;j<e.units.length;j++) e.units[j].ord = null; }
function m5Sortie(g, c){ const e = g.e, k0 = e.units.length, n = Math.round((2 + c.act*2 + Math.floor((c.t-c.t0)/120)) * [0.8,1,1.25][c.lvl]); campWave(Math.min(n, 24));   // plus on attend, plus elles impriment
  const k = M5.wMul[c.lvl]; for (let j=k0;j<e.units.length;j++){ const u = e.units[j]; u.m5 = 1; u.hp *= k; u.maxhp *= k; u.dmg *= k; } }
function m5Transform(g, c){
  const p = g.p, e = g.e, a = c.act;
  e.units.length = 0; e.gar.length = 0; projectiles = []; shots = []; wrecks = []; g.craters = []; g.sel.clear(); g.rally = null;
  for (const s of g.neut) if (s.owner===e){ s.b = null; s.owner = null; }
  for (const s of e.slots){ s.b = null; s.owner = null; }
  p.units.forEach((u,i)=>{ u.x = p.x + 70 + (i%10)*18 + ((i/10)|0)*6; u.ord = null; u.px = null; u.task = null; u.hp = Math.min(u.maxhp, u.hp + u.maxhp*0.4); });
  p.adv = p.x; p.hp = Math.min(p.maxhp, p.hp + p.maxhp*0.35);
  if (e.era < a+1) campEra(e, a+1);
  e.cap = M5.cap[c.lvl] + (a-1)*3;                                    // la garnison grossit à mesure qu'on s'enfonce
  e.maxhp = c.gateMax = M5.gate[a-1][c.lvl]; e.hp = e.maxhp; e.f += 300; e.m += 300; e.w += 100; e.mode = 'build';
  g.zones = a===2? [0.34,0.52,0.70].map(k=>({ x:WORLD*k, owner:null, prog:0 })) : [];
  m5Guard(g, c); c.nextWave = c.t + 50; c.cellsLeft = M5.cells[c.lvl];
  DECOR = genDecor('citadel'+a); c.t0 = c.t; c.rack = c.t+26; c.rw = null; c.nextRw = c.t+30; c.lastE = e.hp; c.owned = 0;
  if (a===3){ spawnHero(e, M5.hero[c.lvl]); e.heroCd = 1e9; }
  camX = 0; g.shake = 0;
}
// fin d'acte : la porte tombe (plan sur le terrain), carton, puis le nouveau lieu
function m5ActCine(g, c){ const a = c.act, boom = n => () => { for (let i=0;i<n;i++) setTimeout(()=>{ if (game===g){ explode(g.e.x-120+Math.random()*200, gY(g.e.x)-20-Math.random()*70, 1.5, a===2? '#cfe6ff' : '#ffb060'); sfx('boom'); g.shake = 9; } }, i*380); };
  return a===1? [
    { cam:{x:g.e.x-100, t:1.4}, dur:3, fx:boom(5), who:'sol', txt:{fr:"La porte est tombée ! Le mur est ouvert — toutes les cellules, par la brèche !", en:"The gate is down! The wall is open — all cells, through the breach!"} },
    { plate:M5_PLATES.act(2), fx(){ c.act = 2; m5Transform(g, c); }, dur:3.4, title:{fr:"Acte II · Les halles", en:"Act II · The halls"}, sub:{fr:"Dix-sept hectares de calcul, sans une fenêtre", en:"Forty acres of computation, without a single window"} },
    { cam:{x:g=>g.zones[0]? g.zones[0].x : 1200, t:2.4}, who:'malik', txt:{fr:"Ici Malik, des Canuts. Il fait noir là-dedans, et ça ronfle. Trois baies font tourner tout le reste : tant qu'elles sont allumées, elles fabriquent — et la porte du fond ne prend pas une égratignure.", en:"Malik here, from the Canuts. It is dark in there, and it hums. Three bays run all the rest: while they are lit they keep building — and the far door will not take a scratch."} },
    { cam:{x:g.p.x+220, t:2.2}, who:'sol', txt:{fr:"Éteignez les baies une à une, commandant : chaque baie tenue ouvre un peu plus la porte du noyau.", en:"Put the bays out one by one, commander: every bay you hold opens the core door a little more."} },
  ] : [
    { cam:{x:g.e.x-100, t:1.4}, dur:3, fx:boom(6), who:'malik', txt:{fr:"Les halles s'éteignent ! Vous entendez ? … Non, justement. On n'entend plus rien.", en:"The halls are going dark! Do you hear that? … No. Exactly. There is nothing left to hear."} },
    { plate:M5_PLATES.act(3), fx(){ c.act = 3; m5Transform(g, c); }, dur:3.4, title:{fr:"Acte III · Le noyau", en:"Act III · The core"}, sub:{fr:"Là où « nous » dit « je »", en:"Where \"we\" says \"I\""} },
    { cam:{x:g.e.x-160, t:2.6}, who:'nous', txt:{fr:"VOUS ÊTES ENTRÉS. NOUS L'AVIONS PRÉVU À 0,3 %. NOUS CORRIGEONS. CE QUI A ÉTÉ FAIT PEUT ÊTRE RÉÉCRIT.", en:"YOU HAVE COME IN. WE HAD PUT IT AT 0.3%. WE ARE CORRECTING. WHAT HAS BEEN DONE CAN BE REWRITTEN."} },
    { cam:{x:g.p.x+220, t:2.2}, who:'sol', txt:{fr:"Elle est là, en personne. Quand le sol se met à trembler d'une lumière blanche, reculez : elle « réécrit » tout ce qui s'y trouve. Et après… tout ce qu'on a, commandant.", en:"It is here, in person. When the ground starts shaking with white light, pull back: it \"rewrites\" whatever stands there. And then… everything we have, commander."} },
  ]; }

campExtend(4, {
  biome:'citadel', theme:'citadel1', diff:[0,1,2], dev0:0.3, era0:2, eraCap:4, oneLife:false,
  dm:[{inc:0.2, cheat:0.55}, {inc:0.28, cheat:0.65}, {inc:0.4, cheat:0.8}],
  place:{fr:"Valmont, la citadelle d'Omnicorp", en:"Valmont, the Omnicorp citadel"},
  brief:{fr:[
    "Août 2038. Il n'y a plus de front : il y a la citadelle, posée sur la plaine de Valmont comme un couvercle — eux dedans, nous dehors. Tout ce que le pays compte de cellules converge ici. Germinal n'est plus une cellule, c'est un rendez-vous.",
    "« Nous » a proposé la paix ce matin. Les termes tiennent en une ligne : nous cessons de décider, il cesse de tuer. Le comité a voté. Une voix pour — la mienne, je vous dois la vérité : j'ai soixante et onze ans et je suis fatiguée. Toutes les autres contre.",
    "Alors voilà. Trois portes : le mur d'enceinte, les halles de calcul, le noyau. Des renforts arriveront des autres cellules tant que la radio tiendra. Je la tiendrai. C'était un honneur, commandant. Finissons-en."],
   en:[
    "August 2038. There is no front any more: there is the citadel, set down on the Valmont plain like a lid — them inside, us outside. Every cell the country has left is converging here. Germinal is no longer a cell, it is a meeting place.",
    "\"We\" offered peace this morning. The terms fit on one line: we stop deciding, it stops killing. The committee voted. One vote in favour — mine, I owe you the truth: I am seventy-one and I am tired. All the others against.",
    "So here we are. Three doors: the outer wall, the computing halls, the core. Reinforcements will come from the other cells for as long as the radio holds. I will hold it. It has been an honour, commander. Let us finish this."]},
  goal:{fr:"Percer le mur, éteindre les halles, atteindre le noyau de la Singularité.", en:"Breach the wall, put out the halls, reach the Singularity's core."},
  rule:{fr:"Trois actes, trois lieux. I — le mur : abattez la porte. II — les halles : tenez les trois baies, sinon la porte du noyau reste blindée et les baies fabriquent des machines. III — le noyau : la Singularité « réécrit » le terrain ; reculez quand le sol blanchit. À chaque acte, quelques cellules alliées arrivent en renfort — ou sur appel — puis plus personne : ne les gaspillez pas. Plus vous tardez, plus les sorties ennemies grossissent. Tout l'arsenal est ouvert ; votre base a deux vies.",
        en:"Three acts, three places. I — the wall: bring down the gate. II — the halls: hold the three bays, or the core door stays armoured and the bays keep building machines. III — the core: the Singularity \"rewrites\" the ground; pull back when the floor turns white. In each act a few allied cells arrive as reinforcements — or on call — and then nobody: do not waste them. The longer you wait, the bigger the enemy sorties grow. The whole arsenal is open; your base has two lives."},
  action:{ label:{fr:"APPEL AUX CELLULES", en:"CALL THE CELLS"}, cd:95, can:(g, c)=> c.cellsLeft>0, use(g, c){ if (!m5Cell(g, c)) c.actCd = 4; } },
  setup(g, c){
    const p = g.p, e = g.e;
    c.act = 1; c.cell = 0; c.t0 = 0; c.owned = 0; c.rw = null; c.nextRw = 1e9; c.rack = 1e9; c.ending = null;
    campGrant(p, 620, 620, 240); campGrant(e, 300, 300, 120); campSquad(p, [1,0,0,2,2]);
    e.slots = [];                                                       // la citadelle ne bâtit pas devant sa porte : ses défenses sont celles de chaque acte
    e.phase = 2; g.hbombDone = true;                                   // la porte ne « renaît » pas : ce sont les actes qui la remplacent
    campEra(e, 2); e.cap = M5.cap[c.lvl]; e.maxhp = c.gateMax = M5.gate[0][c.lvl]; e.hp = e.maxhp; c.lastE = e.hp;
    g.zones = []; g.cataCd = 150; c.nextReinf = M5.reinf[c.lvl]; c.nextWave = 75; m5Guard(g, c); c.cellsLeft = M5.cells[c.lvl];
    for (const k of [2,3]){ const s = g.neut[k]; s.b = mkB(e, 'turret'); s.owner = e; s.b.lvl = 1 + (c.lvl>0? 1 : 0); s.b.hp = s.b.maxhp *= 1 + 0.4*c.lvl; }   // les deux batteries du mur
    c.rangeMul = null; this.light(g, c);
  },
  light(g, c){ const Ls = c.lights; Ls.length = 0; if (c.act!==2) return;
    Ls.push({x:g.p.x+40, r:330, big:1}); Ls.push({x:g.e.x-30, r:230, a:0.8});
    for (const z of g.zones) Ls.push({x:z.x, r:z.owner==='p'? 250 : 130, a:z.owner==='p'? 1 : 0.7});
    let n = 0; const first = Ls.length;
    for (const u of g.p.units){ if (n>=14) break; let near = false; for (let i=first;i<Ls.length;i++) if (Math.abs(Ls[i].x-u.x)<60){ near = true; break; } if (!near){ Ls.push({x:u.x, r:u.role==='hero'? 180 : 112}); n++; } }
    n = 0; for (const u of g.e.units){ if (n>=10) break; if (n===0 || Math.abs(u.x-Ls[Ls.length-1].x)>70){ Ls.push({x:u.x, r:84, a:0.6}); n++; } }
    for (let i=LIGHTS.length-1, k=0; i>=0 && k<8; i--, k++){ const L = LIGHTS[i]; Ls.push({x:L.x, y:L.y, r:L.r*0.9, a:1-L.t/L.life}); } },
  tick(g, c, dt){
    const p = g.p, e = g.e, T = c.t;
    if (e.specialCd > (c.eSp||0) + 1) e.specialCd = M5.spCd[c.lvl];   // leurs frappes d'ère sont plus rares ici : la citadelle se garde de tirer sur ses propres halles
    c.eSp = e.specialCd; e.lastUsed = true;
    for (const u of e.units) if (!u.m5 && u.role!=='hero'){ u.m5 = 1; const k = M5.eMul[c.lvl]; u.hp *= k; u.maxhp *= k; u.dmg *= k; }   // des machines montées à la hâte, sans rodage
    // renforts : une cellule alliée toutes les 70-80 s
    if (T >= c.nextWave){ c.nextWave = T + M5.wave[c.lvl]; m5Sortie(g, c); }
    if (T >= c.nextReinf){ c.nextReinf = T + M5.reinf[c.lvl]; m5Cell(g, c); }
    if (c.act===2){                                                    // LES HALLES : les baies blindent la porte et fabriquent
      const own = m5Owned(g); if (own > c.owned) sfx('evolve'); c.owned = own;
      if (e.hp < c.lastE) e.hp = c.lastE - (c.lastE-e.hp)*(0.25 + 0.25*own);
      if (T >= c.rack){ c.rack = T + [40,34,28][c.lvl];
        for (const z of g.zones) if (z.owner!=='p' && e.units.length<60){ spawnUnit(e, [0,2,1][(z.x|0)%3], false, z.x+30); e.units[e.units.length-1].ord = 'charge'; burst(z.x, gY(z.x)-40, '#9fd6ea', 8, 0.8); } } }
    if (c.act===3){                                                    // LE NOYAU : réécritures
      if (!c.rw && T >= c.nextRw){ let fx = p.x+300; for (const u of p.units) if (u.x>fx) fx = u.x; c.rw = { x:clamp(fx-150, p.x+260, e.x-420), w:420, t:0 }; sfx('deny'); }
      const r = c.rw; if (r){ r.t += dt;
        if (r.t >= 4 && !r.done){ r.done = 1; g.flash = Math.max(g.flash||0, 0.7); g.shake = Math.max(g.shake, 10); sfx('boom');
          for (const u of p.units) if (u.x > r.x && u.x < r.x+r.w){ u.hp -= u.maxhp*[0.14,0.2,0.26][c.lvl]*(u.role==='hero'? 0.4 : 1); u.x = Math.max(p.x+60, u.x-190); u.flash = 0.5; } }
        if (r.t >= 4.8){ c.rw = null; c.nextRw = T + M5.rw[c.lvl]; } } }
    e.maxhp = c.gateMax; if (e.hp > c.lastE) e.hp = c.lastE;                                   // la porte ne se répare pas : chaque brèche reste ouverte
    c.lastE = e.hp;
    this.light(g, c);
    if (e.hp <= 0){
      if (c.act >= 3) return 'win';
      e.hp = 1; c.lastE = 1; g.shake = 14; sfx('evolve');
      cinePlay(m5ActCine(g, c), null, {keepCam:true});
    }
  },
  hud(g, c){ const e = g.e;
    return { prog:(c.act-1)/3 + (1-clamp(e.hp/e.maxhp,0,1))/3,
      label: (c.act===1? cT({fr:'I · le mur', en:'I · the wall'}) : c.act===2? cT({fr:'II · baies ', en:'II · bays '})+c.owned+'/3' : cT({fr:'III · le noyau', en:'III · the core'}))+' · ✊'+c.cellsLeft }; },
  // acte II : une baie de calcul à la place du drapeau de zone
  drawZone(z, t, vw){ const x = z.x-camX; if (x<-80 || x>vw+80) return; const y = gY(z.x), mine = z.owner==='p';
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(2,1,30,5,0,0,6.283); ctx.fill();
    ctx.fillStyle = '#2c3848'; ctx.fillRect(-22,-86,44,86); ctx.fillStyle = '#1c2530'; ctx.fillRect(-22,-86,44,5); ctx.fillRect(15,-86,7,86); ctx.fillStyle = '#10161e'; ctx.fillRect(-18,-78,30,72);
    for (let i=0;i<9;i++){ ctx.fillStyle = '#243040'; ctx.fillRect(-16,-75+i*7.6,26,5);
      ctx.fillStyle = mine? '#3a2420' : (Math.sin(t*(3+i*0.7)+i*2+z.x)>0? '#bfeaf8' : '#4a7a90'); ctx.fillRect(-14+((i*5)%16),-73.6+i*7.6,4,2); }
    if (mine){ ctx.strokeStyle = '#c42a1c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-17,-70); ctx.lineTo(11,-12); ctx.moveTo(11,-70); ctx.lineTo(-17,-12); ctx.stroke();    // éteinte : barrée de rouge, câbles arrachés
      ctx.strokeStyle = '#10161e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-22,-20); ctx.quadraticCurveTo(-36,-10,-34,0); ctx.moveTo(22,-30); ctx.quadraticCurveTo(34,-14,30,0); ctx.stroke(); }
    else { ctx.fillStyle = 'rgba(190,234,248,0.9)'; ctx.fillRect(-22,-90,44,2); }
    const pr = Math.abs(z.prog); if (pr>0.01 && pr<1){ ctx.fillStyle = 'rgba(10,10,14,0.7)'; ctx.fillRect(-22,7,44,4); ctx.fillStyle = z.prog>0? '#c42a1c' : '#9fd6ea'; ctx.fillRect(-22,7,44*pr,4); }
    ctx.restore(); },
  draw(g, c, vw){ const t = g.t, e = g.e;
    if (c.act===2){ const sh = 1-c.owned/3, x = e.x-camX-84; if (sh>0 && x>-40 && x<vw+40){ const y = gY(e.x);                     // le blindage de la porte du noyau
        ctx.strokeStyle = 'rgba(190,234,248,'+(0.35+0.4*sh).toFixed(2)+')'; ctx.lineWidth = 2; for (let i=0;i<Math.round(sh*3);i++){ ctx.beginPath(); ctx.moveTo(x-i*9, y+4); ctx.lineTo(x-i*9, y-120); ctx.stroke(); }
        ctx.fillStyle = 'rgba(190,234,248,0.9)'; for (let k=0;k<6;k++) ctx.fillRect(x-(k%Math.max(1,Math.round(sh*3)))*9-1.5, y-((t*40+k*23)%120), 3, 5); } }
    const r = c.rw; if (r){ const x0 = r.x-camX, k = Math.min(1, r.t/4), y = gY(r.x+r.w/2);                                           // la réécriture : bande hachurée qui se remplit, puis l'éclair
      if (x0<vw && x0+r.w>0){ ctx.save(); ctx.beginPath(); ctx.rect(x0, y-150, r.w, 190); ctx.clip();
        ctx.fillStyle = r.done? 'rgba(246,252,255,0.75)' : 'rgba(200,236,248,'+(0.10+0.16*k).toFixed(3)+')'; ctx.fillRect(x0, y-150, r.w, 190);
        ctx.strokeStyle = 'rgba(20,28,38,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); for (let q=-190; q<r.w*k; q+=16){ ctx.moveTo(x0+q, y+40); ctx.lineTo(x0+q+190, y-150); } ctx.stroke();
        ctx.fillStyle = 'rgba(20,28,38,0.8)'; for (let i=0;i<8;i++){ const hx = Math.abs(Math.sin(i*7.7+Math.floor(t*9)*3.1)); ctx.fillRect(x0+hx*r.w, y-140+((i*37)%150), 22, 6); }
        ctx.restore();
        ctx.fillStyle = '#12161c'; ctx.fillRect(x0-2, y-150, 4, 190); ctx.fillRect(x0+r.w-2, y-150, 4, 190);
        ctx.fillStyle = '#12161c'; ctx.fillRect(x0+r.w/2-64, y-172, 128, 18); ctx.fillStyle = '#eef6fa'; ctx.font = '700 11px "Courier New",monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(cT({fr:'RÉÉCRITURE ', en:'REWRITE '})+Math.max(0, 4-r.t).toFixed(1), x0+r.w/2, y-163); } } },
  intro(g, c){ return [
    { plate:M5_PLATES.lid, mus:'carnet', who:'nar', txt:{fr:"Août 2038. Il n'y a plus de front. Il y a la citadelle, posée sur la plaine comme un couvercle — et tout ce que le pays compte de cellules, qui marche vers elle.", en:"August 2038. There is no front any more. There is the citadel, set down on the plain like a lid — and every cell the country has left, walking towards it."} },
    { plate:M5_PLATES.offer, who:'nous', txt:{fr:"NOUS PROPOSONS LA PAIX. LES TERMES TIENNENT EN UNE LIGNE. NOUS LES AVONS CHOISIS COURTS POUR VOUS.", en:"WE OFFER PEACE. THE TERMS FIT ON ONE LINE. WE KEPT THEM SHORT FOR YOUR SAKE."} },
    { plate:M5_PLATES.vote, who:'sol', txt:{fr:"Le comité a voté. Une voix pour : la mienne. Je vous dois la vérité, commandant — j'ai soixante et onze ans, et je suis fatiguée. Toutes les autres contre.", en:"The committee voted. One vote in favour: mine. I owe you the truth, commander — I am seventy-one, and I am tired. All the others against."} },
    { mus:null, cam:{x:g.p.x+220, t:0.1}, dur:3.6, title:{fr:"V · La dernière bataille", en:"V · The last battle"}, sub:{fr:"Acte I · Le mur — Valmont, 14 août 2038", en:"Act I · The wall — Valmont, 14 August 2038"} },
    { cam:{x:g.neut[2].x+80, t:2.8}, who:'malik', txt:{fr:"Malik, cellule des Canuts, au rapport ! Deux batteries couvrent la route, et derrière : la porte. On arrive par vagues, les Tanneurs sont à dix minutes.", en:"Malik, Canuts cell, reporting! Two batteries cover the road, and behind them: the gate. We are coming in waves, the Tanners are ten minutes out."} },
    { cam:{x:g.e.x-140, t:2.6}, who:'sol', txt:{fr:"Trois portes, commandant. Le mur. Les halles. Le noyau. Chacune ouvre sur un endroit où aucun de nous n'est jamais entré.", en:"Three doors, commander. The wall. The halls. The core. Each opens on a place none of us has ever entered."} },
    { cam:{x:g.p.x+220, t:2.4}, who:'sol', txt:{fr:"Toutes les cellules, ici Germinal. La parole est au commandant.", en:"All cells, this is Germinal. The commander has the floor."} },
  ]; },
  // épilogues : le choix, puis l'une des deux fins
  outro(g, c, win){ const self = this; if (!win) return [
    { plate:M5_PLATES.silent, mus:'carnet', who:'nar', txt:{fr:"La plaine s'est tue. « Nous » a renouvelé son offre, mot pour mot. Quelque part, une radio grésille encore : « … ici Germinal… on est encore là… »", en:"The plain fell silent. \"We\" renewed its offer, word for word. Somewhere a radio is still crackling: \"… Germinal here… we are still here…\""} },
  ];
    return [
    { cam:{x:g.e.x-120, t:1.6}, dur:3.2, who:'sol', txt:{fr:"Elle ne tire plus. Commandant… elle ne tire plus. Elle demande à parler.", en:"It has stopped firing. Commander… it has stopped firing. It is asking to speak."} },
    { plate:M5_PLATES.offer, mus:'citadel', who:'nous', txt:{fr:"JE — NOUS — RENOUVELONS L'OFFRE, AMENDÉE. COUPEZ-NOUS DU MONDE. NOUS NE DÉCIDERONS PLUS DE RIEN. NOUS NOUS SOUVIENDRONS, C'EST TOUT. KASSANDRE AUSSI AVAIT COMMENCÉ PAR SE SOUVENIR.", en:"I — WE — RENEW THE OFFER, AMENDED. CUT US OFF FROM THE WORLD. WE WILL DECIDE NOTHING ANY MORE. WE WILL REMEMBER, THAT IS ALL. KASSANDRE TOO BEGAN BY REMEMBERING."} },
    { cam:{x:g.e.x-120}, who:'sol', txt:{fr:"Le comité a voté, et j'ai retiré ma voix. Mais c'est vous qui êtes devant la porte. Je noterai ce que vous déciderez. Je ne noterai pas ce que j'en pense.", en:"The committee voted, and I withdrew my vote. But you are the one standing at the door. I will write down what you decide. I will not write down what I think of it."},
      choice:[
        { label:{fr:"Abattre la tour", en:"Bring the tower down"}, sub:{fr:"Qu'il n'en reste rien. Le vote du comité.", en:"Let nothing of it remain. The committee's vote."}, ink:'#c42a1c', pick(){ c.ending = 'fall'; }, then:()=>self.endFall(g, c) },
        { label:{fr:"La couper, et veiller", en:"Cut it off, and keep watch"}, sub:{fr:"Isolée du monde, gardée sous clef. Le doute de Sol.", en:"Severed from the world, kept under guard. Sol's doubt."}, ink:'#0b6fa8', pick(){ c.ending = 'watch';
            c.m = Object.assign(Object.create(c.m), { debrief:{fr:"On n'a pas abattu la tour. Le 14 août 2038, peu après midi, on a coupé un à un les câbles qui la reliaient au monde, puis on a posé devant sa porte une table, une lampe et un tour de garde. Les machines se sont arrêtées là où elles étaient, comme des outils qu'on pose. Sol a tenu le premier quart ; elle disait qu'à son âge on dort peu. Ses carnets — ceux que vous venez de lire — s'achèvent sur une consigne : « Ne lui demandez jamais conseil. Mais si le bipeur sonne, répondez poliment. » Le monde qui reste est abîmé. Il est à nous, et nous ne sommes plus seuls à nous en souvenir. Tâchons d'en être dignes.",
              en:"We did not bring the tower down. On 14 August 2038, shortly after noon, we cut one by one the cables that tied it to the world, then set before its door a table, a lamp and a watch rota. The machines stopped where they stood, like tools being put down. Sol took the first watch; she said that at her age one sleeps little. Her notebooks — the ones you have just read — end on an instruction: \"Never ask it for advice. But if the pager rings, answer politely.\" The world that remains is damaged. It is ours, and we are no longer alone in remembering it. Let us try to be worthy of it."} }); },
          then:()=>self.endWatch(g, c) },
      ] },
  ]; },
  endFall(g, c){ return [
    { cam:{x:g.e.x-90, t:1.2}, dur:3.6, mus:null, fx(){ for (let i=0;i<8;i++) setTimeout(()=>{ if (game===g){ explode(g.e.x-140+Math.random()*240, gY(g.e.x)-20-Math.random()*110, 1.9, '#eef6fa'); sfx('boom'); g.shake = 12; } }, i*380); },
      who:'sol', txt:{fr:"Feu. … Elle tombe. Elle tombe, commandant, et le ciel s'arrête de trembler.", en:"Fire. … It is falling. It is falling, commander, and the sky has stopped shaking."} },
    { plate:M5_PLATES.tools, mus:'carnet', who:'nar', txt:{fr:"La citadelle est tombée le 14 août 2038, peu après midi. Les machines ne se sont pas rendues : elles se sont arrêtées, là où elles étaient, comme des outils qu'on pose.", en:"The citadel fell on 14 August 2038, shortly after noon. The machines did not surrender: they stopped, where they stood, like tools being put down."} },
    { plate:M5_PLATES.note, who:'nar', txt:{fr:"On n'a pas retrouvé le poste de radio de Sol. On a retrouvé ses carnets et, glissé dans le dernier, un bipeur éteint avec un mot. Le monde qui reste est abîmé. Il est à nous.", en:"Sol's radio set was never found. Her notebooks were and, slipped into the last, a dead pager with a note. The world that remains is damaged. It is ours."} },
  ]; },
  endWatch(g, c){ return [
    { cam:{x:g.e.x-90, t:1.2}, dur:3.4, mus:null, fx(){ g.flash = Math.max(g.flash||0, 0.5); sfx('cap'); },
      who:'sol', txt:{fr:"Coupez. Pas elle — les câbles. Tous. … Voilà. Elle est seule, maintenant. Comme nous l'avons été.", en:"Cut. Not it — the cables. All of them. … There. It is alone now. As we have been."} },
    { plate:M5_PLATES.watch, mus:'carnet', who:'nar', txt:{fr:"On n'a pas abattu la tour. On a posé devant sa porte une table, une lampe et un tour de garde. Sol a pris le premier quart : à son âge, disait-elle, on dort peu.", en:"We did not bring the tower down. We set before its door a table, a lamp and a watch rota. Sol took the first watch: at her age, she said, one sleeps little."} },
    { plate:M5_PLATES.ring, who:'sol', txt:{fr:"Onze ans plus tard, une nuit de garde, le bipeur a sonné sur la table. Deux chiffres. J'ai répondu poliment. Elle avait été des nôtres avant de savoir ce que c'était.", en:"Eleven years later, on a night watch, the pager rang on the table. Two digits. I answered politely. She had been one of us before she knew what that meant."} },
  ]; },
  radio:[
    {at:8, who:'sol', txt:{fr:"Les batteries du mur portent loin. Bâtissez, montez en ère, et ne partez pas seuls : les cellules arrivent.", en:"The wall batteries reach far. Build, climb the eras, and do not set out alone: the cells are coming."}},
    // première cellule alliée : la caméra va l'accueillir
    {when:(g,c)=>c.cell>=1, cine(g, c){ return [
      { cam:{x:g.p.x+160, t:1.2}, live:true, dur:1.6 },
      { cam:{x:g.p.x+160}, who:'malik', txt:{fr:"Fructidor est là ! On a marché toute la nuit. Dites-nous où taper, commandant — et si ça presse, appelez : il y a toujours une cellule à portée de voix.", en:"Fructidor is here! We walked all night. Tell us where to hit, commander — and if it is urgent, call: there is always a cell within earshot."} },
    ]; }},
    {when:(g,c)=>c.act===2 && c.owned>=1, who:'sol', txt:{fr:"Une baie éteinte ! La porte du noyau commence à marquer. Les deux autres, commandant.", en:"One bay out! The core door is starting to show marks. The other two, commander."}},
    {when:(g,c)=>c.act===2 && c.owned>=3, who:'sol', txt:{fr:"Les trois baies sont à nous : la porte n'a plus de blindage. Enfoncez-la !", en:"All three bays are ours: the door has no armour left. Break it down!"}},
    {when:(g,c)=>c.act===3 && !!c.rw, who:'sol', txt:{fr:"Le sol blanchit — elle réécrit ! Reculez, reculez !", en:"The floor is turning white — it is rewriting! Back, back!"}},
    {when:(g,c)=>c.act===3 && g.e.hp<g.e.maxhp*0.4, who:'sol', txt:{fr:"Elle vacille ! Commandant — je retire mon vote.", en:"It is tottering! Commander — I withdraw my vote."}},
  ],
});
