import { grilleDesJours, lireDate } from '@mysalary/moteur'
import { formaterDate, formaterMontant, type CalendrierMoisDto, type EvenementCalendrier, type LigneBilan, type TypeEvenement } from '@mysalary/partage'
import type { Ton } from '../salaire/saisie'
import { jalonsDuMois, type Jalon } from '../annee/saisie'

/** Libellés et règles d'affichage du calendrier (lot 17). Aucun calcul : le moteur rend les événements et le solde de chaque jour. */

export type TypeVue = TypeEvenement | 'objectif'

export const TYPES: { type: TypeVue; libelle: string; pluriel: string }[] = [
  { type: 'paie', libelle: 'Paie', pluriel: 'Paie et primes' },
  { type: 'revenu', libelle: 'Revenu', pluriel: 'Autres revenus' },
  { type: 'charge', libelle: 'Charge', pluriel: 'Charges fixes' },
  { type: 'dette', libelle: 'Échéance', pluriel: 'Échéances de dettes' },
  { type: 'ponctuel', libelle: 'Ponctuel', pluriel: 'Ponctuels' },
  { type: 'objectif', libelle: 'Objectif', pluriel: 'Objectifs' },
]
export const libelleType = (t: TypeVue) => TYPES.find((x) => x.type === t)!.libelle

/** Un événement tel que le calendrier l'affiche : un événement du moteur, ou la date d'un objectif. */
export interface EvenementVue {
  cle: string
  date: string
  type: TypeVue
  sens: 'entree' | 'sortie' | 'neutre'
  libelle: string
  /** `null` pour un objectif. */
  montant: number | null
  statut: EvenementCalendrier['statut'] | null
  passeNonConfirme: boolean
  ligne: LigneBilan | null
  prevu: number | null
  reel: number | null
  /** Objectif : ce que dit la date (« atteint » selon la projection, ou « date visée »). */
  jalon: Jalon | null
}

/** Événements du moteur et jalons d'objectifs (placés au dernier jour du mois budgétaire), dans l'ordre des dates. */
export function evenementsVue(calendrier: CalendrierMoisDto, jalons: Jalon[]): EvenementVue[] {
  const evenements: EvenementVue[] = calendrier.evenements.map((e) => ({
    cle: e.cle,
    date: e.date,
    type: e.type,
    sens: e.sens,
    libelle: e.libelle,
    montant: e.montant,
    statut: e.statut,
    passeNonConfirme: e.passeNonConfirme,
    ligne: e.ligne,
    prevu: e.prevu,
    reel: e.reel,
    jalon: null,
  }))
  for (const j of jalons) {
    evenements.push({
      cle: `objectif:${j.id}:${j.type}`,
      date: calendrier.mois.fin,
      type: 'objectif',
      sens: 'neutre',
      libelle: j.libelle,
      montant: null,
      statut: null,
      passeNonConfirme: false,
      ligne: null,
      prevu: null,
      reel: null,
      jalon: j,
    })
  }
  return evenements.sort((a, b) => a.date.localeCompare(b.date))
}

export { jalonsDuMois }

/** Nombre d'événements de chaque type, pour les pastilles de filtre. */
export const compterParType = (evenements: EvenementVue[]) =>
  Object.fromEntries(TYPES.map((t) => [t.type, evenements.filter((e) => e.type === t.type).length])) as Record<TypeVue, number>

/** Garde les événements dont le type n'est pas masqué. */
export const filtrer = (evenements: EvenementVue[], masques: ReadonlySet<TypeVue>) => evenements.filter((e) => !masques.has(e.type))

export function parJour(evenements: EvenementVue[]): Map<string, EvenementVue[]> {
  const jours = new Map<string, EvenementVue[]>()
  for (const e of evenements) jours.set(e.date, [...(jours.get(e.date) ?? []), e])
  return jours
}

/** Événements visibles dans une case ; au-delà, une pastille « +N ». */
export const MAX_PAR_CASE = 2
export const reste = (n: number) => Math.max(0, n - MAX_PAR_CASE)

/** Semaines de la grille d'un mois budgétaire (cases hors mois : `null`). */
export const semainesGrille = (calendrier: Pick<CalendrierMoisDto, 'mois' | 'debutSemaine'>) =>
  grilleDesJours(lireDate(calendrier.mois.debut), lireDate(calendrier.mois.fin), calendrier.debutSemaine)

/** « +10 000 DH » pour une entrée, « −3 500 DH » pour une sortie ; rien pour un objectif. */
export function montantSigne(e: Pick<EvenementVue, 'sens' | 'montant'>): string {
  if (e.montant === null || e.sens === 'neutre') return ''
  return `${e.sens === 'entree' ? '+' : '−'}${formaterMontant(e.montant)}`
}

/** Statut en mots (jamais la couleur seule). */
export function statutVue(e: Pick<EvenementVue, 'type' | 'sens' | 'statut' | 'jalon'>): { texte: string; ton: Ton } {
  if (e.type === 'objectif') return e.jalon?.type === 'atteint' ? { texte: 'Atteint (projection)', ton: 'info' } : { texte: 'Date visée', ton: 'neutre' }
  switch (e.statut) {
    case 'confirme':
      return e.sens === 'entree' ? { texte: 'Reçu', ton: 'positif' } : { texte: 'Payé', ton: 'positif' }
    case 'partiel':
      return { texte: 'En partie payé', ton: 'info' }
    case 'enRetard':
      return { texte: e.sens === 'entree' ? 'Attendu, en retard' : 'En retard', ton: 'alerte' }
    default:
      return { texte: 'Prévu', ton: 'neutre' }
  }
}

/** « Vendredi 15 janvier 2027 » : le jour en toutes lettres, avec une majuscule. */
export const jourLong = (date: string) => formaterDate(date, 'long').replace(/^./, (c) => c.toUpperCase())

/** Solde du jour, en phrase : réel, ou projeté après aujourd'hui. */
export const phraseSolde = (j: { solde: number; projete: boolean }) => `${j.projete ? 'Solde projeté' : 'Solde'} : ${formaterMontant(j.solde)}`

/** Lecture d'écran et infobulle d'une case : « Lundi 11 janvier 2027 : Solde projeté : 5 700 DH, 2 événements ». */
export function titreJour(date: string, jour: { solde: number; projete: boolean } | undefined, nombre: number): string {
  const evenements = nombre === 0 ? 'aucun événement' : nombre === 1 ? '1 événement' : `${nombre} événements`
  return `${jourLong(date)} : ${jour ? `${phraseSolde(jour)}, ` : ''}${evenements}`
}

/** Où modifier ce qui génère l'événement (Mon plan, ou l'objectif). */
export function lienModifier(e: Pick<EvenementVue, 'type' | 'jalon'>): { chemin: string; libelle: string } {
  switch (e.type) {
    case 'paie':
      return { chemin: '/plan', libelle: 'Modifier dans Mon plan' }
    case 'revenu':
      return { chemin: '/plan?onglet=revenus', libelle: 'Modifier dans Mon plan' }
    case 'dette':
      return { chemin: '/plan?onglet=dettes', libelle: 'Modifier dans Mon plan' }
    case 'objectif':
      return { chemin: `/objectifs/${e.jalon?.id ?? ''}`, libelle: 'Ouvrir l’objectif' }
    default:
      return { chemin: '/plan?onglet=charges', libelle: 'Modifier dans Mon plan' }
  }
}
