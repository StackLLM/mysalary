import { additionner, centimes, repartir, soustraire, type Centimes } from './argent'
import { chargeCeMois, dateDeCharge, enveloppeActive, etatDette, type Charge, type Dette, type EtatDette, type PaiementDette, type Ponctuel } from './charges'
import {
  ajouterJours,
  decalerMois,
  dernierJour,
  ecartJours,
  jourSemaine,
  moisDe,
  moisEntre,
  premierJour,
  type CleMois,
  type DateCivile,
} from './dates'
import { dateDeVersement, moisDeVersement, type RevenuRecu, type SourceRevenu, type TypeRevenu, type Versement } from './revenus'
import { creerCalendrierPaie, type Certitude, type DonneesSalaire, type SourceDebut } from './salaire'

/**
 * Mois budgétaires et semaines (Plan.md § 7.1).
 * En cycle de paie, un mois va du jour de la paie qui le finance à la veille de la paie suivante.
 */

export type ModePeriode = 'cyclePaie' | 'calendaire'
export type SourceBorne = SourceDebut | 'calendaire'
export type StatutPeriode = 'passe' | 'enCours' | 'aVenir'

export interface MoisBudgetaire {
  cle: CleMois
  debut: DateCivile
  /** Dernier jour inclus. */
  fin: DateCivile
  nbJours: number
  statut: StatutPeriode
  sourceDebut: SourceBorne
  sourceFin: SourceBorne
}

export interface Semaine {
  numero: number
  debut: DateCivile
  fin: DateCivile
  nbJours: number
  /** Coupée par le début ou la fin du mois. */
  partielle: boolean
}

const LIMITE_RECHERCHE = 1200

/** Un versement prévu d'une source de revenus, avec son statut. */
export interface RevenuPrevu {
  sourceId: string
  libelle: string
  type: TypeRevenu
  certitude: Certitude
  versement: Versement
  /** Mois civil où l'argent arrive. */
  moisVersement: CleMois
  /** Date prévue (avec la paie : date de la paie). */
  datePrevue: DateCivile
  dateReelle: DateCivile | null
  /** Mois budgétaire dans lequel il compte. */
  moisBudget: CleMois
  statut: 'prevu' | 'enRetard' | 'recu'
  montantPrevu: Centimes
  montantRecu: Centimes | null
  /** Reçu − prévu (R4 : le prévu n'est jamais modifié). */
  ecart: Centimes | null
  /** Revenu reçu lié (versement à part). */
  revenuRecuId: string | null
}

/** Une sortie prévue dans un mois budgétaire. */
export interface ChargePrevue {
  origine: 'fixe' | 'enveloppe' | 'ponctuel' | 'dette'
  /** Charge, ponctuel ou dette d'origine. */
  id: string
  libelle: string
  /** `null` pour une dette. */
  categorieId: string | null
  /** `null` pour une enveloppe (dépensée au fil du mois). */
  date: DateCivile | null
  /** Prévu. Pour une échéance à venir : ce qui reste attendu (R9). */
  montant: Centimes
  essentielle: boolean
  certitude: Certitude
  /** Échéance de dette : numéro et statut. */
  echeance?: { numero: number; statut: 'payee' | 'partielle' | 'enRetard' | 'prevue' }
}

export interface ChargesDuMois {
  lignes: ChargePrevue[]
  totaux: Record<ChargePrevue['origine'] | 'total', Centimes>
}

export interface DonneesCharges {
  charges?: Charge[]
  ponctuels?: Ponctuel[]
  dettes?: Dette[]
  paiementsDettes?: PaiementDette[]
}

export type Calendrier = ReturnType<typeof creerCalendrier>

export function creerCalendrier({
  mode,
  revenusRecus = [],
  charges = [],
  ponctuels = [],
  dettes = [],
  paiementsDettes = [],
  ...donnees
}: DonneesSalaire & DonneesCharges & { mode: ModePeriode; revenusRecus?: RevenuRecu[] }) {
  const paies = creerCalendrierPaie(donnees)
  /** Sans contrat, le cycle de paie n'est pas défini : on retombe sur le mois civil. */
  const cycle = mode === 'cyclePaie' && paies.aContrat

  function borne(cle: CleMois): { date: DateCivile; source: SourceBorne } {
    if (!cycle) return { date: premierJour(cle), source: 'calendaire' }
    return paies.debut(cle)!
  }

  function statut(debut: DateCivile, fin: DateCivile): StatutPeriode {
    if (fin < donnees.aujourdhui) return 'passe'
    if (debut > donnees.aujourdhui) return 'aVenir'
    return 'enCours'
  }

  function mois(cle: CleMois): MoisBudgetaire {
    const debut = borne(cle)
    const suivant = borne(decalerMois(cle, 1))
    const fin = cycle ? ajouterJours(suivant.date, -1) : dernierJour(cle)
    return {
      cle,
      debut: debut.date,
      fin,
      nbJours: Math.max(0, ecartJours(debut.date, fin) + 1),
      statut: statut(debut.date, fin),
      sourceDebut: debut.source,
      sourceFin: suivant.source,
    }
  }

  /** Mois budgétaire qui contient une date. */
  function moisContenant(date: DateCivile): MoisBudgetaire {
    let cle = moisDe(date)
    if (!cycle) return mois(cle)
    if (paies.motif(cle)?.financeMoisSuivant) cle = decalerMois(cle, 1)
    for (let i = 0; i < LIMITE_RECHERCHE && borne(cle).date > date; i++) cle = decalerMois(cle, -1)
    for (let i = 0; i < LIMITE_RECHERCHE && borne(decalerMois(cle, 1)).date <= date; i++) cle = decalerMois(cle, 1)
    return mois(cle)
  }

  /** Prime « avec la paie » : elle suit la paie versée ce mois civil. */
  function prevuAvecPaie(source: SourceRevenu, moisVersement: CleMois): RevenuPrevu | null {
    const financement = [decalerMois(moisVersement, 1), moisVersement].find((m) => paies.moisVersement(m) === moisVersement)
    const paie = financement ? paies.paie(financement) : null
    if (!paie) return null
    const base = {
      sourceId: source.id,
      libelle: source.libelle,
      type: source.type,
      certitude: source.certitude,
      versement: source.versement,
      moisVersement,
      datePrevue: paie.datePrevue,
      moisBudget: paie.mois,
      revenuRecuId: null,
    }
    if (paie.statut !== 'recue') {
      return { ...base, dateReelle: null, statut: paie.statut === 'enRetard' ? 'enRetard' : 'prevu', montantPrevu: source.montant, montantRecu: null, ecart: null }
    }
    // Paie reçue : la ligne figée à la réception fait foi (R27). Sans ligne, la source n'était pas prévue alors.
    const ligne = paie.lignes.find((l) => l.sourceId === source.id)
    if (!ligne) return null
    const prevu = ligne.montantPrevu ?? centimes(0)
    const recu = ligne.montantRecu ?? centimes(0)
    return { ...base, dateReelle: paie.dateReelle, statut: 'recu', montantPrevu: prevu, montantRecu: recu, ecart: soustraire(recu, prevu) }
  }

  /** Revenu versé à part : prévu à sa date, reçu quand un revenu reçu y est lié. */
  function prevuAPart(source: SourceRevenu, moisVersement: CleMois): RevenuPrevu {
    const datePrevue = dateDeVersement(source, moisVersement)
    const recu = revenusRecus.find((r) => r.sourceId === source.id && r.moisOccurrence === moisVersement)
    return {
      sourceId: source.id,
      libelle: source.libelle,
      type: source.type,
      certitude: source.certitude,
      versement: source.versement,
      moisVersement,
      datePrevue,
      dateReelle: recu?.date ?? null,
      moisBudget: moisContenant(recu?.date ?? datePrevue).cle,
      statut: recu ? 'recu' : datePrevue < donnees.aujourdhui ? 'enRetard' : 'prevu',
      montantPrevu: source.montant,
      montantRecu: recu?.montant ?? null,
      ecart: recu ? soustraire(recu.montant, source.montant) : null,
      revenuRecuId: recu?.id ?? null,
    }
  }

  /** Versements prévus des sources, par mois civil de versement, dans l'ordre des dates. */
  function revenusPrevus(du: CleMois, au: CleMois): RevenuPrevu[] {
    const liste = (donnees.sources ?? []).flatMap((source) =>
      moisDeVersement(source, du, au).flatMap((m) => (source.versement === 'avecPaie' ? (prevuAvecPaie(source, m) ?? []) : prevuAPart(source, m))),
    )
    return liste.sort((a, b) => (a.datePrevue < b.datePrevue ? -1 : a.datePrevue > b.datePrevue ? 1 : a.libelle.localeCompare(b.libelle)))
  }

  const etats = new Map<string, EtatDette>(dettes.map((d) => [d.id, etatDette(d, paiementsDettes, donnees.aujourdhui)]))

  /**
   * Charges prévues d'un mois budgétaire : fixes datées dans le mois, enveloppes, ponctuels, échéances.
   * Une échéance passée garde son montant prévu ; une échéance à venir ne compte que ce qui reste dû (R9).
   */
  function chargesDuMois(cle: CleMois): ChargesDuMois {
    const periode = mois(cle)
    const dans = (date: DateCivile) => date >= periode.debut && date <= periode.fin
    const moisCivils = moisEntre(moisDe(periode.debut), moisDe(periode.fin))
    const lignes: ChargePrevue[] = []

    for (const c of charges) {
      if (c.nature === 'enveloppe') {
        if (enveloppeActive(c, cle)) {
          lignes.push({ origine: 'enveloppe', id: c.id, libelle: c.libelle, categorieId: c.categorieId, date: null, montant: c.montant, essentielle: c.essentielle, certitude: 'garanti' })
        }
        continue
      }
      for (const m of moisCivils) {
        if (!chargeCeMois(c, m)) continue
        const date = dateDeCharge(c, m)
        if (dans(date)) lignes.push({ origine: 'fixe', id: c.id, libelle: c.libelle, categorieId: c.categorieId, date, montant: c.montant, essentielle: c.essentielle, certitude: 'garanti' })
      }
    }
    for (const p of ponctuels) {
      if (dans(p.date)) lignes.push({ origine: 'ponctuel', id: p.id, libelle: p.libelle, categorieId: p.categorieId, date: p.date, montant: p.montant, essentielle: false, certitude: p.certitude })
    }
    for (const d of dettes) {
      for (const e of etats.get(d.id)!.echeances) {
        if (!dans(e.date)) continue
        const montant = e.date < donnees.aujourdhui ? e.montant : e.attendu
        if (montant === 0) continue
        lignes.push({
          origine: 'dette',
          id: d.id,
          libelle: d.libelle,
          categorieId: null,
          date: e.date,
          montant,
          essentielle: true,
          certitude: 'garanti',
          echeance: { numero: e.numero, statut: e.statut },
        })
      }
    }

    lignes.sort((a, b) => (a.date ?? '9').localeCompare(b.date ?? '9') || a.libelle.localeCompare(b.libelle))
    const total = (origine?: ChargePrevue['origine']) =>
      additionner(...lignes.filter((l) => !origine || l.origine === origine).map((l) => l.montant))
    return {
      lignes,
      totaux: { fixe: total('fixe'), enveloppe: total('enveloppe'), ponctuel: total('ponctuel'), dette: total('dette'), total: total() },
    }
  }

  return {
    mode: cycle ? ('cyclePaie' as const) : ('calendaire' as const),
    revenusPrevus,
    chargesDuMois,
    etatDette: (id: string) => etats.get(id) ?? null,
    /** Vrai si l'utilisateur a choisi le cycle de paie mais n'a pas encore de contrat. */
    sansContrat: mode === 'cyclePaie' && !paies.aContrat,
    paies,
    mois,
    moisContenant,
    moisCourant: () => moisContenant(donnees.aujourdhui),
  }
}

/**
 * Semaines d'une période. `debutSemaine` : 1 = lundi … 7 = dimanche.
 * La première et la dernière semaine sont partielles si la période ne tombe pas pile.
 */
export function semainesDe(periode: { debut: DateCivile; fin: DateCivile }, debutSemaine = 1): Semaine[] {
  const dernierJourSemaine = debutSemaine === 1 ? 7 : debutSemaine - 1
  const semaines: Semaine[] = []
  let debut = periode.debut
  while (debut <= periode.fin) {
    let fin = debut
    while (jourSemaine(fin) !== dernierJourSemaine && fin < periode.fin) fin = ajouterJours(fin, 1)
    const nbJours = ecartJours(debut, fin) + 1
    semaines.push({ numero: semaines.length + 1, debut, fin, nbJours, partielle: nbJours < 7 })
    debut = ajouterJours(fin, 1)
  }
  return semaines
}

/** Répartit un montant sur les semaines, au prorata des jours, sans perdre un centime. */
export function repartirSurSemaines(total: Centimes, semaines: Semaine[]): Centimes[] {
  return repartir(
    total,
    semaines.map((s) => s.nbJours),
  )
}
