# MySalary — Progression

> Suivi de la construction de MySalary, lot par lot. Mis à jour à chaque lot.
> État au 12/10/2026 : **lots 0 à 18 clôturés et validés**, **lot 19 livré, en attente de validation**, lots 20 à 22 à venir. Depuis le 11/10/2026, c'est toi qui commites : je donne seulement les messages de commit. Les lots 13, 14 et 15 ont été ajoutés le 09/10/2026 à ta demande ; les lots suivants ont été renumérotés (Aujourd'hui passe de 13 à 16, etc.).
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
| 12 | [Recommandations & KPI](#lot-12--recommandations--kpi) | 3 — Intelligence et vues | ✅ Clôturé | 09/10/2026 | 314 | [Lot-12-recommandations-kpi.md](lots/Lot-12-recommandations-kpi.md) |
| 13 | [Cumul du reste de mois en mois](#lot-13--cumul-du-reste-de-mois-en-mois) | 3 — Intelligence et vues | ✅ Clôturé | 10/10/2026 | 323 | [Lot-13-cumul.md](lots/Lot-13-cumul.md) |
| 14 | [Objectifs › vue Calendrier de l'année](#lot-14--objectifs--vue-calendrier-de-lannée) | 3 — Intelligence et vues | ✅ Clôturé | 10/10/2026 | 329 | [Lot-14-calendrier-annee.md](lots/Lot-14-calendrier-annee.md) |
| 15 | [Semaines en cartes](#lot-15--semaines-en-cartes) | 3 — Intelligence et vues | ✅ Clôturé | 11/10/2026 | 343 | [Lot-15-semaines-cartes.md](lots/Lot-15-semaines-cartes.md) |
| 16 | [Aujourd'hui](#lot-16--aujourdhui) | 3 — Intelligence et vues | ✅ Clôturé | 12/10/2026 | 353 | [Lot-16-aujourdhui.md](lots/Lot-16-aujourdhui.md) |
| 17 | [Calendrier](#lot-17--calendrier) | 3 — Intelligence et vues | ✅ Clôturé | 12/10/2026 | 370 | [Lot-17-calendrier.md](lots/Lot-17-calendrier.md) |
| 18 | [Année](#lot-18--année) | 3 — Intelligence et vues | ✅ Clôturé | 12/10/2026 | 384 | [Lot-18-annee.md](lots/Lot-18-annee.md) |
| 19 | [Onboarding & import V0](#lot-19--onboarding--import-v0) | 4 — Entrée et finitions | ✅ Clôturé | 12/10/2026 | 414 | [Lot-19-onboarding.md](lots/Lot-19-onboarding.md) |
| 20 | [Export & sauvegarde](#lot-20--export--sauvegarde) | 4 — Entrée et finitions | ✅ Clôturé | 12/10/2026 | 426 | [Lot-20-export-sauvegarde.md](lots/Lot-20-export-sauvegarde.md) |
| 21 | [Finitions (polish)](#lot-21--finitions-polish) | 4 — Entrée et finitions | 🟡 Livré en partie, à valider | — | 429 | [Lot-21-finitions.md](lots/Lot-21-finitions.md) |
| 22 | [Authentification](#lot-22--authentification) | 4 — Entrée et finitions | À venir | — | — | — |

« Tests » = nombre total de tests automatiques du projet à la clôture du lot (partage + moteur + serveur + interface).

Autres sections :

- [1. Méthode et règles de travail](#1-méthode-et-règles-de-travail)
- [2. Lots clôturés](#2-lots-clôturés-0-à-15)
- [3. Lots livrés, en attente de validation](#3-lots-livrés-en-attente-de-validation)
- [4. Lots à venir](#4-lots-à-venir-17-à-22)
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

## 2. Lots clôturés (0 à 15)

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

### Lot 12 — Recommandations & KPI

- **Statut** : ✅ clôturé le 09/10/2026 · 314 tests · `docs/lots/Lot-12-recommandations-kpi.md`.
- **Livré** :
  - les huit KPI de `Plan.md` § 8 dans le moteur (`indicateurs`), route `GET /indicateurs?mois=` ; carte « Indicateurs » dans Mois › Vue d'ensemble, base de chaque calcul à la demande ;
  - alertes (`alertes`) : paie en retard ou prévue aujourd'hui, revenu en retard, échéance en retard, enveloppe dépassée, semaine dépassée, objectifs au-delà de l'épargne ; rien pour un mois clôturé ni avant le début du suivi ;
  - recommandations (`recommandations`) : fin de mois serrée, effort pour tenir une date, réduire une enveloppe, mettre de côté une prime, affecter l'épargne disponible, fonds de sécurité ; chacune avec message, effet, base de calcul, condition, confiance (R24–R26) ;
  - cloche de l'en-tête : pastille du nombre d'alertes, panneau « À faire » + « Suggestions », actions vers l'écran concerné ; carte « Suggestions » sur Objectifs ; « Simuler » pré-remplit le simulateur.
- **Écarts** : le reste à dépenser retire aussi les charges datées encore à payer ; part variable sur les 12 prochains mois (prévu) ; écart du mois en cours comparé au prévu à date ; délai calculé en réaliste ; phrases rédigées dans `partage`.

### Lot 13 — Cumul du reste de mois en mois

- **Statut** : ✅ clôturé le 10/10/2026 · 323 tests · `docs/lots/Lot-13-cumul.md`.
- **Livré** :
  - moteur `cumulDesMois` : report, revenus, charges, épargne, reste et cumul de fin de mois ; réel (passé), estimation (en cours), prévu en réaliste (futur) ;
  - solde de départ du compte courant au début d'un mois (Réglages › Compte courant), sinon 0 au premier mois suivi ;
  - Mois › Vue d'ensemble : « Report / Solde de départ », « Reste du mois », « Cumul fin de mois » ; route `GET /cumul?du=&au=` ;
  - Mon plan › Salaire, tableau des Paies : Revenus · Charges · Épargne · Cumul fin de mois, mois par mois.
- **Décision** : le cumul suppose que ce qui n'est pas versé à un objectif reste sur le compte ; les Objectifs supposent qu'il est épargné. Deux hypothèses, affichées comme telles.

### Lot 14 — Objectifs › vue Calendrier de l'année

- **Statut** : ✅ clôturé le 10/10/2026 · 329 tests · `docs/lots/Lot-14-calendrier-annee.md`.
- **Livré** :
  - Objectifs : onglets « Objectifs » / « Calendrier de l'année », vue et année gardées dans l'adresse (`?vue=calendrier&annee=2027`) ;
  - bandeau de l'année : cumul fin décembre, mois le plus bas, reste cumulé de l'année, report de l'année précédente, revenus, charges, épargne ; alerte si un mois passe sous zéro ;
  - une carte par mois suivi : cumul fin de mois, jauge, revenus, charges, épargne, objectifs atteints (projection) ou à leur date souhaitée ; réel, en cours (cerclé) et prévu (pointillés, italique) ; les mois d'avant le suivi en une seule bande ;
  - fenêtre du mois : le calcul (report + revenus − charges − épargne = cumul), les objectifs du mois, puis chaque revenu, charge et versement avec son statut ; mois précédent / suivant, « Ouvrir le mois » ;
  - moteur `resumeCumul`, `resume` dans `GET /cumul` ; composant `Fenetre` (fenêtre centrée) ; `CalendrierAnnee` réutilisable par la page Année (lot 18).
- **Revu le 11/10/2026** (ta demande) : chaque mois devient un vrai calendrier (paie, charges datées par jour, aujourd'hui), ligne « Reste » (revenus − charges) sur chaque carte et dans la fenêtre, graphique du cumul sur l'année, les 12 mois affichés ; route `GET /annee/:annee`.
- **Correctif du 11/10/2026** : pages blanches en changeant de page (hook appelé sous condition dans la saisie rapide, transition qui attendait la sortie de la page précédente) ; chaque page a maintenant un filet d'erreur avec « Recharger ».

### Lot 15 — Semaines en cartes

- **Statut** : ✅ clôturé le 11/10/2026 · 343 tests (avec l'ajout des enveloppes) · `docs/lots/Lot-15-semaines-cartes.md`.
- **Livré** :
  - Mois › Semaines : le tableau devient une grille de cartes, une par semaine : reste (ou disponible prévu), barre du dépensé avec repère du rythme, dépensé, disponible, écart, tendance, nombre de charges datées, épargne ; passée, en cours (cerclée), à venir (pointillés) ;
  - fenêtre de la semaine : budget, report, disponible, dépensé, reste ; jour, montant par jour, écart et tendance expliqués ; dépenses jour par jour (modifier, « + Ajouter » à la bonne date), charges datées, payé, épargne ; semaine précédente / suivante ;
  - carte « Cette semaine » : bouton « Voir le détail de la semaine » ; bloc « Lire une carte » à la place des barres « Dépensé par semaine ».
- **Écarts** : aucune semaine n'est ouverte d'office ; calculs inchangés (lot 9).
- **Ajout du 12/10/2026** (ta demande) : budget d'enveloppe = **budget du mois** ; par semaine, **tu mets le montant que tu veux sur chaque semaine** (mois en cours ou suivant), sans montant imposé ; une semaine sans montant reçoit 0 ; alerte si tes semaines dépassent le budget de l'enveloppe ; les semaines suivent le dépensé réel face à ces montants.

## 3. Lots livrés, en attente de validation

### Lot 16 — Aujourd'hui

- **Statut** : ✅ clôturé le 12/10/2026 · 353 tests · `docs/lots/Lot-16-aujourdhui.md`.
- **Livré** :
  - héros : reste à dépenser du mois, par jour, jours restants ; reste de la semaine et sa barre ; phrase du calcul ;
  - « À faire » : paie à confirmer (confirmée sur place), échéances en retard, dépassements ; « 7 prochains jours » groupés par jour ; bilan de la semaine passée le premier jour de la semaine ;
  - épargne du mois, objectif prioritaire, 1 à 3 suggestions ; ajouter une dépense, noter un revenu reçu, ouvrir le mois ; état vide sans salaire ;
  - moteur `prochainsJours`, `semainePassee` ; route `GET /aujourdhui`.
- **Écart** : une seule lecture pour la page (une erreur affiche « Réessayer » pour toute la page, pas carte par carte).

### Lot 17 — Calendrier

- **Statut** : ✅ clôturé le 12/10/2026 · 370 tests · `docs/lots/Lot-17-calendrier.md`.
- **Livré** :
  - page `/calendrier` : grille du mois budgétaire et vue liste ; navigation de mois ; vue et mois gardés dans l'adresse ;
  - événements typés (paie et primes, autres revenus, charges fixes, échéances de dettes, ponctuels) et dates d'objectifs ; filtre par type ; pastille « +N » ; marqueur « passé, pas confirmé » ;
  - solde du jour au survol : réel jusqu'à aujourd'hui, puis projeté (les restes datés pas confirmés) ; jamais mélangé sans le dire ;
  - détail d'un jour : prévu, réel, statut en mots, « Marquer payé » ou lien de confirmation, lien pour modifier dans Mon plan ; ajout d'un ponctuel daté à la date du jour ouvert ;
  - moteur `calendrierDuMois` ; route `GET /mois/:cle/calendrier` ; lien « Ouvrir le calendrier » depuis Aujourd'hui.
- **Écart** : modifier une charge ou un ponctuel passe par Mon plan (lien), pas par une fenêtre du calendrier ; le solde du calendrier part du début du mois (le report des mois précédents est dans le cumul, lot 13).

### Lot 18 — Année

- **Statut** : ✅ clôturé le 12/10/2026 · 384 tests · `docs/lots/Lot-18-annee.md`.
- **Livré** :
  - page `/annee`, onglets Synthèse et Calendrier (réutilise le calendrier de l'année du lot 14) ; année et vue dans l'adresse ;
  - revenus, dépenses, épargne de l'année : réel à date et projeté restant séparés ; bandeau « Année en cours / terminée / Projection » ;
  - graphique mensuel (plein = réel, hachuré = en cours ou prévu) ; les douze mois cliquables vers Mois, mois avant le suivi grisés ;
  - mois les plus coûteux, part variable du revenu, épargne cumulée, progression de chaque objectif (début, aujourd'hui, fin projetée) ;
  - moteur `suiviAnnuel` ; route `GET /annee/:annee/suivi` ; lien « Voir l'année » depuis Aujourd'hui.
- **Écart** : l'épargne cumulée est celle de l'année (somme des mois), pas le solde total des comptes ; le calendrier de l'année reste aussi dans Objectifs.

### Lot 19 — Onboarding & import V0

- **Statut** : 🟡 livré le 12/10/2026, en attente de validation · 414 tests · `docs/lots/Lot-19-onboarding.md`.
- **Livré** :
  - page `/onboarding`, dix étapes que l'on peut passer, barre de progression, étape sauvegardée par compte, reprise, retour arrière sans perte ; un compte créé commence par la mise en route, un compte commencé affiche « Reprendre » sur Aujourd'hui ;
  - import d'un export money-guru : aperçu groupé par thème, Importer / Modifier / Ignorer, conflits posés en question (quel salaire ? dette ou aide ?) ; rien n'est importé comme réel ni créé sans confirmation ; « Savings » jamais en charge ; un même écart sur trois mois devient une charge fixe proposée ;
  - lignes importées « importé · à confirmer » aux étapes 3 à 9, confirmées avec les formulaires de Mon plan préremplis ; mode « mes revenus varient » ;
  - résumé : mois budgétaire, revenu et charges prévus, capacité d'épargne et date du premier objectif marquées « projection » ;
  - moteur `analyserMoneyGuru` et `decider` ; table `ImportSource` ; routes `/onboarding` et `/import/*`.
- **Écart** : l'étude HTML de la V0 n'est pas lue (ses chiffres se saisissent à la main) ; l'import d'un export MySalary arrive avec le lot 20 ; pas encore de bouton « relancer la mise en route » dans les Réglages.

## 4. Lots à venir (20 à 22)

### Lot 20 — Export & sauvegarde

- **Livré** : export JSON d'un compte, import en nouveau compte, réinitialisation, export proposé avant suppression et réinitialisation, `npm run sauvegarde`. Détail : `docs/lots/Lot-20-export-sauvegarde.md`.
- **Écart** : pas de bouton de sauvegarde dans l'interface ; pas de restauration automatique.

### Lot 21 — Finitions (polish)

- **Périmètre prévu** :
  - animations, responsive, accessibilité, performance (paquet JS ≈ 540 ko à alléger) ;
  - parcours de bout en bout avec Playwright (`Plan.md` § 13) ;
  - raccourcis `←` `→` pour changer de période ;
  - retrait des textes de chantier (« Cette page arrive au lot N ») et décision sur la page vitrine ;
  - points reportés listés au § 5.

### Lot 22 — Authentification

- **Périmètre prévu** : mot de passe par compte, sessions ; obligatoire avant toute mise en ligne ou ouverture du réseau (aujourd'hui tout reste sur `127.0.0.1`).

## 5. Points reportés, rangés par lot

Tout ce qu'un lot livré a laissé de côté, et le lot qui doit le reprendre.

| Point | Noté au | Lot prévu |
|---|---|---|
| Cloche des notifications (aujourd'hui sans effet) | lot 2 | ✅ fait au lot 12 |
| Alerte « budget flexible de la semaine dépassé » | lot 9 | ✅ fait au lot 12 |
| KPI taux d'épargne, progression et délai des objectifs (chiffres déjà calculés, KPI à assembler) | lot 10 | ✅ fait au lot 12 |
| Alerte « objectifs au-delà de l'épargne déclarée » dans la cloche | lot 10 | ✅ fait au lot 12 |
| Carte « Paie prévue aujourd'hui » | lot 4 | 16 |
| Saisie rapide d'un revenu reçu | lot 7 | 16 |
| Bilan de la semaine passée sur Aujourd'hui, le lundi | lot 9 | 16 |
| Calendrier des revenus et des charges | lot 5 | 17 |
| Dates cibles des objectifs dans le calendrier | lot 10 | 17 |
| Graphique annuel | lot 8 | 18 |
| Export avant suppression d'un compte ; réinitialisation d'un compte | lot 3 | ✅ fait au lot 20 |
| Toast « Ajoutée à novembre » pour une dépense datée hors du mois affiché | lot 7 | ✅ fait au lot 21 |
| Paquet JS à alléger | lot 2 | ✅ fait au lot 21 |
| Glisser-déposer pour l'ordre des objectifs (aujourd'hui : monter / descendre) | lot 10 | 21 |
| Scénario « perso » avec ses propres règles | lot 11 | non planifié |
| Réglages › Catégories (renommer, fusionner) | lot 6 | 21 (proposé, à confirmer) |
| Modifier une charge « à partir de maintenant » ou « depuis le début » (UX.md § 5.11) ; aujourd'hui une modification s'applique à tous les mois non clôturés | lot 6 | 21 (proposé, à confirmer) |
| Suspendre ou archiver un élément de Mon plan (aujourd'hui : choisir un dernier mois, ou supprimer) | lot 6 | 21 (proposé, à confirmer) |
| Aperçu de l'effet avant de changer de mode de période (UX.md § 5.12) | lot 3 | 21 (proposé, à confirmer) |
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
| `faf0867` | Plan : lots 10 et 11 clôturés, lot 12 livré |
| `81d2dfd` | Lot 13 : cumul du reste de mois en mois |
| `c625cfe` | Plan : lots 13 à 15 ajoutés, lots suivants renumérotés |
| `3c7f140` | Plan : commits du lot 13 |
| `7e96fda` | Lot 13 : cumul fin de mois dans le tableau des Paies |
| `ce91814` | Lot 13 : revenus, charges, épargne et cumul mois par mois dans les Paies |
| `2f9d38f` | Lot 14 : calendrier de l'année dans Objectifs ; lot 13 clôturé |
| `c2d05c5` | Plan : commit du lot 14 |
| `8483013` | Lot 15 : semaines en cartes ; lot 14 clôturé |
| `141026b` | Plan : commit du lot 15 |
| `2d0a125` | Correctif : pages blanches en changeant de page |
| `0c599d5` | Lot 14 revu : calendrier jour par jour, ligne « Reste », graphique du cumul |
| `da91250` | Plan : correctif des pages blanches et calendrier revu |
| `6348af8` | Correctif : l'application reste affichée après un rechargement à chaud ; filet d'erreur global |
| `245f514` | Enveloppes divisées par jour ou par semaine |
| `ed0e51d` | Lot 16 : page Aujourd'hui ; budget d'enveloppe saisi par mois, par semaine ou par jour |
| — (à commiter) | Enveloppe : budget du mois, montant libre sur chaque semaine ; les semaines ne reçoivent que ces montants |
| — (à commiter) | Lot 17 : calendrier du mois (grille, liste, solde projeté) |
| — (à commiter) | Lot 18 : page Année (suivi annuel) |
| — (à commiter) | Lot 19 : onboarding et import de l'ancienne app |

## 7. Questions ouvertes

1. Où placer **Réglages › Catégories** (renommer, fusionner) ? Proposition : lot 21.
2. Où placer le choix **« à partir de maintenant » / « depuis le début »** quand on modifie une charge ? Proposition : lot 21.
3. Où placer **suspendre / archiver** un élément de Mon plan ? Proposition : lot 21.
4. Où placer l'**aperçu de l'effet** d'un changement de mode de période ? Proposition : lot 21.
5. Faut-il gérer les **jours fériés** pour la date de paie ? Aujourd'hui, seul le week-end la décale.
