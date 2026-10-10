import { centimes, etatDette, lireDate as d, semainesDe, type DateCivile } from '@mysalary/moteur'
import type { CategorieDto, ChargeDto, DetteDto, PonctuelDto, ResumeChargesDto, Utilisateur } from '@mysalary/partage'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ErreurApi } from '../../lib/api'
import { rendre } from '../../test/outils'
import { totauxDettes } from '../dettes/saisie'
import { PagePlan } from '../plan/PagePlan'
import { apercuDette, libelleFinDette, libelleQuandCharge } from './saisie'

vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const AUJOURDHUI = '2027-01-20' as DateCivile
const compte: Utilisateur = { id: 'u1', prenom: 'Essai', devise: 'MAD', onboardingEtape: 0, onboardingTermine: false, creeLe: '2026-10-07T10:00:00.000Z', derniereOuverture: null }

const categories: CategorieDto[] = [
  { id: 'c-log', libelle: 'Logement', groupe: 'essentiel', icone: 'maison', ordre: 0, utilisee: false },
  { id: 'c-tel', libelle: 'Télécom & internet', groupe: 'essentiel', icone: 'telephone', ordre: 1, utilisee: true },
  { id: 'c-loi', libelle: 'Loisirs', groupe: 'flexible', icone: 'loisirs', ordre: 2, utilisee: false },
] as unknown as CategorieDto[]

const zero = { fixe: 0, enveloppe: 0, ponctuel: 0, dette: 0, total: 0 }
const resume = (totaux = zero) =>
  ({
    aujourdhui: AUJOURDHUI,
    mois: { cle: '2027-01', debut: '2026-12-27', fin: '2027-01-26', nbJours: 31, semaines: semainesDe({ debut: d('2026-12-27'), fin: d('2027-01-26') }, 1) },
    duMois: { lignes: [], totaux },
    parGroupe: { essentiel: totaux.fixe, flexible: totaux.enveloppe, engagement: totaux.dette },
    equivalentMensuel: { fixe: totaux.fixe, enveloppe: totaux.enveloppe, essentiel: totaux.fixe },
    prochaines: [],
    detteRestante: 0,
  }) as unknown as ResumeChargesDto

const telephone = {
  id: 'ch1',
  libelle: 'Téléphone',
  categorieId: 'c-tel',
  nature: 'fixe',
  montant: 15_000,
  frequence: 'mensuelle',
  mois: [],
  jour: 5,
  debut: '2027-01',
  fin: null,
  essentielle: true,
  creeLe: '',
  equivalentMensuel: 15_000,
  prochaineDate: '2027-02-05',
  active: true,
} as unknown as ChargeDto

/** Une dette dont l'état vient du moteur, comme le renvoie le serveur. */
function dette(paiements: { id: string; date: string; montant: number }[] = []): DetteDto {
  const base = { id: 'd1', libelle: 'Prêt voiture', creancier: 'Banque', montantTotal: centimes(900_000), mensualite: centimes(200_000), premiereEcheance: '2027-01-05' as DateCivile }
  const reels = paiements.map((p) => ({ ...p, detteId: 'd1', date: p.date as DateCivile, montant: centimes(p.montant) }))
  return { ...base, note: null, creeLe: '', etat: etatDette(base, reels, AUJOURDHUI), paiements: reels.map((p) => ({ ...p, note: null })) }
}

function serveur({ charges = [] as ChargeDto[], ponctuels = [] as PonctuelDto[], dettes = [] as DetteDto[], totaux = zero } = {}) {
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/utilisateurs') return [compte]
    if (chemin === '/categories') return categories
    if (chemin === '/charges') return charges
    if (chemin === '/ponctuels') return ponctuels
    if (chemin === '/dettes') return dettes
    if (chemin === '/charges/resume') return resume(totaux)
    if (chemin === '/salaire/contrats') return []
    throw new Error(`Route non simulée : ${chemin}`)
  })
}

async function ouvrirOnglet(nom: string) {
  rendre(<PagePlan />, { route: '/plan', compte: 'u1' })
  fireEvent.mouseDown(await screen.findByRole('tab', { name: nom }))
}

beforeEach(() => {
  vi.mocked(api.lire).mockReset()
  vi.mocked(api.creer).mockReset().mockResolvedValue({ id: 'nouveau' })
})

describe('règles d’affichage', () => {
  it('décrit quand tombe une charge', () => {
    expect(libelleQuandCharge({ nature: 'fixe', frequence: 'mensuelle', mois: [], jour: 1, debut: '2027-01' } as never)).toBe('Le 1er, chaque mois')
    expect(libelleQuandCharge({ nature: 'fixe', frequence: 'moisChoisis', mois: [6, 12], jour: 15, debut: '2027-01' } as never)).toBe('Le 15, en juin et décembre')
    expect(libelleQuandCharge({ nature: 'fixe', frequence: 'annuelle', mois: [], jour: 10, debut: '2027-03' } as never)).toBe('Le 10, chaque année en mars')
    expect(libelleQuandCharge({ nature: 'enveloppe', frequence: 'mensuelle', mois: [], jour: null, debut: '2027-01' } as never)).toBe('Chaque mois budgétaire')
  })

  it('annonce l’échéancier d’une dette avant enregistrement', () => {
    expect(apercuDette(900_000, 200_000, '2027-01-31')?.replace(/\s/g, ' ')).toBe('5 échéances : 4 × 2 000 DH puis 1 000 DH. Dernière le 31 mai 2027.')
    expect(apercuDette(200_000, 300_000, '2027-01-31')).toBeNull()
    expect(apercuDette(900_000, 200_000, '')).toBeNull()
  })

  it('totalise les dettes et trouve la prochaine échéance', () => {
    const d = dette([{ id: 'p1', date: '2027-01-05', montant: 300_000 }])
    const t = totauxDettes([d])
    expect(t).toMatchObject({ total: 900_000, paye: 300_000, restant: 600_000 })
    // 3 000 DH couvrent la 1re échéance et la moitié de la 2e.
    expect(t.prochaine).toMatchObject({ date: '2027-02-05', attendu: 100_000 })
    expect(libelleFinDette(d.etat)).toBe('Fin prévue en mai 2027')
    expect(libelleFinDette(dette([{ id: 'p1', date: '2027-01-05', montant: 900_000 }]).etat)).toBe('Soldée')
  })
})

describe('Mon plan › Charges & enveloppes', () => {
  it('sans charge : contrôle la catégorie puis ajoute une charge fixe', async () => {
    serveur()
    await ouvrirOnglet('Charges & enveloppes')
    expect(await screen.findByText('Aucune charge fixe. Ajoute ton loyer, ton téléphone, tes abonnements.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter une charge fixe' }))
    fireEvent.change(await screen.findByLabelText('Libellé'), { target: { value: 'Loyer' } })
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '3500' } })
    fireEvent.change(screen.getByLabelText('Jour du paiement'), { target: { value: '31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter cette charge' }))
    expect(await screen.findByText('Choisis une catégorie.')).toBeInTheDocument()
    expect(api.creer).not.toHaveBeenCalled()

    await waitFor(() => expect(screen.getByRole('option', { name: 'Logement' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'c-log' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter cette charge' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/charges', {
        libelle: 'Loyer',
        categorieId: 'c-log',
        nature: 'fixe',
        montant: 350_000,
        frequence: 'mensuelle',
        mois: [],
        jour: 31,
        debut: '2027-01',
        fin: null,
        essentielle: true,
        unite: 'mois',
        rythme: null,
        semaines: [],
      }),
    )
  })

  it('ajoute une enveloppe et un ponctuel', async () => {
    serveur({ charges: [telephone], totaux: { ...zero, fixe: 15_000, total: 15_000 } })
    await ouvrirOnglet('Charges & enveloppes')
    expect(await screen.findByRole('button', { name: 'Modifier Téléphone' })).toBeInTheDocument()
    expect(screen.getByTitle('Le 5, chaque mois')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Enveloppe' }))
    fireEvent.change(await screen.findByLabelText('Libellé'), { target: { value: 'Sorties' } })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Loisirs' })).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'c-loi' } })
    // Moto : 300 DH pour le mois. Consommé librement par défaut ; l'utilisateur choisit « par semaine » et le montant de chaque semaine.
    fireEvent.change(screen.getByLabelText('Budget du mois'), { target: { value: '300' } })
    expect(screen.getByRole('radio', { name: 'Librement sur le mois' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('radio', { name: 'Par semaine' }))
    fireEvent.change(screen.getByLabelText('Montant par semaine'), { target: { value: '100' } })
    const plan = screen.getByRole('region', { name: 'Semaines de ce mois' })
    expect(within(plan).getByText('Budget du mois atteint le 4 janv.')).toBeInTheDocument()
    // Rien la semaine du 4 janvier : la 4e semaine prend le relais ; MySalary ne divise rien.
    fireEvent.change(within(plan).getByLabelText('Montant de la semaine 3'), { target: { value: '0' } })
    expect(within(plan).getByText('Budget du mois atteint le 11 janv.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Montant par semaine'), { target: { value: '50' } })
    expect(within(plan).getByText(/restent à répartir sur ce mois/).textContent!.replace(/\s+/g, ' ')).toBe('50 DH restent à répartir sur ce mois : augmente le montant d’une semaine.')
    fireEvent.change(screen.getByLabelText('Montant par semaine'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter cette enveloppe' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/charges', {
        libelle: 'Sorties',
        categorieId: 'c-loi',
        nature: 'enveloppe',
        montant: 30_000,
        frequence: 'mensuelle',
        mois: [],
        jour: null,
        debut: '2027-01',
        fin: null,
        essentielle: false,
        unite: 'semaine',
        rythme: 10_000,
        semaines: [{ debut: '2027-01-04', montant: 0 }],
      }),
    )

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Ajouter cette enveloppe' })).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Ponctuel' }))
    fireEvent.change(await screen.findByLabelText('Libellé'), { target: { value: 'Assurance auto' } })
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: 'c-log' } })
    fireEvent.change(screen.getByLabelText('Montant'), { target: { value: '2400' } })
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2027-12-15' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Probable' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter ce ponctuel' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/ponctuels', { libelle: 'Assurance auto', categorieId: 'c-log', montant: 240_000, date: '2027-12-15', certitude: 'probable' }),
    )
  })
})

describe('Mon plan › Dettes', () => {
  it('ajoute une dette avec l’aperçu de son échéancier', async () => {
    serveur()
    await ouvrirOnglet('Dettes')
    expect(await screen.findByText(/Aucune dette\./)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Dette/ }))
    fireEvent.change(await screen.findByLabelText('Libellé'), { target: { value: 'Prêt voiture' } })
    fireEvent.change(screen.getByLabelText('Montant total à rembourser'), { target: { value: '9000' } })
    fireEvent.change(screen.getByLabelText('Mensualité'), { target: { value: '2000' } })
    fireEvent.change(screen.getByLabelText('Première échéance'), { target: { value: '2027-02-05' } })
    expect(screen.getByText(/^5 échéances : .* Dernière le 5 juin 2027\.$/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter cette dette' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/dettes', { libelle: 'Prêt voiture', creancier: '', montantTotal: 900_000, mensualite: 200_000, premiereEcheance: '2027-02-05' }),
    )
  })

  it('note un paiement et affiche le refus du serveur', async () => {
    serveur({ dettes: [dette()] })
    await ouvrirOnglet('Dettes')
    fireEvent.click(await screen.findByRole('button', { name: 'Ouvrir Prêt voiture' }))

    const echeancier = await screen.findByRole('list', { name: 'Échéancier' })
    // Première échéance (5 janv.) passée sans paiement : en retard.
    expect(within(echeancier).getAllByRole('listitem')).toHaveLength(5)
    expect(within(echeancier).getByText('En retard')).toBeInTheDocument()

    // Le montant proposé est l'échéance attendue.
    expect(screen.getByLabelText('Montant payé')).toHaveValue('2000')
    fireEvent.click(screen.getByRole('button', { name: 'Noter ce paiement' }))
    await waitFor(() => expect(api.creer).toHaveBeenCalledWith('/dettes/d1/paiements', { date: AUJOURDHUI, montant: 200_000 }))

    vi.mocked(api.creer).mockRejectedValueOnce(new ErreurApi(422, 'REGLE_METIER', 'Ce paiement dépasse le reste dû (9 000 DH).', { montant: 'Au plus 9 000 DH.' }))
    fireEvent.change(screen.getByLabelText('Montant payé'), { target: { value: '10000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Noter ce paiement' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce paiement dépasse le reste dû')
    expect(screen.getByText('Au plus 9 000 DH.')).toBeInTheDocument()
  })

  it('range une dette soldée dans « Terminées »', async () => {
    serveur({ dettes: [dette([{ id: 'p1', date: '2027-01-05', montant: 900_000 }])] })
    await ouvrirOnglet('Dettes')
    const terminees = await screen.findByRole('list', { name: 'Dettes soldées' })
    expect(within(terminees).getByText('Prêt voiture')).toBeInTheDocument()
    expect(screen.getByText('Toutes tes dettes sont soldées.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Noter un paiement' })).toBeDisabled()
  })
})
