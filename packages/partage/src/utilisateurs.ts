import { z } from 'zod'

export const DEVISES = ['MAD', 'EUR', 'USD'] as const
export type Devise = (typeof DEVISES)[number]

const prenom = z
  .string({ error: 'Le prénom est obligatoire.' })
  .trim()
  .min(1, 'Le prénom est obligatoire.')
  .max(40, 'Le prénom ne doit pas dépasser 40 caractères.')

/** Identifiant de connexion : sans espaces autour, en minuscules. */
export const email = z
  .string({ error: 'L’e-mail est obligatoire.' })
  .trim()
  .toLowerCase()
  .min(1, 'L’e-mail est obligatoire.')
  .max(254, 'E-mail trop long.')
  .pipe(z.email({ error: 'Cet e-mail n’est pas valide.' }))

/** Mot de passe d'un compte : 8 caractères au moins, sans autre règle imposée. */
export const motDePasse = z
  .string({ error: 'Le mot de passe est obligatoire.' })
  .min(8, 'Au moins 8 caractères.')
  .max(200, 'Au plus 200 caractères.')

/** Mot de passe saisi pour se connecter ou confirmer : seulement non vide (l'ancienne règle peut différer). */
const motDePasseSaisi = z.string({ error: 'Le mot de passe est obligatoire.' }).min(1, 'Le mot de passe est obligatoire.').max(200, 'Au plus 200 caractères.')

export const schemaInscription = z.strictObject({
  prenom,
  email,
  motDePasse,
  devise: z.enum(DEVISES, { error: 'Devise non prise en charge.' }).default('MAD'),
})
export type Inscription = z.input<typeof schemaInscription>

export const schemaConnexion = z.strictObject({ email, motDePasse: motDePasseSaisi })
export type Connexion = z.input<typeof schemaConnexion>

export const schemaOubliMotDePasse = z.strictObject({ email })

/** Nouveau mot de passe avec le jeton reçu par e-mail (réinitialisation ou activation d'un ancien compte). */
export const schemaReinitialisationMotDePasse = z.strictObject({
  jeton: z.string({ error: 'Lien invalide.' }).min(20, 'Lien invalide.').max(200, 'Lien invalide.'),
  motDePasse,
})

export const schemaChangementMotDePasse = z.strictObject({ actuel: motDePasseSaisi, nouveau: motDePasse })

/** Confirmation d'une action lourde (supprimer, réinitialiser) par le mot de passe. */
export const schemaConfirmationMotDePasse = z.strictObject({ motDePasse: motDePasseSaisi })

export const schemaModificationUtilisateur = z.strictObject({ prenom })

export interface Utilisateur {
  id: string
  prenom: string
  /** `null` pour un compte d'avant le lot 23 qui n'a pas encore été activé. */
  email: string | null
  devise: Devise
  onboardingEtape: number
  onboardingTermine: boolean
  creeLe: string
  /** Dernière connexion. */
  derniereOuverture: string | null
}
