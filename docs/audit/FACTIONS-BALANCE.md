# Équilibrage des factions — mesures (banc `tools/test-factions.mjs`)

> **v1.18 : les tableaux ci-dessous (lots 0 à 3 et audit v1.17) datent d'AVANT la correction des bancs et sont conservés pour l'historique.**
> Jusqu'à la v1.17, bot contre bot jouait la même ouverture à chaque graine : chaque case ne tirait qu'une trajectoire, d'où les « ±5 par case »
> trompeurs, le « biais gauche ~+10 », les écarts qui changeaient de signe et le « −24 » du Soulèvement (**un artefact** : mesuré avec ouvertures
> tirées, couper le Soulèvement donne +1,5 [−10 ; +13]). Les mesures valides sont en tête de la section « v1.18 » en bas de ce document.

Méthode : boucle gelée, graines fixes, 4 pages en parallèle. A = joueur scripté contre l'IA (40 graines/case) ; B = bot contre bot
(`__competentSide`, niveaux de bot 1-3, HUM à gauche et à droite) ; C = miroirs (HUM/HUM, IA/IA, relief puis carte plate) ;
D = ablation (une mécanique coupée via `game.asym`) ; E = événement forcé à graine variée, Δ de valeur à +60 s.
Bruit : ±4-5 points par case (n ≈ 120-160). Une partie non terminée à 45 min est jugée sur la base restante.

## Référence (jeu avant le lot 0, version a0b5a5e)
| Banc | Humanité | G·P·T |
|---|---|---|
| A joueur / IA Facile · Normal · Difficile · Brutal | 100 · 100 · 52 · 5 % | 92 · 67 · 10 · 2 % |
| B bot contre bot, niveaux 1 · 2 · 3 (victoires HUM) | 71 · 80 · 83 % | 29 · 20 · 17 % |
| C miroir HUM/HUM, gauche : relief · plate | 74 · 55 % | IA/IA : 45 · 56 % |
| E Σ du cycle (valeur, 1 trajectoire) | −87 % | −39 % |

Cause du déséquilibre : l'aura de soin du Che (l'IA n'avait rien d'équivalent) ; mettre l'IA en copie exacte de l'Humanité ramenait B à 53 %.
Le relief de la carte n'est pas symétrique (biais gauche/droite instable, il change de signe dès qu'une mécanique change) : C « carte plate » est le vrai contrôle ; elle montre encore ~+5 pts pour le camp de gauche (ordre de mise à jour p puis e).

## Après les lots 0-1
| Banc | Humanité | G·P·T | Cible |
|---|---|---|---|
| A joueur / IA Facile · Normal · Difficile · Brutal | 97,5 · 87,5 · 60 · 12,5 % | 95 · 87,5 · 35 · 17,5 % | écart ≤ 8 : respecté sauf Difficile (25 ; autres tirages 50/43 et 50/53) |
| B bot contre bot, niveaux 1 · 2 · 3 (victoires HUM, n=160) | 48,8 · 41,3 · 50,6 % | | 50 ± 6 : niveaux 1 et 3 ; niveau 2 à −9 (autres tirages 53, 49, 57) |
| C miroir carte plate, gauche | HUM/HUM 48,8 % | IA/IA 47,5 % | 50 ± 6 : respecté |
| C miroir avec relief, gauche | 25 % | 39 % | informatif : le biais du relief change de signe selon les mécaniques |
| D ablation (HUM %, n=180, tout activé 48,9) | sans fatigue +3,9 · sans env −2,8 · sans terrain −2,8 · sans bld +8,9 · sans econ 0 | | ≤ 10 : respecté ; sans `hero` +30 (correction de calibration, hors cible) |
| E Σ du cycle (≈ 33 paires par événement) | +8,8 % | −29 % | ≤ 3 pts : NON atteint ; acide et canicule coûtent plus à la machine, inondation et sable profitent à l'Humanité. Un tirage à n=100 (réglages précédents) donnait 1 pt d'écart : mesure très bruitée |

Tempo M1 (revenu intégré) : à 10 min HUM 31,4 / IA 31,0 ; à 18 min HUM 35,5 / IA 39,1 — l'Humanité mène tôt, la machine tard.
Restant : resserrer E (acide et canicule côté machine), seconde passe sur A Difficile, puis lots 2-3.

## Leviers (`FAC_TRAITS`, `AI_K` dans `04-data.js` ; `--tune=IA.netStep=0.08` pour essayer sans reconstruire)
Aura IA 6 (≈ 7 pts par point), longévité humaine 750 s, réseau IA 7 %/28 %, rendement territoire IA ×1,25, `AI_K` [1,1,0.8,0.75].

## Après les lots 2-3 (état final de cette passe)
Mécaniques ajoutées, chacune derrière son interrupteur `ASYM` : `unit` (M2 coude à coude / verrouillage de cible), `heal` (M3 relève / recyclage),
`rhythm` (M4 moral / refroidissement à l'eau, surrégime), `power` (M7 Soulèvement / Frappe chirurgicale), `herofx` (M6 ralliement-martyr /
assimilation-fragmentation), `trans` (M9). Couvre-feu et mise à jour forcée enrichis (moral −10 au couvre-feu, +10 aux acquis sociaux, riposte ×0,3 / ×0,5).
`NET_PROTO` = 5 (champs `mo` et `mt` dans `serSide`) ; `tools/test-net-parity.mjs` et `tools/test-asym-lots23.mjs` verts.
Réglages retenus (`FAC_TRAITS`, `AI_KF`) : cf. `04-data.js`. Aura de la Singularité recalée à 6·ère/s (7 avant).

| Banc (n ≈ 120 par case, graine 100) | Humanité | G·P·T | Cible / verdict |
|---|---|---|---|
| A joueur / IA Facile · Normal · Difficile · Brutal | 100 · 83,3 · 26,7 · 33,3 % | 90 · 90 · 56,7 · 20 % | Difficile : écart 30 sur ce tirage (n=30, ±9 par case) ; autres tirages : 50/56,7 (écart 6,7, graine 7), 45/40 (graine 2, n=40) |
| B bot contre bot, niveaux 1 · 2 · 3 (victoires HUM) | 39,2 · 46,7 · 40,8 % | | 50 ± 6 : niveau 2 respecté ; niveaux 1 et 3 à −11 et −9 (autres tirages : 38/45/55 et 22/48/40) |
| C miroir carte plate, gauche | HUM/HUM 61,7 % | IA/IA 60,0 % | biais gauche ~+10 (n=60) ; le relief donne 56,7 / 65 |
| D ablation (HUM %, n=84, tout activé 44,0) | sans env +15,5 · terrain −10,7 · bld −10,7 · econ −19 · unit −14,3 · heal −22,6 · rhythm −3,6 · power −23,8 · herofx +4,8 · trans +3,6 · hero +31 | | ≤ 10 : respecté seulement par rhythm, herofx et trans. Mais le bruit d'une ablation (n=84, ±5,4 par case, et la référence elle-même) rend ces écarts peu fiables : une première passe (graine 40, n=96) donnait unit −4,2, heal −5,2, rhythm +1, herofx −1, trans −2, econ −4,2, power −24. Seul `power` est stable (≈ −24 : le Soulèvement profite à l'Humanité) |
| E Σ du cycle (≈ 26 paires par événement, graine 100) | −3,9 % | −0,4 % | écart 3,5 pts (≤ 3 : presque). D'autres graines donnent entre −5 et −70 pts : mesure instable, un seul tirage ne permet pas de conclure |

Constats :
- Bots niveau 1 et 3 : l'Humanité plafonne vers 40 %. Pistes non tranchées (tout réglage essayé reste dans le bruit) : `IA.hpMul` à 1, `HUM.packStep`, Soulèvement.
- Bench E : le couvre-feu coûte peu à l'Humanité alors que la mise à jour coûte beaucoup à la machine ; le bilan par graine bascule du signe. Acide et canicule recalés (19/28 contre 15/18 ; 16 contre 12), sable 15 % contre 30 %.
- Bench A : `AI_KF` {HUM 0,78 ; IA 1,06} règle Difficile (2e passe) ; Brutal garde un écart de 13 à 17 pts (la machine joueuse perd davantage).
- Campagne et tutoriel : aucune de ces mécaniques ne s'applique sans `asym` dans la mission ; `npm test`, `npm run test:camp` et `npm run test:extra` verts.

## Audit final v1.17 — réglage du Soulèvement (`HUM.upHeal`)
Banc B seul, graine 50, n=48 par niveau (victoires HUM, niveaux 1 · 2 · 3, moyenne) :

| `upHeal` | niveau 1 | niveau 2 | niveau 3 | moyenne |
|---|---|---|---|---|
| 0,5 (actuel) | 32,8 | 51,6 | 41,7 | 42,0 |
| 0,4 | 26,0 | 41,7 | 44,8 | 37,5 |
| 0,35 | 27,6 | 22,4 | 33,9 | 28,0 |
| 0,3 | 25,5 | 31,8 | 25,0 | 27,4 |

Décision : **0,5 conservé**. L'Humanité est déjà sous 50 % au banc B ; baisser le soin l'en éloigne (≈ −5 pts par −0,1), et la Frappe chirurgicale n'a de contrepartie que par la fatigue et les dégâts (`upDmg`). Le constat « le Soulèvement domine » ne se confirme pas bot contre bot ; si l'on veut quand même plafonner le soin en valeur absolue, mieux vaut le limiter aux unités proches du front que baisser le pourcentage. Banc D (`power`) non relancé : A inchangé puisque la valeur n'a pas bougé.


## v1.18 — bancs corrigés (ouverture tirée) et réglages de l'audit n°2
Méthode : `test-factions.mjs` tire désormais, pour chaque partie bot contre bot (B, C, D), le mélange d'unités (×0,6–1,4), la taille de vague (±2) et la
phase de décision de chaque camp, comme le banc E. Intervalles : Wilson à 95 %, affichés par le banc. B : 300 parties par niveau (n=75 par placement) ;
C : 150 par case ; A : 50 par case (100 pour Facile/Normal). Parties non terminées à 45 min jugées sur la base restante.

### Avant / après (mêmes bancs, ouvertures tirées)
| Banc | Avant les réglages v1.18 | Après |
|---|---|---|
| B niveau 1 · 2 · 3 (victoires HUM) | 32,0 [27,0 ; 37,5] · 44,3 [38,8 ; 50,0] · 40,0 [34,6 ; 45,6] ; moy. 38,8 | 36,3 [31,1 ; 41,9] · 44,0 [38,5 ; 49,7] · 48,0 [42,4 ; 53,6] ; **moy. 42,8** |
| B, parties non terminées | 36 · 39 · 34 sur 300 | 0 · 0 · 0 |
| C miroir carte plate, gauche HUM/HUM · IA/IA | 44,0 [36,3 ; 52,0] · 50,7 [42,7 ; 58,6] | 54,0 [46,0 ; 61,8] · 52,0 [44,1 ; 59,8] (50 ± 6 : respecté) |
| C miroir avec relief | 43,3 [35,7 ; 51,3] · 52,0 [44,1 ; 59,8] | 54,7 [46,7 ; 62,4] · 50,0 [42,1 ; 57,9] |
| A Facile (joueur HUM / joueur IA) | 100 [92,9 ; 100] / 98 [89,5 ; 99,6] | 100 [96,3 ; 100] / 99 [94,6 ; 99,8] (écart 1) |
| A Normal | 94 [83,8 ; 97,9] / 90 [78,6 ; 95,7] | 84 [75,6 ; 89,9] / 76 [66,8 ; 83,3] (écart 8 : cible ≤ 8 atteinte) |
| A Difficile | 46 [33,0 ; 59,6] / 52 [38,5 ; 65,2] | 56 [42,3 ; 68,8] / 52 [38,5 ; 65,2] (écart 4) |
| A Brutal | 10 [4,3 ; 21,4] / 18 [9,8 ; 30,8] | 24 [14,3 ; 37,4] / 14 [7,0 ; 26,2] (écart 10) |
| A parties non finies à 45 min (sur 100, HUM+IA) | Normal 26 · Difficile 67 · Brutal 70 | Normal 6 · Difficile 13 · Brutal 22 |

La progression Facile > Normal > Difficile > Brutal est régulière pour les deux camps (HUM 100 · 84 · 56 · 24, IA 99 · 76 · 52 · 14).

### Réglages appliqués (un commit chacun)
- **A3 Couvre-feu** : `env.strikeProd` 0 → 0,5 (textes alignés en 9 langues : `evx_strike_*` avec `{prod}`, guide, bandeau).
  Isolé au banc B : 0,5 donne 42,8 de moyenne ; 0,75 donnerait 44,7 (36,3 → 38,3 · 44,0 → 40,7 · 48,0 → 55,0), écart dans le bruit : 0,5 conservé.
- **A4 Impasses** : `tryRepairBase` recharge de 20 s ; après l'effondrement du monde 250 PV toutes les 30 s (la recharge seule laissait
  encore 59 % de parties non finies en Difficile : la réparation de l'IA annulait l'effondrement).
- **A5/A6** : `AI_KF` plein seulement dès Difficile ; Facile/Normal reçoivent `AI_KF_LOW` {HUM 0,62, IA 1} (sans lui, la machine joueuse
  gagnait 43 % de ses parties de Normal à 0,85, 58 % à 0,78, 69 % à 0,7 contre 84 % pour l'Humanité). Difficile `inc` 0,75, `cheat` 0,95.
- **B8 Frappe chirurgicale** : au moins 6 % des PV max contre le héros (`IA.strikeHeroPct`). Coût mesuré au banc B : environ −2 points pour l'Humanité (45,1 → 42,8, dans le bruit).
- **B13/B14 Radio libre** : `res` retiré (équivalent à 1,0, sinon une ligne « réserves standard » apparaîtrait) ; le libellé affiche « 54 % plus vite » (1/0,65) au lieu du faux « 35 % ».
- **B10 M5**, **B12 M2**, **B11 M4**, **B9/A7** : voir le rapport de lot ; M4 : le Dernier carré à vagues ×1,1 / PV et dégâts ×1,05 fait perdre le joueur scripté à
  2 graines sur 6 (résultat binaire), valeurs 1 conservées.

### Hors cible
- B : moyenne 42,8 [≈ 39,6 ; 46,0] contre ≥ 45 visé ; niveau 1 à 36 (50 ± 8 non atteint), niveaux 2 et 3 dans la cible.
- **B16 (coude à coude +20 %)** : testé (`HUM.packMax` 0,20, `packStep` 0,0667) : 35,3 · 45,3 · 50,0, moyenne 43,5 contre 42,8 : gain dans le bruit, **non appliqué**.
- A Brutal : 22 parties sur 100 encore non finies, écart HUM/IA 10.
- `docs/DECISIONS.md` respecté : le Soulèvement garde 50 % de soin, l'aura de la Singularité ne change pas.
