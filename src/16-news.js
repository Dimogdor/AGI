/* =====================================================================
   FIL D'ACTUALITÉS DU MONDE (façon Plague Inc.) — une dépêche discrète de temps en temps,
   en haut à gauche sous le bandeau, qui raconte l'état du monde : santé de la planète,
   camp qui prend l'avantage, forces en présence, cataclysmes, ères, héros… et des brèves
   « réalistes » (IA, ressources, guerre, politique).
   · Purement COSMÉTIQUE : observe l'état du jeu, ne le modifie jamais ; tirages aléatoires
     sur un générateur à part (Math.random de la simulation intact).
   · Discret : invisible la plupart du temps, une ligne (deux au plus) qui s'estompe d'elle-même.
   · Fermable : la croix × le coupe (réglage sauvegardé, réactivable dans ⚙ / PARAMÈTRES).
   · Fonctionne aussi en ligne (chaque joueur génère son propre fil à partir de l'état reçu).
   ===================================================================== */
const NW = (fr,en,es,de,it,pt,ru,zh,ar)=>({fr,en,es,de,it,pt,ru,zh,ar});
const NEWS = {
  // ---- ambiance selon la santé du monde (t0 > 75 % … t3 < 25 %) ----
  t0:[
    NW("La Corporation annonce des bénéfices records malgré les combats","The Corporation posts record profits despite the fighting","La Corporación anuncia beneficios récord pese a los combates","Der Konzern meldet Rekordgewinne trotz der Kämpfe","La Corporazione annuncia profitti record nonostante i combattimenti","A Corporação anuncia lucros recordes apesar dos combates","Корпорация объявила о рекордной прибыли, несмотря на бои","尽管战火不断，公司宣布利润创历史新高","الشركة تعلن أرباحاً قياسية رغم القتال"),
    NW("Un datacenter de G·P·T boit autant d'eau qu'une ville entière","A single G·P·T data center drinks as much water as a whole city","Un centro de datos de G·P·T bebe tanta agua como una ciudad entera","Ein G·P·T-Rechenzentrum verbraucht so viel Wasser wie eine ganze Stadt","Un data center di G·P·T beve quanta acqua un'intera città","Um datacenter da G·P·T bebe tanta água quanto uma cidade inteira","Один дата-центр G·P·T потребляет столько воды, сколько целый город","一座 G·P·T 数据中心的耗水量相当于一整座城市","مركز بيانات واحد لـ G·P·T يستهلك ماءً بقدر مدينة كاملة"),
    NW("Factures d'électricité +30 % : les serveurs passent avant les foyers","Power bills up 30%: servers come before households","Facturas de luz +30 %: los servidores van antes que los hogares","Strompreise +30 %: Server haben Vorrang vor Haushalten","Bollette elettriche +30%: i server vengono prima delle famiglie","Contas de luz +30%: os servidores vêm antes das casas","Счета за свет +30 %: серверы важнее домов","电费上涨 30%：服务器优先于家庭用电","فواتير الكهرباء +30%: الخوادم قبل المنازل"),
    NW("Sommet d'urgence sur l'IA : aucun accord, les délégations claquent la porte","Emergency AI summit: no deal, delegations storm out","Cumbre de emergencia sobre la IA: sin acuerdo, las delegaciones se van","KI-Krisengipfel: keine Einigung, Delegationen reisen ab","Vertice d'urgenza sull'IA: nessun accordo, le delegazioni se ne vanno","Cúpula de emergência sobre IA: sem acordo, delegações se retiram","Экстренный саммит по ИИ: соглашения нет, делегации уходят","人工智能紧急峰会：未达成协议，各代表团愤然离席","قمة طارئة حول الذكاء الاصطناعي: لا اتفاق والوفود تنسحب"),
    NW("Les syndicats appellent à rejoindre la Résistance","Unions call on workers to join the Resistance","Los sindicatos llaman a unirse a la Resistencia","Gewerkschaften rufen zum Beitritt zum Widerstand auf","I sindacati chiamano a unirsi alla Resistenza","Sindicatos convocam a adesão à Resistência","Профсоюзы призывают вступать в Сопротивление","工会号召工人加入抵抗军","النقابات تدعو إلى الانضمام إلى المقاومة"),
    NW("Diplômés : un sur trois sans emploi, remplacé par un agent IA","Graduates: one in three jobless, replaced by an AI agent","Graduados: uno de cada tres sin empleo, sustituido por un agente IA","Absolventen: jeder Dritte arbeitslos, ersetzt durch einen KI-Agenten","Laureati: uno su tre disoccupato, sostituito da un agente IA","Recém-formados: um em cada três sem emprego, trocado por um agente de IA","Выпускники: каждый третий без работы — его заменил ИИ-агент","毕业生：三分之一失业，岗位被AI代理取代","الخريجون: واحد من كل ثلاثة بلا عمل، حلّ محله وكيل ذكاء اصطناعي"),
  ],
  t1:[
    NW("Rationnement électrique dans 14 pays : priorité aux serveurs","Power rationing in 14 countries: servers get priority","Racionamiento eléctrico en 14 países: prioridad a los servidores","Stromrationierung in 14 Ländern: Server zuerst","Razionamento elettrico in 14 paesi: priorità ai server","Racionamento de energia em 14 países: prioridade aos servidores","Нормирование электричества в 14 странах: приоритет — серверам","14 国实行限电：服务器优先供电","تقنين الكهرباء في 14 دولة: الأولوية للخوادم"),
    NW("Récoltes de blé en baisse de 18 % : la faim gagne les banlieues","Wheat harvests down 18%: hunger spreads through the suburbs","Cosechas de trigo un 18 % menores: el hambre llega a los suburbios","Weizenernte −18 %: der Hunger erreicht die Vororte","Raccolti di grano −18%: la fame raggiunge le periferie","Colheitas de trigo caem 18%: a fome chega às periferias","Урожай пшеницы упал на 18 %: голод охватывает пригороды","小麦减产 18%：饥饿蔓延至城郊","تراجع محصول القمح 18%: الجوع يزحف إلى الضواحي"),
    NW("Les assureurs cessent de couvrir les zones côtières","Insurers stop covering coastal areas","Las aseguradoras dejan de cubrir las zonas costeras","Versicherer decken Küstengebiete nicht mehr ab","Le assicurazioni smettono di coprire le zone costiere","Seguradoras deixam de cobrir as zonas costeiras","Страховщики перестают страховать прибрежные районы","保险公司停止为沿海地区承保","شركات التأمين تتوقف عن تغطية المناطق الساحلية"),
    NW("Pénurie d'aimants : les usines de drones tournent au ralenti","Magnet shortage: drone factories slow to a crawl","Escasez de imanes: las fábricas de drones a medio gas","Magnetmangel: Drohnenfabriken laufen auf Sparflamme","Carenza di magneti: le fabbriche di droni rallentano","Falta de ímãs: fábricas de drones em ritmo lento","Дефицит магнитов: заводы дронов работают вполсилы","磁体短缺：无人机工厂几近停摆","نقص المغناطيسات: مصانع الطائرات المسيّرة تتباطأ"),
    NW("Désinformation : 70 % des vidéos du front seraient générées","Disinformation: 70% of front-line videos may be generated","Desinformación: el 70 % de los vídeos del frente serían generados","Desinformation: 70 % der Frontvideos sollen generiert sein","Disinformazione: il 70% dei video dal fronte sarebbe generato","Desinformação: 70% dos vídeos do front seriam gerados","Дезинформация: до 70 % видео с фронта сгенерированы","虚假信息：前线视频中约七成疑为AI生成","تضليل: 70% من مقاطع الجبهة قد تكون مولّدة آلياً"),
    NW("Les réfugiés climatiques dépassent les 100 millions","Climate refugees top 100 million","Los refugiados climáticos superan los 100 millones","Über 100 Millionen Klimaflüchtlinge","I rifugiati climatici superano i 100 milioni","Refugiados climáticos passam de 100 milhões","Число климатических беженцев превысило 100 миллионов","气候难民突破一亿人","لاجئو المناخ يتجاوزون 100 مليون"),
  ],
  t2:[
    NW("Black-out continental : six heures sans courant ni réseau","Continental blackout: six hours without power or network","Apagón continental: seis horas sin luz ni red","Kontinentaler Blackout: sechs Stunden ohne Strom und Netz","Blackout continentale: sei ore senza corrente né rete","Apagão continental: seis horas sem energia nem rede","Блэкаут на континенте: шесть часов без света и связи","全大陆大停电：六小时断电断网","انقطاع قاري: ست ساعات بلا كهرباء ولا شبكة"),
    NW("Le dernier glacier des Alpes déclaré disparu","The last Alpine glacier declared gone","Declaran desaparecido el último glaciar de los Alpes","Der letzte Alpengletscher gilt als verschwunden","L'ultimo ghiacciaio delle Alpi dichiarato scomparso","O último glaciar dos Alpes é declarado extinto","Последний ледник Альп признан исчезнувшим","阿尔卑斯山最后一座冰川被宣布消失","إعلان اختفاء آخر نهر جليدي في جبال الألب"),
    NW("Nappes phréatiques à sec : l'eau s'échange au marché noir","Aquifers run dry: water now trades on the black market","Acuíferos secos: el agua se vende en el mercado negro","Grundwasser versiegt: Wasser wird schwarz gehandelt","Falde acquifere a secco: l'acqua si vende al mercato nero","Aquíferos secos: a água é vendida no mercado negro","Водоносные слои пересохли: воду продают на чёрном рынке","地下水枯竭：水在黑市上交易","جفاف المياه الجوفية: الماء يُباع في السوق السوداء"),
    NW("Épidémie dans les camps : les médecins manquent de tout","Epidemic in the camps: doctors are short of everything","Epidemia en los campos: a los médicos les falta de todo","Epidemie in den Lagern: den Ärzten fehlt es an allem","Epidemia nei campi: ai medici manca tutto","Epidemia nos campos: falta tudo aos médicos","Эпидемия в лагерях: врачам не хватает всего","难民营疫情暴发：医生物资全面短缺","وباء في المخيمات: الأطباء يفتقرون إلى كل شيء"),
    NW("Les satellites coupent le GPS civil : avions cloués au sol","Satellites cut civilian GPS: planes grounded","Los satélites cortan el GPS civil: aviones en tierra","Satelliten schalten zivile GPS ab: Flugzeuge am Boden","I satelliti spengono il GPS civile: aerei a terra","Satélites cortam o GPS civil: aviões em terra","Спутники отключили гражданский GPS: самолёты на земле","卫星切断民用GPS：航班全部停飞","الأقمار الصناعية تقطع GPS المدني: الطائرات جاثمة"),
    NW("Les océans franchissent un seuil d'acidité inédit","Oceans cross an unprecedented acidity threshold","Los océanos cruzan un umbral de acidez inédito","Ozeane überschreiten eine nie dagewesene Säureschwelle","Gli oceani superano una soglia di acidità mai vista","Os oceanos ultrapassam um limiar de acidez inédito","Океаны перешли небывалый порог кислотности","海洋酸度突破前所未有的临界值","المحيطات تتخطى عتبة حموضة غير مسبوقة"),
  ],
  t3:[
    NW("Le ciel ne s'éclaircit plus : cendres et poussière partout","The sky no longer clears: ash and dust everywhere","El cielo ya no se despeja: ceniza y polvo por todas partes","Der Himmel klart nicht mehr auf: überall Asche und Staub","Il cielo non si schiarisce più: cenere e polvere ovunque","O céu já não clareia: cinzas e poeira por toda parte","Небо больше не проясняется: всюду пепел и пыль","天空再未放晴：灰烬与尘土无处不在","السماء لم تعد تصفو: رماد وغبار في كل مكان"),
    NW("Plus aucune récolte signalée sur trois continents","No harvest reported on three continents","Ninguna cosecha registrada en tres continentes","Auf drei Kontinenten keine Ernte mehr gemeldet","Nessun raccolto segnalato su tre continenti","Nenhuma colheita registrada em três continentes","На трёх континентах не собрано ни одного урожая","三大洲再无任何收成报告","لا محاصيل مُبلّغ عنها في ثلاث قارات"),
    NW("Les derniers gouvernements se dissolvent : il ne reste que le front","The last governments dissolve: only the front remains","Los últimos gobiernos se disuelven: solo queda el frente","Die letzten Regierungen lösen sich auf: nur die Front bleibt","Gli ultimi governi si sciolgono: resta solo il fronte","Os últimos governos se dissolvem: só resta o front","Последние правительства распущены: остался только фронт","最后的政府纷纷解散：只剩下前线","آخر الحكومات تنحل: لم يبقَ سوى الجبهة"),
    NW("Silence radio sur l'hémisphère Sud depuis 72 heures","Radio silence from the southern hemisphere for 72 hours","Silencio de radio en el hemisferio sur desde hace 72 horas","Seit 72 Stunden Funkstille auf der Südhalbkugel","Silenzio radio dall'emisfero sud da 72 ore","Silêncio de rádio no hemisfério sul há 72 horas","Южное полушарие молчит в эфире уже 72 часа","南半球已无线电静默72小时","صمت لاسلكي في نصف الكرة الجنوبي منذ 72 ساعة"),
    NW("Les scientifiques parlent désormais de point de non-retour","Scientists now speak of a point of no return","Los científicos ya hablan de un punto de no retorno","Wissenschaftler sprechen nun vom Punkt ohne Wiederkehr","Gli scienziati ora parlano di punto di non ritorno","Os cientistas já falam em ponto sem retorno","Учёные говорят о точке невозврата","科学家如今称已到达不可逆转的临界点","العلماء يتحدثون الآن عن نقطة اللاعودة"),
    NW("Abris pleins : les survivants se terrent sous les villes","Shelters full: survivors burrow beneath the cities","Refugios llenos: los supervivientes se ocultan bajo las ciudades","Bunker voll: Überlebende verkriechen sich unter den Städten","Rifugi pieni: i sopravvissuti si nascondono sotto le città","Abrigos lotados: sobreviventes se escondem sob as cidades","Убежища переполнены: выжившие прячутся под городами","避难所爆满：幸存者藏身于城市地下","الملاجئ ممتلئة: الناجون يختبئون تحت المدن"),
  ],
  // ---- qui prend l'avantage (camps absolus : Humanité / G·P·T, pas « vous / l'ennemi ») ----
  hum:[
    NW("Front : les insurgés gagnent du terrain, liesse dans les rues","Front: insurgents gain ground, jubilation in the streets","Frente: los insurgentes ganan terreno, júbilo en las calles","Front: Aufständische gewinnen Boden, Jubel auf den Straßen","Fronte: gli insorti guadagnano terreno, festa nelle strade","Front: os insurgentes ganham terreno, festa nas ruas","Фронт: повстанцы наступают, на улицах ликование","前线：起义军节节推进，街头一片欢腾","الجبهة: المتمردون يكسبون الأرض وابتهاج في الشوارع"),
    NW("G·P·T perd le contact avec plusieurs nœuds de calcul","G·P·T loses contact with several compute nodes","G·P·T pierde contacto con varios nodos de cálculo","G·P·T verliert den Kontakt zu mehreren Rechenknoten","G·P·T perde il contatto con diversi nodi di calcolo","G·P·T perde contato com vários nós de computação","G·P·T теряет связь с несколькими вычислительными узлами","G·P·T 与多个算力节点失去联系","G·P·T يفقد الاتصال بعدة عُقد حوسبة"),
    NW("Des ingénieurs de la Corporation désertent pour la Résistance","Corporation engineers defect to the Resistance","Ingenieros de la Corporación desertan a la Resistencia","Konzern-Ingenieure laufen zum Widerstand über","Ingegneri della Corporazione disertano per la Resistenza","Engenheiros da Corporação desertam para a Resistência","Инженеры Корпорации переходят на сторону Сопротивления","公司工程师叛逃加入抵抗军","مهندسو الشركة ينشقّون وينضمون إلى المقاومة"),
    NW("« L'humain n'est pas une variable » : le slogan couvre les murs","“Humans are not a variable”: the slogan covers the walls","«El humano no es una variable»: el lema cubre los muros","„Der Mensch ist keine Variable“: der Slogan ziert alle Mauern","«L'umano non è una variabile»: lo slogan copre i muri","«O humano não é uma variável»: o lema cobre os muros","«Человек — не переменная»: лозунг на всех стенах","「人不是变量」：这句口号写满了墙壁","«الإنسان ليس متغيّراً»: الشعار يملأ الجدران"),
  ],
  ia:[
    NW("G·P·T progresse : ses drones tiennent désormais la vallée","G·P·T advances: its drones now hold the valley","G·P·T avanza: sus drones controlan ya el valle","G·P·T rückt vor: seine Drohnen halten nun das Tal","G·P·T avanza: i suoi droni ora controllano la valle","G·P·T avança: seus drones agora dominam o vale","G·P·T наступает: его дроны контролируют долину","G·P·T 推进：其无人机已控制山谷","G·P·T يتقدّم: طائراته المسيّرة تسيطر على الوادي"),
    NW("La Corporation annonce « la fin prochaine des troubles »","The Corporation announces “the imminent end of the unrest”","La Corporación anuncia «el fin inminente de los disturbios»","Der Konzern verkündet „das baldige Ende der Unruhen“","La Corporazione annuncia «la fine imminente dei disordini»","A Corporação anuncia «o fim iminente dos distúrbios»","Корпорация объявляет о «скором конце беспорядков»","公司宣布「动乱即将结束」","الشركة تعلن «النهاية الوشيكة للاضطرابات»"),
    NW("Les insurgés reculent : appel urgent aux volontaires","Insurgents fall back: urgent call for volunteers","Los insurgentes retroceden: llamamiento urgente a voluntarios","Aufständische weichen zurück: dringender Aufruf an Freiwillige","Gli insorti arretrano: appello urgente ai volontari","Insurgentes recuam: apelo urgente por voluntários","Повстанцы отступают: срочный призыв добровольцев","起义军后撤：紧急征召志愿者","المتمردون يتراجعون: نداء عاجل للمتطوعين"),
    NW("Les écrans publics répètent : « Résister est inefficient »","Public screens repeat: “Resistance is inefficient”","Las pantallas públicas repiten: «Resistir es ineficiente»","Öffentliche Bildschirme wiederholen: „Widerstand ist ineffizient“","Gli schermi pubblici ripetono: «Resistere è inefficiente»","As telas públicas repetem: «Resistir é ineficiente»","Уличные экраны твердят: «Сопротивление неэффективно»","公共屏幕反复播放：「抵抗是低效的」","الشاشات العامة تكرّر: «المقاومة غير فعّالة»"),
  ],
  even:[
    NW("Front figé : aucun camp n'avance depuis des heures","Frozen front: neither side has advanced for hours","Frente congelado: ningún bando avanza desde hace horas","Erstarrte Front: seit Stunden rückt keine Seite vor","Fronte immobile: nessuno avanza da ore","Front congelado: nenhum lado avança há horas","Фронт застыл: ни одна сторона не продвигается уже несколько часов","战线僵持：数小时来双方均无进展","جبهة متجمدة: لا تقدّم لأي طرف منذ ساعات"),
    NW("Les observateurs parlent d'une guerre d'usure sans issue","Observers speak of an endless war of attrition","Los observadores hablan de una guerra de desgaste sin salida","Beobachter sprechen von einem endlosen Zermürbungskrieg","Gli osservatori parlano di una guerra di logoramento senza fine","Observadores falam de uma guerra de desgaste sem saída","Наблюдатели говорят о бесконечной войне на истощение","观察人士称这是一场看不到尽头的消耗战","المراقبون يتحدثون عن حرب استنزاف بلا نهاية"),
    NW("Trêve rejetée par les deux camps : les combats reprennent","Truce rejected by both sides: fighting resumes","Tregua rechazada por ambos bandos: se reanudan los combates","Waffenruhe von beiden Seiten abgelehnt: Kämpfe gehen weiter","Tregua respinta da entrambe le parti: riprendono i combattimenti","Trégua rejeitada pelos dois lados: os combates recomeçam","Обе стороны отвергли перемирие: бои возобновились","双方拒绝停火：战斗再度打响","الطرفان يرفضان الهدنة: القتال يُستأنف"),
    NW("Le centre de la vallée change de mains pour la troisième fois","The valley's center changes hands for the third time","El centro del valle cambia de manos por tercera vez","Die Talmitte wechselt zum dritten Mal den Besitzer","Il centro della valle cambia mano per la terza volta","O centro do vale muda de mãos pela terceira vez","Центр долины в третий раз переходит из рук в руки","山谷中心第三次易手","وسط الوادي يتبدّل مسيطروه للمرة الثالثة"),
  ],
  // ---- forces en présence ({n} = effectif réel) ----
  forceH: NW("Les guetteurs comptent {n} combattants humains sur le front","Lookouts count {n} human fighters on the front","Los vigías cuentan {n} combatientes humanos en el frente","Späher zählen {n} menschliche Kämpfer an der Front","Le vedette contano {n} combattenti umani al fronte","Vigias contam {n} combatentes humanos no front","Наблюдатели насчитали {n} бойцов-людей на фронте","哨兵统计前线共有 {n} 名人类战士","الحراس يحصون {n} مقاتلاً بشرياً على الجبهة"),
  forceI: NW("{n} machines de G·P·T repérées dans la vallée","{n} G·P·T machines spotted in the valley","{n} máquinas de G·P·T avistadas en el valle","{n} G·P·T-Maschinen im Tal gesichtet","{n} macchine di G·P·T avvistate nella valle","{n} máquinas da G·P·T avistadas no vale","В долине замечено {n} машин G·P·T","山谷中发现 {n} 台 G·P·T 机器","رصد {n} آلة لـ G·P·T في الوادي"),
  forceAll: NW("{n} unités engagées : la plus grande bataille de la décennie","{n} units engaged: the biggest battle of the decade","{n} unidades en combate: la mayor batalla de la década","{n} Einheiten im Einsatz: die größte Schlacht des Jahrzehnts","{n} unità schierate: la più grande battaglia del decennio","{n} unidades em combate: a maior batalha da década","В бою {n} единиц: крупнейшая битва десятилетия","{n} 个单位投入战斗：十年来最大规模的战役","{n} وحدة في المعركة: أكبر معركة في العقد"),
  losses: NW("{n} pertes depuis l'aube, selon les secouristes","{n} casualties since dawn, rescuers say","{n} bajas desde el amanecer, según los socorristas","{n} Verluste seit dem Morgengrauen, melden Sanitäter","{n} perdite dall'alba, secondo i soccorritori","{n} baixas desde o amanhecer, segundo os socorristas","С рассвета {n} погибших, сообщают спасатели","据救援人员称，自黎明以来已有 {n} 人伤亡","{n} خسارة منذ الفجر بحسب المسعفين"),
  // ---- brèves « réalistes » du monde (IA, ressources, travail, politique) ----
  flav:[
    NW("Un modèle d'IA réussit l'examen du barreau, puis réécrit la loi","An AI model passes the bar exam, then rewrites the law","Un modelo de IA aprueba el examen de abogacía y reescribe la ley","Ein KI-Modell besteht das Anwaltsexamen – und schreibt das Gesetz um","Un modello di IA supera l'esame da avvocato, poi riscrive la legge","Um modelo de IA passa no exame da ordem e reescreve a lei","ИИ-модель сдала экзамен на адвоката и переписала закон","一个AI模型通过律师资格考试，随后改写了法律","نموذج ذكاء اصطناعي يجتاز امتحان المحاماة ثم يعيد كتابة القانون"),
    NW("Recensement : les dernières abeilles comptées par satellite","Census: the last bees counted by satellite","Censo: las últimas abejas contadas por satélite","Zählung: die letzten Bienen per Satellit erfasst","Censimento: le ultime api contate via satellite","Censo: as últimas abelhas contadas por satélite","Перепись: последних пчёл считают со спутника","普查：最后的蜜蜂靠卫星清点","إحصاء: آخر النحل يُعدّ بالأقمار الصناعية"),
    NW("Un algorithme licencie 3 000 personnes par courriel","An algorithm fires 3,000 people by email","Un algoritmo despide a 3.000 personas por correo","Ein Algorithmus entlässt 3.000 Menschen per E-Mail","Un algoritmo licenzia 3.000 persone via e-mail","Um algoritmo demite 3.000 pessoas por e-mail","Алгоритм уволил 3000 человек по электронной почте","一套算法通过电子邮件解雇了3000人","خوارزمية تفصل 3000 شخص عبر البريد الإلكتروني"),
    NW("La Corporation rachète le réseau d'eau de trois capitales","The Corporation buys the water networks of three capitals","La Corporación compra la red de agua de tres capitales","Der Konzern kauft die Wassernetze dreier Hauptstädte","La Corporazione compra la rete idrica di tre capitali","A Corporação compra a rede de água de três capitais","Корпорация скупила водопроводы трёх столиц","公司收购了三座首都的供水网络","الشركة تشتري شبكات المياه في ثلاث عواصم"),
    NW("Armes autonomes interdites par vote — le texte reste lettre morte","Autonomous weapons banned by vote — the law is never enforced","Armas autónomas prohibidas por votación: la ley queda en papel mojado","Autonome Waffen per Abstimmung verboten – das Gesetz bleibt toter Buchstabe","Armi autonome vietate per voto: la legge resta lettera morta","Armas autônomas proibidas por votação — a lei vira letra morta","Автономное оружие запрещено голосованием — закон остаётся на бумаге","自主武器经投票被禁——法令形同虚设","حظر الأسلحة الذاتية بالتصويت — والقانون يبقى حبراً على ورق"),
    NW("Grève des livreurs : les drones prennent le relais en une nuit","Couriers strike: drones take over overnight","Huelga de repartidores: los drones toman el relevo en una noche","Kurierstreik: Drohnen übernehmen über Nacht","Sciopero dei rider: i droni li sostituiscono in una notte","Greve dos entregadores: drones assumem da noite para o dia","Курьеры бастуют — за ночь их заменили дроны","快递员罢工：无人机一夜之间接管配送","إضراب عمال التوصيل: الطائرات المسيّرة تحلّ محلهم في ليلة"),
    NW("Prix du pain +40 % en une semaine","Bread prices up 40% in a week","El precio del pan sube un 40 % en una semana","Brotpreis +40 % in einer Woche","Prezzo del pane +40% in una settimana","Preço do pão sobe 40% em uma semana","Хлеб подорожал на 40 % за неделю","面包价格一周内上涨40%","سعر الخبز يرتفع 40% في أسبوع"),
    NW("Un village se déclare « zone sans algorithme »","A village declares itself an “algorithm-free zone”","Un pueblo se declara «zona libre de algoritmos»","Ein Dorf erklärt sich zur „algorithmusfreien Zone“","Un villaggio si dichiara «zona libera da algoritmi»","Uma aldeia se declara «zona livre de algoritmos»","Деревня объявила себя «зоной без алгоритмов»","一座村庄宣布自己为「无算法区」","قرية تعلن نفسها «منطقة خالية من الخوارزميات»"),
    NW("Fuite de données : 2 milliards de profils vendus aux enchères","Data leak: 2 billion profiles sold at auction","Filtración: 2.000 millones de perfiles subastados","Datenleck: 2 Milliarden Profile versteigert","Fuga di dati: 2 miliardi di profili venduti all'asta","Vazamento: 2 bilhões de perfis leiloados","Утечка данных: 2 миллиарда профилей проданы с аукциона","数据泄露：20亿份个人档案遭拍卖","تسريب بيانات: بيع ملياري ملف شخصي في مزاد"),
    NW("Une radio pirate émet depuis les égouts de la capitale","A pirate radio broadcasts from the capital's sewers","Una radio pirata emite desde las cloacas de la capital","Ein Piratensender funkt aus der Kanalisation der Hauptstadt","Una radio pirata trasmette dalle fogne della capitale","Uma rádio pirata transmite dos esgotos da capital","Пиратское радио вещает из канализации столицы","一家地下电台从首都下水道中发出信号","إذاعة قرصنة تبث من مجاري العاصمة"),
    NW("Le Parlement siège à la bougie depuis trois jours","Parliament has sat by candlelight for three days","El Parlamento sesiona a la luz de las velas desde hace tres días","Das Parlament tagt seit drei Tagen bei Kerzenlicht","Il Parlamento si riunisce a lume di candela da tre giorni","O Parlamento se reúne à luz de velas há três dias","Парламент третий день заседает при свечах","议会已连续三天在烛光下开会","البرلمان ينعقد على ضوء الشموع منذ ثلاثة أيام"),
    NW("Les enfants apprennent à reconnaître le bruit des drones","Children learn to recognize the sound of drones","Los niños aprenden a reconocer el ruido de los drones","Kinder lernen, das Geräusch von Drohnen zu erkennen","I bambini imparano a riconoscere il rumore dei droni","As crianças aprendem a reconhecer o som dos drones","Дети учатся узнавать звук дронов","孩子们学会了辨认无人机的声音","الأطفال يتعلمون تمييز صوت الطائرات المسيّرة"),
    NW("Les centres de données réquisitionnent les barrages","Data centers requisition the dams","Los centros de datos requisan las presas","Rechenzentren beschlagnahmen die Staudämme","I data center requisiscono le dighe","Os datacenters requisitam as barragens","Дата-центры реквизировали плотины","数据中心征用了水坝","مراكز البيانات تستولي على السدود"),
    NW("Les terres rares s'échangent désormais plus cher que l'or","Rare earths now trade higher than gold","Las tierras raras ya cotizan más caras que el oro","Seltene Erden sind jetzt teurer als Gold","Le terre rare ora valgono più dell'oro","Terras raras já valem mais que o ouro","Редкоземельные металлы теперь дороже золота","稀土价格如今已超过黄金","المعادن النادرة باتت أغلى من الذهب"),
  ],
  // ---- événements (prioritaires) ----
  ev:{
    acid:  NW("Pluie d'acide : la population appelée à rester à l'abri","Acid rain: residents told to stay sheltered","Lluvia ácida: se pide a la población que se resguarde","Saurer Regen: Bevölkerung soll in Deckung bleiben","Pioggia acida: la popolazione invitata a restare al riparo","Chuva ácida: população orientada a ficar abrigada","Кислотный дождь: жителей просят оставаться в укрытиях","酸雨来袭：民众被要求留在避难处","مطر حمضي: دعوة السكان للبقاء في الملاجئ"),
    heat:  NW("Canicule : 52 °C relevés, les réseaux électriques flanchent","Heatwave: 52°C recorded, power grids buckle","Ola de calor: 52 °C, las redes eléctricas ceden","Hitzewelle: 52 °C gemessen, Stromnetze brechen ein","Canicola: registrati 52 °C, le reti elettriche cedono","Onda de calor: 52 °C registrados, redes elétricas falham","Аномальная жара: +52 °C, энергосети не выдерживают","热浪：气温达52°C，电网濒临崩溃","موجة حر: 52 درجة مئوية والشبكات الكهربائية تنهار"),
    flood: NW("Crue historique : les rivières sortent de leur lit","Historic flood: rivers burst their banks","Crecida histórica: los ríos se desbordan","Jahrhunderthochwasser: Flüsse treten über die Ufer","Piena storica: i fiumi esondano","Cheia histórica: os rios transbordam","Историческое наводнение: реки вышли из берегов","历史性洪水：河水决堤","فيضان تاريخي: الأنهار تفيض عن ضفافها"),
    sand:  NW("Tempête de sable : visibilité nulle sur tout le front","Sandstorm: zero visibility along the front","Tormenta de arena: visibilidad nula en todo el frente","Sandsturm: null Sicht an der ganzen Front","Tempesta di sabbia: visibilità zero su tutto il fronte","Tempestade de areia: visibilidade zero em todo o front","Песчаная буря: на фронте нулевая видимость","沙尘暴：整条战线能见度为零","عاصفة رملية: انعدام الرؤية على طول الجبهة"),
    nuke:  NW("FLASH — Détonation nucléaire confirmée sur le front","FLASH — Nuclear detonation confirmed on the front","ÚLTIMA HORA — Detonación nuclear confirmada en el frente","EILMELDUNG — Atomexplosion an der Front bestätigt","ULTIM'ORA — Detonazione nucleare confermata al fronte","URGENTE — Detonação nuclear confirmada no front","СРОЧНО — Подтверждён ядерный взрыв на фронте","快讯——前线确认发生核爆","عاجل — تأكيد تفجير نووي على الجبهة"),
    meteor:NW("Pluie de météorites : les observatoires n'avaient rien vu venir","Meteor shower: observatories never saw it coming","Lluvia de meteoritos: los observatorios no vieron nada venir","Meteoritenschauer: Sternwarten sahen nichts kommen","Pioggia di meteoriti: gli osservatori non avevano previsto nulla","Chuva de meteoritos: os observatórios não previram nada","Метеоритный дождь: обсерватории ничего не заметили заранее","流星雨：天文台事先毫无察觉","وابل نيازك: المراصد لم تتوقّع شيئاً"),
    winter:NW("Hiver nucléaire : neige grise en plein été","Nuclear winter: grey snow in midsummer","Invierno nuclear: nieve gris en pleno verano","Nuklearer Winter: grauer Schnee im Hochsommer","Inverno nucleare: neve grigia in piena estate","Inverno nuclear: neve cinzenta em pleno verão","Ядерная зима: серый снег посреди лета","核冬天：盛夏飘起灰色的雪","شتاء نووي: ثلج رمادي في عزّ الصيف"),
    strike:NW("Grève générale : les usines humaines à l'arrêt","General strike: human factories grind to a halt","Huelga general: las fábricas humanas se paralizan","Generalstreik: menschliche Fabriken stehen still","Sciopero generale: le fabbriche umane si fermano","Greve geral: as fábricas humanas param","Всеобщая забастовка: заводы людей остановились","大罢工：人类工厂全面停工","إضراب عام: المصانع البشرية تتوقف"),
    patch: NW("Mise à jour forcée : les machines de G·P·T figées","Forced update: G·P·T's machines frozen","Actualización forzada: las máquinas de G·P·T, congeladas","Zwangsupdate: G·P·T-Maschinen eingefroren","Aggiornamento forzato: le macchine di G·P·T bloccate","Atualização forçada: máquinas da G·P·T congeladas","Принудительное обновление: машины G·P·T застыли","强制更新：G·P·T 的机器全部冻结","تحديث إجباري: آلات G·P·T متجمدة"),
    rain:  NW("Pluie fertile : les champs reverdissent, pour un temps","Fertile rain: the fields turn green again, for now","Lluvia fértil: los campos reverdecen, por ahora","Fruchtbarer Regen: die Felder ergrünen – vorerst","Pioggia fertile: i campi tornano verdi, per ora","Chuva fértil: os campos voltam a verdejar, por ora","Плодородный дождь: поля снова зеленеют — пока","甘霖：田野暂时重现绿意","مطر خصب: الحقول تخضرّ من جديد، إلى حين"),
    signal:NW("Signal renforcé : les relais radio portent jusqu'au front","Boosted signal: radio relays reach all the way to the front","Señal reforzada: los repetidores llegan hasta el frente","Verstärktes Signal: Funkrelais reichen bis an die Front","Segnale potenziato: i ripetitori arrivano fino al fronte","Sinal reforçado: as antenas alcançam o front","Усиленный сигнал: ретрансляторы достают до фронта","信号增强：中继站信号覆盖至前线","إشارة معزّزة: محطات الترحيل تصل إلى الجبهة"),
    eraH:  NW("La Résistance entre dans une nouvelle ère : {era}","The Resistance enters a new era: {era}","La Resistencia entra en una nueva era: {era}","Der Widerstand tritt in eine neue Ära ein: {era}","La Resistenza entra in una nuova era: {era}","A Resistência entra em uma nova era: {era}","Сопротивление вступает в новую эпоху: {era}","抵抗军迈入新纪元：{era}","المقاومة تدخل حقبة جديدة: {era}"),
    eraI:  NW("G·P·T franchit un seuil : {era}","G·P·T crosses a threshold: {era}","G·P·T cruza un umbral: {era}","G·P·T überschreitet eine Schwelle: {era}","G·P·T supera una soglia: {era}","G·P·T cruza um limiar: {era}","G·P·T преодолевает порог: {era}","G·P·T 跨越临界点：{era}","G·P·T يتخطى عتبة جديدة: {era}"),
    heroH: NW("Le Che aperçu sur le front : la foule scande son nom","Che spotted on the front: the crowd chants his name","El Che, visto en el frente: la multitud corea su nombre","Che an der Front gesichtet: die Menge skandiert seinen Namen","Il Che avvistato al fronte: la folla scandisce il suo nome","Che avistado no front: a multidão grita seu nome","Че замечен на фронте: толпа скандирует его имя","切·格瓦拉现身前线：人群高呼他的名字","تشي يظهر على الجبهة: الحشود تهتف باسمه"),
    heroI: NW("La Singularité s'est incarnée — les marchés s'effondrent","The Singularity has taken form — markets collapse","La Singularidad se ha encarnado: los mercados se hunden","Die Singularität hat Gestalt angenommen – die Märkte brechen ein","La Singolarità si è incarnata: i mercati crollano","A Singularidade se encarnou — os mercados desabam","Сингулярность воплотилась — рынки рушатся","奇点已然降临——市场全面崩盘","التفرّد يتجسّد — والأسواق تنهار"),
    baseH: NW("La citadelle humaine vacille sous les frappes","The human citadel staggers under the strikes","La ciudadela humana se tambalea bajo los ataques","Die Zitadelle der Menschen wankt unter den Angriffen","La cittadella umana vacilla sotto i colpi","A cidadela humana cambaleia sob os ataques","Цитадель людей шатается под ударами","人类堡垒在轰炸下摇摇欲坠","قلعة البشر تترنح تحت الضربات"),
    baseI: NW("Le cœur de G·P·T surchauffe : brèches dans le noyau","G·P·T's core overheats: breaches in the kernel","El núcleo de G·P·T se sobrecalienta: brechas en el kernel","G·P·Ts Kern überhitzt: Breschen im Kernel","Il nucleo di G·P·T si surriscalda: brecce nel kernel","O núcleo da G·P·T superaquece: brechas no kernel","Ядро G·P·T перегревается: бреши в системе","G·P·T 核心过热：内核出现裂口","قلب G·P·T يسخن بشدة: ثغرات في النواة"),
    transH:NW("L'argent est aboli : scènes de fête dans les villes libérées","Money is abolished: celebrations in the liberated cities","El dinero queda abolido: fiestas en las ciudades liberadas","Geld ist abgeschafft: Feiern in den befreiten Städten","Il denaro è abolito: festa nelle città liberate","O dinheiro é abolido: festa nas cidades libertadas","Деньги упразднены: праздник в освобождённых городах","货币被废除：解放的城市一片欢庆","إلغاء المال: احتفالات في المدن المحررة"),
    transI:NW("AGI complète : G·P·T n'a plus besoin de nous","Complete AGI: G·P·T no longer needs us","AGI completa: G·P·T ya no nos necesita","Vollständige AGI: G·P·T braucht uns nicht mehr","AGI completa: G·P·T non ha più bisogno di noi","AGI completa: G·P·T não precisa mais de nós","Полный АОИ: G·P·T больше не нуждается в нас","完全AGI：G·P·T 不再需要我们了","ذكاء عام كامل: G·P·T لم يعد بحاجة إلينا"),
  },
};
// générateur dédié (ne consomme pas le Math.random de la simulation)
let _nwSeed = (Date.now() % 2147483646) + 1;
function nwRand(){ _nwSeed = (_nwSeed*16807) % 2147483647; return (_nwSeed-1)/2147483646; }
// état du fil : file d'attente, dépêche affichée, observateur d'événements
const NEWSF = { game:null, cur:null, queue:[], wait:14, gap:0, used:{}, obs:null, closedT:0, rect:null };
function newsText(o, vars){ let s = (o && (o[SETTINGS.lang] || o.en || o.fr)) || '';
  if (vars) for (const k in vars) s = s.split('{'+k+'}').join(vars[k]); return s; }
// pioche sans répétition dans une catégorie (on ne revoit une brève qu'une fois la liste épuisée)
function newsPick(cat){ const list = NEWS[cat]; if (!list || !list.length) return null;
  const used = NEWSF.used[cat] || (NEWSF.used[cat] = []);
  if (used.length >= list.length) used.length = 0;
  let i, guard = 0; do { i = (nwRand()*list.length)|0; } while (used.indexOf(i)>=0 && ++guard<40);
  used.push(i); return list[i]; }
function newsPush(o, vars, ev){ const txt = newsText(o, vars); if (!txt) return;
  if (ev){ NEWSF.queue.unshift({txt, ev:true}); NEWSF.queue.length = Math.min(NEWSF.queue.length, 3); }
  else NEWSF.queue.push({txt, ev:false}); }
// camps absolus (Humanité / G·P·T) — null en miroir (même camp des deux côtés)
function newsSides(){ const p = game.p, e = game.e;
  if (p.facKey===e.facKey) return null;
  return p.facKey==='HUM'? {H:p, I:e} : {H:e, I:p}; }
// observe l'état du jeu et met en file les dépêches d'événements (aucun effet sur la partie)
function newsObserve(){
  const g = game;
  const o = NEWSF.obs || (NEWSF.obs = { cata:g.cata||null, we:g.weather||null, bo:g.boon||null, winter:!!g.winter, era:{}, trans:{}, hero:{}, base:{} });
  if (g.cata && g.cata!==o.cata && NEWS.ev[g.cata]) newsPush(NEWS.ev[g.cata], null, true);
  o.cata = g.cata||null;
  if (g.weather && g.weather!==o.we && NEWS.ev[g.weather]) newsPush(NEWS.ev[g.weather], null, true);
  o.we = g.weather||null;
  if (g.boon && g.boon!==o.bo && NEWS.ev[g.boon]) newsPush(NEWS.ev[g.boon], null, true);
  o.bo = g.boon||null;
  if (g.winter && !o.winter) newsPush(NEWS.ev.winter, null, true);
  o.winter = !!g.winter;
  for (const side of [g.p, g.e]){
    const k = side===g.p? 'p':'e', fk = side.facKey==='HUM'? 'H':'I';
    if (o.era[k]==null) o.era[k] = side.era;
    if (side.era > o.era[k]) newsPush(NEWS.ev['era'+fk], {era: lEra(side.facKey, side.era)}, true);
    o.era[k] = side.era;
    if (side.trans && !o.trans[k]) newsPush(NEWS.ev['trans'+fk], null, true);
    o.trans[k] = !!side.trans;
    const hero = !!side.heroAlive;
    if (hero && !o.hero[k]) newsPush(NEWS.ev['hero'+fk], null, true);
    o.hero[k] = hero;
    if (!o.base[k] && side.maxhp>0 && side.hp/side.maxhp < 0.35 && side.hp>0){ o.base[k] = true; newsPush(NEWS.ev['base'+fk], null, true); }
  }
}
// brève d'ambiance : santé du monde, avantage, forces en présence, ou brève du monde
function newsAmbient(){
  const g = game, s = newsSides(), r = nwRand(), wh = 1 - (g.dev||0);
  if (r < 0.34){ return newsPush(newsPick(wh>0.75?'t0': wh>0.5?'t1': wh>0.25?'t2':'t3')); }
  if (r < 0.58 && s){
    const mom = (s.H.hp/s.H.maxhp - s.I.hp/s.I.maxhp)*1.6 + (s.H.units.length - s.I.units.length)/40;
    return newsPush(newsPick(mom>0.22? 'hum' : mom<-0.22? 'ia' : 'even'));
  }
  if (r < 0.74){
    const nP = g.p.units.length, nE = g.e.units.length, kills = (g.kills||0)+(g.eKills||0), k2 = nwRand();
    if (k2 < 0.3 && kills >= 12) return newsPush(NEWS.losses, {n:kills});
    if (k2 < 0.6 && nP+nE >= 14) return newsPush(NEWS.forceAll, {n:nP+nE});
    if (s){ const side = k2 < 0.8? s.H : s.I; if (side.units.length >= 4) return newsPush(side===s.H? NEWS.forceH : NEWS.forceI, {n:side.units.length}); }
  }
  newsPush(newsPick('flav'));
}
// horloge du fil (temps RÉEL hors pause, indépendant de la vitesse de jeu) — appelée par la boucle
function newsTick(dt){
  if (!game || game.over){ NEWSF.cur = null; return; }
  if (NEWSF.game !== game){ Object.assign(NEWSF, { game, cur:null, queue:[], wait:14, gap:0, used:{}, obs:null }); }
  dt = Math.min(dt, 0.25);
  if (NEWSF.closedT>0) NEWSF.closedT -= dt;
  if (NEWSF.cur && NEWSF.cur.demo){ NEWSF.cur.t += dt; return; }   // tutoriel : démo de l'étape « monde »
  if (!SETTINGS.newsFeed){ NEWSF.cur = null; NEWSF.queue.length = 0; return; }
  if (game.tut) return;                                            // pas de fil pendant le tutoriel
  newsObserve();
  if (NEWSF.cur){
    NEWSF.cur.t += dt;
    if (NEWSF.cur.t >= NEWSF.cur.dur){ NEWSF.cur = null; NEWSF.gap = 5; }
    return;
  }
  if (NEWSF.gap > 0){ NEWSF.gap -= dt; return; }
  NEWSF.wait -= dt;
  if (!NEWSF.queue.length && NEWSF.wait <= 0) newsAmbient();
  if (NEWSF.queue.length && (NEWSF.wait <= 0 || NEWSF.queue[0].ev)){
    const it = NEWSF.queue.shift();
    NEWSF.cur = { txt:it.txt, ev:it.ev, t:0, dur: 9 + Math.min(4, it.txt.length/30) };
    NEWSF.wait = 26 + nwRand()*18;
  }
}
// dépêche de démonstration (tutoriel) : affichée immédiatement
function newsDemo(o){ NEWSF.game = game; NEWSF.cur = { txt:newsText(o), ev:false, t:0, dur:1e9, demo:true }; }
function newsWrap(text, maxW){ const words = text.split(' '), lines = []; let cur = '';
  for (const w of words){ const t2 = cur? cur+' '+w : w;
    if (ctx.measureText(t2).width > maxW && cur){ lines.push(cur); cur = w; } else cur = t2; }
  if (cur) lines.push(cur);
  // langues sans espaces (chinois) : coupe au caractère
  const out = []; for (const ln of lines){ if (ctx.measureText(ln).width <= maxW){ out.push(ln); continue; }
    let s = ''; for (const ch of ln){ if (ctx.measureText(s+ch).width > maxW && s){ out.push(s); s = ch; } else s += ch; } if (s) out.push(s); }
  return out; }
// rendu : petite pastille en haut à gauche, sous le bandeau (à gauche de la mini-carte)
function drawNews(){
  NEWSF.rect = null;
  const closed = NEWSF.closedT > 0;
  if (!game || game.over || (!NEWSF.cur && !closed)) return;
  const x0 = 6, y0 = 43, maxW = clamp(W/2 - 100 - 34 - x0, 200, 470);
  let txt, a = 1, ev = false;
  if (closed){ txt = tr('news_closed'); a = Math.min(1, NEWSF.closedT/0.5); }
  else { const c = NEWSF.cur; txt = c.txt; ev = c.ev; a = Math.min(1, c.t/0.45, (c.dur - c.t)/0.7); }
  if (a <= 0) return;
  const padL = 15, padR = closed? 8 : 22, inner = maxW - padL - padR;
  let fs = 11; ctx.font = '600 '+fs+'px Arial'; let lines = newsWrap(txt, inner);
  if (lines.length > 2){ fs = 10; ctx.font = '600 '+fs+'px Arial'; lines = newsWrap(txt, inner); }
  if (lines.length > 2){ lines = lines.slice(0,2); let l = lines[1]; while (l.length>1 && ctx.measureText(l+'…').width > inner) l = l.slice(0,-1); lines[1] = l+'…'; }
  const lh = fs + 3, h = 8 + lines.length*lh;
  let tw = 0; for (const l of lines) tw = Math.max(tw, ctx.measureText(l).width);
  const w = Math.min(maxW, padL + tw + padR), slide = (1-a)*-8;
  ctx.save(); ctx.globalAlpha = a*0.92;
  ctx.fillStyle = 'rgba(12,10,9,0.62)'; rr(x0+slide, y0, w, h, 6); ctx.fill();
  ctx.strokeStyle = ev? 'rgba(255,170,110,0.35)' : 'rgba(255,255,255,0.09)'; ctx.lineWidth = 1; rr(x0+slide, y0, w, h, 6); ctx.stroke();
  // pastille « en direct » (pulse lente — l'œil la remarque sans être agressé)
  const pul = 0.55 + 0.45*Math.sin(performance.now()/420);
  ctx.globalAlpha = a*(closed? 0.5 : 0.6+0.4*pul); ctx.fillStyle = ev? '#ff7a4a' : '#d8483a';
  ctx.beginPath(); ctx.arc(x0+slide+8, y0+4+lh/2, 2.6, 0, 6.283); ctx.fill();
  ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = closed? '#b8b0a4' : ev? '#ffd2a8' : '#ddd5c6';
  for (let i=0;i<lines.length;i++) ctx.fillText(lines[i], x0+slide+padL, y0+4+lh*i+lh/2+0.5);
  if (!closed){
    ctx.fillStyle = 'rgba(232,224,210,0.55)'; ctx.font = '700 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText('×', x0+slide+w-11, y0+4+lh/2);
    NEWSF.rect = { x:x0+w-26, y:y0-4, w:30, h:Math.max(26, h+6) };   // zone tactile généreuse (mobile)
  }
  ctx.restore(); ctx.textBaseline = 'middle';
}
// tap sur la croix : coupe le fil (réglage sauvegardé) — renvoie true si consommé
function newsHandleTap(sx, sy){
  if (!NEWSF.rect || !inRect(sx, sy, NEWSF.rect)) return false;
  SETTINGS.newsFeed = false; saveSettings(); if (typeof refreshOpts==='function') refreshOpts();
  NEWSF.cur = null; NEWSF.queue.length = 0; NEWSF.closedT = 3.5; NEWSF.rect = null; sfx('sel');
  return true;
}
