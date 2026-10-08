/** Préfixe commun de toutes les routes. */
export const PREFIXE_API = '/api/v1'

/**
 * En-tête qui désigne le compte courant.
 * Pas d'authentification en v1 : le serveur n'écoute qu'en local (Plan.md § 5.7).
 */
export const ENTETE_UTILISATEUR = 'x-utilisateur'
