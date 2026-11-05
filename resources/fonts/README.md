# Polices embarquées (menu « tract de la Résistance »)

Intégrées en base64 dans la page au build (`build.mjs`, marqueur `/*__FONTS__*/` de `src/shell.html`) :
le jeu reste un fichier unique, jouable hors ligne (web, Android, PC).

| Police | Usage | Licence |
|---|---|---|
| Big Shoulders Stencil Display (800) | titre au pochoir, tampon, intercalaires | SIL OFL 1.1 — `OFL-BigShouldersStencil.txt` |
| Special Elite | texte « machine à écrire » du tract | Apache 2.0 — `LICENSE-SpecialElite-Apache2.txt` |
| Oswald (600) | repli cyrillique des titres | SIL OFL 1.1 — `OFL-Oswald.txt` |
| VT323 | impression « terminal » du mode G·P·T | SIL OFL 1.1 — `OFL-VT323.txt` |

Sous-ensembles latin (+ cyrillique pour Oswald) issus de Google Fonts ; les autres écritures
(arabe, chinois…) retombent sur les polices du système. Liste et plages Unicode : `fonts.json`.
