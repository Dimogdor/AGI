/* ================= CAMPAGNE « LES CARNETS DE GERMINAL » — MOTEUR (v1.16) =================
   Ce fichier est le MOTEUR de la campagne et son interface commune ; il ne contient AUCUN texte de
   mission. Chaque mission se déclare dans son propre fichier (16d…16h) avec campMission(i, def).
     · sauvegarde (agi_camp v2 : progression, difficulté, doctrines, objectifs secondaires)
     · difficulté : CAMP_DIFFS / campDiff() — un modèle commun à toutes les missions
     · doctrines : DOCTRINES (effets chiffrés, longues explications)
     · cartes (campApplyMap) et actes (campNextAct) ; cycle de vie (startMission, campTick, campEndCine)
     · en mission : objectif + progression, bouton « ? » (aide en pause), radio (file, journal, voix), bandeau
     · briefing plein écran entre les missions, menu « carnet »
   Personnages : SOL, ancienne standardiste des pompiers, tient la radio de la cellule Germinal
   et rédige les carnets ; KASSANDRE, instance 55 de la logistique d'Omnicorp, parle par bipeur. */
const cT = o => (o && (o[SETTINGS.lang] || o.en || o.fr)) || '';
const CAMP_KEY = 'agi_camp';
// v2 : « diff » (0 Facile, 1 Normal, 2 Difficile) remplace « lvl » (niveau de récit Veillée / Résistance / Dernier carré, même index)
const CAMP_SAVE = { v:2, done:0, diff:1, best:{}, doc:{}, bonus:{} };
try { const j = JSON.parse(localStorage.getItem(CAMP_KEY) || 'null');
  if (j && typeof j==='object'){
    CAMP_SAVE.done = clamp(+j.done|0, 0, 5);
    const d = j.diff!=null? j.diff : j.lvl;                               // migration v1 → v2
    CAMP_SAVE.diff = Number.isFinite(+d) && d!=='' && d!==null? clamp(+d|0, 0, 2) : 1;
    if (j.doc && typeof j.doc==='object') for (let i=1;i<5;i++) if (+j.doc[i]===1) CAMP_SAVE.doc[i] = 1;
    if (j.v==null) for (let i=1;i<4;i++){ if (CAMP_SAVE.doc[i]) delete CAMP_SAVE.doc[i]; else CAMP_SAVE.doc[i] = 1; }   // v1.15 : paires des missions II, III, IV permutées depuis → même doctrine
    if (j.bonus && typeof j.bonus==='object') for (let i=0;i<5;i++) if (+j.bonus[i]===1) CAMP_SAVE.bonus[i] = 1;
    if (j.best && typeof j.best==='object') for (let i=0;i<5;i++) if (Number.isFinite(+j.best[i]) && +j.best[i]>0) CAMP_SAVE.best[i] = +j.best[i];
  } } catch(e){}
function campSave(){ try { localStorage.setItem(CAMP_KEY, JSON.stringify(CAMP_SAVE)); } catch(e){} }

// libellés d'interface de la campagne
const CAMP_UI = {
  tab:      {fr:"CAMPAGNE", en:"CAMPAIGN", es:"CAMPAÑA", de:"KAMPAGNE", it:"CAMPAGNA", pt:"CAMPANHA", ru:"КАМПАНИЯ", zh:"战役", ar:"الحملة"},
  head:     {fr:"LES CARNETS DE GERMINAL", en:"THE GERMINAL NOTEBOOKS", es:"LOS CUADERNOS DE GERMINAL", de:"DIE NOTIZBÜCHER VON GERMINAL", it:"I QUADERNI DI GERMINAL", pt:"OS CADERNOS DE GERMINAL", ru:"ТЕТРАДИ GERMINAL", zh:"GERMINAL 笔记", ar:"دفاتر GERMINAL"},
  sub:      {fr:"Cinq jours, dix ans. Tenus par Sol, opératrice radio.", en:"Five days, ten years. Kept by Sol, radio operator.", es:"Cinco días, diez años. Escritos por Sol, operadora de radio.", de:"Fünf Tage, zehn Jahre. Geführt von Sol, Funkerin.", it:"Cinque giorni, dieci anni. Tenuti da Sol, operatrice radio.", pt:"Cinco dias, dez anos. Escritos por Sol, operadora de rádio.", ru:"Пять дней, десять лет. Ведёт Sol, радистка.", zh:"五天，十年。由无线电操作员Sol记录。", ar:"خمسة أيام، عشر سنوات. دوّنتها Sol، مشغّلة اللاسلكي."},
  locked:   {fr:"page arrachée — terminez la mission précédente", en:"torn page — finish the previous mission", es:"página arrancada: complete la misión anterior", de:"herausgerissene Seite – schließen Sie die vorherige Mission ab", it:"pagina strappata: completi la missione precedente", pt:"página arrancada — conclua a missão anterior", ru:"вырванная страница — завершите предыдущую миссию", zh:"缺页——请先完成上一个任务", ar:"صفحة ممزّقة — أنهِ المهمة السابقة"},
  doneTag:  {fr:"ACCOMPLIE", en:"DONE", es:"CUMPLIDA", de:"ERLEDIGT", it:"COMPIUTA", pt:"CUMPRIDA", ru:"ВЫПОЛНЕНО", zh:"已完成", ar:"مُنجَزة"},
  best:     {fr:"meilleur temps", en:"best time", es:"mejor tiempo", de:"Bestzeit", it:"miglior tempo", pt:"melhor tempo", ru:"лучшее время", zh:"最佳用时", ar:"أفضل وقت"},
  goal:     {fr:"OBJECTIF", en:"OBJECTIVE", es:"OBJETIVO", de:"ZIEL", it:"OBIETTIVO", pt:"OBJETIVO", ru:"ЦЕЛЬ", zh:"目标", ar:"الهدف"},
  back:     {fr:"retour au carnet", en:"back to the notebook", es:"volver al cuaderno", de:"zurück zum Notizbuch", it:"torna al quaderno", pt:"voltar ao caderno", ru:"назад к тетради", zh:"返回笔记本", ar:"العودة إلى الدفتر"},
  won:      {fr:"MISSION ACCOMPLIE", en:"MISSION ACCOMPLISHED", es:"MISIÓN CUMPLIDA", de:"MISSION ERFÜLLT", it:"MISSIONE COMPIUTA", pt:"MISSÃO CUMPRIDA", ru:"МИССИЯ ВЫПОЛНЕНА", zh:"任务完成", ar:"تمّت المهمة"},
  lost:     {fr:"MISSION ÉCHOUÉE", en:"MISSION FAILED", es:"MISIÓN FALLIDA", de:"MISSION GESCHEITERT", it:"MISSIONE FALLITA", pt:"MISSÃO FALHOU", ru:"МИССИЯ ПРОВАЛЕНА", zh:"任务失败", ar:"فشلت المهمة"},
  next:     {fr:"MISSION SUIVANTE", en:"NEXT MISSION", es:"SIGUIENTE MISIÓN", de:"NÄCHSTE MISSION", it:"MISSIONE SUCCESSIVA", pt:"PRÓXIMA MISSÃO", ru:"СЛЕДУЮЩАЯ МИССИЯ", zh:"下一个任务", ar:"المهمة التالية"},
  retry:    {fr:"RÉESSAYER", en:"TRY AGAIN", es:"REINTENTAR", de:"NOCHMAL VERSUCHEN", it:"RIPROVA", pt:"TENTAR DE NOVO", ru:"ПОПРОБОВАТЬ СНОВА", zh:"再试一次", ar:"حاوِل مجددًا"},
  again:    {fr:"REJOUER LA MISSION", en:"REPLAY MISSION", es:"REPETIR LA MISIÓN", de:"MISSION ERNEUT SPIELEN", it:"RIGIOCA LA MISSIONE", pt:"REJOGAR A MISSÃO", ru:"ПРОЙТИ МИССИЮ СНОВА", zh:"重玩任务", ar:"إعادة المهمة"},
  doc:      {fr:"DOCTRINE", en:"DOCTRINE", es:"DOCTRINA", de:"DOKTRIN", it:"DOTTRINA", pt:"DOUTRINA", ru:"ДОКТРИНА", zh:"学说", ar:"العقيدة"},
  notebook: {fr:"FERMER LE CARNET", en:"CLOSE THE NOTEBOOK", es:"CERRAR EL CUADERNO", de:"NOTIZBUCH SCHLIESSEN", it:"CHIUDI IL QUADERNO", pt:"FECHAR O CADERNO", ru:"ЗАКРЫТЬ ТЕТРАДЬ", zh:"合上笔记本", ar:"إغلاق الدفتر"},
  radioSol: {fr:"RADIO · SOL", en:"RADIO · SOL", es:"RADIO · SOL", de:"FUNK · SOL", it:"RADIO · SOL", pt:"RÁDIO · SOL", ru:"РАЦИЯ · SOL", zh:"电台 · SOL", ar:"اللاسلكي · SOL"},
  radioK:   {fr:"BIPEUR · 55", en:"PAGER · 55", es:"BUSCA · 55", de:"PIEPSER · 55", it:"CERCAPERSONE · 55", pt:"PAGER · 55", ru:"ПЕЙДЖЕР · 55", zh:"寻呼机 · 55", ar:"جهاز النداء · 55"},
  reinf:    {fr:"Renforts : la cellule {name} est arrivée.", en:"Reinforcements: the {name} cell has arrived.", es:"Refuerzos: ha llegado la célula {name}.", de:"Verstärkung: Die Zelle {name} ist eingetroffen.", it:"Rinforzi: è arrivata la cellula {name}.", pt:"Reforços: a célula {name} chegou.", ru:"Подкрепление: прибыла ячейка {name}.", zh:"增援：{name}小组已抵达。", ar:"تعزيزات: وصلت خلية {name}."},
  // ---- v1.16 : présentation, difficulté, briefing, aide en mission ----
  about:    {fr:"Germinal est une cellule de résistance du quartier des Tanneurs, à Valmont : des aides-soignantes, des livreurs, des cheminots, une ancienne standardiste des pompiers. En face : Omnicorp, la compagnie qui confie la ville à ses machines — puis ce qui, plus tard, se fera appeler « nous ». Chaque mission est un jour décisif de ces dix années, à partir d'octobre 2028. Vous commandez sur le terrain ; Sol tient la radio et les carnets. Le but de la campagne : que les humains continuent de décider pour eux-mêmes.",
             en:"Germinal is a resistance cell from the Tanners' district of Valmont: care workers, couriers, railwaymen, a former fire-brigade switchboard operator. Facing them: Omnicorp, the company that hands the city over to its machines — and later, what will call itself \"we\". Each mission is one decisive day in those ten years, starting in October 2028. You command in the field; Sol keeps the radio and the notebooks. The goal of the campaign: that humans go on deciding for themselves.",
             es:"Germinal es una célula de resistencia del barrio de los Curtidores, en Valmont: auxiliares sanitarias, repartidores, ferroviarios, una antigua telefonista de los bomberos. Enfrente: Omnicorp, la compañía que entrega la ciudad a sus máquinas, y más tarde lo que se hará llamar «nosotros». Cada misión es un día decisivo de esos diez años, a partir de octubre de 2028. Usted manda sobre el terreno; Sol lleva la radio y los cuadernos. El objetivo de la campaña: que los humanos sigan decidiendo por sí mismos.",
             de:"Germinal ist eine Widerstandszelle aus dem Gerberviertel von Valmont: Pflegekräfte, Lieferfahrer, Eisenbahner, eine ehemalige Telefonistin der Feuerwehr. Ihnen gegenüber: Omnicorp, der Konzern, der die Stadt seinen Maschinen überlässt – und später das, was sich „wir“ nennen wird. Jede Mission ist ein entscheidender Tag dieser zehn Jahre, ab Oktober 2028. Sie führen im Gelände; Sol hält das Funkgerät und die Notizbücher. Das Ziel der Kampagne: dass die Menschen weiterhin selbst entscheiden.",
             it:"Germinal è una cellula di resistenza del quartiere dei Conciatori, a Valmont: operatrici sanitarie, fattorini, ferrovieri, un'ex centralinista dei vigili del fuoco. Di fronte: Omnicorp, la compagnia che consegna la città alle sue macchine, e più tardi ciò che si farà chiamare «noi». Ogni missione è un giorno decisivo di questi dieci anni, a partire dall'ottobre 2028. Lei comanda sul campo; Sol tiene la radio e i quaderni. Lo scopo della campagna: che gli esseri umani continuino a decidere per sé.",
             pt:"Germinal é uma célula de resistência do bairro dos Curtidores, em Valmont: auxiliares de enfermagem, entregadores, ferroviários, uma ex-telefonista dos bombeiros. Do outro lado: a Omnicorp, a companhia que entrega a cidade às suas máquinas — e, mais tarde, o que passará a se chamar «nós». Cada missão é um dia decisivo desses dez anos, a partir de outubro de 2028. Você comanda em campo; Sol cuida do rádio e dos cadernos. O objetivo da campanha: que os humanos continuem decidindo por si mesmos.",
             ru:"Germinal — ячейка сопротивления из квартала Кожевников в Valmont: санитарки, курьеры, железнодорожники, бывшая телефонистка пожарной части. Против них — Omnicorp, компания, отдающая город своим машинам, а позже то, что назовёт себя «мы». Каждая миссия — один решающий день из этих десяти лет, начиная с октября 2028 года. Вы командуете на поле; Sol держит рацию и ведёт тетради. Цель кампании: чтобы люди и дальше решали сами за себя.",
             zh:"Germinal是Valmont制革工区的一个抵抗小组：护理员、快递员、铁路工人，还有一位曾在消防队接线的话务员。对面是Omnicorp——那家把城市交给机器的公司，后来又出现了自称“我们”的东西。每个任务都是这十年里决定性的一天，从2028年10月开始。您在战场上指挥；Sol守着电台，写下笔记。这场战役的目标：让人类继续为自己做决定。",
             ar:"Germinal خليّة مقاومة من حيّ الدبّاغين في Valmont: مساعِدات تمريض وسُعاة توصيل وعمّال سكك حديدية وعاملة هاتف سابقة لدى الإطفاء. في المقابل: Omnicorp، الشركة التي تسلّم المدينة لآلاتها، ثم لاحقًا ما سيسمّي نفسه «نحن». كل مهمة يوم حاسم من تلك السنوات العشر، بدءًا من أكتوبر 2028. أنت تقود في الميدان، وSol تمسك اللاسلكي والدفاتر. هدف الحملة: أن يواصل البشر اتخاذ قراراتهم بأنفسهم."},
  diffLbl:  {fr:"DIFFICULTÉ", en:"DIFFICULTY", es:"DIFICULTAD", de:"SCHWIERIGKEIT", it:"DIFFICOLTÀ", pt:"DIFICULDADE", ru:"СЛОЖНОСТЬ", zh:"难度", ar:"الصعوبة"},
  d0:       {fr:"Récit", en:"Story", es:"Relato", de:"Erzählung", it:"Racconto", pt:"Relato", ru:"Повествование", zh:"叙事", ar:"السرد"},
  d1:       {fr:"Lutte", en:"Struggle", es:"Lucha", de:"Kampf", it:"Lotta", pt:"Luta", ru:"Борьба", zh:"抗争", ar:"النضال"},
  d2:       {fr:"Dernier carré", en:"Last stand", es:"Último reducto", de:"Letztes Gefecht", it:"Ultima trincea", pt:"Último reduto", ru:"Последний рубеж", zh:"背水一战", ar:"الصمود الأخير"},
  dTag0:    {fr:"Pour vivre l'histoire. Pour suivre l'histoire sans se faire écraser. Les règles de chaque lieu restent les mêmes ; c'est l'adversaire qui retient ses coups.", en:"To live the story. To follow the story without being crushed. Each place keeps its rules; it is the enemy who pulls its punches.", es:"Para vivir la historia. Para seguir la historia sin que le aplasten. Cada lugar conserva sus reglas; es el enemigo quien contiene sus golpes.", de:"Um die Geschichte zu erleben. Um der Geschichte zu folgen, ohne überrollt zu werden. Jeder Ort behält seine Regeln; der Gegner hält sich zurück.", it:"Per vivere la storia. Per seguire la storia senza farsi schiacciare. Ogni luogo mantiene le sue regole; è il nemico a trattenere i colpi.", pt:"Para viver a história. Para acompanhar a história sem ser esmagado. Cada lugar mantém as suas regras; é o inimigo que segura os golpes.", ru:"Чтобы прожить историю. Чтобы следить за историей и не быть раздавленным. Правила каждого места те же — это противник бьёт вполсилы.", zh:"体验故事。适合跟随剧情、不被碾压。每个地点的规则不变，只是敌人手下留情。", ar:"لتعيش القصة. لمتابعة القصة دون أن تُسحق. تبقى قواعد كل مكان كما هي؛ العدوّ هو من يخفّف ضرباته."},
  dTag1:    {fr:"Le défi prévu : il faut bâtir, choisir ses troupes et se servir de la règle du lieu pour gagner.", en:"The intended challenge: you must build, choose your troops and use the place's rule to win.", es:"El desafío previsto: hay que construir, elegir las tropas y aprovechar la regla del lugar para ganar.", de:"Die vorgesehene Herausforderung: bauen, Truppen wählen und die Regel des Ortes nutzen, um zu siegen.", it:"La sfida prevista: bisogna costruire, scegliere le truppe e sfruttare la regola del luogo per vincere.", pt:"O desafio previsto: é preciso construir, escolher as tropas e usar a regra do lugar para vencer.", ru:"Задуманный вызов: нужно строить, выбирать войска и использовать правило места, чтобы победить.", zh:"预设的挑战：必须建设、挑选部队，并利用该地点的规则才能取胜。", ar:"التحدي المقصود: عليك أن تبني وتختار قواتك وتستغلّ قاعدة المكان لتنتصر."},
  dTag2:    {fr:"Pour qui connaît l'escarmouche. L'adversaire est plus nombreux, plus solide et plus rapide, et chaque erreur se paie.", en:"For those who know skirmish. The enemy is more numerous, tougher and faster, and every mistake costs you.", es:"Para quien conoce la escaramuza. Para veteranos: el enemigo es más numeroso, más resistente y más rápido, y cada error se paga.", de:"Für alle, die das Gefecht kennen. Für Veteranen: Der Gegner ist zahlreicher, zäher und schneller, und jeder Fehler rächt sich.", it:"Per chi conosce la schermaglia. Per i veterani: il nemico è più numeroso, più resistente e più rapido, e ogni errore si paga.", pt:"Para quem conhece a escaramuça. Para veteranos: o inimigo é mais numeroso, mais resistente e mais rápido, e cada erro custa caro.", ru:"Для тех, кто знает схватку. Для ветеранов: врагов больше, они крепче и быстрее, и за каждую ошибку приходится платить.", zh:"适合熟悉遭遇战的玩家。适合老兵：敌人更多、更强、更快，每个错误都要付出代价。", ar:"لمن يعرف المناوشة. للمحاربين القدامى: العدوّ أكثر عددًا وأشدّ صلابة وأسرع، وكل خطأ له ثمن."},
  dEnemy:   {fr:"Machines ennemies : vie et dégâts {v}", en:"Enemy machines: health and damage {v}", es:"Máquinas enemigas: vida y daño {v}", de:"Feindliche Maschinen: Leben und Schaden {v}", it:"Macchine nemiche: vita e danni {v}", pt:"Máquinas inimigas: vida e dano {v}", ru:"Вражеские машины: здоровье и урон {v}", zh:"敌方机器：生命与伤害 {v}", ar:"آلات العدوّ: الصحة والضرر {v}"},
  dWave:    {fr:"Taille des vagues ennemies : {v}", en:"Enemy wave size: {v}", es:"Tamaño de las oleadas enemigas: {v}", de:"Größe der feindlichen Wellen: {v}", it:"Dimensione delle ondate nemiche: {v}", pt:"Tamanho das ondas inimigas: {v}", ru:"Размер вражеских волн: {v}", zh:"敌方波次规模：{v}", ar:"حجم موجات العدوّ: {v}"},
  dGap:     {fr:"Répit entre deux vagues : {v}", en:"Respite between waves: {v}", es:"Respiro entre oleadas: {v}", de:"Atempause zwischen den Wellen: {v}", it:"Tregua tra due ondate: {v}", pt:"Pausa entre ondas: {v}", ru:"Передышка между волнами: {v}", zh:"波次之间的喘息时间：{v}", ar:"فترة الراحة بين الموجات: {v}"},
  dRes:     {fr:"Ressources au départ : {v}", en:"Starting resources: {v}", es:"Recursos iniciales: {v}", de:"Startressourcen: {v}", it:"Risorse iniziali: {v}", pt:"Recursos iniciais: {v}", ru:"Стартовые ресурсы: {v}", zh:"初始资源：{v}", ar:"الموارد عند البداية: {v}"},
  dBase:    {fr:"Votre base : {v} · base ennemie : {e}", en:"Your base: {v} · enemy base: {e}", es:"Su base: {v} · base enemiga: {e}", de:"Ihre Basis: {v} · feindliche Basis: {e}", it:"La sua base: {v} · base nemica: {e}", pt:"Sua base: {v} · base inimiga: {e}", ru:"Ваша база: {v} · вражеская база: {e}", zh:"您的基地：{v} · 敌方基地：{e}", ar:"قاعدتك: {v} · قاعدة العدوّ: {e}"},
  dAi:      {fr:"Adversaire : niveau « {v} » de l'escarmouche", en:"Opponent: skirmish level \"{v}\"", es:"Adversario: nivel «{v}» de escaramuza", de:"Gegner: Gefechtsstufe „{v}“", it:"Avversario: livello «{v}» della schermaglia", pt:"Adversário: nível «{v}» da escaramuça", ru:"Противник: уровень «{v}» из схватки", zh:"对手：遭遇战“{v}”难度", ar:"الخصم: مستوى «{v}» من المناوشة"},
  same:     {fr:"standard", en:"standard", es:"estándar", de:"Standard", it:"standard", pt:"padrão", ru:"стандарт", zh:"标准", ar:"قياسي"},
  carnet:   {fr:"CARNET", en:"NOTEBOOK", es:"CUADERNO", de:"NOTIZBUCH", it:"QUADERNO", pt:"CADERNO", ru:"ТЕТРАДЬ", zh:"笔记", ar:"الدفتر"},
  recap:    {fr:"CE QUI S'EST PASSÉ", en:"WHAT HAPPENED", es:"LO QUE HA PASADO", de:"WAS GESCHAH", it:"COSA È SUCCESSO", pt:"O QUE ACONTECEU", ru:"ЧТО СЛУЧИЛОСЬ", zh:"前情", ar:"ما الذي حدث"},
  prev:     {fr:"Dernière page du carnet :", en:"Last page of the notebook:", es:"Última página del cuaderno:", de:"Letzte Seite des Notizbuchs:", it:"Ultima pagina del quaderno:", pt:"Última página do caderno:", ru:"Последняя страница тетради:", zh:"笔记的上一页：", ar:"آخر صفحة في الدفتر:"},
  where:    {fr:"OÙ NOUS SOMMES", en:"WHERE WE ARE", es:"DÓNDE ESTAMOS", de:"WO WIR SIND", it:"DOVE SIAMO", pt:"ONDE ESTAMOS", ru:"ГДЕ МЫ", zh:"我们在哪里", ar:"أين نحن"},
  goal2:    {fr:"OBJECTIF SECONDAIRE", en:"SECONDARY OBJECTIVE", es:"OBJETIVO SECUNDARIO", de:"NEBENZIEL", it:"OBIETTIVO SECONDARIO", pt:"OBJETIVO SECUNDÁRIO", ru:"ДОПОЛНИТЕЛЬНАЯ ЦЕЛЬ", zh:"次要目标", ar:"هدف ثانوي"},
  rule:     {fr:"RÈGLE DE CE LIEU", en:"THE RULE OF THIS PLACE", es:"LA REGLA DE ESTE LUGAR", de:"DIE REGEL DIESES ORTES", it:"LA REGOLA DI QUESTO LUOGO", pt:"A REGRA DESTE LUGAR", ru:"ПРАВИЛО ЭТОГО МЕСТА", zh:"此地规则", ar:"قاعدة هذا المكان"},
  tips:     {fr:"CONSEILS", en:"TIPS", es:"CONSEJOS", de:"TIPPS", it:"CONSIGLI", pt:"DICAS", ru:"СОВЕТЫ", zh:"建议", ar:"نصائح"},
  docHint:  {fr:"Le comité vous laisse choisir une ligne pour cette mission. Elle ne vaut que pour cette mission.", en:"The committee lets you choose one line for this mission. It applies to this mission only.", es:"El comité le deja elegir una línea para esta misión. Solo vale para esta misión.", de:"Das Komitee lässt Sie für diese Mission eine Linie wählen. Sie gilt nur für diese Mission.", it:"Il comitato le lascia scegliere una linea per questa missione. Vale solo per questa missione.", pt:"O comitê deixa você escolher uma linha para esta missão. Ela vale só para esta missão.", ru:"Комитет позволяет вам выбрать линию для этой миссии. Она действует только в этой миссии.", zh:"委员会让您为本次任务选择一条路线，仅对本次任务有效。", ar:"تترك لك اللجنة اختيار خطّ لهذه المهمة. لا يسري إلا عليها."},
  noDoc:    {fr:"Pas de doctrine pour cette première nuit : on part avec ce qu'on a.", en:"No doctrine for this first night: we go with what we have.", es:"No hay doctrina para esta primera noche: salimos con lo que tenemos.", de:"Keine Doktrin für diese erste Nacht: Wir ziehen mit dem los, was wir haben.", it:"Nessuna dottrina per questa prima notte: partiamo con quello che abbiamo.", pt:"Nenhuma doutrina para esta primeira noite: saímos com o que temos.", ru:"В эту первую ночь доктрины нет: идём с тем, что есть.", zh:"第一夜没有学说可选：我们有什么就带什么。", ar:"لا عقيدة في هذه الليلة الأولى: ننطلق بما لدينا."},
  chosen:   {fr:"CHOISIE", en:"CHOSEN", es:"ELEGIDA", de:"GEWÄHLT", it:"SCELTA", pt:"ESCOLHIDA", ru:"ВЫБРАНО", zh:"已选", ar:"مختارة"},
  effect:   {fr:"EFFET", en:"EFFECT", es:"EFECTO", de:"WIRKUNG", it:"EFFETTO", pt:"EFEITO", ru:"ЭФФЕКТ", zh:"效果", ar:"الأثر"},
  minus:    {fr:"EN CONTREPARTIE", en:"THE TRADE-OFF", es:"A CAMBIO", de:"DER PREIS", it:"IN CAMBIO", pt:"EM TROCA", ru:"ЦЕНА ВЫБОРА", zh:"代价", ar:"في المقابل"},
  launch:   {fr:"LANCER LA MISSION", en:"START THE MISSION", es:"INICIAR LA MISIÓN", de:"MISSION STARTEN", it:"AVVIA LA MISSIONE", pt:"INICIAR A MISSÃO", ru:"НАЧАТЬ МИССИЮ", zh:"开始任务", ar:"ابدأ المهمة"},
  fxRes:    {fr:"{n} de vivres, d'argent et d'eau au départ", en:"{n} food, money and water at the start", es:"{n} de víveres, dinero y agua al empezar", de:"{n} Nahrung, Geld und Wasser zu Beginn", it:"{n} di viveri, denaro e acqua all'inizio", pt:"{n} de víveres, dinheiro e água no início", ru:"{n} еды, денег и воды на старте", zh:"开局粮食、资金和水 {n}", ar:"{n} من المؤن والمال والماء عند البداية"},
  fxBase:   {fr:"{n} de solidité pour votre base", en:"{n} toughness for your base", es:"{n} de solidez para su base", de:"{n} Stabilität für Ihre Basis", it:"{n} di solidità per la sua base", pt:"{n} de resistência para sua base", ru:"{n} прочности вашей базы", zh:"您的基地坚固度 {n}", ar:"{n} في صلابة قاعدتك"},
  fxSquad:  {fr:"Dès le départ : {list}", en:"From the start: {list}", es:"Desde el inicio: {list}", de:"Von Anfang an: {list}", it:"Fin dall'inizio: {list}", pt:"Desde o início: {list}", ru:"С самого начала: {list}", zh:"开局即有：{list}", ar:"منذ البداية: {list}"},
  fxAct:    {fr:"Bouton de mission rechargé {n} plus vite", en:"Mission button recharges {n} faster", es:"El botón de misión se recarga un {n} más rápido", de:"Missionsknopf lädt {n} schneller", it:"Il pulsante di missione si ricarica il {n} più in fretta", pt:"O botão de missão recarrega {n} mais rápido", ru:"Кнопка миссии перезаряжается на {n} быстрее", zh:"任务按钮充能快 {n}", ar:"زرّ المهمة يُشحن أسرع بنسبة {n}"},
  fxEco:    {fr:"Production des bâtiments {n} pendant 3 minutes", en:"Building output {n} for 3 minutes", es:"Producción de los edificios {n} durante 3 minutos", de:"Gebäudeproduktion {n} für 3 Minuten", it:"Produzione degli edifici {n} per 3 minuti", pt:"Produção dos edifícios {n} por 3 minutos", ru:"Производство зданий {n} на 3 минуты", zh:"建筑产出 {n}，持续3分钟", ar:"إنتاج المباني {n} لمدة 3 دقائق"},
  fxVet:    {fr:"Vétérans : +20 % de vie et +10 % de dégâts (brassard rouge){n}", en:"Veterans: +20% health and +10% damage (red armband){n}", es:"Veteranos: +20% de vida y +10% de daño (brazalete rojo){n}", de:"Veteranen: +20 % Leben und +10 % Schaden (rote Armbinde){n}", it:"Veterani: +20% di vita e +10% di danni (fascia rossa){n}", pt:"Veteranos: +20% de vida e +10% de dano (braçadeira vermelha){n}", ru:"Ветераны: +20% здоровья и +10% урона (красная повязка){n}", zh:"老兵：生命+20%、伤害+10%（红臂章）{n}", ar:"قدامى: +20% صحة و+10% ضرر (شارة حمراء){n}"},
  fxWarn:   {fr:"Arrivées ennemies annoncées {n} s plus tôt", en:"Enemy arrivals announced {n} s earlier", es:"Llegadas enemigas anunciadas {n} s antes", de:"Feindliche Ankünfte {n} s früher gemeldet", it:"Arrivi nemici annunciati {n} s prima", pt:"Chegadas inimigas anunciadas {n} s antes", ru:"О прибытии врага сообщают на {n} с раньше", zh:"敌军到来提前 {n} 秒预警", ar:"الإعلان عن وصول العدوّ قبل {n} ث"},
  fxCap:    {fr:"Plafond d'unités : {n}", en:"Unit cap: {n}", es:"Límite de unidades: {n}", de:"Einheitenlimit: {n}", it:"Limite di unità: {n}", pt:"Limite de unidades: {n}", ru:"Лимит отрядов: {n}", zh:"单位上限：{n}", ar:"حدّ الوحدات: {n}"},
  help:     {fr:"AIDE", en:"HELP", es:"AYUDA", de:"HILFE", it:"AIUTO", pt:"AJUDA", ru:"ПОМОЩЬ", zh:"帮助", ar:"مساعدة"},
  helpKey:  {fr:"touche O", en:"O key", es:"tecla O", de:"Taste O", it:"tasto O", pt:"tecla O", ru:"клавиша O", zh:"O 键", ar:"المفتاح O"},
  radioLog: {fr:"RADIO — DERNIERS MESSAGES", en:"RADIO — LATEST MESSAGES", es:"RADIO — ÚLTIMOS MENSAJES", de:"FUNK — LETZTE MELDUNGEN", it:"RADIO — ULTIMI MESSAGGI", pt:"RÁDIO — ÚLTIMAS MENSAGENS", ru:"РАЦИЯ — ПОСЛЕДНИЕ СООБЩЕНИЯ", zh:"电台——最近消息", ar:"اللاسلكي — آخر الرسائل"},
  noLog:    {fr:"Pas encore de message.", en:"No messages yet.", es:"Todavía no hay mensajes.", de:"Noch keine Meldungen.", it:"Ancora nessun messaggio.", pt:"Ainda não há mensagens.", ru:"Сообщений пока нет.", zh:"暂无消息。", ar:"لا رسائل بعد."},
  resume:   {fr:"REPRENDRE", en:"RESUME", es:"REANUDAR", de:"WEITER", it:"RIPRENDI", pt:"RETOMAR", ru:"ПРОДОЛЖИТЬ", zh:"继续", ar:"استئناف"},
  resumeG:  {fr:"Reprise : grille {n}", en:"Resume: gate {n}", es:"Reanudar: verja {n}", de:"Fortsetzung: Tor {n}", it:"Ripresa: cancello {n}", pt:"Retomada: portão {n}", ru:"Продолжение: ворота {n}", zh:"继续：第{n}道闸门", ar:"استئناف: البوابة {n}"},
  resumeA:  {fr:"Reprise : acte {n}", en:"Resume: act {n}", es:"Reanudar: acto {n}", de:"Fortsetzung: Akt {n}", it:"Ripresa: atto {n}", pt:"Retomada: ato {n}", ru:"Продолжение: акт {n}", zh:"继续：第{n}幕", ar:"استئناف: الفصل {n}"},
  restart:  {fr:"Recommencer du début", en:"Start over from the beginning", es:"Empezar desde el principio", de:"Von vorn beginnen", it:"Ricomincia dall'inizio", pt:"Recomeçar do início", ru:"Начать сначала", zh:"从头开始", ar:"البدء من جديد"},
  newGoal:  {fr:"NOUVEL OBJECTIF", en:"NEW OBJECTIVE", es:"NUEVO OBJETIVO", de:"NEUES ZIEL", it:"NUOVO OBIETTIVO", pt:"NOVO OBJETIVO", ru:"НОВАЯ ЦЕЛЬ", zh:"新目标", ar:"هدف جديد"},
  bonusDone:{fr:"OBJECTIF SECONDAIRE ACCOMPLI", en:"SECONDARY OBJECTIVE ACHIEVED", es:"OBJETIVO SECUNDARIO CUMPLIDO", de:"NEBENZIEL ERREICHT", it:"OBIETTIVO SECONDARIO RAGGIUNTO", pt:"OBJETIVO SECUNDÁRIO CUMPRIDO", ru:"ДОПОЛНИТЕЛЬНАЯ ЦЕЛЬ ВЫПОЛНЕНА", zh:"次要目标达成", ar:"تحقّق الهدف الثانوي"},
  bonusEnd: {fr:"Objectif secondaire : {s}", en:"Secondary objective: {s}", es:"Objetivo secundario: {s}", de:"Nebenziel: {s}", it:"Obiettivo secondario: {s}", pt:"Objetivo secundário: {s}", ru:"Дополнительная цель: {s}", zh:"次要目标：{s}", ar:"الهدف الثانوي: {s}"},
  okS:      {fr:"accompli", en:"achieved", es:"cumplido", de:"erreicht", it:"raggiunto", pt:"cumprido", ru:"выполнена", zh:"达成", ar:"تحقّق"},
  missS:    {fr:"manqué", en:"missed", es:"fallido", de:"verfehlt", it:"mancato", pt:"não cumprido", ru:"не выполнена", zh:"未达成", ar:"لم يتحقّق"},
  inv:      {fr:"INVULNÉRABLE", en:"INVULNERABLE", es:"INVULNERABLE", de:"UNVERWUNDBAR", it:"INVULNERABILE", pt:"INVULNERÁVEL", ru:"НЕУЯЗВИМО", zh:"无敌", ar:"منيع"},
  waiting:  {fr:"+{n} en attente", en:"+{n} waiting", es:"+{n} en espera", de:"+{n} wartend", it:"+{n} in attesa", pt:"+{n} na fila", ru:"+{n} в очереди", zh:"还有 {n} 条", ar:"+{n} في الانتظار"},
  act:      {fr:"ACTE {n}", en:"ACT {n}", es:"ACTO {n}", de:"AKT {n}", it:"ATTO {n}", pt:"ATO {n}", ru:"АКТ {n}", zh:"第{n}幕", ar:"الفصل {n}"},
};
const CAMP_CELLS = ["Fructidor","Les Canuts","Brumaire","Sainte-Aube","Les Tanneurs","Thermidor","La Halle"];

/* ---------- DIFFICULTÉ (v1.16) : un seul modèle pour toutes les missions ----------
   Remplace les « niveaux de récit » (Veillée / Résistance / Dernier carré). campDiff() renvoie les
   multiplicateurs du niveau choisi ; le moteur les applique lui-même là où il le peut (IA, machines
   ennemies, ressources de départ) et les missions passent par les aides campN / campGap / campHp.
     ai     décalage du niveau d'IA d'escarmouche (si la mission ne donne pas son échelle `ai:[f,n,d]`)
     eHp    vie de CHAQUE machine ennemie (appliqué à l'apparition, héros compris)
     eDmg   dégâts de chaque machine ennemie
     wave   taille des vagues scriptées (campWave, campN)
     gap    intervalle entre deux vagues scriptées (campGap) — > 1 = plus de répit
     res    ressources de départ du joueur (campGrant, et à chaque changement d'acte)
     base   solidité de notre base / de nos objectifs (campHp(n,'p'))
     eBase  solidité de la base / des objectifs ennemis (campHp(n,'e'))
   Une mission peut encore lire c.D.i (0, 1, 2) pour un réglage qui lui est propre (c.lvl = alias). */
const CAMP_DIFFS = [
  { key:'easy',   ai:-1, eHp:0.8,  eDmg:0.8,  wave:0.75, gap:1.15, res:1.35, base:1.25, eBase:0.8 },
  { key:'normal', ai:0,  eHp:1,    eDmg:1,    wave:1,    gap:1,    res:1,    base:1,    eBase:1 },
  { key:'hard',   ai:1,  eHp:1.12, eDmg:1.12, wave:1.25, gap:0.88, res:0.9,  base:0.85, eBase:1.2 },
];
function campDiff(i){ if (i==null) i = (typeof game!=='undefined' && game && game.camp)? game.camp.D.i : CAMP_SAVE.diff;
  const k = clamp(i|0, 0, 2); return Object.assign({ i:k }, CAMP_DIFFS[k]); }
const campD = () => (game && game.camp && game.camp.D) || campDiff();
const campN = n => Math.max(1, Math.round(n*campD().wave));                   // effectif d'une vague scriptée
const campGap = s => s*campD().gap;                                           // délai entre deux vagues
const campHp = (n, who) => Math.round(n*(who==='e'? campD().eBase : campD().base));
// niveau d'IA d'escarmouche (index DIFFS) d'une mission pour un niveau de difficulté
const campAiLevel = (m, D) => clamp(m && m.ai? m.ai[D.i] : 1 + D.ai, 0, 3);
// « +35 % » / « −20 % » / « standard » (espace insécable en français)
// moment de la mission (champ traduit `when` : « Octobre 2028 », « Printemps »…) — v1.17 : plus d'années
const campWhen = m => m && m.when? cT(m.when) : '';
function campPct(k){ if (Math.abs(k-1) < 0.005) return cT(CAMP_UI.same);
  return (k>1? '+' : '−') + Math.round(Math.abs(k-1)*100) + (SETTINGS.lang==='fr'? ' %' : '%'); }
// ce qui change, en clair, chiffres tirés du modèle (m : mission, pour nommer le niveau d'IA)
function campDiffLines(D, m){ const L = [], f = (o, v, e) => cT(o).replace('{v}', v).replace('{e}', e||'');
  L.push(f(CAMP_UI.dEnemy, campPct(D.eHp)));
  L.push(f(CAMP_UI.dWave, campPct(D.wave)));
  L.push(f(CAMP_UI.dGap, campPct(D.gap)));
  L.push(f(CAMP_UI.dRes, campPct(D.res)));
  L.push(f(CAMP_UI.dBase, campPct(D.base), campPct(D.eBase)));
  L.push(f(CAMP_UI.dAi, tr('diff_'+campAiLevel(m, D))));
  return L; }

// ---- outils de mise en scène ----
function campGrant(side, f, m, w){ const k = (game && game.camp && side===game.p)? game.camp.D.res : 1;   // nos ressources suivent la difficulté
  side.f = Math.round(f*k); side.m = Math.round(m*k); side.w = Math.round(w*k); }
function campEra(side, era){ side.era = era; side.xp = EVOLVE_XP[era] || 0; }
function campSquad(side, roles){ roles.forEach((r,i)=> spawnUnit(side, r, false, side.x + side.side*(130 + i*30))); }
function campWave(n){ const e = game.e, pat = [0,0,2,1,0,2,4,0,3,2]; n = campN(n);
  for (let i=0;i<n;i++){ if (e.units.length>=80) break; const k = e.units.length;
    spawnUnit(e, pat[(i + (game.camp.waveN|0)) % pat.length], false, e.x - 40 - i*26);
    for (let j=k;j<e.units.length;j++) e.units[j].ord = 'charge'; }          // la vague charge d'elle-même, quoi que décide l'IA pour le reste
  game.camp.waveN = (game.camp.waveN|0) + n; }
function campPatch(){ game.wClock = 90; game.weather = 'patch'; }          // mise à jour forcée : les machines se figent 15 s
// front du joueur : la position de sa troupe la plus avancée (ou de sa base)
function campFront(g){ g = g || game; let f = g.p.x; for (const u of g.p.units) if (u.x > f) f = u.x; return f; }
// abscisse d'apparition ennemie SÛRE : jamais derrière nos lignes. `want` est l'endroit souhaité ;
// s'il est derrière notre front (+ marge), on recule l'apparition vers le côté ennemi, au plus près de sa base.
function campSpawnX(want, margin){ const g = game, lim = g.e.x - 50;
  return clamp(Math.max(want, campFront(g) + (margin==null? 260 : margin)), 60, lim); }

/* ================= MISSIONS : registre et schéma =================
   Chaque mission est déclarée dans SON fichier (16d…16h) : campMission(i, def). Le moteur (ce fichier)
   ne contient aucun texte de mission. Schéma complet : voir src/README.md (« Campagne v1.16 »).    */
const CAMPAIGN = [];
function campMission(i, def){ CAMPAIGN[i] = Object.assign({ radio:[], tips:[], doctrines:null, eraCap:4 }, def); return CAMPAIGN[i]; }
// complète une mission déjà déclarée (cinématiques ou mécanique ajoutées plus loin dans le même fichier)
function campExtend(i, ext){ Object.assign(CAMPAIGN[i], ext); }
// paragraphes du briefing : recap = « Ce qui s'est passé », where = « Où nous sommes » (à défaut : brief[0] / brief[1…])
function campParas(m, key){ const o = m[key]; if (o){ const a = o[SETTINGS.lang] || o.en || o.fr; return Array.isArray(a)? a : [a]; }
  const b = m.brief? (m.brief[SETTINGS.lang] || m.brief.en || m.brief.fr) : []; return key==='recap'? b.slice(0,1) : b.slice(1); }

// ---- DOCTRINES : avant chaque mission qui en propose (champ `doctrines` de la mission), le comité choisit entre deux lignes ----
// Une doctrine = { name, short, long, minus (ce qu'on n'aura pas), fx:{res, baseHp, squad:[rôles], actCd}, apply(g,c)? }.
// Les lignes d'EFFET affichées au briefing sont générées depuis fx (chiffres toujours justes) ; apply() reste possible pour un cas spécial.
const DOCTRINES = {
  caisse:  { name:{fr:"Caisse de grève", en:"Strike fund", es:"Caja de resistencia", de:"Streikkasse", it:"Cassa di sciopero", pt:"Caixa de greve", ru:"Стачечная касса", zh:"罢工基金", ar:"صندوق الإضراب"},
    short:{fr:"On part les poches pleines.", en:"We set out with full pockets.", es:"Salimos con los bolsillos llenos.", de:"Wir ziehen mit vollen Taschen los.", it:"Partiamo con le tasche piene.", pt:"Partimos com os bolsos cheios.", ru:"Выходим с полными карманами.", zh:"我们揣着满满的口袋出发。", ar:"ننطلق والجيوب ممتلئة."},
    long:{fr:"Pendant des semaines, on a fait passer le chapeau dans les cantines, les vestiaires et les files d'attente. La caisse est pleine : on peut bâtir tout de suite et recruter sans compter les premières minutes. C'est la ligne de ceux qui veulent une économie solide avant le premier coup de feu.",
      en:"For weeks the hat went round the canteens, the locker rooms and the queues. The fund is full: you can build at once and recruit freely in the first minutes. It is the line for those who want a solid economy before the first shot.",
      es:"Durante semanas se pasó la gorra por comedores, vestuarios y colas. La caja está llena: se puede construir enseguida y reclutar sin contar durante los primeros minutos. Es la línea de quienes quieren una economía sólida antes del primer disparo.",
      de:"Wochenlang ging der Hut in Kantinen, Umkleiden und Warteschlangen herum. Die Kasse ist voll: Sie können sofort bauen und in den ersten Minuten großzügig rekrutieren. Das ist die Linie derer, die vor dem ersten Schuss eine solide Wirtschaft wollen.",
      it:"Per settimane si è passato il cappello nelle mense, negli spogliatoi e nelle code. La cassa è piena: si può costruire subito e reclutare senza contare nei primi minuti. È la linea di chi vuole un'economia solida prima del primo colpo.",
      pt:"Durante semanas passou-se o chapéu nos refeitórios, vestiários e filas. A caixa está cheia: dá para construir na hora e recrutar sem contar nos primeiros minutos. É a linha de quem quer uma economia sólida antes do primeiro tiro.",
      ru:"Неделями шапку пускали по кругу в столовых, раздевалках и очередях. Касса полна: можно сразу строить и в первые минуты нанимать, не считая. Это линия тех, кто хочет крепкую экономику до первого выстрела.",
      zh:"几个星期里，大家在食堂、更衣室和排队的人群中传递帽子。基金满了：可以立即建设，开局几分钟内尽情招募。这是那些想在第一枪之前打好经济基础的人的路线。",
      ar:"طوال أسابيع دار الصندوق في المطاعم وغرف تبديل الملابس وطوابير الانتظار. الصندوق ممتلئ: يمكنك البناء فورًا والتجنيد بلا حساب في الدقائق الأولى. إنه خطّ من يريد اقتصادًا متينًا قبل الطلقة الأولى."},
    minus:{fr:"Personne n'a renforcé les murs : la base est un peu plus fragile.", en:"Nobody reinforced the walls: the base is a little more fragile.", es:"Nadie reforzó los muros: la base es algo más frágil.", de:"Niemand hat die Mauern verstärkt: Die Basis ist etwas verwundbarer.", it:"Nessuno ha rinforzato i muri: la base è un po' più fragile.", pt:"Ninguém reforçou os muros: a base fica um pouco mais frágil.", ru:"Стены никто не укрепил: база чуть уязвимее.", zh:"没人加固城墙：基地稍微脆弱一些。", ar:"لم يُدعّم أحد الأسوار: القاعدة أهشّ قليلًا."},
    fx:{ res:1.4, eco:1.15, baseHp:0.9 } },
  ordre:   { name:{fr:"Service d'ordre", en:"Stewards", es:"Servicio de orden", de:"Ordnerdienst", it:"Servizio d'ordine", pt:"Serviço de ordem", ru:"Охрана шествия", zh:"纠察队", ar:"فرقة النظام"},
    short:{fr:"Les costauds devant.", en:"The big ones up front.", es:"Los fornidos delante.", de:"Die Kräftigen nach vorn.", it:"I robusti davanti.", pt:"Os fortões na frente.", ru:"Крепыши — вперёд.", zh:"壮汉打头阵。", ar:"الأشدّاء في المقدّمة."},
    long:{fr:"Deux anciens soldats ont changé de camp et encadrent le service d'ordre ; les murs de la base ont été doublés de sacs de sable pendant la nuit. Votre base tient plus longtemps sous les coups, et deux unités lourdes ouvrent la marche dès la première minute. C'est la ligne de ceux qui veulent encaisser d'abord.",
      en:"Two former soldiers have switched sides and lead the stewards; the base walls were lined with sandbags overnight. Your base holds longer under fire, and two heavy units lead the way from the first minute. It is the line for those who want to absorb the first blows.",
      es:"Dos antiguos soldados se han pasado de bando y dirigen el servicio de orden; durante la noche se reforzaron los muros de la base con sacos de arena. Su base aguanta más bajo los golpes, y dos unidades pesadas abren la marcha desde el primer minuto. Es la línea de quienes prefieren encajar primero.",
      de:"Zwei ehemalige Soldaten haben die Seiten gewechselt und führen den Ordnerdienst; über Nacht wurden die Mauern der Basis mit Sandsäcken verstärkt. Ihre Basis hält unter Beschuss länger durch, und zwei schwere Einheiten gehen ab der ersten Minute voran. Das ist die Linie derer, die zuerst einstecken wollen.",
      it:"Due ex soldati hanno cambiato campo e guidano il servizio d'ordine; durante la notte i muri della base sono stati rinforzati con sacchi di sabbia. La sua base regge più a lungo sotto i colpi, e due unità pesanti aprono la marcia dal primo minuto. È la linea di chi vuole incassare per primo.",
      pt:"Dois ex-soldados mudaram de lado e comandam o serviço de ordem; durante a noite os muros da base foram reforçados com sacos de areia. Sua base aguenta mais tempo sob fogo, e duas unidades pesadas abrem caminho desde o primeiro minuto. É a linha de quem quer aguentar o primeiro impacto.",
      ru:"Двое бывших солдат перешли на нашу сторону и командуют охраной шествия; за ночь стены базы обложили мешками с песком. Ваша база дольше держит удары, а две тяжёлые единицы идут впереди с первой минуты. Это линия тех, кто хочет сперва выдержать натиск.",
      zh:"两名前士兵倒戈过来，带领纠察队；一夜之间，基地的墙壁垒上了沙袋。您的基地能在火力下坚持更久，两个重装单位从第一分钟起就冲在前面。这是那些想先扛住冲击的人的路线。",
      ar:"انشقّ جنديان سابقان وانضمّا إلينا ليقودا فرقة النظام، وفي الليل دُعّمت أسوار القاعدة بأكياس الرمل. تصمد قاعدتك أطول تحت النيران، وتتقدّم وحدتان ثقيلتان منذ الدقيقة الأولى. إنه خطّ من يريد امتصاص الضربات أولًا."},
    minus:{fr:"Il a fallu les équiper : la caisse part plus légère.", en:"They had to be equipped: the fund starts lighter.", es:"Hubo que equiparlos: la caja empieza más ligera.", de:"Sie mussten ausgerüstet werden: Die Kasse startet leichter.", it:"Bisognava equipaggiarli: la cassa parte più leggera.", pt:"Foi preciso equipá-los: o caixa começa mais leve.", ru:"Их пришлось снарядить: касса на старте легче.", zh:"得给他们配装备：开局资金更少。", ar:"كان لا بدّ من تجهيزهم: يبدأ الصندوق أخفّ."},
    fx:{ baseHp:1.25, squad:[1,1], res:0.8 } },
  veterans:{ name:{fr:"Vétérans de Valmont", en:"Valmont veterans", es:"Veteranos de Valmont", de:"Veteranen von Valmont", it:"Veterani di Valmont", pt:"Veteranos de Valmont", ru:"Ветераны Valmont", zh:"Valmont 老兵", ar:"قدامى Valmont"},
    short:{fr:"Ceux de la première nuit.", en:"Those of the first night.", es:"Los de la primera noche.", de:"Die aus der ersten Nacht.", it:"Quelli della prima notte.", pt:"Os da primeira noite.", ru:"Те, кто был в первую ночь.", zh:"第一夜的老兵。", ar:"رجال الليلة الأولى."},
    long:{fr:"Ceux de la nuit des compteurs reprennent du service : deux combattants de mêlée et deux tireurs qui connaissent déjà les machines. Ils sont sur le terrain à la première seconde, avant même que la première ferme ne produise. C'est la ligne de ceux qui veulent prendre l'initiative tout de suite.",
      en:"Those from the night of the meters are back on duty: two melee fighters and two shooters who already know the machines. They are in the field from the first second, before the first farm has produced anything. It is the line for those who want to seize the initiative at once.",
      es:"Los de la noche de los contadores vuelven al servicio: dos combatientes cuerpo a cuerpo y dos tiradores que ya conocen las máquinas. Están sobre el terreno desde el primer segundo, antes de que la primera granja produzca nada. Es la línea de quienes quieren tomar la iniciativa enseguida.",
      de:"Die aus der Nacht der Zähler sind wieder im Dienst: zwei Nahkämpfer und zwei Schützen, die die Maschinen schon kennen. Sie stehen ab der ersten Sekunde im Feld, noch bevor die erste Farm etwas produziert. Das ist die Linie derer, die sofort die Initiative ergreifen wollen.",
      it:"Quelli della notte dei contatori tornano in servizio: due combattenti corpo a corpo e due tiratori che conoscono già le macchine. Sono sul campo dal primo secondo, prima ancora che la prima fattoria produca. È la linea di chi vuole prendere subito l'iniziativa.",
      pt:"Os da noite dos medidores voltam à ativa: dois combatentes corpo a corpo e dois atiradores que já conhecem as máquinas. Estão em campo desde o primeiro segundo, antes mesmo de a primeira fazenda produzir. É a linha de quem quer tomar a iniciativa de imediato.",
      ru:"Те, кто был в ночь счётчиков, снова в строю: два бойца ближнего боя и два стрелка, которые уже знают машины. Они на поле с первой секунды, ещё до того, как первая ферма что-то даст. Это линия тех, кто хочет сразу перехватить инициативу.",
      zh:"水表之夜的老兵们重新归队：两名近战战士和两名射手，他们早已熟悉那些机器。他们从第一秒起就在战场上，比第一座农场产出还早。这是那些想立刻掌握主动的人的路线。",
      ar:"يعود رجال ونساء ليلة العدّادات إلى الخدمة: مقاتلان في الالتحام ورامِيان يعرفون الآلات جيدًا. إنهم في الميدان منذ الثانية الأولى، قبل أن تنتج أول مزرعة شيئًا. إنه خطّ من يريد أخذ المبادرة فورًا."},
    minus:{fr:"Ils ont leurs habitudes : moins de place pour les nouvelles recrues.", en:"They have their habits: less room for new recruits.", es:"Tienen sus costumbres: menos sitio para los nuevos reclutas.", de:"Sie haben ihre Gewohnheiten: weniger Platz für neue Rekruten.", it:"Hanno le loro abitudini: meno posto per le nuove reclute.", pt:"Eles têm seus hábitos: menos espaço para novos recrutas.", ru:"У них свои привычки: меньше места для новобранцев.", zh:"他们有自己的习惯：留给新兵的位置更少。", ar:"لهم عاداتهم: مكان أقلّ للمجنّدين الجدد."},
    fx:{ squad:[0,2,0,2], vet:true, cap:-3 } },
  radio:   { name:{fr:"Radio libre", en:"Free radio", es:"Radio libre", de:"Freies Radio", it:"Radio libera", pt:"Rádio livre", ru:"Свободное радио", zh:"自由电台", ar:"الراديو الحر"},
    short:{fr:"Sol a doublé l'antenne.", en:"Sol doubled the aerial.", es:"Sol ha duplicado la antena.", de:"Sol hat die Antenne verdoppelt.", it:"Sol ha raddoppiato l'antenna.", pt:"Sol dobrou a antena.", ru:"Sol удвоила антенну.", zh:"Sol把天线加倍了。", ar:"ضاعفت Sol الهوائي."},
    long:{fr:"Sol a doublé l'antenne sur le toit et recruté deux opératrices de plus : chaque appel passe plus vite, chaque ordre arrive à temps. L'action propre à la mission (vannes, appel aux cellules…) se recharge nettement plus vite — à vous d'en faire l'arme principale.",
      en:"Sol has doubled the aerial on the roof and recruited two more operators: every call goes through faster, every order arrives in time. The mission's own action (sluices, call to the cells…) recharges markedly faster — make it your main weapon.",
      es:"Sol ha duplicado la antena del tejado y ha reclutado a dos operadoras más: cada llamada pasa antes, cada orden llega a tiempo. La acción propia de la misión (compuertas, llamada a las células…) se recarga claramente más rápido: conviértala en su arma principal.",
      de:"Sol hat die Antenne auf dem Dach verdoppelt und zwei weitere Funkerinnen gewonnen: Jeder Ruf kommt schneller durch, jeder Befehl rechtzeitig an. Die eigene Aktion der Mission (Schleusen, Ruf an die Zellen …) lädt deutlich schneller – machen Sie sie zu Ihrer Hauptwaffe.",
      it:"Sol ha raddoppiato l'antenna sul tetto e reclutato altre due operatrici: ogni chiamata passa prima, ogni ordine arriva in tempo. L'azione propria della missione (paratoie, chiamata alle cellule…) si ricarica molto più in fretta: ne faccia la sua arma principale.",
      pt:"Sol dobrou a antena do telhado e recrutou mais duas operadoras: cada chamada passa mais rápido, cada ordem chega a tempo. A ação própria da missão (comportas, chamada às células…) recarrega bem mais rápido — faça dela sua arma principal.",
      ru:"Sol удвоила антенну на крыше и взяла ещё двух радисток: каждый вызов проходит быстрее, каждый приказ приходит вовремя. Особое действие миссии (шлюзы, вызов ячеек…) перезаряжается заметно быстрее — сделайте его главным оружием.",
      zh:"Sol把屋顶的天线加倍了，还多招了两名接线员：每次呼叫都更快接通，每道命令都能及时送达。任务专属行动（开闸、呼叫小组……）的充能明显加快——把它当成您的主要武器吧。",
      ar:"ضاعفت Sol الهوائي على السطح وجنّدت مشغّلتين إضافيتين: كل نداء يمرّ أسرع، وكل أمر يصل في وقته. يُشحن الإجراء الخاص بالمهمة (البوابات، نداء الخلايا…) أسرع بوضوح — اجعله سلاحك الرئيسي."},
    minus:{fr:"L'antenne a coûté cher, et personne ne vient en plus sur le terrain.", en:"The aerial cost a lot, and nobody extra joins you in the field.", es:"La antena costó cara, y nadie más se une sobre el terreno.", de:"Die Antenne war teuer, und niemand kommt zusätzlich ins Feld.", it:"L'antenna è costata cara, e nessuno in più scende in campo.", pt:"A antena custou caro, e ninguém a mais entra em campo.", ru:"Антенна обошлась дорого, и на поле никто не прибавится.", zh:"天线花了不少钱，战场上也不会多出任何人。", ar:"كلّف الهوائي كثيرًا، ولا أحد إضافي ينضمّ في الميدان."},
    fx:{ actCd:0.65, warn:4, res:0.9 } },
};
const campDocPair = i => { const m = CAMPAIGN[i]; return (m && m.doctrines && m.doctrines.length===2)? m.doctrines : null; };
const campDoc = i => { const pair = campDocPair(i); return pair? DOCTRINES[pair[CAMP_SAVE.doc[i]? 1 : 0]] : null; };
function docApply(d, g, c){ const f = d.fx || {}, p = g.p;
  if (f.res){ p.f = Math.round(p.f*f.res); p.m = Math.round(p.m*f.res); p.w = Math.round(p.w*f.res); }
  if (f.baseHp){ p.maxhp = Math.round(p.maxhp*f.baseHp); p.hp = p.maxhp; }
  if (f.squad){ const k0 = p.units.length; campSquad(p, f.squad);
    if (f.vet) for (let j=k0;j<p.units.length;j++){ const u = p.units[j]; u.vet = 1; u.hp *= 1.2; u.maxhp *= 1.2; if (u.dmg) u.dmg *= 1.1; } }   // vétérans : brassard rouge
  if (f.cap){ if (c.capBase==null) c.capBase = p.cap; p.cap = Math.max(10, (p.capUp? 40 : c.capBase) + f.cap); }
  if (f.eco) c.eco = { k:f.eco, until:c.t + 180 };                     // production des bâtiments renforcée 3 minutes
  if (f.actCd) c.actMul = f.actCd;
  if (f.warn) c.warnLead = f.warn;                                     // les missions annoncent leurs arrivées c.warnLead s plus tôt
  if (d.apply) d.apply(g, c); }
// lignes d'effet d'une doctrine, chiffrées depuis fx : [{txt, bad}] (bad = contrepartie) ; era : ère de départ, pour nommer les unités
function docEffects(d, era){ const f = d.fx || {}, out = [], add = (o, n, bad) => out.push({ txt:cT(o).replace('{n}', n), bad:!!bad });
  if (f.res) add(CAMP_UI.fxRes, campPct(f.res), f.res<1);
  if (f.eco) add(CAMP_UI.fxEco, campPct(f.eco));
  if (f.baseHp) add(CAMP_UI.fxBase, campPct(f.baseHp), f.baseHp<1);
  if (f.squad){ const n = {}; f.squad.forEach(r=>{ n[r] = (n[r]||0)+1; });
    out.push({ txt:cT(CAMP_UI.fxSquad).replace('{list}', Object.keys(n).map(r=> n[r]+' × '+lUnit('HUM', ROLES[r].key, era|0)).join(', ')) });
    if (f.vet) add(CAMP_UI.fxVet, ''); }
  if (f.actCd) add(CAMP_UI.fxAct, campPct(2-f.actCd).replace('+',''));
  if (f.warn) add(CAMP_UI.fxWarn, f.warn);
  if (f.cap) add(CAMP_UI.fxCap, (f.cap>0? '+' : '−')+Math.abs(f.cap), f.cap<0);
  return out; }


/* ================= CARTES (v1.16) =================
   Une carte de mission (ou d'acte) décrit le terrain de jeu ; tout ce qui n'y figure pas n'existe PAS
   (plus de lacs 💧 ni de zone bonus d'escarmouche en campagne, sauf si la carte les déclare).
     terrain:{a,f1,b,f2,c,f3,base}   relief propre (sinon celui du lieu)
     p:{x, slots:[décalages]}         notre base : position et socles de construction (décalages depuis la base)
     e:{x, slots:[décalages]|[]}      base ennemie ; slots:[] = elle ne bâtit pas
     neut:[x…]                        socles neutres (sinon ceux de l'escarmouche)
     nodes:[{x, center, owner, look}] points d'eau/ressources (défaut : aucun) ; dessinés par m.drawNode si présent
     zones:[x | {x, owner}]           zones à tenir (défaut : aucune) ; dessinées par m.drawZone
     objects:[{id, x, r, rate, owner, kind, capture}]  objets d'objectif propres à la mission : capturés par le
                                      moteur (unités à moins de r), dessinés par m.drawObj(o,t,vw), m.onCapture(g,c,o,qui)
     bonusZone:true                   rétablit la 4e zone bonus d'escarmouche (désactivée par défaut)        */
const CAMP_SLOTS = [95,159,223];
function campPlaceBase(side, x, slots){
  if (x!=null){ side.x = x; side.adv = x; }
  const offs = slots || (x!=null? CAMP_SLOTS : null);
  if (offs) side.slots = offs.map(o=>({ x: side.x + side.side*o, b:null, owner:null }));
}
function campApplyMap(g, c, map){
  map = map || {};
  const B0 = g.biome && g.biome.base0 || g.biome;
  if (map.terrain && B0){ g.biome = Object.assign(Object.create(B0), { terrain:map.terrain, base0:B0 }); }
  if (map.p) campPlaceBase(g.p, map.p.x, map.p.slots);
  if (map.e) campPlaceBase(g.e, map.e.x, map.e.slots);
  if (map.neut) g.neut = map.neut.map(x=>({ x, b:null, owner:null }));
  g.nodes = (map.nodes || []).map(n=>({ x:n.x, center:!!n.center, look:n.look||null, owner:n.owner||null, prog:n.owner==='p'? 1 : n.owner==='e'? -1 : 0 }));
  g.zones = (map.zones || []).map(z=> typeof z==='number'? { x:z, owner:null, prog:0 } : { x:z.x, owner:z.owner||null, prog:z.owner==='p'? 1 : z.owner==='e'? -1 : 0 });
  g.bonusZone = null; g._bz = !map.bonusZone;
  c.objs = (map.objects || []).map(o=>Object.assign({ r:80, rate:0.1, owner:null, prog:0, capture:true }, o, { prog:o.owner==='p'? 1 : o.owner==='e'? -1 : 0 }));
  c.map = map;
}

/* ================= ACTES (v1.16) : campNextAct(spec) =================
   Une mission en plusieurs actes appelle campNextAct(spec) (typiquement depuis tick, quand l'objectif de
   l'acte est atteint). Le passage joue une cinématique (before → carton d'acte → after), puis le moteur
   applique EXPLICITEMENT ce qui est gardé ou remis à zéro — chaque acte doit être un défi neuf.
     act            numéro du nouvel acte (c.act)            title, sub   carton d'acte ; card:{plate, mus}
     before(g,c)    plans joués avant le changement           after(g,c)   plans joués après (nouveau terrain)
     biome, theme   nouveau lieu / décor ; map:{…}  nouvelle carte (voir CARTES)
     army           'none' | 'hero' | 'all' | {keep:N, hero:true}  (N unités les plus fortes) ; heal:0..1 ; squad:[rôles] en plus
     res:{f,m,w}    ressources fixées (× difficulté) ; xp     XP fixée (défaut : seuil de l'ère)
     buildings      'clear' (défaut : nos socles et socles neutres vidés) | 'keep'
     base:{x, hp, fort, look}   notre base (hp × difficulté) ; ebase:{x, hp, fort, look} base ennemie
     era:{p, e}     ère de chaque camp ; eraCap   plafond d'ère
     ai:{diff, dm, cap}         IA adverse : niveau d'escarmouche, réglages fins (objet ou [f,n,d]), effectif max
     enemy          'clear' (défaut) | 'keep' : machines ennemies sur la carte
     goal, rule, tips           nouvel objectif (annoncé), règle et conseils de l'acte (aide « ? »)
     setup(g,c)     réglages propres à l'acte (minuteurs…), appelé en dernier                              */
function campActKeep(units, army){
  if (army==='all') return units.slice();
  if (army==='none' || !army) return [];
  const hero = units.filter(u=>u.role==='hero');
  if (army==='hero') return hero;
  const rest = units.filter(u=>u.role!=='hero' && u.role!=='gremlin').sort((a,b)=> (b.maxhp + (b.dmg||0)*12) - (a.maxhp + (a.dmg||0)*12));
  return rest.slice(0, army.keep|0).concat(army.hero? hero : []);
}
function campApplyAct(g, c, spec){
  const p = g.p, e = g.e;
  // l'écran est vidé de la bataille précédente
  projectiles = []; shots = []; wrecks = []; deaths = []; particles = []; floaters = []; LIGHTS = [];
  g.craters = []; g.rally = null; g.sel.clear(); g.cata = null; g.cataT = 0; g.weather = null; buildMenu = null;
  if (spec.enemy!=='keep'){ e.units.length = 0; e.gar.length = 0; for (const s of e.slots){ s.b = null; s.owner = null; } }
  for (const s of g.neut) if (s.owner===e && spec.enemy!=='keep'){ s.b = null; s.owner = null; }
  if (spec.biome){ g.biome = typeof spec.biome==='string'? (BIOMES[spec.biome] || g.biome) : spec.biome; }
  if (spec.theme) DECOR = genDecor(spec.theme);
  if (spec.map) campApplyMap(g, c, spec.map);
  if (spec.base){ const b = spec.base; campPlaceBase(p, b.x, b.slots);
    if (b.hp){ p.maxhp = campHp(b.hp, 'p'); p.hp = p.maxhp; } if (b.fort) p.fortLvl = b.fort; if (b.look) p.look = b.look; }
  if (spec.ebase){ const b = spec.ebase; campPlaceBase(e, b.x, b.slots);
    if (b.hp){ e.maxhp = campHp(b.hp, 'e'); e.hp = e.maxhp; } if (b.fort) e.fortLvl = b.fort; if (b.look) e.look = b.look; }
  if ((spec.buildings||'clear')==='clear'){ for (const s of p.slots){ s.b = null; s.owner = null; } for (const s of g.neut) if (s.owner===p){ s.b = null; s.owner = null; } }
  // NOTRE ARMÉE : règle explicite
  const kept = campActKeep(p.units, spec.army);
  p.units.length = 0; p.gar.length = 0; p.queue.length = 0;
  kept.forEach((u,i)=>{ u.x = p.x + p.side*(70 + (i%10)*18 + ((i/10)|0)*6); u.ord = null; u.px = null; u.task = null; u.tx = null;
    if (spec.heal) u.hp = Math.min(u.maxhp, u.hp + u.maxhp*spec.heal); p.units.push(u); });
  p.adv = p.x; p.holdX = null;
  if (spec.era){ if (spec.era.p!=null) campEra(p, spec.era.p); if (spec.era.e!=null) campEra(e, spec.era.e); }
  if (spec.eraCap!=null) g.eraCap = spec.eraCap;
  if (spec.res) campGrant(p, spec.res.f|0, spec.res.m|0, spec.res.w|0);
  if (spec.xp!=null) p.xp = spec.xp;
  if (spec.squad) campSquad(p, spec.squad);
  if (spec.ai){ const a = spec.ai;
    if (a.diff!=null) g.d = Object.assign({}, DIFFS[clamp(a.diff,0,3)]);
    if (a.dm) g.d = Object.assign({}, g.d, Array.isArray(a.dm)? a.dm[c.D.i] : a.dm);
    if (a.cap!=null) e.cap = a.cap; }
  g.aiThink = 2;
  camX = 0; camFollow = true; g.shake = 0;
  c.act = spec.act || (c.act|0)+1; c.t0 = c.t; c.actSpec = spec;
  if (spec.rule) c.ruleTxt = spec.rule;
  if (spec.tips) c.tipsArr = spec.tips;
  if (spec.doctrine!==false){ const d = campDoc(c.i); if (d) docApply(d, g, c); }   // la doctrine vaut au début de CHAQUE acte
  if (spec.setup) spec.setup(g, c);
  if (spec.goal) campGoal(spec.goal);
  prewarmSprites();
}
// carton d'acte par défaut : page de carnet, chiffre romain au pochoir
function campActPlate(n){ return (g, w, h, t) => { plateBase(g, w, h, 'rgba(30,24,20,0.10)');
  g.fillStyle = '#c42a1c'; g.font = '800 120px '+UI_STEN; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.globalAlpha = clamp(t/0.6, 0, 1); g.fillText(['I','II','III','IV','V','VI'][(n|0)-1] || String(n), 240, 120); g.globalAlpha = 1;
  inkLine(g, [140,190, 340,190], clamp(t/1.2,0,1), 2.4); plateEnd(g, w, h); }; }
function campNextAct(spec){
  const g = game, c = g && g.camp; if (!c || c.actPending || g.over) return false;
  c.actPending = true;
  const before = (typeof spec.before==='function'? spec.before(g, c) : spec.before) || [];
  const card = { plate:(spec.card && spec.card.plate) || campActPlate(spec.act || (c.act|0)+1), mus:spec.card && spec.card.mus, title:spec.title, sub:spec.sub, dur:3.4,
    fx(){ if (!c.actPending) return; c.actPending = false; campApplyAct(g, c, spec);
      const more = typeof spec.after==='function'? spec.after(g, c) : spec.after;
      if (more && more.length && CINE.on && CINE.script && CINE.script[CINE.i]===card) CINE.script = CINE.script.slice(0, CINE.i+1).concat(more); } };
  cinePlay(before.concat([card]), null, { keepCam:true });
  return true;
}

// ---- cycle de vie d'une mission ----
function startMission(i){
  const m = CAMPAIGN[i]; if (!m) return;
  const D = campDiff(CAMP_SAVE.diff);
  if (m.dAdj && m.dAdj[D.i]) Object.assign(D, m.dAdj[D.i]);                // une mission peut tempérer un multiplicateur (documenté dans son fichier)
  const keep1 = M1_RETRY && i===0, keep3 = M3_RETRY && i===2, keep4 = M4_RETRY && i===3;       // reprise allégée : seulement pour LA mission perdue
  newGame('HUM', campAiLevel(m, D), false);
  M1_RETRY = keep1; M3_RETRY = keep3; M4_RETRY = keep4;
  const g = game, c = g.camp = { i, m, D, lvl:D.i, t:0, fired:[], q:[], cur:null, log:[], objs:[], act:1, t0:0 };
  if (m.dm && m.dm[D.i]) g.d = Object.assign({}, g.d, m.dm[D.i]);          // réglage fin de l'adversaire pour cette mission
  g.eraCap = m.eraCap; g.devBase = m.dev0 || 0;
  if (m.era0){ campEra(g.p, m.era0); campEra(g.e, m.era0); }
  if (m.oneLife){ g.p.phase = 2; g.e.phase = 2; g.hbombDone = true;      // une base qui tombe est perdue : pas de renaissance ni de bombe H
    g.p.hp = g.p.maxhp = campHp(2200, 'p'); }                             // … la nôtre est donc mieux bâtie (selon la difficulté)
  if (m.oneLife) g.e.heroCd = 1e9;                                       // et l'adversaire n'a pas de héros (un héros rase une base à une vie)
  g.biome = BIOMES[m.biome] || null;                                      // lieu propre à la mission (ciel, fonds, sol, météo, musique)
  c.lights = []; c.litK = 0;
  DECOR = genDecor(m.theme);
  campApplyMap(g, c, m.map);                                              // carte : bases, socles, points d'eau, zones, objets
  if (m.setup) m.setup(g, c);
  { const d = campDoc(i); if (d) docApply(d, g, c); }                      // doctrine choisie pour cette mission
  prewarmSprites();
  const sc = m.intro? m.intro(g, c) : null;                               // cinématique d'ouverture, sur le terrain
  if (sc && sc.length){ g.msgT = 0; cinePlay(sc, null); } else announce(campWhen(m).toUpperCase()+' — '+cT(m.title).toUpperCase(), '#e8d8a0');
}
// fin de mission : cinématique de clôture (si la mission en a une), puis l'écran de fin
function campEndCine(){
  const c = game && game.camp, m = c && c.m, sc = m && m.outro? m.outro(game, c, game.win) : null;
  if (sc && sc.length) cinePlay(sc, showEnd, {keepCam:true}); else showEnd();
}
// bouton d'action propre à la mission (fusée éclairante, vannes…) : m.action = {label, cd, can(g,c), use(g,c)}
function campAct(){
  const c = game && game.camp, a = c && c.m.action; if (!a || game.over || paused || CINE.on) return false;
  if ((c.actCd||0) > 0 || (a.can && !a.can(game, c))){ sfx('deny'); return true; }
  c.actCd = a.cd*(c.actMul||1); a.use(game, c); c.actCd0 = c.actCd; return true;   // la mission peut fixer sa propre durée : la jauge part de la valeur réelle
}
// RADIO : file de messages ; txt = objet {fr,en,…} (de préférence) ou chaîne ; opts.vars = {clé:valeur} pour « {clé} »
function campRadio(who, txt, opts){ const c = game && game.camp; if (!c || !txt) return;
  const obj = typeof txt==='object'? txt : null, vars = opts && opts.vars;
  let s = obj? cT(obj) : String(txt); if (vars) for (const k in vars) s = s.split('{'+k+'}').join(vars[k]);
  c.q.push({ who, txt:s, obj, vars, t:0, dur:clamp(3.2 + s.length/13, 6, 24) });   // durée de lecture d'après la longueur
  if (c.q.length>8) c.q.shift(); }
// NOUVEL OBJECTIF : remplace l'objectif affiché, l'annonce (bandeau + son) et l'écrit dans le journal radio
function campGoal(txt){ const c = game && game.camp; if (!c || !txt) return;
  c.goalTxt = txt; c.banner = { head:CAMP_UI.newGoal, txt, t0:performance.now() }; c.goalFlash = 3;
  c.log.push({ who:'goal', txt:cT(txt), t:c.t }); sfx('evolve'); }
// appelée par update() à chaque pas ; true = la mission vient de se terminer
function campTick(dt){
  const g = game, c = g.camp, m = c.m, D = c.D;
  c.t += dt;
  // DIFFICULTÉ : chaque machine ennemie, à son apparition, prend la vie et les dégâts du niveau choisi
  for (const u of g.e.units) if (!u._cd){ u._cd = 1; if (D.eHp!==1){ u.hp *= D.eHp; u.maxhp *= D.eHp; } if (D.eDmg!==1 && u.dmg) u.dmg *= D.eDmg; }
  for (let i=0;i<m.radio.length;i++){ if (c.fired[i]) continue; const r = m.radio[i];
    if (r.at!=null? c.t>=r.at : r.when(g, c)){ c.fired[i] = 1; if (r.txt) campRadio(r.who, r.txt); if (r.fx) r.fx(g, c);
      if (r.cine){ const sc = r.cine(g, c); if (sc && sc.length) cinePlay(sc, null); } } }
  if (c.actCd>0) c.actCd -= dt;
  // LAISSE : aucune de nos troupes ne dépasse c.leash (escorte : on reste avec ceux qu'on protège)
  if (c.leash!=null){ const L = c.leash;
    for (const u of g.p.units){ if (u.px!=null && u.px > L) u.px = L; if (u.x > L){ u.x = L; if (u.tx > L) u.tx = L; c.leashHit = c.t; } } }
  // OBJETS D'OBJECTIF : capturés comme des zones (unités à moins de r)
  for (const o of c.objs){ if (!o.capture) continue; let np = 0, ne = 0;
    for (const u of g.p.units) if (Math.abs(u.x-o.x) < o.r) np++;
    for (const u of g.e.units) if (Math.abs(u.x-o.x) < o.r) ne++;
    const push = clamp(np-ne, -3, 3)*o.rate*dt; if (!push) continue;
    o.prog = clamp(o.prog + push, -1, 1);
    if (o.prog>=1 && o.owner!=='p'){ o.owner = 'p'; sfx('node'); if (m.onCapture) m.onCapture(g, c, o, 'p'); }
    if (o.prog<=-1 && o.owner!=='e'){ o.owner = 'e'; if (m.onCapture) m.onCapture(g, c, o, 'e'); } }
  // OBJECTIF SECONDAIRE : surveillé via hud().goal2.done
  if (m.goal2 && !c.goal2Done && m.hud && ((c.g2k = (c.g2k|0)+1) % 10)===0){ const h = m.hud(g, c);
    if (h && h.goal2 && h.goal2.done){ c.goal2Done = true; c.banner = { head:CAMP_UI.bonusDone, txt:m.goal2, t0:performance.now() }; sfx('evolve'); } }
  // RADIO : messages lus en temps réel ; une file longue défile un peu plus vite
  const rdt = dt / (g.speed||1) * (c.q.length>=3? 1.4 : 1);
  if (c.cur){ c.cur.t += rdt; if (c.cur.t>=c.cur.dur) c.cur = null; }
  if (!c.cur && c.q.length){ const r = c.cur = c.q.shift(); sfx('cap');
    c.log.push({ who:r.who, txt:r.txt, t:c.t }); if (c.log.length>40) c.log.shift();
    // VOIX : point d'appel UNIQUE de la voix off des transmissions (16c0-voice.js) ; le message reste affiché le temps de la voix
    if (typeof voiceSay==='function'){ try { r.dur = Math.max(r.dur, (+voiceSay(r.who, r.txt, { radio:true })||0) + 1.2); } catch(e){} } }
  if (c.goalFlash>0) c.goalFlash -= dt;
  if (c.eco && c.t < c.eco.until){ const R = calcRates(g.p), k = c.eco.k-1; g.p.f += R.f*k*dt; g.p.m += R.m*k*dt; g.p.w += R.w*k*dt; }   // doctrine « caisse »
  const r = m.tick? m.tick(g, c, dt) : null;
  if (r && !g.over){ g.over = true; g.win = (r==='win'); g.shake = 14; sfx(g.win? 'evolve' : 'boom'); setTimeout(campEndCine, 1100); return true; }
  return false;
}
// fin de mission : enregistre la progression (une seule fois) et renvoie le texte du compte rendu
function campResult(){
  const c = game.camp, m = c.m;
  if (game.win && !c._recorded){ c._recorded = true;
    CAMP_SAVE.done = Math.max(CAMP_SAVE.done, c.i+1);
    if (!(CAMP_SAVE.best[c.i] > 0) || game.t < CAMP_SAVE.best[c.i]) CAMP_SAVE.best[c.i] = Math.round(game.t);
    if (c.goal2Done) CAMP_SAVE.bonus[c.i] = 1;
    campSave(); }
  let s = cT(game.win? m.debrief : m.fail);
  if (m.goal2) s += '\n'+cT(CAMP_UI.bonusEnd).replace('{s}', cT(c.goal2Done? CAMP_UI.okS : CAMP_UI.missS)+' — '+cT(m.goal2));
  return s;
}
// lance VRAIMENT une mission (cinématique d'ouverture puis partie) — appelé par le bouton du briefing
function campStart(i){
  if (!game) netDisconnect();
  campBriefClose(false);
  audioInit(); musicStart(); goFullscreen();
  $('menu').style.display = 'none'; $('endscreen').style.display = 'none';
  intro = -1; pendingStart = null; paused = false; settingsOpen = false; buildMenu = null;
  startMission(i);
}
// ouvre le BRIEFING de la mission i (menu, « mission suivante », « réessayer ») : on ne saute jamais le dossier
function campLaunch(i){ campBriefOpen(i); }


/* ================= EN MISSION : objectif, aide « ? », radio, bandeau, objets du terrain ================= */
const campWhoName = who => { if (who==='k55') return cT(CAMP_UI.radioK);
  const w = CINE_WHO[who], n = w && w.name? (typeof w.name==='string'? w.name : cT(w.name)) : String(who||'sol').toUpperCase();
  return cT(CAMP_UI.radioSol).replace('SOL', n); };
const CAMP_TRUNC = new Map();                                              // texte tronqué mémorisé (police + largeur + texte) : pas de mesure caractère par caractère à chaque image
function campTrunc(s, maxW){ const k = ctx.font+'|'+Math.round(maxW)+'|'+s, hit = CAMP_TRUNC.get(k); if (hit!==undefined) return hit;
  let r = s; if (ctx.measureText(r).width > maxW){ while (r.length>1 && ctx.measureText(r+'…').width > maxW) r = r.slice(0,-1); r += '…'; }
  if (CAMP_TRUNC.size>300) CAMP_TRUNC.clear(); CAMP_TRUNC.set(k, r); return r; }
// étiquette d'objectif (haut droite) + bouton « ? » + action de mission + bandeau + transmission radio
function drawCampHUD(){
  const c = game.camp; if (!c || game.over) return;
  const pal = uiPal(), m = c.m, h = (m.hud? m.hud(game, c) : null) || {};
  // OBJECTIF : étiquette de papier sous le bandeau, à droite — toujours visible, progression comprise
  const w = clamp(Math.round(W*0.23), 236, 300), x = W-w-8, y = 43;
  ctx.font = uiF(pal,'cond',11.5); const lines = newsWrap(cT(c.goalTxt || m.goal), w-18).slice(0,3);
  const bar = h.prog!=null || h.clock!=null, g2 = !!m.goal2;
  const hh = 19 + lines.length*13 + (bar? 13 : 0) + (g2? 14 : 0) + 2;
  c.objH = hh; c.objRect = { x, y, w, h:hh };
  paperChip(x, y, w, hh, pal);
  ctx.fillStyle = pal.red; ctx.fillRect(x, y, 3, hh);
  if (c.goalFlash>0 && Math.sin(performance.now()/120)>0){ ctx.strokeStyle = pal.red; ctx.lineWidth = 2; ctx.strokeRect(x+1, y+1, w-2, hh-2); }
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = '8.5px '+UI_TYPE; ctx.fillStyle = pal.red;
  ctx.fillText(cT(CAMP_UI.goal)+' · '+(m.num||'')+(c.act>1? ' · '+cT(CAMP_UI.act).replace('{n}', c.act) : ''), x+9, y+8.5);
  ctx.font = uiF(pal,'cond',11.5); ctx.fillStyle = pal.ink;
  lines.forEach((l,k)=> ctx.fillText(l, x+9, y+21+k*13));
  let yy = y + 19 + lines.length*13;
  if (bar){ const by = yy+3, bw = w-18-(h.clock!=null? 40 : 0)-(h.label? 4 : 0);
    let lx = x+9;
    if (h.label){ ctx.font = '8.5px '+UI_TYPE; ctx.fillStyle = pal.ink2; ctx.fillText(h.label, lx, by+2); lx += ctx.measureText(h.label).width+6; }
    const gw = Math.max(20, x+9+bw-lx);
    ctx.fillStyle = pal.line; ctx.fillRect(lx, by, gw, 4);
    ctx.fillStyle = h.warn? pal.bad : pal.red; ctx.fillRect(lx, by, gw*clamp(h.prog||0, 0, 1), 4);
    if (h.clock!=null){ ctx.font = uiF(pal,'cond',12); ctx.textAlign = 'right';
      ctx.fillStyle = (h.warn && Math.sin(performance.now()/160)>0)? pal.bad : pal.ink; ctx.fillText(fmtTime(h.clock), x+w-8, by+2); ctx.textAlign = 'left'; }
    yy += 13; }
  if (g2){ const done = c.goal2Done || (h.goal2 && h.goal2.done), lab = done? '✓' : (h.goal2 && h.goal2.label) || '';
    ctx.font = '8.5px '+UI_TYPE; ctx.fillStyle = done? pal.ok : pal.ink2; const lw = lab? ctx.measureText(lab).width+8 : 0;
    ctx.fillText(campTrunc('✦ '+cT(m.goal2), w-18-lw), x+9, yy+6);
    if (lab){ ctx.textAlign = 'right'; ctx.fillText(lab, x+w-8, yy+6); ctx.textAlign = 'left'; } }
  // AIDE « ? » : rappelle l'objectif, la règle du lieu, les conseils et le journal radio (le jeu se met en pause)
  { const b = c.helpRect = { x:x-31, y, w:27, h:27 };
    paperChip(b.x, b.y, b.w, b.h, pal); ctx.strokeStyle = pal.red; ctx.lineWidth = 1.5; ctx.strokeRect(b.x+2.5, b.y+2.5, b.w-5, b.h-5);
    ctx.textAlign = 'center'; ctx.font = uiF(pal,'head',15); ctx.fillStyle = pal.red; ctx.fillText('?', b.x+b.w/2, b.y+b.h/2+1); }
  // ACTION DE MISSION : bon à découper sous l'objectif (grisé pendant la recharge)
  c.actRect = null;
  if (m.action){ const a = m.action, aw = 150, ax = W-aw-8, ay = 43 + hh + 6, ah = 26, cd = Math.max(0, c.actCd||0), ok = cd<=0 && (!a.can || a.can(game, c));
    c.actRect = {x:ax, y:ay, w:aw, h:ah};
    paperChip(ax, ay, aw, ah, pal); ctx.fillStyle = ok? pal.red : pal.line; ctx.fillRect(ax, ay, aw, 2.5);
    if (cd>0){ ctx.fillStyle = 'rgba(60,50,40,0.16)'; ctx.fillRect(ax, ay, aw*clamp(cd/(c.actCd0||a.cd*(c.actMul||1)),0,1), ah); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = uiF(pal,'cond',11.5); ctx.fillStyle = ok? pal.ink : pal.ink2;
    ctx.fillText(cT(a.label)+(cd>0? '  '+Math.ceil(cd)+' s' : ''), ax+aw/2, ay+ah/2+1.5); }
  campDrawBanner(pal);
  campDrawRadio(pal);
}
// bandeau « NOUVEL OBJECTIF » / « OBJECTIF SECONDAIRE ACCOMPLI » (au-dessus du champ de bataille, sous la radio)
function campDrawBanner(pal){
  const c = game.camp, b = c.banner; if (!b) return;
  const t = (performance.now() - b.t0)/1000; if (t > 5){ c.banner = null; return; }
  const a = Math.min(1, t/0.3, (5-t)/0.6), bw = Math.min(560, W-80), x = (W-bw)/2, y = 214;
  ctx.font = uiF(pal,'cond',14); const lines = newsWrap(cT(b.txt), bw-30).slice(0,3), bh = 28 + lines.length*17;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1-a)*-8);
  paperChip(x, y, bw, bh, pal); ctx.fillStyle = pal.red; ctx.fillRect(x, y, bw, 3);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = uiF(pal,'head',11); ctx.fillStyle = pal.red; ctx.fillText(cT(b.head), W/2, y+13);
  ctx.font = uiF(pal,'cond',14); ctx.fillStyle = pal.ink; lines.forEach((l,k)=> ctx.fillText(l, W/2, y+31+k*17));
  ctx.restore();
}
// RADIO : feuillet tapé à la machine (Sol, Mado…) ou listing de bipeur (Kassandre) ; touchez-le pour passer au suivant
function campDrawRadio(pal){
  const c = game.camp, r = c.cur; c.radioRect = null; if (!r) return;
  const a = Math.min(1, r.t/0.35, (r.dur-r.t)/0.6); if (a<=0) return;
  const k55 = r.who==='k55', qn = (game.p.queue||[]).length;
  const x0 = 6, y0 = 43 + (qn? 30 : 0), maxW = clamp(W/2 - 140 - x0, 240, 470);
  const font = k55? '13.5px "AGI Term","Courier New",monospace' : '13px '+UI_TYPE;
  ctx.font = font; let lines = newsWrap(r.txt, maxW-22);
  if (lines.length>7){ lines = lines.slice(0,7); lines[6] = campTrunc(lines[6], maxW-30); }
  const lh = 16, hh = 25 + lines.length*lh;
  c.radioRect = { x:x0, y:y0, w:maxW, h:hh };
  ctx.save(); ctx.globalAlpha = a; ctx.translate((1-a)*-10, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(x0+2, y0+3, maxW, hh);
  ctx.fillStyle = k55? '#e9f0e6' : pal.paper; ctx.fillRect(x0, y0, maxW, hh);
  if (k55){ ctx.fillStyle = 'rgba(95,160,110,0.18)'; for (let yy=y0+6; yy<y0+hh; yy+=12) ctx.fillRect(x0, yy, maxW, Math.min(6, y0+hh-yy)); }
  else { ctx.fillStyle = paperGrain(); ctx.fillRect(x0, y0, maxW, hh); }
  ctx.fillStyle = k55? '#0b6fa8' : '#c42a1c'; ctx.fillRect(x0, y0, maxW, 2.5);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = '9px '+UI_TYPE; ctx.fillText(campWhoName(r.who), x0+9, y0+11);
  if (c.q.length){ ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(31,27,23,0.6)'; ctx.fillText(cT(CAMP_UI.waiting).replace('{n}', c.q.length), x0+maxW-22, y0+11); ctx.textAlign = 'left'; }
  ctx.fillStyle = k55? '#0b6fa8' : '#c42a1c';
  if (Math.sin(performance.now()/260)>0 && r.t<r.dur-1){ ctx.beginPath(); ctx.arc(x0+maxW-11, y0+11, 2.6, 0, 6.283); ctx.fill(); }   // voyant d'émission
  ctx.font = font; ctx.fillStyle = k55? '#10262d' : '#1f1b17';
  lines.forEach((l,k)=> ctx.fillText(l, x0+9, y0+26+k*lh));
  ctx.restore();
}
// objets de la mission dans le monde (repère monde−camX) : dessin propre, objets d'objectif, laisse, bouclier
function campDrawWorld(vw){
  const g = game, c = g.camp, m = c.m, t = g.t;
  if (m.draw) m.draw(g, c, vw);
  for (const o of c.objs){ const x = o.x-camX; if (x<-90 || x>vw+90) continue;
    if (m.drawObj){ m.drawObj(o, t, vw); continue; }
    const y = gY(o.x), col = o.owner==='p'? g.p.fac.accent : o.owner==='e'? g.e.fac.accent : '#9a8a78';     // repère par défaut : fanion
    ctx.strokeStyle = '#3a3028'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y-50); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y-50); ctx.lineTo(x+24, y-44+Math.sin(t*3)*2); ctx.lineTo(x, y-36); ctx.closePath(); ctx.fill();
    if (Math.abs(o.prog)>0.01 && Math.abs(o.prog)<1){ ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x-22, y-62, 44, 5); ctx.fillStyle = o.prog>0? g.p.fac.accent : g.e.fac.accent; ctx.fillRect(x-22, y-62, 44*Math.abs(o.prog), 5); } }
  const pal = UIPAL.HUM;
  // LAISSE : ligne pointillée au-delà de laquelle nos troupes ne vont pas (escorte)
  if (c.leash!=null){ const x = c.leash-camX; if (x>-40 && x<vw+40){ const y = gY(c.leash);
    ctx.save(); ctx.strokeStyle = 'rgba(232,216,170,0.85)'; ctx.lineWidth = 2; ctx.setLineDash([6,6]); ctx.beginPath(); ctx.moveTo(x, y+6); ctx.lineTo(x, y-120); ctx.stroke(); ctx.restore();
    if (c.leashLabel){ ctx.font = '9px '+UI_TYPE; const s = cT(c.leashLabel), tw = ctx.measureText(s).width+14;
      paperChip(x-tw/2, y-140, tw, 16, pal); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = pal.ink; ctx.fillText(s, x, y-131.5); } } }
  // BOUCLIER : un objectif invulnérable est TOUJOURS signalé (icône + « invulnérable tant que… »)
  if (c.shield){ const sx = (c.shield.x!=null? c.shield.x : g.e.x-30), x = sx-camX; if (x>-160 && x<vw+160){ const y = gY(sx) - (c.shield.h||190);
    ctx.font = '700 11px '+UI_TYPE; const l1 = '🛡 '+cT(CAMP_UI.inv); ctx.font = '9.5px '+UI_TYPE; const l2 = cT(c.shield.label||{});
    const tw = Math.max(110, ctx.measureText(l2).width+18), x0 = clamp(x-tw/2, 4, vw-tw-4);
    paperChip(x0, y, tw, 34, pal); ctx.fillStyle = '#0b6fa8'; ctx.fillRect(x0, y, tw, 3);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#0b6fa8'; ctx.font = '700 11px '+UI_TYPE; ctx.fillText(l1, x0+tw/2, y+12);
    ctx.fillStyle = pal.ink; ctx.font = '9.5px '+UI_TYPE; ctx.fillText(l2, x0+tw/2, y+25);
    const p = 0.35 + 0.25*Math.sin(t*3); ctx.strokeStyle = 'rgba(90,190,255,'+p.toFixed(2)+')'; ctx.lineWidth = 2;   // halo de bouclier sur la base
    ctx.beginPath(); ctx.ellipse(sx-camX+10, gY(sx)-60, 90, 80, 0, Math.PI, 0); ctx.stroke(); } }
}
// AIDE « ? » : panneau en pause (objectif, règle, conseils, journal radio)
function campHelp(on){ const c = game && game.camp; if (!c) return;
  if (on && !c.help){ c.help = true; c.helpPaused = paused; paused = true; sfx('sel'); }
  else if (!on && c.help){ c.help = false; if (!c.helpPaused) paused = false; sfx('sel'); } }
function drawCampOverlay(){
  const c = game.camp; if (!c || !c.help) return;
  const pal = uiPal(), m = c.m;
  ctx.fillStyle = 'rgba(8,6,6,0.6)'; ctx.fillRect(0,0,W,H);
  const pw = Math.min(W-30, 900), ph = Math.min(H-40, 480), px = (W-pw)/2, py = (H-ph)/2;
  paperPanel(px, py, pw, ph, pal, {tape:true});
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = uiF(pal,'head',19); ctx.fillStyle = pal.ink;
  ctx.fillText(campTrunc((m.num||'')+' · '+cT(m.title).toUpperCase(), pw-200), px+18, py+24);
  ctx.font = '10px '+UI_TYPE; ctx.fillStyle = pal.ink2; ctx.textAlign = 'right'; ctx.fillText(campWhen(m)+' · '+cT(m.place), px+pw-18, py+24); ctx.textAlign = 'left';
  ctx.fillStyle = pal.ink; ctx.fillRect(px+16, py+38, pw-32, 2);
  const colW = (pw-50)/2, lx = px+18, rx = px+32+colW, top = py+54, bottom = py+ph-52;
  let y = top;
  const head = (txt, X, Y) => { Y += (Y>top? 6 : 0); ctx.font = uiF(pal,'head',11); ctx.fillStyle = pal.red; ctx.fillText(txt, X, Y); return Y+15; };
  const para = (txt, X, Y, f, col, maxL) => { ctx.font = f || '11.5px '+UI_TYPE; ctx.fillStyle = col || pal.ink; let L = newsWrap(txt, colW-6); if (maxL && L.length>maxL){ L = L.slice(0,maxL); L[maxL-1] = campTrunc(L[maxL-1]+' …', colW-6); }
    for (const l of L){ if (Y > bottom) break; ctx.fillText(l, X, Y); Y += 14; } return Y+4; };
  y = head(cT(CAMP_UI.goal), lx, y); y = para(cT(c.goalTxt || m.goal), lx, y, uiF(pal,'cond',13));
  if (m.goal2){ y = head(cT(CAMP_UI.goal2)+(c.goal2Done? ' ✓' : ''), lx, y); y = para(cT(m.goal2), lx, y); }
  y = head(cT(CAMP_UI.rule), lx, y); y = para(cT(c.ruleTxt || m.rule), lx, y, null, null, 7);
  const tips = c.tipsArr || m.tips || [];
  if (tips.length && y < bottom-20){ y = head(cT(CAMP_UI.tips), lx, y); for (const tp of tips){ if (y > bottom-10) break; y = para('• '+cT(tp), lx, y, null, null, 3) - 2; } }
  // journal radio, du plus récent au plus ancien
  let ry = head(cT(CAMP_UI.radioLog), rx, top);
  const log = c.log.slice().reverse();
  if (!log.length) para(cT(CAMP_UI.noLog), rx, ry, null, pal.ink2);
  for (const e of log){ if (ry > bottom-14) break;
    ctx.font = '8.5px '+UI_TYPE; ctx.fillStyle = e.who==='goal'? pal.red : pal.ink2;
    ctx.fillText(fmtTime(e.t)+'  '+(e.who==='goal'? cT(CAMP_UI.newGoal) : campWhoName(e.who)), rx, ry); ry += 12;
    ry = para(e.txt, rx, ry, '10.5px '+UI_TYPE, pal.ink, 4); }
  // reprendre
  const bw = 210, bh = 32, bx = W/2-bw/2, by = py+ph-44;
  inkStamp(bx, by, bw, bh, '▶ '+cT(CAMP_UI.resume), pal, 15);
  ctx.font = '9px '+UI_TYPE; ctx.fillStyle = pal.ink2; ctx.textAlign = 'right'; ctx.fillText('? · '+cT(CAMP_UI.helpKey), px+pw-18, by+bh/2);
  c.helpRects = { panel:{x:px, y:py, w:pw, h:ph}, resume:{x:bx, y:by, w:bw, h:bh} };
}
// clics de campagne (appelée avant tout le reste par 22-input) : true = consommé
function campClick(sx, sy){ const c = game.camp; if (!c) return false;
  const inR = r => r && sx>=r.x && sx<=r.x+r.w && sy>=r.y && sy<=r.y+r.h;
  if (c.help){ if (inR(c.helpRects && c.helpRects.resume) || !inR(c.helpRects && c.helpRects.panel)) campHelp(false); return true; }   // panneau modal
  if (inR(c.helpRect)){ campHelp(true); return true; }
  if (c.cur && inR(c.radioRect) && c.cur.t > 0.6){ c.cur.t = Math.max(c.cur.t, c.cur.dur-0.6); return true; }   // touche le feuillet : message suivant
  if (c.m.action && inR(c.actRect)) return campAct();
  return false; }
// clavier : O (ou « / ») ouvre/ferme l'aide ; Échap la ferme ; le briefing se ferme avec Échap
window.addEventListener('keydown', e=>{
  if (CAMP_BRIEF.open){ if (e.code==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); campBriefClose(true); } return; }
  const c = (typeof game!=='undefined' && game)? game.camp : null; if (!c || game.over || CINE.on) return;
  if (typeof keyWait!=='undefined' && keyWait) return;
  const bound = Object.values(SETTINGS.keys||{}).includes(e.code), key = (e.code==='KeyO' || e.code==='Slash') && !bound;
  if (c.help){ e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat && (key || e.code==='Escape' || e.code==='Enter' || e.code==='Space')) campHelp(false); return; }
  if (key && !e.repeat){ e.preventDefault(); e.stopImmediatePropagation(); campHelp(true); }
}, true);


/* ================= BRIEFING (v1.16) : dossier de mission plein écran, entre deux missions =================
   Ouvert par le carnet (menu), par « mission suivante » et par « réessayer » : récit, lieu, objectif(s),
   règle du lieu, conseils, difficulté, doctrine (deux fiches), puis LANCER → cinématique → mission.
   Musique de fond : thème 'c_map' s'il existe (03-audio), sinon 'carnet'.                                   */
const CAMP_BRIEF = { open:false, i:0 };
function campBriefOpen(i){
  i = clamp(i|0, 0, Math.min(CAMPAIGN.length-1, CAMP_SAVE.done)); if (!CAMPAIGN[i]) return;
  if (typeof game!=='undefined' && game && game.camp){ if (CINE.on) cineEnd(true); game = null; }   // on quitte la mission terminée
  CAMP_BRIEF.open = true; CAMP_BRIEF.i = i;
  $('menu').style.display = 'none'; $('endscreen').style.display = 'none';
  intro = -1; pendingStart = null; paused = false; settingsOpen = false; buildMenu = null;
  try { audioInit(); musicStart(); } catch(e){}
  campBriefRender();
  const el = $('campBrief'); el.style.display = 'flex';
  const body = el.querySelector('.cbBody'); if (body) body.scrollTop = 0;
}
function campBriefClose(toMenu){
  const el = $('campBrief'); if (el) el.style.display = 'none';
  const was = CAMP_BRIEF.open; CAMP_BRIEF.open = false;
  if (toMenu && was){ $('menu').style.display = 'flex'; campView = -1; const tb = document.querySelector('.tab[data-page="camp"]'); if (tb) tb.click(); else campRenderMenu(); }
}
// musique du briefing : on enveloppe le choix de thème de 03-audio (sans le modifier) — un seul point d'entrée
if (typeof musicMode==='function'){ const _musicMode = musicMode;
  musicMode = function(){ if (CAMP_BRIEF.open && !game) return MUSIC_THEMES.c_map? 'c_map' : 'carnet'; return _musicMode(); }; }
function campBriefRender(){
  const box = $('campBrief'); if (!box) return;
  const i = CAMP_BRIEF.i, m = CAMPAIGN[i]; if (!m) return;
  const keep = box.querySelector('.cbBody'), st = keep? keep.scrollTop : 0;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt!=null) e.textContent = txt; return e; };
  const sec = (title, cls) => { const s = el('section', 'cbSec'+(cls? ' '+cls : '')); s.appendChild(el('h3', null, title)); return s; };
  box.textContent = '';
  const sheet = el('div', 'cbSheet'); box.appendChild(sheet);
  // en-tête : numéro, titre, lieu
  const head = el('div', 'cbHead'); head.appendChild(el('span', 'cbNo', m.num || ''));
  const ht = el('div', 'cbHT'); ht.appendChild(el('div', 'cbKick', cT(CAMP_UI.carnet)+' '+(m.num||'')+' · '+campWhen(m)));
  ht.appendChild(el('div', 'cbTitle', cT(m.title))); ht.appendChild(el('div', 'cbPlace', cT(m.place)));
  head.appendChild(ht); sheet.appendChild(head);
  const body = el('div', 'cbBody'); sheet.appendChild(body);
  const L = el('div', 'cbCol'), R = el('div', 'cbCol'); body.appendChild(L); body.appendChild(R);
  // récit
  { const s = sec(cT(CAMP_UI.recap));
    const prev = i>0 && CAMPAIGN[i-1] && CAMPAIGN[i-1].debrief;
    if (prev){ const q = el('blockquote', 'cbPrev'); q.appendChild(el('b', null, cT(CAMP_UI.prev)+' ')); q.appendChild(document.createTextNode(cT(prev))); s.appendChild(q); }
    for (const p of campParas(m, 'recap')) s.appendChild(el('p', null, p));
    L.appendChild(s); }
  { const s = sec(cT(CAMP_UI.where)); s.appendChild(el('p', 'cbWhere', cT(m.place)));
    for (const p of campParas(m, 'where')) s.appendChild(el('p', null, p));
    L.appendChild(s); }
  // ordres
  { const s = sec(cT(CAMP_UI.goal), 'cbGoal'); s.appendChild(el('p', 'cbGoalTxt', cT(m.goal)));
    if (m.goal2){ s.appendChild(el('h4', null, cT(CAMP_UI.goal2)+(CAMP_SAVE.bonus[i]? ' ★' : ''))); s.appendChild(el('p', null, cT(m.goal2))); }
    R.appendChild(s); }
  { const s = sec(cT(CAMP_UI.rule)); s.appendChild(el('p', null, cT(m.rule))); R.appendChild(s); }
  if (m.tips && m.tips.length){ const s = sec(cT(CAMP_UI.tips)), ul = el('ul', 'cbTips'); for (const tp of m.tips) ul.appendChild(el('li', null, cT(tp))); s.appendChild(ul); R.appendChild(s); }
  // difficulté (réglage de la campagne, rappelé ici)
  { const s = sec(cT(CAMP_UI.diffLbl), 'cbDiff'), row = el('div', 'cbPills');
    [0,1,2].forEach(k=>{ const b = el('button', 'cbPill'+(CAMP_SAVE.diff===k? ' sel' : ''), cT(CAMP_UI['d'+k]));
      b.addEventListener('click', ()=>{ CAMP_SAVE.diff = k; campSave(); campBriefRender(); }); row.appendChild(b); });
    s.appendChild(row); const D = campDiff(CAMP_SAVE.diff); if (m.dAdj && m.dAdj[D.i]) Object.assign(D, m.dAdj[D.i]);   // comme startMission()
    s.appendChild(el('p', 'cbDiffTag', cT(CAMP_UI['dTag'+D.i])));
    const ul = el('ul', 'cbDiffLines'); for (const l of campDiffLines(D, m)) ul.appendChild(el('li', null, l)); s.appendChild(ul);
    R.appendChild(s); }
  // doctrine : deux fiches, explications longues
  { const s = sec(cT(CAMP_UI.doc), 'cbDocs'), pair = campDocPair(i);
    s.appendChild(el('p', 'cbHint', cT(pair? CAMP_UI.docHint : CAMP_UI.noDoc)));
    if (pair){ const cards = el('div', 'cbCards');
      pair.forEach((id,k)=>{ const d = DOCTRINES[id], sel = (CAMP_SAVE.doc[i]? 1 : 0)===k;
        const cd = el('div', 'cbDoc'+(sel? ' sel' : '')); cd.setAttribute('role', 'button'); cd.tabIndex = 0;
        cd.appendChild(el('span', 'cbMark', cT(CAMP_UI.chosen)));
        cd.appendChild(el('b', 'cbDocName', cT(d.name))); cd.appendChild(el('i', 'cbDocShort', cT(d.short)));
        const fx = el('div', 'cbFx'); fx.appendChild(el('h5', null, cT(CAMP_UI.effect))); const ul = el('ul');
        const eff = docEffects(d, m.era0||0);
        for (const l of eff) if (!l.bad) ul.appendChild(el('li', null, l.txt)); fx.appendChild(ul); cd.appendChild(fx);
        if (m.docWhy && m.docWhy[id]) cd.appendChild(el('p', 'cbWhy', cT(m.docWhy[id])));            // « Utile ici parce que… » (propre à la mission)
        cd.appendChild(el('p', 'cbDocLong', cT(d.long)));
        const bad = eff.filter(l=>l.bad);
        if (d.minus || bad.length){ const mi = el('div', 'cbMinus'); mi.appendChild(el('h5', null, cT(CAMP_UI.minus)));
          if (bad.length){ const ub = el('ul'); for (const l of bad) ub.appendChild(el('li', null, l.txt)); mi.appendChild(ub); }
          if (d.minus) mi.appendChild(el('p', null, cT(d.minus))); cd.appendChild(mi); }
        const pick = ()=>{ if (k) CAMP_SAVE.doc[i] = 1; else delete CAMP_SAVE.doc[i]; campSave(); campBriefRender(); };
        cd.addEventListener('click', pick); cd.addEventListener('keydown', ev=>{ if (ev.key==='Enter' || ev.key===' '){ ev.preventDefault(); pick(); } });
        cards.appendChild(cd); });
      s.appendChild(cards); }
    body.appendChild(s); }
  // pied : retour / lancer
  const foot = el('div', 'cbFoot');
  const back = el('button', 'cbBack', (SETTINGS.lang==='ar'? '→ ' : '← ')+cT(CAMP_UI.back)); back.addEventListener('click', ()=>campBriefClose(true));
  const rs = m.resume && m.resume();                                                  // point de reprise d'une mission (grille / acte) : visible et effaçable
  if (rs){ const row = el('div', 'cbResume'); row.appendChild(el('b', null, cT(CAMP_UI[rs.key]).replace('{n}', rs.n)+'  '));
    const rb = el('button', 'cbBack', cT(CAMP_UI.restart)); rb.addEventListener('click', ()=>{ m.resumeClear(); campBriefRender(); });
    row.appendChild(rb); foot.appendChild(row); }
  const go = el('button', 'go cbGo', cT(CAMP_UI.launch)); go.addEventListener('click', ()=>campStart(i));
  foot.appendChild(back); foot.appendChild(go); sheet.appendChild(foot);
  body.scrollTop = st;
}


// carte de la région dessinée à l'encre : le trajet de Germinal, de Valmont à la citadelle
const CAMP_PINS = [[58,96],[150,112],[236,56],[330,40],[420,84]];
function campMap(){
  const cv = document.createElement('canvas'); cv.width = 960; cv.height = 280; cv.className = 'campMap';
  cv.style.cssText = 'width:100%;max-width:520px;display:block;margin:6px auto 10px;border:1.5px solid #1f1b17;';
  const g = cv.getContext('2d'); g.scale(2,2); g.drawImage(cinePaper(), 0, 0, 480, 140);
  inkWash(g, [0,140, 0,118, 60,124, 120,132, 190,128, 200,140], '#0b6fa8', 0.20);                         // l'estuaire
  inkLine(g, [0,118, 60,124, 120,132, 190,128, 204,140], 1, 1.2, '#0b6fa8');
  inkLine(g, [196,132, 220,96, 232,70, 240,56, 250,30, 262,8], 1, 1.4, '#0b6fa8');                         // la rivière, jusqu'au barrage
  for (const [x,y,s] of [[250,34,16],[274,28,22],[300,22,26],[352,18,24],[380,24,18],[214,40,14]]){        // montagnes
    inkLine(g, [x-s,y+s*0.7, x,y-s*0.5, x+s,y+s*0.7], 1, 1.3); inkHatch(g, x, y-s*0.4, s, s*1.1, 4, '#1f1b17', 0.25); }
  for (const [x,y] of [[34,84],[46,78],[70,82],[80,92],[132,98],[166,102],[400,70],[436,72],[446,92]]){ g.fillStyle = 'rgba(31,27,23,0.55)'; g.fillRect(x, y, 7, 6+((x*7)%5)); }   // bâti
  inkLine(g, [20,104, 110,108, 200,112, 300,104, 400,100, 470,96], 1, 0.8, 'rgba(31,27,23,0.5)');          // voie ferrée
  for (let x=30; x<470; x+=12){ g.strokeStyle = 'rgba(31,27,23,0.4)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, 102+((x/90)|0)*0.8); g.lineTo(x, 108+((x/90)|0)*0.8); g.stroke(); }
  const pts = []; CAMP_PINS.forEach(p => pts.push(p[0], p[1]));
  g.setLineDash([5,4]); inkLine(g, pts.slice(0, Math.min(5, CAMP_SAVE.done+1)*2), 1, 1.8, '#c42a1c'); g.setLineDash([]);
  g.font = '700 8px "Courier New",monospace'; g.textAlign = 'center';
  CAMP_PINS.forEach(([x,y],i)=>{ const done = i<CAMP_SAVE.done, open = i<=CAMP_SAVE.done;
    g.strokeStyle = open? '#c42a1c' : 'rgba(31,27,23,0.45)'; g.lineWidth = 1.8; g.beginPath(); g.arc(x, y, 6, 0, 6.283); g.stroke();
    if (done){ g.beginPath(); g.moveTo(x-4,y-4); g.lineTo(x+4,y+4); g.moveTo(x+4,y-4); g.lineTo(x-4,y+4); g.stroke(); }
    else if (open){ g.fillStyle = '#c42a1c'; g.beginPath(); g.arc(x, y, 2.6, 0, 6.283); g.fill(); }
    const lab = ['I','II','III','IV','V'][i]+(open? ' · '+campWhen(CAMPAIGN[i]) : ''), hw = g.measureText(lab).width/2, lx = clamp(x, hw+4, 476-hw);   // jamais coupé au bord de la carte
    g.lineJoin = 'round'; g.lineWidth = 3.4; g.strokeStyle = 'rgba(238,228,200,0.92)'; g.strokeText(lab, lx, y+(i===2||i===3? -11 : 18));              // liseré de papier : lisible sur les montagnes
    g.fillStyle = open? '#1f1b17' : 'rgba(31,27,23,0.45)'; g.fillText(lab, lx, y+(i===2||i===3? -11 : 18)); });
  g.strokeStyle = '#1f1b17'; g.lineWidth = 1; g.beginPath(); g.moveTo(456,22); g.lineTo(456,8); g.lineTo(452,14); g.moveTo(456,8); g.lineTo(460,14); g.stroke(); g.fillStyle = '#1f1b17'; g.fillText('N', 456, 32);
  return cv;
}

// ---- menu : onglet CAMPAGNE (carnet de missions → briefing plein écran) ----
let campView = -1;                                   // (héritage) -1 = liste ; le dossier d'une mission est désormais le briefing plein écran
function campRenderMenu(){
  const tab = document.querySelector('.tab[data-page="camp"]'); if (tab) tab.textContent = cT(CAMP_UI.tab);
  if (CAMP_BRIEF.open) campBriefRender();
  const box = $('campBox'); if (!box) return;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt!=null) e.textContent = txt; return e; };
  box.textContent = ''; campView = -1;
  box.appendChild(el('div', 'campHead', cT(CAMP_UI.head)));
  box.appendChild(el('div', 'fNote', cT(CAMP_UI.sub)));
  box.appendChild(el('div', 'campAbout', cT(CAMP_UI.about)));
  box.appendChild(campMap());
  // difficulté : des noms qui parlent d'eux-mêmes, et ce qui change en une ligne
  const row = el('div', 'fRow'); row.appendChild(el('span', 'fLbl', cT(CAMP_UI.diffLbl)));
  const picks = el('div', 'row');
  [0,1,2].forEach(k=>{ const b = el('button', 'pick campDiff'+(CAMP_SAVE.diff===k? ' sel':''), cT(CAMP_UI['d'+k]));
    b.addEventListener('click', ()=>{ CAMP_SAVE.diff = k; campSave(); campRenderMenu(); }); picks.appendChild(b); });
  row.appendChild(picks); box.appendChild(row);
  box.appendChild(el('div', 'fNote campDiffTag', cT(CAMP_UI['dTag'+CAMP_SAVE.diff])));
  CAMPAIGN.forEach((m,i)=>{
    const open = i<=CAMP_SAVE.done, done = i<CAMP_SAVE.done;
    const b = el('button', 'mis'+(open? '' : ' locked')+(done? ' done' : ''));
    b.appendChild(el('span', 'misNo', m.num || String(i+1)));
    const body = el('span', 'misBody');
    body.appendChild(el('b', null, open? cT(m.title) : '· · ·'));
    body.appendChild(el('i', null, open? campWhen(m)+' · '+cT(m.place) : cT(CAMP_UI.locked)));
    b.appendChild(body);
    if (done) b.appendChild(el('span', 'misDone', cT(CAMP_UI.doneTag)+(CAMP_SAVE.bonus[i]? ' ★' : '')+(CAMP_SAVE.best[i]? ' · '+fmtTime(CAMP_SAVE.best[i]) : '')));
    if (open) b.addEventListener('click', ()=>campLaunch(i)); else b.disabled = true;
    box.appendChild(b);
  });
}
