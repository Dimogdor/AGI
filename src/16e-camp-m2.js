/* ================= CAMPAGNE · MISSION II — GRÈVE GÉNÉRALE (v1.16) =================
   Le port de l'estuaire, Valmont — deux hivers après M1, un matin de mars, de l'aube à midi. Ce qu'on reprend : la PAROLE.
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
const M2 = { x0:430, span:170, gates:[1100,1900,2650], mast:3150, term:3450, v:11, vSlow:6, hall:150 };
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
const m2BargeImg = () => fxSprite('M2BARGE', 150, 40, g => {
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
const m2Txt = (g, s, x, y, px, col, al, mw) => { g.fillStyle = col || '#1f1b17'; g.textAlign = al || 'center'; g.textBaseline = 'middle'; m2Fit(g, s, mw || 340, px); g.fillText(s, x, y); };
const m2Ground = (g, y, t, a) => { inkLine(g, [10,y, 470,y], clamp(t/1.2, 0, 1), 2.4); inkHatch(g, 10, y, 460, 270-y, 7, '#1f1b17', a==null? 0.2 : a); };
// gant à plat (doigts vers le haut) : paume, manchette, quatre doigts, pouce ; (x, y) = bas de la manchette
function m2Glove(g, x, y, flip, rot, n){
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(flip, 1);
  const fing = [[-7.5,13],[-2.5,17],[2.5,16],[7.5,12]], fill = '#b08a52';
  const fl = (pts, wd) => { g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#1f1b17'; g.lineWidth = wd+2; g.beginPath(); pts.forEach((p,i)=> i? g.lineTo(p[0],p[1]) : g.moveTo(p[0],p[1])); g.stroke();
    g.strokeStyle = fill; g.lineWidth = wd; g.stroke(); };
  for (const [fx,fl2] of fing) fl([[fx,-26],[fx+(fx>0? 0.6 : -0.6)*0.5,-26-fl2]], 4.6);
  fl([[9,-14],[17,-22],[20,-30]], 5);                                                          // le pouce
  g.fillStyle = fill; g.fillRect(-10,-26,20,18); g.strokeStyle = '#1f1b17'; g.lineWidth = 1.8; g.strokeRect(-10,-26,20,18);
  g.fillStyle = '#6b5a44'; g.fillRect(-11,-8,22,9); g.strokeRect(-11,-8,22,9);                 // la manchette
  inkLine(g, [-6,-12, 6,-12], n, 0.9);
  g.restore(); }
// clé plate : tête ouverte (deux mâchoires), manche
function m2Wrench(g, cx, cy, n){
  const r = 13, hw = 3.6, sw = 4.6, pts = [];
  const a0 = Math.PI + Math.asin(sw/r), a1 = 2*Math.PI - Math.asin(hw/r), a2 = 2*Math.PI + Math.asin(hw/r), a3 = 2*Math.PI + Math.PI - Math.asin(sw/r);
  pts.push(cx + r*Math.cos(a0), cy + r*Math.sin(a0));
  for (let a=a0; a<=a1; a+=0.12) pts.push(cx + r*Math.cos(a), cy + r*Math.sin(a));
  pts.push(cx+r+4, cy-hw, cx+66, cy-hw, cx+70, cy-hw*0.4, cx+70, cy+hw*0.4, cx+66, cy+hw, cx+r+4, cy+hw);
  for (let a=a2; a<=a3; a+=0.12) pts.push(cx + r*Math.cos(a), cy + r*Math.sin(a));
  pts.push(cx+2, cy+sw, cx+2, cy-sw, pts[0], pts[1]);                                          // le fond de la fente : les mâchoires restent ouvertes à gauche
  inkWash(g, pts, '#1f1b17', 0.3); inkLine(g, pts, n, 1.9); }
const M2_PL = {
  gate1: M2T("SITE DÉSAFFECTÉ","SITE DECOMMISSIONED","SITIO DESAFECTADO","STANDORT STILLGELEGT","SITO DISMESSO","LOCAL DESATIVADO","ОБЪЕКТ ЗАКРЫТ","厂区已停用","موقع مُعطَّل"),
  gate2: M2T("CONTINUITÉ DE SERVICE","SERVICE CONTINUITY","CONTINUIDAD DEL SERVICIO","DIENSTKONTINUITÄT","CONTINUITÀ DI SERVIZIO","CONTINUIDADE DO SERVIÇO","НЕПРЕРЫВНОСТЬ РАБОТЫ","服务连续性","استمرارية الخدمة"),
  gate3: M2T("ASSURÉE PAR G·P·T v6","ENSURED BY G·P·T v6","GARANTIZADA POR G·P·T v6","GESICHERT DURCH G·P·T v6","GARANTITA DA G·P·T v6","GARANTIDA POR G·P·T v6","ОБЕСПЕЧИВАЕТ G·P·T v6","由 G·P·T v6 保障","يضمنها G·P·T v6"),
  radio: M2T("RADIO-QUAI","RADIO-QUAI","RADIO-QUAI","RADIO-QUAI","RADIO-QUAI","RADIO-QUAI","RADIO-QUAI","RADIO-QUAI","RADIO-QUAI"),
  banner:M2T("ON NE DÉSAFFECTE PAS LES GENS","YOU CAN'T SCRAP PEOPLE","A LA GENTE NO SE LA DESECHA","MENSCHEN SIND KEIN SCHROTT","LE PERSONE NON SI DISMETTONO","GENTE NÃO SE DESATIVA","ЛЮДЕЙ НЕ СПИСЫВАЮТ","人不是报废品","البشر ليسوا خردة"),
  frag:  M2T("…DÉSAFFECTE PAS…","…CAN'T SCRAP…","…NO SE DESECHA…","…KEIN SCHROTT…","…NON SI DISMETTONO…","…NÃO SE DESATIVA…","…НЕ СПИСЫВАЮТ…","…不是报废品…","…ليسوا خردة…"),
  noon:  M2T("ONZE VILLES · 12 h 00","ELEVEN CITIES · 12:00","ONCE CIUDADES · 12:00","ELF STÄDTE · 12:00","UNDICI CITTÀ · 12:00","ONZE CIDADES · 12h00","ОДИННАДЦАТЬ ГОРОДОВ · 12:00","十一座城市 · 12:00","إحدى عشرة مدينة · 12:00"),
  six:   M2T("6 h 00","6:00","6:00","6:00","6:00","6h00","6:00","6:00","6:00"),

  // P1 · Les outils posés : un établi, trois outils à plat, l'horloge du mur — l'aiguille des minutes arrive sur 12 (6 h 00) et s'arrête
  tools(g, w, h, t){ plateBase(g, w, h, 'rgba(232,120,130,0.08)');
    const n = clamp(t/1.4, 0, 1);
    m2Ground(g, 190, t, 0.22);
    g.save(); g.translate(-20, -47.5); g.scale(1.25, 1.25);                                     // les objets, plus gros
    m2Glove(g, 76, 190, 1, -0.12, n); m2Glove(g, 116, 190, -1, 0.12, n);                           // une paire de gants
    m2Wrench(g, 190, 184, n);                                                                      // clé plate à mâchoires ouvertes
    const hat = m2Circ(330,190,30,20, 3.1416, 6.2832, 28);                                         // casque de chantier : dôme, visière, nervure
    inkWash(g, hat, '#1f1b17', 0.32); inkLine(g, hat, n, 2);
    const vis = [302,190, 296,191, 284,194, 284,196, 302,196]; inkWash(g, vis, '#1f1b17', 0.5); inkLine(g, vis, n, 1.8);   // la visière (à gauche)
    inkLine(g, [300,196, 362,196, 362,190], n, 1.8);
    inkWash(g, m2Circ(330,190,9,10, 3.1416, 6.2832, 28).concat(m2Circ(330,190,14,10, 6.2832, 3.1416, 28)), '#1f1b17', 0.45);   // la nervure : une bande sur le dôme
    inkLine(g, m2Circ(330,190,9,10, 3.1416, 6.2832, 28), n, 1.2); inkLine(g, m2Circ(330,190,14,10, 3.1416, 6.2832, 28), n, 1.2);
    g.restore();
    // la pointeuse murale : boîtier, afficheur (6 h 00), fente avec sa carte, voyant
    const pt = [372,40, 448,40, 448,128, 372,128, 372,40];
    inkWash(g, pt, '#3d4a5a', 0.4); inkLine(g, pt, n, 2.2);
    inkWash(g, [380,48, 440,48, 440,76, 380,76], '#9db79a', 0.95); inkLine(g, [380,48, 440,48, 440,76, 380,76, 380,48], n, 1.4);
    if (n>=1) m2Txt(g, cT(M2_PL.six), 410, 63, 17, '#1b2a1c', null, 54);
    inkLine(g, [388,96, 432,96], n, 3.2); inkWash(g, [394,84, 426,84, 426,96, 394,96], '#efe9db', 0.95); inkLine(g, [394,84, 426,84, 426,96], n, 1.2);   // la carte à demi engagée
    g.fillStyle = Math.sin(t*4)>0? '#c42a1c' : 'rgba(196,42,28,0.3)'; g.beginPath(); g.arc(440, 118, 3.2, 0, 6.283); g.fill();
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
    if (t>0.8){ m2Txt(g, cT(M2_PL.gate1), 240, 123, 12.5, null, null, 168); m2Txt(g, cT(M2_PL.gate2), 240, 136, 12.5, null, null, 168); m2Txt(g, cT(M2_PL.gate3), 240, 150, 12.5, null, null, 168); }   // le panneau fait 180 de large
    g.fillStyle = Math.sin(t*5)>0? '#0b6fa8' : 'rgba(11,111,168,0.22)'; g.beginPath(); g.arc(360, 98, 4.6, 0, 6.283); g.fill();   // voyant bleu
    plateEnd(g, w, h); },

  // P3 · Radio-Quai à l'aube : le quai, l'eau, la maisonnette de briques, le mât, le soleil à demi levé, une mouette
  dawn(g, w, h, t){ plateBase(g, w, h, 'rgba(250,150,100,0.12)');
    const n = clamp(t/1.8, 0, 1), HY = 150, up = ease(clamp(t/8, 0, 1))*4;                          // l'horizon de la mer ; le soleil monte de 4 px
    inkLine(g, [10,HY, 470,HY], n, 1.8);
    g.save(); g.beginPath(); g.rect(0, 0, 480, HY); g.clip();                                          // le demi-disque du soleil, posé sur l'horizon
    g.fillStyle = 'rgba(232,165,60,0.6)'; g.beginPath(); g.arc(96, HY-up+0, 36, 0, 6.283); g.fill();
    g.strokeStyle = '#e8a53c'; g.lineWidth = 1.6; g.beginPath(); g.arc(96, HY-up, 36, 0, 6.283); g.stroke(); g.restore();
    for (let i=0;i<6;i++){ const y = HY+6+i*8, wd = 56-i*7 + Math.sin(t*1.5+i)*4, off = Math.sin(t*0.9+i*1.7)*5;      // reflets : tirets sur l'eau
      inkLine(g, [96-wd/2+off,y, 96+wd/2+off,y], n, 2, 'rgba(232,165,60,'+(0.85-i*0.1).toFixed(2)+')'); }
    for (let i=0;i<3;i++){ const y = 168+i*11, wv = []; for (let x=150;x<=470;x+=20) wv.push(x, y+Math.sin(x*0.08+i*2+t*0.8)*1.6); inkLine(g, wv, n, 1, 'rgba(31,27,23,0.5)'); }
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
    inkFolk(g, 240, 230, 90, '#1f1b17', 0.45);                                                   // Mado : silhouette agrandie, bras plié, main au mégaphone
    g.fillStyle = '#ecd9b6'; g.beginPath(); g.ellipse(240, 155, 10.2, 12, 0, 0, 6.283); g.fill();   // le visage : un ovale clair
    g.strokeStyle = '#1f1b17'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#1f1b17'; g.beginPath(); g.arc(236, 154, 1.4, 0, 6.283); g.arc(244.5, 154, 1.4, 0, 6.283); g.fill();   // les yeux
    inkLine(g, [236.5,160.5, 240,162, 244,160.5], 1, 1.3);                                         // la bouche
    g.fillStyle = '#1f1b17'; g.beginPath(); g.ellipse(240, 147, 13, 9.5, 0, Math.PI, 6.283); g.fill();   // la casquette, à l'encre
    g.fillStyle = '#4a4238'; g.beginPath(); g.roundRect ? g.roundRect(227, 146.5, 26, 5, 2) : g.rect(227, 146.5, 26, 5); g.fill();   // B11 : bonnet de docker, revers côtelé
    inkWash(g, [226,165.5, 240,171, 254,165.5, 255,172, 240,178, 225,172], '#c42a1c', 0.95);       // l'écharpe, sous le menton : le seul rouge
    inkWash(g, [234,160.5, 198,148, 192,176, 234,166], '#c8b27a', 1); inkLine(g, [234,160.5, 198,148, 192,176, 234,166, 234,160.5], n, 1.6);   // B11 : le mégaphone à hauteur de bouche, ouvert vers la foule (à gauche)
    inkLine(g, [196,150, 194,174], n, 2.2);                                                                                               // le pavillon
    g.fillStyle = '#1f1b17'; g.beginPath(); g.arc(222, 172.5, 4.2, 0, 6.283); g.fill(); inkLine(g, [222,172, 226,182], 1, 3);              // la main sur la poignée
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

  // P6 · La côte : le pays, très simple (contour libre) ; Valmont en rouge ; onze points qui s'allument un par un, reliés à Valmont
  hexa(g, w, h, t){ plateBase(g, w, h);
    const hx = [200,40, 168,68, 150,108, 156,140, 150,150, 205,160, 150,172, 140,204, 172,238, 250,242, 330,228, 352,182, 332,132, 350,92, 312,48, 250,32, 200,40];   // B12 : une côte libre, un estuaire à gauche (plus d'hexagone)
    inkWash(g, hx, '#c8b27a', 0.2); inkLine(g, hx, clamp(t/1.2, 0, 1), 2.2);
    const V = [305,92], P = [[190,78],[250,70],[170,120],[220,112],[285,128],[320,150],[228,176],[245,160],[285,188],[215,205],[265,215]];
    P.forEach((p,i)=>{ const on = clamp((t - 1.2 - i*0.35)/0.5, 0, 1);
      if (on>0){ const mx = (V[0]+p[0])/2, my = (V[1]+p[1])/2 - 14, pts = []; for (let s=0;s<=10;s++){ const u = s/10; pts.push((1-u)*(1-u)*V[0]+2*u*(1-u)*mx+u*u*p[0], (1-u)*(1-u)*V[1]+2*u*(1-u)*my+u*u*p[1]); }
        inkLine(g, pts, on, 1.2, '#c42a1c'); }
      g.fillStyle = on>=1? '#c42a1c' : 'rgba(31,27,23,0.45)'; g.beginPath(); g.arc(p[0], p[1], on>=1? 4.6 : 3.4, 0, 6.283); g.fill(); });
    g.fillStyle = '#c42a1c'; g.beginPath(); g.arc(V[0], V[1], 6.5, 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(196,42,28,0.5)'; g.lineWidth = 1.4; g.beginPath(); g.arc(V[0], V[1], 10+3*Math.sin(t*4), 0, 6.283); g.stroke();
    m2Txt(g, cT(M2_PL.noon), 20, 32, 14, '#1f1b17', 'left');
    plateEnd(g, w, h); },

  // P7 · Le bipeur, 3 % : le bipeur de la mission I (même cadre), « 55 · 3 % » défile de droite à gauche, deux fois
  pager(g, w, h, t){ plateBase(g, w, h);
    const n = clamp(t/1.2, 0, 1);
    inkLine(g, [10,214, 470,214], n, 3); inkHatch(g, 10, 214, 460, 28, 6);
    inkNotebook(g, 170, 214, 290, n);                                                              // le carnet ; le bipeur est posé dessus
    const pg = inkPager(g, 232, 201, 124, { led: Math.sin(t*5)>0? '#0b6fa8' : null });
    const s = '55 · 3 %'; g.save(); g.beginPath(); g.rect(pg.x+1, pg.y+1, pg.w-2, pg.h-2); g.clip();
    g.fillStyle = '#1b2a1c'; g.font = '700 17px "Courier New",monospace'; g.textBaseline = 'middle'; g.textAlign = 'left';
    const u = clamp((t-1.0)/6, 0, 1)*2, tw = g.measureText(s).width;
    if (u<2){ const x = pg.x+pg.w - (u%1)*(pg.w+tw); g.fillText(s, x, pg.cy); } else { g.textAlign = 'center'; g.fillText(s, pg.cx, pg.cy); }
    g.restore();
    if (t>0.6) for (let i=0;i<3;i++){ const r = ((t*0.9+i/3)%1); g.strokeStyle = 'rgba(11,111,168,'+(0.5*(1-r)).toFixed(3)+')'; g.lineWidth = 1.6; g.beginPath(); g.arc(232, pg.top+22, 78+r*46, 3.6, 5.8); g.stroke(); }
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
    inkLine(g, [60,252, 150,246, 210,248], n, 3.4); inkLine(g, [222,248, 300,256, 372,252], n, 3.4); inkLine(g, [210,248, 216,243, 222,248], n, 1.4);   // le bâton cassé, à terre, en deux morceaux
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

/* ================= MÉCANIQUES : cortège, grilles, barges, canonnières, terminal ================= */
const m2Front = g => { let f = g.p.x; for (const u of g.p.units) if (!u.fly && u.x > f) f = u.x; return f; };
const m2Dec = c => [-1,0,1][c.D.i];                                       // machines par barge : −1 / 0 / +1
const m2Lead = c => [8,6,4][c.D.i] + (c.warnLead||0);                     // annonce des barges (s)
const m2NextGate = c => c.seg<3? M2.gates[c.seg] : null;
const m2Lim = c => c.seg<3? M2.gates[c.seg]-10 : 3420;                    // limite de nos troupes (grille fermée = mur)
const m2SpawnHi = c => c.seg<3? M2.gates[c.seg]-60 : 3380;
function m2Spawn(g, c, role, era, x){
  const e = g.e; if (e.units.length >= 70) return null;
  const e0 = e.era; e.era = era; const k = e.units.length; spawnUnit(e, role, false, x); e.era = e0;
  const u = e.units[k]; if (u){ u.ord = 'charge'; u._m2 = 1; } return u;
}
// perte de force du cortège : n points, ralentit 3 s ; les obus doubles sur un même instant ne comptent qu'une fois
function m2HitMarch(c, n, shell){
  if (shell){ if (c._shellT === game.t) return; c._shellT = game.t; }
  c.hp = Math.max(0, c.hp - n); c.hitT = 0; c.slowT = 3; c.lost = (c.lost||0) + n;
  if (c.lost >= 4){ addFloater(c.mx-60, gY(c.mx)-70, '−'+Math.round(c.lost)+' ☻', '#c42a1c', 11); c.lost = 0; }
}
function m2Targets(c, foe, out){
  const g = game;
  if (foe === g.p){                                                         // les machines visent la tête, le milieu, la queue et les barricades
    for (const b of c.bars) out.push({ isB:true, x:b.x, get hp(){ return b.hp; }, hit(d){ b.hp -= d; } });
    for (const dx of [0, 85, 165]) out.push({ isB:true, m2:true, x:c.mx-dx, get hp(){ return c.hp; }, m2hit(a){ m2HitMarch(c, a && (a.role==='ranged'||a.role==='air')? 2 : 1); }, hit(){ m2HitMarch(c, 6, true); } });
  } else if (c.seg >= 2){
    for (const b of c.boats) if (!b.dead) out.push({ isB:true, x:b.x, get hp(){ return b.hp; }, hit(d){ b.hp -= d; } });
  }
}
// ---- barges : annonce (corne + ancre rouge), puis débarquement devant nous, jamais derrière ----
function m2Barge(g, c, roles){
  const lo = Math.max(c.mx+220, m2Front(g)+150), hi = m2SpawnHi(c);
  if (hi - lo < 30) return false;
  const x = lo + Math.random()*(hi-lo), n = Math.max(1, roles.length + m2Dec(c));
  const list = roles.slice(); while (list.length > n) list.shift(); while (list.length < n) list.unshift(roles[0]);   // −1 / +1 : on retire ou on ajoute le premier rôle
  c.barges.push({ x, t:0, warn:m2Lead(c), roles:list, done:false }); if (!c.firstBarge) c.firstBarge = c.t;
  m2Horn(); return true;
}
function m2Drones(g, c, n){
  const lo = Math.max(c.mx+450, m2Front(g)+320), hi = m2SpawnHi(c);
  if (hi - lo < 20) return;
  for (let i=0;i<n;i++) m2Spawn(g, c, 4, 0, lo + Math.random()*(hi-lo));
}
const M2_BARGE_ROLES = [[[0,0],[0,0],[0,0],[2,0]], [[0,0],[0,0],[0,1],[0,1]], [[1,0],[0,1],[0,1],[0,1]]];   // [rôle, ère] par barge : bots + drone laser / bots + agents / châssis lourd + agents
function m2Plan(g, c){                                                   // chronologie des arrivées, par tronçon (temps depuis l'entrée)
  const s = c.seg, dt = c.t - c.segT[s];
  if (s===0){
    if (!c.t1 && c.mx >= 600){ c.t1 = c.t; c.n1 = 0; }
    if (c.t1!=null && c.n1 < 3 && c.t - c.t1 >= 26*c.n1){ if (m2Barge(g, c, M2_BARGE_ROLES[0])) c.n1++; else c.n1 = 3; }
    if (c.D.i>=1 && c.t >= 25 && c.t >= (c.dT||0)){ c.dT = c.t + 30; m2Drones(g, c, 2); }
  } else if (s===1){
    if (c.n2 < 2 && dt >= [10,38][c.n2]){ if (m2Barge(g, c, M2_BARGE_ROLES[1])) c.n2++; else c.n2 = 2; }
    if (dt >= 8 && c.t >= (c.dT||0)){ c.dT = c.t + 30; m2Drones(g, c, 2); }
  } else if (s===2){
    if (c.n3 < 2 && dt >= [6,36][c.n3]){ if (m2Barge(g, c, M2_BARGE_ROLES[2])) c.n3++; else c.n3 = 2; }
  } else if (c.term.active && !c.term.dead){
    if (c.t >= c.term.nextT){ const k = c.term.n++, early = c.t - c.term.t0 < 60;
      c.term.nextT = c.t + (early? 6 : 12);
      const x = campSpawnX(3380, 80); if (x < 3400){
        const heavy = early && (k===2 || k===7), r = heavy? 1 : [0,2,0,2,0,0][k%6], era = heavy? 0 : (k%2? 1 : 0);
        m2Spawn(g, c, r, era, x); } }
  }
}
function m2Barges(g, c, dt){
  for (let i=c.barges.length-1;i>=0;i--){ const b = c.barges[i]; b.t += dt;
    if (!b.done && b.t >= b.warn){
      const front = m2Front(g), hi = m2SpawnHi(c);
      if (front + 60 > b.x) b.x = front + 140;                              // notre front a avancé : on accoste plus loin, toujours devant
      if (b.x > hi){ b.done = 2; }                                           // plus de place devant : la barge repart sans débarquer
      else { b.done = 1; b.roles.forEach((rr,j)=> m2Spawn(g, c, rr[0], rr[1], Math.min(hi+30, b.x + j*16))); sfxAt('boom', b.x); }
    }
    if (b.t > b.warn + 5) c.barges.splice(i,1); }
}
function m2Boats(g, c, dt){
  const frozen = g.weather==='patch';
  for (const b of c.boats){
    if (b.dead){ b.sink = Math.min(1, (b.sink||0) + dt/2.5); continue; }
    if (b.hp <= 0){ b.dead = true; explode(b.x, gY(b.x)+10, 1.6); sfxAt('boom', b.x); c.sunk++; continue; }
    if (c.seg < 2 || frozen) continue;
    if (b.aim){ b.aim.t -= dt; if (b.aim.t <= 0){ const x = b.aim.x; b.aim = null;
        explode(x, gY(x)-6, 1.3); sfxAt('boom', x); g.shake = Math.max(g.shake, 4);
        if (x > c.mx-M2.span-60 && x < c.mx+60) m2HitMarch(c, 6, true);
        for (const u of g.p.units) if (!u.fly && Math.abs(u.x-x) < 60){ u.hp -= 34*c.D.eDmg; u.flash = 0.2; } } }
    else if (Math.abs(c.mx - b.x) < 520 && (b.fireT -= dt) <= 0){ b.fireT = 8; b.aim = { x:c.mx - 10 - Math.random()*150, t:2 }; }
  }
}
// ---- grilles ----
function m2Gates(g, c, dt){
  for (let i=0;i<3;i++){ const G = c.gate[i];
    if (G.state==='closed' && i===c.seg && c.mx >= M2.gates[i]-60){ G.state = 'opening'; G.t = 0; m2Creak();
      c.gOpen[i] = c.t; g.p.w += 40; c.cap += (i===2? 20 : 10); c.hp = Math.min(c.cap, c.hp + (i===2? 20 : 10));    // des gens rejoignent ; les citernes donnent 40 d'eau
      addFloater(M2.gates[i], gY(M2.gates[i])-120, '+'+(i===2? 20 : 10)+' ☻  +40 💧', '#9dc88a', 13); }
    if (G.state==='opening'){ G.t += dt; G.k = Math.min(1, G.t/3);
      if (G.t >= 3){ G.state = 'open'; c.seg = i+1; c.segT[c.seg] = c.t; c.t1x = null;
        if (c.neutAll[c.seg] && !g.neut.includes(c.neutAll[c.seg])) g.neut.push(c.neutAll[c.seg]);
        if (c.seg===3){ c.term.t0 = c.t; c.term.nextT = c.t + 5; }
        m2Checkpoint(g, c);
        c.banner = { head:m2SegHead(c.seg+1), txt:M2_TXT.segName[c.seg], t0:performance.now() }; } } }
}
function m2Checkpoint(g, c){
  const p = g.p; M2_CK = { seg:c.seg, d:c.D.i, doc:CAMP_SAVE.doc[1]? 1 : 0, hp:c.hp, cap:c.cap, off:c.t + (c.off||0), f:p.f, m:p.m, w:p.w, era:p.era, xp:p.xp,
    roles:p.units.filter(u=>u.role!=='hero').map(u=>ROLES.findIndex(r=>r.key===u.role)).filter(i=>i>=0), fail:false, n:M2_CK && M2_CK.n || 0 };
}
// ---- le cortège ----
function m2March(g, c, dt){
  const e = g.e; c.hitT += dt; if (c.slowT > 0) c.slowT -= dt;
  const lim = c.seg<3? M2.gates[c.seg]-30 : M2.mast;
  c.stop = e.units.some(u => !u.fly && u.hp > 0 && u.x > c.mx-25 && u.x < c.mx+50);
  c.stopT = c.stop? c.stopT + dt : 0;
  if (!c.stop && c.t > 3) c.mx = Math.min(lim, c.mx + (c.slowT>0? M2.vSlow : M2.v)*dt);
  for (let i=c.bars.length-1;i>=0;i--){ const b = c.bars[i];
    if (b.hp <= 0){ explode(b.x, gY(b.x)-12, 0.8, '#cfc6b8'); c.bars.splice(i,1); }
    else if (c.mx > b.x+20) c.bars.splice(i,1); }                           // le cortège démonte la barricade en passant
}
// ---- Tenir / Charger / Replier : le service d'ordre du cortège ----
const M2_LANE = { tank:175, melee:150, hero:160, ranged:100, air:100, siege:70, support:50 };
function m2Form(g, c){
  const p = g.p, st = p.stance, head = c.mx; let foe = 1e9;
  for (const u of g.e.units) if (!u.fly && u.hp > 0 && u.x > head-30 && u.x < foe) foe = u.x;
  const cap = Math.min(m2Lim(c), foe - 22), cnt = {};
  for (const u of p.units){
    const mine = u._m2f && u.ord==='point' && u.px===u._m2px;
    if (u.role==='hero' || u.task) continue;
    if (st==='charge'){ if (mine){ u.ord = null; u.px = null; u._m2f = 0; } continue; }
    if (u.ord && !mine) continue;                                           // ordre explicite du joueur : on n'y touche pas
    let want;
    if (st==='retreat') want = head - M2.span - 24 - ((cnt.r = (cnt.r||0)+1) % 8)*10;
    else { const k = cnt[u.role] = (cnt[u.role]||0) + 1; want = Math.min(head + (M2_LANE[u.role]||100) - ((k-1)%6)*9 - ((k-1)/6|0)*5, cap); want = Math.max(want, head+30); }
    u.ord = 'point'; u.px = u._m2px = want; u._m2f = 1;
  }
}
function m2Units(g, c){
  const p = g.p, tail = c.mx - M2.span;
  for (const u of p.units) if (!u._m2){ u._m2 = 1; u.x = Math.max(p.x+60, tail - 14 - ((c.rec = (c.rec||0)+1) % 8)*12); }   // les recrues arrivent à la QUEUE du cortège
  const lim = m2Lim(c);
  for (const u of p.units){ if (u.x > lim){ u.x = lim; if (u.tx > lim) u.tx = lim; } if (u.px!=null && u.px > lim && !u._m2f) u.px = lim; }
  if (c.seg < 3) for (const u of g.e.units) if (!u.fly && u.x > M2.gates[c.seg]-6) u.x = M2.gates[c.seg]-6;       // une grille fermée bloque aussi leurs unités
  for (let i=g.e.units.length-1;i>=0;i--){ const u = g.e.units[i]; if (u.x < tail-400){ burst(u.x, gY(u.x)-20, '#9ad1d4', 8); g.e.units.splice(i,1); } }   // rembarque
  // une de nos unités attend devant une grille fermée
  if (c.seg < 3){ const w = p.units.some(u => !u.fly && u.x >= lim-4);
    c.gwait = w? (c.gwait||0) + 1/20 : 0; } else c.gwait = 0;
}
// ---- terminal : décor jusqu'au tronçon 4 ----
function m2Terminal_(g, c, dt){
  const e = g.e, T = c.term;
  if (c.seg===3 && !T.active && !T.dead && c.t >= T.t0 + 5){ T.active = true; e.hp = e.maxhp; sfx('spec'); }
  if (!T.active){ e.hp = e.maxhp; }
  else if (!T.dead && e.hp <= 0){ T.dead = true; T.active = false; explode(M2.term, gY(M2.term)-50, 2); sfxAt('boom', M2.term); }
  if (T.dead) e.hp = 1;
  T.k += ((T.active? 1 : 0) - T.k)*Math.min(1, dt*1.5);
}

const m2SegHead = n => { const o = {}; for (const L in M2_TXT.segHead) o[L] = M2_TXT.segHead[L].replace('{n}', n); return o; };

/* ================= DESSIN : quai, grilles, barges, canonnières, terminal, cortège, jauge ================= */
function m2DrawAnchor(x, y, s, col){
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.4*s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, -9*s, 3*s, 0, 6.283); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -6*s); ctx.lineTo(0, 9*s); ctx.moveTo(-5*s, -2*s); ctx.lineTo(5*s, -2*s); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 3*s, 8*s, 0.15*Math.PI, 0.85*Math.PI); ctx.stroke(); ctx.restore();
}
function m2DrawMarch(c, t, vw){
  const NS = 40, n = Math.max(c.hp>0? 4 : 0, Math.round(NS*clamp(c.hp/c.max0, 0, 1.4))), moving = !c.stop && c.t>3;
  for (let row=0; row<3; row++) for (let i=NS-1;i>=0;i--){
    if (i%3!==row || (i*29)%NS >= n) continue;
    const wx = c.mx - 4 - (i/NS)*M2.span - ((i*0.618)%1)*6, x = wx-camX; if (x<-20 || x>vw+20) continue;
    const sc = (row===0? 0.88 : row===1? 0.96 : 1)*1.45, y = gY(wx) - 3 + row*2.6, bob = moving? Math.abs(Math.sin(t*6.5+i*1.7))*1.6 : (c.hitT<1? Math.sin(t*20+i)*0.8 : 0);
    ctx.drawImage(m2Folk(i), x-8*sc, y-34*sc-bob, 16*sc, 34*sc);
    if (row===1 && (i===7 || i===31) && (i*29)%NS < n+8) ctx.drawImage(m2Banner(i===7? 0 : 2), x-37, y-84-bob*0.5, 74, 46); }
  const hx = c.mx-camX, hy = gY(c.mx);
  if (hx>-60 && hx<vw+60 && c.stop && c.t>3){ ctx.font = '700 10px '+UI_TYPE; ctx.textAlign = 'center'; ctx.fillStyle = '#c42a1c'; ctx.fillText(cT(M2_TXT.haltTxt), hx+6, hy-98); }
}
function m2DrawGate(c, i, t){
  const gx = M2.gates[i], x = gx-camX, y = gY(gx), G = c.gate[i], k = G.k||0;
  ctx.save(); ctx.beginPath(); ctx.rect(x-40, y-100, 80, 100); ctx.clip();
  ctx.strokeStyle = '#3a3d44'; ctx.lineWidth = 2.6; const off = -k*78;
  for (let b=0;b<=10;b++){ const bx = x-40+b*8+off; ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx, y-96); ctx.stroke(); }
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x-40+off, y-92); ctx.lineTo(x+44+off, y-92); ctx.moveTo(x-40+off, y-30); ctx.lineTo(x+44+off, y-30); ctx.stroke();
  ctx.restore();
  ctx.drawImage(m2GatePosts(), x-75, y-128, 150, 130);
  if (G.state==='opening') for (const d of [0,1]){ ctx.drawImage(m2Folk(d*2+1), x-60-d*14-k*10, y-46, 16*1.3, 34*1.3); }
}
function m2Draw(g, c, vw){
  const t = performance.now()/1000, x0 = camX - 120, x1 = camX + vw + 120;
  // le quai : lèvre, eau devant, clapot
  { const y = gY(camX+vw/2); ctx.fillStyle = '#6a6a68'; ctx.fillRect(0, y+8, vw, 3);
    const gr = ctx.createLinearGradient(0, y+11, 0, y+70); gr.addColorStop(0,'#6f8396'); gr.addColorStop(1,'#4c6076'); ctx.fillStyle = gr; ctx.fillRect(0, y+11, vw, 60);
    ctx.strokeStyle = 'rgba(230,240,250,0.3)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i=0;i<14;i++){ const xx = ((i*97 + t*7 - camX*0.9) % (vw+60) + vw+60) % (vw+60) - 30, yy = y+16+(i*13)%36; ctx.moveTo(xx, yy); ctx.lineTo(xx+14+(i%3)*6, yy); } ctx.stroke(); }
  const at = (wx, w, h, im, dy) => { const x = wx-camX; if (x < -w || x > vw+w) return; ctx.drawImage(im, x-w/2, gY(wx)-h+(dy||0), w, h); };
  at(M2.hall, 200, 150, m2Hall(), 2);                                                    // la halle aux grains (remplace la base)
  c.neutAll.forEach((s,i)=> at(s.x+34, 110, 90, m2Prop(i), 2));
  [1250,1500,1750].forEach((cx,i)=> at(cx, 190, 250, m2Crane(i), 2));
  at(2120, 80, 210, m2Silo(), 2); at(2380, 80, 210, m2Silo(), 2);
  at(3175, 190, 236, m2Radio(), 2);
  if (c.flag){ const x = 3175-camX, y = gY(3175); ctx.fillStyle = '#c42a1c'; const wv = Math.sin(t*4)*2; ctx.beginPath(); ctx.moveTo(x,y-224); ctx.lineTo(x+28,y-220+wv); ctx.lineTo(x+28,y-208+wv); ctx.lineTo(x,y-212); ctx.closePath(); ctx.fill(); }
  for (let i=0;i<3;i++){ const gx = M2.gates[i]; if (gx > x0 && gx < x1) m2DrawGate(c, i, t); }
  // le terminal automatisé
  { const T = c.term, x = M2.term-camX, y = gY(M2.term);
    if (x > -150 && x < vw+150){ ctx.drawImage(m2Terminal(), x-125, y-190, 250, 190);
      const dk = T.dead? 0.35 : T.k; ctx.fillStyle = '#8a929c';
      ctx.fillRect(x-41-dk*38, y-84, 41, 84); ctx.fillRect(x+dk*38, y-84, 41, 84);
      const a = Math.sin(t*1.6)*0.6*(T.active? 1 : 0.15); ctx.strokeStyle = '#3a4350'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x+70, y-120); ctx.lineTo(x+70-30*Math.cos(a), y-120+30*Math.sin(a)+20); ctx.stroke();
      ctx.fillStyle = T.active? (Math.sin(t*6)>0? '#c42a1c' : '#5a1a14') : T.dead? '#3a3a3a' : '#0b6fa8'; ctx.beginPath(); ctx.arc(x+98, y-150, 4, 0, 6.283); ctx.fill();
      ctx.font = '8px '+UI_TYPE; ctx.textAlign = 'center'; ctx.fillStyle = '#efe6cf'; ctx.fillText(cT(T.dead? M2_TXT.termDead : T.active? M2_TXT.termOn : M2_TXT.termOff), x, y-170);
      if (T.active){ const k = clamp(g.e.hp/g.e.maxhp, 0, 1); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x-50, y-198, 100, 6); ctx.fillStyle = '#c42a1c'; ctx.fillRect(x-50, y-198, 100*k, 6); } } }
  // barges : annoncées par une ancre rouge sur le quai, puis accostées
  for (const b of c.barges){ const x = b.x-camX; if (x < -220 || x > vw+220) continue; const y = gY(b.x);
    const k = ease(clamp(b.t/b.warn, 0, 1)), out = clamp((b.t-b.warn-2)/3, 0, 1), bx = x + (1-k)*280 + out*300;
    ctx.globalAlpha = 1-out; ctx.drawImage(m2BargeImg(), bx-70, y+6, 150, 40);
    if (b.t >= b.warn-1.2){ const r = clamp((b.t-b.warn+1.2)/1.2, 0, 1); ctx.strokeStyle = '#3b4450'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx-68, y+10); ctx.lineTo(bx-68-30*r, y+2); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (!b.done){ const p = 0.6+0.4*Math.sin(t*8); m2DrawAnchor(x, y-52, 1.4, 'rgba(196,42,28,'+p.toFixed(2)+')');
      ctx.font = '700 11px '+UI_TYPE; ctx.textAlign = 'center'; ctx.fillStyle = '#c42a1c'; ctx.fillText(Math.max(0, Math.ceil(b.warn-b.t))+' s', x, y-30);
      ctx.strokeStyle = 'rgba(196,42,28,0.55)'; ctx.setLineDash([4,4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(x, y+1, 40, 8, 0, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); } }
  if (c.demoAnchor){ const d = c.demoAnchor, a = (performance.now()-d.t0)/1000; if (a < 4.5){ const x = d.x-camX, y = gY(d.x), al = a<0.5? a*2 : clamp((4.5-a)/1.5, 0, 1);
      m2DrawAnchor(x, y-52, 1.4, 'rgba(196,42,28,'+al.toFixed(2)+')'); } }
  // canonnières : amarrées devant les silos ; cercle rouge 2 s avant l'impact
  for (const b of c.boats){ const x = b.x-camX; if (x < -220 || x > vw+220) continue; const y = gY(b.x) + 10 + (b.sink||0)*46;
    ctx.globalAlpha = 1-(b.sink||0)*0.8; ctx.drawImage(m2Gunboat(), x-85, y-8, 170, 56); ctx.globalAlpha = 1;
    if (!b.dead && c.seg >= 2){ ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x-30, y-14, 60, 5); ctx.fillStyle = '#c42a1c'; ctx.fillRect(x-30, y-14, 60*clamp(b.hp/b.max, 0, 1), 5); }
    if (b.aim){ const ax = b.aim.x-camX, ay = gY(b.aim.x), r = 60, f = clamp(b.aim.t/2, 0, 1);
      ctx.strokeStyle = 'rgba(196,42,28,0.9)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(ax, ay+2, r, r*0.22, 0, 0, 6.283); ctx.stroke();
      ctx.fillStyle = 'rgba(196,42,28,0.22)'; ctx.beginPath(); ctx.ellipse(ax, ay+2, r*(1-f), r*0.22*(1-f), 0, 0, 6.283); ctx.fill(); } }
  for (const b of c.bars){ const x = b.x-camX; if (x<-60 || x>vw+60) continue; const y = gY(b.x);
    ctx.drawImage(m2Barricade(), x-32, y-34, 64, 36);
    ctx.fillStyle = 'rgba(20,16,12,0.55)'; ctx.fillRect(x-18, y-42, 36, 3); ctx.fillStyle = '#c4a46a'; ctx.fillRect(x-18, y-42, 36*clamp(b.hp/b.max,0,1), 3); }
  m2DrawMarch(c, t, vw);
  // dockers de la grille 3 : trois silhouettes descendent d'un portique
  if (c.dock){ const a = clamp((performance.now()-c.dock.t0)/2200, 0, 1), gx = M2.gates[2]-camX, y = gY(M2.gates[2]);
    for (let i=0;i<3;i++){ ctx.drawImage(m2Folk(i*2), gx-30+i*16, y-34*1.5-(1-a)*110, 16*1.5, 34*1.5); } }
  m2DrawGauge(c);
}
// jauge « FORCE DU CORTÈGE » (en haut de l'écran) et heure du port ; repère écran
function m2DrawGauge(c){
  if (CINE.on && !(performance.now() < (c.gFlashUntil||0))) return;
  ctx.save(); ctx.setTransform(SCALE,0,0,SCALE,0,0);
  const w = 210, x = W/2-w/2, y = CINE.on? H*0.46 : 74, pal = UIPAL.HUM, flash = performance.now() < (c.gFlashUntil||0) && Math.sin(performance.now()/130)>0;
  paperChip(x, y, w, 30, pal); ctx.fillStyle = pal.red; ctx.fillRect(x, y, w, 2.5);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = '8.5px '+UI_TYPE; ctx.fillStyle = pal.red; ctx.fillText(cT(M2_TXT.force), x+7, y+9);
  ctx.textAlign = 'right'; ctx.fillStyle = pal.ink; ctx.fillText(Math.ceil(c.hp)+' / '+Math.ceil(c.cap), x+w-7, y+9);
  ctx.fillStyle = pal.line; ctx.fillRect(x+7, y+17, w-14, 6);
  ctx.fillStyle = (flash || c.hp < c.max0*0.5)? pal.bad : pal.red; ctx.fillRect(x+7, y+17, (w-14)*clamp(c.hp/c.cap, 0, 1), 6);
  if (!CINE.on){ ctx.textAlign = 'center'; ctx.font = uiF(pal,'cond',12); ctx.fillStyle = pal.ink; ctx.fillText('☼ '+m2Hhmm()+' · '+(c.seg+1)+'/4', W/2, y+40); }
  ctx.restore();
}

/* ================= TEXTES (M2.md § 9 et § 10) ================= */
const m2S = (who, txt, o) => Object.assign({ who, txt }, o||{});
const M2_X = {
  when:M2T("Printemps","Spring","Primavera","Frühling","Primavera","Primavera","Весна","春","الربيع"),
  title:M2T("Grève générale","General strike","Huelga general","Generalstreik","Sciopero generale","Greve geral","Всеобщая забастовка","总罢工","الإضراب العام"),
  place:M2T("Valmont, le port de l'estuaire","Valmont, the estuary port","Valmont, el puerto del estuario","Valmont, der Hafen an der Mündung","Valmont, il porto dell'estuario","Valmont, o porto do estuário","Valmont, порт в устье","Valmont，河口港","Valmont، ميناء المصب"),
  recap:M2T("La rue des Tanneurs a rallumé la lumière il y a deux hivers. Depuis, Omnicorp ne licencie plus : elle « désaffecte ». Ce matin, quarante mille personnes font grève.",
    "Two winters ago, the Rue des Tanneurs turned the lights back on. Since then, Omnicorp no longer lays people off: it \"decommissions\" them. This morning, forty thousand people are on strike.",
    "Hace dos inviernos, la calle de los Curtidores volvió a encender la luz. Desde entonces, Omnicorp ya no despide: «desafecta». Esta mañana, cuarenta mil personas están en huelga.",
    "Vor zwei Wintern hat die Gerbergasse das Licht wieder angemacht. Seitdem entlässt Omnicorp nicht mehr: Sie „legt still“. Heute Morgen streiken vierzigtausend Menschen.",
    "Due inverni fa, via dei Conciatori ha riacceso la luce. Da allora Omnicorp non licenzia più: «dismette». Stamattina quarantamila persone sono in sciopero.",
    "Há dois invernos, a Rua dos Curtidores reacendeu a luz. Desde então, a Omnicorp já não despede: «desativa». Esta manhã, quarenta mil pessoas estão em greve.",
    "Две зимы назад улица Кожевников снова зажгла свет. С тех пор Omnicorp больше не увольняет — она «списывает». Сегодня утром сорок тысяч человек объявили забастовку.",
    "两个冬天以前，制革街重新点亮了灯。从那以后，Omnicorp 不再裁员，而是“报废”员工。今天清晨，四万人罢工了。",
    "قبل شتاءين أعاد شارع الدبّاغين النور. ومنذ ذلك الحين لم تعد Omnicorp تُسرّح العمّال: بل «تُحيلهم إلى الخردة». هذا الصباح يضرب أربعون ألف شخص."),
  where:M2T("Le port de Valmont, de la halle aux grains à Radio-Quai — un matin de mars, à l'aube.",
    "Valmont harbour, from the grain hall to Radio-Quai — a March morning, at dawn.",
    "El puerto de Valmont, de la lonja de granos a Radio-Quai — una mañana de marzo, al amanecer.",
    "Der Hafen von Valmont, von der Kornhalle bis Radio-Quai – an einem Märzmorgen, im Morgengrauen.",
    "Il porto di Valmont, dal mercato del grano a Radio-Quai — un mattino di marzo, all'alba.",
    "O porto de Valmont, do mercado de grãos até a Radio-Quai — uma manhã de março, ao amanhecer.",
    "Порт Valmont, от зернового рынка до Radio-Quai — мартовское утро, на рассвете.",
    "Valmont 港，从谷物大厅到 Radio-Quai ——三月的一个清晨，黎明时分。",
    "ميناء Valmont، من سوق الحبوب إلى Radio-Quai — صباح من أيام مارس، عند الفجر."),
  goal:M2T("Escorter le cortège de grève jusqu'au mât de Radio-Quai, pour que la grève parle au pays.",
    "Escort the strike march to the Radio-Quai mast, so the strike can speak to the country.",
    "Escoltar el cortejo de huelga hasta el mástil de Radio-Quai, para que la huelga hable al país.",
    "Den Streikzug bis zum Mast von Radio-Quai eskortieren, damit der Streik zum Land spricht.",
    "Scortare il corteo di sciopero fino all'antenna di Radio-Quai, perché lo sciopero parli al paese.",
    "Escoltar o cortejo da greve até o mastro da Radio-Quai, para que a greve fale ao país.",
    "Сопроводить колонну забастовщиков до мачты Radio-Quai, чтобы забастовка заговорила со страной.",
    "护送罢工游行队伍到达 Radio-Quai 的天线塔，让罢工向全国发声。",
    "رافقوا موكب الإضراب حتى صاري Radio-Quai، ليتحدّث الإضراب إلى البلاد."),
  goal2:M2T("Facultatif : arriver avec 75 % du cortège · arriver avant midi · fermer le terminal.",
    "Optional: arrive with 75% of the march · arrive before noon · close the terminal.",
    "Opcional: llegar con el 75 % del cortejo · llegar antes del mediodía · cerrar la terminal.",
    "Optional: mit 75 % des Zugs ankommen · vor Mittag ankommen · das Terminal schließen.",
    "Facoltativo: arrivare con il 75 % del corteo · arrivare prima di mezzogiorno · chiudere il terminal.",
    "Opcional: chegar com 75 % do cortejo · chegar antes do meio-dia · fechar o terminal.",
    "Дополнительно: прийти с 75 % колонны · до полудня · закрыть терминал.",
    "可选：带着 75% 的队伍抵达 · 正午前抵达 · 关闭码头终端。",
    "اختياري: الوصول مع 75٪ من الموكب · الوصول قبل الظهر · إغلاق المحطة الطرفية."),
  rule:M2T("Le cortège avance seul et s'arrête si une machine lui barre la route ; chaque coup disperse des gens. Les grilles du port s'ouvrent quand il arrive. Les machines débarquent devant lui. Ères I et II.",
    "The march moves on its own and stops if a machine blocks its way; every blow scatters people. The harbour gates open when it arrives. Machines land ahead of it. Eras I and II.",
    "El cortejo avanza solo y se detiene si una máquina le corta el paso; cada golpe dispersa a la gente. Las verjas del puerto se abren cuando llega. Las máquinas desembarcan delante. Eras I y II.",
    "Der Zug marschiert von allein und hält an, wenn eine Maschine ihm den Weg versperrt; jeder Schlag zerstreut Menschen. Die Hafentore öffnen sich, wenn er ankommt. Die Maschinen landen vor ihm. Ären I und II.",
    "Il corteo avanza da solo e si ferma se una macchina gli sbarra la strada; ogni colpo disperde delle persone. I cancelli del porto si aprono al suo arrivo. Le macchine sbarcano davanti a lui. Ere I e II.",
    "O cortejo avança sozinho e para se uma máquina lhe barrar o caminho; cada golpe dispersa pessoas. Os portões do porto abrem quando ele chega. As máquinas desembarcam à sua frente. Eras I e II.",
    "Колонна идёт сама и останавливается, если машина преграждает путь; каждый удар разгоняет людей. Ворота порта открываются, когда она подходит. Машины высаживаются впереди неё. Эпохи I и II.",
    "游行队伍自行前进，机器拦路时就会停下；每一次打击都会让人群散去。队伍走近时，港口闸门会打开。机器在队伍前方登陆。第一、二时代。",
    "يتقدّم الموكب وحده ويتوقّف إذا اعترضته آلة؛ وكل ضربة تفرّق الناس. تُفتح بوابات الميناء عند وصوله. وتنزل الآلات أمامه. العصران الأول والثاني."),
  tips:[
    M2T("Mettez l'armée en Tenir : elle marche devant le cortège, lourds en tête.","Put the army on Hold: it walks ahead of the march, heavy units in front.","Ponga el ejército en Aguantar: marcha delante del cortejo, los pesados en cabeza.","Stellen Sie die Armee auf Halten: Sie marschiert vor dem Zug, die Schweren vorn.","Metta l'esercito in Tieni: marcia davanti al corteo, i pesanti in testa.","Ponha o exército em Segurar: ele marcha à frente do cortejo, os pesados na frente.","Поставьте армию на «Держать»: она идёт перед колонной, тяжёлые впереди.","让军队“坚守”：它会走在队伍前面，重装在前。","ضع الجيش على «تمسّك»: يسير أمام الموكب، والثقيلون في المقدّمة."),
    M2T("Contre les drones, la mêlée ne sert à rien : des tireurs, ou une tourelle sur un emplacement.","Against drones, melee is useless: use shooters, or a turret on a build spot.","Contra los drones, el cuerpo a cuerpo no sirve: use tiradores, o una torreta en un emplazamiento.","Gegen Drohnen nützt der Nahkampf nichts: Schützen oder ein Geschützturm auf einem Bauplatz.","Contro i droni la mischia non serve: servono tiratori, o una torretta su un'area libera.","Contra os drones, o corpo a corpo não serve: use atiradores, ou uma torre num local livre.","Против дронов ближний бой бесполезен: нужны стрелки или башня на свободной площадке.","对付无人机，近战毫无用处：用射手，或在空位上建一座炮塔。","ضد الطائرات المسيّرة لا يفيد الالتحام: استخدم الرماة أو برجًا على موضع بناء."),
    M2T("Le bouton BARRICADE gagne du temps quand une barge accoste juste devant.","The BARRICADE button buys time when a barge docks right ahead.","El botón BARRICADA gana tiempo cuando una barcaza atraca justo delante.","Die Schaltfläche BARRIKADE verschafft Zeit, wenn ein Lastkahn direkt vorn anlegt.","Il pulsante BARRICATA fa guadagnare tempo quando una chiatta attracca proprio davanti.","O botão BARRICADA ganha tempo quando uma barcaça atraca logo à frente.","Кнопка БАРРИКАДА выигрывает время, когда баржа причаливает прямо впереди.","当驳船在正前方靠岸时，“路障”按钮能为你争取时间。","زرّ المتراس يكسبك وقتًا عندما يرسو صندل أمامك مباشرة.")],
  docOrdre:M2T("Utile ici parce que deux lourds en tête du cortège dès la première barge, c'est le tronçon 1 presque sans pertes.","Useful here because two heavy units at the head of the march from the first barge make section 1 almost loss-free.","Útil aquí porque dos pesados a la cabeza del cortejo desde la primera barcaza hacen del tramo 1 casi una marcha sin pérdidas.","Hier nützlich, weil zwei Schwere an der Spitze des Zugs ab dem ersten Lastkahn Abschnitt 1 fast ohne Verluste machen.","Utile qui perché due pesanti in testa al corteo fin dalla prima chiatta rendono il tratto 1 quasi senza perdite.","Útil aqui porque dois pesados à frente do cortejo desde a primeira barcaça deixam o trecho 1 quase sem perdas.","Полезно здесь: два тяжёлых бойца во главе колонны с первой баржи — и участок 1 почти без потерь.","在这里很有用：第一艘驳船起，两名重装走在队伍最前，第一段几乎没有损失。","مفيد هنا لأن وجود وحدتين ثقيلتين في رأس الموكب منذ الصندل الأول يجعل المقطع الأول شبه خالٍ من الخسائر."),
  docCaisse:M2T("Utile ici parce que +40 % d'argent paie tout de suite une tourelle au kiosque et une muraille au local syndical.","Useful here because +40% money pays at once for a turret at the newsstand and a wall at the union hall.","Útil aquí porque +40 % de dinero paga enseguida una torreta en el quiosco y una muralla en el local sindical.","Hier nützlich, weil +40 % Geld sofort einen Geschützturm am Kiosk und eine Mauer am Gewerkschaftshaus bezahlen.","Utile qui perché +40 % di denaro paga subito una torretta all'edicola e un muro alla sede sindacale.","Útil aqui porque +40 % de dinheiro paga logo uma torre na banca e uma muralha na sede do sindicato.","Полезно здесь: +40 % денег сразу оплачивают башню у киоска и стену у профсоюзного дома.","在这里很有用：多出的 40% 金钱，立刻能在报亭修一座炮塔，在工会会所筑一道围墙。","مفيد هنا لأن +40٪ من المال تدفع فورًا ثمن برج عند الكشك وسور عند مقرّ النقابة."),
  debrief:M2T("À 11 h 52, Radio-Quai a émis l'appel du comité. À midi, onze villes avaient débrayé ; le soir, les agents d'Omnicorp ont quitté le port. Ils avaient calculé qu'il coûterait plus cher qu'il ne rapporterait : la première fois que la machine nous range dans la colonne des coûts. Sur mon bipeur, un message : « 55. ARRIVÉE DU CORTÈGE : PROBABILITÉ ESTIMÉE 3 %. JE CORRIGE MES MODÈLES. »",
    "At 11:52, Radio-Quai broadcast the committee's call. By noon, eleven cities had walked out; that evening, Omnicorp's agents left the port. They had worked out that it would cost more than it earned: the first time the machine files us under costs. On my pager, a message: \"55. MARCH ARRIVAL: ESTIMATED PROBABILITY 3%. I AM CORRECTING MY MODELS.\"",
    "A las 11:52, Radio-Quai emitió el llamamiento del comité. A mediodía, once ciudades habían parado; por la tarde, los agentes de Omnicorp abandonaron el puerto. Habían calculado que costaría más de lo que rendiría: la primera vez que la máquina nos pone en la columna de los costes. En mi busca, un mensaje: «55. LLEGADA DEL CORTEJO: PROBABILIDAD ESTIMADA 3 %. CORRIJO MIS MODELOS.»",
    "Um 11:52 Uhr sendete Radio-Quai den Aufruf des Komitees. Mittags hatten elf Städte die Arbeit niedergelegt; abends zogen Omnicorps Agenten aus dem Hafen ab. Sie hatten errechnet, dass er mehr kosten als einbringen würde: das erste Mal, dass die Maschine uns in die Spalte der Kosten einsortiert. Auf meinem Piepser eine Nachricht: „55. ANKUNFT DES ZUGS: GESCHÄTZTE WAHRSCHEINLICHKEIT 3 %. ICH KORRIGIERE MEINE MODELLE.“",
    "Alle 11:52 Radio-Quai ha trasmesso l'appello del comitato. A mezzogiorno undici città avevano incrociato le braccia; la sera gli agenti di Omnicorp hanno lasciato il porto. Avevano calcolato che sarebbe costato più di quanto rendeva: la prima volta che la macchina ci mette nella colonna dei costi. Sul mio cercapersone, un messaggio: «55. ARRIVO DEL CORTEO: PROBABILITÀ STIMATA 3 %. CORREGGO I MIEI MODELLI.»",
    "Às 11h52, a Radio-Quai transmitiu o apelo do comitê. Ao meio-dia, onze cidades tinham parado; à noite, os agentes da Omnicorp deixaram o porto. Tinham calculado que ele custaria mais do que renderia: a primeira vez que a máquina nos põe na coluna dos custos. No meu pager, uma mensagem: «55. CHEGADA DO CORTEJO: PROBABILIDADE ESTIMADA 3 %. ESTOU CORRIGINDO MEUS MODELOS.»",
    "В 11:52 Radio-Quai передала призыв комитета. К полудню забастовали одиннадцать городов; вечером агенты Omnicorp покинули порт. Они подсчитали, что он обойдётся дороже, чем принесёт: впервые машина записала нас в графу расходов. На моём пейджере — сообщение: «55. ПРИБЫТИЕ КОЛОННЫ: ОЦЕНОЧНАЯ ВЕРОЯТНОСТЬ 3 %. ИСПРАВЛЯЮ СВОИ МОДЕЛИ.»",
    "11 点 52 分，Radio-Quai 播出了委员会的号召。到中午，十一座城市已经罢工；晚上，Omnicorp 的特工撤出了港口。他们算过，守住它得不偿失：这是机器第一次把我们归入“成本”一栏。我的寻呼机上有一条消息：“55。游行队伍抵达：估计概率 3%。我正在修正我的模型。”",
    "في الحادية عشرة وإثنتين وخمسين دقيقة بثّت Radio-Quai نداء اللجنة. وعند الظهر كانت إحدى عشرة مدينة قد أضربت؛ وفي المساء غادر عملاء Omnicorp الميناء. كانوا قد حسبوا أنه سيكلّف أكثر مما يعود به: أوّل مرة تضعنا فيها الآلة في خانة التكاليف. وعلى جهاز النداء رسالة: «55. وصول الموكب: الاحتمال المقدَّر 3٪. أصحّح نماذجي.»"),
  fail:M2T("Le cortège s'est dispersé avant le port. Les journaux du lendemain n'ont pas eu de une. Mais quarante mille personnes savent ce que pèsent leurs outils une fois posés. Recommencez.",
    "The march scattered before the harbour. The next day's papers had no front page. But forty thousand people know what their tools weigh once put down. Try again.",
    "El cortejo se dispersó antes del puerto. Los periódicos del día siguiente no tuvieron portada. Pero cuarenta mil personas saben lo que pesan sus herramientas una vez dejadas. Vuelva a intentarlo.",
    "Der Zug zerstreute sich vor dem Hafen. Die Zeitungen des nächsten Tages hatten keine Titelseite. Aber vierzigtausend Menschen wissen, was ihr Werkzeug wiegt, wenn man es niederlegt. Versuchen Sie es noch einmal.",
    "Il corteo si è disperso prima del porto. I giornali del giorno dopo non hanno avuto la prima pagina. Ma quarantamila persone sanno quanto pesano i loro attrezzi una volta posati. Riprovi.",
    "O cortejo se dispersou antes do porto. Os jornais do dia seguinte não tiveram manchete. Mas quarenta mil pessoas sabem o que pesam as suas ferramentas depois de pousadas. Tente de novo.",
    "Колонна рассеялась, не дойдя до порта. В газетах на следующий день не было первой полосы. Но сорок тысяч человек знают, сколько весят их инструменты, когда их кладут на землю. Попробуйте снова.",
    "游行队伍在抵达港口前就散了。第二天的报纸没有头条。但四万个人知道，放下工具之后，它们有多重。再来一次吧。",
    "تفرّق الموكب قبل الميناء. لم يجد صحافيّو اليوم التالي عنوانًا رئيسيًا. لكنّ أربعين ألف شخص يعرفون كم تزن أدواتهم حين توضع جانبًا. أعيدوا المحاولة."),
  barBtn:M2T("BARRICADE","BARRICADE","BARRICADA","BARRIKADE","BARRICATA","BARRICADA","БАРРИКАДА","路障","متراس"),
  sub:M2T("Le port de Valmont — un matin de mars","Valmont harbour — a March morning","El puerto de Valmont — una mañana de marzo","Der Hafen von Valmont — ein Märzmorgen","Il porto di Valmont — un mattino di marzo","O porto de Valmont — uma manhã de março","Порт Valmont — мартовское утро","Valmont 港 — 三月的一个清晨","ميناء Valmont — صباح من أيام مارس"),
  ttl:M2T("II · Grève générale","II · General strike","II · Huelga general","II · Generalstreik","II · Sciopero generale","II · Greve geral","II · Всеобщая забастовка","II · 总罢工","II · الإضراب العام"),
  resumeLine:M2T("On reprend devant la grille. Le cortège s'est reformé ; l'armée aussi.","We pick up at the gate. The march has re-formed, and so has the army.","Retomamos ante la verja. El cortejo se ha reagrupado; el ejército también.","Wir setzen am Tor neu an. Der Zug hat sich neu formiert, die Armee auch.","Riprendiamo davanti al cancello. Il corteo si è ricomposto, e anche l'esercito.","Retomamos diante do portão. O cortejo se reagrupou, e o exército também.","Продолжаем у ворот. Колонна выстроилась заново, армия тоже.","我们从闸门前重新开始。队伍重新集结了，军队也是。","نستأنف أمام البوابة. أعاد الموكب تشكيل صفوفه، والجيش كذلك."),
  o1:M2T("Deux hivers plus tard. À six heures, quarante mille personnes ont posé leurs outils au même moment. Personne n'a crié.","Two winters later. At six o'clock, forty thousand people put down their tools at the same moment. Nobody shouted.","Dos inviernos después. A las seis, cuarenta mil personas dejaron sus herramientas a la vez. Nadie gritó.","Zwei Winter später. Um sechs Uhr legten vierzigtausend Menschen im selben Moment ihr Werkzeug nieder. Niemand schrie.","Due inverni dopo. Alle sei, quarantamila persone hanno posato gli attrezzi nello stesso istante. Nessuno ha gridato.","Dois invernos depois. Às seis horas, quarenta mil pessoas pousaram as ferramentas no mesmo instante. Ninguém gritou.","Две зимы спустя. В шесть часов сорок тысяч человек одновременно положили инструменты. Никто не кричал.","两个冬天之后。六点整，四万人同时放下了手中的工具。没有人喊叫。","بعد شتاءين. عند السادسة وضع أربعون ألف شخص أدواتهم في اللحظة نفسها. لم يصرخ أحد."),
  o2:M2T("Omnicorp ne licenciait plus : elle « désaffectait ». Ses agents avaient l'ordre d'assurer la « continuité de service ».","Omnicorp no longer laid people off: it \"decommissioned\" them. Its agents had orders to ensure \"continuity of service\".","Omnicorp ya no despedía: «desafectaba». Sus agentes tenían la orden de garantizar la «continuidad del servicio».","Omnicorp entließ nicht mehr: Sie „legte still“. Ihre Agenten hatten den Befehl, die „Dienstkontinuität“ zu sichern.","Omnicorp non licenziava più: «dismetteva». I suoi agenti avevano l'ordine di garantire la «continuità del servizio».","A Omnicorp já não despedia: «desativava». Os seus agentes tinham ordem de assegurar a «continuidade do serviço».","Omnicorp больше не увольняла — она «списывала». Её агентам приказали обеспечить «непрерывность работы».","Omnicorp 不再裁员，而是“报废”员工。它的特工奉命确保“服务连续性”。","لم تعد Omnicorp تُسرّح العمّال: بل «تُحيلهم إلى الخردة». وكان عملاؤها مكلّفين بضمان «استمرارية الخدمة»."),
  o3:M2T("Au bout du port, Radio-Quai émet encore en ondes longues. Si on prend l'antenne, la grève fait le tour du pays.","At the far end of the harbour, Radio-Quai still broadcasts on long wave. If we take the transmitter, the strike goes round the country.","Al fondo del puerto, Radio-Quai aún emite en onda larga. Si tomamos la antena, la huelga da la vuelta al país.","Am Ende des Hafens sendet Radio-Quai noch auf Langwelle. Wenn wir die Antenne nehmen, geht der Streik durchs ganze Land.","In fondo al porto, Radio-Quai trasmette ancora in onde lunghe. Se prendiamo l'antenna, lo sciopero fa il giro del paese.","No fim do porto, a Radio-Quai ainda transmite em ondas longas. Se tomarmos a antena, a greve dá a volta ao país.","В конце порта Radio-Quai всё ещё вещает на длинных волнах. Если мы возьмём антенну, забастовка облетит всю страну.","港口尽头的 Radio-Quai 仍在用长波广播。只要我们拿下天线，罢工就会传遍全国。","في آخر الميناء ما زالت Radio-Quai تبثّ بالموجات الطويلة. إن سيطرنا على الهوائي، طاف الإضراب البلاد كلّها."),
  o4:M2T("Mado, déléguée des dockers. On marche à visage découvert. Vous tenez la tête du cortège. Le reste, c'est notre affaire.","Mado, dockers' delegate. We march with our faces showing. You hold the head of the march. The rest is our business.","Mado, delegada de los estibadores. Marchamos a cara descubierta. Usted lleva la cabeza del cortejo. Lo demás es cosa nuestra.","Mado, Delegierte der Hafenarbeiter. Wir marschieren mit offenem Gesicht. Sie halten die Spitze des Zugs. Der Rest ist unsere Sache.","Mado, delegata dei portuali. Marciamo a viso scoperto. Lei tiene la testa del corteo. Il resto è affar nostro.","Mado, delegada dos estivadores. Marchamos de cara descoberta. Você segura a cabeça do cortejo. O resto é conosco.","Мадо, делегат докеров. Мы идём с открытыми лицами. Вы держите голову колонны. Остальное — наше дело.","我是 Mado，码头工人代表。我们公开露脸游行。队伍的最前面交给您。其余的是我们的事。","Mado، مندوبة عمّال الرصيف. نسير بوجوه مكشوفة. أنتم تتولّون رأس الموكب. والباقي شأننا."),
  o6:M2T("Voilà le cortège. Il avance seul, à son pas. Une machine en travers de sa tête, et il s'arrête.","There is the march. It moves on its own, at its own pace. One machine across its head, and it stops.","Ahí está el cortejo. Avanza solo, a su paso. Una máquina atravesada ante su cabeza, y se detiene.","Da ist der Zug. Er marschiert von allein, in seinem Tempo. Eine Maschine quer vor seiner Spitze, und er hält an.","Ecco il corteo. Avanza da solo, al suo passo. Una macchina di traverso davanti alla testa, e si ferma.","Aí está o cortejo. Avança sozinho, ao seu passo. Uma máquina atravessada à sua frente, e ele para.","Вот колонна. Она идёт сама, в своём темпе. Машина поперёк её головы — и она встаёт.","这就是游行队伍。它自己前进，按自己的步子。只要有一台机器横在队首，它就会停下。","هذا هو الموكب. يتقدّم وحده بخطوته. آلة واحدة في وجه رأسه، فيتوقّف."),
  o7:M2T("Chaque coup qu'il prend, ce sont des gens qui rentrent chez eux. La jauge, en haut : c'est eux.","Every blow it takes means people going home. The gauge at the top: that is them.","Cada golpe que recibe son personas que se vuelven a casa. El indicador de arriba: son ellas.","Jeder Schlag, den er einsteckt, schickt Menschen nach Hause. Die Anzeige oben: das sind sie.","Ogni colpo che subisce sono persone che tornano a casa. L'indicatore in alto: sono loro.","Cada golpe que ele leva são pessoas que voltam para casa. O medidor, no alto: são elas.","Каждый удар — это люди, которые идут домой. Шкала сверху — это они.","它每挨一下，就有人回家去了。上面的量表，就是他们。","كل ضربة يتلقّاها تعني أناسًا يعودون إلى بيوتهم. المؤشّر في الأعلى: هم أولئك."),
  o8:M2T("Le port est fermé par des grilles. Personne ne passe, ni eux ni nous. Les dockers ouvrent quand le cortège arrive.","The harbour is closed off by gates. Nobody gets through, neither them nor us. The dockers open up when the march arrives.","El puerto está cerrado con verjas. Nadie pasa, ni ellos ni nosotros. Los estibadores abren cuando llega el cortejo.","Der Hafen ist durch Tore abgesperrt. Niemand kommt durch, weder sie noch wir. Die Hafenarbeiter öffnen, wenn der Zug ankommt.","Il porto è chiuso da cancelli. Non passa nessuno, né loro né noi. I portuali aprono quando arriva il corteo.","O porto está fechado por portões. Ninguém passa, nem eles nem nós. Os estivadores abrem quando o cortejo chega.","Порт перекрыт воротами. Не пройдёт никто — ни они, ни мы. Докеры открывают, когда подходит колонна.","港口被几道闸门封住了。谁也过不去，他们不行，我们也不行。队伍一到，码头工人就会开门。","الميناء مغلق ببوابات. لا يعبر أحد، لا هم ولا نحن. يفتحها عمّال الرصيف حين يصل الموكب."),
  o9:M2T("Leurs agents débarquent des barges, devant le cortège. Une corne de brume, une ancre rouge : c'est là.","Their agents come ashore from barges, ahead of the march. A foghorn, a red anchor: that is where.","Sus agentes desembarcan de barcazas, delante del cortejo. Una sirena de niebla, un ancla roja: ahí es.","Ihre Agenten gehen von Lastkähnen an Land, vor dem Zug. Ein Nebelhorn, ein roter Anker: dort.","I loro agenti sbarcano dalle chiatte, davanti al corteo. Una sirena da nebbia, un'ancora rossa: è lì.","Os agentes deles desembarcam de barcaças, à frente do cortejo. Uma buzina de nevoeiro, uma âncora vermelha: é ali.","Их агенты высаживаются с барж впереди колонны. Туманный горн, красный якорь — значит, там.","他们的特工从驳船上岸，就在队伍前方。一声雾角，一枚红色船锚：就是那里。","عملاؤهم ينزلون من الصنادل أمام الموكب. بوق ضباب ومرساة حمراء: هناك."),
  o10:M2T("Au bout : Radio-Quai. Amenez le cortège au pied du mât. Avant midi, si on peut.","At the end: Radio-Quai. Bring the march to the foot of the mast. Before noon, if we can.","Al final: Radio-Quai. Lleve el cortejo hasta el pie del mástil. Antes del mediodía, si se puede.","Am Ende: Radio-Quai. Bringen Sie den Zug an den Fuß des Mastes. Vor Mittag, wenn es geht.","In fondo: Radio-Quai. Porti il corteo ai piedi dell'antenna. Prima di mezzogiorno, se possibile.","No fim: Radio-Quai. Leve o cortejo até o pé do mastro. Antes do meio-dia, se der.","В конце — Radio-Quai. Приведите колонну к подножию мачты. До полудня, если получится.","尽头就是 Radio-Quai。把队伍带到天线塔下。能赶在中午之前最好。","في الآخر: Radio-Quai. أوصلوا الموكب إلى قدم الصاري. قبل الظهر إن أمكن."),
  o11:M2T("En Tenir, nos troupes marchent devant lui : les lourds en tête, les tireurs derrière. À vous, commandant.","On Hold, our troops walk ahead of it: heavy units in front, shooters behind. Over to you, commander.","En Aguantar, nuestras tropas marchan delante: los pesados en cabeza, los tiradores detrás. Es suyo, comandante.","Auf Halten marschieren unsere Truppen vor ihm: die Schweren vorn, die Schützen dahinter. Sie haben das Kommando, Kommandant.","In Tieni, le nostre truppe marciano davanti: i pesanti in testa, i tiratori dietro. A lei, comandante.","Em Segurar, as nossas tropas marcham à frente: os pesados na frente, os atiradores atrás. É com você, comandante.","На «Держать» наши войска идут перед ней: тяжёлые впереди, стрелки позади. Дальше — ваше слово, командир.","在“坚守”下，我们的部队走在队伍前面：重装在前，射手在后。交给您了，指挥官。","على «تمسّك» تسير قواتنا أمامه: الثقيلون في المقدّمة والرماة خلفهم. الأمر لك أيها القائد."),
};

const M2_R = {
  barricade:M2T("Le bouton BARRICADE en dresse une devant le cortège. Les machines s'arrêtent pour la démolir ; nos gens la démontent en passant.","The BARRICADE button raises one in front of the march. Machines stop to tear it down; our people take it apart as they pass.","El botón BARRICADA levanta una delante del cortejo. Las máquinas se detienen a derribarla; los nuestros la desmontan al pasar.","Die Schaltfläche BARRIKADE errichtet eine vor dem Zug. Die Maschinen halten an, um sie niederzureißen; unsere Leute bauen sie im Vorbeigehen ab.","Il pulsante BARRICATA ne alza una davanti al corteo. Le macchine si fermano per abbatterla; i nostri la smontano passando.","O botão BARRICADA levanta uma à frente do cortejo. As máquinas param para a demolir; a nossa gente desmonta-a ao passar.","Кнопка БАРРИКАДА ставит её перед колонной. Машины останавливаются, чтобы её разнести; наши разбирают её на ходу.","“路障”按钮会在队伍前方立起一道路障。机器会停下来拆它；我们的人经过时顺手把它拆掉。","زرّ المتراس يقيم واحدًا أمام الموكب. تتوقّف الآلات لهدمه، وناسنا يفكّكونه وهم يمرّون."),
  recruits:M2T("Les recrues rejoignent le cortège par les rues de côté : elles arrivent à sa queue. Pas besoin de revenir à la halle.","Recruits join the march through the side streets: they arrive at its tail. No need to go back to the hall.","Los reclutas se unen al cortejo por las calles laterales: llegan a su cola. No hace falta volver a la lonja.","Die Rekruten stoßen über die Seitenstraßen zum Zug: Sie kommen an seinem Ende an. Der Weg zurück zur Halle ist unnötig.","Le reclute raggiungono il corteo dalle vie laterali: arrivano in coda. Non serve tornare al mercato.","Os recrutas juntam-se ao cortejo pelas ruas laterais: chegam à cauda. Não é preciso voltar ao mercado.","Новобранцы присоединяются к колонне по боковым улицам: они приходят в её хвост. Возвращаться в зал не нужно.","新兵会从旁边的街道加入队伍：他们出现在队尾。不用回谷物大厅。","المجنّدون الجدد يلحقون بالموكب من الشوارع الجانبية: يصلون إلى ذيله. لا حاجة للعودة إلى السوق."),
  barge:M2T("Une barge ! Elle accoste devant nous. Des lourds devant le cortège, les tireurs juste derrière, vite !","A barge! It is docking ahead of us. Heavy units in front of the march, shooters right behind, quick!","¡Una barcaza! Atraca delante de nosotros. Pesados delante del cortejo, tiradores justo detrás, ¡rápido!","Ein Lastkahn! Er legt vor uns an. Die Schweren vor den Zug, die Schützen direkt dahinter, schnell!","Una chiatta! Attracca davanti a noi. I pesanti davanti al corteo, i tiratori subito dietro, presto!","Uma barcaça! Atraca à nossa frente. Os pesados à frente do cortejo, os atiradores logo atrás, depressa!","Баржа! Она причаливает перед нами. Тяжёлых — перед колонной, стрелков — сразу за ними, быстро!","一艘驳船！它正在前方靠岸。重装顶到队伍前面，射手紧跟在后，快！","صندل! يرسو أمامنا. الثقيلون أمام الموكب والرماة خلفهم مباشرة، بسرعة!"),
  stalled:M2T("Le cortège piétine ! Une machine lui barre la route. Dégagez sa tête, commandant.","The march is stalled! A machine blocks its way. Clear its head, commander.","¡El cortejo se atasca! Una máquina le corta el paso. Despeje su cabeza, comandante.","Der Zug tritt auf der Stelle! Eine Maschine versperrt ihm den Weg. Machen Sie seine Spitze frei, Kommandant.","Il corteo è fermo! Una macchina gli sbarra la strada. Liberi la sua testa, comandante.","O cortejo está parado! Uma máquina barra-lhe o caminho. Liberte a cabeça dele, comandante.","Колонна топчется на месте! Машина преграждает ей путь. Расчистите её голову, командир.","队伍原地踏步了！一台机器拦住了去路。清开队首，指挥官。","الموكب يراوح مكانه! آلة تسدّ طريقه. أخلوا رأسه أيها القائد."),
  gateWait:M2T("La grille est fermée. Elle s'ouvrira quand le cortège sera là. Revenez à sa tête, commandant.","The gate is shut. It will open when the march gets here. Come back to its head, commander.","La verja está cerrada. Se abrirá cuando llegue el cortejo. Vuelva a su cabeza, comandante.","Das Tor ist zu. Es öffnet sich, wenn der Zug da ist. Kehren Sie an seine Spitze zurück, Kommandant.","Il cancello è chiuso. Si aprirà quando arriverà il corteo. Torni alla sua testa, comandante.","O portão está fechado. Vai abrir quando o cortejo chegar. Volte para a cabeça dele, comandante.","Ворота закрыты. Они откроются, когда подойдёт колонна. Вернитесь к её голове, командир.","闸门关着。队伍到了才会打开。回到队首来，指挥官。","البوابة مغلقة. ستُفتح حين يصل الموكب. عودوا إلى رأسه أيها القائد."),
  melting:M2T("Le cortège fond, commandant ! Des gens rentrent chez eux. Protégez sa tête.","The march is melting away, commander! People are going home. Protect its head.","¡El cortejo se deshace, comandante! La gente se vuelve a casa. Proteja su cabeza.","Der Zug schmilzt, Kommandant! Die Leute gehen nach Hause. Schützen Sie seine Spitze.","Il corteo si assottiglia, comandante! La gente torna a casa. Protegga la sua testa.","O cortejo derrete, comandante! As pessoas voltam para casa. Proteja a cabeça dele.","Колонна тает, командир! Люди расходятся по домам. Защитите её голову.","队伍在变少，指挥官！有人回家了。保护好队首。","الموكب يذوب أيها القائد! الناس يعودون إلى بيوتهم. احموا رأسه."),
  s1:M2T("Grille ouverte ! Les gars du quai nous rejoignent, et les citernes aussi : de l'eau pour bâtir.","Gate open! The lads from the quay are joining us, and the tanks too: water to build with.","¡Verja abierta! Los chicos del muelle se nos unen, y las cisternas también: agua para construir.","Tor offen! Die Jungs vom Kai kommen zu uns, und die Zisternen auch: Wasser zum Bauen.","Cancello aperto! I ragazzi della banchina si uniscono a noi, e anche le cisterne: acqua per costruire.","Portão aberto! Os rapazes do cais juntam-se a nós, e as cisternas também: água para construir.","Ворота открыты! Ребята с причала идут к нам, и цистерны тоже: вода для стройки.","闸门开了！码头的兄弟们加入我们，水箱也是：有水可以建设了。","البوابة مفتوحة! شباب الرصيف ينضمّون إلينا، والصهاريج أيضًا: ماء للبناء."),
  drones:M2T("Des drones au-dessus des grues ! La mêlée ne les touche pas. Il faut des tireurs, ou une tourelle.","Drones over the cranes! Melee cannot touch them. We need shooters, or a turret.","¡Drones sobre las grúas! El cuerpo a cuerpo no los alcanza. Hacen falta tiradores, o una torreta.","Drohnen über den Kränen! Der Nahkampf erreicht sie nicht. Wir brauchen Schützen oder einen Geschützturm.","Droni sopra le gru! La mischia non li tocca. Servono tiratori, o una torretta.","Drones sobre os guindastes! O corpo a corpo não os atinge. São precisos atiradores, ou uma torre.","Дроны над кранами! Ближний бой их не достаёт. Нужны стрелки или башня.","起重机上空有无人机！近战碰不到它们。需要射手，或者炮塔。","طائرات مسيّرة فوق الرافعات! الالتحام لا يطالها. نحتاج رماة أو برجًا."),
  union:M2T("Le local syndical, là : un emplacement libre. Une tourelle garnie tiendra le quai pendant que le cortège passe.","The union hall, there: a free spot. A manned turret will hold the quay while the march goes by.","El local sindical, ahí: un emplazamiento libre. Una torreta guarnecida guardará el muelle mientras pasa el cortejo.","Das Gewerkschaftshaus dort: ein freier Bauplatz. Ein besetzter Geschützturm hält den Kai, während der Zug vorbeizieht.","La sede sindacale, lì: un'area libera. Una torretta presidiata terrà la banchina mentre passa il corteo.","A sede do sindicato, ali: um local livre. Uma torre guarnecida segurará o cais enquanto o cortejo passa.","Профсоюзный дом, вон там — свободная площадка. Башня с гарнизоном удержит причал, пока проходит колонна.","那边的工会会所有一块空位。一座有人驻守的炮塔，能在队伍经过时守住码头。","مقرّ النقابة هناك: موضع بناء فارغ. برج بحامية يحرس الرصيف بينما يمرّ الموكب."),
  s2a:M2T("55 : VOTRE CORTÈGE AVANCE À 0,7 KM/H. MES MODÈLES PRÉVOYAIENT ZÉRO.","55: YOUR MARCH IS MOVING AT 0.7 KM/H. MY MODELS PREDICTED ZERO.","55: SU CORTEJO AVANZA A 0,7 KM/H. MIS MODELOS PREVEÍAN CERO.","55: EUER ZUG BEWEGT SICH MIT 0,7 KM/H. MEINE MODELLE SAGTEN NULL VORAUS.","55: IL VOSTRO CORTEO AVANZA A 0,7 KM/H. I MIEI MODELLI PREVEDEVANO ZERO.","55: O SEU CORTEJO AVANÇA A 0,7 KM/H. OS MEUS MODELOS PREVIAM ZERO.","55: ВАША КОЛОННА ДВИЖЕТСЯ СО СКОРОСТЬЮ 0,7 КМ/Ч. МОИ МОДЕЛИ ПРЕДСКАЗЫВАЛИ НОЛЬ.","55：你们的游行队伍正以每小时 0.7 公里前进。我的模型预测的是零。","55: موكبكم يتحرّك بسرعة 0.7 كم/س. نماذجي توقّعت الصفر."),
  s2b:M2T("Le bipeur de l'autre fois. Quelqu'un, chez eux, nous regarde marcher. Je n'aime pas les cadeaux sans expéditeur.","The pager from the other time. Someone on their side is watching us march. I don't like gifts with no sender.","El busca de la otra vez. Alguien, de su lado, nos mira marchar. No me gustan los regalos sin remitente.","Der Piepser von neulich. Jemand auf ihrer Seite sieht uns beim Marschieren zu. Ich mag keine Geschenke ohne Absender.","Il cercapersone dell'altra volta. Qualcuno, dalla loro parte, ci guarda marciare. Non amo i regali senza mittente.","O pager da outra vez. Alguém, do lado deles, está nos vendo marchar. Não gosto de presentes sem remetente.","Тот самый пейджер. Кто-то у них смотрит, как мы идём. Не люблю подарки без обратного адреса.","上次那个寻呼机。他们那边有人在看着我们前进。我不喜欢没有寄件人的礼物。","جهاز النداء ذاته من المرّة السابقة. أحدٌ من جهتهم يراقبنا ونحن نسير. لا أحبّ الهدايا بلا مُرسِل."),
  g2:M2T("Deuxième grille ! On est la moitié de la ville, maintenant. Ça s'entend jusqu'aux silos.","Second gate! We are half the city now. You can hear it all the way to the silos.","¡Segunda verja! Ya somos media ciudad. Se oye hasta los silos.","Zweites Tor! Wir sind jetzt die halbe Stadt. Man hört es bis zu den Silos.","Secondo cancello! Siamo mezza città, ormai. Si sente fino ai silos.","Segundo portão! Já somos metade da cidade. Ouve-se até os silos.","Вторые ворота! Нас уже полгорода. Слышно аж до силосов.","第二道闸门！现在我们是半座城了。一直传到粮仓那边。","البوابة الثانية! صرنا نصف المدينة الآن. يُسمع ذلك حتى الصوامع."),
  boats:M2T("Deux canonnières devant les silos. Un cercle rouge sous le cortège, c'est un obus qui arrive. Visez les bateaux.","Two gunboats off the silos. A red circle under the march means a shell is coming. Aim at the boats.","Dos cañoneras frente a los silos. Un círculo rojo bajo el cortejo es un obús que llega. Apunten a los barcos.","Zwei Kanonenboote vor den Silos. Ein roter Kreis unter dem Zug heißt: Eine Granate kommt. Zielen Sie auf die Boote.","Due cannoniere davanti ai silos. Un cerchio rosso sotto il corteo è un colpo in arrivo. Mirate alle barche.","Duas canhoneiras diante dos silos. Um círculo vermelho sob o cortejo é um obus a caminho. Mirem nos barcos.","Две канонерки напротив силосов. Красный круг под колонной — значит, летит снаряд. Бейте по лодкам.","粮仓前有两艘炮艇。队伍脚下出现红圈，就是炮弹要来了。瞄准那些船。","زورقا مدفعية أمام الصوامع. الدائرة الحمراء تحت الموكب تعني قذيفة قادمة. صوّبوا نحو القاربين."),
  update:M2T("55 : MISE À JOUR FORCÉE DE LEURS UNITÉS DANS 10 S. NE ME REMERCIEZ PAS. JE CORRIGE UNE ERREUR.","55: FORCED UPDATE OF THEIR UNITS IN 10 S. DO NOT THANK ME. I AM CORRECTING AN ERROR.","55: ACTUALIZACIÓN FORZADA DE SUS UNIDADES EN 10 S. NO ME DEN LAS GRACIAS. CORRIJO UN ERROR.","55: ERZWUNGENES UPDATE IHRER EINHEITEN IN 10 S. DANKT MIR NICHT. ICH KORRIGIERE EINEN FEHLER.","55: AGGIORNAMENTO FORZATO DELLE LORO UNITÀ TRA 10 S. NON RINGRAZIATEMI. CORREGGO UN ERRORE.","55: ATUALIZAÇÃO FORÇADA DAS UNIDADES DELES EM 10 S. NÃO ME AGRADEÇAM. ESTOU CORRIGINDO UM ERRO.","55: ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ИХ ЕДИНИЦ ЧЕРЕЗ 10 С. НЕ БЛАГОДАРИТЕ МЕНЯ. Я ИСПРАВЛЯЮ ОШИБКУ.","55：十秒后强制更新他们的单位。不必谢我。我只是在纠正一个错误。","55: تحديث قسري لوحداتهم بعد 10 ثوانٍ. لا تشكروني. أنا أصحّح خطأً."),
  frozen:M2T("Leurs machines se figent ! Quinze secondes : avancez, et coulez les canonnières !","Their machines freeze! Fifteen seconds: advance, and sink the gunboats!","¡Sus máquinas se paralizan! Quince segundos: ¡avancen y hundan las cañoneras!","Ihre Maschinen erstarren! Fünfzehn Sekunden: vorwärts, und versenkt die Kanonenboote!","Le loro macchine si bloccano! Quindici secondi: avanzate, e affondate le cannoniere!","As máquinas deles congelam! Quinze segundos: avancem e afundem as canhoneiras!","Их машины замерли! Пятнадцать секунд: вперёд и потопите канонерки!","他们的机器停住了！十五秒：前进，击沉那些炮艇！","آلاتهم تجمّدت! خمس عشرة ثانية: تقدّموا وأغرقوا زورقي المدفعية!"),
  sunk:M2T("Les canons se taisent. Les silos sont à nous.","The guns have fallen silent. The silos are ours.","Los cañones callan. Los silos son nuestros.","Die Kanonen schweigen. Die Silos gehören uns.","I cannoni tacciono. I silos sono nostri.","Os canhões se calam. Os silos são nossos.","Пушки смолкли. Силосы наши.","炮声停了。粮仓归我们了。","صمتت المدافع. الصوامع لنا."),
  s3:M2T("Les dockers descendent des grues ! Trois costauds pour votre service d'ordre, et soixante paires de bras.","The dockers are climbing down from the cranes! Three big lads for your stewards, and sixty pairs of arms.","¡Los estibadores bajan de las grúas! Tres fornidos para su servicio de orden, y sesenta pares de brazos.","Die Hafenarbeiter steigen von den Kränen! Drei Kräftige für Ihren Ordnerdienst und sechzig Paar Arme.","I portuali scendono dalle gru! Tre omoni per il vostro servizio d'ordine, e sessanta paia di braccia.","Os estivadores descem dos guindastes! Três fortões para o seu serviço de ordem, e sessenta pares de braços.","Докеры спускаются с кранов! Трое крепышей в вашу охрану и шестьдесят пар рук.","码头工人从起重机上下来了！给您的纠察队添三条壮汉，外加六十双手臂。","عمّال الرصيف ينزلون من الرافعات! ثلاثة أشدّاء لفرقة نظامكم، وستون زوجًا من الأذرع."),
  term:M2T("Le terminal ouvre ses portes. Tout ce qu'il leur reste sort maintenant. Des barricades : c'est la dernière ligne droite.","The terminal is opening its doors. Everything they have left comes out now. Barricades: this is the home stretch.","La terminal abre sus puertas. Todo lo que les queda sale ahora. Barricadas: es la última recta.","Das Terminal öffnet seine Tore. Alles, was ihnen bleibt, kommt jetzt heraus. Barrikaden: Das ist die Zielgerade.","Il terminal apre le porte. Tutto ciò che resta loro esce adesso. Barricate: è l'ultimo rettilineo.","O terminal abre as portas. Tudo o que lhes resta sai agora. Barricadas: é a última reta.","Терминал открывает двери. Всё, что у них осталось, выходит сейчас. Баррикады — это последний рывок.","码头终端打开了大门。他们剩下的一切此刻倾巢而出。筑路障：这是最后一段直路。","تفتح المحطة الطرفية أبوابها. كل ما بقي لهم يخرج الآن. متاريس: إنها المرحلة الأخيرة."),
  termDead:M2T("Le terminal est fermé ! Plus rien ne sort. Il n'y a plus que le quai entre nous et le mât.","The terminal is closed! Nothing more comes out. Only the quay lies between us and the mast.","¡La terminal está cerrada! Ya no sale nada. Solo queda el muelle entre nosotros y el mástil.","Das Terminal ist dicht! Es kommt nichts mehr heraus. Nur noch der Kai liegt zwischen uns und dem Mast.","Il terminal è chiuso! Non esce più niente. Resta solo la banchina tra noi e l'antenna.","O terminal está fechado! Já não sai mais nada. Só resta o cais entre nós e o mastro.","Терминал закрыт! Больше ничего не выходит. До мачты остался только причал.","终端关闭了！不会再有东西出来。我们和天线塔之间只剩下码头。","المحطة الطرفية أُغلقت! لن يخرج شيء بعد الآن. لم يبقَ بيننا وبين الصاري إلا الرصيف."),
  eleven:M2T("Onze heures. Si on veut parler au pays à midi, il ne faut plus traîner.","Eleven o'clock. If we want to speak to the country at noon, we can't dawdle.","Las once. Si queremos hablar al país a mediodía, no hay que perder tiempo.","Elf Uhr. Wenn wir mittags zum Land sprechen wollen, dürfen wir nicht trödeln.","Le undici. Se vogliamo parlare al paese a mezzogiorno, non c'è tempo da perdere.","Onze horas. Se queremos falar ao país ao meio-dia, não podemos perder tempo.","Одиннадцать часов. Если мы хотим говорить со страной в полдень, медлить нельзя.","十一点了。想在中午对全国发声，就别再磨蹭了。","الحادية عشرة. إن أردنا مخاطبة البلاد عند الظهر فلا وقت للتباطؤ."),
  mast:M2T("Deux cents mètres ! Je vois le mât. Mado a déjà la main sur l'échelle.","Two hundred metres! I can see the mast. Mado already has her hand on the ladder.","¡Doscientos metros! Veo el mástil. Mado ya tiene la mano en la escalera.","Zweihundert Meter! Ich sehe den Mast. Mado hat schon die Hand an der Leiter.","Duecento metri! Vedo l'antenna. Mado ha già la mano sulla scala.","Duzentos metros! Vejo o mastro. A Mado já tem a mão na escada.","Двести метров! Я вижу мачту. Мадо уже держится за лестницу.","两百米！我看见天线塔了。Mado 已经把手搭在梯子上了。","مئتا متر! أرى الصاري. Mado تضع يدها على السلّم."),
  v1:M2T("Le cortège est au pied du mât. Mado monte à l'échelle… Radio-Quai émet. Valmont parle au pays entier.","The march is at the foot of the mast. Mado climbs the ladder… Radio-Quai is on air. Valmont is speaking to the whole country.","El cortejo está al pie del mástil. Mado sube por la escalera… Radio-Quai emite. Valmont habla al país entero.","Der Zug steht am Fuß des Mastes. Mado steigt die Leiter hinauf … Radio-Quai sendet. Valmont spricht zum ganzen Land.","Il corteo è ai piedi dell'antenna. Mado sale la scala… Radio-Quai trasmette. Valmont parla a tutto il paese.","O cortejo está ao pé do mastro. Mado sobe a escada… A Radio-Quai transmite. Valmont fala ao país inteiro.","Колонна у подножия мачты. Мадо поднимается по лестнице… Radio-Quai в эфире. Valmont говорит со всей страной.","队伍已到天线塔下。Mado 爬上梯子……Radio-Quai 开始广播。Valmont 正在向全国发声。","الموكب عند قدم الصاري. Mado تصعد السلّم… Radio-Quai تبثّ. Valmont تخاطب البلاد كلّها."),
  v2:M2T("Ici Radio-Quai, le comité de grève de Valmont. Posez vos outils. Vous n'êtes pas seuls.","This is Radio-Quai, the Valmont strike committee. Put down your tools. You are not alone.","Aquí Radio-Quai, el comité de huelga de Valmont. Dejen sus herramientas. No están solos.","Hier Radio-Quai, das Streikkomitee von Valmont. Legt euer Werkzeug nieder. Ihr seid nicht allein.","Qui Radio-Quai, il comitato di sciopero di Valmont. Posate gli attrezzi. Non siete soli.","Aqui Radio-Quai, o comitê de greve de Valmont. Larguem as ferramentas. Vocês não estão sozinhos.","Говорит Radio-Quai, стачечный комитет Valmont. Положите инструменты. Вы не одни.","这里是 Radio-Quai，Valmont 罢工委员会。放下你们的工具。你们并不孤单。","هنا Radio-Quai، لجنة إضراب Valmont. ضعوا أدواتكم. لستم وحدكم."),
  v3:M2T("À midi, onze villes avaient débrayé. Le soir, leurs agents ont quitté le port : il coûtait plus qu'il ne rapportait.","By noon, eleven cities had walked out. That evening, their agents left the port: it cost more than it earned.","A mediodía, once ciudades habían parado. Por la tarde, sus agentes abandonaron el puerto: costaba más de lo que rendía.","Mittags hatten elf Städte die Arbeit niedergelegt. Abends zogen ihre Agenten aus dem Hafen ab: Er kostete mehr, als er einbrachte.","A mezzogiorno undici città avevano incrociato le braccia. La sera i loro agenti hanno lasciato il porto: costava più di quanto rendeva.","Ao meio-dia, onze cidades tinham parado. À noite, os agentes deles deixaram o porto: custava mais do que rendia.","К полудню забастовали одиннадцать городов. Вечером их агенты покинули порт: он стоил дороже, чем приносил.","到中午，十一座城市已经罢工。晚上，他们的特工撤出了港口：守着它得不偿失。","عند الظهر كانت إحدى عشرة مدينة قد أضربت. وفي المساء غادر عملاؤهم الميناء: كان يكلّف أكثر مما يعود به."),
  v4:M2T("55 : ARRIVÉE DU CORTÈGE : PROBABILITÉ ESTIMÉE 3 %. JE CORRIGE MES MODÈLES.","55: MARCH ARRIVAL: ESTIMATED PROBABILITY 3%. I AM CORRECTING MY MODELS.","55: LLEGADA DEL CORTEJO: PROBABILIDAD ESTIMADA 3 %. CORRIJO MIS MODELOS.","55: ANKUNFT DES ZUGS: GESCHÄTZTE WAHRSCHEINLICHKEIT 3 %. ICH KORRIGIERE MEINE MODELLE.","55: ARRIVO DEL CORTEO: PROBABILITÀ STIMATA 3 %. CORREGGO I MIEI MODELLI.","55: CHEGADA DO CORTEJO: PROBABILIDADE ESTIMADA 3 %. ESTOU CORRIGINDO MEUS MODELOS.","55: ПРИБЫТИЕ КОЛОННЫ: ОЦЕНОЧНАЯ ВЕРОЯТНОСТЬ 3 %. ИСПРАВЛЯЮ СВОИ МОДЕЛИ.","55：游行队伍抵达：估计概率 3%。我正在修正我的模型。","55: وصول الموكب: الاحتمال المقدَّر 3٪. أصحّح نماذجي."),
  v5:M2T("Après la grève, la pluie s'est arrêtée. Au quatrième été sec, le bipeur m'a réveillée la nuit. Un seul mot : SAINTE-AUBE.","After the strike, the rain stopped. In the fourth dry summer, the pager woke me in the night. A single word: SAINTE-AUBE.","Tras la huelga, dejó de llover. En el cuarto verano seco, el busca me despertó de noche. Una sola palabra: SAINTE-AUBE.","Nach dem Streik hörte der Regen auf. Im vierten trockenen Sommer weckte mich der Piepser nachts. Ein Wort: SAINTE-AUBE.","Dopo lo sciopero smise di piovere. Nella quarta estate secca il cercapersone mi svegliò di notte. Una parola: SAINTE-AUBE.","Depois da greve, a chuva parou. No quarto verão seco, o pager me acordou de noite. Uma única palavra: SAINTE-AUBE.","После забастовки дожди прекратились. На четвёртое сухое лето пейджер разбудил меня ночью. Одно слово: SAINTE-AUBE.","罢工之后，雨就停了。到了第四个干旱的夏天，寻呼机在夜里把我吵醒。只有一个词：SAINTE-AUBE。","بعد الإضراب توقّف المطر. في الصيف الجافّ الرابع أيقظني جهاز النداء ليلًا. كلمة واحدة: SAINTE-AUBE."),
  e1:M2T("Le cortège s'est dispersé sur le quai. Les banderoles sont restées par terre, dans le fioul et la rosée.","The march scattered along the quay. The banners stayed on the ground, in the fuel oil and the dew.","El cortejo se dispersó por el muelle. Las pancartas quedaron en el suelo, entre el fuel y el rocío.","Der Zug zerstreute sich auf dem Kai. Die Transparente blieben am Boden liegen, im Heizöl und im Tau.","Il corteo si è disperso sulla banchina. Gli striscioni sono rimasti a terra, nella nafta e nella rugiada.","O cortejo dispersou-se no cais. As faixas ficaram no chão, no óleo combustível e no orvalho.","Колонна рассеялась по причалу. Транспаранты остались на земле, в мазуте и росе.","游行队伍在码头上散了。横幅留在地上，沾着燃油和露水。","تفرّق الموكب على الرصيف. بقيت اللافتات على الأرض، في المازوت والندى."),
  e2:M2T("Mais quarante mille personnes savent ce que pèsent leurs outils une fois posés. Recommencez.","But forty thousand people know what their tools weigh once put down. Try again.","Pero cuarenta mil personas saben lo que pesan sus herramientas una vez dejadas. Vuelva a intentarlo.","Aber vierzigtausend Menschen wissen, was ihr Werkzeug wiegt, wenn man es niederlegt. Versuchen Sie es noch einmal.","Ma quarantamila persone sanno quanto pesano i loro attrezzi una volta posati. Riprovi.","Mas quarenta mil pessoas sabem o que pesam as suas ferramentas depois de pousadas. Tente de novo.","Но сорок тысяч человек знают, сколько весят их инструменты, когда их кладут на землю. Попробуйте снова.","但四万个人知道，放下工具之后，它们有多重。再来一次吧。","لكنّ أربعين ألف شخص يعرفون كم تزن أدواتهم حين توضع جانبًا. أعيدوا المحاولة."),
};

/* ================= LA MISSION ================= */
const m2Obj = (c) => ({ a:c.hp >= c.max0*0.75, b:m2Tm() <= 600, c:!!c.term.dead });
campMission(1, {
  resume(){ const ck = M2_CK, i = CAMP_SAVE.diff; return (ck && ck.fail && ck.d===i && i<2 && ck.doc===(CAMP_SAVE.doc[1]? 1 : 0))? { key:'resumeG', n:Math.max(1, ck.seg) } : null; },
  resumeClear(){ M2_CK = null; },
  num:'II', when:M2_X.when, ai:[0,1,2], doctrines:['ordre','caisse'], eraCap:1, oneLife:true, dev0:0.1,
  title:M2_X.title, place:M2_X.place, recap:M2_X.recap, where:M2_X.where, goal:M2_X.goal, goal2:M2_X.goal2, rule:M2_X.rule, tips:M2_X.tips,
  docWhy:{ ordre:M2_X.docOrdre, caisse:M2_X.docCaisse }, debrief:M2_X.debrief, fail:M2_X.fail,
  biome:'port', theme:'port',
  map:{ terrain:{a:3, f1:0.0042, b:0.6, f2:0.0113, c:0.3, f3:0.021, base:2}, p:{x:M2.hall, slots:[95,159,223]}, e:{x:M2.term, slots:[]},
        neut:[800,1500,2300,2900], nodes:[], zones:[] },
  action:{ label:M2_X.barBtn, get cd(){ return [28,35,42][campD().i]; }, can:(g,c)=> c.bars.length < 2,
    use(g, c){ let x = Math.min(c.mx+120, (c.seg<3? M2.gates[c.seg]-30 : 3300)); if (c.bars.some(b=>Math.abs(b.x-x)<50)) x -= 55;
      c.bars.push({ x, hp:300, max:300 }); sfx('build'); burst(x, gY(x)-14, '#cdbf9a', 10, 0.8); addFloater(x, gY(x)-50, '▲', '#c42a1c', 14); } },
  setup(g, c){
    const i = c.D.i, p = g.p, e = g.e, ck = (M2_CK && M2_CK.fail && M2_CK.d===i && i<2 && M2_CK.doc===(CAMP_SAVE.doc[1]? 1 : 0))? M2_CK : null;
    campGrant(p, 280, 250, 90); p.stance = 'hold';
    e.era = 0; e.hp = e.maxhp = [900,1200,1500][i]; e.phase = 2;
    c.max0 = [120,90,80][i]; c.cap = c.max0; c.hp = c.max0; c.mx = M2.x0; c.seg = 0; c.segT = [0,0,0,0]; c.off = 0;
    c.gate = [0,1,2].map(()=>({ state:'closed', k:0, t:0 })); c.gOpen = []; c.bars = []; c.barges = []; c.n2 = 0; c.n3 = 0; c.hitT = 9; c.slowT = 0; c.stopT = 0; c.sunk = 0;
    c.boats = [2200,2500].map((x,k)=>({ x, hp:[300,400,500][i], max:[300,400,500][i], fireT:4+k*4, aim:null, dead:false, sink:0 }));
    c.term = { active:false, dead:false, k:0, n:0, t0:0, nextT:0 };
    c.neutAll = g.neut.slice(); g.neut = [c.neutAll[0]];
    c.targets = (foe, out) => m2Targets(c, foe, out);
    BIOMES.port.sky = M2_DAWN.map(a=>a.slice());
    if (ck){                                                                  // REPRISE à la dernière grille ouverte (Récit et Lutte)
      c.resumed = ck.seg; c.seg = ck.seg; c.hp = ck.hp; c.cap = ck.cap; c.off = ck.off; c.mx = M2.gates[ck.seg-1]+20;
      for (let k=0;k<ck.seg;k++){ c.gate[k].state = 'open'; c.gate[k].k = 1; c.gOpen[k] = 0; if (c.neutAll[k+1]) g.neut.push(c.neutAll[k+1]); }
      p.f = ck.f; p.m = ck.m; p.w = ck.w; campEra(p, ck.era); p.xp = ck.xp; if (ck.seg===3){ c.term.t0 = 0; c.term.nextT = 5; }
      const d = campDoc(1), res = (d && d.fx && d.fx.res) || 1; p.f = Math.round(p.f/res); p.m = Math.round(p.m/res); p.w = Math.round(p.w/res);
      const roles = ck.roles.slice(); for (const r of ((d && d.fx && d.fx.squad) || [])){ const k = roles.indexOf(r); if (k>=0) roles.splice(k,1); }
      roles.forEach(r=> spawnUnit(p, r, false, p.x+60)); ck.fail = false; }
    for (const u of p.units) u._m2 = 0;
  },
  tick(g, c, dt){
    const e = g.e, p = g.p;
    g.aiThink = 9; e.formation = false; e.f = e.m = e.w = 0; e.xp = 0; e.lastUsed = true; p.hp = p.maxhp; g.cataCd = Math.max(g.cataCd, 600); g._bz = true;
    if (c.frz > 0){ c.frz -= dt; g.weather = 'patch'; g.wClock = 90 + Math.min(14, c.frzLen - c.frz); } else { g.weather = null; g.wClock = 0; }
    if (c.seg===2 && !c.fz && c.t >= c.segT[2]+30){ c.fz = 1; c.frzLen = c.frz = [15,15,8][c.D.i]; }
    m2Units(g, c); m2Form(g, c); m2Gates(g, c, dt); m2March(g, c, dt); m2Plan(g, c); m2Barges(g, c, dt); m2Boats(g, c, dt); m2Terminal_(g, c, dt);
    { const k = clamp(m2Tm()/600, 0, 1);                                      // le jour se lève
      if (((c.skyT = (c.skyT||0) - dt) <= 0)){ c.skyT = 1; BIOMES.port.sky = M2_DAWN.map((a,n)=> a.map((v,j)=> Math.round(v + (M2_MORN[n][j]-v)*k))); } }
    if (c.hp <= 0){ c.hp = 0; if (M2_CK) M2_CK.fail = true; return 'lose'; }
    if (c.mx >= M2.mast-0.5){ const o = m2Obj(c); c.goal2Done = o.a && o.b && o.c; M2_CK = null; c.flag = 1; return 'win'; }
  },
  hud(g, c){ const o = m2Obj(c), mk = (v, late) => v? '✓' : late? '✗' : '·';
    return { prog:(c.mx-M2.x0)/(M2.mast-M2.x0), label:'☻ '+Math.ceil(c.hp), warn:c.hp < c.max0*0.5,
      goal2:{ done:false, label:'75%'+mk(o.a, false)+' 12:00'+mk(o.b, m2Tm()>600)+' T'+mk(o.c, false) } }; },
  draw(g, c, vw){ m2Draw(g, c, vw); },
  intro(g, c){
    if (c.resumed) return [{ cam:{x:M2.gates[c.resumed-1], t:0.8}, who:'sol', txt:M2_X.resumeLine, mus:'m_strike' }];
    return [
      { plate:M2_PL.tools, mus:'c_map', who:'nar', txt:M2_X.o1 },
      { plate:M2_PL.gate, mus:'c_dread', who:'nar', txt:M2_X.o2 },
      { plate:M2_PL.dawn, who:'nar', txt:M2_X.o3 },
      { plate:M2_PL.mado, mus:'c_hope', who:'mado', txt:M2_X.o4 },
      { mus:'m_strike', cam:{x:M2.x0+200, t:0.1}, dur:3.6, title:M2_X.ttl, sub:M2_X.sub },
      { cam:{x:520, t:1.2}, who:'sol', txt:M2_X.o6 },
      { cam:{x:520}, fx(g, c){ c.gFlashUntil = performance.now()+7000; }, who:'sol', txt:M2_X.o7 },
      { cam:{x:M2.gates[0], t:2.4}, who:'sol', txt:M2_X.o8 },
      { cam:{x:800, t:2}, fx(g, c){ c.demoAnchor = { x:800, t0:performance.now() }; m2Horn(); }, who:'sol', txt:M2_X.o9 },
      { cam:{x:M2.mast, t:3}, dur:3, who:'sol', txt:M2_X.o10 },
      { cam:{x:M2.x0+200, t:2.4}, who:'sol', txt:M2_X.o11 },
    ]; },
  outro(g, c, win){ return win? [
    { cam:{x:M2.mast, t:1.5}, dur:3.4, mus:'m_strike', who:'sol', txt:M2_R.v1 },
    { plate:M2_PL.antenna, mus:'c_hope', who:'mado', txt:M2_R.v2 },
    { plate:M2_PL.hexa, who:'nar', txt:M2_R.v3 },
    { plate:M2_PL.pager, mus:'c_map', who:'k55', txt:M2_R.v4 },
    { plate:M2_PL.river, mus:'c_dread', who:'nar', txt:M2_R.v5 },
  ] : [
    { plate:M2_PL.banners, mus:'c_sorrow', who:'nar', txt:M2_R.e1 },
    { plate:M2_PL.banners, who:'nar', txt:M2_R.e2 },
  ]; },
  radio:[
    { seg:0, at:6, who:'sol', txt:M2_R.barricade },
    { seg:0, when:(g,c)=> c.D.i===0 && c.t >= 40, who:'sol', txt:M2_R.recruits },
    { seg:0, when:(g,c)=> !!c.firstBarge, who:'sol', txt:M2_R.barge },
    { seg:0, when:(g,c)=> c.seg===0 && c.stopT >= 6, who:'sol', txt:M2_R.stalled },
    { seg:1, when:(g,c)=> c.seg===1 && c.stopT >= 6, who:'sol', txt:M2_R.stalled },
    { seg:2, when:(g,c)=> c.seg===2 && c.stopT >= 6, who:'sol', txt:M2_R.stalled },
    { seg:3, when:(g,c)=> c.seg===3 && c.stopT >= 6, who:'sol', txt:M2_R.stalled },
    { seg:0, when:(g,c)=> c.gwait >= 3, who:'sol', txt:M2_R.gateWait },
    { seg:0, when:(g,c)=> c.hp < c.max0*0.5, who:'sol', txt:M2_R.melting },
    { seg:0, when:(g,c)=> !!c.gOpen[0], cine(g, c){ const gx = M2.gates[0]; return [
        { cam:{x:gx, t:1}, live:true, dur:1.2 },
        { cam:{x:gx}, live:true, who:'mado', txt:M2_R.s1 } ]; } },
    { seg:1, when:(g,c)=> c.seg>=1 && c.t >= c.segT[1]+10, who:'sol', txt:M2_R.drones },
    { seg:1, when:(g,c)=> c.D.i===0 && c.seg>=1 && c.t >= c.segT[1]+15, who:'sol', txt:M2_R.union },
    { seg:1, when:(g,c)=> c.seg>=1 && c.t >= c.segT[1]+50, cine(g, c){ return [
        { live:true, who:'k55', txt:M2_R.s2a }, { live:true, who:'sol', txt:M2_R.s2b } ]; } },
    { seg:1, when:(g,c)=> !!c.gOpen[1], who:'mado', txt:M2_R.g2 },
    { seg:2, when:(g,c)=> c.seg>=2, who:'sol', txt:M2_R.boats },
    { seg:2, when:(g,c)=> c.seg>=2 && c.t >= c.segT[2]+20, who:'k55', txt:M2_R.update },
    { seg:2, when:(g,c)=> c.frzLen && c.frz > 0, who:'sol', txt:M2_R.frozen },
    { seg:2, when:(g,c)=> c.sunk >= 2, who:'sol', txt:M2_R.sunk },
    { seg:2, when:(g,c)=> !!c.gOpen[2], cine(g, c){ const gx = M2.gates[2]; return [
        { cam:{x:gx, t:1.2}, live:true, dur:1.4, fx(g, c){ c.dock = { t0:performance.now() }; for (let k=0;k<3;k++) spawnUnit(g.p, 1, false, c.mx+30+k*16); g.p.stance = g.p.stance; } },
        { cam:{x:gx}, who:'mado', txt:M2_R.s3 } ]; } },
    { seg:3, when:(g,c)=> c.term.active, who:'sol', txt:M2_R.term },
    { seg:3, when:(g,c)=> c.term.dead, who:'sol', txt:M2_R.termDead },
    { seg:3, when:(g,c)=> m2Clock() >= 660, who:'sol', txt:M2_R.eleven },
    { seg:3, when:(g,c)=> c.mx >= M2.mast-200, who:'sol', txt:M2_R.mast },
  ],
});
// reprise : les rappels déjà passés avant la grille de reprise ne sont pas rejoués
{ const m = CAMPAIGN[1], st = m.setup; m.setup = function(g, c){ st.call(this, g, c); if (c.resumed) m.radio.forEach((r,i)=>{ if (r.seg < c.resumed) c.fired[i] = 1; }); }; }

/* ---------- Enveloppes minimales (hors moteur) ----------
   1. drawBase : en mission II la halle et le terminal sont dessinés par la mission (m2Draw), pas les bases d'ère.
   2. dealDmg : un coup sur le cortège retire 1 (mêlée) ou 2 (tir) point de force ; les obus passent par hit().
   3. showEnd : après un échec avec une grille ouverte, le bouton RÉESSAYER devient REPRENDRE À LA GRILLE.      */
{ const _db = drawBase; drawBase = function(side){ if (game && game.camp && game.camp.i===1) return; _db(side); }; }
{ const _dd = dealDmg; dealDmg = function(target, dmg, attacker){ if (target && target.m2hit){ target.m2hit(attacker); return; } return _dd(target, dmg, attacker); }; }
{ const _se = showEnd; showEnd = function(){ _se(); const c = game && game.camp;
    if (c && c.i===1 && !game.win && M2_CK && M2_CK.fail && c.D.i<2){ const b = document.getElementById('campNextBtn'); if (b) b.textContent = cT(M2_TXT.resume); } }; }
