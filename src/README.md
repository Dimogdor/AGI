# src/ — code source modulaire de « La Dernière Bataille de l'Humanité »

Le jeu était un unique fichier `la-derniere-bataille.html` de ~7000 lignes. Il est
désormais découpé en modules ici. **`la-derniere-bataille.html` et `www/` sont
générés** — on n'édite QUE les fichiers de `src/`.

## Régénérer

```bash
npm run dev     # réassemble la-derniere-bataille.html (rapide, lisible, jouable sur file://)
npm run build   # + minification, obfuscation, PWA → www/ (déploiement web/mobile/PC)
```

`build.mjs` concatène les `src/NN-*.js` dans l'ordre des préfixes (00 → 22) et
les injecte dans `src/shell.html` à la place du marqueur `__BUILD_SCRIPT__`.
Tout le code partage la même portée globale (pas d'`import`/`export`) : l'ordre
de concaténation = l'ordre d'origine, donc le comportement est identique.

## Carte des modules

| Fichier | Rôle |
|---|---|
| `shell.html` | structure HTML : `<head>`, CSS, DOM des menus, canvas |
| `00-core.js` | canvas, `resize`, conversions écran↔monde, relief |
| `01-settings.js` | réglages + touches reconfigurables |
| `02-i18n.js` | tables de traduction (fr/en/es/de/it/pt/ru/zh/ar) |
| `03-audio.js` | moteur audio (musique procédurale + SFX) |
| `04-data.js` | données : `ROLES`, `BUILDS`, `FACTIONS`, ères |
| `05-state.js` | variables d'état globales |
| `06-cheat.js` | mode triche (dev — à retirer avant release) |
| `07-decor.js` | habillage des cartes (décor non-interactif) |
| `08-actions.js` | actions joueur : recruter, bâtir, ordres, pouvoirs |
| `09-ai.js` | IA adverse |
| `10-simulation.js` | simulation : économie, combat, déplacements |
| `11-cataclysm.js` | cataclysmes naturels |
| `12-render.js` | rendu : sprites, bases, bâtiments, éclairage |
| `13-hud.js` | HUD (barres, boutons, menus de construction) |
| `14-loop.js` | boucle de jeu `loop()` + `update`/`render` |
| `15-tutorial.js` | tutoriel scripté interactif (`TUT_STEPS`, gel doux) |
| `16-campaign.js` | mode histoire (campagne, missions, POI, triggers) |
| `17-endgame.js` | fin de partie |
| `18-net-core.js` | multijoueur : hôte autoritaire / invité miroir |
| `19-net-speed.js` | vitesse de jeu (vote en ligne) |
| `20-net-online.js` | pause négociée, transport PeerJS, salons publics |
| `21-menu.js` | menu (DOM), plein écran, navigation en ligne |
| `22-input.js` | clavier, souris/tactile, amorçage du tutoriel |
