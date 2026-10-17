import helmet from '@fastify/helmet'
import { PREFIXE_API, type InfosPubliquesDto } from '@mysalary/partage'
import type { PrismaClient } from '@prisma/client'
import Fastify, { type FastifyServerOptions } from 'fastify'
import { routesAuth } from './modules/auth/routes'
import { routesCharges } from './modules/charges/routes'
import { routesCompte } from './modules/compte/routes'
import { routesConseils } from './modules/conseils/routes'
import { routesDepenses } from './modules/depenses/routes'
import { routesEpargne } from './modules/epargne/routes'
import { routesSimulation } from './modules/simulation/routes'
import { routesMois } from './modules/mois/routes'
import { routesOnboarding } from './modules/onboarding/routes'
import { routesReglages } from './modules/reglages/routes'
import { routesRevenus } from './modules/revenus/routes'
import { routesSalaire } from './modules/salaire/routes'
import { installerBase, type ConfigAuthentification } from './plugins/base'
import { installerErreurs } from './plugins/erreurs'
import { exigerUtilisateur } from './plugins/utilisateurCourant'

interface Options {
  prisma: PrismaClient
  logger?: FastifyServerOptions['logger']
  /** Horloge du serveur ; les tests la fixent pour rendre les dates reproductibles. */
  horloge?: () => Date
  /** Authentification (lot 23) ; par défaut : interface locale, cookie sans HTTPS, liens écrits dans le journal. */
  auth?: Partial<ConfigAuthentification>
  /** Faire confiance à X-Forwarded-For (derrière un proxy HTTPS). */
  trustProxy?: boolean
  /** Reçoit « MÉTHODE /chemin » de chaque route du compte : la matrice d'isolation vérifie qu'aucune n'est oubliée (prod.md § 6.3). */
  inventaireRoutes?: string[]
  /** Production : journaux d'erreurs sans message (prod.md § 7.3). */
  production?: boolean
}

/** Construit l'application sans l'écouter : utilisé par le serveur et par les tests. */
export async function construireApp({ prisma, logger = false, horloge, auth = {}, trustProxy = false, inventaireRoutes, production = false }: Options) {
  const app = Fastify({ logger, bodyLimit: 1024 * 1024, trustProxy })

  installerBase(
    app,
    prisma,
    {
      urlApplication: auth.urlApplication ?? 'http://127.0.0.1:6010',
      cookieSecurise: auth.cookieSecurise ?? false,
      contact: auth.contact ?? null,
      messagerie: auth.messagerie ?? (async ({ a, sujet, texte }) => app.log.info({ a, sujet }, `E-mail non envoyé (SMTP_URL absent)\n${texte}`)),
    },
    horloge,
    production,
  )
  installerErreurs(app, production)
  await app.register(helmet)

  await app.register(
    async (api) => {
      // Routes publiques (aucun compte requis).
      api.get('/sante', async () => ({ statut: 'ok' }))
      // Contact du responsable, pour les pages légales (lot P3).
      api.get('/infos', async (): Promise<InfosPubliquesDto> => ({ contact: app.auth.contact ?? null }))
      await api.register(routesAuth)

      // Routes du compte courant : toutes passent par exigerUtilisateur.
      await api.register(async (compte) => {
        compte.addHook('preHandler', exigerUtilisateur(app))
        if (inventaireRoutes) {
          compte.addHook('onRoute', (route) => {
            for (const methode of [route.method].flat()) if (methode !== 'HEAD') inventaireRoutes.push(`${methode} ${route.url}`)
          })
        }
        await compte.register(routesCompte)
        await compte.register(routesReglages)
        await compte.register(routesSalaire)
        await compte.register(routesMois)
        await compte.register(routesRevenus)
        await compte.register(routesCharges)
        await compte.register(routesDepenses)
        await compte.register(routesEpargne)
        await compte.register(routesSimulation)
        await compte.register(routesConseils)
        await compte.register(routesOnboarding)
      })
    },
    { prefix: PREFIXE_API },
  )

  return app
}
