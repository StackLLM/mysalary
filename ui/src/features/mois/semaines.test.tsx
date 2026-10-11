import type { BilanDto, CategorieDto, DepenseDto, SemainesDto, SuiviDepensesDto, SuiviSemaine, Utilisateur } from '@mysalary/partage'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { rendre } from '../../test/outils'
import { FournisseurSaisieRapide } from '../depenses/SaisieRapide'
import { PageMois } from './PageMois'
import { dateProposee, datesSemaine, joursSemaine, reponseSemaines, texteTendance } from './saisie'

vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const compte: Utilisateur = { id: 'u1', prenom: 'Essai', devise: 'MAD', onboardingEtape: 0, onboardingTermine: false, creeLe: '2026-10-07T10:00:00.000Z', derniereOuverture: null }
const categories = [{ id: 'c-ali', libelle: 'Alimentation', groupe: 'essentiel', icone: 'panier', ordre: 0, utilisee: true, depenses: 1 }] as unknown as CategorieDto[]
const mois = { cle: '2027-01', debut: '2026-12-27', fin: '2027-01-26', nbJours: 31, statut: 'enCours', sourceDebut: 'reelle', sourceFin: 'prevue' }

const marche = {
  id: 'dep1',
  date: '2027-01-19',
  montant: 40_000,
  categorieId: 'c-ali',
  libelle: 'Marché',
  note: null,
  chargeId: 'courses',
  echeance: null,
  ponctuelId: null,
  creeLe: '',
  imputation: 'enveloppe',
  ligne: 'Courses',
} as unknown as DepenseDto

const suivi = {
  aujourdhui: '2027-01-20',
  mois,
  depenses: [marche],
  paiementsDettes: [{ id: 'p1', detteId: 'd1', libelle: 'Prêt voiture', date: '2027-01-10', montant: 100_000 }],
  lignes: [],
  enveloppes: [],
  totaux: { fixe: 0, enveloppe: 40_000, ponctuel: 0, horsPlan: 0, dette: 100_000, total: 140_000 },
  restePrevu: { lignes: 0, enveloppes: 0, dettes: 0, total: 0 },
} as unknown as SuiviDepensesDto

const semaine = (numero: number, debut: string, fin: string, nbJours: number, modif: Record<string, unknown>): SuiviSemaine =>
  ({
    numero,
    debut,
    fin,
    nbJours,
    partielle: nbJours < 7,
    statut: 'passe',
    joursEcoules: nbJours,
    budget: 10_000 * nbJours,
    report: 0,
    disponible: 10_000 * nbJours,
    depense: 0,
    reste: 10_000 * nbJours,
    ecart: 10_000 * nbJours,
    parJour: null,
    chargesPrevues: 0,
    chargesPayees: 0,
    charges: [],
    enveloppes: [],
    tendance: null,
    ...modif,
  }) as unknown as SuiviSemaine

const semaines = (modif: Record<string, unknown> = {}) =>
  ({
    mois,
    aujourdhui: '2027-01-20',
    fige: false,
    debutSemaine: 1,
    report: false,
    courante: 5,
    budget: 310_000,
    depense: 265_000,
    budgetADate: 250_000,
    reponse: { type: 'retard', montant: 15_000 },
    semaines: [
      semaine(1, '2026-12-27', '2026-12-27', 1, {}),
      semaine(4, '2027-01-11', '2027-01-17', 7, { depense: 90_000, reste: -20_000, ecart: -20_000, enveloppes: [{ id: 'fun', libelle: 'Fun', budget: 100_000, avant: 0, depense: 40_000, reste: 60_000, mis: 0, dejaConsommee: false, ecart: null }], tendance: { moyenneSemaine: 60_000, variation: 0.5, sens: 'hausse' } }),
      semaine(5, '2027-01-18', '2027-01-24', 7, {
        statut: 'enCours',
        joursEcoules: 3,
        depense: 40_000,
        reste: 30_000,
        ecart: -10_000,
        parJour: 6_000,
        chargesPrevues: 25_000,
        charges: [{ origine: 'fixe', id: 'net', libelle: 'Internet', date: '2027-01-22', montant: 25_000, statut: 'prevue' }],
      }),
      semaine(6, '2027-01-25', '2027-01-26', 2, { statut: 'aVenir', joursEcoules: 0, ecart: null, enveloppes: [{ id: 'fun', libelle: 'Fun', budget: 100_000, avant: 70_000, depense: 0, reste: 30_000, mis: 20_000, dejaConsommee: true, ecart: null }] }),
    ],
    ...modif,
  }) as unknown as SemainesDto

let semainesCourantes = semaines()
let cloture: BilanDto['cloture'] = null

function serveur() {
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/utilisateurs') return [compte]
    if (chemin === '/categories') return categories
    if (chemin.startsWith('/depenses?mois=') || chemin === '/depenses') return suivi
    if (chemin === '/mois/courant') return mois
    if (/^\/mois\/\d{4}-\d{2}\/bilan$/.test(chemin)) return { mois, aujourdhui: '2027-01-20', cloture, journal: [] }
    if (/^\/mois\/\d{4}-\d{2}\/semaines$/.test(chemin)) return semainesCourantes
    throw new Error(`Route non simulée : ${chemin}`)
  })
}

const ouvrirSemaines = () =>
  rendre(
    <FournisseurSaisieRapide>
      <PageMois />
    </FournisseurSaisieRapide>,
    { route: '/mois?onglet=semaines', compte: 'u1' },
  )

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2027-01-20T10:00:00'))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => {
  semainesCourantes = semaines()
  cloture = null
  serveur()
})

const espaces = (texte: string | null | undefined) => (texte ?? '').replace(/\s+/g, ' ')

describe('règles d’affichage des semaines', () => {
  it('réponse en tête, dates, semaines partielles', () => {
    expect(espaces(reponseSemaines({ type: 'avance', montant: 34_000 })?.texte)).toBe('Oui, avec 340 DH d’avance')
    expect(reponseSemaines({ type: 'retard', montant: 12_000 })).toMatchObject({ ton: 'alerte' })
    expect(espaces(reponseSemaines({ type: 'depasse', montant: 5_000 })?.texte)).toBe('Budget flexible dépassé de 50 DH')
    expect(reponseSemaines({ type: 'sansEnveloppe' })).toBeNull()
    expect(datesSemaine({ debut: '2027-01-04', fin: '2027-01-10' })).toBe('4 janv. – 10 janv.')
    expect(datesSemaine({ debut: '2026-12-27', fin: '2026-12-27' })).toBe('27 déc.')
    expect(joursSemaine({ nbJours: 3, partielle: true })).toBe('3 jours')
    expect(joursSemaine({ nbJours: 7, partielle: false })).toBeNull()
  })

  it('tendance en mots, jamais par la couleur seule ; date proposée jamais dans le futur', () => {
    expect(texteTendance({ moyenneSemaine: 60_000, variation: 0.183, sens: 'hausse' })).toMatchObject({ texte: '+18 %', ton: 'alerte' })
    expect(texteTendance({ moyenneSemaine: 60_000, variation: -0.25, sens: 'baisse' })).toMatchObject({ texte: '−25 %', ton: 'positif' })
    expect(texteTendance({ moyenneSemaine: 60_000, variation: 0.05, sens: 'stable' }).texte).toBe('Stable')
    expect(texteTendance({ moyenneSemaine: 0, variation: null, sens: 'hausse' }).texte).toBe('En hausse')
    expect(texteTendance(null)).toMatchObject({ texte: '—', detail: expect.stringMatching(/4 semaines/) })
    expect(dateProposee({ debut: '2027-01-11', fin: '2027-01-17' }, '2027-01-20')).toBe('2027-01-17')
    expect(dateProposee({ debut: '2027-01-18', fin: '2027-01-24' }, '2027-01-20')).toBe('2027-01-20')
  })
})

describe('Mois › Semaines', () => {
  it('réponse en tête, une carte par semaine (reste, statut, tendance, charges)', async () => {
    ouvrirSemaines()
    expect(await screen.findByText((_, e) => e?.tagName === 'SPAN' && espaces(e.textContent) === '150 DH au-dessus du rythme prévu.')).toBeInTheDocument()
    const grille = screen.getByRole('list', { name: 'Semaines du mois' })
    const cartes = within(grille).getAllByRole('button')
    expect(cartes.map((c) => espaces(c.getAttribute('aria-label')))).toEqual([
      'Semaine 1, 27 déc., passée. Voir le détail.',
      'Semaine 4, 11 janv. – 17 janv., passée. Voir le détail.',
      'Semaine 5, 18 janv. – 24 janv., en cours. Voir le détail.',
      'Semaine 6, 25 janv. – 26 janv., à venir. Voir le détail.',
    ])
    expect(cartes[0]).toHaveTextContent('1 jour')
    expect(cartes[1]).toHaveTextContent('+50 %')
    expect(cartes[2]).toHaveTextContent('1 charge')
    // Chaque carte suit les enveloppes : reste, consommé cette semaine ; plus de reste de semaine ni de budget prévu.
    expect(espaces(cartes[1]!.textContent)).toContain('Fun600DH')
    expect(espaces(cartes[1]!.textContent)).toContain('400 DH cette semaine')
    expect(cartes[1]).not.toHaveTextContent('Budget (prévu)')
    expect(cartes[1]).not.toHaveTextContent('Disponible')
    // Une semaine à venir montre aussi ce qui reste sur l'enveloppe, avec l'alerte « déjà consommé ».
    expect(espaces(cartes[3]!.textContent)).toContain('Fun300DH')
    expect(espaces(cartes[3]!.textContent)).toContain('Déjà consommé : 700DH')
    expect(screen.queryByText('Reste flexible (semaine)')).not.toBeInTheDocument()
    expect(screen.queryByText('Sur quoi repose ce calcul ?')).not.toBeInTheDocument()
    // Aucune semaine n'est ouverte d'office.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('un clic ouvre la fenêtre de la semaine : écart et tendance, enveloppes, ses seules dépenses, charges datées ; semaine précédente', async () => {
    ouvrirSemaines()
    fireEvent.click(await screen.findByRole('button', { name: /^Semaine 5,/ }))
    const fenetre = await screen.findByRole('dialog', { name: 'Semaine 5' })
    const calcul = within(fenetre).getByRole('region', { name: 'Calcul de la semaine' })
    expect(espaces(calcul.textContent)).toContain('Écart sur le rythme')
    expect(espaces(calcul.textContent)).not.toContain('Reste de la semaine')
    expect(espaces(calcul.textContent)).not.toContain('Budget (prévu)')
    const depenses = within(fenetre).getByRole('region', { name: 'Dépenses de la semaine 5' })
    expect(within(depenses).getByText('Marché')).toBeInTheDocument()
    expect(within(depenses).queryByText('Prêt voiture')).not.toBeInTheDocument()
    expect(within(within(fenetre).getByRole('region', { name: 'Charges datées de la semaine 5' })).getByText('Internet')).toBeInTheDocument()

    fireEvent.click(within(fenetre).getByRole('button', { name: 'Semaine précédente' }))
    expect(await screen.findByRole('dialog', { name: 'Semaine 4' })).toBeInTheDocument()
  })

  it('un clic à côté de la fenêtre ne la ferme pas ; seule la croix la ferme', async () => {
    ouvrirSemaines()
    fireEvent.click(await screen.findByRole('button', { name: /^Semaine 5,/ }))
    await screen.findByRole('dialog', { name: 'Semaine 5' })
    fireEvent.pointerDown(document.body)
    fireEvent.click(document.body)
    expect(screen.getByRole('dialog', { name: 'Semaine 5' })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Fermer' })[0]!)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('ouvrir une semaine passée et y ajouter une dépense à son dernier jour', async () => {
    ouvrirSemaines()
    fireEvent.click(await screen.findByRole('button', { name: /^Semaine 4,/ }))
    const fenetre = await screen.findByRole('dialog', { name: 'Semaine 4' })
    fireEvent.click(within(within(fenetre).getByRole('region', { name: 'Dépenses de la semaine 4' })).getByRole('button', { name: '+ Ajouter' }))
    expect(await screen.findByLabelText('Date')).toHaveValue('2027-01-17')
  })

  it('sans enveloppe : état vide qui mène à Mon plan', async () => {
    semainesCourantes = semaines({ reponse: { type: 'sansEnveloppe' }, budget: 0 })
    ouvrirSemaines()
    expect(await screen.findByText('Définis tes enveloppes pour suivre la semaine.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Définir mes enveloppes' })).toHaveAttribute('href', '/plan?onglet=charges')
  })

  it('mois clôturé : semaines figées, aucun ajout', async () => {
    cloture = { le: '2027-01-28T10:00:00.000Z', forcee: false, nonConfirmees: 0 }
    semainesCourantes = semaines({ fige: true })
    ouvrirSemaines()
    expect(await screen.findByText(/ces semaines sont figées/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Semaine 5,/ }))
    expect(await screen.findByRole('dialog', { name: 'Semaine 5' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Ajouter' })).not.toBeInTheDocument()
  })
})
