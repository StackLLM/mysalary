import {
  schemaCompteEpargne,
  schemaMouvementEpargne,
  schemaObjectif,
  schemaOrdreObjectifs,
  schemaRealisation,
  schemaStatutObjectif,
} from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import { valider } from '../../lib/valider'
import { utilisateurDe } from '../../plugins/utilisateurCourant'
import * as depot from './depot'

type AvecId = { Params: { id: string } }

/** Épargne et objectifs (lot 10). */
export async function routesEpargne(app: FastifyInstance) {
  const p = app.prisma

  app.get('/epargne', async (requete) => depot.lireEpargne(p, utilisateurDe(requete), app.aujourdhui()))

  app.post('/epargne/comptes', async (requete, reponse) =>
    reponse.status(201).send(await depot.creerCompte(p, utilisateurDe(requete), valider(schemaCompteEpargne, requete.body), app.aujourdhui())),
  )
  app.put<AvecId>('/epargne/comptes/:id', async (requete, reponse) => {
    await depot.modifierCompte(p, utilisateurDe(requete), requete.params.id, valider(schemaCompteEpargne, requete.body), app.aujourdhui())
    return reponse.status(204).send()
  })
  app.delete<AvecId>('/epargne/comptes/:id', async (requete, reponse) => {
    await depot.supprimerCompte(p, utilisateurDe(requete), requete.params.id)
    return reponse.status(204).send()
  })

  app.post('/epargne/mouvements', async (requete, reponse) =>
    reponse.status(201).send(await depot.creerMouvement(p, utilisateurDe(requete), valider(schemaMouvementEpargne, requete.body), app.aujourdhui())),
  )
  app.delete<AvecId>('/epargne/mouvements/:id', async (requete, reponse) => {
    await depot.supprimerMouvement(p, utilisateurDe(requete), requete.params.id)
    return reponse.status(204).send()
  })

  app.get('/objectifs', async (requete) => depot.lister(p, utilisateurDe(requete), app.aujourdhui()))
  app.post('/objectifs', async (requete, reponse) => reponse.status(201).send(await depot.creer(p, utilisateurDe(requete), valider(schemaObjectif, requete.body))))
  app.post<{ Querystring: { remplace?: string } }>('/objectifs/apercu', async (requete) =>
    depot.apercu(p, utilisateurDe(requete), valider(schemaObjectif, requete.body), app.aujourdhui(), requete.query.remplace),
  )
  app.put('/objectifs/ordre', async (requete, reponse) => {
    await depot.ordonner(p, utilisateurDe(requete), valider(schemaOrdreObjectifs, requete.body))
    return reponse.status(204).send()
  })
  app.get<AvecId>('/objectifs/:id', async (requete) => depot.detail(p, utilisateurDe(requete), requete.params.id, app.aujourdhui()))
  app.put<AvecId>('/objectifs/:id', async (requete, reponse) => {
    await depot.modifier(p, utilisateurDe(requete), requete.params.id, valider(schemaObjectif, requete.body))
    return reponse.status(204).send()
  })
  app.delete<AvecId>('/objectifs/:id', async (requete, reponse) => {
    await depot.supprimer(p, utilisateurDe(requete), requete.params.id)
    return reponse.status(204).send()
  })
  app.post<AvecId>('/objectifs/:id/statut', async (requete, reponse) => {
    await depot.changerStatut(p, utilisateurDe(requete), requete.params.id, valider(schemaStatutObjectif, requete.body))
    return reponse.status(204).send()
  })
  app.post<AvecId>('/objectifs/:id/realiser', async (requete, reponse) => {
    await depot.realiser(p, utilisateurDe(requete), requete.params.id, valider(schemaRealisation, requete.body), app.aujourdhui())
    return reponse.status(204).send()
  })
}
