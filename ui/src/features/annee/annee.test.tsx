import type { AnneeDto, BilanDto, MoisCumul, ObjectifsDto, SuiviObjectif } from '@mysalary/partage'
import { fireEvent, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { rendre } from '../../test/outils'
import { CalendrierAnnee } from './CalendrierAnnee'
import { caseJour, echelleCumul, jalonsDuMois, jauge, joursEntete, montantLigne, moisCourt } from './saisie'

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
  ({ cle, debut: `${cle}-01`, fin: `${cle}-28`, statut: 'aVenir', nature: 'prevu', premier: false, report: 0, revenus: 1_000_000, charges: 560_000, apresCharges: 440_000, epargne: 100_000, reste: 340_000, cumul: 0, dontReel: null, ...modif }) as unknown as MoisCumul

const avant = (cle: string) => mois(cle, { statut: 'passe', nature: 'avant', report: null, cumul: null, revenus: 0, charges: 0, apresCharges: 0, epargne: 0, reste: 0 })
const annee2026: MoisCumul[] = [
  ...['01', '02', '03', '04', '05', '06', '07', '08'].map((m) => avant(`2026-${m}`)),
  mois('2026-09', { statut: 'passe', nature: 'reel', premier: true, report: 0, charges: 510_000, apresCharges: 490_000, epargne: 0, reste: 490_000, cumul: 490_000 }),
  mois('2026-10', { debut: '2026-09-26', fin: '2026-10-26', statut: 'enCours', nature: 'enCours', report: 490_000, charges: 680_000, apresCharges: 320_000, reste: 220_000, cumul: 710_000, dontReel: { revenus: 1_000_000, charges: 440_000, epargne: 0 } }),
  mois('2026-11', { report: 710_000, cumul: 1_050_000 }),
  mois('2026-12', { report: 1_050_000, cumul: 1_390_000 }),
]
const annee2026Dto = {
  aujourdhui: '2026-10-10',
  annee: 2026,
  debutSemaine: 1,
  evenements: {
    '2026-10': [
      { date: '2026-09-26', type: 'revenu', libelle: 'Salaire', montant: 1_000_000, statut: 'confirme' },
      { date: '2026-10-05', type: 'charge', libelle: 'Loyer', montant: 350_000, statut: 'confirme' },
      { date: '2026-10-10', type: 'charge', libelle: 'Assurance auto', montant: 120_000, statut: 'prevu' },
    ],
  },
  debut: '2026-09',
  depart: null,
  mois: annee2026,
  resume: { revenus: 4_000_000, charges: 2_310_000, epargne: 300_000, reste: 1_390_000, cumulFin: 1_390_000, plusBas: { cle: '2026-09', cumul: 490_000 }, negatifs: [], natures: { reel: 1, enCours: 1, prevu: 2 } },
} as unknown as AnneeDto

const objectif = (modif: Record<string, unknown>) =>
  ({ id: 'moto', libelle: 'Moto', statut: 'actif', atteint: false, dateCible: '2027-06', estimations: { prudent: '2027-08', realiste: '2026-12', ambitieux: '2026-11' }, ...modif }) as unknown as SuiviObjectif
const objectifs = { objectifs: [objectif({}), objectif({ id: 'voyage', libelle: 'Voyage', dateCible: '2026-11', estimations: null })] } as unknown as ObjectifsDto

const ligne = (cle: string, famille: string, libelle: string, prevu: number | null, reel: number | null, statut = 'prevu', date: string | null = null) =>
  ({ cle, famille, libelle, date, prevu, reel, ecart: null, statut, cible: null })
const bilan = (cle: string, lignes: unknown[]) => ({ mois: { cle }, lignes }) as unknown as BilanDto

beforeEach(() => {
  vi.mocked(api.lire).mockImplementation(async (chemin: string) => {
    if (chemin === '/auth/session') return compte
    if (chemin === '/mois/courant') return { cle: '2026-10' }
    if (chemin === '/objectifs') return objectifs
    if (chemin === '/annee/2026') return annee2026Dto
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

  it('cases des jours : paie, charges (le statut le plus urgent), jour d’un autre mois, aujourd’hui, détail au survol', () => {
    const evenements = annee2026Dto.evenements['2026-10']!
    expect(caseJour('2026-09-26', '2026-10', evenements, '2026-10-10')).toMatchObject({ jour: 26, horsMois: true, paie: true, charges: 'aucune' })
    expect(caseJour('2026-10-05', '2026-10', evenements, '2026-10-10')).toMatchObject({ horsMois: false, paie: false, charges: 'payee' })
    const aujourdhui = caseJour('2026-10-10', '2026-10', evenements, '2026-10-10')
    expect(aujourdhui).toMatchObject({ aujourdhui: true, charges: 'prevue' })
    expect(espaces(aujourdhui.titre)).toBe('10 oct. 2026 Assurance auto −1 200 DH')
    expect(caseJour('2026-10-10', '2026-10', [{ ...evenements[2]!, statut: 'enRetard' }, evenements[1]!], '2026-10-12').charges).toBe('enRetard')
    expect(joursEntete(7)[0]).toBe('D')
  })

  it('échelle du graphique : zéro en bas, ou plus haut quand un mois passe sous zéro', () => {
    expect(echelleCumul(cumuls(null, 500, 1000) as never)).toMatchObject({ zero: 0, barres: [{ hauteur: 0 }, { bas: 0, hauteur: 50 }, { bas: 0, hauteur: 100 }] })
    const negatif = echelleCumul(cumuls(-250, 750) as never)
    expect(negatif.zero).toBe(25)
    expect(negatif.barres).toMatchObject([{ bas: 0, hauteur: 25 }, { bas: 25, hauteur: 75 }])
  })
})

describe('Calendrier de l’année', () => {
  it('les 12 mois en calendrier : jours, reste après charges, cumul ; graphique et résumé de l’année', async () => {
    rendre(<Calendrier />, { route: '/objectifs', compte: 'u1' })
    const grille = await screen.findByRole('list', { name: 'Mois de 2026' })
    const cartes = within(grille).getAllByRole('button')
    expect(cartes).toHaveLength(12)
    expect(espaces(cartes[0]!.getAttribute('aria-label'))).toBe('Janvier 2026 : avant le suivi. Voir le détail.')
    expect(cartes.slice(8).map((c) => espaces(c.getAttribute('aria-label')))).toEqual([
      'Septembre 2026 : reste après charges 4 900 DH, cumul fin de mois 4 900 DH, réel. Voir le détail.',
      'Octobre 2026 : reste après charges 3 200 DH, cumul fin de mois 7 100 DH, en cours. Voir le détail.',
      'Novembre 2026 : reste après charges 4 400 DH, cumul fin de mois 10 500 DH, prévu. Voir le détail.',
      'Décembre 2026 : reste après charges 4 400 DH, cumul fin de mois 13 900 DH, prévu. Voir le détail.',
    ])
    expect(visible(cartes[9]!)).toContain('Revenus+10 000DHCharges−6 800DHReste3 200DHÉpargne−1 000DHCumul fin de mois7 100DH')
    // Grille d'octobre : la paie du 26 sept., le loyer payé le 5 oct.
    expect(espaces(cartes[9]!.querySelector('[title^="26 sept. 2026"]')?.getAttribute('title'))).toContain('Salaire +10 000 DH')
    expect(espaces(cartes[9]!.querySelector('[title^="5 oct. 2026"]')?.getAttribute('title'))).toContain('Loyer −3 500 DH')
    expect(espaces(cartes[11]!.textContent)).toContain('Moto')
    expect(espaces(cartes[10]!.textContent)).toContain('Voyage')
    expect(espaces(screen.getByText('Cumul fin décembre (prévu)').parentElement!.textContent)).toContain('Mois le plus bas : septembre · 4 900 DH')

    const graphique = screen.getByRole('region', { name: 'Cumul fin de mois sur l’année' })
    expect(within(graphique).getAllByRole('button')).toHaveLength(12)
    fireEvent.click(within(graphique).getByRole('button', { name: /^Octobre 2026 : 7.100.DH \(estimation\)$/ }))
    expect(await screen.findByRole('dialog', { name: 'octobre 2026' })).toBeInTheDocument()
  })

  it('un clic ouvre la fenêtre du mois : le calcul, puis chaque ligne ; on passe au mois suivant', async () => {
    rendre(<Calendrier />, { route: '/objectifs', compte: 'u1' })
    fireEvent.click(await screen.findByRole('button', { name: /^Octobre 2026 : reste/ }))
    const fenetre = await screen.findByRole('dialog', { name: 'octobre 2026' })
    const calcul = within(fenetre).getByRole('region', { name: 'Calcul du cumul' })
    expect(visible(calcul)).toBe('Report de septembre4 900DHRevenus+10 000DHdont 10 000DH réelsCharges−6 800DHdont 4 400DH réelsÉpargne−1 000DHdont 0DH réelsReste après charges (revenus − charges)3 200DH= Cumul fin de mois (estimation)7 100DH')
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
    expect(vi.mocked(api.lire)).toHaveBeenCalledWith('/annee/2027')
    expect(screen.getByRole('button', { name: 'Cette année' })).toBeInTheDocument()
  })
})
