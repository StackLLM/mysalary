import { evenementsDuMois, type EvenementJour } from './annee'
import { additionner, centimes, type Centimes } from './argent'
import { bilanDuMois, syntheseCharges, type SyntheseCharges } from './bilan'
import { ajouterJours, decalerMois, ecartJours, jourSemaine, type DateCivile } from './dates'
import type { Calendrier, DepenseImputee } from './periodes'
import { suiviDesSemaines, type SuiviSemaine } from './semaines'

/**
 * Page Aujourd'hui (lot 16, ux-ui.md (UX) § 5.2) : ce qui tombe dans les prochains jours, et le bilan de la semaine
 * qui vient de finir. Le reste à dépenser, la semaine en cours, l'épargne et l'objectif viennent des indicateurs (lot 12).
 */

/** Revenus et charges datés d'aujourd'hui à aujourd'hui + `jours` − 1, dans l'ordre des dates (réel s'il existe, sinon prévu). */
export function prochainsJours(calendrier: Calendrier, aujourdhui: DateCivile, jours = 7): EvenementJour[] {
  const fin = ajouterJours(aujourdhui, jours - 1)
  const premier = calendrier.moisContenant(aujourdhui).cle
  const dernier = calendrier.moisContenant(fin).cle
  const evenements: EvenementJour[] = []
  for (let cle = premier; cle <= dernier; cle = decalerMois(cle, 1)) {
    evenements.push(...evenementsDuMois(calendrier, cle).filter((e) => e.date >= aujourdhui && e.date <= fin))
  }
  return evenements.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/**
 * Bilan de la semaine passée, le premier jour d'une nouvelle semaine seulement (le lundi, ou le dimanche selon les Réglages) ;
 * `null` les autres jours ou sans budget flexible.
 */
export function semainePassee(calendrier: Calendrier, aujourdhui: DateCivile, { debutSemaine = 1, report = false } = {}): SuiviSemaine | null {
  if (jourSemaine(aujourdhui) !== debutSemaine) return null
  const hier = ajouterJours(aujourdhui, -1)
  const suivi = suiviDesSemaines(calendrier, calendrier.moisContenant(hier).cle, { debutSemaine, report, aujourdhui })
  if (suivi.budget === 0) return null
  return suivi.semaines.find((s) => s.debut <= hier && s.fin >= hier) ?? null
}

/** Une charge du mois vue depuis le tableau de bord : son poids dans les revenus, et pour une enveloppe, son rythme. */
export interface PosteDuMois {
  /** `fixe:<id>`, `enveloppe:<id>`, `ponctuel:<id>`, `dette:<id>`, `horsPlan`. */
  cle: string
  famille: 'fixe' | 'enveloppe' | 'ponctuel' | 'dette' | 'horsPlan'
  libelle: string
  /** Prévu du mois (0 hors plan). */
  prevu: Centimes
  /** Payé ou dépensé à ce jour. */
  reel: Centimes
  /** Plus grand de prévu et réel ÷ revenus prévus du mois, de 0 à 1 ; `null` sans revenu prévu. */
  part: number | null
  /** Enveloppe : dépensé ÷ budget ; `null` pour les autres postes. */
  consommation: number | null
  /** Enveloppe dépassée, ou dépensée nettement plus vite que le mois n'avance (10 points d'avance). */
  surveillance: 'depassee' | 'rythme' | null
}

export interface TableauDeBord {
  /** Part du mois écoulée (jour en cours compris), de 0 à 1. */
  avancement: number
  revenusPrevus: Centimes
  /** Revenus prévus − charges prévues : le reste du mois, avant épargne. */
  restePrevu: Centimes
  /** Consommé des charges et reste à payer, comme dans le bilan du mois. */
  synthese: SyntheseCharges
  /** Toutes les charges du mois, de la plus lourde à la plus légère. */
  postes: PosteDuMois[]
  /** Les 5 plus grosses dépenses réelles du mois, à ce jour. */
  grossesDepenses: DepenseImputee[]
}

/**
 * Tableau de bord du mois en cours (lot 27) : d'où part l'argent et ce qui demande de l'attention. Tout vient du bilan
 * du mois (prévu et réel de chaque ligne) et des dépenses imputées : aucun calcul parallèle.
 */
export function tableauDeBord(calendrier: Calendrier, aujourdhui: DateCivile): TableauDeBord {
  const { mois, lignes, totaux } = bilanDuMois(calendrier, calendrier.moisCourant().cle)
  const avancement = Math.min(1, Math.max(0, (ecartJours(mois.debut, aujourdhui) + 1) / mois.nbJours))
  const parPoste = new Map<string, PosteDuMois>()
  for (const l of lignes) {
    if (l.famille !== 'fixe' && l.famille !== 'enveloppe' && l.famille !== 'ponctuel' && l.famille !== 'dette' && l.famille !== 'horsPlan') continue
    // Une charge peut tomber plusieurs fois dans le mois (lignes datées) : un seul poste.
    const cle = l.famille === 'horsPlan' ? 'horsPlan' : l.cle.split(':').slice(0, 2).join(':')
    const poste = parPoste.get(cle) ?? { cle, famille: l.famille, libelle: l.libelle, prevu: centimes(0), reel: centimes(0), part: null, consommation: null, surveillance: null }
    poste.prevu = additionner(poste.prevu, l.prevu ?? centimes(0))
    poste.reel = additionner(poste.reel, l.reel ?? centimes(0))
    parPoste.set(cle, poste)
  }
  const postes = [...parPoste.values()]
    .map((p) => {
      const poids = Math.max(p.prevu, p.reel)
      const consommation = p.famille === 'enveloppe' && p.prevu > 0 ? p.reel / p.prevu : null
      const surveillance = consommation === null ? null : p.reel > p.prevu ? 'depassee' : consommation > avancement + 0.1 ? 'rythme' : null
      return { ...p, part: totaux.revenusPrevus > 0 ? poids / totaux.revenusPrevus : null, consommation, surveillance } satisfies PosteDuMois
    })
    .filter((p) => p.prevu > 0 || p.reel > 0)
    .sort((a, b) => Math.max(b.prevu, b.reel) - Math.max(a.prevu, a.reel))
  const jusquA = aujourdhui < mois.fin ? aujourdhui : mois.fin
  const grossesDepenses = calendrier
    .sortiesEntre(mois.debut, jusquA)
    .depenses.sort((a, b) => b.montant - a.montant || (a.date < b.date ? 1 : -1))
    .slice(0, 5)
  return { avancement, revenusPrevus: totaux.revenusPrevus, restePrevu: totaux.restePrevu, synthese: syntheseCharges(lignes), postes, grossesDepenses }
}
