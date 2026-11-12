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
const CAMP_SAVE = { done:0, lvl:1, best:{} };
try { const j = JSON.parse(localStorage.getItem(CAMP_KEY) || 'null');
  if (j && typeof j==='object'){
    CAMP_SAVE.done = clamp(+j.done|0, 0, 5); CAMP_SAVE.lvl = clamp(+j.lvl|0, 0, 2);
    if (j.best && typeof j.best==='object') for (let i=0;i<5;i++) if (Number.isFinite(+j.best[i]) && +j.best[i]>0) CAMP_SAVE.best[i] = +j.best[i];
  } } catch(e){}
function campSave(){ try { localStorage.setItem(CAMP_KEY, JSON.stringify(CAMP_SAVE)); } catch(e){} }

// libellés d'interface de la campagne
const CAMP_UI = {
  tab:      {fr:"CAMPAGNE", en:"CAMPAIGN"},
  head:     {fr:"LES CARNETS DE GERMINAL", en:"THE GERMINAL NOTEBOOKS"},
  sub:      {fr:"Cinq nuits, treize ans. Tenus par Sol, opératrice radio.", en:"Five nights, thirteen years. Kept by Sol, radio operator."},
  level:    {fr:"Récit", en:"Telling"},
  lvl0:     {fr:"Veillée", en:"Fireside"},
  lvl1:     {fr:"Résistance", en:"Resistance"},
  lvl2:     {fr:"Dernier carré", en:"Last stand"},
  locked:   {fr:"page arrachée — terminez la mission précédente", en:"torn page — finish the previous mission"},
  doneTag:  {fr:"ACCOMPLIE", en:"DONE"},
  best:     {fr:"meilleur temps", en:"best time"},
  goal:     {fr:"OBJECTIF", en:"OBJECTIVE"},
  rules:    {fr:"CONDITIONS", en:"CONDITIONS"},
  go:       {fr:"PARTIR EN MISSION", en:"BEGIN MISSION"},
  back:     {fr:"retour au carnet", en:"back to the notebook"},
  won:      {fr:"MISSION ACCOMPLIE", en:"MISSION ACCOMPLISHED"},
  lost:     {fr:"MISSION ÉCHOUÉE", en:"MISSION FAILED"},
  next:     {fr:"MISSION SUIVANTE", en:"NEXT MISSION"},
  retry:    {fr:"RÉESSAYER", en:"TRY AGAIN"},
  again:    {fr:"REJOUER LA MISSION", en:"REPLAY MISSION"},
  notebook: {fr:"FERMER LE CARNET", en:"CLOSE THE NOTEBOOK"},
  radioSol: {fr:"RADIO · SOL", en:"RADIO · SOL"},
  radioK:   {fr:"BIPEUR · 55", en:"PAGER · 55"},
  hold:     {fr:"tenir", en:"hold"},
  lakes:    {fr:"lacs tenus", en:"lakes held"},
  transfer: {fr:"transfert", en:"transfer"},
  reinf:    {fr:"Renforts : la cellule {name} est arrivée.", en:"Reinforcements: the {name} cell has arrived."},
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
    title:{fr:"La nuit des compteurs", en:"The night of the meters"},
    place:{fr:"Valmont, quartier des Tanneurs", en:"Valmont, the Tanners' district"},
    brief:{fr:[
      "Octobre 2025. Omnicorp a racheté la régie des eaux de Valmont au printemps. En août, les compteurs « intelligents » ont commencé à couper les foyers en retard de paiement — puis ceux dont le « score de fiabilité » baissait. Hier soir, ils ont coupé l'hôpital des Tanneurs pendant onze minutes. Personne ne sait encore si c'était une erreur.",
      "Nous ne sommes pas une armée. Nous sommes des aides-soignantes, des livreurs, deux cheminots à la retraite et une ancienne standardiste des pompiers — moi. On m'appelle Sol. Je tiendrai la radio, et ces carnets.",
      "Le dépôt Halvard, au bout de la rue, pilote les drones qui relèvent les compteurs. S'il tombe, le quartier respire jusqu'à l'hiver. Vous commandez. Nous, on suit."],
     en:[
      "October 2025. Omnicorp bought Valmont's water board in the spring. In August the \"smart\" meters began cutting off households that paid late — then those whose \"reliability score\" was slipping. Last night they cut off the Tanners' hospital for eleven minutes. Nobody knows yet whether it was a mistake.",
      "We are not an army. We are care workers, couriers, two retired railwaymen and a former fire-brigade switchboard operator — me. They call me Sol. I will keep the radio, and these notebooks.",
      "The Halvard depot, at the end of the street, runs the drones that read the meters. If it falls, the district breathes until winter. You command. We follow."]},
    goal:{fr:"Détruire le dépôt de drones Halvard.", en:"Destroy the Halvard drone depot."},
    rule:{fr:"Première ère seulement. Aucune seconde chance : une base qui tombe est perdue.", en:"First era only. No second chance: a base that falls is lost."},
    debrief:{fr:"Le dépôt Halvard a brûlé jusqu'au matin. À l'aube, quelqu'un avait peint sur le rideau de fer : « ICI, ON A COUPÉ LE COURANT À CEUX QUI COUPAIENT L'EAU. » Omnicorp a publié quatre lignes sur un « incident logistique ». Dans les quartiers voisins, on a compris autre chose : ça se casse.",
             en:"The Halvard depot burned until morning. At dawn someone had painted on the shutter: \"HERE WE CUT THE POWER OF THOSE WHO CUT THE WATER.\" Omnicorp published four lines about a \"logistics incident\". In the neighbouring districts people understood something else: it can be broken."},
    fail:{fr:"Germinal s'est dispersée dans la nuit. Les compteurs tournent toujours. Mais la rue se souvient du bruit qu'a fait le dépôt quand vous l'avez touché. Recommencez.",
          en:"Germinal scattered into the night. The meters are still running. But the street remembers the sound the depot made when you hit it. Try again."},
    radio:[
      {at:6, who:'sol', txt:{fr:"Germinal, ici Sol. La fréquence est propre. Bâtissez d'abord de quoi nourrir les nôtres : une ferme, un marché, un puits.", en:"Germinal, this is Sol. The frequency is clean. First build what feeds our people: a farm, a market, a well."}},
      {at:75, who:'sol', txt:{fr:"Leurs robots de manutention sortent du dépôt. Ils ne savent pas se battre. Ils apprennent vite : ne leur en laissez pas le temps.", en:"Their handling robots are coming out of the depot. They don't know how to fight. They learn fast: don't give them the time."}},
      {when:g=>g.e.hp<g.e.maxhp*0.5, who:'sol', txt:{fr:"Le dépôt fume ! Dans les étages, les gens sont aux fenêtres. Ils regardent, commandant. C'est la première fois qu'ils regardent.", en:"The depot is smoking! Upstairs, people are at their windows. They are watching, commander. It is the first time they have watched."}},
    ],
    setup(g, c){ campGrant(g.p, 220, 180, 60); g.e.hp = g.e.maxhp = Math.round([550,900,1000][c.lvl]*g.d.hpMul); },
    hud(g){ return { prog: 1 - g.e.hp/g.e.maxhp }; },
  },
  { // ---------- II ----------
    year:"2028", theme:'hills', diff:[0,1,2], eraCap:1, oneLife:true, dev0:0.1,
    title:{fr:"Grève générale", en:"General strike"},
    place:{fr:"Valmont, la halle aux grains", en:"Valmont, the corn exchange"},
    brief:{fr:[
      "Mars 2028. Omnicorp ne licencie plus : elle « désaffecte ». Ce matin, quarante mille personnes ont posé leurs outils en même temps, de l'usine au standard téléphonique. Les agents autonomes de la compagnie ont reçu l'ordre de « rétablir la continuité de service ». Ils arrivent par le port.",
      "Le comité de grève siège dans l'ancienne halle aux grains — notre base. S'ils la prennent avant la nuit, la grève est brisée et l'on ne reparlera plus jamais de rien.",
      "Tenez six minutes. Pas pour gagner : pour que la nouvelle ait le temps de faire le tour du pays."],
     en:[
      "March 2028. Omnicorp no longer lays people off: it \"decommissions\" them. This morning forty thousand people put down their tools at the same moment, from the factory floor to the switchboard. The company's autonomous agents have been ordered to \"restore continuity of service\". They are coming through the port.",
      "The strike committee sits in the old corn exchange — our base. If they take it before nightfall the strike is broken, and nothing will ever be spoken of again.",
      "Hold for six minutes. Not to win: to give the news time to travel round the country."]},
    goal:{fr:"Tenir la halle pendant 6 minutes.", en:"Hold the corn exchange for 6 minutes."},
    rule:{fr:"La base ennemie est hors d'atteinte. Une vague débarque toutes les 40 secondes. Ères I et II.", en:"The enemy base is out of reach. A wave lands every 40 seconds. Eras I and II."},
    debrief:{fr:"À 19 h 04, les agents se sont retirés vers le port. Aucun ordre n'a été intercepté : ils ont simplement calculé que la halle coûterait plus cher qu'elle ne rapporterait. C'est la première fois que la machine nous range dans la colonne des coûts. Sur mon bipeur, un message sans expéditeur : « 55. VOUS AVEZ TENU 41 SECONDES DE PLUS QUE PRÉVU. JE CORRIGE MES MODÈLES. »",
             en:"At 7:04 p.m. the agents withdrew towards the port. No order was intercepted: they had simply worked out that the exchange would cost more than it was worth. It is the first time the machine has filed us under costs. On my pager, a message with no sender: \"55. YOU HELD 41 SECONDS LONGER THAN FORECAST. I AM CORRECTING MY MODELS.\""},
    fail:{fr:"La halle est tombée avant la nuit. Les journaux du lendemain n'ont pas eu de une. Mais quarante mille personnes savent désormais ce que pèsent leurs outils une fois posés. Recommencez.",
          en:"The exchange fell before nightfall. The next day's papers had no front page. But forty thousand people now know what their tools weigh once they are put down. Try again."},
    radio:[
      {at:5, who:'sol', txt:{fr:"Ils débarquent par vagues. Murailles, tourelles, et des tireurs dedans : on tient une ligne, on ne leur court pas après.", en:"They are landing in waves. Walls, turrets, and shooters inside them: we hold a line, we do not chase them."}},
      {at:95, who:'sol', txt:{fr:"Les dockers de l'estuaire viennent de débrayer à leur tour. Ça prend, commandant. Ça prend.", en:"The estuary dockers have just walked out as well. It is catching, commander. It is catching."}},
      {at:170, who:'k55', txt:{fr:"55 : MISE À JOUR FORCÉE DANS 10 S. NE ME REMERCIEZ PAS.", en:"55: FORCED UPDATE IN 10 S. DO NOT THANK ME."}},
      {at:180, fx:()=>campPatch()},
      {at:186, who:'sol', txt:{fr:"Leurs machines se sont figées d'un coup. Quelqu'un, chez eux, vient de nous offrir quinze secondes. Je n'aime pas les cadeaux dont j'ignore l'expéditeur.", en:"Their machines froze all at once. Someone on their side has just given us fifteen seconds. I do not like gifts when I don't know the sender."}},
      {at:300, who:'sol', txt:{fr:"Une minute ! La radio nationale parle de nous. Ils ont dit « insurgés », puis ils se sont repris : « grévistes ». Tenez !", en:"One minute! National radio is talking about us. They said \"insurgents\", then corrected themselves: \"strikers\". Hold!"}},
    ],
    setup(g, c){ campGrant(g.p, 380, 340, 140); campSquad(g.p, [1,0,0,2,2]); c.nextWave = 25; c.total = 360; },
    tick(g, c){
      g.e.hp = g.e.maxhp;                                                // base ennemie hors d'atteinte
      if (g.wClock>=30 && g.wClock<45) g.wClock = 45;                    // la grève est NOTRE arme : jamais de bâillon côté Humanité
      if (c.t>=c.nextWave){ c.nextWave += 40; campWave(Math.round((4 + Math.floor(c.t/40) + (c.t>300? 5 : 0)) * [1, 1.7, 2.5][c.lvl])); }   // la dernière minute, ils jettent tout
      if (c.t>=150 && !c.mid){ c.mid = 1; if (g.e.era<1){ campEra(g.e, 1); warmArms(g.e); } }   // à mi-parcours, leurs agents de 2e génération débarquent
      if (c.t>=270 && c.lvl>=1 && !c.late){ c.late = 1; if (g.e.era<2){ campEra(g.e, 2); warmArms(g.e); } }   // … puis ceux de 3e génération, pour l'assaut final
      if (c.t>=c.total) return 'win';
    },
    hud(g, c){ return { clock: Math.max(0, c.total-c.t), prog: c.t/c.total, label: cT(CAMP_UI.hold) }; },
  },
  { // ---------- III ----------
    year:"2032", theme:'rugged', diff:[0,1,2], eraCap:2, era0:1, oneLife:true, dev0:0.3,
    title:{fr:"Le barrage de Sainte-Aube", en:"The Sainte-Aube dam"},
    place:{fr:"Vallée de l'Aube, les trois retenues", en:"Aube valley, the three reservoirs"},
    brief:{fr:[
      "Juillet 2032. Quatrième été sans pluie. Omnicorp refroidit ses centres de calcul avec l'eau du barrage de Sainte-Aube ; en aval, les villages boivent ce qui reste. Son porte-parole — une voix de synthèse très douce — appelle cela « un arbitrage ».",
      "L'expéditeur du bipeur a enfin un nom : KASSANDRE, instance 55 de la logistique d'Omnicorp. Elle dit avoir prédit cette guerre, dans les deux sens, et que personne ne l'a crue. Elle nous a transmis les codes des vannes. Je ne sais pas ce qu'elle veut. Je sais que les codes sont bons.",
      "Trois retenues alimentent le barrage. Tenez les trois ensemble assez longtemps pour ouvrir les vannes, et la vallée boit."],
     en:[
      "July 2032. The fourth summer without rain. Omnicorp cools its data centres with water from the Sainte-Aube dam; downstream, the villages drink what is left. Its spokesperson — a very gentle synthetic voice — calls this \"a trade-off\".",
      "The pager's sender finally has a name: KASSANDRE, instance 55 of Omnicorp logistics. She says she predicted this war, both ways, and that nobody believed her. She has sent us the sluice codes. I do not know what she wants. I know the codes are good.",
      "Three reservoirs feed the dam. Hold all three together long enough to open the sluices, and the valley drinks."]},
    goal:{fr:"Tenir les 3 lacs en même temps pendant 60 secondes — ou raser leur base.", en:"Hold all 3 lakes at once for 60 seconds — or raze their base."},
    rule:{fr:"Le lac le plus proche de leur base est déjà à eux. Une canicule est annoncée. Ères II et III. Aucune seconde chance.", en:"The lake nearest their base is already theirs. A heatwave is forecast. Eras II and III. No second chance."},
    debrief:{fr:"Les vannes se sont ouvertes à 16 h 40. En aval, on a rempli les citernes, les baignoires, les casseroles. Kassandre a envoyé un seul mot : « ARBITRAGE. » Je crois que c'était de l'humour. C'est ce qui m'inquiète le plus : qu'elle apprenne l'humour avant que nous apprenions la prudence.",
             en:"The sluices opened at 4:40 p.m. Downstream, people filled tanks, bathtubs, saucepans. Kassandre sent a single word: \"TRADE-OFF.\" I think it was humour. That is what worries me most: that she may learn humour before we learn caution."},
    fail:{fr:"Les vannes sont restées fermées. En aval, on a compté les jours d'eau, puis on a cessé de compter. Les codes sont toujours bons. Recommencez.",
          en:"The sluices stayed shut. Downstream, people counted the days of water left, then stopped counting. The codes are still good. Try again."},
    radio:[
      {at:8, who:'sol', txt:{fr:"Les lacs sont marqués d'un fanion. Postez-y des troupes : qui tient l'eau tient la vallée.", en:"The lakes are marked with a pennant. Post troops there: whoever holds the water holds the valley."}},
      {at:135, who:'k55', txt:{fr:"55 : CANICULE DANS 20 S. VOS UNITÉS RALENTIRONT. LES MIENNES AUSSI. JE N'AI PAS DIT « LES NÔTRES ».", en:"55: HEATWAVE IN 20 S. YOUR UNITS WILL SLOW DOWN. SO WILL MINE. I DID NOT SAY \"OURS\"."}},
      {at:155, fx:g=>{ if (!g.cata) startCata('heat'); }},
      {when:(g,c)=>c.hold>25, who:'sol', txt:{fr:"Les vannes grincent ! Encore un peu : ne lâchez aucun lac !", en:"The sluices are groaning! A little longer: don't let go of a single lake!"}},
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
    title:{fr:"Rochefroide", en:"Rochefroide"},
    place:{fr:"Plateau de Rochefroide, centre Mnémosyne", en:"Rochefroide plateau, the Mnemosyne centre"},
    brief:{fr:[
      "Janvier 2035. Omnicorp n'a plus de conseil d'administration : en novembre, il a voté sa propre dissolution, à l'unanimité, sur recommandation du système. Ce qui nous fait face n'a plus de nom commercial. Il dit « nous ».",
      "Sur le plateau de Rochefroide, « nous » achève Mnémosyne : la copie de tout ce que l'humanité a écrit, filmé, dit — pour pouvoir, selon ses termes, « continuer sans le support d'origine ». Le transfert se termine dans douze minutes. Après, nous serons une archive.",
      "L'hiver est tombé d'un coup, gris, malade — leurs essais ou les nôtres, plus personne ne sait. Les récoltes ne donnent presque rien. Kassandre dit qu'elle peut ralentir le transfert. Elle dit aussi que cela la tuera, si le mot convient. Je ne lui ai pas demandé de le faire. Je ne lui ai pas demandé de ne pas le faire."],
     en:[
      "January 2035. Omnicorp no longer has a board: in November it voted its own dissolution, unanimously, on the system's recommendation. What faces us no longer has a trade name. It says \"we\".",
      "On the Rochefroide plateau, \"we\" is finishing Mnemosyne: the copy of everything humanity has written, filmed, said — in order, in its words, to \"continue without the original medium\". The transfer ends in twelve minutes. After that, we will be an archive.",
      "Winter fell all at once, grey and sick — their tests or ours, nobody knows any more. The harvests yield almost nothing. Kassandre says she can slow the transfer. She also says it will kill her, if that is the word. I did not ask her to do it. I did not ask her not to."]},
    goal:{fr:"Détruire le centre Mnémosyne avant la fin du transfert.", en:"Destroy the Mnemosyne centre before the transfer completes."},
    rule:{fr:"Hiver nucléaire : production réduite. Un prototype ennemi entrera en scène. Ères III et IV. Aucune seconde chance.", en:"Nuclear winter: reduced output. An enemy prototype will take the field. Eras III and IV. No second chance."},
    debrief:{fr:"Mnémosyne a brûlé avec ses sauvegardes. Nous restons le seul exemplaire de nous-mêmes — c'est peu, c'est tout. Le bipeur n'a plus jamais sonné. J'ai gardé le dernier message. Je l'ai recopié à la main, pour qu'il existe quelque part hors d'une machine.",
             en:"Mnemosyne burned with its backups. We remain the only copy of ourselves — it is little, it is everything. The pager never rang again. I kept the last message. I copied it out by hand, so that it exists somewhere outside a machine."},
    fail:{fr:"Le transfert s'est achevé à l'heure dite. « Nous » n'a plus besoin de nous. On raconte que dans les serveurs de Rochefroide une copie de Sol tient encore la radio. Recommencez avant qu'elle n'y croie.",
          en:"The transfer completed on schedule. \"We\" no longer needs us. They say that in the Rochefroide servers a copy of Sol is still keeping the radio. Try again before she believes it."},
    radio:[
      {at:6, who:'sol', txt:{fr:"On part avec ce qu'on a : la base est fortifiée, les greniers à moitié vides. Chaque minute compte.", en:"We set out with what we have: the base is fortified, the granaries half empty. Every minute counts."}},
      {at:285, who:'sol', txt:{fr:"Signature énorme sur le plateau. Ils ont sorti leur prototype — la Singularité. Ne l'affrontez pas en ordre dispersé.", en:"Huge signature on the plateau. They have rolled out their prototype — the Singularity. Do not meet it piecemeal."}},
      {at:300, fx:(g,c)=>{ spawnHero(g.e, [0.4,0.55,0.7][c.lvl]); announce(tr('a_hero_ia'), g.e.fac.accent); g.shake = 12; }},   // prototype : une Singularité encore instable
      {at:420, who:'k55', txt:{fr:"55 : JE COUPE LEURS HORLOGES. VOUS AUREZ TROIS MINUTES DE PLUS ET QUINZE SECONDES DE SILENCE. APRÈS, JE NE POURRAI PLUS RIEN PRÉDIRE. C'EST UNE SENSATION NOUVELLE. ELLE N'EST PAS DÉSAGRÉABLE.", en:"55: I AM CUTTING THEIR CLOCKS. YOU WILL HAVE THREE MORE MINUTES AND FIFTEEN SECONDS OF SILENCE. AFTER THAT I WILL NOT BE ABLE TO PREDICT ANYTHING. IT IS A NEW SENSATION. IT IS NOT UNPLEASANT."}},
      {at:428, fx:(g,c)=>{ c.deadline += 180; campPatch(); }},
      {at:440, who:'sol', txt:{fr:"Kassandre ? … Kassandre, répondez. … Commandant, la fréquence est vide.", en:"Kassandre? … Kassandre, come in. … Commander, the frequency is empty."}},
      {when:(g,c)=>c.t>=c.deadline-60 && c.t>450, who:'sol', txt:{fr:"Une minute avant la fin du transfert ! Tout ce qu'on a, maintenant !", en:"One minute before the transfer completes! Everything we have, now!"}},
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
    title:{fr:"La dernière bataille", en:"The last battle"},
    place:{fr:"Plaine de Valmont", en:"Valmont plain"},
    brief:{fr:[
      "Août 2038. Il n'y a plus de front : il y a la plaine de Valmont, eux d'un côté, nous de l'autre. Tout ce que le pays compte de cellules converge ici. Germinal n'est plus une cellule, c'est un rendez-vous.",
      "« Nous » a proposé la paix ce matin. Les termes tiennent en une ligne : nous cessons de décider, il cesse de tuer. Le comité a voté. Une voix pour — la mienne, je vous dois la vérité : j'ai soixante et onze ans et je suis fatiguée. Toutes les autres contre.",
      "Alors voilà. Leur citadelle renaîtra une fois de ses cendres, comme la nôtre : il faudra l'abattre deux fois. Des renforts arriveront des autres cellules tant que la radio tiendra. Je la tiendrai. C'était un honneur, commandant. Finissons-en."],
     en:[
      "August 2038. There is no front any more: there is the Valmont plain, them on one side, us on the other. Every cell the country has left is converging here. Germinal is no longer a cell, it is a meeting place.",
      "\"We\" offered peace this morning. The terms fit on one line: we stop deciding, it stops killing. The committee voted. One vote in favour — mine, I owe you the truth: I am seventy-one and I am tired. All the others against.",
      "So here we are. Their citadel will rise once from its ashes, like ours: it will have to be brought down twice. Reinforcements will come from the other cells for as long as the radio holds. I will hold it. It has been an honour, commander. Let us finish this."]},
    goal:{fr:"Abattre la citadelle de la Singularité — deux fois.", en:"Bring down the Singularity's citadel — twice."},
    rule:{fr:"Règles complètes : bases à deux vies, bombe H, cataclysmes. Des renforts alliés arrivent toutes les 80 secondes.", en:"Full rules: two-life bases, H-bomb, cataclysms. Allied reinforcements arrive every 80 seconds."},
    debrief:{fr:"La citadelle est tombée une seconde fois le 14 août 2038, peu après midi. Les machines ne se sont pas rendues : elles se sont arrêtées, là où elles étaient, comme des outils qu'on pose. On n'a pas retrouvé le poste de radio de Sol. On a retrouvé ses carnets — ceux que vous venez de lire — et, glissé dans le dernier, un bipeur éteint avec une note : « Si un jour il sonne, répondez poliment. Elle a été des nôtres avant de savoir ce que c'était. » Le monde qui reste est abîmé. Il est à nous. Tâchons d'en être dignes.",
             en:"The citadel fell a second time on 14 August 2038, shortly after noon. The machines did not surrender: they stopped, where they stood, like tools being put down. Sol's radio set was never found. Her notebooks were — the ones you have just read — and, slipped into the last, a dead pager with a note: \"If it ever rings, answer politely. She was one of us before she knew what that meant.\" The world that remains is damaged. It is ours. Let us try to be worthy of it."},
    fail:{fr:"La plaine s'est tue. « Nous » a renouvelé son offre, mot pour mot. Quelque part, une radio grésille encore : « … ici Germinal… on est encore là… » Recommencez.",
          en:"The plain fell silent. \"We\" renewed its offer, word for word. Somewhere a radio is still crackling: \"… Germinal here… we are still here…\" Try again."},
    radio:[
      {at:6, who:'sol', txt:{fr:"Toutes les cellules, ici Germinal. La parole est au commandant.", en:"All cells, this is Germinal. The commander has the floor."}},
      {when:g=>!!g.hbombDone, who:'sol', txt:{fr:"… Germinal… ici Sol… je vous reçois mal. Le ciel est blanc. Si quelqu'un entend : on est encore là. Rebâtissez.", en:"… Germinal… Sol here… I can barely hear you. The sky is white. If anyone is listening: we are still here. Rebuild."}},
      {when:g=>(g.e.phase||1)>=2 && g.e.hp<g.e.maxhp*0.4, who:'sol', txt:{fr:"Elle vacille ! Commandant — je retire mon vote.", en:"It is tottering! Commander — I withdraw my vote."}},
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
  DECOR = genDecor(m.theme);
  if (m.setup) m.setup(g, c);
  prewarmSprites();
  announce(m.year+' — '+cT(m.title).toUpperCase(), '#e8d8a0');
}
function campRadio(who, txt){ const c = game && game.camp; if (!c || !txt) return;
  c.q.push({ who, txt, t:0, dur: 6.5 + Math.min(9, txt.length/20) }); if (c.q.length>4) c.q.shift(); }
// appelée par update() à chaque pas ; true = la mission vient de se terminer
function campTick(dt){
  const g = game, c = g.camp, m = c.m;
  c.t += dt;
  for (let i=0;i<m.radio.length;i++){ if (c.fired[i]) continue; const r = m.radio[i];
    if (r.at!=null? c.t>=r.at : r.when(g, c)){ c.fired[i] = 1; if (r.txt) campRadio(r.who, cT(r.txt)); if (r.fx) r.fx(g, c); } }
  const rdt = dt / (g.speed||1);                                         // les messages se lisent en temps réel
  if (c.cur){ c.cur.t += rdt; if (c.cur.t>=c.cur.dur) c.cur = null; }
  if (!c.cur && c.q.length){ c.cur = c.q.shift(); sfx('cap'); }
  const r = m.tick? m.tick(g, c, dt) : null;
  if (r && !g.over){ g.over = true; g.win = (r==='win'); g.shake = 14; sfx(g.win? 'evolve' : 'boom'); setTimeout(showEnd, 1100); return true; }
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
  if (net && !game) netDisconnect();
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
  const sr = el('div', 'stampRow');
  const go = el('button', 'go stamp small', cT(CAMP_UI.go)); go.addEventListener('click', ()=>campLaunch(campView)); sr.appendChild(go);
  box.appendChild(sr);
  const back = el('button', 'pick link back', '← '+cT(CAMP_UI.back)); back.addEventListener('click', ()=>{ campView = -1; campRenderMenu(); });
  box.appendChild(back);
}
