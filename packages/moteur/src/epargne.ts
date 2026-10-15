import { additionner, centimes, soustraire, type Centimes } from './argent'
import type { CleMois, DateCivile } from './dates'

/**
 * Épargne (produit.md (Contexte) R11–R14, R19) : ce qui est de côté, ce qui est réservé aux objectifs, ce qui reste disponible.
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
  /** Au moins un compte déclaré : sans compte, le solde réel est inconnu (pas nul). */
  declare: boolean
  /** Somme des soldes actuels (réel). */
  solde: Centimes
  /** Épargné des objectifs actifs ou en pause. */
  reserve: Centimes
  /** Solde − réservé, jamais négatif (R14). */
  disponible: Centimes
  /** Réservé au-delà du solde déclaré : à réajuster (alerte). 0 sinon, et 0 tant qu'aucun compte n'est déclaré. */
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
  const declare = comptes.length > 0
  return {
    comptes: suivis,
    declare,
    solde,
    reserve: reserveTotal,
    disponible: centimes(Math.max(0, ecart)),
    depassement: declare ? centimes(Math.max(0, -ecart)) : centimes(0),
  }
}

/** Épargne nette d'une période (versements − retraits, hors achats) : réel, jamais une dépense. */
export const epargneNette = (mouvements: MouvementEpargne[], du: DateCivile, au: DateCivile) =>
  additionner(...mouvements.filter((m) => m.type !== 'achat' && m.date >= du && m.date <= au).map((m) => m.montant))

/** Cible proposée d'un fonds de sécurité : 3 à 6 mois de charges essentielles (produit.md (Plan) § 7.4). */
export function cibleFondsSecurite(essentielMensuel: Centimes): { min: Centimes; max: Centimes; base: Centimes } {
  return { min: centimes(essentielMensuel * 3), max: centimes(essentielMensuel * 6), base: essentielMensuel }
}

/**
 * Solde d'épargne à la fin d'une date, reconstitué depuis les soldes déclarés et les mouvements :
 * après la déclaration, on ajoute les mouvements ; avant, on retire ceux qui ont eu lieu depuis.
 */
export function soldeAu(comptes: CompteEpargne[], mouvements: MouvementEpargne[], date: DateCivile): Centimes {
  return additionner(
    ...comptes.map((c) => {
      const liste = mouvements.filter((m) => m.compteId === c.id)
      if (date >= c.auLe) return additionner(c.solde, ...liste.filter((m) => m.date >= c.auLe && m.date <= date).map((m) => m.montant))
      return soustraire(c.solde, additionner(...liste.filter((m) => m.date > date && m.date < c.auLe).map((m) => m.montant)))
    }),
  )
}

/** Première date connue de l'épargne (déclaration ou mouvement) : avant, aucun solde n'est reconstitué. */
export function debutEpargne(comptes: CompteEpargne[], mouvements: MouvementEpargne[]): DateCivile | null {
  const dates = [...comptes.map((c) => c.auLe), ...mouvements.map((m) => m.date)].sort()
  return dates[0] ?? null
}
