import { centimes, soustraire } from '@mysalary/moteur'
import { formaterDate, type FamilleBilan, type LigneBilan, type PointRythme, type SaisieDepense, type StatutLigneBilan } from '@mysalary/partage'
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
}

/** Statut en mots, jamais par la couleur seule. Les revenus « confirmés » sont reçus, les charges payées. */
export function statutLigne(l: Pick<LigneBilan, 'statut' | 'famille' | 'prevu'>): { texte: string; ton: Ton } {
  const revenu = l.famille === 'revenu'
  const textes: Record<StatutLigneBilan, { texte: string; ton: Ton }> = {
    confirme: l.prevu === null ? { texte: 'Imprévu', ton: 'info' } : { texte: revenu ? 'Reçu' : 'Payé', ton: 'positif' },
    partiel: { texte: 'En partie payé', ton: 'info' },
    enCours: { texte: 'En cours', ton: 'neutre' },
    prevu: { texte: 'Prévu', ton: 'neutre' },
    enRetard: { texte: 'En retard', ton: 'alerte' },
  }
  if (l.famille === 'enveloppe' && l.statut === 'confirme') return { texte: 'Terminée', ton: 'neutre' }
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
  }
}

/** Points du graphique de rythme : jour du mois en abscisse (« 5 oct. »). */
export const pointsRythme = (points: PointRythme[]) =>
  points.map((p) => ({ jour: formaterDate(p.date, 'court'), prevu: p.prevu, ...(p.reel !== null ? { reel: p.reel } : {}) }))

/** Préfixe d'un écart positif (« +500 DH ») ; le moins d'un écart négatif est déjà écrit par le format. */
export const plus = (valeur: number) => (valeur > 0 ? '+' : '')
