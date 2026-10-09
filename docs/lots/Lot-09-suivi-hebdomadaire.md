# Lot 9 — Suivi hebdomadaire

> Statut : **clôturé et validé** (09/10/2026). Références : `Plan.md` § 7.1 (semaines), § 8 (KPI « Reste flexible (semaine) ») · `context.md` R7 · `UX.md` § 4.6, § 5.4.

## Objectif

Répondre à **« Est-ce que je tiens ma semaine ? »**. Le budget flexible du mois (les enveloppes) est réparti sur ses semaines ; chaque semaine montre ce qui était disponible, ce qui a été dépensé, ce qui reste, et la tendance. En tête, une réponse en mots : « Oui, avec 340 DH d'avance » ou « 120 DH au-dessus du rythme prévu ».

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Onglet **Mois › Semaines** : une ligne par semaine du mois budgétaire (lundi → dimanche, réglage « début de semaine ») | Bilan de la semaine passée sur Aujourd'hui (le lundi) : lot 13 |
| Par semaine : budget flexible, report, dépensé, reste, écart, charges prévues datées et payées, tendance | Épargne par semaine : lot 10 (R11) |
| Semaines partielles marquées (« 3 jours »), budget au prorata des jours | Alertes « enveloppe dépassée » dans la cloche : lot 12 |
| Réponse en tête ; KPI **Reste flexible (semaine)** et **montant par jour** pour la semaine en cours | |
| **Ouvrir une semaine** : ses dépenses par jour, ses charges datées, ajouter une dépense | |
| **Report** du reste d'une semaine sur la suivante si le réglage est activé (désactivé par défaut) | |
| État vide sans enveloppe → « Définis tes enveloppes pour suivre la semaine » → Mon plan | |
| Mois clôturé : semaines figées avec le bilan | |

## Règles de calcul (moteur)

### Budget flexible

- **Budget flexible du mois** = somme des enveloppes actives du mois (prévu).
- Il est réparti **jour par jour** sur le mois budgétaire, au centime près (`repartir`). Le budget d'une semaine est la somme de ses jours : une semaine de 3 jours reçoit 3/7 d'une semaine pleine. C'est la même répartition que la courbe de rythme du lot 8.

### Dépensé flexible

- **Dépensé flexible** = dépenses liées à une enveloppe **+ dépenses hors plan**, datées dans la semaine (réel). Le hors plan est une dépense libre : elle consomme la même marge que les enveloppes.
- Les charges fixes, ponctuels et paiements de dettes ne sont **pas** du flexible : ils ont leur propre colonne (prévu daté dans la semaine / payé dans la semaine).

### Par semaine

```text
Disponible = budget flexible + report
Reste      = disponible − dépensé flexible
Écart      = semaine passée   : budget − dépensé
             semaine en cours : budget des jours écoulés (aujourd'hui compris) − dépensé
             semaine à venir  : aucun
Par jour   = semaine en cours : max(0, reste) ÷ jours restants (aujourd'hui compris)
```

- **Report** (réglage `reportHebdo`, désactivé par défaut) : le reste d'une semaine **terminée**, positif ou négatif, s'ajoute au disponible de la semaine suivante **du même mois**. Il ne passe jamais d'un mois à l'autre (le mois a son propre bilan). Sans le réglage, le report vaut 0.
- **Tendance** : dépensé flexible par jour de la semaine (jours écoulés) comparé à la moyenne par jour des **28 jours** qui précèdent la semaine (4 semaines, même si elles sont dans le mois précédent). « Stable » à moins de 10 % d'écart. Pas de tendance si le suivi a commencé moins de 28 jours avant la semaine (première dépense notée) : jamais de moyenne calculée sur des jours vides.

### Réponse en tête (mois)

| Mois | Réponse |
|---|---|
| En cours | Avance = budget des jours écoulés − dépensé flexible à date. ≥ 0 : « Oui, avec X d'avance » ; sinon « X au-dessus du rythme prévu ». |
| Passé | Marge = budget du mois − dépensé flexible. ≥ 0 : « Oui, X de marge » ; sinon « Budget flexible dépassé de X ». |
| À venir | « Mois à venir » : budget prévu seul. |
| Sans enveloppe | État vide, pas de réponse. |

## Routes

| Route | Rôle |
|---|---|
| `GET /mois/:cle/semaines` | Semaines calculées avec le début de semaine et le report de l'utilisateur ; figées si le mois est clôturé |

## Écran

Mois › **Semaines**, avec le même en-tête de mois que les autres onglets.

- Bandeau : réponse en tête, budget flexible du mois, dépensé, avance ou marge.
- Semaine en cours : KPI Reste flexible (semaine), montant par jour, barre dépensé / disponible avec repère du rythme.
- Tableau : semaine (dates, « 3 jours »), disponible, dépensé, reste, écart, tendance ; lignes empilées sous 640 px.
- Ouvrir une semaine : dépenses groupées par jour (modifier), charges prévues datées avec leur statut, « Ajouter une dépense ».
- Colonne : charges datées de la semaine en cours, explication du calcul (« Sur quoi repose ce calcul ? »).

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Moteur : répartition au centime (semaines partielles), dépensé flexible (enveloppe + hors plan), charges datées, écart passé / en cours, par jour, report activé / désactivé (jamais d'un mois à l'autre), tendance et historique insuffisant, réponse en tête, mois sans enveloppe.
- [x] Serveur : route, début de semaine et report des réglages, semaines figées à la clôture, isolation.
- [x] Écran : tableau, semaine ouverte, état vide, mois clôturé.
- [x] Rendu fidèle au template, sans débordement à 375 px.

## Résultat

- `npm run verifier` : types OK, **232 tests** OK (partage 18, moteur 95, serveur 54, interface 65), build OK.
- Moteur : `suiviDesSemaines` (`packages/moteur/src/semaines.ts`, 13 tests dont une propriété : les budgets des semaines font toujours le budget du mois, au centime). Le calendrier expose `sortiesEntre(du, au)` et `debutSuivi`.
- Serveur : `GET /mois/:cle/semaines` ; colonne `ClotureMois.semaines` (migration `semaines_figees`) remplie à la clôture.
- Vérifié dans le navigateur avec un compte « Essai » (supprimé ensuite ; « oussama » n'a pas été touché), enveloppes Courses 3 100 DH + Transport 800 DH, aujourd'hui le vendredi 9 octobre :
  - **Octobre (28 sept. → 26 oct., 29 jours)** : « 151,16 DH au-dessus du rythme prévu » (prévu à date 1 613,84 DH, dépensé 1 765 DH) ;
  - semaine 1 dépassée de 28,57 DH (+46 % contre les 4 semaines précédentes) ; semaine 2 en cours : reste 146,37 DH, soit 48,79 DH par jour pendant 3 jours ; semaine 5 partielle « 1 jour » ;
  - semaine ouverte : dépenses par jour, loyer « Payée », « + Ajouter » propose le 4 oct. pour la semaine 1 (dernier jour passé) ;
  - **Septembre clôturé** : « Oui, 830 DH de marge », semaines figées ; **Août** (sans enveloppe) : état vide avec « Définir mes enveloppes » ;
  - 375 px : aucun débordement, lignes empilées (tendance à droite du nom, montants dessous).

## Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Changer un réglage (mode de période, début de semaine, report) ne recalculait pas les mois déjà affichés | Le réglage enregistré rafraîchit aussi les mois et les dépenses |
| Détail d'une dépense « Transport · Transport · enveloppe » quand l'enveloppe porte le nom de sa catégorie (lot 7) | La ligne du plan n'est répétée que si elle diffère de la catégorie |

## Écarts et remarques

- **Hors plan compté dans le flexible** : une dépense libre consomme la même marge que les enveloppes. Les charges fixes, ponctuels et dettes ont leur propre colonne (prévu daté / payé dans la semaine).
- **Charge payée une autre semaine** : le loyer prévu le 5 et payé le 4 apparaît « Payée » dans la semaine du 5, et l'argent dans « Payé cette semaine » de la semaine du 4.
- **Montants au centime** : un budget qui ne se divise pas juste (3 900 DH sur 29 jours) donne des semaines à 941,43 DH. Aucun arrondi caché : la somme des semaines fait exactement le budget du mois.
- **Mois clôturé avant le lot 9** : il n'a pas de semaines figées ; elles sont calculées (sans mention « figées »).
- **Épargne par semaine** : lot 10.
