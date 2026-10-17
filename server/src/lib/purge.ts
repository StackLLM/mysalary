import type { PrismaClient } from '@prisma/client'

/** Supprime les sessions, les liens (mot de passe, e-mail) et les limites d'essais dont la durée est passée. */
export async function purgerExpires(prisma: PrismaClient, maintenant: Date) {
  const filtre = { where: { expireLe: { lte: maintenant } } }
  const [sessions, liensMotDePasse, liensEmail, tentatives] = await prisma.$transaction([
    prisma.session.deleteMany(filtre),
    prisma.jetonMotDePasse.deleteMany(filtre),
    prisma.jetonEmail.deleteMany(filtre),
    prisma.tentativeAcces.deleteMany({ where: { finFenetre: { lte: maintenant } } }),
  ])
  return { sessions: sessions.count, liensMotDePasse: liensMotDePasse.count, liensEmail: liensEmail.count, tentatives: tentatives.count }
}
