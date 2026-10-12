import { CODES_ERREUR, schemaChangementMotDePasse, schemaConfirmationMotDePasse, schemaExportCompte, schemaModificationUtilisateur } from '@mysalary/partage'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { ErreurApi, introuvable } from '../../lib/erreurs'
import { Limiteur } from '../../lib/limiteur'
import { hacher, verifier } from '../../lib/motDePasse'
import { valider } from '../../lib/valider'
import { fermerSession, ouvrirSession } from '../../plugins/session'
import { utilisateurDe } from '../../plugins/utilisateurCourant'
import * as sauvegarde from '../sauvegarde/depot'
import * as comptes from '../utilisateurs/depot'

/** Le compte connecté (lot 23) : prénom, mot de passe, export, restauration, réinitialisation, suppression. */
export async function routesCompte(app: FastifyInstance) {
  const essais = new Limiteur(5, 15 * 60 * 1000)
  const securise = app.auth.cookieSecurise

  /** Les actions lourdes redemandent le mot de passe ; 5 erreurs bloquent un quart d'heure. */
  async function confirmer(requete: FastifyRequest, motDePasse: string) {
    const id = utilisateurDe(requete)
    if (essais.bloque(id)) throw new ErreurApi(429, CODES_ERREUR.TROP_DE_TENTATIVES, 'Trop d’essais. Réessaie dans quelques minutes.')
    const compte = await app.prisma.utilisateur.findUnique({ where: { id } })
    if (!compte) throw introuvable('Compte')
    if (!compte.motDePasse || !(await verifier(motDePasse, compte.motDePasse))) {
      essais.compter(id)
      throw new ErreurApi(401, CODES_ERREUR.IDENTIFIANTS_REFUSES, 'Mot de passe incorrect.', { motDePasse: 'Mot de passe incorrect.' })
    }
    essais.effacer(id)
    return compte
  }

  app.put('/compte', async (requete) => {
    const { prenom } = valider(schemaModificationUtilisateur, requete.body)
    return comptes.renommer(app.prisma, utilisateurDe(requete), prenom)
  })

  // Changer de mot de passe ferme toutes les autres sessions ; celle-ci est renouvelée.
  app.put('/compte/mot-de-passe', async (requete, reponse) => {
    const { actuel, nouveau } = valider(schemaChangementMotDePasse, requete.body)
    const compte = await confirmer(requete, actuel)
    await app.prisma.utilisateur.update({ where: { id: compte.id }, data: { motDePasse: await hacher(nouveau) } })
    await app.prisma.session.deleteMany({ where: { utilisateurId: compte.id } })
    await ouvrirSession(app.prisma, requete, reponse, compte.id, securise)
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
    return reponse.status(204).send()
  })
}
