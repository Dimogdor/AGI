# Publier « AGI — La Dernière Bataille de l'Humanité » sur Google Play

Guide pas à pas **depuis l'état actuel** : application déjà créée dans Play Console
(`com.agi.dernierebataille`), fiche du store remplie, test fermé commencé.
Tout se fait depuis un navigateur, sur n'importe quel PC — **aucune installation**
(ni Android Studio, ni Java, ni Node) n'est nécessaire.

Durée : ~30 min de manipulations, puis **14 jours de test fermé** imposés par Google,
puis 1 à 7 jours d'examen.

---

## 0. Ce qu'il vous faut

Les deux fichiers de signature reçus lors de la première compilation :

- `agi-release.keystore`
- `KEYSTORE-SECRETS.txt` (contient le **store password**)

> ⚠️ **Ne les perdez jamais, ne les commitez jamais dans git.** Gardez-en une copie dans
> un gestionnaire de mots de passe. Si vous les avez perdus → section 9.

---

## 1. Ranger le keystore dans GitHub (une seule fois)

GitHub les conserve **chiffrés** ; la compilation s'en sert sans jamais les exposer.

**a. Convertir le keystore en texte (base64) et le copier.**

- **Windows** — ouvrez *PowerShell* dans le dossier du fichier, puis :
  ```powershell
  [Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\agi-release.keystore")) | Set-Clipboard
  ```
- **Mac** : `base64 -i agi-release.keystore | pbcopy`
- **Linux** : `base64 -w0 agi-release.keystore | xclip -selection clipboard`

Le texte est maintenant dans le presse-papiers (une longue ligne de caractères).

**b. Créer les secrets.** Sur GitHub : dépôt **Dimogdor/AGI** → **Settings** →
**Secrets and variables** → **Actions** → **New repository secret**, deux fois :

| Name | Secret |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | collez le presse-papiers (étape a) |
| `ANDROID_KEYSTORE_PASSWORD` | le *store password* de `KEYSTORE-SECRETS.txt` |

(L'alias de clé est `agi-guerre-des-eres` : c'est le défaut, rien à créer. Oui, il porte
l'ancien nom — il est gravé dans la clé et **ne doit pas** changer.)

---

## 2. Compiler l'application signée (à chaque nouvelle version)

1. GitHub → onglet **Actions** → à gauche **« Construire l'appli Android (AAB signé) »**.
2. Bouton **Run workflow** → branche `main` → **Run workflow**.
3. Attendez ~5 min que le run passe au vert ✅, puis ouvrez-le.
4. Dans le **résumé**, vérifiez : **« Signé : oui »** et notez le **versionCode**.
5. En bas, section **Artifacts** → téléchargez `AGI-la-derniere-bataille-vc…-signe`,
   décompressez-le : vous obtenez **`app-release.aab`**.

Le versionCode augmente tout seul à chaque run : l'erreur *« Le code de version X a déjà
été utilisé »* ne peut plus se produire.

> Run rouge avec *« Keystore illisible »* → le base64 est tronqué, ou le mot de passe est
> faux. Refaites l'étape 1 (recréez les deux secrets), puis relancez.

---

## 3. Réparer le 1v1 entre téléphones (5 min, une seule fois)

L'audit a trouvé que votre relais TURN Cloudflare **refuse l'application Android**
(il n'acceptait que le site web). Sans lui, deux joueurs en 4G ne se connectent souvent pas.

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **turn-proxy**.
2. **Edit code** → remplacez **tout** le contenu par celui du fichier
   `cloudflare-turn-worker.js` du dépôt (version corrigée) → **Deploy**.

Rien d'autre à changer : les secrets `TURN_KEY_ID` / `TURN_TOKEN` du Worker restent en place.

---

## 4. Mettre à jour la fiche du store (nouveaux visuels)

Play Console → votre appli → **Développer votre présence sur le Store** →
**Fiche principale du Store**. Remplacez les images par celles du dossier `resources/` :

| Champ Play Console | Fichier(s) |
|---|---|
| Captures d'écran téléphone | `screenshots/01` à `06` (les 6) |
| Captures tablette 7" et 10" | les mêmes `screenshots/01` à `06` |
| Captures Chromebook | les mêmes `screenshots/01` à `06` |
| Captures Google Play Games sur PC | les mêmes `screenshots/01` à `06` |
| Image de présentation Google Play Games sur PC | `pc-presentation.png` (sans texte, comme exigé) |
| Icône de l'application | `icon-512.png` |
| Image de présentation (feature graphic) | `feature-graphic.png` |

→ **Enregistrer**.

---

## 5. Déclarations de contenu (à vérifier)

Menu **Règles et programmes** → **Contenu de l'application** :

- **Règles de confidentialité** : `https://dimogdor.github.io/AGI/privacy.html`
- **Accès à l'application** : *Toutes les fonctionnalités sont disponibles sans restriction*.
- **Annonces** : *Non, mon application ne contient pas d'annonces*.
- **Classification du contenu** : questionnaire IARC → catégorie *Jeu* ; répondez :
  violence de dessin animé / fantastique **oui** (combats stylisés, pas de sang réaliste) ;
  interaction entre utilisateurs **oui** (1v1 en ligne, mais **aucun chat**) ;
  pas de jeux d'argent, pas d'achats, pas de partage de position.
- **Public cible** : **13 ans et plus** (évite les obligations « Famille »).
- **Sécurité des données** — réponses exactes, alignées sur la politique de confidentialité :
  - *Votre application collecte-t-elle des données ?* → **Oui**
  - *Données chiffrées en transit ?* → **Oui**
  - *Les utilisateurs peuvent-ils demander la suppression ?* → **Oui** (suppression automatique)
  - Type de donnée : **Activité dans l'appli → Autres contenus générés par l'utilisateur**
    (le **nom de salon** saisi quand un joueur crée un salon **public**)
    - Collectée : **oui** · Partagée : **non** · Traitée de façon éphémère : **non**
    - Facultative : **oui** (seulement si le joueur crée un salon public)
    - Finalité : **Fonctionnement de l'application**
  - Aucune autre donnée (pas de compte, d'identifiant, de position, d'analytics).

  Pourquoi pas « aucune donnée » : le nom de salon tapé par le joueur est stocké quelques
  minutes dans votre base Firebase. Le déclarer est exact, sans risque, et cohérent avec
  la politique de confidentialité — une incohérence entre les deux peut, elle, bloquer l'examen.

---

## 6. Envoyer la version en test fermé

Menu **Tester et publier** → **Tests** → **Test fermé** → votre piste → **Créer une release**
(ou *Modifier la release* si un brouillon existe : supprimez l'ancien fichier `.aab`).

1. **Téléverser** → `app-release.aab` (étape 2).
   Si on vous le propose : **acceptez la signature d'application Play** (Play App Signing).
2. **Nom de la release** : laissez celui proposé.
3. **Notes de version** :
   ```
   <fr-FR>
   Nouveau ciel, nouvelles couleurs : le monde qui meurt se lit maintenant à l'écran,
   du jour bleu au crépuscule rouge. Unités plus lisibles en pleine mêlée.
   Qualité graphique auto-adaptée aux appareils modestes. Corrections du 1v1 mobile.
   </fr-FR>
   <en-US>
   New sky, new colors: watch the dying world from blue daylight to red dusk.
   Clearer units in the thick of battle. Graphics quality auto-adapts on modest
   devices. Mobile 1v1 connection fixes.
   </en-US>
   ```
4. **Suivant** → corrigez les éventuels avertissements → **Enregistrer** →
   **Envoyer pour examen** (menu *Vue d'ensemble de la publication*).

---

## 7. Recruter les 12 testeurs (14 jours)

Règle Google pour les **nouveaux comptes personnels** : au moins **12 testeurs inscrits
pendant 14 jours d'affilée** en test fermé avant de pouvoir publier en production.

1. Piste **Test fermé** → onglet **Testeurs** → créez une liste d'e-mails
   (adresses **Gmail / compte Google** des testeurs) → **Enregistrer**.
2. Copiez le **lien d'inscription** et envoyez-le aux testeurs (post Reddit, amis…).
3. Chaque testeur : ouvre le lien → **Devenir testeur** → installe l'appli depuis le Play Store.

Le compteur des 14 jours démarre quand 12 testeurs sont inscrits. Visez **15 à 20** :
certains se désinscrivent. Demandez-leur de lancer le jeu de temps en temps.

---

## 8. Passer en production (après les 14 jours)

1. **Tableau de bord** → **Demander l'accès à la production** → répondez au questionnaire
   sur votre test (retours reçus, corrections apportées : soyez précis et honnête).
2. Une fois accordé : **Production** → **Créer une release** → **Ajouter depuis la
   bibliothèque** → choisissez le même `.aab` (ou un plus récent) → notes de version →
   **Pays / régions** : tous → **Envoyer pour examen**.
3. Examen : 1 à 7 jours. Ensuite le jeu est **public** sur Google Play. 🎉

**Mises à jour ensuite** : modifications du code → étape 2 (nouveau `.aab`, versionCode
automatique) → Production → *Créer une release* → téléverser → envoyer.

---

## 9. Keystore perdu ?

Pas de panique si vous avez déjà téléversé un `.aab` avec *Play App Signing* activé
(c'est le cas par défaut) : Google détient la vraie clé de signature, la vôtre n'est
qu'une **clé d'importation**, réinitialisable.

1. Générez une nouvelle clé (n'importe quel PC avec Java, ou demandez-moi de le faire).
2. Play Console → **Tester et publier** → **Configuration** → **Intégrité de l'application**
   → **Signature d'application** → **Demander la réinitialisation de la clé d'importation**
   → suivez les instructions (envoi du certificat `.pem`).
3. Remplacez les deux secrets GitHub (étape 1) par la nouvelle clé.
