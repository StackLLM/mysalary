import { schemaCreationUtilisateur, schemaModificationUtilisateur } from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import { valider } from '../../lib/valider'
import * as depot from './depot'

/** Gestion des comptes. Pas d'utilisateur courant requis : c'est l'écran Profils. */
export async function routesUtilisateurs(app: FastifyInstance) {
  app.get('/utilisateurs', async () => depot.lister(app.prisma))

  app.post('/utilisateurs', async (requete, reponse) => {
    const donnees = valider(schemaCreationUtilisateur, requete.body)
    return reponse.status(201).send(await depot.creer(app.prisma, donnees))
  })

  app.post<{ Params: { id: string } }>('/utilisateurs/:id/ouvrir', async (requete) =>
    depot.ouvrir(app.prisma, requete.params.id, new Date()),
  )

  app.put<{ Params: { id: string } }>('/utilisateurs/:id', async (requete) => {
    const { prenom } = valider(schemaModificationUtilisateur, requete.body)
    return depot.renommer(app.prisma, requete.params.id, prenom)
  })

  app.delete<{ Params: { id: string } }>('/utilisateurs/:id', async (requete, reponse) => {
    await depot.supprimer(app.prisma, requete.params.id)
    return reponse.status(204).send()
  })
}
