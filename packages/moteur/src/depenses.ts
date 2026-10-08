import { additionner, centimes, type Centimes } from './argent'
import { chargeCeMois, dateDeCharge, type Charge } from './charges'
import { moisDe, type DateCivile } from './dates'

/**
 * Dépenses réelles (Plan.md § 6, context.md R10).
 * Une dépense est toujours réelle : elle ne modifie jamais le prévu, elle le couvre.
 */

export interface Depense {
  id: string
  date: DateCivile
  montant: Centimes
  categorieId: string
  libelle: string
  /** Charge fixe ou enveloppe couverte. */
  chargeId: string | null
  /** Charge fixe : date prévue de l'échéance couverte. */
  echeance: DateCivile | null
  ponctuelId: string | null
}

/** Où une dépense s'impute dans le mois (R10). */
export type Imputation = 'fixe' | 'enveloppe' | 'ponctuel' | 'horsPlan'

export type StatutCouverture = 'payee' | 'partielle' | 'enRetard' | 'prevue'

/** L'échéance existe-t-elle pour cette charge fixe (bon mois, bon jour) ? */
export function echeanceDeCharge(charge: Pick<Charge, 'nature' | 'frequence' | 'mois' | 'debut' | 'fin' | 'jour'>, echeance: DateCivile): boolean {
  if (charge.nature !== 'fixe') return false
  const mois = moisDe(echeance)
  return chargeCeMois(charge, mois) && dateDeCharge(charge, mois) === echeance
}

/**
 * Répartit ce qui a été payé sur des montants prévus, dans l'ordre des dates :
 * chaque ligne est payée quand le cumul payé couvre le cumul prévu jusqu'à elle.
 */
export function couvrir<T extends { date: DateCivile; montant: Centimes }>(
  prevus: T[],
  paye: Centimes,
  aujourdhui: DateCivile,
): (T & { paye: Centimes; reste: Centimes; statut: StatutCouverture })[] {
  let cumul = 0
  return prevus.map((p) => {
    const avant = cumul
    cumul += p.montant
    const couvert = centimes(Math.max(0, Math.min(p.montant, paye - avant)))
    const statut: StatutCouverture = paye >= cumul ? 'payee' : paye > avant ? 'partielle' : p.date < aujourdhui ? 'enRetard' : 'prevue'
    return { ...p, paye: couvert, reste: centimes(p.montant - couvert), statut }
  })
}

export const somme = <T extends { montant: Centimes }>(liste: T[]): Centimes => additionner(...liste.map((d) => d.montant))
