import {
  additionner,
  centimes,
  decalerMois,
  equivalentMensuel,
  moisDe,
  totauxParCertitude,
  verseCeMois,
  type CleMois,
  type DateCivile,
} from '@mysalary/moteur'
import {
  CODES_ERREUR,
  deMois,
  formaterMois,
  type ResumeRevenusDto,
  type RevenuRecuDto,
  type SourceRevenuDto,
  type schemaRevenuRecu,
  type schemaSource,
} from '@mysalary/partage'
import type { PrismaClient, RevenuRecu as LigneRecu, SourceRevenu as LigneSource } from '@prisma/client'
import type { z } from 'zod'
import { ErreurApi, introuvable } from '../../lib/erreurs'
import { chargerCalendrier } from '../salaire/depot'
import { versRevenuRecu, versSource } from './conversion'

// Toute lecture ou écriture est filtrée par utilisateurId (isolation, Plan.md § 5.7).

type SaisieSource = z.output<typeof schemaSource>
type SaisieRecu = z.output<typeof schemaRevenuRecu>

const versBase = (s: SaisieSource) => ({ ...s, mois: s.mois.join(',') })

function versDtoRecu(ligne: LigneRecu): RevenuRecuDto {
  return { ...versRevenuRecu(ligne), montant: ligne.montant, note: ligne.note, creeLe: ligne.creeLe.toISOString() }
}

// --- Sources ---

export async function listerSources(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile): Promise<SourceRevenuDto[]> {
  const [lignes, { calendrier }] = await Promise.all([
    prisma.sourceRevenu.findMany({ where: { utilisateurId }, orderBy: { creeLe: 'asc' } }),
    chargerCalendrier(prisma, utilisateurId, aujourdhui),
  ])
  const ceMois = moisDe(aujourdhui)
  const avenir = calendrier
    .revenusPrevus(ceMois, decalerMois(ceMois, 24))
    .filter((r) => r.statut !== 'recu' && r.datePrevue >= aujourdhui)
  return lignes.map((ligne) => {
    const source = versSource(ligne)
    const prochain = avenir.find((r) => r.sourceId === source.id)
    return {
      ...source,
      montant: ligne.montant,
      creeLe: ligne.creeLe.toISOString(),
      equivalentMensuel: equivalentMensuel(source),
      prochainVersement: prochain ? { date: prochain.datePrevue, moisVersement: prochain.moisVersement } : null,
      active: !source.fin || source.fin >= ceMois,
    }
  })
}

async function trouverSource(prisma: PrismaClient, utilisateurId: string, id: string) {
  const ligne = await prisma.sourceRevenu.findFirst({ where: { id, utilisateurId } })
  if (!ligne) throw introuvable('Source de revenus')
  return ligne
}

export async function creerSource(prisma: PrismaClient, utilisateurId: string, saisie: SaisieSource) {
  const ligne = await prisma.sourceRevenu.create({ data: { utilisateurId, ...versBase(saisie) } })
  return ligne.id
}

export async function modifierSource(prisma: PrismaClient, utilisateurId: string, id: string, saisie: SaisieSource) {
  await trouverSource(prisma, utilisateurId, id)
  await prisma.sourceRevenu.update({ where: { id }, data: versBase(saisie) })
}

/** Supprime la source. Ses revenus reçus restent (réel) et deviennent des revenus libres. */
export async function supprimerSource(prisma: PrismaClient, utilisateurId: string, id: string) {
  await trouverSource(prisma, utilisateurId, id)
  await prisma.$transaction([
    prisma.revenuRecu.updateMany({ where: { utilisateurId, sourceId: id }, data: { sourceId: null, moisOccurrence: null } }),
    prisma.sourceRevenu.delete({ where: { id } }),
  ])
}

// --- Revenus prévus ---

export async function revenusPrevus(prisma: PrismaClient, utilisateurId: string, du: CleMois, au: CleMois, aujourdhui: DateCivile) {
  const { calendrier } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
  return { aujourdhui, revenus: calendrier.revenusPrevus(du, au) }
}

// --- Revenus reçus ---

export async function listerRecus(prisma: PrismaClient, utilisateurId: string) {
  const lignes = await prisma.revenuRecu.findMany({ where: { utilisateurId }, orderBy: [{ date: 'desc' }, { creeLe: 'desc' }] })
  return lignes.map(versDtoRecu)
}

const regle = (message: string, champs?: Record<string, string>) => new ErreurApi(422, CODES_ERREUR.REGLE_METIER, message, champs)

/** Vérifie un revenu reçu et renvoie son libellé (celui de la source s'il est lié). */
async function verifierRecu(prisma: PrismaClient, utilisateurId: string, saisie: SaisieRecu, aujourdhui: DateCivile, sauf?: string) {
  if (saisie.date > aujourdhui) throw regle('Un revenu reçu ne peut pas être daté après aujourd’hui.', { date: 'Date dans le futur.' })
  if (!saisie.sourceId || !saisie.moisOccurrence) return saisie.libelle!

  const ligne: LigneSource = await trouverSource(prisma, utilisateurId, saisie.sourceId)
  const source = versSource(ligne)
  if (source.versement === 'avecPaie') {
    throw regle(`« ${source.libelle} » est versée avec la paie : confirme-la avec la paie, dans Salaire & primes.`)
  }
  if (!verseCeMois(source, saisie.moisOccurrence)) {
    throw regle(`« ${source.libelle} » ne prévoit pas de versement en ${formaterMois(saisie.moisOccurrence)}.`, {
      moisOccurrence: 'Aucun versement prévu ce mois.',
    })
  }
  const deja = await prisma.revenuRecu.findFirst({
    where: { utilisateurId, sourceId: source.id, moisOccurrence: saisie.moisOccurrence, NOT: sauf ? { id: sauf } : undefined },
  })
  if (deja) {
    throw new ErreurApi(409, CODES_ERREUR.CONFLIT, `Le versement ${deMois(saisie.moisOccurrence)} de « ${source.libelle} » est déjà noté comme reçu.`, {
      moisOccurrence: 'Déjà reçu.',
    })
  }
  return saisie.libelle ?? source.libelle
}

const donneesRecu = (saisie: SaisieRecu, libelle: string) => ({
  sourceId: saisie.sourceId,
  moisOccurrence: saisie.moisOccurrence,
  date: saisie.date,
  montant: saisie.montant,
  libelle,
  note: saisie.note || null,
})

export async function creerRecu(prisma: PrismaClient, utilisateurId: string, saisie: SaisieRecu, aujourdhui: DateCivile) {
  const libelle = await verifierRecu(prisma, utilisateurId, saisie, aujourdhui)
  return versDtoRecu(await prisma.revenuRecu.create({ data: { utilisateurId, ...donneesRecu(saisie, libelle) } }))
}

async function trouverRecu(prisma: PrismaClient, utilisateurId: string, id: string) {
  const ligne = await prisma.revenuRecu.findFirst({ where: { id, utilisateurId } })
  if (!ligne) throw introuvable('Revenu reçu')
  return ligne
}

export async function modifierRecu(prisma: PrismaClient, utilisateurId: string, id: string, saisie: SaisieRecu, aujourdhui: DateCivile) {
  await trouverRecu(prisma, utilisateurId, id)
  const libelle = await verifierRecu(prisma, utilisateurId, saisie, aujourdhui, id)
  return versDtoRecu(await prisma.revenuRecu.update({ where: { id }, data: donneesRecu(saisie, libelle) }))
}

export async function supprimerRecu(prisma: PrismaClient, utilisateurId: string, id: string) {
  await trouverRecu(prisma, utilisateurId, id)
  await prisma.revenuRecu.delete({ where: { id } })
}

// --- Résumé ---

export async function resume(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile): Promise<ResumeRevenusDto> {
  const [{ calendrier }, sources, recusLibres] = await Promise.all([
    chargerCalendrier(prisma, utilisateurId, aujourdhui),
    prisma.sourceRevenu.findMany({ where: { utilisateurId } }),
    prisma.revenuRecu.findMany({ where: { utilisateurId, sourceId: null } }),
  ])
  const ceMois = moisDe(aujourdhui)
  const finDouze = decalerMois(ceMois, 11)
  const courant = calendrier.moisCourant()

  const actives = sources.map(versSource).filter((s) => !s.fin || s.fin >= ceMois)
  const douze = calendrier.revenusPrevus(ceMois, finDouze)
  // Le mois budgétaire en cours peut contenir des versements de deux mois civils voisins.
  const duMois = calendrier.revenusPrevus(decalerMois(ceMois, -2), decalerMois(ceMois, 2)).filter((r) => r.moisBudget === courant.cle)
  const libresDuMois = recusLibres.filter((r) => r.date >= courant.debut && r.date <= courant.fin)

  return {
    aujourdhui,
    moisCourant: courant.cle,
    sansContrat: !calendrier.paies.aContrat,
    equivalentMensuel: totauxParCertitude(actives.map((s) => ({ certitude: s.certitude, montant: equivalentMensuel(s) }))),
    douzeMois: {
      du: ceMois,
      au: finDouze,
      totaux: totauxParCertitude(douze.map((r) => ({ certitude: r.certitude, montant: r.montantPrevu }))),
    },
    moisEnCours: {
      prevu: totauxParCertitude(duMois.map((r) => ({ certitude: r.certitude, montant: r.montantPrevu }))),
      recu: additionner(...duMois.map((r) => r.montantRecu ?? centimes(0)), ...libresDuMois.map((r) => centimes(r.montant))),
    },
    prochains: calendrier
      .revenusPrevus(decalerMois(ceMois, -1), decalerMois(ceMois, 12))
      .filter((r) => r.statut === 'enRetard' || (r.statut === 'prevu' && r.datePrevue >= aujourdhui))
      .slice(0, 5),
  }
}
