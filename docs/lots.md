# MySalary — Lots : suivi et bilans

> Ce document réunit le **suivi** de la construction (§ 0 à 7 : sommaire, méthode, lots, points reportés, commits, questions ouvertes ; ancien fichier `docs/plan.md`) et le **bilan détaillé de chaque lot** (§ 8 ; anciens fichiers `docs/lots/Lot-NN-*.md`).

> Suivi de la construction de MySalary, lot par lot. Mis à jour à chaque lot.
> État au 12/10/2026 : **lots 0 à 21 clôturés**, **lot 22 clôturé puis remplacé par le lot 23**, **lot 23 (nettoyage, authentification, multi-utilisateur) livré et commité, en attente de validation explicite**. Le 12/10/2026, l'étude de marché (`docs/etude/Etude-marche-2026-10.html`) a fixé les lots 24 à 31 : MySalary devient un SaaS ; **lot 24 (comptes fiables et e-mails) livré, à valider**. Le 15/10/2026, trois lots demandés ont été insérés et livrés : **25 épargne synchronisée, 26 objectifs en vue annuelle, 27 tableau de bord Aujourd'hui** (à valider) ; les lots prévus par l'étude sont décalés de trois numéros (25 → 28, etc.). **Prochain lot : 28**. Depuis le 11/10/2026, c'est toi qui commites : je donne seulement les messages de commit. Les lots 13, 14 et 15 ont été ajoutés le 09/10/2026 à ta demande ; les lots suivants ont été renumérotés (Aujourd'hui passe de 13 à 16, etc.).
>
> - Plan global de l'application (vision, architecture, données, règles métier) : [produit.md (Plan)](produit.md).
> - Bilan détaillé de chaque lot livré (périmètre, règles, tests, bugs corrigés) : [§ 8](#8-bilans-détaillés-des-lots).

## 0. Sommaire des lots

| Lot | Nom | Phase | Statut | Validé le | Tests | Détail |
|---|---|---|---|---|---|---|
| 0 | [Cadrage](#lot-0--cadrage) | 0 — Cadrage | ✅ Clôturé | 07/10/2026 | — | [produit.md (Plan)](produit.md) |
| 1 | [Socle](#lot-1--socle) | 1 — Fondations | ✅ Clôturé | 07/10/2026 | 28 | [Bilan du lot 1](#bilan-du-lot-1--socle) |
| 2 | [Design system](#lot-2--design-system) | 1 — Fondations | ✅ Clôturé | 07/10/2026 | 39 | [Bilan du lot 2](#bilan-du-lot-2--design-system) |
| 3 | [Profils & réglages](#lot-3--profils--réglages) | 2 — Cœur métier | ✅ Clôturé | 07/10/2026 | 52 | [Bilan du lot 3](#bilan-du-lot-3--profils-et-réglages) |
| 4 | [Salaire & cycle de paie](#lot-4--salaire--cycle-de-paie) | 2 — Cœur métier | ✅ Clôturé | 07/10/2026 | 110 | [Bilan du lot 4](#bilan-du-lot-4--salaire-et-cycle-de-paie) |
| 5 | [Autres revenus](#lot-5--autres-revenus) | 2 — Cœur métier | ✅ Clôturé | 07/10/2026 | 138 | [Bilan du lot 5](#bilan-du-lot-5--autres-revenus) |
| 6 | [Charges, enveloppes, ponctuels, dettes](#lot-6--charges-enveloppes-ponctuels-dettes) | 2 — Cœur métier | ✅ Clôturé | 08/10/2026 | 166 | [Bilan du lot 6](#bilan-du-lot-6--charges-enveloppes-ponctuels-dettes) |
| 7 | [Dépenses réelles](#lot-7--dépenses-réelles) | 2 — Cœur métier | ✅ Clôturé | 08/10/2026 | 194 | [Bilan du lot 7](#bilan-du-lot-7--dépenses-réelles) |
| 8 | [Suivi mensuel](#lot-8--suivi-mensuel) | 2 — Cœur métier | ✅ Clôturé | 09/10/2026 | 209 | [Bilan du lot 8](#bilan-du-lot-8--suivi-mensuel) |
| 9 | [Suivi hebdomadaire](#lot-9--suivi-hebdomadaire) | 2 — Cœur métier | ✅ Clôturé | 09/10/2026 | 232 | [Bilan du lot 9](#bilan-du-lot-9--suivi-hebdomadaire) |
| 10 | [Épargne & objectifs](#lot-10--épargne--objectifs) | 2 — Cœur métier | ✅ Clôturé | 09/10/2026 | 266 | [Bilan du lot 10](#bilan-du-lot-10--épargne--objectifs) |
| 11 | [Simulateur & scénarios](#lot-11--simulateur--scénarios) | 3 — Intelligence et vues | ✅ Clôturé | 09/10/2026 | 288 | [Bilan du lot 11](#bilan-du-lot-11--simulateur--scénarios) |
| 12 | [Recommandations & KPI](#lot-12--recommandations--kpi) | 3 — Intelligence et vues | ✅ Clôturé | 09/10/2026 | 314 | [Bilan du lot 12](#bilan-du-lot-12--recommandations--kpi) |
| 13 | [Cumul du reste de mois en mois](#lot-13--cumul-du-reste-de-mois-en-mois) | 3 — Intelligence et vues | ✅ Clôturé | 10/10/2026 | 323 | [Bilan du lot 13](#bilan-du-lot-13--cumul-du-reste-de-mois-en-mois) |
| 14 | [Objectifs › vue Calendrier de l'année](#lot-14--objectifs--vue-calendrier-de-lannée) | 3 — Intelligence et vues | ✅ Clôturé | 10/10/2026 | 329 | [Bilan du lot 14](#bilan-du-lot-14--objectifs--vue-calendrier-de-lannée) |
| 15 | [Semaines en cartes](#lot-15--semaines-en-cartes) | 3 — Intelligence et vues | ✅ Clôturé | 11/10/2026 | 343 | [Bilan du lot 15](#bilan-du-lot-15--semaines-en-cartes) |
| 16 | [Aujourd'hui](#lot-16--aujourdhui) | 3 — Intelligence et vues | ✅ Clôturé | 12/10/2026 | 353 | [Bilan du lot 16](#bilan-du-lot-16--aujourdhui) |
| 17 | [Calendrier](#lot-17--calendrier) | 3 — Intelligence et vues | ✅ Clôturé | 12/10/2026 | 370 | [Bilan du lot 17](#bilan-du-lot-17--calendrier) |
| 18 | [Année](#lot-18--année) | 3 — Intelligence et vues | ✅ Clôturé | 12/10/2026 | 384 | [Bilan du lot 18](#bilan-du-lot-18--année) |
| 19 | [Onboarding & import V0](#lot-19--onboarding--import-v0) | 4 — Entrée et finitions | ✅ Clôturé | 12/10/2026 | 414 | [Bilan du lot 19](#bilan-du-lot-19--onboarding--import-v0) |
| 20 | [Export & sauvegarde](#lot-20--export--sauvegarde) | 4 — Entrée et finitions | ✅ Clôturé | 12/10/2026 | 426 | [Bilan du lot 20](#bilan-du-lot-20--export--sauvegarde) |
| 21 | [Finitions (polish)](#lot-21--finitions-polish) | 4 — Entrée et finitions | ✅ Clôturé (en partie) | 12/10/2026 | 429 | [Bilan du lot 21](#bilan-du-lot-21--finitions-partiel) |
| 22 | [Authentification (locale)](#lot-22--authentification-locale) | 4 — Entrée et finitions | ✅ Clôturé, remplacé par le lot 23 | 13/10/2026 | 441 | [Bilan du lot 22](#bilan-du-lot-22--authentification) |
| 23 | [Nettoyage, authentification et multi-utilisateur](#lot-23--nettoyage-authentification-et-multi-utilisateur) | 5 — Multi-utilisateur | 🟡 Livré, à valider | — | 453 | [Bilan du lot 23](#bilan-du-lot-23--nettoyage-authentification-et-multi-utilisateur) |
| 24 | [Comptes fiables et e-mails](#lot-24--comptes-fiables-et-e-mails) | 6 — Finalisation fonctionnelle | 🟡 Livré, à valider | — | 467 | [Bilan du lot 24](#bilan-du-lot-24--comptes-fiables-et-e-mails) |
| 25 | [Épargne synchronisée](#lot-25--épargne-synchronisée) | 6 — Finalisation fonctionnelle | 🟡 Livré, à valider | — | 473 | [Bilan du lot 25](#bilan-du-lot-25--épargne-synchronisée) |
| 26 | [Objectifs : vue annuelle](#lot-26--objectifs--vue-annuelle) | 6 — Finalisation fonctionnelle | 🟡 Livré, à valider | — | 480 | [Bilan du lot 26](#bilan-du-lot-26--objectifs--vue-annuelle) |
| 27 | [Aujourd'hui : tableau de bord](#lot-27--aujourdhui--tableau-de-bord) | 6 — Finalisation fonctionnelle | 🟡 Livré, à valider | — | 486 | [Bilan du lot 27](#bilan-du-lot-27--aujourdhui--tableau-de-bord) |
| 28 | [Projection pluriannuelle et endettement](#lot-28--projection-pluriannuelle-et-endettement) | 6 — Finalisation fonctionnelle | ⏭️ Prochain | — | — | — |
| 29 | [Exactitude des calculs et parcours](#lot-29--exactitude-des-calculs-et-parcours) | 7 — Validation et tests | ⬜ Prévu | — | — | — |
| 30 | [PostgreSQL, sécurité, PWA, légal](#lot-30--postgresql-sécurité-pwa-légal) | 8 — Préparation de la production | ↪️ Remplacé par [`prod.md`](prod.md) P0 à P7 | — | — | — |
| 31 | [Mise en ligne en bêta fermée](#lot-31--mise-en-ligne-en-bêta-fermée) | 9 — Déploiement et hébergement | ↪️ Remplacé par [`prod.md`](prod.md) P8 et P9 | — | — | — |
| 32 | [Abonnement payant](#lots-32-et-suivants--après-le-lancement) | 10 — Après le lancement | ⬜ Prévu | — | — | — |
| 33 | [Arabe et darija](#lots-32-et-suivants--après-le-lancement) | 10 — Après le lancement | ⬜ Prévu | — | — | — |
| 34 | [Import de relevés](#lots-32-et-suivants--après-le-lancement) | 10 — Après le lancement | ⬜ Prévu | — | — | — |

« Tests » = nombre total de tests automatiques du projet à la clôture du lot (partage + moteur + serveur + interface).

Autres sections :

- [1. Méthode et règles de travail](#1-méthode-et-règles-de-travail)
- [2. Lots clôturés](#2-lots-clôturés-0-à-15)
- [3. Lots livrés, en attente de validation](#3-lots-livrés-en-attente-de-validation)
- [4. Lots 20 à 23](#4-lots-20-à-23)
- [4 bis. Lots 24 à 34 : finaliser le SaaS](#4-bis-lots-24-à-34--finaliser-le-saas)
- [5. Points reportés, rangés par lot](#5-points-reportés-rangés-par-lot)
- [6. Historique des commits](#6-historique-des-commits)
- [7. Questions ouvertes](#7-questions-ouvertes)

## 1. Méthode et règles de travail

Chaque lot suit le même chemin :

**Analyse → plan du lot (rédigé dans docs/lots.md, § 8) → données → moteur → API → interface → tests → vérification dans le navigateur → correction → bilan → validation explicite → lot suivant.**

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
- **Livré** : analyse des ressources (`produit.md (Plan)` § 2), `produit.md (Plan)`, `produit.md (Contexte)`, `ux-ui.md (UX)`, `ux-ui.md (UI)`, décisions validées (`produit.md (Plan)` § 0).
- **Décisions** : cycle de paie fixe le 27, la paie finance le mois suivant ; comptes en base sans authentification ; onboarding avec import de la V0 ; thème clair ; interface identique au template.

### Lot 1 — Socle

- **Statut** : ✅ clôturé le 07/10/2026 · 28 tests · [Bilan du lot 1](#bilan-du-lot-1--socle).
- **Livré** :
  - monorepo npm : `ui/`, `server/`, `packages/moteur`, `packages/partage` ; TypeScript strict, Vitest ;
  - serveur Fastify sur `127.0.0.1:3010`, Prisma 6 + SQLite, migration initiale ;
  - comptes (`Utilisateur` + `Reglages`), en-tête `X-Utilisateur`, isolation des données testée ;
  - format d'erreur unique `{ erreur: { code, message, champs? } }` ;
  - moteur : montants en centimes ; client API et TanStack Query côté interface.
- **Écarts** : validation Zod faite à la main (`valider`) ; Prisma 6 plutôt que 7 ; Vite limité à `127.0.0.1` ; scripts d'installation de Prisma et esbuild autorisés dans `package.json`.

### Lot 2 — Design system

- **Statut** : ✅ clôturé le 07/10/2026, refait à l'identique du template · 39 tests · [Bilan du lot 2](#bilan-du-lot-2--design-system).
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

- **Statut** : ✅ clôturé le 07/10/2026 · 52 tests · [Bilan du lot 3](#bilan-du-lot-3--profils-et-réglages).
- **Livré** :
  - écran Profils : liste, dernière ouverture, création, renommage, suppression avec prénom à retaper ;
  - garde : sans compte → Profils ; compte retenu supprimé → retour à Profils avec message ;
  - menu de l'avatar ; écran Réglages : prénom, devise (lecture seule), mode de période, début de semaine, report hebdo, animations (enregistrement immédiat, « Annuler ») ;
  - route `POST /utilisateurs/:id/ouvrir`.
- **Écarts** : pas de Zustand ni de React Hook Form (un contexte React suffit) ; ajout de `@radix-ui/react-dropdown-menu` ; la page technique `/controle` du lot 1 est supprimée.

### Lot 4 — Salaire & cycle de paie

- **Statut** : ✅ clôturé le 07/10/2026 · 110 tests · [Bilan du lot 4](#bilan-du-lot-4--salaire-et-cycle-de-paie).
- **Livré** :
  - contrat de salaire versionné par **mois d'effet** : net, jour habituel, règle du week-end, « finance le mois suivant » ;
  - paies prévues (calculées), en retard, reçues (confirmées avec date et montants réels, écart affiché, annulation possible) ;
  - primes ponctuelles prévues sur une paie, primes imprévues ajoutées à la réception ;
  - mois budgétaires (bornes, durée, statut, mode calendaire), semaines et semaines partielles, répartition au prorata des jours ;
  - onglet Mon plan › Salaire & primes.
- **Décisions** : week-end → **lundi suivant** par défaut (le virement passe par la banque) ; le jour de paie ouvre le nouveau mois ; une paie en retard prolonge le mois en cours seulement si la paie précédente est reçue.
- **Écarts** : paies prévues calculées, pas stockées (une paie reçue garde une copie de son prévu, R27) ; plage `?du=&au=` au lieu de `?annee=` ; jours fériés non gérés.

### Lot 5 — Autres revenus

- **Statut** : ✅ clôturé le 07/10/2026 · 138 tests · [Bilan du lot 5](#bilan-du-lot-5--autres-revenus).
- **Livré** :
  - sources de revenus : type (prime, variable, autre), fréquences (mensuelle, trimestrielle, annuelle, unique, mois choisis), versement avec la paie ou à une autre date, certitude, début, fin ;
  - primes « avec la paie » ajoutées seules aux paies prévues ;
  - revenus reçus liés à une source ou libres, écart affiché, prévu jamais modifié (R3, R4) ;
  - équivalent mensuel, prochain versement, totaux par certitude sur 12 mois ; onglet Mon plan › Autres revenus.
- **Décision** : le mois d'une source est le **mois civil où l'argent arrive** (une prime de juin « avec la paie » finance juillet).
- **Écarts** : routes `GET /revenus/prevus` et `GET /revenus/resume` ajoutées ; « terminer » une source = choisir un dernier mois.

### Lot 6 — Charges, enveloppes, ponctuels, dettes

- **Statut** : ✅ clôturé le 08/10/2026 · 166 tests · [Bilan du lot 6](#bilan-du-lot-6--charges-enveloppes-ponctuels-dettes).
- **Livré** :
  - catégories par défaut (essentiel, flexible, engagement), création depuis un formulaire, suppression refusée si utilisée ;
  - charges fixes (jour, fréquence, début, fin, essentielle), enveloppes par mois budgétaire, ponctuels datés avec certitude ;
  - dettes : total + mensualité → échéancier calculé, paiements réels plafonnés au reste dû, dette soldée rangée dans « Terminées » (R9) ;
  - charges prévues d'un mois (une échéance à venir ne compte que ce qui reste dû) ; onglets Mon plan › Charges & enveloppes et Dettes.
- **Écarts** : échéancier calculé, pas stocké (pas de table `EcheanceDette`) ; une échéance en retard reste dans son mois et est signalée « Échéance en retard ».

### Lot 7 — Dépenses réelles

- **Statut** : ✅ clôturé le 08/10/2026 · 194 tests · [Bilan du lot 7](#bilan-du-lot-7--dépenses-réelles).
- **Livré** :
  - saisie rapide partout : bouton `+` (en-tête et barre mobile), touche `N`, feuille du bas sur mobile ; montant d'abord, catégories les plus utilisées en premier ;
  - rattachement au plan (R10) : échéance d'une charge fixe, enveloppe, ponctuel ou hors plan, avec proposition automatique (« Est-ce le paiement de Loyer ? ») et paiement en avance des échéances des 10 jours suivants ;
  - bouton « Payé » sur une charge prévue ; date future refusée ;
  - écran Mois › Dépenses : mois précédent / suivant, liste par jour, filtre par catégorie, modifier, supprimer avec « Annuler » ;
  - en-tête compact entre 1024 et 1280 px.
- **Écarts** : ajout du champ `echeance` à `Depense` ; les paiements de dettes restent saisis dans Mon plan › Dettes.

### Lot 8 — Suivi mensuel

- **Statut** : ✅ clôturé le 09/10/2026 · 209 tests · [Bilan du lot 8](#bilan-du-lot-8--suivi-mensuel).
- **Livré** :
  - Mois › Vue d'ensemble : reste réel et reste prévu séparés, écart d'un mois terminé, estimation de fin de mois pour le mois en cours (R23) ;
  - tableau prévu / réel / écart par ligne (paie, revenus à part et libres, charges fixes, enveloppes, ponctuels, échéances, hors plan), action « Payé » ou « Confirmer » ;
  - graphique du rythme (sorties réelles cumulées contre prévu cumulé) ;
  - clôture d'un mois passé (forcée possible avec mention), bilan figé, lecture seule, bornes qui ne bougent plus ; réouverture tracée (R21, R22) ;
  - lignes empilées sous 640 px ; boutons de clôture et de réouverture non rouges.
- **Écarts** : le prévu d'une échéance de dette est le montant de l'échéancier ; les paiements faits un autre mois apparaissent sur une ligne dédiée (« Payé ce mois pour un autre mois » / « Déjà payé un autre mois »).

### Lot 9 — Suivi hebdomadaire

- **Statut** : ✅ clôturé le 09/10/2026 · 232 tests · [Bilan du lot 9](#bilan-du-lot-9--suivi-hebdomadaire).
- **Livré** :
  - Mois › Semaines : réponse en tête (« Oui, avec 340 DH d'avance » / « 120 DH au-dessus du rythme prévu »), budget flexible du mois, prévu à date, dépensé ;
  - une ligne par semaine (lundi → dimanche, ou selon le réglage) : disponible, dépensé, reste, écart, tendance contre la moyenne des 4 semaines précédentes ; semaines partielles « 3 jours » au prorata des jours ;
  - semaine ouverte : dépenses par jour (modifier), charges datées avec statut, « + Ajouter » daté dans la semaine ;
  - KPI « Reste flexible (semaine) » et montant par jour ; report du reste sur la semaine suivante si le réglage est activé (jamais d'un mois à l'autre) ;
  - état vide sans enveloppe → Mon plan ; semaines figées à la clôture du mois.
- **Écarts** : le hors plan compte dans le flexible ; budgets au centime près (pas d'arrondi caché) ; les mois clôturés avant le lot 9 n'ont pas de semaines figées.
- **Corrigé en passant** : un réglage modifié rafraîchit les mois affichés ; détail d'une dépense sans répétition de la catégorie ; dossiers `salaire` du code jamais versionnés à cause de la règle `Salaire/` du `.gitignore` (règle ancrée à la racine, dossiers ajoutés, clone propre vérifié).

### Lot 10 — Épargne & objectifs

- **Statut** : ✅ clôturé le 09/10/2026 · 266 tests · [Bilan du lot 10](#bilan-du-lot-10--épargne--objectifs).
- **Livré** :
  - Mon plan › Épargne : comptes (solde déclaré à une date), versements et retraits, solde / réservé / disponible, alerte si les objectifs réservent plus que l'épargne (R12–R14) ;
  - objectifs : type, cible, déjà mis de côté, date souhaitée, versement mensuel, priorité (monter / descendre), pause, abandon, suppression ; achat réalisé sans dépense, annulable (R19) ;
  - projections : capacité d'épargne par scénario, répartition par priorité jamais au-delà de la capacité (R18), date estimée, risque (sûr / probable / fragile / hors de portée), effort mensuel et hebdo, leviers chiffrés si la date n'est pas tenue ;
  - pages Objectifs, Objectif (trajectoire réel / projeté / cible) et Nouvel objectif avec aperçu en direct ; fonds de sécurité proposé (3 à 6 mois de charges essentielles) ;
  - saisie rapide « De l'épargne » (bouton +), lignes d'épargne dans le bilan du mois et la semaine ouverte (R11).
- **Écarts** : types d'objectif de `ux-ui.md (UX)` § 4.4 ; `VersementObjectif` = `MouvementEpargne` lié à un objectif ; effort calculé depuis le début du mois en cours ; boutons monter / descendre au lieu du glisser-déposer.

### Lot 11 — Simulateur & scénarios

- **Statut** : ✅ clôturé le 09/10/2026 · 288 tests · [Bilan du lot 11](#bilan-du-lot-11--simulateur--scénarios).
- **Livré** :
  - page Simulateur (`/simulateur`, touche `S`, liens depuis Objectifs) : trois scénarios côte à côte, épargne projetée (réel plein, réaliste hachuré, prudent et ambitieux en pointillés), objectifs avec et sans leviers ;
  - leviers : versement mensuel, date cible, prime en plus, réduction d'une charge, horizon 6 / 12 / 24 / 36 mois (avertissement au-delà de 24) ; alertes claires (versements au-delà de la capacité, épargne négative) ;
  - trois questions prêtes ; enregistrer, rouvrir, supprimer un scénario ; appliquer au plan avec confirmation et résumé ;
  - Réglages › Scénarios : revenus retenus et dépenses flexibles par scénario ; le prudent prend la moyenne réelle des 3 derniers mois si elle dépasse le budget ; les Objectifs suivent ces règles.
- **Écarts** : un levier de chaque sorte à l'écran ; une prime appliquée devient une source « unique » probable ; une réduction appliquée coupe la charge et en crée une copie réduite le mois suivant ; pas de scénario « perso ».

### Lot 12 — Recommandations & KPI

- **Statut** : ✅ clôturé le 09/10/2026 · 314 tests · [Bilan du lot 12](#bilan-du-lot-12--recommandations--kpi).
- **Livré** :
  - les huit KPI de `produit.md (Plan)` § 8 dans le moteur (`indicateurs`), route `GET /indicateurs?mois=` ; carte « Indicateurs » dans Mois › Vue d'ensemble, base de chaque calcul à la demande ;
  - alertes (`alertes`) : paie en retard ou prévue aujourd'hui, revenu en retard, échéance en retard, enveloppe dépassée, semaine dépassée, objectifs au-delà de l'épargne ; rien pour un mois clôturé ni avant le début du suivi ;
  - recommandations (`recommandations`) : fin de mois serrée, effort pour tenir une date, réduire une enveloppe, mettre de côté une prime, affecter l'épargne disponible, fonds de sécurité ; chacune avec message, effet, base de calcul, condition, confiance (R24–R26) ;
  - cloche de l'en-tête : pastille du nombre d'alertes, panneau « À faire » + « Suggestions », actions vers l'écran concerné ; carte « Suggestions » sur Objectifs ; « Simuler » pré-remplit le simulateur.
- **Écarts** : le reste à dépenser retire aussi les charges datées encore à payer ; part variable sur les 12 prochains mois (prévu) ; écart du mois en cours comparé au prévu à date ; délai calculé en réaliste ; phrases rédigées dans `partage`.

### Lot 13 — Cumul du reste de mois en mois

- **Statut** : ✅ clôturé le 10/10/2026 · 323 tests · [Bilan du lot 13](#bilan-du-lot-13--cumul-du-reste-de-mois-en-mois).
- **Livré** :
  - moteur `cumulDesMois` : report, revenus, charges, épargne, reste et cumul de fin de mois ; réel (passé), estimation (en cours), prévu en réaliste (futur) ;
  - solde de départ du compte courant au début d'un mois (Réglages › Compte courant), sinon 0 au premier mois suivi ;
  - Mois › Vue d'ensemble : « Report / Solde de départ », « Reste du mois », « Cumul fin de mois » ; route `GET /cumul?du=&au=` ;
  - Mon plan › Salaire, tableau des Paies : Revenus · Charges · Épargne · Cumul fin de mois, mois par mois.
- **Décision** : le cumul suppose que ce qui n'est pas versé à un objectif reste sur le compte ; les Objectifs supposent qu'il est épargné. Deux hypothèses, affichées comme telles.

### Lot 14 — Objectifs › vue Calendrier de l'année

- **Statut** : ✅ clôturé le 10/10/2026 · 329 tests · [Bilan du lot 14](#bilan-du-lot-14--objectifs--vue-calendrier-de-lannée).
- **Livré** :
  - Objectifs : onglets « Objectifs » / « Calendrier de l'année », vue et année gardées dans l'adresse (`?vue=calendrier&annee=2027`) ;
  - bandeau de l'année : cumul fin décembre, mois le plus bas, reste cumulé de l'année, report de l'année précédente, revenus, charges, épargne ; alerte si un mois passe sous zéro ;
  - une carte par mois suivi : cumul fin de mois, jauge, revenus, charges, épargne, objectifs atteints (projection) ou à leur date souhaitée ; réel, en cours (cerclé) et prévu (pointillés, italique) ; les mois d'avant le suivi en une seule bande ;
  - fenêtre du mois : le calcul (report + revenus − charges − épargne = cumul), les objectifs du mois, puis chaque revenu, charge et versement avec son statut ; mois précédent / suivant, « Ouvrir le mois » ;
  - moteur `resumeCumul`, `resume` dans `GET /cumul` ; composant `Fenetre` (fenêtre centrée) ; `CalendrierAnnee` réutilisable par la page Année (lot 18).
- **Revu le 11/10/2026** (ta demande) : chaque mois devient un vrai calendrier (paie, charges datées par jour, aujourd'hui), ligne « Reste » (revenus − charges) sur chaque carte et dans la fenêtre, graphique du cumul sur l'année, les 12 mois affichés ; route `GET /annee/:annee`.
- **Correctif du 11/10/2026** : pages blanches en changeant de page (hook appelé sous condition dans la saisie rapide, transition qui attendait la sortie de la page précédente) ; chaque page a maintenant un filet d'erreur avec « Recharger ».

### Lot 15 — Semaines en cartes

- **Statut** : ✅ clôturé le 11/10/2026 · 343 tests (avec l'ajout des enveloppes) · [Bilan du lot 15](#bilan-du-lot-15--semaines-en-cartes).
- **Livré** :
  - Mois › Semaines : le tableau devient une grille de cartes, une par semaine : reste (ou disponible prévu), barre du dépensé avec repère du rythme, dépensé, disponible, écart, tendance, nombre de charges datées, épargne ; passée, en cours (cerclée), à venir (pointillés) ;
  - fenêtre de la semaine : budget, report, disponible, dépensé, reste ; jour, montant par jour, écart et tendance expliqués ; dépenses jour par jour (modifier, « + Ajouter » à la bonne date), charges datées, payé, épargne ; semaine précédente / suivante ;
  - carte « Cette semaine » : bouton « Voir le détail de la semaine » ; bloc « Lire une carte » à la place des barres « Dépensé par semaine ».
- **Écarts** : aucune semaine n'est ouverte d'office ; calculs inchangés (lot 9).
- **Ajout du 12/10/2026** (ta demande) : budget d'enveloppe = **budget du mois** ; par semaine, **tu mets le montant que tu veux sur chaque semaine** (mois en cours ou suivant), sans montant imposé ; une semaine sans montant reçoit 0 ; alerte si tes semaines dépassent le budget de l'enveloppe ; les semaines suivent le dépensé réel face à ces montants.

## 3. Lots livrés, en attente de validation

### Lot 16 — Aujourd'hui

- **Statut** : ✅ clôturé le 12/10/2026 · 353 tests · [Bilan du lot 16](#bilan-du-lot-16--aujourdhui).
- **Livré** :
  - héros : reste à dépenser du mois, par jour, jours restants ; reste de la semaine et sa barre ; phrase du calcul ;
  - « À faire » : paie à confirmer (confirmée sur place), échéances en retard, dépassements ; « 7 prochains jours » groupés par jour ; bilan de la semaine passée le premier jour de la semaine ;
  - épargne du mois, objectif prioritaire, 1 à 3 suggestions ; ajouter une dépense, noter un revenu reçu, ouvrir le mois ; état vide sans salaire ;
  - moteur `prochainsJours`, `semainePassee` ; route `GET /aujourdhui`.
- **Écart** : une seule lecture pour la page (une erreur affiche « Réessayer » pour toute la page, pas carte par carte).

### Lot 17 — Calendrier

- **Statut** : ✅ clôturé le 12/10/2026 · 370 tests · [Bilan du lot 17](#bilan-du-lot-17--calendrier).
- **Livré** :
  - page `/calendrier` : grille du mois budgétaire et vue liste ; navigation de mois ; vue et mois gardés dans l'adresse ;
  - événements typés (paie et primes, autres revenus, charges fixes, échéances de dettes, ponctuels) et dates d'objectifs ; filtre par type ; pastille « +N » ; marqueur « passé, pas confirmé » ;
  - solde du jour au survol : réel jusqu'à aujourd'hui, puis projeté (les restes datés pas confirmés) ; jamais mélangé sans le dire ;
  - détail d'un jour : prévu, réel, statut en mots, « Marquer payé » ou lien de confirmation, lien pour modifier dans Mon plan ; ajout d'un ponctuel daté à la date du jour ouvert ;
  - moteur `calendrierDuMois` ; route `GET /mois/:cle/calendrier` ; lien « Ouvrir le calendrier » depuis Aujourd'hui.
- **Écart** : modifier une charge ou un ponctuel passe par Mon plan (lien), pas par une fenêtre du calendrier ; le solde du calendrier part du début du mois (le report des mois précédents est dans le cumul, lot 13).

### Lot 18 — Année

- **Statut** : ✅ clôturé le 12/10/2026 · 384 tests · [Bilan du lot 18](#bilan-du-lot-18--année).
- **Livré** :
  - page `/annee`, onglets Synthèse et Calendrier (réutilise le calendrier de l'année du lot 14) ; année et vue dans l'adresse ;
  - revenus, dépenses, épargne de l'année : réel à date et projeté restant séparés ; bandeau « Année en cours / terminée / Projection » ;
  - graphique mensuel (plein = réel, hachuré = en cours ou prévu) ; les douze mois cliquables vers Mois, mois avant le suivi grisés ;
  - mois les plus coûteux, part variable du revenu, épargne cumulée, progression de chaque objectif (début, aujourd'hui, fin projetée) ;
  - moteur `suiviAnnuel` ; route `GET /annee/:annee/suivi` ; lien « Voir l'année » depuis Aujourd'hui.
- **Écart** : l'épargne cumulée est celle de l'année (somme des mois), pas le solde total des comptes ; le calendrier de l'année reste aussi dans Objectifs.

### Lot 19 — Onboarding & import V0

- **Statut** : ✅ clôturé le 12/10/2026 · 414 tests · [Bilan du lot 19](#bilan-du-lot-19--onboarding--import-v0).
- **Livré** :
  - page `/onboarding`, dix étapes que l'on peut passer, barre de progression, étape sauvegardée par compte, reprise, retour arrière sans perte ; un compte créé commence par la mise en route, un compte commencé affiche « Reprendre » sur Aujourd'hui ;
  - import d'un export money-guru : aperçu groupé par thème, Importer / Modifier / Ignorer, conflits posés en question (quel salaire ? dette ou aide ?) ; rien n'est importé comme réel ni créé sans confirmation ; « Savings » jamais en charge ; un même écart sur trois mois devient une charge fixe proposée ;
  - lignes importées « importé · à confirmer » aux étapes 3 à 9, confirmées avec les formulaires de Mon plan préremplis ; mode « mes revenus varient » ;
  - résumé : mois budgétaire, revenu et charges prévus, capacité d'épargne et date du premier objectif marquées « projection » ;
  - moteur `analyserMoneyGuru` et `decider` ; table `ImportSource` ; routes `/onboarding` et `/import/*`.
- **Écart** : l'étude HTML de la V0 n'est pas lue (ses chiffres se saisissent à la main) ; l'import d'un export MySalary arrive avec le lot 20 ; pas encore de bouton « relancer la mise en route » dans les Réglages.

## 4. Lots 20 à 23

### Lot 20 — Export & sauvegarde

- **Livré** : export JSON d'un compte, import en nouveau compte, réinitialisation, export proposé avant suppression et réinitialisation, `npm run sauvegarde`. Détail : [Bilan du lot 20](#bilan-du-lot-20--export--sauvegarde).
- **Écart** : pas de bouton de sauvegarde dans l'interface ; pas de restauration automatique.

### Lot 21 — Finitions (polish)

- **Livré** (en partie) : pages chargées à la demande, raccourcis `←` `→`, page introuvable à la place des textes de chantier, vitrine réservée au développement, lien « Aller au contenu ». Détail : [Bilan du lot 21](#bilan-du-lot-21--finitions-partiel).
- **Reste** : parcours de bout en bout avec Playwright ; points « proposés » du § 5.

### Lot 22 — Authentification (locale)

- **Livré** : mot de passe facultatif par profil local, sessions par cookie. Détail : [Bilan du lot 22](#bilan-du-lot-22--authentification).
- **Remplacé par le lot 23** : le compte ne vient plus d'un en-tête choisi par le client (`X-Utilisateur`) mais seulement de la session ; l'écran Profils disparaît.

### Lot 23 — Nettoyage, authentification et multi-utilisateur

- **Statut** : 🟡 livré le 12/10/2026, commité (`f629ca1`, `2bf9195`), en attente de validation explicite · 453 tests · [Bilan du lot 23](#bilan-du-lot-23--nettoyage-authentification-et-multi-utilisateur).
- **Livré** :
  - audit et nettoyage : code mort supprimé (composant `Tableau`, fonctions et constantes jamais utilisées, doublon `moisAbrege`), routes et écrans remplacés retirés (Profils, `/utilisateurs/*`, en-tête `X-Utilisateur`) ;
  - inscription (prénom, e-mail, mot de passe, devise), connexion, déconnexion, mot de passe oublié par lien à usage unique (1 h), changement de mot de passe ; pages de connexion au design de l'app ;
  - sessions : cookie `HttpOnly`, `SameSite=Strict`, `Secure` en HTTPS, 30 jours, jeton stocké haché, renouvelé à chaque connexion ; toutes les sessions fermées au changement ou à la réinitialisation du mot de passe ;
  - isolation : le compte courant vient uniquement de la session ; toutes les routes de données sont protégées ; les routes du compte (`/compte/*`) ne visent que le compte connecté ; suppression et réinitialisation redemandent le mot de passe ;
  - essais limités (5 par e-mail et 20 par adresse en 15 min ; 5 demandes de lien par heure) ; e-mail inconnu et mauvais mot de passe donnent la même réponse ;
  - migration `comptes_email` : les comptes existants gardent leurs données ; `npm run compte:activer -- <prénom> <e-mail>` leur donne un e-mail et un lien pour choisir le mot de passe ;
  - restauration d'un export dans un compte vide (Réglages › Sauvegarde) à la place de « importer en nouveau compte ».
- **Blocage à lever par toi** : ton compte `oussama` doit être activé une fois (commande ci-dessus) pour être accessible.
- **Ajout du 12/10/2026** : changement de l'e-mail de connexion dans Réglages (mot de passe exigé, adresse unique) ; 453 tests.
- **Prochaines étapes** : reprises dans les lots 24 (e-mails, vérification), 30 (PostgreSQL) et 31 (HTTPS).

## 4 bis. Lots 24 à 34 : finaliser le SaaS

Décidés le 12/10/2026 après l'étude de marché (`docs/etude/Etude-marche-2026-10.html`, positionnement dans `produit.md (Plan)` § 15). Les lots 24 à 31 sont les prérequis du lancement en bêta fermée. Le périmètre fonctionnel est clos à la fin du lot 28 : rien d'autre n'entre avant le lancement sans nouvelle décision.

> Numérotation : l'étude parle des lots 24 à 31. Le 15/10/2026, les lots 25 à 27 ont été insérés à ta demande ; les lots de l'étude 25 à 31 sont devenus 28 à 34.

### Lot 24 — Comptes fiables et e-mails

- **Statut** : 🟡 livré le 12/10/2026, en attente de validation · 467 tests · [Bilan du lot 24](#bilan-du-lot-24--comptes-fiables-et-e-mails). Reste à faire par toi : test d'envoi dans une vraie boîte (fournisseur et domaine à choisir), repris au lot P8 de [`prod.md`](prod.md).
- **Contenu** : vérification de l'adresse e-mail à l'inscription (lien à usage unique, renvoi, bandeau tant que non vérifiée) ; changement d'e-mail appliqué seulement après le clic dans le lien envoyé à la nouvelle adresse ; envoi par un fournisseur transactionnel via `SMTP_URL` (gabarits HTML et texte, SPF, DKIM, DMARC) ; purge des sessions et liens expirés.
- **Dépend de** : lot 23. **Effort** : 3 à 4 jours.
- **Validation** : parcours complets avec une vraie boîte de réception ; lien expiré ou réutilisé refusé ; e-mails hors spam sur Gmail et Outlook.

### Lot 25 — Épargne synchronisée

- **Statut** : 🟡 livré le 15/10/2026, en attente de validation · [Bilan du lot 25](#bilan-du-lot-25--épargne-synchronisée).
- **Problème** : le versement mensuel d'un objectif (ex. 4 000 DH pour la moto) comptait déjà dans le bilan et le cumul, mais Mon plan › Épargne ne montrait que le réel ; sans compte d'épargne déclaré, aucun versement ne pouvait être noté et l'épargne déjà mise de côté (9 000 DH) était signalée « en trop » ; après une dépense ou une charge, les pages Objectifs et Épargne ne se recalculaient pas.
- **Livré** : plan d'épargne du mois (prévu, versé, reste à verser) dans Mon plan › Épargne, avec « Noter » pré-rempli ; compte non déclaré = solde inconnu (plus d'alerte « en trop », invitation à déclarer le compte, solde proposé) ; alertes « versement prévu » et « compte d'épargne à déclarer » ; toute écriture recharge toutes les vues du compte.

### Lot 26 — Objectifs : vue annuelle

- **Statut** : 🟡 livré le 15/10/2026, en attente de validation · [Bilan du lot 26](#bilan-du-lot-26--objectifs--vue-annuelle).
- **Livré** : le calendrier de l'année quitte la page Objectifs (il reste dans la page Année) ; à sa place, une vue unique : indicateurs (progression globale, épargné, reste, objectifs à risque), trajectoire de l'année (réel puis projection réaliste), fin d'année par scénario, prochaines actions (versements à noter, leviers chiffrés), liste par priorité enrichie de la fin d'année ; chaque objectif reste cliquable vers son détail.

### Lot 27 — Aujourd'hui : tableau de bord

- **Statut** : 🟡 livré le 15/10/2026, en attente de validation · [Bilan du lot 27](#bilan-du-lot-27--aujourdhui--tableau-de-bord).
- **Livré** : indicateurs du mois (revenus reçus, dépensé, épargne, objectifs), « À faire » numéroté (le versement prévu s'ouvre pré-rempli), « Où part ton argent » (postes du plus lourd au plus léger, part des revenus, rythme des enveloppes), « À surveiller » (enveloppes dépassées ou trop rapides, grosses dépenses du mois) ; composants premium inspirés de Lightswind (carte lumineuse, anneau de progression, tuile d'indicateur).

### Lot 28 — Projection pluriannuelle et endettement

- **Contenu** : projection de l'épargne à 1, 3, 5 et 10 ans par scénario, avec fourchette au-delà de 24 mois, fin des dettes, hausse de salaire annuelle facultative ; taux d'endettement (mensualités ÷ revenus garantis) avec seuil réglable, 40 % par défaut ; modèles d'événements de l'année pour les ponctuels (Ramadan, Aïd al-Adha, rentrée, vacances, 13e mois), montant toujours saisi par l'utilisateur.
- **Dépend de** : moteur existant. **Effort** : 4 à 5 jours.
- **Validation** : projection à 12 mois identique à l'actuelle ; cas chiffrés ; le réel n'est jamais modifié.

### Lot 29 — Exactitude des calculs et parcours

- **Contenu** : cas de référence chiffrés à la main (reste à dépenser, semaine, cumul, objectif, scénario, endettement) ; propriétés étendues ; 6 parcours Playwright (inscription → onboarding, dépense, paie confirmée, objectif, simulation, clôture) ; accessibilité ; responsive 375 et 1342 px.
- **Dépend de** : lot 28. **Effort** : 3 à 4 jours. Reprend le reste du lot 21 (Playwright).
- **Validation** : tous les cas au centime ; parcours verts.

### Lot 30 — PostgreSQL, sécurité, PWA, légal

- **Remplacé le 15/10/2026** par les lots P0 à P7 de [`prod.md`](prod.md#10-lots-p0-à-p9) : PostgreSQL et reprise des données (P4), sécurité, en-têtes et journaux (P2), pages légales (P3), build, Netlify et PWA (P5), CNDP (P0, P8).

### Lot 31 — Mise en ligne en bêta fermée

- **Remplacé le 15/10/2026** par les lots P8 (mise en production, bêta fermée de 10 à 20 testeurs) et P9 (recette) de [`prod.md`](prod.md#10-lots-p0-à-p9). Critères : [`prod.md` § 11](prod.md#11-critères-douverture).

### Lots 32 et suivants — après le lancement

- **32 Abonnement payant** : CMI récurrent ou revendeur, essai gratuit, prix testé en bêta.
- **33 Arabe et darija** : extraction des textes, écriture de droite à gauche.
- **34 Import de relevés** : CSV, puis SMS bancaires collés.
- **Selon les retours** : rappels par e-mail, double authentification, budget partagé du foyer, assistant, net depuis le brut, jours fériés.

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
| Glisser-déposer pour l'ordre des objectifs (aujourd'hui : monter / descendre) | lot 10 | après le lancement |
| Scénario « perso » avec ses propres règles | lot 11 | non planifié |
| Réglages › Catégories (renommer, fusionner) | lot 6 | 21 (proposé, à confirmer) |
| Modifier une charge « à partir de maintenant » ou « depuis le début » (ux-ui.md (UX) § 5.11) ; aujourd'hui une modification s'applique à tous les mois non clôturés | lot 6 | 21 (proposé, à confirmer) |
| Suspendre ou archiver un élément de Mon plan (aujourd'hui : choisir un dernier mois, ou supprimer) | lot 6 | 21 (proposé, à confirmer) |
| Aperçu de l'effet avant de changer de mode de période (ux-ui.md (UX) § 5.12) | lot 3 | 21 (proposé, à confirmer) |
| Jours fériés (seul le week-end décale la paie) | lot 4 | après le lancement (selon les retours) |
| Parcours de bout en bout avec Playwright | lot 21 | 29 |
| Vérification de l'e-mail, envoi réel des e-mails | lot 23 | ✅ fait au lot 24 (test en vraie boîte reporté en P8, `prod.md`) |
| PostgreSQL, HTTPS | lot 23 | `prod.md` P4, P5, P8 |

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
| `77d42e4` | Suivi des lots déplacé dans `docs/lots.md` |
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
| `30b32f9` | Enveloppe : budget du mois, montant libre sur chaque semaine ; les semaines ne reçoivent que ces montants |
| `7db32ac` | Lot 17 : calendrier du mois (grille, liste, solde projeté) |
| `c9e63e6` | Lot 18 : page Année (suivi annuel) |
| `23c07b0` | Lot 19 : onboarding et import de l'ancienne app ; reste de chaque enveloppe sur les cartes de semaine |
| `358f4a5` | Lot 20 : export, restauration, réinitialisation, sauvegarde de la base ; suivi des enveloppes par semaine |
| `2592f49` | Lot 21 : pages à la demande, raccourcis de période |
| `3715fc6` | Lot 22 : mot de passe par profil local |
| `336fb65`, `f159872` | Page Objectif : simulation avec le cumul de fin de mois |
| `f629ca1`, `2bf9195` | Lot 23 : nettoyage, authentification et multi-utilisateur |
| `0535bd8` | Changement d'e-mail dans Réglages ; étude de marché et plan des lots 24 à 31 ; lot 24 : confirmation de l'adresse et e-mails |
| `d5ee35d`, `fa1fe9e` | Documentation réunie dans `docs/` (`produit.md`, `ux-ui.md`, `lots.md`) ; `README.md` seul à la racine |
| — (à commiter) | `CLAUDE.md` et `docs/decisions/` ; lots 25 à 27 : épargne synchronisée, objectifs en vue annuelle, tableau de bord Aujourd'hui |

## 7. Questions ouvertes

1. Où placer **Réglages › Catégories** (renommer, fusionner) ? Proposition : lot 21.
2. Où placer le choix **« à partir de maintenant » / « depuis le début »** quand on modifie une charge ? Proposition : lot 21.
3. Où placer **suspendre / archiver** un élément de Mon plan ? Proposition : lot 21.
4. Où placer l'**aperçu de l'effet** d'un changement de mode de période ? Proposition : lot 21.
5. Faut-il gérer les **jours fériés** pour la date de paie ? Aujourd'hui, seul le week-end la décale. → reporté après le lancement.
6. Questions 1 à 4 : hors du périmètre de lancement fixé le 12/10/2026 ; reprises après la bêta selon les retours.
7. **Hébergement** au Maroc ou à l'étranger (autorisation CNDP) : décision D14 de [`prod.md`](prod.md#3-décisions), à trancher au lot P0.
8. **Encaissement** CMI ou revendeur : à trancher avant le lot 32.

## 8. Bilans détaillés des lots

Un bilan par lot : périmètre, règles, tests, bugs corrigés. Chaque titre rappelle le fichier d’origine.

### Bilan du lot 1 — Socle

> Ancien fichier `docs/lots/Lot-01-socle.md`.

> Statut : **clôturé et validé** (07/10/2026). Référence : `produit.md (Plan)` § 5 · `docs/lots.md`.

#### Objectif

Poser les fondations techniques. Aucune fonction métier visible.

#### Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Monorepo workspaces npm : `ui/`, `server/`, `packages/moteur`, `packages/partage` | Design system (lot 2) |
| TypeScript strict partout, Vitest | Écran Profils stylé (lot 3) |
| Serveur Fastify sur 127.0.0.1:3010 | Salaire, paies, cycle (lot 4) |
| Prisma + SQLite, migration initiale | Toute logique financière |
| Comptes : `Utilisateur` + `Reglages` créés ensemble | Authentification (lot 19) |
| En-tête `X-Utilisateur` → utilisateur courant | |
| Format d'erreur unique `{ erreur: { code, message, champs? } }` | |
| Isolation des données par utilisateur, testée | |
| Moteur : module `argent` (centimes) | |
| UI : squelette Vite + React 18, client API, TanStack Query, page technique de contrôle | |

#### Routes livrées

| Route | Rôle | Utilisateur requis |
|---|---|---|
| `GET /api/v1/sante` | Le serveur répond | Non |
| `GET /api/v1/utilisateurs` | Liste des comptes | Non |
| `POST /api/v1/utilisateurs` | Créer un compte (+ réglages par défaut) | Non |
| `PUT /api/v1/utilisateurs/:id` | Renommer | Non |
| `DELETE /api/v1/utilisateurs/:id` | Supprimer un compte et toutes ses données | Non |
| `GET /api/v1/reglages` | Réglages du compte courant | Oui |
| `PUT /api/v1/reglages` | Modifier les réglages du compte courant | Oui |

#### Critères de validation

- [x] `npm run verifier` passe : types, tests, build.
- [x] Création, liste, renommage, suppression de comptes.
- [x] Sans en-tête ou avec un identifiant inconnu → erreur 401 normalisée.
- [x] L'utilisateur A ne lit ni ne modifie jamais les réglages de B.
- [x] Une entrée invalide → erreur 400 avec le détail par champ.
- [x] Le moteur convertit et additionne les montants en centimes sans erreur d'arrondi.
- [x] L'UI démarre, appelle le serveur, affiche les comptes.

#### Résultat

- `npm run verifier` : types OK, **28 tests** OK (partage 7, moteur 7, serveur 10, ui 4), build OK.
- Vérifié en direct (`npm run dev`) : santé, création de compte, réglages par compte, erreurs 400 et 401, suppression, page technique dans le navigateur, aucune erreur console.

#### Écarts et remarques

- Validation Zod faite à la main (`valider`) plutôt qu'avec `fastify-type-provider-zod` : une dépendance de moins, format d'erreur maîtrisé.
- Prisma 6 (et non 7) : configuration stable et connue.
- Vite écoute sur `127.0.0.1` et non sur le réseau (`host: true` de la skill) : sans mot de passe, l'app ne doit pas être visible des autres appareils.
- npm 11 bloque les scripts d'installation : Prisma et esbuild ont été autorisés dans `package.json` (`allowScripts`).
- La page affichée est **technique** : elle sera remplacée par l'écran Profils (lot 3) avec le design system (lot 2).

### Bilan du lot 2 — Design system

> Ancien fichier `docs/lots/Lot-02-design-system.md`.

> Statut : **clôturé et validé**, refait à l'identique du template (07/10/2026). Référence : `ux-ui.md (UI)`, skill UI-Stealer, `docs/lots.md`.

#### Objectif

Construire tous les éléments visuels de MySalary et les valider sur une **page vitrine**, avant de construire les vrais écrans.

#### Périmètre

| Inclus | Exclu |
|---|---|
| Tailwind 3.4 + tokens de `ux-ui.md (UI)` (sauge, nacre, encre, ardoise, sémantiques, séries) | Écrans métier (lots 3 et suivants) |
| Polices Inter + Instrument Serif, locales | Données réelles |
| Fond nacré + blobs, **fenêtre** + **rail en verre** (recette de la skill), barre d'onglets mobile | |
| Animations : variantes partagées, transitions de vue, bascule on/off, `prefers-reduced-motion` | |
| Composants : Bouton, Champ, ChampMontant, ChampPremium, Carte, CarteHeros, Montant animé, Kpi, Pilule, BadgeNature, BadgeRisque, BarreProgression, Tableau, Onglets, Panneau, Notifications, TitreMixte | |
| Graphiques : thème commun, trajectoire (réel / projeté hachuré / cible), barres revenus · dépenses · épargne, infobulles | |
| Routage : vitrine, page technique, pages à venir | |
| Tests de composants (jsdom) | |

Toutes les données de la vitrine sont marquées **« exemple »**.

#### Décision : palette des graphiques

La palette catégorielle prévue dans `ux-ui.md (UI)` (§ 2.6) a été passée au validateur de la skill `dataviz`. Elle **échoue** : trop grise (chroma), séries indiscernables pour les daltoniens.

Palette retenue (3 séries, validée en tous couples) :

| Série | Couleur | Remarque |
|---|---|---|
| Revenus | `#3A74B8` bleu ardoise | |
| Dépenses | `#D08A2E` cuivre | contraste < 3:1 → étiquettes visibles obligatoires |
| Épargne | `#9C4F8C` prune | |

Les vert et terracotta sont écartés des séries : ils sont réservés aux statuts (positif / négatif). Une série unique (rythme, trajectoire) reste en sauge.

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Le rail est une couche **derrière** la fenêtre, pas dedans (vérifié par test DOM et dans le navigateur).
- [x] Bascule animations : coupe les mouvements, respecte `prefers-reduced-motion`.
- [x] Contrastes AA sur les textes (dégradé héro assombri en fin : `#69776E` au lieu de `#7D8C82`).
- [x] Page vitrine lisible à 375, 768, 1280 px, sans défilement horizontal.
- [x] Validation visuelle sur la vitrine.

#### Révision du 07/10/2026 — interface identique au template

Ton retour : le rendu ne ressemblait pas à `Templates/image.png`. La première version appliquait le style maison de la skill (rail en verre, fenêtre posée sur un fond nacré, police serif, blobs animés), absent du template.

Refait à l'identique du template :

- barre du haut blanche (logo, liens icône + texte, onglet actif souligné, boutons ronds gris, séparateur, avatar) ;
- fil d'Ariane + bouton menu à droite ;
- grande carte + colonne latérale de 352 px ;
- bandeau à cercles, tableau en champs avec bouton `+`, bloc interne, totaux ;
- cartes latérales (avatar, « ••• », bouton teinté, montant 30 px, pastille, interrupteur) ;
- deux boutons blancs + grand bouton plein ; bouton « › » au bord droit ;
- couleurs relevées au pixel, violet remplacé par la sauge (`ux-ui.md (UI)` § 1.5) ;
- police Plus Jakarta Sans, icônes pleines dessinées dans le style du template.

La vitrine montre cet écran avec un contenu MySalary (un mois budgétaire), puis les autres composants dans le même style.

Corrigé pendant la vérification :

- **bug** : l'utilitaire de fusion des classes supprimait la couleur quand une taille de texte personnalisée suivait (`text-lien` + `text-texte`) → configuré et testé ;
- séparateur de milliers trop fin dans cette police → espace insécable ;
- débordement horizontal en mobile causé par les textes pour lecteurs d'écran → conteneurs défilants positionnés.

Résultat : `npm run verifier` OK, **39 tests**, aucun défilement horizontal à 375 px, rendu comparé au template à 1342 px.

#### Résultat

- `npm run verifier` : types OK, **37 tests** OK (dont 13 de composants), build OK.
- Vérifié dans le navigateur à 1440 px et 375 px :
  - rail : fond blanc 25 %, flou 40 px, couche z-0 ; fenêtre z-10 qui le chevauche de 32 px ;
  - polices Inter et Instrument Serif chargées en local ;
  - aucun défilement horizontal en mobile ; le tableau masque la colonne « Prévu » et reste lisible ;
  - panneau de saisie, toast avec « Annuler », bascule des animations (blobs figés, classe `sans-animations`).
- Corrigé pendant la vérification : axe du graphique de trajectoire (valeurs rondes), étiquette « Aujourd'hui » qui chevauchait la cible.

#### Écarts et remarques

- **Palette des graphiques remplacée** (voir plus haut) : la palette sauge pâle échouait au validateur.
- Paquet JS principal ≈ 540 ko (framer-motion, Radix, zod). Sans effet pour une app locale ; à optimiser au lot de finition.
- Les captures d'écran du navigateur intégré se figent parfois (blobs animés en boucle) : contrôle fait par le DOM et les styles calculés, comme le recommande la skill.
- Pages à venir : chaque destination du rail affiche « Cette page arrive au lot N ».
- À traiter au lot 3 : si le compte retenu sur l'appareil n'existe plus (erreur 401), revenir à l'écran Profils.

#### Où regarder

- Vitrine : http://127.0.0.1:6010/vitrine (après `npm run dev`)
- Page technique : http://127.0.0.1:6010/controle

### Bilan du lot 3 — Profils et réglages

> Ancien fichier `docs/lots/Lot-03-profils-reglages.md`.

> Statut : **clôturé et validé** (07/10/2026). Références : `ux-ui.md (UX)` § 4.0, § 5.0, § 5.12 · `produit.md (Plan)` § 5.7.

#### Objectif

Choisir son compte, en créer un, et régler son profil. Remplace la page technique du lot 1.

#### Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Écran **Profils** : liste des comptes, dernière ouverture, création, renommage, suppression (double confirmation) | Onboarding (lot 16) |
| Garde : sans compte choisi → Profils ; compte retenu supprimé → retour à Profils avec message | Export avant suppression (lot 17) |
| Menu de l'avatar : changer de compte, réglages | Jour de paie, contrat de salaire (lot 4) |
| Écran **Réglages** : prénom, devise (lecture seule), mode de période, début de semaine, report hebdo, animations | Catégories, règles des scénarios (lots 6 et 11) |
| Animations : le réglage du compte pilote la bascule (déjà prête au lot 2) | Authentification (lot 19) |
| Serveur : date de dernière ouverture, route « ouvrir un compte » | |

Les deux écrans suivent la structure du template : fil d'Ariane, carte principale, colonne latérale de 352 px, grand bouton plein.

#### Routes ajoutées

| Route | Rôle |
|---|---|
| `POST /api/v1/utilisateurs/:id/ouvrir` | Marque le compte comme ouvert maintenant (tri de la liste) |

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Sans compte : toute page renvoie vers Profils.
- [x] Compte retenu supprimé : retour à Profils, message clair, aucune erreur affichée en double.
- [x] Création : prénom vide refusé avec message sous le champ.
- [x] Changement de compte : aucune donnée de l'ancien compte ne reste à l'écran.
- [x] Suppression : il faut retaper le prénom pour confirmer.
- [x] Chaque réglage s'enregistre tout seul, avec un toast « Annuler ».
- [x] Rendu fidèle au template, sans débordement à 375 px.

#### Résultat

- `npm run verifier` : types OK, **52 tests** OK (partage 7, moteur 7, serveur 12, interface 26), build OK.
- Vérifié dans le navigateur avec un compte de test « Essai », supprimé ensuite. Le compte « oussama » n'a pas été touché.
  - Compte retenu mais supprimé → retour à Profils, message « Ce compte n'existe plus ».
  - Création → ouverture → page Aujourd'hui ; avatar et menu du compte à jour.
  - Réglages : enregistrement immédiat, effet visible (animations coupées), « Annuler » rétablit la valeur côté serveur.
  - Suppression depuis les Réglages : prénom à retaper, un seul message, aucune erreur 401.
  - Aucun débordement à 375 px.

#### Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Suppression du compte courant : deux messages, dont « Ce compte n'existe plus » | Le compte est quitté dans la mutation, avant le rechargement de la liste |
| Le message « Compte supprimé » disparaissait quand la page se fermait | Message donné par la mutation elle-même |
| Erreurs 401 en console avec un compte supprimé retenu | Les réglages ne sont demandés qu'une fois le compte vérifié |
| Tests : `localStorage` vide sous Node 26 (Node fournit le sien, qui masque celui de jsdom) | Stockage en mémoire installé dans la préparation des tests |

#### Écarts et remarques

- Pas de Zustand ni de React Hook Form pour l'instant : un contexte React suffit pour le compte courant, et le formulaire de création réutilise directement le schéma Zod partagé. À réévaluer quand les formulaires grossiront (lots 4 à 7).
- Ajout de `@radix-ui/react-dropdown-menu` : menu de l'avatar et menus « ••• » accessibles au clavier.
- La page technique `/controle` du lot 1 est supprimée, remplacée par Profils.
- L'export avant suppression (ux-ui.md (UX) § 5.0) viendra avec le lot 17.
- Les pages encore vides affichent « Cette page arrive au lot N » : texte de chantier, à retirer au fil des lots.

### Bilan du lot 4 — Salaire et cycle de paie

> Ancien fichier `docs/lots/Lot-04-salaire.md`.

> Statut : **clôturé et validé** (07/10/2026). Références : `produit.md (Plan)` § 6, § 7.1 · `produit.md (Contexte)` § 4.3, R27–R30 · `ux-ui.md (UX)` § 4.2, § 5.11.

#### Objectif

Décrire son salaire une fois, puis seulement confirmer chaque paie. MySalary en déduit les **mois budgétaires** (de paie à paie) et leurs **semaines**. Tous les lots suivants s'appuient sur ce découpage.

#### Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Contrat de salaire **versionné** : montant net, jour habituel, règle du week-end, « finance le mois suivant », mois d'effet | Primes récurrentes (trimestrielles, annuelles…) et revenus à part : lot 5 |
| Paies **prévues** (calculées depuis le contrat), **en retard**, **reçues** (confirmées) | Clôture d'un mois : lot 8 |
| Primes **ponctuelles** prévues sur une paie, et primes imprévues ajoutées à la réception | Carte « Paie prévue aujourd'hui » sur Aujourd'hui : lot 13 |
| Confirmation : date réelle, montant reçu par ligne, écart affiché ; annulation possible | Jours fériés (seul le week-end est géré) |
| Mois budgétaires : bornes, durée, statut (passé, en cours, à venir), mode calendaire | Budget hebdo, montant par jour : lots 8 et 9 |
| Semaines du mois, semaines partielles, répartition au prorata des jours | |
| Écran **Mon plan › Salaire & primes** | Autres onglets de Mon plan : lots 5, 6, 10 |

#### Règles de calcul (moteur)

Le moteur ne lit jamais l'horloge : la date du jour est un paramètre. Les dates sont des dates civiles `AAAA-MM-JJ`, sans fuseau.

##### Contrat

- Une **version** s'applique à partir d'un **mois financé** (`moisEffet`), jusqu'à la version suivante.
- Une paie reçue garde une copie de ce qui était prévu : changer le contrat ne modifie jamais une paie reçue (R27).

##### Date prévue d'une paie

Pour le mois financé M :

1. Mois de versement = M − 1 si « finance le mois suivant », sinon M.
2. Jour = jour habituel, ou dernier jour du mois s'il n'existe pas (31 → 28 février).
3. Si ce jour tombe un samedi ou un dimanche : lendemain ouvré (`apres`, par défaut : le virement passe par la banque), veille ouvrée (`avant`) ou aucun changement (`aucune`).

##### Statut d'une paie

| Statut | Condition |
|---|---|
| Prévue | Non reçue, date prévue aujourd'hui ou plus tard |
| En retard | Non reçue, date prévue passée |
| Reçue | Confirmée avec une date réelle |

##### Bornes d'un mois budgétaire (mode cycle de paie)

- **Début** = date réelle de la paie qui le finance, sinon sa date prévue (R28, R30).
- **Fin** = veille du début du mois suivant.
- **Paie en retard** : si la paie précédente est reçue et qu'une seule paie est en retard depuis, le mois en cours se prolonge jusqu'à aujourd'hui inclus ; le mois suivant commence demain (« attendue »). Si plusieurs paies sont en retard, les dates prévues sont gardées et l'écran demande de les confirmer.
- Avant la première version du contrat, les dates suivent le motif de la première version (sans montant).
- Sans contrat : mois civils, avec la mention « ajoute ton salaire ».

**Mode calendaire** : du 1er au dernier jour du mois civil. Les paies restent rattachées à leur mois.

##### Confirmation d'une paie

- Date réelle : pas dans le futur ; strictement après la paie du mois précédent et strictement avant celle du mois suivant (réelle si reçue, sinon prévue). Sinon, message clair qui propose de changer de mois financé (R29).
- Montant reçu pour chaque ligne prévue (0 si une prime n'est pas venue), primes imprévues possibles.
- Écart = total reçu − total prévu.
- Annuler une confirmation remet la paie en « prévue » et garde les primes prévues.

##### Semaines

Découpées dans le mois budgétaire, à partir du jour de début choisi dans les réglages (lundi par défaut). La première et la dernière peuvent être partielles. Un montant se répartit au prorata des jours, sans perdre un centime (plus fort reste).

#### Données

| Table | Champs |
|---|---|
| `ContratSalaire` | `moisEffet` (unique par compte), `montantNet`, `jourHabituel`, `regleJourNonOuvre`, `financeMoisSuivant` |
| `Paie` | `moisFinance` (unique par compte), `dateReelle?`, `datePrevue?` (copie à la réception), `recueLe?` |
| `LignePaie` | `paieId`, `type` (`salaire` \| `prime`), `libelle`, `certitude`, `montantPrevu?`, `montantRecu?`, `ordre` |

Une paie n'est enregistrée que si l'utilisateur agit dessus (prime prévue ou réception). Les autres sont calculées.

#### Routes

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

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Tests du moteur : paie du 27/01 → « Février » du 27/01 au 26/02 ; 31 → fin février ; week-end avant / après / aucune ; versions ; paie en avance, en retard, reçue ; mois calendaire ; semaines partielles ; répartition exacte.
- [x] Tests serveur : isolation entre comptes, refus des dates incohérentes, annulation d'une confirmation.
- [x] Écran Mon plan › Salaire : créer le contrat, voir les paies, ajouter une prime, confirmer, refus d'une date incohérente.
- [x] Rendu fidèle au template, sans débordement à 375 px.

#### Résultat

- `npm run verifier` : types OK, **109 tests** OK (partage 12, moteur 39, serveur 23, interface 35), build OK.
- Moteur : propriété testée sur 10 ans de dates (les semaines couvrent toujours le mois jour pour jour) et sur 60 mois consécutifs (aucun trou, aucun chevauchement).
- Vérifié dans le navigateur avec un compte de test « Essai », supprimé ensuite. Le compte « oussama » n'a pas été touché.
  - Contrat 10 000 DH le 27 : aperçu « Octobre 2026 irait du 25 sept. au 26 oct. » (le 27/09/2026 est un dimanche ; règle « avant » testée ce jour-là, défaut changé ensuite en « lundi »).
  - Confirmation : la paie passe en « Reçue », le début du mois devient réel, la carte suivante propose novembre.
  - Prime prévue de 1 500 DH sur novembre : total prévu 11 500 DH.
  - Date incohérente refusée sous le champ, saisie conservée.
  - Aucun débordement à 375 px.

#### Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| La toute première paie du contrat, non confirmée, était traitée « en retard » : le mois commençait demain (« Octobre irait du 8 au 26 oct. ») | La prolongation ne s'applique que si la paie précédente est reçue. Test ajouté. |
| Choix du mois affiché en anglais (« October 2026 », sélecteur natif) | Liste de mois en français |
| Statut coupé dans le tableau (« Attendue depuis 12 jo… ») | Statut court dans le tableau, complet au survol et dans le panneau |
| « paie de octobre » | Élision : « paie d'octobre », « d'avril », « d'août » (testé) |
| Message « 25 sept.. » et bouton « Annuler » coupé sur deux lignes | Ponctuation et largeur du bouton corrigées |
| Tests : `ResizeObserver` absent de jsdom | Remplaçant installé dans la préparation des tests |

#### Écarts et remarques

- **Mois d'effet au lieu de date d'effet** (`produit.md (Plan)` § 6 disait `dateEffet`) : une version s'applique à partir d'un mois financé. Plus simple et sans ambiguïté quand le jour de paie change.
- **Paies prévues calculées, pas stockées** : changer le contrat met à jour toutes les paies non reçues ; les paies reçues gardent une copie de ce qui était prévu (R27).
- **Statut « écart »** du plan : calculé (reçu − prévu), pas stocké.
- **Plage des paies** : `?du=&au=` (36 mois max) au lieu de `?annee=`, pour afficher douze mois glissants.
- **Week-end par défaut : lundi suivant** (décision du 07/10/2026 : le virement passe par la banque ; le plan prévoyait la veille ouvrée). Réglable dans le contrat. Jours fériés non gérés.
- La base locale a été sauvegardée avant la migration (copie hors du projet).

### Bilan du lot 5 — Autres revenus

> Ancien fichier `docs/lots/Lot-05-revenus.md`.

> Statut : **clôturé et validé** (07/10/2026). Références : `produit.md (Plan)` § 6, § 7.3 · `produit.md (Contexte)` § 4.5, R1–R5 · `ux-ui.md (UX)` § 4.2, § 5.11.

#### Objectif

Décrire une fois les revenus qui reviennent (primes, heures sup, revenus variables, à-côtés). MySalary les prévoit aux bons mois, avec leur **certitude**. Quand un revenu arrive, on le note : il devient **réel**, et l'écart avec le prévu s'affiche.

#### Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| **Sources de revenus** : libellé, type (prime, variable, autre), montant, fréquence, mois, versement (avec la paie ou à une autre date), certitude, début, fin | Scénarios prudent / réaliste / ambitieux complets : lot 11 |
| Fréquences : mensuelle, trimestrielle, annuelle, ponctuelle, mois choisis (R2) | Total du mois (revenus − dépenses) : lot 8 |
| Primes **avec la paie** : ajoutées seules aux paies prévues, confirmées avec la paie | Calendrier : lot 14 |
| Revenus **à une autre date** : prévus à leur date, rattachés au mois budgétaire qui la contient | |
| **Revenus reçus** : liés à un revenu prévu ou libres (R3), écart affiché, le prévu ne change pas (R4) | |
| Équivalent mensuel, prochain versement, totaux par certitude sur 12 mois | |
| Onglet **Mon plan › Autres revenus** | |

#### Règles de calcul (moteur)

##### Mois d'un versement

Le mois d'une source est le **mois où l'argent arrive** (mois civil de versement). C'est ce que l'on dit naturellement : « la prime de juin ».

- **Avec la paie** : la prime de juin arrive avec la paie versée en juin. Avec « la paie finance le mois suivant », elle finance donc juillet.
- **À une autre date** : le jour choisi du mois (31 → dernier jour). Elle compte dans le mois budgétaire qui contient cette date.

##### Fréquences

| Fréquence | Mois de versement |
|---|---|
| Mensuelle | Chaque mois, du début à la fin |
| Trimestrielle | Tous les 3 mois à partir du mois de début |
| Annuelle | Tous les 12 mois à partir du mois de début |
| Ponctuelle | Le mois de début seulement |
| Mois choisis | Les mois cochés (ex. juin et décembre), chaque année |

##### Statut d'un revenu prévu

- **Avec la paie** : il suit la paie. À la réception, son montant reçu est saisi avec la paie et figé dans la paie (R27). Une source créée ou changée ensuite ne modifie jamais une paie reçue.
- **À une autre date** : prévu, puis en retard après sa date, puis reçu quand un revenu reçu y est lié.

##### Certitude (R5)

| Certitude | Exemple | Compté dans |
|---|---|---|
| Garanti | prime contractuelle | prudent, réaliste, ambitieux |
| Probable | prime habituelle non écrite | réaliste, ambitieux |
| Incertain | revenu variable, projet futur | ambitieux seulement |

Valeur proposée : prime → probable ; variable et autre → incertain.

##### Équivalent mensuel

Montant × nombre de versements par an ÷ 12, arrondi au centime. Une source ponctuelle n'a pas d'équivalent mensuel.

#### Données

| Table | Champs |
|---|---|
| `SourceRevenu` | `libelle`, `type`, `montant`, `frequence`, `mois` (mois choisis), `versement`, `jour?`, `certitude`, `debut`, `fin?` |
| `RevenuRecu` | `sourceId?`, `moisOccurrence?`, `date`, `montant`, `libelle`, `note?` — **réel** |
| `LignePaie` | + `sourceId?` : prime d'une source, figée à la réception |

Supprimer une source ne supprime jamais un revenu reçu : il devient un revenu libre.

#### Routes

| Route | Rôle |
|---|---|
| `GET/POST /revenus/sources` · `PUT/DELETE /revenus/sources/:id` | Sources |
| `GET /revenus/prevus?du=AAAA-MM&au=AAAA-MM` | Revenus prévus par mois de versement, avec statut et mois budgétaire |
| `GET/POST /revenus/recus` · `PUT/DELETE /revenus/recus/:id` | Revenus reçus |
| `GET /revenus/resume` | Totaux : équivalent mensuel, 12 prochains mois par certitude, mois en cours |

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Moteur : chaque fréquence, début et fin, 31 → fin de mois, prime avec la paie dans la bonne paie, revenu à part dans le bon mois budgétaire, statut reçu / en retard, totaux par certitude.
- [x] Serveur : isolation, revenu reçu lié à un prévu, suppression d'une source sans perte du réel, prime de source figée à la réception.
- [x] Écran : ajouter une source, voir la prime dans la paie, noter un revenu reçu (testé), modifier et supprimer depuis le menu « ••• ».
- [x] Rendu fidèle au template, sans débordement à 375 px.

#### Résultat

- `npm run verifier` : types OK, **138 tests** OK (partage 15, moteur 53, serveur 31, interface 39), build OK.
- Vérifié dans le navigateur avec un compte de test « Essai », supprimé ensuite. Le compte « oussama » n'a pas été touché.
  - Prime de 2 000 DH en juin et décembre, avec la paie : aperçu « décembre 2026 (finance janvier) · juin 2027 (finance juillet) · décembre 2027 (finance janvier) ».
  - La paie de janvier 2027 passe à 12 000 DH prévus, avec la ligne « Prime test · revenu récurrent · probable ». Elle est prévue le lundi 28 décembre (le 27 est un dimanche).
  - Équivalent mensuel 333,33 DH ; prévu sur 12 mois 4 000 DH (probable).
  - Aucun débordement à 375 px.

#### Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Colonne « Par mois » coupée (« 333,… ») | Tableau élargi, colonnes rééquilibrées |
| Éditer les primes d'une paie aurait transformé une prime de source en prime ponctuelle | L'éditeur de primes d'une paie ignore les primes des sources ; elles se gèrent dans « Autres revenus » |

#### Écarts et remarques

- **Mois d'une source = mois civil où l'argent arrive.** Une prime « avec la paie » de juin finance donc juillet (paie du 27 juin). C'est affiché dans l'aperçu.
- **Route `GET /revenus/prevus` et `GET /revenus/resume`** ajoutées au plan (§ 5.8) pour l'écran.
- **« Terminer » une source** = choisir un dernier mois dans le formulaire (pas de bouton séparé).
- **Supprimer un revenu reçu** propose « Annuler » (il est recréé à l'identique).
- Les scénarios complets (moyenne des dépenses en prudent, règles modifiables) restent au lot 11. Ici, seuls les totaux de revenus par certitude sont affichés.

### Bilan du lot 6 — Charges, enveloppes, ponctuels, dettes

> Ancien fichier `docs/lots/Lot-06-charges-dettes.md`.

> Statut : **clôturé et validé** (08/10/2026). Références : `produit.md (Plan)` § 6, § 7.2 · `produit.md (Contexte)` R6–R11 · `ux-ui.md (UX)` § 4.1 (étapes 5 à 7), § 5.11.

#### Objectif

Décrire une fois ce qui sort chaque mois. MySalary en déduit les **charges prévues** de chaque mois budgétaire, par type et par catégorie. Une dette est un **échéancier** : elle disparaît des prévisions une fois soldée (R9).

#### Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| **Catégories** par défaut, créées au premier usage, groupées : essentiel, flexible, engagement ; ajout d'une catégorie depuis un formulaire | Écran Réglages › Catégories (renommer, fusionner) : plus tard |
| **Charges fixes** : montant, jour, fréquence (mensuelle, trimestrielle, annuelle, mois choisis), début, fin, essentielle | Dépenses réelles et lien « payé » : lot 7 |
| **Enveloppes** : budget flexible par mois budgétaire (nourriture, transport, loisirs) | Répartition par semaine affichée : lot 9 |
| **Ponctuels** : charge unique datée (assurance de décembre, permis), avec certitude | Prévu vs réel du mois, clôture : lot 8 |
| **Dettes** : total, mensualité, première échéance → échéancier ; **paiements** réels ; reste dû ; soldée | Import V0 (Mohamed, Yahya « à classer ») : lot 16 |
| Onglets **Charges & enveloppes** et **Dettes** de Mon plan | |

#### Règles de calcul (moteur)

##### Charges fixes

- Mêmes fréquences que les revenus (lot 5), sauf « une seule fois » : c'est un ponctuel.
- Le mois d'une charge fixe est le **mois civil où elle est payée**. Sa date : le jour choisi (31 → dernier jour du mois).
- Elle compte dans le **mois budgétaire qui contient sa date**. Comme les mois budgétaires suivent les paies, un mois peut exceptionnellement contenir deux fois une charge du 27 et le suivant aucune : c'est la réalité de la trésorerie.

##### Enveloppes

- Un montant **par mois budgétaire**, du mois de début au mois de fin (mois budgétaires).
- Pas de date : l'argent se dépense au fil du mois.

##### Ponctuels

- Une date, un montant, une certitude. Comptés dans le mois budgétaire qui contient la date.

##### Dettes (R9)

- Échéancier : la mensualité chaque mois à partir de la première échéance, la dernière échéance = le reste.
- Reste dû = total − paiements réels.
- Une échéance est **payée** quand le cumul des paiements couvre le cumul des échéances jusqu'à elle ; **partielle** s'il en manque une partie ; sinon **en retard** (date passée) ou **prévue**.
- Montant encore attendu d'une échéance = ce qui manque pour la couvrir. La somme des montants attendus vaut toujours le reste dû.
- Un paiement ne peut pas dépasser le reste dû : message clair, pas de blocage silencieux.
- Soldée (reste = 0) : plus aucune prévision, la dette passe en « Terminées ».

##### Total d'un mois budgétaire

Charges prévues = charges fixes datées dans le mois + enveloppes du mois + ponctuels du mois + montants attendus des échéances du mois.

L'épargne n'est jamais une charge (R11).

#### Données

| Table | Champs |
|---|---|
| `Categorie` | `libelle`, `icone`, `groupe` (`essentiel` \| `flexible` \| `engagement`), `ordre` |
| `Charge` | `libelle`, `categorieId`, `nature` (`fixe` \| `enveloppe`), `montant`, `frequence`, `mois`, `jour?`, `debut`, `fin?`, `essentielle` |
| `Ponctuel` | `libelle`, `categorieId`, `montant`, `date`, `certitude` |
| `Dette` | `libelle`, `creancier`, `montantTotal`, `mensualite`, `premiereEcheance`, `note?` |
| `PaiementDette` | `detteId`, `date`, `montant`, `note?` — **réel** |

Écart avec `produit.md (Plan)` § 6 : l'échéancier n'est pas stocké ligne par ligne (`EcheanceDette`), il est **calculé** depuis la mensualité et la première échéance. Plus simple, et toujours cohérent avec le total.

#### Routes

| Route | Rôle |
|---|---|
| `GET/POST /categories` · `PUT/DELETE /categories/:id` | Catégories (suppression refusée si utilisée) |
| `GET/POST /charges` · `PUT/DELETE /charges/:id` | Charges fixes et enveloppes |
| `GET/POST /ponctuels` · `PUT/DELETE /ponctuels/:id` | Ponctuels |
| `GET/POST /dettes` · `PUT/DELETE /dettes/:id` | Dettes, avec échéancier et état calculés |
| `POST /dettes/:id/paiements` · `DELETE /dettes/:id/paiements/:paiementId` | Paiements réels |
| `GET /charges/resume` | Mois en cours par type et par groupe, équivalent mensuel, prochains paiements |

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Moteur : charge fixe dans le bon mois budgétaire, 31 → fin de mois, enveloppe par mois budgétaire, ponctuel, échéancier (dernière échéance = reste), paiements partiels, dette soldée sans prévision, total du mois.
- [x] Serveur : isolation, catégories par défaut, paiement qui dépasse le reste refusé, catégorie utilisée non supprimable.
- [x] Écran : ajouter charge fixe, enveloppe, ponctuel, dette ; noter un paiement ; voir le reste dû baisser.
- [x] Rendu fidèle au template, sans débordement à 375 px.

#### Résultat

- `npm run verifier` : types OK, **166 tests** OK (partage 18, moteur 64, serveur 37, interface 47), build OK.
- Vérifié dans le navigateur avec un compte de test « Essai » (supprimé ensuite ; le compte « oussama » n'a pas été touché), salaire le 27, mois budgétaire d'octobre 2026 = 28 sept. → 26 oct. (le 27 sept. est un dimanche).
  - Loyer 3 500 DH le 5, saisi depuis l'écran ; téléphone 349 DH en janvier, avril, juillet et octobre (116,33 DH par mois en moyenne) ; enveloppes Courses 2 500 DH et Sorties 600 DH ; ponctuel Assurance auto 2 400 DH le 15 déc. 2026.
  - Prêt voiture 9 000 DH à 2 000 DH par mois dès le 10 sept. : échéancier de 5 échéances (la dernière = 1 000 DH, janvier 2027), échéance de septembre « en retard ».
  - Paiement de 3 000 DH noté depuis l'écran : reste dû 9 000 → 6 000 DH, septembre payée, octobre « en partie payée, reste 1 000 DH », charges d'octobre 8 949 → 7 949 DH.
  - Paiement de 7 000 DH refusé : « Ce paiement dépasse le reste dû (6 000 DH). »
  - Avance de 1 500 DH remboursée en une fois : rangée dans « Terminées », plus aucune prévision.
  - Aucun débordement à 375 px (les tableaux défilent dans leur carte, comme aux lots 4 et 5).

#### Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Un mois budgétaire pouvait couvrir trois mois civils : charges du 3e oubliées | Parcours de tous les mois civils entre le début et la fin du mois budgétaire |
| Calculs (part d'un total, budget par jour) dans un composant | Déplacés dans `saisie.ts` (`part`, `montantParJour`) |
| Colonnes coupées : « Le 5 de chaque m… », « 116,… », « Banque P… » | Colonnes rééquilibrées ; libellé raccourci en « Le 5, chaque mois » ; texte complet au survol quand il reste trop long |
| Interrupteur « Essentielle » sans nom pour les lecteurs d'écran | Nom accessible ajouté au composant `Interrupteur` |

#### Écarts et remarques

- **Échéancier calculé, pas stocké** (voir § Données) : modifier la mensualité recalcule l'échéancier, les paiements notés restent.
- **Une échéance en retard d'un mois passé** reste dans ce mois-là (son montant prévu y est conservé) ; elle est signalée « Échéance en retard » dans l'onglet Dettes, pas reportée dans le mois en cours. Le report éventuel se décidera au lot 8 (clôture du mois).
- **« À payer bientôt »** liste les sorties datées d'aujourd'hui à la fin du mois budgétaire suivant (six au plus).
- **Écran Réglages › Catégories** (renommer, fusionner) reporté ; on peut déjà créer une catégorie depuis un formulaire.

### Bilan du lot 7 — Dépenses réelles

> Ancien fichier `docs/lots/Lot-07-depenses.md`.

> Statut : **clôturé et validé** (08/10/2026). Références : `produit.md (Plan)` § 6, § 7.2 · `produit.md (Contexte)` R10, R11 · `ux-ui.md (UX)` § 4.3, § 5.5.

#### Objectif

Noter ce qui sort **vraiment**, en moins de 10 secondes, et le rattacher au plan : « ce paiement, c'est mon loyer », « ces courses, c'est l'enveloppe Nourriture », ou « hors plan ». Une charge prévue devient **payée** quand une dépense la couvre.

Le réel ne remplace jamais le prévu : les charges prévues du mois (lot 6) restent identiques. Les deux sont calculés et affichés séparément.

#### Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| **Saisie rapide** d'une dépense : bouton `+` (en-tête et barre mobile), touche `N`, et bouton de l'écran Mois | Saisie rapide d'un revenu reçu ou d'un versement d'objectif : lots 10 et 13 |
| **Rattachement** : charge fixe (une échéance précise), enveloppe, ponctuel, ou hors plan ; proposition automatique selon la catégorie | Tableau prévu / réel / écart par ligne, clôture du mois : lot 8 |
| **« Payé »** : confirmer en un geste une charge prévue (crée la dépense correspondante) | Semaines et rythme : lot 9 |
| Écran **Mois** › Dépenses : choix du mois, liste groupée par jour, filtre par catégorie, total filtré, modifier, supprimer avec « Annuler » | Graphiques du mois : lot 8 |
| Colonne « À payer ce mois » (fixes et ponctuels avec leur statut) et suivi des **enveloppes** (dépensé / budget) | Import des dépenses V0 : lot 16 |

#### Règles de calcul (moteur)

##### Une dépense

- Date, montant, catégorie, libellé (facultatif : sinon le nom de la catégorie), note.
- **Réelle** : jamais dans le futur.
- Elle compte dans le **mois budgétaire qui contient sa date** (réel = trésorerie).

##### Rattachement (R10)

| Lien | Effet |
|---|---|
| **Charge fixe** + échéance (date prévue) | Couvre cette échéance. Payer en avance le loyer du mois suivant est possible : l'échéance du mois suivant devient payée, l'argent sort ce mois-ci. |
| **Enveloppe** | Consomme le budget de l'enveloppe du mois budgétaire de la dépense. |
| **Ponctuel** | Couvre le ponctuel. |
| **Aucun** | Hors plan. |

- Statut d'une charge fixe ou d'un ponctuel prévu : **payée** si les dépenses liées couvrent le montant prévu ; **en partie payée** s'il en manque ; sinon **en retard** (date passée) ou **prévue**. Même règle que les échéances de dettes.
- Une échéance qui ne correspond plus à la charge (jour modifié depuis) se rattache à l'échéance du même mois budgétaire.
- Charge ou ponctuel supprimé : la dépense reste (elle a eu lieu) et passe hors plan.

##### Proposition automatique (UX § 4.3)

Pour une date donnée, le moteur liste les lignes rattachables :

1. charges fixes et ponctuels du mois budgétaire de la date, pas encore entièrement payés ;
2. échéances des 10 jours suivant la date (paiement en avance) ;
3. enveloppes actives ce mois-là.

L'écran présélectionne la première ligne de **même catégorie** (« Est-ce le paiement de *Téléphone (349 DH)* ? »). L'utilisateur peut choisir une autre ligne ou « Hors plan ».

##### Totaux réels d'un mois budgétaire (§ 7.2)

Dépenses réelles = dépenses (par rattachement : fixe, enveloppe, ponctuel, hors plan) + paiements de dettes du mois.

L'épargne n'est jamais une dépense (R11).

#### Données

| Table | Champs |
|---|---|
| `Depense` | `date`, `montant`, `categorieId`, `libelle`, `note?`, `chargeId?`, `echeance?` (date prévue couverte, charge fixe), `ponctuelId?` — **réel** |

Écart avec `produit.md (Plan)` § 6 : ajout de `echeance`, pour savoir quelle échéance d'une charge fixe est payée (utile pour un paiement en avance).

#### Routes

| Route | Rôle |
|---|---|
| `GET /depenses?mois=` | Suivi du mois : dépenses, paiements de dettes, lignes à payer avec statut, enveloppes, totaux réels |
| `GET /depenses/rattachements?date=` | Lignes proposées pour rattacher une dépense à cette date |
| `POST /depenses` · `PUT/DELETE /depenses/:id` | Dépenses (date future refusée, lien vérifié) |

#### Écrans

- **Saisie rapide** (panneau latéral, feuille du bas sur mobile) : montant en premier avec focus, puces des catégories les plus utilisées + « Autre », date (aujourd'hui), rattachement proposé, libellé et note facultatifs. `Entrée` valide. Toast avec « Annuler ». « Ajouter une autre » garde le panneau ouvert.
- **Mois** (`/mois`) : mois précédent / suivant ; bandeau Dépensé (réel) / Reste à payer (prévu), toujours séparés ; liste des dépenses par jour avec filtre de catégorie ; colonne latérale « À payer ce mois » avec bouton « Payé », enveloppes, bouton « Ajouter une dépense ».

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Moteur : dépense dans le bon mois, échéance payée / partielle / en retard, paiement en avance, échéance orpheline, enveloppe consommée, ponctuel payé, totaux réels avec paiements de dettes, propositions.
- [x] Serveur : isolation, date future refusée, lien vers une charge d'un autre compte refusé, échéance inexistante refusée, suppression d'une charge → dépense hors plan, catégorie utilisée par une dépense non supprimable.
- [x] Écran : saisie rapide en quelques gestes, proposition de rattachement, « Payé », filtre, modifier, supprimer avec Annuler.
- [x] Rendu fidèle au template, sans débordement à 375 px.

#### Résultat

- `npm run verifier` : types OK, **194 tests** OK (partage 18, moteur 75, serveur 45, interface 56), build OK.
- Vérifié dans le navigateur avec un compte « Essai » (supprimé ensuite ; « oussama » n'a pas été touché). Mois d'octobre 2026 : 28 sept. → 26 oct., 19 jours restants le 8 oct.
  - Bouton `+` de l'en-tête → 3 500 DH, puce Logement : « Est-ce le paiement de « Loyer » ? Échéance du 5 oct. · reste 3 500 DH. » Validé : loyer « Payée ».
  - Touche `N` → 185,50 DH, Alimentation, « Marché » : rattaché à l'enveloppe Courses ; « Noter et en ajouter une autre » rouvre un formulaire vide. Enveloppes restantes 3 100 → 2 914,50 DH.
  - « Payé » sur Internet (prévu le 12 oct.) : dépense de 349 DH datée d'aujourd'hui, ligne « Payée », « Charges à payer » à 0.
  - Supprimer « Marché » puis « Annuler » : la dépense revient avec son rattachement.
  - Paiement de dette du 5 oct. et dépense hors plan du 3 oct. : rangés par jour ; total réel 6 154,50 DH, toujours séparé de l'« Encore prévu ».
  - Le réel ne modifie jamais le prévu : les charges prévues du mois restent identiques (vérifié par un test serveur).
  - 375 px : aucun débordement, saisie en feuille du bas, puces triées par usage. 1024 px : en-tête sans débordement.

#### Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Le bouton `+` ajouté à l'en-tête faisait passer « Mon plan » sur deux lignes à 1342 px, et l'en-tête débordait à 1024 px (déjà serré avant) | Liens sur une ligne ; entre 1024 et 1280 px, liens sans icône et espacements réduits |
| Une dépense sans libellé liée au loyer s'appelait « Logement » | Nom = libellé saisi, sinon la ligne du plan payée, sinon la catégorie |
| Sur mobile, la période et le détail des lignes étaient coupés | Jours restants sous le nom du mois ; détail sur deux lignes ; icône de catégorie masquée sous 640 px |

#### Écarts et remarques

- **Écran Mois** : seule la partie Dépenses est construite. Le tableau prévu / réel / écart et la clôture arrivent au lot 8, les semaines au lot 9.
- **« Payé »** crée une dépense du montant restant, datée du jour prévu s'il est passé, sinon d'aujourd'hui (jamais dans le futur).
- **Paiement en avance** : proposé pour les échéances des 10 jours suivant la date de la dépense.
- **Paiements de dettes** : ils restent saisis dans Mon plan › Dettes ; l'écran Mois les affiche et les compte dans le réel, sans les modifier.
- **Toast « Ajoutée à novembre »** (dépense datée hors du mois affiché) : non fait ; le toast donne le montant et la ligne rattachée.

### Bilan du lot 8 — Suivi mensuel

> Ancien fichier `docs/lots/Lot-08-suivi-mensuel.md`.

> Statut : **clôturé et validé** (09/10/2026). Références : `produit.md (Plan)` § 7.2, § 8 · `produit.md (Contexte)` R21–R23 · `ux-ui.md (UX)` § 4.7, § 5.3.

#### Objectif

Répondre à **« Est-ce que je respecte mon plan ce mois-ci ? »**. Pour un mois budgétaire : chaque ligne prévue à côté de son réel, l'écart, ce qui reste à confirmer. Le mois terminé, on le **clôture** : son bilan est figé.

#### Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Onglet **Vue d'ensemble** de l'écran Mois : reste réel, reste prévu, écart ; estimation de fin de mois pour le mois en cours (R23) | Onglet Semaines : lot 9 |
| **Tableau prévu / réel / écart** par ligne : paie et primes, revenus à part, revenus libres, charges fixes, enveloppes, ponctuels, échéances de dettes, hors plan | Lignes d'épargne : lot 10 (l'épargne n'est jamais une dépense, R11) |
| Action **Confirmer** sur une ligne non confirmée (paiement d'une charge sur place, sinon lien vers l'écran qui la confirme) | Graphique annuel : lot 15 |
| **Graphique de rythme** : dépenses réelles cumulées contre le prévu cumulé, jour par jour | |
| **Clôture** d'un mois passé (R21) : vérification des lignes non confirmées, clôture « quand même » avec mention, bilan figé, lecture seule | |
| **Réouverture** avec trace (R22) | |
| Un mois clôturé n'est **jamais redécoupé** (Plan § 7.1) | |

#### Règles de calcul (moteur)

##### Lignes du bilan

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

##### Totaux

```text
Revenus prévus / réels   = somme des lignes de revenus
Charges prévues          = somme des lignes de charges prévues
Sorties réelles          = dépenses + paiements de dettes datés dans le mois (lot 7)
Reste prévu              = revenus prévus − charges prévues
Reste réel               = revenus réels − sorties réelles
Écart                    = reste réel − reste prévu
```

Mois en cours (R23) : **estimation de fin de mois** = (revenus réels + revenus encore attendus) − (sorties réelles + charges encore prévues). Toujours marquée « estimation ».

##### Rythme

Prévu cumulé : charges datées à leur date, enveloppes réparties sur les jours du mois au centime près. Réel cumulé : sorties réelles par jour, jusqu'à aujourd'hui.

##### Clôture (R21, R22)

- Seul un mois **passé** se clôture.
- Lignes non confirmées → la clôture est refusée avec leur liste ; « Clôturer quand même » la force, et le nombre de lignes non confirmées est gardé.
- À la clôture : le **bilan est figé** (instantané) avec ses dates de début et de fin.
- Mois clôturé : lecture seule. Ajouter, modifier ou supprimer une dépense, un revenu reçu ou un paiement de dette daté dans ce mois est refusé ; la paie qui le finance ne peut plus être modifiée.
- Ses bornes ne bougent plus, même si une paie voisine change : le mois suivant commence le lendemain de sa fin.
- Réouverture : possible, le bilan redevient calculé ; chaque clôture et réouverture est journalisée.

#### Données

| Table | Champs |
|---|---|
| `ClotureMois` | `cle`, `debut`, `fin`, `instantane` (bilan JSON), `forcee`, `nonConfirmees`, `clotureLe` |
| `JournalCloture` | `cle`, `action` (`cloture` \| `reouverture`), `le`, `nonConfirmees` — trace |

#### Routes

| Route | Rôle |
|---|---|
| `GET /mois/:cle/bilan` | Bilan calculé, ou figé si le mois est clôturé, avec le journal |
| `POST /mois/:cle/cloturer` | `{ forcer? }` — refus 422 avec la liste des lignes non confirmées si `forcer` est absent |
| `POST /mois/:cle/rouvrir` | Rouvre un mois clôturé |

#### Écran

Mois › **Vue d'ensemble** (onglet par défaut), **Dépenses** (lot 7), Semaines (lot 9, grisé).

- En-tête du mois commun aux onglets : précédent / suivant, jours restants, badge « Clôturé ».
- Bandeau : Reste réel / Reste prévu ; écart ou estimation de fin de mois.
- Tableau prévu / réel / écart groupé par famille, statut en mots, action Confirmer.
- Graphique de rythme.
- Colonne : « À confirmer » ; carte de clôture (« Octobre est terminé. Vérifie et clôture. ») ; journal.

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Moteur : lignes et totaux d'un mois (paie reçue / prévue, revenu à part, revenu libre, charge payée en avance, enveloppe, dette, hors plan), écart seulement si confirmé, estimation de fin de mois, rythme, bornes figées d'un mois clôturé.
- [x] Serveur : clôture refusée (mois en cours, lignes non confirmées), clôture forcée, bilan figé qui ne bouge plus, écritures refusées dans un mois clôturé, réouverture et journal, isolation.
- [x] Écran : tableau, confirmer, clôturer, rouvrir, lecture seule.
- [x] Rendu fidèle au template, sans débordement à 375 px.

#### Résultat

- `npm run verifier` : types OK, **209 tests** OK (partage 18, moteur 82, serveur 50, interface 59), build OK.
- Vérifié dans le navigateur avec un compte « Essai » (supprimé ensuite ; « oussama » n'a pas été touché), salaire de 12 000 DH le 27 :
  - **Octobre (en cours)** : reste réel 8 380 DH, reste prévu 5 651 DH ; salaire reçu 12 500 DH (écart +500) ; estimation de fin de mois +6 151 DH, si les 2 229 DH de charges encore prévues sortent comme prévu.
  - **Septembre (27 août → 27 sept., terminé)** : « Septembre est terminé. Vérifie et clôture. », 1 ligne à confirmer (Internet, en retard). « Payé » sur la ligne → tout est confirmé ; écart avec le plan −250 DH (concert hors plan 450 DH, courses 200 DH sous le budget).
  - **Clôture** : bilan figé, « Clôturé le 8 oct. 2026 », onglet Dépenses en lecture seule. Une dépense datée du 20 sept. est refusée : « Septembre 2026 est clôturé. Rouvre-le pour le modifier. »
  - **Réouverture** : le mois redevient modifiable ; l'historique montre « Rouvert » puis « Clôturé ».
  - 375 px : aucun débordement ; le tableau passe en lignes empilées (statut à droite, prévu / réel / écart dessous).

#### Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Test du moteur : un mois « terminé » restait en cours | Comportement voulu (lot 4) : sans la paie suivante, le mois se prolonge. Le test reçoit maintenant la paie suivante. |
| Message de refus « 1 ligne ne est pas confirmée » | « 1 ligne n’est pas confirmée » / « 3 lignes ne sont pas confirmées » |
| Courbe du réel lissée : elle dépassait entre deux dépenses | Tracé en marches, comme le prévu |
| Sur mobile, le tableau défilait de côté et cachait le réel | Lignes empilées sous 640 px, un seul jeu de boutons |
| Bouton rouge « danger » pour clôturer ou rouvrir | Bouton principal ; le rouge reste réservé aux suppressions |

#### Écarts et remarques

- **Prévu d'une échéance de dette** : le montant de l'échéancier (et non « ce qui reste attendu » comme dans Mon plan, R9). Une dette payée en avance apparaît donc payée dans le bilan, sans faire baisser le prévu.
- **Ligne « Payé ce mois pour un autre mois » / « Déjà payé un autre mois »** : la différence entre l'argent sorti dans le mois et le réel des lignes (paiement en avance ou en retard). Les totaux restent exacts.
- **Confirmer une paie, un revenu ou une dette** ouvre Mon plan ; une charge fixe ou un ponctuel se paie directement depuis le bilan.
- **Une ligne prévue à venir du mois en cours** (ex. Internet le 12) est listée « À confirmer » avec le statut « Prévu ».
- **Épargne** : absente du bilan jusqu'au lot 10.

### Bilan du lot 9 — Suivi hebdomadaire

> Ancien fichier `docs/lots/Lot-09-suivi-hebdomadaire.md`.

> Statut : **clôturé et validé** (09/10/2026). Références : `produit.md (Plan)` § 7.1 (semaines), § 8 (KPI « Reste flexible (semaine) ») · `produit.md (Contexte)` R7 · `ux-ui.md (UX)` § 4.6, § 5.4.

#### Objectif

Répondre à **« Est-ce que je tiens ma semaine ? »**. Le budget flexible du mois (les enveloppes) est réparti sur ses semaines ; chaque semaine montre ce qui était disponible, ce qui a été dépensé, ce qui reste, et la tendance. En tête, une réponse en mots : « Oui, avec 340 DH d'avance » ou « 120 DH au-dessus du rythme prévu ».

#### Périmètre

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

#### Règles de calcul (moteur)

##### Budget flexible

- **Budget flexible du mois** = somme des enveloppes actives du mois (prévu).
- Il est réparti **jour par jour** sur le mois budgétaire, au centime près (`repartir`). Le budget d'une semaine est la somme de ses jours : une semaine de 3 jours reçoit 3/7 d'une semaine pleine. C'est la même répartition que la courbe de rythme du lot 8.

##### Dépensé flexible

- **Dépensé flexible** = dépenses liées à une enveloppe **+ dépenses hors plan**, datées dans la semaine (réel). Le hors plan est une dépense libre : elle consomme la même marge que les enveloppes.
- Les charges fixes, ponctuels et paiements de dettes ne sont **pas** du flexible : ils ont leur propre colonne (prévu daté dans la semaine / payé dans la semaine).

##### Par semaine

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

##### Réponse en tête (mois)

| Mois | Réponse |
|---|---|
| En cours | Avance = budget des jours écoulés − dépensé flexible à date. ≥ 0 : « Oui, avec X d'avance » ; sinon « X au-dessus du rythme prévu ». |
| Passé | Marge = budget du mois − dépensé flexible. ≥ 0 : « Oui, X de marge » ; sinon « Budget flexible dépassé de X ». |
| À venir | « Mois à venir » : budget prévu seul. |
| Sans enveloppe | État vide, pas de réponse. |

#### Routes

| Route | Rôle |
|---|---|
| `GET /mois/:cle/semaines` | Semaines calculées avec le début de semaine et le report de l'utilisateur ; figées si le mois est clôturé |

#### Écran

Mois › **Semaines**, avec le même en-tête de mois que les autres onglets.

- Bandeau : réponse en tête, budget flexible du mois, dépensé, avance ou marge.
- Semaine en cours : KPI Reste flexible (semaine), montant par jour, barre dépensé / disponible avec repère du rythme.
- Tableau : semaine (dates, « 3 jours »), disponible, dépensé, reste, écart, tendance ; lignes empilées sous 640 px.
- Ouvrir une semaine : dépenses groupées par jour (modifier), charges prévues datées avec leur statut, « Ajouter une dépense ».
- Colonne : charges datées de la semaine en cours, explication du calcul (« Sur quoi repose ce calcul ? »).

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Moteur : répartition au centime (semaines partielles), dépensé flexible (enveloppe + hors plan), charges datées, écart passé / en cours, par jour, report activé / désactivé (jamais d'un mois à l'autre), tendance et historique insuffisant, réponse en tête, mois sans enveloppe.
- [x] Serveur : route, début de semaine et report des réglages, semaines figées à la clôture, isolation.
- [x] Écran : tableau, semaine ouverte, état vide, mois clôturé.
- [x] Rendu fidèle au template, sans débordement à 375 px.

#### Résultat

- `npm run verifier` : types OK, **232 tests** OK (partage 18, moteur 95, serveur 54, interface 65), build OK.
- Moteur : `suiviDesSemaines` (`packages/moteur/src/semaines.ts`, 13 tests dont une propriété : les budgets des semaines font toujours le budget du mois, au centime). Le calendrier expose `sortiesEntre(du, au)` et `debutSuivi`.
- Serveur : `GET /mois/:cle/semaines` ; colonne `ClotureMois.semaines` (migration `semaines_figees`) remplie à la clôture.
- Vérifié dans le navigateur avec un compte « Essai » (supprimé ensuite ; « oussama » n'a pas été touché), enveloppes Courses 3 100 DH + Transport 800 DH, aujourd'hui le vendredi 9 octobre :
  - **Octobre (28 sept. → 26 oct., 29 jours)** : « 151,16 DH au-dessus du rythme prévu » (prévu à date 1 613,84 DH, dépensé 1 765 DH) ;
  - semaine 1 dépassée de 28,57 DH (+46 % contre les 4 semaines précédentes) ; semaine 2 en cours : reste 146,37 DH, soit 48,79 DH par jour pendant 3 jours ; semaine 5 partielle « 1 jour » ;
  - semaine ouverte : dépenses par jour, loyer « Payée », « + Ajouter » propose le 4 oct. pour la semaine 1 (dernier jour passé) ;
  - **Septembre clôturé** : « Oui, 830 DH de marge », semaines figées ; **Août** (sans enveloppe) : état vide avec « Définir mes enveloppes » ;
  - 375 px : aucun débordement, lignes empilées (tendance à droite du nom, montants dessous).

#### Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Changer un réglage (mode de période, début de semaine, report) ne recalculait pas les mois déjà affichés | Le réglage enregistré rafraîchit aussi les mois et les dépenses |
| Détail d'une dépense « Transport · Transport · enveloppe » quand l'enveloppe porte le nom de sa catégorie (lot 7) | La ligne du plan n'est répétée que si elle diffère de la catégorie |

#### Écarts et remarques

- **Hors plan compté dans le flexible** : une dépense libre consomme la même marge que les enveloppes. Les charges fixes, ponctuels et dettes ont leur propre colonne (prévu daté / payé dans la semaine).
- **Charge payée une autre semaine** : le loyer prévu le 5 et payé le 4 apparaît « Payée » dans la semaine du 5, et l'argent dans « Payé cette semaine » de la semaine du 4.
- **Montants au centime** : un budget qui ne se divise pas juste (3 900 DH sur 29 jours) donne des semaines à 941,43 DH. Aucun arrondi caché : la somme des semaines fait exactement le budget du mois.
- **Mois clôturé avant le lot 9** : il n'a pas de semaines figées ; elles sont calculées (sans mention « figées »).
- **Épargne par semaine** : lot 10.

### Bilan du lot 10 — Épargne & objectifs

> Ancien fichier `docs/lots/Lot-10-epargne-objectifs.md`.

> Statut : **clôturé et validé** (09/10/2026). Références : `produit.md (Plan)` § 6 (CompteEpargne, Objectif, VersementObjectif), § 7.2, § 7.4, § 8 · `produit.md (Contexte)` R11–R20 · `ux-ui.md (UX)` § 4.4, § 5.7, § 5.8, § 5.11.

#### Objectif

Savoir **ce qui est de côté**, **à quoi c'est réservé**, et **quand chaque objectif sera atteint**. L'épargne n'est jamais une dépense (R11).

#### Périmètre

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

#### Données

| Table | Champs |
|---|---|
| `CompteEpargne` | `libelle`, `solde` (déclaré, réel), `auLe` (date de la déclaration) |
| `MouvementEpargne` | `compteId`, `objectifId?`, `date`, `montant` (+ versement, − retrait), `libelle`, `note` — réel. Un versement à un objectif est un mouvement avec `objectifId` (la `VersementObjectif` du plan). |
| `Objectif` | `libelle`, `type` (`moto` \| `voiture` \| `voyage` \| `ordinateur` \| `logement` \| `investissement` \| `securite` \| `autre`), `montantCible`, `montantInitial`, `dateCible?` (mois), `priorite`, `versementMensuel?`, `statut` (`actif` \| `pause` \| `realise` \| `abandonne`), `realiseLe?` |

« Atteint » n'est pas stocké : il se calcule (épargné ≥ cible).

#### Règles de calcul (moteur)

##### Épargne (R12–R14)

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

##### Objectif (R16, R17)

```text
Restant        = max(0, cible − épargné)
Progression    = épargné ÷ cible (au plus 100 %)
Mois restants  = du mois budgétaire en cours au mois souhaité, inclus
Effort mensuel = (cible − épargné au début du mois en cours) ÷ mois restants (centime supérieur)
Effort hebdo   = effort mensuel × 12 ÷ 52
```

##### Capacité et scénarios (R15, Plan § 7.3)

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

##### Fonds de sécurité

Cible proposée : 3 à 6 mois de charges essentielles (équivalent mensuel du lot 6), affichée avec son calcul et modifiable.

#### Routes

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

#### Écrans

- **Mon plan › Épargne** : bandeau Solde / Réservé / Disponible ; comptes (déclarer un solde) ; mouvements par date ; alerte si réservé > solde.
- **Objectifs** : bandeau total réservé / disponible ; une carte par objectif (progression, épargné / cible, date estimée, date souhaitée, risque) ; monter / descendre la priorité ; pause ; « Réalisés » et « Abandonnés » repliés ; état vide avec exemples de types.
- **Nouvel objectif** : formulaire à gauche, aperçu projeté à droite (date estimée par scénario, effort, risque), propositions si hors de portée.
- **Objectif** : progression, restant, effort mensuel et hebdo, dates par scénario, risque, trajectoire (réel plein, projeté hachuré, cible), versements ; verser, modifier, pause, réaliser, abandonner.
- **Mois** : lignes « Épargne » dans le bilan (prévu = versements mensuels choisis, réel = versements du mois), hors des charges ; épargne de la semaine dans la semaine ouverte.

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Moteur : solde après déclaration, réservé, disponible et alerte, épargné / restant / progression / effort, répartition (versement fixe puis cascade, jamais plus que la capacité — propriété), date estimée et risque par scénario, achat réalisé, objectif déjà atteint, sans date, en pause.
- [x] Serveur : routes, aperçu, ordre, réalisation (retrait créé, pas de dépense), isolation.
- [x] Écrans : épargne, liste, création avec aperçu, détail, saisie rapide d'un versement.
- [x] Rendu fidèle au template, sans débordement à 375 px.

#### Résultat

- `npm run verifier` : types OK, **266 tests** OK (partage 18, moteur 108, serveur 63, interface 77), build OK.
- Moteur : `epargne.ts` (comptes, mouvements, réservé, disponible, fonds de sécurité) et `objectifs.ts` (capacité par scénario, répartition par priorité, projection, date estimée, risque, trajectoire) — 13 tests, dont une propriété : la répartition ne dépasse jamais la capacité ni le restant.
- Serveur : module `epargne` (14 routes), tables `CompteEpargne`, `MouvementEpargne`, `Objectif` (migration `epargne_objectifs`).
- Vérifié dans le navigateur avec un compte « Essai » (salaire 12 000 DH, loyer 3 500 DH, enveloppes 3 900 DH, compte épargne 20 000 DH au 1er oct.) :
  - **Objectifs** : moto 85 000 DH pour juillet 2027 → estimée novembre 2027 (réaliste), mars 2028 (prudent), « Hors de portée », 7 500 DH par mois nécessaires ; deux leviers chiffrés (repousser à novembre 2027, verser 7 500 DH par mois) ;
  - **Fonds de sécurité** proposé : charges essentielles 6 600 DH par mois → 19 800 à 39 600 DH ; créé depuis la carte avec aperçu en direct (février 2028 en réaliste) ;
  - **Saisie rapide** : « De l’épargne » → 500 DH versés au fonds ; **Mon plan › Épargne** : solde 23 500 DH, réservé 13 500 DH, disponible 10 000 DH ;
  - **Mois** : lignes d’épargne dans le bilan (Moto 2 000 DH réel, Permis 1 000 DH prévu et réel) ;
  - 375 px : aucun débordement (liste, détail, création, épargne, mois).

#### Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Le versement mensuel déjà fait ce mois-ci était projeté une seconde fois | Au mois en cours, le versement choisi est diminué de ce qui a déjà été versé à l’objectif |
| « 1 000 DH / mois nécessaires » affiché avec « Hors de portée » pour un objectif qui verse déjà 1 000 DH | L’effort se calcule depuis le début du mois en cours : il se compare au versement mensuel |
| Saisie rapide d’épargne : le montant tapé se perdait (focus donné avant le chargement) | Focus donné une fois l’épargne chargée |
| Mois abrégés « octo. », « déce. » sur la trajectoire | Abréviations françaises (« oct. », « déc. », « janv. 27 ») |
| Badge « Hors de portée » coupé sur deux lignes à 375 px | Badge sur une ligne |

#### Écarts et remarques

- **Types d’objectif** : ceux de `ux-ui.md (UX)` § 4.4 (moto, voiture, voyage, ordinateur, logement, investissement, fonds de sécurité, autre) au lieu des quatre de `produit.md (Plan)` § 6. Ils ne servent qu’à l’icône et aux suggestions.
- **`VersementObjectif`** devient `MouvementEpargne` avec `objectifId` : un versement, un retrait ou un achat passe toujours par un compte d’épargne. Sans compte, la saisie invite à en déclarer un.
- **Statut « atteint »** calculé, pas stocké.
- **Capacité du mois en cours** : revenus reçus + attendus retenus − (sorties réelles + charges encore prévues) − épargne déjà versée.
- **Cascade** : sans versement mensuel, un objectif reçoit ce qui reste de la capacité selon sa priorité ; la projection suppose donc que tout le reste du mois est épargné (affiché comme projection, avec ses hypothèses).
- **Prudent** ne retient pour l’instant que les revenus garantis ; la moyenne réelle des dépenses flexibles arrive au lot 11.
- **Réorganiser** : boutons monter / descendre (accessibles au clavier) au lieu du glisser-déposer.
- **Bilans figés avant le lot 10** : pas de lignes d’épargne (`epargne: null`).

### Bilan du lot 11 — Simulateur & scénarios

> Ancien fichier `docs/lots/Lot-11-simulateur.md`.

> Statut : **clôturé et validé** (09/10/2026). Références : `produit.md (Plan)` § 6 (Scenario, Reglages.reglesScenarios), § 7.3 · `ux-ui.md (UX)` § 4.5, § 5.9, § 5.12 · `produit.md (Contexte)` R5.

#### Objectif

Répondre aux questions **« et si »** sans jamais toucher aux données tant qu'on n'applique pas : « Si j'épargne X par mois, quand ? », « Combien par mois pour tenir la date ? », « Impact d'une prime ? ».

#### Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Page **Simulateur** (`/simulateur`, raccourci `S`) : trois scénarios côte à côte, leviers, graphique de l'épargne (réel plein, projeté hachuré) | Recommandations automatiques : lot 12 |
| **Leviers** : versement mensuel vers un objectif, date cible, prime supplémentaire (montant + mois), réduction d'une enveloppe ou d'une charge fixe, horizon 6 / 12 / 24 / 36 mois | Scénario « perso » avec ses propres règles de revenus |
| **Trois questions prêtes** qui règlent les leviers | |
| **Règles des scénarios** modifiables dans Réglages (revenus retenus, dépenses flexibles du prudent), affichées à côté de chaque projection ; elles valent aussi pour les Objectifs (lot 10) | |
| **Prudent** : dépenses flexibles = moyenne réelle des 3 derniers mois si elle dépasse le prévu (Plan § 7.3) | |
| **Enregistrer** un scénario (nom + leviers), le rouvrir, le supprimer | |
| **Appliquer au plan** avec confirmation et résumé des changements | |

#### Règles de calcul (moteur)

##### Règles des scénarios (réglables)

| Scénario | Revenus retenus (défaut) | Dépenses flexibles (défaut) |
|---|---|---|
| Prudent | garantis | moyenne réelle des 3 derniers mois terminés si plus élevée que le budget des enveloppes |
| Réaliste | garantis + probables | prévues |
| Ambitieux | garantis + probables + incertains | prévues |

- Les revenus garantis sont toujours retenus. Un revenu incertain n'entre jamais dans le réaliste par défaut (R5).
- Moyenne réelle des dépenses flexibles = (dépenses d'enveloppes + hors plan) des 3 derniers mois budgétaires terminés qui ont des dépenses notées ; aucune moyenne sans historique.

##### Leviers (ajustements, jamais enregistrés dans les données)

- **Versement** vers un objectif : remplace son versement mensuel choisi.
- **Date cible** : remplace la date souhaitée (effort, risque).
- **Prime** : + montant dans le mois budgétaire choisi, dans les trois scénarios.
- **Réduction** d'une enveloppe ou d'une charge fixe : − montant chaque mois à partir du mois suivant (au plus le montant prévu de la charge ce mois-là).
- **Horizon** : nombre de mois projetés (6, 12, 24, 36) ; au-delà de 24 mois, avertissement « Plus l'horizon est long, plus la projection est incertaine ».

##### Projection de l'épargne

```text
Épargne projetée (fin du mois m) = solde actuel + Σ capacités des mois jusqu'à m (signées : une capacité négative puise dans l'épargne)
Réservé projeté                  = épargné des objectifs + versements répartis (R18, jamais plus que la capacité)
```

- **Alertes** : mois où les versements choisis dépassent la capacité ; épargne projetée négative. Pas de blocage, un message clair.
- **Réel passé** : épargne à la fin des 6 derniers mois, reconstituée depuis les soldes déclarés et les mouvements, seulement à partir de la première date connue.
- Pour chaque objectif : date estimée par scénario **sans** et **avec** les leviers, et l'écart en mois (« avance de 2 mois »).

##### Appliquer au plan

| Levier | Changement |
|---|---|
| Versement | `versementMensuel` de l'objectif |
| Date cible | `dateCible` de l'objectif |
| Prime | nouvelle source de revenus « unique », probable, datée au début du mois budgétaire choisi |
| Réduction | la charge se termine ce mois-ci ; une copie au nouveau montant commence le mois suivant (les mois passés gardent leur prévu) |

#### Données

| Table / champ | Contenu |
|---|---|
| `Scenario` | `nom`, `ajustements` (JSON des leviers), `horizon` |
| `Reglages.reglesScenarios` | JSON des règles ; vide = règles par défaut |

#### Routes

| Route | Rôle |
|---|---|
| `POST /simulations/executer` | `{ ajustements, horizon }` → projection (aucune écriture) |
| `POST /simulations/appliquer` | `{ ajustements }` → modifie le plan, rend le résumé |
| `GET/POST /scenarios`, `PUT/DELETE /scenarios/:id` | Scénarios enregistrés |
| `GET/PUT /reglages` | `reglesScenarios` en plus |

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Moteur : règles par scénario (revenus, moyenne flexible du prudent), chaque levier, épargne projetée signée, alertes, réel passé, écart de date avec / sans leviers ; propriété : une simulation ne modifie jamais le réel.
- [x] Serveur : exécuter sans écrire, appliquer (chaque levier, résumé), scénarios, règles, isolation.
- [x] Écran : leviers, questions prêtes, enregistrer, appliquer avec confirmation, règles dans Réglages, raccourci `S`.
- [x] Rendu fidèle au template, sans débordement à 375 px.

#### Résultat

- `npm run verifier` : types OK, **288 tests** OK (partage 18, moteur 116, serveur 69, interface 85), build OK.
- Moteur : `simulation.ts` (`simuler`), règles et leviers dans `objectifs.ts` (`REGLES_SCENARIOS_DEFAUT`, `moyenneFlexible`, `avecAjustements`), `soldeAu` dans `epargne.ts` — 8 tests, dont une propriété : une simulation ne modifie jamais les données.
- Serveur : module `simulation` (6 routes), table `Scenario`, colonne `Reglages.reglesScenarios` (migration `scenarios`) ; les Objectifs utilisent les règles des Réglages.
- Vérifié dans le navigateur avec le compte « Essai » du lot 10 (supprimé ensuite ; « oussama » n'a pas été touché) :
  - **Simulateur** : épargne aujourd’hui 23 500 DH ; dans 12 mois 91 700 DH (réaliste), 75 200 DH (prudent : sans les 1 500 DH de cours probables) ;
  - **« Impact d’une prime ? »** + 5 000 DH en novembre : réaliste 96 700 DH ; moto 1 mois plus tôt (octobre 2027), fonds de sécurité 1 mois plus tôt, permis sans changement ;
  - **Appliquer au plan** : confirmation avec résumé, puis source « Prime (simulation) » unique et probable créée dans Autres revenus ;
  - **Réglages › Scénarios** : revenus retenus et dépenses flexibles par scénario ;
  - 375 px : aucun débordement (simulateur, réglages).

#### Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Couleurs des scénarios : deux tons de sauge trop proches (validateur de palette : échec) | Trio orange / violet / bleu de la palette du lot 2 (validateur : tout passe), plus un tracé de tirets différent par scénario |
| Mois de la prime tronqué (« novembre 20… ») | Mois courts (« nov. 2026 ») |
| Étiquette « Aujourd’hui » sur la graduation du haut | Marge du graphique |
| Résumé de confirmation : une liste dans un paragraphe (HTML invalide) | La description de `Confirmation` est un bloc |
| Raccourcis clavier : erreur si l’évènement ne vient pas d’un élément | Vérification de la cible |

#### Écarts et remarques

- **Prudent** : la moyenne réelle des dépenses flexibles n’existe qu’avec au moins un mois terminé qui a des dépenses notées ; sinon le prudent garde le budget prévu.
- **Leviers** : un levier de chaque sorte (un objectif, une prime, une réduction) ; le moteur et les scénarios enregistrés acceptent plusieurs primes et réductions.
- **Prime appliquée** : source « unique » et probable, datée au premier jour du mois budgétaire choisi (le 27 ou 28 du mois civil précédent en cycle de paie).
- **Réduction appliquée** : la charge s’arrête ce mois-ci et une copie réduite commence le mois suivant (les mois passés gardent leur prévu). Les dépenses déjà liées restent sur l’ancienne charge.
- **Questions prêtes** : elles règlent les leviers et répondent avec la simulation en cours (réaliste).
- **Scénario « perso »** de `produit.md (Plan)` § 6 : non fait ; les trois scénarios ont des règles réglables.

### Bilan du lot 12 — Recommandations & KPI

> Ancien fichier `docs/lots/Lot-12-recommandations-kpi.md`.

> Statut : **livré** (09/10/2026), en attente de validation. Références : `produit.md (Plan)` § 7.5, § 8 · `produit.md (Contexte)` R24–R26 · `ux-ui.md (UX)` § 1 (calme), § 3 (cloche), § 5.2, § 7, § 9.

#### Objectif

Dire **quoi faire**, chiffres à l'appui, sans jamais promettre : des alertes quand une action est utile (cloche), des recommandations expliquées, et les huit indicateurs de `produit.md (Plan)` § 8 calculés dans le moteur.

#### Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| **Huit KPI** calculés dans le moteur (`indicateurs`), route `GET /indicateurs?mois=` | Page Aujourd'hui qui les assemble : lot 13 |
| **Alertes** (`alertes`) : paie en retard ou attendue aujourd'hui, revenu en retard, échéance en retard, enveloppe dépassée, budget de la semaine dépassé, objectifs au-delà de l'épargne déclarée | Notifications système, e-mails |
| **Recommandations** (`recommandations`) : règles explicites, chacune avec message, montant, impact, base de calcul, condition, niveau de confiance | Conseils d'investissement (R26), score global |
| **Cloche** de l'en-tête : pastille (nombre d'alertes), panneau « À faire » + « Suggestions » | |
| **Mois › Vue d'ensemble** : carte « Indicateurs » | |
| **Objectifs** : carte « Suggestions » (recommandations liées aux objectifs) | |

#### Règles de calcul (moteur)

##### KPI (`produit.md (Plan)` § 8)

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

##### Alertes (cloche)

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

##### Recommandations

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

#### Routes

| Route | Rôle |
|---|---|
| `GET /indicateurs?mois=` | les huit KPI d'un mois (mois en cours par défaut) |
| `GET /recommandations` | `{ alertes, recommandations }`, textes rédigés (partage) |

#### Interface

- **Cloche** (en-tête, bureau et mobile) : pastille rouge avec le nombre d'alertes ; panneau « Notifications » (à droite sur bureau, feuille du bas sur mobile) avec « À faire » puis « Suggestions ». Chaque suggestion : message, effet, bouton d'action, et « Sur quoi repose ce calcul ? » qui déplie calcul, condition et confiance. Le panneau se ferme quand on suit une action.
- **Mois › Vue d'ensemble** (mois en cours ou passé non clôturé) : carte « Indicateurs », un chiffre par question, la base de chaque calcul sous « Sur quoi reposent ces calculs ? ».
- **Objectifs** : carte « Suggestions » avec les leviers chiffrés (réduction, prime, épargne disponible) ; l'effort et le fonds de sécurité y étaient déjà.
- **Simulateur** : « Simuler » depuis une suggestion pré-remplit l'objectif et la réduction (`?objectif=&reduction=&montant=`).
- Les indicateurs et la cloche sont rangés sous la clé de cache « mois » : toute saisie qui recalcule les mois les recalcule aussi (vérifié : marquer « Internet » payé fait passer la pastille de 3 à 2).

#### Écarts et décisions

1. **Reste à dépenser** : `produit.md (Plan)` § 8 dit « revenus réels − dépenses réelles − épargne prévue restante ». J'ai aussi retiré les **charges datées encore à payer** (loyer, internet, échéances) : sinon le loyer pas encore payé paraît disponible. Le budget restant des enveloppes, lui, reste à dépenser.
2. **Part variable** : calculée sur les 12 prochains mois budgétaires (prévu, toutes certitudes), pas sur les 12 derniers : l'historique est trop court au début.
3. **Écart au plan** du mois en cours : comparé au prévu cumulé à date (comme le graphique du rythme), pas au prévu du mois entier.
4. **« Scénario actif »** du délai avant objectif : le réaliste (il n'y a pas de scénario actif choisi par l'utilisateur).
5. Les phrases sont rédigées dans `packages/partage` (pas dans le moteur, qui ne formate rien), et rendues par l'API.
6. Pas de page dédiée : la page Aujourd'hui (lot 13) reprendra 1 à 3 recommandations et les KPI.

#### Fichiers

- Moteur : `indicateurs.ts`, `recommandations.ts` (+ tests).
- Partage : `conseils.ts` (rédaction, `CONFIANCES`, DTO) (+ tests).
- Serveur : module `conseils/` (`GET /indicateurs`, `GET /recommandations`), `essentielMensuel` sorti de l'épargne vers `charges/depot.ts` (+ `test/conseils.test.ts`).
- Interface : `features/conseils/` (`requetes.ts`, `saisie.ts`, `Conseils.tsx` : `Cloche`, `CarteIndicateurs`, `ListeAlertes`, `ListeRecommandations`), branchements dans `Entete`, `OngletEnsemble`, `PageObjectifs`, `PageSimulateur`.

#### Tests

314 tests au total (partage 21, moteur 130, serveur 72, interface 91) : +26 depuis le lot 11.

- Moteur : chaque KPI (dont « prévu » avant la paie, mois terminé, mois à venir, taux vide sans revenu) ; chaque alerte (déclenchement, mois clôturé muet) ; chaque recommandation (déclenchement, calme sans objectif à risque, données jamais modifiées).
- Partage : textes exacts, élision (« au lieu d'avril »), aucune formulation de garantie, une condition partout.
- Serveur : routes, validation du mois, isolation par compte.
- Interface : cloche (pastille, panneau, dépliage, liens), carte Indicateurs, pré-remplissage du simulateur.

#### Corrigé en passant

- « au lieu de avril 2029 » → « au lieu d'avril 2029 ».
- Dépassement de la semaine affiché au centime (« 1 483,31 DH ») → arrondi (« environ 1 484 DH ») dans l'alerte.
- Écart en % mal arrondi pour un négatif (−20,5 % → « −20 % ») → « −21 % ».
- Alertes de paie et d'échéances du mois précédent pour un compte qui venait de commencer → plus d'alerte sur l'avant-suivi.

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Chaque règle a un test moteur (déclenchement et non-déclenchement).
- [x] Aucune phrase de garantie : test sur tous les textes produits.
- [x] Cloche, Indicateurs et Suggestions vérifiés à 1342 px et 375 px (sans débordement), compte « Essai » supprimé ensuite.

### Bilan du lot 13 — Cumul du reste de mois en mois

> Ancien fichier `docs/lots/Lot-13-cumul.md`.

> Statut : **clôturé** le 10/10/2026 (livré le 09/10/2026). Demande du 09/10/2026 : « ce qui reste du salaire doit entrer comme cumulé dans le salaire du mois prochain, pour bien savoir ma projection sur les mois prochains ».

#### Objectif

Voir l'argent s'accumuler d'un mois à l'autre, comme sur le compte courant : ce qui reste à la fin d'un mois (revenus − charges − épargne versée) est reporté sur le mois suivant. Sur les mois à venir, cela donne une projection du compte.

#### Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Moteur : `cumulDesMois` (report, revenus, charges, épargne, reste, cumul par mois) | Vue calendrier de l'année sur Objectifs : lot 14 |
| Solde de départ du compte courant au début d'un mois (Réglages › Compte courant), découvert permis | Rapprochement avec un relevé bancaire |
| Mois › Vue d'ensemble : bande « Report / Reste du mois / Cumul fin de mois » | |
| Route `GET /cumul?du=&au=` (36 mois au plus) ; `cumul` dans le bilan d'un mois | |

#### Règles de calcul (moteur)

```text
Reste du mois  = revenus − charges − épargne
Cumul fin mois = report + reste
Report du mois suivant = cumul fin du mois
```

| Mois | Revenus | Charges | Épargne | Nature affichée |
|---|---|---|---|---|
| Passé | reçus (réel) | dépenses + paiements de dettes (réel) | versée − retirée (réel) | réel |
| En cours | reçus + attendus retenus par le réaliste | sorties réelles + charges encore prévues (lignes non payées, reste des enveloppes, échéances) | versée + versements mensuels pas encore faits | estimation |
| À venir | prévus retenus par le réaliste (garantis + probables) | charges prévues | versements mensuels choisis | prévu |

- **Point de départ** : le solde déclaré dans les Réglages au début d'un mois ; sinon 0 au mois de la première donnée réelle (paie reçue, revenu reçu, dépense, paiement de dette) ; sans aucune donnée, le mois en cours. Les mois d'avant sont marqués « avant le suivi », sans chiffre.
- **L'épargne n'est jamais une charge** (R11) : elle a sa colonne, car elle quitte le compte courant.
- **Deux lectures du même argent** : le cumul suppose que ce qui n'est pas versé à un objectif reste sur le compte ; les projections des Objectifs (lot 10) supposent que ce reste est épargné. Les deux sont des hypothèses, affichées comme telles.

#### Données

| Champ | Contenu |
|---|---|
| `Reglages.soldeDepart` | solde du compte courant, en centimes (négatif permis) |
| `Reglages.moisDepart` | mois budgétaire où ce solde s'applique |

Migration `cumul_depart`. `revenusDuMois` est sorti de `capaciteDuMois` (même règle des revenus retenus pour la capacité et le cumul). Le calendrier expose `debutDonnees`.

#### Interface

- **Mois › Vue d'ensemble** : sous le bandeau, trois cases — « Report de septembre » (ou « Solde de départ » au premier mois), « Reste du mois », « Cumul fin de mois » — et une phrase qui dit d'où vient le chiffre (réel, estimation, prévu). Un mois d'avant le suivi le dit.
- **Mon plan › Salaire & primes, tableau des Paies** (ajouté à ta demande) : colonnes Mois financé · **Revenus · Charges · Épargne · Cumul fin de mois** · Statut (avec la date de paie). Chaque ligne se lit : cumul du mois précédent + revenus − charges du mois − épargne = cumul fin de mois ; les charges suivent chaque mois (loyer tous les mois, assurance trimestrielle, ponctuel daté…). L'infobulle de chaque montant donne le détail (« Cumul du mois précédent 9 800 DH + revenus 10 000 DH − charges 5 500 DH − épargne 1 000 DH = 13 300 DH »). Réel en noir, estimation et prévu en gris italique ; « — » avant le début du suivi. Montants en DH sans préfixe répété, mois abrégés (« Sept. 2026 ») : rien n'est coupé à 1342 px ; sous 1024 px, le tableau défile dans sa carte.
- **Réglages › Compte courant** : mois (les 13 derniers) et solde ; « Enregistrer le solde », « Retirer », « Annuler » dans le toast.

#### Tests

323 tests au total (partage 21, moteur 134, serveur 75, interface 93) : +9.

- Moteur : chaîne réel → en cours → prévu, règle du scénario, solde de départ (dont découvert), mois d'avant le suivi, compte sans donnée.
- Serveur : cumul sur 4 mois, bilan avec cumul, solde de départ enregistré puis retiré, plages refusées.
- Interface : bande du cumul dans le mois, solde de départ (saisie invalide, montant négatif, retrait).

#### Vérification dans le navigateur

Compte « Essai » (supprimé ensuite) : septembre réel 4 400 DH → octobre en cours +4 500 → 8 900 DH ; décembre prévu 17 900 DH. Avec un solde de 2 000 DH au début d'octobre : « Solde de départ +2 000 », cumul fin octobre 6 500 DH, novembre « Report d'octobre +6 500 ». 1342 px et 375 px sans débordement.

#### Corrigé en passant

- Les colonnes « Prévu » et « Reçu » du tableau des Paies deviennent « Revenus » (paie reçue, ou prévue en gris italique, et autres revenus) : la place sert aux charges et à l'épargne du mois ; le détail prévu / reçu reste dans l'infobulle et dans le panneau de la paie.

- Au premier mois, la case disait « Report de septembre » même avec un solde déclaré : elle dit maintenant « Solde de départ ».

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Réel, estimation et prévu toujours nommés.
- [x] Vérifié à 1342 px et 375 px.

### Bilan du lot 14 — Objectifs › vue Calendrier de l'année

> Ancien fichier `docs/lots/Lot-14-calendrier-annee.md`.

> Statut : **clôturé** le 10/10/2026. Demande du 09/10/2026 : « un calendrier premium avec une vue par année, la carte de chaque mois montre le salaire ou le montant que j'aurai avec le cumul moins les charges ; chaque mois cliquable ouvre une fenêtre jolie et bien structurée avec les infos du mois ».

#### Objectif

Voir l'année d'un coup d'œil : combien il resterait sur le compte à la fin de chaque mois, et ce qui fait monter ou baisser ce chiffre. Un clic sur un mois en donne le détail.

#### Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Objectifs : onglets « Objectifs » / « Calendrier de l'année » | Page Année (graphiques, comparaison d'années) : lot 18 |
| Bandeau de l'année, 12 mois en cartes, année précédente / suivante | Semaines en cartes : lot 15 |
| Fenêtre du mois : calcul, objectifs, revenus, charges, épargne | Saisie depuis la fenêtre (elle renvoie au mois) |
| Moteur `resumeCumul`, `resume` dans `GET /cumul` | |

#### Règles

- **Les chiffres viennent du cumul du lot 13** : réel pour un mois terminé, estimation pour le mois en cours, projection réaliste pour les mois à venir. Rien n'est recalculé dans l'interface.
- **Résumé de l'année** (`resumeCumul`, moteur) : totaux des revenus, charges, épargne et restes des mois suivis ; cumul du dernier mois suivi ; mois au cumul le plus bas ; mois sous zéro.
- **Fin de l'année** = report reçu de l'année précédente + reste de l'année. Le bandeau montre les deux.
- **Objectifs sur les cartes** : un objectif actif dont la projection réaliste atteint la cible ce mois-là (« atteint ») ; un objectif actif ou en pause dont la date souhaitée tombe ce mois-là (« date visée »). Rien pour un objectif déjà atteint, réalisé ou abandonné.
- **Mois à venir dans la fenêtre** : chaque ligne montre son montant prévu, avec le statut « Prévu ». Une enveloppe affichait sinon « 0 DH sur 1 500 DH prévus ».
- **Mois d'avant le suivi** : regroupés en une bande. Chaque mois reste cliquable pour voir ses lignes, sans cumul.

#### Interface

- **Onglets** : « Objectifs » (la page d'avant) et « Calendrier de l'année ». La vue et l'année sont gardées dans l'adresse (`/objectifs?vue=calendrier&annee=2027`). Le bouton « Cette année » apparaît quand on regarde une autre année.
- **Bandeau** (le dégradé sauge du template) : « Cumul fin décembre (prévu) » et le mois le plus bas à gauche ; à droite, le reste cumulé de l'année, le report de l'année précédente, les revenus, les charges et l'épargne.
- **Carte d'un mois** :
  - en-tête : nom du mois, période budgétaire (« 27 sept. → 26 oct. ») et nature (« Réel », « En cours », « Prévu ») ;
  - au centre : « Cumul fin de mois » en grand, puis une jauge rapportée au plus haut cumul de l'année ;
  - en bas : Revenus +, Charges −, Épargne −, puis les objectifs du mois ;
  - style selon la nature :

    | Nature | Style |
    |---|---|
    | Réel | carte blanche |
    | En cours | cerclée de sauge |
    | Prévu | bord en pointillés, montants en italique gris |

  - un cumul négatif est en rouge.
- **Fenêtre du mois** (nouveau composant `Fenetre`, centrée sur bureau, feuille du bas sur mobile) :
  - le calcul en quatre cases : report (ou « Solde de départ »), revenus, charges, épargne. Pour le mois en cours, chaque case indique la part déjà réelle (« dont 4 400 DH réels »). Une ligne « = Cumul fin de mois » suit ;
  - les objectifs du mois (lien vers l'objectif) ;
  - Revenus, Charges (groupées : fixes, enveloppes, ponctuels, dettes, hors plan) et Épargne. Chaque ligne a sa date, son statut et son montant ; une enveloppe entamée affiche « 900 DH sur 1 500 DH prévus » ;
  - flèches mois précédent / suivant, « Fermer », « Ouvrir le mois » (Mois › Vue d'ensemble).
- **Mobile (375 px)** : deux cartes par ligne, avec le mois, la nature, le cumul, la jauge et les objectifs. Le détail revenus / charges / épargne est dans la fenêtre.

#### Tests

329 tests au total (partage 21, moteur 135, serveur 75, interface 98) : +6.

- Moteur : résumé d'une plage (totaux, cumul de fin, mois le plus bas, découvert, plage sans mois suivi).
- Serveur : `resume` dans `GET /cumul`.
- Interface :
  - règles d'affichage (jauge, objectifs du mois, montant d'une ligne, mois à venir) ;
  - bande d'avant le suivi, cartes et résumé ;
  - fenêtre (calcul, lignes, mois suivant, lien « Ouvrir le mois ») ;
  - changement d'année ;
  - vue gardée dans l'adresse.

#### Vérification dans le navigateur

Compte « Essai » (supprimé ensuite) : salaire 10 000 DH le 27, loyer 3 500 DH, assurance 1 200 DH par trimestre, courses 1 500 DH, sorties 600 DH, objectif Moto avec 1 000 DH par mois.

- **2026** : la bande « Janvier → août » ; septembre réel 4 900 DH ; octobre en cours 7 100 DH (10 000 − 6 800 − 1 000) ; décembre prévu 13 900 DH.
- **2027** : cumul fin décembre 49 900 DH (report 13 900 + reste 36 000). « Moto atteint » en mai, « date visée » en juin.

1342 px et 375 px sans débordement de page.

#### Corrigé en passant

- Fenêtre d'un mois à venir : les enveloppes et l'épargne affichaient « 0 DH, En cours » ; elles affichent maintenant leur prévu.
- Les cinq cases du calcul étaient coupées à 760 px (« Report de septe… ») : quatre cases, puis le cumul sur toute la largeur.

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Réel, estimation et prévu toujours nommés, jamais par la couleur seule.
- [x] Vérifié à 1342 px et 375 px.

#### Revu le 11/10/2026 : calendrier « premium » et ligne « Reste »

Demande : « une vue par année de manière premium, un joli calendrier avec tous les mois ; on garde le modal ; sur la carte du mois, après Charges, une ligne Reste avec le montant ».

- **Les 12 mois sont des calendriers** : grille des jours du mois budgétaire (L M M J V S D, ou à partir du dimanche selon les Réglages).
  - Le jour de paie est un rond sauge.
  - Une pastille sous un jour signale une charge datée : orange si prévue, verte si payée, rouge si en retard.
  - Aujourd'hui est cerclé ; les jours du mois civil précédent sont plus clairs.
  - Le survol d'un jour en donne le détail (« Loyer −3 500 DH »).
- **Ligne « Reste »** sur chaque carte, entre Charges et Épargne : revenus − charges du mois (moteur : `apresCharges`). La fenêtre du mois l'affiche aussi (« Reste après charges »).
- **Graphique « Cumul fin de mois »** : une barre par mois (réel plein, prévu plus clair, négatif en rouge sous le zéro) ; un clic ouvre le mois.
- **Tous les mois affichés**, y compris ceux d'avant le suivi (sans chiffres) ; la bande qui les regroupait est retirée.
- **Données** :
  - moteur : `evenementsDuMois` (revenus et charges datés, réel s'il existe) et `grilleDesJours` ;
  - route `GET /annee/:annee` (`AnneeDto` : cumul des 12 mois, résumé, début de semaine, événements par mois).
- **Tests** : 338 au total (partage 21, moteur 137, serveur 76, interface 104), dont la régression des pages blanches (2).
- Vérifié sur ton compte (lecture seule) à 1342 px et 375 px : octobre en cours, paie le 28 sept., reste 14 425 DH, cumul 10 425 DH.

### Bilan du lot 15 — Semaines en cartes

> Ancien fichier `docs/lots/Lot-15-semaines-cartes.md`.

> Statut : **clôturé** le 11/10/2026 (livré le 10/10/2026). Demande du 09/10/2026 : « améliore l'UI de la vue semaine par semaine, sur la même idée que le calendrier : chaque semaine porte ses infos sur sa carte, et un clic montre ce qu'on doit voir ».

#### Objectif

Lire le mois semaine par semaine d'un coup d'œil, comme le calendrier de l'année (lot 14). Un clic sur une semaine en donne le détail.

#### Périmètre

| Inclus | Exclu |
|---|---|
| Mois › Semaines : grille de cartes à la place du tableau | Changement des calculs (inchangés depuis le lot 9) |
| Fenêtre de la semaine : calcul, dépenses jour par jour, charges datées | Page Aujourd'hui : lot 16 |
| « + Ajouter » une dépense depuis la fenêtre, à la bonne date | |

#### Interface

- **Carte d'une semaine** :
  - en-tête : numéro, dates (« 5 oct. – 11 oct. », « · 2 jours » pour une semaine partielle) et statut (Passée, En cours, À venir) ;
  - au centre : **Reste** en grand, en rouge s'il est dépassé ; pour une semaine à venir, « Disponible (prévu) » en italique ;
  - barre : part du disponible dépensée ; pour la semaine en cours, un trait marque où tu devrais être aujourd'hui ;
  - puis Dépensé, Disponible et Écart (vert en avance, rouge au-dessus du rythme) ;
  - pastilles : tendance (« +50 % »), nombre de charges datées, épargne de la semaine.
- **Style selon le statut** :

  | Statut | Style |
  |---|---|
  | Passée | carte blanche |
  | En cours | cerclée de sauge |
  | À venir | bord en pointillés |

- **Fenêtre de la semaine** (composant `Fenetre` du lot 14) :
  - calcul : budget (prévu), report s'il y en a un, disponible, dépensé, puis « = Reste de la semaine » (sur fond rouge si dépassé) ;
  - en mots : jour 6 sur 7 et montant par jour restant, écart sur le rythme, tendance et sa base ;
  - dépenses jour par jour : un clic modifie, « + Ajouter » ouvre la saisie à aujourd'hui (ou au dernier jour d'une semaine passée) ;
  - charges datées et leur statut, prévu, payé cette semaine, épargne ;
  - semaine précédente / suivante, « Fermer ». En lecture seule pour un mois clôturé ou une semaine à venir.
- **Carte « Cette semaine »** (colonne de droite) : bouton « Voir le détail de la semaine ».
- **Bloc « Lire une carte »** : il remplace les barres « Dépensé par semaine », que les cartes montrent déjà.
- **Mobile (375 px)** : deux cartes par ligne (statut, reste, barre, pastilles) ; le détail est dans la fenêtre.

#### Tests

331 tests au total (partage 21, moteur 135, serveur 75, interface 100) : +2.

- Cartes : libellé de chaque semaine (reste, statut, ou disponible pour une semaine à venir), jours d'une semaine partielle, tendance, charges ; aucune fenêtre ouverte d'office.
- Fenêtre : calcul et montant par jour, seules les dépenses de la semaine, charges datées, semaine précédente.
- Bouton de « Cette semaine » ; ajout d'une dépense au dernier jour d'une semaine passée ; mois clôturé sans « + Ajouter ».

#### Vérification dans le navigateur

Compte « Essai » (supprimé ensuite), octobre 2026, enveloppes courses 1 500 DH et sorties 600 DH :

- **Cartes** : semaine 2 à −355,78 DH, semaine 3 en cours à −805,82 DH (+146 %, 2 charges), semaines 4 à 6 à venir.
- **Fenêtre de la semaine 3** : « + Ajouter » ouvre la saisie par-dessus la fenêtre. Après une dépense de 50 DH, la fenêtre se met à jour : dépensé 1 330 DH, reste −855,82 DH, « Aujourd'hui · Courses 50 DH ».

1342 px et 375 px sans débordement de page.

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Prévu et réel toujours nommés, jamais par la couleur seule.
- [x] Vérifié à 1342 px et 375 px.

#### Ajout du 12/10/2026 : les semaines ne reçoivent que les montants mis par l'utilisateur

Demandes : « le budget prévu ne se définit pas : les semaines s'alimentent par les montants que je rentre ; semaine 1 sans montant, c'est 0 » ; « laisser à l'utilisateur la liberté de mettre un montant différent pour chaque semaine, et l'alerter s'il a dépassé le montant de l'enveloppe ». Remplace les versions des 10, 11 et 12/10 (division automatique, montant additionné, montant par semaine imposé).

- **Enveloppe** : « Budget du mois » (ex. 400 DH), puis « Je consomme ce budget : Librement sur le mois / Par semaine / Par jour ».
  - Par semaine : aucun montant imposé. Le bloc « Ce que je mets chaque semaine » a un champ par semaine (vide = 0), pour le mois en cours **ou le suivant** (choix « Octobre (en cours) / Novembre »), pour préparer ses montants en fin de mois.
  - En bas du bloc : « 550 DH mis : 50 DH restent à répartir sur ce mois. », « Tout le budget est réparti : 600 DH. », ou en rouge « Tes semaines dépassent le budget de l'enveloppe de 50 DH (650 DH mis). » (alerte, l'enregistrement reste possible).
  - Par jour : « Montant par jour », chaque jour le reçoit jusqu'au budget (« Budget du mois atteint le 19 oct. »).
- **Semaines (Mois › Semaines, Aujourd'hui)** : le budget d'une semaine est la somme des montants mis sur elle (et des montants par jour) ; 0 sinon. Rien n'est calculé ni réparti par MySalary. Le dépensé reste le réel ; une semaine dont le dépensé dépasse son budget est dépassée (alerte « semaine dépassée »), et une enveloppe dont le dépensé du mois dépasse son budget déclenche « enveloppe dépassée ».
- **Enveloppe libre** : suivie sur le mois seulement ; l'onglet Semaines le dit (« Courses est consommée librement : suivi sur le mois, sans montant de semaine. ») avec le lien « Mettre mes montants par semaine », ainsi que le budget pas encore mis sur une semaine. Le rythme du mois (bilan) la compte au fil des jours, vue du mois entier.
- **Moteur** : `planEnveloppe` (montants de semaine tels quels, `aRepartir`, `depassement`), `SuiviDesSemaines.budget` = total reçu par les semaines, `libres`, `aRepartir`.
- **Données** : `Charge.semaines` (montant de chaque semaine), `Charge.rythme` (par jour seulement) ; migration `enveloppe_rythme`. `GET /charges/resume` donne les semaines du mois en cours et du suivant.
- **Tests** : 355 au total (moteur : montants de semaine, dépassement, par jour, libre, propriété « les semaines reçoivent exactement les montants mis » ; serveur ; interface).

### Bilan du lot 16 — Aujourd'hui

> Ancien fichier `docs/lots/Lot-16-aujourdhui.md`.

> Statut : **livré** (11/10/2026), en attente de validation. Objectif (ux-ui.md (UX) § 5.2) : « où j'en suis », en 5 secondes. Remplace la page d'attente de l'accueil.

#### Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Héros : reste à dépenser du mois, par jour, jours restants ; reste de la semaine | Calendrier jour par jour : lot 17 |
| À faire : paie à confirmer (confirmée sur place), échéances en retard, dépassements | Saisie d'un revenu reçu préremplie depuis une alerte de revenu en retard |
| 7 prochains jours ; bilan de la semaine passée le premier jour de la semaine | |
| Épargne du mois, objectif prioritaire, 1 à 3 suggestions | |
| Ajouter une dépense, noter un revenu reçu, ouvrir le mois | |

#### Règles

- **Rien n'est recalculé dans l'interface** : le reste à dépenser, la semaine, l'épargne et l'objectif viennent des indicateurs (lot 12) ; les actions et suggestions des alertes et recommandations (lot 12).
- **7 prochains jours** (moteur `prochainsJours`) : revenus et charges datés d'aujourd'hui à J+6, même à cheval sur deux mois budgétaires ; réel s'il existe, sinon prévu (en italique).
- **Semaine passée** (moteur `semainePassee`) : seulement le premier jour d'une semaine (lundi, ou dimanche selon les Réglages), s'il y a des enveloppes.
- **Paie** : tant qu'elle n'est pas reçue, le mois budgétaire en cours reste le précédent (règle du lot 4) ; le reste à dépenser est marqué « prévu » quand la paie du mois compte sans être confirmée.
- **Reste négatif** : montant en couleur d'alerte, phrase « Le mois est dépassé de … » avec le détail du calcul.

#### Données

Route `GET /aujourdhui` (`AujourdhuiDto`) : un seul chargement du calendrier pour les indicateurs du mois en cours, les alertes, les 3 premières recommandations, les 7 prochains jours, la semaine passée et l'état « sans salaire ».

#### Interface

- Fil d'Ariane « Aujourd'hui / Lundi 12 octobre 2026 » ; carte principale « Bonjour Prénom », mois budgétaire et ses dates.
- Bandeau héros : à gauche le reste du mois (compteur animé), par jour, jours restants ; à droite la semaine. Sous le bandeau, la phrase du calcul, puis la barre de la semaine.
- « À faire » : « Confirmer la paie » ouvre le panneau de la paie (Mon plan › Salaire) sur la réception, ici même ; les autres actions mènent à l'écran qui les règle.
- « 7 prochains jours » : groupés par jour (« Aujourd'hui », « Demain », « Vendredi 15 janvier »), revenus en vert « + », charges « − », statut en mots.
- Colonne de droite : Épargne du mois (versé sur prévu, taux réel et prévu), Objectif prioritaire (progression, date estimée en projection), Suggestions.
- Boutons : « Ajouter une dépense », « Noter un revenu reçu », « Ouvrir le mois ».
- État vide : « Ajoute ton salaire pour voir ton reste du mois » → Mon plan. Erreur : message et « Réessayer ».

#### Tests

353 tests au total (partage 21, moteur 142, serveur 79, interface 111) : +10 depuis le lot 15 et l'ajout des enveloppes.

- Moteur : 7 prochains jours à cheval sur deux mois ; semaine passée le lundi (et le dimanche), rien les autres jours ni sans enveloppe.
- Serveur : compte sans salaire ; reste, semaine en cours et passée, prochains jours, actions, au plus 3 suggestions.
- Interface : chaque bloc, confirmation de la paie sur place, reste négatif, état vide, erreur.

#### Vérification dans le navigateur

Compte « Essai » (supprimé ensuite) à 1342 px et 375 px : héros, À faire, prochains jours, épargne, objectif ; paie d'octobre annulée puis confirmée depuis la page : « Paie à confirmer » disparaît et la page se met à jour. Pas de débordement.

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Réel, prévu et projection toujours nommés.
- [x] Vérifié à 1342 px et 375 px.

### Bilan du lot 17 — Calendrier

> Ancien fichier `docs/lots/Lot-17-calendrier.md`.

> Statut : **livré** (12/10/2026), en attente de validation. Objectif (ux-ui.md (UX) § 5.10) : voir quand l'argent entre et sort.

#### Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Vue grille du mois budgétaire et vue liste | Vue de l'année : lot 18 (le calendrier de l'année du lot 14 reste dans Objectifs) |
| Événements : paie et primes, autres revenus, charges fixes, échéances de dettes, ponctuels, dates d'objectifs | Modifier une charge ou un ponctuel dans une fenêtre du calendrier (le lien ouvre Mon plan) |
| Solde du jour, réel puis projeté, au survol | |
| Filtre par type ; pastille « +N » ; marqueur « passé, pas confirmé » | |
| Détail d'un jour : prévu, réel, statut, « Marquer payé » ou lien de confirmation, lien pour modifier | |
| Ajouter un ponctuel daté (à la date du jour ouvert) | |

#### Règles

- **Événements** (moteur `calendrierDuMois`) : les lignes datées du bilan du mois, typées (`paie`, `revenu`, `charge`, `dette`, `ponctuel`) avec leur sens (entrée, sortie), leur montant (réel s'il existe, sinon prévu), leur statut et la ligne du bilan, donc la **même cible de confirmation** que l'onglet Mois. Les enveloppes, le hors plan et l'épargne n'ont pas de date : ce ne sont pas des événements.
- **Solde du jour** : revenus reçus − sorties réelles (dépenses et paiements de dettes) depuis le début du mois jusqu'à aujourd'hui, c'est le réel. Après aujourd'hui s'ajoutent les restes datés pas confirmés : revenus attendus, charges et échéances à payer, c'est le **projeté**, toujours dit « projeté ». Un revenu ou une charge en retard compte dès demain. Les enveloppes ne comptent qu'une fois dépensées. Le report des mois précédents n'est pas inclus (voir le cumul, lot 13).
- **Mois terminé** : tout est réel, rien n'est projeté. **Mois à venir** : tout est prévu, le solde part de zéro.
- **Dates d'objectifs** : un objectif est placé au dernier jour du mois budgétaire où il est atteint (projection réaliste) ou visé (date souhaitée), avec la même règle que le calendrier de l'année (`jalonsDuMois`).
- **Statuts en mots**, jamais la couleur seule : Reçu, Payé, Prévu, En retard, En partie payé, Date visée, Atteint (projection). Un événement passé pas confirmé porte un marqueur et la mention « pas encore confirmé ».
- **Plusieurs événements le même jour** : deux visibles dans la case, puis « +N ». Sur mobile, des points de couleur à la place des pastilles ; un appui ouvre le jour.

#### Données

Route `GET /mois/:cle/calendrier` (`CalendrierMoisDto` : mois, aujourd'hui, début de semaine des Réglages, événements, jours avec solde). Une écriture (dépense, paie, ponctuel) recalcule la requête.

#### Interface

- Page `/calendrier`. Le mois, la vue (`?vue=liste`) sont dans l'adresse ; navigation de mois comme sur la page Mois.
- Colonne de droite : solde en fin de mois (réel ou projeté), nombre d'événements et d'événements passés pas confirmés, lecture du calendrier, bouton « Ajouter un ponctuel ».
- Page Aujourd'hui : lien « Ouvrir le calendrier » sous les 7 prochains jours (la barre du bas mobile n'a que 4 destinations).
- États : chargement, vide (« Aucun événement prévu sur ce mois. »), erreur avec « Réessayer ».

#### Tests

Moteur (événements typés, solde réel/projeté, mois terminé et à venir), serveur (route, ponctuel ajouté, isolation, clé invalide), interface (grille, « +1 », fenêtre du jour, confirmation sur place, retard, objectif, filtre, liste, ajout d'un ponctuel, vide, erreur).

#### Critères de validation

- [x] `npm run verifier` passe.
- [x] Réel et projeté toujours nommés ; aucun calcul dans l'interface.
- [x] Vérifié à 1342 px et 375 px sur un compte « Essai » (supprimé ensuite).

### Bilan du lot 18 — Année

> Ancien fichier `docs/lots/Lot-18-annee.md`.

> Statut : **livré** (12/10/2026), en attente de validation. Objectif (ux-ui.md (UX) § 4.8, § 5.6) : comprendre l'année sans lire chaque mois.

#### Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Page `/annee`, onglets Synthèse et Calendrier (le calendrier de l'année du lot 14 y est réutilisé) | Comparaison d'une année à l'autre |
| Revenus, dépenses, épargne de l'année : réel à date et projeté restant séparés | Export de l'année : lot 20 |
| Graphique mensuel (plein = réel, hachuré = en cours ou prévu) | |
| Les douze mois cliquables → Mois ; mois avant le suivi grisés | |
| Mois les plus coûteux, part variable du revenu, épargne cumulée | |
| Progression de chaque objectif sur l'année | |
| Année future marquée « Projection » | |

#### Règles

- **Réel et projeté, jamais mélangés** (ux-ui.md (UX) § 9) : mois terminé = tout réel ; mois en cours = le réel à date (`dontReel`) plus le projeté restant ; mois à venir = tout projeté (scénario réaliste). Chaque total d'année donne `reel`, `projete`, `total`. Année passée : pas de projeté. Année future : pas de réel.
- **Dépenses** = sorties et charges encore prévues, épargne exclue (R11).
- **Mois les plus coûteux** : les trois mois suivis aux charges les plus hautes, à égalité le plus tôt ; un mois en cours ou prévu est marqué comme tel.
- **Part variable** : primes et revenus variables ÷ tous les revenus des douze mois (règle déjà utilisée par les indicateurs).
- **Épargne cumulée** : somme des épargnes mensuelles de l'année, réel puis prévu ; cumul mois par mois disponible dans les données.
- **Objectifs** : épargné à la fin de l'année précédente, aujourd'hui, puis en fin d'année : réel pour une année passée, projeté (réaliste, trajectoire du lot 10) sinon ; « hors projection » si la trajectoire ne va pas jusque-là.
- **Mois avant le suivi** : grisés, « Pas de données avant ton inscription », sans barre. Aucun mois suivi : message dédié.

#### Données

Route `GET /annee/:annee/suivi` (`SuiviAnnuelDto`). Une écriture (dépense, paie, charge, objectif) recalcule la requête.

#### Interface

- Fil d'Ariane « Année / Synthèse », onglets ; l'année et la vue sont dans l'adresse (`?annee=`, `?vue=calendrier`).
- Trois cartes (Revenus, Dépenses, Épargne), graphique, douze mois, deux colonnes (mois coûteux ; part variable et épargne cumulée), objectifs avec barre pleine + hachurée.
- Page Aujourd'hui : lien « Voir l'année » (la barre du bas mobile n'a que 4 destinations).
- États : chargement, erreur avec « Réessayer », année future, aucun mois suivi, aucun objectif.

#### Tests

Moteur (totaux réel/projeté, mois coûteux, part variable, épargne cumulée, objectif, année passée et future), serveur (route, objectif, isolation, clé invalide), interface (totaux séparés, mois coûteux, douze mois et grisés, objectif, année future, aucun mois suivi, erreur).

#### Critères de validation

- [x] `npm run verifier` passe (384 tests).
- [x] Réel et projeté toujours nommés ; aucun calcul dans l'interface.
- [x] Vérifié à 1342 px et 375 px sur un compte « Essai » (supprimé ensuite).

### Bilan du lot 19 — Onboarding & import V0

> Ancien fichier `docs/lots/Lot-19-onboarding.md`.

> Statut : **livré** (12/10/2026), en attente de validation. Objectif (ux-ui.md (UX) § 4.1, § 5.1 ; `produit.md (Plan)` § 7.1 bis) : une première vue utile en moins de 5 minutes.

#### Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Page `/onboarding`, dix étapes, que l'on peut passer ; barre de progression et « étape 3 sur 10 » | Import d'un export MySalary : lot 20 (export et import JSON d'un compte) |
| Étape sauvegardée par compte, reprise, retour arrière sans perte | Étude HTML de la V0 (ses chiffres ne sont pas un fichier de données) |
| Import d'un export money-guru : aperçu groupé par thème, Importer / Modifier / Ignorer, conflits posés en question | Bouton pour relancer l'onboarding depuis les Réglages |
| Lignes importées « importé · à confirmer » aux étapes 3 à 9 | |
| Résumé : mois budgétaire, revenu et charges prévus, capacité d'épargne et date du premier objectif (projection) | |
| Mode « mes revenus varient » | |

#### Règles

- **Rien n'est importé comme réel, ni créé sans confirmation.** Le fichier est analysé par le moteur (`analyserMoneyGuru`, fonction pure) qui **propose** des lignes ; l'utilisateur décide. Une ligne acceptée à l'étape 2 reste « importé · à confirmer » jusqu'à son étape, où la confirmer ouvre le formulaire habituel de Mon plan, prérempli. Le fichier brut est archivé (`ImportSource`).
- **Mapping** (produit.md (Plan) § 7.1 bis) :
  - **Salaire** : les valeurs contradictoires du fichier (revenu net, montants reçus sur au moins deux mois) sont proposées en question simple ; **aucune n'est retenue d'office**, un salaire ne s'importe pas sans choix. Jour de paie et « finance le mois suivant » sont repris.
  - **Primes** : l'écart d'un mois au-dessus du dernier niveau de salaire (ex. 15 000 = 10 000 + 5 000).
  - **Modèle de dépenses** : Nourriture, Transport, Fun → enveloppes ; Téléphone, Gym, Assurances, Famille → charges fixes (le jour de paiement n'est pas dans le fichier) ; **« Savings » → versement d'épargne, jamais une charge** (R11) ; montants à 0 ignorés.
  - **Noms de personnes ou lignes inconnues du modèle** (Mohamed, Yahya) → « à classer » : dette avec échéancier, aide récurrente, ou ignorée.
  - **Mois à venir qui diffèrent du modèle** → ponctuels prévus ; **le même écart sur trois mois ou plus** → une seule charge fixe proposée (ex. 240 DH par mois).
  - **Objectifs** : cible, mois cible, déjà mis de côté, versement ; un « achat enregistré » n'achève pas l'objectif.
  - **Journal, historique des paies** : informations, jamais importées. Allocation, patrimoine, taux de rendement, fonds d'urgence : non repris, listés.
- **Aucune valeur pré-remplie présentée comme réelle** : les suggestions (téléphone, internet…) n'ont pas de montant ; une valeur importée porte « Importé · à confirmer ».
- **Sauvegarde** : chaque étape écrit dans le plan avec les mêmes formulaires que Mon plan ; l'étape atteinte est enregistrée sur le compte. Revenir en arrière montre ce qui est déjà dans le plan.
- **Comptes existants** : seul un compte **créé** mène à la mise en route ; ouvrir un compte existant mène à Aujourd'hui. Un compte commencé mais pas terminé affiche « Reprendre » sur la page Aujourd'hui.

#### Données

- Table `ImportSource` (migration `import_source`) : une par compte, fichier brut et analyse (décision de chaque ligne), supprimée avec le compte.
- Routes : `GET` et `PUT /onboarding` (étape, fin), `POST /import/apercu` (analyse, sans rien écrire dans le plan), `PUT /import/lignes/:id` (décision ou correction d'une ligne), `DELETE /import`.

#### Interface

- Étapes : 1 Bienvenue (partir de zéro / importer) · 2 Import · 3 Salaire (contrat, puis dernière paie reçue) · 4 Primes · 5 Charges fixes · 6 Enveloppes · 7 Dettes et ponctuels · 8 Épargne · 9 Premier objectif · 10 Résumé.
- Formulaires réutilisés : contrat, source de revenu, charge, dette, ponctuel, avec une proposition (`prefill`) quand la ligne vient de l'import.
- États : chargement, erreur avec « Réessayer », fichier illisible ou inconnu (« Ce fichier n'est pas un export MySalary ou money-guru. Tu peux continuer sans importer. »), résumé sans salaire.

#### Tests

Moteur (analyse : salaire, primes, modèle, ponctuels, charge récurrente, objectifs, journal, fichier abîmé, décisions), serveur (étape, aperçu sans écriture dans le plan, fichier inconnu, décisions, isolation), interface (reprise, import, conflit de salaire, confirmation de chaque étape, résumé, quitter). Le fichier d'exemple des tests est fictif : aucune donnée personnelle dans le dépôt.

#### Critères de validation

- [x] `npm run verifier` passe (414 tests).
- [x] Aucune donnée importée comme réelle ; « Savings » jamais en charge.
- [x] Vérifié à 1342 px et 375 px sur un compte « Essai » (supprimé ensuite), avec ton vrai fichier money-guru.

### Bilan du lot 20 — Export & sauvegarde

> Ancien fichier `docs/lots/Lot-20-export-sauvegarde.md`.

> Statut : **livré** (12/10/2026), en attente de validation. Objectif : ne jamais perdre ni enfermer ses données.

#### Périmètre

| Inclus | Exclu |
|---|---|
| Export JSON d'un compte (Réglages › Compte) | Export CSV / Excel |
| Import d'un export : crée un **nouveau** compte (écran Profils) | Fusion dans un compte existant |
| Export proposé avant la suppression et avant la réinitialisation | Sauvegarde déclenchée depuis l'interface |
| Réinitialisation d'un compte (Réglages › Zone sensible) | |
| Sauvegarde de la base : `npm run sauvegarde` | Restauration automatique |

#### Règles

- **L'export contient tout le compte** : réglages, contrat, paies, revenus, catégories, charges, ponctuels, dettes, dépenses, clôtures et journal, épargne, objectifs, scénarios. Pas l'identifiant du compte, pas le fichier brut de l'import V0.
- **Un import ne remplace jamais rien** : nouveau compte (« Prénom (import) » si le prénom existe), nouveaux identifiants, liens recopiés, textes JSON (clôtures, scénarios) mis à jour. Tout ou rien : un fichier refusé ne crée rien. Le compte importé ouvre directement sur Aujourd'hui.
- Refusés : fichier qui n'est pas un export MySalary, version plus récente, ligne sans identifiant, lien cassé.
- **Réinitialiser** vide plan, réel, épargne, clôtures et import ; garde le compte, le prénom, la devise ; réglages par défaut ; retour à la mise en route. Double confirmation (prénom retapé), export proposé d'abord.
- **Sauvegarde de la base** : `npm run sauvegarde [dossier]` copie la base (`VACUUM INTO`, sûr serveur allumé) dans `sauvegardes/mysalary-AAAAMMJJ-HHMMSS.db` (hors dépôt), 10 copies gardées.
- L'aperçu d'import de l'onboarding oriente un export MySalary vers l'écran Profils.

#### API

`GET /utilisateurs/:id/export` · `POST /utilisateurs/import` · `POST /utilisateurs/:id/reinitialiser`.

#### Tests

Serveur : export (contenu, isolation), import (liens, JSON, réglages, aller-retour identique, refus sans création), réinitialisation, sauvegarde (nom, rotation). Interface : nom du fichier, export avant suppression, réinitialisation, import (illisible, accepté, refusé).

#### Critères de validation

- [x] `npm run verifier` passe (426 tests).
- [x] Aller-retour vérifié sur ton compte (copie importée identique, puis supprimée ; ton compte intact).

### Bilan du lot 21 — Finitions (partiel)

> Ancien fichier `docs/lots/Lot-21-finitions.md`.

> Statut : **livré en partie** (12/10/2026), en attente de validation.

#### Fait

- **Paquet JS** : chaque page est chargée à la demande ; bibliothèques lourdes à part (`graphiques`, `animations`, `radix`, `react`). Avant : un seul fichier de 1 436 ko. Maintenant : ≈ 690 ko pour le premier écran, graphiques (407 ko) chargés avec les pages qui en ont besoin.
- **Raccourcis** `←` `→` : mois précédent / suivant (Mois, Calendrier) et année (Année). Sans effet dans un champ, une liste d'onglets, un menu, ou sous une fenêtre ouverte.
- **Textes de chantier** : la page « Cette page arrive au lot N » est supprimée ; une adresse inconnue affiche « Cette page n'existe pas. » avec un retour à Aujourd'hui.
- **Vitrine** du design system : réservée au développement (absente de la version construite).
- **Toast** « … · ajoutée à novembre » quand la dépense saisie tombe dans un autre mois budgétaire que le mois courant.
- **Accessibilité** : lien « Aller au contenu » (premier élément au clavier), contenu principal ciblable.

#### Pas fait (à décider)

- **Playwright** (parcours de bout en bout) : demande de télécharger un navigateur de test.
- Glisser-déposer des objectifs ; Réglages › Catégories ; modifier une charge « à partir de maintenant » ; suspendre un élément du plan ; aperçu avant de changer de mode de période (tous « proposés, à confirmer »).

### Bilan du lot 22 — Authentification

> Ancien fichier `docs/lots/Lot-22-authentification.md`.

> Statut : **livré** (13/10/2026), en attente de validation.

#### Règles

- **Mot de passe par compte, facultatif en local.** Un compte sans mot de passe reste ouvert comme avant (ton compte n'est pas modifié). Un compte protégé exige une session pour tout : ses données, l'ouverture, le renommage, la suppression, l'export, la réinitialisation.
- **Stockage** : hash `scrypt` (sel aléatoire) ; le mot de passe n'est jamais stocké ni renvoyé (`Utilisateur.protege` seulement). 8 caractères au moins.
- **Session** : jeton aléatoire dans un cookie `HttpOnly; SameSite=Strict`, 30 jours ; seule son empreinte SHA-256 est en base (table `Session`). Une session expirée est supprimée à la lecture. Une session = un compte à la fois.
- **Essais** : 5 mots de passe faux de suite bloquent les essais une minute (réponse 429).
- **Changer le mot de passe** : session et ancien mot de passe exigés ; les autres sessions du compte tombent. **Retirer** : mot de passe exigé.
- **Création d'un compte avec mot de passe** : il reste ouvert pour son créateur (session ouverte).
- **Serveur ouvert au réseau** (`HOTE=0.0.0.0`) : le serveur **refuse de démarrer** si un compte n'a pas de mot de passe ; la création exige un mot de passe ; l'import d'un compte et le retrait du mot de passe sont refusés. Par défaut le serveur n'écoute que `127.0.0.1`. À mettre derrière HTTPS (le cookie n'est pas `Secure` pour rester utilisable en local).
- **Interface** : ouvrir un compte protégé demande le mot de passe ; Réglages › Mot de passe (définir, changer, retirer) ; « Changer de compte » ferme la session ; session expirée → retour à Profils avec « Session expirée. Reconnecte-toi. ».

#### API

`POST /utilisateurs/:id/connexion` · `POST /deconnexion` · `PUT /utilisateurs/:id/mot-de-passe` · `POST /utilisateurs/:id/mot-de-passe/retrait` ; `POST /utilisateurs` accepte `motDePasse`. Migration `authentification` (colonne `motDePasse`, table `Session`).

#### Limites

- La liste des comptes (prénoms) reste visible avant connexion, comme l'écran Profils.
- Pas de récupération de mot de passe : un mot de passe perdu = compte fermé (la base reste accessible à qui a le fichier).
- Pas de HTTPS intégré, pas de limitation globale par adresse IP.

#### Tests

Serveur : accès refusé sans session, mauvais/bon mot de passe, cookie HttpOnly, jeton non stocké en clair, isolation entre comptes protégés, expiration, déconnexion, blocage après 5 essais, définir/changer/retirer, suppression du compte, mode réseau. Interface : connexion (refus puis succès), définir/changer/retirer, session expirée.

#### Critères de validation

- [x] `npm run verifier` passe (441 tests).
- [x] Vérifié sur le serveur en marche avec un compte « Essai » (créé protégé, 401 sans cookie, 200 avec, supprimé ensuite) ; ton compte reste ouvert.

### Bilan du lot 23 — Nettoyage, authentification et multi-utilisateur

> Ancien fichier `docs/lots/Lot-23-multi-utilisateur.md`.

> Statut : **livré** (12/10/2026), en attente de validation. Remplace l'authentification locale du lot 22.

#### 1. Audit et nettoyage

| Constat | Action |
|---|---|
| Composant `Tableau` jamais importé (lot 2) | supprimé |
| `comparer`, `plusTard` (dates), `CERTITUDES_PAR_SCENARIO` (remplacé par les règles des scénarios), type `CalendrierPaie` : jamais utilisés | supprimés |
| `plageAnnee`, `NOMS_MOIS` (interface) : jamais utilisés | supprimés |
| `moisAbrege` (objectifs) identique à `moisCourt` (année) | doublon retiré ; `pointsSimulation` des objectifs renommé `pointsTrajectoireSimulee` (homonyme du simulateur) |
| En-tête `X-Utilisateur` : le client choisissait le compte (aucune isolation réelle) | retiré : le compte vient de la session |
| Écran Profils, routes `/utilisateurs/*` (liste publique des comptes, actions par identifiant) | retirés, remplacés par `/auth/*` et `/compte/*` |
| `README.md` : « Pas d'authentification en v1 » | réécrit |

Vérifié : toutes les dépendances sont utilisées (`@testing-library/dom` est requise par `@testing-library/react`) ; aucun export mort restant (script d'audit). `Skills/`, `Templates/` et `Salaire/` (données personnelles, hors dépôt) ne sont pas touchés.

#### 2. Authentification

- **Inscription** (`POST /auth/inscription`) : prénom, e-mail (minuscules, unique), mot de passe (8 caractères au moins), devise. Ouvre la session ; le nouveau compte commence par la mise en route.
- **Connexion** (`POST /auth/connexion`) : même message pour un e-mail inconnu et un mauvais mot de passe (« E-mail ou mot de passe incorrect. »), même durée de calcul (hash leurre).
- **Déconnexion** (`POST /auth/deconnexion`), **session** (`GET /auth/session` : le compte connecté ou 401).
- **Mot de passe oublié** (`POST /auth/mot-de-passe/oubli`) : réponse identique que l'e-mail existe ou non ; lien à usage unique valable 1 heure, seule son empreinte est en base ; un nouveau lien annule l'ancien. **Nouveau mot de passe** (`POST /auth/mot-de-passe/reinitialisation`) : ferme toutes les sessions du compte.
- **Envoi** : SMTP si `SMTP_URL` est défini (nodemailer), sinon le lien est écrit dans le journal du serveur.
- **Compte connecté** (`/compte/*`, session obligatoire) : prénom, changement de mot de passe (actuel exigé ; les autres sessions tombent), export, restauration d'un export dans un compte vide, réinitialisation et suppression (mot de passe exigé).

#### 3. Sécurité et isolation

- Mots de passe : `scrypt` (N = 2^15, sel aléatoire), jamais stockés ni renvoyés.
- Sessions : jeton aléatoire de 256 bits dans un cookie `HttpOnly; SameSite=Strict; Path=/`, `Secure` quand l'interface est en HTTPS ; 30 jours ; empreinte SHA-256 en base ; nouveau jeton à chaque connexion ; session expirée supprimée.
- Le compte courant vient **uniquement** de la session (`exigerUtilisateur`) ; chaque dépôt filtre déjà par `utilisateurId`. Une donnée d'un autre compte, même avec son identifiant, répond 404.
- Essais limités en mémoire : connexion 5 échecs par e-mail et 20 par adresse IP en 15 minutes ; mot de passe oublié 5 demandes par heure et par IP ; confirmations par mot de passe 5 échecs en 15 minutes.
- `SameSite=Strict` et corps JSON : pas de requête de compte possible depuis un autre site.

#### 4. Base de données et migration

- Migration `20261014080000_comptes_email` : colonne `Utilisateur.email` (unique, vide pour les anciens comptes), table `JetonMotDePasse`. Aucune donnée n'est modifiée.
- Un compte d'avant ce lot (sans e-mail ni mot de passe) ne peut pas se connecter tant qu'il n'est pas activé : `npm run compte:activer -- <prénom ou identifiant> <e-mail>` (sur la machine du serveur) lui donne un e-mail et affiche un lien de 24 heures pour choisir le mot de passe. Ses données restent intactes.
- Une sauvegarde de la base a été faite avant la migration (`sauvegardes/`).

#### 5. Interface

- Pages `/connexion`, `/inscription`, `/mot-de-passe/oubli`, `/mot-de-passe/nouveau` : bandeau sauge de l'app (bureau), formulaire en carte, validations par champ avec les schémas partagés, erreurs du serveur, chargements, afficher/masquer le mot de passe, lien expiré.
- Pages privées derrière la garde : sans session, retour à la connexion puis à la page demandée (adresse interne seulement) ; session perdue → retour à la connexion avec un message.
- Réglages : compte (e-mail), se déconnecter, mot de passe, sauvegarde (restaurer), zone sensible. En-tête : « Se déconnecter ».

#### Tests

Serveur : inscription (validation, doublon, hash, cookie), connexion (bonne, mauvaise, e-mail inconnu, blocage), session (absente, fausse, ancien en-tête, expirée, déconnexion), mot de passe oublié (lien unique, expiré, remplacé, sessions fermées), activation d'un ancien compte (données conservées), cookie `Secure`, compte (prénom, mot de passe, suppression, export, restauration, réinitialisation), isolation par identifiant (lecture, modification, suppression). Interface : connexion, inscription, oubli, nouveau mot de passe, routes protégées, client API (aucun identifiant envoyé). 451 tests au total.

#### Critères de validation

- [x] `npm run verifier` passe (451 tests).
- [x] Parcours réel sur les serveurs de développement avec des comptes jetables (créés puis supprimés) : inscription → mise en route, connexion refusée puis acceptée, retour à la page demandée, session gardée au rechargement, déconnexion, suppression ; ton compte `oussama` est intact (non activé).
- [x] Vérifié à 1342 px et 375 px.

### Bilan du lot 24 — Comptes fiables et e-mails

> Ancien fichier `docs/lots/Lot-24-comptes-emails.md`.

> Phase 6 — Finalisation fonctionnelle. Décidé par l'étude de marché du 12/10/2026 (`docs/etude/Etude-marche-2026-10.html`). Dépend du lot 23.

#### 1. Objectif

Qu'une adresse e-mail soit **prouvée** (celle du propriétaire du compte) et que les messages du produit soient **envoyables pour de vrai**, pour qu'un client qui oublie son mot de passe retrouve son compte.

#### 2. Analyse de l'existant

- Inscription, connexion, mot de passe oublié par lien, changement de mot de passe : faits au lot 23.
- Envoi : `lib/messagerie.ts` sait envoyer par SMTP (nodemailer) ou écrire dans le journal ; messages en texte brut seulement.
- Le changement d'e-mail (ajouté le 12/10/2026) s'appliquait tout de suite, sans preuve que la nouvelle adresse existe : un e-mail tapé de travers aurait enfermé le compte dehors.
- Rien ne supprimait les sessions et liens expirés.

#### 3. Règles

- Une adresse est **confirmée** quand son propriétaire a ouvert un lien reçu à cette adresse. `Utilisateur.emailVerifieLe` le dit.
- Le lien est à **usage unique**, valable **24 heures** ; seule son empreinte SHA-256 est en base (table `JetonEmail`, type `verification` ou `changement`). Un nouveau lien du même type remplace l'ancien.
- **Inscription** : un lien part vers l'adresse. Un envoi raté ne bloque pas l'inscription (le lien se redemande).
- **Accès sans confirmation** : l'app reste utilisable ; un bandeau rappelle de confirmer, avec « Renvoyer le lien ». Rien n'est bloqué : le but est de ne pas perdre un nouvel utilisateur sur un message en spam.
- **Changer d'e-mail** : mot de passe exigé, adresse libre et différente ; un lien part vers la **nouvelle** adresse ; l'adresse ne change qu'à son ouverture, et elle est alors confirmée. Tant que le lien n'est pas ouvert, l'ancienne reste l'identifiant. Si un autre compte a pris l'adresse entre-temps, l'ouverture est refusée (409).
- Un lien de vérification ne vaut que pour l'adresse à laquelle il a été envoyé : si l'adresse du compte a changé depuis, il est refusé.
- Choisir un mot de passe par le lien « oublié » confirme l'adresse (le lien est arrivé à cette adresse). `npm run compte:activer` la confirme aussi (l'opérateur du serveur en répond).
- **Limites** : 3 envois de lien par heure et par compte (renvoi et changement) ; mêmes limites de mot de passe qu'au lot 23.
- **Purge** : sessions, liens de mot de passe et liens d'e-mail expirés supprimés au démarrage, puis toutes les heures.

#### 4. Livré

- Migration `20261015080000_verification_email` : colonne `emailVerifieLe`, table `JetonEmail`. Aucune donnée modifiée.
- Serveur : `POST /auth/email/verification` (public, le lien s'ouvre depuis n'importe quel appareil), `POST /compte/email/renvoi`, `PUT /compte/email` (devient une demande, réponse 202), `Utilisateur.emailVerifie`.
- E-mails en texte **et** HTML (`lib/gabarits.ts`) : confirmation d'adresse, confirmation de la nouvelle adresse, mot de passe oublié. HTML en tableaux et styles en ligne, texte échappé, lien repris en clair sous le bouton.
- Interface : page `/email/verification` (confirmée, lien expiré, adresse prise, erreur), bandeau « Confirme ton adresse » avec renvoi, carte Réglages › E-mail de connexion (Confirmé / À confirmer, renvoi, demande de changement).
- README : § « E-mails en production » (fournisseur, `SMTP_URL`, SPF, DKIM, DMARC).

#### 5. Tests

- Serveur (`email.test.ts`, `messagerie.test.ts`) : lien d'inscription (texte, HTML, jeton non stocké en clair), usage unique, lien expiré ou inventé, renvoi (remplace l'ancien, refusé si confirmé, 3 par heure), mot de passe oublié et activation qui confirment, changement (mot de passe, doublon, identique, rien avant le clic, ancienne adresse refusée après, adresse prise entre-temps, lien d'une ancienne adresse), purge, envoi SMTP simulé, journal sans SMTP, échappement du gabarit.
- Interface : page de confirmation (un seul appel, quatre états), bandeau (renvoi, absent si confirmée), changement d'e-mail dans Réglages.
- 467 tests au total (partage 22, moteur 170, serveur 116, interface 159).

#### 6. Vérification dans le navigateur (serveurs de développement, compte « Essai » supprimé ensuite)

Inscription → bandeau sur la mise en route → « Renvoyer le lien » (204) → lien ouvert : « Adresse confirmée », bandeau disparu, Réglages « Confirmé » → changement d'e-mail : 202, adresse inchangée avant le clic → lien ouvert : adresse remplacée, confirmée → lien inventé : « Lien expiré » à 375 px.

#### 7. Critères de validation

- [x] `npm run verifier` passe (467 tests).
- [x] Parcours complet dans le navigateur.
- [ ] **Messages reçus dans une vraie boîte, hors spam, avec SPF, DKIM et DMARC valides** : impossible tant qu'aucun fournisseur d'envoi ni nom de domaine n'est configuré. À faire par toi au moment de choisir le domaine (`prod.md` § 8.4), puis à rejouer avant la bêta (lot 28). Le code d'envoi SMTP est testé avec un transport simulé, jamais avec un vrai serveur.

#### 8. Reporté

- Blocage des fonctions tant que l'adresse n'est pas confirmée : écarté (voir règles).
- Rappels par e-mail, double authentification : après le lancement.

### Bilan du lot 25 — Épargne synchronisée

> Livré le 15/10/2026, à valider.

#### Diagnostic

- Le versement mensuel de l'objectif Moto (4 000 DH) était bien enregistré (`Objectif.versementMensuel`) et déjà compté par le moteur : épargne prévue du mois (`epargneDuMois`), bilan, cumul de fin de mois, projections. Aucune donnée n'était perdue.
- Mon plan › Épargne n'affichait que le réel (comptes et mouvements). Sans compte d'épargne déclaré, le solde valait 0, les 9 000 DH déjà mis de côté (`montantInitial`) apparaissaient « réservés en trop », et le bouton « + Verser » était désactivé : le versement prévu ne pouvait jamais devenir réel.
- Après une écriture (dépense, charge, revenu, salaire), seules quelques vues étaient rechargées : Objectifs, Épargne, simulateur ou Aujourd'hui pouvaient afficher des chiffres anciens.

#### Règles

- Sans compte déclaré, le solde réel est **inconnu**, pas nul : `EtatEpargne.declare = false`, pas de dépassement ; l'épargne des objectifs reste comptée. Alerte « Compte d'épargne à déclarer » ; le formulaire propose comme solde l'épargne déjà réservée, à confirmer par l'utilisateur.
- Le plan du mois (versement mensuel de chaque objectif, versé, reste à verser) vient de la même fonction que le bilan et le cumul (`epargneDuMois`). Un versement noté le rend réel ; rien n'est supposé versé automatiquement.
- Alerte « Versement « X » à faire » tant que le versement prévu du mois n'est pas noté (sauf mois clôturé).
- L'achat d'un objectif consomme toujours son épargne (mouvement `achat`, jamais une dépense) : comportement inchangé, vérifié.
- Toute écriture financière recharge toutes les vues du compte (`ui/src/lib/actualisation.ts`).

#### Tests

- Moteur : compte non déclaré (solde inconnu, pas de dépassement), alertes `epargneNonDeclaree` et `versementPrevu`, rien pour un mois clôturé. Partage : textes des deux alertes.
- Serveur : parcours complet sans compte → compte déclaré → versement noté ; mêmes chiffres dans l'épargne, l'objectif et le bilan du mois.
- Interface : plan du mois et « Noter » pré-rempli ; invitation à déclarer le compte avec le solde proposé.
- Navigateur (compte « Essai » supprimé ensuite) : Moto 9 000 DH + 4 000 DH par mois → compte déclaré à 9 000 DH → versement noté → épargne 13 000 DH partout.

### Bilan du lot 26 — Objectifs : vue annuelle

> Livré le 15/10/2026, à valider.

- **Moteur** : `anneeDesObjectifs` (`packages/moteur/src/objectifsAnnee.ts`) assemble l'année à partir de l'analyse déjà faite pour la page (mêmes projections, même répartition) : épargné réel à la fin des mois passés, jonction aujourd'hui, projection réaliste jusqu'en décembre ; totaux (cible, épargné, restant, progression), objectifs à risque (date non tenue en réaliste), versé depuis janvier, fin d'année par scénario, et par objectif début d'année, aujourd'hui, fin d'année et mois atteint dans l'année. La courbe commence au mois du premier objectif si celui-ci est né dans l'année.
- **API** : `GET /objectifs` renvoie `annee` (une seule analyse pour la liste et la vue annuelle).
- **Interface** : la vue « Calendrier de l'année » est retirée (elle reste dans la page Année) ; indicateurs en tuiles, carte « Année » avec trajectoire et chiffres, « Prochaines actions » (alertes d'épargne et leviers chiffrés), liste par priorité avec la fin d'année de chaque objectif ; la carte de chaque objectif garde son lien vers le détail, ses boutons de priorité et son menu.
- **Tests** : moteur (passé réel, futur projeté, objectif créé en cours d'année, pause, cohérence avec les projections de la page, à risque, aucun objectif), serveur (vue annuelle = liste), interface (indicateurs, carte de l'année, actions filtrées, versement pré-rempli, lien du détail).

### Bilan du lot 27 — Aujourd'hui : tableau de bord

> Livré le 15/10/2026, à valider.

- **Moteur** : `tableauDeBord` (`packages/moteur/src/aujourdhui.ts`) part du bilan du mois : un poste par charge (fixe, enveloppe, ponctuel, dette, hors plan), prévu et réel, part des revenus prévus, consommation et rythme des enveloppes (dépassée, ou plus de 10 points d'avance sur le mois écoulé) ; les 5 plus grosses dépenses réelles du mois à ce jour.
- **API** : `GET /aujourdhui` renvoie aussi `tableau`, l'état de l'épargne et un résumé des objectifs (mêmes chiffres que la vue annuelle).
- **Interface** : rangée d'indicateurs (revenus reçus, dépensé avec anneau, épargne du mois, objectifs), carte du jour (reste du mois et de la semaine), « À faire » numéroté (paie confirmée sur place, versement prévu pré-rempli), « Où part ton argent » (5 postes, puis les autres), 7 prochains jours ; à droite « À surveiller » (enveloppes et grosses dépenses), suggestions, objectif prioritaire. Sur téléphone, les indicateurs passent à deux par ligne.
- **Composants** (`ui/src/components/premium/`) : `CarteLumineuse` (halo qui suit le pointeur, adapté de Glowing Cards de Lightswind UI, licence MIT), `AnneauProgression`, `TuileIndicateur`. Le compteur animé des montants existait déjà (`Montant anime`, équivalent du Count Up de Lightswind). Aucune dépendance ajoutée.
- **Tests** : moteur (ordre et part des postes, enveloppes à surveiller, grosses dépenses jamais futures, mois vide), serveur (postes, grosses dépenses, résumé des objectifs), interface (indicateurs, postes et « voir les autres », à surveiller, versement pré-rempli).
- **Vérifié** à 1342 px et 375 px, sans défilement horizontal.

