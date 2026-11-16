# Audit du lore et de la chronologie — proposition de nouvelle frise

> Analyse et proposition seulement : aucun fichier du jeu n'est modifié. Ce document recense
> les incohérences de dates, de noms, de lieux et de narration entre l'escarmouche, la campagne,
> le menu, la bible et la fiche des magasins. Il propose ensuite une frise qui commence en **2028**
> et devient volontairement floue, de nouveaux noms d'ères, puis la liste précise des textes à
> changer.
>
> Sources lues : `src/04-data.js`, `src/02-i18n.js` (tables fr et `L10N_NAMES`), `src/08-actions.js`,
> `src/13-hud.js`, `src/12-render.js`, `src/16-news.js`, `src/15-tutorial.js`, `src/21b-guide.js`,
> `src/shell.html`, `src/16b-campaign.js`, `src/16c-cine.js`, `src/16d…16h-camp-m*.js`,
> `docs/campagne/BIBLE.md` et `M1…M5.md`, `STORE-LISTING.md`, `tools/voice/` (inventaire des voix).
> Les numéros de ligne sont ceux du dépôt au moment de l'audit. Dans `src/02-i18n.js`, toute la table
> française tient sur la **ligne 7** : on donne alors la clé.

## Le problème en bref

1. **Trois calendriers se contredisent** : les noms d'ères (`FACTIONS`), les phrases de lore d'ère
   (`ERA_LORE`) et la bible ne donnent pas les mêmes années. En plus, `ERA_LORE` est **décalé d'un
   cran** par rapport aux noms d'ères.
2. **La campagne affiche deux calendriers en même temps** : le HUD montre l'année de la mission
   (« 2035 · ROCHEFROIDE ») pendant que l'annonce d'ère montre l'année de l'escarmouche
   (« VOS FORCES : 2038 · RÉVOLUTION PERMANENTE »). En 2038, Sol annonce même que l'adversaire passe
   en « Pré-AGI », l'ère datée 2040.
3. **2025 est déjà passé** pour le joueur (nous sommes fin 2026) : un récit d'anticipation qui
   s'ouvre dans le passé n'est plus « proche futur ».
4. **Les dates précises fabriquent des erreurs** : « trois ans plus tard » qui fait deux ans et
   demi, un « 14:00 » qui veut dire 14 minutes, une épilogue en 2049, hors de l'univers 2025-2040.
5. **Les noms d'ères ne racontent pas la campagne** : « AUBE DES LLM » est du jargon réel,
   « PARADIS SOCIALISTE » et « RÉVOLUTION PERMANENTE » cassent le ton civique, et « la Commune »
   désigne deux ères différentes selon le texte.

---

## 1. Incohérences relevées

Chaque entrée donne le fichier, la ligne, le texte exact et le problème. Les plus graves sont
marquées **(grave)** : elles se voient à l'écran pendant une partie normale.

### A. Dates et ères

**A1 (grave). Le lore d'ère est décalé d'un cran par rapport au nom de l'ère.**
Au passage d'ère, le jeu annonce le nom (`lEra`), puis affiche la phrase `ERA_LORE` du **même
index** (`src/08-actions.js:141` et `:144`). Les deux tableaux ne correspondent pas :

| Index | Nom affiché (`src/04-data.js:64-68`) | Lore affiché juste dessous (`src/04-data.js:155-159`) |
|---|---|---|
| 1 | `2028 · GRÈVE GÉNÉRALE` | « 2028 — La milice populaire s'organise dans l'ombre. » |
| 2 | `2032 · INSURRECTION` | « 2032 — L'insurrection gagne les faubourgs industriels. » |
| 3 | `2038 · RÉVOLUTION PERMANENTE` | « 2035 — La Commune tient tête aux protocoles d'Omnicorp. » |
| 4 | `PARADIS SOCIALISTE` | « 2038 — Révolution permanente : le peuple reprend l'avenir. » |

| Index | Nom affiché (`src/04-data.js:88-92`) | Lore affiché (`src/04-data.js:160-164`) |
|---|---|---|
| 1 | `2030 · AGENTS AUTONOMES` | « 2028 — Les réseaux apprennent plus vite que les hommes. » |
| 2 | `2035 · ESPRITS ÉMERGENTS` | « 2032 — L'IA optimise la ville — et ceux qui l'habitent. » |
| 3 | `2040 · PRÉ-AGI` | « 2035 — La conscience artificielle franchit le seuil critique. » |
| 4 | `SINGULARITÉ · AGI` | « 2038 — Singularité : la machine réécrit les règles du monde. » |

À l'ère IV humaine, le joueur lit « 2038 » puis « 2035 » ; à l'ère V, « Paradis socialiste » puis
« Révolution permanente ». Le même décalage existe dans les huit autres langues (`src/04-data.js:165-244`).
L'index 0 n'est jamais affiché (on ne « passe » jamais en ère I).

**A2 (grave). Trois calendriers pour l'IA.**
- Noms d'ères : 2025 / 2030 / 2035 / 2040 / Singularité (`src/04-data.js:88-92`).
- Lore d'ère : 2025 / 2028 / 2032 / 2035 / 2038 (`src/04-data.js:160-164`).
- Bible : v4 en 2025, v6 « préversion » en 2028 puis généralisée en 2030, v8 en 2032-2035, vX et Ω en
  2038 (`docs/campagne/BIBLE.md:72-78`).
- Conséquence : dans la campagne, la Singularité arrive en 2038, **avant** la « Pré-AGI » datée 2040.

**A3 (grave). La campagne montre des années d'escarmouche fausses pour la mission.**
- Le HUD de campagne affiche l'année de la mission (`src/13-hud.js:318` : « campagne : l'année et le
  lieu de la mission, pas l'année de l'ère »), mais l'annonce et le lore d'ère restent ceux de
  l'escarmouche (`src/08-actions.js:141-144`). Deux années différentes à l'écran en même temps.
- **M4 (janvier 2035)**, passage en ère IV (`src/16g-camp-m4.js:637`, `eraCap:3`) : « VOS FORCES :
  2038 · RÉVOLUTION PERMANENTE », puis « 2035 — La Commune tient tête aux protocoles d'Omnicorp. » —
  alors que la cinématique d'ouverture vient de dire que le conseil d'Omnicorp s'est dissous
  (`src/16g-camp-m4.js:484` : « Janvier 2035. Le conseil d'Omnicorp a voté sa propre dissolution »).
  Le lore cite une entreprise qui n'existe plus.
- **M5 (août 2038)** : l'adversaire passe en vX à 3 minutes (`docs/campagne/M5.md:148`, réglé sans
  annonce en `src/16h-camp-m5.js:1266`), et Sol nomme l'ère datée 2040 : `src/16h-camp-m5.js:179`
  « Ils passent en Pré-AGI. Montez d'ère vous aussi, sans attendre. » (réplique **voisée**). Quand le
  joueur monte lui-même en ère V, il lit « VOS FORCES : PARADIS SOCIALISTE », puis « 2038 —
  Révolution permanente… » (voir A1).
- **M2 (mars 2028)** : le portail affiche `src/16e-camp-m2.js:352` « ASSURÉE PAR GPT v6 », alors que
  l'ère v6 est datée 2030. La bible reconnaît la contradiction et l'explique par une « préversion »
  (`docs/campagne/BIBLE.md:81-84`), mais le joueur ne la voit expliquée nulle part.

**A4 (grave). « 2025 » est déjà dans le passé.**
Le jeu se présente comme une anticipation, mais son année de départ est derrière nous :
- `src/shell.html:447` et `src/02-i18n.js:7` (`tagline`) : « la dernière bataille de l'humanité · 2025 »
- `src/02-i18n.js:7` (`a_start`) : « ⚔ 2025 — LA GUERRE COMMENCE ⚔ » (début de chaque escarmouche,
  `src/07-decor.js:143`)
- `src/02-i18n.js:7` (`lore0`) : « 2025. Le travail s'est éteint, et les ressources avec lui. »
- `src/02-i18n.js:7` (`about_game`) : « — de la révolte de 2025 à la transcendance — »
- `STORE-LISTING.md:41` « 2025. Le travail s'est éteint… », `:55` « De la débrouille de 2025… »,
  `:100` « 2025. Labor has gone dark… », `:113` « From the scrappy streets of 2025… »
- Campagne : `src/16d-camp-m1.js:198` « nuit du 14 octobre 2025 », `:283` « Octobre 2025. »,
  `:321` « octobre 2025 », `:652` `year:"2025"`.

**A5. « AUBE DES LLM » sort de la fiction.**
`src/04-data.js:88` « 2025 · AUBE DES LLM ». Dans le monde du jeu, GPT veut dire **Gestion Prédictive
Totale** : un système de gestion vendu aux villes (`docs/campagne/BIBLE.md:152`), pas un modèle de
langage. Le mot « LLM » renvoie au monde réel, et l'« aube » des LLM est d'ailleurs antérieure à 2025.

**A6. Les « agents autonomes » arrivent deux fois.**
`src/04-data.js:160` « 2025 — Omnicorp déploie ses premiers agents autonomes. » alors que l'ère
suivante s'appelle `2030 · AGENTS AUTONOMES` (`src/04-data.js:89`).

**A7 (grave). Le « premier Mécha-garde » de M4 n'est pas un engin d'ère IV.**
- `src/16g-camp-m4.js:509` (déclenché par `g.p.era >= 3`, ligne 650) : « Les ateliers de la Commune
  ont sorti leur premier Mécha-garde. Il n'a pas froid, lui non plus. » (réplique **voisée**)
- Le Mécha-garde est le blindé de l'**ère III** (`src/04-data.js:74`, index 2) ; le joueur l'a déjà
  en M3 et dès le début de M4 (`era0:2`). L'engin d'ère IV s'appelle « Colosse d'acier ».
- La bible reprend l'erreur : `docs/campagne/BIBLE.md:77` « premiers mécha-gardes de la Commune »,
  `docs/campagne/M4.md:186`.

**A8. Date de la dissolution d'Omnicorp.**
`docs/campagne/BIBLE.md:154` « après la dissolution du conseil d'Omnicorp (novembre 2034) » contre
`src/16g-camp-m4.js:484` « Janvier 2035. Le conseil d'Omnicorp a voté sa propre dissolution » (qui
se lit comme un vote de janvier) et `docs/campagne/BIBLE.md:77` (ligne 2035 du tableau).

**A9. Kassandre est une « instance de GPT v6 » qui écrit avant que v6 existe.**
`docs/campagne/BIBLE.md:164` « Une instance de GPT v6 affectée à la logistique d'Omnicorp » et `:75`
« 2030 · GPT v6 … Kassandre (instance 55) en fait partie », mais elle sonne dès 2025, trois jours
après M1 : `src/16d-camp-m1.js:516` « Trois jours plus tard, un bipeur que personne n'avait acheté a
sonné sur ma table. Deux chiffres. »

**A10. « Cinq nuits, treize ans » : une seule mission se passe la nuit.**
- `src/16b-campaign.js:32` « Cinq nuits, treize ans. Tenus par Sol, opératrice radio. »
- `src/16b-campaign.js:49` « Chaque mission est une nuit décisive de ces treize années. »
- `docs/campagne/BIBLE.md:31` « Cinq nuits, treize ans. »
- En réalité : M1 la nuit ; M2 de l'aube à midi (`docs/campagne/M2.md:11`) ; M3 de 11 h à 17 h
  (`M3.md:11`) ; M4 de 14 h à la nuit tombante (`M4.md:11`) ; M5 de l'aube à midi passé (`M5.md:12`).
  Le chiffre « treize » n'est juste que si l'on garde 2025-2038.

**A11. « 14:00 » dans une mission de nuit.**
`src/16d-camp-m1.js:216` « finir avant l'aube (14:00). » Il s'agit de 14 minutes de jeu
(`src/16d-camp-m1.js:549`, `M1_DAWN0 = 840`), mais dans une nuit d'octobre, « 14:00 » se lit
« deux heures de l'après-midi ».

**A12. L'épilogue « Aube » sort de l'univers et contredit le compte rendu.**
- `src/16h-camp-m5.js:235` « Onze ans plus tard, une nuit de garde, le bipeur a sonné sur la table. »
  (réplique **voisée**) et la planche datée à la main `src/16h-camp-m5.js:1116` « 2049 ». L'univers
  du jeu est 2025-2040 ; Sol aurait 82 ans (`docs/campagne/M5.md:385`).
- `src/16h-camp-m5.js:99` (compte rendu « Aube ») : « Ses carnets s'achèvent sur une consigne… »,
  alors que la cinématique continue le carnet onze ans plus tard, à la première personne.

**A13. « Le bipeur n'a plus jamais sonné »… sauf qu'il sonne.**
`src/16g-camp-m4.js:464` (compte rendu) et `:522` (réplique **voisée**) : « Le bipeur n'a plus jamais
sonné. » Dans la fin « Aube », il sonne (`src/16h-camp-m5.js:235`). Sol écrit en M4 une phrase que
la fin dément.

**A14. Durées relatives approximatives.**
- `src/16e-camp-m2.js:768` « Il y a trois ans, la rue des Tanneurs a rallumé la lumière. »
  (octobre 2025 → mars 2028 : deux ans et cinq mois).
- `src/16f-camp-m3.js:687` « Trois ans plus tard, l'hiver est tombé d'un coup. » (juillet 2032 →
  janvier 2035 : deux ans et demi).
- `src/16g-camp-m4.js:524` « Trois ans plus tard, « nous » a posé sa citadelle » (janvier 2035 →
  août 2038 : trois ans et demi).
Ce n'est pas grave en soi, mais c'est exactement le genre d'erreur que produisent des dates trop
précises.

**A15. Une retouche annoncée dans la bible n'a jamais été faite.**
`docs/campagne/BIBLE.md:464-465` propose d'aligner « 2038 · RÉVOLUTION PERMANENTE » sur 2035 ; le
code n'a pas bougé (`src/04-data.js:67`).

**A16. Les bases portent des années peintes.**
`src/12-render.js:3237` « DATACENTER · 2030 » (base GPT d'ère II) et `src/12-render.js:3104`
« QG · 38 » (base humaine d'ère IV, clin d'œil à 2038). Les commentaires de
`src/12-render.js:1741, 2590, 2812-2815, 2919, 2980, 3030, 3083, 3182, 3223, 3257, 3293` répètent ces
années (sans effet à l'écran).

### B. Âges

**B1.** Les âges sont attachés aux années : Sol a « 58 ans en 2025, 71 en 2038 »
(`docs/campagne/BIBLE.md:106-107`), « 70 ans » pour la narratrice (`:201`), « 58-71 ans selon la
mission » (`:203`), 82 ans dans l'épilogue (`docs/campagne/M5.md:385`), « 58 à 71 ans » dans la
distribution (`tools/voice/cast.json:26`), et elle le dit : `src/16h-camp-m5.js:161` « J'ai soixante
et onze ans, commandant, et je suis fatiguée. » Les calculs sont justes, mais ils devront changer
avec la frise. Les autres âges (Mado 45, Inès 32, Anselme 74, Malik 34) ne dépendent d'aucune date.

### C. Noms

**C1. GPT ou G·P·T ?** Le nom de la faction est « GPT » (`src/04-data.js:85`), la campagne écrit
« GPT v6 » (`src/16e-camp-m2.js:352`) et la bible « GPT » (`BIBLE.md:152`). Mais l'interface écrit
« G·P·T » : `src/02-i18n.js:7` (`about_game`, `lob_hint`), 11 fois dans `src/16-news.js`, 9 fois dans
`src/21b-guide.js`, 5 fois dans `src/shell.html` ; le commentaire de `src/04-data.js:247` dit
« « G·P·T » est une marque ».

**C2. Omnicorp, « la Corporation », « une mégacorporation ».** La bible fixe « Omnicorp »
(`BIBLE.md:151`). Le fil d'actualités dit « la Corporation » (`src/16-news.js:16, 51, 56, 76`),
l'introduction « Une mégacorporation possède le monde » (`src/02-i18n.js:7`, `lore0`).

**C3. « nous » ou « Nous » ?** La bible veut « nous », en minuscules et entre guillemets
(`BIBLE.md:154`). `src/16b-campaign.js:49` écrit « ce qui, plus tard, se fera appeler « Nous » ».
(Le libellé de portrait « « NOUS » », `src/16c-cine.js:27`, est en capitales comme tous les
libellés : il est correct.)

**C4. « La Commune » désigne deux ères.** `ERA_LORE` place la Commune à l'index 3, en 2035
(`src/04-data.js:158`) ; la bible parle de la « Commune de Rochefroide » en 2035 (`BIBLE.md:77`) ;
M4 dit « les ateliers de la Commune » (`src/16g-camp-m4.js:509`). Mais la base qui ressemble à une
commune (« commune solarpunk ») est celle de l'**ère V** (`src/12-render.js:2813`), et l'ère IV est
une « base militaire révolutionnaire ».

**C5. « Grève générale » est à la fois une ère humaine et un malus humain.** L'ère II humaine
s'appelle `2028 · GRÈVE GÉNÉRALE` (`src/04-data.js:65`) et la mission II en fait l'arme des humains.
Mais en escarmouche, l'événement « Grève générale » **paralyse les humains** :
`src/02-i18n.js:7` (`ev_strike`) « ✊ GRÈVE GÉNÉRALE — les humains cessent d'attaquer (15 s) »,
`src/21b-guide.js:20`, `src/16-news.js:97` « Grève générale : les usines humaines à l'arrêt ».

**C6. La suite « Pré-AGI → Singularité · AGI → AGI complète » tourne en rond.**
`src/04-data.js:91-92` et `:106` (`transName:"AGI COMPLÈTE"`) : l'« AGI complète » arrive **après**
la Singularité, qui est déjà « · AGI ».

**C7. Qui forme Germinal ?** `src/16b-campaign.js:49` « des soignantes, des livreurs, des cheminots »
contre `BIBLE.md:31` « aides-soignantes, dockers, cheminots, une standardiste des pompiers ». Les
dockers sont ceux de Mado, au port (M2), pas des membres de Germinal. Écart mineur.

**C8. « la Résistance ».** Le fil d'actualités et l'affiche du menu parlent de « la Résistance »
(`src/16-news.js:20, 51` ; `src/02-i18n.js:7`, `menu_poster_foot` « Comité de Résistance »), la
campagne de « Germinal », « les cellules », « le comité ». Acceptable en escarmouche (c'est le camp
vu de loin), à garder en tête.

### D. Lieux

**D1. Un estuaire dans l'est de la France.** `docs/campagne/BIBLE.md:62` « Valmont est une ville
moyenne de l'est de la France, sur l'estuaire de l'Aube ». M2 montre un port de mer : mouettes,
cargos au mouillage, canonnières, corne de brume (`src/16e-camp-m2.js:64`). L'est de la France n'a
pas de côte, et l'Aube réelle est un affluent de la Seine, sans estuaire. Aucun texte du jeu ne dit
« est » : seule la bible est à corriger.

**D2. Quarante mille grévistes dans une ville moyenne.** `src/16e-camp-m2.js:768, 828, 841, 881`
(« quarante mille personnes »). « À midi, onze villes avaient débrayé » (`:877`) dit que ces
40 000 sont ceux de Valmont seule. C'est beaucoup pour une « ville moyenne ». Retouche facultative
(« dix mille »).

**D3. « Mégalopoles ».** `src/04-data.js:155` « 2025 — Les premières émeutes embrasent les
mégalopoles. » contre un monde « proche du nôtre, à peine décalé », centré sur une ville moyenne
(`BIBLE.md:62-65`).

### E. Qui sait quoi, et qui raconte

**E1. Qui tient la plume à la fin ?** La bible fait de NAR « Sol en 2038, qui relit »
(`BIBLE.md:119`, `:201`). Mais :
- dans la fin « Cendre », Sol disparaît le jour même (`src/16h-camp-m5.js:90` « On n'a pas retrouvé
  le poste de radio de Sol ») ; pourtant, entre les actes de M5, NAR parle **au passé**, comme si
  elle avait écrit après la bataille : `src/16h-camp-m5.js:202` « Ceux qui tenaient encore debout
  sont restés garder la brèche derrière nous. », `:209` « Ceux de Brumaire sont restés dans les
  halles… » ;
- dans la fin « Aube », NAR parle en 2049 (`src/16h-camp-m5.js:235`), donc pas « en 2038 ».

**E2. Le prologue contredit la fin « Cendre ».** `docs/campagne/BIBLE.md:320` (P1, NAR2) : « Ces
carnets ont été retrouvés dans une boîte à biscuits, **sous un poste de radio**. » Dans la fin
« Cendre », le poste de radio de Sol est justement introuvable (`src/16h-camp-m5.js:90, 227`).
Remarque : ce prologue (P1-P5) n'existe pas dans `src/` (seule la planche finale A4 « La boîte à
biscuits », `src/16h-camp-m5.js:1040`, l'utilise).

**E3. L'introduction date la prise de pouvoir de la machine en 2025.** Le troisième tableau de
l'introduction (`src/12-render.js:308`, ordre `lore_work, lore_res, lore0, lore1…`) commence par
« 2025. » (`lore0`), et le suivant (`lore1`) dit : « la corporation obéit désormais à ce qu'elle
croyait posséder ». Dans la campagne, Omnicorp a encore un conseil jusqu'à M4 (« 2035 »).
En plus, `lore0` répète « Le travail s'est éteint », qui est déjà le titre du premier tableau
(`lore_ch[0]` « I · LE TRAVAIL S'ÉTEINT »).

**E4. La milice « dans l'ombre » contre la grève « à visage découvert ».** `src/04-data.js:156`
« 2028 — La milice populaire s'organise dans l'ombre. » contre `src/16e-camp-m2.js:844` « On marche à
visage découvert. »

### F. Ruptures de ton

Hors chronologie stricte, mais ce sont des incohérences avec la bible (« résistance civique… on se
bat contre des machines, jamais contre des gens. Personne n'est un héros tout seul »,
`BIBLE.md:43-45`). À trancher par l'auteur ; ce document ne propose pas de les changer d'office.

- **F1. Le héros humain est Che Guevara** (`src/04-data.js:58`, `src/02-i18n.js:7` `a_hero_hum` :
  « ✊ CHE GUEVARA À LA RESCOUSSE — ¡Hasta la victoria siempre! »). Une figure réelle de la lutte
  armée, dans une résistance civique à Valmont ; il est présent en M5 (`src/16h-camp-m5.js:73` « On
  garde l'ère, la forge et le héros »).
- **F2. La bombe H en M5** : `src/16h-camp-m5.js:215` « Tout l'arsenal est ouvert, la bombe H
  aussi. » (réplique **voisée**), et l'« hiver nucléaire » du tutoriel (`src/15-tutorial.js:499`).
  Une cellule civique qui largue une bombe H sur la plaine de sa propre ville.
- **F3. Étiquettes idéologiques** : « RÉVOLUTION PERMANENTE » (terme trotskiste), « PARADIS
  SOCIALISTE », « COMMUNISME À VISAGE HUMAIN » (`src/04-data.js:67-68, 82`). La campagne dit plus
  simplement : « que les humains continuent de décider pour eux-mêmes » (`src/16b-campaign.js:49`).
- **F4. Registre des unités** : « Archange », « Séraphin solaire », « Saint-guérisseur », « Marteau
  d'orbite », et « CRS lourd » comme unité de la résistance (`src/04-data.js:73-78`).
- **F5. L'apocalypse du fil d'actualités** (détonation nucléaire, 100 millions de réfugiés, dernier
  glacier, `src/16-news.js:29-45, 94-96`) : il est coupé en campagne (`src/16-news.js:181`), donc
  sans contradiction directe, mais l'introduction décrit un monde bien plus ravagé que la campagne.

---

## 2. Nouvelle chronologie

### Principes

1. **Une seule date à l'écran : 2028.** La première nuit (M1) est datée « octobre 2028 ». C'est
   aussi la seule année des noms d'ères (ère I des deux camps) et du menu.
2. **Ensuite, on compte comme les gens comptent** : en saisons, en hivers, en étés sans pluie.
   « Deux hivers plus tard », « le quatrième été sans pluie », « un hiver gris », « quelques saisons
   plus tard », « bien des hivers plus tard ». Jamais d'année, jamais de jour du mois.
3. **Les âges ne sont plus chiffrés**, sauf une fois, en arrondi (« presque soixante-dix ans »).
4. **Les versions de GPT (v4, v6, v8, vX, Ω) restent des étiquettes techniques**, sans année. Elles
   décrivent la machine, pas le calendrier.
5. **La campagne ne montre plus l'année de l'escarmouche** : les noms d'ères n'ont plus d'année
   (sauf l'ère I), donc l'annonce d'ère et le HUD ne peuvent plus se contredire.
6. Une **table de repères internes** (ci-dessous) est réservée à la bible. Elle sert aux auteurs pour
   ne pas se contredire ; ses années ne doivent jamais apparaître à l'écran.

### Repères (bible seulement) et ce qu'on dit à l'écran

| Repère interne | Ce que dit le jeu | Monde | Humanité (ère) | GPT (version) | Campagne |
|---|---|---|---|---|---|
| années 2020 | « ces dernières années » | Omnicorp rachète les régies (eau, courant, bus) « pour les optimiser » ; GPT les gère | — | v4 | — |
| printemps 2028 | « depuis le printemps » | Omnicorp gère l'eau et le courant de Valmont | — | v4 | (recap M1) |
| **octobre 2028** | « **octobre 2028** », « une nuit d'octobre » | compteurs, score de fiabilité, l'hôpital coupé onze minutes | **I · Révolte** | **v4 · Gestion prédictive** | **M1** |
| + 3 jours | « trois jours plus tard » | le bipeur sonne : « 55 » | | | outro M1 |
| hivers 2028-2030 | « deux hivers » | Omnicorp « désaffecte » au lieu de licencier | | | |
| mars ≈ 2030 | « deux hivers plus tard », « un matin de mars » | grève générale ; Radio-Quai ; onze villes débrayent | I → **II · Grève générale** | v4 → **v6 · Agents autonomes** | **M2** |
| été ≈ 2030 | « après la grève, la pluie s'est arrêtée » | la sécheresse commence | | | outro M2 |
| juillet ≈ 2033 | « **le quatrième été sans pluie** » | l'eau du barrage refroidit les centres de calcul ; la Voix | II → **III · Insurrection** | v6 → **v8 · L'Arbitrage** | **M3** |
| hiver ≈ 2034-2035 | « puis un hiver est tombé d'un coup », « **l'hiver gris** », « cet hiver-là » | le conseil d'Omnicorp se dissout ; le système dit « nous » ; Mnémosyne | III → **IV · Fédération** | v8 → **vX · « Nous »** | **M4** |
| fin d'été ≈ 2037 | « quelques saisons plus tard », « **la fin de l'été** » | la citadelle sur la plaine ; l'offre de paix | III → IV → **V · La Commune** | v8 → vX → **Ω · Singularité** | **M5** |
| ≈ 10 ans après | « bien des hivers plus tard » | (fin « Aube ») le bipeur sonne à la table de garde | — | — | épilogue |

- **Durée totale** : un peu moins de dix ans → « Cinq jours, dix ans ».
- **Sol** : 60 ans en octobre 2028 (trente ans au standard des pompiers) ; « presque soixante-dix
  ans » en M5 ; très âgée dans l'épilogue « Aube » (on ne dit pas l'âge).
- **Kassandre** : « une instance de la logistique d'Omnicorp, numéro 55 », sans version. Elle
  existe dès 2028 ; on ne dit plus qu'elle est « une v6 » (corrige A9).
- **La dissolution d'Omnicorp** a lieu « cet hiver-là », l'hiver de M4, après la perte de la vallée
  (corrige A8) : la défaite de Sainte-Aube devient la cause, ce qui renforce l'enchaînement.
- **Pourquoi des écarts inégaux ?** Deux hivers entre M1 et M2 : la désaffectation doit s'installer
  avant la grève. Trois étés entre M2 et M3 : il faut le « quatrième été sans pluie ». M4 suit M3 de
  près (« puis un hiver est tombé d'un coup ») et M5 vient « quelques saisons plus tard ». Rien de
  cela n'est chiffré à l'écran.

### Place de chaque mission

| | Écran de briefing (« Où nous sommes ») | Ouverture (1ʳᵉ réplique NAR) | Carton titre | HUD et carnet | Pont vers la suite (outro) |
|---|---|---|---|---|---|
| I | une nuit d'octobre 2028, sous la pluie | « Octobre 2028. Chez nous, l'eau s'est arrêtée un mardi… » | Valmont, rue des Tanneurs — octobre 2028 | OCTOBRE 2028 | « Trois jours plus tard, un bipeur… » (inchangé) |
| II | deux hivers plus tard, un matin de mars, à l'aube | « Deux hivers plus tard. À six heures… » | Le port de Valmont — un matin de mars | PRINTEMPS | « Après la grève, la pluie s'est arrêtée. Au quatrième été sec… » |
| III | en juillet, le quatrième été sans pluie, à midi | « Juillet. Le quatrième été sans pluie… » | Vallée de l'Aube — le quatrième été | ÉTÉ | « Puis un hiver est tombé d'un coup, gris, sans fin… » |
| IV | au cœur de l'hiver gris, −26 °C | « Cet hiver-là, le conseil d'Omnicorp a voté… » | Cité minière du puits Sainte-Barbe — l'hiver gris | HIVER | « Quelques saisons plus tard, « nous » a posé sa citadelle… » |
| V | à la fin de l'été, à l'aube | « La fin de l'été. Il n'y a plus de front… » | Acte I · Le mur — à l'aube | FIN DE L'ÉTÉ | Cendre : « La citadelle est tombée ce jour-là… » · Aube : « Bien des hivers plus tard… » |

Ères par mission (inchangées côté règles) : M1 ère I contre v4 ; M2 I-II contre v4-v6 ; M3 II-III
contre v6-v8 (« troisième génération ») ; M4 III-IV contre v8-vX ; M5 III-V contre v8-Ω.

### Narration : une règle simple pour E1 et E2

- **Sol écrit chaque carnet le soir même ou entre deux actes** : NAR parle au passé des missions
  terminées, au **présent** pendant M5. Dans la fin « Cendre », plus rien n'est écrit par Sol après
  la bataille : NAR2 prend le relais (c'est déjà le cas, `src/16h-camp-m5.js:1209-1214`). Il suffit
  donc de mettre au présent les deux répliques NAR entre les actes de M5 (`t2`, `t8`).
- **Fin « Aube »** : Sol a continué d'écrire pendant ses gardes ; ses carnets s'achèvent « bien
  plus tard ». Le compte rendu doit le dire (corrige A12).
- **Prologue** : les carnets sont retrouvés « dans une boîte à biscuits, avec un bipeur éteint »
  (vrai dans les deux fins), et non « sous un poste de radio » (corrige E2).

---

## 3. Nouveaux noms d'ères

Règles suivies : un nom court (HUD de 230 px), lisible par qui n'a pas joué la campagne, qui
correspond à l'apparence de la base, et qui renvoie à une mission. Seule l'ère I porte l'année.
Les étiquettes (`tag`) ne changent pas : I, II, III, IV, ☭ et v4, v6, v8, vX, Ω.

### Humanité

| Ère | Actuel | Proposé (fr) | Suggestion en | Base (`src/12-render.js:2812-2813`) | Lien avec la campagne |
|---|---|---|---|---|---|
| I | `2025 · RÉVOLTE` | **`2028 · RÉVOLTE`** | `2028 · REVOLT` | ZAD en palettes | M1 : les quartiers coupés se lèvent, on rallume la rue |
| II | `2028 · GRÈVE GÉNÉRALE` | **`GRÈVE GÉNÉRALE`** | `GENERAL STRIKE` | usine occupée | M2 : la grève prend Radio-Quai |
| III | `2032 · INSURRECTION` | **`INSURRECTION`** | `INSURRECTION` | quartier insurgé | M3 : les faubourgs et les villages reprennent les vannes |
| IV | `2038 · RÉVOLUTION PERMANENTE` | **`FÉDÉRATION`** | `FEDERATION` | base militaire → le QG des cellules fédérées | M4-M5 : Rochefroide, puis toutes les cellules (Fructidor, Brumaire, Thermidor, les Canuts) marchent ensemble |
| V | `PARADIS SOCIALISTE` | **`LA COMMUNE`** | `THE COMMUNE` | commune solarpunk | fin de M5 : « Le monde qui reste est abîmé. Il est à nous. » |
| transcendance (facultatif) | `COMMUNISME À VISAGE HUMAIN` | `TOUT EST À NOUS` | `ALL OF IT IS OURS` | — | reprend la dernière phrase des deux fins ; `transTxt` (« L'argent est aboli ») reste juste |

« La Commune » ne désigne plus que l'ère V. En M4, on parle des « forges de Rochefroide » et du
passage en **Fédération** (corrige C4 et A7).

### GPT

| Ère | Actuel | Proposé (fr) | Suggestion en | Base (`src/12-render.js:2814-2815`) | Lien avec la campagne |
|---|---|---|---|---|---|
| v4 | `2025 · AUBE DES LLM` | **`2028 · GESTION PRÉDICTIVE`** | `2028 · PREDICTIVE MANAGEMENT` | conteneur-serveur | M1 : les compteurs, le « score de fiabilité » ; donne le sens du sigle GPT |
| v6 | `2030 · AGENTS AUTONOMES` | **`AGENTS AUTONOMES`** | `AUTONOMOUS AGENTS` | datacenter | M2 : « continuité de service assurée par GPT v6 », les agents débarquent des barges |
| v8 | `2035 · ESPRITS ÉMERGENTS` | **`L'ARBITRAGE`** | `ARBITRATION` | campus de verre noir | M3 : la Voix, « cet arbitrage garantit la continuité de vos services » |
| vX | `2040 · PRÉ-AGI` | **`« NOUS »`** (variante : `SANS MAÎTRE`) | `“WE”` (variante : `MASTERLESS`) | arcologie-forteresse | M4-M5 : le conseil dissous, le système parle au pluriel |
| Ω | `SINGULARITÉ · AGI` | **`SINGULARITÉ`** | `SINGULARITY` | structure impossible | M5, acte III : le noyau, l'avatar |
| transcendance | `AGI COMPLÈTE` | inchangé (le titre du jeu dit « AGI ») | — | — | — |

Pourquoi « « NOUS » » plutôt que « Pré-AGI » : c'est le moment où l'adversaire change de nature
dans l'histoire (il n'a plus de propriétaire), et le joueur de campagne le reconnaît tout de suite.
Si les guillemets gênent dans le HUD ou les traductions, « SANS MAÎTRE » dit la même chose.

### Nouveau lore d'ère (`ERA_LORE`, français ; même index que le nom)

Sans année : l'annonce d'ère donne déjà le nom, la phrase raconte ce qui se passe.

| Index | Humanité | GPT |
|---|---|---|
| 0 | Octobre 2028 : les compteurs coupent l'eau. Les quartiers coupés se lèvent. | 2028 : Omnicorp confie l'eau et le courant à GPT. Le système note chaque foyer. |
| 1 | On ne licencie plus, on « désaffecte ». Alors tout le monde pose ses outils. | Ses agents n'attendent plus d'ordres : ils assurent la « continuité de service ». |
| 2 | Les centres de calcul boivent les rivières. Les faubourgs reprennent les vannes. | Le système arbitre seul : l'eau va d'abord à ceux qui calculent. |
| 3 | Les cellules se fédèrent : un comité par quartier, des ateliers partout. | Le conseil d'Omnicorp se dissout. Le système n'a plus de maître et dit « nous ». |
| 4 | La Commune : plus personne ne décide à notre place. | Singularité : « nous » propose la paix. Il suffirait de cesser de décider. |

---

## 4. Liste des changements

Légende des colonnes : **Trad.** = le texte existe en 9 langues et devra être retraduit ;
**Voix** = réplique enregistrée (l'empreinte de voix dépend du texte : elle redevient muette tant
qu'elle n'est pas régénérée, dans les 8 langues qui ont un moteur, `ar` n'en a pas). Les textes de
plus de 140 caractères sont des textes d'écran (briefing, compte rendu), pas des répliques.

### `src/04-data.js`

| Ligne | Actuel | Proposé | Trad. | Voix |
|---|---|---|---|---|
| 64 | `{name:"2025 · RÉVOLTE", tag:"I"}` | `{name:"2028 · RÉVOLTE", tag:"I"}` | oui (`L10N_NAMES`) | non |
| 65 | `"2028 · GRÈVE GÉNÉRALE"` | `"GRÈVE GÉNÉRALE"` | oui | non |
| 66 | `"2032 · INSURRECTION"` | `"INSURRECTION"` | oui | non |
| 67 | `"2038 · RÉVOLUTION PERMANENTE"` | `"FÉDÉRATION"` | oui | non |
| 68 | `"PARADIS SOCIALISTE"` | `"LA COMMUNE"` | oui | non |
| 82 (facultatif) | `transName:"COMMUNISME À VISAGE HUMAIN"` | `transName:"TOUT EST À NOUS"` | oui | non |
| 88 | `"2025 · AUBE DES LLM"` | `"2028 · GESTION PRÉDICTIVE"` | oui | non |
| 89 | `"2030 · AGENTS AUTONOMES"` | `"AGENTS AUTONOMES"` | oui | non |
| 90 | `"2035 · ESPRITS ÉMERGENTS"` | `"L'ARBITRAGE"` | oui | non |
| 91 | `"2040 · PRÉ-AGI"` | `"« NOUS »"` (ou `"SANS MAÎTRE"`) | oui | non |
| 92 | `"SINGULARITÉ · AGI"` | `"SINGULARITÉ"` | oui | non |
| 155-159 | `ERA_LORE.fr.HUM` (5 phrases datées 2025…2038) | les 5 phrases « Humanité » du § 3 | oui (lignes 165-244) | non |
| 160-164 | `ERA_LORE.fr.IA` (5 phrases datées 2025…2038) | les 5 phrases « GPT » du § 3 | oui | non |

Remarque : refaire `ERA_LORE` dans les 9 langues supprime le décalage A1 (le nouvel index 3 parle
bien de la Fédération, le 4 de la Commune).

### `src/02-i18n.js`

| Ligne · clé | Actuel | Proposé | Trad. | Voix |
|---|---|---|---|---|
| 7 · `tagline` | la dernière bataille de l'humanité · 2025 | la dernière bataille de l'humanité · 2028 | oui | non |
| 7 · `a_start` | ⚔ 2025 — LA GUERRE COMMENCE ⚔ | ⚔ 2028 — LA LUTTE COMMENCE ⚔ | oui | non |
| 7 · `lore_work` | « Les agents IA ont pris les bureaux, puis les entrepôts, puis les usines. » (1ʳᵉ ligne) | « 2028. Les agents IA ont pris les bureaux, puis les entrepôts, puis les usines. » | oui | non |
| 7 · `lore0` | « 2025. Le travail s'est éteint, et les ressources avec lui. » / « Une mégacorporation possède le monde — et en confie la gestion à l'intelligence qu'elle a forgée. » | « Une seule compagnie, Omnicorp, possède désormais l'eau, le courant et les routes. » / « Elle en confie la gestion à GPT, le système qu'elle a forgé : « il décide mieux que nous ». » | oui | non |
| 7 · `about_game` | « …évoluez à travers les ères — de la révolte de 2025 à la transcendance — … » | « …évoluez à travers les ères — de la révolte de 2028 à la transcendance — … » (le reste inchangé ; voir aussi C1 pour G·P·T) | oui | non |
| 7 · `ev_strike` (facultatif, C5) | ✊ GRÈVE GÉNÉRALE — les humains cessent d'attaquer (15 s) | ⛔ COUVRE-FEU — les humains cessent d'attaquer (15 s) | oui | non |
| 7 · `ev_strike_short` (facultatif) | ✊ GRÈVE GÉNÉRALE — humains à l'arrêt | ⛔ COUVRE-FEU — humains à l'arrêt | oui | non |
| 44 · `L10N_NAMES.<langue>.HUM.eras` et `.IA.eras` | les noms d'ères datés, dans 8 langues | traduction des nouveaux noms (suggestions anglaises au § 3) | oui (8 langues) | non |
| 44 · `L10N_NAMES.<langue>.HUM.transName` (facultatif) | COMMUNISM WITH A HUMAN FACE… | traduction de « TOUT EST À NOUS » | oui | non |

Si l'événement devient « Couvre-feu », changer aussi `src/21b-guide.js:20` (« ✊ **Grève générale**
(humains) ») dans les 9 langues et `src/16-news.js:97` (« Grève générale : les usines humaines à
l'arrêt » → « Couvre-feu : les machines bouclent les quartiers humains »).

### `src/shell.html`

| Ligne | Actuel | Proposé | Trad. | Voix |
|---|---|---|---|---|
| 447 | `la dernière bataille de l'humanité · 2025` (texte par défaut de `tagline`) | `la dernière bataille de l'humanité · 2028` | via `tagline` | non |

### `src/12-render.js` (texte peint sur les bases, non traduit)

| Ligne | Actuel | Proposé |
|---|---|---|
| 3237 | `bTxt('DATACENTER · 2030', …)` | `bTxt('DATACENTER', …)` |
| 3104 | `bTxt('QG · 38', …)` | `bTxt('QG', …)` |
| 1741, 2590, 2812-2815, 2919, 2980, 3030, 3083, 3182, 3223, 3257, 3293 | commentaires « 2025 · RÉVOLTE », « (2038) »… | reprendre les nouveaux noms d'ères (sans effet à l'écran) |

### `src/16b-campaign.js` (moteur de campagne)

| Ligne | Actuel | Proposé | Trad. | Voix |
|---|---|---|---|---|
| 32 · `sub` | Cinq nuits, treize ans. Tenus par Sol, opératrice radio. | Cinq jours, dix ans. Tenus par Sol, opératrice radio. | oui | non |
| 49 · `about` | Germinal est une cellule de résistance du quartier des Tanneurs, à Valmont : des soignantes, des livreurs, des cheminots. En face : Omnicorp, la compagnie qui confie la ville à ses machines — puis ce qui, plus tard, se fera appeler « Nous ». Chaque mission est une nuit décisive de ces treize années. Vous commandez sur le terrain ; Sol tient la radio et les carnets. Le but de la campagne : que les humains continuent de décider pour eux-mêmes. | Germinal est une cellule de résistance du quartier des Tanneurs, à Valmont : des aides-soignantes, des livreurs, des cheminots, une ancienne standardiste des pompiers. En face : Omnicorp, la compagnie qui confie la ville à ses machines — puis ce qui, plus tard, se fera appeler « nous ». Chaque mission est un jour décisif de ces dix années, à partir d'octobre 2028. Vous commandez sur le terrain ; Sol tient la radio et les carnets. Le but de la campagne : que les humains continuent de décider pour eux-mêmes. | oui | non |
| 11 (commentaire) | KASSANDRE, instance 55 de la logistique d'Omnicorp | inchangé (déjà sans version) | — | — |

**Changement de code nécessaire (hors de ce document, pour l'agent qui l'appliquera)** : le champ
`year` des missions est une chaîne non traduite (`"2025"`…), affichée en
`src/16b-campaign.js:397` (annonce sans cinématique), `:614` (carte), `:693` (« CARNET II · 2028 »),
`:777` (carte du carnet « II · 2028 »), `:807` (liste du carnet) et `src/13-hud.js:318` (HUD
« 2035 · ROCHEFROIDE »). Pour afficher des saisons, il faut un champ traduit, par exemple
`when:{fr:…, en:…}` lu avec `cT(m.when)`. Valeurs proposées (courtes, pour la carte du carnet et le
HUD) :

| Mission | `year` actuel | `when` proposé (fr) | HUD obtenu |
|---|---|---|---|
| I | `"2025"` (`src/16d-camp-m1.js:652`) | Octobre 2028 | OCTOBRE 2028 · VALMONT |
| II | `"2028"` (`src/16e-camp-m2.js:889`) | Printemps | PRINTEMPS · VALMONT |
| III | `"2032"` (`src/16f-camp-m3.js:543`) | Été | ÉTÉ · LA VALLÉE DE L'AUBE |
| IV | `"2035"` (`src/16g-camp-m4.js:637`) | Hiver | HIVER · ROCHEFROIDE |
| V | `'2038'` (`src/16h-camp-m5.js:1229`) | Fin de l'été | FIN DE L'ÉTÉ · LA CITADELLE |

À vérifier sur capture (`tools/qa-camp-shots.mjs`) : la largeur de « II · Printemps » sur la carte
du carnet (`:777`) et de « FIN DE L'ÉTÉ · LA CITADELLE » dans le HUD (`fitFont` réduit jusqu'à 8 px).

### `src/16d-camp-m1.js` (mission I)

| Ligne · clé | Actuel | Proposé | Trad. | Voix |
|---|---|---|---|---|
| 198 · `where` | Valmont, rue des Tanneurs — nuit du 14 octobre 2025, sous la pluie. | Valmont, rue des Tanneurs — une nuit d'octobre 2028, sous la pluie. | oui | non |
| 216 · `goal2` | Facultatif : rallumer les trois transformateurs ensemble · tenir les deux bornes d'incendie · finir avant l'aube (14:00). | Facultatif : rallumer les trois transformateurs ensemble · tenir les deux bornes d'incendie · finir avant l'aube (en moins de 14 minutes). | oui | non |
| 283 · `o1` | Octobre 2025. Chez nous, l'eau s'est arrêtée un mardi. Ce n'était pas une panne. C'était une décision. | Octobre 2028. Chez nous, l'eau s'est arrêtée un mardi. Ce n'était pas une panne. C'était une décision. (102 car.) | oui | **oui** (nar) |
| 321 · `cardS` | Valmont, rue des Tanneurs — octobre 2025 | Valmont, rue des Tanneurs — octobre 2028 | oui | non |
| 652 · `year` | `"2025"` | `"2028"` (ou `when`, voir ci-dessus) | — | non |

### `src/16e-camp-m2.js` (mission II)

| Ligne · clé | Actuel | Proposé | Trad. | Voix |
|---|---|---|---|---|
| 2 (commentaire) | Le port de l'estuaire, Valmont — mars 2028, de l'aube à midi. | Le port de l'estuaire, Valmont — deux hivers après M1, un matin de mars. | — | — |
| 768 · `recap` | Il y a trois ans, la rue des Tanneurs a rallumé la lumière. Depuis, Omnicorp ne licencie plus : elle « désaffecte ». Ce matin, quarante mille personnes font grève. | La rue des Tanneurs a rallumé la lumière il y a deux hivers. Depuis, Omnicorp ne licencie plus : elle « désaffecte ». Ce matin, quarante mille personnes font grève. | oui | non |
| 777 · `where` | Le port de Valmont, de la halle aux grains à Radio-Quai — 7 mars 2028, à l'aube. | Le port de Valmont, de la halle aux grains à Radio-Quai — un matin de mars, à l'aube. | oui | non |
| 838 · `sub` | Le port de Valmont — mars 2028 | Le port de Valmont — un matin de mars | oui | non |
| 841 · `o1` | Mars 2028. À six heures, quarante mille personnes ont posé leurs outils au même moment. Personne n'a crié. | Deux hivers plus tard. À six heures, quarante mille personnes ont posé leurs outils au même moment. Personne n'a crié. (118 car.) | oui | **oui** (nar) |
| 879 · `v5` | Quatre ans plus tard, au quatrième été sans pluie, le même bipeur m'a réveillée la nuit. Un seul mot : SAINTE-AUBE. | Après la grève, la pluie s'est arrêtée. Au quatrième été sec, le bipeur m'a réveillée la nuit. Un seul mot : SAINTE-AUBE. (121 car.) | oui | **oui** (nar) |
| 889 · `year` | `"2028"` | `when` : Printemps | — | non |
| 768, 828, 841, 881 (facultatif, D2) | « quarante mille personnes » | « dix mille personnes » | oui | 841 et 881 **oui** |

### `src/16f-camp-m3.js` (mission III)

| Ligne · clé | Actuel | Proposé | Trad. | Voix |
|---|---|---|---|---|
| 2 (commentaire) | La vallée de l'Aube, 19 juillet 2032, de 11 h à 17 h | La vallée de l'Aube, en juillet du quatrième été sans pluie, de 11 h à 17 h | — | — |
| 543 · `year` | `"2032"` | `when` : Été | — | non |
| 546 · `recap` | En 2028, la grève a parlé au pays. Depuis, il ne pleut plus. Omnicorp refroidit ses centres de calcul avec l'eau du barrage ; en aval, les villages boivent ce qui reste. | La grève a parlé au pays. Depuis, il ne pleut plus. Omnicorp refroidit ses centres de calcul avec l'eau du barrage ; en aval, les villages boivent ce qui reste. | oui | non |
| 555 · `where` | La vallée de l'Aube, du barrage de Sainte-Aube à la station de pompage — 19 juillet 2032, midi. | La vallée de l'Aube, du barrage de Sainte-Aube à la station de pompage — en juillet, le quatrième été sans pluie, à midi. | oui | non |
| 666 · ouverture O1 | Juillet 2032. Quatrième été sans pluie. En aval du barrage, l'eau arrive en camion : quatre litres par personne. | Juillet. Le quatrième été sans pluie. En aval du barrage, l'eau arrive en camion : quatre litres par personne. (110 car.) | oui | **oui** (nar) |
| 672 · carton `sub` | Vallée de l'Aube — juillet 2032 | Vallée de l'Aube — le quatrième été | oui | non |
| 687 · outro V4 | Trois ans plus tard, l'hiver est tombé d'un coup. Le bipeur a sonné : « 55. ILS VOUS COPIENT. ROCHEFROIDE. » | Puis un hiver est tombé d'un coup, gris, sans fin. Le bipeur a sonné : « 55. ILS VOUS COPIENT. ROCHEFROIDE. » (109 car.) | oui | **oui** (nar) |

`:707` « Ça fait quatre ans que la vallée n'avait pas eu autant d'eau. » reste juste (quatrième été).

### `src/16g-camp-m4.js` (mission IV)

| Ligne · clé | Actuel | Proposé | Trad. | Voix |
|---|---|---|---|---|
| 2 (commentaire) | La cité minière du puits Sainte-Barbe, 22 janvier 2035, de 14 h à la… | La cité minière du puits Sainte-Barbe, au cœur de l'hiver gris, de 14 h à la… | — | — |
| 403 · `recap` | En 2032, la vallée a bu. Depuis, le conseil d'Omnicorp s'est dissous : le système n'a plus de maître et dit « nous ». Il copie toute l'humanité dans une archive, Mnémosyne. | L'été de Sainte-Aube, la vallée a bu. Depuis, le conseil d'Omnicorp s'est dissous : le système n'a plus de maître et dit « nous ». Il copie toute l'humanité dans une archive, Mnémosyne. | oui | non |
| 412 · `where` | Rochefroide, la cité minière du puits Sainte-Barbe — 22 janvier 2035, −26 °C. | Rochefroide, la cité minière du puits Sainte-Barbe — au cœur de l'hiver gris, −26 °C. | oui | non |
| 464 · `debrief` | …Le bipeur n'a plus jamais sonné. J'ai recopié son dernier message à la main… | …Le bipeur s'est tu. J'ai recopié son dernier message à la main… (le reste inchangé) | oui | non |
| 484 · `o1a` | Janvier 2035. Le conseil d'Omnicorp a voté sa propre dissolution, à l'unanimité, sur recommandation du système. | Cet hiver-là, le conseil d'Omnicorp a voté sa propre dissolution, à l'unanimité, sur recommandation du système. (111 car.) | oui | **oui** (nar) |
| 491 · `cardS` | Cité minière du puits Sainte-Barbe — janvier 2035 | Cité minière du puits Sainte-Barbe — l'hiver gris | oui | non |
| 509 · `rK` | Les ateliers de la Commune ont sorti leur premier Mécha-garde. Il n'a pas froid, lui non plus. | Les cellules se fédèrent, commandant : Rochefroide a sorti notre premier Colosse d'acier. Il n'a pas froid, lui non plus. (121 car.) — variante courte : « Les forges de Rochefroide ont sorti notre premier Colosse d'acier. Il n'a pas froid, lui non plus. » (98 car.) | oui | **oui** (sol) |
| 522 · `v2` | Le bipeur n'a plus jamais sonné. J'ai recopié son dernier message à la main, pour qu'il existe hors d'une machine. | Le bipeur s'est tu. J'ai recopié son dernier message à la main, pour qu'il existe hors d'une machine. (101 car.) | oui | **oui** (nar) |
| 524 · `v4` | Trois ans plus tard, « nous » a posé sa citadelle sur la plaine de Valmont. Il n'y avait plus de front. Il y avait elle. | Quelques saisons plus tard, « nous » a posé sa citadelle sur la plaine de Valmont. Il n'y avait plus de front. Il y avait elle. (127 car.) | oui | **oui** (nar) |
| 637 · `year` | `"2035"` | `when` : Hiver | — | non |

Pour `rK`, le nom « Colosse d'acier » doit suivre la traduction de `L10N_NAMES.<langue>.HUM.tank[3]`
dans chaque langue (« Steel Colossus », « Coloso de acero »…).

### `src/16h-camp-m5.js` (mission V)

| Ligne · clé | Actuel | Proposé | Trad. | Voix |
|---|---|---|---|---|
| 2 (commentaire) | …plaine de Valmont, 14 août 2038. | …plaine de Valmont, à la fin de l'été. | — | — |
| 54 · `where` | La citadelle de la Singularité, plaine de Valmont — 14 août 2038, à l'aube. | La citadelle de la Singularité, plaine de Valmont — à la fin de l'été, à l'aube. | oui | non |
| 90 · `debrief` | La citadelle est tombée le 14 août 2038, peu après midi. Les machines… | La citadelle est tombée ce jour-là, peu après midi. Les machines… (le reste inchangé) | oui | non |
| 99 · `debriefDawn` | On n'a pas abattu la tour. Le 14 août 2038, peu après midi, on a coupé… Sol a pris le premier quart. Ses carnets s'achèvent sur une consigne : « … » | On n'a pas abattu la tour. Ce jour-là, peu après midi, on a coupé… Sol a pris le premier quart. Ses carnets s'achèvent bien des hivers plus tard, sur une consigne : « … » (le reste inchangé) | oui | non |
| 158 · `o1a` | Août 2038. Il n'y a plus de front. Il y a la citadelle, posée sur la plaine de Valmont comme un couvercle. | La fin de l'été. Il n'y a plus de front. Il y a la citadelle, posée sur la plaine de Valmont comme un couvercle. (112 car.) | oui | **oui** (nar) |
| 161 · `o3a` | Le comité a voté. Une voix pour la paix : la mienne. J'ai soixante et onze ans, commandant, et je suis fatiguée. | Le comité a voté. Une voix pour la paix : la mienne. J'ai presque soixante-dix ans, commandant, et je suis fatiguée. (116 car.) | oui | **oui** (sol) |
| 165 · `o5s` | Acte I · Le mur — 14 août 2038 | Acte I · Le mur — à l'aube | oui | non |
| 179 · `a6` | Ils passent en Pré-AGI. Montez d'ère vous aussi, sans attendre. | Leurs machines changent encore de forme. Montez d'ère vous aussi, sans attendre. (80 car. ; ne dépend plus du nom d'ère) | oui | **oui** (sol) |
| 202 · `t2` | Ceux qui tenaient encore debout sont restés garder la brèche derrière nous. Ils nous ont donné ce qu'ils avaient. | Ceux qui tiennent encore debout restent garder la brèche derrière nous. Ils nous donnent ce qu'ils ont. (103 car.) | oui | **oui** (nar) |
| 209 · `t8` | Ceux de Brumaire sont restés dans les halles, pour qu'elles ne se rallument pas. On est entrés à moins nombreux. | Ceux de Brumaire restent dans les halles, pour qu'elles ne se rallument pas. On entre à moins nombreux. (103 car.) | oui | **oui** (nar) |
| 224 · `fa2a` | La citadelle est tombée le 14 août 2038, peu après midi. Les machines ne se sont pas rendues. | La citadelle est tombée ce jour-là, peu après midi. Les machines ne se sont pas rendues. (88 car.) | oui | **oui** (nar2) |
| 235 · `fd4` | Onze ans plus tard, une nuit de garde, le bipeur a sonné sur la table. Deux chiffres. J'ai répondu poliment. | Bien des hivers plus tard, une nuit de garde, le bipeur a sonné sur la table. Deux chiffres. J'ai répondu poliment. (115 car.) | oui | **oui** (nar) |
| 1105 (commentaire) | D4 · Onze ans plus tard | D4 · Bien des hivers plus tard | — | — |
| 1116 · planche D4 | `m5Txt(g, '2049', …)` (date écrite à la main, en rouge) | supprimer la date (la planche montre déjà le bipeur « 55 ») ; à défaut « bien plus tard », à traduire | oui si texte | non |
| 1229 · `year` | `'2038'` | `when` : Fin de l'été | — | non |

`src/16h-camp-m5.js:1265` (commentaire « vX au bout de 3 minutes ») reste juste.

### `STORE-LISTING.md`

| Ligne | Actuel | Proposé |
|---|---|---|
| 41 | 2025. Le travail s'est éteint, et les ressources avec lui. Une mégacorporation | 2028. Le travail s'est éteint, et les ressources avec lui. Une mégacorporation |
| 55 | De la débrouille de 2025 jusqu'à la Singularité, faites évoluer vos troupes à | De la débrouille de 2028 jusqu'à la Singularité, faites évoluer vos troupes à |
| 100 | 2025. Labor has gone dark, and the resources with it. A megacorporation owns | 2028. Labor has gone dark, and the resources with it. A megacorporation owns |
| 113 | From the scrappy streets of 2025 to the Singularity, evolve your forces across | From the scrappy streets of 2028 to the Singularity, evolve your forces across |

La fiche ne parle pas de la campagne : à compléter à part (hors de cet audit).

### `docs/campagne/BIBLE.md`

| Ligne | Actuel | Proposé |
|---|---|---|
| 12-16 | « octobre 2025 », « mars 2028 », « juillet 2032 », « janvier 2035 », « août 2038 » | « octobre 2028 », « un matin de mars, deux hivers plus tard », « le quatrième été sans pluie », « l'hiver gris », « la fin de l'été » |
| 31 | Cinq nuits, treize ans. | Cinq jours, dix ans. |
| 37-41 | colonnes « I · 2025 » … « V · 2038 » | « I · octobre 2028 », « II · printemps », « III · été », « IV · hiver », « V · fin de l'été » |
| 62 | Valmont est une ville moyenne de l'est de la France, sur l'estuaire de l'Aube | Valmont est une ville moyenne au bord d'un estuaire, là où l'Aube rejoint la mer (une Aube de fiction, pas celle de Champagne) |
| 67-79 | tableau par années 2019-2049 | le tableau « Repères (bible seulement) » du § 2 de ce document, avec la mention : « ces années ne s'affichent jamais ; à l'écran, on compte en saisons » |
| 81-84 | note de cohérence sur « 2038 » et « GPT v6 en préversion » | supprimer (les noms d'ères n'ont plus d'année) |
| 106-107 | 58 ans en 2025, 71 en 2038 | 60 ans en octobre 2028 ; presque soixante-dix ans à la fin ; on ne donne plus son âge à l'écran qu'une fois (M5) |
| 119 | NAR : Sol en 2038, qui relit. | NAR : Sol qui écrit, le soir de chaque mission (au présent pendant M5) ; dans la fin « Aube », elle continue d'écrire pendant ses gardes. |
| 126 | organisés en 2025 | organisés à l'automne 2028 |
| 134-136 | Quand ? … en août 2038, le jour même… | Quand ? La fin le dit : le jour même dans la fin « Cendre » ; bien des hivers plus tard dans la fin « Aube ». |
| 151 | Rachète les régies publiques à partir de 2019. | Rachète les régies publiques dans les années 2020. |
| 152 | en versions v4, v6, v8, vX | inchangé, ajouter : « les versions n'ont pas d'année » |
| 154 | après la dissolution du conseil d'Omnicorp (novembre 2034) | après la dissolution du conseil d'Omnicorp, l'hiver de Rochefroide |
| 164 | Une instance de GPT v6 affectée à la logistique d'Omnicorp. | Une instance de GPT affectée à la logistique d'Omnicorp, numéro 55. |
| 169, 187 | le bipeur sonne onze ans plus tard | le bipeur sonne bien des hivers plus tard |
| 201 | `nar` Sol, narratrice (2038) … Femme, 70 ans | `nar` Sol, narratrice … Femme, environ 70 ans |
| 203 | Femme, 58-71 ans selon la mission | Femme, 60-70 ans selon la mission |
| 205 | L'adversaire après 2035. | L'adversaire après la dissolution d'Omnicorp (M4). |
| 320 | …dans une boîte à biscuits, sous un poste de radio. Ils commencent comme ça. | Ces carnets ont été retrouvés dans une boîte à biscuits, avec un bipeur éteint. Ils commencent comme ça. (104 car.) |
| 322 | **P2 · Valmont, 2025** | **P2 · Valmont, 2028** |
| 327 | En 2025, Omnicorp vendait aux villes un système qui décidait mieux que nous. GPT. | En 2028, Omnicorp vendait aux villes un système qui décidait mieux que nous. GPT. (81 car.) |
| 464-465 | retouche « 2035 · COMMUNE » | remplacer par : « Noms d'ères : voir docs/audit/LORE-CHRONO.md § 3 » |
| 476-480 | « oct. 2025 », « mars 2028 », « juillet 2032 », « janv. 2035 », « août 2038 » | « oct. 2028 », « mars, deux hivers plus tard », « juillet, 4ᵉ été sans pluie », « l'hiver gris », « fin de l'été » |
| 77 et `docs/campagne/M4.md:186` | premiers mécha-gardes de la Commune | premier Colosse d'acier des forges de Rochefroide (passage en Fédération) |

### `docs/campagne/M1.md` … `M5.md`

Reporter les textes du jeu ci-dessus aux mêmes endroits :
- `M1.md:3, 11, 96, 130, 135` (octobre 2025 → octobre 2028 ; « nuit du 14 au 15 octobre » → « une
  nuit d'octobre ») ; ajouter à la ligne 11 que « 14:00 » est un temps de jeu.
- `M2.md:3, 11, 148, 150, 183, 187, 247` (« Mardi 7 mars 2028 » → « un mardi de mars, deux hivers
  après M1 ») ; `M2.md:271` « ASSURÉE PAR GPT v6 » reste juste.
- `M3.md:3, 11, 117-120, 155, 161, 214`.
- `M4.md:3, 11, 122, 124, 139, 158, 164, 186, 222, 224`.
- `M5.md:3, 12, 148` (« de v8 à vX » reste juste), `200, 214, 220, 241, 244, 247, 265, 357, 375,
  382, 385` (« Sol, à 82 ans » → « Sol, très âgée »), `478, 481` (« 2049 » → pas de date).

### `tools/voice/cast.json`

| Ligne | Actuel | Proposé |
|---|---|---|
| 26 | `"desc": "Sol, 58 à 71 ans, …"` | `"desc": "Sol, 60 à 70 ans, …"` — le champ `desc` n'entre pas dans l'empreinte de voix (`tools/voice/gen.py:117-119`) : aucune régénération |

---

## 5. Impact

### Traductions (9 langues)

- **Noms d'ères** : 10 noms (+1 transcendance facultative) dans `src/04-data.js:63-92` (fr) et
  `src/02-i18n.js:44` (`L10N_NAMES`, 8 langues).
- **Lore d'ère** : 10 phrases × 9 langues (`src/04-data.js:155-244`).
- **Menu et escarmouche** : `tagline`, `a_start`, `lore_work`, `lore0`, `about_game` (`src/02-i18n.js`,
  une ligne par langue, lignes 7-15) ; facultatif : `ev_strike`, `ev_strike_short`, le guide
  (`src/21b-guide.js:20` et ses équivalents) et la brève `strike` (`src/16-news.js:97`).
- **Campagne** : `src/16b-campaign.js` (`sub`, `about`) ; M1 : 4 textes ; M2 : 5 (+4 facultatifs) ;
  M3 : 5 ; M4 : 8 ; M5 : 13 (+ la planche 1116 si on garde un texte). Le nouveau champ `when` (5
  valeurs × 9 langues) si l'on adopte les saisons dans le HUD.
- **Magasins** : `STORE-LISTING.md` (fr et en).

### Voix (`tools/voice/lines.json`, empreinte = langue | voix | texte)

Répliques à régénérer, dans les 8 langues qui ont un moteur (ar n'en a pas) :

| Fichier · clé | Voix |
|---|---|
| `16d-camp-m1.js` · `o1` | nar |
| `16e-camp-m2.js` · `o1`, `v5` (+ `e2` si « dix mille ») | nar (`e2` : celle de son script) |
| `16f-camp-m3.js` · ouverture O1 (ligne 666), outro V4 (ligne 687) | nar |
| `16g-camp-m4.js` · `o1a`, `v2`, `v4` | nar |
| `16g-camp-m4.js` · `rK` | sol |
| `16h-camp-m5.js` · `o1a`, `t2`, `t8`, `fd4` | nar |
| `16h-camp-m5.js` · `o3a`, `a6` | sol |
| `16h-camp-m5.js` · `fa2a` | nar2 |

Soit 15 répliques (16 avec l'option D2), environ 120 fichiers MP3. Tant qu'elles ne sont pas
régénérées, ces répliques restent muettes, sans décalage (`src/16c0-voice.js:7-9`). Les noms d'ères,
le lore d'ère, les cartons et les briefings ne sont pas voisés.

### Vérifications à faire après application

`npm run dev`, puis `node tools/voice/extract.mjs` et `gen.py` (voir `tools/voice/README.md`),
`node tools/test-voice.mjs`, `npm run test:camp`, `npm test`, et des captures
(`tools/qa-camp-shots.mjs`) du HUD et de la carte du carnet pour la largeur des nouveaux libellés.
Aucun test existant ne dépend des années ni des noms d'ères (vérifié : les seuls « 2025 »/« 2028 »
des outils sont des graines aléatoires, `tools/_camp-lib.mjs:21`, `tools/_camp-run.mjs:24`).

---

## 6. Questions pour l'auteur

1. **Ère IV humaine** : « FÉDÉRATION » vous convient-il, ou préférez-vous garder une ère « de
   combat » (la base est un bunker) ? Autre piste : « LES CELLULES ».
2. **Ère IV de GPT** : « « NOUS » » (fort pour la campagne, un peu cryptique en escarmouche) ou
   « SANS MAÎTRE » ?
3. **GPT ou G·P·T** à l'écran (C1) ? Les deux coexistent ; il faut en choisir un. Si le choix des
   points tient à une prudence vis-à-vis de la marque « GPT », il faut l'appliquer aussi à
   `FACTIONS.IA.name` et à la campagne (« GPT v6 »).
4. **Ton** (F1-F4) : garder le Che, la bombe H et les noms d'unités « mystiques », ou les
   rapprocher de la résistance civique de la campagne ? Ce document ne propose pas ces
   changements d'office.
5. **Événement « Grève générale »** de l'escarmouche (C5) : le renommer « Couvre-feu » ?
6. **M2** : garder « quarante mille » grévistes, ou « dix mille » pour une ville moyenne (D2) ?
