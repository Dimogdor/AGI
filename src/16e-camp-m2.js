/* ================= CAMPAGNE · MISSION II — GRÈVE GÉNÉRALE (v1.16) =================
   Le port de l'estuaire, Valmont — mars 2028, de l'aube à midi. Ce qu'on reprend : la PAROLE.
   Un CORTÈGE de grévistes marche de la halle aux grains jusqu'à Radio-Quai. Il avance seul et
   s'arrête dès qu'une machine lui barre la route ; chaque coup retire de sa force. Rien d'autre
   n'est à protéger : la halle est hors d'atteinte, le terminal du bout est un décor jusqu'au
   tronçon 4. Spécification : docs/campagne/M2.md.
   Les quatre règles qui corrigent l'escorte (M2.md § 3) :
     1. TROIS GRILLES (x 1 100 · 1 900 · 2 650) coupent le quai en quatre tronçons : fermée, une grille
        bloque toutes les unités au sol, des deux camps ; elle s'ouvre (3 s) quand la tête du cortège
        arrive à 60 px. On ne peut donc jamais être plus loin que le tronçon du cortège.
     2. Les barges accostent seulement DEVANT : entre tête + 220 (et notre front + marge) et la grille
        suivante − 60, annoncées 8 / 6 / 4 s à l'avance ; une machine à plus de 400 px derrière la
        queue du cortège rembarque.
     3. Pas de base adverse : le terminal (x 3 450) n'est actif — et destructible — qu'au tronçon 4.
     4. Les recrues de la halle arrivent à la QUEUE du cortège (rues de côté), pas à la halle.
   Ce fichier ajoute, hors moteur, trois enveloppes minimales (dessin des bases, dégâts au cortège, bouton
   de reprise) — voir « Enveloppes » en fin de fichier.                                                    */
const M2 = { x0:430, span:170, gates:[1100,1900,2650], mast:3150, term:3450, v:22, vSlow:11, hall:150 };
const M2T = (fr,en,es,de,it,pt,ru,zh,ar) => ({fr,en,es,de,it,pt,ru,zh,ar});            // objet de texte à 9 langues
const m2Tm = () => (game && game.camp)? game.camp.t + (game.camp.off||0) : 0;         // temps de mission (reprise comprise)
const m2Clock = () => 360 + 0.6*m2Tm();                                              // heure du port, en minutes : 06:00 → midi (10 min = 6 h)
const m2Hhmm = () => { const m = Math.min(1439, Math.floor(m2Clock())); return ('0'+Math.floor(m/60)).slice(-2)+':'+('0'+m%60).slice(-2); };
let M2_CK = null;                                                                    // point de reprise (dernière grille ouverte), voir m2Checkpoint

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
  id:'port', music:'m_strike', amb:{ wind:0.022, birds:false, tick:m2Amb },
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
    const k = (game && game.camp)? clamp(m2Tm()/600, 0, 1) : 0;
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
    const k = (game && game.camp)? clamp(m2Tm()/600, 0, 1) : 0, a = 0.5 - 0.3*k;
    const f = fxSprite('M2FOG', 256, 48, g => { const r = g.createLinearGradient(0,0,0,48);
      r.addColorStop(0,'rgba(236,232,226,0)'); r.addColorStop(0.5,'rgba(236,232,226,0.55)'); r.addColorStop(1,'rgba(236,232,226,0)'); g.fillStyle = r; g.fillRect(0,0,256,48); });
    ctx.globalAlpha = a;
    for (let i=0;i<3;i++){ const y = Y_G - 70 + i*22, sp = 6+i*5, ox = -((t*sp + camX*zoom*(0.4+i*0.2)) % 512);
      for (let x = ox; x < W; x += 512) ctx.drawImage(f, x, y, 512, 40+i*10); }
    ctx.globalAlpha = 1;
  },
};

/* ---------- AMBIANCES : mouettes (fréquentes à l'aube), clapot, mégaphone toutes les 30 s, grues, drones, portes ---------- */
// les boucles enregistrées (03b, profil « port ») portent déjà le port, le clapot, la foule et le chant ; ici le repli synthétique
// et les événements propres à la mission. m2Sample joue l'enregistrement s'il est chargé, sinon la synthèse proposée.
function m2Sample(key, o, fallback){ try { if (typeof sampPlay==='function' && sampPlay(key, o)) return true; } catch(e){} if (fallback && AC && SETTINGS.sfx) fallback(AC.currentTime); return false; }
function m2Amb(t){
  const c = game && game.camp, dawn = 1 - clamp(m2Tm()/600, 0, 1)*0.7;
  if (Math.random() < 0.02*dawn){ tone(1500+Math.random()*300, t, .16, 'triangle', .006, -520); tone(1350, t+.2, .22, 'triangle', .005, -560); }   // mouette
  if (Math.random() < 0.1) noise(t, .5, .004, 600);                                                                                           // clapot contre le quai
  if (!c) return;
  if (c.megaT == null || c.t < c.megaT - 31) c.megaT = c.t + 4;
  if (c.t >= c.megaT){ c.megaT = c.t + 30; tone(420, t, .09, 'sawtooth', .01, 40, 0, 900); tone(380, t+.12, .12, 'sawtooth', .01, -20, 0, 800); noise(t, .3, .01, 1500); }   // mégaphone : mots inaudibles
  if (c.seg===1 && Math.random() < 0.05){ tone(1900, t, .02, 'square', .006); tone(1400, t+.07, .02, 'square', .006); }                       // cliquetis de grues
  if (c.seg>=1 && game.e.units.some(u=>u.fly) && Math.random() < 0.3) tone(150+Math.random()*10, t, .3, 'sawtooth', .004, 0, .1, 500);          // bourdon de drones
  if (c.term && c.term.active && !c.term.dead && Math.random() < 0.02){ tone(240, t, .25, 'square', .005, 60, .05, 700); noise(t, .25, .006, 1200); }   // portes coulissantes
}
const m2Horn = () => m2Sample('horn', {vol:0.7, vary:0.3}, t => { tone(98, t, 1.6, 'sawtooth', .03, 0, .3, 380); tone(147, t, 1.6, 'sawtooth', .015, 0, .3, 380); });
const m2Creak = () => { if (!AC || !SETTINGS.sfx) return; const t = AC.currentTime; tone(210, t, 1.2, 'sawtooth', .012, 90, .2, 900); tone(160, t+.5, 1.4, 'sawtooth', .01, -50, .2, 700); noise(t, .6, .01, 1800); };

/* ---------- personnages ---------- */
CINE_WHO.mado = { name:'MADO', ink:'#2f4a6a' };
// MADO : déléguée des dockers, la quarantaine, bonnet de docker, écharpe rouge, mégaphone
CINE_PORTRAITS.mado = g => {
  inkWash(g, [8,64, 12,48, 24,42, 40,42, 52,48, 56,64], '#2f4a6a', 0.92);                     // veste de docker
  g.fillStyle = '#2a201a'; for (const [x,y,r] of [[21,27,4.5],[43,27,4.5],[20,34,4],[44,34,4]]){ g.beginPath(); g.arc(x,y,r,0,6.283); g.fill(); }   // boucles sous le bonnet
  g.fillStyle = '#c99a72'; g.beginPath(); g.ellipse(32, 29, 10, 12.5, 0, 0, 6.283); g.fill();   // visage
  inkWash(g, [19,21, 20,11, 32,6, 44,11, 45,21, 38,17, 26,17], '#26303c', 0.97);              // bonnet de docker
  inkLine(g, [19,21, 20,11, 32,6, 44,11, 45,21], 1, 1.1);
  g.fillStyle = '#1f1b17'; g.fillRect(26.5,27,2,2); g.fillRect(35.5,27,2,2);
  inkLine(g, [25,24.5, 29.5,23.6], 1, 1.4); inkLine(g, [34.5,23.6, 39,24.5], 1, 1.4);        // sourcils froncés
  inkLine(g, [28.5,37, 35.5,37], 1, 1.3); inkLine(g, [32,29, 31,33, 33,33], 1, 0.8);
  inkWash(g, [22,40, 32,46, 42,40, 44,46, 32,53, 20,46], '#c42a1c', 0.95);                    // écharpe rouge
  inkWash(g, [44,52, 58,44, 60,58, 46,56], '#c8b27a', 1); inkLine(g, [44,52, 58,44, 60,58, 46,56, 44,52], 1, 1);   // mégaphone
};

/* ---------- sprites cuits (une fois) ---------- */
const M2_BAN = [M2T("GRÈVE GÉNÉRALE","GENERAL STRIKE","HUELGA GENERAL","GENERALSTREIK","SCIOPERO GENERALE","GREVE GERAL","ВСЕОБЩАЯ ЗАБАСТОВКА","总罢工","الإضراب العام"),
  M2T("ON NE DÉSAFFECTE PAS","PEOPLE AREN'T SCRAP","A LA GENTE NO SE LA DESECHA","MENSCHEN SIND KEIN SCHROTT","LE PERSONE NON SI DISMETTONO","GENTE NÃO SE DESATIVA","ЛЮДЕЙ НЕ СПИСЫВАЮТ","人不是报废品","البشر ليسوا خردة"),
  M2T("VALMONT DEBOUT","VALMONT STANDS","VALMONT DE PIE","VALMONT STEHT AUF","VALMONT IN PIEDI","VALMONT DE PÉ","VALMONT НА НОГАХ","VALMONT 挺立","VALMONT واقفة")];

const M2_TXT = {
  hall:   M2T("COMITÉ DE GRÈVE","STRIKE COMMITTEE","COMITÉ DE HUELGA","STREIKKOMITEE","COMITATO DI SCIOPERO","COMITÊ DE GREVE","СТАЧКОМ","罢工委员会","لجنة الإضراب"),
  gate:   M2T("PORT — ACCÈS RÉGLEMENTÉ","PORT — RESTRICTED ACCESS","PUERTO — ACCESO RESTRINGIDO","HAFEN — ZUTRITT BESCHRÄNKT","PORTO — ACCESSO REGOLAMENTATO","PORTO — ACESSO RESTRITO","ПОРТ — ОГРАНИЧЕННЫЙ ДОСТУП","港区 — 限制进入","الميناء — دخول مقيَّد"),
  kiosk:  M2T("JOURNAUX","NEWS","PRENSA","ZEITUNGEN","GIORNALI","JORNAIS","ГАЗЕТЫ","报刊","صحف"),
  union:  M2T("SYNDICAT","UNION","SINDICATO","GEWERKSCHAFT","SINDACATO","SINDICATO","ПРОФСОЮЗ","工会","نقابة"),
  customs:M2T("DOUANES","CUSTOMS","ADUANA","ZOLL","DOGANA","ALFÂNDEGA","ТАМОЖНЯ","海关","الجمارك"),
  dock:   M2T("DOCKERS","DOCKERS","ESTIBADORES","HAFENARBEITER","PORTUALI","ESTIVADORES","ДОКЕРЫ","码头工人","عمّال الرصيف"),
  haltTxt:M2T("HALTE","HALT","ALTO","HALT","ALT","ALTO","СТОП","停","توقّف"),
  force:  M2T("FORCE DU CORTÈGE","MARCH STRENGTH","FUERZA DEL CORTEJO","STÄRKE DES ZUGS","FORZA DEL CORTEO","FORÇA DO CORTEJO","СИЛА КОЛОННЫ","队伍力量","قوّة الموكب"),
  segHead:M2T("TRONÇON {n}","SECTION {n}","TRAMO {n}","ABSCHNITT {n}","TRATTO {n}","TRECHO {n}","УЧАСТОК {n}","第 {n} 段","المقطع {n}"),
  termOff:M2T("EN VEILLE","STANDBY","EN ESPERA","STANDBY","IN ATTESA","EM ESPERA","ОЖИДАНИЕ","待机","في الانتظار"),
  termOn: M2T("ACTIF","ACTIVE","ACTIVA","AKTIV","ATTIVO","ATIVO","АКТИВЕН","运行中","نشِط"),
  termDead:M2T("FERMÉ","CLOSED","CERRADA","GESCHLOSSEN","CHIUSO","FECHADO","ЗАКРЫТ","已关闭","مغلق"),
  resume: M2T("REPRENDRE À LA GRILLE","RESUME AT THE GATE","REANUDAR EN LA VERJA","AM TOR WEITERMACHEN","RIPRENDI AL CANCELLO","RETOMAR NO PORTÃO","ПРОДОЛЖИТЬ У ВОРОТ","从闸门处继续","استئناف عند البوابة"),
  segName:[M2T("Quai des Tanneurs","Tanners' Quay","Muelle de los Curtidores","Gerberkai","Banchina dei Conciatori","Cais dos Curtidores","Набережная Кожевников","制革码头","رصيف الدبّاغين"),
    M2T("Les grues","The cranes","Las grúas","Die Kräne","Le gru","Os guindastes","Краны","起重机","الرافعات"),
    M2T("Les silos","The silos","Los silos","Die Silos","I silos","Os silos","Силосы","粮仓","الصوامع"),
    M2T("Le terminal","The terminal","La terminal","Das Terminal","Il terminal","O terminal","Терминал","码头终端","المحطة الطرفية")],
};
const m2Fit = (g, s, maxW, px, wt) => { let f = px; g.font = (wt||'700')+' '+f+'px "Courier New",monospace'; while (f>5 && g.measureText(s).width > maxW){ f -= 0.5; g.font = (wt||'700')+' '+f+'px "Courier New",monospace'; } };
const m2L = () => SETTINGS.lang;

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
function m2Banner(i){ return fxSprite('M2B'+i+m2L(), 74, 46, g => {
  g.strokeStyle = '#3a2a1c'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(4,46); g.lineTo(4,2); g.moveTo(70,46); g.lineTo(70,2); g.stroke();
  const col = ['#c42a1c','#e9dfc6','#1f1b17'][i%3], ink = ['#f3e7cc','#c42a1c','#e9dfc6'][i%3];
  g.fillStyle = col; g.beginPath(); g.moveTo(4,4); g.quadraticCurveTo(37,8,70,4); g.lineTo(70,21); g.quadraticCurveTo(37,25,4,21); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(31,27,23,0.6)'; g.lineWidth = 0.8; g.stroke();
  g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'; m2Fit(g, cT(M2_BAN[i%3]), 62, 8.5); g.fillText(cT(M2_BAN[i%3]), 37, 14);
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
// RADIO-QUAI : maisonnette de briques et mât à haubans (40 m)
const m2Radio = () => fxSprite('M2RADIO'+m2L(), 190, 236, g => {
  g.strokeStyle = 'rgba(43,42,48,0.55)'; g.lineWidth = 0.9; g.beginPath();
  for (const [hy,fx] of [[44,2],[44,188],[110,16],[110,174]]){ g.moveTo(95,hy); g.lineTo(fx,234); } g.stroke();       // haubans
  g.strokeStyle = M2_INK; g.lineWidth = 1.8; g.beginPath(); g.moveTo(90,176); g.lineTo(93,14); g.moveTo(100,176); g.lineTo(97,14); g.stroke();   // mât
  g.lineWidth = 1; g.beginPath(); for (let y=174, s=0; y>16; y-=10, s^=1){ const k = (176-y)/160, l = 90+3*k, r = 100-3*k; g.moveTo(s? l : r, y); g.lineTo(s? r : l, y-10); } g.stroke();
  g.fillStyle = '#b8402e'; for (let y=24; y<170; y+=40) g.fillRect(91+(y/160)*2, y, 8, 10);                    // bandes rouges et blanches
  g.fillStyle = '#c42a1c'; g.beginPath(); g.arc(95,12,2.8,0,6.283); g.fill();
  g.fillStyle = '#9a5a3c'; g.fillRect(48,170,94,64);                                                          // briques
  g.fillStyle = 'rgba(40,20,12,0.28)'; for (let y=174; y<234; y+=6) g.fillRect(48,y,94,0.8); for (let y=174, o=0; y<234; y+=6, o^=1) for (let x=48+(o?5:0); x<142; x+=10) g.fillRect(x,y,0.8,6);
  g.fillStyle = '#6a4630'; g.beginPath(); g.moveTo(42,170); g.lineTo(95,146); g.lineTo(148,170); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,230,190,0.28)'; g.fillRect(48,170,5,64);
  g.fillStyle = '#2b2a30'; g.fillRect(58,188,18,16); g.fillRect(114,188,18,16); g.fillRect(84,200,22,34);        // fenêtres, porte
  g.fillStyle = '#e9dfc6'; g.fillRect(56,160,78,13); g.fillStyle = '#c42a1c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 10px "Courier New",monospace'; g.fillText('RADIO-QUAI', 95, 166.8);
});
// LA HALLE AUX GRAINS : charpente apparente, grande porte, banderole du comité, drapeau rouge au faîte
const m2Hall = () => fxSprite('M2HALL'+m2L(), 200, 150, g => {
  g.fillStyle = '#85796b'; g.fillRect(24,86,152,62);                                                           // murs de brique grise
  g.fillStyle = 'rgba(31,27,23,0.18)'; for (let y=90; y<148; y+=6) g.fillRect(24,y,152,0.8);
  g.fillStyle = '#6a6e76'; g.beginPath(); g.moveTo(10,88); g.lineTo(100,34); g.lineTo(190,88); g.closePath(); g.fill();   // toit de tôle
  g.strokeStyle = 'rgba(30,32,38,0.45)'; g.lineWidth = 0.8; g.beginPath(); for (let x=20; x<190; x+=9){ g.moveTo(x,88); g.lineTo(100+(x-100)*0.52, 36+Math.abs(x-100)*0.05); } g.stroke();
  g.strokeStyle = '#2b2a30'; g.lineWidth = 1.6; g.beginPath();                                                 // charpente : poteaux, tirant, entrait
  g.moveTo(24,148); g.lineTo(24,86); g.moveTo(176,148); g.lineTo(176,86); g.moveTo(24,86); g.lineTo(176,86);
  g.moveTo(100,38); g.lineTo(100,86); g.moveTo(24,86); g.lineTo(100,48); g.lineTo(176,86); g.stroke();
  g.lineWidth = 1; g.beginPath(); g.moveTo(62,67); g.lineTo(62,86); g.moveTo(138,67); g.lineTo(138,86); g.stroke();
  g.fillStyle = '#2b2a30'; g.fillRect(70,96,60,52);                                                            // grande porte coulissante
  g.fillStyle = 'rgba(255,224,170,0.5)'; g.fillRect(72,98,26,50);
  g.fillStyle = '#3a3a44'; g.fillRect(34,100,22,14); g.fillRect(144,100,22,14);
  g.fillStyle = '#c42a1c'; g.beginPath(); g.moveTo(20,64); g.quadraticCurveTo(100,72,180,62); g.lineTo(180,86); g.quadraticCurveTo(100,96,20,88); g.closePath(); g.fill();   // banderole
  g.strokeStyle = 'rgba(31,27,23,0.6)'; g.lineWidth = 0.8; g.stroke();
  g.fillStyle = '#f3e7cc'; g.textAlign = 'center'; g.textBaseline = 'middle'; m2Fit(g, cT(M2_TXT.hall), 140, 11); g.fillText(cT(M2_TXT.hall), 100, 77);
  g.strokeStyle = '#3a2a1c'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(100,34); g.lineTo(100,10); g.stroke();   // mât et drapeau
  g.fillStyle = '#c42a1c'; g.beginPath(); g.moveTo(100,10); g.lineTo(124,14); g.lineTo(100,22); g.closePath(); g.fill();
});
// GRILLE du port : deux piliers, linteau, panneau ; les barreaux coulissants sont dessinés en direct (m2DrawGate)
const m2GatePosts = () => fxSprite('M2GATE'+m2L(), 150, 130, g => {
  for (const x of [28,122]){ g.fillStyle = '#8a8a86'; g.fillRect(x-7,24,14,104); g.fillStyle = '#6e6e6a'; g.fillRect(x-9,20,18,6);
    g.fillStyle = 'rgba(255,240,210,0.3)'; g.fillRect(x-7,24,3,104); g.fillStyle = 'rgba(31,27,23,0.3)'; g.fillRect(x+3,24,4,104);
    g.fillStyle = '#c42a1c'; g.fillRect(x-7,60,14,4); g.fillStyle = '#e8e0d0'; g.fillRect(x-7,64,14,4); }       // chevrons de chantier
  g.fillStyle = '#6a6e76'; g.fillRect(21,26,108,6);                                                              // linteau
  g.fillStyle = '#efe6cf'; g.fillRect(34,4,82,18); g.strokeStyle = '#1f1b17'; g.lineWidth = 1; g.strokeRect(34.5,4.5,81,17);
  g.fillStyle = '#1f1b17'; g.textAlign = 'center'; g.textBaseline = 'middle'; const s = cT(M2_TXT.gate); m2Fit(g, s, 76, 7.5); g.fillText(s, 75, 13);
});
// portique de déchargement (calque avant, tronçon 2)
const m2Crane = v => fxSprite('M2CRANE'+v, 190, 250, g => {
  const C = ['#4f6a86','#8a4a3a','#5a6a58'][v%3], D = '#2b2a30';
  const beam = (pts, wd, col) => { g.strokeStyle = col || C; g.lineWidth = wd; g.lineCap = 'square'; g.beginPath(); for (let i=0;i<pts.length;i+=2) i? g.lineTo(pts[i],pts[i+1]) : g.moveTo(pts[i],pts[i+1]); g.stroke(); };
  beam([20,250, 34,52], 6); beam([100,250, 88,52], 6); beam([27,170, 94,170], 3); beam([30,110, 92,110], 3); beam([27,170, 91,110], 2); beam([94,170, 30,110], 2);
  beam([6,50, 120,50], 8); beam([112,50, 186,28], 5); beam([61,50, 61,16], 4); beam([61,16, 6,50], 1.6, D); beam([61,16, 186,28], 1.6, D);
  g.fillStyle = C; g.fillRect(40,24,40,24); g.fillStyle = 'rgba(190,225,245,0.7)'; g.fillRect(44,28,18,10);
  g.fillStyle = 'rgba(255,240,210,0.35)'; g.fillRect(18,52,3,196); g.fillRect(40,24,4,24);
  beam([150,38, 150,104], 1, D); g.fillStyle = [ '#b0843c','#3f6a6c','#8c4a36'][v%3]; g.fillRect(132,104,40,18); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let x=136;x<170;x+=5) g.fillRect(x,105,1,16);
});
// silo à grain (tronçon 3)
const m2Silo = () => fxSprite('M2SILO', 80, 210, g => {
  g.fillStyle = '#9a9ea6'; g.fillRect(8,40,64,170); g.beginPath(); g.ellipse(40,40,32,8,0,3.14,6.283); g.fill();
  g.fillStyle = '#7e838c'; g.beginPath(); g.moveTo(10,40); g.lineTo(40,6); g.lineTo(70,40); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,240,210,0.35)'; g.fillRect(8,40,10,170); g.fillStyle = 'rgba(40,44,54,0.3)'; g.fillRect(58,40,14,170);
  g.fillStyle = 'rgba(31,27,23,0.22)'; for (let y=70; y<210; y+=36) g.fillRect(8,y,64,2);
  g.strokeStyle = '#2b2a30'; g.lineWidth = 1; g.beginPath(); g.moveTo(40,6); g.lineTo(40,0); g.moveTo(52,52); g.lineTo(52,210); g.moveTo(58,52); g.lineTo(58,210); for (let y=60; y<210; y+=8){ g.moveTo(52,y); g.lineTo(58,y); } g.stroke();
  g.fillStyle = '#e9dfc6'; g.fillRect(14,92,34,14); g.fillStyle = '#c42a1c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 8px "Courier New",monospace'; g.fillText('COOP.', 31, 99.5);
});
// LE TERMINAL AUTOMATISÉ d'Omnicorp : portiques, portes coulissantes (en direct), bras robot (en direct)
const m2Terminal = () => fxSprite('M2TERM'+m2L(), 250, 190, g => {
  g.fillStyle = '#6d747e'; g.fillRect(40,70,170,120);                                                          // halle
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(40,70,170,6); g.fillStyle = 'rgba(31,27,23,0.25)'; g.fillRect(40,70,6,120);
  g.fillStyle = '#4b535e'; g.fillRect(34,62,182,10);
  g.strokeStyle = '#3a4350'; g.lineWidth = 5; g.beginPath(); g.moveTo(14,190); g.lineTo(26,22); g.moveTo(236,190); g.lineTo(224,22); g.moveTo(14,22); g.lineTo(236,22); g.stroke();   // portique
  g.lineWidth = 2; g.beginPath(); g.moveTo(26,22); g.lineTo(125,5); g.lineTo(224,22); g.stroke();
  g.fillStyle = '#0b6fa8'; g.fillRect(92,76,66,8); g.fillStyle = '#e9dfc6'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 8px "Courier New",monospace'; g.fillText('OMNICORP · TERMINAL', 125, 80.5);
  g.fillStyle = '#16181d'; g.fillRect(84,106,82,84);                                                            // baie des portes (vide)
});
// gros navires / embarcations : barge de débarquement et canonnière
const m2Barge = () => fxSprite('M2BARGE', 150, 40, g => {
  g.fillStyle = '#4b5562'; g.beginPath(); g.moveTo(4,16); g.lineTo(146,16); g.lineTo(138,36); g.lineTo(14,36); g.closePath(); g.fill();
  g.fillStyle = '#0b6fa8'; g.fillRect(10,22,130,3);
  g.fillStyle = '#5c6774'; g.fillRect(104,2,30,14); g.fillStyle = 'rgba(160,210,240,0.7)'; g.fillRect(108,6,22,4);
  g.fillStyle = '#e9dfc6'; g.font = '700 7px "Courier New",monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('OMNICORP · L-07', 16, 32);
  g.strokeStyle = 'rgba(20,20,26,0.6)'; g.lineWidth = 0.8; g.strokeRect(4.5,16.5,141,19);
});
const m2Gunboat = () => fxSprite('M2GUNB', 170, 56, g => {
  g.fillStyle = '#586270'; g.beginPath(); g.moveTo(2,26); g.lineTo(168,26); g.lineTo(150,52); g.lineTo(14,52); g.closePath(); g.fill();
  g.fillStyle = '#434b57'; g.fillRect(20,16,70,10); g.fillStyle = '#6a7482'; g.fillRect(96,6,40,20); g.fillStyle = 'rgba(160,210,240,0.7)'; g.fillRect(102,11,28,5);
  g.fillStyle = '#2f353f'; g.fillRect(36,8,26,10); g.strokeStyle = '#2f353f'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(60,12); g.lineTo(28,2); g.stroke();   // canon, pointé vers le quai
  g.fillStyle = '#0b6fa8'; g.fillRect(10,32,150,3); g.fillStyle = '#e9dfc6'; g.font = '700 8px "Courier New",monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('OMNICORP · C-02', 30, 46);
  g.strokeStyle = 'rgba(20,20,26,0.55)'; g.lineWidth = 0.8; g.strokeRect(2.5,26.5,164,24);
});
// emplacements neutres : un objet du port reconnaissable (le moteur dessine par-dessus le piquet « + » quand l'emplacement est libre)
function m2Prop(kind){ return fxSprite('M2P'+kind+m2L(), 110, 90, g => {
  const lab = (s, x, y, w, px) => { g.textAlign = 'center'; g.textBaseline = 'middle'; m2Fit(g, s, w, px||8); g.fillText(s, x, y); };
  if (kind===0){                                                                                                   // kiosque à journaux
    g.fillStyle = '#4a6a3a'; g.fillRect(30,34,50,52); g.fillStyle = '#3a5530'; g.fillRect(26,28,58,8);
    for (let i=0;i<6;i++){ g.fillStyle = i%2? '#efe6cf' : '#c42a1c'; g.beginPath(); g.moveTo(24+i*10,36); g.lineTo(34+i*10,36); g.lineTo(36+i*10,46); g.lineTo(26+i*10,46); g.closePath(); g.fill(); }   // auvent rayé
    g.fillStyle = '#e9dfc6'; for (let i=0;i<5;i++) g.fillRect(34+i*8,56,6,10); g.fillStyle = '#1f1b17'; g.fillRect(38,66,34,3);
    g.fillStyle = '#efe6cf'; g.fillRect(36,72,38,10); g.fillStyle = '#1f1b17'; lab(cT(M2_TXT.kiosk), 55, 77.5, 34, 7); }
  else if (kind===1){                                                                                              // local syndical
    g.fillStyle = '#9a5a3c'; g.fillRect(18,40,74,46); g.fillStyle = '#6a4630'; g.beginPath(); g.moveTo(12,40); g.lineTo(55,20); g.lineTo(98,40); g.closePath(); g.fill();
    g.fillStyle = 'rgba(40,20,12,0.28)'; for (let y=44; y<86; y+=6) g.fillRect(18,y,74,0.8);
    g.fillStyle = '#2b2a30'; g.fillRect(48,58,16,28); g.fillRect(26,50,14,12); g.fillRect(72,50,14,12);
    g.fillStyle = '#efe6cf'; g.fillRect(28,28,54,12); g.fillStyle = '#c42a1c'; lab(cT(M2_TXT.union), 55, 34.5, 50, 8);
    g.strokeStyle = '#3a2a1c'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(92,40); g.lineTo(92,10); g.stroke(); g.fillStyle = '#c42a1c'; g.beginPath(); g.moveTo(92,10); g.lineTo(108,14); g.lineTo(92,20); g.closePath(); g.fill(); }
  else if (kind===2){                                                                                              // guérite des douanes
    g.fillStyle = '#e9dfc6'; g.fillRect(38,28,34,58); for (let y=32; y<86; y+=14){ g.fillStyle = '#2f4a6a'; g.fillRect(38,y,34,7); }
    g.fillStyle = '#2f4a6a'; g.beginPath(); g.moveTo(32,28); g.lineTo(55,14); g.lineTo(78,28); g.closePath(); g.fill();
    g.fillStyle = 'rgba(160,210,240,0.8)'; g.fillRect(44,40,22,16); g.fillStyle = '#1f1b17'; g.fillRect(48,64,14,22);
    g.fillStyle = '#efe6cf'; g.fillRect(30,2,50,10); g.fillStyle = '#2f4a6a'; lab(cT(M2_TXT.customs), 55, 7.5, 46, 7.5); }
  else {                                                                                                           // abri des dockers
    g.fillStyle = '#7a6a58'; g.fillRect(16,40,6,46); g.fillRect(88,40,6,46); g.fillStyle = '#5c6470'; g.beginPath(); g.moveTo(8,40); g.lineTo(20,28); g.lineTo(90,28); g.lineTo(102,40); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,240,210,0.25)'; g.fillRect(14,38,84,3); g.fillStyle = '#86683f'; g.fillRect(28,70,54,5); g.fillRect(30,75,4,11); g.fillRect(76,75,4,11);
    g.fillStyle = '#e8b830'; g.beginPath(); g.arc(44,64,5,3.14,6.283); g.fill(); g.fillRect(39,64,10,2);
    g.fillStyle = '#efe6cf'; g.fillRect(28,16,54,11); g.fillStyle = '#1f1b17'; lab(cT(M2_TXT.dock), 55, 21.5, 50, 8); }
}); }

/* ---------- PLANCHES (repère 480×270, encre sur page de carnet) ----------
   Règles de la bible (§ 10) : un sujet par planche, au plus six éléments, un trait = un objet (contours fermés : le
   premier point est répété), silhouette avant détail, une seule couleur d'accent, un seul mouvement, texte en Courier gras.  */
const m2Circ = (cx, cy, r, n, a0, a1, ry) => { const o = []; a0 = a0==null? 0 : a0; a1 = a1==null? 6.2832 : a1; n = n||24;
  for (let i=0;i<=n;i++){ const a = a0 + (a1-a0)*i/n; o.push(cx+Math.cos(a)*r, cy+Math.sin(a)*(ry||r)); } return o; };
const m2Txt = (g, s, x, y, px, col, al) => { g.fillStyle = col || '#1f1b17'; g.textAlign = al || 'center'; g.textBaseline = 'middle'; m2Fit(g, s, 340, px); g.fillText(s, x, y); };
const m2Ground = (g, y, t, a) => { inkLine(g, [10,y, 470,y], clamp(t/1.2, 0, 1), 2.4); inkHatch(g, 10, y, 460, 270-y, 7, '#1f1b17', a==null? 0.2 : a); };
const M2_PL = {
  gate1: M2T("SITE DÉSAFFECTÉ","SITE DECOMMISSIONED","SITIO DESAFECTADO","STANDORT STILLGELEGT","SITO DISMESSO","LOCAL DESATIVADO","ОБЪЕКТ ЗАКРЫТ","厂区已停用","موقع مُعطَّل"),
  gate2: M2T("CONTINUITÉ DE SERVICE","SERVICE CONTINUITY","CONTINUIDAD DEL SERVICIO","DIENSTKONTINUITÄT","CONTINUITÀ DI SERVIZIO","CONTINUIDADE DO SERVIÇO","НЕПРЕРЫВНОСТЬ РАБОТЫ","服务连续性","استمرارية الخدمة"),
  gate3: M2T("ASSURÉE PAR GPT v6","ENSURED BY GPT v6","GARANTIZADA POR GPT v6","GESICHERT DURCH GPT v6","GARANTITA DA GPT v6","GARANTIDA POR GPT v6","ОБЕСПЕЧИВАЕТ GPT v6","由 GPT v6 保障","يضمنها GPT v6"),
  radio: M2T("RADIO-QUAI","RADIO-QUAI","RADIO-QUAI","RADIO-QUAI","RADIO-QUAI","RADIO-QUAI","RADIO-QUAI","RADIO-QUAI","RADIO-QUAI"),
  banner:M2T("ON NE DÉSAFFECTE PAS LES GENS","YOU CAN'T SCRAP PEOPLE","A LA GENTE NO SE LA DESECHA","MENSCHEN SIND KEIN SCHROTT","LE PERSONE NON SI DISMETTONO","GENTE NÃO SE DESATIVA","ЛЮДЕЙ НЕ СПИСЫВАЮТ","人不是报废品","البشر ليسوا خردة"),
  frag:  M2T("…DÉSAFFECTE PAS…","…CAN'T SCRAP…","…NO SE DESECHA…","…KEIN SCHROTT…","…NON SI DISMETTONO…","…NÃO SE DESATIVA…","…НЕ СПИСЫВАЮТ…","…不是报废品…","…ليسوا خردة…"),
  noon:  M2T("12 h 00","12:00","12:00","12:00","12:00","12h00","12:00","12:00","12:00"),

  // P1 · Les outils posés : un établi, trois outils à plat, l'horloge du mur — l'aiguille des minutes arrive sur 12 (6 h 00) et s'arrête
  tools(g, w, h, t){ plateBase(g, w, h, 'rgba(232,120,130,0.08)');
    const n = clamp(t/1.4, 0, 1);
    m2Ground(g, 190, t, 0.22);
    const hm = [78,182, 132,182, 132,190, 78,190, 78,182];                                       // marteau : manche, tête
    inkWash(g, hm, '#8a6a3a', 0.5); inkLine(g, hm, n, 1.8);
    const hh = [128,170, 152,170, 152,190, 128,190, 128,170];
    inkWash(g, hh, '#1f1b17', 0.7); inkLine(g, hh, n, 1.8); inkLine(g, [152,174, 160,190], n, 1.8);
    const wr = [204,178, 238,180, 238,188, 204,190, 204,178];                                    // clé plate : manche et deux mâchoires
    inkWash(g, wr, '#1f1b17', 0.3); inkLine(g, wr, n, 1.8);
    const wj = m2Circ(198,182,10,16, 0.5, 5.8); inkLine(g, wj, n, 1.8); inkLine(g, m2Circ(244,184,8,14), n, 1.8);
    const hat = m2Circ(330,190,28,20, 3.1416, 6.2832, 26).concat([302,190]);                      // casque de chantier : dôme, visière
    inkWash(g, hat, '#1f1b17', 0.32); inkLine(g, hat, n, 2);
    inkLine(g, [294,190, 366,190, 366,194, 294,194, 294,190], n, 1.8); inkLine(g, [330,166, 330,180], n, 1.4);
    const ring = m2Circ(400,70,22,28);                                                           // horloge ronde au mur
    inkWash(g, ring, '#efe6cf', 0.8); inkLine(g, ring, n, 2.2);
    for (let i=0;i<12;i++){ const a = i*Math.PI/6; inkLine(g, [400+Math.cos(a)*18, 70+Math.sin(a)*18, 400+Math.cos(a)*21, 70+Math.sin(a)*21], n, 1.2); }
    inkLine(g, [400,70, 400,85], n, 2.4);                                                        // petite aiguille sur 6
    const ang = -Math.PI/2 - (1 - ease(clamp((t-0.6)/3, 0, 1)))*1.1;                              // grande aiguille : arrive sur 12 puis s'arrête
    inkLine(g, [400,70, 400+Math.cos(ang)*17, 70+Math.sin(ang)*17], n, 2.2, '#c42a1c');
    plateEnd(g, w, h); },

  // P2 · Désaffecté : une grille d'usine fermée, un panneau, un voyant bleu qui clignote
  gate(g, w, h, t){ plateBase(g, w, h, 'rgba(140,150,175,0.12)');
    const n = clamp(t/1.5, 0, 1);
    m2Ground(g, 230, t, 0.2);
    for (const x of [112,352]){ const p = [x,230, x,80, x+16,80, x+16,230, x,230]; inkWash(g, p, '#1f1b17', 0.2); inkLine(g, p, n, 2.2); }
    inkLine(g, [128,96, 352,96], n, 2.2);
    for (let x=140; x<352; x+=14) inkLine(g, [x,96, x,228], n, 1.4);                              // barreaux
    const pn = [150,108, 330,108, 330,164, 150,164, 150,108];
    inkWash(g, pn, '#efe9db', 0.96); inkLine(g, pn, n, 1.8);
    inkLine(g, [180,96, 180,108], n, 1.2); inkLine(g, [300,96, 300,108], n, 1.2);
    if (t>0.8){ m2Txt(g, cT(M2_PL.gate1), 240, 123, 12.5); m2Txt(g, cT(M2_PL.gate2), 240, 136, 12.5); m2Txt(g, cT(M2_PL.gate3), 240, 150, 12.5); }
    g.fillStyle = Math.sin(t*5)>0? '#0b6fa8' : 'rgba(11,111,168,0.22)'; g.beginPath(); g.arc(360, 98, 4.6, 0, 6.283); g.fill();   // voyant bleu
    plateEnd(g, w, h); },

  // P3 · Radio-Quai à l'aube : le quai, l'eau, la maisonnette de briques, le mât, le soleil à demi levé, une mouette
  dawn(g, w, h, t){ plateBase(g, w, h, 'rgba(250,150,100,0.12)');
    const n = clamp(t/1.8, 0, 1), sy = 204 - ease(clamp(t/8, 0, 1))*8;                          // le soleil monte de 8 px
    inkWash(g, m2Circ(86,sy,40,24, 3.1416, 6.2832, 38), '#e8a53c', 0.5);
    inkLine(g, m2Circ(86,sy,40,24, 3.1416, 6.2832, 38), n, 1.6, '#e8a53c');
    inkLine(g, [10,200, 470,200], n, 2.6);
    inkWash(g, [10,200, 470,200, 470,206, 10,206], '#1f1b17', 0.35);                              // lèvre du quai
    for (let i=0;i<3;i++){ const y = 218+i*13, wv = []; for (let x=10;x<=470;x+=20) wv.push(x, y+Math.sin(x*0.08+i*2+t*0.8)*2.2); inkLine(g, wv, n, 1.2); }
    const hs = [300,200, 300,164, 380,164, 380,200, 300,200];                                    // maisonnette de briques
    inkWash(g, hs, '#a45a3a', 0.5); inkLine(g, hs, n, 2);
    inkLine(g, [294,164, 340,140, 386,164, 294,164], n, 2); inkWash(g, [294,164, 340,140, 386,164], '#1f1b17', 0.25);
    inkHatch(g, 300, 164, 80, 36, 6, '#7a3a22', 0.3);
    if (t>1) m2Txt(g, cT(M2_PL.radio), 340, 176, 12, '#1f1b17');
    inkLine(g, [340,140, 340,28], n, 2);                                                         // le mât
    for (const [x2,y2] of [[286,198],[394,198],[262,200],[418,200]]) inkLine(g, [340, 40+(Math.abs(x2-340)>60? 30 : 0), x2, y2], n, 1);   // quatre haubans
    inkLine(g, [334,36, 346,36], n, 1.4); inkLine(g, [334,70, 346,70], n, 1.4);
    const bx = -20 + (t*30)%520, by = 80 + Math.sin(t*2)*4;                                       // une mouette (un « v ») traverse
    inkLine(g, [bx-8,by-3, bx,by+2, bx+8,by-3], 1, 1.4);
    plateEnd(g, w, h); },

  // P4 · Mado : une banderole tendue entre deux bâtons, Mado de face au mégaphone, cinq silhouettes derrière
  mado(g, w, h, t){ plateBase(g, w, h, 'rgba(255,238,190,0.06)');
    const n = clamp(t/1.6, 0, 1);
    m2Ground(g, 230, t, 0.2);
    for (const [x,s] of [[116,58],[172,64],[312,64],[366,58],[410,52]]) inkFolk(g, x, 230, s, 'rgba(31,27,23,0.45)');   // cinq silhouettes derrière
    inkLine(g, [60,230, 60,56], n, 2.6); inkLine(g, [420,230, 420,56], n, 2.6);                   // les deux bâtons
    const wv = Math.sin(t*1.6)*3, top = [], bot = [];
    for (let i=0;i<=12;i++){ const x = 60+i*30, s = Math.sin(i*0.9+t*1.8)*wv; top.push(x, 70+s); bot.push(x, 110+s); }
    const poly = []; for (let i=0;i<top.length;i+=2) poly.push(top[i], top[i+1]); for (let i=bot.length-2;i>=0;i-=2) poly.push(bot[i], bot[i+1]);
    inkWash(g, poly, '#efe6cf', 0.95); inkLine(g, poly.concat([poly[0], poly[1]]), n, 2);
    if (t>0.9) m2Txt(g, cT(M2_PL.banner), 240, 91+Math.sin(t*1.8+4)*wv, 15, '#1f1b17');
    inkFolk(g, 240, 230, 90, '#1f1b17', 0.7);                                                    // Mado : silhouette agrandie, bras levé
    inkWash(g, [222,142, 224,132, 240,126, 256,132, 258,142, 248,138, 232,138], '#2f4a6a', 0.9);   // bonnet
    inkWash(g, [226,146, 240,151, 254,146, 258,152, 240,160, 222,152], '#c42a1c', 0.95);           // écharpe : le seul rouge
    inkWash(g, [270,138, 292,124, 300,134, 280,148], '#c8b27a', 1); inkLine(g, [270,138, 292,124, 300,134, 280,148, 270,138], n, 1.6);   // mégaphone
    plateEnd(g, w, h); },

  // P5 · L'antenne : contre-plongée sur le mât, une petite silhouette sur l'échelle, des ondes rouges vers la droite
  antenna(g, w, h, t){ plateBase(g, w, h, 'rgba(140,185,235,0.08)');
    const n = clamp(t/1.6, 0, 1);
    inkLine(g, [236,252, 236,22], n, 2.4); inkLine(g, [244,252, 244,22], n, 2.4);                // le mât (deux montants)
    for (let y=244; y>26; y-=16) inkLine(g, [236,y, 244,y-8], n, 1);
    for (const [x2,y2] of [[40,262],[130,266],[350,266],[440,262]]) inkLine(g, [240,34, x2,y2], n, 1);   // quatre haubans
    inkLine(g, [226,250, 226,92], n, 1.4); inkLine(g, [232,250, 232,92], n, 1.4);                // l'échelle
    for (let y=246; y>96; y-=10) inkLine(g, [226,y, 232,y], n, 1);
    inkFolk(g, 229, 150, 26, '#1f1b17', 0.5);
    inkWash(g, [234,20, 246,20, 246,26, 234,26], '#1f1b17', 0.7);
    for (let i=0;i<5;i++){ const age = (t - i*0.6); if (age<0 || age>2.6) continue; const r = 14 + age*42;     // arcs rouges, un toutes les 0,6 s
      inkLine(g, m2Circ(246,24,r,14, -0.8, 0.8), 1, 2, 'rgba(196,42,28,'+(0.95*(1-age/2.6)).toFixed(3)+')'); }
    plateEnd(g, w, h); },

  // P6 · L'Hexagone : le pays, très simple ; Valmont en rouge ; onze points qui s'allument un par un, reliés à Valmont
  hexa(g, w, h, t){ plateBase(g, w, h);
    const hx = [240,40, 340,90, 340,190, 240,240, 140,190, 140,90, 240,40];
    inkWash(g, hx, '#c8b27a', 0.2); inkLine(g, hx, clamp(t/1.2, 0, 1), 2.2);
    const V = [305,92], P = [[190,78],[250,70],[170,120],[220,112],[285,128],[320,150],[190,160],[245,160],[285,188],[215,205],[265,215]];
    P.forEach((p,i)=>{ const on = clamp((t - 1.2 - i*0.35)/0.5, 0, 1);
      if (on>0){ const mx = (V[0]+p[0])/2, my = (V[1]+p[1])/2 - 14, pts = []; for (let s=0;s<=10;s++){ const u = s/10; pts.push((1-u)*(1-u)*V[0]+2*u*(1-u)*mx+u*u*p[0], (1-u)*(1-u)*V[1]+2*u*(1-u)*my+u*u*p[1]); }
        inkLine(g, pts, on, 1.2, '#c42a1c'); }
      g.fillStyle = on>=1? '#c42a1c' : 'rgba(31,27,23,0.45)'; g.beginPath(); g.arc(p[0], p[1], on>=1? 4.6 : 3.4, 0, 6.283); g.fill(); });
    g.fillStyle = '#c42a1c'; g.beginPath(); g.arc(V[0], V[1], 6.5, 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(196,42,28,0.5)'; g.lineWidth = 1.4; g.beginPath(); g.arc(V[0], V[1], 10+3*Math.sin(t*4), 0, 6.283); g.stroke();
    m2Txt(g, cT(M2_PL.noon), 20, 32, 18, '#1f1b17', 'left');
    plateEnd(g, w, h); },

  // P7 · Le bipeur, 3 % : le bipeur de la mission I (même cadre), « 55 · 3 % » défile de droite à gauche, deux fois
  pager(g, w, h, t){ plateBase(g, w, h);
    const n = clamp(t/1.2, 0, 1);
    inkLine(g, [30,210, 450,210], n, 3); inkHatch(g, 30, 210, 420, 30, 6);
    const body = [170,210, 176,150, 304,150, 310,210, 170,210];
    inkWash(g, body, '#23292b', 0.9); inkLine(g, body, n, 2);
    inkWash(g, [190,160, 290,160, 290,190, 190,190], '#9db79a', 1); inkLine(g, [190,160, 290,160, 290,190, 190,190, 190,160], n, 1.4);
    inkLine(g, [70,210, 84,184, 150,184, 160,210], n, 2);
    const s = '55 · 3 %'; g.save(); g.beginPath(); g.rect(192,162,96,26); g.clip();
    g.fillStyle = '#1b2a1c'; g.font = '700 20px "Courier New",monospace'; g.textBaseline = 'middle'; g.textAlign = 'left';
    const u = clamp((t-1.0)/6, 0, 1)*2, tw = g.measureText(s).width;
    if (u<2){ const x = 288 - (u%1)*(96+tw); g.fillText(s, x, 176); } else { g.textAlign = 'center'; g.fillText(s, 240, 176); }
    g.restore();
    if (t>0.6) for (let i=0;i<3;i++){ const r = ((t*0.9+i/3)%1); g.strokeStyle = 'rgba(11,111,168,'+(0.5*(1-r)).toFixed(3)+')'; g.lineWidth = 1.6; g.beginPath(); g.arc(240, 150, 20+r*70, 3.5, 5.9); g.stroke(); }
    plateEnd(g, w, h); },

  // P8 · La rivière sèche : une vallée, un barrage au fond, le lit craquelé au premier plan, brume de chaleur
  river(g, w, h, t){ plateBase(g, w, h, 'rgba(215,160,70,0.15)');
    const n = clamp(t/1.8, 0, 1);
    const L = [0,170, 40,140, 100,118, 160,126, 220,160], R = [260,160, 330,120, 400,112, 450,138, 480,150];     // deux collines
    inkWash(g, L.concat([220,168, 0,176]), '#8a6a3a', 0.28); inkLine(g, L, n, 2);
    inkWash(g, R.concat([480,158, 260,168]), '#8a6a3a', 0.28); inkLine(g, R, n, 2);
    const dm = [190,160, 200,120, 280,120, 290,160, 190,160];                                    // le barrage, au fond
    inkWash(g, dm, '#8a8a86', 0.6); inkLine(g, dm, n, 2); inkHatch(g, 200, 120, 80, 40, 6, '#1f1b17', 0.3);
    const bed = [212,160, 268,160, 440,262, 40,262, 212,160];                                    // le lit de la rivière
    inkWash(g, bed, '#b9955a', 0.5); inkLine(g, bed, n, 1.8);
    for (const c of [[240,160, 236,200, 214,230],[236,200, 262,214, 280,242],[225,222, 190,236, 160,256],[262,214, 300,222, 360,250],[214,230, 232,250],[300,222, 296,258],[330,236, 320,262]]) inkLine(g, c, n, 1.2);   // fissures
    for (let i=0;i<2;i++){ const wv = []; for (let x=30;x<=450;x+=15) wv.push(x + Math.sin(t*0.9+i*2)*10, 100+i*14+Math.sin(x*0.06+t*1.2+i)*3); inkLine(g, wv, 1, 1, 'rgba(120,80,30,0.45)'); }   // brume de chaleur
    plateEnd(g, w, h); },

  // P9 · Les banderoles : sur le sol du quai, une banderole froissée, une flaque, un bâton cassé
  banners(g, w, h, t){ plateBase(g, w, h, 'rgba(90,100,112,0.12)');
    const n = clamp(t/1.6, 0, 1);
    m2Ground(g, 160, t, 0.22);
    const fl = m2Circ(350,206,64,24, 0, 6.2832, 20);                                             // la flaque
    inkWash(g, fl, '#4a6a88', 0.3); inkLine(g, fl, n, 1.4, '#4a6a88');
    const r = ((t*0.5)%1); inkLine(g, m2Circ(350,206,10+r*40,20, 0,6.2832, (10+r*40)*0.3), 1, 1.1, 'rgba(74,106,136,'+(0.6*(1-r)).toFixed(3)+')');
    const bn = [40,200, 120,178, 210,186, 290,172, 300,214, 210,232, 120,226, 40,238, 40,200];   // la banderole froissée
    inkWash(g, bn, '#c42a1c', 0.78); inkLine(g, bn, n, 2);
    inkLine(g, [120,178, 130,226], n, 1.2); inkLine(g, [210,186, 214,232], n, 1.2);              // plis
    g.save(); g.translate(166, 208); g.rotate(-0.08); m2Txt(g, cT(M2_PL.frag), 0, 0, 16, '#efe6cf'); g.restore();
    inkLine(g, [320,140, 378,150, 410,168], n, 2.6); inkLine(g, [410,168, 440,176, 448,190], n, 2.6);   // le bâton cassé
    inkLine(g, [410,168, 418,162], n, 1.2);
    plateEnd(g, w, h); },
};

// pager de 55 (planche partagée : la mission III s'en sert aussi, ne pas renommer)
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
