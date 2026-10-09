import type {
  MoisBudgetaireDto,
  PaieDto,
  SaisieContrat,
  SaisiePrimesPaie,
  SaisieReception,
  VersionContratDto,
} from '@mysalary/partage'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { CLE_COMPTE, useCompte } from '../../state/compte'
import { useUtilisateurCourant } from '../profils/requetes'

/**
 * Requêtes du salaire et des mois budgétaires.
 * Toute écriture recalcule paies et mois : les bornes des mois dépendent des paies.
 */
const cles = (id: string | null) => ({
  salaire: [CLE_COMPTE, id, 'salaire'] as const,
  mois: [CLE_COMPTE, id, 'mois'] as const,
})

function useCles() {
  const { id } = useCompte()
  // Seulement quand le compte retenu existe vraiment (même règle que les réglages).
  const actif = Boolean(useUtilisateurCourant())
  return { ...cles(id), actif }
}

export function useContrats() {
  const { salaire, actif } = useCles()
  return useQuery({
    queryKey: [...salaire, 'contrats'],
    queryFn: () => api.lire<VersionContratDto[]>('/salaire/contrats'),
    enabled: actif,
  })
}

export function usePaies(du: string, au: string) {
  const { salaire, actif } = useCles()
  return useQuery({
    queryKey: [...salaire, 'paies', du, au],
    queryFn: () => api.lire<{ aujourdhui: string; paies: PaieDto[] }>(`/salaire/paies?du=${du}&au=${au}`),
    enabled: actif,
    placeholderData: keepPreviousData,
  })
}

export function useMoisCourant() {
  const { mois, actif } = useCles()
  return useQuery({
    queryKey: [...mois, 'courant'],
    queryFn: () => api.lire<MoisBudgetaireDto>('/mois/courant'),
    enabled: actif,
  })
}

function useInvalider() {
  const client = useQueryClient()
  const { salaire, mois } = useCles()
  return () =>
    Promise.all([client.invalidateQueries({ queryKey: salaire }), client.invalidateQueries({ queryKey: mois })])
}

export function useCreerContrat() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: (saisie: SaisieContrat) => api.creer<VersionContratDto>('/salaire/contrats', saisie),
    onSuccess: invalider,
  })
}

export function useModifierContrat() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: ({ id, ...modif }: Partial<SaisieContrat> & { id: string }) =>
      api.modifier<VersionContratDto>(`/salaire/contrats/${id}`, modif),
    onSuccess: invalider,
  })
}

export function useSupprimerContrat() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: (id: string) => api.supprimer(`/salaire/contrats/${id}`),
    onSuccess: invalider,
  })
}

export function useEnregistrerPrimes() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: ({ mois, ...saisie }: SaisiePrimesPaie & { mois: string }) => api.modifier<void>(`/salaire/paies/${mois}/primes`, saisie),
    onSuccess: invalider,
  })
}

export function useRecevoirPaie() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: ({ mois, ...saisie }: SaisieReception & { mois: string }) => api.creer<void>(`/salaire/paies/${mois}/reception`, saisie),
    onSuccess: invalider,
  })
}

export function useAnnulerReception() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: (mois: string) => api.supprimer(`/salaire/paies/${mois}/reception`),
    onSuccess: invalider,
  })
}
