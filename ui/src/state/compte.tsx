import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { EVENEMENT_SESSION_EXPIREE } from '../lib/api'
import { choisirUtilisateur, lireUtilisateurCourant } from './utilisateur'

interface ContexteCompte {
  /** Compte courant, ou null si aucun n'est choisi. */
  id: string | null
  choisir: (id: string) => void
  /** `volontaire` : déconnexion ou suppression demandée, la connexion s'ouvre sans « page demandée ». */
  quitter: (options?: { volontaire?: boolean }) => void
  /** Le dernier départ était volontaire. */
  volontaire: boolean
}

const Contexte = createContext<ContexteCompte | null>(null)

/** Préfixe de toutes les clés de requêtes propres à un compte : `['compte', id, …]`. */
export const CLE_COMPTE = 'compte'

/**
 * Compte courant (UX.md § 4.0). Changer de compte vide le cache des données
 * de l'ancien compte : rien ne reste affiché d'un compte à l'autre.
 */
export function FournisseurCompte({ children }: { children: ReactNode }) {
  const client = useQueryClient()
  const [id, setId] = useState(lireUtilisateurCourant)
  const [volontaire, setVolontaire] = useState(false)

  const viderCache = useCallback(
    () => client.removeQueries({ predicate: (q) => q.queryKey[0] === CLE_COMPTE }),
    [client],
  )

  const valeur = useMemo<ContexteCompte>(
    () => ({
      id,
      volontaire,
      choisir: (nouveau) => {
        viderCache()
        choisirUtilisateur(nouveau)
        setVolontaire(false)
        setId(nouveau)
      },
      quitter: (options) => {
        setVolontaire(Boolean(options?.volontaire))
        viderCache()
        choisirUtilisateur(null)
        setId(null)
      },
    }),
    [id, volontaire, viderCache],
  )

  const quitter = valeur.quitter
  useEffect(() => {
    const surExpiration = () => {
      quitter()
      client.setQueryData(['session'], null)
      toast('Session expirée. Reconnecte-toi.', { id: 'session-expiree' })
    }
    window.addEventListener(EVENEMENT_SESSION_EXPIREE, surExpiration)
    return () => window.removeEventListener(EVENEMENT_SESSION_EXPIREE, surExpiration)
  }, [quitter, client])

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>
}

export function useCompte() {
  const contexte = useContext(Contexte)
  if (!contexte) throw new Error('useCompte hors de FournisseurCompte')
  return contexte
}
