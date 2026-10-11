import { CODES_ERREUR } from '@mysalary/partage'
import type { PrismaClient } from '@prisma/client'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ErreurApi } from '../lib/erreurs'
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

/** Refuse l'accès à un compte protégé sans session ouverte pour lui. Un compte sans mot de passe reste ouvert. */
export async function exigerAcces(prisma: PrismaClient, requete: FastifyRequest, utilisateurId: string): Promise<void> {
  const compte = await prisma.utilisateur.findUnique({ where: { id: utilisateurId }, select: { motDePasse: true } })
  if (!compte?.motDePasse) return
  if ((await sessionDe(prisma, requete)) !== utilisateurId) {
    throw new ErreurApi(401, CODES_ERREUR.SESSION_REQUISE, 'Connecte-toi pour ouvrir ce compte.')
  }
}

/** Ouvre une session pour le compte et pose le cookie (HttpOnly, SameSite=Strict). Remplace la session du cookie. */
export async function ouvrirSession(prisma: PrismaClient, requete: FastifyRequest, reponse: FastifyReply, utilisateurId: string, maintenant = new Date()) {
  const ancien = jetonDe(requete)
  if (ancien) await prisma.session.deleteMany({ where: { id: empreinteJeton(ancien) } })
  const jeton = nouveauJeton()
  const expireLe = new Date(maintenant.getTime() + DUREE_SESSION_MS)
  await prisma.session.create({ data: { id: empreinteJeton(jeton), utilisateurId, expireLe } })
  reponse.header('set-cookie', `${COOKIE_SESSION}=${jeton}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DUREE_SESSION_MS / 1000}`)
}

export async function fermerSession(prisma: PrismaClient, requete: FastifyRequest, reponse: FastifyReply) {
  const jeton = jetonDe(requete)
  if (jeton) await prisma.session.deleteMany({ where: { id: empreinteJeton(jeton) } })
  reponse.header('set-cookie', `${COOKIE_SESSION}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`)
}
