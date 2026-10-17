import { decalerMois, moisDe, simuler, type Ajustements, type DateCivile } from '@mysalary/moteur'
import { formaterDate, formaterMois, formaterMontant, type ApplicationDto, type ScenarioDto, type schemaAjustements, type schemaExecution, type schemaScenario, type SimulationDto } from '@mysalary/partage'
import type { Prisma, PrismaClient, Scenario } from '@prisma/client'
import type { z } from 'zod'
import { exigerTouche, introuvable } from '../../lib/erreurs'
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
  // Exécutées dans une seule transaction ; chaque écriture vise un élément du compte (prod.md § 6.3).
  const ecritures: ((tx: Prisma.TransactionClient) => Promise<unknown>)[] = []

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
    ecritures.push(async (tx) => exigerTouche(await tx.objectif.updateMany({ where: { id, utilisateurId }, data }), 'Objectif'))
  }

  for (const p of a.primes) {
    if (p.mois < courant) throw regle(`La prime de ${formaterMois(p.mois)} est dans un mois passé.`)
    const date = calendrier.mois(p.mois).debut
    const mois = moisDe(date)
    ecritures.push((tx) =>
      tx.sourceRevenu.create({
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
      const ou = { where: { id: c.id, utilisateurId } }
      ecritures.push(async (tx) => exigerTouche(nouveau > 0 ? await tx.charge.updateMany({ ...ou, data: { montant: nouveau } }) : await tx.charge.deleteMany(ou), 'Charge'))
    } else {
      ecritures.push(async (tx) => exigerTouche(await tx.charge.updateMany({ where: { id: c.id, utilisateurId }, data: { fin: courant } }), 'Charge'))
      if (nouveau > 0) {
        const { id: _id, creeLe: _c, modifieLe: _m, ...copie } = c
        ecritures.push((tx) => tx.charge.create({ data: { ...copie, montant: nouveau, debut: suivant, fin: c.fin && c.fin < suivant ? suivant : c.fin } }))
      }
    }
    changements.push(
      nouveau > 0
        ? `« ${c.libelle} » : ${formaterMontant(nouveau)} au lieu de ${formaterMontant(c.montant)} à partir de ${formaterMois(suivant)}.`
        : `« ${c.libelle} » : arrêtée à partir de ${formaterMois(suivant)}.`,
    )
  }

  if (changements.length === 0) throw regle('Aucun levier à appliquer.')
  await prisma.$transaction(async (tx) => {
    for (const ecrire of ecritures) await ecrire(tx)
  })
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

/**
 * Ce qui sera enregistré : les leviers qui visent un objectif ou une charge d'un autre compte sont retirés,
 * pour qu'aucun scénario ne garde d'identifiant étranger (prod.md § 6.3).
 */
async function donnees(prisma: PrismaClient, utilisateurId: string, s: z.output<typeof schemaScenario>) {
  const a = s.ajustements
  const [objectifs, charges] = await Promise.all([
    prisma.objectif.findMany({ where: { utilisateurId, id: { in: [...Object.keys(a.versements), ...Object.keys(a.datesCibles)] } }, select: { id: true } }),
    prisma.charge.findMany({ where: { utilisateurId, id: { in: a.reductions.map((r) => r.chargeId) } }, select: { id: true } }),
  ])
  const aMoi = new Set([...objectifs, ...charges].map((x) => x.id))
  const garder = <T,>(leviers: Record<string, T>) => Object.fromEntries(Object.entries(leviers).filter(([id]) => aMoi.has(id)))
  const ajustements = { ...a, versements: garder(a.versements), datesCibles: garder(a.datesCibles), reductions: a.reductions.filter((r) => aMoi.has(r.chargeId)) }
  return { nom: s.nom, ajustements: JSON.stringify(ajustements), horizon: s.horizon }
}

export async function creer(prisma: PrismaClient, utilisateurId: string, s: z.output<typeof schemaScenario>) {
  const { id } = await prisma.scenario.create({ data: { utilisateurId, ...(await donnees(prisma, utilisateurId, s)) } })
  return { id }
}

export async function modifier(prisma: PrismaClient, utilisateurId: string, id: string, s: z.output<typeof schemaScenario>) {
  await trouver(prisma, utilisateurId, id)
  exigerTouche(await prisma.scenario.updateMany({ where: { id, utilisateurId }, data: await donnees(prisma, utilisateurId, s) }), 'Scénario')
}

export async function supprimer(prisma: PrismaClient, utilisateurId: string, id: string) {
  await trouver(prisma, utilisateurId, id)
  exigerTouche(await prisma.scenario.deleteMany({ where: { id, utilisateurId } }), 'Scénario')
}
