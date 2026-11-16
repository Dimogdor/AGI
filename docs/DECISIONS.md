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
