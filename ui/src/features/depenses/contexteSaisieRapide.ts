import type { DepenseDto } from '@mysalary/partage'
import { createContext, useContext } from 'react'

/**
 * Contexte de la saisie rapide, dans son propre fichier : modifier `SaisieRapide.tsx` en développement
 * ne recrée pas le contexte (sinon les pages déjà chargées ne trouvent plus le fournisseur : page blanche).
 */
export interface ContexteSaisie {
  /** Ouvre la saisie : vide (à une date proposée, sinon aujourd'hui), ou pour modifier une dépense. */
  ouvrir: (depense?: DepenseDto, options?: { date?: string }) => void
  /** Ouvre la saisie d'un versement d'épargne (lot 10), éventuellement vers un objectif. */
  ouvrirVersement: (options?: { objectifId?: string }) => void
}

export const ContexteSaisieRapide = createContext<ContexteSaisie | null>(null)

export function useSaisieRapide(): ContexteSaisie {
  const c = useContext(ContexteSaisieRapide)
  if (!c) throw new Error('useSaisieRapide hors de FournisseurSaisieRapide')
  return c
}
