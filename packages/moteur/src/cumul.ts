import { additionner, centimes, soustraire, type Centimes } from './argent'
import { bilanDuMois } from './bilan'
import { decalerMois, type CleMois, type DateCivile } from './dates'
import { REGLES_SCENARIOS_DEFAUT, revenusDuMois, type RegleScenario } from './objectifs'
import type { Calendrier, StatutPeriode } from './periodes'

/**
 * Cumul de mois en mois (lot 13) : ce qui reste d'un mois — revenus moins charges moins épargne versée —
 * s'ajoute au mois suivant, comme sur le compte courant. Réel pour les mois passés, réel + prévu restant
 * pour le mois en cours, prévu (règle d'un scénario, réaliste par défaut) pour les mois futurs.
 * L'épargne n'est jamais une charge (R11) : elle quitte le compte courant, d'où sa colonne à part.
 */

/** `avant` : mois antérieur au début du suivi, sans chiffre. */
export type NatureCumul = 'avant' | 'reel' | 'enCours' | 'prevu'

export interface MoisCumul {
  cle: CleMois
  debut: DateCivile
  fin: DateCivile
  statut: StatutPeriode
  nature: NatureCumul
  /** Premier mois du cumul : son report est le solde de départ déclaré (ou 0). */
  premier: boolean
  /** Reçu du mois précédent (ou solde de départ déclaré) ; `null` avant le suivi. */
  report: Centimes | null
  revenus: Centimes
  /** Sorties (dépenses, paiements de dettes) et charges encore prévues. */
  charges: Centimes
  /** Épargne versée (nette des retraits), ou prévue (versements mensuels choisis). */
  epargne: Centimes
  /** Revenus − charges − épargne. */
  reste: Centimes
  /** Report + reste : ce qu'il y aurait sur le compte à la fin du mois ; `null` avant le suivi. */
  cumul: Centimes | null
  /** Mois en cours : part déjà réelle des revenus, charges et épargne. */
  dontReel: { revenus: Centimes; charges: Centimes; epargne: Centimes } | null
}

/** Solde du compte courant déclaré au début d'un mois budgétaire. */
export interface Depart {
  mois: CleMois
  solde: Centimes
}

export interface OptionsCumul {
  aujourdhui: DateCivile
  /** Règle des mois futurs (revenus retenus) ; réaliste par défaut. */
  regle?: RegleScenario
  depart?: Depart | null
}

/** Garde-fou : jamais plus de 20 ans parcourus. */
const LIMITE = 240

/** Premier mois du cumul : celui du solde déclaré, sinon celui de la première donnée réelle, sinon le mois en cours. */
export function debutCumul(calendrier: Calendrier, aujourdhui: DateCivile, depart: Depart | null = null): CleMois {
  if (depart) return depart.mois
  return calendrier.moisContenant(calendrier.debutDonnees ?? aujourdhui).cle
}

export function cumulDesMois(calendrier: Calendrier, du: CleMois, au: CleMois, { aujourdhui, regle = REGLES_SCENARIOS_DEFAUT.realiste, depart = null }: OptionsCumul): MoisCumul[] {
  const debut = debutCumul(calendrier, aujourdhui, depart)
  const resultat: MoisCumul[] = []
  let report: Centimes = depart?.solde ?? centimes(0)
  const premier = du < debut ? du : debut
  for (let i = 0, cle = premier; cle <= au && i < LIMITE; i++, cle = decalerMois(cle, 1)) {
    const mois = calendrier.mois(cle)
    const base = { cle, debut: mois.debut, fin: mois.fin, statut: mois.statut }
    if (cle < debut) {
      if (cle >= du) resultat.push({ ...base, nature: 'avant', premier: false, report: null, revenus: centimes(0), charges: centimes(0), epargne: centimes(0), reste: centimes(0), cumul: null, dontReel: null })
      continue
    }
    const ligne = calculer(calendrier, cle, mois.statut, regle)
    const cumul = additionner(report, ligne.reste)
    if (cle >= du) resultat.push({ ...base, ...ligne, premier: cle === debut, report, cumul })
    report = cumul
  }
  return resultat
}

function calculer(calendrier: Calendrier, cle: CleMois, statut: StatutPeriode, regle: RegleScenario): Pick<MoisCumul, 'nature' | 'revenus' | 'charges' | 'epargne' | 'reste' | 'dontReel'> {
  const epargneMois = calendrier.epargneDuMois(cle)
  const fin = (nature: NatureCumul, revenus: Centimes, charges: Centimes, epargne: Centimes, dontReel: MoisCumul['dontReel'] = null) => ({
    nature,
    revenus,
    charges,
    epargne,
    reste: soustraire(soustraire(revenus, charges), epargne),
    dontReel,
  })

  if (statut === 'passe') {
    const { totaux } = bilanDuMois(calendrier, cle)
    return fin('reel', totaux.revenusReels, totaux.sortiesReelles, epargneMois.reelle)
  }
  if (statut === 'aVenir') {
    return fin('prevu', revenusDuMois(calendrier, cle, regle), calendrier.chargesDuMois(cle).totaux.total, epargneMois.prevue)
  }
  // Mois en cours : le réel à date, plus ce qui est encore attendu (revenus retenus, charges et versements prévus).
  const { totaux } = bilanDuMois(calendrier, cle)
  const suivi = calendrier.suiviDuMois(cle)
  const epargneRestante = additionner(...epargneMois.lignes.map((l) => centimes(Math.max(0, (l.prevu ?? 0) - l.reel))))
  return fin(
    'enCours',
    revenusDuMois(calendrier, cle, regle),
    additionner(suivi.totaux.total, suivi.restePrevu.total),
    additionner(epargneMois.reelle, epargneRestante),
    { revenus: totaux.revenusReels, charges: totaux.sortiesReelles, epargne: epargneMois.reelle },
  )
}

/** Résumé d'une plage de mois (lot 14, vue calendrier) : totaux des mois suivis, cumul de fin, mois le plus bas. */
export interface ResumeCumul {
  revenus: Centimes
  charges: Centimes
  epargne: Centimes
  /** Somme des restes des mois suivis. */
  reste: Centimes
  /** Cumul du dernier mois suivi ; `null` si aucun mois n'est suivi. */
  cumulFin: Centimes | null
  /** Mois au cumul le plus bas (le premier en cas d'égalité) ; `null` si aucun mois n'est suivi. */
  plusBas: { cle: CleMois; cumul: Centimes } | null
  /** Mois dont le cumul passe sous zéro. */
  negatifs: CleMois[]
  /** Nombre de mois réels, en cours et prévus dans la plage. */
  natures: Record<Exclude<NatureCumul, 'avant'>, number>
}

export function resumeCumul(mois: MoisCumul[]): ResumeCumul {
  const suivis = mois.filter((m): m is MoisCumul & { cumul: Centimes } => m.cumul !== null)
  const somme = (champ: 'revenus' | 'charges' | 'epargne' | 'reste') => additionner(...suivis.map((m) => m[champ]))
  const plusBas = suivis.reduce<MoisCumul & { cumul: Centimes } | null>((bas, m) => (bas === null || m.cumul < bas.cumul ? m : bas), null)
  return {
    revenus: somme('revenus'),
    charges: somme('charges'),
    epargne: somme('epargne'),
    reste: somme('reste'),
    cumulFin: suivis.at(-1)?.cumul ?? null,
    plusBas: plusBas ? { cle: plusBas.cle, cumul: plusBas.cumul } : null,
    negatifs: suivis.filter((m) => m.cumul < 0).map((m) => m.cle),
    natures: {
      reel: suivis.filter((m) => m.nature === 'reel').length,
      enCours: suivis.filter((m) => m.nature === 'enCours').length,
      prevu: suivis.filter((m) => m.nature === 'prevu').length,
    },
  }
}
