import { additionner, centimes, repartir, soustraire, type Centimes } from './argent'
import { chargeCeMois, dateDeCharge, enveloppeActive, etatDette, type Charge, type Dette, type EtatDette, type PaiementDette, type Ponctuel } from './charges'
import { couvrir, somme, type Depense, type Imputation, type StatutCouverture } from './depenses'
import { epargneNette, epargneObjectif, type MouvementEpargne, type Objectif } from './epargne'
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
/** `fige` : borne d'un mois clôturé, qui ne bouge plus (Plan.md § 7.1). */
export type SourceBorne = SourceDebut | 'calendaire' | 'fige'
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
  depenses?: Depense[]
}

/** Une ligne d'épargne d'un mois : versement prévu à un objectif et/ou versements réels (R11 : jamais une dépense). */
export interface LigneEpargne {
  /** `null` : épargne libre (sans objectif). */
  objectifId: string | null
  libelle: string
  /** Versement mensuel choisi (au plus le restant au début du mois) ; `null` si rien n'était prévu. */
  prevu: Centimes | null
  /** Versements − retraits du mois (réel). */
  reel: Centimes
}

/** Bornes figées d'un mois clôturé. */
export interface BornesFigees {
  cle: CleMois
  debut: DateCivile
  fin: DateCivile
}

/** Charge fixe ou ponctuel prévu dans un mois budgétaire, avec ce que les dépenses liées en couvrent. */
export interface LigneAPayer {
  origine: 'fixe' | 'ponctuel'
  id: string
  libelle: string
  categorieId: string
  /** Date prévue (pour une charge fixe : l'échéance). */
  date: DateCivile
  moisBudget: CleMois
  /** Prévu. */
  montant: Centimes
  /** Réel : couvert par les dépenses liées (au plus le prévu). */
  paye: Centimes
  /** Réel payé au-delà du prévu. */
  surplus: Centimes
  reste: Centimes
  statut: StatutCouverture
}

/** Enveloppe d'un mois budgétaire : budget prévu et dépensé réel, jamais mélangés. */
export interface SuiviEnveloppe {
  id: string
  libelle: string
  categorieId: string
  budget: Centimes
  depense: Centimes
  /** Budget − dépensé ; négatif si dépassé. */
  reste: Centimes
}

export interface DepenseImputee extends Depense {
  imputation: Imputation
  /** Libellé de la ligne du plan couverte ; `null` hors plan. */
  ligne: string | null
}

/** Le réel d'un mois budgétaire (Plan.md § 7.2) et l'état des lignes prévues à payer. */
export interface SuiviDuMois {
  depenses: DepenseImputee[]
  paiementsDettes: PaiementDette[]
  lignes: LigneAPayer[]
  enveloppes: SuiviEnveloppe[]
  /** Réel uniquement. */
  totaux: Record<Imputation | 'dette' | 'total', Centimes>
  /** Prévu encore attendu : lignes pas encore couvertes, budget d'enveloppe restant, échéances de dettes non payées. */
  restePrevu: Record<'lignes' | 'enveloppes' | 'dettes' | 'total', Centimes>
}

export type Calendrier = ReturnType<typeof creerCalendrier>

export function creerCalendrier({
  mode,
  revenusRecus = [],
  charges = [],
  ponctuels = [],
  dettes = [],
  paiementsDettes = [],
  depenses = [],
  moisClotures = [],
  objectifs = [],
  mouvementsEpargne = [],
  ...donnees
}: DonneesSalaire &
  DonneesCharges & {
    mode: ModePeriode
    revenusRecus?: RevenuRecu[]
    moisClotures?: BornesFigees[]
    objectifs?: Objectif[]
    mouvementsEpargne?: MouvementEpargne[]
  }) {
  const paies = creerCalendrierPaie(donnees)
  /** Sans contrat, le cycle de paie n'est pas défini : on retombe sur le mois civil. */
  const cycle = mode === 'cyclePaie' && paies.aContrat

  const figes = new Map(moisClotures.map((m) => [m.cle, m]))

  /** Début d'un mois. Un mois clôturé garde ses bornes ; le mois qui le suit commence le lendemain de sa fin. */
  function borne(cle: CleMois): { date: DateCivile; source: SourceBorne } {
    const fige = figes.get(cle)
    if (fige) return { date: fige.debut, source: 'fige' }
    const precedent = figes.get(decalerMois(cle, -1))
    if (precedent) return { date: ajouterJours(precedent.fin, 1), source: 'fige' }
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
    const fige = figes.get(cle)
    const fin = fige ? fige.fin : cycle || suivant.source === 'fige' ? ajouterJours(suivant.date, -1) : dernierJour(cle)
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
  /** Échéances d'une charge fixe dans un mois budgétaire (parfois deux, parfois aucune). */
  function echeancesDuMois(c: Charge, periode: MoisBudgetaire): DateCivile[] {
    return moisEntre(moisDe(periode.debut), moisDe(periode.fin))
      .filter((m) => chargeCeMois(c, m))
      .map((m) => dateDeCharge(c, m))
      .filter((date) => date >= periode.debut && date <= periode.fin)
  }

  function chargesDuMois(cle: CleMois): ChargesDuMois {
    const periode = mois(cle)
    const dans = (date: DateCivile) => date >= periode.debut && date <= periode.fin
    const lignes: ChargePrevue[] = []

    for (const c of charges) {
      if (c.nature === 'enveloppe') {
        if (enveloppeActive(c, cle)) {
          lignes.push({ origine: 'enveloppe', id: c.id, libelle: c.libelle, categorieId: c.categorieId, date: null, montant: c.montant, essentielle: c.essentielle, certitude: 'garanti' })
        }
        continue
      }
      for (const date of echeancesDuMois(c, periode)) {
        lignes.push({ origine: 'fixe', id: c.id, libelle: c.libelle, categorieId: c.categorieId, date, montant: c.montant, essentielle: c.essentielle, certitude: 'garanti' })
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

  const parCharge = new Map(charges.map((c) => [c.id, c]))
  const parPonctuel = new Map(ponctuels.map((p) => [p.id, p]))
  const parDette = new Set(dettes.map((d) => d.id))

  /** Imputation d'une dépense (R10) ; un lien vers une ligne disparue la laisse hors plan. */
  function imputer(d: Depense): DepenseImputee {
    const charge = d.chargeId ? parCharge.get(d.chargeId) : undefined
    const ponctuel = d.ponctuelId ? parPonctuel.get(d.ponctuelId) : undefined
    if (charge?.nature === 'enveloppe') return { ...d, imputation: 'enveloppe', ligne: charge.libelle }
    if (charge?.nature === 'fixe' && d.echeance) return { ...d, imputation: 'fixe', ligne: charge.libelle }
    if (ponctuel) return { ...d, imputation: 'ponctuel', ligne: ponctuel.libelle }
    return { ...d, imputation: 'horsPlan', ligne: null }
  }

  /** Mois budgétaire couvert par le paiement d'une échéance (mémorisé : la recherche du mois coûte). */
  const moisDesEcheances = new Map<DateCivile, CleMois>()
  function moisEcheance(date: DateCivile): CleMois {
    let cle = moisDesEcheances.get(date)
    if (!cle) moisDesEcheances.set(date, (cle = moisContenant(date).cle))
    return cle
  }

  /**
   * Réel d'un mois budgétaire : dépenses et paiements de dettes datés dans le mois.
   * Les lignes à payer sont les charges fixes et ponctuels prévus du mois, couverts par les dépenses liées,
   * même payées un autre mois (paiement en avance).
   */
  function suiviDuMois(cle: CleMois): SuiviDuMois {
    const periode = mois(cle)
    const dans = (date: DateCivile) => date >= periode.debut && date <= periode.fin
    const reelles = depenses
      .filter((d) => dans(d.date))
      .map(imputer)
      .sort((a, b) => b.date.localeCompare(a.date))
    const lignes: LigneAPayer[] = []

    for (const c of charges) {
      if (c.nature !== 'fixe') continue
      const dates = echeancesDuMois(c, periode)
      if (dates.length === 0) continue
      const liees = depenses.filter((d) => d.chargeId === c.id && d.echeance && moisEcheance(d.echeance) === cle)
      const base = { origine: 'fixe' as const, id: c.id, libelle: c.libelle, categorieId: c.categorieId, moisBudget: cle }
      lignes.push(...couvrir(dates.map((date) => ({ ...base, date, montant: c.montant })), somme(liees), donnees.aujourdhui))
    }
    for (const p of ponctuels) {
      if (!dans(p.date)) continue
      const liees = depenses.filter((d) => d.ponctuelId === p.id)
      const base = { origine: 'ponctuel' as const, id: p.id, libelle: p.libelle, categorieId: p.categorieId, moisBudget: cle }
      lignes.push(...couvrir([{ ...base, date: p.date, montant: p.montant }], somme(liees), donnees.aujourdhui))
    }
    lignes.sort((a, b) => a.date.localeCompare(b.date) || a.libelle.localeCompare(b.libelle))

    const enveloppes: SuiviEnveloppe[] = charges
      .filter((c) => c.nature === 'enveloppe' && enveloppeActive(c, cle))
      .map((c) => {
        const depense = somme(reelles.filter((d) => d.chargeId === c.id))
        return { id: c.id, libelle: c.libelle, categorieId: c.categorieId, budget: c.montant, depense, reste: soustraire(c.montant, depense) }
      })

    const paiements = paiementsDettes.filter((p) => parDette.has(p.detteId) && dans(p.date)).sort((a, b) => b.date.localeCompare(a.date))
    const total = (i: Imputation) => somme(reelles.filter((d) => d.imputation === i))
    const dette = somme(paiements)
    const totaux = { fixe: total('fixe'), enveloppe: total('enveloppe'), ponctuel: total('ponctuel'), horsPlan: total('horsPlan'), dette }
    const restePrevu = {
      lignes: additionner(...lignes.map((l) => l.reste)),
      enveloppes: additionner(...enveloppes.map((e) => centimes(Math.max(0, e.reste)))),
      dettes: additionner(...[...etats.values()].flatMap((e) => e.echeances.filter((x) => dans(x.date)).map((x) => x.attendu))),
    }
    return {
      depenses: reelles,
      paiementsDettes: paiements,
      lignes,
      enveloppes,
      totaux: { ...totaux, total: additionner(somme(reelles), dette) },
      restePrevu: { ...restePrevu, total: additionner(restePrevu.lignes, restePrevu.enveloppes, restePrevu.dettes) },
    }
  }

  /** Jours après la date d'une dépense où une échéance peut être payée en avance. */
  const AVANCE_JOURS = 10

  /**
   * Lignes auxquelles rattacher une dépense datée (UX.md § 4.3) : charges fixes et ponctuels pas entièrement payés
   * du mois de la date, échéances des 10 jours suivants, enveloppes du mois.
   */
  function rattachements(date: DateCivile): { mois: CleMois; lignes: LigneAPayer[]; enveloppes: SuiviEnveloppe[] } {
    const cle = moisContenant(date).cle
    const suivi = suiviDuMois(cle)
    const limite = ajouterJours(date, AVANCE_JOURS)
    const avance = mois(decalerMois(cle, 1)).debut <= limite ? suiviDuMois(decalerMois(cle, 1)).lignes.filter((l) => l.date <= limite) : []
    return { mois: cle, lignes: [...suivi.lignes, ...avance].filter((l) => l.reste > 0), enveloppes: suivi.enveloppes }
  }

  const dansMois = (cle: CleMois) => {
    const periode = mois(cle)
    return (date: DateCivile) => date >= periode.debut && date <= periode.fin
  }

  /** Revenus reçus sans source (cadeau, remboursement…) datés dans le mois : du réel sans prévu. */
  function revenusLibres(cle: CleMois): RevenuRecu[] {
    const dans = dansMois(cle)
    return revenusRecus.filter((r) => !r.sourceId && dans(r.date)).sort((a, b) => a.date.localeCompare(b.date))
  }

  /** Échéances de dettes datées dans le mois, avec leur couverture par les paiements (R9). */
  function echeancesDettes(cle: CleMois) {
    const dans = dansMois(cle)
    return dettes.flatMap((d) => etats.get(d.id)!.echeances.filter((e) => dans(e.date)).map((e) => ({ ...e, detteId: d.id, libelle: d.libelle })))
  }

  /** Sorties réelles datées entre deux dates incluses : dépenses imputées et paiements de dettes. */
  function sortiesEntre(du: DateCivile, au: DateCivile): { depenses: DepenseImputee[]; paiementsDettes: PaiementDette[] } {
    const dans = (date: DateCivile) => date >= du && date <= au
    return {
      depenses: depenses.filter((d) => dans(d.date)).map(imputer),
      paiementsDettes: paiementsDettes.filter((p) => parDette.has(p.detteId) && dans(p.date)),
    }
  }

  /**
   * Épargne d'un mois budgétaire : par objectif, le versement mensuel prévu (objectif actif, créé avant la fin du mois,
   * au plus ce qui restait à épargner au début du mois) et les versements réels ; l'épargne libre à part.
   */
  function epargneDuMois(cle: CleMois): { lignes: LigneEpargne[]; prevue: Centimes; reelle: Centimes } {
    const periode = mois(cle)
    const dans = (m: MouvementEpargne) => m.type !== 'achat' && m.date >= periode.debut && m.date <= periode.fin
    const lignes: LigneEpargne[] = []
    for (const o of [...objectifs].sort((a, b) => a.priorite - b.priorite)) {
      const reel = additionner(...mouvementsEpargne.filter((m) => m.objectifId === o.id && dans(m)).map((m) => m.montant))
      let prevu: Centimes | null = null
      if (o.versementMensuel && o.statut === 'actif' && o.creeLe <= periode.fin) {
        const restant = Math.max(0, o.montantCible - epargneObjectif(o, mouvementsEpargne, ajouterJours(periode.debut, -1)))
        prevu = restant > 0 ? centimes(Math.min(o.versementMensuel, restant)) : null
      }
      if (prevu !== null || reel !== 0) lignes.push({ objectifId: o.id, libelle: o.libelle, prevu, reel })
    }
    const libre = additionner(...mouvementsEpargne.filter((m) => m.objectifId === null && dans(m)).map((m) => m.montant))
    if (libre !== 0) lignes.push({ objectifId: null, libelle: 'Épargne libre', prevu: null, reel: libre })
    return {
      lignes,
      prevue: additionner(...lignes.map((l) => l.prevu ?? centimes(0))),
      reelle: epargneNette(mouvementsEpargne, periode.debut, periode.fin),
    }
  }

  /** Date de la première dépense notée : avant, aucune moyenne n'a de sens. */
  const debutSuivi: DateCivile | null = depenses.reduce<DateCivile | null>((min, d) => (min === null || d.date < min ? d.date : min), null)

  /** Première donnée réelle notée (paie reçue, revenu reçu, dépense, paiement de dette) : début du cumul de mois en mois. */
  const debutDonnees: DateCivile | null =
    [...donnees.paies.flatMap((p) => (p.dateReelle ? [p.dateReelle] : [])), ...revenusRecus.map((r) => r.date), ...depenses.map((d) => d.date), ...paiementsDettes.map((p) => p.date)].sort()[0] ?? null

  return {
    mode: cycle ? ('cyclePaie' as const) : ('calendaire' as const),
    revenusPrevus,
    chargesDuMois,
    suiviDuMois,
    rattachements,
    revenusLibres,
    echeancesDettes,
    sortiesEntre,
    debutSuivi,
    debutDonnees,
    epargneDuMois,
    /** Épargne nette (réelle) entre deux dates incluses. */
    epargneEntre: (du: DateCivile, au: DateCivile) => epargneNette(mouvementsEpargne, du, au),
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
