import type { PrismaClient } from '@prisma/client'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { empreinteJeton, nouveauJeton } from '../lib/motDePasse'

export const COOKIE_SESSION = 'mysalary_session'
export const DUREE_SESSION_MS = 30 * 24 * 60 * 60 * 1000

function jetonDe(requete: FastifyRequest): string | null {
  for (const morceau of (requete.headers.cookie ?? '').split(';')) {
    const [nom, ...valeur] = morceau.trim().split('=')
    if (nom === COOKIE_SESSION && valeur.length > 0) return valeur.join('=')
  }
  return null
}

/** Cookie de session : invisible au JavaScript (HttpOnly), jamais envoyé depuis un autre site (SameSite=Strict), HTTPS seulement si demandé. */
function cookie(valeur: string, maxAge: number, securise: boolean) {
  return `${COOKIE_SESSION}=${valeur}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${securise ? '; Secure' : ''}`
}

/** Compte de la session du cookie, ou `null` (absente, inconnue, expirée : une session expirée est supprimée). */
export async function sessionDe(prisma: PrismaClient, requete: FastifyRequest, maintenant = new Date()): Promise<string | null> {
  const jeton = jetonDe(requete)
  if (!jeton) return null
  const session = await prisma.session.findUnique({ where: { id: empreinteJeton(jeton) } })
  if (!session) return null
  if (session.expireLe <= maintenant) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
    return null
  }
  return session.utilisateurId
}

/** Ouvre une session neuve (le jeton change à chaque connexion) et pose le cookie ; l'ancienne session du navigateur est fermée. */
export async function ouvrirSession(prisma: PrismaClient, requete: FastifyRequest, reponse: FastifyReply, utilisateurId: string, securise: boolean, maintenant = new Date()) {
  const ancien = jetonDe(requete)
  if (ancien) await prisma.session.deleteMany({ where: { id: empreinteJeton(ancien) } })
  const jeton = nouveauJeton()
  await prisma.session.create({ data: { id: empreinteJeton(jeton), utilisateurId, expireLe: new Date(maintenant.getTime() + DUREE_SESSION_MS) } })
  reponse.header('set-cookie', cookie(jeton, DUREE_SESSION_MS / 1000, securise))
}

export async function fermerSession(prisma: PrismaClient, requete: FastifyRequest, reponse: FastifyReply, securise: boolean) {
  const jeton = jetonDe(requete)
  if (jeton) await prisma.session.deleteMany({ where: { id: empreinteJeton(jeton) } })
  reponse.header('set-cookie', cookie('', 0, securise))
}
