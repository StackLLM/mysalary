import type { ModePeriode, ModificationReglages, Reglages, ReglesScenarios } from '@mysalary/partage'
import { REGLAGES_PAR_DEFAUT, REGLES_SCENARIOS_DEFAUT } from '@mysalary/partage'
import type { PrismaClient, Reglages as LigneReglages } from '@prisma/client'
import { centimes, lireCleMois, type Depart } from '@mysalary/moteur'

function versDto(ligne: LigneReglages): Reglages {
  return {
    modePeriode: ligne.modePeriode as ModePeriode,
    debutSemaine: ligne.debutSemaine,
    reportHebdo: ligne.reportHebdo,
    animations: ligne.animations,
    reglesScenarios: lireRegles(ligne.reglesScenarios),
    depart: lireDepart(ligne),
  }
}

/** Solde de départ du cumul (lot 13) : les deux colonnes vont ensemble. */
export function lireDepart(ligne: Pick<LigneReglages, 'soldeDepart' | 'moisDepart'> | null | undefined): Depart | null {
  return ligne?.moisDepart && ligne.soldeDepart !== null ? { mois: lireCleMois(ligne.moisDepart), solde: centimes(ligne.soldeDepart) } : null
}

/** Règles des scénarios enregistrées (JSON) ; absentes = règles par défaut. « garanti » est toujours retenu. */
export function lireRegles(json: string | null | undefined): ReglesScenarios {
  if (!json) return REGLES_SCENARIOS_DEFAUT
  const r = JSON.parse(json) as ReglesScenarios
  const garanti = (l: ReglesScenarios['prudent']) => ({ ...l, revenus: l.revenus.includes('garanti') ? l.revenus : ['garanti' as const, ...l.revenus] })
  return { prudent: garanti(r.prudent), realiste: garanti(r.realiste), ambitieux: garanti(r.ambitieux) }
}

/** Ligne de base : les règles sont stockées en JSON. */
function versLigne({ reglesScenarios, depart, ...reste }: ModificationReglages) {
  return {
    ...reste,
    ...(reglesScenarios ? { reglesScenarios: JSON.stringify(reglesScenarios) } : {}),
    ...(depart !== undefined ? { soldeDepart: depart?.solde ?? null, moisDepart: depart?.mois ?? null } : {}),
  }
}

// Toute lecture ou écriture est filtrée par utilisateurId (isolation, produit.md (Plan) § 5.7).

export async function lire(prisma: PrismaClient, utilisateurId: string) {
  const ligne = await prisma.reglages.upsert({
    where: { utilisateurId },
    update: {},
    create: { utilisateurId, ...versLigne({ ...REGLAGES_PAR_DEFAUT, reglesScenarios: undefined }) },
  })
  return versDto(ligne)
}

export async function modifier(prisma: PrismaClient, utilisateurId: string, modif: ModificationReglages) {
  const ligne = await prisma.reglages.upsert({
    where: { utilisateurId },
    update: versLigne(modif),
    create: { utilisateurId, ...versLigne({ ...REGLAGES_PAR_DEFAUT, ...modif }) },
  })
  return versDto(ligne)
}
