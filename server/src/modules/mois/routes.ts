import { ecartJours, semainesDe, type CleMois, type DateCivile } from '@mysalary/moteur'
import { schemaCleMois, type MoisBudgetaireDto } from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import { valider } from '../../lib/valider'
import { utilisateurDe } from '../../plugins/utilisateurCourant'
import { chargerCalendrier } from '../salaire/depot'

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
}
