---
name: mission
description: Comment construire ou refaire une mission de campagne (fichier src/16d…16h, lieu, règle, cinématiques, banc d'essai).
---
1. Lire `src/README.md` (section Campagne) et la bible `docs/campagne/` pour la mission visée.
2. Une mission = un fichier `src/16x-camp-mN.js` : textes (9 langues), lieu (biome), carte, règle propre,
   actes (règles explicites conservé / remis à zéro), cinématiques (planches lisibles, rien qui dépasse),
   radio, thème musical (ids du contrat audio).
3. Vérifier chaque planche par capture d'écran, à 1280×720 et 844×390.
4. Banc d'essai `tools/camp-mN.mjs` : joueur scripté gagne, joueur passif perd, à chaque difficulté et
   avec chaque doctrine (`DOC=1`).
5. `npm test` (section CAMPAGNE + contrôle des 9 langues) vert.
