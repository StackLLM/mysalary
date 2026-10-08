import type { BilanDto, SaisieCloture } from '@mysalary/partage'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { CLE_COMPTE, useCompte } from '../../state/compte'
import { useUtilisateurCourant } from '../profils/requetes'

/** Bilan, clôture et réouverture d'un mois. Clôturer ou rouvrir recalcule aussi les mois et les dépenses. */
function useCles() {
  const { id } = useCompte()
  const actif = Boolean(useUtilisateurCourant())
  return { actif, mois: [CLE_COMPTE, id, 'mois'] as const, depenses: [CLE_COMPTE, id, 'depenses'] as const }
}

export function useBilan(cle: string | null) {
  const { mois, actif } = useCles()
  return useQuery({
    queryKey: [...mois, 'bilan', cle],
    queryFn: () => api.lire<BilanDto>(`/mois/${cle}/bilan`),
    enabled: actif && Boolean(cle),
    placeholderData: keepPreviousData,
  })
}

function useInvalider() {
  const client = useQueryClient()
  const { mois, depenses } = useCles()
  return () => Promise.all([mois, depenses].map((queryKey) => client.invalidateQueries({ queryKey })))
}

export function useCloturer() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: ({ cle, ...saisie }: SaisieCloture & { cle: string }) => api.creer<void>(`/mois/${cle}/cloturer`, saisie),
    onSuccess: invalider,
  })
}

export function useRouvrir() {
  const invalider = useInvalider()
  return useMutation({ mutationFn: (cle: string) => api.creer<void>(`/mois/${cle}/rouvrir`, {}), onSuccess: invalider })
}
