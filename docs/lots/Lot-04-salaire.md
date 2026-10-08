# Lot 4 — Salaire et cycle de paie

> Statut : **clôturé et validé** (07/10/2026). Références : `Plan.md` § 6, § 7.1 · `context.md` § 4.3, R27–R30 · `UX.md` § 4.2, § 5.11.

## Objectif

Décrire son salaire une fois, puis seulement confirmer chaque paie. MySalary en déduit les **mois budgétaires** (de paie à paie) et leurs **semaines**. Tous les lots suivants s'appuient sur ce découpage.

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Contrat de salaire **versionné** : montant net, jour habituel, règle du week-end, « finance le mois suivant », mois d'effet | Primes récurrentes (trimestrielles, annuelles…) et revenus à part : lot 5 |
| Paies **prévues** (calculées depuis le contrat), **en retard**, **reçues** (confirmées) | Clôture d'un mois : lot 8 |
| Primes **ponctuelles** prévues sur une paie, et primes imprévues ajoutées à la réception | Carte « Paie prévue aujourd'hui » sur Aujourd'hui : lot 13 |
| Confirmation : date réelle, montant reçu par ligne, écart affiché ; annulation possible | Jours fériés (seul le week-end est géré) |
| Mois budgétaires : bornes, durée, statut (passé, en cours, à venir), mode calendaire | Budget hebdo, montant par jour : lots 8 et 9 |
| Semaines du mois, semaines partielles, répartition au prorata des jours | |
| Écran **Mon plan › Salaire & primes** | Autres onglets de Mon plan : lots 5, 6, 10 |

## Règles de calcul (moteur)

Le moteur ne lit jamais l'horloge : la date du jour est un paramètre. Les dates sont des dates civiles `AAAA-MM-JJ`, sans fuseau.

### Contrat

- Une **version** s'applique à partir d'un **mois financé** (`moisEffet`), jusqu'à la version suivante.
- Une paie reçue garde une copie de ce qui était prévu : changer le contrat ne modifie jamais une paie reçue (R27).

### Date prévue d'une paie

Pour le mois financé M :

1. Mois de versement = M − 1 si « finance le mois suivant », sinon M.
2. Jour = jour habituel, ou dernier jour du mois s'il n'existe pas (31 → 28 février).
3. Si ce jour tombe un samedi ou un dimanche : lendemain ouvré (`apres`, par défaut : le virement passe par la banque), veille ouvrée (`avant`) ou aucun changement (`aucune`).

### Statut d'une paie

| Statut | Condition |
|---|---|
| Prévue | Non reçue, date prévue aujourd'hui ou plus tard |
| En retard | Non reçue, date prévue passée |
| Reçue | Confirmée avec une date réelle |

### Bornes d'un mois budgétaire (mode cycle de paie)

- **Début** = date réelle de la paie qui le finance, sinon sa date prévue (R28, R30).
- **Fin** = veille du début du mois suivant.
- **Paie en retard** : si la paie précédente est reçue et qu'une seule paie est en retard depuis, le mois en cours se prolonge jusqu'à aujourd'hui inclus ; le mois suivant commence demain (« attendue »). Si plusieurs paies sont en retard, les dates prévues sont gardées et l'écran demande de les confirmer.
- Avant la première version du contrat, les dates suivent le motif de la première version (sans montant).
- Sans contrat : mois civils, avec la mention « ajoute ton salaire ».

**Mode calendaire** : du 1er au dernier jour du mois civil. Les paies restent rattachées à leur mois.

### Confirmation d'une paie

- Date réelle : pas dans le futur ; strictement après la paie du mois précédent et strictement avant celle du mois suivant (réelle si reçue, sinon prévue). Sinon, message clair qui propose de changer de mois financé (R29).
- Montant reçu pour chaque ligne prévue (0 si une prime n'est pas venue), primes imprévues possibles.
- Écart = total reçu − total prévu.
- Annuler une confirmation remet la paie en « prévue » et garde les primes prévues.

### Semaines

Découpées dans le mois budgétaire, à partir du jour de début choisi dans les réglages (lundi par défaut). La première et la dernière peuvent être partielles. Un montant se répartit au prorata des jours, sans perdre un centime (plus fort reste).

## Données

| Table | Champs |
|---|---|
| `ContratSalaire` | `moisEffet` (unique par compte), `montantNet`, `jourHabituel`, `regleJourNonOuvre`, `financeMoisSuivant` |
| `Paie` | `moisFinance` (unique par compte), `dateReelle?`, `datePrevue?` (copie à la réception), `recueLe?` |
| `LignePaie` | `paieId`, `type` (`salaire` \| `prime`), `libelle`, `certitude`, `montantPrevu?`, `montantRecu?`, `ordre` |

Une paie n'est enregistrée que si l'utilisateur agit dessus (prime prévue ou réception). Les autres sont calculées.

## Routes

| Route | Rôle |
|---|---|
| `GET /salaire/contrats` | Versions du contrat |
| `POST /salaire/contrats` | Nouvelle version (« Mon salaire change ») |
| `PUT /salaire/contrats/:id` · `DELETE …/:id` | Corriger ou retirer une version |
| `GET /salaire/paies?du=AAAA-MM&au=AAAA-MM` | Paies calculées sur une plage (36 mois max) |
| `PUT /salaire/paies/:mois/primes` | Primes prévues d'une paie |
| `POST /salaire/paies/:mois/reception` | Confirmer une paie |
| `DELETE /salaire/paies/:mois/reception` | Annuler la confirmation |
| `GET /mois/:cle` | Mois budgétaire : bornes, durée, statut, paie, semaines |
| `GET /mois/courant` | Mois budgétaire qui contient aujourd'hui |

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Tests du moteur : paie du 27/01 → « Février » du 27/01 au 26/02 ; 31 → fin février ; week-end avant / après / aucune ; versions ; paie en avance, en retard, reçue ; mois calendaire ; semaines partielles ; répartition exacte.
- [x] Tests serveur : isolation entre comptes, refus des dates incohérentes, annulation d'une confirmation.
- [x] Écran Mon plan › Salaire : créer le contrat, voir les paies, ajouter une prime, confirmer, refus d'une date incohérente.
- [x] Rendu fidèle au template, sans débordement à 375 px.

## Résultat

- `npm run verifier` : types OK, **109 tests** OK (partage 12, moteur 39, serveur 23, interface 35), build OK.
- Moteur : propriété testée sur 10 ans de dates (les semaines couvrent toujours le mois jour pour jour) et sur 60 mois consécutifs (aucun trou, aucun chevauchement).
- Vérifié dans le navigateur avec un compte de test « Essai », supprimé ensuite. Le compte « oussama » n'a pas été touché.
  - Contrat 10 000 DH le 27 : aperçu « Octobre 2026 irait du 25 sept. au 26 oct. » (le 27/09/2026 est un dimanche ; règle « avant » testée ce jour-là, défaut changé ensuite en « lundi »).
  - Confirmation : la paie passe en « Reçue », le début du mois devient réel, la carte suivante propose novembre.
  - Prime prévue de 1 500 DH sur novembre : total prévu 11 500 DH.
  - Date incohérente refusée sous le champ, saisie conservée.
  - Aucun débordement à 375 px.

## Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| La toute première paie du contrat, non confirmée, était traitée « en retard » : le mois commençait demain (« Octobre irait du 8 au 26 oct. ») | La prolongation ne s'applique que si la paie précédente est reçue. Test ajouté. |
| Choix du mois affiché en anglais (« October 2026 », sélecteur natif) | Liste de mois en français |
| Statut coupé dans le tableau (« Attendue depuis 12 jo… ») | Statut court dans le tableau, complet au survol et dans le panneau |
| « paie de octobre » | Élision : « paie d'octobre », « d'avril », « d'août » (testé) |
| Message « 25 sept.. » et bouton « Annuler » coupé sur deux lignes | Ponctuation et largeur du bouton corrigées |
| Tests : `ResizeObserver` absent de jsdom | Remplaçant installé dans la préparation des tests |

## Écarts et remarques

- **Mois d'effet au lieu de date d'effet** (`Plan.md` § 6 disait `dateEffet`) : une version s'applique à partir d'un mois financé. Plus simple et sans ambiguïté quand le jour de paie change.
- **Paies prévues calculées, pas stockées** : changer le contrat met à jour toutes les paies non reçues ; les paies reçues gardent une copie de ce qui était prévu (R27).
- **Statut « écart »** du plan : calculé (reçu − prévu), pas stocké.
- **Plage des paies** : `?du=&au=` (36 mois max) au lieu de `?annee=`, pour afficher douze mois glissants.
- **Week-end par défaut : lundi suivant** (décision du 07/10/2026 : le virement passe par la banque ; le plan prévoyait la veille ouvrée). Réglable dans le contrat. Jours fériés non gérés.
- La base locale a été sauvegardée avant la migration (copie hors du projet).
