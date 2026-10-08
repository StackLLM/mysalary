import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { FournisseurAnimations } from '../state/animations'
import { FournisseurCompte } from '../state/compte'
import { choisirUtilisateur } from '../state/utilisateur'

interface Options {
  route?: string
  /** Compte retenu sur l'appareil avant le rendu. */
  compte?: string | null
  /** Pages supplémentaires, ex. un écran Profils factice pour vérifier une redirection. */
  autres?: Record<string, ReactElement>
}

/** Rend un écran avec tous les fournisseurs de l'app, sur une route donnée. */
export function rendre(page: ReactElement, { route = '/', compte = null, autres = {} }: Options = {}) {
  choisirUtilisateur(compte)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <FournisseurAnimations>
        <FournisseurCompte>
          <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path={route.split('?')[0]} element={page} />
              {Object.entries(autres).map(([chemin, element]) => (
                <Route key={chemin} path={chemin} element={element} />
              ))}
            </Routes>
          </MemoryRouter>
        </FournisseurCompte>
      </FournisseurAnimations>
    </QueryClientProvider>,
  )
}
