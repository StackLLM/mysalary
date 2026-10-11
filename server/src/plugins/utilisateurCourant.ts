import { CODES_ERREUR, ENTETE_UTILISATEUR } from '@mysalary/partage'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { ErreurApi } from '../lib/erreurs'
import { exigerAcces } from './session'

declare module 'fastify' {
  interface FastifyRequest {
    /** Compte courant. Défini uniquement sur les routes protégées par `exigerUtilisateur`. */
    utilisateurId?: string
  }
}

/**
 * Résout le compte courant à partir de l'en-tête `X-Utilisateur`.
 * Un compte protégé par mot de passe exige en plus la session de son cookie (lot 22).
 */
export function exigerUtilisateur(app: FastifyInstance) {
  return async (requete: FastifyRequest) => {
    const valeur = requete.headers[ENTETE_UTILISATEUR]
    const id = Array.isArray(valeur) ? valeur[0] : valeur
    if (!id) {
      throw new ErreurApi(401, CODES_ERREUR.UTILISATEUR_REQUIS, 'Aucun compte sélectionné.')
    }
    const utilisateur = await app.prisma.utilisateur.findUnique({ where: { id }, select: { id: true } })
    if (!utilisateur) {
      throw new ErreurApi(401, CODES_ERREUR.UTILISATEUR_INCONNU, 'Ce compte n’existe pas.')
    }
    await exigerAcces(app.prisma, requete, utilisateur.id)
    requete.utilisateurId = utilisateur.id
  }
}

/** Identifiant du compte courant ; à n'appeler que dans une route protégée. */
export function utilisateurDe(requete: FastifyRequest): string {
  if (!requete.utilisateurId) throw new Error('Route non protégée par exigerUtilisateur.')
  return requete.utilisateurId
}
