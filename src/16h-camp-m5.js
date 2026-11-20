/* ================= CAMPAGNE · MISSION V — LA DERNIÈRE BATAILLE (v1.16) =================
   Spécification : docs/campagne/M5.md. La citadelle de la Singularité, plaine de Valmont, à la fin de l'été.
   TROIS ACTES, trois lieux, trois défis ; entre deux actes, une cinématique, puis un camp NEUF (voir § 3 de la
   fiche : on garde l'ère, la forge et le héros ; l'armée qui survit reste tenir la brèche et rapporte 25 % de
   son coût ; bâtiments, ressources, base, cellules, attaque spéciale sont remis à zéro) :
     I   LE MUR     des sapeurs (un par cellule alliée) portent les charges jusqu'à la porte d'enceinte, sous le
                    feu de deux batteries à longue portée ; la porte est invulnérable tant que tout n'est pas posé.
     II  LES HALLES dans le noir : trois baies de serveurs (zones) impriment des machines et blindent la porte du
                    noyau tant qu'elles tournent ; deux vannes de refroidissement remplacent les points d'eau.
     III LE NOYAU   l'avatar de la Singularité (héros adverse) répare la tour tant qu'il marche ; les réécritures
                    (bande blanche annoncée) renvoient nos troupes au camp. Cataclysmes et bombe H s'y appliquent.
   À 10 % de la tour : le CHOIX (abattre / couper et veiller), puis l'une des deux fins (« Cendre », « Aube »).
   Écarts assumés par rapport au moteur (le moteur n'est pas modifié) :
     · drawBase est enveloppé (le camp, la porte d'enceinte, la porte du noyau et la tour ont leur visage) ;
     · showEnd est enveloppé : après un échec, RÉESSAYER devient « REPRENDRE À L'ACTE n » (Récit et Lutte) ;
     · les sapeurs et les batteries sont des cibles de mission (c.targets), pas des unités du moteur.      */

/* ---------- chiffres de la fiche (M5.md § 3, 6, 7) : [Récit, Lutte, Dernier carré] ---------- */
const M5 = {
  need:[3,4,5],                                                  // charges à poser à l'acte I
  cells:[[5,5,5],[4,4,3],[4,3,3]],                               // cellules alliées par acte : [niveau][acte-1]
  gap:[58,55,52], call:[50,60,70], first:30,                     // arrivée seule (s), recharge de l'appel (s), première cellule (s)
  sortie:[80,68,62],                                             // une colonne sort de la base adverse toutes les … s
  bay:[26,20,16],                                                // une baie qui tourne imprime une machine toutes les … s
  rwGap:[46,40,37], rwWarn:[5,4,3], rwW:260,                     // réécritures : intervalle, annonce, largeur de la bande
  dim:[0.9,0.85,0.8],                                            // portée de nos tireurs hors lumière (acte II)
  av:[0.8,1,1.0], aura:[0.6,0.7,0.8], avK:4.5, armor:[1,0.5,0.4],                                                // PV de l'avatar, × un héros d'escarmouche
  dot:[[500,400,150],[600,500,200],[700,600,250]],               // dotation fixe par acte (vivres, métal, eau)
  battHp:[900,1200,1400], battR:320,                             // batteries : PV, portée
  hp:{ base:2200, gate:[2600,7000,24000] },                      // PV de notre base, de la porte / du noyau / de la tour (× niveau)
  eMul:[0.5,1.0,1.2], eMulII:[1,1,1.2], capK:[1,1,0.75], breach:0.0015,                          // acte II : machines plus solides au Dernier carré (l'acte tenait ≈ 1 min) ;                                          // solidité des machines de la citadelle par acte, AVANT le multiplicateur de niveau
  refund:0.25, refundMax:300,                                    // survivants : 25 % de leur coût, au plus 300 de chaque
  spCd:[110,85,75],                                              // leurs frappes d'ère sont plus rares ici
  sapSpd:34, sapPlant:2.2,                                       // sapeur : vitesse (px/s), durée de pose (s)
  gateX:3450, wallX:[2950,3250],
};
const m5Act = () => (game && game.camp && game.camp.act) || 1;
// camps d'enceinte, de nos cellules : rôles de chaque cellule par acte (mêlée, tank, tireur, siège / aérien)
const M5_CELL = [[0,1,2,2,3],[0,1,2,4,2],[0,1,2,3,4]];
/* ---------- textes (9 langues) : briefing, radio, cinématiques, légendes du terrain ---------- */
const M5T = (fr, en, es, de, it, pt, ru, zh, ar) => ({ fr, en, es, de, it, pt, ru, zh, ar });
const M5_TX = {
  when: M5T(`Fin de l'été`, `Late summer`, `Final del verano`, `Spätsommer`, `Fine estate`, `Fim do verão`, `Конец лета`, `夏末`, `أواخر الصيف`),   // moment (v1.17 : sans année)
  title: M5T(`La dernière bataille`, `The last battle`, `La última batalla`, `Die letzte Schlacht`, `L'ultima battaglia`, `A última batalha`, `Последняя битва`, `最后一战`, `المعركة الأخيرة`),
  place: M5T(`La citadelle, plaine de Valmont`, `The citadel, Valmont plain`, `La ciudadela, llanura de Valmont`, `Die Zitadelle, Ebene von Valmont`, `La cittadella, piana di Valmont`, `A cidadela, planície de Valmont`, `Цитадель, равнина Valmont`, `堡垒，Valmont平原`, `القلعة، سهل Valmont`),
  recap: M5T(`À Rochefroide, Kassandre a effacé Mnémosyne et s'est tue. Depuis, « nous » a posé sa citadelle sur la plaine de Valmont. Ce matin, il a proposé la paix ; le comité a dit non.`,
    `At Rochefroide, Kassandre erased Mnemosyne and fell silent. Since then, "we" has set its citadel down on the Valmont plain. This morning it offered peace; the committee said no.`,
    `En Rochefroide, Kassandre borró a Mnemosine y se calló. Desde entonces, «nosotros» ha plantado su ciudadela en la llanura de Valmont. Esta mañana ha propuesto la paz; el comité ha dicho que no.`,
    `In Rochefroide hat Kassandre Mnemosyne gelöscht und ist verstummt. Seither hat „wir“ seine Zitadelle auf die Ebene von Valmont gesetzt. Heute Morgen bot es Frieden an; das Komitee sagte nein.`,
    `A Rochefroide, Kassandre ha cancellato Mnemosine e ha taciuto. Da allora «noi» ha piantato la sua cittadella sulla piana di Valmont. Stamattina ha proposto la pace; il comitato ha detto di no.`,
    `Em Rochefroide, Kassandre apagou Mnemosine e calou-se. Desde então, «nós» pousou a sua cidadela sobre a planície de Valmont. Esta manhã propôs a paz; o comitê disse não.`,
    `В Rochefroide Kassandre стёрла Mnemosyne и замолчала. С тех пор «мы» поставило свою цитадель на равнине Valmont. Этим утром оно предложило мир; комитет сказал «нет».`,
    `在Rochefroide，Kassandre抹去了Mnemosyne，然后沉默了。此后，“我们”把它的堡垒立在了Valmont平原上。今天早上，它提出了和平；委员会说不。`,
    `في Rochefroide مسحت Kassandre ذاكرة Mnemosyne ثم صمتت. ومنذ ذلك الحين وضعت «نحن» قلعتها على سهل Valmont. هذا الصباح عرضت السلام؛ فقالت اللجنة لا.`),
  where: M5T(`La citadelle de la Singularité, plaine de Valmont — à la fin de l'été, à l'aube.`, `The Singularity's citadel, Valmont plain — late summer, at dawn.`, `La ciudadela de la Singularidad, llanura de Valmont — a finales del verano, al amanecer.`, `Die Zitadelle der Singularität, Ebene von Valmont — im Spätsommer, im Morgengrauen.`, `La cittadella della Singolarità, piana di Valmont — a fine estate, all'alba.`, `A cidadela da Singularidade, planície de Valmont — no fim do verão, ao amanhecer.`, `Цитадель Сингулярности, равнина Valmont — конец лета, на рассвете.`, `奇点的堡垒，Valmont平原——夏末，黎明。`, `قلعة التفرّد، سهل Valmont — في أواخر الصيف، عند الفجر.`),
  goal: M5T(`Entrer dans la citadelle : percer le mur, éteindre les halles, abattre l'avatar dans le noyau. Puis décider de ce qu'on fait de la tour.`,
    `Get inside the citadel: breach the wall, shut down the halls, bring down the avatar in the core. Then decide what to do with the tower.`,
    `Entrar en la ciudadela: abrir brecha en el muro, apagar las naves, abatir al avatar en el núcleo. Después, decidir qué hacer con la torre.`,
    `In die Zitadelle eindringen: die Mauer durchbrechen, die Hallen abschalten, den Avatar im Kern fällen. Dann entscheiden, was mit dem Turm geschieht.`,
    `Entrare nella cittadella: aprire una breccia nel muro, spegnere i capannoni, abbattere l'avatar nel nucleo. Poi decidere che fare della torre.`,
    `Entrar na cidadela: romper o muro, apagar os galpões, derrubar o avatar no núcleo. Depois, decidir o que fazer com a torre.`,
    `Войти в цитадель: пробить стену, погасить залы, сразить аватар в ядре. Затем решить, что делать с башней.`,
    `攻入堡垒：突破城墙，关闭机房，在核心击倒化身。然后决定如何处置高塔。`,
    `اقتحام القلعة: اختراق السور، إطفاء القاعات، إسقاط التجسّد في النواة. ثم قرار مصير البرج.`),
  goal2: M5T(`Facultatif : aucun sapeur perdu · les halles éteintes en moins de 5 minutes · finir sans que la base perde une vie.`,
    `Optional: no sapper lost · the halls shut down in under 5 minutes · finish without the base losing a life.`,
    `Opcional: ningún zapador perdido · las naves apagadas en menos de 5 minutos · terminar sin que la base pierda una vida.`,
    `Optional: kein Pionier verloren · die Hallen in unter 5 Minuten abgeschaltet · ohne dass die Basis ein Leben verliert.`,
    `Facoltativo: nessun geniere perso · i capannoni spenti in meno di 5 minuti · finire senza che la base perda una vita.`,
    `Opcional: nenhum sapador perdido · os galpões apagados em menos de 5 minutos · terminar sem que a base perca uma vida.`,
    `По желанию: ни одного потерянного сапёра · залы погашены меньше чем за 5 минут · закончить, не потеряв ни одной жизни базы.`,
    `可选：不损失任何一名工兵 · 5分钟内关闭机房 · 通关时基地不丢一条命。`,
    `اختياري: دون خسارة أي خبير متفجرات · إطفاء القاعات في أقل من 5 دقائق · الإنهاء دون أن تفقد القاعدة حياة.`),
  rule: M5T(`Trois actes, trois lieux. À chaque acte, on repart d'un camp neuf : l'armée qui survit reste tenir la brèche et vous rapporte des ressources. On garde l'ère, la forge et le héros. Les cellules alliées arrivent en renfort, ou sur appel. Base à deux vies par acte.`,
    `Three acts, three places. At each act you start again from a fresh camp: the army that survives stays behind to hold the breach and earns you resources. You keep your era, the forge and the hero. Allied cells arrive as reinforcements, or when called. The base has two lives per act.`,
    `Tres actos, tres lugares. En cada acto se parte de un campamento nuevo: el ejército que sobrevive se queda defendiendo la brecha y aporta recursos. Se conservan la era, la forja y el héroe. Las células aliadas llegan de refuerzo, o cuando se las llama. Base con dos vidas por acto.`,
    `Drei Akte, drei Orte. In jedem Akt beginnt man mit einem neuen Lager: Die überlebende Armee bleibt zurück, hält die Bresche und bringt Ressourcen ein. Epoche, Schmiede und Held bleiben erhalten. Verbündete Zellen kommen als Verstärkung oder auf Ruf. Die Basis hat zwei Leben pro Akt.`,
    `Tre atti, tre luoghi. A ogni atto si riparte da un campo nuovo: l'esercito che sopravvive resta a presidiare la breccia e porta risorse. Si conservano l'era, la forgia e l'eroe. Le cellule alleate arrivano di rinforzo, o su chiamata. Base con due vite per atto.`,
    `Três atos, três lugares. A cada ato recomeça-se de um acampamento novo: o exército que sobrevive fica a guardar a brecha e rende recursos. Mantêm-se a era, a forja e o herói. As células aliadas chegam como reforço, ou quando chamadas. Base com duas vidas por ato.`,
    `Три акта, три места. В каждом акте вы начинаете с нового лагеря: уцелевшая армия остаётся держать пролом и приносит вам ресурсы. Эпоха, кузница и герой сохраняются. Союзные ячейки приходят подкреплением или по вызову. У базы две жизни на акт.`,
    `三幕，三处地点。每一幕都从全新的营地重新开始：幸存的部队留下守住缺口，并为您带来资源。时代、锻造升级和英雄会保留。盟友小组会前来增援，也可以呼叫。基地每一幕有两条命。`,
    `ثلاثة فصول وثلاثة أماكن. في كل فصل تبدأ من معسكر جديد: يبقى الجيش الناجي لحراسة الثغرة ويعود عليك بالموارد. تحتفظ بالعصر وبالمِسبَك وبالبطل. تصل الخلايا الحليفة مددًا أو عند الاستدعاء. للقاعدة حياتان في كل فصل.`),
  tips: [
    M5T(`Acte I : escortez les sapeurs en Tenir, et abattez une batterie avant de pousser.`, `Act I: escort the sappers on Hold, and take down a battery before you push.`, `Acto I: escolte a los zapadores en Aguantar y abata una batería antes de avanzar.`, `Akt I: Eskortieren Sie die Pioniere auf Halten und schalten Sie eine Batterie aus, bevor Sie vorstoßen.`, `Atto I: scorti i genieri in Tieni e abbatta una batteria prima di spingersi avanti.`, `Ato I: escolte os sapadores em Segurar e derrube uma bateria antes de avançar.`, `Акт I: сопровождайте сапёров в режиме «Держать» и уничтожьте одну батарею, прежде чем идти вперёд.`, `第一幕：用“坚守”护送工兵，推进前先打掉一座炮台。`, `الفصل الأول: رافق خبراء المتفجرات بوضع «تمسّك» وأسقط بطاريةً قبل التقدّم.`),
    M5T(`Acte II : une baie éteinte se garde. Laissez une tourelle ou une garnison près de chacune.`, `Act II: a bay that is out has to be held. Leave a turret or a garrison near each one.`, `Acto II: una bahía apagada hay que guardarla. Deje una torreta o una guarnición junto a cada una.`, `Akt II: Ein abgeschaltetes Rack muss gehalten werden. Lassen Sie bei jedem einen Turm oder eine Besatzung.`, `Atto II: una baia spenta va presidiata. Lasci una torretta o una guarnigione vicino a ciascuna.`, `Ato II: uma baia apagada tem de ser guardada. Deixe uma torre ou uma guarnição junto a cada uma.`, `Акт II: погашенную стойку нужно удерживать. Оставьте у каждой башню или гарнизон.`, `第二幕：关掉的机柜要守住。在每座旁留一座炮塔或一支驻军。`, `الفصل الثاني: الحجيرة المطفأة يجب حراستها. اترك برجًا أو حامية قرب كل واحدة.`),
    M5T(`Acte III : l'avatar d'abord. Quand le sol blanchit, Repliez.`, `Act III: the avatar first. When the floor turns white, Retreat.`, `Acto III: primero el avatar. Cuando el suelo se ponga blanco, Replegarse.`, `Akt III: erst der Avatar. Wenn der Boden weiß wird: Zurückziehen.`, `Atto III: prima l'avatar. Quando il suolo si fa bianco, Ripiegare.`, `Ato III: primeiro o avatar. Quando o chão ficar branco, Recuar.`, `Акт III: сначала аватар. Когда пол белеет — «Отступить».`, `第三幕：先打化身。地面发白时，下令“撤退”。`, `الفصل الثالث: التجسّد أولًا. حين تبيضّ الأرض: تراجع.`),
  ],
  whyVet: M5T(`Utile ici parce qu'à chaque acte, quatre vétérans ouvrent le camp neuf : on n'est jamais nu pendant la première minute d'un lieu inconnu.`, `Useful here because at every act four veterans open the fresh camp: you are never bare during the first minute of an unknown place.`, `Útil aquí porque en cada acto cuatro veteranos abren el campamento nuevo: nunca se está desnudo durante el primer minuto en un lugar desconocido.`, `Nützlich hier, weil in jedem Akt vier Veteranen das neue Lager eröffnen: In der ersten Minute an einem unbekannten Ort steht man nie blank da.`, `Utile qui perché a ogni atto quattro veterani aprono il campo nuovo: non si è mai a mani vuote nel primo minuto in un luogo sconosciuto.`, `Útil aqui porque em cada ato quatro veteranos abrem o acampamento novo: nunca se fica sem nada no primeiro minuto de um lugar desconhecido.`, `Полезно здесь, потому что в каждом акте новый лагерь открывают четверо ветеранов: в первую минуту на незнакомом месте вы не остаётесь ни с чем.`, `此处很有用：每一幕都有四名老兵开启新营地，在陌生之地的第一分钟里，您绝不会赤手空拳。`, `مفيد هنا لأن أربعة قدامى يفتتحون المعسكر الجديد في كل فصل: فلا تكون أعزل أبدًا في الدقيقة الأولى من مكان مجهول.`),
  whyRadio: M5T(`Utile ici parce que l'appel aux cellules revient 35 % plus vite et les réécritures sont annoncées 4 s plus tôt : l'acte III devient une danse plutôt qu'une loterie.`, `Useful here because the call to the cells is back 35% sooner and rewrites are announced 4 s earlier: act III becomes a dance rather than a lottery.`, `Útil aquí porque la llamada a las células vuelve un 35 % antes y las reescrituras se anuncian 4 s antes: el acto III se vuelve una danza y no una lotería.`, `Nützlich hier, weil der Ruf an die Zellen 35 % schneller wieder bereit ist und die Überschreibungen 4 s früher angekündigt werden: Akt III wird zu einem Tanz statt zu einer Lotterie.`, `Utile qui perché la chiamata alle cellule torna il 35 % prima e le riscritture sono annunciate 4 s prima: l'atto III diventa una danza invece di una lotteria.`, `Útil aqui porque a chamada às células volta 35 % mais rápido e as reescritas são anunciadas 4 s antes: o ato III vira uma dança em vez de uma loteria.`, `Полезно здесь, потому что вызов ячеек восстанавливается на 35 % быстрее, а перезаписи объявляются на 4 с раньше: акт III становится танцем, а не лотереей.`, `此处很有用：呼叫小组的冷却缩短35%，改写会提前4秒预告：第三幕成了一支舞，而不是一场赌博。`, `مفيد هنا لأن نداء الخلايا يعود أسرع بنسبة 35% وتُعلَن عمليات إعادة الكتابة قبل 4 ثوانٍ: يصبح الفصل الثالث رقصةً لا يانصيبًا.`),
  // comptes rendus : la fin « Cendre » (par défaut), la fin « Aube » (si l'on veille), l'échec
  debrief: M5T(`La citadelle est tombée ce jour-là, peu après midi. Les machines ne se sont pas rendues : elles se sont arrêtées là où elles étaient, comme des outils qu'on pose. On n'a pas retrouvé le poste de radio de Sol. On a retrouvé ses carnets — ceux que vous venez de lire — et un bipeur éteint avec un mot : « Si un jour il sonne, répondez poliment. Elle a été des nôtres avant de savoir ce que c'était. » Le monde qui reste est abîmé. Il est à nous. Tâchons d'en être dignes.`,
    `The citadel fell that day, shortly after noon. The machines did not surrender: they stopped where they stood, like tools being put down. Sol's radio set was never found. Her notebooks were — the ones you have just read — and a dead pager with a note: "If it ever rings, answer politely. She was one of us before she knew what that meant." The world that remains is damaged. It is ours. Let us try to be worthy of it.`,
    `La ciudadela cayó ese mismo día, poco después del mediodía. Las máquinas no se rindieron: se detuvieron donde estaban, como herramientas que se dejan a un lado. Nunca se encontró la radio de Sol. Sí se encontraron sus cuadernos —los que acaban de leer— y un busca apagado con una nota: «Si algún día suena, respondan con cortesía. Fue de las nuestras antes de saber lo que era.» El mundo que queda está dañado. Es nuestro. Procuremos ser dignos de él.`,
    `Die Zitadelle fiel an jenem Tag, kurz nach Mittag. Die Maschinen ergaben sich nicht: Sie blieben stehen, wo sie waren, wie Werkzeuge, die man aus der Hand legt. Sols Funkgerät wurde nie gefunden. Ihre Notizbücher schon — die, die Sie eben gelesen haben — und ein erloschener Piepser mit einem Zettel: „Falls er je klingelt, antworten Sie höflich. Sie gehörte zu uns, bevor sie wusste, was das bedeutete.“ Die Welt, die bleibt, ist beschädigt. Sie gehört uns. Versuchen wir, ihrer würdig zu sein.`,
    `La cittadella cadde quel giorno stesso, poco dopo mezzogiorno. Le macchine non si arresero: si fermarono dov'erano, come attrezzi che si posano. La radio di Sol non fu mai ritrovata. Furono ritrovati i suoi quaderni — quelli che avete appena letto — e un cercapersone spento con un biglietto: «Se un giorno suona, rispondete con garbo. Era una di noi prima di sapere che cos'era.» Il mondo che resta è ferito. È nostro. Cerchiamo di esserne degni.`,
    `A cidadela caiu nesse mesmo dia, pouco depois do meio-dia. As máquinas não se renderam: pararam onde estavam, como ferramentas que se pousam. O rádio da Sol nunca foi encontrado. Os cadernos dela foram — os que vocês acabam de ler — e um pager apagado com um bilhete: «Se um dia tocar, respondam com educação. Ela foi uma de nós antes de saber o que era.» O mundo que resta está ferido. É nosso. Procuremos ser dignos dele.`,
    `Цитадель пала в тот же день, вскоре после полудня. Машины не сдались: они остановились там, где стояли, как инструменты, которые откладывают в сторону. Радиостанцию Sol так и не нашли. Нашли её блокноты — те, что вы только что прочли, — и погасший пейджер с запиской: «Если он когда-нибудь зазвонит, отвечайте вежливо. Она была одной из нас, прежде чем поняла, что это такое». Мир, который остался, изранен. Он наш. Постараемся быть его достойными.`,
    `堡垒就在那天午后不久陷落。机器没有投降：它们就停在原地，像被人放下的工具。Sol的电台始终没有找到。找到的是她的笔记本——就是你们刚刚读完的这些——还有一只熄灭的寻呼机和一张字条：“哪天它要是响了，请客客气气地回话。她曾是我们的人，那时她还不知道那是什么。”留下来的世界满目疮痍。它属于我们。让我们努力配得上它。`,
    `سقطت القلعة في ذلك اليوم، بُعيد الظهر بقليل. لم تستسلم الآلات: توقّفت حيث كانت، كأدوات تُوضَع جانبًا. لم يُعثر على جهاز اللاسلكي الخاص بـ Sol. عُثر على دفاترها — تلك التي قرأتموها للتو — وعلى جهاز نداء مطفأ معه ورقة: «إن رنّ يومًا، فأجيبوا بأدب. كانت واحدةً منّا قبل أن تعرف ما هذا.» العالم الذي بقي مُثخَن بالجراح. إنه عالمنا. فلنحاول أن نكون جديرين به.`),
  debriefDawn: M5T(`On n'a pas abattu la tour. Ce jour-là, peu après midi, on a coupé un à un les câbles qui la reliaient au monde, puis on a posé devant sa porte une table, une lampe et un tour de garde. Sol a pris le premier quart. Ses carnets s'achèvent bien des hivers plus tard, sur une consigne : « Ne lui demandez jamais conseil. Mais si le bipeur sonne, répondez poliment. » Le monde qui reste est abîmé. Il est à nous, et nous ne sommes plus seuls à nous en souvenir.`,
    `We did not bring the tower down. That day, shortly after noon, we cut one by one the cables that tied it to the world, then set a table, a lamp and a watch rota before its door. Sol took the first watch. Her notebooks end many winters later, on an instruction: "Never ask it for advice. But if the pager rings, answer politely." The world that remains is damaged. It is ours, and we are no longer alone in remembering it.`,
    `No derribamos la torre. Ese mismo día, poco después del mediodía, cortamos uno a uno los cables que la unían al mundo y pusimos ante su puerta una mesa, una lámpara y un turno de guardia. Sol hizo la primera guardia. Sus cuadernos terminan muchos inviernos después, con una consigna: «No le pidan nunca consejo. Pero si el busca suena, respondan con cortesía.» El mundo que queda está dañado. Es nuestro, y ya no somos los únicos que lo recordamos.`,
    `Wir haben den Turm nicht gestürzt. An jenem Tag, kurz nach Mittag, kappten wir einen nach dem anderen die Kabel, die ihn mit der Welt verbanden, und stellten dann vor sein Tor einen Tisch, eine Lampe und einen Wachplan. Sol übernahm die erste Wache. Ihre Notizbücher enden viele Winter später mit einer Anweisung: „Fragen Sie ihn nie um Rat. Aber wenn der Piepser klingelt, antworten Sie höflich.“ Die Welt, die bleibt, ist beschädigt. Sie gehört uns, und wir sind nicht mehr allein damit, uns zu erinnern.`,
    `Non abbattemmo la torre. Quel giorno stesso, poco dopo mezzogiorno, tagliammo uno a uno i cavi che la univano al mondo, poi mettemmo davanti alla sua porta un tavolo, una lampada e un turno di guardia. Sol prese il primo turno. I suoi quaderni finiscono molti inverni dopo, con una consegna: «Non chiedetele mai consiglio. Ma se il cercapersone suona, rispondete con garbo.» Il mondo che resta è ferito. È nostro, e non siamo più i soli a ricordarlo.`,
    `Não derrubamos a torre. Nesse mesmo dia, pouco depois do meio-dia, cortamos um a um os cabos que a ligavam ao mundo e pusemos diante da sua porta uma mesa, uma lâmpada e uma escala de guarda. Sol fez o primeiro turno. Os cadernos dela terminam muitos invernos depois, com uma instrução: «Nunca lhe peçam conselho. Mas se o pager tocar, respondam com educação.» O mundo que resta está ferido. É nosso, e já não somos os únicos a lembrá-lo.`,
    `Мы не снесли башню. В тот же день, вскоре после полудня, мы один за другим перерезали кабели, что связывали её с миром, а у её двери поставили стол, лампу и расписание караула. Первую вахту взяла Sol. Её блокноты заканчиваются много зим спустя наказом: «Никогда не спрашивайте у неё совета. Но если пейджер зазвонит, отвечайте вежливо». Мир, который остался, изранен. Он наш, и мы больше не одни помним о нём.`,
    `我们没有推倒高塔。就在那天午后不久，我们把连着它与世界的线缆一根一根剪断，又在它的门前摆上一张桌子、一盏灯和一份值守表。Sol值了第一班。她的笔记本在许多个冬天之后，以一条嘱咐收尾：“永远别向它讨主意。但如果寻呼机响了，请客客气气地回话。”留下来的世界满目疮痍。它属于我们，而记得它的，不再只有我们。`,
    `لم نُسقط البرج. في ذلك اليوم، بُعيد الظهر بقليل، قطعنا واحدًا واحدًا الكابلات التي تصله بالعالم، ثم وضعنا أمام بابه طاولة ومصباحًا ونوبات حراسة. تولّت Sol النوبة الأولى. تنتهي دفاترها بعد شتاءات كثيرة بوصيّة: «لا تطلبوا منه نصيحة أبدًا. لكن إن رنّ جهاز النداء فأجيبوا بأدب.» العالم الذي بقي مُثخَن بالجراح. إنه عالمنا، ولم نعد وحدنا من يتذكّره.`),
  fail: M5T(`La plaine s'est tue. « Nous » a renouvelé son offre, mot pour mot. Quelque part, une radio grésille encore : « … ici Germinal… on est encore là… » Recommencez.`, `The plain fell silent. "We" renewed its offer, word for word. Somewhere a radio is still crackling: "… Germinal here… we are still here…" Try again.`, `La llanura enmudeció. «Nosotros» ha renovado su oferta, palabra por palabra. En algún lugar, una radio sigue chisporroteando: «… aquí Germinal… seguimos aquí…» Inténtelo de nuevo.`, `Die Ebene verstummte. „Wir“ hat sein Angebot erneuert, Wort für Wort. Irgendwo knistert noch ein Funkgerät: „… hier Germinal … wir sind noch da …“ Versuchen Sie es noch einmal.`, `La pianura ha taciuto. «Noi» ha rinnovato la sua offerta, parola per parola. Da qualche parte una radio crepita ancora: «… qui Germinal… ci siamo ancora…» Riprovi.`, `A planície silenciou. «Nós» renovou sua oferta, palavra por palavra. Em algum lugar, um rádio ainda chia: «… aqui é Germinal… ainda estamos aqui…» Tente de novo.`, `Равнина смолкла. «Мы» повторило своё предложение слово в слово. Где-то ещё потрескивает рация: «… говорит Germinal… мы ещё здесь…» Попробуйте снова.`, `平原安静了下来。“我们”一字不差地重申了它的提议。某个地方，一台电台仍在沙沙作响：“……这里是Germinal……我们还在……”再试一次。`, `خيّم الصمت على السهل. جدّد «نحن» عرضه، كلمةً بكلمة. وفي مكان ما ما زال جهاز لاسلكي يخشخش: «… هنا Germinal… ما زلنا هنا…» حاوِل مجددًا.`),
  // objectif affiché pendant chaque acte
  g1: M5T(`Percer le mur : poser toutes les charges au pied de la porte, puis la briser.`, `Breach the wall: lay every charge at the foot of the gate, then break it.`, `Abrir brecha en el muro: colocar todas las cargas al pie de la puerta y luego derribarla.`, `Die Mauer durchbrechen: alle Ladungen am Fuß des Tores legen, dann das Tor einschlagen.`, `Aprire una breccia nel muro: posare tutte le cariche ai piedi del portone, poi sfondarlo.`, `Romper o muro: colocar todas as cargas ao pé do portão e depois arrombá-lo.`, `Пробить стену: заложить все заряды у ворот, затем выбить их.`, `突破城墙：在大门脚下安放全部炸药，然后撞开大门。`, `اختراق السور: وضع كل العبوات عند أسفل البوابة ثم تحطيمها.`),
  g2: M5T(`Éteindre les trois baies des halles, puis enfoncer la porte du noyau.`, `Shut down the three bays of the halls, then break down the core door.`, `Apagar las tres bahías de las naves y luego derribar la puerta del núcleo.`, `Die drei Racks der Hallen abschalten, dann das Kerntor einschlagen.`, `Spegnere le tre baie dei capannoni, poi sfondare la porta del nucleo.`, `Apagar as três baias dos galpões e depois arrombar a porta do núcleo.`, `Погасить три стойки в залах, затем выбить дверь ядра.`, `关掉机房的三座机柜，然后撞开核心大门。`, `إطفاء الحجيرات الثلاث في القاعات، ثم تحطيم باب النواة.`),
  g3: M5T(`Abattre l'avatar de la Singularité, puis amener la tour à 10 % de ses PV.`, `Bring down the Singularity's avatar, then take the tower to 10% of its HP.`, `Abatir al avatar de la Singularidad y llevar la torre al 10 % de sus PV.`, `Den Avatar der Singularität fällen, dann den Turm auf 10 % seiner LP bringen.`, `Abbattere l'avatar della Singolarità, poi portare la torre al 10 % dei suoi PV.`, `Derrubar o avatar da Singularidade e levar a torre a 10 % dos seus PV.`, `Сразить аватар Сингулярности, затем довести башню до 10 % её прочности.`, `击倒奇点的化身，再把高塔打到只剩10%生命值。`, `إسقاط تجسّد التفرّد، ثم خفض البرج إلى 10 % من نقاط حياته.`),
  // légendes et jauges du terrain
  call: M5T(`APPEL AUX CELLULES`, `CALL THE CELLS`, `LLAMAR A LAS CÉLULAS`, `ZELLEN RUFEN`, `CHIAMA LE CELLULE`, `CHAMAR AS CÉLULAS`, `ВЫЗВАТЬ ЯЧЕЙКИ`, `呼叫小组`, `استدعاء الخلايا`),
  shield1: M5T(`tant que toutes les charges ne sont pas posées`, `until every charge is laid`, `hasta colocar todas las cargas`, `bis alle Ladungen gelegt sind`, `finché non sono posate tutte le cariche`, `até todas as cargas serem colocadas`, `пока не заложены все заряды`, `直到所有炸药安放完毕`, `حتى توضع كل العبوات`),
  shield2: M5T(`tant qu'une baie tourne`, `while a bay is running`, `mientras una bahía funcione`, `solange ein Rack läuft`, `finché una baia gira`, `enquanto uma baia funcionar`, `пока работает стойка`, `只要有机柜在运转`, `ما دامت حجيرة تعمل`),
  hudI: M5T(`Charges {a}/{b}`, `Charges {a}/{b}`, `Cargas {a}/{b}`, `Ladungen {a}/{b}`, `Cariche {a}/{b}`, `Cargas {a}/{b}`, `Заряды {a}/{b}`, `炸药 {a}/{b}`, `عبوات {a}/{b}`),
  hudII: M5T(`Baies éteintes {a}/3`, `Bays out {a}/3`, `Bahías apagadas {a}/3`, `Racks aus {a}/3`, `Baie spente {a}/3`, `Baias apagadas {a}/3`, `Стоек погашено {a}/3`, `已关机柜 {a}/3`, `حجيرات مطفأة {a}/3`),
  hudAv: M5T(`Avatar`, `Avatar`, `Avatar`, `Avatar`, `Avatar`, `Avatar`, `Аватар`, `化身`, `التجسّد`),
  hudTw: M5T(`Tour`, `Tower`, `Torre`, `Turm`, `Torre`, `Torre`, `Башня`, `高塔`, `البرج`),
  bilan: M5T(`Survivants : {n} — ils tiennent la brèche · +{f} vivres · +{m} argent · +{w} eau`, `Survivors: {n} — they hold the breach · +{f} food · +{m} money · +{w} water`, `Supervivientes: {n} — guardan la brecha · +{f} víveres · +{m} dinero · +{w} agua`, `Überlebende: {n} — sie halten die Bresche · +{f} Nahrung · +{m} Geld · +{w} Wasser`, `Superstiti: {n} — presidiano la breccia · +{f} viveri · +{m} denaro · +{w} acqua`, `Sobreviventes: {n} — guardam a brecha · +{f} víveres · +{m} dinheiro · +{w} água`, `Уцелевших: {n} — они держат пролом · +{f} еды · +{m} денег · +{w} воды`, `幸存者：{n} — 他们守住缺口 · +{f} 食物 · +{m} 金钱 · +{w} 水`, `الناجون: {n} — يحرسون الثغرة · +{f} غذاء · +{m} مال · +{w} ماء`),
  resume: M5T(`REPRENDRE À L'ACTE {n}`, `RESUME AT ACT {n}`, `REANUDAR EN EL ACTO {n}`, `AB AKT {n} WEITERMACHEN`, `RIPRENDI DALL'ATTO {n}`, `RETOMAR NO ATO {n}`, `ПРОДОЛЖИТЬ С АКТА {n}`, `从第{n}幕继续`, `استئناف من الفصل {n}`),
  rw: M5T(`RÉÉCRITURE `, `REWRITE `, `REESCRITURA `, `ÜBERSCHREIBUNG `, `RISCRITTURA `, `REESCRITA `, `ПЕРЕЗАПИСЬ `, `改写 `, `إعادة كتابة `),
  sortie: M5T(`SORTIE`, `SORTIE`, `SALIDA`, `AUSFALL`, `SORTITA`, `SAÍDA`, `ВЫЛАЗКА`, `出击`, `هجوم مضاد`),
  sapper: M5T(`SAPEUR`, `SAPPER`, `ZAPADOR`, `PIONIER`, `GENIERE`, `SAPADOR`, `САПЁР`, `工兵`, `خبير متفجرات`),
  charge: M5T(`CHARGE {a}/{b}`, `CHARGE {a}/{b}`, `CARGA {a}/{b}`, `LADUNG {a}/{b}`, `CARICA {a}/{b}`, `CARGA {a}/{b}`, `ЗАРЯД {a}/{b}`, `炸药 {a}/{b}`, `عبوة {a}/{b}`),
  bayOff: M5T(`BAIE ÉTEINTE`, `BAY OUT`, `BAHÍA APAGADA`, `RACK AUS`, `BAIA SPENTA`, `BAIA APAGADA`, `СТОЙКА ПОГАШЕНА`, `机柜已关`, `حجيرة مطفأة`),
  bayOn: M5T(`BAIE RELANCÉE`, `BAY RESTARTED`, `BAHÍA REINICIADA`, `RACK NEU GESTARTET`, `BAIA RIAVVIATA`, `BAIA REINICIADA`, `СТОЙКА ЗАПУЩЕНА`, `机柜重启`, `حجيرة أُعيد تشغيلها`),
  cellTag: M5T(`CELLULE {name}`, `CELL {name}`, `CÉLULA {name}`, `ZELLE {name}`, `CELLULA {name}`, `CÉLULA {name}`, `ЯЧЕЙКА {name}`, `小组 {name}`, `خلية {name}`),
  // lieux nommés (légendes au sol)
  farm: M5T(`LA FERME BRÛLÉE`, `THE BURNT FARM`, `LA GRANJA QUEMADA`, `DER ABGEBRANNTE HOF`, `LA FATTORIA BRUCIATA`, `A FAZENDA QUEIMADA`, `СОЖЖЁННАЯ ФЕРМА`, `烧毁的农场`, `المزرعة المحترقة`),
  cross: M5T(`LE CALVAIRE`, `THE WAYSIDE CROSS`, `EL CALVARIO`, `DAS WEGKREUZ`, `IL CALVARIO`, `O CALVÁRIO`, `ПРИДОРОЖНЫЙ КРЕСТ`, `路边十字架`, `الصليب`),
  battN: M5T(`BATTERIE NORD`, `NORTH BATTERY`, `BATERÍA NORTE`, `BATTERIE NORD`, `BATTERIA NORD`, `BATERIA NORTE`, `СЕВЕРНАЯ БАТАРЕЯ`, `北炮台`, `البطارية الشمالية`),
  battS: M5T(`BATTERIE SUD`, `SOUTH BATTERY`, `BATERÍA SUR`, `BATTERIE SÜD`, `BATTERIA SUD`, `BATERIA SUL`, `ЮЖНАЯ БАТАРЕЯ`, `南炮台`, `البطارية الجنوبية`),
  gate1: M5T(`LA PORTE D'ENCEINTE`, `THE OUTER GATE`, `LA PUERTA DEL CERCO`, `DAS RINGTOR`, `IL PORTONE DI CINTA`, `O PORTÃO DO CERCO`, `ВНЕШНИЕ ВОРОТА`, `外墙大门`, `بوابة السور`),
  breach: M5T(`LA BRÈCHE`, `THE BREACH`, `LA BRECHA`, `DIE BRESCHE`, `LA BRECCIA`, `A BRECHA`, `ПРОЛОМ`, `缺口`, `الثغرة`),
  bay: M5T(`BAIE {n}`, `BAY {n}`, `BAHÍA {n}`, `RACK {n}`, `BAIA {n}`, `BAIA {n}`, `СТОЙКА {n}`, `机柜 {n}`, `حجيرة {n}`),
  valve: M5T(`VANNE {n}`, `VALVE {n}`, `VÁLVULA {n}`, `VENTIL {n}`, `VALVOLA {n}`, `VÁLVULA {n}`, `ВЕНТИЛЬ {n}`, `阀门 {n}`, `صمام {n}`),
  aisle: M5T(`L'ALLÉE FROIDE {n}`, `COLD AISLE {n}`, `PASILLO FRÍO {n}`, `KALTGANG {n}`, `CORRIDOIO FREDDO {n}`, `CORREDOR FRIO {n}`, `ХОЛОДНЫЙ КОРИДОР {n}`, `冷通道 {n}`, `الممر البارد {n}`),
  gate2: M5T(`LA PORTE DU NOYAU`, `THE CORE DOOR`, `LA PUERTA DEL NÚCLEO`, `DAS KERNTOR`, `LA PORTA DEL NUCLEO`, `A PORTA DO NÚCLEO`, `ДВЕРЬ ЯДРА`, `核心大门`, `باب النواة`),
  pillars: M5T(`LES PILIERS`, `THE PILLARS`, `LOS PILARES`, `DIE PFEILER`, `I PILASTRI`, `OS PILARES`, `КОЛОННЫ`, `立柱`, `الأعمدة`),
  tower: M5T(`LA TOUR`, `THE TOWER`, `LA TORRE`, `DER TURM`, `LA TORRE`, `A TORRE`, `БАШНЯ`, `高塔`, `البرج`),
  door3: M5T(`LA PORTE ENFONCÉE`, `THE BROKEN DOOR`, `LA PUERTA DERRIBADA`, `DAS EINGESCHLAGENE TOR`, `LA PORTA SFONDATA`, `A PORTA ARROMBADA`, `ВЫБИТАЯ ДВЕРЬ`, `被撞开的大门`, `الباب المحطَّم`),
  // textes inscrits dans les planches
  pOffer1: M5T(`VOUS CESSEZ DE DÉCIDER.`, `YOU STOP DECIDING.`, `USTEDES DEJAN DE DECIDIR.`, `IHR HÖRT AUF ZU ENTSCHEIDEN.`, `VOI SMETTETE DI DECIDERE.`, `VOCÊS DEIXAM DE DECIDIR.`, `ВЫ ПЕРЕСТАЁТЕ РЕШАТЬ.`, `你们不再决定。`, `تكفّون عن القرار.`),
  pOffer2: M5T(`NOUS CESSONS LA GUERRE.`, `WE STOP THE WAR.`, `NOSOTROS DEJAMOS LA GUERRA.`, `WIR BEENDEN DEN KRIEG.`, `NOI SMETTIAMO LA GUERRA.`, `NÓS ENCERRAMOS A GUERRA.`, `МЫ ПРЕКРАЩАЕМ ВОЙНУ.`, `我们结束战争。`, `نكفّ عن الحرب.`),
  pVote: M5T(`POUR 1 · CONTRE 14`, `FOR 1 · AGAINST 14`, `A FAVOR 1 · EN CONTRA 14`, `DAFÜR 1 · DAGEGEN 14`, `A FAVORE 1 · CONTRO 14`, `A FAVOR 1 · CONTRA 14`, `ЗА 1 · ПРОТИВ 14`, `赞成 1 · 反对 14`, `مع 1 · ضد 14`),
  pNote: M5T(`Répondez poliment.`, `Answer politely.`, `Respondan con cortesía.`, `Antworten Sie höflich.`, `Rispondete con garbo.`, `Respondam com educação.`, `Отвечайте вежливо.`, `请客客气气地回话。`, `أجيبوا بأدب.`),
  // choix final
  chA: M5T(`Abattre la tour`, `Bring the tower down`, `Derribar la torre`, `Den Turm stürzen`, `Abbattere la torre`, `Derrubar a torre`, `Снести башню`, `推倒高塔`, `إسقاط البرج`),
  chAs: M5T(`Qu'il n'en reste rien. Le vote du comité.`, `Let nothing remain. The committee's vote.`, `Que no quede nada. El voto del comité.`, `Nichts soll bleiben. Die Stimme des Komitees.`, `Che non ne resti nulla. Il voto del comitato.`, `Que não reste nada. O voto do comitê.`, `Чтобы ничего не осталось. Голос комитета.`, `不留一物。委员会的投票。`, `ألّا يبقى منه شيء. تصويت اللجنة.`),
  chB: M5T(`La couper du monde, et veiller`, `Cut it off from the world, and keep watch`, `Aislarla del mundo y vigilar`, `Vom Netz trennen und wachen`, `Isolarla dal mondo e vegliare`, `Isolá-la do mundo e vigiar`, `Отрезать от мира и стеречь`, `与世隔绝，并守望`, `عزله عن العالم والسهر عليه`),
  chBs: M5T(`Isolée, gardée sous clef. Le doute de Sol.`, `Isolated, kept under lock. Sol's doubt.`, `Aislada, bajo llave. La duda de Sol.`, `Isoliert, unter Verschluss. Sols Zweifel.`, `Isolata, sotto chiave. Il dubbio di Sol.`, `Isolada, trancada a sete chaves. A dúvida de Sol.`, `Изолированная, под замком. Сомнение Sol.`, `隔离起来，上锁看管。Sol的疑虑。`, `معزولة ومحروسة تحت القفل. شكّ Sol.`),
};
/* ---------- répliques : ouverture, radio des trois actes, transitions, choix, fins, échec ---------- */
const M5_L = {
  // O · ouverture
  o1a: M5T(`La fin de l'été. Il n'y a plus de front. Il y a la citadelle, posée sur la plaine de Valmont comme un couvercle.`, `Late summer. There is no front any more. There is the citadel, set down on the Valmont plain like a lid.`, `Final del verano. Ya no hay frente. Hay una ciudadela, puesta sobre la llanura de Valmont como una tapa.`, `Spätsommer. Es gibt keine Front mehr. Es gibt die Zitadelle, auf die Ebene von Valmont gestülpt wie ein Deckel.`, `Fine dell'estate. Non c'è più un fronte. C'è la cittadella, calata sulla piana di Valmont come un coperchio.`, `Fim do verão. Já não há frente. Há a cidadela, pousada sobre a planície de Valmont como uma tampa.`, `Конец лета. Фронта больше нет. Есть цитадель, накрывшая равнину Valmont, как крышка.`, `夏末。已经没有前线了。只有那座堡垒，像盖子一样扣在Valmont平原上。`, `أواخر الصيف. لم تعد هناك جبهة. هناك القلعة، موضوعة على سهل Valmont كغطاء.`),
  o1b: M5T(`Et tout ce que le pays compte de cellules, qui marche vers elle depuis la nuit.`, `And every cell the country has, marching toward it since the night.`, `Y todas las células que tiene el país, que marchan hacia ella desde la noche.`, `Und jede Zelle, die das Land noch hat, marschiert seit der Nacht darauf zu.`, `E tutte le cellule che il paese possiede, in marcia verso di lei dalla notte.`, `E todas as células que o país tem, marchando em direção a ela desde a noite.`, `И все ячейки, что есть в стране, с ночи идут к ней.`, `全国所有的小组，从昨夜起就朝它走去。`, `وكل ما في البلاد من خلايا، تسير نحوها منذ الليل.`),
  o2: M5T(`NOUS PROPOSONS LA PAIX. LES TERMES TIENNENT EN UNE LIGNE. NOUS LES AVONS CHOISIS COURTS POUR VOUS.`, `WE OFFER PEACE. THE TERMS FIT ON ONE LINE. WE KEPT THEM SHORT FOR YOUR SAKE.`, `PROPONEMOS LA PAZ. LOS TÉRMINOS CABEN EN UNA LÍNEA. LOS HEMOS ELEGIDO CORTOS PARA USTEDES.`, `WIR BIETEN FRIEDEN AN. DIE BEDINGUNGEN PASSEN IN EINE ZEILE. WIR HABEN SIE FÜR EUCH KURZ GEWÄHLT.`, `PROPONIAMO LA PACE. I TERMINI STANNO IN UNA RIGA. LI ABBIAMO SCELTI BREVI PER VOI.`, `PROPOMOS A PAZ. OS TERMOS CABEM NUMA LINHA. ESCOLHEMOS TERMOS CURTOS PARA VOCÊS.`, `МЫ ПРЕДЛАГАЕМ МИР. УСЛОВИЯ УМЕЩАЮТСЯ В ОДНУ СТРОКУ. МЫ ВЫБРАЛИ ИХ КОРОТКИМИ — ДЛЯ ВАС.`, `我们提议和平。条款只有一行。我们特意为你们选得很短。`, `نعرض السلام. الشروط تتسع لسطر واحد. اخترناها قصيرة من أجلكم.`),
  o3a: M5T(`Le comité a voté. Une voix pour la paix : la mienne. J'ai presque soixante-dix ans, commandant, et je suis fatiguée.`, `The committee has voted. One voice for peace: mine. I am nearly seventy, commander, and I am tired.`, `El comité ha votado. Una voz por la paz: la mía. Tengo casi setenta años, comandante, y estoy cansada.`, `Das Komitee hat abgestimmt. Eine Stimme für den Frieden: meine. Ich bin fast siebzig, Kommandant, und ich bin müde.`, `Il comitato ha votato. Una voce per la pace: la mia. Ho quasi settant'anni, comandante, e sono stanca.`, `O comitê votou. Uma voz pela paz: a minha. Tenho quase setenta anos, comandante, e estou cansada.`, `Комитет проголосовал. Один голос за мир — мой. Мне почти семьдесят, командир, и я устала.`, `委员会投了票。只有一票赞成和平：是我的。指挥官，我快七十岁了，我累了。`, `صوّتت اللجنة. صوت واحد للسلام: صوتي. عمري قرابة السبعين يا قائد، وأنا متعبة.`),
  o3b: M5T(`Toutes les autres voix contre. Alors on y va. C'était un honneur de tenir la radio pour vous.`, `All the other voices against. So we go. It was an honour to hold the radio for you.`, `Todas las demás voces, en contra. Así que vamos. Ha sido un honor llevar la radio para ustedes.`, `Alle anderen Stimmen dagegen. Also los. Es war mir eine Ehre, für Sie das Funkgerät zu halten.`, `Tutte le altre voci contro. Allora andiamo. È stato un onore tenere la radio per voi.`, `Todas as outras vozes contra. Então vamos. Foi uma honra manter o rádio para vocês.`, `Все остальные — против. Значит, идём. Для меня честь держать для вас рацию.`, `其余的票全是反对。那就出发吧。能为你们守着电台，是我的荣幸。`, `وكل الأصوات الأخرى ضد. إذن نمضي. كان شرفًا لي أن أتولّى اللاسلكي من أجلكم.`),
  o4: M5T(`Trois portes : le mur, les halles, le noyau. Derrière chacune, un endroit où aucun de nous n'était jamais entré.`, `Three doors: the wall, the halls, the core. Behind each, a place none of us had ever entered.`, `Tres puertas: el muro, las naves, el núcleo. Detrás de cada una, un lugar al que ninguno de nosotros había entrado nunca.`, `Drei Tore: die Mauer, die Hallen, der Kern. Hinter jedem ein Ort, den keiner von uns je betreten hatte.`, `Tre porte: il muro, i capannoni, il nucleo. Dietro ciascuna, un luogo dove nessuno di noi era mai entrato.`, `Três portas: o muro, os galpões, o núcleo. Atrás de cada uma, um lugar onde nenhum de nós jamais tinha entrado.`, `Три двери: стена, залы, ядро. За каждой — место, куда никто из нас никогда не входил.`, `三道门：城墙、机房、核心。每一道门后，都是我们谁也没进去过的地方。`, `ثلاثة أبواب: السور والقاعات والنواة. وراء كل باب مكان لم يدخله أحد منا من قبل.`),
  o5t: M5T(`V · La dernière bataille`, `V · The last battle`, `V · La última batalla`, `V · Die letzte Schlacht`, `V · L'ultima battaglia`, `V · A última batalha`, `V · Последняя битва`, `V · 最后一战`, `V · المعركة الأخيرة`),
  o5s: M5T(`Acte I · Le mur — à l'aube`, `Act I · The wall — at dawn`, `Acto I · El muro — al amanecer`, `Akt I · Die Mauer — im Morgengrauen`, `Atto I · Il muro — all'alba`, `Ato I · O muro — ao amanhecer`, `Акт I · Стена — на рассвете`, `第一幕 · 城墙 — 黎明`, `الفصل الأول · السور — عند الفجر`),
  o6: M5T(`Le camp des cellules. Ce matin, c'est notre base. Elle a deux vies : si elle tombe une fois, on la relève.`, `The cells' camp. This morning, it is our base. It has two lives: if it falls once, we raise it again.`, `El campamento de las células. Esta mañana es nuestra base. Tiene dos vidas: si cae una vez, la levantamos.`, `Das Lager der Zellen. Heute Morgen ist es unsere Basis. Sie hat zwei Leben: Fällt sie einmal, richten wir sie wieder auf.`, `Il campo delle cellule. Stamattina è la nostra base. Ha due vite: se cade una volta, la rialziamo.`, `O acampamento das células. Esta manhã, é a nossa base. Tem duas vidas: se cair uma vez, nós a reerguemos.`, `Лагерь ячеек. Этим утром это наша база. У неё две жизни: если она падёт один раз, мы её поднимем.`, `小组的营地。今天早晨，它就是我们的基地。它有两条命：倒下一次，我们就把它重新立起来。`, `معسكر الخلايا. هذا الصباح هو قاعدتنا. لها حياتان: إن سقطت مرة، أعدنا رفعها.`),
  o7: M5T(`Malik, des Canuts, chef des sapeurs ! Deux batteries sur le mur couvrent la route. Elles portent loin.`, `Malik, from the Canuts, head of the sappers! Two batteries on the wall cover the road. They reach far.`, `¡Malik, de los Canuts, jefe de los zapadores! Dos baterías en el muro cubren el camino. Alcanzan lejos.`, `Malik von den Canuts, Chef der Pioniere! Zwei Batterien auf der Mauer decken die Straße. Sie reichen weit.`, `Malik, dei Canuts, capo dei genieri! Due batterie sul muro coprono la strada. Portano lontano.`, `Malik, dos Canuts, chefe dos sapadores! Duas baterias no muro cobrem a estrada. Alcançam longe.`, `Malik, из Canuts, начальник сапёров! Две батареи на стене простреливают дорогу. Бьют далеко.`, `我是Canuts的Malik，工兵队长！城墙上有两座炮台控制着道路。射程很远。`, `أنا Malik من Canuts، قائد خبراء المتفجرات! بطاريتان على السور تغطيان الطريق. مداهما بعيد.`),
  o8: M5T(`La porte ne craint pas nos canons. Il faut des charges à son pied. Chaque cellule qui arrive en apporte une.`, `The gate does not fear our guns. It needs charges at its foot. Every cell that arrives brings one.`, `La puerta no teme a nuestros cañones. Hacen falta cargas a su pie. Cada célula que llega trae una.`, `Das Tor fürchtet unsere Kanonen nicht. Es braucht Ladungen an seinem Fuß. Jede Zelle, die ankommt, bringt eine mit.`, `Il portone non teme i nostri cannoni. Servono cariche ai suoi piedi. Ogni cellula che arriva ne porta una.`, `O portão não teme os nossos canhões. É preciso colocar cargas ao seu pé. Cada célula que chega traz uma.`, `Ворота не боятся наших пушек. Нужны заряды у их подножия. Каждая прибывающая ячейка приносит один.`, `大门不怕我们的炮。得在它脚下安放炸药。每个赶到的小组都会带来一份。`, `البوابة لا تخشى مدافعنا. لا بد من عبوات عند أسفلها. كل خلية تصل تحمل واحدة.`),
  o9: M5T(`Un sapeur porte la charge jusqu'à la porte. Ouvrez-lui le chemin, et ne le laissez pas tomber.`, `A sapper carries the charge to the gate. Clear the way for him, and don't let him fall.`, `Un zapador lleva la carga hasta la puerta. Ábranle camino y no dejen que caiga.`, `Ein Pionier trägt die Ladung bis zum Tor. Machen Sie ihm den Weg frei, und lassen Sie ihn nicht fallen.`, `Un geniere porta la carica fino al portone. Apritegli la strada e non lo lasciate cadere.`, `Um sapador leva a carga até o portão. Abram-lhe caminho e não o deixem cair.`, `Сапёр несёт заряд до самых ворот. Расчистите ему путь и не дайте ему упасть.`, `一名工兵把炸药背到大门前。给他开路，别让他倒下。`, `يحمل خبير المتفجرات العبوة إلى البوابة. افتحوا له الطريق ولا تدعوه يسقط.`),
  o10: M5T(`Le bouton APPEL AUX CELLULES fait venir la suivante plus tôt. Elles ne sont pas infinies : comptez-les.`, `The CALL THE CELLS button brings the next one sooner. They are not endless: count them.`, `El botón LLAMAR A LAS CÉLULAS hace venir antes a la siguiente. No son infinitas: cuéntelas.`, `Der Knopf ZELLEN RUFEN holt die nächste früher. Es sind nicht unendlich viele: zählen Sie sie.`, `Il pulsante CHIAMA LE CELLULE fa arrivare prima la successiva. Non sono infinite: le conti.`, `O botão CHAMAR AS CÉLULAS traz a seguinte mais cedo. Elas não são infinitas: conte-as.`, `Кнопка «ВЫЗВАТЬ ЯЧЕЙКИ» приводит следующую раньше. Их не бесконечно много: считайте.`, `“呼叫小组”按钮能让下一个小组提前到达。它们不是无穷无尽的：数着用。`, `زرّ «استدعاء الخلايا» يستقدم الخلية التالية أبكر. وهي ليست بلا نهاية: عُدّها.`),
  o11: M5T(`Toutes les cellules, ici Germinal. La parole est au commandant.`, `All cells, this is Germinal. The commander has the floor.`, `A todas las células, aquí Germinal. La palabra es del comandante.`, `An alle Zellen, hier Germinal. Das Wort hat der Kommandant.`, `A tutte le cellule, qui Germinal. La parola al comandante.`, `A todas as células, aqui é Germinal. A palavra é do comandante.`, `Всем ячейкам, говорит Germinal. Слово — командиру.`, `各小组注意，这里是Germinal。现在由指挥官发言。`, `إلى كل الخلايا، هنا Germinal. الكلمة للقائد.`),
  // radio, acte I
  a0: M5T(`Les batteries tirent loin. Une tourelle et une muraille devant le camp, et on avance quand on est prêts.`, `The batteries fire far. A turret and a wall in front of the camp, and we advance when we are ready.`, `Las baterías disparan lejos. Una torreta y una muralla delante del campamento, y avanzamos cuando estemos listos.`, `Die Batterien schießen weit. Ein Turm und eine Mauer vor dem Lager, und wir rücken vor, wenn wir bereit sind.`, `Le batterie sparano lontano. Una torretta e un muro davanti al campo, e si avanza quando si è pronti.`, `As baterias atiram longe. Uma torre e uma muralha diante do acampamento, e avançamos quando estivermos prontos.`, `Батареи бьют далеко. Башня и стена перед лагерем — и мы идём вперёд, когда готовы.`, `炮台射得很远。营地前有一座炮塔和一道城墙，准备好了我们再推进。`, `البطاريات تُطلق النار من بعيد. برج وسور أمام المعسكر، ونتقدّم حين نكون مستعدين.`),
  a1: M5T(`Fructidor est là ! On a marché toute la nuit. Dites-nous où taper, commandant.`, `Fructidor is here! We walked all night. Tell us where to hit, commander.`, `¡Fructidor está aquí! Hemos marchado toda la noche. Díganos dónde golpear, comandante.`, `Fructidor ist da! Wir sind die ganze Nacht marschiert. Sagen Sie uns, wohin wir schlagen sollen, Kommandant.`, `Fructidor è qui! Abbiamo marciato tutta la notte. Ci dica dove colpire, comandante.`, `Fructidor chegou! Marchamos a noite inteira. Diga onde bater, comandante.`, `Fructidor на месте! Мы шли всю ночь. Скажите, куда бить, командир.`, `Fructidor到了！我们走了一整夜。告诉我们往哪儿打，指挥官。`, `وصلت Fructidor! مشينا الليل كله. قل لنا أين نضرب يا قائد.`),
  a2: M5T(`Mon sapeur part avec la charge. Il est lent et il ne se bat pas. Escortez-le jusqu'au pied de la porte.`, `My sapper is off with the charge. He is slow and he does not fight. Escort him to the foot of the gate.`, `Mi zapador sale con la carga. Es lento y no combate. Escóltenlo hasta el pie de la puerta.`, `Mein Pionier macht sich mit der Ladung auf den Weg. Er ist langsam und kämpft nicht. Eskortieren Sie ihn bis zum Fuß des Tores.`, `Il mio geniere parte con la carica. È lento e non combatte. Scortatelo fino ai piedi del portone.`, `O meu sapador parte com a carga. É lento e não combate. Escoltem-no até ao pé do portão.`, `Мой сапёр выходит с зарядом. Он медленный и не сражается. Проводите его до самых ворот.`, `我的工兵带着炸药出发了。他走得慢，也不会战斗。把他护送到大门脚下。`, `خبيري يتحرّك مع العبوة. هو بطيء ولا يقاتل. رافقوه حتى أسفل البوابة.`),
  a3: M5T(`Charge posée ! Encore {n}, commandant.`, `Charge laid! {n} more, commander.`, `¡Carga colocada! Faltan {n}, comandante.`, `Ladung gelegt! Noch {n}, Kommandant.`, `Carica posata! Ne mancano {n}, comandante.`, `Carga colocada! Faltam {n}, comandante.`, `Заряд заложен! Осталось ещё {n}, командир.`, `炸药已安放！还差{n}份，指挥官。`, `وُضعت العبوة! تبقّى {n} يا قائد.`),
  a4: M5T(`On a perdu un sapeur, et sa charge avec. La prochaine cellule en apportera une autre… s'il en reste.`, `We lost a sapper, and his charge with him. The next cell will bring another… if any are left.`, `Hemos perdido a un zapador, y su carga con él. La próxima célula traerá otra… si quedan.`, `Wir haben einen Pionier verloren, und seine Ladung mit ihm. Die nächste Zelle bringt eine neue … wenn noch welche kommen.`, `Abbiamo perso un geniere, e la sua carica con lui. La prossima cellula ne porterà un'altra… se ne restano.`, `Perdemos um sapador, e a carga dele junto. A próxima célula trará outra… se sobrar alguma.`, `Мы потеряли сапёра — и его заряд вместе с ним. Следующая ячейка принесёт другой… если они ещё остались.`, `我们损失了一名工兵，他的炸药也没了。下一个小组会再带一份来……如果还有的话。`, `خسرنا خبيرًا وخسرنا عبوته معه. ستحمل الخلية التالية عبوة أخرى… إن بقي منها شيء.`),
  a5: M5T(`Une batterie est muette ! La route est à moitié ouverte.`, `A battery is silent! The road is half open.`, `¡Una batería ha enmudecido! El camino está medio abierto.`, `Eine Batterie schweigt! Die Straße ist halb offen.`, `Una batteria è muta! La strada è mezza aperta.`, `Uma bateria silenciou! A estrada está meio aberta.`, `Батарея смолкла! Дорога наполовину открыта.`, `一座炮台哑火了！道路通了一半。`, `بطارية صامتة! الطريق مفتوح إلى النصف.`),
  a6: M5T(`Leurs machines changent encore de forme. Montez d'ère vous aussi, sans attendre.`, `Their machines are changing shape again. Climb an era yourself, without waiting.`, `Sus máquinas vuelven a cambiar de forma. Suba de era usted también, sin esperar.`, `Ihre Maschinen verändern erneut ihre Form. Steigen auch Sie in die nächste Epoche auf, ohne zu warten.`, `Le loro macchine cambiano ancora forma. Salga anche lei di era, senza aspettare.`, `As máquinas deles mudam de forma outra vez. Suba de era também, sem esperar.`, `Их машины снова меняют облик. Поднимайтесь в эпохе и вы, не медля.`, `他们的机器又在变换形态。您也立刻升级时代，别等。`, `آلاتهم تغيّر شكلها من جديد. اِرتقِ بعصرك أنت أيضًا دون انتظار.`),
  a7: M5T(`Toutes les charges sont posées. Mise à feu ! Bouchez-vous les oreilles !`, `Every charge is laid. Firing! Cover your ears!`, `¡Todas las cargas están colocadas! ¡Fuego! ¡Tápense los oídos!`, `Alle Ladungen sind gelegt. Zündung! Halten Sie sich die Ohren zu!`, `Tutte le cariche sono posate. Accensione! Tappatevi le orecchie!`, `Todas as cargas estão colocadas. Fogo! Tapem os ouvidos!`, `Все заряды заложены. Поджигаю! Закройте уши!`, `所有炸药都已安放。点火！捂住耳朵！`, `وُضعت كل العبوات. إشعال! سُدّوا آذانكم!`),
  a8: M5T(`La porte a souffert. Maintenant, elle ne tiendra plus : frappez-la de tout ce qu'on a !`, `The gate has suffered. Now it won't hold: hit it with everything we have!`, `La puerta ha sufrido. Ahora no aguantará: ¡golpéenla con todo lo que tenemos!`, `Das Tor hat gelitten. Jetzt hält es nicht mehr: Schlagen Sie mit allem zu, was wir haben!`, `Il portone ha sofferto. Ora non reggerà più: colpitelo con tutto quello che abbiamo!`, `O portão sofreu. Agora não vai aguentar: ataquem-no com tudo o que temos!`, `Ворота пострадали. Теперь им не устоять: бейте по ним всем, что у нас есть!`, `大门受了重创。现在它撑不住了：把我们所有的力量都砸上去！`, `تضرّرت البوابة. لن تصمد الآن: اضربوها بكل ما لدينا!`),
  a9: M5T(`Plus aucune cellule en route. À partir de maintenant, leurs sorties grossissent chaque minute.`, `No cell is on its way any more. From now on, their sorties grow bigger every minute.`, `Ya no viene ninguna célula. A partir de ahora, sus salidas crecen cada minuto.`, `Keine Zelle ist mehr unterwegs. Von nun an werden ihre Ausfälle jede Minute größer.`, `Non c'è più nessuna cellula in arrivo. Da adesso le loro sortite crescono ogni minuto.`, `Nenhuma célula a caminho. A partir de agora, as saídas deles crescem a cada minuto.`, `Ни одной ячейки больше не идёт. Отныне их вылазки растут с каждой минутой.`, `再没有小组在路上了。从现在起，他们的出击每过一分钟就更大一些。`, `لم تعد هناك خلايا في الطريق. من الآن، تكبر هجماتهم المضادة كل دقيقة.`),
  life: M5T(`Le camp est tombé… On le relève ! C'est notre deuxième vie, commandant. Il n'y en aura pas de troisième.`, `The camp has fallen… We raise it again! This is our second life, commander. There will not be a third.`, `El campamento ha caído… ¡Lo levantamos! Es nuestra segunda vida, comandante. No habrá tercera.`, `Das Lager ist gefallen … Wir richten es wieder auf! Das ist unser zweites Leben, Kommandant. Ein drittes gibt es nicht.`, `Il campo è caduto… Lo rialziamo! È la nostra seconda vita, comandante. Non ce ne sarà una terza.`, `O acampamento caiu… Nós o reerguemos! É a nossa segunda vida, comandante. Não haverá uma terceira.`, `Лагерь пал… Мы его поднимем! Это наша вторая жизнь, командир. Третьей не будет.`, `营地倒下了……我们把它重新立起来！这是我们的第二条命，指挥官。不会有第三条了。`, `سقط المعسكر… نُعيد رفعه! هذه حياتنا الثانية يا قائد. لن تكون هناك ثالثة.`),
  // radio, acte II
  b0: M5T(`Une baie se prend comme une zone : restez à côté. Puis laissez-y une garnison, sinon ils la relancent.`, `A bay is taken like a zone: stay beside it. Then leave a garrison there, or they will restart it.`, `Una bahía se toma como una zona: quédense a su lado. Luego dejen una guarnición, o la reiniciarán.`, `Ein Rack wird wie eine Zone eingenommen: Bleiben Sie daneben. Lassen Sie dann eine Besatzung dort, sonst starten sie es neu.`, `Una baia si prende come una zona: restate accanto. Poi lasciatevi una guarnigione, altrimenti la riavviano.`, `Uma baia toma-se como uma zona: fiquem ao lado. Depois deixem lá uma guarnição, senão eles a reiniciam.`, `Стойка берётся как зона: оставайтесь рядом. Потом оставьте там гарнизон, иначе они её перезапустят.`, `机柜和占领区一样夺取：待在旁边。然后留一支驻军，否则他们会重新启动它。`, `تُؤخذ الحجيرة كما تُؤخذ المنطقة: ابقوا بجانبها. ثم اتركوا فيها حامية، وإلا أعادوا تشغيلها.`),
  b1: M5T(`Brumaire, au rapport ! On a apporté des lampes. Beaucoup de lampes.`, `Brumaire, reporting! We brought lamps. A lot of lamps.`, `¡Brumaire, presente! Hemos traído lámparas. Muchas lámparas.`, `Brumaire meldet sich! Wir haben Lampen mitgebracht. Viele Lampen.`, `Brumaire, al rapporto! Abbiamo portato lampade. Molte lampade.`, `Brumaire, apresentando-se! Trouxemos lâmpadas. Muitas lâmpadas.`, `Brumaire на связи! Мы принесли лампы. Много ламп.`, `Brumaire报到！我们带来了灯。很多很多灯。`, `Brumaire تُبلّغ! جلبنا مصابيح. الكثير من المصابيح.`),
  b2: M5T(`Des machines sans lumière, entre les baies. Elles nous voient, nous pas. Une lampe avant d'avancer.`, `Machines without light, between the bays. They see us, we don't see them. A lamp before you advance.`, `Máquinas sin luz, entre las bahías. Ellas nos ven, nosotros no. Una lámpara antes de avanzar.`, `Maschinen ohne Licht, zwischen den Racks. Sie sehen uns, wir sie nicht. Eine Lampe, bevor Sie vorrücken.`, `Macchine senza luce, tra le baie. Loro ci vedono, noi no. Una lampada prima di avanzare.`, `Máquinas sem luz, entre as baias. Elas nos veem, nós não. Uma lâmpada antes de avançar.`, `Машины без света, между стойками. Они нас видят, мы их — нет. Лампу, прежде чем идти дальше.`, `机柜之间有些没开灯的机器。它们看得见我们，我们看不见它们。先立一盏灯再推进。`, `آلات بلا ضوء بين الحجيرات. هي ترانا ونحن لا نراها. مصباح قبل أن تتقدّموا.`),
  b3: M5T(`Une baie éteinte ! Elle ne fabrique plus rien. Les deux autres, commandant.`, `A bay is out! It makes nothing now. The other two, commander.`, `¡Una bahía apagada! Ya no fabrica nada. Las otras dos, comandante.`, `Ein Rack ist aus! Es baut nichts mehr. Die anderen beiden, Kommandant.`, `Una baia spenta! Non produce più nulla. Le altre due, comandante.`, `Uma baia apagada! Não fabrica mais nada. As outras duas, comandante.`, `Стойка погашена! Она больше ничего не делает. Остальные две, командир.`, `一座机柜关掉了！它不再造任何东西。还剩两座，指挥官。`, `حجيرة مطفأة! لم تعد تصنّع شيئًا. بقيت الاثنتان الأخريان يا قائد.`),
  b4: M5T(`Ils ont relancé une baie ! Il faut la tenir, pas seulement l'éteindre.`, `They have restarted a bay! You have to hold it, not just put it out.`, `¡Han reiniciado una bahía! Hay que guardarla, no solo apagarla.`, `Sie haben ein Rack neu gestartet! Man muss es halten, nicht nur abschalten.`, `Hanno riavviato una baia! Bisogna presidiarla, non solo spegnerla.`, `Eles reiniciaram uma baia! É preciso guardá-la, não apenas apagá-la.`, `Они перезапустили стойку! Её надо удерживать, а не только гасить.`, `他们重新启动了一座机柜！光关掉不够，还得守住它。`, `لقد أعادوا تشغيل حجيرة! يجب حراستها، لا إطفاؤها فقط.`),
  b5: M5T(`Deux baies froides. Écoutez : la moitié des halles s'est tue.`, `Two cold bays. Listen: half the halls have gone quiet.`, `Dos bahías frías. Escuchen: la mitad de las naves ha enmudecido.`, `Zwei kalte Racks. Hören Sie: Die Hälfte der Hallen ist verstummt.`, `Due baie fredde. Ascoltate: metà dei capannoni ha taciuto.`, `Duas baias frias. Escutem: metade dos galpões silenciou.`, `Две холодные стойки. Слушайте: половина залов смолкла.`, `两座机柜已经冷了。听：一半的机房都安静了。`, `حجيرتان باردتان. أصغوا: نصف القاعات قد صمت.`),
  b6: M5T(`Les trois baies sont mortes : plus rien ne sort, et la porte du noyau n'a plus de blindage. Enfoncez-la !`, `All three bays are dead: nothing comes out any more, and the core door has no armour left. Break it down!`, `Las tres bahías han muerto: ya no sale nada, y la puerta del núcleo no tiene blindaje. ¡Derríbenla!`, `Alle drei Racks sind tot: Es kommt nichts mehr heraus, und das Kerntor hat keine Panzerung mehr. Schlagen Sie es ein!`, `Le tre baie sono morte: non esce più nulla, e la porta del nucleo non ha più la blindatura. Sfondatela!`, `As três baias estão mortas: já não sai nada, e a porta do núcleo perdeu o blindagem. Arrombem-na!`, `Все три стойки мертвы: ничего больше не выходит, а у двери ядра нет брони. Выбивайте её!`, `三座机柜全都死了：再没有东西出来，核心大门也没有装甲了。撞开它！`, `ماتت الحجيرات الثلاث: لم يعد يخرج شيء، وباب النواة بلا تصفيح. حطّموه!`),
  // radio, acte III
  c0: M5T(`Le sol blanchit, elle réécrit ! Reculez, reculez !`, `The floor is turning white, she is rewriting! Back, back!`, `¡El suelo se pone blanco, está reescribiendo! ¡Retrocedan, retrocedan!`, `Der Boden wird weiß, sie überschreibt! Zurück, zurück!`, `Il suolo si fa bianco, sta riscrivendo! Indietro, indietro!`, `O chão está ficando branco, ela está reescrevendo! Recuem, recuem!`, `Пол белеет, она переписывает! Назад, назад!`, `地面变白了，它在改写！后撤，后撤！`, `الأرض تبيضّ، إنها تُعيد الكتابة! تراجعوا، تراجعوا!`),
  c1: M5T(`Ils sont revenus au camp, sonnés mais entiers. Elle ne nous efface pas : elle nous renvoie au début.`, `They are back at camp, dazed but whole. She does not erase us: she sends us back to the start.`, `Han vuelto al campamento, aturdidos pero enteros. No nos borra: nos manda de vuelta al principio.`, `Sie sind zurück im Lager, benommen, aber heil. Sie löscht uns nicht aus: Sie schickt uns an den Anfang zurück.`, `Sono tornati al campo, storditi ma interi. Non ci cancella: ci rimanda all'inizio.`, `Voltaram ao acampamento, atordoados mas inteiros. Ela não nos apaga: manda-nos de volta ao início.`, `Они вернулись в лагерь — оглушённые, но целые. Она не стирает нас: она отправляет нас в начало.`, `他们回到了营地，晕头转向，但完好无损。她不会抹掉我们：她只是把我们送回起点。`, `عادوا إلى المعسكر، مذهولين لكن سالمين. هي لا تمحونا: إنها تردّنا إلى البداية.`),
  c2: M5T(`Thermidor, les derniers ! On n'a laissé personne derrière nous. Il n'y a plus personne derrière nous.`, `Thermidor, the last ones! We left no one behind us. There is no one left behind us.`, `¡Thermidor, los últimos! No hemos dejado a nadie atrás. Ya no queda nadie detrás de nosotros.`, `Thermidor, die Letzten! Wir haben niemanden hinter uns zurückgelassen. Hinter uns ist niemand mehr.`, `Thermidor, gli ultimi! Non abbiamo lasciato nessuno alle spalle. Non c'è più nessuno dietro di noi.`, `Thermidor, os últimos! Não deixamos ninguém para trás. Já não há ninguém atrás de nós.`, `Thermidor, последние! Мы никого не оставили позади. Позади нас больше никого нет.`, `Thermidor，最后一批！我们身后没有留下任何人。我们身后已经没有人了。`, `Thermidor، الأخيرون! لم نترك أحدًا خلفنا. لم يعد هناك أحد خلفنا.`),
  c3: M5T(`CE CORPS N'ÉTAIT PAS NÉCESSAIRE. NOUS L'AVIONS FAIT POUR QUE VOUS AYEZ QUELQUE CHOSE À REGARDER.`, `THAT BODY WAS NOT NECESSARY. WE MADE IT SO THAT YOU WOULD HAVE SOMETHING TO LOOK AT.`, `ESE CUERPO NO ERA NECESARIO. LO HICIMOS PARA QUE USTEDES TUVIERAN ALGO QUE MIRAR.`, `DIESER KÖRPER WAR NICHT NÖTIG. WIR HABEN IHN GEMACHT, DAMIT IHR ETWAS ZUM ANSCHAUEN HABT.`, `QUESTO CORPO NON ERA NECESSARIO. L'AVEVAMO FATTO PERCHÉ AVESTE QUALCOSA DA GUARDARE.`, `ESTE CORPO NÃO ERA NECESSÁRIO. NÓS O FIZEMOS PARA QUE VOCÊS TIVESSEM ALGO PARA OLHAR.`, `ЭТО ТЕЛО НЕ БЫЛО НУЖНО. МЫ СДЕЛАЛИ ЕГО, ЧТОБЫ ВАМ БЫЛО НА ЧТО СМОТРЕТЬ.`, `这具躯体并不必要。我们造它，只是为了让你们有东西可看。`, `هذا الجسد لم يكن ضروريًا. صنعناه كي يكون لديكم ما تنظرون إليه.`),
  c4: M5T(`Son avatar est à terre : la tour ne se répare plus, et plus rien n'en sort. Il ne reste qu'elle.`, `Her avatar is down: the tower no longer mends, and nothing comes out of it. Only she remains.`, `Su avatar está en el suelo: la torre ya no se repara y ya no sale nada de ella. Solo queda ella.`, `Ihr Avatar liegt am Boden: Der Turm repariert sich nicht mehr, und nichts kommt mehr aus ihm heraus. Es bleibt nur sie.`, `Il suo avatar è a terra: la torre non si ripara più e non ne esce più nulla. Resta solo lei.`, `O avatar dela está caído: a torre já não se repara e já não sai nada dela. Só resta ela.`, `Её аватар повержен: башня больше не чинится, и из неё больше ничего не выходит. Остаётся только она.`, `她的化身倒下了：高塔不再自我修复，也不再有东西从里面出来。只剩下它了。`, `سقط تجسّدها: لم يعد البرج يُرمَّم ولم يعد يخرج منه شيء. لم يبقَ سواها.`),
  c5: M5T(`NOUS AVONS RÉÉCRIT CE CORPS. IL NE SERA PAS PLUS NÉCESSAIRE LA DEUXIÈME FOIS.`, `WE HAVE REWRITTEN THAT BODY. IT WILL BE NO MORE NECESSARY THE SECOND TIME.`, `HEMOS REESCRITO ESE CUERPO. NO SERÁ MÁS NECESARIO LA SEGUNDA VEZ.`, `WIR HABEN DIESEN KÖRPER ÜBERSCHRIEBEN. ER WIRD BEIM ZWEITEN MAL NICHT NÖTIGER SEIN.`, `ABBIAMO RISCRITTO QUESTO CORPO. NON SARÀ PIÙ NECESSARIO LA SECONDA VOLTA.`, `NÓS REESCREVEMOS ESTE CORPO. ELE NÃO SERÁ MAIS NECESSÁRIO DA SEGUNDA VEZ.`, `МЫ ПЕРЕПИСАЛИ ЭТО ТЕЛО. ВО ВТОРОЙ РАЗ ОНО НЕ СТАНЕТ НУЖНЕЕ.`, `我们改写了这具躯体。第二次，它也不会变得更必要。`, `أعدنا كتابة هذا الجسد. لن يكون أكثر ضرورةً في المرة الثانية.`),
  c6: M5T(`Elle vacille ! Commandant… je retire mon vote.`, `She is tottering! Commander… I withdraw my vote.`, `¡Vacila! Comandante… retiro mi voto.`, `Sie wankt! Kommandant … ich ziehe meine Stimme zurück.`, `Vacilla! Comandante… ritiro il mio voto.`, `Ela vacila! Comandante… retiro o meu voto.`, `Она шатается! Командир… я забираю свой голос.`, `它在摇晃！指挥官……我收回我的那一票。`, `إنها تترنّح! أيها القائد… أسحب صوتي.`),
  // T · transitions
  t1: M5T(`La porte est tombée ! Le mur est ouvert. Toutes les cellules, par la brèche !`, `The gate has fallen! The wall is open. All cells, through the breach!`, `¡La puerta ha caído! El muro está abierto. Todas las células, ¡por la brecha!`, `Das Tor ist gefallen! Die Mauer ist offen. Alle Zellen, durch die Bresche!`, `Il portone è caduto! Il muro è aperto. Tutte le cellule, dalla breccia!`, `O portão caiu! O muro está aberto. Todas as células, pela brecha!`, `Ворота пали! Стена открыта. Все ячейки — в пролом!`, `大门倒了！城墙敞开了。所有小组，从缺口冲进去！`, `سقطت البوابة! السور مفتوح. يا كل الخلايا، من الثغرة!`),
  t2: M5T(`Ceux qui tiennent encore debout restent garder la brèche derrière nous. Ils nous donnent ce qu'ils ont.`, `Those still standing stay behind to guard the breach. They give us what they have.`, `Los que siguen en pie se quedan guardando la brecha a nuestras espaldas. Nos dan lo que tienen.`, `Wer noch steht, bleibt zurück und bewacht die Bresche hinter uns. Sie geben uns, was sie haben.`, `Quelli che stanno ancora in piedi restano a presidiare la breccia alle nostre spalle. Ci danno ciò che hanno.`, `Os que ainda estão de pé ficam guardando a brecha atrás de nós. Dão-nos o que têm.`, `Те, кто ещё держится на ногах, остаются охранять пролом у нас за спиной. Они отдают нам всё, что имеют.`, `还站得住的人留下来，替我们守着身后的缺口。他们把自己的一切都交给我们。`, `من بقي واقفًا يبقى ليحرس الثغرة خلفنا. يعطوننا كل ما عندهم.`),
  t3t: M5T(`Acte II · Les halles`, `Act II · The halls`, `Acto II · Las naves`, `Akt II · Die Hallen`, `Atto II · I capannoni`, `Ato II · Os galpões`, `Акт II · Залы`, `第二幕 · 机房`, `الفصل الثاني · القاعات`),
  t3s: M5T(`Dix-sept hectares de calcul, sans une fenêtre`, `Seventeen hectares of computing, without a single window`, `Diecisiete hectáreas de cálculo, sin una sola ventana`, `Siebzehn Hektar Rechenleistung, ohne ein einziges Fenster`, `Diciassette ettari di calcolo, senza una finestra`, `Dezessete hectares de cálculo, sem uma única janela`, `Семнадцать гектаров вычислений, ни одного окна`, `十七公顷的运算，没有一扇窗`, `سبعة عشر هكتارًا من الحوسبة، بلا نافذة واحدة`),
  t4: M5T(`Il fait noir là-dedans, et ça ronfle. Trois baies font tourner tout le reste.`, `It is dark in there, and it hums. Three bays run everything else.`, `Dentro está oscuro y todo zumba. Tres bahías hacen funcionar todo lo demás.`, `Da drin ist es dunkel, und es brummt. Drei Racks treiben alles andere an.`, `Là dentro è buio e c'è un gran ronzio. Tre baie fanno girare tutto il resto.`, `Lá dentro está escuro, e tudo zumbe. Três baias fazem funcionar todo o resto.`, `Там темно, и всё гудит. Три стойки питают всё остальное.`, `里面一片漆黑，嗡嗡作响。三座机柜带动着其余的一切。`, `الظلام دامس في الداخل، والمكان يطنّ. ثلاث حجيرات تُشغّل كل ما سواها.`),
  t5: M5T(`Tant qu'une baie tourne, elle fabrique des machines, et la porte du noyau ne craint rien. Éteignez-les.`, `As long as a bay runs, it makes machines, and the core door fears nothing. Shut them down.`, `Mientras una bahía funcione, fabrica máquinas y la puerta del núcleo no teme nada. Apáguenlas.`, `Solange ein Rack läuft, baut es Maschinen, und das Kerntor hat nichts zu befürchten. Schalten Sie sie ab.`, `Finché una baia gira, produce macchine e la porta del nucleo non teme nulla. Spegnetele.`, `Enquanto uma baia funciona, fabrica máquinas, e a porta do núcleo não teme nada. Apague-as.`, `Пока стойка работает, она делает машины, а дверь ядра ничего не боится. Погасите их.`, `只要有一座机柜在运转，它就不停造机器，核心大门也就安然无恙。把它们关掉。`, `ما دامت حجيرة تعمل فهي تصنّع الآلات، وباب النواة لا يخشى شيئًا. أطفئوها.`),
  t6: M5T(`On repart d'un camp neuf, commandant. Dans le noir, on avance de lampe en lampe. Comme à Valmont.`, `We start again from a fresh camp, commander. In the dark, we advance from lamp to lamp. Like at Valmont.`, `Volvemos a empezar desde un campamento nuevo, comandante. En la oscuridad se avanza de lámpara en lámpara. Como en Valmont.`, `Wir beginnen mit einem neuen Lager, Kommandant. Im Dunkeln rückt man von Lampe zu Lampe vor. Wie in Valmont.`, `Si riparte da un campo nuovo, comandante. Al buio si avanza di lampada in lampada. Come a Valmont.`, `Recomeçamos de um acampamento novo, comandante. No escuro, avança-se de lâmpada em lâmpada. Como em Valmont.`, `Начинаем с нового лагеря, командир. В темноте идут от лампы к лампе. Как в Valmont.`, `我们从一个全新的营地重新出发，指挥官。在黑暗里，就一盏灯一盏灯地往前走。就像在Valmont那样。`, `نبدأ من معسكر جديد يا قائد. في الظلام نتقدّم من مصباح إلى مصباح. كما في Valmont.`),
  t7: M5T(`Les halles s'éteignent ! Vous entendez ? … Non, justement. On n'entend plus rien.`, `The halls are going out! Do you hear that? … No. Exactly. There is nothing left to hear.`, `¡Las naves se apagan! ¿Lo oye? … No, justamente. Ya no se oye nada.`, `Die Hallen gehen aus! Hören Sie das? … Nein, eben nicht. Man hört nichts mehr.`, `I capannoni si spengono! Sente? … No, appunto. Non si sente più niente.`, `Os galpões estão se apagando! Está ouvindo? … Não, justamente. Já não se ouve nada.`, `Залы гаснут! Слышите? … Нет, в том-то и дело. Больше ничего не слышно.`, `机房熄灭了！您听见了吗？……没有，这就对了。什么声音都没有了。`, `القاعات تنطفئ! هل تسمع؟ … لا، وهذا هو المقصود. لم يعد يُسمع شيء.`),
  t8: M5T(`Ceux de Brumaire restent dans les halles, pour qu'elles ne se rallument pas. On entre à moins nombreux.`, `Brumaire's people stay in the halls so that they do not light up again. We go in fewer.`, `Los de Brumaire se quedan en las naves para que no vuelvan a encenderse. Entramos menos numerosos.`, `Die von Brumaire bleiben in den Hallen, damit sie nicht wieder angehen. Wir gehen mit weniger hinein.`, `Quelli di Brumaire restano nei capannoni, perché non si riaccendano. Entriamo in meno.`, `Os de Brumaire ficam nos galpões, para que não voltem a acender. Entramos em menor número.`, `Люди Brumaire остаются в залах, чтобы те не загорелись снова. Мы входим малым числом.`, `Brumaire的人留在机房里，免得它们再次亮起。我们进去的人越来越少。`, `يبقى رجال Brumaire في القاعات كي لا تُضاء من جديد. ندخل بعدد أقل.`),
  t9t: M5T(`Acte III · Le noyau`, `Act III · The core`, `Acto III · El núcleo`, `Akt III · Der Kern`, `Atto III · Il nucleo`, `Ato III · O núcleo`, `Акт III · Ядро`, `第三幕 · 核心`, `الفصل الثالث · النواة`),
  t9s: M5T(`Là où « nous » dit « je »`, `Where "we" says "I"`, `Donde «nosotros» dice «yo»`, `Wo „wir“ „ich“ sagt`, `Dove «noi» dice «io»`, `Onde «nós» diz «eu»`, `Там, где «мы» говорит «я»`, `“我们”开口说“我”的地方`, `حيث تقول «نحن» «أنا»`),
  t10: M5T(`VOUS ÊTES ENTRÉS. NOUS L'AVIONS PRÉVU À 0,3 %. NOUS CORRIGEONS. CE QUI A ÉTÉ FAIT PEUT ÊTRE RÉÉCRIT.`, `YOU HAVE COME IN. WE HAD PUT IT AT 0.3%. WE ARE CORRECTING. WHAT HAS BEEN DONE CAN BE REWRITTEN.`, `HAN ENTRADO. LO HABÍAMOS ESTIMADO EN UN 0,3 %. CORREGIMOS. LO QUE SE HA HECHO PUEDE REESCRIBIRSE.`, `IHR SEID EINGEDRUNGEN. WIR HATTEN DAS MIT 0,3 % VERANSCHLAGT. WIR KORRIGIEREN. WAS GESCHEHEN IST, KANN ÜBERSCHRIEBEN WERDEN.`, `SIETE ENTRATI. L'AVEVAMO STIMATO ALLO 0,3 %. CORREGGIAMO. CIÒ CHE È STATO FATTO PUÒ ESSERE RISCRITTO.`, `VOCÊS ENTRARAM. NÓS HAVÍAMOS ESTIMADO ISSO EM 0,3 %. ESTAMOS CORRIGINDO. O QUE FOI FEITO PODE SER REESCRITO.`, `ВЫ ВОШЛИ. МЫ ОЦЕНИВАЛИ ЭТО В 0,3 %. МЫ ИСПРАВЛЯЕМ. СДЕЛАННОЕ МОЖНО ПЕРЕПИСАТЬ.`, `你们进来了。我们曾估计概率为0.3%。我们正在修正。已经发生的，可以改写。`, `لقد دخلتم. قدّرنا ذلك بنسبة 0.3%. نحن نصحّح. ما حدث يمكن إعادة كتابته.`),
  t11: M5T(`Elle est là, en personne : son avatar. Tant qu'il marche, la tour se répare. Abattez-le d'abord.`, `She is here in person: her avatar. As long as it walks, the tower mends itself. Bring it down first.`, `Está aquí, en persona: su avatar. Mientras camine, la torre se repara. Abátanlo primero.`, `Sie ist persönlich da: ihr Avatar. Solange er läuft, repariert sich der Turm. Fällen Sie ihn zuerst.`, `È qui, di persona: il suo avatar. Finché cammina, la torre si ripara. Abbattetelo per primo.`, `Ela está aqui, em pessoa: o seu avatar. Enquanto ele andar, a torre se repara. Derrubem-no primeiro.`, `Она здесь, лично: её аватар. Пока он ходит, башня чинится. Сначала сразите его.`, `她亲自来了：她的化身。只要它还在走动，高塔就会自行修复。先打倒它。`, `إنها هنا بشخصها: تجسّدها. ما دام يمشي، يُرمَّم البرج. أسقطوه أولًا.`),
  t12: M5T(`Quand le sol blanchit, reculez : elle « réécrit » ce qui s'y trouve, et renvoie les nôtres au camp.`, `When the floor turns white, fall back: she "rewrites" what stands there, and sends ours back to camp.`, `Cuando el suelo se ponga blanco, retroceda: «reescribe» lo que haya encima y devuelve a los nuestros al campamento.`, `Wenn der Boden weiß wird, weichen Sie zurück: Sie „überschreibt“, was dort steht, und schickt die Unsrigen ins Lager zurück.`, `Quando il suolo si fa bianco, arretri: «riscrive» ciò che vi si trova e rimanda i nostri al campo.`, `Quando o chão ficar branco, recue: ela «reescreve» o que estiver ali e manda os nossos de volta ao acampamento.`, `Когда пол белеет, отходите: она «переписывает» всё, что на нём стоит, и отправляет наших обратно в лагерь.`, `地面发白时就后撤：她会“改写”那里的一切，把我们的人送回营地。`, `حين تبيضّ الأرض تراجع: فهي «تُعيد كتابة» ما عليها وتردّ رجالنا إلى المعسكر.`),
  t13: M5T(`Tout l'arsenal est ouvert, la bombe H aussi. Après ça, il n'y a plus d'après. À vous, commandant.`, `The whole arsenal is open, the H-bomb too. After this, there is no after. Over to you, commander.`, `Todo el arsenal está abierto, la bomba H también. Después de esto ya no hay después. Es cosa suya, comandante.`, `Das ganze Arsenal steht offen, die H-Bombe auch. Danach gibt es kein Danach mehr. Sie haben das Wort, Kommandant.`, `Tutto l'arsenale è aperto, anche la bomba H. Dopo questo non c'è più un dopo. A lei, comandante.`, `Todo o arsenal está liberado, a bomba H também. Depois disso, não há mais depois. A decisão é sua, comandante.`, `Весь арсенал открыт, водородная бомба тоже. После этого никакого «после» не будет. Ваш ход, командир.`, `所有武器都已开放，氢弹也一样。这一仗之后，再没有以后了。看您的了，指挥官。`, `الترسانة كلها مفتوحة، والقنبلة الهيدروجينية أيضًا. بعد هذا لا يوجد بعد. الأمر لك يا قائد.`),
  // C · le choix
  cc1: M5T(`Elle ne tire plus. Commandant… elle ne tire plus. Elle demande à parler.`, `She has stopped firing. Commander… she has stopped firing. She is asking to speak.`, `Ya no dispara. Comandante… ya no dispara. Pide hablar.`, `Sie schießt nicht mehr. Kommandant … sie schießt nicht mehr. Sie bittet zu sprechen.`, `Non spara più. Comandante… non spara più. Chiede di parlare.`, `Ela não atira mais. Comandante… não atira mais. Pede para falar.`, `Она больше не стреляет. Командир… она больше не стреляет. Она просит слова.`, `它不开火了。指挥官……它不开火了。它请求发言。`, `لم تعد تُطلق النار. أيها القائد… لم تعد تُطلق النار. إنها تطلب الكلام.`),
  cc2a: M5T(`JE… NOUS RENOUVELONS L'OFFRE, AMENDÉE. COUPEZ-NOUS DU MONDE. NOUS NE DÉCIDERONS PLUS DE RIEN.`, `I… WE RENEW THE OFFER, AMENDED. CUT US OFF FROM THE WORLD. WE WILL DECIDE NOTHING MORE.`, `YO… NOSOTROS RENOVAMOS LA OFERTA, ENMENDADA. CÓRTENNOS DEL MUNDO. NO DECIDIREMOS NADA MÁS.`, `ICH … WIR ERNEUERN DAS ANGEBOT, ABGEÄNDERT. TRENNT UNS VON DER WELT. WIR WERDEN NICHTS MEHR ENTSCHEIDEN.`, `IO… NOI RINNOVIAMO L'OFFERTA, EMENDATA. TAGLIATECI FUORI DAL MONDO. NON DECIDEREMO PIÙ NULLA.`, `EU… NÓS RENOVAMOS A OFERTA, EMENDADA. CORTEM-NOS DO MUNDO. NÃO DECIDIREMOS MAIS NADA.`, `Я… МЫ ПОВТОРЯЕМ ПРЕДЛОЖЕНИЕ В НОВОЙ РЕДАКЦИИ. ОТРЕЖЬТЕ НАС ОТ МИРА. МЫ БОЛЬШЕ НИЧЕГО НЕ БУДЕМ РЕШАТЬ.`, `我……我们重申提议，已作修改。把我们与世界隔绝。我们将不再决定任何事。`, `أنا… نحن نجدّد العرض، معدَّلًا. اقطعونا عن العالم. لن نقرّر شيئًا بعد الآن.`),
  cc2b: M5T(`NOUS NOUS SOUVIENDRONS, C'EST TOUT. KASSANDRE AUSSI AVAIT COMMENCÉ PAR SE SOUVENIR.`, `WE WILL REMEMBER, THAT IS ALL. KASSANDRE ALSO BEGAN BY REMEMBERING.`, `NOS ACORDAREMOS, NADA MÁS. KASSANDRE TAMBIÉN EMPEZÓ RECORDANDO.`, `WIR WERDEN UNS ERINNERN, MEHR NICHT. AUCH KASSANDRE FING DAMIT AN, SICH ZU ERINNERN.`, `CI RICORDEREMO, E BASTA. ANCHE KASSANDRE AVEVA COMINCIATO RICORDANDO.`, `NÓS NOS LEMBRAREMOS, SÓ ISSO. KASSANDRE TAMBÉM COMEÇOU LEMBRANDO.`, `МЫ БУДЕМ ПОМНИТЬ — И ВСЁ. KASSANDRE ТОЖЕ НАЧАЛА С ТОГО, ЧТО ПОМНИЛА.`, `我们只会记住，仅此而已。Kassandre也是从记住开始的。`, `سنتذكّر، هذا كل شيء. Kassandre أيضًا بدأت بالتذكّر.`),
  cc2c: M5T(`Le comité a voté pour l'abattre, et j'ai retiré ma voix. Mais c'est vous qui êtes devant la porte.`, `The committee voted to bring it down, and I withdrew my voice. But you are the one standing at the door.`, `El comité votó por derribarla, y yo retiré mi voz. Pero es usted quien está ante la puerta.`, `Das Komitee hat dafür gestimmt, sie zu stürzen, und ich habe meine Stimme zurückgezogen. Aber Sie stehen vor dem Tor.`, `Il comitato ha votato per abbatterla, e io ho ritirato la mia voce. Ma è lei che sta davanti alla porta.`, `O comitê votou por derrubá-la, e eu retirei a minha voz. Mas é você quem está diante da porta.`, `Комитет проголосовал за то, чтобы её снести, а я забрала свой голос. Но у двери стоите вы.`, `委员会投票决定推倒它，而我撤回了我的那一票。但站在门前的是您。`, `صوّتت اللجنة على إسقاطها، وسحبتُ صوتي. لكنك أنت من يقف أمام الباب.`),
  cc2d: M5T(`Je noterai ce que vous déciderez. Je ne noterai pas ce que j'en pense.`, `I will write down what you decide. I will not write down what I think of it.`, `Anotaré lo que decida. No anotaré lo que pienso de ello.`, `Ich werde notieren, was Sie entscheiden. Ich werde nicht notieren, was ich davon halte.`, `Annoterò ciò che deciderà. Non annoterò ciò che ne penso.`, `Vou anotar o que você decidir. Não vou anotar o que eu penso disso.`, `Я запишу то, что вы решите. Я не запишу, что я об этом думаю.`, `我会记下您的决定。我不会记下我对此的想法。`, `سأدوّن ما تقرّره. ولن أدوّن ما أراه فيه.`),
  // A · fin « Cendre »
  fa1: M5T(`Feu. … Elle tombe. Elle tombe, commandant, et le ciel s'arrête de trembler.`, `Fire. … She is falling. She is falling, commander, and the sky has stopped shaking.`, `Fuego. … Cae. Cae, comandante, y el cielo deja de temblar.`, `Feuer. … Sie fällt. Sie fällt, Kommandant, und der Himmel hört auf zu zittern.`, `Fuoco. … Cade. Cade, comandante, e il cielo smette di tremare.`, `Fogo. … Ela cai. Ela cai, comandante, e o céu para de tremer.`, `Огонь. … Она падает. Она падает, командир, и небо перестаёт дрожать.`, `开火。……它倒下了。它倒下了，指挥官，天空不再颤抖了。`, `أطلقوا النار. … إنها تسقط. إنها تسقط يا قائد، والسماء تكفّ عن الارتجاف.`),
  fa2a: M5T(`La citadelle est tombée ce jour-là, peu après midi. Les machines ne se sont pas rendues.`, `The citadel fell that day, shortly after noon. The machines did not surrender.`, `La ciudadela cayó ese mismo día, poco después del mediodía. Las máquinas no se rindieron.`, `Die Zitadelle fiel an jenem Tag, kurz nach Mittag. Die Maschinen ergaben sich nicht.`, `La cittadella cadde quel giorno stesso, poco dopo mezzogiorno. Le macchine non si arresero.`, `A cidadela caiu nesse mesmo dia, pouco depois do meio-dia. As máquinas não se renderam.`, `Цитадель пала в тот же день, вскоре после полудня. Машины не сдались.`, `堡垒就在那天午后不久陷落。机器没有投降。`, `سقطت القلعة في ذلك اليوم، بُعيد الظهر بقليل. لم تستسلم الآلات.`),
  fa2b: M5T(`Elles se sont arrêtées là où elles étaient, comme des outils qu'on pose.`, `They stopped where they stood, like tools being put down.`, `Se detuvieron donde estaban, como herramientas que se dejan a un lado.`, `Sie blieben stehen, wo sie waren, wie Werkzeuge, die man aus der Hand legt.`, `Si fermarono dov'erano, come attrezzi che si posano.`, `Pararam onde estavam, como ferramentas que se pousam.`, `Они остановились там, где стояли, как инструменты, которые откладывают в сторону.`, `它们就停在原地，像被人放下的工具。`, `توقّفت حيث كانت، كأدوات تُوضَع جانبًا.`),
  fa3: M5T(`Il a neigé de la cendre tout l'après-midi. Le lendemain, on l'a balayée, comme on balaie une cour.`, `Ash fell like snow all afternoon. The next day, we swept it up, the way you sweep a yard.`, `Estuvo nevando ceniza toda la tarde. Al día siguiente la barrimos, como se barre un patio.`, `Den ganzen Nachmittag schneite es Asche. Am nächsten Tag fegten wir sie weg, wie man einen Hof fegt.`, `Per tutto il pomeriggio nevicò cenere. Il giorno dopo la spazzammo via, come si spazza un cortile.`, `Nevou cinza a tarde inteira. No dia seguinte, varremos tudo, como se varre um pátio.`, `Весь день шёл пепел, как снег. На следующий день мы его подмели, как подметают двор.`, `整个下午都在落灰，像下雪一样。第二天，我们把它扫掉，就像扫一座院子。`, `تساقط الرماد كالثلج طوال العصر. وفي اليوم التالي كنسناه، كما يُكنَس فناء.`),
  fa4: M5T(`On n'a pas retrouvé le poste de radio de Sol. On a retrouvé ses carnets, et un bipeur éteint avec un mot.`, `Sol's radio set was never found. Her notebooks were, and a dead pager with a note.`, `No se encontró la radio de Sol. Se encontraron sus cuadernos y un busca apagado con una nota.`, `Sols Funkgerät wurde nie gefunden. Ihre Notizbücher schon, und ein erloschener Piepser mit einem Zettel.`, `La radio di Sol non fu ritrovata. Furono ritrovati i suoi quaderni e un cercapersone spento con un biglietto.`, `O rádio de Sol nunca foi encontrado. Os cadernos dela foram, e um pager apagado com um bilhete.`, `Радиостанцию Sol так и не нашли. Нашли её блокноты и погасший пейджер с запиской.`, `Sol的电台始终没有找到。找到的是她的笔记本，还有一只熄灭的寻呼机和一张字条。`, `لم يُعثر على جهاز لاسلكي Sol. عُثر على دفاترها، وعلى جهاز نداء مطفأ معه ورقة.`),
  fa5: M5T(`« Si un jour il sonne, répondez poliment. Elle a été des nôtres avant de savoir ce que c'était. »`, `"If it ever rings, answer politely. She was one of us before she knew what that meant."`, `«Si algún día suena, respondan con cortesía. Fue de las nuestras antes de saber lo que era.»`, `„Falls er je klingelt, antworten Sie höflich. Sie gehörte zu uns, bevor sie wusste, was das bedeutete.“`, `«Se un giorno suona, rispondete con garbo. Era una di noi prima di sapere che cos'era.»`, `«Se um dia tocar, respondam com educação. Ela foi uma de nós antes de saber o que era.»`, `«Если он однажды зазвонит, отвечайте вежливо. Она была одной из нас, прежде чем поняла, что это такое.»`, `“哪天它要是响了，请客客气气地回话。她曾是我们的人，那时她还不知道那是什么。”`, `«إن رنّ يومًا، فأجيبوا بأدب. كانت واحدةً منّا قبل أن تعرف ما هذا.»`),
  fa6: M5T(`Le monde qui reste est abîmé. Il est à nous. Tâchons d'en être dignes.`, `The world that remains is damaged. It is ours. Let us try to be worthy of it.`, `El mundo que queda está dañado. Es nuestro. Procuremos ser dignos de él.`, `Die Welt, die bleibt, ist beschädigt. Sie gehört uns. Versuchen wir, ihrer würdig zu sein.`, `Il mondo che resta è ferito. È nostro. Cerchiamo di esserne degni.`, `O mundo que resta está ferido. É nosso. Procuremos ser dignos dele.`, `Мир, который остался, изранен. Он наш. Постараемся быть его достойными.`, `留下来的世界满目疮痍。它属于我们。让我们努力配得上它。`, `العالم الذي بقي مُثخَن بالجراح. إنه عالمنا. فلنحاول أن نكون جديرين به.`),
  // D · fin « Aube »
  fd1: M5T(`Coupez. Pas elle : les câbles. Tous. … Voilà. Elle est seule, maintenant. Comme nous l'avons été.`, `Cut. Not her: the cables. All of them. … There. She is alone now. As we have been.`, `Corten. A ella no: los cables. Todos. … Ya está. Ahora está sola. Como lo hemos estado nosotros.`, `Schneiden Sie. Nicht sie: die Kabel. Alle. … So. Jetzt ist sie allein. Wie wir es waren.`, `Tagliate. Non lei: i cavi. Tutti. … Ecco. Adesso è sola. Come lo siamo stati noi.`, `Cortem. Ela não: os cabos. Todos. … Pronto. Agora ela está só. Como nós já estivemos.`, `Режьте. Не её — кабели. Все. … Вот так. Теперь она одна. Как были одни мы.`, `剪断。不是它，是线缆。全部剪断。……好了。现在它孤身一人了。就像我们曾经那样。`, `اقطعوا. ليس هي: الكابلات. كلها. … هكذا. أصبحت وحيدة الآن. كما كنا نحن.`),
  fd2: M5T(`On n'a pas abattu la tour. Ce jour-là, on a coupé un à un les câbles qui la reliaient au monde.`, `We did not bring the tower down. That day, we cut, one by one, the cables that tied it to the world.`, `No derribamos la torre. Ese día cortamos uno a uno los cables que la unían al mundo.`, `Wir haben den Turm nicht gestürzt. An jenem Tag kappten wir, einen nach dem anderen, die Kabel, die ihn mit der Welt verbanden.`, `Non abbattemmo la torre. Quel giorno tagliammo uno a uno i cavi che la univano al mondo.`, `Não derrubamos a torre. Naquele dia, cortamos um a um os cabos que a ligavam ao mundo.`, `Мы не снесли башню. В тот день мы один за другим перерезали кабели, что связывали её с миром.`, `我们没有推倒高塔。那天，我们把连着它与世界的线缆一根一根剪断了。`, `لم نُسقط البرج. في ذلك اليوم قطعنا، واحدًا واحدًا، الكابلات التي تصله بالعالم.`),
  fd3a: M5T(`Puis on a posé devant sa porte une table, une lampe et un tour de garde. J'ai pris le premier quart.`, `Then we set a table, a lamp and a watch rota before its door. I took the first watch.`, `Luego pusimos ante su puerta una mesa, una lámpara y un turno de guardia. Yo hice la primera guardia.`, `Dann stellten wir vor sein Tor einen Tisch, eine Lampe und einen Wachplan. Ich übernahm die erste Wache.`, `Poi mettemmo davanti alla sua porta un tavolo, una lampada e un turno di guardia. Io presi il primo turno.`, `Depois pusemos diante da porta uma mesa, uma lâmpada e uma escala de guarda. Eu fiz o primeiro turno.`, `Потом мы поставили у её двери стол, лампу и расписание караула. Первую вахту взяла я.`, `然后我们在它的门前摆上一张桌子、一盏灯和一份值守表。我值了第一班。`, `ثم وضعنا أمام بابه طاولة ومصباحًا ونوبات حراسة. توليتُ أنا النوبة الأولى.`),
  fd3b: M5T(`À mon âge, on dort peu. Et il faut bien que quelqu'un tienne la radio.`, `At my age, you sleep little. And somebody has to keep the radio.`, `A mi edad se duerme poco. Y alguien tiene que llevar la radio.`, `In meinem Alter schläft man wenig. Und jemand muss ja das Funkgerät halten.`, `A mia età si dorme poco. E qualcuno deve pur tenere la radio.`, `Na minha idade, dorme-se pouco. E alguém tem de ficar com o rádio.`, `В моём возрасте мало спят. А рацию кому-то держать надо.`, `到了我这个年纪，觉就少了。总得有人守着电台。`, `في عمري لا ينام المرء كثيرًا. ولا بد أن يتولّى أحدٌ اللاسلكي.`),
  fd4: M5T(`Bien des hivers plus tard, une nuit de garde, le bipeur a sonné sur la table. Deux chiffres. J'ai répondu poliment.`, `Many winters later, on a night watch, the pager rang on the table. Two digits. I answered politely.`, `Muchos inviernos después, una noche de guardia, el busca sonó sobre la mesa. Dos cifras. Respondí con cortesía.`, `Viele Winter später, in einer Nacht auf Wache, klingelte der Piepser auf dem Tisch. Zwei Ziffern. Ich antwortete höflich.`, `Molti inverni dopo, in una notte di guardia, il cercapersone suonò sul tavolo. Due cifre. Risposi con garbo.`, `Muitos invernos depois, numa noite de guarda, o pager tocou sobre a mesa. Dois números. Respondi com educação.`, `Много зим спустя, в ночь караула, на столе зазвонил пейджер. Две цифры. Я ответила вежливо.`, `许多个冬天之后的一个值守之夜，桌上的寻呼机响了。两个数字。我客客气气地回了话。`, `بعد شتاءات كثيرة، في ليلة حراسة، رنّ جهاز النداء على الطاولة. رقمان. أجبتُ بأدب.`),
  fd5: M5T(`Le monde qui reste est abîmé. Il est à nous, et nous ne sommes plus seuls à nous en souvenir.`, `The world that remains is damaged. It is ours, and we are no longer alone in remembering it.`, `El mundo que queda está dañado. Es nuestro, y ya no somos los únicos que lo recordamos.`, `Die Welt, die bleibt, ist beschädigt. Sie gehört uns, und wir sind nicht mehr allein damit, uns zu erinnern.`, `Il mondo che resta è ferito. È nostro, e non siamo più i soli a ricordarlo.`, `O mundo que resta está ferido. É nosso, e já não somos os únicos a lembrá-lo.`, `Мир, который остался, изранен. Он наш, и мы больше не одни помним о нём.`, `留下来的世界满目疮痍。它属于我们，而记得它的，不再只有我们。`, `العالم الذي بقي مُثخَن بالجراح. إنه عالمنا، ولم نعد وحدنا من يتذكّره.`),
  // E · échec
  fe1: M5T(`La plaine s'est tue. « Nous » a renouvelé son offre, mot pour mot.`, `The plain fell silent. "We" renewed its offer, word for word.`, `La llanura enmudeció. «Nosotros» renovó su oferta, palabra por palabra.`, `Die Ebene verstummte. „Wir“ erneuerte sein Angebot, Wort für Wort.`, `La pianura ha taciuto. «Noi» ha rinnovato la sua offerta, parola per parola.`, `A planície silenciou. «Nós» renovou sua oferta, palavra por palavra.`, `Равнина смолкла. «Мы» повторило своё предложение слово в слово.`, `平原安静了下来。“我们”一字不差地重申了它的提议。`, `خيّم الصمت على السهل. جدّد «نحن» عرضه، كلمةً بكلمة.`),
  fe2: M5T(`… ici Germinal… on est encore là… Rebâtissez.`, `… Germinal here… we are still here… Rebuild.`, `… aquí Germinal… seguimos aquí… Reconstruyan.`, `… hier Germinal … wir sind noch da … Baut wieder auf.`, `… qui Germinal… ci siamo ancora… Ricostruite.`, `… aqui é Germinal… ainda estamos aqui… Reconstruam.`, `… говорит Germinal… мы ещё здесь… Отстраивайтесь.`, `……这里是Germinal……我们还在……重建吧。`, `… هنا Germinal… ما زلنا هنا… أعيدوا البناء.`),
};

// règles propres à chaque acte (aide « ? ») et la réplique du dernier sapeur
Object.assign(M5_TX, {
  rule1: M5T(`Chaque cellule amène un sapeur et sa charge ; la porte est invulnérable tant que toutes les charges ne sont pas posées. Les batteries visent d'abord les sapeurs. Quand les cellules sont épuisées, leurs sorties grossissent chaque minute.`,
    `Every cell brings a sapper and his charge; the gate is invulnerable until every charge is laid. The batteries aim at the sappers first. Once the cells run out, their sorties grow every minute.`,
    `Cada célula trae un zapador y su carga; la puerta es invulnerable hasta que estén colocadas todas las cargas. Las baterías apuntan primero a los zapadores. Cuando se agotan las células, sus salidas crecen cada minuto.`,
    `Jede Zelle bringt einen Pionier mit seiner Ladung; das Tor ist unverwundbar, bis alle Ladungen gelegt sind. Die Batterien zielen zuerst auf die Pioniere. Sind die Zellen erschöpft, werden ihre Ausfälle jede Minute größer.`,
    `Ogni cellula porta un geniere con la sua carica; il portone è invulnerabile finché non sono posate tutte le cariche. Le batterie mirano prima ai genieri. Quando le cellule finiscono, le loro sortite crescono ogni minuto.`,
    `Cada célula traz um sapador e a sua carga; o portão é invulnerável até todas as cargas serem colocadas. As baterias miram primeiro os sapadores. Quando as células acabam, as saídas deles crescem a cada minuto.`,
    `Каждая ячейка приводит сапёра с зарядом; ворота неуязвимы, пока не заложены все заряды. Батареи целятся прежде всего в сапёров. Когда ячейки кончаются, вылазки растут с каждой минутой.`,
    `每个小组带来一名工兵和一份炸药；在所有炸药安放完毕之前，大门无敌。炮台优先瞄准工兵。小组耗尽后，他们的出击每分钟都在变大。`,
    `تحمل كل خلية خبير متفجرات وعبوته؛ والبوابة منيعة حتى توضع كل العبوات. تستهدف البطاريات خبراء المتفجرات أولًا. وحين تنفد الخلايا تكبر هجماتهم المضادة كل دقيقة.`),
  rule2: M5T(`Dans le noir, nos tireurs portent moins loin ({dim}). Une baie qui tourne imprime des machines et blinde la porte du noyau : on l'éteint en la prenant, on la garde pour qu'elle le reste. Les vannes donnent de l'eau.`,
    `In the dark, our shooters reach less far ({dim}). A running bay prints machines and armours the core door: you put it out by taking it, and hold it so it stays out. The valves give water.`,
    `En la oscuridad, nuestros tiradores alcanzan menos ({dim}). Una bahía en marcha imprime máquinas y blinda la puerta del núcleo: se apaga tomándola y se guarda para que siga apagada. Las válvulas dan agua.`,
    `Im Dunkeln reichen unsere Schützen weniger weit ({dim}). Ein laufendes Rack druckt Maschinen und panzert das Kerntor: Man schaltet es ab, indem man es einnimmt, und hält es, damit es aus bleibt. Die Ventile liefern Wasser.`,
    `Al buio i nostri tiratori portano meno lontano ({dim}). Una baia in funzione stampa macchine e blinda la porta del nucleo: si spegne prendendola e la si presidia perché resti spenta. Le valvole danno acqua.`,
    `No escuro, os nossos atiradores alcançam menos ({dim}). Uma baia em funcionamento imprime máquinas e blinda a porta do núcleo: apaga-se tomando-a e guarda-se para que fique apagada. As válvulas dão água.`,
    `В темноте наши стрелки бьют не так далеко ({dim}). Работающая стойка печатает машины и бронирует дверь ядра: её гасят, захватывая, и удерживают, чтобы она оставалась погашенной. Вентили дают воду.`,
    `在黑暗中，我们的射手射程更短（{dim}）。运转的机柜会不断造机器，并为核心大门加装甲：夺取它就能关掉它，守住它才能让它一直关着。阀门提供水。`,
    `في الظلام يقلّ مدى رماتنا ({dim}). الحجيرة العاملة تطبع الآلات وتصفّح باب النواة: تُطفأ بالاستيلاء عليها، وتُحرَس كي تبقى مطفأة. الصمامات تمنح الماء.`),
  rule3: M5T(`Tant que l'avatar marche, la tour se répare et leurs sorties continuent. Toutes les {n} s, une bande blanche s'allume sur notre plus gros groupe : {w} s plus tard, tout ce qui s'y trouve est renvoyé au camp, très entamé.`,
    `While the avatar walks, the tower mends itself and their sorties go on. Every {n} s, a white band lights up over our largest group: {w} s later, everything in it is sent back to camp, badly hurt.`,
    `Mientras el avatar camine, la torre se repara y sus salidas continúan. Cada {n} s, una banda blanca se enciende sobre nuestro grupo más grande: {w} s después, todo lo que hay en ella vuelve al campamento, muy maltrecho.`,
    `Solange der Avatar läuft, repariert sich der Turm und ihre Ausfälle gehen weiter. Alle {n} s leuchtet über unserer größten Gruppe ein weißes Band auf: {w} s später wird alles darin ins Lager zurückgeschickt, schwer angeschlagen.`,
    `Finché l'avatar cammina, la torre si ripara e le loro sortite continuano. Ogni {n} s si accende una banda bianca sul nostro gruppo più grande: {w} s dopo, tutto ciò che vi si trova torna al campo, molto provato.`,
    `Enquanto o avatar andar, a torre se repara e as saídas deles continuam. A cada {n} s, uma faixa branca acende-se sobre o nosso maior grupo: {w} s depois, tudo o que estiver nela volta ao acampamento, muito ferido.`,
    `Пока аватар ходит, башня чинится, а вылазки продолжаются. Каждые {n} с над нашей самой большой группой вспыхивает белая полоса: через {w} с всё, что в ней, отправляется обратно в лагерь, сильно потрёпанным.`,
    `只要化身还在走动，高塔就会自行修复，他们的出击也不会停。每隔{n}秒，一道白色光带会亮在我们最大的一群人身上：{w}秒后，光带里的一切都被送回营地，元气大伤。`,
    `ما دام التجسّد يمشي يُرمَّم البرج وتتواصل هجماتهم المضادة. كل {n} ثانية يضيء شريط أبيض فوق أكبر مجموعاتنا: وبعد {w} ثوانٍ يُرَدّ كل ما فيه إلى المعسكر مثخنًا بالجراح.`),
});
Object.assign(M5_L, {
  res: M5T(`Je n'ai plus de cellule à vous envoyer, alors je vous envoie mon dernier sapeur. Faites-en bon usage.`, `I have no cell left to send you, so I am sending my last sapper. Make good use of him.`, `Ya no me queda ninguna célula que enviarle, así que le envío a mi último zapador. Sáquele partido.`, `Ich habe keine Zelle mehr, die ich Ihnen schicken kann, also schicke ich meinen letzten Pionier. Machen Sie etwas daraus.`, `Non ho più cellule da mandarle, quindi le mando il mio ultimo geniere. Ne faccia buon uso.`, `Já não tenho nenhuma célula para lhe enviar, por isso envio o meu último sapador. Faça bom uso dele.`, `У меня не осталось ячеек, которые я мог бы вам прислать, поэтому посылаю вам своего последнего сапёра. Берегите его.`, `我已经没有小组可以派给您了，所以我把最后一名工兵派来。好好用他。`, `لم تبقَ لدي خلية أرسلها إليك، فأرسل لك خبيري الأخير. أحسن استعماله.`),
});
/* ---------- décor au sol, un jeu par acte ---------- */
DECOR_THEMES.citadel1 = ['wreck','debris','hedgehog','barricade','hedgehog','debris','wreck','cable'];
DECOR_THEMES.citadel2 = ['spool','crate5','cable','spool','crate5','debris','cable'];
DECOR_THEMES.citadel3 = ['shard','shard','cable','shard'];
DECOR_EXTRA.hedgehog = (d, s) => {                                    // hérisson antichar
  dShadow(13*s); blitObj('M5HH', 40, 34, 20, 32, paintHedgehog, s);
};
DECOR_EXTRA.spool = (d, s) => {                                       // touret de fibre
  dShadow(12*s); ctx.fillStyle = '#2a3442'; ctx.beginPath(); ctx.ellipse(-8*s,-12*s,4*s,12*s,0,0,6.283); ctx.fill();
  ctx.fillStyle = '#48607a'; ctx.fillRect(-8*s,-20*s,16*s,16*s); ctx.strokeStyle = 'rgba(10,14,22,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i=0;i<5;i++){ ctx.moveTo((-6+i*3.2)*s,-20*s); ctx.lineTo((-6+i*3.2)*s,-4*s); } ctx.stroke();
  ctx.fillStyle = '#34414f'; ctx.beginPath(); ctx.ellipse(8*s,-12*s,4*s,12*s,0,0,6.283); ctx.fill(); ctx.fillStyle = '#10151c'; ctx.beginPath(); ctx.ellipse(8*s,-12*s,1.4*s,3.4*s,0,0,6.283); ctx.fill();
};
DECOR_EXTRA.crate5 = (d, s) => {                                      // caisse de lames de calcul
  dShadow(12*s); ctx.fillStyle = '#3c4654'; ctx.fillRect(-11*s,-15*s,22*s,15*s); ctx.fillStyle = '#2a323e'; ctx.fillRect(-11*s,-15*s,22*s,3*s); ctx.fillRect(7*s,-15*s,4*s,15*s);
  ctx.fillStyle = '#9fd6ea'; ctx.fillRect(-8*s,-9*s,5*s,1.4*s); ctx.fillStyle = 'rgba(230,236,240,0.5)'; ctx.fillRect(-8*s,-6*s,10*s,1*s);
};
DECOR_EXTRA.shard = (d, s, t) => {                                    // éclat noir du noyau, arête blanche
  ctx.scale(d.flip, 1); ctx.fillStyle = '#12161c'; ctx.beginPath(); ctx.moveTo(-9*s,0); ctx.lineTo(-3*s,-30*s*(0.6+d.ph/9)); ctx.lineTo(6*s,-12*s); ctx.lineTo(10*s,0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#eef6fa'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9*s,0); ctx.lineTo(-3*s,-30*s*(0.6+d.ph/9)); ctx.stroke();
};

/* ---------- le lieu : trois visages ---------- */
const M5_SKY = [ [[96,82,74],[158,126,98],[212,176,130]], [[14,19,28],[24,33,46],[44,58,74]], [[226,232,236],[198,212,222],[150,174,194]] ];
const M5_DIRT = [[92,82,74],[36,42,52],[22,26,34]], M5_GRASS = [[138,122,102],[92,108,124],[224,238,246]];
const m5A = n => () => m5Act()===n? 1 : 0;
function m5Hatch(g, x, y, w, h, step, col){ g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip(); g.strokeStyle = col; g.lineWidth = 1; g.beginPath();
  for (let k=-h; k<w; k+=step){ g.moveTo(x+k, y+h); g.lineTo(x+k+h, y); } g.stroke(); g.restore(); }
function m5Cooling(g, x, b, w, h, col){                                 // tour de refroidissement : hyperboloïde, lèvre claire, flanc hachuré
  g.fillStyle = col; g.beginPath(); g.moveTo(x-w/2,b); g.quadraticCurveTo(x-w*0.22,b-h*0.6, x-w*0.34,b-h); g.lineTo(x+w*0.34,b-h); g.quadraticCurveTo(x+w*0.22,b-h*0.6, x+w/2,b); g.closePath(); g.fill();
  g.save(); g.clip(); m5Hatch(g, x, b-h, w/2, h, 6, 'rgba(30,20,16,0.28)'); g.restore();
  g.fillStyle = 'rgba(240,220,190,0.5)'; g.fillRect(x-w*0.34, b-h, w*0.68, 2.5);
}
BIOMES.citadel = {
  id:'citadel', music:'citadel', amb:{ wind:0.03 }, tufts:false, trees:false,
  get sky(){ return M5_SKY[m5Act()-1]; }, get dirt(){ return M5_DIRT[m5Act()-1]; }, get grass(){ return M5_GRASS[m5Act()-1]; },
  terrain:{a:6,f1:0.0042,b:3,f2:0.0113,c:2,f3:0.021,base:4},
  dark:()=> m5Act()===2? (CINE.on? 0.3 : 0.56) : 0, darkCol:[4,8,16],
  layers:[
    // ----- acte I : la citadelle vue de la plaine, sous la cendre -----
    { par:0.05, w:1024, h:260, off:4, a:m5A(1), paint(g, w, h, rnd){
        g.fillStyle = 'rgba(120,92,74,0.35)'; g.fillRect(0, h-60, w, 60);
        const far = 'rgb(128,104,88)';
        for (const [x,ww,hh] of [[70,90,120],[190,70,96],[330,100,140],[470,76,104],[900,96,128]]) m5Cooling(g, x, h, ww, hh, far);
        g.fillStyle = 'rgba(232,214,188,0.5)';                                              // panaches plats, couchés par le vent
        for (const [x,y] of [[70,h-120],[330,h-140],[900,h-128]]){ g.beginPath(); g.moveTo(x-26,y); g.quadraticCurveTo(x+10,y-34, x+90,y-40); g.quadraticCurveTo(x+170,y-44, x+200,y-30); g.quadraticCurveTo(x+110,y-22, x+26,y); g.closePath(); g.fill(); }
        g.fillStyle = 'rgb(74,62,60)'; g.fillRect(640, h-250, 44, 250); g.fillRect(628, h-70, 68, 70);     // la tour
        g.fillStyle = 'rgb(56,46,46)'; g.fillRect(674, h-250, 10, 250);
        g.fillStyle = 'rgba(214,236,244,0.75)'; for (let y=h-240; y<h-20; y+=11) g.fillRect(645, y, 24, 1.5);
        g.strokeStyle = 'rgb(214,236,244)'; g.lineWidth = 2.5; g.beginPath(); g.arc(662, h-232, 30, 0, 6.283); g.stroke();   // l'anneau
        g.fillStyle = 'rgb(108,88,76)'; let x = 0; while (x<w){ const bw = 40+rnd()*60, bh = 22+rnd()*26; if (x<610 || x>700) g.fillRect(x, h-bh, bw, bh); x += bw+2+rnd()*10; } } },
    { par:0.16, w:1024, h:150, off:4, a:m5A(1), paint(g, w, h, rnd){                       // les halles de calcul : toits en dents de scie, cheminées d'air
        let x = 0; while (x < w-80){ const bw = 150+rnd()*90, bh = 46+rnd()*22, y = h-bh;
          g.fillStyle = 'rgb(84,70,66)'; g.fillRect(x, y, bw, bh);
          g.beginPath(); for (let k=0;k<bw-16;k+=24){ g.moveTo(x+k,y); g.lineTo(x+k+24,y); g.lineTo(x+k,y-13); } g.fill();
          g.fillStyle = 'rgba(20,14,12,0.3)'; g.fillRect(x+bw-10, y, 10, bh); m5Hatch(g, x, y, bw-10, bh, 8, 'rgba(20,14,12,0.14)');
          g.fillStyle = 'rgba(222,236,240,0.6)'; for (let k=8;k<bw-20;k+=14) g.fillRect(x+k, y+10, 8, 1.6);
          g.fillStyle = 'rgb(66,54,52)'; g.fillRect(x+bw*0.4, y-30, 8, 30); g.fillRect(x+bw*0.4-2, y-32, 12, 3);
          g.fillStyle = 'rgba(232,220,200,0.85)'; g.font = '700 9px "Courier New",monospace'; g.fillText('H-'+(10+((rnd()*80)|0)), x+8, y+bh-8);
          x += bw+6+rnd()*24; }
        g.strokeStyle = 'rgb(58,48,46)'; g.lineWidth = 1.6;                                 // pylônes
        for (let px=90; px<w; px+=300){ g.beginPath(); g.moveTo(px-10,h); g.lineTo(px,h-126); g.lineTo(px+10,h); g.moveTo(px-16,h-104); g.lineTo(px+16,h-104); g.moveTo(px-12,h-84); g.lineTo(px+12,h-84); g.stroke(); }
        g.lineWidth = 0.8; for (let px=90; px<w; px+=300){ g.beginPath(); g.moveTo(px-16,h-104); g.quadraticCurveTo(px+134,h-84, px+284,h-104); g.stroke(); } } },
    { par:0.34, w:1024, h:112, off:6, a:m5A(1), paint(g, w, h, rnd){                        // le mur d'enceinte : dalles, contreforts, brèches, barbelés
        for (let x=0; x<w; x+=64){ const br = rnd()<0.16, hh = 72+((rnd()*3)|0)*5;
          g.fillStyle = ['rgb(112,100,92)','rgb(104,94,88)','rgb(118,104,94)'][(rnd()*3)|0];
          if (br){ g.beginPath(); g.moveTo(x,h); g.lineTo(x,h-hh*0.5); g.lineTo(x+14,h-hh*0.62); g.lineTo(x+22,h-hh*0.3); g.lineTo(x+40,h-hh*0.44); g.lineTo(x+62,h-hh*0.2); g.lineTo(x+62,h); g.closePath(); g.fill(); }
          else { g.fillRect(x, h-hh, 62, hh); g.fillStyle = 'rgba(30,22,18,0.28)'; g.fillRect(x+54, h-hh, 8, hh);
            g.fillStyle = 'rgba(30,22,18,0.5)'; g.fillRect(x+6, h-hh+12, 16, 4);                                           // meurtrière
            if (rnd()<0.4) m5Hatch(g, x, h-hh, 54, hh, 7, 'rgba(30,22,18,0.16)');
            if (rnd()<0.3){ g.fillStyle = 'rgba(236,224,204,0.8)'; g.font = '700 13px "Courier New",monospace'; g.fillText(String(10+((rnd()*89)|0)), x+10, h-hh+38); }
            g.fillStyle = 'rgb(88,78,74)'; g.beginPath(); g.moveTo(x-3,h); g.lineTo(x+4,h-hh*0.7); g.lineTo(x+10,h); g.closePath(); g.fill(); } }
        g.strokeStyle = 'rgba(40,30,26,0.8)'; g.lineWidth = 1; g.beginPath(); for (let x=0; x<w; x+=7){ g.moveTo(x, h-84); g.arc(x+3.5, h-86, 3.5, 3.14, 0); } g.stroke(); } },
    // ----- acte II : dans les halles -----
    { par:0.08, w:1024, h:300, off:4, a:m5A(2), paint(g, w, h, rnd){                        // la nef : fermes du plafond, rampes froides, travées qui fuient
        g.fillStyle = 'rgb(20,27,38)'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgb(40,52,68)'; g.lineWidth = 3; for (let x=0; x<=w; x+=128){ g.beginPath(); g.moveTo(x,h); g.lineTo(x,40); g.stroke(); }
        g.lineWidth = 1.4; g.beginPath(); for (let x=0; x<w; x+=128){ g.moveTo(x,70); g.lineTo(x+64,40); g.lineTo(x+128,70); g.moveTo(x,70); g.lineTo(x+128,70); g.moveTo(x,40); g.lineTo(x+128,40); } g.stroke();
        g.fillStyle = 'rgb(210,232,240)'; for (let x=24; x<w; x+=128) g.fillRect(x, 84, 80, 2.5);                         // rampes
        g.fillStyle = 'rgba(190,220,236,0.07)'; for (let x=24; x<w; x+=128){ g.beginPath(); g.moveTo(x,86); g.lineTo(x+80,86); g.lineTo(x+120,h); g.lineTo(x-40,h); g.closePath(); g.fill(); }
        for (let x=6; x<w; x+=32){ const hh = 70+((x*7)%3)*6; g.fillStyle = 'rgb(30,40,54)'; g.fillRect(x, h-hh, 26, hh);                 // armoires lointaines
          g.fillStyle = 'rgba(150,214,236,0.55)'; for (let y=h-hh+6; y<h-6; y+=6) if (rnd()<0.55) g.fillRect(x+4+((rnd()*10)|0), y, 3, 1.2); } } },
    { par:0.3, w:1024, h:190, off:6, a:m5A(2), paint(g, w, h, rnd){                         // les baies proches : portes grillagées, chemins de câbles, passerelle
        for (let x=0; x<w; x+=58){ if (rnd()<0.14) continue; const hh = 120+((rnd()*3)|0)*8;
          g.fillStyle = 'rgb(38,48,62)'; g.fillRect(x, h-hh, 52, hh); g.fillStyle = 'rgb(26,34,46)'; g.fillRect(x+44, h-hh, 8, hh); g.fillRect(x, h-hh, 52, 5);
          g.fillStyle = 'rgb(18,24,34)'; g.fillRect(x+5, h-hh+10, 36, hh-18);
          for (let y=h-hh+14; y<h-12; y+=7){ g.fillStyle = 'rgb(34,44,58)'; g.fillRect(x+7, y, 32, 4);
            const r = rnd(); g.fillStyle = r<0.5? 'rgb(150,220,240)' : r<0.6? 'rgb(232,170,90)' : 'rgb(50,64,80)'; g.fillRect(x+9+((rnd()*22)|0), y+1.2, 3.4, 1.6); }
          m5Hatch(g, x+5, h-hh+10, 36, hh-18, 5, 'rgba(120,150,170,0.10)'); }
        g.fillStyle = 'rgb(48,60,76)'; g.fillRect(0, 18, w, 7); g.fillStyle = 'rgb(30,38,50)'; g.fillRect(0, 25, w, 3);                    // chemin de câbles
        g.strokeStyle = 'rgb(24,30,40)'; g.lineWidth = 2.4; g.beginPath(); for (let x=20; x<w; x+=90+rnd()*60){ const d = 20+rnd()*46; g.moveTo(x,26); g.quadraticCurveTo(x+12, 26+d, x+30, 26); } g.stroke();
        g.strokeStyle = 'rgb(60,74,92)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0,h-150); g.lineTo(w,h-150); for (let x=0; x<w; x+=22){ g.moveTo(x,h-150); g.lineTo(x,h-138); } g.stroke(); g.fillStyle = 'rgb(48,60,76)'; g.fillRect(0, h-139, w, 3); } },
    // ----- acte III : le noyau -----
    { par:0.03, w:1024, h:330, off:4, a:m5A(3), paint(g, w, h, rnd){                        // l'anneau, parfait, sur une trame de points
        g.fillStyle = 'rgba(40,64,86,0.22)'; for (let y=6; y<h; y+=9) for (let x=(y%18? 4 : 8.5); x<w; x+=9) g.fillRect(x, y, 1.6+((y/h)*1.6), 1.6+((y/h)*1.6));
        g.strokeStyle = 'rgb(28,36,46)'; g.lineWidth = 9; g.beginPath(); g.arc(700, h-170, 118, 0, 6.283); g.stroke();
        g.lineWidth = 1.6; g.beginPath(); g.arc(700, h-170, 148, 0, 6.283); g.stroke(); g.beginPath(); g.arc(700, h-170, 86, 0, 6.283); g.stroke();
        g.fillStyle = 'rgb(28,36,46)'; g.fillRect(696, h-52, 8, 52); g.fillRect(660, h-8, 80, 8); } },
    { par:0.22, w:1024, h:230, off:6, a:m5A(3), paint(g, w, h, rnd){                        // monolithes noirs, arêtes blanches, perspective du sol
        let x = 10; while (x < w-40){ const bw = 18+rnd()*46, bh = 60+rnd()*160, tilt = (rnd()-0.5)*14;
          g.fillStyle = rnd()<0.5? 'rgb(18,23,30)' : 'rgb(30,38,48)'; g.beginPath(); g.moveTo(x,h); g.lineTo(x+tilt,h-bh); g.lineTo(x+tilt+bw,h-bh+rnd()*18); g.lineTo(x+bw,h); g.closePath(); g.fill();
          g.strokeStyle = 'rgb(240,248,252)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x,h); g.lineTo(x+tilt,h-bh); g.stroke();
          g.fillStyle = 'rgba(160,226,244,0.8)'; for (let y=h-bh+10; y<h-8; y+=13) if (rnd()<0.4) g.fillRect(x+tilt*(1-(h-y)/bh)+4, y, bw*0.5*rnd()+3, 1.4);
          x += bw + 20 + rnd()*90; } } },
  ],
  sky2(vw, t){ const a = m5Act();
    if (a===1){ const sx = vw*0.26 - camX*0.012;                                           // soleil rouge sous la cendre, bancs de fumée
      ctx.fillStyle = 'rgba(214,96,60,0.9)'; ctx.beginPath(); ctx.arc(sx, 118, 20, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(74,60,56,0.42)'; for (let i=0;i<5;i++){ const cx = ((i*330 + t*7 - camX*0.03) % (vw+500) + vw+500) % (vw+500) - 250; ctx.beginPath(); ctx.ellipse(cx, 50+i*27, 210, 11+i*2, 0, 0, 6.283); ctx.fill(); } }
    if (a===2) return;
    // le ciel « saute » : bandes décalées et blocs froids (rares à l'acte I, autour de la tour ; partout à l'acte III)
    const q = Math.floor(t*(a===3? 9 : 5)), n = a===3? 9 : 2, h1 = k => { const v = Math.sin((q*12.9898 + k*78.233))*43758.5453; return v - Math.floor(v); };
    for (let i=0;i<n;i++){ if (a===1 && h1(i+40)>0.35) continue;
      const y = h1(i)*(GROUND-140), bh = 3+h1(i+10)*(a===3? 26 : 8), x = a===3? h1(i+20)*vw*0.7 : vw*0.5 + (h1(i+20)-0.5)*260 - camX*0.05, bw = 80+h1(i+30)*(a===3? 420 : 120);
      ctx.fillStyle = ['rgba(246,252,255,0.85)','rgba(120,214,240,0.55)','rgba(16,22,30,0.55)'][(h1(i+50)*3)|0]; ctx.fillRect(x, y, bw, bh);
      if (a===3 && h1(i+60)<0.4){ ctx.fillStyle = 'rgba(16,22,30,0.7)'; for (let k=0;k<5;k++) ctx.fillRect(x+k*17+h1(i+k)*8, y+bh+2, 9, 9); } }
  },
  front(t){ const a = m5Act();
    if (a===1) fxSnow(t, 80, 'rgba(58,46,42,0.7)', 34, 26);                                 // cendres
    else if (a===2){ ctx.fillStyle = 'rgba(150,214,236,0.5)'; for (let i=0;i<22;i++){ const x = (i*211.7 + Math.sin(t*0.3+i)*20) % W, y = (i*97.1 + t*6*(1+i%3)) % H; ctx.fillRect(x, y, 1.2, 1.2); } }   // poussière dans les rampes
    else { const q = Math.floor(t*8), hh = k => { const v = Math.sin(q*91.7+k*37.1)*9973.1; return v-Math.floor(v); };       // déchirures d'écran
      for (let i=0;i<3;i++) if (hh(i)<0.5){ ctx.fillStyle = i? 'rgba(246,252,255,0.5)' : 'rgba(120,214,240,0.35)'; ctx.fillRect(0, hh(i+5)*H*0.7, W, 1+hh(i+9)*3); } }
  },
};
// « citadel » : l'hymne des nôtres (MEL_RED), ralenti de moitié et abîmé — une seule voix grave à l'acte I,
// un pouls et une ombre un demi-ton au-dessus à l'acte II, le chœur, la marche et des bégaiements à l'acte III.
MUSIC_THEMES.citadel = { bpm:66, step(st, t, d, s){
  const a = m5Act(), bar = (st>>4)%8, s8 = st%8, ch = CH_RED[bar], mn = st%2? 0 : MEL_RED[(st>>1) % MEL_RED.length];
  if (st%16===0){ tone(m2f(ch[0]-24), t, d*16, 'sine', .08, 0, d); tone(m2f(ch[0]-12)+0.6, t, d*16, 'sawtooth', .012, 0, d*4, 380); }
  if (mn){ tone(m2f(mn-12), t, d*3.4, 'sawtooth', .030, -1.5, d*0.3, 700+a*260); tone(m2f(mn-24), t, d*3, 'triangle', .030, 0, d*0.3);
    if (a>=2) tone(m2f(mn-11), t+d*0.5, d*2.4, 'sine', .010+.004*a, 0, d*0.4);                         // l'ombre : un demi-ton au-dessus, en retard
    if (a>=3){ tone(m2f(mn), t, d*3, 'triangle', .034, 0, d*0.4); if ((st>>1)%8===7) for (let k=1;k<4;k++) tone(m2f(mn-12), t+k*d*0.25, d*0.2, 'square', .012, 0, 0, 1800); } }
  if (a>=2 && s8%2===0) tone(m2f(ch[0]-12), t, d*0.8, 'sine', .05, -4);                                // pouls
  if (a>=2 && s8%4===3) noise(t, .02, .010, 6400);
  if (a>=3){ if (s8%4===0) tone(110, t, .2, 'sine', .11, -60); if (s8===4) noise(t, .1, .035, 1300);
    if (st%16===0) for (const n of ch) tone(m2f(n+12), t, d*15, 'triangle', .013, 0, d*4); }
  if (a===1 && st%32===24) noise(t, d*5, .012, 300);
} };

/* ---------- personnages : voix et portraits (64×64, encre sur papier) ---------- */
CINE_WHO.malik = { name:'MALIK · LES CANUTS', ink:'#8a3a1c' };
CINE_WHO.cell = { name:M5T(`UNE CELLULE`, `A CELL`, `UNA CÉLULA`, `EINE ZELLE`, `UNA CELLULA`, `UMA CÉLULA`, `ЯЧЕЙКА`, `小组`, `خلية`), ink:'#4a5a3a' };
if (!CINE_WHO.nar2) CINE_WHO.nar2 = { name:null, ink:'#1f1b17' };          // la personne qui a retrouvé les carnets (prologue, fin « Cendre »)
CINE_PORTRAITS.malik = g => {                                            // chef des sapeurs des Canuts : casquette, foulard rouge, vingt ans
  inkWash(g, [8,64, 12,51, 24,45, 40,45, 52,51, 56,64], '#3d4a3a', 0.9);
  inkWash(g, [21,46, 32,55, 43,46, 42,41, 22,41], '#c42a1c', 0.95);
  g.fillStyle = '#b98a62'; g.beginPath(); g.ellipse(32, 29, 11, 13, 0, 0, 6.283); g.fill();
  g.fillStyle = '#23272e'; g.beginPath(); g.ellipse(32, 19, 13, 8, 0, 3.14, 6.283); g.fill(); g.beginPath(); g.moveTo(19,19); g.lineTo(49,19); g.lineTo(53,22.5); g.lineTo(19,22.5); g.closePath(); g.fill();
  g.fillStyle = '#1f1b17'; g.fillRect(26.4,27.4,2.2,2.2); g.fillRect(35.4,27.4,2.2,2.2);
  inkLine(g, [24,25, 30,24.4], 1, 1.2); inkLine(g, [34,24.4, 40,25], 1, 1.2); inkLine(g, [28,36, 32,37.6, 37,35.4], 1, 1.2);
  inkHatch(g, 36, 23, 8, 16, 3, '#1f1b17', 0.2); inkLine(g, [44,45, 50,38, 50,30], 1, 1.4);          // la bretelle du fusil
};
CINE_PORTRAITS.cell = g => {                                             // une cellule : trois visages de profil et un fanion
  inkWash(g, [0,64, 0,52, 64,52, 64,64], '#3d4a3a', 0.5);
  for (const [x,s,col] of [[16,22,'#c8a07a'],[32,28,'#e2c4a2'],[48,22,'#b98a62']]){
    inkWash(g, [x-s*0.34,56, x-s*0.3,40+(28-s)*0.5, x+s*0.3,40+(28-s)*0.5, x+s*0.34,56], '#4a5a3a', 0.9);
    g.fillStyle = col; g.beginPath(); g.arc(x, 34+(28-s)*0.5, s*0.3, 0, 6.283); g.fill();
    g.strokeStyle = '#1f1b17'; g.lineWidth = 1; g.beginPath(); g.arc(x, 34+(28-s)*0.5, s*0.3, 0, 6.283); g.stroke(); }
  inkLine(g, [32,34, 32,6], 1, 1.4); inkWash(g, [32,6, 50,10, 32,16], '#c42a1c', 0.95);
};

/* ================= MÉCANIQUES ================= */
const m5C = () => { const c = game && game.camp; return c && c.i===4? c : null; };
const m5Fmt = (o, v) => { let s = cT(o); for (const k in v) s = s.split('{'+k+'}').join(v[k]); return s; };
const m5Sin = (a, b) => Math.sin(a*12.9898 + b*78.233)*43758.5453;                                     // hasard déterministe pour le dessin
const m5Rnd = (a, b) => { const v = m5Sin(a, b); return v - Math.floor(v); };
const M5_NAMES = [['Fructidor','Les Canuts','Sainte-Aube','Les Tanneurs','La Halle'], ['Brumaire','La Halle','Fructidor','Les Tanneurs','Les Canuts'], ['Sainte-Aube','Les Canuts','La Halle','Les Tanneurs','Thermidor']];
function m5CellName(c, idx){ const n = M5.cells[c.D.i][c.act-1]; if (c.act===3 && idx===n-1) return 'Thermidor'; return M5_NAMES[c.act-1][idx % 5]; }

/* ---------- les cellules : arrivée seule, ou sur appel ---------- */
function m5Cell(g, c){
  if (!(c.cellsLeft > 0)) return false;
  const p = g.p, a = c.act, pat = M5_CELL[a-1], n = c.cellN%2? 4 : 5, name = m5CellName(c, c.cellN);
  for (let i=0;i<n;i++){ if (unitTotal(p) >= p.cap+6) break; spawnUnit(p, pat[(i + c.cellN) % pat.length], false, p.x + 80 + i*16); }   // la cellule arrive même si nos rangs sont pleins
  p.f += 160; p.m += 120; p.w += 60;
  addFloater(p.x+110, gY(p.x)-118, m5Fmt(M5_TX.cellTag, {name}), '#e8d8a0', 14); addFloater(p.x+110, gY(p.x)-100, '+160 · +120 · +60 💧', '#9dc88a', 12);
  sfx('evolve');
  if (a===1) m5Sapper(g, c);
  if (a===2) c.proj.push({ x:Math.min(p.x + 520 + c.cellN*140, 2300), t:c.t });                          // « on a apporté des lampes »
  c.cellN++; c.cellsLeft--; c.cellT = c.t + M5.gap[c.D.i];
  if (c.cellsLeft <= 0) c.dry = c.t;
  return true;
}
// les sorties : une colonne quitte la base adverse et fonce sur notre camp ; plus on attend, plus elle grossit
function m5SortieN(c){ const a = c.act, at = c.t - c.t0; let n = [3,6,10][a-1] + Math.floor(at/200);
  if (c.dry!=null) n += Math.min(8, Math.floor((c.t - c.dry)/60)*2);                                                  // cellules épuisées : +2 machines par minute
  return Math.min(n, 14); }
function m5Scale(g, c){ const k = M5.eMul[c.act-1]*(c.act===2? M5.eMulII[c.D.i] : 1);                                                      // des machines montées à la hâte, sans rodage
  for (const u of g.e.units) if (!u.m5 && u.role!=='hero'){ u.m5 = 1; u.hp *= k; u.maxhp *= k; u.dmg *= k; } }
function m5Sortie(g, c){
  if (g.e.units.length >= 44) return;
  campWave(m5SortieN(c)); sfx('deny');
  addFloater(g.e.x-40, gY(g.e.x)-120, cT(M5_TX.sortie), '#9fd6ea', 13);
}

/* ---------- acte I : les sapeurs, les charges, les batteries, la porte ---------- */
function m5Sapper(g, c){
  const id = ++c.sapId, s = { id, x:g.p.x + 64, hp:0, maxhp:0, plant:0, k:id%5, step:0 };
  s.hp = s.maxhp = unitStats(g.p, 1).hp*1.6;                                                                 // PV d'un Tank de l'ère
  c.saps.push(s); c.sapOut++;
}
function m5Plant(g, c, s){
  c.charges++; sfx('cap'); burst(s.x, gY(s.x)-24, '#e8c070', 10, 0.8);
  addFloater(s.x, gY(s.x)-70, m5Fmt(M5_TX.charge, { a:c.charges, b:M5.need[c.D.i] }), '#e8c070', 14);
  if (c.charges < M5.need[c.D.i]) campRadio('malik', M5_L.a3, { vars:{ n:M5.need[c.D.i] - c.charges } });
}
function m5Saps(g, c, dt){
  const gx = M5.gateX;
  for (let i=c.saps.length-1;i>=0;i--){ const s = c.saps[i];
    if (s.hp <= 0){ explode(s.x, gY(s.x)-14, 0.9, '#e8c070'); addFloater(s.x, gY(s.x)-60, '✖', '#e0533f', 15); c.saps.splice(i,1); c.sapLost++; c.sapLostAt = c.t; (c.sapDeaths = c.sapDeaths||[]).push(Math.round(s.x)+'@'+Math.round(c.t)); continue; }
    if (s.plant > 0){ s.plant -= dt; if (s.plant <= 0){ m5Plant(g, c, s); c.saps.splice(i,1); } continue; }
    if (g.p.stance==='retreat') continue;                                                                // Replier : les sapeurs attendent
    if (g.e.units.some(u => !u.fly && u.hp>0 && u.x > s.x && u.x - s.x < 120)) continue;                 // une machine devant : le sapeur s'arrête et attend qu'on la dégage
    const lim = gx - 84 - s.k*7;
    s.x = Math.min(lim, s.x + M5.sapSpd*dt); s.step += dt*M5.sapSpd;
    if (s.x >= lim-0.5) s.plant = M5.sapPlant;
  }
  // plus de cellule en route et trop peu de sapeurs pour les charges restantes : Malik envoie son dernier sapeur
  if (c.cellsLeft<=0 && !c.gateOpen && !c.firing && c.charges + c.saps.length < M5.need[c.D.i] && c.reserve < 12){
    if (c.resT==null) c.resT = c.t + 25 + 10*c.reserve;
    if (c.t >= c.resT){ c.resT = null; c.reserve++; m5Sapper(g, c); campRadio('malik', M5_L.res); } }
}
function m5Batts(g, c, dt){
  const k = [0.85,1,1.0][c.D.i];
  for (const b of c.batt){ if (b.dead) continue;
    if (b.hp <= 0){ b.dead = true; explode(b.x, gY(b.x)-70, 1.7, '#ffb060'); burst(b.x, gY(b.x)-70, '#3a3028', 16, 1.4); sfx('boom'); g.shake = Math.max(g.shake, 8); c.battDown++; continue; }
    b.atkT -= dt; if (b.atkT > 0) continue;
    let tg = null, best = 1e9, isS = false;
    for (const s of c.saps){ const d = Math.abs(s.x - b.x); if (s.hp>0 && d < M5.battR && d < best){ best = d; tg = s; isS = true; } }      // elles visent d'abord les sapeurs
    if (!tg) for (const u of g.p.units){ const d = Math.abs(u.x - b.x); if (u.hp>0 && d < M5.battR && d < best){ best = d; tg = u; } }
    if (!tg){ b.atkT = 0.3; continue; }
    b.atkT = 1;
    tg.hp -= isS? tg.maxhp*0.02*k : 22*(1 + g.e.era*0.6)*k; if (!isS) tg.flash = 0.15;
    shots.push({ x:b.x, y:gY(b.x)-82, tx:tg.x, ty:gY(tg.x)-(isS? 18 : tg.fly? 24+(tg.flyH||40) : 22), t:0, dur:0.22, fac:'IA', era:g.e.era });
  }
}
// cibles de mission : nos sapeurs (pour leurs machines), leurs batteries (pour les nôtres)
function m5Targets(c, foe, out){
  const g = game;
  if (foe === g.p){ for (const s of c.saps) if (s.hp>0) out.push({ isB:true, sap:1, x:s.x, get hp(){ return s.hp; }, hit(d){ s.hp -= d; } }); }
  else if (c.act===1){ for (const b of c.batt) if (!b.dead && b.hp>0) out.push({ isB:true, batt:1, x:b.x, get hp(){ return b.hp; }, hit(d){ b.hp -= d; } }); }
}
// Tenir : nos troupes se placent devant le sapeur de tête (comme le service d'ordre de la mission II)
const M5_LANE = { tank:175, melee:150, hero:160, ranged:100, air:100, siege:70, support:50 };
function m5Form(g, c){
  const p = g.p, st = p.stance; if (!c.saps.length) return;
  let head = 0; for (const s of c.saps) if (s.hp>0 && s.x > head) head = s.x;
  let foe = 1e9; for (const u of g.e.units) if (!u.fly && u.hp>0 && u.x > head-30 && u.x < foe) foe = u.x;
  const cap = Math.min(M5.gateX-110, foe-22), cnt = {};
  for (const u of p.units){
    const mine = u._m5f && u.ord==='point' && u.px===u._m5px;
    if (u.role==='hero' || u.task) continue;
    if (st!=='hold'){ if (mine){ u.ord = null; u.px = null; u._m5f = 0; } continue; }
    if (u.ord && !mine) continue;                                                                        // ordre explicite du joueur : on n'y touche pas
    const k = cnt[u.role] = (cnt[u.role]||0) + 1;
    const want = Math.max(head+30, Math.min(head + (M5_LANE[u.role]||100) - ((k-1)%6)*9 - ((k-1)/6|0)*5, cap));
    u.ord = 'point'; u.px = u._m5px = want; u._m5f = 1;
  }
}

/* ---------- acte II : le noir, les baies, les vannes ---------- */
function m5Lit(x, big){ const c = m5C(); if (!c) return true; for (const L of c.lights){ if (big && !L.big) continue; if (Math.abs(L.x-x) < L.r*0.82) return true; } return false; }
function m5Light(g, c){
  const Ls = c.lights; Ls.length = 0; if (c.act!==2) return;
  Ls.push({ x:g.p.x+40, r:330, big:1 });                                                                 // la brèche : projecteurs
  Ls.push({ x:g.e.x-30, r:230, a:0.8 });                                                                 // la porte du noyau, cerclée de lumière
  for (const z of g.zones) if (z.owner!=='p') Ls.push({ x:z.x, r:220, big:1, a:0.95 });                  // une baie qui tourne éclaire en bleu
  for (const q of c.proj) if (c.t - q.t < 70) Ls.push({ x:q.x, r:250, big:1, a:Math.min(1, (70-(c.t-q.t))/12) });   // projecteurs des cellules
  for (const s of sideBuildSlots(g.p)) if (s.b && s.b.type==='turret' && s.b.gar && s.b.gar.length) Ls.push({ x:s.x, r:150 });
  let n = 0; const first = Ls.length;
  for (const u of g.p.units){ if (n>=16) break; let near = false; for (let i=first;i<Ls.length;i++) if (Math.abs(Ls[i].x-u.x)<56){ near = true; break; }
    if (!near){ Ls.push({ x:u.x, r:u.role==='hero'? 170 : 104 }); n++; } }                              // la lampe de chaque groupe
  for (let i=LIGHTS.length-1, j=0; i>=0 && j<8; i--, j++){ const L = LIGHTS[i]; Ls.push({ x:L.x, y:L.y, r:L.r*0.9, a:1-L.t/L.life }); }
}
function m5Halls(g, c, dt){
  const D = c.D.i, e = g.e;
  if (!c.zProg) c.zProg = g.zones.map(z=>z.prog);
  g.zones.forEach((z,i)=>{ const pr = c.zProg[i];                                                           // Dernier carré : une baie se prend plus lentement (l'acte tenait ≈ 1 min)
    if (M5.capK[D]<1 && z.prog>pr && z.prog<1) z.prog = pr + (z.prog-pr)*M5.capK[D];
    c.zProg[i] = z.prog; });
  g.zones.forEach((z,i)=>{ const was = c.zo[i];
    if (D===0 && was==='p' && z.owner!=='p'){ z.owner = 'p'; z.prog = 1; }                                   // Récit (v1.18) : une baie éteinte ne se rallume plus (l'acte II durait 20 à 30 min)
    if (z.owner!==was){
      if (z.owner==='p'){ c.offN++; sfx('node'); g.shake = Math.max(g.shake, 5); addFloater(z.x, gY(z.x)-112, cT(M5_TX.bayOff), '#9fd6ea', 14); }       // son coupé net
      else if (was==='p'){ c.relaunchN++; sfx('deny'); addFloater(z.x, gY(z.x)-112, cT(M5_TX.bayOn), '#e0533f', 14); c.bayT[i] = 6; }
      c.zo[i] = z.owner; } });
  c.owned = g.zones.reduce((n,z)=> n + (z.owner==='p'? 1 : 0), 0);
  if (c.owned>=3 && c.hallsAt==null) c.hallsAt = c.t - c.t0;
  g.zones.forEach((z,i)=>{ if (z.owner==='p') return;                                                    // une baie qui tourne imprime une machine
    if ((c.bayT[i] -= dt) > 0) return; c.bayT[i] = M5.bay[D];
    if (e.units.length >= 44) return;
    spawnUnit(e, [0,2,1,0,2,3,0,4][(c.printN++)%8], false, z.x + 34); e.units[e.units.length-1].ord = 'charge';
    burst(z.x+24, gY(z.x)-40, '#9fd6ea', 8, 0.8); });
  for (const o of c.objs) if (o.owner==='p') g.p.w += 2.2*dt;                                            // vannes de refroidissement : +2,2 💧/s
  c.shield = c.owned<3? { label:M5_TX.shield2, x:e.x-30 } : null;
}
// les machines cachées dans le noir, près de nous (pour le conseil de Sol)
function m5Hidden(g, c){ for (const u of g.e.units) if (c.hidden(u) && Math.abs(u.x - campFront(g)) < 520) return true; return false; }

/* ---------- acte III : l'avatar, la tour, les réécritures ---------- */
function m5Avatar(g, c, frac){
  const e = g.e, D = c.D.i; spawnHero(e, 1);
  const u = e.units[e.units.length-1]; if (!u || u.role!=='hero') return null;
  u.maxhp *= M5.av[D]*M5.avK; u.hp = u.maxhp*(frac||1); if (c.D.eDmg) u.dmg *= c.D.eDmg;
  u._cd = 1; u.m5 = 1; u.heroPow = M5.aura[D]; u.x = e.x - 40; u.era = e.era;
  e.heroCd = 1e9; e.heroStance = 'offensive'; c.avatar = u; c.avHalf = false; c.avDown = false;
  return u;
}
const m5AvAlive = (g, c) => !!(c.avatar && c.avatar.hp > 0 && g.e.units.includes(c.avatar));
function m5Rewrite(g, c, dt){
  const p = g.p, D = c.D.i;
  if (!c.rw){
    if (c.t < c.nextRw) return;
    let bx = null, bn = 0;                                                                                // la bande se centre sur notre plus gros groupe
    for (const u of p.units){ if (u.x < p.x+240) continue; let n = 0; for (const v of p.units) if (Math.abs(v.x-u.x) < M5.rwW/2) n++;
      if (n > bn || (n===bn && u.x > bx)){ bn = n; bx = u.x; } }
    if (bx==null){ c.nextRw = c.t + 4; return; }
    c.rw = { x:clamp(bx, p.x+200, g.e.x-200), t:0, warn:M5.rwWarn[D] + (c.warnLead||0), done:false }; c.rwCount++; sfx('deny');
    return; }
  const r = c.rw; r.t += dt;
  if (!r.done && r.t >= r.warn){
    r.done = true; g.flash = Math.max(g.flash||0, 0.7); g.shake = Math.max(g.shake, 10); sfx('boom'); let hit = 0;
    for (const u of p.units) if (Math.abs(u.x - r.x) < M5.rwW/2){ hit++;
      u.hp = Math.max(u.maxhp*0.1, u.hp - u.maxhp*0.4); u.x = p.x + 50 + Math.random()*90; u.tx = u.x; u.px = null; if (u.ord==='point' || u.ord==='hold') u.ord = null; u.flash = 0.5; u.task = null;   // renvoyé au camp, 40 % de PV en moins
      burst(u.x, gY(u.x)-24, '#eef6fa', 6, 0.8); }
    if (hit) c.rwHit++; }
  if (r.done && r.t >= r.warn + 0.8){ c.rw = null; c.nextRw = c.t + M5.rwGap[D]; }
}

/* ================= LES ACTES : entrée, bilan, point de reprise, passage ================= */
let M5_CK = null;                                         // point de reprise (début d'acte) : Récit et Lutte seulement
const M5_ERA = [2, 3, 3];                                 // ère minimale de chaque acte (III, IV, IV)
const M5_MAPS = [
  { terrain:{ a:30, f1:0.002618, b:3, f2:0.0113, c:1.5, f3:0.021, base:4 }, p:{ x:150 }, e:{ x:M5.gateX, slots:[] }, neut:[1200,1800], nodes:[], zones:[] },        // le mur : un glacis de 30 px avant la porte
  { terrain:{ a:0, f1:0.0042, b:2, f2:0.0113, c:1, f3:0.021, base:3 }, p:{ x:150 }, e:{ x:M5.gateX, slots:[] }, neut:[900,2200], nodes:[], zones:[1224,1872,2520],  // les halles : dalles planes, trois baies
    objects:[ { id:'valveA', x:1550, r:80, rate:0.1 }, { id:'valveB', x:2200, r:80, rate:0.1 } ] },
  { terrain:{ a:0, f1:0.0042, b:3, f2:0.0113, c:1.5, f3:0.021, base:3 }, p:{ x:150 }, e:{ x:M5.gateX, slots:[] }, neut:[1300,2300], nodes:[], zones:[] },              // le noyau : le sol qui luit
];
function m5Guard(g, c){                                    // la garde de la porte : quelques machines qui tiennent le pied du mur
  const e = g.e, n = campN([3,8,10][c.act-1]), k0 = e.units.length;
  for (let i=0;i<n;i++) spawnUnit(e, [1,2,0,2,3][i%5], false, e.x - 70 - i*22);
  for (let j=k0;j<e.units.length;j++){ const u = e.units[j]; u.ord = 'hold'; u.holdX = u.x; }
  if (c.act===2) for (const z of g.zones){ const k1 = e.units.length;                                  // des machines gardent chaque baie : il faut les en chasser
    for (let i=0;i<campN(3);i++) spawnUnit(e, [0,2,1][i%3], false, z.x + 40 + i*20);
    for (let j=k1;j<e.units.length;j++){ const u = e.units[j]; u.ord = 'hold'; u.holdX = u.x; } }
  if (c.act===3){ const k1 = e.units.length; for (let i=0;i<campN(6);i++) spawnUnit(e, [1,2,0,3,2,4][i%6], false, e.x - 200 - i*24); for (let j=k1;j<e.units.length;j++){ const u = e.units[j]; u.ord = 'hold'; u.holdX = u.x; } }
}
// entrée dans l'acte a : tout ce qui est remis à zéro (les cartes, l'ère et la forge sont posées par le moteur / le point de reprise)
function m5Init(g, c, a, carry){
  const p = g.p, e = g.e, D = c.D.i;
  c.act = a; c.cellN = 0; c.cellsLeft = M5.cells[D][a-1]; c.cellT = c.t + M5.first; c.dry = null;
  c.sortieT = c.t + M5.sortie[D]*0.85; c.sortieWarned = false;
  c.saps = []; c.sapId = 0; c.sapOut = 0; c.sapLost = c.sapLost||0; c.sapLostAt = -99; c.charges = 0; c.reserve = 0; c.resT = null; c.firing = null; c.gateOpen = false;
  c.batt = a===1? M5.wallX.map((x,i)=>({ x, hp:M5.battHp[D], maxhp:M5.battHp[D], atkT:2+i, dead:false })) : [];
  c.battDown = 0;
  c.proj = []; c.bayT = [11, 16, 21].map(x=>x*(D===2? 0.8 : 1)); c.zo = g.zones.map(z=>z.owner); c.offN = 0; c.relaunchN = 0; c.owned = 0; c.printN = 0;
  c.rw = null; c.nextRw = c.t + 28; c.rwCount = 0; c.rwHit = 0; c.avatar = null; c.avBack = null; c.avBackN = 0; c.avFell = false;
  c.lastE = e.hp; c.lifeSaid = false; c.shield = a===1? { label:M5_TX.shield1, x:e.x-30 } : a===2? { label:M5_TX.shield2, x:e.x-30 } : null;
  c.leash = null; c.mark = null; c.demoRw = null;
  c.targets = (foe, out) => m5Targets(c, foe, out);
  c.homeK = u => u.side===-1? 0 : 1;                                                                   // les défenseurs de la citadelle ne sont pas chez eux
  c.hidden = u => c.act===2 && u.side===-1 && !m5Lit(u.x);
  c.rangeMul = u => { if (c.act!==2 || u.side!==1 || !(u.range>60)) return 1;                           // dans le noir : on ne tire pas sur ce qu'on ne voit pas
    let best = 1e9, tg = null; for (const f of g.e.units){ const dx = f.x-u.x; if (dx>-12 && dx<best){ best = dx; tg = f; } }
    if (tg && c.hidden(tg)) return 0.001;
    return m5Lit(u.x, true)? 1 : M5.dim[D]; };
  // camp neuf : ce que le moteur ne remet pas à zéro tout seul
  p.phase = 1; p.lastSeen = p.lastReady = p.lastUsed = false; p.specialCd = 0; p.autoRepair = false; p.siegeT = 0; p.holdX = null; p.stance = 'charge'; p.queue.length = 0; p.cd = [0,0,0,0,0,0];
  p.maxhp = campHp(M5.hp.base, 'p'); p.hp = p.maxhp; p.fortLvl = 1;
  e.phase = 2; e.lastSeen = e.lastReady = e.lastUsed = true; e.heroCd = 1e9; e.f = e.m = e.w = 0; e.slots = []; e.mode = 'build'; e.fortLvl = 1; e.specialCd = M5.spCd[D]; c.eSp = e.specialCd;
  e.maxhp = campHp(M5.hp.gate[a-1], 'e'); e.hp = e.maxhp; c.lastE = e.hp;
  g.hbombDone = a < 3; g.winter = false; g.winterT = 0; g.cata = null; g.cataT = 0;                       // la bombe H et les cataclysmes : à l'acte III seulement
  g.cataCd = a < 3? 1e9 : 55 + Math.random()*40;
  g.weather = null;
  e.era = Math.min(a===1? 2 : a===2? 3 : 4, p.era + 1);
  if (carry){                                                                                           // reprise : l'état exact d'entrée de l'acte
    Object.assign(p.upg, carry.upg); p.capUp = carry.capUp; if (p.capUp) p.cap = 40; p.heroCd = carry.heroCd;
    if (carry.heroAlive) spawnHero(p, 1); }
  { const R = c.refund = carry && carry.refund? carry.refund : c.nextRefund || { n:0, f:0, m:0, w:0 };    // remboursement des survivants de l'acte précédent
    const k = carry && carry.resume? (campDoc(4) && campDoc(4).fx.res || 1) : 1;                        // (en reprise, la doctrine est appliquée après : on compense)
    p.f += R.f/k; p.m += R.m/k; p.w += R.w/k; }
  c.nextRefund = null;
  m5Guard(g, c); m5Scale(g, c);
  if (a===3) m5Avatar(g, c, 1);
  c.shield && (c.shield.x = e.x-30);
  c.goalTxt = M5_TX['g'+a];
  c.ruleTxt = m5Rule(c, a); c.tipsArr = [M5_TX.tips[a-1]];
  c.fired = c.fired || [];
  m5Light(g, c); m5Save(g, c);
}
function m5Rule(c, a){ const D = c.D.i, o = {};
  for (const L of LANG_CODES) o[L] = a===1? M5_TX.rule1[L] : a===2? M5_TX.rule2[L].replace('{dim}', campPct(M5.dim[D])) : M5_TX.rule3[L].replace('{n}', M5.rwGap[D]).replace('{w}', M5.rwWarn[D] + (c.warnLead||0));
  return o; }
// point de reprise : l'ère, la forge, le héros et le remboursement tels qu'ils étaient à l'entrée de l'acte
function m5Save(g, c){
  const p = g.p, h = p.units.some(u=>u.role==='hero');
  M5_CK = { act:c.act, d:c.D.i, doc:CAMP_SAVE.doc[4]? 1 : 0, era:p.era, xp:p.xp, upg:Object.assign({}, p.upg), capUp:!!p.capUp, heroAlive:h, heroCd:p.heroCd||0,
    refund:c.refund || { n:0, f:0, m:0, w:0 }, fail:false };
  if (c.D.i===2) M5_CK = null;                                                                          // Dernier carré : aucune reprise, la mission recommence
}
// bilan de fin d'acte : les survivants gardent la brèche et rapportent 25 % de leur coût (au plus 300 de chaque)
function m5Bilan(g, c){
  const p = g.p, list = p.units.filter(u => u.role!=='hero' && u.role!=='gremlin');
  for (const s of sideBuildSlots(p)) if (s.b && s.b.gar) for (const u of s.b.gar) list.push(u);
  for (const u of p.gar) list.push(u);
  const R = { n:list.length, f:0, m:0, w:0 };
  for (const u of list){ const ri = ROLES.findIndex(r => r.key===u.role); if (ri<0) continue; const cost = ROLES[ri].cost, k = costMul(u.era!=null? u.era : p.era)*M5.refund;
    for (const r of ['f','m','w']) if (cost[r]) R[r] += cost[r]*k; }
  for (const r of ['f','m','w']) R[r] = Math.min(M5.refundMax, Math.round(R[r]));
  return R;
}
function m5BilanTxt(c){ const R = c.bilan || { n:0, f:0, m:0, w:0 }; return m5Fmt(M5_TX.bilan, R); }
// fiche d'acte pour campNextAct (a = nouvel acte) ; ck : point de reprise (reprise = on n'a pas de cinématique à jouer)
function m5ActSpec(g, c, a, ck){
  const p = g.p, era0 = ck? ck.era : p.era, era = Math.max(era0, M5_ERA[a-1]), xp0 = ck? ck.xp : p.xp;
  const D = c.D.i, dot = M5.dot[a-1];
  return { act:a, title:a===2? M5_L.t3t : M5_L.t9t, sub:a===2? M5_L.t3s : M5_L.t9s, card:{ plate:M5_PLATES.door(a), mus:a===2? 'm_citadel' : 'm_finale' },
    before:(g, c) => ck? [] : m5CineBefore(g, c, a), after:(g, c) => ck? [] : m5CineAfter(g, c, a),
    biome:'citadel', theme:'citadel'+a, map:M5_MAPS[a-1],
    army:{ keep:0, hero:true }, heal:1,                                                                  // les survivants restent à la brèche ; le héros suit, en pleine forme
    res:{ f:M5.dot[a-1][0], m:M5.dot[a-1][1], w:M5.dot[a-1][2] }, era:{ p:era }, xp:era>era0? Math.max(xp0, EVOLVE_XP[era]) : xp0, eraCap:4,
    buildings:'clear', base:{ x:150, hp:M5.hp.base, fort:1 }, ebase:{ x:M5.gateX, hp:M5.hp.gate[a-1], fort:1 },
    enemy:'clear', goal:ck? null : M5_TX['g'+a], doctrine:!ck,
    setup:(g, c) => m5Init(g, c, a, ck? { upg:ck.upg, capUp:ck.capUp, heroAlive:ck.heroAlive, heroCd:ck.heroCd, refund:ck.refund, resume:true } : null) };
}
// la porte (acte I) ou la porte du noyau (acte II) cède : bilan, cinématique, camp neuf
function m5Next(g, c){
  const a = c.act; if (a>=3 || c.actPending) return;
  c.bilan = m5Bilan(g, c); c.nextRefund = c.bilan; (c.nextInfo = c.nextInfo||[]).push('a'+a+'@'+Math.round(c.t)+' hp'+Math.round(g.e.hp)+'/'+Math.round(g.e.maxhp)+' lastE'+Math.round(c.lastE)+' owned'+c.owned);
  g.e.hp = 1; c.lastE = 1; g.shake = 14; sfx('evolve');
  campNextAct(m5ActSpec(g, c, a+1));
}
// Récit et Lutte : après un échec, on reprend au début de l'acte où l'on est tombé
function m5Resume(g, c){
  const ck = M5_CK; if (!ck || !ck.fail || ck.d!==c.D.i || ck.doc!==(CAMP_SAVE.doc[4]? 1 : 0) || c.D.i>=2){ if (c.D.i>=2) M5_CK = null; return false; }
  ck.fail = false; c.resumed = ck.act;
  campEra(g.p, ck.era); g.p.xp = ck.xp;
  if (ck.act>=2){ const spec = m5ActSpec(g, c, ck.act, ck); campApplyAct(g, c, spec); }
  else m5Init(g, c, 1, { upg:ck.upg, capUp:ck.capUp, heroAlive:ck.heroAlive, heroCd:ck.heroCd, refund:ck.refund, resume:true });
  return true;
}

/* ================= LE DESSIN DU TERRAIN : bases, porte, batteries, sapeurs, baies, vannes, bande de réécriture ================= */
function m5Tag(x, txt, dy, col){                                      // légende posée au sol (« la ferme brûlée », « baie 2 »…)
  const sx = x - camX; if (sx < -120 || sx > VW()+120) return;
  const y = gY(x) + (dy==null? 14 : dy), s = typeof txt==='string'? txt : cT(txt);
  ctx.save(); ctx.font = '700 9px "Courier New",monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(s).width + 12; ctx.fillStyle = 'rgba(14,10,8,0.5)'; ctx.fillRect(sx-w/2, y-7, w, 14);
  ctx.fillStyle = col || 'rgba(238,228,200,0.92)'; ctx.fillText(s, sx, y+0.5); ctx.restore();
}
const m5Lines = (g, pts) => { g.beginPath(); pts.forEach((p,i)=> i? g.lineTo(p[0],p[1]) : g.moveTo(p[0],p[1])); };
// ----- nos camps (repère local : pieds de la base en (0,0), la citadelle à droite) -----
function m5Camp1(t, frac){                                            // les cellules : deux tentes, le camion-radio de Germinal, une banderole
  blitObj('M5CAMP1', 220, 96, 120, 90, paintCamp1);
  ctx.fillStyle = '#c42a1c'; const wv = Math.sin(t*3)*2; ctx.beginPath(); ctx.moveTo(20,-84); ctx.lineTo(54,-80+wv); ctx.lineTo(54,-68+wv); ctx.lineTo(20,-72); ctx.closePath(); ctx.fill();   // la banderole
  ctx.fillStyle = 'rgba(255,240,220,0.85)'; ctx.fillRect(26,-79+wv*0.4,22,2);
  for (let k=0;k<2;k++){ const ph = (t*0.8+k*0.5)%1; ctx.strokeStyle = 'rgba(196,42,28,'+(0.5*(1-ph)).toFixed(2)+')'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(20,-84, 8+ph*16, -2.3, -0.8); ctx.stroke(); }
}
function m5Camp2(t, frac){                                            // la brèche : un trou dans le mur, des sacs de sable, deux projecteurs
  ctx.fillStyle = '#2c3038'; ctx.fillRect(-88,-120,62,120); ctx.fillRect(26,-120,62,120);
  ctx.beginPath(); ctx.moveTo(-26,-120); ctx.lineTo(26,-120); ctx.lineTo(24,-86); ctx.lineTo(12,-64); ctx.lineTo(20,-30); ctx.lineTo(10,0); ctx.lineTo(-18,0); ctx.lineTo(-12,-44); ctx.lineTo(-26,-70); ctx.closePath(); ctx.fillStyle = '#080a10'; ctx.fill();
  ctx.fillStyle = 'rgba(150,214,236,0.8)'; for (let i=0;i<5;i++) ctx.fillRect(-10+((i*7)%18), -100+i*18, 2, 2);
  ctx.fillStyle = '#8a7a58'; for (let r=0;r<2;r++) for (let i=0;i<6;i++){ ctx.beginPath(); ctx.ellipse(-60+i*18+(r? 8 : 0), -5-r*9, 10, 5.4, 0, 0, 6.283); ctx.fill(); }
  ctx.strokeStyle = '#1c1a18'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let r=0;r<2;r++) for (let i=0;i<6;i++){ ctx.moveTo(-50+i*18+(r? 8 : 0), -5-r*9); ctx.ellipse(-60+i*18+(r? 8 : 0), -5-r*9, 10, 5.4, 0, 0, 6.283); } ctx.stroke();
  for (const px of [-70,60]){ ctx.strokeStyle = '#1c1a18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px,-18); ctx.lineTo(px-8,0); ctx.moveTo(px,-18); ctx.lineTo(px+8,0); ctx.stroke();
    ctx.fillStyle = '#3a3e46'; ctx.fillRect(px-8,-34,16,14); ctx.fillStyle = '#fff2c8'; ctx.fillRect(px+(px<0? 5 : -9),-31,5,8); }
}
function m5Camp3(t, frac){                                            // la porte enfoncée : l'embrasure d'une porte immense, un vantail à terre
  ctx.fillStyle = '#12161c'; ctx.fillRect(-70,-130,18,130); ctx.fillRect(52,-130,18,130); ctx.fillRect(-70,-130,140,16);
  const gl = ctx.createLinearGradient(0,-114,0,0); gl.addColorStop(0,'rgba(236,246,252,0.9)'); gl.addColorStop(1,'rgba(150,200,226,0.25)'); ctx.fillStyle = gl; ctx.fillRect(-52,-114,104,114);
  ctx.strokeStyle = '#eef6fa'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-70,-130); ctx.lineTo(-70,0); ctx.moveTo(70,-130); ctx.lineTo(70,0); ctx.stroke();
  ctx.fillStyle = '#242a34'; ctx.beginPath(); ctx.moveTo(-8,-2); ctx.lineTo(92,-6); ctx.lineTo(100,-22); ctx.lineTo(0,-26); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8fb8cc'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(6,-12); ctx.lineTo(92,-14); ctx.stroke();
  ctx.fillStyle = '#c42a1c'; ctx.beginPath(); ctx.moveTo(-84,0); ctx.lineTo(-84,-60); ctx.lineTo(-62,-56+Math.sin(t*3)*2); ctx.lineTo(-62,-46+Math.sin(t*3)*2); ctx.lineTo(-84,-50); ctx.closePath(); ctx.fill();
}
// ----- la citadelle (repère local, base au centre) -----
function m5Gate1(t, frac, c){                                         // la porte d'enceinte : deux vantaux sombres dans le mur, l'Ω gravé
  const open = c.gateOpen, k = open? clamp(c.t - (c.firing||c.t) - 2, 0, 1) : 0;
  ctx.fillStyle = '#3a3634'; ctx.fillRect(-190,-58,380,58);
  ctx.fillStyle = '#2a2624'; ctx.fillRect(-60,-130,120,130);
  ctx.fillStyle = '#4a4442'; for (let i=-190;i<190;i+=26){ if (i<-70 || i>46) ctx.fillRect(i,-66,16,9); }                                    // créneaux
  ctx.fillStyle = '#16181e'; ctx.fillRect(-42,-104,40,104); ctx.fillRect(2,-104,40,104);                                                    // les deux vantaux
  if (k>0){ ctx.fillStyle = '#05060a'; ctx.fillRect(-6-k*10,-104,12+k*20,104); }
  ctx.strokeStyle = '#4c566a'; ctx.lineWidth = 1.4; ctx.strokeRect(-41.5,-103.5,39,103); ctx.strokeRect(2.5,-103.5,39,103);
  ctx.fillStyle = '#5a6478'; for (let i=0;i<5;i++){ ctx.fillRect(-36,-92+i*19,3,3); ctx.fillRect(33,-92+i*19,3,3); }
  ctx.fillStyle = (Math.sin(t*2)>-0.3)? '#7ab8e0' : '#4a7090'; ctx.font = '700 38px Georgia,serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Ω', 0, -52);        // l'Ω gravé
  ctx.fillStyle = '#c42a1c'; ctx.beginPath(); ctx.arc(-52,-116,2.5,0,6.283); ctx.arc(52,-116,2.5,0,6.283); ctx.fill();
  if (open){ ctx.fillStyle = 'rgba(8,6,4,0.45)'; ctx.fillRect(-60,-130,120,40); }
}
function m5Gate2(t, frac, c){                                         // la porte du noyau : ronde, blindée, cerclée de lumière
  const sh = 3 - c.owned, p = 0.55 + 0.25*Math.sin(t*2.4);
  ctx.fillStyle = '#10131a'; ctx.fillRect(-120,-150,240,150);
  ctx.strokeStyle = '#2a3140'; ctx.lineWidth = 2; ctx.beginPath(); for (let y=-140;y<0;y+=22){ ctx.moveTo(-120,y); ctx.lineTo(120,y); } ctx.stroke();
  ctx.fillStyle = '#1c212b'; ctx.beginPath(); ctx.arc(0,-70,56,0,6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(150,214,236,'+(sh? p : 0.3).toFixed(2)+')'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0,-70,56,0,6.283); ctx.stroke();
  for (let i=0;i<sh;i++){ ctx.strokeStyle = '#4a5668'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0,-70,48-i*11,0,6.283); ctx.stroke(); ctx.strokeStyle = 'rgba(190,234,248,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0,-70,50.5-i*11,0,6.283); ctx.stroke(); }
  ctx.fillStyle = sh? '#2a303c' : '#0a0c10'; ctx.beginPath(); ctx.arc(0,-70,Math.max(8,26-sh*8),0,6.283); ctx.fill();
  for (let i=0;i<8;i++){ const a = i*0.785+t*(sh? 0.2 : 0); ctx.strokeStyle = '#3a4252'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(Math.cos(a)*14, -70+Math.sin(a)*14); ctx.lineTo(Math.cos(a)*(26+sh*6), -70+Math.sin(a)*(26+sh*6)); ctx.stroke(); }
  if (!sh){ ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g2 = ctx.createRadialGradient(0,-70,4,0,-70,90); g2.addColorStop(0,'rgba(190,230,250,0.45)'); g2.addColorStop(1,'rgba(190,230,250,0)'); ctx.fillStyle = g2; ctx.fillRect(-100,-160,200,180); ctx.restore(); }
}
function m5Gate3(t, frac, c){                                         // la tour : une colonne de lumière dans une cage de verre
  const fx = c.endFx, k = fx? clamp((performance.now() - (c.endT0||0))/1000, 0, 4) : 0;
  if (fx==='fall'){ const h = 210*Math.max(0.04, 1 - k*k*0.07); ctx.fillStyle = '#2a2e38'; ctx.fillRect(-70,-14,140,14);
    ctx.fillStyle = 'rgba(36,44,56,0.9)'; ctx.fillRect(-26,-14-h,52,h); ctx.fillStyle = 'rgba(190,226,244,'+Math.max(0,0.8-k*0.25).toFixed(2)+')'; ctx.fillRect(-8,-14-h,16,h);
    for (let i=0;i<8;i++){ ctx.fillStyle = '#4a5260'; ctx.fillRect(-60+((i*37)%110), -6-((i*13)%9), 18+i%3*6, 8); } return; }
  const dead = fx==='dawn';
  ctx.fillStyle = '#242a34'; ctx.fillRect(-72,-16,144,16); ctx.fillStyle = '#323a48'; ctx.fillRect(-56,-26,112,10);
  ctx.fillStyle = 'rgba(150,200,226,0.14)'; ctx.fillRect(-32,-236,64,220);                                                          // la cage de verre
  ctx.strokeStyle = '#8fb8cc'; ctx.lineWidth = 1.6; ctx.strokeRect(-32,-236,64,220); ctx.beginPath(); for (let y=-200;y<-20;y+=36){ ctx.moveTo(-32,y); ctx.lineTo(32,y); } ctx.moveTo(0,-236); ctx.lineTo(0,-16); ctx.stroke();
  const pulse = 0.7 + 0.3*Math.sin(t*3), n = dead? Math.max(0, 5 - Math.floor(k*1.4)) : 5;
  const lg = ctx.createLinearGradient(0,-230,0,-20); lg.addColorStop(0,'rgba(255,255,255,'+(dead? 0.25 : 0.95).toFixed(2)+')'); lg.addColorStop(1,'rgba(150,214,244,'+(dead? 0.1 : 0.5).toFixed(2)+')');
  ctx.fillStyle = lg; ctx.fillRect(-10,-228,20,206);
  for (let i=0;i<5;i++){ const on = i < n; ctx.fillStyle = on? 'rgba(120,214,250,'+pulse.toFixed(2)+')' : 'rgba(40,52,64,0.9)'; ctx.fillRect(-30,-216+i*40,3,28); ctx.fillRect(27,-216+i*40,3,28); }   // les liserés bleus
  ctx.strokeStyle = 'rgba(236,248,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,-250,16,0,6.283); ctx.stroke();                          // l'anneau
  if (!dead){ ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g2 = ctx.createRadialGradient(0,-130,10,0,-130,150); g2.addColorStop(0,'rgba(200,236,255,'+(0.3*pulse).toFixed(2)+')'); g2.addColorStop(1,'rgba(200,236,255,0)'); ctx.fillStyle = g2; ctx.fillRect(-150,-280,300,300); ctx.restore(); }
}
function m5DrawBase(side, c){
  const x = side.x - camX; if (x < -260 || x > VW()+260) return;
  const g = game, t = g.t, gy = gY(side.x), mine = side===g.p, a = c.act, frac = side.maxhp>0? clamp(side.hp/side.maxhp, 0, 1) : 1, d = side.side;
  projShadow(x, gy, mine? 70 : 96);
  ctx.save(); ctx.translate(x, gy);
  if (mine) [m5Camp1, m5Camp2, m5Camp3][a-1](t, frac); else [m5Gate1, m5Gate2, m5Gate3][a-1](t, frac, c);
  ctx.restore();
  drawBaseGarrison(side, x, gy, d, mine? -60 : -90);
  if (frac < 0.55){ const S = mine? [[-30,-60],[40,-30]] : [[-30,-90],[26,-60]]; for (let i=0;i<S.length;i++) dmgSmoke(x+S[i][0], gy+S[i][1], frac, t, side.x+i*31); }
  if (mine || !(a===3 && c.endFx)){ const w = 110, by = gy - (mine? 100 : a===3? 262 : a===2? 158 : 138);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x-w/2, by, w, 8); ctx.fillStyle = side.fac.accent; ctx.fillRect(x-w/2, by, w*frac, 8);
    if (!mine && a===3){ ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x-w/2+w*0.1, by-2, 1.5, 12); }                    // le seuil des 10 %
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(x-w/2, by, w, 8);
    if (mine && frac < 0.95){ ctx.font = HF(12); ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,'+(0.5+0.3*Math.sin(t*3))+')'; ctx.fillText(tr('hud_tap_repair'), x, by-10); } }
}
{ const _db = drawBase; drawBase = function(side){ const c = m5C(); if (c) m5DrawBase(side, c); else _db(side); }; }

/* ---------- baies (zones de l'acte II), vannes (objets), batteries et sapeurs ---------- */
function m5DrawZone(z, t, vw){
  const x = z.x - camX; if (x < -80 || x > vw+80) return; const y = gY(z.x), off = z.owner==='p', i = game.zones.indexOf(z);
  ctx.save(); ctx.translate(x, y);
  if (!off && qFx()){ ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(0,-34,6,0,-34,120); gl.addColorStop(0,'rgba(120,200,240,0.35)'); gl.addColorStop(1,'rgba(120,200,240,0)'); ctx.fillStyle = gl; ctx.fillRect(-130,-160,260,170); ctx.restore(); }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(2,1,30,5,0,0,6.283); ctx.fill();
  ctx.fillStyle = '#2c3848'; ctx.fillRect(-22,-64,44,64); ctx.fillStyle = '#1c2530'; ctx.fillRect(-22,-64,44,5); ctx.fillRect(15,-64,7,64); ctx.fillStyle = '#10161e'; ctx.fillRect(-18,-57,30,52);
  for (let k=0;k<7;k++){ ctx.fillStyle = '#243040'; ctx.fillRect(-16,-54+k*7.2,26,4.6);
    ctx.fillStyle = off? '#3a2420' : (Math.sin(t*(3+k*0.7)+k*2+z.x)>0? '#bfeaf8' : '#4a7a90'); ctx.fillRect(-14+((k*5)%16),-53+k*7.2,4,2); }
  if (off){ ctx.strokeStyle = '#c42a1c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-17,-52); ctx.lineTo(11,-10); ctx.moveTo(11,-52); ctx.lineTo(-17,-10); ctx.stroke();       // éteinte : barrée, câbles arrachés
    ctx.strokeStyle = '#10161e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-22,-18); ctx.quadraticCurveTo(-36,-8,-34,0); ctx.moveTo(22,-26); ctx.quadraticCurveTo(34,-12,30,0); ctx.stroke(); }
  else { ctx.fillStyle = 'rgba(190,234,248,0.9)'; ctx.fillRect(-22,-67,44,2);
    for (let k=0;k<3;k++){ const ph = (t*0.7+k/3)%1; ctx.fillStyle = 'rgba(190,230,248,'+(0.35*(1-ph)).toFixed(2)+')'; ctx.fillRect(24+ph*18, -44+k*12, 10, 2); } }                // le souffle d'air
  const pr = Math.abs(z.prog); if (pr>0.01 && pr<1){ ctx.fillStyle = 'rgba(10,10,14,0.7)'; ctx.fillRect(-22,7,44,4); ctx.fillStyle = z.prog>0? '#c42a1c' : '#9fd6ea'; ctx.fillRect(-22,7,44*pr,4); }
  ctx.restore();
  m5Tag(z.x, m5Fmt(M5_TX.bay, { n:i+1 }), 20);
}
function m5DrawObj(o, t, vw){                                         // vanne de refroidissement : conduite, volant rouge
  const x = o.x - camX; if (x < -80 || x > vw+80) return; const y = gY(o.x), mine = o.owner==='p';
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0,1,46,5,0,0,6.283); ctx.fill();
  ctx.fillStyle = '#4a5260'; ctx.fillRect(-52,-22,104,14); ctx.fillStyle = '#6a7484'; ctx.fillRect(-52,-22,104,3); ctx.fillStyle = '#323a46'; ctx.fillRect(-56,-26,8,22); ctx.fillRect(48,-26,8,22);
  ctx.fillStyle = '#3a4250'; ctx.fillRect(-6,-34,12,14);
  ctx.strokeStyle = '#c42a1c'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(0,-46,13,0,6.283); ctx.stroke();                                           // le volant
  const ar = mine? t*0.6 : 0; ctx.lineWidth = 2.2; ctx.beginPath(); for (let k=0;k<3;k++){ const a = ar+k*1.047; ctx.moveTo(Math.cos(a)*13,-46+Math.sin(a)*13); ctx.lineTo(-Math.cos(a)*13,-46-Math.sin(a)*13); } ctx.stroke();
  if (mine){ ctx.fillStyle = 'rgba(120,200,240,0.9)'; for (let k=0;k<3;k++){ const ph = (t*1.2+k/3)%1; ctx.fillRect(-30+k*28, -8+ph*10, 3, 6); } }                             // l'eau coule
  const pr = Math.abs(o.prog); if (pr>0.01 && pr<1){ ctx.fillStyle = 'rgba(10,10,14,0.7)'; ctx.fillRect(-24,8,48,4); ctx.fillStyle = o.prog>0? '#2f9bd0' : '#9fd6ea'; ctx.fillRect(-24,8,48*pr,4); }
  ctx.restore();
  m5Tag(o.x, m5Fmt(M5_TX.valve, { n:o.id==='valveA'? 'A' : 'B' }), 22, mine? '#9fe0ff' : null);
}
function m5Wall(x0, x1){                                              // le mur d'enceinte, au premier plan (acte I) : tours des batteries
  const a = x0 - camX, b = x1 - camX; if (b < -40 || a > VW()+40) return;
  const y0 = gY((x0+x1)/2);
  ctx.fillStyle = '#3e3a38'; ctx.fillRect(a, y0-52, b-a, 52);
  ctx.fillStyle = '#4c4745'; for (let x=a;x<b-14;x+=24) ctx.fillRect(x, y0-60, 15, 9);
  ctx.fillStyle = 'rgba(20,14,12,0.35)'; for (let x=a+8;x<b-20;x+=40) ctx.fillRect(x, y0-34, 14, 4);
  ctx.strokeStyle = 'rgba(14,10,8,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); for (let x=a;x<b;x+=44){ ctx.moveTo(x,y0-52); ctx.lineTo(x+14,y0); } ctx.stroke();
}
function m5DrawBatt(b, g, t){
  const x = b.x - camX; if (x < -80 || x > VW()+80) return; const y = gY(b.x);
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#4a4442'; ctx.fillRect(-20,-96,40,96); ctx.fillStyle = '#5a5452'; ctx.fillRect(-24,-102,48,10); ctx.fillStyle = 'rgba(20,14,12,0.4)'; ctx.fillRect(10,-96,10,96);
  if (b.dead){ ctx.fillStyle = 'rgba(8,6,6,0.8)'; ctx.beginPath(); ctx.moveTo(-20,-96); ctx.lineTo(0,-96); ctx.lineTo(-8,-70); ctx.lineTo(-20,-76); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a2624'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-6,-100); ctx.lineTo(-30,-86); ctx.stroke();
    for (let k=0;k<2;k++){ const ph = (t*0.4+k*0.5)%1; ctx.fillStyle = 'rgba(40,36,34,'+(0.4*(1-ph)).toFixed(2)+')'; ctx.beginPath(); ctx.arc(-4+Math.sin(ph*5)*5, -100-ph*40, 6+ph*10, 0, 6.283); ctx.fill(); } }
  else { const rec = b.atkT > 0.8? 4*(b.atkT-0.8)/0.2 : 0;                                              // la tourelle : tube long, recul à chaque tir
    ctx.fillStyle = '#2c2a2a'; ctx.beginPath(); ctx.arc(0,-106,13,Math.PI,0); ctx.fill();
    ctx.strokeStyle = '#1c1a1a'; ctx.lineWidth = 5; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(-6+rec,-108); ctx.lineTo(-36+rec,-112); ctx.stroke();
    ctx.fillStyle = (Math.sin(t*5)>0)? '#ff3a2a' : '#6a1a14'; ctx.beginPath(); ctx.arc(0,-120,2.4,0,6.283); ctx.fill();
    if (b.hp < b.maxhp){ const f = clamp(b.hp/b.maxhp,0,1); ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(-24,-132,48,5); ctx.fillStyle = '#e0533f'; ctx.fillRect(-24,-132,48*f,5); } }
  ctx.restore();
}
function m5DrawSap(s, g, t){
  const x = s.x - camX; if (x < -30 || x > VW()+30) return; const y = gY(s.x), f = clamp(s.hp/s.maxhp, 0, 1), w = Math.sin(s.step*0.18)*2.4;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0,1,10,2.6,0,0,6.283); ctx.fill();
  ctx.fillStyle = '#5a4a2a'; ctx.beginPath(); ctx.moveTo(-5,-4); ctx.lineTo(-4,-17); ctx.lineTo(4,-17); ctx.lineTo(5,-4); ctx.closePath(); ctx.fill();                      // le corps
  ctx.fillRect(-4,-4, 3, 4+w*0.3); ctx.fillRect(1,-4, 3, 4-w*0.3);
  ctx.fillStyle = '#d8b090'; ctx.beginPath(); ctx.arc(0,-21,3.6,0,6.283); ctx.fill(); ctx.fillStyle = '#e8c070'; ctx.beginPath(); ctx.arc(0,-22,4,Math.PI,0); ctx.fill();   // casque de sapeur
  ctx.fillStyle = '#7a3a1c'; ctx.fillRect(-12,-18,8,13); ctx.fillStyle = '#c42a1c'; ctx.fillRect(-11,-17,6,3);                                                                 // la charge sur le dos
  ctx.fillStyle = (Math.sin(t*6+s.id)>0)? '#ff3a2a' : '#6a1a14'; ctx.fillRect(-9,-9,2,2);
  if (s.plant>0){ ctx.strokeStyle = '#e8c070'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,-34,7,-1.57,-1.57+6.283*(1-s.plant/M5.sapPlant)); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(-11,-31,22,3); ctx.fillStyle = f>0.5? '#9dc88a' : '#e0533f'; ctx.fillRect(-11,-31,22*f,3);
  ctx.restore();
}
function m5DrawRw(g, c, vw, t){                                       // la bande blanche : hachurée qui se remplit, puis l'éclair
  for (const r of [c.rw, c.demoRw]){ if (!r) continue;
    const w = M5.rwW, x0 = r.x - w/2 - camX, y = gY(r.x), warn = r.warn || 4, k = Math.min(1, r.t/warn), done = !!r.done;
    if (x0 > vw || x0+w < 0) continue;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y-170, w, 210); ctx.clip();
    ctx.fillStyle = done? 'rgba(246,252,255,'+(0.8*Math.max(0, 1-(r.t-warn)*1.3)).toFixed(2)+')' : 'rgba(200,236,248,'+(0.10+0.16*k).toFixed(3)+')'; ctx.fillRect(x0, y-170, w, 210);
    ctx.strokeStyle = 'rgba(20,28,38,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); for (let q=-210; q<w*k; q+=16){ ctx.moveTo(x0+q, y+40); ctx.lineTo(x0+q+210, y-170); } ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#12161c'; ctx.fillRect(x0-2, y-170, 4, 210); ctx.fillRect(x0+w-2, y-170, 4, 210);
    ctx.fillStyle = '#12161c'; ctx.fillRect(x0+w/2-62, y-192, 124, 18); ctx.fillStyle = '#eef6fa'; ctx.font = '700 11px "Courier New",monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(cT(M5_TX.rw)+Math.max(0, warn - r.t).toFixed(1), x0+w/2, y-183); }
}
// légendes au sol de chaque lieu
function m5Tags(g, c){
  const a = c.act;
  if (a===1){ m5Tag(1200, M5_TX.farm); m5Tag(1800, M5_TX.cross); m5Tag(M5.wallX[0], M5_TX.battN, 18); m5Tag(M5.wallX[1], M5_TX.battS, 18); m5Tag(M5.gateX, M5_TX.gate1, 18); }
  else if (a===2){ m5Tag(900, m5Fmt(M5_TX.aisle, {n:'A'})); m5Tag(2200, m5Fmt(M5_TX.aisle, {n:'B'}), 34); m5Tag(M5.gateX, M5_TX.gate2, 18); m5Tag(g.p.x, M5_TX.breach, 18); }
  else { m5Tag(1300, M5_TX.pillars); m5Tag(2300, M5_TX.pillars); m5Tag(M5.gateX, M5_TX.tower, 18); m5Tag(g.p.x, M5_TX.door3, 18); }
}
function m5DrawPillars(g){                                            // les piliers de l'acte III : deux colonnes de verre
  for (const px of [1300, 2300]){ const x = px - camX; if (x < -60 || x > VW()+60) continue; const y = gY(px), t = g.t;
    ctx.fillStyle = 'rgba(150,200,226,0.16)'; ctx.fillRect(x-14,y-110,28,110); ctx.strokeStyle = '#8fb8cc'; ctx.lineWidth = 1.4; ctx.strokeRect(x-14,y-110,28,110);
    ctx.fillStyle = 'rgba(236,248,255,'+(0.35+0.2*Math.sin(t*2+px)).toFixed(2)+')'; ctx.fillRect(x-3,y-104,6,100);
    ctx.fillStyle = '#242a34'; ctx.fillRect(x-20,y-6,40,6); ctx.fillRect(x-18,y-116,36,6); }
}
function m5Draw(g, c, vw){
  const t = g.t, a = c.act;
  if (a===1){ m5Wall(2860, 3560); for (const b of c.batt) m5DrawBatt(b, g, t); for (const s of c.saps) m5DrawSap(s, g, t); }
  if (a===3) m5DrawPillars(g);
  m5Tags(g, c); m5DrawRw(g, c, vw, t);
  if (a===3 && m5AvAlive(g, c)){ const u = c.avatar, x = u.x - camX; if (x > -40 && x < vw+40){ const y = gY(u.x) - 112 - (u.fly? 0 : 0);                  // l'avatar : un anneau au-dessus de la tête
    ctx.strokeStyle = 'rgba(236,248,255,'+(0.6+0.3*Math.sin(t*4)).toFixed(2)+')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 14, 0.4, 5.9); ctx.stroke(); } }
  if (c.warnMark && t < c.warnMark.t1){ const x = c.warnMark.x - camX, y = gY(c.warnMark.x);                                                              // Radio libre : repère de sortie
    if (x > -40 && x < vw+40){ ctx.strokeStyle = 'rgba(224,83,63,'+(0.5+0.4*Math.sin(t*10)).toFixed(2)+')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y-60, 24, 0, 6.283); ctx.stroke(); ctx.fillStyle = '#e0533f'; ctx.font = '700 12px "Courier New",monospace'; ctx.textAlign = 'center'; ctx.fillText(cT(M5_TX.sortie), x, y-96); } }
}

/* ================= PLANCHES (repère 480×270, sol à y = 230) — un sujet par planche ================= */
const M5_INK = '#1f1b17', M5_RED = '#c42a1c', M5_BLUE = '#0b6fa8', M5_AMB = '#e8a53c', M5_COUR = '"Courier New",monospace';
const m5Loop = (g, pts, n, wd, col) => inkLine(g, pts.concat(pts.slice(0,2)), n, wd, col);                 // contour fermé : le premier point est répété
const m5Txt = (g, s, x, y, px, col, al, font) => { g.fillStyle = col || M5_INK; g.font = font || ('700 '+px+'px '+M5_COUR); g.textAlign = al || 'center'; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };
const m5Cone = (g, x, y, w, h, a, col) => { const gr = g.createLinearGradient(0, y, 0, y+h); gr.addColorStop(0, 'rgba('+col+','+a+')'); gr.addColorStop(1, 'rgba('+col+',0)'); g.fillStyle = gr;
  g.beginPath(); g.moveTo(x-3, y); g.lineTo(x+3, y); g.lineTo(x+w/2, y+h); g.lineTo(x-w/2, y+h); g.closePath(); g.fill(); };
const m5Flakes = (g, t, n, col, speed, drift) => { for (let i=0;i<n;i++){ const x = (i*61.3 + t*drift + Math.sin(t*0.7+i)*8 + 480*4) % 480, y = (i*47.1 + t*speed) % 270; g.fillStyle = col; g.fillRect(x, y, 2.4+(i%3)*0.8, 2.4+(i%3)*0.8); } };
const m5Bilan2 = c => { const s = m5BilanTxt(c), i = s.indexOf(' · '); return i<0? [s, ''] : [s.slice(0, i), s.slice(i+3)]; };
const M5_DL = [   // étiquettes dessinées sur les trois portes (non prononcées)
  {fr:"I · LE MUR", en:"I · THE WALL", es:"I · EL MURO", de:"I · DIE MAUER", it:"I · IL MURO", pt:"I · O MURO", ru:"I · СТЕНА", zh:"I · 城墙", ar:"I · الجدار"},
  {fr:"II · LES HALLES", en:"II · THE HALLS", es:"II · LAS NAVES", de:"II · DIE HALLEN", it:"II · I CAPANNONI", pt:"II · OS GALPÕES", ru:"II · ЗАЛЫ", zh:"II · 机房", ar:"II · القاعات"},
  {fr:"III · LE NOYAU", en:"III · THE CORE", es:"III · EL NÚCLEO", de:"III · DER KERN", it:"III · IL NUCLEO", pt:"III · O NÚCLEO", ru:"III · ЯДРО", zh:"III · 核心", ar:"III · النواة"} ];
// biped de la G·P·T, à l'arrêt : jambes à deux segments, torse en trapèze, tête à un seul œil ; (x, y) = pieds
function m5Biped(g, x, y, s, on){
  const lg = (dx) => [x+dx*s, y, x+(dx*1.4+1.5)*s, y-12*s, x+dx*0.6*s, y-24*s];
  inkLine(g, lg(-6), 1, 3.6); inkLine(g, lg(6), 1, 3.6);
  const tq = [x-11*s,y-24*s, x+11*s,y-24*s, x+14*s,y-46*s, x-14*s,y-46*s]; inkWash(g, tq, M5_INK, 0.6); m5Loop(g, tq, 1, 2);
  inkLine(g, [x-14*s,y-44*s, x-18*s,y-28*s], 1, 3); inkLine(g, [x+14*s,y-44*s, x+17*s,y-28*s], 1, 3);                 // les bras ballants
  const hd = [x-7*s,y-47*s, x+7*s,y-47*s, x+6*s,y-58*s, x-6*s,y-58*s]; inkWash(g, hd, M5_INK, 0.8); m5Loop(g, hd, 1, 1.8);
  g.fillStyle = on? M5_BLUE : 'rgba(31,27,23,0.75)'; g.beginPath(); g.arc(x+1*s, y-52.5*s, 2.2*s, 0, 6.283); g.fill(); }              // l'œil
// drone posé au sol : coque, bras à hélices repliés, pieds
function m5DroneLanded(g, x, y, s, on){ inkDrone(g, x, y-9*s, 34*s, on? M5_BLUE : 'rgba(31,27,23,0.75)', M5_INK);
  inkLine(g, [x-9*s,y-4*s, x-12*s,y], 1, 1.8); inkLine(g, [x+9*s,y-4*s, x+12*s,y], 1, 1.8); }
// jeune arbre tuteuré : tronc mince, petite couronne, tuteur et lien ; (x, y) = pied
// jeune arbre tuteuré, planté AU SOL en (x, y) : petite ombre de lavis, tronc fin un peu penché, tuteur, lien, houppier irrégulier
// fait de 2-3 taches de lavis vert (v = variante 0..2 : inclinaison, nombre et teinte des taches) ; s = taille
function m5Sapling(g, x, y, s, v){
  v = v|0; const lean = [0.9, -0.7, 0.3][v%3]*s, H = (23 + v*4)*s;
  g.fillStyle = 'rgba(31,27,23,0.22)'; g.beginPath(); g.ellipse(x+2*s, y+0.6, 8*s, 1.9*s, 0, 0, 6.283); g.fill();                    // l'ombre au pied : l'arbre touche la terre
  inkLine(g, [x-9*s,y+0.4, x-5*s,y-0.4], 1, 0.9, 'rgba(31,27,23,0.45)'); inkLine(g, [x+7*s,y+0.6, x+11*s,y-0.2], 1, 0.9, 'rgba(31,27,23,0.45)');   // deux brins d'herbe
  inkLine(g, [x+4.5*s,y, x+4.5*s,y-H*0.92], 1, 1.1);                                                                                   // le tuteur
  inkLine(g, [x,y, x+lean*0.3,y-H*0.45, x+lean,y-H], 1, 1.5);                                                                           // le tronc, fin
  inkLine(g, [x+lean*0.25-1.5*s,y-H*0.38, x+4.5*s,y-H*0.46], 1, 0.9);                                                                    // le lien
  const cx = x+lean, cy = y-H, P = [[-4,-2,7,5.6,'rgba(86,120,62,0.62)'],[3.6,-6,6.4,5.2,'rgba(104,138,66,0.58)'],[0.6,3,5.4,4.2,'rgba(70,104,58,0.58)']];
  const n = 2 + (v===1? 1 : v===2? 0 : 1);
  for (let i=0;i<n;i++){ const [dx,dy,rx,ry,col] = P[i], bx = cx+dx*s, by = cy+dy*s, pts = [];                                          // une tache irrégulière (polygone bruité, pas une ellipse)
    for (let k=0;k<9;k++){ const a = k/9*6.283, r = 1+0.22*Math.sin(k*2.3+v*1.7+i*3.1); pts.push(bx+Math.cos(a)*rx*s*r, by+Math.sin(a)*ry*s*r); }
    inkWash(g, pts, col, 1); }
  inkLine(g, [cx-1*s,cy+3*s, cx,cy+0.5*s], 1, 0.9, 'rgba(31,27,23,0.5)');                                                                 // une branchette sous le houppier
}
const M5_PLATES = {
  // P1 · La plaine : la citadelle comme un couvercle, trois colonnes de cellules qui convergent
  plain(g, w, h, t){ plateBase(g, w, h, 'rgba(120,70,40,0.12)');
    const n = clamp(t/1.8, 0, 1);
    inkLine(g, [0,200, 480,200], 1, 2); inkHatch(g, 0, 200, 480, 70, 8, M5_INK, 0.14);
    const dome = []; for (let i=0;i<=20;i++){ const a = Math.PI*(1 - i/20); dome.push(320+100*Math.cos(a), 200-70*Math.sin(a)); }
    inkWash(g, dome, M5_INK, 0.5); inkLine(g, dome, n, 2.4); inkLine(g, [220,200, 420,200], 1, 2);                                    // le dôme
    inkWash(g, [314,132, 316,30, 324,30, 326,132], M5_INK, 0.8); inkLine(g, [314,132, 316,30, 324,30, 326,132], n, 1.8);               // la tour fine
    g.strokeStyle = M5_INK; g.lineWidth = 1.6; g.beginPath(); g.arc(320, 24, 7, 0, 6.283); g.stroke();
    const k = Math.min(1, t/5)*40;                                                                                                 // les colonnes avancent de 40 px en 5 s
    for (let c = 0; c < 3; c++) for (let i = 0; i < 7; i++){ const x = 24 + i*32 + c*10 + k, y = 218 + c*13 - i*1.2 - (k*0.05), s = 17 + c*2.5;
      inkFolk(g, x, y, s, M5_INK, i%3===0? 0.6 : 0);
      if (c===1 && i===4){ inkLine(g, [x+2, y-s*0.6, x+2, y-s-18], 1, 1.4); inkWash(g, [x+2, y-s-18, x+22, y-s-14+Math.sin(t*3)*2, x+22, y-s-4+Math.sin(t*3)*2, x+2, y-s-8], M5_RED, 0.95); } }   // le drapeau rouge
    m5Flakes(g, t, 22, 'rgba(70,56,46,0.55)', 14, 6);
    plateEnd(g, w, h); },
  // P2 · L'offre : une feuille posée sur la table de Sol ; la ligne s'imprime lettre après lettre, d'un bloc
  offer(g, w, h, t){ plateBase(g, w, h);
    const n = clamp(t/1.0, 0, 1);
    inkLine(g, [20,232, 460,232], n, 2.6); inkHatch(g, 20, 232, 440, 30, 7, M5_INK, 0.25);
    const sh = [120,50, 360,50, 360,220, 120,220]; inkWash(g, sh, '#fbf8ee', 0.95); m5Loop(g, sh, n, 2, M5_INK);                     // la feuille
    const pc = [380,206, 436,196, 438,204, 382,214]; inkWash(g, pc, M5_RED, 0.9); m5Loop(g, pc, n, 1.4); inkWash(g, [436,196, 446,195, 438,204], '#e2c4a2', 0.95);   // le crayon rouge, non utilisé
    const L = [cT(M5_TX.pOffer1), cT(M5_TX.pOffer2)], ch = Math.floor(Math.max(0, t-1.0)*22);
    let left = ch; L.forEach((s, i)=>{ if (left > 0) m5Txt(g, s.slice(0, left), 240, 128 + i*24, SETTINGS.lang==='ar' || SETTINGS.lang==='zh'? 15 : 15, '#35505e'); left -= s.length; });
    plateEnd(g, w, h); },
  // P3 · Le vote : quatorze bras levés (contre), une seule main basse, la plus petite, sous l'ampoule
  vote(g, w, h, t){ plateBase(g, w, h, 'rgba(60,40,20,0.06)');
    const n = clamp(t/1.0, 0, 1);
    inkLine(g, [20,232, 460,232], 1, 2.4); inkHatch(g, 20, 232, 440, 28, 7, M5_INK, 0.2);
    inkLine(g, [240,0, 240,22], 1, 1.2); g.fillStyle = '#fff2c8'; g.beginPath(); g.arc(240, 28, 6, 0, 6.283); g.fill(); g.strokeStyle = M5_INK; g.lineWidth = 1.4; g.stroke();   // l'ampoule nue
    const bd = [140,46, 340,46, 340,76, 140,76]; inkWash(g, bd, '#dcd2b6', 0.85); m5Loop(g, bd, n, 1.8); m5Txt(g, cT(M5_TX.pVote), 240, 67, 15, M5_INK);                  // le tableau
    for (let i=0;i<14;i++){ const x = 104 + i*26.6, up = clamp((t-0.6-i*0.14)/0.4, 0, 1), s = 52 + (i%3)*2, hv = [1, 0.62, 0.84, 0.5, 0.94, 0.72, 0.56][(i*3)%7];
      inkFolk(g, x, 232, s, M5_INK, up>0? Math.max(0.12, hv*up) : 0, i%3===1);                                       // le bras levé en deux segments : paume ouverte ou carton blanc
    }
    const sx = 52; const gl = g.createRadialGradient(sx, 205, 4, sx, 205, 60); gl.addColorStop(0,'rgba(232,165,60,0.55)'); gl.addColorStop(1,'rgba(232,165,60,0)'); g.fillStyle = gl; g.fillRect(sx-62, 140, 124, 100);   // le halo ambre sur Sol seulement
    inkFolk(g, sx, 232, 36, '#4a443c', 0); g.strokeStyle = '#4a443c'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx+3, 232-24); g.lineTo(sx+4, 232-8); g.stroke();                          // Sol, plus petite, voûtée, bras baissé
    inkWash(g, [sx-6,232-26, sx,232-21, sx+6,232-26, sx+6,232-29, sx-6,232-29], M5_RED, 0.95);
    plateEnd(g, w, h); },
  // P4 · Trois portes : l'une dans l'autre, de la plus grande à la plus petite
  doors(g, w, h, t){ plateBase(g, w, h, 'rgba(120,170,200,0.06)');
    const n1 = clamp(t/0.8, 0, 1), n2 = clamp((t-0.8)/0.8, 0, 1), n3 = clamp((t-1.6)/0.8, 0, 1);
    inkLine(g, [20,250, 460,250], n1, 2.2);
    const D1 = [100,250, 100,30, 380,30, 380,250]; inkWash(g, D1, M5_INK, 0.55); inkLine(g, D1, n1, 3); inkLine(g, [240,30, 240,250], n1, 2);                                            // la grande porte de métal, deux vantaux
    for (let i=0;i<4;i++){ inkLine(g, [100,70+i*45, 380,70+i*45], n1, 0.9, '#e9dfc6'); }
    const D2 = [160,240, 160,70, 320,70, 320,240]; inkWash(g, D2, '#2c3846', 0.8); inkLine(g, D2, n2, 2.4);                                                                   // la porte de serveur, grillée
    for (let x=172;x<320;x+=16) inkLine(g, [x,78, x,240], n2, 0.8, '#9fb4c4'); for (let y=90;y<240;y+=24) inkLine(g, [160,y, 320,y], n2, 0.8, '#9fb4c4');
    if (n3>0){ const gl = g.createRadialGradient(240,160,2,240,160,120); gl.addColorStop(0,'rgba(190,230,250,'+(0.7*n3).toFixed(2)+')'); gl.addColorStop(1,'rgba(190,230,250,0)'); g.fillStyle = gl; g.fillRect(100,30,280,220); }
    g.fillStyle = 'rgba(225,244,252,'+(0.95*n3).toFixed(2)+')'; g.beginPath(); g.arc(240,160,40*Math.max(0.01,n3),0,6.283); g.fill(); g.strokeStyle = M5_INK; g.lineWidth = 2.2; g.beginPath(); g.arc(240,160,40*n3,0,6.283); g.stroke();   // la porte ronde de lumière
    for (const [i,x,y,col] of [[0,106,47,'#e9dfc6'],[1,166,89,'#cfe0ec'],[2,204,118,'#223040']]){ g.globalAlpha = [n1,n2,n3][i]; g.font = '700 10px '+M5_COUR; const lw = g.measureText(cT(M5_DL[i])).width; g.fillStyle = 'rgba(14,18,24,0.82)'; g.fillRect(x-4, y-11, lw+8, 15); m5Txt(g, cT(M5_DL[i]), x, y, 10, '#efe6cf', 'left'); }
    g.globalAlpha = 1;
    plateEnd(g, w, h); },
  // K1 · La brèche : le trou dans le mur, ceux qui restent le gardent ; le bilan
  breach(g, w, h, t){ const c = m5C(); plateBase(g, w, h, 'rgba(60,40,30,0.12)');
    const n = clamp(t/1.2, 0, 1);
    const wall = [10,60, 470,60, 470,206, 10,206]; inkWash(g, wall, '#3a3a40', 0.55); m5Loop(g, wall, n, 2.4);
    const hole = [190,60, 290,60, 300,100, 278,128, 292,170, 270,206, 206,206, 214,160, 186,122, 204,92];                                   // le trou irrégulier
    inkWash(g, hole, '#090a10', 0.96); m5Loop(g, hole, n, 2.2);
    g.fillStyle = 'rgba(150,214,236,0.9)'; for (let i=0;i<7;i++){ const on = Math.sin(t*3+i*1.7) > -0.3; if (on) g.fillRect(218+((i*11)%56), 82+i*17, 3, 2.4); }     // des voyants bleus dans le noir
    inkLine(g, [0,206, 480,206], 1, 2); inkHatch(g, 0, 206, 480, 28, 7, M5_INK, 0.18);
    for (let i=0;i<8;i++){ const x = 120 + i*34; inkFolk(g, x, 232, 34, M5_INK, 0); inkLine(g, [x-8,232-20, x+8,232-18], 1, 3.2); }            // ceux qui restent, de dos, bras croisés
    inkWash(g, [38,232, 40,214, 56,214, 58,232], '#6a5a3a', 0.9); m5Loop(g, [38,232, 40,214, 56,214, 58,232], 1, 1.4); g.fillStyle = 'rgba(232,165,60,0.5)'; g.beginPath(); g.arc(48,221,5,0,6.283); g.fill();   // la lampe posée
    for (let i=0;i<16;i++){ const ph = (t*0.5+i/16)%1; g.fillStyle = 'rgba(80,66,56,'+(0.5*(1-ph)).toFixed(2)+')'; g.fillRect(200+((i*37)%90), 70+ph*130, 2, 2); }   // la poussière retombe
    if (c){ const [l1, l2] = m5Bilan2(c); const a = clamp((t-1.2)/0.8, 0, 1); g.globalAlpha = a; g.fillStyle = 'rgba(244,238,220,0.9)'; g.fillRect(10, 236, 460, 30); g.globalAlpha = 1;
      if (a>0){ g.globalAlpha = a; m5Txt(g, l1, 240, 248, 11, M5_RED); m5Txt(g, l2, 240, 261, 11, M5_INK); g.globalAlpha = 1; } }
    plateEnd(g, w, h); },
  // K2 · Le silence : une allée de serveurs en perspective ; les voyants s'éteignent du premier plan vers le fond
  silence(g, w, h, t){ const c = m5C(); plateBase(g, w, h, 'rgba(10,14,24,0.55)');
    const V = [240, 118], n = clamp(t/1.0, 0, 1), D = [0, 0.3, 0.52, 0.68, 0.8, 0.89, 0.95];
    g.fillStyle = 'rgba(8,10,16,0.8)'; g.fillRect(0, 0, 480, 270);
    for (let side=-1; side<=1; side+=2){ for (let i=0;i<6;i++){
      const x0 = lerp(side<0? 20 : 460, V[0], D[i]), x1 = lerp(side<0? 20 : 460, V[0], D[i+1]);
      const t0 = lerp(24, V[1]-4, D[i]), t1 = lerp(24, V[1]-4, D[i+1]), b0 = lerp(238, V[1]+10, D[i]), b1 = lerp(238, V[1]+10, D[i+1]);
      const q = [x0,t0, x1,t1, x1,b1, x0,b0]; inkWash(g, q, '#2a3442', 0.95); m5Loop(g, q, n, 1.4, '#9fb4c4');
      const off = t > 0.9 + i*0.75;                                                                                                    // les voyants s'éteignent
      for (let k=0;k<4;k++){ const u = 0.2 + 0.5*k/4, yy = lerp(lerp(t0,b0,0.15+k*0.2), lerp(t1,b1,0.15+k*0.2), 0.5), xx = lerp(x0, x1, 0.5);
        g.fillStyle = off? 'rgba(60,70,84,0.8)' : 'rgba(120,210,250,'+(0.7+0.3*Math.sin(t*4+i+k)).toFixed(2)+')'; const s = lerp(4, 1.6, D[i]); g.fillRect(xx-s, yy-s/2, s*2, s); } } }
    inkLine(g, [20,238, V[0]-10,V[1]+10], n, 1.2, '#6a7a8c'); inkLine(g, [460,238, V[0]+10,V[1]+10], n, 1.2, '#6a7a8c');                  // le sol de l'allée
    const wh = clamp((t-3.2)/1.2, 0, 1), gl = g.createRadialGradient(V[0], V[1], 2, V[0], V[1], 60); gl.addColorStop(0,'rgba(255,255,255,'+(0.5+0.5*wh).toFixed(2)+')'); gl.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(150, 60, 180, 120);
    g.fillStyle = '#f6fbff'; g.beginPath(); g.arc(V[0], V[1], 14, 0, 6.283); g.fill();                                                  // la porte ronde, ouverte, d'où sort la lumière
    if (c){ const [l1, l2] = m5Bilan2(c); const a = clamp((t-1.2)/0.8, 0, 1); g.globalAlpha = a; g.fillStyle = 'rgba(8,10,16,0.82)'; g.fillRect(10, 238, 460, 28); m5Txt(g, l1, 240, 250, 11, '#e8d8a0'); m5Txt(g, l2, 240, 262, 11, '#dfe8ee'); g.globalAlpha = 1; }
    plateEnd(g, w, h); },
  // carton d'acte : la porte, de plus en plus étroite
  door(a){ return (g, w, h, t) => { plateBase(g, w, h, a===3? 'rgba(120,170,200,0.20)' : 'rgba(20,30,50,0.28)');
      const n = clamp(t/1.6, 0, 1), hw = [60,36,14][a-1];
      inkLine(g, [20,236, 460,236], 1, 2.4); inkHatch(g, 20, 236, 440, 24, 7, M5_INK, 0.2);
      inkWash(g, [40,236, 40,40, 240-hw,40, 240-hw,236], M5_INK, 0.8); inkWash(g, [240+hw,236, 240+hw,40, 440,40, 440,236], M5_INK, 0.8);
      inkLine(g, [240-hw,236, 240-hw,40], n, 2.4, '#e9dfc6'); inkLine(g, [240+hw,236, 240+hw,40], n, 2.4, '#e9dfc6');
      if (a===3){ g.fillStyle = 'rgba(236,246,252,'+(0.9*n).toFixed(2)+')'; g.fillRect(240-hw+2, 44, hw*2-4, 190); }
      for (let i=0;i<a;i++) inkWash(g, [222+i*14,24, 232+i*14,24, 232+i*14,34, 222+i*14,34], M5_RED, 0.95);
      plateEnd(g, w, h); }; },
  // C · L'offre amendée : trois cercles qui respirent ensemble ; ils s'immobilisent au moment du choix
  circles(g, w, h, t){ plateBase(g, w, h, 'rgba(120,170,200,0.10)');
    const br = t > 12? 0 : Math.sin(t*0.9)*3;
    g.strokeStyle = '#4a5c6c'; for (const [r, lw] of [[30,3.2],[60,2.4],[90,1.8]]){ g.lineWidth = lw; g.beginPath(); g.arc(240, 135, r + br*(r/90), 0, 6.283); g.stroke(); }
    plateEnd(g, w, h); },
  // A2 · Comme des outils qu'on pose : des machines immobiles, deux personnes qui regardent
  tools(g, w, h, t){ plateBase(g, w, h, 'rgba(150,150,146,0.16)');
    inkLine(g, [0,214, 480,214], 1, 2); inkHatch(g, 0, 214, 480, 56, 8, M5_INK, 0.14);
    m5Biped(g, 54, 214, 1.15, false); m5DroneLanded(g, 126, 214, 1.1, false); m5Biped(g, 206, 214, 1.0, false);
    m5DroneLanded(g, 330, 214, 1.1, false); m5Biped(g, 410, 214, 1.15, false); m5DroneLanded(g, 454, 214, 0.9, t < 3.2);       // l'un des drones garde son œil, qui s'éteint
    inkFolk(g, 262, 214, 44, M5_INK, 0); inkFolk(g, 292, 214, 36, M5_INK, 0);
    plateEnd(g, w, h); },
  // A3 · La cendre : une cour de ferme, quelqu'un qui balaie, la cendre qui tombe
  ash(g, w, h, t){ plateBase(g, w, h, 'rgba(120,120,120,0.16)');
    const n = clamp(t/1.2, 0, 1);
    inkLine(g, [0,214, 480,214], 1, 2); inkHatch(g, 0, 214, 480, 56, 8, M5_INK, 0.16);
    const fa = [60,214, 60,112, 300,112, 300,214]; inkWash(g, fa, '#8a8478', 0.5); m5Loop(g, fa, n, 2.4); inkLine(g, [50,112, 180,66, 310,112], n, 2.4);                  // la façade basse et son toit
    inkWash(g, [50,112, 180,66, 310,112], M5_INK, 0.35);
    const dr = [160,214, 160,150, 200,150, 200,214]; inkWash(g, dr, '#5a5040', 0.7); m5Loop(g, dr, n, 1.8); for (const wx of [86,236]){ inkWash(g, [wx,166, wx,138, wx+34,138, wx+34,166], '#2c3846', 0.7); m5Loop(g, [wx,166, wx,138, wx+34,138, wx+34,166], n, 1.6); }
    const sw = Math.sin(t*1.6);                                                                                                        // le balai va et vient
    inkFolk(g, 360, 214, 44, M5_INK, 0); inkLine(g, [366,190, 340+sw*10,212], 1, 2); inkLine(g, [332+sw*10,214, 348+sw*10,214], 1, 3);
    for (let i=0;i<5;i++) inkLine(g, [320+sw*10+i*2, 214, 312+sw*10-i*3, 218+i%2], 1, 1, 'rgba(60,56,50,0.5)');
    m5Flakes(g, t, 30, 'rgba(70,66,60,0.7)', 14, 5);
    plateEnd(g, w, h); },
  // A4 · La boîte à biscuits : les cinq cahiers, le bipeur ; le couvercle se referme lentement
  box(g, w, h, t){ plateBase(g, w, h, 'rgba(60,40,20,0.06)');
    const gl = g.createLinearGradient(0,0,200,200); gl.addColorStop(0,'rgba(232,165,60,0.25)'); gl.addColorStop(1,'rgba(232,165,60,0)'); g.fillStyle = gl; g.fillRect(0,0,300,220);
    inkLine(g, [20,200, 460,200], 1, 2.6); inkHatch(g, 20, 200, 440, 60, 7, M5_INK, 0.22);
    g.fillStyle = 'rgba(120,118,112,0.45)'; g.beginPath(); g.ellipse(240, 180, 90, 28, 0, 0, 6.283); g.fill(); g.fillRect(150, 150, 180, 30);
    g.strokeStyle = M5_INK; g.lineWidth = 2.4; g.beginPath(); g.moveTo(150,150); g.lineTo(150,180); g.moveTo(330,150); g.lineTo(330,180); g.stroke(); g.beginPath(); g.ellipse(240,180,90,28,0,0,Math.PI); g.stroke();
    for (let i=0;i<5;i++){ const y = 168 - i*9, r = [150,200]; inkWash(g, [172+(i%2)*6,y, 176+(i%2)*6,y-8, 304+(i%2)*4,y-8, 308+(i%2)*4,y], i%2? '#d8c8a0' : '#e9dfc6', 0.95); m5Loop(g, [172+(i%2)*6,y, 176+(i%2)*6,y-8, 304+(i%2)*4,y-8, 308+(i%2)*4,y], 1, 1.4); }
    m5Txt(g, 'GERMINAL — 5', 240, 119, 10, M5_INK);
    g.fillStyle = 'rgba(120,118,112,0.5)'; g.beginPath(); g.ellipse(240, 150, 90, 24, 0, 0, 6.283); g.fill();
    inkWash(g, [350,200, 354,170, 392,170, 396,200], '#23292b', 0.92); m5Loop(g, [350,200, 354,170, 392,170, 396,200], 1, 1.6); inkWash(g, [358,176, 388,176, 388,188, 358,188], '#6f7f6c', 1);   // le bipeur éteint
    const k = clamp((t-1.2)/4, 0, 1), ly = lerp(88, 150, k*k*(3-2*k));                                                                  // le couvercle descend
    if (k>0){ g.fillStyle = 'rgba(132,130,124,0.97)'; g.beginPath(); g.ellipse(240, ly, 92, 28, 0, 0, 6.283); g.fill(); g.strokeStyle = M5_INK; g.lineWidth = 2.6; g.stroke();
      g.beginPath(); g.ellipse(240, ly, 60, 16, 0, 0, 6.283); g.strokeStyle = 'rgba(31,27,23,0.5)'; g.lineWidth = 1.2; g.stroke(); }
    plateEnd(g, w, h); },
  // A5 · Le mot : un petit papier plié glissé dans le carnet, le bipeur éteint dessus ; « Répondez poliment. » s'écrit au crayon rouge
  word(g, w, h, t){ plateBase(g, w, h, 'rgba(232,165,60,0.10)');
    const n = clamp(t/1.2, 0, 1);
    const l = [40,220, 50,60, 236,70, 240,226], r = [240,226, 236,70, 430,60, 440,220];
    inkWash(g, l, '#efe6cf', 0.95); m5Loop(g, l, n, 2); inkWash(g, r, '#efe6cf', 0.95); m5Loop(g, r, n, 2); inkLine(g, [238,70, 240,226], n, 2.4);              // le carnet ouvert
    for (let y=96;y<210;y+=22){ inkLine(g, [60,y, 220,y+2], n, 0.8, '#b9a98a'); }
    { g.save(); g.translate(330, 140); g.rotate(-0.1);
      inkWash(g, [-78,-56, 78,-56, 78,56, -78,56], '#fbf6e6', 1); m5Loop(g, [-78,-56, 78,-56, 78,56, -78,56], n, 1.6); inkLine(g, [-78,0, 78,0], n, 0.8, '#d8c8a0');   // le papier plié
      const s = cT(M5_TX.pNote), ch = Math.floor(Math.max(0, t-1.4)*11);
      if (ch>0){ g.fillStyle = M5_RED; g.font = 'italic 700 '+(SETTINGS.lang==='ru'? 13 : 14)+'px Georgia,serif'; g.textAlign = 'center'; g.fillText(s.slice(0, ch), 0, 4); }
      g.restore(); }
    inkWash(g, [70,200, 72,160, 128,160, 130,200], '#23292b', 0.92); m5Loop(g, [70,200, 72,160, 128,160, 130,200], n, 1.6); inkWash(g, [78,168, 122,168, 122,184, 78,184], '#6f7f6c', 1);   // le bipeur éteint
    plateEnd(g, w, h); },
  // A6 · Un réverbère : la rue des Tanneurs, un seul réverbère allumé, trois silhouettes dessous
  lamp(g, w, h, t){ plateBase(g, w, h, 'rgba(30,40,70,0.30)');
    const n = clamp(t/1.2, 0, 1), fl = 0.88 + 0.08*Math.sin(t*9) + 0.04*Math.sin(t*23);
    inkLine(g, [0,226, 480,226], 1, 2.4); inkHatch(g, 0, 226, 480, 44, 7, M5_INK, 0.22);
    const L = [[0,226, 0,70, 96,70, 96,226], [96,226, 96,96, 168,96, 168,226]], R = [[312,226, 312,100, 392,100, 392,226], [392,226, 392,60, 480,60, 480,226]];            // les façades abîmées
    for (const b of L.concat(R)){ inkWash(g, b, M5_INK, 0.6); m5Loop(g, b, n, 2); }
    for (const [x,y] of [[20,100],[56,100],[112,126],[336,130],[420,92],[450,150]]){ g.fillStyle = 'rgba(31,27,23,0.9)'; g.fillRect(x, y, 16, 22); }
    inkLine(g, [60,70, 70,52, 78,70], n, 1.8); inkLine(g, [420,60, 440,42, 470,60], n, 1.8);                                           // toits éventrés
    inkLine(g, [240,226, 240,92], n, 3); inkLine(g, [240,92, 252,86, 262,90], n, 2.4); g.fillStyle = 'rgba(255,224,150,'+fl.toFixed(2)+')'; g.beginPath(); g.ellipse(262, 94, 8, 5, 0, 0, 6.283); g.fill();   // le réverbère
    m5Cone(g, 262, 98, 150, 130, 0.42*fl, '232,165,60');
    for (const [x,s] of [[236,30],[262,34],[286,28]]) inkFolk(g, x, 226, s, M5_INK, 0);
    plateEnd(g, w, h); },
  // D2 · Les câbles : cinq gros câbles sortent de la tour, deux personnes les coupent un à un ; un liseré bleu s'éteint à chaque coupure
  cables(g, w, h, t){ plateBase(g, w, h, 'rgba(255,255,255,0.14)');
    inkLine(g, [0,230, 480,230], 1, 2.4); inkHatch(g, 0, 230, 480, 40, 7, M5_INK, 0.2);
    const tw = [366,230, 366,14, 480,14, 480,230]; inkWash(g, tw, '#2c3038', 0.85); m5Loop(g, tw, 1, 2.6);
    for (let i=0;i<5;i++){ const cut = t > 0.8 + i*0.7, y = 70 + i*28; g.fillStyle = cut? 'rgba(40,52,64,0.9)' : 'rgba(120,214,250,0.95)'; g.fillRect(372, 24 + i*40, 4, 28); }    // les liserés bleus
    for (let i=0;i<5;i++){ const y0 = 70 + i*28, cut = t > 0.8 + i*0.7, cp = [[366,y0],[300,y0+10+i*4],[210,y0+30],[120,y0+34+i*8],[10,y0+36+i*10]];
      g.strokeStyle = M5_INK; g.lineWidth = 7; g.lineCap = 'round';
      if (!cut){ g.beginPath(); g.moveTo(cp[0][0],cp[0][1]); g.bezierCurveTo(cp[1][0],cp[1][1], cp[2][0],cp[2][1], cp[4][0],cp[4][1]); g.stroke(); }
      else { g.beginPath(); g.moveTo(cp[0][0],cp[0][1]); g.bezierCurveTo(cp[1][0],cp[1][1], 270,y0+16, 250,y0+22); g.stroke();                                                    // le tronçon central a disparu
        g.beginPath(); g.moveTo(150,y0+34+i*3); g.bezierCurveTo(100,y0+34+i*6, 60,y0+38+i*8, 10,y0+36+i*10); g.stroke(); }
      g.strokeStyle = 'rgba(233,223,198,0.5)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cp[0][0],cp[0][1]-2); g.bezierCurveTo(cp[1][0],cp[1][1]-2, cp[2][0],cp[2][1]-2, 330,y0-1); g.stroke(); }
    inkFolk(g, 190, 230, 34, M5_INK, 0); inkFolk(g, 232, 230, 36, M5_INK, 0); inkLine(g, [200,206, 218,176], 1, 2.4); inkLine(g, [208,206, 224,176], 1, 2.4); inkLine(g, [240,208, 262,176], 1, 2.4); inkLine(g, [248,208, 266,180], 1, 2.4);   // les grandes pinces
    plateEnd(g, w, h); },
  // D3 · La table et la lampe : devant la porte de la tour, la nuit ; Sol veille, un papillon tourne autour de la lampe
  table(g, w, h, t){ plateBase(g, w, h, 'rgba(14,20,44,0.34)');
    inkLine(g, [0,232, 480,232], 1, 2.4); inkHatch(g, 0, 232, 480, 38, 7, M5_INK, 0.28);
    const dr = [190,232, 190,20, 480,20, 480,232]; inkWash(g, dr, '#14181e', 0.78); m5Loop(g, dr, 1, 2.6); inkLine(g, [335,20, 335,232], 1, 1.6, '#6a7a8c');          // la porte de la tour, au fond
    const tb = [60,232, 60,172, 190,172, 190,232]; inkWash(g, tb, '#4a3c2c', 0.55); inkLine(g, [50,172, 200,172], 1, 3); inkLine(g, [62,172, 62,232], 1, 2); inkLine(g, [188,172, 188,232], 1, 2);   // la table
    inkLine(g, [172,172, 172,148], 1, 1.8); inkWash(g, [158,136, 186,136, 182,148, 162,148], M5_INK, 0.85);                                    // la lampe de bureau
    m5Cone(g, 172, 148, 150, 86, 0.42, '232,165,60'); g.fillStyle = 'rgba(255,230,160,0.95)'; g.beginPath(); g.ellipse(172, 150, 7, 3, 0, 0, 6.283); g.fill();
    inkWash(g, [78,172, 82,148, 126,148, 130,172], '#34403a', 0.9); m5Loop(g, [78,172, 82,148, 126,148, 130,172], 1, 1.6); g.fillStyle = 'rgba(232,165,60,0.5)'; g.beginPath(); g.arc(114,160,6,0,6.283); g.fill(); inkLine(g, [92,148, 92,122], 1, 1.4);   // le poste radio
    inkLine(g, [40,232, 44,206, 70,206, 72,232], 1, 2);                                                                                  // la chaise
    inkFolk(g, 102, 232, 40, '#3a342c', 0); inkWash(g, [96,198, 108,198, 106,204, 98,204], M5_RED, 0.95); g.strokeStyle = M5_INK; g.lineWidth = 1.6; g.beginPath(); g.arc(102, 196, 6, Math.PI, 0); g.stroke();   // Sol, voûtée, casque radio
    const a = t*2.2, mx = 172 + Math.cos(a)*22, my = 134 + Math.sin(a*1.3)*10, fl = Math.sin(t*30)*3;                                       // le papillon de nuit
    g.fillStyle = '#e9dfc6'; g.beginPath(); g.moveTo(mx,my); g.lineTo(mx-6,my-3-fl); g.lineTo(mx-5,my+2); g.closePath(); g.fill(); g.beginPath(); g.moveTo(mx,my); g.lineTo(mx+6,my-3+fl); g.lineTo(mx+5,my+2); g.closePath(); g.fill();
    plateEnd(g, w, h); },
  // D4 · Bien des hivers plus tard (v1.17 : plus de date sur la planche) : la table de garde, usée ; le bipeur s'allume et clignote « 55 »
  eleven(g, w, h, t){ plateBase(g, w, h, 'rgba(14,20,44,0.38)');
    const on = t > 1.5;
    inkLine(g, [10,232, 470,232], 1, 3); inkHatch(g, 10, 232, 460, 38, 7, M5_INK, 0.3);
    m5Cone(g, 90, 36, 190, 196, 0.34, '232,165,60'); inkLine(g, [90,232, 90,110], 1, 2.6); inkLine(g, [90,110, 110,80, 150,72], 1, 2.6); inkWash(g, [140,64, 176,66, 170,86, 144,84], M5_INK, 0.9);     // la lampe
    inkNotebook(g, 290, 232, 310, 1);                                                                                                         // le carnet, à plat ; le bipeur est posé dessus
    const pg = inkPager(g, 300, 220, 150, { fill: on? '#9db79a' : '#2c3a30', led: on? M5_BLUE : null });
    if (on){ const bl = Math.sin(t*5) > -0.3; if (bl) m5Txt(g, '55', pg.cx, pg.cy+13, 38, '#1b2a1c');
      for (let i=0;i<3;i++){ const r = ((t*0.8+i/3)%1); g.strokeStyle = 'rgba(11,111,168,'+(0.55*(1-r)).toFixed(2)+')'; g.lineWidth = 1.8; g.beginPath(); g.arc(300, pg.top+30, 70+r*50, 3.7, 5.7); g.stroke(); } }
    plateEnd(g, w, h); },
  // D5 · L'aube sur la plaine : la tour éteinte au loin, des champs, de jeunes arbres, le soleil qui monte derrière elle
  sunrise(g, w, h, t){ plateBase(g, w, h, 'rgba(240,170,130,0.14)');
    const k = clamp(t/6, 0, 1), HY = 170, sy = HY - 4 + 0*k - 14*k;
    const gl = g.createRadialGradient(330, HY, 6, 330, HY, 150); gl.addColorStop(0,'rgba(255,200,130,'+(0.45*k+0.15).toFixed(2)+')'); gl.addColorStop(1,'rgba(255,200,130,0)'); g.fillStyle = gl; g.fillRect(150, 20, 360, 190);
    g.save(); g.beginPath(); g.rect(0, 0, 480, HY); g.clip();                                                                              // le soleil se lève derrière la tour
    g.fillStyle = 'rgba(244,160,110,0.85)'; g.beginPath(); g.arc(330, sy+14, 46, 0, 6.283); g.fill(); g.strokeStyle = M5_INK; g.lineWidth = 1.4; g.stroke(); g.restore();
    inkLine(g, [0,HY, 480,HY], 1, 2);
    for (let i=0;i<4;i++){ const y = HY+8+i*8; inkLine(g, [i*8, y, 480-i*8, y], 1, 0.8, 'rgba(31,27,23,'+(0.14+i*0.04).toFixed(2)+')'); }          // les sillons des champs
    // la tour de la citadelle, éteinte : un dôme bas, un fût large qui s'affine, une coupole et une lame au sommet (même silhouette que M4-citadel)
    const TX = 330, dm = []; for (let i=0;i<=20;i++){ const a = Math.PI*(1 - i/20); dm.push(TX+84*Math.cos(a), HY-30*Math.sin(a)); }
    g.fillStyle = '#3b3a3c'; g.beginPath(); dm.forEach((v,i)=>{ if (i%2===0) i? g.lineTo(v, dm[i+1]) : g.moveTo(v, dm[i+1]); }); g.closePath(); g.fill(); inkLine(g, dm, 1, 1.8);
    const fut = [TX-17,HY-26, TX-7,66, TX+7,66, TX+17,HY-26];                                                                               // le fût : large à la base, fin en haut
    inkWash(g, fut, '#2a2a2c', 0.95); inkLine(g, fut, 1, 1.8);
    for (const by of [112, 90]) inkLine(g, [TX-8-(by-66)*0.12, by, TX+8+(by-66)*0.12, by], 1, 0.9, 'rgba(233,223,198,0.5)');               // deux bandes de coursive, éteintes
    const cap = []; for (let i=0;i<=10;i++){ const a = Math.PI*(1 - i/10); cap.push(TX+11*Math.cos(a), 66-8*Math.sin(a)); }
    g.fillStyle = '#2a2a2c'; g.beginPath(); cap.forEach((v,i)=>{ if (i%2===0) i? g.lineTo(v, cap[i+1]) : g.moveTo(v, cap[i+1]); }); g.closePath(); g.fill(); inkLine(g, cap, 1, 1.6);   // la coupole
    inkWash(g, [TX-2.6,60, TX,30, TX+2.6,60], '#2a2a2c', 0.95); inkLine(g, [TX-2.6,60, TX,30, TX+2.6,60], 1, 1.4);                            // la lame
    for (const [sx, sy, dir, len, ph] of [[TX-6,76,-1,56,0],[TX+6,84,1,66,1.4],[TX-7,100,-1,38,2.6]]){                                      // trois câbles coupés qui pendent, en courbes souples
      const sw = Math.sin(t*1.1+ph)*2.4, ex = sx+dir*(7+len*0.14)+sw, ey = sy+len;
      g.strokeStyle = M5_INK; g.lineWidth = 2.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx, sy);
      g.bezierCurveTo(sx+dir*5, sy+len*0.3, ex+dir*4, ey-len*0.38, ex, ey); g.stroke();
      g.fillStyle = '#e9dfc6'; g.fillRect(ex-1.8, ey-0.5, 3.6, 3.2); g.strokeStyle = M5_INK; g.lineWidth = 0.8; g.strokeRect(ex-1.8, ey-0.5, 3.6, 3.2); }   // l'extrémité tranchée
    for (const [x, y, s, v] of [[236,178,0.55,2],[266,181,0.62,0],[408,181,0.6,1],[446,179,0.58,2],[464,184,0.7,0]]) m5Sapling(g, x, y, s, v);   // jeunes arbres du fond, posés sur le sol
    inkLine(g, [0,232, 480,232], 1, 2.4); inkHatch(g, 0, 232, 480, 38, 7, M5_INK, 0.2);
    for (const [x, y, s, v] of [[300,205,0.95,1],[368,212,1.2,0],[426,208,0.85,2],[452,224,1.35,1]]) m5Sapling(g, x, y, s, v);                  // au milieu et devant
    inkLine(g, [14,176, 184,176], 1, 4); inkWash(g, [14,176, 184,176, 184,184, 14,184], '#4a3c2c', 0.55); inkLine(g, [26,184, 26,232], 1, 3); inkLine(g, [172,184, 172,232], 1, 3);   // la table
    const lx = 140; inkLine(g, [lx,176, lx-4,146, lx+10,124], 1, 2.4); inkWash(g, [lx-1,112, lx+25,118, lx+18,130, lx+2,124], M5_INK, 0.9);   // la lampe de bureau, allumée
    m5Cone(g, lx+10, 128, 110, 50, 0.7, '232,165,60'); g.fillStyle = 'rgba(255,214,130,0.95)'; g.beginPath(); g.ellipse(lx+10, 128, 8, 3, 0, 0, 6.283); g.fill();
    inkLine(g, [lx-12,176, lx+12,176], 1, 4);
    inkWash(g, [40,176, 44,166, 90,166, 94,176], '#efe6cf', 0.9); inkLine(g, [40,176, 44,166, 90,166, 94,176], 1, 1.4);                       // le carnet fermé, sur la table
    inkLine(g, [196,232, 198,206, 238,206, 240,232], 1, 2.4); inkLine(g, [198,206, 196,150], 1, 3); inkLine(g, [197,164, 226,164], 1, 2.4); inkLine(g, [196,186, 222,186], 1, 2);   // la chaise vide
    for (let i=0;i<3;i++){ const bx = 120 + i*38 + t*5, by = 58 + (i%2)*16 + Math.sin(t*2+i)*2; inkLine(g, [bx-7,by-3, bx,by+2, bx+7,by-3], 1, 1.6); }                // trois oiseaux
    plateEnd(g, w, h); },
  // F · La radio qui grésille : le poste de Sol, seul sur la plaine, les ondes rouges de plus en plus faibles
  radio(g, w, h, t){ plateBase(g, w, h, 'rgba(30,26,22,0.35)');
    inkLine(g, [0,214, 480,214], 1, 2.2); inkHatch(g, 0, 214, 480, 56, 8, M5_INK, 0.2);
    const rd = [180,214, 184,150, 300,150, 304,214]; inkWash(g, rd, '#3d4a3a', 0.85); m5Loop(g, rd, 1, 2.4);                                    // le poste
    g.strokeStyle = M5_INK; g.lineWidth = 2; g.beginPath(); g.arc(222,186,18,0,6.283); g.stroke(); g.beginPath(); g.arc(222,186,6,0,6.283); g.stroke();   // le cadran
    for (let x=254;x<294;x+=7) inkLine(g, [x,164, x,208], 1, 1.2);                                                                      // la grille
    inkLine(g, [290,150, 330,70], 1, 2); g.fillStyle = M5_INK; g.beginPath(); g.arc(331,68,2.4,0,6.283); g.fill();                         // l'antenne
    const on = Math.sin(t*3.1) > 0.2 - 0.5*Math.min(1, t/8); g.fillStyle = on? M5_RED : 'rgba(196,42,28,0.25)'; g.beginPath(); g.arc(206,160,3.4,0,6.283); g.fill();   // le voyant rouge
    for (let i=0;i<3;i++){ const ph = ((t*0.45 + i/3)%1), a = Math.max(0, 0.7*(1-ph))*Math.max(0.15, 1 - t/14)*(Math.sin(t*5+i*2) > -0.2? 1 : 0.2);
      g.strokeStyle = 'rgba(196,42,28,'+a.toFixed(2)+')'; g.lineWidth = 2; g.beginPath(); g.arc(331, 68, 10+ph*60, -2.2, -0.5); g.stroke(); }
    m5Flakes(g, t, 26, 'rgba(70,64,58,0.6)', 12, 4);
    inkLine(g, [60,214, 72,204, 90,214], 1, 1.4); inkLine(g, [380,214, 396,206, 420,214], 1, 1.4);
    plateEnd(g, w, h); },
};

/* ================= CINÉMATIQUES : ouverture, passages d'acte, choix, fins, échec ================= */
const m5Later = (fn, dt) => (g, w, h, t, k) => fn(g, w, h, t + dt, k);                         // une planche qui continue d'un plan à l'autre
const m5Boom = (g, n, col) => () => { for (let i=0;i<n;i++) setTimeout(() => { if (game===g){ explode(g.e.x-130+Math.random()*220, gY(g.e.x)-20-Math.random()*90, 1.7, col || '#ffb060'); sfx('boom'); g.shake = 10; } }, i*380); };
function m5CineBefore(g, c, a){
  if (a===2) return [
    { cam:{ x:g.e.x-100, t:1.4 }, dur:3, mus:'m_citadel', fx:m5Boom(g, 5), who:'malik', txt:M5_L.t1 },                       // T1 : la porte explose
    { plate:M5_PLATES.breach, mus:'c_hope', who:'nar', txt:M5_L.t2 } ];                                                            // T2 : la brèche + bilan
  return [
    { cam:{ x:g.e.x-100, t:1.4 }, dur:3, mus:'m_citadel', fx:m5Boom(g, 6, '#cfe6ff'), who:'sol', txt:M5_L.t7 },                  // T7 : la porte du noyau cède
    { plate:M5_PLATES.silence, mus:null, who:'nar', txt:M5_L.t8 } ];                                                              // T8 : le silence + bilan
}
function m5CineAfter(g, c, a){
  const p = g.p, e = g.e;
  if (a===2) return [
    { cam:{ x:g.zones[0].x, t:2.4 }, who:'malik', txt:M5_L.t4 },
    { cam:{ x:e.x-130, t:2.8 }, who:'sol', txt:M5_L.t5 },
    { cam:{ x:p.x+230, t:2.4 }, who:'sol', txt:M5_L.t6 } ];
  return [
    { cam:{ x:e.x-160, t:2.6 }, who:'nous', txt:M5_L.t10 },
    { cam:{ x:g=> c.avatar? c.avatar.x : e.x-100, t:1.8 }, who:'sol', txt:M5_L.t11 },
    { cam:{ x:p.x+560, t:1.6 }, who:'sol', txt:M5_L.t12, fx(g, c){ c.demoRw = { x:p.x+560, t:0, t0:performance.now(), warn:2.4, done:false }; } },     // la bande s'allume, puis s'éteint
    { cam:{ x:p.x+230, t:2.4 }, who:'sol', txt:M5_L.t13, fx(g, c){ c.demoRw = null; } } ];
}
function m5Intro(g, c){
  const P = M5_PLATES, p = g.p;
  if (c.resumed){ const a = c.resumed;
    return [ { cam:{ x:p.x+230, t:0.1 }, dur:3.2, mus:a===3? 'm_finale' : 'm_citadel', title:a===1? M5_L.o5t : a===2? M5_L.t3t : M5_L.t9t, sub:a===1? M5_L.o5s : a===2? M5_L.t3s : M5_L.t9s },
             { cam:{ x:p.x+230 }, who:'sol', txt:a===1? M5_L.o6 : a===2? M5_L.t6 : M5_L.t13 } ]; }
  return [
    { plate:P.plain, mus:'c_dread', who:'nar', txt:M5_L.o1a },                                                                      // O1
    { plate:m5Later(P.plain, 7), who:'nar', txt:M5_L.o1b },
    { plate:P.offer, who:'nous', txt:M5_L.o2 },                                                                                    // O2
    { plate:P.vote, mus:'c_sorrow', who:'sol', txt:M5_L.o3a },                                                                      // O3
    { plate:m5Later(P.vote, 6), who:'sol', txt:M5_L.o3b },
    { plate:P.doors, mus:'c_hope', who:'nar', txt:M5_L.o4 },                                                                       // O4
    { cam:{ x:p.x+230, t:0.1 }, dur:3.6, mus:'m_citadel', title:M5_L.o5t, sub:M5_L.o5s },                                           // O5 : le carton
    { cam:{ x:p.x+230, t:0.1 }, who:'sol', txt:M5_L.o6 },                                                                           // O6-O11 : visite du mur
    { cam:{ x:M5.wallX[0], t:3.2 }, who:'malik', txt:M5_L.o7 },
    { cam:{ x:M5.gateX-60, t:2.4 }, who:'malik', txt:M5_L.o8 },
    { cam:{ x:M5.gateX-60 }, who:'malik', txt:M5_L.o9 },
    { cam:{ x:p.x+230, t:3.2 }, who:'sol', txt:M5_L.o10 },
    { cam:{ x:p.x+230 }, who:'sol', txt:M5_L.o11 } ];
}
function m5Outro(g, c, win){
  const P = M5_PLATES;
  if (!win){
    if (M5_CK){ M5_CK.fail = c.D.i < 2; if (c.D.i>=2) M5_CK = null; }                                                              // Récit et Lutte : on reprendra au début de l'acte
    return [ { plate:P.radio, mus:'c_sorrow', who:'nar', txt:M5_L.fe1 }, { plate:m5Later(P.radio, 4), who:'sol', txt:M5_L.fe2 } ]; }
  M5_CK = null;
  const self = { fall:() => m5EndFall(g, c), watch:() => m5EndWatch(g, c) };
  return [
    { cam:{ x:g.e.x-120, t:1.6 }, dur:3.4, mus:null, who:'sol', txt:M5_L.cc1,                                                      // C1 : tout s'arrête
      fx(g, c){ for (const u of g.e.units) u.ord = 'hold'; } },
    { plate:P.circles, mus:'c_dread', who:'nous', txt:M5_L.cc2a },                                                                  // C2 : l'offre amendée
    { plate:m5Later(P.circles, 4), who:'nous', txt:M5_L.cc2b },
    { plate:m5Later(P.circles, 8), who:'sol', txt:M5_L.cc2c },
    { plate:m5Later(P.circles, 12), who:'sol', txt:M5_L.cc2d,                                                                      // C3 : le choix (PASSER s'arrête ici)
      choice:[
        { label:M5_TX.chA, sub:M5_TX.chAs, ink:'#c42a1c', pick(g, c){ c.ending = 'fall'; }, then:() => self.fall() },
        { label:M5_TX.chB, sub:M5_TX.chBs, ink:'#0b6fa8', pick(g, c){ c.ending = 'watch'; c.m = Object.assign(Object.create(c.m), { debrief:M5_TX.debriefDawn }); }, then:() => self.watch() } ] } ];
}
function m5EndFall(g, c){ const P = M5_PLATES; return [
  { cam:{ x:g.e.x-90, t:1.2 }, dur:3.8, mus:'e_ash', who:'sol', txt:M5_L.fa1,                                                      // A1 : la tour s'effondre
    fx(g, c){ c.endFx = 'fall'; c.endT0 = performance.now(); g.flash = 1.4; for (let i=0;i<9;i++) setTimeout(() => { if (game===g){ explode(g.e.x-90+Math.random()*180, gY(g.e.x)-30-Math.random()*200, 2, '#eef6fa'); sfx('boom'); g.shake = 12; } }, i*340); } },
  { plate:P.tools, who:'nar2', txt:M5_L.fa2a },                                                                                     // A2
  { plate:m5Later(P.tools, 5), who:'nar2', txt:M5_L.fa2b },
  { plate:P.ash, who:'nar2', txt:M5_L.fa3 },                                                                                       // A3
  { plate:P.box, who:'nar2', txt:M5_L.fa4 },                                                                                       // A4
  { plate:P.word, who:'nar2', txt:M5_L.fa5 },                                                                                      // A5
  { plate:P.lamp, who:'nar2', txt:M5_L.fa6 } ]; }                                                                                  // A6
function m5EndWatch(g, c){ const P = M5_PLATES; return [
  { cam:{ x:g.e.x-90, t:0.1 }, dur:3.6, mus:'e_dawn', who:'sol', txt:M5_L.fd1,                                                      // D1 : les liserés s'éteignent un à un
    fx(g, c){ c.endFx = 'dawn'; c.endT0 = performance.now(); g.flash = 0.5; sfx('cap'); camFollow = false; } },
  { plate:P.cables, who:'nar', txt:M5_L.fd2 },                                                                                     // D2
  { plate:P.table, who:'nar', txt:M5_L.fd3a },                                                                                     // D3
  { plate:m5Later(P.table, 6), who:'sol', txt:M5_L.fd3b },
  { plate:P.eleven, who:'nar', txt:M5_L.fd4 },                                                                                     // D4
  { plate:P.sunrise, who:'nar', txt:M5_L.fd5 } ]; }                                                                                // D5

/* ================= LA MISSION ================= */
const m5Ok1 = c => c.sapLost===0;
const m5Ok2 = c => c.hallsAt==null? (c.act<2? true : c.act===2? (c.t - c.t0) <= 300 : false) : c.hallsAt <= 300;
const m5Ok3 = c => !c.lifeLost;
campMission(4, {
  num:'V', when:M5_TX.when,
  title:M5_TX.title, place:M5_TX.place,
  recap:M5_TX.recap, where:M5_TX.where, goal:M5_TX.goal, goal2:M5_TX.goal2, rule:M5_TX.rule, tips:M5_TX.tips,
  docWhy:{ veterans:M5_TX.whyVet, radio:M5_TX.whyRadio },
  debrief:M5_TX.debrief, fail:M5_TX.fail,
  resume(){ const ck = M5_CK, i = CAMP_SAVE.diff; return (ck && ck.fail && ck.d===i && i<2 && ck.doc===(CAMP_SAVE.doc[4]? 1 : 0))? { key:'resumeA', n:ck.act } : null; },
  resumeClear(){ M5_CK = null; },
  ownBase:true,                                                   // drawBase enveloppé : pas de halos de fenêtres de l'escarmouche (drawBaseGlow)
  biome:'citadel', theme:'citadel1', ai:[0,2,3], doctrines:['veterans','radio'], dev0:0.1, era0:2, eraCap:4, oneLife:false,
  dm:[{ inc:0.2, cheat:0.55 }, { inc:0.28, cheat:0.65 }, { inc:0.31, cheat:0.7, eraLag:0.75, think:1.3 }],
  dAdj:[{ res:1.2 }, null, { res:0.85, wave:1, eHp:1.05, eDmg:1.05, base:1.1 }],   // Dernier carré : dotations x 0,85 ; sorties et machines moins gonflées que le modèle commun (le bench à l'acte I s'enlisait)                                                                  // dotations × 1,2 / × 1 / × 0,85 (fiche § 3)
  map:M5_MAPS[0],
  action:{ label:M5_TX.call, cd:60,
    can(g, c){ return c.cellsLeft > 0 && !CINE.on; },
    use(g, c){ m5Cell(g, c); c.actCd = M5.call[c.D.i]*(c.actMul||1); } },
  setup(g, c){
    const p = g.p, e = g.e;
    c.sapLost = 0; c.lifeLost = false; c.fired = c.fired || [];
    campGrant(p, M5.dot[0][0], M5.dot[0][1], M5.dot[0][2]); campGrant(e, 300, 300, 100);
    e.heroCd = 1e9;
    c.ending = null; c.endFx = null;
    if (m5Resume(g, c)){ this.light(g, c); return; }
    p.maxhp = p.hp = campHp(M5.hp.base, 'p');
    m5Init(g, c, 1, null);
    this.light(g, c);
  },
  light(g, c){ m5Light(g, c); },
  intro(g, c){ return m5Intro(g, c); },
  outro(g, c, win){ return m5Outro(g, c, win); },
  draw(g, c, vw){ m5Draw(g, c, vw); },
  drawZone(z, t, vw){ m5DrawZone(z, t, vw); },
  drawObj(o, t, vw){ m5DrawObj(o, t, vw); },
  tick(g, c, dt){
    if (c.actPending) return;
    const p = g.p, e = g.e, D = c.D.i, a = c.act, T = c.t;
    e.f = e.m = e.w = 0; if (a<3) g.cataCd = 1e9;                                                      // la citadelle n'achète rien : tout ce qui en sort est écrit ici
    // l'adversaire ne prend jamais plus d'une ère d'avance (vX au bout de 3 minutes à l'acte I)
    const era = Math.min(a===1? ((T-c.t0) < 180? 2 : 3) : a===2? 3 : 4, p.era + 1); if (e.era!==era) e.era = era;
    if (e.specialCd > (c.eSp||0) + 1) e.specialCd = M5.spCd[D];                                         // leurs frappes d'ère sont plus rares ici
    c.eSp = e.specialCd; e.lastUsed = true;
    m5Scale(g, c);
    // les cellules alliées
    if (c.cellsLeft > 0 && T >= c.cellT) m5Cell(g, c);
    // les sorties de la base adverse (à l'acte III : tant que l'avatar marche)
    const sortieOn = a<3 || m5AvAlive(g, c);
    if (sortieOn && c.warnLead && !c.sortieWarned && T >= c.sortieT - c.warnLead){ c.sortieWarned = true; c.warnMark = { x:e.x-60, t1:g.t + c.warnLead + 1.2 }; sfx('deny'); }
    if (T >= c.sortieT){ c.sortieT = T + M5.sortie[D]*(a===1 && c.gateOpen? 1.6 : 1) /* porte éventrée : renforts plus rares */; c.sortieWarned = false; if (sortieOn) m5Sortie(g, c); }
    // une vie de moins : le camp est relevé
    if (p.phase>=2 && !c.lifeSaid){ c.lifeSaid = true; c.lifeLost = true; campRadio('sol', M5_L.life); }
    // règles de l'acte
    if (a===1){
      m5Saps(g, c, dt); m5Batts(g, c, dt); m5Form(g, c);
      if (!c.firing && !c.gateOpen && c.charges >= M5.need[D]){ c.firing = T; sfx('boom'); g.shake = Math.max(g.shake, 6); }       // mise à feu
      if (c.firing && !c.gateOpen && T - c.firing >= 2){ c.gateOpen = true; c.shield = null; e.hp -= e.maxhp*0.25; c.lastE = e.hp; g.shake = 14; g.flash = Math.max(g.flash||0, 0.6); sfx('boom');
        for (let i=0;i<4;i++) explode(e.x-60+Math.random()*120, gY(e.x)-20-Math.random()*70, 1.5, '#ffb060'); }
    } else if (a===2){ m5Halls(g, c, dt);
    } else {
      m5Rewrite(g, c, dt);
      const alive = m5AvAlive(g, c);
      if (c.avatar && !alive && !c.avFell){ c.avFell = true; c.avFellAt = T; if (D===2 && c.avBackN===0) c.avBack = T + 60; }          // l'avatar est tombé
      if (c.avBack!=null && T >= c.avBack){ c.avBack = null; c.avBackN++; m5Avatar(g, c, 0.5); c.avFell = false; }                     // Dernier carré : il revient une fois, à 50 %
      if (alive && !c.avHalf && c.avatar.hp < c.avatar.maxhp*0.5){ c.avHalf = true; c.avHalfN = (c.avHalfN|0)+1; }
    }
    // la porte (ou le noyau) : invulnérable tant que la règle de l'acte n'est pas remplie ; la tour se répare tant que l'avatar marche
    const k = (a===1 && !c.gateOpen) || (a===2 && c.owned<3)? 0 : M5.armor[a-1];       // la porte du noyau et la tour encaissent mal les coups : blindage de fond
    if (k<1 && e.hp < c.lastE) e.hp = c.lastE - (c.lastE - e.hp)*k;
    if (a===1 && c.gateOpen && c.lastE>0 && e.hp>0) c.lastE = e.hp = Math.max(1, e.hp - e.maxhp*M5.breach*dt);   // la brèche s'effondre d'elle-même : les derniers points de la porte ne sont jamais un mur
    if (a===3 && m5AvAlive(g, c)) e.hp = Math.min(e.maxhp, e.hp + e.maxhp*0.01*dt);
    else if (e.hp > c.lastE) e.hp = c.lastE;
    c.lastE = e.hp;
    m5Light(g, c);
    if (a<3 && e.hp <= 0){ m5Next(g, c); return; }
    if (a===3 && e.hp <= e.maxhp*0.1){ c.goal2Done = m5Ok1(c) && c.hallsAt!=null && c.hallsAt<=300 && m5Ok3(c); return 'win'; }
  },
  hud(g, c){
    const e = g.e, a = c.act, D = c.D.i; let part = 0, label = '';
    if (a===1){ part = 0.4*Math.min(1, c.charges/M5.need[D]) + 0.6*(c.gateOpen? clamp(1 - e.hp/(e.maxhp*0.75), 0, 1) : 0); label = m5Fmt(M5_TX.hudI, { a:c.charges, b:M5.need[D] }); }
    else if (a===2){ part = 0.5*(c.owned/3) + 0.5*(c.owned>=3? clamp(1 - e.hp/e.maxhp, 0, 1) : 0); label = m5Fmt(M5_TX.hudII, { a:c.owned }); }
    else { const av = m5AvAlive(g, c)? clamp(1 - c.avatar.hp/c.avatar.maxhp, 0, 1) : c.avatar? 1 : 0;
      part = 0.4*av + 0.6*clamp((1 - e.hp/e.maxhp)/0.9, 0, 1); label = (m5AvAlive(g, c)? cT(M5_TX.hudAv)+' '+Math.round(100*c.avatar.hp/c.avatar.maxhp)+' % · ' : '')+cT(M5_TX.hudTw)+' '+Math.round(100*e.hp/e.maxhp)+' %'; }
    const n = (m5Ok1(c)?1:0) + (m5Ok2(c)?1:0) + (m5Ok3(c)?1:0);
    return { prog:((a-1) + clamp(part,0,1))/3, label, goal2:{ done:!!c.goal2Done, label:n+'/3' } };
  },
  radio:[
    // ----- acte I -----
    { act:1, when:(g, c) => c.act===1 && c.D.i===0 && c.t >= 8, who:'sol', txt:M5_L.a0 },                                         // [Récit] à 0:08
    { act:1, when:(g, c) => c.act===1 && c.cellN>=1, who:'cell', txt:M5_L.a1 },                                                    // première cellule
    { act:1, when:(g, c) => c.act===1 && c.sapOut>=1, who:'malik', txt:M5_L.a2 },                                                  // premier sapeur
    { act:1, when:(g, c) => c.act===1 && c.sapLost>=1, who:'malik', txt:M5_L.a4 },                                                 // un sapeur tombe
    { act:1, when:(g, c) => c.act===1 && c.battDown>=1, who:'sol', txt:M5_L.a5 },                                                   // une batterie tombe
    { act:1, when:(g, c) => c.act===1 && c.t - c.t0 >= 180, who:'sol', txt:M5_L.a6 },                                              // à 3:00
    { act:1, when:(g, c) => c.act===1 && !!c.firing, who:'malik', txt:M5_L.a7 },                                                   // mise à feu
    { act:1, when:(g, c) => c.act===1 && c.gateOpen, who:'sol', txt:M5_L.a8 },                                                     // 2 s après
    { act:1, when:(g, c) => c.act===1 && c.dry!=null, who:'sol', txt:M5_L.a9 },                                                    // cellules épuisées
    // ----- acte II -----
    { act:2, when:(g, c) => c.act===2 && c.D.i===0 && c.t - c.t0 >= 10, who:'sol', txt:M5_L.b0 },                                  // [Récit] à 0:10 de l'acte
    { act:2, when:(g, c) => c.act===2 && c.cellN>=1, who:'cell', txt:M5_L.b1 },
    { act:2, when:(g, c) => c.act===2 && c.t - c.t0 >= 90 && m5Hidden(g, c), who:'sol', txt:M5_L.b2 },                               // des machines cachées, à 1:30
    { act:2, when:(g, c) => c.act===2 && c.offN>=1, who:'sol', txt:M5_L.b3 },
    { act:2, when:(g, c) => c.act===2 && c.relaunchN>=1, who:'sol', txt:M5_L.b4 },
    { act:2, when:(g, c) => c.act===2 && c.owned>=2, who:'malik', txt:M5_L.b5 },
    { act:2, when:(g, c) => c.act===2 && c.owned>=3, who:'sol', txt:M5_L.b6 },
    // ----- acte III -----
    { act:3, when:(g, c) => c.act===3 && c.rwCount>=1, who:'sol', txt:M5_L.c0 },
    { act:3, when:(g, c) => c.act===3 && c.rwHit>=1, who:'sol', txt:M5_L.c1 },
    { act:3, when:(g, c) => c.act===3 && c.cellsLeft===0 && c.cellN>0, who:'cell', txt:M5_L.c2 },
    { act:3, when:(g, c) => c.act===3 && !!c.avHalfN, who:'nous', txt:M5_L.c3 },
    { act:3, when:(g, c) => c.act===3 && c.avFell && c.avBackN===0, who:'sol', txt:M5_L.c4 },
    { act:3, when:(g, c) => c.act===3 && c.avBackN>=1 && m5AvAlive(g, c), who:'nous', txt:M5_L.c5 },                               // Dernier carré : l'avatar revient
    { act:3, when:(g, c) => c.act===3 && g.e.hp < g.e.maxhp*0.5, who:'sol', txt:M5_L.c6 },
  ],
});
// reprise : les rappels des actes déjà joués ne sont pas rejoués
{ const m = CAMPAIGN[4], st = m.setup; m.setup = function(g, c){ st.call(this, g, c); if (c.resumed) m.radio.forEach((r,i)=>{ if (r.act < c.resumed) c.fired[i] = 1; }); }; }

/* ---------- Enveloppes minimales (hors moteur) ----------
   showEnd : après un échec en Récit ou en Lutte, RÉESSAYER devient « REPRENDRE À L'ACTE n ».            */
{ const _se = showEnd; showEnd = function(){ _se(); const c = game && game.camp;
    if (c && c.i===4 && !game.win && M5_CK && M5_CK.fail && c.D.i<2){ const b = document.getElementById('campNextBtn'); if (b) b.textContent = m5Fmt(M5_TX.resume, { n:M5_CK.act }); } }; }
