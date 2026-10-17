import { z } from 'zod'
import { motDePasseTropCourant } from './motsDePasseCourants'

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

/** Mot de passe d'un compte : 8 caractères au moins, et pas un des mots de passe les plus courants (lot P2). */
export const motDePasse = z
  .string({ error: 'Le mot de passe est obligatoire.' })
  .min(8, 'Au moins 8 caractères.')
  .max(200, 'Au plus 200 caractères.')
  .refine((v) => !motDePasseTropCourant(v), 'Ce mot de passe est trop courant : choisis-en un autre.')

/** Mot de passe saisi pour se connecter ou confirmer : seulement non vide (l'ancienne règle peut différer). */
const motDePasseSaisi = z.string({ error: 'Le mot de passe est obligatoire.' }).min(1, 'Le mot de passe est obligatoire.').max(200, 'Au plus 200 caractères.')

/** Version des conditions d'utilisation et de la politique de confidentialité acceptées à l'inscription (lot P3). */
export const VERSION_CONDITIONS = '2026-10-17'

export const schemaInscription = z.strictObject({
  prenom,
  email,
  motDePasse,
  devise: z.enum(DEVISES, { error: 'Devise non prise en charge.' }).default('MAD'),
  accepteConditions: z.literal(true, { error: 'Accepte les conditions d’utilisation et la politique de confidentialité pour créer ton compte.' }),
})

/** Informations publiques de l'instance (pages légales). */
export interface InfosPubliquesDto {
  /** Adresse de contact du responsable ; absente en local. */
  contact: string | null
}
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

/** Nouvel e-mail de connexion, confirmé par le mot de passe. */
export const schemaChangementEmail = z.strictObject({ email, motDePasse: motDePasseSaisi })

/** Lien de vérification reçu par e-mail (confirmation de l'adresse ou changement d'adresse). */
export const schemaVerificationEmail = z.strictObject({
  jeton: z.string({ error: 'Lien invalide.' }).min(20, 'Lien invalide.').max(200, 'Lien invalide.'),
})

export const schemaModificationUtilisateur = z.strictObject({ prenom })

export interface Utilisateur {
  id: string
  prenom: string
  /** `null` pour un compte d'avant le lot 23 qui n'a pas encore été activé. */
  email: string | null
  /** L'adresse a été confirmée par un lien reçu à cette adresse. */
  emailVerifie: boolean
  devise: Devise
  onboardingEtape: number
  onboardingTermine: boolean
  creeLe: string
  /** Dernière connexion. */
  derniereOuverture: string | null
}

/** Réponse à une demande de changement d'e-mail : l'adresse change quand le lien envoyé à la nouvelle est ouvert. */
export interface DemandeChangementEmail {
  email: string
}
