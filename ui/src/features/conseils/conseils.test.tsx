import { redigerAlerte, redigerRecommandation, type Alerte, type ConseilsDto, type IndicateursDto, type Recommandation } from '@mysalary/partage'
import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { rendre } from '../../test/outils'
import { depuisAdresse } from '../simulateur/saisie'
import { CarteIndicateurs, Cloche } from './Conseils'
import { lignesIndicateurs, pourcentage, texteEcart, texteRetard } from './saisie'

vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const compte = { id: 'u1', prenom: 'Essai', devise: 'MAD', onboardingEtape: 0, onboardingTermine: false, creeLe: '2027-01-01T10:00:00.000Z', derniereOuverture: null }
const espaces = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ')

const conseils = {
  aujourdhui: '2027-01-10',
  alertes: [
    { cle: 'internet', type: 'echeanceEnRetard', origine: 'fixe', id: 'i', libelle: 'Internet', date: '2027-01-08', reste: 30_000, mois: '2027-01' },
    { cle: 'courses', type: 'enveloppeDepassee', id: 'c', libelle: 'Courses', budget: 200_000, depassement: 30_000, mois: '2027-01' },
  ].map((a) => redigerAlerte(a as unknown as Alerte)),
  recommandations: [
    { cle: 'r', type: 'reduction', confiance: 'moyenne', objectifId: 'moto', libelle: 'Moto', chargeId: 'l', charge: 'Loisirs', budget: 150_000, montant: 20_000, avant: '2028-11', apres: '2028-10', gainMois: 1 },
  ].map((r) => redigerRecommandation(r as unknown as Recommandation)),
} as ConseilsDto

const indicateurs = {
  aujourdhui: '2027-01-10',
  mois: { cle: '2027-01', statut: 'enCours' },
  resteADepenser: { montant: 290_000, nature: 'reel', revenus: 1_000_000, sorties: 580_000, engagements: 30_000, epargneRestante: 100_000, joursRestants: 17, parJour: 17_058 },
  resteSemaine: { numero: 3, debut: '2027-01-04', fin: '2027-01-10', disponible: 79_000, depense: 230_000, reste: -151_000, joursRestants: 1, parJour: 0 },
  tauxEpargne: { reel: 0, prevu: 0.1, epargneReelle: 0, epargnePrevue: 100_000, revenusReels: 1_000_000, revenusPrevus: 1_000_000 },
  tauxCharges: { reel: 0.58, prevu: 0.73, sortiesReelles: 580_000, chargesPrevues: 730_000, revenusReels: 1_000_000, revenusPrevus: 1_000_000 },
  ecart: { montant: 30_600, pourcentage: 0.0557, prevu: 549_400, reel: 580_000, base: 'aDate' },
  partVariable: { part: 16_000 / 136_000, variable: 1_600_000, total: 13_600_000, du: '2027-01', au: '2027-12' },
  objectif: { id: 'moto', libelle: 'Moto', epargne: 200_000, montantCible: 8_500_000, progression: 200_000 / 8_500_000, dateCible: '2027-12', dateEstimee: '2028-11', retardMois: 11 },
} as unknown as IndicateursDto

beforeEach(() => {
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/utilisateurs') return [compte]
    if (chemin === '/recommandations') return conseils
    if (chemin === '/indicateurs?mois=2027-01') return indicateurs
    throw new Error(`Route non simulée : ${chemin}`)
  })
})

describe('règles d’affichage des indicateurs', () => {
  it('pourcentages arrondis, « — » sans revenu ; écart signé ; retard d’un objectif', () => {
    expect([pourcentage(0.583), pourcentage(null), pourcentage(0)].map(espaces)).toEqual(['58 %', '—', '0 %'])
    expect(espaces(texteEcart(30_600, 0.0557))).toBe('+306 DH (+6 %)')
    expect(espaces(texteEcart(-150_000, -0.205))).toBe('−1 500 DH (−21 %)')
    expect(texteRetard({ dateCible: '2027-12', retardMois: 11 } as never)).toBe('projection · 11 mois après la date souhaitée')
    expect(texteRetard({ dateCible: null, retardMois: null } as never)).toBe('projection · sans date souhaitée')
  })

  it('les huit KPI dans l’ordre des questions, chacun avec sa base de calcul', () => {
    const lignes = lignesIndicateurs(indicateurs)
    expect(lignes.map((l) => l.cle)).toEqual(['reste', 'semaine', 'epargne', 'charges', 'ecart', 'variable', 'progression', 'delai'])
    expect(espaces(lignes[0]!.detail)).toBe('170,58 DH par jour · 17 jours restants')
    expect(lignes[1]!.ton).toBe('alerte')
    expect(espaces(lignes[4]!.base)).toBe('Sorties réelles à ce jour (5 800 DH) − prévu cumulé à ce jour (5 494 DH).')
    expect(lignes[7]).toMatchObject({ valeur: 'novembre 2028', ton: 'alerte' })
  })
})

describe('Cloche', () => {
  it('pastille = nombre d’alertes ; le panneau montre « À faire » puis « Suggestions », avec la base de calcul à la demande', async () => {
    rendre(<Cloche />, { route: '/mois', compte: 'u1' })
    fireEvent.click(await screen.findByRole('button', { name: 'Notifications : 2 alertes' }))
    const panneau = await screen.findByRole('dialog', { name: 'Notifications' })
    const aFaire = within(panneau).getByRole('list', { name: 'À faire' })
    expect(within(aFaire).getAllByRole('listitem').map((li) => espaces(li.querySelector('p')?.textContent))).toEqual(['« Internet » pas encore payé', 'Enveloppe « Courses » dépassée'])
    expect(within(aFaire).getByRole('link', { name: 'Ouvrir le mois' })).toHaveAttribute('href', '/mois?mois=2027-01')

    const suggestions = within(panneau).getByRole('list', { name: 'Suggestions' })
    expect(espaces(suggestions.textContent)).toContain('Réduire « Loisirs » de 200 DH par mois avancerait « Moto » d’environ 1 mois')
    expect(within(suggestions).queryByText(/Condition/)).not.toBeInTheDocument()
    fireEvent.click(within(suggestions).getByRole('button', { name: 'Sur quoi repose ce calcul ?' }))
    expect(espaces(suggestions.textContent)).toContain('Condition : Si tes revenus et tes dépenses restent conformes au plan.')
    expect(espaces(suggestions.textContent)).toContain('Confiance moyenne : Repose sur une projection de ton plan')
    expect(within(suggestions).getByRole('link', { name: 'Simuler' })).toHaveAttribute('href', '/simulateur?objectif=moto&reduction=l&montant=200')
  })

  it('sans alerte ni suggestion : pas de pastille, un message calme', async () => {
    vi.mocked(api.lire).mockImplementation(async (chemin: string) => (chemin === '/utilisateurs' ? [compte] : { aujourdhui: '2027-01-10', alertes: [], recommandations: [] }))
    rendre(<Cloche />, { route: '/mois', compte: 'u1' })
    fireEvent.click(await screen.findByRole('button', { name: 'Notifications' }))
    expect(await screen.findByText('Rien à signaler : tout ce qui était prévu est à jour.')).toBeInTheDocument()
  })
})

describe('carte Indicateurs et simulateur pré-rempli', () => {
  it('affiche chaque KPI ; « Sur quoi reposent ces calculs ? » déplie les bases', async () => {
    rendre(<CarteIndicateurs cle="2027-01" />, { route: '/mois', compte: 'u1' })
    expect(await screen.findByText('Reste à dépenser')).toBeInTheDocument()
    expect(espaces(screen.getByText('Taux de charges').closest('div')!.textContent)).toBe('Taux de chargesprévu 73 %58 %')
    fireEvent.click(screen.getByRole('button', { name: 'Sur quoi reposent ces calculs ?' }))
    expect(espaces(screen.getByRole('list', { name: 'Bases de calcul' }).textContent)).toContain('Part variable du revenu : Primes et revenus variables (16 000 DH)')
  })

  it('« Simuler » depuis une suggestion règle l’objectif et la réduction', () => {
    expect(depuisAdresse(new URLSearchParams('objectif=moto&reduction=l&montant=200'))).toMatchObject({ objectifId: 'moto', reductionChargeId: 'l', reductionMontant: '200' })
    expect(depuisAdresse(new URLSearchParams('objectif=moto&montant=200'))).toMatchObject({ reductionChargeId: '', reductionMontant: '' })
  })
})
