import { REGLES_SCENARIOS_DEFAUT } from '@mysalary/partage'
import type { Reglages, ScenarioDto, SimulationDto, Utilisateur } from '@mysalary/partage'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { rendre } from '../../test/outils'
import { FournisseurSaisieRapide } from '../depenses/SaisieRapide'
import { texteRegle } from '../objectifs/saisie'
import { PageReglages } from '../reglages/PageReglages'
import { PageSimulateur } from './PageSimulateur'
import { depuisScenario, LEVIERS_VIDES, pointsSimulation, resumeLeviers, texteAlerte, texteGain, versAjustements } from './saisie'

vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const compte: Utilisateur = { id: 'u1', prenom: 'Essai', devise: 'MAD', onboardingEtape: 0, onboardingTermine: false, creeLe: '2026-10-07T10:00:00.000Z', derniereOuverture: null }
const point = (mois: string, epargne: number) => ({ mois, capacite: 160_000, epargne, reserve: 0 })

const simulation = {
  aujourdhui: '2026-10-09',
  moisCourant: '2026-10',
  horizon: 12,
  horizonLong: false,
  regles: REGLES_SCENARIOS_DEFAUT,
  epargneActuelle: 2_300_000,
  reel: [{ mois: '2026-09', epargne: 2_000_000 }],
  series: {
    prudent: [point('2026-10', 2_400_000), point('2026-11', 2_500_000)],
    realiste: [point('2026-10', 2_460_000), point('2026-11', 2_900_000)],
    ambitieux: [point('2026-10', 2_460_000), point('2026-11', 3_000_000)],
  },
  objectifs: [
    {
      id: 'moto',
      libelle: 'Moto',
      dateCible: '2027-07',
      versementMensuel: null,
      epargne: 1_200_000,
      montantCible: 8_500_000,
      base: { prudent: '2028-03', realiste: '2027-11', ambitieux: '2027-11' },
      simule: { prudent: '2028-02', realiste: '2027-10', ambitieux: '2027-10' },
      gainMois: { prudent: 1, realiste: 1, ambitieux: 1 },
      effortMensuel: 750_000,
      effortHebdo: 173_077,
      risqueBase: 'horsPortee',
      risque: 'horsPortee',
    },
  ],
  alertes: [],
} as unknown as SimulationDto

const charges = [
  { id: 'courses', libelle: 'Courses', nature: 'enveloppe', montant: 310_000, active: true },
  { id: 'vieux', libelle: 'Ancien abonnement', nature: 'fixe', montant: 10_000, active: false },
]
let scenarios: ScenarioDto[] = []
const reglages: Reglages = { modePeriode: 'cyclePaie', debutSemaine: 1, reportHebdo: false, animations: true, reglesScenarios: REGLES_SCENARIOS_DEFAUT }

function serveur() {
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/utilisateurs') return [compte]
    if (chemin === '/charges') return charges
    if (chemin === '/scenarios') return scenarios
    if (chemin === '/reglages') return reglages
    throw new Error(`Route non simulée : ${chemin}`)
  })
  vi.mocked(api.creer).mockReset().mockImplementation(async (chemin: string) => {
    if (chemin === '/simulations/executer') return simulation
    if (chemin === '/simulations/appliquer') return { changements: ['Prime probable de 5 000 DH prévue le 28 oct. 2026 (Autres revenus).'] }
    return { id: 'nouveau' }
  })
}

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-09T10:00:00'))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => {
  scenarios = []
  serveur()
  vi.mocked(api.modifier).mockReset().mockResolvedValue(reglages)
})

const espaces = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ')
const ouvrir = () =>
  rendre(
    <FournisseurSaisieRapide>
      <PageSimulateur />
    </FournisseurSaisieRapide>,
    { route: '/simulateur?objectif=moto', chemin: '/simulateur', compte: 'u1' },
  )

describe('règles d’affichage', () => {
  it('leviers → ajustements ; un champ vide ne compte pas, un montant invalide est signalé', () => {
    const l = { ...LEVIERS_VIDES, objectifId: 'moto', versement: '3000', dateCible: '2027-05', primeMontant: '5000', primeMois: '2026-11', reductionChargeId: 'courses', reductionMontant: 'abc' }
    const { ajustements, erreurs } = versAjustements(l)
    expect(ajustements).toEqual({ versements: { moto: 300_000 }, datesCibles: { moto: '2027-05' }, primes: [{ mois: '2026-11', montant: 500_000 }], reductions: [] })
    expect(erreurs).toHaveProperty('reductionMontant')
    expect(versAjustements({ ...LEVIERS_VIDES, objectifId: 'moto' }).ajustements).toEqual({ versements: {}, datesCibles: {}, primes: [], reductions: [] })
  })

  it('scénario enregistré → leviers ; résumé avant d’appliquer ; gains, règles et alertes en mots', () => {
    const s = { id: 's1', nom: 'B', horizon: 24, creeLe: '', ajustements: { versements: { moto: 300_000 }, datesCibles: {}, primes: [], reductions: [{ chargeId: 'courses', montant: 50_000 }] } } as unknown as ScenarioDto
    expect(depuisScenario(s, 'autre')).toMatchObject({ objectifId: 'moto', versement: '3000', reductionChargeId: 'courses', reductionMontant: '500', horizon: 24 })
    const noms = { objectifs: new Map([['moto', 'Moto']]), charges: new Map([['courses', 'Courses']]) }
    expect(resumeLeviers(s.ajustements, noms).map(espaces)).toEqual(['« Moto » : versement mensuel 3 000 DH.', '« Courses » baisse de 500 DH par mois à partir du mois prochain.'])
    expect([texteGain(2), texteGain(-1), texteGain(0), texteGain(null)]).toEqual(['2 mois plus tôt', '1 mois plus tard', 'sans changement', '—'])
    expect(texteRegle(REGLES_SCENARIOS_DEFAUT.ambitieux)).toBe('Revenus garantis, probables et incertains.')
    expect(texteRegle(REGLES_SCENARIOS_DEFAUT.prudent)).toMatch(/^Revenus garantis ; dépenses flexibles au moins égales/)
    expect(espaces(texteAlerte({ type: 'negatif', mois: '2027-02', epargne: -40_000 } as never))).toMatch(
      /^En février 2027, ton épargne passerait sous zéro \(.400 DH\) : les dépenses prévues dépassent les revenus retenus\.$/,
    )
  })

  it('graphique : réel passé, jonction « Auj. », puis les trois scénarios', () => {
    const { points } = pointsSimulation(simulation)
    expect(points.map((p) => p.periode)).toEqual(['sept.', 'Auj.', 'oct.', 'nov.'])
    expect(points[0]).toEqual({ periode: 'sept.', reel: 2_000_000 })
    expect(points[3]).toEqual({ periode: 'nov.', prudent: 2_500_000, realiste: 2_900_000, ambitieux: 3_000_000 })
  })
})

describe('Simulateur', () => {
  it('une prime relance la simulation ; la question « prime » donne l’effet par objectif ; seules les charges actives sont proposées', async () => {
    ouvrir()
    expect(await screen.findByText('Rien n’est enregistré')).toBeInTheDocument()
    expect(within(screen.getByLabelText('Réduire une charge')).queryByText(/Ancien abonnement/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Impact d’une prime ?' }))
    fireEvent.change(screen.getByLabelText('Prime en plus'), { target: { value: '5000' } })
    await waitFor(
      () =>
        expect(api.creer).toHaveBeenCalledWith('/simulations/executer', {
          ajustements: { versements: {}, datesCibles: {}, primes: [{ mois: '2026-11', montant: 500_000 }], reductions: [] },
          horizon: 12,
        }),
      { timeout: 2000 },
    )
    expect(screen.getByText('Moto : 1 mois plus tôt')).toBeInTheDocument()
  })

  it('appliquer au plan : confirmation avec résumé, puis envoi', async () => {
    ouvrir()
    fireEvent.change(await screen.findByLabelText('Prime en plus'), { target: { value: '5000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Appliquer au plan' }))
    const dialogue = await screen.findByRole('dialog')
    expect(espaces(dialogue.textContent)).toMatch(/Prime probable de 5 000 DH en novembre 2026/)
    fireEvent.click(within(dialogue).getByRole('button', { name: 'Appliquer' }))
    await waitFor(() => expect(api.creer).toHaveBeenCalledWith('/simulations/appliquer', { ajustements: expect.objectContaining({ primes: [{ mois: '2026-11', montant: 500_000 }] }) }))
  })

  it('enregistrer comme scénario, puis le rouvrir', async () => {
    scenarios = [{ id: 's1', nom: 'Versement 3 000', horizon: 24, creeLe: '', ajustements: { versements: { moto: 300_000 }, datesCibles: {}, primes: [], reductions: [] } }] as unknown as ScenarioDto[]
    ouvrir()
    fireEvent.change(await screen.findByLabelText('Prime en plus'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer comme scénario' }))
    fireEvent.change(await screen.findByLabelText('Nom du scénario'), { target: { value: 'Petite prime' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(api.creer).toHaveBeenCalledWith('/scenarios', expect.objectContaining({ nom: 'Petite prime', horizon: 12 })))

    fireEvent.click(await screen.findByRole('button', { name: 'Versement 3 000' }))
    expect(screen.getByLabelText('Versement mensuel')).toHaveValue('3000')
    expect(screen.getByRole('radio', { name: '24 mois' })).toHaveAttribute('aria-checked', 'true')
  })
})

describe('raccourci et réglages', () => {
  it('la touche S ouvre le simulateur, pas quand on écrit dans un champ', async () => {
    rendre(
      <FournisseurSaisieRapide>
        <input aria-label="Champ" />
      </FournisseurSaisieRapide>,
      { route: '/mois', compte: 'u1', autres: { '/simulateur': <p>Page du simulateur</p> } },
    )
    const champ = await screen.findByLabelText('Champ')
    await waitFor(() => expect(api.lire).toHaveBeenCalledWith('/utilisateurs'))
    fireEvent.keyDown(champ, { key: 's' })
    expect(screen.queryByText('Page du simulateur')).not.toBeInTheDocument()
    await waitFor(() => {
      fireEvent.keyDown(document.body, { key: 's' })
      expect(screen.getByText('Page du simulateur')).toBeInTheDocument()
    })
  })

  it('Réglages › Scénarios : retenir les revenus incertains en réaliste', async () => {
    rendre(<PageReglages />, { route: '/reglages', compte: 'u1' })
    const realiste = await screen.findByRole('group', { name: 'Réaliste' })
    fireEvent.click(within(realiste).getByRole('checkbox', { name: 'Revenus incertains' }))
    await waitFor(() =>
      expect(api.modifier).toHaveBeenCalledWith('/reglages', {
        reglesScenarios: { ...REGLES_SCENARIOS_DEFAUT, realiste: { revenus: ['garanti', 'probable', 'incertain'], flexibleMoyenne: false } },
      }),
    )
  })
})
