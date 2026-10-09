import { formaterDate, formaterMois, formaterMontant, type AlerteSimulation, type SaisieAjustements, type ScenarioDto, type SimulationDto } from '@mysalary/partage'
import type { PointSimulationGraphique } from '../../components/graphiques/GraphiqueSimulation'
import { lireMontant, versSaisie } from '../salaire/saisie'

/** Leviers du simulateur tels que saisis, et leur traduction en ajustements (aucun calcul ici). */

export interface Leviers {
  /** Objectif visé par le versement et la date. */
  objectifId: string
  versement: string
  /** Mois souhaité remplacé ; vide = celui de l'objectif. */
  dateCible: string
  primeMontant: string
  primeMois: string
  reductionChargeId: string
  reductionMontant: string
  horizon: number
}

export const LEVIERS_VIDES: Omit<Leviers, 'objectifId'> = {
  versement: '',
  dateCible: '',
  primeMontant: '',
  primeMois: '',
  reductionChargeId: '',
  reductionMontant: '',
  horizon: 12,
}

/** Leviers → ajustements envoyés au moteur ; un champ vide ou invalide ne compte pas (l'erreur est rendue à part). */
export function versAjustements(l: Leviers): { ajustements: SaisieAjustements; erreurs: Record<string, string> } {
  const erreurs: Record<string, string> = {}
  const montant = (texte: string, champ: string) => {
    if (!texte.trim()) return null
    const lu = lireMontant(texte)
    if ('erreur' in lu) {
      erreurs[champ] = lu.erreur
      return null
    }
    return lu.valeur
  }
  const versement = montant(l.versement, 'versement')
  const prime = montant(l.primeMontant, 'primeMontant')
  const reduction = montant(l.reductionMontant, 'reductionMontant')
  return {
    erreurs,
    ajustements: {
      versements: l.objectifId && versement !== null ? { [l.objectifId]: versement } : {},
      datesCibles: l.objectifId && l.dateCible ? { [l.objectifId]: l.dateCible } : {},
      primes: prime !== null && l.primeMois ? [{ mois: l.primeMois, montant: prime }] : [],
      reductions: reduction !== null && l.reductionChargeId ? [{ chargeId: l.reductionChargeId, montant: reduction }] : [],
    },
  }
}

/** Scénario enregistré → leviers (un levier de chaque sorte). */
export function depuisScenario(s: ScenarioDto, objectifParDefaut: string): Leviers {
  const a = s.ajustements
  const objectifId = Object.keys(a.versements)[0] ?? Object.keys(a.datesCibles)[0] ?? objectifParDefaut
  const versement = a.versements[objectifId]
  return {
    objectifId,
    versement: versement ? versSaisie(versement) : '',
    dateCible: a.datesCibles[objectifId] ?? '',
    primeMontant: a.primes[0] ? versSaisie(a.primes[0].montant) : '',
    primeMois: a.primes[0]?.mois ?? '',
    reductionChargeId: a.reductions[0]?.chargeId ?? '',
    reductionMontant: a.reductions[0] ? versSaisie(a.reductions[0].montant) : '',
    horizon: s.horizon,
  }
}

export const aDesLeviers = (a: SaisieAjustements) =>
  Object.keys(a.versements ?? {}).length + Object.keys(a.datesCibles ?? {}).length + (a.primes?.length ?? 0) + (a.reductions?.length ?? 0) > 0

/** Ce qui changera dans le plan, en mots, avant la confirmation (le serveur rend le résumé définitif). */
export function resumeLeviers(a: SaisieAjustements, noms: { objectifs: Map<string, string>; charges: Map<string, string> }): string[] {
  const lignes: string[] = []
  for (const [id, v] of Object.entries(a.versements ?? {})) lignes.push(`« ${noms.objectifs.get(id) ?? 'Objectif'} » : versement mensuel ${v ? formaterMontant(v) : 'supprimé'}.`)
  for (const [id, m] of Object.entries(a.datesCibles ?? {})) lignes.push(`« ${noms.objectifs.get(id) ?? 'Objectif'} » : date souhaitée ${m ? formaterMois(m) : 'retirée'}.`)
  for (const p of a.primes ?? []) lignes.push(`Prime probable de ${formaterMontant(p.montant)} en ${formaterMois(p.mois)}, ajoutée à tes autres revenus.`)
  for (const r of a.reductions ?? []) lignes.push(`« ${noms.charges.get(r.chargeId) ?? 'Charge'} » baisse de ${formaterMontant(r.montant)} par mois à partir du mois prochain.`)
  return lignes
}

/** « 2 mois plus tôt », « 1 mois plus tard », « sans changement ». */
export function texteGain(mois: number | null): string {
  if (mois === null) return '—'
  if (mois === 0) return 'sans changement'
  const n = Math.abs(mois)
  return `${n} mois plus ${mois > 0 ? 'tôt' : 'tard'}`
}

export function texteAlerte(a: AlerteSimulation): string {
  return a.type === 'versements'
    ? `En ${formaterMois(a.mois)}, les versements choisis (${formaterMontant(a.demande)}) dépassent ce qui reste (${formaterMontant(a.capacite)}) : ils ne seront pas tous faits.`
    : `En ${formaterMois(a.mois)}, ton épargne passerait sous zéro (${formaterMontant(a.epargne)}) : les dépenses prévues dépassent les revenus retenus.`
}

/** Points du graphique : réel passé, « Auj. » (jonction), puis les trois scénarios mois par mois (fin de mois). */
export function pointsSimulation(s: SimulationDto): { points: PointSimulationGraphique[]; aujourdhui: string } {
  const AUJOURDHUI = 'Auj.'
  const court = (cle: string) => {
    const abrege = formaterDate(`${cle}-01`, 'court').replace(/^1 /, '')
    return cle.endsWith('-01') ? `${abrege} ${cle.slice(2, 4)}` : abrege
  }
  const e = s.epargneActuelle
  return {
    aujourdhui: AUJOURDHUI,
    points: [
      ...s.reel.map((p) => ({ periode: court(p.mois), reel: p.epargne })),
      { periode: AUJOURDHUI, reel: e, prudent: e, realiste: e, ambitieux: e },
      ...s.series.realiste.map((p, i) => ({ periode: court(p.mois), prudent: s.series.prudent[i]!.epargne, realiste: p.epargne, ambitieux: s.series.ambitieux[i]!.epargne })),
    ],
  }
}

/** « nov. 2026 » : mois court pour une liste étroite. */
export const moisCourt = (cle: string) => `${formaterDate(`${cle}-01`, 'court').replace(/^1 /, '')} ${cle.slice(0, 4)}`
