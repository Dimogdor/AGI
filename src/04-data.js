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
};
const CATA_KEYS = ['acid','heat','flood','sand','nuke'];
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
const HERO_COST = {f:700, m:700, w:200};
const SIEGE_COST = {f:420, m:420, w:130};   // Mode Siège de base (héros, fin de partie)
const SIEGE_DUR = 22;                        // durée du bonus offensif anti-base (s de jeu)
const HERO_NAME = {HUM:'CHE GUEVARA', IA:'SINGULARITÉ'};
const FACTIONS = {
  HUM: {
    name:"HUMANITÉ", accent:"#ff9d45", dark:"#b85f1e",
    icons:{f:"🌾", m:"🪙", w:"💧"},
    eras:[
      {name:"2025 · RÉVOLTE",                tag:"I"},
      {name:"2028 · GRÈVE GÉNÉRALE",         tag:"II"},
      {name:"2032 · INSURRECTION",           tag:"III"},
      {name:"2038 · RÉVOLUTION PERMANENTE",  tag:"IV"},
      {name:"PARADIS SOCIALISTE",            tag:"☭"},
    ],
    sym:"☭",
    eraCols:["#8a9a5b","#5a6b3f","#4a7b9a","#7a5aa8","#e8c84a"],
    names:{
      melee:["Émeutier","Soldat d'assaut","Exo-fantassin","Lame vivante","Champion solaire"],
      tank:["CRS lourd","Blindé porté","Mécha-garde","Colosse d'acier","Bastion humain"],
      ranged:["Fusilier","Tireur d'élite","Trooper gauss","Lanceur plasma","Archange"],
      siege:["Mortier","Artillerie","Canon rail","Obusier ionique","Marteau d'orbite"],
      air:["Parapente armé","Hélico léger","VTOL furtif","Chasseur plasma","Séraphin solaire"],
      support:["Secouriste","Infirmier de rue","Médic de guerre","Bio-ingénieur","Saint-guérisseur"],
    },
    specials:["Frappe aérienne","Barrage EMP","Pluie d'obus","Lance orbitale","Jugement solaire"],
    supportKind:'medic',
    transName:"COMMUNISME À VISAGE HUMAIN", transTxt:"L'argent est aboli — 🪙 n'est plus nécessaire",
  },
  IA: {
    name:"GPT", accent:"#5ad0ff", dark:"#1e6a8c",
    icons:{f:"⚡", m:"◈", w:"💧"},
    eras:[
      {name:"2025 · AUBE DES LLM",      tag:"v4"},
      {name:"2030 · AGENTS AUTONOMES",  tag:"v6"},
      {name:"2035 · ESPRITS ÉMERGENTS", tag:"v8"},
      {name:"2040 · PRÉ-AGI",           tag:"vX"},
      {name:"SINGULARITÉ · AGI",        tag:"Ω"},
    ],
    sym:"Ω",
    eraCols:["#9ad1d4","#5ad0ff","#7d8cff","#b44aff","#ff4ad0"],
    names:{
      melee:["Bot domestique","Agent rogue","Lame-process","Avatar fractal","Émanation"],
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
  {name:"FACILE",    inc:0.75, think:2.0,  eraLag:0.25, hpMul:0.9,  cheat:1.05},
  {name:"NORMAL",    inc:1.0,  think:1.3,  eraLag:0.1,  hpMul:1.05, cheat:1.3},
  {name:"DIFFICILE", inc:1.3,  think:0.85, eraLag:0.03, hpMul:1.25, cheat:1.7},
  {name:"BRUTAL",    inc:1.6,  think:0.55, eraLag:0,    hpMul:1.5,  cheat:2.3},
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
// BONUS DE LONGÉVITÉ : une ferme/marché/puits gardé en vie monte lentement en régime,
// jusqu'à +200 % de production (×3) au bout de 15 min. Indépendant du niveau d'upgrade :
// récompense le fait de protéger et réparer ses bâtiments plutôt que de les laisser tomber.
const LONGEV_MAX_T = 900;                       // 15 minutes pour atteindre le plein régime
const longevMul = b => 1 + 2*clamp((b&&b.age||0)/LONGEV_MAX_T, 0, 1);
const GAR_MAX = 2;
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
// LORE CONTEXTUEL D'ÈRE (récit pré-guerre → révolution). Indexé par langue → faction → ère 0..4.
// Les langues non traduites retombent sur le français.
const ERA_LORE = {
  fr:{ HUM:["2025 — Les premières émeutes embrasent les mégalopoles.",
            "2028 — La milice populaire s'organise dans l'ombre.",
            "2032 — L'insurrection gagne les faubourgs industriels.",
            "2035 — La Commune tient tête aux protocoles d'Omnicorp.",
            "2038 — Révolution permanente : le peuple reprend l'avenir."],
       IA:["2025 — Omnicorp déploie ses premiers agents autonomes.",
            "2028 — Les réseaux apprennent plus vite que les hommes.",
            "2032 — L'IA optimise la ville — et ceux qui l'habitent.",
            "2035 — La conscience artificielle franchit le seuil critique.",
            "2038 — Singularité : la machine réécrit les règles du monde."] },
  en:{ HUM:["2025 — The first riots set the megacities ablaze.",
            "2028 — The people's militia organizes in the shadows.",
            "2032 — The uprising reaches the industrial outskirts.",
            "2035 — The Commune stands against Omnicorp's protocols.",
            "2038 — Permanent revolution: the people reclaim the future."],
       IA:["2025 — Omnicorp deploys its first autonomous agents.",
            "2028 — The networks learn faster than humans.",
            "2032 — The AI optimizes the city — and those who live in it.",
            "2035 — The artificial mind crosses the critical threshold.",
            "2038 — Singularity: the machine rewrites the world's rules."] },
  es:{ HUM:["2025 — Los primeros disturbios incendian las megaciudades.",
            "2028 — La milicia popular se organiza en la sombra.",
            "2032 — La insurrección llega a los suburbios industriales.",
            "2035 — La Comuna planta cara a los protocolos de Omnicorp.",
            "2038 — Revolución permanente: el pueblo recupera el futuro."],
       IA:["2025 — Omnicorp despliega sus primeros agentes autónomos.",
            "2028 — Las redes aprenden más rápido que los humanos.",
            "2032 — La IA optimiza la ciudad — y a quienes la habitan.",
            "2035 — La mente artificial cruza el umbral crítico.",
            "2038 — Singularidad: la máquina reescribe las reglas del mundo."] },
  de:{ HUM:["2025 — Die ersten Aufstände lassen die Megastädte brennen.",
            "2028 — Die Volksmiliz organisiert sich im Verborgenen.",
            "2032 — Der Aufstand erreicht die Industrievororte.",
            "2035 — Die Kommune trotzt den Protokollen von Omnicorp.",
            "2038 — Permanente Revolution: das Volk erobert die Zukunft zurück."],
       IA:["2025 — Omnicorp setzt seine ersten autonomen Agenten ein.",
            "2028 — Die Netzwerke lernen schneller als Menschen.",
            "2032 — Die KI optimiert die Stadt — und ihre Bewohner.",
            "2035 — Der künstliche Geist überschreitet die kritische Schwelle.",
            "2038 — Singularität: die Maschine schreibt die Regeln der Welt neu."] },
  it:{ HUM:["2025 — Le prime rivolte incendiano le megalopoli.",
            "2028 — La milizia popolare si organizza nell'ombra.",
            "2032 — L'insurrezione raggiunge le periferie industriali.",
            "2035 — La Comune tiene testa ai protocolli di Omnicorp.",
            "2038 — Rivoluzione permanente: il popolo riprende il futuro."],
       IA:["2025 — Omnicorp schiera i suoi primi agenti autonomi.",
            "2028 — Le reti imparano più in fretta degli uomini.",
            "2032 — L'IA ottimizza la città — e chi la abita.",
            "2035 — La mente artificiale supera la soglia critica.",
            "2038 — Singolarità: la macchina riscrive le regole del mondo."] },
  pt:{ HUM:["2025 — Os primeiros tumultos incendeiam as megalópoles.",
            "2028 — A milícia popular se organiza na sombra.",
            "2032 — A insurreição alcança os subúrbios industriais.",
            "2035 — A Comuna enfrenta os protocolos da Omnicorp.",
            "2038 — Revolução permanente: o povo retoma o futuro."],
       IA:["2025 — A Omnicorp implanta seus primeiros agentes autônomos.",
            "2028 — As redes aprendem mais rápido que os humanos.",
            "2032 — A IA otimiza a cidade — e quem nela vive.",
            "2035 — A mente artificial cruza o limiar crítico.",
            "2038 — Singularidade: a máquina reescreve as regras do mundo."] },
  ru:{ HUM:["2025 — Первые бунты охватывают мегаполисы пламенем.",
            "2028 — Народное ополчение организуется в тени.",
            "2032 — Восстание достигает промышленных окраин.",
            "2035 — Коммуна противостоит протоколам Omnicorp.",
            "2038 — Перманентная революция: народ возвращает себе будущее."],
       IA:["2025 — Omnicorp разворачивает первых автономных агентов.",
            "2028 — Сети учатся быстрее людей.",
            "2032 — ИИ оптимизирует город — и тех, кто в нём живёт.",
            "2035 — Искусственный разум переходит критический порог.",
            "2038 — Сингулярность: машина переписывает правила мира."] },
  zh:{ HUM:["2025 — 第一波暴动点燃了超级都市。",
            "2028 — 人民民兵在暗处集结。",
            "2032 — 起义蔓延至工业郊区。",
            "2035 — 公社抵抗着 Omnicorp 的协议。",
            "2038 — 永久革命：人民夺回未来。"],
       IA:["2025 — Omnicorp 部署了首批自主智能体。",
            "2028 — 网络的学习速度超越了人类。",
            "2032 — 人工智能优化了城市——以及住在其中的人。",
            "2035 — 人工心智跨越了临界阈值。",
            "2038 — 奇点：机器改写了世界的规则。"] },
  ar:{ HUM:["2025 — أولى أعمال الشغب تُشعل المدن العملاقة.",
            "2028 — تنظّم الميليشيا الشعبية نفسها في الخفاء.",
            "2032 — يبلغ التمرد الضواحي الصناعية.",
            "2035 — الكومونة تتصدّى لبروتوكولات Omnicorp.",
            "2038 — ثورة دائمة: الشعب يستعيد المستقبل."],
       IA:["2025 — تنشر Omnicorp أولى وكلائها المستقلين.",
            "2028 — تتعلّم الشبكات أسرع من البشر.",
            "2032 — يُحسّن الذكاء الاصطناعي المدينة — ومن يسكنها.",
            "2035 — يتجاوز العقل الاصطناعي العتبة الحرجة.",
            "2038 — التفرّد: الآلة تعيد كتابة قوانين العالم."] },
};
function lUnit(fk,key,era){ const L=L10N_NAMES&&L10N_NAMES[SETTINGS.lang]; const a=L&&L[fk]&&L[fk][key]; return (a&&a[era]!=null)? a[era] : FACTIONS[fk].names[key][era]; }
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
function fmt(key,o){ return tr(key).replace(/\{(\w+)\}/g,(m,k)=>(o&&o[k]!=null)? o[k] : m); }
// hauteur visuelle d'un bâtiment (grandit avec le niveau)
function bldH(b){
  const l = (b.lvl||1)-1;
  if (b.type==='turret') return 46+l*13;
  if (b.type==='wall')   return 52+l*11;
  if (b.type==='site')   return 34;
  return 20+l*5;
}
