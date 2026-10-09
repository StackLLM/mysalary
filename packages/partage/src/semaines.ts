import type { DateCivile, SuiviDesSemaines } from '@mysalary/moteur'

export type { ChargeDeSemaine, ReponseSemaines, SuiviSemaine, TendanceSemaine } from '@mysalary/moteur'

/** Mois › Semaines : semaines calculées, ou figées si le mois est clôturé. */
export interface SemainesDto extends SuiviDesSemaines {
  aujourdhui: DateCivile
  /** Mois clôturé : semaines figées à la clôture (lecture seule). */
  fige: boolean
}
