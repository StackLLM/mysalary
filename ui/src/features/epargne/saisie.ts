import type { MouvementEpargneDto, PlanEpargneMoisDto } from '@mysalary/partage'

/** Libellés et regroupements d'affichage de l'épargne (lot 10). */

export const LIBELLES_MOUVEMENT: Record<MouvementEpargneDto['type'], string> = {
  versement: 'Versement',
  retrait: 'Retrait',
  achat: 'Achat réalisé',
}

/** Mouvements groupés par jour, dans l'ordre reçu (du plus récent au plus ancien). */
export function groupesMouvements(mouvements: MouvementEpargneDto[]): { jour: string; mouvements: MouvementEpargneDto[] }[] {
  const groupes: { jour: string; mouvements: MouvementEpargneDto[] }[] = []
  for (const m of mouvements) {
    const dernier = groupes.at(-1)
    if (dernier?.jour === m.date) dernier.mouvements.push(m)
    else groupes.push({ jour: m.date, mouvements: [m] })
  }
  return groupes
}

/**
 * État d'un objectif dans le plan du mois (lot 36) :
 * à faire (rien de versé), partiel, fait (le prévu est versé), sauté (« pas ce mois-ci »), hors plan (versé sans versement mensuel).
 */
export type EtatPlan = 'aFaire' | 'partiel' | 'fait' | 'saute' | 'horsPlan'

export interface LignePlan {
  objectifId: string
  libelle: string
  etat: EtatPlan
  /** Montant du mois : le prévu, ou le prévu sauté, ou le versé hors plan. */
  prevu: number
  reel: number
  /** Ce qui reste à verser pour atteindre le prévu (jamais négatif). */
  reste: number
}

export function lignesDuPlan(plan: PlanEpargneMoisDto): LignePlan[] {
  return plan.lignes.flatMap((l): LignePlan[] => {
    if (!l.objectifId) return []
    const base = { objectifId: l.objectifId, libelle: l.libelle, reel: l.reel }
    if (l.prevuSaute !== null && l.reel <= 0) return [{ ...base, etat: 'saute', prevu: l.prevuSaute, reste: 0 }]
    if (l.prevu === null) return l.reel > 0 ? [{ ...base, etat: 'horsPlan', prevu: l.reel, reste: 0 }] : []
    const reste = Math.max(0, l.prevu - l.reel)
    return [{ ...base, etat: l.reel <= 0 ? 'aFaire' : reste > 0 ? 'partiel' : 'fait', prevu: l.prevu, reste }]
  })
}

/** Résumé du mois : versé sur prévu (les versements sautés ne comptent pas), et combien d'objectifs restent à décider. */
export function resumePlan(lignes: LignePlan[]) {
  const suivies = lignes.filter((l) => l.etat !== 'saute' && l.etat !== 'horsPlan')
  const prevu = suivies.reduce((t, l) => t + l.prevu, 0)
  const verse = suivies.reduce((t, l) => t + Math.min(Math.max(0, l.reel), l.prevu), 0)
  return {
    prevu,
    verse,
    part: prevu > 0 ? verse / prevu : 0,
    aDecider: lignes.filter((l) => l.etat === 'aFaire' || l.etat === 'partiel').length,
    sautes: lignes.filter((l) => l.etat === 'saute').length,
  }
}
