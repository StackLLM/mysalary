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

/** Règle d'un scénario (Plan.md § 7.3), modifiable dans les Réglages. */
export interface RegleScenario {
  /** Certitudes des revenus retenus ; « garanti » l'est toujours. */
  revenus: Certitude[]
  /** Dépenses flexibles = moyenne réelle des 3 derniers mois si elle dépasse le budget des enveloppes. */
  flexibleMoyenne: boolean
}
export type ReglesScenarios = Record<Scenario, RegleScenario>

export const REGLES_SCENARIOS_DEFAUT: ReglesScenarios = {
  prudent: { revenus: ['garanti'], flexibleMoyenne: true },
  realiste: { revenus: ['garanti', 'probable'], flexibleMoyenne: false },
  ambitieux: { revenus: ['garanti', 'probable', 'incertain'], flexibleMoyenne: false },
}

/**
 * Leviers d'une simulation (UX.md § 4.5) : des hypothèses, jamais enregistrées dans les données.
 * `versements` et `datesCibles` remplacent ceux des objectifs ; une prime s'ajoute à un mois budgétaire ;
 * une réduction baisse une charge chaque mois à partir du mois suivant.
 */
export interface Ajustements {
  versements?: Record<string, Centimes | null>
  datesCibles?: Record<string, CleMois | null>
  primes?: { mois: CleMois; montant: Centimes }[]
  reductions?: { chargeId: string; montant: Centimes }[]
}

/** Nombre de mois terminés pris pour la moyenne réelle des dépenses flexibles. */
const MOIS_MOYENNE = 3

/**
 * Moyenne réelle des dépenses flexibles (enveloppes + hors plan) des 3 derniers mois budgétaires terminés
 * qui ont des dépenses notées ; `null` sans historique (jamais de moyenne sur des mois vides).
 */
export function moyenneFlexible(calendrier: Calendrier, aujourdhui: DateCivile): Centimes | null {
  const courant = calendrier.moisContenant(aujourdhui).cle
  const debut = calendrier.debutSuivi
  if (debut === null) return null
  const mois = Array.from({ length: MOIS_MOYENNE }, (_, i) => calendrier.mois(decalerMois(courant, -(i + 1)))).filter((m) => m.statut === 'passe' && m.fin >= debut)
  if (mois.length === 0) return null
  const total = mois.reduce((t, m) => {
    const s = calendrier.suiviDuMois(m.cle)
    return t + s.totaux.enveloppe + s.totaux.horsPlan
  }, 0)
  return centimes(Math.round(total / mois.length))
}

/** Objectifs avec les leviers « versement » et « date cible » appliqués (copies : les données ne bougent pas). */
export function avecAjustements(objectifs: Objectif[], ajustements: Ajustements = {}): Objectif[] {
  return objectifs.map((o) => ({
    ...o,
    ...(ajustements.versements && o.id in ajustements.versements ? { versementMensuel: ajustements.versements[o.id] ?? null } : {}),
    ...(ajustements.datesCibles && o.id in ajustements.datesCibles ? { dateCible: ajustements.datesCibles[o.id] ?? null } : {}),
  }))
}

/** Au-delà, la date estimée n'est pas donnée (« au-delà de 10 ans »). */
export const HORIZON_MAX_MOIS = 120

export type Risque = 'sur' | 'probable' | 'fragile' | 'horsPortee'

export interface OptionsProjection {
  aujourdhui: DateCivile
  /** Règle du scénario ; par défaut le réaliste. */
  regle?: RegleScenario
  ajustements?: Ajustements
}

export interface OptionsCapacite {
  ajustements?: Ajustements
  /** Moyenne réelle des dépenses flexibles (règle du prudent). */
  moyenneFlexible?: Centimes | null
}

/**
 * Capacité d'épargne d'un mois budgétaire (R15) : revenus retenus − charges.
 * Mois en cours : revenus reçus (réel) + revenus encore attendus retenus − (sorties réelles + charges encore prévues)
 * − épargne déjà versée. Mois futur : revenus prévus retenus − charges prévues (flexible au moins égal à la moyenne
 * réelle si la règle le demande), avec les leviers de simulation (prime, réductions).
 */
export function capaciteDuMois(calendrier: Calendrier, cle: CleMois, regle: RegleScenario, { ajustements = {}, moyenneFlexible = null }: OptionsCapacite = {}): Centimes {
  const retenu = (c: Certitude) => c === 'garanti' || regle.revenus.includes(c)
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
  const primes = (ajustements.primes ?? []).filter((p) => p.mois === cle).map((p) => p.montant)
  const revenus = additionner(salaire, ...aPart, ...libres, ...primes)

  const mois = calendrier.mois(cle)
  if (mois.statut === 'aVenir') {
    const prevues = calendrier.chargesDuMois(cle)
    const flexible = regle.flexibleMoyenne && moyenneFlexible !== null ? Math.max(0, moyenneFlexible - prevues.totaux.enveloppe) : 0
    const reduction = (ajustements.reductions ?? []).reduce((t, r) => {
      const prevu = prevues.lignes.filter((l) => l.id === r.chargeId && (l.origine === 'fixe' || l.origine === 'enveloppe')).reduce((u, l) => u + l.montant, 0)
      return t + Math.min(r.montant, prevu)
    }, 0)
    return centimes(revenus - prevues.totaux.total - flexible + reduction)
  }
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
  { aujourdhui, regle = REGLES_SCENARIOS_DEFAUT.realiste, ajustements = {} }: OptionsProjection,
  horizon = HORIZON_MAX_MOIS,
): Projection {
  const depart = calendrier.moisContenant(aujourdhui).cle
  const moyenne = regle.flexibleMoyenne ? moyenneFlexible(calendrier, aujourdhui) : null
  objectifs = avecAjustements(objectifs, ajustements)
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
    const capacite = capaciteDuMois(calendrier, cle, regle, { ajustements, moyenneFlexible: moyenne })
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

export interface OptionsSuivi {
  regles?: ReglesScenarios
  /** Leviers de simulation : appliqués à des copies, les données ne bougent pas. */
  ajustements?: Ajustements
  horizon?: number
}

/** Toutes les projections de la page Objectifs : un passage par scénario. */
export function suiviDesObjectifs(calendrier: Calendrier, donnees: DonneesObjectifs, aujourdhui: DateCivile, options: OptionsSuivi = {}): SuiviDesObjectifs {
  return analyser(calendrier, donnees, aujourdhui, options).suivi
}

/** Suivi des objectifs et projections par scénario (servent aussi au simulateur). */
export function analyser(
  calendrier: Calendrier,
  { objectifs: reels, comptes, mouvementsEpargne }: DonneesObjectifs,
  aujourdhui: DateCivile,
  { regles = REGLES_SCENARIOS_DEFAUT, ajustements = {}, horizon }: OptionsSuivi = {},
): { suivi: SuiviDesObjectifs; projections: Record<Scenario, Projection> } {
  const objectifs = avecAjustements(reels, ajustements)
  const moisCourant = calendrier.moisContenant(aujourdhui).cle
  const veille = ajouterJours(calendrier.mois(moisCourant).debut, -1)
  const projections = Object.fromEntries(
    SCENARIOS.map((s) => [s, projeter(calendrier, objectifs, mouvementsEpargne, { aujourdhui, regle: regles[s], ajustements }, horizon)]),
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
    suivi: {
      epargne: etatEpargne({ comptes, mouvementsEpargne, objectifs }),
      objectifs: suivis,
      capacite: Object.fromEntries(SCENARIOS.map((s) => [s, projections[s].capacites[0] ?? centimes(0)])) as Record<Scenario, Centimes>,
      moisCourant,
    },
    projections,
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
  regles: ReglesScenarios = REGLES_SCENARIOS_DEFAUT,
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

  const projection = projeter(calendrier, donnees.objectifs, donnees.mouvementsEpargne, { aujourdhui, regle: regles.realiste })
  const estimee = projection.dates.get(objectif.id) ?? null
  const fin = [estimee, objectif.dateCible].filter((m): m is CleMois => m !== null).sort().at(-1) ?? decalerMois(courant, 5)
  const nombre = Math.min(36, Math.max(6, ecartMois(courant, fin) + 1))
  projection.cumuls
    .get(objectif.id)!
    .slice(0, nombre)
    .forEach((cumul, i) => points.push({ mois: projection.mois[i]!, reel: null, projete: cumul, aujourdhui: false }))
  return points
}
