# Lot 6 — Charges, enveloppes, ponctuels, dettes

> Statut : **clôturé et validé** (08/10/2026). Références : `Plan.md` § 6, § 7.2 · `context.md` R6–R11 · `UX.md` § 4.1 (étapes 5 à 7), § 5.11.

## Objectif

Décrire une fois ce qui sort chaque mois. MySalary en déduit les **charges prévues** de chaque mois budgétaire, par type et par catégorie. Une dette est un **échéancier** : elle disparaît des prévisions une fois soldée (R9).

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| **Catégories** par défaut, créées au premier usage, groupées : essentiel, flexible, engagement ; ajout d'une catégorie depuis un formulaire | Écran Réglages › Catégories (renommer, fusionner) : plus tard |
| **Charges fixes** : montant, jour, fréquence (mensuelle, trimestrielle, annuelle, mois choisis), début, fin, essentielle | Dépenses réelles et lien « payé » : lot 7 |
| **Enveloppes** : budget flexible par mois budgétaire (nourriture, transport, loisirs) | Répartition par semaine affichée : lot 9 |
| **Ponctuels** : charge unique datée (assurance de décembre, permis), avec certitude | Prévu vs réel du mois, clôture : lot 8 |
| **Dettes** : total, mensualité, première échéance → échéancier ; **paiements** réels ; reste dû ; soldée | Import V0 (Mohamed, Yahya « à classer ») : lot 16 |
| Onglets **Charges & enveloppes** et **Dettes** de Mon plan | |

## Règles de calcul (moteur)

### Charges fixes

- Mêmes fréquences que les revenus (lot 5), sauf « une seule fois » : c'est un ponctuel.
- Le mois d'une charge fixe est le **mois civil où elle est payée**. Sa date : le jour choisi (31 → dernier jour du mois).
- Elle compte dans le **mois budgétaire qui contient sa date**. Comme les mois budgétaires suivent les paies, un mois peut exceptionnellement contenir deux fois une charge du 27 et le suivant aucune : c'est la réalité de la trésorerie.

### Enveloppes

- Un montant **par mois budgétaire**, du mois de début au mois de fin (mois budgétaires).
- Pas de date : l'argent se dépense au fil du mois.

### Ponctuels

- Une date, un montant, une certitude. Comptés dans le mois budgétaire qui contient la date.

### Dettes (R9)

- Échéancier : la mensualité chaque mois à partir de la première échéance, la dernière échéance = le reste.
- Reste dû = total − paiements réels.
- Une échéance est **payée** quand le cumul des paiements couvre le cumul des échéances jusqu'à elle ; **partielle** s'il en manque une partie ; sinon **en retard** (date passée) ou **prévue**.
- Montant encore attendu d'une échéance = ce qui manque pour la couvrir. La somme des montants attendus vaut toujours le reste dû.
- Un paiement ne peut pas dépasser le reste dû : message clair, pas de blocage silencieux.
- Soldée (reste = 0) : plus aucune prévision, la dette passe en « Terminées ».

### Total d'un mois budgétaire

Charges prévues = charges fixes datées dans le mois + enveloppes du mois + ponctuels du mois + montants attendus des échéances du mois.

L'épargne n'est jamais une charge (R11).

## Données

| Table | Champs |
|---|---|
| `Categorie` | `libelle`, `icone`, `groupe` (`essentiel` \| `flexible` \| `engagement`), `ordre` |
| `Charge` | `libelle`, `categorieId`, `nature` (`fixe` \| `enveloppe`), `montant`, `frequence`, `mois`, `jour?`, `debut`, `fin?`, `essentielle` |
| `Ponctuel` | `libelle`, `categorieId`, `montant`, `date`, `certitude` |
| `Dette` | `libelle`, `creancier`, `montantTotal`, `mensualite`, `premiereEcheance`, `note?` |
| `PaiementDette` | `detteId`, `date`, `montant`, `note?` — **réel** |

Écart avec `Plan.md` § 6 : l'échéancier n'est pas stocké ligne par ligne (`EcheanceDette`), il est **calculé** depuis la mensualité et la première échéance. Plus simple, et toujours cohérent avec le total.

## Routes

| Route | Rôle |
|---|---|
| `GET/POST /categories` · `PUT/DELETE /categories/:id` | Catégories (suppression refusée si utilisée) |
| `GET/POST /charges` · `PUT/DELETE /charges/:id` | Charges fixes et enveloppes |
| `GET/POST /ponctuels` · `PUT/DELETE /ponctuels/:id` | Ponctuels |
| `GET/POST /dettes` · `PUT/DELETE /dettes/:id` | Dettes, avec échéancier et état calculés |
| `POST /dettes/:id/paiements` · `DELETE /dettes/:id/paiements/:paiementId` | Paiements réels |
| `GET /charges/resume` | Mois en cours par type et par groupe, équivalent mensuel, prochains paiements |

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Moteur : charge fixe dans le bon mois budgétaire, 31 → fin de mois, enveloppe par mois budgétaire, ponctuel, échéancier (dernière échéance = reste), paiements partiels, dette soldée sans prévision, total du mois.
- [x] Serveur : isolation, catégories par défaut, paiement qui dépasse le reste refusé, catégorie utilisée non supprimable.
- [x] Écran : ajouter charge fixe, enveloppe, ponctuel, dette ; noter un paiement ; voir le reste dû baisser.
- [x] Rendu fidèle au template, sans débordement à 375 px.

## Résultat

- `npm run verifier` : types OK, **166 tests** OK (partage 18, moteur 64, serveur 37, interface 47), build OK.
- Vérifié dans le navigateur avec un compte de test « Essai » (supprimé ensuite ; le compte « oussama » n'a pas été touché), salaire le 27, mois budgétaire d'octobre 2026 = 28 sept. → 26 oct. (le 27 sept. est un dimanche).
  - Loyer 3 500 DH le 5, saisi depuis l'écran ; téléphone 349 DH en janvier, avril, juillet et octobre (116,33 DH par mois en moyenne) ; enveloppes Courses 2 500 DH et Sorties 600 DH ; ponctuel Assurance auto 2 400 DH le 15 déc. 2026.
  - Prêt voiture 9 000 DH à 2 000 DH par mois dès le 10 sept. : échéancier de 5 échéances (la dernière = 1 000 DH, janvier 2027), échéance de septembre « en retard ».
  - Paiement de 3 000 DH noté depuis l'écran : reste dû 9 000 → 6 000 DH, septembre payée, octobre « en partie payée, reste 1 000 DH », charges d'octobre 8 949 → 7 949 DH.
  - Paiement de 7 000 DH refusé : « Ce paiement dépasse le reste dû (6 000 DH). »
  - Avance de 1 500 DH remboursée en une fois : rangée dans « Terminées », plus aucune prévision.
  - Aucun débordement à 375 px (les tableaux défilent dans leur carte, comme aux lots 4 et 5).

## Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Un mois budgétaire pouvait couvrir trois mois civils : charges du 3e oubliées | Parcours de tous les mois civils entre le début et la fin du mois budgétaire |
| Calculs (part d'un total, budget par jour) dans un composant | Déplacés dans `saisie.ts` (`part`, `montantParJour`) |
| Colonnes coupées : « Le 5 de chaque m… », « 116,… », « Banque P… » | Colonnes rééquilibrées ; libellé raccourci en « Le 5, chaque mois » ; texte complet au survol quand il reste trop long |
| Interrupteur « Essentielle » sans nom pour les lecteurs d'écran | Nom accessible ajouté au composant `Interrupteur` |

## Écarts et remarques

- **Échéancier calculé, pas stocké** (voir § Données) : modifier la mensualité recalcule l'échéancier, les paiements notés restent.
- **Une échéance en retard d'un mois passé** reste dans ce mois-là (son montant prévu y est conservé) ; elle est signalée « Échéance en retard » dans l'onglet Dettes, pas reportée dans le mois en cours. Le report éventuel se décidera au lot 8 (clôture du mois).
- **« À payer bientôt »** liste les sorties datées d'aujourd'hui à la fin du mois budgétaire suivant (six au plus).
- **Écran Réglages › Catégories** (renommer, fusionner) reporté ; on peut déjà créer une catégorie depuis un formulaire.
