import { CODES_ERREUR, type DemandeChangementEmail, schemaChangementEmail, schemaChangementMotDePasse, schemaConfirmationMotDePasse, schemaExportCompte, schemaModificationUtilisateur } from '@mysalary/partage'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { ErreurApi, introuvable } from '../../lib/erreurs'
import { contexteEnvoi, envoyerAlerteMotDePasse, envoyerConfirmationSuppression, envoyerLienEmail } from '../../lib/envois'
import { erreurPourJournal } from '../../lib/journaux'
import { Limiteur, TropDEssais } from '../../lib/limiteur'
import { hacher, verifier } from '../../lib/motDePasse'
import { valider } from '../../lib/valider'
import { fermerSession, fermerToutesLesSessions, ouvrirSession } from '../../plugins/session'
import { utilisateurDe } from '../../plugins/utilisateurCourant'
import * as sauvegarde from '../sauvegarde/depot'
import * as comptes from '../utilisateurs/depot'

/** Le compte connecté (lot 23) : prénom, e-mail (changement confirmé par un lien), mot de passe, export, restauration, réinitialisation, suppression. */
export async function routesCompte(app: FastifyInstance) {
  const essais = new Limiteur(app.prisma, 'confirmation-compte', 5, 15 * 60 * 1000, app.maintenant)
  const securise = app.auth.cookieSecurise
  // Envois de liens e-mail : 3 par heure et par compte, pour ne pas faire de l'app un moyen d'inonder une boîte.
  const envois = new Limiteur(app.prisma, 'envoi-lien', 3, 60 * 60 * 1000, app.maintenant)
  const envoiImpossible = () => new ErreurApi(502, CODES_ERREUR.INTERNE, 'Le message n’a pas pu partir. Réessaie dans quelques minutes.')

  async function envoyer(compte: { id: string; prenom: string }, type: 'verification' | 'changement', email: string) {
    const attente = await envois.attente(compte.id)
    if (attente > 0) throw new TropDEssais(attente, 'Trop d’envois')
    await envois.compter(compte.id)
    await envoyerLienEmail(contexteEnvoi(app), compte, type, email).catch((e) => {
      app.log.error(erreurPourJournal(e, app.production), 'Envoi du lien e-mail impossible')
      throw envoiImpossible()
    })
  }

  /** Un e-mail d'information qui ne part pas n'annule pas l'action déjà faite : il est seulement noté au journal. */
  const alerter = (envoi: () => Promise<void>) => envoi().catch((e) => app.log.error(erreurPourJournal(e, app.production), 'Envoi d’une alerte impossible'))

  /** Les actions lourdes redemandent le mot de passe ; 5 erreurs bloquent un quart d'heure. */
  async function confirmer(requete: FastifyRequest, motDePasse: string) {
    const id = utilisateurDe(requete)
    const attente = await essais.attente(id)
    if (attente > 0) throw new TropDEssais(attente)
    const compte = await app.prisma.utilisateur.findUnique({ where: { id } })
    if (!compte) throw introuvable('Compte')
    if (!compte.motDePasse || !(await verifier(motDePasse, compte.motDePasse))) {
      await essais.compter(id)
      throw new ErreurApi(401, CODES_ERREUR.IDENTIFIANTS_REFUSES, 'Mot de passe incorrect.', { motDePasse: 'Mot de passe incorrect.' })
    }
    await essais.effacer(id)
    return compte
  }

  app.put('/compte', async (requete) => {
    const { prenom } = valider(schemaModificationUtilisateur, requete.body)
    return comptes.renommer(app.prisma, utilisateurDe(requete), prenom)
  })

  // Changer d'e-mail : mot de passe exigé, adresse libre. L'adresse ne change qu'à l'ouverture du lien envoyé à la nouvelle.
  app.put('/compte/email', async (requete, reponse) => {
    const { email, motDePasse } = valider(schemaChangementEmail, requete.body)
    const compte = await confirmer(requete, motDePasse)
    if (email === compte.email) throw new ErreurApi(422, CODES_ERREUR.REGLE_METIER, 'C’est déjà ton e-mail.', { email: 'C’est déjà ton e-mail.' })
    if (await app.prisma.utilisateur.findUnique({ where: { email } })) {
      throw new ErreurApi(409, CODES_ERREUR.CONFLIT, 'Un compte existe déjà avec cet e-mail.', { email: 'Un compte existe déjà avec cet e-mail.' })
    }
    await envoyer(compte, 'changement', email)
    const reponseDemande: DemandeChangementEmail = { email }
    return reponse.status(202).send(reponseDemande)
  })

  // Renvoie le lien de confirmation de l'adresse actuelle.
  app.post('/compte/email/renvoi', async (requete, reponse) => {
    const compte = await app.prisma.utilisateur.findUnique({ where: { id: utilisateurDe(requete) } })
    if (!compte?.email) throw introuvable('Adresse e-mail')
    if (compte.emailVerifieLe) throw new ErreurApi(409, CODES_ERREUR.CONFLIT, 'Ton e-mail est déjà confirmé.')
    await envoyer(compte, 'verification', compte.email)
    return reponse.status(204).send()
  })

  // Changer de mot de passe ferme toutes les autres sessions ; celle-ci est renouvelée.
  app.put('/compte/mot-de-passe', async (requete, reponse) => {
    const { actuel, nouveau } = valider(schemaChangementMotDePasse, requete.body)
    const compte = await confirmer(requete, actuel)
    await app.prisma.utilisateur.update({ where: { id: compte.id }, data: { motDePasse: await hacher(nouveau) } })
    await app.prisma.session.deleteMany({ where: { utilisateurId: compte.id } })
    await ouvrirSession(app.prisma, requete, reponse, compte.id, securise)
    if (compte.email) await alerter(() => envoyerAlerteMotDePasse(contexteEnvoi(app), { prenom: compte.prenom, email: compte.email! }))
    return reponse.status(204).send()
  })

  // Se déconnecter de tous les appareils, celui-ci compris (lot P3).
  app.post('/compte/sessions/fermeture', async (requete, reponse) => {
    await fermerToutesLesSessions(app.prisma, reponse, utilisateurDe(requete), securise)
    return reponse.status(204).send()
  })

  app.get('/compte/export', async (requete) => sauvegarde.exporter(app.prisma, utilisateurDe(requete), app.maintenant()))

  app.post('/compte/restauration', { bodyLimit: 50 * 1024 * 1024 }, async (requete) => {
    const fichier = valider(schemaExportCompte, requete.body)
    return sauvegarde.restaurer(app.prisma, utilisateurDe(requete), fichier)
  })

  app.post('/compte/reinitialisation', async (requete) => {
    const { motDePasse } = valider(schemaConfirmationMotDePasse, requete.body)
    await confirmer(requete, motDePasse)
    return sauvegarde.reinitialiser(app.prisma, utilisateurDe(requete))
  })

  app.post('/compte/suppression', async (requete, reponse) => {
    const { motDePasse } = valider(schemaConfirmationMotDePasse, requete.body)
    const compte = await confirmer(requete, motDePasse)
    await comptes.supprimer(app.prisma, compte.id)
    await fermerSession(app.prisma, requete, reponse, securise)
    if (compte.email) await alerter(() => envoyerConfirmationSuppression(contexteEnvoi(app), { prenom: compte.prenom, email: compte.email! }))
    return reponse.status(204).send()
  })
}
