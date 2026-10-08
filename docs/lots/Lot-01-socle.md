# Lot 1 — Socle

> Statut : **clôturé et validé** (07/10/2026). Référence : `Plan.md` § 5 · `docs/plan.md`.

## Objectif

Poser les fondations techniques. Aucune fonction métier visible.

## Périmètre

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

## Routes livrées

| Route | Rôle | Utilisateur requis |
|---|---|---|
| `GET /api/v1/sante` | Le serveur répond | Non |
| `GET /api/v1/utilisateurs` | Liste des comptes | Non |
| `POST /api/v1/utilisateurs` | Créer un compte (+ réglages par défaut) | Non |
| `PUT /api/v1/utilisateurs/:id` | Renommer | Non |
| `DELETE /api/v1/utilisateurs/:id` | Supprimer un compte et toutes ses données | Non |
| `GET /api/v1/reglages` | Réglages du compte courant | Oui |
| `PUT /api/v1/reglages` | Modifier les réglages du compte courant | Oui |

## Critères de validation

- [x] `npm run verifier` passe : types, tests, build.
- [x] Création, liste, renommage, suppression de comptes.
- [x] Sans en-tête ou avec un identifiant inconnu → erreur 401 normalisée.
- [x] L'utilisateur A ne lit ni ne modifie jamais les réglages de B.
- [x] Une entrée invalide → erreur 400 avec le détail par champ.
- [x] Le moteur convertit et additionne les montants en centimes sans erreur d'arrondi.
- [x] L'UI démarre, appelle le serveur, affiche les comptes.

## Résultat

- `npm run verifier` : types OK, **28 tests** OK (partage 7, moteur 7, serveur 10, ui 4), build OK.
- Vérifié en direct (`npm run dev`) : santé, création de compte, réglages par compte, erreurs 400 et 401, suppression, page technique dans le navigateur, aucune erreur console.

## Écarts et remarques

- Validation Zod faite à la main (`valider`) plutôt qu'avec `fastify-type-provider-zod` : une dépendance de moins, format d'erreur maîtrisé.
- Prisma 6 (et non 7) : configuration stable et connue.
- Vite écoute sur `127.0.0.1` et non sur le réseau (`host: true` de la skill) : sans mot de passe, l'app ne doit pas être visible des autres appareils.
- npm 11 bloque les scripts d'installation : Prisma et esbuild ont été autorisés dans `package.json` (`allowScripts`).
- La page affichée est **technique** : elle sera remplacée par l'écran Profils (lot 3) avec le design system (lot 2).
