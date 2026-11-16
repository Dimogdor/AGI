# Audit de cohérence graphique — v1.16.1 (QA, captures réelles)

Référence de qualité : bases (`baseSprite`/`humBld`/`iaBld`), héros, HUD papier, port de la mission II.
Constat général : tout ce qui est dessiné « en direct » (fillRect/arc, sans `sprite()` ni contour d'encre) détonne.

1. Réparateurs HUM (« petits gus », `12-render.js` ~3584 et ~3772) : boule + rectangle de 12 px → mini-ouvrier baké `sprite('REP'+fac+era)`, 22 px, gilet/casque, outil, 2 poses ; ères 3-4 en combinaison/exo-bras.
2. Drones réparateurs IA : losanges cyan → mini-drone quadri-rotor de la famille des unités, faisceau de soudure.
3. Garnisons (`drawSlot` ~3745, `drawBaseGarrison` ~3512) : même buste humain pour les deux camps → buste par camp et par ère ; emoji 🚪 → pictogramme vectoriel.
4. Bâtiments sur emplacements (`humBld`/`iaBld` ~2631-2820) : trop petits, presque identiques d'une ère à l'autre → silhouette par ère, pancartes comme les bases.
5. Barres de vie de base/bâtiments et étoiles de niveau : style développeur → cartouche papier, chevrons.
6. Unités IA (`drawBotSprite` ~1977) : un châssis pour presque tous les rôles, ère 4 = un robot rose → silhouette par rôle, modules en ères 3-4.
7. Unités HUM ère 4 (`drawHumSprite` ~1764/1870) : casque de centurion à cimier, cape, écu → exo-armures ; boucliers anti-émeute ; cimier réservé au héros. Tank ère 0 bouclier en planches.
8. Nom ≠ dessin : « Mortier » dessiné en bazooka, « Parapente armé » dessiné en hélicoptère (2025), épée lumineuse en ère 3.
9. Aérien IA (`airSprite`) : sous-marin plat → vrai drone par ère.
10. Gremlin IA (`gremlinSprite` ~2355) : à unifier avec les mini-drones.
11. Épaves (`drawWrecks` ~2199) : tas noir → débris lisibles par camp.
12. Obus/projectiles (`14-loop.js` 37-55) : trop petits, peu contrastés.
13. Fanions de point d'eau (`drawNode`) et de ralliement (`drawRally`) : sans contour ; étiquettes en texte brut.
14. Objets de mission (bornes, transformateurs m1 ; prises d'eau m3 ; braseros m4 ; camion et hérisson m5) : plats, sans contour → bakés avec contour d'encre, à l'échelle (modèle : le port de m2).
15. Parallaxe m3/m4 (`16a-biomes.js`) : crêtes en escalier, moiré des hachures → cuisson plus fine.
16. Planches de cinématique : style carnet cohérent ; silhouettes de foule en bâtonnets à enrichir si souhaité.
17. Halos et anneaux des héros/transcendance : plats, priorité faible.

Planches de captures : `tools/audit-visuel-*.mjs` (relancer : `npm run dev` puis `node tools/audit-visuel-<nom>.mjs <dossier>`).
