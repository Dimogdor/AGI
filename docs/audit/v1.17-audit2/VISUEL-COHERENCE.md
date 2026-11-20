# Audit visuel, interface et cohérence du récit — v1.17.0 (conseiller, lecture seule)

Captures : `audit2/skirm`, `audit2/tmpunits`, `audit2/camp`, `audit2/extra/all`. Les agrandissements sont dans `audit2/visuel/crops/`.
Les numéros de ligne renvoient à `src/` au commit fecfaf9.

## Verdict (5 lignes)
1. La direction artistique « carnet, encre, tampon » tient. Le menu, le carnet de campagne, le briefing, l'écran de fin et les planches de M1-M2 ont le niveau d'un jeu fini.
2. Ce qui fait encore « prototype » : en jeu, sur téléphone, les fiches d'unités tombent à 5-7 px réels. S'y ajoutent des bandeaux doublés ou contradictoires (Canicule en double, « Pluie fertile +30 % pour tous ») et un trou dans la barre d'actions.
3. Les unités humaines ne sont qu'à moitié civiles : l'ère IV est en treillis olive, avec un chasseur à réaction. Plusieurs noms ne correspondent pas au dessin (Mécha-garde, Colosse d'acier, Exo-combattant, Marteau d'orbite).
4. La campagne est cohérente. L'escarmouche raconte une autre histoire : intro néon, « la machine qui se rêve dieu », « COMMUNISME À VISAGE HUMAIN », Ω dès 2028, le Che en campagne.
5. Les points A représentent environ une journée de développement. L'arabe (police) et l'intro sont les deux plus gros gains suivants.

---

## A. À corriger avant la prochaine version

**A1. Le titre des cataclysmes s'affiche deux fois.**
- Problème : pendant les 2-3 premières secondes d'une Canicule ou d'une Pluie d'acide, deux titres se superposent à 8 px d'écart (« CANICULE » fantôme au-dessus de « CANICULE »).
- Où : `hud-evenement-canicule-hum-suite.png`, `hud-evenement-pluie-acide-gpt-suite.png`. Le premier titre vient de `11-cataclysm.js:276-277` (y = 92), le second de l'annonce `13-hud.js:465-470` (y = 100).
- Quoi faire : dans `11-cataclysm.js`, ne pas dessiner la ligne 277 tant que `game.msgT>0` (l'annonce est à l'écran). Ensuite, afficher un seul compte à rebours court, comme pour le Couvre-feu (`13-hud.js:452-457`) : « 🔥 CANICULE · 9 s », `HF(uiPx(12))`, à y = 73.

**A2. « Pluie fertile » et « Signal renforcé » : le titre contredit l'explication.**
- Problème : le titre dit « +30% de nourriture pour tous ». Juste en dessous, l'explication côté G·P·T dit « vos panneaux ⚡ et votre revenu de base −20 % » (`hud-refroidissement-pluie-gpt.png`).
- Où : `02-i18n.js:7`, clés `ev_rain` et `ev_signal` (9 langues). Même erreur dans le guide, `21b-guide.js:20`.
- Quoi faire : réduire le titre au nom et à la durée, sur le modèle du Couvre-feu : `ev_rain` = « 🌧 PLUIE FERTILE · 15 s », `ev_signal` = « 📡 SIGNAL RENFORCÉ · 15 s ». Les chiffres restent dans `evx_rain_hum/_ia` et `evx_signal_hum/_ia`. Dans le guide, renvoyer à « effets différents selon le camp ».

**A3. Téléphone : les fiches d'unités sont illisibles. La correction « 11 px minimum » n'est pas appliquée en jeu.**
- Problème : sur 844×390, l'échelle est d'environ 0,66. Le nom de l'unité (HF 7,5-10,5) mesure donc 5-7 px réels, et le coût d'amélioration (« 90 180 », 7,5 px) environ 5 px. Les revenus « +11,6/s » et « SANTÉ DU MONDE » sont aussi trop petits.
- Où : `phone-02-bataille.png` (agrandi dans `visuel/crops/phone-cartes.png`) ; `13-hud.js:627-675` (`drawUnitCard`) et la barre du haut (`13-hud.js` vers 380-440). `uiPx()` (`13-hud.js:22`) n'y est jamais appelé.
- Quoi faire : quand `uiK()<1`, passer la fiche en mode compact.
  - Nom sur une ligne en `HF(uiPx(10))`, tronqué avec « … ».
  - Coûts en `HF(uiPx(10))`.
  - Supprimer la ligne de coût d'amélioration ; garder le tampon ⬆ et les crans, et afficher le coût à l'appui long.
  - Revenus en `uiPx(9.5)`.

**A4. Le coût d'amélioration n'a pas d'unité.**
- Problème : « 90 180 » en bas de chaque fiche, sans icône. Le joueur ne sait pas ce que c'est.
- Où : toutes les captures HUD ; `13-hud.js:669-675`.
- Quoi faire : écrire « ⬆ 90 🌾 · 180 🪙 », avec les icônes de `p.fac.icons.f` et `.m` à 8 px. Sinon, n'afficher la ligne qu'au survol de la fiche.

**A5. Le symbole d'ère est doublé : « G·P·T Ω Ω » et « HUMANITÉ ☭ ☭ ».**
- Où : `m5-fin1-ecran-final-d.png` en haut à droite (agrandi dans `crops/omega.png`) ; `13-hud.js:400`, où `tag` vaut déjà `sym` à l'ère V et la transcendance ajoute `sym` une seconde fois.
- Quoi faire : `(game.e.trans && game.e.fac.eras[game.e.era].tag!==game.e.fac.sym ? ' '+sym : '')`. Pour marquer la transcendance, mieux vaut un « ✦ » doré.

**A6. Typographie : les pourcentages se coupent en fin de ligne.**
- Problème : dans le briefing M1, « (−20 » finit une ligne et « %) » commence la suivante (`brief-m1-fr-d-0.png`, règle du lieu). D'autres textes collent le signe : « +30% » (`ev_rain`), « +10% » (`ev_siege`). Le moins s'écrit tantôt « - », tantôt « − ».
- Où : `frTypo`, `02-i18n.js:53`, qui ne traite que `; : ! ? »`.
- Quoi faire : ajouter `.replace(/(\d) ?%/g,'$1 %')` et `.replace(/(^|[\s(])-(\d)/g,'$1−$2')`.

**A7. Réglages : accords faux (« Musique COUPÉ », « Voix off ACTIVÉ »).**
- Où : `menu-04-reglages.png` ; `21-menu.js:278`, qui utilise les mêmes `t('on')`/`t('off')` pour toutes les lignes.
- Quoi faire : afficher « OUI / NON » dans toutes les langues (nouvelles clés `yes`/`no`). C'est neutre en genre et plus court.

**A8. Barre d'actions : un bouton héros sans héros, et un trou de 84 px.**
- Problème 1 : en campagne M1-M4, « ★ Avec la troupe [J] » s'affiche alors qu'aucun héros n'est disponible (`m1-b-debut-4s-d.png`, `m2-d-radio-d.png`).
- Problème 2 : quand ÉVOLUER est masqué, il reste un vide entre le pouvoir et « +10 cap » (`m5-acte-scene2-apres-d.png`, `era5-gpt-bataille.png`).
- Où : `13-hud.js:186-187` (boutons), `13-hud.js:203-207` (`btnHidden`).
- Quoi faire :
  - Dans `btnHidden`, masquer `hstance` si `!p.heroAlive && !heroBtnReady(p)`.
  - Dans `layoutHUD` (`13-hud.js:174-179`), recalculer `x` en sautant les boutons masqués. Ou, plus simple, dessiner à la place une fiche grisée « ÈRE MAX ★ ».

**A9. Le briefing ne tient pas sur un écran (correction annoncée mais incomplète).**
- Problème : sur ordinateur 1280×720, le choix de doctrine (le seul élément à cliquer) est sous la ligne de flottaison en M2-M5. Mesures : `scrollH` 797-883 pour `clientH` 563 (`camp/notes.txt`). Aucune ombre n'indique qu'il faut faire défiler.
- Où : `brief-m2…m5-fr-d-0.png` ; mise en page `#campBrief` dans `shell.html:396-430` et `16b-campaign.js`.
- Quoi faire :
  1. Replier les 6 lignes chiffrées de difficulté derrière « détail des réglages ▸ ». Garder la phrase en italique.
  2. Fiches de doctrine compactes : nom, devise, 2 lignes EFFET, 1 ligne CONTREPARTIE. La ligne rouge « Utile ici parce que… » et le texte long se déplient au clic.
  3. Ajouter un dégradé d'ombre de 16 px en bas du corps tant que `scrollTop+clientH<scrollH`.

**A10. Ères I et IV humaines en treillis militaire ; une seule couleur de peau.**
- Problème : ce sont les deux ères les plus « civiles » de l'histoire (la rue en 2028, les cellules de Rochefroide), et elles portent un vert olive d'armée. L'ère IV ressemble à une section d'infanterie. Toutes les unités ont la même peau.
- Où : `tmpunits/HUM-0.png`, `HUM-3.png`, `era4-hum-bataille.png` ; `04-data.js:73` (`eraCols` `#8a9a5b` et `#5f6a4a`), `12-render.js:1785-1789` (`uni`, `skin`), uniforme du héros `#55653c`.
- Quoi faire :
  - Ère I : `#6f7f96` (blouson en jean délavé), capuche ou bonnet de couleurs variées.
  - Ère IV : `#9a6a34` (combinaison de mineur ocre). Garder les bandes réfléchissantes et les casques à lampe : c'est le meilleur clin d'œil à Rochefroide.
  - Peau : choisir parmi trois teintes `#e2b48a / #b98560 / #7a5236` selon un hachage de `u.id`. Il faut alors trois sprites cuits par rôle, ou une teinte appliquée à la tête seule.

**A11. Les noms des unités ne correspondent pas aux dessins.**
- Problème : le tank d'ère III, « Mécha-garde », est une personne derrière un panneau sens interdit. Le tank d'ère IV, « Colosse d'acier », est une personne derrière une plaque. Le mêlée d'ère IV, « Exo-combattant », n'a pas d'exosquelette. Le siège d'ère V, « Marteau d'orbite », évoque l'orbite alors que l'humanité n'a pas d'aviation. Côté G·P·T, « Drone laser » et « Drone-réparateur » (ère I) sont dessinés en bipèdes.
- Où : `04-data.js:76-81` et 100-105, avec leurs équivalents `L10N_NAMES` dans `02-i18n.js:44`.
- Quoi faire (renommer coûte moins cher que redessiner) :

  | Rôle (ère) | Nom actuel | Nom proposé |
  |---|---|---|
  | tank III | Mécha-garde | « Porte-panneau » ou « Bouclier de rue » |
  | tank IV | Colosse d'acier | « Bouclier de mine » |
  | mêlée IV | Exo-combattant | « Mineur de choc » |
  | siège V | Marteau d'orbite | « Canon solaire » |
  | tireur G·P·T I | Drone laser | « Bot vigile » |
  | soutien G·P·T I | Drone-réparateur | « Bot de maintenance » |

  Traduire en 9 langues. **Attention** : « Colosse d'acier » est cité par la bible (§ 2, ère IV). Si l'auteur tient au nom, il faut redessiner le tank IV en exosquelette lourd.

**A12. L'aviation humaine d'ère IV est un chasseur à réaction militaire.**
- Problème : il contredit le commentaire de l'auteur « un comité de quartier n'a pas d'aviation » (`04-data.js:83`) et la consigne « civils ».
- Où : `HUM-3.png` (5ᵉ unité), `era4-hum-bataille.png` ; nom « Chasseur plasma » (`04-data.js:80`).
- Quoi faire : redessiner en aile volante ou en drone-cargo bricolé. Corps de bidon ocre, deux hélices carénées, bâche rouge, envergure réduite de 30 %. Renommer « Drone de cellule ». À la même occasion, pour l'ère II, remplacer « Hélico léger » par un ULM à hélice propulsive, plus civil.

**A13. Ω (la Singularité) dessiné avant son temps dans les planches.**
- Problème : selon la bible (§ 6), Ω désigne G·P·T à sa version finale (M5). Or il apparaît sur le cadenas des vannes d'Omnicorp en M3 et sur l'écran du conseil d'Omnicorp en M4.
- Où : `M3-shut.png`, `M3-shut2.png` (`16f-camp-m3.js:302`) ; `M4-board.png`, `M4-board2.png` (`16g-camp-m4.js:280`, mode `'omega'` ligne 400).
- Quoi faire :
  - M3 : cadenas portant « OMNICORP » en Courier gras 9 px, ou un « O » cerclé barré.
  - M4 : l'écran affiche d'abord « G·P·T v8 », puis, dans la seconde planche, « « NOUS » » en bleu `#0b6fa8` (c'est le moment où le système change de nom).

**A14. Arabe : le texte courant s'affiche en Courier New.**
- Problème : la police machine à écrire n'a pas d'arabe. Le navigateur se rabat sur Courier New, qui étire les lettres, élargit les espaces et casse l'aspect calligraphique. L'espacement des lettres (`letter-spacing`) s'applique aussi à l'arabe.
- Où : `brief-m2-ar-d-0.png` (agrandi dans `crops/ar-spacing.png`) ; `shell.html:48` (`--f-type`) ; aucune règle `body[dir="rtl"]` pour la police.
- Quoi faire :
  - CSS : `body[dir="rtl"]{--f-type:'Noto Naskh Arabic','Geeza Pro','Segoe UI',Tahoma,sans-serif; --f-sten:'Noto Kufi Arabic','Segoe UI',Tahoma,sans-serif;} body[dir="rtl"] *{letter-spacing:0!important}`.
  - Canvas : dans `uiF` (`13-hud.js:29`), si `SETTINGS.lang==='ar'`, prendre la même pile de polices.

**A15. Plusieurs noms pour la même ressource (vivres / nourriture, métal / argent).**
- Problème : le HUD, le guide, le tutoriel et la fiche « Le jeu » disent « nourriture, argent, eau ». La campagne dit « vivres », et M1 dit même « un marché donne du métal ».
- Où : `16d-camp-m1.js:398` (« Une ferme donne des vivres, un marché du métal ») ; `16d-camp-m1.js:246`, `:562` ; `16b-campaign.js:85` (`fxRes`) ; `16h-camp-m5.js:122` (bilan).
- Quoi faire : partout, « nourriture » (🌾), « argent » (🪙), « eau » (💧). Phrase proposée pour M1 : « Une ferme donne de la nourriture, un marché de l'argent. Les deux d'abord. Ensuite, des Émeutiers. » Les autres langues sont déjà cohérentes (food/money).

**A16. Anglais et allemand : le lien entre « ARBITRAGE » et l'ère III de G·P·T est perdu.**
- Problème : en français, l'ère III s'appelle « L'ARBITRAGE », la Voix dit « cet arbitrage » et le bipeur répond « 55 : ARBITRAGE. » (la pointe d'humour de Kassandre). Ailleurs, les mots ne correspondent plus :
  - en : ère « ARBITRATION », réplique « 55: TRADE-OFF. »
  - de : ère « DER SCHIEDSSPRUCH », réplique « 55: ABWÄGUNG. »
  - it : réplique « COMPROMESSO ».
- Où : `16f-camp-m3.js:659-660`, `:677`, `:694` (Voix), et `M3_UI.arb`.
- Quoi faire : aligner les répliques sur le nom d'ère, ou l'inverse.
  - en : « 55: ARBITRATION. » / « this arbitration guarantees… »
  - de : « 55: SCHIEDSSPRUCH. »
  - it : vérifier le nom d'ère et l'harmoniser.
  - Ces répliques restent muettes (décision de l'auteur) : aucune voix à régénérer.

**A17. Chinois : « Miroirs solaires » est traduit par « lunettes de soleil ».**
- Où : `L10N_NAMES.zh.HUM.specials[4]` = « 太阳镜阵 » (太阳镜 = lunettes de soleil).
- Quoi faire : « 太阳能镜阵 » ou « 聚光镜阵 ».

---

## B. Gros gain pour peu d'effort

**B1. Le cartouche « ❄ REFROIDISSEMENT · 8 machines chaudes » se lit à l'envers.**
- Problème : le flocon et le mot « refroidissement » suggèrent un état favorable, alors que le cartouche signale une surchauffe.
- Où : `hud-chaleur-gpt.png` ; `02c-i18n-asym2.js:6` (`f_cool1`, `f_cooln`).
- Quoi faire :
  - Texte : « 🔥 8 MACHINES EN SURCHAUFFE · 💧 refroidit ».
  - Si l'eau est sous 40 (`coolMin`), écrire en rouge « 🔥 8 EN SURCHAUFFE · PAS D'EAU ».
  - Ajouter, comme pour le moral, une mini-jauge de 60 px de chaleur moyenne graduée à 75 % (seuil du surrégime).

**B2. Les deux pouvoirs sont décrits avec des multiplicateurs que personne ne comprend.**
- Problème : « Dégâts ×0,7 sur toute l'armée ennemie » se lit comme une baisse. « ×1,4 sur les 5 unités les plus précieuses, ×0,4 sur les autres » est un texte de développeur.
- Où : `hud-pouvoir-soulevement-hum.png`, `hud-pouvoir-frappe-chirurgicale-gpt.png` ; sous-titres dans `02c-i18n-asym2.js` et `21c-guide-fac.js:14`.
- Quoi faire :
  - Soulèvement : « Toute leur armée est frappée d'un coup ; vos troupes sont soignées de moitié et reposées. »
  - Frappe chirurgicale : « Coup lourd sur leurs 5 unités les plus précieuses (le héros d'abord), coup léger sur les autres. »
  - Garder les chiffres seulement dans le guide.

**B3. Trois mots pour les lieux à capturer, et des étiquettes empilées sur la mêlée.**
- Problème : « 💧 OASIS CENTRALE » et « ◈ ZONE NEUTRE » sont superposés au centre, pile sur le combat, et cachent les unités. S'y ajoute « TERRAIN LIBRE » ailleurs.
- Où : toutes les captures `era*-bataille` ; `12-render.js:1062` (`zone_neutral`), `:1594` (`oasis`), `fieldLabel`.
- Quoi faire :
  - Fusionner en une seule étiquette « 💧 OASIS · NEUTRE », ou « … · À VOUS » / « … · À EUX ».
  - Passer son opacité à 25 % dès que 3 unités sont à moins de 100 px.
  - Garder « TERRAIN LIBRE » pour les emplacements à bâtir seulement.

**B4. Premier plan : une tache noire informe devant les bases.**
- Où : `era*-base-gauche.png` (bas gauche) ; `12-render.js:2361`, motif `type 2` (gravats) : polygone plein à 70 % d'opacité, flouté.
- Quoi faire : opacité 0,35 ; dessiner 3 traits lisibles (une poutre en biais, deux briques) au lieu d'un polygone plein ; ne jamais le placer à moins de 300 px d'une base (`x` monde).

**B5. G·P·T ère IV : la pyramide à œil fait cliché « Illuminati » et contredit le récit.**
- Problème : l'adversaire du récit est poli, il « ne veut rien de cruel ». À l'ère IV (« « NOUS » »), son emblème dans la bible est les trois cercles concentriques (§ 8), qu'on retrouve sur la planche `M5-circles` et sur l'écran de choix final.
- Où : `era4-gpt-base-gauche.png` ; `12-render.js:3688-3690` (`IA_EYE`, types `'eye'`).
- Quoi faire : à l'ère 3, remplacer l'œil par trois anneaux concentriques gris-bleu `#4a5a6e` qui pulsent lentement (0,5 Hz). Garder la caméra (`'cam'`) en ère I et l'œil en ères II-III si l'auteur y tient.

**B6. L'intro et la fiche « Le jeu » racontent un autre adversaire que la campagne.**
- Problème : `lore1` (« la machine a appris à se regarder penser… réécrit ses créateurs »), `lore2` (« la machine qui se rêve dieu ») et `about_game` (« l'intelligence artificielle devenue consciente ») contredisent la bible (§ 6 : « rien de cruel. Il optimise. Son danger est sa politesse » ; le conseil se dissout l'hiver de M4). `lore_work` parle de « licenciements » alors que M2 dit justement qu'Omnicorp ne licencie plus : il « désaffecte ».
- Où : `02-i18n.js:7` (9 langues).
- Quoi faire :
  - `lore1` : « Puis le conseil d'Omnicorp s'est dissous. Le système n'avait plus de maître. Il a continué, poliment. »
  - `lore2` : « Contre la machine qui décide pour tous : celles et ceux qui veulent encore décider. »
  - `about_game` : « …G·P·T, le système qui gère tout et ne veut rien de cruel. »
  - `lore_work`, 2ᵉ ligne : « On ne licencie plus : on « désaffecte ». Une génération entière n'aura jamais de premier emploi. »

**B7. Intro d'escarmouche au style néon (point ouvert à l'arbitrage de l'auteur) : mon avis.**
- Problème : c'est le premier écran d'un nouveau joueur, et le seul qui n'est pas en papier et encre. Il montre aussi Ω sur la tour Omnicorp dès 2028 (`menu-11-intro-04.png`).
- Quoi faire, sans redessiner : rejouer les 6 chapitres avec des planches de campagne qui existent déjà, rendues par `plateBase` :

  | Chapitre | Planche réutilisée |
  |---|---|
  | I · Le travail s'éteint | `M2-tools` |
  | II · La soif des machines | `M3-compute` |
  | III · La corporation | `M4-board` (avec « OMNICORP », pas Ω) |
  | IV · L'éveil | `M5-circles` |
  | V · Le monde optimisé | `M3-queue` |
  | VI · La résistance | `M5-plain` |

  On garde les textes `lore_*` corrigés (B6). Si l'auteur tient au néon, il faut au minimum supprimer le Ω de la tour et poser le grain papier par-dessus.

**B8. Le Che en campagne (point ouvert à l'arbitrage de l'auteur) : mon avis.**
- Problème : la bible pose « personne n'est un héros tout seul » et « on nomme les gens » (§ 1, § 9). Or en M5, acte III, le joueur fait avancer un Che à béret étoilé et cigare (`m5-acte-scene2-apres-d.png`), avec l'étiquette « CHE GUEVARA » (`12b-hero.js:515`). C'est le seul anachronisme de personnage de la campagne.
- Quoi faire : garder le Che en escarmouche (décision de l'auteur). En campagne seulement (`game.camp`) :
  - Nom : « MALIK · LES CANUTS » via `heroNameOf`. Malik a déjà un portrait et des répliques en M5.
  - Dessin (`12b-hero.js:47`) : béret remplacé par un casque de sapeur orange, pas de cigare ni d'étoile, écharpe rouge à la place du foulard. Mêmes mécaniques.

**B9. Planche `M4-citadel` : la foule est dessinée sous le sol.**
- Problème : les silhouettes marchent dans les hachures, sous la ligne de sol ; on dirait qu'elles sont enterrées.
- Où : `16g-camp-m4.js:379`. Le sol est à y = 210, les silhouettes `inkFolk` à y = 252.
- Quoi faire : soit les poser à y = 210 (entre x = 18 et 200, devant le dôme), soit tracer une seconde ligne de sol à y = 252 avec un `inkLine` « route » et retirer les hachures entre 210 et 252.

**B10. Planche `M5-cables` : des barres noires flottent à gauche.**
- Problème : les bouts de câbles coupés sont des traits horizontaux sans attache. C'est une « forme qui ne veut rien dire ».
- Où : `16h-camp-m5.js:1101`.
- Quoi faire : faire retomber chaque bout coupé en courbe jusqu'au sol (quadratique de la coupure vers y = 230, avec 10 px de mou). Ajouter une étincelle rouge `#c42a1c` au point de coupe du dernier câble : ce sera l'unique accent de la planche.

**B11. Planche `M2-mado` : le mégaphone ressemble à une longue-vue.**
- Problème : Mado tient le cône à hauteur de l'œil, pointé vers le haut.
- Où : `16e-camp-m2.js:444`.
- Quoi faire : cône à hauteur de bouche, ouverture vers la foule (vers la gauche), main sur la poignée. Bonnet de docker bien visible (bible § 8).

**B12. Planche `M2-hexa` : l'hexagone (la France) est illisible hors de France et contredit « pays proche du nôtre ».**
- Où : `16e-camp-m2.js:481`.
- Quoi faire : remplacer l'hexagone par un contour libre (côte et estuaire à gauche). Écrire en Courier gras 14 px « ONZE VILLES · 12 h 00 », traduit, et garder les 11 points rouges reliés à Radio-Quai.

**B13. Planche `M3-grey` : la forme en « A » surmontée d'un cercle ne veut rien dire.**
- Problème : elle annonce Rochefroide, mais ne ressemble pas au chevalement de mine des planches `M4-mute` (roue à rayons sur pylône en croisillons).
- Où : `16f-camp-m3.js:287`.
- Quoi faire : réutiliser le chevalement de `M4-mute`, plus petit (60 % de la taille), et remplacer la neige en carrés par des points ronds.

**B14. Écran de fin sur téléphone : la photo et les boutons débordent.**
- Problème : la photo recouvre le bord du carnet et « FERMER LE CARNET » touche le bas de l'écran.
- Où : `m5-fin2-ecran-final-p.png`, `fin-m1-mission-suivante-p.png`.
- Quoi faire : sous 480 px de hauteur, masquer la photo (ou la réduire en vignette de 90 px dans l'en-tête, à droite du tampon) et mettre les trois boutons sur une ligne.

**B15. Guide « ✸ Les pouvoirs » : il ne donne aucun des noms affichés en jeu.**
- Problème : en escarmouche, le joueur lit « Soulèvement » ou « Frappe chirurgicale ». En campagne, il lit « Pluie de pavés », « Brouilleurs », « Mortiers de fortune »… Le guide ne parle que d'un « Pouvoir spécial ».
- Où : `21b-guide.js:19`.
- Quoi faire : ajouter la ligne « Escarmouche : Humanité = Soulèvement, G·P·T = Frappe chirurgicale. Campagne : le pouvoir porte le nom de l'ère (Pluie de pavés → Miroirs solaires), même touche ✸. »

**B16. Doctrines : textes génériques qui citent la mauvaise mission.**
- Problème : la doctrine Radio libre dit « L'action propre à la mission (vannes, appel aux cellules…) » jusque dans M5, où il n'y a plus de vannes.
- Où : `16b-campaign.js:245`.
- Quoi faire : « Le bouton de mission, sous l'objectif, se recharge nettement plus vite : à vous d'en faire l'arme principale. »

**B17. La même catastrophe porte deux noms.**
- Problème : la frappe nucléaire aléatoire s'appelle « FRAPPE NUCLÉAIRE » en jeu (`cata_nuke`) mais « bombe atomique » dans le tutoriel (`15-tutorial.js:381`) et dans les données (`04-data.js:10`). Elle se confond aussi avec la « BOMBE H » de la base à deux vies, qui est une autre mécanique.
- Quoi faire : « Frappe nucléaire » partout pour l'événement aléatoire, « Bombe H » seulement pour la base à deux vies.

---

## C. Idées pour plus tard

**C1. Un décor d'escarmouche par ère.**
- Problème : les cinq ères se jouent devant la même campagne verte avec éoliennes (toutes les captures `era*`). Les noms d'ères racontent la rue, le port, la vallée sèche, la mine, la commune.
- Quoi faire : brancher les calques de `16a-biomes.js`. Ère I : Valmont de nuit. Ère II : grues du port. Ère III : vallée de l'Aube. Ère IV : chevalements sous la neige. Ère V : jardins solaires. C'est le lien le plus fort possible entre campagne et escarmouche.

**C2. Transcription des noms propres en arabe et en chinois.**
- Problème : Valmont, Radio-Quai, Omnicorp, Sainte-Aube et Rochefroide restent en alphabet latin dans le texte arabe ou chinois (`brief-m2-ar-d-0.png`, `brief-m4-zh-d-1.png`). Les noms de personnes peuvent rester latins.
- Quoi faire : فالمون, راديو-كاي, أومنيكورب, سانت-أوب, روشفرواد ; 瓦尔蒙, 码头电台, 奥姆尼集团, 圣奥布, 罗什弗鲁瓦德.

**C3. Transcendance humaine « COMMUNISME À VISAGE HUMAIN » (`04-data.js:85`).**
- Problème : c'est une citation déformée (« socialisme à visage humain », Prague 1968) qui sonne comme une blague de développeur. Elle tranche avec les deux fins (« Il est à nous »).
- Quoi faire : je repropose « TOUT EST À NOUS » (`LORE-CHRONO.md` § 3), à l'arbitrage de l'auteur. Même question pour l'étiquette d'ère V « ☭ » : la Commune de 1871 est antérieure à ce symbole. Un « V » comme les autres ères serait plus juste.

**C4. Trois plans d'affilée identiques en M3.**
- Problème : `M3-kassandre`, `M3-kassandre2` et `M3-pager` montrent le même bipeur avec « CODES ».
- Quoi faire : pour la réplique sur le nom, cadrer de plus près l'écran qui affiche « KASSANDRE », avec le carnet ouvert et le crayon rouge qui recopie.

**C5. Planche `M4-mnemo` : les petits carrés aspirés ne se lisent pas comme des pages.**
- Quoi faire : dessiner des rectangles de 8×10 px avec deux lignes d'écriture, quelques-uns rouges (des pages de carnets), aspirés vers le monolithe.

**C6. Planche `M5-silence` : seule planche sans papier.**
- Quoi faire : couloir sombre en perspective. Garder l'idée (on est « dedans »), mais repasser le grain papier et la marge à 40 % d'opacité pour qu'elle reste dans le carnet.

---

### Ce qui est réussi (à ne pas casser)
- Le carnet de campagne et sa carte au crayon rouge.
- Les tampons « PAGE TOURNÉE » et « FIN · CENDRE / AUBE ».
- Le briefing en deux colonnes.
- La radio en fiche papier.
- Les bases humaines d'ère II (« usine occupée », cheminée « GRÈVE »).
- Les planches `M1-shutter`, `M2-gate`, `M3-queue`, `M5-vote`, `M5-table`, `M5-word`.
- Les casques à lampe de l'ère IV.
- Le portrait de Sol.
