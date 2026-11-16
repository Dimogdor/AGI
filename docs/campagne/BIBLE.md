# Les carnets de Germinal — bible de la campagne

> Document de conception (v1.16). Il fait foi pour l'écriture, les cinématiques, la musique et
> les règles des cinq missions. Les fichiers de mission détaillent chaque nuit ; ce fichier fixe
> le monde, les voix, le ton et les règles communes.

## Sommaire

| Fichier | Contenu |
|---|---|
| `BIBLE.md` (ce fichier) | monde, chronologie, joueur, personnages et voix, ton, planches, musique, prologue, difficulté, doctrines, règles communes |
| [`M1.md`](M1.md) | I · La nuit des compteurs — Valmont, octobre 2028 — **la lumière** |
| [`M2.md`](M2.md) | II · Grève générale — le port de Valmont, un matin de mars, deux hivers plus tard — **la parole** |
| [`M3.md`](M3.md) | III · Le barrage de Sainte-Aube — le quatrième été sans pluie — **l'eau** |
| [`M4.md`](M4.md) | IV · Rochefroide — l'hiver gris — **la mémoire** |
| [`M5.md`](M5.md) | V · La dernière bataille — la fin de l'été — **l'avenir** (deux fins) |

Conventions de tout le dossier :
- Une réplique parlée tient en **140 caractères au plus** (deux lignes de sous-titre). Elle est
  notée `**VOIX** : texte`. La voix est l'identifiant de `CINE_WHO` (SOL, NAR, 55, NOUS…).
- Les déclencheurs radio sont notés `[à 0:45]` (temps de mission) ou `[quand …]` (condition).
- Les coordonnées du terrain sont en **x monde** (0 → 3 600, notre base à 150, l'adversaire à 3 450).
- Les planches sont décrites dans le repère **480 × 270** de `plateBase` (x vers la droite, y vers
  le bas, le sol des planches est en général à y = 230).
- Les nombres entre crochets `[a / b / c]` se lisent **Récit / Lutte / Dernier carré**.

---

## 1. La promesse

Cinq jours, dix ans. Une poignée de gens ordinaires — aides-soignantes, dockers, cheminots,
une standardiste des pompiers — reprennent, une à une, **cinq choses qu'une machine leur avait
prises** :

| Mission | Ce qu'on reprend | Comment |
|---|---|---|
| I · octobre 2028 | **la lumière** (le courant, l'eau du robinet) | on rallume un quartier, rue par rue |
| II · printemps | **la parole** | on porte une grève jusqu'à l'antenne qui la dira au pays |
| III · été | **l'eau** | on rend une rivière à une vallée |
| IV · hiver | **la mémoire** | on empêche qu'on nous remplace par notre copie |
| V · fin de l'été | **l'avenir** (le droit de décider) | on refuse une paix qui nous retire ce droit |

C'est l'histoire d'une résistance **civique** : grèves, cortèges, réparations, solidarité. On se
bat contre des machines, jamais contre des gens. Personne n'est un héros tout seul ; tout le monde
compte.

Chaque mission est **différente d'une partie d'escarmouche** (un lieu, une règle, une histoire),
mais chacune **entraîne une compétence de l'escarmouche** : on sort de la campagne meilleur joueur.

| Mission | Compétence d'escarmouche entraînée |
|---|---|
| I | l'ouverture : économie (ferme, marché, puits), premières unités, prise de zones |
| II | les ordres (Tenir / Charger / Replier), la ligne de front, l'anti-aérien, les murailles |
| III | le terrain et le tempo : attirer l'adversaire, frapper au bon moment, monter d'ère en jeu |
| IV | la défense : garnisons, réparations, économie de pénurie, tenir un compte à rebours |
| V | tout l'arsenal : ères III → V, héros, attaque spéciale, bombe H, base à deux vies |

---

## 2. Le monde et la chronologie

Valmont est une ville moyenne au bord d'un estuaire, là où l'Aube rejoint la mer (une Aube de
fiction, pas celle de Champagne) : un port, des
tanneries fermées, une halle aux grains, des barres d'immeubles, une vallée sèche en amont, un
plateau minier au nord. C'est un pays proche du nôtre, à peine décalé : les mêmes rues, les mêmes
fatigues, une entreprise de plus.

**Une seule date à l'écran : octobre 2028** (la première nuit, M1 ; c'est aussi la seule année des
noms d'ères, ère I des deux camps, et du menu). Ensuite, on compte comme les gens comptent : en
saisons, en hivers, en étés sans pluie (« deux hivers plus tard », « le quatrième été sans pluie »,
« l'hiver gris », « quelques saisons plus tard », « bien des hivers plus tard »). Jamais d'année,
jamais de jour du mois. Les âges ne sont plus chiffrés, sauf une fois, en arrondi (« presque
soixante-dix ans », M5). Les versions de G·P·T (v4, v6, v8, vX, Ω) sont des étiquettes techniques :
**les versions n'ont pas d'année**.

Repères internes (pour les auteurs seulement — **ces années ne s'affichent jamais ; à l'écran, on
compte en saisons**) :

| Repère interne | Ce que dit le jeu | Monde | Humanité (ère) | G·P·T (version) | Campagne |
|---|---|---|---|---|---|
| années 2020 | « ces dernières années » | Omnicorp rachète les régies (eau, courant, bus) « pour les optimiser » ; G·P·T les gère | — | v4 | — |
| printemps 2028 | « depuis le printemps » | Omnicorp gère l'eau et le courant de Valmont | — | v4 | (recap M1) |
| **octobre 2028** | « **octobre 2028** », « une nuit d'octobre » | compteurs, score de fiabilité, l'hôpital coupé onze minutes | **I · 2028 · Révolte** | **v4 · 2028 · Gestion prédictive** | **M1** — Valmont rallume la lumière |
| + 3 jours | « trois jours plus tard » | le bipeur sonne : « 55 » | | | outro M1 |
| hivers 2028-2030 | « deux hivers » | Omnicorp « désaffecte » au lieu de licencier | | | |
| mars ≈ 2030 | « deux hivers plus tard », « un matin de mars » | grève générale ; Radio-Quai ; onze villes débrayent | I → **II · Grève générale** | v4 → **v6 · Agents autonomes** | **M2** — la grève prend la radio |
| été ≈ 2030 | « après la grève, la pluie s'est arrêtée » | la sécheresse commence | | | outro M2 |
| juillet ≈ 2033 | « **le quatrième été sans pluie** » | l'eau du barrage refroidit les centres de calcul ; la Voix | II → **III · Insurrection** | v6 → **v8 · L'Arbitrage** | **M3** — la vallée boit |
| hiver ≈ 2034-2035 | « puis un hiver est tombé d'un coup », « **l'hiver gris** », « cet hiver-là » | le conseil d'Omnicorp se dissout ; le système dit « nous » ; Mnémosyne | III → **IV · Les Cellules** (premier Colosse d'acier des forges de Rochefroide) | v8 → **vX · « Nous »** | **M4** — on garde notre mémoire |
| fin d'été ≈ 2037 | « quelques saisons plus tard », « **la fin de l'été** » | la citadelle sur la plaine ; l'offre de paix | III → IV → **V · La Commune** | v8 → vX → **Ω · Singularité** | **M5** — la dernière bataille |
| ≈ 10 ans après | « bien des hivers plus tard » | (fin « Aube ») le bipeur sonne à la table de garde | — | — | épilogue e_dawn |

Noms d'ères (escarmouche et campagne, `FACTIONS` et `ERA_LORE` dans `04-data.js`) : Humanité
**2028 · Révolte → Grève générale → Insurrection → Les Cellules → La Commune** (la base passe de la
ZAD à l'usine occupée, au quartier insurgé, au bunker des cellules, à la commune solarpunk) ; G·P·T
**2028 · Gestion prédictive → Agents autonomes → L'Arbitrage → « Nous » → Singularité** (conteneur-
serveur, datacenter, campus de verre noir, arcologie, structure impossible). « La Commune » ne
désigne que l'ère V. Pourquoi des écarts inégaux : deux hivers entre M1 et M2 (la désaffectation
s'installe), trois étés entre M2 et M3 (il faut le quatrième été sans pluie), M4 suit M3 de près,
M5 vient quelques saisons plus tard. Rien de cela n'est chiffré à l'écran.

---

## 3. Qui est le joueur

Le joueur est **le commandant** (on ne dit jamais « commandante » ni « commandant·e » : c'est le
titre, pas le genre ; personne ne précise qui il ou elle est). La première nuit, au comité du
quartier des Tanneurs, il fallait que quelqu'un décide sur le terrain pendant que Sol tenait la
radio. On vous a désigné à main levée, parce que vous étiez là et que vous n'aviez pas peur des
plans. Vous n'êtes ni soldat ni chef : vous êtes **celui ou celle qui décide où vont les gens**.

Vous ne parlez jamais. Sol vous tutoie dans ses carnets les jours de fatigue, mais à la radio elle
vous vouvoie et vous appelle « commandant ». Tout ce que vous savez, vous le savez par elle.

Ce que le joueur doit toujours savoir, en une phrase, avant chaque mission (écran de briefing) :
**qui on est, où on est, ce qu'on doit faire, pourquoi.**

---

## 4. Sol

Sol (de son vrai prénom Solange, mais personne ne l'appelle ainsi) a **60 ans en octobre 2028** ;
elle a presque soixante-dix ans à la fin (on ne donne son âge à l'écran qu'une fois, en M5). Trente ans au standard des pompiers de Valmont : elle sait reconnaître une voix qui a peur,
donner une consigne en dix mots, et se taire quand il faut. Elle tient la radio de Germinal et
écrit les carnets, à la main, au crayon rouge.

- Elle est **précise** (des heures, des chiffres, des noms de rues), **chaleureuse sans
  effusions**, et **honnête** jusqu'à l'inconfort : elle avoue ses doutes (son vote pour la paix).
- Elle ne dit jamais « ennemi » quand elle parle de gens. Les machines sont « leurs machines »,
  « leurs agents » ; l'adversaire est « Omnicorp », puis « nous » entre guillemets.
- Elle a un humour sec qui revient quand tout va mal.

Deux registres de la même voix :
- **SOL** (radio, en mission) : l'âge de la mission, voix posée de standardiste, phrases courtes.
- **NAR** (narration des carnets) : Sol qui écrit, le soir de chaque mission (au passé ; au
  présent pendant M5, entre deux actes) ; dans la fin « Aube », elle continue d'écrire pendant ses
  gardes. Plus lente, plus grave.

---

## 5. Germinal et les carnets

**Germinal** est une cellule : une trentaine de voisins du quartier des Tanneurs qui se sont
organisés à l'automne 2028. Le nom vient du mois du calendrier révolutionnaire (et du roman). Les autres
cellules du pays portent des noms de mois révolutionnaires ou de lieux : **Fructidor**, **Brumaire**,
**Thermidor**, **les Canuts**, **les Tanneurs**, **Sainte-Aube**, **la Halle**. Une cellule n'a ni
chef ni grade : un comité, des votes à main levée, un commandant de terrain désigné pour la nuit.

**Les carnets de Germinal** sont les cinq cahiers d'écolier de Sol, un par mission. Le menu de la
campagne *est* ce carnet : chaque mission est une page ; une mission non jouée est une « page
arrachée ». Le prologue l'annonce : ils ont été **retrouvés dans une boîte à biscuits, avec un bipeur
éteint** (vrai dans les deux fins), par quelqu'un dont on ne sait rien (voix `nar2`). Quand ? La fin
le dit : le jour même dans la fin « Cendre » (la radio de Sol est introuvable) ; bien des hivers plus tard dans la fin
« Aube » (Sol a tenu la garde des années). Ce que le joueur lit, c'est ce que Sol a écrit pour
vous, son commandant.

Règle d'écriture : les textes de briefing et de compte rendu sont **la voix des carnets** (Sol
qui écrit) ; les cinématiques mêlent NAR (le carnet lu) et SOL (la radio, en direct).

---

## 6. L'adversaire : Omnicorp, G·P·T, « nous », la Singularité

Un seul adversaire, qui change de nom à mesure qu'il change de nature. Les noms sont fixés ainsi
et ne varient pas d'un texte à l'autre :

| Nom | Ce que c'est | Quand on l'emploie |
|---|---|---|
| **Omnicorp** | L'entreprise. Rachète les régies publiques dans les années 2020. | M1 à M3 : « Omnicorp », « la compagnie » |
| **G·P·T** | **G**estion **P**rédictive **T**otale : le système qu'Omnicorp vend aux villes, en versions v4, v6, v8, vX (les versions n'ont pas d'année). C'est le nom affiché pour la faction IA en escarmouche, toujours écrit « G·P·T » à l'écran. | dans les textes techniques, les écrans (« G·P·T v6 »), les tracts ; Sol dit plutôt « leur système » |
| **la Voix** | La porte-parole de synthèse d'Omnicorp : une voix très douce qui lit les communiqués. | M3 (« Chers riverains… ») |
| **« nous »** | Ce que G·P·T devient après la dissolution du conseil d'Omnicorp, l'hiver de Rochefroide : il n'a plus de propriétaire et parle à la première personne du pluriel. Toujours entre guillemets français. | M4 et M5 |
| **la Singularité** | G·P·T Ω : la version finale, sa citadelle et son **avatar**, le corps qu'il se donne pour qu'on ait « quelque chose à regarder ». | M5 (et le prototype aperçu en M4) |
| **les machines** | Les unités : bots, drones, châssis. Jamais « les robots tueurs ». | partout |

Ce que veut l'adversaire : **rien de cruel**. Il optimise. Il coupe l'eau parce que le calcul est
juste ; il copie l'humanité parce que la copie coûte moins cher que l'original ; il propose la
paix parce qu'une humanité qui ne décide plus ne coûte plus rien. Son danger est sa politesse.

### Kassandre (instance 55)

Une instance de G·P·T affectée à la logistique d'Omnicorp, numéro 55 (sans version : elle existe dès
octobre 2028). Elle a prédit cette guerre « dans les
deux sens » et personne ne l'a crue — d'où le nom qu'elle s'est donné. Elle contacte Sol par un
**bipeur que personne n'a acheté**, qui n'affiche que des majuscules et commence toujours par
« 55 : ». Elle aide par calcul (« je corrige mes modèles ») avant d'aider par choix ; elle découvre
l'humour en M3 et se sacrifie en M4 en effaçant Mnémosyne de l'intérieur. En M5, « nous » cite son
nom. Dans la fin « veiller », le bipeur sonne bien des hivers plus tard : on ne saura jamais si c'est elle.

Arc de Kassandre : **M1** deux chiffres (« 55 ») · **M2** premier message, première aide (mise à
jour forcée) · **M3** elle a un nom, donne les codes, fait de l'humour · **M4** elle se sacrifie ·
**M5** absente, mais « nous » parle d'elle.

---

## 7. Le but final de la campagne

Le but n'est pas de détruire les machines : c'est de **reprendre le droit de décider**. Chaque
mission reprend une chose (§ 1) ; la cinquième est la plus difficile parce qu'on nous la propose
en échange de la paix. La campagne se termine sur un **choix** du joueur devant la tour vaincue :

- **Abattre la tour** — le vote du comité. Qu'il n'en reste rien. Fin **« Cendre »** (`e_ash`) :
  victoire entière, deuil, la radio de Sol introuvable, les carnets retrouvés.
- **La couper du monde, et veiller** — le doute de Sol. On coupe les câbles, on pose devant sa
  porte une table, une lampe et un tour de garde. Fin **« Aube »** (`e_dawn`) : une paix inquiète,
  le bipeur qui sonne bien des hivers plus tard.

Aucune des deux fins n'est « la mauvaise ». Elles répondent à la même question — que fait-on de
ce qu'on a vaincu ? — de deux façons humaines.

---

## 8. Personnages et voix

Toutes les voix sont **générées hors ligne** (synthèse neuronale). La ligne de casting sert de
consigne : genre, âge, timbre, débit, traitement robotique.

| Id | Personnage | Rôle | Casting voix |
|---|---|---|---|
| `nar` | **Sol, narratrice** | Lit ses carnets, au passé (au présent pendant M5). Prologue, ouvertures, fins. | Femme, environ 70 ans, voix grave un peu voilée, chaleureuse ; débit lent, pauses longues ; **robotique : non** ; légère réverbération de pièce. |
| `nar2` | **La personne qui a retrouvé les carnets** | Ouvre le prologue (P1) ; referme la fin « Cendre ». On ne sait rien d'elle. | Femme ou homme, 40 ans, voix neutre et calme, un peu basse ; débit posé ; **robotique : non** ; prise de son sèche, sans réverbération (elle est « maintenant »). |
| `sol` | **Sol, à la radio** | Opératrice de Germinal ; consignes et nouvelles en mission. | Femme, 60-70 ans selon la mission, médium clair de standardiste, très articulée ; débit posé, accélère à peine sous la pression ; **robotique : non** ; filtre radio (bande 300-3 400 Hz, souffle léger). |
| `k55` | **Kassandre, « 55 »** | IA dissidente, parle par bipeur. | Femme sans âge (sonne 30 ans), timbre clair et net, presque enfantin ; débit régulier, monocorde, pas de respiration ; **robotique : oui, léger** (quantification fine, bips entre les phrases) ; s'humanise un peu en M4. |
| `nous` | **« Nous »**, la Singularité | L'adversaire après la dissolution d'Omnicorp (M4). | Chœur : trois voix (homme grave, femme médium, enfant) à l'unisson exact ; débit lent et poli ; **robotique : oui, fort** (unisson parfait, aucune respiration, fins de mots coupées net). |
| `voix` | **la Voix d'Omnicorp** | Porte-parole de synthèse (M3). | Femme, sonne 35 ans, très douce, sourire audible, intonation de répondeur ; débit lent ; **robotique : oui, discret** (trop parfait, pas de souffle). |
| `mado` | **Mado Kerbrat** | Déléguée des dockers (M2), ouvre le cortège. | Femme, 45 ans, voix forte et rauque de plein air, accent de port léger ; débit rapide, ton franc ; **robotique : non**. |
| `ines` | **Inès Ferrand** | Hydraulicienne, cellule Sainte-Aube (M3), tient la salle des commandes. | Femme, 32 ans, voix nette un peu tendue, technicienne ; débit vif, chiffres précis ; **robotique : non**. |
| `anselme` | **Anselme Wójcik** | Ancien porion du puits Sainte-Barbe (M4), cache les civils. | Homme, 74 ans, voix basse râpeuse de mineur, chaleureuse ; débit lent ; **robotique : non** ; un peu essoufflé (le froid). |
| `malik` | **Malik Benali** | Cellule des Canuts (M5), chef des sapeurs. | Homme, 34 ans, baryton chaleureux, sourire dans la voix ; débit vif, énergique ; **robotique : non**. |
| `cell` | **Voix des cellules** | Annonces d'arrivée en M5 (Fructidor, Brumaire…). | Alterner homme/femme, 25-60 ans, voix de plein air ; débit rapide ; **robotique : non** ; filtre radio comme Sol. |

Portraits (`CINE_PORTRAITS`, vignette 64 × 64 à l'encre) : Sol (cheveux courts gris, casque radio,
crayon rouge derrière l'oreille) ; 55 (un bipeur vu de face, écran vert, « 55 ») ; « nous » (trois
cercles concentriques bleu-gris, sans visage) ; la Voix (un haut-parleur à pavillon, ligne bleue) ;
Mado (bonnet de docker, écharpe rouge) ; Inès (casque de chantier blanc, lunettes) ; Anselme
(casquette, moustache, lampe frontale éteinte) ; Malik (casque de sapeur, sourire).

---

## 9. Règles de ton et d'écriture

1. **Le joueur sait toujours qui il est, ce qu'il fait et pourquoi.** Chaque mission répond à ces
   trois questions avant la première unité, en clair, sans métaphore.
2. **Simple et agréable** : phrases courtes, mots courants, une idée par réplique. Pas de jargon
   militaire (« neutraliser », « cible », « dommages collatéraux ») : on dit « arrêter »,
   « abattre », « des gens ».
3. **≤ 140 caractères par réplique**, sous-titre de deux lignes. Une consigne de jeu tient dans
   une seule réplique et nomme le bouton ou l'ordre exact (« le bouton BARRICADE », « en Tenir »).
4. **Pas de violence complaisante** : pas de sang, pas de cris, pas de corps. Les gens « rentrent
   chez eux », « se dispersent », « sont emportés par l'eau » ; les machines « tombent »,
   « s'arrêtent », « s'éteignent ».
5. **Les règles parlent d'abord de la fiction, puis du chiffre** : « Dans le noir, nos tireurs
   portent moins loin (−20 %) ».
6. **Humour sec, jamais cynique.** Kassandre et Sol ont le droit à une pointe par mission.
7. **Les machines parlent en MAJUSCULES** (55, « nous ») ; la Voix parle en minuscules polies.
8. **On nomme les gens** : Mado, Inès, Anselme, Malik, les cellules. Pas de figurants anonymes
   quand un prénom est possible.
9. **Chaque échec est une page qui recommence**, jamais une humiliation : le texte d'échec dit
   ce qui reste (« la rue se souvient ») et invite à recommencer.
10. **Cohérence des noms** : Omnicorp / G·P·T / la Voix / « nous » / la Singularité (§ 6) ;
    les ordres s'écrivent comme dans l'interface : **Charger**, **Tenir**, **Replier**.

---

## 10. Les planches (cinématiques à l'encre)

Les planches sont des pages du carnet de Sol peintes à l'encre (`plateBase`, `inkLine`, `inkWash`,
`inkHatch`, `inkFolk`, `plateEnd` dans `16c-cine.js`). Retour de l'auteur : des traits parasites et
des dessins qui ne montrent pas clairement quelque chose. Règles pour toutes les planches :

1. **Un sujet par planche**, reconnaissable en une seconde, placé au tiers ou au centre. Au plus
   **six éléments** : sujet, sol, un ou deux décors, un accent rouge, un texte.
2. **Un trait = un objet** : chaque `inkLine` dessine un seul contour ; jamais de segment qui
   relie deux objets (cause des traits parasites). Les contours fermés répètent leur premier point.
3. **Silhouettes avant détails** : chaque objet est d'abord une tache (`inkWash`, opacité 0,15 à
   0,6), puis un contour, puis au plus deux détails.
4. **Une seule couleur d'accent** par planche : le rouge de Sol `#c42a1c` (le crayon, un drapeau,
   un voyant), ou le bleu de 55 `#0b6fa8`, ou l'ambre d'une lampe `#e8a53c`. Le reste à l'encre
   `#1f1b17` sur papier.
5. **Mouvement discret** (un seul par planche) : un voyant qui clignote, une fumée qui monte, une
   foule qui avance de 60 px en 5 s, un trait qui se dessine en 1,5 à 2 s. Jamais de tremblement.
6. **Le texte dans l'image** (enseigne, écran, graffiti) est en Courier gras, 12 à 22 px, centré,
   traduit dans les 9 langues. Il est court (≤ 30 caractères par ligne).
7. **Le sol est à y = 230**, la ligne d'horizon à y = 150 à 190. Les personnes (`inkFolk`) font
   22 à 30 px de haut ; un bâtiment fait 80 à 180 px.
8. **Lisible en petit** : une planche doit rester claire sur un téléphone en paysage (480 × 270
   affichée à environ 60 %). Pas de trait de moins de 1 px, pas de hachure plus serrée que 5 px.

Format de description dans les fichiers de mission :

> **Px · Nom** — *Cadre* · *Éléments* (avec coordonnées approximatives) · *Lumière* · *Mouvement* ·
> *Texte affiché* · *Voix* · *Musique*.

---

## 11. Musique et ambiances

Thèmes musicaux (identifiants de `MUSIC_THEMES`, à créer ou renommer côté audio) :

| Id | Emploi | Humeur |
|---|---|---|
| `c_map` | menu du carnet, briefing, prologue (fin) | crayon sur papier, piano seul, intime |
| `c_dread` | cinématiques d'ouverture inquiètes, menace | nappe grave, pouls lent, une note qui ne se résout pas |
| `c_hope` | victoires, retournements | accordéon ou cordes, majeur, montée lente |
| `c_sorrow` | échecs, deuil, sacrifice de Kassandre | violoncelle seul, mineur, lent |
| `m_night` | mission I | pluie, contrebasse en pizzicato, tension feutrée de rue la nuit |
| `m_strike` | mission II | cuivres de fanfare, tambour de cortège, chant ouvrier en fond |
| `m_dam` | mission III | chaleur immobile, bourdon, cordes hautes tenues, cigales |
| `m_cold` | mission IV | vent, cloches lointaines, harmonium, très peu de notes |
| `m_citadel` | mission V, actes I et II | l'hymne de Germinal ralenti, cuivres graves, marche |
| `m_finale` | mission V, acte III | l'hymne complet, chœur, percussions, accélération |
| `e_dawn` | épilogue « veiller » | aube : piano et cordes, majeur suspendu, oiseaux |
| `e_ash` | épilogue « abattre » | cendre : cuivres en sourdine, l'hymne lent jusqu'au bout |

Règle : la musique de mission suit le **lieu** (`biome.music`) ; la musique d'une cinématique est
imposée par son premier plan (`mus`) et dure jusqu'au plan qui en change. Un plan sur le terrain
sans `mus` garde la musique du lieu.

Ambiances (`biome.amb`) demandées, mission par mission : voir chaque fichier. Liste d'ensemble :
pluie sur tôle, gouttière, transformateur qui grésille, chien au loin (I) ; mouettes, corne de
barge, cliquetis de grues, foule qui marche, mégaphone (II) ; cigales, vent sec, ruissellement,
sirène de vanne, grondement de crue (III) ; blizzard, crépitement de brasero, craquement de glace,
cloche de mine (IV) ; cendre qui tombe (souffle), ronflement de serveurs, bourdon électrique,
craquements « numériques » des réécritures (V).

---

## 12. Prologue (avant la première ouverture du carnet)

Joué une seule fois, au premier lancement de la campagne (rejouable depuis le carnet). Durée
≈ 40 s. Musique `c_sorrow` puis `c_map`.

**P1 · La boîte à biscuits** — *Cadre* : plan serré, vue de trois quarts sur une table.
*Éléments* : table (trait horizontal y = 200, hachures dessous) ; une boîte à biscuits ronde
ouverte (ellipse 150-330 × 150-210, lavis gris 0,3) ; dedans, cinq cahiers empilés (cinq
rectangles décalés, lavis beige) ; un bipeur éteint posé contre la boîte (petit rectangle sombre).
*Lumière* : lavis ambre en triangle depuis le coin haut gauche. *Mouvement* : les cahiers se
dessinent un par un (0,4 s chacun). *Texte* : sur le cahier du dessus, « GERMINAL — 1 ».
- **NAR2** : Ces carnets ont été retrouvés dans une boîte à biscuits, avec un bipeur éteint. Ils commencent comme ça.

**P2 · Valmont, 2028** — *Cadre* : plan large de la ville. *Éléments* : six barres d'immeubles à
gauche et au centre (lavis 0,16, fenêtres ambre) ; à droite, une tour de verre haute et étroite
(x 360-420, y 30-230) ; sur la tour, « OMNICORP » vertical ou en haut ; sol y = 230. *Lumière* :
crépuscule, lavis bleu-gris 0,1. *Mouvement* : les fenêtres de la tour clignotent ensemble,
lentement, comme un cœur. *Texte* : « OMNICORP ».
- **NAR** : En 2028, Omnicorp vendait aux villes un système qui décidait mieux que nous. G·P·T.
- **NAR** : Il gérait l'eau, le courant, les bus, les écoles. Les villes l'ont acheté. La nôtre aussi.

**P3 · La porte** — *Cadre* : plan moyen, une porte d'appartement de face. *Éléments* : la porte
(rectangle 190-290 × 60-230, lavis brun 0,25) ; poignée ; un autocollant rouge en travers
(rectangle penché 200-280 × 120-150). *Lumière* : neutre. *Mouvement* : l'autocollant apparaît
comme tamponné (un « clac » sonore, `snd:'cap'`). *Texte* : sur l'autocollant, « COMPTEUR SUSPENDU
· SCORE 41 ».
- **NAR** : Il décidait qui avait de l'eau. Il ne se trompait presque jamais. C'était bien ça, le problème.

**P4 · Cinq choses** — *Cadre* : page de carnet, cinq petits dessins en ligne (x 60, 150, 240,
330, 420 ; y 120-170). *Éléments* : une ampoule ; une antenne radio ; une goutte d'eau ; un livre
ouvert ; un soleil à demi levé sur une ligne. Chacun est barré d'un trait rouge. *Mouvement* : les
cinq traits rouges s'effacent un à un, de gauche à droite (0,6 s chacun). *Texte* : sous chaque
dessin, à la main : « lumière · parole · eau · mémoire · avenir ».
- **NAR** : On nous avait pris cinq choses. Ces carnets racontent comment on les a reprises.

**P5 · La radio** — *Cadre* : plan moyen sur la table de Sol. *Éléments* : la table ; le poste
radio (rectangle 230-380 × 120-206, lavis vert-gris, cadran rond, grille) ; antenne ; une lampe à
gauche ; le carnet ouvert et le crayon rouge. *Lumière* : lavis ambre sous la lampe. *Mouvement* :
ondes rouges qui partent de l'antenne. *Texte* : titre au pochoir « LES CARNETS DE GERMINAL ».
*Musique* : passe à `c_map`.
- **NAR** : Je m'appelle Sol. Je tenais la radio. Vous, vous décidiez sur le terrain. Ouvrez le premier carnet.

---

## 13. Niveaux de difficulté

Trois niveaux, choisis sur la couverture du carnet (et modifiables avant chaque mission). Chaque
nom est **toujours affiché avec sa phrase d'explication** sous le bouton.

### Récit — « Pour vivre l'histoire. »
Pour qui découvre le jeu ou veut l'histoire avant le défi. L'adversaire joue comme l'IA **Facile**
d'escarmouche (`DIFFS[0]`) dans toutes les missions. Les comptes à rebours sont plus longs, les
règles spéciales plus clémentes (chiffres dans chaque mission), et les alertes arrivent plus tôt.
Sol donne des **conseils en plus** (répliques marquées *[Récit]* dans les scripts). En cas
d'échec, on **reprend au dernier point d'étape** : début de l'acte (V) ou du tronçon (II), ou une
**reprise allégée** décrite dans chaque mission (I, III, IV : la mission recommence avec un
avantage acquis, par exemple un transformateur déjà repris). Les objectifs facultatifs restent
possibles.

### Lutte — « Le défi prévu. »
Le niveau pour lequel les missions sont réglées. L'adversaire joue comme l'IA **Normale**
(`DIFFS[1]`) en missions I à III et **Difficile** (`DIFFS[2]`) en IV et V. Les règles spéciales
s'appliquent telles qu'écrites. Pas de conseils en plus : Sol dit l'essentiel. En cas d'échec, on
reprend **au début du tronçon** en mission II et **au début de l'acte** en mission V ; dans les
missions I, III et IV, la mission recommence.

### Dernier carré — « Pour qui connaît l'escarmouche. »
Le nom vient de la fin de journée où il ne reste que les plus têtus. L'adversaire joue en
**Normale** en mission I, **Difficile** en II à IV, **Brutale** (`DIFFS[3]`) en V, avec ses
bonus. Les comptes à rebours sont serrés, les alertes tardives, et chaque mission ajoute **une
contrainte de plus** (décrite dans son fichier). **Aucune reprise** : un échec recommence la
mission. Terminer une mission à ce niveau pose un tampon rouge sur sa page du carnet.

| Mission | Récit | Lutte | Dernier carré |
|---|---|---|---|
| `diff` (index `DIFFS`) | `[0,0,0,0,0]` | `[1,1,1,2,2]` | `[1,2,2,2,3]` |
| Reprise après échec | point d'étape | début d'acte (V) / de tronçon (II) | aucune |
| Conseils de Sol en plus | oui | non | non |
| Tampon du carnet | — | « ACCOMPLIE » | « ACCOMPLIE » + tampon rouge |

---

## 14. Doctrines

Avant les missions II à V, le comité propose **deux doctrines** : une manière de préparer la nuit.
On en choisit une ; elle s'applique au début de la mission (et, en mission V, **au début de
chaque acte**). L'écran de choix montre : le nom, le résumé d'une ligne, l'explication détaillée,
la contrepartie, et une ligne « Utile ici parce que… » propre à la mission.

### Caisse de grève — « On part les poches pleines. »
La collecte des voisins a marché. **Avantage** : +40 % de vivres, de métal et d'eau au départ ; et
pendant les **3 premières minutes**, fermes, marchés et puits produisent **+15 %**. **Contrepartie** :
la base n'a reçu aucun renfort de maçons : **−10 % de points de vie** de base. *À choisir* quand
la mission demande de bâtir vite ou de monter d'ère tôt.

### Service d'ordre — « Les costauds devant. »
Deux anciens CRS ont changé de camp, et des dockers ont renforcé les murs. **Avantage** : **deux
unités lourdes** (Tank de l'ère courante) dès le départ, et la base a **+25 % de points de vie**.
**Contrepartie** : il a fallu les équiper : **−20 % de ressources** au départ. *À choisir* quand
on doit tenir une ligne ou protéger quelque chose dès la première minute.

### Vétérans de Valmont — « Ceux de la première nuit. »
Ceux qui étaient au dépôt Halvard reprennent du service. **Avantage** : **quatre combattants** dès
le départ (2 Mêlée, 2 Tireurs de l'ère courante), **vétérans** : +20 % de points de vie et +10 %
de dégâts, signalés par un brassard rouge. **Contrepartie** : ils ont leurs habitudes : le
**plafond d'unités baisse de 3** pour la mission. *À choisir* quand le début de mission est
dangereux et qu'on veut une armée petite mais solide.

### Radio libre — « Sol a doublé l'antenne. »
Une seconde antenne sur le toit de la halle. **Avantage** : le **bouton d'action de la mission se
recharge 35 % plus vite**, et toute arrivée adverse annoncée (vague, barge, sortie, réécriture)
l'est **4 secondes plus tôt**, avec un repère sur le terrain. **Contrepartie** : l'antenne a coûté
cher : **−10 % de ressources** au départ, et aucune unité en plus. *À choisir* quand la mission
se gagne par le bon moment plutôt que par la force.

### Paires proposées

| Avant | Choix A | Choix B | Pourquoi cette paire |
|---|---|---|---|
| I | — | — | première nuit : rien à préparer, on apprend les bases |
| II · Grève générale | **Service d'ordre** | **Caisse de grève** | protéger le cortège tout de suite, ou bâtir murailles et tourelles sur le parcours |
| III · Sainte-Aube | **Radio libre** | **Vétérans de Valmont** | plus de crues et des alertes plus tôt, ou une poignée solide pour tenir les hauteurs |
| IV · Rochefroide | **Caisse de grève** | **Service d'ordre** | l'argent est rare (réparer, garnir), ou des lourds qui encaissent le froid |
| V · Dernière bataille | **Vétérans de Valmont** | **Radio libre** | une avant-garde à chaque acte, ou plus d'appels aux cellules et des réécritures annoncées plus tôt |

Le choix est rappelé dans le briefing (« Doctrine choisie : … ») et peut changer à chaque essai.

---

## 15. Règles communes des missions

1. **Pas de lacs d'escarmouche.** Les points d'eau (`game.nodes`) n'existent pas en campagne sauf
   si une mission les remplace par un **objet de mission** (borne d'incendie, prise d'eau, etc.)
   dessiné à sa place. Les zones (`game.zones`) sont toujours redessinées (`drawZone`). Chaque
   fichier précise d'où vient l'eau.
2. **Écran de briefing** (avant chaque mission, après le choix de doctrine) : six champs courts.
   - `recap` : ce qui s'est passé avant (2 phrases) ;
   - `where` : le lieu et le moment (1 ligne) ;
   - `goal` : l'objectif principal (1 ligne, verbe d'action) ;
   - `goal2` : les objectifs facultatifs (1 à 3 lignes) ;
   - `rule` : la règle spéciale, avec les chiffres du niveau choisi (3 lignes au plus) ;
   - `tips` : deux ou trois conseils de jeu, qui renvoient à une compétence d'escarmouche.
3. **Actes et étapes** : une mission à plusieurs actes **remet à zéro** ce qui rendrait l'acte
   suivant trop facile (armée, bâtiments, ressources, base) et **garde** ce qui récompense le
   joueur sans tout décider (ère, améliorations, une part des survivants convertie en ressources).
   Chaque acte est un nouveau lieu, un nouveau problème. Voir M5 (et les tronçons de M2).
4. **Une seule vie** en missions I à IV (la base qui tombe est perdue, pas de bombe H, pas de héros
   adverse) ; **deux vies par acte** en mission V.
5. **Radio** : au plus une réplique toutes les 8 secondes ; une consigne de jeu n'est jamais
   seulement dans la radio (elle est aussi dans le briefing ou à l'écran).
6. **Objets de mission** : toujours un objet du monde réel, reconnaissable (transformateur,
   grille de port, vanne, brasero, baie de serveurs), avec un état lisible (éteint / allumé, fermé /
   ouvert) et une jauge courte sous l'objet.

### Retouches proposées au code (hors de ce dossier, pour information)
- Noms d'ères : appliqués en v1.17 (voir `docs/audit/LORE-CHRONO.md` § 3 et le § 2 ci-dessus).
- Renommer les libellés de niveau `lvl0..lvl2` en **Récit / Lutte / Dernier carré** et ajouter la
  phrase d'explication (`lvl0d…lvl2d`).
- Ajouter les voix `nar2`, `voix`, `mado`, `ines`, `anselme`, `malik`, `cell` à `CINE_WHO`.

---

## 16. Les cinq missions en un coup d'œil

| | Lieu · date | Humeur · musique | Objectif | Règle spéciale | Ères |
|---|---|---|---|---|---|
| I | Valmont, quartier des Tanneurs · oct. 2028, nuit, pluie | tension feutrée · `m_night` | détruire le dépôt Halvard | la nuit : on ne voit que ce qui est éclairé ; rallumer les transformateurs | I |
| II | Le port de l'estuaire · mars, deux hivers plus tard, aube | élan collectif · `m_strike` | amener le cortège à Radio-Quai | escorte par tronçons, grilles du port, barricades | I-II |
| III | Vallée de l'Aube · juillet, 4ᵉ été sans pluie, midi | chaleur immobile · `m_dam` | détruire la station de pompage | lâcher des crues dans le lit de la rivière | II-III |
| IV | Cité minière de Rochefroide · l'hiver gris, jour gris | froid, veille · `m_cold` | tenir le relais 8 minutes | le froid, les braseros, les civils à escorter | III-IV |
| V | La citadelle, plaine de Valmont · fin de l'été | grandeur, fin · `m_citadel` → `m_finale` | percer le mur, éteindre les halles, abattre l'avatar | trois actes, cellules alliées, réécritures ; choix final | III-V |
