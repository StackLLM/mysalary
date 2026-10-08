import { z } from 'zod'

export const DEVISES = ['MAD', 'EUR', 'USD'] as const
export type Devise = (typeof DEVISES)[number]

const prenom = z
  .string({ error: 'Le prénom est obligatoire.' })
  .trim()
  .min(1, 'Le prénom est obligatoire.')
  .max(40, 'Le prénom ne doit pas dépasser 40 caractères.')

export const schemaCreationUtilisateur = z.strictObject({
  prenom,
  devise: z.enum(DEVISES, { error: 'Devise non prise en charge.' }).default('MAD'),
})
export type CreationUtilisateur = z.input<typeof schemaCreationUtilisateur>

export const schemaModificationUtilisateur = z.strictObject({ prenom })
export type ModificationUtilisateur = z.infer<typeof schemaModificationUtilisateur>

export interface Utilisateur {
  id: string
  prenom: string
  devise: Devise
  onboardingEtape: number
  onboardingTermine: boolean
  creeLe: string
  /** Dernière fois que le compte a été choisi sur l'écran Profils. */
  derniereOuverture: string | null
}
