import type { ResumeRevenusDto, RevenuRecuDto, SourceRevenuDto, Utilisateur, VersionContratDto } from '@mysalary/partage'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { rendre } from '../../test/outils'
import { PagePlan } from '../plan/PagePlan'
import { apercuSource, libelleFrequence } from './saisie'

vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const compte: Utilisateur = { id: 'u1', prenom: 'Essai', devise: 'MAD', onboardingEtape: 0, onboardingTermine: false, creeLe: '2026-10-07T10:00:00.000Z', derniereOuverture: null }
const contrat = { id: 'v1', moisEffet: '2026-10', montantNet: 1_000_000, jourHabituel: 27, regleJourNonOuvre: 'apres', financeMoisSuivant: true, creeLe: '' } as unknown as VersionContratDto

const totaux = (n: number) => ({ garanti: 0, probable: n, incertain: 0, prudent: 0, realiste: n, ambitieux: n })
const resume = {
  aujourdhui: '2027-01-20',
  moisCourant: '2027-01',
  sansContrat: false,
  equivalentMensuel: totaux(33_333),
  douzeMois: { du: '2027-01', au: '2027-12', totaux: totaux(400_000) },
  moisEnCours: { prevu: totaux(0), recu: 0 },
  prochains: [],
} as unknown as ResumeRevenusDto

const prime = {
  id: 's1',
  libelle: 'Prime de bilan',
  type: 'prime',
  montant: 200_000,
  frequence: 'moisChoisis',
  mois: [6, 12],
  versement: 'avecPaie',
  jour: null,
  certitude: 'probable',
  debut: '2027-01',
  fin: null,
  creeLe: '',
  equivalentMensuel: 33_333,
  prochainVersement: null,
  active: true,
} as unknown as SourceRevenuDto

function serveur(sources: SourceRevenuDto[], recus: RevenuRecuDto[] = []) {
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/utilisateurs') return [compte]
    if (chemin === '/salaire/contrats') return [contrat]
    if (chemin === '/revenus/sources') return sources
    if (chemin === '/revenus/resume') return resume
    if (chemin === '/revenus/recus') return recus
    if (chemin.startsWith('/revenus/prevus')) return { aujourdhui: '2027-01-20', revenus: [] }
    throw new Error(`Route non simulée : ${chemin}`)
  })
}

beforeEach(() => {
  vi.mocked(api.lire).mockReset()
  vi.mocked(api.creer).mockReset().mockResolvedValue({ id: 'nouveau', libelle: 'Cadeau' })
})

describe('règles d’affichage', () => {
  it('décrit la fréquence en mots', () => {
    expect(libelleFrequence({ frequence: 'moisChoisis', mois: [6, 12], debut: '2027-01' } as never)).toBe('En juin et décembre')
    expect(libelleFrequence({ frequence: 'annuelle', mois: [], debut: '2027-03' } as never)).toBe('Chaque année en mars')
    expect(libelleFrequence({ frequence: 'unique', mois: [], debut: '2027-03' } as never)).toBe('Une fois, en mars 2027')
  })

  it('annonce les prochains versements', () => {
    expect(apercuSource({ frequence: 'trimestrielle', mois: [], debut: '2027-01', fin: null, versement: 'dateSeparee', jour: 31 }, '2027-01-10', true)).toBe(
      'Prochains versements : 31 janv. 2027 · 30 avr. 2027 · 31 juil. 2027.',
    )
    expect(apercuSource({ frequence: 'unique', mois: [], debut: '2026-01', fin: null, versement: 'avecPaie', jour: null }, '2027-01-10', true)).toBe('Aucun versement à venir.')
  })
})

describe('Mon plan › Autres revenus', () => {
  it('sans revenu : formulaire, contrôle des mois, puis envoi', async () => {
    serveur([])
    rendre(<PagePlan />, { route: '/plan', compte: 'u1' })
    fireEvent.mouseDown(await screen.findByRole('tab', { name: 'Autres revenus' }))
    expect(await screen.findByText('Tes revenus en plus du salaire')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Libellé'), { target: { value: 'Prime de bilan' } })
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '2000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter ce revenu' }))
    expect(await screen.findByText('Choisis au moins un mois.')).toBeInTheDocument()
    expect(api.creer).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'juin' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Incertain' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter ce revenu' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/revenus/sources', {
        libelle: 'Prime de bilan',
        type: 'prime',
        montant: 200_000,
        frequence: 'moisChoisis',
        mois: [6],
        versement: 'avecPaie',
        jour: null,
        certitude: 'incertain',
        debut: '2027-01',
        fin: null,
      }),
    )
  })

  it('liste les revenus et note un revenu libre', async () => {
    serveur([prime])
    rendre(<PagePlan />, { route: '/plan', compte: 'u1' })
    fireEvent.mouseDown(await screen.findByRole('tab', { name: 'Autres revenus' }))
    expect(await screen.findByRole('button', { name: 'Modifier Prime de bilan' })).toBeInTheDocument()
    expect(screen.getByTitle('En juin et décembre · Avec la paie')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Noter un revenu reçu' })[0]!)
    fireEvent.change(await screen.findByLabelText('Libellé'), { target: { value: 'Cadeau' } })
    fireEvent.change(screen.getByLabelText('Montant reçu'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: 'Noter ce revenu' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/revenus/recus', { sourceId: null, moisOccurrence: null, date: '2027-01-20', montant: 30_000, libelle: 'Cadeau' }),
    )
  })
})
