import type { MoisCumul, BilanDuMois, DateCivile, PointRythme, SyntheseCharges } from '@mysalary/moteur'
import { z } from 'zod'

export type { CibleBilan, FamilleBilan, LigneBilan, PointRythme, StatutLigneBilan, SyntheseCharges, TotauxBilan } from '@mysalary/moteur'

export const schemaCloture = z.strictObject({
  /** Clôturer malgré des lignes non confirmées (ux-ui.md (UX) § 5.3). */
  forcer: z.boolean().default(false),
})
export type SaisieCloture = z.input<typeof schemaCloture>

export interface EvenementCloture {
  action: 'cloture' | 'reouverture'
  le: string
  nonConfirmees: number
}

/** Mois › Vue d'ensemble : bilan calculé, ou figé si le mois est clôturé. */
export interface BilanDto extends BilanDuMois {
  aujourdhui: DateCivile
  rythme: PointRythme[]
  /** Mois clôturé : bilan figé à cette date (lecture seule). */
  cloture: { le: string; forcee: boolean; nonConfirmees: number } | null
  journal: EvenementCloture[]
  /** Consommé des charges et reste à payer du mois ; recalculé depuis les lignes, même pour un mois clôturé. */
  synthese: SyntheseCharges
  /** Report reçu du mois précédent et cumul de fin de mois (lot 13) ; calculé, même pour un mois clôturé. */
  cumul: MoisCumul
}
