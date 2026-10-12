import { centimes, soustraire } from '@mysalary/moteur'
import {
  formaterDate,
  formaterMontant,
  type FamilleBilan,
  type LigneBilan,
  type PointRythme,
  type SaisieDepense,
  type StatutLigneBilan,
} from '@mysalary/partage'
import { dateDePaiement } from '../depenses/saisie'
import type { Ton } from '../salaire/saisie'

/** Libellés et règles d'affichage du bilan mensuel. */

export const FAMILLES: Record<FamilleBilan, string> = {
  revenu: 'Revenus',
  fixe: 'Charges fixes',
  enveloppe: 'Enveloppes',
  ponctuel: 'Ponctuels',
  dette: 'Échéances de dettes',
  horsPlan: 'Hors plan',
  autreMois: 'Décalages',
  epargne: 'Épargne',
}

/** Statut en mots, jamais par la couleur seule. Les revenus « confirmés » sont reçus, les charges payées. */
export function statutLigne(l: Pick<LigneBilan, 'statut' | 'famille' | 'prevu'> & { reel?: LigneBilan['reel'] }): { texte: string; ton: Ton } {
  const revenu = l.famille === 'revenu'
  const textes: Record<StatutLigneBilan, { texte: string; ton: Ton }> = {
    confirme: l.prevu === null ? { texte: 'Imprévu', ton: 'info' } : { texte: revenu ? 'Reçu' : 'Payé', ton: 'positif' },
    partiel: { texte: 'En partie payé', ton: 'info' },
    enCours: { texte: 'En cours', ton: 'neutre' },
    prevu: { texte: 'Prévu', ton: 'neutre' },
    enRetard: { texte: 'En retard', ton: 'alerte' },
  }
  if (l.famille === 'enveloppe' && l.statut === 'confirme') return { texte: 'Terminée', ton: 'neutre' }
  // Épargne : jamais « à confirmer » ; le mois terminé dit si le versement prévu a été fait.
  if (l.famille === 'epargne') {
    if (l.statut === 'enCours') return { texte: 'En cours', ton: 'neutre' }
    return l.prevu === null || (l.reel ?? 0) >= l.prevu ? { texte: 'Versé', ton: 'positif' } : { texte: 'Moins que prévu', ton: 'info' }
  }
  if (l.famille === 'horsPlan' || l.famille === 'autreMois') return { texte: 'Réel', ton: 'neutre' }
  return textes[l.statut]
}

/** Lignes du bilan groupées par famille, dans l'ordre du moteur. */
export function parFamille(lignes: LigneBilan[]): { famille: FamilleBilan; lignes: LigneBilan[] }[] {
  const groupes: { famille: FamilleBilan; lignes: LigneBilan[] }[] = []
  for (const l of lignes) {
    const dernier = groupes.at(-1)
    if (dernier?.famille === l.famille) dernier.lignes.push(l)
    else groupes.push({ famille: l.famille, lignes: [l] })
  }
  return groupes
}

export type Confirmation = { type: 'payer'; saisie: SaisieDepense } | { type: 'lien'; chemin: string; libelle: string } | null

/**
 * Comment confirmer une ligne : une charge fixe ou un ponctuel se paie sur place (le reste à payer, jamais dans le futur) ;
 * une paie, un revenu ou une dette se confirment dans Mon plan.
 */
export function confirmation(l: LigneBilan, aujourdhui: string): Confirmation {
  const c = l.cible
  if (!c || l.statut === 'confirme' || l.statut === 'enCours') return null
  switch (c.type) {
    case 'charge':
    case 'ponctuel': {
      const reste = soustraire(l.prevu ?? centimes(0), l.reel ?? centimes(0))
      if (reste <= 0) return null
      return {
        type: 'payer',
        saisie: {
          date: dateDePaiement(c, aujourdhui),
          montant: reste,
          categorieId: c.categorieId,
          libelle: l.libelle,
          chargeId: c.type === 'charge' ? c.id : null,
          echeance: c.type === 'charge' ? c.date : null,
          ponctuelId: c.type === 'ponctuel' ? c.id : null,
        },
      }
    }
    case 'paie':
      return { type: 'lien', chemin: '/plan', libelle: 'Confirmer la paie' }
    case 'revenu':
      return { type: 'lien', chemin: '/plan?onglet=revenus', libelle: 'Noter le revenu' }
    case 'dette':
      return { type: 'lien', chemin: '/plan?onglet=dettes', libelle: 'Noter le paiement' }
    case 'objectif':
      return { type: 'lien', chemin: `/objectifs/${c.id}`, libelle: 'Ouvrir l’objectif' }
  }
}

/** Points du graphique de rythme : jour du mois en abscisse (« 5 oct. »). */
export const pointsRythme = (points: PointRythme[]) =>
  points.map((p) => ({ jour: formaterDate(p.date, 'court'), prevu: p.prevu, ...(p.reel !== null ? { reel: p.reel } : {}) }))

/** Préfixe d'un écart positif (« +500 DH ») ; le moins d'un écart négatif est déjà écrit par le format. */
export const plus = (valeur: number) => (valeur > 0 ? '+' : '')

// --- Semaines (lot 9) ---

type Reponse = { type: 'avance' | 'retard' | 'marge' | 'depasse'; montant: number } | { type: 'aVenir' | 'sansEnveloppe' }
type Periode = { debut: string; fin: string }
type Tendance = { moyenneSemaine: number; variation: number | null; sens: 'hausse' | 'baisse' | 'stable' }

/** Réponse en tête à « Est-ce que je tiens mon budget ? » (ux-ui.md (UX) § 4.6). */
export function reponseSemaines(r: Reponse): { texte: string; ton: Ton } | null {
  switch (r.type) {
    case 'avance':
      return { texte: `Oui, avec ${formaterMontant(r.montant)} d’avance`, ton: 'positif' }
    case 'retard':
      return { texte: `${formaterMontant(r.montant)} au-dessus du rythme prévu`, ton: 'alerte' }
    case 'marge':
      return { texte: `Oui, ${formaterMontant(r.montant)} de marge`, ton: 'positif' }
    case 'depasse':
      return { texte: `Budget flexible dépassé de ${formaterMontant(r.montant)}`, ton: 'alerte' }
    case 'aVenir':
      return { texte: 'Mois à venir : budget prévu seul', ton: 'neutre' }
    case 'sansEnveloppe':
      return null
  }
}

/** « 4 – 10 janv. », ou « 27 déc. » pour une semaine d'un jour. */
export const datesSemaine = (s: Periode) =>
  s.debut === s.fin ? formaterDate(s.debut, 'court') : `${formaterDate(s.debut, 'court')} – ${formaterDate(s.fin, 'court')}`

/** « 3 jours » pour une semaine partielle. */
export const joursSemaine = (s: { nbJours: number; partielle: boolean }) => (s.partielle ? `${s.nbJours} jour${s.nbJours > 1 ? 's' : ''}` : null)

/** Tendance en mots : « +18 % », « −12 % », « Stable », « En hausse » (moyenne nulle). */
export function texteTendance(t: Tendance | null): { texte: string; ton: Ton; detail: string } {
  if (!t) return { texte: '—', ton: 'neutre', detail: 'Pas encore 4 semaines de dépenses notées avant cette semaine.' }
  const detail = `Dépensé par jour comparé à la moyenne des 4 semaines précédentes (${formaterMontant(t.moyenneSemaine)} par semaine).`
  if (t.sens === 'stable') return { texte: 'Stable', ton: 'neutre', detail }
  const ton: Ton = t.sens === 'hausse' ? 'alerte' : 'positif'
  if (t.variation === null) return { texte: 'En hausse', ton, detail }
  const pourcent = Math.round(Math.abs(t.variation) * 100)
  return { texte: `${t.sens === 'hausse' ? '+' : '−'}${pourcent} %`, ton, detail }
}

/** Ce qui est dans une semaine (affichage) : dates comprises entre son début et sa fin. */
export const dansSemaine = (s: Periode) => (x: { date: string }) => x.date >= s.debut && x.date <= s.fin

/** Date proposée pour ajouter une dépense à une semaine : aujourd'hui s'il en fait partie, sinon son dernier jour passé. */
export const dateProposee = (s: Periode, aujourdhui: string) => (s.fin < aujourdhui ? s.fin : aujourdhui)

// --- Cumul de mois en mois (lot 13) ---

/** Mot qui dit d'où vient le chiffre du cumul : réel, estimation (mois en cours) ou prévu. */
export const NATURES_CUMUL = { reel: null, enCours: 'estimation', prevu: 'prévu', avant: null } as const

/** Le mois qui précède, pour « Report de septembre ». */
export const moisPrecedent = (cle: string) => {
  const [a, m] = cle.split('-').map(Number) as [number, number]
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`
}
