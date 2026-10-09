# Lot 12 — Recommandations & KPI

> Statut : **livré** (09/10/2026), en attente de validation. Références : `Plan.md` § 7.5, § 8 · `context.md` R24–R26 · `UX.md` § 1 (calme), § 3 (cloche), § 5.2, § 7, § 9.

## Objectif

Dire **quoi faire**, chiffres à l'appui, sans jamais promettre : des alertes quand une action est utile (cloche), des recommandations expliquées, et les huit indicateurs de `Plan.md` § 8 calculés dans le moteur.

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| **Huit KPI** calculés dans le moteur (`indicateurs`), route `GET /indicateurs?mois=` | Page Aujourd'hui qui les assemble : lot 13 |
| **Alertes** (`alertes`) : paie en retard ou attendue aujourd'hui, revenu en retard, échéance en retard, enveloppe dépassée, budget de la semaine dépassé, objectifs au-delà de l'épargne déclarée | Notifications système, e-mails |
| **Recommandations** (`recommandations`) : règles explicites, chacune avec message, montant, impact, base de calcul, condition, niveau de confiance | Conseils d'investissement (R26), score global |
| **Cloche** de l'en-tête : pastille (nombre d'alertes), panneau « À faire » + « Suggestions » | |
| **Mois › Vue d'ensemble** : carte « Indicateurs » | |
| **Objectifs** : carte « Suggestions » (recommandations liées aux objectifs) | |

## Règles de calcul (moteur)

### KPI (`Plan.md` § 8)

| KPI | Calcul retenu |
|---|---|
| Reste à dépenser (mois en cours) | revenus reçus − sorties réelles − charges datées encore à payer − épargne prévue restante. Avant la paie du mois : la paie prévue remplace la reçue, résultat marqué « prévu ». Par jour = reste ÷ jours restants. |
| Reste flexible (semaine) | disponible − dépensé flexible de la semaine en cours (lot 9), et par jour |
| Taux d'épargne | réel : épargne réelle ÷ revenus reçus ; prévu : épargne prévue ÷ revenus prévus |
| Taux de charges | réel : sorties réelles ÷ revenus reçus ; prévu : charges prévues ÷ revenus prévus |
| Écart prévu / réel | mois terminé : sorties réelles − charges prévues ; mois en cours : sorties réelles à date − prévu cumulé à date (rythme). En DH et en % du prévu |
| Part variable du revenu | primes et revenus variables ÷ revenus prévus des 12 prochains mois (toutes certitudes) |
| Progression objectif | épargné ÷ cible de l'objectif prioritaire (actif, priorité la plus haute) |
| Délai avant objectif | date estimée (réaliste) et écart en mois avec la date souhaitée |

Un taux sans revenu est vide (« — »), jamais 0 %.

### Alertes (cloche)

| Alerte | Quand | Action |
|---|---|---|
| Paie en retard | paie prévue passée, pas confirmée | Confirmer la paie |
| Paie prévue aujourd'hui | date prévue = aujourd'hui | Confirmer la paie |
| Revenu en retard | revenu versé à part, date passée, pas reçu | Noter le revenu |
| Échéance en retard | charge fixe, ponctuel ou échéance de dette du mois en cours ou du mois précédent (non clôturé), pas payée | Ouvrir le mois / les dettes |
| Enveloppe dépassée | mois en cours, dépensé > budget | Voir les dépenses |
| Semaine dépassée | semaine en cours, dépensé flexible > disponible | Voir la semaine |
| Épargne à réajuster | objectifs réservent plus que l'épargne déclarée (R14) | Ouvrir l'épargne |

Les mois clôturés ne génèrent aucune alerte. Pas d'alerte « tout va bien » (calme).

### Recommandations

Chacune rend : message, montant, impact, base de calcul, condition (« si tes revenus et tes dépenses restent conformes au plan »), confiance.

| Règle | Déclencheur | Calcul | Confiance |
|---|---|---|---|
| Fin de mois | estimation de fin de mois < 0 | dépenser X de moins d'ici la fin du mois, soit X ÷ jours restants par jour | moyenne |
| Effort pour tenir la date | objectif actif daté, non atteint, risque probable / fragile / hors de portée | effort mensuel et hebdo (lot 10) | élevée (restant réel ÷ mois) |
| Réduire une enveloppe | premier objectif à risque ; plus grosse enveloppe non essentielle | réduction = 10 % du budget arrondi à 100 DH (au moins 100 DH) ; gain en mois (projection réaliste) ; proposée si gain ≥ 1 mois | moyenne |
| Mettre de côté une prime | premier objectif à risque ; prochaine prime prévue (6 mois) | date de l'objectif avec et sans la prime (réaliste) ; proposée si gain ≥ 1 mois | selon la certitude de la prime |
| Affecter l'épargne disponible | premier objectif à risque ; épargne disponible ≥ 100 DH | date avec le disponible ajouté au « déjà mis de côté » ; proposée si gain ≥ 1 mois | moyenne |
| Fonds de sécurité | aucun objectif « fonds de sécurité » ; charges essentielles > 0 | 3 mois de charges essentielles | élevée |

- Réduction : si 10 % ne fait gagner aucun mois, 20 % est essayé ; sinon rien n'est proposé.
- Prime retenue par le réaliste (garantie ou probable) : on compare la date avec et sans elle ; prime incertaine : la date sans, puis avec.
- Le mois précédent n'alerte que si le suivi avait déjà commencé (une dépense notée avant sa fin) : pas d'alerte sur l'avant-MySalary.

Formulations interdites : toute garantie (« tu auras », « sûr »). Toujours « environ », « si… ».

## Routes

| Route | Rôle |
|---|---|
| `GET /indicateurs?mois=` | les huit KPI d'un mois (mois en cours par défaut) |
| `GET /recommandations` | `{ alertes, recommandations }`, textes rédigés (partage) |

## Interface

- **Cloche** (en-tête, bureau et mobile) : pastille rouge avec le nombre d'alertes ; panneau « Notifications » (à droite sur bureau, feuille du bas sur mobile) avec « À faire » puis « Suggestions ». Chaque suggestion : message, effet, bouton d'action, et « Sur quoi repose ce calcul ? » qui déplie calcul, condition et confiance. Le panneau se ferme quand on suit une action.
- **Mois › Vue d'ensemble** (mois en cours ou passé non clôturé) : carte « Indicateurs », un chiffre par question, la base de chaque calcul sous « Sur quoi reposent ces calculs ? ».
- **Objectifs** : carte « Suggestions » avec les leviers chiffrés (réduction, prime, épargne disponible) ; l'effort et le fonds de sécurité y étaient déjà.
- **Simulateur** : « Simuler » depuis une suggestion pré-remplit l'objectif et la réduction (`?objectif=&reduction=&montant=`).
- Les indicateurs et la cloche sont rangés sous la clé de cache « mois » : toute saisie qui recalcule les mois les recalcule aussi (vérifié : marquer « Internet » payé fait passer la pastille de 3 à 2).

## Écarts et décisions

1. **Reste à dépenser** : `Plan.md` § 8 dit « revenus réels − dépenses réelles − épargne prévue restante ». J'ai aussi retiré les **charges datées encore à payer** (loyer, internet, échéances) : sinon le loyer pas encore payé paraît disponible. Le budget restant des enveloppes, lui, reste à dépenser.
2. **Part variable** : calculée sur les 12 prochains mois budgétaires (prévu, toutes certitudes), pas sur les 12 derniers : l'historique est trop court au début.
3. **Écart au plan** du mois en cours : comparé au prévu cumulé à date (comme le graphique du rythme), pas au prévu du mois entier.
4. **« Scénario actif »** du délai avant objectif : le réaliste (il n'y a pas de scénario actif choisi par l'utilisateur).
5. Les phrases sont rédigées dans `packages/partage` (pas dans le moteur, qui ne formate rien), et rendues par l'API.
6. Pas de page dédiée : la page Aujourd'hui (lot 13) reprendra 1 à 3 recommandations et les KPI.

## Fichiers

- Moteur : `indicateurs.ts`, `recommandations.ts` (+ tests).
- Partage : `conseils.ts` (rédaction, `CONFIANCES`, DTO) (+ tests).
- Serveur : module `conseils/` (`GET /indicateurs`, `GET /recommandations`), `essentielMensuel` sorti de l'épargne vers `charges/depot.ts` (+ `test/conseils.test.ts`).
- Interface : `features/conseils/` (`requetes.ts`, `saisie.ts`, `Conseils.tsx` : `Cloche`, `CarteIndicateurs`, `ListeAlertes`, `ListeRecommandations`), branchements dans `Entete`, `OngletEnsemble`, `PageObjectifs`, `PageSimulateur`.

## Tests

314 tests au total (partage 21, moteur 130, serveur 72, interface 91) : +26 depuis le lot 11.

- Moteur : chaque KPI (dont « prévu » avant la paie, mois terminé, mois à venir, taux vide sans revenu) ; chaque alerte (déclenchement, mois clôturé muet) ; chaque recommandation (déclenchement, calme sans objectif à risque, données jamais modifiées).
- Partage : textes exacts, élision (« au lieu d'avril »), aucune formulation de garantie, une condition partout.
- Serveur : routes, validation du mois, isolation par compte.
- Interface : cloche (pastille, panneau, dépliage, liens), carte Indicateurs, pré-remplissage du simulateur.

## Corrigé en passant

- « au lieu de avril 2029 » → « au lieu d'avril 2029 ».
- Dépassement de la semaine affiché au centime (« 1 483,31 DH ») → arrondi (« environ 1 484 DH ») dans l'alerte.
- Écart en % mal arrondi pour un négatif (−20,5 % → « −20 % ») → « −21 % ».
- Alertes de paie et d'échéances du mois précédent pour un compte qui venait de commencer → plus d'alerte sur l'avant-suivi.

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Chaque règle a un test moteur (déclenchement et non-déclenchement).
- [x] Aucune phrase de garantie : test sur tous les textes produits.
- [x] Cloche, Indicateurs et Suggestions vérifiés à 1342 px et 375 px (sans débordement), compte « Essai » supprimé ensuite.
