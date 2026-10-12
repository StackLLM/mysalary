import { alertes, indicateurs, prochainsJours, recommandations, semainePassee, type CleMois, type DateCivile } from '@mysalary/moteur'
import { redigerAlerte, redigerRecommandation, type AujourdhuiDto, type ConseilsDto, type IndicateursDto } from '@mysalary/partage'
import type { PrismaClient } from '@prisma/client'
import { versCharge } from '../charges/conversion'
import { essentielMensuel } from '../charges/depot'
import { bornesFigees } from '../mois/clotures'
import { chargerCalendrier } from '../salaire/depot'

// Toute lecture est filtrée par utilisateurId (isolation, produit.md (Plan) § 5.7). Rien n'est écrit ici.

/** Les huit KPI d'un mois (produit.md (Plan) § 8) ; le mois en cours par défaut. */
export async function lireIndicateurs(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile, cle?: CleMois): Promise<IndicateursDto> {
  const { calendrier, epargne, debutSemaine, reportHebdo, regles } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
  const mois = cle ?? calendrier.moisCourant().cle
  return { ...indicateurs(calendrier, epargne, mois, { aujourdhui, debutSemaine, report: reportHebdo, regles }), aujourdhui }
}

/** Alertes de la cloche et recommandations, rédigées (produit.md (Plan) § 7.5). Les mois clôturés n'alertent plus. */
export async function lireConseils(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile): Promise<ConseilsDto> {
  const { alertes, recommandations } = await calculer(prisma, utilisateurId, aujourdhui)
  return { aujourdhui, alertes, recommandations }
}

/** Page Aujourd'hui (lot 16) : indicateurs du mois en cours, alertes, 3 recommandations, 7 prochains jours, semaine passée. */
export async function lireAujourdhui(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile): Promise<AujourdhuiDto> {
  const c = await calculer(prisma, utilisateurId, aujourdhui)
  const { calendrier, epargne, debutSemaine, reportHebdo, regles } = c.charge
  return {
    aujourdhui,
    sansContrat: calendrier.sansContrat,
    indicateurs: indicateurs(calendrier, epargne, calendrier.moisCourant().cle, { aujourdhui, debutSemaine, report: reportHebdo, regles }),
    alertes: c.alertes,
    recommandations: c.recommandations.slice(0, 3),
    prochainsJours: prochainsJours(calendrier, aujourdhui),
    semainePassee: semainePassee(calendrier, aujourdhui, { debutSemaine, report: reportHebdo }),
  }
}

/** Calendrier chargé une fois, puis alertes et recommandations rédigées. */
async function calculer(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile) {
  const [charge, charges, clos] = await Promise.all([
    chargerCalendrier(prisma, utilisateurId, aujourdhui),
    prisma.charge.findMany({ where: { utilisateurId } }),
    bornesFigees(prisma, utilisateurId),
  ])
  const { calendrier, epargne, debutSemaine, reportHebdo, regles } = charge
  const options = {
    aujourdhui,
    debutSemaine,
    report: reportHebdo,
    regles,
    moisClos: clos.map((m) => m.cle),
    essentielMensuel: essentielMensuel(charges.map(versCharge), aujourdhui, calendrier.moisCourant().cle),
  }
  return {
    charge,
    alertes: alertes(calendrier, epargne, options).map(redigerAlerte),
    recommandations: recommandations(calendrier, epargne, options).map(redigerRecommandation),
  }
}
