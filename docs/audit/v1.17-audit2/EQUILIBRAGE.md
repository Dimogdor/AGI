# Audit d'équilibrage v1.17.0 — conseiller (lecture seule)

Sources : 3 650 parties d'escarmouche (graines 200000 et 300000, distinctes des tirages publiés), bancs de campagne aux graines 0, 1, 2
et aux deux doctrines, matrice de conception extraite de `unitStats`. Le jeu a été réassemblé dans le scratchpad (copie identique à
`la-derniere-bataille.html`). Rien n'a été modifié dans le dépôt. Scripts : `runner.mjs`, `ana2.mjs`, `anaB.mjs`, `anaAC.mjs`, `design.mjs`,
`camp/` ; données brutes : `runs/*.jsonl`. Intervalles : IC de Wilson à 95 % ; « Δ » : différence avec IC (erreur type).

## Verdict (5 lignes)
1. **Le banc B actuel est trompeur.** À niveau et placement donnés, les parties sont identiques à l'unité près pendant ~4 min, quelle que soit la graine. Chaque case ne tire donc qu'une seule ouverture : d'où le « biais gauche ~+10 », les écarts qui « changent de signe » et le « −24 » du Soulèvement.
2. **Avec des ouvertures tirées au hasard**, le biais de côté disparaît (51,3 % [45,7 ; 56,9]), mais le déficit humain est réel : **37,5 % [33,7 ; 41,4]**, net aux niveaux 1 et 2. Il se joue tôt : l'Humanité perd sa première base la première dans 62 à 69 % des parties, vers 6 min, et le camp tombé le premier perd environ 90 % du temps.
3. **Ce n'est pas d'abord le bot.** Dans une matrice de trois stratégies, l'équilibre reste à 42 % pour l'Humanité. La stratégie « foule » (l'identité affichée de la Commune) y est même la pire pour elle. Les vrais leviers mesurés sont `env` (+18,5 si on le coupe), dont l'arrêt de production du Couvre-feu (+10,5), et la mécanique `hero` (+16,5). Couper le Soulèvement ne change rien (+1,5).
4. **Escarmouche contre l'IA : la progression n'est pas régulière.** Facile et Normal sont identiques pour un joueur G·P·T (100/100). Le saut Normal → Difficile est une falaise (84→38 et 100→40). En Difficile et Brutal, 50 à 80 % des parties ne finissent pas en 45 min (réparation de base illimitée après la transcendance).
5. **Campagne : seule la mission III a une courbe nette.** II et IV ne séparent pas les niveaux pour le bot. La V dure 24 à 38 min, avec un acte II de 20 à 30 min en Récit. Radio libre y est toujours plus lente que Vétérans. Deux bancs échouent à la graine 1.

## Mesures
| Banc | Mesure | Valeur [IC 95 %] | Lecture |
|---|---|---|---|
| B publié (ouverture unique), n=200/niv. | victoires HUM niv. 1 · 2 · 3 | 31,5 [25,5 ; 38,2] · 50,5 [43,6 ; 57,4] · 45,5 [38,7 ; 52,4] ; moy. 42,5 [38,6 ; 46,5] | confirme « ~42 % », mais ce n'est pas une mesure d'équilibre |
| B publié | HUM à gauche / à droite | niv. 1 : 19 / 44 ; niv. 3 : 59 / 32 | l'effet de placement (±13) vaut l'écart de faction |
| C publié (ouverture unique), plate | gauche gagne HUM/HUM · IA/IA | 72,0 [64,3 ; 78,6] · 65,3 [57,4 ; 72,5] | artefact |
| **BR** (ouvertures tirées), n=200/niv. | victoires HUM niv. 1 · 2 · 3 | **28,0 [22,2 ; 34,6] · 38,5 [32,0 ; 45,4] · 46,0 [39,2 ; 52,9]** ; moy. **37,5 [33,7 ; 41,4]** | significatif aux niveaux 1-2 ; niveau 3 dans le bruit |
| BR | gauche gagne | 48,0 · 50,5 · 52,0 % | le banc devient juste |
| BR | HUM tombe la 1re · chute médiane | 69 · 65 · 62 % · ~370 s | le déficit est précoce |
| BR | HUM gagne quand IA tombe la 1re / quand HUM tombe la 1re | 74–93 % / 8–16 % | la Bombe H n'est pas un retour |
| **CR** miroirs plats tirés, n=150 | gauche gagne HUM/HUM · IA/IA | 53,3 [45,4 ; 61,1] · 49,3 [41,4 ; 57,3] | ±6 respecté |
| DR ablations niv. 2, n=100 (réf. 38,5) | sans power · hero · env · heal · econ | +1,5 [−10 ; +13] · **+16,5 [4,6 ; 28,4]** · **+18,5 [6,7 ; 30,3]** · +0,5 · +1,5 | seuls `env` et `hero` sont significatifs |
| DR | hiver symétrique (correctif de test) | −2,5 [−14 ; +9] | l'hiver n'explique pas `env` |
| TR réglages, n=100 | Couvre-feu sans arrêt de production · riposte 0,5 · les deux · aura IA 4 | **+10,5 [−1,4 ; 22,4]** · +3,5 · +10,5 · +0,5 | l'arrêt de production coûte ~10 points |
| SR stratégies (HUM ligne × IA colonne), n=50 | défaut / foule / tir-air | défaut 44·82·32 ; foule 30·56·16 ; tir-air 56·86·42 | équilibre tir-air contre tir-air : **42 [29 ; 56]** |
| A joueur scripté contre IA, n=50 | Facile · Normal · Difficile · Brutal (joueur HUM / joueur IA) | 100/100 · **84/100 (Δ −16 [−26 ; −6])** · 38/40 · 20/12 | cible 100/88/48/25 ; Normal = Facile pour un joueur G·P·T |
| A | parties non finies à 45 min (HUM / IA) | Normal 7/12 · Difficile **31/39** · Brutal **25/40** | 13 + 23 sans aucune base tombée (Difficile) |
| Campagne M1 (3 graines) | durée Récit · Lutte · Dernier carré | 354–801 · 343–1000 · 333–484 s | aucun ordre ; graine 1 : Lutte 1000 s > 900 → échec |
| M2 | durée, force du cortège | 4:13 partout ; 154/160 · 118–124/130 · 108/120 | le niveau ne change que la marge |
| M3 | durée, base | ~7 · ~9 · ~10 min ; 98 · 95 · 76–81 % | seule courbe propre |
| M4 | base à la fin | 100 · 100 · 97–98 % | aucune séparation |
| M5 (Vétérans / Radio libre) | total, acte II en Récit | 24–32 min / 33–38 min ; acte II 1192–1773 s | Radio toujours plus lente ; graine 1 DC Radio 2300 s + « fin null » → échec |

Ce que je n'ai pas remesuré : le banc E (même défaut d'ouverture ; son Σ est une somme de 7 moyennes de ~26 paires, l'instabilité est attendue). Les ablations `unit`, `bld`, `terrain`, `rhythm` et `herofx` sous ouvertures tirées n'ont pas été relancées non plus, faute de budget (~85 min de calcul consommées).

## Diagnostic
- **Le banc ou l'équilibre ?** Le banc publié mêle trois effets : l'ouverture unique (`tools/test-factions.mjs:34,57`, décisions à la tick 0 sans aléa), le placement et la faction. Une fois l'ouverture tirée, le banc est juste (CR) et le déficit est une propriété du jeu (BR, SR).
- **Le bot ?** Il joue les deux camps de la même façon et n'exploite ni garnison ni réserve d'eau. Mais la meilleure stratégie de l'Humanité contre le bot par défaut (tir/air, 56 %) se paie quand la machine choisit la même : l'équilibre reste à 42 %. Le bot n'explique donc qu'une petite part de l'écart.
- **D'où vient l'écart ?** De la phase I–III, avant 6 min :
  - Le Couvre-feu humain (t ≈ 130 s, puis toutes les 150 s) fige et coupe la production (`strikeProd:0`), avec une riposte à ×0,3.
  - La Mise à jour de la machine fige à ×0,5, sans perte de production.
  - Le piquet (−20 % de dégâts subis) et les acquis (+20 % de production pendant 30 s) ne compensent pas.
- **Ce qui ne pèse pas** :
  - Le Soulèvement (Δ +1,5) : la décision de garder `upHeal` à 0,5 tient, mais pas pour la raison écrite (le « −24 » est un artefact).
  - L'hiver nucléaire.
  - `heal` et `econ`.
- **Conception**
  - Mêlée : sur la fiche, 5 à 9× la valeur d'un tireur (DPS×PV/coût²), mais elle ne frappe ni les volants ni au-delà de son empilement. Sur le terrain, tir/air domine.
  - Pouvoirs : le Soulèvement à l'ère V soigne ~13 000 PV, contre ~1 600 dégâts pour la Frappe. Celle-ci retire 172 PV à un héros qui en a 15 120 : elle n'a aucun contre-jeu réel contre le Che.
  - Héros : ×3 de dégâts pour toute l'armée ; le camp qui le garde en vie fait boule de neige.
  - Transcendance : elle n'est pas rare (77 parties sur 200 pour l'Humanité au niveau 1, presque toutes en Difficile contre l'IA).
- **Mécaniques invisibles** pour le joueur : la texture IA ×1,06/×1,22 (−13 % de DPS) et le coude à coude (+15 %). Elles se compensent dans les chiffres, mais n'apparaissent que dans des infobulles.

## Recommandations
### (A) Avant la prochaine version
1. **Tirer l'ouverture du bot dans B, C et D.**
   - Où : `tools/test-factions.mjs:34,57`.
   - Changement : réutiliser l'aléa de `__runE` (l. 81 : mélange ×0,6–1,4, vague ±2, phase de décision au hasard), aujourd'hui absent de `__runGame`.
   - Effet : C plat 72/65 → 53/49 (mesuré).
   - Vérification : `--only=C --full` doit donner 50 ± 6 à n=150.
2. **Republier les références avec IC.**
   - Où : `docs/audit/FACTIONS-BALANCE.md`.
   - Changement : remplacer ou annoter les tableaux « ±5 par case » et le constat « power ≈ −24 ».
   - Effet : les arbitrages futurs reposent sur des mesures valides.
   - Vérification : BR/DR relancés, n ≥ 200 par niveau.
3. **Couvre-feu : production humaine réduite au lieu d'arrêtée.**
   - Où : `src/04-data.js:178`, `strikeProd`.
   - Changement : 0 → 0,5.
   - Effet attendu : +5 points pour l'Humanité au banc B (mesuré +10,5 [−1,4 ; 22,4] à 1,0).
   - Vérification : BR aux trois niveaux → moyenne ≥ 43 et « HUM tombe la 1re » ≤ 58 %.
4. **Mettre fin aux impasses de fin de partie.**
   - Où : `src/08-actions.js:401-409`.
   - Changement : `tryRepairBase` reçoit une recharge de 20 s, ou rend 500 → 250 PV passé `COLLAPSE_T` (`src/10-simulation.js:893`).
   - Effet : les parties de Difficile et Brutal se décident par la carte et non par le critère « base restante ».
   - Vérification : banc A, moins de 10 % de parties non finies par case.
5. **Ne plus appliquer `AI_KF` en Normal.**
   - Où : `src/10-simulation.js:788`.
   - Changement : conditionner `AI_KF` à `game.diff>=2`, ou mettre HUM 0,78 → 0,95 en Normal.
   - Effet : Normal en G·P·T redescend de 100 % vers ~88 %.
   - Vérification : A `--diffs=1`, écart HUM−IA ≤ 8 à n=100.
6. **Adoucir la falaise Normal → Difficile.**
   - Où : `src/04-data.js:118`.
   - Changement : Difficile `inc` 0,85 → 0,75 et `cheat` 1,05 → 0,95 (ou `AI_K[2]` 0,8 → 0,7, `04-data.js:205`).
   - Effet : Difficile passe de 38–40 % à ~48 %.
   - Vérification : A à n=100 ; viser 100/88/48/25 ± 8 pour chaque camp.
7. **Rendre les bancs de campagne robustes aux graines.**
   - Où : `tools/camp-m1.mjs:31` (borne de 900 s dépassée : 1000 s à la graine 1) et `tools/camp-m5.mjs`.
   - Changement :
     - M1 : élargir la borne.
     - M5 : enquêter sur la « fin null » au choix final après 2300 s (graine 1, Dernier carré, Radio libre). C'est un bug potentiel de la fin, pas seulement de la borne.
   - Vérification : `SEED=1,2` (copie dans `camp/`), tous les bancs verts.

### (B) Gros gain pour peu d'effort
8. **Frappe chirurgicale proportionnelle aux PV du héros.**
   - Où : `src/08-actions.js:195-196`.
   - Changement : contre le héros, `max(1,4·D, 6 % des PV max)` au lieu de 1,4·D (172 PV aujourd'hui sur 15 120).
   - Effet : un vrai contre-jeu au Che, conforme à M7 (« le héros d'abord »).
   - Vérification : DR `power` et BR, durée de vie du héros adverse (`heroT`) −10 %.
9. **Retirer la triche d'économie du bot de M5, ou la rendre fixe.**
   - Où : `tools/camp-m5.mjs:19`.
   - Changement : `p.f += 5+4·D`, `p.m += 1+2·D` donnent +10 à +26 🌾/s, soit une aide qui grandit avec la difficulté et masque la courbe. Passer à une aide constante (5 / 1).
   - Effet : la séparation des niveaux redevient visible.
   - Vérification : base en fin de mission décroissante de Récit à Dernier carré, sur 3 graines.
10. **M5, acte II en Récit (20 à 30 min).**
    - Où : `src/16h-camp-m5.js:558` (une baie reprise se rallume, `bayT=6`) et `:24` (`bay:[26,…]`).
    - Changement : en Récit, une baie éteinte ne se rallume plus ; ou `bayT` 6 → 20.
    - Effet : acte II ≤ 10 min en Récit.
    - Vérification : `camp-m5` aux graines 0-2, acte II < 600 s.
11. **M4 : le Dernier carré neutralise le modèle commun.**
    - Où : `src/16g-camp-m4.js:640`.
    - Changement : `dAdj[2]` remet tout à 1. Passer à `wave:1,1`, `eHp:1,05`, `eDmg:1,05`.
    - Effet : la base de fin passe de 97–100 % à ~80 %.
    - Vérification : `camp-m4`, base décroissante de Récit à Lutte puis Dernier carré, aux 3 graines, et victoire toujours vraie.
12. **M2 : même déroulé à tous les niveaux.**
    - Où : `src/16e-camp-m2.js` (canonnières et barges).
    - Changement : faire porter le niveau par le nombre ou l'intervalle des barges (`campN`, `campGap`), pas seulement par la force du cortège.
    - Effet : en Dernier carré, force finale < 60 % du plafond.
    - Vérification : `camp-m2`, avec la ligne `force x/y` par niveau.
13. **Doctrine Radio libre en M5.**
    - Où : `src/16b-campaign.js:255`.
    - Changement : elle allonge la mission de 7 à 10 min à tous les niveaux pour le bot. Passer `res` 0,9 → 1,0, ou `actCd` 0,65 → 0,55.
    - Effet : elle devient un vrai choix.
    - Vérification : `DOC=1` contre `DOC=0`, écart de durée < 3 min.
14. **Libellé faux de la Radio libre.**
    - Où : `src/16b-campaign.js:277`.
    - Changement : `campPct(2-actCd)` affiche « 35 % » alors que la recharge est 54 % plus rapide (1/0,65). Afficher `1/actCd` ou « recharge −35 % ».
    - Effet : le joueur choisit sa doctrine en connaissant le vrai chiffre.
    - Vérification : briefing de la mission III.
15. **Ajouter la matrice de stratégies au banc.**
    - Où : `--strat` dans `test-factions.mjs` (modèle : `runner.mjs` du scratchpad).
    - Changement : 3 mélanges (défaut, foule, tir/air) sur chaque camp, valeur d'équilibre publiée.
    - Effet : distingue « le bot joue mal » de « la faction est faible ».
    - Vérification : la valeur à l'équilibre doit rester à 50 ± 8.
16. **La « foule » humaine doit être jouable.**
    - Où : `src/04-data.js:169`.
    - Changement : `packMax` 0,15 → 0,20 et `packStep` 0,05 → 0,0667, à ne tester qu'après la recommandation 3.
    - Effet : la stratégie d'identité de la Commune remonte vers 40–50 %.
    - Vérification : SR, ligne « foule », n=50 par case.
17. **Ne pas toucher à l'aura de la Singularité ni à `upHeal`.**
    - Où : `src/04-data.js:183` (`heroAura` IA) et `:172` (`upHeal`).
    - Raison : aura 6 → 4 ne donne que +0,5 ; couper le Soulèvement ne donne que +1,5 (la décision de l'auteur est confortée).
    - Vérification : rien à changer ; relancer DR `hero` à n=200 si l'on veut comprendre les +16,5.

### (C) Plus tard
18. **Mêlée hors norme sur la fiche.**
    - Où : `src/04-data.js:27`, `src/08-actions.js:77-78`.
    - Constat : DPS/coût 121 contre 26 pour le tireur.
    - Changement : soit le coût reflète l'efficacité réelle (empilement, pas d'anti-air), soit `stackMax` (`10-simulation.js:560`) laisse vraiment combattre la foule.
    - Vérification : la matrice SR doit cesser d'être dominée par une seule stratégie.
19. **Bâtiments éco amortis en ~17 s, coût fixe à toutes les ères.**
    - Où : `src/04-data.js:124-126`.
    - Changement : un coût qui suit `costMul(era)` à 50 %.
    - Effet : les socles neutres redeviennent un choix (tour, mur ou éco).
    - Vérification : revenu à 12 min, BR.
20. **Transcendance pas « rare ».**
    - Où : `TRANS_XP`, `src/04-data.js:3`.
    - Constat : atteinte dans 15 à 40 % des parties B et presque toutes les parties Difficile ; l'Humanité y arrive 1,4× plus souvent.
    - Changement : 13 000 → 16 000, ou XP passive coupée après l'ère V.
    - Vérification : moins de 20 % des parties B.
21. **Dégâts d'acide et de canicule non indexés sur l'ère.**
    - Où : `src/11-cataclysm.js`, `applyCataEffects`.
    - Constat : mortels à l'ère I, négligeables à l'ère V.
    - Changement : multiplier par `statMul(era)^0,5`.
    - Vérification : banc E à ouvertures tirées.
22. **Banc E.**
    - Changement : IC par bootstrap sur les paires et n ≥ 60 graines.
    - Effet : l'écart ≤ 3 points n'est mesurable qu'avec n ≈ 200 ; aujourd'hui, le « −5 à −70 » n'est que du bruit.
23. **Bot : déclencher le Soulèvement sur l'état de sa propre armée.**
    - Où : `tools/_bots.js:58-60`.
    - Changement : Soulèvement quand les PV moyens de sa propre armée tombent sous 50 %, Frappe quand le héros adverse vit.
    - Effet : le bot exploite les pouvoirs comme un joueur.
    - Vérification : ✸ par partie et DR `power`.
24. **Rendre lisibles la texture IA (−13 % de DPS) et le coude à coude (+15 %).**
    - Où : HUD et guide.
    - Changement : afficher l'effet net dans l'infobulle d'unité.
    - Effet : des mécaniques aujourd'hui invisibles deviennent compréhensibles.

## Contre-jeu des mécaniques (lecture qualitative)
- **Contre-jeu réel** :
  - réseau IA (raser un bâtiment éco coupe 12 s) ;
  - refroidissement (prendre les lacs) ;
  - relève (tuer le médic) ;
  - Couvre-feu et Mise à jour (l'IA pousse dans la fenêtre).
- **Sans contre-jeu** :
  - Frappe contre le Che (dégâts fixes) ;
  - aura du héros ×3 (on ne peut que tuer le héros, d'où la boule de neige) ;
  - Bombe H (le camp tombé le premier perd environ 90 %).
- **Invisibles** : texture ×1,06/×1,22, coude à coude, exécution IA, recyclage (1 400 à 1 900 ressources par partie, sans repère à l'écran côté adverse).
