# Audit technique v1.17.0 (lecture seule)

Copie assemblée depuis `src/` dans le dossier d'audit, servie en HTTP local ; Playwright (`chromium.launch()`), PC 1280×720 et téléphone 844×390 tactile.
`npm test` lancé une fois : TOUT VERT (241 s), aucun avertissement.

## Bloquant
1. **Crédits : impossible de les fermer au toucher, et l'écran reste bloqué derrière.** Fichiers : `src/shell.html:360` (`#credits`) et `src/16b-campaign.js:153-165` (`campCredits`).
   - Cause : `#credits` est dans `#ui`, qui a `pointer-events:none`. Il n'a ni la classe `.panel` ni `pointer-events:auto`, donc il laisse passer les clics.
   - Reproduction : gagner la mission V, puis CRÉDITS, puis cliquer sur FERMER.
     - PC : le clic tombe sur `#campNextBtn` en dessous. L'écran de fin disparaît mais les crédits restent affichés (`display:flex`) et ne réagissent plus. Seuls Échap et Entrée les ferment.
     - Téléphone : FERMER est hors écran (y = 406 px pour 390 px de haut) et on ne peut pas faire défiler. Il n'y a aucune sortie sans clavier.
   - Correction : ajouter `#credits{pointer-events:auto}` (ou `class="panel"`). Appeler aussi `campCredits(false)` dans `showEnd()` et au retour au menu.

## Important
2. **La typographie française rend muettes la moitié des voix off françaises.**
   - Où : `src/16b-campaign.js:12`. `cT` applique maintenant `frTypo` (espaces insécables), puis `src/16c0-voice.js:52` (`voiceText`) calcule l'empreinte de la réplique sur ce texte.
   - Cause : l'index des voix a été généré avant `frTypo`, avec des espaces ordinaires.
   - Mesure en jeu : sur 127 répliques françaises qui ont une voix (intros et radio des 5 missions), 66 ne trouvent plus leur fichier. Exemples : « Ici, la Fraternelle : notre local… », « Au bout : le dépôt Halvard… ».
   - Ces répliques n'ont pas été réécrites : c'est une régression, pas le mutisme attendu des répliques modifiées.
   - Correction : `voiceText = txt => (typeof txt==='string'? txt : cT(txt)).replace(/ /g,' ')`. Faire la même normalisation dans `tools/voice/extract.mjs` (`add`). Les textes de campagne ne contenaient aucune insécable au départ, donc c'est sans risque.
3. **En ligne : la chaleur des machines n'est pas envoyée à l'invité.**
   - Où : `src/18-net-core.js:38-43`. Le tableau `u2` transmet `tiredT>0`, mais pas `u.heat`.
   - Effet chez un invité qui joue la G·P·T :
     - la jauge de chaleur (`12-render.js`, `drawUnit`, nouveauté v1.17) n'apparaît qu'en surchauffe ;
     - le cartouche « ❄ refroidissement · N machines chaudes » (`13-hud.js` `drawRhythmCartouche`, qui compte `u.heat>0`) ne s'affiche jamais.
   - Correction : ajouter `Math.round(u.heat*10)` en fin de `u2` (avant le champ réservé au héros, ou dans un champ dédié). Le relire dans `addU` (`u.heat = SN(a[k],0,10)/10`).

## Mineur
4. **Traînées d'obus chez l'invité.** `src/12c-detail.js:438-446`.
   - La clé `sx_tx_fac` est réutilisée, et les entrées ne sont purgées qu'au-delà de 60.
   - Effet : une pièce de siège immobile qui vise la même cible reprend les 9 points de fumée de l'obus précédent. Une traînée fantôme apparaît près de l'impact pendant environ 9 images.
   - Correction : si `now - e.at > 250 ms`, vider `e.tr` avant de le réutiliser.
5. **Pas de compte à rebours du couvre-feu ni de la mise à jour chez l'invité.** `src/13-hud.js:452`.
   - `game.wClock` n'est pas sérialisé, donc l'invité n'affiche jamais « · N s ».
   - Correction : envoyer `wc: Math.round(game.wClock)` dans `serialize`, le relire dans `applySnapshot`.
6. **Annonce du héros G·P·T non traduite chez l'invité.** `src/08-actions.js:474`.
   - `'◆ '+nom+' — '+tr('a_hero_ia')` contient des lettres autour de la clé, donc `netTxtKey` renvoie `null`. L'invité lit le texte dans la langue de l'hôte.
   - Correction : `announce(txt, col, {q:'a_hero_ia', pr:'◆ '+heroNameOf('IA',era)+' — '})`.
7. **Le bouton « ? » de l'objectif mord sur le cartouche d'horloge de la frise au téléphone.**
   - `src/16b-campaign.js` (`drawCampHUD`, `helpRect` placé à `x-31`). L'objectif est élargi par `q`, mais le « ? » n'est pas déplacé (capture `m1-tel-fr.png`).
   - Correction : borner la largeur de l'objectif pour laisser la place à la frise, ou placer le « ? » sous l'objectif quand l'écran est compact.
8. **Zone tactile du repli « Facultatif 0/3 ▸ » petite.** Elle fait 17,6 px CSS de haut (`optRect.h = 16*q`). Elle fonctionne : le toucher réel déplie et replie, en français comme en arabe, et le bouton d'action descend bien. Correction : `h: Math.max(16*q, 44/uiK()*…)`, ou rendre toute la moitié basse du cartouche touchable.

## Mesures de performance
Bataille d'ère V chargée (120 unités, couvre-feu actif, machines chaudes), PC et téléphone :
- étiquettes de terrain empilées : environ 0,04 ms par image ;
- cartouche de moral ou de refroidissement : environ 0,02 ms ;
- `frTypo` : environ 18 appels par image, en cache (borné à 6000 entrées) ;
- HUD complet : 5 à 9 ms en rendu logiciel sans GPU (absolu peu significatif) ; les nouveautés sont négligeables devant le rendu du monde.

Vignettage des planches (cinématique d'ouverture de la mission I jouée en entier) :
- un seul calcul par cinématique, la taille de planche est fixe (754×314 sur PC, 769×426 au téléphone) ;
- environ 26 à 31 ms au pire, à la taille de l'écran entier ; le cache tient une seule entrée, donc pas de fuite ;
- grain : un seul motif 128×128.

## Vérifié sans défaut
- `CAMP_OPT` / `campOptState` sont cohérents avec le calcul de `goal2Done` des 5 missions (m1 : stLit/stWater/stDawn ; m2 : m2Obj ; m3 : g1/swept/g3 ; m4 : g1/g2/g3/pEx ; m5 : m5Ok1-3/hallsAt).
- Écran de fin en carnet :
  - les 10 cas (5 missions × victoire/défaite) s'affichent avec leur planche, sans exception ;
  - en revenant à l'escarmouche, on retrouve le communiqué, la taille 1040 de l'illustration et la classe `camp` retirée ;
  - textes passés par `escH`.
- Briefing, crédits, objectifs : aucun `innerHTML` avec une donnée extérieure. Noms des salons en ligne en `textContent`. Le guide en `innerHTML` ne contient que des textes statiques.
- Aucun secret suivi par git : les mots de passe de signature viennent des variables de la CI.
- `frTypo` : cache borné. La table inverse de `netTxtKey` est construite sur les mêmes chaînes, donc annonces et flotteurs restent traduits chez l'invité. La détection du bandeau d'événement (`evBanner`) compare deux `tr()`, cohérent.
- Écouteurs : les crédits recréent leur bouton à chaque ouverture, donc pas d'empilement d'écouteurs. Un seul écouteur clavier global, en capture.
- Morale envoyée à l'invité (`mo`) ; cadenas et clé du couvre-feu lisent `game.weather`, qui est envoyé.
- Cinématique de l'ouverture M1 jouée jusqu'au bout (PC et téléphone) sans exception ; bouton « passer » décalé de `FS_W`.
- Suite `npm test` complète : verte.

Non couvert, faute de temps : bancs `test:camp` et `test:extra`, tutoriel joué au toucher, rotation du téléphone en direct.
