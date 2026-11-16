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
