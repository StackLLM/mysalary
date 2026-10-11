import type { ImportDto, OnboardingDto, SaisieDecisionImport, SaisieOnboarding } from '@mysalary/partage'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { CLE_COMPTE, useCompte } from '../../state/compte'
import { useUtilisateurCourant } from '../profils/requetes'

/** Étape atteinte, fin, et import de l'ancienne app (lot 19) : sauvegardés par compte, relus à chaque ouverture. */
function useCle() {
  const { id } = useCompte()
  const actif = Boolean(useUtilisateurCourant())
  return { actif, cle: [CLE_COMPTE, id, 'onboarding'] as const }
}

export function useOnboarding() {
  const { actif, cle } = useCle()
  return useQuery({ queryKey: cle, queryFn: () => api.lire<OnboardingDto>('/onboarding'), enabled: actif })
}

export function useEnregistrerEtape() {
  const client = useQueryClient()
  const { cle } = useCle()
  return useMutation({
    mutationFn: (saisie: SaisieOnboarding) => api.modifier<void>('/onboarding', saisie),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: cle })
      // L'étape et la fin sont aussi portées par le compte (Profils, Aujourd'hui).
      await client.invalidateQueries({ queryKey: ['utilisateurs'] })
    },
  })
}

function useMajImport<T>(fonction: (donnees: T) => Promise<unknown>) {
  const client = useQueryClient()
  const { cle } = useCle()
  return useMutation({ mutationFn: fonction, onSuccess: () => client.invalidateQueries({ queryKey: cle }) })
}

/** Analyse le fichier déposé : propose des lignes, n'écrit rien dans le plan. */
export const useApercuImport = () => useMajImport((fichier: unknown) => api.creer<ImportDto>('/import/apercu', { fichier }))
export const useDeciderLigne = () => useMajImport(({ id, ...decision }: SaisieDecisionImport & { id: string }) => api.modifier<ImportDto>(`/import/lignes/${encodeURIComponent(id)}`, decision))
export const useSupprimerImport = () => useMajImport(() => api.supprimer('/import'))
