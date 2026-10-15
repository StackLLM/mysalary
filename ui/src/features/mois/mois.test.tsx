import type { BilanDto, CategorieDto, DepenseDto, RattachementsDto, SuiviDepensesDto, Utilisateur } from '@mysalary/partage'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { rendre } from '../../test/outils'
import { FournisseurSaisieRapide } from '../depenses/SaisieRapide'
import { cleDe, detailDepense, journal, libelleDepense, lienPropose, libelleJour, optionsLien, versLien } from '../depenses/saisie'
import { PageMois } from './PageMois'

vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const compte: Utilisateur = { id: 'u1', prenom: 'Essai', devise: 'MAD', onboardingEtape: 0, onboardingTermine: false, email: 'test@exemple.test', emailVerifie: true, creeLe: '2026-10-07T10:00:00.000Z', derniereOuverture: null }

const categories = [
  { id: 'c-log', libelle: 'Logement', groupe: 'essentiel', icone: 'maison', ordre: 0, utilisee: true, depenses: 1 },
  { id: 'c-ali', libelle: 'Alimentation', groupe: 'essentiel', icone: 'panier', ordre: 1, utilisee: true, depenses: 3 },
  { id: 'c-loi', libelle: 'Loisirs', groupe: 'flexible', icone: 'loisirs', ordre: 2, utilisee: false, depenses: 0 },
] as unknown as CategorieDto[]

const loyer = { origine: 'fixe', id: 'loyer', libelle: 'Loyer', categorieId: 'c-log', date: '2027-01-05', moisBudget: '2027-01', montant: 350_000, paye: 0, reste: 350_000, statut: 'enRetard' } as const
const courses = { id: 'courses', libelle: 'Courses', categorieId: 'c-ali', budget: 250_000, depense: 40_000, reste: 210_000 }

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
  mois: { cle: '2027-01', debut: '2026-12-27', fin: '2027-01-26', nbJours: 31, statut: 'enCours' },
  depenses: [marche],
  paiementsDettes: [{ id: 'p1', detteId: 'd1', libelle: 'Prêt voiture', date: '2027-01-10', montant: 100_000 }],
  lignes: [loyer],
  enveloppes: [courses],
  totaux: { fixe: 0, enveloppe: 40_000, ponctuel: 0, horsPlan: 0, dette: 100_000, total: 140_000 },
  restePrevu: { lignes: 350_000, enveloppes: 210_000, dettes: 0, total: 560_000 },
} as unknown as SuiviDepensesDto

const rattachements = { mois: '2027-01', lignes: [loyer], enveloppes: [courses] } as unknown as RattachementsDto

const totauxBilan = { revenusPrevus: 1_000_000, revenusReels: 1_000_000, chargesPrevues: 700_000, sortiesReelles: 140_000, restePrevu: 300_000, resteReel: 860_000, ecart: null }
const bilan = (modif: Partial<BilanDto> = {}) =>
  ({
    mois: { ...suivi.mois, sourceDebut: 'reelle', sourceFin: 'prevue' },
    aujourdhui: '2027-01-20',
    lignes: [
      { cle: 'paie:0', famille: 'revenu', libelle: 'Salaire', date: '2026-12-27', prevu: 1_000_000, reel: 1_000_000, ecart: 0, statut: 'confirme', cible: { type: 'paie', mois: '2027-01' } },
      { cle: 'fixe:loyer:2027-01-05', famille: 'fixe', libelle: 'Loyer', date: '2027-01-05', prevu: 350_000, reel: null, ecart: null, statut: 'enRetard', cible: { type: 'charge', id: 'loyer', date: '2027-01-05', categorieId: 'c-log' } },
      { cle: 'enveloppe:courses', famille: 'enveloppe', libelle: 'Courses', date: null, prevu: 250_000, reel: 40_000, ecart: null, statut: 'enCours', cible: null },
      { cle: 'dette:d1:1', famille: 'dette', libelle: 'Prêt voiture', date: '2027-01-10', prevu: 100_000, reel: 100_000, ecart: 0, statut: 'confirme', cible: { type: 'dette', id: 'd1' } },
    ],
    totaux: totauxBilan,
    synthese: { consomme: 140_000, horsPlan: 0, resteAPayer: 560_000, aConfirmer: 350_000, aVenir: 210_000 },
    estimation: { revenusAttendus: 0, chargesAttendues: 560_000, resteFinDeMois: 300_000 },
    aConfirmer: [],
    rythme: [{ date: '2027-01-20', prevu: 100_000, reel: 140_000 }],
    cloture: null,
    journal: [],
    cumul: { cle: '2027-01', nature: 'enCours', premier: false, report: 150_000, revenus: 1_000_000, charges: 650_000, epargne: 50_000, epargneConfirmee: 50_000, epargneAConfirmer: 0, reste: 300_000, cumul: 450_000, cumulApresPrevu: 450_000, dontReel: null },
    ...modif,
  }) as unknown as BilanDto
let bilanCourant = bilan()

function serveur() {
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/auth/session') return compte
    if (chemin === '/categories') return categories
    if (chemin === '/depenses' || chemin.startsWith('/depenses?mois=')) return suivi
    if (chemin.startsWith('/depenses/rattachements?date=')) return rattachements
    if (chemin === '/mois/courant') return suivi.mois
    if (/^\/mois\/\d{4}-\d{2}\/bilan$/.test(chemin)) return bilanCourant
    throw new Error(`Route non simulée : ${chemin}`)
  })
}

const ouvrirMois = (route = '/mois?onglet=depenses') =>
  rendre(
    <FournisseurSaisieRapide>
      <PageMois />
    </FournisseurSaisieRapide>,
    { route, compte: 'u1' },
  )

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2027-01-20T10:00:00'))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => {
  bilanCourant = bilan()
  serveur()
  vi.mocked(api.creer).mockReset().mockResolvedValue({ id: 'nouvelle' })
})

describe('règles d’affichage', () => {
  it('propose la ligne à payer de même catégorie, puis l’enveloppe, sinon hors plan', () => {
    const options = optionsLien(rattachements)
    expect(lienPropose(options, 'c-log')).toBe('fixe:loyer:2027-01-05')
    expect(lienPropose(options, 'c-ali')).toBe('enveloppe:courses')
    expect(lienPropose(options, 'c-loi')).toBe('aucun')
    expect(versLien('fixe:loyer:2027-01-05')).toEqual({ chargeId: 'loyer', echeance: '2027-01-05', ponctuelId: null })
    expect(cleDe(marche)).toBe('enveloppe:courses')
  })

  it('groupe par jour ; le filtre de catégorie écarte les paiements de dettes', () => {
    const tout = journal(suivi.depenses, suivi.paiementsDettes, null)
    expect(tout.groupes.map((g) => [g.jour, g.total])).toEqual([
      ['2027-01-19', 40_000],
      ['2027-01-10', 100_000],
    ])
    expect(journal(suivi.depenses, suivi.paiementsDettes, 'c-ali')).toMatchObject({ nombre: 1, total: 40_000 })
    expect(libelleJour('2027-01-19', '2027-01-20')).toBe('Hier')
    expect(libelleJour('2027-01-10', '2027-01-20')).toBe('Dimanche 10 janvier')
    expect(libelleJour('2026-12-28', '2027-01-20')).toBe('Lundi 28 décembre 2026')
  })

  it('nomme une dépense par son libellé, sinon la ligne payée, sinon la catégorie', () => {
    const parId = new Map(categories.map((c) => [c.id, c]))
    const loyerPaye = { ...marche, libelle: '', categorieId: 'c-log', imputation: 'fixe', ligne: 'Loyer' } as DepenseDto
    const horsPlan = { ...marche, libelle: '', categorieId: 'c-loi', imputation: 'horsPlan', ligne: null } as DepenseDto
    expect([libelleDepense(marche, parId), detailDepense(marche, parId)]).toEqual(['Marché', 'Alimentation · Courses · enveloppe'])
    expect([libelleDepense(loyerPaye, parId), detailDepense(loyerPaye, parId)]).toEqual(['Loyer', 'Logement · charge fixe'])
    expect([libelleDepense(horsPlan, parId), detailDepense(horsPlan, parId)]).toEqual(['Loisirs', 'Loisirs · hors plan'])
    // Enveloppe du même nom que la catégorie : pas de répétition.
    expect(detailDepense({ ...marche, ligne: 'Alimentation' }, parId)).toBe('Alimentation · enveloppe')
  })
})

describe('Mois › Dépenses', () => {
  it('montre le réel et le prévu séparés, puis marque une charge payée', async () => {
    ouvrirMois()
    expect(await screen.findByText('Dépenses de janvier')).toBeInTheDocument()
    expect(screen.getByText('Dépensé (réel)')).toBeInTheDocument()
    expect(screen.getByText('Encore prévu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modifier Marché' })).toBeInTheDocument()
    expect(screen.getByText('Paiement de dette')).toBeInTheDocument()

    const aPayer = screen.getByRole('list', { name: 'À payer ce mois' })
    expect(within(aPayer).getByText('En retard')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Marquer Loyer payé' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/depenses', {
        date: '2027-01-05',
        montant: 350_000,
        categorieId: 'c-log',
        libelle: 'Loyer',
        chargeId: 'loyer',
        echeance: '2027-01-05',
        ponctuelId: null,
      }),
    )
  })

  it('filtre par catégorie et change de mois', async () => {
    ouvrirMois()
    fireEvent.change(await screen.findByLabelText('Catégorie'), { target: { value: 'c-loi' } })
    expect(screen.getByText('Aucune dépense dans cette catégorie ce mois-ci.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mois suivant' }))
    await waitFor(() => expect(api.lire).toHaveBeenCalledWith('/depenses?mois=2027-02'))
    expect(api.lire).toHaveBeenCalledWith('/mois/2027-02/bilan')
  })
})

describe('saisie rapide', () => {
  it('montant d’abord, catégorie en puce, rattachement proposé, puis envoi', async () => {
    ouvrirMois()
    fireEvent.click(await screen.findByRole('button', { name: /Ajouter une dépense/ }))
    const montant = await screen.findByLabelText('Montant')
    expect(montant).toHaveFocus()
    fireEvent.change(montant, { target: { value: '120' } })

    // Puces : les plus utilisées en premier.
    const puces = screen.getAllByRole('button', { pressed: false }).map((b) => b.textContent)
    expect(puces.slice(0, 3)).toEqual(['Alimentation', 'Logement', 'Loisirs'])

    fireEvent.click(screen.getByRole('button', { name: 'Alimentation' }))
    expect(await screen.findByText(/Est-ce le paiement de « Courses » \?/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Logement' }))
    expect(await screen.findByText(/Est-ce le paiement de « Loyer » \?/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Rattacher au plan'), { target: { value: 'aucun' } })
    fireEvent.change(screen.getByLabelText('Libellé (facultatif)'), { target: { value: 'Ampoules' } })

    fireEvent.click(screen.getByRole('button', { name: 'Noter la dépense' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/depenses', {
        date: '2027-01-20',
        montant: 12_000,
        categorieId: 'c-log',
        libelle: 'Ampoules',
        chargeId: null,
        echeance: null,
        ponctuelId: null,
      }),
    )
  })

  it('refuse une date future et une dépense sans catégorie', async () => {
    ouvrirMois()
    fireEvent.click(await screen.findByRole('button', { name: /Ajouter une dépense/ }))
    fireEvent.change(await screen.findByLabelText('Montant'), { target: { value: '50' } })
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2027-01-21' } })
    fireEvent.click(screen.getByRole('button', { name: 'Noter la dépense' }))
    expect(await screen.findByText('Une dépense réelle ne peut pas être dans le futur.')).toBeInTheDocument()
    expect(screen.getByText('Choisis une catégorie.')).toBeInTheDocument()
    expect(api.creer).not.toHaveBeenCalled()
  })

  it('modifie une dépense : panneau prérempli, lien actuel conservé', async () => {
    vi.mocked(api.modifier).mockReset().mockResolvedValue(undefined)
    ouvrirMois()
    fireEvent.click(await screen.findByRole('button', { name: 'Modifier Marché' }))
    expect(await screen.findByRole('heading', { name: 'Modifier la dépense' })).toBeInTheDocument()
    expect(screen.getByLabelText('Montant')).toHaveValue('400')
    expect(screen.getByLabelText('Rattacher au plan')).toHaveValue('enveloppe:courses')
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '450' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les changements' }))
    await waitFor(() =>
      expect(api.modifier).toHaveBeenCalledWith('/depenses/dep1', {
        date: '2027-01-19',
        montant: 45_000,
        categorieId: 'c-ali',
        libelle: 'Marché',
        chargeId: 'courses',
        echeance: null,
        ponctuelId: null,
      }),
    )
  })

  it('la touche N ouvre la saisie, pas quand on écrit dans un champ', async () => {
    ouvrirMois()
    await screen.findByText('Dépenses de janvier')
    fireEvent.keyDown(screen.getByLabelText('Catégorie'), { key: 'n' })
    expect(screen.queryByText('Nouvelle dépense')).not.toBeInTheDocument()
    fireEvent.keyDown(document.body, { key: 'n' })
    expect(await screen.findByText('Nouvelle dépense')).toBeInTheDocument()
  })
})

describe('Mois › Vue d’ensemble', () => {
  it('prévu et réel par ligne, estimation de fin de mois, « Payé » sur une charge', async () => {
    ouvrirMois('/mois')
    expect(await screen.findByText('Bilan de janvier')).toBeInTheDocument()
    const revenus = screen.getByRole('region', { name: 'Revenus' })
    expect(within(revenus).getByText('Salaire')).toBeInTheDocument()
    expect(within(revenus).getByText('Reçu')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Enveloppes' })).getByText('En cours')).toBeInTheDocument()
    expect(screen.getByText(/Estimation de fin de mois/)).toBeInTheDocument()
    // Dépensé (charges consommées), reste à payer, reste du mois avant épargne : plus de « reste réel ».
    const espaces = (t: string | null) => (t ?? '').replace(/[\u202f\u00a0\s]+/g, ' ')
    expect(screen.queryByText('Reste réel')).not.toBeInTheDocument()
    expect(espaces(screen.getByText(/^Dépensé sur 7 000/, { selector: 'p, span, div' }).closest('div')!.textContent)).toMatch(/1 400.*À confirmer \(date passée\).*3 500.*À venir.*2 100/)
    expect(espaces(screen.getByText('Reste du mois, avant épargne').closest('div')!.textContent)).toMatch(/3 000.*Revenus prévus.*10 000.*Charges prévues.*7 000/)
    expect(espaces(screen.getByRole('note').textContent)).toMatch(/Ce reste est calculé sans l’épargne/)
    expect(screen.queryByText(/À épargner/)).not.toBeInTheDocument()
    // Cumul (lot 13) : le reste de décembre arrive en janvier, le cumul de fin de janvier est une estimation.
    const cumul = screen.getByRole('region', { name: 'Cumul de mois en mois' })
    const texte = cumul.textContent!.replace(/\s+/g, ' ')
    // Report + revenus − charges − épargne confirmée = cumul : 1 500 + 10 000 − 6 500 − 500 = 4 500.
    for (const morceau of [/^Report de décembre1 500/, /Revenus\+10 000/, /Charges−6 500/, /Épargne confirmée−500/, /= Cumul fin de mois4 500/, /Ce qui restait à la fin de décembre est reporté ici\./, /\(estimation\)/]) expect(texte).toMatch(morceau)
    fireEvent.click(screen.getByRole('button', { name: 'Marquer Loyer payé' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/depenses', {
        date: '2027-01-05',
        montant: 350_000,
        categorieId: 'c-log',
        libelle: 'Loyer',
        chargeId: 'loyer',
        echeance: '2027-01-05',
        ponctuelId: null,
      }),
    )
  })

  it('« Tout marquer payé » : une confirmation, puis chaque ligne en retard notée à sa date prévue', async () => {
    ouvrirMois('/mois')
    fireEvent.click(await screen.findByRole('button', { name: 'Tout marquer payé (1)' }))
    const dialogue = await screen.findByRole('dialog', { name: 'Marquer 1 ligne comme payée ?' })
    expect(dialogue.textContent).toContain('Loyer')
    expect(api.creer).not.toHaveBeenCalled()
    fireEvent.click(within(dialogue).getByRole('button', { name: 'Tout marquer payé' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/depenses', {
        date: '2027-01-05',
        montant: 350_000,
        categorieId: 'c-log',
        libelle: 'Loyer',
        chargeId: 'loyer',
        echeance: '2027-01-05',
        ponctuelId: null,
      }),
    )
    expect(api.creer).toHaveBeenCalledTimes(1)
    // Un seul « Annuler » retire les paiements notés.
    await waitFor(() => expect(toast).toHaveBeenCalledWith('1 paiement noté.', expect.objectContaining({ action: expect.objectContaining({ label: 'Annuler' }) })))
    const options = vi.mocked(toast).mock.calls.at(-1)![1] as unknown as { action: { onClick: () => void } }
    options.action.onClick()
    await waitFor(() => expect(api.supprimer).toHaveBeenCalledWith('/depenses/nouvelle'))
  })

  it('mois clôturé : pas de bouton « Tout marquer payé »', async () => {
    bilanCourant = bilan({ cloture: { le: '2027-02-01T10:00:00.000Z', forcee: false, nonConfirmees: 0 } } as Partial<BilanDto>)
    ouvrirMois('/mois')
    expect(await screen.findByText('Bilan de janvier')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tout marquer payé/ })).not.toBeInTheDocument()
  })

  it('mois terminé avec une ligne non confirmée : « Clôturer quand même »', async () => {
    const loyerNonPaye = bilan().lignes[1]!
    bilanCourant = bilan({ mois: { ...bilan().mois, statut: 'passe' }, estimation: null, aConfirmer: [loyerNonPaye], totaux: { ...totauxBilan, ecart: -20_000 } } as Partial<BilanDto>)
    ouvrirMois('/mois')
    expect(await screen.findByText('Janvier est terminé. Vérifie et clôture.')).toBeInTheDocument()
    expect(screen.getByText(/Écart avec le plan/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clôturer janvier' }))
    expect(await screen.findByText(/1 ligne n’est pas confirmée : Loyer/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clôturer quand même' }))
    await waitFor(() => expect(api.creer).toHaveBeenCalledWith('/mois/2027-01/cloturer', { forcer: true }))
  })

  it('mois clôturé : lecture seule, réouverture', async () => {
    bilanCourant = bilan({
      mois: { ...bilan().mois, statut: 'passe' },
      estimation: null,
      cloture: { le: '2027-01-28T10:00:00.000Z', forcee: false, nonConfirmees: 0 },
      journal: [{ action: 'cloture', le: '2027-01-28T10:00:00.000Z', nonConfirmees: 0 }],
    } as Partial<BilanDto>)
    ouvrirMois('/mois')
    expect(await screen.findByText('Mois clôturé')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marquer Loyer payé' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Historique de clôture' })).getByText('Clôturé le 28 janv. 2027')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Rouvrir le mois' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Rouvrir' }))
    await waitFor(() => expect(api.creer).toHaveBeenCalledWith('/mois/2027-01/rouvrir', {}))

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Dépenses' }))
    expect(await screen.findByRole('button', { name: 'Ajouter une dépense' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Modifier Marché' })).not.toBeInTheDocument()
  })
})
