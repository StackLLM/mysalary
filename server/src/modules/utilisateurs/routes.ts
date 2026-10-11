import { CODES_ERREUR, schemaCreationUtilisateur, schemaModificationUtilisateur } from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import { ErreurApi } from '../../lib/erreurs'
import { valider } from '../../lib/valider'
import { exigerAcces, ouvrirSession } from '../../plugins/session'
import * as depot from './depot'

/** Gestion des comptes. Pas d'utilisateur courant requis : c'est l'écran Profils. */
export async function routesUtilisateurs(app: FastifyInstance) {
  app.get('/utilisateurs', async () => depot.lister(app.prisma))

  app.post('/utilisateurs', async (requete, reponse) => {
    const donnees = valider(schemaCreationUtilisateur, requete.body)
    if (app.reseau && !donnees.motDePasse) throw new ErreurApi(400, CODES_ERREUR.VALIDATION, 'Un mot de passe est obligatoire.', { motDePasse: 'Un mot de passe est obligatoire.' })
    const compte = await depot.creer(app.prisma, donnees)
    // Le compte vient d'être créé avec son mot de passe : il reste ouvert pour son créateur.
    if (donnees.motDePasse) await ouvrirSession(app.prisma, requete, reponse, compte.id)
    return reponse.status(201).send(compte)
  })

  app.post<{ Params: { id: string } }>('/utilisateurs/:id/ouvrir', async (requete) => {
    await exigerAcces(app.prisma, requete, requete.params.id)
    return depot.ouvrir(app.prisma, requete.params.id, new Date())
  })

  app.put<{ Params: { id: string } }>('/utilisateurs/:id', async (requete) => {
    const { prenom } = valider(schemaModificationUtilisateur, requete.body)
    await exigerAcces(app.prisma, requete, requete.params.id)
    return depot.renommer(app.prisma, requete.params.id, prenom)
  })

  app.delete<{ Params: { id: string } }>('/utilisateurs/:id', async (requete, reponse) => {
    await exigerAcces(app.prisma, requete, requete.params.id)
    await depot.supprimer(app.prisma, requete.params.id)
    return reponse.status(204).send()
  })
}
