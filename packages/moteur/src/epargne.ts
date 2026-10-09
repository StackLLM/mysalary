import { additionner, centimes, soustraire, type Centimes } from './argent'
import type { CleMois, DateCivile } from './dates'

/**
 * Épargne (context.md R11–R14, R19) : ce qui est de côté, ce qui est réservé aux objectifs, ce qui reste disponible.
 * L'épargne n'est jamais une dépense (R11).
 */

export const TYPES_OBJECTIF = ['moto', 'voiture', 'voyage', 'ordinateur', 'logement', 'investissement', 'securite', 'autre'] as const
export type TypeObjectif = (typeof TYPES_OBJECTIF)[number]

export const STATUTS_OBJECTIF = ['actif', 'pause', 'realise', 'abandonne'] as const
export type StatutObjectif = (typeof STATUTS_OBJECTIF)[number]

export interface Objectif {
  id: string
  libelle: string
  /** Sert à l'icône et aux suggestions ; `securite` : fonds de sécurité. */
  type: TypeObjectif
  montantCible: Centimes
  /** Déjà mis de côté à la création (compris dans le solde déclaré). */
  montantInitial: Centimes
  /** Mois souhaité, facultatif. */
  dateCible: CleMois | null
  /** 1 = la plus haute. */
  priorite: number
  /** Versement mensuel choisi, facultatif. */
  versementMensuel: Centimes | null
  statut: StatutObjectif
  /** Date de l'achat (objectif réalisé). */
  realiseLe: DateCivile | null
  creeLe: DateCivile
}

export interface CompteEpargne {
  id: string
  libelle: string
  /** Solde déclaré (réel) à la date `auLe`. */
  solde: Centimes
  auLe: DateCivile
}

/**
 * Mouvement réel sur un compte d'épargne : versement (+) ou retrait (−).
 * `achat` : retrait qui consomme l'épargne d'un objectif réalisé (R19), jamais une dépense.
 */
export interface MouvementEpargne {
  id: string
  compteId: string
  objectifId: string | null
  type: 'versement' | 'retrait' | 'achat'
  date: DateCivile
  /** Signé : positif pour un versement, négatif pour un retrait ou un achat. */
  montant: Centimes
  libelle: string
}

export interface DonneesEpargne {
  comptes?: CompteEpargne[]
  mouvementsEpargne?: MouvementEpargne[]
  objectifs?: Objectif[]
}

/** Un objectif réserve son épargne tant qu'il n'est ni réalisé ni abandonné (R13). */
export const reserve = (o: Pick<Objectif, 'statut'>) => o.statut === 'actif' || o.statut === 'pause'

/** Épargné d'un objectif = déjà mis de côté + versements et retraits qui lui sont liés (l'achat ne compte pas). */
export function epargneObjectif(o: Pick<Objectif, 'id' | 'montantInitial'>, mouvements: MouvementEpargne[], jusquAu?: DateCivile): Centimes {
  return additionner(
    o.montantInitial,
    ...mouvements.filter((m) => m.objectifId === o.id && m.type !== 'achat' && (!jusquAu || m.date <= jusquAu)).map((m) => m.montant),
  )
}

export interface CompteSuivi extends CompteEpargne {
  /** Solde déclaré + mouvements datés du jour de la déclaration ou après. */
  soldeActuel: Centimes
}

export interface EtatEpargne {
  comptes: CompteSuivi[]
  /** Somme des soldes actuels (réel). */
  solde: Centimes
  /** Épargné des objectifs actifs ou en pause. */
  reserve: Centimes
  /** Solde − réservé, jamais négatif (R14). */
  disponible: Centimes
  /** Réservé au-delà du solde : à réajuster (alerte). 0 sinon. */
  depassement: Centimes
}

export function etatEpargne({ comptes = [], mouvementsEpargne = [], objectifs = [] }: DonneesEpargne): EtatEpargne {
  const suivis = comptes.map((c) => ({
    ...c,
    soldeActuel: additionner(c.solde, ...mouvementsEpargne.filter((m) => m.compteId === c.id && m.date >= c.auLe).map((m) => m.montant)),
  }))
  const solde = additionner(...suivis.map((c) => c.soldeActuel))
  const reserveTotal = additionner(...objectifs.filter(reserve).map((o) => epargneObjectif(o, mouvementsEpargne)))
  const ecart = soustraire(solde, reserveTotal)
  return {
    comptes: suivis,
    solde,
    reserve: reserveTotal,
    disponible: centimes(Math.max(0, ecart)),
    depassement: centimes(Math.max(0, -ecart)),
  }
}

/** Épargne nette d'une période (versements − retraits, hors achats) : réel, jamais une dépense. */
export const epargneNette = (mouvements: MouvementEpargne[], du: DateCivile, au: DateCivile) =>
  additionner(...mouvements.filter((m) => m.type !== 'achat' && m.date >= du && m.date <= au).map((m) => m.montant))

/** Cible proposée d'un fonds de sécurité : 3 à 6 mois de charges essentielles (Plan.md § 7.4). */
export function cibleFondsSecurite(essentielMensuel: Centimes): { min: Centimes; max: Centimes; base: Centimes } {
  return { min: centimes(essentielMensuel * 3), max: centimes(essentielMensuel * 6), base: essentielMensuel }
}
