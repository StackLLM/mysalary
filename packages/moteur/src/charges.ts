import { additionner, centimes, soustraire, type Centimes } from './argent'
import { dateCivile, decalerMois, joursDansMois, moisDe, partiesMois, type CleMois, type DateCivile } from './dates'
import { dateDeVersement, verseCeMois, type Frequence } from './revenus'
import type { Certitude } from './salaire'

/**
 * Charges, enveloppes, ponctuels et dettes (produit.md (Plan) § 6, produit.md (Contexte) R6–R11).
 * L'épargne n'est jamais une charge (R11) : elle n'apparaît pas ici.
 */

export const GROUPES_CATEGORIE = ['essentiel', 'flexible', 'engagement'] as const
export type GroupeCategorie = (typeof GROUPES_CATEGORIE)[number]

export const NATURES_CHARGE = ['fixe', 'enveloppe'] as const
export type NatureCharge = (typeof NATURES_CHARGE)[number]

/** Une charge fixe se répète : « une seule fois » est un ponctuel. */
export const FREQUENCES_CHARGE = ['mensuelle', 'trimestrielle', 'annuelle', 'moisChoisis'] as const satisfies readonly Frequence[]
export type FrequenceCharge = (typeof FREQUENCES_CHARGE)[number]

/**
 * Rythme de consommation d'une enveloppe, choisi par l'utilisateur. Le budget reste celui du mois ;
 * `semaine` et `jour` : l'utilisateur dit combien ouvrir chaque semaine ou chaque jour, jusqu'à atteindre le budget.
 * MySalary ne divise jamais le budget lui-même.
 */
export const UNITES_ENVELOPPE = ['mois', 'semaine', 'jour'] as const
export type UniteEnveloppe = (typeof UNITES_ENVELOPPE)[number]

/** Montant choisi pour une semaine précise (premier jour de la semaine dans le mois budgétaire). */
export interface AjustementSemaine {
  debut: DateCivile
  montant: Centimes
}

export interface Charge {
  id: string
  libelle: string
  categorieId: string
  nature: NatureCharge
  /** Par versement (fixe) ; enveloppe : budget du mois budgétaire. */
  montant: Centimes
  /** Fixe seulement ; une enveloppe est toujours mensuelle. */
  frequence: FrequenceCharge
  mois: number[]
  /** Jour de paiement d'une charge fixe (1 à 31). */
  jour: number | null
  /** Fixe : premier mois civil de paiement. Enveloppe : premier mois budgétaire. */
  debut: CleMois
  fin: CleMois | null
  essentielle: boolean
  /** Enveloppe seulement : rythme de consommation ; `mois` si absent. */
  unite?: UniteEnveloppe
  /** Enveloppe par semaine ou par jour : montant ouvert chaque semaine (ou chaque jour), au plus le budget. */
  rythme?: Centimes | null
  /** Enveloppe par semaine : montants choisis pour des semaines précises (sinon `rythme`). */
  semaines?: AjustementSemaine[]
}

export interface Ponctuel {
  id: string
  libelle: string
  categorieId: string
  montant: Centimes
  date: DateCivile
  certitude: Certitude
}

export interface Dette {
  id: string
  libelle: string
  creancier: string
  montantTotal: Centimes
  mensualite: Centimes
  premiereEcheance: DateCivile
}

export interface PaiementDette {
  id: string
  detteId: string
  date: DateCivile
  montant: Centimes
}

/** Une charge fixe tombe-t-elle ce mois civil ? */
export function chargeCeMois(charge: Pick<Charge, 'frequence' | 'mois' | 'debut' | 'fin'>, mois: CleMois): boolean {
  return verseCeMois(charge, mois)
}

/** Date de paiement d'une charge fixe un mois donné (31 → dernier jour). */
export const dateDeCharge = (charge: Pick<Charge, 'jour'>, mois: CleMois) => dateDeVersement(charge, mois)

/** L'enveloppe s'applique-t-elle à ce mois budgétaire ? */
export function enveloppeActive(charge: Pick<Charge, 'debut' | 'fin'>, moisBudget: CleMois): boolean {
  return moisBudget >= charge.debut && (!charge.fin || moisBudget <= charge.fin)
}

const VERSEMENTS_PAR_AN: Record<Exclude<FrequenceCharge, 'moisChoisis'>, number> = { mensuelle: 12, trimestrielle: 4, annuelle: 1 }

/** Équivalent mensuel d'une charge fixe ; une enveloppe : son budget du mois. */
export function equivalentMensuelCharge(charge: Pick<Charge, 'nature' | 'montant' | 'frequence' | 'mois'>): Centimes {
  if (charge.nature === 'enveloppe') return charge.montant
  const parAn = charge.frequence === 'moisChoisis' ? charge.mois.length : VERSEMENTS_PAR_AN[charge.frequence]
  return centimes(Math.round((charge.montant * parAn) / 12))
}

// --- Dettes ---

export interface Echeance {
  numero: number
  date: DateCivile
  /** Montant prévu à l'échéancier. */
  montant: Centimes
  statut: 'payee' | 'partielle' | 'enRetard' | 'prevue'
  /** Ce qui manque encore pour couvrir l'échéance (0 si payée). */
  attendu: Centimes
}

export interface EtatDette {
  paye: Centimes
  /** Total − payé ; jamais négatif. */
  restant: Centimes
  soldee: boolean
  echeances: Echeance[]
  /** Première échéance pas encore couverte. */
  prochaine: Echeance | null
  /** Date de la dernière échéance encore attendue. */
  finPrevue: DateCivile | null
}

/** Même jour chaque mois à partir de la première échéance (31 → dernier jour du mois). */
function dateMensuelle(premiere: DateCivile, rang: number): DateCivile {
  const { annee, mois } = partiesMois(decalerMois(moisDe(premiere), rang))
  const jour = Number(premiere.slice(8, 10))
  return dateCivile(annee, mois, Math.min(jour, joursDansMois(annee, mois)))
}

/** Échéancier : la mensualité chaque mois, la dernière échéance = le reste (R9). */
export function echeancier(dette: Pick<Dette, 'montantTotal' | 'mensualite' | 'premiereEcheance'>): { numero: number; date: DateCivile; montant: Centimes }[] {
  if (dette.mensualite <= 0) throw new RangeError('La mensualité doit être positive.')
  const liste: { numero: number; date: DateCivile; montant: Centimes }[] = []
  let reste = dette.montantTotal as number
  for (let rang = 0; reste > 0; rang++) {
    const montant = Math.min(dette.mensualite, reste)
    liste.push({ numero: rang + 1, date: dateMensuelle(dette.premiereEcheance, rang), montant: centimes(montant) })
    reste -= montant
  }
  return liste
}

/** État d'une dette à une date : payé, reste dû, statut et montant attendu de chaque échéance. */
export function etatDette(dette: Dette, paiements: PaiementDette[], aujourdhui: DateCivile): EtatDette {
  const paye = additionner(...paiements.filter((p) => p.detteId === dette.id).map((p) => p.montant))
  const restant = centimes(Math.max(0, dette.montantTotal - paye))
  let cumul = 0
  const echeances: Echeance[] = echeancier(dette).map((e) => {
    const avant = cumul
    cumul += e.montant
    const attendu = centimes(Math.max(0, Math.min(e.montant, cumul - paye)))
    const statut: Echeance['statut'] =
      paye >= cumul ? 'payee' : paye > avant ? 'partielle' : e.date < aujourdhui ? 'enRetard' : 'prevue'
    return { ...e, statut, attendu }
  })
  const encore = echeances.filter((e) => e.attendu > 0)
  return {
    paye,
    restant,
    soldee: restant === 0,
    echeances,
    prochaine: encore[0] ?? null,
    finPrevue: encore.at(-1)?.date ?? null,
  }
}

/** Reste dû qu'un nouveau paiement ne doit pas dépasser. */
export function plafondPaiement(dette: Dette, paiements: PaiementDette[], sauf?: string): Centimes {
  const autres = paiements.filter((p) => p.detteId === dette.id && p.id !== sauf)
  return soustraire(dette.montantTotal, additionner(...autres.map((p) => p.montant)))
}
