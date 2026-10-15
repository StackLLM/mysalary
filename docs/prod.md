# MySalary — Production : comptes, données, sécurité et déploiement

Document unique pour ouvrir MySalary à de vrais clients : authentification, isolation des comptes, base de données, sécurité, déploiement Netlify + Neon, tests, et les lots P0 à P9 qui y mènent.

Il remplace les fichiers séparés `DEPLOYMENT.md`, `AUTHENTICATION.md`, `SECURITY.md`, `DATABASE.md` et `TESTING.md` : chaque sujet est une section ci-dessous. Il reprend aussi les parties « comptes, sécurité, mise en ligne » qui étaient dans le README, `produit.md` et `lots.md`.

## Sommaire

1. [Mode d'emploi](#1-mode-demploi)
2. [Suivi des lots](#2-suivi-des-lots)
3. [Décisions](#3-décisions)
4. [Architecture et choix techniques](#4-architecture-et-choix-techniques)
   - [4.1 Architecture actuelle](#41-architecture-actuelle)
   - [4.2 Architecture cible](#42-architecture-cible)
5. [Comptes et authentification](#5-comptes-et-authentification)
   - [5.1 Fonctionnalités en place](#51-fonctionnalités-en-place)
   - [5.2 Sessions](#52-sessions)
   - [5.3 Récupération du compte et e-mails](#53-récupération-du-compte-et-e-mails)
   - [5.4 Limites d'essais](#54-limites-dessais)
   - [5.5 Comptes créés avant l'authentification](#55-comptes-créés-avant-lauthentification)
   - [5.6 À compléter avant l'ouverture](#56-à-compléter-avant-louverture)
6. [Données et isolation](#6-données-et-isolation)
   - [6.1 Règles de stockage](#61-règles-de-stockage)
   - [6.2 Schéma actuel](#62-schéma-actuel)
   - [6.3 Isolation entre comptes](#63-isolation-entre-comptes)
   - [6.4 Passage à PostgreSQL](#64-passage-à-postgresql)
   - [6.5 Sauvegarde, export et restauration](#65-sauvegarde-export-et-restauration)
7. [Sécurité et confidentialité](#7-sécurité-et-confidentialité)
   - [7.1 Protections en place](#71-protections-en-place)
   - [7.2 Problèmes relevés](#72-problèmes-relevés)
   - [7.3 Secrets et journaux](#73-secrets-et-journaux)
   - [7.4 Loi 09-08 et CNDP](#74-loi-09-08-et-cndp)
8. [Déploiement](#8-déploiement)
   - [8.1 Variables d'environnement](#81-variables-denvironnement)
   - [8.2 Netlify](#82-netlify)
   - [8.3 Neon](#83-neon)
   - [8.4 E-mails en production](#84-e-mails-en-production)
   - [8.5 Mise en production et retour arrière](#85-mise-en-production-et-retour-arrière)
   - [8.6 Offres, régions et coûts](#86-offres-régions-et-coûts)
   - [8.7 Actions manuelles](#87-actions-manuelles)
9. [Tests](#9-tests)
   - [9.1 Tests existants](#91-tests-existants)
   - [9.2 Tests avant mise en production](#92-tests-avant-mise-en-production)
   - [9.3 Concurrence et charge](#93-concurrence-et-charge)
   - [9.4 Journal des résultats](#94-journal-des-résultats)
10. [Lots P0 à P9](#10-lots-p0-à-p9)
11. [Critères d'ouverture](#11-critères-douverture)
12. [Risques résiduels](#12-risques-résiduels)

---

## 1. Mode d'emploi

- **Ce document** décrit l'état réel (ce qui marche aujourd'hui) et la cible (ce qui reste à faire), pour tout ce qui touche aux comptes, aux données, à la sécurité et à la mise en ligne.
- **Ailleurs** :
  - le produit et les règles de calcul sont dans `docs/produit.md` ;
  - les écrans dans `docs/ux-ui.md` ;
  - le suivi des lots fonctionnels (0 à 34) et leurs bilans dans `docs/lots.md` ;
  - l'installation locale dans le `README.md`.
- **Méthode** : un lot à la fois, dans l'ordre. Pas de lot suivant sans ta validation. À la fin d'un lot :
  1. mettre à jour son statut au § 2 ;
  2. passer de « cible » à « en place » ce qui est fait (§ 5 à 8) ;
  3. noter les tests exécutés au § 9.4.
- **Légende** : ✅ en place · 🟡 livré, à valider · ⬜ à faire · 🔧 action manuelle de ta part.
- **Citation dans le code** : « prod.md § 6.3 ».

## 2. Suivi des lots

| Lot | Sujet | Statut | Remplace |
|---|---|---|---|
| [P0](#p0-hébergement-et-cadre-légal) | Hébergement et cadre légal | 🟡 livré le 15/10/2026, à valider | question ouverte « hébergement » (lots.md § 7) |
| [P1](#p1-isolation-stricte-des-données) | Isolation stricte des données | ⬜ | — |
| [P2](#p2-durcissement-de-la-sécurité) | Durcissement de la sécurité | ⬜ | lot 30 (en-têtes, journaux) |
| [P3](#p3-authentification-de-bout-en-bout) | Authentification de bout en bout, pages légales | ⬜ | lot 30 (pages légales) |
| [P4](#p4-passage-à-postgresql) | Passage à PostgreSQL (Neon) | ⬜ | lot 30 (PostgreSQL, reprise des données) |
| [P5](#p5-api-et-interface-sur-netlify) | API et interface sur Netlify, PWA | ⬜ | lot 30 (build, PWA) |
| [P6](#p6-cohérence-financière-et-concurrence) | Cohérence financière et concurrence | ⬜ | — |
| [P7](#p7-charge-et-fiabilité) | Charge et fiabilité (50 utilisateurs) | ⬜ | — |
| [P8](#p8-mise-en-production-et-bêta-fermée) | Mise en production et bêta fermée | ⬜ | lot 31 |
| [P9](#p9-recette-finale) | Recette finale | ⬜ | — |

**Lots déjà livrés sur ce sujet** (bilans complets dans `docs/lots.md`) :

| Lot | Contenu | Statut |
|---|---|---|
| 20 | Export JSON d'un compte, restauration dans un compte vide, sauvegarde de la base | ✅ clôturé |
| 22 | Authentification locale | ✅ clôturé, remplacé par le lot 23 |
| 23 | Comptes par e-mail et mot de passe, sessions, isolation par la session, suppression de l'en-tête `X-Utilisateur` et de l'écran Profils | 🟡 à valider |
| 24 | Vérification de l'e-mail, changement d'e-mail par lien, envoi SMTP, purge des sessions et liens expirés | 🟡 à valider (essai en vraie boîte reporté en P8) |

**Ordre retenu** : d'abord l'isolation, la sécurité et l'authentification sur l'installation actuelle, rapide à tester. Ensuite la base PostgreSQL et l'hébergement Netlify. Puis la cohérence, la charge, et enfin l'ouverture. Les lots fonctionnels 28 et 29 de `docs/lots.md` viennent **après P9** (décidé le 15/10/2026), et sont déployés sur la production existante.

## 3. Décisions

| # | Date | Décision | Statut | Source |
|---|---|---|---|---|
| D1 | 12/10/2026 | Le compte courant vient **uniquement** de la session (cookie). Jamais d'un en-tête, d'un paramètre ou du corps de la requête. | ✅ en vigueur | lot 23 |
| D2 | 12/10/2026 | Mots de passe hachés avec `scrypt` (N = 2^15, sel aléatoire), jamais stockés ni renvoyés. | ✅ en vigueur | lot 23 |
| D3 | 12/10/2026 | Sessions en base. Seule l'empreinte SHA-256 du jeton est gardée, le jeton est dans un cookie `HttpOnly`, `SameSite=Strict`, `Secure` en HTTPS. | ✅ en vigueur | lot 23 |
| D4 | 12/10/2026 | Interface et API sur la **même origine** : ni CORS ni cookie inter-sites. | ✅ en vigueur | lot 23 |
| D5 | 12/10/2026 | Changer d'e-mail exige le mot de passe, puis un clic dans un lien envoyé à la **nouvelle** adresse. L'ancienne reste valable d'ici là. | ✅ en vigueur | lot 24 |
| D6 | 07/10/2026 | Chaque table métier porte `utilisateurId`. Toute lecture et toute écriture sont filtrées par compte côté serveur. | ✅ en vigueur | produit.md (Plan) § 5.6 |
| D7 | 07/10/2026 | Montants en centimes entiers, dates de paie et de dépense en dates civiles `AAAA-MM-JJ`. | ✅ en vigueur | produit.md (Plan) § 5.6 |
| D8 | 12/10/2026 | Actions lourdes (supprimer, réinitialiser le compte, changer d'e-mail ou de mot de passe) confirmées par le mot de passe. | ✅ en vigueur | lot 23 |
| D9 | 12/10/2026 | La restauration d'une sauvegarde ne se fait que dans un compte vide. | ✅ en vigueur | lot 20 |
| D10 | 15/10/2026 | Documentation de production centralisée dans ce fichier. Pas de fichier par sujet ni par lot. | ✅ en vigueur | — |
| D11 | 15/10/2026 | Hébergement : interface et API sur **Netlify** (API en Netlify Functions), base sur **Neon PostgreSQL**. Plan B, si la mesure P7 l'exige : API sur un service séparé (Render, Fly.io, Railway), relayée par Netlify sur la même origine. | ✅ validée le 15/10/2026 | § 4.2 |
| D12 | 15/10/2026 | Pas de Row-Level Security au lancement : isolation par le code, une matrice de tests sur toutes les routes, et un rôle PostgreSQL sans droits sur le schéma. | ⬜ proposée, à valider en P1 | § 6.3 |
| D13 | 15/10/2026 | Deux onglets modifient le même élément : la dernière écriture l'emporte. Les calculs qui lisent puis écrivent un total passent en transaction `Serializable`. | ⬜ proposée, à valider en P6 | § 9.3 |
| D14 | 15/10/2026 | Les données sont traitées hors du Maroc (Netlify, Neon) : en Union européenne avec l'option « Europe » de D15, aux États-Unis avec l'option « économique ». **Tu engages toi-même la démarche CNDP** (déclaration et, si besoin, autorisation), et elle doit aboutir avant l'ouverture (P8). Le travail technique continue en attendant. | ✅ décidée | § 7.4 |
| D15 | — | Offres et régions : l'API (fonctions) et la base doivent être dans la **même région**. Option « Europe » : Netlify Pro (fonctions à Francfort) + Neon Launch à Francfort. Option « économique » : Netlify Personal (fonctions dans l'Ohio, région imposée) + Neon Launch dans l'Ohio. Pas d'offre gratuite en production. **Choix reporté après la mesure de P7** : jusque-là, offres gratuites, avec la base de développement dans l'Ohio (`aws-us-east-2`), à côté des fonctions de Netlify Free. | ✅ décidée (choix final après P7) | § 8.6 |

## 4. Architecture et choix techniques

### 4.1 Architecture actuelle

| Partie | Technique |
|---|---|
| `packages/moteur` | Calculs purs (salaire, charges, épargne, objectifs, projections), sans base ni React |
| `packages/partage` | Schémas Zod, types, formatage, codes d'erreur |
| `server` | API Fastify 5 + Prisma 6 sous `/api/v1`, Helmet, corps limité à 1 Mo (50 Mo pour la restauration) |
| `ui` | React 18 + Vite + Tailwind + TanStack Query ; Vite relaie `/api` vers le port 3010 en développement |
| Base | SQLite (`server/prisma/mysalary.db`), 23 tables, 19 migrations |
| Processus | Serveur Node en continu (`server/src/server.ts`), purge des sessions et liens expirés au démarrage puis toutes les heures (`setInterval`) |
| Netlify / Neon | Aucune configuration à ce jour |

Flux d'une requête : `routes.ts` (validation Zod) → `depot.ts` (Prisma, filtré par compte) → moteur → réponse JSON.

### 4.2 Architecture cible

| | A. Netlify Functions (proposé) | B. API séparée + Netlify |
|---|---|---|
| Hébergement | Interface et API sur Netlify, base sur Neon | Interface sur Netlify, API sur un 2ᵉ service, base sur Neon |
| Changement de code | Point d'entrée « fonction » autour de l'app Fastify, limites d'essais en base, purge planifiée | Presque aucun |
| Cookies | `/api/*` sur le même domaine : `SameSite=Strict` reste valable | Même origine si Netlify relaie `/api/*` (proxy 200) |
| Connexions PostgreSQL | Beaucoup d'instances courtes : connexions mutualisées de Neon (`-pooler`) obligatoires | Un processus, un petit pool |
| Démarrage à froid | Fonction et Neon en veille : 1 à 3 s possibles sur la première requête | Selon l'offre |
| Services à gérer | 2 | 3 |

**Retenu : A** (D11, validée le 15/10/2026). Raisons : c'est l'hébergement demandé, l'app Fastify se réutilise sans réécriture, et 50 utilisateurs restent loin des limites. Si la mesure du lot P7 montre des démarrages à froid gênants, on passe à B sans toucher ni à la base ni à l'interface.

Ce qu'il faut adapter pour A : la purge devient une fonction planifiée, les limites d'essais passent en base (§ 5.4), la taille des requêtes de restauration est limitée (§ 6.5), et Prisma passe en mode serverless (§ 8.3).

## 5. Comptes et authentification

### 5.1 Fonctionnalités en place

| Parcours | Fonctionnement | Statut |
|---|---|---|
| Inscription | Prénom, e-mail (unique, en minuscules), mot de passe de 8 caractères minimum. Session ouverte aussitôt, lien de vérification envoyé. | ✅ |
| Connexion | E-mail et mot de passe ; le même message, que l'e-mail ou le mot de passe soit faux. Un e-mail inconnu prend le même temps qu'un mauvais mot de passe. | ✅ |
| Déconnexion | Session supprimée en base, cookie effacé, cache de l'interface vidé. | ✅ |
| Routes privées | Toutes les routes de compte passent par `exigerUtilisateur` : 401 sans session valide. | ✅ |
| Prénom, devise, préférences | Réglages, enregistrés par compte. | ✅ |
| Changement de mot de passe | Ancien mot de passe exigé ; les autres sessions sont fermées. | ✅ |
| Changement d'e-mail | Voir § 5.3. | ✅ |
| Mot de passe oublié | Voir § 5.3. | ✅ |
| Vérification de l'e-mail | Voir § 5.3. | ✅ |
| Export, réinitialisation, suppression du compte | Réglages ; suppression et réinitialisation confirmées par le mot de passe, suppression en cascade de toutes les données. | ✅ |

### 5.2 Sessions

- **Jeton** : 32 octets aléatoires dans le cookie `mysalary_session`. Seule son empreinte SHA-256 est en base (table `Session`).
- **Cookie** : `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` quand `APP_URL` est en `https://` (ou si `COOKIE_SECURE=1`).
- **Durée** : 30 jours, sans renouvellement. Une session expirée est supprimée dès qu'elle est présentée.
- **Rotation** : chaque connexion crée un nouveau jeton et ferme l'ancienne session de ce navigateur.
- **Fermeture** : déconnexion, changement ou réinitialisation du mot de passe (pour les autres sessions), suppression du compte.
- **Nettoyage** : sessions et liens expirés purgés au démarrage, puis toutes les heures (une fonction planifiée sur Netlify, en P5).
- **Interface** : le cache des requêtes est effacé à la connexion et à la déconnexion. `localStorage` ne garde que l'identifiant du dernier compte (un simple indice d'affichage, le serveur ne s'y fie pas) et la préférence d'animations.

### 5.3 Récupération du compte et e-mails

- **Mot de passe oublié** : lien à usage unique, valable 1 heure, envoyé par e-mail. Choisir un mot de passe par ce lien confirme aussi l'adresse et ferme les autres sessions.
- **Vérification de l'e-mail** : à l'inscription, un lien valable 24 heures et utilisable une seule fois. Tant qu'il n'est pas ouvert, un bandeau le rappelle et permet de le renvoyer (3 envois par heure).
- **Changement d'e-mail** : le mot de passe est exigé, puis un lien part vers la nouvelle adresse. L'adresse ne change qu'à l'ouverture du lien.
- **Liens** : seule l'empreinte du jeton est en base (`JetonMotDePasse`, `JetonEmail`). Un lien expiré ou déjà utilisé est refusé.
- **Envoi** : par SMTP (`SMTP_URL`), avec des gabarits HTML et texte. Sans `SMTP_URL`, le message est écrit dans le journal du serveur, ce qui n'est acceptable qu'en local (§ 7.2, problème 5).

### 5.4 Limites d'essais

| Action | Limite |
|---|---|
| Connexion | 5 échecs par e-mail et 20 par adresse IP en 15 minutes |
| Mot de passe oublié | 5 demandes par heure |
| Confirmation par mot de passe (Réglages) | 5 échecs en 15 minutes |
| Renvoi du lien de vérification | 3 par heure |

Aujourd'hui, ces compteurs sont gardés en mémoire (`server/src/lib/limiteur.ts`), ce qui suffit pour un seul processus. En serverless, chaque instance a sa propre mémoire : ils passeront en base en P2.

### 5.5 Comptes créés avant l'authentification

Ces comptes gardent toutes leurs données, mais n'ont ni e-mail ni mot de passe. Pour en activer un, sur la machine du serveur :

```bash
npm run compte:activer -- <prénom> <e-mail>
```

La commande affiche un lien valable 24 heures pour choisir le mot de passe. L'e-mail est ensuite considéré comme confirmé. Pour le changer plus tard : Réglages › E-mail de connexion.

### 5.6 À compléter avant l'ouverture

Travaux du lot [P3](#p3-authentification-de-bout-en-bout) :

| Point | Détail |
|---|---|
| Session expirée dans l'interface | Tout 401 renvoie à `/connexion?suite=<page>`, sans boucle ni écran blanc |
| Renouvellement | Session prolongée quand il reste moins de 7 jours |
| Se déconnecter de tous les appareils | Route `POST /compte/sessions/fermeture` et bouton dans Réglages |
| E-mails d'alerte | À l'ancienne adresse après un changement d'e-mail, et après un changement de mot de passe |
| Lien expiré | Message clair et bouton « Recevoir un nouveau lien » |
| Trop d'essais (429) | Message clair avec le délai d'attente |
| Suppression du compte | E-mail de confirmation, et vérification qu'il ne reste rien en base |
| Mots de passe courants | Refusés (petite liste locale, aucun appel externe) |
| Conditions et confidentialité | Pages publiques, acceptation à l'inscription |

## 6. Données et isolation

### 6.1 Règles de stockage

- **Montants** en centimes entiers (`Int`), jamais en nombre à virgule. Un `Int` va jusqu'à 21 474 836 DH par ligne.
- **Dates civiles** (paie, dépense, échéance) en texte `AAAA-MM-JJ`, sans fuseau : la paie du 27 reste le 27. Les **instants** (création, expiration) sont en `DateTime`.
- **Propriétaire** : chaque table métier porte `utilisateurId`, et la suppression du compte supprime tout en cascade.
- **Natures** : le réel, le prévu et le projeté ne sont jamais mélangés (règles complètes dans produit.md (Contexte) § 5).
- **Validation** : schémas Zod stricts sur toutes les entrées (champ inconnu refusé), montants bornés.

### 6.2 Schéma actuel

- Fichier : `server/prisma/schema.prisma`, base SQLite, 23 tables, 19 migrations écrites à la main.
- Tables de compte : `Utilisateur`, `Reglages`, `Session`, `JetonMotDePasse`, `JetonEmail`.
- Tables métier, toutes avec `utilisateurId` :
  - salaire : contrats, paies, lignes de paie ;
  - revenus : sources, revenus reçus ;
  - budget : catégories, charges, ponctuels, dettes et leurs paiements, dépenses, clôtures de mois ;
  - épargne : comptes d'épargne, mouvements, objectifs ;
  - simulation : scénarios.
- Contraintes uniques par compte : un contrat par mois d'effet, une paie par mois financé, etc.
- **Index** : seulement 13 pour 23 tables. À compléter pour PostgreSQL, qui n'indexe pas les clés étrangères tout seul (§ 6.4).

### 6.3 Isolation entre comptes

**En place**
- Le compte courant vient de la session (D1).
- Toutes les lectures sont filtrées par `utilisateurId`.
- Avant une modification ou une suppression, l'élément est cherché avec `{ id, utilisateurId }` : 404 s'il appartient à un autre compte.
- Les identifiants reçus (catégorie, charge, compte d'épargne, objectif, dette) sont vérifiés comme appartenant au compte avant usage.
- Le réordonnancement des objectifs exige exactement les objectifs du compte.
- Tests : `server/test/isolation.test.ts` (sans session, faux cookie, ancien en-tête, réglages de A et B, suppression en cascade).

**Points faibles** (corrigés en [P1](#p1-isolation-stricte-des-données))
- L'écriture qui suit la vérification se fait sur `where: { id }` seul. C'est sûr tant que la vérification précède, mais fragile si une route l'oublie.
- L'isolation n'est testée que sur les réglages, et la vérification des références n'a été faite que par échantillon.

**Row-Level Security** : non retenue au lancement (D12). Avec Prisma et le pooler de Neon en mode transaction, il faudrait un `SET LOCAL app.utilisateur` dans une transaction autour de chaque requête. C'est compliqué, et une erreur rendrait des pages vides sans rien protéger de plus. Le filet retenu :
- le filtrage par le code ;
- la matrice de tests sur toutes les routes ;
- un rôle PostgreSQL `mysalary_app` sans droits sur le schéma.

On rouvre la question au-delà de quelques centaines de comptes.

### 6.4 Passage à PostgreSQL

Travaux du lot [P4](#p4-passage-à-postgresql).
- **Schéma** : `provider = "postgresql"`, avec `url` pour la connexion mutualisée et `directUrl` pour la connexion directe (migrations). Les types sont inchangés (centimes en `Int`, dates civiles en `String`, instants en `timestamptz`).
- **Index** : un index sur `utilisateurId` partout, et des index composés selon les filtres réels (`[utilisateurId, date]` pour les dépenses et les mouvements, `[utilisateurId, moisFinance]` pour les paies).
- **Migrations** : les migrations SQLite ne se rejouent pas sur PostgreSQL. On repart d'une migration de départ générée depuis le schéma (`prisma migrate diff --from-empty --to-schema-datamodel`). Les anciennes sont archivées dans `server/prisma/migrations-sqlite/`. Ensuite, les migrations restent écrites à la main, puis appliquées par `prisma migrate deploy`.
- **Rôles** : `mysalary_app` (lecture et écriture des données) pour l'app ; un rôle propriétaire, réservé aux migrations.
- **Différences à tester** : tri des chaînes et des accents, casse, `contains` et `startsWith`, transactions simultanées, erreurs d'unicité (P2002 → 409, déjà géré).
- **Tests** : base de test PostgreSQL (branche Neon `test`, ou PostgreSQL local), avec un schéma neuf par exécution.
- **Reprise des données** : script `server/scripts/transfertSqlite.ts`. Il copie SQLite vers PostgreSQL compte par compte, dans une transaction, puis compare les nombres de lignes et les totaux en centimes par table. Il est d'abord joué sur une branche Neon jetable. Aucune opération destructive sur la base actuelle.

### 6.5 Sauvegarde, export et restauration

| Moyen | Aujourd'hui | Après P4 |
|---|---|---|
| Copie de la base | `npm run sauvegarde` : `VACUUM INTO` vers `sauvegardes/` (10 copies gardées) | Historique Neon (restauration à un instant donné, durée selon l'offre), plus un export programmé |
| Export d'un compte | Réglages › Sauvegarde : JSON complet | Inchangé |
| Restauration | Dans un compte vide uniquement (D9), aperçu avant écriture, limite de 50 Mo | Limite abaissée sous les 6 Mo acceptés par une fonction Netlify (JSON compressé dans le navigateur si besoin) |

Avant toute opération sur la base : `npm run sauvegarde` et un export JSON du compte `oussama`.

## 7. Sécurité et confidentialité

### 7.1 Protections en place

- **Authentification et sessions** : § 5.
- **Isolation** : § 6.3.
- **Validation** : Zod strict sur toutes les entrées. Requêtes Prisma paramétrées. La seule requête SQL brute (`VACUUM INTO`, sur un chemin interne) disparaît en P4.
- **En-têtes** : Helmet sur les réponses de l'API.
- **Erreurs** : format unique `{ erreur: { code, message, champs? } }`. Une erreur 500 ne contient jamais de détail interne ni de donnée financière ; le détail va seulement dans le journal.
- **Taille des requêtes** : 1 Mo, 50 Mo pour la restauration.
- **Données** : aucun service tiers, aucun pistage, aucune police distante. Pas de donnée financière dans les URL.
- **Suppression** : confirmée par le mot de passe, en cascade ; export possible juste avant.

### 7.2 Problèmes relevés

Audit du 15/10/2026.

| # | Gravité | Problème | Lot |
|---|---|---|---|
| 1 | Bloquant | SQLite ne convient pas à Netlify (pas de disque persistant) ; migrations et sauvegarde propres à SQLite | P4 |
| 2 | Bloquant | API en serveur continu avec purge par `setInterval` : à transformer en fonction et en tâche planifiée | P5 |
| 3 | Élevé | Limites d'essais en mémoire, inefficaces avec plusieurs instances | P2 |
| 4 | Élevé | `npm audit --omit=dev` : 6 failles (4 élevées, 2 modérées) dans `nodemailer`, `react-router`, `react-router-dom` et `deepmerge-ts` | P2 |
| 5 | Élevé | Sans `SMTP_URL`, le texte des e-mails, avec le lien de réinitialisation, est écrit dans le journal | P2 |
| 6 | Moyen | Écritures sur `where: { id }` après vérification (§ 6.3) | P1 |
| 7 | Moyen | Isolation testée seulement sur les réglages | P1 |
| 8 | Moyen | Restauration jusqu'à 50 Mo, au-delà de la limite des fonctions Netlify | P5 |
| 9 | Moyen | Index insuffisants pour PostgreSQL | P4 |
| 10 | Moyen | Variables d'environnement non vérifiées au démarrage | P2 |
| 11 | Faible | Aucun en-tête de sécurité sur les pages de l'interface (CSP, HSTS, `frame-ancestors`) | P5 |
| 12 | Faible | Session sans renouvellement, pas de « Se déconnecter de tous les appareils » | P3 |
| 13 | Faible | Aucune alerte à l'ancienne adresse après un changement d'e-mail ou de mot de passe | P3 |
| 14 | Faible | Aucun test de charge ni de concurrence | P6, P7 |

### 7.3 Secrets et journaux

- **Secrets** : `DATABASE_URL`, `DIRECT_URL`, `SMTP_URL`. Ils vivent uniquement dans `server/.env` (ignoré par git) en local, et dans les variables d'environnement de Netlify en production. Jamais dans le code, dans une variable `VITE_*`, ni dans le chat.
- **Fichiers jamais versionnés** : `.env`, la base SQLite, `sauvegardes/`, `Salaire/` (données personnelles réelles).
- **Journaux, règles cibles (P2)** :
  - en production, uniquement le destinataire masqué (`o***@gmail.com`) et le sujet d'un e-mail, jamais son texte ;
  - masquer `cookie`, `set-cookie`, `motDePasse`, `jeton` et `token` ;
  - aucun montant ni libellé financier.
- **Démarrage** : en production, le serveur refuse de démarrer sans `SMTP_URL` ou sans `APP_URL` en `https://` (P2).

### 7.4 Loi 09-08 et CNDP

- **Déclaration** : déclaration à la CNDP avant l'ouverture.
- **Hébergement à l'étranger** : Netlify et Neon sont hors du Maroc. Selon le pays de destination (Union européenne avec l'option « Europe », États-Unis avec l'option « économique »), le transfert peut demander une **autorisation préalable** de la CNDP. À confirmer avec la CNDP ou un juriste : je ne peux pas l'établir moi-même. C'est la décision D14.
- **Documents** : conditions d'utilisation et politique de confidentialité, acceptées à l'inscription (P3).
- **Droits des utilisateurs** : l'export et la suppression du compte existent déjà.

## 8. Déploiement

### 8.1 Variables d'environnement

En local : `server/.env`, à partir de `server/.env.example`. En production : les variables d'environnement de Netlify.

| Variable | Rôle | Défaut local | Production |
|---|---|---|---|
| `DATABASE_URL` | Base : fichier SQLite aujourd'hui, URL Neon mutualisée (`-pooler`, `pgbouncer=true&connection_limit=1`) après P4 | `file:./mysalary.db` | obligatoire, secret |
| `DIRECT_URL` | URL Neon directe, pour les migrations (après P4) | — | obligatoire, secret |
| `PORT` | Port de l'API en local | `3010` | inutile en fonction |
| `HOTE` | Adresse d'écoute ; `0.0.0.0` pour le réseau, derrière HTTPS | `127.0.0.1` | inutile en fonction |
| `APP_URL` | Adresse de l'interface, pour les liens des e-mails ; en `https://`, le cookie devient `Secure` | `http://127.0.0.1:6010` | `https://<domaine>` |
| `COOKIE_SECURE` | Forcer (`1`) ou non (`0`) le cookie `Secure` | selon `APP_URL` | selon `APP_URL` |
| `TRUST_PROXY` | `1` derrière un proxy (adresse du client lue dans `X-Forwarded-For`) | désactivé | `1` |
| `SMTP_URL` | Serveur d'envoi, ex. `smtps://user:pass@smtp.exemple.com:465` | absent (e-mails écrits dans le journal) | obligatoire, secret |
| `MAIL_FROM` | Expéditeur | `MySalary <no-reply@mysalary.local>` | adresse du domaine |

### 8.2 Netlify

Cible du lot [P5](#p5-api-et-interface-sur-netlify) :
- **Build** : `npm run build`, publication de `ui/dist`, fonctions dans `netlify/functions`.
- **Redirections** :
  - `/api/*` → `/.netlify/functions/api/:splat` (200) ;
  - `/*` → `/index.html` (200), pour les pages de l'app et le rechargement d'une page profonde.
- **Fonction `api`** : construit l'app Fastify une fois par instance et la réutilise, avec `@fastify/aws-lambda` ou `serverless-http` (choix après un essai des deux).
- **Fonction planifiée `purge`** : toutes les heures, à la place du `setInterval`.
- **En-têtes des pages** : `Content-Security-Policy` (scripts et styles du site seulement), `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`.
- **Limites des fonctions** (documentation Netlify, relevée le 15/10/2026) :
  - 60 s par requête et 30 s pour une fonction planifiée, non réglable ;
  - requête ou réponse de 6 Mo au plus ;
  - 1024 Mo de mémoire par défaut, réglable seulement en offre payante.
- **Région des fonctions** : Ohio (`cmh`) par défaut. Elle ne se change (Francfort `fra`, Londres `lhr`, Irlande `dub`) **qu'en offre Pro**. Voir le § 8.6.
- **PWA** : manifeste et icônes, installation sur Android et iPhone.
- **Local** : `npm run dev` garde le serveur Node actuel ; le mode fonction se teste avec `netlify dev`.

### 8.3 Neon

- **Branches** :
  - `main` pour la production ;
  - `dev` pour la prévisualisation Netlify ;
  - `test` pour les tests automatiques ;
  - des branches jetables pour les essais de reprise.
- **Région** : **la même que les fonctions Netlify** (D15) : Francfort (`aws-eu-central-1`) avec Netlify Pro, Ohio (`aws-us-east-2`) sinon. Une page de l'app enchaîne plusieurs requêtes à la base : séparer la base et les fonctions d'un océan ajouterait environ 100 ms à chaque requête.
- **Connexions** : URL mutualisée (`-pooler`, PgBouncer en mode transaction, jusqu'à 10 000 connexions clientes) pour l'app, et URL directe pour les migrations, comme le recommande Neon. Un seul `PrismaClient` par instance de fonction. `binaryTargets` adapté à Netlify (`rhel-openssl-3.0.x`, à confirmer), ou l'adaptateur `@prisma/adapter-neon`.
- **Rôles** : § 6.4.
- **Limites** : § 8.6.

### 8.4 E-mails en production

1. Choisir un fournisseur d'envoi transactionnel (Brevo : 300 messages par jour gratuits ; Resend : 3 000 par mois et 100 par jour), et récupérer son URL SMTP.
2. Renseigner `SMTP_URL` et `MAIL_FROM` (adresse du domaine de l'application).
3. Chez le fournisseur et chez l'hébergeur du domaine : publier les enregistrements **SPF** et **DKIM** qu'il donne, et un enregistrement **DMARC** (`v=DMARC1; p=none; rua=mailto:…` au départ).
4. S'envoyer une inscription et un « mot de passe oublié » vers Gmail et Outlook, puis vérifier dans les en-têtes que les messages arrivent en boîte de réception, avec SPF, DKIM et DMARC valides.

Le code d'envoi n'a été testé qu'avec un transport simulé ; l'essai réel se fait en P8.

### 8.5 Mise en production et retour arrière

Lot [P8](#p8-mise-en-production-et-bêta-fermée), dans cet ordre :
1. Sauvegarder la base SQLite et exporter le compte `oussama`.
2. Branche Neon `main` et rôles, puis `prisma migrate deploy` avec le rôle propriétaire.
3. Variables de production sur Netlify (§ 8.1), le domaine et HTTPS.
4. E-mails (§ 8.4).
5. Reprise des données (§ 6.4), vérifiée par les nombres de lignes et les totaux.
6. Tests de fumée en production (§ 9.2, points 1 à 9) avec un compte « Essai », supprimé ensuite.
7. Surveillance :
   - alertes Netlify (déploiement, erreurs de fonction) et Neon (stockage, calcul) ;
   - `/api/v1/sante` qui vérifie aussi la base.

**Retour arrière** : redéployer la version précédente depuis Netlify, et restaurer la base Neon à un instant donné, juste avant l'incident.

### 8.6 Offres, régions et coûts

Relevé le 15/10/2026 sur les sites officiels de Netlify et de Neon. À revérifier en P7, avant de payer.

**Netlify (offres à crédits)**

| Offre | Prix | Crédits par mois | Quand les crédits sont épuisés | Région des fonctions |
|---|---|---|---|---|
| Free | 0 $ | 300 | **Site en pause** (« Site not available ») jusqu'au mois suivant | Ohio, imposée |
| Personal | 9 $/mois | 1 000 | Recharge automatique possible (500 crédits pour 5 $) | Ohio, imposée |
| Pro | 20 $/mois | 3 000 | Recharge automatique possible (1 500 crédits pour 10 $) | Au choix, dont Francfort |

Consommation de crédits :
- 15 par mise en production ;
- 10 par Go-heure de calcul de fonction ;
- 20 par Go de bande passante ;
- 2 pour 10 000 requêtes.

Les prévisualisations et les déploiements de branche sont gratuits.

**Neon**

| Offre | Prix | Calcul | Stockage | Historique de restauration | Veille |
|---|---|---|---|---|---|
| Free | 0 $ | 100 CU-heures par projet et par mois | 1 Go par projet | 6 heures | après 5 min d'inactivité, non réglable |
| Launch | à l'usage (0,106 $ par CU-heure) | à l'usage | à l'usage | jusqu'à 7 jours (1 jour par défaut) | réglable |

Régions Neon en Europe : Francfort (`aws-eu-central-1`) et Londres (`aws-eu-west-2`).

**Estimation pour 50 utilisateurs actifs** (hypothèses, à remplacer par la mesure de P7)
- **Hypothèses** : 100 appels à l'API par jour et par utilisateur, 0,3 s par appel avec 1 Go de mémoire, environ 10 mises en production par mois.
- **Netlify** : environ 150 000 appels par mois.

  | Poste | Crédits par mois |
  |---|---|
  | Calcul | ≈ 125 |
  | Requêtes, y compris les fichiers de l'interface | ≈ 90 |
  | Bande passante | ≈ 120 |
  | Mises en production | ≈ 150 |
  | **Total** | **≈ 500** |

  C'est au-dessus des 300 crédits de l'offre Free, et sa limite stricte mettrait le site en pause.
- **Neon** : avec des utilisateurs répartis sur la journée, la base reste éveillée environ 17 h par jour, soit environ 130 CU-heures par mois à 0,25 CU. C'est au-dessus des 100 de l'offre Free, ce qui représente environ 14 $ par mois en Launch.

**Conséquences**
- **Pas d'offre gratuite en production** : Free reste pour les prévisualisations (Netlify) et les branches `dev` et `test` (Neon). Il faut un projet Neon gratuit séparé pour qu'elles n'entament pas le calcul de la production.
- **Option « Europe »** : Netlify Pro (20 $) + Neon Launch à Francfort (≈ 14 $), soit ≈ 34 $ par mois. Données en Union européenne, temps de réponse plus court depuis le Maroc.
- **Option « économique »** : Netlify Personal (9 $) + Neon Launch dans l'Ohio (≈ 14 $), soit ≈ 23 $ par mois. Données aux États-Unis, environ 100 ms de plus par appel depuis le Maroc.

### 8.7 Actions manuelles

Je ne saisis aucun secret ni aucun mot de passe de service : tu les mets toi-même dans `server/.env` ou dans Netlify.

| Action 🔧 | Où | Lot |
|---|---|---|
| Créer les comptes Netlify et Neon | sites des services | P0 |
| Démarche CNDP : déclaration et, si besoin, autorisation de transfert (D14) | CNDP | à lancer maintenant, aboutie avant P8 |
| Projet Neon « mysalary-dev » dans l'Ohio (`aws-us-east-2`) | console Neon | avant P4 |
| Choisir l'option « Europe » ou « économique » (D15) et l'offre payante | Netlify, Neon | après P7, avant P8 |
| Créer le projet Neon, les branches et les rôles | console Neon | P4, P8 |
| Mettre les URL de base dans `server/.env` et dans Netlify | ta machine, Netlify | P4, P5 |
| Relier le dépôt GitHub à Netlify | Netlify | P5 |
| Fournisseur SMTP, SPF, DKIM et DMARC | fournisseur d'e-mails, DNS | P8 |
| Nom de domaine et HTTPS | registrar, Netlify | P8 |
| Valider chaque lot | — | tous |

## 9. Tests

### 9.1 Tests existants

486 tests au 15/10/2026, lancés par `npm run verifier` (types, tests, build) :
- partage : 23 ;
- moteur : 182 ;
- serveur : 117, avec `fastify.inject` sur une base de test vidée avant chaque test ;
- interface : 164, avec Testing Library.

Fichiers serveur liés aux comptes : `authentification.test.ts`, `compte.test.ts`, `email.test.ts`, `isolation.test.ts`, `messagerie.test.ts`, `sauvegarde.test.ts`. Stratégie générale de tests : produit.md (Plan) § 13.

### 9.2 Tests avant mise en production

| # | Test | Automatique | Navigateur | Lot |
|---|---|---|---|---|
| 1 | Inscription puis connexion d'un nouvel utilisateur | `authentification.test.ts` | oui | P3, P8 |
| 2 | Déconnexion et expiration de session | `authentification.test.ts` + test 401 de l'interface | oui | P3 |
| 3 | Réinitialisation du mot de passe par e-mail | `authentification.test.ts` | oui, avec un vrai e-mail | P3, P8 |
| 4 | Modification du profil (prénom, e-mail, mot de passe, préférences) | `compte.test.ts`, `email.test.ts` | oui | P3 |
| 5 | Persistance après reconnexion | nouveau test | oui | P3, P4 |
| 6 | Routes et API privées refusées sans session | matrice d'isolation | oui | P1 |
| 7 | Isolation complète entre deux comptes | matrice d'isolation | oui (deux comptes, un navigateur) | P1 |
| 8 | Cohérence financière après plusieurs modifications | `concurrence.test.ts` + scénario de bout en bout | oui | P6 |
| 9 | Pages et calculs identiques après déploiement | tous les tests sur PostgreSQL | comparaison de captures | P4, P5 |
| 10 | Plusieurs utilisateurs simultanés | script de charge | — | P7 |

Vérification dans le navigateur à 1342 et 375 px, avec des comptes « Essai » supprimés ensuite. Le compte `oussama` n'est jamais modifié.

### 9.3 Concurrence et charge

**Concurrence** (`server/test/concurrence.test.ts`, sur PostgreSQL, P6) :
- 20 versements simultanés sur un objectif : solde final = somme exacte ;
- 10 dépenses simultanées sur une enveloppe : bilan du mois exact ;
- deux réordonnancements simultanés : priorités de 1 à N, sans trou ni doublon ;
- 50 comptes qui écrivent en parallèle : aucun mélange entre comptes.

**Charge** (`scripts/charge/`, avec `autocannon` ou `k6`, P7) :
- **Scénario** : 50 utilisateurs virtuels, chacun avec son propre compte d'essai, qui enchaînent connexion → Aujourd'hui, Mois, Objectifs → ajout d'une dépense → relecture → déconnexion. Pendant 5 minutes, avec une montée progressive.
- **Mesures** : p50 et p95 par route, taux d'erreur, connexions PostgreSQL, démarrages à froid, temps CPU.
- **Environnements** : d'abord en local, puis sur la prévisualisation Netlify avec la branche Neon `dev`.
- **Goulots à vérifier** :
  - recalcul du calendrier complet du compte à chaque page (`chargerCalendrier`) ;
  - `scrypt` (environ 50 ms et 32 Mo par connexion) ;
  - réveil de Neon.

### 9.4 Journal des résultats

Un test non exécuté est noté « non exécuté », jamais « réussi ». Aucune capacité n'est annoncée sans mesure.

| Date | Environnement | Test | Résultat |
|---|---|---|---|
| 15/10/2026 | local, SQLite | `npm run verifier` | 486 tests réussis, build OK |
| — | — | Tests 1 à 10 du § 9.2 | non exécutés |

## 10. Lots P0 à P9

Chaque lot suit la méthode du dépôt : analyse → travaux → tests → vérification navigateur → rapport → validation.

### P0. Hébergement et cadre légal

- **Objectif** : choisir où tournent l'API et la base avant de toucher au code.
- **Fait (15/10/2026)** :
  - D11 validée : Netlify Functions + Neon ;
  - limites et prix officiels relevés (§ 8.2, 8.3, 8.6) ;
  - constat : fonctions et base doivent être dans la même région, et la région des fonctions n'est au choix qu'en Netlify Pro ;
  - estimation de consommation pour 50 utilisateurs : les offres gratuites ne suffisent pas en production ;
  - D15 (options « Europe » et « économique ») et D14 (CNDP) posées.
- **Décidé avec toi (15/10/2026)** :
  - D14 : tu engages la démarche CNDP ;
  - D15 : l'offre finale est choisie après la mesure de P7 ;
  - les lots 28 et 29 viennent après P9.
- **Conséquence pour la suite** : le projet Neon de développement sera créé dans l'Ohio (`aws-us-east-2`), la seule région des fonctions en Netlify Free. Sinon les mesures de P5 et P7 seraient faussées par la traversée de l'Atlantique. La base de production, elle, sera créée en P8 dans la région de l'option choisie.
- **Fin** : ta validation de P0.
- **🔧 Toi** :
  - créer les comptes Netlify et Neon, en offre gratuite ;
  - créer un projet Neon « mysalary-dev » dans la région **AWS US East 2 (Ohio)** ;
  - lancer la démarche CNDP.

### P1. Isolation stricte des données

- **Objectif** : prouver qu'aucun compte ne peut lire, modifier ou supprimer les données d'un autre, sur toutes les routes.
- **Travaux** :
  1. **Matrice d'isolation** (`server/test/isolation.test.ts`) : comptes A et B avec des données dans chaque entité. A appelle chaque route qui prend un identifiant avec celui de B, et doit obtenir 404 sans que les données de B changent. A crée des éléments qui référencent des identifiants de B, et rien n'est créé. Les listes et les pages calculées de A ne contiennent rien de B. La liste des routes est lue dans Fastify : une route sans cas de test fait échouer le test.
  2. **Écritures filtrées par compte** : `updateMany` et `deleteMany` sur `{ id, utilisateurId }`, avec 404 si rien n'est touché ; même filet pour le réordonnancement et la simulation.
  3. **Relations** relues dans `schema.prisma` : cascade, et aucune référence possible vers un autre compte.
  4. **Interface** : A se connecte puis se déconnecte, B se connecte dans le même navigateur, et rien de A ne doit apparaître (cache, écran, `localStorage`).
  5. Valider D12.
- **Fin** : 100 % des routes de compte couvertes, plus aucune écriture sur `where: { id }` seul, `npm run verifier` vert. Mettre à jour le § 6.3.

### P2. Durcissement de la sécurité

- **Objectif** : corriger les failles qui ne dépendent pas de l'hébergement (§ 7.2, points 3, 4, 5 et 10).
- **Travaux** :
  1. **Dépendances** mises à jour une par une, tests à l'appui (pas de `npm audit fix --force`).
  2. **Configuration vérifiée au démarrage** (`server/src/config.ts`, Zod) ; démarrage refusé en production si elle est incomplète.
  3. **Journaux** selon le § 7.3.
  4. **Limites d'essais en base** : table `TentativeAcces` (clé, nombre, fin de fenêtre), purgée avec les sessions.
  5. **Champ inconnu refusé** : un test par module, s'il manque.
  6. **Mots de passe courants** refusés.
- **Fin** :
  - `npm audit --omit=dev` sans faille élevée ;
  - tests : démarrage refusé avec une configuration incomplète, aucun lien dans les journaux en production, limite d'essais tenue avec deux instances sur la même base.

  Mettre à jour les § 5.4, 7.2 et 7.3.

### P3. Authentification de bout en bout

- **Objectif** : chaque parcours de compte marche de l'écran à la base, avec ses états de chargement, d'erreur et de confirmation.
- **Travaux** :
  - tout le tableau du § 5.6, avec un test serveur et un test d'interface pour chaque ajout ;
  - tour de chaque bouton des pages Connexion, Inscription, Mot de passe oublié et Réglages : aucun bouton sans action ;
  - gabarits d'e-mail d'alerte dans `server/src/lib/gabarits.ts`.
- **Fin** : tous les parcours du § 5 passés dans le navigateur à 1342 et 375 px, avec captures. Mettre à jour les § 5.1 à 5.6.

### P4. Passage à PostgreSQL

- **Objectif** : la même app sur PostgreSQL, sans perte de données.
- **Travaux** : tout le § 6.4, en commençant par la sauvegarde du § 6.5.
- **Fin** :
  - `npm run verifier` vert sur PostgreSQL ;
  - reprise répétée sur une branche jetable, avec nombres de lignes et totaux identiques ;
  - pages Aujourd'hui, Mois, Année et Objectifs identiques pour le compte `oussama`, comparées sur captures.
  Mettre à jour les § 6.2 et 6.5.
- **🔧 Toi** : projet Neon, branches `dev` et `test`, URL dans `server/.env`.

### P5. API et interface sur Netlify

- **Objectif** : interface et API déployées sur une adresse de prévisualisation Netlify, reliées à la branche Neon `dev`.
- **Travaux** : tout le § 8.2, plus Prisma en serverless (§ 8.3) et la limite de restauration (§ 6.5). Vérifier que le bundle de l'interface ne contient aucune URL de base ni aucun secret.
- **Fin** :
  - prévisualisation fonctionnelle : inscription, connexion, toutes les pages, rechargement d'une page profonde, déconnexion ;
  - cookie `Secure`, `HttpOnly`, `SameSite=Strict` et en-têtes de sécurité vérifiés dans le navigateur ;
  - PWA installable.
- **🔧 Toi** : relier GitHub à Netlify, saisir les variables.

### P6. Cohérence financière et concurrence

- **Objectif** : des chiffres toujours justes, même avec des actions simultanées ou répétées.
- **Travaux** :
  1. **Transactions** : faire le tour des écritures multiples (paie et lignes de paie, achat d'un objectif, clôture d'un mois, application d'une simulation, restauration, suppression d'une source de revenu), chacune dans une seule transaction.
  2. **Double envoi** : boutons désactivés pendant l'envoi, et contraintes uniques là où un doublon est impossible métier.
  3. **Concurrence** : appliquer D13.
  4. **Tests** de concurrence du § 9.3.
  5. **Scénario de bout en bout** : salaire, charges, dépenses, versements, modification puis suppression, avec des totaux qui concordent entre Aujourd'hui, Mois, Année, Objectifs et Épargne.
- **Fin** : tests verts sur PostgreSQL, aucun écart entre les pages.

### P7. Charge et fiabilité

- **Objectif** : mesurer le comportement avec 50 utilisateurs, et rendre l'app robuste aux pannes réseau.
- **Travaux** :
  1. Script et mesures du § 9.3, d'abord en local, puis sur la prévisualisation.
  2. Optimiser les goulots relevés.
  3. **Interface** : nouvelle tentative automatique pour les lectures seulement, jamais pour les écritures. Message « Connexion perdue » avec un bouton « Réessayer », et un délai maximal par requête.
  4. **Serveur** : délai sur les requêtes Prisma, et réponse 503 claire si la base est indisponible.
  5. Relever les quotas de Netlify et de Neon (§ 8.2, § 8.3) et calculer la marge pour 50 utilisateurs actifs.
- **Fin** : résultats datés au § 9.4, aucune erreur 5xx sous 50 utilisateurs simultanés (ou causes connues et corrigées). Pour le p95, la cible est de moins de 800 ms à chaud, seuil à valider après la première mesure.

### P8. Mise en production et bêta fermée

- **Objectif** : ouvrir la production avec tes données reprises, puis 10 à 20 testeurs.
- **Travaux** : procédure du § 8.5, essai réel des e-mails (§ 8.4), puis invitation des testeurs.
- **Fin** : production en ligne, ton compte repris et identique, § 9.2 entièrement coché et daté.
- **🔧 Toi** : domaine, DNS, fournisseur d'e-mails, CNDP, choix des testeurs, validation de l'ouverture.

### P9. Recette finale

- **Objectif** : confirmer que tout est prêt et que la documentation dit vrai.
- **Travaux** :
  - rejouer le § 9.2 en production ;
  - relire tout ce document, dont les statuts, les décisions et les « en place » ;
  - mettre à jour le README, `docs/lots.md` et la skill `codebase-overview`.
- **Fin** : critères du § 11 vérifiés.

## 11. Critères d'ouverture

La bêta fermée (P8) s'ouvre avant les lots 28 et 29. MySalary est **prêt à commercialiser** quand :
- les lots P0 à P9 sont validés, ainsi que les lots fonctionnels 24 à 29 de `docs/lots.md` ;
- la bêta fermée a duré 4 semaines sans perte de données ;
- chaque calcul clé a un cas de référence exact au centime (lot 29) ;
- aucun compte ne lit les données d'un autre (matrice de tests et essai manuel) ;
- une restauration depuis la sauvegarde de la veille a été faite pour de vrai ;
- les e-mails arrivent en boîte de réception ;
- la capacité pour 50 utilisateurs a été mesurée (§ 9.4).

L'abonnement payant (lot 32) vient après l'ouverture.

## 12. Risques résiduels

- **Démarrages à froid** : premier affichage lent après une période calme (fonction et Neon en veille). Mesuré en P7 ; plan B, l'option B de D11.
- **Quotas** : en offre Netlify Free, des crédits épuisés mettent le site en pause jusqu'au mois suivant. D'où une offre payante en production (§ 8.6), avec la recharge automatique activée ou une alerte de consommation.
- **Pas de RLS** : l'isolation repose sur le code et la matrice de tests (D12).
- **Dernière écriture gagnante** entre deux onglets (D13).
- **E-mails** : la livraison dépend du fournisseur et du DNS ; un e-mail en spam bloque la récupération du compte.
- **CNDP** : un délai d'autorisation peut retarder l'ouverture (D14).
- **Une seule personne pour l'exploitation** : aucune astreinte ; sauvegardes et surveillance automatiques indispensables.
