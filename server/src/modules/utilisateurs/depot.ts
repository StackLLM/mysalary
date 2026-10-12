import type { Devise, Inscription, Utilisateur } from '@mysalary/partage'
import { REGLAGES_PAR_DEFAUT } from '@mysalary/partage'
import type { PrismaClient, Utilisateur as LigneUtilisateur } from '@prisma/client'
import { hacher } from '../../lib/motDePasse'

export function versDto(ligne: LigneUtilisateur): Utilisateur {
  return {
    id: ligne.id,
    prenom: ligne.prenom,
    email: ligne.email,
    emailVerifie: ligne.email !== null && ligne.emailVerifieLe !== null,
    devise: ligne.devise as Devise,
    onboardingEtape: ligne.onboardingEtape,
    onboardingTermine: ligne.onboardingTermine,
    creeLe: ligne.creeLe.toISOString(),
    derniereOuverture: ligne.derniereOuverture?.toISOString() ?? null,
  }
}

/** Réglages par défaut d'un compte (règles des scénarios et solde de départ : valeurs par défaut, lots 11 et 13). */
export function reglagesParDefaut() {
  const { reglesScenarios: _defaut, depart: _depart, ...reglages } = REGLAGES_PAR_DEFAUT
  return reglages
}

/** Crée le compte, son mot de passe haché et ses réglages par défaut dans la même écriture. */
export async function creer(prisma: PrismaClient, { prenom, email, motDePasse, devise }: Required<Inscription>, maintenant: Date) {
  const ligne = await prisma.utilisateur.create({
    data: { prenom, email, devise, motDePasse: await hacher(motDePasse), derniereOuverture: maintenant, reglages: { create: reglagesParDefaut() } },
  })
  return versDto(ligne)
}

export async function renommer(prisma: PrismaClient, id: string, prenom: string) {
  return versDto(await prisma.utilisateur.update({ where: { id }, data: { prenom } }))
}

/** Supprime le compte ; ses données, sessions et liens suivent par cascade. */
export async function supprimer(prisma: PrismaClient, id: string) {
  await prisma.utilisateur.delete({ where: { id } })
}
