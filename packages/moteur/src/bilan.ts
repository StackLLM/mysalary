import { additionner, centimes, soustraire, type Centimes } from './argent'
import { ajouterJours, decalerMois, ecartJours, type CleMois, type DateCivile } from './dates'
import { budgetEnveloppesParJour } from './enveloppes'
import type { Calendrier, MoisBudgetaire } from './periodes'

/**
 * Bilan d'un mois budgétaire (Plan.md § 7.2, UX.md § 4.7) : chaque ligne prévue à côté de son réel.
 * Le prévu et le réel restent deux colonnes distinctes ; l'écart n'existe que lorsque le réel est connu.
 */

export type FamilleBilan = 'revenu' | 'fixe' | 'enveloppe' | 'ponctuel' | 'dette' | 'horsPlan' | 'autreMois' | 'epargne'

/**
 * - `confirme` : réel connu (reçu, payé, ou réel sans prévu) ;
 * - `partiel` : en partie payé ;
 * - `enCours` : enveloppe d'un mois pas terminé ;
 * - `prevu` / `enRetard` : pas encore confirmé.
 */
export type StatutLigneBilan = 'confirme' | 'partiel' | 'enCours' | 'prevu' | 'enRetard'

/** Ce que l'écran doit ouvrir pour confirmer la ligne. */
export type CibleBilan =
  | { type: 'paie'; mois: CleMois }
  | { type: 'revenu'; sourceId: string; moisVersement: CleMois }
  | { type: 'charge'; id: string; date: DateCivile; categorieId: string }
  | { type: 'ponctuel'; id: string; date: DateCivile; categorieId: string }
  | { type: 'dette'; id: string }
  | { type: 'objectif'; id: string }
  | null

export interface LigneBilan {
  /** Clé unique dans le bilan. */
  cle: string
  famille: FamilleBilan
  libelle: string
  /** Date prévue (ou réelle si reçue) ; `null` pour une enveloppe ou un total. */
  date: DateCivile | null
  /** `null` : rien n'était prévu (revenu libre, hors plan). */
  prevu: Centimes | null
  /** `null` : pas encore de réel. */
  reel: Centimes | null
  /** Réel − prévu, seulement quand la ligne est confirmée (ou enveloppe d'un mois terminé). */
  ecart: Centimes | null
  statut: StatutLigneBilan
  cible: CibleBilan
}

export interface TotauxBilan {
  revenusPrevus: Centimes
  revenusReels: Centimes
  chargesPrevues: Centimes
  /** Argent sorti dans le mois : dépenses et paiements de dettes datés dans le mois (lot 7). */
  sortiesReelles: Centimes
  restePrevu: Centimes
  resteReel: Centimes
  /** Reste réel − reste prévu ; `null` tant que le mois n'est pas terminé. */
  ecart: Centimes | null
}

export interface BilanDuMois {
  mois: MoisBudgetaire
  lignes: LigneBilan[]
  totaux: TotauxBilan
  /** Mois en cours : estimation de fin de mois (R23), toujours présentée comme telle. */
  estimation: { revenusAttendus: Centimes; chargesAttendues: Centimes; resteFinDeMois: Centimes } | null
  /** Lignes prévues pas encore confirmées (l'épargne n'en fait pas partie). */
  aConfirmer: LigneBilan[]
  /**
   * Épargne du mois (R11 : jamais une dépense, hors des charges et des sorties) : prévue = versements mensuels choisis,
   * réelle = versements − retraits. `null` dans un bilan figé avant le lot 10.
   */
  epargne: { prevue: Centimes; reelle: Centimes } | null
}

const STATUTS_PAIE = { recue: 'confirme', enRetard: 'enRetard', prevue: 'prevu' } as const
const STATUTS_COUVERTURE = { payee: 'confirme', partielle: 'partiel', enRetard: 'enRetard', prevue: 'prevu' } as const

const ecartSi = (statut: StatutLigneBilan, prevu: Centimes | null, reel: Centimes | null) =>
  statut === 'confirme' && prevu !== null && reel !== null ? soustraire(reel, prevu) : null

const somme = (valeurs: (Centimes | null)[]) => additionner(...valeurs.map((v) => v ?? centimes(0)))

export function bilanDuMois(calendrier: Calendrier, cle: CleMois): BilanDuMois {
  const mois = calendrier.mois(cle)
  const termine = mois.statut === 'passe'
  const revenus: LigneBilan[] = []
  const charges: LigneBilan[] = []

  // Paie qui finance le mois : une ligne par ligne de paie (salaire, primes, sources « avec la paie »).
  const paie = calendrier.paies.paie(cle)
  if (paie) {
    const statut = STATUTS_PAIE[paie.statut]
    paie.lignes.forEach((l, i) => {
      const reel = paie.statut === 'recue' ? (l.montantRecu ?? centimes(0)) : null
      revenus.push({
        cle: `paie:${i}`,
        famille: 'revenu',
        libelle: l.libelle,
        date: paie.dateReelle ?? paie.datePrevue,
        prevu: l.montantPrevu,
        reel,
        ecart: ecartSi(statut, l.montantPrevu, reel),
        statut,
        cible: { type: 'paie', mois: cle },
      })
    })
  }

  // Revenus versés à part dont le mois budgétaire est celui-ci.
  for (const r of calendrier.revenusPrevus(decalerMois(cle, -2), decalerMois(cle, 1))) {
    if (r.versement !== 'dateSeparee' || r.moisBudget !== cle) continue
    const statut = r.statut === 'recu' ? 'confirme' : r.statut
    revenus.push({
      cle: `revenu:${r.sourceId}:${r.moisVersement}`,
      famille: 'revenu',
      libelle: r.libelle,
      date: r.dateReelle ?? r.datePrevue,
      prevu: r.montantPrevu,
      reel: r.montantRecu,
      ecart: ecartSi(statut, r.montantPrevu, r.montantRecu),
      statut,
      cible: { type: 'revenu', sourceId: r.sourceId, moisVersement: r.moisVersement },
    })
  }

  for (const r of calendrier.revenusLibres(cle)) {
    revenus.push({ cle: `libre:${r.id}`, famille: 'revenu', libelle: r.libelle, date: r.date, prevu: null, reel: r.montant, ecart: null, statut: 'confirme', cible: null })
  }

  const suivi = calendrier.suiviDuMois(cle)
  for (const l of suivi.lignes) {
    const statut = STATUTS_COUVERTURE[l.statut]
    const reel = l.paye + l.surplus > 0 ? additionner(l.paye, l.surplus) : null
    charges.push({
      cle: `${l.origine}:${l.id}:${l.date}`,
      famille: l.origine,
      libelle: l.libelle,
      date: l.date,
      prevu: l.montant,
      reel,
      ecart: ecartSi(statut, l.montant, reel),
      statut,
      cible: { type: l.origine === 'fixe' ? 'charge' : 'ponctuel', id: l.id, date: l.date, categorieId: l.categorieId },
    })
  }
  for (const e of suivi.enveloppes) {
    const statut = termine ? 'confirme' : 'enCours'
    charges.push({ cle: `enveloppe:${e.id}`, famille: 'enveloppe', libelle: e.libelle, date: null, prevu: e.budget, reel: e.depense, ecart: termine ? soustraire(e.depense, e.budget) : null, statut, cible: null })
  }
  for (const e of calendrier.echeancesDettes(cle)) {
    const statut = STATUTS_COUVERTURE[e.statut]
    const couvert = soustraire(e.montant, e.attendu)
    const reel = couvert > 0 ? couvert : null
    charges.push({
      cle: `dette:${e.detteId}:${e.numero}`,
      famille: 'dette',
      libelle: e.libelle,
      date: e.date,
      prevu: e.montant,
      reel,
      ecart: ecartSi(statut, e.montant, reel),
      statut,
      cible: { type: 'dette', id: e.detteId },
    })
  }
  if (suivi.totaux.horsPlan > 0) {
    charges.push({ cle: 'horsPlan', famille: 'horsPlan', libelle: 'Hors plan', date: null, prevu: null, reel: suivi.totaux.horsPlan, ecart: null, statut: 'confirme', cible: null })
  }

  // Écart entre l'argent sorti ce mois et le réel des lignes : paiement en avance ou en retard. Jamais caché.
  const sortiesReelles = suivi.totaux.total
  const autreMois = soustraire(sortiesReelles, somme(charges.map((l) => l.reel)))
  if (autreMois !== 0) {
    const libelle = autreMois > 0 ? 'Payé ce mois pour un autre mois' : 'Déjà payé un autre mois'
    charges.push({ cle: 'autreMois', famille: 'autreMois', libelle, date: null, prevu: null, reel: autreMois, ecart: null, statut: 'confirme', cible: null })
  }

  charges.sort((a, b) => ORDRE[a.famille] - ORDRE[b.famille] || (a.date ?? '').localeCompare(b.date ?? '') || a.libelle.localeCompare(b.libelle))

  // Épargne : comme une enveloppe, son écart n'est connu qu'une fois le mois terminé.
  const epargne = calendrier.epargneDuMois(cle)
  const lignesEpargne: LigneBilan[] = epargne.lignes.map((l) => ({
    cle: `epargne:${l.objectifId ?? 'libre'}`,
    famille: 'epargne',
    libelle: l.libelle,
    date: null,
    prevu: l.prevu,
    reel: l.reel,
    ecart: termine && l.prevu !== null ? soustraire(l.reel, l.prevu) : null,
    statut: termine || l.prevu === null ? 'confirme' : 'enCours',
    cible: l.objectifId ? { type: 'objectif', id: l.objectifId } : null,
  }))
  const lignes = [...revenus, ...charges, ...lignesEpargne]

  const revenusPrevus = somme(revenus.map((l) => l.prevu))
  const revenusReels = somme(revenus.map((l) => l.reel))
  const chargesPrevues = somme(charges.map((l) => l.prevu))
  const restePrevu = soustraire(revenusPrevus, chargesPrevues)
  const resteReel = soustraire(revenusReels, sortiesReelles)
  const aConfirmer = lignes.filter((l) => l.famille !== 'epargne' && (l.statut === 'prevu' || l.statut === 'enRetard' || l.statut === 'partiel'))

  let estimation: BilanDuMois['estimation'] = null
  if (mois.statut === 'enCours') {
    const revenusAttendus = somme(revenus.filter((l) => l.statut !== 'confirme').map((l) => l.prevu))
    const chargesAttendues = suivi.restePrevu.total
    estimation = {
      revenusAttendus,
      chargesAttendues,
      resteFinDeMois: soustraire(additionner(revenusReels, revenusAttendus), additionner(sortiesReelles, chargesAttendues)),
    }
  }

  return {
    mois,
    lignes,
    totaux: { revenusPrevus, revenusReels, chargesPrevues, sortiesReelles, restePrevu, resteReel, ecart: termine ? soustraire(resteReel, restePrevu) : null },
    estimation,
    aConfirmer,
    epargne: { prevue: epargne.prevue, reelle: epargne.reelle },
  }
}

const ORDRE: Record<FamilleBilan, number> = { revenu: 0, fixe: 1, enveloppe: 2, ponctuel: 3, dette: 4, horsPlan: 5, autreMois: 6, epargne: 7 }

export interface PointRythme {
  date: DateCivile
  /** Charges prévues cumulées : datées à leur date, enveloppes réparties par jour ou par semaine. */
  prevu: Centimes
  /** Sorties réelles cumulées ; `null` après aujourd'hui. */
  reel: Centimes | null
}

/** Rythme du mois : sorties réelles cumulées contre le prévu cumulé, jour par jour. */
export function rythmeDuMois(calendrier: Calendrier, cle: CleMois, aujourdhui: DateCivile, debutSemaine = 1): PointRythme[] {
  const mois = calendrier.mois(cle)
  const suivi = calendrier.suiviDuMois(cle)
  const jours = Array.from({ length: mois.nbJours }, (_, i) => ajouterJours(mois.debut, i))
  // Enveloppes : par jour, ou la part de chaque semaine dès son premier jour (réglage de chaque enveloppe).
  const enveloppes = budgetEnveloppesParJour(calendrier, cle, debutSemaine)
  // Prévu daté : le montant de l'échéancier pour les dettes (pas le reste attendu), comme dans le bilan.
  const datees = new Map<DateCivile, number>()
  for (const l of suivi.lignes) datees.set(l.date, (datees.get(l.date) ?? 0) + l.montant)
  for (const e of calendrier.echeancesDettes(cle)) datees.set(e.date, (datees.get(e.date) ?? 0) + e.montant)
  const sorties = new Map<DateCivile, number>()
  for (const d of [...suivi.depenses, ...suivi.paiementsDettes]) sorties.set(d.date, (sorties.get(d.date) ?? 0) + d.montant)

  let prevu = 0
  let reel = 0
  return jours.map((date, i) => {
    prevu += (datees.get(date) ?? 0) + enveloppes[i]!
    reel += sorties.get(date) ?? 0
    return { date, prevu: centimes(prevu), reel: ecartJours(date, aujourdhui) >= 0 ? centimes(reel) : null }
  })
}
