import { additionner, centimes, repartir, soustraire, type Centimes } from './argent'
import { ajouterJours, ecartJours, type CleMois, type DateCivile } from './dates'
import { somme, type StatutCouverture } from './depenses'
import { semainesDe, type Calendrier, type MoisBudgetaire, type Semaine, type StatutPeriode } from './periodes'

/**
 * Suivi hebdomadaire (Plan.md § 7.1, § 8 ; UX.md § 4.6, § 5.4) : le budget flexible du mois (les enveloppes)
 * réparti jour par jour sur ses semaines, face au dépensé flexible réel (enveloppes et hors plan).
 * Le prévu (budget, charges datées) et le réel (dépensé, payé) restent des champs distincts.
 */

/** Écart en dessous duquel la tendance est « stable » (10 %). */
const SEUIL_TENDANCE = 0.1
/** Historique comparé : les 4 semaines qui précèdent. */
const JOURS_HISTORIQUE = 28

export interface ChargeDeSemaine {
  origine: 'fixe' | 'ponctuel' | 'dette'
  id: string
  libelle: string
  date: DateCivile
  /** Prévu (montant de l'échéancier pour une dette, comme dans le bilan). */
  montant: Centimes
  statut: StatutCouverture
}

export interface TendanceSemaine {
  /** Dépensé flexible moyen des 28 jours précédents, ramené à 7 jours (réel). */
  moyenneSemaine: Centimes
  /** Variation du dépensé par jour contre la moyenne par jour ; `null` si la moyenne est nulle. */
  variation: number | null
  sens: 'hausse' | 'baisse' | 'stable'
}

export interface SuiviSemaine extends Semaine {
  statut: StatutPeriode
  /** Jours déjà vécus (aujourd'hui compris). */
  joursEcoules: number
  /** Prévu : part du budget flexible du mois, au prorata des jours. */
  budget: Centimes
  /** Reste signé de la semaine précédente (réglage « report ») ; 0 sinon. */
  report: Centimes
  disponible: Centimes
  /** Réel : dépenses liées à une enveloppe et hors plan. */
  depense: Centimes
  /** Disponible − dépensé ; négatif si dépassé. */
  reste: Centimes
  /** Passée : budget − dépensé ; en cours : budget des jours écoulés − dépensé ; à venir : `null`. */
  ecart: Centimes | null
  /** Semaine en cours : ce qu'on peut encore dépenser par jour. */
  parJour: Centimes | null
  /** Prévu : charges fixes, ponctuels et échéances datés dans la semaine. */
  chargesPrevues: Centimes
  /** Réel : charges fixes, ponctuels et dettes payés dans la semaine. */
  chargesPayees: Centimes
  charges: ChargeDeSemaine[]
  /** Réel : versements − retraits d'épargne de la semaine (jamais une dépense). */
  epargne: Centimes
  tendance: TendanceSemaine | null
}

export type ReponseSemaines =
  | { type: 'avance' | 'retard'; montant: Centimes }
  | { type: 'marge' | 'depasse'; montant: Centimes }
  | { type: 'aVenir' }
  | { type: 'sansEnveloppe' }

export interface SuiviDesSemaines {
  mois: MoisBudgetaire
  debutSemaine: number
  report: boolean
  semaines: SuiviSemaine[]
  /** Numéro de la semaine qui contient aujourd'hui. */
  courante: number | null
  /** Budget flexible du mois (prévu). */
  budget: Centimes
  /** Dépensé flexible du mois à date (réel). */
  depense: Centimes
  /** Mois en cours : budget des jours écoulés (prévu à date). */
  budgetADate: Centimes | null
  reponse: ReponseSemaines
}

export interface OptionsSemaines {
  debutSemaine?: number
  report?: boolean
  aujourdhui: DateCivile
}

const flexible = (imputation: string) => imputation === 'enveloppe' || imputation === 'horsPlan'

export function suiviDesSemaines(calendrier: Calendrier, cle: CleMois, { debutSemaine = 1, report = false, aujourdhui }: OptionsSemaines): SuiviDesSemaines {
  const mois = calendrier.mois(cle)
  const jours = Array.from({ length: mois.nbJours }, (_, i) => ajouterJours(mois.debut, i))
  const budget = additionner(...calendrier.suiviDuMois(cle).enveloppes.map((e) => e.budget))
  const parJourDuMois = repartir(
    budget,
    jours.map(() => 1),
  )
  const budgetDu = (du: DateCivile, au: DateCivile) => additionner(...jours.flatMap((j, i) => (j >= du && j <= au ? [parJourDuMois[i]!] : [])))

  /** Dépensé flexible entre deux dates incluses. */
  const depenseFlexible = (du: DateCivile, au: DateCivile) => somme(calendrier.sortiesEntre(du, au).depenses.filter((d) => flexible(d.imputation)))

  const suivi = calendrier.suiviDuMois(cle)
  const datees: ChargeDeSemaine[] = [
    ...suivi.lignes.map((l) => ({ origine: l.origine, id: l.id, libelle: l.libelle, date: l.date, montant: l.montant, statut: l.statut })),
    ...calendrier.echeancesDettes(cle).map((e) => ({
      origine: 'dette' as const,
      id: e.detteId,
      libelle: e.libelle,
      date: e.date,
      montant: e.montant,
      statut: ({ payee: 'payee', partielle: 'partielle', enRetard: 'enRetard', prevue: 'prevue' } as const)[e.statut],
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.libelle.localeCompare(b.libelle))

  function tendance(s: Semaine, joursEcoules: number, depense: Centimes): TendanceSemaine | null {
    if (joursEcoules === 0) return null
    const debutHistorique = ajouterJours(s.debut, -JOURS_HISTORIQUE)
    if (calendrier.debutSuivi === null || calendrier.debutSuivi > debutHistorique) return null
    const total = depenseFlexible(debutHistorique, ajouterJours(s.debut, -1))
    const moyenneJour = total / JOURS_HISTORIQUE
    const depenseJour = depense / joursEcoules
    const variation = moyenneJour > 0 ? depenseJour / moyenneJour - 1 : null
    const sens = variation === null ? (depense > 0 ? 'hausse' : 'stable') : Math.abs(variation) < SEUIL_TENDANCE ? 'stable' : variation > 0 ? 'hausse' : 'baisse'
    return { moyenneSemaine: centimes(Math.round(moyenneJour * 7)), variation, sens }
  }

  let reportSuivant = centimes(0)
  const semaines: SuiviSemaine[] = semainesDe(mois, debutSemaine).map((s) => {
    const statut: StatutPeriode = s.fin < aujourdhui ? 'passe' : s.debut > aujourdhui ? 'aVenir' : 'enCours'
    const joursEcoules = statut === 'passe' ? s.nbJours : statut === 'aVenir' ? 0 : ecartJours(s.debut, aujourdhui) + 1
    const budgetSemaine = budgetDu(s.debut, s.fin)
    const reportRecu = report ? reportSuivant : centimes(0)
    const disponible = additionner(budgetSemaine, reportRecu)
    const sorties = calendrier.sortiesEntre(s.debut, s.fin)
    const depense = somme(sorties.depenses.filter((d) => flexible(d.imputation)))
    const reste = soustraire(disponible, depense)
    const ecart =
      statut === 'passe'
        ? soustraire(budgetSemaine, depense)
        : statut === 'enCours'
          ? soustraire(budgetDu(s.debut, aujourdhui), depense)
          : null
    const restants = s.nbJours - joursEcoules + 1
    const charges = datees.filter((c) => c.date >= s.debut && c.date <= s.fin)
    // Seul le reste d'une semaine terminée se reporte ; jamais d'un mois à l'autre.
    reportSuivant = statut === 'passe' ? reste : centimes(0)
    return {
      ...s,
      statut,
      joursEcoules,
      budget: budgetSemaine,
      report: reportRecu,
      disponible,
      depense,
      reste,
      ecart,
      parJour: statut === 'enCours' ? centimes(Math.floor(Math.max(0, reste) / restants)) : null,
      chargesPrevues: somme(charges),
      chargesPayees: additionner(somme(sorties.depenses.filter((d) => !flexible(d.imputation))), somme(sorties.paiementsDettes)),
      charges,
      epargne: calendrier.epargneEntre(s.debut, s.fin),
      tendance: tendance(s, joursEcoules, depense),
    }
  })

  const depenseMois = somme(semaines.map((s) => ({ montant: s.depense })))
  const budgetADate = mois.statut === 'enCours' ? budgetDu(mois.debut, aujourdhui) : null
  let reponse: ReponseSemaines
  if (budget === 0) reponse = { type: 'sansEnveloppe' }
  else if (mois.statut === 'aVenir') reponse = { type: 'aVenir' }
  else if (budgetADate !== null) {
    const avance = soustraire(budgetADate, depenseMois)
    reponse = avance >= 0 ? { type: 'avance', montant: avance } : { type: 'retard', montant: centimes(-avance) }
  } else {
    const marge = soustraire(budget, depenseMois)
    reponse = marge >= 0 ? { type: 'marge', montant: marge } : { type: 'depasse', montant: centimes(-marge) }
  }

  return {
    mois,
    debutSemaine,
    report,
    semaines,
    courante: semaines.find((s) => s.statut === 'enCours')?.numero ?? null,
    budget,
    depense: depenseMois,
    budgetADate,
    reponse,
  }
}
