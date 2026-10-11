import { bilanDuMois, calendrierDuMois, cumulDesMois, debutCumul, evenementsDuMois, lireCleMois, resumeCumul, rythmeDuMois, suiviAnnuel, suiviDesSemaines, type CleMois, type DateCivile, type SuiviDesSemaines } from '@mysalary/moteur'
import { CODES_ERREUR, formaterMois, type AnneeDto, type BilanDto, type CalendrierMoisDto, type CumulDto, type EvenementCloture, type SemainesDto, type SuiviAnnuelDto } from '@mysalary/partage'
import type { PrismaClient } from '@prisma/client'
import { ErreurApi } from '../../lib/erreurs'
import { chargerCalendrier } from '../salaire/depot'

// Toute lecture ou écriture est filtrée par utilisateurId (isolation, Plan.md § 5.7).

type Instantane = Omit<BilanDto, 'aujourdhui' | 'cloture' | 'journal' | 'cumul'>

const regle = (message: string) => new ErreurApi(422, CODES_ERREUR.REGLE_METIER, message)

async function journal(prisma: PrismaClient, utilisateurId: string, cle: string): Promise<EvenementCloture[]> {
  const lignes = await prisma.journalCloture.findMany({ where: { utilisateurId, cle }, orderBy: { le: 'desc' } })
  return lignes.map((l) => ({ action: l.action as EvenementCloture['action'], le: l.le.toISOString(), nonConfirmees: l.nonConfirmees }))
}

async function calculer(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile, cle: CleMois): Promise<Instantane & { semaines: SuiviDesSemaines }> {
  const { calendrier, debutSemaine, reportHebdo } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
  return {
    ...bilanDuMois(calendrier, cle),
    rythme: rythmeDuMois(calendrier, cle, aujourdhui, debutSemaine),
    semaines: suiviDesSemaines(calendrier, cle, { debutSemaine, report: reportHebdo, aujourdhui }),
  }
}

/** Bilan du mois : figé s'il est clôturé (R21), sinon calculé. */
export async function bilan(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile, cle: CleMois): Promise<BilanDto> {
  const [cloture, evenements, suite] = await Promise.all([
    prisma.clotureMois.findUnique({ where: { utilisateurId_cle: { utilisateurId, cle } } }),
    journal(prisma, utilisateurId, cle),
    cumul(prisma, utilisateurId, aujourdhui, cle, cle),
  ])
  const { semaines: _semaines, ...contenu }: Instantane & { semaines?: SuiviDesSemaines } = cloture
    ? JSON.parse(cloture.instantane)
    : await calculer(prisma, utilisateurId, aujourdhui, cle)
  return {
    ...contenu,
    // Bilan figé avant le lot 10 : son épargne n'est pas connue.
    epargne: contenu.epargne ?? null,
    aujourdhui,
    cloture: cloture ? { le: cloture.clotureLe.toISOString(), forcee: cloture.forcee, nonConfirmees: cloture.nonConfirmees } : null,
    journal: evenements,
    cumul: suite.mois[0]!,
  }
}

/** Cumul de mois en mois (lot 13) : le reste de chaque mois reporté sur le suivant, du premier mois suivi jusqu'à `au`. */
export async function cumul(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile, du: CleMois, au: CleMois): Promise<CumulDto> {
  const { calendrier, regles, depart } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
  const mois = cumulDesMois(calendrier, du, au, { aujourdhui, regle: regles.realiste, depart })
  return { aujourdhui, debut: debutCumul(calendrier, aujourdhui, depart), depart, mois, resume: resumeCumul(mois) }
}

/** Calendrier de l'année (lot 14) : cumul de janvier à décembre, revenus et charges datés de chaque mois. */
export async function annee(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile, an: number): Promise<AnneeDto> {
  const { calendrier, regles, depart, debutSemaine } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
  const du = lireCleMois(`${an}-01`)
  const mois = cumulDesMois(calendrier, du, lireCleMois(`${an}-12`), { aujourdhui, regle: regles.realiste, depart })
  return {
    aujourdhui,
    annee: an,
    debutSemaine: debutSemaine === 7 ? 7 : 1,
    debut: debutCumul(calendrier, aujourdhui, depart),
    depart,
    mois,
    resume: resumeCumul(mois),
    evenements: Object.fromEntries(mois.map((m) => [m.cle, evenementsDuMois(calendrier, m.cle)])),
  }
}

/** Suivi annuel (lot 18) : les douze mois d'une année, réel à date et projeté restant, objectifs. */
export async function suiviAnnee(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile, an: number): Promise<SuiviAnnuelDto> {
  const { calendrier, epargne, regles, depart } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
  return { ...suiviAnnuel(calendrier, epargne, an, { aujourdhui, regles, depart }), aujourdhui }
}

/** Calendrier d'un mois (lot 17) : ce qui tombe chaque jour, et le solde du mois jour par jour. */
export async function calendrierMois(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile, cle: CleMois): Promise<CalendrierMoisDto> {
  const { calendrier, debutSemaine } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
  return { ...calendrierDuMois(calendrier, cle, aujourdhui), debutSemaine: debutSemaine === 7 ? 7 : 1 }
}

/** Semaines du mois (lot 9) : figées si le mois est clôturé (clôture faite depuis le lot 9), sinon calculées. */
export async function semaines(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile, cle: CleMois): Promise<SemainesDto> {
  const cloture = await prisma.clotureMois.findUnique({ where: { utilisateurId_cle: { utilisateurId, cle } } })
  if (cloture?.semaines) return { ...(JSON.parse(cloture.semaines) as SuiviDesSemaines), aujourdhui, fige: true }
  const { calendrier, debutSemaine, reportHebdo } = await chargerCalendrier(prisma, utilisateurId, aujourdhui)
  return { ...suiviDesSemaines(calendrier, cle, { debutSemaine, report: reportHebdo, aujourdhui }), aujourdhui, fige: false }
}

/** Clôture un mois passé : refus si des lignes ne sont pas confirmées, sauf si l'utilisateur force. */
export async function cloturer(prisma: PrismaClient, utilisateurId: string, aujourdhui: DateCivile, cle: CleMois, forcer: boolean) {
  const nom = formaterMois(cle, { majuscule: true })
  if (await prisma.clotureMois.findUnique({ where: { utilisateurId_cle: { utilisateurId, cle } } })) {
    throw new ErreurApi(409, CODES_ERREUR.CONFLIT, `${nom} est déjà clôturé.`)
  }
  const { semaines: suivi, ...contenu } = await calculer(prisma, utilisateurId, aujourdhui, cle)
  if (contenu.mois.statut !== 'passe') throw regle(`${nom} n’est pas terminé : il se clôture après sa dernière journée.`)
  const nonConfirmees = contenu.aConfirmer.length
  if (nonConfirmees > 0 && !forcer) {
    const quoi = nonConfirmees > 1 ? `${nonConfirmees} lignes ne sont pas confirmées` : '1 ligne n’est pas confirmée'
    throw regle(`${quoi}. Confirme-les ou clôture quand même.`)
  }
  await prisma.$transaction([
    prisma.clotureMois.create({
      data: { utilisateurId, cle, debut: contenu.mois.debut, fin: contenu.mois.fin, instantane: JSON.stringify(contenu), semaines: JSON.stringify(suivi), forcee: nonConfirmees > 0, nonConfirmees },
    }),
    prisma.journalCloture.create({ data: { utilisateurId, cle, action: 'cloture', nonConfirmees } }),
  ])
}

/** Rouvre un mois clôturé : le bilan redevient calculé ; la réouverture est tracée (R22). */
export async function rouvrir(prisma: PrismaClient, utilisateurId: string, cle: CleMois) {
  const cloture = await prisma.clotureMois.findUnique({ where: { utilisateurId_cle: { utilisateurId, cle } } })
  if (!cloture) throw regle(`${formaterMois(cle, { majuscule: true })} n’est pas clôturé.`)
  await prisma.$transaction([
    prisma.clotureMois.delete({ where: { id: cloture.id } }),
    prisma.journalCloture.create({ data: { utilisateurId, cle, action: 'reouverture' } }),
  ])
}
