import type { RattachementsDto, SaisieDepense, SuiviDepensesDto } from '@mysalary/partage'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { CLE_COMPTE, useCompte } from '../../state/compte'
import { useUtilisateurCourant } from '../profils/requetes'

/** Requêtes des dépenses réelles. Toute écriture recalcule aussi les charges (catégories utilisées) et les mois. */
function useCles() {
  const { id } = useCompte()
  const actif = Boolean(useUtilisateurCourant())
  return { actif, depenses: [CLE_COMPTE, id, 'depenses'] as const, charges: [CLE_COMPTE, id, 'charges'] as const, mois: [CLE_COMPTE, id, 'mois'] as const }
}

/** Suivi d'un mois budgétaire ; sans mois, le mois en cours. */
export function useSuiviDepenses(mois: string | null) {
  const { depenses, actif } = useCles()
  return useQuery({
    queryKey: [...depenses, 'suivi', mois ?? 'courant'],
    queryFn: () => api.lire<SuiviDepensesDto>(mois ? `/depenses?mois=${mois}` : '/depenses'),
    enabled: actif,
    placeholderData: keepPreviousData,
  })
}

/** Lignes du plan auxquelles rattacher une dépense à cette date. */
export function useRattachements(date: string | null) {
  const { depenses, actif } = useCles()
  return useQuery({
    queryKey: [...depenses, 'rattachements', date],
    queryFn: () => api.lire<RattachementsDto>(`/depenses/rattachements?date=${date}`),
    enabled: actif && Boolean(date),
  })
}

function useInvalider() {
  const client = useQueryClient()
  const { depenses, charges, mois } = useCles()
  return () => Promise.all([depenses, charges, mois].map((queryKey) => client.invalidateQueries({ queryKey })))
}

/** Création (POST) ou modification (PUT /:id) d'une dépense, selon la présence d'un `id`. */
export function useEnregistrerDepense() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: async ({ id, ...saisie }: SaisieDepense & { id?: string }): Promise<{ id: string }> => {
      if (id) {
        await api.modifier<void>(`/depenses/${id}`, saisie)
        return { id }
      }
      return api.creer<{ id: string }>('/depenses', saisie)
    },
    onSuccess: invalider,
  })
}

export function useSupprimerDepense() {
  const invalider = useInvalider()
  return useMutation({ mutationFn: (id: string) => api.supprimer(`/depenses/${id}`), onSuccess: invalider })
}
