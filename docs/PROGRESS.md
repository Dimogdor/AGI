# Avancement — v1.16 (mis à jour par l'orchestrateur à chaque étape)

Branche de travail : `claude/age-of-war-online-balance-xn6ump` · PR #56 (brouillon).

| Chantier | Agent | Branche wip | État | Prochaine étape |
|---|---|---|---|---|
| Bases par époque | bases | — | **intégré** (66b032b), tests verts | — |
| Gameplay (grève, ordres, postures, guide) | gameplay | — | **intégré** (7fa6c4f) | surveiller l'équilibre en difficulté 2 (parties longues) |
| Voix off + lisibilité | voix | — | **intégré** (FR généré, 125 répliques, 3,4 Mo) | régénérer après la bible, autres langues au lot 4 |
| Audio (sons libres, musiques) | audio | — | **intégré** (337f61e) : 148 fichiers CC0, 6,5 Mo, 12 thèmes | écoute par l'auteur ; iOS/Electron non vérifiés |
| Moteur de campagne | campagne-socle | — | **intégré** (da629f9) : briefing, difficulté Récit/Lutte/Dernier carré, doctrines, aide « ? », radio, actes, cartes sans lacs, escorte | équilibrage fragile (II, IV, V en Dernier carré) à revoir par les missions |
| Bible (scénario) | writer | — | **intégrée** : docs/campagne/BIBLE.md + M1…M5.md | sert de spec au lot 3 |
| Missions I–V | 1 agent sonnet par mission | worktrees | lot 3a : I, II, III · lot 3b : IV, V | — |
| Traductions, voix, QA, livraison | sonnet / qa / reviewer | — | — | lot 4 |

## Lots
1. **En cours** : bases, gameplay, voix (reprises des agents presque terminés) → intégration.
2. audio + socle de campagne (reprises) + writer (nouveau, opus).
3. missions I–V (sonnet, 2–3 à la fois) d'après la bible.
4. traductions, génération des voix, QA complète, audit, livraison v1.16.
