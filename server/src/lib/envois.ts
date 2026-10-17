import type { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { composer } from './gabarits'
import { creerJetonEmail, DUREE_LIEN_MS, lienEmail, lienMotDePasse, type TypeLienEmail } from './jetons'
import type { Messagerie } from './messagerie'

export interface Envoi {
  prisma: PrismaClient
  messagerie: Messagerie
  urlApplication: string
  maintenant: Date
  contact: string | null
}

/** Que faire si ce n'est pas toi : écrire au contact s'il est configuré, sinon changer de mot de passe. */
const siCeNEstPasToi = (contact: string | null) =>
  contact ? `Si ce n’est pas toi, écris-nous tout de suite à ${contact}.` : 'Si ce n’est pas toi, choisis tout de suite un nouveau mot de passe depuis la page de connexion.'

/** E-mail « confirme ton adresse » (inscription, renvoi) ou « confirme ta nouvelle adresse » (changement), envoyé à `email`. */
export async function envoyerLienEmail({ prisma, messagerie, urlApplication, maintenant }: Envoi, compte: { id: string; prenom: string }, type: TypeLienEmail, email: string) {
  const jeton = await creerJetonEmail(prisma, compte.id, type, email, maintenant)
  const lien = lienEmail(urlApplication, jeton)
  const changement = type === 'changement'
  const { texte, html } = composer({
    titre: changement ? 'Confirme ta nouvelle adresse' : 'Confirme ton adresse e-mail',
    paragraphes: [
      `Bonjour ${compte.prenom},`,
      changement
        ? 'Ouvre ce lien pour utiliser cette adresse comme identifiant de connexion. Il est valable 24 heures. Tant que tu ne l’ouvres pas, ton adresse actuelle reste la bonne.'
        : 'Ouvre ce lien pour confirmer cette adresse. Elle te sert à te connecter et à retrouver ton compte si tu oublies ton mot de passe. Il est valable 24 heures.',
    ],
    bouton: { libelle: changement ? 'Confirmer la nouvelle adresse' : 'Confirmer mon adresse', lien },
    pied: changement ? 'Si tu n’as rien demandé, ignore ce message : rien ne change.' : 'Si tu n’as pas créé de compte MySalary, ignore ce message.',
  })
  await messagerie({ a: email, sujet: changement ? 'MySalary : confirme ta nouvelle adresse' : 'MySalary : confirme ton adresse e-mail', texte, html })
}

/** E-mail « mot de passe oublié ». */
export async function envoyerLienMotDePasse({ messagerie, urlApplication }: Envoi, compte: { prenom: string; email: string }, jeton: string) {
  const { texte, html } = composer({
    titre: 'Choisis un nouveau mot de passe',
    paragraphes: [`Bonjour ${compte.prenom},`, `Ouvre ce lien pour choisir un nouveau mot de passe. Il est valable ${DUREE_LIEN_MS / 3_600_000} heure et ne sert qu’une fois.`],
    bouton: { libelle: 'Choisir un mot de passe', lien: lienMotDePasse(urlApplication, jeton) },
    pied: 'Si tu n’as rien demandé, ignore ce message : ton mot de passe ne change pas.',
  })
  await messagerie({ a: compte.email, sujet: 'MySalary : choisis un nouveau mot de passe', texte, html })
}

/** Alerte à l'ancienne adresse : l'e-mail de connexion vient de changer (lot P3). Sans lien : l'ancienne adresse n'ouvre plus le compte. */
export async function envoyerAlerteEmailChange({ messagerie, contact }: Envoi, compte: { prenom: string }, ancienne: string, nouvelle: string) {
  const { texte, html } = composer({
    titre: 'Ton adresse de connexion a changé',
    paragraphes: [`Bonjour ${compte.prenom},`, `Ton compte MySalary se connecte désormais avec ${nouvelle}. Cette adresse-ci (${ancienne}) ne sert plus pour ce compte.`],
    pied: siCeNEstPasToi(contact),
  })
  await messagerie({ a: ancienne, sujet: 'MySalary : ton adresse de connexion a changé', texte, html })
}

/** Alerte après un changement de mot de passe, depuis les Réglages ou par un lien « mot de passe oublié » (lot P3). */
export async function envoyerAlerteMotDePasse({ messagerie, urlApplication, contact }: Envoi, compte: { prenom: string; email: string }) {
  const { texte, html } = composer({
    titre: 'Ton mot de passe a changé',
    paragraphes: [`Bonjour ${compte.prenom},`, 'Le mot de passe de ton compte MySalary vient d’être changé. Pour ta sécurité, tes autres appareils ont été déconnectés.'],
    bouton: { libelle: 'Choisir un autre mot de passe', lien: `${urlApplication.replace(/\/$/, '')}/mot-de-passe/oubli` },
    pied: siCeNEstPasToi(contact),
  })
  await messagerie({ a: compte.email, sujet: 'MySalary : ton mot de passe a changé', texte, html })
}

/** Confirmation de la suppression du compte : plus aucune donnée n'est gardée (lot P3). */
export async function envoyerConfirmationSuppression({ messagerie, contact }: Envoi, compte: { prenom: string; email: string }) {
  const { texte, html } = composer({
    titre: 'Ton compte est supprimé',
    paragraphes: [`Bonjour ${compte.prenom},`, 'Ton compte MySalary et toutes ses données (salaire, charges, dépenses, épargne, objectifs) ont été effacés définitivement. Nous ne gardons rien.'],
    pied: contact ? `Une question ? Écris-nous à ${contact}.` : 'Merci d’avoir utilisé MySalary.',
  })
  await messagerie({ a: compte.email, sujet: 'MySalary : ton compte est supprimé', texte, html })
}

/** Les outils d'envoi de l'app courante. */
export const contexteEnvoi = (app: FastifyInstance): Envoi => ({
  prisma: app.prisma,
  messagerie: app.auth.messagerie,
  urlApplication: app.auth.urlApplication,
  maintenant: app.maintenant(),
  contact: app.auth.contact ?? null,
})
