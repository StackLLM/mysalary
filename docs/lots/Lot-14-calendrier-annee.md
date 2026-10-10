# Lot 14 — Objectifs › vue Calendrier de l'année

> Statut : **clôturé** le 10/10/2026. Demande du 09/10/2026 : « un calendrier premium avec une vue par année, la carte de chaque mois montre le salaire ou le montant que j'aurai avec le cumul moins les charges ; chaque mois cliquable ouvre une fenêtre jolie et bien structurée avec les infos du mois ».

## Objectif

Voir l'année d'un coup d'œil : combien il resterait sur le compte à la fin de chaque mois, et ce qui fait monter ou baisser ce chiffre. Un clic sur un mois en donne le détail.

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Objectifs : onglets « Objectifs » / « Calendrier de l'année » | Page Année (graphiques, comparaison d'années) : lot 18 |
| Bandeau de l'année, 12 mois en cartes, année précédente / suivante | Semaines en cartes : lot 15 |
| Fenêtre du mois : calcul, objectifs, revenus, charges, épargne | Saisie depuis la fenêtre (elle renvoie au mois) |
| Moteur `resumeCumul`, `resume` dans `GET /cumul` | |

## Règles

- **Les chiffres viennent du cumul du lot 13** : réel pour un mois terminé, estimation pour le mois en cours, projection réaliste pour les mois à venir. Rien n'est recalculé dans l'interface.
- **Résumé de l'année** (`resumeCumul`, moteur) : totaux des revenus, charges, épargne et restes des mois suivis ; cumul du dernier mois suivi ; mois au cumul le plus bas ; mois sous zéro.
- **Fin de l'année** = report reçu de l'année précédente + reste de l'année. Le bandeau montre les deux.
- **Objectifs sur les cartes** : un objectif actif dont la projection réaliste atteint la cible ce mois-là (« atteint ») ; un objectif actif ou en pause dont la date souhaitée tombe ce mois-là (« date visée »). Rien pour un objectif déjà atteint, réalisé ou abandonné.
- **Mois à venir dans la fenêtre** : chaque ligne montre son montant prévu, avec le statut « Prévu ». Une enveloppe affichait sinon « 0 DH sur 1 500 DH prévus ».
- **Mois d'avant le suivi** : regroupés en une bande. Chaque mois reste cliquable pour voir ses lignes, sans cumul.

## Interface

- **Onglets** : « Objectifs » (la page d'avant) et « Calendrier de l'année ». La vue et l'année sont gardées dans l'adresse (`/objectifs?vue=calendrier&annee=2027`). Le bouton « Cette année » apparaît quand on regarde une autre année.
- **Bandeau** (le dégradé sauge du template) : « Cumul fin décembre (prévu) » et le mois le plus bas à gauche ; à droite, le reste cumulé de l'année, le report de l'année précédente, les revenus, les charges et l'épargne.
- **Carte d'un mois** :
  - en-tête : nom du mois, période budgétaire (« 27 sept. → 26 oct. ») et nature (« Réel », « En cours », « Prévu ») ;
  - au centre : « Cumul fin de mois » en grand, puis une jauge rapportée au plus haut cumul de l'année ;
  - en bas : Revenus +, Charges −, Épargne −, puis les objectifs du mois ;
  - style selon la nature :

    | Nature | Style |
    |---|---|
    | Réel | carte blanche |
    | En cours | cerclée de sauge |
    | Prévu | bord en pointillés, montants en italique gris |

  - un cumul négatif est en rouge.
- **Fenêtre du mois** (nouveau composant `Fenetre`, centrée sur bureau, feuille du bas sur mobile) :
  - le calcul en quatre cases : report (ou « Solde de départ »), revenus, charges, épargne. Pour le mois en cours, chaque case indique la part déjà réelle (« dont 4 400 DH réels »). Une ligne « = Cumul fin de mois » suit ;
  - les objectifs du mois (lien vers l'objectif) ;
  - Revenus, Charges (groupées : fixes, enveloppes, ponctuels, dettes, hors plan) et Épargne. Chaque ligne a sa date, son statut et son montant ; une enveloppe entamée affiche « 900 DH sur 1 500 DH prévus » ;
  - flèches mois précédent / suivant, « Fermer », « Ouvrir le mois » (Mois › Vue d'ensemble).
- **Mobile (375 px)** : deux cartes par ligne, avec le mois, la nature, le cumul, la jauge et les objectifs. Le détail revenus / charges / épargne est dans la fenêtre.

## Tests

329 tests au total (partage 21, moteur 135, serveur 75, interface 98) : +6.

- Moteur : résumé d'une plage (totaux, cumul de fin, mois le plus bas, découvert, plage sans mois suivi).
- Serveur : `resume` dans `GET /cumul`.
- Interface :
  - règles d'affichage (jauge, objectifs du mois, montant d'une ligne, mois à venir) ;
  - bande d'avant le suivi, cartes et résumé ;
  - fenêtre (calcul, lignes, mois suivant, lien « Ouvrir le mois ») ;
  - changement d'année ;
  - vue gardée dans l'adresse.

## Vérification dans le navigateur

Compte « Essai » (supprimé ensuite) : salaire 10 000 DH le 27, loyer 3 500 DH, assurance 1 200 DH par trimestre, courses 1 500 DH, sorties 600 DH, objectif Moto avec 1 000 DH par mois.

- **2026** : la bande « Janvier → août » ; septembre réel 4 900 DH ; octobre en cours 7 100 DH (10 000 − 6 800 − 1 000) ; décembre prévu 13 900 DH.
- **2027** : cumul fin décembre 49 900 DH (report 13 900 + reste 36 000). « Moto atteint » en mai, « date visée » en juin.

1342 px et 375 px sans débordement de page.

## Corrigé en passant

- Fenêtre d'un mois à venir : les enveloppes et l'épargne affichaient « 0 DH, En cours » ; elles affichent maintenant leur prévu.
- Les cinq cases du calcul étaient coupées à 760 px (« Report de septe… ») : quatre cases, puis le cumul sur toute la largeur.

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Réel, estimation et prévu toujours nommés, jamais par la couleur seule.
- [x] Vérifié à 1342 px et 375 px.
