# Lot 24 — Comptes fiables et e-mails

> Phase 6 — Finalisation fonctionnelle. Décidé par l'étude de marché du 12/10/2026 (`docs/etude/Etude-marche-2026-10.html`). Dépend du lot 23.

## 1. Objectif

Qu'une adresse e-mail soit **prouvée** (celle du propriétaire du compte) et que les messages du produit soient **envoyables pour de vrai**, pour qu'un client qui oublie son mot de passe retrouve son compte.

## 2. Analyse de l'existant

- Inscription, connexion, mot de passe oublié par lien, changement de mot de passe : faits au lot 23.
- Envoi : `lib/messagerie.ts` sait envoyer par SMTP (nodemailer) ou écrire dans le journal ; messages en texte brut seulement.
- Le changement d'e-mail (ajouté le 12/10/2026) s'appliquait tout de suite, sans preuve que la nouvelle adresse existe : un e-mail tapé de travers aurait enfermé le compte dehors.
- Rien ne supprimait les sessions et liens expirés.

## 3. Règles

- Une adresse est **confirmée** quand son propriétaire a ouvert un lien reçu à cette adresse. `Utilisateur.emailVerifieLe` le dit.
- Le lien est à **usage unique**, valable **24 heures** ; seule son empreinte SHA-256 est en base (table `JetonEmail`, type `verification` ou `changement`). Un nouveau lien du même type remplace l'ancien.
- **Inscription** : un lien part vers l'adresse. Un envoi raté ne bloque pas l'inscription (le lien se redemande).
- **Accès sans confirmation** : l'app reste utilisable ; un bandeau rappelle de confirmer, avec « Renvoyer le lien ». Rien n'est bloqué : le but est de ne pas perdre un nouvel utilisateur sur un message en spam.
- **Changer d'e-mail** : mot de passe exigé, adresse libre et différente ; un lien part vers la **nouvelle** adresse ; l'adresse ne change qu'à son ouverture, et elle est alors confirmée. Tant que le lien n'est pas ouvert, l'ancienne reste l'identifiant. Si un autre compte a pris l'adresse entre-temps, l'ouverture est refusée (409).
- Un lien de vérification ne vaut que pour l'adresse à laquelle il a été envoyé : si l'adresse du compte a changé depuis, il est refusé.
- Choisir un mot de passe par le lien « oublié » confirme l'adresse (le lien est arrivé à cette adresse). `npm run compte:activer` la confirme aussi (l'opérateur du serveur en répond).
- **Limites** : 3 envois de lien par heure et par compte (renvoi et changement) ; mêmes limites de mot de passe qu'au lot 23.
- **Purge** : sessions, liens de mot de passe et liens d'e-mail expirés supprimés au démarrage, puis toutes les heures.

## 4. Livré

- Migration `20261015080000_verification_email` : colonne `emailVerifieLe`, table `JetonEmail`. Aucune donnée modifiée.
- Serveur : `POST /auth/email/verification` (public, le lien s'ouvre depuis n'importe quel appareil), `POST /compte/email/renvoi`, `PUT /compte/email` (devient une demande, réponse 202), `Utilisateur.emailVerifie`.
- E-mails en texte **et** HTML (`lib/gabarits.ts`) : confirmation d'adresse, confirmation de la nouvelle adresse, mot de passe oublié. HTML en tableaux et styles en ligne, texte échappé, lien repris en clair sous le bouton.
- Interface : page `/email/verification` (confirmée, lien expiré, adresse prise, erreur), bandeau « Confirme ton adresse » avec renvoi, carte Réglages › E-mail de connexion (Confirmé / À confirmer, renvoi, demande de changement).
- README : § « E-mails en production » (fournisseur, `SMTP_URL`, SPF, DKIM, DMARC).

## 5. Tests

- Serveur (`email.test.ts`, `messagerie.test.ts`) : lien d'inscription (texte, HTML, jeton non stocké en clair), usage unique, lien expiré ou inventé, renvoi (remplace l'ancien, refusé si confirmé, 3 par heure), mot de passe oublié et activation qui confirment, changement (mot de passe, doublon, identique, rien avant le clic, ancienne adresse refusée après, adresse prise entre-temps, lien d'une ancienne adresse), purge, envoi SMTP simulé, journal sans SMTP, échappement du gabarit.
- Interface : page de confirmation (un seul appel, quatre états), bandeau (renvoi, absent si confirmée), changement d'e-mail dans Réglages.
- 467 tests au total (partage 22, moteur 170, serveur 116, interface 159).

## 6. Vérification dans le navigateur (serveurs de développement, compte « Essai » supprimé ensuite)

Inscription → bandeau sur la mise en route → « Renvoyer le lien » (204) → lien ouvert : « Adresse confirmée », bandeau disparu, Réglages « Confirmé » → changement d'e-mail : 202, adresse inchangée avant le clic → lien ouvert : adresse remplacée, confirmée → lien inventé : « Lien expiré » à 375 px.

## 7. Critères de validation

- [x] `npm run verifier` passe (467 tests).
- [x] Parcours complet dans le navigateur.
- [ ] **Messages reçus dans une vraie boîte, hors spam, avec SPF, DKIM et DMARC valides** : impossible tant qu'aucun fournisseur d'envoi ni nom de domaine n'est configuré. À faire par toi au moment de choisir le domaine (README § E-mails en production), puis à rejouer avant la bêta (lot 28). Le code d'envoi SMTP est testé avec un transport simulé, jamais avec un vrai serveur.

## 8. Reporté

- Blocage des fonctions tant que l'adresse n'est pas confirmée : écarté (voir règles).
- Rappels par e-mail, double authentification : après le lancement.
