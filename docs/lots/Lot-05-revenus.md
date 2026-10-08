# Lot 5 — Autres revenus

> Statut : **clôturé et validé** (07/10/2026). Références : `Plan.md` § 6, § 7.3 · `context.md` § 4.5, R1–R5 · `UX.md` § 4.2, § 5.11.

## Objectif

Décrire une fois les revenus qui reviennent (primes, heures sup, revenus variables, à-côtés). MySalary les prévoit aux bons mois, avec leur **certitude**. Quand un revenu arrive, on le note : il devient **réel**, et l'écart avec le prévu s'affiche.

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| **Sources de revenus** : libellé, type (prime, variable, autre), montant, fréquence, mois, versement (avec la paie ou à une autre date), certitude, début, fin | Scénarios prudent / réaliste / ambitieux complets : lot 11 |
| Fréquences : mensuelle, trimestrielle, annuelle, ponctuelle, mois choisis (R2) | Total du mois (revenus − dépenses) : lot 8 |
| Primes **avec la paie** : ajoutées seules aux paies prévues, confirmées avec la paie | Calendrier : lot 14 |
| Revenus **à une autre date** : prévus à leur date, rattachés au mois budgétaire qui la contient | |
| **Revenus reçus** : liés à un revenu prévu ou libres (R3), écart affiché, le prévu ne change pas (R4) | |
| Équivalent mensuel, prochain versement, totaux par certitude sur 12 mois | |
| Onglet **Mon plan › Autres revenus** | |

## Règles de calcul (moteur)

### Mois d'un versement

Le mois d'une source est le **mois où l'argent arrive** (mois civil de versement). C'est ce que l'on dit naturellement : « la prime de juin ».

- **Avec la paie** : la prime de juin arrive avec la paie versée en juin. Avec « la paie finance le mois suivant », elle finance donc juillet.
- **À une autre date** : le jour choisi du mois (31 → dernier jour). Elle compte dans le mois budgétaire qui contient cette date.

### Fréquences

| Fréquence | Mois de versement |
|---|---|
| Mensuelle | Chaque mois, du début à la fin |
| Trimestrielle | Tous les 3 mois à partir du mois de début |
| Annuelle | Tous les 12 mois à partir du mois de début |
| Ponctuelle | Le mois de début seulement |
| Mois choisis | Les mois cochés (ex. juin et décembre), chaque année |

### Statut d'un revenu prévu

- **Avec la paie** : il suit la paie. À la réception, son montant reçu est saisi avec la paie et figé dans la paie (R27). Une source créée ou changée ensuite ne modifie jamais une paie reçue.
- **À une autre date** : prévu, puis en retard après sa date, puis reçu quand un revenu reçu y est lié.

### Certitude (R5)

| Certitude | Exemple | Compté dans |
|---|---|---|
| Garanti | prime contractuelle | prudent, réaliste, ambitieux |
| Probable | prime habituelle non écrite | réaliste, ambitieux |
| Incertain | revenu variable, projet futur | ambitieux seulement |

Valeur proposée : prime → probable ; variable et autre → incertain.

### Équivalent mensuel

Montant × nombre de versements par an ÷ 12, arrondi au centime. Une source ponctuelle n'a pas d'équivalent mensuel.

## Données

| Table | Champs |
|---|---|
| `SourceRevenu` | `libelle`, `type`, `montant`, `frequence`, `mois` (mois choisis), `versement`, `jour?`, `certitude`, `debut`, `fin?` |
| `RevenuRecu` | `sourceId?`, `moisOccurrence?`, `date`, `montant`, `libelle`, `note?` — **réel** |
| `LignePaie` | + `sourceId?` : prime d'une source, figée à la réception |

Supprimer une source ne supprime jamais un revenu reçu : il devient un revenu libre.

## Routes

| Route | Rôle |
|---|---|
| `GET/POST /revenus/sources` · `PUT/DELETE /revenus/sources/:id` | Sources |
| `GET /revenus/prevus?du=AAAA-MM&au=AAAA-MM` | Revenus prévus par mois de versement, avec statut et mois budgétaire |
| `GET/POST /revenus/recus` · `PUT/DELETE /revenus/recus/:id` | Revenus reçus |
| `GET /revenus/resume` | Totaux : équivalent mensuel, 12 prochains mois par certitude, mois en cours |

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Moteur : chaque fréquence, début et fin, 31 → fin de mois, prime avec la paie dans la bonne paie, revenu à part dans le bon mois budgétaire, statut reçu / en retard, totaux par certitude.
- [x] Serveur : isolation, revenu reçu lié à un prévu, suppression d'une source sans perte du réel, prime de source figée à la réception.
- [x] Écran : ajouter une source, voir la prime dans la paie, noter un revenu reçu (testé), modifier et supprimer depuis le menu « ••• ».
- [x] Rendu fidèle au template, sans débordement à 375 px.

## Résultat

- `npm run verifier` : types OK, **138 tests** OK (partage 15, moteur 53, serveur 31, interface 39), build OK.
- Vérifié dans le navigateur avec un compte de test « Essai », supprimé ensuite. Le compte « oussama » n'a pas été touché.
  - Prime de 2 000 DH en juin et décembre, avec la paie : aperçu « décembre 2026 (finance janvier) · juin 2027 (finance juillet) · décembre 2027 (finance janvier) ».
  - La paie de janvier 2027 passe à 12 000 DH prévus, avec la ligne « Prime test · revenu récurrent · probable ». Elle est prévue le lundi 28 décembre (le 27 est un dimanche).
  - Équivalent mensuel 333,33 DH ; prévu sur 12 mois 4 000 DH (probable).
  - Aucun débordement à 375 px.

## Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Colonne « Par mois » coupée (« 333,… ») | Tableau élargi, colonnes rééquilibrées |
| Éditer les primes d'une paie aurait transformé une prime de source en prime ponctuelle | L'éditeur de primes d'une paie ignore les primes des sources ; elles se gèrent dans « Autres revenus » |

## Écarts et remarques

- **Mois d'une source = mois civil où l'argent arrive.** Une prime « avec la paie » de juin finance donc juillet (paie du 27 juin). C'est affiché dans l'aperçu.
- **Route `GET /revenus/prevus` et `GET /revenus/resume`** ajoutées au plan (§ 5.8) pour l'écran.
- **« Terminer » une source** = choisir un dernier mois dans le formulaire (pas de bouton séparé).
- **Supprimer un revenu reçu** propose « Annuler » (il est recréé à l'identique).
- Les scénarios complets (moyenne des dépenses en prudent, règles modifiables) restent au lot 11. Ici, seuls les totaux de revenus par certitude sont affichés.
