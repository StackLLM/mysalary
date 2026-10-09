import { additionner, centimes, soustraire, type Centimes } from './argent'
import { ajouterJours, decalerMois, ecartMois, type CleMois, type DateCivile } from './dates'
import { epargneObjectif, etatEpargne, reserve, type CompteEpargne, type EtatEpargne, type MouvementEpargne, type Objectif } from './epargne'
import type { Calendrier } from './periodes'
import type { Certitude } from './salaire'

/**
 * Objectifs (Plan.md § 7.3, § 7.4 ; context.md R15–R20) : restant, effort, date estimée par scénario, risque.
 * Tout ce qui est futur est une projection : le réel (épargné, versements) n'est jamais modifié.
 */

export const SCENARIOS = ['prudent', 'realiste', 'ambitieux'] as const
export type Scenario = (typeof SCENARIOS)[number]

/** Revenus retenus par scénario (Plan.md § 7.3). */
export const CERTITUDES_SCENARIO: Record<Scenario, readonly Certitude[]> = {
  prudent: ['garanti'],
  realiste: ['garanti', 'probable'],
  ambitieux: ['garanti', 'probable', 'incertain'],
}

/** Au-delà, la date estimée n'est pas donnée (« au-delà de 10 ans »). */
export const HORIZON_MAX_MOIS = 120

export type Risque = 'sur' | 'probable' | 'fragile' | 'horsPortee'

export interface OptionsProjection {
  aujourdhui: DateCivile
  /** Certitudes des revenus retenus ; par défaut celles du scénario. */
  certitudes?: readonly Certitude[]
}

/**
 * Capacité d'épargne d'un mois budgétaire (R15) : revenus retenus − charges.
 * Mois en cours : revenus reçus (réel) + revenus encore attendus retenus − (sorties réelles + charges encore prévues)
 * − épargne déjà versée. Mois futur : revenus prévus retenus − charges prévues.
 */
export function capaciteDuMois(calendrier: Calendrier, cle: CleMois, certitudes: readonly Certitude[]): Centimes {
  const retenu = (c: Certitude) => certitudes.includes(c)
  const paie = calendrier.paies.paie(cle)
  const salaire = !paie
    ? centimes(0)
    : paie.statut === 'recue'
      ? additionner(...paie.lignes.map((l) => l.montantRecu ?? centimes(0)))
      : additionner(...paie.lignes.filter((l) => retenu(l.certitude)).map((l) => l.montantPrevu ?? centimes(0)))
  const aPart = calendrier
    .revenusPrevus(decalerMois(cle, -2), decalerMois(cle, 1))
    .filter((r) => r.versement === 'dateSeparee' && r.moisBudget === cle)
    .map((r) => (r.statut === 'recu' ? (r.montantRecu ?? centimes(0)) : retenu(r.certitude) ? r.montantPrevu : centimes(0)))
  const libres = calendrier.revenusLibres(cle).map((r) => r.montant)
  const revenus = additionner(salaire, ...aPart, ...libres)

  const mois = calendrier.mois(cle)
  if (mois.statut === 'aVenir') return soustraire(revenus, calendrier.chargesDuMois(cle).totaux.total)
  const suivi = calendrier.suiviDuMois(cle)
  const charges = additionner(suivi.totaux.total, suivi.restePrevu.total)
  return soustraire(soustraire(revenus, charges), calendrier.epargneEntre(mois.debut, mois.fin))
}

interface EtatProjete {
  id: string
  priorite: number
  versementMensuel: Centimes | null
  cible: Centimes
  cumul: number
}

/**
 * Répartit la capacité d'un mois entre les objectifs actifs (R18) : le versement mensuel choisi d'abord, par priorité,
 * puis le reste en cascade (priorité 1 jusqu'à sa cible, puis 2…). La somme ne dépasse jamais la capacité.
 */
export function repartirCapacite(capacite: Centimes, objectifs: { id: string; priorite: number; versementMensuel: Centimes | null; restant: Centimes }[]): Map<string, Centimes> {
  const parts = new Map(objectifs.map((o) => [o.id, 0]))
  let reste = Math.max(0, capacite)
  const ordre = [...objectifs].sort((a, b) => a.priorite - b.priorite)
  const manque = (o: (typeof ordre)[number]) => o.restant - parts.get(o.id)!
  for (const o of ordre) {
    if (!o.versementMensuel) continue
    const part = Math.min(o.versementMensuel, manque(o), reste)
    parts.set(o.id, parts.get(o.id)! + part)
    reste -= part
  }
  for (const o of ordre) {
    const part = Math.min(manque(o), reste)
    parts.set(o.id, parts.get(o.id)! + part)
    reste -= part
  }
  return new Map([...parts].map(([id, v]) => [id, centimes(v)]))
}

export interface Projection {
  /** Mois projetés, à partir du mois budgétaire en cours. */
  mois: CleMois[]
  capacites: Centimes[]
  /** Épargné projeté à la fin de chaque mois, par objectif. */
  cumuls: Map<string, Centimes[]>
  /** Premier mois où l'épargné projeté couvre la cible ; `null` au-delà de l'horizon. Un objectif déjà atteint : le mois en cours. */
  dates: Map<string, CleMois | null>
}

/** Projection des objectifs actifs mois par mois, avec la capacité du scénario. */
export function projeter(
  calendrier: Calendrier,
  objectifs: Objectif[],
  mouvements: MouvementEpargne[],
  { aujourdhui, certitudes = CERTITUDES_SCENARIO.realiste }: OptionsProjection,
  horizon = HORIZON_MAX_MOIS,
): Projection {
  const depart = calendrier.moisContenant(aujourdhui).cle
  const periode = calendrier.mois(depart)
  /** Déjà versé ce mois-ci à un objectif : son versement mensuel du mois en cours est déjà (en partie) fait. */
  const verseCeMois = (id: string) =>
    mouvements.filter((m) => m.objectifId === id && m.type !== 'achat' && m.date >= periode.debut && m.date <= periode.fin).reduce((t, m) => t + m.montant, 0)
  const etats: EtatProjete[] = objectifs
    .filter((o) => o.statut === 'actif')
    .map((o) => ({ id: o.id, priorite: o.priorite, versementMensuel: o.versementMensuel, cible: o.montantCible, cumul: epargneObjectif(o, mouvements) }))
  const dates = new Map<string, CleMois | null>(etats.map((e) => [e.id, e.cumul >= e.cible ? depart : null]))
  const cumuls = new Map<string, Centimes[]>(etats.map((e) => [e.id, []]))
  const mois: CleMois[] = []
  const capacites: Centimes[] = []

  for (let i = 0; i < horizon; i++) {
    const cle = decalerMois(depart, i)
    const capacite = capaciteDuMois(calendrier, cle, certitudes)
    const parts = repartirCapacite(
      capacite,
      etats.map((e) => ({
        ...e,
        versementMensuel: i === 0 && e.versementMensuel ? centimes(Math.max(0, e.versementMensuel - verseCeMois(e.id))) : e.versementMensuel,
        restant: centimes(Math.max(0, e.cible - e.cumul)),
      })),
    )
    for (const e of etats) {
      e.cumul += parts.get(e.id)!
      cumuls.get(e.id)!.push(centimes(e.cumul))
      if (dates.get(e.id) === null && e.cumul >= e.cible) dates.set(e.id, cle)
    }
    mois.push(cle)
    capacites.push(capacite)
    // Tous atteints : inutile de continuer au-delà de ce que l'écran affiche.
    if (i >= 35 && [...dates.values()].every((d) => d !== null)) break
  }
  return { mois, capacites, cumuls, dates }
}

export interface SuiviObjectif extends Objectif {
  /** Réel : déjà mis de côté + versements. */
  epargne: Centimes
  restant: Centimes
  /** De 0 à 1. */
  progression: number
  atteint: boolean
  /** Du mois en cours au mois souhaité, inclus ; `null` sans date. */
  moisRestants: number | null
  /** Le mois souhaité est passé sans que la cible soit atteinte. */
  dateDepassee: boolean
  /**
   * Ce qu'il faudrait verser par mois (ou par semaine) pour tenir la date, depuis le début du mois en cours ;
   * `null` sans date ou si atteint. Date dépassée : tout le restant.
   */
  effortMensuel: Centimes | null
  effortHebdo: Centimes | null
  /** Projeté, par scénario (objectif actif seulement). */
  estimations: Record<Scenario, CleMois | null> | null
  /** Projeté : versement prévu ce mois-ci par la répartition (réaliste). */
  versementPrevuCeMois: Centimes | null
  risque: Risque | null
}

function risqueDe(o: Pick<SuiviObjectif, 'atteint' | 'dateCible'>, estimations: Record<Scenario, CleMois | null>): Risque | null {
  if (!o.dateCible) return null
  if (o.atteint) return 'sur'
  const tient = (s: Scenario) => estimations[s] !== null && estimations[s]! <= o.dateCible!
  return tient('prudent') ? 'sur' : tient('realiste') ? 'probable' : tient('ambitieux') ? 'fragile' : 'horsPortee'
}

export interface PointTrajectoireObjectif {
  mois: CleMois
  /** Épargné réel à la fin du mois (mois passés), ou aujourd'hui pour le point de jonction. */
  reel: Centimes | null
  /** Épargné projeté (réaliste) à la fin du mois. */
  projete: Centimes | null
  /** Point « aujourd'hui » : jonction du réel et du projeté. */
  aujourdhui: boolean
}

export interface SuiviDesObjectifs {
  epargne: EtatEpargne
  /** Par priorité ; tous statuts. */
  objectifs: SuiviObjectif[]
  /** Capacité du mois en cours par scénario (projeté). */
  capacite: Record<Scenario, Centimes>
  moisCourant: CleMois
}

export interface DonneesObjectifs {
  objectifs: Objectif[]
  comptes: CompteEpargne[]
  mouvementsEpargne: MouvementEpargne[]
}

/** Toutes les projections de la page Objectifs : un passage par scénario. */
export function suiviDesObjectifs(calendrier: Calendrier, { objectifs, comptes, mouvementsEpargne }: DonneesObjectifs, aujourdhui: DateCivile): SuiviDesObjectifs {
  const moisCourant = calendrier.moisContenant(aujourdhui).cle
  const veille = ajouterJours(calendrier.mois(moisCourant).debut, -1)
  const projections = Object.fromEntries(
    SCENARIOS.map((s) => [s, projeter(calendrier, objectifs, mouvementsEpargne, { aujourdhui, certitudes: CERTITUDES_SCENARIO[s] })]),
  ) as Record<Scenario, Projection>

  const suivis = [...objectifs]
    .sort((a, b) => a.priorite - b.priorite)
    .map((o): SuiviObjectif => {
      const epargne = epargneObjectif(o, mouvementsEpargne)
      const restant = centimes(Math.max(0, o.montantCible - epargne))
      const atteint = epargne >= o.montantCible
      const ecart = o.dateCible ? ecartMois(moisCourant, o.dateCible) : null
      const moisRestants = ecart === null ? null : Math.max(0, ecart + 1)
      const dateDepassee = ecart !== null && ecart < 0 && !atteint
      // Rythme mensuel depuis le début du mois en cours : comparable au versement mensuel choisi.
      const restantDebut = Math.max(0, o.montantCible - epargneObjectif(o, mouvementsEpargne, veille))
      const effortMensuel = moisRestants === null || atteint ? null : centimes(moisRestants === 0 ? restant : Math.ceil(restantDebut / moisRestants))
      const actif = o.statut === 'actif'
      const estimations = actif ? (Object.fromEntries(SCENARIOS.map((s) => [s, projections[s].dates.get(o.id) ?? null])) as Record<Scenario, CleMois | null>) : null
      const cumulsRealiste = projections.realiste.cumuls.get(o.id)
      return {
        ...o,
        epargne,
        restant,
        progression: o.montantCible > 0 ? Math.min(1, epargne / o.montantCible) : 1,
        atteint,
        moisRestants,
        dateDepassee,
        effortMensuel,
        effortHebdo: effortMensuel === null ? null : centimes(Math.ceil((effortMensuel * 12) / 52)),
        estimations,
        versementPrevuCeMois: cumulsRealiste?.length ? soustraire(cumulsRealiste[0]!, epargne) : null,
        risque: estimations && reserve(o) ? risqueDe({ atteint, dateCible: o.dateCible }, estimations) : null,
      }
    })

  return {
    epargne: etatEpargne({ comptes, mouvementsEpargne, objectifs }),
    objectifs: suivis,
    capacite: Object.fromEntries(SCENARIOS.map((s) => [s, projections[s].capacites[0] ?? centimes(0)])) as Record<Scenario, Centimes>,
    moisCourant,
  }
}

/**
 * Trajectoire d'un objectif (UX.md § 5.8) : épargné réel à la fin des mois passés depuis le premier versement,
 * point « aujourd'hui », puis épargné projeté (réaliste) jusqu'à la date estimée ou souhaitée (6 à 36 mois).
 */
export function trajectoireObjectif(
  calendrier: Calendrier,
  objectif: Objectif,
  donnees: DonneesObjectifs,
  aujourdhui: DateCivile,
): PointTrajectoireObjectif[] {
  const courant = calendrier.moisContenant(aujourdhui).cle
  const liees = donnees.mouvementsEpargne.filter((m) => m.objectifId === objectif.id && m.type !== 'achat')
  const premier = liees.reduce<DateCivile | null>((min, m) => (min === null || m.date < min ? m.date : min), null)
  const debut = premier ? calendrier.moisContenant(premier).cle : courant
  const points: PointTrajectoireObjectif[] = []
  for (let cle = debut; cle < courant; cle = decalerMois(cle, 1)) {
    points.push({ mois: cle, reel: epargneObjectif(objectif, donnees.mouvementsEpargne, calendrier.mois(cle).fin), projete: null, aujourdhui: false })
  }
  const epargne = epargneObjectif(objectif, donnees.mouvementsEpargne)
  points.push({ mois: courant, reel: epargne, projete: epargne, aujourdhui: true })
  if (objectif.statut !== 'actif') return points

  const projection = projeter(calendrier, donnees.objectifs, donnees.mouvementsEpargne, { aujourdhui })
  const estimee = projection.dates.get(objectif.id) ?? null
  const fin = [estimee, objectif.dateCible].filter((m): m is CleMois => m !== null).sort().at(-1) ?? decalerMois(courant, 5)
  const nombre = Math.min(36, Math.max(6, ecartMois(courant, fin) + 1))
  projection.cumuls
    .get(objectif.id)!
    .slice(0, nombre)
    .forEach((cumul, i) => points.push({ mois: projection.mois[i]!, reel: null, projete: cumul, aujourdhui: false }))
  return points
}
