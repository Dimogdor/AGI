# Orchestration — qui fait quoi, avec quel modèle

L'orchestrateur (session principale) planifie, délègue, vérifie et intègre. Les agents exécutent un
périmètre précis et rendent compte. **Une tâche n'est finie que lorsque l'orchestrateur l'a vérifiée.**

## Modèles (identifiants acceptés : opus, sonnet, haiku, fable — fable non utilisé sans essai préalable)

| Agent (`.claude/agents/`) | Modèle | Rôle | Écrit dans |
|---|---|---|---|
| orchestrateur (session) | opus | plan, cohérence, intégration, décisions | tout |
| `explorer` | haiku | recherches, cartographie du code | rien |
| `dev-gameplay` | sonnet | simulation, IA, ordres, héros, réseau | src/ (périmètre du brief) |
| `dev-ui` | sonnet | HUD, menus, briefing, moteur de cinématiques | src/ (périmètre du brief) |
| `dev-audio` | sonnet | sons enregistrés, musique, voix off | src/03*, assets/, tools/ |
| `writer` | opus | scénario, dialogues FR, storyboards | docs/ |
| `qa` | sonnet | tests, régressions, diagnostic | tools/ |
| `reviewer` | opus | audit indépendant, rapport sans modifier | rien |
| `docs` | haiku | mise à jour de la documentation | docs/, README |

Escalade : une tâche confiée à sonnet qui échoue deux fois remonte à opus. Traductions : sonnet.

## Règles de délégation
1. Pas d'agent pour une tâche triviale (quelques commandes) : l'orchestrateur la fait.
2. Brief court : objectif, fichiers concernés, ce qui est exclu, critères de réussite, livrable. On pointe
   les fichiers, on ne les recopie pas.
3. **Lots de 2 à 3 agents maximum en parallèle**, sur des fichiers disjoints, chacun en worktree Git.
4. Les agents lancent les tests ciblés de leur domaine ; la suite complète tourne une fois par lot (qa ou
   orchestrateur), après intégration.
5. Gros changement → passage du `reviewer` avant la livraison.
6. Avant un changement important : plan présenté à l'auteur et validé.

## Sauvegarde (protection contre les limites d'usage et le recyclage du conteneur)
- Chaque agent **commite après chaque sous-étape** (au plus toutes les 30–45 min), message en français.
- L'orchestrateur pousse les worktrees en cours sur `claude/wip-<sujet>` (procédure `checkpoint`) et met
  à jour `docs/PROGRESS.md` à chaque étape franchie et avant toute longue attente.
- Après une coupure : relancer l'agent existant (SendMessage) — il garde son contexte ; si son contexte
  est perdu, repartir de `docs/PROGRESS.md` et de sa branche wip, jamais de zéro.
