# Équilibrage des factions — mesures (banc `tools/test-factions.mjs`)

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
