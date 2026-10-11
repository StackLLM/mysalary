import { schemaExportCompte } from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import { valider } from '../../lib/valider'
import * as depot from './depot'

/** Export, import et réinitialisation d'un compte (lot 20). Par identifiant de compte, comme l'écran Profils. */
export async function routesSauvegarde(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/utilisateurs/:id/export', async (requete) => depot.exporter(app.prisma, requete.params.id, new Date()))

  app.post('/utilisateurs/import', { bodyLimit: 50 * 1024 * 1024 }, async (requete, reponse) => {
    const fichier = valider(schemaExportCompte, requete.body)
    return reponse.status(201).send(await depot.importer(app.prisma, fichier))
  })

  app.post<{ Params: { id: string } }>('/utilisateurs/:id/reinitialiser', async (requete) => depot.reinitialiser(app.prisma, requete.params.id))
}
