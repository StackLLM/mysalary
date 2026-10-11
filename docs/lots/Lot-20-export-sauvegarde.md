# Lot 20 — Export & sauvegarde

> Statut : **livré** (12/10/2026), en attente de validation. Objectif : ne jamais perdre ni enfermer ses données.

## Périmètre

| Inclus | Exclu |
|---|---|
| Export JSON d'un compte (Réglages › Compte) | Export CSV / Excel |
| Import d'un export : crée un **nouveau** compte (écran Profils) | Fusion dans un compte existant |
| Export proposé avant la suppression et avant la réinitialisation | Sauvegarde déclenchée depuis l'interface |
| Réinitialisation d'un compte (Réglages › Zone sensible) | |
| Sauvegarde de la base : `npm run sauvegarde` | Restauration automatique |

## Règles

- **L'export contient tout le compte** : réglages, contrat, paies, revenus, catégories, charges, ponctuels, dettes, dépenses, clôtures et journal, épargne, objectifs, scénarios. Pas l'identifiant du compte, pas le fichier brut de l'import V0.
- **Un import ne remplace jamais rien** : nouveau compte (« Prénom (import) » si le prénom existe), nouveaux identifiants, liens recopiés, textes JSON (clôtures, scénarios) mis à jour. Tout ou rien : un fichier refusé ne crée rien. Le compte importé ouvre directement sur Aujourd'hui.
- Refusés : fichier qui n'est pas un export MySalary, version plus récente, ligne sans identifiant, lien cassé.
- **Réinitialiser** vide plan, réel, épargne, clôtures et import ; garde le compte, le prénom, la devise ; réglages par défaut ; retour à la mise en route. Double confirmation (prénom retapé), export proposé d'abord.
- **Sauvegarde de la base** : `npm run sauvegarde [dossier]` copie la base (`VACUUM INTO`, sûr serveur allumé) dans `sauvegardes/mysalary-AAAAMMJJ-HHMMSS.db` (hors dépôt), 10 copies gardées.
- L'aperçu d'import de l'onboarding oriente un export MySalary vers l'écran Profils.

## API

`GET /utilisateurs/:id/export` · `POST /utilisateurs/import` · `POST /utilisateurs/:id/reinitialiser`.

## Tests

Serveur : export (contenu, isolation), import (liens, JSON, réglages, aller-retour identique, refus sans création), réinitialisation, sauvegarde (nom, rotation). Interface : nom du fichier, export avant suppression, réinitialisation, import (illisible, accepté, refusé).

## Critères de validation

- [x] `npm run verifier` passe (426 tests).
- [x] Aller-retour vérifié sur ton compte (copie importée identique, puis supprimée ; ton compte intact).
