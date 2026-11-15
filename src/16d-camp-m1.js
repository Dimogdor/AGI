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

/* ---------- textes de la mission (fr verbatim de docs/campagne/M1.md ; 9 langues) ---------- */
const M1_TX = {
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
  where:{fr:"Valmont, rue des Tanneurs — nuit du 14 octobre 2025, sous la pluie.",
    en:"Valmont, Rue des Tanneurs — the night of 14 October 2025, in the rain.",
    es:"Valmont, calle de los Curtidores — noche del 14 de octubre de 2025, bajo la lluvia.",
    de:"Valmont, Gerberstraße — Nacht auf den 14. Oktober 2025, im Regen.",
    it:"Valmont, via dei Conciatori — notte del 14 ottobre 2025, sotto la pioggia.",
    pt:"Valmont, rua dos Curtidores — noite de 14 de outubro de 2025, sob a chuva.",
    ru:"Valmont, улица Кожевников — ночь на 14 октября 2025 года, под дождём.",
    zh:"Valmont，制革匠街——2025年10月14日夜，细雨中。",
    ar:"Valmont، شارع الدبّاغين — ليلة 14 أكتوبر 2025، تحت المطر."},
  goal:{fr:"Détruire le dépôt Halvard, au bout de la rue : c'est lui qui pilote les compteurs.",
    en:"Destroy the Halvard depot at the end of the street: it controls the meters.",
    es:"Destruir el depósito Halvard, al final de la calle: es él quien controla los contadores.",
    de:"Das Depot Halvard am Ende der Straße zerstören: Von dort werden die Zähler gesteuert.",
    it:"Distruggere il deposito Halvard, in fondo alla strada: è lui che comanda i contatori.",
    pt:"Destruir o depósito Halvard, no fim da rua: é ele que controla os medidores.",
    ru:"Уничтожить депо Halvard в конце улицы: оно управляет счётчиками.",
    zh:"摧毁街尽头的 Halvard 仓库：电表正是由它操控的。",
    ar:"دمّروا مستودع Halvard في آخر الشارع: فهو الذي يتحكم بالعدّادات."},
  goal2:{fr:"Facultatif : rallumer les trois transformateurs ensemble · tenir les deux bornes d'incendie · finir avant l'aube (14:00).",
    en:"Optional: relight all three transformers together · hold both fire hydrants · finish before dawn (14:00).",
    es:"Opcional: encender los tres transformadores a la vez · mantener las dos bocas de incendio · terminar antes del alba (14:00).",
    de:"Optional: alle drei Transformatoren gleichzeitig einschalten · beide Hydranten halten · vor der Morgendämmerung fertig sein (14:00).",
    it:"Facoltativo: riaccendere insieme i tre trasformatori · tenere i due idranti · finire prima dell'alba (14:00).",
    pt:"Opcional: religar os três transformadores ao mesmo tempo · segurar os dois hidrantes · terminar antes do amanhecer (14:00).",
    ru:"По желанию: включить все три трансформатора одновременно · удерживать оба гидранта · закончить до рассвета (14:00).",
    zh:"可选：同时点亮三台变压器 · 守住两个消防栓 · 在黎明前（14:00）结束。",
    ar:"اختياري: إعادة تشغيل المحوّلات الثلاثة معًا · الإمساك بصنبوري الإطفاء · الإنهاء قبل الفجر (14:00)."},
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
  o1:{fr:"Octobre 2025. Chez nous, l'eau s'est arrêtée un mardi. Ce n'était pas une panne. C'était une décision.", en:"October 2025. In our street the water stopped on a Tuesday. It was not a breakdown. It was a decision.", es:"Octubre de 2025. En nuestra calle el agua se cortó un martes. No fue una avería. Fue una decisión.", de:"Oktober 2025. Bei uns in der Straße wurde an einem Dienstag das Wasser abgestellt. Das war keine Panne. Das war eine Entscheidung.", it:"Ottobre 2025. Da noi l'acqua si è fermata un martedì. Non era un guasto. Era una decisione.", pt:"Outubro de 2025. Na nossa rua a água parou numa terça-feira. Não foi uma avaria. Foi uma decisão.", ru:"Октябрь 2025-го. У нас на улице воду отключили во вторник. Это была не авария. Это было решение.", zh:"2025年10月。我们这条街的水在一个星期二停了。那不是故障，是一项决定。", ar:"أكتوبر 2025. في شارعنا انقطع الماء ذات ثلاثاء. لم يكن عطلًا. كان قرارًا."},
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
  cardS:{fr:"Valmont, rue des Tanneurs — octobre 2025", en:"Valmont, Rue des Tanneurs — October 2025", es:"Valmont, calle de los Curtidores — octubre de 2025", de:"Valmont, Gerberstraße — Oktober 2025", it:"Valmont, via dei Conciatori — ottobre 2025", pt:"Valmont, rua dos Curtidores — outubro de 2025", ru:"Valmont, улица Кожевников — октябрь 2025", zh:"Valmont，制革匠街 — 2025年10月", ar:"Valmont، شارع الدبّاغين — أكتوبر 2025"},
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
  rHyd:{fr:"L'eau coule ! Avec l'eau, on bâtit un puits et une tourelle. Mettez des Fusiliers dans la tourelle.",
    en:"The water's flowing! With water we can build a well and a turret. Put Riflemen in the turret.",
    es:"¡El agua corre! Con agua se construye un pozo y una torreta. Pongan Fusileros en la torreta.",
    de:"Das Wasser fließt! Mit Wasser bauen wir einen Brunnen und einen Turm. Stecken Sie Schützen in den Turm.",
    it:"L'acqua scorre! Con l'acqua si costruiscono un pozzo e una torretta. Mettete dei Fucilieri nella torretta.",
    pt:"A água corre! Com água construímos um poço e uma torreta. Ponham Fuzileiros na torreta.",
    ru:"Вода пошла! С водой можно построить колодец и башню. Посадите стрелков в башню.",
    zh:"水来了！有了水，就能建水井和炮塔。让步枪手进炮塔。",
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
  rCrs:{fr:"Les voisins descendent : on peut équiper des CRS lourds. Mettez-les devant, ils encaissent pour les autres.",
    en:"The neighbours are coming down: we can equip Heavy CRS. Put them in front; they take the hits for the others.",
    es:"Los vecinos bajan: podemos equipar CRS pesados. Pónganlos delante, aguantan por los demás.",
    de:"Die Nachbarn kommen herunter: Wir können Schwere CRS ausrüsten. Stellen Sie sie nach vorn, sie fangen die Schläge für alle ab.",
    it:"I vicini scendono: possiamo equipaggiare CRS pesanti. Metteteli davanti, incassano per gli altri.",
    pt:"Os vizinhos estão a descer: podemos equipar CRS pesados. Ponham-nos à frente, eles aguentam por todos.",
    ru:"Соседи спускаются: можно экипировать Тяжёлый ОМОН. Ставьте их вперёд — они принимают удар за остальных.",
    zh:"邻居们下来了：我们可以装备重型镇暴队。让他们站在前面，替其他人挡住攻击。",
    ar:"نزل الجيران: يمكننا تجهيز CRS ثقيل. ضعوهم في المقدّمة فهم يتحمّلون الضربات عن الآخرين."},
  rHeavy:{fr:"Un châssis lourd sort du dépôt. Il est lent. Les CRS le retiennent, les Fusiliers le finissent.",
    en:"A heavy chassis is coming out of the depot. It is slow. The CRS hold it, the Riflemen finish it.",
    es:"Un chasis pesado sale del depósito. Es lento. Los CRS lo frenan, los Fusileros lo rematan.",
    de:"Ein schweres Chassis rollt aus dem Depot. Es ist langsam. Die CRS halten es auf, die Schützen erledigen es.",
    it:"Un telaio pesante esce dal deposito. È lento. I CRS lo trattengono, i Fucilieri lo finiscono.",
    pt:"Um chassi pesado sai do depósito. É lento. Os CRS seguram-no, os Fuzileiros acabam com ele.",
    ru:"Из депо выходит тяжёлое шасси. Оно медленное. ОМОН его удержит, стрелки добьют.",
    zh:"一台重型底盘正从仓库开出来。它很慢。镇暴队拖住它，步枪手收拾它。",
    ar:"هيكل ثقيل يخرج من المستودع. إنه بطيء. يمسك به CRS وتُجهز عليه البنادق."},
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

campMission(0, {
  num:'I', year:"2025", ai:[0,1,1], eraCap:0, oneLife:true, dev0:0,
  title:M1_TX.title, place:M1_TX.place,
  recap:M1_TX.recap, where:M1_TX.where, goal:M1_TX.goal, goal2:M1_TX.goal2,
  tips:[M1_TX.tip1, M1_TX.tip2, M1_TX.tip3],
  debrief:M1_TX.debrief, fail:M1_TX.fail,
  radio:[
    {at:6, who:'sol', txt:{fr:"Germinal, ici Sol. La fréquence est propre. Bâtissez d'abord de quoi nourrir les nôtres : une ferme, un marché, un puits.", en:"Germinal, this is Sol. The frequency is clean. First build what feeds our people: a farm, a market, a well.", es:"Germinal, aquí Sol. La frecuencia está limpia. Construya primero lo que alimenta a los nuestros: una granja, un mercado, un pozo.", de:"Germinal, hier Sol. Die Frequenz ist sauber. Bauen Sie zuerst, was unsere Leute ernährt: eine Farm, einen Markt, einen Brunnen.", it:"Germinal, qui Sol. La frequenza è pulita. Prima costruisca ciò che nutre i nostri: una fattoria, un mercato, un pozzo.", pt:"Germinal, aqui é a Sol. A frequência está limpa. Primeiro construa o que alimenta o nosso pessoal: uma fazenda, um mercado, um poço.", ru:"Germinal, это Sol. Частота чистая. Сначала постройте то, что накормит наших людей: ферму, рынок, колодец.", zh:"Germinal，我是Sol。频道干净。先建起能养活我们这些人的设施：农场、市场、水井。", ar:"Germinal، هنا Sol. التردّد نظيف. ابنِ أولًا ما يُطعم أهلنا: مزرعة وسوقًا وبئرًا."}},
    {at:75, who:'sol', txt:{fr:"Leurs robots de manutention sortent du dépôt. Ils ne savent pas se battre. Ils apprennent vite : ne leur en laissez pas le temps.", en:"Their handling robots are coming out of the depot. They don't know how to fight. They learn fast: don't give them the time.", es:"Sus robots de carga salen del depósito. No saben pelear. Aprenden rápido: no les dé tiempo.", de:"Ihre Lagerroboter kommen aus dem Depot. Sie können nicht kämpfen. Sie lernen schnell: Geben Sie ihnen keine Zeit.", it:"I loro robot di movimentazione escono dal deposito. Non sanno combattere. Imparano in fretta: non dia loro il tempo.", pt:"Os robôs de carga deles estão saindo do depósito. Não sabem lutar. Aprendem rápido: não lhes dê tempo.", ru:"Их погрузочные роботы выходят из депо. Драться они не умеют. Но учатся быстро: не давайте им времени.", zh:"他们的搬运机器人正从仓库里出来。它们还不会打仗，但学得很快：别给它们时间。", ar:"روبوتات المناولة التابعة لهم تخرج من المستودع. لا تعرف القتال، لكنها تتعلّم بسرعة: لا تمنحها الوقت."}},
    {when:g=>g.e.hp<g.e.maxhp*0.5, who:'sol', txt:{fr:"Le dépôt fume ! Dans les étages, les gens sont aux fenêtres. Ils regardent, commandant. C'est la première fois qu'ils regardent.", en:"The depot is smoking! Upstairs, people are at their windows. They are watching, commander. It is the first time they have watched.", es:"¡El depósito humea! En los pisos de arriba, la gente está en las ventanas. Están mirando, comandante. Es la primera vez que miran.", de:"Das Depot qualmt! In den Stockwerken darüber stehen die Leute an den Fenstern. Sie sehen zu, Kommandant. Zum ersten Mal sehen sie hin.", it:"Il deposito fuma! Ai piani alti la gente è alle finestre. Stanno guardando, comandante. È la prima volta che guardano.", pt:"O depósito está fumegando! Nos andares de cima, o pessoal está nas janelas. Estão olhando, comandante. É a primeira vez que olham.", ru:"Депо дымится! В окнах верхних этажей люди. Они смотрят, командир. Впервые — смотрят.", zh:"仓库冒烟了！楼上的人都趴在窗前。他们在看，指挥官。这是他们第一次抬头看。", ar:"المستودع يدخّن! في الطوابق العليا يقف الناس عند نوافذهم. إنهم يراقبون أيها القائد. إنها المرة الأولى التي يراقبون فيها."}},
  ],
  biome:'night', theme:'nightcity',
  dAdj:[null, null, { eHp:1.06, eDmg:1.06 }],                          // la nuit pèse déjà : en Dernier carré, machines un peu moins renforcées
  map:{ zones:[WORLD*0.30, WORLD*0.50, WORLD*0.70] },                   // trois transformateurs de quartier ; aucun point d'eau
  rule:{fr:"Il fait nuit : vos tireurs portent moins loin hors de la lumière et l'ennemi caché dans le noir ne se voit pas. Reprenez les transformateurs pour rallumer la rue. Première ère seulement, une seule vie.",
        en:"It is night: your shooters reach less far outside the light and enemies in the dark cannot be seen. Retake the transformers to light the street again. First era only, one life.", es:"Es de noche: sus tiradores alcanzan menos lejos fuera de la luz y el enemigo oculto en la oscuridad no se ve. Recuperen los transformadores para volver a encender la calle. Solo en la primera era, una sola vida.", de:"Es ist Nacht: Eure Schützen treffen außerhalb des Lichts weniger weit, und der Feind im Dunkeln ist nicht zu sehen. Holt die Transformatoren zurück, um die Straße wieder zu erhellen. Nur in der ersten Ära, nur ein Leben.", it:"È notte: i vostri tiratori arrivano meno lontano fuori dalla luce e il nemico nascosto nel buio non si vede. Riprendete i trasformatori per riaccendere la strada. Solo prima era, una sola vita.", pt:"É noite: os seus atiradores alcançam menos longe fora da luz e o inimigo escondido no escuro não se vê. Retome os transformadores para reacender a rua. Só na primeira era, uma única vida.", ru:"Ночь: ваши стрелки бьют на меньшее расстояние вне света, а враг, скрытый во тьме, не виден. Отбейте трансформаторы, чтобы вернуть свет на улицу. Только первая эра, одна жизнь.", zh:"现在是夜里：射手离开光亮后射程变短，藏在黑暗中的敌人也看不见。夺回变压器，让街道重新亮起来。仅限第一纪元，只有一条命。", ar:"الوقت ليل: رماتكم يصيبون أقل بعدًا خارج الضوء، ولا يُرى العدو المختبئ في الظلام. استعيدوا المحوّلات لتُضاء الشارع من جديد. العصر الأول فقط، وحياة واحدة."},
  action:{ label:{fr:"FUSÉE ÉCLAIRANTE", en:"FLARE", es:"BENGALA", de:"LEUCHTRAKETE", it:"RAZZO LUMINOSO", pt:"FOGUETE DE SINALIZAÇÃO", ru:"ОСВЕТИТЕЛЬНАЯ РАКЕТА", zh:"照明弹", ar:"قنبلة إنارة"}, cd:38,
    use(g, c){ c.flare = { x: camX + VW()/2, t:14 }; sfx('shoot', 2); addFloater(c.flare.x, gY(c.flare.x)-120, '✦', '#ffe9a8', 18); } },
  setup(g, c){
    campGrant(g.p, 240, 200, 70); g.e.hp = g.e.maxhp = campHp(Math.round(850*g.d.hpMul), 'e');
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
  hud(g, c){ return { prog: 1 - g.e.hp/g.e.maxhp, label: c.owned+'/3 ⚡', goal2:{ done:c.owned>=3, label:c.owned+'/3' } }; },
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
// la règle affiche le malus de portée du niveau choisi (Récit −15 %, Lutte −20 %, Dernier carré −28 %)
const M1_DIM = [15, 20, 28];
Object.defineProperty(CAMPAIGN[0], 'rule', { configurable:true, enumerable:true, get(){
  const i = (typeof game!=='undefined' && game && game.camp && game.camp.D)? game.camp.D.i : CAMP_SAVE.diff, n = M1_DIM[clamp(i|0, 0, 2)], o = {};
  for (const k in M1_TX.rule) o[k] = M1_TX.rule[k].replace('{n}', n);
  return o; } });
// premier transformateur repris : la caméra va voir le quartier se rallumer
CAMPAIGN[0].radio.push({ when:(g,c)=>c.owned>=1, who:'sol',
  cine(g, c){ const z = g.zones.find(z=>z.owner==='p') || g.zones[0]; return [
    { cam:{x:z.x, t:1.2}, live:true, dur:1.4 },
    { cam:{x:z.x}, who:'sol', txt:{fr:"Ça y est… regardez les fenêtres. Ils rallument. Ils nous regardent, commandant. C'est la première fois qu'ils regardent.", en:"There… look at the windows. They are switching the lights back on. They are watching us, commander. It is the first time they have watched.", es:"Ya está… miren las ventanas. Vuelven a encender. Nos miran, comandante. Es la primera vez que miran.", de:"Da … seht euch die Fenster an. Sie machen das Licht wieder an. Sie sehen uns an, Kommandant. Zum ersten Mal sehen sie hin.", it:"Ecco… guardate le finestre. Riaccendono. Ci guardano, comandante. È la prima volta che guardano.", pt:"Pronto… vejam as janelas. Estão a acender de novo. Estão a olhar para nós, comandante. É a primeira vez que olham.", ru:"Вот оно… смотрите на окна. Свет снова включают. Они смотрят на нас, командир. Впервые — смотрят.", zh:"成了……看那些窗户。灯又亮了。他们在看我们，指挥官。这是他们第一次看过来。", ar:"ها قد حصل… انظروا إلى النوافذ. يُشعلون الأنوار من جديد. إنهم ينظرون إلينا، أيها القائد. إنها المرة الأولى التي ينظرون فيها."} },
  ]; } });
