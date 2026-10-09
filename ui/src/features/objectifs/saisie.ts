import { decalerMois, lireCleMois } from '@mysalary/moteur'
import { formaterDate, formaterMois, formaterMontant, type PointTrajectoireObjectif, type Risque, type Scenario, type TypeObjectif } from '@mysalary/partage'
import { Bike, Car, Home, Laptop, Plane, ShieldCheck, Target, TrendingUp, type LucideIcon } from 'lucide-react'
import type { PointTrajectoire } from '../../components/graphiques/GraphiqueTrajectoire'

/** Libellés et règles d'affichage des objectifs (lot 10). Aucun calcul : le moteur rend tous les chiffres. */

export const TYPES: Record<TypeObjectif, { libelle: string; Icone: LucideIcon; exemple: string }> = {
  moto: { libelle: 'Moto', Icone: Bike, exemple: 'Moto' },
  voiture: { libelle: 'Voiture', Icone: Car, exemple: 'Voiture' },
  voyage: { libelle: 'Voyage', Icone: Plane, exemple: 'Voyage d’été' },
  ordinateur: { libelle: 'Ordinateur', Icone: Laptop, exemple: 'Ordinateur portable' },
  logement: { libelle: 'Logement', Icone: Home, exemple: 'Apport logement' },
  investissement: { libelle: 'Investissement', Icone: TrendingUp, exemple: 'Investissement' },
  securite: { libelle: 'Fonds de sécurité', Icone: ShieldCheck, exemple: 'Fonds de sécurité' },
  autre: { libelle: 'Autre', Icone: Target, exemple: '' },
}

export const SCENARIOS_LIBELLES: Record<Scenario, string> = { prudent: 'Prudent', realiste: 'Réaliste', ambitieux: 'Ambitieux' }

/** Ce que chaque scénario retient (affiché à côté des projections, Plan.md § 7.3). */
export const REGLES_SCENARIOS: Record<Scenario, string> = {
  prudent: 'revenus garantis seulement',
  realiste: 'revenus garantis et probables',
  ambitieux: 'tous les revenus, même incertains',
}

/** « juillet 2027 », ou « au-delà de 10 ans » quand la projection n'atteint pas la cible. */
export const texteEstimation = (mois: string | null) => (mois ? formaterMois(mois) : 'au-delà de 10 ans')

/** Phrase de risque : toujours une condition, jamais une garantie (Plan.md § 7.5). */
export const RISQUES_PHRASES: Record<Risque, string> = {
  sur: 'Atteint à la date même avec les seuls revenus garantis.',
  probable: 'Atteint à la date si les revenus probables arrivent.',
  fragile: 'Atteint à la date seulement si tous les revenus arrivent, même incertains.',
  horsPortee: 'Pas atteint à la date, même si tous les revenus arrivent.',
}

interface ObjectifAffiche {
  atteint: boolean
  dateCible: string | null
  dateDepassee: boolean
  effortMensuel: number | null
  estimations: Record<Scenario, string | null> | null
  risque: Risque | null
  statut: string
}

/** Résumé d'une ligne : où en est l'objectif, en une phrase. */
export function phraseObjectif(o: ObjectifAffiche): string {
  if (o.statut === 'realise') return 'Réalisé : l’épargne a servi à l’achat.'
  if (o.statut === 'abandonne') return 'Abandonné : son épargne est redevenue disponible.'
  if (o.atteint) return 'Cible atteinte. Tu peux marquer l’achat comme réalisé.'
  if (o.statut === 'pause') return 'En pause : il ne reçoit rien dans les projections.'
  const realiste = o.estimations?.realiste ?? null
  if (!o.dateCible) return `Sans date souhaitée. À ce rythme : ${texteEstimation(realiste)} (projection).`
  if (o.dateDepassee) return `La date souhaitée (${formaterMois(o.dateCible)}) est passée.`
  return `À ce rythme : ${texteEstimation(realiste)} (projection), pour ${formaterMois(o.dateCible)} souhaité.`
}

/**
 * Leviers chiffrés quand la date n'est pas tenue en réaliste (UX.md § 4.4, étape 7) :
 * repousser la date à l'estimation, ou verser l'effort nécessaire chaque mois.
 */
export function propositions(o: ObjectifAffiche): string[] {
  if (o.atteint || !o.dateCible || (o.risque !== 'fragile' && o.risque !== 'horsPortee')) return []
  const liste: string[] = []
  const realiste = o.estimations?.realiste ?? null
  if (realiste) liste.push(`Repousser la date à ${formaterMois(realiste)}.`)
  if (o.effortMensuel) liste.push(`Verser ${formaterMontant(o.effortMensuel)} par mois jusqu’à ${formaterMois(o.dateCible)}, en réduisant une enveloppe si besoin.`)
  return liste
}

/** Points du graphique de trajectoire : fin de chaque mois, et « Auj. » pour la jonction réel / projeté. */
export function pointsTrajectoire(points: PointTrajectoireObjectif[]): { points: PointTrajectoire[]; aujourdhui: string } {
  const AUJOURDHUI = 'Auj.'
  // « oct. », « déc. », et l'année en janvier : « janv. 27 ».
  const court = (cle: string) => {
    const abrege = formaterDate(`${cle}-01`, 'court').replace(/^1 /, '')
    return cle.endsWith('-01') ? `${abrege} ${cle.slice(2, 4)}` : abrege
  }
  return {
    aujourdhui: AUJOURDHUI,
    points: points.map((p) => ({
      periode: p.aujourdhui ? AUJOURDHUI : court(p.mois),
      ...(p.reel !== null ? { reel: p.reel } : {}),
      ...(p.projete !== null ? { projete: p.projete } : {}),
    })),
  }
}

/** Mois proposés pour la date souhaitée : du mois en cours à 10 ans. */
export const moisSouhaitables = (moisCourant: string): string[] => Array.from({ length: 120 }, (_, i) => decalerMois(lireCleMois(moisCourant), i))
