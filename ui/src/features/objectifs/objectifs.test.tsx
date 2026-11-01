import { REGLES_SCENARIOS_DEFAUT } from '@mysalary/partage'
import type { EpargneDto, MouvementEpargneDto, ObjectifDetailDto, ObjectifsDto, SuiviObjectif, Utilisateur } from '@mysalary/partage'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
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

const compte: Utilisateur = { id: 'u1', prenom: 'Essai', devise: 'MAD', onboardingEtape: 0, onboardingTermine: false, email: 'test@exemple.test', emailVerifie: true, creeLe: '2026-10-07T10:00:00.000Z', derniereOuverture: null }

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

const etat = { comptes: [{ id: 'cih', libelle: 'CIH', solde: 2_000_000, auLe: '2026-10-01', soldeActuel: 2_300_000 }], declare: true, solde: 2_300_000, reserve: 1_300_000, disponible: 1_000_000, depassement: 0 }

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
    regles: REGLES_SCENARIOS_DEFAUT,
    annee: {
      annee: 2026,
      enCours: 2,
      cible: 8_900_000,
      epargne: 1_300_000,
      restant: 7_600_000,
      progression: 1_300_000 / 8_900_000,
      aRisque: ['moto'],
      verseCetteAnnee: 200_000,
      finAnnee: { prudent: 1_700_000, realiste: 1_900_000, ambitieux: 2_100_000 },
      points: [
        { mois: '2026-09', reel: 1_100_000, projete: null, aujourdhui: false },
        { mois: '2026-10', reel: 1_300_000, projete: 1_300_000, aujourdhui: true },
        { mois: '2026-11', reel: null, projete: 1_600_000, aujourdhui: false },
        { mois: '2026-12', reel: null, projete: 1_900_000, aujourdhui: false },
      ],
      objectifs: [
        { id: 'moto', debutAnnee: 1_000_000, epargne: 1_200_000, finAnnee: 1_500_000, atteintCetteAnnee: null },
        { id: 'permis', debutAnnee: 0, epargne: 100_000, finAnnee: 400_000, atteintCetteAnnee: '2026-12' },
      ],
    },
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
    regles: REGLES_SCENARIOS_DEFAUT,
    // Juillet 2027 souhaité : 8 000 DH manquent ; atteint en novembre 2027.
    simulation: {
      mois: [
        { cle: '2026-10', nature: 'enCours', cumul: 300_000, versements: 0, epargne: 1_500_000, manque: 7_000_000, atteint: false },
        { cle: '2027-07', nature: 'prevu', cumul: 6_500_000, versements: 0, epargne: 7_700_000, manque: 800_000, atteint: false },
        { cle: '2027-11', nature: 'prevu', cumul: 7_400_000, versements: 0, epargne: 8_600_000, manque: 0, atteint: true },
      ],
      dateAtteinte: '2027-11',
      ecart: 4,
      moisSouhaite: { cle: '2027-07', nature: 'prevu', cumul: 6_500_000, versements: 0, epargne: 7_700_000, manque: 800_000, atteint: false },
      ajoutParMois: 80_000,
    },
  }) as unknown as ObjectifDetailDto
let detailCourant = detail()
let epargne: EpargneDto
const conseils = {
  aujourdhui: '2026-10-09',
  alertes: [
    { cle: 'v', type: 'versementPrevu', objectifId: 'moto', libelle: 'Moto', reste: 200_000, mois: '2026-10', titre: 'Versement « Moto » à faire', message: '2 000 DH prévus ce mois-ci pour « Moto ».', action: { libelle: 'Noter le versement', chemin: '/plan?onglet=epargne' } },
    { cle: 'p', type: 'paieEnRetard', titre: 'Paie en retard', message: 'Hors sujet ici.', action: { libelle: 'Confirmer', chemin: '/plan' } },
  ],
  recommandations: [],
}

function serveur() {
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/auth/session') return compte
    if (chemin === '/objectifs') return objectifs
    if (chemin === '/objectifs/moto') return detailCourant
    if (chemin === '/epargne') return epargne
    if (chemin === '/recommandations') return conseils
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
  epargne = {
    aujourdhui: '2026-10-09',
    etat,
    planMois: { cle: '2026-10', debut: '2026-09-27', fin: '2026-10-26', lignes: [{ objectifId: 'moto', libelle: 'Moto', prevu: 400_000, reel: 200_000, prevuSaute: null }], prevue: 400_000, reelle: 200_000 },
    mouvements: [versement],
    objectifs: [{ id: 'moto', libelle: 'Moto', statut: 'actif' }],
  } as unknown as EpargneDto
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

  it('vue de l’année : indicateurs réels, trajectoire, fin d’année par scénario ; chaque objectif garde son lien', async () => {
    rendre(<FournisseurSaisieRapide><PageObjectifs /></FournisseurSaisieRapide>, { route: '/objectifs', compte: 'u1' })
    const kpi = await screen.findByRole('region', { name: 'Indicateurs des objectifs' })
    expect(within(kpi).getByRole('progressbar', { name: 'Épargné : 15 % de la cible' })).toBeInTheDocument()
    expect(espaces(kpi.textContent)).toMatch(/Tu as épargné.*13 000.*sur.*89 000.*visés/)
    expect(espaces(kpi.textContent)).toMatch(/Dates en danger.*1.*Moto/)
    const annee = screen.getByRole('region', { name: 'Année 2026' })
    expect(espaces(annee.textContent)).toMatch(/Fin 2026 prévue.*19 000.*De.*17 000.*à.*21 000/)
    expect(within(annee).getByRole('figure', { name: 'Épargne des objectifs en 2026' })).toBeInTheDocument()
    const enCours = screen.getByRole('list', { name: 'Objectifs en cours' })
    expect(within(enCours).getByRole('link', { name: 'Moto' })).toHaveAttribute('href', '/objectifs/moto')
    expect(within(enCours).getByText('Atteint en décembre')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Calendrier de l’année' })).not.toBeInTheDocument()
  })

  it('prochaines actions : seulement ce qui concerne les objectifs ; le versement prévu s’ouvre pré-rempli', async () => {
    rendre(<FournisseurSaisieRapide><PageObjectifs /></FournisseurSaisieRapide>, { route: '/objectifs', compte: 'u1' })
    const actions = await screen.findByRole('list', { name: 'À faire pour tes objectifs' })
    expect(within(actions).queryByText('Paie en retard')).not.toBeInTheDocument()
    fireEvent.click(within(actions).getByRole('button', { name: 'Noter le versement' }))
    expect(await screen.findByLabelText('Montant')).toHaveValue('2000')
    expect(screen.getByRole('radio', { name: /Moto/ })).toHaveAttribute('aria-checked', 'true')
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
    fireEvent.change(screen.getByLabelText('Épargne actuelle (facultatif)'), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Créer l’objectif' }))
    expect(await screen.findByText('Déjà plus que la cible.')).toBeInTheDocument()
    expect(api.creer).not.toHaveBeenCalledWith('/objectifs', expect.anything())
  })
})

describe('Objectif (détail)', () => {
  it('verdict en tête : mois souhaité manqué, ce qui manque, date réelle, options ; reste et effort mensuel', async () => {
    rendre(<FournisseurSaisieRapide><PageObjectif /></FournisseurSaisieRapide>, { route: '/objectifs/moto', chemin: '/objectifs/:id', compte: 'u1' })
    const verdict = await screen.findByRole('status', { name: 'Verdict' })
    expect(within(verdict).getByText('Juillet 2027 ne suffit pas')).toBeInTheDocument()
    expect(espaces(verdict.textContent)).toContain('Il manquera 8 000 DH. Date estimée : novembre 2027, 4 mois de retard.')
    const options = within(verdict).getByRole('list', { name: 'Options' })
    expect(espaces(options.textContent)).toMatch(/Dégager 800 ?DH.*de plus par mois/)
    expect(espaces(options.textContent)).toContain('Viser novembre 2027')
    expect(espaces(screen.getByText('Reste à épargner').parentElement!.textContent)).toMatch(/73 000 ?DH/)
    expect(espaces(screen.getByText('Effort mensuel').parentElement!.textContent)).toMatch(/7 500 ?DH/)
    expect(espaces(screen.getByText('Effort mensuel').parentElement!.textContent)).toContain('pendant 10 mois, jusqu’à juillet 2027')
    // Plus de scénarios ni de risque en double : une seule estimation, celle du cumul.
    expect(screen.queryByText('Prudent')).not.toBeInTheDocument()
    expect(screen.queryByText('Sur quoi repose ce calcul ?')).not.toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Versements' })).getByText('Versement')).toBeInTheDocument()
  })

  it('simulation : le mois souhaité est choisi d’office ; choisir un mois montre son cumul, sans aucun champ à saisir', async () => {
    rendre(<FournisseurSaisieRapide><PageObjectif /></FournisseurSaisieRapide>, { route: '/objectifs/moto', chemin: '/objectifs/:id', compte: 'u1' })
    const bloc = await screen.findByRole('region', { name: 'Simulation avec le cumul' })
    expect(within(bloc).queryByRole('textbox')).not.toBeInTheDocument()
    const choisi = within(bloc).getByRole('radio', { checked: true })
    expect(choisi).toHaveAccessibleName('juillet 2027, mois souhaité')
    const resultat = within(bloc).getByLabelText('Résultat pour juillet 2027')
    expect(espaces(resultat.textContent)).toMatch(/Il manque 8 000 ?DH/)
    expect(espaces(resultat.textContent)).toMatch(/\+ 65 000 ?DH/)

    fireEvent.click(within(bloc).getByRole('radio', { name: 'novembre 2027, cible atteinte' }))
    const novembre = within(bloc).getByLabelText('Résultat pour novembre 2027')
    expect(espaces(novembre.textContent)).toContain('Cible atteinte')
    expect(espaces(novembre.textContent)).toMatch(/86 000 ?DH/)
  })

  it('achat réalisé sans dépense', async () => {
    rendre(<FournisseurSaisieRapide><PageObjectif /></FournisseurSaisieRapide>, { route: '/objectifs/moto', chemin: '/objectifs/:id', compte: 'u1' })
    fireEvent.click(await screen.findByRole('button', { name: 'Marquer comme réalisé' }))
    const panneau = await screen.findByRole('dialog')
    fireEvent.click(within(panneau).getByRole('button', { name: 'Marquer comme réalisé' }))
    await waitFor(() => expect(api.creer).toHaveBeenCalledWith('/objectifs/moto/realiser', { date: '2026-10-09' }))
  })

  it('cible atteinte : verdict positif, plus rien à mettre de côté', async () => {
    detailCourant = detail({ atteint: true, restant: 0, progression: 1, risque: 'sur', effortMensuel: null })
    rendre(<FournisseurSaisieRapide><PageObjectif /></FournisseurSaisieRapide>, { route: '/objectifs/moto', chemin: '/objectifs/:id', compte: 'u1' })
    const verdict = await screen.findByRole('status', { name: 'Verdict' })
    expect(within(verdict).getByText('Cible atteinte')).toBeInTheDocument()
    expect(screen.getByText('Rien à mettre de côté')).toBeInTheDocument()
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
  it('aucun compte à gérer : ni compte, ni solde à déclarer ; ce qui est mis de côté, par objectif (lot 37)', async () => {
    epargne = { ...epargne, etat: { ...etat, disponible: 0, depassement: 50_000 } } as unknown as EpargneDto
    rendre(
      <FournisseurSaisieRapide>
        <OngletEpargne />
      </FournisseurSaisieRapide>,
      { route: '/plan', compte: 'u1' },
    )
    expect(await screen.findByRole('region', { name: 'Épargne du mois' })).toBeInTheDocument()
    expect(screen.queryByText(/compte/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/déclar/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Épargne par objectif' })).toBeInTheDocument()
  })

  // Plan du mois (lot 36) : un choix clair par objectif, chacun annulable.
  const ouvrirEpargne = () =>
    rendre(
      <FournisseurSaisieRapide>
        <OngletEpargne />
      </FournisseurSaisieRapide>,
      { route: '/plan', compte: 'u1' },
    )
  const plan = (lignes: object[]) => {
    epargne = { ...epargne, planMois: { ...epargne.planMois, lignes } } as unknown as EpargneDto
  }
  const ligneMoto = async () => (await screen.findByRole('link', { name: 'Moto' })).closest('li')!

  it('en partie épargné : « Compléter » note le reste en un clic ; « Autre montant » ouvre la saisie pré-remplie', async () => {
    ouvrirEpargne()
    const mois = await screen.findByRole('region', { name: 'Épargne du mois' })
    expect(espaces(mois.textContent)).toMatch(/2 000.*épargnés sur 4 000.*prévus/)
    const moto = await ligneMoto()
    fireEvent.click(within(moto).getByRole('button', { name: /Épargné : 2.000.DH pour Moto/ }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/epargne/mouvements', { sens: 'versement', objectifId: 'moto', date: '2026-10-09', montant: 200_000, libelle: '' }),
    )
    fireEvent.click(within(moto).getByRole('button', { name: 'Autre montant' }))
    expect(await screen.findByLabelText('Montant')).toHaveValue('2000')
    expect(screen.getByRole('radio', { name: /Moto/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('à décider : « Pas ce mois-ci », puis « Annuler » le rend de nouveau à décider', async () => {
    plan([{ objectifId: 'moto', libelle: 'Moto', prevu: 400_000, reel: 0, prevuSaute: null }])
    vi.mocked(api.supprimer).mockResolvedValue(undefined)
    ouvrirEpargne()
    fireEvent.click(within(await ligneMoto()).getByRole('button', { name: 'Pas ce mois-ci' }))
    await waitFor(() => expect(api.modifier).toHaveBeenCalledWith('/epargne/plan/moto/saut', {}))

    cleanup()
    plan([{ objectifId: 'moto', libelle: 'Moto', prevu: null, reel: 0, prevuSaute: 400_000 }])
    ouvrirEpargne()
    const moto = await ligneMoto()
    expect(espaces(moto.textContent)).toMatch(/Pas ce mois-ci · 4 000.*non épargnés/)
    expect(within(moto).queryByRole('button', { name: /Épargné/ })).not.toBeInTheDocument()
    fireEvent.click(within(moto).getByRole('button', { name: 'Annuler' }))
    await waitFor(() => expect(api.supprimer).toHaveBeenCalledWith('/epargne/plan/moto/saut'))
  })

  it('épargné : « Annuler » demande confirmation, puis retire les versements du mois de cet objectif', async () => {
    plan([{ objectifId: 'moto', libelle: 'Moto', prevu: 400_000, reel: 400_000, prevuSaute: null }])
    vi.mocked(api.supprimer).mockResolvedValue(undefined)
    ouvrirEpargne()
    const moto = await ligneMoto()
    expect(within(moto).getByRole('img', { name: 'Épargné' })).toBeInTheDocument()
    expect(espaces((await screen.findByRole('region', { name: 'Épargne du mois' })).textContent)).toMatch(/Tout est décidé pour ce mois/)
    fireEvent.click(within(moto).getByRole('button', { name: 'Annuler' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler l’épargne' }))
    await waitFor(() => expect(api.supprimer).toHaveBeenCalledWith('/epargne/plan/moto/versements'))
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
    expect(screen.getByRole('radio', { name: /Moto/ })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Noter le versement' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/epargne/mouvements', { sens: 'versement', objectifId: 'moto', date: '2026-10-09', montant: 30_000, libelle: '' }),
    )
    expect(api.creer).not.toHaveBeenCalledWith('/depenses', expect.anything())
  })
})
