# Audit des bugs — v1.16.1 (lecture seule, auditeur Opus)

1. **Bloquant — scintillement du héros « Avec la troupe » / « Prudent »** : `src/10-simulation.js:403-406` (`heroFollow`) a une zone morte de 1 px ; quand le front avance de ≤1 px/image, le héros avance une image sur deux et `drawHero` (`12b-hero.js:439`) bascule marche/arrêt à chaque image (239 bascules / 240 images mesurées). Correctif testé : `if (d>1e-3)` au lieu de `d>1` ; filet : mémoire de marche `u._mvT` (0,12 s) dans `drawHero`. Test de régression à ajouter (front de tanks à 60 Hz, < 2 bascules en 4 s).
2. **Important — va-et-vient du héros « Avec la troupe »** (`10-simulation.js:398-406`) : la cible saute devant le front dès qu'un ennemi est à < 220 px, puis recule à reculons quand il meurt ; garder la cible ~1,5 s, ne reculer qu'au-delà de 24 px, retourner le sprite en recul.
3. **Important — entrée en scène rejouée au bord de l'écran** : `_born` fixé au premier dessin (`12-render.js:2407/2439`) → nom, matérialisation et poussière rejoués quand l'unité entre dans le champ. Fixer `_born` à la création (`spawnUnit`/`spawnHero`).
4. **Important — en ligne, la zone bonus n'est pas envoyée à l'invité** (`18-net-core.js:25-40`).
5. Mineur — annonces de l'hôte envoyées déjà traduites (`18-net-core.js:233`) : envoyer clé + variables.
6. Mineur — `resize()` à chaque défilement du viewport efface le canvas (`00-core.js:51/67`) : ne réassigner que si la taille change.
7. Mineur — `M3_RETRY` / `M4_RETRY` persistent toute la session (`16f:651`, `16g:761`).
8. Mineur — son de la Bombe H par `setTimeout` réel (`10-simulation.js:866`) : joue en pause/au menu.
9. Mineur — météores invisibles chez l'invité (`11-cataclysm.js:97`, non sérialisés).
10. Mineur — démarche rejouée en entrant dans le champ (`u._wx` non mis à jour hors champ).

Vérifié sans défaut : volumes et coupures audio, voix off en pause, pas de fuite d'ambiance entre missions, bornes de carte, pas de NaN, ordres de position, gel grève/patch.
Non audité en détail : les 5 missions, le tutoriel, le z-order.
