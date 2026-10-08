import type { ResumeRevenusDto, RevenuPrevu, RevenuRecuDto, SaisieRevenuRecu, SaisieSource, SourceRevenuDto } from '@mysalary/partage'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { CLE_COMPTE, useCompte } from '../../state/compte'
import { useUtilisateurCourant } from '../profils/requetes'

/**
 * Requêtes des autres revenus. Une source « avec la paie » change les paies prévues :
 * toute écriture recalcule aussi salaire et mois.
 */
function useCles() {
  const { id } = useCompte()
  const actif = Boolean(useUtilisateurCourant())
  return {
    actif,
    revenus: [CLE_COMPTE, id, 'revenus'] as const,
    salaire: [CLE_COMPTE, id, 'salaire'] as const,
    mois: [CLE_COMPTE, id, 'mois'] as const,
  }
}

export function useSources() {
  const { revenus, actif } = useCles()
  return useQuery({ queryKey: [...revenus, 'sources'], queryFn: () => api.lire<SourceRevenuDto[]>('/revenus/sources'), enabled: actif })
}

export function useResumeRevenus() {
  const { revenus, actif } = useCles()
  return useQuery({ queryKey: [...revenus, 'resume'], queryFn: () => api.lire<ResumeRevenusDto>('/revenus/resume'), enabled: actif })
}

export function useRecus() {
  const { revenus, actif } = useCles()
  return useQuery({ queryKey: [...revenus, 'recus'], queryFn: () => api.lire<RevenuRecuDto[]>('/revenus/recus'), enabled: actif })
}

export function useRevenusPrevus(du: string, au: string, active = true) {
  const { revenus, actif } = useCles()
  return useQuery({
    queryKey: [...revenus, 'prevus', du, au],
    queryFn: () => api.lire<{ aujourdhui: string; revenus: RevenuPrevu[] }>(`/revenus/prevus?du=${du}&au=${au}`),
    enabled: actif && active,
    placeholderData: keepPreviousData,
  })
}

function useInvalider() {
  const client = useQueryClient()
  const { revenus, salaire, mois } = useCles()
  return () => Promise.all([revenus, salaire, mois].map((queryKey) => client.invalidateQueries({ queryKey })))
}

export function useEnregistrerSource() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: async ({ id, ...saisie }: SaisieSource & { id?: string }) => {
      if (id) await api.modifier<void>(`/revenus/sources/${id}`, saisie)
      else await api.creer<{ id: string }>('/revenus/sources', saisie)
    },
    onSuccess: invalider,
  })
}

export function useSupprimerSource() {
  const invalider = useInvalider()
  return useMutation({ mutationFn: (id: string) => api.supprimer(`/revenus/sources/${id}`), onSuccess: invalider })
}

export function useEnregistrerRecu() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: ({ id, ...saisie }: SaisieRevenuRecu & { id?: string }) =>
      id ? api.modifier<RevenuRecuDto>(`/revenus/recus/${id}`, saisie) : api.creer<RevenuRecuDto>('/revenus/recus', saisie),
    onSuccess: invalider,
  })
}

export function useSupprimerRecu() {
  const invalider = useInvalider()
  return useMutation({ mutationFn: (id: string) => api.supprimer(`/revenus/recus/${id}`), onSuccess: invalider })
}
