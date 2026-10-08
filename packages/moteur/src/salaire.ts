import { additionner, centimes, soustraire, type Centimes } from './argent'
import { verseCeMois, type SourceRevenu } from './revenus'
import {
  ajouterJours,
  dateCivile,
  decalerMois,
  ecartJours,
  estWeekEnd,
  joursDansMois,
  moisEntre,
  partiesMois,
  type CleMois,
  type DateCivile,
} from './dates'

/**
 * Salaire et cycle de paie (Plan.md § 7.1, context.md R27–R30).
 *
 * - Le **contrat** dit ce qui est habituel. Il est versionné par mois financé.
 * - La **paie** de chaque mois est calculée depuis le contrat (prévue), puis confirmée (reçue).
 * - Seules les paies sur lesquelles l'utilisateur a agi sont enregistrées.
 */

export const REGLES_JOUR_NON_OUVRE = ['avant', 'apres', 'aucune'] as const
export type RegleJourNonOuvre = (typeof REGLES_JOUR_NON_OUVRE)[number]

export const CERTITUDES = ['garanti', 'probable', 'incertain'] as const
export type Certitude = (typeof CERTITUDES)[number]

export interface VersionContrat {
  id: string
  /** Premier mois financé par cette version. */
  moisEffet: CleMois
  montantNet: Centimes
  /** 1 à 31. */
  jourHabituel: number
  regleJourNonOuvre: RegleJourNonOuvre
  /** La paie versée en janvier finance février. */
  financeMoisSuivant: boolean
}

export interface LignePaie {
  /** `null` pour la ligne de salaire calculée depuis le contrat (pas encore enregistrée). */
  id: string | null
  type: 'salaire' | 'prime'
  libelle: string
  certitude: Certitude
  /** `null` : ligne non prévue, ajoutée à la réception. */
  montantPrevu: Centimes | null
  /** `null` tant que la paie n'est pas reçue. */
  montantRecu: Centimes | null
  /** Prime venue d'une source de revenus récurrente (lot 5), sinon `null`. */
  sourceId: string | null
}

/** Paie telle qu'enregistrée : primes prévues, ou paie reçue complète. */
export interface PaieEnregistree {
  moisFinance: CleMois
  dateReelle: DateCivile | null
  /** Copie de la date prévue au moment de la réception. */
  datePrevue: DateCivile | null
  lignes: LignePaie[]
}

export type StatutPaie = 'prevue' | 'enRetard' | 'recue'

/** D'où vient la date de début du mois : paie reçue, paie prévue, ou paie en retard attendue. */
export type SourceDebut = 'reelle' | 'prevue' | 'attendue'

export interface PaieCalculee {
  mois: CleMois
  versionId: string | null
  statut: StatutPaie
  datePrevue: DateCivile
  dateReelle: DateCivile | null
  /** Premier jour du mois budgétaire financé par cette paie. */
  debutMois: DateCivile
  sourceDebut: SourceDebut
  joursDeRetard: number
  lignes: LignePaie[]
  totalPrevu: Centimes
  totalRecu: Centimes | null
  /** Reçu − prévu, une fois la paie reçue. */
  ecart: Centimes | null
}

export interface DonneesSalaire {
  contrats: VersionContrat[]
  paies: PaieEnregistree[]
  /** Date du jour : le moteur ne lit jamais l'horloge (Plan.md § 7.6). */
  aujourdhui: DateCivile
  /** Sources de revenus : celles versées « avec la paie » ajoutent une ligne aux paies prévues. */
  sources?: SourceRevenu[]
}

export type ProblemeReception =
  | { code: 'futur' }
  | { code: 'sansContrat' }
  | { code: 'avantPrecedente'; mois: CleMois; date: DateCivile }
  | { code: 'apresSuivante'; mois: CleMois; date: DateCivile }

/** Garde-fou : aucune boucle ne parcourt plus de 100 ans de paies. */
const LIMITE_MOIS = 1200

/** Date prévue de la paie qui finance `mois`, selon une version du contrat. */
export function datePrevuePaie(mois: CleMois, version: Omit<VersionContrat, 'id' | 'moisEffet' | 'montantNet'>): DateCivile {
  const moisVersement = version.financeMoisSuivant ? decalerMois(mois, -1) : mois
  const { annee, mois: m } = partiesMois(moisVersement)
  let date = dateCivile(annee, m, Math.min(version.jourHabituel, joursDansMois(annee, m)))
  if (version.regleJourNonOuvre !== 'aucune') {
    const pas = version.regleJourNonOuvre === 'avant' ? -1 : 1
    while (estWeekEnd(date)) date = ajouterJours(date, pas)
  }
  return date
}

const somme = (montants: (Centimes | null)[]) => additionner(...montants.map((m) => m ?? centimes(0)))

export type CalendrierPaie = ReturnType<typeof creerCalendrierPaie>

/** Rassemble contrat et paies enregistrées pour répondre à toutes les questions de dates. */
export function creerCalendrierPaie({ contrats, paies, aujourdhui, sources = [] }: DonneesSalaire) {
  const versions = [...contrats].sort((a, b) => (a.moisEffet < b.moisEffet ? -1 : 1))
  const enregistrees = new Map(paies.map((p) => [p.moisFinance, p]))
  const demain = ajouterJours(aujourdhui, 1)

  /** Version qui s'applique au mois, ou `null` avant le premier contrat. */
  function version(mois: CleMois): VersionContrat | null {
    let trouvee: VersionContrat | null = null
    for (const v of versions) if (v.moisEffet <= mois) trouvee = v
    return trouvee
  }

  /** Avant le premier contrat, les dates suivent le motif de la première version. */
  const motif = (mois: CleMois) => version(mois) ?? versions[0] ?? null

  const recue = (mois: CleMois) => {
    const p = enregistrees.get(mois)
    return p?.dateReelle ? p : null
  }

  function datePrevue(mois: CleMois): DateCivile | null {
    const copie = recue(mois)?.datePrevue
    if (copie) return copie
    const m = motif(mois)
    return m ? datePrevuePaie(mois, m) : null
  }

  /** Date « attendue » d'une paie : réelle si reçue, sinon prévue. Sert aux bornes de validation. */
  function dateConnue(mois: CleMois): DateCivile | null {
    return recue(mois)?.dateReelle ?? datePrevue(mois)
  }

  /**
   * Paie en retard qui prolonge le mois en cours. Uniquement si la paie précédente est reçue
   * (sinon aucun mois en cours n'est connu) et si une seule paie est en retard depuis :
   * au-delà, on garde les dates prévues et on demande de confirmer.
   */
  const moisAttendu = ((): CleMois | null => {
    const dernierRecu = paies
      .filter((p) => p.dateReelle)
      .reduce<CleMois | null>((max, p) => (!max || p.moisFinance > max ? p.moisFinance : max), null)
    if (!dernierRecu || versions.length === 0) return null
    let mois = decalerMois(dernierRecu, 1)
    const enRetard: CleMois[] = []
    for (let i = 0; i < LIMITE_MOIS; i++, mois = decalerMois(mois, 1)) {
      const date = datePrevue(mois)
      if (!date || date >= aujourdhui) break
      enRetard.push(mois)
      if (enRetard.length > 1) return null
    }
    const seul = enRetard[0]
    if (!seul) return null
    const suivante = datePrevue(decalerMois(seul, 1))
    return suivante && suivante > demain ? seul : null
  })()

  /** Début du mois budgétaire financé par la paie de `mois`, et d'où vient cette date. */
  function debut(mois: CleMois): { date: DateCivile; source: SourceDebut } | null {
    const reelle = recue(mois)?.dateReelle
    if (reelle) return { date: reelle, source: 'reelle' }
    if (mois === moisAttendu) return { date: demain, source: 'attendue' }
    const prevue = datePrevue(mois)
    return prevue ? { date: prevue, source: 'prevue' } : null
  }

  /** Mois civil où la paie qui finance `mois` est versée : celui des primes « avec la paie ». */
  function moisVersement(mois: CleMois): CleMois | null {
    const m = motif(mois)
    if (!m) return null
    return m.financeMoisSuivant ? decalerMois(mois, -1) : mois
  }

  /** Primes des sources versées avec cette paie (prévues, recalculées tant que la paie n'est pas reçue). */
  function primesDesSources(mois: CleMois): LignePaie[] {
    const versement = moisVersement(mois)
    if (!versement) return []
    return sources
      .filter((s) => s.versement === 'avecPaie' && verseCeMois(s, versement))
      .map((s) => ({ id: null, type: 'prime', libelle: s.libelle, certitude: s.certitude, montantPrevu: s.montant, montantRecu: null, sourceId: s.id }))
  }

  function paie(mois: CleMois): PaieCalculee | null {
    const v = version(mois)
    const enregistree = enregistrees.get(mois)
    if (!v && !enregistree) return null
    const prevue = datePrevue(mois)
    const borne = debut(mois)
    if (!prevue || !borne) return null

    const dateReelle = enregistree?.dateReelle ?? null
    let lignes: LignePaie[]
    if (dateReelle) {
      lignes = enregistree!.lignes
    } else {
      const primes = (enregistree?.lignes ?? []).filter((l) => l.type === 'prime').map((l) => ({ ...l, montantRecu: null }))
      const salaire: LignePaie[] = v
        ? [{ id: null, type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: v.montantNet, montantRecu: null, sourceId: null }]
        : []
      lignes = [...salaire, ...primesDesSources(mois), ...primes]
    }

    const statut: StatutPaie = dateReelle ? 'recue' : prevue < aujourdhui ? 'enRetard' : 'prevue'
    const totalPrevu = somme(lignes.map((l) => l.montantPrevu))
    const totalRecu = dateReelle ? somme(lignes.map((l) => l.montantRecu)) : null
    return {
      mois,
      versionId: v?.id ?? null,
      statut,
      datePrevue: prevue,
      dateReelle,
      debutMois: borne.date,
      sourceDebut: borne.source,
      joursDeRetard: statut === 'enRetard' ? ecartJours(prevue, aujourdhui) : 0,
      lignes,
      totalPrevu,
      totalRecu,
      ecart: totalRecu === null ? null : soustraire(totalRecu, totalPrevu),
    }
  }

  /**
   * Vérifie qu'une paie peut être reçue à cette date pour ce mois (R28, R29).
   * La date doit rester entre la paie précédente et la paie suivante.
   */
  function verifierReception(mois: CleMois, date: DateCivile): ProblemeReception | null {
    if (date > aujourdhui) return { code: 'futur' }
    if (!version(mois)) return { code: 'sansContrat' }
    const precedent = decalerMois(mois, -1)
    const avant = dateConnue(precedent)
    if (avant && date <= avant) return { code: 'avantPrecedente', mois: precedent, date: avant }
    const suivant = decalerMois(mois, 1)
    const apres = dateConnue(suivant)
    if (apres && date >= apres) return { code: 'apresSuivante', mois: suivant, date: apres }
    return null
  }

  return {
    aujourdhui,
    aContrat: versions.length > 0,
    version,
    motif,
    debut,
    paie,
    moisVersement,
    paies: (du: CleMois, au: CleMois) => moisEntre(du, au).flatMap((m) => paie(m) ?? []),
    verifierReception,
  }
}
