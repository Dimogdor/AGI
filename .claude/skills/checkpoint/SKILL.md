---
name: checkpoint
description: Sauvegarde de l'avancement (avant une longue attente, à chaque étape franchie, et dès qu'une limite d'usage menace) — commits WIP des worktrees, push sur claude/wip-*, mise à jour de docs/PROGRESS.md.
---
1. Pour chaque worktree d'agent en cours (`git worktree list`) : `git checkout -- la-derniere-bataille.html`, puis
   `git add -A . ':!www'` et commit « WIP (sauvegarde) : … » s'il y a des changements.
2. `git push -f origin HEAD:refs/heads/claude/wip-<sujet>` depuis chaque worktree.
3. Mettre à jour `docs/PROGRESS.md` : pour chaque chantier → agent, branche wip, dernier commit, état, prochaine étape.
4. Commiter et pousser `docs/PROGRESS.md` sur la branche de travail.
Après une coupure : relancer l'agent (SendMessage) s'il existe encore ; sinon nouvel agent briefé depuis PROGRESS.md et sa branche wip.
