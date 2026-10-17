import { echeanceDeCharge, type CleMois, type DateCivile } from '@mysalary/moteur'
import { formaterDate, type DepenseDto, type RattachementsDto, type schemaDepense, type SuiviDepensesDto } from '@mysalary/partage'
import type { PrismaClient } from '@prisma/client'
import type { z } from 'zod'
import { exigerTouche, introuvable } from '../../lib/erreurs'
import { versCharge } from '../charges/conversion'
import { regle, verifierCategorie } from '../charges/depot'
import { exigerDatesOuvertes } from '../mois/clotures'
import { chargerCalendrier } from '../salaire/depot'

// Toute lecture ou écriture est filtrée par utilisateurId (isolation, produit.md (Plan) § 5.7).

type SaisieDepense = z.output<typeof schemaDepense>

/** Une dépense est réelle : pas de date future ; elle ne vise que des lignes du même compte, et une échéance qui existe. */
async function verifier(prisma: PrismaClient, utilisateurId: string, s: SaisieDepense, aujourdhui: DateCivile): Promise<SaisieDepense> {
  if (s.date > aujourdhui) throw regle('Une dépense réelle ne peut pas être dans le futur.', { date: 'Date future.' })
  await verifierCategorie(prisma, utilisateurId, s.categorieId)
  if (s.ponctuelId && !(await prisma.ponctuel.findFirst({ where: { id: s.ponctuelId, utilisateurId } }))) {
    throw regle('Ce ponctuel n’existe pas.', { ponctuelId: 'Ponctuel inconnu.' })
  }
  if (!s.chargeId) return s
  const ligne = await prisma.charge.findFirst({ where: { id: s.chargeId, utilisateurId } })
  if (!ligne) throw regle('Cette charge n’existe pas.', { chargeId: 'Charge inconnue.' })
  const charge = versCharge(ligne)
  if (charge.nature === 'enveloppe') return { ...s, echeance: null }
  if (!s.echeance) throw regle('Indique l’échéance payée.', { echeance: 'Échéance manquante.' })
  if (!echeanceDeCharge(charge, s.echeance)) {
    throw regle(`« ${charge.libelle} » n’a pas d’échéance le ${formaterDate(s.echeance)}.`, { echeance: 'Échéance inconnue.' })
  }
  return s
}

const donnees = (s: SaisieDepense) => ({
  date: s.date,
  montant: s.montant,
  categorieId: s.categorieId,
  libelle: s.libelle,
  note: s.note ?? null,
  chargeId: s.chargeId,
  echeance: s.echeance,
  ponctuelId: s.ponctuelId,
})

export async function creerDepense(prisma: PrismaClient, utilisateurId: string, saisie: SaisieDepense, aujourdhui: DateCivile) {
  await exigerDatesOuvertes(prisma, utilisateurId, saisie.date)
  const s = await verifier(prisma, utilisateurId, saisie, aujourdhui)
  const { id } = await prisma.depense.create({ data: { utilisateurId, ...donnees(s) } })
  return { id }
}

async function trouver(prisma: PrismaClient, utilisateurId: string, id: string) {
  const l = await prisma.depense.findFirst({ where: { id, utilisateurId } })
  if (!l) throw introuvable('Dépense')
  return l
}

export async function modifierDepense(prisma: PrismaClient, utilisateurId: string, id: string, saisie: SaisieDepense, aujourdhui: DateCivile) {
  const avant = await trouver(prisma, utilisateurId, id)
  await exigerDatesOuvertes(prisma, utilisateurId, avant.date, saisie.date)
  const s = await verifier(prisma, utilisateurId, saisie, aujourdhui)
  exigerTouche(await prisma.depense.updateMany({ where: { id, utilisateurId }, data: donnees(s) }), 'Dépense')
}

export async function supprimerDepense(prisma: PrismaClient, utilisateurId: string, id: string) {
  const avant = await trouver(prisma, utilisateurId, id)
  await exigerDatesOuvertes(prisma, utilisateurId, avant.date)
  exigerTouche(await prisma.depense.deleteMany({ where: { id, utilisateurId } }), 'Dépense')
}

/** Mois › Dépenses : réel du mois (dépenses, paiements de dettes) et prévu encore attendu, séparés. */
export async function suivi(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile, cle?: CleMois): Promise<SuiviDepensesDto> {
  const [{ calendrier }, lignes, dettes] = await Promise.all([
    chargerCalendrier(prisma, utilisateurId, aujourdhui),
    prisma.depense.findMany({ where: { utilisateurId }, select: { id: true, note: true, creeLe: true } }),
    prisma.dette.findMany({ where: { utilisateurId }, select: { id: true, libelle: true } }),
  ])
  const mois = cle ? calendrier.mois(cle) : calendrier.moisCourant()
  const s = calendrier.suiviDuMois(mois.cle)
  const extra = new Map(lignes.map((l) => [l.id, l]))
  const nomDette = new Map(dettes.map((d) => [d.id, d.libelle]))
  const depenses: DepenseDto[] = s.depenses.map((d) => ({ ...d, note: extra.get(d.id)?.note ?? null, creeLe: extra.get(d.id)?.creeLe.toISOString() ?? '' }))
  return {
    ...s,
    aujourdhui,
    mois: { cle: mois.cle, debut: mois.debut, fin: mois.fin, nbJours: mois.nbJours, statut: mois.statut },
    depenses,
    paiementsDettes: s.paiementsDettes.map((p) => ({ ...p, libelle: nomDette.get(p.detteId) ?? 'Dette' })),
  }
}

export async function rattachements(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile, date: DateCivile): Promise<RattachementsDto> {
  const { calendrier } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
  return calendrier.rattachements(date)
}
