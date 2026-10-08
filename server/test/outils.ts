import { ENTETE_UTILISATEUR, PREFIXE_API, type Utilisateur } from '@mysalary/partage'
import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, inject } from 'vitest'
import { construireApp } from '../src/app'

/**
 * Démarre une app sur la base de test, vidée avant chaque test.
 * `contexte.jour` fixe la date du jour vue par le serveur (« 2027-01-10 ») ; vide = vraie date.
 */
export function preparerApp() {
  const contexte = {} as { app: FastifyInstance; prisma: PrismaClient; jour: string | null }
  contexte.jour = null

  beforeAll(async () => {
    contexte.prisma = new PrismaClient({ datasourceUrl: inject('urlBaseTest') })
    contexte.app = await construireApp({
      prisma: contexte.prisma,
      horloge: () => (contexte.jour ? new Date(`${contexte.jour}T12:00:00`) : new Date()),
    })
  })
  beforeEach(async () => {
    contexte.jour = null
    await contexte.prisma.utilisateur.deleteMany()
  })
  afterAll(async () => {
    await contexte.app.close()
    await contexte.prisma.$disconnect()
  })

  return contexte
}

export const url = (chemin: string) => `${PREFIXE_API}${chemin}`
export const pour = (id: string) => ({ [ENTETE_UTILISATEUR]: id })

export async function creerCompte(app: FastifyInstance, prenom: string): Promise<Utilisateur> {
  const reponse = await app.inject({ method: 'POST', url: url('/utilisateurs'), payload: { prenom } })
  if (reponse.statusCode !== 201) throw new Error(reponse.body)
  return reponse.json()
}
