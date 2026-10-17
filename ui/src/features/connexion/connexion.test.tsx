import type { Utilisateur } from '@mysalary/partage'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GardeCompte } from '../../components/GardeCompte'
import { api, ErreurApi, EVENEMENT_SESSION_EXPIREE } from '../../lib/api'
import { lireUtilisateurCourant } from '../../state/utilisateur'
import { rendre } from '../../test/outils'
import { PageConnexion } from './PageConnexion'
import { PageInscription } from './PageInscription'
import { PageMotDePasseOublie } from './PageMotDePasseOublie'
import { PageNouveauMotDePasse } from './PageNouveauMotDePasse'
import { PageVerificationEmail } from './PageVerificationEmail'
import { BandeauEmail } from '../compte/BandeauEmail'
import { suiteSure } from './saisie'

vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const lea: Utilisateur = { id: 'u1', prenom: 'Léa', email: 'lea@exemple.test', emailVerifie: true, devise: 'MAD', onboardingEtape: 10, onboardingTermine: true, creeLe: '2026-10-07T10:00:00.000Z', derniereOuverture: null }
const sansSession = () => vi.mocked(api.lire).mockImplementation(async () => Promise.reject(new ErreurApi(401, 'SESSION_REQUISE', 'Connecte-toi pour continuer.')))

beforeEach(() => {
  for (const f of [api.lire, api.creer, toast]) vi.mocked(f).mockReset()
  sansSession()
})

describe('règles', () => {
  it('suite : seulement une adresse interne de l’app', () => {
    expect(suiteSure('/objectifs/o1?vue=a')).toBe('/objectifs/o1?vue=a')
    for (const mauvaise of [null, 'https://pirate.test', '//pirate.test', '/connexion', 'objectifs']) expect(suiteSure(mauvaise)).toBe('/')
  })
})

describe('connexion', () => {
  it('valide les champs sans appeler le serveur ; affiche l’erreur du serveur ; puis ouvre la page demandée', async () => {
    rendre(<PageConnexion />, { route: '/connexion?suite=%2Fobjectifs', chemin: '/connexion', autres: { '/objectifs': <p>Objectifs</p> } })
    const formulaire = screen.getByRole('form', { name: 'Connexion' })
    fireEvent.click(within(formulaire).getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByText('L’e-mail est obligatoire.')).toBeInTheDocument()
    expect(screen.getByText('Le mot de passe est obligatoire.')).toBeInTheDocument()
    expect(api.creer).not.toHaveBeenCalled()

    vi.mocked(api.creer).mockRejectedValueOnce(new ErreurApi(401, 'IDENTIFIANTS_REFUSES', 'E-mail ou mot de passe incorrect.'))
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: ' Lea@Exemple.test ' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'mauvais' } })
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou mot de passe incorrect.')
    expect(api.creer).toHaveBeenCalledWith('/auth/connexion', { email: 'lea@exemple.test', motDePasse: 'mauvais' })

    vi.mocked(api.creer).mockResolvedValueOnce(lea)
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByText('Objectifs')).toBeInTheDocument()
    expect(lireUtilisateurCourant()).toBe('u1')
  })

  it('afficher le mot de passe ; « oublié » garde l’e-mail saisi', async () => {
    rendre(<PageConnexion />, { route: '/connexion' })
    const champ = screen.getByLabelText('Mot de passe')
    expect(champ).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }))
    expect(champ).toHaveAttribute('type', 'text')
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'lea@exemple.test' } })
    expect(screen.getByRole('link', { name: 'Mot de passe oublié ?' })).toHaveAttribute('href', '/mot-de-passe/oubli?email=lea%40exemple.test')
  })
})

describe('inscription', () => {
  it('erreurs par champ, e-mail déjà pris (serveur), puis mise en route', async () => {
    rendre(<PageInscription />, { route: '/inscription', autres: { '/onboarding': <p>Mise en route</p> } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'court' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    expect(await screen.findByText('Le prénom est obligatoire.')).toBeInTheDocument()
    expect(screen.getByText('Au moins 8 caractères.')).toBeInTheDocument()
    expect(screen.getByText(/Accepte les conditions d’utilisation/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'conditions d’utilisation' })).toHaveAttribute('href', '/conditions')
    expect(screen.getByRole('link', { name: 'politique de confidentialité' })).toHaveAttribute('href', '/confidentialite')

    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Léa' } })
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'lea@exemple.test' } })
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'un-bon-mot-de-passe' } })
    fireEvent.click(screen.getByRole('button', { name: 'EUR' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /J’accepte les conditions/ }))
    vi.mocked(api.creer).mockRejectedValueOnce(new ErreurApi(409, 'CONFLIT', 'Un compte existe déjà avec cet e-mail.', { email: 'Un compte existe déjà avec cet e-mail. Connecte-toi.' }))
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    expect(await screen.findByText('Un compte existe déjà avec cet e-mail. Connecte-toi.')).toBeInTheDocument()
    expect(api.creer).toHaveBeenCalledWith('/auth/inscription', { prenom: 'Léa', email: 'lea@exemple.test', motDePasse: 'un-bon-mot-de-passe', devise: 'EUR', accepteConditions: true })

    vi.mocked(api.creer).mockResolvedValueOnce({ ...lea, onboardingTermine: false })
    fireEvent.click(screen.getByRole('button', { name: 'Créer mon compte' }))
    expect(await screen.findByText('Mise en route')).toBeInTheDocument()
  })
})

describe('mot de passe oublié et nouveau mot de passe', () => {
  it('oubli : même message que l’e-mail existe ou non', async () => {
    vi.mocked(api.creer).mockResolvedValue(undefined)
    rendre(<PageMotDePasseOublie />, { route: '/mot-de-passe/oubli?email=lea%40exemple.test', chemin: '/mot-de-passe/oubli' })
    expect(screen.getByLabelText('E-mail')).toHaveValue('lea@exemple.test')
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Si un compte existe pour lea@exemple.test, un lien vient d’être envoyé.')
    expect(api.creer).toHaveBeenCalledWith('/auth/mot-de-passe/oubli', { email: 'lea@exemple.test' })
  })

  it('nouveau : confirmation identique exigée ; lien mort ; succès → connexion', async () => {
    const jeton = 'j'.repeat(43)
    rendre(<PageNouveauMotDePasse />, { route: `/mot-de-passe/nouveau?jeton=${jeton}`, chemin: '/mot-de-passe/nouveau', autres: { '/connexion': <p>Connexion</p> } })
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'nouveau-mot-de-passe' } })
    fireEvent.change(screen.getByLabelText('Confirmation'), { target: { value: 'autre-chose' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Les deux mots de passe sont différents.')).toBeInTheDocument()
    expect(api.creer).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Confirmation'), { target: { value: 'nouveau-mot-de-passe' } })
    vi.mocked(api.creer).mockResolvedValueOnce(undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Connexion')).toBeInTheDocument()
    expect(api.creer).toHaveBeenCalledWith('/auth/mot-de-passe/reinitialisation', { jeton, motDePasse: 'nouveau-mot-de-passe' })
    expect(toast).toHaveBeenCalledWith('Mot de passe enregistré. Connecte-toi.')
  })

  it('lien refusé par le serveur ou absent : « Lien expiré » et nouveau lien proposé', async () => {
    vi.mocked(api.creer).mockRejectedValueOnce(new ErreurApi(400, 'LIEN_INVALIDE', 'Ce lien n’est plus valable. Demande-en un nouveau.'))
    rendre(<PageNouveauMotDePasse />, { route: `/mot-de-passe/nouveau?jeton=${'x'.repeat(43)}`, chemin: '/mot-de-passe/nouveau' })
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'nouveau-mot-de-passe' } })
    fireEvent.change(screen.getByLabelText('Confirmation'), { target: { value: 'nouveau-mot-de-passe' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByRole('heading', { name: 'Lien expiré' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Demander un nouveau lien' })).toHaveAttribute('href', '/mot-de-passe/oubli')
  })
})

describe('routes protégées', () => {
  it('sans session : vers la connexion, avec la page demandée en suite', async () => {
    rendre(<GardeCompte>Page privée</GardeCompte>, { route: '/objectifs?vue=liste', chemin: '/objectifs', compte: null, autres: { '/connexion': <Lieu /> } })
    expect(await screen.findByText('/connexion?suite=%2Fobjectifs%3Fvue%3Dliste')).toBeInTheDocument()
    expect(screen.queryByText('Page privée')).not.toBeInTheDocument()
  })

  it('compte retenu sur l’appareil mais session fermée côté serveur : oublié, puis connexion', async () => {
    rendre(<GardeCompte>Page privée</GardeCompte>, { route: '/mois', compte: 'u1', autres: { '/connexion': <Lieu /> } })
    expect(await screen.findByText(/^\/connexion/)).toBeInTheDocument()
    await waitFor(() => expect(lireUtilisateurCourant()).toBeNull())
  })

  it('session ouverte : la page s’affiche ; le serveur fait foi sur le compte', async () => {
    vi.mocked(api.lire).mockResolvedValue(lea)
    rendre(<GardeCompte>Page privée</GardeCompte>, { route: '/mois', compte: 'autre' })
    expect(await screen.findByText('Page privée')).toBeInTheDocument()
    expect(lireUtilisateurCourant()).toBe('u1')
  })

  it('session expirée en cours d’usage : message, puis connexion avec la page en cours en suite, sans boucle', async () => {
    vi.mocked(api.lire).mockResolvedValue(lea)
    rendre(<GardeCompte>Page privée</GardeCompte>, { route: '/mois?mois=2026-10', chemin: '/mois', compte: 'u1', autres: { '/connexion': <Lieu /> } })
    expect(await screen.findByText('Page privée')).toBeInTheDocument()
    sansSession()
    act(() => void window.dispatchEvent(new Event(EVENEMENT_SESSION_EXPIREE)))
    expect(await screen.findByText('/connexion?suite=%2Fmois%3Fmois%3D2026-10')).toBeInTheDocument()
    expect(toast).toHaveBeenCalledWith('Session expirée. Reconnecte-toi.', { id: 'session-expiree' })
    expect(lireUtilisateurCourant()).toBeNull()
  })
})

/** Affiche l'adresse courante (pour vérifier une redirection). */
function Lieu() {
  const l = useLocation()
  return <p>{`${l.pathname}${l.search}`}</p>
}

describe('confirmation de l’adresse', () => {
  const jeton = 'e'.repeat(43)

  it('le lien est envoyé une seule fois au serveur, puis « Adresse confirmée »', async () => {
    vi.mocked(api.creer).mockResolvedValueOnce(undefined)
    rendre(<PageVerificationEmail />, { route: `/email/verification?jeton=${jeton}`, chemin: '/email/verification' })
    expect(await screen.findByRole('heading', { name: 'Adresse confirmée' })).toBeInTheDocument()
    expect(api.creer).toHaveBeenCalledTimes(1)
    expect(api.creer).toHaveBeenCalledWith('/auth/email/verification', { jeton })
    expect(screen.getByRole('link', { name: 'Continuer' })).toHaveAttribute('href', '/')
  })

  it('lien refusé, adresse prise ou lien absent : message dédié, sans appel inutile', async () => {
    vi.mocked(api.creer).mockRejectedValueOnce(new ErreurApi(400, 'LIEN_INVALIDE', 'Ce lien n’est plus valable.'))
    const { unmount } = rendre(<PageVerificationEmail />, { route: `/email/verification?jeton=${jeton}`, chemin: '/email/verification' })
    expect(await screen.findByRole('heading', { name: 'Lien expiré' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Recevoir un nouveau lien' })).toHaveAttribute('href', '/reglages')
    unmount()

    vi.mocked(api.creer).mockRejectedValueOnce(new ErreurApi(409, 'CONFLIT', 'Cette adresse est déjà utilisée par un autre compte.'))
    const second = rendre(<PageVerificationEmail />, { route: `/email/verification?jeton=${jeton}`, chemin: '/email/verification' })
    expect(await screen.findByRole('heading', { name: 'Adresse déjà utilisée' })).toBeInTheDocument()
    second.unmount()

    vi.mocked(api.creer).mockReset()
    rendre(<PageVerificationEmail />, { route: '/email/verification', chemin: '/email/verification' })
    expect(screen.getByRole('heading', { name: 'Lien expiré' })).toBeInTheDocument()
    expect(api.creer).not.toHaveBeenCalled()
  })

  it('bandeau : visible tant que l’adresse n’est pas confirmée, renvoie le lien ; absent une fois confirmée', async () => {
    vi.mocked(api.lire).mockResolvedValue({ ...lea, emailVerifie: false })
    vi.mocked(api.creer).mockResolvedValueOnce(undefined)
    const { unmount } = rendre(<BandeauEmail />, { compte: 'u1' })
    expect(await screen.findByText('lea@exemple.test')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Renvoyer le lien' }))
    await waitFor(() => expect(api.creer).toHaveBeenCalledWith('/compte/email/renvoi', {}))
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Lien envoyé à lea@exemple.test.'))
    unmount()

    vi.mocked(api.lire).mockResolvedValue(lea)
    rendre(<BandeauEmail />, { compte: 'u1' })
    await waitFor(() => expect(api.lire).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Renvoyer le lien' })).not.toBeInTheDocument()
  })
})
