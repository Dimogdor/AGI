# Audit complet n°2 de la v1.17.0 — synthèse et plan (Opus en conseiller, lecture seule)

Rapports détaillés : [TECHNIQUE.md](TECHNIQUE.md) · [EQUILIBRAGE.md](EQUILIBRAGE.md) · [VISUEL-COHERENCE.md](VISUEL-COHERENCE.md).
Audio et voix restent gelés : seule la régression de LOGIQUE (empreinte des voix) est corrigée, aucun fichier son n'est touché.

## Verdict
- **Technique** : 1 bloquant (les crédits ne se ferment pas), 2 importants (66 répliques FR redevenues muettes à cause des
  espaces insécables ; chaleur des machines absente chez l'invité en ligne), 5 mineurs. Performance et sécurité : RAS.
- **Équilibrage** : le banc B rejouait une seule ouverture (d'où le « biais gauche » et le « −24 » du Soulèvement). Avec des
  ouvertures tirées, l'Humanité gagne **37,5 % [33,7 ; 41,4]** ; leviers réels : Couvre-feu (arrêt de production) et mécanique
  `hero`. Difficulté : falaise Normal → Difficile, parties sans fin en Difficile/Brutal (réparation de base sans recharge).
  Campagne : seule M3 a une vraie courbe ; M5 acte II trop long ; doctrine Radio libre toujours perdante.
- **Visuel et cohérence** : la DA tient ; restent les fiches d'unités illisibles sur téléphone, des bandeaux doublés ou faux,
  le briefing qui déborde encore, l'arabe en Courier, des noms d'unités qui ne collent pas au dessin, du treillis militaire
  aux ères I et IV, Ω avant son temps, des écarts de traduction.

## Plan proposé (lots de 2–3 agents, un commit par point, livraison v1.18)
| Lot | Contenu | Agent |
|---|---|---|
| 1 · Bugs | crédits (clic + téléphone), empreinte des voix sans insécables, chaleur / couvre-feu / annonce du héros / fumée chez l'invité, « ? » et repli « Facultatif » sur téléphone | dev-gameplay + dev-ui |
| 2 · Équilibrage | bancs à ouvertures tirées + IC ; Couvre-feu à 50 % de production ; recharge de la réparation de base ; `AI_KF` hors Normal ; Difficile adouci ; Frappe chirurgicale ≥ 6 % des PV du héros ; M2/M4/M5 (niveaux, acte II), Radio libre, libellé « 35 % » ; bancs de campagne robustes | dev-gameplay |
| 3 · Interface et textes | téléphone (fiches, barre du haut), bandeaux uniques et justes, pourcentages insécables, OUI/NON, barre d'actions sans trou, briefing compact, police arabe, ressources « nourriture / argent / eau », « Arbitrage » aligné (en/de/it), zh « 太阳能镜阵 », refroidissement lisible, pouvoirs décrits en clair, guide, lore de l'escarmouche aligné sur la bible | dev-ui (+ traductions) |
| 4 · Graphismes | ères I et IV civiles (jean, combinaison de mineur), trois teintes de peau, noms d'unités ↔ dessins, aviation humaine bricolée, Ω retiré des planches M3/M4, emblème « NOUS » à la place de l'œil, tache noire du premier plan, planches M4-citadel, M5-cables, M2-mado, M2-hexa, M3-grey | dev-ui |

## Arbitrages demandés à l'auteur
Voir la conversation : héros en campagne, intro de l'escarmouche, « COMMUNISME À VISAGE HUMAIN » / ☭, renommage des unités.
