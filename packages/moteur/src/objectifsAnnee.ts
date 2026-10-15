import { additionner, centimes, type Centimes } from './argent'
import { ajouterJours, decalerMois, ecartMois, type CleMois, type DateCivile } from './dates'
import { epargneObjectif, reserve } from './epargne'
import { SCENARIOS, type DonneesObjectifs, type Projection, type Risque, type Scenario, type SuiviDesObjectifs } from './objectifs'
import type { Calendrier } from './periodes'

/**
 * Vue annuelle des objectifs (lot 26) : tous les objectifs en cours ensemble, sur l'année du mois budgétaire en cours.
 * Le passé est réel (épargné à la fin de chaque mois), le futur vient des projections déjà calculées pour la page
 * (mêmes scénarios, même répartition) : aucune seconde logique de projection.
 */

export interface PointAnneeObjectifs {
  mois: CleMois
  /** Épargné réel de tous les objectifs en cours à la fin du mois (mois passés) ; aujourd'hui pour le mois en cours. */
  reel: Centimes | null
  /** Épargné projeté (réaliste) à la fin du mois ; le mois en cours porte les deux (jonction). */
  projete: Centimes | null
  aujourdhui: boolean
}

export interface ObjectifAnnee {
  id: string
  /** Épargné au début de l'année (ou à la création de l'objectif si elle est plus récente). */
  debutAnnee: Centimes
  /** Épargné aujourd'hui (réel). */
  epargne: Centimes
  /** Épargné projeté à la fin de l'année (réaliste) ; l'épargné actuel pour un objectif en pause. */
  finAnnee: Centimes
  /** Mois estimé (réaliste) où la cible est atteinte, s'il tombe dans l'année. */
  atteintCetteAnnee: CleMois | null
}

export interface AnneeDesObjectifs {
  annee: number
  /** Objectifs en cours (actifs ou en pause). */
  enCours: number
  cible: Centimes
  epargne: Centimes
  restant: Centimes
  /** De 0 à 1 : épargné ÷ cible, tous objectifs en cours. */
  progression: number
  /** Objectifs dont la date souhaitée n'est pas tenue en scénario réaliste (fragile, hors de portée, date dépassée). */
  aRisque: string[]
  /** Versé net aux objectifs depuis le début de l'année (réel, hors achats). */
  verseCetteAnnee: Centimes
  /** Épargné projeté de tous les objectifs en cours à la fin de l'année, par scénario. */
  finAnnee: Record<Scenario, Centimes>
  /** De janvier (ou du mois du premier objectif) à décembre. */
  points: PointAnneeObjectifs[]
  objectifs: ObjectifAnnee[]
}

const RISQUES_A_SURVEILLER: Risque[] = ['fragile', 'horsPortee']

export function anneeDesObjectifs(
  calendrier: Calendrier,
  { objectifs, mouvementsEpargne }: DonneesObjectifs,
  { suivi, projections }: { suivi: SuiviDesObjectifs; projections: Record<Scenario, Projection> },
): AnneeDesObjectifs {
  const courant = suivi.moisCourant
  const annee = Number(courant.slice(0, 4))
  const janvier = `${annee}-01` as CleMois
  const decembre = `${annee}-12` as CleMois
  const enCours = objectifs.filter(reserve)
  const debutAnnee = calendrier.mois(janvier).debut
  const indexDecembre = ecartMois(courant, decembre)

  /** Épargné projeté d'un objectif à la fin du mois `i` mois après le mois en cours (la pause garde l'épargné actuel). */
  const projeteA = (id: string, epargne: Centimes, scenario: Scenario, i: number): Centimes => {
    const cumuls = projections[scenario].cumuls.get(id)
    if (!cumuls?.length) return epargne
    return cumuls[Math.min(i, cumuls.length - 1)]!
  }

  const parObjectif = enCours.map((o): ObjectifAnnee => {
    const epargne = epargneObjectif(o, mouvementsEpargne)
    const avant = o.creeLe < debutAnnee ? epargneObjectif(o, mouvementsEpargne, ajouterJours(debutAnnee, -1)) : o.montantInitial
    const estimation = projections.realiste.dates.get(o.id) ?? null
    return {
      id: o.id,
      debutAnnee: avant,
      epargne,
      finAnnee: projeteA(o.id, epargne, 'realiste', indexDecembre),
      atteintCetteAnnee: estimation && estimation.startsWith(`${annee}-`) && epargne < o.montantCible ? estimation : null,
    }
  })

  // Avant le premier objectif, il n'y avait rien à suivre : la courbe commence au mois de sa création (ou en janvier).
  const premier = enCours.reduce<DateCivile | null>((min, o) => (min === null || o.creeLe < min ? o.creeLe : min), null)
  const moisPremier = premier ? calendrier.moisContenant(premier).cle : courant
  const debut = [janvier, moisPremier < courant ? moisPremier : courant].sort().at(-1) as CleMois
  const points: PointAnneeObjectifs[] = []
  for (let cle = debut; cle <= decembre; cle = decalerMois(cle, 1)) {
    if (cle < courant) {
      const fin = calendrier.mois(cle).fin
      // Un objectif n'existait pas encore : il ne compte pas dans ce mois passé.
      const reel = additionner(...enCours.filter((o) => o.creeLe <= fin).map((o) => epargneObjectif(o, mouvementsEpargne, fin)))
      points.push({ mois: cle, reel, projete: null, aujourdhui: false })
    } else if (cle === courant) {
      const total = additionner(...parObjectif.map((o) => o.epargne))
      points.push({ mois: cle, reel: total, projete: total, aujourdhui: true })
    } else {
      const i = ecartMois(courant, cle)
      points.push({ mois: cle, reel: null, projete: additionner(...parObjectif.map((o) => projeteA(o.id, o.epargne, 'realiste', i))), aujourdhui: false })
    }
  }

  const cible = additionner(...enCours.map((o) => o.montantCible))
  const epargne = additionner(...parObjectif.map((o) => o.epargne))
  const suivis = new Map(suivi.objectifs.map((o) => [o.id, o]))
  const ids = new Set(enCours.map((o) => o.id))
  return {
    annee,
    enCours: enCours.length,
    cible,
    epargne,
    restant: additionner(...enCours.map((o) => centimes(Math.max(0, o.montantCible - epargneObjectif(o, mouvementsEpargne))))),
    progression: cible > 0 ? Math.min(1, epargne / cible) : 0,
    aRisque: enCours
      .filter((o) => {
        const s = suivis.get(o.id)
        return s && !s.atteint && (s.dateDepassee || (s.risque !== null && RISQUES_A_SURVEILLER.includes(s.risque)))
      })
      .map((o) => o.id),
    verseCetteAnnee: additionner(
      ...mouvementsEpargne.filter((m) => m.objectifId !== null && ids.has(m.objectifId) && m.type !== 'achat' && m.date >= debutAnnee).map((m) => m.montant),
    ),
    finAnnee: Object.fromEntries(
      SCENARIOS.map((s) => [s, additionner(...parObjectif.map((o) => projeteA(o.id, o.epargne, s, indexDecembre)))]),
    ) as Record<Scenario, Centimes>,
    points,
    objectifs: parObjectif,
  }
}

