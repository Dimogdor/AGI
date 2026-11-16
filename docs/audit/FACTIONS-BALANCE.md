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
RESULTATS_FINAUX

## Leviers (`FAC_TRAITS`, `AI_K` dans `04-data.js` ; `--tune=IA.netStep=0.08` pour essayer sans reconstruire)
Aura IA 6 (≈ 7 pts par point), longévité humaine 750 s, réseau IA 7 %/28 %, rendement territoire IA ×1,25, `AI_K` [1,1,0.8,0.75].
