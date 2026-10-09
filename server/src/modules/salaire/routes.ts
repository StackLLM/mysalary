import { ecartMois } from '@mysalary/moteur'
import {
  CODES_ERREUR,
  PLAGE_MAXIMALE_MOIS,
  schemaCleMois,
  schemaContrat,
  schemaModificationContrat,
  schemaPlageMois,
  schemaPrimesPaie,
  schemaReception,
} from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import { ErreurApi } from '../../lib/erreurs'
import { valider } from '../../lib/valider'
import { utilisateurDe } from '../../plugins/utilisateurCourant'
import { exigerMoisOuvert } from '../mois/clotures'
import * as depot from './depot'

type AvecId = { Params: { id: string } }
type AvecMois = { Params: { mois: string } }

/** Salaire : contrat versionné et paies (Plan.md § 5.8, lot 4). */
export async function routesSalaire(app: FastifyInstance) {
  app.get('/salaire/contrats', async (requete) => depot.listerContrats(app.prisma, utilisateurDe(requete)))

  app.post('/salaire/contrats', async (requete, reponse) => {
    const saisie = valider(schemaContrat, requete.body)
    return reponse.status(201).send(await depot.creerContrat(app.prisma, utilisateurDe(requete), saisie))
  })

  app.put<AvecId>('/salaire/contrats/:id', async (requete) => {
    const modif = valider(schemaModificationContrat, requete.body)
    return depot.modifierContrat(app.prisma, utilisateurDe(requete), requete.params.id, modif)
  })

  app.delete<AvecId>('/salaire/contrats/:id', async (requete, reponse) => {
    await depot.supprimerContrat(app.prisma, utilisateurDe(requete), requete.params.id)
    return reponse.status(204).send()
  })

  app.get('/salaire/paies', async (requete) => {
    const { du, au } = valider(schemaPlageMois, requete.query)
    if (ecartMois(du, au) >= PLAGE_MAXIMALE_MOIS) {
      throw new ErreurApi(400, CODES_ERREUR.VALIDATION, `${PLAGE_MAXIMALE_MOIS} mois au plus par demande.`, { au: 'Plage trop longue.' })
    }
    const aujourdhui = app.aujourdhui()
    const { calendrier } = await depot.chargerCalendrier(app.prisma, utilisateurDe(requete), aujourdhui)
    return { aujourdhui, paies: calendrier.paies.paies(du, au) }
  })

  app.put<AvecMois>('/salaire/paies/:mois/primes', async (requete, reponse) => {
    const mois = valider(schemaCleMois, requete.params.mois)
    const saisie = valider(schemaPrimesPaie, requete.body)
    await exigerMoisOuvert(app.prisma, utilisateurDe(requete), mois)
    await depot.enregistrerPrimes(app.prisma, utilisateurDe(requete), mois, saisie)
    return reponse.status(204).send()
  })

  app.post<AvecMois>('/salaire/paies/:mois/reception', async (requete, reponse) => {
    const mois = valider(schemaCleMois, requete.params.mois)
    const saisie = valider(schemaReception, requete.body)
    await exigerMoisOuvert(app.prisma, utilisateurDe(requete), mois)
    await depot.recevoir(app.prisma, utilisateurDe(requete), mois, saisie, app.aujourdhui())
    return reponse.status(204).send()
  })

  app.delete<AvecMois>('/salaire/paies/:mois/reception', async (requete, reponse) => {
    const mois = valider(schemaCleMois, requete.params.mois)
    await exigerMoisOuvert(app.prisma, utilisateurDe(requete), mois)
    await depot.annulerReception(app.prisma, utilisateurDe(requete), mois)
    return reponse.status(204).send()
  })
}
