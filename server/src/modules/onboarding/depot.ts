import { analyserMoneyGuru, decider, type AnalyseImport, type Centimes, type DateCivile, type DecisionImport, type LigneImport } from '@mysalary/moteur'
import type { ImportDto, OnboardingDto, schemaDecisionImport, schemaEtapeOnboarding } from '@mysalary/partage'
import type { ImportSource, PrismaClient } from '@prisma/client'
import type { z } from 'zod'
import { introuvable } from '../../lib/erreurs'
import { regle } from '../charges/depot'

// Toute lecture ou écriture est filtrée par utilisateurId. Importer ne crée jamais de donnée du plan : seulement des lignes proposées.

type Analyse = Extract<AnalyseImport, { ok: true }>

function versDto(source: ImportSource): ImportDto {
  const analyse = JSON.parse(source.analyse) as Pick<Analyse, 'lignes' | 'nonImportes' | 'profil'>
  return { type: 'moneyGuruV0', importeLe: source.importeLe.toISOString(), lignes: analyse.lignes, nonImportes: analyse.nonImportes, profil: analyse.profil }
}

export async function lireOnboarding(prisma: PrismaClient, utilisateurId: string): Promise<OnboardingDto> {
  const utilisateur = await prisma.utilisateur.findUniqueOrThrow({ where: { id: utilisateurId }, include: { importSource: true } })
  return { etape: utilisateur.onboardingEtape, termine: utilisateur.onboardingTermine, import: utilisateur.importSource ? versDto(utilisateur.importSource) : null }
}

export async function enregistrerEtape(prisma: PrismaClient, utilisateurId: string, saisie: z.output<typeof schemaEtapeOnboarding>) {
  await prisma.utilisateur.update({
    where: { id: utilisateurId },
    data: { ...(saisie.etape !== undefined ? { onboardingEtape: saisie.etape } : {}), ...(saisie.termine !== undefined ? { onboardingTermine: saisie.termine } : {}) },
  })
}

/** Analyse le fichier déposé, l'archive tel quel et remplace un éventuel import précédent. N'écrit rien dans le plan. */
export async function apercuImport(prisma: PrismaClient, utilisateurId: string, fichier: unknown, aujourdhui: DateCivile): Promise<ImportDto> {
  const analyse = analyserMoneyGuru(fichier, aujourdhui)
  if (!analyse.ok) throw regle(analyse.erreur, { fichier: analyse.erreur })
  const donnees = {
    type: 'moneyGuruV0',
    fichierBrut: JSON.stringify(fichier),
    analyse: JSON.stringify({ lignes: analyse.lignes, nonImportes: analyse.nonImportes, profil: analyse.profil }),
    importeLe: new Date(),
  }
  const source = await prisma.importSource.upsert({ where: { utilisateurId }, create: { utilisateurId, ...donnees }, update: donnees })
  return versDto(source)
}

export async function deciderLigne(prisma: PrismaClient, utilisateurId: string, id: string, saisie: z.output<typeof schemaDecisionImport>): Promise<ImportDto> {
  const source = await prisma.importSource.findUnique({ where: { utilisateurId } })
  if (!source) throw introuvable('Import')
  const analyse = JSON.parse(source.analyse) as Pick<Analyse, 'lignes' | 'nonImportes' | 'profil'>
  const i = analyse.lignes.findIndex((l: LigneImport) => l.id === id)
  if (i < 0) throw introuvable('Ligne d’import')
  try {
    analyse.lignes[i] = decider(analyse.lignes[i]!, saisie as unknown as DecisionImport & { montant?: Centimes })
  } catch (e) {
    if (e instanceof RangeError) throw regle(e.message)
    throw e
  }
  return versDto(await prisma.importSource.update({ where: { utilisateurId }, data: { analyse: JSON.stringify(analyse) } }))
}

export async function supprimerImport(prisma: PrismaClient, utilisateurId: string) {
  await prisma.importSource.deleteMany({ where: { utilisateurId } })
}
