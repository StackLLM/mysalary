import { schemaApplication, schemaExecution, schemaScenario } from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import { valider } from '../../lib/valider'
import { utilisateurDe } from '../../plugins/utilisateurCourant'
import * as depot from './depot'

type AvecId = { Params: { id: string } }

/** Simulateur et scénarios (lot 11). */
export async function routesSimulation(app: FastifyInstance) {
  const p = app.prisma

  app.post('/simulations/executer', async (requete) => depot.executer(p, utilisateurDe(requete), app.aujourdhui(), valider(schemaExecution, requete.body ?? {})))
  app.post('/simulations/appliquer', async (requete) =>
    depot.appliquer(p, utilisateurDe(requete), app.aujourdhui(), valider(schemaApplication, requete.body).ajustements),
  )

  app.get('/scenarios', async (requete) => depot.lister(p, utilisateurDe(requete)))
  app.post('/scenarios', async (requete, reponse) => reponse.status(201).send(await depot.creer(p, utilisateurDe(requete), valider(schemaScenario, requete.body))))
  app.put<AvecId>('/scenarios/:id', async (requete, reponse) => {
    await depot.modifier(p, utilisateurDe(requete), requete.params.id, valider(schemaScenario, requete.body))
    return reponse.status(204).send()
  })
  app.delete<AvecId>('/scenarios/:id', async (requete, reponse) => {
    await depot.supprimer(p, utilisateurDe(requete), requete.params.id)
    return reponse.status(204).send()
  })
}
