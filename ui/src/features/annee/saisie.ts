import { formaterDate, formaterMontant, type LigneBilan, type MoisCumul, type NatureCumul, type SuiviObjectif } from '@mysalary/partage'

/** Libellés et règles d'affichage du calendrier de l'année (lot 14). Aucun calcul : le moteur rend tous les chiffres. */

export const NATURES_CARTE: Record<NatureCumul, { libelle: string; explication: string }> = {
  reel: { libelle: 'Réel', explication: 'Mois terminé : revenus reçus, sorties et épargne réelles.' },
  enCours: { libelle: 'En cours', explication: 'Estimation : le réel à ce jour, plus ce qui est encore prévu d’ici la fin du mois.' },
  prevu: { libelle: 'Prévu', explication: 'Projection : revenus retenus par le scénario réaliste, charges et versements prévus.' },
  avant: { libelle: 'Avant le suivi', explication: 'Ce mois précède le début de ton suivi : pas de cumul.' },
}

/** Premier et dernier mois d'une année civile de mois budgétaires. */
export const plageAnnee = (annee: number) => ({ du: `${annee}-01`, au: `${annee}-12` })

/** « janv. », « sept. » : nom court d'un mois. */
export const moisCourt = (cle: string) => formaterDate(`${cle}-01`, 'court').replace(/^1 /, '')

/** Année d'une clé de mois « 2026-10 ». */
export const anneeDe = (cle: string) => Number(cle.slice(0, 4))

/** Longueur de la jauge d'une carte : cumul rapporté au plus haut cumul de l'année (0 si négatif ou absent). */
export function jauge(cumul: number | null, mois: Pick<MoisCumul, 'cumul'>[]): number {
  const plusHaut = Math.max(0, ...mois.map((m) => m.cumul ?? 0))
  if (cumul === null || cumul <= 0 || plusHaut === 0) return 0
  return Math.min(1, cumul / plusHaut)
}

export interface Jalon {
  id: string
  libelle: string
  type: 'atteint' | 'souhaite'
}

/**
 * Objectifs qui marquent un mois : cible atteinte ce mois-là selon la projection réaliste,
 * ou date souhaitée. Les objectifs déjà atteints, réalisés ou abandonnés n'en ont pas.
 */
export function jalonsDuMois(objectifs: Pick<SuiviObjectif, 'id' | 'libelle' | 'statut' | 'atteint' | 'dateCible' | 'estimations'>[], cle: string): Jalon[] {
  const suivis = objectifs.filter((o) => (o.statut === 'actif' || o.statut === 'pause') && !o.atteint)
  return [
    ...suivis.filter((o) => o.statut === 'actif' && o.estimations?.realiste === cle).map((o) => ({ id: o.id, libelle: o.libelle, type: 'atteint' as const })),
    ...suivis.filter((o) => o.dateCible === cle).map((o) => ({ id: o.id, libelle: o.libelle, type: 'souhaite' as const })),
  ]
}

export const texteJalonCourt = (j: Jalon) => (j.type === 'atteint' ? `${j.libelle} atteint` : `${j.libelle} : date visée`)

export const texteJalon = (j: Jalon) => (j.type === 'atteint' ? `« ${j.libelle} » atteint (projection)` : `« ${j.libelle} » : date souhaitée`)

/** Sections de la fenêtre du mois, dans l'ordre de lecture du calcul. */
export const SECTIONS = [
  { cle: 'revenus', titre: 'Revenus', familles: ['revenu'] },
  { cle: 'charges', titre: 'Charges', familles: ['fixe', 'enveloppe', 'ponctuel', 'dette', 'horsPlan', 'autreMois'] },
  { cle: 'epargne', titre: 'Épargne', familles: ['epargne'] },
] as const

/**
 * Montant d'une ligne du bilan : le réel s'il existe, sinon le prévu (marqué comme tel).
 * Mois à venir : toujours le prévu, rien n'est encore réel. Une enveloppe entamée garde son budget en précision.
 */
export function montantLigne(l: Pick<LigneBilan, 'prevu' | 'reel' | 'famille'>, aVenir = false): { valeur: number; prevu: boolean; precision: string | null } {
  if (l.reel === null || aVenir) return { valeur: l.prevu ?? l.reel ?? 0, prevu: true, precision: null }
  const precision = l.prevu !== null && l.prevu !== l.reel ? `sur ${formaterMontant(l.prevu)} prévus` : null
  return { valeur: l.reel, prevu: false, precision }
}

/** En-têtes des colonnes de la grille : « L M M J V S D », ou à partir du dimanche. */
export const joursEntete = (debutSemaine: 1 | 7) => (debutSemaine === 7 ? ['D', 'L', 'M', 'M', 'J', 'V', 'S'] : ['L', 'M', 'M', 'J', 'V', 'S', 'D'])

export interface CaseJour {
  date: string
  jour: number
  /** Jour du mois civil précédent (ex. 27 sept. dans le mois budgétaire d'octobre) : affiché plus clair. */
  horsMois: boolean
  aujourdhui: boolean
  paie: boolean
  /** Charges datées ce jour-là : la pastille prend la couleur du statut le plus urgent. */
  charges: 'aucune' | 'prevue' | 'payee' | 'enRetard'
  /** Infobulle : ce qui tombe ce jour-là. */
  titre: string
}

type Evenement = { date: string; type: 'revenu' | 'charge'; libelle: string; montant: number; statut: string }

/** Une case de la grille d'un mois : numéro du jour, paie, charges, et leur détail en mots. */
export function caseJour(date: string, cle: string, evenements: Evenement[], aujourdhui: string): CaseJour {
  const ceJour = evenements.filter((e) => e.date === date)
  const charges = ceJour.filter((e) => e.type === 'charge')
  const etat: CaseJour['charges'] =
    charges.length === 0 ? 'aucune' : charges.some((c) => c.statut === 'enRetard') ? 'enRetard' : charges.every((c) => c.statut === 'confirme') ? 'payee' : 'prevue'
  const lignes = ceJour.map((e) => `${e.libelle} ${e.type === 'revenu' ? '+' : '−'}${formaterMontant(e.montant)}`)
  return {
    date,
    jour: Number(date.slice(8)),
    horsMois: date.slice(0, 7) !== cle,
    aujourdhui: date === aujourdhui,
    paie: ceJour.some((e) => e.type === 'revenu'),
    charges: etat,
    titre: [formaterDate(date, 'moyen'), ...lignes].join('\n'),
  }
}

/**
 * Barres du graphique « Cumul fin de mois » : hauteur et position en % d'une même échelle,
 * avec la ligne du zéro quand un mois passe sous zéro.
 */
export function echelleCumul(mois: Pick<MoisCumul, 'cle' | 'cumul'>[]): { zero: number; barres: { cle: string; bas: number; hauteur: number }[] } {
  const valeurs = mois.map((m) => m.cumul ?? 0)
  const haut = Math.max(0, ...valeurs)
  const bas = Math.min(0, ...valeurs)
  const etendue = haut - bas || 1
  const zero = bas === 0 ? 0 : (-bas / etendue) * 100
  return {
    zero,
    barres: mois.map((m) => {
      const v = m.cumul ?? 0
      return { cle: m.cle, bas: v >= 0 ? zero : zero - (-v / etendue) * 100, hauteur: (Math.abs(v) / etendue) * 100 }
    }),
  }
}
