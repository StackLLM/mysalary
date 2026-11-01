import type {
  ApercuObjectifDto,
  EpargneDto,
  ObjectifDetailDto,
  ObjectifsDto,
  SaisieMouvementEpargne,
  SaisieObjectif,
  SaisieRealisation,
} from '@mysalary/partage'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { useActualiserDonnees } from '../../lib/actualisation'
import { api } from '../../lib/api'
import { CLE_COMPTE, useCompte } from '../../state/compte'
import { useUtilisateurCourant } from '../compte/requetes'

/** Requêtes de l'épargne et des objectifs. Toute écriture recalcule aussi les mois (épargne du bilan, des semaines). */
function useCles() {
  const { id } = useCompte()
  const actif = Boolean(useUtilisateurCourant())
  return {
    actif,
    epargne: [CLE_COMPTE, id, 'epargne'] as const,
    objectifs: [CLE_COMPTE, id, 'objectifs'] as const,
    mois: [CLE_COMPTE, id, 'mois'] as const,
  }
}

export function useEpargne() {
  const { epargne, actif } = useCles()
  return useQuery({ queryKey: epargne, queryFn: () => api.lire<EpargneDto>('/epargne'), enabled: actif })
}

export function useObjectifs() {
  const { objectifs, actif } = useCles()
  return useQuery({ queryKey: [...objectifs, 'liste'], queryFn: () => api.lire<ObjectifsDto>('/objectifs'), enabled: actif })
}

export function useObjectif(id: string | undefined) {
  const { objectifs, actif } = useCles()
  return useQuery({ queryKey: [...objectifs, 'detail', id], queryFn: () => api.lire<ObjectifDetailDto>(`/objectifs/${id}`), enabled: actif && Boolean(id) })
}

/** Aperçu en direct d'un objectif pas encore enregistré ; `null` tant que la saisie n'est pas complète. */
export function useApercuObjectif(saisie: SaisieObjectif | null, remplace?: string) {
  const { objectifs, actif } = useCles()
  return useQuery({
    queryKey: [...objectifs, 'apercu', saisie, remplace],
    queryFn: () => api.creer<ApercuObjectifDto>(`/objectifs/apercu${remplace ? `?remplace=${remplace}` : ''}`, saisie!),
    enabled: actif && saisie !== null,
    placeholderData: keepPreviousData,
  })
}

/** Toute écriture recharge toutes les vues du compte (lib/actualisation). */
function useInvalider() {
  return useActualiserDonnees()
}

function useEcriture<S, R>(appel: (saisie: S) => Promise<R>) {
  const invalider = useInvalider()
  return useMutation({ mutationFn: appel, onSuccess: invalider })
}

export const useAjouterMouvement = () => useEcriture((s: SaisieMouvementEpargne) => api.creer<{ id: string }>('/epargne/mouvements', s))
export const useSupprimerMouvement = () => useEcriture((id: string) => api.supprimer(`/epargne/mouvements/${id}`))

/** Plan du mois (lot 36) : « pas ce mois-ci », le reprendre, ou annuler ce qui a été épargné ce mois-ci pour un objectif. */
export const useSauterVersement = () => useEcriture((objectifId: string) => api.modifier<void>(`/epargne/plan/${objectifId}/saut`, {}))
export const useReprendreVersement = () => useEcriture((objectifId: string) => api.supprimer(`/epargne/plan/${objectifId}/saut`))
export const useAnnulerVersementsDuMois = () => useEcriture((objectifId: string) => api.supprimer(`/epargne/plan/${objectifId}/versements`))

export function useEnregistrerObjectif() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: async ({ id, ...s }: SaisieObjectif & { id?: string }): Promise<{ id: string }> => {
      if (!id) return api.creer<{ id: string }>('/objectifs', s)
      await api.modifier<void>(`/objectifs/${id}`, s)
      return { id }
    },
    onSuccess: invalider,
  })
}
export const useSupprimerObjectif = () => useEcriture((id: string) => api.supprimer(`/objectifs/${id}`))
export const useOrdonnerObjectifs = () => useEcriture((ids: string[]) => api.modifier<void>('/objectifs/ordre', { ids }))
export const useStatutObjectif = () =>
  useEcriture(({ id, statut }: { id: string; statut: 'actif' | 'pause' | 'abandonne' }) => api.creer<void>(`/objectifs/${id}/statut`, { statut }))
export const useRealiserObjectif = () => useEcriture(({ id, ...s }: SaisieRealisation & { id: string }) => api.creer<void>(`/objectifs/${id}/realiser`, s))
