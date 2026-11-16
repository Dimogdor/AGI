# Audit — Asymétrie des factions (Humanité ☭ / G·P·T Ω)

> Analyse et proposition seulement : rien n'est implémenté. Rédigé à partir de `src/04-data.js`, `08-actions.js`,
> `09-ai.js`, `10-simulation.js`, `11-cataclysm.js`, `12b-hero.js`, `18-net-core.js`, `21b-guide.js`, `tools/_bots.js`,
> `tools/qa-skirmish.mjs`. Les chiffres « actuels » viennent du code, pas du guide.

Ce que demande l'auteur : « rendre chaque faction un peu plus différente, dans le gameplay comme dans les bonus et malus
de l'environnement, tout en gardant une balance entre les deux équipes — juste un style de jeu différent entre AGI et humain ».

---

## 0. État des lieux

### 0.1 Ce qui est déjà asymétrique

| Domaine | Humanité (HUM) | G·P·T (IA) | Où |
|---|---|---|---|
| Ressources | 🌾 nourriture · 🪙 argent · 💧 eau | ⚡ énergie · ◈ données · 💧 eau de refroidissement | `FACTIONS.icons` — **cosmétique** : mêmes revenus, mêmes coûts |
| Texture de frappe | dégâts ×0,82, cadence ×0,82 (rapide et léger) | dégâts ×1,22, cadence ×1,22 (lent et lourd) | `unitStats` — DPS identique |
| Passif de coût | infanterie (mêlée, tireur, tank) −5 % | — | `unitCost` |
| Passif de PV | — | PV de base +5 % | `unitStats` |
| Effort | fatigue : +0,045/coup, récupère 0,05/s, 3 s de fatigue, −20 % dégâts, cadence ×1,3 | surchauffe : +0,065/coup, récupère 0,030/s, 4 s, −30 % dégâts, cadence ×1,5 | `updateUnits` |
| Soutien | médic : soin 45+10·niv toutes les 1,3−0,2·niv s | ruche : soin 40+9·niv, 35 % plus lent, **drones** (hors effectif, plafond 5+2·ère+2·niv) | `updateUnits`, `droneCap` |
| Héros | Che : dégâts ×0,7, aura de soin 14·ère/s à 150 px | Singularité : dégâts ×1,3 | `spawnHero`, `updateUnits` |
| Événement social | Grève générale : HUM figés 15 s | Mise à jour forcée : IA figées 15 s | `facFrozen` — miroir exact |
| Cataclysmes | acide 18/s, canicule 16/s | acide 22/s, canicule 20/s | `applyCataEffects` — l'IA perd ~22 % de plus |
| Formation | colonne un peu plus étirée | colonne plus serrée | `formationWant` — quasi cosmétique |
| Transcendance | « Communisme à visage humain » : 🪙 aboli | « AGI complète » : ◈ aboli | `checkTrans` — **même effet** |

### 0.2 Ce qui est en miroir strict
Rôles, coûts, `ERA_STAT`/`ERA_COST`, bâtiments (seul le nom change : Ferme/Marché ↔ Panneaux/Serveur), améliorations,
vétérance, effectif, files d'attente, pouvoir ✸ (seul le nom change), Dernier recours, Mode siège, coût et aura ×3/×2 du
héros, lacs, zones, zone bonus, comeback (`losing01`, `zoneBuff`), Pluie fertile, Signal renforcé, inondation, sable,
météorites, frappe nucléaire, hiver nucléaire, usure du monde, effondrement.

**Bilan** : le jeu est un miroir avec une peau différente. Les seules vraies asymétries (effort, soutien, héros) sont des
compensations de quelques pour cent qui ne changent pas la façon de jouer.

### 0.3 Incohérences relevées (à corriger dans le lot 0)
1. **`specialCd(side)`** (`08-actions.js:159`) : le commentaire annonce « PASSIF HUM : pouvoirs 10 % plus rapides », mais
   le code renvoie `SPECIAL_CD*0.95` **pour les deux camps** (et 5 %, pas 10 %). Le passif n'existe pas.
2. **`unitStats`** (`08-actions.js:81`) : « contrepartie = électricité un peu plus chère, voir unitCost ». `unitCost` n'a
   aucun surcoût pour l'IA. L'IA a donc +5 % de PV sans contrepartie.
3. **La fatigue humaine ne se déclenche presque jamais.** Bilan net de chaleur en combat continu, ère 0, sans amélioration :

   | Rôle | HUM (gain/s − 0,05) | IA (gain/s − 0,03) |
   |---|---|---|
   | Mêlée (cadence 0,57 / 0,85 s) | +0,028/s → fatigue au bout de ~36 s | +0,046/s → surchauffe au bout de ~22 s |
   | Tireur (0,86 / 1,28 s) | +0,002/s → ~8 min (jamais) | +0,021/s → ~48 s |
   | Tank (0,94 / 1,40 s) | négatif → jamais | +0,016/s → ~62 s |

   L'écart grandit avec l'ère, puisque la cadence accélère (`1−0,05·ère−0,04·niv`). C'est donc un malus réservé à l'IA, compensé
   en douce par ses +5 % de PV et par l'alignement des PV du héros en v1.12. Il faut l'assumer comme une **mécanique d'identité**
   et non comme un correctif caché (voir M4).
4. **Cataclysmes** : acide et canicule frappent l'IA ~22 % plus fort sans contrepartie environnementale.
5. **Invité en ligne** : `serBld` n'envoie pas `b.age`, donc `calcRates` chez l'invité affiche des revenus sans le bonus de
   longévité. Le défaut existe déjà ; il deviendra visible avec M1.
6. `ERA_LORE` (fr) date l'ère IV en 2035 alors que `FACTIONS.eras` dit 2038 (détail narratif).

---

## 1. Identités

**Humanité — « La Commune ».** La résistance gagne par le **nombre, la solidarité et l'adaptation**. Ses troupes sont
moins chères, plus fortes quand elles se serrent les coudes, et elles se relèvent. Son économie est diffuse, mûrit vite et
se reconstruit. Elle prend le terrain (zones, lacs, barricades) et tire profit de la pluie qui nourrit ses champs. Elle souffre
de la chaleur, de la faim et des grèves, mais **rebondit** après chaque coup dur.

**G·P·T — « Omnicorp ».** La corporation-AGI gagne par la **précision, la mise à l'échelle et la logistique**. Moins d'unités,
mais chacune exécute la bonne cible. Son économie en réseau compose (chaque serveur rend les autres meilleurs) et pèse
de plus en plus en fin de partie, mais elle reste **fragile** : couper un nœud fait vaciller le réseau. Ses machines vivent de
l'eau de refroidissement : bien refroidies, elles tournent en surrégime ; sans eau, elles surchauffent. Le froid lui va, la pluie
et le sable l'aveuglent.

En une ligne : **HUM = largeur, tempo précoce, résilience · IA = profondeur, montée en puissance, gestion du risque.**

---

## 2. Mécaniques asymétriques proposées (M1 à M10)

Convention : toutes les constantes vont dans **un seul objet `FAC_TRAITS`** dans `04-data.js` :
`FAC_TRAITS.HUM.xxx` / `FAC_TRAITS.IA.xxx`, avec un interrupteur `on` par mécanique. On peut ainsi faire des tests d'ablation,
revenir en arrière et laisser la campagne choisir (`game.camp.m.asym`). Un accesseur `ft(side,'clé')` renvoie la valeur.

### M1 — Économie : « Économie populaire » (HUM) / « Effet réseau » (IA)
- **HUM**
  - Bonus de longévité à plein régime en **600 s** au lieu de 900. Le plafond ×3 ne change pas.
  - **Reconstruction** : rebâtir le même type sur un socle détruit depuis moins de 90 s coûte **−50 %**.
- **IA**
  - **+6 % de production par autre bâtiment éco IA vivant** (ferme, marché ou puits, base et neutres), au plus +24 %.
  - Quand un bâtiment éco IA est détruit, le bonus réseau tombe à 0 pendant **12 s** (« resynchronisation »).
  - Longévité inchangée (900 s).
- **Code**
  - `04-data.js` : `longevMul(b)` devient `longevMul(b, fk)`.
  - `10-simulation.js` `updateBuildings` (lignes farmF, farmM, well) : multiplier par `ecoMul(side)`.
  - `07-decor.js` `calcRates` : même formule (affichage).
  - `08-actions.js` `demolish(slot, true)` : noter `slot.ruin={type,t}` et `side.netT=game.t+12` ; `tryBuild` lit `slot.ruin`.
- **Contre-jeu** : contre l'IA, raider un seul bâtiment coupe tout le réseau. Contre l'HUM, on ne gagne rien à raser en
  début de partie puisqu'il reconstruit à moitié prix : mieux vaut tenir le centre.
- **Équilibrage** : avec 5 bâtiments éco à 10 min, l'HUM est à ×3,0 de longévité contre ×2,33 pour l'IA (+29 % pour l'HUM).
  Vers 15 min, les deux sont à ×3 et l'IA passe devant avec +24 %. Intégrales sur 0–20 min à peu près égales. Le réglage se fait
  sur le pas du réseau (6 %) et sur `LONGEV_HUM` (600 s). Cela crée un **tempo** : l'HUM doit frapper avant 15 min, l'IA doit tenir.

### M2 — Unités : « Coude à coude » (HUM) / « Verrouillage de cible » (IA)
- **HUM**
  - Toute unité au sol (hors soutien et héros) gagne **+4 % de dégâts par allié au sol à ≤ 50 px**, au plus +12 %.
  - En contrepartie, la texture passe de ×0,82 à **×0,77** pour les dégâts. Avec 2 voisins (le cas courant en colonne), on retombe
    sur ×0,83, soit l'actuel.
- **IA**
  - Les unités à distance (tireur, aérien) **visent l'ennemi à portée le plus entamé** (plus petit `hp/maxhp`) au lieu du plus proche.
  - Elles font **+20 % de dégâts contre une cible sous 50 % de PV** (« exécution »).
  - Le siège IA a une zone d'effet de **57** au lieu de 50 : la contre-mesure aux foules.
  - En contrepartie, la texture IA passe de ×1,22 à **×1,17** pour les dégâts.
- **Code**
  - `08-actions.js` `unitStats` : textures.
  - `10-simulation.js` `updateUnits` :
    - calcul des voisins (boucle sur `side.units`, coût O(n²) borné à 40 unités, acceptable ; sinon tri par x) ;
    - multiplicateur dans `dmgOut` ;
    - ciblage IA dans la boucle `targets`, uniquement parmi les cibles à portée, en gardant la logique `pt==='go'`.
- **Contre-jeu** : la foule humaine est vulnérable au siège IA (zone plus large) et au pouvoir ✸ IA (M7). L'exécution IA est
  contrée par les médics, qui gardent les blessés au-dessus de 50 %, et par les tanks, au pourcentage de PV élevé.
- **Équilibrage** : neutre à densité moyenne ; le banc mesure la densité réelle (voisins moyens). Le ciblage IA ne crée pas de
  DPS, il le concentre, d'où la légère baisse de texture.

### M3 — Soin & réparation : « Brancardiers » (HUM) / « Recyclage » (IA)
- **HUM**
  - Chaque médic a une charge de **Relève** (recharge **40 s**, 30 s au niveau 2 du soutien).
  - Le premier allié à portée de soin qui tomberait à 0 PV (hors héros et drones) est relevé à **25 % de ses PV**.
  - Réparation des bâtiments **−30 %** (`repairCost` avec un facteur de faction).
- **IA**
  - Une unité IA détruite (hors drone et héros) rembourse **12 % de son coût** si elle meurt à portée d'une ruche ou à
    ≤ 500 px de la base IA, **5 %** ailleurs.
  - Nano-réparation (`tryAutoRepair`) à **260 ◈ / 70 💧** au lieu de 380/100, et **6 PV/s** au lieu de 4 pour les bâtiments
    (10 au lieu de 8 pour la base).
- **Code**
  - `10-simulation.js` : boucle des morts (`for i=side.units.length-1…`), traiter la relève avant `splice`. Le remboursement
    passe par `unitCost(side, ROLES.findIndex(...))`.
  - `08-actions.js` : `repairCost` / `tryRepair`, `tryAutoRepair`.
  - `updateBuildings` et `update` : taux de nano-réparation.
- **Contre-jeu** : contre la relève, tuer le médic en premier (cible prioritaire pour l'aérien ou l'exécution IA) ou frapper en
  rafale. Contre le recyclage, se battre loin de la base IA et viser les ruches.
- **Équilibrage** : la relève sauve environ une demi-unité par médic toutes les 40 s, soit ~1,5 à 4,5 ressources/s selon 1 à 3
  médics. Le recyclage rend 12 % d'une perte moyenne d'environ 120 toutes les 10 s, soit ~1,4 à 3 ressources/s. Les ordres de
  grandeur sont comparables ; on règle sur la recharge de la relève.

### M4 — Rythme de combat : « Moral » (HUM) / « Refroidissement & surrégime » (IA)
- **HUM, nouvelle jauge `side.morale` de 0 à 100** (départ 50)
  - Gains : +2 par ennemi tué, +5 par zone ou lac pris, +15 à l'invocation du Che.
  - Pertes : −1,5 par mort alliée, −10 au début d'une grève.
  - Retour vers 50 à 1 point/s.
  - Effets : dégâts ×(1 + 0,10·(moral−50)/50), soit ±10 %.
  - À ≥ 80 (« élan »), la fatigue monte 30 % moins vite. À ≤ 20 (« débandade »), vitesse −10 %.
  - **Anti-boule de neige** : base HUM sous 50 % de PV → plancher de moral à 50 (« on n'a plus rien à perdre »).
- **IA, refroidissement par l'eau**
  - **Refroidissement actif** : si `side.w ≥ 40`, la chaleur IA redescend à **0,050/s** au lieu de 0,030. Chaque unité qui
    refroidit consomme **0,04 💧/s**, soit environ 0,8 💧/s pour 20 unités chaudes (plus que le revenu de base de 0,6/s). Sous
    40 💧, retour à 0,030/s.
  - **Surrégime** : une unité IA à chaleur ≥ 0,75 fait **+12 % de dégâts** jusqu'à la surchauffe.
  - Résultat : l'eau devient pour l'IA un vrai arbitrage entre siège, aérien et soutien d'un côté, cadence de l'armée de l'autre.
    Côté lore, c'est son « eau de refroidissement ».
- **Code**
  - `10-simulation.js` `updateUnits` : ligne de récupération (`u.heat` −…), facteur sur `dmgOut`, compteurs de moral.
  - `08-actions.js` : `tryHero` pour le Che.
  - `updateNodes` / `updateZones` : gains de moral aux captures.
  - `13-hud.js` : jauge ✊ du moral pour l'HUM, icône ❄ « refroidissement actif » à côté du 💧 pour l'IA.
- **Contre-jeu** : tuer vite en début de combat brise le moral humain. Contre l'IA, prendre les lacs et raser ses puits la prive
  d'eau, et elle surchauffe.
- **Équilibrage** : le moral vaut ±10 %, avec un plancher. Le surrégime vaut +12 % sur environ 25 % du temps de combat (≈ +3 %).
  Le refroidissement supprime une bonne part des surchauffes (qui coûtent environ 50 % de DPS pendant 4 s). Le gain IA, de
  l'ordre de +5 à 8 % de DPS soutenu, est payé en 💧. Si l'IA passe devant au banc, **supprimer les +5 % de PV IA** (incohérence
  0.3-2) plutôt que de toucher au reste.

### M5 — Bâtiments & expansion : « Barricades populaires » (HUM) / « Tourelles autonomes » (IA)
- **HUM**
  - Muraille à **68 🌾 / 38 🪙** (−25 %) et **3 places de garnison** sur les murailles (tourelles : 2).
  - **3 chantiers** simultanés au lieu de 2 ; PV d'un chantier 200 au lieu de 140.
- **IA**
  - Tourelle : dégâts **+20 %**, portée **+10 %**.
  - **Liaison** : une tourelle IA à ≤ 300 px d'une autre tourelle IA tire 10 % plus vite.
- **Code**
  - Helpers `buildCost(side,type)` (7 usages de `BUILDS[t].cost` : `tryBuild`, `demolish`, menus `13-hud.js`) et
    `garMax(b, owner)` (8 usages de `GAR_MAX` : `10-simulation`, `08-actions`, `07-decor`, HUD).
  - `updateBuildings` pour la tourelle.
- **Contre-jeu** : les murailles humaines bon marché tombent sous le siège (×1,6 contre bâtiments, déjà existant, et zone IA
  élargie). Les tourelles IA groupées sont une cible pour le pouvoir ✸ HUM (M7) et l'artillerie.
- **Équilibrage** : coût-efficacité défensive équivalente (mur + garnison contre tourelle). À vérifier via « PV de base perdus par
  minute de siège » au banc.

### M6 — Héros : « Ralliement » (Che) / « Assimilation » (Singularité)
L'aura ×3/×2 reste **identique** : c'est le pilier de l'équilibrage v1.12 et il ne faut pas y toucher.
- **Che**
  - À l'invocation, toutes les unités HUM perdent leur fatigue (`tiredT=0`, `heat=0`) et le moral passe à 100.
  - À sa mort, **Martyr** : +20 % de dégâts HUM pendant 20 s, et moral 100.
  - L'aura de soin actuelle est conservée.
- **Singularité**
  - Tant qu'elle vit, la chaleur de toutes les unités IA redescend **×2** (« calcul distribué »).
  - Chaque ennemi tué à ≤ 200 px d'elle fait apparaître un drone (dans la limite de `droneCap`).
  - À sa mort, **Fragmentation** : 5 drones apparaissent à sa position, hors plafond.
- **Code**
  - `08-actions.js` `spawnHero` / `tryHero`.
  - `10-simulation.js` : boucle des morts (détection du héros mort, `side.martyrT`) et `dmgOut`.
- **Contre-jeu** : tuer le Che déclenche une contre-attaque de 20 s, donc mieux vaut le tuer en retraite ou sous ✸. Tuer la
  Singularité au corps à corps laisse 5 drones, donc mieux vaut la tuer à distance.
- **Équilibrage** : ces bonus pèsent moins de 10 % de la valeur du héros. Martyr (+20 % × 20 s) et fragmentation (5 drones à
  34·m PV) sont d'ordre comparable.

### M7 — Pouvoir ✸ : « Soulèvement » (HUM) / « Frappe chirurgicale » (IA)
Formule actuelle : D = 35+22·ère sur toutes les unités ennemies (au plus 65 % des PV max), ×0,5 sur les bâtiments, ×0,4 sur la base.
- **HUM** : **0,7·D** sur toutes les unités ennemies, plus **soin de 20 % des PV max** et fin de fatigue pour toutes les unités HUM.
- **IA** : **2,2·D** sur les **5 unités ennemies les plus précieuses** (héros d'abord, puis `maxhp·dmg`), **0,3·D** sur les
  autres, ×1,2 sur les bâtiments. La base est inchangée.
- Les noms actuels (`specials`) restent ; un sous-titre d'effet est ajouté (`a_spec_hum` / `a_spec_ia`, 9 langues).
- **Code** : `08-actions.js` `trySpecial` (une branche par faction).
- **Contre-jeu** : le ✸ IA est fort contre une armée de quelques unités d'élite et faible contre une foule. Le ✸ HUM est fort en
  combat d'usure et faible contre un rush.
- **Équilibrage** : contre 15 unités, l'actuel inflige 15 D. Le ✸ HUM inflige 10,5 D plus environ 3 unités de soin. Le ✸ IA
  inflige 14 D concentrés (le plafond de 65 % en gaspille une partie). Mesurer l'« armée détruite dans les 10 s qui suivent le ✸ ».
- **Option M7b (lot 3)** : Dernier recours différencié. HUM « Levée en masse » : effet actuel à 80 % et 6 mêlées gratuites. IA
  « Protocole d'urgence » : effet actuel à 80 % et −50 % de dégâts subis pendant 10 s.

### M8 — Territoire : « Occupation » (HUM) / « Extraction » (IA)
- **HUM** : chaque unité HUM compte **×1,5** pour capturer lacs, zones et zone bonus (le plafond ±3 de `capPush` est inchangé).
- **IA** : les zones et lacs tenus rapportent **+40 %** à l'IA (zone : 0,7 ✦/s au lieu de 0,5 ; lac : 💧 ×1,4 ; zone bonus : 2,0 ✦/s).
- **Code** : `10-simulation.js` `updateNodes`, `updateZones`, zone bonus (comptes pondérés avant `capPush`) ; `calcRates`.
- **Contre-jeu** : l'HUM prend vite mais doit tenir. L'IA prend lentement mais chaque zone lui rapporte plus, donc il faut la lui
  reprendre.
- **Équilibrage** : mesurer le « temps de détention moyen par zone » et le « ✦ issu des zones » par faction.

### M9 — Transcendance : deux fins de partie
- **HUM « Communisme à visage humain »** : 🪙 aboli (inchangé), **quota de médics +1**, **plancher de moral 70**.
- **IA « AGI complète »** : ◈ aboli (inchangé), **plus aucune surchauffe** (la chaleur est plafonnée à 0,99 et le surrégime reste actif).
- **Code** : `checkTrans`, `tryBuy` (quota), `updateUnits`. Le texte `transTxt` passe sur 2 lignes (9 langues).
- **Équilibrage** : l'état est rare (13 000 ✦). Vérifier seulement que ni l'une ni l'autre ne gagne plus de 65 % des parties
  qui y arrivent.

### M10 — ENVIRONNEMENT : chaque événement touche les deux camps différemment
Principe : **aucun événement n'est neutre pour une faction, mais la somme sur un cycle l'est.** Les paires sont pensées comme
miroirs thématiques : pluie ↔ signal, grève ↔ mise à jour, canicule ↔ hiver, sable ↔ acide.

| Événement | Humanité | G·P·T | Bilan visé |
|---|---|---|---|
| 🌧 **Pluie fertile** (15 s / 110 s) | revenu 🌾 de base **+40 %**, fermes +20 % | panneaux ⚡ **−20 %**, mais **chaleur ×2 plus vite évacuée** (pas de surchauffe en combat) | HUM : économie · IA : combat. Paire avec le signal |
| 📡 **Signal renforcé** (15 s / 110 s) | ✸ +10 % | ✸ **+50 %**, drones des ruches ×1,5 plus vite, tourelles +10 % de cadence | le « jour de l'IA ». Compense la pluie |
| ✊ **Grève générale** (HUM figés 15 s) | figés comme aujourd'hui (riposte ×0,5) **et production des bâtiments HUM à l'arrêt**, mais **piquet** : −20 % de dégâts subis. À la fin, **Acquis sociaux** : production HUM +20 % pendant 30 s, moral +10 | — | coût net HUM ≈ 15 s d'économie |
| 🔧 **Mise à jour forcée** (IA figées 15 s) | — | figées, **riposte ×0,25** (redémarrage) **mais la production continue**. À la fin, **Correctif** : chaleur remise à 0 et cadence +10 % pendant 30 s | coût net IA ≈ 15 s de combat. Les deux s'équilibrent en ressources équivalentes |
| 🌧 **Pluie d'acide** (13 s) | unités 18/s, **bâtiments 28/s** (bois, tôle) | **unités 22/s** (corrosion), bâtiments 20/s (blindés) | aujourd'hui l'IA perd plus partout ; désormais chacun perd plus sur un plan |
| 🔥 **Canicule** (14 s) | unités 16/s, **fatigue +0,18/s**, vitesse −10 % | unités 16/s (au lieu de 20), chaleur +0,12/s, **datacenters bridés : production IA −30 %** | les humains s'épuisent, les machines ralentissent leur économie |
| 🌪 **Tempête de sable** (11 s) | volants abattus (inchangé), portée longue **−15 %** | volants abattus, portée longue **−30 %** (capteurs), tourelles −30 % | avantage HUM, compensé par l'acide |
| ❄ **Hiver nucléaire** (6 min après la Bombe H) | 🌾 et 🪙 ÷2 → ×1 (comme aujourd'hui), vitesse ×0,82 | **⚡ ÷2,5 → ×1** (panneaux sans soleil), ◈ intact, **vitesse ×0,95, chaleur évacuée ×2** | les humains ont froid, les machines manquent d'énergie |
| 🌊 **Inondation** (rare) | les unités au sol à ≤ 120 px d'une structure HUM (base, mur, tourelle) **grimpent et survivent** | courts-circuits : mortes comme aujourd'hui, mais **30 % du coût remboursé** (assurance / sauvegarde) | rare : solidarité contre logistique |
| ☄ Météorites · ☢ Frappe · Effondrement · Zone bonus | **miroir, sans changement** | idem | le chaos pur reste neutre : c'est un choix assumé |
| 🌍 Usure du monde (`dev`) | unités ×1,2 (faim) | bâtiments ×1,3 (pannes) | optionnel, lot 3 |

- **Code**
  - `10-simulation.js` `update()` : `rainMul`, `sigMul`, `winterMul` deviennent `rainMul(side)`, `sigMul(side)`,
    `winterMul(side)` ; `FROZEN_DMG` → `FROZEN_DMG[fk]` ; arrêt de production via `facFrozen` dans `updateBuildings`.
  - Effets après coup : `side.afterT` / `side.afterK` (« acquis » / « correctif »), posés au changement de `game.weather`.
  - `heroFollow`, `heroAdvance`, `pointStep`, `tryMove` : `game.winter?0.82:1` devient `winterSpd(side)`.
  - `11-cataclysm.js` `applyCataEffects`, `startCata('flood')`, `sand` (`eRange` dans `updateUnits`, `tRange` dans `updateBuildings`).
  - `07-decor.js` `calcRates` : mêmes multiplicateurs, pour que le HUD ne mente pas.
- **Communication**
  - `evExplain` affiche aujourd'hui une seule ligne `evx_<clé>`. La passer en **ligne propre à la faction du joueur** :
    `evx_<clé>_hum` / `evx_<clé>_ia`, avec repli sur `evx_<clé>`. Exemple : « 🌧 Vos panneaux −20 % · vos machines refroidissent ×2 ».
  - Le fil d'actualités (`16-news.js`) peut citer l'effet adverse.

---

## 3. Plan d'équilibrage

### 3.1 Outils
1. **`tools/test-factions.mjs`** (nouveau), sur le modèle de `qa-skirmish.mjs` : boucle gelée, `Math.random` à graine,
   `update(0.05)` sans rendu.
   - **A. Joueur scripté contre IA** : `__competent` (en HUM puis en IA) contre `aiUpdate`, difficultés 1, 2 et 3,
     **40 graines** par case (240 parties).
   - **B. Bot contre bot** : généraliser `__competent(st,o)` en `__competentSide(side, foe, st, o)`. Il utilise aujourd'hui
     `game.p`, des signes fixes (`u.x-p.x<750`, `u.x>front`) et `p.slots`. Remplacer par `side.side`. Les deux camps sont alors
     joués par le même cerveau, ce qui retire l'asymétrie de décision de `09-ai.js` de la mesure.
   - **C. Miroirs de contrôle** : `newGame('HUM',d,false,'HUM')` et `('IA',…,'IA')` (paramètre `eFacOverride` existant). Le
     résultat doit être 50 % ± bruit ; sinon, le biais vient de la carte ou du côté gauche/droit, pas des factions.
   - **D. Ablation** : chaque `FAC_TRAITS.*.on` est basculé seul, ce qui mesure la contribution de chaque mécanique.
   - **E. A/B environnemental** : même graine, un événement forcé à t = 6 min (`startCata(k)`, `game.boon=…`,
     `game.wClock=…`) contre aucun événement. Δ mesuré à t+60 s par faction : valeur d'armée, ressources, PV de base.
     **Somme des Δ sur un cycle complet** (pluie + signal + grève + mise à jour + acide + canicule + sable), comparée entre HUM et IA.
2. Brancher `npm run test:extra` (déjà prévu pour `tools/test-*.mjs`) ; ne pas l'ajouter à `npm test` (trop long), mais le lancer
   avant chaque lot.

### 3.2 Métriques relevées
Taux de victoire, durée médiane, heure de chaque ère, revenu intégré par ressource, valeur d'armée par minute, surchauffes et
fatigues par minute, relèves, ressources recyclées, moral moyen, bonus réseau moyen, ✦ issu des zones, temps de vie du héros,
nombre de ✸, unités perdues pendant grève et mise à jour, Δ des A/B environnementaux.

### 3.3 Cibles
| Banc | Cible | Tolérance |
|---|---|---|
| B bot contre bot HUM/IA, par difficulté de bot | 50 % | **± 6 pts** (n ≥ 100 → erreur type ≈ 5 pts) |
| A joueur scripté contre IA | courbe de `DIFFS` : ~100 / 88 / 48 / 25 % | écart HUM/IA ≤ **8 pts** par difficulté |
| C miroirs | 50 % | ± 6 pts |
| Durée médiane HUM vs IA | identique | ≤ 90 s d'écart, aucune partie au-delà de l'effondrement + 5 min |
| D ablation | aucune mécanique seule ne déplace B de plus de **±10 pts** | sinon, la mécanique est trop forte |
| E environnement | Σ Δ HUM ≈ Σ Δ IA | ≤ 3 % de la valeur d'armée moyenne |
| Tempo M1 | l'HUM mène en revenu à 10 min, l'IA à 18 min | qualitatif, sinon l'identité ne se voit pas |

Rappel historique (commentaires de v1.12) : un seul réglage de héros donnait **88 % en HUM contre 25 % en IA** pour le même
joueur. Le jeu est très sensible ; d'où l'ajout des mécaniques **une par une**, banc à l'appui.

### 3.4 Risques
- **En ligne (hôte autoritaire, `18-net-core.js`)**
  - L'invité ne simule pas, il affiche.
  - Le nouvel état visible doit entrer dans `serSide` : `mo` (moral), `nt` (resynchronisation réseau), `at`/`ak`
    (effet après coup), `mt` (martyr).
  - Le surrégime d'une unité passe par un bit supplémentaire en **fin** du tableau `u2`, pour ne pas décaler les index (comme
    le 15e champ du héros).
  - `serBld` doit enfin envoyer `age` (incohérence 0.3-5) pour que `calcRates` de l'invité soit juste.
  - Les nouveaux champs doivent être bornés à la lecture (`SN(...)`).
  - **Incrémenter `NET_PROTO`** (`20-net-online.js:133`).
  - Aucune commande nouvelle si tout est automatique. Si un interrupteur de refroidissement est ajouté plus tard : nouvelle
    commande ajoutée à la liste blanche d'`applyCmd`.
- **Campagne** : toujours HUM contre une IA G·P·T (`16b-campaign.js:381`). Chaque mécanique change donc l'équilibre des
  missions I–V, déjà jugé fragile (PROGRESS.md).
  - La mission II pilote elle-même `g.weather='patch'` (`16e-camp-m2.js:590, 921`) : la riposte ×0,25 et le « correctif »
    la modifient directement.
  - Recommandation : `game.camp.m.asym` (par défaut `{env:false}` au lot 1), puis rejouer `npm run test:camp` et ajuster `dAdj`
    mission par mission avant d'activer l'environnement en campagne.
- **IA adverse (`09-ai.js`)** : elle doit utiliser les mécaniques, sinon elle les subit.
  - IA en HUM : `formation` toujours active (coude à coude), recrutement de murailles plutôt que de tourelles sur les neutres,
    capture des zones en priorité (occupation), poussée juste après la fin d'une grève (acquis) et pendant une mise à jour adverse.
  - IA en IA : grappe éco protégée (une tourelle près des serveurs), **réserve de 💧 ≥ 60** hors urgence (refroidissement),
    attaque pendant le signal, repli pendant sa propre mise à jour et pendant le sable, ✸ chirurgical déclenché quand le héros
    adverse est en vie.
  - Commun : `game.weather === facFrozen(foe)` → `mode='push'`. Effort estimé : ~60 lignes.
- **Tutoriel (`15-tutorial.js`)** : ne rien changer au déroulé. Une seule étape d'info « ta faction » (2 lignes), selon `game.p.facKey`.
- **Guide (`21b-guide.js`)** : nouvelle rubrique « ☭ / Ω Deux factions, deux styles » (≈ 8 lignes par langue, 9 langues). Mettre
  à jour les chiffres des rubriques Ressources, Héros, Pouvoirs et Événements (le guide cite les chiffres du code : en-tête du fichier).
- **UI**
  - Carte de choix de faction (`#cardHum` / `#cardIA`, `shell.html:466`) : trois puces d'identité sous chaque bouton (« Nombreux
    · Solidaires · Résilients » / « Précis · En réseau · Montée en puissance »), clés `fac_*_tr1..3`.
  - HUD : jauge ✊ du moral (HUM), pourcentage réseau et ❄ (IA).
  - Infobulles d'unité : afficher « coude à coude +x % » et « exécution ».
  - Libellés flottants : `f_relief`, `f_recycle`, `f_overclock`.
- **Performance** : le calcul des voisins (M2) et le ciblage du plus entamé coûtent O(n²) sur 40×40 unités, soit 1 600 tests par
  tick, ce qui est négligeable. Vérifier avec F8 sur téléphone.
- **Lisibilité** : trop de petits bonus deviennent du bruit. D'où le choix de mécaniques **visibles** (jauge, libellé, ligne
  d'explication) plutôt que de pourcentages cachés.

---

## 4. Ordre d'implémentation (petit → grand)

Estimations pour un agent Sonnet qui connaît le code ; « j » = demi-journée de travail effectif environ.

### Lot 0 — Ménage et outillage (prérequis, ~1 j)
| # | Élément | Effort |
|---|---|---|
| 0.1 | Corriger `specialCd` (ou supprimer le commentaire) et le commentaire « électricité plus chère » ; décider explicitement des +5 % PV IA | XS (15 min) |
| 0.2 | `FAC_TRAITS` + `ft(side,k)` dans `04-data.js`, tous les `on:false` | S (1 h) |
| 0.3 | `serBld` envoie `age` | XS |
| 0.4 | `tools/test-factions.mjs` : bancs A, C et E, `__competentSide` pour B | M (½ j) |
| 0.5 | **Mesure de référence** du jeu actuel (A, B, C, E), consignée dans `docs/DECISIONS.md` | S (temps machine) |

### Lot 1 — Asymétries « données » à faible risque (~1,5 j)
| # | Élément | Effort |
|---|---|---|
| 1.1 | **M10 environnement** sans nouvel état : pluie, signal, acide, canicule, sable, hiver (multiplicateurs par faction) + `calcRates` + `evx_*_hum/ia` (9 langues) | M |
| 1.2 | **M8 territoire** (comptes pondérés, rendements) | S |
| 1.3 | **M5 bâtiments** (`buildCost`, `garMax`, tourelle IA) | M (usages HUD) |
| 1.4 | **M1 économie** (longévité HUM, réseau IA, reconstruction, resynchronisation → `nt` en ligne) | M |
| 1.5 | IA : priorités zones, murailles et grappe éco | S |
| 1.6 | Bancs A, B, D, E ; réglages ; **`NET_PROTO` +1** ; campagne avec `asym.env=false` | S |

### Lot 2 — Mécaniques de combat (~2 j)
| # | Élément | Effort |
|---|---|---|
| 2.1 | **M2 unités** (coude à coude, ciblage et exécution IA, zone du siège, textures) | M |
| 2.2 | **M3 soin** (relève, recyclage, réparations) | M |
| 2.3 | **M4 moral et refroidissement** (jauge, consommation 💧, surrégime, HUD, champs réseau `mo`, bit surrégime) | L |
| 2.4 | **Grève et mise à jour enrichies** (piquet, arrêt de production, riposte ×0,25, acquis et correctif → `at/ak`) | M |
| 2.5 | IA : réserve d'eau, fenêtres d'attaque selon les événements | S |
| 2.6 | Bancs complets + `npm run test:camp` ; activer `asym.env` en campagne mission par mission | M |

### Lot 3 — Signature (~1,5 j)
| # | Élément | Effort |
|---|---|---|
| 3.1 | **M7 pouvoirs ✸** différenciés + sous-titres 9 langues | M |
| 3.2 | **M6 héros** (ralliement, martyr, assimilation, fragmentation) | M |
| 3.3 | **M9 transcendance** | S |
| 3.4 | Options : M7b Dernier recours, inondation asymétrique, usure du monde | S–M |
| 3.5 | **Guide** (rubrique factions, chiffres), **cartes de faction** du menu, étape de tutoriel, fil d'actualités | M (surtout traductions) |
| 3.6 | Bancs finaux, `qa-skirmish`, `npm test`, livraison (`.claude/skills/livrer`) | S |

**Total estimé : ~6 jours d'agent**, dont environ 30 % de bancs et de réglages. Chaque lot se livre seul : les interrupteurs de
`FAC_TRAITS` permettent de livrer le lot 1 même si le lot 2 tarde, et de couper une mécanique en production sans retirer de code.

---

## 5. Résumé des leviers de réglage (pour l'orchestrateur)
Si le banc B penche, régler **un seul** levier à la fois, dans cet ordre (du moins visible au plus visible) :
1. +5 % PV IA (0 ↔ 5 %)
2. Pas du réseau IA (4 à 8 %)
3. Longévité HUM (500 à 750 s)
4. Recharge de la relève (30 à 50 s)
5. Consommation de refroidissement (0,03 à 0,06 💧/s)
6. Coude à coude (+3 à +5 % par voisin)
7. Multiplicateurs du ✸ (HUM 0,6 à 0,8 · IA 1,8 à 2,4)

Ne jamais toucher à l'aura du héros ni à `ERA_STAT`/`ERA_COST` pour l'équilibrage entre factions.
