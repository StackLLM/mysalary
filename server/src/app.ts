import helmet from '@fastify/helmet'
import { PREFIXE_API } from '@mysalary/partage'
import type { PrismaClient } from '@prisma/client'
import Fastify, { type FastifyServerOptions } from 'fastify'
import { routesCharges } from './modules/charges/routes'
import { routesDepenses } from './modules/depenses/routes'
import { routesEpargne } from './modules/epargne/routes'
import { routesSimulation } from './modules/simulation/routes'
import { routesMois } from './modules/mois/routes'
import { routesReglages } from './modules/reglages/routes'
import { routesRevenus } from './modules/revenus/routes'
import { routesSalaire } from './modules/salaire/routes'
import { routesUtilisateurs } from './modules/utilisateurs/routes'
import { installerBase } from './plugins/base'
import { installerErreurs } from './plugins/erreurs'
import { exigerUtilisateur } from './plugins/utilisateurCourant'

interface Options {
  prisma: PrismaClient
  logger?: FastifyServerOptions['logger']
  /** Horloge du serveur ; les tests la fixent pour rendre les dates reproductibles. */
  horloge?: () => Date
}

/** Construit l'application sans l'écouter : utilisé par le serveur et par les tests. */
export async function construireApp({ prisma, logger = false, horloge }: Options) {
  const app = Fastify({ logger, bodyLimit: 1024 * 1024 })

  installerBase(app, prisma, horloge)
  installerErreurs(app)
  await app.register(helmet)

  await app.register(
    async (api) => {
      // Routes publiques (aucun compte requis).
      api.get('/sante', async () => ({ statut: 'ok' }))
      await api.register(routesUtilisateurs)

      // Routes du compte courant : toutes passent par exigerUtilisateur.
      await api.register(async (compte) => {
        compte.addHook('preHandler', exigerUtilisateur(app))
        await compte.register(routesReglages)
        await compte.register(routesSalaire)
        await compte.register(routesMois)
        await compte.register(routesRevenus)
        await compte.register(routesCharges)
        await compte.register(routesDepenses)
        await compte.register(routesEpargne)
        await compte.register(routesSimulation)
      })
    },
    { prefix: PREFIXE_API },
  )

  return app
}
