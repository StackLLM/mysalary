import { ecartMois } from '@mysalary/moteur'
import { CODES_ERREUR, PLAGE_MAXIMALE_MOIS, schemaPlageMois, schemaRevenuRecu, schemaSource } from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import { ErreurApi } from '../../lib/erreurs'
import { valider } from '../../lib/valider'
import { utilisateurDe } from '../../plugins/utilisateurCourant'
import * as depot from './depot'

type AvecId = { Params: { id: string } }

/** Autres revenus : sources récurrentes, versements prévus, revenus reçus (lot 5). */
export async function routesRevenus(app: FastifyInstance) {
  app.get('/revenus/sources', async (requete) => depot.listerSources(app.prisma, utilisateurDe(requete), app.aujourdhui()))

  app.post('/revenus/sources', async (requete, reponse) => {
    const saisie = valider(schemaSource, requete.body)
    const id = await depot.creerSource(app.prisma, utilisateurDe(requete), saisie)
    return reponse.status(201).send({ id })
  })

  app.put<AvecId>('/revenus/sources/:id', async (requete, reponse) => {
    const saisie = valider(schemaSource, requete.body)
    await depot.modifierSource(app.prisma, utilisateurDe(requete), requete.params.id, saisie)
    return reponse.status(204).send()
  })

  app.delete<AvecId>('/revenus/sources/:id', async (requete, reponse) => {
    await depot.supprimerSource(app.prisma, utilisateurDe(requete), requete.params.id)
    return reponse.status(204).send()
  })

  app.get('/revenus/prevus', async (requete) => {
    const { du, au } = valider(schemaPlageMois, requete.query)
    if (ecartMois(du, au) >= PLAGE_MAXIMALE_MOIS) {
      throw new ErreurApi(400, CODES_ERREUR.VALIDATION, `${PLAGE_MAXIMALE_MOIS} mois au plus par demande.`, { au: 'Plage trop longue.' })
    }
    return depot.revenusPrevus(app.prisma, utilisateurDe(requete), du, au, app.aujourdhui())
  })

  app.get('/revenus/resume', async (requete) => depot.resume(app.prisma, utilisateurDe(requete), app.aujourdhui()))

  app.get('/revenus/recus', async (requete) => depot.listerRecus(app.prisma, utilisateurDe(requete)))

  app.post('/revenus/recus', async (requete, reponse) => {
    const saisie = valider(schemaRevenuRecu, requete.body)
    return reponse.status(201).send(await depot.creerRecu(app.prisma, utilisateurDe(requete), saisie, app.aujourdhui()))
  })

  app.put<AvecId>('/revenus/recus/:id', async (requete) => {
    const saisie = valider(schemaRevenuRecu, requete.body)
    return depot.modifierRecu(app.prisma, utilisateurDe(requete), requete.params.id, saisie, app.aujourdhui())
  })

  app.delete<AvecId>('/revenus/recus/:id', async (requete, reponse) => {
    await depot.supprimerRecu(app.prisma, utilisateurDe(requete), requete.params.id)
    return reponse.status(204).send()
  })
}
