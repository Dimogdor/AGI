# AGI — La Dernière Bataille de l'Humanité

Jeu de stratégie 2D « à la Age of War » : JavaScript pur + canvas, aucun moteur. Web (GitHub Pages),
Android (Capacitor), PC (Electron). Langue de travail : **français**.

## Construire / tester
- On édite **uniquement `src/`** (carte des modules : `src/README.md`). `npm run dev` régénère
  `la-derniere-bataille.html` ; `npm run build` produit `www/` (ne jamais éditer ces deux sorties à la main).
- Tests : `npm test` (suite complète, ~4 min), `npm run test:camp` (bancs de campagne),
  `npm run test:extra` (tests ciblés `tools/test-*.mjs`). Playwright : `import { chromium } from 'playwright-core'`.
- Tout texte visible existe en 9 langues : fr, en, es, de, it, pt, ru, zh, ar.

## Règles permanentes
- Jamais de secrets dans git (android-signing/, keystores, local.properties, KEYSTORE-SECRETS.txt) ; l'alias
  de keystore `agi-guerre-des-eres` ne change pas ; ne jamais afficher de secret ; ne pas écrire dans la base
  Firebase de production pendant les tests ; l'e-mail de l'auteur reste privé.
- Aucune opération destructive ou irréversible sans accord explicite.
- Livraison systématique : voir `.claude/skills/livrer` (PR brouillon → CI verte → fusion → Pages → Android).

## Organisation (orchestrateur + agents)
- Règles de délégation, choix des modèles, sauvegardes : **`docs/ORCHESTRATION.md`**.
- Avancement courant (à lire en premier après une coupure) : **`docs/PROGRESS.md`**.
- Feuille de route : `docs/ROADMAP.md` · journal des décisions : `docs/DECISIONS.md`.
- Agents : `.claude/agents/` · procédures : `.claude/skills/` (livrer, checkpoint, mission).
