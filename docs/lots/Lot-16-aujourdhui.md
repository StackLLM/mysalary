# Lot 16 — Aujourd'hui

> Statut : **livré** (11/10/2026), en attente de validation. Objectif (UX.md § 5.2) : « où j'en suis », en 5 secondes. Remplace la page d'attente de l'accueil.

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Héros : reste à dépenser du mois, par jour, jours restants ; reste de la semaine | Calendrier jour par jour : lot 17 |
| À faire : paie à confirmer (confirmée sur place), échéances en retard, dépassements | Saisie d'un revenu reçu préremplie depuis une alerte de revenu en retard |
| 7 prochains jours ; bilan de la semaine passée le premier jour de la semaine | |
| Épargne du mois, objectif prioritaire, 1 à 3 suggestions | |
| Ajouter une dépense, noter un revenu reçu, ouvrir le mois | |

## Règles

- **Rien n'est recalculé dans l'interface** : le reste à dépenser, la semaine, l'épargne et l'objectif viennent des indicateurs (lot 12) ; les actions et suggestions des alertes et recommandations (lot 12).
- **7 prochains jours** (moteur `prochainsJours`) : revenus et charges datés d'aujourd'hui à J+6, même à cheval sur deux mois budgétaires ; réel s'il existe, sinon prévu (en italique).
- **Semaine passée** (moteur `semainePassee`) : seulement le premier jour d'une semaine (lundi, ou dimanche selon les Réglages), s'il y a des enveloppes.
- **Paie** : tant qu'elle n'est pas reçue, le mois budgétaire en cours reste le précédent (règle du lot 4) ; le reste à dépenser est marqué « prévu » quand la paie du mois compte sans être confirmée.
- **Reste négatif** : montant en couleur d'alerte, phrase « Le mois est dépassé de … » avec le détail du calcul.

## Données

Route `GET /aujourdhui` (`AujourdhuiDto`) : un seul chargement du calendrier pour les indicateurs du mois en cours, les alertes, les 3 premières recommandations, les 7 prochains jours, la semaine passée et l'état « sans salaire ».

## Interface

- Fil d'Ariane « Aujourd'hui / Lundi 12 octobre 2026 » ; carte principale « Bonjour Prénom », mois budgétaire et ses dates.
- Bandeau héros : à gauche le reste du mois (compteur animé), par jour, jours restants ; à droite la semaine. Sous le bandeau, la phrase du calcul, puis la barre de la semaine.
- « À faire » : « Confirmer la paie » ouvre le panneau de la paie (Mon plan › Salaire) sur la réception, ici même ; les autres actions mènent à l'écran qui les règle.
- « 7 prochains jours » : groupés par jour (« Aujourd'hui », « Demain », « Vendredi 15 janvier »), revenus en vert « + », charges « − », statut en mots.
- Colonne de droite : Épargne du mois (versé sur prévu, taux réel et prévu), Objectif prioritaire (progression, date estimée en projection), Suggestions.
- Boutons : « Ajouter une dépense », « Noter un revenu reçu », « Ouvrir le mois ».
- État vide : « Ajoute ton salaire pour voir ton reste du mois » → Mon plan. Erreur : message et « Réessayer ».

## Tests

353 tests au total (partage 21, moteur 142, serveur 79, interface 111) : +10 depuis le lot 15 et l'ajout des enveloppes.

- Moteur : 7 prochains jours à cheval sur deux mois ; semaine passée le lundi (et le dimanche), rien les autres jours ni sans enveloppe.
- Serveur : compte sans salaire ; reste, semaine en cours et passée, prochains jours, actions, au plus 3 suggestions.
- Interface : chaque bloc, confirmation de la paie sur place, reste négatif, état vide, erreur.

## Vérification dans le navigateur

Compte « Essai » (supprimé ensuite) à 1342 px et 375 px : héros, À faire, prochains jours, épargne, objectif ; paie d'octobre annulée puis confirmée depuis la page : « Paie à confirmer » disparaît et la page se met à jour. Pas de débordement.

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Réel, prévu et projection toujours nommés.
- [x] Vérifié à 1342 px et 375 px.
