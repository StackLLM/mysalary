import { centimes, repartir, type Centimes } from './argent'
import { ajouterJours, type CleMois } from './dates'
import { repartirSurSemaines, semainesDe, type Calendrier } from './periodes'

/**
 * Budget des enveloppes d'un mois, jour par jour (une case par jour du mois budgétaire).
 * - `jour` : le montant est divisé par le nombre de jours ; il arrive un peu chaque jour ;
 * - `semaine` : chaque semaine reçoit sa part (au prorata de ses jours dans le mois), disponible dès son premier jour.
 * Le total du mois est le même ; seul le rythme change (prévu à date, écart, reste de la semaine).
 */
export function budgetEnveloppesParJour(calendrier: Calendrier, cle: CleMois, debutSemaine = 1): Centimes[] {
  const mois = calendrier.mois(cle)
  const jours = Array.from({ length: mois.nbJours }, (_, i) => ajouterJours(mois.debut, i))
  const semaines = semainesDe(mois, debutSemaine)
  const parJour = jours.map(() => 0)
  for (const e of calendrier.suiviDuMois(cle).enveloppes) {
    if (e.budget === 0) continue
    if (e.repartition === 'semaine') {
      repartirSurSemaines(e.budget, semaines).forEach((part, i) => {
        parJour[jours.indexOf(semaines[i]!.debut)]! += part
      })
    } else {
      repartir(e.budget, jours.map(() => 1)).forEach((part, i) => (parJour[i]! += part))
    }
  }
  return parJour.map(centimes)
}
