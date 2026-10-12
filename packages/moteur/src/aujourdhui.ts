import { evenementsDuMois, type EvenementJour } from './annee'
import { ajouterJours, decalerMois, jourSemaine, type DateCivile } from './dates'
import type { Calendrier } from './periodes'
import { suiviDesSemaines, type SuiviSemaine } from './semaines'

/**
 * Page Aujourd'hui (lot 16, ux-ui.md (UX) § 5.2) : ce qui tombe dans les prochains jours, et le bilan de la semaine
 * qui vient de finir. Le reste à dépenser, la semaine en cours, l'épargne et l'objectif viennent des indicateurs (lot 12).
 */

/** Revenus et charges datés d'aujourd'hui à aujourd'hui + `jours` − 1, dans l'ordre des dates (réel s'il existe, sinon prévu). */
export function prochainsJours(calendrier: Calendrier, aujourdhui: DateCivile, jours = 7): EvenementJour[] {
  const fin = ajouterJours(aujourdhui, jours - 1)
  const premier = calendrier.moisContenant(aujourdhui).cle
  const dernier = calendrier.moisContenant(fin).cle
  const evenements: EvenementJour[] = []
  for (let cle = premier; cle <= dernier; cle = decalerMois(cle, 1)) {
    evenements.push(...evenementsDuMois(calendrier, cle).filter((e) => e.date >= aujourdhui && e.date <= fin))
  }
  return evenements.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/**
 * Bilan de la semaine passée, le premier jour d'une nouvelle semaine seulement (le lundi, ou le dimanche selon les Réglages) ;
 * `null` les autres jours ou sans budget flexible.
 */
export function semainePassee(calendrier: Calendrier, aujourdhui: DateCivile, { debutSemaine = 1, report = false } = {}): SuiviSemaine | null {
  if (jourSemaine(aujourdhui) !== debutSemaine) return null
  const hier = ajouterJours(aujourdhui, -1)
  const suivi = suiviDesSemaines(calendrier, calendrier.moisContenant(hier).cle, { debutSemaine, report, aujourdhui })
  if (suivi.budget === 0) return null
  return suivi.semaines.find((s) => s.debut <= hier && s.fin >= hier) ?? null
}
