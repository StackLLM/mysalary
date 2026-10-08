import type { CreationUtilisateur, Utilisateur } from '@mysalary/partage'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { useCompte } from '../../state/compte'

export const CLE_UTILISATEURS = ['utilisateurs'] as const

export function useUtilisateurs() {
  return useQuery({ queryKey: CLE_UTILISATEURS, queryFn: () => api.lire<Utilisateur[]>('/utilisateurs') })
}

/** Compte courant complet (prénom, devise…), ou undefined pendant le chargement. */
export function useUtilisateurCourant() {
  const { id } = useCompte()
  const { data } = useUtilisateurs()
  return data?.find((u) => u.id === id)
}

function useInvalider() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: CLE_UTILISATEURS })
}

export function useCreerUtilisateur() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: (donnees: CreationUtilisateur) => api.creer<Utilisateur>('/utilisateurs', donnees),
    onSuccess: invalider,
  })
}

export function useOuvrirUtilisateur() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: (id: string) => api.creer<Utilisateur>(`/utilisateurs/${id}/ouvrir`, {}),
    onSuccess: invalider,
  })
}

export function useRenommerUtilisateur() {
  const invalider = useInvalider()
  return useMutation({
    mutationFn: ({ id, prenom }: { id: string; prenom: string }) => api.modifier<Utilisateur>(`/utilisateurs/${id}`, { prenom }),
    onSuccess: invalider,
  })
}

export function useSupprimerUtilisateur() {
  const invalider = useInvalider()
  const compte = useCompte()
  return useMutation({
    mutationFn: (utilisateur: Utilisateur) => api.supprimer(`/utilisateurs/${utilisateur.id}`),
    onSuccess: (_reponse, utilisateur) => {
      // Quitter le compte AVANT de recharger la liste : sinon la garde le croit
      // « disparu » et affiche « Ce compte n'existe plus » en plus du bon message.
      // Le message est donné ici, car l'écran d'origine peut déjà être démonté.
      if (compte.id === utilisateur.id) compte.quitter()
      toast(`Compte de ${utilisateur.prenom} supprimé.`)
      return invalider()
    },
  })
}
