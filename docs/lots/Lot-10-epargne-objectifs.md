# Lot 10 — Épargne & objectifs

> Statut : **clôturé et validé** (09/10/2026). Références : `Plan.md` § 6 (CompteEpargne, Objectif, VersementObjectif), § 7.2, § 7.4, § 8 · `context.md` R11–R20 · `UX.md` § 4.4, § 5.7, § 5.8, § 5.11.

## Objectif

Savoir **ce qui est de côté**, **à quoi c'est réservé**, et **quand chaque objectif sera atteint**. L'épargne n'est jamais une dépense (R11).

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Mon plan › **Épargne** : comptes (solde déclaré, à quelle date), mouvements (versements, retraits), solde, réservé, disponible, alerte si réservé > solde | Simulateur, leviers « et si », scénarios enregistrés, règles modifiables : lot 11 |
| **Objectifs** : type, nom, cible, déjà mis de côté, date souhaitée, priorité, versement mensuel ; pause, reprise, abandon (archive), suppression | Prudent avec la moyenne réelle des dépenses flexibles : lot 11 |
| Calculs : épargné, restant, progression, effort mensuel et hebdo, date estimée par scénario, risque de retard, répartition de la capacité par priorité | Recommandations chiffrées : lot 12 |
| Page **Objectifs** (liste, ordre de priorité, réalisés repliés) et **Objectif** (détail, trajectoire, versements) | Dates cibles dans le calendrier : lot 14 |
| **Nouvel objectif** avec aperçu en direct (projection) ; fonds de sécurité : cible proposée 3 à 6 mois de charges essentielles | |
| **Achat réalisé** sans double comptage (R19) | |
| Épargne prévue et réelle dans le bilan mensuel (lot 8) et épargne de la semaine (lot 9) | |
| **Saisie rapide d'un versement** (bouton +, onglet « Épargne ») | |

## Données

| Table | Champs |
|---|---|
| `CompteEpargne` | `libelle`, `solde` (déclaré, réel), `auLe` (date de la déclaration) |
| `MouvementEpargne` | `compteId`, `objectifId?`, `date`, `montant` (+ versement, − retrait), `libelle`, `note` — réel. Un versement à un objectif est un mouvement avec `objectifId` (la `VersementObjectif` du plan). |
| `Objectif` | `libelle`, `type` (`moto` \| `voiture` \| `voyage` \| `ordinateur` \| `logement` \| `investissement` \| `securite` \| `autre`), `montantCible`, `montantInitial`, `dateCible?` (mois), `priorite`, `versementMensuel?`, `statut` (`actif` \| `pause` \| `realise` \| `abandonne`), `realiseLe?` |

« Atteint » n'est pas stocké : il se calcule (épargné ≥ cible).

## Règles de calcul (moteur)

### Épargne (R12–R14)

```text
Solde d'un compte = solde déclaré + mouvements datés du jour de la déclaration ou après
Solde             = somme des comptes
Épargné (objectif)= déjà mis de côté + versements
Réservé           = épargné des objectifs actifs ou en pause (non réalisés, non abandonnés)
Disponible        = solde − réservé ; s'il est négatif : 0 et alerte « Tes objectifs réservent X de plus que ton épargne déclarée »
```

- Déclarer un nouveau solde remplace l'ancien à partir de sa date : les mouvements d'avant sont déjà dedans.
- **Achat réalisé (R19)** : l'objectif passe « réalisé » et un retrait de son épargné est enregistré à la date de l'achat. L'achat n'est **pas** une dépense.
- **Abandon** : l'objectif ne réserve plus rien ; l'argent reste dans le solde (disponible).

### Objectif (R16, R17)

```text
Restant        = max(0, cible − épargné)
Progression    = épargné ÷ cible (au plus 100 %)
Mois restants  = du mois budgétaire en cours au mois souhaité, inclus
Effort mensuel = (cible − épargné au début du mois en cours) ÷ mois restants (centime supérieur)
Effort hebdo   = effort mensuel × 12 ÷ 52
```

### Capacité et scénarios (R15, Plan § 7.3)

- **Capacité d'un mois** = revenus prévus retenus par le scénario − charges prévues du mois.
  - Prudent : revenus garantis ; réaliste : garantis + probables ; ambitieux : tous.
  - Mois en cours : revenus déjà reçus (réel) + revenus encore attendus retenus par le scénario − charges prévues − épargne déjà versée ce mois.
- **Répartition (R18)**, chaque mois, objectifs actifs par priorité :
  1. versement mensuel choisi d'abord (sans dépasser le restant ni la capacité) ;
  2. puis le reste de la capacité en cascade : priorité 1 jusqu'à sa cible, puis 2, etc.
  - La somme répartie ne dépasse **jamais** la capacité ; capacité négative → rien.
- **Date estimée** = premier mois où l'épargné projeté couvre la cible (au plus 10 ans ; au-delà : « au-delà de 10 ans »).
- **Risque** (objectif avec date) : sûr (atteint à la date en prudent) · probable (en réaliste) · fragile (en ambitieux) · hors de portée.
- Tout ce qui est futur est **projeté** et affiché comme tel.

### Fonds de sécurité

Cible proposée : 3 à 6 mois de charges essentielles (équivalent mensuel du lot 6), affichée avec son calcul et modifiable.

## Routes

| Route | Rôle |
|---|---|
| `GET /epargne` | Comptes, mouvements, solde, réservé, disponible, alerte |
| `POST /epargne/comptes`, `PUT/DELETE /epargne/comptes/:id` | Comptes ; `PUT` déclare un nouveau solde |
| `POST /epargne/mouvements`, `DELETE /epargne/mouvements/:id` | Versement (avec ou sans objectif) ou retrait |
| `GET /objectifs`, `GET /objectifs/:id` | Liste avec projections ; détail avec trajectoire et versements |
| `POST /objectifs`, `PUT/DELETE /objectifs/:id` | Créer, modifier, supprimer |
| `POST /objectifs/apercu` | Projection d'un objectif pas encore créé (aperçu en direct) |
| `PUT /objectifs/ordre` | Nouvel ordre de priorité |
| `POST /objectifs/:id/statut` | Pause, reprise, abandon |
| `POST /objectifs/:id/realiser` | Achat réalisé |

## Écrans

- **Mon plan › Épargne** : bandeau Solde / Réservé / Disponible ; comptes (déclarer un solde) ; mouvements par date ; alerte si réservé > solde.
- **Objectifs** : bandeau total réservé / disponible ; une carte par objectif (progression, épargné / cible, date estimée, date souhaitée, risque) ; monter / descendre la priorité ; pause ; « Réalisés » et « Abandonnés » repliés ; état vide avec exemples de types.
- **Nouvel objectif** : formulaire à gauche, aperçu projeté à droite (date estimée par scénario, effort, risque), propositions si hors de portée.
- **Objectif** : progression, restant, effort mensuel et hebdo, dates par scénario, risque, trajectoire (réel plein, projeté hachuré, cible), versements ; verser, modifier, pause, réaliser, abandonner.
- **Mois** : lignes « Épargne » dans le bilan (prévu = versements mensuels choisis, réel = versements du mois), hors des charges ; épargne de la semaine dans la semaine ouverte.

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Moteur : solde après déclaration, réservé, disponible et alerte, épargné / restant / progression / effort, répartition (versement fixe puis cascade, jamais plus que la capacité — propriété), date estimée et risque par scénario, achat réalisé, objectif déjà atteint, sans date, en pause.
- [x] Serveur : routes, aperçu, ordre, réalisation (retrait créé, pas de dépense), isolation.
- [x] Écrans : épargne, liste, création avec aperçu, détail, saisie rapide d'un versement.
- [x] Rendu fidèle au template, sans débordement à 375 px.

## Résultat

- `npm run verifier` : types OK, **266 tests** OK (partage 18, moteur 108, serveur 63, interface 77), build OK.
- Moteur : `epargne.ts` (comptes, mouvements, réservé, disponible, fonds de sécurité) et `objectifs.ts` (capacité par scénario, répartition par priorité, projection, date estimée, risque, trajectoire) — 13 tests, dont une propriété : la répartition ne dépasse jamais la capacité ni le restant.
- Serveur : module `epargne` (14 routes), tables `CompteEpargne`, `MouvementEpargne`, `Objectif` (migration `epargne_objectifs`).
- Vérifié dans le navigateur avec un compte « Essai » (salaire 12 000 DH, loyer 3 500 DH, enveloppes 3 900 DH, compte épargne 20 000 DH au 1er oct.) :
  - **Objectifs** : moto 85 000 DH pour juillet 2027 → estimée novembre 2027 (réaliste), mars 2028 (prudent), « Hors de portée », 7 500 DH par mois nécessaires ; deux leviers chiffrés (repousser à novembre 2027, verser 7 500 DH par mois) ;
  - **Fonds de sécurité** proposé : charges essentielles 6 600 DH par mois → 19 800 à 39 600 DH ; créé depuis la carte avec aperçu en direct (février 2028 en réaliste) ;
  - **Saisie rapide** : « De l’épargne » → 500 DH versés au fonds ; **Mon plan › Épargne** : solde 23 500 DH, réservé 13 500 DH, disponible 10 000 DH ;
  - **Mois** : lignes d’épargne dans le bilan (Moto 2 000 DH réel, Permis 1 000 DH prévu et réel) ;
  - 375 px : aucun débordement (liste, détail, création, épargne, mois).

## Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Le versement mensuel déjà fait ce mois-ci était projeté une seconde fois | Au mois en cours, le versement choisi est diminué de ce qui a déjà été versé à l’objectif |
| « 1 000 DH / mois nécessaires » affiché avec « Hors de portée » pour un objectif qui verse déjà 1 000 DH | L’effort se calcule depuis le début du mois en cours : il se compare au versement mensuel |
| Saisie rapide d’épargne : le montant tapé se perdait (focus donné avant le chargement) | Focus donné une fois l’épargne chargée |
| Mois abrégés « octo. », « déce. » sur la trajectoire | Abréviations françaises (« oct. », « déc. », « janv. 27 ») |
| Badge « Hors de portée » coupé sur deux lignes à 375 px | Badge sur une ligne |

## Écarts et remarques

- **Types d’objectif** : ceux de `UX.md` § 4.4 (moto, voiture, voyage, ordinateur, logement, investissement, fonds de sécurité, autre) au lieu des quatre de `Plan.md` § 6. Ils ne servent qu’à l’icône et aux suggestions.
- **`VersementObjectif`** devient `MouvementEpargne` avec `objectifId` : un versement, un retrait ou un achat passe toujours par un compte d’épargne. Sans compte, la saisie invite à en déclarer un.
- **Statut « atteint »** calculé, pas stocké.
- **Capacité du mois en cours** : revenus reçus + attendus retenus − (sorties réelles + charges encore prévues) − épargne déjà versée.
- **Cascade** : sans versement mensuel, un objectif reçoit ce qui reste de la capacité selon sa priorité ; la projection suppose donc que tout le reste du mois est épargné (affiché comme projection, avec ses hypothèses).
- **Prudent** ne retient pour l’instant que les revenus garantis ; la moyenne réelle des dépenses flexibles arrive au lot 11.
- **Réorganiser** : boutons monter / descendre (accessibles au clavier) au lieu du glisser-déposer.
- **Bilans figés avant le lot 10** : pas de lignes d’épargne (`epargne: null`).
