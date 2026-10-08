import { schemaModificationReglages } from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import { valider } from '../../lib/valider'
import { utilisateurDe } from '../../plugins/utilisateurCourant'
import * as depot from './depot'

export async function routesReglages(app: FastifyInstance) {
  app.get('/reglages', async (requete) => depot.lire(app.prisma, utilisateurDe(requete)))

  app.put('/reglages', async (requete) => {
    const modif = valider(schemaModificationReglages, requete.body)
    return depot.modifier(app.prisma, utilisateurDe(requete), modif)
  })
}
