import { dateCivile, type DateCivile } from '@mysalary/moteur'
import type { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
    /** Date civile du jour, sur l'horloge locale du serveur (remplaçable dans les tests). */
    aujourdhui: () => DateCivile
  }
}

/** Date civile locale : la paie du 27 reste le 27, quel que soit le fuseau. */
export function dateLocale(instant: Date): DateCivile {
  return dateCivile(instant.getFullYear(), instant.getMonth() + 1, instant.getDate())
}

export function installerBase(app: FastifyInstance, prisma: PrismaClient, horloge: () => Date = () => new Date()) {
  app.decorate('prisma', prisma)
  app.decorate('aujourdhui', () => dateLocale(horloge()))
}
