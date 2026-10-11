import { CODES_ERREUR, schemaExportCompte } from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import { ErreurApi } from '../../lib/erreurs'
import { valider } from '../../lib/valider'
import { exigerAcces } from '../../plugins/session'
import * as depot from './depot'

/** Export, import et réinitialisation d'un compte (lot 20). Par identifiant de compte, comme l'écran Profils. */
export async function routesSauvegarde(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/utilisateurs/:id/export', async (requete) => {
    await exigerAcces(app.prisma, requete, requete.params.id)
    return depot.exporter(app.prisma, requete.params.id, new Date())
  })

  app.post('/utilisateurs/import', { bodyLimit: 50 * 1024 * 1024 }, async (requete, reponse) => {
    if (app.reseau) throw new ErreurApi(422, CODES_ERREUR.REGLE_METIER, 'L’import crée un compte sans mot de passe : fais-le en local.')
    const fichier = valider(schemaExportCompte, requete.body)
    return reponse.status(201).send(await depot.importer(app.prisma, fichier))
  })

  app.post<{ Params: { id: string } }>('/utilisateurs/:id/reinitialiser', async (requete) => {
    await exigerAcces(app.prisma, requete, requete.params.id)
    return depot.reinitialiser(app.prisma, requete.params.id)
  })
}
