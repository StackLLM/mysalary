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

## Ajout du 11/10/2026 : budget d'enveloppe fixé par mois, par semaine ou par jour

Demande : « le montant, c'est l'utilisateur qui le règle ; ne laisse pas le système diviser le montant de l'enveloppe ; c'est l'utilisateur qui choisit pour la semaine et pour le jour ». (Une première version qui divisait le budget du mois par jour ou par semaine a été remplacée.)

- **Mon plan › Charges & enveloppes**, formulaire d'une enveloppe : « Je fixe mon budget : Par mois / Par semaine / Par jour ». Le champ suit (« Budget par semaine ») ; dessous, l'explication et le total qui en découle sur le mois en cours, par addition (« Soit 1 550 DH sur ce mois (31 jours…) »).
- **Tableau des enveloppes** : « Budget » (le montant saisi, « 350 DH / sem. ») et « Ce mois » (le total du mois en cours).
- **Règles (moteur, `budgetEnveloppe`)** — MySalary additionne, il ne divise jamais le montant saisi :
  - par jour : le montant chaque jour ; budget du mois = montant × jours du mois ;
  - par semaine : le montant chaque semaine complète, disponible dès son premier jour ; une semaine coupée par le début ou la fin du mois budgétaire reçoit ses seuls jours (montant × jours ÷ 7), pour ne pas compter deux fois une semaine à cheval sur deux mois ;
  - par mois (par défaut, comme avant) : le montant du mois, qui arrive au fil des jours dans le suivi de la semaine.
- **Partout** : semaines (budget, disponible, écart, repère de la barre), rythme du mois, bilan, cumul, résumé des charges et fonds de sécurité utilisent ce budget du mois.
- **Données** : `Charge.unite` (« mois » par défaut) remplace `repartition` (migration `enveloppe_unite`, écrite à la main : copie de toutes les charges, montants inchangés, unité « mois »). Une charge fixe reste « mois ».
- **Tests** : moteur (par semaine, par jour, mélange, rythme, budget du mois, équivalent mensuel), serveur (enregistrement, liste, semaines, rythme, unité refusée), interface (choix, champ, total du mois, envoi). 343 tests au total.
