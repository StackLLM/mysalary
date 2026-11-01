import {
  analyser,
  anneeDesObjectifs,
  centimes,
  cibleFondsSecurite,
  epargneObjectif,
  etatEpargne,
  lireDate,
  reserve,
  suiviDesObjectifs,
  simulationCumul,
  trajectoireObjectif,
  type DateCivile,
  type Objectif,
} from '@mysalary/moteur'
import {
  formaterMontant,
  type ApercuObjectifDto,
  type EpargneDto,
  type MouvementEpargneDto,
  type ObjectifDetailDto,
  type ObjectifsDto,
  type schemaCompteEpargne,
  type schemaMouvementEpargne,
  type schemaObjectif,
  type schemaOrdreObjectifs,
  type schemaRealisation,
  type schemaStatutObjectif,
} from '@mysalary/partage'
import type { PrismaClient } from '@prisma/client'
import type { z } from 'zod'
import { exigerTouche, introuvable } from '../../lib/erreurs'
import { versCharge } from '../charges/conversion'
import { essentielMensuel, regle } from '../charges/depot'
import { exigerDatesOuvertes } from '../mois/clotures'
import { chargerCalendrier } from '../salaire/depot'
import { versMouvement } from './conversion'

// Toute lecture ou écriture est filtrée par utilisateurId (isolation, produit.md (Plan) § 5.7).
// L'épargne n'est jamais une dépense (R11) : aucune écriture ici ne crée de dépense.

type Sortie<T extends z.ZodType> = z.output<T>

const pasDansLeFutur = (date: DateCivile, aujourdhui: DateCivile, quoi: string) => {
  if (date > aujourdhui) throw regle(`${quoi} ne peut pas être dans le futur.`, { date: 'Date future.' })
}

async function mouvementsDto(prisma: PrismaClient, utilisateurId: string, objectifId?: string): Promise<MouvementEpargneDto[]> {
  const lignes = await prisma.mouvementEpargne.findMany({
    where: { utilisateurId, ...(objectifId ? { objectifId } : {}) },
    include: { compte: { select: { libelle: true } }, objectif: { select: { libelle: true } } },
    orderBy: [{ date: 'desc' }, { creeLe: 'desc' }],
  })
  return lignes.map((l) => ({ ...versMouvement(l), note: l.note, objectif: l.objectif?.libelle ?? null, compte: l.compte.libelle }))
}

// --- Épargne ---

export async function lireEpargne(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile): Promise<EpargneDto> {
  const [{ calendrier, epargne }, mouvements] = await Promise.all([chargerCalendrier(prisma, utilisateurId, aujourdhui), mouvementsDto(prisma, utilisateurId)])
  const courant = calendrier.moisCourant()
  // Même source que le bilan du mois et le cumul : le versement mensuel de chaque objectif, et ce qui a été versé.
  const duMois = calendrier.epargneDuMois(courant.cle)
  return {
    aujourdhui,
    etat: etatEpargne(epargne),
    planMois: { cle: courant.cle, debut: courant.debut, fin: courant.fin, ...duMois },
    mouvements,
    objectifs: epargne.objectifs
      .filter(reserve)
      .sort((a, b) => a.priorite - b.priorite)
      .map((o) => ({ id: o.id, libelle: o.libelle, statut: o.statut })),
  }
}

async function trouverCompte(prisma: PrismaClient, utilisateurId: string, id: string) {
  const c = await prisma.compteEpargne.findFirst({ where: { id, utilisateurId } })
  if (!c) throw introuvable('Compte')
  return c
}

export async function creerCompte(prisma: PrismaClient, utilisateurId: string, s: Sortie<typeof schemaCompteEpargne>, aujourdhui: DateCivile) {
  pasDansLeFutur(s.auLe, aujourdhui, 'Un solde déclaré')
  const { id } = await prisma.compteEpargne.create({ data: { utilisateurId, libelle: s.libelle, solde: s.solde, auLe: s.auLe } })
  return { id }
}

/** Déclarer un nouveau solde : il remplace l'ancien à partir de sa date (R12). */
export async function modifierCompte(prisma: PrismaClient, utilisateurId: string, id: string, s: Sortie<typeof schemaCompteEpargne>, aujourdhui: DateCivile) {
  await trouverCompte(prisma, utilisateurId, id)
  pasDansLeFutur(s.auLe, aujourdhui, 'Un solde déclaré')
  exigerTouche(await prisma.compteEpargne.updateMany({ where: { id, utilisateurId }, data: { libelle: s.libelle, solde: s.solde, auLe: s.auLe } }), 'Compte')
}

export async function supprimerCompte(prisma: PrismaClient, utilisateurId: string, id: string) {
  await trouverCompte(prisma, utilisateurId, id)
  if (await prisma.mouvementEpargne.count({ where: { compteId: id, utilisateurId } })) {
    throw regle('Ce compte a des mouvements : supprime-les d’abord, ou garde le compte.')
  }
  exigerTouche(await prisma.compteEpargne.deleteMany({ where: { id, utilisateurId } }), 'Compte')
}

async function trouverObjectif(prisma: PrismaClient, utilisateurId: string, id: string) {
  const o = await prisma.objectif.findFirst({ where: { id, utilisateurId } })
  if (!o) throw introuvable('Objectif')
  return o
}

/**
 * Compte où va l'épargne quand l'utilisateur n'en choisit pas (lot 37) : la page Épargne ne parle plus de comptes,
 * on note seulement ce qui est mis de côté. Le premier compte existant, sinon « Mon épargne », créé à 0 et ouvert depuis toujours.
 */
async function compteParDefaut(prisma: PrismaClient, utilisateurId: string): Promise<string> {
  const existant = await prisma.compteEpargne.findFirst({ where: { utilisateurId }, orderBy: { creeLe: 'asc' }, select: { id: true } })
  if (existant) return existant.id
  const { id } = await prisma.compteEpargne.create({ data: { utilisateurId, libelle: 'Mon épargne', solde: 0, auLe: '2000-01-01' } })
  return id
}

/** Versement ou retrait réel. Un retrait sur un objectif ne peut pas dépasser ce qu'il a d'épargné. */
export async function creerMouvement(prisma: PrismaClient, utilisateurId: string, s: Sortie<typeof schemaMouvementEpargne>, aujourdhui: DateCivile) {
  pasDansLeFutur(s.date, aujourdhui, 'Un mouvement d’épargne')
  await exigerDatesOuvertes(prisma, utilisateurId, s.date)
  const compteId = s.compteId ? (await trouverCompte(prisma, utilisateurId, s.compteId)).id : await compteParDefaut(prisma, utilisateurId)
  let libelle = s.libelle
  if (s.objectifId) {
    const o = await trouverObjectif(prisma, utilisateurId, s.objectifId)
    if (o.statut !== 'actif' && o.statut !== 'pause') throw regle(`« ${o.libelle} » est ${o.statut === 'realise' ? 'réalisé' : 'abandonné'} : il ne reçoit plus de versement.`)
    if (s.sens === 'retrait') {
      const { epargne } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
      const dejaEpargne = epargneObjectif(epargne.objectifs.find((x) => x.id === o.id)!, epargne.mouvementsEpargne)
      if (s.montant > dejaEpargne) throw regle(`« ${o.libelle} » n’a que ${formaterMontant(dejaEpargne)} d’épargné.`, { montant: 'Plus que l’épargné.' })
    }
    libelle ||= o.libelle
  }
  const { id } = await prisma.mouvementEpargne.create({
    data: {
      utilisateurId,
      compteId,
      objectifId: s.objectifId,
      type: s.sens,
      date: s.date,
      montant: s.sens === 'versement' ? s.montant : -s.montant,
      libelle,
      note: s.note ?? null,
    },
  })
  return { id }
}

export async function supprimerMouvement(prisma: PrismaClient, utilisateurId: string, id: string) {
  const m = await prisma.mouvementEpargne.findFirst({ where: { id, utilisateurId } })
  if (!m) throw introuvable('Mouvement')
  if (m.type === 'achat') throw regle('C’est l’achat d’un objectif réalisé : annule la réalisation depuis l’objectif.')
  await exigerDatesOuvertes(prisma, utilisateurId, m.date)
  exigerTouche(await prisma.mouvementEpargne.deleteMany({ where: { id, utilisateurId } }), 'Mouvement')
}

// --- Plan du mois (lot 36) : épargné, « pas ce mois-ci », ou annulé ---

/** Versement mensuel de l'objectif dans le mois en cours ; refus s'il n'y en a pas. */
async function versementDuMois(prisma: PrismaClient, utilisateurId: string, objectifId: string, aujourdhui: DateCivile) {
  const objectif = await trouverObjectif(prisma, utilisateurId, objectifId)
  const { calendrier } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
  const mois = calendrier.moisCourant()
  const ligne = calendrier.epargneDuMois(mois.cle).lignes.find((l) => l.objectifId === objectifId)
  return { objectif, mois, ligne }
}

/** « Pas ce mois-ci » : le versement mensuel n'est plus attendu ce mois-ci. Refus si rien n'est prévu ou si un versement est déjà noté. */
export async function sauterVersement(prisma: PrismaClient, utilisateurId: string, objectifId: string, aujourdhui: DateCivile) {
  const { objectif, mois, ligne } = await versementDuMois(prisma, utilisateurId, objectifId, aujourdhui)
  if (ligne?.prevuSaute) return
  if (!ligne?.prevu) throw regle(`Aucun versement n’est prévu ce mois-ci pour « ${objectif.libelle} ».`)
  if (ligne.reel > 0) throw regle(`Un versement est déjà noté ce mois-ci pour « ${objectif.libelle} » : annule-le d’abord.`)
  await prisma.versementSaute.create({ data: { utilisateurId, objectifId, cle: mois.cle } })
}

/** Annule « pas ce mois-ci » : le versement mensuel est de nouveau attendu. */
export async function reprendreVersement(prisma: PrismaClient, utilisateurId: string, objectifId: string, aujourdhui: DateCivile) {
  const { mois } = await versementDuMois(prisma, utilisateurId, objectifId, aujourdhui)
  exigerTouche(await prisma.versementSaute.deleteMany({ where: { utilisateurId, objectifId, cle: mois.cle } }), 'Versement sauté')
}

/** Annule ce qui a été épargné ce mois-ci pour l'objectif : ses versements du mois en cours sont retirés (les retraits restent). */
export async function annulerVersementsDuMois(prisma: PrismaClient, utilisateurId: string, objectifId: string, aujourdhui: DateCivile) {
  const { mois } = await versementDuMois(prisma, utilisateurId, objectifId, aujourdhui)
  exigerTouche(
    await prisma.mouvementEpargne.deleteMany({ where: { utilisateurId, objectifId, type: 'versement', date: { gte: mois.debut, lte: mois.fin } } }),
    'Versement du mois',
  )
}

// --- Objectifs ---

const comptesCourts = (prisma: PrismaClient, utilisateurId: string) =>
  prisma.compteEpargne.findMany({ where: { utilisateurId }, select: { id: true, libelle: true }, orderBy: { creeLe: 'asc' } })

export async function lister(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile): Promise<ObjectifsDto> {
  const [{ calendrier, epargne, regles }, charges, comptes] = await Promise.all([
    chargerCalendrier(prisma, utilisateurId, aujourdhui),
    prisma.charge.findMany({ where: { utilisateurId } }),
    comptesCourts(prisma, utilisateurId),
  ])
  // Une seule analyse : la liste et la vue annuelle reposent sur les mêmes projections.
  const analyse = analyser(calendrier, epargne, aujourdhui, { regles })
  const suivi = analyse.suivi
  const essentiel = essentielMensuel(charges.map(versCharge), aujourdhui, suivi.moisCourant)
  return { ...suivi, aujourdhui, fondsSecurite: essentiel > 0 ? cibleFondsSecurite(essentiel) : null, comptes, regles, annee: anneeDesObjectifs(calendrier, epargne, analyse) }
}

export async function detail(prisma: PrismaClient, utilisateurId: string, id: string, aujourdhui: DateCivile): Promise<ObjectifDetailDto> {
  await trouverObjectif(prisma, utilisateurId, id)
  const [{ calendrier, epargne, regles, depart }, versements, comptes] = await Promise.all([
    chargerCalendrier(prisma, utilisateurId, aujourdhui),
    mouvementsDto(prisma, utilisateurId, id),
    comptesCourts(prisma, utilisateurId),
  ])
  const suivi = suiviDesObjectifs(calendrier, epargne, aujourdhui, { regles })
  const objectif = suivi.objectifs.find((o) => o.id === id)!
  return {
    aujourdhui,
    moisCourant: suivi.moisCourant,
    objectif,
    trajectoire: trajectoireObjectif(calendrier, objectif, epargne, aujourdhui, regles),
    versements,
    capacite: suivi.capacite,
    comptes,
    regles,
    simulation: simulationCumul(calendrier, epargne, id, aujourdhui, { regles, depart }),
  }
}

const donneesObjectif = (s: Sortie<typeof schemaObjectif>) => ({
  libelle: s.libelle,
  type: s.type,
  montantCible: s.montantCible,
  montantInitial: s.montantInitial,
  dateCible: s.dateCible,
  versementMensuel: s.versementMensuel,
})

const prochainePriorite = async (prisma: PrismaClient, utilisateurId: string) =>
  ((await prisma.objectif.aggregate({ where: { utilisateurId }, _max: { priorite: true } }))._max.priorite ?? 0) + 1

/** Un nouvel objectif passe après les autres : l'utilisateur le remonte s'il le veut. */
export async function creer(prisma: PrismaClient, utilisateurId: string, s: Sortie<typeof schemaObjectif>) {
  const { id } = await prisma.objectif.create({ data: { utilisateurId, ...donneesObjectif(s), priorite: await prochainePriorite(prisma, utilisateurId) } })
  return { id }
}

export async function modifier(prisma: PrismaClient, utilisateurId: string, id: string, s: Sortie<typeof schemaObjectif>) {
  await trouverObjectif(prisma, utilisateurId, id)
  exigerTouche(await prisma.objectif.updateMany({ where: { id, utilisateurId }, data: donneesObjectif(s) }), 'Objectif')
}

/** Supprimer : ses versements restent dans l'épargne (épargne libre) ; son achat éventuel aussi. */
export async function supprimer(prisma: PrismaClient, utilisateurId: string, id: string) {
  await trouverObjectif(prisma, utilisateurId, id)
  exigerTouche(await prisma.objectif.deleteMany({ where: { id, utilisateurId } }), 'Objectif')
}

/**
 * Aperçu en direct (ux-ui.md (UX) § 4.4) : l'objectif est projeté comme s'il existait, en dernière priorité. Rien n'est écrit.
 * `remplace` : modification d'un objectif existant, projeté à sa place (même priorité, mêmes versements).
 */
export async function apercu(
  prisma: PrismaClient,
  utilisateurId: string,
  s: Sortie<typeof schemaObjectif>,
  aujourdhui: DateCivile,
  remplace?: string,
): Promise<ApercuObjectifDto> {
  const [{ calendrier, epargne, regles }, priorite] = await Promise.all([chargerCalendrier(prisma, utilisateurId, aujourdhui), prochainePriorite(prisma, utilisateurId)])
  const existant = remplace ? epargne.objectifs.find((o) => o.id === remplace) : undefined
  if (remplace && !existant) throw introuvable('Objectif')
  const nouveau: Objectif = {
    id: existant?.id ?? 'apercu',
    ...donneesObjectif(s),
    montantCible: centimes(s.montantCible),
    montantInitial: centimes(s.montantInitial),
    versementMensuel: s.versementMensuel === null ? null : centimes(s.versementMensuel),
    priorite: existant?.priorite ?? priorite,
    statut: existant?.statut === 'pause' ? 'pause' : 'actif',
    realiseLe: null,
    creeLe: existant?.creeLe ?? aujourdhui,
  }
  const autres = epargne.objectifs.filter((o) => o.id !== nouveau.id)
  const suivi = suiviDesObjectifs(calendrier, { ...epargne, objectifs: [...autres, nouveau] }, aujourdhui, { regles })
  return { objectif: suivi.objectifs.find((o) => o.id === nouveau.id)!, capacite: suivi.capacite }
}

/** Nouvel ordre de priorité : tous les objectifs du compte, du plus important au moins important. */
export async function ordonner(prisma: PrismaClient, utilisateurId: string, { ids }: Sortie<typeof schemaOrdreObjectifs>) {
  const existants = await prisma.objectif.findMany({ where: { utilisateurId }, select: { id: true } })
  const attendus = new Set(existants.map((o) => o.id))
  if (ids.length !== attendus.size || new Set(ids).size !== ids.length || ids.some((id) => !attendus.has(id))) {
    throw regle('L’ordre doit contenir chaque objectif une seule fois.')
  }
  await prisma.$transaction(async (tx) => {
    for (const [i, id] of ids.entries()) exigerTouche(await tx.objectif.updateMany({ where: { id, utilisateurId }, data: { priorite: i + 1 } }), 'Objectif')
  })
}

/** Pause, reprise, abandon. Reprendre un objectif réalisé annule son achat (l'épargne revient). */
export async function changerStatut(prisma: PrismaClient, utilisateurId: string, id: string, { statut }: Sortie<typeof schemaStatutObjectif>) {
  const o = await trouverObjectif(prisma, utilisateurId, id)
  if (o.statut === 'realise') {
    const achat = await prisma.mouvementEpargne.findFirst({ where: { utilisateurId, objectifId: id, type: 'achat' } })
    if (achat) await exigerDatesOuvertes(prisma, utilisateurId, achat.date)
    await prisma.$transaction(async (tx) => {
      await tx.mouvementEpargne.deleteMany({ where: { utilisateurId, objectifId: id, type: 'achat' } })
      exigerTouche(await tx.objectif.updateMany({ where: { id, utilisateurId }, data: { statut, realiseLe: null } }), 'Objectif')
    })
    return
  }
  exigerTouche(await prisma.objectif.updateMany({ where: { id, utilisateurId }, data: { statut } }), 'Objectif')
}

/** Achat réalisé (R19) : l'épargné de l'objectif sort du compte à la date de l'achat ; ce n'est pas une dépense. */
export async function realiser(prisma: PrismaClient, utilisateurId: string, id: string, s: Sortie<typeof schemaRealisation>, aujourdhui: DateCivile) {
  const o = await trouverObjectif(prisma, utilisateurId, id)
  if (o.statut === 'realise' || o.statut === 'abandonne') throw regle(`« ${o.libelle} » est déjà ${o.statut === 'realise' ? 'réalisé' : 'abandonné'}.`)
  pasDansLeFutur(s.date, aujourdhui, 'Un achat réalisé')
  await exigerDatesOuvertes(prisma, utilisateurId, s.date)
  const compteId = s.compteId ? (await trouverCompte(prisma, utilisateurId, s.compteId)).id : await compteParDefaut(prisma, utilisateurId)
  const { epargne } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
  const dejaEpargne = epargneObjectif(epargne.objectifs.find((x) => x.id === id)!, epargne.mouvementsEpargne)
  await prisma.$transaction(async (tx) => {
    if (dejaEpargne > 0) {
      await tx.mouvementEpargne.create({ data: { utilisateurId, compteId, objectifId: id, type: 'achat', date: s.date, montant: -dejaEpargne, libelle: `Achat : ${o.libelle}` } })
    }
    exigerTouche(await tx.objectif.updateMany({ where: { id, utilisateurId }, data: { statut: 'realise', realiseLe: lireDate(s.date) } }), 'Objectif')
  })
}
