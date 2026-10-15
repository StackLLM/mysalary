import { centimes, type Centimes } from './argent'
import { cumulDesMois, type Depart, type NatureCumul } from './cumul'
import { decalerMois, ecartMois, type CleMois, type DateCivile } from './dates'
import { epargneObjectif } from './epargne'
import { REGLES_SCENARIOS_DEFAUT, type DonneesObjectifs, type ReglesScenarios } from './objectifs'
import type { Calendrier } from './periodes'

/**
 * Simulation d'un objectif avec le cumul de fin de mois (page Objectif).
 * Le cumul est calculé par MySalary (lot 13) : ce qui resterait sur le compte courant à la fin du mois,
 * revenus − charges − épargne prévue, mois après mois. On suppose que ce cumul rejoint l'objectif à la fin du mois choisi :
 * épargne simulée = épargne actuelle + versements prévus à l'objectif d'ici là + cumul de fin de mois (jamais négatif).
 * Les versements prévus sont déjà retirés du cumul : rien n'est compté deux fois. Tout est projeté, rien n'est enregistré.
 */

export interface MoisSimulation {
  cle: CleMois
  /** Mois en cours : réel à date + prévu restant (estimation) ; mois futurs : prévu. */
  nature: Exclude<NatureCumul, 'avant' | 'reel'>
  /** Cumul de fin de mois, tel que calculé (peut être négatif). */
  cumul: Centimes
  /** Versements prévus à cet objectif, du mois en cours à ce mois inclus (hors ceux déjà faits). */
  versements: Centimes
  /** Épargne actuelle + versements prévus + cumul (positif). */
  epargne: Centimes
  /** Cible − épargne simulée, jamais négatif. */
  manque: Centimes
  atteint: boolean
}

export interface SimulationObjectif {
  /** Du mois en cours jusqu'à la date souhaitée ou la date d'atteinte (12 mois au moins, 60 au plus). */
  mois: MoisSimulation[]
  /** Premier mois où l'épargne simulée couvre la cible ; `null` au-delà de 10 ans. */
  dateAtteinte: CleMois | null
  /** Date d'atteinte − date souhaitée, en mois : positif = retard, négatif = avance ; `null` sans l'une des deux. */
  ecart: number | null
  /** Le mois souhaité dans la simulation ; `null` sans date souhaitée ou si elle est passée. */
  moisSouhaite: MoisSimulation | null
  /**
   * Mois souhaité manqué : ce qu'il faudrait dégager de plus chaque mois (moins de dépenses, plus de revenus)
   * pour l'atteindre quand même ; `null` s'il est tenu ou sans date souhaitée.
   */
  ajoutParMois: Centimes | null
}

const MOIS_MIN = 12
const MOIS_MAX_AFFICHES = 60
const HORIZON = 120

export interface OptionsSimulationCumul {
  regles?: ReglesScenarios
  depart?: Depart | null
}

/** `null` pour un objectif en pause, réalisé, abandonné ou inconnu. */
export function simulationCumul(calendrier: Calendrier, donnees: DonneesObjectifs, id: string, aujourdhui: DateCivile, { regles = REGLES_SCENARIOS_DEFAUT, depart = null }: OptionsSimulationCumul = {}): SimulationObjectif | null {
  const objectif = donnees.objectifs.find((o) => o.id === id)
  if (!objectif || objectif.statut !== 'actif') return null
  const courant = calendrier.moisContenant(aujourdhui).cle
  const epargne = epargneObjectif(objectif, donnees.mouvementsEpargne)
  const cumuls = cumulDesMois(calendrier, courant, decalerMois(courant, HORIZON - 1), { aujourdhui, regle: regles.realiste, depart }).filter((m) => m.cle >= courant)

  let versements = 0
  const tous: MoisSimulation[] = cumuls.map((m) => {
    const ligne = calendrier.epargneDuMois(m.cle).lignes.find((l) => l.objectifId === id)
    // Mois en cours : seul ce qui reste à verser ; le déjà versé est dans l'épargne actuelle.
    versements += m.cle === courant ? Math.max(0, (ligne?.prevu ?? 0) - (ligne?.reel ?? 0)) : (ligne?.prevu ?? 0)
    const cumul = m.cumulApresPrevu ?? centimes(0)
    const simulee = epargne + versements + Math.max(0, cumul)
    return {
      cle: m.cle,
      nature: m.cle === courant ? 'enCours' : 'prevu',
      cumul,
      versements: centimes(versements),
      epargne: centimes(simulee),
      manque: centimes(Math.max(0, objectif.montantCible - simulee)),
      atteint: simulee >= objectif.montantCible,
    }
  })

  const dateAtteinte = tous.find((m) => m.atteint)?.cle ?? null
  const souhaite = objectif.dateCible && objectif.dateCible >= courant ? objectif.dateCible : null
  const fin = [souhaite, dateAtteinte].filter((c): c is CleMois => c !== null).sort().at(-1) ?? courant
  const nombre = Math.min(MOIS_MAX_AFFICHES, Math.max(MOIS_MIN, ecartMois(courant, fin) + 1))
  const moisSouhaite = souhaite ? (tous.find((m) => m.cle === souhaite) ?? null) : null
  return {
    mois: tous.slice(0, nombre),
    dateAtteinte,
    ecart: objectif.dateCible && dateAtteinte ? ecartMois(objectif.dateCible, dateAtteinte) : null,
    moisSouhaite,
    // Chaque dirham de plus par mois s'ajoute au cumul de tous les mois suivants, jusqu'au mois souhaité inclus.
    ajoutParMois: moisSouhaite && !moisSouhaite.atteint ? centimes(Math.ceil(moisSouhaite.manque / (ecartMois(courant, moisSouhaite.cle) + 1))) : null,
  }
}
