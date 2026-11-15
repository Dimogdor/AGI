---
name: livrer
description: Routine de livraison du jeu — PR brouillon, CI verte, fusion, vérification GitHub Pages, build Android. À utiliser à chaque fin de lot validé.
---
1. `npm run dev && npm test && npm run test:camp && npm run test:extra` en local : tout vert.
2. Pousser la branche de travail ; ouvrir (ou mettre à jour) la PR **brouillon** vers `main`.
3. Attendre la CI (workflow « Déployer le jeu sur GitHub Pages ») verte sur le dernier commit ; corriger la cause racine sinon.
4. Sortir la PR du brouillon, **fusion squash** ; noter le commit de fusion.
5. Vérifier que GitHub Pages sert la nouvelle version (numéro de version dans la page).
6. Déclencher `android-release.yml` sur `main` et vérifier qu'il réussit.
7. Mettre à jour `docs/PROGRESS.md` et `docs/ROADMAP.md`.
