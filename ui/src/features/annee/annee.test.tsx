import type { BilanDto, CumulDto, MoisCumul, ObjectifsDto, SuiviObjectif } from '@mysalary/partage'
import { fireEvent, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { rendre } from '../../test/outils'
import { PageObjectifs } from '../objectifs/PageObjectifs'
import { CalendrierAnnee } from './CalendrierAnnee'
import { jalonsDuMois, jauge, montantLigne, moisCourt } from './saisie'

vi.mock('../../lib/api', async (original) => ({
  ...(await original<typeof import('../../lib/api')>()),
  api: { lire: vi.fn(), creer: vi.fn(), modifier: vi.fn(), supprimer: vi.fn() },
}))

const compte = { id: 'u1', prenom: 'Essai', devise: 'MAD', onboardingEtape: 0, onboardingTermine: false, creeLe: '2026-10-01T10:00:00.000Z', derniereOuverture: null }
const espaces = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ')
/** Texte vu à l'écran : sans les copies réservées aux lecteurs d'écran. */
function visible(element: Element) {
  const copie = element.cloneNode(true) as Element
  copie.querySelectorAll('.sr-only').forEach((n) => n.remove())
  return espaces(copie.textContent)
}

// Salaire 10 000 DH le 27 ; suivi depuis septembre 2026 ; aujourd'hui : 10 oct. 2026.
const mois = (cle: string, modif: Record<string, unknown>): MoisCumul =>
  ({ cle, debut: `${cle}-01`, fin: `${cle}-28`, statut: 'aVenir', nature: 'prevu', premier: false, report: 0, revenus: 1_000_000, charges: 560_000, epargne: 100_000, reste: 340_000, cumul: 0, dontReel: null, ...modif }) as unknown as MoisCumul

const avant = (cle: string) => mois(cle, { statut: 'passe', nature: 'avant', report: null, cumul: null, revenus: 0, charges: 0, epargne: 0, reste: 0 })
const annee2026: MoisCumul[] = [
  ...['01', '02', '03', '04', '05', '06', '07', '08'].map((m) => avant(`2026-${m}`)),
  mois('2026-09', { statut: 'passe', nature: 'reel', premier: true, report: 0, charges: 510_000, epargne: 0, reste: 490_000, cumul: 490_000 }),
  mois('2026-10', { statut: 'enCours', nature: 'enCours', report: 490_000, charges: 680_000, reste: 220_000, cumul: 710_000, dontReel: { revenus: 1_000_000, charges: 440_000, epargne: 0 } }),
  mois('2026-11', { report: 710_000, cumul: 1_050_000 }),
  mois('2026-12', { report: 1_050_000, cumul: 1_390_000 }),
]
const cumul2026 = {
  aujourdhui: '2026-10-10',
  debut: '2026-09',
  depart: null,
  mois: annee2026,
  resume: { revenus: 4_000_000, charges: 2_310_000, epargne: 300_000, reste: 1_390_000, cumulFin: 1_390_000, plusBas: { cle: '2026-09', cumul: 490_000 }, negatifs: [], natures: { reel: 1, enCours: 1, prevu: 2 } },
} as unknown as CumulDto

const objectif = (modif: Record<string, unknown>) =>
  ({ id: 'moto', libelle: 'Moto', statut: 'actif', atteint: false, dateCible: '2027-06', estimations: { prudent: '2027-08', realiste: '2026-12', ambitieux: '2026-11' }, ...modif }) as unknown as SuiviObjectif
const objectifs = { objectifs: [objectif({}), objectif({ id: 'voyage', libelle: 'Voyage', dateCible: '2026-11', estimations: null })] } as unknown as ObjectifsDto

const ligne = (cle: string, famille: string, libelle: string, prevu: number | null, reel: number | null, statut = 'prevu', date: string | null = null) =>
  ({ cle, famille, libelle, date, prevu, reel, ecart: null, statut, cible: null })
const bilan = (cle: string, lignes: unknown[]) => ({ mois: { cle }, lignes }) as unknown as BilanDto

beforeEach(() => {
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/utilisateurs') return [compte]
    if (chemin === '/mois/courant') return { cle: '2026-10' }
    if (chemin === '/objectifs') return objectifs
    if (chemin === '/cumul?du=2026-01&au=2026-12') return cumul2026
    if (chemin === '/mois/2026-10/bilan')
      return bilan('2026-10', [
        ligne('s', 'revenu', 'Salaire', 1_000_000, 1_000_000, 'confirme', '2026-09-26'),
        ligne('l', 'fixe', 'Loyer', 350_000, 350_000, 'confirme', '2026-10-05'),
        ligne('a', 'fixe', 'Assurance auto', 120_000, null, 'prevu', '2026-10-10'),
        ligne('c', 'enveloppe', 'Courses', 150_000, 90_000, 'enCours'),
        ligne('e', 'epargne', 'Moto', 100_000, 0, 'enCours'),
      ])
    if (chemin === '/mois/2026-11/bilan')
      return bilan('2026-11', [ligne('s', 'revenu', 'Salaire', 1_000_000, null), ligne('c', 'enveloppe', 'Courses', 150_000, 0, 'enCours'), ligne('e', 'epargne', 'Moto', 100_000, 0, 'enCours')])
    throw new Error(`Route non simulée : ${chemin}`)
  })
})

function Calendrier() {
  const [annee, setAnnee] = useState(2026)
  return <CalendrierAnnee annee={annee} changerAnnee={setAnnee} />
}

const enveloppe = (reel: number) => ({ famille: 'enveloppe', prevu: 150_000, reel }) as unknown as Parameters<typeof montantLigne>[0]

const cumuls = (...valeurs: (number | null)[]) => valeurs.map((cumul) => ({ cumul })) as unknown as Parameters<typeof jauge>[1]

describe('règles d’affichage du calendrier', () => {
  it('jauge rapportée au plus haut cumul ; jalons des objectifs ; montant d’une ligne', () => {
    expect([jauge(500, cumuls(1000, null)), jauge(-10, cumuls(1000)), jauge(null, []), jauge(10, cumuls(-5))]).toEqual([0.5, 0, 0, 0])
    expect(jalonsDuMois(objectifs.objectifs, '2026-12')).toEqual([{ id: 'moto', libelle: 'Moto', type: 'atteint' }])
    expect(jalonsDuMois(objectifs.objectifs, '2026-11')).toEqual([{ id: 'voyage', libelle: 'Voyage', type: 'souhaite' }])
    expect(jalonsDuMois([objectif({ atteint: true })], '2026-12')).toEqual([])
    expect(montantLigne(enveloppe(90_000))).toMatchObject({ valeur: 90_000, prevu: false })
    expect(espaces(montantLigne(enveloppe(90_000)).precision)).toBe('sur 1 500 DH prévus')
    // Mois à venir : toujours le prévu, même si l'enveloppe affiche 0 de réel.
    expect(montantLigne(enveloppe(0), true)).toEqual({ valeur: 150_000, prevu: true, precision: null })
    expect(moisCourt('2026-09')).toBe('sept.')
  })
})

describe('Calendrier de l’année', () => {
  it('une bande pour les mois d’avant le suivi, une carte par mois suivi, le résumé de l’année', async () => {
    rendre(<Calendrier />, { route: '/objectifs', compte: 'u1' })
    const grille = await screen.findByRole('list', { name: 'Mois de 2026' })
    expect(espaces(within(grille).getByRole('region', { name: 'Avant le début du suivi' }).textContent)).toContain('Janvier → août : avant le début de ton suivi')
    const cartes = within(grille).getAllByRole('button', { name: /cumul fin de mois/ })
    expect(cartes.map((c) => c.getAttribute('aria-label')!.replace(/\s+/g, ' '))).toEqual([
      'Septembre 2026 : cumul fin de mois 4 900 DH, réel. Voir le détail.',
      'Octobre 2026 : cumul fin de mois 7 100 DH, en cours. Voir le détail.',
      'Novembre 2026 : cumul fin de mois 10 500 DH, prévu. Voir le détail.',
      'Décembre 2026 : cumul fin de mois 13 900 DH, prévu. Voir le détail.',
    ])
    expect(visible(cartes[1]!)).toContain('Revenus+10 000DHCharges−6 800DHÉpargne−1 000DH')
    expect(espaces(cartes[3]!.textContent)).toContain('Moto')
    expect(espaces(cartes[2]!.textContent)).toContain('Voyage')
    expect(espaces(screen.getByText('Cumul fin décembre (prévu)').parentElement!.textContent)).toContain('Mois le plus bas : septembre · 4 900 DH')
  })

  it('un clic ouvre la fenêtre du mois : le calcul, puis chaque ligne ; on passe au mois suivant', async () => {
    rendre(<Calendrier />, { route: '/objectifs', compte: 'u1' })
    fireEvent.click(await screen.findByRole('button', { name: /^Octobre 2026 : cumul/ }))
    const fenetre = await screen.findByRole('dialog', { name: 'octobre 2026' })
    const calcul = within(fenetre).getByRole('region', { name: 'Calcul du cumul' })
    expect(visible(calcul)).toBe('Report de septembre4 900DHRevenus+10 000DHdont 10 000DH réelsCharges−6 800DHdont 4 400DH réelsÉpargne−1 000DHdont 0DH réels= Cumul fin de mois (estimation)7 100DH')
    const charges = await within(fenetre).findByRole('region', { name: 'Charges' })
    expect(visible(charges)).toContain('Loyer5 oct. · Payé3 500DH')
    expect(visible(charges)).toContain('CoursesEn cours900DHsur 1 500 DH prévus')
    expect(within(fenetre).getByRole('link', { name: 'Ouvrir le mois' })).toHaveAttribute('href', '/mois?mois=2026-10')

    fireEvent.click(within(fenetre).getByRole('button', { name: 'Mois suivant' }))
    const novembre = await screen.findByRole('dialog', { name: 'novembre 2026' })
    expect(espaces(within(novembre).getByRole('region', { name: 'Objectifs' }).textContent)).toBe('Objectifs« Voyage » : date souhaitée')
    // Mois à venir : chaque ligne montre son prévu.
    expect(visible((await within(novembre).findByRole('region', { name: 'Épargne' })))).toBe('Épargne1 000DHMotoPrévu1 000DH')
  })

  it('année suivante : le calendrier recharge la plage de l’année', async () => {
    rendre(<Calendrier />, { route: '/objectifs', compte: 'u1' })
    fireEvent.click(await screen.findByRole('button', { name: 'Année 2027' }))
    expect(await screen.findByText('Impossible de calculer l’année 2027.')).toBeInTheDocument()
    expect(vi.mocked(api.lire)).toHaveBeenCalledWith('/cumul?du=2027-01&au=2027-12')
    expect(screen.getByRole('button', { name: 'Cette année' })).toBeInTheDocument()
  })

  it('Objectifs › « Calendrier de l’année » : la vue et l’année viennent de l’adresse', async () => {
    rendre(<PageObjectifs />, { route: '/objectifs?vue=calendrier&annee=2026', compte: 'u1' })
    expect(await screen.findByRole('heading', { name: 'Calendrier 2026' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Calendrier de l’année' })).toHaveAttribute('aria-selected', 'true')
  })
})
