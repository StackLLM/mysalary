import { CODES_ERREUR } from '@mysalary/partage'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { ErreurApi } from '../lib/erreurs'
import { sessionRenouvelee } from './session'

declare module 'fastify' {
  interface FastifyRequest {
    /** Compte courant. Défini uniquement sur les routes protégées par `exigerUtilisateur`. */
    utilisateurId?: string
  }
}

/**
 * Le compte courant vient uniquement de la session du cookie (lot 23) : le client ne peut pas le choisir.
 * Une session utilisée est prolongée quand elle approche de son expiration (lot P3).
 * Toutes les lectures et écritures des routes protégées sont ensuite filtrées par cet identifiant.
 */
export function exigerUtilisateur(app: FastifyInstance) {
  return async (requete: FastifyRequest, reponse: FastifyReply) => {
    const id = await sessionRenouvelee(app.prisma, requete, reponse, app.auth.cookieSecurise)
    if (!id) throw new ErreurApi(401, CODES_ERREUR.SESSION_REQUISE, 'Connecte-toi pour continuer.')
    requete.utilisateurId = id
  }
}

/** Identifiant du compte courant ; à n'appeler que dans une route protégée. */
export function utilisateurDe(requete: FastifyRequest): string {
  if (!requete.utilisateurId) throw new Error('Route non protégée par exigerUtilisateur.')
  return requete.utilisateurId
}
