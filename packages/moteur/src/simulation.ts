import { additionner, centimes, type Centimes } from './argent'
import { decalerMois, ecartMois, type CleMois, type DateCivile } from './dates'
import { debutEpargne, epargneObjectif, reserve, soldeAu } from './epargne'
import { analyser, REGLES_SCENARIOS_DEFAUT, SCENARIOS, type Ajustements, type DonneesObjectifs, type ReglesScenarios, type Risque, type Scenario } from './objectifs'
import type { Calendrier } from './periodes'

/**
 * Simulateur (Plan.md § 7.3 ; UX.md § 4.5, § 5.9) : les mêmes projections que les Objectifs, avec des leviers.
 * Une simulation n'écrit jamais rien : les leviers s'appliquent à des copies.
 */

export const HORIZONS = [6, 12, 24, 36] as const
export type Horizon = (typeof HORIZONS)[number]
/** Au-delà, la projection est signalée comme plus incertaine. */
const HORIZON_INCERTAIN = 24
/** Mois passés montrés en réel. */
const MOIS_REELS = 6

export interface PointSimulation {
  mois: CleMois
  /** Projeté : capacité du mois (négative = le mois puise dans l'épargne). */
  capacite: Centimes
  /** Projeté : épargne totale à la fin du mois = solde actuel + capacités cumulées. */
  epargne: Centimes
  /** Projeté : part réservée aux objectifs (versements répartis compris). */
  reserve: Centimes
}

export type AlerteSimulation =
  | { type: 'versements'; mois: CleMois; demande: Centimes; capacite: Centimes }
  | { type: 'negatif'; mois: CleMois; epargne: Centimes }

export interface ObjectifSimule {
  id: string
  libelle: string
  dateCible: CleMois | null
  versementMensuel: Centimes | null
  epargne: Centimes
  montantCible: Centimes
  /** Projeté sans leviers. */
  base: Record<Scenario, CleMois | null> | null
  /** Projeté avec leviers. */
  simule: Record<Scenario, CleMois | null> | null
  /** Mois gagnés (+) ou perdus (−) grâce aux leviers ; `null` si l'une des dates manque. */
  gainMois: Record<Scenario, number | null> | null
  effortMensuel: Centimes | null
  effortHebdo: Centimes | null
  risqueBase: Risque | null
  risque: Risque | null
}

export interface Simulation {
  moisCourant: CleMois
  horizon: number
  /** L'horizon dépasse 24 mois : avertissement. */
  horizonLong: boolean
  regles: ReglesScenarios
  /** Réel : épargne totale aujourd'hui. */
  epargneActuelle: Centimes
  /** Réel : épargne à la fin des derniers mois passés, depuis la première date connue. */
  reel: { mois: CleMois; epargne: Centimes }[]
  series: Record<Scenario, PointSimulation[]>
  objectifs: ObjectifSimule[]
  /** Scénario réaliste : messages clairs, jamais de blocage (UX.md § 5.9). */
  alertes: AlerteSimulation[]
}

export interface OptionsSimulation {
  regles?: ReglesScenarios
  ajustements?: Ajustements
  horizon?: number
}

export function simuler(calendrier: Calendrier, donnees: DonneesObjectifs, aujourdhui: DateCivile, { regles = REGLES_SCENARIOS_DEFAUT, ajustements = {}, horizon = 12 }: OptionsSimulation = {}): Simulation {
  const base = analyser(calendrier, donnees, aujourdhui, { regles })
  const simu = analyser(calendrier, donnees, aujourdhui, { regles, ajustements })
  const moisCourant = simu.suivi.moisCourant
  const { comptes, mouvementsEpargne } = donnees
  const epargneActuelle = simu.suivi.epargne.solde

  // Réservé qui ne bouge pas dans la projection : objectifs en pause.
  const enPause = additionner(...donnees.objectifs.filter((o) => o.statut === 'pause').map((o) => epargneObjectif(o, mouvementsEpargne)))
  const series = Object.fromEntries(
    SCENARIOS.map((s) => {
      const p = simu.projections[s]
      let cumul: number = epargneActuelle
      const points = p.mois.slice(0, horizon).map((mois, i) => {
        cumul += p.capacites[i]!
        const reserveActifs = [...p.cumuls.values()].reduce((t, c) => t + c[i]!, 0)
        return { mois, capacite: p.capacites[i]!, epargne: centimes(cumul), reserve: centimes(enPause + reserveActifs) }
      })
      return [s, points]
    }),
  ) as Record<Scenario, PointSimulation[]>

  // Réel passé : seulement à partir de la première date connue de l'épargne.
  const debut = debutEpargne(comptes, mouvementsEpargne)
  const reel = Array.from({ length: MOIS_REELS }, (_, i) => calendrier.mois(decalerMois(moisCourant, -(MOIS_REELS - i))))
    .filter((m) => debut !== null && m.fin >= debut)
    .map((m) => ({ mois: m.cle, epargne: soldeAu(comptes, mouvementsEpargne, m.fin) }))

  // Alertes du réaliste : versements choisis au-delà de la capacité (à partir du mois suivant), épargne négative.
  const alertes: AlerteSimulation[] = []
  const realiste = simu.projections.realiste
  const actifs = simu.suivi.objectifs.filter((o) => o.statut === 'actif')
  realiste.mois.slice(0, horizon).forEach((mois, i) => {
    if (i === 0) return
    const demande = actifs.reduce((t, o) => {
      const avant = realiste.cumuls.get(o.id)?.[i - 1] ?? 0
      return o.versementMensuel && avant < o.montantCible ? t + Math.min(o.versementMensuel, o.montantCible - avant) : t
    }, 0)
    const capacite = realiste.capacites[i]!
    if (demande > Math.max(0, capacite)) alertes.push({ type: 'versements', mois, demande: centimes(demande), capacite })
  })
  const negatif = series.realiste.find((p) => p.epargne < 0)
  if (negatif) alertes.push({ type: 'negatif', mois: negatif.mois, epargne: negatif.epargne })

  const parIdBase = new Map(base.suivi.objectifs.map((o) => [o.id, o]))
  const objectifs: ObjectifSimule[] = simu.suivi.objectifs.filter(reserve).map((o) => {
    const b = parIdBase.get(o.id)!
    const gain =
      o.estimations && b.estimations
        ? (Object.fromEntries(
            SCENARIOS.map((s) => {
              const avant = b.estimations![s]
              const apres = o.estimations![s]
              return [s, avant && apres ? ecartMois(apres, avant) : null]
            }),
          ) as Record<Scenario, number | null>)
        : null
    return {
      id: o.id,
      libelle: o.libelle,
      dateCible: o.dateCible,
      versementMensuel: o.versementMensuel,
      epargne: o.epargne,
      montantCible: o.montantCible,
      base: b.estimations,
      simule: o.estimations,
      gainMois: gain,
      effortMensuel: o.effortMensuel,
      effortHebdo: o.effortHebdo,
      risqueBase: b.risque,
      risque: o.risque,
    }
  })

  return { moisCourant, horizon, horizonLong: horizon > HORIZON_INCERTAIN, regles, epargneActuelle, reel, series, objectifs, alertes }
}
