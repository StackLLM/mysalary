import { additionner, centimes, soustraire, type Centimes } from './argent'
import { bilanDuMois, rythmeDuMois } from './bilan'
import { decalerMois, ecartJours, ecartMois, moisEntre, type CleMois, type DateCivile } from './dates'
import type { DonneesObjectifs, ReglesScenarios } from './objectifs'
import { projeter, REGLES_SCENARIOS_DEFAUT } from './objectifs'
import { epargneObjectif } from './epargne'
import type { Calendrier, MoisBudgetaire } from './periodes'
import { suiviDesSemaines } from './semaines'

/**
 * Les huit KPI retenus (Plan.md § 8). Chacun répond à une question et garde ses montants de base,
 * pour que l'écran montre « sur quoi repose ce calcul ». Un taux sans revenu est `null`, jamais 0 %.
 */

export interface ResteADepenser {
  /** Revenus − sorties réelles − charges datées encore à payer − épargne prévue restante. */
  montant: Centimes
  /** `prevu` tant que la paie du mois n'est pas reçue : la paie prévue remplace la reçue. */
  nature: 'reel' | 'prevu'
  revenus: Centimes
  sorties: Centimes
  /** Prévu : charges fixes, ponctuels et échéances du mois pas encore payés (les enveloppes restent à dépenser). */
  engagements: Centimes
  /** Prévu : versements mensuels choisis pas encore faits. */
  epargneRestante: Centimes
  joursRestants: number
  /** Reste ÷ jours restants (0 si le reste est négatif). */
  parJour: Centimes
}

export interface ResteSemaine {
  numero: number
  debut: DateCivile
  fin: DateCivile
  disponible: Centimes
  depense: Centimes
  reste: Centimes
  joursRestants: number
  parJour: Centimes
}

export interface Taux {
  /** Réel ; `null` sans revenu reçu. */
  reel: number | null
  /** Prévu ; `null` sans revenu prévu. */
  prevu: number | null
}

export interface EcartPlan {
  /** Sorties réelles − prévu (positif : plus dépensé que prévu). */
  montant: Centimes
  /** Écart ÷ prévu ; `null` si rien n'était prévu. */
  pourcentage: number | null
  prevu: Centimes
  reel: Centimes
  /** `mois` : mois terminé ; `aDate` : mois en cours, comparé au prévu cumulé jusqu'à aujourd'hui. */
  base: 'mois' | 'aDate'
}

export interface PartVariable {
  /** Primes et revenus variables ÷ revenus ; `null` sans revenu prévu. */
  part: number | null
  variable: Centimes
  total: Centimes
  du: CleMois
  au: CleMois
}

export interface IndicateurObjectif {
  id: string
  libelle: string
  epargne: Centimes
  montantCible: Centimes
  /** De 0 à 1. */
  progression: number
  dateCible: CleMois | null
  /** Projeté (réaliste) ; `null` au-delà de 10 ans. */
  dateEstimee: CleMois | null
  /** Date estimée − date souhaitée, en mois (positif : en retard) ; `null` si l'une manque. */
  retardMois: number | null
}

export interface IndicateursDuMois {
  mois: MoisBudgetaire
  /** Mois en cours seulement. */
  resteADepenser: ResteADepenser | null
  /** Semaine en cours, si le mois a un budget flexible. */
  resteSemaine: ResteSemaine | null
  tauxEpargne: Taux & { epargneReelle: Centimes; epargnePrevue: Centimes; revenusReels: Centimes; revenusPrevus: Centimes }
  tauxCharges: Taux & { sortiesReelles: Centimes; chargesPrevues: Centimes; revenusReels: Centimes; revenusPrevus: Centimes }
  /** `null` pour un mois à venir. */
  ecart: EcartPlan | null
  /** 12 prochains mois (prévu), à partir du mois en cours. */
  partVariable: PartVariable
  /** Objectif actif de priorité la plus haute. */
  objectif: IndicateurObjectif | null
}

export interface OptionsIndicateurs {
  aujourdhui: DateCivile
  debutSemaine?: number
  report?: boolean
  regles?: ReglesScenarios
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : null)

export function indicateurs(calendrier: Calendrier, donnees: DonneesObjectifs, cle: CleMois, { aujourdhui, debutSemaine = 1, report = false, regles = REGLES_SCENARIOS_DEFAUT }: OptionsIndicateurs): IndicateursDuMois {
  const bilan = bilanDuMois(calendrier, cle)
  const { mois, totaux } = bilan
  const epargne = bilan.epargne ?? { prevue: centimes(0), reelle: centimes(0) }

  let resteADepenser: ResteADepenser | null = null
  let resteSemaine: ResteSemaine | null = null
  if (mois.statut === 'enCours') {
    const paieAttendue = bilan.lignes.filter((l) => l.cible?.type === 'paie' && l.statut !== 'confirme')
    const revenus = additionner(totaux.revenusReels, ...paieAttendue.map((l) => l.prevu ?? centimes(0)))
    const suivi = calendrier.suiviDuMois(cle)
    const engagements = additionner(suivi.restePrevu.lignes, suivi.restePrevu.dettes)
    const epargneRestante = additionner(
      ...bilan.lignes.filter((l) => l.famille === 'epargne' && l.prevu !== null).map((l) => centimes(Math.max(0, l.prevu! - (l.reel ?? 0)))),
    )
    const montant = centimes(revenus - totaux.sortiesReelles - engagements - epargneRestante)
    const joursRestants = ecartJours(aujourdhui, mois.fin) + 1
    resteADepenser = {
      montant,
      nature: paieAttendue.length > 0 ? 'prevu' : 'reel',
      revenus,
      sorties: totaux.sortiesReelles,
      engagements,
      epargneRestante,
      joursRestants,
      parJour: centimes(Math.floor(Math.max(0, montant) / joursRestants)),
    }

    const semaines = suiviDesSemaines(calendrier, cle, { debutSemaine, report, aujourdhui })
    const s = semaines.semaines.find((x) => x.statut === 'enCours')
    if (s && semaines.budget > 0) {
      const restants = s.nbJours - s.joursEcoules + 1
      resteSemaine = { numero: s.numero, debut: s.debut, fin: s.fin, disponible: s.disponible, depense: s.depense, reste: s.reste, joursRestants: restants, parJour: s.parJour ?? centimes(0) }
    }
  }

  let ecart: EcartPlan | null = null
  if (mois.statut === 'passe') {
    const montant = soustraire(totaux.sortiesReelles, totaux.chargesPrevues)
    ecart = { montant, pourcentage: ratio(montant, totaux.chargesPrevues), prevu: totaux.chargesPrevues, reel: totaux.sortiesReelles, base: 'mois' }
  } else if (mois.statut === 'enCours') {
    const point = rythmeDuMois(calendrier, cle, aujourdhui, debutSemaine).find((p) => p.date === aujourdhui)
    if (point && point.reel !== null) {
      const montant = soustraire(point.reel, point.prevu)
      ecart = { montant, pourcentage: ratio(montant, point.prevu), prevu: point.prevu, reel: point.reel, base: 'aDate' }
    }
  }

  return {
    mois,
    resteADepenser,
    resteSemaine,
    tauxEpargne: {
      reel: ratio(epargne.reelle, totaux.revenusReels),
      prevu: ratio(epargne.prevue, totaux.revenusPrevus),
      epargneReelle: epargne.reelle,
      epargnePrevue: epargne.prevue,
      revenusReels: totaux.revenusReels,
      revenusPrevus: totaux.revenusPrevus,
    },
    tauxCharges: {
      reel: ratio(totaux.sortiesReelles, totaux.revenusReels),
      prevu: ratio(totaux.chargesPrevues, totaux.revenusPrevus),
      sortiesReelles: totaux.sortiesReelles,
      chargesPrevues: totaux.chargesPrevues,
      revenusReels: totaux.revenusReels,
      revenusPrevus: totaux.revenusPrevus,
    },
    ecart,
    partVariable: partVariable(calendrier, calendrier.moisContenant(aujourdhui).cle),
    objectif: objectifPrioritaire(calendrier, donnees, aujourdhui, regles),
  }
}

/** Part variable du revenu sur 12 mois budgétaires : primes et revenus variables ÷ tous les revenus prévus (reçus s'ils le sont). */
export function partVariable(calendrier: Calendrier, du: CleMois): PartVariable {
  const au = decalerMois(du, 11)
  let variable = 0
  let total = 0
  for (const m of moisEntre(du, au)) {
    for (const l of calendrier.paies.paie(m)?.lignes ?? []) {
      const montant = l.montantRecu ?? l.montantPrevu ?? 0
      total += montant
      if (l.type === 'prime') variable += montant
    }
  }
  for (const r of calendrier.revenusPrevus(decalerMois(du, -2), decalerMois(au, 1))) {
    if (r.versement !== 'dateSeparee' || r.moisBudget < du || r.moisBudget > au) continue
    const montant = r.montantRecu ?? r.montantPrevu
    total += montant
    if (r.type === 'prime' || r.type === 'variable') variable += montant
  }
  return { part: ratio(variable, total), variable: centimes(variable), total: centimes(total), du, au }
}

/** Progression et délai de l'objectif actif de priorité la plus haute (projection réaliste). */
function objectifPrioritaire(calendrier: Calendrier, donnees: DonneesObjectifs, aujourdhui: DateCivile, regles: ReglesScenarios): IndicateurObjectif | null {
  const o = donnees.objectifs.filter((x) => x.statut === 'actif').sort((a, b) => a.priorite - b.priorite)[0]
  if (!o) return null
  const epargne = epargneObjectif(o, donnees.mouvementsEpargne)
  const dateEstimee = projeter(calendrier, donnees.objectifs, donnees.mouvementsEpargne, { aujourdhui, regle: regles.realiste }).dates.get(o.id) ?? null
  return {
    id: o.id,
    libelle: o.libelle,
    epargne,
    montantCible: o.montantCible,
    progression: o.montantCible > 0 ? Math.min(1, epargne / o.montantCible) : 1,
    dateCible: o.dateCible,
    dateEstimee,
    retardMois: o.dateCible && dateEstimee ? ecartMois(o.dateCible, dateEstimee) : null,
  }
}
