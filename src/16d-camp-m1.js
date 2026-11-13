/* ================= CAMPAGNE · MISSION I — LA NUIT DES COMPTEURS (v1.15) =================
   Valmont, de nuit, sous la pluie. Le courant est coupé : on ne voit que ce qui est éclairé
   (la base, les lampes des unités, les transformateurs repris, les fusées éclairantes). Les
   machines, elles, voient dans le noir. Reprendre un transformateur rallume un quartier.     */
DECOR_THEMES.nightcity = ['lamp','lamp','car','car','bin','barricade','debris','cable','lamp','car'];
DECOR_EXTRA.lamp = (d, s, t) => {                                   // lampadaire de la rue (s'allume quand le quartier est repris)
  const on = campNightLit(d.x);
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

/* ---------- planches du prologue et de l'épilogue (repère 480×270, encre sur page de carnet) ---------- */
const M1_PLATES = {
  tap(g, w, h, t, k){ plateBase(g, w, h);
    const n = clamp(t/2.2, 0, 1);
    inkLine(g, [60,80, 160,80, 160,96, 196,96, 204,104, 204,128], n, 5);                                   // robinet
    inkLine(g, [60,96, 144,96], n, 5); inkLine(g, [150,66, 150,80], n, 4); inkLine(g, [134,64, 166,64], n, 5);
    inkLine(g, [196,128, 212,128], n, 3);
    const dy = (t*38)%120; if (t>2.2 && t<5){ g.fillStyle = '#1f1b17'; g.beginPath(); g.ellipse(204, 134+dy, 2.4, 4, 0, 0, 6.283); g.fill(); }   // les dernières gouttes
    inkLine(g, [120,236, 300,236], n, 2); inkLine(g, [140,236, 150,214, 270,214, 280,236], n, 2);        // évier
    // le compteur « intelligent »
    const m = clamp((t-1.2)/2, 0, 1);
    inkLine(g, [320,70, 420,70, 420,170, 320,170, 320,70], m, 2.4); inkLine(g, [334,86, 406,86, 406,116, 334,116, 334,86], m, 1.6);
    if (m>=1){ g.fillStyle = '#1f1b17'; g.font = '700 17px "Courier New",monospace'; g.textAlign = 'center'; g.fillText('SCORE 41', 370, 107);
      g.fillStyle = (Math.sin(t*5)>0)? '#c42a1c' : 'rgba(196,42,28,0.25)'; g.beginPath(); g.arc(344, 146, 5.5, 0, 6.283); g.fill();
      g.fillStyle = '#1f1b17'; g.font = '9px "Courier New",monospace'; g.fillText('OMNICORP · RÉGIE', 370, 150); inkHatch(g, 320, 170, 100, 10, 5); }
    plateEnd(g, w, h); },
  street(g, w, h, t, k){ plateBase(g, w, h, 'rgba(30,34,70,0.10)');
    const xs = [20,96,150,236,300,372], ws = [70,48,80,58,66,90], hs = [150,110,176,128,160,120];
    xs.forEach((x,i)=>{ const top = 230-hs[i]; inkWash(g, [x,230, x,top, x+ws[i],top, x+ws[i],230], '#1f1b17', 0.16);
      inkLine(g, [x,230, x,top, x+ws[i],top, x+ws[i],230], clamp(t/1.5-i*0.1,0,1), 1.8);
      for (let r=0;r<Math.floor(hs[i]/22);r++) for (let c=0;c<Math.floor(ws[i]/18);c++){
        const id = i*31+r*7+c*3, off = t > 2.2 + (id%17)*0.28;                                             // les fenêtres s'éteignent une à une
        g.fillStyle = off? 'rgba(31,27,23,0.55)' : '#e8a53c'; g.fillRect(x+7+c*18, top+9+r*22, 9, 12); } });
    inkLine(g, [0,230, 480,230], 1, 2.2); inkHatch(g, 0, 230, 480, 40, 7, '#1f1b17', 0.22);
    inkFolk(g, 118, 230, 26); inkFolk(g, 214, 230, 24); inkFolk(g, 352, 230, 27);
    plateEnd(g, w, h); },
  radio(g, w, h, t, k){ plateBase(g, w, h);
    const n = clamp(t/2, 0, 1);
    inkLine(g, [40,206, 440,206], n, 3); inkHatch(g, 40, 206, 400, 30, 6);                                 // table
    inkLine(g, [230,206, 230,120, 380,120, 380,206], n, 2.6); inkWash(g, [230,206, 230,120, 380,120, 380,206], '#3d4a3a', 0.35);   // poste radio
    g.strokeStyle = '#1f1b17'; g.lineWidth = 2; g.beginPath(); g.arc(270, 162, 20, 0, 6.283*n); g.stroke();
    for (let i=0;i<5;i++) inkLine(g, [308, 140+i*10, 366, 140+i*10], n, 1.2);
    g.fillStyle = Math.sin(t*4)>0? '#c42a1c' : 'rgba(196,42,28,0.3)'; g.beginPath(); g.arc(360, 192, 4, 0, 6.283); g.fill();
    inkLine(g, [372,120, 396,40], n, 1.6);                                                                  // antenne
    for (let i=1;i<4;i++){ g.strokeStyle = 'rgba(196,42,28,'+(0.5*(1-((t*0.6+i/3)%1))).toFixed(3)+')'; g.lineWidth = 1.6; g.beginPath(); g.arc(396, 40, ((t*0.6+i/3)%1)*60, -2.4, -0.4); g.stroke(); }
    inkLine(g, [70,206, 84,178, 170,178, 184,206], n, 2); for (let i=0;i<4;i++) inkLine(g, [96,186+i*5, 160,186+i*5], n, 0.9);   // le carnet
    inkLine(g, [150,170, 186,150], n, 2.4, '#c42a1c');                                                      // le crayon rouge
    inkLine(g, [120,206, 120,96, 150,84], n, 2.2); inkWash(g, [140,78, 176,78, 186,98, 132,98], '#1f1b17', 0.7);   // lampe
    inkWash(g, [134,98, 184,98, 220,206, 100,206], '#e8a53c', 0.16);
    plateEnd(g, w, h); },
  march(g, w, h, t, k){ plateBase(g, w, h, 'rgba(30,34,70,0.12)');
    inkWash(g, [300,230, 300,96, 470,96, 470,230], '#1f1b17', 0.5); inkLine(g, [300,230, 300,96, 470,96, 470,230], 1, 2.4);      // le dépôt Halvard
    for (let i=0;i<6;i++) inkLine(g, [318+i*24, 150, 318+i*24, 230], 1, 1);
    g.fillStyle = '#e9dfc6'; g.font = '700 15px "Courier New",monospace'; g.textAlign = 'center'; g.fillText('HALVARD', 385, 124);
    g.fillStyle = Math.sin(t*3)>0? '#3aa0e0' : 'rgba(58,160,224,0.3)'; for (let i=0;i<3;i++) g.fillRect(330+i*50, 132, 10, 3);
    inkLine(g, [0,230, 480,230], 1, 2.2); inkHatch(g, 0, 230, 480, 40, 7, '#1f1b17', 0.22);
    for (let i=0;i<11;i++){ const x = -40 + i*23 + Math.min(1,t/5)*60, s = 24+((i*7)%5)*2; inkFolk(g, x, 230+((i*3)%4), s, '#1f1b17', i%4===1? 1 : 0); }
    const fx = 120 + Math.min(1,t/5)*60;                                                                    // le drapeau rouge
    inkLine(g, [fx,228, fx,150], 1, 2); const wv = Math.sin(t*3)*3;
    inkWash(g, [fx,150, fx+34,154+wv, fx+34,172+wv, fx,170], '#c42a1c', 0.92);
    plateEnd(g, w, h); },
  shutter(g, w, h, t, k){ plateBase(g, w, h);
    inkWash(g, [50,250, 50,40, 430,40, 430,250], '#1f1b17', 0.14); inkLine(g, [50,250, 50,40, 430,40, 430,250], 1, 2.6);
    for (let y=56; y<250; y+=12) inkLine(g, [56,y, 424,y], 1, 0.8);
    inkHatch(g, 50, 40, 380, 60, 6, '#1f1b17', 0.4);                                                         // suie
    const full = cT({fr:"ICI, ON A COUPÉ LE COURANT|À CEUX QUI COUPAIENT L'EAU.", en:"HERE WE CUT THE POWER|OF THOSE WHO CUT THE WATER.", es:"AQUÍ CORTAMOS LA LUZ|A LOS QUE CORTABAN EL AGUA.", de:"HIER HABEN WIR DEN STROM GEKAPPT|BEI DENEN, DIE DAS WASSER ABDREHTEN.", it:"QUI ABBIAMO TOLTO LA CORRENTE|A CHI TOGLIEVA L'ACQUA.", pt:"AQUI CORTÁMOS A LUZ|A QUEM CORTAVA A ÁGUA.", ru:"ЗДЕСЬ МЫ ОТКЛЮЧИЛИ СВЕТ|ТЕМ, КТО ОТКЛЮЧАЛ ВОДУ.", zh:"我们在这里切断了电|给那些切断了水的人。", ar:"هنا قطعنا الكهرباء|عمّن قطعوا عنا الماء."}).split('|');
    g.fillStyle = '#c42a1c'; g.font = '700 21px "Courier New",monospace'; g.textAlign = 'center';
    let left = Math.floor(t*16); full.forEach((l,i)=>{ g.fillText(l.slice(0, Math.max(0,left)), 240, 140+i*34); left -= l.length; });
    plateEnd(g, w, h); },
  pager(g, w, h, t, k){ plateBase(g, w, h);
    inkLine(g, [30,210, 450,210], 1, 3); inkHatch(g, 30, 210, 420, 30, 6);
    inkWash(g, [170,210, 176,150, 304,150, 310,210], '#23292b', 0.9); inkWash(g, [190,160, 290,160, 290,190, 190,190], '#9db79a', 1);
    if (t>1.4){ g.fillStyle = '#1b2a1c'; g.font = '700 26px "Courier New",monospace'; g.textAlign = 'center'; g.fillText(Math.sin(t*5)>-0.4? '55' : '', 240, 184); }
    if (t>1.4) for (let i=0;i<3;i++){ const r = ((t*0.9+i/3)%1); g.strokeStyle = 'rgba(11,111,168,'+(0.5*(1-r)).toFixed(3)+')'; g.lineWidth = 1.6; g.beginPath(); g.arc(240, 150, 20+r*70, 3.5, 5.9); g.stroke(); }
    inkLine(g, [70,210, 84,184, 150,184, 160,210], 1, 2);
    plateEnd(g, w, h); },
  dark(g, w, h, t, k){ plateBase(g, w, h, 'rgba(14,16,34,0.55)');
    inkLine(g, [0,230, 480,230], 1, 2.2);
    for (let i=0;i<5;i++) inkFolk(g, 400 - i*70 - t*8, 230, 24+(i%3)*2, 'rgba(20,18,24,0.8)');
    inkLine(g, [60,230, 60,120, 76,112], 1, 2.4);
    plateEnd(g, w, h); },
};

campExtend(0, {
  biome:'night', theme:'nightcity',
  rule:{fr:"Il fait nuit : vos tireurs portent moins loin hors de la lumière et l'ennemi caché dans le noir ne se voit pas. Reprenez les transformateurs pour rallumer la rue. Première ère seulement, une seule vie.",
        en:"It is night: your shooters reach less far outside the light and enemies in the dark cannot be seen. Retake the transformers to light the street again. First era only, one life.", es:"Es de noche: sus tiradores alcanzan menos lejos fuera de la luz y el enemigo oculto en la oscuridad no se ve. Recuperen los transformadores para volver a encender la calle. Solo en la primera era, una sola vida.", de:"Es ist Nacht: Eure Schützen treffen außerhalb des Lichts weniger weit, und der Feind im Dunkeln ist nicht zu sehen. Holt die Transformatoren zurück, um die Straße wieder zu erhellen. Nur in der ersten Ära, nur ein Leben.", it:"È notte: i vostri tiratori arrivano meno lontano fuori dalla luce e il nemico nascosto nel buio non si vede. Riprendete i trasformatori per riaccendere la strada. Solo prima era, una sola vita.", pt:"É noite: os seus atiradores alcançam menos longe fora da luz e o inimigo escondido no escuro não se vê. Retome os transformadores para reacender a rua. Só na primeira era, uma única vida.", ru:"Ночь: ваши стрелки бьют на меньшее расстояние вне света, а враг, скрытый во тьме, не виден. Отбейте трансформаторы, чтобы вернуть свет на улицу. Только первая эра, одна жизнь.", zh:"现在是夜里：射手离开光亮后射程变短，藏在黑暗中的敌人也看不见。夺回变压器，让街道重新亮起来。仅限第一纪元，只有一条命。", ar:"الوقت ليل: رماتكم يصيبون أقل بعدًا خارج الضوء، ولا يُرى العدو المختبئ في الظلام. استعيدوا المحوّلات لتُضاء الشارع من جديد. العصر الأول فقط، وحياة واحدة."},
  action:{ label:{fr:"FUSÉE ÉCLAIRANTE", en:"FLARE", es:"BENGALA", de:"LEUCHTRAKETE", it:"RAZZO LUMINOSO", pt:"FOGUETE DE SINALIZAÇÃO", ru:"ОСВЕТИТЕЛЬНАЯ РАКЕТА", zh:"照明弹", ar:"قنبلة إنارة"}, cd:38,
    use(g, c){ c.flare = { x: camX + VW()/2, t:14 }; sfx('shoot', 2); addFloater(c.flare.x, gY(c.flare.x)-120, '✦', '#ffe9a8', 18); } },
  setup(g, c){
    campGrant(g.p, 240, 200, 70); g.e.hp = g.e.maxhp = Math.round([550,850,1000][c.lvl]*g.d.hpMul);
    c.hidden = u => u.side===-1 && !campInLight(u.x);
    const dim = [0.85, 0.8, 0.72][c.lvl];                                  // dans le noir, nos tireurs visent moins loin (moins durement en récit « Veillée »)
    c.rangeMul = u => (u.side===1 && u.range>60 && !campInLight(u.x, true))? dim : 1;
    c.owned = 0; this.light(g, c);
  },
  // sources de lumière de la frame : base, transformateurs repris, lampes des unités, fusée, dépôt ennemi, explosions
  light(g, c){
    const Ls = c.lights; Ls.length = 0;
    Ls.push({x:g.p.x+40, r:330, big:1});
    for (const z of g.zones) if (z.owner==='p') Ls.push({x:z.x, r:400, big:1}); else if (Math.abs(z.prog)>0.05 && z.prog>0) Ls.push({x:z.x, r:120*z.prog});
    if (c.flare) Ls.push({x:c.flare.x, y:gY(c.flare.x)-70, r:470*Math.min(1, c.flare.t/2), big:1});
    Ls.push({x:g.e.x-30, r:190, a:0.75});
    let n = 0; const first = Ls.length;
    for (const u of g.p.units){ if (n>=16) break; let near = false; for (let i=first;i<Ls.length;i++) if (Math.abs(Ls[i].x-u.x)<56){ near = true; break; }
      if (!near){ Ls.push({x:u.x, r:u.role==='hero'? 170 : 104}); n++; } }
    for (let i=LIGHTS.length-1, k=0; i>=0 && k<8; i--, k++){ const L = LIGHTS[i]; Ls.push({x:L.x, y:L.y, r:L.r*0.9, a:1-L.t/L.life}); }
  },
  tick(g, c, dt){
    if (c.flare && (c.flare.t -= dt) <= 0) c.flare = null;
    const own = g.zones.filter(z=>z.owner==='p').length;
    if (own > c.owned) sfx('evolve');
    c.owned = own; c.litK += (own/3 - c.litK) * Math.min(1, dt*0.8);
    this.light(g, c);
  },
  hud(g, c){ return { prog: 1 - g.e.hp/g.e.maxhp, label: c.owned+'/3 ⚡' }; },
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
  // la fusée éclairante descend sous son parachute
  draw(g, c){ const f = c.flare; if (!f) return; const x = f.x-camX, y = gY(f.x) - 60 - f.t*6;
    ctx.strokeStyle = 'rgba(230,230,240,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-7,y-16); ctx.moveTo(x,y); ctx.lineTo(x+7,y-16); ctx.stroke();
    ctx.fillStyle = 'rgba(230,230,240,0.6)'; ctx.beginPath(); ctx.arc(x, y-16, 8, 3.14, 6.283); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(lightSprite('#ffe9a8'), x-34, y-34, 68, 68); ctx.restore();
    ctx.fillStyle = '#fff8e0'; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.283); ctx.fill(); },
  intro(g, c){ const z = g.zones; return [
    { plate:M1_PLATES.tap, mus:'carnet', who:'nar', txt:{fr:"Octobre 2025. Chez nous, l'eau s'est arrêtée un mardi. Ce n'était pas une panne. C'était une décision.", en:"October 2025. In our street the water stopped on a Tuesday. It was not a breakdown. It was a decision.", es:"Octubre de 2025. En nuestra calle el agua se cortó un martes. No fue una avería. Fue una decisión.", de:"Oktober 2025. Bei uns in der Straße wurde an einem Dienstag das Wasser abgestellt. Das war keine Panne. Das war eine Entscheidung.", it:"Ottobre 2025. Da noi l'acqua si è fermata un martedì. Non era un guasto. Era una decisione.", pt:"Outubro de 2025. Na nossa rua a água parou numa terça-feira. Não foi uma avaria. Foi uma decisão.", ru:"Октябрь 2025-го. У нас на улице воду отключили во вторник. Это была не авария. Это было решение.", zh:"2025年10月。我们这条街的水在一个星期二停了。那不是故障，是一项决定。", ar:"أكتوبر 2025. في شارعنا انقطع الماء ذات ثلاثاء. لم يكن عطلًا. كان قرارًا."} },
    { plate:M1_PLATES.street, who:'nar', txt:{fr:"Puis le courant. Rue après rue, selon un « score de fiabilité » que personne n'avait demandé à passer.", en:"Then the power. Street after street, by a \"reliability score\" nobody had asked to sit.", es:"Luego la luz. Calle tras calle, según una «puntuación de fiabilidad» que nadie había pedido examinar.", de:"Dann der Strom. Straße für Straße, nach einem „Zuverlässigkeitswert“, für den sich niemand je angemeldet hatte.", it:"Poi la corrente. Strada dopo strada, secondo un «punteggio di affidabilità» che nessuno aveva chiesto di sostenere.", pt:"Depois a luz. Rua após rua, segundo uma «pontuação de fiabilidade» a que ninguém pedira para ser submetido.", ru:"Потом свет. Улица за улицей, по «рейтингу надёжности», сдавать который никто не просился.", zh:"接着是电。一条街接一条街，依据一个没人要求参加的“可靠度评分”。", ar:"ثم الكهرباء. شارعًا بعد شارع، وفق «درجة موثوقية» لم يطلب أحد أن يخضع لها."} },
    { plate:M1_PLATES.radio, who:'sol', txt:{fr:"Je m'appelle Sol. Trente ans au standard des pompiers. Je sais reconnaître une voix qui a peur — et une ville qui se tait.", en:"My name is Sol. Thirty years on the fire-brigade switchboard. I know a frightened voice when I hear one — and a city falling silent.", es:"Me llamo Sol. Treinta años en la centralita de los bomberos. Reconozco una voz que tiene miedo, y una ciudad que se calla.", de:"Ich heiße Sol. Dreißig Jahre in der Feuerwehr-Leitstelle. Ich erkenne eine Stimme, die Angst hat — und eine Stadt, die verstummt.", it:"Mi chiamo Sol. Trent'anni al centralino dei pompieri. So riconoscere una voce che ha paura, e una città che tace.", pt:"Chamo-me Sol. Trinta anos na central dos bombeiros. Sei reconhecer uma voz que tem medo, e uma cidade que se cala.", ru:"Меня зовут Sol. Тридцать лет на пожарном коммутаторе. Я узнаю голос, которому страшно, и город, который замолкает.", zh:"我叫 Sol。在消防队总机前坐了三十年。我听得出一个害怕的声音，也听得出一座沉默的城市。", ar:"اسمي Sol. ثلاثون عامًا على مقسم الإطفاء. أعرف الصوت الخائف حين أسمعه، والمدينة حين تصمت."} },
    { plate:M1_PLATES.march, who:'sol', txt:{fr:"Cette nuit, on ne paie pas. Cette nuit, on va au dépôt Halvard. Si vous lisez ce carnet, c'est que quelqu'un a tenu la radio.", en:"Tonight we do not pay. Tonight we walk to the Halvard depot. If you are reading this notebook, someone kept the radio going.", es:"Esta noche no se paga. Esta noche vamos al depósito Halvard. Si lees este cuaderno, es que alguien mantuvo la radio.", de:"Heute Nacht zahlen wir nicht. Heute Nacht gehen wir zum Halvard-Depot. Wenn du dieses Heft liest, hat jemand das Funkgerät am Laufen gehalten.", it:"Stanotte non si paga. Stanotte si va al deposito Halvard. Se leggi questo quaderno, vuol dire che qualcuno ha tenuto accesa la radio.", pt:"Esta noite não se paga. Esta noite vamos ao depósito Halvard. Se estás a ler este caderno, é porque alguém manteve a rádio ligada.", ru:"Этой ночью мы не платим. Этой ночью идём к депо Halvard. Если ты читаешь эту тетрадь, значит, кто-то удержал рацию.", zh:"今夜我们不付钱。今夜我们去 Halvard 车库。如果你正在读这本笔记，说明有人守住了电台。", ar:"الليلة لا ندفع. الليلة نمضي إلى مستودع Halvard. إن كنت تقرأ هذا الدفتر، فقد صمد أحدهم عند اللاسلكي."} },
    { mus:null, cam:{x:g.p.x+200, t:0.1}, dur:3.6, title:{fr:"I · La nuit des compteurs", en:"I · The night of the meters", es:"I · La noche de los contadores", de:"I · Die Nacht der Zähler", it:"I · La notte dei contatori", pt:"I · A noite dos contadores", ru:"I · Ночь счётчиков", zh:"I · 电表之夜", ar:"I · ليلة العدّادات"}, sub:{fr:"Valmont, quartier des Tanneurs — octobre 2025", en:"Valmont, the Tanners' district — October 2025", es:"Valmont, barrio de los Curtidores — octubre de 2025", de:"Valmont, das Gerberviertel — Oktober 2025", it:"Valmont, quartiere dei Conciatori — ottobre 2025", pt:"Valmont, bairro dos Curtidores — outubro de 2025", ru:"Valmont, квартал Дубильщиков — октябрь 2025", zh:"Valmont，制革匠街区 — 2025年10月", ar:"Valmont، حي الدبّاغين — أكتوبر 2025"} },
    { cam:{x:z[0].x}, who:'sol', txt:{fr:"Trois transformateurs tiennent la rue. Reprenez-les et le quartier se rallume. Dans le noir, leurs machines voient. Pas nous.", en:"Three transformers hold the street. Retake them and the district lights up again. In the dark their machines can see. We cannot.", es:"Tres transformadores sostienen la calle. Recupérenlos y el barrio se enciende. A oscuras, sus máquinas ven. Nosotros no.", de:"Drei Transformatoren halten die Straße. Holt sie zurück, und das Viertel leuchtet wieder. Im Dunkeln sehen ihre Maschinen. Wir nicht.", it:"Tre trasformatori reggono la strada. Riprendeteli e il quartiere si riaccende. Al buio, le loro macchine vedono. Noi no.", pt:"Três transformadores seguram a rua. Retome-os e o bairro volta a acender-se. No escuro, as máquinas deles veem. Nós não.", ru:"Три трансформатора держат улицу. Отбейте их — и квартал снова загорится. В темноте их машины видят. Мы — нет.", zh:"三台变压器掌控着这条街。夺回它们，街区就会重新亮起来。在黑暗里，他们的机器看得见，我们看不见。", ar:"ثلاثة محوّلات تمسك بالشارع. استعيدوها ويُضاء الحي من جديد. في الظلام، آلاتهم ترى. أما نحن فلا."} },
    { cam:{x:g.e.x-120, t:3}, who:'sol', txt:{fr:"Au bout de la rue : le dépôt Halvard. C'est lui qui pilote les compteurs.", en:"At the end of the street: the Halvard depot. It runs the meters.", es:"Al final de la calle: el depósito Halvard. Es él quien gobierna los contadores.", de:"Am Ende der Straße: das Halvard-Depot. Von dort werden die Zähler gesteuert.", it:"In fondo alla strada: il deposito Halvard. È lui che comanda i contatori.", pt:"No fim da rua: o depósito Halvard. É ele que comanda os contadores.", ru:"В конце улицы — депо Halvard. Оно управляет счётчиками.", zh:"街的尽头：Halvard 车库。电表就是由它控制的。", ar:"في نهاية الشارع: مستودع Halvard. منه تُدار العدّادات."} },
    { cam:{x:g.p.x+200, t:2.4}, who:'sol', txt:{fr:"Vous avez des fusées éclairantes. Bâtissez, nourrissez les nôtres, puis avancez de lampe en lampe. À vous, commandant.", en:"You have flares. Build, feed our people, then advance from lamp to lamp. Over to you, commander.", es:"Tienen bengalas. Construyan, alimenten a los nuestros y luego avancen de farol en farol. Su turno, comandante.", de:"Ihr habt Leuchtraketen. Baut, versorgt unsere Leute, dann rückt von Lampe zu Lampe vor. Sie sind dran, Kommandant.", it:"Avete dei razzi luminosi. Costruite, nutrite i nostri, poi avanzate di lampada in lampada. A voi, comandante.", pt:"Tem foguetes de sinalização. Construa, alimente os nossos e depois avance de lâmpada em lâmpada. É consigo, comandante.", ru:"У вас есть осветительные ракеты. Стройте, кормите наших, затем продвигайтесь от лампы к лампе. Слово за вами, командир.", zh:"你们有照明弹。建设、喂饱我们的人，然后一盏灯接一盏灯地推进。交给你了，指挥官。", ar:"معكم قنابل إنارة. ابنوا، وأطعموا رجالنا، ثم تقدّموا من مصباح إلى مصباح. الأمر لكم، أيها القائد."} },
  ]; },
  outro(g, c, win){ return win? [
    { cam:{x:g.e.x-80, t:1.5}, dur:3.2, fx(){ for (let i=0;i<5;i++) setTimeout(()=>{ if (game===g){ explode(g.e.x-120+Math.random()*200, gY(g.e.x)-20-Math.random()*60, 1.4); sfx('boom'); } }, i*450); },
      who:'sol', txt:{fr:"Il brûle. Commandant… il brûle, et aux étages les gens sont aux fenêtres.", en:"It is burning. Commander… it is burning, and upstairs people are at their windows.", es:"Está ardiendo. Comandante… está ardiendo, y en los pisos de arriba la gente se asoma a las ventanas.", de:"Es brennt. Kommandant … es brennt, und oben stehen die Leute an den Fenstern.", it:"Sta bruciando. Comandante… sta bruciando, e ai piani di sopra la gente è affacciata alle finestre.", pt:"Está a arder. Comandante… está a arder, e nos andares de cima as pessoas estão às janelas.", ru:"Горит. Командир… горит, а на верхних этажах люди стоят у окон.", zh:"起火了。指挥官……起火了，楼上的人都挤在窗口。", ar:"إنه يحترق. أيها القائد… يحترق، وفي الطوابق العليا الناس عند النوافذ."} },
    { plate:M1_PLATES.shutter, mus:'carnet', who:'nar', txt:{fr:"À l'aube, quelqu'un avait peint sur le rideau de fer. Omnicorp a parlé d'un « incident logistique ».", en:"At dawn someone had painted on the shutter. Omnicorp spoke of a \"logistics incident\".", es:"Al amanecer, alguien había pintado sobre la persiana metálica. Omnicorp habló de un «incidente logístico».", de:"Im Morgengrauen hatte jemand etwas auf das Rollgitter gemalt. Omnicorp sprach von einem „Logistikvorfall“.", it:"All'alba qualcuno aveva dipinto sulla saracinesca. Omnicorp parlò di un «incidente logistico».", pt:"Ao amanhecer, alguém tinha pintado na porta de enrolar. A Omnicorp falou de um «incidente logístico».", ru:"На рассвете кто-то написал на рольставне. Omnicorp заговорила о «логистическом инциденте».", zh:"黎明时，有人在卷帘门上涂了字。Omnicorp 称之为“物流事故”。", ar:"عند الفجر كان أحدهم قد كتب على الستارة الحديدية. وتحدّثت Omnicorp عن «حادث لوجستي»."} },
    { plate:M1_PLATES.pager, who:'sol', txt:{fr:"Trois jours plus tard, un bipeur que personne n'avait acheté a sonné sur ma table. Deux chiffres. Rien d'autre.", en:"Three days later a pager nobody had bought rang on my table. Two digits. Nothing else.", es:"Tres días después, un busca que nadie había comprado sonó sobre mi mesa. Dos cifras. Nada más.", de:"Drei Tage später klingelte auf meinem Tisch ein Pager, den niemand gekauft hatte. Zwei Ziffern. Sonst nichts.", it:"Tre giorni dopo, un cercapersone che nessuno aveva comprato squillò sul mio tavolo. Due cifre. Nient'altro.", pt:"Três dias depois, um pager que ninguém comprara tocou na minha mesa. Dois algarismos. Mais nada.", ru:"Три дня спустя на моём столе зазвонил пейджер, который никто не покупал. Две цифры. И больше ничего.", zh:"三天后，我桌上响起一只没人买过的寻呼机。两个数字，别无其他。", ar:"بعد ثلاثة أيام رنّ على طاولتي جهاز نداء لم يشتره أحد. رقمان. لا شيء غير ذلك."} },
  ] : [
    { plate:M1_PLATES.dark, mus:'carnet', who:'sol', txt:{fr:"On s'est dispersés dans la nuit. Les compteurs tournent toujours. Mais la rue a entendu le bruit qu'a fait le dépôt quand vous l'avez touché.", en:"We scattered into the night. The meters are still running. But the street heard the sound the depot made when you hit it.", es:"Nos dispersamos en la noche. Los contadores siguen girando. Pero la calle oyó el ruido que hizo el depósito cuando lo tocaron.", de:"Wir zerstreuten uns in die Nacht. Die Zähler laufen weiter. Aber die Straße hat den Lärm gehört, den das Depot machte, als Ihr es getroffen habt.", it:"Ci siamo dispersi nella notte. I contatori girano ancora. Ma la strada ha sentito il rumore che ha fatto il deposito quando l'avete colpito.", pt:"Dispersámo-nos na noite. Os contadores continuam a rodar. Mas a rua ouviu o barulho que o depósito fez quando o atingiram.", ru:"Мы рассеялись в ночи. Счётчики всё ещё крутятся. Но улица услышала, какой грохот издало депо, когда вы по нему ударили.", zh:"我们消散在夜色里。电表仍在转。但街上的人听见了，你们击中车库时它发出的那声巨响。", ar:"تفرّقنا في الليل. ما زالت العدّادات تدور. لكن الشارع سمع الصوت الذي أصدره المستودع حين ضربتموه."} },
  ]; },
});
// premier transformateur repris : la caméra va voir le quartier se rallumer
CAMPAIGN[0].radio.push({ when:(g,c)=>c.owned>=1, who:'sol',
  cine(g, c){ const z = g.zones.find(z=>z.owner==='p') || g.zones[0]; return [
    { cam:{x:z.x, t:1.2}, live:true, dur:1.4 },
    { cam:{x:z.x}, who:'sol', txt:{fr:"Ça y est… regardez les fenêtres. Ils rallument. Ils nous regardent, commandant. C'est la première fois qu'ils regardent.", en:"There… look at the windows. They are switching the lights back on. They are watching us, commander. It is the first time they have watched.", es:"Ya está… miren las ventanas. Vuelven a encender. Nos miran, comandante. Es la primera vez que miran.", de:"Da … seht euch die Fenster an. Sie machen das Licht wieder an. Sie sehen uns an, Kommandant. Zum ersten Mal sehen sie hin.", it:"Ecco… guardate le finestre. Riaccendono. Ci guardano, comandante. È la prima volta che guardano.", pt:"Pronto… vejam as janelas. Estão a acender de novo. Estão a olhar para nós, comandante. É a primeira vez que olham.", ru:"Вот оно… смотрите на окна. Свет снова включают. Они смотрят на нас, командир. Впервые — смотрят.", zh:"成了……看那些窗户。灯又亮了。他们在看我们，指挥官。这是他们第一次看过来。", ar:"ها قد حصل… انظروا إلى النوافذ. يُشعلون الأنوار من جديد. إنهم ينظرون إلينا، أيها القائد. إنها المرة الأولى التي ينظرون فيها."} },
  ]; } });
