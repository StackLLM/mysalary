import type { Utilisateur } from '@mysalary/partage'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { CLE_UTILISATEURS } from '../profils/requetes'

function useRafraichirComptes() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: CLE_UTILISATEURS })
}

/** Ouvre une session avec le mot de passe du compte. */
export function useConnecter() {
  return useMutation({ mutationFn: ({ id, motDePasse }: { id: string; motDePasse: string }) => api.creer<Utilisateur>(`/utilisateurs/${id}/connexion`, { motDePasse }) })
}

/** Ferme la session du navigateur ; sans effet si aucune n'est ouverte. */
export const deconnecter = () => api.creer<void>('/deconnexion', {}).catch(() => undefined)

export function useDefinirMotDePasse() {
  const rafraichir = useRafraichirComptes()
  return useMutation({
    mutationFn: ({ id, actuel, nouveau }: { id: string; actuel?: string; nouveau: string }) =>
      api.modifier<Utilisateur>(`/utilisateurs/${id}/mot-de-passe`, { ...(actuel ? { actuel } : {}), nouveau }),
    onSuccess: rafraichir,
  })
}

export function useRetirerMotDePasse() {
  const rafraichir = useRafraichirComptes()
  return useMutation({
    mutationFn: ({ id, motDePasse }: { id: string; motDePasse: string }) => api.creer<Utilisateur>(`/utilisateurs/${id}/mot-de-passe/retrait`, { motDePasse }),
    onSuccess: rafraichir,
  })
}
