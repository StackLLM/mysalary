import { redigerAlerte, redigerRecommandation, type Alerte, type AujourdhuiDto, type PaieDto, type Recommandation } from '@mysalary/partage'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { rendre } from '../../test/outils'
import { FournisseurSaisieRapide } from '../depenses/SaisieRapide'
import { PageAujourdhui } from './PageAujourdhui'
import { groupesJours, phraseSemainePassee, statutEvenement } from './saisie'

vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const compte = { id: 'u1', prenom: 'Oussama', devise: 'MAD', onboardingEtape: 0, onboardingTermine: false, creeLe: '2027-01-01T10:00:00.000Z', derniereOuverture: null }
const espaces = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ')
/** Texte vu à l'écran : sans les copies réservées aux lecteurs d'écran. */
function visible(element: Element) {
  const copie = element.cloneNode(true) as Element
  copie.querySelectorAll('.sr-only').forEach((n) => n.remove())
  return espaces(copie.textContent)
}

// Lundi 11 janv. 2027, mois « janvier » (27 déc. → 26 janv.).
const paieFevrier = {
  mois: '2027-02',
  versionId: 'v1',
  statut: 'prevue',
  datePrevue: '2027-01-11',
  dateReelle: null,
  debutMois: '2027-01-11',
  sourceDebut: 'prevue',
  joursDeRetard: 0,
  lignes: [{ id: null, type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: 1_000_000, montantRecu: null }],
  totalPrevu: 1_000_000,
  totalRecu: null,
  ecart: null,
} as unknown as PaieDto

const journee = (modif: Partial<AujourdhuiDto> = {}) =>
  ({
    aujourdhui: '2027-01-11',
    sansContrat: false,
    indicateurs: {
      mois: { cle: '2027-01', debut: '2026-12-27', fin: '2027-01-26', statut: 'enCours' },
      resteADepenser: { montant: 290_000, nature: 'reel', revenus: 1_000_000, sorties: 580_000, engagements: 30_000, epargneRestante: 100_000, joursRestants: 16, parJour: 18_125 },
      resteSemaine: { numero: 4, debut: '2027-01-11', fin: '2027-01-17', disponible: 70_000, depense: 10_000, reste: 60_000, joursRestants: 7, parJour: 8_571 },
      tauxEpargne: { reel: 0.05, prevu: 0.1, epargneReelle: 50_000, epargnePrevue: 100_000, revenusReels: 1_000_000, revenusPrevus: 1_000_000 },
      objectif: { id: 'moto', libelle: 'Moto', epargne: 200_000, montantCible: 3_000_000, progression: 200_000 / 3_000_000, dateCible: '2027-06', dateEstimee: '2027-05', retardMois: -1 },
    },
    alertes: [
      { cle: 'paie:2027-02', type: 'paieAujourdhui', mois: '2027-02', montant: 1_000_000 },
      { cle: 'internet', type: 'echeanceEnRetard', origine: 'fixe', id: 'i', libelle: 'Internet', date: '2027-01-08', reste: 30_000, mois: '2027-01' },
    ].map((a) => redigerAlerte(a as unknown as Alerte)),
    recommandations: [{ cle: 'r', type: 'disponible', confiance: 'elevee', objectifId: 'moto', libelle: 'Moto', montant: 50_000, avant: '2027-05', apres: '2027-04', gainMois: 1 }].map((r) =>
      redigerRecommandation(r as unknown as Recommandation),
    ),
    prochainsJours: [
      { date: '2027-01-11', type: 'revenu', libelle: 'Salaire', montant: 1_000_000, statut: 'prevu' },
      { date: '2027-01-12', type: 'charge', libelle: 'Assurance', montant: 120_000, statut: 'prevu' },
      { date: '2027-01-15', type: 'charge', libelle: 'Internet', montant: 25_000, statut: 'confirme' },
    ],
    semainePassee: { numero: 3, debut: '2027-01-04', fin: '2027-01-10', disponible: 70_000, depense: 30_000, reste: 40_000 },
    ...modif,
  }) as unknown as AujourdhuiDto

let donnees = journee()

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2027-01-11T10:00:00'))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => {
  donnees = journee()
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/utilisateurs') return [compte]
    if (chemin === '/aujourdhui') return donnees
    if (chemin === '/salaire/paies?du=2027-02&au=2027-02') return { aujourdhui: '2027-01-11', paies: [paieFevrier] }
    if (chemin === '/categories') return []
    throw new Error(`Route non simulée : ${chemin}`)
  })
})

const ouvrir = () =>
  rendre(
    <FournisseurSaisieRapide>
      <PageAujourdhui />
    </FournisseurSaisieRapide>,
    { route: '/', compte: 'u1' },
  )

describe('règles d’affichage de la journée', () => {
  it('7 prochains jours groupés (Aujourd’hui, Demain, date) ; statut en mots ; semaine passée en une phrase', () => {
    expect(groupesJours(journee().prochainsJours, '2027-01-11').map((g) => [g.libelle, g.evenements.length])).toEqual([
      ['Aujourd’hui', 1],
      ['Demain', 1],
      ['Vendredi 15 janvier', 1],
    ])
    expect(statutEvenement({ type: 'revenu', statut: 'confirme' })).toEqual({ texte: 'Reçu', ton: 'positif' })
    expect(statutEvenement({ type: 'charge', statut: 'enRetard' })).toEqual({ texte: 'En retard', ton: 'alerte' })
    expect(espaces(phraseSemainePassee({ depense: 30_000, disponible: 70_000, reste: 40_000 }).texte)).toBe('300 DH dépensés sur 700 DH : 400 DH de côté.')
    expect(phraseSemainePassee({ depense: 80_000, disponible: 70_000, reste: -10_000 })).toMatchObject({ ton: 'alerte' })
  })
})

describe('Aujourd’hui', () => {
  it('reste du mois et de la semaine, semaine passée, à faire, 7 prochains jours, épargne, objectif, suggestion', async () => {
    ouvrir()
    expect(await screen.findByText('Bonjour Oussama')).toBeInTheDocument()
    expect(screen.getByText('Lundi 11 janvier 2027', { selector: 'div' })).toBeInTheDocument()
    // Le montant du héros est un compteur animé : on attend sa valeur finale.
    await waitFor(() => expect(visible(screen.getByText('Reste à dépenser ce mois').closest('section')!)).toContain('2 900DHPar jour : 181,25DHJours restants : 16'))
    expect(visible(screen.getByText('Cette semaine').closest('div')!)).toContain('600DHPar jour : 85,71DHJours restants : 7')
    expect(espaces(screen.getByRole('region', { name: 'Semaine passée' }).textContent)).toContain('300 DH dépensés sur 700 DH : 400 DH de côté.')

    const aFaire = screen.getByRole('region', { name: 'À faire' })
    expect(within(aFaire).getByText('Paie prévue aujourd’hui')).toBeInTheDocument()
    expect(within(aFaire).getByRole('link', { name: 'Ouvrir le mois' })).toHaveAttribute('href', '/mois?mois=2027-01')

    const jours = screen.getByRole('region', { name: '7 prochains jours' })
    expect(visible(jours)).toContain('Aujourd’huiSalairePrévu+10 000DHDemainAssurancePrévu−1 200DH')
    expect(within(jours).getByRole('link', { name: 'Ouvrir le calendrier' })).toHaveAttribute('href', '/calendrier')

    expect(visible(screen.getByText('Épargne du mois').closest('section')!)).toContain('500DHsur 1 000DH prévus')
    expect(screen.getByRole('link', { name: 'Ouvrir l’objectif' })).toHaveAttribute('href', '/objectifs/moto')
    expect(screen.getByText('Suggestions')).toBeInTheDocument()
  })

  it('« Confirmer la paie » ouvre la réception de la paie ici même', async () => {
    ouvrir()
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmer la paie' }))
    const panneau = await screen.findByRole('dialog', { name: 'Paie de février 2027' })
    expect(within(panneau).getByRole('button', { name: 'Confirmer' })).toBeInTheDocument()
  })

  it('reste négatif : montant et phrase d’alerte', async () => {
    const base = journee()
    donnees = { ...base, indicateurs: { ...base.indicateurs, resteADepenser: { ...base.indicateurs.resteADepenser!, montant: -50_000, parJour: 0 } } } as unknown as AujourdhuiDto
    ouvrir()
    expect(await screen.findByText(/Le mois est dépassé de 500/)).toBeInTheDocument()
  })

  it('sans salaire : état vide qui mène à Mon plan', async () => {
    donnees = journee({ sansContrat: true })
    ouvrir()
    expect(await screen.findByText('Ajoute ton salaire pour voir ton reste du mois.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ajouter mon salaire' })).toHaveAttribute('href', '/plan')
  })

  it('erreur de chargement : message et « Réessayer »', async () => {
    vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
      if (chemin === '/utilisateurs') return [compte]
      throw new Error('panne')
    })
    ouvrir()
    expect(await screen.findByText('Impossible de charger ta journée.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})
