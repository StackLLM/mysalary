import type { Connexion, Inscription, Utilisateur } from '@mysalary/partage'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api, ErreurApi } from '../../lib/api'
import { useCompte } from '../../state/compte'

/** Session du navigateur (lot 23) : le compte connecté, ou `null`. */
export const CLE_SESSION = ['session'] as const

/** Le compte connecté selon le serveur ; `null` sans session. */
export function useSession() {
  return useQuery({
    queryKey: CLE_SESSION,
    queryFn: async () => {
      try {
        return await api.lire<Utilisateur>('/auth/session')
      } catch (e) {
        if (e instanceof ErreurApi && e.statut === 401) return null
        throw e
      }
    },
    staleTime: 60_000,
  })
}

/** Compte courant complet (prénom, devise…), ou undefined pendant le chargement et hors session. */
export function useUtilisateurCourant() {
  const { id } = useCompte()
  const { data } = useSession()
  return data && data.id === id ? data : undefined
}

/** Ouvre le compte connecté : la session est connue tout de suite, sans nouvel aller-retour. */
function useOuvrir() {
  const client = useQueryClient()
  const compte = useCompte()
  return (u: Utilisateur) => {
    client.setQueryData(CLE_SESSION, u)
    compte.choisir(u.id)
  }
}

export function useConnexion() {
  const ouvrir = useOuvrir()
  return useMutation({ mutationFn: (saisie: Connexion) => api.creer<Utilisateur>('/auth/connexion', saisie), onSuccess: ouvrir })
}

export function useInscription() {
  const ouvrir = useOuvrir()
  return useMutation({ mutationFn: (saisie: Inscription) => api.creer<Utilisateur>('/auth/inscription', saisie), onSuccess: ouvrir })
}

/** Ferme la session côté serveur, revient à la connexion, puis oublie tout ce qui était affiché. */
export function useDeconnexion() {
  const client = useQueryClient()
  const compte = useCompte()
  const naviguer = useNavigate()
  return async () => {
    await api.creer<void>('/auth/deconnexion', {}).catch(() => undefined)
    naviguer('/connexion', { replace: true })
    compte.quitter({ volontaire: true })
    client.setQueryData(CLE_SESSION, null)
    client.removeQueries({ predicate: (q) => q.queryKey[0] !== CLE_SESSION[0] })
  }
}

export function useOubliMotDePasse() {
  return useMutation({ mutationFn: (email: string) => api.creer<void>('/auth/mot-de-passe/oubli', { email }) })
}

export function useNouveauMotDePasse() {
  return useMutation({ mutationFn: (saisie: { jeton: string; motDePasse: string }) => api.creer<void>('/auth/mot-de-passe/reinitialisation', saisie) })
}

export function useChangerMotDePasse() {
  return useMutation({ mutationFn: (saisie: { actuel: string; nouveau: string }) => api.modifier<void>('/compte/mot-de-passe', saisie) })
}

export function useRenommerUtilisateur() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ prenom }: { prenom: string }) => api.modifier<Utilisateur>('/compte', { prenom }),
    onSuccess: (u) => client.setQueryData(CLE_SESSION, u),
  })
}

/** Supprime le compte connecté (mot de passe exigé) ; la session se ferme avec lui, retour à la connexion. */
export function useSupprimerCompte() {
  const client = useQueryClient()
  const compte = useCompte()
  const naviguer = useNavigate()
  return useMutation({
    mutationFn: (motDePasse: string) => api.creer<void>('/compte/suppression', { motDePasse }),
    // Ici et non dans l'écran : la fenêtre de confirmation disparaît avec le compte.
    onSuccess: () => {
      naviguer('/connexion', { replace: true })
      compte.quitter({ volontaire: true })
      client.setQueryData(CLE_SESSION, null)
      client.removeQueries({ predicate: (q) => q.queryKey[0] !== CLE_SESSION[0] })
      toast('Compte supprimé.')
    },
  })
}
