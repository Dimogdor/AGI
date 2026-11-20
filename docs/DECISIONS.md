# Journal des décisions

- **2026-11 · Organisation multi-agents** : orchestrateur opus, développement/QA/traductions sur sonnet,
  exploration et docs sur haiku, écriture et audit sur opus ; lots de 2–3 agents ; sauvegardes poussées
  sur `claude/wip-*`. Raison : six agents opus en parallèle ont épuisé la limite d'usage.
- **2026-11 · Ressources audio** : fichiers enregistrés dans `assets/` (copiés dans `www/assets/` au build),
  licences CC0 de préférence, CC-BY avec crédits, jamais NC/ND ; repli procédural si absents (file://).
- **2026-11 · Voix off** : synthèse neuronale générée hors ligne (licence permettant l'usage commercial),
  fichiers indexés par empreinte (langue + locuteur + texte) pour une régénération incrémentale.
- **2026-11 · Campagne** : chaque mission autonome dans son fichier `src/16d…16h` ; actes avec règles
  explicites de ce qui est conservé / remis à zéro ; pas de lacs d'escarmouche hors mission qui les prévoit.
- **2026-11 · Audio et voix gelés** : consigne de l'auteur — ne plus retoucher les sons ni les voix avant la
  version « finale finale » ; il demandera lui-même une refonte complète (voix procédurale, accent correct
  par langue). Les audits peuvent signaler des bugs de logique audio, pas de qualité sonore.
- **2026-11 · Fable en conseiller** : la vérification finale de v1.17 est confiée à un agent Fable en lecture
  seule (il conseille, ne code rien).
- **2026-11 · Arbitrages v1.17 (auteur)** : ère IV humaine « LES CELLULES », ère IV de la machine « NOUS » ; graphie
  « G·P·T » partout à l'écran ; ton conservé (Che, bombe H) mais noms d'unités moins « police » (plus
  résistants / civils), unités renommables selon les ères ; événement « Grève générale » de l'escarmouche
  renommé « Couvre-feu » ; mission II : quarante mille grévistes ; les répliques réécrites restent MUETTES
  jusqu'à la refonte audio finale (aucune régénération de voix, test-voice en avertissement).
- **2026-11 · Asymétrie des factions, lots 0-1 (autorisés par l'auteur)** : un interrupteur par mécanique (`ASYM`, `asymOn`, constantes dans
  `FAC_TRAITS`) ; en campagne et au tutoriel rien ne s'applique sauf `asym:{…}` dans la mission. `specialCd` : on garde −5 % pour les deux
  camps (le « −10 % HUM » du commentaire n'a jamais existé). +5 % PV de la machine conservés (commentaire corrigé : pas de surcoût
  d'électricité). Fatigue humaine : récupération 0,05 → 0,04/s pour qu'elle se déclenche. **Constat du banc** : bot contre bot, l'Humanité
  gagnait ~80 % à cause de l'aura de soin du Che (la Singularité n'avait aucun équivalent) ; la Singularité reçoit une aura de réparation de
  7·ère/s — correction de calibration, à revoir avec M6. Difficulté d'escarmouche recalée par `AI_K`.
- **2026-11 · Asymétrie des factions, lots 2-3** : mécaniques M2, M3, M4, M6, M7, M9 livrées, un interrupteur chacune (`unit`, `heal`, `rhythm`,
  `power`, `herofx`, `trans`) ; `NET_PROTO` 5. Les bancs sont très bruités (±5 par case, trajectoires chaotiques) : seul `power` ressort de façon stable
  (le Soulèvement profite à l'Humanité). Aura de la Singularité 7 → 6. `AI_KF` (recalage par camp de l'IA adverse) pour la difficulté ; non appliqué au banc bot.
  Reste ouvert : niveaux de bot 1 et 3 de B à ~40 %, bench E instable d'une graine à l'autre. Détails : `docs/audit/FACTIONS-BALANCE.md`.
- **2026-11 · Conseiller final v1.17 (auteur)** : Fable bloqué par la limite de dépense mensuelle → même brief confié à opus (lecture seule) ;
  Fable sera relancé en second avis s'il redevient disponible avant la livraison.
- **2026-11 · Arbitrages après l'audit n°2 (auteur)** : plan complet validé (4 lots → v1.18). Le Che reste le héros humain
  PARTOUT (campagne comprise). Intro de l'escarmouche refaite en planches à l'encre (planches de campagne existantes), textes
  alignés sur la bible. Devise d'ère V « TOUT EST À NOUS » (au lieu de « COMMUNISME À VISAGE HUMAIN »), ☭ conservé. Unités
  renommées selon leur dessin : Porte-panneau, Bouclier de mine, Mineur de choc, Canon solaire, Bot vigile, Bot de maintenance,
  Drone de cellule (9 langues).
