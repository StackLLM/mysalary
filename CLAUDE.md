# Projet : MySalary (SaaS de budget centré sur le salaire ; TypeScript, npm workspaces)
<!-- Notes mainteneur : invisibles pour Claude -->

## Commandes
- Dev (serveur 3010 + interface 6010) : `npm run dev` · Tout vérifier (types, tests, build) : `npm run verifier`
- Tests : `npm test` · Un seul fichier : `npx vitest run <fichier>` dans le paquet concerné (`server`, `ui`, `packages/moteur`…)
- Base : `npm run db:migrer` · Sauvegarde : `npm run sauvegarde` · Activer un ancien compte : `npm run compte:activer -- <prénom> <e-mail>`

## Conventions
- Noms et textes en français. Montants en centimes entiers (type `Centimes`), jamais de flottants.
- Flux : route (`server/src/modules/*/routes.ts`) → dépôt (`depot.ts`) → moteur (`packages/moteur`). Tous les calculs sont dans le moteur ; l'interface affiche.
- Schémas Zod et types partagés dans `packages/partage`. Petites règles d'affichage de l'interface dans les `saisie.ts`.
- Ne jamais mélanger réel, prévu et projeté ; ne jamais présenter une donnée fictive comme réelle.
- Interface fidèle à `Templates/image.png`, sauge `#7D8C82`, thème clair uniquement. Textes directs, sans remplissage.
- Comptes : l'identité vient uniquement de la session (cookie), jamais d'un en-tête ni d'un paramètre.

## Pièges connus
- **Ne jamais faire `git commit` ni `git push`** : l'utilisateur commite. Donner seulement le message : anglais, style conventionnel, sans mention d'outil ni `Co-Authored-By`.
- Ne jamais supprimer ni réinitialiser le compte `oussama`. Pour tester dans le navigateur : comptes « Essai » jetables, supprimés ensuite.
- Les serveurs de l'utilisateur tournent déjà sur 3010 et 6010 : ne pas en lancer d'autres.
- `Salaire/` contient des données personnelles : ne pas le lire, ne jamais le versionner. Aucune donnée réelle dans les tests.
- Migrations Prisma écrites à la main, puis `prisma migrate deploy` + `prisma generate`.
- Les références de commentaires visent `docs/` : « produit.md (Plan) § 7.1 », « ux-ui.md (UX) § 5.11 », « docs/lots.md, bilan du lot 4 ».
- Méthode d'un lot : analyse → fiche → moteur → API → interface → tests → vérification navigateur (1342 et 375 px) → rapport → validation. Pas de lot suivant sans validation.

## Contexte
- Architecture : utiliser la Skill `codebase-overview`
- Décisions : `docs/decisions/` (lire seulement si utile) · Suivi des lots : `docs/lots.md`

# Compact instructions
Conserver : fichiers modifiés, décisions prises, erreurs de test non résolues, lot en cours.
