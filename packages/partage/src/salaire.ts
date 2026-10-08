import {
  CERTITUDES,
  estCleMois,
  estDateCivile,
  REGLES_JOUR_NON_OUVRE,
  type CleMois,
  type DateCivile,
  type MoisBudgetaire,
  type ModePeriode,
  type PaieCalculee,
  type RegleJourNonOuvre,
  type Semaine,
} from '@mysalary/moteur'
import { z } from 'zod'

export { CERTITUDES, REGLES_JOUR_NON_OUVRE }
export type { Certitude, CleMois, DateCivile, LignePaie, RegleJourNonOuvre, StatutPaie } from '@mysalary/moteur'

/** Montant maximal accepté : 10 millions de DH, en centimes. */
const MAXIMUM = 1_000_000_000

export const schemaCleMois = z
  .string({ error: 'Mois attendu (AAAA-MM).' })
  .refine((v) => estCleMois(v), 'Mois attendu (AAAA-MM).')
  .transform((v) => v as CleMois)

export const schemaDateCivile = z
  .string({ error: 'Date attendue (AAAA-MM-JJ).' })
  .refine((v) => estDateCivile(v), 'Date invalide.')
  .transform((v) => v as DateCivile)

const montant = (message: string, minimum = 1) =>
  z
    .number({ error: message })
    .int('Montant en centimes entiers attendu.')
    .min(minimum, message)
    .max(MAXIMUM, 'Montant trop élevé.')

// --- Contrat de salaire ---

export const schemaContrat = z.strictObject({
  moisEffet: schemaCleMois,
  montantNet: montant('Entre un salaire supérieur à 0.'),
  jourHabituel: z
    .number({ error: 'Jour de paie attendu.' })
    .int()
    .min(1, 'Le jour de paie va de 1 à 31.')
    .max(31, 'Le jour de paie va de 1 à 31.'),
  regleJourNonOuvre: z.enum(REGLES_JOUR_NON_OUVRE, { error: 'Règle inconnue.' }).default('apres'),
  financeMoisSuivant: z.boolean({ error: 'Valeur oui / non attendue.' }).default(true),
})
export type SaisieContrat = z.input<typeof schemaContrat>

export const schemaModificationContrat = schemaContrat
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Aucune modification.')

export interface VersionContratDto {
  id: string
  moisEffet: CleMois
  montantNet: number
  jourHabituel: number
  regleJourNonOuvre: RegleJourNonOuvre
  financeMoisSuivant: boolean
  creeLe: string
}

// --- Primes prévues sur une paie ---

const libelle = z
  .string({ error: 'Libellé obligatoire.' })
  .trim()
  .min(1, 'Libellé obligatoire.')
  .max(60, 'Libellé trop long (60 caractères au plus).')

export const schemaPrimePrevue = z.strictObject({
  libelle,
  certitude: z.enum(CERTITUDES, { error: 'Certitude inconnue.' }),
  montantPrevu: montant('Entre une prime supérieure à 0.'),
})

export const schemaPrimesPaie = z.strictObject({
  primes: z.array(schemaPrimePrevue).max(20, '20 primes au plus.'),
})
export type SaisiePrimesPaie = z.input<typeof schemaPrimesPaie>

// --- Réception d'une paie ---

export const schemaReception = z.strictObject({
  dateReelle: schemaDateCivile,
  salaireRecu: montant('Entre le salaire reçu (0 ou plus).', 0),
  /**
   * Primes reçues. `id` = prime prévue sur cette paie ; `sourceId` = prime d'une source ; sinon prime imprévue.
   * Une prime prévue absente de la liste est comptée comme non reçue (0).
   */
  primes: z
    .array(
      z.strictObject({
        id: z.string().optional(),
        /** Prime d'une source de revenus versée avec la paie (lot 5). */
        sourceId: z.string().optional(),
        libelle,
        certitude: z.enum(CERTITUDES).default('garanti'),
        montantRecu: montant('Entre le montant reçu (0 ou plus).', 0),
      }),
    )
    .max(20, '20 primes au plus.')
    .default([]),
})
export type SaisieReception = z.input<typeof schemaReception>

export const schemaPlageMois = z
  .strictObject({ du: schemaCleMois, au: schemaCleMois })
  .refine((v) => v.du <= v.au, { message: 'Le début doit précéder la fin.', path: ['au'] })

/** Plage maximale de `GET /salaire/paies`. */
export const PLAGE_MAXIMALE_MOIS = 36

export type PaieDto = PaieCalculee

export interface MoisBudgetaireDto extends MoisBudgetaire {
  mode: ModePeriode
  /** Cycle de paie choisi mais aucun contrat : les mois sont civils en attendant. */
  sansContrat: boolean
  aujourdhui: DateCivile
  /** Jours restants, aujourd'hui compris (mois en cours seulement). */
  joursRestants: number | null
  paie: PaieDto | null
  semaines: Semaine[]
}
