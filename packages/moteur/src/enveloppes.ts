import { centimes, repartir, type Centimes } from './argent'
import type { AjustementSemaine, UniteEnveloppe } from './charges'
import { ajouterJours, type CleMois, type DateCivile } from './dates'
import { semainesDe, type Calendrier, type Semaine } from './periodes'

/**
 * Consommation d'une enveloppe sur son mois budgétaire. Le budget est celui du mois ; l'utilisateur choisit le rythme :
 * - `semaine` : chaque semaine reçoit le montant que l'utilisateur a mis pour elle (0 sinon), dès son premier jour ;
 * - `jour` : chaque jour reçoit le montant par jour, jusqu'à atteindre le budget ;
 * - `mois` : consommée librement, suivie sur le mois seulement ; elle ne remplit aucune semaine.
 * MySalary ne divise jamais le budget et n'invente aucun montant de semaine.
 */

export interface EnveloppeARythmer {
  budget: Centimes
  unite: UniteEnveloppe
  rythme: Centimes | null
  ajustements: AjustementSemaine[]
}

export interface SemaineEnveloppe extends Semaine {
  /** Par semaine : le montant mis par l'utilisateur ; par jour : montant par jour × jours. */
  demande: Centimes
  /** Ce que la semaine reçoit (par jour : au plus ce qui reste du budget). */
  ouvert: Centimes
  /** Par semaine : un montant a été mis pour cette semaine. */
  ajuste: boolean
}

export interface PlanEnveloppe {
  /** Montant ouvert chaque jour du mois budgétaire. */
  parJour: Centimes[]
  semaines: SemaineEnveloppe[]
  ouvert: Centimes
  /** Budget qu'aucune semaine (ni aucun jour) ne reçoit ; 0 pour une enveloppe consommée librement. */
  aRepartir: Centimes
  /** Par semaine : montants mis au-delà du budget du mois. */
  depassement: Centimes
  /** Par jour : jour où le budget est atteint ; `null` sinon. */
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

  const detail: SemaineEnveloppe[] = semaines.map((s) => {
    const premier = jours.indexOf(s.debut)
    if (e.unite === 'mois') return { ...s, demande: centimes(0), ouvert: centimes(0), ajuste: false }
    if (e.unite === 'semaine') {
      const montant = choisi.get(s.debut) ?? 0
      parJour[premier]! += montant
      return { ...s, demande: centimes(montant), ouvert: centimes(montant), ajuste: choisi.has(s.debut) }
    }
    let ouvert = 0
    for (let j = 0; j < s.nbJours; j++) ouvert += ouvrir(premier + j, e.rythme ?? 0)
    return { ...s, demande: centimes((e.rythme ?? 0) * s.nbJours), ouvert: centimes(ouvert), ajuste: false }
  })
  const ouvert = detail.reduce((t, s) => t + s.ouvert, 0)

  return {
    parJour: parJour.map(centimes),
    semaines: detail,
    ouvert: centimes(ouvert),
    aRepartir: centimes(e.unite === 'mois' ? 0 : Math.max(0, e.budget - ouvert)),
    depassement: centimes(Math.max(0, ouvert - e.budget)),
    atteintLe,
  }
}

/**
 * Montant reçu chaque jour du mois par les enveloppes (suivi des semaines). Avec `libresAuFilDesJours`
 * (rythme du mois du bilan, vue du mois entier), une enveloppe consommée librement y compte aussi, au fil des jours.
 */
export function budgetEnveloppesParJour(calendrier: Calendrier, cle: CleMois, debutSemaine = 1, { libresAuFilDesJours = false } = {}): Centimes[] {
  const mois = calendrier.mois(cle)
  const semaines = semainesDe(mois, debutSemaine)
  const parJour = Array.from({ length: mois.nbJours }, () => 0)
  for (const e of calendrier.suiviDuMois(cle).enveloppes) {
    const parts = e.unite === 'mois' && libresAuFilDesJours ? repartir(e.budget, parJour.map(() => 1)) : planEnveloppe(e, mois, semaines).parJour
    parts.forEach((part, i) => (parJour[i]! += part))
  }
  return parJour.map(centimes)
}

/** Budget d'enveloppes du mois qu'aucune semaine n'ouvre encore. */
export function enveloppesARepartir(calendrier: Calendrier, cle: CleMois, debutSemaine = 1): Centimes {
  const mois = calendrier.mois(cle)
  const semaines = semainesDe(mois, debutSemaine)
  return centimes(calendrier.suiviDuMois(cle).enveloppes.reduce((total, e) => total + planEnveloppe(e, mois, semaines).aRepartir, 0))
}
