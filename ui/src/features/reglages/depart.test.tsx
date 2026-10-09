import { REGLES_SCENARIOS_DEFAUT, type Reglages } from '@mysalary/partage'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { rendre } from '../../test/outils'
import { PageReglages } from './PageReglages'

vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const compte = { id: 'u1', prenom: 'Essai', devise: 'MAD', onboardingEtape: 0, onboardingTermine: false, creeLe: '2027-01-01T10:00:00.000Z', derniereOuverture: null }
let reglages: Reglages

beforeEach(() => {
  reglages = { modePeriode: 'cyclePaie', debutSemaine: 1, reportHebdo: false, animations: true, reglesScenarios: REGLES_SCENARIOS_DEFAUT, depart: null }
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/utilisateurs') return [compte]
    if (chemin === '/reglages') return reglages
    if (chemin === '/mois/courant') return { cle: '2027-01' }
    throw new Error(`Route non simulée : ${chemin}`)
  })
  vi.mocked(api.modifier).mockReset().mockImplementation(async (_c: string, modif: unknown) => ({ ...reglages, ...(modif as object) }))
})

describe('Réglages › Compte courant (lot 13)', () => {
  it('solde de départ : mois choisi parmi les 13 derniers, montant négatif permis, puis retrait', async () => {
    rendre(<PageReglages />, { route: '/reglages', compte: 'u1' })
    expect(await screen.findByText('Aucun : le cumul part de 0 au premier mois suivi.')).toBeInTheDocument()
    const mois = screen.getByLabelText('Au début du mois') as HTMLSelectElement
    await waitFor(() => expect(mois.options).toHaveLength(13))
    expect(mois.options[0]!.textContent).toBe('Janvier 2027')
    fireEvent.change(mois, { target: { value: '2026-12' } })
    fireEvent.change(screen.getByLabelText('Solde du compte courant'), { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le solde' }))
    expect(await screen.findByText(/Montant illisible/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Solde du compte courant'), { target: { value: '-1500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le solde' }))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/reglages', { depart: { mois: '2026-12', solde: -150_000 } }))
  })

  it('un solde enregistré s’affiche et peut être retiré', async () => {
    reglages = { ...reglages, depart: { mois: '2026-12', solde: 200_000 } as Reglages['depart'] }
    rendre(<PageReglages />, { route: '/reglages', compte: 'u1' })
    expect((await screen.findByText(/^Actuel :/)).textContent!.replace(/\s+/g, ' ')).toBe('Actuel : 2 000 DH au début de décembre 2026.')
    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/reglages', { depart: null }))
  })
})
