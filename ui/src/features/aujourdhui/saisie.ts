import { formaterDate, formaterMontant, type EvenementJour } from '@mysalary/partage'
import { libelleJour } from '../depenses/saisie'
import type { Ton } from '../salaire/saisie'

/** Libellés et règles d'affichage de la page Aujourd'hui (lot 16). Aucun calcul : le moteur rend tous les chiffres. */

/** « Lundi 12 octobre 2026 ». */
export const dateDuJour = (aujourdhui: string) => {
  const texte = formaterDate(aujourdhui, 'long')
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

/** Les 7 prochains jours, groupés par jour : « Aujourd'hui », « Demain », « Jeudi 15 octobre ». */
export function groupesJours(evenements: EvenementJour[], aujourdhui: string): { jour: string; libelle: string; evenements: EvenementJour[] }[] {
  const demain = new Date(`${aujourdhui}T12:00:00Z`)
  demain.setUTCDate(demain.getUTCDate() + 1)
  const cleDemain = demain.toISOString().slice(0, 10)
  const groupes: { jour: string; libelle: string; evenements: EvenementJour[] }[] = []
  for (const e of evenements) {
    const dernier = groupes.at(-1)
    if (dernier?.jour === e.date) dernier.evenements.push(e)
    else groupes.push({ jour: e.date, libelle: e.date === cleDemain ? 'Demain' : libelleJour(e.date, aujourdhui), evenements: [e] })
  }
  return groupes
}

/** Statut d'un revenu ou d'une charge à venir, en mots. */
export function statutEvenement(e: Pick<EvenementJour, 'type' | 'statut'>): { texte: string; ton: Ton } {
  if (e.statut === 'confirme') return { texte: e.type === 'revenu' ? 'Reçu' : 'Payé', ton: 'positif' }
  if (e.statut === 'partiel') return { texte: 'En partie payé', ton: 'info' }
  if (e.statut === 'enRetard') return { texte: 'En retard', ton: 'alerte' }
  return { texte: 'Prévu', ton: 'neutre' }
}

/** Bilan de la semaine passée en une phrase : dépensé sur disponible, puis l'avance ou le dépassement. */
export function phraseSemainePassee(s: { depense: number; disponible: number; reste: number }): { texte: string; ton: Ton } {
  const base = `${formaterMontant(s.depense)} dépensés sur ${formaterMontant(s.disponible)}`
  if (s.reste >= 0) return { texte: `${base} : ${formaterMontant(s.reste)} de côté.`, ton: 'positif' }
  return { texte: `${base} : ${formaterMontant(-s.reste)} de plus que prévu.`, ton: 'alerte' }
}

/** Les alertes de paie s'ouvrent ici même, sur la confirmation de la paie. */
export const estAlertePaie = (a: { type: string }) => a.type === 'paieAujourdhui' || a.type === 'paieEnRetard'
