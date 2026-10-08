import type { ModePeriode, ModificationReglages, Reglages } from '@mysalary/partage'
import { REGLAGES_PAR_DEFAUT } from '@mysalary/partage'
import type { PrismaClient, Reglages as LigneReglages } from '@prisma/client'

function versDto(ligne: LigneReglages): Reglages {
  return {
    modePeriode: ligne.modePeriode as ModePeriode,
    debutSemaine: ligne.debutSemaine,
    reportHebdo: ligne.reportHebdo,
    animations: ligne.animations,
  }
}

// Toute lecture ou écriture est filtrée par utilisateurId (isolation, Plan.md § 5.7).

export async function lire(prisma: PrismaClient, utilisateurId: string) {
  const ligne = await prisma.reglages.upsert({
    where: { utilisateurId },
    update: {},
    create: { utilisateurId, ...REGLAGES_PAR_DEFAUT },
  })
  return versDto(ligne)
}

export async function modifier(prisma: PrismaClient, utilisateurId: string, modif: ModificationReglages) {
  const ligne = await prisma.reglages.upsert({
    where: { utilisateurId },
    update: modif,
    create: { utilisateurId, ...REGLAGES_PAR_DEFAUT, ...modif },
  })
  return versDto(ligne)
}
