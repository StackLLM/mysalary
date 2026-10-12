import type { Reglages, Utilisateur } from '@mysalary/partage'
import { REGLES_SCENARIOS_DEFAUT } from '@mysalary/partage'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ErreurApi } from '../../lib/api'
import { rendre } from '../../test/outils'
import { PageReglages } from '../reglages/PageReglages'
import { nomFichierExport } from './saisie'

vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const u1: Utilisateur = { id: 'u1', prenom: 'Léa', devise: 'MAD', onboardingEtape: 10, onboardingTermine: true, email: 'test@exemple.test', emailVerifie: true, creeLe: '2026-10-07T10:00:00.000Z', derniereOuverture: null }
const reglages: Reglages = { modePeriode: 'cyclePaie', debutSemaine: 1, reportHebdo: false, animations: true, reglesScenarios: REGLES_SCENARIOS_DEFAUT, depart: null }
const EXPORT = { format: 'mysalary-export', version: 1, compte: { prenom: 'Léa', devise: 'MAD' }, donnees: {} }

let telechargements: { nom: string; contenu: string }[] = []

beforeEach(() => {
  for (const f of [api.lire, api.creer, api.supprimer, toast]) vi.mocked(f).mockReset()
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/auth/session') return u1
    if (chemin === '/reglages') return reglages
    if (chemin === '/compte/export') return EXPORT
    throw new Error(`Route non simulée : ${chemin}`)
  })
  telechargements = []
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    telechargements.push({ nom: this.download, contenu: '' })
  })
})

describe('nom du fichier d’export', () => {
  it('prénom sans accent ni espace, puis le jour', () => {
    expect(nomFichierExport('Léa Marie', '2026-10-12')).toBe('mysalary-lea-marie-2026-10-12.json')
    expect(nomFichierExport('!!', '2026-10-12')).toBe('mysalary-compte-2026-10-12.json')
  })
})

describe('export, réinitialisation, import', () => {
  it('suppression : l’export est proposé avant, et télécharge le fichier du compte', async () => {
    rendre(<PageReglages />, { route: '/reglages', compte: 'u1' })
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer ce compte' }))
    const dialogue = await screen.findByRole('dialog')
    fireEvent.click(within(dialogue).getByRole('button', { name: /Exporter mes données/ }))
    await waitFor(() => expect(telechargements).toHaveLength(1))
    expect(telechargements[0]!.nom).toMatch(/^mysalary-lea-\d{4}-\d{2}-\d{2}\.json$/)
    expect(api.lire).toHaveBeenCalledWith('/compte/export')
    expect(api.supprimer).not.toHaveBeenCalled()
  })

  it('suppression : le mot de passe est exigé ; un mauvais est signalé', async () => {
    vi.mocked(api.creer).mockRejectedValueOnce(new ErreurApi(401, 'IDENTIFIANTS_REFUSES', 'Mot de passe incorrect.', { motDePasse: 'Mot de passe incorrect.' })).mockResolvedValueOnce(undefined)
    rendre(<PageReglages />, { route: '/reglages', compte: 'u1', autres: { '/connexion': <p>Connexion</p> } })
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer ce compte' }))
    const dialogue = await screen.findByRole('dialog')
    const confirmer = within(dialogue).getByRole('button', { name: 'Supprimer définitivement' })
    expect(confirmer).toBeDisabled()
    fireEvent.change(within(dialogue).getByLabelText('Ton mot de passe'), { target: { value: 'faux' } })
    fireEvent.click(confirmer)
    expect(await within(dialogue).findByText('Mot de passe incorrect.')).toBeInTheDocument()
    fireEvent.change(within(dialogue).getByLabelText('Ton mot de passe'), { target: { value: 'le-bon' } })
    fireEvent.click(confirmer)
    expect(await screen.findByText('Connexion')).toBeInTheDocument()
    expect(api.creer).toHaveBeenLastCalledWith('/compte/suppression', { motDePasse: 'le-bon' })
  })

  it('réglages : changer l’e-mail demande le mot de passe, envoie un lien et garde l’adresse actuelle', async () => {
    vi.mocked(api.modifier).mockRejectedValueOnce(new ErreurApi(401, 'IDENTIFIANTS_REFUSES', 'Mot de passe incorrect.', { motDePasse: 'Mot de passe incorrect.' })).mockResolvedValueOnce({ email: 'neuf@exemple.test' })
    rendre(<PageReglages />, { route: '/reglages', compte: 'u1' })
    expect(await screen.findByText('Confirmé')).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Changer l’e-mail' }))
    fireEvent.change(screen.getByLabelText('Nouvel e-mail'), { target: { value: 'pas un mail' } })
    fireEvent.change(screen.getByLabelText('Ton mot de passe'), { target: { value: 'faux' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Cet e-mail n’est pas valide.')).toBeInTheDocument()
    expect(api.modifier).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Nouvel e-mail'), { target: { value: 'neuf@exemple.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Mot de passe incorrect.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Lien envoyé à neuf@exemple.test. Ton e-mail change quand tu l’ouvres.'))
    expect(api.modifier).toHaveBeenLastCalledWith('/compte/email', { email: 'neuf@exemple.test', motDePasse: 'faux' })
    expect(screen.getAllByText('test@exemple.test').length).toBeGreaterThan(0)
    expect(screen.queryByText('neuf@exemple.test')).not.toBeInTheDocument()
  })

  it('réglages : réinitialiser demande le mot de passe, propose l’export, puis ramène à la mise en route', async () => {
    vi.mocked(api.creer).mockResolvedValue({ ...u1, onboardingEtape: 0, onboardingTermine: false })
    rendre(<PageReglages />, { route: '/reglages', compte: 'u1', autres: { '/onboarding': <p>Mise en route</p> } })
    fireEvent.click(await screen.findByRole('button', { name: 'Réinitialiser ce compte' }))
    const dialogue = await screen.findByRole('dialog')
    expect(within(dialogue).getByRole('button', { name: /Exporter mes données/ })).toBeInTheDocument()
    const confirmer = within(dialogue).getByRole('button', { name: 'Réinitialiser' })
    expect(confirmer).toBeDisabled()
    fireEvent.change(within(dialogue).getByLabelText('Ton mot de passe'), { target: { value: 'mon-mot-de-passe' } })
    fireEvent.click(confirmer)
    expect(await screen.findByText('Mise en route')).toBeInTheDocument()
    expect(api.creer).toHaveBeenCalledWith('/compte/reinitialisation', { motDePasse: 'mon-mot-de-passe' })
    expect(toast).toHaveBeenCalledWith('Compte réinitialisé.')
  })

  it('réglages : un export se restaure dans le compte ; un fichier illisible ou refusé le dit', async () => {
    vi.mocked(api.creer).mockResolvedValue({ utilisateur: u1, lignes: 12 })
    rendre(<PageReglages />, { route: '/reglages', compte: 'u1' })
    const champ = await screen.findByLabelText('Fichier d’export')
    // jsdom ne fournit pas File.text().
    const fichier = (contenu: string) => Object.assign(new File([contenu], 'export.json', { type: 'application/json' }), { text: async () => contenu })

    fireEvent.change(champ, { target: { files: [fichier('pas du json')] } })
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Ce fichier n’est pas un export MySalary.'))
    expect(api.creer).not.toHaveBeenCalled()

    fireEvent.change(champ, { target: { files: [fichier(JSON.stringify(EXPORT))] } })
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Sauvegarde restaurée : 12 éléments.'))
    expect(api.creer).toHaveBeenCalledWith('/compte/restauration', EXPORT)

    vi.mocked(api.creer).mockRejectedValueOnce(new ErreurApi(409, 'CONFLIT', 'Ton compte contient déjà des données. Réinitialise-le d’abord (exporte-le avant si besoin).'))
    fireEvent.change(champ, { target: { files: [fichier(JSON.stringify(EXPORT))] } })
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Ton compte contient déjà des données. Réinitialise-le d’abord (exporte-le avant si besoin).'))
  })
})
