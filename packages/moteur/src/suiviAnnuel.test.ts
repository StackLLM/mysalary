import { describe, expect, it } from 'vitest'
import { centimes } from './argent'
import type { Charge } from './charges'
import { lireCleMois as m, lireDate as d } from './dates'
import type { Depense } from './depenses'
import type { MouvementEpargne, Objectif } from './epargne'
import type { DonneesObjectifs } from './objectifs'
import { suiviAnnuel } from './suiviAnnuel'
import { creerCalendrier } from './periodes'
import type { SourceRevenu } from './revenus'
import type { PaieEnregistree, VersionContrat } from './salaire'

// Salaire 10 000 DH le 27, qui finance le mois suivant. « Décembre » : 27 nov. → 26 déc. ; « janvier » : 27 déc. → 26 janv.
const contrat: VersionContrat = { id: 'v1', moisEffet: m('2026-11'), montantNet: centimes(1_000_000), jourHabituel: 27, regleJourNonOuvre: 'aucune', financeMoisSuivant: true }
const paie = (mois: string, date: string): PaieEnregistree => ({
  moisFinance: m(mois),
  dateReelle: d(date),
  datePrevue: d(date),
  lignes: [{ id: mois, type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: centimes(1_000_000), montantRecu: centimes(1_000_000), sourceId: null }],
})
const charge = (id: string, nature: Charge['nature'], montant: number): Charge => ({
  id,
  libelle: id,
  categorieId: id,
  nature,
  montant: centimes(montant),
  frequence: 'mensuelle',
  mois: [],
  jour: nature === 'fixe' ? 5 : null,
  debut: m('2026-11'),
  fin: null,
  essentielle: false,
})
const depense = (id: string, date: string, montant: number, chargeId: string, echeance: string | null = null): Depense => ({
  id,
  date: d(date),
  montant: centimes(montant),
  categorieId: chargeId,
  libelle: '',
  chargeId,
  echeance: echeance ? d(echeance) : null,
  ponctuelId: null,
})
const cours: SourceRevenu = {
  id: 'cours',
  libelle: 'Cours',
  type: 'variable',
  montant: centimes(100_000),
  frequence: 'mensuelle',
  mois: [],
  versement: 'dateSeparee',
  jour: 10,
  certitude: 'probable',
  debut: m('2027-02'),
  fin: null,
}
const moto: Objectif = {
  id: 'moto',
  libelle: 'Moto',
  type: 'moto',
  montantCible: centimes(10_000_000),
  montantInitial: centimes(0),
  dateCible: null,
  priorite: 1,
  versementMensuel: centimes(100_000),
  statut: 'actif',
  realiseLe: null,
  creeLe: d('2026-11-01'),
}
const versement: MouvementEpargne = { id: 'v', compteId: 'cih', objectifId: 'moto', type: 'versement', date: d('2026-12-20'), montant: centimes(100_000), libelle: '' }
const AUJOURDHUI = d('2027-01-10')

const calendrier = (depenses: Depense[] = []) =>
  creerCalendrier({
    mode: 'cyclePaie',
    contrats: [contrat],
    paies: [paie('2026-12', '2026-11-27'), paie('2027-01', '2026-12-27')],
    sources: [cours],
    charges: [charge('Loyer', 'fixe', 350_000), charge('Courses', 'enveloppe', 200_000)],
    depenses,
    objectifs: [moto],
    mouvementsEpargne: [versement],
    aujourdhui: AUJOURDHUI,
  })
const depenses = [
  depense('d1', '2026-12-05', 350_000, 'Loyer', '2026-12-05'),
  depense('d2', '2026-12-10', 180_000, 'Courses'),
  depense('d3', '2027-01-05', 350_000, 'Loyer', '2027-01-05'),
  depense('d4', '2027-01-06', 50_000, 'Courses'),
]


const donnees: DonneesObjectifs = { objectifs: [moto], comptes: [], mouvementsEpargne: [versement] }
const somme = (liste: number[]) => liste.reduce((t, x) => t + x, 0)

describe('suivi annuel (lot 18)', () => {
  const an = suiviAnnuel(calendrier(depenses), donnees, 2027, { aujourdhui: AUJOURDHUI })

  it('douze mois ; revenus, charges et épargne : le réel à date et le projeté restant, séparés', () => {
    expect(an).toMatchObject({ annee: 2027, etat: 'enCours', sansDonnees: 0 })
    expect(an.mois).toHaveLength(12)
    expect(an.mois.map((x) => x.nature)).toEqual(['enCours', ...Array(11).fill('prevu')])
    // Janvier (en cours) : 4 000 DH sortis et 10 000 DH reçus sont réels ; le reste de ses 5 500 DH de charges est projeté.
    expect(an.mois[0]).toMatchObject({ cle: '2027-01', reel: { revenus: 1_000_000, charges: 400_000, epargne: 0 }, charges: 550_000 })
    expect(an.mois[1]!.reel).toEqual({ revenus: 0, charges: 0, epargne: 0 })
    expect(an.revenus).toEqual({ reel: 1_000_000, projete: an.revenus.total - 1_000_000, total: somme(an.mois.map((x) => x.revenus)) })
    expect(an.charges).toMatchObject({ reel: 400_000, total: somme(an.mois.map((x) => x.charges)) })
    expect(an.charges.projete).toBe(an.charges.total - 400_000)
    expect(an.epargne).toMatchObject({ reel: 0, total: somme(an.mois.map((x) => x.epargne)) })
  })

  it('mois les plus coûteux (à égalité, le plus tôt), part variable, épargne cumulée', () => {
    expect(an.couteux.map((x) => [x.cle, x.charges])).toEqual([
      ['2027-01', 550_000],
      ['2027-02', 550_000],
      ['2027-03', 550_000],
    ])
    expect(an.couteux[0]!.nature).toBe('enCours')
    expect(an.partVariable).toMatchObject({ du: '2027-01', au: '2027-12' })
    expect(an.partVariable.part).toBeGreaterThan(0)
    expect(an.epargneCumulee).toBe(an.epargne.total)
    expect(an.mois[0]!.epargneCumulee).toBe(an.mois[0]!.epargne)
    expect(an.mois.at(-1)!.epargneCumulee).toBe(an.epargneCumulee)
  })

  it('progression d’un objectif : épargné au début, à date, projeté en fin d’année', () => {
    const [objectif] = an.objectifs
    expect(an.objectifs).toHaveLength(1)
    // Versement de 1 000 DH le 20 déc. : déjà là à la fin de l'année précédente.
    expect(objectif).toMatchObject({ id: 'moto', debut: 100_000, reelADate: 100_000, fin: null, atteint: false, montantCible: 10_000_000 })
    expect(objectif!.finProjetee!).toBeGreaterThan(100_000)
    expect(objectif!.finProjetee!).toBeLessThanOrEqual(10_000_000)
  })

  it('année passée : tout est réel ; mois avant le suivi marqués ; année future : tout est projeté', () => {
    const passee = suiviAnnuel(calendrier(depenses), donnees, 2026, { aujourdhui: AUJOURDHUI })
    expect(passee).toMatchObject({ etat: 'passee', sansDonnees: 11, revenus: { projete: 0 }, charges: { projete: 0 } })
    expect(passee.mois.filter((x) => x.nature === 'avant')).toHaveLength(11)
    expect(passee.revenus.reel).toBe(1_000_000)
    expect(passee.couteux).toHaveLength(1)
    expect(passee.objectifs[0]).toMatchObject({ debut: 0, fin: 100_000, finProjetee: null })

    const future = suiviAnnuel(calendrier(depenses), donnees, 2028, { aujourdhui: AUJOURDHUI })
    expect(future).toMatchObject({ etat: 'future', revenus: { reel: 0 }, charges: { reel: 0 }, epargne: { reel: 0 } })
    expect(future.revenus.projete).toBe(future.revenus.total)
    expect(future.objectifs[0]).toMatchObject({ reelADate: null, fin: null })
  })
})
