import { centimes, repartir, type Centimes } from './argent'
import type { AjustementSemaine, UniteEnveloppe } from './charges'
import { ajouterJours, type CleMois, type DateCivile } from './dates'
import { semainesDe, type Calendrier, type Semaine } from './periodes'

/**
 * Consommation d'une enveloppe sur son mois budgétaire. Le budget est celui du mois ; l'utilisateur choisit le rythme :
 * - `mois` : pas de rythme choisi, le budget arrive au fil des jours (suivi de la semaine et rythme du mois) ;
 * - `semaine` : chaque semaine ouvre le montant choisi pour elle (sinon le montant par semaine), dès son premier jour ;
 * - `jour` : chaque jour ouvre le montant par jour.
 * Les ouvertures s'arrêtent quand le budget est atteint ; ce qui n'est ouvert par aucune semaine reste « à répartir ».
 * MySalary ne divise jamais le budget : seuls les montants choisis par l'utilisateur sont ouverts.
 */

export interface EnveloppeARythmer {
  budget: Centimes
  unite: UniteEnveloppe
  rythme: Centimes | null
  ajustements: AjustementSemaine[]
}

export interface SemaineEnveloppe extends Semaine {
  /** Montant choisi pour la semaine (ajusté, sinon le montant par semaine) ; par jour : montant par jour × jours. */
  demande: Centimes
  /** Ouvert réellement : la demande, au plus ce qui reste du budget. */
  ouvert: Centimes
  /** Montant choisi pour cette semaine précise. */
  ajuste: boolean
}

export interface PlanEnveloppe {
  /** Montant ouvert chaque jour du mois budgétaire. */
  parJour: Centimes[]
  semaines: SemaineEnveloppe[]
  ouvert: Centimes
  /** Budget qu'aucune semaine (ni aucun jour) n'ouvre. */
  aRepartir: Centimes
  /** Jour où le budget est entièrement ouvert ; `null` s'il ne l'est pas (ou rythme `mois`). */
  atteintLe: DateCivile | null
}

export function planEnveloppe(e: EnveloppeARythmer, mois: { debut: DateCivile; nbJours: number }, semaines: Semaine[]): PlanEnveloppe {
  const jours = Array.from({ length: mois.nbJours }, (_, i) => ajouterJours(mois.debut, i))
  const parJour = jours.map(() => 0)
  const choisi = new Map(e.ajustements.map((a) => [a.debut, a.montant]))
  let reste = e.budget as number
  let atteintLe: DateCivile | null = null
  const ouvrir = (i: number, demande: number) => {
    const part = Math.max(0, Math.min(demande, reste))
    parJour[i]! += part
    reste -= part
    if (part > 0 && reste === 0 && atteintLe === null) atteintLe = jours[i]!
    return part
  }

  if (e.unite === 'mois') {
    repartir(e.budget, jours.map(() => 1)).forEach((part, i) => (parJour[i] = part))
    reste = 0
  }
  const detail: SemaineEnveloppe[] = semaines.map((s) => {
    const premier = jours.indexOf(s.debut)
    if (e.unite === 'mois') {
      const ouvert = parJour.slice(premier, premier + s.nbJours).reduce((a, b) => a + b, 0)
      return { ...s, demande: centimes(ouvert), ouvert: centimes(ouvert), ajuste: false }
    }
    if (e.unite === 'semaine') {
      const ajuste = choisi.has(s.debut)
      const demande = ajuste ? choisi.get(s.debut)! : (e.rythme ?? 0)
      return { ...s, demande: centimes(demande), ouvert: centimes(ouvrir(premier, demande)), ajuste }
    }
    let ouvert = 0
    for (let j = 0; j < s.nbJours; j++) ouvert += ouvrir(premier + j, e.rythme ?? 0)
    return { ...s, demande: centimes((e.rythme ?? 0) * s.nbJours), ouvert: centimes(ouvert), ajuste: false }
  })

  return {
    parJour: parJour.map(centimes),
    semaines: detail,
    ouvert: centimes(e.budget - reste),
    aRepartir: centimes(reste),
    atteintLe,
  }
}

/** Montant ouvert chaque jour du mois par toutes les enveloppes (suivi des semaines, rythme du mois, bilan). */
export function budgetEnveloppesParJour(calendrier: Calendrier, cle: CleMois, debutSemaine = 1): Centimes[] {
  const mois = calendrier.mois(cle)
  const semaines = semainesDe(mois, debutSemaine)
  const parJour = Array.from({ length: mois.nbJours }, () => 0)
  for (const e of calendrier.suiviDuMois(cle).enveloppes) {
    planEnveloppe(e, mois, semaines).parJour.forEach((part, i) => (parJour[i]! += part))
  }
  return parJour.map(centimes)
}

/** Budget d'enveloppes du mois qu'aucune semaine n'ouvre encore. */
export function enveloppesARepartir(calendrier: Calendrier, cle: CleMois, debutSemaine = 1): Centimes {
  const mois = calendrier.mois(cle)
  const semaines = semainesDe(mois, debutSemaine)
  return centimes(calendrier.suiviDuMois(cle).enveloppes.reduce((total, e) => total + planEnveloppe(e, mois, semaines).aRepartir, 0))
}
