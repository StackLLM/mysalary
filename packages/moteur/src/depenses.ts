import { additionner, centimes, type Centimes } from './argent'
import { chargeCeMois, dateDeCharge, type Charge } from './charges'
import { moisDe, type DateCivile } from './dates'

/**
 * Dépenses réelles (produit.md (Plan) § 6, produit.md (Contexte) R10).
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
 * `paye` ne dépasse jamais le prévu d'une ligne ; l'excédent éventuel est le `surplus` de la dernière.
 */
export function couvrir<T extends { date: DateCivile; montant: Centimes }>(
  prevus: T[],
  paye: Centimes,
  aujourdhui: DateCivile,
): (T & { paye: Centimes; reste: Centimes; surplus: Centimes; statut: StatutCouverture })[] {
  const total = prevus.reduce((s, p) => s + p.montant, 0)
  let cumul = 0
  return prevus.map((p, i) => {
    const avant = cumul
    cumul += p.montant
    const couvert = centimes(Math.max(0, Math.min(p.montant, paye - avant)))
    const statut: StatutCouverture = paye >= cumul ? 'payee' : paye > avant ? 'partielle' : p.date < aujourdhui ? 'enRetard' : 'prevue'
    // Payé au-delà du prévu : porté par la dernière ligne, pour ne rien perdre du réel.
    const surplus = centimes(i === prevus.length - 1 ? Math.max(0, paye - total) : 0)
    return { ...p, paye: couvert, reste: centimes(p.montant - couvert), surplus, statut }
  })
}

export const somme = <T extends { montant: Centimes }>(liste: T[]): Centimes => additionner(...liste.map((d) => d.montant))
