import { CODES_ERREUR, schemaConnexion, schemaInscription, schemaOubliMotDePasse, schemaReinitialisationMotDePasse } from '@mysalary/partage'
import { Prisma } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { ErreurApi } from '../../lib/erreurs'
import { creerJetonMotDePasse, lienMotDePasse } from '../../lib/jetons'
import { Limiteur } from '../../lib/limiteur'
import { empreinteJeton, hacher, verifier } from '../../lib/motDePasse'
import { valider } from '../../lib/valider'
import { fermerSession, ouvrirSession, sessionDe } from '../../plugins/session'
import * as comptes from '../utilisateurs/depot'

const QUINZE_MINUTES = 15 * 60 * 1000
const UNE_HEURE = 60 * 60 * 1000

const trop = () => new ErreurApi(429, CODES_ERREUR.TROP_DE_TENTATIVES, 'Trop d’essais. Réessaie dans quelques minutes.')
const refuse = () => new ErreurApi(401, CODES_ERREUR.IDENTIFIANTS_REFUSES, 'E-mail ou mot de passe incorrect.')
const lienInvalide = () => new ErreurApi(400, CODES_ERREUR.LIEN_INVALIDE, 'Ce lien n’est plus valable. Demande-en un nouveau.')

/** Inscription, connexion, déconnexion, session, mot de passe oublié (lot 23). Routes publiques. */
export async function routesAuth(app: FastifyInstance) {
  // Échecs de connexion : 5 par e-mail et 20 par adresse IP en 15 minutes. Mot de passe oublié : 5 par heure et par IP.
  const parEmail = new Limiteur(5, QUINZE_MINUTES)
  const parIp = new Limiteur(20, QUINZE_MINUTES)
  const oublis = new Limiteur(5, UNE_HEURE)
  // Un hash factice : un e-mail inconnu prend le même temps qu'un mauvais mot de passe.
  const leurre = hacher('mot-de-passe-leurre')
  const securise = app.auth.cookieSecurise

  app.post('/auth/inscription', async (requete, reponse) => {
    const donnees = valider(schemaInscription, requete.body)
    try {
      const compte = await comptes.creer(app.prisma, donnees, app.maintenant())
      await ouvrirSession(app.prisma, requete, reponse, compte.id, securise)
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
    if (parEmail.bloque(cleEmail) || parIp.bloque(cleIp)) throw trop()
    const compte = await app.prisma.utilisateur.findUnique({ where: { email } })
    const valide = await verifier(motDePasse, compte?.motDePasse ?? (await leurre))
    if (!compte?.motDePasse || !valide) {
      parEmail.compter(cleEmail)
      parIp.compter(cleIp)
      throw refuse()
    }
    parEmail.effacer(cleEmail)
    await ouvrirSession(app.prisma, requete, reponse, compte.id, securise)
    return comptes.versDto(await app.prisma.utilisateur.update({ where: { id: compte.id }, data: { derniereOuverture: app.maintenant() } }))
  })

  app.post('/auth/deconnexion', async (requete, reponse) => {
    await fermerSession(app.prisma, requete, reponse, securise)
    return reponse.status(204).send()
  })

  // Le compte connecté, ou 401 : l'interface s'en sert pour savoir si la session est ouverte.
  app.get('/auth/session', async (requete) => {
    const id = await sessionDe(app.prisma, requete)
    const compte = id ? await app.prisma.utilisateur.findUnique({ where: { id } }) : null
    if (!compte) throw new ErreurApi(401, CODES_ERREUR.SESSION_REQUISE, 'Connecte-toi pour continuer.')
    return comptes.versDto(compte)
  })

  // Toujours la même réponse, que l'e-mail existe ou non : on ne révèle pas qui a un compte.
  app.post('/auth/mot-de-passe/oubli', async (requete, reponse) => {
    const { email } = valider(schemaOubliMotDePasse, requete.body)
    const cle = `ip:${requete.ip}`
    if (oublis.bloque(cle)) throw trop()
    oublis.compter(cle)
    const compte = await app.prisma.utilisateur.findUnique({ where: { email } })
    if (compte) {
      const jeton = await creerJetonMotDePasse(app.prisma, compte.id, app.maintenant())
      await app.auth.messagerie({
        a: email,
        sujet: 'MySalary : choisis un nouveau mot de passe',
        texte: `Bonjour ${compte.prenom},\n\nPour choisir un nouveau mot de passe, ouvre ce lien (valable 1 heure) :\n${lienMotDePasse(app.auth.urlApplication, jeton)}\n\nSi tu n'as rien demandé, ignore ce message : ton mot de passe ne change pas.`,
      })
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
      app.prisma.jetonMotDePasse.deleteMany({ where: { utilisateurId: lien.utilisateurId } }),
      app.prisma.session.deleteMany({ where: { utilisateurId: lien.utilisateurId } }),
    ])
    return reponse.status(204).send()
  })
}
