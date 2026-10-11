# Lot 19 — Onboarding & import V0

> Statut : **livré** (12/10/2026), en attente de validation. Objectif (UX.md § 4.1, § 5.1 ; `Plan.md` § 7.1 bis) : une première vue utile en moins de 5 minutes.

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Page `/onboarding`, dix étapes, que l'on peut passer ; barre de progression et « étape 3 sur 10 » | Import d'un export MySalary : lot 20 (export et import JSON d'un compte) |
| Étape sauvegardée par compte, reprise, retour arrière sans perte | Étude HTML de la V0 (ses chiffres ne sont pas un fichier de données) |
| Import d'un export money-guru : aperçu groupé par thème, Importer / Modifier / Ignorer, conflits posés en question | Bouton pour relancer l'onboarding depuis les Réglages |
| Lignes importées « importé · à confirmer » aux étapes 3 à 9 | |
| Résumé : mois budgétaire, revenu et charges prévus, capacité d'épargne et date du premier objectif (projection) | |
| Mode « mes revenus varient » | |

## Règles

- **Rien n'est importé comme réel, ni créé sans confirmation.** Le fichier est analysé par le moteur (`analyserMoneyGuru`, fonction pure) qui **propose** des lignes ; l'utilisateur décide. Une ligne acceptée à l'étape 2 reste « importé · à confirmer » jusqu'à son étape, où la confirmer ouvre le formulaire habituel de Mon plan, prérempli. Le fichier brut est archivé (`ImportSource`).
- **Mapping** (Plan.md § 7.1 bis) :
  - **Salaire** : les valeurs contradictoires du fichier (revenu net, montants reçus sur au moins deux mois) sont proposées en question simple ; **aucune n'est retenue d'office**, un salaire ne s'importe pas sans choix. Jour de paie et « finance le mois suivant » sont repris.
  - **Primes** : l'écart d'un mois au-dessus du dernier niveau de salaire (ex. 15 000 = 10 000 + 5 000).
  - **Modèle de dépenses** : Nourriture, Transport, Fun → enveloppes ; Téléphone, Gym, Assurances, Famille → charges fixes (le jour de paiement n'est pas dans le fichier) ; **« Savings » → versement d'épargne, jamais une charge** (R11) ; montants à 0 ignorés.
  - **Noms de personnes ou lignes inconnues du modèle** (Mohamed, Yahya) → « à classer » : dette avec échéancier, aide récurrente, ou ignorée.
  - **Mois à venir qui diffèrent du modèle** → ponctuels prévus ; **le même écart sur trois mois ou plus** → une seule charge fixe proposée (ex. 240 DH par mois).
  - **Objectifs** : cible, mois cible, déjà mis de côté, versement ; un « achat enregistré » n'achève pas l'objectif.
  - **Journal, historique des paies** : informations, jamais importées. Allocation, patrimoine, taux de rendement, fonds d'urgence : non repris, listés.
- **Aucune valeur pré-remplie présentée comme réelle** : les suggestions (téléphone, internet…) n'ont pas de montant ; une valeur importée porte « Importé · à confirmer ».
- **Sauvegarde** : chaque étape écrit dans le plan avec les mêmes formulaires que Mon plan ; l'étape atteinte est enregistrée sur le compte. Revenir en arrière montre ce qui est déjà dans le plan.
- **Comptes existants** : seul un compte **créé** mène à la mise en route ; ouvrir un compte existant mène à Aujourd'hui. Un compte commencé mais pas terminé affiche « Reprendre » sur la page Aujourd'hui.

## Données

- Table `ImportSource` (migration `import_source`) : une par compte, fichier brut et analyse (décision de chaque ligne), supprimée avec le compte.
- Routes : `GET` et `PUT /onboarding` (étape, fin), `POST /import/apercu` (analyse, sans rien écrire dans le plan), `PUT /import/lignes/:id` (décision ou correction d'une ligne), `DELETE /import`.

## Interface

- Étapes : 1 Bienvenue (partir de zéro / importer) · 2 Import · 3 Salaire (contrat, puis dernière paie reçue) · 4 Primes · 5 Charges fixes · 6 Enveloppes · 7 Dettes et ponctuels · 8 Épargne · 9 Premier objectif · 10 Résumé.
- Formulaires réutilisés : contrat, source de revenu, charge, dette, ponctuel, avec une proposition (`prefill`) quand la ligne vient de l'import.
- États : chargement, erreur avec « Réessayer », fichier illisible ou inconnu (« Ce fichier n'est pas un export MySalary ou money-guru. Tu peux continuer sans importer. »), résumé sans salaire.

## Tests

Moteur (analyse : salaire, primes, modèle, ponctuels, charge récurrente, objectifs, journal, fichier abîmé, décisions), serveur (étape, aperçu sans écriture dans le plan, fichier inconnu, décisions, isolation), interface (reprise, import, conflit de salaire, confirmation de chaque étape, résumé, quitter). Le fichier d'exemple des tests est fictif : aucune donnée personnelle dans le dépôt.

## Critères de validation

- [x] `npm run verifier` passe (414 tests).
- [x] Aucune donnée importée comme réelle ; « Savings » jamais en charge.
- [x] Vérifié à 1342 px et 375 px sur un compte « Essai » (supprimé ensuite), avec ton vrai fichier money-guru.
