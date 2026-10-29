import {
  centimes,
  creerCalendrier,
  lireCleMois,
  lireDate,
  type Certitude,
  type CleMois,
  type DateCivile,
  type LignePaie,
  type PaieEnregistree,
  type ProblemeReception,
  type RegleJourNonOuvre,
  type VersionContrat,
} from '@mysalary/moteur'
import {
  CODES_ERREUR,
  deMois,
  formaterDate,
  formaterMois,
  type ModePeriode,
  type VersionContratDto,
} from '@mysalary/partage'
import type { ContratSalaire, LignePaie as LigneBase, Paie, PrismaClient } from '@prisma/client'
import type { schemaContrat, schemaModificationContrat, schemaPrimesPaie, schemaReception } from '@mysalary/partage'
import type { z } from 'zod'
import { ErreurApi, exigerTouche, introuvable } from '../../lib/erreurs'
import { versCharge, versDette, versPaiement, versPonctuel } from '../charges/conversion'
import { versDepense } from '../depenses/conversion'
import { versCompte, versMouvement, versObjectif } from '../epargne/conversion'
import { bornesFigees } from '../mois/clotures'
import { lireDepart, lireRegles } from '../reglages/depot'
import { versRevenuRecu, versSource } from '../revenus/conversion'

// Toute lecture ou écriture est filtrée par utilisateurId (isolation, produit.md (Plan) § 5.7).

function versVersion(ligne: ContratSalaire): VersionContrat {
  return {
    id: ligne.id,
    moisEffet: lireCleMois(ligne.moisEffet),
    montantNet: centimes(ligne.montantNet),
    jourHabituel: ligne.jourHabituel,
    regleJourNonOuvre: ligne.regleJourNonOuvre as RegleJourNonOuvre,
    financeMoisSuivant: ligne.financeMoisSuivant,
  }
}

function versDtoContrat(ligne: ContratSalaire): VersionContratDto {
  return { ...versVersion(ligne), montantNet: ligne.montantNet, creeLe: ligne.creeLe.toISOString() }
}

function versLigne(ligne: LigneBase): LignePaie {
  return {
    id: ligne.id,
    type: ligne.type as LignePaie['type'],
    libelle: ligne.libelle,
    certitude: ligne.certitude as Certitude,
    montantPrevu: ligne.montantPrevu === null ? null : centimes(ligne.montantPrevu),
    montantRecu: ligne.montantRecu === null ? null : centimes(ligne.montantRecu),
    sourceId: ligne.sourceId,
  }
}

function versPaie(paie: Paie & { lignes: LigneBase[] }): PaieEnregistree {
  return {
    moisFinance: lireCleMois(paie.moisFinance),
    dateReelle: paie.dateReelle ? lireDate(paie.dateReelle) : null,
    datePrevue: paie.datePrevue ? lireDate(paie.datePrevue) : null,
    lignes: [...paie.lignes].sort((a, b) => a.ordre - b.ordre).map(versLigne),
  }
}

// --- Contrat ---

export async function listerContrats(prisma: PrismaClient, utilisateurId: string) {
  const lignes = await prisma.contratSalaire.findMany({ where: { utilisateurId }, orderBy: { moisEffet: 'asc' } })
  return lignes.map(versDtoContrat)
}

const conflitVersion = (mois: string) =>
  new ErreurApi(409, CODES_ERREUR.CONFLIT, `Une version du salaire commence déjà en ${formaterMois(mois)}. Modifie-la plutôt.`, {
    moisEffet: 'Mois déjà utilisé par une autre version.',
  })

async function verifierMoisLibre(prisma: PrismaClient, utilisateurId: string, moisEffet: string, sauf?: string) {
  const existante = await prisma.contratSalaire.findFirst({ where: { utilisateurId, moisEffet, NOT: sauf ? { id: sauf } : undefined } })
  if (existante) throw conflitVersion(moisEffet)
}

export async function creerContrat(prisma: PrismaClient, utilisateurId: string, saisie: z.output<typeof schemaContrat>) {
  await verifierMoisLibre(prisma, utilisateurId, saisie.moisEffet)
  return versDtoContrat(await prisma.contratSalaire.create({ data: { utilisateurId, ...saisie } }))
}

async function trouverContrat(prisma: PrismaClient, utilisateurId: string, id: string) {
  const ligne = await prisma.contratSalaire.findFirst({ where: { id, utilisateurId } })
  if (!ligne) throw introuvable('Version du salaire')
  return ligne
}

export async function modifierContrat(
  prisma: PrismaClient,
  utilisateurId: string,
  id: string,
  modif: z.output<typeof schemaModificationContrat>,
) {
  await trouverContrat(prisma, utilisateurId, id)
  if (modif.moisEffet) await verifierMoisLibre(prisma, utilisateurId, modif.moisEffet, id)
  exigerTouche(await prisma.contratSalaire.updateMany({ where: { id, utilisateurId }, data: modif }), 'Version du salaire')
  return versDtoContrat(await trouverContrat(prisma, utilisateurId, id))
}

export async function supprimerContrat(prisma: PrismaClient, utilisateurId: string, id: string) {
  await trouverContrat(prisma, utilisateurId, id)
  exigerTouche(await prisma.contratSalaire.deleteMany({ where: { id, utilisateurId } }), 'Version du salaire')
}

// --- Calendrier ---

/** Charge tout ce qu'il faut au moteur pour calculer paies et mois du compte. */
export async function chargerCalendrier(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile) {
  const [contrats, paies, reglages, sources, recus, charges, ponctuels, dettes, paiementsDettes, depenses, moisClotures, comptes, mouvements, objectifs, corrections] = await Promise.all([
    prisma.contratSalaire.findMany({ where: { utilisateurId } }),
    prisma.paie.findMany({ where: { utilisateurId }, include: { lignes: true } }),
    prisma.reglages.findUnique({ where: { utilisateurId } }),
    prisma.sourceRevenu.findMany({ where: { utilisateurId }, orderBy: { creeLe: 'asc' } }),
    prisma.revenuRecu.findMany({ where: { utilisateurId } }),
    prisma.charge.findMany({ where: { utilisateurId }, orderBy: { creeLe: 'asc' } }),
    prisma.ponctuel.findMany({ where: { utilisateurId } }),
    prisma.dette.findMany({ where: { utilisateurId }, orderBy: { creeLe: 'asc' } }),
    prisma.paiementDette.findMany({ where: { utilisateurId } }),
    prisma.depense.findMany({ where: { utilisateurId } }),
    bornesFigees(prisma, utilisateurId),
    prisma.compteEpargne.findMany({ where: { utilisateurId }, orderBy: { creeLe: 'asc' } }),
    prisma.mouvementEpargne.findMany({ where: { utilisateurId } }),
    prisma.objectif.findMany({ where: { utilisateurId } }),
    prisma.correctionCumul.findMany({ where: { utilisateurId } }),
  ])
  const epargne = { comptes: comptes.map(versCompte), mouvementsEpargne: mouvements.map(versMouvement), objectifs: objectifs.map(versObjectif) }
  return {
    calendrier: creerCalendrier({
      mode: (reglages?.modePeriode ?? 'cyclePaie') as ModePeriode,
      contrats: contrats.map(versVersion),
      paies: paies.map(versPaie),
      sources: sources.map(versSource),
      revenusRecus: recus.map(versRevenuRecu),
      charges: charges.map(versCharge),
      ponctuels: ponctuels.map(versPonctuel),
      dettes: dettes.map(versDette),
      paiementsDettes: paiementsDettes.map(versPaiement),
      depenses: depenses.map(versDepense),
      moisClotures,
      objectifs: epargne.objectifs,
      mouvementsEpargne: epargne.mouvementsEpargne,
      // Soldes réels déclarés en fin de mois (lot 35).
      correctionsCumul: corrections.map((c) => ({ mois: lireCleMois(c.cle), solde: centimes(c.solde) })),
      aujourdhui,
    }),
    /** Épargne et objectifs (lot 10), pour les projections. */
    epargne,
    debutSemaine: reglages?.debutSemaine ?? 1,
    reportHebdo: reglages?.reportHebdo ?? false,
    /** Règles des scénarios (lot 11). */
    regles: lireRegles(reglages?.reglesScenarios),
    /** Solde de départ du cumul (lot 13). */
    depart: lireDepart(reglages),
  }
}

const trouverPaie = (prisma: PrismaClient, utilisateurId: string, moisFinance: string) =>
  prisma.paie.findUnique({ where: { utilisateurId_moisFinance: { utilisateurId, moisFinance } }, include: { lignes: true } })

// --- Primes prévues ---

export async function enregistrerPrimes(
  prisma: PrismaClient,
  utilisateurId: string,
  mois: CleMois,
  { primes }: z.output<typeof schemaPrimesPaie>,
) {
  const existante = await trouverPaie(prisma, utilisateurId, mois)
  if (existante?.dateReelle) {
    throw new ErreurApi(422, CODES_ERREUR.REGLE_METIER, 'Cette paie est déjà reçue. Corrige plutôt la réception.')
  }
  await prisma.$transaction(async (tx) => {
    if (existante) await tx.paie.delete({ where: { utilisateurId_moisFinance: { utilisateurId, moisFinance: mois } } })
    if (primes.length === 0) return
    await tx.paie.create({
      data: {
        utilisateurId,
        moisFinance: mois,
        lignes: {
          create: primes.map((p, ordre) => ({ utilisateurId, type: 'prime', ordre, ...p })),
        },
      },
    })
  })
}

// --- Réception ---

/** Messages clairs pour chaque refus du moteur (ux-ui.md (UX) § 7). */
function refusReception(probleme: ProblemeReception, mois: CleMois) {
  switch (probleme.code) {
    case 'futur':
      return new ErreurApi(422, CODES_ERREUR.REGLE_METIER, 'Une paie reçue ne peut pas être datée après aujourd’hui.', {
        dateReelle: 'Date dans le futur.',
      })
    case 'sansContrat':
      return new ErreurApi(
        422,
        CODES_ERREUR.REGLE_METIER,
        `Aucun salaire n’est défini pour ${formaterMois(mois)}. Ajoute d’abord une version du contrat.`,
      )
    case 'avantPrecedente':
      return new ErreurApi(
        422,
        CODES_ERREUR.REGLE_METIER,
        `Cette date doit tomber après la paie ${deMois(probleme.mois)} (${formaterDate(probleme.date)}).`,
        { dateReelle: `Après le ${formaterDate(probleme.date)}.` },
      )
    case 'apresSuivante':
      return new ErreurApi(
        422,
        CODES_ERREUR.REGLE_METIER,
        `Cette date tombe le jour de la paie ${deMois(probleme.mois)} (${formaterDate(probleme.date)}) ou après. Choisis plutôt ${formaterMois(probleme.mois)} comme mois financé.`,
        { dateReelle: `Avant le ${formaterDate(probleme.date)}.` },
      )
  }
}

export async function recevoir(
  prisma: PrismaClient,
  utilisateurId: string,
  mois: CleMois,
  saisie: z.output<typeof schemaReception>,
  aujourdhui: DateCivile,
) {
  const { calendrier } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
  const probleme = calendrier.paies.verifierReception(mois, saisie.dateReelle)
  if (probleme) throw refusReception(probleme, mois)

  const calculee = calendrier.paies.paie(mois)!
  const existante = await trouverPaie(prisma, utilisateurId, mois)
  const anciennes = existante?.lignes ?? []

  // R27 : ce qui était prévu est figé à la première réception, puis conservé lors d'une correction.
  const salairePrevu = anciennes.find((l) => l.type === 'salaire')?.montantPrevu ?? calculee.lignes.find((l) => l.type === 'salaire')?.montantPrevu ?? null
  const recues = new Map(saisie.primes.filter((p) => p.id).map((p) => [p.id!, p]))
  const recuesParSource = new Map(saisie.primes.filter((p) => p.sourceId).map((p) => [p.sourceId!, p]))
  // Primes des sources : figées à la première réception, puis conservées lors d'une correction.
  const primesSources = existante?.dateReelle ? anciennes.filter((l) => l.sourceId) : calculee.lignes.filter((l) => l.sourceId)

  const lignes = [
    { type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: salairePrevu, montantRecu: saisie.salaireRecu },
    ...primesSources.map((l) => ({
      type: 'prime',
      libelle: l.libelle,
      certitude: l.certitude,
      montantPrevu: l.montantPrevu,
      sourceId: l.sourceId,
      montantRecu: recuesParSource.get(l.sourceId!)?.montantRecu ?? 0,
    })),
    // Primes prévues sur cette paie : toujours gardées ; non reçues = 0.
    ...anciennes
      .filter((l) => l.type === 'prime' && l.montantPrevu !== null && !l.sourceId)
      .map((l) => ({ id: l.id, type: 'prime', libelle: l.libelle, certitude: l.certitude, montantPrevu: l.montantPrevu, montantRecu: recues.get(l.id)?.montantRecu ?? 0 })),
    // Primes imprévues : celles envoyées (déjà connues ou nouvelles).
    ...saisie.primes
      .filter((p) => !p.sourceId)
      .filter((p) => !p.id || !anciennes.some((l) => l.id === p.id && l.montantPrevu !== null))
      .map((p) => ({ ...(anciennes.some((l) => l.id === p.id) ? { id: p.id } : {}), type: 'prime', libelle: p.libelle, certitude: p.certitude, montantPrevu: null, montantRecu: p.montantRecu })),
  ]

  await prisma.$transaction(async (tx) => {
    const paie = await tx.paie.upsert({
      where: { utilisateurId_moisFinance: { utilisateurId, moisFinance: mois } },
      create: { utilisateurId, moisFinance: mois },
      update: {},
    })
    await tx.lignePaie.deleteMany({ where: { paieId: paie.id, utilisateurId } })
    await tx.paie.update({
      where: { utilisateurId_moisFinance: { utilisateurId, moisFinance: mois } },
      data: {
        dateReelle: saisie.dateReelle,
        datePrevue: existante?.datePrevue ?? calculee.datePrevue,
        recueLe: existante?.recueLe ?? new Date(),
        lignes: { create: lignes.map((l, ordre) => ({ ...l, utilisateurId, ordre })) },
      },
    })
  })
}

/** Remet la paie en « prévue » : les primes prévues restent, le reste de la réception est effacé. */
export async function annulerReception(prisma: PrismaClient, utilisateurId: string, mois: CleMois) {
  const paie = await trouverPaie(prisma, utilisateurId, mois)
  if (!paie?.dateReelle) throw introuvable('Paie reçue')
  // Les primes des sources ne sont pas gardées : elles redeviennent calculées depuis leur source.
  const primesPrevues = paie.lignes.filter((l) => l.type === 'prime' && l.montantPrevu !== null && !l.sourceId)
  await prisma.$transaction(async (tx) => {
    if (primesPrevues.length === 0) {
      await tx.paie.delete({ where: { utilisateurId_moisFinance: { utilisateurId, moisFinance: mois } } })
      return
    }
    await tx.lignePaie.deleteMany({ where: { paieId: paie.id, utilisateurId, id: { notIn: primesPrevues.map((l) => l.id) } } })
    await tx.lignePaie.updateMany({ where: { paieId: paie.id, utilisateurId }, data: { montantRecu: null } })
    await tx.paie.update({ where: { utilisateurId_moisFinance: { utilisateurId, moisFinance: mois } }, data: { dateReelle: null, datePrevue: null, recueLe: null } })
  })
}
