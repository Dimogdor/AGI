# Icônes & ressources

Déposez ici vos icônes d'application (le build les copie dans `www/icons/`) :

- `icon-192.png` — 192×192 px
- `icon-512.png` — 512×512 px (sert aussi de source pour les stores)

Si ces fichiers sont absents, `npm run build` génère des placeholders noirs
(le jeu fonctionne, mais l'icône sera vide). Remplacez-les avant publication.

Pour générer toutes les tailles natives (Android/iOS) à partir d'une seule
image 1024×1024, l'outil officiel est :

```
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#0d0a0a'
```

(placez alors `resources/icon.png` 1024×1024 et `resources/splash.png` 2732×2732).
