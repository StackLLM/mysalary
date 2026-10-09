import type { Reglages, Utilisateur } from '@mysalary/partage'
import { REGLES_SCENARIOS_DEFAUT } from '@mysalary/partage'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GardeCompte } from '../../components/GardeCompte'
import { api } from '../../lib/api'
import { lireUtilisateurCourant } from '../../state/utilisateur'
import { rendre } from '../../test/outils'
import { PageReglages } from '../reglages/PageReglages'
import { PageProfils } from './PageProfils'

vi.mock('sonner', () => ({ toast: vi.fn() }))

vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const oussama: Utilisateur = {
  id: 'u1',
  prenom: 'Oussama',
  devise: 'MAD',
  onboardingEtape: 0,
  onboardingTermine: false,
  creeLe: '2026-10-07T10:00:00.000Z',
  derniereOuverture: '2026-10-07T12:00:00.000Z',
}
const reglages: Reglages = { modePeriode: 'cyclePaie', debutSemaine: 1, reportHebdo: false, animations: true, reglesScenarios: REGLES_SCENARIOS_DEFAUT, depart: null }

function serveur(utilisateurs: Utilisateur[]) {
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/utilisateurs') return utilisateurs
    if (chemin === '/reglages') return reglages
    throw new Error(`Route non simulée : ${chemin}`)
  })
}

const pageProtegee = <GardeCompte>Page protégée</GardeCompte>
const ecranProfils = { '/profils': <p>Écran profils</p> }

beforeEach(() => {
  vi.mocked(api.lire).mockReset()
  vi.mocked(api.creer).mockReset()
  vi.mocked(api.modifier).mockReset()
  vi.mocked(toast).mockReset()
})

describe('garde des pages de compte', () => {
  it('renvoie vers Profils quand aucun compte n’est choisi', async () => {
    serveur([oussama])
    rendre(pageProtegee, { autres: ecranProfils })
    expect(await screen.findByText('Écran profils')).toBeInTheDocument()
  })

  it('oublie un compte supprimé et renvoie vers Profils', async () => {
    serveur([])
    rendre(pageProtegee, { compte: 'disparu', autres: ecranProfils })
    expect(await screen.findByText('Écran profils')).toBeInTheDocument()
    expect(lireUtilisateurCourant()).toBeNull()
  })

  it('affiche la page quand le compte existe', async () => {
    serveur([oussama])
    rendre(pageProtegee, { compte: 'u1' })
    expect(await screen.findByText('Page protégée')).toBeInTheDocument()
  })
})

describe('écran Profils', () => {
  it('affiche un état vide qui guide vers la création', async () => {
    serveur([])
    rendre(<PageProfils />, { route: '/profils' })
    expect(await screen.findByText('Aucun compte pour l’instant.')).toBeInTheDocument()
  })

  it('liste les comptes et signale le compte actuel', async () => {
    serveur([oussama])
    rendre(<PageProfils />, { route: '/profils', compte: 'u1' })
    expect(await screen.findByText('Oussama')).toBeInTheDocument()
    expect(screen.getByText('Compte actuel')).toBeInTheDocument()
    expect(screen.getByText(/Ouvert le/)).toBeInTheDocument()
  })

  it('refuse un prénom vide sans appeler le serveur', async () => {
    serveur([])
    rendre(<PageProfils />, { route: '/profils' })
    fireEvent.click(await screen.findByRole('button', { name: 'Créer le compte' }))
    expect(await screen.findByText('Le prénom est obligatoire.')).toBeInTheDocument()
    expect(api.creer).not.toHaveBeenCalled()
  })

  it('crée le compte, l’ouvre et le retient sur l’appareil', async () => {
    serveur([])
    vi.mocked(api.creer).mockResolvedValue(oussama)
    rendre(<PageProfils />, { route: '/profils', autres: { '/': <p>Aujourd’hui</p> } })
    fireEvent.change(await screen.findByLabelText('Prénom'), { target: { value: 'Oussama' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer le compte' }))
    expect(await screen.findByText('Aujourd’hui')).toBeInTheDocument()
    expect(api.creer).toHaveBeenCalledWith('/utilisateurs', { prenom: 'Oussama', devise: 'MAD' })
    expect(api.creer).toHaveBeenCalledWith('/utilisateurs/u1/ouvrir', {})
    expect(lireUtilisateurCourant()).toBe('u1')
  })
})

describe('écran Réglages', () => {
  it('enregistre un réglage dès qu’il change', async () => {
    serveur([oussama])
    vi.mocked(api.modifier).mockResolvedValue({ ...reglages, reportHebdo: true })
    rendre(<PageReglages />, { route: '/reglages', compte: 'u1' })
    fireEvent.click(await screen.findByRole('switch', { name: /Reporter le reste/ }))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/reglages', { reportHebdo: true }))
  })

  it('change le mode de période', async () => {
    serveur([oussama])
    vi.mocked(api.modifier).mockResolvedValue({ ...reglages, modePeriode: 'calendaire' })
    rendre(<PageReglages />, { route: '/reglages', compte: 'u1' })
    fireEvent.click(await screen.findByRole('radio', { name: /Mois calendaire/ }))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/reglages', { modePeriode: 'calendaire' }))
  })
})

describe('suppression du compte courant', () => {
  it('quitte le compte sans afficher « ce compte n’existe plus »', async () => {
    let comptes = [oussama]
    vi.mocked(api.lire).mockImplementation(async (chemin: string) => (chemin === '/utilisateurs' ? comptes : reglages))
    vi.mocked(api.supprimer).mockImplementation(async () => {
      comptes = []
    })
    rendre(
      <GardeCompte>
        <PageReglages />
      </GardeCompte>,
      { route: '/reglages', compte: 'u1', autres: ecranProfils },
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer ce compte' }))
    fireEvent.change(screen.getByLabelText(/Pour confirmer/), { target: { value: 'Oussama' } })
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer définitivement' }))
    expect(await screen.findByText('Écran profils')).toBeInTheDocument()
    expect(lireUtilisateurCourant()).toBeNull()
    expect(toast).toHaveBeenCalledWith('Compte de Oussama supprimé.')
    expect(toast).not.toHaveBeenCalledWith('Ce compte n’existe plus. Choisis un autre compte.', expect.anything())
  })
})
