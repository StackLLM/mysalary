import {
  additionner,
  centimes,
  chargeCeMois,
  dateDeCharge,
  decalerMois,
  equivalentMensuelCharge,
  etatDette,
  moisDe,
  plafondPaiement,
  type Centimes,
  type DateCivile,
  type GroupeCategorie,
} from '@mysalary/moteur'
import {
  CATEGORIES_PAR_DEFAUT,
  CODES_ERREUR,
  formaterMontant,
  type CategorieDto,
  type ChargeDto,
  type DetteDto,
  type IconeCategorie,
  type PonctuelDto,
  type ResumeChargesDto,
  type schemaCategorie,
  type schemaCharge,
  type schemaDette,
  type schemaPaiementDette,
  type schemaPonctuel,
} from '@mysalary/partage'
import type { Categorie, PrismaClient } from '@prisma/client'
import type { z } from 'zod'
import { ErreurApi, introuvable } from '../../lib/erreurs'
import { chargerCalendrier } from '../salaire/depot'
import { versCharge, versDette, versPaiement, versPonctuel } from './conversion'

// Toute lecture ou écriture est filtrée par utilisateurId (isolation, Plan.md § 5.7).

export const regle = (message: string, champs?: Record<string, string>) => new ErreurApi(422, CODES_ERREUR.REGLE_METIER, message, champs)

// --- Catégories ---

/** Crée les catégories par défaut au premier usage du compte. */
async function assurerCategories(prisma: PrismaClient, utilisateurId: string) {
  if ((await prisma.categorie.count({ where: { utilisateurId } })) > 0) return
  await prisma.categorie.createMany({
    data: CATEGORIES_PAR_DEFAUT.map((c, ordre) => ({ utilisateurId, ordre, ...c })),
  })
}

export async function listerCategories(prisma: PrismaClient, utilisateurId: string): Promise<CategorieDto[]> {
  await assurerCategories(prisma, utilisateurId)
  const lignes = await prisma.categorie.findMany({
    where: { utilisateurId },
    orderBy: [{ ordre: 'asc' }, { creeLe: 'asc' }],
    include: { _count: { select: { charges: true, ponctuels: true, depenses: true } } },
  })
  return lignes.map(({ _count, ...c }) => ({
    id: c.id,
    libelle: c.libelle,
    groupe: c.groupe as GroupeCategorie,
    icone: c.icone as IconeCategorie,
    ordre: c.ordre,
    utilisee: _count.charges + _count.ponctuels + _count.depenses > 0,
    depenses: _count.depenses,
  }))
}

const conflitCategorie = (libelle: string) =>
  new ErreurApi(409, CODES_ERREUR.CONFLIT, `La catégorie « ${libelle} » existe déjà.`, { libelle: 'Nom déjà utilisé.' })

export async function creerCategorie(prisma: PrismaClient, utilisateurId: string, saisie: z.output<typeof schemaCategorie>) {
  await assurerCategories(prisma, utilisateurId)
  if (await prisma.categorie.findFirst({ where: { utilisateurId, libelle: saisie.libelle } })) throw conflitCategorie(saisie.libelle)
  const ordre = (await prisma.categorie.count({ where: { utilisateurId } })) + 1
  const c = await prisma.categorie.create({ data: { utilisateurId, ordre, ...saisie } })
  return { id: c.id }
}

async function trouverCategorie(prisma: PrismaClient, utilisateurId: string, id: string): Promise<Categorie> {
  const c = await prisma.categorie.findFirst({ where: { id, utilisateurId } })
  if (!c) throw introuvable('Catégorie')
  return c
}

export async function modifierCategorie(prisma: PrismaClient, utilisateurId: string, id: string, saisie: z.output<typeof schemaCategorie>) {
  await trouverCategorie(prisma, utilisateurId, id)
  if (await prisma.categorie.findFirst({ where: { utilisateurId, libelle: saisie.libelle, NOT: { id } } })) throw conflitCategorie(saisie.libelle)
  await prisma.categorie.update({ where: { id }, data: saisie })
}

export async function supprimerCategorie(prisma: PrismaClient, utilisateurId: string, id: string) {
  const c = await trouverCategorie(prisma, utilisateurId, id)
  const ou = { where: { categorieId: id } }
  const utilisations = (await prisma.charge.count(ou)) + (await prisma.ponctuel.count(ou)) + (await prisma.depense.count(ou))
  if (utilisations > 0) throw regle(`« ${c.libelle} » est utilisée par ${utilisations} élément${utilisations > 1 ? 's' : ''}. Change-leur d’abord de catégorie.`)
  await prisma.categorie.delete({ where: { id } })
}

/** Une charge ne peut viser qu'une catégorie du même compte. */
export async function verifierCategorie(prisma: PrismaClient, utilisateurId: string, categorieId: string) {
  if (!(await prisma.categorie.findFirst({ where: { id: categorieId, utilisateurId } }))) {
    throw regle('Cette catégorie n’existe pas.', { categorieId: 'Catégorie inconnue.' })
  }
}

// --- Charges fixes et enveloppes ---

type SaisieCharge = z.output<typeof schemaCharge>
const versBaseCharge = (s: SaisieCharge) => ({ ...s, mois: s.mois.join(',') })

/** Prochaine date de paiement d'une charge fixe, dans les deux ans. */
function prochaineDate(charge: ReturnType<typeof versCharge>, aujourdhui: DateCivile): DateCivile | null {
  if (charge.nature !== 'fixe') return null
  for (let i = 0; i < 24; i++) {
    const mois = decalerMois(moisDe(aujourdhui), i)
    if (!chargeCeMois(charge, mois)) continue
    const date = dateDeCharge(charge, mois)
    if (date >= aujourdhui) return date
  }
  return null
}

export async function listerCharges(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile): Promise<ChargeDto[]> {
  const [lignes, { calendrier }] = await Promise.all([
    prisma.charge.findMany({ where: { utilisateurId }, orderBy: { creeLe: 'asc' } }),
    chargerCalendrier(prisma, utilisateurId, aujourdhui),
  ])
  const moisBudget = calendrier.moisCourant().cle
  return lignes.map((l) => {
    const c = versCharge(l)
    // Fin d'une fixe : mois civil ; fin d'une enveloppe : mois budgétaire.
    const reference = c.nature === 'fixe' ? moisDe(aujourdhui) : moisBudget
    return {
      ...c,
      montant: l.montant,
      creeLe: l.creeLe.toISOString(),
      equivalentMensuel: equivalentMensuelCharge(c),
      prochaineDate: prochaineDate(c, aujourdhui),
      active: !c.fin || c.fin >= reference,
    }
  })
}

export async function creerCharge(prisma: PrismaClient, utilisateurId: string, saisie: SaisieCharge) {
  await verifierCategorie(prisma, utilisateurId, saisie.categorieId)
  return { id: (await prisma.charge.create({ data: { utilisateurId, ...versBaseCharge(saisie) } })).id }
}

async function trouverCharge(prisma: PrismaClient, utilisateurId: string, id: string) {
  const l = await prisma.charge.findFirst({ where: { id, utilisateurId } })
  if (!l) throw introuvable('Charge')
  return l
}

export async function modifierCharge(prisma: PrismaClient, utilisateurId: string, id: string, saisie: SaisieCharge) {
  await trouverCharge(prisma, utilisateurId, id)
  await verifierCategorie(prisma, utilisateurId, saisie.categorieId)
  await prisma.charge.update({ where: { id }, data: versBaseCharge(saisie) })
}

export async function supprimerCharge(prisma: PrismaClient, utilisateurId: string, id: string) {
  await trouverCharge(prisma, utilisateurId, id)
  await prisma.charge.delete({ where: { id } })
}

// --- Ponctuels ---

type SaisiePonctuel = z.output<typeof schemaPonctuel>

export async function listerPonctuels(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile): Promise<PonctuelDto[]> {
  const [lignes, { calendrier }] = await Promise.all([
    prisma.ponctuel.findMany({ where: { utilisateurId }, orderBy: { date: 'asc' } }),
    chargerCalendrier(prisma, utilisateurId, aujourdhui),
  ])
  return lignes.map((l) => {
    const p = versPonctuel(l)
    return { ...p, montant: l.montant, creeLe: l.creeLe.toISOString(), moisBudget: calendrier.moisContenant(p.date).cle, passe: p.date < aujourdhui }
  })
}

export async function creerPonctuel(prisma: PrismaClient, utilisateurId: string, saisie: SaisiePonctuel) {
  await verifierCategorie(prisma, utilisateurId, saisie.categorieId)
  return { id: (await prisma.ponctuel.create({ data: { utilisateurId, ...saisie } })).id }
}

async function trouverPonctuel(prisma: PrismaClient, utilisateurId: string, id: string) {
  const l = await prisma.ponctuel.findFirst({ where: { id, utilisateurId } })
  if (!l) throw introuvable('Ponctuel')
  return l
}

export async function modifierPonctuel(prisma: PrismaClient, utilisateurId: string, id: string, saisie: SaisiePonctuel) {
  await trouverPonctuel(prisma, utilisateurId, id)
  await verifierCategorie(prisma, utilisateurId, saisie.categorieId)
  await prisma.ponctuel.update({ where: { id }, data: saisie })
}

export async function supprimerPonctuel(prisma: PrismaClient, utilisateurId: string, id: string) {
  await trouverPonctuel(prisma, utilisateurId, id)
  await prisma.ponctuel.delete({ where: { id } })
}

// --- Dettes ---

type SaisieDette = z.output<typeof schemaDette>

export async function listerDettes(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile): Promise<DetteDto[]> {
  const lignes = await prisma.dette.findMany({
    where: { utilisateurId },
    orderBy: { creeLe: 'asc' },
    include: { paiements: { orderBy: [{ date: 'asc' }, { creeLe: 'asc' }] } },
  })
  return lignes.map(({ paiements, ...l }) => {
    const dette = versDette(l)
    return {
      ...dette,
      montantTotal: l.montantTotal,
      mensualite: l.mensualite,
      note: l.note,
      creeLe: l.creeLe.toISOString(),
      etat: etatDette(dette, paiements.map(versPaiement), aujourdhui),
      paiements: paiements.map((p) => ({ ...versPaiement(p), montant: p.montant, note: p.note })),
    }
  })
}

async function trouverDette(prisma: PrismaClient, utilisateurId: string, id: string) {
  const l = await prisma.dette.findFirst({ where: { id, utilisateurId }, include: { paiements: true } })
  if (!l) throw introuvable('Dette')
  return l
}

const donneesDette = (s: SaisieDette) => ({ ...s, note: s.note || null })

export async function creerDette(prisma: PrismaClient, utilisateurId: string, saisie: SaisieDette) {
  return { id: (await prisma.dette.create({ data: { utilisateurId, ...donneesDette(saisie) } })).id }
}

export async function modifierDette(prisma: PrismaClient, utilisateurId: string, id: string, saisie: SaisieDette) {
  const l = await trouverDette(prisma, utilisateurId, id)
  const paye = l.paiements.reduce((t, p) => t + p.montant, 0)
  if (saisie.montantTotal < paye) {
    throw regle(`Tu as déjà remboursé ${formaterMontant(paye)} : le total ne peut pas être plus petit.`, { montantTotal: `Au moins ${formaterMontant(paye)}.` })
  }
  await prisma.dette.update({ where: { id }, data: donneesDette(saisie) })
}

/** Supprime la dette et ses paiements (l'écran demande une confirmation explicite). */
export async function supprimerDette(prisma: PrismaClient, utilisateurId: string, id: string) {
  await trouverDette(prisma, utilisateurId, id)
  await prisma.dette.delete({ where: { id } })
}

export async function ajouterPaiement(
  prisma: PrismaClient,
  utilisateurId: string,
  detteId: string,
  saisie: z.output<typeof schemaPaiementDette>,
  aujourdhui: DateCivile,
) {
  const l = await trouverDette(prisma, utilisateurId, detteId)
  if (saisie.date > aujourdhui) throw regle('Un paiement ne peut pas être daté après aujourd’hui.', { date: 'Date dans le futur.' })
  const plafond = plafondPaiement(versDette(l), l.paiements.map(versPaiement))
  if (plafond <= 0) throw regle(`« ${l.libelle} » est déjà soldée.`)
  if (saisie.montant > plafond) {
    throw regle(`Ce paiement dépasse le reste dû (${formaterMontant(plafond)}).`, { montant: `${formaterMontant(plafond)} au plus.` })
  }
  const p = await prisma.paiementDette.create({ data: { detteId, utilisateurId, date: saisie.date, montant: saisie.montant, note: saisie.note || null } })
  return { id: p.id }
}

export async function supprimerPaiement(prisma: PrismaClient, utilisateurId: string, detteId: string, paiementId: string) {
  await trouverDette(prisma, utilisateurId, detteId)
  const p = await prisma.paiementDette.findFirst({ where: { id: paiementId, detteId, utilisateurId } })
  if (!p) throw introuvable('Paiement')
  await prisma.paiementDette.delete({ where: { id: paiementId } })
}

// --- Résumé ---

export async function resume(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile): Promise<ResumeChargesDto> {
  await assurerCategories(prisma, utilisateurId)
  const [{ calendrier }, categories, charges, dettes] = await Promise.all([
    chargerCalendrier(prisma, utilisateurId, aujourdhui),
    prisma.categorie.findMany({ where: { utilisateurId } }),
    prisma.charge.findMany({ where: { utilisateurId } }),
    prisma.dette.findMany({ where: { utilisateurId } }),
  ])
  const courant = calendrier.moisCourant()
  const duMois = calendrier.chargesDuMois(courant.cle)
  const suivant = calendrier.chargesDuMois(decalerMois(courant.cle, 1))
  const groupes = new Map(categories.map((c) => [c.id, c.groupe as GroupeCategorie]))

  const parGroupe: Record<GroupeCategorie, Centimes> = { essentiel: centimes(0), flexible: centimes(0), engagement: centimes(0) }
  for (const l of duMois.lignes) {
    const groupe = l.categorieId ? (groupes.get(l.categorieId) ?? 'flexible') : 'engagement'
    parGroupe[groupe] = centimes(parGroupe[groupe] + l.montant)
  }

  const actives = charges
    .map(versCharge)
    .filter((c) => !c.fin || c.fin >= (c.nature === 'fixe' ? moisDe(aujourdhui) : courant.cle))
  const somme = (liste: typeof actives) => additionner(...liste.map(equivalentMensuelCharge))

  return {
    aujourdhui,
    mois: { cle: courant.cle, debut: courant.debut, fin: courant.fin, nbJours: courant.nbJours },
    duMois,
    parGroupe,
    equivalentMensuel: {
      fixe: somme(actives.filter((c) => c.nature === 'fixe')),
      enveloppe: somme(actives.filter((c) => c.nature === 'enveloppe')),
      essentiel: somme(actives.filter((c) => c.essentielle)),
    },
    prochaines: [...duMois.lignes, ...suivant.lignes].filter((l) => l.date && l.date >= aujourdhui).slice(0, 6),
    detteRestante: additionner(...dettes.map((d) => calendrier.etatDette(d.id)?.restant ?? centimes(0))),
  }
}
