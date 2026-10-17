import type { CategorieDto, ImportDto, LigneImport, OnboardingDto } from '@mysalary/partage'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ErreurApi } from '../../lib/api'
import { rendre } from '../../test/outils'
import { PageOnboarding } from './PageOnboarding'
import { aConfirmer, categorieParNom, etapeDeReprise, lignesDe, phraseLigne, progression } from './saisie'

vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const compte = { id: 'u1', prenom: 'Essai', devise: 'MAD', onboardingEtape: 0, onboardingTermine: false, creeLe: '2026-10-01T10:00:00.000Z', derniereOuverture: null }
const categories = [
  { id: 'c-sport', libelle: 'Sport', groupe: 'flexible', icone: 'sport', ordre: 0, utilisee: false },
  { id: 'c-ali', libelle: 'Alimentation', groupe: 'essentiel', icone: 'panier', ordre: 1, utilisee: false },
] as unknown as CategorieDto[]
const espaces = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ')

const ligne = (modif: Partial<LigneImport> & Pick<LigneImport, 'id' | 'theme' | 'etape' | 'libelle' | 'donnees'>): LigneImport => ({ note: null, statut: 'propose', importable: true, ...modif })
const SALAIRE = ligne({
  id: 'salaire',
  theme: 'salaire',
  etape: 3,
  libelle: 'Salaire',
  note: 'Le fichier contient plusieurs montants : choisis le bon.',
  donnees: { type: 'salaire', options: [{ montant: 500_000, origine: 'revenu net du profil' }, { montant: 800_000, origine: 'reçu sur 3 mois' }], choix: null, jour: 28, financeMoisSuivant: true },
} as LigneImport)
const GYM = ligne({ id: 'charge:gym', theme: 'charges', etape: 5, libelle: 'Gym', note: 'Le jour de paiement n’est pas dans le fichier : à toi de le donner.', donnees: { type: 'charge', categorie: 'Sport', montant: 25_000 } } as LigneImport)
const NOURRITURE = ligne({ id: 'enveloppe:nourriture', theme: 'enveloppes', etape: 6, libelle: 'Nourriture', donnees: { type: 'enveloppe', categorie: 'Alimentation', montant: 30_000 } } as LigneImport)
const HISTORIQUE = ligne({ id: 'historique-paies', theme: 'info', etape: 2, libelle: '4 mois de revenu perçu', note: 'Non importé.', importable: false, statut: 'ignore', donnees: { type: 'info' } } as LigneImport)

let ob: OnboardingDto
let contrats: unknown[]
const importe = (lignes: LigneImport[]): ImportDto => ({ type: 'moneyGuruV0', importeLe: '2026-10-12T10:00:00.000Z', lignes, nonImportes: ['allocation', 'patrimoine'], profil: { prenom: 'Test', devise: 'MAD' } })

beforeEach(() => {
  ob = { etape: 0, termine: false, import: null }
  contrats = []
  vi.mocked(api.lire).mockReset().mockImplementation(async (chemin: string) => {
    if (chemin === '/auth/session') return compte
    if (chemin === '/onboarding') return ob
    if (chemin === '/mois/courant') return { cle: '2026-10', debut: '2026-09-27', fin: '2026-10-26', statut: 'enCours', aujourdhui: '2026-10-12' }
    if (chemin === '/salaire/contrats') return contrats
    if (chemin.startsWith('/salaire/paies')) return { aujourdhui: '2026-10-12', paies: [] }
    if (chemin === '/categories') return categories
    if (chemin === '/charges' || chemin === '/ponctuels' || chemin === '/dettes' || chemin === '/revenus/sources') return []
    if (chemin === '/epargne') return { aujourdhui: '2026-10-12', etat: { comptes: [], declare: false }, planMois: { lignes: [], prevue: 0, reelle: 0 }, mouvements: [], objectifs: [] }
    if (chemin === '/objectifs') return { objectifs: [], capacite: { prudent: 0, realiste: 150_000, ambitieux: 0 }, comptes: [], regles: {} }
    if (chemin === '/mois/2026-10/bilan') return { mois: { cle: '2026-10', debut: '2026-09-27', fin: '2026-10-26' }, totaux: { revenusPrevus: 1_000_000, chargesPrevues: 560_000 } }
    throw new Error(`Route non simulée : ${chemin}`)
  })
  vi.mocked(api.creer).mockReset().mockResolvedValue({ id: 'nouveau' })
  vi.mocked(api.modifier).mockReset().mockResolvedValue(undefined)
  vi.mocked(api.supprimer).mockReset().mockResolvedValue(undefined)
})

const ouvrir = () => rendre(<PageOnboarding />, { route: '/onboarding', compte: 'u1', autres: { '/': <p>Aujourd’hui</p> } })

describe('règles d’affichage', () => {
  it('reprise, progression, lignes à confirmer, phrases, catégorie par nom', () => {
    expect([etapeDeReprise(0), etapeDeReprise(4), etapeDeReprise(99)]).toEqual([1, 4, 10])
    expect(progression(3)).toBe(0.3)
    const lignes = [SALAIRE, { ...GYM, statut: 'importe' as const }, { ...NOURRITURE, statut: 'confirme' as const }, HISTORIQUE]
    expect(aConfirmer(lignes, 5).map((l) => l.id)).toEqual(['charge:gym'])
    expect(aConfirmer(lignes, 6)).toEqual([])
    expect(lignesDe(lignes, ['charges', 'enveloppes']).map((l) => l.id)).toEqual(['charge:gym', 'enveloppe:nourriture'])
    expect(lignesDe(lignes, ['charges', 'enveloppes'], 'confirme').map((l) => l.id)).toEqual(['enveloppe:nourriture'])
    expect(espaces(phraseLigne(GYM))).toBe('250 DH par mois')
    expect(espaces(phraseLigne(SALAIRE))).toBe('2 montants dans le fichier, versé le 28')
    expect(espaces(phraseLigne({ ...SALAIRE, donnees: { ...SALAIRE.donnees, choix: 800_000 } as LigneImport['donnees'] }))).toBe('8 000 DH par mois, versé le 28')
    expect(categorieParNom(categories, 'sport')).toBe('c-sport')
    expect(categorieParNom(categories, 'Inconnue')).toBeUndefined()
  })
})

describe('Onboarding (lot 19)', () => {
  it('bienvenue : « partir de zéro » mène au salaire, « importer » à l’import ; l’étape est sauvegardée', async () => {
    ouvrir()
    expect(await screen.findByText('Bienvenue dans MySalary.')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Étape 1 sur 10' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Importer mon ancien fichier/ }))
    expect(await screen.findByText('Importer ton ancien fichier')).toBeInTheDocument()
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/onboarding', { etape: 2 }))
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }))
    fireEvent.click(screen.getByRole('button', { name: /Partir de zéro/ }))
    expect(await screen.findByText('Ton salaire')).toBeInTheDocument()
    expect(api.modifier).toHaveBeenCalledWith('/onboarding', { etape: 3 })
  })

  it('reprise : on revient à l’étape sauvegardée', async () => {
    ob = { etape: 5, termine: false, import: null }
    ouvrir()
    expect(await screen.findByText('Tes charges fixes')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Étape 5 sur 10' })).toHaveAttribute('aria-valuenow', '5')
  })

  it('import : un fichier déposé est analysé ; chaque ligne se décide ; un fichier inconnu est refusé avec un message clair', async () => {
    ob = { etape: 2, termine: false, import: null }
    ouvrir()
    const champ = await screen.findByLabelText('Fichier à importer')
    const fichier = new File([JSON.stringify({ revenuNet: 5000 })], 'export.json', { type: 'application/json' })
    Object.defineProperty(fichier, 'text', { value: async () => JSON.stringify({ revenuNet: 5000 }) })
    vi.mocked(api.creer).mockRejectedValueOnce(new ErreurApi(422, 'REGLE_METIER', 'Ce fichier n’est pas un export MySalary ou money-guru.', {}))
    fireEvent.change(champ, { target: { files: [fichier] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce fichier n’est pas un export MySalary ou money-guru. Tu peux continuer sans importer.')

    const abime = new File(['pas du json'], 'x.json')
    Object.defineProperty(abime, 'text', { value: async () => 'pas du json' })
    fireEvent.change(screen.getByLabelText('Fichier à importer'), { target: { files: [abime] } })
    expect(await screen.findByText(/n’est pas un fichier JSON lisible/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Fichier à importer'), { target: { files: [fichier] } })
    await waitFor(() => expect(api.creer).toHaveBeenCalledWith('/import/apercu', { fichier: { revenuNet: 5000 } }))
  })

  it('aperçu : lignes groupées par thème, salaire à choisir avant d’importer, importer / ignorer, non importés listés', async () => {
    ob = { etape: 2, termine: false, import: importe([SALAIRE, GYM, NOURRITURE, HISTORIQUE]) }
    ouvrir()
    expect(await screen.findByText('Ce que contient ton fichier')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('0 ligne sur 3 décidée.')
    for (const titre of ['Salaire', 'Charges fixes', 'Enveloppes', 'Pour information, non importé']) expect(screen.getByRole('region', { name: titre })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Primes' })).not.toBeInTheDocument()

    // Un conflit posé en question simple : aucun montant n'est retenu d'office.
    const salaire = screen.getByRole('region', { name: 'Salaire' })
    expect(within(salaire).getByText('Quel est ton salaire net ?')).toBeInTheDocument()
    expect(within(salaire).getAllByRole('radio').every((r) => !(r as HTMLInputElement).checked)).toBe(true)
    fireEvent.click(within(salaire).getByRole('radio', { name: (nom) => espaces(nom).includes('8 000 DH') }))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/import/lignes/salaire', { choix: 800_000 }))

    fireEvent.click(screen.getByRole('button', { name: 'Importer Gym' }))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/import/lignes/charge%3Agym', { statut: 'importe' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ignorer Nourriture' }))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/import/lignes/enveloppe%3Anourriture', { statut: 'ignore' }))

    // Une ligne d'information ne se décide pas.
    const info = screen.getByRole('region', { name: 'Pour information, non importé' })
    expect(within(info).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText(/Non repris :/).closest('p')).toHaveTextContent('La répartition en pourcentages, Le patrimoine')
  })

  it('un salaire non choisi ne s’importe pas : le message du serveur est affiché sur la ligne', async () => {
    ob = { etape: 2, termine: false, import: importe([SALAIRE]) }
    ouvrir()
    vi.mocked(api.modifier).mockRejectedValueOnce(new ErreurApi(422, 'REGLE_METIER', 'Choisis d’abord le salaire : le fichier contient plusieurs montants.', {}))
    fireEvent.click(await screen.findByRole('button', { name: 'Importer Salaire' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Choisis d’abord le salaire')
  })

  it('étape salaire : la valeur importée arrive « à confirmer », préremplie ; la confirmer crée le contrat', async () => {
    const choisi = { ...SALAIRE, statut: 'importe' as const, donnees: { ...SALAIRE.donnees, choix: 800_000 } } as LigneImport
    ob = { etape: 3, termine: false, import: importe([choisi]) }
    ouvrir()
    expect(await screen.findByText('Ton salaire')).toBeInTheDocument()
    expect(await screen.findByText(/Importé · à confirmer\./)).toBeInTheDocument()
    expect(screen.getByLabelText(/Salaire net/)).toHaveValue('8000')
    expect(screen.getByLabelText(/Jour/)).toHaveValue(28)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer mon salaire' }))
    await waitFor(() => expect(api.creer).toHaveBeenCalledWith('/salaire/contrats', expect.objectContaining({ montantNet: 800_000, jourHabituel: 28, financeMoisSuivant: true })))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/import/lignes/salaire', { statut: 'confirme' }))
  })

  it('« mes revenus varient » passe aux primes sans salaire', async () => {
    ob = { etape: 3, termine: false, import: null }
    ouvrir()
    fireEvent.click(await screen.findByRole('button', { name: /Mes revenus varient/ }))
    expect(await screen.findByText('Tes primes')).toBeInTheDocument()
  })

  it('charges fixes : la ligne importée se confirme dans le formulaire prérempli, la catégorie trouvée par son nom', async () => {
    ob = { etape: 5, termine: false, import: importe([{ ...GYM, statut: 'importe' }]) }
    ouvrir()
    const bloc = await screen.findByRole('region', { name: 'Importé, à confirmer' })
    expect(within(bloc).getByText('Importé · à confirmer')).toBeInTheDocument()
    expect(espaces(bloc.textContent)).toContain('250 DH par mois')
    fireEvent.click(within(bloc).getByRole('button', { name: 'Confirmer Gym' }))
    const panneau = await screen.findByRole('dialog', { name: 'Charge fixe' })
    expect(within(panneau).getByLabelText('Libellé')).toHaveValue('Gym')
    expect(within(panneau).getByLabelText('Montant')).toHaveValue('250')
    await waitFor(() => expect(within(panneau).getByLabelText('Catégorie')).toHaveValue('c-sport'))
    fireEvent.change(within(panneau).getByLabelText('Jour du paiement'), { target: { value: '5' } })
    fireEvent.click(within(panneau).getByRole('button', { name: 'Ajouter cette charge' }))
    await waitFor(() => expect(api.creer).toHaveBeenCalledWith('/charges', expect.objectContaining({ libelle: 'Gym', montant: 25_000, jour: 5, nature: 'fixe', categorieId: 'c-sport' })))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/import/lignes/charge%3Agym', { statut: 'confirme' }))
  })

  it('une suggestion ouvre le formulaire sans montant ; une ligne importée peut être ignorée depuis son étape', async () => {
    ob = { etape: 6, termine: false, import: importe([{ ...NOURRITURE, statut: 'importe' }]) }
    ouvrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Ignorer Nourriture' }))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/import/lignes/enveloppe%3Anourriture', { statut: 'ignore' }))
    fireEvent.click(screen.getByRole('button', { name: 'Transport' }))
    const panneau = await screen.findByRole('dialog', { name: 'Enveloppe' })
    expect(within(panneau).getByLabelText('Libellé')).toHaveValue('Transport')
    expect(within(panneau).getByLabelText('Budget du mois')).toHaveValue('')
  })

  it('« Savings » : une proposition d’épargne, jamais une charge ; elle préremplit le versement de l’objectif', async () => {
    const savings = ligne({ id: 'epargne:savings', theme: 'epargne', etape: 8, libelle: 'Savings', note: 'Un versement d’épargne, pas une charge.', statut: 'importe', donnees: { type: 'epargne', montant: 40_000 } } as LigneImport)
    ob = { etape: 8, termine: false, import: importe([savings]) }
    ouvrir()
    expect(await screen.findByText(/Tu mettais/)).toHaveTextContent('Tu mettais 400 DH par mois de côté.')
    fireEvent.click(screen.getByRole('button', { name: 'Garder la proposition Savings' }))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/import/lignes/epargne%3Asavings', { statut: 'confirme' }))
  })

  it('premier objectif : une ligne importée remplit le formulaire ; on crée l’objectif', async () => {
    const objectif = ligne({ id: 'objectif:o1-0', theme: 'objectifs', etape: 9, libelle: 'Voiture', statut: 'importe', donnees: { type: 'objectif', libelle: 'Voiture', montantCible: 5_000_000, dateCible: '2027-09', montantInitial: 1_000_000, versementMensuel: 250_000, typeObjectif: 'voiture' } } as LigneImport)
    ob = { etape: 9, termine: false, import: importe([objectif]) }
    ouvrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmer Voiture' }))
    expect(screen.getByLabelText('Nom de l’objectif')).toHaveValue('Voiture')
    expect(screen.getByLabelText('Montant à atteindre')).toHaveValue('50000')
    expect(screen.getByLabelText('Déjà mis de côté pour lui')).toHaveValue('10000')
    expect(screen.getByLabelText('Versement mensuel')).toHaveValue('2500')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer cet objectif' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/objectifs', { libelle: 'Voiture', type: 'voiture', montantCible: 5_000_000, montantInitial: 1_000_000, dateCible: '2027-09', versementMensuel: 250_000 }),
    )
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/import/lignes/objectif%3Ao1-0', { statut: 'confirme' }))
  })

  it('résumé : mois en cours, revenu et charges prévus, capacité et date marquées « projection » ; terminer ouvre Aujourd’hui', async () => {
    contrats = [{ id: 'v1', moisEffet: '2026-10', montantNet: 1_000_000, jourHabituel: 28, regleJourNonOuvre: 'apres', financeMoisSuivant: true }]
    ob = { etape: 10, termine: false, import: null }
    ouvrir()
    expect(await screen.findByText('Voilà ta situation')).toBeInTheDocument()
    expect(espaces(screen.getByText('Mois budgétaire en cours').nextElementSibling?.textContent)).toContain('Octobre 2026')
    expect(espaces(screen.getByText(/Revenu prévu/).closest('div')?.textContent)).toContain('10 000')
    expect(espaces(screen.getByText(/Charges prévues/).closest('div')?.textContent)).toContain('5 600')
    expect(espaces(screen.getByText(/Capacité d’épargne/).closest('div')?.textContent)).toContain('projection · réaliste')
    expect(screen.getByText('Pas encore d’objectif')).toBeInTheDocument()
    const lecturesSession = () => vi.mocked(api.lire).mock.calls.filter(([chemin]) => chemin === '/auth/session').length
    const avant = lecturesSession()
    fireEvent.click(screen.getByRole('button', { name: /Terminer et ouvrir/ }))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/onboarding', { etape: 10, termine: true }))
    expect(await screen.findByText('Aujourd’hui')).toBeInTheDocument()
    // Le compte de la session est relu : le bandeau « mise en route pas terminée » disparaît d'Aujourd'hui.
    await waitFor(() => expect(lecturesSession()).toBeGreaterThan(avant))
  })

  it('résumé sans salaire : pas de faux chiffres, un renvoi vers l’étape Salaire', async () => {
    ob = { etape: 10, termine: false, import: null }
    ouvrir()
    expect(await screen.findByText('Ajoute ton salaire pour voir ton résumé.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Aller à l’étape Salaire' }))
    expect(await screen.findByText('Ton salaire')).toBeInTheDocument()
  })

  it('« reprendre plus tard » confirme puis ouvre Aujourd’hui ; erreur de chargement : « Réessayer »', async () => {
    ob = { etape: 4, termine: false, import: null }
    const { unmount } = ouvrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Reprendre plus tard' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Aller à Aujourd’hui' }))
    expect(await screen.findByText('Aujourd’hui')).toBeInTheDocument()
    unmount()

    vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
      if (chemin === '/auth/session') return compte
      throw new Error('panne')
    })
    ouvrir()
    expect(await screen.findByText('Impossible de charger la mise en route.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})
