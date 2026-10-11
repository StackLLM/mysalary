import { schemaApercuImport, schemaDecisionImport, schemaEtapeOnboarding } from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import { valider } from '../../lib/valider'
import { utilisateurDe } from '../../plugins/utilisateurCourant'
import * as depot from './depot'

/** Onboarding et import de l'ancienne app (lot 19). */
export async function routesOnboarding(app: FastifyInstance) {
  app.get('/onboarding', async (requete) => depot.lireOnboarding(app.prisma, utilisateurDe(requete)))

  app.put('/onboarding', async (requete, reponse) => {
    await depot.enregistrerEtape(app.prisma, utilisateurDe(requete), valider(schemaEtapeOnboarding, requete.body))
    return reponse.status(204).send()
  })

  // Analyse le fichier : propose des lignes, n'écrit rien dans le plan.
  app.post('/import/apercu', { bodyLimit: 5 * 1024 * 1024 }, async (requete) => {
    const { fichier } = valider(schemaApercuImport, requete.body)
    return depot.apercuImport(app.prisma, utilisateurDe(requete), fichier, app.aujourdhui())
  })

  app.put<{ Params: { id: string } }>('/import/lignes/:id', async (requete) =>
    depot.deciderLigne(app.prisma, utilisateurDe(requete), requete.params.id, valider(schemaDecisionImport, requete.body)),
  )

  app.delete('/import', async (requete, reponse) => {
    await depot.supprimerImport(app.prisma, utilisateurDe(requete))
    return reponse.status(204).send()
  })
}
