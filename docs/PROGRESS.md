# Avancement — v1.17 (mis à jour par l'orchestrateur à chaque étape)

Branche de travail : `claude/age-of-war-online-balance-xn6ump` · v1.17.0 livrée (cd47236, PR #58). Prochaine étape : retours de l'auteur ; Fable en second avis quand disponible.
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
| v1.18 | Audit complet n°2 avec Opus en conseiller (lecture seule) : technique, équilibrage, graphismes et cohérence | reviewer opus ×3 | **fait** (docs/audit/v1.17-audit2/) | plan en attente de validation par l'auteur |
