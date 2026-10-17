import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { rendre } from '../../test/outils'
import { PageConditions, PageConfidentialite } from './PagesLegales'

vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

beforeEach(() => vi.mocked(api.lire).mockReset())

describe('pages légales', () => {
  it('confidentialité : ce qui est gardé, les droits, et le contact du serveur en lien e-mail', async () => {
    vi.mocked(api.lire).mockResolvedValue({ contact: 'contact@exemple.test' })
    rendre(<PageConfidentialite />, { route: '/confidentialite' })
    expect(screen.getByRole('heading', { name: 'Politique de confidentialité' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '7. Tes droits (loi 09-08)' })).toBeInTheDocument()
    expect(screen.getByText(/Aucune donnée bancaire/)).toBeInTheDocument()
    const contacts = await screen.findAllByRole('link', { name: 'contact@exemple.test' })
    expect(contacts[0]).toHaveAttribute('href', 'mailto:contact@exemple.test')
    expect(screen.getByRole('link', { name: 'Conditions d’utilisation' })).toHaveAttribute('href', '/conditions')
  })

  it('conditions : sans contact configuré, aucune fausse adresse n’est affichée', async () => {
    vi.mocked(api.lire).mockResolvedValue({ contact: null })
    rendre(<PageConditions />, { route: '/conditions' })
    expect(screen.getByRole('heading', { name: 'Conditions d’utilisation' })).toBeInTheDocument()
    expect(await screen.findByText(/l’adresse de contact indiquée par le responsable/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /@/ })).not.toBeInTheDocument()
    expect(screen.getByText(/ni une banque ni un conseil financier/)).toBeInTheDocument()
  })
})
