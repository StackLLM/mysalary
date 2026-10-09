import type { MouvementEpargneDto } from '@mysalary/partage'

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
