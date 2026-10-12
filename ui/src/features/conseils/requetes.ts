import type { ConseilsDto, IndicateursDto } from '@mysalary/partage'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { CLE_COMPTE, useCompte } from '../../state/compte'
import { useUtilisateurCourant } from '../compte/requetes'

/**
 * Alertes, recommandations et indicateurs (lot 12). Rangés sous la clé « mois » :
 * toute saisie qui recalcule les mois (dépense, paie, plan, épargne, réglages) les recalcule aussi.
 */
function useCle() {
  const { id } = useCompte()
  const actif = Boolean(useUtilisateurCourant())
  return { actif, mois: [CLE_COMPTE, id, 'mois'] as const }
}

export function useConseils() {
  const { actif, mois } = useCle()
  return useQuery({ queryKey: [...mois, 'conseils'], queryFn: () => api.lire<ConseilsDto>('/recommandations'), enabled: actif })
}

export function useIndicateurs(cle: string | null) {
  const { actif, mois } = useCle()
  return useQuery({
    queryKey: [...mois, 'indicateurs', cle],
    queryFn: () => api.lire<IndicateursDto>(`/indicateurs?mois=${cle}`),
    enabled: actif && Boolean(cle),
    placeholderData: keepPreviousData,
  })
}
