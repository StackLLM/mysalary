# Lot 15 — Semaines en cartes

> Statut : **clôturé** le 11/10/2026 (livré le 10/10/2026). Demande du 09/10/2026 : « améliore l'UI de la vue semaine par semaine, sur la même idée que le calendrier : chaque semaine porte ses infos sur sa carte, et un clic montre ce qu'on doit voir ».

## Objectif

Lire le mois semaine par semaine d'un coup d'œil, comme le calendrier de l'année (lot 14). Un clic sur une semaine en donne le détail.

## Périmètre

| Inclus | Exclu |
|---|---|
| Mois › Semaines : grille de cartes à la place du tableau | Changement des calculs (inchangés depuis le lot 9) |
| Fenêtre de la semaine : calcul, dépenses jour par jour, charges datées | Page Aujourd'hui : lot 16 |
| « + Ajouter » une dépense depuis la fenêtre, à la bonne date | |

## Interface

- **Carte d'une semaine** :
  - en-tête : numéro, dates (« 5 oct. – 11 oct. », « · 2 jours » pour une semaine partielle) et statut (Passée, En cours, À venir) ;
  - au centre : **Reste** en grand, en rouge s'il est dépassé ; pour une semaine à venir, « Disponible (prévu) » en italique ;
  - barre : part du disponible dépensée ; pour la semaine en cours, un trait marque où tu devrais être aujourd'hui ;
  - puis Dépensé, Disponible et Écart (vert en avance, rouge au-dessus du rythme) ;
  - pastilles : tendance (« +50 % »), nombre de charges datées, épargne de la semaine.
- **Style selon le statut** :

  | Statut | Style |
  |---|---|
  | Passée | carte blanche |
  | En cours | cerclée de sauge |
  | À venir | bord en pointillés |

- **Fenêtre de la semaine** (composant `Fenetre` du lot 14) :
  - calcul : budget (prévu), report s'il y en a un, disponible, dépensé, puis « = Reste de la semaine » (sur fond rouge si dépassé) ;
  - en mots : jour 6 sur 7 et montant par jour restant, écart sur le rythme, tendance et sa base ;
  - dépenses jour par jour : un clic modifie, « + Ajouter » ouvre la saisie à aujourd'hui (ou au dernier jour d'une semaine passée) ;
  - charges datées et leur statut, prévu, payé cette semaine, épargne ;
  - semaine précédente / suivante, « Fermer ». En lecture seule pour un mois clôturé ou une semaine à venir.
- **Carte « Cette semaine »** (colonne de droite) : bouton « Voir le détail de la semaine ».
- **Bloc « Lire une carte »** : il remplace les barres « Dépensé par semaine », que les cartes montrent déjà.
- **Mobile (375 px)** : deux cartes par ligne (statut, reste, barre, pastilles) ; le détail est dans la fenêtre.

## Tests

331 tests au total (partage 21, moteur 135, serveur 75, interface 100) : +2.

- Cartes : libellé de chaque semaine (reste, statut, ou disponible pour une semaine à venir), jours d'une semaine partielle, tendance, charges ; aucune fenêtre ouverte d'office.
- Fenêtre : calcul et montant par jour, seules les dépenses de la semaine, charges datées, semaine précédente.
- Bouton de « Cette semaine » ; ajout d'une dépense au dernier jour d'une semaine passée ; mois clôturé sans « + Ajouter ».

## Vérification dans le navigateur

Compte « Essai » (supprimé ensuite), octobre 2026, enveloppes courses 1 500 DH et sorties 600 DH :

- **Cartes** : semaine 2 à −355,78 DH, semaine 3 en cours à −805,82 DH (+146 %, 2 charges), semaines 4 à 6 à venir.
- **Fenêtre de la semaine 3** : « + Ajouter » ouvre la saisie par-dessus la fenêtre. Après une dépense de 50 DH, la fenêtre se met à jour : dépensé 1 330 DH, reste −855,82 DH, « Aujourd'hui · Courses 50 DH ».

1342 px et 375 px sans débordement de page.

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Prévu et réel toujours nommés, jamais par la couleur seule.
- [x] Vérifié à 1342 px et 375 px.

## Ajout du 12/10/2026 : les semaines ne reçoivent que les montants mis par l'utilisateur

Demandes : « le budget prévu ne se définit pas : les semaines s'alimentent par les montants que je rentre ; semaine 1 sans montant, c'est 0 » ; « laisser à l'utilisateur la liberté de mettre un montant différent pour chaque semaine, et l'alerter s'il a dépassé le montant de l'enveloppe ». Remplace les versions des 10, 11 et 12/10 (division automatique, montant additionné, montant par semaine imposé).

- **Enveloppe** : « Budget du mois » (ex. 400 DH), puis « Je consomme ce budget : Librement sur le mois / Par semaine / Par jour ».
  - Par semaine : aucun montant imposé. Le bloc « Ce que je mets chaque semaine » a un champ par semaine (vide = 0), pour le mois en cours **ou le suivant** (choix « Octobre (en cours) / Novembre »), pour préparer ses montants en fin de mois.
  - En bas du bloc : « 550 DH mis : 50 DH restent à répartir sur ce mois. », « Tout le budget est réparti : 600 DH. », ou en rouge « Tes semaines dépassent le budget de l'enveloppe de 50 DH (650 DH mis). » (alerte, l'enregistrement reste possible).
  - Par jour : « Montant par jour », chaque jour le reçoit jusqu'au budget (« Budget du mois atteint le 19 oct. »).
- **Semaines (Mois › Semaines, Aujourd'hui)** : le budget d'une semaine est la somme des montants mis sur elle (et des montants par jour) ; 0 sinon. Rien n'est calculé ni réparti par MySalary. Le dépensé reste le réel ; une semaine dont le dépensé dépasse son budget est dépassée (alerte « semaine dépassée »), et une enveloppe dont le dépensé du mois dépasse son budget déclenche « enveloppe dépassée ».
- **Enveloppe libre** : suivie sur le mois seulement ; l'onglet Semaines le dit (« Courses est consommée librement : suivi sur le mois, sans montant de semaine. ») avec le lien « Mettre mes montants par semaine », ainsi que le budget pas encore mis sur une semaine. Le rythme du mois (bilan) la compte au fil des jours, vue du mois entier.
- **Moteur** : `planEnveloppe` (montants de semaine tels quels, `aRepartir`, `depassement`), `SuiviDesSemaines.budget` = total reçu par les semaines, `libres`, `aRepartir`.
- **Données** : `Charge.semaines` (montant de chaque semaine), `Charge.rythme` (par jour seulement) ; migration `enveloppe_rythme`. `GET /charges/resume` donne les semaines du mois en cours et du suivant.
- **Tests** : 355 au total (moteur : montants de semaine, dépassement, par jour, libre, propriété « les semaines reçoivent exactement les montants mis » ; serveur ; interface).
