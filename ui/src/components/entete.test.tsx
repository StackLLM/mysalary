import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../lib/api'
import { rendre } from '../test/outils'
import { Entete } from './Entete'

vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

describe('Entete (structure du template)', () => {
  it('affiche la navigation en haut avec l’onglet actif souligné et l’initiale du compte', async () => {
    vi.mocked(api.lire).mockResolvedValue({ id: 'u1', prenom: 'Oussama', devise: 'MAD' })
    rendre(<Entete />, { route: '/mois', compte: 'u1' })
    const nav = screen.getByRole('navigation', { name: 'Navigation principale' })
    const actif = within(nav).getByRole('link', { name: 'Mois' })
    expect(actif).toHaveAttribute('aria-current', 'page')
    expect(actif.querySelector('span[aria-hidden]')?.className).toContain('opacity-100')
    expect(await screen.findByRole('button', { name: 'Compte : Oussama' })).toHaveTextContent('O')
  })

  it('en mode simple, n’affiche ni navigation ni compte', () => {
    vi.mocked(api.lire).mockResolvedValue([])
    rendre(<Entete simple />, { route: '/onboarding' })
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.queryByRole('button', { name: /Compte/ })).toBeNull()
  })
})
