# MySalary — Mise en production (Netlify + Neon)

Plan pour ouvrir MySalary à de vrais clients : authentification complète, comptes isolés, données financières persistantes et cohérentes, déploiement Netlify (interface + API) et Neon PostgreSQL (base), au moins 50 utilisateurs.

On avance **lot par lot** : un lot n'est commencé qu'après la validation du précédent (même méthode que `docs/lots.md`). Chaque lot met à jour sa documentation et le tableau de suivi ci-dessous.

## Sommaire

| Lot | Sujet | Statut |
|---|---|---|
| [P0](#lot-p0--décision-darchitecture) | Décision d'architecture (Netlify Functions ou API séparée) | à faire |
| [P1](#lot-p1--isolation-stricte-des-données) | Isolation stricte des données entre comptes | à faire |
| [P2](#lot-p2--durcissement-de-la-sécurité) | Durcissement de la sécurité (dépendances, journaux, configuration) | à faire |
| [P3](#lot-p3--authentification-de-bout-en-bout) | Authentification et profil de bout en bout | à faire |
| [P4](#lot-p4--passage-à-postgresql-neon) | Passage de SQLite à PostgreSQL (Neon) | à faire |
| [P5](#lot-p5--api-sur-netlify-functions) | API sur Netlify Functions | à faire |
| [P6](#lot-p6--cohérence-financière-et-concurrence) | Cohérence financière et opérations simultanées | à faire |
| [P7](#lot-p7--charge-et-fiabilité-50-utilisateurs) | Charge et fiabilité (50 utilisateurs) | à faire |
| [P8](#lot-p8--mise-en-production) | Mise en production | à faire |
| [P9](#lot-p9--documentation-finale-et-recette) | Documentation finale et recette | à faire |

Annexes : [A. État des lieux](#a-état-des-lieux-audit-du-15-octobre-2026) · [B. Tests avant mise en production](#b-tests-avant-mise-en-production) · [C. Actions manuelles](#c-actions-manuelles-hors-du-code) · [D. Documentation à produire](#d-documentation-à-produire) · [E. Risques résiduels](#e-risques-résiduels)

> Les lots 25 à 27 de `docs/lots.md` attendent encore leur validation. Le lot 28 (projection pluriannuelle) et les suivants passent après cette mise en production, sauf décision contraire.

---

## A. État des lieux (audit du 15 octobre 2026)

### Architecture actuelle

- **Monorepo npm** : `packages/moteur` (calculs purs), `packages/partage` (schémas Zod, types), `server` (API Fastify 5 + Prisma 6), `ui` (React 18 + Vite + Tailwind + TanStack Query).
- **Base** : SQLite (`server/prisma/mysalary.db`), 23 tables, 19 migrations écrites pour SQLite.
- **API** : un serveur Node qui reste allumé (`server/src/server.ts`), avec une purge horaire par `setInterval`. Toutes les routes sous `/api/v1`.
- **Interface** : en développement, Vite redirige `/api` vers le port 3010. Même origine : ni CORS ni cookie inter-sites.
- **Netlify / Neon** : aucune configuration (pas de `netlify.toml`, pas d'URL PostgreSQL).

### Ce qui fonctionne déjà (à garder)

| Domaine | État |
|---|---|
| Comptes | Inscription, connexion, déconnexion, mot de passe oublié (lien 1 h, usage unique), vérification d'e-mail (lien 24 h), changement d'e-mail par lien vers la nouvelle adresse, changement de mot de passe, suppression du compte avec mot de passe. |
| Mots de passe | `scrypt` (N = 2^15), sel aléatoire, comparaison à temps constant ; jamais renvoyés. |
| Sessions | Cookie `HttpOnly`, `SameSite=Strict`, `Secure` en HTTPS ; 30 jours ; seule l'empreinte SHA-256 du jeton est en base. Changer ou réinitialiser le mot de passe ferme les autres sessions. |
| Contrôle d'accès | Toutes les routes de compte passent par `exigerUtilisateur` ; l'identité vient seulement du cookie. Lectures filtrées par `utilisateurId`. Avant chaque modification ou suppression, l'élément est cherché avec `{ id, utilisateurId }`. |
| Références croisées | Les identifiants reçus (catégorie, charge, compte d'épargne, objectif, dette) sont vérifiés comme appartenant au compte avant usage (vérifié par échantillon, pas encore de façon exhaustive). |
| Abus | Limites d'essais : 5 échecs de connexion par e-mail et 20 par IP en 15 min ; 5 « mot de passe oublié » par heure ; 3 renvois d'e-mail par heure. |
| Erreurs | Format unique `{ erreur: { code, message, champs? } }`, aucun détail interne en 500. |
| Cache interface | Les requêtes du compte sont effacées à la connexion et à la déconnexion ; `localStorage` ne garde qu'un indice (id du dernier compte) et la préférence d'animations. |
| Tests | 486 tests (moteur 182, serveur 117, interface 164, partage 23), dont `isolation.test.ts` (5 cas). |

### Problèmes relevés

| # | Gravité | Problème | Lot |
|---|---|---|---|
| 1 | Bloquant | SQLite ne convient pas à Netlify (pas de disque persistant) : il faut PostgreSQL. Les 19 migrations sont propres à SQLite, et la sauvegarde utilise `VACUUM INTO`. | P4 |
| 2 | Bloquant | L'API est un serveur qui tourne en continu, avec une purge par `setInterval` : sur Netlify, elle doit devenir une fonction, et la purge une tâche planifiée. | P5 |
| 3 | Élevé | Les limites d'essais sont en mémoire. En serverless, chaque instance a sa propre mémoire, et la protection contre la force brute devient inefficace. | P2 / P5 |
| 4 | Élevé | `npm audit` (production) : 6 failles (4 élevées, 2 modérées) dans `nodemailer`, `react-router` / `react-router-dom` et `deepmerge-ts`. | P2 |
| 5 | Élevé | Sans `SMTP_URL`, le texte des e-mails (avec le lien de réinitialisation) est écrit dans le journal. Acceptable en local, dangereux en production. | P2 |
| 6 | Moyen | Modifications et suppressions en deux temps : recherche `{ id, utilisateurId }`, puis écriture `where: { id }`. C'est sûr aujourd'hui, mais fragile si une route oublie la recherche. Mieux vaut filtrer aussi l'écriture par compte. | P1 |
| 7 | Moyen | L'isolation n'est testée que sur les réglages. Il manque un test qui essaie **toutes** les routes avec les identifiants d'un autre compte. | P1 |
| 8 | Moyen | La restauration accepte 50 Mo. La limite des requêtes vers une Netlify Function est bien plus basse (environ 6 Mo, à confirmer). | P5 |
| 9 | Moyen | Seulement 13 index pour 23 tables. PostgreSQL n'indexe pas les clés étrangères tout seul, il faut un index sur `utilisateurId` partout où l'on filtre. | P4 |
| 10 | Moyen | Aucune vérification des variables d'environnement au démarrage : une valeur oubliée (`APP_URL`, `SMTP_URL`, `DATABASE_URL`) ne se voit qu'à l'usage. | P2 |
| 11 | Faible | Aucun en-tête de sécurité côté interface (CSP, HSTS, `frame-ancestors`) : Helmet ne protège que les réponses de l'API. | P5 |
| 12 | Faible | Session de 30 jours sans renouvellement, et pas de bouton « Se déconnecter de tous les appareils ». | P3 |
| 13 | Faible | Aucun e-mail d'alerte à l'ancienne adresse après un changement d'e-mail ou de mot de passe. | P3 |
| 14 | Faible | Aucun test de charge ni d'opérations simultanées. | P6 / P7 |

---

## Lot P0 — Décision d'architecture

**Objectif** : choisir où tourne l'API, avant de toucher au code.

### Options

| | A. Netlify Functions (recommandé) | B. API séparée (Render, Fly.io, Railway) + Netlify |
|---|---|---|
| Hébergement | Interface et API sur Netlify, base sur Neon | Interface sur Netlify, API sur un 2ᵉ hébergeur, base sur Neon |
| Changement de code | Point d'entrée « fonction » autour de l'app Fastify existante, limites d'essais en base, purge planifiée | Presque aucun : le serveur actuel tourne tel quel |
| Cookies | Même origine (`/api/*` sur le même domaine) : `SameSite=Strict` reste valable | Même origine si Netlify relaie `/api/*` vers l'API (proxy 200) ; sinon CORS + `SameSite=None` à éviter |
| Connexions PostgreSQL | Nombreuses instances courtes : connexions mutualisées par Neon (`-pooler`) obligatoires | Un seul processus : un petit pool suffit |
| Démarrage à froid | Oui (fonction + Neon en veille) : 1 à 3 s possibles sur la première requête | Selon l'offre (les offres gratuites mettent aussi l'API en veille) |
| Services à gérer | 2 (Netlify, Neon) | 3 |

**Recommandation : A**. C'est ce qui est demandé (Netlify + Neon), l'app Fastify se réutilise sans réécriture, et 50 utilisateurs restent loin des limites. Si les tests du lot P7 montrent des démarrages à froid gênants, on passe à **B** sans toucher à la base ni à l'interface.

### Travaux

- ADR `docs/decisions/0001-hebergement-netlify-neon.md` : décision, raisons, plan B.
- Choix de la région Neon la plus proche des utilisateurs (Europe, Francfort par exemple) et de la région des fonctions Netlify (même zone).

### Critères de fin

- Option validée par toi.
- ADR écrit.

### Actions manuelles (toi)

- Créer les comptes Netlify et Neon (offre gratuite au départ). Ne pas encore créer de base de production.

---

## Lot P1 — Isolation stricte des données

**Objectif** : prouver par des tests qu'aucun compte ne peut lire, modifier ou supprimer les données d'un autre, sur **toutes** les routes.

### Travaux

1. **Test « matrice d'isolation »** (`server/test/isolation.test.ts`) :
   - Créer deux comptes, A et B, avec des données dans chaque entité : contrat, paie, revenu, source, charge, ponctuel, dette, paiement de dette, catégorie, dépense, clôture, compte d'épargne, mouvement, objectif, scénario, réglages.
   - Pour chaque route `GET`, `PUT`, `PATCH`, `POST` ou `DELETE` qui prend un identifiant : A l'appelle avec l'identifiant de B. Attendu : 404, et les données de B intactes (relues ensuite).
   - Pour chaque création qui référence un autre élément (dépense → charge, catégorie ; mouvement → compte, objectif ; paiement → dette) : A envoie un identifiant de B. Attendu : 404 ou 422, et rien de créé.
   - Pour chaque liste et chaque page calculée (Aujourd'hui, Mois, Année, Objectifs, Épargne, Calendrier, Simulateur, export) : aucune donnée de B dans la réponse de A.
   - La liste des routes se lit dans Fastify (`app.printRoutes` ou un hook `onRoute`). Une **nouvelle route sans cas de test fait échouer le test** : on ne peut plus oublier une route.
2. **Écritures filtrées par compte** : remplacer `update` et `delete` sur `where: { id }` par `updateMany` et `deleteMany` sur `where: { id, utilisateurId }`, avec 404 si rien n'est touché. Ou ajouter des contraintes uniques composées `@@unique([id, utilisateurId])`. Même filet dans `ordonner` et dans la simulation.
3. **Intégrité en base** : relire chaque relation de `schema.prisma`. Suppression du compte en cascade, et aucune clé étrangère qui puisse pointer vers la donnée d'un autre compte (vérifié par le code au point 1).
4. **Interface** : test avec deux comptes successifs dans le même navigateur. Connexion de A, déconnexion, connexion de B : aucune donnée de A dans le cache, l'écran ou `localStorage`. Le test existe en partie, il sera complété.
5. **Row-Level Security (RLS)** : évaluée et écrite dans l'ADR `0002-isolation.md`. **Recommandation : pas de RLS au lancement.** Avec Prisma et le pooler de Neon (mode transaction), il faudrait un `SET LOCAL app.utilisateur` dans une transaction autour de chaque requête : c'est compliqué, et une erreur rendrait des pages vides plutôt que de protéger. Le filet retenu : le filtrage applicatif, la matrice de tests et le rôle PostgreSQL de l'app sans droits sur le schéma (lot P4). On rouvre la question au-delà de quelques centaines de comptes.

### Critères de fin

- La matrice couvre 100 % des routes de compte, et un test échoue si une route n'y figure pas.
- Aucune écriture `where: { id }` seule dans `server/src/modules`.
- `npm run verifier` vert.

### Documentation

- `docs/DATABASE.md` § Isolation, à créer et compléter au lot P4.

---

## Lot P2 — Durcissement de la sécurité

**Objectif** : corriger les failles connues qui ne dépendent pas de l'hébergement.

### Travaux

1. **Dépendances** : mettre à jour `nodemailer`, `react-router-dom` et `react-router`, et trouver d'où vient `deepmerge-ts` (sans doute Prisma). Revérifier ensuite avec `npm audit --omit=dev`, sans faille élevée restante. Pas de `npm audit fix --force` à l'aveugle : changement par changement, tests à l'appui.
2. **Configuration vérifiée au démarrage** (`server/src/config.ts`, schéma Zod) : `DATABASE_URL`, `APP_URL`, `SMTP_URL`, `MAIL_FROM`, `COOKIE_SECURE`, `NODE_ENV`. En production, le serveur **refuse de démarrer** sans `SMTP_URL` ou sans `APP_URL` en `https://`.
3. **Journaux sans données sensibles** :
   - Ne jamais écrire le corps des e-mails en production : uniquement le destinataire masqué (`o***@gmail.com`) et le sujet.
   - Masquer dans les journaux Fastify l'en-tête `cookie`, `set-cookie`, et les champs `motDePasse`, `jeton`, `token`.
   - Jamais de montant ni de libellé financier dans les journaux, à vérifier par recherche dans `server/src`.
4. **Limites d'essais partagées** : une table `TentativeAcces` (clé, nombre, fin de fenêtre) au lieu de la `Map` en mémoire. Elle fonctionne quand plusieurs instances tournent (obligatoire pour le lot P5) et survit aux redémarrages. Elle est purgée avec les sessions.
5. **Validation des entrées** : vérifier que toute route passe par `valider(schema, …)` (Zod strict). Les requêtes Prisma sont paramétrées, et la seule requête SQL brute (`VACUUM INTO`) disparaît au lot P4. Ajouter un test « champ inconnu refusé » par module, s'il manque.
6. **Mot de passe** : garder 8 caractères minimum et ajouter un refus des mots de passe les plus courants (petite liste locale, sans appel externe).

### Critères de fin

- `npm audit --omit=dev` : 0 faille élevée.
- Tests : démarrage refusé avec une configuration de production incomplète ; aucun lien de réinitialisation dans les journaux en production ; limite d'essais respectée avec deux instances de l'app sur la même base.

### Documentation

- `docs/SECURITY.md` : protections, variables sensibles, risques résiduels.

---

## Lot P3 — Authentification de bout en bout

**Objectif** : chaque parcours de compte marche réellement, de l'écran à la base, avec les bons états de chargement, d'erreur et de confirmation.

### Parcours à vérifier (navigateur, 1342 et 375 px, compte « Essai »)

| Parcours | Existe | À compléter |
|---|---|---|
| Inscription → connexion automatique → e-mail de vérification | oui | Vérifier le message si l'e-mail existe déjà ; le bouton est désactivé pendant l'envoi |
| Connexion / déconnexion | oui | Message unique pour un mauvais e-mail ou un mauvais mot de passe ; message clair quand trop d'essais (429) |
| Expiration de session | oui (serveur) | Interface : tout 401 renvoie à `/connexion?suite=<page>`, sans boucle ni écran blanc ; renouveler la session quand il reste moins de 7 jours |
| Mot de passe oublié → lien → nouveau mot de passe | oui | Lien expiré ou déjà utilisé : message clair et bouton « Recevoir un nouveau lien » |
| Vérification de l'e-mail | oui | Lien ouvert dans un autre navigateur : l'adresse est confirmée même sans session |
| Changement d'e-mail | oui | **Ajout** : e-mail d'alerte à l'**ancienne** adresse |
| Changement de mot de passe | oui | **Ajout** : e-mail d'alerte, et les autres sessions sont fermées (déjà fait) |
| Prénom, devise, préférences | oui | Vérifier que tout est enregistré et relu après reconnexion |
| Se déconnecter de tous les appareils | **non** | Route `POST /compte/sessions/fermeture` et bouton dans Réglages |
| Suppression du compte | oui | E-mail de confirmation après suppression ; vérifier qu'il ne reste rien en base |

### Travaux

- Combler la colonne « À compléter », avec un test serveur et un test d'interface pour chaque ajout.
- Faire le tour de tous les boutons des pages Connexion, Inscription, Mot de passe oublié et Réglages : aucun bouton sans action.
- E-mails d'alerte : gabarits dans `server/src/lib/gabarits.ts`, même style que les e-mails actuels.

### Critères de fin

- Tous les parcours du tableau sont passés dans le navigateur, avec les captures dans le rapport.
- Tests serveur et interface verts.

### Documentation

- `docs/AUTHENTICATION.md` : inscription, sessions (durée, renouvellement, fermeture), récupération du compte, vérification et changement d'e-mail, limites d'essais.

---

## Lot P4 — Passage à PostgreSQL (Neon)

**Objectif** : la même app sur PostgreSQL, en local puis sur Neon, **sans perte de données**.

### Travaux

1. **Sauvegarde d'abord** : `npm run sauvegarde` et un export JSON du compte `oussama` (Réglages › Sauvegarde) avant toute opération.
2. **Schéma** : `provider = "postgresql"`, avec `url` pour la connexion mutualisée et `directUrl` pour la connexion directe (migrations). Vérifier les types : montants en `Int` (centimes, jusqu'à 21 millions de DH par ligne, à vérifier, sinon `BigInt`), dates civiles en `String` (`AAAA-MM-JJ`, inchangé), instants en `DateTime` (`timestamptz`).
3. **Index** : `@@index([utilisateurId])`, ou des index composés selon les filtres réels (`[utilisateurId, date]` pour les dépenses et les mouvements, `[utilisateurId, moisFinance]` pour les paies), sur chaque table métier.
4. **Migrations** : les migrations SQLite ne se rejouent pas sur PostgreSQL. On repart d'**une migration de départ PostgreSQL** générée depuis le schéma (`prisma migrate diff --from-empty --to-schema-datamodel`). Les anciennes sont archivées dans `server/prisma/migrations-sqlite/`, gardées pour l'historique.
5. **Différences SQLite / PostgreSQL** à tester : tri des chaînes et des accents, sensibilité à la casse (e-mails déjà en minuscules), `contains` et `startsWith`, transactions concurrentes, erreurs d'unicité (P2002 → 409, déjà géré).
6. **Sauvegarde** : `VACUUM INTO` disparaît. La sauvegarde repose sur l'historique de Neon (restauration à un instant donné, durée selon l'offre) et sur un export JSON programmé (`npm run sauvegarde` → `pg_dump` si disponible, sinon export JSON par compte).
7. **Tests** : la base de test devient PostgreSQL. Soit une branche Neon « test », soit PostgreSQL en local (Docker ou Postgres.app). Un schéma neuf par exécution, nettoyé en fin de test.
8. **Rôles PostgreSQL** : un rôle `mysalary_app` (lecture et écriture des données, sans droit de créer ou supprimer des tables) pour l'app, et un rôle propriétaire pour les migrations seulement.
9. **Reprise des données** : script `server/scripts/transfertSqlite.ts`. Il lit SQLite et écrit dans PostgreSQL compte par compte, dans une transaction, puis compare les nombres de lignes et les totaux en centimes par table, avec un rapport. Il est d'abord joué sur une branche Neon jetable.

### Critères de fin

- `npm run verifier` vert sur PostgreSQL.
- Transfert répété sur une branche jetable : nombres de lignes et totaux identiques, pages Aujourd'hui, Mois, Année et Objectifs identiques avant et après pour le compte `oussama`, comparées sur captures.
- Aucune opération destructive sur la base actuelle.

### Actions manuelles (toi)

- Créer le projet Neon, une branche `dev` et une branche `test`, et me donner les URL **dans `server/.env`** (jamais dans le chat ni dans un fichier versionné).

### Documentation

- `docs/DATABASE.md` : schéma, relations, index, migrations, rôles, sauvegarde et restauration, isolation.

---

## Lot P5 — API sur Netlify Functions

**Objectif** : l'interface et l'API déployées sur Netlify, reliées à Neon, sur une adresse de prévisualisation.

### Travaux

1. **Point d'entrée** `netlify/functions/api.ts` : il construit l'app Fastify **une fois par instance** (réutilisée entre deux appels) et transmet la requête, avec `@fastify/aws-lambda` ou `serverless-http`, après un essai rapide des deux.
2. **Prisma en serverless** :
   - un seul `PrismaClient` par instance ;
   - URL mutualisée de Neon (hôte `-pooler`, `pgbouncer=true&connection_limit=1`) et `directUrl` pour les migrations ;
   - `binaryTargets` adapté à l'environnement Netlify (`rhel-openssl-3.0.x`, à confirmer). On évalue aussi l'adaptateur `@prisma/adapter-neon`, plus léger.
3. **`netlify.toml`** :
   - build `npm run build`, publication `ui/dist`, fonctions `netlify/functions` ;
   - `/api/*` → `/.netlify/functions/api/:splat` (200) ;
   - `/*` → `/index.html` (200), pour les pages de l'app ;
   - en-têtes : `Content-Security-Policy` (scripts et styles du site seulement), `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`.
4. **Purge planifiée** : `netlify/functions/purge.ts` (fonction planifiée, toutes les heures) remplace le `setInterval`.
5. **Taille des requêtes** : la restauration d'une sauvegarde est limitée à la taille acceptée par Netlify, en compressant le JSON côté navigateur si besoin. Message clair si le fichier est trop gros.
6. **Durée d'exécution** : mesurer les pages les plus lourdes (Année, Simulateur) et rester bien sous la limite des fonctions (10 s par défaut, à vérifier). Si une page s'en approche, l'optimiser au lot P7.
7. **Démarrage local inchangé** : `npm run dev` garde le serveur Node actuel. Le mode fonction est testé avec `netlify dev`.
8. **Secrets** : uniquement dans les variables d'environnement de Netlify (`DATABASE_URL`, `DIRECT_URL`, `SMTP_URL`, `MAIL_FROM`, `APP_URL`). Aucune variable `VITE_*` secrète, et vérification que le bundle de l'interface ne contient aucune URL de base ni aucun mot de passe.

### Critères de fin

- Le site de prévisualisation Netlify fonctionne avec la branche Neon `dev` : inscription, connexion, toutes les pages, rechargement d'une page profonde (`/objectifs/…`), déconnexion.
- Cookie `Secure`, `HttpOnly`, `SameSite=Strict` vérifié dans le navigateur.
- En-têtes de sécurité vérifiés sur la réponse.

### Actions manuelles (toi)

- Relier le dépôt GitHub au site Netlify, saisir les variables d'environnement et, plus tard, le nom de domaine.

### Documentation

- `docs/DEPLOYMENT.md` : architecture, `netlify.toml`, variables, déploiement, retour arrière.

---

## Lot P6 — Cohérence financière et concurrence

**Objectif** : des chiffres toujours justes, même avec des actions simultanées ou répétées.

### Travaux

1. **Transactions** : faire le tour des écritures multiples (paie et lignes de paie, achat d'un objectif, clôture d'un mois, application d'une simulation, restauration, suppression d'une source de revenu). Chacune doit être dans une seule transaction, comme c'est déjà le cas pour la plupart.
2. **Double clic et renvoi** : boutons désactivés pendant l'envoi (à vérifier sur chaque formulaire), et contraintes uniques en base là où un doublon est impossible métier (une paie par mois, un contrat par mois d'effet : déjà fait).
3. **Conflits** : deux onglets modifient le même élément, et la dernière écriture l'emporte. Ce choix est acceptable pour un compte personnel et sera documenté. Les transactions qui lisent puis écrivent un total (achat d'un objectif) passent en isolation `Serializable`, avec une nouvelle tentative en cas de conflit.
4. **Tests simultanés** (`server/test/concurrence.test.ts`, sur PostgreSQL) :
   - 20 versements envoyés en même temps sur un objectif : solde final = somme exacte ;
   - 10 dépenses simultanées sur une enveloppe : bilan du mois exact ;
   - deux réordonnancements simultanés des objectifs : priorités toujours de 1 à N, sans trou ni doublon ;
   - 50 comptes qui écrivent en parallèle : aucun mélange entre comptes.
5. **Cohérence après plusieurs modifications** : scénario de bout en bout (salaire, charges, dépenses, versements, modification puis suppression), avec relecture d'Aujourd'hui, Mois, Année, Objectifs et Épargne. Les totaux doivent concorder entre les pages.

### Critères de fin

- Tests de concurrence verts sur PostgreSQL.
- Aucun écart entre les pages pour le scénario de bout en bout.

### Documentation

- `docs/TESTING.md` § Concurrence.

---

## Lot P7 — Charge et fiabilité (50 utilisateurs)

**Objectif** : **mesurer**, pas supposer, le comportement avec 50 utilisateurs, et rendre l'app robuste aux pannes réseau.

### Travaux

1. **Script de charge** (`scripts/charge/`, avec `autocannon` ou `k6`) : 50 utilisateurs virtuels, chacun sur son propre compte d'essai, avec :
   - connexion ;
   - Aujourd'hui, Mois, Objectifs ;
   - ajout d'une dépense, puis relecture ;
   - déconnexion.
   Il tourne pendant 5 minutes, avec une montée progressive. Les comptes d'essai sont supprimés ensuite.
2. **Mesures** : temps de réponse p50 et p95 par route, taux d'erreur, connexions PostgreSQL ouvertes (tableau de bord Neon), démarrages à froid, temps CPU des fonctions. Le tout d'abord en local, puis sur la prévisualisation Netlify avec la branche Neon `dev`.
3. **Goulots probables à vérifier** :
   - chaque page recalcule le calendrier complet du compte (`chargerCalendrier`), avec plusieurs requêtes : regrouper les lectures, et ne lire que les tables utiles ;
   - `scrypt` (~50 ms et 32 Mo par connexion) : 50 connexions simultanées doivent tenir dans la mémoire d'une fonction ;
   - le réveil de Neon après une mise en veille (premier appel lent).
4. **Robustesse** :
   - interface : nouvelle tentative automatique pour les lectures (déjà avec TanStack Query, à régler), jamais pour les écritures ;
   - message « Connexion perdue » et bouton « Réessayer » ;
   - délai maximal par requête ;
   - serveur : délai sur les requêtes Prisma et réponse 503 claire si la base est indisponible.
5. **Limites des offres** : relever les quotas de l'offre Netlify retenue (exécutions de fonctions, bande passante, crédits) et de l'offre Neon (heures de calcul, stockage, connexions, mise en veille, durée de l'historique de restauration) à la date du lot. Calculer la marge pour 50 utilisateurs actifs.

### Critères de fin

- Rapport de charge avec les chiffres réels et la configuration testée. **Aucune capacité annoncée sans mesure.**
- Aucune erreur 5xx sous 50 utilisateurs simultanés, ou alors des causes connues et corrigées.
- p95 cible : moins de 800 ms à chaud. Seuil à valider avec toi après la première mesure.

### Documentation

- `docs/TESTING.md` § Charge (résultats datés, limites constatées).

---

## Lot P8 — Mise en production

**Objectif** : ouvrir le site de production avec tes données reprises.

### Travaux (dans cet ordre)

1. Branche Neon `main` (production) et rôles du lot P4. `prisma migrate deploy` lancé avec le rôle propriétaire.
2. Variables d'environnement de production sur Netlify, avec `APP_URL` en `https://` et le domaine final.
3. E-mails : fournisseur SMTP (Brevo ou Resend), enregistrements SPF, DKIM et DMARC du domaine, puis un essai vers Gmail et Outlook (déjà décrit dans le README § E-mails en production).
4. Sauvegarde finale de SQLite, puis reprise des données avec le script du lot P4, vérifiée par les nombres de lignes et les totaux.
5. Tests de fumée en production (annexe B, points 1 à 9) avec un compte « Essai », supprimé ensuite.
6. Surveillance : alertes Netlify (échecs de déploiement, erreurs de fonction) et Neon (stockage, calcul). Une page `/api/v1/sante` qui vérifie aussi la base.
7. Retour arrière documenté : redéployer la version précédente sur Netlify, et restaurer la base Neon à un instant donné.

### Critères de fin

- Production en ligne, ton compte repris et identique.
- Annexe B entièrement cochée, avec la date.

### Actions manuelles (toi)

- Nom de domaine, DNS, fournisseur d'e-mails, validation de l'ouverture.

---

## Lot P9 — Documentation finale et recette

**Objectif** : une documentation à jour et une recette signée.

### Travaux

- Relire et compléter les cinq documents de l'annexe D.
- Mettre à jour le README (variables, mise en ligne), `docs/lots.md`, la skill `codebase-overview` et les ADR.
- Recette finale : annexe B rejouée en production, avec tableau des résultats et date.

---

## B. Tests avant mise en production

| # | Test | Automatique | Navigateur | Lot |
|---|---|---|---|---|
| 1 | Inscription puis connexion d'un nouvel utilisateur | `authentification.test.ts` | oui | P3, P8 |
| 2 | Déconnexion et expiration de session | `authentification.test.ts` + test 401 de l'interface | oui | P3 |
| 3 | Réinitialisation du mot de passe par e-mail | `authentification.test.ts` | oui, avec un vrai e-mail | P3, P8 |
| 4 | Modification du profil (prénom, e-mail, mot de passe, préférences) | `compte.test.ts`, `email.test.ts` | oui | P3 |
| 5 | Persistance après reconnexion | nouveau test | oui | P3, P4 |
| 6 | Routes et API privées refusées sans session | `isolation.test.ts` (toutes les routes) | oui | P1 |
| 7 | Isolation complète entre deux comptes | matrice d'isolation | oui (deux comptes, un navigateur) | P1 |
| 8 | Cohérence financière après plusieurs modifications | `concurrence.test.ts` + scénario de bout en bout | oui | P6 |
| 9 | Pages et calculs identiques après déploiement | 486 tests existants sur PostgreSQL | comparaison de captures | P4, P5 |
| 10 | Plusieurs utilisateurs simultanés | script de charge | — | P7 |

Chaque résultat est noté dans `docs/TESTING.md` avec la date, l'environnement et le résultat réel. Un test non exécuté est marqué « non exécuté », jamais « réussi ».

## C. Actions manuelles (hors du code)

| Action | Où | Lot |
|---|---|---|
| Créer les comptes Netlify et Neon | sites des services | P0 |
| Créer le projet Neon, les branches `dev`, `test` et `main`, et les rôles | console Neon | P4, P8 |
| Mettre les URL de base dans `server/.env` (local) et dans Netlify (production) | ta machine, Netlify | P4, P5 |
| Relier le dépôt GitHub à Netlify | Netlify | P5 |
| Fournisseur SMTP, et SPF, DKIM et DMARC sur le domaine | fournisseur d'e-mails, DNS | P8 |
| Nom de domaine et HTTPS | registrar, Netlify | P8 |
| Valider chaque lot | — | tous |

Je ne saisis aucun secret ni aucun mot de passe de service : tu les mets toi-même dans `.env` ou dans Netlify.

## D. Documentation à produire

Selon la convention du dépôt (seul le README à la racine), les documents vont dans `docs/` :

| Document | Contenu | Créé au lot |
|---|---|---|
| `docs/DEPLOYMENT.md` | Netlify, Neon, variables, déploiement, retour arrière | P5, complété en P8 |
| `docs/AUTHENTICATION.md` | Comptes, sessions, récupération, e-mails | P3 |
| `docs/SECURITY.md` | Protections, secrets, journaux, risques résiduels | P2 |
| `docs/DATABASE.md` | Schéma, relations, index, migrations, rôles, isolation, sauvegardes | P1, P4 |
| `docs/TESTING.md` | Tests exécutés, résultats datés, charge, limites | P6, P7, P9 |

## E. Risques résiduels

- **Démarrages à froid** (fonction + Neon en veille) : premier affichage lent après une période calme. Mesuré au lot P7 ; plan B, l'option B du lot P0.
- **Quotas des offres gratuites** : à relever au lot P7. Un dépassement peut couper le service jusqu'au mois suivant.
- **Pas de RLS** : l'isolation repose sur le code et la matrice de tests (décision P1, à revoir plus tard).
- **Dernière écriture gagnante** entre deux onglets : accepté et documenté (P6).
- **E-mails** : la livraison dépend du fournisseur et du DNS ; un e-mail en spam bloque la récupération du compte.
- **Une seule personne** pour l'exploitation : aucune astreinte ; sauvegardes et surveillance automatiques indispensables (P8).
