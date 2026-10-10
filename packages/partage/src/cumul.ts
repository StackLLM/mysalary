import type { DateCivile, MoisCumul, ResumeCumul } from '@mysalary/moteur'
import { z } from 'zod'
import { schemaCleMois } from './salaire'

export type { Depart, MoisCumul, NatureCumul, ResumeCumul } from '@mysalary/moteur'

/** Plage de mois du cumul : 36 mois au plus. */
export const schemaPlageCumul = z
  .strictObject({ du: schemaCleMois, au: schemaCleMois })
  .refine((v) => v.du <= v.au, { path: ['au'], message: 'Le dernier mois doit suivre le premier.' })
  .refine((v) => {
    const [a1, m1] = v.du.split('-').map(Number) as [number, number]
    const [a2, m2] = v.au.split('-').map(Number) as [number, number]
    return (a2 - a1) * 12 + (m2 - m1) < 36
  }, { path: ['au'], message: '36 mois au plus.' })

/** Cumul de mois en mois (lot 13). */
export interface CumulDto {
  aujourdhui: DateCivile
  /** Premier mois du cumul (solde déclaré, ou première donnée réelle). */
  debut: string
  /** Solde de départ déclaré dans les Réglages. */
  depart: { mois: string; solde: number } | null
  mois: MoisCumul[]
  /** Totaux de la plage, cumul de fin et mois le plus bas (lot 14). */
  resume: ResumeCumul
}
