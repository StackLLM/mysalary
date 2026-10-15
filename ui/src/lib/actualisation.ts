import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { CLE_COMPTE, useCompte } from '../state/compte'

/**
 * Après toute écriture de données financières (salaire, revenus, charges, dépenses, épargne, objectifs, réglages) :
 * recharge toutes les vues du compte. Un chiffre en dépend souvent ailleurs (bilan, cumul, objectifs, épargne, Aujourd'hui,
 * année, simulateur) ; seules les vues affichées sont rechargées tout de suite, les autres à leur prochaine ouverture.
 */
export function useActualiserDonnees() {
  const client = useQueryClient()
  const { id } = useCompte()
  return useCallback(() => client.invalidateQueries({ queryKey: [CLE_COMPTE, id] }), [client, id])
}
