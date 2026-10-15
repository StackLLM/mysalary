# MySalary

Assistant financier personnel centré sur le salaire : ce qui reste aujourd'hui, cette semaine et ce mois-ci, et quand chaque objectif d'épargne sera atteint. Plusieurs personnes peuvent l'utiliser, chacune avec son compte privé.

Documentation : voir la section [Documentation](#documentation) ci-dessous.

## Documentation

`README.md` est le seul document à la racine. Le reste est dans `docs/` :

| Document | Contenu |
|---|---|
| [`docs/produit.md`](docs/produit.md) | **Contexte** (pourquoi MySalary existe, règles métier R1…) et **Plan** (décisions, architecture, données, logique du moteur, sécurité, tests, positionnement SaaS § 15) |
| [`docs/ux-ui.md`](docs/ux-ui.md) | **UX** (parcours, pages, états) et **UI** (couleurs, typographie, composants, graphiques) |
| [`docs/lots.md`](docs/lots.md) | **Suivi** des lots (sommaire, statut, points reportés, commits, lots 24 à 31 à venir) et **bilan détaillé** de chaque lot (§ 8) |
| [`docs/etude/`](docs/etude/Etude-marche-2026-10.html) | Étude de marché et benchmark du 12/10/2026 (page HTML) |

Les commentaires du code renvoient à ces documents : « produit.md (Plan) § 7.1 », « produit.md (Contexte) R27 », « ux-ui.md (UX) § 5.11 », « ux-ui.md (UI) § 8 », « docs/lots.md, bilan du lot 4 ».

## Fonctionnalités

- **Compte** : inscription, connexion, déconnexion, mot de passe oublié, changement d'e-mail et de mot de passe, suppression. Chaque compte ne voit que ses propres données.
- **Mise en route** guidée, avec import de l'ancienne app (money-guru).
- **Mon plan** : salaire et cycle de paie, primes et autres revenus, charges fixes, enveloppes (par mois, par semaine ou par jour), ponctuels, dettes, épargne.
- **Aujourd'hui** : tableau de bord du mois — indicateurs (revenus, dépensé, épargne, objectifs), reste à dépenser du mois et de la semaine, à faire, postes qui pèsent le plus, enveloppes à surveiller, grosses dépenses, 7 prochains jours.
- **Mois** : vue d'ensemble, dépenses, semaines (reste de chaque enveloppe), clôture du mois, cumul de mois en mois.
- **Objectifs** : vue annuelle de tous les objectifs (progression, trajectoire de l'année, fin d'année par scénario, objectifs à risque, prochaines actions), détail de chaque objectif avec simulation du cumul de fin de mois.
- **Épargne** : comptes déclarés, mouvements, réservé par objectif, versements prévus du mois notés en un clic.
- **Année**, **Calendrier**, **Simulateur** de scénarios, suggestions et alertes.
- **Sauvegarde** : export JSON d'un compte, restauration dans un compte vide, sauvegarde de la base.

## Architecture

| Dossier | Rôle |
|---|---|
| `ui/` | Interface React 18 + Vite, TanStack Query, Tailwind, Radix |
| `server/` | API Fastify 5 + Prisma 6 (SQLite), sous `/api/v1` |
| `packages/moteur/` | Moteur financier pur (aucune base, aucun React) : tous les calculs |
| `packages/partage/` | Schémas Zod, types et formatage partagés par l'API et l'interface |

L'interface appelle l'API sur la même origine (Vite relaie `/api` vers le serveur en développement).

## Installation et lancement

Node 22 ou plus (voir `.nvmrc`).

```bash
npm install
```

```bash
cp server/.env.example server/.env
```

```bash
npm run db:migrer
```

```bash
npm run dev
```

- Interface : http://127.0.0.1:6010 (créer un compte depuis `/inscription`)
- API : http://127.0.0.1:3010/api/v1/sante

## Variables d'environnement (`server/.env`)

| Variable | Rôle | Défaut |
|---|---|---|
| `DATABASE_URL` | Fichier SQLite (relatif à `server/prisma/`) | `file:./mysalary.db` |
| `PORT` | Port de l'API | `3010` |
| `HOTE` | Adresse d'écoute ; `0.0.0.0` pour le réseau, derrière HTTPS | `127.0.0.1` |
| `APP_URL` | Adresse de l'interface, pour les liens envoyés par e-mail ; en `https://`, le cookie devient `Secure` | `http://127.0.0.1:6010` |
| `COOKIE_SECURE` | Forcer (`1`) ou non (`0`) le cookie `Secure` | selon `APP_URL` |
| `TRUST_PROXY` | `1` derrière un proxy (adresse du client lue dans `X-Forwarded-For`) | désactivé |
| `SMTP_URL` | Serveur d'envoi des e-mails, ex. `smtps://user:pass@smtp.exemple.com:465` | absent : les liens sont écrits dans le journal du serveur |
| `MAIL_FROM` | Expéditeur des e-mails | `MySalary <no-reply@mysalary.local>` |

## Authentification

- **Comptes** : e-mail (unique) et mot de passe (8 caractères au moins), haché avec `scrypt`, jamais stocké ni renvoyé.
- **Sessions** : cookie `HttpOnly`, `SameSite=Strict` (et `Secure` en HTTPS), valable 30 jours ; seule l'empreinte du jeton est en base. Changer ou réinitialiser le mot de passe ferme les autres sessions.
- **Isolation** : le compte courant vient uniquement de la session ; toutes les données sont filtrées par compte côté serveur. Les actions lourdes (supprimer, réinitialiser) redemandent le mot de passe.
- **Mot de passe oublié** : lien à usage unique, valable 1 heure, envoyé par e-mail (ou écrit dans le journal du serveur sans `SMTP_URL`).
- **Adresse e-mail confirmée** : à l'inscription, un lien (24 heures, un seul usage) part vers l'adresse ; tant qu'il n'est pas ouvert, un bandeau le rappelle et permet de le renvoyer (3 envois par heure). Choisir un mot de passe par un lien reçu confirme aussi l'adresse.
- **Changer d'e-mail** (Réglages) : le mot de passe est exigé, puis un lien part vers la **nouvelle** adresse ; l'adresse ne change qu'à l'ouverture du lien, l'ancienne reste valable d'ici là.
- **Nettoyage** : les sessions et liens expirés sont supprimés au démarrage du serveur, puis toutes les heures.
- **Essais limités** : 5 échecs de connexion par e-mail et 20 par adresse en 15 minutes.

### Comptes créés avant l'authentification

Ils gardent toutes leurs données mais n'ont ni e-mail ni mot de passe. Pour en activer un, sur la machine du serveur :

```bash
npm run compte:activer -- oussama <ton-e-mail>
```

La commande affiche un lien (valable 24 heures) pour choisir le mot de passe ; ensuite, connexion normale avec cet e-mail, considéré comme confirmé. Pour le changer plus tard : Réglages › E-mail de connexion.

## E-mails en production

Sans `SMTP_URL`, aucun message ne part : il est écrit dans le journal du serveur (usage local). Pour envoyer pour de vrai :

1. Choisir un fournisseur d'envoi transactionnel (Brevo : 300 messages par jour gratuits ; Resend : 3 000 par mois, 100 par jour) et récupérer son URL SMTP.
2. Renseigner `SMTP_URL` et `MAIL_FROM` (adresse du domaine de l'application).
3. Au fournisseur et chez l'hébergeur du nom de domaine : publier les enregistrements **SPF** et **DKIM** qu'il donne, et un enregistrement **DMARC** (`v=DMARC1; p=none; rua=mailto:…` au départ).
4. S'envoyer une inscription et un « mot de passe oublié » vers Gmail et Outlook, et vérifier que les messages arrivent en boîte de réception avec SPF, DKIM et DMARC valides (en-têtes du message).

## Commandes utiles

| Commande | Rôle |
|---|---|
| `npm run verifier` | Types, tests et build de tous les paquets |
| `npm run db:migrer` | Appliquer les migrations (développement) |
| `npm run sauvegarde` | Copier la base dans `sauvegardes/` (10 copies gardées) |
| `npm run compte:activer -- <prénom> <e-mail>` | Activer un compte d'avant l'authentification |

## Mise en ligne

Avant d'ouvrir l'accès hors de cette machine : servir l'interface et l'API en HTTPS derrière un proxy (`APP_URL` en `https://`, `TRUST_PROXY=1`, `HOTE=0.0.0.0`), configurer `SMTP_URL`, et sauvegarder la base régulièrement.
