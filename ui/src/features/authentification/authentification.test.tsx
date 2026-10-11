import type { Reglages, Utilisateur } from '@mysalary/partage'
import { REGLES_SCENARIOS_DEFAUT } from '@mysalary/partage'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GardeCompte } from '../../components/GardeCompte'
import { api, ErreurApi, EVENEMENT_SESSION_EXPIREE } from '../../lib/api'
import { lireUtilisateurCourant } from '../../state/utilisateur'
import { rendre } from '../../test/outils'
import { PageProfils } from '../profils/PageProfils'
import { PageReglages } from '../reglages/PageReglages'

vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const base: Utilisateur = { id: 'u1', prenom: 'Léa', devise: 'MAD', onboardingEtape: 10, onboardingTermine: true, protege: false, creeLe: '2026-10-07T10:00:00.000Z', derniereOuverture: null }
const reglages: Reglages = { modePeriode: 'cyclePaie', debutSemaine: 1, reportHebdo: false, animations: true, reglesScenarios: REGLES_SCENARIOS_DEFAUT, depart: null }

function serveur(u: Utilisateur) {
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/utilisateurs') return [u]
    if (chemin === '/reglages') return reglages
    throw new Error(`Route non simulée : ${chemin}`)
  })
}

beforeEach(() => {
  for (const f of [api.lire, api.creer, api.modifier, toast]) vi.mocked(f).mockReset()
})

describe('connexion à un compte protégé', () => {
  it('le mot de passe est demandé quand le serveur exige une session ; un mauvais est refusé ; le bon ouvre le compte', async () => {
    const protege = { ...base, protege: true }
    serveur(protege)
    let connecte = false
    vi.mocked(api.creer).mockImplementation(async (chemin: string, corps: unknown) => {
      if (chemin === '/utilisateurs/u1/ouvrir') {
        if (!connecte) throw new ErreurApi(401, 'SESSION_REQUISE', 'Connecte-toi pour ouvrir ce compte.')
        return protege
      }
      if ((corps as { motDePasse: string }).motDePasse !== 'bon-mot-de-passe') throw new ErreurApi(401, 'IDENTIFIANTS_REFUSES', 'Mot de passe incorrect.', { motDePasse: 'Mot de passe incorrect.' })
      connecte = true
      return protege
    })
    rendre(<PageProfils />, { route: '/profils', autres: { '/': <p>Aujourd’hui</p> } })
    fireEvent.click(await screen.findByRole('button', { name: /^Léa/ }))
    const dialogue = await screen.findByRole('dialog')
    const champ = within(dialogue).getByLabelText('Mot de passe')
    expect(champ).toHaveAttribute('type', 'password')

    fireEvent.change(champ, { target: { value: 'mauvais' } })
    fireEvent.click(within(dialogue).getByRole('button', { name: 'Se connecter' }))
    expect(await within(dialogue).findByText('Mot de passe incorrect.')).toBeInTheDocument()

    fireEvent.change(champ, { target: { value: 'bon-mot-de-passe' } })
    fireEvent.keyDown(champ, { key: 'Enter' })
    expect(await screen.findByText('Aujourd’hui')).toBeInTheDocument()
    expect(lireUtilisateurCourant()).toBe('u1')
  })
})

describe('mot de passe dans les réglages', () => {
  it('définir : 8 caractères au moins, puis enregistré', async () => {
    serveur(base)
    vi.mocked(api.modifier).mockResolvedValue({ ...base, protege: true })
    rendre(<PageReglages />, { route: '/reglages', compte: 'u1' })
    fireEvent.click(await screen.findByRole('button', { name: 'Définir un mot de passe' }))
    const champ = screen.getByLabelText('Nouveau mot de passe')
    fireEvent.change(champ, { target: { value: 'court' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Au moins 8 caractères.')).toBeInTheDocument()
    expect(api.modifier).not.toHaveBeenCalled()

    fireEvent.change(champ, { target: { value: 'assez-long-maintenant' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/utilisateurs/u1/mot-de-passe', { nouveau: 'assez-long-maintenant' }))
    expect(toast).toHaveBeenCalledWith('Mot de passe défini.')
  })

  it('compte protégé : changer exige l’actuel ; retirer exige l’actuel et le dit s’il est faux', async () => {
    serveur({ ...base, protege: true })
    vi.mocked(api.modifier).mockResolvedValue({ ...base, protege: true })
    vi.mocked(api.creer).mockRejectedValueOnce(new ErreurApi(401, 'IDENTIFIANTS_REFUSES', 'Mot de passe incorrect.', { motDePasse: 'Mot de passe incorrect.' }))
    rendre(<PageReglages />, { route: '/reglages', compte: 'u1' })
    fireEvent.click(await screen.findByRole('button', { name: 'Changer ou retirer' }))
    fireEvent.change(screen.getByLabelText('Mot de passe actuel'), { target: { value: 'ancien-mot-de-passe' } })
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'nouveau-mot-de-passe' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/utilisateurs/u1/mot-de-passe', { actuel: 'ancien-mot-de-passe', nouveau: 'nouveau-mot-de-passe' }))

    fireEvent.click(await screen.findByRole('button', { name: 'Changer ou retirer' }))
    fireEvent.change(screen.getByLabelText('Mot de passe actuel'), { target: { value: 'faux-faux-faux' } })
    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }))
    expect(await screen.findByText('Mot de passe incorrect.')).toBeInTheDocument()
  })
})

describe('session expirée', () => {
  it('quitte le compte, renvoie à Profils et le dit', async () => {
    serveur(base)
    rendre(<GardeCompte>Page protégée</GardeCompte>, { compte: 'u1', autres: { '/profils': <p>Écran profils</p> } })
    expect(await screen.findByText('Page protégée')).toBeInTheDocument()
    act(() => void window.dispatchEvent(new Event(EVENEMENT_SESSION_EXPIREE)))
    expect(await screen.findByText('Écran profils')).toBeInTheDocument()
    expect(lireUtilisateurCourant()).toBeNull()
    expect(toast).toHaveBeenCalledWith('Session expirée. Reconnecte-toi.', expect.anything())
  })
})
