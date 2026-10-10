import type { Centimes } from './argent'
import { bilanDuMois, type StatutLigneBilan } from './bilan'
import { ajouterJours, jourSemaine, type CleMois, type DateCivile } from './dates'
import type { Calendrier } from './periodes'

/**
 * Calendrier de l'année (lot 14) : ce qui tombe chaque jour d'un mois budgétaire (paie, autres revenus,
 * charges fixes, ponctuels, échéances) et la grille des jours, semaine par semaine.
 */

export interface EvenementJour {
  date: DateCivile
  type: 'revenu' | 'charge'
  libelle: string
  /** Réel s'il existe, sinon prévu. */
  montant: Centimes
  statut: StatutLigneBilan
}

const FAMILLES_DATEES = { revenu: 'revenu', fixe: 'charge', ponctuel: 'charge', dette: 'charge' } as const

/** Revenus et charges datés d'un mois budgétaire, dans l'ordre des dates. Les enveloppes n'ont pas de date. */
export function evenementsDuMois(calendrier: Calendrier, cle: CleMois): EvenementJour[] {
  const evenements: EvenementJour[] = []
  for (const l of bilanDuMois(calendrier, cle).lignes) {
    if (l.date === null || !(l.famille in FAMILLES_DATEES)) continue
    evenements.push({
      date: l.date,
      type: FAMILLES_DATEES[l.famille as keyof typeof FAMILLES_DATEES],
      libelle: l.libelle,
      montant: (l.reel ?? l.prevu ?? 0) as Centimes,
      statut: l.statut,
    })
  }
  return evenements.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/**
 * Grille d'une période, semaine par semaine (7 cases, `null` hors période).
 * `debutSemaine` : 1 = lundi, 7 = dimanche.
 */
export function grilleDesJours(debut: DateCivile, fin: DateCivile, debutSemaine: 1 | 7 = 1): (DateCivile | null)[][] {
  const decalage = (jourSemaine(debut) - debutSemaine + 7) % 7
  const cases: (DateCivile | null)[] = Array.from({ length: decalage }, () => null)
  for (let d = debut; d <= fin; d = ajouterJours(d, 1)) cases.push(d)
  while (cases.length % 7 !== 0) cases.push(null)
  const semaines: (DateCivile | null)[][] = []
  for (let i = 0; i < cases.length; i += 7) semaines.push(cases.slice(i, i + 7))
  return semaines
}
