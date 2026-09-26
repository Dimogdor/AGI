# Politique de confidentialité — AGI : La Dernière Bataille de l'Humanité
*Dernière mise à jour : 26 septembre 2026*

## Version courte
**AGI : La Dernière Bataille de l'Humanité ne collecte, ne stocke et ne transmet aucune donnée
personnelle.** Pas de compte, pas de pistage, pas de publicité, pas d'analytics.

## Détails

**Données stockées sur votre appareil uniquement.** Le jeu enregistre vos
réglages (langue, volume, touches) dans le stockage local de l'application.
Ces données ne quittent jamais votre appareil et peuvent être effacées en
désinstallant l'application.

**Jeu solo.** Le mode solo et le tutoriel fonctionnent **entièrement hors ligne** :
tant que vous ne lancez pas une partie en ligne, l'application n'émet aucune
requête réseau.

**Mode en ligne (1v1).** Les parties en ligne se jouent en **pair-à-pair**
(WebRTC) : votre appareil se connecte directement à celui de votre adversaire
pour échanger l'état de jeu. Aucune partie n'est enregistrée et aucun contenu
de jeu n'est conservé sur un serveur. En revanche, établir cette connexion met
en jeu les services suivants, qui voient votre **adresse IP** le temps de la
mise en relation — comme toute communication réseau :

- **Serveurs STUN/TURN** (Google, OpenRelay/Metered, et un relais Cloudflare que
  nous opérons) : ils permettent de traverser les box et réseaux mobiles. Le
  relais ne sert qu'au transport ; nous n'y journalisons aucune partie.
- **Serveur de signalisation PeerJS** : il met en relation les deux joueurs à
  partir d'un code de salon, puis s'efface de la communication.
- **Liste des salons publics** (base Firebase Realtime Database, Google, hébergée
  dans l'UE) : **uniquement si vous choisissez de rendre votre salon public**,
  l'application y publie le code du salon, le nom de salon que vous avez
  éventuellement saisi, le camp choisi, la vitesse de jeu, la présence ou non
  d'un mot de passe, et un horodatage. Ces entrées sont éphémères : retirées à la
  fermeture du salon, ignorées après 60 secondes, et — si l'application a été fermée
  brutalement — supprimées automatiquement dès la consultation suivante de la liste
  une fois inactives depuis plus de 5 minutes. Elles ne contiennent aucune donnée
  personnelle — sauf si vous en saisissez une vous-même dans le nom du salon,
  ce que nous vous déconseillons. Un salon privé (par code) ne publie rien.
  Le mot de passe éventuel n'est **jamais** transmis à cette liste.

**Aucune donnée sensible.** Le jeu ne demande ni nom, ni e-mail, ni
localisation, ni contacts, ni micro, ni caméra.

**Enfants.** Le jeu ne collecte aucune donnée, y compris auprès des enfants.

**Mises à jour de contenu.** Les correctifs d'équilibrage/textes peuvent être
téléchargés (OTA) depuis notre hébergement de mises à jour ; cette requête ne
transmet aucune donnée personnelle.

## Contact
Pour toute question : amineelwadi@gmail.com

---
*English summary: AGI — Humanity's Last Stand collects no personal data. No accounts,
ads, tracking or analytics. Settings stay on your device. Solo play and the tutorial
work fully offline. Online 1v1 matches are peer-to-peer (WebRTC): no game server stores
any match, but connecting involves STUN/TURN relays (Google, OpenRelay, and a Cloudflare
relay we operate) and a PeerJS signalling server, which see your IP address for the time
it takes to connect. If — and only if — you choose to make your room public, the room
code, the optional room name you typed, your chosen side, game speed, whether a password
is set, and a timestamp are published to a Firebase Realtime Database (Google, EU-hosted);
these entries are ephemeral (removed when the room closes, and automatically purged once
inactive for over 5 minutes if the app was closed abruptly) and contain no personal data. Room passwords are never sent there.*
