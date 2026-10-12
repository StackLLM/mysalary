import type { ApplicationDto, SaisieAjustements, SaisieExecution, SaisieScenario, ScenarioDto, SimulationDto } from '@mysalary/partage'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { CLE_COMPTE, useCompte } from '../../state/compte'
import { useUtilisateurCourant } from '../compte/requetes'

/** Requêtes du simulateur. Exécuter n'écrit rien ; appliquer recalcule tout ce qui dépend du plan. */
function useCles() {
  const { id } = useCompte()
  const actif = Boolean(useUtilisateurCourant())
  return { actif, id, simulation: [CLE_COMPTE, id, 'simulation'] as const, scenarios: [CLE_COMPTE, id, 'scenarios'] as const }
}

export function useSimulation(saisie: SaisieExecution) {
  const { simulation, actif } = useCles()
  return useQuery({
    queryKey: [...simulation, saisie],
    queryFn: () => api.creer<SimulationDto>('/simulations/executer', saisie),
    enabled: actif,
    placeholderData: keepPreviousData,
  })
}

export function useScenarios() {
  const { scenarios, actif } = useCles()
  return useQuery({ queryKey: scenarios, queryFn: () => api.lire<ScenarioDto[]>('/scenarios'), enabled: actif })
}

export function useEnregistrerScenario() {
  const client = useQueryClient()
  const { scenarios } = useCles()
  return useMutation({
    mutationFn: async ({ id, ...s }: SaisieScenario & { id?: string }): Promise<{ id: string }> => {
      if (!id) return api.creer<{ id: string }>('/scenarios', s)
      await api.modifier<void>(`/scenarios/${id}`, s)
      return { id }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: scenarios }),
  })
}

export function useSupprimerScenario() {
  const client = useQueryClient()
  const { scenarios } = useCles()
  return useMutation({ mutationFn: (id: string) => api.supprimer(`/scenarios/${id}`), onSuccess: () => client.invalidateQueries({ queryKey: scenarios }) })
}

/** Appliquer au plan : objectifs, sources de revenus et charges changent ; tout le compte est recalculé. */
export function useAppliquer() {
  const client = useQueryClient()
  const { id } = useCles()
  return useMutation({
    mutationFn: (ajustements: SaisieAjustements) => api.creer<ApplicationDto>('/simulations/appliquer', { ajustements }),
    onSuccess: () => client.invalidateQueries({ queryKey: [CLE_COMPTE, id] }),
  })
}
