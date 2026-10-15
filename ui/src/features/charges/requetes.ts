import type {
  CategorieDto,
  ChargeDto,
  DetteDto,
  PonctuelDto,
  ResumeChargesDto,
  SaisieCategorie,
  SaisieCharge,
  SaisieDette,
  SaisiePaiementDette,
  SaisiePonctuel,
} from '@mysalary/partage'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useActualiserDonnees } from '../../lib/actualisation'
import { api } from '../../lib/api'
import { CLE_COMPTE, useCompte } from '../../state/compte'
import { useUtilisateurCourant } from '../compte/requetes'

/** Requêtes des charges, ponctuels, dettes et catégories. Toute écriture recalcule aussi les mois. */
function useCles() {
  const { id } = useCompte()
  const actif = Boolean(useUtilisateurCourant())
  return { actif, charges: [CLE_COMPTE, id, 'charges'] as const, mois: [CLE_COMPTE, id, 'mois'] as const }
}

function useLecture<T>(sousCle: string, chemin: string) {
  const { charges, actif } = useCles()
  return useQuery({ queryKey: [...charges, sousCle], queryFn: () => api.lire<T>(chemin), enabled: actif })
}

export const useCategories = () => useLecture<CategorieDto[]>('categories', '/categories')
export const useCharges = () => useLecture<ChargeDto[]>('liste', '/charges')
export const usePonctuels = () => useLecture<PonctuelDto[]>('ponctuels', '/ponctuels')
export const useDettes = () => useLecture<DetteDto[]>('dettes', '/dettes')
export const useResumeCharges = () => useLecture<ResumeChargesDto>('resume', '/charges/resume')

/** Toute écriture recharge toutes les vues du compte (lib/actualisation). */
function useInvalider() {
  return useActualiserDonnees()
}

/** Création (POST) ou modification (PUT /:id) d'une ressource, selon la présence d'un `id`. */
function useEnregistrer<S extends object>(chemin: string) {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: async ({ id, ...saisie }: S & { id?: string }): Promise<{ id: string }> => {
      if (id) {
        await api.modifier<void>(`${chemin}/${id}`, saisie)
        return { id }
      }
      return api.creer<{ id: string }>(chemin, saisie)
    },
    onSuccess: invalider,
  })
}

function useSupprimer(chemin: string) {
  const invalider = useInvalider()
  return useMutation({ mutationFn: (id: string) => api.supprimer(`${chemin}/${id}`), onSuccess: invalider })
}

export const useEnregistrerCategorie = () => useEnregistrer<SaisieCategorie>('/categories')
export const useEnregistrerCharge = () => useEnregistrer<SaisieCharge>('/charges')
export const useSupprimerCharge = () => useSupprimer('/charges')
export const useEnregistrerPonctuel = () => useEnregistrer<SaisiePonctuel>('/ponctuels')
export const useSupprimerPonctuel = () => useSupprimer('/ponctuels')
export const useEnregistrerDette = () => useEnregistrer<SaisieDette>('/dettes')
export const useSupprimerDette = () => useSupprimer('/dettes')

export function useAjouterPaiement() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: ({ detteId, ...saisie }: SaisiePaiementDette & { detteId: string }) =>
      api.creer<{ id: string }>(`/dettes/${detteId}/paiements`, saisie),
    onSuccess: invalider,
  })
}

export function useSupprimerPaiement() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: ({ detteId, paiementId }: { detteId: string; paiementId: string }) => api.supprimer(`/dettes/${detteId}/paiements/${paiementId}`),
    onSuccess: invalider,
  })
}
