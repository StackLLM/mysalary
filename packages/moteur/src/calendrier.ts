import { centimes, type Centimes } from './argent'
import { bilanDuMois, type LigneBilan, type StatutLigneBilan } from './bilan'
import { ajouterJours, type CleMois, type DateCivile } from './dates'
import type { MoisBudgetaire, Calendrier } from './periodes'

/**
 * Calendrier d'un mois budgétaire (lot 17, UX.md § 5.10) : tout ce qui tombe chaque jour, avec son type, son statut et
 * ce qu'il faut ouvrir pour le confirmer, et le solde du mois jour par jour.
 *
 * Solde du jour = revenus reçus − sorties réelles, depuis le début du mois, jusqu'à aujourd'hui (réel). Après aujourd'hui,
 * il y ajoute ce qui est encore daté et pas confirmé (revenus attendus, charges et échéances à payer) : c'est le solde
 * projeté. Un revenu ou une charge en retard compte dès demain. Les enveloppes ne sont pas comptées avant d'être dépensées.
 * Le report des mois précédents n'y est pas : voir le cumul (lot 13).
 */

export const TYPES_EVENEMENT = ['paie', 'revenu', 'charge', 'dette', 'ponctuel'] as const
export type TypeEvenement = (typeof TYPES_EVENEMENT)[number]

export interface EvenementCalendrier {
  /** Clé unique dans le mois (celle de la ligne du bilan). */
  cle: string
  date: DateCivile
  type: TypeEvenement
  /** Le sens de l'argent. */
  sens: 'entree' | 'sortie'
  libelle: string
  /** Réel s'il existe, sinon prévu. */
  montant: Centimes
  prevu: Centimes | null
  reel: Centimes | null
  statut: StatutLigneBilan
  /** Date passée, ligne pas (entièrement) confirmée : à marquer discrètement. */
  passeNonConfirme: boolean
  /** La ligne du bilan : montants, écart et cible à ouvrir pour confirmer (même règle que l'onglet Mois). */
  ligne: LigneBilan
}

export interface JourCalendrier {
  date: DateCivile
  /** Solde du mois à la fin de ce jour (réel jusqu'à aujourd'hui, puis projeté). */
  solde: Centimes
  /** Après aujourd'hui : le solde est une projection. */
  projete: boolean
  entrees: Centimes
  sorties: Centimes
}

export interface CalendrierDuMois {
  mois: MoisBudgetaire
  aujourdhui: DateCivile
  evenements: EvenementCalendrier[]
  jours: JourCalendrier[]
}

const TYPE_DE_FAMILLE = { fixe: 'charge', ponctuel: 'ponctuel', dette: 'dette' } as const

/** Lignes datées du bilan, typées. Les enveloppes, le hors plan et l'épargne n'ont pas de date : ils ne sont pas des événements. */
export function calendrierDuMois(calendrier: Calendrier, cle: CleMois, aujourdhui: DateCivile): CalendrierDuMois {
  const mois = calendrier.mois(cle)
  const evenements: EvenementCalendrier[] = []

  for (const l of bilanDuMois(calendrier, cle).lignes) {
    if (l.date === null) continue
    let type: TypeEvenement
    let sens: EvenementCalendrier['sens'] = 'sortie'
    if (l.famille === 'revenu') {
      sens = 'entree'
      type = l.cible?.type === 'paie' ? 'paie' : 'revenu'
    } else if (l.famille in TYPE_DE_FAMILLE) {
      type = TYPE_DE_FAMILLE[l.famille as keyof typeof TYPE_DE_FAMILLE]
    } else continue
    const nonConfirme = l.statut === 'prevu' || l.statut === 'enRetard' || l.statut === 'partiel'
    evenements.push({
      cle: l.cle,
      date: l.date,
      type,
      sens,
      libelle: l.libelle,
      montant: (l.reel ?? l.prevu ?? 0) as Centimes,
      prevu: l.prevu,
      reel: l.reel,
      statut: l.statut,
      passeNonConfirme: l.date < aujourdhui && nonConfirme,
      ligne: l,
    })
  }
  evenements.sort((a, b) => a.date.localeCompare(b.date) || (a.sens === b.sens ? a.libelle.localeCompare(b.libelle) : a.sens === 'entree' ? -1 : 1))

  // Réel : revenus reçus (à leur date) et sorties réelles (dépenses et paiements de dettes), jusqu'à aujourd'hui.
  const entrees = new Map<DateCivile, number>()
  const sorties = new Map<DateCivile, number>()
  const ajouter = (m: Map<DateCivile, number>, date: DateCivile, montant: number) => m.set(date, (m.get(date) ?? 0) + montant)
  const jusqua = aujourdhui < mois.fin ? aujourdhui : mois.fin
  const demain = ajouterJours(aujourdhui, 1)
  for (const e of evenements) {
    if (e.sens === 'entree' && e.reel !== null && e.date <= jusqua) ajouter(entrees, e.date, e.reel)
  }
  if (jusqua >= mois.debut) {
    const reelles = calendrier.sortiesEntre(mois.debut, jusqua)
    for (const d of [...reelles.depenses, ...reelles.paiementsDettes]) ajouter(sorties, d.date, d.montant)
  }
  // Projeté : le reste de chaque ligne datée, à sa date, ou demain si la date est passée.
  if (aujourdhui < mois.fin) {
    for (const e of evenements) {
      const reste = (e.prevu ?? 0) - (e.reel ?? 0)
      if (reste <= 0 || (e.statut !== 'prevu' && e.statut !== 'enRetard' && e.statut !== 'partiel')) continue
      const date = e.date > aujourdhui ? e.date : demain
      if (date > mois.fin) continue
      ajouter(e.sens === 'entree' ? entrees : sorties, date, reste)
    }
  }

  let solde = 0
  const jours: JourCalendrier[] = []
  for (let date = mois.debut; date <= mois.fin; date = ajouterJours(date, 1)) {
    const e = entrees.get(date) ?? 0
    const s = sorties.get(date) ?? 0
    solde += e - s
    jours.push({ date, solde: centimes(solde), projete: date > aujourdhui, entrees: centimes(e), sorties: centimes(s) })
  }
  return { mois, aujourdhui, evenements, jours }
}
