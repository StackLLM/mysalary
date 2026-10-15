# MySalary

Assistant financier personnel centré sur le salaire : ce qui reste aujourd'hui, cette semaine et ce mois-ci, et quand chaque objectif d'épargne sera atteint. Plusieurs personnes peuvent l'utiliser, chacune avec son compte privé.

Documentation : voir la section [Documentation](#documentation) ci-dessous.

## Documentation

`README.md` est le seul document à la racine. Le reste est dans `docs/` :

| Document | Contenu |
|---|---|
| [`docs/produit.md`](docs/produit.md) | **Contexte** (pourquoi MySalary existe, règles métier R1…) et **Plan** (décisions, architecture, données, logique du moteur, sécurité, tests, positionnement SaaS § 15) |
| [`docs/ux-ui.md`](docs/ux-ui.md) | **UX** (parcours, pages, états) et **UI** (couleurs, typographie, composants, graphiques) |
| [`docs/lots.md`](docs/lots.md) | **Suivi** des lots fonctionnels (sommaire, statut, points reportés, commits, lots à venir) et **bilan détaillé** de chaque lot (§ 8) |
| [`docs/prod.md`](docs/prod.md) | **Production** : comptes et sessions, isolation des données, base, sécurité, déploiement Netlify + Neon, tests, décisions et lots P0 à P9 |
| [`docs/etude/`](docs/etude/Etude-marche-2026-10.html) | Étude de marché et benchmark du 12/10/2026 (page HTML) |

Les commentaires du code renvoient à ces documents : « produit.md (Plan) § 7.1 », « produit.md (Contexte) R27 », « ux-ui.md (UX) § 5.11 », « ux-ui.md (UI) § 8 », « docs/lots.md, bilan du lot 4 ».

## Fonctionnalités

- **Compte** : inscription, connexion, déconnexion, mot de passe oublié, changement d'e-mail et de mot de passe, suppression. Chaque compte ne voit que ses propres données.
- **Mise en route** guidée, avec import de l'ancienne app (money-guru).
- **Mon plan** : salaire et cycle de paie, primes et autres revenus, charges fixes, enveloppes (par mois, par semaine ou par jour), ponctuels, dettes, épargne.
- **Aujourd'hui** : tableau de bord du mois — quatre chiffres (reçu, dépensé sur le total des charges, reste à payer, épargné), un gros chiffre « Reste du mois, avant épargne » avec la mention qu'il est sans l'épargne, le reste de la semaine, à faire, postes qui pèsent le plus, enveloppes à surveiller, grosses dépenses, 7 prochains jours.
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

## Comptes, sécurité et mise en ligne

Tout est dans [`docs/prod.md`](docs/prod.md) : variables d'environnement (§ 8.1), authentification et sessions (§ 5), activation d'un compte d'avant l'authentification (§ 5.5), e-mails en production (§ 8.4), déploiement Netlify + Neon et lots P0 à P9.

## Commandes utiles

| Commande | Rôle |
|---|---|
| `npm run verifier` | Types, tests et build de tous les paquets |
| `npm run db:migrer` | Appliquer les migrations (développement) |
| `npm run sauvegarde` | Copier la base dans `sauvegardes/` (10 copies gardées) |
| `npm run compte:activer -- <prénom> <e-mail>` | Activer un compte d'avant l'authentification |
