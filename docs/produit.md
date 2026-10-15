# MySalary — Produit

Ce document réunit le **contexte produit** (pourquoi MySalary existe, ses règles métier R1…) et le **plan** (décisions, architecture, données, logique du moteur, sécurité, tests, positionnement SaaS). Les renvois du code et des autres documents s’écrivent « produit.md (Contexte) R27 » ou « produit.md (Plan) § 7.1 ».

## Sommaire

- [Partie Contexte](#partie-contexte)
- [Partie Plan](#partie-plan)

## Partie Contexte

> Ancien fichier `context.md`. Titre d’origine : « MySalary — Contexte produit ».

> Ce document décrit **pourquoi** MySalary existe et **comment** il raisonne.
> Le plan de réalisation est dans `produit.md (Plan)`. Les parcours dans `ux-ui.md (UX)`. Le style dans `ux-ui.md (UI)`.

---

### 1. Le problème

Un salarié avec un salaire fixe et des primes irrégulières ne sait pas répondre vite à ces questions :

- Combien il me reste vraiment ce mois-ci ?
- Est-ce que je tiens mon budget cette semaine ?
- Combien je peux mettre de côté sans me mettre en difficulté ?
- Quand pourrai-je acheter ce que je vise ?
- Si je reçois une prime, qu'est-ce que ça change ?

Aujourd'hui, la réponse passe par des tableaux faits à la main. L'ancienne étude « Moto & SaaS » le montre :

- elle a demandé un gros travail manuel ;
- elle est figée à une date ;
- elle mélange chiffres connus, hypothèses et projections ;
- elle contient des contradictions avec l'ancienne app (salaire, prix de la moto, épargne de départ).

Les apps de budget classiques ne règlent pas ce problème. Elles suivent les dépenses, mais raisonnent mal sur :

- le salaire versé en fin de mois qui **finance le mois suivant** ;
- les **primes** dont on ne connaît ni le montant ni la date exacte ;
- les **objectifs** à date avec plusieurs scénarios.

---

### 2. Les utilisateurs

#### Utilisateur principal (v1)

Un salarié au Maroc, revenus en dirhams (MAD).

- Salaire fixe net mensuel, versé à date fixe (ex. le 28).
- Primes ponctuelles ou périodiques, parfois connues, parfois estimées.
- Charges mensuelles modestes et lisibles : téléphone, abonnements, sport, aide familiale.
- Engagements ponctuels : dette envers un proche, assurance annuelle, permis.
- Un ou plusieurs objectifs d'achat importants (moto, voiture, voyage, ordinateur).
- Un projet à côté (ex. SaaS) qui pourra un jour générer un revenu.

Ce qu'il attend : **voir clair**, **décider**, **se sentir en contrôle**. Pas de jargon, pas de conseil d'investissement.

#### Comptes

Plusieurs comptes peuvent exister dans la base. Chaque compte a ses propres données, totalement séparées. Il n'y a pas de mot de passe en v1 : on choisit son profil au lancement.

#### Utilisateurs futurs

- Salariés avec revenus variables importants (commerciaux, primes trimestrielles).
- Freelances avec revenus irréguliers (le modèle « source + certitude » le permet déjà).

---

### 3. Les objectifs du produit

1. Rendre la situation **lisible en quelques secondes**.
2. Remplacer les tableaux manuels par un **moteur fiable et testé**.
3. Comparer en continu **prévu et réel**.
4. Donner une **date** pour chaque objectif, avec un niveau de risque honnête.
5. Proposer des **actions concrètes**, jamais des promesses.

---

### 4. Comment ça fonctionne

#### 4.1 La boucle

```text
1. Je décris mon plan     → revenus, charges, dettes, objectifs (prévu)
2. Je vis mon mois        → je confirme le salaire, je note mes dépenses (réel)
3. Le moteur compare      → écarts, reste, épargne, tendance
4. Le moteur projette     → dates d'objectifs, scénarios (projeté)
5. Il propose             → recommandations
6. Je clôture le mois     → le réel est figé, le mois suivant commence
```

#### 4.2 Le prévu se confirme

Le plan génère des événements attendus : salaire du 28, charge téléphone du 5, échéance de dette.

Quand l'événement arrive, l'utilisateur le **confirme** en un geste, ou corrige le montant. Il ne ressaisit rien.

C'est ce qui rend le suivi tenable au quotidien.

#### 4.3 Le salaire et le cycle de paie

C'est la règle centrale. La V0 la gérait mal (décalage manuel d'un mois). MySalary la modélise avec trois notions simples.

| Notion | Définition | Exemple |
|---|---|---|
| **Contrat** | Ce qui est habituel : salaire net, jour de versement. | 10 000 DH, le 27 de chaque mois. |
| **Paie** | Ce qui arrive vraiment, chaque mois : date et montant réels, primes comprises. | Reçue le 27/12/2026 : 10 000 DH + prime 1 000 DH. |
| **Mois budgétaire** | La période que cette paie finance, jusqu'à la paie suivante. | « Janvier 2027 » = du 27/12/2026 au 26/01/2027. |

Comment ça se passe :

1. Le contrat génère chaque mois une paie **prévue**.
2. Le jour venu, l'utilisateur la **confirme** (date et montant réels).
3. La date réelle fixe le début du mois budgétaire. La paie suivante fixe sa fin.
4. Si une paie arrive en avance ou en retard, les mois voisins se redécoupent seuls.
5. Une augmentation crée une nouvelle version du contrat. Le passé ne bouge pas.

Toutes les vues (semaine, mois, année, objectifs) utilisent ce même découpage. Il n'y a qu'une seule règle de rattachement.

Un utilisateur payé le 1er peut choisir le mode calendaire (mois civil).

#### 4.4 Trois natures de chiffres

| Nature | D'où vient-il ? | Peut-il changer ? | Affichage |
|---|---|---|---|
| Réel | Saisi ou confirmé | Seulement par l'utilisateur | Plein |
| Prévu | Le plan de l'utilisateur | Quand le plan change | Contour |
| Projeté | Calcul du moteur + hypothèses | À chaque recalcul | Hachuré + mention « projection » |

Un total qui mélange plusieurs natures l'indique toujours (ex. « 6 200 DH dont 4 100 réels »).

#### 4.5 La certitude des revenus

Chaque revenu prévu a un niveau :

- **Garanti** : salaire fixe, prime contractuelle.
- **Probable** : prime habituelle, non écrite.
- **Incertain** : prime variable, revenu SaaS futur.

Les scénarios s'appuient dessus :

- **Prudent** : garanti seulement.
- **Réaliste** : garanti + probable.
- **Ambitieux** : tout.

---

### 5. Règles métier

#### Revenus
- R1. Un revenu a une source, un montant, une fréquence, une date, une certitude.
- R2. Fréquences : mensuelle, trimestrielle, annuelle, ponctuelle, mois choisis.
- R3. Un revenu reçu (réel) peut être lié à une source prévue ou être libre.
- R4. Si le montant reçu diffère du prévu, l'écart est affiché, le prévu n'est pas modifié.
- R5. Un revenu futur hypothétique (ex. SaaS) n'entre jamais dans le scénario réaliste par défaut.

#### Charges et dépenses
- R6. Charge **fixe** : montant et date connus (téléphone, abonnement).
- R7. **Enveloppe** : budget flexible sur la période (nourriture, transport, loisirs), réparti par semaine.
- R8. Charge **ponctuelle** : événement daté unique (assurance de décembre, permis).
- R9. **Dette** : total + échéancier. Elle disparaît des prévisions une fois soldée.
- R10. Une dépense réelle peut être liée à une charge prévue. Sinon elle s'impute à une enveloppe ou à « hors plan ».
- R11. L'épargne et les versements aux objectifs ne sont **jamais** des dépenses.

#### Épargne
- R12. **Solde déclaré** : ce que l'utilisateur a réellement de côté.
- R13. **Réservé** : la part attribuée aux objectifs.
- R14. **Disponible** = solde déclaré − réservé. Ne peut pas être négatif ; sinon une alerte demande de réajuster.
- R15. **Capacité d'épargne** d'une période = revenus − charges (prévus ou réels selon la vue).

#### Objectifs
- R16. Un objectif a une cible, un montant initial, une priorité, et optionnellement une date et un versement mensuel.
- R17. Le moteur calcule : restant, progression, effort nécessaire, date estimée par scénario, risque de retard.
- R18. La capacité est répartie par priorité. La somme des versements ne dépasse jamais la capacité.
- R19. Un objectif réalisé consomme son épargne. L'achat n'est pas compté une seconde fois.
- R20. Deux objectifs liés (moto et permis) restent séparés pour éviter le double comptage.

#### Périodes
- R21. Une période passée peut être **clôturée** : son réel est figé dans un instantané.
- R22. Une période clôturée peut être rouverte, avec trace.
- R23. La période en cours combine réel à date et prévu restant.

#### Recommandations
- R24. Chaque recommandation affiche sa base de calcul et ses hypothèses.
- R25. Aucune formulation de garantie. Toujours une condition.
- R26. Pas de conseil d'investissement personnalisé.

#### Salaire
- R27. Le contrat de salaire est versionné ; un changement ne modifie jamais les paies passées.
- R28. Une paie est prévue jusqu'à confirmation ; la date réelle confirmée fixe les bornes des mois budgétaires.
- R29. Le mois financé est proposé (mois suivant la date de paie) et reste modifiable.
- R30. Le jour de la paie appartient au nouveau mois budgétaire.

---

### 6. Données

#### Ce qui est collecté

| Domaine | Données |
|---|---|
| Profil | Prénom, devise (MAD), jour de paie, mode de période. |
| Revenus | Salaire fixe, primes (montant, fréquence, mois, certitude), revenus variables, autres revenus. |
| Charges | Crédits, dettes, abonnements, assurances, aide familiale, télécoms, sport, enveloppes flexibles, ponctuelles connues. |
| Épargne | Solde actuel, montants déjà réservés. |
| Objectifs | Nom, type, cible, déjà disponible, date souhaitée, priorité, versement souhaité. |
| Réel | Revenus reçus, dépenses, paiements de dette, versements aux objectifs. |

#### Ce qui n'est pas collecté
- Identifiants bancaires, numéros de compte ou de carte.
- Données d'identité.
- Données de localisation.

#### Données existantes
L'ancien export money-guru et l'étude HTML contiennent des chiffres **contradictoires** (voir `produit.md (Plan)` § 2.1).

Ils servent de **V0** : une source d'idées, pas une logique à reprendre.

L'onboarding propose de les **importer**. L'import propose chaque ligne ; l'utilisateur importe, modifie ou ignore. Tout ce qui est importé reste **prévu** tant qu'il n'est pas confirmé. Le détail est dans `produit.md (Plan)` § 7.1 bis.

---

### 7. Contraintes

- **Fiabilité** : un calcul faux détruit la confiance. Le moteur est isolé et testé.
- **Simplicité** : l'utilisateur doit s'en servir en moins d'une minute par jour.
- **Confidentialité** : données locales, séparées par compte, aucun service tiers.
- **Thème** : clair uniquement, interface du template `Templates/image.png`.
- **Honnêteté** : jamais de projection présentée comme certaine. Jamais de donnée fictive présentée comme réelle.
- **Précision** : centimes entiers, dates civiles, pas de fuseau sur une date de paie.
- **Langue** : interface en français, montants au format `10 000 DH`.

---

### 8. Direction produit

- **Calme** : pas d'alerte rouge partout. Une couleur d'alerte seulement quand une action est utile.
- **Utile avant d'être riche** : chaque écran répond à une question précise.
- **Le réel d'abord** : le prévu sert à comparer, la projection sert à décider.
- **Premium** : finesse visuelle, animations douces, aucune surcharge.
- **Évolutif** : un moteur pur et des données typées permettent d'ajouter des fonctions sans tout casser.

---

### 9. Vision future

À envisager après la v1, si l'usage le confirme :

- Application mobile (PWA puis native).
- Authentification par mot de passe, puis partage (couple, famille).
- Import de relevés bancaires (CSV) avec rapprochement automatique.
- Méthodes de répartition (50/30/20, pourcentages personnalisés comme l'ancienne app).
- Suivi du patrimoine (liquide, créances, investi).
- Suivi d'un projet générateur de revenu (ex. SaaS) : seuil de rentabilité, revenus réels affectés à un objectif.
- Rendement d'épargne, uniquement si l'utilisateur le saisit lui-même.

---

## Partie Plan

> Ancien fichier `Plan.md`. Titre d’origine : « MySalary — Plan ».

> Plan global de l'application : vision, fonctionnalités, architecture, données, logique métier, pages, sécurité, tests.
> **La progression (lots, statut, sommaire, points reportés) est suivie dans `docs/lots.md`.** Bilan détaillé de chaque lot livré : docs/lots.md (§ 8).
> Documents liés : `produit.md (Contexte)` (produit), `ux-ui.md (UX)` (parcours), `ux-ui.md (UI)` (direction artistique).

### 0. Décisions validées (07/10/2026)

| # | Sujet | Décision |
|---|---|---|
| 1 | Skill UI | La skill **UI-Stealer** est déposée. Elle est analysée en § 2.2 et appliquée dans `ux-ui.md (UI)`. |
| 2 | Ancienne app | money-guru / l'étude HTML = **V0**, simple source d'idées. On repart sur une logique neuve et une structure claire. |
| 3 | Période | **Cycle de paie**, paie **fixe le 27**. La paie du 27 janvier finance « Février » : du 27/01 jusqu'à la paie suivante (27/02, exclu). Le jour de paie appartient au nouveau mois. |
| 4 | Données de départ | **Onboarding avec import** de l'ancien fichier. Base de données avec données **par utilisateur**. |
| 5 | Comptes | **Comptes utilisateurs en base**, **sans authentification** pour l'instant. |
| 6 | Thème | **Clair uniquement**. Pas de thème sombre. |
| 7 | Avancement | Suivi des lots dans `docs/lots.md`, bilans dans docs/lots.md (§ 8). |
| 8 | Interface | **Identique au template** `Templates/image.png` (barre du haut, cartes, bandeau, tableau en champs), sauge à la place du violet. Le style maison de la skill (rail en verre, fenêtre, serif, nacré) est abandonné. |
| 9 | Week-end (07/10/2026) | Une paie qui tombe un samedi ou un dimanche arrive le **lundi suivant** (le virement passe par la banque). Réglable dans le contrat. |
| 10 | Mois d'une prime (07/10/2026) | Le mois d'une prime ou d'un revenu est le **mois civil où l'argent arrive**. |
| 11 | Dépôt de code (08/10/2026) | Dépôt **privé** `github.com/oussamaalmouallim/mysalary`. Commits en anglais, au nom de l'auteur. `Salaire/`, la base, `.env` et `.claude/` ne sont jamais versionnés. |
| 12 | Comptes (12/10/2026) | La décision 5 est remplacée : **comptes par e-mail et mot de passe**, sessions par cookie (lot 23). |
| 13 | Produit (12/10/2026) | MySalary devient un **SaaS** commercialisé auprès des salariés, d'abord au Maroc. Positionnement, périmètre de lancement et lots restants : § 15 et `docs/etude/Etude-marche-2026-10.html`. |

---

### 1. Vision

MySalary est un assistant financier personnel centré sur le salaire.

Il répond à une seule chaîne de questions :

**combien je gagne → combien je dépense → combien je peux épargner → où va mon argent → où j'en suis → quand j'atteins mes objectifs.**

Il fonctionne sur quatre horizons : semaine, mois, année, plusieurs années.

Il sépare toujours trois natures de chiffres :

| Nature | Définition | Exemple |
|---|---|---|
| **Réel** | Saisi ou confirmé par l'utilisateur. | « J'ai reçu 10 000 DH le 28 septembre. » |
| **Prévu** | Planifié par l'utilisateur. | « Mon salaire est de 10 000 DH, versé le 28. » |
| **Projeté** | Calculé par le moteur à partir d'hypothèses. | « À ce rythme, objectif atteint en mai 2027. » |

---

### 2. Résultat de l'analyse des ressources

#### 2.1 Ancienne simulation (`Salaire/`) — la V0

Ces fichiers sont une **V0** : ils donnent l'idée, pas la logique. MySalary est reconstruit avec une logique neuve.

Deux fichiers :

- **Étude financière Sept. 2026 → Déc. 2027 (HTML)** : une étude statique avec un petit simulateur. Objectif moto 85 000 DH, salaire 10 000 DH versé le 28, primes ponctuelles, dette Mohamed 8 500 DH, dépenses détaillées mois par mois, piste SaaS.
- **money-guru-2026-09-24.json** : l'export d'une ancienne app. Profil, dépenses par mois, allocation en pourcentages, objectifs (moto, permis), journal d'achats, onboarding en 7 étapes.

Ce qu'on garde comme **besoins** :

1. Le salaire du 28 **finance le mois suivant**. C'est la règle la plus importante. Elle impose un « cycle de paie » configurable.
2. Profil **salaire fixe + primes irrégulières** (septembre +5 000, février +3 500, mars +1 000, juin +1 000).
3. Une **dette** est un total avec un échéancier, pas une charge mensuelle infinie.
4. Des **charges ponctuelles connues** (assurance annuelle en décembre, permis en janvier).
5. Un **cumul d'épargne** mois par mois, comparé à un objectif.
6. Un **levier** clair : « si je ne dépense pas mon budget fun, que se passe-t-il ? ».
7. Une séparation explicite entre **données chiffrées** et **hypothèses à confirmer** (l'étude le faisait déjà avec des badges).
8. Plusieurs **objectifs** avec date cible et versement mensuel.
9. Une **dépense d'objectif** (achat de la moto) ne doit pas être comptée deux fois.

Ce qu'on **ne reprend pas** :

| Problème constaté | Décision pour MySalary |
|---|---|
| « Savings » (400 DH) rangé dans les dépenses. | L'épargne n'est jamais une dépense. C'est une affectation. |
| Libellés codés en dur (Mohamed, Yahya, Netflix…) dans le calcul. | Tout est donnée utilisateur. Le moteur ne connaît aucun nom. |
| Dépenses recopiées dans chaque mois du JSON. | Une charge récurrente est définie une fois, avec fréquence et dates. |
| Tableau HTML qui mélange « mois de paie » et « mois de dépense ». | Chaque montant est rattaché à une période calculée par une seule règle. |
| Allocation en pourcentages (49/18/12/8/8/5) peu lisible. | Pas en v1. Remplacée par des objectifs priorisés. Peut revenir plus tard comme « méthode ». |
| Rendement annuel 6 % sur l'épargne. | Hors v1. Aucun rendement n'est supposé par défaut. |

Incohérences entre les deux sources. **Aucune n'est importée sans confirmation** :

| Donnée | HTML | JSON |
|---|---|---|
| Revenu mensuel | 10 000 DH | `revenuNet` 5 600 DH ; 3 200 DH de janv. à juil. 2026 |
| Prix moto | 85 000 DH | 86 000 DH |
| Déjà mis de côté pour la moto | 0 DH | 28 000 DH |
| Permis moto | 3 000 DH | 3 000 DH (objectif) puis 4 000 DH (journal) |
| Aide aux parents | 1 000 DH | 500 à 1 000 DH selon les mois |
| Netflix 35 DH | présent | absent |
| Prime variable mensuelle | inconnue, mise à 0 | absente |

#### 2.2 Skills (`Skills/`)

Skill disponible : **UI-Stealer** (nom interne `melko-ui-from-image`). Elle construit un front React à partir d'une image de design, habillé d'un style maison.

Ce qu'elle apporte, et ce qu'on en fait :

| Élément de la skill | Décision MySalary |
|---|---|
| Garder la **structure** de l'image, changer la **palette** | Repris. Palette = sauge `#7D8C82`, pas le violet du template, ni la charte Melko. |
| Style maison (fenêtre, rail en verre, Inter + Instrument Serif, blobs) | **Abandonné** le 07/10/2026 : l'interface doit être identique au template. |
| Animations douces : cascade, spring, fondus entre vues, blobs d'ambiance lents | Repris, avec un bouton « animations off » et `prefers-reduced-motion`. |
| **Champ premium** (liseré dégradé qui s'illumine, bouton en dégradé) | Adapté : champ de saisie rapide d'une dépense et champ « Pose ta question » du simulateur. |
| Stack testée : React 18, Vite 5, Tailwind 3.4, framer-motion 11, TanStack Query | Reprise telle quelle (versions qui marchent ensemble). |
| Nommage **français** en PascalCase (`BarreLaterale`, `ZoneHeros`) | Repris pour toute l'interface et le domaine. |
| Vérifier par DOM, styles calculés, build et tests (pas par captures) | Repris dans la stratégie de tests. |
| Mascotte, vue conversation, scripts `.bat` Windows, ports Melko, double remote GitHub | **Non repris** : hors sujet (app finance, poste macOS, projet personnel). |

Détail complet dans `ux-ui.md (UI)` § 1.

#### 2.3 Templates (`Templates/`)

**Un seul template** : une capture d'écran d'une app de facturation « Paypay » (page « Edit invoice »). Il n'y a pas de code source.

C'est donc le template retenu, par défaut. Il est bon comme base :

- interface claire, aérée, cartes blanches très arrondies ;
- une **carte héro** colorée en dégradé avec formes décoratives ;
- un gros montant mis en avant (« Amount Due ») ;
- des boutons teintés doux et un bouton principal plein ;
- une navigation horizontale simple.

Limites : il n'a **pas d'effet glass**, pas de graphiques, pas de tableau dense. Ces éléments sont définis dans `ux-ui.md (UI)` dans le même esprit.

---

### 3. Objectifs du produit

1. Savoir en **5 secondes** ce qu'il reste à dépenser cette semaine et ce mois.
2. Comparer **prévu et réel** chaque mois, sans calcul manuel.
3. Savoir **quand** chaque objectif sera atteint, selon trois scénarios.
4. Recevoir des **recommandations** concrètes et prudentes.
5. Ne jamais confondre un chiffre réel, un chiffre prévu et une projection.

Non-objectifs v1 : connexion bancaire, multi-devises, investissement boursier, budget de couple, impôts.

---

### 4. Fonctionnalités

| Domaine | Fonctionnalités v1 |
|---|---|
| Comptes | Inscription par e-mail et mot de passe, sessions, mot de passe oublié, changement d'e-mail et de mot de passe, suppression ; données isolées par compte (lot 23). Vérification de l'e-mail : lot 24. |
| Onboarding | Import V0 (optionnel), profil, salaire et cycle de paie, primes, charges, dettes, épargne actuelle, premier objectif. |
| Salaire | Contrat versionné, paie mensuelle prévue puis confirmée (date et montant réels), primes sur la paie, mois budgétaire de paie à paie. |
| Autres revenus | Primes versées à part (ponctuelles, mensuelles, trimestrielles, annuelles), revenus variables, certitude (garanti / probable / incertain), confirmation de réception. |
| Charges | Charges fixes récurrentes, enveloppes flexibles (nourriture, transport, loisirs), charges ponctuelles planifiées, dettes avec échéancier. |
| Dépenses réelles | Saisie rapide, catégorie, rattachement à une charge prévue, confirmation « payé ». |
| Épargne | Solde déclaré (ou « non déclaré » : solde inconnu), montant réservé aux objectifs, montant disponible, versements ; versements prévus du mois (versement mensuel de chaque objectif), versé et reste à verser, notés en un clic (lot 25). |
| Suivi semaine | Budget flexible de la semaine, dépensé, reste, écart, tendance. |
| Suivi mois | Prévu vs réel par ligne, épargne prévue vs réelle, clôture du mois. |
| Suivi année | Totaux, mois les plus coûteux, évolution revenus / épargne, progression des objectifs. |
| Objectifs | Plusieurs objectifs, priorité, versements, date estimée, risque de retard, achat réalisé. Vue annuelle de tous les objectifs : indicateurs, trajectoire de l'année, fin d'année par scénario, prochaines actions (lot 26). |
| Simulation | Scénarios prudent / réaliste / ambitieux, « et si » (prime, versement, réduction de dépense). |
| Recommandations | Montant à épargner par mois / semaine, dépense à réduire, impact d'une prime, faisabilité. Alertes « versement prévu à noter » et « compte d'épargne à déclarer » (lot 25). |
| Aujourd'hui | Tableau de bord du mois : quatre chiffres (reçu, dépensé, reste à payer, épargné), « Reste du mois, avant épargne » (sans l'épargne, dit clairement), reste de la semaine, à faire, postes qui pèsent le plus, enveloppes à surveiller, grosses dépenses, 7 prochains jours (lot 27). |
| Calendrier | Salaire, primes, charges, échéances de dette, objectifs, événements futurs. |
| Données | Export / import JSON, sauvegarde. |

---

### 5. Architecture technique

#### 5.1 JavaScript ou TypeScript ?

| Critère | JavaScript | TypeScript |
|---|---|---|
| Démarrage | Plus rapide | Légèrement plus long |
| Erreurs sur les montants, dates, natures | Vues à l'exécution | Vues à l'écriture |
| Partage moteur ↔ API ↔ front | Contrats implicites | Types partagés, un seul contrat |
| Refactor du moteur | Risqué | Sûr |
| Validation | Zod seul | Zod + types déduits |

**Choix : TypeScript partout** (front, API, moteur). Une app financière vit de règles précises. Les types empêchent de mélanger « réel » et « projeté » ou centimes et dirhams.

#### 5.2 Vue d'ensemble

```text
┌──────────────┐   HTTP JSON    ┌──────────────┐   Prisma   ┌──────────┐
│  ui/         │ ─────────────▶ │  server/     │ ─────────▶ │  SQLite  │
│ React + Vite │  X-Utilisateur │ Fastify (TS) │            └──────────┘
└──────┬───────┘                └──────┬───────┘
       │ import                        │ import
       ▼                               ▼
┌──────────────────────────────────────────────┐
│ packages/moteur   moteur financier pur (TS)  │
│ packages/partage  schémas Zod, types, format │
└──────────────────────────────────────────────┘
```

- **Monorepo** avec workspaces npm (un seul dépôt, plusieurs paquets). Noms `ui/` et `server/` repris de la skill.
- **Le moteur est un paquet pur** : aucune base, aucun React, aucune date « maintenant » implicite. Il reçoit des données, il rend des résultats. Il est testable seul.
- **Le serveur est l'autorité** : il charge les données de l'utilisateur, appelle le moteur, renvoie des résultats.
- **Le front n'invente aucun calcul.** Seul le simulateur appelle le moteur côté navigateur, pour réagir en direct aux curseurs. C'est le même code, pas une copie.
- **Nommage français** (règle de la skill) : composants, modules, entités et fonctions métier en français. Les mots techniques standards (`routes`, `service`, `hooks`) restent tels quels.
- Ports : UI `6010`, serveur `3010` (convention de la skill, créneau libre suivant).

#### 5.3 Structure des dossiers

```text
Mysalary/
├── produit.md (Plan)  produit.md (Contexte)  ux-ui.md (UX)  ux-ui.md (UI)
├── Salaire/  Skills/  Templates/          # ressources d'origine, non modifiées
├── package.json                           # workspaces npm
├── ui/
│   ├── index.html · vite.config.ts · tailwind.config.js · tsconfig.json
│   └── src/
│       ├── main.tsx · App.tsx             # mise en page du template + routes
│       ├── styles/index.css               # base, reduced-motion
│       ├── state/                         # animations.tsx, utilisateur.ts, periode.ts
│       ├── lib/                           # queryClient, api, format (DH), animations (variantes)
│       ├── components/                    # design system
│       │   ├── BarreLaterale · BarreSuperieure · Fenetre · BasculeAnimations
│       │   ├── Carte · CarteHeros · Kpi · Bouton · ChampMontant · Pilule
│       │   ├── BadgeNature · BadgeRisque · BarreProgression · Tableau · Panneau
│       │   └── graphiques/                # thème Recharts commun
│       └── features/                      # un dossier par page
│           ├── profils/  onboarding/  aujourdhui/  mois/  annee/
│           ├── objectifs/  simulateur/  calendrier/  plan/  reglages/
│           └── saisie/                    # SaisieRapide (dépense, revenu, versement)
├── server/
│   ├── prisma/                            # schéma, migrations
│   └── src/
│       ├── modules/
│       │   ├── utilisateurs/  reglages/  salaire/  revenus/  charges/  dettes/
│       │   ├── depenses/  epargne/  objectifs/  periodes/  annee/  tableau-de-bord/
│       │   ├── calendrier/  simulations/  recommandations/  import-export/
│       │   └── <module>/                  # routes.ts · service.ts · depot.ts · schema.ts
│       ├── plugins/                       # base, utilisateur courant, erreurs, sécurité
│       └── server.ts
└── packages/
    ├── moteur/
    │   └── src/
    │       ├── argent.ts                  # centimes, arrondis
    │       ├── periodes.ts                # cycle de paie, découpage des mois budgétaires
    │       ├── semaines.ts
    │       ├── echeancier.ts              # expansion des récurrences
    │       ├── budget.ts                  # période prévue / réelle
    │       ├── annee.ts
    │       ├── objectifs.ts               # ETA, effort, risque, allocation
    │       ├── simulation.ts              # scénarios
    │       ├── recommandations.ts
    │       └── kpi.ts
    └── partage/
        └── src/                           # schémas Zod, enums, DTO, formatage DH
```

#### 5.4 Frontend

Base technique reprise de la skill (versions testées ensemble).

- **React 18 + Vite 5 + TypeScript strict.**
- **Routage** : React Router.
- **Données serveur** : TanStack Query. Cache, invalidation après chaque saisie, états de chargement uniformes.
- **État UI** : Zustand, uniquement pour l'utilisateur courant, la période affichée, le scénario actif. Contexte React pour les animations on/off (recette de la skill).
- **Formulaires** : React Hook Form + Zod (mêmes schémas que le serveur).
- **Style** : Tailwind CSS 3.4, tokens de `ux-ui.md (UI)` dans `tailwind.config.js`.
- **Animations** : framer-motion 11 (variantes partagées : cascade, apparition, transition de vue).
- **Composants** : primitives Radix (accessibles), habillées à la main.

#### 5.5 Backend

- **Node.js 22 + Fastify + TypeScript.** Rapide, validation de schémas native, bon support TS.
- Chaque module : `routes` (HTTP) → `service` (orchestration, appelle le moteur) → `depot` (accès Prisma).
- Validation Zod en entrée **et** en sortie.
- Erreurs normalisées : `{ erreur: { code, message, champs? } }`.

#### 5.6 Stockage

- **Base SQLite via Prisma** en v1 : un fichier, zéro installation, sauvegarde simple.
- **Données par utilisateur** : chaque table métier porte `utilisateurId`. Passage à PostgreSQL possible sans changer le code métier.
- **Montants stockés en centimes entiers** (`Int`). Jamais de nombre à virgule pour l'argent.
- Dates stockées en `YYYY-MM-DD` (date civile). Pas de fuseau sur une date de paie.

#### 5.7 Comptes utilisateurs (historique : remplacé au lot 23)

Décision : des comptes existent en base, mais personne ne se connecte avec un mot de passe pour l'instant.

1. Au lancement, l'écran **Profils** liste les comptes. On en choisit un, ou on en crée un (prénom + devise).
2. Le front garde l'identifiant choisi et l'envoie à chaque requête dans l'en-tête `X-Utilisateur`.
3. Un plugin serveur charge l'utilisateur. Inconnu → erreur 401.
4. **Toutes** les requêtes en base passent par un filtre `utilisateurId`. Aucun accès direct sans ce filtre.
5. Un test automatique vérifie qu'un utilisateur ne voit jamais les données d'un autre.

Limite assumée : sans mot de passe, n'importe qui qui accède à l'app peut changer de profil. Le serveur écoute donc **uniquement en local** (127.0.0.1).

Plus tard (lot sécurité) : mot de passe argon2id + cookie de session httpOnly. L'en-tête est alors remplacé par la session, sans toucher au reste du code.

**Fait au lot 23 (12/10/2026)** : comptes par e-mail et mot de passe (`scrypt`), cookie de session `HttpOnly`, `SameSite=Strict`, `Secure` en HTTPS ; l'en-tête `X-Utilisateur` et l'écran Profils sont supprimés ; le compte courant vient uniquement de la session. Détail : [`prod.md` § 5](prod.md#5-comptes-et-authentification) et [Bilan du lot 23](lots.md#bilan-du-lot-23--nettoyage-authentification-et-multi-utilisateur).

#### 5.8 API (REST, préfixe `/api/v1`)

Toutes les routes, sauf `/utilisateurs`, agissent sur l'utilisateur de l'en-tête.

| Ressource | Routes principales |
|---|---|
| Utilisateurs | `GET/POST /utilisateurs`, `PUT/DELETE /utilisateurs/:id` |
| Réglages | `GET/PUT /reglages` |
| Salaire | `GET/POST /salaire/contrats` (versions du salaire), `GET /salaire/paies?annee=`, `PUT /salaire/paies/:mois` (confirmer, corriger) |
| Primes & autres revenus | `GET/POST /revenus/sources`, `PUT/DELETE /revenus/sources/:id`, `GET /revenus/prevus?du=&au=`, `GET /revenus/resume`, `GET/POST /revenus/recus`, `PUT/DELETE /revenus/recus/:id` |
| Charges & enveloppes | `GET/POST /charges`, `PUT/DELETE /charges/:id` |
| Ponctuels prévus | `GET/POST /ponctuels`, `PUT/DELETE /ponctuels/:id` |
| Dettes | `GET/POST /dettes`, `PUT/DELETE /dettes/:id`, `POST /dettes/:id/paiements` |
| Dépenses réelles | `GET /depenses?mois=` (suivi du mois), `GET /depenses/rattachements?date=`, `POST /depenses`, `PUT/DELETE /depenses/:id` |
| Épargne | `GET/PUT /epargne`, `POST /epargne/mouvements` |
| Objectifs | `GET/POST /objectifs`, `PUT/DELETE /objectifs/:id`, `POST /objectifs/:id/versements`, `POST /objectifs/:id/realiser` |
| Mois budgétaires | `GET /mois/:cle`, `GET /mois/:cle/bilan`, `GET /mois/:cle/semaines`, `POST /mois/:cle/cloturer`, `POST /mois/:cle/rouvrir` |
| Année | `GET /annees/:annee` |
| Tableau de bord | `GET /aujourdhui` |
| Calendrier | `GET /calendrier?du=&au=` |
| Simulations | `POST /simulations/executer`, `GET/POST/PUT/DELETE /scenarios` |
| Recommandations | `GET /recommandations` |
| Données | `GET /export`, `POST /import/apercu`, `POST /import/valider` (V0 money-guru ou export MySalary) |

Toutes les réponses calculées portent la nature de chaque montant (`reel`, `prevu`, `projete`).

---

### 6. Modèle de données

Montants en centimes. Dates civiles. Toutes les tables métier ont `id`, `utilisateurId`, `creeLe`, `modifieLe`.

| Entité | Champs clés |
|---|---|
| **Utilisateur** | `prenom`, `devise` (MAD), `onboardingEtape`, `onboardingTermine` |
| **Reglages** | `modePeriode` (`cyclePaie` \| `calendaire`), `debutSemaine` (lundi), `reportHebdo` (bool), `reglesScenarios` |
| **ContratSalaire** | `montantNet`, `jourHabituel` (1–31), `regleJourNonOuvre` (`avant` \| `apres` \| `aucune`), `financeMoisSuivant` (bool), `moisEffet` (premier mois financé) — une nouvelle version à chaque changement de salaire |
| **Paie** | `moisFinance` (`2027-01`), `datePrevue`, `dateReelle?`, `statut` (`prevue` \| `recue` \| `ecart`) — une par mois budgétaire |
| **LignePaie** | `paieId`, `type` (`salaire` \| `prime`), `libelle`, `montantPrevu`, `montantRecu?`, `certitude` |
| **SourceRevenu** | `libelle`, `type` (`prime` \| `variable` \| `autre`), `montant`, `frequence` (`mensuelle` \| `trimestrielle` \| `annuelle` \| `unique` \| `moisChoisis`), `mois[]`, `versement` (`avecPaie` \| `dateSeparee`), `jour?`, `certitude` (`garanti` \| `probable` \| `incertain`), `debut`, `fin?` |
| **RevenuRecu** | `sourceId?`, `date`, `montant`, `note` — revenu **réel** hors paie |
| **Charge** | `libelle`, `categorieId`, `nature` (`fixe` \| `enveloppe`), `montant`, `frequence`, `jour?`, `debut`, `fin?`, `essentielle` (bool) |
| **Ponctuel** | `libelle`, `categorieId`, `montant`, `date`, `certitude` — charge unique connue (assurance, permis) |
| **Dette** | `libelle`, `creancier`, `montantTotal`, `debut` |
| **EcheanceDette** | `detteId`, `date`, `montant` — **prévu** |
| **PaiementDette** | `detteId`, `date`, `montant` — **réel** |
| **Depense** | `date`, `montant`, `categorieId`, `libelle`, `chargeId?`, `echeance?` (échéance couverte d'une charge fixe), `ponctuelId?`, `note` — dépense **réelle** |
| **Categorie** | `libelle`, `icone`, `groupe` (`essentiel` \| `flexible` \| `engagement`) |
| **CompteEpargne** | `libelle`, `solde`, `auLe` — solde déclaré (réel) |
| **Objectif** | `libelle`, `type` (`achat` \| `securite` \| `investissement` \| `autre`), `montantCible`, `montantInitial`, `dateCible?`, `priorite`, `versementMensuel?`, `statut` (`actif` \| `pause` \| `atteint` \| `realise` \| `abandonne`) |
| **VersementObjectif** | `objectifId`, `date`, `montant` — **réel** |
| **Scenario** | `nom`, `base` (`prudent` \| `realiste` \| `ambitieux` \| `perso`), `ajustements` (primes en plus, versement, réduction, horizon) |
| **ClotureMois** | `cle`, `debut`, `fin` (bornes figées), `clotureLe`, `instantane` (bilan figé, JSON), `forcee`, `nonConfirmees` |
| **JournalCloture** | `cle`, `action` (`cloture` \| `reouverture`), `le`, `nonConfirmees` — trace (R22) |
| **ImportSource** | `type` (`moneyGuruV0` \| `mysalary`), `fichierBrut` (JSON), `importeLe`, `lignes` (décision par ligne) — traçabilité |

Chaque donnée importée garde `origine = import` jusqu'à confirmation.

---

### 7. Logique métier (moteur)

#### 7.1 Salaire et cycle de paie

C'est le cœur du produit. La V0 calculait le salaire « par mois civil » avec un décalage manuel. MySalary le modélise proprement en trois objets.

**1. Le contrat de salaire** — ce qui est habituel.

- Salaire net habituel, jour habituel de versement, règle « finance le mois suivant ».
- Versionné : une augmentation crée une nouvelle version avec sa date d'effet. Le passé ne change pas.

**2. La paie** — ce qui arrive chaque mois.

- Une paie par mois budgétaire. Elle est d'abord **prévue** (générée depuis le contrat), puis **reçue** (confirmée par l'utilisateur).
- Elle contient des lignes : le salaire fixe, et les primes versées sur la même paie.
- À la confirmation, l'utilisateur valide la **date réelle** et le **montant réel** de chaque ligne.
- Les primes versées à part (autre date) sont des revenus séparés, rattachés au mois qui contient leur date.

**3. Le mois budgétaire** — la période de vie financée par une paie.

```text
Paie reçue le 27/12/2026  ─┐
                           ├─▶  « Janvier 2027 » = du 27/12/2026 au 26/01/2027
Paie suivante le 27/01/2027┘     (le 27/01, l'argent de février arrive : début de « Février »)
```

Règles :

- **Début** du mois = date réelle de la paie qui le finance (date prévue tant qu'elle n'est pas reçue).
- **Fin** du mois = veille de la paie suivante (réelle si reçue, sinon prévue).
- Le **mois financé** est proposé automatiquement (mois civil suivant la date de paie) et reste modifiable à la confirmation. Une paie en retard (ex. reçue le 2 janvier) peut donc toujours financer janvier.
- Si la paie arrive plus tôt ou plus tard que prévu, les deux mois voisins sont **redécoupés automatiquement**. Un mois clôturé n'est jamais redécoupé.
- Les mois n'ont donc pas tous la même durée. Le budget hebdo et le « montant par jour » se calculent sur la durée réelle.
- Jour habituel absent (31 en février) ou non ouvré : règle réglable (lundi suivant par défaut : le virement passe par la banque, décision du 07/10/2026).
- **Mode calendaire** (optionnel) : mois du 1er au dernier jour, pour un utilisateur payé le 1er.

**Semaines** : lundi → dimanche, découpées dans le mois budgétaire. Les semaines partielles sont proratisées au nombre de jours.

#### 7.1 bis Import de la V0 (money-guru)

L'import est une étape de l'onboarding. Il **propose**, l'utilisateur **décide** ligne par ligne (importer, modifier, ignorer).

| Donnée V0 | Proposition dans MySalary | Remarque |
|---|---|---|
| `prenom`, `devise` | Profil | — |
| `versementSalaire.jour` (28), `financeMoisSuivant` | Contrat de salaire : jour habituel, règle mois suivant | — |
| `revenuNet` (5 600) et `mois[].revenuPercu` (3 200 puis 10 000 / 15 000) | Montant du salaire : **l'utilisateur choisit** | Valeurs contradictoires. Aucune n'est retenue d'office. |
| `mois[].revenuPercu` passés | Paies **reçues** seulement si l'utilisateur confirme | Sinon ignorées. |
| `mois[].revenuPercu` > salaire | Écart proposé comme **prime** sur ce mois | Ex. septembre 2026 : 15 000 = 10 000 + 5 000. |
| `depenses[]` (modèle) | Charges. Proposition : Nourriture, Transport, Fun → **enveloppe** ; Téléphone, Gym, Assurances, Obligations familiales → **fixe** | Montants à 0 ignorés. |
| Ligne « Savings » | **Versement d'épargne**, pas une charge | Règle R11. |
| Lignes au nom d'une personne (Mohamed, Yahya) | « À classer » : **dette** (avec échéancier) ou **aide** récurrente | L'utilisateur tranche. |
| `mois[].depenses` futurs qui diffèrent du modèle | **Ponctuels prévus** (ex. Assurances 550 en décembre) | Jamais importés comme réels. |
| `objectifs[]` | Objectifs : `montant` → cible, `moisCible` → date, `dejaMisDeCote` → montant initial, `versementMensuel` | « Achat enregistré » à une date future → reste un objectif actif. |
| `journal` | Proposé comme achats prévus | — |
| `allocation`, `patrimoine`, `tauxRendementAnnuel`, `soldeFondsUrgence` | Non importés | Conservés dans le fichier brut archivé. |

Tout ce qui est importé est **prévu**, jamais réel, sauf confirmation explicite.

L'étude HTML n'est pas un fichier de données. Ses chiffres (primes de février, mars, juin ; dette de 8 500 DH) sont proposés comme **suggestions à confirmer** pendant l'onboarding.

#### 7.2 Calcul d'une période

Pour chaque période, le moteur rend :

```text
Revenus prévus      = occurrences des sources (selon scénario)
Revenus réels       = revenus reçus confirmés
Charges prévues     = charges fixes + enveloppes + ponctuelles + échéances de dette
Dépenses réelles    = transactions + paiements de dette
Reste prévu         = revenus prévus − charges prévues
Reste réel          = revenus réels − dépenses réelles
Épargne prévue      = versements prévus aux objectifs + épargne libre prévue
Épargne réelle      = versements réels + variation du solde déclaré
Écart               = réel − prévu (par ligne, par catégorie, total)
```

- **Période passée clôturée** : uniquement du réel (instantané figé).
- **Période en cours** : réel à date + prévu restant. Le total affiche les deux parts.
- **Période future** : prévu, puis projeté selon le scénario.

#### 7.3 Certitude et scénarios

| Scénario | Revenus pris en compte | Dépenses flexibles |
|---|---|---|
| **Prudent** | Garantis uniquement | Moyenne réelle des 3 derniers mois si plus élevée que le prévu |
| **Réaliste** | Garantis + probables | Prévues |
| **Ambitieux** | Tous, y compris incertains | Prévues |

Les règles sont modifiables dans les réglages. Elles sont affichées à côté de chaque projection.

#### 7.4 Objectifs

- **Restant** = cible − (montant initial + versements réels).
- **Effort mensuel nécessaire** = restant ÷ nombre de mois jusqu'à la date souhaitée.
- **Date estimée** = premier mois où le cumul projeté couvre la cible, par scénario.
- **Allocation** : la capacité d'épargne est répartie par priorité (versement fixe d'abord, puis cascade). Jamais plus que la capacité réelle.
- **Risque de retard** :

| Niveau | Règle |
|---|---|
| Sûr | Atteint à la date en scénario prudent |
| Probable | Atteint en réaliste, pas en prudent |
| Fragile | Atteint seulement en ambitieux |
| Hors de portée | Non atteint à la date, même en ambitieux |

- **Achat réalisé** : l'objectif passe à « réalisé », le montant épargné est consommé. L'achat n'est **pas** compté une deuxième fois en dépense courante.
- **Fonds de sécurité** : objectif spécial, cible proposée = 3 à 6 mois de charges essentielles.

#### 7.5 Recommandations

Règles explicites, testées, sans boîte noire. Chacune rend : message, montant, impact, base de calcul, niveau de confiance.

Exemples (chiffres **illustratifs**, non calculés) :

- « Pour avoir la moto en juillet 2027, il faut 4 300 DH par mois, soit environ 1 000 DH par semaine. »
- « Réduire les loisirs de 300 DH avance l'objectif d'environ 1 mois. »
- « Affecter la prime de février (3 500 DH) à la moto avance la date de 3 semaines. »
- « Ton budget flexible de la semaine est dépassé de 120 DH. Il reste 4 jours. »

Interdits : toute formulation de garantie. Toujours une condition (« si tes revenus et dépenses restent conformes au plan »).

#### 7.6 Règles absolues

1. L'argent est en centimes entiers. Les arrondis ne se font qu'à l'affichage.
2. L'épargne n'est jamais une dépense.
3. Une dette est un échéancier, pas une charge permanente.
4. Un montant réel n'est jamais écrasé par une projection.
5. Le moteur ne lit jamais l'horloge : la date du jour est un paramètre.
6. Aucune donnée d'exemple n'est présentée comme réelle. Les démos sont marquées « exemple ».

---

### 8. KPI retenus

Huit KPI. Chacun répond à une question.

| KPI | Question | Calcul |
|---|---|---|
| Reste à dépenser (mois) | Combien puis-je encore dépenser ce mois ? | Revenus réels − dépenses réelles − épargne prévue restante |
| Reste flexible (semaine) | Est-ce que je tiens ma semaine ? | Budget flexible semaine − dépensé semaine |
| Taux d'épargne | Quelle part de mon revenu je garde ? | Épargne ÷ revenus (réel, et prévu à côté) |
| Taux de charges | Mes charges sont-elles lourdes ? | Dépenses ÷ revenus |
| Écart prévu / réel | Est-ce que je respecte mon plan ? | Réel − prévu, en DH et en % |
| Part variable du revenu | Mon revenu est-il fragile ? | Primes et variables ÷ revenu total (12 mois) |
| Progression objectif | Où en est mon objectif ? | Épargné ÷ cible |
| Délai avant objectif | Quand vais-je y arriver ? | Date estimée (scénario actif) et écart avec la date souhaitée |

Pas de score global, pas de « santé financière » chiffrée en v1. Ces indicateurs sont trop opaques.

---

### 9. Pages (résumé)

Détail complet dans `ux-ui.md (UX)`.

| Page | Rôle |
|---|---|
| Profils | Choisir ou créer un compte (sans mot de passe). |
| Onboarding | Comprendre la situation en moins de 5 minutes, avec import de la V0. |
| Aujourd'hui | Où j'en suis, maintenant. |
| Mois | Prévu vs réel, semaines, dépenses du mois, clôture. |
| Année | Vue d'ensemble sur 12 mois. |
| Objectifs | Liste et détail de chaque objectif. |
| Simulateur | Questions « et si ». |
| Calendrier | Tous les événements financiers datés. |
| Mon plan | Salaire, primes, charges, enveloppes, dettes, épargne : la source des prévisions. |
| Réglages | Profil, cycle de paie, scénarios, données, animations. |

Pages **écartées** comme pages séparées :

- **Budget** → fusionné dans Mois. Un budget sans le réel à côté n'aide pas.
- **Historique** → c'est la navigation entre mois et années.
- **Rapports** → la page Année fait ce travail.
- **Revenus** et **Dépenses** séparées → réunies dans Mon plan (prévu) et Mois (réel).

---

### 10. UX et UI

- `ux-ui.md (UX)` : architecture, navigation, parcours, états, pages détaillées.
- `ux-ui.md (UI)` : tokens, typographie, composants, glass, graphiques, animations, responsive.

Principes clés :

- Une question par écran, une réponse en gros, le détail en dessous.
- Le prévu se **confirme** en un geste (« Salaire reçu ✓ ») plutôt que se ressaisir.
- Interface identique au template, couleur principale **#7D8C82** (vert sauge) à la place du violet, thème clair.
- Police Plus Jakarta Sans (proche de celle du template).
- Grammaire visuelle constante : réel = plein, prévu = contour, projeté = hachuré + étiquette.

---

### 11. Dépendances

#### 11.1 Frontend

| Paquet | Rôle | Justification |
|---|---|---|
| `react`, `react-dom` (18) | UI | Imposé. Version de la skill. |
| `vite` (5) | Build et serveur de dev | Rapide, standard React. Version de la skill. |
| `typescript` | Typage | Voir 5.1. |
| `react-router` | Routage | Standard, routes imbriquées (Mois → semaines). |
| `@tanstack/react-query` | Données serveur | Cache et invalidation : évite de réécrire du chargement partout. |
| `zustand` | État UI | Très léger, pour période et scénario actifs seulement. |
| `tailwindcss` (3.4), `postcss`, `autoprefixer` | Style | Tokens dans la config, glass en utilitaires, pas de CSS mort. Version de la skill. |
| `@radix-ui/react-*` (dialog, popover, select, tabs, tooltip, switch, dropdown-menu) | Primitives | Accessibilité clavier et lecteur d'écran sans la réécrire. |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Variantes de composants | Boutons et cartes à variantes sans conflits de classes. |
| `framer-motion` (11) | Animations | Cascades, transitions de vue, compteurs animés. Version de la skill. |
| `recharts` | Graphiques | Aires, barres, composés ; personnalisable ; suffisant pour nos besoins. |
| `lucide-react` | Icônes | Trait fin, proche du template, import à l'unité. |
| `react-hook-form`, `@hookform/resolvers` | Formulaires | Performant, s'appuie sur Zod. |
| `zod` | Validation | Schémas partagés avec l'API. |
| `date-fns` (+ locale `fr`) | Dates | Périodes, semaines, calendrier. Fonctions pures. |
| `react-day-picker` | Sélecteur de date | Champ date accessible, stylable. |
| `sonner` | Notifications | Toasts discrets avec « Annuler ». |
| `@fontsource/plus-jakarta-sans` | Police | La plus proche de celle du template, hébergée localement. |
| `@radix-ui/react-switch` | Interrupteur | Interrupteur accessible du template. |

Écartés : bibliothèque de calendrier complète (FullCalendar : lourd, le calendrier est simple et construit sur date-fns), lib « glass » (le CSS natif suffit), Redux (inutile), MUI / Ant (style imposé, loin du template).

Optionnel, plus tard : `cmdk` (palette ⌘K de saisie rapide).

#### 11.2 Backend

| Paquet | Rôle |
|---|---|
| `fastify` | Serveur HTTP. |
| (validation) | Schémas Zod partagés appliqués par un petit utilitaire `valider` (pas de dépendance en plus). |
| `@fastify/helmet`, `@fastify/cors` | En-têtes de sécurité, CORS restreint au front. |
| `prisma`, `@prisma/client` | Accès base, migrations. |
| `zod` | Schémas (partagés). |
| `pino` (inclus dans Fastify) | Journaux, sans données financières en clair. |
| Lot sécurité : `argon2`, `@fastify/cookie`, `@fastify/rate-limit` | Authentification et limitation. |

#### 11.3 Outils

workspaces `npm`, `vitest`, `jsdom`, `@testing-library/react`, `playwright`, `fast-check` (tests de propriétés du moteur), `eslint`, `prettier`, `tsx`.

---

### 12. Sécurité et confidentialité

Sécurité des comptes, isolation des données, journaux, secrets et loi 09-08 : [`prod.md` § 5 à 7](prod.md#7-sécurité-et-confidentialité).

Règles produit qui restent ici :
- Pas de données financières dans les journaux ni dans les URL.
- Import toujours en aperçu avant écriture.
- Suppression : corbeille douce (archivage) pour objectifs et charges. Confirmation pour toute suppression.

---

### 13. Stratégie de tests

| Niveau | Outil | Contenu |
|---|---|---|
| Moteur | Vitest + fast-check | Chaque règle de la section 7. Cas limites : 31 du mois, février, semaines partielles, prime trimestrielle, dette soldée, objectif déjà atteint, revenu nul. Propriétés : l'allocation ne dépasse jamais la capacité ; réel jamais modifié par le scénario. |
| Fixture de référence | Vitest | L'étude HTML reconstruite **avec des valeurs confirmées** sert de cas « or » : le moteur doit retrouver les cumuls validés. |
| Salaire | Vitest | Paie en avance, en retard, mois financé modifié, 31 février, redécoupage des mois voisins, mois clôturé jamais redécoupé, augmentation de salaire. |
| Import V0 | Vitest | Le vrai fichier money-guru : chaque ligne proposée, aucune donnée importée comme réelle sans confirmation, « Savings » jamais en charge. |
| API | Vitest + `fastify.inject` | Chaque route : validation, erreurs, persistance, SQLite en mémoire. **Isolation** : l'utilisateur A ne lit ni ne modifie jamais les données de B. |
| Composants | Testing Library | Formulaires, états vides, erreurs, affichage des natures. |
| Parcours | Playwright | Onboarding, ajout dépense, confirmation salaire, création objectif, simulation, clôture de mois. |
| Visuel / a11y | Playwright + axe | Contraste, clavier, responsive (375, 768, 1280, 1440). Contrôle du rendu par DOM et styles calculés (recette de la skill), pas par captures seules. |

---

### 14. Questions ouvertes

1. **Hébergement** : au Maroc ou à l'étranger (autorisation préalable de la CNDP) ? Décision D14 de [`prod.md`](prod.md#3-décisions), à trancher au lot P0.
2. **Encaissement** : CMI avec module récurrent via la banque, ou revendeur « merchant of record » ? À trancher avant le lot 32.
3. **Prix** : hypothèse 199 à 299 MAD/an après essai gratuit, à tester pendant la bêta.

Les questions sur l'ordre des lots sont dans `docs/lots.md`.

---

### 15. SaaS : positionnement et périmètre de lancement (12/10/2026)

Source : `docs/etude/Etude-marche-2026-10.html` (benchmark de 16 applications, marché marocain, audit du code).

#### 15.1 Positionnement

**« Le plan financier du salarié, construit sur sa paie. »** MySalary répond à cinq questions à partir de ce que le salarié sait déjà, sans connecter sa banque :

1. Combien vais-je réellement recevoir ? (paie confirmée, primes par certitude)
2. Où va mon argent ? (enveloppes, semaine, mois, année, prévu contre réel)
3. Combien puis-je épargner sans déséquilibrer mon budget ? (capacité par scénario, cumul de fin de mois)
4. Quand pourrai-je financer mes projets ? (objectifs datés, avec et sans cumul)
5. Quelle sera ma situation dans 1, 3, 5 ou 10 ans ? (**partiel : 36 mois au plus aujourd'hui → lot 28**)

Différences avec le marché : budget calé sur la paie réelle, revenus classés par certitude, réel / prévu / projeté jamais mélangés, cumul de fin de mois qui alimente des objectifs datés. Les applications marocaines (Flouss, Budget Maroc) suivent la dépense du mois ; les internationales s'appuient sur la synchro bancaire, indisponible au Maroc.

Cible de lancement : salariés marocains francophones, salaire fixe et primes, avec au moins un crédit ou un projet.

#### 15.2 Retenu avant le lancement

| Ajout | Raison | Lot |
|---|---|---|
| Vérification de l'e-mail, envoi réel des e-mails | Récupération de compte, confiance | 24 |
| Épargne synchronisée (versement mensuel visible et notable, compte non déclaré) | Ajouté le 15/10/2026 : incohérence constatée | 25 |
| Objectifs en vue annuelle | Ajouté le 15/10/2026 : questions 4 et 5 sur l'année | 26 |
| Aujourd'hui en tableau de bord | Ajouté le 15/10/2026 : question 2 et prochaines actions | 27 |
| Projection 1, 3, 5, 10 ans avec fourchettes | Question 5 ; argument premium (PocketSmith, Monarch Plus) | 28 |
| Taux d'endettement avec seuil | 36 % en moyenne, plus de 40 % dans 4 dossiers sur 10 (BAM 2025) | 28 |
| Modèles d'événements (Ramadan, Aïd, rentrée, vacances, 13e mois) | Dépenses saisonnières fortes (HCP) | 28 |
| Cas de référence des calculs, parcours Playwright | Exactitude, prévu au § 13 et jamais fait | 29 |
| PostgreSQL, build de production, PWA, pages légales, CNDP | Prérequis d'un SaaS | 30 → [`prod.md`](prod.md) P2 à P5 |
| Hébergement HTTPS, sauvegardes, surveillance, bêta fermée | Mise en ligne | 31 → [`prod.md`](prod.md) P8 |

#### 15.3 Écarté ou reporté (historique conservé)

- **Reporté** (après la bêta) : abonnement payant (lot 32), arabe et darija (lot 33), import de relevés et SMS (lot 34), rappels par e-mail, double authentification, budget partagé du foyer, assistant IA, net depuis le brut, jours fériés.
- **Écarté** : synchro bancaire (pas d'accès ouvert au Maroc), placements et patrimoine, avances de salaire et crédit (services régulés), négociation de factures, application native avant d'avoir mesuré la PWA.

#### 15.4 Sécurité et données pour le SaaS

Comptes, isolation, PostgreSQL, sauvegardes, journaux et loi 09-08 : [`prod.md` § 5 à 7](prod.md#5-comptes-et-authentification).

#### 15.5 Prêt à commercialiser quand

Critères d'ouverture : [`prod.md` § 11](prod.md#11-critères-douverture).
