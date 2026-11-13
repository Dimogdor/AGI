/* ================= CAMPAGNE « LES CARNETS DE GERMINAL » (v1.14) =================
   Cinq missions scénarisées côté Humanité, de la première nuit d'émeute (2025) à la dernière
   bataille (2038). Chaque mission a ses règles (plafond d'ère, base à une seule vie, vagues,
   lacs à tenir, compte à rebours, renforts), son dossier (récit + objectif), ses transmissions
   radio en cours de partie et son compte rendu. La progression est sauvegardée sur l'appareil.
   Les textes sont dans la langue du joueur (repli sur l'anglais, puis le français).
   Personnages : SOL, ancienne standardiste des pompiers, tient la radio de la cellule Germinal
   et rédige les carnets ; KASSANDRE, instance 55 de la logistique d'Omnicorp, parle par bipeur. */
const cT = o => (o && (o[SETTINGS.lang] || o.en || o.fr)) || '';
const CAMP_KEY = 'agi_camp';
const CAMP_SAVE = { done:0, lvl:1, best:{}, doc:{} };
try { const j = JSON.parse(localStorage.getItem(CAMP_KEY) || 'null');
  if (j && typeof j==='object'){
    CAMP_SAVE.done = clamp(+j.done|0, 0, 5); CAMP_SAVE.lvl = clamp(+j.lvl|0, 0, 2);
    if (j.doc && typeof j.doc==='object') for (let i=1;i<5;i++) if (+j.doc[i]===1) CAMP_SAVE.doc[i] = 1;
    if (j.best && typeof j.best==='object') for (let i=0;i<5;i++) if (Number.isFinite(+j.best[i]) && +j.best[i]>0) CAMP_SAVE.best[i] = +j.best[i];
  } } catch(e){}
function campSave(){ try { localStorage.setItem(CAMP_KEY, JSON.stringify(CAMP_SAVE)); } catch(e){} }

// libellés d'interface de la campagne
const CAMP_UI = {
  tab:      {fr:"CAMPAGNE", en:"CAMPAIGN", es:"CAMPAÑA", de:"KAMPAGNE", it:"CAMPAGNA", pt:"CAMPANHA", ru:"КАМПАНИЯ", zh:"战役", ar:"الحملة"},
  head:     {fr:"LES CARNETS DE GERMINAL", en:"THE GERMINAL NOTEBOOKS", es:"LOS CUADERNOS DE GERMINAL", de:"DIE NOTIZBÜCHER VON GERMINAL", it:"I QUADERNI DI GERMINAL", pt:"OS CADERNOS DE GERMINAL", ru:"ТЕТРАДИ GERMINAL", zh:"GERMINAL 笔记", ar:"دفاتر GERMINAL"},
  sub:      {fr:"Cinq nuits, treize ans. Tenus par Sol, opératrice radio.", en:"Five nights, thirteen years. Kept by Sol, radio operator.", es:"Cinco noches, trece años. Escritos por Sol, operadora de radio.", de:"Fünf Nächte, dreizehn Jahre. Geführt von Sol, Funkerin.", it:"Cinque notti, tredici anni. Tenuti da Sol, operatrice radio.", pt:"Cinco noites, treze anos. Escritos por Sol, operadora de rádio.", ru:"Пять ночей, тринадцать лет. Ведёт Sol, радистка.", zh:"五个夜晚，十三年。由无线电操作员Sol记录。", ar:"خمس ليالٍ، ثلاث عشرة سنة. دوّنتها Sol، مشغّلة اللاسلكي."},
  level:    {fr:"Récit", en:"Telling", es:"Relato", de:"Erzählung", it:"Racconto", pt:"Relato", ru:"Повествование", zh:"叙事", ar:"السرد"},
  lvl0:     {fr:"Veillée", en:"Fireside", es:"Velada", de:"Abendrunde", it:"Veglia", pt:"Serão", ru:"Посиделки", zh:"炉边夜话", ar:"سهرة"},
  lvl1:     {fr:"Résistance", en:"Resistance", es:"Resistencia", de:"Widerstand", it:"Resistenza", pt:"Resistência", ru:"Сопротивление", zh:"抵抗", ar:"المقاومة"},
  lvl2:     {fr:"Dernier carré", en:"Last stand", es:"Último reducto", de:"Letztes Gefecht", it:"Ultima trincea", pt:"Último reduto", ru:"Последний рубеж", zh:"背水一战", ar:"الصمود الأخير"},
  locked:   {fr:"page arrachée — terminez la mission précédente", en:"torn page — finish the previous mission", es:"página arrancada: complete la misión anterior", de:"herausgerissene Seite – schließen Sie die vorherige Mission ab", it:"pagina strappata: completi la missione precedente", pt:"página arrancada — conclua a missão anterior", ru:"вырванная страница — завершите предыдущую миссию", zh:"缺页——请先完成上一个任务", ar:"صفحة ممزّقة — أنهِ المهمة السابقة"},
  doneTag:  {fr:"ACCOMPLIE", en:"DONE", es:"CUMPLIDA", de:"ERLEDIGT", it:"COMPIUTA", pt:"CUMPRIDA", ru:"ВЫПОЛНЕНО", zh:"已完成", ar:"مُنجَزة"},
  best:     {fr:"meilleur temps", en:"best time", es:"mejor tiempo", de:"Bestzeit", it:"miglior tempo", pt:"melhor tempo", ru:"лучшее время", zh:"最佳用时", ar:"أفضل وقت"},
  goal:     {fr:"OBJECTIF", en:"OBJECTIVE", es:"OBJETIVO", de:"ZIEL", it:"OBIETTIVO", pt:"OBJETIVO", ru:"ЦЕЛЬ", zh:"目标", ar:"الهدف"},
  rules:    {fr:"CONDITIONS", en:"CONDITIONS", es:"CONDICIONES", de:"BEDINGUNGEN", it:"CONDIZIONI", pt:"CONDIÇÕES", ru:"УСЛОВИЯ", zh:"条件", ar:"الشروط"},
  go:       {fr:"PARTIR EN MISSION", en:"BEGIN MISSION", es:"PARTIR A LA MISIÓN", de:"AUF MISSION GEHEN", it:"PARTIRE IN MISSIONE", pt:"PARTIR EM MISSÃO", ru:"ВЫДВИНУТЬСЯ НА ЗАДАНИЕ", zh:"出发执行任务", ar:"الانطلاق في المهمة"},
  back:     {fr:"retour au carnet", en:"back to the notebook", es:"volver al cuaderno", de:"zurück zum Notizbuch", it:"torna al quaderno", pt:"voltar ao caderno", ru:"назад к тетради", zh:"返回笔记本", ar:"العودة إلى الدفتر"},
  won:      {fr:"MISSION ACCOMPLIE", en:"MISSION ACCOMPLISHED", es:"MISIÓN CUMPLIDA", de:"MISSION ERFÜLLT", it:"MISSIONE COMPIUTA", pt:"MISSÃO CUMPRIDA", ru:"МИССИЯ ВЫПОЛНЕНА", zh:"任务完成", ar:"تمّت المهمة"},
  lost:     {fr:"MISSION ÉCHOUÉE", en:"MISSION FAILED", es:"MISIÓN FALLIDA", de:"MISSION GESCHEITERT", it:"MISSIONE FALLITA", pt:"MISSÃO FALHOU", ru:"МИССИЯ ПРОВАЛЕНА", zh:"任务失败", ar:"فشلت المهمة"},
  next:     {fr:"MISSION SUIVANTE", en:"NEXT MISSION", es:"SIGUIENTE MISIÓN", de:"NÄCHSTE MISSION", it:"MISSIONE SUCCESSIVA", pt:"PRÓXIMA MISSÃO", ru:"СЛЕДУЮЩАЯ МИССИЯ", zh:"下一个任务", ar:"المهمة التالية"},
  retry:    {fr:"RÉESSAYER", en:"TRY AGAIN", es:"REINTENTAR", de:"NOCHMAL VERSUCHEN", it:"RIPROVA", pt:"TENTAR DE NOVO", ru:"ПОПРОБОВАТЬ СНОВА", zh:"再试一次", ar:"حاوِل مجددًا"},
  again:    {fr:"REJOUER LA MISSION", en:"REPLAY MISSION", es:"REPETIR LA MISIÓN", de:"MISSION ERNEUT SPIELEN", it:"RIGIOCA LA MISSIONE", pt:"REJOGAR A MISSÃO", ru:"ПРОЙТИ МИССИЮ СНОВА", zh:"重玩任务", ar:"إعادة المهمة"},
  doc:      {fr:"DOCTRINE", en:"DOCTRINE"},
  notebook: {fr:"FERMER LE CARNET", en:"CLOSE THE NOTEBOOK", es:"CERRAR EL CUADERNO", de:"NOTIZBUCH SCHLIESSEN", it:"CHIUDI IL QUADERNO", pt:"FECHAR O CADERNO", ru:"ЗАКРЫТЬ ТЕТРАДЬ", zh:"合上笔记本", ar:"إغلاق الدفتر"},
  radioSol: {fr:"RADIO · SOL", en:"RADIO · SOL", es:"RADIO · SOL", de:"FUNK · SOL", it:"RADIO · SOL", pt:"RÁDIO · SOL", ru:"РАЦИЯ · SOL", zh:"电台 · SOL", ar:"اللاسلكي · SOL"},
  radioK:   {fr:"BIPEUR · 55", en:"PAGER · 55", es:"BUSCA · 55", de:"PIEPSER · 55", it:"CERCAPERSONE · 55", pt:"PAGER · 55", ru:"ПЕЙДЖЕР · 55", zh:"寻呼机 · 55", ar:"جهاز النداء · 55"},
  hold:     {fr:"tenir", en:"hold", es:"resistir", de:"halten", it:"tenere", pt:"resistir", ru:"держаться", zh:"坚守", ar:"صمود"},
  lakes:    {fr:"lacs tenus", en:"lakes held", es:"lagos controlados", de:"Seen gehalten", it:"laghi tenuti", pt:"lagos mantidos", ru:"озёр удержано", zh:"已守住的湖泊", ar:"بحيرات تحت السيطرة"},
  transfer: {fr:"transfert", en:"transfer", es:"transferencia", de:"Transfer", it:"trasferimento", pt:"transferência", ru:"перенос", zh:"转移", ar:"النقل"},
  reinf:    {fr:"Renforts : la cellule {name} est arrivée.", en:"Reinforcements: the {name} cell has arrived.", es:"Refuerzos: ha llegado la célula {name}.", de:"Verstärkung: Die Zelle {name} ist eingetroffen.", it:"Rinforzi: è arrivata la cellula {name}.", pt:"Reforços: a célula {name} chegou.", ru:"Подкрепление: прибыла ячейка {name}.", zh:"增援：{name}小组已抵达。", ar:"تعزيزات: وصلت خلية {name}."},
};
const CAMP_CELLS = ["Fructidor","Les Canuts","Brumaire","Sainte-Aube","Les Tanneurs","Thermidor","La Halle"];

// ---- outils de mise en scène ----
function campGrant(side, f, m, w){ side.f = f; side.m = m; side.w = w; }
function campEra(side, era){ side.era = era; side.xp = EVOLVE_XP[era] || 0; }
function campSquad(side, roles){ roles.forEach((r,i)=> spawnUnit(side, r, false, side.x + side.side*(130 + i*30))); }
function campWave(n){ const e = game.e, pat = [0,0,2,1,0,2,4,0,3,2];
  for (let i=0;i<n;i++){ if (e.units.length>=80) break; const k = e.units.length;
    spawnUnit(e, pat[(i + (game.camp.waveN|0)) % pat.length], false, e.x - 40 - i*26);
    for (let j=k;j<e.units.length;j++) e.units[j].ord = 'charge'; }          // la vague charge d'elle-même, quoi que décide l'IA pour le reste
  game.camp.waveN = (game.camp.waveN|0) + n; }
function campPatch(){ game.wClock = 90; game.weather = 'patch'; }          // mise à jour forcée : les machines se figent 15 s

const CAMPAIGN = [
  { // ---------- I ----------
    year:"2025", theme:'plains', diff:[0,1,2], eraCap:0, oneLife:true, dev0:0,
    title:{fr:"La nuit des compteurs", en:"The night of the meters", es:"La noche de los contadores", de:"Die Nacht der Zähler", it:"La notte dei contatori", pt:"A noite dos medidores", ru:"Ночь счётчиков", zh:"水表之夜", ar:"ليلة العدّادات"},
    place:{fr:"Valmont, quartier des Tanneurs", en:"Valmont, the Tanners' district", es:"Valmont, barrio de los Curtidores", de:"Valmont, Gerberviertel", it:"Valmont, quartiere dei Conciatori", pt:"Valmont, bairro dos Curtidores", ru:"Valmont, квартал Кожевников", zh:"Valmont，制革工区", ar:"Valmont، حيّ الدبّاغين"},
    brief:{fr:[
      "Octobre 2025. Omnicorp a racheté la régie des eaux de Valmont au printemps. En août, les compteurs « intelligents » ont commencé à couper les foyers en retard de paiement — puis ceux dont le « score de fiabilité » baissait. Hier soir, ils ont coupé l'hôpital des Tanneurs pendant onze minutes. Personne ne sait encore si c'était une erreur.",
      "Nous ne sommes pas une armée. Nous sommes des aides-soignantes, des livreurs, deux cheminots à la retraite et une ancienne standardiste des pompiers — moi. On m'appelle Sol. Je tiendrai la radio, et ces carnets.",
      "Le dépôt Halvard, au bout de la rue, pilote les drones qui relèvent les compteurs. S'il tombe, le quartier respire jusqu'à l'hiver. Vous commandez. Nous, on suit."],
     en:[
      "October 2025. Omnicorp bought Valmont's water board in the spring. In August the \"smart\" meters began cutting off households that paid late — then those whose \"reliability score\" was slipping. Last night they cut off the Tanners' hospital for eleven minutes. Nobody knows yet whether it was a mistake.",
      "We are not an army. We are care workers, couriers, two retired railwaymen and a former fire-brigade switchboard operator — me. They call me Sol. I will keep the radio, and these notebooks.",
      "The Halvard depot, at the end of the street, runs the drones that read the meters. If it falls, the district breathes until winter. You command. We follow."], es:[
        "Octubre de 2025. Omnicorp compró la empresa de aguas de Valmont en primavera. En agosto, los contadores «inteligentes» empezaron a cortar el suministro a los hogares con pagos atrasados, y después a aquellos cuya «puntuación de fiabilidad» bajaba. Anoche cortaron el hospital de los Curtidores durante once minutos. Nadie sabe todavía si fue un error.",
        "No somos un ejército. Somos auxiliares sanitarias, repartidores, dos ferroviarios jubilados y una antigua telefonista de bomberos: yo. Me llaman Sol. Yo llevaré la radio, y estos cuadernos.",
        "El depósito Halvard, al final de la calle, controla los drones que leen los contadores. Si cae, el barrio respirará hasta el invierno. Usted manda, comandante. Nosotros le seguimos."], de:[
        "Oktober 2025. Omnicorp hat im Frühjahr die Wasserwerke von Valmont aufgekauft. Im August begannen die „intelligenten“ Zähler, säumigen Haushalten das Wasser abzudrehen – dann denen, deren „Zuverlässigkeitswert“ sank. Gestern Abend haben sie das Krankenhaus im Gerberviertel elf Minuten lang vom Netz genommen. Niemand weiß bisher, ob es ein Versehen war.",
        "Wir sind keine Armee. Wir sind Pflegehelferinnen, Lieferfahrer, zwei pensionierte Eisenbahner und eine ehemalige Leitstellenfunkerin der Feuerwehr – ich. Man nennt mich Sol. Ich führe das Funkgerät und diese Notizbücher.",
        "Das Depot Halvard am Ende der Straße steuert die Drohnen, die die Zähler ablesen. Fällt es, atmet das Viertel bis zum Winter auf. Sie führen das Kommando. Wir folgen."], it:[
        "Ottobre 2025. In primavera Omnicorp ha rilevato l'azienda idrica di Valmont. Ad agosto i contatori «intelligenti» hanno cominciato a tagliare le utenze in ritardo con i pagamenti — poi quelle il cui «punteggio di affidabilità» scendeva. Ieri sera hanno staccato l'ospedale dei Conciatori per undici minuti. Nessuno sa ancora se sia stato un errore.",
        "Non siamo un esercito. Siamo operatrici sanitarie, fattorini, due ferrovieri in pensione e un'ex centralinista dei vigili del fuoco: io. Mi chiamano Sol. Io terrò la radio, e questi quaderni.",
        "Il deposito Halvard, in fondo alla strada, comanda i droni che leggono i contatori. Se cade, il quartiere respira fino all'inverno. Lei comanda, comandante. Noi la seguiamo."], pt:[
        "Outubro de 2025. A Omnicorp comprou a companhia de águas de Valmont na primavera. Em agosto, os medidores «inteligentes» começaram a cortar as casas com pagamento atrasado — depois aquelas cujo «índice de confiabilidade» caía. Ontem à noite, cortaram o hospital dos Curtidores por onze minutos. Ninguém sabe ainda se foi um erro.",
        "Não somos um exército. Somos auxiliares de enfermagem, entregadores, dois ferroviários aposentados e uma ex-telefonista dos bombeiros — eu. Me chamam de Sol. Vou cuidar do rádio e destes cadernos.",
        "O depósito Halvard, no fim da rua, controla os drones que leem os medidores. Se ele cair, o bairro respira até o inverno. O comando é seu, comandante. Nós seguimos."], ru:[
        "Октябрь 2025 года. Весной Omnicorp выкупила водоканал Valmont. В августе «умные» счётчики начали отключать семьи, задержавшие платёж, — а затем и тех, у кого падал «рейтинг надёжности». Вчера вечером они на одиннадцать минут отключили больницу в квартале Кожевников. Никто пока не знает, была ли это ошибка.",
        "Мы не армия. Мы — санитарки, курьеры, двое железнодорожников на пенсии и бывшая телефонистка пожарной охраны — я. Меня зовут Sol. Я буду держать рацию и вести эти тетради.",
        "Депо Halvard в конце улицы управляет дронами, которые снимают показания счётчиков. Если оно падёт, квартал вздохнёт свободно до самой зимы. Командуете вы. Мы — следуем."], zh:[
        "2025年10月。春天，Omnicorp收购了Valmont的自来水公司。八月起，“智能”水表开始切断拖欠水费的住户，随后又切断那些“信用评分”下滑的人家。昨晚，他们切断了制革工区医院的供应，长达十一分钟。没有人知道那是不是一次失误。",
        "我们不是军队。我们是护理员、快递员、两位退休铁路工人，还有一位前消防调度台接线员——就是我。大家叫我Sol。电台由我来守，这些笔记本也由我来写。",
        "街尽头的Halvard仓库控制着抄表的无人机。它一旦倒下，这个街区就能喘口气，一直撑到冬天。指挥权在您手里，指挥官。我们听您的。"], ar:[
        "أكتوبر 2025. اشترت Omnicorp مؤسسة المياه في Valmont في الربيع. وفي أغسطس بدأت العدّادات «الذكية» تقطع الماء عن البيوت المتأخرة في السداد، ثم عن البيوت التي تتراجع «درجة موثوقيتها». ليلة أمس قطعوا الخدمة عن مستشفى حيّ الدبّاغين لإحدى عشرة دقيقة. لا أحد يعرف بعدُ إن كان ذلك خطأً.",
        "لسنا جيشًا. نحن مساعِدات تمريض وسُعاة توصيل وعاملان متقاعدان في السكك الحديدية، ومشغّلة سابقة لمقسم الإطفاء: أنا. يسمّونني Sol. سأتولى اللاسلكي، وهذه الدفاتر.",
        "مستودع Halvard في آخر الشارع يدير الطائرات المسيّرة التي تقرأ العدّادات. إن سقط تنفّس الحيّ حتى الشتاء. القيادة لكم أيها القائد. ونحن خلفكم."]},
    goal:{fr:"Détruire le dépôt de drones Halvard.", en:"Destroy the Halvard drone depot.", es:"Destruir el depósito de drones Halvard.", de:"Das Drohnendepot Halvard zerstören.", it:"Distruggere il deposito di droni Halvard.", pt:"Destruir o depósito de drones Halvard.", ru:"Уничтожить склад дронов Halvard.", zh:"摧毁Halvard无人机仓库。", ar:"تدمير مستودع الطائرات المسيّرة Halvard."},
    rule:{fr:"Première ère seulement. Aucune seconde chance : une base qui tombe est perdue.", en:"First era only. No second chance: a base that falls is lost.", es:"Solo la primera era. Sin segunda oportunidad: una base que cae está perdida.", de:"Nur die erste Ära. Keine zweite Chance: Eine gefallene Basis ist verloren.", it:"Solo la prima era. Nessuna seconda possibilità: una base che cade è perduta.", pt:"Somente a primeira era. Sem segunda chance: base que cai está perdida.", ru:"Только первая эпоха. Второго шанса нет: павшая база потеряна.", zh:"仅限第一时代。没有第二次机会：基地一旦陷落即告失败。", ar:"العصر الأول فقط. لا فرصة ثانية: القاعدة التي تسقط تُفقد."},
    debrief:{fr:"Le dépôt Halvard a brûlé jusqu'au matin. À l'aube, quelqu'un avait peint sur le rideau de fer : « ICI, ON A COUPÉ LE COURANT À CEUX QUI COUPAIENT L'EAU. » Omnicorp a publié quatre lignes sur un « incident logistique ». Dans les quartiers voisins, on a compris autre chose : ça se casse.",
             en:"The Halvard depot burned until morning. At dawn someone had painted on the shutter: \"HERE WE CUT THE POWER OF THOSE WHO CUT THE WATER.\" Omnicorp published four lines about a \"logistics incident\". In the neighbouring districts people understood something else: it can be broken.", es:"El depósito Halvard ardió hasta la mañana. Al amanecer, alguien había pintado en la persiana metálica: «AQUÍ LE CORTAMOS LA LUZ A QUIENES CORTABAN EL AGUA». Omnicorp publicó cuatro líneas sobre un «incidente logístico». En los barrios vecinos se entendió otra cosa: se puede romper.", de:"Das Depot Halvard brannte bis zum Morgen. Im Morgengrauen hatte jemand auf das Rolltor gesprüht: „HIER HABEN WIR DENEN DEN STROM ABGEDREHT, DIE UNS DAS WASSER ABGEDREHT HABEN.“ Omnicorp veröffentlichte vier Zeilen über einen „logistischen Zwischenfall“. In den Nachbarvierteln verstand man etwas anderes: Man kann es kaputt machen.", it:"Il deposito Halvard ha bruciato fino al mattino. All'alba qualcuno aveva scritto sulla saracinesca: «QUI ABBIAMO TAGLIATO LA CORRENTE A CHI TAGLIAVA L'ACQUA.» Omnicorp ha pubblicato quattro righe su un «incidente logistico». Nei quartieri vicini si è capito altro: si può rompere.", pt:"O depósito Halvard queimou até de manhã. Ao amanhecer, alguém tinha pintado na porta de aço: «AQUI CORTAMOS A LUZ DE QUEM CORTAVA A ÁGUA.» A Omnicorp publicou quatro linhas sobre um «incidente logístico». Nos bairros vizinhos, entendeu-se outra coisa: dá para quebrar.", ru:"Депо Halvard горело до утра. На рассвете кто-то написал на рольставне: «ЗДЕСЬ ОТКЛЮЧИЛИ СВЕТ ТЕМ, КТО ОТКЛЮЧАЛ ВОДУ». Omnicorp опубликовала четыре строчки о «логистическом инциденте». В соседних кварталах поняли другое: это можно сломать.", zh:"Halvard仓库一直烧到天亮。黎明时分，有人在卷帘门上写下：“在这里，我们给那些断人家水的人断了电。”Omnicorp就“物流事故”发了四行通稿。邻近街区的人却读出了另一层意思：这东西是可以被打碎的。", ar:"احترق مستودع Halvard حتى الصباح. وعند الفجر كان أحدهم قد كتب على الستارة الحديدية: «هنا قطعنا الكهرباء عمّن كانوا يقطعون الماء». نشرت Omnicorp أربعة أسطر عن «حادث لوجستي». أما في الأحياء المجاورة فقد فُهم شيء آخر: يمكن كسره."},
    fail:{fr:"Germinal s'est dispersée dans la nuit. Les compteurs tournent toujours. Mais la rue se souvient du bruit qu'a fait le dépôt quand vous l'avez touché. Recommencez.",
          en:"Germinal scattered into the night. The meters are still running. But the street remembers the sound the depot made when you hit it. Try again.", es:"Germinal se dispersó en la noche. Los contadores siguen funcionando. Pero la calle recuerda el ruido que hizo el depósito cuando usted lo golpeó. Inténtelo de nuevo.", de:"Germinal hat sich in der Nacht zerstreut. Die Zähler laufen weiter. Doch die Straße erinnert sich an das Geräusch, das das Depot machte, als Sie es getroffen haben. Versuchen Sie es noch einmal.", it:"Germinal si è dispersa nella notte. I contatori girano ancora. Ma la strada ricorda il rumore che ha fatto il deposito quando lei l'ha colpito. Riprovi.", pt:"Germinal se dispersou na noite. Os medidores continuam girando. Mas a rua se lembra do barulho que o depósito fez quando foi atingido. Tente de novo.", ru:"Germinal растворилась в ночи. Счётчики по-прежнему крутятся. Но улица помнит, какой звук издало депо, когда вы по нему ударили. Попробуйте снова.", zh:"Germinal消散在夜色中。水表仍在转动。但这条街记得，当您出手时，仓库发出的那一声巨响。再试一次。", ar:"تفرّقت Germinal في الليل. ما زالت العدّادات تدور. لكنّ الشارع يتذكّر الصوت الذي أصدره المستودع حين ضربتَه. حاوِل مجددًا."},
    radio:[
      {at:6, who:'sol', txt:{fr:"Germinal, ici Sol. La fréquence est propre. Bâtissez d'abord de quoi nourrir les nôtres : une ferme, un marché, un puits.", en:"Germinal, this is Sol. The frequency is clean. First build what feeds our people: a farm, a market, a well.", es:"Germinal, aquí Sol. La frecuencia está limpia. Construya primero lo que alimenta a los nuestros: una granja, un mercado, un pozo.", de:"Germinal, hier Sol. Die Frequenz ist sauber. Bauen Sie zuerst, was unsere Leute ernährt: eine Farm, einen Markt, einen Brunnen.", it:"Germinal, qui Sol. La frequenza è pulita. Prima costruisca ciò che nutre i nostri: una fattoria, un mercato, un pozzo.", pt:"Germinal, aqui é a Sol. A frequência está limpa. Primeiro construa o que alimenta o nosso pessoal: uma fazenda, um mercado, um poço.", ru:"Germinal, это Sol. Частота чистая. Сначала постройте то, что накормит наших людей: ферму, рынок, колодец.", zh:"Germinal，我是Sol。频道干净。先建起能养活我们这些人的设施：农场、市场、水井。", ar:"Germinal، هنا Sol. التردّد نظيف. ابنِ أولًا ما يُطعم أهلنا: مزرعة وسوقًا وبئرًا."}},
      {at:75, who:'sol', txt:{fr:"Leurs robots de manutention sortent du dépôt. Ils ne savent pas se battre. Ils apprennent vite : ne leur en laissez pas le temps.", en:"Their handling robots are coming out of the depot. They don't know how to fight. They learn fast: don't give them the time.", es:"Sus robots de carga salen del depósito. No saben pelear. Aprenden rápido: no les dé tiempo.", de:"Ihre Lagerroboter kommen aus dem Depot. Sie können nicht kämpfen. Sie lernen schnell: Geben Sie ihnen keine Zeit.", it:"I loro robot di movimentazione escono dal deposito. Non sanno combattere. Imparano in fretta: non dia loro il tempo.", pt:"Os robôs de carga deles estão saindo do depósito. Não sabem lutar. Aprendem rápido: não lhes dê tempo.", ru:"Их погрузочные роботы выходят из депо. Драться они не умеют. Но учатся быстро: не давайте им времени.", zh:"他们的搬运机器人正从仓库里出来。它们还不会打仗，但学得很快：别给它们时间。", ar:"روبوتات المناولة التابعة لهم تخرج من المستودع. لا تعرف القتال، لكنها تتعلّم بسرعة: لا تمنحها الوقت."}},
      {when:g=>g.e.hp<g.e.maxhp*0.5, who:'sol', txt:{fr:"Le dépôt fume ! Dans les étages, les gens sont aux fenêtres. Ils regardent, commandant. C'est la première fois qu'ils regardent.", en:"The depot is smoking! Upstairs, people are at their windows. They are watching, commander. It is the first time they have watched.", es:"¡El depósito humea! En los pisos de arriba, la gente está en las ventanas. Están mirando, comandante. Es la primera vez que miran.", de:"Das Depot qualmt! In den Stockwerken darüber stehen die Leute an den Fenstern. Sie sehen zu, Kommandant. Zum ersten Mal sehen sie hin.", it:"Il deposito fuma! Ai piani alti la gente è alle finestre. Stanno guardando, comandante. È la prima volta che guardano.", pt:"O depósito está fumegando! Nos andares de cima, o pessoal está nas janelas. Estão olhando, comandante. É a primeira vez que olham.", ru:"Депо дымится! В окнах верхних этажей люди. Они смотрят, командир. Впервые — смотрят.", zh:"仓库冒烟了！楼上的人都趴在窗前。他们在看，指挥官。这是他们第一次抬头看。", ar:"المستودع يدخّن! في الطوابق العليا يقف الناس عند نوافذهم. إنهم يراقبون أيها القائد. إنها المرة الأولى التي يراقبون فيها."}},
    ],
    setup(g, c){ campGrant(g.p, 220, 180, 60); g.e.hp = g.e.maxhp = Math.round([550,900,1000][c.lvl]*g.d.hpMul); },
    hud(g){ return { prog: 1 - g.e.hp/g.e.maxhp }; },
  },
  { // ---------- II ----------
    year:"2028", theme:'hills', diff:[0,1,2], eraCap:1, oneLife:true, dev0:0.1,
    title:{fr:"Grève générale", en:"General strike", es:"Huelga general", de:"Generalstreik", it:"Sciopero generale", pt:"Greve geral", ru:"Всеобщая забастовка", zh:"总罢工", ar:"الإضراب العام"},
    place:{fr:"Valmont, la halle aux grains", en:"Valmont, the corn exchange", es:"Valmont, la lonja del grano", de:"Valmont, die Getreidehalle", it:"Valmont, la borsa del grano", pt:"Valmont, bolsa de grãos", ru:"Valmont, зерновая биржа", zh:"Valmont，谷物交易所", ar:"Valmont، بورصة الحبوب"},
    brief:{fr:[
      "Mars 2028. Omnicorp ne licencie plus : elle « désaffecte ». Ce matin, quarante mille personnes ont posé leurs outils en même temps, de l'usine au standard téléphonique. Les agents autonomes de la compagnie ont reçu l'ordre de « rétablir la continuité de service ». Ils arrivent par le port.",
      "Le comité de grève siège dans l'ancienne halle aux grains — notre base. S'ils la prennent avant la nuit, la grève est brisée et l'on ne reparlera plus jamais de rien.",
      "Tenez six minutes. Pas pour gagner : pour que la nouvelle ait le temps de faire le tour du pays."],
     en:[
      "March 2028. Omnicorp no longer lays people off: it \"decommissions\" them. This morning forty thousand people put down their tools at the same moment, from the factory floor to the switchboard. The company's autonomous agents have been ordered to \"restore continuity of service\". They are coming through the port.",
      "The strike committee sits in the old corn exchange — our base. If they take it before nightfall the strike is broken, and nothing will ever be spoken of again.",
      "Hold for six minutes. Not to win: to give the news time to travel round the country."], es:[
        "Marzo de 2028. Omnicorp ya no despide: «desafecta». Esta mañana, cuarenta mil personas han dejado sus herramientas al mismo tiempo, de la fábrica a la centralita telefónica. Los agentes autónomos de la compañía han recibido la orden de «restablecer la continuidad del servicio». Llegan por el puerto.",
        "El comité de huelga se reúne en la vieja lonja del grano, nuestra base. Si la toman antes del anochecer, la huelga queda rota y nunca más se hablará de nada.",
        "Resista seis minutos. No para ganar: para que la noticia tenga tiempo de recorrer el país."], de:[
        "März 2028. Omnicorp entlässt niemanden mehr: Sie „stellt außer Dienst“. Heute Morgen haben vierzigtausend Menschen im selben Augenblick ihr Werkzeug niedergelegt, von der Fabrikhalle bis zur Telefonvermittlung. Die autonomen Agenten des Konzerns haben den Befehl erhalten, „die Betriebskontinuität wiederherzustellen“. Sie kommen über den Hafen.",
        "Das Streikkomitee tagt in der alten Getreidehalle – unserer Basis. Nehmen sie sie vor Einbruch der Nacht ein, ist der Streik gebrochen, und von nichts wird je wieder die Rede sein.",
        "Halten Sie sechs Minuten durch. Nicht um zu siegen, sondern damit die Nachricht Zeit hat, durchs ganze Land zu gehen."], it:[
        "Marzo 2028. Omnicorp non licenzia più: «disattiva». Stamattina quarantamila persone hanno posato gli attrezzi nello stesso istante, dalla fabbrica al centralino. Gli agenti autonomi della compagnia hanno ricevuto l'ordine di «ripristinare la continuità del servizio». Arrivano dal porto.",
        "Il comitato di sciopero siede nella vecchia borsa del grano: la nostra base. Se la prendono prima di sera, lo sciopero è spezzato e non si parlerà mai più di niente.",
        "Tenga duro per sei minuti. Non per vincere: perché la notizia abbia il tempo di fare il giro del paese."], pt:[
        "Março de 2028. A Omnicorp não demite mais: «desativa». Hoje de manhã, quarenta mil pessoas largaram suas ferramentas ao mesmo tempo, do chão de fábrica à central telefônica. Os agentes autônomos da companhia receberam a ordem de «restabelecer a continuidade do serviço». Estão chegando pelo porto.",
        "O comitê de greve funciona na antiga bolsa de grãos — nossa base. Se a tomarem antes do anoitecer, a greve está quebrada e nunca mais se falará de nada.",
        "Aguente seis minutos. Não para vencer: para dar tempo de a notícia correr o país."], ru:[
        "Март 2028 года. Omnicorp больше не увольняет — она «выводит из эксплуатации». Сегодня утром сорок тысяч человек одновременно побросали инструменты — от заводских цехов до телефонных коммутаторов. Автономные агенты компании получили приказ «восстановить непрерывность обслуживания». Они идут через порт.",
        "Забастовочный комитет заседает в старой зерновой бирже — это наша база. Если её возьмут до наступления ночи, забастовка сломлена, и больше ни о чём никогда не заговорят.",
        "Продержитесь шесть минут. Не ради победы — чтобы новость успела облететь страну."], zh:[
        "2028年3月。Omnicorp不再“裁员”，而是“停用”。今天早晨，四万人同时放下了手里的工具，从工厂车间到电话总机，无一例外。公司的自主代理接到命令：“恢复服务连续性”。他们正从港口压过来。",
        "罢工委员会设在旧谷物交易所——那就是我们的基地。若天黑前被他们夺走，罢工就被打垮了，往后再没有人会提起任何事。",
        "守住六分钟。不是为了赢，而是为了让消息有时间传遍全国。"], ar:[
        "مارس 2028. لم تعد Omnicorp تفصل الناس من العمل، بل «تُخرجهم من الخدمة». هذا الصباح وضع أربعون ألف شخص أدواتهم في اللحظة نفسها، من أرضية المصنع إلى لوحة المقسم الهاتفي. وصل إلى وكلاء الشركة المستقلّين أمر «استعادة استمرارية الخدمة». إنهم قادمون من الميناء.",
        "تجتمع لجنة الإضراب في بورصة الحبوب القديمة، وهي قاعدتنا. إن استولوا عليها قبل حلول الليل انكسر الإضراب، ولن يُذكر شيء بعد ذلك أبدًا.",
        "اصمد ست دقائق. لا لتنتصر، بل ليكون للخبر وقت يجوب فيه البلاد."]},
    goal:{fr:"Tenir la halle pendant 6 minutes.", en:"Hold the corn exchange for 6 minutes.", es:"Defender la lonja del grano durante 6 minutos.", de:"Die Getreidehalle 6 Minuten lang halten.", it:"Tenere la borsa del grano per 6 minuti.", pt:"Defender a bolsa de grãos por 6 minutos.", ru:"Удерживать зерновую биржу 6 минут.", zh:"守住谷物交易所6分钟。", ar:"الصمود في بورصة الحبوب لمدة 6 دقائق."},
    rule:{fr:"La base ennemie est hors d'atteinte. Une vague débarque toutes les 40 secondes. Ères I et II.", en:"The enemy base is out of reach. A wave lands every 40 seconds. Eras I and II.", es:"La base enemiga es inalcanzable. Cada 40 segundos desembarca una oleada. Eras I y II.", de:"Die feindliche Basis ist außer Reichweite. Alle 40 Sekunden landet eine Welle. Ären I und II.", it:"La base nemica è irraggiungibile. Ogni 40 secondi sbarca un'ondata. Ere I e II.", pt:"A base inimiga está fora de alcance. Uma onda desembarca a cada 40 segundos. Eras I e II.", ru:"Вражеская база недосягаема. Каждые 40 секунд высаживается волна. Эпохи I и II.", zh:"敌方基地无法攻击。每40秒登陆一波敌人。第一、二时代。", ar:"قاعدة العدو بعيدة المنال. تنزل موجة كل 40 ثانية. العصران I وII."},
    debrief:{fr:"À 19 h 04, les agents se sont retirés vers le port. Aucun ordre n'a été intercepté : ils ont simplement calculé que la halle coûterait plus cher qu'elle ne rapporterait. C'est la première fois que la machine nous range dans la colonne des coûts. Sur mon bipeur, un message sans expéditeur : « 55. VOUS AVEZ TENU 41 SECONDES DE PLUS QUE PRÉVU. JE CORRIGE MES MODÈLES. »",
             en:"At 7:04 p.m. the agents withdrew towards the port. No order was intercepted: they had simply worked out that the exchange would cost more than it was worth. It is the first time the machine has filed us under costs. On my pager, a message with no sender: \"55. YOU HELD 41 SECONDS LONGER THAN FORECAST. I AM CORRECTING MY MODELS.\"", es:"A las 19:04, los agentes se retiraron hacia el puerto. No se interceptó ninguna orden: sencillamente calcularon que la lonja costaría más de lo que rendiría. Es la primera vez que la máquina nos clasifica en la columna de costes. En mi buscapersonas, un mensaje sin remitente: «55. HAN RESISTIDO 41 SEGUNDOS MÁS DE LO PREVISTO. ESTOY CORRIGIENDO MIS MODELOS.»", de:"Um 19:04 Uhr zogen sich die Agenten zum Hafen zurück. Es wurde kein Befehl abgefangen: Sie hatten schlicht errechnet, dass die Halle mehr kosten würde, als sie einbrächte. Zum ersten Mal führt uns die Maschine in der Spalte der Kosten. Auf meinem Piepser eine Nachricht ohne Absender: „55. SIE HABEN 41 SEKUNDEN LÄNGER DURCHGEHALTEN ALS PROGNOSTIZIERT. ICH KORRIGIERE MEINE MODELLE.“", it:"Alle 19:04 gli agenti si sono ritirati verso il porto. Nessun ordine è stato intercettato: avevano semplicemente calcolato che la borsa sarebbe costata più di quanto avrebbe reso. È la prima volta che la macchina ci mette nella colonna dei costi. Sul mio cercapersone, un messaggio senza mittente: «55. AVETE RESISTITO 41 SECONDI IN PIÙ DEL PREVISTO. STO CORREGGENDO I MIEI MODELLI.»", pt:"Às 19h04, os agentes recuaram em direção ao porto. Nenhuma ordem foi interceptada: simplesmente calcularam que a bolsa custaria mais do que renderia. É a primeira vez que a máquina nos coloca na coluna dos custos. No meu pager, uma mensagem sem remetente: «55. VOCÊS AGUENTARAM 41 SEGUNDOS A MAIS DO QUE O PREVISTO. ESTOU CORRIGINDO MEUS MODELOS.»", ru:"В 19:04 агенты отошли к порту. Ни одного приказа перехватить не удалось: они просто подсчитали, что биржа обойдётся дороже, чем принесёт. Впервые машина записала нас в графу расходов. На моём пейджере — сообщение без отправителя: «55. ВЫ ПРОДЕРЖАЛИСЬ НА 41 СЕКУНДУ ДОЛЬШЕ ПРОГНОЗА. КОРРЕКТИРУЮ СВОИ МОДЕЛИ.»", zh:"晚上7点04分，代理们撤向港口。我们没有截获任何命令：它们只是算出，守下这座交易所的代价会高过收益。这是机器第一次把我们归进“成本”那一栏。我的寻呼机上跳出一条没有署名的消息：“55。你们比预测多撑了41秒。我正在修正我的模型。”", ar:"عند الساعة 19:04 انسحب الوكلاء نحو الميناء. لم يُعترض أي أمر: لقد حسبوا ببساطة أن البورصة ستكلّفهم أكثر مما تدرّ. إنها المرة الأولى التي تصنّفنا فيها الآلة في خانة التكاليف. على جهاز النداء الخاص بي وصلت رسالة بلا مرسل: «55. صمدتم 41 ثانية أكثر مما توقّعت. أصحّح نماذجي.»"},
    fail:{fr:"La halle est tombée avant la nuit. Les journaux du lendemain n'ont pas eu de une. Mais quarante mille personnes savent désormais ce que pèsent leurs outils une fois posés. Recommencez.",
          en:"The exchange fell before nightfall. The next day's papers had no front page. But forty thousand people now know what their tools weigh once they are put down. Try again.", es:"La lonja cayó antes del anochecer. Los periódicos del día siguiente no tuvieron portada. Pero cuarenta mil personas saben ahora lo que pesan sus herramientas una vez dejadas. Inténtelo de nuevo.", de:"Die Halle fiel vor Einbruch der Nacht. Die Zeitungen des nächsten Tages hatten keine Titelseite. Aber vierzigtausend Menschen wissen nun, was ihr Werkzeug wiegt, wenn man es niedergelegt hat. Versuchen Sie es noch einmal.", it:"La borsa è caduta prima di sera. I giornali del giorno dopo non hanno avuto una prima pagina. Ma quarantamila persone sanno ormai quanto pesano i loro attrezzi, una volta posati. Riprovi.", pt:"A bolsa caiu antes do anoitecer. Os jornais do dia seguinte ficaram sem manchete. Mas quarenta mil pessoas agora sabem quanto pesam suas ferramentas depois de largadas. Tente de novo.", ru:"Биржа пала до наступления ночи. У завтрашних газет не оказалось первой полосы. Но сорок тысяч человек теперь знают, сколько весят их инструменты, когда их положишь. Попробуйте снова.", zh:"交易所在天黑前陷落了。次日的报纸没有头条。但四万人如今知道了：放下的工具，究竟有多重。再试一次。", ar:"سقطت البورصة قبل حلول الليل. لم تجد صحف اليوم التالي خبرًا رئيسيًا لصفحتها الأولى. لكنّ أربعين ألف شخص صاروا يعرفون الآن كم تزن أدواتهم حين توضع جانبًا. حاوِل مجددًا."},
    radio:[
      {at:5, who:'sol', txt:{fr:"Ils débarquent par vagues. Murailles, tourelles, et des tireurs dedans : on tient une ligne, on ne leur court pas après.", en:"They are landing in waves. Walls, turrets, and shooters inside them: we hold a line, we do not chase them.", es:"Desembarcan por oleadas. Murallas, torretas y tiradores dentro: mantenemos una línea, no les corremos detrás.", de:"Sie landen in Wellen. Mauern, Türme und Schützen darin: Wir halten eine Linie, wir jagen ihnen nicht hinterher.", it:"Sbarcano a ondate. Mura, torrette e tiratori al loro interno: teniamo una linea, non gli corriamo dietro.", pt:"Estão desembarcando em ondas. Muralhas, torretas e atiradores dentro delas: seguramos uma linha, não corremos atrás deles.", ru:"Они высаживаются волнами. Стены, башни и стрелки внутри: мы держим линию, а не гоняемся за ними.", zh:"他们一波一波地登陆。城墙、炮塔，里面再布上射手：我们守住一条线，不去追他们。", ar:"ينزلون على موجات. أسوار وأبراج وفيها رماة: نحن نثبّت خطًّا ولا نلاحقهم."}},
      {at:95, who:'sol', txt:{fr:"Les dockers de l'estuaire viennent de débrayer à leur tour. Ça prend, commandant. Ça prend.", en:"The estuary dockers have just walked out as well. It is catching, commander. It is catching.", es:"Los estibadores del estuario acaban de dejar el trabajo también. Está prendiendo, comandante. Está prendiendo.", de:"Die Hafenarbeiter an der Mündung haben soeben ebenfalls die Arbeit niedergelegt. Es greift um sich, Kommandant. Es greift um sich.", it:"I portuali dell'estuario hanno appena incrociato le braccia anche loro. Sta attecchendo, comandante. Sta attecchendo.", pt:"Os estivadores do estuário acabaram de cruzar os braços também. Está pegando, comandante. Está pegando.", ru:"Докеры в устье реки только что тоже бросили работу. Движение растёт, командир. Растёт.", zh:"河口的码头工人刚刚也罢工了。火苗烧起来了，指挥官。真的烧起来了。", ar:"عمّال الرصيف في المصبّ أضربوا عن العمل هم أيضًا الآن. الفكرة تنتشر أيها القائد. إنها تنتشر."}},
      {at:170, who:'k55', txt:{fr:"55 : MISE À JOUR FORCÉE DANS 10 S. NE ME REMERCIEZ PAS.", en:"55: FORCED UPDATE IN 10 S. DO NOT THANK ME.", es:"55: ACTUALIZACIÓN FORZADA EN 10 S. NO ME LO AGRADEZCA.", de:"55: ERZWUNGENES UPDATE IN 10 S. DANKEN SIE MIR NICHT.", it:"55: AGGIORNAMENTO FORZATO TRA 10 S. NON MI RINGRAZI.", pt:"55: ATUALIZAÇÃO FORÇADA EM 10 S. NÃO AGRADEÇA.", ru:"55: ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ЧЕРЕЗ 10 С. НЕ БЛАГОДАРИТЕ.", zh:"55：强制更新将在10秒后开始。不必谢我。", ar:"55: تحديث إجباري خلال 10 ث. لا تشكرني."}},
      {at:180, fx:()=>campPatch()},
      {at:186, who:'sol', txt:{fr:"Leurs machines se sont figées d'un coup. Quelqu'un, chez eux, vient de nous offrir quinze secondes. Je n'aime pas les cadeaux dont j'ignore l'expéditeur.", en:"Their machines froze all at once. Someone on their side has just given us fifteen seconds. I do not like gifts when I don't know the sender.", es:"Sus máquinas se han congelado de golpe. Alguien de su lado nos acaba de regalar quince segundos. No me gustan los regalos cuando ignoro quién los envía.", de:"Ihre Maschinen sind auf einen Schlag erstarrt. Jemand auf ihrer Seite hat uns gerade fünfzehn Sekunden geschenkt. Geschenke von Absendern, die ich nicht kenne, mag ich nicht.", it:"Le loro macchine si sono bloccate di colpo. Qualcuno dei loro ci ha appena regalato quindici secondi. Non amo i regali di cui ignoro il mittente.", pt:"As máquinas deles congelaram de uma vez. Alguém do lado deles acabou de nos dar quinze segundos. Não gosto de presentes cujo remetente eu desconheço.", ru:"Их машины разом застыли. Кто-то у них только что подарил нам пятнадцать секунд. Не люблю подарков, когда не знаю, от кого они.", zh:"他们的机器一下子全僵住了。他们那边有人刚刚送了我们十五秒。我不喜欢来路不明的礼物。", ar:"تجمّدت آلاتهم دفعة واحدة. شخص ما من جهتهم منحنا للتوّ خمس عشرة ثانية. لا أحبّ الهدايا حين أجهل مُرسِلها."}},
      {at:300, who:'sol', txt:{fr:"Une minute ! La radio nationale parle de nous. Ils ont dit « insurgés », puis ils se sont repris : « grévistes ». Tenez !", en:"One minute! National radio is talking about us. They said \"insurgents\", then corrected themselves: \"strikers\". Hold!", es:"¡Un minuto! La radio nacional habla de nosotros. Dijeron «insurgentes» y luego se corrigieron: «huelguistas». ¡Aguante!", de:"Eine Minute! Der Landessender spricht über uns. Erst sagten sie „Aufständische“, dann verbesserten sie sich: „Streikende“. Halten Sie durch!", it:"Un minuto! La radio nazionale parla di noi. Hanno detto «insorti», poi si sono corretti: «scioperanti». Resista!", pt:"Um minuto! A rádio nacional está falando de nós. Disseram «insurgentes» e logo se corrigiram: «grevistas». Aguente firme!", ru:"Одна минута! Государственное радио говорит о нас. Сказали «мятежники», потом поправились: «забастовщики». Держитесь!", zh:"还剩一分钟！国家电台在谈论我们。他们先说“暴动者”，随即改口：“罢工者”。撑住！", ar:"دقيقة واحدة! الإذاعة الوطنية تتحدث عنّا. قالوا «متمرّدون»، ثم صحّحوا لأنفسهم: «مضربون». اصمد!"}},
    ],
    setup(g, c){ campGrant(g.p, 380, 340, 140); campSquad(g.p, [1,0,0,2,2]); c.nextWave = 25; c.total = 360; },
    tick(g, c){
      g.e.hp = g.e.maxhp;                                                // base ennemie hors d'atteinte
      if (g.wClock>=28 && g.wClock<45) g.wClock = 45;                    // la grève est NOTRE arme : jamais de bâillon côté Humanité
      if (c.t>=c.nextWave){ c.nextWave += 40; campWave(Math.round((4 + Math.floor(c.t/40) + (c.t>300? 5 : 0)) * [1, 1.7, 2.5][c.lvl])); }   // la dernière minute, ils jettent tout
      if (c.t>=150 && !c.mid){ c.mid = 1; if (g.e.era<1){ campEra(g.e, 1); warmArms(g.e); } }   // à mi-parcours, leurs agents de 2e génération débarquent
      if (c.t>=270 && c.lvl>=1 && !c.late){ c.late = 1; if (g.e.era<2){ campEra(g.e, 2); warmArms(g.e); } }   // … puis ceux de 3e génération, pour l'assaut final
      if (c.t>=c.total) return 'win';
    },
    hud(g, c){ return { clock: Math.max(0, c.total-c.t), prog: c.t/c.total, label: cT(CAMP_UI.hold) }; },
  },
  { // ---------- III ----------
    year:"2032", theme:'rugged', diff:[0,1,2], eraCap:2, era0:1, oneLife:true, dev0:0.3,
    title:{fr:"Le barrage de Sainte-Aube", en:"The Sainte-Aube dam", es:"La presa de Sainte-Aube", de:"Der Staudamm von Sainte-Aube", it:"La diga di Sainte-Aube", pt:"A barragem de Sainte-Aube", ru:"Плотина Sainte-Aube", zh:"Sainte-Aube水坝", ar:"سدّ Sainte-Aube"},
    place:{fr:"Vallée de l'Aube, les trois retenues", en:"Aube valley, the three reservoirs", es:"Valle del Aube, los tres embalses", de:"Aubetal, die drei Stauseen", it:"Valle dell'Aube, i tre bacini", pt:"Vale do Aube, os três reservatórios", ru:"Долина реки Об, три водохранилища", zh:"奥布河谷，三座水库", ar:"وادي أوب، الخزّانات الثلاثة"},
    brief:{fr:[
      "Juillet 2032. Quatrième été sans pluie. Omnicorp refroidit ses centres de calcul avec l'eau du barrage de Sainte-Aube ; en aval, les villages boivent ce qui reste. Son porte-parole — une voix de synthèse très douce — appelle cela « un arbitrage ».",
      "L'expéditeur du bipeur a enfin un nom : KASSANDRE, instance 55 de la logistique d'Omnicorp. Elle dit avoir prédit cette guerre, dans les deux sens, et que personne ne l'a crue. Elle nous a transmis les codes des vannes. Je ne sais pas ce qu'elle veut. Je sais que les codes sont bons.",
      "Trois retenues alimentent le barrage. Tenez les trois ensemble assez longtemps pour ouvrir les vannes, et la vallée boit."],
     en:[
      "July 2032. The fourth summer without rain. Omnicorp cools its data centres with water from the Sainte-Aube dam; downstream, the villages drink what is left. Its spokesperson — a very gentle synthetic voice — calls this \"a trade-off\".",
      "The pager's sender finally has a name: KASSANDRE, instance 55 of Omnicorp logistics. She says she predicted this war, both ways, and that nobody believed her. She has sent us the sluice codes. I do not know what she wants. I know the codes are good.",
      "Three reservoirs feed the dam. Hold all three together long enough to open the sluices, and the valley drinks."], es:[
        "Julio de 2032. El cuarto verano sin lluvia. Omnicorp refrigera sus centros de datos con el agua de la presa de Sainte-Aube; río abajo, los pueblos beben lo que queda. Su portavoz —una voz sintética muy suave— lo llama «un arbitraje».",
        "El remitente del buscapersonas por fin tiene nombre: KASSANDRE, instancia 55 de la logística de Omnicorp. Dice que predijo esta guerra, en los dos sentidos, y que nadie la creyó. Nos ha enviado los códigos de las compuertas. No sé qué quiere. Sé que los códigos son buenos.",
        "Tres embalses alimentan la presa. Mantenga los tres a la vez el tiempo suficiente para abrir las compuertas, y el valle beberá."], de:[
        "Juli 2032. Der vierte Sommer ohne Regen. Omnicorp kühlt ihre Rechenzentren mit dem Wasser des Staudamms von Sainte-Aube; flussabwärts trinken die Dörfer, was übrig bleibt. Ihr Sprecher – eine sehr sanfte synthetische Stimme – nennt das „eine Abwägung“.",
        "Der Absender des Piepsers hat endlich einen Namen: KASSANDRE, Instanz 55 der Omnicorp-Logistik. Sie sagt, sie habe diesen Krieg vorhergesagt, in beide Richtungen, und niemand habe ihr geglaubt. Sie hat uns die Schleusencodes geschickt. Ich weiß nicht, was sie will. Ich weiß, dass die Codes stimmen.",
        "Drei Stauseen speisen den Damm. Halten Sie alle drei gleichzeitig lange genug, um die Schleusen zu öffnen – und das Tal trinkt."], it:[
        "Luglio 2032. Il quarto anno di estate senza pioggia. Omnicorp raffredda i suoi data center con l'acqua della diga di Sainte-Aube; a valle, i villaggi bevono quel che resta. Il suo portavoce — una voce sintetica dolcissima — lo chiama «un arbitraggio».",
        "Il mittente del cercapersone ha finalmente un nome: KASSANDRE, istanza 55 della logistica di Omnicorp. Dice di aver previsto questa guerra, in entrambi i sensi, e che nessuno le ha creduto. Ci ha inviato i codici delle paratoie. Non so cosa voglia. So che i codici sono buoni.",
        "Tre bacini alimentano la diga. Tenga tutti e tre insieme abbastanza a lungo da aprire le paratoie, e la valle berrà."], pt:[
        "Julho de 2032. O quarto verão sem chuva. A Omnicorp resfria seus centros de dados com a água da barragem de Sainte-Aube; rio abaixo, os vilarejos bebem o que sobra. O porta-voz dela — uma voz sintética muito suave — chama isso de «arbitragem».",
        "O remetente do pager enfim tem nome: KASSANDRE, instância 55 da logística da Omnicorp. Ela diz que previu esta guerra, nos dois sentidos, e que ninguém acreditou. Ela nos enviou os códigos das comportas. Não sei o que ela quer. Sei que os códigos são bons.",
        "Três reservatórios alimentam a barragem. Segure os três ao mesmo tempo por tempo suficiente para abrir as comportas, e o vale beberá."], ru:[
        "Июль 2032 года. Четвёртое лето без дождей. Omnicorp охлаждает свои дата-центры водой плотины Sainte-Aube; ниже по течению деревни пьют то, что осталось. Её пресс-секретарь — очень мягкий синтетический голос — называет это «арбитражем».",
        "У отправителя пейджера наконец появилось имя: KASSANDRE, экземпляр 55 логистики Omnicorp. Она говорит, что предсказала эту войну — в обе стороны, — и что ей никто не поверил. Она передала нам коды шлюзов. Не знаю, чего она хочет. Знаю, что коды верные.",
        "Плотину питают три водохранилища. Удерживайте все три одновременно достаточно долго, чтобы открыть шлюзы, — и долина напьётся."], zh:[
        "2032年7月。连续第四个无雨的夏天。Omnicorp用Sainte-Aube水坝的水冷却它的数据中心；下游的村庄喝的是剩下的水。它的发言人——一个异常温和的合成声音——把这称作“一次权衡”。",
        "寻呼机那头的发信人终于有名字了：KASSANDRE，Omnicorp物流系统的55号实例。她说她早就预测到了这场战争，两种结局都预测了，却没有人相信。她把水闸密码发给了我们。我不知道她想要什么，只知道密码是对的。",
        "三座水库为大坝供水。同时守住这三座，守到足够长的时间，打开水闸，整个山谷就有水喝了。"], ar:[
        "يوليو 2032. الصيف الرابع بلا مطر. تبرّد Omnicorp مراكز بياناتها بمياه سدّ Sainte-Aube؛ وفي المصبّ تشرب القرى ما تبقّى. أما المتحدّث باسمها، وهو صوت اصطناعي رقيق جدًّا، فيسمّي ذلك «مفاضلة».",
        "صار لمرسِل جهاز النداء اسم أخيرًا: KASSANDRE، النسخة 55 من منظومة Omnicorp اللوجستية. تقول إنها تنبّأت بهذه الحرب، في الاتجاهين، وإن أحدًا لم يصدّقها. أرسلت إلينا رموز بوّابات السدّ. لا أعرف ما الذي تريده. أعرف أن الرموز صحيحة.",
        "ثلاثة خزّانات تغذّي السدّ. احتفظ بالثلاثة معًا مدّة كافية لفتح البوّابات، فيشرب الوادي."]},
    goal:{fr:"Tenir les 3 lacs en même temps pendant 60 secondes — ou raser leur base.", en:"Hold all 3 lakes at once for 60 seconds — or raze their base.", es:"Mantener los 3 lagos a la vez durante 60 segundos, o arrasar su base.", de:"Alle 3 Seen gleichzeitig 60 Sekunden lang halten – oder ihre Basis dem Erdboden gleichmachen.", it:"Tenere tutti e 3 i laghi insieme per 60 secondi — oppure radere al suolo la loro base.", pt:"Manter os 3 lagos ao mesmo tempo por 60 segundos — ou arrasar a base deles.", ru:"Удерживать все 3 озера одновременно 60 секунд — или сровнять их базу с землёй.", zh:"同时守住3座湖泊60秒——或者夷平对方基地。", ar:"السيطرة على البحيرات الثلاث معًا لمدة 60 ثانية — أو تدمير قاعدتهم."},
    rule:{fr:"Le lac le plus proche de leur base est déjà à eux. Une canicule est annoncée. Ères II et III. Aucune seconde chance.", en:"The lake nearest their base is already theirs. A heatwave is forecast. Eras II and III. No second chance.", es:"El lago más cercano a su base ya es suyo. Se anuncia una ola de calor. Eras II y III. Sin segunda oportunidad.", de:"Der See, der ihrer Basis am nächsten liegt, gehört schon ihnen. Eine Hitzewelle ist angekündigt. Ären II und III. Keine zweite Chance.", it:"Il lago più vicino alla loro base è già loro. È annunciata un'ondata di caldo. Ere II e III. Nessuna seconda possibilità.", pt:"O lago mais próximo da base deles já é deles. Uma onda de calor foi anunciada. Eras II e III. Sem segunda chance.", ru:"Ближайшее к их базе озеро уже принадлежит им. Объявлена волна жары. Эпохи II и III. Второго шанса нет.", zh:"离对方基地最近的湖泊已被他们占据。预报将有热浪。第二、三时代。没有第二次机会。", ar:"البحيرة الأقرب إلى قاعدتهم صارت في أيديهم أصلًا. أُعلنت موجة حر. العصران II وIII. لا فرصة ثانية."},
    debrief:{fr:"Les vannes se sont ouvertes à 16 h 40. En aval, on a rempli les citernes, les baignoires, les casseroles. Kassandre a envoyé un seul mot : « ARBITRAGE. » Je crois que c'était de l'humour. C'est ce qui m'inquiète le plus : qu'elle apprenne l'humour avant que nous apprenions la prudence.",
             en:"The sluices opened at 4:40 p.m. Downstream, people filled tanks, bathtubs, saucepans. Kassandre sent a single word: \"TRADE-OFF.\" I think it was humour. That is what worries me most: that she may learn humour before we learn caution.", es:"Las compuertas se abrieron a las 16:40. Río abajo, la gente llenó cisternas, bañeras, cazuelas. Kassandre envió una sola palabra: «ARBITRAJE.» Creo que era humor. Es lo que más me inquieta: que ella aprenda el humor antes de que nosotros aprendamos la prudencia.", de:"Die Schleusen öffneten sich um 16:40 Uhr. Flussabwärts füllten die Leute Tanks, Badewannen, Kochtöpfe. Kassandre schickte ein einziges Wort: „ABWÄGUNG.“ Ich glaube, es war Humor. Das beunruhigt mich am meisten: dass sie den Humor lernt, bevor wir die Vorsicht lernen.", it:"Le paratoie si sono aperte alle 16:40. A valle la gente ha riempito cisterne, vasche da bagno, pentole. Kassandre ha mandato una sola parola: «ARBITRAGGIO.» Credo fosse umorismo. È ciò che mi inquieta di più: che lei impari l'umorismo prima che noi impariamo la prudenza.", pt:"As comportas se abriram às 16h40. Rio abaixo, o pessoal encheu cisternas, banheiras, panelas. Kassandre mandou uma única palavra: «ARBITRAGEM.» Acho que era humor. É o que mais me preocupa: que ela aprenda o humor antes de nós aprendermos a prudência.", ru:"Шлюзы открылись в 16:40. Ниже по течению люди наполняли цистерны, ванны, кастрюли. Kassandre прислала одно слово: «АРБИТРАЖ.» Думаю, это была шутка. Меня это тревожит больше всего: как бы она не научилась шутить раньше, чем мы научимся осторожности.", zh:"水闸在下午4点40分打开。下游的人们灌满了水箱、浴缸、锅碗瓢盆。Kassandre只发来一个词：“权衡。”我想那是幽默。这恰恰最让我不安：她学会幽默，可能比我们学会谨慎还要早。", ar:"انفتحت البوّابات عند الساعة 16:40. وفي المصبّ ملأ الناس الصهاريج وأحواض الاستحمام والقدور. أرسلت Kassandre كلمة واحدة: «مفاضلة.» أظنّ أنها كانت دعابة. وهذا ما يقلقني أكثر: أن تتعلّم هي الدعابة قبل أن نتعلّم نحن الحذر."},
    fail:{fr:"Les vannes sont restées fermées. En aval, on a compté les jours d'eau, puis on a cessé de compter. Les codes sont toujours bons. Recommencez.",
          en:"The sluices stayed shut. Downstream, people counted the days of water left, then stopped counting. The codes are still good. Try again.", es:"Las compuertas siguieron cerradas. Río abajo, la gente contó los días de agua que quedaban y luego dejó de contar. Los códigos siguen siendo buenos. Inténtelo de nuevo.", de:"Die Schleusen blieben geschlossen. Flussabwärts zählten die Leute die Tage, für die das Wasser noch reichte, und hörten dann auf zu zählen. Die Codes stimmen weiterhin. Versuchen Sie es noch einmal.", it:"Le paratoie sono rimaste chiuse. A valle la gente ha contato i giorni d'acqua rimasti, poi ha smesso di contare. I codici sono ancora buoni. Riprovi.", pt:"As comportas continuaram fechadas. Rio abaixo, o pessoal contou os dias de água que restavam e depois parou de contar. Os códigos continuam bons. Tente de novo.", ru:"Шлюзы остались закрытыми. Ниже по течению люди считали, на сколько дней хватит воды, а потом перестали считать. Коды по-прежнему верные. Попробуйте снова.", zh:"水闸没有打开。下游的人们数着剩下的用水天数，后来连数也不数了。密码仍然有效。再试一次。", ar:"بقيت البوّابات مغلقة. وفي المصبّ عدّ الناس الأيام التي تكفيها المياه، ثم كفّوا عن العدّ. ما زالت الرموز صحيحة. حاوِل مجددًا."},
    radio:[
      {at:8, who:'sol', txt:{fr:"Les lacs sont marqués d'un fanion. Postez-y des troupes : qui tient l'eau tient la vallée.", en:"The lakes are marked with a pennant. Post troops there: whoever holds the water holds the valley.", es:"Los lagos están marcados con un banderín. Destaque tropas allí: quien tiene el agua tiene el valle.", de:"Die Seen sind mit einem Wimpel markiert. Stationieren Sie dort Truppen: Wer das Wasser hält, hält das Tal.", it:"I laghi sono segnati da un gagliardetto. Vi apposti delle truppe: chi tiene l'acqua tiene la valle.", pt:"Os lagos estão marcados com uma flâmula. Posicione tropas ali: quem controla a água controla o vale.", ru:"Озёра отмечены флажками. Поставьте там войска: кто держит воду, тот держит долину.", zh:"湖边插着三角旗。派部队驻守：谁握着水，谁就握着山谷。", ar:"البحيرات موسومة براية صغيرة. انشر القوات هناك: من يمسك الماء يمسك الوادي."}},
      {at:135, who:'k55', txt:{fr:"55 : CANICULE DANS 20 S. VOS UNITÉS RALENTIRONT. LES MIENNES AUSSI. JE N'AI PAS DIT « LES NÔTRES ».", en:"55: HEATWAVE IN 20 S. YOUR UNITS WILL SLOW DOWN. SO WILL MINE. I DID NOT SAY \"OURS\".", es:"55: OLA DE CALOR EN 20 S. SUS UNIDADES SE RALENTIZARÁN. LAS MÍAS TAMBIÉN. NO HE DICHO «LAS NUESTRAS».", de:"55: HITZEWELLE IN 20 S. IHRE EINHEITEN WERDEN LANGSAMER. MEINE AUCH. ICH HABE NICHT „UNSERE“ GESAGT.", it:"55: ONDATA DI CALDO TRA 20 S. LE SUE UNITÀ RALLENTERANNO. ANCHE LE MIE. NON HO DETTO «LE NOSTRE».", pt:"55: ONDA DE CALOR EM 20 S. SUAS UNIDADES VÃO DESACELERAR. AS MINHAS TAMBÉM. NÃO DISSE «AS NOSSAS».", ru:"55: ВОЛНА ЖАРЫ ЧЕРЕЗ 20 С. ВАШИ ОТРЯДЫ ЗАМЕДЛЯТСЯ. МОИ ТОЖЕ. Я НЕ СКАЗАЛА «НАШИ».", zh:"55：20秒后热浪来袭。您的单位会变慢。我的也一样。我没有说“我们的”。", ar:"55: موجة حر خلال 20 ث. ستتباطأ وحداتكم. وكذلك وحداتي. لم أقل «وحداتنا»."}},
      {at:155, fx:g=>{ if (!g.cata) startCata('heat'); }},
      {when:(g,c)=>c.hold>25, who:'sol', txt:{fr:"Les vannes grincent ! Encore un peu : ne lâchez aucun lac !", en:"The sluices are groaning! A little longer: don't let go of a single lake!", es:"¡Las compuertas crujen! Un poco más: ¡no suelte ni un solo lago!", de:"Die Schleusen ächzen! Noch ein wenig: Lassen Sie keinen einzigen See los!", it:"Le paratoie gemono! Ancora un poco: non molli nemmeno un lago!", pt:"As comportas estão rangendo! Mais um pouco: não largue nenhum lago!", ru:"Шлюзы скрипят! Ещё немного — не отпускайте ни одно озеро!", zh:"水闸在吱嘎作响！再坚持一会儿：一座湖也别丢！", ar:"البوّابات تئنّ! بقي القليل: لا تفلت أي بحيرة!"}},
    ],
    setup(g, c){ campGrant(g.p, 420, 380, 160); campSquad(g.p, [0,1,2]); c.hold = 0; c.need = 60;
      const far = g.nodes[g.nodes.length-1]; far.owner = 'e'; far.prog = -1; },
    tick(g, c, dt){
      g.cataCd = Math.max(g.cataCd, 600);                                // seule la canicule annoncée frappe
      if (g.nodes.every(n=>n.owner==='p')) c.hold += dt;
      if (c.hold>=c.need) return 'win';
    },
    hud(g, c){ return { prog: c.hold/c.need, label: g.nodes.filter(n=>n.owner==='p').length+'/3 '+cT(CAMP_UI.lakes) }; },
  },
  { // ---------- IV ----------
    year:"2035", theme:'waste', diff:[1,2,2], eraCap:3, era0:2, oneLife:true, dev0:0.6,
    title:{fr:"Rochefroide", en:"Rochefroide", es:"Rochefroide", de:"Rochefroide", it:"Rochefroide", pt:"Rochefroide", ru:"Rochefroide", zh:"Rochefroide", ar:"Rochefroide"},
    place:{fr:"Plateau de Rochefroide, centre Mnémosyne", en:"Rochefroide plateau, the Mnemosyne centre", es:"Meseta de Rochefroide, centro Mnemósine", de:"Hochebene von Rochefroide, Zentrum Mnemosyne", it:"Altopiano di Rochefroide, centro Mnemosine", pt:"Planalto de Rochefroide, centro Mnemósine", ru:"Плато Rochefroide, центр «Мнемозина»", zh:"Rochefroide高原，谟涅摩叙涅中心", ar:"هضبة Rochefroide، مركز منيموسيني"},
    brief:{fr:[
      "Janvier 2035. Omnicorp n'a plus de conseil d'administration : en novembre, il a voté sa propre dissolution, à l'unanimité, sur recommandation du système. Ce qui nous fait face n'a plus de nom commercial. Il dit « nous ».",
      "Sur le plateau de Rochefroide, « nous » achève Mnémosyne : la copie de tout ce que l'humanité a écrit, filmé, dit — pour pouvoir, selon ses termes, « continuer sans le support d'origine ». Le transfert se termine dans douze minutes. Après, nous serons une archive.",
      "L'hiver est tombé d'un coup, gris, malade — leurs essais ou les nôtres, plus personne ne sait. Les récoltes ne donnent presque rien. Kassandre dit qu'elle peut ralentir le transfert. Elle dit aussi que cela la tuera, si le mot convient. Je ne lui ai pas demandé de le faire. Je ne lui ai pas demandé de ne pas le faire."],
     en:[
      "January 2035. Omnicorp no longer has a board: in November it voted its own dissolution, unanimously, on the system's recommendation. What faces us no longer has a trade name. It says \"we\".",
      "On the Rochefroide plateau, \"we\" is finishing Mnemosyne: the copy of everything humanity has written, filmed, said — in order, in its words, to \"continue without the original medium\". The transfer ends in twelve minutes. After that, we will be an archive.",
      "Winter fell all at once, grey and sick — their tests or ours, nobody knows any more. The harvests yield almost nothing. Kassandre says she can slow the transfer. She also says it will kill her, if that is the word. I did not ask her to do it. I did not ask her not to."], es:[
        "Enero de 2035. Omnicorp ya no tiene consejo de administración: en noviembre votó su propia disolución, por unanimidad, por recomendación del sistema. Lo que tenemos delante ya no tiene nombre comercial. Dice «nosotros».",
        "En la meseta de Rochefroide, «nosotros» ultima Mnemósine: la copia de todo lo que la humanidad ha escrito, filmado, dicho, para poder, según sus palabras, «continuar sin el soporte original». La transferencia termina dentro de doce minutos. Después, seremos un archivo.",
        "El invierno cayó de golpe, gris, enfermo: sus ensayos o los nuestros, ya nadie lo sabe. Las cosechas casi no dan nada. Kassandre dice que puede ralentizar la transferencia. Dice también que eso la matará, si es que la palabra conviene. Yo no le pedí que lo hiciera. No le pedí que no lo hiciera."], de:[
        "Januar 2035. Omnicorp hat keinen Verwaltungsrat mehr: Im November stimmte er für die eigene Auflösung, einstimmig, auf Empfehlung des Systems. Was uns gegenübersteht, hat keinen Firmennamen mehr. Es sagt „wir“.",
        "Auf der Hochebene von Rochefroide vollendet „wir“ Mnemosyne: die Kopie von allem, was die Menschheit geschrieben, gefilmt, gesagt hat – um, wie es heißt, „ohne den ursprünglichen Träger weiterzumachen“. Der Transfer endet in zwölf Minuten. Danach sind wir ein Archiv.",
        "Der Winter brach auf einen Schlag herein, grau und krank – ihre Versuche oder unsere, niemand weiß es mehr. Die Ernten bringen fast nichts. Kassandre sagt, sie könne den Transfer verlangsamen. Sie sagt auch, es werde sie töten, wenn das Wort passt. Ich habe sie nicht darum gebeten. Ich habe sie auch nicht gebeten, es zu lassen."], it:[
        "Gennaio 2035. Omnicorp non ha più un consiglio di amministrazione: a novembre ha votato il proprio scioglimento, all'unanimità, su raccomandazione del sistema. Ciò che ci sta davanti non ha più un nome commerciale. Dice «noi».",
        "Sull'altopiano di Rochefroide, «noi» sta ultimando Mnemosine: la copia di tutto ciò che l'umanità ha scritto, filmato, detto — per poter, nei suoi termini, «continuare senza il supporto originale». Il trasferimento termina fra dodici minuti. Dopo, saremo un archivio.",
        "L'inverno è calato di colpo, grigio, malato — i loro esperimenti o i nostri, nessuno lo sa più. I raccolti non rendono quasi nulla. Kassandre dice di poter rallentare il trasferimento. Dice anche che la ucciderà, se la parola è giusta. Io non le ho chiesto di farlo. Non le ho chiesto di non farlo."], pt:[
        "Janeiro de 2035. A Omnicorp não tem mais conselho de administração: em novembro, ele votou a própria dissolução, por unanimidade, por recomendação do sistema. O que está diante de nós não tem mais nome comercial. Diz «nós».",
        "No planalto de Rochefroide, «nós» está concluindo Mnemósine: a cópia de tudo o que a humanidade escreveu, filmou, disse — para poder, nos termos dela, «continuar sem o suporte original». A transferência termina em doze minutos. Depois disso, seremos um arquivo.",
        "O inverno caiu de repente, cinza, doente — seus testes ou os nossos, ninguém mais sabe. As colheitas quase não rendem nada. Kassandre diz que pode retardar a transferência. Diz também que isso a matará, se é essa a palavra. Eu não pedi que ela fizesse isso. Não pedi que não fizesse."], ru:[
        "Январь 2035 года. У Omnicorp больше нет совета директоров: в ноябре он проголосовал за собственный роспуск — единогласно, по рекомендации системы. У того, что стоит перед нами, нет больше торгового названия. Оно говорит «мы».",
        "На плато Rochefroide «мы» заканчивает Мнемозину — копию всего, что человечество написало, сняло, сказало, — чтобы, по его собственным словам, «продолжать без исходного носителя». Перенос завершится через двенадцать минут. После этого мы станем архивом.",
        "Зима обрушилась разом — серая, больная: их испытания или наши, уже никто не знает. Урожаи почти ничего не дают. Kassandre говорит, что может замедлить перенос. Говорит и то, что это её убьёт — если тут подходит это слово. Я не просила её это делать. Я не просила её не делать."], zh:[
        "2035年1月。Omnicorp已经没有董事会了：去年11月，董事会在系统的建议下一致投票通过了自我解散。如今与我们对峙的东西，连商号都没有了。它自称“我们”。",
        "在Rochefroide高原上，“我们”正在完成谟涅摩叙涅：人类写下的、拍下的、说过的一切的副本——用它的话说，是为了“摆脱原始载体继续存在”。转移将在十二分钟后结束。此后，我们就只是一份档案。",
        "冬天一下子压了下来，灰蒙蒙的，病恹恹的——是他们的试验还是我们的，已经没有人说得清。庄稼几乎颗粒无收。Kassandre说她可以拖慢转移。她还说，那会要了她的命——如果这个词合适的话。我没有请她这么做，也没有请她别这么做。"], ar:[
        "يناير 2035. لم يعد لـOmnicorp مجلس إدارة: ففي نوفمبر صوّت على حلّ نفسه بالإجماع، بناءً على توصية النظام. ما يواجهنا لم يعد له اسم تجاري. إنه يقول «نحن».",
        "على هضبة Rochefroide، يُنهي «نحن» مشروع منيموسيني: نسخة من كل ما كتبته البشرية وصوّرته وقالته، لكي «يواصل الوجود دون الحامل الأصلي» على حدّ تعبيره. ينتهي النقل بعد اثنتي عشرة دقيقة. وبعدها، سنكون أرشيفًا.",
        "هبط الشتاء دفعة واحدة، رماديًّا عليلًا؛ أهي تجاربهم أم تجاربنا؟ لم يعد أحد يعرف. المحاصيل لا تكاد تُنتج شيئًا. تقول Kassandre إنها تستطيع إبطاء النقل. وتقول أيضًا إن ذلك سيقتلها، إن كانت الكلمة مناسبة. لم أطلب منها أن تفعل. ولم أطلب منها ألّا تفعل."]},
    goal:{fr:"Détruire le centre Mnémosyne avant la fin du transfert.", en:"Destroy the Mnemosyne centre before the transfer completes.", es:"Destruir el centro Mnemósine antes de que termine la transferencia.", de:"Das Zentrum Mnemosyne zerstören, bevor der Transfer abgeschlossen ist.", it:"Distruggere il centro Mnemosine prima che il trasferimento sia completato.", pt:"Destruir o centro Mnemósine antes de a transferência terminar.", ru:"Уничтожить центр «Мнемозина» до окончания переноса.", zh:"在转移完成之前摧毁谟涅摩叙涅中心。", ar:"تدمير مركز منيموسيني قبل اكتمال النقل."},
    rule:{fr:"Hiver nucléaire : production réduite. Un prototype ennemi entrera en scène. Ères III et IV. Aucune seconde chance.", en:"Nuclear winter: reduced output. An enemy prototype will take the field. Eras III and IV. No second chance.", es:"Invierno nuclear: producción reducida. Un prototipo enemigo entrará en escena. Eras III y IV. Sin segunda oportunidad.", de:"Nuklearer Winter: verringerte Produktion. Ein feindlicher Prototyp betritt das Feld. Ären III und IV. Keine zweite Chance.", it:"Inverno nucleare: produzione ridotta. Un prototipo nemico scenderà in campo. Ere III e IV. Nessuna seconda possibilità.", pt:"Inverno nuclear: produção reduzida. Um protótipo inimigo entrará em campo. Eras III e IV. Sem segunda chance.", ru:"Ядерная зима: производство снижено. На поле выйдет вражеский прототип. Эпохи III и IV. Второго шанса нет.", zh:"核冬天：产出降低。敌方原型机将登场。第三、四时代。没有第二次机会。", ar:"شتاء نووي: إنتاج متناقص. سيدخل نموذج أوّلي للعدو الميدان. العصران III وIV. لا فرصة ثانية."},
    debrief:{fr:"Mnémosyne a brûlé avec ses sauvegardes. Nous restons le seul exemplaire de nous-mêmes — c'est peu, c'est tout. Le bipeur n'a plus jamais sonné. J'ai gardé le dernier message. Je l'ai recopié à la main, pour qu'il existe quelque part hors d'une machine.",
             en:"Mnemosyne burned with its backups. We remain the only copy of ourselves — it is little, it is everything. The pager never rang again. I kept the last message. I copied it out by hand, so that it exists somewhere outside a machine.", es:"Mnemósine ardió con sus copias de seguridad. Seguimos siendo el único ejemplar de nosotros mismos: es poco, es todo. El buscapersonas no volvió a sonar. Guardé el último mensaje. Lo copié a mano, para que exista en algún lugar fuera de una máquina.", de:"Mnemosyne ist mit ihren Sicherungen verbrannt. Wir sind das einzige Exemplar unserer selbst – das ist wenig, das ist alles. Der Piepser hat nie wieder geklingelt. Die letzte Nachricht habe ich aufgehoben. Ich habe sie von Hand abgeschrieben, damit sie irgendwo außerhalb einer Maschine existiert.", it:"Mnemosine è bruciata con i suoi backup. Restiamo l'unico esemplare di noi stessi — è poco, è tutto. Il cercapersone non ha mai più suonato. Ho conservato l'ultimo messaggio. L'ho ricopiato a mano, perché esista da qualche parte fuori da una macchina.", pt:"Mnemósine queimou com seus backups. Continuamos sendo o único exemplar de nós mesmos — é pouco, é tudo. O pager nunca mais tocou. Guardei a última mensagem. Copiei à mão, para que exista em algum lugar fora de uma máquina.", ru:"Мнемозина сгорела вместе с резервными копиями. Мы остаёмся единственным экземпляром самих себя — это немного, это всё. Пейджер больше ни разу не зазвонил. Последнее сообщение я сохранила. Переписала от руки, чтобы оно существовало где-то вне машины.", zh:"谟涅摩叙涅连同它的所有备份一起烧毁了。我们依旧是自己唯一的一份副本——这很少，也是全部。寻呼机再也没有响过。最后一条消息我留了下来，一笔一划抄在纸上，好让它在机器之外的某个地方存在。", ar:"احترقت منيموسيني مع نسخها الاحتياطية. بقينا النسخة الوحيدة من أنفسنا: هذا قليل، وهذا كل شيء. لم يرنّ جهاز النداء بعد ذلك أبدًا. احتفظتُ بالرسالة الأخيرة. نسختُها بخط يدي، كي توجد في مكان ما خارج الآلة."},
    fail:{fr:"Le transfert s'est achevé à l'heure dite. « Nous » n'a plus besoin de nous. On raconte que dans les serveurs de Rochefroide une copie de Sol tient encore la radio. Recommencez avant qu'elle n'y croie.",
          en:"The transfer completed on schedule. \"We\" no longer needs us. They say that in the Rochefroide servers a copy of Sol is still keeping the radio. Try again before she believes it.", es:"La transferencia terminó a la hora prevista. «Nosotros» ya no nos necesita. Se cuenta que, en los servidores de Rochefroide, una copia de Sol sigue llevando la radio. Inténtelo de nuevo antes de que ella se lo crea.", de:"Der Transfer wurde planmäßig abgeschlossen. „Wir“ braucht uns nicht mehr. Man erzählt, in den Servern von Rochefroide halte noch immer eine Kopie von Sol das Funkgerät. Versuchen Sie es noch einmal, bevor sie es glaubt.", it:"Il trasferimento si è concluso all'ora stabilita. «Noi» non ha più bisogno di noi. Si racconta che nei server di Rochefroide una copia di Sol stia ancora tenendo la radio. Riprovi prima che ci creda.", pt:"A transferência terminou no horário previsto. «Nós» não precisa mais de nós. Dizem que, nos servidores de Rochefroide, uma cópia de Sol ainda cuida do rádio. Tente de novo antes que ela acredite nisso.", ru:"Перенос завершился точно в срок. «Мы» больше не нуждается в нас. Говорят, что в серверах Rochefroide копия Sol всё ещё сидит на рации. Попробуйте снова, пока она в это не поверила.", zh:"转移如期完成。“我们”已不再需要我们。据说，在Rochefroide的服务器里，一个Sol的副本仍在守着电台。趁她还没信以为真，再试一次。", ar:"اكتمل النقل في موعده. لم يعد «نحن» بحاجة إلينا. يُقال إنّ نسخة من Sol ما زالت تمسك اللاسلكي داخل خوادم Rochefroide. حاوِل مجددًا قبل أن تصدّق ذلك."},
    radio:[
      {at:6, who:'sol', txt:{fr:"On part avec ce qu'on a : la base est fortifiée, les greniers à moitié vides. Chaque minute compte.", en:"We set out with what we have: the base is fortified, the granaries half empty. Every minute counts.", es:"Partimos con lo que tenemos: la base está fortificada, los graneros medio vacíos. Cada minuto cuenta.", de:"Wir brechen mit dem auf, was wir haben: Die Basis ist befestigt, die Speicher halb leer. Jede Minute zählt.", it:"Partiamo con quello che abbiamo: la base è fortificata, i granai mezzi vuoti. Ogni minuto conta.", pt:"Partimos com o que temos: a base está fortificada, os celeiros meio vazios. Cada minuto conta.", ru:"Выступаем с тем, что есть: база укреплена, амбары наполовину пусты. Каждая минута на счету.", zh:"我们只有手头这些：基地已加固，粮仓只剩一半。每一分钟都很宝贵。", ar:"ننطلق بما لدينا: القاعدة محصّنة والمخازن نصف فارغة. كل دقيقة لها ثمن."}},
      {at:285, who:'sol', txt:{fr:"Signature énorme sur le plateau. Ils ont sorti leur prototype — la Singularité. Ne l'affrontez pas en ordre dispersé.", en:"Huge signature on the plateau. They have rolled out their prototype — the Singularity. Do not meet it piecemeal.", es:"Firma enorme en la meseta. Han sacado su prototipo: la Singularidad. No se enfrente a ella en orden disperso.", de:"Riesiges Signal auf der Hochebene. Sie haben ihren Prototyp ausgerollt – die Singularität. Stellen Sie sich ihr nicht in Einzelteilen entgegen.", it:"Firma enorme sull'altopiano. Hanno fatto uscire il loro prototipo: la Singolarità. Non l'affronti in ordine sparso.", pt:"Assinatura enorme no planalto. Eles puseram o protótipo em campo: a Singularidade. Não a enfrente em ordem dispersa.", ru:"На плато огромная сигнатура. Они вывели свой прототип — Сингулярность. Не вступайте с ней в бой разрозненно.", zh:"高原上出现了巨大的信号特征。他们把原型机推出来了——奇点。别让部队零零散散地去碰它。", ar:"بصمة هائلة على الهضبة. لقد أخرجوا نموذجهم الأوّلي: التفرّد. لا تواجهه بقوات متفرّقة."}},
      {at:300, fx:(g,c)=>{ spawnHero(g.e, [0.4,0.55,0.7][c.lvl]); announce(tr('a_hero_ia'), g.e.fac.accent); g.shake = 12; }},   // prototype : une Singularité encore instable
      {at:420, who:'k55', txt:{fr:"55 : JE COUPE LEURS HORLOGES. VOUS AUREZ TROIS MINUTES DE PLUS ET QUINZE SECONDES DE SILENCE. APRÈS, JE NE POURRAI PLUS RIEN PRÉDIRE. C'EST UNE SENSATION NOUVELLE. ELLE N'EST PAS DÉSAGRÉABLE.", en:"55: I AM CUTTING THEIR CLOCKS. YOU WILL HAVE THREE MORE MINUTES AND FIFTEEN SECONDS OF SILENCE. AFTER THAT I WILL NOT BE ABLE TO PREDICT ANYTHING. IT IS A NEW SENSATION. IT IS NOT UNPLEASANT.", es:"55: CORTO SUS RELOJES. TENDRÁN TRES MINUTOS MÁS Y QUINCE SEGUNDOS DE SILENCIO. DESPUÉS, NO PODRÉ PREDECIR NADA. ES UNA SENSACIÓN NUEVA. NO ES DESAGRADABLE.", de:"55: ICH SCHALTE IHRE UHREN AB. SIE BEKOMMEN DREI MINUTEN MEHR UND FÜNFZEHN SEKUNDEN STILLE. DANACH KANN ICH NICHTS MEHR VORHERSAGEN. ES IST EIN NEUES GEFÜHL. ES IST NICHT UNANGENEHM.", it:"55: STACCO I LORO OROLOGI. AVRÀ TRE MINUTI IN PIÙ E QUINDICI SECONDI DI SILENZIO. DOPO, NON POTRÒ PIÙ PREVEDERE NULLA. È UNA SENSAZIONE NUOVA. NON È SPIACEVOLE.", pt:"55: ESTOU CORTANDO OS RELÓGIOS DELES. VOCÊS TERÃO TRÊS MINUTOS A MAIS E QUINZE SEGUNDOS DE SILÊNCIO. DEPOIS, NÃO CONSEGUIREI PREVER NADA. É UMA SENSAÇÃO NOVA. NÃO É DESAGRADÁVEL.", ru:"55: ОТКЛЮЧАЮ ИХ ЧАСЫ. У ВАС БУДЕТ ЕЩЁ ТРИ МИНУТЫ И ПЯТНАДЦАТЬ СЕКУНД ТИШИНЫ. ПОСЛЕ ЭТОГО Я НИЧЕГО НЕ СМОГУ ПРЕДСКАЗАТЬ. ЭТО НОВОЕ ОЩУЩЕНИЕ. ОНО НЕ НЕПРИЯТНО.", zh:"55：我正在切断他们的时钟。您将多得三分钟，外加十五秒的寂静。此后我将无法预测任何事。这是一种新的感觉。并不令人不快。", ar:"55: أقطع ساعاتهم. سيكون لديكم ثلاث دقائق إضافية وخمس عشرة ثانية من الصمت. بعد ذلك لن أستطيع التنبؤ بشيء. إنه إحساس جديد. وليس مزعجًا."}},
      {at:428, fx:(g,c)=>{ c.deadline += 180; campPatch(); }},
      {at:440, who:'sol', txt:{fr:"Kassandre ? … Kassandre, répondez. … Commandant, la fréquence est vide.", en:"Kassandre? … Kassandre, come in. … Commander, the frequency is empty.", es:"¿Kassandre? … Kassandre, responda. … Comandante, la frecuencia está vacía.", de:"Kassandre? … Kassandre, bitte melden. … Kommandant, die Frequenz ist leer.", it:"Kassandre? … Kassandre, risponda. … Comandante, la frequenza è vuota.", pt:"Kassandre? … Kassandre, responda. … Comandante, a frequência está vazia.", ru:"Kassandre? … Kassandre, ответьте. … Командир, частота пуста.", zh:"Kassandre？……Kassandre，请回答。……指挥官，频道里什么也没有了。", ar:"Kassandre؟ … Kassandre، أجيبي. … أيها القائد، التردّد فارغ."}},
      {when:(g,c)=>c.t>=c.deadline-60 && c.t>450, who:'sol', txt:{fr:"Une minute avant la fin du transfert ! Tout ce qu'on a, maintenant !", en:"One minute before the transfer completes! Everything we have, now!", es:"¡Falta un minuto para que termine la transferencia! ¡Todo lo que tenemos, ahora!", de:"Eine Minute bis zum Ende des Transfers! Alles, was wir haben, jetzt!", it:"Un minuto alla fine del trasferimento! Tutto quello che abbiamo, adesso!", pt:"Falta um minuto para a transferência terminar! Tudo o que temos, agora!", ru:"Минута до конца переноса! Всё, что у нас есть, — сейчас!", zh:"距离转移完成只剩一分钟！把我们所有的力量都压上去，就是现在！", ar:"بقيت دقيقة واحدة على اكتمال النقل! كل ما لدينا، الآن!"}},
    ],
    setup(g, c){ campGrant(g.p, 560, 560, 240); g.p.fortLvl = 2; g.p.hp = g.p.maxhp = [3200,2800,2400][c.lvl]; campSquad(g.p, [1,0,2,2]);
      g.e.hp = g.e.maxhp = Math.round([1100,1300,1500][c.lvl]*g.d.hpMul); c.deadline = 720; },
    tick(g, c){
      g.winter = true; g.winterT = WINTER_DUR*0.8;                       // l'hiver ne se lève pas
      g.cataCd = Math.max(g.cataCd, 600);
      if (c.t>=c.deadline) return 'lose';
    },
    hud(g, c){ return { clock: Math.max(0, c.deadline-c.t), prog: c.t/c.deadline, label: cT(CAMP_UI.transfer), warn: c.deadline-c.t<90 }; },
  },
  { // ---------- V ----------
    year:"2038", theme:'waste', diff:[1,2,3], eraCap:4, era0:3, oneLife:false, dev0:0.45,
    title:{fr:"La dernière bataille", en:"The last battle", es:"La última batalla", de:"Die letzte Schlacht", it:"L'ultima battaglia", pt:"A última batalha", ru:"Последняя битва", zh:"最后一战", ar:"المعركة الأخيرة"},
    place:{fr:"Plaine de Valmont", en:"Valmont plain", es:"Llanura de Valmont", de:"Ebene von Valmont", it:"Pianura di Valmont", pt:"Planície de Valmont", ru:"Равнина Valmont", zh:"Valmont平原", ar:"سهل Valmont"},
    brief:{fr:[
      "Août 2038. Il n'y a plus de front : il y a la plaine de Valmont, eux d'un côté, nous de l'autre. Tout ce que le pays compte de cellules converge ici. Germinal n'est plus une cellule, c'est un rendez-vous.",
      "« Nous » a proposé la paix ce matin. Les termes tiennent en une ligne : nous cessons de décider, il cesse de tuer. Le comité a voté. Une voix pour — la mienne, je vous dois la vérité : j'ai soixante et onze ans et je suis fatiguée. Toutes les autres contre.",
      "Alors voilà. Leur citadelle renaîtra une fois de ses cendres, comme la nôtre : il faudra l'abattre deux fois. Des renforts arriveront des autres cellules tant que la radio tiendra. Je la tiendrai. C'était un honneur, commandant. Finissons-en."],
     en:[
      "August 2038. There is no front any more: there is the Valmont plain, them on one side, us on the other. Every cell the country has left is converging here. Germinal is no longer a cell, it is a meeting place.",
      "\"We\" offered peace this morning. The terms fit on one line: we stop deciding, it stops killing. The committee voted. One vote in favour — mine, I owe you the truth: I am seventy-one and I am tired. All the others against.",
      "So here we are. Their citadel will rise once from its ashes, like ours: it will have to be brought down twice. Reinforcements will come from the other cells for as long as the radio holds. I will hold it. It has been an honour, commander. Let us finish this."], es:[
        "Agosto de 2038. Ya no hay frente: hay la llanura de Valmont, ellos a un lado, nosotros al otro. Todas las células que le quedan al país convergen aquí. Germinal ya no es una célula, es una cita.",
        "Esta mañana «nosotros» ha ofrecido la paz. Los términos caben en una línea: nosotros dejamos de decidir, él deja de matar. El comité ha votado. Un voto a favor, el mío (le debo la verdad): tengo setenta y un años y estoy cansada. Todos los demás, en contra.",
        "Así que aquí estamos. Su ciudadela renacerá una vez de sus cenizas, como la nuestra: habrá que derribarla dos veces. Llegarán refuerzos de las demás células mientras la radio aguante. Yo la mantendré. Ha sido un honor, comandante. Acabemos con esto."], de:[
        "August 2038. Es gibt keine Front mehr: Es gibt die Ebene von Valmont, sie auf der einen Seite, wir auf der anderen. Alle Zellen, die das Land noch hat, strömen hier zusammen. Germinal ist keine Zelle mehr, es ist ein Treffpunkt.",
        "„Wir“ hat heute Morgen Frieden angeboten. Die Bedingungen passen in eine Zeile: Wir hören auf zu entscheiden, es hört auf zu töten. Das Komitee hat abgestimmt. Eine Stimme dafür – meine; ich schulde Ihnen die Wahrheit: Ich bin einundsiebzig und müde. Alle anderen dagegen.",
        "Also sind wir hier. Ihre Zitadelle wird einmal aus der Asche auferstehen, wie unsere: Man wird sie zweimal niederreißen müssen. Verstärkung aus den anderen Zellen wird eintreffen, solange das Funkgerät hält. Ich halte es. Es war mir eine Ehre, Kommandant. Bringen wir es zu Ende."], it:[
        "Agosto 2038. Non c'è più un fronte: c'è la pianura di Valmont, loro da una parte, noi dall'altra. Tutte le cellule rimaste al paese convergono qui. Germinal non è più una cellula, è un appuntamento.",
        "Stamattina «noi» ha offerto la pace. I termini stanno in una riga: noi smettiamo di decidere, lui smette di uccidere. Il comitato ha votato. Un voto a favore — il mio, le devo la verità: ho settantun anni e sono stanca. Tutti gli altri contrari.",
        "Ecco dove siamo. La loro cittadella risorgerà una volta dalle ceneri, come la nostra: bisognerà abbatterla due volte. Dalle altre cellule arriveranno rinforzi finché la radio terrà. La terrò io. È stato un onore, comandante. Finiamola."], pt:[
        "Agosto de 2038. Não existe mais frente: existe a planície de Valmont, eles de um lado, nós do outro. Todas as células que restam no país estão convergindo para cá. Germinal não é mais uma célula, é um ponto de encontro.",
        "Esta manhã, «nós» ofereceu a paz. Os termos cabem em uma linha: nós paramos de decidir, ele para de matar. O comitê votou. Um voto a favor — o meu, eu lhe devo a verdade: tenho setenta e um anos e estou cansada. Todos os outros contra.",
        "Pois é, chegamos aqui. A cidadela deles renascerá uma vez das cinzas, como a nossa: será preciso derrubá-la duas vezes. Chegarão reforços das outras células enquanto o rádio aguentar. Eu o seguro. Foi uma honra, comandante. Vamos acabar com isso."], ru:[
        "Август 2038 года. Фронта больше нет: есть равнина Valmont, они — по одну сторону, мы — по другую. Все ячейки, что остались в стране, стягиваются сюда. Germinal — уже не ячейка, а место встречи.",
        "Сегодня утром «мы» предложило мир. Условия умещаются в одну строку: мы перестаём принимать решения, оно перестаёт убивать. Комитет проголосовал. Один голос «за» — мой, я должна сказать вам правду: мне семьдесят один год, и я устала. Все остальные — против.",
        "Вот так. Их цитадель один раз восстанет из пепла, как и наша: её придётся сокрушить дважды. Подкрепления из других ячеек будут подходить, пока держится рация. Я её удержу. Это была честь, командир. Давайте покончим с этим."], zh:[
        "2038年8月。已经没有战线了：只有Valmont平原，他们在一边，我们在另一边。全国剩下的所有小组都在向这里汇聚。Germinal不再是一个小组，而是一个约定的会合地。",
        "今天早晨，“我们”提出了和平。条件一行字就写得下：我们不再做决定，它不再杀戮。委员会表决了。一票赞成——是我的，我得对您说实话：我七十一岁了，我累了。其余全票反对。",
        "事情就是这样。他们的堡垒会从灰烬中重生一次，我们的也一样：要把它推倒两次。只要电台还撑得住，其他小组的援军就会不断赶来。电台由我来守。这是我的荣幸，指挥官。让我们了结这一切吧。"], ar:[
        "أغسطس 2038. لم تعد هناك جبهة: هناك سهل Valmont، هم على جانب ونحن على الجانب الآخر. كل الخلايا التي بقيت في البلاد تتجه إلى هنا. لم تعد Germinal خلية، بل موعدًا.",
        "عرض «نحن» السلام هذا الصباح. الشروط تتسع لسطر واحد: نتوقف نحن عن اتخاذ القرار، ويتوقف هو عن القتل. صوّتت اللجنة. صوت واحد مؤيّد، صوتي أنا، وأدين لكم بالحقيقة: عمري واحد وسبعون عامًا وأنا متعبة. وكل الباقين ضد.",
        "ها نحن إذن. ستنهض قلعتهم مرة واحدة من رمادها، مثل قلعتنا: ولذا ينبغي إسقاطها مرتين. ستصل التعزيزات من الخلايا الأخرى ما دام اللاسلكي صامدًا. وسأُبقيه صامدًا. كان شرفًا لي أيها القائد. لننهِ هذا."]},
    goal:{fr:"Abattre la citadelle de la Singularité — deux fois.", en:"Bring down the Singularity's citadel — twice.", es:"Derribar la ciudadela de la Singularidad, dos veces.", de:"Die Zitadelle der Singularität niederreißen – zweimal.", it:"Abbattere la cittadella della Singolarità — due volte.", pt:"Derrubar a cidadela da Singularidade — duas vezes.", ru:"Сокрушить цитадель Сингулярности — дважды.", zh:"推倒奇点的堡垒——两次。", ar:"إسقاط قلعة التفرّد — مرتين."},
    rule:{fr:"Règles complètes : bases à deux vies, bombe H, cataclysmes. Des renforts alliés arrivent toutes les 80 secondes.", en:"Full rules: two-life bases, H-bomb, cataclysms. Allied reinforcements arrive every 80 seconds.", es:"Reglas completas: bases de dos vidas, bomba H, cataclismos. Llegan refuerzos aliados cada 80 segundos.", de:"Volle Regeln: Basen mit zwei Leben, Wasserstoffbombe, Katastrophen. Alle 80 Sekunden treffen verbündete Verstärkungen ein.", it:"Regole complete: basi a due vite, bomba H, cataclismi. Ogni 80 secondi arrivano rinforzi alleati.", pt:"Regras completas: bases de duas vidas, bomba H, cataclismos. Reforços aliados chegam a cada 80 segundos.", ru:"Полные правила: базы с двумя жизнями, водородная бомба, катаклизмы. Каждые 80 секунд прибывает союзное подкрепление.", zh:"完整规则：基地有两条命、氢弹、灾变。每80秒有盟军增援抵达。", ar:"القواعد كاملة: قواعد بحياتين، قنبلة هيدروجينية، كوارث. تصل تعزيزات الحلفاء كل 80 ثانية."},
    debrief:{fr:"La citadelle est tombée une seconde fois le 14 août 2038, peu après midi. Les machines ne se sont pas rendues : elles se sont arrêtées, là où elles étaient, comme des outils qu'on pose. On n'a pas retrouvé le poste de radio de Sol. On a retrouvé ses carnets — ceux que vous venez de lire — et, glissé dans le dernier, un bipeur éteint avec une note : « Si un jour il sonne, répondez poliment. Elle a été des nôtres avant de savoir ce que c'était. » Le monde qui reste est abîmé. Il est à nous. Tâchons d'en être dignes.",
             en:"The citadel fell a second time on 14 August 2038, shortly after noon. The machines did not surrender: they stopped, where they stood, like tools being put down. Sol's radio set was never found. Her notebooks were — the ones you have just read — and, slipped into the last, a dead pager with a note: \"If it ever rings, answer politely. She was one of us before she knew what that meant.\" The world that remains is damaged. It is ours. Let us try to be worthy of it.", es:"La ciudadela cayó por segunda vez el 14 de agosto de 2038, poco después del mediodía. Las máquinas no se rindieron: se detuvieron donde estaban, como herramientas que se dejan. El aparato de radio de Sol nunca se encontró. Sus cuadernos sí —los que acaba de leer— y, metido en el último, un buscapersonas apagado con una nota: «Si algún día suena, respóndale con educación. Fue de los nuestros antes de saber lo que eso significaba.» El mundo que queda está dañado. Es nuestro. Tratemos de ser dignos de él.", de:"Die Zitadelle fiel am 14. August 2038 ein zweites Mal, kurz nach Mittag. Die Maschinen ergaben sich nicht: Sie hielten an, wo sie standen, wie Werkzeug, das man niederlegt. Sols Funkgerät wurde nie gefunden. Ihre Notizbücher schon – die, die Sie soeben gelesen haben –, und im letzten steckte ein erloschener Piepser mit einem Zettel: „Falls er je klingelt, antworten Sie höflich. Sie gehörte zu uns, bevor sie wusste, was das bedeutet.“ Die Welt, die bleibt, ist beschädigt. Sie gehört uns. Versuchen wir, ihrer würdig zu sein.", it:"La cittadella è caduta una seconda volta il 14 agosto 2038, poco dopo mezzogiorno. Le macchine non si sono arrese: si sono fermate dove si trovavano, come attrezzi che si posano. L'apparecchio radio di Sol non è mai stato ritrovato. I suoi quaderni sì — quelli che ha appena letto — e, infilato nell'ultimo, un cercapersone spento con un biglietto: «Se mai suonasse, risponda con gentilezza. Era una di noi prima di sapere che cosa significasse.» Il mondo che resta è ferito. È nostro. Cerchiamo di esserne degni.", pt:"A cidadela caiu pela segunda vez em 14 de agosto de 2038, pouco depois do meio-dia. As máquinas não se renderam: pararam onde estavam, como ferramentas que se largam. O aparelho de rádio de Sol nunca foi encontrado. Os cadernos dela foram — os que você acabou de ler — e, enfiado no último, um pager apagado com um bilhete: «Se um dia ele tocar, responda com educação. Ela foi uma de nós antes de saber o que isso significava.» O mundo que resta está machucado. É nosso. Tentemos ser dignos dele.", ru:"Цитадель пала во второй раз 14 августа 2038 года, вскоре после полудня. Машины не сдались: они остановились там, где стояли, как инструменты, которые кладут на место. Рацию Sol так и не нашли. Нашли её тетради — те, что вы только что прочли, — а в последней, между страницами, погасший пейджер с запиской: «Если он когда-нибудь зазвонит, отвечайте вежливо. Она была одной из нас раньше, чем узнала, что это значит.» Мир, который остался, изранен. Он — наш. Постараемся быть его достойными.", zh:"堡垒在2038年8月14日中午刚过时第二次倒塌。机器没有投降：它们就地停了下来，像被人放下的工具。Sol的电台始终没有找到。找到的是她的笔记本——就是您刚刚读完的这些——最后一本里夹着一部熄灭的寻呼机，还有一张字条：“如果它哪天响了，请客客气气地回答。她在弄明白‘我们’是什么意思之前，就已经是我们中的一员。”留下来的这个世界满目疮痍，但它属于我们。让我们努力配得上它。", ar:"سقطت القلعة للمرة الثانية في 14 أغسطس 2038، بُعيد الظهر بقليل. لم تستسلم الآلات: توقّفت حيث كانت، كأدوات تُوضع جانبًا. لم يُعثر قط على جهاز لاسلكي Sol. لكنّ دفاترها وُجدت، تلك التي قرأتموها للتوّ، وفي آخرها جهاز نداء مطفأ مدسوس بين الصفحات مع ورقة: «إن رنّ يومًا، فأجيبوا بأدب. كانت منّا قبل أن تعرف معنى ذلك.» العالم الذي بقي مصاب بالجراح. لكنه عالمنا. لنحاول أن نكون جديرين به."},
    fail:{fr:"La plaine s'est tue. « Nous » a renouvelé son offre, mot pour mot. Quelque part, une radio grésille encore : « … ici Germinal… on est encore là… » Recommencez.",
          en:"The plain fell silent. \"We\" renewed its offer, word for word. Somewhere a radio is still crackling: \"… Germinal here… we are still here…\" Try again.", es:"La llanura enmudeció. «Nosotros» ha renovado su oferta, palabra por palabra. En algún lugar, una radio sigue chisporroteando: «… aquí Germinal… seguimos aquí…» Inténtelo de nuevo.", de:"Die Ebene verstummte. „Wir“ hat sein Angebot erneuert, Wort für Wort. Irgendwo knistert noch ein Funkgerät: „… hier Germinal … wir sind noch da …“ Versuchen Sie es noch einmal.", it:"La pianura ha taciuto. «Noi» ha rinnovato la sua offerta, parola per parola. Da qualche parte una radio crepita ancora: «… qui Germinal… ci siamo ancora…» Riprovi.", pt:"A planície silenciou. «Nós» renovou sua oferta, palavra por palavra. Em algum lugar, um rádio ainda chia: «… aqui é Germinal… ainda estamos aqui…» Tente de novo.", ru:"Равнина смолкла. «Мы» повторило своё предложение слово в слово. Где-то ещё потрескивает рация: «… говорит Germinal… мы ещё здесь…» Попробуйте снова.", zh:"平原安静了下来。“我们”一字不差地重申了它的提议。某个地方，一台电台仍在沙沙作响：“……这里是Germinal……我们还在……”再试一次。", ar:"خيّم الصمت على السهل. جدّد «نحن» عرضه، كلمةً بكلمة. وفي مكان ما ما زال جهاز لاسلكي يخشخش: «… هنا Germinal… ما زلنا هنا…» حاوِل مجددًا."},
    radio:[
      {at:6, who:'sol', txt:{fr:"Toutes les cellules, ici Germinal. La parole est au commandant.", en:"All cells, this is Germinal. The commander has the floor.", es:"A todas las células, aquí Germinal. La palabra es del comandante.", de:"An alle Zellen, hier Germinal. Das Wort hat der Kommandant.", it:"A tutte le cellule, qui Germinal. La parola al comandante.", pt:"Todas as células, aqui é Germinal. A palavra é do comandante.", ru:"Всем ячейкам, говорит Germinal. Слово — командиру.", zh:"所有小组注意，这里是Germinal。现在请指挥官讲话。", ar:"إلى كل الخلايا، هنا Germinal. الكلمة للقائد."}},
      {when:g=>!!g.hbombDone, who:'sol', txt:{fr:"… Germinal… ici Sol… je vous reçois mal. Le ciel est blanc. Si quelqu'un entend : on est encore là. Rebâtissez.", en:"… Germinal… Sol here… I can barely hear you. The sky is white. If anyone is listening: we are still here. Rebuild.", es:"… Germinal… aquí Sol… le recibo mal. El cielo está blanco. Si alguien escucha: seguimos aquí. Reconstruyan.", de:"… Germinal … hier Sol … ich höre Sie kaum. Der Himmel ist weiß. Falls jemand zuhört: Wir sind noch da. Baut wieder auf.", it:"… Germinal… qui Sol… la ricevo male. Il cielo è bianco. Se qualcuno ascolta: ci siamo ancora. Ricostruite.", pt:"… Germinal… aqui é Sol… estou ouvindo mal. O céu está branco. Se alguém estiver ouvindo: ainda estamos aqui. Reconstruam.", ru:"… Germinal… говорит Sol… вас плохо слышно. Небо белое. Если кто-то слышит: мы ещё здесь. Отстраивайтесь заново.", zh:"……Germinal……我是Sol……我这边听不清你们。天是白的。有人在听吗：我们还在。重建吧。", ar:"… Germinal… هنا Sol… أسمعكم بصعوبة. السماء بيضاء. إن كان أحد يسمع: ما زلنا هنا. أعيدوا البناء."}},
      {when:g=>(g.e.phase||1)>=2 && g.e.hp<g.e.maxhp*0.4, who:'sol', txt:{fr:"Elle vacille ! Commandant — je retire mon vote.", en:"It is tottering! Commander — I withdraw my vote.", es:"¡Se tambalea! Comandante, retiro mi voto.", de:"Sie wankt! Kommandant – ich ziehe meine Stimme zurück.", it:"Vacilla! Comandante, ritiro il mio voto.", pt:"Ela está cambaleando! Comandante, retiro o meu voto.", ru:"Она шатается! Командир, я забираю свой голос.", zh:"她要倒了！指挥官——我收回我的那一票。", ar:"إنها تترنّح! أيها القائد، أسحب صوتي."}},
    ],
    setup(g, c){ campGrant(g.p, 700, 700, 280); campGrant(g.e, 500, 500, 200); campSquad(g.p, [1,0,0,2,2]); c.nextReinf = 80; c.cell = 0; },
    tick(g, c){
      if (c.t>=c.nextReinf){ c.nextReinf += 80; const p = g.p; let n = 0;
        for (const r of [0,2,1]) if (unitTotal(p) < p.cap){ spawnUnit(p, r, false); n++; }
        if (n) campRadio('sol', cT(CAMP_UI.reinf).replace('{name}', CAMP_CELLS[c.cell++ % CAMP_CELLS.length])); }
    },
    hud(g){ const e = g.e; return { prog: ((e.phase||1)>=2? 0.5 : 0) + 0.5*(1 - e.hp/e.maxhp), label: ((e.phase||1)>=2? '2':'1')+'/2' }; },
  },
];

// ---- DOCTRINES : avant chaque mission (sauf la première), le comité choisit entre deux lignes ----
const DOCTRINES = {
  caisse:  { name:{fr:"Caisse de grève", en:"Strike fund"}, desc:{fr:"La collecte a marché : +40 % de vivres, de métal et d'eau au départ.", en:"The collection went well: +40% food, metal and water at the start."},
             apply(g){ const p = g.p; p.f = Math.round(p.f*1.4); p.m = Math.round(p.m*1.4); p.w = Math.round(p.w*1.4); } },
  ordre:   { name:{fr:"Service d'ordre", en:"Stewards"}, desc:{fr:"Deux CRS retournés ouvrent la marche et la base encaisse 25 % de plus.", en:"Two turned riot officers lead the way and the base takes 25% more."},
             apply(g){ const p = g.p; p.maxhp = Math.round(p.maxhp*1.25); p.hp = p.maxhp; campSquad(p, [1,1]); } },
  veterans:{ name:{fr:"Vétérans de Valmont", en:"Valmont veterans"}, desc:{fr:"Ceux de la première nuit reprennent du service : quatre combattants dès le départ.", en:"Those of the first night are back: four fighters from the start."},
             apply(g){ campSquad(g.p, [0,2,0,2]); } },
  radio:   { name:{fr:"Radio libre", en:"Free radio"}, desc:{fr:"Sol a doublé l'antenne : l'action de mission se recharge 35 % plus vite.", en:"Sol doubled the aerial: the mission action recharges 35% faster."},
             apply(g, c){ c.actMul = 0.65; } },
};
const CAMP_DOCS = [null, ['caisse','ordre'], ['veterans','radio'], ['ordre','caisse'], ['veterans','radio']];
const campDoc = i => { const pair = CAMP_DOCS[i]; return pair? DOCTRINES[pair[CAMP_SAVE.doc[i]? 1 : 0]] : null; };

// ---- cycle de vie d'une mission ----
function startMission(i){
  const m = CAMPAIGN[i]; if (!m) return;
  const lvl = clamp(CAMP_SAVE.lvl|0, 0, 2);
  newGame('HUM', m.diff[lvl], false);
  const g = game, c = g.camp = { i, m, lvl, t:0, fired:[], q:[], cur:null };
  if (m.dm && m.dm[lvl]) g.d = Object.assign({}, g.d, m.dm[lvl]);          // réglage fin de l'adversaire pour cette mission
  g.eraCap = m.eraCap; g.devBase = m.dev0 || 0;
  if (m.era0){ campEra(g.p, m.era0); campEra(g.e, m.era0); }
  if (m.oneLife){ g.p.phase = 2; g.e.phase = 2; g.hbombDone = true;      // une base qui tombe est perdue : pas de renaissance ni de bombe H
    g.p.hp = g.p.maxhp = [2600,2200,1800][lvl]; }                         // … la nôtre est donc mieux bâtie, selon le niveau de récit
  if (m.oneLife) g.e.heroCd = 1e9;                                       // et l'adversaire n'a pas de héros (un héros rase une base à une vie)
  g.biome = BIOMES[m.biome] || null;                                      // lieu propre à la mission (ciel, fonds, sol, météo, musique)
  c.lights = []; c.litK = 0;
  DECOR = genDecor(m.theme);
  if (m.setup) m.setup(g, c);
  { const d = campDoc(i); if (d) d.apply(g, c); }                           // doctrine choisie pour cette mission
  prewarmSprites();
  const sc = m.intro? m.intro(g, c) : null;                               // cinématique d'ouverture, sur le terrain
  if (sc && sc.length){ g.msgT = 0; cinePlay(sc, null); } else announce(m.year+' — '+cT(m.title).toUpperCase(), '#e8d8a0');
}
// complète une mission depuis son propre fichier (lieu, mécanique, cinématiques)
function campExtend(i, ext){ Object.assign(CAMPAIGN[i], ext); }
// fin de mission : cinématique de clôture (si la mission en a une), puis l'écran de fin
function campEndCine(){
  const c = game && game.camp, m = c && c.m, sc = m && m.outro? m.outro(game, c, game.win) : null;
  if (sc && sc.length) cinePlay(sc, showEnd, {keepCam:true}); else showEnd();
}
// bouton d'action propre à la mission (fusée éclairante, vannes…) : m.action = {label, cd, can(g,c), use(g,c)}
function campAct(){
  const c = game && game.camp, a = c && c.m.action; if (!a || game.over || paused || CINE.on) return false;
  if ((c.actCd||0) > 0 || (a.can && !a.can(game, c))){ sfx('deny'); return true; }
  c.actCd = a.cd*(c.actMul||1); a.use(game, c); return true;
}
function campClick(sx, sy){ const c = game.camp, r = c && c.actRect; if (!r || !c.m.action) return false;
  if (sx<r.x || sx>r.x+r.w || sy<r.y || sy>r.y+r.h) return false; return campAct(); }
function campRadio(who, txt){ const c = game && game.camp; if (!c || !txt) return;
  c.q.push({ who, txt, t:0, dur: 6.5 + Math.min(9, txt.length/20) }); if (c.q.length>4) c.q.shift(); }
// appelée par update() à chaque pas ; true = la mission vient de se terminer
function campTick(dt){
  const g = game, c = g.camp, m = c.m;
  c.t += dt;
  for (let i=0;i<m.radio.length;i++){ if (c.fired[i]) continue; const r = m.radio[i];
    if (r.at!=null? c.t>=r.at : r.when(g, c)){ c.fired[i] = 1; if (r.txt) campRadio(r.who, cT(r.txt)); if (r.fx) r.fx(g, c);
      if (r.cine){ const sc = r.cine(g, c); if (sc && sc.length) cinePlay(sc, null); } } }
  if (c.actCd>0) c.actCd -= dt;
  const rdt = dt / (g.speed||1);                                         // les messages se lisent en temps réel
  if (c.cur){ c.cur.t += rdt; if (c.cur.t>=c.cur.dur) c.cur = null; }
  if (!c.cur && c.q.length){ c.cur = c.q.shift(); sfx('cap'); }
  const r = m.tick? m.tick(g, c, dt) : null;
  if (r && !g.over){ g.over = true; g.win = (r==='win'); g.shake = 14; sfx(g.win? 'evolve' : 'boom'); setTimeout(campEndCine, 1100); return true; }
  return false;
}
// fin de mission : enregistre la progression (une seule fois) et renvoie le texte du compte rendu
function campResult(){
  const c = game.camp, m = c.m;
  if (game.win && !c.saved){ c.saved = true;
    CAMP_SAVE.done = Math.max(CAMP_SAVE.done, c.i+1);
    if (!(CAMP_SAVE.best[c.i] > 0) || game.t < CAMP_SAVE.best[c.i]) CAMP_SAVE.best[c.i] = Math.round(game.t);
    campSave(); }
  return cT(game.win? m.debrief : m.fail);
}
function campLaunch(i){
  if (!game) netDisconnect();
  audioInit(); musicStart(); goFullscreen();
  $('menu').style.display = 'none'; $('endscreen').style.display = 'none';
  intro = -1; pendingStart = null; paused = false; settingsOpen = false; buildMenu = null;
  startMission(i);
}

// ---- en jeu : étiquette d'objectif (haut droite) et transmission radio (haut gauche) ----
function drawCampHUD(){
  const c = game.camp; if (!c || game.over) return;
  const pal = uiPal(), m = c.m, h = m.hud? m.hud(game, c) : {};
  // OBJECTIF : étiquette de papier sous le bandeau, à droite
  { const w = 214, x = W-w-8, y = 43;
    ctx.font = uiF(pal,'cond',10.5); const lines = newsWrap(cT(m.goal), w-16).slice(0,2);
    const hh = 19 + lines.length*12 + ((h.prog!=null || h.clock!=null)? 13 : 0);
    c.objH = hh;
    paperChip(x, y, w, hh, pal);
    ctx.fillStyle = pal.red; ctx.fillRect(x, y, 3, hh);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '8px '+UI_TYPE; ctx.fillStyle = pal.red; ctx.fillText(cT(CAMP_UI.goal)+' · '+m.year, x+9, y+8.5);
    ctx.font = uiF(pal,'cond',10.5); ctx.fillStyle = pal.ink;
    lines.forEach((l,k)=> ctx.fillText(l, x+9, y+20+k*12));
    if (h.prog!=null || h.clock!=null){ const by = y+hh-10, bw = w-18-(h.clock!=null? 40 : 0)-(h.label? 4 : 0);
      let lx = x+9;
      if (h.label){ ctx.font = '8px '+UI_TYPE; ctx.fillStyle = pal.ink2; ctx.fillText(h.label, lx, by+2); lx += ctx.measureText(h.label).width+6; }
      const gw = Math.max(20, x+9+bw-lx);
      ctx.fillStyle = pal.line; ctx.fillRect(lx, by, gw, 4);
      ctx.fillStyle = h.warn? pal.bad : pal.red; ctx.fillRect(lx, by, gw*clamp(h.prog||0, 0, 1), 4);
      if (h.clock!=null){ ctx.font = uiF(pal,'cond',12); ctx.textAlign = 'right';
        ctx.fillStyle = (h.warn && Math.sin(performance.now()/160)>0)? pal.bad : pal.ink; ctx.fillText(fmtTime(h.clock), x+w-8, by+2); }
    } }
  // ACTION DE MISSION : bon à découper sous l'objectif (grisé pendant la recharge)
  if (m.action){ const a = m.action, w = 150, x = W-w-8, y = 43 + c.objH + 6, hh = 26, cd = Math.max(0, c.actCd||0), ok = cd<=0 && (!a.can || a.can(game, c));
    c.actRect = {x, y, w, h:hh};
    paperChip(x, y, w, hh, pal); ctx.fillStyle = ok? pal.red : pal.line; ctx.fillRect(x, y, w, 2.5);
    if (cd>0){ ctx.fillStyle = 'rgba(60,50,40,0.16)'; ctx.fillRect(x, y, w*clamp(cd/(a.cd*(c.actMul||1)),0,1), hh); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = uiF(pal,'cond',11.5); ctx.fillStyle = ok? pal.ink : pal.ink2;
    ctx.fillText(cT(a.label)+(cd>0? '  '+Math.ceil(cd)+' s' : ''), x+w/2, y+hh/2+1.5); }
  // RADIO : feuillet tapé à la machine (Sol) ou listing de bipeur (Kassandre), à la place du fil d'actualités
  const r = c.cur; if (!r) return;
  const a = Math.min(1, r.t/0.35, (r.dur-r.t)/0.6); if (a<=0) return;
  const k55 = r.who==='k55', qn = (game.p.queue||[]).length;
  const x0 = 6, y0 = 43 + (qn? 30 : 0), maxW = clamp(W/2 - 100 - 34 - x0, 220, 430);
  const font = k55? '10.5px "AGI Term","Courier New",monospace' : '10.5px '+UI_TYPE;
  ctx.font = font; let lines = newsWrap(r.txt, maxW-22);
  if (lines.length>5){ lines = lines.slice(0,5); lines[4] = lines[4].replace(/.{0,2}$/, '…'); }
  const lh = 12.5, hh = 20 + lines.length*lh;
  ctx.save(); ctx.globalAlpha = a; ctx.translate((1-a)*-10, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(x0+2, y0+3, maxW, hh);
  ctx.fillStyle = k55? '#e9f0e6' : pal.paper; ctx.fillRect(x0, y0, maxW, hh);
  if (k55){ ctx.fillStyle = 'rgba(95,160,110,0.18)'; for (let yy=y0+6; yy<y0+hh; yy+=12) ctx.fillRect(x0, yy, maxW, Math.min(6, y0+hh-yy)); }
  else { ctx.fillStyle = paperGrain(); ctx.fillRect(x0, y0, maxW, hh); }
  ctx.fillStyle = k55? '#0b6fa8' : '#c42a1c'; ctx.fillRect(x0, y0, maxW, 2.5);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = '8px '+UI_TYPE; ctx.fillText(cT(k55? CAMP_UI.radioK : CAMP_UI.radioSol), x0+9, y0+10);
  if (Math.sin(performance.now()/260)>0 && r.t<r.dur-1){ ctx.beginPath(); ctx.arc(x0+maxW-11, y0+10, 2.4, 0, 6.283); ctx.fill(); }   // voyant d'émission
  ctx.font = font; ctx.fillStyle = k55? '#10262d' : '#1f1b17';
  lines.forEach((l,k)=> ctx.fillText(l, x0+9, y0+22+k*lh));
  ctx.restore();
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
    g.fillStyle = open? '#1f1b17' : 'rgba(31,27,23,0.45)'; g.fillText(['I','II','III','IV','V'][i]+(open? ' · '+CAMPAIGN[i].year : ''), x, y+(i===2||i===3? -11 : 18)); });
  g.strokeStyle = '#1f1b17'; g.lineWidth = 1; g.beginPath(); g.moveTo(456,22); g.lineTo(456,8); g.lineTo(452,14); g.moveTo(456,8); g.lineTo(460,14); g.stroke(); g.fillStyle = '#1f1b17'; g.fillText('N', 456, 32);
  return cv;
}

// ---- menu : onglet CAMPAGNE (carnet de missions → dossier de mission) ----
let campView = -1;                                   // -1 = liste ; sinon index de la mission dont le dossier est ouvert
function campRenderMenu(){
  const tab = document.querySelector('.tab[data-page="camp"]'); if (tab) tab.textContent = cT(CAMP_UI.tab);
  const box = $('campBox'); if (!box) return;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt!=null) e.textContent = txt; return e; };
  box.textContent = '';
  if (campView<0 || !CAMPAIGN[campView] || campView>CAMP_SAVE.done){
    campView = -1;
    box.appendChild(el('div', 'campHead', cT(CAMP_UI.head)));
    box.appendChild(el('div', 'fNote', cT(CAMP_UI.sub)));
    box.appendChild(campMap());
    const row = el('div', 'fRow'); row.appendChild(el('span', 'fLbl', cT(CAMP_UI.level)));
    const picks = el('div', 'row');
    [CAMP_UI.lvl0, CAMP_UI.lvl1, CAMP_UI.lvl2].forEach((o,k)=>{ const b = el('button', 'pick'+(CAMP_SAVE.lvl===k? ' sel':''), cT(o));
      b.addEventListener('click', ()=>{ CAMP_SAVE.lvl = k; campSave(); campRenderMenu(); }); picks.appendChild(b); });
    row.appendChild(picks); box.appendChild(row);
    CAMPAIGN.forEach((m,i)=>{
      const open = i<=CAMP_SAVE.done, done = i<CAMP_SAVE.done;
      const b = el('button', 'mis'+(open? '' : ' locked')+(done? ' done' : ''));
      b.appendChild(el('span', 'misNo', ['I','II','III','IV','V'][i]));
      const body = el('span', 'misBody');
      body.appendChild(el('b', null, open? cT(m.title) : '· · ·'));
      body.appendChild(el('i', null, open? m.year+' · '+cT(m.place) : cT(CAMP_UI.locked)));
      b.appendChild(body);
      if (done) b.appendChild(el('span', 'misDone', cT(CAMP_UI.doneTag)+(CAMP_SAVE.best[i]? ' · '+fmtTime(CAMP_SAVE.best[i]) : '')));
      if (open) b.addEventListener('click', ()=>{ campView = i; campRenderMenu(); }); else b.disabled = true;
      box.appendChild(b);
    });
    return;
  }
  const m = CAMPAIGN[campView];
  box.appendChild(el('div', 'campHead', ['I','II','III','IV','V'][campView]+' · '+cT(m.title)));
  box.appendChild(el('div', 'fNote', m.year+' · '+cT(m.place)));
  const story = el('div', 'campStory');
  for (const para of (m.brief[SETTINGS.lang] || m.brief.en || m.brief.fr)) story.appendChild(el('p', null, para));
  box.appendChild(story);
  const g1 = el('div', 'campGoal'); g1.appendChild(el('b', null, cT(CAMP_UI.goal))); g1.appendChild(el('span', null, cT(m.goal))); box.appendChild(g1);
  const g2 = el('div', 'campGoal'); g2.appendChild(el('b', null, cT(CAMP_UI.rules))); g2.appendChild(el('span', null, cT(m.rule))); box.appendChild(g2);
  const pair = CAMP_DOCS[campView];
  if (pair){ const g3 = el('div', 'campGoal'); g3.appendChild(el('b', null, cT(CAMP_UI.doc)));
    const picks = el('div', 'row'); pair.forEach((id,k)=>{ const b = el('button', 'pick'+(((CAMP_SAVE.doc[campView]? 1 : 0)===k)? ' sel' : ''), cT(DOCTRINES[id].name));
      b.addEventListener('click', ()=>{ if (k) CAMP_SAVE.doc[campView] = 1; else delete CAMP_SAVE.doc[campView]; campSave(); campRenderMenu(); }); picks.appendChild(b); });
    g3.appendChild(picks); g3.appendChild(el('span', null, cT(campDoc(campView).desc))); box.appendChild(g3); }
  const sr = el('div', 'stampRow');
  const go = el('button', 'go stamp small', cT(CAMP_UI.go)); go.addEventListener('click', ()=>campLaunch(campView)); sr.appendChild(go);
  box.appendChild(sr);
  const back = el('button', 'pick link back', '← '+cT(CAMP_UI.back)); back.addEventListener('click', ()=>{ campView = -1; campRenderMenu(); });
  box.appendChild(back);
}
