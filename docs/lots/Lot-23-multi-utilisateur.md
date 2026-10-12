# Lot 23 — Nettoyage, authentification et multi-utilisateur

> Statut : **livré** (12/10/2026), en attente de validation. Remplace l'authentification locale du lot 22.

## 1. Audit et nettoyage

| Constat | Action |
|---|---|
| Composant `Tableau` jamais importé (lot 2) | supprimé |
| `comparer`, `plusTard` (dates), `CERTITUDES_PAR_SCENARIO` (remplacé par les règles des scénarios), type `CalendrierPaie` : jamais utilisés | supprimés |
| `plageAnnee`, `NOMS_MOIS` (interface) : jamais utilisés | supprimés |
| `moisAbrege` (objectifs) identique à `moisCourt` (année) | doublon retiré ; `pointsSimulation` des objectifs renommé `pointsTrajectoireSimulee` (homonyme du simulateur) |
| En-tête `X-Utilisateur` : le client choisissait le compte (aucune isolation réelle) | retiré : le compte vient de la session |
| Écran Profils, routes `/utilisateurs/*` (liste publique des comptes, actions par identifiant) | retirés, remplacés par `/auth/*` et `/compte/*` |
| `README.md` : « Pas d'authentification en v1 » | réécrit |

Vérifié : toutes les dépendances sont utilisées (`@testing-library/dom` est requise par `@testing-library/react`) ; aucun export mort restant (script d'audit). `Skills/`, `Templates/` et `Salaire/` (données personnelles, hors dépôt) ne sont pas touchés.

## 2. Authentification

- **Inscription** (`POST /auth/inscription`) : prénom, e-mail (minuscules, unique), mot de passe (8 caractères au moins), devise. Ouvre la session ; le nouveau compte commence par la mise en route.
- **Connexion** (`POST /auth/connexion`) : même message pour un e-mail inconnu et un mauvais mot de passe (« E-mail ou mot de passe incorrect. »), même durée de calcul (hash leurre).
- **Déconnexion** (`POST /auth/deconnexion`), **session** (`GET /auth/session` : le compte connecté ou 401).
- **Mot de passe oublié** (`POST /auth/mot-de-passe/oubli`) : réponse identique que l'e-mail existe ou non ; lien à usage unique valable 1 heure, seule son empreinte est en base ; un nouveau lien annule l'ancien. **Nouveau mot de passe** (`POST /auth/mot-de-passe/reinitialisation`) : ferme toutes les sessions du compte.
- **Envoi** : SMTP si `SMTP_URL` est défini (nodemailer), sinon le lien est écrit dans le journal du serveur.
- **Compte connecté** (`/compte/*`, session obligatoire) : prénom, changement de mot de passe (actuel exigé ; les autres sessions tombent), export, restauration d'un export dans un compte vide, réinitialisation et suppression (mot de passe exigé).

## 3. Sécurité et isolation

- Mots de passe : `scrypt` (N = 2^15, sel aléatoire), jamais stockés ni renvoyés.
- Sessions : jeton aléatoire de 256 bits dans un cookie `HttpOnly; SameSite=Strict; Path=/`, `Secure` quand l'interface est en HTTPS ; 30 jours ; empreinte SHA-256 en base ; nouveau jeton à chaque connexion ; session expirée supprimée.
- Le compte courant vient **uniquement** de la session (`exigerUtilisateur`) ; chaque dépôt filtre déjà par `utilisateurId`. Une donnée d'un autre compte, même avec son identifiant, répond 404.
- Essais limités en mémoire : connexion 5 échecs par e-mail et 20 par adresse IP en 15 minutes ; mot de passe oublié 5 demandes par heure et par IP ; confirmations par mot de passe 5 échecs en 15 minutes.
- `SameSite=Strict` et corps JSON : pas de requête de compte possible depuis un autre site.

## 4. Base de données et migration

- Migration `20261014080000_comptes_email` : colonne `Utilisateur.email` (unique, vide pour les anciens comptes), table `JetonMotDePasse`. Aucune donnée n'est modifiée.
- Un compte d'avant ce lot (sans e-mail ni mot de passe) ne peut pas se connecter tant qu'il n'est pas activé : `npm run compte:activer -- <prénom ou identifiant> <e-mail>` (sur la machine du serveur) lui donne un e-mail et affiche un lien de 24 heures pour choisir le mot de passe. Ses données restent intactes.
- Une sauvegarde de la base a été faite avant la migration (`sauvegardes/`).

## 5. Interface

- Pages `/connexion`, `/inscription`, `/mot-de-passe/oubli`, `/mot-de-passe/nouveau` : bandeau sauge de l'app (bureau), formulaire en carte, validations par champ avec les schémas partagés, erreurs du serveur, chargements, afficher/masquer le mot de passe, lien expiré.
- Pages privées derrière la garde : sans session, retour à la connexion puis à la page demandée (adresse interne seulement) ; session perdue → retour à la connexion avec un message.
- Réglages : compte (e-mail), se déconnecter, mot de passe, sauvegarde (restaurer), zone sensible. En-tête : « Se déconnecter ».

## Tests

Serveur : inscription (validation, doublon, hash, cookie), connexion (bonne, mauvaise, e-mail inconnu, blocage), session (absente, fausse, ancien en-tête, expirée, déconnexion), mot de passe oublié (lien unique, expiré, remplacé, sessions fermées), activation d'un ancien compte (données conservées), cookie `Secure`, compte (prénom, mot de passe, suppression, export, restauration, réinitialisation), isolation par identifiant (lecture, modification, suppression). Interface : connexion, inscription, oubli, nouveau mot de passe, routes protégées, client API (aucun identifiant envoyé). 451 tests au total.

## Critères de validation

- [x] `npm run verifier` passe (451 tests).
- [x] Parcours réel sur les serveurs de développement avec des comptes jetables (créés puis supprimés) : inscription → mise en route, connexion refusée puis acceptée, retour à la page demandée, session gardée au rechargement, déconnexion, suppression ; ton compte `oussama` est intact (non activé).
- [x] Vérifié à 1342 px et 375 px.
