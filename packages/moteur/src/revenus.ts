import { centimes, type Centimes } from './argent'
import { dateCivile, ecartMois, joursDansMois, moisEntre, partiesMois, type CleMois, type DateCivile } from './dates'
import type { Certitude } from './salaire'

/**
 * Sources de revenus hors salaire (Plan.md § 6, context.md R1–R5).
 * Le mois d'une source est le mois civil où l'argent arrive (« la prime de juin »).
 */

export const TYPES_REVENU = ['prime', 'variable', 'autre'] as const
export type TypeRevenu = (typeof TYPES_REVENU)[number]

export const FREQUENCES = ['mensuelle', 'trimestrielle', 'annuelle', 'unique', 'moisChoisis'] as const
export type Frequence = (typeof FREQUENCES)[number]

export const VERSEMENTS = ['avecPaie', 'dateSeparee'] as const
export type Versement = (typeof VERSEMENTS)[number]

export interface SourceRevenu {
  id: string
  libelle: string
  type: TypeRevenu
  montant: Centimes
  frequence: Frequence
  /** Mois choisis (1 = janvier … 12 = décembre), pour la fréquence `moisChoisis`. */
  mois: number[]
  versement: Versement
  /** Jour du mois pour un versement à part (1 à 31). */
  jour: number | null
  certitude: Certitude
  /** Premier mois de versement. */
  debut: CleMois
  /** Dernier mois de versement inclus ; `null` = sans fin. */
  fin: CleMois | null
}

/** Revenu réellement reçu hors paie : lié à un versement prévu, ou libre (R3). */
export interface RevenuRecu {
  id: string
  sourceId: string | null
  /** Mois de versement prévu auquel ce revenu répond. */
  moisOccurrence: CleMois | null
  date: DateCivile
  montant: Centimes
  libelle: string
}

/** Vrai si la source verse quelque chose ce mois civil. */
export function verseCeMois(source: Pick<SourceRevenu, 'frequence' | 'mois' | 'debut' | 'fin'>, mois: CleMois): boolean {
  if (mois < source.debut || (source.fin && mois > source.fin)) return false
  const ecart = ecartMois(source.debut, mois)
  switch (source.frequence) {
    case 'mensuelle':
      return true
    case 'trimestrielle':
      return ecart % 3 === 0
    case 'annuelle':
      return ecart % 12 === 0
    case 'unique':
      return ecart === 0
    case 'moisChoisis':
      return source.mois.includes(partiesMois(mois).mois)
  }
}

export function moisDeVersement(source: Pick<SourceRevenu, 'frequence' | 'mois' | 'debut' | 'fin'>, du: CleMois, au: CleMois): CleMois[] {
  return moisEntre(du, au).filter((m) => verseCeMois(source, m))
}

/** Date d'un versement à part : le jour choisi, ou le dernier jour du mois s'il n'existe pas. */
export function dateDeVersement(source: Pick<SourceRevenu, 'jour'>, mois: CleMois): DateCivile {
  const { annee, mois: m } = partiesMois(mois)
  return dateCivile(annee, m, Math.min(source.jour ?? 1, joursDansMois(annee, m)))
}

const VERSEMENTS_PAR_AN: Record<Exclude<Frequence, 'moisChoisis'>, number> = {
  mensuelle: 12,
  trimestrielle: 4,
  annuelle: 1,
  unique: 0,
}

/** Équivalent mensuel : montant × versements par an ÷ 12, arrondi au centime. Ponctuel → 0. */
export function equivalentMensuel(source: Pick<SourceRevenu, 'montant' | 'frequence' | 'mois'>): Centimes {
  const parAn = source.frequence === 'moisChoisis' ? source.mois.length : VERSEMENTS_PAR_AN[source.frequence]
  return centimes(Math.round((source.montant * parAn) / 12))
}

/** Totaux par certitude et cumuls par scénario. */
export function totauxParCertitude(montants: { certitude: Certitude; montant: number }[]) {
  const par: Record<Certitude, Centimes> = { garanti: centimes(0), probable: centimes(0), incertain: centimes(0) }
  for (const m of montants) par[m.certitude] = centimes(par[m.certitude] + m.montant)
  return {
    ...par,
    prudent: par.garanti,
    realiste: centimes(par.garanti + par.probable),
    ambitieux: centimes(par.garanti + par.probable + par.incertain),
  }
}
