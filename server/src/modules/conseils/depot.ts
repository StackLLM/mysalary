import { alertes, analyser, anneeDesObjectifs, etatEpargne, indicateurs, prochainsJours, recommandations, semainePassee, tableauDeBord, type Calendrier, type CleMois, type DateCivile, type DonneesObjectifs, type ReglesScenarios } from '@mysalary/moteur'
import { redigerAlerte, redigerRecommandation, type AujourdhuiDto, type ConseilsDto, type IndicateursDto, type ResumeObjectifsDto } from '@mysalary/partage'
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
    tableau: tableauDeBord(calendrier, aujourdhui),
    epargne: etatEpargne(epargne),
    objectifs: resumeObjectifs(calendrier, epargne, aujourdhui, regles),
  }
}

/** Mêmes chiffres que la vue annuelle de la page Objectifs (même analyse, même projection). */
function resumeObjectifs(calendrier: Calendrier, donnees: DonneesObjectifs, aujourdhui: DateCivile, regles: ReglesScenarios): ResumeObjectifsDto | null {
  const analyse = analyser(calendrier, donnees, aujourdhui, { regles })
  const annee = anneeDesObjectifs(calendrier, donnees, analyse)
  if (annee.enCours === 0) return null
  const noms = new Map(donnees.objectifs.map((o) => [o.id, o.libelle]))
  return { enCours: annee.enCours, cible: annee.cible, epargne: annee.epargne, progression: annee.progression, aRisque: annee.aRisque.map((id) => noms.get(id)!) }
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
