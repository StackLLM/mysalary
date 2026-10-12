import { decalerMois, moisDe, simuler, type Ajustements, type DateCivile } from '@mysalary/moteur'
import { formaterDate, formaterMois, formaterMontant, type ApplicationDto, type ScenarioDto, type schemaAjustements, type schemaExecution, type schemaScenario, type SimulationDto } from '@mysalary/partage'
import type { PrismaClient, Scenario } from '@prisma/client'
import type { z } from 'zod'
import { introuvable } from '../../lib/erreurs'
import { regle } from '../charges/depot'
import { chargerCalendrier } from '../salaire/depot'

// Toute lecture ou écriture est filtrée par utilisateurId (isolation, produit.md (Plan) § 5.7).
// Une simulation n'écrit rien ; seul « Appliquer », après confirmation, modifie le plan.

type SaisieAjustements = z.output<typeof schemaAjustements>

/** Projection avec leviers : aucune écriture. */
export async function executer(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile, { ajustements, horizon }: z.output<typeof schemaExecution>): Promise<SimulationDto> {
  const { calendrier, epargne, regles } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
  return { ...simuler(calendrier, epargne, aujourdhui, { regles, ajustements: ajustements as Ajustements, horizon }), aujourdhui }
}

/**
 * Applique les leviers au plan (ux-ui.md (UX) § 4.5, étape 6), en une transaction, et rend le résumé :
 * versement et date d'un objectif, prime en source « unique » probable, réduction d'une charge à partir du mois suivant.
 */
export async function appliquer(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile, a: SaisieAjustements): Promise<ApplicationDto> {
  const { calendrier } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
  const courant = calendrier.moisCourant().cle
  const suivant = decalerMois(courant, 1)
  const idsObjectifs = [...new Set([...Object.keys(a.versements), ...Object.keys(a.datesCibles)])]
  const [objectifs, charges] = await Promise.all([
    prisma.objectif.findMany({ where: { utilisateurId, id: { in: idsObjectifs } } }),
    prisma.charge.findMany({ where: { utilisateurId, id: { in: a.reductions.map((r) => r.chargeId) } } }),
  ])
  const objectif = (id: string) => {
    const o = objectifs.find((x) => x.id === id)
    if (!o) throw introuvable('Objectif')
    if (o.statut !== 'actif' && o.statut !== 'pause') throw regle(`« ${o.libelle} » n’est plus en cours.`)
    return o
  }
  const changements: string[] = []
  const ecritures = []

  for (const id of idsObjectifs) {
    const o = objectif(id)
    const data: { versementMensuel?: number | null; dateCible?: string | null } = {}
    if (id in a.versements) {
      data.versementMensuel = a.versements[id] ?? null
      changements.push(`« ${o.libelle} » : versement mensuel ${data.versementMensuel ? formaterMontant(data.versementMensuel) : 'supprimé'}.`)
    }
    if (id in a.datesCibles) {
      data.dateCible = a.datesCibles[id] ?? null
      changements.push(`« ${o.libelle} » : date souhaitée ${data.dateCible ? formaterMois(data.dateCible) : 'retirée'}.`)
    }
    ecritures.push(prisma.objectif.update({ where: { id }, data }))
  }

  for (const p of a.primes) {
    if (p.mois < courant) throw regle(`La prime de ${formaterMois(p.mois)} est dans un mois passé.`)
    const date = calendrier.mois(p.mois).debut
    const mois = moisDe(date)
    ecritures.push(
      prisma.sourceRevenu.create({
        data: { utilisateurId, libelle: 'Prime (simulation)', type: 'prime', montant: p.montant, frequence: 'unique', versement: 'dateSeparee', jour: Number(date.slice(8)), certitude: 'probable', debut: mois, fin: mois },
      }),
    )
    changements.push(`Prime probable de ${formaterMontant(p.montant)} prévue le ${formaterDate(date)} (Autres revenus).`)
  }

  for (const r of a.reductions) {
    const c = charges.find((x) => x.id === r.chargeId)
    if (!c) throw introuvable('Charge')
    if (c.nature !== 'fixe' && c.nature !== 'enveloppe') throw regle(`« ${c.libelle} » ne peut pas être réduite.`)
    const nouveau = c.montant - r.montant
    // La charge garde son montant jusqu'à ce mois ; une copie réduite prend le relais le mois suivant.
    if (c.debut >= suivant) {
      ecritures.push(nouveau > 0 ? prisma.charge.update({ where: { id: c.id }, data: { montant: nouveau } }) : prisma.charge.delete({ where: { id: c.id } }))
    } else {
      ecritures.push(prisma.charge.update({ where: { id: c.id }, data: { fin: courant } }))
      if (nouveau > 0) {
        const { id: _id, creeLe: _c, modifieLe: _m, ...copie } = c
        ecritures.push(prisma.charge.create({ data: { ...copie, montant: nouveau, debut: suivant, fin: c.fin && c.fin < suivant ? suivant : c.fin } }))
      }
    }
    changements.push(
      nouveau > 0
        ? `« ${c.libelle} » : ${formaterMontant(nouveau)} au lieu de ${formaterMontant(c.montant)} à partir de ${formaterMois(suivant)}.`
        : `« ${c.libelle} » : arrêtée à partir de ${formaterMois(suivant)}.`,
    )
  }

  if (changements.length === 0) throw regle('Aucun levier à appliquer.')
  await prisma.$transaction(ecritures)
  return { changements }
}

// --- Scénarios enregistrés ---

const versDto = (s: Scenario): ScenarioDto => ({ id: s.id, nom: s.nom, ajustements: JSON.parse(s.ajustements), horizon: s.horizon, creeLe: s.creeLe.toISOString() })

export async function lister(prisma: PrismaClient, utilisateurId: string): Promise<ScenarioDto[]> {
  return (await prisma.scenario.findMany({ where: { utilisateurId }, orderBy: { creeLe: 'desc' } })).map(versDto)
}

async function trouver(prisma: PrismaClient, utilisateurId: string, id: string) {
  const s = await prisma.scenario.findFirst({ where: { id, utilisateurId } })
  if (!s) throw introuvable('Scénario')
  return s
}

const donnees = (s: z.output<typeof schemaScenario>) => ({ nom: s.nom, ajustements: JSON.stringify(s.ajustements), horizon: s.horizon })

export async function creer(prisma: PrismaClient, utilisateurId: string, s: z.output<typeof schemaScenario>) {
  const { id } = await prisma.scenario.create({ data: { utilisateurId, ...donnees(s) } })
  return { id }
}

export async function modifier(prisma: PrismaClient, utilisateurId: string, id: string, s: z.output<typeof schemaScenario>) {
  await trouver(prisma, utilisateurId, id)
  await prisma.scenario.update({ where: { id }, data: donnees(s) })
}

export async function supprimer(prisma: PrismaClient, utilisateurId: string, id: string) {
  await trouver(prisma, utilisateurId, id)
  await prisma.scenario.delete({ where: { id } })
}
