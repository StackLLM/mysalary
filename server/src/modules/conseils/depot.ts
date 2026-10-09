import { alertes, indicateurs, recommandations, type CleMois, type DateCivile } from '@mysalary/moteur'
import { redigerAlerte, redigerRecommandation, type ConseilsDto, type IndicateursDto } from '@mysalary/partage'
import type { PrismaClient } from '@prisma/client'
import { versCharge } from '../charges/conversion'
import { essentielMensuel } from '../charges/depot'
import { bornesFigees } from '../mois/clotures'
import { chargerCalendrier } from '../salaire/depot'

// Toute lecture est filtrée par utilisateurId (isolation, Plan.md § 5.7). Rien n'est écrit ici.

/** Les huit KPI d'un mois (Plan.md § 8) ; le mois en cours par défaut. */
export async function lireIndicateurs(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile, cle?: CleMois): Promise<IndicateursDto> {
  const { calendrier, epargne, debutSemaine, reportHebdo, regles } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
  const mois = cle ?? calendrier.moisCourant().cle
  return { ...indicateurs(calendrier, epargne, mois, { aujourdhui, debutSemaine, report: reportHebdo, regles }), aujourdhui }
}

/** Alertes de la cloche et recommandations, rédigées (Plan.md § 7.5). Les mois clôturés n'alertent plus. */
export async function lireConseils(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile): Promise<ConseilsDto> {
  const [{ calendrier, epargne, debutSemaine, reportHebdo, regles }, charges, clos] = await Promise.all([
    chargerCalendrier(prisma, utilisateurId, aujourdhui),
    prisma.charge.findMany({ where: { utilisateurId } }),
    bornesFigees(prisma, utilisateurId),
  ])
  const options = {
    aujourdhui,
    debutSemaine,
    report: reportHebdo,
    regles,
    moisClos: clos.map((m) => m.cle),
    essentielMensuel: essentielMensuel(charges.map(versCharge), aujourdhui, calendrier.moisCourant().cle),
  }
  return {
    aujourdhui,
    alertes: alertes(calendrier, epargne, options).map(redigerAlerte),
    recommandations: recommandations(calendrier, epargne, options).map(redigerRecommandation),
  }
}
