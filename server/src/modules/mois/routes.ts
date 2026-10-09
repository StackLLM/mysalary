import { ecartJours, semainesDe, type CleMois, type DateCivile } from '@mysalary/moteur'
import { schemaCleMois, schemaCloture, schemaPlageCumul, type MoisBudgetaireDto } from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import { valider } from '../../lib/valider'
import { utilisateurDe } from '../../plugins/utilisateurCourant'
import { chargerCalendrier } from '../salaire/depot'
import * as depot from './depot'

type Charge = Awaited<ReturnType<typeof chargerCalendrier>>

function versDto({ calendrier, debutSemaine }: Charge, cle: CleMois, aujourdhui: DateCivile): MoisBudgetaireDto {
  const mois = calendrier.mois(cle)
  return {
    ...mois,
    mode: calendrier.mode,
    sansContrat: calendrier.sansContrat,
    aujourdhui,
    joursRestants: mois.statut === 'enCours' ? ecartJours(aujourdhui, mois.fin) + 1 : null,
    paie: calendrier.paies.paie(cle),
    semaines: semainesDe(mois, debutSemaine),
  }
}

/** Mois budgétaires : bornes, durée, paie qui les finance, semaines (Plan.md § 7.1). */
export async function routesMois(app: FastifyInstance) {
  app.get('/mois/courant', async (requete) => {
    const aujourdhui = app.aujourdhui()
    const charge = await chargerCalendrier(app.prisma, utilisateurDe(requete), aujourdhui)
    return versDto(charge, charge.calendrier.moisCourant().cle, aujourdhui)
  })

  app.get<{ Params: { cle: string } }>('/mois/:cle', async (requete) => {
    const cle = valider(schemaCleMois, requete.params.cle)
    const aujourdhui = app.aujourdhui()
    return versDto(await chargerCalendrier(app.prisma, utilisateurDe(requete), aujourdhui), cle, aujourdhui)
  })

  // Suivi mensuel (lot 8) : bilan prévu / réel, clôture et réouverture.
  app.get<{ Params: { cle: string } }>('/mois/:cle/bilan', async (requete) =>
    depot.bilan(app.prisma, utilisateurDe(requete), app.aujourdhui(), valider(schemaCleMois, requete.params.cle)),
  )

  // Cumul de mois en mois (lot 13).
  app.get<{ Querystring: { du?: string; au?: string } }>('/cumul', async (requete) => {
    const { du, au } = valider(schemaPlageCumul, { du: requete.query.du, au: requete.query.au })
    return depot.cumul(app.prisma, utilisateurDe(requete), app.aujourdhui(), du, au)
  })

  // Suivi hebdomadaire (lot 9).
  app.get<{ Params: { cle: string } }>('/mois/:cle/semaines', async (requete) =>
    depot.semaines(app.prisma, utilisateurDe(requete), app.aujourdhui(), valider(schemaCleMois, requete.params.cle)),
  )

  app.post<{ Params: { cle: string } }>('/mois/:cle/cloturer', async (requete, reponse) => {
    const cle = valider(schemaCleMois, requete.params.cle)
    const { forcer } = valider(schemaCloture, requete.body ?? {})
    await depot.cloturer(app.prisma, utilisateurDe(requete), app.aujourdhui(), cle, forcer)
    return reponse.status(204).send()
  })

  app.post<{ Params: { cle: string } }>('/mois/:cle/rouvrir', async (requete, reponse) => {
    await depot.rouvrir(app.prisma, utilisateurDe(requete), valider(schemaCleMois, requete.params.cle))
    return reponse.status(204).send()
  })
}
