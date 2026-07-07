# Empaqueter AGI — La Dernière Bataille de l'Humanité (iOS · Android · PC · Web)

Le jeu reste **un seul fichier source lisible** : `la-derniere-bataille.html`.
Tout le reste est généré. Le principe :

```
la-derniere-bataille.html   (source que vous éditez)
        │  npm run build   →  minifie + obfusque le code
        ▼
       www/              (bundle web prêt, code caché)
        ├─► Capacitor  →  Android (.aab/.apk) + iOS (.ipa)
        ├─► Electron   →  Windows (.exe) / macOS (.dmg) / Linux (AppImage)
        └─► statique   →  Web / PWA installable
```

**Vous n'éditez jamais `www/`** : il est régénéré à chaque build. Pour mettre
le jeu à jour, vous modifiez `la-derniere-bataille.html`, relancez `npm run build`,
et republiez (voir « Mises à jour faciles »).

---

## 0. Prérequis (une fois)

- **Node.js 18+** et npm — pour le build et Electron.
- **Android** : Android Studio (+ JDK 17). Compte Google Play Console (25 $ une fois).
- **iOS** : un **Mac** avec Xcode. Compte Apple Developer (99 $/an).
- **PC** : rien de plus (Electron tourne partout).

```bash
npm install          # installe les outils de build (+ Capacitor/Electron en option)
npm run build        # génère www/ (à refaire après chaque modif du jeu)
```

---

## 1. PC — Windows / macOS / Linux (Electron)

Le plus simple, aucun changement de code :

```bash
npm run electron     # lance le jeu en fenêtre desktop (test)
npm run dist:pc      # crée l'installeur dans dist-pc/ (.exe / .dmg / AppImage)
```

> `electron-builder` produit l'installeur de **votre** OS. Pour fabriquer le
> `.exe` Windows, lancez-le sous Windows (ou via CI GitHub Actions, voir §6).
> En production, le menu et les DevTools sont désactivés (`electron/main.js`).

Alternative plus légère si la taille compte : **Tauri** (binaire ~10 Mo contre
~150 Mo pour Electron). Même `www/`, mais nécessite Rust.

---

## 2. Android (Capacitor)

```bash
npx cap add android          # crée le dossier android/ (une seule fois)
npm run android              # build www/ + sync + ouvre Android Studio
```

Dans Android Studio : **Build → Generate Signed Bundle (.aab)** → téléversez le
`.aab` dans la **Play Console**. (Pour tester sur un téléphone : Run ▶.)

---

## 3. iOS (Capacitor — Mac obligatoire)

```bash
npx cap add ios              # crée le dossier ios/ (une seule fois)
npm run ios                  # build www/ + sync + ouvre Xcode
```

Dans Xcode : choisissez votre équipe de signature, puis **Product → Archive →
Distribute App** vers **App Store Connect**. WebRTC (mode en ligne) fonctionne
dans la WebView iOS.

---

## 4. Web / PWA

`www/` est un site statique autonome. Servez-le sur n'importe quel hébergeur
gratuit (GitHub Pages, Netlify, Cloudflare Pages) :

```bash
npm run serve        # aperçu local sur http://localhost:3000
```

Le manifeste + service worker rendent le jeu **installable** (« Ajouter à
l'écran d'accueil » / « Installer l'application » sur PC) et jouable hors ligne.

---

## 5. Cacher le code source (anti-triche)

`npm run build` enchaîne deux passes sur le script :

1. **terser** — minification + suppression des `console.*`.
2. **javascript-obfuscator** — toutes les chaînes (lore, UI, logique) passent
   en **tableau chiffré base64**, les variables locales sont renommées, et
   l'auto-défense casse la « ré-indentation » du code.

Réglages dans `build.mjs` calibrés pour **ne pas plomber les 60 fps** (pas de
control-flow-flattening ni de dead-code, coûteux en CPU).

Pour **durcir davantage** : passez `renameGlobals: true` dans `build.mjs`
(renomme aussi les noms de haut niveau). C'est sûr ici (le HTML n'a aucun
`onclick` inline), mais **retestez** après.

> ⚠️ **Honnêteté nécessaire.** L'obfuscation décourage le bidouillage *occasionnel*,
> mais ne rend **aucun** jeu côté client incrackable. En 1v1 P2P, c'est **l'hôte
> qui simule** : un hôte déterminé peut tricher. Pour un classement compétitif
> réellement anti-triche, il faut un **serveur autoritaire** (ex. Colyseus) qui
> arbitre la partie — le code P2P actuel resterait pour le jeu entre amis. C'est
> le seul vrai rempart ; l'obfuscation est un complément, pas une solution.

---

## 6. Mises à jour faciles

| Plateforme | Comment mettre à jour | Re-soumission au store ? |
|---|---|---|
| **Web / PWA** | rebuild + redeploy `www/` ; bump de version = nouveau cache SW | non |
| **PC (Electron)** | `npm run dist:pc` ; brancher `electron-updater` pour l'auto-MAJ | non (auto-update) |
| **Mobile (OTA)** | pousser un nouveau bundle `www/` via **Capgo** | non, pour le JS/HTML/assets |

### OTA mobile sans frais (Capgo)

Le plugin `@capgo/capacitor-updater` est déjà déclaré et configuré
(`capacitor.config.json` → `autoUpdate`). Le bootstrap `notifyAppReady()` est
injecté automatiquement par le build. Deux options :

- **Cloud Capgo** : `npx @capgo/cli init` puis `npx @capgo/cli bundle upload`.
- **Auto-hébergé (gratuit)** : `npm run ota:bundle` crée un zip versionné dans
  `dist-ota/` ; hébergez-le où vous voulez (même GitHub Releases) et pointez le
  plugin dessus. Les utilisateurs reçoivent le correctif au prochain lancement,
  **sans repasser par l'App Store / Play Store**.

> ⚠️ Règle des stores : l'OTA est permise pour le **contenu JS/HTML/assets**
> (correctifs d'équilibrage, textes, bugs). Un changement de **code natif** ou de
> fonctionnalité majeure doit toujours repasser par une soumission classique.

---

## 7. Aide-mémoire

```bash
npm run build      # régénère www/ (obfusqué)
npm run electron   # test PC
npm run dist:pc    # installeur PC
npm run android    # ouvre Android Studio
npm run ios        # ouvre Xcode (Mac)
npm run serve      # aperçu web/PWA
npm run ota:bundle # zip de mise à jour OTA
```

Icônes : déposez `resources/icon-192.png` et `icon-512.png` (voir `resources/README.md`).
