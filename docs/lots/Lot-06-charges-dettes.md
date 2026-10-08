# Lot 6 — Charges, enveloppes, ponctuels, dettes

> Statut : **en cours** (08/10/2026) : moteur, serveur et écrans écrits ; tests des écrans et vérification dans le navigateur à faire. Références : `Plan.md` § 6, § 7.2 · `context.md` R6–R11 · `UX.md` § 4.1 (étapes 5 à 7), § 5.11.

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

- [ ] `npm run verifier` passe.
- [ ] Moteur : charge fixe dans le bon mois budgétaire, 31 → fin de mois, enveloppe par mois budgétaire, ponctuel, échéancier (dernière échéance = reste), paiements partiels, dette soldée sans prévision, total du mois.
- [ ] Serveur : isolation, catégories par défaut, paiement qui dépasse le reste refusé, catégorie utilisée non supprimable.
- [ ] Écran : ajouter charge fixe, enveloppe, ponctuel, dette ; noter un paiement ; voir le reste dû baisser.
- [ ] Rendu fidèle au template, sans débordement à 375 px.
