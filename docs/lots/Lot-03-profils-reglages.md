# Lot 3 — Profils et réglages

> Statut : **clôturé et validé** (07/10/2026). Références : `UX.md` § 4.0, § 5.0, § 5.12 · `Plan.md` § 5.7.

## Objectif

Choisir son compte, en créer un, et régler son profil. Remplace la page technique du lot 1.

## Périmètre

| Inclus | Exclu (lots suivants) |
|---|---|
| Écran **Profils** : liste des comptes, dernière ouverture, création, renommage, suppression (double confirmation) | Onboarding (lot 16) |
| Garde : sans compte choisi → Profils ; compte retenu supprimé → retour à Profils avec message | Export avant suppression (lot 17) |
| Menu de l'avatar : changer de compte, réglages | Jour de paie, contrat de salaire (lot 4) |
| Écran **Réglages** : prénom, devise (lecture seule), mode de période, début de semaine, report hebdo, animations | Catégories, règles des scénarios (lots 6 et 11) |
| Animations : le réglage du compte pilote la bascule (déjà prête au lot 2) | Authentification (lot 19) |
| Serveur : date de dernière ouverture, route « ouvrir un compte » | |

Les deux écrans suivent la structure du template : fil d'Ariane, carte principale, colonne latérale de 352 px, grand bouton plein.

## Routes ajoutées

| Route | Rôle |
|---|---|
| `POST /api/v1/utilisateurs/:id/ouvrir` | Marque le compte comme ouvert maintenant (tri de la liste) |

## Critères de validation

- [x] `npm run verifier` passe.
- [x] Sans compte : toute page renvoie vers Profils.
- [x] Compte retenu supprimé : retour à Profils, message clair, aucune erreur affichée en double.
- [x] Création : prénom vide refusé avec message sous le champ.
- [x] Changement de compte : aucune donnée de l'ancien compte ne reste à l'écran.
- [x] Suppression : il faut retaper le prénom pour confirmer.
- [x] Chaque réglage s'enregistre tout seul, avec un toast « Annuler ».
- [x] Rendu fidèle au template, sans débordement à 375 px.

## Résultat

- `npm run verifier` : types OK, **52 tests** OK (partage 7, moteur 7, serveur 12, interface 26), build OK.
- Vérifié dans le navigateur avec un compte de test « Essai », supprimé ensuite. Le compte « oussama » n'a pas été touché.
  - Compte retenu mais supprimé → retour à Profils, message « Ce compte n'existe plus ».
  - Création → ouverture → page Aujourd'hui ; avatar et menu du compte à jour.
  - Réglages : enregistrement immédiat, effet visible (animations coupées), « Annuler » rétablit la valeur côté serveur.
  - Suppression depuis les Réglages : prénom à retaper, un seul message, aucune erreur 401.
  - Aucun débordement à 375 px.

## Bugs trouvés et corrigés pendant le lot

| Bug | Correctif |
|---|---|
| Suppression du compte courant : deux messages, dont « Ce compte n'existe plus » | Le compte est quitté dans la mutation, avant le rechargement de la liste |
| Le message « Compte supprimé » disparaissait quand la page se fermait | Message donné par la mutation elle-même |
| Erreurs 401 en console avec un compte supprimé retenu | Les réglages ne sont demandés qu'une fois le compte vérifié |
| Tests : `localStorage` vide sous Node 26 (Node fournit le sien, qui masque celui de jsdom) | Stockage en mémoire installé dans la préparation des tests |

## Écarts et remarques

- Pas de Zustand ni de React Hook Form pour l'instant : un contexte React suffit pour le compte courant, et le formulaire de création réutilise directement le schéma Zod partagé. À réévaluer quand les formulaires grossiront (lots 4 à 7).
- Ajout de `@radix-ui/react-dropdown-menu` : menu de l'avatar et menus « ••• » accessibles au clavier.
- La page technique `/controle` du lot 1 est supprimée, remplacée par Profils.
- L'export avant suppression (UX.md § 5.0) viendra avec le lot 17.
- Les pages encore vides affichent « Cette page arrive au lot N » : texte de chantier, à retirer au fil des lots.
