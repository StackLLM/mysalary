# MySalary — UX

> Logique d'usage : architecture, navigation, parcours, pages, états.
> Les règles métier sont dans `context.md`. Le style visuel dans `UI.md`.

---

## 1. Principes

1. **Une question par écran.** La réponse en gros, le détail dessous.
2. **L'ordre de lecture suit l'ordre des questions** : où j'en suis → ce que j'ai dépensé → ce qu'il me reste → ce que je peux épargner → quand j'atteins mes objectifs.
3. **Confirmer plutôt que ressaisir.** Le prévu devient réel en un geste.
4. **Le réel, le prévu et le projeté ne se confondent jamais** (voir § 9).
5. **Moins d'une minute par jour.** Une dépense se note en 3 gestes.
6. **Calme.** Une alerte n'apparaît que si une action est utile.
7. **Tout est réversible.** Annuler après chaque action, corbeille douce.
8. **Pas de cul-de-sac.** Chaque état vide propose l'action suivante.

---

## 2. Architecture de l'information

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

## 3. Navigation

Structure du template `Templates/image.png`. Détail visuel dans `UI.md` § 5.

### Bureau (≥ 1024 px)

Barre du haut blanche, comme le template.

```text
MySalary.  ▦ Aujourd'hui  ▤ Mois  ▥ Année  ◎ Objectifs  ▣ Calendrier  ▭ Mon plan        (🔔) (⚙) │ (O)
```

- Onglet actif : texte coloré + icône sauge + trait de 2 px sous l'onglet.
- À droite : notifications, réglages (boutons ronds gris), séparateur, avatar du profil (menu : changer de profil).
- Sous la barre : **fil d'Ariane** (ex. « Mois / février 2027 (27 janv. → 26 févr.) ») et, à droite, le bouton menu de la page (ex. « Gérer le mois ▾ »).
- L'action principale de la page (ex. « Ajouter une dépense ») est le grand bouton plein en bas de la colonne latérale, comme « Send Invoice ».
- Raccourcis clavier : `N` nouvelle dépense, `S` simulateur, `←` `→` période précédente / suivante.

### Tablette et mobile (< 1024 px)

Les liens quittent la barre du haut. Barre d'onglets blanche en bas :

```text
Aujourd'hui · Mois · [ + ] · Objectifs · Mon plan
```

- `+` ouvre la saisie rapide (dépense, revenu reçu, versement objectif).
- Année, Calendrier, Simulateur et Réglages restent accessibles depuis Aujourd'hui, le fil d'Ariane et le bouton réglages.

### Sélecteur de période

Présent sur Mois, Année, Calendrier. Flèches + libellé cliquable (« Janvier 2027 · 27 déc. → 26 janv. »).

Les dates affichées sont celles des paies (réelles si reçues, sinon prévues, marquées « prévu »).

La période choisie est conservée quand on passe d'une page à l'autre.

---

## 4. Parcours

### 4.0 Choix du profil

1. Au lancement, l'écran **Profils** montre les comptes existants (cartes avec prénom et initiale).
2. Un clic ouvre le compte. Le choix est retenu pour la prochaine visite.
3. **Nouveau compte** : prénom + devise → onboarding.
4. Changer de profil : menu de l'avatar.

Mention discrète sur l'écran : « Pas de mot de passe pour l'instant : n'utilise MySalary que sur ton ordinateur. »

### 4.1 Onboarding

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

### 4.2 Confirmation de la paie

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

### 4.3 Ajout d'une dépense

1. `+ Dépense` (ou `N`, ou `+` mobile) ouvre un panneau latéral (feuille du bas sur mobile).
2. **Montant** en premier, focus automatique, clavier numérique sur mobile.
3. **Catégorie** : puces des 6 plus utilisées + « Autre ».
4. Date (aujourd'hui par défaut), libellé et note facultatifs.
5. Si la catégorie correspond à une charge prévue non payée : « Est-ce le paiement de *Téléphone (100 DH)* ? » → lien automatique.
6. Valider (`Entrée`). Toast avec Annuler. Le panneau peut rester ouvert pour enchaîner (« Ajouter une autre »).

Retour immédiat : la carte « Reste semaine » se met à jour sous les yeux.

### 4.4 Création d'un objectif

1. Objectifs → **Nouvel objectif**.
2. Type (moto, voiture, voyage, ordinateur, logement, investissement, fonds de sécurité, autre). Le type ne sert qu'à l'icône et aux suggestions.
3. Nom, montant cible, déjà disponible.
4. Date souhaitée (facultative), priorité (glisser dans la liste ou 1–5).
5. Versement mensuel souhaité (facultatif).
6. **Aperçu en direct** à droite : date estimée par scénario, effort nécessaire, risque. Tout est marqué « projection ».
7. Si la capacité ne suffit pas : message neutre + 2 propositions (repousser la date, augmenter le versement, réduire une enveloppe).
8. Créer → page détail de l'objectif.

Fonds de sécurité : cible proposée = 3 à 6 mois de charges essentielles, explicitement calculée et modifiable.

### 4.5 Simulation

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

### 4.6 Suivi hebdomadaire

1. Lundi, Aujourd'hui affiche le bilan de la semaine passée : budget flexible, dépensé, écart, comparaison aux semaines précédentes.
2. Mois → onglet **Semaines** : une ligne par semaine de la période.
3. Chaque semaine : budget disponible, dépenses prévues (charges fixes datées), dépenses réelles, reste, épargne, écart, tendance.
4. Option dans les réglages : reporter le reste d'une semaine sur la suivante (désactivé par défaut).

Question à laquelle l'écran répond : **« Est-ce que je respecte mon budget ce mois-ci ? »**
Réponse en tête : « Oui, avec 340 DH d'avance » / « 120 DH au-dessus du rythme prévu ».

### 4.7 Suivi mensuel

1. Mois → vue d'ensemble de la période sélectionnée.
2. En tête : reste réel, épargne réelle vs prévue, écart global.
3. Tableau prévu vs réel par ligne (revenus, charges fixes, enveloppes, dettes, ponctuels, épargne).
4. Chaque ligne prévue non confirmée a une action **Confirmer**.
5. Fin de période : bandeau « Octobre est terminé. Vérifie et clôture. » → résumé → **Clôturer**.
6. Navigation vers les mois précédents (réel figé) et futurs (prévu + projeté).

### 4.8 Suivi annuel

1. Année → 12 périodes de l'année choisie.
2. En tête : revenus, dépenses, épargne de l'année (réel à date + projeté restant, séparés).
3. Graphique mensuel revenus / dépenses / épargne.
4. Mois les plus coûteux, part variable du revenu, évolution de l'épargne cumulée.
5. Progression de chaque objectif sur l'année.
6. Clic sur un mois → page Mois.

---

## 5. Pages

Format pour chaque page : objectif · données · actions · relations · état vide · erreurs · cas particuliers.

### 5.0 Profils
- **Objectif** : choisir le compte dont on voit les données.
- **Données** : cartes des comptes (initiale, prénom, date de dernière utilisation).
- **Actions** : ouvrir un compte, créer un compte, renommer, supprimer (double confirmation : retaper le prénom ; export proposé avant à partir du lot 17).
- **Relations** : mène à Onboarding (nouveau compte ou onboarding non terminé) ou à Aujourd'hui.
- **État vide** : aucun compte → « Crée ton compte pour commencer » + bouton.
- **Erreurs** : serveur injoignable → message + réessayer.
- **Cas particuliers** : compte retenu supprimé entre-temps → retour à la liste avec message.

### 5.1 Onboarding
- **Objectif** : comprendre la situation financière de départ.
- **Données** : voir § 4.1.
- **Actions** : suivant, précédent, passer, terminer.
- **Relations** : alimente Mon plan, Épargne, Objectifs. Mène à Aujourd'hui.
- **État vide** : n/a.
- **Erreurs** : champ invalide → message sous le champ (« Le montant doit être positif »). Sauvegarde échouée → bandeau + réessayer, saisie conservée.
- **Erreurs d'import** : fichier illisible ou inconnu → « Ce fichier n'est pas un export MySalary ou money-guru » + continuer sans import. Ligne incohérente → signalée, ignorée par défaut.
- **Cas particuliers** : aucun salaire fixe (revenus seulement variables) → l'étape 3 propose « Mes revenus varient » et passe en mode sources multiples. Utilisateur qui quitte → reprise à la dernière étape.

### 5.2 Aujourd'hui
- **Objectif** : où j'en suis, en 5 secondes.
- **Données** (dans l'ordre) :
  1. Carte héro : **reste à dépenser ce mois**, jours restants, montant par jour.
  2. Reste flexible de la semaine + barre de rythme.
  3. Actions attendues : salaire à confirmer, charges du jour, échéance de dette.
  4. Épargne du mois : prévue vs réelle.
  5. Objectif prioritaire : progression, date estimée, risque.
  6. Prochains 7 jours (extrait du calendrier).
  7. 1 à 3 recommandations.
- **Actions** : confirmer, ajouter une dépense, ouvrir un objectif, ouvrir le mois.
- **Relations** : Mois, Objectifs, Calendrier, Simulateur.
- **État vide** : plan incomplet → « Ajoute ton salaire pour voir ton reste du mois » + bouton.
- **Erreurs** : chargement échoué → cartes en état d'erreur individuel avec « Réessayer ». Le reste de la page s'affiche.
- **Cas particuliers** : reste négatif → ton neutre, montant en couleur d'alerte, une recommandation concrète. Avant le premier salaire confirmé → afficher le prévu, marqué « prévu ».

### 5.3 Mois
- **Objectif** : comparer prévu et réel sur une période.
- **Données** : en-tête (reste, épargne, écart), tableau prévu / réel / écart par ligne, graphique de rythme cumulé (réel vs ligne prévue), onglets Semaines et Dépenses.
- **Actions** : changer de période, confirmer une ligne, ajouter une dépense, modifier une dépense, clôturer / rouvrir.
- **Relations** : Aujourd'hui, Année, Mon plan (modifier la source d'une ligne prévue), Calendrier.
- **État vide** : aucune dépense → « Aucune dépense notée sur cette période » + ajouter. Période future → prévisions seules, bandeau « Mois à venir ».
- **Erreurs** : clôture impossible (lignes non confirmées) → liste des lignes concernées, possibilité de clôturer quand même avec mention.
- **Cas particuliers** : mois clôturé → lecture seule, badge « Clôturé ». Changement du jour de paie → les périodes passées clôturées gardent leurs dates.

### 5.4 Mois → Semaines
- **Objectif** : savoir si je tiens mon rythme.
- **Données** : par semaine : budget flexible, charges prévues datées, réel, reste, épargne, écart, tendance vs moyenne des 4 dernières semaines.
- **Actions** : ouvrir une semaine (liste des dépenses), ajouter une dépense datée.
- **Relations** : Dépenses du mois, Aujourd'hui.
- **État vide** : pas d'enveloppe définie → « Définis tes enveloppes pour suivre la semaine » → Mon plan.
- **Erreurs** : standard.
- **Cas particuliers** : semaines partielles en début / fin de période → budget proratisé, mention « 3 jours ».

### 5.5 Mois → Dépenses
- **Objectif** : retrouver et corriger les dépenses.
- **Données** : liste groupée par jour, filtre par catégorie, total filtré.
- **Actions** : ajouter, modifier, supprimer (avec Annuler), lier à une charge prévue.
- **État vide** : comme 5.3.
- **Cas particuliers** : dépense datée hors période affichée → elle est rangée dans la bonne période, toast « Ajoutée à novembre ».

### 5.6 Année
- **Objectif** : comprendre l'année sans lire chaque mois.
- **Données** : voir § 4.8.
- **Actions** : changer d'année, ouvrir un mois, ouvrir un objectif.
- **Relations** : Mois, Objectifs.
- **État vide** : première année incomplète → mois passés sans données grisés, « Pas de données avant ton inscription ».
- **Cas particuliers** : année future → entièrement projetée, bandeau explicite.

### 5.7 Objectifs (liste)
- **Objectif** : voir tous les objectifs et leur ordre.
- **Données** : carte par objectif : progression, épargné / cible, date estimée, date souhaitée, risque. Total réservé vs épargne disponible.
- **Actions** : créer, réordonner la priorité (glisser), mettre en pause, archiver.
- **Relations** : Détail, Simulateur, Épargne.
- **État vide** : illustration sobre + « Crée ton premier objectif » + exemples de types.
- **Erreurs** : réservé > solde déclaré → alerte « Tes objectifs réservent plus que ton épargne déclarée » + action réajuster.
- **Cas particuliers** : objectifs réalisés → section repliée « Réalisés ».

### 5.8 Objectif (détail)
- **Objectif** : savoir quand et comment l'atteindre.
- **Données** : progression, restant, effort mensuel et hebdo nécessaire, date estimée par scénario, risque, historique des versements, graphique de trajectoire (réel plein, projeté hachuré, ligne cible).
- **Actions** : verser, modifier, simuler, marquer comme réalisé (crée l'achat sans double comptage), archiver.
- **Relations** : Simulateur pré-rempli, Calendrier (date cible).
- **Cas particuliers** : déjà atteint → célébration discrète + « Marquer comme réalisé ». Sans date → seule la date estimée est montrée. Hors de portée → ton neutre et trois leviers chiffrés.

### 5.9 Simulateur
- **Objectif** : répondre aux questions « et si ».
- **Données** : voir § 4.5.
- **Actions** : modifier les leviers, comparer, enregistrer, appliquer au plan, réinitialiser.
- **Relations** : Objectifs, Mon plan.
- **État vide** : aucun objectif → simuler l'épargne cumulée seule.
- **Erreurs** : valeurs impossibles (versement > capacité) → le graphique montre le solde négatif et un message clair, pas de blocage.
- **Cas particuliers** : horizon long (36 mois) → avertissement « Plus l'horizon est long, plus la projection est incertaine ».

### 5.10 Calendrier
- **Objectif** : voir quand l'argent entre et sort.
- **Données** : vue mois (grille) et vue liste. Événements : salaire, primes, charges, échéances de dette, ponctuels, dates cibles d'objectifs. Solde projeté du jour au survol.
- **Actions** : filtrer par type, cliquer un événement (détail + confirmer / modifier), ajouter un ponctuel daté.
- **Relations** : Mon plan, Mois, Objectifs.
- **État vide** : « Aucun événement prévu sur ce mois ».
- **Cas particuliers** : plusieurs événements le même jour → pastille « +3 ». Événement passé non confirmé → marqueur discret.

### 5.11 Mon plan
- **Objectif** : définir ce qui génère le prévu.
- **Onglets** : Salaire & primes · Autres revenus · Charges & enveloppes · Dettes · Épargne.
- **Salaire & primes** : contrat actuel, historique des versions, liste des paies (prévues / reçues) avec leurs dates, primes prévues sur paie.
- **Données** : chaque élément avec montant, fréquence, prochaine date, certitude (revenus), équivalent mensuel. Totaux mensuels prévus en tête.
- **Actions** : ajouter, modifier, suspendre, terminer (date de fin), archiver.
- **Relations** : impacte Mois, Semaines, Calendrier, Objectifs, Simulateur.
- **État vide** : par onglet, avec suggestions.
- **Cas particuliers** : modification d'une charge → choix « à partir de maintenant » ou « depuis le début ». Le passé clôturé n'est jamais modifié. Dette soldée → passe en « Terminées ».

### 5.12 Réglages
- **Contenu** : profil, devise, mode de période (cycle de paie / calendaire), règle jour non ouvré, début de semaine, report hebdo, catégories, règles des scénarios, animations on / off, export / import, sauvegarde, réinitialisation du compte.
- **Cas particuliers** : changer le cycle de paie → aperçu de l'effet sur les périodes avant validation. Réinitialiser → double confirmation + export proposé avant.

---

## 6. Feedback utilisateur

| Situation | Feedback |
|---|---|
| Saisie validée | Toast court + chiffre concerné qui s'anime vers sa nouvelle valeur. |
| Suppression | Toast avec **Annuler** (8 s). |
| Action lourde (clôture, appliquer au plan, import) | Dialogue de confirmation avec résumé des effets. |
| Calcul en cours | Squelette fin ; pas de spinner plein écran. |
| Objectif atteint | Animation discrète de la barre + message. Pas de confettis. |
| Écart important | Badge doux sur la ligne, explication au survol. |

---

## 7. États d'erreur

- **Champ** : message sous le champ, en clair, avec la règle (« Entre un montant supérieur à 0 »).
- **Formulaire** : la saisie est toujours conservée en cas d'échec.
- **Carte** : chaque carte échoue seule, avec « Réessayer ».
- **Page** : serveur injoignable → bandeau en haut « Connexion au serveur perdue. Tes données ne sont pas perdues. » + réessai automatique.
- **Cohérence** : incohérence métier (réservé > épargne, dette sur-remboursée) → alerte avec action de correction, jamais de blocage silencieux.
- **Ton** : neutre, sans culpabilisation, sans jargon.

---

## 8. États vides

Chaque état vide contient :

1. Ce qui manque, en une phrase.
2. Pourquoi c'est utile, en une phrase.
3. Un bouton vers l'action.

Jamais de faux chiffres pour remplir un écran vide. Les démonstrations sont marquées « exemple ».

---

## 9. Grammaire réel / prévu / projeté

Appliquée partout, sans exception.

| Nature | Chiffre | Graphique | Étiquette |
|---|---|---|---|
| Réel | Couleur texte normale | Trait plein / barre pleine | Aucune |
| Prévu | Texte secondaire | Contour / pointillé | « prévu » |
| Projeté | Texte secondaire, italique léger | Zone hachurée | « projection » + scénario |

Totaux mixtes : « 6 200 DH · dont 4 100 réels ».

Chaque projection affiche ses hypothèses au survol ou sous un lien « Sur quoi repose ce calcul ? ».

---

## 10. Accessibilité

- Navigation complète au clavier, focus visible.
- Contraste AA minimum pour tout texte.
- Natures (réel / prévu / projeté) jamais signalées par la couleur seule : forme + étiquette.
- Graphiques accompagnés d'un résumé texte et d'un tableau accessible.
- Animations désactivées si `prefers-reduced-motion`, et bouton « animations off » dans le menu du profil et les réglages.
- Montants lus correctement par les lecteurs d'écran (« 10 000 dirhams »).
