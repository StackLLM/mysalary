import type { CalendrierDuMois, DateCivile, SuiviAnnuel, EvenementJour, MoisCumul, ResumeCumul } from '@mysalary/moteur'
import { z } from 'zod'
import { schemaCleMois } from './salaire'

export type { CalendrierDuMois, CoutMois, Depart, EvenementCalendrier, EvenementJour, JourCalendrier, MoisAnnuel, MoisCumul, ProgressionAnnuelle, TotalAnnuel, TypeEvenement, NatureCumul, ResumeCumul } from '@mysalary/moteur'

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


/** Année affichée dans le calendrier (lot 14). */
export const schemaAnnee = z.coerce.number({ error: 'Année invalide.' }).int('Année invalide.').min(2000, 'Année invalide.').max(2100, 'Année invalide.')

/** Calendrier de l'année (lot 14) : le cumul des 12 mois, et ce qui tombe chaque jour de chaque mois. */
export interface AnneeDto extends CumulDto {
  annee: number
  /** 1 = lundi, 7 = dimanche (Réglages). */
  debutSemaine: 1 | 7
  /** Revenus et charges datés, par mois budgétaire. */
  evenements: Record<string, EvenementJour[]>
}

/** Calendrier d'un mois budgétaire (lot 17) : événements typés, solde jour par jour. */
export interface CalendrierMoisDto extends CalendrierDuMois {
  /** 1 = lundi, 7 = dimanche (Réglages). */
  debutSemaine: 1 | 7
}

/** Suivi annuel (lot 18) : revenus, dépenses et épargne de l'année (réel et projeté séparés), mois coûteux, objectifs. */
export interface SuiviAnnuelDto extends SuiviAnnuel {
  aujourdhui: DateCivile
}
