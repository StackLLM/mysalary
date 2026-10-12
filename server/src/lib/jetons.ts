import type { PrismaClient } from '@prisma/client'
import { empreinteJeton, nouveauJeton } from './motDePasse'

/** Durée d'un lien « mot de passe oublié ». */
export const DUREE_LIEN_MS = 60 * 60 * 1000
/** Durée d'un lien d'activation d'un compte d'avant le lot 23. */
export const DUREE_ACTIVATION_MS = 24 * 60 * 60 * 1000

/** Nouveau lien de mot de passe : les anciens liens du compte ne valent plus rien. Seule l'empreinte est gardée. */
export async function creerJetonMotDePasse(prisma: PrismaClient, utilisateurId: string, maintenant: Date, dureeMs = DUREE_LIEN_MS): Promise<string> {
  const jeton = nouveauJeton()
  await prisma.$transaction([
    prisma.jetonMotDePasse.deleteMany({ where: { utilisateurId } }),
    prisma.jetonMotDePasse.create({ data: { id: empreinteJeton(jeton), utilisateurId, expireLe: new Date(maintenant.getTime() + dureeMs) } }),
  ])
  return jeton
}

/** Lien vers la page « nouveau mot de passe » de l'interface. */
export const lienMotDePasse = (urlApplication: string, jeton: string) => `${urlApplication.replace(/\/$/, '')}/mot-de-passe/nouveau?jeton=${encodeURIComponent(jeton)}`

/** Durée d'un lien de vérification ou de changement d'e-mail. */
export const DUREE_LIEN_EMAIL_MS = 24 * 60 * 60 * 1000
export type TypeLienEmail = 'verification' | 'changement'

/** Nouveau lien pour `email` : les anciens liens du même type n'ouvrent plus rien. Seule l'empreinte est gardée. */
export async function creerJetonEmail(prisma: PrismaClient, utilisateurId: string, type: TypeLienEmail, email: string, maintenant: Date): Promise<string> {
  const jeton = nouveauJeton()
  await prisma.$transaction([
    prisma.jetonEmail.deleteMany({ where: { utilisateurId, type } }),
    prisma.jetonEmail.create({ data: { id: empreinteJeton(jeton), utilisateurId, type, email, expireLe: new Date(maintenant.getTime() + DUREE_LIEN_EMAIL_MS) } }),
  ])
  return jeton
}

/** Lien vers la page de confirmation de l'interface. */
export const lienEmail = (urlApplication: string, jeton: string) => `${urlApplication.replace(/\/$/, '')}/email/verification?jeton=${encodeURIComponent(jeton)}`
