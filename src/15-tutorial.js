/* =====================================================================
   TUTORIEL INTERACTIF (réécriture v2 — simple, robuste, sans blocage)
   Principes :
   · MONDE VIVANT mais calme — l'ennemi est passif (IA coupée), sa base est
     inattaquable, on ne peut ni gagner ni perdre, aucun événement/cataclysme.
   · AUCUN GEL, AUCUN VERROU d'entrée — le guidage est purement VISUEL :
     les boutons non encore enseignés sont masqués, celui de l'étape est en
     surbrillance, les acquis restent affichés (grisés).
   · AUCUN VOILE SOMBRE — un simple halo + flèche + carte cliquable-au-travers,
     donc jamais d'écran « noir / nulle part où cliquer ».
   · Chaque étape est réalisable instantanément ; un rappel apparaît si le
     joueur hésite, et « Passer » est toujours disponible.
   Textes FR + EN (les autres langues retombent sur l'anglais).
   ===================================================================== */
function tutText(o){ return (o && (o[SETTINGS.lang] || o.en || o.fr)) || ''; }
function tutGrant(f,m,w){ const p=game.p; if(f)p.f=Math.max(p.f,f); if(m)p.m=Math.max(p.m,m); if(w)p.w=Math.max(p.w,w); }
function tutCam(wx){ camFollow=false; camX=clamp(wx - VW()/2, 0, WORLD-VW()); }
function tutCount(role){ const p=game.p;
  return p.units.filter(u=>u.role===role).length + p.queue.filter(q=>ROLES[q].key===role).length; }
function tutHasBuild(type){ const p=game.p;
  for (const s of sideBuildSlots(p)) if (s.b && (s.b.type===type || s.b.buildType===type)) return true;
  return false; }
// posture « tenir » AVEC une ligne de tenue : sans holdX (null), « tenir » laissait les troupes
// marcher jusqu'à la barrière, hors de l'écran pendant les étapes « touchez une unité » / lasso.
// Par défaut la ligne est visible caméra à gauche (zoom 1) ; les ordres individuels sont effacés.
function tutHold(x){ const p=game.p; p.stance='hold'; p.holdX = (x!=null)? x : p.x+480; for (const u of p.units) u.ord=null; }
// LIGNE DE DÉFENSE (vague) : toute l'armée défend un point juste devant la muraille/tourelle.
// Contre la barrière, les troupes ne pouvaient ni avancer ni être couvertes par la tourelle :
// un tireur ennemi les décimait une à une hors de portée (vague de 60 s, armée perdue).
function tutLine(x){ const p=game.p; tutHold(x); game.sel.clear();
  p.units.forEach((u,i)=>{ if (u.role==='gremlin') return; u.ord='point'; u.task=null; u.px = x - (i%5)*14; }); }
// socle vide de l'économie : il y en a TOUJOURS un (si le joueur a tout occupé, on en ajoute un —
// avant, l'étape suivante n'avait plus de cible et le tutoriel restait bloqué)
function tutEmptySlot(){ const p=game.p; let s=p.slots.find(q=>!q.b);
  if (!s){ const k=p.slots.filter(q=>q.x<p.x+500).length; s={ x:p.x+95+64*k, b:null, owner:null }; p.slots.push(s); }
  return s; }
// socles de DÉFENSE (muraille + tourelle), créés seulement à l'étape de la barrière : posés dès le
// départ, on pouvait y bâtir une ferme et fausser tout le bloc défense
function tutDefSlots(){ const p=game.p, b=game.tutBarrier; if (b==null) return;
  for (const dx of [295,235]) if (!p.slots.some(s=>s.x===b-dx)) p.slots.push({ x:b-dx, b:null, owner:null }); }
function tutFrontSlot(){ const p=game.p; tutDefSlots(); return p.slots.find(s=>!s.b && s.x>p.x+800) || tutEmptySlot(); }
function tutBuilt(type){ return sideBuildSlots(game.p).find(s=>s.b && s.b.type===type) || null; }
function tutHudRect(match){ for (const b of HUD.btns) if (!btnHidden(b) && match(b)) return {x:b.x,y:b.y,w:b.w,h:b.h}; return null; }
function tutWorldRect(wx){ const sx=w2sX(wx), gy=w2sY(gY(wx)); return {x:sx-46, y:gy-100, w:92, h:108}; }
// garantit au moins n unités au sol (pour les étapes sélection / lasso)
function tutEnsureGround(n){ const p=game.p; let g=p.units.filter(u=>!u.fly).length;
  while (g<n){ spawnUnit(p, 0, false, p.x + 130 + g*34); g++; } }
// descripteur d'action d'un bouton de HUD (pour la visibilité progressive)
function tutDesc(b){
  switch(b.type){
    case 'unit':      return {t:'buy', i:b.i};
    case 'stance':    return {t:'stance', st:b.st};
    case 'evolve':    return {t:'evolve'};
    case 'special':   return {t:'special'};
    case 'cap':       return {t:'cap'};
    case 'repairall': return {t:'repairall'};
    case 'formation': return {t:'formation'};
    case 'hero':      return {t:'hero'};
    case 'lasso':     return {t:'lasso'};
    default:          return {t:b.type};
  }
}
/* ---- ÉTAPES ----
   text/obj : texte + objectif (FR/EN) · tap : étape d'info (bouton Continuer)
   enter()  : préparation (ressources, caméra, unités) · focus() : cible à mettre en valeur
   allow(d) : prédicat identifiant le(s) bouton(s)/action de l'étape (visibilité + halo)
   done()   : condition de réussite (étapes d'action) */
const TUT_STEPS = [
  { // 0 — accueil
    tap:true,
    text:{fr:"Bienvenue, commandant. Objectif : détruire la base ennemie à droite. En haut : 🌾 nourriture, 🪙 argent, 💧 eau, ✦ expérience ; au centre l'ère et la minicarte ; à droite 👥 effectif / plafond.",
          en:"Welcome, commander. Goal: destroy the enemy base on the right. Top bar: 🌾 food, 🪙 money, 💧 water, ✦ experience; centre: era and minimap; right: 👥 army size / cap.",
          es:"Bienvenido, comandante. Objetivo: destruir la base enemiga de la derecha. Arriba: 🌾 comida, 🪙 dinero, 💧 agua, ✦ experiencia; en el centro, la era y el minimapa; a la derecha, 👥 efectivos / capacidad.",
          de:"Willkommen, Kommandant. Ziel: die feindliche Basis rechts zerstören. Oben: 🌾 Nahrung, 🪙 Geld, 💧 Wasser, ✦ Erfahrung; in der Mitte Zeitalter und Minikarte; rechts 👥 Armeestärke / Limit.",
          it:"Benvenuto, comandante. Obiettivo: distruggere la base nemica a destra. In alto: 🌾 cibo, 🪙 denaro, 💧 acqua, ✦ esperienza; al centro l'era e la minimappa; a destra 👥 effettivi / limite.",
          pt:"Bem-vindo, comandante. Objetivo: destruir a base inimiga à direita. No alto: 🌾 comida, 🪙 dinheiro, 💧 água, ✦ experiência; no centro, a era e o minimapa; à direita, 👥 efetivo / limite.",
          ru:"Добро пожаловать, командир. Цель: уничтожить вражескую базу справа. Вверху: 🌾 еда, 🪙 деньги, 💧 вода, ✦ опыт; в центре — эпоха и миникарта; справа — 👥 численность армии / лимит.",
          zh:"欢迎，指挥官。目标：摧毁右侧的敌方基地。顶部栏：🌾 食物、🪙 金钱、💧 水、✦ 经验；中央是纪元和小地图；右侧是 👥 兵力 / 上限。",
          ar:"مرحباً أيها القائد. الهدف: تدمير قاعدة العدو على اليمين. في الأعلى: 🌾 الطعام، 🪙 المال، 💧 الماء، ✦ الخبرة؛ وفي الوسط الحقبة والخريطة المصغّرة؛ وعلى اليمين 👥 حجم الجيش / السعة."},
    enter:()=>{ camFollow=false; camX=0; },
    focus:()=>({x:0,y:0,w:Math.min(320,W),h:38}),
  },
  { // 1 — ferme
    text:{fr:"Tout commence par l'ÉCONOMIE. Touchez le socle « + » surligné et bâtissez une 🌾 FERME (+nourriture).",
          en:"It all starts with the ECONOMY. Tap the highlighted \"+\" pad and build a 🌾 FARM (+food).",es:"Todo empieza con la ECONOMÍA. Toca el socle « + » resaltado y construye una 🌾 GRANJA (+comida).",de:"Alles beginnt mit der WIRTSCHAFT. Tippe auf das markierte „+“-Feld und baue eine 🌾 FARM (+Nahrung).",it:"Tutto inizia con l'ECONOMIA. Tocca la piastra « + » evidenziata e costruisci una 🌾 FATTORIA (+cibo).",pt:"Tudo começa com a ECONOMIA. Toque no espaço « + » destacado e construa uma 🌾 FAZENDA (+comida).",ru:"Всё начинается с ЭКОНОМИКИ. Нажмите на выделенный слот «+» и постройте 🌾 ФЕРМУ (+еда).",zh:"一切从经济开始。点击高亮的「+」地块，建造一座 🌾 农场（+食物）。",ar:"كل شيء يبدأ بالاقتصاد. المس اللوحة المضيئة « + » وابنِ 🌾 مزرعة (+طعام)."},
    obj:{fr:"Construisez une ferme",en:"Build a farm",es:"Construye una granja",de:"Baue eine Farm",it:"Costruisci una fattoria",pt:"Construa uma fazenda",ru:"Постройте ферму",zh:"建造一座农场",ar:"ابنِ مزرعة"},
    enter:()=>{ tutGrant(300,300,150); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='farmF',
    done:()=>tutHasBuild('farmF'),
  },
  { // 2 — marché
    text:{fr:"Bâtissez un 🪙 MARCHÉ sur le socle surligné : l'argent paie troupes et bâtiments.",
          en:"Build a 🪙 MARKET on the highlighted pad: money pays for troops and buildings.",es:"Construye un 🪙 MERCADO en el socle resaltado: el dinero paga tropas y edificios.",de:"Baue einen 🪙 MARKT auf dem markierten Feld: Geld bezahlt Truppen und Gebäude.",it:"Costruisci un 🪙 MERCATO sulla piastra evidenziata: il denaro paga truppe ed edifici.",pt:"Construa um 🪙 MERCADO no espaço destacado: o dinheiro paga tropas e edifícios.",ru:"Постройте 🪙 РЫНОК на выделенном слоте: деньги оплачивают войска и здания.",zh:"在高亮地块建造 🪙 市场：金钱用于支付部队和建筑。",ar:"ابنِ 🪙 سوقاً في اللوحة المضيئة: المال يدفع ثمن الجنود والمباني."},
    obj:{fr:"Construisez un marché",en:"Build a market",es:"Construye un mercado",de:"Baue einen Markt",it:"Costruisci un mercato",pt:"Construa um mercado",ru:"Постройте рынок",zh:"建造一座市场",ar:"ابنِ سوقاً"},
    enter:()=>{ tutGrant(300,300,150); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='farmM',
    done:()=>tutHasBuild('farmM'),
  },
  { // 3 — puits
    text:{fr:"Enfin un ⛲ PUITS sur le dernier socle (+eau). Vos trois sources de richesse sont prêtes.",
          en:"Finally a ⛲ WELL on the last pad (+water). Your three income sources are set.",es:"Por último, un ⛲ POZO en el último socle (+agua). Tus tres fuentes de riqueza están listas.",de:"Zuletzt ein ⛲ BRUNNEN auf dem letzten Feld (+Wasser). Deine drei Einnahmequellen stehen bereit.",it:"Infine un ⛲ POZZO sull'ultima piastra (+acqua). Le tue tre fonti di ricchezza sono pronte.",pt:"Por fim, um ⛲ POÇO no último espaço (+água). Suas três fontes de riqueza estão prontas.",ru:"Наконец, ⛲ КОЛОДЕЦ на последнем слоте (+вода). Все три источника дохода готовы.",zh:"最后在最后一个地块建造 ⛲ 水井（+水）。你的三大财富来源已就绪。",ar:"وأخيراً ⛲ بئر في اللوحة الأخيرة (+ماء). مصادر ثروتك الثلاثة جاهزة الآن."},
    obj:{fr:"Construisez un puits",en:"Build a well",es:"Construye un pozo",de:"Baue einen Brunnen",it:"Costruisci un pozzo",pt:"Construa um poço",ru:"Постройте колодец",zh:"建造一座水井",ar:"ابنِ بئراً"},
    enter:()=>{ tutGrant(300,300,150); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='well',
    done:()=>tutHasBuild('well'),
  },
  { // 3b — AMÉLIORER un bâtiment (+ bonus de longévité)
    text:{fr:"Vos bâtiments PROGRESSENT : touchez la ferme, puis « Améliorer » (+50 % de production, 3 niveaux). Gardés en vie, ils montent aussi en régime avec le temps (jusqu'à ×3 en 15 min) : protégez-les !",
          en:"Your buildings GROW: tap the farm, then \"Upgrade\" (+50% output, 3 levels). Kept alive, they also ramp up over time (up to ×3 after 15 min): protect them!",
          es:"Tus edificios PROGRESAN: toca la granja y luego «Mejorar» (+50 % de producción, 3 niveles). Si se mantienen con vida, también ganan rendimiento con el tiempo (hasta ×3 tras 15 min): ¡protégelos!",
          de:"Deine Gebäude WACHSEN: Tippe auf die Farm, dann auf „Verbessern“ (+50 % Ertrag, 3 Stufen). Bleiben sie am Leben, steigern sie ihre Leistung auch mit der Zeit (bis zu ×3 nach 15 Min.): Beschütze sie!",
          it:"I tuoi edifici CRESCONO: tocca la fattoria, poi «Migliorare» (+50% di produzione, 3 livelli). Se restano in vita, aumentano il rendimento anche col tempo (fino a ×3 in 15 min): proteggili!",
          pt:"Seus edifícios EVOLUEM: toque na fazenda e depois em «Melhorar» (+50% de produção, 3 níveis). Mantidos vivos, eles também rendem mais com o tempo (até ×3 em 15 min): proteja-os!",
          ru:"Ваши здания РАЗВИВАЮТСЯ: нажмите на ферму, затем «Улучшить» (+50 % к производству, 3 уровня). Пока они целы, они ещё и набирают обороты со временем (до ×3 за 15 мин): защищайте их!",
          zh:"你的建筑会成长：点击农场，再点“升级”（产量 +50%，共 3 级）。只要建筑存活，产出还会随时间攀升（15 分钟后最高 ×3）：保护好它们！",
          ar:"مبانيك تتطوّر: المس المزرعة ثم «ترقية» (+50% إنتاج، 3 مستويات). وما دامت حيّة، يرتفع إنتاجها أيضاً مع الوقت (حتى ×3 بعد 15 دقيقة): احمِها!"},
    obj:{fr:"Améliorez la ferme",en:"Upgrade the farm",es:"Mejora la granja",de:"Verbessere die Farm",it:"Migliora la fattoria",pt:"Melhore a fazenda",ru:"Улучшите ферму",zh:"升级农场",ar:"طوّر المزرعة"},
    enter:()=>{ tutGrant(400,400,150); const s=tutBuilt('farmF'); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutBuilt('farmF'); return s? tutWorldRect(s.x):null; },
    done:()=>{ const s=tutBuilt('farmF'); return !s || (s.b.lvl||1)>=2; },
  },
  { // 4 — mêlée
    text:{fr:"En bas, la barre de recrutement. Recrutez DEUX unités de ⚔ MÊLÉE (bouton surligné) : votre première ligne.",
          en:"Bottom bar: recruiting. Recruit TWO ⚔ MELEE units (highlighted button): your front line.",es:"Abajo, la barra de reclutamiento. Recluta DOS unidades de ⚔ CUERPO A CUERPO (botón resaltado): tu primera línea.",de:"Unten die Rekrutierungsleiste. Rekrutiere ZWEI ⚔ NAHKAMPF-Einheiten (markierter Button): deine erste Linie.",it:"In basso, la barra di reclutamento. Recluta DUE unità ⚔ CORPO A CORPO (pulsante evidenziato): la tua prima linea.",pt:"Embaixo, a barra de recrutamento. Recrute DUAS unidades de ⚔ CORPO A CORPO (botão destacado): sua linha de frente.",ru:"Внизу — панель найма. Наймите ДВЕ единицы ⚔ БЛИЖНЕГО БОЯ (выделенная кнопка): вашу первую линию.",zh:"底部是招募栏。招募两名 ⚔ 近战单位（高亮按钮）：你的第一道防线。",ar:"في الأسفل شريط التجنيد. جنّد وحدتين من ⚔ القتال القريب (الزر المضيء): خط دفاعك الأول."},
    obj:{fr:"Recrutez 2 unités de mêlée",en:"Recruit 2 melee units",es:"Recluta 2 unidades cuerpo a cuerpo",de:"Rekrutiere 2 Nahkampf-Einheiten",it:"Recluta 2 unità corpo a corpo",pt:"Recrute 2 unidades corpo a corpo",ru:"Наймите 2 бойцов ближнего боя",zh:"招募 2 名近战单位",ar:"جنّد وحدتين من القتال القريب"},
    enter:()=>{ tutGrant(600,500,150); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===0),
    allow:a=>a.t==='buy'&&a.i===0,
    done:()=>tutCount('melee')>=2,
  },
  { // 4b — TANK (mêlée lourde) : encaisse, met les formations en valeur
    text:{fr:"Recrutez DEUX 🛡 TANKS : très résistants et lents, ils encaissent en première ligne et rendent vos FORMATIONS bien plus solides.",
          en:"Recruit TWO 🛡 TANKS: very tough and slow, they soak hits on the front line and make your FORMATIONS far sturdier.",es:"Recluta DOS 🛡 TANQUES: muy resistentes y lentos, aguantan en primera línea y hacen tus FORMACIONES mucho más sólidas.",de:"Rekrutiere ZWEI 🛡 PANZER: sehr robust und langsam, sie halten die Front und machen deine FORMATIONEN deutlich stabiler.",it:"Recluta DUE 🛡 CARRI ARMATI: molto resistenti e lenti, incassano i colpi in prima linea e rendono le tue FORMAZIONI molto più solide.",pt:"Recrute DOIS 🛡 TANQUES: muito resistentes e lentos, aguentam a linha de frente e tornam suas FORMAÇÕES bem mais sólidas.",ru:"Наймите ДВА 🛡 ТАНКА: очень живучие и медленные, они держат передний край и делают ваше ПОСТРОЕНИЕ намного прочнее.",zh:"招募两名 🛡 坦克：非常耐打但速度慢，能在前线扛伤害，让你的阵型更加稳固。",ar:"جنّد اثنين من 🛡 الدبابات: شديدة التحمل وبطيئة، تصمد في الخط الأمامي وتجعل تشكيلاتك أكثر متانة."},
    obj:{fr:"Recrutez 2 tanks",en:"Recruit 2 tanks",es:"Recluta 2 tanques",de:"Rekrutiere 2 Panzer",it:"Recluta 2 carri armati",pt:"Recrute 2 tanques",ru:"Наймите 2 танка",zh:"招募 2 名坦克",ar:"جنّد دبابتين"},
    enter:()=>{ tutGrant(600,700,150); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===1),
    allow:a=>a.t==='buy'&&a.i===1,
    done:()=>tutCount('tank')>=2,
  },
  { // 5 — tireurs
    text:{fr:"Recrutez DEUX 🏹 TIREURS : fragiles, mais ils frappent de loin. Mêlez toujours mêlée et distance.",
          en:"Recruit TWO 🏹 RANGED: fragile, but they strike from afar. Always mix melee and ranged.",es:"Recluta DOS 🏹 TIRADORES: frágiles, pero golpean desde lejos. Combina siempre cuerpo a cuerpo y distancia.",de:"Rekrutiere ZWEI 🏹 FERNKÄMPFER: verwundbar, aber sie treffen aus der Ferne. Mische immer Nah- und Fernkampf.",it:"Recluta DUE 🏹 TIRATORI: fragili, ma colpiscono da lontano. Combina sempre corpo a corpo e distanza.",pt:"Recrute DOIS 🏹 ATIRADORES: frágeis, mas atacam de longe. Sempre combine corpo a corpo e distância.",ru:"Наймите ДВУХ 🏹 СТРЕЛКОВ: хрупкие, но бьют издалека. Всегда сочетайте ближний и дальний бой.",zh:"招募两名 🏹 射手：脆弱但能远程攻击。始终混合使用近战与远程单位。",ar:"جنّد اثنين من 🏹 الرماة: هشّون لكنهم يضربون من بعيد. اخلط دائماً بين القتال القريب والبعيد."},
    obj:{fr:"Recrutez 2 tireurs",en:"Recruit 2 ranged units",es:"Recluta 2 tiradores",de:"Rekrutiere 2 Fernkämpfer",it:"Recluta 2 tiratori",pt:"Recrute 2 atiradores",ru:"Наймите 2 стрелков",zh:"招募 2 名射手",ar:"جنّد راميين"},
    enter:()=>{ tutGrant(500,600,150); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===2),
    allow:a=>a.t==='buy'&&a.i===2,
    done:()=>tutCount('ranged')>=2,
  },
  { // 6 — aérien
    text:{fr:"Ajoutez une unité 🦅 AÉRIENNE : elle survole le sol et ignore la mêlée.",
          en:"Add a 🦅 AIR unit: it flies over the ground and ignores melee.",es:"Añade una unidad 🦅 AÉREA: sobrevuela el terreno e ignora el cuerpo a cuerpo.",de:"Füge eine 🦅 LUFT-Einheit hinzu: sie überfliegt das Gelände und ignoriert den Nahkampf.",it:"Aggiungi un'unità 🦅 AEREA: sorvola il terreno e ignora il corpo a corpo.",pt:"Adicione uma unidade 🦅 AÉREA: ela sobrevoa o terreno e ignora o corpo a corpo.",ru:"Добавьте 🦅 ВОЗДУШНУЮ единицу: она летит над землёй и не подвержена ближнему бою.",zh:"添加一个 🦅 空中单位：可以飞越地面，无视近战攻击。",ar:"أضف وحدة 🦅 جوية: تحلّق فوق الأرض وتتجاهل القتال القريب."},
    obj:{fr:"Recrutez 1 unité aérienne",en:"Recruit 1 air unit",es:"Recluta 1 unidad aérea",de:"Rekrutiere 1 Lufteinheit",it:"Recluta 1 unità aerea",pt:"Recrute 1 unidade aérea",ru:"Наймите 1 воздушную единицу",zh:"招募 1 名空中单位",ar:"جنّد وحدة جوية واحدة"},
    enter:()=>{ tutGrant(500,600,250); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===4),
    allow:a=>a.t==='buy'&&a.i===4,
    done:()=>tutCount('air')>=1,
  },
  { // 6b — artillerie & soutien (info) : les deux dernières classes, révélées sans les imposer
    tap:true,
    text:{fr:"Deux autres unités complètent l'armée : 💣 l'ARTILLERIE (portée énorme, dégâts de zone, ×1,6 contre les bâtiments) et ✚ le SOUTIEN (soigne vos troupes ; 1 à la fois, +1 par amélioration).",
          en:"Two more units round out your army: 💣 ARTILLERY (huge range, splash damage, ×1.6 against buildings) and ✚ SUPPORT (heals your troops; 1 at a time, +1 per upgrade).",
          es:"Dos unidades más completan tu ejército: 💣 la ARTILLERÍA (alcance enorme, daño en área, ×1,6 contra edificios) y ✚ el APOYO (cura a tus tropas; 1 a la vez, +1 por mejora).",
          de:"Zwei weitere Einheiten vervollständigen deine Armee: 💣 ARTILLERIE (riesige Reichweite, Flächenschaden, ×1,6 gegen Gebäude) und ✚ UNTERSTÜTZUNG (heilt deine Truppen; 1 gleichzeitig, +1 pro Verbesserung).",
          it:"Altre due unità completano l'esercito: 💣 l'ARTIGLIERIA (gittata enorme, danni ad area, ×1,6 contro gli edifici) e ✚ il SUPPORTO (cura le truppe; 1 alla volta, +1 per potenziamento).",
          pt:"Mais duas unidades completam seu exército: 💣 a ARTILHARIA (alcance enorme, dano em área, ×1,6 contra edifícios) e ✚ o SUPORTE (cura suas tropas; 1 por vez, +1 por melhoria).",
          ru:"Армию дополняют ещё две единицы: 💣 АРТИЛЛЕРИЯ (огромная дальность, урон по площади, ×1,6 по зданиям) и ✚ ПОДДЕРЖКА (лечит войска; по одной, +1 за улучшение).",
          zh:"另有两种单位完善你的军队：💣 炮兵（射程极远，范围伤害，对建筑 ×1.6）和 ✚ 支援（治疗部队；同时限 1 名，每次升级 +1）。",
          ar:"وحدتان أخريان تكمّلان جيشك: 💣 المدفعية (مدى هائل، ضرر واسع، ×1.6 ضد المباني) و✚ الدعم (يعالج قواتك؛ واحد في كل مرة، +1 مع كل ترقية)."},
    enter:()=>{ camFollow=false; camX=0; },
    focus:()=>{ const a=tutHudRect(b=>b.type==='unit'&&b.i===3), b=tutHudRect(b=>b.type==='unit'&&b.i===5);
      if (!a||!b) return a||b; const x=Math.min(a.x,b.x), y=Math.min(a.y,b.y);
      return {x, y, w:Math.max(a.x+a.w,b.x+b.w)-x, h:Math.max(a.y+a.h,b.y+b.h)-y}; },
    allow:a=>a.t==='buy'&&(a.i===3||a.i===5),
  },
  { // 6c — CAMÉRA : glisser, zoomer, recentrer
    text:{fr:"Explorez la carte : GLISSEZ le terrain (ou ←/→, molette), pincez ou 🔍 pour zoomer. « Base » et « Front » recentrent la vue, « Auto » suit vos troupes.",
          en:"Explore the map: DRAG the terrain (or ←/→, mouse wheel), pinch or 🔍 to zoom. \"Base\" and \"Front\" recenter the view, \"Auto\" follows your troops.",
          es:"Explora el mapa: ARRASTRA el terreno (o ←/→, rueda del ratón), pellizca o usa 🔍 para hacer zoom. «Base» y «Frente» recentran la vista, «Auto» sigue a tus tropas.",
          de:"Erkunde die Karte: ZIEHE das Gelände (oder ←/→, Mausrad), zoome per Pinch oder 🔍. „Basis“ und „Front“ zentrieren die Ansicht neu, „Auto“ folgt deinen Truppen.",
          it:"Esplora la mappa: TRASCINA il terreno (o ←/→, rotella del mouse), pizzica o usa 🔍 per zoomare. «Base» e «Fronte» ricentrano la vista, «Auto» segue le tue truppe.",
          pt:"Explore o mapa: ARRASTE o terreno (ou ←/→, roda do mouse), faça pinça ou use 🔍 para dar zoom. «Base» e «Frente» recentralizam a visão, «Auto» acompanha suas tropas.",
          ru:"Исследуйте карту: ПЕРЕТАСКИВАЙТЕ местность (или ←/→, колесо мыши), сведите пальцы или нажмите 🔍 для масштаба. «База» и «Фронт» центрируют вид, «Авто» следует за войсками.",
          zh:"探索地图：拖动地形（或用 ←/→、鼠标滚轮），双指捏合或点 🔍 缩放。“基地”和“前线”会重新居中视角，“自动”会跟随你的部队。",
          ar:"استكشف الخريطة: اسحب الأرض (أو ←/→، عجلة الفأرة)، واقرص أو استخدم 🔍 للتكبير. «القاعدة» و«الجبهة» تعيدان توسيط العرض، و«تلقائي» يتبع قواتك."},
    obj:{fr:"Déplacez la caméra",en:"Move the camera",es:"Mueve la cámara",de:"Bewege die Kamera",it:"Muovi la camera",pt:"Mova a câmera",ru:"Сдвиньте камеру",zh:"移动镜头",ar:"حرّك الكاميرا"},
    enter:()=>{ camFollow=false; camX=0; TUT.camStart=0; },
    focus:()=>tutHudRect(b=>b.type==='cam'&&b.go==='front'),
    done:()=>Math.abs(camX-(TUT.camStart||0))>200,
  },
  { // 7 — sélection
    text:{fr:"Place au CONTRÔLE. Touchez une unité : toute sa CLASSE est sélectionnée (retouchez-la pour n'en garder qu'une).",
          en:"Time for CONTROL. Tap a unit: its whole CLASS is selected (tap it again to keep just that one).",
          es:"Es hora del CONTROL. Toca una unidad: se selecciona toda su CLASE (vuelve a tocarla para quedarte solo con esa).",
          de:"Zeit für KONTROLLE. Tippe auf eine Einheit: Ihre gesamte KLASSE wird ausgewählt (tippe erneut, um nur diese eine zu behalten).",
          it:"È il momento del CONTROLLO. Tocca un'unità: viene selezionata tutta la sua CLASSE (toccala di nuovo per tenerne una sola).",
          pt:"Hora do CONTROLE. Toque em uma unidade: toda a sua CLASSE é selecionada (toque nela de novo para ficar só com ela).",
          ru:"Время УПРАВЛЕНИЯ. Нажмите на любую единицу: выделится весь её КЛАСС (нажмите ещё раз — останется только она).",
          zh:"轮到“控制”了。点击一个单位：整个兵种都会被选中（再点一次则只保留这一个）。",
          ar:"حان وقت التحكّم. المس وحدة: تُحدَّد فئتها كاملة (المسها مجدداً لتبقي عليها وحدها)."},
    obj:{fr:"Sélectionnez une unité",en:"Select a unit",es:"Selecciona una unidad",de:"Wähle eine Einheit aus",it:"Seleziona un'unità",pt:"Selecione uma unidade",ru:"Выделите одну единицу",zh:"选中一个单位",ar:"حدّد وحدة"},
    enter:()=>{ camFollow=false; camX=0; tutHold(); tutEnsureGround(2); game.sel.clear(); },
    focus:()=>{ const u=game.p.units.find(x=>!x.fly)||game.p.units[0]; return u? tutWorldRect(u.x):null; },
    done:()=>game.sel.size>=1,
  },
  { // 8 — lasso
    text:{fr:"Pour sélectionner des types MÉLANGÉS : touchez ⬚ LASSO (surligné), puis tracez un rectangle autour de TOUTES vos troupes. (PC : Maj + glisser.)",
          en:"To select MIXED types: tap ⬚ LASSO (highlighted), then drag a box around ALL your troops. (PC: Shift + drag.)",
          es:"Para seleccionar tipos MEZCLADOS: toca ⬚ LAZO (resaltado) y arrastra un rectángulo alrededor de TODAS tus tropas. (PC: Mayús + arrastrar.)",
          de:"Um GEMISCHTE Typen auszuwählen: Tippe auf ⬚ LASSO (markiert) und ziehe dann einen Rahmen um ALLE deine Truppen. (PC: Umschalt + Ziehen.)",
          it:"Per selezionare tipi MISTI: tocca ⬚ LASSO (evidenziato), poi trascina un rettangolo attorno a TUTTE le tue truppe. (PC: Maiusc + trascina.)",
          pt:"Para selecionar tipos MISTOS: toque em ⬚ LASSO (destacado) e arraste um retângulo em volta de TODAS as suas tropas. (PC: Shift + arrastar.)",
          ru:"Чтобы выделить РАЗНЫЕ типы: нажмите ⬚ ЛАССО (подсвечено), затем обведите рамкой ВСЕ свои войска. (ПК: Shift + перетаскивание.)",
          zh:"要选中混合兵种：点击 ⬚ 套索（高亮），然后拖出方框框住你的所有部队。（电脑：Shift + 拖动。）",
          ar:"لتحديد أنواع مختلطة: المس ⬚ لاسو (المضاء)، ثم اسحب مستطيلاً حول كل قواتك. (الحاسوب: Shift + سحب.)"},
    obj:{fr:"Sélectionnez un groupe au lasso",en:"Lasso-select a group",es:"Selecciona un grupo con el lazo",de:"Wähle eine Gruppe mit dem Lasso aus",it:"Seleziona un gruppo con il lasso",pt:"Selecione um grupo com o lasso",ru:"Выделите группу лассо",zh:"用套索选中一组单位",ar:"حدّد مجموعة باللاسو"},
    enter:()=>{ camFollow=false; camX=0; tutEnsureGround(3); game.sel.clear(); selMode=false; },
    focus:()=>tutHudRect(b=>b.type==='lasso'),
    allow:a=>a.t==='lasso',
    // sélection MÉLANGÉE exigée (un simple toucher sélectionne déjà toute une classe) — sauf s'il n'y a qu'une classe au sol
    done:()=>{ const kinds=new Set([...game.sel].map(u=>u.role)), all=new Set(game.p.units.filter(u=>!u.fly).map(u=>u.role));
      return game.sel.size>=2 && (kinds.size>=2 || all.size<2); },
  },
  { // 9 — formation
    text:{fr:"Activez la ⚏ FORMATION : vos troupes se rangent — mêlée devant, tireurs derrière. Bien plus solide.",
          en:"Toggle ⚏ FORMATION: troops auto-arrange — melee front, ranged back. Far sturdier.",es:"Activa la ⚏ FORMACIÓN: tus tropas se ordenan — cuerpo a cuerpo delante, tiradores detrás. Mucho más sólido.",de:"Aktiviere die ⚏ FORMATION: deine Truppen ordnen sich — Nahkämpfer vorne, Fernkämpfer hinten. Deutlich stabiler.",it:"Attiva la ⚏ FORMAZIONE: le tue truppe si dispongono — corpo a corpo davanti, tiratori dietro. Molto più solido.",pt:"Ative a ⚏ FORMAÇÃO: suas tropas se organizam — corpo a corpo na frente, atiradores atrás. Bem mais sólido.",ru:"Включите ⚏ ПОСТРОЕНИЕ: войска сами выстроятся — ближний бой впереди, стрелки сзади. Гораздо надёжнее.",zh:"启用 ⚏ 阵型：部队会自动排列——近战在前，射手在后，防线更加稳固。",ar:"فعّل ⚏ التشكيل: تصطف قواتك تلقائياً — القتال القريب أمامًا، الرماة خلفًا. أكثر متانة بكثير."},
    obj:{fr:"Activez la formation",en:"Enable formation",es:"Activa la formación",de:"Aktiviere die Formation",it:"Attiva la formazione",pt:"Ative a formação",ru:"Включите построение",zh:"启用阵型",ar:"فعّل التشكيل"},
    enter:()=>{ camFollow=false; camX=0; game.p.formation=false; },
    focus:()=>tutHudRect(b=>b.type==='formation'),
    allow:a=>a.t==='formation',
    done:()=>game.p.formation===true,
  },
  { // 10 — charger
    text:{fr:"Donnez l'ordre ⚔ CHARGER (surligné) pour lancer vos troupes vers l'ennemi. ✋ Tenir et ↩ Replier complètent vos ordres. Avec une sélection, l'ordre ne vaut que pour elle ; sinon pour toute l'armée.",
          en:"Give the ⚔ CHARGE order (highlighted) to send troops at the enemy. ✋ Hold and ↩ Retreat round out your orders. With a selection the order applies to it only; otherwise to the whole army.",
          es:"Da la orden ⚔ CARGAR (resaltada) para lanzar tus tropas contra el enemigo. ✋ Aguantar y ↩ Replegarse completan tus órdenes. Con una selección, la orden solo vale para ella; si no, para todo el ejército.",
          de:"Gib den Befehl ⚔ ANGREIFEN (markiert), um deine Truppen gegen den Feind zu schicken. ✋ Halten und ↩ Zurückziehen vervollständigen deine Befehle. Mit Auswahl gilt der Befehl nur für sie, sonst für die ganze Armee.",
          it:"Dai l'ordine ⚔ CARICA (evidenziato) per lanciare le truppe contro il nemico. ✋ Tieni e ↩ Ripiegare completano i tuoi ordini. Con una selezione l'ordine vale solo per essa; altrimenti per tutto l'esercito.",
          pt:"Dê a ordem ⚔ CARREGAR (destacada) para lançar suas tropas contra o inimigo. ✋ Segurar e ↩ Recuar completam suas ordens. Com uma seleção, a ordem vale só para ela; senão, para todo o exército.",
          ru:"Отдайте приказ ⚔ В АТАКУ (подсвечен), чтобы бросить войска на врага. ✋ Держать и ↩ Отступить дополняют ваши приказы. При выделении приказ касается только выделенных; иначе — всей армии.",
          zh:"下达 ⚔ 冲锋命令（高亮），让部队冲向敌人。✋ 坚守和 ↩ 撤退补全你的指令集。有选中单位时命令只对它们生效；否则对全军生效。",
          ar:"أصدر أمر ⚔ هجوم (المضاء) لتدفع قواتك نحو العدو. ✋ تمسّك و↩ تراجع يكمّلان أوامرك. مع وجود تحديد، يسري الأمر عليه وحده؛ وإلا فعلى الجيش كله."},
    obj:{fr:"Ordonnez la charge",en:"Order the charge",es:"Ordena la carga",de:"Befiehl den Angriff",it:"Ordina la carica",pt:"Ordene o ataque",ru:"Отдайте приказ в атаку",zh:"下达冲锋命令",ar:"أصدر أمر الهجوم"},
    enter:()=>{ camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='stance'&&b.st==='charge'),
    allow:a=>a.t==='stance',
    done:()=>game.p.stance==='charge'||game.p.units.some(u=>u.ord==='charge'),
  },
  { // 10b — ORDRE DE POSITION : clic droit (PC) / appui long (mobile)
    text:{fr:"Ordre de POSITION : CLIC DROIT (PC) ou APPUI LONG (mobile) sur le terrain — vos troupes vont DÉFENDRE ce point exact. Sans sélection, TOUTE l'armée y va ; avec une sélection, elle seule obéit.",
          en:"POSITION order: RIGHT-CLICK (PC) or LONG-PRESS (mobile) on the ground — your troops go DEFEND that exact spot. With nothing selected the WHOLE army goes; with a selection, only it obeys.",es:"Orden de POSICIÓN: CLIC DERECHO (PC) o PULSACIÓN LARGA (móvil) en el terreno — tus tropas van a DEFENDER ese punto exacto. Sin selección, TODO el ejército va; con una selección, solo ella obedece.",de:"POSITIONSBEFEHL: RECHTSKLICK (PC) oder LANGES DRÜCKEN (Mobil) auf das Gelände — deine Truppen VERTEIDIGEN genau diesen Punkt. Ohne Auswahl geht die GANZE Armee hin; mit Auswahl gehorcht nur sie.",it:"Ordine di POSIZIONE: CLIC DESTRO (PC) o PRESSIONE LUNGA (mobile) sul terreno — le tue truppe andranno a DIFENDERE quel punto esatto. Senza selezione, va TUTTO l'esercito; con una selezione, obbedisce solo lei.",pt:"Ordem de POSIÇÃO: CLIQUE DIREITO (PC) ou TOQUE LONGO (celular) no terreno — suas tropas vão DEFENDER esse ponto exato. Sem seleção, TODO o exército vai; com uma seleção, só ela obedece.",ru:"Приказ ПОЗИЦИИ: ПРАВЫЙ КЛИК (ПК) или ДОЛГОЕ НАЖАТИЕ (телефон) по земле — войска пойдут ЗАЩИЩАТЬ именно эту точку. Без выделения идёт ВСЯ армия; с выделением — только оно.",zh:"位置命令：在地面上单击鼠标右键（电脑）或长按（手机）——你的部队会前往驻守那个精确地点。未选中任何单位时，全军都会前往；选中部分单位时，只有它们服从命令。",ar:"أمر الموقع: انقر بالزر الأيمن (حاسوب) أو اضغط مطولاً (جوال) على الأرض — ستذهب قواتك للدفاع عن تلك النقطة بالضبط. بدون تحديد، يذهب الجيش كله؛ ومع التحديد، تطيع الوحدات المحددة فقط."},
    obj:{fr:"Envoyez vos troupes sur un point (clic droit / appui long)",en:"Send troops to a point (right-click / long-press)",es:"Envía tropas a un punto (clic derecho / pulsación larga)",de:"Schicke Truppen zu einem Punkt (Rechtsklick / langes Drücken)",it:"Invia le truppe in un punto (clic destro / pressione lunga)",pt:"Envie tropas a um ponto (clique direito / toque longo)",ru:"Отправьте войска в точку (ПКМ / долгое нажатие)",zh:"派部队前往一个地点（右键/长按）",ar:"أرسل القوات إلى نقطة (نقر أيمن / ضغط مطوّل)"},
    enter:()=>{ camFollow=false; camX=0; tutHold(); tutEnsureGround(2); },
    focus:()=>null,
    done:()=>game.p.units.some(u=>u.ord==='point'),
  },
  { // 11 — amélioration de classe
    text:{fr:"Renforcez vos troupes : touchez le petit ⬆ en bas à droite de la fiche MÊLÉE. Chaque niveau (3 max) donne +15 % de PV et de dégâts aux unités de cette classe recrutées ENSUITE.",
          en:"Strengthen your troops: tap the small ⬆ at the bottom-right of the MELEE card. Each level (3 max) gives +15% HP and damage to units of that class recruited AFTERWARDS.",
          es:"Refuerza a tus tropas: toca el pequeño ⬆ en la esquina inferior derecha de la ficha CUERPO A CUERPO. Cada nivel (máx. 3) da +15 % de PV y de daño a las unidades de esa clase reclutadas DESPUÉS.",
          de:"Verstärke deine Truppen: Tippe auf das kleine ⬆ unten rechts auf der Karte NAHKAMPF. Jede Stufe (max. 3) gibt +15 % LP und Schaden für Einheiten dieser Klasse, die DANACH rekrutiert werden.",
          it:"Rinforza le tue truppe: tocca la piccola ⬆ in basso a destra della scheda CORPO A CORPO. Ogni livello (max 3) dà +15% di PV e danni alle unità di quella classe reclutate DOPO.",
          pt:"Reforce suas tropas: toque no pequeno ⬆ no canto inferior direito da ficha CORPO A CORPO. Cada nível (máx. 3) dá +15% de PV e de dano às unidades dessa classe recrutadas DEPOIS.",
          ru:"Усильте свои войска: нажмите маленький ⬆ в правом нижнем углу карточки БЛИЖНИЙ БОЙ. Каждый уровень (максимум 3) даёт +15 % ОЗ и урона единицам этого класса, нанятым ПОСЛЕ.",
          zh:"强化你的部队：点击“近战”卡片右下角的小 ⬆。每一级（最多 3 级）会让此后招募的该兵种单位获得 +15% 生命值和伤害。",
          ar:"قوِّ قواتك: المس السهم الصغير ⬆ في أسفل يمين بطاقة القتال القريب. كل مستوى (3 كحد أقصى) يمنح +15% صحة وضرراً للوحدات من هذه الفئة التي تُجنَّد بعد ذلك."},
    obj:{fr:"Améliorez la classe mêlée (⬆)",en:"Upgrade the melee class (⬆)",es:"Mejora la clase cuerpo a cuerpo (⬆)",de:"Verbessere die Nahkampf-Klasse (⬆)",it:"Migliora la classe corpo a corpo (⬆)",pt:"Melhore a classe corpo a corpo (⬆)",ru:"Улучшите класс ближнего боя (⬆)",zh:"升级近战兵种（⬆）",ar:"طوّر فئة القتال القريب (⬆)"},
    enter:()=>{ tutGrant(600,1200,250); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===0),
    allow:a=>a.t==='upg'||(a.t==='buy'&&a.i===0),
    done:()=>(game.p.upg.melee||0)>=1,
  },
  { // 12 — capacité d'armée
    text:{fr:"Investissez : touchez 👥 +10 (🪙350 💧100, une seule fois) : le plafond d'armée passe de 30 à 40. Au plafond, les recrues attendent en file (⏳, 10 au plus).",
          en:"Invest: tap 👥 +10 (🪙350 💧100, one time): the army cap goes from 30 to 40. At the cap, recruits wait in a queue (⏳, 10 at most).",
          es:"Invierte: toca 👥 +10 (🪙350 💧100, una sola vez): el tope del ejército pasa de 30 a 40. Al llegar al tope, los reclutas esperan en cola (⏳, 10 como máximo).",
          de:"Investiere: Tippe auf 👥 +10 (🪙350 💧100, nur einmal): Das Armeelimit steigt von 30 auf 40. Am Limit warten Rekruten in einer Warteschlange (⏳, höchstens 10).",
          it:"Investi: tocca 👥 +10 (🪙350 💧100, una sola volta): il limite dell'esercito passa da 30 a 40. Al limite, le reclute aspettano in coda (⏳, al massimo 10).",
          pt:"Invista: toque em 👥 +10 (🪙350 💧100, uma única vez): o limite do exército passa de 30 para 40. No limite, os recrutas esperam em fila (⏳, no máximo 10).",
          ru:"Вложитесь: нажмите 👥 +10 (🪙350 💧100, один раз): лимит армии вырастет с 30 до 40. Когда лимит достигнут, новобранцы ждут в очереди (⏳, не более 10).",
          zh:"投资扩编：点击 👥 +10（🪙350 💧100，仅限一次）：军队上限从 30 提升到 40。达到上限后，新兵会在队列中等候（⏳，最多 10 个）。",
          ar:"استثمر: المس 👥 +10 (🪙350 💧100، مرة واحدة فقط): ترتفع سعة الجيش من 30 إلى 40. عند بلوغ السعة، ينتظر المجنَّدون في طابور (⏳، 10 كحد أقصى)."},
    obj:{fr:"Augmentez votre capacité d'armée",en:"Raise your army capacity",es:"Aumenta la capacidad de tu ejército",de:"Erhöhe die Kapazität deiner Armee",it:"Aumenta la capacità del tuo esercito",pt:"Aumente a capacidade do seu exército",ru:"Увеличьте вместимость армии",zh:"提升军队容量",ar:"زد سعة جيشك"},
    enter:()=>{ tutGrant(500,800,500); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='cap'),
    allow:a=>a.t==='cap',
    done:()=>game.p.capUp===true,
  },
  // ===== BLOC DÉFENSE : monde GELÉ + mini-vague ennemie, pour apprendre le combat sans pression =====
  // ===== BLOC DÉFENSE : une barrière bloque le front (vos unités n'avancent pas trop loin).
  //       On fortifie la LIGNE au milieu de la carte, on garnit, puis on encaisse une vague. =====
  { // 13 — la barrière (info, gelé)
    tap:true,
    text:{fr:"🛡 Une BARRIÈRE d'énergie bloque le front au milieu de la carte : vos troupes ne peuvent pas avancer pour l'instant. Profitez-en pour FORTIFIER cette ligne. Le combat est automatique : mêlée devant, tireurs derrière. Près de leur propre base, vos troupes se battent nettement mieux.",
          en:"🛡 An energy BARRIER blocks the front at mid-map: your troops can't advance yet. Use this time to FORTIFY the line. Combat is automatic: melee in front, ranged behind. Near their own base your troops fight noticeably better.",
          es:"🛡 Una BARRERA de energía bloquea el frente en mitad del mapa: tus tropas todavía no pueden avanzar. Aprovecha para FORTIFICAR esa línea. El combate es automático: cuerpo a cuerpo delante, tiradores detrás. Cerca de su propia base, tus tropas luchan claramente mejor.",
          de:"🛡 Eine Energie-BARRIERE sperrt die Front in der Kartenmitte: Deine Truppen können noch nicht vorrücken. Nutze die Zeit, um die Linie zu BEFESTIGEN. Der Kampf läuft automatisch: Nahkämpfer vorne, Fernkämpfer dahinter. In der Nähe ihrer eigenen Basis kämpfen deine Truppen spürbar besser.",
          it:"🛡 Una BARRIERA di energia blocca il fronte a metà mappa: le tue truppe non possono ancora avanzare. Approfittane per FORTIFICARE la linea. Il combattimento è automatico: corpo a corpo davanti, tiratori dietro. Vicino alla loro base le tue truppe combattono nettamente meglio.",
          pt:"🛡 Uma BARREIRA de energia bloqueia a frente no meio do mapa: suas tropas ainda não podem avançar. Aproveite para FORTIFICAR essa linha. O combate é automático: corpo a corpo na frente, atiradores atrás. Perto da própria base, suas tropas lutam visivelmente melhor.",
          ru:"🛡 Энергетический БАРЬЕР перекрывает фронт посреди карты: ваши войска пока не могут продвигаться. Используйте время, чтобы УКРЕПИТЬ линию. Бой идёт автоматически: ближний бой впереди, стрелки позади. Вблизи собственной базы ваши войска сражаются заметно лучше.",
          zh:"🛡 一道能量屏障封锁了地图中部的前线：你的部队暂时无法推进。趁这段时间加固防线吧。战斗是自动进行的：近战在前，射手在后。在自己基地附近，你的部队战斗力明显更强。",
          ar:"🛡 حاجز طاقة يسدّ الجبهة في منتصف الخريطة: لا تستطيع قواتك التقدّم بعد. استغلّ هذا الوقت لتحصين الخط. القتال تلقائي: القتال القريب في المقدمة والرماة خلفه. وقرب قاعدتها الخاصة تقاتل قواتك أفضل بكثير."},
    enter:()=>{ tutDefSlots(); camFollow=false; tutCam(game.tutBarrier); tutHold(game.tutBarrier); game.sel.clear(); },   // les troupes rejoignent la ligne
    focus:()=>null,
  },
  { // 14 — muraille (sur la ligne de front, au milieu de la carte)
    text:{fr:"🧱 Bâtissez une MURAILLE sur le socle surligné, sur la ligne de front. Solide, elle encaisse les coups à la place de vos troupes.",
          en:"🧱 Build a WALL on the highlighted pad, on the front line. Sturdy, it takes hits instead of your troops.",es:"🧱 Construye una MURALLA en el socle resaltado, en la línea de frente. Sólida, aguanta los golpes en lugar de tus tropas.",de:"🧱 Baue eine MAUER auf dem markierten Feld an der Frontlinie. Robust, sie hält Treffer statt deiner Truppen aus.",it:"🧱 Costruisci un MURO sulla piastra evidenziata, sulla linea del fronte. Solido, incassa i colpi al posto delle tue truppe.",pt:"🧱 Construa uma MURALHA no espaço destacado, na linha de frente. Sólida, ela aguenta os golpes no lugar de suas tropas.",ru:"🧱 Постройте СТЕНУ на выделенном слоте, на линии фронта. Прочная, она принимает удары вместо ваших войск.",zh:"🧱 在前线高亮地块建造一座城墙。坚固的城墙会替你的部队承受打击。",ar:"🧱 ابنِ سوراً في اللوحة المضيئة، على خط الجبهة. متين، يمتصّ الضربات بدلاً من قواتك."},
    obj:{fr:"Construisez une muraille (ligne de front)",en:"Build a wall (front line)",es:"Construye una muralla (línea de frente)",de:"Baue eine Mauer (Frontlinie)",it:"Costruisci un muro (linea del fronte)",pt:"Construa uma muralha (linha de frente)",ru:"Постройте стену (на линии фронта)",zh:"建造一座城墙（前线）",ar:"ابنِ سوراً (على الجبهة)"},
    enter:()=>{ tutGrant(400,400,200); const s=tutFrontSlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutFrontSlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='wall',
    done:()=>tutHasBuild('wall'),
  },
  { // 15 — tourelle
    text:{fr:"🗼 Ajoutez une TOURELLE sur le socle surligné : elle tire automatiquement sur tout ennemi à portée.",
          en:"🗼 Add a TURRET on the highlighted pad: it automatically fires at any enemy in range.",es:"🗼 Añade una TORRETA en el socle resaltado: dispara automáticamente a cualquier enemigo a su alcance.",de:"🗼 Baue einen TURM auf dem markierten Feld: er feuert automatisch auf jeden Feind in Reichweite.",it:"🗼 Aggiungi una TORRETTA sulla piastra evidenziata: spara automaticamente a ogni nemico a portata.",pt:"🗼 Adicione uma TORRETA no espaço destacado: ela atira automaticamente em qualquer inimigo ao alcance.",ru:"🗼 Постройте БАШНЮ на выделенном слоте: она автоматически стреляет по любому врагу в радиусе действия.",zh:"🗼 在高亮地块建造一座炮塔：它会自动攻击射程内的任何敌人。",ar:"🗼 أضف برجاً في اللوحة المضيئة: يطلق النار تلقائياً على أي عدو في مداه."},
    obj:{fr:"Construisez une tourelle",en:"Build a turret",es:"Construye una torreta",de:"Baue einen Turm",it:"Costruisci una torretta",pt:"Construa uma torreta",ru:"Постройте башню",zh:"建造一座炮塔",ar:"ابنِ برجاً"},
    enter:()=>{ tutGrant(400,500,200); const s=tutFrontSlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutFrontSlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='turret',
    done:()=>tutHasBuild('turret'),
  },
  { // 16 — garnison (ACTION, monde vivant : le tireur marche jusqu'au bâtiment)
    text:{fr:"🚪 GARNISON : touchez votre tour ou votre muraille, puis choisissez d'y poster un tireur. À l'abri (2 par bâtiment au plus), il tire plus loin et survit aux crues.",
          en:"🚪 GARRISON: tap your turret or wall, then choose to post a shooter in it. Under cover (2 per building at most) it shoots farther and survives floods.",
          es:"🚪 GUARNICIÓN: toca tu torreta o tu muralla y elige apostar en ella a un tirador. A cubierto (máximo 2 por edificio), dispara más lejos y sobrevive a las crecidas.",
          de:"🚪 GARNISON: Tippe auf deinen Turm oder deine Mauer und wähle, einen Schützen darin zu stationieren. In Deckung (höchstens 2 pro Gebäude) schießt er weiter und übersteht Fluten.",
          it:"🚪 GUARNIGIONE: tocca la tua torretta o il tuo muro, poi scegli di appostarvi un tiratore. Al riparo (al massimo 2 per edificio) spara più lontano e sopravvive alle piene.",
          pt:"🚪 GUARNIÇÃO: toque na sua torreta ou muralha e escolha posicionar um atirador nela. Protegido (no máximo 2 por edifício), ele atira mais longe e sobrevive às enchentes.",
          ru:"🚪 ГАРНИЗОН: нажмите на свою башню или стену и выберите, чтобы разместить в ней стрелка. В укрытии (не более 2 на здание) он стреляет дальше и переживает наводнения.",
          zh:"🚪 驻军：点击你的炮塔或城墙，然后选择在其中安排一名射手驻守。有掩护时（每座建筑最多 2 名），他射得更远，还能挺过洪水。",
          ar:"🚪 الحامية: المس برجك أو سورك، ثم اختر أن تضع فيه رامياً. وهو محتمٍ (2 كحد أقصى لكل مبنى) يرمي أبعد وينجو من الفيضانات."},
    obj:{fr:"Garnissez une tour ou une muraille",en:"Garrison a turret or wall",es:"Guarnece una torre o muralla",de:"Bemanne einen Turm oder eine Mauer",it:"Guarnisci una torre o un muro",pt:"Guarneça uma torre ou muralha",ru:"Разместите гарнизон в башне или стене",zh:"为塔楼或城墙驻防",ar:"ضع حامية في برج أو سور"},
    enter:()=>{ for (const s of sideBuildSlots(game.p)) if (s.b && (s.b.type==='turret'||s.b.type==='wall')){ tutCam(s.x); break; } },
    focus:()=>{ for (const s of sideBuildSlots(game.p)) if (s.b && (s.b.type==='turret'||s.b.type==='wall')) return tutWorldRect(s.x); return null; },
    done:()=>sideBuildSlots(game.p).some(s=>s.b && s.b.gar && s.b.gar.length>0),
  },
  { // 17 — la vague ! (combat réel — la barrière tient, l'ennemi vient de droite)
    text:{fr:"⚠ Une vague ennemie attaque la LIGNE depuis la droite ! Tenez : muraille, tourelle, garnison et troupes vont la repousser. Regardez le combat.",
          en:"⚠ An enemy wave attacks the LINE from the right! Hold: wall, turret, garrison and troops will repel it. Watch the fight.",es:"⚠ ¡Una oleada enemiga ataca la LÍNEA desde la derecha! Aguanta: muralla, torreta, guarnición y tropas la repelerán. Observa el combate.",de:"⚠ Eine feindliche Welle greift die LINIE von rechts an! Halte stand: Mauer, Turm, Garnison und Truppen werden sie zurückschlagen. Beobachte den Kampf.",it:"⚠ Un'ondata nemica attacca la LINEA da destra! Tieni duro: muro, torretta, guarnigione e truppe la respingeranno. Osserva il combattimento.",pt:"⚠ Uma onda inimiga ataca a LINHA pela direita! Aguente: muralha, torreta, guarnição e tropas vão repeli-la. Observe o combate.",ru:"⚠ Вражеская волна атакует ЛИНИЮ справа! Держитесь: стена, башня, гарнизон и войска отразят её. Наблюдайте за боем.",zh:"⚠ 敌方部队从右侧发起进攻！坚守防线：城墙、炮塔、驻军和部队会击退他们。观看这场战斗吧。",ar:"⚠ موجة عدو تهاجم الخط من اليمين! اصمد: السور والبرج والحامية والقوات ستصدّها. راقب المعركة."},
    obj:{fr:"Repoussez la vague ennemie",en:"Repel the enemy wave",es:"Repele la oleada enemiga",de:"Schlage die feindliche Welle zurück",it:"Respingi l'ondata nemica",pt:"Repila a onda inimiga",ru:"Отразите вражескую волну",zh:"击退敌方进攻",ar:"صدّ موجة العدو"},
    enter:()=>{ tutLine(game.tutBarrier-230); tutSpawnWave(); game.shake=6; sfx('boom'); camFollow=false; tutCam(game.tutBarrier-120);
      announce(tutText({fr:'⚠ VAGUE ENNEMIE',en:'⚠ ENEMY WAVE',es:'⚠ OLEADA ENEMIGA',de:'⚠ FEINDLICHE WELLE',it:'⚠ ONDATA NEMICA',pt:'⚠ ONDA INIMIGA',ru:'⚠ ВРАЖЕСКАЯ ВОЛНА',zh:'⚠ 敌军来袭',ar:'⚠ موجة العدو'}), '#ff5a4a'); },
    focus:()=>null, noReenter:true,       // enter() fait surgir la vague : ne JAMAIS le rejouer
    done:()=>game.e.units.length===0,
  },
  { // 18 — expérience (info)
    tap:true,
    text:{fr:"✦ L'EXPÉRIENCE coule seule, et plus vite en combattant, en tenant les zones ◈ et les lacs 💧, en frappant la base ennemie et en fortifiant la vôtre. Elle paie les pouvoirs ET les évolutions : il faut choisir.",
          en:"✦ EXPERIENCE trickles in by itself, and faster by fighting, holding zones ◈ and lakes 💧, hitting the enemy base and fortifying yours. It pays for powers AND evolutions: you have to choose.",
          es:"✦ La EXPERIENCIA fluye sola, y más rápido si combates, mantienes zonas ◈ y lagos 💧, golpeas la base enemiga y fortificas la tuya. Paga los poderes Y las evoluciones: hay que elegir.",
          de:"✦ ERFAHRUNG sickert von selbst ein, schneller durch Kämpfe, das Halten von Zonen ◈ und Seen 💧, Angriffe auf die feindliche Basis und den Ausbau deiner eigenen. Sie bezahlt Fähigkeiten UND Entwicklungen: Du musst wählen.",
          it:"✦ L'ESPERIENZA scorre da sola, e più in fretta combattendo, tenendo le zone ◈ e i laghi 💧, colpendo la base nemica e fortificando la tua. Paga i poteri E le evoluzioni: bisogna scegliere.",
          pt:"✦ A EXPERIÊNCIA vem sozinha, e mais rápido lutando, mantendo zonas ◈ e lagos 💧, atacando a base inimiga e fortificando a sua. Ela paga os poderes E as evoluções: é preciso escolher.",
          ru:"✦ ОПЫТ копится сам, а быстрее — в бою, при удержании зон ◈ и озёр 💧, при ударах по вражеской базе и укреплении своей. Он оплачивает способности И эволюции: придётся выбирать.",
          zh:"✦ 经验会自动缓慢累积，而战斗、占领区域 ◈ 与湖泊 💧、攻击敌方基地以及加固己方基地都能让它涨得更快。它既用于释放能力，也用于进化：你必须取舍。",
          ar:"✦ الخبرة تتدفّق وحدها، وبوتيرة أسرع بالقتال، وبالسيطرة على المناطق ◈ والبحيرات 💧، وبضرب قاعدة العدو وتحصين قاعدتك. وهي تدفع ثمن القدرات والتطوّرات معاً: عليك أن تختار."},
    enter:()=>{ camFollow=false; camX=0; },
    focus:()=>({x:248,y:6,w:120,h:34}),   // compteur ✦ dans le bandeau du haut
  },
  { // 18a — EXPANSION (info) : socles libres, chantiers à distance
    tap:true,
    text:{fr:"🗺 Entre les deux bases, des emplacements LIBRES (piquets) étendent votre économie ou vos défenses. On ne bâtit que là où vos troupes sont déjà passées : un soldat libre vient achever le chantier (2 chantiers à la fois au plus).",
          en:"🗺 Between the two bases, FREE plots (stakes) extend your economy or your defenses. You can only build where your troops have already been: an idle soldier comes to finish the building site (2 sites at once at most).",
          es:"🗺 Entre las dos bases, hay parcelas LIBRES (estacas) que amplían tu economía o tus defensas. Solo se puede construir donde tus tropas ya han pasado: un soldado libre acude a terminar la obra (2 obras a la vez como máximo).",
          de:"🗺 Zwischen den beiden Basen erweitern FREIE Bauplätze (Pflöcke) deine Wirtschaft oder deine Verteidigung. Gebaut werden kann nur dort, wo deine Truppen schon waren: Ein untätiger Soldat kommt, um die Baustelle fertigzustellen (höchstens 2 Baustellen gleichzeitig).",
          it:"🗺 Tra le due basi, aree LIBERE (picchetti) estendono la tua economia o le tue difese. Si costruisce solo dove le tue truppe sono già passate: un soldato libero viene a ultimare il cantiere (al massimo 2 cantieri alla volta).",
          pt:"🗺 Entre as duas bases, terrenos LIVRES (estacas) ampliam sua economia ou suas defesas. Só se constrói onde suas tropas já passaram: um soldado ocioso vem terminar a obra (no máximo 2 obras ao mesmo tempo).",
          ru:"🗺 Между двумя базами СВОБОДНЫЕ участки (колышки) расширяют вашу экономику или оборону. Строить можно только там, где уже прошли ваши войска: свободный солдат придёт достроить площадку (не более 2 строек одновременно).",
          zh:"🗺 两座基地之间的空地（木桩标记）可用来扩展经济或防御。只能在你的部队已经走过的地方建造：一名闲置的士兵会前来完成工地（同时最多 2 处工地）。",
          ar:"🗺 بين القاعدتين، قطع أرض حرّة (أوتاد) توسّع اقتصادك أو دفاعاتك. لا يمكنك البناء إلا حيث مرّت قواتك: يأتي جندي متفرّغ لإتمام الورشة (ورشتان كحد أقصى في وقت واحد)."},
    enter:()=>{ camFollow=false; camX=0; },
    focus:()=>null,
  },
  { // 18b — santé du monde, cataclysmes et fil d'actualités (info, avec une dépêche de démonstration)
    tap:true,
    text:{fr:"🌍 SANTÉ DU MONDE (réglette en haut : elle se REMPLIT de rouge quand la planète meurt). Plus la guerre dure, plus les CATACLYSMES frappent les deux camps : acide, canicule, crue (les garnisons y survivent), tempête de sable (fatale aux volants), parfois météores ou bombe atomique. Grèves et mises à jour forcées figent un camp 15 s. En haut à gauche, un fil raconte le monde (× pour le masquer).",
          en:"🌍 WORLD HEALTH (ruler at the top: it FILLS with red as the planet dies). The longer the war, the more CATACLYSMS hit both sides: acid, heatwave, flood (garrisons survive it), sandstorm (deadly to flyers), sometimes meteors or a nuke. Strikes and forced updates freeze one side for 15 s. Top left, a feed reports on the world (× to hide it).",
          es:"🌍 SALUD DEL MUNDO (barra superior: se LLENA de rojo cuando el planeta muere). Cuanto más dura la guerra, más CATACLISMOS golpean a ambos bandos: lluvia ácida, ola de calor, inundación (las guarniciones sobreviven), tormenta de arena (mortal para las unidades voladoras), a veces meteoritos o una bomba atómica. Las huelgas y las actualizaciones forzadas paralizan a un bando 15 s. Arriba a la izquierda, un hilo de noticias cuenta lo que pasa en el mundo (× para ocultarlo).",
          de:"🌍 WELTGESUNDHEIT (Leiste oben: Sie füllt sich ROT, wenn der Planet stirbt). Je länger der Krieg dauert, desto mehr KATASTROPHEN treffen beide Seiten: Säureregen, Hitzewelle, Überschwemmung (Garnisonen überstehen sie), Sandsturm (tödlich für Flieger), manchmal Meteoriten oder eine Atombombe. Streiks und erzwungene Updates legen eine Seite 15 s lang lahm. Oben links berichtet ein Ticker über die Welt (× zum Ausblenden).",
          it:"🌍 SALUTE DEL MONDO (barra in alto: si RIEMPIE di rosso quando il pianeta muore). Più la guerra dura, più i CATACLISMI colpiscono entrambi i campi: pioggia acida, ondata di caldo, inondazione (le guarnigioni sopravvivono), tempesta di sabbia (letale per i volanti), a volte meteore o una bomba atomica. Scioperi e aggiornamenti forzati bloccano un campo per 15 s. In alto a sinistra, un notiziario racconta il mondo (× per nasconderlo).",
          pt:"🌍 SAÚDE DO MUNDO (barra no alto: ela se ENCHE de vermelho quando o planeta morre). Quanto mais a guerra dura, mais CATACLISMOS atingem os dois lados: chuva ácida, onda de calor, inundação (as guarnições sobrevivem), tempestade de areia (mortal para unidades voadoras), às vezes meteoros ou uma bomba atômica. Greves e atualizações forçadas paralisam um lado por 15 s. No canto superior esquerdo, um feed conta as notícias do mundo (× para ocultar).",
          ru:"🌍 ЗДОРОВЬЕ МИРА (шкала вверху: она ЗАПОЛНЯЕТСЯ красным, когда планета умирает). Чем дольше война, тем сильнее КАТАКЛИЗМЫ бьют по обеим сторонам: кислотный дождь, волна жары, наводнение (гарнизоны его переживают), песчаная буря (смертельна для летающих), иногда метеориты или атомная бомба. Забастовки и принудительные обновления замораживают одну сторону на 15 с. Вверху слева лента рассказывает о событиях в мире (× — скрыть).",
          zh:"🌍 世界状态（顶部的进度条：星球濒死时它会被红色填满）。战争持续越久，灾变就越频繁地打击双方：酸雨、热浪、洪水（驻军能挺过）、沙尘暴（对飞行单位致命），有时还有陨石或核弹。罢工和强制更新会让一方停摆 15 秒。左上角的快讯栏播报世界动态（点 × 可隐藏）。",
          ar:"🌍 صحة العالم (الشريط في الأعلى: يمتلئ بالأحمر كلما احتضر الكوكب). كلما طالت الحرب ضربت الكوارث الطرفين أكثر: مطر حمضي، موجة حر، فيضان (تنجو منه الحاميات)، عاصفة رملية (قاتلة للطائرات)، وأحياناً نيازك أو قنبلة نووية. تشلّ الإضرابات والتحديثات الإجبارية أحد الطرفين 15 ثانية. وفي أعلى اليسار شريط أخبار يروي أحوال العالم (× لإخفائه)."},
    enter:()=>{ camFollow=false; camX=0; newsDemo(NEWS.t1[0]); },
    focus:()=>({x:W/2-86, y:15, w:172, h:19}),   // barre « santé du monde »
  },
  { // 19 — pouvoir ultime
    text:{fr:"Votre POUVOIR ULTIME ✸ se paie en ✦ (de plus en plus cher à chaque ère), se recharge en 40 s environ et blesse TOUS les ennemis sans jamais tuer d'un coup. Il est prêt : lancez-le ! Si votre base tombe sous 20 % de PV, il devient ☠ DERNIER RECOURS (gratuit, une seule fois).",
          en:"Your ULTIMATE ✸ is paid in ✦ (pricier with each era), recharges in about 40 s and hurts ALL enemies without ever killing outright. It's ready: unleash it! If your base drops below 20% HP it becomes ☠ LAST RESORT (free, one time).",
          es:"Tu PODER DEFINITIVO ✸ se paga en ✦ (más caro con cada era), se recarga en unos 40 s y daña a TODOS los enemigos sin matar nunca de golpe. ¡Está listo: lánzalo! Si tu base cae por debajo del 20 % de PV, se convierte en ☠ ÚLTIMO RECURSO (gratis, una sola vez).",
          de:"Deine ULTIMATIVE FÄHIGKEIT ✸ kostet ✦ (mit jedem Zeitalter teurer), lädt sich in etwa 40 s neu auf und verletzt ALLE Feinde, ohne je sofort zu töten. Sie ist bereit: Entfessle sie! Fällt deine Basis unter 20 % LP, wird sie zum ☠ LETZTEN MITTEL (gratis, einmalig).",
          it:"La tua ABILITÀ SUPREMA ✸ si paga in ✦ (più cara a ogni era), si ricarica in circa 40 s e ferisce TUTTI i nemici senza mai uccidere di colpo. È pronta: scatenala! Se la tua base scende sotto il 20% di PV, diventa ☠ ULTIMA RISORSA (gratis, una sola volta).",
          pt:"Sua HABILIDADE SUPREMA ✸ é paga em ✦ (mais cara a cada era), recarrega em cerca de 40 s e fere TODOS os inimigos sem nunca matar de uma vez. Ela está pronta: use-a! Se sua base cair abaixo de 20% de PV, ela vira ☠ ÚLTIMO RECURSO (grátis, uma única vez).",
          ru:"Ваша КОРОННАЯ способность ✸ оплачивается ✦ (с каждой эпохой дороже), перезаряжается примерно за 40 с и ранит ВСЕХ врагов, но никогда не убивает сразу. Она готова — применяйте! Если база опустится ниже 20 % ОЗ, она превратится в ☠ ПОСЛЕДНИЙ ШАНС (бесплатно, один раз).",
          zh:"你的终极技能 ✸ 以 ✦ 支付（每个纪元都更贵），约 40 秒冷却，会伤害所有敌人，但绝不会一击秒杀。它已就绪：放出去吧！若你的基地生命值跌破 20%，它会变成 ☠ 最后手段（免费，仅一次）。",
          ar:"مهارتك القصوى ✸ تُدفع من ✦ (تزداد كلفتها مع كل حقبة)، وتُعاد شحنها في نحو 40 ثانية، وتصيب كل الأعداء دون أن تقتل أحداً دفعة واحدة. إنها جاهزة: أطلقها! وإذا هبطت صحة قاعدتك دون 20% تصبح ☠ الملاذ الأخير (مجاني، مرة واحدة)."},
    obj:{fr:"Lancez votre pouvoir ultime",en:"Unleash your ultimate",es:"Usa tu poder definitivo",de:"Setze deine ultimative Fähigkeit ein",it:"Usa la tua abilità suprema",pt:"Use sua habilidade suprema",ru:"Примените коронную способность",zh:"使用你的大招",ar:"استخدم مهارتك القصوى"},
    enter:()=>{ const p=game.p; p.specialCd=0; p.xp=Math.max(p.xp, specialXpCost(p)+30); TUT.specBase=game.specialsUsed; camFollow=true; },
    focus:()=>tutHudRect(b=>b.type==='special'),
    allow:a=>a.t==='special',
    done:()=>game.specialsUsed>(TUT.specBase||0),
  },
  { // 20 — évolution d'ère
    text:{fr:"L'✦ sert aussi à ÉVOLUER : à chaque ère (5, puis la TRANSCENDANCE), les unités recrutées ensuite sont bien plus fortes, mais plus chères ; vos troupes déjà en place ne changent pas. Touchez ⚡ ÉVOLUER.",
          en:"✦ also lets you EVOLVE: with each era (5, then TRANSCENDENCE) units recruited afterwards are much stronger, but pricier; troops already fielded don't change. Tap ⚡ EVOLVE.",
          es:"La ✦ también sirve para EVOLUCIONAR: con cada era (5, y luego la TRASCENDENCIA), las unidades reclutadas después son mucho más fuertes, pero más caras; las tropas ya desplegadas no cambian. Toca ⚡ EVOLUCIONAR.",
          de:"✦ dient auch zum ENTWICKELN: Mit jedem Zeitalter (5, dann die TRANSZENDENZ) sind danach rekrutierte Einheiten deutlich stärker, aber teurer; bereits aufgestellte Truppen ändern sich nicht. Tippe auf ⚡ ENTWICKELN.",
          it:"L'✦ serve anche a EVOLVERE: a ogni era (5, poi la TRASCENDENZA) le unità reclutate dopo sono molto più forti, ma più costose; le truppe già schierate non cambiano. Tocca ⚡ EVOLVI.",
          pt:"O ✦ também serve para EVOLUIR: a cada era (5, depois a TRANSCENDÊNCIA), as unidades recrutadas depois ficam bem mais fortes, porém mais caras; as tropas já em campo não mudam. Toque em ⚡ EVOLUIR.",
          ru:"✦ нужен и для ЭВОЛЮЦИИ: с каждой эпохой (их 5, затем ТРАНСЦЕНДЕНТНОСТЬ) нанятые позже единицы намного сильнее, но дороже; уже выставленные войска не меняются. Нажмите ⚡ ЭВОЛЮЦИЯ.",
          zh:"✦ 还能用来进化：每进入一个纪元（共 5 个，之后是超越），此后招募的单位会强得多，但也更贵；已经上场的部队不会改变。点击 ⚡ 进化。",
          ar:"تُستخدم ✦ أيضاً في التطوّر: مع كل حقبة (5، ثم التعالي) تصبح الوحدات التي تُجنَّد بعدها أقوى بكثير لكنها أغلى؛ أما القوات الموجودة فلا تتغيّر. المس ⚡ تطوّر."},
    obj:{fr:"Évoluez vers l'ère suivante",en:"Evolve to the next era",es:"Evoluciona a la siguiente era",de:"Entwickle dich zum nächsten Zeitalter",it:"Evolvi alla prossima era",pt:"Evolua para a próxima era",ru:"Перейдите в следующую эпоху",zh:"进化到下一纪元",ar:"تطوّر إلى الحقبة التالية"},
    enter:()=>{ const p=game.p; TUT.eraBase=p.era; p.xp=Math.max(p.xp, EVOLVE_XP[Math.min(p.era+1,4)]+30); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='evolve'),
    allow:a=>a.t==='evolve',
    done:()=>game.p.era>(TUT.eraBase||0),
  },
  { // 21 — fortifier la base
    text:{fr:"Votre BASE aussi s'améliore : touchez-la, puis « Fortifier » — plus de PV ET plus d'✦ passif. Son menu offre aussi la GARDE du château (3 tireurs) et la nano-réparation.",
          en:"Your BASE upgrades too: tap it, then \"Fortify\" — more HP AND more passive ✦. Its menu also offers the stronghold GUARD (3 shooters) and nano-repair.",
          es:"Tu BASE también mejora: tócala y luego «Fortificar»: más PV Y más ✦ pasiva. Su menú también ofrece la GUARDIA de la fortaleza (3 tiradores) y la nano-reparación.",
          de:"Auch deine BASIS wird besser: Tippe darauf, dann auf „Befestigen“ – mehr LP UND mehr passives ✦. Ihr Menü bietet außerdem die WACHE der Festung (3 Schützen) und die Nano-Reparatur.",
          it:"Anche la tua BASE migliora: toccala, poi «Fortificare» — più PV E più ✦ passivo. Il suo menu offre anche la GUARDIA della fortezza (3 tiratori) e la nano-riparazione.",
          pt:"Sua BASE também melhora: toque nela e depois em «Fortificar» — mais PV E mais ✦ passivo. O menu dela também oferece a GUARDA da fortaleza (3 atiradores) e a nano-reparação.",
          ru:"Ваша БАЗА тоже улучшается: нажмите на неё, затем «Укрепить» — больше ОЗ И больше пассивного ✦. В её меню также есть ОХРАНА крепости (3 стрелка) и нано-ремонт.",
          zh:"你的基地同样可以升级：点击它，再选“强化”——更多生命值，以及更多被动 ✦。它的菜单里还提供要塞守卫（3 名射手）和纳米修复。",
          ar:"قاعدتك أيضاً تتطوّر: المسها ثم «تحصين» — صحة أكثر و✦ سلبية أكثر. وتتيح قائمتها كذلك حرس القلعة (3 رماة) والإصلاح النانوي."},
    obj:{fr:"Fortifiez votre base",en:"Fortify your base",es:"Fortifica tu base",de:"Befestige deine Basis",it:"Fortifica la tua base",pt:"Fortifique sua base",ru:"Укрепите базу",zh:"加固你的基地",ar:"حصّن قاعدتك"},
    enter:()=>{ const p=game.p; TUT.fortBase=(p.fortLvl||1); tutGrant(700,700,200); camFollow=false; tutCam(p.x); },
    focus:()=>tutWorldRect(game.p.x),
    done:()=>(game.p.fortLvl||1)>(TUT.fortBase||1) || (TUT.fortBase||1)>=3,   // déjà au maximum : étape acquise
  },
  { // 21b — RÉPARER (dégâts mis en scène)
    text:{fr:"🔧 RÉPARER : votre château et vos bâtiments ont pris des coups. Touchez 🔧 TOUT pour tout remettre à neuf (le prix dépend des dégâts). La nano-réparation (menu du château) s'en charge toute seule.",
          en:"🔧 REPAIR: your stronghold and buildings took hits. Tap 🔧 ALL to restore everything (the price depends on the damage). Nano-repair (stronghold menu) takes care of it by itself.",
          es:"🔧 REPARAR: tu fortaleza y tus edificios han recibido golpes. Toca 🔧 TODO para restaurarlo todo (el precio depende de los daños). La nano-reparación (menú de la fortaleza) se encarga sola.",
          de:"🔧 REPARIEREN: Deine Festung und deine Gebäude haben Treffer abbekommen. Tippe auf 🔧 ALLES, um alles instand zu setzen (der Preis hängt vom Schaden ab). Die Nano-Reparatur (Festungsmenü) erledigt das von selbst.",
          it:"🔧 RIPARARE: la tua fortezza e i tuoi edifici hanno subito colpi. Tocca 🔧 TUTTO per ripristinare tutto (il prezzo dipende dai danni). La nano-riparazione (menu della fortezza) se ne occupa da sola.",
          pt:"🔧 REPARAR: sua fortaleza e seus edifícios sofreram golpes. Toque em 🔧 TUDO para restaurar tudo (o preço depende do dano). A nano-reparação (menu da fortaleza) cuida disso sozinha.",
          ru:"🔧 РЕМОНТ: ваша крепость и здания пострадали. Нажмите 🔧 ВСЁ, чтобы всё восстановить (цена зависит от повреждений). Нано-ремонт (меню крепости) делает это сам.",
          zh:"🔧 修复：你的要塞和建筑受到了打击。点击 🔧 全部 即可全部修复（价格取决于损伤程度）。纳米修复（要塞菜单）会自动处理。",
          ar:"🔧 الإصلاح: تلقّت قلعتك ومبانيك ضربات. المس 🔧 الكل لإصلاح كل شيء (يعتمد السعر على حجم الضرر). والإصلاح النانوي (قائمة القلعة) يتكفّل بذلك تلقائياً."},
    obj:{fr:"Réparez tout",en:"Repair everything",es:"Repara todo",de:"Repariere alles",it:"Ripara tutto",pt:"Repare tudo",ru:"Почините всё",zh:"全部修复",ar:"أصلح كل شيء"},
    enter:()=>{ const p=game.p; tutGrant(500,500,150); p.hp=Math.min(p.hp, Math.max(1,p.maxhp-400));
      for (const s of sideBuildSlots(p)) if (s.b && s.b.type!=='site') s.b.hp=Math.min(s.b.hp, Math.round(s.b.maxhp*0.5)); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='repairall'),
    allow:a=>a.t==='repairall', noReenter:true,
    done:()=>{ const p=game.p; return p.hp>=p.maxhp-0.5 && sideBuildSlots(p).every(s=>!s.b || s.b.type==='site' || s.b.hp>=s.b.maxhp-0.5); },
  },
  { // 22 — héros
    text:{fr:"Invoquez votre HÉROS légendaire (🌾700 🪙700 💧200 ; à nouveau disponible au bout de 10 min ; un seul à la fois) : tant qu'il vit, toute votre armée frappe 3 fois plus fort et avance 2 fois plus vite.",
          en:"Summon your legendary HERO (🌾700 🪙700 💧200; available again after 10 min; one at a time): while they live your whole army hits 3 times harder and moves twice as fast.",
          es:"Invoca a tu HÉROE legendario (🌾700 🪙700 💧200; vuelve a estar disponible tras 10 min; solo uno a la vez): mientras viva, todo tu ejército golpea 3 veces más fuerte y avanza el doble de rápido.",
          de:"Beschwöre deinen legendären HELDEN (🌾700 🪙700 💧200; nach 10 Min. wieder verfügbar; nur einer gleichzeitig): Solange er lebt, schlägt deine ganze Armee dreimal so hart zu und bewegt sich doppelt so schnell.",
          it:"Evoca il tuo EROE leggendario (🌾700 🪙700 💧200; di nuovo disponibile dopo 10 min; uno alla volta): finché vive, tutto il tuo esercito colpisce 3 volte più forte e si muove due volte più veloce.",
          pt:"Invoque seu HERÓI lendário (🌾700 🪙700 💧200; disponível de novo após 10 min; um de cada vez): enquanto ele viver, todo o seu exército bate 3 vezes mais forte e se move duas vezes mais rápido.",
          ru:"Призовите своего легендарного ГЕРОЯ (🌾700 🪙700 💧200; снова доступен через 10 мин; только один за раз): пока он жив, вся ваша армия бьёт втрое сильнее и движется вдвое быстрее.",
          zh:"召唤你的传奇英雄（🌾700 🪙700 💧200；10 分钟后可再次召唤；同一时间只能有一位）：只要他活着，你的全军伤害提高 3 倍，移动速度提高 2 倍。",
          ar:"استدعِ بطلك الأسطوري (🌾700 🪙700 💧200؛ يتوفر مجدداً بعد 10 دقائق؛ بطل واحد في كل مرة): ما دام حياً، يضرب جيشك كله بقوة ثلاثة أضعاف ويتحرك بضعف السرعة."},
    obj:{fr:"Invoquez votre héros",en:"Summon your hero",es:"Invoca a tu héroe",de:"Beschwöre deinen Helden",it:"Evoca il tuo eroe",pt:"Invoque seu herói",ru:"Призовите героя",zh:"召唤你的英雄",ar:"استدعِ بطلك"},
    // garantit l'invocation DANS TOUS LES CAS, peu importe ce qui a été dépensé avant :
    // ressources largement au-dessus du coût du héros + recharge remise à zéro.
    enter:()=>{ const p=game.p; p.heroCd=0;
      tutGrant((HERO_COST.f||0)+400, (HERO_COST.m||0)+400, (HERO_COST.w||0)+400); camFollow=true; },
    focus:()=>tutHudRect(b=>b.type==='hero'),
    allow:a=>a.t==='hero',
    done:()=>game.p.units.some(u=>u.role==='hero'),
  },
  { // 23 — assaut final (la barrière TOMBE, on libère la carte, on détruit la base)
    text:{fr:"⚔ La BARRIÈRE TOMBE ! La voie est libre : votre armée charge d'elle-même vers la base ennemie. Le temps est accéléré ×2 (bouton en haut à droite).",
          en:"⚔ The BARRIER FALLS! The path is open: your army charges the enemy base on its own. Time is sped up ×2 (top-right button).",
          es:"⚔ ¡La BARRERA CAE! El camino está libre: tu ejército carga solo hacia la base enemiga. El tiempo se acelera ×2 (botón arriba a la derecha).",
          de:"⚔ Die BARRIERE FÄLLT! Der Weg ist frei: Deine Armee stürmt von selbst auf die feindliche Basis zu. Die Zeit läuft ×2 schneller (Button oben rechts).",
          it:"⚔ La BARRIERA CADE! La via è libera: il tuo esercito carica da solo verso la base nemica. Il tempo è accelerato ×2 (pulsante in alto a destra).",
          pt:"⚔ A BARREIRA CAI! O caminho está livre: seu exército avança sozinho contra a base inimiga. O tempo está acelerado ×2 (botão no canto superior direito).",
          ru:"⚔ БАРЬЕР ПАЛ! Путь свободен: ваша армия сама идёт в атаку на вражескую базу. Время ускорено ×2 (кнопка вверху справа).",
          zh:"⚔ 屏障倒下了！道路畅通：你的军队会自行冲向敌方基地。时间已加速 ×2（右上角按钮）。",
          ar:"⚔ سقط الحاجز! الطريق مفتوح: يهاجم جيشك قاعدة العدو من تلقاء نفسه. جرى تسريع الوقت ×2 (الزر في أعلى اليمين)."},
    obj:{fr:"Détruisez la base ennemie",en:"Destroy the enemy base",es:"Destruye la base enemiga",de:"Zerstöre die feindliche Basis",it:"Distruggi la base nemica",pt:"Destrua a base inimiga",ru:"Уничтожьте вражескую базу",zh:"摧毁敌方基地",ar:"دمّر قاعدة العدو"},
    enter:()=>{ const e=game.e; game.tutBarrier=null;        // libère la carte
      // toute l'armée repart (efface les ordres de position / la sélection de la vague)
      e.hp=e.maxhp=600; e.stance='hold'; game.sel.clear(); for (const u of game.p.units) u.ord=null;
      game.p.stance='charge'; camFollow=true;
      game.speed = Math.max(game.speed||1, 2);   // la marche jusqu'à la base adverse (~2000 px) durait 35-40 s
      announce(tutText({fr:'🛡 BARRIÈRE TOMBÉE — À L\'ASSAUT !',en:'🛡 BARRIER DOWN — CHARGE!',es:'🛡 ¡BARRERA CAÍDA — AL ASALTO!',de:'🛡 BARRIERE GEFALLEN — ANGRIFF!',it:'🛡 BARRIERA CADUTA — ALL\'ASSALTO!',pt:'🛡 BARREIRA CAÍDA — AO ATAQUE!',ru:'🛡 БАРЬЕР ПАЛ — В АТАКУ!',zh:'🛡 屏障已破 — 冲锋！',ar:'🛡 سقط الحاجز — إلى الهجوم!'}), '#9dd88a'); },
    focus:()=>tutHudRect(b=>b.type==='stance'&&b.st==='charge'),
    allow:a=>a.t==='stance', noReenter:true,   // enter() remet la base à 600 PV : ne pas le rejouer
    done:()=>game.e.hp<=0,
  },
  { // 23b — LA BASE À DEUX VIES (info) : bombe H, hiver nucléaire
    tap:true,
    text:{fr:"☢ En VRAIE partie, la première base qui tombe RENAÎT, plus solide, et une BOMBE H rase la carte : armées, files d'attente, bâtiments. Seules les bases et la garde du château survivent ; l'hiver nucléaire divise ensuite 🌾 et 🪙 par deux pendant quelques minutes. Il faut donc abattre la base DEUX fois : gardez des réserves et rebâtissez vite.",
          en:"☢ In a REAL match, the first base to fall is REBORN, tougher, and an H-BOMB razes the map: armies, queues, buildings. Only the bases and the stronghold guard survive; nuclear winter then halves 🌾 and 🪙 for a few minutes. So a base must be taken down TWICE: keep reserves and rebuild fast.",
          es:"☢ En una partida REAL, la primera base que cae RENACE, más sólida, y una BOMBA H arrasa el mapa: ejércitos, colas, edificios. Solo sobreviven las bases y la guardia de la fortaleza; después el invierno nuclear reduce a la mitad 🌾 y 🪙 durante unos minutos. Así que hay que derribar la base DOS veces: guarda reservas y reconstruye rápido.",
          de:"☢ In einer ECHTEN Partie ERSTEHT die erste gefallene Basis NEU, robuster, und eine WASSERSTOFFBOMBE legt die Karte in Schutt: Armeen, Warteschlangen, Gebäude. Nur die Basen und die Festungswache überleben; der nukleare Winter halbiert dann einige Minuten lang 🌾 und 🪙. Eine Basis muss also ZWEIMAL zerstört werden: Halte Reserven bereit und baue schnell wieder auf.",
          it:"☢ In una partita VERA, la prima base che cade RINASCE, più solida, e una BOMBA H rade al suolo la mappa: eserciti, code, edifici. Sopravvivono solo le basi e la guardia della fortezza; poi l'inverno nucleare dimezza 🌾 e 🪙 per qualche minuto. Quindi una base va abbattuta DUE volte: tieni delle riserve e ricostruisci in fretta.",
          pt:"☢ Em uma partida REAL, a primeira base que cai RENASCE, mais resistente, e uma BOMBA H arrasa o mapa: exércitos, filas, edifícios. Só as bases e a guarda da fortaleza sobrevivem; o inverno nuclear então reduz 🌾 e 🪙 pela metade por alguns minutos. Portanto é preciso derrubar a base DUAS vezes: mantenha reservas e reconstrua rápido.",
          ru:"☢ В НАСТОЯЩЕЙ партии первая павшая база ВОЗРОЖДАЕТСЯ, крепче прежней, а ВОДОРОДНАЯ БОМБА сметает с карты армии, очереди и здания. Выживают только базы и охрана крепости; затем ядерная зима на несколько минут вдвое сокращает 🌾 и 🪙. Так что базу нужно уничтожить ДВАЖДЫ: держите запасы и быстро отстраивайтесь.",
          zh:"☢ 在真正的对局中，第一座陷落的基地会重生，而且更加坚固，同时一枚氢弹会夷平整张地图：军队、队列、建筑。只有基地和要塞守卫能幸存；随后核冬天会让 🌾 和 🪙 减半，持续数分钟。所以必须摧毁基地两次：保留储备，快速重建。",
          ar:"☢ في المباراة الحقيقية، تُبعث القاعدة الأولى التي تسقط من جديد أمتن مما كانت، وتمحو قنبلة هيدروجينية الخريطة: الجيوش والطوابير والمباني. لا ينجو إلا القواعد وحرس القلعة؛ ثم يخفض الشتاء النووي 🌾 و🪙 إلى النصف لبضع دقائق. لذا يجب إسقاط القاعدة مرتين: احتفظ بمخزون وأعد البناء بسرعة."},
    enter:()=>{ camFollow=false; camX=0; },
    focus:()=>null,
  },
  { // 23c — RACCOURCIS, vitesse, pause (info)
    tap:true,
    text:{fr:"⌨ Sur PC, tout se joue aussi au clavier (touches modifiables dans les Paramètres) : 1 à 6 pour recruter, puis charger, tenir, replier, formation, évoluer, pouvoir, héros, tout réparer. En haut à droite : vitesse du jeu, pause ⏸ et réglages ⚙.",
          en:"⌨ On PC everything can be played from the keyboard too (keys can be rebound in Settings): 1 to 6 to recruit, then charge, hold, retreat, formation, evolve, power, hero, repair all. Top right: game speed, pause ⏸ and settings ⚙.",
          es:"⌨ En PC también se puede jugar todo con el teclado (las teclas se pueden reasignar en Ajustes): del 1 al 6 para reclutar, y luego cargar, aguantar, replegarse, formación, evolucionar, poder, héroe, reparar todo. Arriba a la derecha: velocidad de juego, pausa ⏸ y ajustes ⚙.",
          de:"⌨ Am PC lässt sich alles auch per Tastatur spielen (Tasten sind in den Einstellungen änderbar): 1 bis 6 zum Rekrutieren, dann Angreifen, Halten, Zurückziehen, Formation, Entwickeln, Fähigkeit, Held, alles reparieren. Oben rechts: Spielgeschwindigkeit, Pause ⏸ und Einstellungen ⚙.",
          it:"⌨ Su PC si può giocare tutto anche con la tastiera (i tasti si possono cambiare nelle Impostazioni): da 1 a 6 per reclutare, poi carica, tieni, ripiega, formazione, evolvi, potere, eroe, ripara tutto. In alto a destra: velocità di gioco, pausa ⏸ e impostazioni ⚙.",
          pt:"⌨ No PC, tudo também pode ser jogado pelo teclado (as teclas podem ser redefinidas nas Configurações): de 1 a 6 para recrutar, depois carregar, segurar, recuar, formação, evoluir, poder, herói, reparar tudo. No canto superior direito: velocidade do jogo, pausa ⏸ e configurações ⚙.",
          ru:"⌨ На ПК всем можно управлять и с клавиатуры (клавиши меняются в Настройках): от 1 до 6 — найм, затем атака, удержание, отступление, построение, эволюция, способность, герой, починить всё. Вверху справа: скорость игры, пауза ⏸ и настройки ⚙.",
          zh:"⌨ 在电脑上，所有操作也都可以用键盘完成（按键可在设置中修改）：1 到 6 招募，然后是冲锋、坚守、撤退、阵型、进化、技能、英雄、全部修复。右上角：游戏速度、暂停 ⏸ 和设置 ⚙。",
          ar:"⌨ على الحاسوب يمكن لعب كل شيء بلوحة المفاتيح أيضاً (يمكن إعادة تعيين المفاتيح في الإعدادات): من 1 إلى 6 للتجنيد، ثم هجوم، تمسّك، تراجع، تشكيل، تطوّر، قوة، بطل، إصلاح الكل. في أعلى اليمين: سرعة اللعبة والإيقاف ⏸ والإعدادات ⚙."},
    enter:()=>{ camFollow=false; camX=0; },
    focus:()=>({x:W-116,y:3,w:116,h:32}),
  },
  { // 24 — fin
    tap:true,
    text:{fr:"🎉 Base abattue ! Tutoriel terminé : économie, armée, contrôle, défense, garnisons, expérience, pouvoirs, évolution, base et héros — tout est à vous. Bonne guerre, commandant !",
          en:"🎉 Base down! Tutorial complete: economy, army, control, defense, garrisons, experience, powers, evolution, base and hero — it's all yours. Good war, commander!",
          es:"🎉 ¡Base derribada! Tutorial completado: economía, ejército, control, defensa, guarniciones, experiencia, poderes, evolución, base y héroe: todo es tuyo. ¡Buena guerra, comandante!",
          de:"🎉 Basis gefallen! Tutorial abgeschlossen: Wirtschaft, Armee, Kontrolle, Verteidigung, Garnisonen, Erfahrung, Fähigkeiten, Entwicklung, Basis und Held – alles gehört dir. Gutes Gelingen im Krieg, Kommandant!",
          it:"🎉 Base abbattuta! Tutorial completato: economia, esercito, controllo, difesa, guarnigioni, esperienza, poteri, evoluzione, base ed eroe — è tutto tuo. Buona guerra, comandante!",
          pt:"🎉 Base destruída! Tutorial concluído: economia, exército, controle, defesa, guarnições, experiência, poderes, evolução, base e herói — tudo é seu. Boa guerra, comandante!",
          ru:"🎉 База уничтожена! Обучение завершено: экономика, армия, управление, оборона, гарнизоны, опыт, способности, эволюция, база и герой — всё в ваших руках. Удачной войны, командир!",
          zh:"🎉 基地已被摧毁！教程完成：经济、军队、控制、防御、驻军、经验、能力、进化、基地与英雄——一切尽在你手。祝你战无不胜，指挥官！",
          ar:"🎉 سقطت القاعدة! اكتمل التدريب: الاقتصاد والجيش والتحكم والدفاع والحاميات والخبرة والقدرات والتطوّر والقاعدة والبطل — كل شيء بين يديك. حرباً موفقة أيها القائد!"},
    enter:()=>{ camFollow=false; camX=0; game.flash=0.6; sfx('evolve'); },
    focus:()=>null,
  },
];
// mini-vague ennemie scriptée : 3 unités surgissent À DROITE de la barrière et chargent la ligne
function tutSpawnWave(){
  const e = game.e, x = (game.tutBarrier!=null? game.tutBarrier : game.p.x+1150) + 320;
  e.stance = 'charge';                   // la vague avance vers la ligne du joueur
  spawnUnit(e, 0, false, x);             // mêlée
  spawnUnit(e, 0, false, x + 44);        // mêlée
  spawnUnit(e, 2, false, x + 92);        // tireur
}
// barrière d'énergie du tutoriel (repère MONDE — dessinée dans le repère zoomé, appelée par render)
function drawTutBarrier(){
  if (!game || !game.tut || game.tutBarrier==null) return;
  const x = game.tutBarrier - camX, top = -zTY()/zoom - 40, bot = gY(game.tutBarrier) + 20;
  const pulse = 0.45 + 0.25*Math.sin(performance.now()/333);
  ctx.save();
  ctx.fillStyle = 'rgba(10,14,26,0.30)'; ctx.fillRect(x, top, 60, bot-top);   // léger voile côté scellé
  const g = ctx.createLinearGradient(x-14,0,x+14,0);
  g.addColorStop(0,'rgba(90,208,255,0)'); g.addColorStop(0.5,rgbaC('#5ad0ff',pulse)); g.addColorStop(1,'rgba(90,208,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x-14, top, 28, bot-top);
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#bfe9ff';
  for (let yy = top + ((performance.now()/14)%26); yy < bot; yy += 26) ctx.fillRect(x-2, yy, 4, 12);
  ctx.restore(); ctx.globalAlpha = 1;
}
/* ---- cycle de vie ---- */
function startTutorial(){
  audioInit(); musicStart(); goFullscreen();
  closeNetUI(); $('menu').style.display='none'; $('endscreen').style.display='none';
  intro = -1; pendingStart = null; netDisconnect();
  newGame('HUM', 0, false);
  game.tut = true; game.speed = 1;
  const p = game.p, e = game.e;
  tutHold(); e.stance = 'hold';
  e.hp = e.maxhp = 9e9;              // base ennemie inattaquable (jusqu'à l'assaut final)
  // BARRIÈRE : bloque le front au milieu de la carte — les troupes du joueur ne la franchissent
  // pas tant qu'elle n'est pas levée (assaut final). Évite que les unités filent trop loin.
  // Placée NETTEMENT en avant des socles : les unités se massent contre la barrière, donc bien
  // à droite des socles de défense, qui restent ainsi dégagés et faciles à toucher.
  const barrierX = p.x + 1300;
  game.tutBarrier = barrierX;
  // 2 socles de DÉFENSE en arrière de la barrière (muraille + tourelle) — l'ennemi n'étant pas
  // bloqué par la barrière, il vient jusqu'à eux : la tourelle aura toujours des cibles à portée.
  // (ces deux socles sont posés à l'étape de la barrière — voir tutDefSlots)
  // PAS de socles neutres en tuto : le socle neutre par défaut à WORLD*0.33 (≈1188) tombe
  // PILE entre les deux socles de défense ci-dessus (1155/1215) — un 3e cercle « TERRAIN
  // LIBRE » s'affichait donc en chevauchement, jamais enseigné et jamais nécessaire.
  game.neut = [];
  camFollow = false; zoom = 1; camX = 0; camClamp();
  TUT = { i:0, t:0, steps:TUT_STEPS, revealed:[], celebrating:false, celebT:0, confirmSkip:false, freeze:false, uiRects:[], confirmRects:[] };
  tutEnterStep();
  announce(tutText({fr:"✦ TUTORIEL — bienvenue, commandant",en:"✦ TUTORIAL — welcome, commander",es:"✦ TUTORIAL — bienvenido, comandante",de:"✦ TUTORIAL — willkommen, Kommandant",it:"✦ TUTORIAL — benvenuto, comandante",pt:"✦ TUTORIAL — bem-vindo, comandante",ru:"✦ ОБУЧЕНИЕ — добро пожаловать, командир",zh:"✦ 教程 — 欢迎，指挥官",ar:"✦ الدرس التعليمي — مرحباً أيها القائد"}), '#ffd34a');
}
function endTutorial(){
  try { localStorage.setItem('agi_tutoSeen','1'); } catch(e){}
  TUT = null; game = null; paused = false; netPause = null; buildMenu = null;
  selMode = false; selBox = null; intro = -1; pendingStart = null;
  $('menu').style.display = 'flex';
}
function tutEnterStep(){
  const step = TUT.steps[TUT.i];
  TUT.t = 0; TUT.uiRects = []; TUT.cardPos = null; TUT.reentered = false;   // chaque étape repart en position auto
  if (NEWSF.cur && NEWSF.cur.demo) NEWSF.cur = null;                          // dépêche de démo : étape « monde » seulement
  if (step.enter) step.enter();
}
function tutBeginAct(){ if (TUT && TUT.steps[TUT.i].tap) tutAdvance(); }   // bouton « Continuer »
function tutAdvance(){
  if (!TUT) return;
  TUT.celebrating = false; TUT.celebT = 0;
  const step = TUT.steps[TUT.i];
  if (step.allow) TUT.revealed.push(step.allow);   // mémorise les boutons enseignés
  TUT.i++;
  if (TUT.i >= TUT.steps.length){ endTutorial(); return; }
  tutEnterStep();
}
function tutTick(dt){
  if (!game || !game.tut || !TUT) return;
  TUT.t += dt;
  if (TUT.celebrating){ TUT.celebT += dt; if (TUT.celebT > 0.7) tutAdvance(); return; }
  const step = TUT.steps[TUT.i];
  // AIDE RENFORCÉE : joueur bloqué ~20 s sur une étape d'ACTION → on rejoue enter() une fois
  // (recentre la caméra sur la cible, régénère les ressources si besoin). Sûr à rejouer : les
  // enter() des étapes sont idempotents (tutGrant utilise Math.max, tutCam recentre
  // sans effet de bord) — SAUF ceux marqués noReenter (vague, assaut final). Le halo devient
  // aussi bien plus visible, voir drawTut().
  if (!step.tap && !step.noReenter && !TUT.reentered && TUT.t>20 && step.enter){ TUT.reentered = true; step.enter(); }
  if (!step.tap && step.done && step.done()){
    TUT.celebrating = true; TUT.celebT = 0; sfx('cap');
    const cx = s2wX(W/2); addFloater(cx, gY(cx)-150, '✓', '#9dc88a', 22);
  }
}
// niveau d'insistance de l'aide : 0 normal, 1 léger rappel (dès 7 s), 2 aide renforcée (dès 20 s,
// étapes d'action uniquement — les étapes d'info se valident d'un simple tap sur la carte).
function tutStuckLevel(step){
  if (!TUT || step.tap) return 0;
  return TUT.t>20 ? 2 : TUT.t>7 ? 1 : 0;
}
// monde gelé ? (appelé par update) — gel explicite (bloc défense) OU pendant une étape d'info,
// pour un écran calme et un bouton « Continuer » fiable. Toujours réversible (Continuer/Passer).
function tutFrozen(){
  if (!game || !game.tut || !TUT) return false;
  const step = TUT.steps[TUT.i];
  return !!(TUT.freeze || (step && step.tap));
}
/* ---- visibilité progressive du HUD (appelée par 13-hud.js) ---- */
// contrôles UTILITAIRES (⚙ réglages, ⏸, vitesse, caméra, zoom) : toujours visibles — ce ne sont pas
// des leçons, et les masquer empêchait de couper le son ou de quitter le tuto sur mobile.
const TUT_ALWAYS = {pause:1, softpause:1, speed:1, cam:1, zoom:1};
function tutBtnHidden(b){            // true = masquer (jamais enseigné)
  if (!game || !game.tut || !TUT) return false;
  if (TUT_ALWAYS[b.type]) return false;
  const step = TUT.steps[TUT.i], desc = tutDesc(b);
  if (step && step.allow && step.allow(desc)) return false;     // bouton de l'étape
  if (TUT.revealed.some(p => p(desc))) return false;            // déjà enseigné
  return true;
}
function tutBtnDim(b){               // true = afficher grisé (acquis, pas l'étape courante)
  if (!game || !game.tut || !TUT || TUT_ALWAYS[b.type]) return false;
  const step = TUT.steps[TUT.i], desc = tutDesc(b);
  if (step && step.allow && step.allow(desc)) return false;
  return TUT.revealed.some(p => p(desc));
}
// onglet ⬆ d'amélioration de classe : masqué tant que le tuto n'a pas atteint l'étape « amélioration »
// (sinon le joueur peut tout monter au max trop tôt et l'étape devient infaisable).
function tutUpgAllowed(){
  if (!game || !game.tut || !TUT) return true;
  const step = TUT.steps[TUT.i], d = {t:'upg'};
  return (step && step.allow && step.allow(d)) || TUT.revealed.some(p => p(d));
}
function tutBuildAllowed(key){       // option de menu de construction visible en tuto ?
  if (!game || !game.tut || !TUT) return true;
  const step = TUT.steps[TUT.i], d = {t:'build', type:key};
  return !!(step && step.allow && step.allow(d));    // uniquement la construction de l'étape : chaque socle garde son rôle
}
function tutBuildCurrent(key){       // option à mettre en surbrillance dans le menu
  if (!game || !game.tut || !TUT) return false;
  const step = TUT.steps[TUT.i];
  return !!(step && step.allow && step.allow({t:'build', type:key}));
}
/* ---- rendu (halo + carte) ---- */
function tutWrap(text, maxW, font){
  ctx.font = font; const words = text.split(' '), lines=[]; let cur='';
  for (const w of words){ const test = cur? cur+' '+w : w;
    if (ctx.measureText(test).width > maxW && cur){ lines.push(cur); cur=w; } else cur=test; }
  if (cur) lines.push(cur); return lines;
}
function drawTut(){
  if (!TUT) return;
  const step = TUT.steps[TUT.i];
  const focus = (!TUT.confirmSkip && step.focus) ? step.focus() : null;
  const acc = (game&&game.p&&game.p.fac)? game.p.fac.accent : '#ffd34a';
  const pulse = 0.5 + 0.5*Math.sin(performance.now()/1000*4.5);
  const stuck = tutStuckLevel(step);
  // HALO additif autour de la cible (PAS de voile sombre → jamais d'écran noir). AIDE RENFORCÉE
  // (stuck>=2, ~20 s sans action) : halo plus large/plus lumineux + anneau « radar » qui
  // s'étend et s'efface en boucle — capte l'œil même en vision périphérique, sans la flèche
  // fragile d'avant (retirée à la demande : mal centrée, se déplaçait avec la carte).
  let fx=0,fy=0,fw=0,fh=0;
  if (focus){
    const pad=10+stuck*4; fx=focus.x-pad; fy=focus.y-pad; fw=focus.w+pad*2; fh=focus.h+pad*2;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    ctx.strokeStyle=rgbaC(acc,0.55+0.4*pulse); ctx.lineWidth=3+stuck*1.5;
    if (qFx()){ ctx.shadowColor=acc; ctx.shadowBlur=16+stuck*10; }
    rr(fx,fy,fw,fh,12); ctx.stroke();
    if (stuck>=2){
      const ph=(performance.now()/900)%1, grow=ph*24;
      ctx.globalAlpha=(1-ph)*0.7; ctx.lineWidth=2;
      rr(fx-grow,fy-grow,fw+grow*2,fh+grow*2,12+grow); ctx.stroke(); ctx.globalAlpha=1;
    }
    ctx.restore();
  }
  // CARTE d'instruction — COMPACTE, déplaçable (glisser) et auto-repositionnée pour ne JAMAIS
  // recouvrir la cible surlignée ni un menu ouvert dessous.
  const pal = uiPal(), bodyF = uiF(pal, 'type', 12);
  const bw = Math.min(338, W-24), pad = 12, titleH = 13, lineH = 16, btnH = 28;
  const lines = tutWrap(tutText(step.text), bw-pad*2, bodyF);
  const objLine = step.obj ? tutText(step.obj) : null;
  const bh = pad + titleH + 12 + lines.length*lineH + 6 + btnH + pad + (objLine?18:0);
  const bx = clamp((W-bw)/2, 10, W-bw-10);
  // obstacles à éviter : la cible surlignée + un éventuel menu de construction
  const obst = [];
  if (focus) obst.push({x:fx,y:fy,w:fw,h:fh});
  if (buildMenu && buildMenu.box) obst.push(buildMenu.box);
  const ovArea = (y)=> obst.reduce((s,o)=>{
    const ox=Math.max(0,Math.min(bx+bw,o.x+o.w)-Math.max(bx,o.x));
    const oy=Math.max(0,Math.min(y+bh,o.y+o.h)-Math.max(y,o.y)); return s+ox*oy; }, 0);
  // si la carte a été DÉPLACÉE à la main mais qu'un menu s'ouvre dessous → on la relâche (auto)
  if (TUT.cardPos && buildMenu && buildMenu.box){
    const c=TUT.cardPos, o=buildMenu.box;
    if (!(c.x+bw<o.x || c.x>o.x+o.w || c.y+bh<o.y || c.y>o.y+o.h)) TUT.cardPos = null;
  }
  let by;
  if (TUT.cardPos){ by = clamp(TUT.cardPos.y, 8, H-bh-8); }
  else {
    const focusTop = focus && (focus.y + focus.h*0.5) < H*0.4;
    const cand = focusTop ? [H-bh-12, 44] : [44, H-bh-12];   // ordre préféré
    by = cand.reduce((best,y)=> ovArea(y) < ovArea(best)? y : best, cand[0]);
    by = clamp(by, 8, H-bh-8);
  }
  const cbx = TUT.cardPos ? clamp(TUT.cardPos.x, 8, W-bw-8) : bx;
  TUT.cardRect = {x:cbx, y:by, w:bw, h:bh};   // mémorisé pour le clic + le glisser
  const Bx = cbx;
  // (plus de flèche de guidage : seul le HALO autour de la cible indique où regarder)
  TUT.uiRects = [];
  // carte = NOTE DE TERRAIN sur papier (même identité que le menu) ; listing pour G·P·T
  paperPanel(Bx, by, bw, bh, pal, {tape:true, tapeX:0.5});
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
  ctx.font=uiF(pal,'head',12); ctx.fillStyle=pal.red;
  ctx.fillText(tutText({fr:'TUTORIEL',en:'TUTORIAL',es:'TUTORIAL',de:'TUTORIAL',it:'TUTORIAL',pt:'TUTORIAL',ru:'ОБУЧЕНИЕ',zh:'教程',ar:'الدرس التعليمي'}), Bx+pad, by+pad+8);
  // poignée de déplacement (indice visuel « glissez-moi ») au centre de l'en-tête
  ctx.fillStyle=rgbaC(pal.ink2,0.6); ctx.font=HF(10); ctx.textAlign='center';
  ctx.fillText('⠿', Bx+bw/2-14, by+pad+7);
  ctx.textAlign='left';
  // points de progression : resserrés s'il y a beaucoup d'étapes (ne chevauchent jamais la poignée ⠿)
  const dotN=TUT.steps.length, dgap=Math.min(6,(bw*0.5-26)/dotN), dr=Math.min(2.2,dgap*0.38), dtot=dotN*dgap;
  for(let i=0;i<dotN;i++){ ctx.beginPath(); ctx.arc(Bx+bw-pad-dtot+i*dgap, by+pad+4, dr, 0,6.283);
    ctx.fillStyle = i===TUT.i? pal.red : i<TUT.i? pal.ink2 : rgbaC(pal.ink2,0.25); ctx.fill(); }
  ctx.fillStyle=pal.ink; ctx.fillRect(Bx+pad, by+pad+titleH+1, bw-pad*2, 1.2);
  ctx.font=bodyF; ctx.fillStyle=pal.ink; let ty = by+pad+titleH+14;
  for (const ln of lines){ ctx.fillText(ln, Bx+pad, ty); ty += lineH; }
  if (objLine){
    // AIDE RENFORCÉE : l'objectif concis reçoit un surlignage qui pulse pour rappeler PRÉCISÉMENT
    // quoi faire — sans allonger le texte, juste plus visible.
    if (stuck>=1){ ctx.fillStyle=rgbaC(pal.red,(stuck>=2?0.20:0.10)*(0.6+0.4*pulse)); ctx.fillRect(Bx+pad-4,ty-12,bw-pad*2+8,17); }
    ctx.font=uiF(pal,'head',12); ctx.fillStyle=pal.ok; ctx.fillText('▸ '+objLine, Bx+pad, ty+2); ty += 18;
  }
  const byB = by + bh - pad - btnH, skipW = 118;
  ctx.textAlign='center';
  const skipTxt = tutText({fr:'Passer ✕',en:'Skip ✕',es:'Saltar ✕',de:'Überspringen ✕',it:'Salta ✕',pt:'Pular ✕',ru:'Пропустить ✕',zh:'跳过 ✕',ar:'تخطّ ✕'});
  ctx.fillStyle=pal.ink2; fitFont(skipTxt, skipW-14, uiF(pal,'type',12), 8);
  const sw = ctx.measureText(skipTxt).width;
  ctx.fillText(skipTxt, Bx+pad+skipW/2, byB+btnH/2+4);
  ctx.fillRect(Bx+pad+skipW/2-sw/2, byB+btnH/2+7, sw, 1);
  TUT.uiRects.push({key:'skip', x:Bx+pad, y:byB, w:skipW, h:btnH});
  if (step.tap){
    const contW = bw - pad*2 - skipW - 8;
    const contTxt = tutText({fr:'Continuer ▸',en:'Continue ▸',es:'Continuar ▸',de:'Weiter ▸',it:'Continua ▸',pt:'Continuar ▸',ru:'Далее ▸',zh:'继续 ▸',ar:'متابعة ▸'});
    inkStamp(Bx+bw-pad-contW, byB, contW, btnH, contTxt, pal, 14);
    TUT.uiRects.push({key:'cont', x:Bx+bw-pad-contW, y:byB, w:contW, h:btnH});
  } else {
    // AIDE RENFORCÉE (stuck>=2) : message plus direct et plus voyant au lieu du discret
    // « à vous de jouer » — remplace, ne s'ajoute pas, pour rester concis.
    const urge = TUT.t>6 ? 1 : 0.6;
    ctx.textAlign='right';
    const turnTxt = stuck>=2
      ? tutText({fr:'❗ touchez ce qui brille',en:'❗ tap the glowing spot',es:'❗ toca lo que brilla',de:'❗ tippe auf das Leuchtende',it:'❗ tocca ciò che brilla',pt:'❗ toque no que brilha',ru:'❗ нажмите на светящееся',zh:'❗ 点击发光的地方',ar:'❗ المس ما يتوهّج'})
      : tutText({fr:'▸ à vous de jouer',en:'▸ your turn',es:'▸ te toca a ti',de:'▸ du bist dran',it:'▸ tocca a te',pt:'▸ sua vez',ru:'▸ ваш ход',zh:'▸ 该你操作了',ar:'▸ دورك الآن'});
    ctx.fillStyle = stuck>=2? rgbaC(pal.red,0.7+0.3*pulse) : rgbaC(pal.ok, (0.55+0.45*pulse)*urge);
    fitFont(turnTxt, bw-pad*2-skipW-14, uiF(pal,'head',12), 8);
    ctx.fillText(turnTxt, Bx+bw-pad, byB+btnH/2+4);
  }
  ctx.textAlign='left';
  if (TUT.confirmSkip) drawTutConfirm();
}
function drawTutConfirm(){
  ctx.fillStyle='rgba(8,6,6,0.62)'; ctx.fillRect(0,0,W,H);
  const pal=uiPal(), bw=Math.min(460,W-40), bh=176, bx=(W-bw)/2, by=(H-bh)/2;
  paperPanel(bx, by, bw, bh, pal, {tape:true});
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.fillStyle=pal.ink; fitFont(tutText({fr:'Passer le tutoriel ?',en:'Skip the tutorial?',es:'¿Saltar el tutorial?',de:'Tutorial überspringen?',it:'Saltare il tutorial?',pt:'Pular o tutorial?',ru:'Пропустить обучение?',zh:'要跳过教程吗？',ar:'هل تريد تخطي الدرس التعليمي؟'}), bw-30, uiF(pal,'head',20), 12);
  ctx.fillText(tutText({fr:'Passer le tutoriel ?',en:'Skip the tutorial?',es:'¿Saltar el tutorial?',de:'Tutorial überspringen?',it:'Saltare il tutorial?',pt:'Pular o tutorial?',ru:'Пропустить обучение?',zh:'要跳过教程吗？',ar:'هل تريد تخطي الدرس التعليمي؟'}), W/2, by+38);
  const bodyF = uiF(pal,'type',12.5);
  ctx.font=bodyF; ctx.fillStyle=pal.ink2;
  const lines = tutWrap(tutText({fr:"Vous pourrez le relancer depuis l'onglet TUTORIEL du menu.",
                                 en:"You can restart it from the TUTORIAL tab in the menu.",
                                 es:"Podrás reiniciarlo desde la pestaña TUTORIAL del menú.",
                                 de:"Du kannst es jederzeit über den Reiter TUTORIAL im Menü neu starten.",
                                 it:"Potrai riavviarlo dalla scheda TUTORIAL del menu.",
                                 pt:"Você poderá reiniciá-lo na aba TUTORIAL do menu.",
                                 ru:"Вы сможете перезапустить его на вкладке ОБУЧЕНИЕ в меню.",
                                 zh:"你可以随时在菜单的「教程」标签页重新开始。",
                                 ar:"يمكنك إعادة تشغيله من تبويب الدرس التعليمي في القائمة."}), bw-50, bodyF);
  let ty = by+66; for (const ln of lines){ ctx.fillText(ln, W/2, ty); ty += 18; }
  const btnH=34, byB=by+bh-btnH-16, bwB=(bw-44)/2;
  const keepTxt = tutText({fr:'Continuer le tuto',en:'Keep playing',es:'Seguir con el tutorial',de:'Tutorial fortsetzen',it:'Continua il tutorial',pt:'Continuar o tutorial',ru:'Продолжить обучение',zh:'继续教程',ar:'متابعة الدرس التعليمي'});
  inkStamp(bx+16, byB, bwB, btnH, keepTxt, pal, 14);
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  const yesSkipTxt = tutText({fr:'Oui, passer',en:'Yes, skip',es:'Sí, saltar',de:'Ja, überspringen',it:'Sì, salta',pt:'Sim, pular',ru:'Да, пропустить',zh:'是的，跳过',ar:'نعم، تخطَّ'});
  ctx.fillStyle=pal.ink2; fitFont(yesSkipTxt, bwB-16, uiF(pal,'type',13), 9.5);
  const yw = ctx.measureText(yesSkipTxt).width;
  ctx.fillText(yesSkipTxt, bx+bw-16-bwB/2, byB+btnH/2+5);
  ctx.fillRect(bx+bw-16-bwB/2-yw/2, byB+btnH/2+8, yw, 1);
  ctx.textAlign='left';
  TUT.confirmRects = [ {key:'no', x:bx+16, y:byB, w:bwB, h:btnH},
                       {key:'yes', x:bx+bw-16-bwB, y:byB, w:bwB, h:btnH} ];
}
// clic sur les boutons de la carte du tuto (renvoie true si consommé) — appelé par 22-input.js
function tutHandleTap(sx, sy){
  if (!game || !game.tut || !TUT) return false;
  if (TUT.confirmSkip){
    for (const r of (TUT.confirmRects||[])) if (inRect(sx,sy,r)){
      if (r.key==='yes'){ sfx('sel'); endTutorial(); } else { sfx('sel'); TUT.confirmSkip=false; }
      return true;
    }
    return true;   // modal : rien d'autre n'est cliquable
  }
  for (const r of (TUT.uiRects||[])) if (inRect(sx,sy,r)){
    if (r.key==='skip'){ sfx('sel'); TUT.confirmSkip=true; }
    else if (r.key==='cont'){ sfx('sel'); tutBeginAct(); }
    return true;
  }
  // clic SUR la carte : étape d'info → valide ; étape d'action → simplement consommé
  // (pas de click-through vers le HUD/le monde sous la carte).
  const step = TUT.steps[TUT.i];
  if (TUT.cardRect && inRect(sx,sy,TUT.cardRect)){
    if (step && step.tap){ sfx('sel'); tutBeginAct(); }
    return true;
  }
  return false;   // sinon : le clic atteint le jeu normalement
}
// contenu de l'onglet TUTORIEL du menu
function refreshTutoPage(){
  const intro = document.getElementById('tutoIntro');
  if (intro) intro.innerHTML = tutText({
    fr:"<h3>APPRENEZ EN JOUANT</h3>Un tutoriel interactif vous guide pas à pas dans une vraie partie : économie, recrutement, contrôle des troupes, ordres, améliorations, pouvoirs, évolution et héros. Vous pouvez le quitter à tout moment.",
    en:"<h3>LEARN BY PLAYING</h3>An interactive tutorial guides you step by step through a real match: economy, recruitment, troop control, orders, upgrades, powers, evolution and hero. Leave anytime.",
    es:"<h3>APRENDE JUGANDO</h3>Un tutorial interactivo te guía paso a paso en una partida real: economía, reclutamiento, control de tropas, órdenes, mejoras, poderes, evolución y héroe. Puedes salir en cualquier momento.",
    de:"<h3>LERNEN DURCH SPIELEN</h3>Ein interaktives Tutorial führt dich Schritt für Schritt durch ein echtes Match: Wirtschaft, Rekrutierung, Truppensteuerung, Befehle, Verbesserungen, Fähigkeiten, Evolution und Held. Jederzeit verlassbar.",
    it:"<h3>IMPARA GIOCANDO</h3>Un tutorial interattivo ti guida passo dopo passo in una vera partita: economia, reclutamento, controllo delle truppe, ordini, potenziamenti, poteri, evoluzione ed eroe. Puoi uscire in qualsiasi momento.",
    pt:"<h3>APRENDA JOGANDO</h3>Um tutorial interativo guia você passo a passo em uma partida real: economia, recrutamento, controle de tropas, ordens, melhorias, poderes, evolução e herói. Você pode sair a qualquer momento.",
    ru:"<h3>УЧИТЕСЬ ИГРАЯ</h3>Интерактивное обучение проведёт вас шаг за шагом через настоящий матч: экономика, набор войск, управление, приказы, улучшения, способности, эволюция и герой. Выйти можно в любой момент.",
    zh:"<h3>边玩边学</h3>互动教程将在一局真实对战中一步步引导你：经济、招募、部队操控、命令、升级、能力、进化与英雄。你可以随时退出。",
    ar:"<h3>تعلّم باللعب</h3>يرشدك برنامج تعليمي تفاعلي خطوة بخطوة عبر مباراة حقيقية: الاقتصاد، التجنيد، التحكم بالقوات، الأوامر، الترقيات، القدرات، التطور والبطل. يمكنك الخروج في أي وقت."
  });
  const btn = document.getElementById('tutoStartBtn');
  if (btn) btn.textContent = tutText({fr:"COMMENCER LE TUTORIEL", en:"START THE TUTORIAL",es:"EMPEZAR EL TUTORIAL",de:"TUTORIAL STARTEN",it:"AVVIA IL TUTORIAL",pt:"COMEÇAR O TUTORIAL",ru:"НАЧАТЬ ОБУЧЕНИЕ",zh:"开始教程",ar:"ابدأ الدرس التعليمي"});
}
