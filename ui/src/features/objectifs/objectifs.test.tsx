import type { EpargneDto, MouvementEpargneDto, ObjectifDetailDto, ObjectifsDto, SuiviObjectif, Utilisateur } from '@mysalary/partage'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { rendre } from '../../test/outils'
import { FournisseurSaisieRapide, useSaisieRapide } from '../depenses/SaisieRapide'
import { OngletEpargne } from '../epargne/OngletEpargne'
import { groupesMouvements } from '../epargne/saisie'
import { PageEditionObjectif } from './PageEditionObjectif'
import { PageObjectif } from './PageObjectif'
import { PageObjectifs } from './PageObjectifs'
import { phraseObjectif, pointsTrajectoire, propositions, texteEstimation } from './saisie'

vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const compte: Utilisateur = { id: 'u1', prenom: 'Essai', devise: 'MAD', onboardingEtape: 0, onboardingTermine: false, creeLe: '2026-10-07T10:00:00.000Z', derniereOuverture: null }

const objectif = (modif: Record<string, unknown>): SuiviObjectif =>
  ({
    id: 'moto',
    libelle: 'Moto',
    type: 'moto',
    montantCible: 8_500_000,
    montantInitial: 1_000_000,
    dateCible: '2027-07',
    priorite: 1,
    versementMensuel: null,
    statut: 'actif',
    realiseLe: null,
    creeLe: '2026-10-01',
    epargne: 1_200_000,
    restant: 7_300_000,
    progression: 1_200_000 / 8_500_000,
    atteint: false,
    moisRestants: 10,
    dateDepassee: false,
    effortMensuel: 750_000,
    effortHebdo: 173_077,
    estimations: { prudent: '2028-03', realiste: '2027-11', ambitieux: '2027-11' },
    versementPrevuCeMois: 160_000,
    risque: 'horsPortee',
    ...modif,
  }) as unknown as SuiviObjectif

const permis = objectif({ id: 'permis', libelle: 'Permis', type: 'autre', priorite: 2, montantCible: 400_000, epargne: 100_000, restant: 300_000, risque: 'sur', estimations: { prudent: '2026-12', realiste: '2026-12', ambitieux: '2026-12' } })
const voyage = objectif({ id: 'voyage', libelle: 'Voyage', type: 'voyage', priorite: 3, statut: 'realise', realiseLe: '2026-09-01', risque: null, estimations: null })

const etat = { comptes: [{ id: 'cih', libelle: 'CIH', solde: 2_000_000, auLe: '2026-10-01', soldeActuel: 2_300_000 }], solde: 2_300_000, reserve: 1_300_000, disponible: 1_000_000, depassement: 0 }

let objectifs: ObjectifsDto
const liste = (modif: Partial<ObjectifsDto> = {}) =>
  ({
    aujourdhui: '2026-10-09',
    moisCourant: '2026-10',
    epargne: etat,
    objectifs: [objectif({}), permis, voyage],
    capacite: { prudent: 160_000, realiste: 160_000, ambitieux: 160_000 },
    fondsSecurite: { min: 1_980_000, max: 3_960_000, base: 660_000 },
    comptes: [{ id: 'cih', libelle: 'CIH' }],
    ...modif,
  }) as unknown as ObjectifsDto

const versement: MouvementEpargneDto = { id: 'm1', compteId: 'cih', objectifId: 'moto', type: 'versement', date: '2026-10-03', montant: 200_000, libelle: 'Moto', note: null, objectif: 'Moto', compte: 'CIH' } as MouvementEpargneDto
const detail = (modif: Record<string, unknown> = {}) =>
  ({
    aujourdhui: '2026-10-09',
    moisCourant: '2026-10',
    objectif: objectif(modif),
    trajectoire: [
      { mois: '2026-10', reel: 1_200_000, projete: 1_200_000, aujourdhui: true },
      { mois: '2026-10', reel: null, projete: 1_360_000, aujourdhui: false },
      { mois: '2027-01', reel: null, projete: 2_000_000, aujourdhui: false },
    ],
    versements: [versement],
    capacite: { prudent: 160_000, realiste: 160_000, ambitieux: 160_000 },
    comptes: [{ id: 'cih', libelle: 'CIH' }],
  }) as unknown as ObjectifDetailDto
let detailCourant = detail()
let epargne: EpargneDto

function serveur() {
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/utilisateurs') return [compte]
    if (chemin === '/objectifs') return objectifs
    if (chemin === '/objectifs/moto') return detailCourant
    if (chemin === '/epargne') return epargne
    throw new Error(`Route non simulée : ${chemin}`)
  })
}

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-09T10:00:00'))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => {
  objectifs = liste()
  detailCourant = detail()
  epargne = { aujourdhui: '2026-10-09', etat, mouvements: [versement], objectifs: [{ id: 'moto', libelle: 'Moto', statut: 'actif' }] } as unknown as EpargneDto
  serveur()
  vi.mocked(api.creer).mockReset().mockResolvedValue({ id: 'nouveau' })
  vi.mocked(api.modifier).mockReset().mockResolvedValue(undefined)
})

const espaces = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ')

describe('règles d’affichage', () => {
  it('phrase, estimation, leviers chiffrés seulement si la date n’est pas tenue', () => {
    expect(texteEstimation(null)).toBe('au-delà de 10 ans')
    expect(phraseObjectif(objectif({}))).toBe('À ce rythme : novembre 2027 (projection), pour juillet 2027 souhaité.')
    expect(phraseObjectif(objectif({ atteint: true }))).toMatch(/Cible atteinte/)
    expect(phraseObjectif(objectif({ dateCible: null }))).toMatch(/^Sans date souhaitée/)
    expect(propositions(objectif({})).map(espaces)).toEqual(['Repousser la date à novembre 2027.', 'Verser 7 500 DH par mois jusqu’à juillet 2027, en réduisant une enveloppe si besoin.'])
    expect(propositions(permis)).toEqual([])
  })

  it('trajectoire : « Auj. » pour la jonction, mois abrégés, année en janvier', () => {
    const { points, aujourdhui } = pointsTrajectoire(detail().trajectoire)
    expect(aujourdhui).toBe('Auj.')
    expect(points.map((p) => p.periode)).toEqual(['Auj.', 'oct.', 'janv. 27'])
    expect(points[0]).toEqual({ periode: 'Auj.', reel: 1_200_000, projete: 1_200_000 })
    expect(points[1]).toEqual({ periode: 'oct.', projete: 1_360_000 })
  })

  it('mouvements groupés par jour', () => {
    expect(groupesMouvements([versement, { ...versement, id: 'm2' }, { ...versement, id: 'm3', date: '2026-10-01' as MouvementEpargneDto['date'] }]).map((g) => [g.jour, g.mouvements.length])).toEqual([
      ['2026-10-03', 2],
      ['2026-10-01', 1],
    ])
  })
})

describe('Objectifs (liste)', () => {
  it('cartes par priorité avec risque et estimation ; réalisés repliés ; fonds de sécurité proposé', async () => {
    rendre(<FournisseurSaisieRapide><PageObjectifs /></FournisseurSaisieRapide>, { route: '/objectifs', compte: 'u1' })
    const enCours = await screen.findByRole('list', { name: 'Objectifs en cours' })
    expect(within(enCours).getAllByRole('link').map((l) => l.textContent)).toEqual(['Moto', 'Permis'])
    expect(within(enCours).getByText('Hors de portée')).toBeInTheDocument()
    expect(screen.getByText('Réalisés (1)')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Créer ce fonds' })).toHaveAttribute('href', '/objectifs/nouveau?type=securite')
  })

  it('monter un objectif envoie l’ordre complet', async () => {
    rendre(<FournisseurSaisieRapide><PageObjectifs /></FournisseurSaisieRapide>, { route: '/objectifs', compte: 'u1' })
    fireEvent.click(await screen.findByRole('button', { name: 'Monter Permis en priorité' }))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/objectifs/ordre', { ids: ['permis', 'moto', 'voyage'] }))
    expect(screen.getByRole('button', { name: 'Monter Moto en priorité' })).toBeDisabled()
  })

  it('état vide : ce qui manque, pourquoi, l’action', async () => {
    objectifs = liste({ objectifs: [] })
    rendre(<FournisseurSaisieRapide><PageObjectifs /></FournisseurSaisieRapide>, { route: '/objectifs', compte: 'u1' })
    expect(await screen.findByText('Crée ton premier objectif.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Moto' })).toHaveAttribute('href', '/objectifs/nouveau?type=moto')
  })
})

describe('Nouvel objectif', () => {
  it('aperçu projeté pendant la saisie, puis création', async () => {
    vi.mocked(api.creer).mockImplementation(async (chemin: string) =>
      chemin.startsWith('/objectifs/apercu') ? { objectif: objectif({ id: 'apercu', libelle: 'Ordinateur', estimations: { prudent: '2027-05', realiste: '2027-03', ambitieux: '2027-02' }, risque: null, dateCible: null, effortMensuel: null }), capacite: {} } : { id: 'o9' },
    )
    rendre(<PageEditionObjectif />, { route: '/objectifs/nouveau?type=ordinateur', chemin: '/objectifs/nouveau', compte: 'u1' })
    expect(await screen.findByLabelText('Nom')).toHaveValue('Ordinateur portable')
    fireEvent.change(screen.getByLabelText('Montant cible'), { target: { value: '12000' } })
    expect(await screen.findByText('mars 2027', {}, { timeout: 2000 })).toBeInTheDocument()
    expect(api.creer).toHaveBeenCalledWith('/objectifs/apercu', expect.objectContaining({ montantCible: 1_200_000, type: 'ordinateur' }))

    fireEvent.click(screen.getByRole('button', { name: 'Créer l’objectif' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/objectifs', { libelle: 'Ordinateur portable', type: 'ordinateur', montantCible: 1_200_000, montantInitial: 0, dateCible: null, versementMensuel: null }),
    )
  })

  it('refuse un déjà mis de côté supérieur à la cible', async () => {
    rendre(<PageEditionObjectif />, { route: '/objectifs/nouveau', compte: 'u1' })
    fireEvent.change(await screen.findByLabelText('Nom'), { target: { value: 'Vélo' } })
    fireEvent.change(screen.getByLabelText('Montant cible'), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText('Déjà mis de côté (facultatif)'), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer l’objectif' }))
    expect(await screen.findByText('Déjà plus que la cible.')).toBeInTheDocument()
    expect(api.creer).not.toHaveBeenCalledWith('/objectifs', expect.anything())
  })
})

describe('Objectif (détail)', () => {
  it('dates par scénario, leviers, versements, puis achat réalisé sans dépense', async () => {
    rendre(<FournisseurSaisieRapide><PageObjectif /></FournisseurSaisieRapide>, { route: '/objectifs/moto', chemin: '/objectifs/:id', compte: 'u1' })
    expect(await screen.findByText('Pour tenir juillet 2027, deux leviers :')).toBeInTheDocument()
    expect(screen.getAllByText('novembre 2027').length).toBeGreaterThan(0)
    expect(within(screen.getByRole('list', { name: 'Versements' })).getByText('Versement')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Marquer comme réalisé' }))
    const panneau = await screen.findByRole('dialog')
    fireEvent.click(within(panneau).getByRole('button', { name: 'Marquer comme réalisé' }))
    await waitFor(() => expect(api.creer).toHaveBeenCalledWith('/objectifs/moto/realiser', { date: '2026-10-09', compteId: 'cih' }))
  })

  it('cible atteinte : bravo et achat proposé', async () => {
    detailCourant = detail({ atteint: true, restant: 0, progression: 1, risque: 'sur' })
    rendre(<FournisseurSaisieRapide><PageObjectif /></FournisseurSaisieRapide>, { route: '/objectifs/moto', chemin: '/objectifs/:id', compte: 'u1' })
    expect(await screen.findByText('Bravo, la cible est atteinte.')).toBeInTheDocument()
  })
})

/** Ouvre la saisie d'un versement, comme le bouton « Verser ». */
function BoutonVerser() {
  const { ouvrirVersement } = useSaisieRapide()
  return (
    <button type="button" onClick={() => ouvrirVersement({ objectifId: 'moto' })}>
      Ouvrir le versement
    </button>
  )
}

describe('Épargne', () => {
  it('solde, réservé, disponible ; alerte si les objectifs réservent trop', async () => {
    epargne = { ...epargne, etat: { ...etat, disponible: 0, depassement: 50_000 } } as unknown as EpargneDto
    rendre(
      <FournisseurSaisieRapide>
        <OngletEpargne />
      </FournisseurSaisieRapide>,
      { route: '/plan', compte: 'u1' },
    )
    expect(espaces((await screen.findByRole('alert')).textContent)).toMatch(/réservent 500 DH de plus que ton épargne déclarée/)
    expect(within(screen.getByRole('list', { name: 'Comptes d’épargne' })).getByText('CIH')).toBeInTheDocument()
  })

  it('saisie rapide d’un versement vers un objectif : jamais une dépense', async () => {
    rendre(
      <FournisseurSaisieRapide>
        <BoutonVerser />
      </FournisseurSaisieRapide>,
      { route: '/', compte: 'u1' },
    )
    // La saisie ne s'ouvre qu'une fois le compte chargé : on réessaie jusqu'à ce que le panneau apparaisse.
    const bouton = await screen.findByRole('button', { name: 'Ouvrir le versement' })
    await waitFor(() => {
      fireEvent.click(bouton)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    fireEvent.change(await screen.findByLabelText('Montant'), { target: { value: '300' } })
    expect(screen.getByLabelText('Pour')).toHaveValue('moto')
    fireEvent.click(screen.getByRole('button', { name: 'Noter le versement' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/epargne/mouvements', { sens: 'versement', compteId: 'cih', objectifId: 'moto', date: '2026-10-09', montant: 30_000, libelle: '' }),
    )
    expect(api.creer).not.toHaveBeenCalledWith('/depenses', expect.anything())
  })
})
