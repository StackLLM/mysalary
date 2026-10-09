import type { MoisBudgetaireDto, PaieDto, Utilisateur, VersionContratDto } from '@mysalary/partage'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { rendre } from '../../test/outils'
import { PagePlan } from '../plan/PagePlan'

vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const compte: Utilisateur = {
  id: 'u1',
  prenom: 'Essai',
  devise: 'MAD',
  onboardingEtape: 0,
  onboardingTermine: false,
  creeLe: '2026-10-07T10:00:00.000Z',
  derniereOuverture: null,
}

const version: VersionContratDto = {
  id: 'v1',
  moisEffet: '2026-11' as VersionContratDto['moisEffet'],
  montantNet: 1_000_000,
  jourHabituel: 27,
  regleJourNonOuvre: 'aucune',
  financeMoisSuivant: true,
  creeLe: '2026-10-07T10:00:00.000Z',
}

const fevrier = {
  mois: '2027-02',
  versionId: 'v1',
  statut: 'enRetard',
  datePrevue: '2027-01-27',
  dateReelle: null,
  debutMois: '2027-01-27',
  sourceDebut: 'prevue',
  joursDeRetard: 1,
  lignes: [{ id: null, type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: 1_000_000, montantRecu: null }],
  totalPrevu: 1_000_000,
  totalRecu: null,
  ecart: null,
} as unknown as PaieDto

const moisCourant = {
  cle: '2027-01',
  debut: '2026-12-27',
  fin: '2027-01-26',
  nbJours: 31,
  statut: 'enCours',
  sourceDebut: 'reelle',
  sourceFin: 'prevue',
  mode: 'cyclePaie',
  sansContrat: false,
  aujourdhui: '2027-01-28',
  joursRestants: 1,
  paie: null,
  semaines: [],
} as unknown as MoisBudgetaireDto

function serveur(versions: VersionContratDto[]) {
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/utilisateurs') return [compte]
    if (chemin === '/salaire/contrats') return versions
    if (chemin === '/mois/courant') return moisCourant
    if (chemin.startsWith('/salaire/paies')) return { aujourdhui: '2027-01-28', paies: versions.length ? [fevrier] : [] }
    throw new Error(`Route non simulée : ${chemin}`)
  })
}

beforeEach(() => {
  vi.mocked(api.lire).mockReset()
  vi.mocked(api.creer).mockReset().mockResolvedValue(undefined)
})

describe('Mon plan › Salaire', () => {
  it('sans contrat : guide vers la saisie et refuse un salaire vide', async () => {
    serveur([])
    rendre(<PagePlan />, { route: '/plan', compte: 'u1' })
    expect(await screen.findByText('Ton salaire')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer mon salaire' }))
    expect(await screen.findByText('Montant obligatoire.')).toBeInTheDocument()
    expect(api.creer).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Salaire net habituel'), { target: { value: '10 000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer mon salaire' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/salaire/contrats', {
        montantNet: 1_000_000,
        jourHabituel: 27,
        regleJourNonOuvre: 'apres',
        financeMoisSuivant: true,
        moisEffet: '2027-01',
      }),
    )
  })

  it('avec contrat : montre la paie en retard et la confirme', async () => {
    serveur([version])
    rendre(<PagePlan />, { route: '/plan', compte: 'u1' })

    const ligne = await screen.findByRole('button', { name: 'Ouvrir la paie de février 2027' })
    expect(within(ligne.parentElement!).getByText('En retard · 1 j')).toBeInTheDocument()
    expect(screen.getByText('Attendue depuis hier')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la paie' }))
    expect(await screen.findByLabelText('Date réelle')).toHaveValue('2027-01-27')
    fireEvent.change(screen.getByLabelText('Salaire reçu'), { target: { value: '9800' } })
    expect(screen.getByText('Écart').nextElementSibling).toHaveTextContent('−200')

    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/salaire/paies/2027-02/reception', { dateReelle: '2027-01-27', salaireRecu: 980_000, primes: [] }),
    )
  })
})
