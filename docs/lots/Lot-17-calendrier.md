# Lot 17 — Calendrier

> Statut : **livré** (12/10/2026), en attente de validation. Objectif (UX.md § 5.10) : voir quand l'argent entre et sort.

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Vue grille du mois budgétaire et vue liste | Vue de l'année : lot 18 (le calendrier de l'année du lot 14 reste dans Objectifs) |
| Événements : paie et primes, autres revenus, charges fixes, échéances de dettes, ponctuels, dates d'objectifs | Modifier une charge ou un ponctuel dans une fenêtre du calendrier (le lien ouvre Mon plan) |
| Solde du jour, réel puis projeté, au survol | |
| Filtre par type ; pastille « +N » ; marqueur « passé, pas confirmé » | |
| Détail d'un jour : prévu, réel, statut, « Marquer payé » ou lien de confirmation, lien pour modifier | |
| Ajouter un ponctuel daté (à la date du jour ouvert) | |

## Règles

- **Événements** (moteur `calendrierDuMois`) : les lignes datées du bilan du mois, typées (`paie`, `revenu`, `charge`, `dette`, `ponctuel`) avec leur sens (entrée, sortie), leur montant (réel s'il existe, sinon prévu), leur statut et la ligne du bilan, donc la **même cible de confirmation** que l'onglet Mois. Les enveloppes, le hors plan et l'épargne n'ont pas de date : ce ne sont pas des événements.
- **Solde du jour** : revenus reçus − sorties réelles (dépenses et paiements de dettes) depuis le début du mois jusqu'à aujourd'hui, c'est le réel. Après aujourd'hui s'ajoutent les restes datés pas confirmés : revenus attendus, charges et échéances à payer, c'est le **projeté**, toujours dit « projeté ». Un revenu ou une charge en retard compte dès demain. Les enveloppes ne comptent qu'une fois dépensées. Le report des mois précédents n'est pas inclus (voir le cumul, lot 13).
- **Mois terminé** : tout est réel, rien n'est projeté. **Mois à venir** : tout est prévu, le solde part de zéro.
- **Dates d'objectifs** : un objectif est placé au dernier jour du mois budgétaire où il est atteint (projection réaliste) ou visé (date souhaitée), avec la même règle que le calendrier de l'année (`jalonsDuMois`).
- **Statuts en mots**, jamais la couleur seule : Reçu, Payé, Prévu, En retard, En partie payé, Date visée, Atteint (projection). Un événement passé pas confirmé porte un marqueur et la mention « pas encore confirmé ».
- **Plusieurs événements le même jour** : deux visibles dans la case, puis « +N ». Sur mobile, des points de couleur à la place des pastilles ; un appui ouvre le jour.

## Données

Route `GET /mois/:cle/calendrier` (`CalendrierMoisDto` : mois, aujourd'hui, début de semaine des Réglages, événements, jours avec solde). Une écriture (dépense, paie, ponctuel) recalcule la requête.

## Interface

- Page `/calendrier`. Le mois, la vue (`?vue=liste`) sont dans l'adresse ; navigation de mois comme sur la page Mois.
- Colonne de droite : solde en fin de mois (réel ou projeté), nombre d'événements et d'événements passés pas confirmés, lecture du calendrier, bouton « Ajouter un ponctuel ».
- Page Aujourd'hui : lien « Ouvrir le calendrier » sous les 7 prochains jours (la barre du bas mobile n'a que 4 destinations).
- États : chargement, vide (« Aucun événement prévu sur ce mois. »), erreur avec « Réessayer ».

## Tests

Moteur (événements typés, solde réel/projeté, mois terminé et à venir), serveur (route, ponctuel ajouté, isolation, clé invalide), interface (grille, « +1 », fenêtre du jour, confirmation sur place, retard, objectif, filtre, liste, ajout d'un ponctuel, vide, erreur).

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Réel et projeté toujours nommés ; aucun calcul dans l'interface.
- [x] Vérifié à 1342 px et 375 px sur un compte « Essai » (supprimé ensuite).
