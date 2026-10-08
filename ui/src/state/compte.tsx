import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { choisirUtilisateur, lireUtilisateurCourant } from './utilisateur'

interface ContexteCompte {
  /** Compte courant, ou null si aucun n'est choisi. */
  id: string | null
  choisir: (id: string) => void
  quitter: () => void
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

  const viderCache = useCallback(
    () => client.removeQueries({ predicate: (q) => q.queryKey[0] === CLE_COMPTE }),
    [client],
  )

  const valeur = useMemo<ContexteCompte>(
    () => ({
      id,
      choisir: (nouveau) => {
        viderCache()
        choisirUtilisateur(nouveau)
        setId(nouveau)
      },
      quitter: () => {
        viderCache()
        choisirUtilisateur(null)
        setId(null)
      },
    }),
    [id, viderCache],
  )

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>
}

export function useCompte() {
  const contexte = useContext(Contexte)
  if (!contexte) throw new Error('useCompte hors de FournisseurCompte')
  return contexte
}
