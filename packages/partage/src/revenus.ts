import {
  CERTITUDES,
  FREQUENCES,
  TYPES_REVENU,
  VERSEMENTS,
  type Centimes,
  type CleMois,
  type DateCivile,
  type RevenuPrevu,
  type RevenuRecu,
  type SourceRevenu,
  type totauxParCertitude,
} from '@mysalary/moteur'
import { z } from 'zod'
import { schemaCleMois, schemaDateCivile } from './salaire'

export { FREQUENCES, TYPES_REVENU, VERSEMENTS }
export type { Frequence, RevenuPrevu, TypeRevenu, Versement } from '@mysalary/moteur'

const MAXIMUM = 1_000_000_000

const libelle = z
  .string({ error: 'Libellé obligatoire.' })
  .trim()
  .min(1, 'Libellé obligatoire.')
  .max(60, 'Libellé trop long (60 caractères au plus).')

const montant = z
  .number({ error: 'Entre un montant supérieur à 0.' })
  .int('Montant en centimes entiers attendu.')
  .min(1, 'Entre un montant supérieur à 0.')
  .max(MAXIMUM, 'Montant trop élevé.')

// --- Sources de revenus ---

export const schemaSource = z
  .strictObject({
    libelle,
    type: z.enum(TYPES_REVENU, { error: 'Type inconnu.' }),
    montant,
    frequence: z.enum(FREQUENCES, { error: 'Fréquence inconnue.' }),
    mois: z
      .array(z.number().int().min(1).max(12), { error: 'Liste de mois attendue.' })
      .max(12)
      .default([])
      .transform((liste) => [...new Set(liste)].sort((a, b) => a - b)),
    versement: z.enum(VERSEMENTS, { error: 'Mode de versement inconnu.' }),
    jour: z.number().int().min(1, 'Le jour va de 1 à 31.').max(31, 'Le jour va de 1 à 31.').nullable().default(null),
    certitude: z.enum(CERTITUDES, { error: 'Certitude inconnue.' }),
    debut: schemaCleMois,
    fin: schemaCleMois.nullable().default(null),
  })
  .superRefine((v, ctx) => {
    if (v.frequence === 'moisChoisis' && v.mois.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['mois'], message: 'Choisis au moins un mois.' })
    }
    if (v.versement === 'dateSeparee' && v.jour === null) {
      ctx.addIssue({ code: 'custom', path: ['jour'], message: 'Indique le jour du versement.' })
    }
    if (v.fin && v.fin < v.debut) {
      ctx.addIssue({ code: 'custom', path: ['fin'], message: 'La fin doit suivre le début.' })
    }
  })
  .transform((v) => ({
    ...v,
    // Avec la paie, le jour est celui de la paie ; hors « mois choisis », la liste de mois ne sert pas.
    jour: v.versement === 'avecPaie' ? null : v.jour,
    mois: v.frequence === 'moisChoisis' ? v.mois : [],
  }))
export type SaisieSource = z.input<typeof schemaSource>

export interface SourceRevenuDto extends Omit<SourceRevenu, 'montant'> {
  montant: number
  creeLe: string
  equivalentMensuel: number
  /** Prochain versement non reçu, aujourd'hui ou plus tard. */
  prochainVersement: { date: DateCivile; moisVersement: CleMois } | null
  /** Faux quand la source est terminée (fin passée). */
  active: boolean
}

// --- Revenus reçus ---

export const schemaRevenuRecu = z
  .strictObject({
    /** Versement prévu auquel ce revenu répond (source + mois de versement). */
    sourceId: z.string().min(1).nullable().default(null),
    moisOccurrence: schemaCleMois.nullable().default(null),
    date: schemaDateCivile,
    montant,
    libelle: libelle.optional(),
    note: z.string().trim().max(200, 'Note trop longue (200 caractères au plus).').optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.sourceId === null) !== (v.moisOccurrence === null)) {
      ctx.addIssue({ code: 'custom', path: ['moisOccurrence'], message: 'Choisis le versement prévu, ou « autre revenu ».' })
    }
    if (v.sourceId === null && !v.libelle) {
      ctx.addIssue({ code: 'custom', path: ['libelle'], message: 'Libellé obligatoire.' })
    }
  })
export type SaisieRevenuRecu = z.input<typeof schemaRevenuRecu>

export interface RevenuRecuDto extends Omit<RevenuRecu, 'montant'> {
  montant: number
  note: string | null
  creeLe: string
}

// --- Résumé ---

export type TotauxCertitude = ReturnType<typeof totauxParCertitude>

export interface ResumeRevenusDto {
  aujourdhui: DateCivile
  /** Mois budgétaire en cours. */
  moisCourant: CleMois
  /** Aucun contrat : les primes « avec la paie » ne peuvent pas encore être placées. */
  sansContrat: boolean
  /** Somme des équivalents mensuels des sources actives. */
  equivalentMensuel: TotauxCertitude
  /** Versements prévus sur les 12 prochains mois de versement, mois en cours compris. */
  douzeMois: { du: CleMois; au: CleMois; totaux: TotauxCertitude }
  /** Mois budgétaire en cours : prévu par certitude, et réel reçu (sources + revenus libres). */
  moisEnCours: { prevu: TotauxCertitude; recu: Centimes }
  /** Prochains versements non reçus (en retard compris), cinq au plus. */
  prochains: RevenuPrevu[]
}
