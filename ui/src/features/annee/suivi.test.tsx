import type { MoisAnnuel, ProgressionAnnuelle, SuiviAnnuelDto } from '@mysalary/partage'

/** Les montants de test sont des nombres : le type « Centimes » est réservé au moteur. */
type Nombres<T> = { [K in keyof T]: T[K] extends number ? number : T[K] extends number | null ? number | null : T[K] extends object ? Nombres<T[K]> : T[K] }
import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { rendre } from '../../test/outils'
import { PageAnnee } from './PageAnnee'
import { barreObjectifAnnee, phraseObjectifAnnee, phrasePartVariable, pointsAnnee } from './saisie'

vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const compte = { id: 'u1', prenom: 'Essai', devise: 'MAD', onboardingEtape: 0, onboardingTermine: false, creeLe: '2026-10-01T10:00:00.000Z', derniereOuverture: null }
const espaces = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ')

const zero = { revenus: 0, charges: 0, epargne: 0 }
const mois = (cle: string, nature: MoisAnnuel['nature'], modif: Partial<Nombres<MoisAnnuel>> = {}): MoisAnnuel =>
  ({ cle, statut: 'aVenir', nature, revenus: 1_000_000, charges: 560_000, epargne: 100_000, reel: zero, epargneCumulee: 0, ...modif }) as unknown as MoisAnnuel

// Octobre 2026 en cours : septembre est réel, les mois d'avant n'ont pas de données.
const moisDe2026: MoisAnnuel[] = [
  ...['01', '02', '03', '04', '05', '06', '07', '08'].map((m) => mois(`2026-${m}`, 'avant', { statut: 'passe', revenus: 0, charges: 0, epargne: 0 })),
  mois('2026-09', 'reel', { statut: 'passe', charges: 510_000, epargne: 0, reel: { revenus: 1_000_000, charges: 510_000, epargne: 0 }, epargneCumulee: 0 }),
  mois('2026-10', 'enCours', { statut: 'enCours', charges: 680_000, reel: { revenus: 1_000_000, charges: 440_000, epargne: 0 }, epargneCumulee: 100_000 }),
  mois('2026-11', 'prevu', { epargneCumulee: 200_000 }),
  mois('2026-12', 'prevu', { charges: 600_000, epargneCumulee: 300_000 }),
]
const objectif = { id: 'moto', libelle: 'Moto', statut: 'actif', montantCible: 3_000_000, debut: 200_000, reelADate: 400_000, fin: null, finProjetee: 1_000_000, atteint: false } as unknown as ProgressionAnnuelle

const suivi = (modif: Partial<SuiviAnnuelDto> = {}) =>
  ({
    aujourdhui: '2026-10-10',
    annee: 2026,
    etat: 'enCours',
    mois: moisDe2026,
    revenus: { reel: 2_000_000, projete: 2_000_000, total: 4_000_000 },
    charges: { reel: 950_000, projete: 1_840_000, total: 2_790_000 },
    epargne: { reel: 0, projete: 300_000, total: 300_000 },
    couteux: [
      { cle: '2026-10', charges: 680_000, nature: 'enCours' },
      { cle: '2026-12', charges: 600_000, nature: 'prevu' },
      { cle: '2026-11', charges: 560_000, nature: 'prevu' },
    ],
    partVariable: { part: 0.12, variable: 480_000, total: 4_000_000, du: '2026-01', au: '2026-12' },
    epargneCumulee: 300_000,
    sansDonnees: 8,
    objectifs: [objectif],
    ...modif,
  }) as unknown as SuiviAnnuelDto

let donnees = suivi()
beforeEach(() => {
  donnees = suivi()
  vi.mocked(api.lire).mockReset().mockImplementation(async (chemin: string) => {
    if (chemin === '/utilisateurs') return [compte]
    if (chemin === '/mois/courant') return { cle: '2026-10' }
    if (chemin.startsWith('/annee/') && chemin.endsWith('/suivi')) return { ...donnees, annee: Number(chemin.split('/')[2]) }
    throw new Error(`Route non simulée : ${chemin}`)
  })
})

const ouvrir = (route = '/annee') => rendre(<PageAnnee />, { route, compte: 'u1' })

describe('règles d’affichage', () => {
  it('points du graphique : mois avant le suivi sans barre ; plein pour le réel seulement', () => {
    const points = pointsAnnee(moisDe2026)
    expect(points).toHaveLength(12)
    expect(points[0]).toMatchObject({ periode: 'janv.', reel: false, nature: 'Avant le suivi', revenus: 0 })
    expect(points[8]).toMatchObject({ periode: 'sept.', reel: true, nature: 'Réel', depenses: 510_000 })
    expect(points[9]).toMatchObject({ reel: false, nature: 'En cours' })
  })

  it('barre d’un objectif : réel plein, projection hachurée ; phrases', () => {
    expect(barreObjectifAnnee(objectif)).toEqual({ reel: 400_000 / 3_000_000, projection: 1_000_000 / 3_000_000 - 400_000 / 3_000_000 })
    expect(espaces(phraseObjectifAnnee(objectif, 'enCours'))).toBe('De 2 000 DH en début d’année, 10 000 DH (projeté) en fin d’année. 4 000 DH aujourd’hui.')
    const passee = { ...objectif, reelADate: 900_000, fin: 900_000, finProjetee: null } as unknown as ProgressionAnnuelle
    expect(espaces(phraseObjectifAnnee(passee, 'passee'))).toBe('De 2 000 DH en début d’année à 9 000 DH en fin d’année.')
    expect(barreObjectifAnnee(passee)).toEqual({ reel: 0.3, projection: 0 })
    expect(espaces(phraseObjectifAnnee({ ...objectif, finProjetee: null }, 'enCours'))).toContain('au-delà de la projection')
    expect(espaces(phrasePartVariable({ part: 0.12, variable: 480_000, total: 4_000_000 }))).toBe('12 % de tes revenus de l’année sont des primes ou des revenus variables (4 800 DH sur 40 000 DH).')
    expect(phrasePartVariable({ part: null, variable: 0, total: 0 })).toBe('Aucun revenu prévu sur cette année.')
  })
})

describe('Année (lot 18)', () => {
  it('totaux : le réel à date et le projeté restant sont séparés ; mois coûteux ; part variable ; épargne cumulée', async () => {
    ouvrir()
    expect(await screen.findByText('Année 2026')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Année en cours.')
    const revenus = screen.getByText('Revenus', { selector: 'p' }).closest('div')!
    expect(espaces(revenus.textContent)).toContain('Réel à date20 000 DH')
    expect(espaces(revenus.textContent)).toContain('Projeté restant20 000 DH')
    expect(espaces(screen.getByText('Dépenses', { selector: 'p' }).closest('div')!.textContent)).toContain('Réel à date9 500 DH')

    const couteux = screen.getByRole('region', { name: 'Mois les plus coûteux' })
    const lignes = within(couteux).getAllByRole('link')
    expect(lignes).toHaveLength(3)
    expect(espaces(lignes[0]!.textContent)).toContain('Octobre 2026')
    expect(espaces(lignes[0]!.textContent)).toContain('en cours')
    expect(lignes[0]).toHaveAttribute('href', '/mois?mois=2026-10')

    expect(screen.getByText(/12 % de tes revenus/)).toBeInTheDocument()
    expect(espaces(screen.getByRole('region', { name: 'Part variable et épargne cumulée' }).textContent)).toContain('3 000 DH sur l’année, réel à date puis prévu.')
  })

  it('les douze mois : un clic ouvre le mois ; mois sans données grisés et expliqués', async () => {
    ouvrir()
    const grille = await screen.findByRole('region', { name: 'Les douze mois' })
    expect(within(grille).getAllByRole('link')).toHaveLength(12)
    expect(within(grille).getByRole('link', { name: 'Ouvrir Septembre 2026' })).toHaveAttribute('href', '/mois?mois=2026-09')
    expect(espaces(within(grille).getByRole('link', { name: 'Ouvrir Janvier 2026' }).textContent)).toContain('Pas de données avant ton inscription')
    expect(espaces(within(grille).getByRole('link', { name: 'Ouvrir Décembre 2026' }).textContent)).toContain('Prévu')
    expect(screen.getByRole('figure', { name: /mois par mois/ })).toBeInTheDocument()
  })

  it('progression d’un objectif sur l’année, avec lien', async () => {
    ouvrir()
    const section = await screen.findByRole('region', { name: 'Objectifs sur l’année' })
    expect(within(section).getByRole('link', { name: 'Ouvrir l’objectif Moto' })).toHaveAttribute('href', '/objectifs/moto')
    expect(espaces(section.textContent)).toContain('Cible 30 000 DH')
    expect(within(section).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '13')
  })

  it('année future : bandeau « Projection », rien de réel', async () => {
    donnees = suivi({ etat: 'future', revenus: { reel: 0, projete: 12_000_000, total: 12_000_000 }, objectifs: [] } as unknown as Partial<SuiviAnnuelDto>)
    ouvrir('/annee?annee=2028')
    expect(await screen.findByText('Année 2028')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Projection. Cette année n’a pas commencé')
    const revenus = screen.getByText('Revenus', { selector: 'p' }).closest('div')!
    expect(espaces(revenus.textContent)).toContain('Projeté120 000 DH')
    expect(revenus.textContent).not.toContain('Réel')
    expect(screen.getByText('Aucun objectif à suivre cette année.')).toBeInTheDocument()
  })

  it('aucun mois suivi : « Pas de données avant ton inscription » ; navigation d’année ; vue calendrier', async () => {
    donnees = suivi({ sansDonnees: 12, etat: 'passee' } as unknown as Partial<SuiviAnnuelDto>)
    ouvrir()
    expect(await screen.findByText('Pas de données avant ton inscription.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Année 2025' }))
    expect(await screen.findByText('Année 2025')).toBeInTheDocument()
  })

  it('erreur de chargement : « Réessayer »', async () => {
    vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
      if (chemin === '/utilisateurs') return [compte]
      if (chemin === '/mois/courant') return { cle: '2026-10' }
      throw new Error('panne')
    })
    ouvrir()
    expect(await screen.findByText('Impossible de charger l’année.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})
