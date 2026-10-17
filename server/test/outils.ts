import { PREFIXE_API, type Utilisateur } from '@mysalary/partage'
import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, inject } from 'vitest'
import { construireApp } from '../src/app'
import type { Message } from '../src/lib/messagerie'

/**
 * Démarre une app sur la base de test, vidée avant chaque test.
 * `contexte.jour` fixe la date du jour vue par le serveur (« 2027-01-10 ») ; vide = vraie date.
 * `contexte.messages` reçoit les e-mails que le serveur aurait envoyés.
 * `contexte.routes` liste les routes du compte (« GET /api/v1/charges »).
 */
export function preparerApp() {
  const contexte = {} as { app: FastifyInstance; prisma: PrismaClient; jour: string | null; messages: Message[]; routes: string[] }
  contexte.jour = null
  contexte.messages = []
  contexte.routes = []

  beforeAll(async () => {
    contexte.prisma = new PrismaClient({ datasourceUrl: inject('urlBaseTest') })
    contexte.app = await construireApp({
      prisma: contexte.prisma,
      horloge: () => (contexte.jour ? new Date(`${contexte.jour}T12:00:00`) : new Date()),
      auth: { urlApplication: 'https://mysalary.test', messagerie: async (m) => void contexte.messages.push(m) },
      inventaireRoutes: contexte.routes,
    })
  })
  beforeEach(async () => {
    contexte.jour = null
    contexte.messages.length = 0
    await contexte.prisma.utilisateur.deleteMany()
  })
  afterAll(async () => {
    await contexte.app.close()
    await contexte.prisma.$disconnect()
  })

  return contexte
}

export const url = (chemin: string) => `${PREFIXE_API}${chemin}`
/** Cookie de session de chaque compte créé par `creerCompte` (lot 23 : le compte vient de la session). */
const cookies = new Map<string, string>()
export const MOT_DE_PASSE_TEST = 'mot-de-passe-de-test'
let numero = 0

/** En-têtes d'une requête faite par ce compte : son cookie de session. Un identifiant inconnu n'en a pas. */
export const pour = (id: string) => (cookies.has(id) ? { cookie: cookies.get(id)! } : {})

/** `mysalary_session=…` d'une réponse qui ouvre une session. */
export const cookieDe = (reponse: { headers: Record<string, unknown> }) => String(reponse.headers['set-cookie'] ?? '').split(';')[0]!

/** Crée un compte par l'inscription et garde son cookie de session. */
export async function creerCompte(app: FastifyInstance, prenom: string, email = `compte-${++numero}@exemple.test`): Promise<Utilisateur> {
  const reponse = await app.inject({ method: 'POST', url: url('/auth/inscription'), payload: { prenom, email, motDePasse: MOT_DE_PASSE_TEST } })
  if (reponse.statusCode !== 201) throw new Error(reponse.body)
  const compte = reponse.json() as Utilisateur
  cookies.set(compte.id, cookieDe(reponse))
  return compte
}
