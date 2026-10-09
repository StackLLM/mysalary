# MySalary — Progression

> Suivi de la construction de MySalary, lot par lot. Mis à jour à chaque lot.
> État au 09/10/2026 : **lots 0 à 11 clôturés et validés**, **lot 12 livré, en attente de validation**, lots 13 à 19 à venir.
>
> - Plan global de l'application (vision, architecture, données, règles métier) : [`Plan.md`](../Plan.md), à la racine.
> - Bilan détaillé de chaque lot livré (périmètre, règles, tests, bugs corrigés) : [`docs/lots/`](lots/).

## 0. Sommaire des lots

| Lot | Nom | Phase | Statut | Validé le | Tests | Détail |
|---|---|---|---|---|---|---|
| 0 | [Cadrage](#lot-0--cadrage) | 0 — Cadrage | ✅ Clôturé | 07/10/2026 | — | [Plan.md](../Plan.md) |
| 1 | [Socle](#lot-1--socle) | 1 — Fondations | ✅ Clôturé | 07/10/2026 | 28 | [Lot-01-socle.md](lots/Lot-01-socle.md) |
| 2 | [Design system](#lot-2--design-system) | 1 — Fondations | ✅ Clôturé | 07/10/2026 | 39 | [Lot-02-design-system.md](lots/Lot-02-design-system.md) |
| 3 | [Profils & réglages](#lot-3--profils--réglages) | 2 — Cœur métier | ✅ Clôturé | 07/10/2026 | 52 | [Lot-03-profils-reglages.md](lots/Lot-03-profils-reglages.md) |
| 4 | [Salaire & cycle de paie](#lot-4--salaire--cycle-de-paie) | 2 — Cœur métier | ✅ Clôturé | 07/10/2026 | 110 | [Lot-04-salaire.md](lots/Lot-04-salaire.md) |
| 5 | [Autres revenus](#lot-5--autres-revenus) | 2 — Cœur métier | ✅ Clôturé | 07/10/2026 | 138 | [Lot-05-revenus.md](lots/Lot-05-revenus.md) |
| 6 | [Charges, enveloppes, ponctuels, dettes](#lot-6--charges-enveloppes-ponctuels-dettes) | 2 — Cœur métier | ✅ Clôturé | 08/10/2026 | 166 | [Lot-06-charges-dettes.md](lots/Lot-06-charges-dettes.md) |
| 7 | [Dépenses réelles](#lot-7--dépenses-réelles) | 2 — Cœur métier | ✅ Clôturé | 08/10/2026 | 194 | [Lot-07-depenses.md](lots/Lot-07-depenses.md) |
| 8 | [Suivi mensuel](#lot-8--suivi-mensuel) | 2 — Cœur métier | ✅ Clôturé | 09/10/2026 | 209 | [Lot-08-suivi-mensuel.md](lots/Lot-08-suivi-mensuel.md) |
| 9 | [Suivi hebdomadaire](#lot-9--suivi-hebdomadaire) | 2 — Cœur métier | ✅ Clôturé | 09/10/2026 | 232 | [Lot-09-suivi-hebdomadaire.md](lots/Lot-09-suivi-hebdomadaire.md) |
| 10 | [Épargne & objectifs](#lot-10--épargne--objectifs) | 2 — Cœur métier | ✅ Clôturé | 09/10/2026 | 266 | [Lot-10-epargne-objectifs.md](lots/Lot-10-epargne-objectifs.md) |
| 11 | [Simulateur & scénarios](#lot-11--simulateur--scénarios) | 3 — Intelligence et vues | ✅ Clôturé | 09/10/2026 | 288 | [Lot-11-simulateur.md](lots/Lot-11-simulateur.md) |
| 12 | [Recommandations & KPI](#lot-12--recommandations--kpi) | 3 — Intelligence et vues | 🟡 Livré, à valider | — | 314 | [Lot-12-recommandations-kpi.md](lots/Lot-12-recommandations-kpi.md) |
| 13 | [Aujourd'hui](#lot-13--aujourdhui) | 3 — Intelligence et vues | ⏳ Prochain | — | — | — |
| 14 | [Calendrier](#lot-14--calendrier) | 3 — Intelligence et vues | À venir | — | — | — |
| 15 | [Année](#lot-15--année) | 3 — Intelligence et vues | À venir | — | — | — |
| 16 | [Onboarding & import V0](#lot-16--onboarding--import-v0) | 4 — Entrée et finitions | À venir | — | — | — |
| 17 | [Export & sauvegarde](#lot-17--export--sauvegarde) | 4 — Entrée et finitions | À venir | — | — | — |
| 18 | [Finitions (polish)](#lot-18--finitions-polish) | 4 — Entrée et finitions | À venir | — | — | — |
| 19 | [Authentification](#lot-19--authentification) | 4 — Entrée et finitions | À venir | — | — | — |

« Tests » = nombre total de tests automatiques du projet à la clôture du lot (partage + moteur + serveur + interface).

Autres sections :

- [1. Méthode et règles de travail](#1-méthode-et-règles-de-travail)
- [2. Lots clôturés](#2-lots-clôturés-0-à-11)
- [3. Lots livrés, en attente de validation](#3-lots-livrés-en-attente-de-validation)
- [4. Lots à venir](#4-lots-à-venir-13-à-19)
- [5. Points reportés, rangés par lot](#5-points-reportés-rangés-par-lot)
- [6. Historique des commits](#6-historique-des-commits)
- [7. Questions ouvertes](#7-questions-ouvertes)

## 1. Méthode et règles de travail

Chaque lot suit le même chemin :

**Analyse → plan du lot (`docs/lots/Lot-XX.md`) → données → moteur → API → interface → tests → vérification dans le navigateur → correction → bilan → validation explicite → lot suivant.**

Règles appliquées à chaque lot :

- Jamais de mélange entre réel, prévu et projeté ; aucune donnée fictive présentée comme réelle.
- Tous les calculs sont dans le moteur (`packages/moteur`). L'interface n'affiche que des résultats ; ses petites règles d'affichage sont dans les fichiers `saisie.ts`.
- Interface identique au template (`Templates/image.png`), sauge `#7D8C82` à la place du violet, thème clair uniquement.
- `npm run verifier` (types, tests, build) doit passer avant la clôture.
- Vérification dans le navigateur à 1342 px et à 375 px, avec un compte de test « Essai » supprimé ensuite. Le compte « oussama » n'est jamais touché.
- Serveur et interface écoutent seulement sur `127.0.0.1` (ports 3010 et 6010).
- Code versionné dans le dépôt privé `github.com/oussamaalmouallim/mysalary` : commits en anglais, au nom de l'auteur. Le dossier `Salaire/` (données personnelles réelles), la base SQLite, `.env` et `.claude/` ne sont jamais versionnés.

## 2. Lots clôturés (0 à 11)

### Lot 0 — Cadrage

- **Statut** : ✅ clôturé le 07/10/2026.
- **Livré** : analyse des ressources (`Plan.md` § 2), `Plan.md`, `context.md`, `UX.md`, `UI.md`, décisions validées (`Plan.md` § 0).
- **Décisions** : cycle de paie fixe le 27, la paie finance le mois suivant ; comptes en base sans authentification ; onboarding avec import de la V0 ; thème clair ; interface identique au template.

### Lot 1 — Socle

- **Statut** : ✅ clôturé le 07/10/2026 · 28 tests · `docs/lots/Lot-01-socle.md`.
- **Livré** :
  - monorepo npm : `ui/`, `server/`, `packages/moteur`, `packages/partage` ; TypeScript strict, Vitest ;
  - serveur Fastify sur `127.0.0.1:3010`, Prisma 6 + SQLite, migration initiale ;
  - comptes (`Utilisateur` + `Reglages`), en-tête `X-Utilisateur`, isolation des données testée ;
  - format d'erreur unique `{ erreur: { code, message, champs? } }` ;
  - moteur : montants en centimes ; client API et TanStack Query côté interface.
- **Écarts** : validation Zod faite à la main (`valider`) ; Prisma 6 plutôt que 7 ; Vite limité à `127.0.0.1` ; scripts d'installation de Prisma et esbuild autorisés dans `package.json`.

### Lot 2 — Design system

- **Statut** : ✅ clôturé le 07/10/2026, refait à l'identique du template · 39 tests · `docs/lots/Lot-02-design-system.md`.
- **Livré** :
  - tokens, typographie Plus Jakarta Sans, icônes dans le style du template ;
  - structure du template : barre du haut blanche, fil d'Ariane, grande carte + colonne de 352 px, bandeau à cercles, tableau en champs, totaux, grand bouton plein ;
  - composants : Bouton, Champ, ChampMontant, Carte, CarteBandeau, Montant animé, Kpi, Pilule, badges, BarreProgression, Tableau, Onglets, Panneau, Confirmation, Notifications ;
  - graphiques (thème commun, trajectoire, barres revenus · dépenses · épargne) ; bascule des animations ;
  - page vitrine `/vitrine` (données marquées « exemple »).
- **Décisions** :
  - palette des graphiques remplacée (la palette sauge pâle échouait au validateur `dataviz`) : revenus `#3A74B8`, dépenses `#D08A2E`, épargne `#9C4F8C` ; vert et terracotta réservés aux statuts ;
  - le style maison de la skill (rail en verre, fond nacré, serif) est abandonné au profit du template.

### Lot 3 — Profils & réglages

- **Statut** : ✅ clôturé le 07/10/2026 · 52 tests · `docs/lots/Lot-03-profils-reglages.md`.
- **Livré** :
  - écran Profils : liste, dernière ouverture, création, renommage, suppression avec prénom à retaper ;
  - garde : sans compte → Profils ; compte retenu supprimé → retour à Profils avec message ;
  - menu de l'avatar ; écran Réglages : prénom, devise (lecture seule), mode de période, début de semaine, report hebdo, animations (enregistrement immédiat, « Annuler ») ;
  - route `POST /utilisateurs/:id/ouvrir`.
- **Écarts** : pas de Zustand ni de React Hook Form (un contexte React suffit) ; ajout de `@radix-ui/react-dropdown-menu` ; la page technique `/controle` du lot 1 est supprimée.

### Lot 4 — Salaire & cycle de paie

- **Statut** : ✅ clôturé le 07/10/2026 · 110 tests · `docs/lots/Lot-04-salaire.md`.
- **Livré** :
  - contrat de salaire versionné par **mois d'effet** : net, jour habituel, règle du week-end, « finance le mois suivant » ;
  - paies prévues (calculées), en retard, reçues (confirmées avec date et montants réels, écart affiché, annulation possible) ;
  - primes ponctuelles prévues sur une paie, primes imprévues ajoutées à la réception ;
  - mois budgétaires (bornes, durée, statut, mode calendaire), semaines et semaines partielles, répartition au prorata des jours ;
  - onglet Mon plan › Salaire & primes.
- **Décisions** : week-end → **lundi suivant** par défaut (le virement passe par la banque) ; le jour de paie ouvre le nouveau mois ; une paie en retard prolonge le mois en cours seulement si la paie précédente est reçue.
- **Écarts** : paies prévues calculées, pas stockées (une paie reçue garde une copie de son prévu, R27) ; plage `?du=&au=` au lieu de `?annee=` ; jours fériés non gérés.

### Lot 5 — Autres revenus

- **Statut** : ✅ clôturé le 07/10/2026 · 138 tests · `docs/lots/Lot-05-revenus.md`.
- **Livré** :
  - sources de revenus : type (prime, variable, autre), fréquences (mensuelle, trimestrielle, annuelle, unique, mois choisis), versement avec la paie ou à une autre date, certitude, début, fin ;
  - primes « avec la paie » ajoutées seules aux paies prévues ;
  - revenus reçus liés à une source ou libres, écart affiché, prévu jamais modifié (R3, R4) ;
  - équivalent mensuel, prochain versement, totaux par certitude sur 12 mois ; onglet Mon plan › Autres revenus.
- **Décision** : le mois d'une source est le **mois civil où l'argent arrive** (une prime de juin « avec la paie » finance juillet).
- **Écarts** : routes `GET /revenus/prevus` et `GET /revenus/resume` ajoutées ; « terminer » une source = choisir un dernier mois.

### Lot 6 — Charges, enveloppes, ponctuels, dettes

- **Statut** : ✅ clôturé le 08/10/2026 · 166 tests · `docs/lots/Lot-06-charges-dettes.md`.
- **Livré** :
  - catégories par défaut (essentiel, flexible, engagement), création depuis un formulaire, suppression refusée si utilisée ;
  - charges fixes (jour, fréquence, début, fin, essentielle), enveloppes par mois budgétaire, ponctuels datés avec certitude ;
  - dettes : total + mensualité → échéancier calculé, paiements réels plafonnés au reste dû, dette soldée rangée dans « Terminées » (R9) ;
  - charges prévues d'un mois (une échéance à venir ne compte que ce qui reste dû) ; onglets Mon plan › Charges & enveloppes et Dettes.
- **Écarts** : échéancier calculé, pas stocké (pas de table `EcheanceDette`) ; une échéance en retard reste dans son mois et est signalée « Échéance en retard ».

### Lot 7 — Dépenses réelles

- **Statut** : ✅ clôturé le 08/10/2026 · 194 tests · `docs/lots/Lot-07-depenses.md`.
- **Livré** :
  - saisie rapide partout : bouton `+` (en-tête et barre mobile), touche `N`, feuille du bas sur mobile ; montant d'abord, catégories les plus utilisées en premier ;
  - rattachement au plan (R10) : échéance d'une charge fixe, enveloppe, ponctuel ou hors plan, avec proposition automatique (« Est-ce le paiement de Loyer ? ») et paiement en avance des échéances des 10 jours suivants ;
  - bouton « Payé » sur une charge prévue ; date future refusée ;
  - écran Mois › Dépenses : mois précédent / suivant, liste par jour, filtre par catégorie, modifier, supprimer avec « Annuler » ;
  - en-tête compact entre 1024 et 1280 px.
- **Écarts** : ajout du champ `echeance` à `Depense` ; les paiements de dettes restent saisis dans Mon plan › Dettes.

### Lot 8 — Suivi mensuel

- **Statut** : ✅ clôturé le 09/10/2026 · 209 tests · `docs/lots/Lot-08-suivi-mensuel.md`.
- **Livré** :
  - Mois › Vue d'ensemble : reste réel et reste prévu séparés, écart d'un mois terminé, estimation de fin de mois pour le mois en cours (R23) ;
  - tableau prévu / réel / écart par ligne (paie, revenus à part et libres, charges fixes, enveloppes, ponctuels, échéances, hors plan), action « Payé » ou « Confirmer » ;
  - graphique du rythme (sorties réelles cumulées contre prévu cumulé) ;
  - clôture d'un mois passé (forcée possible avec mention), bilan figé, lecture seule, bornes qui ne bougent plus ; réouverture tracée (R21, R22) ;
  - lignes empilées sous 640 px ; boutons de clôture et de réouverture non rouges.
- **Écarts** : le prévu d'une échéance de dette est le montant de l'échéancier ; les paiements faits un autre mois apparaissent sur une ligne dédiée (« Payé ce mois pour un autre mois » / « Déjà payé un autre mois »).

### Lot 9 — Suivi hebdomadaire

- **Statut** : ✅ clôturé le 09/10/2026 · 232 tests · `docs/lots/Lot-09-suivi-hebdomadaire.md`.
- **Livré** :
  - Mois › Semaines : réponse en tête (« Oui, avec 340 DH d'avance » / « 120 DH au-dessus du rythme prévu »), budget flexible du mois, prévu à date, dépensé ;
  - une ligne par semaine (lundi → dimanche, ou selon le réglage) : disponible, dépensé, reste, écart, tendance contre la moyenne des 4 semaines précédentes ; semaines partielles « 3 jours » au prorata des jours ;
  - semaine ouverte : dépenses par jour (modifier), charges datées avec statut, « + Ajouter » daté dans la semaine ;
  - KPI « Reste flexible (semaine) » et montant par jour ; report du reste sur la semaine suivante si le réglage est activé (jamais d'un mois à l'autre) ;
  - état vide sans enveloppe → Mon plan ; semaines figées à la clôture du mois.
- **Écarts** : le hors plan compte dans le flexible ; budgets au centime près (pas d'arrondi caché) ; les mois clôturés avant le lot 9 n'ont pas de semaines figées.
- **Corrigé en passant** : un réglage modifié rafraîchit les mois affichés ; détail d'une dépense sans répétition de la catégorie ; dossiers `salaire` du code jamais versionnés à cause de la règle `Salaire/` du `.gitignore` (règle ancrée à la racine, dossiers ajoutés, clone propre vérifié).

### Lot 10 — Épargne & objectifs

- **Statut** : ✅ clôturé le 09/10/2026 · 266 tests · `docs/lots/Lot-10-epargne-objectifs.md`.
- **Livré** :
  - Mon plan › Épargne : comptes (solde déclaré à une date), versements et retraits, solde / réservé / disponible, alerte si les objectifs réservent plus que l'épargne (R12–R14) ;
  - objectifs : type, cible, déjà mis de côté, date souhaitée, versement mensuel, priorité (monter / descendre), pause, abandon, suppression ; achat réalisé sans dépense, annulable (R19) ;
  - projections : capacité d'épargne par scénario, répartition par priorité jamais au-delà de la capacité (R18), date estimée, risque (sûr / probable / fragile / hors de portée), effort mensuel et hebdo, leviers chiffrés si la date n'est pas tenue ;
  - pages Objectifs, Objectif (trajectoire réel / projeté / cible) et Nouvel objectif avec aperçu en direct ; fonds de sécurité proposé (3 à 6 mois de charges essentielles) ;
  - saisie rapide « De l'épargne » (bouton +), lignes d'épargne dans le bilan du mois et la semaine ouverte (R11).
- **Écarts** : types d'objectif de `UX.md` § 4.4 ; `VersementObjectif` = `MouvementEpargne` lié à un objectif ; effort calculé depuis le début du mois en cours ; boutons monter / descendre au lieu du glisser-déposer.

### Lot 11 — Simulateur & scénarios

- **Statut** : ✅ clôturé le 09/10/2026 · 288 tests · `docs/lots/Lot-11-simulateur.md`.
- **Livré** :
  - page Simulateur (`/simulateur`, touche `S`, liens depuis Objectifs) : trois scénarios côte à côte, épargne projetée (réel plein, réaliste hachuré, prudent et ambitieux en pointillés), objectifs avec et sans leviers ;
  - leviers : versement mensuel, date cible, prime en plus, réduction d'une charge, horizon 6 / 12 / 24 / 36 mois (avertissement au-delà de 24) ; alertes claires (versements au-delà de la capacité, épargne négative) ;
  - trois questions prêtes ; enregistrer, rouvrir, supprimer un scénario ; appliquer au plan avec confirmation et résumé ;
  - Réglages › Scénarios : revenus retenus et dépenses flexibles par scénario ; le prudent prend la moyenne réelle des 3 derniers mois si elle dépasse le budget ; les Objectifs suivent ces règles.
- **Écarts** : un levier de chaque sorte à l'écran ; une prime appliquée devient une source « unique » probable ; une réduction appliquée coupe la charge et en crée une copie réduite le mois suivant ; pas de scénario « perso ».

## 3. Lots livrés, en attente de validation

### Lot 12 — Recommandations & KPI

- **Statut** : 🟡 livré le 09/10/2026, en attente de validation · 314 tests · `docs/lots/Lot-12-recommandations-kpi.md`.
- **Livré** :
  - les huit KPI de `Plan.md` § 8 dans le moteur (`indicateurs`), route `GET /indicateurs?mois=` ; carte « Indicateurs » dans Mois › Vue d'ensemble, base de chaque calcul à la demande ;
  - alertes (`alertes`) : paie en retard ou prévue aujourd'hui, revenu en retard, échéance en retard, enveloppe dépassée, semaine dépassée, objectifs au-delà de l'épargne ; rien pour un mois clôturé ni avant le début du suivi ;
  - recommandations (`recommandations`) : fin de mois serrée, effort pour tenir une date, réduire une enveloppe, mettre de côté une prime, affecter l'épargne disponible, fonds de sécurité ; chacune avec message, effet, base de calcul, condition, confiance (R24–R26) ;
  - cloche de l'en-tête : pastille du nombre d'alertes, panneau « À faire » + « Suggestions », actions vers l'écran concerné ; carte « Suggestions » sur Objectifs ; « Simuler » pré-remplit le simulateur.
- **Écarts** : le reste à dépenser retire aussi les charges datées encore à payer ; part variable sur les 12 prochains mois (prévu) ; écart du mois en cours comparé au prévu à date ; délai calculé en réaliste ; phrases rédigées dans `partage`.

## 4. Lots à venir (13 à 19)

### Lot 13 — Aujourd'hui

- **Objectif** : « où j'en suis » en 5 secondes (UX.md § 5.2) ; remplace la page d'attente actuelle.
- **Périmètre prévu** :
  - carte héro : reste à dépenser ce mois, jours restants, montant par jour ;
  - reste flexible de la semaine et barre de rythme ; bilan de la semaine passée le lundi ;
  - actions attendues : paie à confirmer (carte « Paie prévue aujourd'hui »), charges du jour, échéances ;
  - épargne du mois, objectif prioritaire, 7 prochains jours, 1 à 3 recommandations ;
  - saisie rapide d'un revenu reçu.

### Lot 14 — Calendrier

- **Objectif** : voir quand l'argent entre et sort (UX.md § 5.10).
- **Périmètre prévu** : vue mois (grille) et vue liste ; salaire, primes, charges, échéances, ponctuels, dates cibles d'objectifs ; solde projeté du jour au survol ; filtre par type ; confirmer ou modifier un événement ; ajouter un ponctuel daté ; pastille « +3 » ; marqueur d'événement passé non confirmé.

### Lot 15 — Année

- **Objectif** : comprendre l'année sans lire chaque mois (UX.md § 4.8, § 5.6).
- **Périmètre prévu** : 12 mois de l'année ; revenus, dépenses, épargne (réel à date + projeté restant, séparés) ; graphique mensuel (composant du lot 2) ; mois les plus coûteux, part variable du revenu, épargne cumulée, progression des objectifs ; clic sur un mois → Mois ; mois sans données grisés ; année future marquée « projection ».

### Lot 16 — Onboarding & import V0

- **Objectif** : une première vue utile en moins de 5 minutes (UX.md § 4.1, § 5.1 ; `Plan.md` § 7.1 bis).
- **Périmètre prévu** :
  - dix étapes : bienvenue, import, salaire, primes, charges fixes, enveloppes, dettes et ponctuels, épargne, premier objectif, résumé ;
  - import money-guru ligne par ligne (importer, modifier, ignorer), conflits posés en question, valeurs marquées « importé · à confirmer » ;
  - progression visible, sauvegarde à chaque étape, reprise, retour sans perte, mode « mes revenus varient ».
- **Pourquoi si tard** : l'onboarding enchaîne des formulaires qui doivent d'abord exister et être testés seuls (lots 3 à 10).

### Lot 17 — Export & sauvegarde

- **Périmètre prévu** : export et import JSON d'un compte ; sauvegarde de la base ; export proposé avant la suppression d'un compte (lot 3) et avant la réinitialisation d'un compte (Réglages).

### Lot 18 — Finitions (polish)

- **Périmètre prévu** :
  - animations, responsive, accessibilité, performance (paquet JS ≈ 540 ko à alléger) ;
  - parcours de bout en bout avec Playwright (`Plan.md` § 13) ;
  - raccourcis `←` `→` pour changer de période ;
  - retrait des textes de chantier (« Cette page arrive au lot N ») et décision sur la page vitrine ;
  - points reportés listés au § 5.

### Lot 19 — Authentification

- **Périmètre prévu** : mot de passe par compte, sessions ; obligatoire avant toute mise en ligne ou ouverture du réseau (aujourd'hui tout reste sur `127.0.0.1`).

## 5. Points reportés, rangés par lot

Tout ce qu'un lot livré a laissé de côté, et le lot qui doit le reprendre.

| Point | Noté au | Lot prévu |
|---|---|---|
| Cloche des notifications (aujourd'hui sans effet) | lot 2 | ✅ fait au lot 12 |
| Alerte « budget flexible de la semaine dépassé » | lot 9 | ✅ fait au lot 12 |
| KPI taux d'épargne, progression et délai des objectifs (chiffres déjà calculés, KPI à assembler) | lot 10 | ✅ fait au lot 12 |
| Alerte « objectifs au-delà de l'épargne déclarée » dans la cloche | lot 10 | ✅ fait au lot 12 |
| Carte « Paie prévue aujourd'hui » | lot 4 | 13 |
| Saisie rapide d'un revenu reçu | lot 7 | 13 |
| Bilan de la semaine passée sur Aujourd'hui, le lundi | lot 9 | 13 |
| Calendrier des revenus et des charges | lot 5 | 14 |
| Dates cibles des objectifs dans le calendrier | lot 10 | 14 |
| Graphique annuel | lot 8 | 15 |
| Export avant suppression d'un compte ; réinitialisation d'un compte | lot 3 | 17 |
| Toast « Ajoutée à novembre » pour une dépense datée hors du mois affiché | lot 7 | 18 |
| Paquet JS à alléger | lot 2 | 18 |
| Glisser-déposer pour l'ordre des objectifs (aujourd'hui : monter / descendre) | lot 10 | 18 |
| Scénario « perso » avec ses propres règles | lot 11 | non planifié |
| Réglages › Catégories (renommer, fusionner) | lot 6 | 18 (proposé, à confirmer) |
| Modifier une charge « à partir de maintenant » ou « depuis le début » (UX.md § 5.11) ; aujourd'hui une modification s'applique à tous les mois non clôturés | lot 6 | 18 (proposé, à confirmer) |
| Suspendre ou archiver un élément de Mon plan (aujourd'hui : choisir un dernier mois, ou supprimer) | lot 6 | 18 (proposé, à confirmer) |
| Aperçu de l'effet avant de changer de mode de période (UX.md § 5.12) | lot 3 | 18 (proposé, à confirmer) |
| Jours fériés (seul le week-end décale la paie) | lot 4 | non planifié |

## 6. Historique des commits

Dépôt privé : `github.com/oussamaalmouallim/mysalary`, branche `main`.

| Commit | Contenu |
|---|---|
| `e71530c` | Monorepo npm workspaces |
| `3435628` | Spécification produit, parcours UX, direction UI |
| `7fa6b14` | Moteur de calcul |
| `c4e3f87` | Contrats d'API, schémas de validation, formats |
| `fee4b3e` | API Fastify avec isolation par compte |
| `d903e8b` | Application React, design system, écrans du plan (lots 1 à 6) |
| `fc56b50` | Bilans des lots 1 à 6 |
| `2afe393` | Lot 6 : tests des onglets Charges et Dettes, tableaux rééquilibrés |
| `c02afe2` | Lot 7 : dépenses réelles |
| `2ec4ea6` | Lot 8 : suivi mensuel et clôture |
| `420b1dd` | Plan : sommaire des lots et points reportés |
| `77d42e4` | Suivi des lots déplacé dans `docs/plan.md` |
| `eb66ce2` | Lot 9 : suivi hebdomadaire |
| `b6416bc` | Correctif : modules `salaire` versionnés (règle `.gitignore` ancrée à la racine) |
| `9d3449a` | Plan : lot 8 clôturé, lot 9 livré |
| `eaad93f` | Lot 10 : épargne et objectifs |
| `eff45b8` | Lot 11 : simulateur et scénarios |
| `d6c5b5a` | Plan : lot 9 clôturé, lots 10 et 11 livrés |
| `a8da49f` | Lot 12 : recommandations et KPI |

## 7. Questions ouvertes

1. Où placer **Réglages › Catégories** (renommer, fusionner) ? Proposition : lot 18.
2. Où placer le choix **« à partir de maintenant » / « depuis le début »** quand on modifie une charge ? Proposition : lot 18.
3. Où placer **suspendre / archiver** un élément de Mon plan ? Proposition : lot 18.
4. Où placer l'**aperçu de l'effet** d'un changement de mode de période ? Proposition : lot 18.
5. Faut-il gérer les **jours fériés** pour la date de paie ? Aujourd'hui, seul le week-end la décale.
