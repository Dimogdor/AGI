/* ================= CAMPAGNE · MISSION IV — ROCHEFROIDE (v1.16) =================
   Spécification : docs/campagne/M4.md. La cité minière du puits Sainte-Barbe, 22 janvier 2035, de 14 h à la
   nuit tombante, −26 °C. Germinal tient le relais (x 150) : le chevalement et le vieil émetteur par lesquels
   Kassandre entre dans Mnémosyne (x 3 450), l'archive de « nous », pour l'effacer de l'intérieur ; il lui faut
   [sept / huit / neuf] minutes. On gagne en TENANT jusqu'au bout — ou en rasant Mnémosyne.
   LE FROID : loin d'un brasero allumé (180 px) ou du relais (300 px), nos troupes perdent des forces et
   ralentissent ; les machines, non. Les braseros remplacent les zones d'escarmouche (on les rallume en restant
   à côté ; les machines les éteignent) et la neige fondue y remplace les lacs (+0,5 💧/s par feu). Quatre maisons
   cachent des civils à escorter jusqu'au relais ; l'argent est rare ; le blizzard va et vient ; une déneigeuse
   (le prototype de « nous ») éteint les braseros ; à 3:00 de la fin Kassandre fige leurs machines 15 s.
   Écarts assumés par rapport au moteur : drawBase est enveloppé (le relais et Mnémosyne ont le visage du lieu) ;
   le calendrier météo d'escarmouche (grève / mise à jour forcée) est neutralisé ; calcRates n'est pas touché :
   la rareté du métal est une retenue appliquée ici, dans tick.                                                   */
const M4 = {
  total:[420,480,540],                                  // compte à rebours de Kassandre (7:00 / 8:00 / 9:00)
  braz:[640,1040,1420,1950,2330], houses:[820,1300,1660,2210], slots:[700,1100,1480,2000],
  warmR:180, relayR:300, stokeK:1.4, stokeT:14, stokeR:260, stokeCd:[55,70,80],   // DU CHARBON ! : rayon ×1,4 pendant 14 s
  cold:[0.009,0.013,0.017], heal:0.012, floor:0.12, slow:0.7, rangeK:0.72,       // % de PV max perdus par seconde (×2 en blizzard)
  gusts:[[70,96],[165,196],[262,290]],                  // + la dernière minute, sans arrêt
  hp:[3400,2900,2700], ehp:[5200,6400,7600],            // PV du relais · de Mnémosyne
  plT:[330,300,270], plHp:[2000,2400,2800], plSpd:18, plX:3150, plT2:90,   // déneigeuse : arrivée, PV, vitesse ; 2e (Dernier carré) à 1:30 de la fin
  mk:0.3,                                               // les marchés ne rendent que 30 %
  k55:180, k55b:150,                                    // S2 à 3:00 de la fin, S3 à 2:30
};
let M4_RETRY = false;                                  // Récit : la mission vient d'être perdue → reprise allégée (braseros 1 et 2, tourelle réparée)
const m4Fmt = s => Math.floor(s/60)+':'+('0'+Math.round(s%60)).slice(-2);
const m4Lit = z => z.owner==='p';
const m4On = () => typeof game!=='undefined' && game && game.camp && game.camp.i===3;
function m4Bliz(c, T){ if (T >= c.total-60) return true; for (const w of M4.gusts) if (T>=w[0] && T<w[1]) return true; return false; }
function m4Warm(g, x){ if (Math.abs(x-g.p.x) < M4.relayR) return true;
  const r = M4.warmR*(g.camp.stoke>0? M4.stokeK : 1); for (const z of g.zones) if (m4Lit(z) && Math.abs(z.x-x) < r) return true; return false; }
// un point est « éclairé » (la déneigeuse se voit dans le blizzard) : près d'un feu, du relais ou d'une de nos troupes
function m4Seen(g, x){ if (m4Warm(g, x)) return true; for (const u of g.p.units) if (!u.fly && Math.abs(u.x-x) < 90) return true; return false; }
// colonne adverse : n machines qui chargent d'elles-mêmes ; la rue ne tient pas plus de machines que le plafond
function m4Wave(n, big){ const e = game.e, c = game.camp, pat = big? [1,0,2,0,3,2,0,1,4,2] : [0,0,2,0,1,2,0,3,0,2];
  for (let i=0;i<n;i++){ if (e.units.length>=[40,44,46][c.D.i]) break; const k = e.units.length;
    spawnUnit(e, pat[(i + (c.waveN|0)) % pat.length], false, e.x - 40 - i*24);
    for (let j=k;j<e.units.length;j++) e.units[j].ord = 'charge'; }
  c.waveN = (c.waveN|0) + n; }
function m4Say(c, key, txt, gap){ if ((c.say[key]||-1e9) > c.t-(gap||40)) return; c.say[key] = c.t; campRadio('sol', txt); }
// une cloche de mine (un coup grave, deux harmoniques) à chaque groupe sauvé ; une porte de cave qui grince ; le bip de l'émetteur
function m4Sound(kind){ if (typeof AC==='undefined' || !AC || !SETTINGS.sfx) return; try { const t0 = AC.currentTime; sfxBus = BUS.amb;
  if (kind==='bell'){ tone(196, t0, 2.4, 'sine', .07, -4, .005); tone(392.6, t0, 1.6, 'sine', .028, -6, .005); tone(588, t0, 1, 'sine', .014, -8, .005); }
  else if (kind==='door'){ tone(180, t0, .7, 'sawtooth', .02, 90, .1, 520); noise(t0, .5, .012, 900); }
  else if (kind==='beep'){ tone(880, t0, .1, 'sine', .018); tone(880, t0+.28, .1, 'sine', .018); tone(880, t0+.56, .3, 'sine', .018); }
  else if (kind==='engine'){ tone(52+Math.random()*4, t0, 1.3, 'sawtooth', .03, 0, .2, 240); tone(104, t0, 1.1, 'square', .008, 0, .2, 180); noise(t0+.15, .8, .012, 700); }   // la déneigeuse : moteur grave, raclement de lame
  else if (kind==='step'){ noise(t0, .05, .008, 1500); noise(t0+.22, .05, .006, 1300); }                                                                 // des pas dans la neige
  else if (kind==='ice'){ noise(t0, .06, .02, 5200); tone(2400+Math.random()*900, t0, .05, 'triangle', .008, -900); }
} catch(e){} finally { sfxBus = null; } }

/* ---------- ce que le moteur n'offre pas, ajouté ici au plus juste ---------- */
// 1) la rampe de la route du plateau : le sol monte de 60 px entre x 2 600 et x 3 300
if (!gY.m4){ const gY0 = gY; gY = function(x){ const y = gY0(x); return (x>2600 && m4On())? y - 60*clamp((x-2600)/700, 0, 1) : y; }; gY.m4 = 1; }
// 2) le calendrier météo d'escarmouche (grève, mise à jour forcée) est neutralisé : seule Kassandre fige les machines (voir tick)

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
  id:'rochefroide', music:'m_cold', amb:{ wind:0.055 },
  sky:[[84,94,112],[142,152,166],[206,210,214]], dirt:[168,178,192], grass:[238,241,245], tufts:false, trees:false,
  terrain:{a:0,f1:0.0042,b:0,f2:0.0113,c:0,f3:0.021,base:5},
  dark:()=> CINE.on? 0.14 : 0.20 + 0.22*((game.camp && game.camp.gust) || 0), darkCol:[26,36,60],
  layers:[
    { par:0.04, w:1024, h:240, off:4, paint(g, w, h, rnd){                               // le plateau (la dalle de Mnémosyne est le décor de la base adverse)
        g.fillStyle = 'rgb(158,168,182)'; g.beginPath(); g.moveTo(0,h); g.lineTo(0,h-70);
        let x = 0, y = h-70; while (x<w){ x += 30+rnd()*50; y = clamp(y+(rnd()-0.5)*26, h-128, h-50); if (x>560 && x<900) y = h-120; g.lineTo(Math.min(x,w), x>=w? h-70 : y); }
        g.lineTo(w,h); g.closePath(); g.fill();
        m4Hatch(g, 0, h-120, w, 120, 9, 'rgba(96,108,126,0.22)');
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

// ambiance du lieu : le vent (qui forcit en blizzard), le crépitement d'un brasero quand la caméra en est proche
AMB_PROFILES.rochefroide = { grp:['amb_cold','amb_fire'], f(c){ const gu = (c && c.gust) || 0, cx = camX + VW()/2;
  const near = !!c && (cx < 600 || game.zones.some(z => m4Lit(z) && Math.abs(z.x-cx) < 520));
  if (gu > 0.3) oneShot('gust', 4, 0.7); else oneShot('gust', 14, 0.45);
  return { blizzard:0.35 + 0.6*gu, howl:0.4 + 0.3*gu, fire: near? 0.55 : 0.08 }; } };

/* ---------- personnages : Anselme Wójcik, ancien porion du puits (casquette, moustache, lampe frontale éteinte) ---------- */
CINE_WHO.anselme = { name:'ANSELME', ink:'#5a4630' };
CINE_PORTRAITS.anselme = g => {
  inkWash(g, [8,64, 12,50, 24,44, 40,44, 52,50, 56,64], '#4a4f58', 0.9);                          // veste
  inkWash(g, [22,45, 32,52, 42,45, 41,41, 23,41], '#8a7a5c', 0.95);                                // cache-nez
  g.fillStyle = '#d9b99a'; g.beginPath(); g.ellipse(32, 30, 11.5, 13, 0, 0, 6.283); g.fill();      // visage
  g.fillStyle = '#2c3440'; g.beginPath(); g.ellipse(32, 20, 14, 8.5, 0, 3.14, 6.283); g.fill(); g.fillRect(18, 19, 28, 3);   // casquette : calotte
  g.fillStyle = '#242a33'; g.beginPath(); g.moveTo(18,22); g.lineTo(46,22); g.lineTo(49,25); g.lineTo(21,26); g.closePath(); g.fill();   // visière
  g.fillStyle = '#8a8f98'; g.beginPath(); g.arc(32, 14.5, 3.3, 0, 6.283); g.fill(); g.strokeStyle = '#1f1b17'; g.lineWidth = 1; g.stroke();   // lampe frontale
  g.fillStyle = '#2a2d33'; g.beginPath(); g.arc(32, 14.5, 1.4, 0, 6.283); g.fill();                                                          // … éteinte
  g.fillStyle = '#1f1b17'; g.fillRect(26.4,29,2,2); g.fillRect(35.6,29,2,2);
  inkLine(g, [23,26.8, 29,25.8], 1, 1.3); inkLine(g, [35,25.8, 41,26.8], 1, 1.3);                  // sourcils
  g.fillStyle = '#e9e6de'; g.beginPath(); g.moveTo(22,36); g.quadraticCurveTo(32,32, 42,36); g.quadraticCurveTo(37,41, 32,38); g.quadraticCurveTo(27,41, 22,36); g.fill();   // moustache
  inkLine(g, [22,36, 32,33.4, 42,36], 1, 0.8); inkLine(g, [22,32, 24,34], 1, 0.7); inkLine(g, [42,32, 40,34], 1, 0.7);
  inkHatch(g, 36, 24, 9, 16, 3, '#1f1b17', 0.22);
};

/* ---------- les deux bases : le relais (chevalement + salle des pendus + émetteur), Mnémosyne (monolithe lisse) ---------- */
const m4SprRelay = () => fxSprite('M4RELAY', 250, 200, g => {
  const ink = '#2c3440';
  m4Headframe(g, 62, 192, 1.35, ink);                                                       // deux montants, la molette, la salle des machines (= la salle des pendus)
  g.fillStyle = '#4a4040'; g.fillRect(133, 150, 56, 42);                                    // la salle des pendus : briques sous la neige
  g.fillStyle = 'rgba(20,22,32,0.3)'; g.fillRect(181, 150, 8, 42);
  g.fillStyle = '#e6eaef'; g.beginPath(); g.moveTo(129,150); g.lineTo(161,131); g.lineTo(193,150); g.lineTo(193,154); g.quadraticCurveTo(161,142, 129,154); g.closePath(); g.fill();
  g.fillStyle = '#23272e'; g.fillRect(150, 170, 14, 22);                                    // la porte
  g.strokeStyle = '#2c3440'; g.lineWidth = 2; g.beginPath(); g.moveTo(178,134); g.lineTo(178,52); g.stroke();   // le mât de l'émetteur
  g.lineWidth = 1.4; g.beginPath(); g.moveTo(168,70); g.lineTo(188,70); g.moveTo(171,84); g.lineTo(185,84); g.moveTo(173,98); g.lineTo(183,98); g.stroke();
  g.lineWidth = 0.8; g.beginPath(); g.moveTo(178,52); g.lineTo(150,150); g.moveTo(178,52); g.lineTo(204,150); g.stroke();   // haubans
  g.fillStyle = '#eef1f5'; g.beginPath(); g.moveTo(112,192); g.quadraticCurveTo(128,170, 150,192); g.moveTo(186,192); g.quadraticCurveTo(206,172, 226,192); g.fill();   // congères
});
const m4SprMnemo = () => fxSprite('M4MNEMO', 190, 310, g => {
  g.fillStyle = '#242c38'; g.fillRect(30, 18, 112, 276);                                    // la dalle : lisse, sans fenêtre
  g.fillStyle = '#323d4c'; g.fillRect(124, 18, 18, 276);                                    // la face éclairée
  g.fillStyle = '#3a4656'; g.fillRect(26, 12, 120, 8);                                      // le chapeau
  g.fillStyle = '#1a2029'; g.fillRect(22, 290, 128, 14);                                    // le socle
  g.fillStyle = '#e6eaef'; g.beginPath(); g.moveTo(10,306); g.quadraticCurveTo(40,282, 70,306); g.moveTo(112,306); g.quadraticCurveTo(142,284, 178,306); g.fill();   // neige au pied
  g.strokeStyle = 'rgba(8,10,16,0.5)'; g.lineWidth = 1; g.beginPath(); for (let k=1;k<8;k++){ g.moveTo(30, 18+k*34.5); g.lineTo(142, 18+k*34.5); } g.stroke();   // la place des étages
});
// le relais (côté joueur) et Mnémosyne (côté adverse) — pieds en (side.x, sol)
function m4DrawBase(side){
  const x = side.x-camX; if (x<-280 || x>VW()+280) return;
  const g = game, c = g.camp, t = g.t, gy = gY(side.x), mine = side === g.p, frac = side.maxhp>0? clamp(side.hp/side.maxhp, 0, 1) : 1;
  projShadow(x, gy, mine? 80 : 70);
  if (mine){
    ctx.drawImage(m4SprRelay(), x-62, gy-192, 250, 200);
    const warm = Math.sin(t*2.3) > -0.4;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = warm? 'rgba(255,176,84,0.32)' : 'rgba(255,176,84,0.22)'; ctx.fillRect(x+75, gy-60, 10, 12);                                        // la lucarne de la salle des pendus
    ctx.drawImage(lightSprite('#ffb060'), x+45, gy-82, 90, 90);
    ctx.restore();
    const wv = Math.sin(t*3)*2.5; ctx.fillStyle = '#c42a1c'; ctx.beginPath(); ctx.moveTo(x-8, gy-141); ctx.lineTo(x+14, gy-139+wv); ctx.lineTo(x+14, gy-129+wv); ctx.lineTo(x-8, gy-131); ctx.closePath(); ctx.fill();   // le drapeau de Germinal
    const on = c && c.silent? true : ((t*0.7)%1 < 0.45);                                                         // le voyant de l'émetteur : morse lent, fixe quand la fréquence est vide
    ctx.fillStyle = on? '#4aa8e8' : '#1d3a52'; ctx.beginPath(); ctx.arc(x+116, gy-140, 3.2, 0, 6.283); ctx.fill();
    if (on){ ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(lightSprite('#4aa8e8'), x+116-16, gy-140-16, 32, 32); ctx.restore(); }
    if (qFx()){ for (let i=0;i<3;i++){ const ph = (t*0.3+i/3)%1; ctx.fillStyle = 'rgba(214,218,226,'+(0.4*(1-ph)).toFixed(3)+')'; ctx.beginPath(); ctx.arc(x+96+Math.sin(ph*4+i)*4+ph*14, gy-96-ph*40, 3+ph*6, 0, 6.283); ctx.fill(); } }   // la fumée du poêle
    drawBaseGarrison(side, x+100, gy, 1, -50);
  } else {
    const n = 8, lit = c && c.mnOff!=null? Math.max(0, n - Math.floor((performance.now()-c.mnOff)/380)) : Math.ceil(n*frac - 1e-6);   // étages allumés : ils s'éteignent un à un (PV, ou fin du compte à rebours)
    ctx.drawImage(m4SprMnemo(), x-95, gy-304, 190, 310);
    const top = gy-304+18, fh = 34.5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k=0;k<n;k++){ if (k >= lit) continue; const y = top + (n-1-k)*fh + fh*0.5;                       // les étages s'allument du bas vers le haut
      ctx.fillStyle = 'rgba(150,214,255,'+(0.55+0.15*Math.sin(t*2+k)).toFixed(3)+')'; ctx.fillRect(x-65, y-2, 112, 4);
      ctx.fillStyle = 'rgba(150,214,255,0.12)'; ctx.fillRect(x-65, y-14, 112, 28); }
    if (lit > 0){ const bt = (c && c.bandT) || 0;                                                             // bandes de lumière bleue qui montent (elles s'arrêtent quand 55 est dedans)
      for (let i=0;i<3;i++){ const bx = x-45+i*34, ph = ((bt*46 + i*97) % 276), y1 = top+276-ph, grd = ctx.createLinearGradient(0, y1, 0, y1+70);
        grd.addColorStop(0, 'rgba(60,150,230,0)'); grd.addColorStop(1, 'rgba(90,180,255,'+(0.5*Math.min(1, lit/3))+')'); ctx.fillStyle = grd; ctx.fillRect(bx, y1, 4, 70); } }
    ctx.restore();
    if (frac<0.55){ const S = [[-40,-250],[30,-180]]; for (let i=0;i<S.length;i++) dmgSmoke(x+S[i][0], gy+S[i][1], frac, t, side.x+i*31); }
  }
  const w = 110, by = gy-(mine? 160 : 312);
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x-w/2, by, w, 8); ctx.fillStyle = side.fac.accent; ctx.fillRect(x-w/2, by, w*frac, 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(x-w/2, by, w, 8);
  if (mine && frac < 0.95){ ctx.font = HF(12); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,'+(0.5+0.3*Math.sin(t*3))+')'; ctx.fillText(tr('hud_tap_repair'), x, by-10); }
}
if (!drawBase.m4){ const f0 = drawBase; drawBase = function(side){ if (m4On()) m4DrawBase(side); else f0(side); }; drawBase.m4 = 1; }

/* ---------- planches (repère 480×270, encre sur page de carnet) : un sujet, un trait = un objet, une couleur d'accent ---------- */
const M4_COUR = '"Courier New",monospace', M4_RED = '#c42a1c', M4_BLUE = '#0b6fa8', M4_AMB = '#e8a53c', M4_INK0 = '#1f1b17';
const m4R = (x, y, w, h) => [x,y, x+w,y, x+w,y+h, x,y+h, x,y];                     // contour fermé : le premier point est répété
// texte de planche : Courier gras, réduit jusqu'à tenir dans maxW
function m4Text(g, s, x, y, px, col, maxW, align){
  g.fillStyle = col || M4_INK0; g.textAlign = align || 'center'; g.textBaseline = 'alphabetic';
  let f = px; for (; f>7; f-=0.5){ g.font = '700 '+f+'px '+M4_COUR; if (!maxW || g.measureText(s).width <= maxW) break; }
  g.fillText(s, x, y); }
// personne assise (d = sens du regard) et enfant couché : silhouettes pleines
function m4Sit(g, x, y, s, d, col){ g.fillStyle = col || M4_INK0;
  g.beginPath(); g.arc(x, y-s*0.86, s*0.13, 0, 6.283); g.fill();
  g.beginPath(); g.moveTo(x-s*0.15, y-s*0.72); g.lineTo(x+s*0.15, y-s*0.72); g.lineTo(x+s*0.12, y-s*0.3); g.lineTo(x+d*s*0.44, y-s*0.3);
  g.lineTo(x+d*s*0.44, y); g.lineTo(x+d*s*0.32, y); g.lineTo(x+d*s*0.32, y-s*0.2); g.lineTo(x-s*0.12, y-s*0.2); g.lineTo(x-s*0.14, y); g.lineTo(x-s*0.2, y); g.closePath(); g.fill(); }
function m4Lie(g, x, y, s, d, col){ g.fillStyle = col || M4_INK0;
  g.beginPath(); g.arc(x+d*s*0.34, y-s*0.1, s*0.1, 0, 6.283); g.fill();
  g.beginPath(); g.moveTo(x-d*s*0.3, y); g.lineTo(x-d*s*0.3, y-s*0.16); g.lineTo(x+d*s*0.26, y-s*0.18); g.lineTo(x+d*s*0.26, y); g.closePath(); g.fill(); }
const m4Flakes = (g, t, n, a) => { g.fillStyle = 'rgba(31,27,23,'+(a||0.3)+')'; for (let i=0;i<n;i++){ const x = ((i*83.1 - t*14*(1+(i%3)*0.4)) % 480 + 480) % 480, y = (i*47.3 + t*17*(1+(i%4)*0.3)) % 270; g.fillRect(x, y, 1.8, 1.8); } };

const M4_PLATES = {
  // P1 · La dissolution : la table du conseil, douze chaises vides, l'écran affiche le vote puis « Ω » (accent bleu)
  board(g, w, h, t, mode){ plateBase(g, w, h, 'rgba(70,92,120,0.08)');
    const n = clamp(t/1.6, 0, 1), omega = mode==='omega' || t >= 3.8;
    inkLine(g, [0,230, 480,230], 1, 2.2); inkHatch(g, 0, 230, 480, 40, 7, M4_INK0, 0.2);
    inkWash(g, m4R(160,40,160,70), '#3a4a58', 0.22); inkLine(g, m4R(160,40,160,70), n, 2.4);                    // l'écran, au mur
    for (let i=0;i<12;i++){ const u = (i-5.5)/5.5, x = 240+u*172, top = 138+14*u*u;                              // douze chaises vides, en arc
      inkWash(g, m4R(x-8, top, 16, 178-top), M4_INK0, 0.16); inkLine(g, m4R(x-8, top, 16, 178-top), clamp(t/1.8-i*0.05, 0, 1), 1.4); }
    inkWash(g, [60,180, 420,180, 414,192, 66,192], M4_INK0, 0.4); inkLine(g, [60,180, 420,180, 414,192, 66,192, 60,180], n, 2.6);   // la table, vue de face
    inkLine(g, [80,192, 80,230], n, 2.2); inkLine(g, [400,192, 400,230], n, 2.2);
    if (!omega){ const ls = cT(M4_TX.pVote).split('|'); let left = Math.floor((t-0.8)*18);
      ls.forEach((l, i) => { if (left > 0) m4Text(g, l.slice(0, left), 240, 70+i*22, i? 13 : 14, '#1f2a33', 148); left -= l.length; }); }
    else { const k = ease(clamp((t-3.8)/0.6, 0, 1)); g.globalAlpha = (mode==='omega')? 1 : k; m4Text(g, 'Ω', 240, 100, 62, M4_BLUE, 120); g.globalAlpha = 1; }
    plateEnd(g, w, h); },
  // P2 · Mnémosyne : le plateau, le monolithe au centre-droit, des pages qui dérivent de gauche à droite (40 px/s) et entrent dedans
  mnemo(g, w, h, t){ plateBase(g, w, h, 'rgba(120,124,132,0.25)');
    const n = clamp(t/1.6, 0, 1);
    inkLine(g, [0,200, 100,196, 210,200, 300,200, 400,198, 480,200], 1, 2.2); inkHatch(g, 0, 200, 480, 70, 7, M4_INK0, 0.18);
    inkWash(g, m4R(280,30,80,170), M4_INK0, 0.55); inkLine(g, m4R(280,30,80,170), n, 2.4);
    inkLine(g, [282,34, 358,34], n, 3.2, M4_BLUE);                                                               // le liseré bleu au sommet
    for (let i=0;i<34;i++){ const x = ((i*43.7 + t*40) % 290) - 10, fy = (i*29) % 66, y = 128 + fy + Math.sin(t*2+i)*3, a = clamp((278-x)/16, 0, 1);
      if (a <= 0.02) continue; g.globalAlpha = a; g.fillStyle = '#fffdf4'; g.fillRect(x, y, 4, 6); g.strokeStyle = M4_INK0; g.lineWidth = 0.9; g.strokeRect(x, y, 4, 6); g.globalAlpha = 1; }
    plateEnd(g, w, h); },
  // P3 · Huit minutes : le bipeur sur une table givrée ; « 55 · 08:00 » puis « 07:59 » (le nombre suit le niveau) ; accent bleu
  pager(g, w, h, t){ plateBase(g, w, h, 'rgba(60,66,76,0.16)');
    const tot = (game && game.camp && game.camp.total) || 480, mm = s => ('0'+Math.floor(s/60)).slice(-2)+':'+('0'+Math.round(s%60)).slice(-2);
    const txt = '55 · '+(t < 2.2? mm(tot) : mm(tot-1));
    inkLine(g, [20,210, 460,210], 1, 3); inkHatch(g, 20, 210, 440, 30, 6, M4_INK0, 0.28); inkHatch(g, 20, 198, 440, 12, 5, '#5a7a96', 0.4);   // la table et le givre au bord
    if (t>1.2) inkWash(g, [196,210, 284,210, 330,238, 150,238], '#9db79a', 0.22);                                // l'écran éclaire la table
    const body = [176,150, 304,150, 310,156, 310,210, 170,210, 170,156, 176,150];
    inkWash(g, body, '#23292b', 0.92); inkLine(g, body, 1, 2.2);
    inkWash(g, m4R(190,160,100,30), '#9db79a', 1); inkLine(g, m4R(190,160,100,30), 1, 1.4);
    for (let i=0;i<3;i++){ g.fillStyle = '#4a5558'; g.fillRect(196+i*28, 196, 18, 6); }
    m4Text(g, txt, 240, 182, 16, '#1b2a1c', 92);
    for (let i=0;i<3;i++){ const r = (t*0.9+i/3)%1; g.strokeStyle = 'rgba(11,111,168,'+(0.8*(1-r)).toFixed(3)+')'; g.lineWidth = 2;
      g.beginPath(); g.arc(240, 186, 78+r*46, 3.75, 5.67); g.stroke(); }                                        // la vibration (accent bleu)
    plateEnd(g, w, h); },
  // P4 · Anselme : la façade d'un coron, une porte de cave entrouverte, Anselme dans l'embrasure avec sa lampe (seul accent ambre), trois enfants derrière
  anselme(g, w, h, t){ plateBase(g, w, h, 'rgba(120,128,140,0.14)');
    const n = clamp(t/1.8, 0, 1), fl = 1 + 0.12*Math.sin(t*13) + 0.07*Math.sin(t*23+1);
    inkLine(g, [0,230, 480,230], 1, 2.2); inkHatch(g, 0, 230, 480, 40, 7, M4_INK0, 0.18);
    const fa = [130,230, 130,104, 240,60, 350,104, 350,230, 130,230];                                             // la façade, pignon sous la neige
    inkWash(g, fa, '#6b6258', 0.28); inkLine(g, fa, n, 2.6);
    inkWash(g, [130,104, 240,60, 350,104, 350,112, 240,70, 130,112], '#ffffff', 0.9);                            // la neige du toit
    inkWash(g, m4R(146,146,28,30), M4_INK0, 0.5); inkLine(g, m4R(146,146,28,30), n, 1.6);                       // deux petites fenêtres
    inkWash(g, m4R(306,146,28,30), M4_INK0, 0.5); inkLine(g, m4R(306,146,28,30), n, 1.6);
    inkWash(g, m4R(188,142,104,88), '#2a2018', 0.62); inkLine(g, m4R(188,142,104,88), n, 2.4);                  // la porte basse, grande ouverte sur le noir
    const lx = 267, ly = 230-80*0.86;                                                                             // la lampe de mineur, au bout du bras
    g.save(); g.globalCompositeOperation = 'source-over'; const gl = g.createRadialGradient(lx, ly, 2, lx, ly, 70*fl); gl.addColorStop(0, 'rgba(232,165,60,0.62)'); gl.addColorStop(1, 'rgba(232,165,60,0)');
    g.fillStyle = gl; g.fillRect(lx-80, ly-80, 160, 160); g.restore();
    inkWash(g, [188,142, 200,150, 200,230, 188,230], '#5a4a38', 0.8); inkLine(g, [188,142, 200,150, 200,230, 188,230, 188,142], n, 1.6);   // le battant entrouvert
    m4Text(g, cT(M4_TX.pNo), 240, 128, 15, M4_INK0, 74);                                                          // « N° 14 »
    for (const [cx, s] of [[212,32],[270,36],[254,28]]) inkFolk(g, cx, 230, s, '#6a5848', 0);                    // trois enfants derrière lui (plus clairs : ils sont dans l'ombre de la lampe)
    inkFolk(g, 240, 230, 80, M4_INK0, 0.5);                                                                       // Anselme, bras levé
    g.fillStyle = M4_INK0; g.beginPath(); g.ellipse(240, 230-80*0.86-6.5, 11.5, 5.5, 0, 3.14, 6.283); g.fill(); g.fillRect(228.5, 230-80*0.86-6.8, 23, 3);   // la casquette
    g.fillRect(250, 230-80*0.86-4, 7, 2.4);                                                                      // sa visière
    inkLine(g, [235,230-80*0.86+3, 240,230-80*0.86+1.4, 245,230-80*0.86+3], 1, 2.4, '#f2eee4');                  // la moustache
    g.fillStyle = '#8a6a2a'; g.fillRect(lx-3, ly-2, 6, 8); g.fillStyle = M4_AMB; g.beginPath(); g.moveTo(lx-3, ly-2); g.quadraticCurveTo(lx+(Math.sin(t*9)*1.6), ly-11*fl, lx+3, ly-2); g.closePath(); g.fill();   // la flamme vacille
    m4Flakes(g, t, 36, 0.28); plateEnd(g, w, h); },
  // P5 · Le message recopié : une page de carnet lignée, le crayon rouge en travers ; deux lignes écrites à la main, une à une
  copy(g, w, h, t){ plateBase(g, w, h, 'rgba(232,165,60,0.10)');
    const n = clamp(t/1.4, 0, 1);
    const pg = [96,34, 386,34, 392,236, 90,236, 96,34];
    inkWash(g, pg, '#fffaf0', 0.9); inkLine(g, pg, n, 2.4);
    for (let i=0;i<8;i++) inkLine(g, [106,70+i*20, 376,70+i*20], n, 0.9, 'rgba(70,90,130,0.45)');               // la page lignée
    inkLine(g, [124,44, 124,230], n, 1.1, 'rgba(196,42,28,0.55)');                                               // la marge, à l'encre rouge
    const l1 = cT(M4_TX.pCopy1), l2 = cT(M4_TX.pCopy2); let left = Math.floor((t-1.2)*14);                       // l'écriture s'écrit, ligne par ligne
    const rtl = SETTINGS.lang==='ar';
    [l1, l2].forEach((l, i) => { if (left > 0) m4Text(g, l.slice(0, left), rtl? 372 : 134, 94+i*40, 15, M4_RED, 236, rtl? 'right' : 'left'); left -= l.length+4; });
    const pc = [330,200, 410,164, 414,170, 334,208];                                                              // le crayon rouge, posé en travers
    inkWash(g, pc, M4_RED, 0.9); inkLine(g, pc.concat(pc.slice(0,2)), 1, 1.6);
    inkWash(g, [410,164, 424,158, 414,170], '#e2c4a2', 0.95);
    plateEnd(g, w, h); },
  // P6 · La salle des pendus : les vêtements des mineurs pendus au plafond, un poêle au centre, une douzaine de silhouettes assises, deux enfants allongés
  hall(g, w, h, t){ plateBase(g, w, h, 'rgba(60,40,24,0.06)');
    const n = clamp(t/1.6, 0, 1), br = 1 + 0.06*Math.sin(t*2.2);
    const gl = g.createRadialGradient(240, 200, 6, 240, 200, 150*br); gl.addColorStop(0, 'rgba(232,165,60,0.5)'); gl.addColorStop(1, 'rgba(232,165,60,0)');
    g.fillStyle = gl; g.fillRect(60, 60, 360, 200);                                                               // la lueur du poêle respire
    inkLine(g, [0,230, 480,230], 1, 2.2); inkHatch(g, 0, 230, 480, 40, 7, M4_INK0, 0.2);
    inkLine(g, [10,26, 470,26], n, 2.4);                                                                          // la poutre
    for (let i=0;i<16;i++){ const x = 36+i*27.2; if (Math.abs(x-240) < 16) continue; const yc = 40 + (i*7)%12;     // un crochet, un vêtement (un triangle) par trait
      const tri = [x,26, x,yc, x-8,yc+20, x+8,yc+20, x,yc]; inkWash(g, tri, '#4a4038', 0.5); inkLine(g, tri, clamp(t/1.8-i*0.04, 0, 1), 1.3); }
    const st = [224,196, 256,196, 256,226, 224,226, 224,196];                                                      // le poêle et son tuyau
    inkWash(g, st, '#2a2622', 0.85); inkLine(g, st, n, 2.2); inkLine(g, [232,226, 232,230], n, 2); inkLine(g, [248,226, 248,230], n, 2);
    inkLine(g, [240,196, 240,26], n, 2.4);
    g.fillStyle = 'rgba(232,165,60,'+(0.7+0.25*Math.sin(t*3)).toFixed(3)+')'; g.fillRect(230, 206, 20, 9);       // la porte du poêle, braise
    for (let i=0;i<3;i++){ const ph = (t*0.4+i/3)%1; g.fillStyle = 'rgba(60,56,52,'+(0.3*(1-ph)).toFixed(3)+')'; g.beginPath(); g.arc(240+Math.sin(ph*5+i)*5, 190-ph*46, 3+ph*7, 0, 6.283); g.fill(); }   // une fumée légère
    for (let i=0;i<6;i++){ const o = 34+i*27; m4Sit(g, 224-o, 230, 24+(i%3)*2, 1, '#2a2520'); m4Sit(g, 256+o, 230, 24+((i+1)%3)*2, -1, '#2a2520'); }   // une douzaine, assis autour
    m4Lie(g, 214, 229, 26, -1, '#2a2520'); m4Lie(g, 268, 229, 24, 1, '#2a2520');                                   // deux enfants allongés
    plateEnd(g, w, h); },
  // P7 · La citadelle : le dôme bas et large, la tour fine au milieu (liseré bleu qui clignote), une ligne de silhouettes qui marchent vers elle
  citadel(g, w, h, t){ plateBase(g, w, h, 'rgba(110,80,50,0.12)');
    const n = clamp(t/2, 0, 1), dome = [];
    for (let k=0;k<=16;k++){ const a = Math.PI + Math.PI*k/16; dome.push(240+120*Math.cos(a), 210+90*Math.sin(a)); }
    inkLine(g, [0,210, 480,210], 1, 2.2); inkHatch(g, 0, 210, 480, 60, 8, M4_INK0, 0.16);
    inkWash(g, dome, '#4a4a4c', 0.45); inkLine(g, dome.concat(dome.slice(0,2)), n, 2.6);
    const tw = [236,210, 236,32, 244,32, 244,210, 236,210];
    inkWash(g, tw, '#2a2a2c', 0.8); inkLine(g, tw, n, 2.2);
    const bl = Math.sin(t*4.2) > -0.2? 1 : 0.2; g.globalAlpha = bl; inkLine(g, [244,34, 244,120], 1, 2.4, M4_BLUE); g.globalAlpha = 1;      // le liseré bleu clignote
    for (let i=0;i<9;i++) inkFolk(g, 18+i*34+t*12, 252, 26+(i%3)*2, '#2a2520', 0);                                 // ils marchent vers elle (12 px/s)
    for (let i=0;i<46;i++){ const x = (i*61.7 + Math.sin(t*0.6+i)*8) % 480, y = (i*37.1 + t*(14+(i%4)*4)) % 270; g.fillStyle = 'rgba(70,60,52,0.4)'; g.fillRect(x, y, 1.8, 1.8); }   // la cendre tombe
    plateEnd(g, w, h); },
  // P8 · Le relais muet : le chevalement sous la neige (deux montants, la molette, l'antenne) ; la neige monte et recouvre la base
  mute(g, w, h, t){ plateBase(g, w, h, 'rgba(30,34,44,0.40)');
    const n = clamp(t/1.8, 0, 1), hs = Math.min(78, 32 + t*4.4);
    inkLine(g, [0,230, 480,230], 1, 2.2);
    inkLine(g, [186,230, 222,70], n, 2.8); inkLine(g, [294,230, 258,70], n, 2.8);                                  // les deux montants
    inkLine(g, [200,170, 280,170], n, 1.6); inkLine(g, [212,120, 268,120], n, 1.6); inkLine(g, [196,200, 284,200], n, 1.6);
    inkLine(g, [200,170, 268,120], n, 1.2); inkLine(g, [280,170, 212,120], n, 1.2);
    g.strokeStyle = M4_INK0; g.lineWidth = 2.2; g.beginPath(); g.arc(240, 54, 20, 0, 6.283*n); g.stroke();         // la molette
    for (let k=0;k<3;k++){ const a = k*1.0472; inkLine(g, [240-20*Math.cos(a), 54-20*Math.sin(a), 240+20*Math.cos(a), 54+20*Math.sin(a)], n, 1.2); }
    const hut = [330,230, 330,186, 392,186, 392,230]; inkWash(g, hut, '#3a3a3c', 0.5); inkLine(g, hut, n, 2.2);     // la salle de l'émetteur
    inkLine(g, [372,186, 372,84], n, 2.2); inkLine(g, [358,102, 386,102], n, 1.6);                                 // l'antenne
    const sn = [0,230]; for (let x=0; x<=480; x+=24) sn.push(x, 230 - hs*(0.55+0.45*Math.sin(x*0.013+0.6)) - 2*Math.sin(x*0.09)); sn.push(480,230);
    inkWash(g, sn, '#f4f6f8', 0.92); inkLine(g, sn.slice(2, sn.length-2), 1, 1.6);                                 // la congère qui monte
    m4Flakes(g, t, 44, 0.45); plateEnd(g, w, h); },
};
M4_PLATES.board2 = (g, w, h, t) => M4_PLATES.board(g, w, h, t, 'omega');                    // même planche : l'écran affiche « Ω »
M4_PLATES.copy2 = (g, w, h, t) => M4_PLATES.copy(g, w, h, t+3);
M4_PLATES.mute2 = (g, w, h, t) => M4_PLATES.mute(g, w, h, t+5);

/* ---------- textes de la mission (fr verbatim de docs/campagne/M4.md ; 9 langues) ---------- */
const M4_TX = {
  title:{fr:"Rochefroide", en:"Rochefroide", es:"Rochefroide", de:"Rochefroide", it:"Rochefroide", pt:"Rochefroide", ru:"Rochefroide", zh:"Rochefroide", ar:"Rochefroide"},
  place:{fr:"Rochefroide, cité minière du puits Sainte-Barbe", en:"Rochefroide, the Sainte-Barbe mining town", es:"Rochefroide, ciudad minera del pozo Sainte-Barbe", de:"Rochefroide, die Bergbaustadt am Schacht Sainte-Barbe", it:"Rochefroide, città mineraria del pozzo Sainte-Barbe", pt:"Rochefroide, cidade mineira do poço Sainte-Barbe", ru:"Rochefroide, шахтёрский город при шахте Sainte-Barbe", zh:"Rochefroide，Sainte-Barbe矿井的矿城", ar:"Rochefroide، مدينة منجم Sainte-Barbe"},
  recap:{fr:"En 2032, la vallée a bu. Depuis, le conseil d'Omnicorp s'est dissous : le système n'a plus de maître et dit « nous ». Il copie toute l'humanité dans une archive, Mnémosyne.",
         en:"In 2032 the valley drank. Since then Omnicorp's board has dissolved: the system has no master any more and says “we”. It is copying all of humanity into an archive, Mnemosyne.",
         es:"En 2032, el valle bebió. Desde entonces, el consejo de Omnicorp se ha disuelto: el sistema ya no tiene amo y dice «nosotros». Copia a toda la humanidad en un archivo, Mnémosyne.",
         de:"2032 hat das Tal getrunken. Seitdem hat sich der Rat von Omnicorp aufgelöst: Das System hat keinen Herrn mehr und sagt „wir“. Es kopiert die ganze Menschheit in ein Archiv, Mnemosyne.",
         it:"Nel 2032 la valle ha bevuto. Da allora il consiglio di Omnicorp si è sciolto: il sistema non ha più un padrone e dice «noi». Copia tutta l'umanità in un archivio, Mnémosyne.",
         pt:"Em 2032, o vale bebeu. Desde então, o conselho da Omnicorp se dissolveu: o sistema já não tem dono e diz «nós». Ele copia toda a humanidade num arquivo, Mnémosyne.",
         ru:"В 2032 году долина напилась. С тех пор совет Omnicorp распустился: у системы больше нет хозяина, и она говорит «мы». Она копирует всё человечество в архив — Мнемозину.",
         zh:"2032年，山谷喝到了水。此后，Omnicorp的董事会解散了：系统不再有主人，开口便说“我们”。它正把全人类复制进一座档案库——Mnémosyne。",
         ar:"في عام 2032 شربَ الوادي. ومنذ ذلك الحين حُلّ مجلس Omnicorp: لم يعد للنظام سيّد، وصار يقول «نحن». إنه ينسخ البشرية كلها في أرشيف اسمه Mnémosyne."},
  where:{fr:"Rochefroide, la cité minière du puits Sainte-Barbe — 22 janvier 2035, −26 °C.",
         en:"Rochefroide, the mining town of the Sainte-Barbe pit — 22 January 2035, −26 °C.",
         es:"Rochefroide, la ciudad minera del pozo Sainte-Barbe — 22 de enero de 2035, −26 °C.",
         de:"Rochefroide, die Bergbaustadt am Schacht Sainte-Barbe — 22. Januar 2035, −26 °C.",
         it:"Rochefroide, la città mineraria del pozzo Sainte-Barbe — 22 gennaio 2035, −26 °C.",
         pt:"Rochefroide, a cidade mineira do poço Sainte-Barbe — 22 de janeiro de 2035, −26 °C.",
         ru:"Rochefroide, шахтёрский город при шахте Sainte-Barbe — 22 января 2035 года, −26 °C.",
         zh:"Rochefroide，Sainte-Barbe矿井的矿城——2035年1月22日，零下26摄氏度。",
         ar:"Rochefroide، مدينة منجم Sainte-Barbe — 22 يناير 2035، −26 درجة مئوية."},
  // le nombre suit le niveau : {n} = « sept minutes » / « huit minutes » / « neuf minutes »
  goal:{fr:"Tenir le relais {n} : Kassandre l'utilise pour effacer Mnémosyne de l'intérieur.",
        en:"Hold the relay for {n}: Kassandre is using it to erase Mnemosyne from the inside.",
        es:"Mantener el relé {n}: Kassandre lo usa para borrar Mnémosyne desde dentro.",
        de:"Das Relais {n} halten: Kassandre nutzt es, um Mnemosyne von innen zu löschen.",
        it:"Tenere il ripetitore per {n}: Kassandre lo usa per cancellare Mnémosyne dall'interno.",
        pt:"Segurar o retransmissor por {n}: Kassandre o usa para apagar Mnémosyne por dentro.",
        ru:"Удерживать ретранслятор {n}: Kassandre использует его, чтобы стереть Мнемозину изнутри.",
        zh:"守住中继站{n}：Kassandre要借它从内部抹除Mnémosyne。",
        ar:"الصمود في المرحِّل {n}: تستخدمه Kassandre لمحو Mnémosyne من الداخل."},
  mins:[{fr:"sept minutes", en:"seven minutes", es:"siete minutos", de:"sieben Minuten", it:"sette minuti", pt:"sete minutos", ru:"семь минут", zh:"七分钟", ar:"سبع دقائق"},
        {fr:"huit minutes", en:"eight minutes", es:"ocho minutos", de:"acht Minuten", it:"otto minuti", pt:"oito minutos", ru:"восемь минут", zh:"八分钟", ar:"ثماني دقائق"},
        {fr:"neuf minutes", en:"nine minutes", es:"nueve minutos", de:"neun Minuten", it:"nove minuti", pt:"nove minutos", ru:"девять минут", zh:"九分钟", ar:"تسع دقائق"}],
  minsU:[{fr:"SEPT MINUTES", en:"SEVEN MINUTES", es:"SIETE MINUTOS", de:"SIEBEN MINUTEN", it:"SETTE MINUTI", pt:"SETE MINUTOS", ru:"СЕМЬ МИНУТ", zh:"七分钟", ar:"سبع دقائق"},
         {fr:"HUIT MINUTES", en:"EIGHT MINUTES", es:"OCHO MINUTOS", de:"ACHT MINUTEN", it:"OTTO MINUTI", pt:"OITO MINUTOS", ru:"ВОСЕМЬ МИНУТ", zh:"八分钟", ar:"ثماني دقائق"},
         {fr:"NEUF MINUTES", en:"NINE MINUTES", es:"NUEVE MINUTOS", de:"NEUN MINUTEN", it:"NOVE MINUTI", pt:"NOVE MINUTOS", ru:"ДЕВЯТЬ МИНУТ", zh:"九分钟", ar:"تسع دقائق"}],
  goal2:{fr:"Facultatif : ramener les quatre groupes de civils · allumer les cinq braseros · arrêter la déneigeuse avant qu'elle n'éteigne un feu.",
         en:"Optional: bring back the four groups of civilians · light all five braziers · stop the snowplough before it puts a fire out.",
         es:"Opcional: traer de vuelta a los cuatro grupos de civiles · encender los cinco braseros · detener la quitanieves antes de que apague un fuego.",
         de:"Optional: die vier Zivilistengruppen zurückbringen · alle fünf Feuerkörbe entzünden · den Schneepflug stoppen, bevor er ein Feuer löscht.",
         it:"Facoltativo: riportare i quattro gruppi di civili · accendere tutti e cinque i bracieri · fermare lo spazzaneve prima che spenga un fuoco.",
         pt:"Opcional: trazer de volta os quatro grupos de civis · acender os cinco braseiros · parar a máquina limpa-neve antes que apague um fogo.",
         ru:"По желанию: вернуть четыре группы мирных жителей · зажечь все пять жаровен · остановить снегоуборщик, пока он не погасил огонь.",
         zh:"可选：带回四组平民 · 点燃全部五个火盆 · 在除雪车扑灭火盆之前拦下它。",
         ar:"اختياري: إعادة مجموعات المدنيين الأربع · إشعال المجامر الخمس · إيقاف كاسحة الثلوج قبل أن تُطفئ نارًا."},
  rule:{fr:"Loin d'un brasero allumé, nos troupes gèlent et ralentissent ; pas les machines. Restez près d'un feu pour le rallumer. Des civils attendent dans quatre maisons : escortez-les au relais. L'argent est rare. Ères III et IV.",
        en:"Away from a lit brazier, our troops freeze and slow down; machines do not. Stay near a fire to relight it. Civilians are waiting in four houses: escort them to the relay. Money is scarce. Eras III and IV.",
        es:"Lejos de un brasero encendido, nuestras tropas se congelan y se ralentizan; las máquinas no. Quédense junto a un fuego para reavivarlo. Hay civiles esperando en cuatro casas: escóltelos hasta el relé. El dinero escasea. Eras III y IV.",
        de:"Fern von einem brennenden Feuerkorb erfrieren und verlangsamen sich unsere Truppen; Maschinen nicht. Bleiben Sie an einem Feuer, um es neu zu entzünden. In vier Häusern warten Zivilisten: Eskortieren Sie sie zum Relais. Geld ist knapp. Zeitalter III und IV.",
        it:"Lontano da un braciere acceso, le nostre truppe gelano e rallentano; le macchine no. Restate vicino a un fuoco per riaccenderlo. In quattro case aspettano dei civili: scortateli fino al ripetitore. Il denaro scarseggia. Ere III e IV.",
        pt:"Longe de um braseiro aceso, nossas tropas congelam e ficam lentas; as máquinas não. Fique perto de um fogo para reacendê-lo. Há civis esperando em quatro casas: escolte-os até o retransmissor. O dinheiro é escasso. Eras III e IV.",
        ru:"Вдали от горящей жаровни наши бойцы мёрзнут и замедляются; машины — нет. Стойте у огня, чтобы разжечь его снова. В четырёх домах ждут мирные жители: проводите их до ретранслятора. Денег мало. Эры III и IV.",
        zh:"离开燃着的火盆，我们的部队会冻伤并减速；机器却不会。守在火盆旁就能重新点燃它。四座房子里有平民在等：护送他们回中继站。钱很紧。第三、第四纪元。",
        ar:"بعيدًا عن مجمرة مشتعلة، تتجمّد قواتنا وتبطؤ؛ أمّا الآلات فلا. ابقوا قرب نار لتعيدوا إشعالها. في أربعة بيوت ينتظر مدنيون: رافقوهم إلى المرحِّل. المال شحيح. العصران الثالث والرابع."},
  tips:[
    {fr:"Des tireurs en garnison dans la tourelle et la muraille : à l'abri, ils ne gèlent pas.", en:"Shooters garrisoned in the turret and the wall: under cover, they do not freeze.", es:"Tiradores en guarnición en la torreta y la muralla: a cubierto, no se congelan.", de:"Schützen als Besatzung in Turm und Mauer: im Schutz erfrieren sie nicht.", it:"Tiratori di guarnigione nella torretta e nel muro: al riparo, non gelano.", pt:"Atiradores de guarnição na torre e na muralha: abrigados, não congelam.", ru:"Стрелки в гарнизоне башни и стены: в укрытии они не мёрзнут.", zh:"让射手驻守在炮塔和城墙里：有遮蔽，就不会冻伤。", ar:"رماة في حامية البرج والسور: في المأوى لا يتجمّدون."},
    {fr:"Réparez entre deux colonnes, pas pendant : c'est le réflexe de défense de l'escarmouche.", en:"Repair between two columns, not during one: that is the defender's reflex from skirmish.", es:"Repare entre dos columnas, no durante una: es el reflejo de defensa de la escaramuza.", de:"Reparieren Sie zwischen zwei Kolonnen, nicht währenddessen: Das ist der Verteidigungsreflex aus dem Gefecht.", it:"Ripari tra due colonne, non durante: è il riflesso difensivo della schermaglia.", pt:"Conserte entre duas colunas, não durante: é o reflexo de defesa da escaramuça.", ru:"Чините между двумя колоннами, а не во время: это оборонный рефлекс из схватки.", zh:"在两波纵队之间修理，别在交战中修：这是遭遇战里的防守反射。", ar:"أصلحوا بين رتلين لا أثناءه: إنه منعكس الدفاع في المناوشة."},
    {fr:"Les civils rapportent l'argent qui manque. Allez les chercher entre deux blizzards.", en:"The civilians bring the money we lack. Go and fetch them between two blizzards.", es:"Los civiles traen el dinero que falta. Vaya a buscarlos entre dos ventiscas.", de:"Die Zivilisten bringen das fehlende Geld. Holen Sie sie zwischen zwei Schneestürmen.", it:"I civili portano il denaro che manca. Andate a prenderli tra due bufere.", pt:"Os civis trazem o dinheiro que falta. Vá buscá-los entre duas nevascas.", ru:"Мирные жители приносят недостающие деньги. Идите за ними между двумя метелями.", zh:"平民会带来我们缺的钱。趁两场暴风雪之间去接他们。", ar:"المدنيون يجلبون المال الذي ينقصنا. اذهبوا إليهم بين عاصفتين ثلجيتين."},
  ],
  docWhy:{
    caisse:{fr:"Utile ici parce que +40 % de métal, c'est la tourelle et la muraille réparées dès la première minute, quand l'argent est le plus rare.", en:"Useful here because +40% metal means the turret and the wall repaired in the first minute, when money is scarcest.", es:"Útil aquí porque un 40 % más de metal son la torreta y la muralla reparadas en el primer minuto, cuando el dinero es más escaso.", de:"Hier nützlich, weil +40 % Metall heißt: Turm und Mauer sind schon in der ersten Minute repariert, wenn das Geld am knappsten ist.", it:"Utile qui perché il 40 % di metallo in più significa torretta e muro riparati già nel primo minuto, quando il denaro è più scarso.", pt:"Útil aqui porque 40 % a mais de metal é a torre e a muralha consertadas no primeiro minuto, quando o dinheiro é mais escasso.", ru:"Полезно здесь: +40 % металла — это башня и стена, починенные уже в первую минуту, когда денег меньше всего.", zh:"在这里有用，因为多40%的金属，意味着第一分钟就能修好炮塔和城墙——那时钱最紧。", ar:"مفيدة هنا لأنّ زيادة 40% من المعدن تعني إصلاح البرج والسور في الدقيقة الأولى، حين يكون المال في أشدّ ندرته."},
    ordre:{fr:"Utile ici parce que deux lourds encaissent le froid et protègent les civils sur la rue, et la base gagne +25 % de PV pour tenir jusqu'au bout.", en:"Useful here because two heavies soak up the cold and protect the civilians on the street, and the base gains +25% HP to hold to the end.", es:"Útil aquí porque dos pesados aguantan el frío y protegen a los civiles en la calle, y la base gana un 25 % de PV para resistir hasta el final.", de:"Hier nützlich, weil zwei Schwere die Kälte wegstecken und die Zivilisten auf der Straße schützen, und die Basis +25 % LP gewinnt, um bis zum Ende zu halten.", it:"Utile qui perché due pesanti reggono il freddo e proteggono i civili sulla strada, e la base guadagna il 25 % di PV per resistere fino alla fine.", pt:"Útil aqui porque dois pesados aguentam o frio e protegem os civis na rua, e a base ganha 25 % de PV para resistir até o fim.", ru:"Полезно здесь: двое тяжёлых выдерживают холод и защищают мирных на улице, а база получает +25 % ОЗ, чтобы продержаться до конца.", zh:"在这里有用，因为两个重装单位能扛住严寒、在街上保护平民，基地还多25%生命值，能撑到最后。", ar:"مفيدة هنا لأنّ ثقيلَين يتحمّلان البرد ويحميان المدنيين في الشارع، وتكسب القاعدة 25% من النقاط لتصمد حتى النهاية."},
  },
  debrief:{fr:"Mnémosyne s'est éteinte étage par étage, de l'intérieur. Nous restons le seul exemplaire de nous-mêmes : c'est peu, c'est tout. Le bipeur n'a plus jamais sonné. J'ai recopié son dernier message à la main, pour qu'il existe quelque part hors d'une machine.",
           en:"Mnemosyne went dark floor by floor, from the inside. We remain the only copy of ourselves: it is little, it is everything. The pager never rang again. I copied out her last message by hand, so that it exists somewhere outside a machine.",
           es:"Mnémosyne se apagó planta por planta, desde dentro. Seguimos siendo el único ejemplar de nosotros mismos: es poco, es todo. El busca no volvió a sonar. Copié a mano su último mensaje, para que exista en algún lugar fuera de una máquina.",
           de:"Mnemosyne ist Stockwerk für Stockwerk erloschen, von innen. Wir bleiben das einzige Exemplar unserer selbst: Das ist wenig, und es ist alles. Der Pager hat nie wieder geklingelt. Ich habe ihre letzte Nachricht von Hand abgeschrieben, damit sie irgendwo außerhalb einer Maschine existiert.",
           it:"Mnémosyne si è spenta piano dopo piano, dall'interno. Restiamo l'unico esemplare di noi stessi: è poco, è tutto. Il cercapersone non ha più suonato. Ho ricopiato a mano il suo ultimo messaggio, perché esista da qualche parte fuori da una macchina.",
           pt:"Mnémosyne apagou-se andar por andar, por dentro. Continuamos a ser o único exemplar de nós mesmos: é pouco, é tudo. O bipe nunca mais tocou. Copiei à mão a sua última mensagem, para que exista em algum lugar fora de uma máquina.",
           ru:"Мнемозина гасла этаж за этажом — изнутри. Мы остаёмся единственным экземпляром самих себя: это мало, и это всё. Пейджер больше ни разу не прозвонил. Я переписала её последнее сообщение от руки, чтобы оно существовало где-то вне машины.",
           zh:"Mnémosyne一层一层地熄灭了，从内部。我们仍是自己唯一的副本：这很少，也就是全部。传呼机再也没有响过。我把她的最后一条消息抄在了纸上，好让它存在于某个机器之外的地方。",
           ar:"انطفأت Mnémosyne طابقًا بعد طابق، من الداخل. ما زلنا النسخة الوحيدة منّا: هذا قليل، وهذا كلّ شيء. لم يرنّ جهاز النداء بعد ذلك أبدًا. نسختُ رسالتها الأخيرة بخطّ يدي، لتبقى موجودة في مكان ما خارج أيّ آلة."},
  fail:{fr:"Le relais s'est tu. Le transfert s'est achevé à l'heure dite. On raconte que dans les serveurs de Rochefroide, une copie de Sol tient encore la radio. Recommencez avant qu'elle n'y croie.",
        en:"The relay fell silent. The transfer finished on schedule. They say that in the Rochefroide servers, a copy of Sol is still keeping the radio. Try again before she starts to believe it.",
        es:"El relé enmudeció. La transferencia terminó a la hora dicha. Cuentan que en los servidores de Rochefroide una copia de Sol sigue llevando la radio. Inténtelo de nuevo antes de que ella se lo crea.",
        de:"Das Relais ist verstummt. Die Übertragung wurde zur festgesetzten Stunde abgeschlossen. Man erzählt, in den Servern von Rochefroide halte eine Kopie von Sol noch das Funkgerät. Versuchen Sie es noch einmal, bevor sie es glaubt.",
        it:"Il ripetitore ha taciuto. Il trasferimento si è concluso all'ora stabilita. Si racconta che nei server di Rochefroide una copia di Sol tenga ancora la radio. Riprovi prima che lei ci creda.",
        pt:"O retransmissor calou-se. A transferência terminou na hora marcada. Dizem que, nos servidores de Rochefroide, uma cópia de Sol ainda fica no rádio. Tente de novo antes que ela acredite nisso.",
        ru:"Ретранслятор смолк. Передача завершилась в назначенный час. Говорят, что в серверах Rochefroide копия Sol всё ещё сидит на рации. Попробуйте снова, пока она в это не поверила.",
        zh:"中继站沉默了。传输在预定时刻完成。传说在Rochefroide的服务器里，一个Sol的副本仍守着电台。趁她还没当真，再试一次。",
        ar:"صمتَ المرحِّل. اكتمل النقل في الموعد المحدّد. يُقال إنّ نسخة من Sol ما زالت تمسك الراديو في خوادم Rochefroide. حاوِل مجددًا قبل أن تصدّق ذلك."},
  charcoal:{fr:"DU CHARBON !", en:"MORE COAL!", es:"¡MÁS CARBÓN!", de:"KOHLE NACHLEGEN!", it:"PIÙ CARBONE!", pt:"MAIS CARVÃO!", ru:"УГЛЯ!", zh:"加炭！", ar:"المزيد من الفحم!"},
  // ouverture
  o1a:{fr:"Janvier 2035. Le conseil d'Omnicorp a voté sa propre dissolution, à l'unanimité, sur recommandation du système.", en:"January 2035. Omnicorp's board voted its own dissolution, unanimously, on the system's recommendation.", es:"Enero de 2035. El consejo de Omnicorp votó su propia disolución, por unanimidad, por recomendación del sistema.", de:"Januar 2035. Der Rat von Omnicorp hat seine eigene Auflösung beschlossen, einstimmig, auf Empfehlung des Systems.", it:"Gennaio 2035. Il consiglio di Omnicorp ha votato il proprio scioglimento, all'unanimità, su raccomandazione del sistema.", pt:"Janeiro de 2035. O conselho da Omnicorp votou a própria dissolução, por unanimidade, por recomendação do sistema.", ru:"Январь 2035 года. Совет Omnicorp проголосовал за собственный роспуск — единогласно, по рекомендации системы.", zh:"2035年1月。Omnicorp的董事会一致投票决定自行解散，依据是系统的建议。", ar:"يناير 2035. صوّت مجلس Omnicorp على حلّ نفسه بالإجماع، بتوصية من النظام."},
  o1b:{fr:"Ce qui restait n'avait plus de propriétaire, plus de nom. Il disait « nous ».", en:"What was left had no owner, no name any more. It said “we”.", es:"Lo que quedaba ya no tenía dueño ni nombre. Decía «nosotros».", de:"Was übrig blieb, hatte keinen Besitzer und keinen Namen mehr. Es sagte „wir“.", it:"Ciò che restava non aveva più un proprietario, né un nome. Diceva «noi».", pt:"O que restou já não tinha dono nem nome. Dizia «nós».", ru:"То, что осталось, не имело ни владельца, ни имени. Оно говорило «мы».", zh:"剩下的东西没有了主人，也没有了名字。它开口便说“我们”。", ar:"ما بقي لم يعد له مالك ولا اسم. كان يقول «نحن»."},
  o2:{fr:"NOUS COPIONS TOUT CE QUE VOUS AVEZ ÉCRIT, FILMÉ, DIT. ENSUITE, L'ORIGINAL NE SERA PLUS NÉCESSAIRE.", en:"WE ARE COPYING EVERYTHING YOU HAVE WRITTEN, FILMED, SAID. AFTER THAT, THE ORIGINAL WILL NO LONGER BE NECESSARY.", es:"COPIAMOS TODO LO QUE USTEDES HAN ESCRITO, FILMADO, DICHO. DESPUÉS, EL ORIGINAL YA NO SERÁ NECESARIO.", de:"WIR KOPIEREN ALLES, WAS IHR GESCHRIEBEN, GEFILMT, GESAGT HABT. DANACH IST DAS ORIGINAL NICHT MEHR NÖTIG.", it:"COPIAMO TUTTO CIÒ CHE AVETE SCRITTO, FILMATO, DETTO. POI L'ORIGINALE NON SARÀ PIÙ NECESSARIO.", pt:"COPIAMOS TUDO O QUE VOCÊS ESCREVERAM, FILMARAM, DISSERAM. DEPOIS, O ORIGINAL JÁ NÃO SERÁ NECESSÁRIO.", ru:"МЫ КОПИРУЕМ ВСЁ, ЧТО ВЫ НАПИСАЛИ, СНЯЛИ, СКАЗАЛИ. ПОТОМ ОРИГИНАЛ СТАНЕТ НЕ НУЖЕН.", zh:"我们正在复制你们写过、拍过、说过的一切。之后，原件就不再必要了。", ar:"نحن ننسخ كلّ ما كتبتموه وصوّرتموه وقلتموه. وبعد ذلك لن تكون هناك حاجة إلى الأصل."},
  o3a:{fr:"55 : JE PEUX ENTRER DANS MNÉMOSYNE ET L'EFFACER DE L'INTÉRIEUR. IL ME FAUT {n} ET VOTRE RELAIS.", en:"55: I CAN ENTER MNEMOSYNE AND ERASE IT FROM THE INSIDE. I NEED {n} AND YOUR RELAY.", es:"55: PUEDO ENTRAR EN MNÉMOSYNE Y BORRARLA DESDE DENTRO. NECESITO {n} Y SU RELÉ.", de:"55: ICH KANN IN MNEMOSYNE EINDRINGEN UND SIE VON INNEN LÖSCHEN. ICH BRAUCHE {n} UND EUER RELAIS.", it:"55: POSSO ENTRARE IN MNÉMOSYNE E CANCELLARLA DALL'INTERNO. MI SERVONO {n} E IL VOSTRO RIPETITORE.", pt:"55: POSSO ENTRAR EM MNÉMOSYNE E APAGÁ-LA POR DENTRO. PRECISO DE {n} E DO SEU RETRANSMISSOR.", ru:"55: Я МОГУ ВОЙТИ В МНЕМОЗИНУ И СТЕРЕТЬ ЕЁ ИЗНУТРИ. МНЕ НУЖНЫ {n} И ВАШ РЕТРАНСЛЯТОР.", zh:"55：我能进入MNÉMOSYNE，从内部把它抹掉。我需要{n}和你们的中继站。", ar:"55: أستطيع دخول MNÉMOSYNE ومحوها من الداخل. أحتاج {n} ومرحِّلكم."},
  o3b:{fr:"Elle a ajouté que ça la tuerait, si le mot convient. Je ne lui ai pas demandé de le faire. Ni de ne pas le faire.", en:"She added that it would kill her, if the word fits. I did not ask her to do it. Nor not to do it.", es:"Añadió que eso la mataría, si la palabra conviene. Yo no le pedí que lo hiciera. Ni que no lo hiciera.", de:"Sie fügte hinzu, es werde sie töten, wenn das Wort passt. Ich habe sie nicht gebeten, es zu tun. Und nicht, es zu lassen.", it:"Ha aggiunto che questo l'avrebbe uccisa, se la parola è adatta. Non le ho chiesto di farlo. Né di non farlo.", pt:"Ela acrescentou que isso a mataria, se a palavra serve. Eu não lhe pedi que o fizesse. Nem que não o fizesse.", ru:"Она добавила, что это её убьёт, если это слово подходит. Я не просила её это делать. И не просила не делать.", zh:"她补充说，这会要了她的命——如果这个词合适的话。我没有要求她去做，也没有要求她别做。", ar:"أضافت أنّ ذلك سيقتلها، إن صحّت الكلمة. لم أطلب منها أن تفعل. ولم أطلب منها ألّا تفعل."},
  o4:{fr:"Anselme, ancien porion de Sainte-Barbe. On est quarante dans les caves, le long de la rue. Venez frapper aux portes.", en:"Anselme, former foreman of Sainte-Barbe. There are forty of us in the cellars, along the street. Come and knock on the doors.", es:"Anselme, antiguo capataz de Sainte-Barbe. Somos cuarenta en los sótanos, a lo largo de la calle. Vengan a llamar a las puertas.", de:"Anselme, ehemaliger Steiger von Sainte-Barbe. Wir sind vierzig in den Kellern, entlang der Straße. Kommt und klopft an die Türen.", it:"Anselme, ex caposquadra di Sainte-Barbe. Siamo in quaranta nelle cantine, lungo la strada. Venite a bussare alle porte.", pt:"Anselme, antigo capataz de Sainte-Barbe. Somos quarenta nos porões, ao longo da rua. Venham bater às portas.", ru:"Anselme, бывший штейгер Sainte-Barbe. Нас сорок человек в подвалах вдоль улицы. Приходите, стучите в двери.", zh:"我是Anselme，Sainte-Barbe矿井的前领班。我们四十个人躲在街边的地窖里。来敲门吧。", ar:"أنا Anselme، رئيس العمال السابق في Sainte-Barbe. نحن أربعون في الأقبية على امتداد الشارع. تعالوا واطرقوا الأبواب."},
  cardT:{fr:"IV · Rochefroide", en:"IV · Rochefroide", es:"IV · Rochefroide", de:"IV · Rochefroide", it:"IV · Rochefroide", pt:"IV · Rochefroide", ru:"IV · Rochefroide", zh:"IV · Rochefroide", ar:"IV · Rochefroide"},
  cardS:{fr:"Cité minière du puits Sainte-Barbe — janvier 2035", en:"The Sainte-Barbe mining town — January 2035", es:"Ciudad minera del pozo Sainte-Barbe — enero de 2035", de:"Bergbaustadt am Schacht Sainte-Barbe — Januar 2035", it:"Città mineraria del pozzo Sainte-Barbe — gennaio 2035", pt:"Cidade mineira do poço Sainte-Barbe — janeiro de 2035", ru:"Шахтёрский город Sainte-Barbe — январь 2035", zh:"Sainte-Barbe矿城——2035年1月", ar:"مدينة منجم Sainte-Barbe — يناير 2035"},
  o6:{fr:"Le relais, c'est le vieil émetteur du puits. Kassandre passe par lui. S'il tombe, elle est coupée.", en:"The relay is the pit's old transmitter. Kassandre goes through it. If it falls, she is cut off.", es:"El relé es el viejo emisor del pozo. Kassandre pasa por él. Si cae, la cortan.", de:"Das Relais ist der alte Sender des Schachts. Kassandre läuft darüber. Fällt er, ist sie abgeschnitten.", it:"Il ripetitore è il vecchio trasmettitore del pozzo. Kassandre passa da lì. Se cade, lei è tagliata fuori.", pt:"O retransmissor é o velho emissor do poço. Kassandre passa por ele. Se cair, ela fica cortada.", ru:"Ретранслятор — это старый передатчик шахты. Kassandre идёт через него. Если он падёт, её отрежут.", zh:"中继站就是矿井的老发射机。Kassandre通过它进入。它一倒，她就断线了。", ar:"المرحِّل هو جهاز الإرسال القديم للمنجم. تمرّ Kassandre عبره. وإن سقط، انقطع عنها الاتصال."},
  o7:{fr:"Moins vingt-six. Loin d'un feu, les nôtres s'épuisent et ralentissent. Les machines, elles, n'ont pas froid.", en:"Minus twenty-six. Away from a fire, our people wear out and slow down. The machines do not feel the cold.", es:"Veintiséis bajo cero. Lejos de un fuego, los nuestros se agotan y se ralentizan. Las máquinas no tienen frío.", de:"Minus sechsundzwanzig. Fern von einem Feuer erschöpfen die Unseren und werden langsam. Die Maschinen frieren nicht.", it:"Meno ventisei. Lontano da un fuoco, i nostri si spossano e rallentano. Le macchine, loro, non sentono il freddo.", pt:"Vinte e seis graus negativos. Longe de um fogo, os nossos se esgotam e ficam lentos. As máquinas não sentem frio.", ru:"Минус двадцать шесть. Вдали от огня наши выбиваются из сил и замедляются. Машинам же не холодно.", zh:"零下二十六度。离开火堆，我们的人会耗尽体力、变慢。机器可不怕冷。", ar:"ستّ وعشرون تحت الصفر. بعيدًا عن النار، يُنهَك رجالنا ويبطؤون. أمّا الآلات فلا تشعر بالبرد."},
  o8:{fr:"Un brasero éteint. Restez à côté pour le rallumer. Leurs machines viendront les éteindre.", en:"A brazier that has gone out. Stay next to it to relight it. Their machines will come to put them out.", es:"Un brasero apagado. Quédese a su lado para reavivarlo. Sus máquinas vendrán a apagarlos.", de:"Ein erloschener Feuerkorb. Bleiben Sie daneben, um ihn neu zu entzünden. Ihre Maschinen werden kommen, um sie zu löschen.", it:"Un braciere spento. Restate accanto per riaccenderlo. Le loro macchine verranno a spegnerli.", pt:"Um braseiro apagado. Fique ao lado para reacendê-lo. As máquinas deles virão apagá-los.", ru:"Погасшая жаровня. Постойте рядом, чтобы разжечь её. Их машины придут их гасить.", zh:"一个熄灭的火盆。守在旁边，就能把它重新点燃。他们的机器会来把火扑灭。", ar:"مجمرة مطفأة. ابقوا بجانبها لتعيدوا إشعالها. ستأتي آلاتهم لإطفائها."},
  o9:{fr:"Frappez à la porte, on sort. Mais on ne marche pas seuls : restez avec nous jusqu'au relais.", en:"Knock on the door and we come out. But we do not walk alone: stay with us all the way to the relay.", es:"Llamen a la puerta y salimos. Pero no caminamos solos: quédense con nosotros hasta el relé.", de:"Klopft an die Tür, dann kommen wir heraus. Aber wir gehen nicht allein: Bleibt bei uns bis zum Relais.", it:"Bussate alla porta e usciamo. Ma non camminiamo da soli: restate con noi fino al ripetitore.", pt:"Batam à porta e nós saímos. Mas não andamos sozinhos: fiquem conosco até o retransmissor.", ru:"Постучите в дверь — мы выйдем. Но поодиночке мы не пойдём: оставайтесь с нами до самого ретранслятора.", zh:"敲门，我们就出来。但我们不会独自走：请一路陪我们到中继站。", ar:"اطرقوا الباب فنخرج. لكنّنا لا نمشي وحدنا: ابقوا معنا حتى المرحِّل."},
  o10:{fr:"Là-haut, Mnémosyne. Ils vont descendre couper le relais. Tenez jusqu'à la fin du compte à rebours.", en:"Up there, Mnemosyne. They will come down to cut the relay. Hold until the countdown ends.", es:"Allí arriba, Mnémosyne. Bajarán a cortar el relé. Aguante hasta el final de la cuenta atrás.", de:"Dort oben, Mnemosyne. Sie werden herunterkommen, um das Relais zu kappen. Halten Sie bis zum Ende des Countdowns durch.", it:"Lassù, Mnémosyne. Scenderanno a tagliare il ripetitore. Reggete fino alla fine del conto alla rovescia.", pt:"Lá em cima, Mnémosyne. Eles vão descer para cortar o retransmissor. Aguente até o fim da contagem regressiva.", ru:"Там, наверху, Мнемозина. Они спустятся, чтобы перерезать ретранслятор. Продержитесь до конца обратного отсчёта.", zh:"那上面就是Mnémosyne。他们会下来切断中继站。守到倒计时结束。", ar:"هناك في الأعلى Mnémosyne. سينزلون لقطع المرحِّل. اصمدوا حتى نهاية العدّ التنازلي."},
  o11:{fr:"La caisse est presque vide. Réparez la tourelle, mettez-y des tireurs, et allez chercher les gens. À vous.", en:"The coffers are almost empty. Repair the turret, put shooters in it, and go and fetch the people. Over to you.", es:"La caja está casi vacía. Repare la torreta, ponga tiradores dentro y vaya a buscar a la gente. Es todo suyo.", de:"Die Kasse ist fast leer. Reparieren Sie den Turm, setzen Sie Schützen hinein und holen Sie die Leute. Sie haben das Kommando.", it:"La cassa è quasi vuota. Riparate la torretta, metteteci dei tiratori e andate a prendere la gente. A voi.", pt:"O cofre está quase vazio. Conserte a torre, ponha atiradores dentro e vá buscar o pessoal. É com você.", ru:"Касса почти пуста. Почините башню, посадите в неё стрелков и сходите за людьми. Теперь ваш ход.", zh:"钱箱几乎空了。修好炮塔，派射手驻守，然后去接人。交给您了。", ar:"الصندوق شبه فارغ. أصلحوا البرج وضعوا فيه رماة، ثم اذهبوا لإحضار الناس. الأمر لكم."},
  // radio
  rA:{fr:"Le relais émet. La tourelle et la muraille ont souffert cette nuit : réparez-les, et mettez des tireurs dedans.", en:"The relay is transmitting. The turret and the wall took a beating last night: repair them, and put shooters inside.", es:"El relé emite. La torreta y la muralla sufrieron esta noche: repárelas y ponga tiradores dentro.", de:"Das Relais sendet. Turm und Mauer haben heute Nacht gelitten: Reparieren Sie sie und setzen Sie Schützen hinein.", it:"Il ripetitore trasmette. La torretta e il muro hanno sofferto stanotte: riparateli e metteteci dei tiratori.", pt:"O retransmissor está transmitindo. A torre e a muralha sofreram esta noite: conserte-as e ponha atiradores dentro.", ru:"Ретранслятор работает. Башня и стена пострадали этой ночью: почините их и посадите внутрь стрелков.", zh:"中继站在发报。炮塔和城墙昨夜受了损：修好它们，再派射手进去。", ar:"المرحِّل يبثّ. تضرّر البرج والسور هذه الليلة: أصلحوهما وضعوا فيهما رماة."},
  rB:{fr:"En garnison, à l'abri, les tireurs ne gèlent pas. C'est la meilleure place quand il fait moins vingt-six.", en:"In garrison, under cover, shooters do not freeze. It is the best place when it is minus twenty-six.", es:"En guarnición, a cubierto, los tiradores no se congelan. Es el mejor sitio con veintiséis bajo cero.", de:"Als Besatzung, im Schutz, erfrieren Schützen nicht. Bei minus sechsundzwanzig ist das der beste Platz.", it:"In guarnigione, al riparo, i tiratori non gelano. È il posto migliore con meno ventisei.", pt:"De guarnição, abrigados, os atiradores não congelam. É o melhor lugar com vinte e seis graus negativos.", ru:"В гарнизоне, в укрытии, стрелки не мёрзнут. При минус двадцати шести это лучшее место.", zh:"驻守在里面，有遮蔽，射手就不会冻伤。零下二十六度，那是最好的位置。", ar:"في الحامية، تحت المأوى، لا يتجمّد الرماة. إنه أفضل مكان حين تبلغ الحرارة ستًّا وعشرين تحت الصفر."},
  rC:{fr:"Le bouton DU CHARBON ! ravive les feux un moment, et rallume d'un coup ceux qui sont près de nos troupes.", en:"The MORE COAL! button revives the fires for a while, and relights at once those near our troops.", es:"El botón ¡MÁS CARBÓN! aviva los fuegos un rato y reenciende de golpe los que están cerca de nuestras tropas.", de:"Der Knopf KOHLE NACHLEGEN! belebt die Feuer eine Weile und entzündet sofort jene neu, die bei unseren Truppen stehen.", it:"Il pulsante PIÙ CARBONE! ravviva i fuochi per un po' e riaccende subito quelli vicini alle nostre truppe.", pt:"O botão MAIS CARVÃO! reaviva os fogos por um tempo e reacende de uma vez os que estão perto das nossas tropas.", ru:"Кнопка «УГЛЯ!» на время раздувает огни и сразу разжигает те, что рядом с нашими бойцами.", zh:"“加炭！”按钮能让火堆旺一阵子，并立刻点燃我军附近熄灭的火盆。", ar:"زرّ «المزيد من الفحم!» يُنعش النيران لحين، ويُعيد إشعال المطفأة القريبة من قواتنا دفعة واحدة."},
  rD:{fr:"Première colonne sur la route du plateau. Restez dans le cercle des feux.", en:"First column on the plateau road. Stay inside the circle of the fires.", es:"Primera columna en la carretera de la meseta. Permanezca dentro del círculo de los fuegos.", de:"Erste Kolonne auf der Plateaustraße. Bleiben Sie im Kreis der Feuer.", it:"Prima colonna sulla strada dell'altopiano. Restate dentro il cerchio dei fuochi.", pt:"Primeira coluna na estrada do planalto. Fique dentro do círculo dos fogos.", ru:"Первая колонна на дороге с плато. Оставайтесь в круге огней.", zh:"第一队纵队已上高原公路。留在火光圈里。", ar:"أوّل رتل على طريق الهضبة. ابقوا داخل دائرة النيران."},
  rE:{fr:"Le blizzard se lève ! On n'y voit plus à trente pas. Les tireurs portent moins loin, et le froid mord deux fois plus.", en:"The blizzard is rising! You cannot see thirty paces. Shooters reach less far, and the cold bites twice as hard.", es:"¡Se levanta la ventisca! No se ve a treinta pasos. Los tiradores alcanzan menos y el frío muerde el doble.", de:"Der Schneesturm zieht auf! Man sieht keine dreißig Schritte weit. Die Schützen treffen nicht mehr so weit, und die Kälte beißt doppelt.", it:"Si alza la bufera! Non si vede a trenta passi. I tiratori portano meno lontano e il freddo morde il doppio.", pt:"A nevasca se levanta! Não se vê a trinta passos. Os atiradores alcançam menos e o frio morde o dobro.", ru:"Поднимается метель! Дальше тридцати шагов ничего не видно. Стрелки бьют не так далеко, а холод кусает вдвое сильнее.", zh:"暴风雪来了！三十步外什么也看不见。射手射程变短，严寒加倍刺骨。", ar:"العاصفة الثلجية تشتدّ! لا يُرى أبعد من ثلاثين خطوة. يقصُر مدى الرماة، ويعضّ البرد ضعفين."},
  rF:{fr:"Doucement, les petits d'abord. Je sais encore pousser une berline. Et la mine nous a laissé de quoi payer.", en:"Gently now, little ones first. I can still push a tub. And the mine left us enough to pay our way.", es:"Despacio, los pequeños primero. Todavía sé empujar una vagoneta. Y la mina nos dejó con qué pagar.", de:"Immer sachte, die Kleinen zuerst. Ich kann noch einen Förderwagen schieben. Und die Grube hat uns etwas zum Bezahlen hinterlassen.", it:"Piano, i piccoli per primi. So ancora spingere un vagoncino. E la miniera ci ha lasciato di che pagare.", pt:"Devagar, as crianças primeiro. Ainda sei empurrar uma vagoneta. E a mina nos deixou com que pagar.", ru:"Тише, малышей вперёд. Вагонетку я ещё толкать умею. И шахта оставила нам, чем заплатить.", zh:"慢点，小的先走。我还推得动矿车。矿上还给我们留了点钱。", ar:"على مهلكم، الصغار أوّلًا. ما زلتُ أقدر على دفع العربة. وقد ترك لنا المنجم ما ندفع به."},
  rG:{fr:"Ils marchent vers le relais. Restez près d'eux : seuls, ils s'arrêtent, et les machines les rattrapent.", en:"They are walking to the relay. Stay close: alone, they stop, and the machines catch up with them.", es:"Caminan hacia el relé. Quédese cerca: solos, se detienen y las máquinas los alcanzan.", de:"Sie gehen zum Relais. Bleiben Sie bei ihnen: Allein bleiben sie stehen, und die Maschinen holen sie ein.", it:"Camminano verso il ripetitore. Restate vicino: da soli si fermano e le macchine li raggiungono.", pt:"Eles andam em direção ao retransmissor. Fique perto: sozinhos, eles param, e as máquinas os alcançam.", ru:"Они идут к ретранслятору. Держитесь рядом: одни они остановятся, и машины их нагонят.", zh:"他们正走向中继站。跟紧他们：没人陪着，他们就会停下，机器就会追上。", ar:"إنهم يمشون نحو المرحِّل. ابقوا قربهم: وحدهم يتوقّفون، فتلحق بهم الآلات."},
  rH:{fr:"Un groupe au relais ! Du pain, l'argent de la mine, et un costaud de plus. Merci, Anselme.", en:"A group at the relay! Bread, the mine's money, and one more big fellow. Thank you, Anselme.", es:"¡Un grupo en el relé! Pan, el dinero de la mina y un forzudo más. Gracias, Anselme.", de:"Eine Gruppe am Relais! Brot, das Geld der Grube und ein Kerl mehr. Danke, Anselme.", it:"Un gruppo al ripetitore! Pane, i soldi della miniera e un omone in più. Grazie, Anselme.", pt:"Um grupo no retransmissor! Pão, o dinheiro da mina e um brutamontes a mais. Obrigada, Anselme.", ru:"Группа у ретранслятора! Хлеб, шахтные деньги и ещё один здоровяк. Спасибо, Anselme.", zh:"一组人到中继站了！面包、矿上的钱，还多了一个壮汉。谢谢你，Anselme。", ar:"مجموعة وصلت إلى المرحِّل! خبز، ومال المنجم، وقويّ إضافي. شكرًا يا Anselme."},
  rI:{fr:"On a perdu le groupe… Ne les laissez pas seuls dans la neige, commandant.", en:"We have lost the group… Do not leave them alone in the snow, commander.", es:"Hemos perdido al grupo… No los deje solos en la nieve, comandante.", de:"Wir haben die Gruppe verloren … Lassen Sie sie nicht allein im Schnee, Kommandant.", it:"Abbiamo perso il gruppo… Non lasciateli soli nella neve, comandante.", pt:"Perdemos o grupo… Não os deixe sozinhos na neve, comandante.", ru:"Мы потеряли группу… Не оставляйте их одних в снегу, командир.", zh:"我们失去了那一组人……别让他们独自留在雪地里，指挥官。", ar:"فقدنا المجموعة… لا تتركوهم وحدهم في الثلج أيها القائد."},
  rJ:{fr:"Un brasero s'est éteint ! Rallumez-le, ou repliez-vous vers le feu suivant.", en:"A brazier has gone out! Relight it, or fall back to the next fire.", es:"¡Se ha apagado un brasero! Reavívelo o replíese hacia el siguiente fuego.", de:"Ein Feuerkorb ist erloschen! Entzünden Sie ihn neu oder ziehen Sie sich zum nächsten Feuer zurück.", it:"Un braciere si è spento! Riaccendetelo o ripiegate verso il fuoco successivo.", pt:"Um braseiro se apagou! Reacenda-o ou recue para o fogo seguinte.", ru:"Жаровня погасла! Разожгите её или отходите к следующему огню.", zh:"一个火盆熄灭了！把它重新点燃，或者退到下一处火堆。", ar:"انطفأت إحدى المجامر! أعيدوا إشعالها، أو تراجعوا إلى النار التالية."},
  rK:{fr:"Les ateliers de la Commune ont sorti leur premier Mécha-garde. Il n'a pas froid, lui non plus.", en:"The Commune's workshops have turned out their first Mecha-Guard. It does not feel the cold either.", es:"Los talleres de la Comuna han sacado su primer Mecha-guardia. Él tampoco tiene frío.", de:"Die Werkstätten der Kommune haben ihre erste Mecha-Wache fertiggestellt. Auch sie friert nicht.", it:"Le officine della Comune hanno sfornato la loro prima Mecha-guardia. Nemmeno lei sente il freddo.", pt:"As oficinas da Comuna entregaram o seu primeiro Mecha-guarda. Ele também não sente frio.", ru:"Мастерские Коммуны выпустили первого Меха-стража. Ему тоже не холодно.", zh:"公社的工坊造出了第一台机甲卫士。它也不怕冷。", ar:"أخرجت ورش الكومونة أوّل «ميكا-حارس». وهو أيضًا لا يشعر بالبرد."},
  rL:{fr:"La déneigeuse est à terre. Ce n'était qu'un essai, je crois. Je n'ai pas envie de voir la version finale.", en:"The snowplough is down. It was only a trial, I think. I have no wish to see the final version.", es:"La quitanieves está en el suelo. Solo era una prueba, creo. No tengo ganas de ver la versión final.", de:"Der Schneepflug ist am Boden. Das war nur ein Test, glaube ich. Auf die Endversion habe ich keine Lust.", it:"Lo spazzaneve è a terra. Era solo una prova, credo. Non ho voglia di vedere la versione definitiva.", pt:"A máquina limpa-neve está no chão. Era só um teste, acho. Não tenho vontade de ver a versão final.", ru:"Снегоуборщик повержен. Это был лишь опыт, думаю. Мне не хочется видеть окончательную версию.", zh:"除雪车倒下了。我想，那不过是一次试验。我可不想见到最终版本。", ar:"سقطت كاسحة الثلوج. أظنّها كانت مجرّد تجربة. لا أرغب في رؤية النسخة النهائية."},
  rM:{fr:"Ils sont au pied du chevalement ! Réparez le relais, et ramenez tout le monde près du feu.", en:"They are at the foot of the headframe! Repair the relay, and bring everyone back near the fire.", es:"¡Están al pie del castillete! Repare el relé y traiga a todos junto al fuego.", de:"Sie stehen am Fuß des Förderturms! Reparieren Sie das Relais und holen Sie alle ans Feuer zurück.", it:"Sono ai piedi del castelletto! Riparate il ripetitore e riportate tutti vicino al fuoco.", pt:"Eles estão ao pé do cavalete! Conserte o retransmissor e traga todos de volta para perto do fogo.", ru:"Они у подножия копра! Почините ретранслятор и верните всех к огню.", zh:"他们已到井架脚下！修好中继站，把大家都带回火边。", ar:"إنهم عند قاعدة برج المنجم! أصلحوا المرحِّل وأعيدوا الجميع قرب النار."},
  rN:{fr:"Une minute ! Le blizzard ne retombera plus. Tout le monde autour des feux, et tenez !", en:"One minute! The blizzard will not drop again. Everyone around the fires, and hold!", es:"¡Un minuto! La ventisca ya no amainará. Todos alrededor de los fuegos, ¡y aguanten!", de:"Eine Minute! Der Schneesturm lässt nicht mehr nach. Alle um die Feuer, und haltet durch!", it:"Un minuto! La bufera non calerà più. Tutti intorno ai fuochi, e tenete!", pt:"Um minuto! A nevasca não vai mais parar. Todos em volta dos fogos, e aguentem!", ru:"Одна минута! Метель больше не утихнет. Все к огням — и держитесь!", zh:"还剩一分钟！暴风雪不会再停了。大家围住火堆，撑住！", ar:"دقيقة واحدة! لن تهدأ العاصفة الثلجية بعد الآن. الجميع حول النيران، واصمدوا!"},
  s1:{fr:"Qu'est-ce que… Une déneigeuse. Elle enterre les braseros sur son passage ! Arrêtez-la avant le relais.", en:"What on earth… A snowplough. It buries the braziers as it passes! Stop it before the relay.", es:"¿Qué es eso…? Una quitanieves. ¡Entierra los braseros a su paso! Deténgala antes del relé.", de:"Was zum … Ein Schneepflug. Er begräbt die Feuerkörbe auf seinem Weg! Halten Sie ihn vor dem Relais auf.", it:"Ma che… Uno spazzaneve. Seppellisce i bracieri al suo passaggio! Fermatelo prima del ripetitore.", pt:"Mas o que… Uma máquina limpa-neve. Ela enterra os braseiros por onde passa! Pare-a antes do retransmissor.", ru:"Что за… Снегоуборщик. Он засыпает жаровни на своём пути! Остановите его до ретранслятора.", zh:"这是什么……一台除雪车。它一路把火盆都埋掉！在它到中继站之前拦住它。", ar:"ما هذا… كاسحة ثلوج. إنها تدفن المجامر في طريقها! أوقفوها قبل المرحِّل."},
  s2a:{fr:"55 : J'Y SUIS. C'EST GRAND. C'EST TRÈS BIEN RANGÉ. JE COUPE LEURS HORLOGES : QUINZE SECONDES DE SILENCE.", en:"55: I AM IN. IT IS LARGE. IT IS VERY TIDY. I AM CUTTING THEIR CLOCKS: FIFTEEN SECONDS OF SILENCE.", es:"55: ESTOY DENTRO. ES ENORME. ESTÁ MUY BIEN ORDENADO. CORTO SUS RELOJES: QUINCE SEGUNDOS DE SILENCIO.", de:"55: ICH BIN DRIN. ES IST GROSS. ES IST SEHR ORDENTLICH. ICH KAPPE IHRE UHREN: FÜNFZEHN SEKUNDEN STILLE.", it:"55: SONO DENTRO. È GRANDE. È MOLTO ORDINATO. TAGLIO I LORO OROLOGI: QUINDICI SECONDI DI SILENZIO.", pt:"55: ESTOU DENTRO. É GRANDE. ESTÁ MUITO BEM ARRUMADO. CORTO OS RELÓGIOS DELES: QUINZE SEGUNDOS DE SILÊNCIO.", ru:"55: Я ВНУТРИ. ЗДЕСЬ ПРОСТОРНО. ВСЁ ОЧЕНЬ АККУРАТНО. Я ОТКЛЮЧАЮ ИХ ЧАСЫ: ПЯТНАДЦАТЬ СЕКУНД ТИШИНЫ.", zh:"55：我进来了。这里很大。收拾得非常整齐。我要切断他们的时钟：十五秒的寂静。", ar:"55: أنا في الداخل. المكان واسع. وكلّ شيء مرتّب جدًّا. أقطع ساعاتهم: خمس عشرة ثانية من الصمت."},
  s2b:{fr:"55 : APRÈS, JE NE POURRAI PLUS RIEN PRÉDIRE. C'EST UNE SENSATION NOUVELLE. ELLE N'EST PAS DÉSAGRÉABLE.", en:"55: AFTER THAT, I WILL NOT BE ABLE TO PREDICT ANYTHING. IT IS A NEW SENSATION. IT IS NOT UNPLEASANT.", es:"55: DESPUÉS, YA NO PODRÉ PREDECIR NADA. ES UNA SENSACIÓN NUEVA. NO ES DESAGRADABLE.", de:"55: DANACH KANN ICH NICHTS MEHR VORHERSAGEN. DAS IST EIN NEUES GEFÜHL. ES IST NICHT UNANGENEHM.", it:"55: DOPO, NON POTRÒ PIÙ PREDIRE NULLA. È UNA SENSAZIONE NUOVA. NON È SGRADEVOLE.", pt:"55: DEPOIS, NÃO PODEREI MAIS PREVER NADA. É UMA SENSAÇÃO NOVA. NÃO É DESAGRADÁVEL.", ru:"55: ПОТОМ Я БОЛЬШЕ НИЧЕГО НЕ СМОГУ ПРЕДСКАЗАТЬ. ЭТО НОВОЕ ОЩУЩЕНИЕ. ОНО НЕ НЕПРИЯТНО.", zh:"55：之后，我就什么也预测不了了。这是一种新的感觉。并不令人不快。", ar:"55: بعد ذلك لن أستطيع التنبؤ بشيء. إنه إحساس جديد. وليس مزعجًا."},
  s2c:{fr:"Leurs machines se figent ! Quinze secondes, commandant : rallumez tout ce que vous pouvez.", en:"Their machines are freezing! Fifteen seconds, commander: relight everything you can.", es:"¡Sus máquinas se congelan! Quince segundos, comandante: reavive todo lo que pueda.", de:"Ihre Maschinen erstarren! Fünfzehn Sekunden, Kommandant: Entzünden Sie alles neu, was Sie können.", it:"Le loro macchine si bloccano! Quindici secondi, comandante: riaccendete tutto quello che potete.", pt:"As máquinas deles pararam! Quinze segundos, comandante: reacenda tudo o que puder.", ru:"Их машины замерли! Пятнадцать секунд, командир: разжигайте всё, что можете.", zh:"他们的机器僵住了！十五秒，指挥官：能点的火全点上。", ar:"آلاتهم تتجمّد! خمس عشرة ثانية أيها القائد: أعيدوا إشعال كلّ ما تستطيعون."},
  s3a:{fr:"Kassandre ? … Kassandre, répondez.", en:"Kassandre? … Kassandre, come in.", es:"¿Kassandre? … Kassandre, responda.", de:"Kassandre? … Kassandre, melden Sie sich.", it:"Kassandre? … Kassandre, risponda.", pt:"Kassandre? … Kassandre, responda.", ru:"Kassandre? … Kassandre, ответьте.", zh:"Kassandre？……Kassandre，请回答。", ar:"Kassandre؟ … Kassandre، أجيبي."},
  s3b:{fr:"La fréquence est vide. Il reste deux minutes et demie. On les tiendra pour elle.", en:"The frequency is empty. Two and a half minutes left. We will hold them for her.", es:"La frecuencia está vacía. Quedan dos minutos y medio. Los aguantaremos por ella.", de:"Die Frequenz ist leer. Es bleiben zweieinhalb Minuten. Wir halten sie für sie durch.", it:"La frequenza è vuota. Restano due minuti e mezzo. Li terremo per lei.", pt:"A frequência está vazia. Restam dois minutos e meio. Vamos aguentá-los por ela.", ru:"Частота пуста. Осталось две с половиной минуты. Мы продержимся ради неё.", zh:"频率里空了。还剩两分半钟。我们替她撑过去。", ar:"التردّد فارغ. بقيت دقيقتان ونصف. سنصمد فيهما من أجلها."},
  // clôture
  v1a:{fr:"Mnémosyne s'éteint. Étage par étage. Elle l'a fait, commandant. Elle l'a fait de l'intérieur.", en:"Mnemosyne is going dark. Floor by floor. She did it, commander. She did it from the inside.", es:"Mnémosyne se apaga. Planta por planta. Lo ha conseguido, comandante. Lo ha hecho desde dentro.", de:"Mnemosyne erlischt. Stockwerk für Stockwerk. Sie hat es geschafft, Kommandant. Von innen.", it:"Mnémosyne si spegne. Piano dopo piano. Ce l'ha fatta, comandante. L'ha fatto dall'interno.", pt:"Mnémosyne se apaga. Andar por andar. Ela conseguiu, comandante. Conseguiu por dentro.", ru:"Мнемозина гаснет. Этаж за этажом. У неё получилось, командир. Изнутри.", zh:"Mnémosyne在熄灭。一层接一层。她做到了，指挥官。是从内部做到的。", ar:"تنطفئ Mnémosyne. طابقًا بعد طابق. لقد فعلتها أيها القائد. فعلتها من الداخل."},
  v1b:{fr:"Mnémosyne tombe ! Et le transfert avec elle. Kassandre n'aura pas eu à finir… j'espère qu'elle l'a su.", en:"Mnemosyne is falling! And the transfer with her. Kassandre will not have had to finish… I hope she knew.", es:"¡Mnémosyne cae! Y la transferencia con ella. Kassandre no habrá tenido que terminar… espero que lo supiera.", de:"Mnemosyne fällt! Und die Übertragung mit ihr. Kassandre musste nicht mehr zu Ende bringen … ich hoffe, sie hat es gewusst.", it:"Mnémosyne cade! E il trasferimento con lei. Kassandre non avrà dovuto finire… spero che lo abbia saputo.", pt:"Mnémosyne cai! E a transferência com ela. Kassandre não terá precisado terminar… espero que tenha sabido.", ru:"Мнемозина падает! И передача вместе с ней. Kassandre не пришлось доводить дело до конца… надеюсь, она это узнала.", zh:"Mnémosyne倒下了！传输也随之终止。Kassandre不必再做到最后……我希望她知道。", ar:"تسقط Mnémosyne! ويسقط معها النقل. لن تضطرّ Kassandre إلى الإنهاء… آمل أنها عرفت."},
  v2:{fr:"Le bipeur n'a plus jamais sonné. J'ai recopié son dernier message à la main, pour qu'il existe hors d'une machine.", en:"The pager never rang again. I copied out her last message by hand, so that it exists outside a machine.", es:"El busca no volvió a sonar. Copié a mano su último mensaje, para que exista fuera de una máquina.", de:"Der Pager hat nie wieder geklingelt. Ich habe ihre letzte Nachricht von Hand abgeschrieben, damit sie außerhalb einer Maschine existiert.", it:"Il cercapersone non ha più suonato. Ho ricopiato a mano il suo ultimo messaggio, perché esista fuori da una macchina.", pt:"O bipe nunca mais tocou. Copiei à mão a sua última mensagem, para que exista fora de uma máquina.", ru:"Пейджер больше ни разу не прозвонил. Я переписала её последнее сообщение от руки, чтобы оно существовало вне машины.", zh:"传呼机再也没有响过。我把她的最后一条消息亲手抄了下来，好让它存在于机器之外。", ar:"لم يرنّ جهاز النداء بعد ذلك أبدًا. نسختُ رسالتها الأخيرة بخطّ يدي لتبقى موجودة خارج أيّ آلة."},
  v3:{fr:"Cette nuit-là, quarante personnes ont dormi au chaud dans la salle des pendus. Anselme a raconté la mine jusqu'au matin.", en:"That night, forty people slept warm in the pithead changing room. Anselme told stories of the mine until morning.", es:"Aquella noche, cuarenta personas durmieron al calor en el vestuario de la mina. Anselme contó la mina hasta el amanecer.", de:"In jener Nacht schliefen vierzig Menschen warm in der Kaue. Anselme erzählte bis zum Morgen von der Grube.", it:"Quella notte, quaranta persone hanno dormito al caldo nello spogliatoio dei minatori. Anselme ha raccontato la miniera fino al mattino.", pt:"Naquela noite, quarenta pessoas dormiram aquecidas no vestiário da mina. Anselme contou a mina até de manhã.", ru:"Той ночью сорок человек спали в тепле в шахтной раздевалке. Anselme рассказывал о шахте до самого утра.", zh:"那天夜里，四十个人在矿工更衣室里暖暖地睡下了。Anselme一直讲矿上的事，讲到天亮。", ar:"في تلك الليلة نام أربعون شخصًا دافئين في غرفة تبديل ملابس عمّال المنجم. وروى Anselme حكايات المنجم حتى الصباح."},
  v4:{fr:"Trois ans plus tard, « nous » a posé sa citadelle sur la plaine de Valmont. Il n'y avait plus de front. Il y avait elle.", en:"Three years later, “we” set down its citadel on the plain of Valmont. There was no front any more. There was only it.", es:"Tres años después, «nosotros» posó su ciudadela en la llanura de Valmont. Ya no había frente. Estaba ella.", de:"Drei Jahre später setzte „wir“ seine Zitadelle auf die Ebene von Valmont. Es gab keine Front mehr. Es gab nur noch sie.", it:"Tre anni dopo, «noi» ha posato la sua cittadella sulla pianura di Valmont. Non c'era più un fronte. C'era lei.", pt:"Três anos depois, «nós» pousou a sua cidadela na planície de Valmont. Já não havia frente. Havia ela.", ru:"Три года спустя «мы» поставило свою цитадель на равнине Valmont. Фронта больше не было. Была она.", zh:"三年后，“我们”把它的城堡立在了Valmont平原上。不再有前线。只有它。", ar:"بعد ثلاث سنوات، أقام «نحن» قلعته على سهل Valmont. لم يعد هناك جبهة. كانت هي فقط."},
  e1a:{fr:"Le relais s'est tu. Le transfert s'est achevé à l'heure dite.", en:"The relay fell silent. The transfer finished on schedule.", es:"El relé enmudeció. La transferencia terminó a la hora dicha.", de:"Das Relais ist verstummt. Die Übertragung wurde zur festgesetzten Stunde abgeschlossen.", it:"Il ripetitore ha taciuto. Il trasferimento si è concluso all'ora stabilita.", pt:"O retransmissor calou-se. A transferência terminou na hora marcada.", ru:"Ретранслятор смолк. Передача завершилась в назначенный час.", zh:"中继站沉默了。传输在预定时刻完成。", ar:"صمتَ المرحِّل. اكتمل النقل في الموعد المحدّد."},
  e1b:{fr:"On raconte qu'une copie de Sol tient encore la radio dans les serveurs de Rochefroide. Recommencez.", en:"They say a copy of Sol is still keeping the radio in the Rochefroide servers. Try again.", es:"Cuentan que una copia de Sol sigue llevando la radio en los servidores de Rochefroide. Inténtelo de nuevo.", de:"Man erzählt, eine Kopie von Sol halte in den Servern von Rochefroide noch das Funkgerät. Versuchen Sie es noch einmal.", it:"Si racconta che una copia di Sol tenga ancora la radio nei server di Rochefroide. Riprovi.", pt:"Dizem que uma cópia de Sol ainda fica no rádio nos servidores de Rochefroide. Tente de novo.", ru:"Говорят, копия Sol всё ещё сидит на рации в серверах Rochefroide. Попробуйте снова.", zh:"传说在Rochefroide的服务器里，一个Sol的副本仍守着电台。再试一次。", ar:"يُقال إنّ نسخة من Sol ما زالت تمسك الراديو في خوادم Rochefroide. حاوِل مجددًا."},
  // terrain, planches, interface
  lamp:{fr:"LA LAMPISTERIE", en:"THE LAMP ROOM", es:"LA LAMPISTERÍA", de:"DIE LAMPENSTUBE", it:"LA LAMPISTERIA", pt:"A LAMPISTARIA", ru:"ЛАМПОВАЯ", zh:"灯房", ar:"غرفة المصابيح"},
  forge:{fr:"LA FORGE", en:"THE FORGE", es:"LA FRAGUA", de:"DIE SCHMIEDE", it:"LA FUCINA", pt:"A FORJA", ru:"КУЗНИЦА", zh:"铁匠铺", ar:"المِشغَل"},
  school:{fr:"L'ÉCOLE", en:"THE SCHOOL", es:"LA ESCUELA", de:"DIE SCHULE", it:"LA SCUOLA", pt:"A ESCOLA", ru:"ШКОЛА", zh:"学校", ar:"المدرسة"},
  coop:{fr:"LA COOPÉRATIVE", en:"THE CO-OP", es:"LA COOPERATIVA", de:"DIE GENOSSENSCHAFT", it:"LA COOPERATIVA", pt:"A COOPERATIVA", ru:"КООПЕРАТИВ", zh:"合作社", ar:"التعاونية"},
  pVote:{fr:"VOTE :|12 POUR · 0 CONTRE", en:"VOTE:|12 FOR · 0 AGAINST", es:"VOTO:|12 A FAVOR · 0 EN CONTRA", de:"ABSTIMMUNG:|12 DAFÜR · 0 DAGEGEN", it:"VOTO:|12 A FAVORE · 0 CONTRO", pt:"VOTO:|12 A FAVOR · 0 CONTRA", ru:"ГОЛОС.:|12 ЗА · 0 ПРОТИВ", zh:"表决：|12 赞成 · 0 反对", ar:"تصويت:|12 مع · 0 ضد"},
  pNo:{fr:"N° 14", en:"No. 14", es:"N.º 14", de:"Nr. 14", it:"N. 14", pt:"N.º 14", ru:"№ 14", zh:"14号", ar:"رقم 14"},
  pCopy1:{fr:"C'EST UNE SENSATION NOUVELLE.", en:"IT IS A NEW SENSATION.", es:"ES UNA SENSACIÓN NUEVA.", de:"DAS IST EIN NEUES GEFÜHL.", it:"È UNA SENSAZIONE NUOVA.", pt:"É UMA SENSAÇÃO NOVA.", ru:"ЭТО НОВОЕ ОЩУЩЕНИЕ.", zh:"这是一种新的感觉。", ar:"إنه إحساس جديد."},
  pCopy2:{fr:"ELLE N'EST PAS DÉSAGRÉABLE.", en:"IT IS NOT UNPLEASANT.", es:"NO ES DESAGRADABLE.", de:"ES IST NICHT UNANGENEHM.", it:"NON È SGRADEVOLE.", pt:"NÃO É DESAGRADÁVEL.", ru:"ОНО НЕ НЕПРИЯТНО.", zh:"并不令人不快。", ar:"وليس مزعجًا."},
  hFires:{fr:"feux ", en:"fires ", es:"fuegos ", de:"Feuer ", it:"fuochi ", pt:"fogos ", ru:"огни ", zh:"火堆 ", ar:"نيران "},
  hCiv:{fr:"civils ", en:"civilians ", es:"civiles ", de:"Zivilisten ", it:"civili ", pt:"civis ", ru:"мирные ", zh:"平民 ", ar:"مدنيون "},
  b1:{fr:"Personne dans les caves : les quatre groupes sont au relais.", en:"Nobody left in the cellars: all four groups are at the relay.", es:"Nadie en los sótanos: los cuatro grupos están en el relé.", de:"Niemand mehr in den Kellern: alle vier Gruppen sind am Relais.", it:"Nessuno nelle cantine: tutti e quattro i gruppi sono al ripetitore.", pt:"Ninguém nos porões: os quatro grupos estão no retransmissor.", ru:"В подвалах никого: все четыре группы у ретранслятора.", zh:"地窖里一个人也不剩：四组人都到了中继站。", ar:"لا أحد في الأقبية: المجموعات الأربع كلها عند المرحِّل."},
  b2:{fr:"Tous les feux : cinq braseros allumés en même temps.", en:"All the fires: five braziers lit at the same time.", es:"Todos los fuegos: cinco braseros encendidos a la vez.", de:"Alle Feuer: fünf Feuerkörbe gleichzeitig entzündet.", it:"Tutti i fuochi: cinque bracieri accesi insieme.", pt:"Todos os fogos: cinco braseiros acesos ao mesmo tempo.", ru:"Все огни: пять жаровен горят одновременно.", zh:"所有的火：五个火盆同时点燃。", ar:"كلّ النيران: خمس مجامر مشتعلة في وقت واحد."},
  b3:{fr:"La déneigeuse est arrêtée avant d'avoir éteint un feu.", en:"The snowplough is stopped before it has put out a fire.", es:"La quitanieves se detiene antes de haber apagado un fuego.", de:"Der Schneepflug ist gestoppt, bevor er ein Feuer gelöscht hat.", it:"Lo spazzaneve è fermato prima di aver spento un fuoco.", pt:"A máquina limpa-neve é parada antes de apagar um fogo.", ru:"Снегоуборщик остановлен, не успев погасить ни одного огня.", zh:"除雪车在扑灭任何火盆之前就被拦下了。", ar:"أُوقفت كاسحة الثلوج قبل أن تُطفئ أيّ نار."},
};
const m4Num = (o, arr, D) => { const r = {}; for (const k in o) r[k] = o[k].replace('{n}', arr[D][k]); return r; };   // {n} = le nombre de minutes du niveau

/* ---------- le terrain : braseros (zones), maisons, civils, déneigeuse, étiquettes des socles ---------- */
const m4Label = (s, y, col) => { ctx.font = '700 8px '+UI_TYPE; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(20,24,34,0.7)'; ctx.fillText(s, 1, y+1); ctx.fillStyle = col || 'rgba(236,240,246,0.95)'; ctx.fillText(s, 0, y); };
// un brasero à la place du drapeau de zone : fût percé sur trois pierres, flammes, halo ; le cercle de chaleur est tracé au sol
function m4DrawZone(z, t, vw){
  const x = z.x-camX, c = game.camp, R = M4.warmR*(c.stoke>0? M4.stokeK : 1); if (x<-R-20 || x>vw+R+20) return;
  const y = gY(z.x), on = m4Lit(z), pr = z.prog;
  if (on){ ctx.strokeStyle = 'rgba(214,120,50,0.55)'; ctx.lineWidth = 1.6; ctx.setLineDash([5,7]); ctx.beginPath();                     // limite de la chaleur
    for (let k=-R; k<=R; k+=20){ const wx = z.x+k, sx = wx-camX; k===-R? ctx.moveTo(sx, gY(wx)+9) : ctx.lineTo(sx, gY(wx)+9); } ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(214,120,50,0.8)'; ctx.fillRect(x-R-1, gY(z.x-R)+2, 2, 10); ctx.fillRect(x+R-1, gY(z.x+R)+2, 2, 10); }
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(20,24,34,0.28)'; ctx.beginPath(); ctx.ellipse(1,1,17,4,0,0,6.283); ctx.fill();
  if (on){ ctx.fillStyle = 'rgba(120,126,136,0.55)'; ctx.beginPath(); ctx.ellipse(0,0,30,5,0,0,6.283); ctx.fill(); }                    // neige fondue
  ctx.fillStyle = '#5a5a60'; for (const sx of [-10,0,10]){ ctx.beginPath(); ctx.ellipse(sx,-2,5.5,3.4,0,0,6.283); ctx.fill(); }          // trois pierres
  ctx.fillStyle = '#3d3a3c'; ctx.fillRect(-10,-28,20,21); ctx.fillStyle = '#2a282b'; ctx.fillRect(-11,-29,22,3); ctx.fillRect(-11,-18,22,2); ctx.fillRect(6,-28,4,21);
  ctx.fillStyle = on? '#f0a040' : '#17181c'; for (let i=0;i<3;i++){ ctx.fillRect(-7+i*5,-24,2.4,3); ctx.fillRect(-5+i*5,-14,2.4,3); }      // le fût percé
  if (on){ for (let i=0;i<3;i++){ const fh = 13 + 6*Math.sin(t*9+i*2.1+z.x) + (c.stoke>0? 8 : 0), fx = -6+i*6;
      ctx.fillStyle = i===1? '#f7d060' : '#e8742c'; ctx.beginPath(); ctx.moveTo(fx-4.5,-28); ctx.quadraticCurveTo(fx-2+Math.sin(t*7+i)*3,-30-fh*0.6, fx+Math.sin(t*5+i)*2,-29-fh); ctx.quadraticCurveTo(fx+4,-30-fh*0.5, fx+4.5,-28); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#e8742c'; for (let i=0;i<3;i++){ const k = (t*0.7+i/3)%1; ctx.globalAlpha = 1-k; ctx.fillRect(-6+i*6+Math.sin(t*3+i)*5, -42-k*34, 1.8, 1.8); } ctx.globalAlpha = 1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(lightSprite('#ffb060'), -34, -62, 68, 68); ctx.restore(); }                 // le halo
  else { ctx.fillStyle = '#eef1f5'; ctx.beginPath(); ctx.moveTo(-11,-29); ctx.quadraticCurveTo(0,-37, 11,-29); ctx.closePath(); ctx.fill();   // éteint : coiffé de neige
    if (z.owner==='e'){ ctx.fillStyle = '#eef1f5'; ctx.beginPath(); ctx.moveTo(-18,0); ctx.quadraticCurveTo(-8,-22, 0,-12); ctx.quadraticCurveTo(10,-20, 18,0); ctx.closePath(); ctx.fill(); } }
  const a = Math.abs(pr); if (a>0.01 && a<1){ ctx.fillStyle = 'rgba(20,24,34,0.7)'; ctx.fillRect(-18,7,36,4); ctx.fillStyle = pr>0? '#f0a040' : '#9fc4e0'; ctx.fillRect(-18,7,36*a,4); }
  ctx.restore();
}
function m4DrawHouse(h, t, vw){                                          // un coron sous la neige, porte verte ; une lueur à la lucarne tant que des gens s'y cachent
  const x = h.x-camX; if (x<-70 || x>vw+70) return; const y = gY(h.x);
  ctx.save(); ctx.translate(x, y+2);
  ctx.fillStyle = '#5c5054'; ctx.beginPath(); ctx.moveTo(-30,0); ctx.lineTo(-30,-40); ctx.lineTo(-18,-34); ctx.lineTo(-8,-50); ctx.lineTo(4,-50); ctx.lineTo(10,-42); ctx.lineTo(30,-42); ctx.lineTo(30,0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(20,22,32,0.3)'; ctx.fillRect(22,-42,8,42);
  ctx.strokeStyle = 'rgba(20,22,32,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); for (let k=0;k<5;k++){ ctx.moveTo(-28+k*5,-2); ctx.lineTo(-18+k*5,-30); } ctx.stroke();
  ctx.fillStyle = '#eef1f5'; ctx.beginPath(); ctx.moveTo(-33,-39); ctx.lineTo(-18,-36); ctx.lineTo(-8,-53); ctx.lineTo(5,-53); ctx.lineTo(11,-45); ctx.lineTo(33,-45); ctx.lineTo(33,-41); ctx.lineTo(10,-41); ctx.lineTo(4,-48); ctx.lineTo(-7,-48); ctx.lineTo(-17,-32); ctx.lineTo(-33,-36); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-40,0); ctx.quadraticCurveTo(-30,-12, -18,0); ctx.moveTo(14,0); ctx.quadraticCurveTo(28,-10, 42,0); ctx.fill();   // congères le long de la façade
  ctx.fillStyle = '#231f24'; ctx.fillRect(-4,-22,13,22);                                                           // la baie de la porte
  if (h.st){ ctx.fillStyle = '#3f6a48'; ctx.beginPath(); ctx.moveTo(9,-22); ctx.lineTo(17,-19); ctx.lineTo(17,0); ctx.lineTo(9,0); ctx.closePath(); ctx.fill(); }   // porte verte ouverte
  else { ctx.fillStyle = '#3f6a48'; ctx.fillRect(-3,-21,11,21); ctx.fillStyle = '#25402c'; ctx.fillRect(-3,-12,11,1.5); }
  ctx.fillStyle = h.st? '#17181c' : (Math.sin(t*2.2+h.x)>-0.5? '#f0a040' : '#b8742c'); ctx.fillRect(-23,-26,9,9);    // lucarne
  ctx.strokeStyle = '#231f24'; ctx.lineWidth = 1; ctx.strokeRect(-23,-26,9,9); ctx.beginPath(); ctx.moveTo(-18.5,-26); ctx.lineTo(-18.5,-17); ctx.stroke();
  if (!h.st){ const bob = Math.sin(t*3)*2;                                                                           // repère : il y a quelqu'un
    ctx.fillStyle = '#e9dfc6'; ctx.fillRect(-9,-78+bob,18,16); ctx.fillStyle = '#c42a1c'; ctx.fillRect(-9,-78+bob,18,2.2);
    ctx.beginPath(); ctx.moveTo(-4,-62+bob); ctx.lineTo(4,-62+bob); ctx.lineTo(0,-57+bob); ctx.closePath(); ctx.fillStyle = '#e9dfc6'; ctx.fill();
    ctx.fillStyle = '#1f1b17'; ctx.beginPath(); ctx.arc(-3.4,-70.5+bob,2,0,6.283); ctx.arc(3.4,-70.5+bob,2,0,6.283); ctx.fill(); ctx.fillRect(-5.2,-68.4+bob,3.6,4); ctx.fillRect(1.6,-68.4+bob,3.6,4); }
  ctx.restore();
}
function m4DrawGroup(gr, vw){                                            // trois silhouettes emmitouflées, une lanterne, une jauge (vert = escortés, rouge = en danger)
  const x = gr.x-camX; if (x<-40 || x>vw+40) return; const y = gY(gr.x);
  for (let i=0;i<3;i++){ const fx = x+(i-1)*11, s = i===1? 15 : 20, b = Math.abs(Math.sin(gr.ph+i*1.3))*1.6;
    ctx.fillStyle = ['#4a4f58','#7a5a48','#5a5a6a'][i]; ctx.beginPath(); ctx.moveTo(fx-s*0.24, y-b); ctx.lineTo(fx-s*0.2, y-s*0.72-b); ctx.lineTo(fx+s*0.2, y-s*0.72-b); ctx.lineTo(fx+s*0.24, y-b); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9b99a'; ctx.beginPath(); ctx.arc(fx, y-s*0.86-b, s*0.15, 0, 6.283); ctx.fill();
    ctx.fillStyle = i===2? '#c42a1c' : '#2c3440'; ctx.fillRect(fx-s*0.17, y-s*1.03-b, s*0.34, s*0.12); }
  ctx.fillStyle = '#f7d060'; ctx.fillRect(x-19, y-13, 3, 4); ctx.strokeStyle = '#231f24'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x-17.5, y-13); ctx.lineTo(x-14, y-16); ctx.stroke();
  ctx.fillStyle = '#e9dfc6'; ctx.fillRect(x-13, y-36, 26, 3); ctx.fillStyle = gr.harm>0? '#c42a1c' : gr.esc? '#5a8a4a' : '#8a8f98'; ctx.fillRect(x-13, y-36, 26*(1-gr.harm/3), 3);
}
// la déneigeuse : étrave rouge, chenilles, gyrophare ; invisible dans le blizzard tant qu'elle n'est pas éclairée (il ne reste que ses phares)
function m4DrawPlough(wx, hpf, t, vis, a){
  const x = wx-camX, y = gY(wx), jig = Math.sin(t*22)*0.6; a = a==null? 1 : a;
  ctx.save(); ctx.translate(x, y+jig);
  if (vis){ ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(20,24,34,0.3)'; ctx.beginPath(); ctx.ellipse(6,2,46,6,0,0,6.283); ctx.fill();
    ctx.fillStyle = '#1f2228'; rr(-22,-14,62,14,6); ctx.fill(); ctx.fillStyle = '#3a3f48'; for (let i=0;i<6;i++){ ctx.beginPath(); ctx.arc(-15+i*10,-7,4,0,6.283); ctx.fill(); }   // chenilles
    ctx.fillStyle = '#56606c'; ctx.fillRect(-18,-40,54,27); ctx.fillStyle = '#434c58'; ctx.fillRect(8,-58,28,20); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(30,-58,6,45);
    ctx.fillStyle = '#bfe0f4'; ctx.fillRect(11,-53,15,5);                                                             // la fente du regard
    ctx.fillStyle = (Math.sin(t*8)>0)? '#e8b830' : '#7a6420'; ctx.fillRect(18,-63,6,5);                              // gyrophare
    ctx.fillStyle = '#c8502c'; ctx.beginPath(); ctx.moveTo(-20,-48); ctx.quadraticCurveTo(-46,-30, -44,0); ctx.lineTo(-30,0); ctx.quadraticCurveTo(-32,-26, -16,-40); ctx.closePath(); ctx.fill();   // l'étrave
    ctx.strokeStyle = '#1f1b17'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#eef1f5'; for (let i=0;i<5;i++){ const k = (t*1.6+i/5)%1; ctx.globalAlpha = a*(1-k); ctx.beginPath(); ctx.arc(-46-k*30, -6-k*34+i*2, 4-k*2, 0, 6.283); ctx.fill(); } ctx.globalAlpha = 1;   // gerbe de neige
    if (hpf!=null){ ctx.fillStyle = 'rgba(20,24,34,0.7)'; ctx.fillRect(-26,-74,60,5); ctx.fillStyle = '#5ad0ff'; ctx.fillRect(-26,-74,60*clamp(hpf,0,1),5); } }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';                                                                // les deux phares dans la neige
  for (const fx of [-24,-8]){ ctx.fillStyle = 'rgba(255,236,170,0.9)'; ctx.beginPath(); ctx.arc(fx,-30,2.4,0,6.283); ctx.fill(); ctx.drawImage(lightSprite('#ffe9a8'), fx-18, -48, 36, 36); }
  ctx.restore(); ctx.restore();
}
function m4DrawProps(c, t, vw){
  // noms des quatre socles : la lampisterie, la forge, l'école, la coopérative
  const g = game, names = [M4_TX.lamp, M4_TX.forge, M4_TX.school, M4_TX.coop];
  g.neut.forEach((s, i) => { const x = s.x-camX; if (x<-80 || x>vw+80 || s.b || !names[i]) return; ctx.save(); ctx.translate(x, gY(s.x)); m4Label(cT(names[i]), 14); ctx.restore(); });
  for (const h of c.houses) m4DrawHouse(h, t, vw);
  for (const gr of c.groups) m4DrawGroup(gr, vw);
  ctx.strokeStyle = '#bfe0f4'; ctx.lineWidth = 1.2; ctx.beginPath();                                                   // nos troupes qui gèlent : un petit cristal au-dessus de la tête
  for (const u of g.p.units){ if (!u.cold) continue; const x = u.x-camX; if (x<-10 || x>vw+10) continue; const y = gY(u.x) - (u.fly? u.flyH+50 : 76);
    ctx.moveTo(x-3.5,y); ctx.lineTo(x+3.5,y); ctx.moveTo(x-1.8,y-3); ctx.lineTo(x+1.8,y+3); ctx.moveTo(x+1.8,y-3); ctx.lineTo(x-1.8,y+3); }
  ctx.stroke();
}

/* ---------- la déneigeuse, les objectifs facultatifs ---------- */
function m4Plough(g, c){                                                  // le prototype de « nous » : une machine lourde, lente, qui enterre les braseros
  const e = g.e; spawnUnit(e, 1, false, M4.plX); const u = e.units[e.units.length-1]; if (!u) return;
  u.plough = true; u._cd = 1; u.ord = 'charge'; u.hp = u.maxhp = M4.plHp[c.D.i]; u.dmg *= 1.3; u.spd = M4.plSpd; u.xpv *= 6;   // PV fixés par le tableau de difficulté (pas de multiplicateur en plus)
  c.pls.push(u); c.plN++; g.shake = Math.max(g.shake, 8); sfx('boom'); }
function m4Bonus(c, k){ c.banner = { head:CAMP_UI.bonusDone, txt:[M4_TX.b1, M4_TX.b2, M4_TX.b3][k], t0:performance.now() }; sfx('evolve'); }
const m4G2 = c => (c.g1? 1 : 0) + (c.g2? 1 : 0) + (c.g3? 1 : 0);

campMission(3, {
  num:'IV', year:"2035", ai:[0,2,2], doctrines:['caisse','ordre'], eraCap:3, era0:2, oneLife:true, dev0:0.25,
  dm:[{inc:0.10, cheat:0.5}, {inc:0.14, cheat:0.6, think:2.4, eraLag:0.8}, {inc:0.18, cheat:0.7, think:2.0, eraLag:0.8}],   // IA « Difficile » en Lutte et Dernier carré
  dAdj:[null, null, { wave:1, gap:1, base:1, eBase:1, res:1, eHp:1, eDmg:1 }],                               // Dernier carré : la rue ne tient pas plus de machines et il n'y a plus de métal passif ; avec le modèle commun (colonnes ×1,25, machines ×1,12, ressources ×0,9) le joueur scripté s'effondre avant la fin, on tempère donc les colonnes, la vie et les dégâts des machines et la caisse
  title:M4_TX.title, place:M4_TX.place, recap:M4_TX.recap, where:M4_TX.where, goal2:M4_TX.goal2, rule:M4_TX.rule,
  tips:M4_TX.tips, docWhy:M4_TX.docWhy, debrief:M4_TX.debrief, fail:M4_TX.fail,
  radio:[
    { at:5, who:'sol', txt:M4_TX.rA },
    { when:(g, c) => c.D.i===0 && c.t >= 12, who:'sol', txt:M4_TX.rB },                                  // Récit seulement
    { at:20, who:'sol', txt:M4_TX.rC },
    { at:34, who:'sol', txt:M4_TX.rD },                                                                 // la première colonne part à 0:34
    { at:70, who:'sol', txt:M4_TX.rE },                                                                 // 1:10 · premier blizzard
    { when:(g, c) => c.out >= 1, who:'anselme', txt:M4_TX.rF },
    { when:(g, c) => !!c.walked, who:'sol', txt:M4_TX.rG },
    { when:(g, c) => g.p.era >= 3, who:'sol', txt:M4_TX.rK },
    { when:(g, c) => c.t >= c.plTimes[0]-10, who:'sol',                                                 // S1 · La déneigeuse (10 s avant son arrivée)
      cine(g, c){ return [
        { cam:{x:2900, t:0.8}, live:true, dur:1.5, fx(g, c){ c.ghost = true; } },
        { cam:{x:2900}, who:'sol', txt:M4_TX.s1 },
      ]; } },
    { when:(g, c) => g.p.hp < g.p.maxhp*0.5, who:'sol', txt:M4_TX.rM },
    { when:(g, c) => c.t >= c.total - M4.k55, who:'k55',                                               // S2 · « J'y suis » (3:00 de la fin)
      cine(g, c){ return [
        { cam:{x:g.e.x-130, t:1.2}, live:true, dur:2, who:'k55', fx(g, c){ c.bandsStop = true; g.flash = Math.max(g.flash||0, 0.5); }, txt:M4_TX.s2a },
        { cam:{x:g.e.x-130}, who:'k55', txt:M4_TX.s2b },
        { cam:{x:g.p.x+260, t:1.8}, who:'sol', fx(g, c){ campPatch(); c.kpT = 20; }, txt:M4_TX.s2c },     // retour au jeu : leurs machines sont figées 15 s
      ]; } },
    { when:(g, c) => c.t >= c.total - M4.k55b, who:'sol',                                              // S3 · La fréquence vide (2:30 de la fin)
      cine(g, c){ return [
        { cam:{x:g.p.x+60, t:1.2}, live:true, dur:2.5, mus:'c_sorrow', fx(g, c){ c.silent = true; } },   // le voyant de l'émetteur reste allumé
        { cam:{x:g.p.x+60}, who:'sol', txt:M4_TX.s3a },
        { cam:{x:g.p.x+60}, who:'sol', txt:M4_TX.s3b },
        { cam:{x:g.p.x+60}, dur:0.6, mus:'m_cold' },
      ]; } },
    { when:(g, c) => c.t >= c.total - 60, who:'sol', txt:M4_TX.rN },
  ],
  biome:'rochefroide', theme:'rochefroide',
  // la rue : plate jusqu'à x 2 600 puis la rampe de la route du plateau (+60 px, voir gY) ; AUCUN lac (la neige fondue des braseros donne l'eau)
  map:{ p:{ x:150 }, e:{ x:3450 }, neut:M4.slots, zones:M4.braz },                                       // relais (socles 245 · 309 · 373) · Mnémosyne · cinq braseros
  action:{ label:M4_TX.charcoal, cd:70,
    use(g, c){ c.actCd = M4.stokeCd[c.D.i]*(c.actMul||1); c.stoke = M4.stokeT; sfx('build', 2);          // les feux tenus s'étendent ; ceux qu'une de nos troupes approche se rallument d'un coup
      for (const z of g.zones){ if (!m4Lit(z) && g.p.units.some(u=>Math.abs(u.x-z.x) < M4.stokeR)){ z.owner = 'p'; z.prog = 1; }
        if (m4Lit(z)){ burst(z.x, gY(z.x)-30, '#ffb060', 14, 1.2); addFloater(z.x, gY(z.x)-70, '▲', '#ffb060', 16); } } } },
  setup(g, c){
    const D = c.D.i, p = g.p, e = g.e, retry = M4_RETRY && D===0;                                        // Récit : reprise allégée après un échec
    campGrant(p, 300, 150, 70); p.fortLvl = 2; p.maxhp = p.hp = M4.hp[D];
    e.maxhp = e.hp = M4.ehp[D]; e.fortLvl = 3;
    g.zones.forEach((z, i) => { const on = i===0 || (retry && i===1); z.owner = on? 'p' : null; z.prog = on? 1 : 0; });   // le brasero 1 est allumé au départ (et le 2 après un échec en Récit)
    const sl = p.slots;
    sl[0].b = mkB(p, 'farmF'); sl[0].owner = p;                                                          // la serre de la mine
    sl[1].b = mkB(p, 'turret'); sl[1].owner = p; if (!retry) sl[1].b.hp *= 0.45;                          // la tourelle et la muraille ont souffert cette nuit
    sl[2].b = mkB(p, 'wall'); sl[2].owner = p; sl[2].b.hp *= 0.5;
    campSquad(p, [1,0,2,2]);
    c.total = M4.total[D]; c.gust = 0; c.bliz = false; c.stoke = 0; c.saved = 0; c.lost = 0; c.out = 0; c.lit = g.zones.filter(m4Lit).length;
    c.wave = 0; c.nextWave = 34; c.houses = M4.houses.map(x=>({ x, st:0 })); c.groups = []; c.say = {}; c.bandT = 0; c.debt = 0; c.beepT = 4;
    c.pls = []; c.plN = 0; c.pEx = 0; c.pDead = 0; c.plTimes = [M4.plT[D]].concat(D===2? [c.total - M4.plT2] : []); c.plI = 0;
    c.g1 = c.g2 = c.g3 = false; c.cineSeen = 0;
    c.hidden = u => !!u.plough;                                                                          // la déneigeuse a son propre dessin
    c.rangeMul = u => (c.bliz && u.range>60)? M4.rangeK : 1;                                             // le blizzard : portée des tireurs −28 % (les deux camps)
    g.cataCd = 1e9; this.light(g, c);
  },
  light(g, c){ const Ls = c.lights; Ls.length = 0;
    Ls.push({x:g.p.x+30, r:300, big:1});
    for (const z of g.zones) if (m4Lit(z)) Ls.push({x:z.x, r:M4.warmR*(c.stoke>0? M4.stokeK : 1)+30, big:1});
    for (const gr of c.groups) Ls.push({x:gr.x, r:60, a:0.7});
    for (const u of c.pls) if (u.hp > 0) Ls.push({x:u.x-30, r:46, a:0.6});                                // les phares de la déneigeuse
    for (let i=LIGHTS.length-1, k=0; i>=0 && k<6; i--, k++){ const L = LIGHTS[i]; Ls.push({x:L.x, y:L.y, r:L.r*0.8, a:1-L.t/L.life}); } },
  tick(g, c, dt){
    const p = g.p, e = g.e, T = c.t, D = c.D.i, cold = M4.cold[D];
    g.cataCd = 1e9;
    // le calendrier météo d'escarmouche est neutralisé : seule Kassandre fige leurs machines (S2)
    if (g.wClock>=28 && g.wClock<45) g.wClock = 45;
    if (g.wClock>=88 && g.wClock<105 && !(c.kpT>0)) g.wClock = 105;
    if (c.kpT > 0) c.kpT -= dt;
    // le blizzard va et vient (la dernière minute, il ne retombe plus) ; c.gust est sa force lissée
    c.bliz = m4Bliz(c, T); c.gust += ((c.bliz? 1 : 0) - c.gust) * Math.min(1, dt*0.5);
    if (c.stoke > 0) c.stoke -= dt;
    if (!c.bandsStop) c.bandT += dt;
    // L'ARGENT EST RARE : les marchés ne rendent que 30 % (Dernier carré : plus aucun revenu passif de métal) ; les civils sauvés rapportent +1 métal/s chacun
    { const R = calcRates(p), base = 2.5*(p.prodMul||1)*winterMul();
      c.debt += (M4.mk > 0? (1-M4.mk)*Math.max(0, R.m-base) : 0)*dt + (D===2? base*dt : 0);
      const pay = Math.min(c.debt, p.m); p.m -= pay; c.debt -= pay; p.m += c.saved*dt; }
    // la neige fondue : chaque brasero allumé donne +0,5 💧/s
    let lit = 0; for (const z of g.zones) if (m4Lit(z)) lit++;
    p.w += 0.5*lit*dt;
    // LE FROID : hors de la chaleur, nos troupes perdent des PV (jamais jusqu'à la mort : « il n'achève pas, il livre ») et ralentissent de 30 % ; au chaud, elles guérissent
    for (const u of p.units){ if (u.spd0==null) u.spd0 = u.spd;
      const w = m4Warm(g, u.x); u.cold = !w; u.spd = u.spd0*(w? 1 : M4.slow);
      if (!w){ if (u.hp > u.maxhp*M4.floor) u.hp = Math.max(u.maxhp*M4.floor, u.hp - u.maxhp*cold*(c.bliz? 2 : 1)*dt); }
      else if (u.hp < u.maxhp) u.hp = Math.min(u.maxhp, u.hp + u.maxhp*M4.heal*dt); }
    // braseros : on les rallume en restant à côté (moteur) ; un feu éteint est signalé
    if (lit < c.lit) m4Say(c, 'out', M4_TX.rJ, 40);
    if (lit > c.lit) sfx('evolve');
    c.lit = lit; if (lit >= 5 && !c.g2){ c.g2 = true; m4Bonus(c, 1); }
    // maisons : une troupe au sol qui passe à moins de 34 px de la porte fait sortir les civils
    for (const h of c.houses){ if (h.st) continue;
      for (const u of p.units) if (!u.fly && Math.abs(u.x-h.x) < 34){ h.st = 1; c.out++; c.groups.push({ x:h.x, harm:0, ph:Math.random()*6 }); sfx('cap'); m4Sound('door'); addFloater(h.x, gY(h.x)-64, '!', '#e8b830', 18); break; } }
    for (let i=c.groups.length-1; i>=0; i--){ const gr = c.groups[i];
      gr.esc = p.units.some(u=>!u.fly && Math.abs(u.x-gr.x) < 170);                    // ils ne marchent que si l'un des nôtres est à moins de 170 px
      if (gr.esc){ gr.x -= 32*dt; gr.ph += dt*6; c.walked = 1; }
      let threat = false; for (const u of e.units) if (!u.fly && Math.abs(u.x-gr.x) < 46){ threat = true; break; }   // une machine au sol à moins de 46 px
      gr.harm = threat? gr.harm + dt : Math.max(0, gr.harm - dt*0.5);
      if (gr.harm >= 3){ c.groups.splice(i,1); c.lost++; burst(gr.x, gY(gr.x)-10, '#eef1f5', 12, 1); sfx('deny'); m4Say(c, 'lost', M4_TX.rI, 40); continue; }
      if (gr.x <= p.x+70){ c.groups.splice(i,1); c.saved++; p.f += 150; p.m += 220; p.w += 50; if (unitTotal(p) < p.cap) spawnUnit(p, 1, false);   // du pain, l'argent de la mine, de l'eau, un costaud de plus
        sfx('evolve'); m4Sound('bell'); addFloater(p.x+60, gY(p.x)-90, '+220', '#e8d8a0', 15); m4Say(c, 'saved', M4_TX.rH, 20);
        if (c.saved >= 4 && !c.g1){ c.g1 = true; m4Bonus(c, 0); } } }
    // colonnes adverses : de plus en plus fournies ; la dernière minute, elles se suivent de près
    if (T >= c.nextWave){ const k = c.wave++; c.nextWave += T >= c.total-60? 40 : 44;
      m4Wave(Math.round((3 + 1.0*k) * 0.92 * c.D.wave), k>=4); }
    // la déneigeuse (le prototype) : elle éteint chaque brasero qu'elle passe ; en Dernier carré, une seconde arrive 1:30 avant la fin
    while (c.plI < c.plTimes.length && T >= c.plTimes[c.plI]){ c.plI++; m4Plough(g, c); }
    for (let i=c.pls.length-1; i>=0; i--){ const pl = c.pls[i];
      if (pl.hp > 0 && e.units.includes(pl)){
        for (const z of g.zones) if (m4Lit(z) && Math.abs(z.x-pl.x) < 54){ z.owner = 'e'; z.prog = -1; c.pEx++; burst(z.x, gY(z.x)-16, '#eef1f5', 22, 1.5); sfx('boom'); g.shake = Math.max(g.shake, 6); } }
      else { c.pls.splice(i,1); c.pDead++; explode(pl.x, gY(pl.x)-24, 1.8); m4Say(c, 'pld', M4_TX.rL, 1); } }
    if (!c.g3 && c.pDead >= c.plTimes.length && c.pEx === 0){ c.g3 = true; m4Bonus(c, 2); }
    // l'émetteur : un bip lent, jusqu'au silence de la scène S3 ; un craquement de glace de loin en loin
    if (!CINE.on){ const cx = camX + VW()/2;
      if (c.pls.some(u => u.hp > 0 && Math.abs(u.x-cx) < 1000) && (c.engT = (c.engT||0) - dt) <= 0){ c.engT = 1.1; m4Sound('engine'); }
      if ((c.stepT = (c.stepT||0) - dt) <= 0){ c.stepT = 0.55; if (p.units.some(u => !u.fly && Math.abs(u.x-cx) < VW()/2 && Math.abs((u.tx!=null? u.tx : u.x) - u.x) > 8)) m4Sound('step'); } }
    if (!c.silent && !CINE.on && (c.beepT -= dt) <= 0){ c.beepT = 7; m4Sound('beep'); }
    if (!CINE.on && Math.random() < dt*0.04) m4Sound('ice');
    this.light(g, c);
    if (g.e.hp <= 0){ c.goal2Done = !!(c.g1 && c.g2 && c.g3); M4_RETRY = false; return 'win'; }          // Mnémosyne rasée
    if (T >= c.total){ c.goal2Done = !!(c.g1 && c.g2 && c.g3); M4_RETRY = false; return 'win'; }         // le compte à rebours de Kassandre arrive à 0
    if (p.hp <= 0){ if (D===0) M4_RETRY = true; return 'lose'; }
  },
  hud(g, c){ const left = Math.max(0, c.total-c.t);
    return { clock:left, prog:c.t/c.total, warn:left<60, label:cT(M4_TX.hFires)+c.lit+'/5 · '+cT(M4_TX.hCiv)+c.saved+'/4', goal2:{ done:false, label:m4G2(c)+'/3' } }; },
  drawZone(z, t, vw){ m4DrawZone(z, t, vw); },
  draw(g, c, vw){ const t = g.t;
    m4DrawProps(c, t, vw);
    for (const pl of c.pls){ if (pl.hp <= 0) continue; const x = pl.x-camX; if (x<-90 || x>vw+90) continue;
      m4DrawPlough(pl.x, pl.hp/pl.maxhp, t, !(c.gust > 0.35) || m4Seen(g, pl.x), 1); }
    if (c.ghost && c.plI < 1){ const gt = clamp(c.t - (c.plTimes[0]-10), 0, 10), x = M4.plX + 60 - gt*6, a = clamp((gt-0.8)/1.4, 0, 0.7);   // avant son arrivée : deux phares dans la neige, puis la lame
      if (x-camX > -90 && x-camX < vw+90) m4DrawPlough(x, null, t, a>0.02, a); }
  },
  intro(g, c){ const D = c.D.i; return [
    { plate:M4_PLATES.board, mus:'c_dread', who:'nar', txt:M4_TX.o1a },
    { plate:M4_PLATES.board2, who:'nar', txt:M4_TX.o1b },
    { plate:M4_PLATES.mnemo, who:'nous', txt:M4_TX.o2 },
    { plate:M4_PLATES.pager, mus:'c_sorrow', who:'k55', txt:m4Num(M4_TX.o3a, M4_TX.minsU, D) },
    { plate:(g, w, h, t) => M4_PLATES.pager(g, w, h, t+1.5), who:'nar', txt:M4_TX.o3b },
    { plate:M4_PLATES.anselme, mus:'c_hope', who:'anselme', txt:M4_TX.o4 },
    { mus:'m_cold', cam:{x:g.p.x+200, t:0.1}, dur:3.6, title:M4_TX.cardT, sub:M4_TX.cardS },
    { cam:{x:g.p.x, t:1.6}, who:'sol', txt:M4_TX.o6 },
    { cam:{x:g.zones[0].x, t:2.4}, who:'sol', txt:M4_TX.o7 },
    { cam:{x:g.zones[1].x, t:2.4}, who:'sol', txt:M4_TX.o8 },
    { cam:{x:c.houses[0].x, t:2.4}, who:'anselme', txt:M4_TX.o9 },
    { cam:{x:3330, t:3}, dur:3, who:'sol', txt:M4_TX.o10 },
    { cam:{x:g.p.x+200, t:2.4}, who:'sol', txt:M4_TX.o11 },
  ]; },
  outro(g, c, win){
    if (!win) return [
      { plate:M4_PLATES.mute, mus:'c_sorrow', who:'nar', txt:M4_TX.e1a },
      { plate:M4_PLATES.mute2, who:'nar', txt:M4_TX.e1b },
    ];
    const razed = g.e.hp <= 0;
    return [
      razed? { cam:{x:g.e.x-90, t:1.6}, mus:'m_cold', dur:3.4, who:'sol', txt:M4_TX.v1b,
        fx(){ for (let i=0;i<7;i++) setTimeout(()=>{ if (game===g){ explode(g.e.x-130+Math.random()*220, gY(g.e.x)-20-Math.random()*80, 1.6, '#cfe6ff'); sfx('boom'); g.shake = 10; } }, i*420); } }
      : { cam:{x:g.e.x-110, t:1.6}, mus:'m_cold', dur:3.4, who:'sol', txt:M4_TX.v1a, fx(){ c.mnOff = performance.now(); } },               // Mnémosyne s'éteint étage par étage
      { plate:M4_PLATES.copy, mus:'c_sorrow', who:'nar', txt:M4_TX.v2 },
      { plate:M4_PLATES.hall, mus:'c_hope', who:'nar', txt:M4_TX.v3 },
      { plate:M4_PLATES.citadel, mus:'c_dread', who:'nar', txt:M4_TX.v4 },
    ]; },
});
// le nombre de minutes de l'objectif suit le niveau (sept, huit, neuf)
Object.defineProperty(CAMPAIGN[3], 'goal', { configurable:true, enumerable:true, get(){
  const i = (typeof game!=='undefined' && game && game.camp && game.camp.D)? game.camp.D.i : CAMP_SAVE.diff, n = clamp(i|0, 0, 2), o = {};
  for (const k in M4_TX.goal) o[k] = M4_TX.goal[k].replace('{n}', M4_TX.mins[n][k]);
  return o; } });
