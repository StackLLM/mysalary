# Lot 8 — Suivi mensuel

> Statut : **livré** (08/10/2026), en attente de validation. Références : `Plan.md` § 7.2, § 8 · `context.md` R21–R23 · `UX.md` § 4.7, § 5.3.

## Objectif

Répondre à **« Est-ce que je respecte mon plan ce mois-ci ? »**. Pour un mois budgétaire : chaque ligne prévue à côté de son réel, l'écart, ce qui reste à confirmer. Le mois terminé, on le **clôture** : son bilan est figé.

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Onglet **Vue d'ensemble** de l'écran Mois : reste réel, reste prévu, écart ; estimation de fin de mois pour le mois en cours (R23) | Onglet Semaines : lot 9 |
| **Tableau prévu / réel / écart** par ligne : paie et primes, revenus à part, revenus libres, charges fixes, enveloppes, ponctuels, échéances de dettes, hors plan | Lignes d'épargne : lot 10 (l'épargne n'est jamais une dépense, R11) |
| Action **Confirmer** sur une ligne non confirmée (paiement d'une charge sur place, sinon lien vers l'écran qui la confirme) | Graphique annuel : lot 15 |
| **Graphique de rythme** : dépenses réelles cumulées contre le prévu cumulé, jour par jour | |
| **Clôture** d'un mois passé (R21) : vérification des lignes non confirmées, clôture « quand même » avec mention, bilan figé, lecture seule | |
| **Réouverture** avec trace (R22) | |
| Un mois clôturé n'est **jamais redécoupé** (Plan § 7.1) | |

## Règles de calcul (moteur)

### Lignes du bilan

| Famille | Prévu | Réel | Confirmée quand |
|---|---|---|---|
| Paie (salaire, primes) | ligne prévue de la paie qui finance le mois | ligne reçue | paie reçue |
| Revenu à part | versement prévu dont le mois budgétaire est ce mois | revenu reçu lié | reçu |
| Revenu libre | — | montant reçu | toujours (réel sans prévu) |
| Charge fixe, ponctuel | montant prévu | dépenses liées | payée |
| Enveloppe | budget du mois | dépenses liées du mois | jamais à confirmer |
| Échéance de dette | montant de l'échéancier | part couverte par les paiements | payée |
| Hors plan | — | dépenses hors plan du mois | toujours |

- Écart = réel − prévu, affiché quand la ligne est confirmée (ou enveloppe d'un mois passé). Une ligne non confirmée n'a pas d'écart : son réel n'est pas connu.
- Réel d'une charge = ce qui la couvre, même payé un autre mois (paiement en avance). L'argent sorti réellement dans le mois (lot 7) peut donc différer de la somme des lignes : la différence est une ligne **« Payé pour un autre mois »**, jamais cachée.

### Totaux

```text
Revenus prévus / réels   = somme des lignes de revenus
Charges prévues          = somme des lignes de charges prévues
Sorties réelles          = dépenses + paiements de dettes datés dans le mois (lot 7)
Reste prévu              = revenus prévus − charges prévues
Reste réel               = revenus réels − sorties réelles
Écart                    = reste réel − reste prévu
```

Mois en cours (R23) : **estimation de fin de mois** = (revenus réels + revenus encore attendus) − (sorties réelles + charges encore prévues). Toujours marquée « estimation ».

### Rythme

Prévu cumulé : charges datées à leur date, enveloppes réparties sur les jours du mois au centime près. Réel cumulé : sorties réelles par jour, jusqu'à aujourd'hui.

### Clôture (R21, R22)

- Seul un mois **passé** se clôture.
- Lignes non confirmées → la clôture est refusée avec leur liste ; « Clôturer quand même » la force, et le nombre de lignes non confirmées est gardé.
- À la clôture : le **bilan est figé** (instantané) avec ses dates de début et de fin.
- Mois clôturé : lecture seule. Ajouter, modifier ou supprimer une dépense, un revenu reçu ou un paiement de dette daté dans ce mois est refusé ; la paie qui le finance ne peut plus être modifiée.
- Ses bornes ne bougent plus, même si une paie voisine change : le mois suivant commence le lendemain de sa fin.
- Réouverture : possible, le bilan redevient calculé ; chaque clôture et réouverture est journalisée.

## Données

| Table | Champs |
|---|---|
| `ClotureMois` | `cle`, `debut`, `fin`, `instantane` (bilan JSON), `forcee`, `nonConfirmees`, `clotureLe` |
| `JournalCloture` | `cle`, `action` (`cloture` \| `reouverture`), `le`, `nonConfirmees` — trace |

## Routes

| Route | Rôle |
|---|---|
| `GET /mois/:cle/bilan` | Bilan calculé, ou figé si le mois est clôturé, avec le journal |
| `POST /mois/:cle/cloturer` | `{ forcer? }` — refus 422 avec la liste des lignes non confirmées si `forcer` est absent |
| `POST /mois/:cle/rouvrir` | Rouvre un mois clôturé |

## Écran

Mois › **Vue d'ensemble** (onglet par défaut), **Dépenses** (lot 7), Semaines (lot 9, grisé).

- En-tête du mois commun aux onglets : précédent / suivant, jours restants, badge « Clôturé ».
- Bandeau : Reste réel / Reste prévu ; écart ou estimation de fin de mois.
- Tableau prévu / réel / écart groupé par famille, statut en mots, action Confirmer.
- Graphique de rythme.
- Colonne : « À confirmer » ; carte de clôture (« Octobre est terminé. Vérifie et clôture. ») ; journal.

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Moteur : lignes et totaux d'un mois (paie reçue / prévue, revenu à part, revenu libre, charge payée en avance, enveloppe, dette, hors plan), écart seulement si confirmé, estimation de fin de mois, rythme, bornes figées d'un mois clôturé.
- [x] Serveur : clôture refusée (mois en cours, lignes non confirmées), clôture forcée, bilan figé qui ne bouge plus, écritures refusées dans un mois clôturé, réouverture et journal, isolation.
- [x] Écran : tableau, confirmer, clôturer, rouvrir, lecture seule.
- [x] Rendu fidèle au template, sans débordement à 375 px.

## Résultat

- `npm run verifier` : types OK, **209 tests** OK (partage 18, moteur 82, serveur 50, interface 59), build OK.
- Vérifié dans le navigateur avec un compte « Essai » (supprimé ensuite ; « oussama » n'a pas été touché), salaire de 12 000 DH le 27 :
  - **Octobre (en cours)** : reste réel 8 380 DH, reste prévu 5 651 DH ; salaire reçu 12 500 DH (écart +500) ; estimation de fin de mois +6 151 DH, si les 2 229 DH de charges encore prévues sortent comme prévu.
  - **Septembre (27 août → 27 sept., terminé)** : « Septembre est terminé. Vérifie et clôture. », 1 ligne à confirmer (Internet, en retard). « Payé » sur la ligne → tout est confirmé ; écart avec le plan −250 DH (concert hors plan 450 DH, courses 200 DH sous le budget).
  - **Clôture** : bilan figé, « Clôturé le 8 oct. 2026 », onglet Dépenses en lecture seule. Une dépense datée du 20 sept. est refusée : « Septembre 2026 est clôturé. Rouvre-le pour le modifier. »
  - **Réouverture** : le mois redevient modifiable ; l'historique montre « Rouvert » puis « Clôturé ».
  - 375 px : aucun débordement ; le tableau passe en lignes empilées (statut à droite, prévu / réel / écart dessous).

## Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Test du moteur : un mois « terminé » restait en cours | Comportement voulu (lot 4) : sans la paie suivante, le mois se prolonge. Le test reçoit maintenant la paie suivante. |
| Message de refus « 1 ligne ne est pas confirmée » | « 1 ligne n’est pas confirmée » / « 3 lignes ne sont pas confirmées » |
| Courbe du réel lissée : elle dépassait entre deux dépenses | Tracé en marches, comme le prévu |
| Sur mobile, le tableau défilait de côté et cachait le réel | Lignes empilées sous 640 px, un seul jeu de boutons |
| Bouton rouge « danger » pour clôturer ou rouvrir | Bouton principal ; le rouge reste réservé aux suppressions |

## Écarts et remarques

- **Prévu d'une échéance de dette** : le montant de l'échéancier (et non « ce qui reste attendu » comme dans Mon plan, R9). Une dette payée en avance apparaît donc payée dans le bilan, sans faire baisser le prévu.
- **Ligne « Payé ce mois pour un autre mois » / « Déjà payé un autre mois »** : la différence entre l'argent sorti dans le mois et le réel des lignes (paiement en avance ou en retard). Les totaux restent exacts.
- **Confirmer une paie, un revenu ou une dette** ouvre Mon plan ; une charge fixe ou un ponctuel se paie directement depuis le bilan.
- **Une ligne prévue à venir du mois en cours** (ex. Internet le 12) est listée « À confirmer » avec le statut « Prévu ».
- **Épargne** : absente du bilan jusqu'au lot 10.
