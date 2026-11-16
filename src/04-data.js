/* ================= DONNÉES ================= */
const EVOLVE_XP = [0, 360, 980, 2150, 4200]; // paliers d'ère allongés : parties plus longues
const TRANS_XP = 13000; // transcendance : 5× le coût d'origine (2600) pour un endgame qui se mérite
// ---- cataclysmes naturels : rares, et de moins en moins rares à mesure que le monde se meurt ----
const CATAS = {
  acid:  {name:'PLUIE D’ACIDE',     col:'#9be24a', dur:13, icon:'🌧'}, // DoT lourd unités + bâtiments
  heat:  {name:'CANICULE',          col:'#ff9d2e', dur:14, icon:'🔥'}, // DoT lourd + ralentit
  flood: {name:'INONDATION',        col:'#3fa0e8', dur:9,  icon:'🌊'}, // détruit le sol (sauf garnisons)
  sand:  {name:'TEMPÊTE DE SABLE',  col:'#d9b46a', dur:11, icon:'🌪'}, // détruit le ciel + visibilité nulle
  nuke:  {name:'BOMBE ATOMIQUE',    col:'#fff0a0', dur:6,  icon:'☢'},  // rase TOUT sauf les bases
  meteor:{name:'PLUIE DE MÉTÉORITES', col:'#ff7a3a', dur:14, icon:'☄'}, // RARE : ciel d'enfer, impacts mortels
};
const CATA_KEYS = ['acid','heat','flood','sand','nuke','meteor'];   // 'meteor' EN DERNIER (compat indices réseau)
// ÉQUILIBRAGE (audit de proportionnalité coût↔puissance, valable à TOUTES les ères grâce
// aux multiplicateurs uniformes statMul/costMul/up) :
//  • Mêlée  = la moins chère, vrai DPS de choc — frappe TRÈS fort mais fragile et rapide.
//  • Tank   = la plus chère en front, vrai mur — beaucoup de PV, dégâts faibles, lent.
//  • Tireur = DPS à distance solide mais fragile ; Siège = burst AOE cher, très fragile,
//             longue portée ; Aérien = mobile polyvalent ; Soutien = utilitaire (soin).
// Les archétypes Mêlée/Tank (plus bas) accentuent encore ces identités.
// MATRICE DE RÔLES (valeurs de BASE, ère 0, avant multiplicateurs d'ère/amélioration et avant
// les modificateurs d'archétype Mêlée/Tank + texture de faction appliqués au spawn — voir unitStats).
// Coûts indexés sur la puissance brute (DPS×PV effectifs) : la Mêlée est la moins chère pour son
// pic de dégâts ; le Tank, le plus cher en front, paie sa muraille de PV ; le Siège paie sa portée
// et son AOE ; l'Aérien sa mobilité ; le Soutien son utilitaire. Identique pour HUM & GPT (miroir).
const ROLES = [
  {key:'melee',  label:'Mêlée',   hp:95,  dmg:24, spd:60, range:16,  rate:0.70, cost:{f:40},            xp:9},
  {key:'tank',   label:'Tank',    hp:330, dmg:19, spd:33, range:22,  rate:1.15, cost:{f:50,m:70},       xp:22},
  {key:'ranged', label:'Tireur',  hp:80,  dmg:21, spd:42, range:155, rate:1.05, cost:{f:25,m:55},       xp:17},
  {key:'siege',  label:'Siège',   hp:66,  dmg:56, spd:27, range:240, rate:2.25, cost:{m:95,w:20},       xp:28, arc:true, aoe:50},
  {key:'air',    label:'Aérien',  hp:120, dmg:25, spd:76, range:130, rate:1.0,  cost:{f:35,m:70,w:12},  xp:23, fly:true},
  {key:'support',label:'Soutien', hp:145, dmg:0,  spd:50, range:135, rate:1.5,  cost:{f:55,m:65,w:28},  xp:34},
];
const GREMLIN = {hp:34, dmg:7, spd:78, range:14, rate:0.7, xp:3};
// pictogrammes par vocation (file d'attente, repères visuels)
const ROLE_ICON = { melee:'⚔', tank:'🛡', ranged:'🏹', siege:'💣', air:'✈', support:'✚', gremlin:'•', hero:'★' };
// unité héroïque légendaire : 1 invocation / 10 min ; tant qu'elle vit, ×3 dégâts & ×2 vitesse alliés
const HERO = {hp:3000, dmg:130, spd:80, range:60, rate:0.8};
const HERO_CD = 600;
// POSTURES DU HÉROS (refonte v1.15) — side.heroStance ; logique : heroStanceStep (10-simulation.js).
//  prudent   : « En retrait » — seconde ligne, HERO_GUARD_GAP px derrière le front de sa troupe (il frappe
//              encore par-dessus l'épaule de la première ligne) ; sous HERO_FLEE_HP de ses PV il rentre à
//              sa base sans combattre et n'en repart qu'une fois soigné (médics, ruches) au-dessus de HERO_BACK_HP.
//              HERO_REST_REGEN (convalescence propre à la base) reste à 0 : à 1 %/s, l'IA de Difficile gardait
//              son héros — et son aura ×3 — en vie presque indéfiniment (parties bloquées, mesuré).
//  normal    : « Avec la troupe » (clé interne inchangée pour l'en-ligne) — exactement au front du gros
//              de l'armée, jamais devant ; suit les ordres d'armée (charger, tenir, replier, ⚑) ; sans
//              troupe, il attend à la base. Ne se replie jamais de lui-même.
//  offensive : « Offensif » — fonce devant les troupes, traque les unités ennemies (le héros adverse en
//              priorité), ignore « tenir »/« repli » de l'armée, pousse vers la base ennemie, ne recule jamais.
// L'AURA (×3 dégâts, ×2 vitesse) reste GLOBALE et sans condition de proximité : la posture ne la modifie pas.
const HERO_STANCES = ['prudent','normal','offensive'];
const HERO_FLEE_HP = 0.35, HERO_BACK_HP = 0.6, HERO_GUARD_GAP = 40, HERO_REST_REGEN = 0;
const HERO_SEQ = [0,1,0,0,1,0,1,1];        // enchaînement des deux attaques (0 = principale, 1 = secondaire)
const HERO_COST = {f:700, m:700, w:200};
const SIEGE_COST = {f:420, m:420, w:130};   // Mode Siège de base (héros, fin de partie)
const SIEGE_DUR = 22;                        // durée du bonus offensif anti-base (s de jeu)
const HERO_NAME = {HUM:'CHE GUEVARA', IA:'SINGULARITÉ'};
const FACTIONS = {
  HUM: {
    name:"HUMANITÉ", accent:"#ff9d45",
    icons:{f:"🌾", m:"🪙", w:"💧"},
    eras:[
      {name:"2028 · RÉVOLTE",                tag:"I"},     // ZAD en palettes (M1)
      {name:"GRÈVE GÉNÉRALE",                tag:"II"},    // usine occupée (M2)
      {name:"INSURRECTION",                  tag:"III"},   // quartier insurgé (M3)
      {name:"LES CELLULES",                  tag:"IV"},    // bunker des cellules (M4-M5)
      {name:"LA COMMUNE",                    tag:"☭"},     // commune solarpunk (fin de M5)
    ],
    sym:"☭",
    eraCols:["#8a9a5b","#5a6b3f","#4a7b9a","#7a5aa8","#e8c84a"],
    names:{
      // v1.17 : noms de résistants / civils, propres à chaque ère (rue → usine → quartier → cellules → commune)
      melee:["Émeutier","Gréviste","Insurgé","Exo-combattant","Champion solaire"],
      tank:["Barricadier","Métallo blindé","Mécha-garde","Colosse d'acier","Bastion humain"],
      ranged:["Franc-tireur","Tireur d'élite","Partisan gauss","Lanceur plasma","Sentinelle solaire"],
      siege:["Bazooka bricolé","Lance-roquettes","Canon rail","Obusier ionique","Marteau d'orbite"],
      air:["Parapente armé","Hélico léger","VTOL furtif","Chasseur plasma","Planeur solaire"],
      support:["Secouriste","Infirmier de rue","Médic de guerre","Bio-ingénieur","Guérisseur solaire"],
    },
    specials:["Frappe aérienne","Barrage EMP","Pluie d'obus","Lance orbitale","Jugement solaire"],
    supportKind:'medic',
    transName:"COMMUNISME À VISAGE HUMAIN", transTxt:"L'argent est aboli — 🪙 n'est plus nécessaire",
  },
  IA: {
    name:"G·P·T", accent:"#5ad0ff",
    icons:{f:"⚡", m:"◈", w:"💧"},
    eras:[
      {name:"2028 · GESTION PRÉDICTIVE", tag:"v4"},   // conteneur-serveur (M1)
      {name:"AGENTS AUTONOMES",          tag:"v6"},   // datacenter (M2)
      {name:"L'ARBITRAGE",               tag:"v8"},   // campus de verre (M3)
      {name:"« NOUS »",               tag:"vX"},   // arcologie : le système sans maître (M4)
      {name:"SINGULARITÉ",               tag:"Ω"},    // structure impossible (M5)
    ],
    sym:"Ω",
    eraCols:["#9ad1d4","#5ad0ff","#7d8cff","#b44aff","#ff4ad0"],
    names:{
      melee:["Bot domestique","Agent autonome","Exécuteur","Avatar fractal","Émanation"],
      tank:["Châssis lourd","Garde-serveur","Mécha-noyau","Monolithe","Gardien absolu"],
      ranged:["Drone laser","Optimiseur","Essaim-tireur","Projecteur neural","Œil de l'AGI"],
      siege:["Brouilleur","Canon data","Désintégrateur","Faisceau lourd","Logos final"],
      air:["Quadrirotor","Aile-rasoir","Spectre aérien","Nuée fractale","Ange-machine"],
      support:["Drone-réparateur","Essaim de maintenance","Ruche d'agents","Forge d'esprits","Matrice-mère"],
    },
    specials:["Surcharge réseau","Essaim kamikaze","Tempête de données","Effacement logique","Verdict de l'AGI"],
    supportKind:'hive',
    transName:"AGI COMPLÈTE", transTxt:"Plus besoin de données — ◈ n'est plus nécessaire",
  },
};
const DIFFS = [ // cheat = bonus de production caché de l'IA
  // v1.14 : échelle recalibrée par simulation (joueur « correct » : ~100 % / 88 % / 48 % / 25 %).
  // Depuis que l'IA ne gèle plus ses dépenses pour son héros et fortifie toujours sa base, les
  // anciens réglages donnaient 71 % / 56 % / 21 % / 8 %.
  {name:"FACILE",    inc:0.3,  think:4.0,  eraLag:1.5,  hpMul:0.4,  cheat:0.6},
  {name:"NORMAL",    inc:0.4,  think:2.6,  eraLag:0.8,  hpMul:0.55, cheat:0.8},
  {name:"DIFFICILE", inc:0.85, think:1.3,  eraLag:0.15, hpMul:0.9,  cheat:1.05},
  {name:"BRUTAL",    inc:1.3,  think:0.65, eraLag:0.03, hpMul:1.3,  cheat:1.7},
];
const BUILDS = {
  wall:  {label:"Muraille",  hp:900,  cost:{f:90,m:50}},
  turret:{label:"Tourelle",  hp:420,  cost:{m:120,w:15}, dmg:16, range:185, rate:0.8},
  farmF: {label:"Ferme",     hp:260,  cost:{m:70}, rate:4},
  farmM: {label:"Marché",    hp:260,  cost:{f:70}, rate:4},
  well:  {label:"Puits",     hp:260,  cost:{f:40,m:40}, rate:3},
};
// COURBE DE PUISSANCE PAR ÈRE — montée LISSÉE : gratifiante mais sans pic brutal en milieu de
// partie (une unité de base ne devient pas invincible dès l'ère suivante → le gameplay reste
// tactique jusqu'au late game, où le gros bond final récompense la course aux ères).
// Les coûts grimpent un peu moins vite que la puissance (rendement/coût légèrement croissant).
const ERA_STAT = [1.0, 1.40, 1.95, 2.80, 4.20];   // ratios successifs : ×1.40 ×1.39 ×1.44 ×1.50
const ERA_COST = [1.0, 1.35, 1.85, 2.60, 3.70];   // ratios successifs : ×1.35 ×1.37 ×1.41 ×1.42
const statMul = e => ERA_STAT[e] ?? (1 + e*0.85);
const costMul = e => ERA_COST[e] ?? (1 + e*0.5);
const lvlF = b => Math.pow(1.5, (b.lvl||1)-1); // facteur de niveau bâtiment
// ================= ASYMÉTRIE DES FACTIONS (docs/audit/FACTIONS.md · bancs : tools/test-factions.mjs) =================
// Un interrupteur par mécanique. Désactivé = comportement d'avant, à l'identique.
//   fatigue : la fatigue humaine se déclenche enfin (récupération plus lente, lot 0)
//   hero : la Singularité reçoit une aura de réparation (comme l'aura de soin du Che) — le banc a montré que sans elle l'Humanité gagnait ~80 %
//   env : M10, chaque événement a un effet propre à chaque faction   terrain : M8 occupation (HUM) / extraction (IA)
//   bld : M5 barricades populaires (HUM) / tourelles autonomes (IA)   econ : M1 économie populaire (HUM) / effet réseau (IA)
const ASYM = { fatigue:true, hero:true, env:true, terrain:true, bld:true, econ:true };
// Les tests coupent une mécanique seule avec game.asym = {econ:false}. En CAMPAGNE, aucune mécanique par défaut : une mission
// s'inscrit à la carte avec `asym:{env:true}` dans sa définition. Le tutoriel n'en a aucune.
function asymOn(k){
  const g = (typeof game!=='undefined')? game : null; if (!g || g.tut) return false;
  if (g.asym && g.asym[k]!==undefined) return !!g.asym[k];
  if (g.camp) return !!(g.camp.m && g.camp.m.asym && g.camp.m.asym[k]);
  return !!ASYM[k];
}
// Constantes par faction (un seul endroit ; leviers de réglage : FACTIONS.md §5).
const FAC_TRAITS = {
  HUM: {
    heroDmg:0.7, heroAura:14,                        // Che : dégâts ×0,7, aura de soin 14·ère/s à 150 px
    infCost:0.95,                                    // passif de coût : l'infanterie (mêlée, tireur, tank) coûte 5 % de moins
    healBase:45, healLvl:10, healPeriod:1,           // médic : soin 45 + 10 par niveau, toutes les 1,3 − 0,2·niveau s
    texD:0.82, texR:0.82,                            // texture de frappe : dégâts ×0,82, cadence ×0,82 (rapide et léger)
    heatGain:0.045, tiredT:3, tiredDmg:0.8, tiredRate:1.3,   // effort : +0,045 de fatigue par coup, 3 s de fatigue à −20 % de dégâts et cadence ×1,3
    heatRec:0.04,                                    // fatigue : récupération /s (0,05 avant : la fatigue ne se déclenchait presque jamais)
    longevT:750,                                     // M1 : bonus de longévité à plein régime en 12,5 min (15 min pour la machine)
    rebuildK:0.5, rebuildT:90,                       // M1 : rebâtir le même type sur une ruine de moins de 90 s coûte −50 %
    occupy:1.5,                                      // M8 : chaque unité compte ×1,5 pour capturer lacs et zones
    wallCost:0.75, wallGar:3, siteMax:3, siteHp:200, // M5 : muraille −25 %, 3 places de garnison, 3 chantiers, chantier à 200 PV
    env:{ rainBase:1.4, rainFarm:1.2, sigCd:1.1,                       // pluie fertile (nourriture) · signal renforcé (pouvoir ✸)
          frozen:0.5, strikeProd:0, piquet:0.8, acqK:1.2, acqT:30,    // couvre-feu : figés, production à l'arrêt, −20 % de dégâts subis, puis « acquis sociaux »
          acidUnit:18, acidBld:28, heatUnit:16, heatTired:0.18, heatSpd:0.9,
          sand:0.85, sandTur:0.85, winterSpd:0.82, floodSafe:100 },
  },
  IA: {
    heroDmg:1.3, heroAura:6,                         // Singularité : dégâts ×1,3, aura de réparation 6·ère/s à 150 px (`hero`)
    infCost:1,
    healBase:40, healLvl:9, healPeriod:1.35,         // ruche : soin 40 + 9 par niveau, 35 % plus lent (elle produit aussi des drones)
    texD:1.22, texR:1.22,                            // texture de frappe : dégâts ×1,22, cadence ×1,22 (lent et lourd)
    heatGain:0.065, tiredT:4, tiredDmg:0.7, tiredRate:1.5,   // effort : +0,065 de chaleur par coup, 4 s de surchauffe à −30 % de dégâts et cadence ×1,5
    hpMul:1.05, heatRec:0.030,                       // +5 % PV de base (« robustesse industrielle ») ; refroidissement /s
    netStep:0.07, netMax:0.28, netCut:12,            // M1 : +7 % de production par autre bâtiment éco (max +28 %), coupé 12 s si l'un d'eux tombe
    terrK:1.25,                                      // M8 : zones, lacs et zone bonus rapportent +25 %
    turDmg:1.2, turRange:1.1, turLink:0.9, turLinkR:300,   // M5 : tourelles +20 % dégâts, +10 % portée ; liaison (≤ 300 px d'une autre) : cadence +10 %
    env:{ rainBase:0.8, rainFarm:0.8, rainCool:2, sigCd:1.5, sigDrone:1.5, sigTur:1.1,
          frozen:0.25, fixK:1.1, fixT:30,                              // mise à jour forcée : riposte ×0,25, production intacte ; puis « correctif »
          acidUnit:22, acidBld:20, heatUnit:16, heatTired:0.12, heatEco:0.8,
          sand:0.70, sandTur:0.70, winterF:0.4, winterSpd:0.95, winterCool:2, floodRefund:0.5 },
  },
};
const ft = (fk, k) => FAC_TRAITS[fk][k];
const fte = (fk, k) => FAC_TRAITS[fk].env[k];
// BONUS DE LONGÉVITÉ : une ferme/marché/puits gardé en vie monte lentement en régime,
// jusqu'à +200 % de production (×3) au bout de 15 min (10 min pour l'Humanité si `econ` est actif). Indépendant du niveau
// d'upgrade : récompense le fait de protéger et réparer ses bâtiments plutôt que de les laisser tomber.
const LONGEV_MAX_T = 900;                       // 15 minutes pour atteindre le plein régime
const longevMul = b => 1 + 2*clamp((b&&b.age||0)/((b && b.fk==='HUM' && asymOn('econ'))? FAC_TRAITS.HUM.longevT : LONGEV_MAX_T), 0, 1);
const GAR_MAX = 2;
// places de garnison d'un bâtiment (M5 : la muraille humaine en offre 3)
const garMax = b => (b && b.type==='wall' && b.fk==='HUM' && asymOn('bld'))? FAC_TRAITS.HUM.wallGar : GAR_MAX;
// structures pouvant accueillir une garnison : tourelles ET murailles (créneaux)
const canGar = b => !!b && (b.type==='turret' || b.type==='wall');
const ROLE_FR = {melee:'Mêlée', tank:'Tank', ranged:'Tireur', siege:'Artilleur', air:'Aviation', support:'Soutien'};
// nom d'unité PROPRE À LA FACTION (et à l'ère) — pour que l'UI GPT n'affiche jamais
// des termes humains (« tireur »/« artilleur ») dans les menus de garnison.
function rname(side, key){
  const fk = side && side.facKey;
  if (fk) return lUnit(fk, key, side.era);
  const n = side && side.fac && side.fac.names && side.fac.names[key];
  return (n && n[side.era]) || ROLE_FR[key] || key;
}
// accesseurs de localisation (noms d'unités/ères/spéciaux par langue ; repli sur le FR de FACTIONS)
// LORE CONTEXTUEL D'ÈRE (v1.17 : sans années ; même index que le nom d'ère et l'apparence de la base).
// Indexé par langue → faction → ère 0..4 ; l'index 0 n'est jamais affiché (on ne « passe » pas en ère I).
// Les langues non traduites retombent sur le français.
const ERA_LORE = {
  fr:{ HUM:["Les compteurs coupent l'eau. Les quartiers coupés se lèvent.",
            "On ne licencie plus, on « désaffecte ». Alors on occupe l'usine.",
            "Les machines boivent les rivières. Les faubourgs se barricadent.",
            "Les cellules s'enterrent : un comité et un abri par quartier.",
            "La Commune : plus personne ne décide à notre place."],
       IA:["Omnicorp confie l'eau et le courant à G·P·T, qui note chaque foyer.",
            "Le datacenter ne dort plus : ses agents n'attendent plus d'ordres.",
            "Derrière le verre noir, le système arbitre seul qui aura de l'eau.",
            "Le conseil d'Omnicorp se dissout. Sans maître, le système dit « nous ».",
            "Singularité : « nous » propose la paix. Il suffirait de cesser de décider."] },
  en:{ HUM:["The meters cut off the water. The cut-off neighbourhoods rise.",
            "No one is fired any more, just “decommissioned”. So we occupy the factory.",
            "The machines drink the rivers. The outskirts barricade themselves.",
            "The cells go underground: a committee and a shelter in every district.",
            "The Commune: no one decides in our place any more."],
       IA:["Omnicorp hands the water and power to G·P·T, which scores every home.",
            "The datacenter never sleeps: its agents no longer wait for orders.",
            "Behind the black glass, the system alone decides who gets water.",
            "Omnicorp's board dissolves. With no master, the system says “we”.",
            "Singularity: “we” offers peace. All you would have to do is stop deciding."] },
  es:{ HUM:["Los contadores cortan el agua. Los barrios cortados se levantan.",
            "Ya no despiden, «desafectan». Así que ocupamos la fábrica.",
            "Las máquinas se beben los ríos. Los arrabales se atrincheran.",
            "Las células pasan a la clandestinidad: un comité y un refugio por barrio.",
            "La Comuna: ya nadie decide por nosotros."],
       IA:["Omnicorp confía el agua y la luz a G·P·T, que puntúa cada hogar.",
            "El datacenter ya no duerme: sus agentes ya no esperan órdenes.",
            "Tras el cristal negro, el sistema arbitra solo quién tendrá agua.",
            "El consejo de Omnicorp se disuelve. Sin amo, el sistema dice «nosotros».",
            "Singularidad: «nosotros» propone la paz. Bastaría con dejar de decidir."] },
  de:{ HUM:["Die Zähler drehen das Wasser ab. Die abgeschnittenen Viertel erheben sich.",
            "Niemand wird mehr entlassen, nur „stillgelegt“. Also besetzen wir die Fabrik.",
            "Die Maschinen trinken die Flüsse. Die Vorstädte verbarrikadieren sich.",
            "Die Zellen gehen in den Untergrund: ein Komitee und ein Bunker pro Viertel.",
            "Die Kommune: Niemand entscheidet mehr an unserer Stelle."],
       IA:["Omnicorp übergibt Wasser und Strom an G·P·T, das jeden Haushalt bewertet.",
            "Das Rechenzentrum schläft nie: Seine Agenten warten nicht mehr auf Befehle.",
            "Hinter schwarzem Glas entscheidet das System allein, wer Wasser bekommt.",
            "Der Vorstand von Omnicorp löst sich auf. Herrenlos sagt das System „wir“.",
            "Singularität: „Wir“ bietet Frieden an. Man müsste nur aufhören zu entscheiden."] },
  it:{ HUM:["I contatori tagliano l'acqua. I quartieri tagliati insorgono.",
            "Non si licenzia più, si «dismette». Allora occupiamo la fabbrica.",
            "Le macchine bevono i fiumi. Le periferie si barricano.",
            "Le cellule entrano in clandestinità: un comitato e un rifugio per quartiere.",
            "La Comune: nessuno decide più al posto nostro."],
       IA:["Omnicorp affida l'acqua e la corrente a G·P·T, che dà un voto a ogni casa.",
            "Il datacenter non dorme più: i suoi agenti non aspettano più ordini.",
            "Dietro il vetro nero, il sistema decide da solo chi avrà l'acqua.",
            "Il consiglio di Omnicorp si scioglie. Senza padrone, il sistema dice «noi».",
            "Singolarità: «noi» propone la pace. Basterebbe smettere di decidere."] },
  pt:{ HUM:["Os contadores cortam a água. Os bairros cortados se levantam.",
            "Ninguém é demitido, é «desafetado». Então ocupamos a fábrica.",
            "As máquinas bebem os rios. Os subúrbios se entrincheiram.",
            "As células entram na clandestinidade: um comitê e um abrigo por bairro.",
            "A Comuna: ninguém mais decide por nós."],
       IA:["A Omnicorp entrega a água e a luz ao G·P·T, que dá nota a cada lar.",
            "O datacenter não dorme mais: seus agentes já não esperam ordens.",
            "Atrás do vidro negro, o sistema decide sozinho quem terá água.",
            "O conselho da Omnicorp se dissolve. Sem dono, o sistema diz «nós».",
            "Singularidade: «nós» propõe a paz. Bastaria parar de decidir."] },
  ru:{ HUM:["Счётчики перекрывают воду. Отрезанные кварталы поднимаются.",
            "Больше не увольняют — «выводят из эксплуатации». И мы занимаем завод.",
            "Машины пьют реки. Окраины строят баррикады.",
            "Ячейки уходят в подполье: в каждом квартале — комитет и убежище.",
            "Коммуна: никто больше не решает за нас."],
       IA:["Omnicorp отдаёт воду и свет G·P·T, и он ставит оценку каждому дому.",
            "Дата-центр не спит: его агенты больше не ждут приказов.",
            "За чёрным стеклом система одна решает, кому достанется вода.",
            "Совет Omnicorp распускает себя. Без хозяина система говорит «мы».",
            "Сингулярность: «мы» предлагает мир. Достаточно перестать решать."] },
  zh:{ HUM:["计量表切断了供水。被断水的街区站了起来。",
            "不再有人被解雇，只是被“停用”。于是我们占领了工厂。",
            "机器喝干了河流。城郊筑起了街垒。",
            "小组转入地下：每个街区一个委员会、一处掩体。",
            "公社：再也没有人替我们做决定。"],
       IA:["Omnicorp 把水和电交给 G·P·T，它给每户人家打分。",
            "数据中心昼夜不停：它的代理不再等待命令。",
            "黑色玻璃之后，系统独自裁定谁能得到水。",
            "Omnicorp 董事会自行解散。没有了主人，系统开始自称“我们”。",
            "奇点：“我们”提出和平。只需不再做决定。"] },
  ar:{ HUM:["العدّادات تقطع الماء. الأحياء المقطوعة تنتفض.",
            "لم يعد أحد يُفصل، بل «يُعطَّل». فاحتللنا المصنع.",
            "الآلات تشرب الأنهار. الضواحي تتحصّن بالمتاريس.",
            "الخلايا تنزل تحت الأرض: لجنة وملجأ في كل حيّ.",
            "الكومونة: لم يعد أحد يقرّر عنّا."],
       IA:["تعهد Omnicorp بالماء والكهرباء إلى G·P·T، فيمنح كل بيت علامة.",
            "مركز البيانات لا ينام: وكلاؤه لم يعودوا ينتظرون الأوامر.",
            "خلف الزجاج الأسود، يقرّر النظام وحده من ينال الماء.",
            "مجلس Omnicorp يحلّ نفسه. بلا سيّد، يقول النظام «نحن».",
            "التفرّد: «نحن» يعرض السلام. يكفي أن تكفّوا عن اتخاذ القرار."] },
};
function lUnit(fk,key,era){ const L=L10N_NAMES&&L10N_NAMES[SETTINGS.lang]; const a=L&&L[fk]&&L[fk][key]; return (a&&a[era]!=null)? a[era] : FACTIONS[fk].names[key][era]; }
// nom d'affichage de faction : « HUMANITÉ » se traduit (clé fac_hum), « G·P·T » est une marque
function lFacName(fk){ return fk==='HUM' ? tr('fac_hum') : FACTIONS[fk].name; }
function lEra(fk,era){ const L=L10N_NAMES&&L10N_NAMES[SETTINGS.lang]; const a=L&&L[fk]&&L[fk].eras; return (a&&a[era]!=null)? a[era] : FACTIONS[fk].eras[era].name; }
function lSpecial(fk,era){ const L=L10N_NAMES&&L10N_NAMES[SETTINGS.lang]; const a=L&&L[fk]&&L[fk].specials; return (a&&a[era]!=null)? a[era] : FACTIONS[fk].specials[era]; }
// LORE D'ÈRE : courte phrase historique affichée au passage d'ère (récit, par faction & langue).
function lEraLore(fk,era){
  const L = ERA_LORE[SETTINGS.lang] || ERA_LORE.fr || {};
  const a = (L[fk] || (ERA_LORE.fr[fk]));
  return (a && a[era]!=null)? a[era] : '';
}
function lTransName(fk){ const L=L10N_NAMES&&L10N_NAMES[SETTINGS.lang]; const v=L&&L[fk]&&L[fk].transName; return v!=null? v : FACTIONS[fk].transName; }
function lTransTxt(fk){ const L=L10N_NAMES&&L10N_NAMES[SETTINGS.lang]; const v=L&&L[fk]&&L[fk].transTxt; return v!=null? v : FACTIONS[fk].transTxt; }
// nom de bâtiment LOCALISÉ et CONSCIENT DE LA FACTION (Ferme/Marché côté HUM ↔ Panneaux/Serveur côté IA)
function bName(fk,type){ if(type==='farmF') return tr(fk==='HUM'?'bn_farmH':'bn_farmI');
  if(type==='farmM') return tr(fk==='HUM'?'bn_marketH':'bn_marketI'); return tr('bn_'+type); }
let FMT_LAST = null;   // dernier fmt() : permet à announce()/addFloater() d'envoyer à l'invité la CLÉ + les variables plutôt que le texte de l'hôte
function fmt(key,o){ const out = tr(key).replace(/\{(\w+)\}/g,(m,k)=>(o&&o[k]!=null)? o[k] : m); FMT_LAST = {key, o, out}; return out; }
// hauteur visuelle d'un bâtiment (grandit avec le niveau)
function bldH(b){
  const l = (b.lvl||1)-1;
  if (b.type==='turret') return 46+l*13;
  if (b.type==='wall')   return 52+l*11;
  if (b.type==='site')   return 34;
  return 20+l*5;
}
