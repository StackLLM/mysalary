# Lot 18 — Année

> Statut : **livré** (12/10/2026), en attente de validation. Objectif (UX.md § 4.8, § 5.6) : comprendre l'année sans lire chaque mois.

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Page `/annee`, onglets Synthèse et Calendrier (le calendrier de l'année du lot 14 y est réutilisé) | Comparaison d'une année à l'autre |
| Revenus, dépenses, épargne de l'année : réel à date et projeté restant séparés | Export de l'année : lot 20 |
| Graphique mensuel (plein = réel, hachuré = en cours ou prévu) | |
| Les douze mois cliquables → Mois ; mois avant le suivi grisés | |
| Mois les plus coûteux, part variable du revenu, épargne cumulée | |
| Progression de chaque objectif sur l'année | |
| Année future marquée « Projection » | |

## Règles

- **Réel et projeté, jamais mélangés** (UX.md § 9) : mois terminé = tout réel ; mois en cours = le réel à date (`dontReel`) plus le projeté restant ; mois à venir = tout projeté (scénario réaliste). Chaque total d'année donne `reel`, `projete`, `total`. Année passée : pas de projeté. Année future : pas de réel.
- **Dépenses** = sorties et charges encore prévues, épargne exclue (R11).
- **Mois les plus coûteux** : les trois mois suivis aux charges les plus hautes, à égalité le plus tôt ; un mois en cours ou prévu est marqué comme tel.
- **Part variable** : primes et revenus variables ÷ tous les revenus des douze mois (règle déjà utilisée par les indicateurs).
- **Épargne cumulée** : somme des épargnes mensuelles de l'année, réel puis prévu ; cumul mois par mois disponible dans les données.
- **Objectifs** : épargné à la fin de l'année précédente, aujourd'hui, puis en fin d'année : réel pour une année passée, projeté (réaliste, trajectoire du lot 10) sinon ; « hors projection » si la trajectoire ne va pas jusque-là.
- **Mois avant le suivi** : grisés, « Pas de données avant ton inscription », sans barre. Aucun mois suivi : message dédié.

## Données

Route `GET /annee/:annee/suivi` (`SuiviAnnuelDto`). Une écriture (dépense, paie, charge, objectif) recalcule la requête.

## Interface

- Fil d'Ariane « Année / Synthèse », onglets ; l'année et la vue sont dans l'adresse (`?annee=`, `?vue=calendrier`).
- Trois cartes (Revenus, Dépenses, Épargne), graphique, douze mois, deux colonnes (mois coûteux ; part variable et épargne cumulée), objectifs avec barre pleine + hachurée.
- Page Aujourd'hui : lien « Voir l'année » (la barre du bas mobile n'a que 4 destinations).
- États : chargement, erreur avec « Réessayer », année future, aucun mois suivi, aucun objectif.

## Tests

Moteur (totaux réel/projeté, mois coûteux, part variable, épargne cumulée, objectif, année passée et future), serveur (route, objectif, isolation, clé invalide), interface (totaux séparés, mois coûteux, douze mois et grisés, objectif, année future, aucun mois suivi, erreur).

## Critères de validation

- [x] `npm run verifier` passe (384 tests).
- [x] Réel et projeté toujours nommés ; aucun calcul dans l'interface.
- [x] Vérifié à 1342 px et 375 px sur un compte « Essai » (supprimé ensuite).
