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
| `12b-hero.js` | héros : un personnage par ère en couches animées (le Che, la Singularité), étoffe, mort, effets |
| `13-hud.js` | HUD (barres, boutons, menus de construction) |
| `14-loop.js` | boucle de jeu `loop()` + `update`/`render` |
| `15-tutorial.js` | tutoriel scripté interactif (`TUT_STEPS`, gel doux) |
| `16-news.js` | fil d'actualités du monde |
| `16a-biomes.js` | lieux de campagne : ciel, fonds cuits en parallaxe, sol, nuit éclairée, météo |
| `16b-campaign.js` | campagne « Les carnets de Germinal » (5 missions, radio, objectifs, progression) |
| `16c-cine.js` | cinématiques : planches à l'encre, plans sur le terrain, portraits, choix |
| `16d…16h-camp-m1…m5.js` | une mission de campagne par fichier : lieu, musique, règle, cinématiques |
| `17-endgame.js` | fin de partie |
| `18-net-core.js` | multijoueur : hôte autoritaire / invité miroir |
| `19-net-speed.js` | vitesse de jeu (vote en ligne) |
| `20-net-online.js` | pause négociée, transport PeerJS, salons publics |
| `21-menu.js` | menu (DOM), plein écran, navigation en ligne |
| `22-input.js` | clavier, souris/tactile, amorçage du tutoriel |

## Campagne (v1.15) — comment est faite une mission

| Fichier | Rôle |
|---|---|
| `16a-biomes.js` | LIEUX : `BIOMES[id]` (ciel, calques de fond cuits, sol, relief, nuit éclairée, météo `fxRain`/`fxSnow`, `music`, `amb`). `game.biome` remplace tout le décor d'escarmouche. |
| `16b-campaign.js` | Cœur : textes des 5 missions (9 langues), cycle de vie (`startMission`, `campTick`, `campEndCine`), sauvegarde, HUD (objectif, radio, bouton d'action), menu. |
| `16c-cine.js` | CINÉMATIQUES : `cinePlay(script, done)` ; plans sur le terrain (caméra, bandes noires) ou PLANCHES plein écran à l'encre (`plateBase`, `inkLine`, `inkWash`, `inkHatch`, `inkFolk`) ; portraits `CINE_PORTRAITS`, voix `CINE_WHO`. |
| `16d-camp-m1.js` … | Une mission par fichier : `campExtend(i, {...})` ajoute lieu, mécanique et cinématiques à `CAMPAIGN[i]`. **Modèle à suivre : `16d-camp-m1.js`.** |
| `03-audio.js` | `MUSIC_THEMES[id] = {bpm, step(st,t,stepDur,tension)}` : un thème par lieu ; `biome.amb = {rain, wind, birds, tick(t,dt)}`. |

Champs d'une mission (en plus des textes) : `biome`, `theme` (pool `DECOR_THEMES`, objets `DECOR_EXTRA[kind]`),
`setup(g,c)`, `tick(g,c,dt)` (renvoie `'win'`/`'lose'` pour finir), `hud(g,c)` → `{prog,label,clock,warn}`,
`action {label,cd,can,use}` (bouton sous l'objectif), `draw(g,c,vw)` (objets de mission, repère monde−`camX`),
`drawZone(z,t,vw)`, `intro(g,c)` / `outro(g,c,win)` → scripts de cinématique, `radio[]` (entrées `{at|when, who, txt, fx, cine}`).
État de mission dans `game.camp` (`c`) : `c.lights` (sources de lumière), `c.litK`, `c.hidden(u)`, `c.rangeMul(u)`, `c.t`.
