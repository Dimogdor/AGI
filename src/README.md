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
| `16b-campaign.js` | moteur de campagne « Les carnets de Germinal » (briefing, difficulté, doctrines, cartes, actes, radio) |
| `16c-cine.js` | cinématiques : planches à l'encre, plans sur le terrain, portraits, choix |
| `16d…16h-camp-m1…m5.js` | une mission de campagne par fichier : lieu, musique, règle, cinématiques |
| `17-endgame.js` | fin de partie |
| `18-net-core.js` | multijoueur : hôte autoritaire / invité miroir |
| `19-net-speed.js` | vitesse de jeu (vote en ligne) |
| `20-net-online.js` | pause négociée, transport PeerJS, salons publics |
| `21-menu.js` | menu (DOM), plein écran, navigation en ligne |
| `21b-guide.js` | onglet GUIDE du menu : rubriques dépliables (9 langues), raccourcis générés depuis les touches réelles |
| `22-input.js` | clavier, souris/tactile, amorçage du tutoriel |

## Campagne (v1.16) — moteur, schéma de mission, flux

| Fichier | Rôle |
|---|---|
| `16a-biomes.js` | LIEUX : `BIOMES[id]` (ciel, calques cuits, sol, relief, nuit éclairée, météo, `music`, `amb`). |
| `16b-campaign.js` | MOTEUR seul (aucun texte de mission) : sauvegarde `agi_camp` v2, difficulté, doctrines, cartes, actes, cycle de vie, HUD (objectif, « ? », radio, bandeau), briefing plein écran, carnet du menu. |
| `16c-cine.js` / `16c0-voice.js` | Cinématiques (`cinePlay`) et voix off (`voiceSay`, appelée par la radio). |
| `16d…16h-camp-m1…m5.js` | Une mission = un fichier : `campMission(i, def)` (puis `campExtend` si besoin). **Rien d'une mission ailleurs.** |

### Flux
Carnet (menu) → `campLaunch(i)` = **briefing** (`#campBrief`) → « Lancer » → `campStart(i)` → cinématique d'ouverture →
mission → clôture (`outro`) → écran de fin → « Mission suivante » / « Réessayer » → `campLaunch(i')` = briefing (on ne
saute jamais la doctrine ni l'ouverture). Musique du briefing : thème `c_map` s'il existe, sinon `carnet`.

### Schéma d'une mission (`campMission(i, def)`)
- **Identité** : `num` ('I'…), `year`, `title`, `place` (objets 9 langues).
- **Briefing** : `recap` / `where` (paragraphes ; à défaut `brief[0]` / `brief[1…]`), `goal`, `goal2` (facultatif,
  suivi par `hud().goal2 = {done, label}` ou `c.goal2Done = true`), `rule`, `tips:[…]`, `doctrines:[idA, idB]`,
  `docWhy:{id: texte}` (« utile ici parce que… »), `debrief`, `fail`. Le debrief de la mission précédente est repris
  dans « Ce qui s'est passé ».
- **Règles** : `biome`, `theme`, `map` (ci-dessous), `eraCap`, `era0`, `oneLife`, `dev0`, `ai:[Récit, Lutte, Dernier carré]`
  (index `DIFFS`), `dm:[…]` (réglages fins d'IA par niveau), `dAdj:[…]` (tempère un multiplicateur commun, à justifier).
- **Crochets** : `setup(g,c)`, `tick(g,c,dt)` → `'win'`/`'lose'`, `hud(g,c)` → `{prog,label,clock,warn,goal2}`,
  `action {label,cd,can,use}`, `draw(g,c,vw)`, `drawZone(z,t,vw)`, `drawNode(n,t,vw)`, `drawObj(o,t,vw)`,
  `onCapture(g,c,o,qui)`, `light(g,c)`, `intro(g,c)`, `outro(g,c,win)`, `radio:[{at|when, who, txt, fx, cine}]`.
- **État** `game.camp` (`c`) : `c.D` (difficulté), `c.act`, `c.t`, `c.log` (journal radio), `c.leash` (+ `c.leashLabel`),
  `c.shield = {label, x?}` (objectif invulnérable TOUJOURS signalé), `c.warnLead` (doctrine Radio libre), `c.objs`.
- **Aides** : `campGrant` (ressources × difficulté), `campHp(n,'p'|'e')`, `campN(n)` (vagues), `campGap(s)`,
  `campWave(n)`, `campSquad`, `campEra`, `campSpawnX(x)` (jamais derrière notre front), `campRadio(who, txt9, {vars})`,
  `campGoal(txt9)` (nouvel objectif annoncé), `campNextAct(spec)`.

### Difficulté (`CAMP_DIFFS`, `campDiff()`)
Récit / Lutte / Dernier carré (sauvegarde v1 « lvl » migrée sur le même index). Multiplicateurs appliqués par le
moteur : `eHp`/`eDmg` (chaque machine ennemie à son apparition), `res` (nos ressources), `wave`, `gap`, `base`, `eBase`,
plus le niveau d'IA de la mission. Le briefing affiche ces chiffres (`campDiffLines`).

### Doctrines (`DOCTRINES`)
`{name, short, long, minus, fx:{res, eco, baseHp, squad, vet, cap, actCd, warn}, apply?}` : les lignes chiffrées du
briefing sont générées depuis `fx`. Appliquées au début de la mission et de chaque acte.

### Carte (`map`, aussi par acte)
`terrain`, `p:{x, slots}`, `e:{x, slots}`, `neut:[x]`, `nodes:[{x, center, look}]` (défaut : **aucun lac**),
`zones:[x]`, `objects:[{id, x, r, rate}]` (capturés par le moteur), `bonusZone` (défaut : non).

### Actes (`campNextAct(spec)`)
`act, title, sub, card:{plate}, before(g,c), after(g,c), biome, theme, map, army:'none'|'hero'|'all'|{keep, hero},
heal, squad, res, xp, buildings:'clear'|'keep', base:{x,hp,fort,look}, ebase:{…}, era:{p,e}, eraCap, ai:{diff,dm,cap},
enemy:'clear'|'keep', goal, rule, tips, setup(g,c), doctrine:false`. Exemple : `16h-camp-m5.js` (`M5_ACTS`).

### Tests
`npm run test:camp` (DOC=1 : seconde doctrine) et `tools/test-campaign-flow.mjs` (parcours complet, difficulté,
cartes, actes, escorte, aide, sauvegarde).
