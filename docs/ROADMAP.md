# Feuille de route

## Fait
- v1.9 → v1.14 : jeu de base, en ligne, tutoriel, menus « tract », graphismes, campagne courte.
- v1.15 : campagne en 5 lieux avec cinématiques, doctrines, héros refaits.

## Fait — v1.16 (retours de l'auteur sur la v1.15)
- Gameplay : grève / mise à jour (immobiles mais se défendent), ordre de position précis, postures du héros
  distinctes, guide du jeu, explication des événements.
- Bases cohérentes par époque (ZAD → commune ; conteneur-serveur → Singularité).
- Audio : enregistrements libres de droits, musiques d'ambiance par mission.
- Cinématiques lisibles + voix off (synthèse neuronale hors ligne).
- Moteur de campagne : briefing entre missions, difficulté claire, doctrines expliquées, actes qui repartent
  de zéro, cartes sans lacs, escorte corrigée.
- Scénario réécrit (bible) puis missions I–V refaites, traductions, voix générées, audit QA.

## Fait — v1.17 (retours de l'auteur sur la v1.16)
- Chronologie : départ en 2028 puis saisons, ères renommées (LES CELLULES, « NOUS »), G·P·T partout, unités à noms civils, Couvre-feu.
- Bugs : scintillement du héros, parité en ligne, remises à zéro entre missions ; audit indépendant final (12 points corrigés).
- Factions asymétriques (M1–M10, un interrupteur par mécanique) : environnement, territoire, bâtiments, économie, traits d'unités,
  soins/recyclage, moral/refroidissement, pouvoirs (Soulèvement / Frappe chirurgicale), héros, transcendance ; IA recalée par camp.
- Graphismes : unités humaines civiles (visage découvert, teintes chaudes), machines froides, héros sans symboles ambigus,
  jauges de chaleur, planches de cinématiques redessinées, écran de fin de campagne en carnet, crédits.
- Interface : moral, refroidissement, santé du monde et événements lisibles ; typographie française ; téléphone ≥ 11 px.

## Fait — v1.18 (audit complet n°2, Opus en conseiller)
- Bugs : crédits refermables (clic et téléphone), voix françaises rétablies (empreinte sans espaces insécables), chaleur des
  machines, annonce du héros et fumée corrigées chez l'invité en ligne (protocole 6), boutons « ? » et « Facultatif » sur téléphone.
- Équilibrage : bancs à ouvertures tirées + intervalles de Wilson ; Couvre-feu à 50 % de production ; réparation de base
  rechargée (20 s, 250 PV / 30 s après l'effondrement) ; Difficile adouci ; `AI_KF_LOW` en Facile/Normal ; Frappe chirurgicale
  ≥ 6 % des PV du héros ; Radio libre « 54 % plus vite » ; M2/M5 retouchées ; bancs de campagne à graine (`SEED=n`).
- Graphismes : ères I (jean) et IV (combinaison de mineur) civiles, trois teintes de peau, unités renommées d'après leur dessin,
  ULM et drone-cargo, devise « TOUT EST À NOUS », Ω retiré avant son temps, planches M2/M3/M4/M5 complétées.
- Intro de l'escarmouche refaite en planches à l'encre ; lore aligné sur la bible.
- Interface : bandeaux uniques, fiches d'unités compactes sur téléphone, coûts en icônes, refroidissement lisible,
  OUI/NON, briefing compact, police arabe système, écarts de traduction corrigés.

## Fait — v1.19 (restes de l'audit n°2)
- Ère III humaine civile : Tireur de toit, Tube à fusées, Autogire de récup (appareil bricolé, plus de jet rouge), Médic de barricade ;
  jean de l'ère I réchauffé ; briefing sans défilement en 1280×720 dans les 9 langues.
- Équilibrage : formation corrigée (une armée sans mêlée ni tank avance ; la garde « tenir » n'ancre plus la colonne) → parties
  sans fin en Brutal 22 → 1 sur 100 ; Couvre-feu à 80 % de production ; aura de la Singularité 6 → 5 ; Normal et Brutal recalés ;
  banc B Humanité 42,8 → 47,9 %.
- Mission V : porte de l'acte II enfin attaquable (acte II ~3 min au lieu de ~30), avatar du Dernier carré allégé ;
  mission II : la canonnière frappe plus fort et plus souvent selon le niveau.

## Fait — v1.19.1
- Bâtiment abîmé : son menu plantait (variable non définie) — on ne pouvait plus ni réparer ni améliorer. Corrigé.
- Audit des actions du joueur dans tous les états (bâtiments, base, barre d'actions, événements, invité en ligne, campagne,
  PC et téléphone) : aucun autre bug. Nouveaux tests durables : `tools/test-actions-states.mjs`, `tools/test-lint.mjs` (variables non déclarées).

## À venir
- Refonte audio finale (voix procédurales à l'accent correct, répliques réécrites) — à la demande de l'auteur. Pistes proposées :
  ElevenLabs (voix natives 9 langues, émotions), OpenAI gpt-4o-mini-tts, Google/Azure, Chatterbox (libre) ; test d'écoute à l'aveugle d'abord.
- Second avis de Fable (conseiller) quand il sera disponible.
- Équilibrage : banc B niveau 3 à 57 % (au bord de 50 ± 8) ; carte plate IA/IA 58,7 % ; Normal ~90 % de victoires du joueur scripté ;
  banc E (événements forcés) très défavorable à l'Humanité ; M5 Lutte acte I de 9 à 14 min.
- Restes visuels/textes : briefing qui défile encore sur téléphone paysage (contenu ~2× la hauteur utile) ; répliques voix gelées à mettre à jour (« Colosse d'acier » en M4, « vivres / métal » en M1).
- Validation à l'oreille des sons et de la voix (par l'auteur), playtests humains de la campagne.
