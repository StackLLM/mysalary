import { ajouterJours, lireDate as d } from '@mysalary/moteur'
import type { CalendrierMoisDto, CategorieDto, EvenementCalendrier, ObjectifsDto } from '@mysalary/partage'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { rendre } from '../../test/outils'
import { PageCalendrier } from './PageCalendrier'
import { compterParType, evenementsVue, filtrer, montantSigne, reste, statutVue, titreJour } from './saisie'

vi.mock('sonner', () => ({ toast: vi.fn() }))
vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const compte = { id: 'u1', prenom: 'Essai', devise: 'MAD', onboardingEtape: 0, onboardingTermine: false, creeLe: '2026-12-01T10:00:00.000Z', derniereOuverture: null }
const categories = [{ id: 'c-aut', libelle: 'Autre', groupe: 'flexible', icone: 'autre', ordre: 0, utilisee: false }] as unknown as CategorieDto[]
const espaces = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ')

// « Janvier 2027 » : 27 déc. → 26 janv. ; aujourd'hui : dimanche 10 janv.
const evenement = (cle: string, date: string, type: EvenementCalendrier['type'], libelle: string, montant: number, statut: EvenementCalendrier['statut'], extra: Partial<EvenementCalendrier> = {}): EvenementCalendrier => {
  const sens = type === 'paie' || type === 'revenu' ? 'entree' : 'sortie'
  const ligne = {
    cle,
    famille: type === 'paie' ? 'revenu' : type === 'charge' ? 'fixe' : type,
    libelle,
    date,
    prevu: montant,
    reel: statut === 'confirme' ? montant : null,
    ecart: null,
    statut,
    cible: type === 'paie' ? { type: 'paie', mois: '2027-01' } : type === 'charge' ? { type: 'charge', id: libelle.toLowerCase(), date, categorieId: 'c-aut' } : null,
  }
  return {
    cle,
    date,
    type,
    sens,
    libelle,
    montant,
    prevu: montant,
    reel: statut === 'confirme' ? montant : null,
    statut,
    passeNonConfirme: false,
    ligne,
    ...extra,
  } as unknown as EvenementCalendrier
}

const EVENEMENTS = [
  evenement('paie:0', '2026-12-27', 'paie', 'Salaire', 1_000_000, 'confirme'),
  evenement('fixe:loyer', '2027-01-05', 'charge', 'Loyer', 350_000, 'confirme'),
  evenement('fixe:internet', '2027-01-08', 'charge', 'Internet', 30_000, 'enRetard', { passeNonConfirme: true }),
  evenement('fixe:assurance', '2027-01-15', 'charge', 'Assurance', 120_000, 'prevu'),
  evenement('fixe:gym', '2027-01-15', 'charge', 'Gym', 20_000, 'prevu'),
  evenement('fixe:netflix', '2027-01-15', 'charge', 'Netflix', 10_000, 'prevu'),
]

const jours = Array.from({ length: 31 }, (_, i) => {
  const date = ajouterJours(d('2026-12-27'), i)
  return { date, solde: date >= '2027-01-15' ? 450_000 : 650_000, projete: date > '2027-01-10', entrees: 0, sorties: 0 }
})

const calendrier = (modif: Partial<CalendrierMoisDto> = {}) =>
  ({
    aujourdhui: '2027-01-10',
    debutSemaine: 1,
    mois: { cle: '2027-01', debut: '2026-12-27', fin: '2027-01-26', nbJours: 31, statut: 'enCours', sourceDebut: 'prevue', sourceFin: 'prevue' },
    evenements: EVENEMENTS,
    jours,
    ...modif,
  }) as unknown as CalendrierMoisDto

const objectifs = { objectifs: [{ id: 'moto', libelle: 'Moto', statut: 'actif', atteint: false, dateCible: '2027-01', estimations: { realiste: null } }] } as unknown as ObjectifsDto

let donnees = calendrier()
beforeEach(() => {
  donnees = calendrier()
  vi.mocked(api.lire).mockReset().mockImplementation(async (chemin: string) => {
    if (chemin === '/auth/session') return compte
    if (chemin === '/mois/courant') return { cle: '2027-01' }
    if (chemin === '/mois/2027-01/calendrier') return donnees
    if (chemin === '/objectifs') return objectifs
    if (chemin === '/categories') return categories
    throw new Error(`Route non simulée : ${chemin}`)
  })
  vi.mocked(api.creer).mockReset().mockResolvedValue({ id: 'nouveau' })
})

const ouvrir = (route = '/calendrier') => rendre(<PageCalendrier />, { route, compte: 'u1' })
const jour = (nom: RegExp) => screen.findByRole('button', { name: nom })

describe('règles d’affichage', () => {
  it('statut en mots, montant signé, « +N » au-delà de deux événements, infobulle du solde', () => {
    const [salaire, , internet, assurance] = evenementsVue(donnees, [])
    expect(statutVue(salaire!)).toEqual({ texte: 'Reçu', ton: 'positif' })
    expect(statutVue(internet!)).toEqual({ texte: 'En retard', ton: 'alerte' })
    expect(statutVue(assurance!)).toEqual({ texte: 'Prévu', ton: 'neutre' })
    expect(espaces(montantSigne(salaire!))).toBe('+10 000 DH')
    expect(espaces(montantSigne(assurance!))).toBe('−1 200 DH')
    expect([reste(1), reste(2), reste(3), reste(9)]).toEqual([0, 0, 1, 7])
    expect(espaces(titreJour('2027-01-15', { solde: 450_000, projete: true }, 3))).toBe('Vendredi 15 janvier 2027 : Solde projeté : 4 500 DH, 3 événements')
  })

  it('les dates d’objectifs viennent en dernier jour du mois ; filtre par type', () => {
    const tous = evenementsVue(donnees, [{ id: 'moto', libelle: 'Moto', type: 'souhaite' }])
    expect(tous.at(-1)).toMatchObject({ type: 'objectif', date: '2027-01-26', libelle: 'Moto', montant: null, sens: 'neutre' })
    expect(compterParType(tous)).toMatchObject({ paie: 1, charge: 5, objectif: 1, dette: 0 })
    expect(filtrer(tous, new Set(['charge'])).map((e) => e.type)).toEqual(['paie', 'objectif'])
    expect(montantSigne(tous.at(-1)!)).toBe('')
  })
})

describe('Calendrier (lot 17)', () => {
  it('grille du mois : jours, événements, « +1 », marqueur de retard, solde au survol', async () => {
    ouvrir()
    expect(await screen.findByText('Calendrier de janvier')).toBeInTheDocument()
    const quinze = await jour(/^Vendredi 15 janvier 2027/)
    expect(espaces(quinze.getAttribute('aria-label'))).toBe('Vendredi 15 janvier 2027 : Solde projeté : 4 500 DH, 3 événements')
    // Deux événements visibles, le troisième dans la pastille « +1 ».
    expect(within(quinze).getByText('Assurance')).toBeInTheDocument()
    expect(within(quinze).getByText('Gym')).toBeInTheDocument()
    expect(within(quinze).queryByText('Netflix')).not.toBeInTheDocument()
    expect(within(quinze).getByText('+1')).toBeInTheDocument()
    expect(espaces(quinze.textContent)).toContain('Solde projeté : 4 500 DH')
    // Internet (8 janv.) : passé et pas payé.
    expect(espaces((await jour(/^Vendredi 8 janvier 2027/)).getAttribute('aria-label'))).toContain('Solde : 6 500 DH')
    // Le salaire du 27 déc. est dans la grille du mois budgétaire.
    expect(await jour(/^Dimanche 27 décembre 2026/)).toBeInTheDocument()
  })

  it('le jour s’ouvre : détail, statut, confirmation sur place', async () => {
    ouvrir()
    fireEvent.click(await jour(/^Vendredi 15 janvier 2027/))
    const fenetre = await screen.findByRole('dialog', { name: 'Vendredi 15 janvier 2027' })
    expect(espaces(fenetre.textContent)).toContain('Solde projeté : 4 500 DH')
    const liste = within(fenetre).getByRole('list', { name: 'Événements du jour' })
    expect(within(liste).getAllByRole('listitem')).toHaveLength(3)
    fireEvent.click(within(fenetre).getByRole('button', { name: 'Marquer Assurance payé' }))
    await waitFor(() =>
      expect(api.creer).toHaveBeenCalledWith('/depenses', expect.objectContaining({ montant: 120_000, chargeId: 'assurance', echeance: '2027-01-15', date: '2027-01-10' })),
    )
    expect(within(fenetre).getByRole('link', { name: 'Modifier dans Mon plan : Assurance' })).toHaveAttribute('href', '/plan?onglet=charges')
  })

  it('un événement passé pas confirmé le dit en mots', async () => {
    ouvrir()
    fireEvent.click(await jour(/^Vendredi 8 janvier 2027/))
    const fenetre = await screen.findByRole('dialog', { name: 'Vendredi 8 janvier 2027' })
    expect(espaces(fenetre.textContent)).toContain('En retard · pas encore confirmé')
    expect(espaces(fenetre.textContent)).toContain('Prévu : 300 DH · Réel : pas encore')
  })

  it('le salaire se confirme dans Mon plan ; les objectifs apparaissent au dernier jour du mois', async () => {
    donnees = calendrier({ evenements: [evenement('paie:0', '2027-01-27', 'paie', 'Salaire', 1_000_000, 'prevu')] })
    ouvrir()
    fireEvent.click(await jour(/^Mardi 26 janvier 2027/))
    const fenetre = await screen.findByRole('dialog', { name: 'Mardi 26 janvier 2027' })
    expect(within(fenetre).getByText('Moto : date souhaitée')).toBeInTheDocument()
    expect(within(fenetre).getByRole('link', { name: 'Ouvrir l’objectif : Moto' })).toHaveAttribute('href', '/objectifs/moto')
  })

  it('filtre par type : masque les événements, garde les autres', async () => {
    ouvrir()
    const quinze = await jour(/^Vendredi 15 janvier 2027/)
    expect(within(quinze).getByText('Assurance')).toBeInTheDocument()
    const filtres = screen.getByRole('group', { name: 'Filtrer par type' })
    fireEvent.click(within(filtres).getByRole('button', { name: /Charges fixes/ }))
    expect(within(filtres).getByRole('button', { name: /Charges fixes/ })).toHaveAttribute('aria-pressed', 'false')
    expect(within(await jour(/^Vendredi 15 janvier 2027/)).queryByText('Assurance')).not.toBeInTheDocument()
    expect(screen.getByText('Salaire')).toBeInTheDocument()
  })

  it('vue liste : événements du mois jour par jour avec le solde du jour', async () => {
    ouvrir('/calendrier?vue=liste')
    const liste = await screen.findByRole('list', { name: 'Événements du mois' })
    // Quatre jours d'événements, plus la date de l'objectif Moto au dernier jour.
    expect(within(liste).getAllByRole('listitem')).toHaveLength(5)
    const texte = espaces(liste.textContent)
    expect(texte).toContain('Vendredi 15 janvier 2027')
    expect(texte).toContain('Solde projeté : 4 500 DH')
    expect(texte).toMatch(/ChargeInternet.*En retard.*−300 DH/)
    expect(screen.getByRole('radio', { name: 'Liste' })).toHaveAttribute('aria-checked', 'true')
  })

  it('ajoute un ponctuel daté, à la date du jour choisi', async () => {
    ouvrir()
    fireEvent.click(await jour(/^Mercredi 20 janvier 2027/))
    const fenetre = await screen.findByRole('dialog', { name: 'Mercredi 20 janvier 2027' })
    expect(within(fenetre).getByText('Aucun événement prévu ce jour-là.')).toBeInTheDocument()
    fireEvent.click(within(fenetre).getByRole('button', { name: /Ajouter un ponctuel ce jour/ }))
    const panneau = await screen.findByRole('dialog', { name: 'Ajouter un ponctuel' })
    expect(within(panneau).getByLabelText('Date')).toHaveValue('2027-01-20')
    fireEvent.change(within(panneau).getByLabelText('Libellé'), { target: { value: 'Permis' } })
    await waitFor(() => expect(within(panneau).getByRole('option', { name: 'Autre' })).toBeInTheDocument())
    fireEvent.change(within(panneau).getByLabelText('Catégorie'), { target: { value: 'c-aut' } })
    fireEvent.change(within(panneau).getByLabelText('Montant'), { target: { value: '1000' } })
    fireEvent.click(within(panneau).getByRole('button', { name: 'Ajouter ce ponctuel' }))
    await waitFor(() => expect(api.creer).toHaveBeenCalledWith('/ponctuels', { libelle: 'Permis', categorieId: 'c-aut', montant: 100_000, date: '2027-01-20', certitude: 'garanti' }))
  })

  it('mois sans événement : état vide ; erreur : « Réessayer »', async () => {
    donnees = calendrier({ evenements: [] })
    vi.mocked(api.lire).mockImplementation(async (chemin: string) => (chemin === '/objectifs' ? { objectifs: [] } : chemin === '/mois/2027-01/calendrier' ? donnees : chemin === '/mois/courant' ? { cle: '2027-01' } : compte))
    const { unmount } = ouvrir()
    expect(await screen.findByText('Aucun événement prévu sur ce mois.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ouvrir Mon plan' })).toHaveAttribute('href', '/plan')
    unmount()

    vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
      if (chemin === '/auth/session') return compte
      throw new Error('panne')
    })
    ouvrir()
    expect(await screen.findByText('Impossible de charger le calendrier.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})
