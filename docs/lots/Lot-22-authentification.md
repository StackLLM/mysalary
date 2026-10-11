# Lot 22 — Authentification

> Statut : **livré** (13/10/2026), en attente de validation.

## Règles

- **Mot de passe par compte, facultatif en local.** Un compte sans mot de passe reste ouvert comme avant (ton compte n'est pas modifié). Un compte protégé exige une session pour tout : ses données, l'ouverture, le renommage, la suppression, l'export, la réinitialisation.
- **Stockage** : hash `scrypt` (sel aléatoire) ; le mot de passe n'est jamais stocké ni renvoyé (`Utilisateur.protege` seulement). 8 caractères au moins.
- **Session** : jeton aléatoire dans un cookie `HttpOnly; SameSite=Strict`, 30 jours ; seule son empreinte SHA-256 est en base (table `Session`). Une session expirée est supprimée à la lecture. Une session = un compte à la fois.
- **Essais** : 5 mots de passe faux de suite bloquent les essais une minute (réponse 429).
- **Changer le mot de passe** : session et ancien mot de passe exigés ; les autres sessions du compte tombent. **Retirer** : mot de passe exigé.
- **Création d'un compte avec mot de passe** : il reste ouvert pour son créateur (session ouverte).
- **Serveur ouvert au réseau** (`HOTE=0.0.0.0`) : le serveur **refuse de démarrer** si un compte n'a pas de mot de passe ; la création exige un mot de passe ; l'import d'un compte et le retrait du mot de passe sont refusés. Par défaut le serveur n'écoute que `127.0.0.1`. À mettre derrière HTTPS (le cookie n'est pas `Secure` pour rester utilisable en local).
- **Interface** : ouvrir un compte protégé demande le mot de passe ; Réglages › Mot de passe (définir, changer, retirer) ; « Changer de compte » ferme la session ; session expirée → retour à Profils avec « Session expirée. Reconnecte-toi. ».

## API

`POST /utilisateurs/:id/connexion` · `POST /deconnexion` · `PUT /utilisateurs/:id/mot-de-passe` · `POST /utilisateurs/:id/mot-de-passe/retrait` ; `POST /utilisateurs` accepte `motDePasse`. Migration `authentification` (colonne `motDePasse`, table `Session`).

## Limites

- La liste des comptes (prénoms) reste visible avant connexion, comme l'écran Profils.
- Pas de récupération de mot de passe : un mot de passe perdu = compte fermé (la base reste accessible à qui a le fichier).
- Pas de HTTPS intégré, pas de limitation globale par adresse IP.

## Tests

Serveur : accès refusé sans session, mauvais/bon mot de passe, cookie HttpOnly, jeton non stocké en clair, isolation entre comptes protégés, expiration, déconnexion, blocage après 5 essais, définir/changer/retirer, suppression du compte, mode réseau. Interface : connexion (refus puis succès), définir/changer/retirer, session expirée.

## Critères de validation

- [x] `npm run verifier` passe (441 tests).
- [x] Vérifié sur le serveur en marche avec un compte « Essai » (créé protégé, 401 sans cookie, 200 avec, supprimé ensuite) ; ton compte reste ouvert.
