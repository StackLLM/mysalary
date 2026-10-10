import { centimes, repartir, type Centimes } from './argent'
import { ajouterJours, type CleMois } from './dates'
import { repartirSurSemaines, semainesDe, type Calendrier } from './periodes'

/**
 * Budget des enveloppes d'un mois, jour par jour (une case par jour du mois budgétaire), selon l'unité
 * saisie par l'utilisateur — rien n'est inventé, le budget du mois est la somme de ces cases :
 * - `jour` : le montant du jour, chaque jour ;
 * - `semaine` : le montant de la semaine, disponible dès son premier jour (semaine coupée par le mois : ses jours seulement) ;
 * - `mois` : le budget du mois, qui arrive au fil des jours (suivi de la semaine et rythme du mois).
 */
export function budgetEnveloppesParJour(calendrier: Calendrier, cle: CleMois, debutSemaine = 1): Centimes[] {
  const mois = calendrier.mois(cle)
  const jours = Array.from({ length: mois.nbJours }, (_, i) => ajouterJours(mois.debut, i))
  const semaines = semainesDe(mois, debutSemaine)
  const parJour = jours.map(() => 0)
  for (const e of calendrier.suiviDuMois(cle).enveloppes) {
    if (e.budget === 0) continue
    if (e.unite === 'semaine') {
      repartirSurSemaines(e.budget, semaines).forEach((part, i) => {
        parJour[jours.indexOf(semaines[i]!.debut)]! += part
      })
    } else {
      repartir(e.budget, jours.map(() => 1)).forEach((part, i) => (parJour[i]! += part))
    }
  }
  return parJour.map(centimes)
}
