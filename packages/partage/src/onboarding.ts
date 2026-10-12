import type { LigneImport } from '@mysalary/moteur'
import { z } from 'zod'

export type { DecisionImport, DonneesLigneImport, LigneImport, StatutImport, ThemeImport } from '@mysalary/moteur'

/** Nombre d'étapes de l'onboarding (ux-ui.md (UX) § 4.1). */
export const ETAPES_ONBOARDING = 10

export const schemaEtapeOnboarding = z
  .strictObject({
    etape: z.number({ error: 'Étape attendue.' }).int().min(0).max(ETAPES_ONBOARDING).optional(),
    termine: z.boolean({ error: 'Valeur oui / non attendue.' }).optional(),
  })
  .refine((v) => v.etape !== undefined || v.termine !== undefined, 'Aucune modification.')
export type SaisieOnboarding = z.input<typeof schemaEtapeOnboarding>

/** Fichier déposé : n'importe quel JSON, analysé par le moteur (un fichier inconnu reçoit un message clair). */
export const schemaApercuImport = z.strictObject({ fichier: z.unknown() })

const montantCentimes = z.number({ error: 'Montant attendu.' }).int().min(1, 'Entre un montant supérieur à 0.').max(1_000_000_000, 'Montant trop élevé.')

/** Décision sur une ligne proposée : importer, ignorer, corriger. */
export const schemaDecisionImport = z.strictObject({
  statut: z.enum(['propose', 'importe', 'ignore', 'confirme'], { error: 'Décision inconnue.' }).optional(),
  libelle: z.string().trim().max(60, 'Libellé trop long (60 caractères au plus).').optional(),
  montant: montantCentimes.optional(),
  choix: montantCentimes.nullable().optional(),
  destination: z.enum(['dette', 'aide']).nullable().optional(),
})
export type SaisieDecisionImport = z.input<typeof schemaDecisionImport>

export interface ImportDto {
  type: 'moneyGuruV0'
  importeLe: string
  lignes: LigneImport[]
  /** Ce que le fichier contient mais que MySalary ne reprend pas. */
  nonImportes: string[]
  profil: { prenom: string | null; devise: string | null }
}

export interface OnboardingDto {
  /** 0 = pas commencé ; 1 à 10 = dernière étape atteinte. */
  etape: number
  termine: boolean
  import: ImportDto | null
}
