import { lireCleMois, lireDate, type BornesFigees } from '@mysalary/moteur'
import { CODES_ERREUR, formaterMois } from '@mysalary/partage'
import type { PrismaClient } from '@prisma/client'
import { ErreurApi } from '../../lib/erreurs'

// Un mois clôturé est en lecture seule (R21) : toute écriture datée dans ses bornes est refusée.

export async function bornesFigees(prisma: PrismaClient, utilisateurId: string): Promise<BornesFigees[]> {
  const lignes = await prisma.clotureMois.findMany({ where: { utilisateurId }, select: { cle: true, debut: true, fin: true } })
  return lignes.map((l) => ({ cle: lireCleMois(l.cle), debut: lireDate(l.debut), fin: lireDate(l.fin) }))
}

const refus = (cle: string) =>
  new ErreurApi(422, CODES_ERREUR.REGLE_METIER, `${formaterMois(cle, { majuscule: true })} est clôturé. Rouvre-le pour le modifier.`)

/** Refuse une écriture datée dans un mois clôturé (dépense, revenu reçu, paiement de dette). */
export async function exigerDatesOuvertes(prisma: PrismaClient, utilisateurId: string, ...dates: string[]) {
  for (const date of new Set(dates)) {
    const cloture = await prisma.clotureMois.findFirst({ where: { utilisateurId, debut: { lte: date }, fin: { gte: date } }, select: { cle: true } })
    if (cloture) throw refus(cloture.cle)
  }
}

/** Refuse une modification de la paie qui finance un mois clôturé. */
export async function exigerMoisOuvert(prisma: PrismaClient, utilisateurId: string, cle: string) {
  if (await prisma.clotureMois.findUnique({ where: { utilisateurId_cle: { utilisateurId, cle } } })) throw refus(cle)
}
