import { CODES_ERREUR, schemaConnexion, schemaInscription, schemaOubliMotDePasse, schemaReinitialisationMotDePasse, schemaVerificationEmail } from '@mysalary/partage'
import { Prisma } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { ErreurApi } from '../../lib/erreurs'
import { contexteEnvoi, envoyerAlerteEmailChange, envoyerAlerteMotDePasse, envoyerLienEmail, envoyerLienMotDePasse } from '../../lib/envois'
import { creerJetonMotDePasse } from '../../lib/jetons'
import { erreurPourJournal } from '../../lib/journaux'
import { Limiteur, TropDEssais } from '../../lib/limiteur'
import { empreinteJeton, hacher, verifier } from '../../lib/motDePasse'
import { valider } from '../../lib/valider'
import { fermerSession, ouvrirSession, sessionRenouvelee } from '../../plugins/session'
import * as comptes from '../utilisateurs/depot'

const QUINZE_MINUTES = 15 * 60 * 1000
const UNE_HEURE = 60 * 60 * 1000

const refuse = () => new ErreurApi(401, CODES_ERREUR.IDENTIFIANTS_REFUSES, 'E-mail ou mot de passe incorrect.')
const lienInvalide = () => new ErreurApi(400, CODES_ERREUR.LIEN_INVALIDE, 'Ce lien n’est plus valable. Demande-en un nouveau.')

/** Inscription, connexion, déconnexion, session, mot de passe oublié (lot 23), confirmation de l'e-mail (lot 24). Routes publiques. */
export async function routesAuth(app: FastifyInstance) {
  // Échecs de connexion : 5 par e-mail et 20 par adresse IP en 15 minutes. Mot de passe oublié : 5 par heure et par IP.
  const parEmail = new Limiteur(app.prisma, 'connexion-email', 5, QUINZE_MINUTES, app.maintenant)
  const parIp = new Limiteur(app.prisma, 'connexion-ip', 20, QUINZE_MINUTES, app.maintenant)
  const oublis = new Limiteur(app.prisma, 'oubli-ip', 5, UNE_HEURE, app.maintenant)
  // Un hash factice : un e-mail inconnu prend le même temps qu'un mauvais mot de passe.
  const leurre = hacher('mot-de-passe-leurre')
  const securise = app.auth.cookieSecurise
  /** Un e-mail d'information qui ne part pas n'annule pas l'action déjà faite : il est seulement noté au journal. */
  const alerter = (envoi: () => Promise<void>) => envoi().catch((e) => app.log.error(erreurPourJournal(e, app.production), 'Envoi d’une alerte impossible'))

  app.post('/auth/inscription', async (requete, reponse) => {
    const donnees = valider(schemaInscription, requete.body)
    try {
      const compte = await comptes.creer(app.prisma, donnees, app.maintenant())
      await ouvrirSession(app.prisma, requete, reponse, compte.id, securise)
      // Le compte existe déjà : un envoi raté ne bloque pas l'inscription, le lien se redemande depuis l'app.
      await envoyerLienEmail(contexteEnvoi(app), compte, 'verification', donnees.email).catch((e) => app.log.error(erreurPourJournal(e, app.production), 'Envoi du lien de vérification impossible'))
      return reponse.status(201).send(compte)
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ErreurApi(409, CODES_ERREUR.CONFLIT, 'Un compte existe déjà avec cet e-mail.', { email: 'Un compte existe déjà avec cet e-mail. Connecte-toi.' })
      }
      throw e
    }
  })

  app.post('/auth/connexion', async (requete, reponse) => {
    const { email, motDePasse } = valider(schemaConnexion, requete.body)
    const cleEmail = `email:${email}`
    const cleIp = `ip:${requete.ip}`
    const attente = Math.max(await parEmail.attente(cleEmail), await parIp.attente(cleIp))
    if (attente > 0) throw new TropDEssais(attente)
    const compte = await app.prisma.utilisateur.findUnique({ where: { email } })
    const valide = await verifier(motDePasse, compte?.motDePasse ?? (await leurre))
    if (!compte?.motDePasse || !valide) {
      await parEmail.compter(cleEmail)
      await parIp.compter(cleIp)
      throw refuse()
    }
    await parEmail.effacer(cleEmail)
    await ouvrirSession(app.prisma, requete, reponse, compte.id, securise)
    return comptes.versDto(await app.prisma.utilisateur.update({ where: { id: compte.id }, data: { derniereOuverture: app.maintenant() } }))
  })

  app.post('/auth/deconnexion', async (requete, reponse) => {
    await fermerSession(app.prisma, requete, reponse, securise)
    return reponse.status(204).send()
  })

  // Le compte connecté, ou 401 : l'interface s'en sert pour savoir si la session est ouverte.
  app.get('/auth/session', async (requete, reponse) => {
    const id = await sessionRenouvelee(app.prisma, requete, reponse, securise)
    const compte = id ? await app.prisma.utilisateur.findUnique({ where: { id } }) : null
    if (!compte) throw new ErreurApi(401, CODES_ERREUR.SESSION_REQUISE, 'Connecte-toi pour continuer.')
    return comptes.versDto(compte)
  })

  // Toujours la même réponse, que l'e-mail existe ou non : on ne révèle pas qui a un compte.
  app.post('/auth/mot-de-passe/oubli', async (requete, reponse) => {
    const { email } = valider(schemaOubliMotDePasse, requete.body)
    const cle = `ip:${requete.ip}`
    const attente = await oublis.attente(cle)
    if (attente > 0) throw new TropDEssais(attente, 'Trop de demandes')
    await oublis.compter(cle)
    const compte = await app.prisma.utilisateur.findUnique({ where: { email } })
    if (compte) {
      const jeton = await creerJetonMotDePasse(app.prisma, compte.id, app.maintenant())
      await envoyerLienMotDePasse(contexteEnvoi(app), { prenom: compte.prenom, email }, jeton).catch((e) => app.log.error(erreurPourJournal(e, app.production), 'Envoi du lien de mot de passe impossible'))
    }
    return reponse.status(204).send()
  })

  // Nouveau mot de passe avec le lien reçu : lien à usage unique, toutes les sessions du compte sont fermées.
  app.post('/auth/mot-de-passe/reinitialisation', async (requete, reponse) => {
    const { jeton, motDePasse } = valider(schemaReinitialisationMotDePasse, requete.body)
    const lien = await app.prisma.jetonMotDePasse.findUnique({ where: { id: empreinteJeton(jeton) } })
    if (!lien) throw lienInvalide()
    if (lien.expireLe <= app.maintenant()) {
      await app.prisma.jetonMotDePasse.delete({ where: { id: lien.id } })
      throw lienInvalide()
    }
    await app.prisma.$transaction([
      app.prisma.utilisateur.update({ where: { id: lien.utilisateurId }, data: { motDePasse: await hacher(motDePasse) } }),
      // Le lien est arrivé à l'adresse du compte : c'est aussi une preuve qu'elle est la bonne.
      app.prisma.utilisateur.updateMany({ where: { id: lien.utilisateurId, emailVerifieLe: null }, data: { emailVerifieLe: app.maintenant() } }),
      app.prisma.jetonMotDePasse.deleteMany({ where: { utilisateurId: lien.utilisateurId } }),
      app.prisma.session.deleteMany({ where: { utilisateurId: lien.utilisateurId } }),
    ])
    const compte = await app.prisma.utilisateur.findUnique({ where: { id: lien.utilisateurId } })
    if (compte?.email) await alerter(() => envoyerAlerteMotDePasse(contexteEnvoi(app), { prenom: compte.prenom, email: compte.email! }))
    return reponse.status(204).send()
  })

  // Ouvrir le lien reçu confirme l'adresse, ou la remplace (changement). Public : le lien s'ouvre aussi depuis un autre appareil.
  app.post('/auth/email/verification', async (requete, reponse) => {
    const { jeton } = valider(schemaVerificationEmail, requete.body)
    const lien = await app.prisma.jetonEmail.findUnique({ where: { id: empreinteJeton(jeton) } })
    if (!lien) throw lienInvalide()
    if (lien.expireLe <= app.maintenant()) {
      await app.prisma.jetonEmail.delete({ where: { id: lien.id } })
      throw lienInvalide()
    }
    const compte = await app.prisma.utilisateur.findUnique({ where: { id: lien.utilisateurId } })
    // Une vérification ne vaut que pour l'adresse à laquelle elle a été envoyée.
    if (!compte || (lien.type === 'verification' && compte.email !== lien.email)) throw lienInvalide()
    try {
      await app.prisma.$transaction([
        app.prisma.utilisateur.update({ where: { id: compte.id }, data: { email: lien.email, emailVerifieLe: app.maintenant() } }),
        app.prisma.jetonEmail.deleteMany({ where: { utilisateurId: compte.id } }),
      ])
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ErreurApi(409, CODES_ERREUR.CONFLIT, 'Cette adresse est déjà utilisée par un autre compte.')
      }
      throw e
    }
    // Changement d'adresse : l'ancienne est prévenue, au cas où ce ne serait pas la personne du compte.
    if (lien.type === 'changement' && compte.email && compte.email !== lien.email) {
      const ancienne = compte.email
      await alerter(() => envoyerAlerteEmailChange(contexteEnvoi(app), compte, ancienne, lien.email))
    }
    return reponse.status(204).send()
  })
}
