import { z } from 'zod'

export const DEVISES = ['MAD', 'EUR', 'USD'] as const
export type Devise = (typeof DEVISES)[number]

const prenom = z
  .string({ error: 'Le prénom est obligatoire.' })
  .trim()
  .min(1, 'Le prénom est obligatoire.')
  .max(40, 'Le prénom ne doit pas dépasser 40 caractères.')

/** Mot de passe d'un compte (lot 22) : 8 caractères au moins, sans autre règle imposée. */
export const motDePasse = z
  .string({ error: 'Le mot de passe est obligatoire.' })
  .min(8, 'Au moins 8 caractères.')
  .max(200, 'Au plus 200 caractères.')

export const schemaCreationUtilisateur = z.strictObject({
  prenom,
  devise: z.enum(DEVISES, { error: 'Devise non prise en charge.' }).default('MAD'),
  /** Facultatif en local ; obligatoire quand le serveur est ouvert au réseau. */
  motDePasse: motDePasse.optional(),
})
export type CreationUtilisateur = z.input<typeof schemaCreationUtilisateur>

export const schemaModificationUtilisateur = z.strictObject({ prenom })
export type ModificationUtilisateur = z.infer<typeof schemaModificationUtilisateur>

export const schemaConnexion = z.strictObject({ motDePasse: z.string({ error: 'Le mot de passe est obligatoire.' }).min(1, 'Le mot de passe est obligatoire.') })

/** Définir ou changer le mot de passe : `actuel` est exigé si le compte en a déjà un. */
export const schemaChangementMotDePasse = z.strictObject({ actuel: z.string().optional(), nouveau: motDePasse })

export interface Utilisateur {
  id: string
  prenom: string
  devise: Devise
  onboardingEtape: number
  onboardingTermine: boolean
  /** Le compte a un mot de passe : il faut se connecter pour l'ouvrir. */
  protege: boolean
  creeLe: string
  /** Dernière fois que le compte a été choisi sur l'écran Profils. */
  derniereOuverture: string | null
}
