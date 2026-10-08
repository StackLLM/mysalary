import type { CleMois, DateCivile, Depense, Imputation, LigneAPayer, PaiementDette, StatutPeriode, SuiviDuMois, SuiviEnveloppe } from '@mysalary/moteur'
import { z } from 'zod'
import { schemaMontantPositif, schemaNote } from './charges'
import { schemaDateCivile } from './salaire'

export type { Imputation, LigneAPayer, StatutCouverture, SuiviEnveloppe } from '@mysalary/moteur'

const identifiant = z.string().min(1).nullable().default(null)

/** Dépense réelle (R10) : liée à une charge fixe (avec l'échéance couverte), une enveloppe, un ponctuel, ou hors plan. */
export const schemaDepense = z
  .strictObject({
    date: schemaDateCivile,
    montant: schemaMontantPositif,
    categorieId: z.string({ error: 'Choisis une catégorie.' }).min(1, 'Choisis une catégorie.'),
    libelle: z.string().trim().max(60, 'Libellé trop long (60 caractères au plus).').default(''),
    note: schemaNote,
    chargeId: identifiant,
    echeance: schemaDateCivile.nullable().default(null),
    ponctuelId: identifiant,
  })
  .refine((v) => !(v.chargeId && v.ponctuelId), { path: ['chargeId'], message: 'Une dépense se rattache à une seule ligne du plan.' })
  .refine((v) => !v.echeance || v.chargeId, { path: ['echeance'], message: 'Une échéance se rattache à une charge.' })
export type SaisieDepense = z.input<typeof schemaDepense>

export interface DepenseDto extends Omit<Depense, 'montant'> {
  montant: number
  note: string | null
  creeLe: string
  imputation: Imputation
  /** Libellé de la ligne du plan couverte ; `null` hors plan. */
  ligne: string | null
}

export interface PaiementDuMoisDto extends Omit<PaiementDette, 'montant'> {
  montant: number
  /** Libellé de la dette. */
  libelle: string
}

/** Écran Mois › Dépenses : le réel du mois et ce qui reste prévu, toujours séparés. */
export interface SuiviDepensesDto extends Omit<SuiviDuMois, 'depenses' | 'paiementsDettes'> {
  aujourdhui: DateCivile
  mois: { cle: CleMois; debut: DateCivile; fin: DateCivile; nbJours: number; statut: StatutPeriode }
  depenses: DepenseDto[]
  paiementsDettes: PaiementDuMoisDto[]
}

export interface RattachementsDto {
  mois: CleMois
  lignes: LigneAPayer[]
  enveloppes: SuiviEnveloppe[]
}
