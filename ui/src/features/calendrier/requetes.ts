import type { CalendrierMoisDto } from '@mysalary/partage'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { CLE_COMPTE, useCompte } from '../../state/compte'
import { useUtilisateurCourant } from '../compte/requetes'

/** Calendrier d'un mois (lot 17) : recalculé dès qu'une charge, une dépense, une paie ou un ponctuel change. */
export function useCalendrierMois(cle: string | null) {
  const { id } = useCompte()
  const actif = Boolean(useUtilisateurCourant())
  return useQuery({
    queryKey: [CLE_COMPTE, id, 'mois', 'calendrier', cle],
    queryFn: () => api.lire<CalendrierMoisDto>(`/mois/${cle}/calendrier`),
    enabled: actif && Boolean(cle),
    placeholderData: keepPreviousData,
  })
}
