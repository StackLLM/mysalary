import { schemaCleMois, schemaDateCivile, schemaDepense } from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import { valider } from '../../lib/valider'
import { utilisateurDe } from '../../plugins/utilisateurCourant'
import * as depot from './depot'

type AvecId = { Params: { id: string } }

/** Dépenses réelles et leur rattachement au plan (lot 7). */
export async function routesDepenses(app: FastifyInstance) {
  const p = app.prisma

  app.get<{ Querystring: { mois?: string } }>('/depenses', async (requete) => {
    const mois = requete.query.mois ? valider(schemaCleMois, requete.query.mois) : undefined
    return depot.suivi(p, utilisateurDe(requete), app.aujourdhui(), mois)
  })

  app.get<{ Querystring: { date?: string } }>('/depenses/rattachements', async (requete) => {
    const date = valider(schemaDateCivile, requete.query.date)
    return depot.rattachements(p, utilisateurDe(requete), app.aujourdhui(), date)
  })

  app.post('/depenses', async (requete, reponse) =>
    reponse.status(201).send(await depot.creerDepense(p, utilisateurDe(requete), valider(schemaDepense, requete.body), app.aujourdhui())),
  )

  app.put<AvecId>('/depenses/:id', async (requete, reponse) => {
    await depot.modifierDepense(p, utilisateurDe(requete), requete.params.id, valider(schemaDepense, requete.body), app.aujourdhui())
    return reponse.status(204).send()
  })

  app.delete<AvecId>('/depenses/:id', async (requete, reponse) => {
    await depot.supprimerDepense(p, utilisateurDe(requete), requete.params.id)
    return reponse.status(204).send()
  })
}
