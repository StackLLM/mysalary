import type { CreationUtilisateur, Devise, Utilisateur } from '@mysalary/partage'
import { REGLAGES_PAR_DEFAUT } from '@mysalary/partage'
import type { PrismaClient, Utilisateur as LigneUtilisateur } from '@prisma/client'

function versDto(ligne: LigneUtilisateur): Utilisateur {
  return {
    id: ligne.id,
    prenom: ligne.prenom,
    devise: ligne.devise as Devise,
    onboardingEtape: ligne.onboardingEtape,
    onboardingTermine: ligne.onboardingTermine,
    creeLe: ligne.creeLe.toISOString(),
    derniereOuverture: ligne.derniereOuverture?.toISOString() ?? null,
  }
}

/** Comptes du plus récemment ouvert au plus ancien ; jamais ouverts à la fin. */
export async function lister(prisma: PrismaClient) {
  const lignes = await prisma.utilisateur.findMany({
    orderBy: [{ derniereOuverture: { sort: 'desc', nulls: 'last' } }, { creeLe: 'asc' }],
  })
  return lignes.map(versDto)
}

/** Crée le compte et ses réglages par défaut dans la même écriture. */
export async function creer(prisma: PrismaClient, donnees: Required<CreationUtilisateur>) {
  const ligne = await prisma.utilisateur.create({
    data: { ...donnees, reglages: { create: REGLAGES_PAR_DEFAUT } },
  })
  return versDto(ligne)
}

export async function ouvrir(prisma: PrismaClient, id: string, maintenant: Date) {
  return versDto(await prisma.utilisateur.update({ where: { id }, data: { derniereOuverture: maintenant } }))
}

export async function renommer(prisma: PrismaClient, id: string, prenom: string) {
  return versDto(await prisma.utilisateur.update({ where: { id }, data: { prenom } }))
}

/** Supprime le compte ; ses données suivent par cascade. */
export async function supprimer(prisma: PrismaClient, id: string) {
  await prisma.utilisateur.delete({ where: { id } })
}
