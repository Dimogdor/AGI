# Avancement — v1.16 (mis à jour par l'orchestrateur à chaque étape)

Branche de travail : `claude/age-of-war-online-balance-xn6ump` · PR #56 (brouillon).

| Chantier | Agent | Branche wip | État | Prochaine étape |
|---|---|---|---|---|
| Bases par époque | bases | — | **intégré** (66b032b), tests verts | — |
| Gameplay (grève, ordres, postures, guide) | gameplay | — | **intégré** (7fa6c4f) | surveiller l'équilibre en difficulté 2 (parties longues) |
| Voix off + lisibilité | voix | — | **intégré** (FR généré, 125 répliques, 3,4 Mo) | régénérer après la bible, autres langues au lot 4 |
| Audio (sons libres, musiques) | audio | claude/wip-audio | tri des enregistrements de pluie | lot 2 |
| Moteur de campagne | campagne-socle (opus, reprise) | claude/wip-campagne-socle | en cours | intégrer |
| Bible (scénario) | writer | — | **intégrée** : docs/campagne/BIBLE.md + M1…M5.md | sert de spec au lot 3 |
| Missions I–V | dev (sonnet) | — | attend bible + socle | lot 3 |
| Traductions, voix, QA, livraison | sonnet / qa / reviewer | — | — | lot 4 |

## Lots
1. **En cours** : bases, gameplay, voix (reprises des agents presque terminés) → intégration.
2. audio + socle de campagne (reprises) + writer (nouveau, opus).
3. missions I–V (sonnet, 2–3 à la fois) d'après la bible.
4. traductions, génération des voix, QA complète, audit, livraison v1.16.
