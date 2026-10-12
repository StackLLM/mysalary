import { centimes, type Centimes } from './argent'
import { cumulDesMois, type Depart } from './cumul'
import { ajouterJours, ecartMois, type CleMois, type DateCivile } from './dates'
import { epargneObjectif } from './epargne'
import { HORIZON_MAX_MOIS, projeter, REGLES_SCENARIOS_DEFAUT, type DonneesObjectifs, type ReglesScenarios } from './objectifs'
import type { Calendrier } from './periodes'

/**
 * Plan d'épargne d'un objectif, avec ou sans le cumul ajouté à l'épargne actuelle.
 * Le cumul est ce qui reste sur le compte courant au début du mois en cours (report du mois précédent,
 * ou solde de départ déclaré) : la projection commence avec ce mois, il n'est donc jamais compté deux fois.
 * Tout est projeté : l'épargne réelle ne bouge pas tant que l'utilisateur ne verse pas.
 */

export interface EstimationObjectif {
  /** Épargne actuelle de l'objectif (+ le cumul dans le scénario « avec »). */
  depart: Centimes
  /** Cible − départ, jamais négatif. */
  restant: Centimes
  /** À mettre de côté chaque mois pour tenir la date cible ; `null` sans date cible ou si la cible est déjà couverte. */
  mensuel: Centimes | null
  /** Mois de la date cible pris en compte (mois en cours inclus) ; `null` sans date cible. */
  moisRestants: number | null
  /** Date estimée, avec la capacité d'épargne du scénario réaliste ; `null` au-delà de 10 ans. */
  date: CleMois | null
  /** Date estimée − date cible, en mois : positif = retard, négatif = avance ; `null` sans date cible ou sans date estimée. */
  ecart: number | null
}

export interface ScenariosCumul {
  /** Cumul ajouté dans le scénario « avec ». */
  cumul: Centimes
  sans: EstimationObjectif
  avec: EstimationObjectif
}

/** Cumul disponible au début du mois en cours : ce qui reste sur le compte courant, jamais négatif. */
export function cumulDisponible(calendrier: Calendrier, aujourdhui: DateCivile, { regles = REGLES_SCENARIOS_DEFAUT, depart = null }: { regles?: ReglesScenarios; depart?: Depart | null } = {}): { montant: Centimes; mois: CleMois } {
  const courant = calendrier.moisContenant(aujourdhui).cle
  const [ligne] = cumulDesMois(calendrier, courant, courant, { aujourdhui, regle: regles.realiste, depart })
  return { montant: centimes(Math.max(0, ligne?.report ?? 0)), mois: courant }
}

/** Les deux scénarios d'un objectif actif ; `null` pour un objectif en pause, réalisé ou abandonné. */
export function scenariosCumul(
  calendrier: Calendrier,
  donnees: DonneesObjectifs,
  id: string,
  aujourdhui: DateCivile,
  cumul: Centimes,
  regles: ReglesScenarios = REGLES_SCENARIOS_DEFAUT,
): ScenariosCumul | null {
  const trouve = donnees.objectifs.find((o) => o.id === id)
  if (!trouve || trouve.statut !== 'actif') return null
  const objectif = trouve
  const courant = calendrier.moisContenant(aujourdhui).cle
  const veille = ajouterJours(calendrier.mois(courant).debut, -1)
  const epargne = epargneObjectif(objectif, donnees.mouvementsEpargne)
  // Comme l'effort mensuel de l'objectif : depuis le début du mois en cours, comparable au versement mensuel.
  const epargneDebut = epargneObjectif(objectif, donnees.mouvementsEpargne, veille)
  const moisRestants = objectif.dateCible ? Math.max(0, ecartMois(courant, objectif.dateCible) + 1) : null

  function estimer(ajout: number): EstimationObjectif {
    const objectifs = donnees.objectifs.map((o) => (o.id === id ? { ...o, montantInitial: centimes(o.montantInitial + ajout) } : o))
    const date = projeter(calendrier, objectifs, donnees.mouvementsEpargne, { aujourdhui, regle: regles.realiste }, HORIZON_MAX_MOIS).dates.get(id) ?? null
    const depart = centimes(epargne + ajout)
    const restant = centimes(Math.max(0, objectif.montantCible - depart))
    const aCouvrir = Math.max(0, objectif.montantCible - epargneDebut - ajout)
    const mensuel = moisRestants === null || restant === 0 ? null : centimes(moisRestants === 0 ? restant : Math.ceil(aCouvrir / moisRestants))
    return { depart, restant, mensuel, moisRestants, date, ecart: objectif.dateCible && date ? ecartMois(objectif.dateCible, date) : null }
  }

  return { cumul, sans: estimer(0), avec: estimer(cumul) }
}
