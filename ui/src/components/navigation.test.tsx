import { act, fireEvent, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FournisseurSaisieRapide } from '../features/depenses/SaisieRapide'
import { api } from '../lib/api'
import { useCompte } from '../state/compte'
import { rendre } from '../test/outils'
import { ErreurPage } from './ErreurPage'

vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

afterEach(() => vi.restoreAllMocks())

/** Choisit puis quitte un compte, comme l'écran Profils. */
function Bascule() {
  const { id, choisir, quitter } = useCompte()
  return (
    <>
      <p>Compte : {id ?? 'aucun'}</p>
      <button type="button" onClick={() => choisir('u1')}>
        Choisir
      </button>
      <button type="button" onClick={quitter}>
        Quitter
      </button>
    </>
  )
}

function Plante({ plante }: { plante: boolean }) {
  if (plante) throw new Error('panne')
  return <p>Page affichée</p>
}

function Pages() {
  const [page, setPage] = useState('/mois')
  return (
    <>
      <button type="button" onClick={() => setPage('/objectifs')}>
        Objectifs
      </button>
      <ErreurPage cle={page}>
        <Plante plante={page === '/mois'} />
      </ErreurPage>
    </>
  )
}

describe('pages blanches (correctif)', () => {
  it('choisir puis quitter un compte ne fait plus planter la saisie rapide (ordre des hooks)', async () => {
    vi.mocked(api.lire).mockResolvedValue([{ id: 'u1', prenom: 'Essai', devise: 'MAD' }])
    rendre(
      <FournisseurSaisieRapide>
        <Bascule />
      </FournisseurSaisieRapide>,
      { route: '/mois', compte: null },
    )
    expect(screen.getByText('Compte : aucun')).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Choisir' })))
    expect(await screen.findByText('Compte : u1')).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Quitter' })))
    expect(screen.getByText('Compte : aucun')).toBeInTheDocument()
  })

  it('une erreur reste dans sa page, avec « Recharger » ; la page suivante s’affiche normalement', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(api.lire).mockResolvedValue([])
    rendre(<Pages />, { route: '/mois' })
    expect(screen.getByRole('alert')).toHaveTextContent('Cette page n’a pas pu s’afficher.')
    expect(screen.getByRole('button', { name: 'Recharger' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Objectifs' }))
    expect(screen.getByText('Page affichée')).toBeInTheDocument()
  })
})
