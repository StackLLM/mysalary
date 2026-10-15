import { describe, expect, it } from 'vitest'
import { tableauDeBord } from './aujourdhui'
import { centimes } from './argent'
import type { Charge } from './charges'
import { lireCleMois as m, lireDate as d } from './dates'
import type { Depense } from './depenses'
import type { MouvementEpargne, Objectif } from './epargne'
import { creerCalendrier } from './periodes'
import type { PaieEnregistree, VersionContrat } from './salaire'

// Salaire 10 000 DH le 27 : « janvier 2027 » va du 27 déc. au 26 janv. (31 jours). Aujourd'hui : 10 janv., 15e jour.
const contrat: VersionContrat = { id: 'v1', moisEffet: m('2026-11'), montantNet: centimes(1_000_000), jourHabituel: 27, regleJourNonOuvre: 'aucune', financeMoisSuivant: true }
const paie: PaieEnregistree = {
  moisFinance: m('2027-01'),
  dateReelle: d('2026-12-27'),
  datePrevue: d('2026-12-27'),
  lignes: [{ id: 'l1', type: 'salaire', libelle: 'Salaire', certitude: 'garanti', montantPrevu: centimes(1_000_000), montantRecu: centimes(1_000_000), sourceId: null }],
}
const charge = (id: string, nature: Charge['nature'], montant: number, modif: Partial<Charge> = {}): Charge => ({
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
  ...modif,
})
const depense = (id: string, date: string, montant: number, modif: Partial<Depense> = {}): Depense => ({
  id,
  date: d(date),
  montant: centimes(montant),
  categorieId: 'x',
  libelle: id,
  chargeId: null,
  echeance: null,
  ponctuelId: null,
  ...modif,
})
const charges = [charge('Loyer', 'fixe', 350_000), charge('Internet', 'fixe', 30_000, { jour: 8 }), charge('Courses', 'enveloppe', 200_000), charge('Loisirs', 'enveloppe', 150_000), charge('Sport', 'enveloppe', 100_000)]
const depenses = [
  depense('loyer', '2027-01-05', 350_000, { chargeId: 'Loyer', echeance: d('2027-01-05') }),
  depense('courses1', '2027-01-03', 90_000, { chargeId: 'Courses' }),
  depense('courses2', '2027-01-08', 70_000, { chargeId: 'Courses' }),
  depense('loisirs', '2027-01-09', 160_000, { chargeId: 'Loisirs' }),
  depense('cadeau', '2027-01-02', 40_000),
  depense('pain', '2027-01-04', 1_000, { chargeId: 'Courses' }),
]

function tableau(liste = depenses) {
  const calendrier = creerCalendrier({ mode: 'cyclePaie', contrats: [contrat], paies: [paie], sources: [], charges, depenses: liste, aujourdhui: d('2027-01-10') })
  return tableauDeBord(calendrier, d('2027-01-10'))
}

const moto: Objectif = { id: 'moto', libelle: 'Moto', type: 'moto', montantCible: centimes(8_000_000), montantInitial: centimes(0), dateCible: null, priorite: 1, versementMensuel: centimes(100_000), statut: 'actif', realiseLe: null, creeLe: d('2026-11-01') }
const versement = (montant: number): MouvementEpargne => ({ id: 'v', compteId: 'cih', objectifId: 'moto', type: 'versement', date: d('2027-01-08'), montant: centimes(montant), libelle: '' })

describe('épargne à confirmer (mois en cours)', () => {
  const avec = (mouvements: MouvementEpargne[]) =>
    tableauDeBord(creerCalendrier({ mode: 'cyclePaie', contrats: [contrat], paies: [paie], sources: [], charges, depenses, objectifs: [moto], mouvementsEpargne: mouvements, aujourdhui: d('2027-01-10') }), d('2027-01-10'))

  it('le versement prévu reste à confirmer tant qu’il n’est pas fait ; le reste du mois n’en est pas diminué', () => {
    expect(avec([]).epargneAConfirmer).toBe(100_000)
    expect(avec([versement(40_000)]).epargneAConfirmer).toBe(60_000)
    expect(avec([versement(100_000)]).epargneAConfirmer).toBe(0)
    expect(avec([]).restePrevu).toBe(avec([versement(100_000)]).restePrevu)
  })
})

describe('tableau de bord du mois (lot 27)', () => {
  it('postes du plus lourd au plus léger, avec leur part des revenus prévus', () => {
    const t = tableau()
    expect(t.revenusPrevus).toBe(1_000_000)
    expect(t.avancement).toBeCloseTo(15 / 31)
    expect(t.postes.map((p) => [p.cle, p.prevu, p.reel])).toEqual([
      ['fixe:Loyer', 350_000, 350_000],
      ['enveloppe:Courses', 200_000, 161_000],
      ['enveloppe:Loisirs', 150_000, 160_000],
      ['enveloppe:Sport', 100_000, 0],
      ['horsPlan', 0, 40_000],
      ['fixe:Internet', 30_000, 0],
    ])
    expect(t.postes[0]!.part).toBeCloseTo(0.35)
    // Loisirs : le plus grand de prévu et réel compte (1 600 DH sur 10 000 DH).
    expect(t.postes.find((p) => p.cle === 'enveloppe:Loisirs')!.part).toBeCloseTo(0.16)
  })

  it('enveloppes à surveiller : dépassée, ou dépensée plus vite que le mois n’avance', () => {
    const par = new Map(tableau().postes.map((p) => [p.cle, p]))
    expect(par.get('enveloppe:Loisirs')).toMatchObject({ surveillance: 'depassee' })
    // Courses : 80,5 % du budget au 15e jour sur 31 (48 %) → trop vite.
    expect(par.get('enveloppe:Courses')).toMatchObject({ consommation: 0.805, surveillance: 'rythme' })
    expect(par.get('enveloppe:Sport')).toMatchObject({ consommation: 0, surveillance: null })
    expect(par.get('fixe:Loyer')).toMatchObject({ consommation: null, surveillance: null })
  })

  it('les 5 plus grosses dépenses réelles du mois, jamais une dépense datée après aujourd’hui', () => {
    const t = tableau([...depenses, depense('plus tard', '2027-01-20', 999_000)])
    expect(t.grossesDepenses.map((g) => g.id)).toEqual(['loyer', 'loisirs', 'courses1', 'courses2', 'cadeau'])
    expect(t.grossesDepenses[0]).toMatchObject({ montant: 350_000, ligne: 'Loyer' })
  })

  it('mois sans dépense : postes prévus seulement, aucune grosse dépense', () => {
    const t = tableau([])
    expect(t.grossesDepenses).toEqual([])
    expect(t.postes.every((p) => p.reel === 0)).toBe(true)
    expect(t.postes.find((p) => p.cle === 'horsPlan')).toBeUndefined()
  })
})
