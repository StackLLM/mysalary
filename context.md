# MySalary — Contexte produit

> Ce document décrit **pourquoi** MySalary existe et **comment** il raisonne.
> Le plan de réalisation est dans `Plan.md`. Les parcours dans `UX.md`. Le style dans `UI.md`.

---

## 1. Le problème

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

## 2. Les utilisateurs

### Utilisateur principal (v1)

Un salarié au Maroc, revenus en dirhams (MAD).

- Salaire fixe net mensuel, versé à date fixe (ex. le 28).
- Primes ponctuelles ou périodiques, parfois connues, parfois estimées.
- Charges mensuelles modestes et lisibles : téléphone, abonnements, sport, aide familiale.
- Engagements ponctuels : dette envers un proche, assurance annuelle, permis.
- Un ou plusieurs objectifs d'achat importants (moto, voiture, voyage, ordinateur).
- Un projet à côté (ex. SaaS) qui pourra un jour générer un revenu.

Ce qu'il attend : **voir clair**, **décider**, **se sentir en contrôle**. Pas de jargon, pas de conseil d'investissement.

### Comptes

Plusieurs comptes peuvent exister dans la base. Chaque compte a ses propres données, totalement séparées. Il n'y a pas de mot de passe en v1 : on choisit son profil au lancement.

### Utilisateurs futurs

- Salariés avec revenus variables importants (commerciaux, primes trimestrielles).
- Freelances avec revenus irréguliers (le modèle « source + certitude » le permet déjà).

---

## 3. Les objectifs du produit

1. Rendre la situation **lisible en quelques secondes**.
2. Remplacer les tableaux manuels par un **moteur fiable et testé**.
3. Comparer en continu **prévu et réel**.
4. Donner une **date** pour chaque objectif, avec un niveau de risque honnête.
5. Proposer des **actions concrètes**, jamais des promesses.

---

## 4. Comment ça fonctionne

### 4.1 La boucle

```text
1. Je décris mon plan     → revenus, charges, dettes, objectifs (prévu)
2. Je vis mon mois        → je confirme le salaire, je note mes dépenses (réel)
3. Le moteur compare      → écarts, reste, épargne, tendance
4. Le moteur projette     → dates d'objectifs, scénarios (projeté)
5. Il propose             → recommandations
6. Je clôture le mois     → le réel est figé, le mois suivant commence
```

### 4.2 Le prévu se confirme

Le plan génère des événements attendus : salaire du 28, charge téléphone du 5, échéance de dette.

Quand l'événement arrive, l'utilisateur le **confirme** en un geste, ou corrige le montant. Il ne ressaisit rien.

C'est ce qui rend le suivi tenable au quotidien.

### 4.3 Le salaire et le cycle de paie

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

### 4.4 Trois natures de chiffres

| Nature | D'où vient-il ? | Peut-il changer ? | Affichage |
|---|---|---|---|
| Réel | Saisi ou confirmé | Seulement par l'utilisateur | Plein |
| Prévu | Le plan de l'utilisateur | Quand le plan change | Contour |
| Projeté | Calcul du moteur + hypothèses | À chaque recalcul | Hachuré + mention « projection » |

Un total qui mélange plusieurs natures l'indique toujours (ex. « 6 200 DH dont 4 100 réels »).

### 4.5 La certitude des revenus

Chaque revenu prévu a un niveau :

- **Garanti** : salaire fixe, prime contractuelle.
- **Probable** : prime habituelle, non écrite.
- **Incertain** : prime variable, revenu SaaS futur.

Les scénarios s'appuient dessus :

- **Prudent** : garanti seulement.
- **Réaliste** : garanti + probable.
- **Ambitieux** : tout.

---

## 5. Règles métier

### Revenus
- R1. Un revenu a une source, un montant, une fréquence, une date, une certitude.
- R2. Fréquences : mensuelle, trimestrielle, annuelle, ponctuelle, mois choisis.
- R3. Un revenu reçu (réel) peut être lié à une source prévue ou être libre.
- R4. Si le montant reçu diffère du prévu, l'écart est affiché, le prévu n'est pas modifié.
- R5. Un revenu futur hypothétique (ex. SaaS) n'entre jamais dans le scénario réaliste par défaut.

### Charges et dépenses
- R6. Charge **fixe** : montant et date connus (téléphone, abonnement).
- R7. **Enveloppe** : budget flexible sur la période (nourriture, transport, loisirs), réparti par semaine.
- R8. Charge **ponctuelle** : événement daté unique (assurance de décembre, permis).
- R9. **Dette** : total + échéancier. Elle disparaît des prévisions une fois soldée.
- R10. Une dépense réelle peut être liée à une charge prévue. Sinon elle s'impute à une enveloppe ou à « hors plan ».
- R11. L'épargne et les versements aux objectifs ne sont **jamais** des dépenses.

### Épargne
- R12. **Solde déclaré** : ce que l'utilisateur a réellement de côté.
- R13. **Réservé** : la part attribuée aux objectifs.
- R14. **Disponible** = solde déclaré − réservé. Ne peut pas être négatif ; sinon une alerte demande de réajuster.
- R15. **Capacité d'épargne** d'une période = revenus − charges (prévus ou réels selon la vue).

### Objectifs
- R16. Un objectif a une cible, un montant initial, une priorité, et optionnellement une date et un versement mensuel.
- R17. Le moteur calcule : restant, progression, effort nécessaire, date estimée par scénario, risque de retard.
- R18. La capacité est répartie par priorité. La somme des versements ne dépasse jamais la capacité.
- R19. Un objectif réalisé consomme son épargne. L'achat n'est pas compté une seconde fois.
- R20. Deux objectifs liés (moto et permis) restent séparés pour éviter le double comptage.

### Périodes
- R21. Une période passée peut être **clôturée** : son réel est figé dans un instantané.
- R22. Une période clôturée peut être rouverte, avec trace.
- R23. La période en cours combine réel à date et prévu restant.

### Recommandations
- R24. Chaque recommandation affiche sa base de calcul et ses hypothèses.
- R25. Aucune formulation de garantie. Toujours une condition.
- R26. Pas de conseil d'investissement personnalisé.

### Salaire
- R27. Le contrat de salaire est versionné ; un changement ne modifie jamais les paies passées.
- R28. Une paie est prévue jusqu'à confirmation ; la date réelle confirmée fixe les bornes des mois budgétaires.
- R29. Le mois financé est proposé (mois suivant la date de paie) et reste modifiable.
- R30. Le jour de la paie appartient au nouveau mois budgétaire.

---

## 6. Données

### Ce qui est collecté

| Domaine | Données |
|---|---|
| Profil | Prénom, devise (MAD), jour de paie, mode de période. |
| Revenus | Salaire fixe, primes (montant, fréquence, mois, certitude), revenus variables, autres revenus. |
| Charges | Crédits, dettes, abonnements, assurances, aide familiale, télécoms, sport, enveloppes flexibles, ponctuelles connues. |
| Épargne | Solde actuel, montants déjà réservés. |
| Objectifs | Nom, type, cible, déjà disponible, date souhaitée, priorité, versement souhaité. |
| Réel | Revenus reçus, dépenses, paiements de dette, versements aux objectifs. |

### Ce qui n'est pas collecté
- Identifiants bancaires, numéros de compte ou de carte.
- Données d'identité.
- Données de localisation.

### Données existantes
L'ancien export money-guru et l'étude HTML contiennent des chiffres **contradictoires** (voir `Plan.md` § 2.1).

Ils servent de **V0** : une source d'idées, pas une logique à reprendre.

L'onboarding propose de les **importer**. L'import propose chaque ligne ; l'utilisateur importe, modifie ou ignore. Tout ce qui est importé reste **prévu** tant qu'il n'est pas confirmé. Le détail est dans `Plan.md` § 7.1 bis.

---

## 7. Contraintes

- **Fiabilité** : un calcul faux détruit la confiance. Le moteur est isolé et testé.
- **Simplicité** : l'utilisateur doit s'en servir en moins d'une minute par jour.
- **Confidentialité** : données locales, séparées par compte, aucun service tiers.
- **Thème** : clair uniquement, interface du template `Templates/image.png`.
- **Honnêteté** : jamais de projection présentée comme certaine. Jamais de donnée fictive présentée comme réelle.
- **Précision** : centimes entiers, dates civiles, pas de fuseau sur une date de paie.
- **Langue** : interface en français, montants au format `10 000 DH`.

---

## 8. Direction produit

- **Calme** : pas d'alerte rouge partout. Une couleur d'alerte seulement quand une action est utile.
- **Utile avant d'être riche** : chaque écran répond à une question précise.
- **Le réel d'abord** : le prévu sert à comparer, la projection sert à décider.
- **Premium** : finesse visuelle, animations douces, aucune surcharge.
- **Évolutif** : un moteur pur et des données typées permettent d'ajouter des fonctions sans tout casser.

---

## 9. Vision future

À envisager après la v1, si l'usage le confirme :

- Application mobile (PWA puis native).
- Authentification par mot de passe, puis partage (couple, famille).
- Import de relevés bancaires (CSV) avec rapprochement automatique.
- Méthodes de répartition (50/30/20, pourcentages personnalisés comme l'ancienne app).
- Suivi du patrimoine (liquide, créances, investi).
- Suivi d'un projet générateur de revenu (ex. SaaS) : seuil de rentabilité, revenus réels affectés à un objectif.
- Rendement d'épargne, uniquement si l'utilisateur le saisit lui-même.
