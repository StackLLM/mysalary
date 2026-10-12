import type { PrismaClient } from '@prisma/client'

/** Supprime les sessions et les liens (mot de passe, e-mail) dont la durée est passée. */
export async function purgerExpires(prisma: PrismaClient, maintenant: Date) {
  const filtre = { where: { expireLe: { lte: maintenant } } }
  const [sessions, liensMotDePasse, liensEmail] = await prisma.$transaction([
    prisma.session.deleteMany(filtre),
    prisma.jetonMotDePasse.deleteMany(filtre),
    prisma.jetonEmail.deleteMany(filtre),
  ])
  return { sessions: sessions.count, liensMotDePasse: liensMotDePasse.count, liensEmail: liensEmail.count }
}
