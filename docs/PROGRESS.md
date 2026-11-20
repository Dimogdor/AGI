# Avancement — v1.19 (mis à jour par l'orchestrateur à chaque étape)

Branche de travail : `claude/age-of-war-online-balance-xn6ump` · v1.19.0 livrée (d50d6b3, PR #60). Prochaine étape : choix de l'auteur pour des voix plus naturelles (test d'écoute proposé) ; restes dans ROADMAP.
Audits : `docs/audit/` (BUGS, VISUEL, LORE-CHRONO, FACTIONS). Arbitrages de l'auteur : `docs/DECISIONS.md`.
**Audio et voix gelés** jusqu'à la version finale.

| Lot | Chantier | Agent | État | Prochaine étape |
|---|---|---|---|---|
| 1 | Bugs (héros, en ligne, missions, tutoriel) | dev-gameplay | **intégré** | — |
| 1 | Chronologie 2028 + saisons, ères, G·P·T, noms d'unités civils, Couvre-feu | opus | **intégré** (af158b2) | — |
| 2 | Graphismes : unités ; réparateurs, garnisons, bâtiments, jauges, épaves, obus, objets de mission, parallaxe | dev-ui ×2 | **intégré** (84b011a), CI verte | restes mineurs pour Fable |
| 3 | Asymétrie des factions, lots 0-1 (bancs, environnement, territoire, bâtiments, économie) | dev-gameplay | **intégré** (20a8f8e), CI verte | — |
| 4 | Asymétrie, lots 2-3 (traits d'unités, soins, moral/refroidissement, pouvoirs, héros, transcendance, AI_KF) | dev-gameplay | **intégré** (5f84fc3) ; bancs B/E encore bruités (voir FACTIONS-BALANCE.md) | — |
| fin | Audit indépendant (12 constats) → corrigés, version 1.17.0 | dev-gameplay | **intégré** | Soulèvement gardé à 50 % (mesures) |
| fin | Conseiller (opus ; Fable indisponible) : unités/héros, planches, campagne (carnet de fin, briefing), HUD/textes | dev-ui ×4 | **intégré** | Fable en second avis plus tard |
| fin | Livraison v1.17 | orchestrateur | **livrée** (cd47236) : Pages 1.17.0, AAB Android signé | — |
| v1.18 | Audit complet n°2 avec Opus en conseiller (lecture seule) : technique, équilibrage, graphismes et cohérence | reviewer opus ×3 | **fait** (docs/audit/v1.17-audit2/) | — |
| v1.18 | Lots 1 (bugs), 2 (équilibrage), 3a (interface, textes, arabe), 3b (intro en planches), 4 (graphismes) | dev-gameplay, dev-ui ×3 | **intégrés**, version 1.18.0 | — |
| v1.18 | Livraison v1.18 | orchestrateur | **livrée** (d5ee505, PR #59) : Pages 1.18.0, AAB Android signé | restes dans ROADMAP « À venir » ; Fable en second avis |
| v1.19 | Restes de l'audit n°2 — interface : noms et aviation de l'ère III, jean de l'ère I, briefing M4/M5 | dev-ui | **intégré** | briefing téléphone : défile encore |
| v1.19 | Restes de l'audit n°2 — équilibrage : banc B, impasses en Brutal, M5 (acte II, Dernier carré), M2 (cortège) | dev-gameplay | **intégré**, version 1.19.0 | — |
| v1.19 | Livraison v1.19 | orchestrateur | **livrée** (d50d6b3, PR #60) : Pages 1.19.0, AAB Android signé | voix : piste à choisir par l'auteur |
