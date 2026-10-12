import type { AujourdhuiDto } from '@mysalary/partage'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { CLE_COMPTE, useCompte } from '../../state/compte'
import { useUtilisateurCourant } from '../compte/requetes'

/** Page Aujourd'hui (lot 16) : recalculée après chaque saisie (toutes les clés du compte sont invalidées). */
export function useAujourdhui() {
  const { id } = useCompte()
  const actif = Boolean(useUtilisateurCourant())
  return useQuery({
    queryKey: [CLE_COMPTE, id, 'mois', 'aujourdhui'],
    queryFn: () => api.lire<AujourdhuiDto>('/aujourdhui'),
    enabled: actif,
  })
}
