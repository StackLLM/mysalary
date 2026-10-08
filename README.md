# MySalary

Assistant financier personnel centré sur le salaire.

Documentation : `Plan.md` · `context.md` · `UX.md` · `UI.md` · `docs/lots/`.

## Démarrer

```bash
npm install
npm run db:migrer
npm run dev
```

- Interface : http://127.0.0.1:6010
- Serveur : http://127.0.0.1:3010/api/v1/sante

## Vérifier

```bash
npm run verifier
```

Types, tests et build de tous les paquets.

## Structure

| Dossier | Rôle |
|---|---|
| `ui/` | Interface React + Vite |
| `server/` | API Fastify + Prisma (SQLite) |
| `packages/moteur/` | Moteur financier pur, sans base ni React |
| `packages/partage/` | Schémas Zod, types et formatage partagés |

Pas d'authentification en v1 : tout écoute uniquement en local.
