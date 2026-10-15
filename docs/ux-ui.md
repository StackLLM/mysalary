# MySalary — UX et UI

Ce document réunit les **parcours et pages** (UX) et la **direction artistique** (UI). Les renvois s’écrivent « ux-ui.md (UX) § 5.11 » ou « ux-ui.md (UI) § 8 ».

## Sommaire

- [Partie UX](#partie-ux)
- [Partie UI](#partie-ui)

## Partie UX

> Ancien fichier `UX.md`. Titre d’origine : « MySalary — UX ».

> Logique d'usage : architecture, navigation, parcours, pages, états.
> Les règles métier sont dans `produit.md (Contexte)`. Le style visuel dans `ux-ui.md (UI)`.

---

### 1. Principes

1. **Une question par écran.** La réponse en gros, le détail dessous.
2. **L'ordre de lecture suit l'ordre des questions** : où j'en suis → ce que j'ai dépensé → ce qu'il me reste → ce que je peux épargner → quand j'atteins mes objectifs.
3. **Confirmer plutôt que ressaisir.** Le prévu devient réel en un geste.
4. **Le réel, le prévu et le projeté ne se confondent jamais** (voir § 9).
5. **Moins d'une minute par jour.** Une dépense se note en 3 gestes.
6. **Calme.** Une alerte n'apparaît que si une action est utile.
7. **Tout est réversible.** Annuler après chaque action, corbeille douce.
8. **Pas de cul-de-sac.** Chaque état vide propose l'action suivante.

---

### 2. Architecture de l'information

```text
MySalary
├── Profils ................ choisir ou créer un compte (sans mot de passe)
├── Onboarding (une fois par compte, import V0 possible)
├── Aujourd'hui ............ où j'en suis maintenant
├── Mois ................... prévu vs réel (de paie à paie)
│   ├── Vue d'ensemble
│   ├── Semaines
│   └── Dépenses du mois
├── Année .................. 12 mois d'un coup d'œil
├── Objectifs
│   └── Détail d'un objectif
├── Simulateur ............. et si… ?
├── Calendrier ............. événements datés
├── Mon plan ............... ce qui génère le prévu
│   ├── Salaire & primes
│   ├── Autres revenus
│   ├── Charges & enveloppes
│   ├── Dettes
│   └── Épargne
└── Réglages
    ├── Profil & cycle de paie
    ├── Catégories
    ├── Scénarios (règles)
    ├── Animations (on / off)
    └── Données (export, import, sauvegarde)
```

Deux couches distinctes :

- **Mon plan** = ce que je prévois (configuration, change rarement).
- **Aujourd'hui / Mois / Année** = ce qui se passe (suivi, change tous les jours).

---

### 3. Navigation

Structure du template `Templates/image.png`. Détail visuel dans `ux-ui.md (UI)` § 5.

#### Bureau (≥ 1024 px)

Barre du haut blanche, comme le template.

```text
MySalary.  ▦ Aujourd'hui  ▤ Mois  ▥ Année  ◎ Objectifs  ▣ Calendrier  ▭ Mon plan        (🔔) (⚙) │ (O)
```

- Onglet actif : texte coloré + icône sauge + trait de 2 px sous l'onglet.
- À droite : notifications, réglages (boutons ronds gris), séparateur, avatar du profil (menu : changer de profil).
- Sous la barre : **fil d'Ariane** (ex. « Mois / février 2027 (27 janv. → 26 févr.) ») et, à droite, le bouton menu de la page (ex. « Gérer le mois ▾ »).
- L'action principale de la page (ex. « Ajouter une dépense ») est le grand bouton plein en bas de la colonne latérale, comme « Send Invoice ».
- Raccourcis clavier : `N` nouvelle dépense, `S` simulateur, `←` `→` période précédente / suivante.

#### Tablette et mobile (< 1024 px)

Les liens quittent la barre du haut. Barre d'onglets blanche en bas :

```text
Aujourd'hui · Mois · [ + ] · Objectifs · Mon plan
```

- `+` ouvre la saisie rapide (dépense, revenu reçu, versement objectif).
- Année, Calendrier, Simulateur et Réglages restent accessibles depuis Aujourd'hui, le fil d'Ariane et le bouton réglages.

#### Sélecteur de période

Présent sur Mois, Année, Calendrier. Flèches + libellé cliquable (« Janvier 2027 · 27 déc. → 26 janv. »).

Les dates affichées sont celles des paies (réelles si reçues, sinon prévues, marquées « prévu »).

La période choisie est conservée quand on passe d'une page à l'autre.

---

### 4. Parcours

#### 4.0 Choix du profil

1. Au lancement, l'écran **Profils** montre les comptes existants (cartes avec prénom et initiale).
2. Un clic ouvre le compte. Le choix est retenu pour la prochaine visite.
3. **Nouveau compte** : prénom + devise → onboarding.
4. Changer de profil : menu de l'avatar.

Mention discrète sur l'écran : « Pas de mot de passe pour l'instant : n'utilise MySalary que sur ton ordinateur. »

#### 4.1 Onboarding

But : une première vue utile en moins de 5 minutes. Chaque étape peut être passée et complétée plus tard.

| Étape | Contenu | Pourquoi |
|---|---|---|
| 1. Bienvenue | Phrase : « MySalary sépare toujours le réel, le prévu et les projections. » Choix : **Partir de zéro** ou **Importer mon ancien fichier**. | Poser le contrat de confiance. |
| 2. Import (si choisi) | Dépôt du fichier JSON → aperçu ligne par ligne, groupé par thème (salaire, charges, objectifs…). Chaque ligne : **Importer**, **Modifier**, **Ignorer**. Les conflits (ex. salaire 5 600 ou 10 000 ?) sont posés en question simple. | Gagner du temps sans importer d'erreur. Les étapes suivantes arrivent pré-remplies, marquées « importé · à confirmer ». |
| 3. Salaire | Salaire net habituel, jour habituel de paie, « cette paie sert-elle à vivre le mois suivant ? », date de la **dernière paie reçue**. | Définit le contrat et le premier mois budgétaire. |
| 4. Primes | Liste : montant, sur la paie ou à part, fréquence (ponctuelle, mensuelle, trimestrielle, annuelle, mois choisis), certitude. « Je ne sais pas encore » accepté. | Profil salaire + primes. |
| 5. Charges fixes | Suggestions cochables (téléphone, internet, abonnements, assurance, aide familiale, sport, crédit) + montant + jour. | Aller vite. |
| 6. Enveloppes | Nourriture, transport, loisirs… montant par mois. | Base du suivi hebdo. |
| 7. Dettes & ponctuels | Dette : total + échéancier. Ponctuel : montant + date. | Éviter l'erreur « dette = charge permanente ». |
| 8. Épargne | Solde actuel, montant déjà réservé à un objectif. | Point de départ réel. |
| 9. Premier objectif | Nom, cible, date souhaitée (facultative). | Donner une raison. |
| 10. Résumé | Mois budgétaire en cours (dates), revenu prévu, charges prévues, capacité d'épargne, date estimée du premier objectif (marquée « projection »). | Effet « je vois clair ». |

Règles :
- Progression visible (barre fine + « étape 3 sur 10 »).
- Sauvegarde à chaque étape, par compte. Reprise possible.
- Aucune valeur pré-remplie présentée comme réelle. Les suggestions sont vides ou marquées « exemple » ; les valeurs importées sont marquées « importé · à confirmer ».
- Retour arrière sans perte.

#### 4.2 Confirmation de la paie

Principe : le contrat prévoit, l'utilisateur confirme. Il ne ressaisit jamais son salaire.

1. Le jour de paie prévu, Aujourd'hui affiche une carte : « Paie prévue aujourd'hui · 10 000 DH + prime 1 000 DH ».
2. Deux choix : **Reçue ✓** ou **Corriger**.
3. Corriger → date réelle, montant de chaque ligne (salaire, primes), mois financé (pré-rempli, modifiable). L'écart avec le prévu est affiché.
4. Toast : « Paie confirmée · Février commence aujourd'hui · Annuler ».
5. Le nouveau mois budgétaire s'ouvre ; l'ancien se termine la veille. Les montants se recalculent avec animation douce.

Cas :
- **Paie en avance** : confirmer avant la date prévue est possible (`+` → « Paie reçue »). Les mois voisins se redécoupent.
- **Paie en retard** : 1 jour après la date prévue, la carte devient « Paie attendue depuis hier ». Le mois en cours se prolonge tant qu'elle n'est pas reçue.
- **Augmentation** : Mon plan → Salaire → « Mon salaire change » → nouveau montant + date d'effet. Le passé ne change pas.
- **Prime versée à part** : `+` → « Revenu reçu », rattaché au mois qui contient sa date.

#### 4.3 Ajout d'une dépense

1. `+ Dépense` (ou `N`, ou `+` mobile) ouvre un panneau latéral (feuille du bas sur mobile).
2. **Montant** en premier, focus automatique, clavier numérique sur mobile.
3. **Catégorie** : puces des 6 plus utilisées + « Autre ».
4. Date (aujourd'hui par défaut), libellé et note facultatifs.
5. Si la catégorie correspond à une charge prévue non payée : « Est-ce le paiement de *Téléphone (100 DH)* ? » → lien automatique.
6. Valider (`Entrée`). Toast avec Annuler. Le panneau peut rester ouvert pour enchaîner (« Ajouter une autre »).

Retour immédiat : la carte « Reste semaine » se met à jour sous les yeux.

#### 4.4 Création d'un objectif

1. Objectifs → **Nouvel objectif**.
2. Type (moto, voiture, voyage, ordinateur, logement, investissement, fonds de sécurité, autre). Le type ne sert qu'à l'icône et aux suggestions.
3. Nom, montant cible, déjà disponible.
4. Date souhaitée (facultative), priorité (glisser dans la liste ou 1–5).
5. Versement mensuel souhaité (facultatif).
6. **Aperçu en direct** à droite : date estimée par scénario, effort nécessaire, risque. Tout est marqué « projection ».
7. Si la capacité ne suffit pas : message neutre + 2 propositions (repousser la date, augmenter le versement, réduire une enveloppe).
8. Créer → page détail de l'objectif.

Fonds de sécurité : cible proposée = 3 à 6 mois de charges essentielles, explicitement calculée et modifiable.

#### 4.5 Simulation

1. Simuler → le scénario de départ est le plan actuel (réaliste).
2. Trois cartes scénarios côte à côte : prudent, réaliste, ambitieux.
3. Leviers à gauche :
   - versement mensuel vers un objectif ;
   - prime supplémentaire (montant + mois) ;
   - réduction d'une enveloppe ou d'une charge ;
   - date cible ;
   - horizon (6, 12, 24, 36 mois).
4. Trois questions prêtes à l'emploi :
   - « Si j'épargne X par mois, quand ? »
   - « Combien par mois pour atteindre la date ? »
   - « Impact d'une prime ? »
5. Le graphique se met à jour en direct. Le réel passé reste plein, le futur hachuré.
6. **Enregistrer comme scénario** ou **Appliquer au plan** (confirmation obligatoire, résumé des changements).

Une simulation ne modifie jamais les données tant qu'on ne l'applique pas.

#### 4.6 Suivi hebdomadaire

1. Lundi, Aujourd'hui affiche le bilan de la semaine passée : budget flexible, dépensé, écart, comparaison aux semaines précédentes.
2. Mois → onglet **Semaines** : une ligne par semaine de la période.
3. Chaque semaine : budget disponible, dépenses prévues (charges fixes datées), dépenses réelles, reste, épargne, écart, tendance.
4. Option dans les réglages : reporter le reste d'une semaine sur la suivante (désactivé par défaut).

Question à laquelle l'écran répond : **« Est-ce que je respecte mon budget ce mois-ci ? »**
Réponse en tête : « Oui, avec 340 DH d'avance » / « 120 DH au-dessus du rythme prévu ».

#### 4.7 Suivi mensuel

1. Mois → vue d'ensemble de la période sélectionnée.
2. En tête : reste réel, épargne réelle vs prévue, écart global.
3. Tableau prévu vs réel par ligne (revenus, charges fixes, enveloppes, dettes, ponctuels, épargne).
4. Chaque ligne prévue non confirmée a une action **Confirmer**.
5. Fin de période : bandeau « Octobre est terminé. Vérifie et clôture. » → résumé → **Clôturer**.
6. Navigation vers les mois précédents (réel figé) et futurs (prévu + projeté).

#### 4.8 Suivi annuel

1. Année → 12 périodes de l'année choisie.
2. En tête : revenus, dépenses, épargne de l'année (réel à date + projeté restant, séparés).
3. Graphique mensuel revenus / dépenses / épargne.
4. Mois les plus coûteux, part variable du revenu, évolution de l'épargne cumulée.
5. Progression de chaque objectif sur l'année.
6. Clic sur un mois → page Mois.

---

### 5. Pages

Format pour chaque page : objectif · données · actions · relations · état vide · erreurs · cas particuliers.

#### 5.0 Profils
- **Objectif** : choisir le compte dont on voit les données.
- **Données** : cartes des comptes (initiale, prénom, date de dernière utilisation).
- **Actions** : ouvrir un compte, créer un compte, renommer, supprimer (double confirmation : retaper le prénom ; export proposé avant à partir du lot 17).
- **Relations** : mène à Onboarding (nouveau compte ou onboarding non terminé) ou à Aujourd'hui.
- **État vide** : aucun compte → « Crée ton compte pour commencer » + bouton.
- **Erreurs** : serveur injoignable → message + réessayer.
- **Cas particuliers** : compte retenu supprimé entre-temps → retour à la liste avec message.

#### 5.1 Onboarding
- **Objectif** : comprendre la situation financière de départ.
- **Données** : voir § 4.1.
- **Actions** : suivant, précédent, passer, terminer.
- **Relations** : alimente Mon plan, Épargne, Objectifs. Mène à Aujourd'hui.
- **État vide** : n/a.
- **Erreurs** : champ invalide → message sous le champ (« Le montant doit être positif »). Sauvegarde échouée → bandeau + réessayer, saisie conservée.
- **Erreurs d'import** : fichier illisible ou inconnu → « Ce fichier n'est pas un export MySalary ou money-guru » + continuer sans import. Ligne incohérente → signalée, ignorée par défaut.
- **Cas particuliers** : aucun salaire fixe (revenus seulement variables) → l'étape 3 propose « Mes revenus varient » et passe en mode sources multiples. Utilisateur qui quitte → reprise à la dernière étape.

#### 5.2 Aujourd'hui
- **Objectif** : où j'en suis, en 5 secondes.
- **Données** (dans l'ordre) :
  1. Carte héro : **reste du mois, avant épargne** (revenus prévus − charges prévues), avec la mention « Ce reste est calculé sans l'épargne » et le montant d'épargne prévu non retiré. Quatre chiffres au-dessus : reçu, dépensé (charges fixes, enveloppes, ponctuels et dettes consommés, à lire sur le total des charges prévues, avec une barre ; le hors plan est ajouté à part), reste à payer (toutes les charges pas encore payées, enveloppes comprises : dépensé + reste à payer = charges prévues), séparé en « à confirmer (date passée) » (en retard, peut-être déjà payé) et « à venir », avec un lien vers le mois, épargné. Plus de « reste à dépenser », de « par jour » ni de « reste réel » (supprimés le 15/10/2026).
  2. Reste flexible de la semaine + barre de rythme.
  3. Actions attendues : salaire à confirmer, charges du jour, échéance de dette.
  4. Épargne du mois : prévue vs réelle.
  5. Objectif prioritaire : progression, date estimée, risque.
  6. Prochains 7 jours (extrait du calendrier).
- **Depuis le lot 27 (tableau de bord)**, dans l'ordre :
  1. Rangée d'indicateurs : revenus reçus (sur prévus), dépensé (anneau : part des charges prévues, part du mois écoulé), épargne du mois (sur prévue, taux), objectifs (progression globale, objectifs à risque). Deux par ligne sur téléphone.
  2. Carte du jour : bonjour, mois en cours, reste à dépenser ce mois et cette semaine (bandeau), détail du calcul, semaine en cours, semaine passée le premier jour, actions rapides.
  3. « À faire » numéroté : paie à confirmer (sur place), échéances, enveloppes dépassées, versement d'épargne prévu (ouvre le versement pré-rempli), compte d'épargne à déclarer.
  4. « Où part ton argent » : les 5 postes les plus lourds du mois (part des revenus prévus ; pour une enveloppe, barre de consommation avec le repère du mois écoulé), puis « Voir les N autres postes ».
  5. 7 prochains jours.
  6. À droite : « À surveiller » (enveloppes dépassées ou dépensées plus vite que le mois, grosses dépenses du mois), suggestions, objectif prioritaire.
  7. 1 à 3 recommandations.
- **Actions** : confirmer, ajouter une dépense, ouvrir un objectif, ouvrir le mois.
- **Relations** : Mois, Objectifs, Calendrier, Simulateur.
- **État vide** : plan incomplet → « Ajoute ton salaire pour voir ton reste du mois » + bouton.
- **Erreurs** : chargement échoué → cartes en état d'erreur individuel avec « Réessayer ». Le reste de la page s'affiche.
- **Cas particuliers** : reste négatif → ton neutre, montant en couleur d'alerte, une recommandation concrète. Avant le premier salaire confirmé → afficher le prévu, marqué « prévu ».

#### 5.3 Mois
- **Objectif** : comparer prévu et réel sur une période.
- **Cumul (15/10/2026)** : se lit en entier, report + revenus − charges − épargne confirmée = cumul fin de mois. L'épargne prévue pas encore versée est affichée à part (« À épargner, à confirmer dans Épargne ») et n'est pas retirée. Même lecture dans Année › Calendrier (carte du mois : reste, report, épargne confirmée, à épargner, cumul), dans la fenêtre d'un mois et dans le tableau des paies (colonne Épargne = confirmée). Dans Objectifs, la simulation s'appelle « reste après versements prévus » : c'est un autre calcul.
- **Données** : bandeau « Dépensé » (avec « à confirmer (date passée) » et « à venir ») et « Reste du mois, avant épargne », puis le cumul ; en bas, les totaux (reçu, dépensé, reste à payer, épargne) et « Reste du mois, sans épargne » avec sa mention. Identique pour tous les mois (passés, en cours, à venir). Tableau prévu / réel / écart par ligne, graphique de rythme cumulé (réel vs ligne prévue), onglets Semaines et Dépenses.
- **Actions** : changer de période, confirmer une ligne, ajouter une dépense, modifier une dépense, clôturer / rouvrir. **Tout marquer payé** (carte « À confirmer », mois non clôturé) : après confirmation, note en une fois toutes les charges fixes et ponctuels en retard, chacun à sa date prévue ; un seul « Annuler » les retire.
- **Relations** : Aujourd'hui, Année, Mon plan (modifier la source d'une ligne prévue), Calendrier.
- **État vide** : aucune dépense → « Aucune dépense notée sur cette période » + ajouter. Période future → prévisions seules, bandeau « Mois à venir ».
- **Erreurs** : clôture impossible (lignes non confirmées) → liste des lignes concernées, possibilité de clôturer quand même avec mention.
- **Cas particuliers** : mois clôturé → lecture seule, badge « Clôturé ». Changement du jour de paie → les périodes passées clôturées gardent leurs dates.

#### 5.4 Mois → Semaines
- **Objectif** : savoir si je tiens mon rythme.
- **Données** : par semaine : budget flexible, charges prévues datées, réel, reste, épargne, écart, tendance vs moyenne des 4 dernières semaines.
- **Actions** : ouvrir une semaine (liste des dépenses), ajouter une dépense datée.
- **Relations** : Dépenses du mois, Aujourd'hui.
- **État vide** : pas d'enveloppe définie → « Définis tes enveloppes pour suivre la semaine » → Mon plan.
- **Erreurs** : standard.
- **Cas particuliers** : semaines partielles en début / fin de période → budget proratisé, mention « 3 jours ».

#### 5.5 Mois → Dépenses
- **Objectif** : retrouver et corriger les dépenses.
- **Données** : liste groupée par jour, filtre par catégorie, total filtré.
- **Actions** : ajouter, modifier, supprimer (avec Annuler), lier à une charge prévue.
- **État vide** : comme 5.3.
- **Cas particuliers** : dépense datée hors période affichée → elle est rangée dans la bonne période, toast « Ajoutée à novembre ».

#### 5.6 Année
- **Objectif** : comprendre l'année sans lire chaque mois.
- **Données** : voir § 4.8.
- **Actions** : changer d'année, ouvrir un mois, ouvrir un objectif.
- **Relations** : Mois, Objectifs.
- **État vide** : première année incomplète → mois passés sans données grisés, « Pas de données avant ton inscription ».
- **Cas particuliers** : année future → entièrement projetée, bandeau explicite.
- **Synthèse simplifiée (15/10/2026)** : trois totaux en mots simples (« Revenus de l'année : déjà reçu / encore attendu », « Dépenses de l'année : déjà dépensé / encore prévu », « Épargne de l'année : déjà épargné / encore prévue »), bandeau d'une phrase, « Tes mois les plus chers », « Part de ton revenu qui varie ». Le bloc « Épargne cumulée » est retiré : c'était le même chiffre que « Épargne de l'année ».

#### 5.7 Objectifs (liste)
- **Objectif** : voir tous les objectifs et leur ordre.
- **Données** : carte par objectif : progression, épargné / cible, date estimée, date souhaitée, risque. Total réservé vs épargne disponible.
- **Actions** : créer, réordonner la priorité (glisser), mettre en pause, archiver.
- **Relations** : Détail, Simulateur, Épargne.
- **État vide** : illustration sobre + « Crée ton premier objectif » + exemples de types.
- **Erreurs** : réservé > solde déclaré → alerte « Tes objectifs réservent plus que ton épargne déclarée » + action réajuster.
- **Cas particuliers** : objectifs réalisés → section repliée « Réalisés ».
- **Depuis le lot 26 (vue annuelle)** : la vue « Calendrier de l'année » est retirée (elle reste dans la page Année). La page montre, dans l'ordre : indicateurs (progression globale, déjà épargné sur la cible, reste à épargner et versé depuis janvier, objectifs à risque) ; carte « Année » (trajectoire de l'épargne de tous les objectifs : réel puis projection réaliste, cible ; versé depuis janvier, fin d'année prévue avec fourchette prudent–ambitieux, capacité du mois) ; liste « En cours » par priorité, chaque carte avec la fin d'année projetée et le mois atteint dans l'année ; à droite « Prochaines actions » (versements à noter, épargne à déclarer ou réajuster, leviers chiffrés), épargne, fonds de sécurité. Cliquer sur un objectif ouvre toujours son détail.

#### 5.8 Objectif (détail)
- **Objectif** : savoir quand et comment l'atteindre.
- **Données** : progression, restant, effort mensuel et hebdo nécessaire, date estimée par scénario, risque, historique des versements, graphique de trajectoire (réel plein, projeté hachuré, ligne cible).
- **Actions** : verser, modifier, simuler, marquer comme réalisé (crée l'achat sans double comptage), archiver.
- **Relations** : Simulateur pré-rempli, Calendrier (date cible).
- **Cas particuliers** : déjà atteint → célébration discrète + « Marquer comme réalisé ». Sans date → seule la date estimée est montrée. Hors de portée → ton neutre et trois leviers chiffrés.

#### 5.9 Simulateur
- **Objectif** : répondre aux questions « et si ».
- **Données** : voir § 4.5.
- **Actions** : modifier les leviers, comparer, enregistrer, appliquer au plan, réinitialiser.
- **Relations** : Objectifs, Mon plan.
- **État vide** : aucun objectif → simuler l'épargne cumulée seule.
- **Erreurs** : valeurs impossibles (versement > capacité) → le graphique montre le solde négatif et un message clair, pas de blocage.
- **Cas particuliers** : horizon long (36 mois) → avertissement « Plus l'horizon est long, plus la projection est incertaine ».

#### 5.10 Calendrier
- **Objectif** : voir quand l'argent entre et sort.
- **Données** : vue mois (grille) et vue liste. Événements : salaire, primes, charges, échéances de dette, ponctuels, dates cibles d'objectifs. Solde projeté du jour au survol.
- **Actions** : filtrer par type, cliquer un événement (détail + confirmer / modifier), ajouter un ponctuel daté.
- **Relations** : Mon plan, Mois, Objectifs.
- **État vide** : « Aucun événement prévu sur ce mois ».
- **Cas particuliers** : plusieurs événements le même jour → pastille « +3 ». Événement passé non confirmé → marqueur discret.

#### 5.11 Mon plan
- **Objectif** : définir ce qui génère le prévu.
- **Onglets** : Salaire & primes · Autres revenus · Charges & enveloppes · Dettes · Épargne.
- **Salaire & primes** : contrat actuel, historique des versions, liste des paies (prévues / reçues) avec leurs dates, primes prévues sur paie.
- **Données** : chaque élément avec montant, fréquence, prochaine date, certitude (revenus), équivalent mensuel. Totaux mensuels prévus en tête.
- **Actions** : ajouter, modifier, suspendre, terminer (date de fin), archiver.
- **Relations** : impacte Mois, Semaines, Calendrier, Objectifs, Simulateur.
- **État vide** : par onglet, avec suggestions.
- **Cas particuliers** : modification d'une charge → choix « à partir de maintenant » ou « depuis le début ». Le passé clôturé n'est jamais modifié. Dette soldée → passe en « Terminées ».
- **Totaux des charges (15/10/2026)** : au bas de chaque section de Charges & enveloppes, une ligne de total : charges fixes (« Ce mois-ci » et « Par mois »), enveloppes (« Ce mois-ci »), ponctuels (« Ce mois-ci » et « Tous à venir »). En bas de page, un bandeau « Total des charges · [mois] » avec le détail fixes, enveloppes, ponctuels et, s'il y en a, échéances de dettes. Tous ces montants viennent du moteur (`ResumeChargesDto`).
- **Épargne (depuis le lot 25)** : bandeau solde / réservé / disponible et « prévu ce mois-ci » (prévu, déjà versé, reste à verser) ; « Versements prévus » : le versement mensuel de chaque objectif sur le mois en cours, « Fait » ou « Noter » (versement pré-rempli) ; sans compte déclaré, le solde est « Non déclaré » et une invitation propose de déclarer le compte avec l'épargne déjà réservée ; puis comptes, mouvements, réservé par objectif (dont déjà de côté au départ, versement mensuel prévu).

#### 5.12 Réglages
- **Contenu** : profil, devise, mode de période (cycle de paie / calendaire), règle jour non ouvré, début de semaine, report hebdo, catégories, règles des scénarios, animations on / off, export / import, sauvegarde, réinitialisation du compte.
- **Cas particuliers** : changer le cycle de paie → aperçu de l'effet sur les périodes avant validation. Réinitialiser → double confirmation + export proposé avant.

---

### 6. Feedback utilisateur

| Situation | Feedback |
|---|---|
| Saisie validée | Toast court + chiffre concerné qui s'anime vers sa nouvelle valeur. |
| Suppression | Toast avec **Annuler** (8 s). |
| Action lourde (clôture, appliquer au plan, import) | Dialogue de confirmation avec résumé des effets. |
| Calcul en cours | Squelette fin ; pas de spinner plein écran. |
| Objectif atteint | Animation discrète de la barre + message. Pas de confettis. |
| Écart important | Badge doux sur la ligne, explication au survol. |

---

### 7. États d'erreur

- **Champ** : message sous le champ, en clair, avec la règle (« Entre un montant supérieur à 0 »).
- **Formulaire** : la saisie est toujours conservée en cas d'échec.
- **Carte** : chaque carte échoue seule, avec « Réessayer ».
- **Page** : serveur injoignable → bandeau en haut « Connexion au serveur perdue. Tes données ne sont pas perdues. » + réessai automatique.
- **Cohérence** : incohérence métier (réservé > épargne, dette sur-remboursée) → alerte avec action de correction, jamais de blocage silencieux.
- **Ton** : neutre, sans culpabilisation, sans jargon.

---

### 8. États vides

Chaque état vide contient :

1. Ce qui manque, en une phrase.
2. Pourquoi c'est utile, en une phrase.
3. Un bouton vers l'action.

Jamais de faux chiffres pour remplir un écran vide. Les démonstrations sont marquées « exemple ».

---

### 9. Grammaire réel / prévu / projeté

Appliquée partout, sans exception.

| Nature | Chiffre | Graphique | Étiquette |
|---|---|---|---|
| Réel | Couleur texte normale | Trait plein / barre pleine | Aucune |
| Prévu | Texte secondaire | Contour / pointillé | « prévu » |
| Projeté | Texte secondaire, italique léger | Zone hachurée | « projection » + scénario |

Totaux mixtes : « 6 200 DH · dont 4 100 réels ».

Chaque projection affiche ses hypothèses au survol ou sous un lien « Sur quoi repose ce calcul ? ».

---

### 10. Accessibilité

- Navigation complète au clavier, focus visible.
- Contraste AA minimum pour tout texte.
- Natures (réel / prévu / projeté) jamais signalées par la couleur seule : forme + étiquette.
- Graphiques accompagnés d'un résumé texte et d'un tableau accessible.
- Animations désactivées si `prefers-reduced-motion`, et bouton « animations off » dans le menu du profil et les réglages.
- Montants lus correctement par les lecteurs d'écran (« 10 000 dirhams »).

---

## Partie UI

> Ancien fichier `UI.md`. Titre d’origine : « MySalary — UI ».

> Direction : **l'interface du template `Templates/image.png`, reproduite à l'identique**, avec la sauge **#7D8C82** à la place du violet.
> Méthode : skill **UI-Stealer** — on garde la structure de l'image, on change la palette, on adapte le contenu.
> Thème clair uniquement.
> Révision du 07/10/2026 : la première version (rail en verre, fenêtre, fond nacré, police serif) s'éloignait du template ; elle est abandonnée à ta demande.

---

### 1. Analyse des sources

#### 1.1 Méthode

- Template : une capture d'écran (1342 × 958 px), page « Edit invoice » d'une app de facturation. Pas de code source.
- Couleurs relevées au pixel, zone par zone. Tailles mesurées sur la capture à ± 2 px.
- Rendu vérifié côte à côte dans le navigateur, à la même largeur (1342 px), et contrôlé par le DOM (styles calculés).

#### 1.2 Template — structure

| Zone | Observation |
|---|---|
| Barre supérieure | Fond blanc, hauteur ≈ 64 px. Logo à gauche, 5 liens icône + texte, à droite 2 boutons ronds (notifications, réglages), séparateur vertical, avatar rond. |
| Onglet actif | Texte couleur principale + trait de 2 px sous l'onglet. |
| Fil d'Ariane | Premier segment en couleur, reste en gris. Bouton d'action à droite dans une carte blanche. |
| Grille | 2 colonnes : principale ≈ 833 px, latérale ≈ 352 px, gouttière ≈ 48 px. Marge latérale ≈ 56 px. |
| Fond de page | `#F9FAFB`. |
| Cartes | Blanches, rayon ≈ 24 px, sans bordure visible, ombre quasi invisible, padding ≈ 28–30 px. |

#### 1.3 Template — composants

| Composant | Détail |
|---|---|
| Carte héro | Dégradé violet `#44459D` → `#5959A9`, rayon ≈ 28 px, grands cercles décoratifs plus clairs, texte blanc, ombre colorée diffuse. |
| Gros montant | ≈ 30 px, gras, noir. Unité en gris à côté du titre. |
| Bouton principal | Plein `#3633BF`, texte blanc semi-gras, hauteur ≈ 60 px, rayon ≈ 16 px, pleine largeur. |
| Bouton secondaire | Fond blanc ou teinté `#F4F5FC`, texte couleur principale, icône à gauche. |
| Bouton puce | Fond `#E2E5FD`, rayon ≈ 10 px, icône + texte petit. |
| Pastille d'état | Fond rouge très clair, texte rouge, rayon complet. |
| Champ | Hauteur ≈ 46 px, rayon ≈ 10 px, bordure 1 px très claire, préfixe d'unité gris. |
| Tableau | En-têtes petits, gris, sans majuscules. Filets fins. Pas de zébrage. |
| Totaux | Libellés gris à gauche, montants à droite, total final plus fort après un filet. |
| Menu « … » | Kebab gris en haut à droite des cartes. |

#### 1.4 Usage de la skill UI-Stealer

| Principe de la skill | Application |
|---|---|
| Garder la **structure** de l'image | Repris à l'identique : barre du haut, fil d'Ariane, grande carte + colonne latérale, bandeau, tableau en champs, totaux, boutons pleine largeur. |
| Changer la **palette** | Violet → sauge (§ 2). |
| Adapter le **contenu** au produit | La facture devient un **mois budgétaire** (voir la vitrine). |
| Animations douces, bouton « animations off », `prefers-reduced-motion` | Repris (apparition en cascade, transitions de page). Le bouton est dans les Réglages. |
| Vérifier par DOM, styles calculés, build et tests | Repris. |
| Style maison Melko (rail en verre, fenêtre, blobs, Instrument Serif, mascotte) | **Non repris** : absent du template. |

#### 1.5 Correspondance template → MySalary

| Élément du template | Couleur d'origine | MySalary |
|---|---|---|
| Bouton « Send Invoice », bouton `+`, soulignement de l'onglet actif, icône active | `#3633BF` | **`#7D8C82`** (`primaire`) |
| Liens, onglet actif, texte des boutons teintés et blancs | indigo foncé | `#4F6D5C` (`lien`) |
| Fond des boutons teintés (« Add Customer », « Customize ») | `#F4F5FC` | `#F3F5F3` (`teinte`) |
| Bandeau « Invoice Number » | `#3F409A` → `#5959A9` + cercles `#6A69B0` | `#535F57` → `#647369` + cercles `#8D9B92` |
| Fond de page | `#F9FAFB` | `#F9FAFB` (identique) |
| Texte principal / gris | quasi noir / `#75787B` | `#121413` / `#6F7276` |
| Filets et bordures de champs | `#EEEEEE` | `#EEEEEE` (identique) |
| Boutons ronds gris (cloche, réglages) | `#F6F7F9`, icône `#9FA5B8` | `#F6F7F9`, icône `#9AA0A6` |
| Pastille « Due on » | fond `#FCEFEF`, texte rouge | fond `#FCEFEF`, texte `#BF4040` |
| Avatar client | dégradé pêche | dégradé pêche (identique) |
| Interrupteur éteint | `#EDEFF5` | `#EDEFF3` |

Remplacements de contenu : logo « Paypay. » → « MySalary. » ; liens Dashboard / Invoices / Wallet / Activity / Help → Aujourd'hui / Mois / Année / Objectifs / Calendrier / Mon plan ; logo Wise et données de paiement supprimés.

---

### 2. Couleurs

Tokens dans `ui/tailwind.config.js`. Aucune couleur en dur dans les composants.

| Token | Valeur | Usage | Contraste |
|---|---|---|---|
| `primaire` | `#7D8C82` | Bouton plein, `+`, soulignement actif, icône active | texte blanc 3,5:1 → texte du bouton plein en 18 px gras (« grand texte » AA) |
| `primaire-survol` | `#6F7E74` | Survol du bouton plein | |
| `lien` | `#4F6D5C` | Liens, onglet actif, texte des boutons teintés / blancs, logo | 5,7:1 sur blanc |
| `teinte` / `teinte-fort` | `#F3F5F3` / `#E7ECE8` | Boutons teintés, puces, onglets | |
| `bandeau` | `#535F57` → `#647369`, cercles `#8D9B92` | Bandeau héro | texte blanc ≥ 5:1 |
| `page` | `#F9FAFB` | Fond de page | |
| `encre` / `encre-2` | `#121413` / `#3D4140` | Texte principal | |
| `gris` | `#6F7276` | Texte secondaire, libellés, en-têtes de tableau | 4,8:1 sur blanc |
| `gris-icone` / `gris-bouton` | `#9AA0A6` / `#F6F7F9` | Icônes inactives, boutons ronds | décoratif |
| `filet` / `filet-fort` | `#EEEEEE` / `#E2E4E7` | Filets, bordures de champs | |
| `interne` | `#FBFCFC` | Bloc interne (« Wire Transfer ») | |
| `alerte` | `#BF4040` sur `#FCEFEF` | Pastille d'alerte, écart défavorable | 4,7:1 |
| `positif` | `#2F7A5A` sur `#E7F2EC` | Écart favorable, objectif sûr | |
| `attention` | `#8F6218` sur `#F7EFDF` | Objectif fragile, à confirmer | |
| `info` | `#4F6B8A` sur `#EAEFF5` | Hypothèse, badge vérifié | |
| `peche` | `#F5BEA2` → `#F09463` | Avatars | |

#### 2.6 Couleurs de données

Validées au lot 2 avec le validateur de la skill `dataviz` (lisibilité, daltonisme). La première palette sauge pâle échouait : trop grise.

| Usage | Couleur |
|---|---|
| Série unique (rythme, trajectoire) | `sauge` `#7D8C82`, trait `sauge-700` |
| Revenus | `#3A74B8` bleu ardoise |
| Dépenses | `#D08A2E` cuivre (contraste < 3:1 → étiquettes ou légende visibles obligatoires) |
| Épargne | `#9C4F8C` prune |
| Cible d'objectif | `encre` en pointillé |
| Projection | trait pointillé + hachure `sauge-400` à 45° |

Règles :
- 3 séries maximum par graphique. Au-delà : regrouper en « Autres » ou découper en petits graphiques.
- Vert et terracotta sont réservés aux statuts (positif / négatif), jamais à une série.
- La répartition des dépenses par catégorie est un graphique à **une seule couleur** (barres triées, libellés à côté), pas un graphique multicolore.

---|---|
| Revenus | `sauge-700` `#545F57` |
| Dépenses | `#C9A38A` (sable rosé) |
| Épargne | `sauge` `#7D8C82` |
| Cible d'objectif | `encre` en pointillé |
| Projection | hachure `sauge-400` à 45° |
| Catégories (max 6) | `#7D8C82`, `#C9A38A`, `#8FA3B8`, `#B9A66B`, `#A08BA6`, `#6F9C93`, puis « Autres » en gris |

À valider au lot 2 avec la skill `dataviz` (écart entre séries, daltonisme).

---

### 3. Typographie

- **Plus Jakarta Sans** (400 à 800), hébergée localement. C'est la police libre la plus proche de la police géométrique du template (type Gilroy).
- Tous les montants en `tabular-nums`. Séparateur de milliers : espace insécable (`10 000 DH`). L'espace fine est trop étroite dans cette police.

| Token | Taille / interligne | Poids | Usage (élément du template) |
|---|---|---|---|
| `logo` | 22 / 28 | 800 | « Paypay. » |
| `nav` | 15 / 20 | 500 | Liens de navigation |
| `montant` | 30 / 36 | 700 | « $4,800.00 » |
| `titre` | 18 / 24 | 600 | « Dipa Inhouse », « Payment Method » |
| `titre-carte` | 16 / 22 | 500 | « Client Details », « Amount Due » |
| `texte` | 15 / 22 | 400 | Texte courant, adresses |
| `texte-sm` | 14 / 20 | 400 | En-têtes de tableau, sous-titres |
| `mention` | 12 / 16 | 500 | Badges |
| `bouton` | 17 / 22 | 600 | « Previews », « Download » |
| `bouton-plein` | 18 / 24 | 700 | « Send Invoice » |

---

### 4. Espacement, grille, rayons

| Mesure | Valeur (template) |
|---|---|
| Barre du haut | 64 px, blanche, collante |
| Marges latérales de page | 56 px (bureau), 20 px (mobile) |
| Grille | carte principale fluide + colonne latérale **352 px**, gouttière 48 px |
| Padding de la grande carte | 30 px |
| Padding des cartes latérales | 24 px |
| Écart entre cartes latérales | 32 px |

| Rayon | Valeur | Usage |
|---|---|---|
| `champ` | 12 px | Champs, cellules, bouton « menu » |
| `bouton` | 16 px | Boutons 52–60 px, bloc interne |
| `carte` / `bandeau` | 24 px | Cartes, bandeau |
| `pilule` | 999 px | Boutons ronds, avatars, pastilles |

---

### 5. Mise en page

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ MySalary.  ▦ Aujourd'hui  ▤ Mois  ▥ Année  ◎ Objectifs  ▣ Calendrier  ▭ Mon plan   (🔔)(⚙) │ (O) │
│                        ‾‾‾‾‾‾‾ soulignement de l'onglet actif                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Mois / février 2027 (27 janv. → 26 févr.)                      [Gérer le mois ▾] │
│ ┌───────────────────────────────────────────┐  ┌──────────────────┐            │
│ │ (O) Oussama                  lignes grises │  │ Objectif …   ••• │            │
│ │ ┌───────── bandeau sauge + cercles ───────┐│  └──────────────────┘            │
│ │ └─────────────────────────────────────────┘│  ┌──────────────────┐            │
│ │ Détail du mois                [Personnaliser]│ │ Reste à dépenser │            │
│ │ ligne │ prévu │ réel │ écart │ (+)          │  └──────────────────┘            │
│ │ Épargne du mois        │ totaux             │  [Aperçu] [Exporter]           ›│
│ └───────────────────────────────────────────┘  [ Ajouter une dépense ]         │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Sous 1024 px : les liens quittent la barre du haut pour une barre d'onglets blanche en bas (4 liens + bouton `+` central). Les colonnes passent l'une sous l'autre.
- Le bouton rond « › » collé au bord droit n'apparaît qu'en très grand écran (≥ 1280 px).

---

### 6. Ombres

| Token | Valeur | Usage |
|---|---|---|
| `carte` | `0 4px 30px -6px rgba(17,20,19,.04)` | Cartes (presque invisible, comme le template) |
| `bouton` | `0 2px 12px -2px rgba(17,20,19,.05)` | Boutons blancs, bloc interne, pouce de l'interrupteur |
| `bandeau` | `0 22px 40px -22px rgba(74,86,78,.55)` | Halo coloré sous le bandeau |
| `flottant` | `0 8px 24px -6px rgba(17,20,19,.16)` | Bouton « › », bouton `+` mobile, panneau |
| `focus` | anneau 3 px sauge à 30 % | Focus clavier |

Pas d'effet glass dans l'interface (absent du template). Seuls les toasts et infobulles utilisent un fond sombre translucide.

---

### 7. Composants

Tous visibles sur la vitrine (`/vitrine`). Noms en français (règle de la skill).

| Composant | Élément du template |
|---|---|
| `Entete` | Barre du haut : logo, liens icône + texte, onglet actif souligné, boutons ronds, séparateur, avatar |
| `BarreOngletsMobile` | Équivalent mobile de la barre du haut |
| `FilAriane` | « Invoices / edit invoice (INV-…) » + action à droite |
| `Bouton` `menu` | « Manage Invoice ▾ » |
| `Carte` (+ `TitreSection`, `Separateur`) | Cartes blanches, titre + « ••• », titre de section + sous-titre |
| `Identite`, `Avatar` | « Dipa Inhouse » / « Zaky Grizzly » (avatar + nom + ligne grise, badge vérifié) |
| `CarteBandeau` | Bandeau « Invoice Number / Billed to » |
| `Bouton` `puce` | « Customize » |
| `Cellule`, `Champ`, `ChampMontant` | Champs du tableau (« $ 40.00 »), « Description » |
| icône `IconePlusRond` | Bouton `+` de ligne |
| `Paire`, bloc `interne` | « Wire Transfer » : clé grise, valeur foncée |
| `BlocTotaux` | Sub Total / Discount / Total tax / Total Amount |
| `Bouton` `teinte` | « Add Customer » |
| `Pastille` | « Due on Jan 20, 2022 » |
| `Interrupteur` | « Also attach pdf in mail » |
| `Bouton` `blanc` | « Previews », « Download » |
| `Bouton` `principal` | « Send Invoice » |
| `BoutonFlottant` | « › » au bord droit |
| Icônes pleines (`icones.tsx`) | Icônes duotones du template (Lucide n'a pas d'équivalent plein) |

Composants MySalary dans le même style : `Montant`, `Kpi`, `BadgeNature`, `BadgeRisque`, `BadgeExemple`, `BarreProgression`, `Tableau`, `Onglets`, `Pilule`, `Panneau`, `Notifications`, graphiques.

Composants des tableaux de bord (lot 27, `ui/src/components/premium/`), inspirés de [Lightswind UI](https://lightswind.com/) (licence MIT) et ramenés à la charte : pas de nouvelle couleur, pas de nouvelle dépendance.

| Composant | Rôle | Origine |
|---|---|---|
| `CarteLumineuse` | Carte blanche ; au survol, un halo sauge suit le pointeur. Désactivé si les animations sont coupées ou au toucher. | Glowing Cards (Lightswind), adapté |
| `AnneauProgression` | Anneau de progression (rôle `progressbar`), contenu au centre, tracé animé à l'arrivée. | Création, dans l'esprit des widgets d'analytics Lightswind |
| `TuileIndicateur` | Indicateur en tuile : icône ou anneau, libellé, nature (projection), valeur forte, détail. Deux par ligne sur téléphone (visuel masqué). | Création, sur `CarteLumineuse` |
| `Montant` avec `anime` | Compteur qui monte jusqu'à la valeur (déjà présent depuis le lot 2). | Équivalent de Count Up (Lightswind) |

---

### 8. Graphiques

Recharts, habillé par un thème commun.

| Besoin | Type |
|---|---|
| Rythme de dépense du mois | Aire cumulée réelle + ligne prévue pointillée |
| Revenus / dépenses / épargne par mois | Barres groupées fines, rayon haut 6 px |
| Trajectoire d'objectif | Tracé SVG sur mesure (sans bibliothèque), page Objectifs et page d'un objectif : courbe réelle lissée (halo sauge, tracée à l'ouverture) sur voile dégradé, projection en pointillé sous voile hachuré, cible en étiquette noire, point « Aujourd'hui » lumineux avec son montant, survol avec repère et infobulle. Courbe monotone : aucune bosse inventée. |
| Répartition des dépenses | Barres horizontales triées (pas de camembert) |
| KPI | Sparkline sans axes |

Règles :
- Axes fins `filet`, graduations `mention` `meta`, quadrillage horizontal très léger.
- Pas de légende pour une seule série. Sinon en haut à gauche, en ligne.
- Infobulle `verre-sombre` : date, valeur, nature.
- La zone projetée commence toujours par une ligne verticale « aujourd'hui ».
- Dégradé doux sous les aires (`sauge` 18 % → 0 %).
- Animation d'entrée 600 ms, une seule fois.
- Équivalent texte pour l'accessibilité.

---

### 9. Animations

framer-motion, variantes partagées : apparition en cascade des blocs, transition douce entre pages, compteur animé sur le montant clé, panneau qui glisse.

- Bascule « animations off » dans les Réglages (lot 3) ; `prefers-reduced-motion` respecté.
- Rien ne bouge en boucle.

---

### 10. Icônes

- Navigation, boutons ronds et actions : **icônes pleines dessinées pour MySalary** (`ui/src/components/icones.tsx`), dans le style duotone du template : glyphe gris `#9AA0A6`, actif en sauge, détails « percés » en blanc.
- Petites icônes utilitaires (chevrons, alerte) : Lucide.

---

### 11. Responsive

| Largeur | Adaptation |
|---|---|
| ≥ 1280 | Identique au template, bouton « › » visible |
| 1024–1279 | Même grille, marges réduites |
| < 1024 | Liens en barre du bas ; colonne latérale sous la carte principale |
| < 640 | Bandeau et en-têtes en une colonne ; tableaux défilent dans leur carte |

Aucun défilement horizontal de page (vérifié à 375 px).

---

### 12. Règles de cohérence

1. Toute nouvelle page reprend la structure du template : fil d'Ariane, carte principale, colonne latérale de 352 px.
2. Un seul bouton plein par écran, en bas de la colonne latérale.
3. Un seul montant de 30 px par carte.
4. Couleur d'alerte seulement si une action est utile.
5. Réel / prévu / projeté : même badge, même hachure, partout.
6. Montants en `tabular-nums`, format `10 000 DH`.
7. Pas plus de 3 séries par graphique.
8. Aucune couleur, ombre ou rayon en dur hors des tokens.
9. Tout nouveau composant passe d'abord par la vitrine.
10. Si un élément ne figure pas dans le template, il doit en suivre le style (cartes blanches, rayons, gris, sauge).
