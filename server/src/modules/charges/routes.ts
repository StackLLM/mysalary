import { schemaCategorie, schemaCharge, schemaDette, schemaPaiementDette, schemaPonctuel } from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import type { z } from 'zod'
import { valider } from '../../lib/valider'
import { utilisateurDe } from '../../plugins/utilisateurCourant'
import * as depot from './depot'

type AvecId = { Params: { id: string } }

/**
 * Crée les routes CRUD d'une ressource du compte : GET liste, POST, PUT /:id, DELETE /:id.
 * Les écritures renvoient 201 { id } ou 204 ; l'écran relit la liste calculée.
 */
function crud<S extends z.ZodType>(
  app: FastifyInstance,
  chemin: string,
  schema: S,
  actions: {
    lister: (utilisateurId: string) => Promise<unknown>
    creer: (utilisateurId: string, saisie: z.output<S>) => Promise<{ id: string }>
    modifier: (utilisateurId: string, id: string, saisie: z.output<S>) => Promise<void>
    supprimer: (utilisateurId: string, id: string) => Promise<void>
  },
) {
  app.get(chemin, async (requete) => actions.lister(utilisateurDe(requete)))
  app.post(chemin, async (requete, reponse) =>
    reponse.status(201).send(await actions.creer(utilisateurDe(requete), valider(schema, requete.body))),
  )
  app.put<AvecId>(`${chemin}/:id`, async (requete, reponse) => {
    await actions.modifier(utilisateurDe(requete), requete.params.id, valider(schema, requete.body))
    return reponse.status(204).send()
  })
  app.delete<AvecId>(`${chemin}/:id`, async (requete, reponse) => {
    await actions.supprimer(utilisateurDe(requete), requete.params.id)
    return reponse.status(204).send()
  })
}

/** Catégories, charges fixes, enveloppes, ponctuels, dettes (lot 6). */
export async function routesCharges(app: FastifyInstance) {
  const p = app.prisma

  crud(app, '/categories', schemaCategorie, {
    lister: (u) => depot.listerCategories(p, u),
    creer: (u, s) => depot.creerCategorie(p, u, s),
    modifier: (u, id, s) => depot.modifierCategorie(p, u, id, s),
    supprimer: (u, id) => depot.supprimerCategorie(p, u, id),
  })

  // Déclarée avant /charges/:id : c'est une route fixe.
  app.get('/charges/resume', async (requete) => depot.resume(p, utilisateurDe(requete), app.aujourdhui()))

  crud(app, '/charges', schemaCharge, {
    lister: (u) => depot.listerCharges(p, u, app.aujourdhui()),
    creer: (u, s) => depot.creerCharge(p, u, s),
    modifier: (u, id, s) => depot.modifierCharge(p, u, id, s),
    supprimer: (u, id) => depot.supprimerCharge(p, u, id),
  })

  crud(app, '/ponctuels', schemaPonctuel, {
    lister: (u) => depot.listerPonctuels(p, u, app.aujourdhui()),
    creer: (u, s) => depot.creerPonctuel(p, u, s),
    modifier: (u, id, s) => depot.modifierPonctuel(p, u, id, s),
    supprimer: (u, id) => depot.supprimerPonctuel(p, u, id),
  })

  crud(app, '/dettes', schemaDette, {
    lister: (u) => depot.listerDettes(p, u, app.aujourdhui()),
    creer: (u, s) => depot.creerDette(p, u, s),
    modifier: (u, id, s) => depot.modifierDette(p, u, id, s),
    supprimer: (u, id) => depot.supprimerDette(p, u, id),
  })

  app.post<AvecId>('/dettes/:id/paiements', async (requete, reponse) => {
    const saisie = valider(schemaPaiementDette, requete.body)
    return reponse.status(201).send(await depot.ajouterPaiement(p, utilisateurDe(requete), requete.params.id, saisie, app.aujourdhui()))
  })

  app.delete<{ Params: { id: string; paiementId: string } }>('/dettes/:id/paiements/:paiementId', async (requete, reponse) => {
    await depot.supprimerPaiement(p, utilisateurDe(requete), requete.params.id, requete.params.paiementId)
    return reponse.status(204).send()
  })
}
