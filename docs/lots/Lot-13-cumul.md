# Lot 13 — Cumul du reste de mois en mois

> Statut : **livré** (09/10/2026), en attente de validation. Demande du 09/10/2026 : « ce qui reste du salaire doit entrer comme cumulé dans le salaire du mois prochain, pour bien savoir ma projection sur les mois prochains ».

## Objectif

Voir l'argent s'accumuler d'un mois à l'autre, comme sur le compte courant : ce qui reste à la fin d'un mois (revenus − charges − épargne versée) est reporté sur le mois suivant. Sur les mois à venir, cela donne une projection du compte.

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Moteur : `cumulDesMois` (report, revenus, charges, épargne, reste, cumul par mois) | Vue calendrier de l'année sur Objectifs : lot 14 |
| Solde de départ du compte courant au début d'un mois (Réglages › Compte courant), découvert permis | Rapprochement avec un relevé bancaire |
| Mois › Vue d'ensemble : bande « Report / Reste du mois / Cumul fin de mois » | |
| Route `GET /cumul?du=&au=` (36 mois au plus) ; `cumul` dans le bilan d'un mois | |

## Règles de calcul (moteur)

```text
Reste du mois  = revenus − charges − épargne
Cumul fin mois = report + reste
Report du mois suivant = cumul fin du mois
```

| Mois | Revenus | Charges | Épargne | Nature affichée |
|---|---|---|---|---|
| Passé | reçus (réel) | dépenses + paiements de dettes (réel) | versée − retirée (réel) | réel |
| En cours | reçus + attendus retenus par le réaliste | sorties réelles + charges encore prévues (lignes non payées, reste des enveloppes, échéances) | versée + versements mensuels pas encore faits | estimation |
| À venir | prévus retenus par le réaliste (garantis + probables) | charges prévues | versements mensuels choisis | prévu |

- **Point de départ** : le solde déclaré dans les Réglages au début d'un mois ; sinon 0 au mois de la première donnée réelle (paie reçue, revenu reçu, dépense, paiement de dette) ; sans aucune donnée, le mois en cours. Les mois d'avant sont marqués « avant le suivi », sans chiffre.
- **L'épargne n'est jamais une charge** (R11) : elle a sa colonne, car elle quitte le compte courant.
- **Deux lectures du même argent** : le cumul suppose que ce qui n'est pas versé à un objectif reste sur le compte ; les projections des Objectifs (lot 10) supposent que ce reste est épargné. Les deux sont des hypothèses, affichées comme telles.

## Données

| Champ | Contenu |
|---|---|
| `Reglages.soldeDepart` | solde du compte courant, en centimes (négatif permis) |
| `Reglages.moisDepart` | mois budgétaire où ce solde s'applique |

Migration `cumul_depart`. `revenusDuMois` est sorti de `capaciteDuMois` (même règle des revenus retenus pour la capacité et le cumul). Le calendrier expose `debutDonnees`.

## Interface

- **Mois › Vue d'ensemble** : sous le bandeau, trois cases — « Report de septembre » (ou « Solde de départ » au premier mois), « Reste du mois », « Cumul fin de mois » — et une phrase qui dit d'où vient le chiffre (réel, estimation, prévu). Un mois d'avant le suivi le dit.
- **Réglages › Compte courant** : mois (les 13 derniers) et solde ; « Enregistrer le solde », « Retirer », « Annuler » dans le toast.

## Tests

323 tests au total (partage 21, moteur 134, serveur 75, interface 93) : +9.

- Moteur : chaîne réel → en cours → prévu, règle du scénario, solde de départ (dont découvert), mois d'avant le suivi, compte sans donnée.
- Serveur : cumul sur 4 mois, bilan avec cumul, solde de départ enregistré puis retiré, plages refusées.
- Interface : bande du cumul dans le mois, solde de départ (saisie invalide, montant négatif, retrait).

## Vérification dans le navigateur

Compte « Essai » (supprimé ensuite) : septembre réel 4 400 DH → octobre en cours +4 500 → 8 900 DH ; décembre prévu 17 900 DH. Avec un solde de 2 000 DH au début d'octobre : « Solde de départ +2 000 », cumul fin octobre 6 500 DH, novembre « Report d'octobre +6 500 ». 1342 px et 375 px sans débordement.

## Corrigé en passant

- Au premier mois, la case disait « Report de septembre » même avec un solde déclaré : elle dit maintenant « Solde de départ ».

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Réel, estimation et prévu toujours nommés.
- [x] Vérifié à 1342 px et 375 px.
