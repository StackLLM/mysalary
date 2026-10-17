import { dateCivile, type DateCivile } from '@mysalary/moteur'
import type { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import type { Messagerie } from '../lib/messagerie'

/** Réglages de l'authentification (lot 23), lus dans l'environnement par `server.ts`. */
export interface ConfigAuthentification {
  /** Adresse de l'interface, pour les liens envoyés par e-mail. */
  urlApplication: string
  /** Cookie de session réservé à HTTPS. */
  cookieSecurise: boolean
  messagerie: Messagerie
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
    /** Date civile du jour, sur l'horloge locale du serveur (remplaçable dans les tests). */
    aujourdhui: () => DateCivile
    /** Instant courant (remplaçable dans les tests). */
    maintenant: () => Date
    auth: ConfigAuthentification
    /** Serveur de production : journaux sans détail (prod.md § 7.3). */
    production: boolean
  }
}

/** Date civile locale : la paie du 27 reste le 27, quel que soit le fuseau. */
export function dateLocale(instant: Date): DateCivile {
  return dateCivile(instant.getFullYear(), instant.getMonth() + 1, instant.getDate())
}

export function installerBase(app: FastifyInstance, prisma: PrismaClient, auth: ConfigAuthentification, horloge: () => Date = () => new Date(), production = false) {
  app.decorate('prisma', prisma)
  app.decorate('production', production)
  app.decorate('auth', auth)
  app.decorate('maintenant', horloge)
  app.decorate('aujourdhui', () => dateLocale(horloge()))
}
