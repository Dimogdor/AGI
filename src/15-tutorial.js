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
function tutEmptySlot(){ const p=game.p; return p.slots.find(s=>!s.b) || null; }
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
    text:{fr:"Bienvenue, commandant. Objectif : détruire la base ennemie à droite. En haut : vos ressources — 🌾 nourriture, 🪙 argent, 💧 eau.",
          en:"Welcome, commander. Goal: destroy the enemy base on the right. Top bar: your resources — 🌾 food, 🪙 money, 💧 water.",es:"Bienvenido, comandante. Objetivo: destruir la base enemiga a la derecha. Arriba: tus recursos — 🌾 comida, 🪙 dinero, 💧 agua.",de:"Willkommen, Kommandant. Ziel: die feindliche Basis rechts zerstören. Oben: deine Ressourcen — 🌾 Nahrung, 🪙 Geld, 💧 Wasser.",it:"Benvenuto, comandante. Obiettivo: distruggere la base nemica a destra. In alto: le tue risorse — 🌾 cibo, 🪙 denaro, 💧 acqua.",pt:"Bem-vindo, comandante. Objetivo: destruir a base inimiga à direita. No topo: seus recursos — 🌾 comida, 🪙 dinheiro, 💧 água.",ru:"Добро пожаловать, командир. Цель: уничтожить вражескую базу справа. Наверху — ваши ресурсы: 🌾 еда, 🪙 деньги, 💧 вода.",zh:"欢迎，指挥官。目标：摧毁右侧的敌方基地。顶部是你的资源——🌾 食物、🪙 金钱、💧 水。",ar:"مرحباً أيها القائد. الهدف: تدمير قاعدة العدو على اليمين. أعلى الشاشة: مواردك — 🌾 طعام، 🪙 مال، 💧 ماء."},
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
  { // 7 — sélection
    text:{fr:"Place au CONTRÔLE. Touchez l'une de vos unités sur le terrain pour la SÉLECTIONNER.",
          en:"Time for CONTROL. Tap one of your units on the field to SELECT it.",es:"Turno del CONTROL. Toca una de tus unidades en el terreno para SELECCIONARLA.",de:"Zeit für die STEUERUNG. Tippe auf eine deiner Einheiten im Feld, um sie AUSZUWÄHLEN.",it:"Tocca al CONTROLLO. Tocca una delle tue unità sul campo per SELEZIONARLA.",pt:"Hora do CONTROLE. Toque em uma de suas unidades no campo para SELECIONÁ-LA.",ru:"Время УПРАВЛЕНИЯ. Нажмите на одну из своих единиц на поле, чтобы ВЫДЕЛИТЬ её.",zh:"该学习操控了。点击场上的一个单位以选中它。",ar:"حان وقت التحكم. المس إحدى وحداتك في الميدان لتحديدها."},
    obj:{fr:"Sélectionnez une unité",en:"Select a unit",es:"Selecciona una unidad",de:"Wähle eine Einheit aus",it:"Seleziona un'unità",pt:"Selecione uma unidade",ru:"Выделите одну единицу",zh:"选中一个单位",ar:"حدّد وحدة"},
    enter:()=>{ camFollow=false; camX=0; game.p.stance='hold'; tutEnsureGround(2); game.sel.clear(); },
    focus:()=>{ const u=game.p.units.find(x=>!x.fly)||game.p.units[0]; return u? tutWorldRect(u.x):null; },
    done:()=>game.sel.size>=1,
  },
  { // 8 — lasso
    text:{fr:"Pour sélectionner TOUT un groupe : touchez ⬚ LASSO (surligné), puis tracez un rectangle autour de vos troupes.",
          en:"To select a WHOLE group: tap ⬚ LASSO (highlighted), then drag a box around your troops.",es:"Para seleccionar TODO un grupo: toca ⬚ LAZO (resaltado), luego traza un rectángulo alrededor de tus tropas.",de:"Um eine GANZE Gruppe auszuwählen: tippe auf ⬚ LASSO (markiert) und ziehe dann ein Rechteck um deine Truppen.",it:"Per selezionare un INTERO gruppo: tocca ⬚ LASSO (evidenziato), poi traccia un rettangolo attorno alle tue truppe.",pt:"Para selecionar um grupo INTEIRO: toque em ⬚ LASSO (destacado), depois desenhe um retângulo ao redor de suas tropas.",ru:"Чтобы выделить ЦЕЛУЮ группу: нажмите ⬚ ЛАССО (выделено), затем обведите прямоугольником свои войска.",zh:"要选中整个部队：点击高亮的 ⬚ 套索，然后拖拽画一个框圈住你的部队。",ar:"لتحديد مجموعة كاملة: المس ⬚ اللاسو (المضيء)، ثم ارسم مستطيلاً حول قواتك."},
    obj:{fr:"Sélectionnez un groupe au lasso",en:"Lasso-select a group",es:"Selecciona un grupo con el lazo",de:"Wähle eine Gruppe mit dem Lasso aus",it:"Seleziona un gruppo con il lasso",pt:"Selecione um grupo com o lasso",ru:"Выделите группу лассо",zh:"用套索选中一组单位",ar:"حدّد مجموعة باللاسو"},
    enter:()=>{ camFollow=false; camX=0; tutEnsureGround(3); game.sel.clear(); selMode=false; },
    focus:()=>tutHudRect(b=>b.type==='lasso'),
    allow:a=>a.t==='lasso',
    done:()=>game.sel.size>=2,
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
    text:{fr:"Donnez l'ordre ⚔ CHARGER (surligné) pour lancer vos troupes vers l'ennemi. ✋ Tenir et ↩ Replier complètent vos ordres.",
          en:"Give the ⚔ CHARGE order (highlighted) to send troops at the enemy. ✋ Hold and ↩ Retreat round out your orders.",es:"Da la orden ⚔ CARGAR (resaltada) para lanzar tus tropas contra el enemigo. ✋ Aguantar y ↩ Replegarse completan tus órdenes.",de:"Gib den Befehl ⚔ ANGREIFEN (markiert), um deine Truppen auf den Feind zu hetzen. ✋ Halten und ↩ Zurückziehen ergänzen deine Befehle.",it:"Dai l'ordine ⚔ CARICA (evidenziato) per lanciare le truppe contro il nemico. ✋ Tieni e ↩ Ripiega completano i tuoi ordini.",pt:"Dê a ordem ⚔ CARREGAR (destacada) para lançar suas tropas contra o inimigo. ✋ Segurar e ↩ Recuar completam suas ordens.",ru:"Отдайте приказ ⚔ В АТАКУ (выделено), чтобы бросить войска на врага. ✋ Держать и ↩ Отступить дополняют ваши приказы.",zh:"下达 ⚔ 冲锋 命令（高亮）派部队进攻敌人。✋ 坚守 和 ↩ 撤退 是另外两种可用命令。",ar:"أصدر أمر ⚔ الهجوم (المضيء) لإرسال قواتك نحو العدو. ✋ التمسّك و↩ التراجع يكمّلان أوامرك."},
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
    enter:()=>{ camFollow=false; camX=0; game.p.stance='hold'; tutEnsureGround(2); },
    focus:()=>null,
    done:()=>game.p.units.some(u=>u.ord==='point'),
  },
  { // 11 — amélioration de classe
    text:{fr:"Renforcez vos troupes : touchez le petit ⬆ dans le coin du bouton ⚔ MÊLÉE pour AMÉLIORER toute la classe (cumulable ×3).",
          en:"Strengthen your troops: tap the small ⬆ in the corner of the ⚔ MELEE button to UPGRADE the whole class (stacks ×3).",es:"Refuerza tus tropas: toca el pequeño ⬆ en la esquina del botón ⚔ CUERPO A CUERPO para MEJORAR toda la clase (acumulable ×3).",de:"Verstärke deine Truppen: tippe auf das kleine ⬆ in der Ecke des ⚔ NAHKAMPF-Buttons, um die ganze Klasse zu VERBESSERN (bis zu ×3 stapelbar).",it:"Rafforza le tue truppe: tocca il piccolo ⬆ nell'angolo del pulsante ⚔ CORPO A CORPO per MIGLIORARE l'intera classe (cumulabile ×3).",pt:"Reforce suas tropas: toque no pequeno ⬆ no canto do botão ⚔ CORPO A CORPO para MELHORAR toda a classe (acumula ×3).",ru:"Усильте войска: нажмите на маленькую ⬆ в углу кнопки ⚔ БЛИЖНИЙ БОЙ, чтобы УЛУЧШИТЬ весь класс (суммируется до ×3).",zh:"强化你的部队：点击 ⚔ 近战 按钮角落的小 ⬆ 图标，升级整个兵种（可叠加 ×3）。",ar:"عزّز قواتك: المس ⬆ الصغير في زاوية زر ⚔ القتال القريب لترقية الفئة بأكملها (قابل للتراكم ×3)."},
    obj:{fr:"Améliorez la classe mêlée (⬆)",en:"Upgrade the melee class (⬆)",es:"Mejora la clase cuerpo a cuerpo (⬆)",de:"Verbessere die Nahkampf-Klasse (⬆)",it:"Migliora la classe corpo a corpo (⬆)",pt:"Melhore a classe corpo a corpo (⬆)",ru:"Улучшите класс ближнего боя (⬆)",zh:"升级近战兵种（⬆）",ar:"طوّر فئة القتال القريب (⬆)"},
    enter:()=>{ tutGrant(600,1200,250); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='unit'&&b.i===0),
    allow:a=>a.t==='upg'||(a.t==='buy'&&a.i===0),
    done:()=>(game.p.upg.melee||0)>=1,
  },
  { // 12 — capacité d'armée
    text:{fr:"Investissez : touchez 📈 CAPACITÉ pour augmenter le nombre maximum d'unités de votre armée.",
          en:"Invest: tap 📈 CAPACITY to raise your army's maximum unit count.",es:"Invierte: toca 📈 CAPACIDAD para aumentar el número máximo de unidades de tu ejército.",de:"Investiere: tippe auf 📈 KAPAZITÄT, um die maximale Einheitenzahl deiner Armee zu erhöhen.",it:"Investi: tocca 📈 CAPACITÀ per aumentare il numero massimo di unità del tuo esercito.",pt:"Invista: toque em 📈 CAPACIDADE para aumentar o número máximo de unidades do seu exército.",ru:"Инвестируйте: нажмите 📈 ВМЕСТИМОСТЬ, чтобы увеличить максимум юнитов в армии.",zh:"进行投资：点击 📈 容量 以提升军队的最大单位上限。",ar:"استثمر: المس 📈 السعة لزيادة الحد الأقصى لعدد وحدات جيشك."},
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
    text:{fr:"🛡 Une BARRIÈRE d'énergie bloque le front au milieu de la carte : vos troupes ne peuvent pas avancer pour l'instant. Profitez-en pour FORTIFIER cette ligne. Le combat est automatique : mêlée devant, tireurs derrière.",
          en:"🛡 An energy BARRIER blocks the front at mid-map: your troops can't advance yet. Use this time to FORTIFY the line. Combat is automatic: melee in front, ranged behind.",es:"🛡 Una BARRERA de energía bloquea el frente en medio del mapa: tus tropas no pueden avanzar por ahora. Aprovecha para FORTIFICAR esta línea. El combate es automático: cuerpo a cuerpo delante, tiradores detrás.",de:"🛡 Eine Energie-BARRIERE blockiert die Front in der Kartenmitte: deine Truppen können vorerst nicht vorrücken. Nutze die Zeit, um diese Linie zu BEFESTIGEN. Der Kampf läuft automatisch: Nahkampf vorne, Fernkampf hinten.",it:"🛡 Una BARRIERA di energia blocca il fronte a metà mappa: le tue truppe non possono avanzare per ora. Approfittane per FORTIFICARE questa linea. Il combattimento è automatico: corpo a corpo davanti, tiratori dietro.",pt:"🛡 Uma BARREIRA de energia bloqueia a frente no meio do mapa: suas tropas não podem avançar por enquanto. Aproveite para FORTIFICAR essa linha. O combate é automático: corpo a corpo na frente, atiradores atrás.",ru:"🛡 Энергетический БАРЬЕР блокирует фронт в центре карты: войска пока не могут продвинуться. Используйте это время, чтобы УКРЕПИТЬ линию. Бой идёт автоматически: ближний бой впереди, стрелки сзади.",zh:"🛡 一道能量屏障阻挡了地图中央的战线：你的部队暂时无法前进。趁此机会加固这条防线。战斗是自动进行的：近战在前，射手在后。",ar:"🛡 حاجز طاقة يوقف الجبهة في منتصف الخريطة: لا يمكن لقواتك التقدم الآن. استغل الوقت لتحصين هذا الخط. القتال تلقائي: القتال القريب أمامًا، الرماة خلفًا."},
    enter:()=>{ camFollow=false; tutCam(game.tutBarrier); },
    focus:()=>null,
  },
  { // 14 — muraille (sur la ligne de front, au milieu de la carte)
    text:{fr:"🧱 Bâtissez une MURAILLE sur le socle surligné, sur la ligne de front. Solide, elle encaisse les coups à la place de vos troupes.",
          en:"🧱 Build a WALL on the highlighted pad, on the front line. Sturdy, it takes hits instead of your troops.",es:"🧱 Construye una MURALLA en el socle resaltado, en la línea de frente. Sólida, aguanta los golpes en lugar de tus tropas.",de:"🧱 Baue eine MAUER auf dem markierten Feld an der Frontlinie. Robust, sie hält Treffer statt deiner Truppen aus.",it:"🧱 Costruisci un MURO sulla piastra evidenziata, sulla linea del fronte. Solido, incassa i colpi al posto delle tue truppe.",pt:"🧱 Construa uma MURALHA no espaço destacado, na linha de frente. Sólida, ela aguenta os golpes no lugar de suas tropas.",ru:"🧱 Постройте СТЕНУ на выделенном слоте, на линии фронта. Прочная, она принимает удары вместо ваших войск.",zh:"🧱 在前线高亮地块建造一座城墙。坚固的城墙会替你的部队承受打击。",ar:"🧱 ابنِ سوراً في اللوحة المضيئة، على خط الجبهة. متين، يمتصّ الضربات بدلاً من قواتك."},
    obj:{fr:"Construisez une muraille (ligne de front)",en:"Build a wall (front line)",es:"Construye una muralla (línea de frente)",de:"Baue eine Mauer (Frontlinie)",it:"Costruisci un muro (linea del fronte)",pt:"Construa uma muralha (linha de frente)",ru:"Постройте стену (на линии фронта)",zh:"建造一座城墙（前线）",ar:"ابنِ سوراً (على الجبهة)"},
    enter:()=>{ tutGrant(400,400,200); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='wall',
    done:()=>tutHasBuild('wall'),
  },
  { // 15 — tourelle
    text:{fr:"🗼 Ajoutez une TOURELLE sur le socle surligné : elle tire automatiquement sur tout ennemi à portée.",
          en:"🗼 Add a TURRET on the highlighted pad: it automatically fires at any enemy in range.",es:"🗼 Añade una TORRETA en el socle resaltado: dispara automáticamente a cualquier enemigo a su alcance.",de:"🗼 Baue einen TURM auf dem markierten Feld: er feuert automatisch auf jeden Feind in Reichweite.",it:"🗼 Aggiungi una TORRETTA sulla piastra evidenziata: spara automaticamente a ogni nemico a portata.",pt:"🗼 Adicione uma TORRETA no espaço destacado: ela atira automaticamente em qualquer inimigo ao alcance.",ru:"🗼 Постройте БАШНЮ на выделенном слоте: она автоматически стреляет по любому врагу в радиусе действия.",zh:"🗼 在高亮地块建造一座炮塔：它会自动攻击射程内的任何敌人。",ar:"🗼 أضف برجاً في اللوحة المضيئة: يطلق النار تلقائياً على أي عدو في مداه."},
    obj:{fr:"Construisez une tourelle",en:"Build a turret",es:"Construye una torreta",de:"Baue einen Turm",it:"Costruisci una torretta",pt:"Construa uma torreta",ru:"Постройте башню",zh:"建造一座炮塔",ar:"ابنِ برجاً"},
    enter:()=>{ tutGrant(400,500,200); const s=tutEmptySlot(); if(s)tutCam(s.x); },
    focus:()=>{ const s=tutEmptySlot(); return s? tutWorldRect(s.x):null; },
    allow:a=>a.t==='build'&&a.type==='turret',
    done:()=>tutHasBuild('turret'),
  },
  { // 16 — garnison (ACTION, monde vivant : le tireur marche jusqu'au bâtiment)
    text:{fr:"🚪 GARNISON : touchez votre tour ou muraille, puis « Garnison (tireur) ». Un tireur ira s'y abriter — perché et protégé, il tire de plus loin et survit bien mieux.",
          en:"🚪 GARRISON: tap your turret or wall, then \"Garrison (shooter)\". A shooter will take cover inside — elevated and protected, it shoots farther and survives much longer.",es:"🚪 GUARNICIÓN: toca tu torre o muralla, luego « Guarnición (tirador) ». Un tirador se refugiará dentro — en alto y protegido, dispara más lejos y sobrevive mucho más.",de:"🚪 GARNISON: tippe auf deinen Turm oder deine Mauer, dann „Garnison (Schütze)“. Ein Schütze nimmt dort Stellung — erhöht und geschützt schießt er weiter und überlebt viel länger.",it:"🚪 GUARNIGIONE: tocca la tua torre o il tuo muro, poi « Guarnigione (tiratore) ». Un tiratore si rifugerà lì dentro — elevato e protetto, spara più lontano e sopravvive molto meglio.",pt:"🚪 GUARNIÇÃO: toque na sua torre ou muralha, depois « Guarnição (atirador) ». Um atirador vai se abrigar lá dentro — elevado e protegido, atira mais longe e sobrevive muito mais.",ru:"🚪 ГАРНИЗОН: нажмите на свою башню или стену, затем «Гарнизон (стрелок)». Стрелок укроется внутри — приподнятый и защищённый, он стреляет дальше и выживает намного лучше.",zh:"🚪 驻防：点击你的塔楼或城墙，然后选择「驻防（射手）」。一名射手会进驻其中——居高临下且受到保护，射程更远，存活率更高。",ar:"🚪 الحامية: المس برجك أو سورك، ثم « حامية (رامٍ) ». سيحتمي رامٍ بالداخل — مرتفعاً ومحمياً، يطلق النار من مسافة أبعد وينجو لفترة أطول."},
    obj:{fr:"Garnissez une tour ou une muraille",en:"Garrison a turret or wall",es:"Guarnece una torre o muralla",de:"Bemanne einen Turm oder eine Mauer",it:"Guarnisci una torre o un muro",pt:"Guarneça uma torre ou muralha",ru:"Разместите гарнизон в башне или стене",zh:"为塔楼或城墙驻防",ar:"ضع حامية في برج أو سور"},
    enter:()=>{ for (const s of sideBuildSlots(game.p)) if (s.b && (s.b.type==='turret'||s.b.type==='wall')){ tutCam(s.x); break; } },
    focus:()=>{ for (const s of sideBuildSlots(game.p)) if (s.b && (s.b.type==='turret'||s.b.type==='wall')) return tutWorldRect(s.x); return null; },
    done:()=>sideBuildSlots(game.p).some(s=>s.b && s.b.gar && s.b.gar.length>0),
  },
  { // 17 — la vague ! (combat réel — la barrière tient, l'ennemi vient de droite)
    text:{fr:"⚠ Une vague ennemie attaque la LIGNE depuis la droite ! Tenez : muraille, tourelle, garnison et troupes vont la repousser. Regardez le combat.",
          en:"⚠ An enemy wave attacks the LINE from the right! Hold: wall, turret, garrison and troops will repel it. Watch the fight.",es:"⚠ ¡Una oleada enemiga ataca la LÍNEA desde la derecha! Aguanta: muralla, torreta, guarnición y tropas la repelerán. Observa el combate.",de:"⚠ Eine feindliche Welle greift die LINIE von rechts an! Halte stand: Mauer, Turm, Garnison und Truppen werden sie zurückschlagen. Beobachte den Kampf.",it:"⚠ Un'ondata nemica attacca la LINEA da destra! Tieni duro: muro, torretta, guarnigione e truppe la respingeranno. Osserva il combattimento.",pt:"⚠ Uma onda inimiga ataca a LINHA pela direita! Aguente: muralha, torreta, guarnição e tropas vão repeli-la. Observe o combate.",ru:"⚠ Вражеская волна атакует ЛИНИЮ справа! Держитесь: стена, башня, гарнизон и войска отразят её. Наблюдайте за боем.",zh:"⚠ 敌方部队从右侧发起进攻！坚守防线：城墙、炮塔、驻军和部队会击退他们。观看这场战斗吧。",ar:"⚠ موجة عدو تهاجم الخط من اليمين! اصمد: السور والبرج والحامية والقوات ستصدّها. راقب المعركة."},
    obj:{fr:"Repoussez la vague ennemie",en:"Repel the enemy wave",es:"Repele la oleada enemiga",de:"Schlage die feindliche Welle zurück",it:"Respingi l'ondata nemica",pt:"Repila a onda inimiga",ru:"Отразите вражескую волну",zh:"击退敌方进攻",ar:"صدّ موجة العدو"},
    enter:()=>{ tutSpawnWave(); game.shake=6; sfx('boom'); game.p.stance='hold'; camFollow=false; tutCam(game.tutBarrier);
      announce(tutText({fr:'⚠ VAGUE ENNEMIE',en:'⚠ ENEMY WAVE',es:'⚠ OLEADA ENEMIGA',de:'⚠ FEINDLICHE WELLE',it:'⚠ ONDATA NEMICA',pt:'⚠ ONDA INIMIGA',ru:'⚠ ВРАЖЕСКАЯ ВОЛНА',zh:'⚠ 敌军来袭',ar:'⚠ موجة العدو'}), '#ff5a4a'); },
    focus:()=>null,
    done:()=>game.e.units.length===0,
  },
  { // 18 — expérience (info)
    tap:true,
    text:{fr:"✦ L'EXPÉRIENCE se gagne en combattant, en tenant les zones ◈ et les lacs 💧, et en fortifiant votre base. Elle alimente vos pouvoirs et vos évolutions — votre moteur de progression.",
          en:"✦ EXPERIENCE comes from fighting, holding zones ◈ and lakes 💧, and fortifying your base. It powers your abilities and evolutions — your engine of progression.",es:"✦ La EXPERIENCIA se gana combatiendo, controlando las zonas ◈ y los lagos 💧, y fortificando tu base. Alimenta tus poderes y evoluciones — tu motor de progreso.",de:"✦ ERFAHRUNG erhältst du durch Kämpfen, das Halten von Zonen ◈ und Seen 💧 sowie durch die Befestigung deiner Basis. Sie treibt deine Fähigkeiten und Entwicklungen an — dein Fortschrittsmotor.",it:"✦ L'ESPERIENZA si guadagna combattendo, tenendo le zone ◈ e i laghi 💧, e fortificando la tua base. Alimenta i tuoi poteri e le tue evoluzioni — il tuo motore di progressione.",pt:"✦ A EXPERIÊNCIA é ganha combatendo, controlando zonas ◈ e lagos 💧, e fortificando sua base. Ela alimenta seus poderes e evoluções — seu motor de progresso.",ru:"✦ ОПЫТ зарабатывается в боях, удержанием зон ◈ и озёр 💧, а также укреплением базы. Он питает ваши способности и эволюции — двигатель вашего развития.",zh:"✦ 经验值 通过战斗、占领 ◈ 区域与 💧 湖泊，以及加固基地来获得。它是你的能力与进化的动力源泉。",ar:"✦ الخبرة تُكتسب بالقتال، والسيطرة على المناطق ◈ والبحيرات 💧، وتحصين قاعدتك. تغذّي قدراتك وتطوراتك — محرك تقدمك."},
    enter:()=>{ camFollow=false; camX=0; },
    focus:()=>({x:248,y:6,w:120,h:34}),   // compteur ✦ dans le bandeau du haut
  },
  { // 19 — pouvoir ultime
    text:{fr:"Votre POUVOIR ULTIME ✸ est alimenté par l'✦. Il est prêt : lancez-le (bouton surligné).",
          en:"Your ULTIMATE ✸ is powered by ✦. It's ready: unleash it (highlighted button).",es:"Tu PODER DEFINITIVO ✸ se alimenta de ✦. Está listo: úsalo (botón resaltado).",de:"Deine ULTIMATIVE FÄHIGKEIT ✸ wird von ✦ gespeist. Sie ist bereit: setze sie ein (markierter Button).",it:"La tua ABILITÀ SUPREMA ✸ è alimentata da ✦. È pronta: usala (pulsante evidenziato).",pt:"Sua HABILIDADE SUPREMA ✸ é alimentada por ✦. Está pronta: use-a (botão destacado).",ru:"Ваша КОРОННАЯ СПОСОБНОСТЬ ✸ питается очками ✦. Она готова: примените её (выделенная кнопка).",zh:"你的 ✸ 大招 由 ✦ 提供能量。现已就绪：使用它吧（高亮按钮）。",ar:"مهارتك القصوى ✸ تُغذّى بـ✦. إنها جاهزة: استخدمها (الزر المضيء)."},
    obj:{fr:"Lancez votre pouvoir ultime",en:"Unleash your ultimate",es:"Usa tu poder definitivo",de:"Setze deine ultimative Fähigkeit ein",it:"Usa la tua abilità suprema",pt:"Use sua habilidade suprema",ru:"Примените коронную способность",zh:"使用你的大招",ar:"استخدم مهارتك القصوى"},
    enter:()=>{ const p=game.p; p.specialCd=0; p.xp=Math.max(p.xp, specialXpCost(p)+30); TUT.specBase=game.specialsUsed; camFollow=true; },
    focus:()=>tutHudRect(b=>b.type==='special'),
    allow:a=>a.t==='special',
    done:()=>game.specialsUsed>(TUT.specBase||0),
  },
  { // 20 — évolution d'ère
    text:{fr:"L'✦ permet aussi d'ÉVOLUER : changer d'ère rend TOUTES vos forces plus puissantes et débloque de nouvelles unités. Touchez ⚡ ÉVOLUER.",
          en:"✦ also lets you EVOLVE: advancing an era makes ALL your forces stronger and unlocks new units. Tap ⚡ EVOLVE.",es:"✦ también permite EVOLUCIONAR: cambiar de era hace TODAS tus fuerzas más poderosas y desbloquea nuevas unidades. Toca ⚡ EVOLUCIONAR.",de:"✦ erlaubt auch die EVOLUTION: ein Zeitalterwechsel macht ALLE deine Kräfte stärker und schaltet neue Einheiten frei. Tippe auf ⚡ ENTWICKELN.",it:"✦ permette anche di EVOLVERE: cambiare era rende TUTTE le tue forze più potenti e sblocca nuove unità. Tocca ⚡ EVOLVI.",pt:"✦ também permite EVOLUIR: mudar de era torna TODAS as suas forças mais poderosas e desbloqueia novas unidades. Toque em ⚡ EVOLUIR.",ru:"✦ также позволяет ЭВОЛЮЦИОНИРОВАТЬ: смена эпохи делает ВСЕ ваши силы мощнее и открывает новые юниты. Нажмите ⚡ ЭВОЛЮЦИЯ.",zh:"✦ 还能让你 进化：跨入新纪元会让你的所有兵力更加强大，并解锁新单位。点击 ⚡ 进化。",ar:"✦ يتيح أيضاً التطوّر: تغيير الحقبة يجعل كل قواك أقوى ويفتح وحدات جديدة. المس ⚡ تطوّر."},
    obj:{fr:"Évoluez vers l'ère suivante",en:"Evolve to the next era",es:"Evoluciona a la siguiente era",de:"Entwickle dich zum nächsten Zeitalter",it:"Evolvi alla prossima era",pt:"Evolua para a próxima era",ru:"Перейдите в следующую эпоху",zh:"进化到下一纪元",ar:"تطوّر إلى الحقبة التالية"},
    enter:()=>{ const p=game.p; TUT.eraBase=p.era; p.xp=Math.max(p.xp, EVOLVE_XP[Math.min(p.era+1,4)]+30); camFollow=false; camX=0; },
    focus:()=>tutHudRect(b=>b.type==='evolve'),
    allow:a=>a.t==='evolve',
    done:()=>game.p.era>(TUT.eraBase||0),
  },
  { // 21 — fortifier la base
    text:{fr:"Votre BASE aussi s'améliore : touchez-la, puis « Fortifier » — plus de points de vie ET plus d'✦ passif. Pensez aussi à la réparer en cours de partie.",
          en:"Your BASE upgrades too: tap it, then \"Fortify\" — more HP AND more passive ✦. Remember to repair it mid-game too.",es:"Tu BASE también mejora: tócala, luego « Fortificar » — más puntos de vida Y más ✦ pasivo. Recuerda también repararla durante la partida.",de:"Auch deine BASIS wird besser: tippe darauf, dann „Befestigen“ — mehr Lebenspunkte UND mehr passives ✦. Denk daran, sie auch während des Spiels zu reparieren.",it:"Anche la tua BASE migliora: toccala, poi « Fortifica » — più punti vita E più ✦ passivo. Ricordati anche di ripararla durante la partita.",pt:"Sua BASE também melhora: toque nela, depois « Fortificar » — mais pontos de vida E mais ✦ passivo. Lembre-se também de repará-la durante a partida.",ru:"Ваша БАЗА тоже улучшается: коснитесь её, затем «Укрепить» — больше очков здоровья И больше пассивного ✦. Не забывайте также чинить её по ходу игры.",zh:"你的 基地 也能升级：点击基地，然后选择「加固」——获得更多生命值以及更多被动 ✦。记得在游戏过程中也要修复它。",ar:"قاعدتك تتحسّن أيضاً: المسها، ثم « تحصين » — المزيد من نقاط الحياة وا لمزيد من ✦ السلبية. تذكّر أيضاً إصلاحها أثناء اللعب."},
    obj:{fr:"Fortifiez votre base",en:"Fortify your base",es:"Fortifica tu base",de:"Befestige deine Basis",it:"Fortifica la tua base",pt:"Fortifique sua base",ru:"Укрепите базу",zh:"加固你的基地",ar:"حصّن قاعدتك"},
    enter:()=>{ const p=game.p; TUT.fortBase=(p.fortLvl||1); tutGrant(700,700,200); camFollow=false; tutCam(p.x); },
    focus:()=>tutWorldRect(game.p.x),
    done:()=>(game.p.fortLvl||1)>(TUT.fortBase||1),
  },
  { // 22 — héros
    text:{fr:"Une fois par partie, invoquez votre 🦸 HÉROS légendaire : il décuple la force de toute votre armée tant qu'il vit.",
          en:"Once per game, summon your 🦸 legendary HERO: he massively boosts your whole army while alive.",es:"Una vez por partida, invoca a tu 🦸 HÉROE legendario: multiplica la fuerza de todo tu ejército mientras viva.",de:"Einmal pro Partie kannst du deinen legendären 🦸 HELDEN beschwören: er vervielfacht die Stärke deiner gesamten Armee, solange er lebt.",it:"Una volta per partita, evoca il tuo 🦸 EROE leggendario: moltiplica la forza di tutto il tuo esercito finché è in vita.",pt:"Uma vez por partida, invoque seu 🦸 HERÓI lendário: ele multiplica a força de todo o seu exército enquanto estiver vivo.",ru:"Раз за игру вы можете призвать легендарного 🦸 ГЕРОЯ: пока он жив, сила всей вашей армии многократно возрастает.",zh:"每局游戏可召唤一次你的传奇 🦸 英雄：只要他存活，你全军的战力都会大幅提升。",ar:"مرة واحدة في كل مباراة، استدعِ 🦸 بطلك الأسطوري: يضاعف قوة جيشك بأكمله طالما بقي حياً."},
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
    text:{fr:"⚔ La BARRIÈRE TOMBE ! La voie est libre. Ordonnez la CHARGE et menez votre armée détruire la base ennemie !",
          en:"⚔ The BARRIER FALLS! The path is open. Order the CHARGE and lead your army to destroy the enemy base!",es:"⚔ ¡La BARRERA CAE! El camino está libre. Ordena la CARGA y lleva a tu ejército a destruir la base enemiga!",de:"⚔ Die BARRIERE FÄLLT! Der Weg ist frei. Befiehl den ANGRIFF und führe deine Armee zur Zerstörung der feindlichen Basis!",it:"⚔ La BARRIERA CADE! La strada è libera. Ordina la CARICA e guida il tuo esercito a distruggere la base nemica!",pt:"⚔ A BARREIRA CAI! O caminho está livre. Ordene o ATAQUE e leve seu exército para destruir a base inimiga!",ru:"⚔ БАРЬЕР ПАДАЕТ! Путь свободен. Отдайте приказ В АТАКУ и ведите армию уничтожать вражескую базу!",zh:"⚔ 屏障已破！道路已开。下达 冲锋 命令，率领你的军队摧毁敌方基地！",ar:"⚔ الحاجز يسقط! الطريق مفتوح الآن. أصدر أمر الهجوم وقُد جيشك لتدمير قاعدة العدو!"},
    obj:{fr:"Détruisez la base ennemie",en:"Destroy the enemy base",es:"Destruye la base enemiga",de:"Zerstöre die feindliche Basis",it:"Distruggi la base nemica",pt:"Destrua a base inimiga",ru:"Уничтожьте вражескую базу",zh:"摧毁敌方基地",ar:"دمّر قاعدة العدو"},
    enter:()=>{ const e=game.e; game.tutBarrier=null;        // libère la carte
      e.hp=e.maxhp=600; e.stance='hold'; game.p.stance='charge'; camFollow=true;
      announce(tutText({fr:'🛡 BARRIÈRE TOMBÉE — À L\'ASSAUT !',en:'🛡 BARRIER DOWN — CHARGE!',es:'🛡 ¡BARRERA CAÍDA — AL ASALTO!',de:'🛡 BARRIERE GEFALLEN — ANGRIFF!',it:'🛡 BARRIERA CADUTA — ALL\'ASSALTO!',pt:'🛡 BARREIRA CAÍDA — AO ATAQUE!',ru:'🛡 БАРЬЕР ПАЛ — В АТАКУ!',zh:'🛡 屏障已破 — 冲锋！',ar:'🛡 سقط الحاجز — إلى الهجوم!'}), '#9dd88a'); },
    focus:()=>tutHudRect(b=>b.type==='stance'&&b.st==='charge'),
    allow:a=>a.t==='stance',
    done:()=>game.e.hp<=0,
  },
  { // 24 — fin
    tap:true,
    text:{fr:"🎉 Victoire ! Tutoriel terminé : économie, armée, contrôle, défense, garnisons, expérience, pouvoirs, évolution, base et héros — tout est à vous. Bonne guerre, commandant !",
          en:"🎉 Victory! Tutorial complete: economy, army, control, defense, garrisons, experience, powers, evolution, base and hero — it's all yours. Good war, commander!",es:"🎉 ¡Victoria! Tutorial completado: economía, ejército, control, defensa, guarniciones, experiencia, poderes, evolución, base y héroe — todo es tuyo. ¡Buena guerra, comandante!",de:"🎉 Sieg! Tutorial abgeschlossen: Wirtschaft, Armee, Steuerung, Verteidigung, Garnisonen, Erfahrung, Fähigkeiten, Evolution, Basis und Held — alles gehört jetzt dir. Guten Krieg, Kommandant!",it:"🎉 Vittoria! Tutorial completato: economia, esercito, controllo, difesa, guarnigioni, esperienza, poteri, evoluzione, base ed eroe — tutto è tuo. Buona guerra, comandante!",pt:"🎉 Vitória! Tutorial concluído: economia, exército, controle, defesa, guarnições, experiência, poderes, evolução, base e herói — tudo é seu. Boa guerra, comandante!",ru:"🎉 Победа! Обучение завершено: экономика, армия, управление, оборона, гарнизоны, опыт, способности, эволюция, база и герой — теперь всё в ваших руках. Удачной войны, командир!",zh:"🎉 胜利！教程已完成：经济、军队、操控、防御、驻防、经验、能力、进化、基地与英雄——全部都已掌握。祝你征战顺利，指挥官！",ar:"🎉 النصر! اكتمل البرنامج التعليمي: الاقتصاد، الجيش، التحكم، الدفاع، الحاميات، الخبرة، القدرات، التطور، القاعدة والبطل — كل ذلك أصبح ملكك الآن. حرباً موفقة أيها القائد!"},
    enter:()=>{ camFollow=false; camX=0; game.flash=0.6; sfx('evolve'); },
    focus:()=>null,
  },
];
// mini-vague ennemie scriptée : 3 unités surgissent À DROITE de la barrière et chargent la ligne
function tutSpawnWave(){
  const e = game.e, x = (game.tutBarrier!=null? game.tutBarrier : game.p.x+1150) + 440;
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
  p.stance = 'hold'; e.stance = 'hold';
  e.hp = e.maxhp = 9e9;              // base ennemie inattaquable (jusqu'à l'assaut final)
  // BARRIÈRE : bloque le front au milieu de la carte — les troupes du joueur ne la franchissent
  // pas tant qu'elle n'est pas levée (assaut final). Évite que les unités filent trop loin.
  // Placée NETTEMENT en avant des socles : les unités se massent contre la barrière, donc bien
  // à droite des socles de défense, qui restent ainsi dégagés et faciles à toucher.
  const barrierX = p.x + 1300;
  game.tutBarrier = barrierX;
  // 2 socles de DÉFENSE en arrière de la barrière (muraille + tourelle) — l'ennemi n'étant pas
  // bloqué par la barrière, il vient jusqu'à eux : la tourelle aura toujours des cibles à portée.
  p.slots.push({ x: barrierX - 295, b:null, owner:null });
  p.slots.push({ x: barrierX - 235, b:null, owner:null });
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
  // enter() de toutes les étapes sont idempotents (tutGrant utilise Math.max, tutCam recentre
  // sans effet de bord). Le halo devient aussi bien plus visible, voir drawTut().
  if (!step.tap && !TUT.reentered && TUT.t>20 && step.enter){ TUT.reentered = true; step.enter(); }
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
function tutBtnHidden(b){            // true = masquer (jamais enseigné)
  if (!game || !game.tut || !TUT) return false;
  const step = TUT.steps[TUT.i], desc = tutDesc(b);
  if (step && step.allow && step.allow(desc)) return false;     // bouton de l'étape
  if (TUT.revealed.some(p => p(desc))) return false;            // déjà enseigné
  return true;
}
function tutBtnDim(b){               // true = afficher grisé (acquis, pas l'étape courante)
  if (!game || !game.tut || !TUT) return false;
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
  return (step && step.allow && step.allow(d)) || TUT.revealed.some(p => p(d));
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
  const bw = Math.min(326, W-24), pad = 11, titleH = 13, lineH = 16, btnH = 28;
  const lines = tutWrap(tutText(step.text), bw-pad*2, '12px Arial');
  const objLine = step.obj ? tutText(step.obj) : null;
  const bh = pad + titleH + 8 + lines.length*lineH + 6 + btnH + pad + (objLine?18:0);
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
  ctx.save(); ctx.shadowColor='rgba(0,0,0,0.45)'; ctx.shadowBlur=16; ctx.shadowOffsetY=4;
  const pg=ctx.createLinearGradient(Bx,by,Bx,by+bh); pg.addColorStop(0,'rgba(26,22,30,0.93)'); pg.addColorStop(1,'rgba(14,12,18,0.93)');
  ctx.fillStyle=pg; rr(Bx,by,bw,bh,11); ctx.fill(); ctx.restore();
  ctx.save(); ctx.strokeStyle=rgbaC(acc,0.9); ctx.lineWidth=1.8; ctx.shadowColor=acc; ctx.shadowBlur=7; rr(Bx,by,bw,bh,11); ctx.stroke(); ctx.restore();
  ctx.textBaseline='alphabetic'; ctx.textAlign='left';
  ctx.font='700 10px Arial'; ctx.fillStyle=acc;
  ctx.fillText('✦ '+tutText({fr:'TUTORIEL',en:'TUTORIAL',es:'TUTORIAL',de:'TUTORIAL',it:'TUTORIAL',pt:'TUTORIAL',ru:'ОБУЧЕНИЕ',zh:'教程',ar:'الدرس التعليمي'}), Bx+pad, by+pad+7);
  // poignée de déplacement (indice visuel « glissez-moi ») au centre de l'en-tête
  ctx.fillStyle=rgbaC(acc,0.5); ctx.font='10px Arial'; ctx.textAlign='center';
  ctx.fillText('⠿', Bx+bw/2-14, by+pad+7);
  ctx.textAlign='left';
  const dotN=TUT.steps.length, dr=2.2, dgap=6, dtot=dotN*dgap;
  for(let i=0;i<dotN;i++){ ctx.beginPath(); ctx.arc(Bx+bw-pad-dtot+i*dgap, by+pad+4, dr, 0,6.283);
    ctx.fillStyle = i===TUT.i? acc : 'rgba(255,255,255,0.22)'; ctx.fill(); }
  ctx.font='12px Arial'; ctx.fillStyle='#ece6da'; let ty = by+pad+titleH+10;
  for (const ln of lines){ ctx.fillText(ln, Bx+pad, ty); ty += lineH; }
  if (objLine){
    // AIDE RENFORCÉE : l'objectif concis reçoit un fond qui pulse pour rappeler PRÉCISÉMENT
    // quoi faire — sans allonger le texte, juste plus visible.
    if (stuck>=1){ ctx.fillStyle=rgbaC('#9dd88a',(stuck>=2?0.22:0.12)*(0.6+0.4*pulse)); rr(Bx+pad-4,ty-12,bw-pad*2+8,17,4); ctx.fill(); }
    ctx.font='700 11px Arial'; ctx.fillStyle='#9dd88a'; ctx.fillText('▸ '+objLine, Bx+pad, ty+2); ty += 18;
  }
  const byB = by + bh - pad - btnH, skipW = 124;
  ctx.fillStyle='rgba(255,255,255,0.08)'; rr(Bx+pad, byB, skipW, btnH, 6); ctx.fill();
  ctx.fillStyle='#d8a0a0'; ctx.textAlign='center';
  const skipTxt = tutText({fr:'Passer ✕',en:'Skip ✕',es:'Saltar ✕',de:'Überspringen ✕',it:'Salta ✕',pt:'Pular ✕',ru:'Пропустить ✕',zh:'跳过 ✕',ar:'تخطّ ✕'});
  fitFont(skipTxt, skipW-14, '700 11px Arial', 8);
  ctx.fillText(skipTxt, Bx+pad+skipW/2, byB+btnH/2+4);
  TUT.uiRects.push({key:'skip', x:Bx+pad, y:byB, w:skipW, h:btnH});
  if (step.tap){
    const contW = bw - pad*2 - skipW - 8;
    ctx.save(); ctx.fillStyle=rgbaC(acc,0.95); ctx.shadowColor=acc; ctx.shadowBlur=9; rr(Bx+bw-pad-contW, byB, contW, btnH, 6); ctx.fill(); ctx.restore();
    ctx.fillStyle='#14110f';
    const contTxt = tutText({fr:'Continuer ▸',en:'Continue ▸',es:'Continuar ▸',de:'Weiter ▸',it:'Continua ▸',pt:'Continuar ▸',ru:'Далее ▸',zh:'继续 ▸',ar:'متابعة ▸'});
    fitFont(contTxt, contW-14, '700 12px Arial', 8.5);
    ctx.fillText(contTxt, Bx+bw-pad-contW/2, byB+btnH/2+4);
    TUT.uiRects.push({key:'cont', x:Bx+bw-pad-contW, y:byB, w:contW, h:btnH});
  } else {
    // AIDE RENFORCÉE (stuck>=2) : message plus direct et plus voyant (couleur d'alerte) au lieu
    // du discret « à vous de jouer » — remplace, ne s'ajoute pas, pour rester concis.
    const urge = TUT.t>6 ? 1 : 0.6;
    ctx.textAlign='right';
    const turnTxt = stuck>=2
      ? tutText({fr:'❗ touchez ce qui brille',en:'❗ tap the glowing spot',es:'❗ toca lo que brilla',de:'❗ tippe auf das Leuchtende',it:'❗ tocca ciò che brilla',pt:'❗ toque no que brilha',ru:'❗ нажмите на светящееся',zh:'❗ 点击发光的地方',ar:'❗ المس ما يتوهّج'})
      : tutText({fr:'▸ à vous de jouer',en:'▸ your turn',es:'▸ te toca a ti',de:'▸ du bist dran',it:'▸ tocca a te',pt:'▸ sua vez',ru:'▸ ваш ход',zh:'▸ 该你操作了',ar:'▸ دورك الآن'});
    ctx.fillStyle = stuck>=2? rgbaC('#ffcf6a',0.7+0.3*pulse) : rgbaC('#9dd88a', (0.5+0.5*pulse)*urge);
    fitFont(turnTxt, bw-pad*2-skipW-14, '700 11px Arial', 8);
    ctx.fillText(turnTxt, Bx+bw-pad, byB+btnH/2+4);
  }
  ctx.textAlign='left';
  if (TUT.confirmSkip) drawTutConfirm();
}
function drawTutConfirm(){
  ctx.fillStyle='rgba(8,6,6,0.72)'; ctx.fillRect(0,0,W,H);
  const bw=Math.min(460,W-40), bh=176, bx=(W-bw)/2, by=(H-bh)/2;
  ctx.fillStyle='#16100e'; rr(bx,by,bw,bh,10); ctx.fill();
  ctx.strokeStyle='#a8281e'; ctx.lineWidth=2; rr(bx,by,bw,bh,10); ctx.stroke();
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.font='700 16px Arial'; ctx.fillStyle='#e8e0d2';
  ctx.fillText(tutText({fr:'Passer le tutoriel ?',en:'Skip the tutorial?',es:'¿Saltar el tutorial?',de:'Tutorial überspringen?',it:'Saltare il tutorial?',pt:'Pular o tutorial?',ru:'Пропустить обучение?',zh:'要跳过教程吗？',ar:'هل تريد تخطي الدرس التعليمي؟'}), W/2, by+36);
  ctx.font='13px Arial'; ctx.fillStyle='#c4bcb0';
  const lines = tutWrap(tutText({fr:"Vous pourrez le relancer depuis l'onglet TUTORIEL du menu.",
                                 en:"You can restart it from the TUTORIAL tab in the menu.",
                                 es:"Podrás reiniciarlo desde la pestaña TUTORIAL del menú.",
                                 de:"Du kannst es jederzeit über den Reiter TUTORIAL im Menü neu starten.",
                                 it:"Potrai riavviarlo dalla scheda TUTORIAL del menu.",
                                 pt:"Você poderá reiniciá-lo na aba TUTORIAL do menu.",
                                 ru:"Вы сможете перезапустить его на вкладке ОБУЧЕНИЕ в меню.",
                                 zh:"你可以随时在菜单的「教程」标签页重新开始。",
                                 ar:"يمكنك إعادة تشغيله من تبويب الدرس التعليمي في القائمة."}), bw-50, '13px Arial');
  let ty = by+62; for (const ln of lines){ ctx.fillText(ln, W/2, ty); ty += 18; }
  const btnH=34, byB=by+bh-btnH-16, bwB=(bw-44)/2;
  ctx.fillStyle='rgba(168,40,30,0.92)'; rr(bx+16, byB, bwB, btnH, 7); ctx.fill();
  ctx.fillStyle='#fff';
  const keepTxt = tutText({fr:'Continuer le tuto',en:'Keep playing',es:'Seguir con el tutorial',de:'Tutorial fortsetzen',it:'Continua il tutorial',pt:'Continuar o tutorial',ru:'Продолжить обучение',zh:'继续教程',ar:'متابعة الدرس التعليمي'});
  fitFont(keepTxt, bwB-16, '700 13px Arial', 9.5);
  ctx.fillText(keepTxt, bx+16+bwB/2, byB+btnH/2+5);
  ctx.fillStyle='rgba(255,255,255,0.1)'; rr(bx+bw-16-bwB, byB, bwB, btnH, 7); ctx.fill();
  ctx.fillStyle='#d8a0a0';
  const yesSkipTxt = tutText({fr:'Oui, passer',en:'Yes, skip',es:'Sí, saltar',de:'Ja, überspringen',it:'Sì, salta',pt:'Sim, pular',ru:'Да, пропустить',zh:'是的，跳过',ar:'نعم، تخطَّ'});
  fitFont(yesSkipTxt, bwB-16, '700 13px Arial', 9.5);
  ctx.fillText(yesSkipTxt, bx+bw-16-bwB/2, byB+btnH/2+5);
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
  if (btn) btn.textContent = tutText({fr:"▶ COMMENCER LE TUTORIEL", en:"▶ START THE TUTORIAL",es:"▶ EMPEZAR EL TUTORIAL",de:"▶ TUTORIAL STARTEN",it:"▶ AVVIA IL TUTORIAL",pt:"▶ COMEÇAR O TUTORIAL",ru:"▶ НАЧАТЬ ОБУЧЕНИЕ",zh:"▶ 开始教程",ar:"▶ ابدأ الدرس التعليمي"});
}
