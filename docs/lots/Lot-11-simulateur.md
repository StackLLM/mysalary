# Lot 11 — Simulateur & scénarios

> Statut : **livré** (09/10/2026), en attente de validation. Références : `Plan.md` § 6 (Scenario, Reglages.reglesScenarios), § 7.3 · `UX.md` § 4.5, § 5.9, § 5.12 · `context.md` R5.

## Objectif

Répondre aux questions **« et si »** sans jamais toucher aux données tant qu'on n'applique pas : « Si j'épargne X par mois, quand ? », « Combien par mois pour tenir la date ? », « Impact d'une prime ? ».

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Page **Simulateur** (`/simulateur`, raccourci `S`) : trois scénarios côte à côte, leviers, graphique de l'épargne (réel plein, projeté hachuré) | Recommandations automatiques : lot 12 |
| **Leviers** : versement mensuel vers un objectif, date cible, prime supplémentaire (montant + mois), réduction d'une enveloppe ou d'une charge fixe, horizon 6 / 12 / 24 / 36 mois | Scénario « perso » avec ses propres règles de revenus |
| **Trois questions prêtes** qui règlent les leviers | |
| **Règles des scénarios** modifiables dans Réglages (revenus retenus, dépenses flexibles du prudent), affichées à côté de chaque projection ; elles valent aussi pour les Objectifs (lot 10) | |
| **Prudent** : dépenses flexibles = moyenne réelle des 3 derniers mois si elle dépasse le prévu (Plan § 7.3) | |
| **Enregistrer** un scénario (nom + leviers), le rouvrir, le supprimer | |
| **Appliquer au plan** avec confirmation et résumé des changements | |

## Règles de calcul (moteur)

### Règles des scénarios (réglables)

| Scénario | Revenus retenus (défaut) | Dépenses flexibles (défaut) |
|---|---|---|
| Prudent | garantis | moyenne réelle des 3 derniers mois terminés si plus élevée que le budget des enveloppes |
| Réaliste | garantis + probables | prévues |
| Ambitieux | garantis + probables + incertains | prévues |

- Les revenus garantis sont toujours retenus. Un revenu incertain n'entre jamais dans le réaliste par défaut (R5).
- Moyenne réelle des dépenses flexibles = (dépenses d'enveloppes + hors plan) des 3 derniers mois budgétaires terminés qui ont des dépenses notées ; aucune moyenne sans historique.

### Leviers (ajustements, jamais enregistrés dans les données)

- **Versement** vers un objectif : remplace son versement mensuel choisi.
- **Date cible** : remplace la date souhaitée (effort, risque).
- **Prime** : + montant dans le mois budgétaire choisi, dans les trois scénarios.
- **Réduction** d'une enveloppe ou d'une charge fixe : − montant chaque mois à partir du mois suivant (au plus le montant prévu de la charge ce mois-là).
- **Horizon** : nombre de mois projetés (6, 12, 24, 36) ; au-delà de 24 mois, avertissement « Plus l'horizon est long, plus la projection est incertaine ».

### Projection de l'épargne

```text
Épargne projetée (fin du mois m) = solde actuel + Σ capacités des mois jusqu'à m (signées : une capacité négative puise dans l'épargne)
Réservé projeté                  = épargné des objectifs + versements répartis (R18, jamais plus que la capacité)
```

- **Alertes** : mois où les versements choisis dépassent la capacité ; épargne projetée négative. Pas de blocage, un message clair.
- **Réel passé** : épargne à la fin des 6 derniers mois, reconstituée depuis les soldes déclarés et les mouvements, seulement à partir de la première date connue.
- Pour chaque objectif : date estimée par scénario **sans** et **avec** les leviers, et l'écart en mois (« avance de 2 mois »).

### Appliquer au plan

| Levier | Changement |
|---|---|
| Versement | `versementMensuel` de l'objectif |
| Date cible | `dateCible` de l'objectif |
| Prime | nouvelle source de revenus « unique », probable, datée au début du mois budgétaire choisi |
| Réduction | la charge se termine ce mois-ci ; une copie au nouveau montant commence le mois suivant (les mois passés gardent leur prévu) |

## Données

| Table / champ | Contenu |
|---|---|
| `Scenario` | `nom`, `ajustements` (JSON des leviers), `horizon` |
| `Reglages.reglesScenarios` | JSON des règles ; vide = règles par défaut |

## Routes

| Route | Rôle |
|---|---|
| `POST /simulations/executer` | `{ ajustements, horizon }` → projection (aucune écriture) |
| `POST /simulations/appliquer` | `{ ajustements }` → modifie le plan, rend le résumé |
| `GET/POST /scenarios`, `PUT/DELETE /scenarios/:id` | Scénarios enregistrés |
| `GET/PUT /reglages` | `reglesScenarios` en plus |

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Moteur : règles par scénario (revenus, moyenne flexible du prudent), chaque levier, épargne projetée signée, alertes, réel passé, écart de date avec / sans leviers ; propriété : une simulation ne modifie jamais le réel.
- [x] Serveur : exécuter sans écrire, appliquer (chaque levier, résumé), scénarios, règles, isolation.
- [x] Écran : leviers, questions prêtes, enregistrer, appliquer avec confirmation, règles dans Réglages, raccourci `S`.
- [x] Rendu fidèle au template, sans débordement à 375 px.

## Résultat

- `npm run verifier` : types OK, **288 tests** OK (partage 18, moteur 116, serveur 69, interface 85), build OK.
- Moteur : `simulation.ts` (`simuler`), règles et leviers dans `objectifs.ts` (`REGLES_SCENARIOS_DEFAUT`, `moyenneFlexible`, `avecAjustements`), `soldeAu` dans `epargne.ts` — 8 tests, dont une propriété : une simulation ne modifie jamais les données.
- Serveur : module `simulation` (6 routes), table `Scenario`, colonne `Reglages.reglesScenarios` (migration `scenarios`) ; les Objectifs utilisent les règles des Réglages.
- Vérifié dans le navigateur avec le compte « Essai » du lot 10 (supprimé ensuite ; « oussama » n'a pas été touché) :
  - **Simulateur** : épargne aujourd’hui 23 500 DH ; dans 12 mois 91 700 DH (réaliste), 75 200 DH (prudent : sans les 1 500 DH de cours probables) ;
  - **« Impact d’une prime ? »** + 5 000 DH en novembre : réaliste 96 700 DH ; moto 1 mois plus tôt (octobre 2027), fonds de sécurité 1 mois plus tôt, permis sans changement ;
  - **Appliquer au plan** : confirmation avec résumé, puis source « Prime (simulation) » unique et probable créée dans Autres revenus ;
  - **Réglages › Scénarios** : revenus retenus et dépenses flexibles par scénario ;
  - 375 px : aucun débordement (simulateur, réglages).

## Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Couleurs des scénarios : deux tons de sauge trop proches (validateur de palette : échec) | Trio orange / violet / bleu de la palette du lot 2 (validateur : tout passe), plus un tracé de tirets différent par scénario |
| Mois de la prime tronqué (« novembre 20… ») | Mois courts (« nov. 2026 ») |
| Étiquette « Aujourd’hui » sur la graduation du haut | Marge du graphique |
| Résumé de confirmation : une liste dans un paragraphe (HTML invalide) | La description de `Confirmation` est un bloc |
| Raccourcis clavier : erreur si l’évènement ne vient pas d’un élément | Vérification de la cible |

## Écarts et remarques

- **Prudent** : la moyenne réelle des dépenses flexibles n’existe qu’avec au moins un mois terminé qui a des dépenses notées ; sinon le prudent garde le budget prévu.
- **Leviers** : un levier de chaque sorte (un objectif, une prime, une réduction) ; le moteur et les scénarios enregistrés acceptent plusieurs primes et réductions.
- **Prime appliquée** : source « unique » et probable, datée au premier jour du mois budgétaire choisi (le 27 ou 28 du mois civil précédent en cycle de paie).
- **Réduction appliquée** : la charge s’arrête ce mois-ci et une copie réduite commence le mois suivant (les mois passés gardent leur prévu). Les dépenses déjà liées restent sur l’ancienne charge.
- **Questions prêtes** : elles règlent les leviers et répondent avec la simulation en cours (réaliste).
- **Scénario « perso »** de `Plan.md` § 6 : non fait ; les trois scénarios ont des règles réglables.
