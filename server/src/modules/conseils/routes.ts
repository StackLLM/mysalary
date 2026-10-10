import { schemaCleMois } from '@mysalary/partage'
import type { FastifyInstance } from 'fastify'
import { valider } from '../../lib/valider'
import { utilisateurDe } from '../../plugins/utilisateurCourant'
import * as depot from './depot'

/** Indicateurs, alertes et recommandations (lot 12) : lecture seule. */
export async function routesConseils(app: FastifyInstance) {
  app.get<{ Querystring: { mois?: string } }>('/indicateurs', async (requete) => {
    const { mois } = requete.query
    return depot.lireIndicateurs(app.prisma, utilisateurDe(requete), app.aujourdhui(), mois === undefined ? undefined : valider(schemaCleMois, mois))
  })
  app.get('/recommandations', async (requete) => depot.lireConseils(app.prisma, utilisateurDe(requete), app.aujourdhui()))
  // Page Aujourd'hui (lot 16).
  app.get('/aujourdhui', async (requete) => depot.lireAujourdhui(app.prisma, utilisateurDe(requete), app.aujourdhui()))
}
