# Lot 7 — Dépenses réelles

> Statut : **livré** (08/10/2026), en attente de validation. Références : `Plan.md` § 6, § 7.2 · `context.md` R10, R11 · `UX.md` § 4.3, § 5.5.

## Objectif

Noter ce qui sort **vraiment**, en moins de 10 secondes, et le rattacher au plan : « ce paiement, c'est mon loyer », « ces courses, c'est l'enveloppe Nourriture », ou « hors plan ». Une charge prévue devient **payée** quand une dépense la couvre.

Le réel ne remplace jamais le prévu : les charges prévues du mois (lot 6) restent identiques. Les deux sont calculés et affichés séparément.

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| **Saisie rapide** d'une dépense : bouton `+` (en-tête et barre mobile), touche `N`, et bouton de l'écran Mois | Saisie rapide d'un revenu reçu ou d'un versement d'objectif : lots 10 et 13 |
| **Rattachement** : charge fixe (une échéance précise), enveloppe, ponctuel, ou hors plan ; proposition automatique selon la catégorie | Tableau prévu / réel / écart par ligne, clôture du mois : lot 8 |
| **« Payé »** : confirmer en un geste une charge prévue (crée la dépense correspondante) | Semaines et rythme : lot 9 |
| Écran **Mois** › Dépenses : choix du mois, liste groupée par jour, filtre par catégorie, total filtré, modifier, supprimer avec « Annuler » | Graphiques du mois : lot 8 |
| Colonne « À payer ce mois » (fixes et ponctuels avec leur statut) et suivi des **enveloppes** (dépensé / budget) | Import des dépenses V0 : lot 16 |

## Règles de calcul (moteur)

### Une dépense

- Date, montant, catégorie, libellé (facultatif : sinon le nom de la catégorie), note.
- **Réelle** : jamais dans le futur.
- Elle compte dans le **mois budgétaire qui contient sa date** (réel = trésorerie).

### Rattachement (R10)

| Lien | Effet |
|---|---|
| **Charge fixe** + échéance (date prévue) | Couvre cette échéance. Payer en avance le loyer du mois suivant est possible : l'échéance du mois suivant devient payée, l'argent sort ce mois-ci. |
| **Enveloppe** | Consomme le budget de l'enveloppe du mois budgétaire de la dépense. |
| **Ponctuel** | Couvre le ponctuel. |
| **Aucun** | Hors plan. |

- Statut d'une charge fixe ou d'un ponctuel prévu : **payée** si les dépenses liées couvrent le montant prévu ; **en partie payée** s'il en manque ; sinon **en retard** (date passée) ou **prévue**. Même règle que les échéances de dettes.
- Une échéance qui ne correspond plus à la charge (jour modifié depuis) se rattache à l'échéance du même mois budgétaire.
- Charge ou ponctuel supprimé : la dépense reste (elle a eu lieu) et passe hors plan.

### Proposition automatique (UX § 4.3)

Pour une date donnée, le moteur liste les lignes rattachables :

1. charges fixes et ponctuels du mois budgétaire de la date, pas encore entièrement payés ;
2. échéances des 10 jours suivant la date (paiement en avance) ;
3. enveloppes actives ce mois-là.

L'écran présélectionne la première ligne de **même catégorie** (« Est-ce le paiement de *Téléphone (349 DH)* ? »). L'utilisateur peut choisir une autre ligne ou « Hors plan ».

### Totaux réels d'un mois budgétaire (§ 7.2)

Dépenses réelles = dépenses (par rattachement : fixe, enveloppe, ponctuel, hors plan) + paiements de dettes du mois.

L'épargne n'est jamais une dépense (R11).

## Données

| Table | Champs |
|---|---|
| `Depense` | `date`, `montant`, `categorieId`, `libelle`, `note?`, `chargeId?`, `echeance?` (date prévue couverte, charge fixe), `ponctuelId?` — **réel** |

Écart avec `Plan.md` § 6 : ajout de `echeance`, pour savoir quelle échéance d'une charge fixe est payée (utile pour un paiement en avance).

## Routes

| Route | Rôle |
|---|---|
| `GET /depenses?mois=` | Suivi du mois : dépenses, paiements de dettes, lignes à payer avec statut, enveloppes, totaux réels |
| `GET /depenses/rattachements?date=` | Lignes proposées pour rattacher une dépense à cette date |
| `POST /depenses` · `PUT/DELETE /depenses/:id` | Dépenses (date future refusée, lien vérifié) |

## Écrans

- **Saisie rapide** (panneau latéral, feuille du bas sur mobile) : montant en premier avec focus, puces des catégories les plus utilisées + « Autre », date (aujourd'hui), rattachement proposé, libellé et note facultatifs. `Entrée` valide. Toast avec « Annuler ». « Ajouter une autre » garde le panneau ouvert.
- **Mois** (`/mois`) : mois précédent / suivant ; bandeau Dépensé (réel) / Reste à payer (prévu), toujours séparés ; liste des dépenses par jour avec filtre de catégorie ; colonne latérale « À payer ce mois » avec bouton « Payé », enveloppes, bouton « Ajouter une dépense ».

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Moteur : dépense dans le bon mois, échéance payée / partielle / en retard, paiement en avance, échéance orpheline, enveloppe consommée, ponctuel payé, totaux réels avec paiements de dettes, propositions.
- [x] Serveur : isolation, date future refusée, lien vers une charge d'un autre compte refusé, échéance inexistante refusée, suppression d'une charge → dépense hors plan, catégorie utilisée par une dépense non supprimable.
- [x] Écran : saisie rapide en quelques gestes, proposition de rattachement, « Payé », filtre, modifier, supprimer avec Annuler.
- [x] Rendu fidèle au template, sans débordement à 375 px.

## Résultat

- `npm run verifier` : types OK, **194 tests** OK (partage 18, moteur 75, serveur 45, interface 56), build OK.
- Vérifié dans le navigateur avec un compte « Essai » (supprimé ensuite ; « oussama » n'a pas été touché). Mois d'octobre 2026 : 28 sept. → 26 oct., 19 jours restants le 8 oct.
  - Bouton `+` de l'en-tête → 3 500 DH, puce Logement : « Est-ce le paiement de « Loyer » ? Échéance du 5 oct. · reste 3 500 DH. » Validé : loyer « Payée ».
  - Touche `N` → 185,50 DH, Alimentation, « Marché » : rattaché à l'enveloppe Courses ; « Noter et en ajouter une autre » rouvre un formulaire vide. Enveloppes restantes 3 100 → 2 914,50 DH.
  - « Payé » sur Internet (prévu le 12 oct.) : dépense de 349 DH datée d'aujourd'hui, ligne « Payée », « Charges à payer » à 0.
  - Supprimer « Marché » puis « Annuler » : la dépense revient avec son rattachement.
  - Paiement de dette du 5 oct. et dépense hors plan du 3 oct. : rangés par jour ; total réel 6 154,50 DH, toujours séparé de l'« Encore prévu ».
  - Le réel ne modifie jamais le prévu : les charges prévues du mois restent identiques (vérifié par un test serveur).
  - 375 px : aucun débordement, saisie en feuille du bas, puces triées par usage. 1024 px : en-tête sans débordement.

## Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Le bouton `+` ajouté à l'en-tête faisait passer « Mon plan » sur deux lignes à 1342 px, et l'en-tête débordait à 1024 px (déjà serré avant) | Liens sur une ligne ; entre 1024 et 1280 px, liens sans icône et espacements réduits |
| Une dépense sans libellé liée au loyer s'appelait « Logement » | Nom = libellé saisi, sinon la ligne du plan payée, sinon la catégorie |
| Sur mobile, la période et le détail des lignes étaient coupés | Jours restants sous le nom du mois ; détail sur deux lignes ; icône de catégorie masquée sous 640 px |

## Écarts et remarques

- **Écran Mois** : seule la partie Dépenses est construite. Le tableau prévu / réel / écart et la clôture arrivent au lot 8, les semaines au lot 9.
- **« Payé »** crée une dépense du montant restant, datée du jour prévu s'il est passé, sinon d'aujourd'hui (jamais dans le futur).
- **Paiement en avance** : proposé pour les échéances des 10 jours suivant la date de la dépense.
- **Paiements de dettes** : ils restent saisis dans Mon plan › Dettes ; l'écran Mois les affiche et les compte dans le réel, sans les modifier.
- **Toast « Ajoutée à novembre »** (dépense datée hors du mois affiché) : non fait ; le toast donne le montant et la ligne rattachée.
